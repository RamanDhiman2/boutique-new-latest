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

        const wasAlreadyCaptured = order.payment_status === 'captured'
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

        // Notify the store owner from the server, only on the first capture of this order
        if (!wasAlreadyCaptured) {
          try {
            await sendOrderNotification(supabaseAdmin, orderId)
          } catch (emailErr: any) {
            // Never fail the webhook because of email problems
            console.error(`Order ${orderId} captured but owner notification failed:`, emailErr?.message || emailErr)
          }
        }
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

    // Forget this event so Stripe's retry is processed instead of skipped as a duplicate
    const { error: forgetError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .delete()
      .eq('id', event.id)
    if (forgetError) {
      console.error(`Failed to clear dedup record for event ${event.id}:`, forgetError)
    }

    return new Response('Webhook processing failed', { status: 500 })
  }
})

/**
 * Emails the store owner the details of a newly captured order via the EmailJS REST API.
 * Runs server-side so order notifications cannot be forged from the browser.
 * Requires EMAILJS_SERVICE_ID, EMAILJS_ORDER_TEMPLATE_ID, EMAILJS_PUBLIC_KEY and
 * EMAILJS_PRIVATE_KEY secrets, and "Allow EmailJS API for non-browser applications"
 * enabled in the EmailJS dashboard.
 */
async function sendOrderNotification(supabaseAdmin: any, orderId: string) {
  const serviceId = Deno.env.get('EMAILJS_SERVICE_ID') ?? ''
  const templateId = Deno.env.get('EMAILJS_ORDER_TEMPLATE_ID') ?? ''
  const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY') ?? ''
  const privateKey = Deno.env.get('EMAILJS_PRIVATE_KEY') ?? ''

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.warn('EmailJS secrets not configured; skipping order notification email')
    return
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, status, total_amount, shipping_address, created_at, order_items(product_id, size, quantity, price)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    throw new Error(`Order ${orderId} not found for notification`)
  }

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id)
  const user = userData?.user
  const meta = (user?.user_metadata ?? {}) as Record<string, any>
  const shipping = (order.shipping_address ?? {}) as Record<string, any>
  const items = Array.isArray(order.order_items) ? order.order_items : []

  const customerName = meta.full_name || meta.name || shipping.full_name || 'Customer'
  const customerEmail = user?.email || shipping.email || ''
  const customerPhone = user?.phone || meta.phone || shipping.phone || ''
  const total = Number(order.total_amount) || 0
  const shippingAddress = [
    shipping.street,
    shipping.apartment,
    `${shipping.city ?? ''}, ${shipping.state ?? ''} ${shipping.zip ?? ''}`.trim(),
    shipping.country || 'United Kingdom',
  ].filter(Boolean).join(', ')
  const itemsText = items
    .map((it: any, i: number) =>
      `  ${i + 1}. ${it.product_id} — Size: ${it.size || 'Standard'} — Qty: ${it.quantity} — £${(Number(it.price) * Number(it.quantity)).toFixed(2)}`)
    .join('\n')
  const orderDate = new Date(order.created_at || Date.now()).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

  const message = [
    `NEW PAID ORDER — #${order.id}`,
    `Date: ${orderDate}`,
    `Payment: captured via Stripe (GBP)`,
    `Total charged: £${total.toFixed(2)}`,
    ``,
    `Customer: ${customerName}`,
    `Email: ${customerEmail || 'Not provided'}`,
    `Phone: ${customerPhone || 'Not provided'}`,
    ``,
    `Ship to: ${shipping.full_name || customerName}`,
    `Phone: ${shipping.phone || customerPhone || 'Not provided'}`,
    `Address: ${shippingAddress}`,
    ``,
    `Items (${items.length}):`,
    itemsText,
  ].join('\n')

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        name: customerName,
        email: customerEmail,
        reply_to: customerEmail,
        subject: `New Paid Order — Order #${order.id.slice(0, 8)}`,
        message,
        order_id: order.id,
        order_date: orderDate,
        order_status: order.status || 'processing',
        payment_status: 'captured',
        payment_method: 'Stripe Online Payment (Card)',
        order_total: `£${total.toFixed(2)}`,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_name: shipping.full_name || customerName,
        shipping_phone: shipping.phone || '',
        shipping_address: shippingAddress,
        items_count: String(items.length),
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`EmailJS responded ${res.status}: ${await res.text()}`)
  }
}
