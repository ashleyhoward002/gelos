-- Photos Table Migration
-- Run this in your Supabase SQL Editor to add missing columns

-- Add original_filename column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'photos'
        AND column_name = 'original_filename'
    ) THEN
        ALTER TABLE public.photos ADD COLUMN original_filename TEXT;
    END IF;
END $$;

-- Add file_size column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'photos'
        AND column_name = 'file_size'
    ) THEN
        ALTER TABLE public.photos ADD COLUMN file_size BIGINT;
    END IF;
END $$;

-- Create index for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_photos_duplicate_check
    ON public.photos(group_id, original_filename, file_size);
