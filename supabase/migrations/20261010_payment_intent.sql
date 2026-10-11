-- ============================================================================
-- STRIPE INTEGRATION MIGRATION (Idempotent Orders)
-- ============================================================================

-- 1. Support Idempotency keys on orders to prevent duplicate charges/orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- 2. Update RPC to accept idempotency key and set initial status to 'pending_payment'
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
  v_address_snapshot JSONB;
BEGIN
  -- Strict validation
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Idempotency Check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_order_id FROM public.orders 
    WHERE idempotency_key = p_idempotency_key AND user_id = v_user_id;
    
    IF v_order_id IS NOT NULL THEN
      RETURN v_order_id; -- Return existing order if duplicate request
    END IF;
  END IF;

  -- Address Ownership
  SELECT row_to_json(a) INTO v_address_snapshot
  FROM public.addresses a
  WHERE a.id = p_address_id AND a.user_id = v_user_id;

  IF v_address_snapshot IS NULL THEN
    RAISE EXCEPTION 'Invalid or unauthorized address';
  END IF;

  -- True authoritative total
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, size TEXT, quantity INT) LOOP
    SELECT price INTO v_product_price FROM public.products WHERE id = v_item.product_id;
    
    IF v_product_price IS NULL THEN
      RAISE EXCEPTION 'Invalid product ID: %', v_item.product_id;
    END IF;

    IF v_item.quantity < 1 OR v_item.quantity > 100 THEN
      RAISE EXCEPTION 'Invalid quantity for product: %', v_item.product_id;
    END IF;

    v_total_amount := v_total_amount + (v_product_price * v_item.quantity);
  END LOOP;

  -- Insert Order atomically (Status changed to 'pending' as payment is not yet confirmed)
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

-- 3. Webhook Helper RPC to safely mark order as paid
CREATE OR REPLACE FUNCTION public.update_order_payment_status(
  p_order_id UUID,
  p_payment_provider_id TEXT,
  p_status TEXT,
  p_payment_status TEXT
) RETURNS VOID AS $$
BEGIN
  -- We don't check auth.uid() here because this is called by the secure webhook edge function using Service Role key
  UPDATE public.orders 
  SET 
    payment_provider_id = p_payment_provider_id,
    payment_status = p_payment_status,
    status = p_status
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Secure the webhook helper (only Service Role can execute)
REVOKE EXECUTE ON FUNCTION public.update_order_payment_status(UUID, TEXT, TEXT, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_order_payment_status(UUID, TEXT, TEXT, TEXT) FROM authenticated;
