-- Group Invites Schema for Gelos
-- Run this in your Supabase SQL Editor

-- ============================================
-- GROUP INVITES TABLE
-- ============================================
CREATE TABLE public.group_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    invite_link TEXT,
    invited_email TEXT,
    invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    uses_remaining INTEGER, -- null = unlimited
    expires_at TIMESTAMP WITH TIME ZONE, -- null = never expires
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GROUP INVITE USES TABLE (tracks who used which invite)
-- ============================================
CREATE TABLE public.group_invite_uses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invite_id UUID NOT NULL REFERENCES public.group_invites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invite_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.group_invite_uses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR GROUP INVITES
-- ============================================

-- Members can view invites for groups they belong to
CREATE POLICY "Members can view group invites"
    ON public.group_invites
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_invites.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Anyone can view active invites by code (for joining)
CREATE POLICY "Anyone can view active invites"
    ON public.group_invites
    FOR SELECT
    USING (is_active = true);

-- Owners and admins can create invites
CREATE POLICY "Admins can create invites"
    ON public.group_invites
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_invites.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('owner', 'admin')
            AND group_members.left_at IS NULL
        )
    );

-- Invite creator or admins can update invites
CREATE POLICY "Invite owner or admins can update invites"
    ON public.group_invites
    FOR UPDATE
    USING (
        invited_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_invites.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('owner', 'admin')
            AND group_members.left_at IS NULL
        )
    );

-- Invite creator or admins can delete invites
CREATE POLICY "Invite owner or admins can delete invites"
    ON public.group_invites
    FOR DELETE
    USING (
        invited_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_invites.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('owner', 'admin')
            AND group_members.left_at IS NULL
        )
    );

-- ============================================
-- RLS POLICIES FOR INVITE USES
-- ============================================

-- Members can view invite uses for their groups
CREATE POLICY "Members can view invite uses"
    ON public.group_invite_uses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_invites gi
            JOIN public.group_members gm ON gm.group_id = gi.group_id
            WHERE gi.id = group_invite_uses.invite_id
            AND gm.user_id = auth.uid()
            AND gm.left_at IS NULL
        )
    );

-- Users can record their own invite use (when joining)
CREATE POLICY "Users can record invite use"
    ON public.group_invite_uses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTION: Decrement uses remaining
-- ============================================
CREATE OR REPLACE FUNCTION public.decrement_invite_uses()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.group_invites
    SET
        uses_remaining = CASE
            WHEN uses_remaining IS NOT NULL THEN uses_remaining - 1
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = NEW.invite_id;

    -- Deactivate invite if uses exhausted
    UPDATE public.group_invites
    SET is_active = false, updated_at = NOW()
    WHERE id = NEW.invite_id
    AND uses_remaining IS NOT NULL
    AND uses_remaining <= 0;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to decrement uses when invite is used
CREATE OR REPLACE TRIGGER on_invite_used
    AFTER INSERT ON public.group_invite_uses
    FOR EACH ROW EXECUTE FUNCTION public.decrement_invite_uses();

-- ============================================
-- FUNCTION: Generate random invite code
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_group_invites_group_id ON public.group_invites(group_id);
CREATE INDEX idx_group_invites_invite_code ON public.group_invites(invite_code);
CREATE INDEX idx_group_invites_invited_by ON public.group_invites(invited_by);
CREATE INDEX idx_group_invites_is_active ON public.group_invites(is_active);
CREATE INDEX idx_group_invite_uses_invite_id ON public.group_invite_uses(invite_id);
CREATE INDEX idx_group_invite_uses_user_id ON public.group_invite_uses(user_id);
