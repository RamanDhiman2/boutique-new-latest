import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import Stripe from "https://esm.sh/stripe@14.19.0?target=deno"

// Admin-only server actions that need secret keys:
//   payment_details  { order_id }                       → Stripe payment summary
//   refund           { order_id, amount?, reason? }     → full or partial Stripe refund
//   set_blocked      { user_id, blocked }               → block / unblock a customer account
// Every request must come from a signed-in user listed in public.admin_users.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

  // 1. Caller must be a signed-in admin
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return json({ error: 'Unauthorized' }, 401)

  const { data: isAdmin, error: adminError } = await userClient.rpc('is_admin')
  if (adminError || isAdmin !== true) return json({ error: 'Admins only' }, 403)

  const admin = createClient(supabaseUrl, serviceKey)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const action = String(body.action ?? '')

  try {
    if (action === 'payment_details' || action === 'refund') {
      if (!stripeKey) return json({ error: 'Stripe is not configured' }, 500)
      const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() })

      const orderId = String(body.order_id ?? '')
      const { data: order, error: orderError } = await admin
        .from('orders')
        .select('id, total_amount, payment_status, payment_provider_id, refunded_amount')
        .eq('id', orderId)
        .single()
      if (orderError || !order) return json({ error: 'Order not found' }, 404)
      if (!order.payment_provider_id) return json({ error: 'This order has no Stripe payment' }, 400)

      const pi = await stripe.paymentIntents.retrieve(order.payment_provider_id, { expand: ['latest_charge'] })
      const charge = (typeof pi.latest_charge === 'object' ? pi.latest_charge : null) as Stripe.Charge | null

      if (action === 'payment_details') {
        const card = charge?.payment_method_details?.card
        return json({
          payment_intent_id: pi.id,
          status: pi.status,
          amount: pi.amount / 100,
          currency: pi.currency,
          created: new Date(pi.created * 1000).toISOString(),
          amount_refunded: (charge?.amount_refunded ?? 0) / 100,
          card_brand: card?.brand ?? null,
          card_last4: card?.last4 ?? null,
          wallet: card?.wallet?.type ?? null,
          receipt_url: charge?.receipt_url ?? null,
          disputed: charge?.disputed ?? false,
          dashboard_url: `https://dashboard.stripe.com/${pi.livemode ? '' : 'test/'}payments/${pi.id}`,
        })
      }

      // refund
      if (pi.status !== 'succeeded' || !charge) return json({ error: 'This payment was not completed, nothing to refund' }, 400)
      const remainingPence = charge.amount - charge.amount_refunded
      if (remainingPence <= 0) return json({ error: 'This payment is already fully refunded' }, 400)

      const requested = body.amount == null || body.amount === '' ? null : Number(body.amount)
      const amountPence = requested == null ? remainingPence : Math.round(requested * 100)
      if (!Number.isFinite(amountPence) || amountPence <= 0 || amountPence > remainingPence) {
        return json({ error: `Refund must be between £0.01 and £${(remainingPence / 100).toFixed(2)}` }, 400)
      }

      const reasons = ['requested_by_customer', 'duplicate', 'fraudulent'] as const
      const reason = reasons.includes(body.reason as typeof reasons[number]) ? (body.reason as typeof reasons[number]) : 'requested_by_customer'

      await stripe.refunds.create(
        { payment_intent: pi.id, amount: amountPence, reason, metadata: { order_id: order.id, refunded_by: userData.user.id } },
        { idempotencyKey: `refund_${order.id}_${charge.amount_refunded}_${amountPence}` },
      )

      // Record now; the charge.refunded webhook will confirm the same totals
      const refundedTotalPence = charge.amount_refunded + amountPence
      const fullyRefunded = refundedTotalPence >= charge.amount
      await admin
        .from('orders')
        .update({
          refunded_amount: refundedTotalPence / 100,
          refunded_at: new Date().toISOString(),
          ...(fullyRefunded ? { payment_status: 'refunded' } : {}),
        })
        .eq('id', order.id)

      return json({ ok: true, refunded_amount: refundedTotalPence / 100, fully_refunded: fullyRefunded })
    }

    if (action === 'set_blocked') {
      const userId = String(body.user_id ?? '')
      const blocked = body.blocked === true
      if (!userId) return json({ error: 'Missing customer' }, 400)
      if (userId === userData.user.id) return json({ error: 'You cannot block your own account' }, 400)

      const { data: target } = await admin.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
      if (target) return json({ error: 'Admin accounts cannot be blocked here' }, 400)

      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: blocked ? '876000h' : 'none' })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, blocked })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    console.error(`admin-actions ${action} failed:`, err)
    const message = err instanceof Stripe.errors.StripeError ? err.message : 'Action failed'
    return json({ error: message }, 500)
  }
})
