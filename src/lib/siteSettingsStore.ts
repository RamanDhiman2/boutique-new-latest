/**
 * Current site-wide settings (contact details, SEO defaults, announcement).
 * Kept in a dependency-free module so the catalogue helpers (waLink etc.) can
 * read it without import cycles. siteSettings.ts loads the values from Supabase
 * (managed in Admin → Settings) and calls setSiteSettings().
 */

export type SiteSettings = {
  siteName: string;
  tagline: string;
  defaultTitle: string;
  defaultDescription: string;
  ogImageUrl: string;
  contactEmail: string;
  whatsappNumber: string;
  instagramUrl: string;
  tiktokUrl: string;
  announcementText: string;
  /** Admin → Settings → Maintenance: customers see the "back soon" page */
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  /** ISO date-time or "" */
  maintenanceUntil: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "SohniMutiyaar By CC",
  tagline: "Tradition, Tailored Your Way",
  defaultTitle: "SohniMutiyaar By CC — Indian Fashion & Bespoke Tailoring",
  defaultDescription:
    "Luxury Indian bridal, occasion and daily wear with bespoke handwork, fine fabrics and made-to-measure tailoring.",
  ogImageUrl: "/Maroon%20and%20Gold%20Monogram%20Fashion%20Logo.png",
  contactEmail: "Charminngchic@gmail.com",
  whatsappNumber: "447393070421",
  instagramUrl: "https://www.instagram.com/sohnimutiyaarofficial_",
  tiktokUrl: "https://www.tiktok.com/@sohnimutiyaarofficial_",
  announcementText: "Custom Designs Available • Made to Measure Elegance",
  maintenanceEnabled: false,
  maintenanceMessage:
    "We're updating our boutique and will be back very soon. For orders or questions, message us on WhatsApp.",
  maintenanceUntil: "",
};

let current: SiteSettings = DEFAULT_SITE_SETTINGS;

export function getSiteSettings(): SiteSettings {
  return current;
}

export function setSiteSettings(next: SiteSettings) {
  current = next;
}

/** "447393070421" → "+44 7393 070421" (UK mobiles); other numbers get a leading "+". */
export function formatWhatsappNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const uk = digits.match(/^44(7\d{3})(\d{6})$/);
  return uk ? `+44 ${uk[1]} ${uk[2]}` : `+${digits}`;
}
