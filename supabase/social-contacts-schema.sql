-- Social Contacts Schema for Gelos
-- Run this in your Supabase SQL Editor

-- ============================================
-- ADD SOCIAL CONTACT FIELDS TO USERS TABLE
-- ============================================

-- Phone number fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false;

-- WhatsApp fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_whatsapp BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp_same_as_phone BOOLEAN DEFAULT true;

-- Email visibility (email already exists in users table)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false;

-- Instagram fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_instagram BOOLEAN DEFAULT false;

-- Snapchat fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS snapchat_handle TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_snapchat BOOLEAN DEFAULT false;

-- ============================================
-- INDEXES for querying members with contact info
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_show_whatsapp ON public.users(show_whatsapp) WHERE show_whatsapp = true;
CREATE INDEX IF NOT EXISTS idx_users_show_phone ON public.users(show_phone) WHERE show_phone = true;

-- ============================================
-- FUNCTION: Get visible contact info for group members
-- Returns contact info only for fields the user has chosen to share
-- ============================================
CREATE OR REPLACE FUNCTION public.get_member_contacts(p_group_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    whatsapp_number TEXT,
    email TEXT,
    instagram_handle TEXT,
    snapchat_handle TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id as user_id,
        u.display_name,
        u.full_name,
        u.avatar_url,
        CASE WHEN u.show_phone THEN u.phone_number ELSE NULL END as phone_number,
        CASE
            WHEN u.show_whatsapp AND u.whatsapp_same_as_phone THEN u.phone_number
            WHEN u.show_whatsapp THEN u.whatsapp_number
            ELSE NULL
        END as whatsapp_number,
        CASE WHEN u.show_email THEN u.email ELSE NULL END as email,
        CASE WHEN u.show_instagram THEN u.instagram_handle ELSE NULL END as instagram_handle,
        CASE WHEN u.show_snapchat THEN u.snapchat_handle ELSE NULL END as snapchat_handle
    FROM public.users u
    INNER JOIN public.group_members gm ON gm.user_id = u.id
    WHERE gm.group_id = p_group_id
    AND gm.left_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_member_contacts(UUID) TO authenticated;
