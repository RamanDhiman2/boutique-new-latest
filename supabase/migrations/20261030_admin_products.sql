-- ============================================================================
-- ADMIN PRODUCTS: MANAGE CATALOGUE, PRODUCT PHOTOS & CHECKOUT RULES
-- ============================================================================
-- Requires 20261029_admin_panel.sql (public.is_admin()).

-- 1. PRODUCTS & CATEGORIES: admins can see everything and write
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT INSERT, UPDATE ON public.products TO authenticated;

DROP POLICY IF EXISTS "Admins can view all categories" ON public.categories;
CREATE POLICY "Admins can view all categories"
  ON public.categories FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT INSERT, UPDATE ON public.categories TO authenticated;

-- 2. DELETE A PRODUCT (only if it was never ordered; otherwise hide it)
-- Deleting an ordered product would break order history and invoices.
CREATE OR REPLACE FUNCTION public.admin_delete_product(p_product_id TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.order_items WHERE product_id = p_product_id) THEN
    RAISE EXCEPTION 'This product has orders, so it cannot be deleted. Hide it instead.';
  END IF;

  DELETE FROM public.products WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_delete_product(TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(TEXT) TO authenticated;

-- 3. PRODUCT PHOTOS: public bucket, only admins can upload/change/delete
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

-- 4. CHECKOUT RULES FOLLOW THE ADMIN SETTINGS
-- Same function as before, except:
--   * hidden products (is_active = false) cannot be bought
--   * "sold out" is decided only by the is_sold_out switch in the admin panel
--     (no stock counting, and no hardcoded product id)
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
