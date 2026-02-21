-- Fix RSVPs and Storage Setup
-- Run this SQL in Supabase SQL Editor to fix photo uploads and RSVPs
-- This combines the necessary setup from multiple schema files

-- ============================================
-- STEP 1: Create helper functions (if not exists)
-- ============================================
-- Note: is_group_member function likely already exists with policies depending on it
-- Only create if it doesn't exist

CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_members.group_id = check_group_id
        AND group_members.user_id = auth.uid()
        AND group_members.left_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 2: Setup Photos Storage Bucket
-- ============================================

-- Create photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];

-- Drop existing storage policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Storage policies for photos bucket
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[2]);

-- ============================================
-- STEP 3: Create Outing RSVPs Table
-- ============================================

-- Create outing_rsvp_status enum if it doesn't exist
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
    UNIQUE(outing_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_outing_rsvps_outing_id ON public.outing_rsvps(outing_id);
CREATE INDEX IF NOT EXISTS idx_outing_rsvps_user_id ON public.outing_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_outing_rsvps_status ON public.outing_rsvps(status);

-- Enable RLS
ALTER TABLE public.outing_rsvps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Group members can view RSVPs" ON public.outing_rsvps;
DROP POLICY IF EXISTS "Users can RSVP" ON public.outing_rsvps;
DROP POLICY IF EXISTS "Users can update own RSVP" ON public.outing_rsvps;
DROP POLICY IF EXISTS "Users can delete own RSVP" ON public.outing_rsvps;

-- RLS POLICIES
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

CREATE POLICY "Users can update own RSVP"
    ON public.outing_rsvps
    FOR UPDATE
    USING (auth.uid() = user_id);

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

-- ============================================
-- VERIFICATION
-- ============================================
-- After running, verify with:
-- SELECT * FROM storage.buckets WHERE id = 'photos';
-- SELECT * FROM pg_policies WHERE tablename = 'outing_rsvps';
-- SELECT is_group_member('your-group-uuid-here');
