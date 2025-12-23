-- Scrapbook Schema for Gelos
-- Run this in your Supabase SQL Editor

-- ============================================
-- SCRAPBOOK PAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.scrapbook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    cover_thumbnail_url TEXT,
    background_color TEXT DEFAULT '#FFF8F0',
    background_pattern TEXT, -- 'dots', 'lines', 'grid', null for solid
    page_order INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCRAPBOOK ELEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.scrapbook_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.scrapbook_pages(id) ON DELETE CASCADE,
    element_type TEXT NOT NULL CHECK (element_type IN ('photo', 'text', 'sticker', 'shape', 'date_stamp')),

    -- Position and transform
    position_x NUMERIC DEFAULT 50,
    position_y NUMERIC DEFAULT 50,
    width NUMERIC DEFAULT 200,
    height NUMERIC DEFAULT 200,
    rotation NUMERIC DEFAULT 0,
    z_index INTEGER DEFAULT 0,

    -- Content (JSONB varies by element_type)
    -- Photo: { photoId, photoUrl, caption }
    -- Text: { text, fontFamily, fontSize, fontWeight, color, backgroundColor, textAlign }
    -- Sticker: { stickerId, stickerUrl }
    -- Shape: { shapeType, fillColor, strokeColor, strokeWidth }
    -- DateStamp: { date, format, style }
    content JSONB NOT NULL DEFAULT '{}',

    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STICKER CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.sticker_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- ============================================
-- STICKERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.stickers (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.sticker_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT, -- Simple emoji stickers
    image_url TEXT, -- Custom image stickers (SVG/PNG)
    sort_order INTEGER DEFAULT 0
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_scrapbook_pages_group_id ON public.scrapbook_pages(group_id);
CREATE INDEX IF NOT EXISTS idx_scrapbook_pages_created_by ON public.scrapbook_pages(created_by);
CREATE INDEX IF NOT EXISTS idx_scrapbook_elements_page_id ON public.scrapbook_elements(page_id);
CREATE INDEX IF NOT EXISTS idx_scrapbook_elements_type ON public.scrapbook_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_stickers_category ON public.stickers(category_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.scrapbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrapbook_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR SCRAPBOOK PAGES
-- ============================================

-- Group members can view scrapbook pages
CREATE POLICY "Group members can view scrapbook pages"
    ON public.scrapbook_pages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = scrapbook_pages.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Group members can create scrapbook pages
CREATE POLICY "Group members can create scrapbook pages"
    ON public.scrapbook_pages
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = scrapbook_pages.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Page creator can update their pages
CREATE POLICY "Page creator can update scrapbook pages"
    ON public.scrapbook_pages
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Page creator can delete their pages
CREATE POLICY "Page creator can delete scrapbook pages"
    ON public.scrapbook_pages
    FOR DELETE
    USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES FOR SCRAPBOOK ELEMENTS
-- ============================================

-- Users can view elements on pages they can access
CREATE POLICY "Users can view scrapbook elements"
    ON public.scrapbook_elements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.scrapbook_pages
            JOIN public.group_members ON group_members.group_id = scrapbook_pages.group_id
            WHERE scrapbook_pages.id = scrapbook_elements.page_id
            AND group_members.user_id = auth.uid()
            AND group_members.left_at IS NULL
        )
    );

-- Page creator can add elements to their pages
CREATE POLICY "Page creator can add elements"
    ON public.scrapbook_elements
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.scrapbook_pages
            WHERE scrapbook_pages.id = scrapbook_elements.page_id
            AND scrapbook_pages.created_by = auth.uid()
        )
    );

-- Element creator can update their elements
CREATE POLICY "Element creator can update elements"
    ON public.scrapbook_elements
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Element creator can delete their elements
CREATE POLICY "Element creator can delete elements"
    ON public.scrapbook_elements
    FOR DELETE
    USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES FOR STICKERS (PUBLIC READ)
-- ============================================

-- Anyone can view sticker categories
CREATE POLICY "Anyone can view sticker categories"
    ON public.sticker_categories
    FOR SELECT
    USING (true);

-- Anyone can view stickers
CREATE POLICY "Anyone can view stickers"
    ON public.stickers
    FOR SELECT
    USING (true);

