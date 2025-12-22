-- Photos and Outings Schema for Gelos
-- Run this in your Supabase SQL Editor

-- Create outings table
CREATE TABLE IF NOT EXISTS public.outings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    event_date DATE,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create photos table
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    outing_id UUID REFERENCES public.outings(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    taken_at TIMESTAMPTZ,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_outings_group_id ON public.outings(group_id);
CREATE INDEX IF NOT EXISTS idx_outings_event_date ON public.outings(event_date);
CREATE INDEX IF NOT EXISTS idx_photos_group_id ON public.photos(group_id);
CREATE INDEX IF NOT EXISTS idx_photos_outing_id ON public.photos(outing_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON public.photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_is_favorite ON public.photos(is_favorite);

-- Enable RLS
ALTER TABLE public.outings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outings
-- Group members can view outings
CREATE POLICY "Group members can view outings"
    ON public.outings FOR SELECT
    USING (public.is_group_member(group_id));

-- Group members can create outings
CREATE POLICY "Group members can create outings"
    ON public.outings FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND public.is_group_member(group_id)
    );

-- Outing creator can update their outings
CREATE POLICY "Outing creator can update outings"
    ON public.outings FOR UPDATE
    USING (auth.uid() = created_by);

-- Outing creator can delete their outings
CREATE POLICY "Outing creator can delete outings"
    ON public.outings FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for photos
-- Group members can view photos
CREATE POLICY "Group members can view photos"
    ON public.photos FOR SELECT
    USING (public.is_group_member(group_id));

-- Group members can upload photos
CREATE POLICY "Group members can upload photos"
    ON public.photos FOR INSERT
    WITH CHECK (
        auth.uid() = uploaded_by
        AND public.is_group_member(group_id)
    );

-- Photo uploader can update their photos (for favorite toggle, caption edit)
CREATE POLICY "Photo uploader can update photos"
    ON public.photos FOR UPDATE
    USING (auth.uid() = uploaded_by);

-- Any group member can toggle favorite on any photo
CREATE POLICY "Group members can toggle favorites"
    ON public.photos FOR UPDATE
    USING (public.is_group_member(group_id))
    WITH CHECK (public.is_group_member(group_id));

-- Photo uploader can delete their photos
CREATE POLICY "Photo uploader can delete photos"
    ON public.photos FOR DELETE
    USING (auth.uid() = uploaded_by);

-- Storage bucket setup (run these commands separately in Supabase Dashboard > Storage)
-- 1. Create a new bucket called "photos" with public access
-- 2. Add the following RLS policies for the storage bucket:

-- For storage.objects policies, go to Storage > Policies and add:
--
-- SELECT (read): Allow group members to read photos
-- ((bucket_id = 'photos'::text) AND (auth.role() = 'authenticated'::text))
--
-- INSERT (upload): Allow authenticated users to upload
-- ((bucket_id = 'photos'::text) AND (auth.role() = 'authenticated'::text))
--
-- DELETE: Allow users to delete their own uploads
-- ((bucket_id = 'photos'::text) AND (auth.uid() = owner))
