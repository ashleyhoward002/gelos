-- Trips & Outings Schema Update for Gelos
-- Run this in Supabase SQL Editor

-- Create outing_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE outing_type AS ENUM ('outing', 'trip');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add trip-related columns to outings table
DO $$ BEGIN
    ALTER TABLE outings ADD COLUMN outing_type outing_type NOT NULL DEFAULT 'outing';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE outings ADD COLUMN end_date DATE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE outings ADD COLUMN budget_goal DECIMAL(12, 2);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE outings ADD COLUMN budget_currency TEXT DEFAULT 'USD';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create index for outing_type
CREATE INDEX IF NOT EXISTS idx_outings_outing_type ON outings(outing_type);
CREATE INDEX IF NOT EXISTS idx_outings_end_date ON outings(end_date);

-- Add outing_id to expenses table for trip expense linking
DO $$ BEGIN
    ALTER TABLE expenses ADD COLUMN outing_id UUID REFERENCES outings(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_outing_id ON expenses(outing_id);

-- Add outing_id to polls table for trip poll linking
DO $$ BEGIN
    ALTER TABLE polls ADD COLUMN outing_id UUID REFERENCES outings(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_polls_outing_id ON polls(outing_id);

-- Add outing_id to calendar_events table for trip itinerary
DO $$ BEGIN
    ALTER TABLE calendar_events ADD COLUMN outing_id UUID REFERENCES outings(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_calendar_events_outing_id ON calendar_events(outing_id);

-- Add trip_id to outing_ideas for trip-specific ideas
DO $$ BEGIN
    ALTER TABLE outing_ideas ADD COLUMN trip_id UUID REFERENCES outings(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_outing_ideas_trip_id ON outing_ideas(trip_id);

-- Trip attendees table (who's going on the trip)
CREATE TABLE IF NOT EXISTS trip_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(outing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_attendees_outing_id ON trip_attendees(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_attendees_user_id ON trip_attendees(user_id);

-- Enable RLS on trip_attendees
ALTER TABLE trip_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_attendees
CREATE POLICY "Group members can view attendees"
    ON trip_attendees FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM outings
        WHERE outings.id = trip_attendees.outing_id
        AND is_group_member(outings.group_id)
    ));

CREATE POLICY "Group members can manage their attendance"
    ON trip_attendees FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM outings
            WHERE outings.id = trip_attendees.outing_id
            AND is_group_member(outings.group_id)
        )
    );

CREATE POLICY "Users can update their attendance"
    ON trip_attendees FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their attendance"
    ON trip_attendees FOR DELETE
    USING (auth.uid() = user_id);

-- Function to get trip budget summary
CREATE OR REPLACE FUNCTION get_trip_budget_summary(p_outing_id UUID, p_user_id UUID)
RETURNS TABLE (
    total_spent DECIMAL(12, 2),
    budget_goal DECIMAL(12, 2),
    your_share DECIMAL(12, 2),
    your_paid DECIMAL(12, 2),
    your_balance DECIMAL(12, 2),
    attendee_count INTEGER
) AS $$
DECLARE
    v_attendee_count INTEGER;
BEGIN
    -- Get attendee count
    SELECT COUNT(*) INTO v_attendee_count
    FROM trip_attendees
    WHERE outing_id = p_outing_id AND status = 'going';

    -- Default to 1 if no attendees to avoid division by zero
    IF v_attendee_count = 0 THEN
        v_attendee_count := 1;
    END IF;

    RETURN QUERY
    SELECT
        -- Total spent on this trip
        COALESCE((
            SELECT SUM(e.amount)
            FROM expenses e
            WHERE e.outing_id = p_outing_id
        ), 0)::DECIMAL(12, 2) as total_spent,

        -- Budget goal from the outing
        COALESCE((
            SELECT o.budget_goal
            FROM outings o
            WHERE o.id = p_outing_id
        ), 0)::DECIMAL(12, 2) as budget_goal,

        -- User's fair share (total / attendees)
        COALESCE((
            SELECT SUM(es.amount)
            FROM expenses e
            JOIN expense_splits es ON e.id = es.expense_id
            WHERE e.outing_id = p_outing_id
            AND es.user_id = p_user_id
        ), 0)::DECIMAL(12, 2) as your_share,

        -- What user has paid
        COALESCE((
            SELECT SUM(e.amount)
            FROM expenses e
            WHERE e.outing_id = p_outing_id
            AND e.paid_by = p_user_id
        ), 0)::DECIMAL(12, 2) as your_paid,

        -- Net balance (positive = paid more than share, negative = owes)
        (COALESCE((
            SELECT SUM(e.amount)
            FROM expenses e
            WHERE e.outing_id = p_outing_id
            AND e.paid_by = p_user_id
        ), 0) - COALESCE((
            SELECT SUM(es.amount)
            FROM expenses e
            JOIN expense_splits es ON e.id = es.expense_id
            WHERE e.outing_id = p_outing_id
            AND es.user_id = p_user_id
            AND es.is_settled = FALSE
        ), 0))::DECIMAL(12, 2) as your_balance,

        v_attendee_count as attendee_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
