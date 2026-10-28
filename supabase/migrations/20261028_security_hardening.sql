-- ============================================================================
-- SECURITY HARDENING: PAYMENT RPC LOCKDOWN & TRUSTWORTHY REVIEWS
-- ============================================================================

-- 1. PAYMENT RPCs: SERVICE ROLE ONLY
-- Supabase grants EXECUTE on new public functions to anon directly, so revoking
-- from public/authenticated alone left these callable with the public anon key
-- (anyone could mark their own order as paid). Revoke from every client role
-- and also refuse non-service callers inside the function itself.
CREATE OR REPLACE FUNCTION public.update_order_payment_status(
  p_order_id UUID,
  p_payment_provider_id TEXT,
  p_status TEXT,
  p_payment_status TEXT
) RETURNS VOID AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
  SET
    payment_provider_id = COALESCE(p_payment_provider_id, payment_provider_id),
    payment_status = p_payment_status,
    status = p_status
  WHERE id = p_order_id
    AND NOT (payment_status = 'captured' AND p_payment_status IN ('unpaid', 'failed'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.record_stripe_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_order_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.stripe_webhook_events (id, event_type, order_id)
  VALUES (p_event_id, p_event_type, p_order_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.update_order_payment_status(UUID, TEXT, TEXT, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_payment_status(UUID, TEXT, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_stripe_webhook_event(TEXT, TEXT, UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_webhook_event(TEXT, TEXT, UUID) TO service_role;

-- 2. REVIEWS: SIGNED-IN AUTHORS ONLY, VERIFIED BADGE DERIVED FROM REAL ORDERS
-- Previously anyone (even anonymous) could insert reviews under any name with
-- verified_purchase = true. Now the author must be signed in, the row is tied to
-- auth.uid(), and verified_purchase is computed from the author's paid orders.
CREATE OR REPLACE FUNCTION public.set_review_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Reviews cannot be moved to another product or another author
    NEW.product_id := OLD.product_id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
  ELSIF coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.user_id := auth.uid();
    NEW.created_at := now();
  END IF;

  NEW.updated_at := now();
  NEW.verified_purchase := NEW.user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = NEW.user_id
      AND oi.product_id = NEW.product_id
      AND o.payment_status = 'captured'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_review_verification ON public.product_reviews;
CREATE TRIGGER trg_set_review_verification
  BEFORE INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_review_verification();

DROP POLICY IF EXISTS "Anyone can insert product reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Signed-in users can insert their own reviews" ON public.product_reviews;
CREATE POLICY "Signed-in users can insert their own reviews"
  ON public.product_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND rating >= 1 AND rating <= 5
    AND length(trim(author_name)) BETWEEN 2 AND 80
    AND length(coalesce(title, '')) <= 150
    AND length(trim(comment)) BETWEEN 5 AND 2000
  );

DROP POLICY IF EXISTS "Users can update own reviews" ON public.product_reviews;
CREATE POLICY "Users can update own reviews"
  ON public.product_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND rating >= 1 AND rating <= 5
    AND length(trim(author_name)) BETWEEN 2 AND 80
    AND length(coalesce(title, '')) <= 150
    AND length(trim(comment)) BETWEEN 5 AND 2000
  );
