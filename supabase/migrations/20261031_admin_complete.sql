-- ============================================================================
-- ADMIN PANEL (PART 3): SITE SETTINGS & SEO, PAYMENTS/REFUNDS, CUSTOMERS,
-- REVIEW REPLIES, ORDER NOTES
-- ============================================================================
-- Requires 20261029_admin_panel.sql (public.is_admin()) and
-- 20261030_admin_products.sql (product-images bucket).

-- ---------------------------------------------------------------------------
-- A. SITE SETTINGS & PAGE SEO
-- ---------------------------------------------------------------------------

-- Single-row table with the editable site-wide details
CREATE TABLE IF NOT EXISTS public.site_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'SohniMutiyaar By CC',
  tagline TEXT,
  default_title TEXT,
  default_description TEXT,
  og_image_url TEXT,
  contact_email TEXT,
  whatsapp_number TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  announcement_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (
  id, site_name, tagline, default_title, default_description, contact_email,
  whatsapp_number, instagram_url, tiktok_url, announcement_text
) VALUES (
  1,
  'SohniMutiyaar By CC',
  'Tradition, Tailored Your Way',
  'SohniMutiyaar By CC — Indian Fashion & Bespoke Tailoring',
  'Luxury Indian bridal, occasion and daily wear with bespoke handwork, fine fabrics and made-to-measure tailoring.',
  'Charminngchic@gmail.com',
  '447393070421',
  'https://www.instagram.com/sohnimutiyaarofficial_',
  'https://www.tiktok.com/@sohnimutiyaarofficial_',
  'Custom Designs Available • Made to Measure Elegance'
) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;

-- Optional per-page title/description overrides (path like '/shop')
CREATE TABLE IF NOT EXISTS public.page_seo (
  path TEXT PRIMARY KEY CHECK (path LIKE '/%'),
  title TEXT,
  description TEXT,
  noindex BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read page SEO" ON public.page_seo;
CREATE POLICY "Public can read page SEO"
  ON public.page_seo FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert page SEO" ON public.page_seo;
CREATE POLICY "Admins can insert page SEO"
  ON public.page_seo FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update page SEO" ON public.page_seo;
CREATE POLICY "Admins can update page SEO"
  ON public.page_seo FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete page SEO" ON public.page_seo;
CREATE POLICY "Admins can delete page SEO"
  ON public.page_seo FOR DELETE TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.page_seo TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.page_seo TO authenticated;
