import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import Stripe from "https://esm.sh/stripe@14.19.0?target=deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Malformed Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Payment gateway configuration error: STRIPE_SECRET_KEY missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 1. Authenticate user using their bearer token
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired session' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 2. Parse and validate request body
    const body = await req.json().catch(() => null)
    if (!body || !body.address_id || !Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request: address_id and items are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { address_id, items, idempotency_key } = body

    // Validate item structure and quantity bounds
    for (const item of items) {
      if (!item.product_id || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 100) {
        return new Response(JSON.stringify({ error: `Invalid item format or quantity for product ${item.product_id || 'unknown'}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // 3. Create or reuse order via RPC
    // Pass a guaranteed non-empty string for idempotency key to prevent PostgREST overload ambiguity
    const safeIdempotencyKey = idempotency_key || `ord_${crypto.randomUUID()}`
    const { data: orderId, error: orderError } = await supabaseUserClient.rpc('create_order_secure', {
      p_address_id: address_id,
      p_items: items,
      p_idempotency_key: safeIdempotencyKey,
    })

    if (orderError || !orderId) {
      console.error('Order creation failed:', orderError)
      return new Response(JSON.stringify({ error: orderError?.message || 'Failed to create order' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 4. Fetch the authoritative total_amount from the created order
    const { data: orderData, error: fetchError } = await supabaseUserClient
      .from('orders')
      .select('id, total_amount, payment_status, payment_provider_id')
      .eq('id', orderId)
      .single()

    if (fetchError || !orderData) {
      return new Response(JSON.stringify({ error: 'Failed to retrieve authoritative order amount' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const totalAmount = Number(orderData.total_amount)
    if (totalAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid order total' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const amountInPence = Math.round(totalAmount * 100)

    const verifiedEmail = (user.email || user.user_metadata?.email || '').trim() || undefined

    // 5. Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // If order was reused and already linked to a payable PaymentIntent, reuse it
    if (orderData.payment_provider_id) {
      try {
        const existingPi = await stripe.paymentIntents.retrieve(orderData.payment_provider_id)
        if (
          (existingPi.status === 'requires_payment_method' ||
            existingPi.status === 'requires_confirmation' ||
            existingPi.status === 'requires_action') &&
          existingPi.amount === amountInPence
        ) {
          // If the reused PaymentIntent is missing receipt_email or has an outdated email, safely update it
          if (verifiedEmail && existingPi.receipt_email !== verifiedEmail) {
            try {
              await stripe.paymentIntents.update(existingPi.id, {
                receipt_email: verifiedEmail,
                metadata: {
                  ...existingPi.metadata,
                  order_id: String(orderId),
                  user_id: user.id,
                  customer_email: verifiedEmail,
                },
              })
            } catch (updateErr) {
              console.warn('Could not update receipt_email on existing PaymentIntent:', updateErr)
            }
          }

          return new Response(JSON.stringify({
            clientSecret: existingPi.client_secret,
            orderId: orderId,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        }
      } catch (err) {
        console.warn('Could not retrieve existing PaymentIntent, creating fresh one:', err)
      }
    }

    // 6. Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      receipt_email: verifiedEmail,
      metadata: {
        order_id: String(orderId),
        user_id: user.id,
        customer_email: verifiedEmail || '',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    }, {
      idempotencyKey: `pi_${orderId}`,
    })

    // 7. Associate PaymentIntent ID to the order via service role client
    if (supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      await supabaseAdmin
        .from('orders')
        .update({ payment_provider_id: paymentIntent.id })
        .eq('id', orderId)
    }

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      orderId: orderId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Unexpected error in create-payment-intent:', error)
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
