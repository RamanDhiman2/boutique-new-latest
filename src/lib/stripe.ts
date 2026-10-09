import { loadStripe } from "@stripe/stripe-js";

// Make sure you have VITE_STRIPE_PUBLISHABLE_KEY in your .env file
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * DEV ONLY: Creates a Payment Intent directly from the client.
 * WARNING: In production, this MUST be moved to a backend server (Supabase Edge Function / Node Server)
 * because exposing the STRIPE_SECRET_KEY to the client is insecure.
 */
export async function createPaymentIntentDevOnly(amount: number, currency: string = "gbp") {
  // We use import.meta.env for VITE_ keys, but since STRIPE_SECRET_KEY shouldn't ideally be VITE_, 
  // for this frontend mock we assume it's exposed or we fetch it. 
  const secretKey = import.meta.env.VITE_STRIPE_SECRET_KEY;
  
  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      amount: Math.round(amount * 100).toString(),
      currency,
      "automatic_payment_methods[enabled]": "true",
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create payment intent");
  }
  
  return response.json();
}
