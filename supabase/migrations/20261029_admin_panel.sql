-- ============================================================================
-- ADMIN PANEL: ADMIN LIST, ORDER MANAGEMENT & REVIEW MODERATION
-- ============================================================================
-- Admins are normal site users whose user id is listed in public.admin_users.
-- Every admin action goes through a SECURITY DEFINER function that checks
-- is_admin() first, so no broad RLS policies are opened on orders.

-- 1. ADMIN LIST
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS on with no policies: clients cannot read or change the admin list directly
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Store owner account. The account must already exist (signed up on the site).
-- To add another admin later, run the same INSERT with their email.
INSERT INTO public.admin_users (user_id, email)
SELECT id, email FROM auth.users WHERE lower(email) = 'charminngchic@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 2. IS_ADMIN CHECK
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 3. LIST ORDERS (with items and customer email)
-- By default only real orders (paid/refunded). Abandoned checkouts are unpaid
-- orders and are only included when p_include_unpaid is true.
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
        o.total_amount,
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

REVOKE EXECUTE ON FUNCTION public.admin_list_orders(BOOLEAN, INT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_orders(BOOLEAN, INT) TO authenticated;

-- 4. UPDATE ORDER FULFILMENT (status, carrier, tracking)
-- Payment fields are never touched here; those stay webhook-only.
CREATE OR REPLACE FUNCTION public.admin_update_order(
  p_order_id UUID,
  p_status TEXT,
  p_carrier TEXT DEFAULT NULL,
  p_tracking_number TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('processing', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE public.orders
  SET
    status = p_status,
    carrier = nullif(trim(coalesce(p_carrier, '')), ''),
    tracking_number = nullif(trim(coalesce(p_tracking_number, '')), ''),
    cancellation_reason = CASE
      WHEN p_status = 'cancelled'
        THEN coalesce(nullif(trim(coalesce(p_cancellation_reason, '')), ''), cancellation_reason, 'Cancelled by store')
      ELSE cancellation_reason
    END
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_update_order(UUID, TEXT, TEXT, TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 5. DELETE A REVIEW (moderation)
CREATE OR REPLACE FUNCTION public.admin_delete_review(p_review_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.product_reviews WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_delete_review(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_review(UUID) TO authenticated;
