import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const BASE_URL = "https://charminngchic.com";
const TODAY = new Date().toISOString().split("T")[0];

/**
 * 1. Static high-value routes with SEO priority and update frequencies.
 * Excludes private / noindex routes (/checkout, /bag, /profile, /login, /register, etc.)
 */
const staticRoutes = [
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

/**
 * 2. Extract Category Slugs and Product IDs from src/lib/catalog.ts
 */
function extractCatalogEntities() {
  const catalogPath = path.join(rootDir, "src", "lib", "catalog.ts");
  const content = fs.readFileSync(catalogPath, "utf-8");

  // Extract category slugs: { slug: "..." }
  const categorySlugs = new Set();
  const catRegex = /slug:\s*["']([^"']+)["']/g;
  let match;
  while ((match = catRegex.exec(content)) !== null) {
    if (match[1] && !match[1].startsWith("$")) {
      categorySlugs.add(match[1]);
    }
  }

  // Extract product IDs: id: "..."
  const productIds = new Set();
  const prodRegex = /id:\s*["']([^"']+)["']/g;
  while ((match = prodRegex.exec(content)) !== null) {
    // Avoid non-product ids or helper identifiers if any
    const id = match[1];
    if (id && !["processing", "shipped", "delivered", "placed", "production"].includes(id)) {
      productIds.add(id);
    }
  }

  return {
    categories: Array.from(categorySlugs),
    products: Array.from(productIds),
  };
}

/**
 * 3. Generate XML sitemap
 */
function generateSitemap() {
  console.log(`[Sitemap] Scanning catalog and routes from ${rootDir}...`);
  const { categories, products } = extractCatalogEntities();

  console.log(`[Sitemap] Found ${staticRoutes.length} static routes`);
  console.log(`[Sitemap] Found ${categories.length} category collections:`, categories);
  console.log(`[Sitemap] Found ${products.length} catalog products:`, products);

  const urls = [];

  // Add Static Routes
  for (const route of staticRoutes) {
    const loc = `${BASE_URL}${route.path}`;
    urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
  }

  // Add Dynamic Categories (/collections/:slug)
  for (const catSlug of categories) {
    const loc = `${BASE_URL}/collections/${catSlug}`;
    urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`);
  }

  // Add Dynamic Products (/product/:id)
  for (const prodId of products) {
    const loc = `${BASE_URL}/product/${prodId}`;
    urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
  </url>`);
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join("\n")}
</urlset>
`;

  // Write to public/sitemap.xml
  const publicDir = path.join(rootDir, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapDest = path.join(publicDir, "sitemap.xml");
  fs.writeFileSync(sitemapDest, sitemapXml.trim() + "\n", "utf-8");
  console.log(`[Sitemap] Generated ${urls.length} URLs in ${sitemapDest}`);

  // 4. Update public/robots.txt with Sitemap directive
  const robotsDest = path.join(publicDir, "robots.txt");
  const sitemapDirective = `Sitemap: ${BASE_URL}/sitemap.xml`;

  let robotsContent = "";
  if (fs.existsSync(robotsDest)) {
    robotsContent = fs.readFileSync(robotsDest, "utf-8");
  } else {
    robotsContent = "User-agent: *\nAllow: /\n";
  }

  // Ensure Sitemap line is present and up to date
  const cleanRobots = robotsContent
    .split("\n")
    .filter((line) => !line.trim().toLowerCase().startsWith("sitemap:"))
    .join("\n")
    .trim();

  const finalRobots = `${cleanRobots}\n\n# Automated Sitemap Directive\n${sitemapDirective}\n`;
  fs.writeFileSync(robotsDest, finalRobots, "utf-8");
  console.log(`[Sitemap] Updated ${robotsDest} with directive: ${sitemapDirective}`);
}

generateSitemap();
