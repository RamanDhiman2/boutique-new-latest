import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { getRuntimeEnv } from "./supabase";

let stripePromiseInstance: Promise<Stripe | null> | null = null;
let lastKey = "";

export function getStripePromise(): Promise<Stripe | null> {
  const key = getRuntimeEnv("VITE_STRIPE_PUBLISHABLE_KEY");
  if (!stripePromiseInstance || lastKey !== key) {
    lastKey = key;
    stripePromiseInstance = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromiseInstance;
}

export const stripePromise = new Proxy(Promise.resolve(null) as Promise<Stripe | null>, {
  get(_target, prop) {
    const realPromise = getStripePromise();
    const value = (realPromise as any)[prop];
    if (typeof value === "function") {
      return value.bind(realPromise);
    }
    return value;
  },
});

