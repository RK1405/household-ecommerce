'use strict';
/**
 * DEV-ONLY: renders the original product/banner/category illustrations to JPG using Playwright
 * (not a runtime dependency — the generated images are committed under public/images).
 *   npx playwright --version   # needs Playwright + Chromium available
 *   npm run images
 */
const fs = require('fs');
const path = require('path');
const { productSvg, bannerSvg, tint } = require('./lib/illustrations');
const { CATEGORIES, PRODUCTS } = require('./lib/catalogue');

const OUT = path.join(__dirname, '..', 'public', 'images');
const slugify = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { console.error('Playwright not found. Install it (npm i -D playwright) to regenerate images.'); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  async function render(svg, file, w, h) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.locator('svg').screenshot({ path: file, type: 'jpeg', quality: 82 });
  }
  const only = process.argv[2];
  for (const [name, category, , brand, , , , , , shape, color] of PRODUCTS) {
    const slug = slugify(name);
    if (only && only !== slug) continue;
    for (const view of ['main', 'alt', 'closeup']) {
      await render(productSvg({ shape, color, category, name, brand, view }), path.join(OUT, 'products', slug, `${view}.jpg`), 800, 800);
    }
    process.stdout.write('.');
  }
  const banners = [
    ['festive', '#7a1f3d', '#f4a261', ['stringlights', 'mandala', 'cushion']],
    ['kitchen', '#0f5e57', '#f9c74f', ['kadai', 'dabba', 'jars']],
    ['bedroom', '#3d348b', '#f7b267', ['bedsheet', 'pillow', 'tablelamp']],
    ['appliances', '#1d3557', '#e76f51', ['kettle', 'mixer', 'steamiron']],
  ];
  for (const [n, c, a, shapes] of banners) await render(bannerSvg({ title: n, subtitle: '', color: c, accent: a, shapes }), path.join(OUT, 'banners', `${n}.jpg`), 1600, 640);
  const catShape = { 'kitchen-dining': 'kadai', 'home-decor': 'tablelamp', cleaning: 'mop', bath: 'towel', bedroom: 'pillow', 'storage-organisation': 'basket', 'small-appliances': 'kettle' };
  for (const c of CATEGORIES) {
    await render(productSvg({ shape: catShape[c.slug], color: c.color, category: c.slug, name: c.name, brand: 'Shop the range', view: 'main' }), path.join(OUT, 'categories', `${c.slug}.jpg`), 800, 800);
  }
  // Default OG / share image
  await render(bannerSvg({ color: '#0f5e57', accent: '#f4a261', shapes: ['kadai', 'cushion', 'kettle'] }).replace('</svg>', '<text x="80" y="330" font-family="Inter,Arial" font-size="96" font-weight="800" fill="#fff">HomeHaat</text><text x="84" y="400" font-family="Inter,Arial" font-size="40" fill="#fff" opacity=".85">Everything your ghar needs</text></svg>'), path.join(OUT, 'brand', 'og-default.jpg'), 1600, 640);
  await browser.close();
  console.log('\nImages generated in public/images');
})();
