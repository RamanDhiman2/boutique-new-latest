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

-- ---------------------------------------------------------------------------
-- B. PAYMENTS: REFUNDS & DISPUTES (written by the Stripe webhook / admin function)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_status TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ---------------------------------------------------------------------------
-- C. CUSTOMERS
-- ---------------------------------------------------------------------------
-- Customer list for the admin panel: every account with order totals.
-- Blocking is done by the admin-actions edge function (Supabase Auth ban).
CREATE OR REPLACE FUNCTION public.admin_list_customers()
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC)
    FROM (
      SELECT
        u.id,
        u.email,
        coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name') AS full_name,
        u.phone,
        u.created_at,
        u.last_sign_in_at,
        (u.banned_until IS NOT NULL AND u.banned_until > now()) AS is_blocked,
        EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = u.id) AS is_admin,
        count(o.id) FILTER (WHERE o.payment_status IN ('captured', 'refunded')) AS order_count,
        coalesce(sum(o.total_amount - coalesce(o.refunded_amount, 0))
          FILTER (WHERE o.payment_status IN ('captured', 'refunded') AND o.status <> 'cancelled'), 0) AS total_spent,
        max(o.created_at) FILTER (WHERE o.payment_status IN ('captured', 'refunded')) AS last_order_at
      FROM auth.users u
      LEFT JOIN public.orders o ON o.user_id = u.id
      GROUP BY u.id
    ) t
  ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_list_customers() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_customers() TO authenticated;

-- ---------------------------------------------------------------------------
-- D. ORDERS: NOTES, ADDRESS CORRECTIONS; REVIEWS: EDIT, REPLIES, STORE REVIEWS
-- ---------------------------------------------------------------------------

-- Order list now also returns payment, refund, dispute and note fields
CREATE OR REPLACE FUNCTION public.admin_list_orders(
  p_include_unpaid BOOLEAN DEFAULT false,
  p_limit INT DEFAULT 1000
) RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC)
    FROM (
      SELECT
        o.id,
        o.user_id,
        o.status,
        o.payment_status,
        o.payment_provider_id,
        o.total_amount,
        o.refunded_amount,
        o.refunded_at,
        o.dispute_status,
        o.admin_notes,
        o.shipping_address,
        o.tracking_number,
        o.carrier,
        o.cancellation_reason,
        o.created_at,
        u.email AS customer_email,
        coalesce((
          SELECT jsonb_agg(jsonb_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'size', oi.size,
            'quantity', oi.quantity,
            'price', oi.price
          ))
          FROM public.order_items oi
          WHERE oi.order_id = o.id
        ), '[]'::jsonb) AS order_items
      FROM public.orders o
      LEFT JOIN auth.users u ON u.id = o.user_id
      WHERE p_include_unpaid OR o.payment_status IN ('captured', 'refunded')
      ORDER BY o.created_at DESC
      LIMIT greatest(1, least(p_limit, 5000))
    ) t
  ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Private admin note on an order (never shown to the customer)
CREATE OR REPLACE FUNCTION public.admin_set_order_note(p_order_id UUID, p_note TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.orders SET admin_notes = nullif(trim(coalesce(p_note, '')), '') WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_set_order_note(UUID, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_order_note(UUID, TEXT) TO authenticated;

-- Correct the delivery address snapshot of an order (e.g. a typo by the customer)
CREATE OR REPLACE FUNCTION public.admin_update_order_address(p_order_id UUID, p_address JSONB)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_address IS NULL OR jsonb_typeof(p_address) <> 'object'
     OR coalesce(trim(p_address ->> 'street'), '') = ''
     OR coalesce(trim(p_address ->> 'zip'), '') = '' THEN
    RAISE EXCEPTION 'Street and postcode are required';
  END IF;
  UPDATE public.orders
  SET shipping_address = coalesce(shipping_address, '{}'::jsonb) || p_address
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_address(UUID, JSONB) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_address(UUID, JSONB) TO authenticated;

-- Store replies under reviews (shown on the product page)
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;

-- Admin edits a review's rating/text and/or replies to it. The verification
-- trigger keeps product, author and the verified badge as they were.
CREATE OR REPLACE FUNCTION public.admin_update_review(
  p_review_id UUID,
  p_rating INT,
  p_title TEXT,
  p_comment TEXT,
  p_admin_reply TEXT
) RETURNS VOID AS $$
DECLARE
  v_reply TEXT := nullif(trim(coalesce(p_admin_reply, '')), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF length(trim(coalesce(p_comment, ''))) < 5 THEN
    RAISE EXCEPTION 'Review text is too short';
  END IF;

  UPDATE public.product_reviews
  SET
    rating = p_rating,
    title = nullif(trim(coalesce(p_title, '')), ''),
    comment = trim(p_comment),
    admin_reply_at = CASE
      WHEN v_reply IS NULL THEN NULL
      WHEN admin_reply IS DISTINCT FROM v_reply THEN now()
      ELSE admin_reply_at
    END,
    admin_reply = v_reply
  WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_update_review(UUID, INT, TEXT, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_review(UUID, INT, TEXT, TEXT, TEXT) TO authenticated;

-- Reviews added by the store (e.g. feedback received on WhatsApp). Never "verified".
CREATE OR REPLACE FUNCTION public.admin_add_review(
  p_product_id TEXT,
  p_author_name TEXT,
  p_rating INT,
  p_title TEXT,
  p_comment TEXT
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF length(trim(coalesce(p_author_name, ''))) < 2 OR length(trim(coalesce(p_comment, ''))) < 5 THEN
    RAISE EXCEPTION 'Name and review text are required';
  END IF;

  INSERT INTO public.product_reviews (product_id, author_name, rating, title, comment)
  VALUES (p_product_id, trim(p_author_name), p_rating, nullif(trim(coalesce(p_title, '')), ''), trim(p_comment))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_add_review(TEXT, TEXT, INT, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_review(TEXT, TEXT, INT, TEXT, TEXT) TO authenticated;
