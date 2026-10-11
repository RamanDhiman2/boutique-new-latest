import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function processPaymentIntentCreation({
  authHeader,
  address_id,
  items,
  idempotency_key,
  env,
}: {
  authHeader?: string | null;
  address_id: string;
  items: Array<{ product_id: string; size: string; quantity: number; price?: number }>;
  idempotency_key?: string;
  env: {
    STRIPE_SECRET_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}) {
  const stripeSecretKey = env["STRIPE_SECRET_KEY"] || process.env["STRIPE_SECRET_KEY"];
  const supabaseUrl = env["VITE_SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const supabaseAnonKey = env["VITE_SUPABASE_ANON_KEY"] || process.env["VITE_SUPABASE_ANON_KEY"];

  if (!stripeSecretKey) {
    throw new Error("Stripe secret key is not configured on the server");
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase credentials are not configured");
  }

  if (!authHeader) {
    throw new Error("Unauthorized: Please sign in to checkout");
  }

  // 1. Authenticate user with their Supabase token
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Invalid session");
  }

  if (!address_id || !items || items.length === 0) {
    throw new Error("Invalid request: Missing delivery address or items");
  }

  // 2. Format items for RPC
  const cleanItems = items.map((i) => ({
    product_id: i.product_id,
    size: i.size,
    quantity: i.quantity,
  }));

  // 3. Robust Idempotent Order Handling
  // Check if an unpaid order already exists with this idempotency key in its shipping_address snapshot or metadata
  let orderId: string | null = null;
  let orderTotal: number = 0;
  let existingPaymentIntentId: string | null = null;

  // 1. Authoritative price lookup from products catalog
  const productIds = cleanItems.map((it) => it.product_id);
  const { data: dbProducts } = await supabaseClient
    .from("products")
    .select("id, name, price, stock, is_sold_out")
    .in("id", productIds);

  let calculatedTotal = 0;
  for (const it of cleanItems) {
    const prod = dbProducts?.find((p) => p.id === it.product_id);
    
    const isSoldOut =
      prod?.is_sold_out === true ||
      (prod?.stock !== null && prod?.stock !== undefined && Number(prod.stock) <= 0) ||
      it.product_id === "elegant-yellow-cream-suit";

    if (isSoldOut) {
      throw new Error(`Product "${prod?.name || it.product_id}" is currently sold out and cannot be purchased`);
    }

    const itemPrice =
      prod?.price != null
        ? Number(prod.price)
        : Number(items.find((i) => i.product_id === it.product_id)?.price || 0);
    calculatedTotal += itemPrice * it.quantity;
  }

  if (calculatedTotal <= 0) {
    throw new Error("Invalid order total");
  }

  // 2. Address Ownership Verification
  const { data: addrData } = await supabaseClient
    .from("addresses")
    .select("*")
    .eq("id", address_id)
    .eq("user_id", user.id)
    .single();

  if (!addrData) {
    throw new Error("Invalid or unauthorized address");
  }

  // Check if user already has an unpaid order associated with this exact idempotency key
  if (idempotency_key) {
    const { data: existingOrders } = await supabaseClient
      .from("orders")
      .select("id, total_amount, payment_status, payment_provider_id, shipping_address")
      .eq("user_id", user.id)
      .eq("payment_status", "unpaid")
      .order("created_at", { ascending: false })
      .limit(5);

    const match = existingOrders?.find(
      (o) => (o.shipping_address as any)?.idempotency_key === idempotency_key
    );

    if (match) {
      // If the cart total and address match the existing order, reuse it!
      if (Number(match.total_amount) === calculatedTotal) {
        orderId = match.id;
        orderTotal = Number(match.total_amount);
        existingPaymentIntentId = match.payment_provider_id || null;
      }
      // If cart or address changed, the previous order with this key is obsolete.
      // A new order will be created below with the authoritative calculated total.
    }
  }

  // 4. Initialize Stripe and create or retrieve PaymentIntent
  const stripe = new Stripe(stripeSecretKey);
  const amountInPence = Math.round(Number(calculatedTotal) * 100);

  // If order was reused and already has an active PaymentIntent, check if we can retrieve and return it
  if (existingPaymentIntentId) {
    try {
      const existingPi = await stripe.paymentIntents.retrieve(existingPaymentIntentId);
      if (
        existingPi.status === "requires_payment_method" ||
        existingPi.status === "requires_confirmation" ||
        existingPi.status === "requires_action"
      ) {
        if (existingPi.amount === amountInPence) {
          return {
            clientSecret: existingPi.client_secret,
            orderId: orderId!,
          };
        }
      }
    } catch {
      // If retrieval fails or status expired, proceed to create a fresh one below
    }
  }

  // Generate a unique Stripe idempotency key for this checkout calculation
  const stripeIdempotencyKey = idempotency_key
    ? `pi_${user.id.substring(0, 8)}_${calculatedTotal}_${idempotency_key}`
    : undefined;

  const createParams: Stripe.PaymentIntentCreateParams = {
    amount: amountInPence,
    currency: "gbp",
    metadata: {
      user_id: user.id,
      address_id: address_id,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  };

  if (user.email) {
    createParams.receipt_email = user.email;
  }

  const paymentIntent = await stripe.paymentIntents.create(
    createParams,
    stripeIdempotencyKey ? { idempotencyKey: stripeIdempotencyKey } : undefined
  );

  // If no matching order was found, create or link order record to this payment_provider_id
  if (!orderId) {
    // Check if another concurrent request already created an order for this payment_provider_id
    const { data: existingByPi } = await supabaseClient
      .from("orders")
      .select("id, total_amount")
      .eq("payment_provider_id", paymentIntent.id)
      .maybeSingle();

    if (existingByPi) {
      orderId = existingByPi.id;
      orderTotal = Number(existingByPi.total_amount);
    } else {
      // Also check if an order with this idempotency key was just created concurrently
      let concurrentOrder: { id: string; total_amount: number } | null = null;
      if (idempotency_key) {
        const { data: recentOrders } = await supabaseClient
          .from("orders")
          .select("id, total_amount, shipping_address")
          .eq("user_id", user.id)
          .eq("payment_status", "unpaid")
          .order("created_at", { ascending: false })
          .limit(5);

        const found = recentOrders?.find(
          (o) => (o.shipping_address as any)?.idempotency_key === idempotency_key
        );
        if (found && Number(found.total_amount) === calculatedTotal) {
          concurrentOrder = { id: found.id, total_amount: Number(found.total_amount) };
        }
      }

      if (concurrentOrder) {
        orderId = concurrentOrder.id;
        orderTotal = concurrentOrder.total_amount;
        // Associate PI to existing order
        await supabaseClient
          .from("orders")
          .update({ payment_provider_id: paymentIntent.id })
          .eq("id", orderId);
      } else {
        orderTotal = calculatedTotal;
        const shippingSnapshot = {
          ...addrData,
          idempotency_key: idempotency_key || null,
        };

        const { data: newOrder, error: insErr } = await supabaseClient
          .from("orders")
          .insert({
            user_id: user.id,
            status: "processing",
            total_amount: orderTotal,
            address_id: address_id,
            shipping_address: shippingSnapshot,
            payment_status: "unpaid",
            payment_provider_id: paymentIntent.id,
          })
          .select("id, total_amount")
          .single();

        if (insErr || !newOrder) {
          // If insert failed or raced, fetch the order that won the race
          const { data: fallbackOrder } = await supabaseClient
            .from("orders")
            .select("id, total_amount")
            .eq("payment_provider_id", paymentIntent.id)
            .maybeSingle();

          if (fallbackOrder) {
            orderId = fallbackOrder.id;
          } else {
            throw new Error(insErr?.message || "Failed to create order record");
          }
        } else {
          orderId = newOrder.id;

          for (const it of cleanItems) {
            const prod = dbProducts?.find((p) => p.id === it.product_id);
            const itemPrice =
              prod?.price != null
                ? Number(prod.price)
                : Number(items.find((i) => i.product_id === it.product_id)?.price || 0);

            await supabaseClient.from("order_items").insert({
              order_id: orderId,
              product_id: it.product_id,
              size: it.size,
              quantity: it.quantity,
              price: itemPrice,
            });
          }
        }
      }
    }
  }

  // Update payment intent metadata with order_id now that it is persisted
  try {
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: { order_id: String(orderId), user_id: user.id },
    });
  } catch {
    // Non-fatal if metadata update deferred
  }

  return {
    clientSecret: paymentIntent.client_secret,
    orderId: orderId,
  };
}

