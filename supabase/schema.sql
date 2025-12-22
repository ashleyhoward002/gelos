-- Gelos Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own data
CREATE POLICY "Users can insert own data"
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TYPE group_type AS ENUM ('social', 'trip', 'study', 'family', 'custom');

CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    group_type group_type NOT NULL DEFAULT 'social',
    enabled_features TEXT[] DEFAULT ARRAY['calendar', 'polls', 'expenses', 'photos', 'scrapbook'],
    cover_image TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GROUP MEMBERS TABLE
-- ============================================
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(group_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR GROUPS
-- ============================================

-- Users can view groups they're members of
CREATE POLICY "Users can view groups they belong to"
    ON public.groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Users can create groups
CREATE POLICY "Users can create groups"
    ON public.groups
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Owners and admins can update groups
CREATE POLICY "Owners and admins can update groups"
    ON public.groups
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('owner', 'admin')
            AND group_members.left_at IS NULL
        )
    );

-- Only owners can delete groups
CREATE POLICY "Owners can delete groups"
    ON public.groups
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'owner'
            AND group_members.left_at IS NULL
        )
    );

-- ============================================
-- RLS POLICIES FOR GROUP MEMBERS
-- ============================================

-- Users can view members of groups they belong to
CREATE POLICY "Users can view group members"
    ON public.group_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members AS gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.left_at IS NULL
        )
    );

-- Users can join groups (insert themselves)
CREATE POLICY "Users can join groups"
    ON public.group_members
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Owners and admins can add members
CREATE POLICY "Owners and admins can add members"
    ON public.group_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members AS gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('owner', 'admin')
            AND gm.left_at IS NULL
        )
    );

-- Users can update their own membership (e.g., leave)
CREATE POLICY "Users can update own membership"
    ON public.group_members
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Owners and admins can update members
CREATE POLICY "Owners and admins can update members"
    ON public.group_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members AS gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('owner', 'admin')
            AND gm.left_at IS NULL
        )
    );

-- ============================================
-- FUNCTION: Create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Auto-add creator as group owner
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-add group creator as owner
CREATE OR REPLACE TRIGGER on_group_created
    AFTER INSERT ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_groups_created_by ON public.groups(created_by);
