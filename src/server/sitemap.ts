import { categories as staticCategories, products as staticProducts } from "../lib/catalog";

/**
 * Live sitemap.xml: built on request from the products and categories in
 * Supabase (so products added in the admin panel are listed without a
 * redeploy), falling back to the built-in catalogue if Supabase is unreachable.
 */

const STATIC_ROUTES: { path: string; priority: string; changefreq: string }[] = [
  { path: "", priority: "1.0", changefreq: "daily" },
  { path: "/shop", priority: "0.9", changefreq: "daily" },
  { path: "/collections", priority: "0.9", changefreq: "daily" },
  { path: "/custom-designs", priority: "0.8", changefreq: "weekly" },
  { path: "/measurements", priority: "0.8", changefreq: "monthly" },
  { path: "/about", priority: "0.7", changefreq: "monthly" },
  { path: "/contact", priority: "0.7", changefreq: "monthly" },
  { path: "/shipping", priority: "0.5", changefreq: "monthly" },
  { path: "/refund-policy", priority: "0.4", changefreq: "monthly" },
  { path: "/privacy-policy", priority: "0.4", changefreq: "monthly" },
  { path: "/terms-of-service", priority: "0.4", changefreq: "monthly" },
];

type Entry = { loc: string; lastmod: string; changefreq: string; priority: string };

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function fetchRows(
  supabaseUrl: string,
  anonKey: string,
  table: string,
  select: string,
): Promise<Record<string, unknown>[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${select}&is_active=eq.true`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function buildSitemap(env: Record<string, string | undefined>): Promise<string> {
  const baseUrl = (
    env["VITE_SITE_URL"] ||
    env["VITE_PUBLIC_URL"] ||
    "https://charminngchic.com"
  ).replace(/\/+$/, "");
  const supabaseUrl = (env["VITE_SUPABASE_URL"] || "").replace(/\/+$/, "");
  const anonKey = env["VITE_SUPABASE_ANON_KEY"] || "";
  const today = new Date().toISOString().slice(0, 10);

  let productRows: Record<string, unknown>[] | null = null;
  let categoryRows: Record<string, unknown>[] | null = null;
  if (supabaseUrl && anonKey) {
    [productRows, categoryRows] = await Promise.all([
      fetchRows(supabaseUrl, anonKey, "products", "id,updated_at"),
      fetchRows(supabaseUrl, anonKey, "categories", "slug,updated_at"),
    ]);
  }

  const day = (v: unknown) => (typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : today);

  const categories =
    categoryRows?.map((c) => ({ slug: String(c["slug"]), lastmod: day(c["updated_at"]) })) ??
    staticCategories.map((c) => ({ slug: c.slug, lastmod: today }));
  const products =
    productRows?.map((p) => ({ id: String(p["id"]), lastmod: day(p["updated_at"]) })) ??
    staticProducts.map((p) => ({ id: p.id, lastmod: today }));

  const entries: Entry[] = [
    ...STATIC_ROUTES.map((r) => ({
      loc: `${baseUrl}${r.path}`,
      lastmod: today,
      changefreq: r.changefreq,
      priority: r.priority,
    })),
    ...categories.map((c) => ({
      loc: `${baseUrl}/collections/${encodeURIComponent(c.slug)}`,
      lastmod: c.lastmod,
      changefreq: "weekly",
      priority: "0.85",
    })),
    ...products.map((p) => ({
      loc: `${baseUrl}/product/${encodeURIComponent(p.id)}`,
      lastmod: p.lastmod,
      changefreq: "weekly",
      priority: "0.80",
    })),
  ];

  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
