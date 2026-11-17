'use strict';
/**
 * Builds the demo dataset into /data/*.json (dates relative to "now" so reports always look fresh).
 * Run:  npm run seed      (only writes files that don't exist)
 *       npm run reset     (wipes data + outbox and re-seeds)
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { CATEGORIES, PRODUCTS, SUB_COPY } = require('./lib/catalogue');

const DATA = path.join(__dirname, '..', 'data');
const DAY = 864e5;
const iso = (t) => new Date(t).toISOString();
const slugify = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Deterministic pseudo-random so the seed is reproducible
let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = (a) => a[Math.floor(rnd() * a.length)];

function buildSeed(now = Date.now()) {
  // ---------- categories ----------
  const categories = [];
  CATEGORIES.forEach((c, i) => {
    categories.push({ id: `cat_${c.slug}`, name: c.name, slug: c.slug, parentId: null, icon: c.icon, color: c.color, order: i + 1, image: `/images/categories/${c.slug}.jpg`, active: true });
    c.subs.forEach(([slug, name], j) => categories.push({ id: `cat_${slug}`, name, slug, parentId: `cat_${c.slug}`, order: j + 1, active: true }));
  });

  // ---------- products ----------
  const products = PRODUCTS.map((r, i) => {
    const [name, category, subcategory, brand, mrp, price, gstRate, stock, tags, shape, color, rating] = r;
    const slug = slugify(name);
    const isNew = tags.includes('new-arrival');
    const created = now - (isNew ? (i % 12) + 1 : 20 + ((i * 7) % 150)) * DAY;
    const catName = CATEGORIES.find((c) => c.slug === category).name;
    const subName = CATEGORIES.find((c) => c.slug === category).subs.find((x) => x[0] === subcategory)[1];
    return {
      id: `p_${String(i + 1).padStart(3, '0')}`,
      name, slug,
      sku: `HH-${category.slice(0, 3).toUpperCase()}-${subcategory.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      brand, category, subcategory,
      description: `${name} by ${brand} — thoughtfully designed for Indian homes. A dependable pick from our ${subName.toLowerCase()} range in ${catName}, made to handle everyday use and festive hosting alike. Prices are inclusive of GST.`,
      highlights: SUB_COPY[subcategory],
      mrp, price, salePrice: null, saleStart: null, saleEnd: null,
      gstRate, hsn: { 'small-appliances': '8516', bedroom: '6302', bath: '6302', 'kitchen-dining': '7323', 'home-decor': '9405', cleaning: '9603', 'storage-organisation': '9403' }[category],
      stock, lowStockThreshold: 5,
      rating, ratingCount: 20 + ((i * 37) % 480),
      tags, featured: tags.includes('best-seller') && i % 2 === 0,
      images: ['main', 'alt', 'closeup'].map((v) => `/images/products/${slug}/${v}.jpg`),
      illustration: { shape, color },
      weightKg: 0.5 + (i % 6) * 0.4,
      active: true,
      createdAt: iso(created), updatedAt: iso(created),
    };
  });
  // a timed sale price example
  const tawa = products.find((p) => p.subcategory === 'cookware' && p.slug.includes('tawa'));
  Object.assign(tawa, { salePrice: 1099, saleStart: iso(now - 2 * DAY), saleEnd: iso(now + 10 * DAY) });

  // ---------- users ----------
  const hash = (p) => bcrypt.hashSync(p, 10);
  const users = [
    { id: 'u_admin', name: 'Store Admin', email: 'admin@demo.com', phone: '9876500001', role: 'admin', passwordHash: hash('Admin@123'), createdAt: iso(now - 200 * DAY), addresses: [] },
    {
      id: 'u_demo', name: 'Priya Raman', email: 'user@demo.com', phone: '9876500002', role: 'user', passwordHash: hash('User@123'), createdAt: iso(now - 120 * DAY),
      addresses: [
        { id: 'a_demo1', label: 'Home', name: 'Priya Raman', phone: '9876500002', line1: 'Flat 4B, Lotus Apartments', line2: '12, 3rd Main Road, Besant Nagar', landmark: 'Near Ashtalakshmi Temple', city: 'Chennai', state: 'Tamil Nadu', pincode: '600090', lat: 13.0002, lng: 80.2668, mapsUrl: 'https://www.google.com/maps?q=13.0002,80.2668', isDefault: true },
        { id: 'a_demo2', label: 'Office', name: 'Priya Raman', phone: '9876500002', line1: '7th Floor, Olympia Tech Park', line2: 'SIDCO Industrial Estate, Guindy', landmark: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600032', lat: 13.0108, lng: 80.2125, mapsUrl: 'https://www.google.com/maps?q=13.0108,80.2125', isDefault: false },
      ],
    },
  ];
  const people = [['Arjun Mehta', 'Mumbai', 'Maharashtra', '400050'], ['Kavya Iyer', 'Bengaluru', 'Karnataka', '560038'], ['Rohit Sharma', 'New Delhi', 'Delhi', '110017'], ['Meera Nair', 'Kochi', 'Kerala', '682020'], ['Sandeep Reddy', 'Hyderabad', 'Telangana', '500081'], ['Ananya Das', 'Kolkata', 'West Bengal', '700019'], ['Vikram Singh', 'Jaipur', 'Rajasthan', '302001'], ['Fatima Sheikh', 'Pune', 'Maharashtra', '411001'], ['Karthik Subramanian', 'Coimbatore', 'Tamil Nadu', '641002'], ['Neha Gupta', 'Lucknow', 'Uttar Pradesh', '226001'], ['Harpreet Kaur', 'Chandigarh', 'Chandigarh', '160017'], ['Divya Menon', 'Chennai', 'Tamil Nadu', '600040']];
  const custHash = hash('Customer@123');
  people.forEach(([name, city, state, pincode], i) => {
    users.push({
      id: `u_c${i + 1}`, name, email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: `98450${String(10000 + i * 7).slice(-5)}`, role: 'user', passwordHash: custHash,
      createdAt: iso(now - (5 + i * 9) * DAY),
      addresses: [{ id: `a_c${i + 1}`, label: 'Home', name, phone: `98450${String(10000 + i * 7).slice(-5)}`, line1: `${10 + i}, ${pick(['MG Road', 'Station Road', 'Gandhi Nagar', 'Park Street', 'Temple Street'])}`, line2: '', landmark: '', city, state, pincode, lat: null, lng: null, mapsUrl: '', isDefault: true }],
    });
  });

  // ---------- historical orders + payments ----------
  const STATUSES = ['Delivered', 'Delivered', 'Delivered', 'Delivered', 'Shipped', 'Out for delivery', 'Packed', 'Confirmed', 'Placed', 'Cancelled', 'Returned'];
  const FLOW = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];
  const orders = [];
  const payments = [];
  const customers = users.filter((u) => u.role === 'user');
  for (let n = 0; n < 140; n++) {
    const u = customers[n % customers.length];
    const ageDays = Math.floor(rnd() * 90) + 1;
    const created = now - ageDays * DAY - Math.floor(rnd() * 10) * 3600e3;
    const lineCount = 1 + Math.floor(rnd() * 3);
    const items = [];
    for (let k = 0; k < lineCount; k++) {
      const p = pick(products);
      if (items.find((x) => x.productId === p.id)) continue;
      const qty = 1 + Math.floor(rnd() * 2);
      items.push({ productId: p.id, name: p.name, slug: p.slug, sku: p.sku, image: p.images[0], mrp: p.mrp, price: p.price, qty, gstRate: p.gstRate, hsn: p.hsn, category: p.category, lineTotal: p.price * qty });
    }
    const subtotal = items.reduce((a, b) => a + b.lineTotal, 0);
    const discount = n % 5 === 0 ? Math.min(200, Math.round(subtotal * 0.1)) : 0;
    const deliveryMethod = n % 4 === 0 ? 'express' : 'standard';
    const delivery = deliveryMethod === 'express' ? 149 : subtotal - discount >= 999 ? 0 : 79;
    const total = subtotal - discount + delivery;
    const gst = Math.round(items.reduce((a, it) => a + (it.lineTotal * it.gstRate) / (100 + it.gstRate), 0) * 100) / 100;
    let status = ageDays > 10 ? pick(['Delivered', 'Delivered', 'Delivered', 'Cancelled', 'Returned', 'Delivered']) : pick(STATUSES);
    const paymentMethod = n % 3 === 0 ? 'COD' : 'ONLINE';
    const idx = FLOW.indexOf(status);
    const history = (idx >= 0 ? FLOW.slice(0, idx + 1) : ['Placed', 'Confirmed', status]).map((st, j) => ({ status: st, at: iso(created + j * 20 * 3600e3), note: '' }));
    const orderNo = `HH${100001 + n}`;
    const id = `o_${String(n + 1).padStart(4, '0')}`;
    const addr = u.addresses[0];
    const paymentStatus = paymentMethod === 'COD' ? (status === 'Delivered' ? 'paid' : status === 'Cancelled' ? 'cancelled' : 'pending') : status === 'Returned' || status === 'Cancelled' ? 'refunded' : 'paid';
    orders.push({
      id, orderNo, userId: u.id, customer: { name: u.name, email: u.email, phone: u.phone },
      items, shippingAddress: addr, billingAddress: addr, deliveryMethod, paymentMethod, paymentStatus, status, statusHistory: history, notes: [],
      totals: { mrpTotal: items.reduce((a, b) => a + b.mrp * b.qty, 0), subtotal, discount, couponCode: discount ? 'WELCOME10' : null, gst, delivery, total },
      createdAt: iso(created), updatedAt: iso(created),
    });
    if (paymentMethod === 'ONLINE') {
      const method = n % 2 ? 'UPI' : 'CARD';
      payments.push({
        id: `pay_${(1e9 + n * 7919).toString(36)}`, orderId: id, orderNo, gatewayOrderId: `order_${(2e9 + n * 104729).toString(36)}`, provider: 'dummy', method,
        amount: total, currency: 'INR', status: paymentStatus === 'refunded' ? 'refunded' : 'captured',
        vpa: method === 'UPI' ? `${u.name.split(' ')[0].toLowerCase()}@okaxis` : null, card: method === 'CARD' ? { last4: '1111', network: 'Visa' } : null,
        refunds: paymentStatus === 'refunded' ? [{ id: `rfnd_${n}`, amount: total, at: iso(created + 3 * DAY), reason: status }] : [],
        events: [{ status: 'created', at: iso(created) }, { status: 'authorised', at: iso(created + 60e3) }, { status: 'captured', at: iso(created + 120e3) }],
        createdAt: iso(created), updatedAt: iso(created),
      });
    }
  }

  // ---------- coupons ----------
  const coupons = [
    { id: 'c_welcome', code: 'WELCOME10', description: '10% off your first order (up to ₹200)', type: 'percent', value: 10, minOrder: 499, maxDiscount: 200, startAt: iso(now - 60 * DAY), endAt: iso(now + 180 * DAY), usageLimit: 1000, perUserLimit: 1, usedCount: 13, categories: [], active: true, highlight: false },
    { id: 'c_festive', code: 'FESTIVE250', description: 'Flat ₹250 off on orders above ₹1,999 — festive season special', type: 'flat', value: 250, minOrder: 1999, maxDiscount: null, startAt: iso(now - 10 * DAY), endAt: iso(now + 45 * DAY), usageLimit: 500, perUserLimit: 3, usedCount: 41, categories: [], active: true, highlight: true },
    { id: 'c_kitchen', code: 'KITCHEN15', description: '15% off Kitchen & Dining (up to ₹500)', type: 'percent', value: 15, minOrder: 999, maxDiscount: 500, startAt: iso(now - 5 * DAY), endAt: iso(now + 30 * DAY), usageLimit: 300, perUserLimit: 2, usedCount: 8, categories: ['kitchen-dining'], active: true, highlight: false },
    { id: 'c_expired', code: 'MONSOON20', description: 'Monsoon sale (expired — for demo validation)', type: 'percent', value: 20, minOrder: 0, maxDiscount: 300, startAt: iso(now - 120 * DAY), endAt: iso(now - 30 * DAY), usageLimit: 100, perUserLimit: 1, usedCount: 100, categories: [], active: true, highlight: false },
  ];

  // ---------- promotions ----------
  const byShape = (sh) => products.find((p) => p.illustration.shape === sh);
  const promotions = [
    { id: 'pr_decor', name: 'Deepavali Décor Days', scope: 'category', category: 'home-decor', productIds: [], discountType: 'percent', value: 10, badge: 'Festive 10% off', startAt: iso(now - 3 * DAY), endAt: iso(now + 20 * DAY), dealOfDay: false, active: true },
    { id: 'pr_mop', name: 'Cleaning Week — Spin Mop', scope: 'product', category: null, productIds: [byShape('mop').id], discountType: 'flat', value: 100, badge: '₹100 extra off', startAt: iso(now - 1 * DAY), endAt: iso(now + 6 * DAY), dealOfDay: false, active: true },
    { id: 'pr_dotd', name: 'Deal of the Day — Mixer Grinder', scope: 'product', category: null, productIds: [byShape('mixer').id], discountType: 'percent', value: 15, badge: 'Deal of the Day', startAt: iso(now - 1 * DAY), endAt: iso(now + 30 * DAY), dealOfDay: true, active: true },
    { id: 'pr_republic', name: 'Republic Day Bath Sale (scheduled)', scope: 'category', category: 'bath', productIds: [], discountType: 'percent', value: 20, badge: 'Republic Day 20% off', startAt: iso(now + 60 * DAY), endAt: iso(now + 67 * DAY), dealOfDay: false, active: true },
  ];

  // ---------- CMS ----------
  const cms = {
    store: { name: 'HomeHaat', tagline: 'Everything your ghar needs', logoText: 'HomeHaat', logoUrl: '/images/brand/logo.svg', currency: 'INR' },
    announcement: { text: '🪔 Festive offer: use FESTIVE250 for flat ₹250 off on orders above ₹1,999 · Free standard delivery above ₹999', link: '/products.html?offers=1', active: true },
    banners: [
      { id: 'b1', title: 'Festive Home Makeover', subtitle: 'Lights, cushions and wall art — up to 40% off this Deepavali season', ctaText: 'Shop Décor', ctaLink: '/products.html?category=home-decor', image: '/images/banners/festive.jpg', order: 1, active: true, startAt: iso(now - 10 * DAY), endAt: iso(now + 60 * DAY), theme: 'dark' },
      { id: 'b2', title: 'Kitchen Essentials, Upgraded', subtitle: 'Tri-ply kadais, cast-iron tawas and masala dabbas made to last', ctaText: 'Explore Kitchen', ctaLink: '/products.html?category=kitchen-dining', image: '/images/banners/kitchen.jpg', order: 2, active: true, startAt: iso(now - 30 * DAY), endAt: iso(now + 120 * DAY), theme: 'dark' },
      { id: 'b3', title: 'Sleep Better, Live Better', subtitle: 'Jaipuri cotton bedsheets and pillows from ₹799', ctaText: 'Shop Bedroom', ctaLink: '/products.html?category=bedroom', image: '/images/banners/bedroom.jpg', order: 3, active: true, startAt: iso(now - 30 * DAY), endAt: iso(now + 120 * DAY), theme: 'dark' },
      { id: 'b4', title: 'Smart Appliances Week', subtitle: 'Kettles, mixers and irons with up to 2-year warranty', ctaText: 'See Appliances', ctaLink: '/products.html?category=small-appliances', image: '/images/banners/appliances.jpg', order: 4, active: true, startAt: iso(now - 30 * DAY), endAt: iso(now + 120 * DAY), theme: 'dark' },
    ],
    bento: {
      blocks: [
        { key: 'latest', title: 'Latest Arrivals', subtitle: 'Fresh in this week', type: 'latest', limit: 4, active: true, order: 1 },
        { key: 'offers', title: 'Offers & Deals', subtitle: 'Prices you will love', type: 'offers', limit: 4, active: true, order: 2 },
        { key: 'categories', title: 'Featured Categories', subtitle: 'Shop by room', type: 'categories', limit: 7, active: true, order: 3 },
        { key: 'bestsellers', title: 'Best Sellers', subtitle: 'Loved by Indian homes', type: 'bestsellers', limit: 4, active: true, order: 4 },
        { key: 'coupon', title: 'Coupon of the Season', subtitle: '', type: 'coupon', active: true, order: 5 },
        { key: 'promo', title: 'Pay on Delivery, Hassle-free', subtitle: 'Cash on Delivery on orders up to ₹10,000. Easy 7-day returns.', type: 'promo', ctaText: 'How it works', ctaLink: '/page.html?slug=shipping-returns', image: '', active: true, order: 6 },
      ],
    },
    footer: {
      about: 'HomeHaat is a demo online store for thoughtfully designed household essentials — from kitchen to bedroom — delivered across India.',
      columns: [
        { title: 'Shop', links: [{ label: 'Kitchen & Dining', href: '/products.html?category=kitchen-dining' }, { label: 'Home Décor', href: '/products.html?category=home-decor' }, { label: 'Bedroom', href: '/products.html?category=bedroom' }, { label: 'Offers', href: '/products.html?offers=1' }] },
        { title: 'Help', links: [{ label: 'Shipping & Returns', href: '/page.html?slug=shipping-returns' }, { label: 'Track Order', href: '/account.html#orders' }, { label: 'Contact Us', href: '/contact.html' }] },
        { title: 'Company', links: [{ label: 'About Us', href: '/page.html?slug=about' }, { label: 'Privacy Policy', href: '/page.html?slug=privacy' }, { label: 'Terms of Use', href: '/page.html?slug=terms' }] },
      ],
      social: { instagram: '#', facebook: '#', youtube: '#' },
      copyright: '© {year} HomeHaat (demo). All prices in ₹ and inclusive of GST.',
    },
    contact: {
      address: 'HomeHaat Retail Pvt. Ltd. (demo), 2nd Floor, 45 Cathedral Road, Gopalapuram, Chennai, Tamil Nadu 600086',
      phone: '+91 44 4000 1234', email: 'support@homehaat.example', whatsapp: '919876500000',
      hours: [{ days: 'Monday – Saturday', time: '9:30 AM – 7:30 PM' }, { days: 'Sunday', time: '10:00 AM – 4:00 PM' }],
      lat: 13.0475, lng: 80.2570,
      faqs: [
        { q: 'How long does delivery take?', a: 'Standard delivery takes 4–6 working days; Express delivery takes 1–2 working days in metro cities.' },
        { q: 'Is Cash on Delivery available?', a: 'Yes, COD is available on orders up to ₹10,000 across most PIN codes.' },
        { q: 'How do I return a product?', a: 'Raise a return within 7 days of delivery from My Account → Orders, or contact us. Refunds are processed within 5–7 working days.' },
        { q: 'Are prices inclusive of GST?', a: 'Yes. All prices shown are inclusive of GST and a GST invoice is provided with every order.' },
      ],
    },
    pages: [
      { slug: 'about', title: 'About HomeHaat', active: true, content: '<p>HomeHaat (a placeholder demo brand) brings together everyday household essentials inspired by the Indian <em>haat</em> — the neighbourhood market where quality and value meet.</p><h2>What we believe</h2><ul><li>Durable products that suit Indian kitchens and homes</li><li>Honest, GST-inclusive pricing</li><li>Delivery across India with Cash on Delivery</li></ul><p>This website is a demo built for review purposes. Brands and products are fictional.</p>' },
      { slug: 'shipping-returns', title: 'Shipping & Returns', active: true, content: '<h2>Shipping</h2><ul><li><strong>Standard delivery</strong>: ₹79, free on orders of ₹999 and above. 4–6 working days.</li><li><strong>Express delivery</strong>: ₹149. 1–2 working days in metro cities.</li><li>We ship to all serviceable PIN codes across India.</li></ul><h2>Cash on Delivery</h2><p>COD is available on orders up to ₹10,000.</p><h2>Returns & refunds</h2><ul><li>Return any unused product within <strong>7 days</strong> of delivery.</li><li>Refunds to the original payment method in 5–7 working days. COD refunds go to your bank account/UPI.</li><li>Electrical appliances are covered by the brand warranty after the return window.</li></ul>' },
      { slug: 'privacy', title: 'Privacy Policy', active: true, content: '<p>This is a placeholder privacy policy for the demo store. We collect only the information needed to process your orders — name, contact details, delivery address and order history — and never sell it to third parties.</p><p>Payments are processed by our payment partner; we do not store card numbers.</p><p>Replace this text with your legal team\'s policy, compliant with the Digital Personal Data Protection Act, 2023.</p>' },
      { slug: 'terms', title: 'Terms of Use', active: true, content: '<p>These are placeholder terms for the demo store. By using this website you agree to our policies on orders, pricing, delivery and returns.</p><p>All prices are in Indian Rupees (₹) and inclusive of GST. Product images are illustrative.</p><p>Disputes are subject to the jurisdiction of courts in Chennai, Tamil Nadu.</p>' },
    ],
  };

  // ---------- settings ----------
  const settings = {
    delivery: {
      standard: { label: 'Standard', charge: 79, freeAbove: 999, eta: '4–6 working days' },
      express: { label: 'Express', charge: 149, freeAbove: null, eta: '1–2 working days' },
    },
    cod: { enabled: true, maxOrderValue: 10000, minOrderValue: 0 },
    tax: { pricesIncludeGst: true, gstin: '33AABCH1234Z1Z5', legalName: 'HomeHaat Retail Pvt. Ltd. (demo)', state: 'Tamil Nadu', invoicePrefix: 'HH/INV/' },
    lowStockThreshold: 5,
    email: {
      smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: 'HomeHaat <no-reply@homehaat.example>' },
      demoMode: true,
      adminEmail: 'admin@demo.com',
      enabled: { welcome: true, password_reset: true, order_placed: true, payment_success: true, payment_failed: true, order_shipped: true, out_for_delivery: true, delivered: true, cancelled: true, refund: true, contact_admin: true, test: true },
    },
  };

  return { categories, products, users, orders, payments, coupons, promotions, cms, settings, carts: [], contacts: [], emails: [] };
}

function writeSeed({ force = false } = {}) {
  fs.mkdirSync(DATA, { recursive: true });
  const data = buildSeed();
  const written = [];
  for (const [name, value] of Object.entries(data)) {
    const f = path.join(DATA, `${name}.json`);
    if (!force && fs.existsSync(f)) continue;
    fs.writeFileSync(f, JSON.stringify(value, null, 2));
    written.push(name);
  }
  return written;
}

if (require.main === module) {
  const w = writeSeed({ force: process.argv.includes('--force') });
  console.log(w.length ? `Seeded: ${w.join(', ')}` : 'Data already present (use npm run reset to re-seed).');
}

module.exports = { buildSeed, writeSeed };
