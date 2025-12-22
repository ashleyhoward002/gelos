-- Activities/Excursions Feature Upgrade
-- Run this in Supabase SQL Editor

-- ============ STEP 1: Add new columns to trip_activities ============

-- Add category for activity type
ALTER TABLE public.trip_activities
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other'
CHECK (category IN ('water', 'adventure', 'relaxation', 'food', 'nightlife', 'culture', 'tour', 'other'));

-- Add map link for location
ALTER TABLE public.trip_activities
ADD COLUMN IF NOT EXISTS map_link TEXT;

-- Add min/max people constraints
ALTER TABLE public.trip_activities
ADD COLUMN IF NOT EXISTS min_people INTEGER,
ADD COLUMN IF NOT EXISTS max_people INTEGER;

-- Add booking URL
ALTER TABLE public.trip_activities
ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- Add booked_by reference
ALTER TABLE public.trip_activities
ADD COLUMN IF NOT EXISTS booked_by UUID REFERENCES auth.users(id);

-- Update status constraint to include more statuses
ALTER TABLE public.trip_activities
DROP CONSTRAINT IF EXISTS trip_activities_status_check;

ALTER TABLE public.trip_activities
ADD CONSTRAINT trip_activities_status_check
CHECK (status IN ('idea', 'interested', 'booked', 'confirmed', 'completed', 'cancelled'));

-- Update default status to 'idea'
ALTER TABLE public.trip_activities
ALTER COLUMN status SET DEFAULT 'idea';


-- ============ STEP 2: Enhance trip_activity_participants ============

-- Add paid_amount for tracking partial payments
ALTER TABLE public.trip_activity_participants
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2);

-- Add notes for participant
ALTER TABLE public.trip_activity_participants
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add responded_at timestamp
ALTER TABLE public.trip_activity_participants
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ DEFAULT NOW();

-- Update status constraint to match new statuses
ALTER TABLE public.trip_activity_participants
DROP CONSTRAINT IF EXISTS trip_activity_participants_status_check;

ALTER TABLE public.trip_activity_participants
ADD CONSTRAINT trip_activity_participants_status_check
CHECK (status IN ('interested', 'going', 'not_going', 'maybe'));


-- ============ STEP 3: Update existing data to use new status values ============

-- Update activity statuses
UPDATE public.trip_activities SET status = 'idea' WHERE status = 'planned';

-- Update participant statuses
UPDATE public.trip_activity_participants SET status = 'going' WHERE status = 'in';
UPDATE public.trip_activity_participants SET status = 'not_going' WHERE status = 'out';


-- ============ STEP 4: Create indexes for performance ============

CREATE INDEX IF NOT EXISTS idx_trip_activities_outing_id ON public.trip_activities(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_activities_status ON public.trip_activities(status);
CREATE INDEX IF NOT EXISTS idx_trip_activities_date ON public.trip_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_trip_activity_participants_activity ON public.trip_activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_trip_activity_participants_user ON public.trip_activity_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_activity_participants_status ON public.trip_activity_participants(status);


-- ============ STEP 5: RLS Policies (drop and recreate) ============

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Group members can view activities" ON public.trip_activities;
DROP POLICY IF EXISTS "Group members can create activities" ON public.trip_activities;
DROP POLICY IF EXISTS "Creators can update activities" ON public.trip_activities;
DROP POLICY IF EXISTS "Creators can delete activities" ON public.trip_activities;
DROP POLICY IF EXISTS "Group members can view participants" ON public.trip_activity_participants;
DROP POLICY IF EXISTS "Users can manage their own participation" ON public.trip_activity_participants;

-- Activities: View
CREATE POLICY "Group members can view activities"
    ON public.trip_activities FOR SELECT
    USING (
        outing_id IN (
            SELECT o.id FROM public.outings o
            WHERE is_group_member(o.group_id)
        )
    );

-- Activities: Create
CREATE POLICY "Group members can create activities"
    ON public.trip_activities FOR INSERT
    WITH CHECK (
        outing_id IN (
            SELECT o.id FROM public.outings o
            WHERE is_group_member(o.group_id)
        )
        AND auth.uid() = created_by
    );

-- Activities: Update (creator or admin)
CREATE POLICY "Creators and admins can update activities"
    ON public.trip_activities FOR UPDATE
    USING (
        auth.uid() = created_by
        OR outing_id IN (
            SELECT o.id FROM public.outings o
            WHERE is_group_admin(o.group_id)
        )
    );

-- Activities: Delete (creator only)
CREATE POLICY "Creators can delete activities"
    ON public.trip_activities FOR DELETE
    USING (auth.uid() = created_by);

-- Participants: View
CREATE POLICY "Group members can view activity participants"
    ON public.trip_activity_participants FOR SELECT
    USING (
        activity_id IN (
            SELECT ta.id FROM public.trip_activities ta
            JOIN public.outings o ON ta.outing_id = o.id
            WHERE is_group_member(o.group_id)
        )
    );

-- Participants: Create (RSVP)
CREATE POLICY "Users can RSVP to activities"
    ON public.trip_activity_participants FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND activity_id IN (
            SELECT ta.id FROM public.trip_activities ta
            JOIN public.outings o ON ta.outing_id = o.id
            WHERE is_group_member(o.group_id)
        )
    );

-- Participants: Update own RSVP
CREATE POLICY "Users can update own RSVP"
    ON public.trip_activity_participants FOR UPDATE
    USING (auth.uid() = user_id);

-- Participants: Delete own RSVP
CREATE POLICY "Users can remove own RSVP"
    ON public.trip_activity_participants FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can update any participant (for payment tracking)
CREATE POLICY "Admins can update participant payment status"
    ON public.trip_activity_participants FOR UPDATE
    USING (
        activity_id IN (
            SELECT ta.id FROM public.trip_activities ta
            JOIN public.outings o ON ta.outing_id = o.id
            WHERE is_group_admin(o.group_id)
        )
    );


-- ============ STEP 6: Verify setup ============

-- Check new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'trip_activities'
AND column_name IN ('category', 'map_link', 'min_people', 'max_people', 'booking_url', 'booked_by');

-- Check participant columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'trip_activity_participants'
AND column_name IN ('paid_amount', 'notes', 'responded_at');
