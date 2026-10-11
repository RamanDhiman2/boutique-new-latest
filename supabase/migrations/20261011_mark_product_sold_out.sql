-- ============================================================================
-- MARK PRODUCT SOLD OUT & ENFORCE BACKEND INVENTORY GUARDS
-- ============================================================================

-- 1. Ensure inventory tracking columns exist on products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN NOT NULL DEFAULT false;

-- 2. Mark 'Elegant Yellow & Cream Suit' as SOLD OUT with 0 stock
UPDATE public.products
SET
  is_sold_out = true,
  stock = 0
WHERE id = 'elegant-yellow-cream-suit';

-- 3. Enhance create_order_secure RPC to reject sold-out or zero-stock products
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
  v_stock INT;
  v_address_snapshot JSONB;
BEGIN
  -- Strict authentication check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Idempotency Check: return existing order if same key was used
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_order_id FROM public.orders 
    WHERE idempotency_key = p_idempotency_key AND user_id = v_user_id;
    
    IF v_order_id IS NOT NULL THEN
      RETURN v_order_id;
    END IF;
  END IF;

  -- Address Ownership check
  SELECT row_to_json(a) INTO v_address_snapshot
  FROM public.addresses a
  WHERE a.id = p_address_id AND a.user_id = v_user_id;

  IF v_address_snapshot IS NULL THEN
    RAISE EXCEPTION 'Invalid or unauthorized address';
  END IF;

  -- Authoritative inventory and price validation
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, size TEXT, quantity INT) LOOP
    SELECT name, price, is_sold_out, stock 
    INTO v_product_name, v_product_price, v_is_sold_out, v_stock 
    FROM public.products 
    WHERE id = v_item.product_id;
    
    IF v_product_price IS NULL THEN
      RAISE EXCEPTION 'Invalid product ID: %', v_item.product_id;
    END IF;

    -- Strict Sold Out Guard
    IF v_is_sold_out = true OR (v_stock IS NOT NULL AND v_stock <= 0) OR v_item.product_id = 'elegant-yellow-cream-suit' THEN
      RAISE EXCEPTION 'Product "%" is sold out and cannot be ordered', COALESCE(v_product_name, v_item.product_id);
    END IF;

    IF v_item.quantity < 1 OR v_item.quantity > 100 THEN
      RAISE EXCEPTION 'Invalid quantity for product: %', v_item.product_id;
    END IF;

    v_total_amount := v_total_amount + (v_product_price * v_item.quantity);
  END LOOP;

  -- Insert Order atomically (Initial status 'pending' awaiting Stripe payment confirmation)
  INSERT INTO public.orders (user_id, status, total_amount, address_id, shipping_address, payment_status, idempotency_key)
  VALUES (v_user_id, 'pending', v_total_amount, p_address_id, v_address_snapshot, 'unpaid', p_idempotency_key)
  RETURNING id INTO v_order_id;

  -- Insert Order Items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, size TEXT, quantity INT) LOOP
    SELECT price INTO v_product_price FROM public.products WHERE id = v_item.product_id;
    INSERT INTO public.order_items (order_id, product_id, size, quantity, price)
    VALUES (v_order_id, v_item.product_id, v_item.size, v_item.quantity, v_product_price);
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.create_order_secure(UUID, JSONB, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.create_order_secure(UUID, JSONB, TEXT) TO authenticated;
