import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Target Base Domain (Can be overridden via environment variable)
const BASE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://sohnimutiyaar.com').replace(/\/+$/, '');
const TODAY = new Date().toISOString().split('T')[0];

// 2. Blacklist of routes that search engines should NOT index
const EXCLUDED_ROUTES = new Set([
  '__root',
  'auth.callback',
  'categories', // Redirect route to /collections
  'bag',         // User shopping cart / private
  'checkout',    // Private checkout / payment
  'order-success', // Post-purchase private page
  'login',       // User auth
  'register',    // User auth
  'profile',     // User dashboard / private
]);

// Route metadata configuration (priorities & change frequencies)
const ROUTE_CONFIG = {
  '/': { priority: '1.0', changefreq: 'daily' },
  '/shop': { priority: '0.9', changefreq: 'daily' },
  '/collections': { priority: '0.9', changefreq: 'weekly' },
  '/custom-designs': { priority: '0.8', changefreq: 'weekly' },
  '/measurements': { priority: '0.7', changefreq: 'monthly' },
  '/about': { priority: '0.7', changefreq: 'monthly' },
  '/contact': { priority: '0.7', changefreq: 'monthly' },
  '/shipping': { priority: '0.5', changefreq: 'monthly' },
  '/refund-policy': { priority: '0.5', changefreq: 'monthly' },
  '/privacy-policy': { priority: '0.5', changefreq: 'monthly' },
  '/terms-of-service': { priority: '0.5', changefreq: 'monthly' },
};

function getStaticRoutes() {
  const routesDir = path.join(rootDir, 'src', 'routes');
  if (!fs.existsSync(routesDir)) {
    console.warn(`Routes directory not found at ${routesDir}`);
    return [];
  }

  const files = fs.readdirSync(routesDir);
  const urls = [];

  for (const file of files) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;

    const baseName = file.replace(/\.(tsx|ts)$/, '');
    
    // Skip excluded routes or dynamic route templates
    if (EXCLUDED_ROUTES.has(baseName) || baseName.includes('$')) {
      continue;
    }

    let routePath = '';
    if (baseName === 'index') {
      routePath = '/';
    } else if (baseName.endsWith('.index')) {
      routePath = '/' + baseName.replace(/\.index$/, '').replace(/\./g, '/');
    } else {
      routePath = '/' + baseName.replace(/\./g, '/');
    }

    const config = ROUTE_CONFIG[routePath] || { priority: '0.6', changefreq: 'weekly' };

    urls.push({
      loc: `${BASE_URL}${routePath === '/' ? '' : routePath}`,
      lastmod: TODAY,
      changefreq: config.changefreq,
      priority: config.priority,
    });
  }

  return urls;
}

function getDynamicCatalogRoutes() {
  const catalogPath = path.join(rootDir, 'src', 'lib', 'catalog.ts');
  if (!fs.existsSync(catalogPath)) {
    console.warn(`Catalog file not found at ${catalogPath}`);
    return [];
  }

  const content = fs.readFileSync(catalogPath, 'utf8');
  const urls = [];

  // 1. Extract category slugs from categories array
  // Pattern: slug: "bridal",
  const categorySlugRegex = /slug:\s*["']([^"']+)["']/g;
  const categoriesFound = new Set();
  let match;

  while ((match = categorySlugRegex.exec(content)) !== null) {
    const slug = match[1];
    if (slug && !categoriesFound.has(slug)) {
      categoriesFound.add(slug);
      urls.push({
        loc: `${BASE_URL}/collections/${slug}`,
        lastmod: TODAY,
        changefreq: 'weekly',
        priority: '0.85',
      });
    }
  }

  // 2. Extract product IDs from products array
  // Pattern: id: "elegant-maroon-suit",
  const productIdRegex = /id:\s*["']([a-zA-Z0-9_-]+)["']/g;
  const productsFound = new Set();

  while ((match = productIdRegex.exec(content)) !== null) {
    const id = match[1];
    if (id && !productsFound.has(id)) {
      productsFound.add(id);
      urls.push({
        loc: `${BASE_URL}/product/${id}`,
        lastmod: TODAY,
        changefreq: 'weekly',
        priority: '0.80',
      });
    }
  }

  console.log(`Discovered ${categoriesFound.size} dynamic collections and ${productsFound.size} dynamic products from catalog.`);
  return urls;
}

function generateSitemap() {
  console.log(`Generating sitemap with base URL: ${BASE_URL}...`);

  const staticUrls = getStaticRoutes();
  const dynamicUrls = getDynamicCatalogRoutes();

  // Combine and de-duplicate by URL
  const allUrlsMap = new Map();
  for (const item of [...staticUrls, ...dynamicUrls]) {
    allUrlsMap.set(item.loc, item);
  }

  const allUrls = Array.from(allUrlsMap.values());

  const xmlEntries = allUrls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>
`;

  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Successfully generated ${sitemapPath} with ${allUrls.length} total URLs!`);

  // Ensure public/robots.txt includes the Sitemap directive
  const robotsPath = path.join(publicDir, 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    let robotsContent = fs.readFileSync(robotsPath, 'utf8');
    const sitemapDirective = `Sitemap: ${BASE_URL}/sitemap.xml`;
    if (!robotsContent.includes('Sitemap:')) {
      robotsContent = robotsContent.trimEnd() + `\n\n${sitemapDirective}\n`;
      fs.writeFileSync(robotsPath, robotsContent, 'utf8');
      console.log(`Appended Sitemap reference to ${robotsPath}`);
    }
  }
}

generateSitemap();
