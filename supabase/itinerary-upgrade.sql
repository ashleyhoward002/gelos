-- Itinerary Builder Enhancement Migration
-- Run this in Supabase SQL Editor

-- ============ STEP 1: Add new columns to trip_itinerary_items ============

-- Add estimated_cost column for better cost tracking
ALTER TABLE public.trip_itinerary_items
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(12, 2);

-- Add booking_url for links to reservations
ALTER TABLE public.trip_itinerary_items
ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- Add address for map integration
ALTER TABLE public.trip_itinerary_items
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update item_type to support more categories
ALTER TABLE public.trip_itinerary_items
DROP CONSTRAINT IF EXISTS trip_itinerary_items_item_type_check;

ALTER TABLE public.trip_itinerary_items
ADD CONSTRAINT trip_itinerary_items_item_type_check
CHECK (item_type IN ('activity', 'meal', 'transport', 'accommodation', 'flight', 'free_time', 'other'));

-- Update status to support more options
ALTER TABLE public.trip_itinerary_items
DROP CONSTRAINT IF EXISTS trip_itinerary_items_status_check;

ALTER TABLE public.trip_itinerary_items
ADD CONSTRAINT trip_itinerary_items_status_check
CHECK (status IN ('planned', 'booked', 'confirmed', 'optional', 'cancelled'));


-- ============ STEP 2: Create participant tracking table ============

CREATE TABLE IF NOT EXISTS trip_itinerary_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    itinerary_item_id UUID NOT NULL REFERENCES trip_itinerary_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(itinerary_item_id, user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trip_itinerary_participants_item_id
ON trip_itinerary_participants(itinerary_item_id);

CREATE INDEX IF NOT EXISTS idx_trip_itinerary_participants_user_id
ON trip_itinerary_participants(user_id);


-- ============ STEP 3: Enable RLS and create policies ============

ALTER TABLE trip_itinerary_participants ENABLE ROW LEVEL SECURITY;

-- View policy: Group members can view participants
CREATE POLICY "Group members can view itinerary participants"
    ON trip_itinerary_participants FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM trip_itinerary_items i
        JOIN outings o ON o.id = i.outing_id
        WHERE i.id = trip_itinerary_participants.itinerary_item_id
        AND is_group_member(o.group_id)
    ));

-- Insert policy: Users can add themselves as participants
CREATE POLICY "Users can add themselves as participants"
    ON trip_itinerary_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM trip_itinerary_items i
        JOIN outings o ON o.id = i.outing_id
        WHERE i.id = trip_itinerary_participants.itinerary_item_id
        AND is_group_member(o.group_id)
    ));

-- Update policy: Users can update their own participation
CREATE POLICY "Users can update their own participation"
    ON trip_itinerary_participants FOR UPDATE
    USING (auth.uid() = user_id);

-- Delete policy: Users can remove themselves
CREATE POLICY "Users can remove themselves from itinerary items"
    ON trip_itinerary_participants FOR DELETE
    USING (auth.uid() = user_id);


-- ============ STEP 4: Add reorder function ============

CREATE OR REPLACE FUNCTION reorder_itinerary_items(
    p_outing_id UUID,
    p_item_date DATE,
    p_item_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(p_item_ids, 1)
    LOOP
        UPDATE trip_itinerary_items
        SET sort_order = i - 1, updated_at = NOW()
        WHERE id = p_item_ids[i]
        AND outing_id = p_outing_id
        AND item_date = p_item_date;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============ STEP 5: Verify setup ============

-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'trip_itinerary_items'
AND column_name IN ('estimated_cost', 'booking_url', 'address');

-- Check participants table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'trip_itinerary_participants'
) as participants_table_exists;
