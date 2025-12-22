-- Calendar & Birthday Feature Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- UPDATE USERS TABLE - Add birthday fields
-- ============================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS share_birthday BOOLEAN DEFAULT true;

-- ============================================
-- FAMILY MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    birthday DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own family members"
    ON public.family_members
    FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- UPDATE GROUPS TABLE - Add birthday settings
-- ============================================
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS show_member_birthdays BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_family_birthdays BOOLEAN DEFAULT false;

-- ============================================
-- CALENDAR EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    end_time TIME,
    location TEXT,
    event_type TEXT DEFAULT 'event', -- 'event', 'birthday', 'reminder'
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Members can view events in their groups
CREATE POLICY "Members can view group events"
    ON public.calendar_events
    FOR SELECT
    USING (public.is_group_member(group_id));

-- Members can create events
CREATE POLICY "Members can create events"
    ON public.calendar_events
    FOR INSERT
    WITH CHECK (public.is_group_member(group_id));

-- Creator can update their events
CREATE POLICY "Creator can update events"
    ON public.calendar_events
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Creator and admins can delete events
CREATE POLICY "Creator and admins can delete events"
    ON public.calendar_events
    FOR DELETE
    USING (auth.uid() = created_by OR public.is_group_admin(group_id));

-- ============================================
-- EVENT RSVPs TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view RSVPs"
    ON public.event_rsvps
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.calendar_events e
            WHERE e.id = event_rsvps.event_id
            AND public.is_group_member(e.group_id)
        )
    );

CREATE POLICY "Users can manage own RSVPs"
    ON public.event_rsvps
    FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'event_created', 'birthday_reminder', 'group_invite', etc.
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_calendar_events_group_id ON public.calendar_events(group_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);
