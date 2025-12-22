-- Polls Schema for Gelos
-- Run this in Supabase SQL Editor

-- Create poll_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE poll_type AS ENUM ('multiple_choice', 'ranking', 'date_picker', 'lottery');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    outing_id UUID REFERENCES outings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    poll_type poll_type NOT NULL DEFAULT 'multiple_choice',
    settings JSONB DEFAULT '{"allow_member_options": true}',
    -- settings can contain:
    -- allow_member_options: boolean (default true) - allow any group member to add options
    -- multi_select: boolean (for multiple_choice)
    -- max_selections: number (for multiple_choice)
    -- anonymous: boolean
    -- show_results: boolean (show results before voting)
    closes_at TIMESTAMPTZ,
    is_closed BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll options table
CREATE TABLE IF NOT EXISTS poll_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_date DATE, -- Used for date_picker polls
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add created_by column if it doesn't exist (for migrations)
DO $$ BEGIN
    ALTER TABLE poll_options ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rank INTEGER, -- Used for ranking polls (1 = first choice)
    availability TEXT, -- Used for date_picker: 'available', 'maybe', 'unavailable'
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate votes on same option (except for ranking which uses rank)
    UNIQUE(poll_id, option_id, user_id)
);

-- Lottery results table (stores which option was randomly selected)
CREATE TABLE IF NOT EXISTS lottery_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    winner_option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    drawn_at TIMESTAMPTZ DEFAULT NOW(),

    -- One result per poll
    UNIQUE(poll_id)
);

-- Add suggested_by column if it doesn't exist (for migrations)
DO $$ BEGIN
    ALTER TABLE lottery_results ADD COLUMN suggested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Remove old winner_user_id column if it exists (migration cleanup)
DO $$ BEGIN
    ALTER TABLE lottery_results DROP COLUMN IF EXISTS winner_user_id;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_group_id ON polls(group_id);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_is_closed ON polls(is_closed);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_created_by ON poll_options(created_by);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_results_poll_id ON lottery_results(poll_id);

-- Enable RLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polls
CREATE POLICY "Group members can view polls"
    ON polls FOR SELECT
    USING (is_group_member(group_id));

CREATE POLICY "Group members can create polls"
    ON polls FOR INSERT
    WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Poll creators can update their polls"
    ON polls FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Poll creators can delete their polls"
    ON polls FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for poll_options
CREATE POLICY "Users can view options for polls they can see"
    ON poll_options FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND is_group_member(polls.group_id)
    ));

CREATE POLICY "Group members can insert options"
    ON poll_options FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM polls
        WHERE polls.id = poll_options.poll_id
        AND is_group_member(polls.group_id)
        AND NOT polls.is_closed
        AND (
            polls.created_by = auth.uid() -- Poll creator can always add
            OR (polls.settings->>'allow_member_options')::boolean = true -- Or if member options allowed
        )
    ));

CREATE POLICY "Option creators and poll creators can update options"
    ON poll_options FOR UPDATE
    USING (
        poll_options.created_by = auth.uid() -- Option creator
        OR EXISTS (
            SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()
        ) -- Or poll creator
    );

CREATE POLICY "Option creators and poll creators can delete options"
    ON poll_options FOR DELETE
    USING (
        poll_options.created_by = auth.uid() -- Option creator
        OR EXISTS (
            SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()
        ) -- Or poll creator
    );

-- RLS Policies for poll_votes
CREATE POLICY "Users can view votes for polls they can see"
    ON poll_votes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM polls WHERE polls.id = poll_votes.poll_id AND is_group_member(polls.group_id)
    ));

CREATE POLICY "Group members can vote on polls"
    ON poll_votes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM polls
            WHERE polls.id = poll_votes.poll_id
            AND is_group_member(polls.group_id)
            AND NOT polls.is_closed
        )
    );

CREATE POLICY "Users can update their own votes"
    ON poll_votes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
    ON poll_votes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for lottery_results
CREATE POLICY "Users can view lottery results for polls they can see"
    ON lottery_results FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM polls WHERE polls.id = lottery_results.poll_id AND is_group_member(polls.group_id)
    ));

CREATE POLICY "Poll creators can insert lottery results"
    ON lottery_results FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM polls WHERE polls.id = lottery_results.poll_id AND polls.created_by = auth.uid()
    ));
