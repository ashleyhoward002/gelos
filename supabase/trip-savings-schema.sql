-- Trip Savings & Financial Planning Schema
-- Run this in Supabase SQL Editor

-- Add savings columns to outings table
ALTER TABLE outings
ADD COLUMN IF NOT EXISTS budget_deadline DATE,
ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly', -- monthly, biweekly, custom
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_day INTEGER DEFAULT 1; -- Day of month (1-28)

-- Trip payments table (contributions toward the trip)
CREATE TABLE IF NOT EXISTS trip_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip payment milestones (scheduled payments)
CREATE TABLE IF NOT EXISTS trip_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,
    milestone_date DATE NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL, -- Cumulative target by this date
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_payments_outing_id ON trip_payments(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_payments_user_id ON trip_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_payments_payment_date ON trip_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_trip_milestones_outing_id ON trip_milestones(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_milestones_milestone_date ON trip_milestones(milestone_date);

-- Enable RLS
ALTER TABLE trip_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_payments
CREATE POLICY "Group members can view trip payments"
    ON trip_payments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM outings o
        WHERE o.id = trip_payments.outing_id
        AND is_group_member(o.group_id)
    ));

CREATE POLICY "Group members can create trip payments"
    ON trip_payments FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM outings o
        WHERE o.id = trip_payments.outing_id
        AND is_group_member(o.group_id)
    ) AND auth.uid() = created_by);

CREATE POLICY "Payment creators can update payments"
    ON trip_payments FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Payment creators can delete payments"
    ON trip_payments FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for trip_milestones
CREATE POLICY "Group members can view trip milestones"
    ON trip_milestones FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM outings o
        WHERE o.id = trip_milestones.outing_id
        AND is_group_member(o.group_id)
    ));

CREATE POLICY "Trip creators can manage milestones"
    ON trip_milestones FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM outings o
        WHERE o.id = trip_milestones.outing_id
        AND o.created_by = auth.uid()
    ));

CREATE POLICY "Trip creators can update milestones"
    ON trip_milestones FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM outings o
        WHERE o.id = trip_milestones.outing_id
        AND o.created_by = auth.uid()
    ));

CREATE POLICY "Trip creators can delete milestones"
    ON trip_milestones FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM outings o
        WHERE o.id = trip_milestones.outing_id
        AND o.created_by = auth.uid()
    ));

-- Function to get trip savings summary
CREATE OR REPLACE FUNCTION get_trip_savings_summary(p_outing_id UUID)
RETURNS TABLE (
    budget_goal DECIMAL(12, 2),
    total_contributed DECIMAL(12, 2),
    percent_funded DECIMAL(5, 2),
    attendee_count INTEGER,
    per_person_share DECIMAL(12, 2),
    days_until_deadline INTEGER,
    monthly_payment_needed DECIMAL(12, 2)
) AS $$
DECLARE
    v_outing RECORD;
    v_total_contributed DECIMAL(12, 2);
    v_attendee_count INTEGER;
    v_months_remaining DECIMAL;
BEGIN
    -- Get outing details
    SELECT o.budget_goal, o.budget_deadline, o.budget_currency
    INTO v_outing
    FROM outings o
    WHERE o.id = p_outing_id;

    -- Get total contributions
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_contributed
    FROM trip_payments
    WHERE outing_id = p_outing_id;

    -- Get attendee count (only "going" attendees)
    SELECT COUNT(*)
    INTO v_attendee_count
    FROM trip_attendees
    WHERE outing_id = p_outing_id AND status = 'going';

    -- Calculate months remaining
    IF v_outing.budget_deadline IS NOT NULL THEN
        v_months_remaining := GREATEST(
            EXTRACT(YEAR FROM v_outing.budget_deadline) * 12 + EXTRACT(MONTH FROM v_outing.budget_deadline)
            - EXTRACT(YEAR FROM CURRENT_DATE) * 12 - EXTRACT(MONTH FROM CURRENT_DATE),
            1
        );
    ELSE
        v_months_remaining := 1;
    END IF;

    RETURN QUERY SELECT
        COALESCE(v_outing.budget_goal, 0)::DECIMAL(12, 2) as budget_goal,
        v_total_contributed as total_contributed,
        CASE
            WHEN COALESCE(v_outing.budget_goal, 0) > 0
            THEN ROUND((v_total_contributed / v_outing.budget_goal * 100)::NUMERIC, 2)
            ELSE 0
        END::DECIMAL(5, 2) as percent_funded,
        COALESCE(v_attendee_count, 0) as attendee_count,
        CASE
            WHEN COALESCE(v_attendee_count, 0) > 0
            THEN ROUND((COALESCE(v_outing.budget_goal, 0) / v_attendee_count)::NUMERIC, 2)
            ELSE COALESCE(v_outing.budget_goal, 0)
        END::DECIMAL(12, 2) as per_person_share,
        CASE
            WHEN v_outing.budget_deadline IS NOT NULL
            THEN (v_outing.budget_deadline - CURRENT_DATE)::INTEGER
            ELSE NULL
        END as days_until_deadline,
        CASE
            WHEN v_attendee_count > 0
            THEN ROUND(((COALESCE(v_outing.budget_goal, 0) - v_total_contributed) / v_attendee_count / v_months_remaining)::NUMERIC, 2)
            ELSE 0
        END::DECIMAL(12, 2) as monthly_payment_needed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get per-person savings progress
