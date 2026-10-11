-- ============================================================================
-- ENHANCE ORDER HISTORY & CUSTOMER FULFILLMENT MANAGEMENT
-- ============================================================================

-- 1. Non-destructively add tracking and customer lifecycle columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Enhanced Customer Cancellation RPC with Reason
CREATE OR REPLACE FUNCTION public.cancel_order_with_reason(
  order_id UUID,
  p_reason TEXT DEFAULT 'Cancelled by customer'
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_status TEXT;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Authenticated user check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Row locking and ownership verification
  SELECT status, created_at 
  INTO v_status, v_created_at
  FROM public.orders 
  WHERE id = order_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Order not found or unauthorized';
  END IF;

  -- Only permit cancellation before order is shipped or completed
  IF v_status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Cannot cancel order with status: %', v_status;
  END IF;

  -- Atomically cancel order and store audit reason
  UPDATE public.orders 
  SET 
    status = 'cancelled',
    cancellation_reason = COALESCE(p_reason, 'Cancelled by customer')
  WHERE id = order_id AND user_id = v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.cancel_order_with_reason(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_reason(UUID, TEXT) TO authenticated;
