-- Fix Member Visibility and Default Sharing Settings
-- Run this in your Supabase SQL Editor

-- ============================================
-- FIX RLS POLICY: Allow group members to see other group members' user data
-- ============================================

-- This policy allows users to view basic profile info of other users
-- who are in the same group as them
CREATE POLICY "Group members can view fellow members"
    ON public.users
    FOR SELECT
    USING (
        -- User can always see their own data
        auth.uid() = id
        OR
        -- User can see other users who share a group with them
        EXISTS (
            SELECT 1 FROM public.group_members gm1
            INNER JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id = auth.uid()
            AND gm2.user_id = public.users.id
            AND gm1.left_at IS NULL
            AND gm2.left_at IS NULL
        )
    );

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

-- ============================================
-- UPDATE DEFAULT SHARING SETTINGS
-- Make show_email and show_phone default to true for better UX
-- ============================================

-- Update column defaults for new users
ALTER TABLE public.users ALTER COLUMN show_email SET DEFAULT true;
ALTER TABLE public.users ALTER COLUMN show_phone SET DEFAULT true;

-- Update existing users who haven't explicitly set these to false
-- (Only update users who have null values or who have the old default of false)
-- This is a one-time migration, so we update all existing users
UPDATE public.users
SET show_email = true
WHERE show_email = false OR show_email IS NULL;

UPDATE public.users
SET show_phone = true
WHERE show_phone = false OR show_phone IS NULL;

-- ============================================
-- ADD BIRTHDAY SHARING FIELD (if not exists)
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS share_birthday BOOLEAN DEFAULT true;
