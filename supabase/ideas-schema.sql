-- Outing Ideas Schema for Gelos
-- Run this in Supabase SQL Editor

-- Create idea_category enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE idea_category AS ENUM ('food', 'activities', 'outdoors', 'events', 'nightlife', 'arts', 'shopping');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create idea_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE idea_status AS ENUM ('idea', 'planned', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Outing ideas table
CREATE TABLE IF NOT EXISTS outing_ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    category idea_category NOT NULL DEFAULT 'activities',
    source_url TEXT, -- Optional link to website/article
    image_url TEXT, -- Optional image
    suggested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_count INTEGER DEFAULT 0, -- Denormalized for performance
    status idea_status NOT NULL DEFAULT 'idea',
    outing_id UUID REFERENCES outings(id) ON DELETE SET NULL, -- Link to created outing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outing idea votes table
CREATE TABLE IF NOT EXISTS outing_idea_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES outing_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    voted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each user can only vote once per idea
    UNIQUE(idea_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outing_ideas_group_id ON outing_ideas(group_id);
CREATE INDEX IF NOT EXISTS idx_outing_ideas_suggested_by ON outing_ideas(suggested_by);
CREATE INDEX IF NOT EXISTS idx_outing_ideas_category ON outing_ideas(category);
CREATE INDEX IF NOT EXISTS idx_outing_ideas_status ON outing_ideas(status);
CREATE INDEX IF NOT EXISTS idx_outing_ideas_vote_count ON outing_ideas(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_outing_idea_votes_idea_id ON outing_idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_outing_idea_votes_user_id ON outing_idea_votes(user_id);

-- Enable RLS
ALTER TABLE outing_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE outing_idea_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outing_ideas
CREATE POLICY "Group members can view ideas"
    ON outing_ideas FOR SELECT
    USING (is_group_member(group_id));

CREATE POLICY "Group members can create ideas"
    ON outing_ideas FOR INSERT
    WITH CHECK (is_group_member(group_id) AND auth.uid() = suggested_by);

CREATE POLICY "Idea creators can update their ideas"
    ON outing_ideas FOR UPDATE
    USING (auth.uid() = suggested_by);

CREATE POLICY "Idea creators can delete their ideas"
    ON outing_ideas FOR DELETE
    USING (auth.uid() = suggested_by);

-- RLS Policies for outing_idea_votes
CREATE POLICY "Group members can view votes"
    ON outing_idea_votes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM outing_ideas
        WHERE outing_ideas.id = outing_idea_votes.idea_id
        AND is_group_member(outing_ideas.group_id)
    ));

CREATE POLICY "Group members can vote on ideas"
    ON outing_idea_votes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM outing_ideas
            WHERE outing_ideas.id = outing_idea_votes.idea_id
            AND is_group_member(outing_ideas.group_id)
        )
    );

CREATE POLICY "Users can remove their own votes"
    ON outing_idea_votes FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update vote count when votes change
CREATE OR REPLACE FUNCTION update_idea_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE outing_ideas SET vote_count = vote_count + 1 WHERE id = NEW.idea_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE outing_ideas SET vote_count = vote_count - 1 WHERE id = OLD.idea_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for vote count updates
DROP TRIGGER IF EXISTS trigger_update_idea_vote_count ON outing_idea_votes;
CREATE TRIGGER trigger_update_idea_vote_count
    AFTER INSERT OR DELETE ON outing_idea_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_idea_vote_count();
