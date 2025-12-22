-- Packing Lists Feature Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- PACKING LISTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trip_packing_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null if shared list
    is_shared BOOLEAN DEFAULT false,
    title TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trip_packing_lists ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PACKING ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trip_packing_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES public.trip_packing_lists(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT DEFAULT 'misc' CHECK (category IN ('clothes', 'toiletries', 'electronics', 'documents', 'beach', 'medicine', 'snacks', 'misc')),
    quantity INTEGER DEFAULT 1,
    is_packed BOOLEAN DEFAULT false,
    packed_at TIMESTAMPTZ,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trip_packing_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_packing_lists_trip_id ON public.trip_packing_lists(trip_id);
CREATE INDEX IF NOT EXISTS idx_packing_lists_user_id ON public.trip_packing_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_packing_lists_shared ON public.trip_packing_lists(is_shared);
CREATE INDEX IF NOT EXISTS idx_packing_items_list_id ON public.trip_packing_items(list_id);
CREATE INDEX IF NOT EXISTS idx_packing_items_category ON public.trip_packing_items(category);
CREATE INDEX IF NOT EXISTS idx_packing_items_packed ON public.trip_packing_items(is_packed);

-- ============================================
-- RLS POLICIES FOR PACKING LISTS
-- ============================================

-- View: Users can view shared lists in their groups and their own lists
CREATE POLICY "Users can view shared lists and own lists"
    ON public.trip_packing_lists FOR SELECT
    USING (
        -- Shared lists in trips the user is part of
        (is_shared = true AND trip_id IN (
            SELECT o.id FROM public.outings o
            WHERE is_group_member(o.group_id)
        ))
        -- OR user's own personal lists
        OR user_id = auth.uid()
        -- OR lists created by the user (for shared lists they created)
        OR created_by = auth.uid()
    );

-- Create: Users can create lists for trips they're part of
CREATE POLICY "Users can create packing lists"
    ON public.trip_packing_lists FOR INSERT
    WITH CHECK (
        trip_id IN (
            SELECT o.id FROM public.outings o
            WHERE is_group_member(o.group_id)
        )
        AND created_by = auth.uid()
        -- Personal lists must have matching user_id
        AND (is_shared = true OR user_id = auth.uid())
    );

-- Update: Users can update their own lists or shared lists in their groups
CREATE POLICY "Users can update accessible lists"
    ON public.trip_packing_lists FOR UPDATE
    USING (
        user_id = auth.uid()
        OR created_by = auth.uid()
        OR (is_shared = true AND trip_id IN (
            SELECT o.id FROM public.outings o
            WHERE is_group_member(o.group_id)
        ))
    );

-- Delete: Users can delete their own lists or lists they created
CREATE POLICY "Users can delete own lists"
    ON public.trip_packing_lists FOR DELETE
    USING (user_id = auth.uid() OR created_by = auth.uid());


-- ============================================
-- RLS POLICIES FOR PACKING ITEMS
-- ============================================

-- View: Users can view items in lists they can access
CREATE POLICY "Users can view items in accessible lists"
    ON public.trip_packing_items FOR SELECT
    USING (
        list_id IN (
            SELECT pl.id FROM public.trip_packing_lists pl
            WHERE (pl.is_shared = true AND pl.trip_id IN (
                SELECT o.id FROM public.outings o
                WHERE is_group_member(o.group_id)
            ))
            OR pl.user_id = auth.uid()
            OR pl.created_by = auth.uid()
        )
    );

-- Create: Users can add items to accessible lists
CREATE POLICY "Users can add items to accessible lists"
    ON public.trip_packing_items FOR INSERT
    WITH CHECK (
        added_by = auth.uid()
        AND list_id IN (
            SELECT pl.id FROM public.trip_packing_lists pl
            WHERE (pl.is_shared = true AND pl.trip_id IN (
                SELECT o.id FROM public.outings o
                WHERE is_group_member(o.group_id)
            ))
            OR pl.user_id = auth.uid()
        )
    );

-- Update: Users can update items they added or items in their own lists
CREATE POLICY "Users can update accessible items"
    ON public.trip_packing_items FOR UPDATE
    USING (
        added_by = auth.uid()
        OR list_id IN (
            SELECT pl.id FROM public.trip_packing_lists pl
            WHERE pl.user_id = auth.uid()
        )
    );

-- Delete: Users can delete items they added or items in their own lists
CREATE POLICY "Users can delete accessible items"
    ON public.trip_packing_items FOR DELETE
    USING (
        added_by = auth.uid()
        OR list_id IN (
            SELECT pl.id FROM public.trip_packing_lists pl
            WHERE pl.user_id = auth.uid()
        )
    );


-- ============================================
-- FUNCTION: Update list timestamp on item changes
-- ============================================
CREATE OR REPLACE FUNCTION public.update_packing_list_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.trip_packing_lists
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.list_id, OLD.list_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for item changes
DROP TRIGGER IF EXISTS on_packing_item_change ON public.trip_packing_items;
CREATE TRIGGER on_packing_item_change
    AFTER INSERT OR UPDATE OR DELETE ON public.trip_packing_items
    FOR EACH ROW EXECUTE FUNCTION public.update_packing_list_timestamp();


-- ============================================
-- VERIFY SETUP
-- ============================================
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('trip_packing_lists', 'trip_packing_items')
ORDER BY table_name, ordinal_position;
