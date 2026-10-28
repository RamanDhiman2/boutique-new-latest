import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { categories } from "@/lib/catalog";
import { useAllProductsQuery } from "@/lib/catalogService";
import { usePageSeo, useSiteSettings } from "@/lib/siteSettings";

const SITE_URL = (
  (import.meta.env["VITE_SITE_URL"] as string | undefined) || "https://charminngchic.com"
).replace(/\/+$/, "");

// Built-in titles/descriptions; Admin → Settings → Page SEO can override any of these
const ROUTE_METADATA: Record<string, { title: string; description: string }> = {
  "/shop": {
    title: "Shop All Collections",
    description:
      "Shop our complete catalogue of Punjabi suits, bridal outfits, organza suits and handcrafted festive wear.",
  },
  "/collections": {
    title: "Our Collections",
    description:
      "Explore curated collections: Bridal, Festive Occasions, Aari Work, Mirror Work, Thread Work and Hand Work.",
  },
  "/custom-designs": {
    title: "Custom Designs & Bespoke Tailoring",
    description:
      "Personalised, made-to-measure Indian outfits. Choose your design, fabrics, colours and embroidery.",
  },
  "/measurements": {
    title: "Size & Measurement Guide",
    description:
      "Submit your bespoke measurements for custom tailored Punjabi suits, kurtas and bridal outfits.",
  },
  "/about": {
    title: "Our Heritage & Story",
    description:
      "The story behind SohniMutiyaar By CC, where timeless Indian tradition meets modern elegance.",
  },
  "/contact": {
    title: "Contact Us & Enquiries",
    description:
      "Reach our design team by WhatsApp, email or enquiry form for bridal consultations and orders.",
  },
  "/shipping": {
    title: "Worldwide Shipping & Delivery",
    description: "Worldwide shipping, bespoke order timelines and tracking information.",
  },
  "/refund-policy": {
    title: "Refund & Returns Policy",
    description: "Cancellation, exchange and return policies for made-to-measure clothing.",
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    description:
      "How SohniMutiyaar By CC protects your privacy and handles your personal information.",
  },
  "/terms-of-service": {
    title: "Terms of Service",
    description: "Terms and conditions for browsing, purchasing and custom orders.",
  },
};

// Private or personal pages are never indexed
const NOINDEX_PREFIXES = [
  "/checkout",
  "/bag",
  "/profile",
  "/login",
  "/register",
  "/auth",
  "/order-success",
  "/admin",
];

const absolute = (url: string) =>
  /^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: unknown | null) {
  let el = document.head.querySelector(`script[data-seo="${id}"]`) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Keeps title, description, canonical URL, robots, Open Graph / Twitter tags and
 * JSON-LD (organisation + product) in sync with the current page, the site
 * settings and any per-page SEO overrides from the admin panel.
 */
export function SEOManager() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settings = useSiteSettings();
  const pageSeo = usePageSeo();
  const { data: products = [] } = useAllProductsQuery();

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Applied now and once more after route head tags settle (loaders can finish later)
    apply();
    const timer = window.setTimeout(apply, 800);
    return () => window.clearTimeout(timer);

    function apply() {
      const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
      const canonicalUrl = `${SITE_URL}${cleanPath === "/" ? "" : cleanPath}`;
      const suffix = ` — ${settings.siteName}`;

      // null = keep the title the page's own route set (e.g. "Your Bag — ...")
      let title: string | null =
        cleanPath === "/" ? `${settings.siteName} — ${settings.tagline}` : null;
      let description = settings.defaultDescription;
      let image = settings.ogImageUrl;
      let ogType = "website";
      let productLd: Record<string, unknown> | null = null;

      const builtIn = ROUTE_METADATA[cleanPath];
      if (builtIn) {
        title = builtIn.title + suffix;
        description = builtIn.description;
      }

      if (cleanPath.startsWith("/collections/")) {
        const category = categories.find((c) => c.slug === cleanPath.slice("/collections/".length));
        if (category) {
          title = `${category.name} Collection${suffix}`;
          description = category.description;
          if (category.image) image = category.image;
        }
      }

      if (cleanPath.startsWith("/product/")) {
        const product = products.find((p) => p.id === cleanPath.slice("/product/".length));
        if (product) {
          title = product.name + suffix;
          description =
            product.description.replace(/\s+/g, " ").trim().slice(0, 160) || description;
          if (product.images[0]) image = product.images[0];
          ogType = "product";
          productLd = {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: product.images.slice(0, 6).map(absolute),
            description: product.description.replace(/\s+/g, " ").trim().slice(0, 500),
            sku: product.id,
            color: product.colour || undefined,
            brand: { "@type": "Brand", name: settings.siteName },
            offers: {
              "@type": "Offer",
              url: canonicalUrl,
              priceCurrency: "GBP",
              price: product.price.toFixed(2),
              availability:
                product.soldOut || product.isUpcoming
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/InStock",
              itemCondition: "https://schema.org/NewCondition",
            },
          };
        }
      }

      // Admin overrides win over everything above
      const override = pageSeo.find((p) => p.path === cleanPath);
      if (override?.title) title = override.title;
      if (override?.description) description = override.description;

      const noindex =
        override?.noindex === true ||
        NOINDEX_PREFIXES.some((p) => cleanPath === p || cleanPath.startsWith(`${p}/`));
      const imageUrl = absolute(image);

      if (title) document.title = title;
      else if (!document.title) document.title = settings.defaultTitle;
      const shareTitle = title ?? document.title;
      setCanonical(canonicalUrl);
      setMeta("name", "description", description);
      setMeta(
        "name",
        "robots",
        noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
      );
      setMeta("property", "og:site_name", settings.siteName);
      setMeta("property", "og:type", ogType);
      setMeta("property", "og:title", shareTitle);
      setMeta("property", "og:description", description);
      setMeta("property", "og:url", canonicalUrl);
      setMeta("property", "og:image", imageUrl);
      setMeta("name", "twitter:card", "summary_large_image");
      setMeta("name", "twitter:title", shareTitle);
      setMeta("name", "twitter:description", description);
      setMeta("name", "twitter:image", imageUrl);

      setJsonLd("jsonld-org", {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: settings.siteName,
            url: SITE_URL,
            logo: absolute(DEFAULT_LOGO),
            email: settings.contactEmail,
            sameAs: [settings.instagramUrl, settings.tiktokUrl].filter(Boolean),
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: settings.siteName,
            publisher: { "@id": `${SITE_URL}/#organization` },
          },
        ],
      });
      setJsonLd("jsonld-product", productLd);
    }
  }, [pathname, settings, pageSeo, products]);

  return null;
}

const DEFAULT_LOGO = "/Maroon%20and%20Gold%20Monogram%20Fashion%20Logo.png";
