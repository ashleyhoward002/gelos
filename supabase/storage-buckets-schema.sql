-- Storage Buckets Schema for Gelos
-- Run this in your Supabase SQL Editor

-- ============================================
-- PHOTOS BUCKET
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

-- Drop existing policies if they exist (to avoid conflicts)
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
-- STUDY RESOURCES BUCKET
-- ============================================

-- Create study-resources bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
    'study-resources',
    'study-resources',
    true,
    104857600 -- 100MB limit
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view study resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload study resources" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own study resources" ON storage.objects;

-- Storage policies for study-resources bucket
CREATE POLICY "Anyone can view study resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-resources');

CREATE POLICY "Authenticated users can upload study resources"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'study-resources' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own study resources"
ON storage.objects FOR DELETE
USING (bucket_id = 'study-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- SCRAPBOOK BUCKET (for scrapbook images)
-- ============================================

-- Create scrapbook bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'scrapbook',
    'scrapbook',
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view scrapbook images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload scrapbook images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete scrapbook images" ON storage.objects;

-- Storage policies for scrapbook bucket
CREATE POLICY "Anyone can view scrapbook images"
ON storage.objects FOR SELECT
USING (bucket_id = 'scrapbook');

CREATE POLICY "Authenticated users can upload scrapbook images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'scrapbook' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete scrapbook images"
ON storage.objects FOR DELETE
USING (bucket_id = 'scrapbook' AND auth.role() = 'authenticated');
