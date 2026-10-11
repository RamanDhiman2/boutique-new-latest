-- ============================================================================
-- MIGRATION: 20261011_enhance_address_schema.sql
-- Description: Enhances addresses table with default address flag and apartment/landmark
-- Compatible with all existing addresses and orders. Zero destructive operations.
-- ============================================================================

-- 1. ADD COLUMNS (IF NOT EXISTS)
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS apartment TEXT;

-- 2. CREATE FUNCTION & TRIGGER TO MAINTAIN AT MOST ONE DEFAULT ADDRESS PER USER
CREATE OR REPLACE FUNCTION public.handle_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.addresses
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id;
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

-- 3. VERIFY AND ENFORCE RLS POLICIES FOR OWNERSHIP PROTECTION
-- Ensure users cannot transfer address ownership to another user on UPDATE
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
CREATE POLICY "Users can update their own addresses" ON public.addresses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Optional RPC to safely set default address atomically
CREATE OR REPLACE FUNCTION public.set_default_address(p_address_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure ownership
  IF NOT EXISTS (SELECT 1 FROM public.addresses WHERE id = p_address_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Address not found or unauthorized';
  END IF;

  UPDATE public.addresses
  SET is_default = (id = p_address_id)
  WHERE user_id = v_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
