import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import Stripe from "https://esm.sh/stripe@14.19.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'stripe-signature, content-type',
      },
    })
  }

  const signature = req.headers.get('Stripe-Signature')

  if (!signature) {
    return new Response('No signature provided', { status: 400 })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment secret')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      cryptoProvider
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Use Service Role to bypass RLS and perform authoritative order updates
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const paymentIntent = event.data?.object as Stripe.PaymentIntent | undefined
  const orderId = paymentIntent?.metadata?.order_id || null

  // 1. Concurrency-aware event deduplication via database RPC
  try {
    const { data: isNew, error: dedupError } = await supabaseAdmin.rpc('record_stripe_webhook_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_order_id: orderId,
    })

    if (!dedupError && isNew === false) {
      console.log(`Event ${event.id} already processed. Skipping duplicate safely.`)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }
  } catch (rpcErr) {
    console.warn('Idempotency table check skipped (migration pending):', rpcErr)
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        if (!paymentIntent || !orderId) {
          console.error('Payment succeeded but missing order_id in metadata')
          break
        }

        // Verify the order exists in database
        const { data: order, error: orderFetchError } = await supabaseAdmin
          .from('orders')
          .select('id, total_amount, payment_status')
          .eq('id', orderId)
          .single()

        if (orderFetchError || !order) {
          console.error(`Order ${orderId} not found in database`)
          break
        }

        const expectedAmountInPence = Math.round(Number(order.total_amount) * 100)
        if (paymentIntent.amount !== expectedAmountInPence || paymentIntent.currency !== 'gbp') {
          console.error(`Payment amount/currency mismatch for order ${orderId}: expected ${expectedAmountInPence} gbp, got ${paymentIntent.amount} ${paymentIntent.currency}`)
          break
        }

        // Mark as paid and processing atomically
        const { error: updateError } = await supabaseAdmin.rpc('update_order_payment_status', {
          p_order_id: orderId,
          p_payment_provider_id: paymentIntent.id,
          p_status: 'processing',
          p_payment_status: 'captured'
        })

        if (updateError) {
          console.error(`Failed to update order ${orderId} status:`, updateError)
          throw new Error('Database update failed') // Allows Stripe to retry
        }

        console.log(`Successfully verified and captured order ${orderId} via webhook`)
        break
      }

      case 'payment_intent.payment_failed': {
        if (!paymentIntent || !orderId) break

        // Prevent downgrading already captured orders if events arrive out of order
        const { data: currentOrder } = await supabaseAdmin
          .from('orders')
          .select('payment_status')
          .eq('id', orderId)
          .single()

        if (currentOrder && currentOrder.payment_status === 'captured') {
          console.log(`Order ${orderId} is already captured; ignoring delayed failure event`)
          break
        }

        await supabaseAdmin.rpc('update_order_payment_status', {
          p_order_id: orderId,
          p_payment_provider_id: paymentIntent.id,
          p_status: 'pending',
          p_payment_status: 'failed'
        })
        console.log(`Updated order ${orderId} as payment failed`)
        break
      }

      case 'payment_intent.canceled': {
        if (!paymentIntent || !orderId) break

        const { data: currentOrder } = await supabaseAdmin
          .from('orders')
          .select('payment_status')
          .eq('id', orderId)
          .single()

        if (currentOrder && currentOrder.payment_status === 'captured') {
          console.log(`Order ${orderId} is already captured; ignoring cancel event`)
          break
        }

        await supabaseAdmin.rpc('update_order_payment_status', {
          p_order_id: orderId,
          p_payment_provider_id: paymentIntent.id,
          p_status: 'cancelled',
          p_payment_status: 'failed'
        })
        console.log(`Updated order ${orderId} as cancelled`)
        break
      }

      default: {
        console.log(`Unhandled Stripe event type: ${event.type}`)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Error processing webhook event:', error)
    return new Response('Webhook processing failed', { status: 500 })
  }
})
