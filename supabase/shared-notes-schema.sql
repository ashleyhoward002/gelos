-- Shared Notes Schema for Gelos
-- Run this in your Supabase SQL Editor

-- ============================================
-- SHARED NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shared_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    is_pinned BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shared_notes_group_id ON public.shared_notes(group_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_created_by ON public.shared_notes(created_by);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR SHARED NOTES
-- ============================================

-- Group members can view shared notes
CREATE POLICY "Group members can view shared notes"
    ON public.shared_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = shared_notes.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Group members can create shared notes
CREATE POLICY "Group members can create shared notes"
    ON public.shared_notes
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = shared_notes.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Note creator can update
CREATE POLICY "Note creator can update shared notes"
    ON public.shared_notes
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Note creator can delete
CREATE POLICY "Note creator can delete shared notes"
    ON public.shared_notes
    FOR DELETE
    USING (auth.uid() = created_by);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_shared_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shared_notes_updated_at
    BEFORE UPDATE ON public.shared_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_notes_updated_at();
