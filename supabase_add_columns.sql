ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_address JSONB,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS payment_provider_id TEXT;
