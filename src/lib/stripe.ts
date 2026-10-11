import { loadStripe } from "@stripe/stripe-js";

// Make sure you have VITE_STRIPE_PUBLISHABLE_KEY in your .env file
// This is the only Stripe key exposed to the browser; STRIPE_SECRET_KEY must never be VITE_-
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