export async function processPaymentConfirmation({
  authHeader,
  payment_intent_id,
  order_id,
  env,
}: {
  authHeader?: string | null;
  payment_intent_id: string;
  order_id: string;
  env: {
    STRIPE_SECRET_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}) {
  const stripeSecretKey = env["STRIPE_SECRET_KEY"] || process.env["STRIPE_SECRET_KEY"];
  const supabaseUrl = env["VITE_SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const supabaseAnonKey = env["VITE_SUPABASE_ANON_KEY"] || process.env["VITE_SUPABASE_ANON_KEY"];

  if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("Server configuration missing");
  }
  if (!authHeader) {
    throw new Error("Unauthorized");
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Invalid session");
  }

  // 1. Fetch order from DB to verify association and ownership
  const { data: order, error: orderFetchError } = await supabaseClient
    .from("orders")
    .select("id, total_amount, payment_status, user_id")
    .eq("id", order_id)
    .single();

  if (orderFetchError || !order) {
    throw new Error("Order not found or access denied");
  }

  if (order.user_id !== user.id) {
    throw new Error("Unauthorized: Order ownership mismatch");
  }

  // 2. Retrieve authoritative PaymentIntent from Stripe
  const stripe = new Stripe(stripeSecretKey);
  const pi = await stripe.paymentIntents.retrieve(payment_intent_id);

  if (pi.status !== "succeeded") {
    throw new Error(`Payment is not completed (status: ${pi.status})`);
  }

  // 3. Strict verification of amount, currency, and metadata
  const expectedAmountInPence = Math.round(Number(order.total_amount) * 100);
  if (pi.amount !== expectedAmountInPence || pi.currency !== "gbp") {
    throw new Error("Payment amount or currency mismatch");
  }

  if (pi.metadata["order_id"] && pi.metadata["order_id"] !== order_id) {
    throw new Error("PaymentIntent order mismatch");
  }

  if (pi.metadata["user_id"] && pi.metadata["user_id"] !== user.id) {
    throw new Error("Unauthorized: PaymentIntent customer mismatch");
  }

  // 4. Update order payment status
  await supabaseClient
    .from("orders")
    .update({
      payment_status: "captured",
      payment_provider_id: payment_intent_id,
      status: "processing",
    })
    .eq("id", order_id)
    .eq("user_id", user.id);

  return {
    success: true,
    orderId: order_id,
    paymentStatus: "captured",
  };
}
