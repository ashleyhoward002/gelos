-- Cover Image Feature Migration
-- Run this in Supabase SQL Editor

-- ============ STEP 1: Add cover_image_url column to outings table ============

ALTER TABLE public.outings
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.outings.cover_image_url IS 'URL to the cover image stored in Supabase Storage';

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'outings' AND column_name = 'cover_image_url';


-- ============ STEP 2: Storage Bucket Setup ============
-- Go to Supabase Dashboard > Storage and ensure:

-- 1. A bucket named "photos" exists (should already exist from photos feature)
--    If not, create it with:
--    - Name: photos
--    - Public bucket: YES (for public URLs)

-- 2. Storage RLS Policies (go to Storage > Policies):
--    These should already exist, but verify:

--    SELECT policy (read):
--    Name: "Allow authenticated users to read photos"
--    Definition: (bucket_id = 'photos') AND (auth.role() = 'authenticated')

--    INSERT policy (upload):
--    Name: "Allow authenticated users to upload photos"
--    Definition: (bucket_id = 'photos') AND (auth.role() = 'authenticated')

--    UPDATE policy:
--    Name: "Allow users to update their own uploads"
--    Definition: (bucket_id = 'photos') AND (auth.uid() = owner)

--    DELETE policy:
--    Name: "Allow users to delete their own uploads"
--    Definition: (bucket_id = 'photos') AND (auth.uid() = owner)


-- ============ STEP 3: Verify Setup ============

-- Check if column exists
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'outings' AND column_name = 'cover_image_url'
) as column_exists;

-- Check if bucket exists (this requires checking via Dashboard or API)
-- In Dashboard: Storage > Buckets > should see "photos" bucket
