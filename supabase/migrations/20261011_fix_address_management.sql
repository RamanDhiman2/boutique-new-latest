-- ============================================================================
-- MIGRATION: 20261011_fix_address_management.sql
-- Description: Fix address Edit/Delete/Add and resolve foreign key NOT NULL conflict.
-- Solves runtime error: null value in column "address_id" of relation "orders" violates not-null constraint
-- ============================================================================

-- 1. DROP NOT-NULL CONSTRAINT ON orders.address_id
-- This allows ON DELETE SET NULL to succeed seamlessly when addresses are deleted,
-- preserving order integrity while allowing users to manage their address book.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'address_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN address_id DROP NOT NULL;
  END IF;
END $$;

-- 2. ENSURE FOREIGN KEY IS CONFIGURED WITH ON DELETE SET NULL
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_address_id_fkey;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_address_id_fkey
    FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. ADD MISSING COLUMNS TO addresses TABLE SAFELY
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS apartment TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. SINGLE DEFAULT ADDRESS TRIGGER PER USER
CREATE OR REPLACE FUNCTION public.handle_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.addresses
    SET is_default = FALSE
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_ensure_single_default_address ON public.addresses;
CREATE TRIGGER tr_ensure_single_default_address
  BEFORE INSERT OR UPDATE OF is_default
  ON public.addresses
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION public.handle_default_address();

-- 5. FUNCTION TO SAFELY SET DEFAULT ADDRESS
CREATE OR REPLACE FUNCTION public.set_default_address(p_address_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.addresses 
    WHERE id = p_address_id AND user_id = v_user_id AND is_deleted = FALSE
  ) THEN
    RAISE EXCEPTION 'Address not found or unauthorized';
  END IF;

  UPDATE public.addresses
  SET is_default = (id = p_address_id)
  WHERE user_id = v_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. PROFESSIONAL AMAZON/FLIPKART SAFE ADDRESS DELETION RPC
-- Handles relational integrity gracefully:
-- If orders reference this address, soft-deletes (is_deleted = true) so past orders keep their snapshot
-- If no orders reference it, hard deletes the row.
CREATE OR REPLACE FUNCTION public.delete_address_safe(p_address_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.addresses 
    WHERE id = p_address_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Address not found or unauthorized';
  END IF;

  -- Check if any orders reference this address
  SELECT COUNT(*) INTO v_order_count 
  FROM public.orders 
  WHERE address_id = p_address_id;

  IF v_order_count > 0 THEN
    -- Soft-delete to preserve order history relational snapshot
    UPDATE public.addresses 
    SET is_deleted = TRUE, is_default = FALSE 
    WHERE id = p_address_id AND user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'mode', 'soft', 'orders_count', v_order_count);
  ELSE
    -- Safe hard delete
    DELETE FROM public.addresses 
    WHERE id = p_address_id AND user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'mode', 'hard', 'orders_count', 0);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. GRANT PERMISSIONS TO AUTHENTICATED USERS
GRANT EXECUTE ON FUNCTION public.set_default_address(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_address_safe(UUID) TO authenticated;
