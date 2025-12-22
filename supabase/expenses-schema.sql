-- Expenses Schema for Gelos
-- Run this in Supabase SQL Editor

-- Create expense_split_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE expense_split_type AS ENUM ('equal', 'custom', 'percentage');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create expense_category enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE expense_category AS ENUM ('food', 'transport', 'accommodation', 'activities', 'shopping', 'utilities', 'entertainment', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Expense guests table (non-member participants)
CREATE TABLE IF NOT EXISTS expense_guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    split_type expense_split_type NOT NULL DEFAULT 'equal',
    category expense_category NOT NULL DEFAULT 'other',
    receipt_url TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense splits table (who owes what)
CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL if guest
    guest_id UUID REFERENCES expense_guests(id) ON DELETE CASCADE, -- NULL if member
    amount DECIMAL(12, 2) NOT NULL,
    percentage DECIMAL(5, 2), -- Only for percentage splits
    is_settled BOOLEAN DEFAULT FALSE,
    settled_at TIMESTAMPTZ,
    settled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who marked it settled
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Either user_id or guest_id must be set
    CONSTRAINT user_or_guest CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL) OR
        (user_id IS NULL AND guest_id IS NOT NULL)
    )
);

-- Expense reminders table (private reminders)
CREATE TABLE IF NOT EXISTS expense_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_guest_id ON expense_splits(guest_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_is_settled ON expense_splits(is_settled);
CREATE INDEX IF NOT EXISTS idx_expense_guests_group_id ON expense_guests(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_reminders_expense_id ON expense_reminders(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_reminders_to_user_id ON expense_reminders(to_user_id);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Group members can view expenses"
    ON expenses FOR SELECT
    USING (is_group_member(group_id));

CREATE POLICY "Group members can create expenses"
    ON expenses FOR INSERT
    WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Expense creators can update expenses"
    ON expenses FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Expense creators can delete expenses"
    ON expenses FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for expense_splits
CREATE POLICY "Group members can view expense splits"
    ON expense_splits FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM expenses
        WHERE expenses.id = expense_splits.expense_id
        AND is_group_member(expenses.group_id)
    ));

CREATE POLICY "Expense creators can manage splits"
    ON expense_splits FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM expenses
        WHERE expenses.id = expense_splits.expense_id
        AND expenses.created_by = auth.uid()
    ));

CREATE POLICY "Expense creators can update splits"
    ON expense_splits FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM expenses
        WHERE expenses.id = expense_splits.expense_id
        AND (expenses.created_by = auth.uid() OR expense_splits.user_id = auth.uid())
    ));

CREATE POLICY "Expense creators can delete splits"
    ON expense_splits FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM expenses
        WHERE expenses.id = expense_splits.expense_id
        AND expenses.created_by = auth.uid()
    ));

-- RLS Policies for expense_guests
CREATE POLICY "Group members can view guests"
    ON expense_guests FOR SELECT
    USING (is_group_member(group_id));

CREATE POLICY "Group members can create guests"
    ON expense_guests FOR INSERT
    WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Guest creators can update guests"
    ON expense_guests FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Guest creators can delete guests"
    ON expense_guests FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for expense_reminders
CREATE POLICY "Users can view their reminders"
    ON expense_reminders FOR SELECT
    USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create reminders"
    ON expense_reminders FOR INSERT
    WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Reminder senders can update reminders"
    ON expense_reminders FOR UPDATE
    USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Reminder senders can delete reminders"
    ON expense_reminders FOR DELETE
    USING (auth.uid() = from_user_id);

-- Function to calculate group balances for a user
CREATE OR REPLACE FUNCTION get_user_balance(p_group_id UUID, p_user_id UUID)
RETURNS TABLE (
    you_owe DECIMAL(12, 2),
    you_are_owed DECIMAL(12, 2),
    net_balance DECIMAL(12, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Amount user owes (unsettled splits where user didn't pay)
        COALESCE(SUM(
            CASE WHEN es.user_id = p_user_id AND e.paid_by != p_user_id AND es.is_settled = FALSE
            THEN es.amount ELSE 0 END
        ), 0)::DECIMAL(12, 2) as you_owe,

        -- Amount user is owed (user paid but others haven't settled)
        COALESCE(SUM(
            CASE WHEN e.paid_by = p_user_id AND es.user_id != p_user_id AND es.is_settled = FALSE
            THEN es.amount ELSE 0 END
        ), 0)::DECIMAL(12, 2) as you_are_owed,

        -- Net balance (positive = owed, negative = owes)
        (COALESCE(SUM(
            CASE WHEN e.paid_by = p_user_id AND es.user_id != p_user_id AND es.is_settled = FALSE
            THEN es.amount ELSE 0 END
        ), 0) - COALESCE(SUM(
            CASE WHEN es.user_id = p_user_id AND e.paid_by != p_user_id AND es.is_settled = FALSE
            THEN es.amount ELSE 0 END
        ), 0))::DECIMAL(12, 2) as net_balance
    FROM expenses e
    JOIN expense_splits es ON e.id = es.expense_id
    WHERE e.group_id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get detailed balances between members
CREATE OR REPLACE FUNCTION get_member_balances(p_group_id UUID, p_user_id UUID)
RETURNS TABLE (
    other_user_id UUID,
    amount DECIMAL(12, 2),
    direction TEXT -- 'owes_you' or 'you_owe'
) AS $$
BEGIN
    RETURN QUERY
    WITH balances AS (
        -- What others owe this user
        SELECT
            es.user_id as other_id,
            SUM(es.amount) as total,
            'owes_you' as dir
        FROM expenses e
        JOIN expense_splits es ON e.id = es.expense_id
        WHERE e.group_id = p_group_id
        AND e.paid_by = p_user_id
        AND es.user_id != p_user_id
        AND es.is_settled = FALSE
        AND es.user_id IS NOT NULL
        GROUP BY es.user_id

        UNION ALL

        -- What this user owes others
        SELECT
            e.paid_by as other_id,
            -SUM(es.amount) as total,
            'you_owe' as dir
        FROM expenses e
        JOIN expense_splits es ON e.id = es.expense_id
        WHERE e.group_id = p_group_id
        AND es.user_id = p_user_id
        AND e.paid_by != p_user_id
        AND es.is_settled = FALSE
        GROUP BY e.paid_by
    )
    SELECT
        b.other_id as other_user_id,
        ABS(SUM(b.total))::DECIMAL(12, 2) as amount,
        CASE WHEN SUM(b.total) > 0 THEN 'owes_you' ELSE 'you_owe' END as direction
    FROM balances b
    GROUP BY b.other_id
    HAVING SUM(b.total) != 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
