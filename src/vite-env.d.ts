/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_EMAILJS_SERVICE_ID: string
  VITE_EMAILJS_TEMPLATE_ID: string
  VITE_EMAILJS_PUBLIC_KEY: string
  VITE_STRIPE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
