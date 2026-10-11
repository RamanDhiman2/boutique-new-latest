-- ============================================================================
-- STRIPE WEBHOOK IDEMPOTENCY & OVERLOAD RESOLUTION MIGRATION
-- ============================================================================

-- 1. Remove ambiguous 2-parameter overload of create_order_secure
-- Ensures PostgREST unambiguously resolves calls to create_order_secure(uuid, jsonb, text)
DROP FUNCTION IF EXISTS public.create_order_secure(UUID, JSONB);

-- 2. Webhook Event Ledger for Concurrency-Safe Deduplication
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Service Role bypasses RLS; clients cannot query or modify webhook events)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- 3. Atomic Event Recording RPC (Concurrency Safe via ON CONFLICT)
CREATE OR REPLACE FUNCTION public.record_stripe_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_order_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.stripe_webhook_events (id, event_type, order_id)
  VALUES (p_event_id, p_event_type, p_order_id)
  ON CONFLICT (id) DO NOTHING;
  
  -- Returns TRUE if event was newly inserted, FALSE if it was already processed
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Restrict execution to Service Role only
REVOKE EXECUTE ON FUNCTION public.record_stripe_webhook_event(TEXT, TEXT, UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.record_stripe_webhook_event(TEXT, TEXT, UUID) FROM authenticated;

-- 4. Strengthen update_order_payment_status to protect against out-of-order event downgrades
CREATE OR REPLACE FUNCTION public.update_order_payment_status(
  p_order_id UUID,
  p_payment_provider_id TEXT,
  p_status TEXT,
  p_payment_status TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.orders 
  SET 
    payment_provider_id = COALESCE(p_payment_provider_id, payment_provider_id),
    payment_status = p_payment_status,
    status = p_status
  WHERE id = p_order_id
    AND NOT (payment_status = 'captured' AND p_payment_status IN ('unpaid', 'failed'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.update_order_payment_status(UUID, TEXT, TEXT, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_order_payment_status(UUID, TEXT, TEXT, TEXT) FROM authenticated;
