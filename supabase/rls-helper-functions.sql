-- RLS Helper Functions
-- Run this FIRST in your Supabase SQL Editor before other migrations
-- These functions are required for RLS policies to work correctly

-- ============================================
-- DROP existing functions first (if they exist with different signatures)
-- ============================================
DROP FUNCTION IF EXISTS public.is_group_member(UUID);
DROP FUNCTION IF EXISTS public.is_group_admin(UUID);
DROP FUNCTION IF EXISTS public.is_group_owner(UUID);

-- ============================================
-- FUNCTION: Check if user is a member of a group
-- ============================================
CREATE FUNCTION public.is_group_member(check_group_id UUID)
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
-- FUNCTION: Check if user is an admin of a group
-- ============================================
CREATE FUNCTION public.is_group_admin(check_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_members.group_id = check_group_id
        AND group_members.user_id = auth.uid()
        AND group_members.role IN ('owner', 'admin')
        AND group_members.left_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Check if user is the owner of a group
-- ============================================
CREATE FUNCTION public.is_group_owner(check_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_members.group_id = check_group_id
        AND group_members.user_id = auth.uid()
        AND group_members.role = 'owner'
        AND group_members.left_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================
-- VERIFY: Test the functions work
-- ============================================
-- After running this migration, you can test with:
--
-- SELECT is_group_member('your-group-uuid-here');
-- SELECT is_group_admin('your-group-uuid-here');
-- SELECT is_group_owner('your-group-uuid-here');
