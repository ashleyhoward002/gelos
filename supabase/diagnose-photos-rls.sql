-- Diagnostic Script for Photos RLS Issues
-- Run this in Supabase SQL Editor to diagnose why photos aren't loading

-- 1. Check if RLS is enabled on photos table
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'photos';
-- Should show: rowsecurity = true

-- 2. List all RLS policies on photos table
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'photos';
-- Should show policies for SELECT, INSERT, UPDATE, DELETE

-- 3. Check if is_group_member function exists
SELECT
    proname,
    prosrc
FROM pg_proc
WHERE proname = 'is_group_member';
-- Should return the function definition

-- 4. Count photos in the database (bypassing RLS as admin)
SELECT COUNT(*) as total_photos FROM public.photos;

-- 5. Check photos for a specific group (replace with your group_id)
-- Replace 'YOUR_GROUP_ID_HERE' with actual group ID
SELECT id, group_id, file_url, created_at
FROM public.photos
WHERE group_id = '6a4009e7-6b1f-484c-9622-da2c3fabf74a'
LIMIT 5;

-- 6. Check group_members for that group
SELECT gm.user_id, gm.role, gm.left_at, u.email
FROM public.group_members gm
LEFT JOIN auth.users u ON u.id = gm.user_id
WHERE gm.group_id = '6a4009e7-6b1f-484c-9622-da2c3fabf74a';

-- 7. TEMPORARY FIX: If RLS is blocking, you can temporarily disable it for testing
-- WARNING: Only do this temporarily for testing!
-- Uncomment and run if needed:
-- ALTER TABLE public.photos DISABLE ROW LEVEL SECURITY;

-- To re-enable:
-- ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
