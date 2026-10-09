-- ============================================================================
-- FINALIZED E-COMMERCE SECURITY MIGRATION
-- ============================================================================

-- 1. ADDRESS UPDATE SECURITY
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
CREATE POLICY "Users can update their own addresses" ON public.addresses 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. ADDRESS FOREIGN KEY SAFETY & IMMUTABLE SNAPSHOTS
-- Safely update constraint to protect historical orders if an address is deleted.
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_address_id_fkey,
  ADD CONSTRAINT orders_address_id_fkey 
  FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;

-- Snapshot field to freeze shipping info
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- 3. PAYMENT ARCHITECTURE ENHANCEMENTS
-- Add payment tracking fields without granting UPDATE access to clients.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider_id TEXT;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS valid_payment_status;
ALTER TABLE public.orders ADD CONSTRAINT valid_payment_status 
  CHECK (payment_status IN ('unpaid', 'authorized', 'captured', 'refunded', 'failed'));

-- 4. SECURE CHECKOUT RPC (CREATE ORDER)
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_address_id UUID,
  p_items JSONB
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

  -- Insert Order atomically (Status changed to 'processing' to match existing UI convention)
  INSERT INTO public.orders (user_id, status, total_amount, address_id, shipping_address, payment_status)
  VALUES (v_user_id, 'processing', v_total_amount, p_address_id, v_address_snapshot, 'unpaid')
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

REVOKE EXECUTE ON FUNCTION public.create_order_secure(UUID, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.create_order_secure(UUID, JSONB) TO authenticated;

-- 5. CANCEL ORDER RPC
CREATE OR REPLACE FUNCTION public.cancel_order_secure(order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Row locking
  SELECT user_id, status, created_at 
  INTO v_user_id, v_status, v_created_at
  FROM public.orders 
  WHERE id = order_id FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Order cannot be cancelled in its current state: %', v_status;
  END IF;

  IF NOW() > v_created_at + INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Cannot cancel after 24 hours';
  END IF;

  UPDATE public.orders SET status = 'cancelled' WHERE id = order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.cancel_order_secure(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_order_secure(UUID) TO authenticated;

-- 6. LOCK DOWN INSERTS
-- Remove broad client INSERT capabilities, forcing checkout through the secure RPC
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;
