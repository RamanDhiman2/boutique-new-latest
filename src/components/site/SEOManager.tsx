import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { categories, products } from "@/lib/catalog";

const SITE_URL = ((import.meta.env["VITE_SITE_URL"] as string | undefined) || "https://sohnimutiyaar.com").replace(/\/+$/, "");

const DEFAULT_TITLE = "SohniMutiyaar By CC — Indian Fashion & Bespoke Tailoring";
const DEFAULT_DESC =
  "Luxury Indian bridal, occasion and daily wear with bespoke handwork, fine fabrics and made-to-measure tailoring.";

// Static routes metadata lookup table
const ROUTE_METADATA: Record<string, { title: string; description: string; noindex?: boolean }> = {
  "/": {
    title: "SohniMutiyaar By CC — Tradition, Tailored Your Way",
    description:
      "Luxury Indian bridal, occasion, and daily wear with bespoke handwork, exquisite embroideries, and made-to-measure tailoring.",
  },
  "/shop": {
    title: "Shop All Collections — SohniMutiyaar By CC",
    description:
      "Shop our complete catalog of Punjabi suits, bridal lehengas, organza suits, and handcrafted festive wear.",
  },
  "/collections": {
    title: "Our Collections — SohniMutiyaar By CC",
    description:
      "Explore curated designer collections: Bridal, Festive Occasions, Aari Work, Mirror Work, Thread Work, and Hand Work.",
  },
  "/custom-designs": {
    title: "Custom Designs & Bespoke Tailoring — SohniMutiyaar By CC",
    description:
      "Personalised, made-to-measure Indian outfits. Choose your design, fabrics, colours, and embroidery.",
  },
  "/measurements": {
    title: "Size & Measurement Guide — SohniMutiyaar By CC",
    description:
      "Submit your bespoke measurements for custom tailored Punjabi suits, kurtas, and bridal outfits.",
  },
  "/about": {
    title: "Our Heritage & Story — SohniMutiyaar By CC",
    description:
      "Discover the story behind SohniMutiyaar By CC, where timeless Indian tradition meets modern elegance.",
  },
  "/contact": {
    title: "Contact Us & Enquiries — SohniMutiyaar By CC",
    description:
      "Connect with our design team via WhatsApp, email, or direct enquiry for bridal consultations and orders.",
  },
  "/shipping": {
    title: "Worldwide Shipping & Delivery — SohniMutiyaar By CC",
    description:
      "Fast worldwide shipping, bespoke order fulfillment times, and tracking information.",
  },
  "/refund-policy": {
    title: "Refund & Returns Policy — SohniMutiyaar By CC",
    description:
      "Our cancellation, exchange, and return policies for made-to-measure and ready-to-wear clothing.",
  },
  "/privacy-policy": {
    title: "Privacy Policy — SohniMutiyaar By CC",
    description:
      "How SohniMutiyaar By CC protects your personal privacy and securely manages your customer information.",
  },
  "/terms-of-service": {
    title: "Terms of Service — SohniMutiyaar By CC",
    description:
      "Terms and conditions for browsing, purchasing, and custom orders with SohniMutiyaar By CC.",
  },
  // Private / user-only pages marked noindex
  "/checkout": {
    title: "Secure Checkout — SohniMutiyaar By CC",
    description: "Complete your order securely.",
    noindex: true,
  },
  "/bag": {
    title: "Your Shopping Bag — SohniMutiyaar By CC",
    description: "Review your selected outfits and bespoke pieces.",
    noindex: true,
  },
  "/profile": {
    title: "My Account — SohniMutiyaar By CC",
    description: "Manage your orders, addresses, and saved measurements.",
    noindex: true,
  },
  "/login": {
    title: "Sign In — SohniMutiyaar By CC",
    description: "Sign in to your account.",
    noindex: true,
  },
  "/register": {
    title: "Create Account — SohniMutiyaar By CC",
    description: "Join the SohniMutiyaar Circle.",
    noindex: true,
  },
};

