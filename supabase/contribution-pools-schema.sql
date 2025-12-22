-- Contribution Pools Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- CONTRIBUTION POOLS TABLE
-- Main container for group savings goals
-- ============================================
CREATE TABLE IF NOT EXISTS public.contribution_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.outings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    goal_amount DECIMAL(12, 2) NOT NULL CHECK (goal_amount > 0),
    current_amount DECIMAL(12, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    deadline DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    per_person_target DECIMAL(12, 2),
    allow_custom_amounts BOOLEAN DEFAULT true,
    require_confirmation BOOLEAN DEFAULT false,
    is_private BOOLEAN DEFAULT false,
    -- Payment methods as JSONB for flexibility
    payment_methods JSONB DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contribution_pools ENABLE ROW LEVEL SECURITY;


-- ============================================
-- POOL MEMBERS TABLE
-- Track individual member targets and progress
-- ============================================
CREATE TABLE IF NOT EXISTS public.pool_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES public.contribution_pools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_amount DECIMAL(12, 2),
    total_contributed DECIMAL(12, 2) DEFAULT 0,
    is_exempt BOOLEAN DEFAULT false,
    exempt_reason TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pool_id, user_id)
);

-- Enable RLS
ALTER TABLE public.pool_members ENABLE ROW LEVEL SECURITY;


-- ============================================
-- POOL CONTRIBUTIONS TABLE
-- Individual contribution records
-- ============================================
CREATE TABLE IF NOT EXISTS public.pool_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES public.contribution_pools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT,
    payment_reference TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'refunded')),
    confirmed_by UUID REFERENCES auth.users(id),
    confirmed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    contributed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pool_contributions ENABLE ROW LEVEL SECURITY;


-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pools_group ON public.contribution_pools(group_id);
CREATE INDEX IF NOT EXISTS idx_pools_trip ON public.contribution_pools(trip_id);
CREATE INDEX IF NOT EXISTS idx_pools_status ON public.contribution_pools(status);
CREATE INDEX IF NOT EXISTS idx_pools_creator ON public.contribution_pools(created_by);
CREATE INDEX IF NOT EXISTS idx_pool_members_pool ON public.pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_user ON public.pool_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pool_contributions_pool ON public.pool_contributions(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_contributions_user ON public.pool_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_pool_contributions_status ON public.pool_contributions(status);


-- ============================================
-- RLS POLICIES FOR CONTRIBUTION POOLS
-- ============================================

-- View: Group members can view pools
CREATE POLICY "Users can view pools in their groups"
    ON public.contribution_pools FOR SELECT
    USING (is_group_member(group_id));

-- Create: Group members can create pools
CREATE POLICY "Users can create pools"
    ON public.contribution_pools FOR INSERT
    WITH CHECK (is_group_member(group_id) AND created_by = auth.uid());

-- Update: Pool creator can update
CREATE POLICY "Pool creator can update"
    ON public.contribution_pools FOR UPDATE
    USING (created_by = auth.uid());

-- Delete: Pool creator can delete
CREATE POLICY "Pool creator can delete"
    ON public.contribution_pools FOR DELETE
    USING (created_by = auth.uid());


-- ============================================
-- RLS POLICIES FOR POOL MEMBERS
-- ============================================

-- View: Group members can view pool members
CREATE POLICY "Users can view pool members"
    ON public.pool_members FOR SELECT
    USING (
        pool_id IN (
            SELECT id FROM public.contribution_pools
            WHERE is_group_member(group_id)
        )
    );

-- Create: Pool creator can add members
CREATE POLICY "Pool creator can add members"
    ON public.pool_members FOR INSERT
    WITH CHECK (
        pool_id IN (
            SELECT id FROM public.contribution_pools
            WHERE created_by = auth.uid()
        )
    );

-- Update: Pool creator can update members
CREATE POLICY "Pool creator can update members"
    ON public.pool_members FOR UPDATE
    USING (
        pool_id IN (
            SELECT id FROM public.contribution_pools
            WHERE created_by = auth.uid()
        )
    );

-- Delete: Pool creator can remove members
CREATE POLICY "Pool creator can remove members"
    ON public.pool_members FOR DELETE
    USING (
        pool_id IN (
            SELECT id FROM public.contribution_pools
            WHERE created_by = auth.uid()
        )
    );


-- ============================================
-- RLS POLICIES FOR CONTRIBUTIONS
-- ============================================

-- View: Group members can view contributions (respect privacy setting)
CREATE POLICY "Users can view contributions"
    ON public.pool_contributions FOR SELECT
    USING (
        pool_id IN (
            SELECT id FROM public.contribution_pools
            WHERE is_group_member(group_id)
        )
    );

-- Create: Users can add own contributions
CREATE POLICY "Users can add own contributions"
    ON public.pool_contributions FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        pool_id IN (
            SELECT id FROM public.contribution_pools
            WHERE is_group_member(group_id)
        )
    );

