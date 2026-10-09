-- ==========================================
-- BOUTIQUE E-COMMERCE SUPABASE COMPLETE SCHEMA
-- ==========================================

-- 1. ADDRESSES TABLE (For Checkout and User Profile)
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT DEFAULT 'Shipping',
    full_name TEXT NOT NULL,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    country TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for Addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
CREATE POLICY "Users can view their own addresses" 
    ON public.addresses FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
CREATE POLICY "Users can insert their own addresses" 
    ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
CREATE POLICY "Users can update their own addresses" 
    ON public.addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;
CREATE POLICY "Users can delete their own addresses" 
    ON public.addresses FOR DELETE USING (auth.uid() = user_id);


-- 2. PRODUCTS TABLE (Optional, but recommended if you are dynamically loading products from DB)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    stock INT DEFAULT 100
);


-- 3. ORDERS TABLE (For Checkout, Payments, and Order History)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    address_id UUID,
    shipping_address JSONB,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'processing',
    payment_status TEXT DEFAULT 'unpaid',
    payment_provider_id TEXT, 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fix the foreign key for addresses safely
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_address_id_fkey;
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_address_id_fkey 
  FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;

-- Enable Row Level Security (RLS) for Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" 
    ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INT NOT NULL,
    price NUMERIC NOT NULL
);

-- Enable Row Level Security (RLS) for Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" 
    ON public.order_items FOR SELECT USING (
        order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    );


-- ==========================================
-- SECURE FUNCTIONS (RPC)
-- ==========================================

-- 5. SECURE CHECKOUT RPC (CREATE ORDER)
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  SELECT row_to_json(a) INTO v_address_snapshot
  FROM public.addresses a
  WHERE a.id = p_address_id AND a.user_id = v_user_id;

  IF v_address_snapshot IS NULL THEN
    RAISE EXCEPTION 'Invalid or unauthorized address';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, size TEXT, quantity INT, price NUMERIC) LOOP
    v_total_amount := v_total_amount + (v_item.price * v_item.quantity);
  END LOOP;

  INSERT INTO public.orders (user_id, status, total_amount, address_id, shipping_address, payment_status)
  VALUES (v_user_id, 'processing', v_total_amount, p_address_id, v_address_snapshot, 'unpaid')
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, size TEXT, quantity INT, price NUMERIC) LOOP
    INSERT INTO public.order_items (order_id, product_id, size, quantity, price)
    VALUES (v_order_id, v_item.product_id, v_item.size, v_item.quantity, v_item.price);
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.create_order_secure(UUID, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.create_order_secure(UUID, JSONB) TO authenticated;


-- 6. SECURE CANCEL ORDER RPC
CREATE OR REPLACE FUNCTION public.cancel_order_secure(order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_created_at TIMESTAMPTZ;
BEGIN
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