CREATE OR REPLACE FUNCTION get_trip_member_progress(p_outing_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    full_name TEXT,
    avatar_url TEXT,
    share_amount DECIMAL(12, 2),
    total_paid DECIMAL(12, 2),
    remaining DECIMAL(12, 2),
    percent_paid DECIMAL(5, 2),
    status TEXT
) AS $$
DECLARE
    v_budget_goal DECIMAL(12, 2);
    v_attendee_count INTEGER;
    v_per_person_share DECIMAL(12, 2);
    v_expected_by_now DECIMAL(12, 2);
    v_budget_deadline DATE;
    v_start_date DATE;
BEGIN
    -- Get outing info
    SELECT o.budget_goal, o.budget_deadline, o.created_at::DATE
    INTO v_budget_goal, v_budget_deadline, v_start_date
    FROM outings o
    WHERE o.id = p_outing_id;

    -- Get attendee count
    SELECT COUNT(*) INTO v_attendee_count
    FROM trip_attendees
    WHERE outing_id = p_outing_id AND status = 'going';

    -- Calculate per-person share
    v_per_person_share := CASE
        WHEN v_attendee_count > 0 THEN v_budget_goal / v_attendee_count
        ELSE v_budget_goal
    END;

    -- Calculate expected progress by now (linear)
    IF v_budget_deadline IS NOT NULL AND v_budget_deadline > v_start_date THEN
        v_expected_by_now := v_per_person_share *
            LEAST(
                (CURRENT_DATE - v_start_date)::DECIMAL / (v_budget_deadline - v_start_date)::DECIMAL,
                1
            );
    ELSE
        v_expected_by_now := v_per_person_share;
    END IF;

    RETURN QUERY
    SELECT
        ta.user_id,
        u.display_name,
        u.full_name,
        u.avatar_url,
        v_per_person_share as share_amount,
        COALESCE(SUM(tp.amount), 0)::DECIMAL(12, 2) as total_paid,
        GREATEST(v_per_person_share - COALESCE(SUM(tp.amount), 0), 0)::DECIMAL(12, 2) as remaining,
        CASE
            WHEN v_per_person_share > 0
            THEN ROUND((COALESCE(SUM(tp.amount), 0) / v_per_person_share * 100)::NUMERIC, 2)
            ELSE 100
        END::DECIMAL(5, 2) as percent_paid,
        CASE
            WHEN COALESCE(SUM(tp.amount), 0) >= v_per_person_share THEN 'paid_in_full'
            WHEN COALESCE(SUM(tp.amount), 0) >= v_expected_by_now THEN 'on_track'
            WHEN COALESCE(SUM(tp.amount), 0) >= v_expected_by_now * 0.8 THEN 'slightly_behind'
            ELSE 'behind'
        END as status
    FROM trip_attendees ta
    JOIN users u ON u.id = ta.user_id
    LEFT JOIN trip_payments tp ON tp.outing_id = ta.outing_id AND tp.user_id = ta.user_id
    WHERE ta.outing_id = p_outing_id AND ta.status = 'going'
    GROUP BY ta.user_id, u.display_name, u.full_name, u.avatar_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