-- ============================================
-- SEED DEFAULT STICKER CATEGORIES
-- ============================================
INSERT INTO public.sticker_categories (id, name, icon, sort_order) VALUES
    ('travel', 'Travel', 'plane', 1),
    ('celebration', 'Celebration', 'party', 2),
    ('food', 'Food & Drink', 'utensils', 3),
    ('love', 'Love', 'heart', 4),
    ('fun', 'Fun', 'smile', 5),
    ('nature', 'Nature', 'leaf', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DEFAULT STICKERS
-- ============================================
INSERT INTO public.stickers (id, category_id, name, emoji, sort_order) VALUES
    -- Travel
    ('plane', 'travel', 'Airplane', '✈️', 1),
    ('beach', 'travel', 'Beach', '🏖️', 2),
    ('mountains', 'travel', 'Mountains', '⛰️', 3),
    ('palm', 'travel', 'Palm Tree', '🌴', 4),
    ('sunset', 'travel', 'Sunset', '🌅', 5),
    ('compass', 'travel', 'Compass', '🧭', 6),
    ('luggage', 'travel', 'Luggage', '🧳', 7),
    ('world', 'travel', 'World', '🌍', 8),

    -- Celebration
    ('party', 'celebration', 'Party', '🎉', 1),
    ('star', 'celebration', 'Star', '⭐', 2),
    ('crown', 'celebration', 'Crown', '👑', 3),
    ('gift', 'celebration', 'Gift', '🎁', 4),
    ('balloon', 'celebration', 'Balloon', '🎈', 5),
    ('confetti', 'celebration', 'Confetti', '🎊', 6),
    ('trophy', 'celebration', 'Trophy', '🏆', 7),
    ('sparkles', 'celebration', 'Sparkles', '✨', 8),

    -- Food & Drink
    ('pizza', 'food', 'Pizza', '🍕', 1),
    ('drink', 'food', 'Tropical Drink', '🍹', 2),
    ('coffee', 'food', 'Coffee', '☕', 3),
    ('cake', 'food', 'Cake', '🎂', 4),
    ('icecream', 'food', 'Ice Cream', '🍦', 5),
    ('burger', 'food', 'Burger', '🍔', 6),
    ('wine', 'food', 'Wine', '🍷', 7),
    ('sushi', 'food', 'Sushi', '🍣', 8),

    -- Love
    ('heart', 'love', 'Heart', '❤️', 1),
    ('pink-heart', 'love', 'Pink Heart', '💗', 2),
    ('hearts', 'love', 'Two Hearts', '💕', 3),
    ('love-eyes', 'love', 'Love Eyes', '😍', 4),
    ('kiss', 'love', 'Kiss', '💋', 5),
    ('hug', 'love', 'Hug', '🤗', 6),
    ('couple', 'love', 'Couple', '💑', 7),
    ('rose', 'love', 'Rose', '🌹', 8),

    -- Fun
    ('fire', 'fun', 'Fire', '🔥', 1),
    ('laugh', 'fun', 'Laughing', '😂', 2),
    ('thumbsup', 'fun', 'Thumbs Up', '👍', 3),
    ('camera', 'fun', 'Camera', '📸', 4),
    ('music', 'fun', 'Music', '🎵', 5),
    ('sunglasses', 'fun', 'Sunglasses', '😎', 6),
    ('rocket', 'fun', 'Rocket', '🚀', 7),
    ('rainbow', 'fun', 'Rainbow', '🌈', 8),

    -- Nature
    ('sun', 'nature', 'Sun', '☀️', 1),
    ('moon', 'nature', 'Moon', '🌙', 2),
    ('flower', 'nature', 'Flower', '🌸', 3),
    ('leaf', 'nature', 'Leaf', '🍃', 4),
    ('tree', 'nature', 'Tree', '🌳', 5),
    ('butterfly', 'nature', 'Butterfly', '🦋', 6),
    ('wave', 'nature', 'Wave', '🌊', 7),
    ('snowflake', 'nature', 'Snowflake', '❄️', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TRIGGER: Update updated_at on changes
-- ============================================
CREATE OR REPLACE FUNCTION update_scrapbook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scrapbook_pages_updated_at
    BEFORE UPDATE ON public.scrapbook_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_scrapbook_updated_at();

CREATE TRIGGER scrapbook_elements_updated_at
    BEFORE UPDATE ON public.scrapbook_elements
    FOR EACH ROW
    EXECUTE FUNCTION update_scrapbook_updated_at();