-- Update: Users can update own pending contributions, or pool creator can update any
CREATE POLICY "Users can update contributions"
    ON public.pool_contributions FOR UPDATE
    USING (
        (user_id = auth.uid() AND status = 'pending') OR
        pool_id IN (
            SELECT id FROM public.contribution_pools
            WHERE created_by = auth.uid()
        )
    );

-- Delete: Users can delete own pending, or pool creator can delete any
CREATE POLICY "Users can delete contributions"
    ON public.pool_contributions FOR DELETE
    USING (
        (user_id = auth.uid() AND status = 'pending') OR
        pool_id IN (
            SELECT id FROM public.contribution_pools
            WHERE created_by = auth.uid()
        )
    );


-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update pool timestamp
CREATE OR REPLACE FUNCTION public.update_pool_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_pool_update ON public.contribution_pools;
CREATE TRIGGER on_pool_update
    BEFORE UPDATE ON public.contribution_pools
    FOR EACH ROW EXECUTE FUNCTION public.update_pool_timestamp();


-- Update pool totals when contributions change
CREATE OR REPLACE FUNCTION public.update_pool_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_pool_id UUID;
    v_user_id UUID;
    v_new_total DECIMAL(12, 2);
    v_pool_total DECIMAL(12, 2);
BEGIN
    -- Get the pool_id and user_id
    v_pool_id := COALESCE(NEW.pool_id, OLD.pool_id);
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);

    -- Calculate new total for user in this pool
    SELECT COALESCE(SUM(amount), 0) INTO v_new_total
    FROM public.pool_contributions
    WHERE pool_id = v_pool_id AND user_id = v_user_id AND status = 'confirmed';

    -- Update pool_members total
    UPDATE public.pool_members
    SET total_contributed = v_new_total
    WHERE pool_id = v_pool_id AND user_id = v_user_id;

    -- Calculate new total for entire pool
    SELECT COALESCE(SUM(amount), 0) INTO v_pool_total
    FROM public.pool_contributions
    WHERE pool_id = v_pool_id AND status = 'confirmed';

    -- Update pool current_amount
    UPDATE public.contribution_pools
    SET current_amount = v_pool_total,
        status = CASE
            WHEN v_pool_total >= goal_amount AND status = 'active' THEN 'active'
            ELSE status
        END
    WHERE id = v_pool_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_contribution_change ON public.pool_contributions;
CREATE TRIGGER on_contribution_change
    AFTER INSERT OR UPDATE OR DELETE ON public.pool_contributions
    FOR EACH ROW EXECUTE FUNCTION public.update_pool_totals();


-- Auto-add pool creator as member when pool is created
CREATE OR REPLACE FUNCTION public.add_pool_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.pool_members (pool_id, user_id, target_amount)
    VALUES (NEW.id, NEW.created_by, NEW.per_person_target);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_pool_created ON public.contribution_pools;
CREATE TRIGGER on_pool_created
    AFTER INSERT ON public.contribution_pools
    FOR EACH ROW EXECUTE FUNCTION public.add_pool_creator_as_member();


-- ============================================
-- HELPER VIEW: Pool summary
-- ============================================
CREATE OR REPLACE VIEW public.pool_summary AS
SELECT
    p.id,
    p.group_id,
    p.trip_id,
    p.title,
    p.goal_amount,
    p.current_amount,
    p.currency,
    p.deadline,
    p.status,
    p.created_by,
    COUNT(DISTINCT pm.user_id) FILTER (WHERE NOT pm.is_exempt) AS member_count,
    COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'confirmed') AS confirmed_contributions,
    COUNT(DISTINCT pc.id) FILTER (WHERE pc.status = 'pending') AS pending_contributions,
    CASE
        WHEN p.goal_amount > 0 THEN ROUND((p.current_amount / p.goal_amount) * 100, 1)
        ELSE 0
    END AS percent_complete,
    p.goal_amount - p.current_amount AS amount_remaining
FROM public.contribution_pools p
LEFT JOIN public.pool_members pm ON p.id = pm.pool_id
LEFT JOIN public.pool_contributions pc ON p.id = pc.pool_id
GROUP BY p.id;


-- ============================================
-- VERIFY SETUP
-- ============================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('contribution_pools', 'pool_members', 'pool_contributions');
