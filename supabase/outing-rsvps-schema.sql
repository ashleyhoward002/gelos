-- Outing RSVPs Schema
-- Run this in Supabase SQL Editor

-- Create outing_rsvp_status enum
DO $$ BEGIN
    CREATE TYPE outing_rsvp_status AS ENUM ('going', 'maybe', 'not_going');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Outing RSVPs table
CREATE TABLE IF NOT EXISTS public.outing_rsvps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status outing_rsvp_status NOT NULL DEFAULT 'going',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One RSVP per user per outing
    UNIQUE(outing_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_outing_rsvps_outing_id ON public.outing_rsvps(outing_id);
CREATE INDEX IF NOT EXISTS idx_outing_rsvps_user_id ON public.outing_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_outing_rsvps_status ON public.outing_rsvps(status);

-- Enable RLS
ALTER TABLE public.outing_rsvps ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Group members can view RSVPs for outings in their groups
CREATE POLICY "Group members can view RSVPs"
    ON public.outing_rsvps
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.outings
            WHERE outings.id = outing_rsvps.outing_id
            AND is_group_member(outings.group_id)
        )
    );

-- Users can RSVP to outings in their groups
CREATE POLICY "Users can RSVP"
    ON public.outing_rsvps
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.outings
            WHERE outings.id = outing_rsvps.outing_id
            AND is_group_member(outings.group_id)
        )
    );

-- Users can update their own RSVP
CREATE POLICY "Users can update own RSVP"
    ON public.outing_rsvps
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own RSVP
CREATE POLICY "Users can delete own RSVP"
    ON public.outing_rsvps
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_outing_rsvp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS set_outing_rsvp_updated_at ON public.outing_rsvps;
CREATE TRIGGER set_outing_rsvp_updated_at
    BEFORE UPDATE ON public.outing_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION update_outing_rsvp_updated_at();
