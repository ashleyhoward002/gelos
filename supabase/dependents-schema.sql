-- Trip Dependents (Family Units) Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- TRIP DEPENDENTS TABLE
-- Stores kids, spouses, friends, etc. for each trip
-- ============================================
CREATE TABLE IF NOT EXISTS public.trip_dependents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'child' CHECK (type IN ('child', 'spouse', 'partner', 'friend', 'friends_child', 'other_family', 'other')),
    age_group TEXT NOT NULL DEFAULT 'child' CHECK (age_group IN ('adult', 'teen', 'child', 'infant')),
    age INTEGER CHECK (age >= 0 AND age <= 120),
    responsible_member UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notes TEXT,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trip_dependents ENABLE ROW LEVEL SECURITY;


-- ============================================
-- UPDATE EXPENSE SPLITS FOR DEPENDENTS
-- ============================================

-- Add dependent_id to expense_splits (nullable)
ALTER TABLE public.expense_splits
ADD COLUMN IF NOT EXISTS dependent_id UUID REFERENCES public.trip_dependents(id) ON DELETE CASCADE;

-- Add age_group for pricing (copied at split creation time)
ALTER TABLE public.expense_splits
ADD COLUMN IF NOT EXISTS age_group TEXT CHECK (age_group IN ('adult', 'teen', 'child', 'infant', NULL));

-- Add constraint: either user_id or dependent_id, not both
-- (but user_id can be null if splitting to dependent only)

-- ============================================
-- ACTIVITY PARTICIPANTS FOR DEPENDENTS
-- ============================================

-- Add dependent_id to activity participants
ALTER TABLE public.trip_activity_participants
ADD COLUMN IF NOT EXISTS dependent_id UUID REFERENCES public.trip_dependents(id) ON DELETE CASCADE;

-- Add age_group for pricing
ALTER TABLE public.trip_activity_participants
ADD COLUMN IF NOT EXISTS age_group TEXT CHECK (age_group IN ('adult', 'teen', 'child', 'infant', NULL));


-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dependents_trip_id ON public.trip_dependents(trip_id);
CREATE INDEX IF NOT EXISTS idx_dependents_responsible ON public.trip_dependents(responsible_member);
CREATE INDEX IF NOT EXISTS idx_dependents_type ON public.trip_dependents(type);
CREATE INDEX IF NOT EXISTS idx_expense_splits_dependent ON public.expense_splits(dependent_id);
CREATE INDEX IF NOT EXISTS idx_activity_participants_dependent ON public.trip_activity_participants(dependent_id);


-- ============================================
-- RLS POLICIES FOR DEPENDENTS
-- ============================================

-- View: Group members can view all dependents for trips they're part of
CREATE POLICY "Users can view trip dependents"
    ON public.trip_dependents FOR SELECT
    USING (
        trip_id IN (
            SELECT o.id FROM public.outings o
            WHERE is_group_member(o.group_id)
        )
    );

-- Create: Group members can add dependents to trips
CREATE POLICY "Users can add dependents"
    ON public.trip_dependents FOR INSERT
    WITH CHECK (
        trip_id IN (
            SELECT o.id FROM public.outings o
            WHERE is_group_member(o.group_id)
        )
        AND added_by = auth.uid()
    );

-- Update: Users can update dependents they're responsible for or added
CREATE POLICY "Users can update their own dependents"
    ON public.trip_dependents FOR UPDATE
    USING (responsible_member = auth.uid() OR added_by = auth.uid());

-- Delete: Users can delete dependents they're responsible for or added
CREATE POLICY "Users can delete their own dependents"
    ON public.trip_dependents FOR DELETE
    USING (responsible_member = auth.uid() OR added_by = auth.uid());


-- ============================================
-- FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.update_dependent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_dependent_update ON public.trip_dependents;
CREATE TRIGGER on_dependent_update
    BEFORE UPDATE ON public.trip_dependents
    FOR EACH ROW EXECUTE FUNCTION public.update_dependent_timestamp();


-- ============================================
-- HELPER VIEW: Family units by trip
-- ============================================
CREATE OR REPLACE VIEW public.trip_family_units AS
SELECT
    o.id AS trip_id,
    o.group_id,
    gm.user_id AS member_id,
    u.display_name AS member_name,
    u.full_name AS member_full_name,
    u.avatar_url AS member_avatar,
    COALESCE(
        (SELECT COUNT(*) FROM public.trip_dependents td
         WHERE td.trip_id = o.id AND td.responsible_member = gm.user_id),
        0
    ) AS dependent_count,
    COALESCE(
        (SELECT COUNT(*) FROM public.trip_dependents td
         WHERE td.trip_id = o.id AND td.responsible_member = gm.user_id),
        0
    ) + 1 AS total_people
FROM public.outings o
JOIN public.group_members gm ON o.group_id = gm.group_id AND gm.left_at IS NULL
JOIN public.users u ON gm.user_id = u.id;


-- ============================================
-- VERIFY SETUP
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trip_dependents'
ORDER BY ordinal_position;
