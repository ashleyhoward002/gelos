-- Study Features Schema for Gelos
-- Run this in your Supabase SQL Editor

-- ============================================
-- STUDY SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    location_type TEXT DEFAULT 'in_person' CHECK (location_type IN ('in_person', 'online', 'hybrid')),
    meeting_link TEXT,
    topics TEXT[], -- Array of topics to cover
    max_participants INTEGER,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STUDY SESSION RSVPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.study_session_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- ============================================
-- STUDY RESOURCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.study_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('note', 'link', 'file')),

    -- Content varies by type
    content TEXT, -- For notes: markdown/rich text content
    url TEXT, -- For links: external URL
    file_url TEXT, -- For files: Supabase storage URL
    file_name TEXT,
    file_type TEXT, -- MIME type for files
    file_size INTEGER, -- File size in bytes

    subject TEXT, -- Subject/topic tag
    is_pinned BOOLEAN DEFAULT false,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FLASHCARD DECKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT, -- Subject/topic tag
    card_count INTEGER DEFAULT 0, -- Denormalized for performance
    is_public BOOLEAN DEFAULT true, -- Visible to all group members
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FLASHCARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    front_content TEXT NOT NULL, -- Question/prompt
    back_content TEXT NOT NULL, -- Answer
    front_image_url TEXT, -- Optional image on front
    back_image_url TEXT, -- Optional image on back
    sort_order INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FLASHCARD PROGRESS TABLE (per user, per card)
-- Spaced repetition tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.flashcard_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- SM-2 algorithm fields
    ease_factor NUMERIC DEFAULT 2.5,
    interval INTEGER DEFAULT 0, -- Days until next review
    repetitions INTEGER DEFAULT 0,

    -- Review history
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    last_rating INTEGER, -- 0-3 confidence rating

    -- Stats
    total_reviews INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(card_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_study_sessions_group_id ON public.study_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON public.study_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_by ON public.study_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_study_session_rsvps_session_id ON public.study_session_rsvps(session_id);
CREATE INDEX IF NOT EXISTS idx_study_session_rsvps_user_id ON public.study_session_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_study_resources_group_id ON public.study_resources(group_id);
CREATE INDEX IF NOT EXISTS idx_study_resources_subject ON public.study_resources(subject);
CREATE INDEX IF NOT EXISTS idx_study_resources_type ON public.study_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_group_id ON public.flashcard_decks(group_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user_card ON public.flashcard_progress(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_next_review ON public.flashcard_progress(user_id, next_review_at);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_session_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR STUDY SESSIONS
-- ============================================

-- Group members can view study sessions
CREATE POLICY "Group members can view study sessions"
    ON public.study_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = study_sessions.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Group members can create study sessions
CREATE POLICY "Group members can create study sessions"
    ON public.study_sessions
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = study_sessions.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Session creator can update
CREATE POLICY "Session creator can update study sessions"
    ON public.study_sessions
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Session creator can delete
CREATE POLICY "Session creator can delete study sessions"
    ON public.study_sessions
    FOR DELETE
    USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES FOR STUDY SESSION RSVPS
-- ============================================

-- Group members can view RSVPs
CREATE POLICY "Group members can view RSVPs"
    ON public.study_session_rsvps
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.study_sessions
            JOIN public.group_members ON group_members.group_id = study_sessions.group_id
            WHERE study_sessions.id = study_session_rsvps.session_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Users can RSVP to sessions in their groups
CREATE POLICY "Users can RSVP"
    ON public.study_session_rsvps
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.study_sessions
            JOIN public.group_members ON group_members.group_id = study_sessions.group_id
            WHERE study_sessions.id = study_session_rsvps.session_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Users can update their own RSVP
CREATE POLICY "Users can update own RSVP"
    ON public.study_session_rsvps
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own RSVP
CREATE POLICY "Users can delete own RSVP"
    ON public.study_session_rsvps
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES FOR STUDY RESOURCES
-- ============================================

-- Group members can view resources
CREATE POLICY "Group members can view resources"
    ON public.study_resources
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = study_resources.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Group members can create resources
CREATE POLICY "Group members can create resources"
    ON public.study_resources
    FOR INSERT
    WITH CHECK (
        auth.uid() = uploaded_by
        AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = study_resources.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Resource uploader can update
CREATE POLICY "Resource uploader can update"
    ON public.study_resources
    FOR UPDATE
    USING (auth.uid() = uploaded_by);

-- Resource uploader can delete
CREATE POLICY "Resource uploader can delete"
    ON public.study_resources
    FOR DELETE
    USING (auth.uid() = uploaded_by);

-- ============================================
-- RLS POLICIES FOR FLASHCARD DECKS
-- ============================================

-- Group members can view decks
CREATE POLICY "Group members can view flashcard decks"
    ON public.flashcard_decks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = flashcard_decks.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Group members can create decks
CREATE POLICY "Group members can create flashcard decks"
    ON public.flashcard_decks
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = flashcard_decks.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Deck creator can update
CREATE POLICY "Deck creator can update"
    ON public.flashcard_decks
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Deck creator can delete
CREATE POLICY "Deck creator can delete"
    ON public.flashcard_decks
    FOR DELETE
    USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES FOR FLASHCARDS
-- ============================================

-- Users can view flashcards in decks they can access
CREATE POLICY "Users can view flashcards"
    ON public.flashcards
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks
            JOIN public.group_members ON group_members.group_id = flashcard_decks.group_id
            WHERE flashcard_decks.id = flashcards.deck_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Deck owner can insert cards
CREATE POLICY "Deck owner can insert cards"
    ON public.flashcards
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks
            WHERE flashcard_decks.id = flashcards.deck_id
            AND flashcard_decks.created_by = auth.uid()
        )
    );

-- Card creator can update
CREATE POLICY "Card creator can update"
    ON public.flashcards
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Card creator can delete
CREATE POLICY "Card creator can delete"
    ON public.flashcards
    FOR DELETE
    USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES FOR FLASHCARD PROGRESS
-- ============================================

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
    ON public.flashcard_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
    ON public.flashcard_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
    ON public.flashcard_progress
    FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at on study_sessions
CREATE TRIGGER study_sessions_updated_at
    BEFORE UPDATE ON public.study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_scrapbook_updated_at();

-- Update updated_at on study_resources
CREATE TRIGGER study_resources_updated_at
    BEFORE UPDATE ON public.study_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_scrapbook_updated_at();

-- Update updated_at on flashcard_decks
CREATE TRIGGER flashcard_decks_updated_at
    BEFORE UPDATE ON public.flashcard_decks
    FOR EACH ROW
    EXECUTE FUNCTION update_scrapbook_updated_at();

-- Update updated_at on flashcards
CREATE TRIGGER flashcards_updated_at
    BEFORE UPDATE ON public.flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_scrapbook_updated_at();

-- Update card_count on flashcard_decks when cards are added/removed
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.flashcard_decks SET card_count = card_count + 1 WHERE id = NEW.deck_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.flashcard_decks SET card_count = card_count - 1 WHERE id = OLD.deck_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_flashcard_change
    AFTER INSERT OR DELETE ON public.flashcards
    FOR EACH ROW EXECUTE FUNCTION update_deck_card_count();