/**
 * Lightweight, non-invasive SEO Manager
 * Dynamically synchronizes Canonical URL, Document Title, Meta Description,
 * OpenGraph tags, and Schema.org JSON-LD without modifying individual page components.
 */
export function SEOManager() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !document) return;

    // 1. Determine canonical URL
    const cleanPath = pathname === "/" ? "" : pathname.replace(/\/+$/, "");
    const canonicalUrl = `${SITE_URL}${cleanPath}`;

    // 2. Resolve title, description, and indexing rules
    let meta = ROUTE_METADATA[cleanPath || "/"];
    let imageUrl = `${SITE_URL}/Maroon%20and%20Gold%20Monogram%20Fashion%20Logo.png`;

    // Dynamic resolution for collections
    if (!meta && cleanPath.startsWith("/collections/")) {
      const slug = cleanPath.replace("/collections/", "");
      const category = categories.find((c) => c.slug === slug);
      if (category) {
        meta = {
          title: `${category.name} Collection — SohniMutiyaar By CC`,
          description: `${category.description} Explore handcrafted ${category.name.toLowerCase()} outfits designed for elegance.`,
        };
        if (category.image) imageUrl = category.image.startsWith("http") ? category.image : `${SITE_URL}${category.image}`;
      }
    }

    // Dynamic resolution for product pages
    if (!meta && cleanPath.startsWith("/product/")) {
      const id = cleanPath.replace("/product/", "");
      const product = products.find((p) => p.id === id);
      if (product) {
        meta = {
          title: `${product.name} — SohniMutiyaar By CC`,
          description: product.description.slice(0, 160).replace(/\n/g, " "),
        };
        if (product.images?.[0]) {
          imageUrl = product.images[0].startsWith("http") ? product.images[0] : `${SITE_URL}${product.images[0]}`;
        }
      }
    }

    const title = meta?.title || DEFAULT_TITLE;
    const description = meta?.description || DEFAULT_DESC;
    const isNoIndex = meta?.noindex || false;

    // Update Document Title
    document.title = title;

    // Helper to safely set or create a <meta> tag
    const setMetaTag = (attribute: "name" | "property", attrValue: string, contentValue: string) => {
      let element = document.head.querySelector(`meta[${attribute}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", contentValue);
    };

    // Helper to safely set or create a <link> tag
    const setLinkTag = (rel: string, hrefValue: string) => {
      let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
      }
      element.setAttribute("href", hrefValue);
    };

    // 3. Inject Canonical Link
    setLinkTag("canonical", canonicalUrl);

    // 4. Inject Search Engine Meta Tags
    setMetaTag("name", "description", description);
    setMetaTag("name", "robots", isNoIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large");

    // 5. Inject Open Graph (Facebook, WhatsApp, LinkedIn)
    setMetaTag("property", "og:type", cleanPath.startsWith("/product/") ? "product" : "website");
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", canonicalUrl);
    setMetaTag("property", "og:image", imageUrl);

    // 6. Inject Twitter Card
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", imageUrl);

    // 7. Inject Organization / WebSite JSON-LD Schema
    let schemaScript = document.head.querySelector(`script[data-seo="jsonld-org"]`) as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.setAttribute("type", "application/ld+json");
      schemaScript.setAttribute("data-seo", "jsonld-org");
      document.head.appendChild(schemaScript);
    }
    const schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: "SohniMutiyaar By CC",
          url: SITE_URL,
          logo: `${SITE_URL}/Maroon%20and%20Gold%20Monogram%20Fashion%20Logo.png`,
          sameAs: [
            "https://www.instagram.com/sohnimutiyaarofficial_",
            "https://www.tiktok.com/@sohnimutiyaarofficial_",
          ],
        },
        {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: "SohniMutiyaar By CC",
          publisher: { "@id": `${SITE_URL}/#organization` },
        },
      ],
    };
    schemaScript.textContent = JSON.stringify(schemaData);
  }, [pathname]);

  return null;
}
