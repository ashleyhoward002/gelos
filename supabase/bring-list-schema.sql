-- Bring List (Sign-Up List) Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- EVENT BRING LISTS TABLE
-- Main container for sign-up lists
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_bring_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    outing_id UUID REFERENCES public.outings(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    host_providing TEXT,
    template_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT must_have_event_or_outing CHECK (event_id IS NOT NULL OR outing_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.event_bring_lists ENABLE ROW LEVEL SECURITY;


-- ============================================
-- BRING LIST CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bring_list_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bring_list_id UUID NOT NULL REFERENCES public.event_bring_lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bring_list_categories ENABLE ROW LEVEL SECURITY;


-- ============================================
-- BRING LIST ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bring_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bring_list_id UUID NOT NULL REFERENCES public.event_bring_lists(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.bring_list_categories(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity_needed INTEGER DEFAULT 1,
    quantity_claimed INTEGER DEFAULT 0,
    claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claimed_by_name TEXT,
    claim_note TEXT,
    notes TEXT,
    is_suggestion BOOLEAN DEFAULT false,
    suggestion_approved BOOLEAN DEFAULT true,
    is_received BOOLEAN DEFAULT false,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bring_list_items ENABLE ROW LEVEL SECURITY;


-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bring_lists_event ON public.event_bring_lists(event_id);
CREATE INDEX IF NOT EXISTS idx_bring_lists_outing ON public.event_bring_lists(outing_id);
CREATE INDEX IF NOT EXISTS idx_bring_lists_group ON public.event_bring_lists(group_id);
CREATE INDEX IF NOT EXISTS idx_bring_lists_host ON public.event_bring_lists(host_id);
CREATE INDEX IF NOT EXISTS idx_bring_categories_list ON public.bring_list_categories(bring_list_id);
CREATE INDEX IF NOT EXISTS idx_bring_items_list ON public.bring_list_items(bring_list_id);
CREATE INDEX IF NOT EXISTS idx_bring_items_category ON public.bring_list_items(category_id);
CREATE INDEX IF NOT EXISTS idx_bring_items_claimed ON public.bring_list_items(claimed_by);


-- ============================================
-- RLS POLICIES FOR BRING LISTS
-- ============================================

-- View: Group members can view bring lists
CREATE POLICY "Users can view bring lists in their groups"
    ON public.event_bring_lists FOR SELECT
    USING (is_group_member(group_id));

-- Create: Group members can create bring lists
CREATE POLICY "Users can create bring lists"
    ON public.event_bring_lists FOR INSERT
    WITH CHECK (is_group_member(group_id) AND host_id = auth.uid());

-- Update: Host can update their bring list
CREATE POLICY "Host can update their bring list"
    ON public.event_bring_lists FOR UPDATE
    USING (host_id = auth.uid());

-- Delete: Host can delete their bring list
CREATE POLICY "Host can delete their bring list"
    ON public.event_bring_lists FOR DELETE
    USING (host_id = auth.uid());


-- ============================================
-- RLS POLICIES FOR CATEGORIES
-- ============================================

-- View: Anyone who can view the list can view categories
CREATE POLICY "Users can view categories"
    ON public.bring_list_categories FOR SELECT
    USING (
        bring_list_id IN (
            SELECT id FROM public.event_bring_lists
            WHERE is_group_member(group_id)
        )
    );

-- Create: Host can add categories
CREATE POLICY "Host can add categories"
    ON public.bring_list_categories FOR INSERT
    WITH CHECK (
        bring_list_id IN (
            SELECT id FROM public.event_bring_lists
            WHERE host_id = auth.uid()
        )
    );

-- Update: Host can update categories
CREATE POLICY "Host can update categories"
    ON public.bring_list_categories FOR UPDATE
    USING (
        bring_list_id IN (
            SELECT id FROM public.event_bring_lists
            WHERE host_id = auth.uid()
        )
    );

-- Delete: Host can delete categories
CREATE POLICY "Host can delete categories"
    ON public.bring_list_categories FOR DELETE
    USING (
        bring_list_id IN (
            SELECT id FROM public.event_bring_lists
            WHERE host_id = auth.uid()
        )
    );


-- ============================================
-- RLS POLICIES FOR ITEMS
-- ============================================

-- View: Group members can view items
CREATE POLICY "Users can view items"
    ON public.bring_list_items FOR SELECT
    USING (
        bring_list_id IN (
            SELECT id FROM public.event_bring_lists
            WHERE is_group_member(group_id)
        )
    );

-- Create: Group members can add items (suggestions or host adding)
CREATE POLICY "Users can add items"
    ON public.bring_list_items FOR INSERT
    WITH CHECK (
        bring_list_id IN (
            SELECT id FROM public.event_bring_lists
            WHERE is_group_member(group_id)
        )
        AND added_by = auth.uid()
    );

-- Update: Can claim unclaimed items, or update own items, or host can update any
CREATE POLICY "Users can update items"
    ON public.bring_list_items FOR UPDATE
    USING (
        claimed_by = auth.uid()
        OR claimed_by IS NULL
        OR added_by = auth.uid()
        OR bring_list_id IN (
            SELECT id FROM public.event_bring_lists WHERE host_id = auth.uid()
        )
    );

-- Delete: Item creator or host can delete
CREATE POLICY "Users can delete items"
    ON public.bring_list_items FOR DELETE
    USING (
        added_by = auth.uid() OR
        bring_list_id IN (
            SELECT id FROM public.event_bring_lists WHERE host_id = auth.uid()
        )
    );


-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp on bring_list update
CREATE OR REPLACE FUNCTION public.update_bring_list_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_bring_list_update ON public.event_bring_lists;
CREATE TRIGGER on_bring_list_update
    BEFORE UPDATE ON public.event_bring_lists
    FOR EACH ROW EXECUTE FUNCTION public.update_bring_list_timestamp();

DROP TRIGGER IF EXISTS on_bring_item_update ON public.bring_list_items;
CREATE TRIGGER on_bring_item_update
    BEFORE UPDATE ON public.bring_list_items
    FOR EACH ROW EXECUTE FUNCTION public.update_bring_list_timestamp();

-- Update parent list timestamp when items change
CREATE OR REPLACE FUNCTION public.update_bring_list_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.event_bring_lists
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.bring_list_id, OLD.bring_list_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_bring_item_change ON public.bring_list_items;
CREATE TRIGGER on_bring_item_change
    AFTER INSERT OR UPDATE OR DELETE ON public.bring_list_items
    FOR EACH ROW EXECUTE FUNCTION public.update_bring_list_on_item_change();


-- ============================================
-- HELPER VIEW: Bring list summary
-- ============================================
CREATE OR REPLACE VIEW public.bring_list_summary AS
SELECT
    bl.id AS bring_list_id,
    bl.event_id,
    bl.outing_id,
    bl.group_id,
    bl.title,
    bl.host_id,
    COUNT(DISTINCT bi.id) AS total_items,
    COUNT(DISTINCT CASE WHEN bi.claimed_by IS NOT NULL THEN bi.id END) AS claimed_items,
    COUNT(DISTINCT CASE WHEN bi.claimed_by IS NULL THEN bi.id END) AS unclaimed_items,
    COUNT(DISTINCT CASE WHEN bi.is_received THEN bi.id END) AS received_items,
    COUNT(DISTINCT bi.claimed_by) AS unique_contributors
FROM public.event_bring_lists bl
LEFT JOIN public.bring_list_items bi ON bl.id = bi.bring_list_id AND bi.suggestion_approved = true
GROUP BY bl.id, bl.event_id, bl.outing_id, bl.group_id, bl.title, bl.host_id;


-- ============================================
-- VERIFY SETUP
-- ============================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('event_bring_lists', 'bring_list_categories', 'bring_list_items');
