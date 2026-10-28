-- ============================================================================
-- MAINTENANCE MODE & DATA EXPORT
-- ============================================================================
-- Requires 20261031_admin_complete.sql (site_settings, is_admin()).

-- 1. MAINTENANCE MODE SETTINGS (public read via the existing site_settings policy)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS maintenance_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_until TIMESTAMPTZ;

-- 2. CHECKOUT REFUSES NEW ORDERS WHILE MAINTENANCE IS ON
-- Same as 20261030_admin_products.sql plus the maintenance check.
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_address_id UUID,
  p_items JSONB,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order_id UUID;
  v_total_amount NUMERIC := 0;
  v_item RECORD;
  v_product_price NUMERIC;
  v_product_name TEXT;
  v_is_sold_out BOOLEAN;
  v_is_active BOOLEAN;
  v_address_snapshot JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Maintenance mode (Admin -> Settings): no new orders while the shop is closed
  IF EXISTS (SELECT 1 FROM public.site_settings WHERE id = 1 AND maintenance_enabled) THEN
    RAISE EXCEPTION 'The shop is temporarily closed for maintenance. Please try again soon.';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_order_id FROM public.orders
    WHERE idempotency_key = p_idempotency_key AND user_id = v_user_id;

    IF v_order_id IS NOT NULL THEN
      RETURN v_order_id;
    END IF;
  END IF;

  SELECT row_to_json(a) INTO v_address_snapshot
  FROM public.addresses a
  WHERE a.id = p_address_id AND a.user_id = v_user_id;

  IF v_address_snapshot IS NULL THEN
    RAISE EXCEPTION 'Invalid or unauthorized address';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, size TEXT, quantity INT) LOOP
    v_product_price := NULL;
    SELECT name, price, is_sold_out, coalesce(is_active, true)
    INTO v_product_name, v_product_price, v_is_sold_out, v_is_active
    FROM public.products
    WHERE id = v_item.product_id;

    IF v_product_price IS NULL OR v_is_active = false THEN
      RAISE EXCEPTION 'Product "%" is not available', COALESCE(v_product_name, v_item.product_id);
    END IF;

    IF v_is_sold_out = true THEN
      RAISE EXCEPTION 'Product "%" is sold out and cannot be ordered', COALESCE(v_product_name, v_item.product_id);
    END IF;

    IF v_item.quantity IS NULL OR v_item.quantity < 1 OR v_item.quantity > 100 THEN
      RAISE EXCEPTION 'Invalid quantity for product: %', v_item.product_id;
    END IF;

    v_total_amount := v_total_amount + (v_product_price * v_item.quantity);
  END LOOP;

  INSERT INTO public.orders (user_id, status, total_amount, address_id, shipping_address, payment_status, idempotency_key)
  VALUES (v_user_id, 'pending', v_total_amount, p_address_id, v_address_snapshot, 'unpaid', p_idempotency_key)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, size TEXT, quantity INT) LOOP
    SELECT price INTO v_product_price FROM public.products WHERE id = v_item.product_id;
    INSERT INTO public.order_items (order_id, product_id, size, quantity, price)
    VALUES (v_order_id, v_item.product_id, v_item.size, v_item.quantity, v_product_price);
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.create_order_secure(UUID, JSONB, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_order_secure(UUID, JSONB, TEXT) TO authenticated;


-- 3. EXPORT: saved addresses of all customers (admin only)
CREATE OR REPLACE FUNCTION public.admin_export_addresses()
RETURNS JSONB AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(a) || jsonb_build_object('customer_email', u.email) ORDER BY a.user_id)
    FROM public.addresses a
    LEFT JOIN auth.users u ON u.id = a.user_id
  ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_export_addresses() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_export_addresses() TO authenticated;
