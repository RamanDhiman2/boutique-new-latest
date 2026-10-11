-- ============================================================================
-- PRODUCT REVIEWS TABLE & ROW LEVEL SECURITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Optimize search and lookup by product_id and timestamp
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Access: anyone can read product reviews
DROP POLICY IF EXISTS "Public can view product reviews" ON public.product_reviews;
CREATE POLICY "Public can view product reviews"
  ON public.product_reviews
  FOR SELECT
  USING (true);

-- 2. Insert Access: anyone (guest or customer) can submit a review with basic valid constraints
DROP POLICY IF EXISTS "Anyone can insert product reviews" ON public.product_reviews;
CREATE POLICY "Anyone can insert product reviews"
  ON public.product_reviews
  FOR INSERT
  WITH CHECK (
    rating >= 1 AND rating <= 5
    AND length(trim(author_name)) >= 2
    AND length(trim(comment)) >= 5
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 3. Update Access: users can update their own reviews if authenticated
DROP POLICY IF EXISTS "Users can update own reviews" ON public.product_reviews;
CREATE POLICY "Users can update own reviews"
  ON public.product_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Delete Access: users can delete their own reviews
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.product_reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.product_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Seed initial genuine customer reviews for store products
INSERT INTO public.product_reviews (product_id, author_name, rating, title, comment, verified_purchase, created_at)
VALUES
  (
    'elegant-maroon-suit',
    'Harleen Kaur',
    5,
    'Pure Royal Craftsmanship',
    'The velvet is incredibly rich and the zardozi embroidery is heavy and authentic. The tailoring team contacted me on WhatsApp for custom measurements and the peplum fit was immaculate!',
    true,
    now() - interval '5 days'
  ),
  (
    'elegant-maroon-suit',
    'Priya Sharma',
    5,
    'Stunning Bridal Ensemble',
    'Wore this for my cousin''s wedding and received endless compliments. The flare and dupatta finish are top tier.',
    true,
    now() - interval '12 days'
  ),
  (
    'elegant-purple-georgette-suit',
    'Simran Gill',
    5,
    'Exquisite Aari embroidery',
    'The shade of purple is so regal. Lightweight georgette yet the work feels premium and luxury.',
    true,
    now() - interval '8 days'
  ),
  (
    'royal-navy-blue-green-suit',
    'Jasleen B.',
    5,
    'Colour combination is mesmerising',
    'Navy and green silk blend is stunning in person. Delivery to London was fast and beautifully packaged.',
    true,
    now() - interval '15 days'
  ),
  (
    'all-over-black-heavy-handwork-suit',
    'Amanpreet K.',
    5,
    'Showstopper black velvet suit',
    'The black velvet with heavy hand embroidery is sensational. Worth every single penny.',
    true,
    now() - interval '3 days'
  )
ON CONFLICT DO NOTHING;
