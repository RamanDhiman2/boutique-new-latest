-- ============================================================================
-- SOHNI MUTIYAAR - COMPLETE DYNAMIC CATEGORIES & PRODUCTS SCHEMA (ORDER FIXED)
-- ============================================================================

-- 1. CREATE CATEGORIES TABLE FIRST
CREATE TABLE IF NOT EXISTS public.categories (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    image TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INSERT / POPULATE ALL CATEGORIES FIRST (Taaki products ke paas valid references hon)
INSERT INTO public.categories (slug, name, tagline, description, display_order, is_active)
VALUES
    (
        'bridal',
        'Bridal',
        'For your most unforgettable moments',
        'Exquisite bridal outfits with rich embroidery, heirloom detailing and made-to-measure tailoring.',
        1,
        true
    ),
    (
        'shop-by-occasion',
        'Shop by Occasion',
        'Weddings, festivals & celebrations',
        'Mehndi, sangeet, Eid, Diwali, parties and receptions — dressed beautifully for every celebration.',
        2,
        true
    ),
    (
        'daily-wear',
        'Daily Wear',
        'Everyday elegance',
        'Comfortable, graceful suit salwars and kurtas designed for effortless everyday style.',
        3,
        true
    ),
    (
        'thread-work',
        'Thread Work',
        'Colour, stitch by stitch',
        'Intricate thread embroidery with carefully selected colours and traditional craftsmanship.',
        4,
        true
    ),
    (
        'mirror-work',
        'Mirror Work',
        'Light-catching heritage',
        'Hand-set mirrors framed in fine embroidery — festive, luminous and timeless.',
        5,
        true
    ),
    (
        'aari-work',
        'Aari Work',
        'Fine chain-stitch artistry',
        'Delicate Aari embroidery with beads, sequins and precise hand-guided detail.',
        6,
        true
    ),
    (
        'hand-work',
        'Hand Work',
        'Made slowly, by hand',
        'Pearls, zari and hand embroidery — every piece carries the touch of the artisan.',
        7,
        true
    ),
    (
        'sold-out',
        'Sold Out Products',
        'Archived Couture & Heritage Pieces',
        'A tribute to our most cherished, sold-out bespoke creations. Explore past archives or enquire for custom made-to-measure reproductions.',
        8,
        true
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. ENSURE PRODUCTS TABLE COLUMNS EXIST
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS colour TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '["XS","S","M","L","XL","Custom"]'::jsonb,
    ADD COLUMN IF NOT EXISTS customisable BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_upcoming BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS stock INT DEFAULT 100,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. CLEANUP ANY ORPHANED CATEGORY VALUES IN PRODUCTS BEFORE ADDING FK
UPDATE public.products
SET category = 'shop-by-occasion'
WHERE category IS NOT NULL 
  AND category NOT IN (SELECT slug FROM public.categories);

-- 5. NOW ADD FOREIGN KEY SAFELY (Categories already exist!)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_category' 
          AND table_name = 'products'
    ) THEN
        ALTER TABLE public.products
            ADD CONSTRAINT fk_products_category
            FOREIGN KEY (category)
            REFERENCES public.categories(slug)
            ON UPDATE CASCADE
            ON DELETE SET NULL;
    END IF;
END $$;

-- 6. SEED / UPSERT ALL 16 PRODUCTS WITH CATEGORIES, SOLD OUT & UPCOMING FLAGS
INSERT INTO public.products (id, name, price, colour, category, is_sold_out, is_upcoming, customisable, stock, is_active)
VALUES
    ('elegant-maroon-suit', 'Elegant Maroon Suit', 65, 'Maroon', 'shop-by-occasion', false, false, true, 100, true),
    ('elegant-purple-georgette-suit', 'Elegant Purple Viscose Georgette Suit', 63, 'Purple', 'aari-work', false, false, true, 100, true),
    ('elegant-yellow-cream-suit', 'Elegant Yellow & Cream Suit', 65, 'Yellow & Cream', 'thread-work', true, false, true, 0, true),
    ('elegant-firozi-heavy-suit', 'Elegant Firozi Heavy Suit', 150, 'Firozi', 'hand-work', false, false, true, 100, true),
    ('crepe-mix-match-printed-suit', 'Crepe Mix & Match Printed Suit', 80, 'Multi-Colour Print', 'daily-wear', false, false, true, 100, true),
    ('royal-navy-blue-green-suit', 'Royal Navy Blue & Green Suit', 120, 'Royal Navy Blue & Green', 'shop-by-occasion', false, false, true, 100, true),
    ('baby-pink-mehroon-touch-suit', 'Baby Pink Suit with Mehroon Touch', 170, 'Baby Pink with Mehroon Touch', 'hand-work', false, false, true, 100, true),
    ('dark-purple-heavy-handwork-suit', 'Dark Purple Suit with Heavy Handwork', 120, 'Dark Purple', 'shop-by-occasion', false, false, true, 100, true),
    ('bottle-green-heavy-handwork-suit', 'Bottle Green Suit with Heavy Handwork', 140, 'Bottle Green', 'hand-work', false, false, true, 100, true),
    ('coffee-brown-cream-salwar-suit', 'Coffee Brown Suit with Cream Salwar', 60, 'Coffee Brown & Cream', 'daily-wear', false, false, true, 100, true),
    ('all-over-black-heavy-handwork-suit', 'All-Over Black Suit with Heavy Handwork', 199, 'Black', 'shop-by-occasion', false, false, true, 100, true),
    ('dark-green-bridal-heavy-handwork-suit', 'Dark Green Bridal Suit with Heavy Handwork', 230, 'Dark Green', 'bridal', false, false, true, 100, true),
    ('firozi-banarsi-heavy-golden-suit', 'Firozi Banarsi Suit with Heavy Golden Work', 199, 'Firozi', 'bridal', false, false, true, 100, true),
    ('heritage-ivory-chikankari-sharara', 'Turquoise Blue Handwork Suit', 145, 'Turquoise Blue & Gold', 'hand-work', false, false, true, 100, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    colour = EXCLUDED.colour,
    category = EXCLUDED.category,
    is_sold_out = EXCLUDED.is_sold_out,
    is_upcoming = EXCLUDED.is_upcoming,
    customisable = EXCLUDED.customisable,
    stock = EXCLUDED.stock,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 7. CLEANUP ANY UPCOMING ARTIFACTS
DELETE FROM public.products WHERE category = 'upcoming-products' OR id LIKE 'upcoming-%';
DELETE FROM public.categories WHERE slug = 'upcoming-products';

-- 8. DYNAMIC CATEGORY & PRODUCT OVERVIEW VIEW
CREATE OR REPLACE VIEW public.v_category_products_summary AS
SELECT 
    c.slug AS category_slug,
    c.name AS category_name,
    c.tagline,
    c.display_order,
    c.is_active,
    COUNT(p.id) AS total_products,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'price', p.price,
                'colour', p.colour,
                'category', p.category,
                'is_sold_out', p.is_sold_out,
                'stock', p.stock
            ) ORDER BY p.name ASC
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::jsonb
    ) AS products_list
FROM public.categories c
LEFT JOIN public.products p 
    ON (
        p.category = c.slug
        OR (c.slug = 'sold-out' AND (p.is_sold_out = true OR p.category = 'sold-out'))
    ) AND (p.is_active = true OR p.is_active IS NULL)
GROUP BY c.slug, c.name, c.tagline, c.display_order, c.is_active
ORDER BY c.display_order ASC;

-- 8. SECURITY & ACCESS POLICIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories"
    ON public.categories FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
    ON public.products FOR SELECT
    USING (is_active = true);

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.v_category_products_summary TO anon, authenticated;
