# HomeHaat — household-items ecommerce demo (India)

A complete, **local-only** demo store for household items: storefront, admin panel, dummy payment gateway, email outbox and a rule-based chatbot.
It runs on Node.js + Express with plain HTML/CSS/JS (ES modules) and JSON-file storage. Nothing is deployed, no real emails are sent and no real payments are taken.

> **HomeHaat** is an invented placeholder store name. Change it in one place: **Admin → Website content (CMS) → Store name & logo** (stored in `data/cms.json`).

---

## 1. How to run

Requirements: **Node.js 20+** (Windows, macOS or Linux). No native modules, no database server.

```bash
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm start
```

| What | URL |
|---|---|
| Storefront | http://localhost:3000/ |
| Admin panel | http://localhost:3000/admin/login.html |
| Health check | http://localhost:3000/api/health |

On first start the demo dataset is generated into `/data/*.json` (dates are relative to "today", so the reports always look current).

Useful scripts:

| Command | What it does |
|---|---|
| `npm start` | Start the server (port from `.env`, default 3000) |
| `npm run dev` | Start with auto-restart on file changes (`node --watch`) |
| `npm run reset` | Wipe `/data`, the email outbox and uploads, then re-seed the demo data |
| `npm run test:e2e` | Run the Playwright end-to-end suite (see §11). Run `npx playwright install chromium` once first |
| `npm run images` | Re-generate the product/banner illustrations (dev only, needs Playwright) |
| `node scripts/export-sql.js` | Re-generate `db/mysql/seed.sql` from the seed |

## 2. Demo credentials

Shown on the login pages while `DEMO_MODE=true`.

| Role | Email | Password |
|---|---|---|
| Customer | `user@demo.com` | `User@123` |
| Admin | `admin@demo.com` | `Admin@123` |
| Other seeded customers | `arjun@example.com`, `kavya@example.com` … | `Customer@123` |

**Payment test data** (dummy gateway on `payment.html`):

| Method | Success | Failure |
|---|---|---|
| UPI | any valid VPA, e.g. `priya@okaxis` (auto-approves after an 8-second "approve on your UPI app" countdown) | `fail@upi` (any VPA starting with `fail`) |
| Card | `4111 1111 1111 1111` (also `5555 5555 5555 4444`, RuPay `6521 1111 1111 1117`) | `4000 0000 0000 0002` (declined), `4000 0000 0000 9995` (insufficient funds) |
| OTP | `123456` (3 wrong attempts fail the payment) | |

Any future expiry (MM/YY) and any 3-digit CVV work.

**Coupons:** `WELCOME10` (10%, max ₹200, min ₹499, once per user), `FESTIVE250` (flat ₹250 over ₹1,999 — highlighted on home), `KITCHEN15` (15% on Kitchen & Dining, max ₹500, min ₹999), `MONSOON20` (expired, to demo validation messages).

**Where are the emails?** Admin → Email settings → Outbox, or the HTML files in `storage/outbox/`.

## 3. Pages

Every page is its own `.html` file with its own page script in `public/js/pages/` (admin: `public/admin/js/`).

**Storefront** (`public/`)

| Page | Purpose |
|---|---|
| `index.html` | Home: CMS hero slider + Bento grid (Latest arrivals, Offers & deal of the day, Featured categories, Best sellers, coupon highlight, promo tile) + trending |
| `products.html` | Listing: filters (category, subcategory, price, rating, in stock, offers, brand, new arrivals), sort, search, pagination, breadcrumbs |
| `product.html` | Product detail (served at **`/product/<slug>`** with Open Graph tags): gallery with zoom, share, quick buy, delivery check, specs, reviews (mock) |
| `cart.html` | Cart with quantity controls, coupon field, price breakdown, free-delivery progress |
| `checkout.html` | Address selection/new address with map pin, Standard/Express delivery, COD vs online payment, GSTIN, notes |
| `payment.html` | Dummy payment gateway (UPI + Card/OTP) |
| `order-confirmation.html` | Confirmation and summary |
| `login.html` / `register.html` | Login (+ forgot/reset password) and registration |
| `account.html` | Orders & tracking timeline, saved addresses (map pin), profile, password |
| `contact.html` | Contact form, address, phone, email, WhatsApp, map, business hours, FAQ |
| `page.html?slug=` | CMS pages: `about`, `shipping-returns`, `privacy`, `terms` (and any page you add) |
| `404.html` | Not-found page |

**Admin** (`public/admin/`, every page protected server-side): `login`, `dashboard`, `products`, `categories`, `orders` (+ printable `invoice.html`), `customers`, `reviews`, `coupons`, `promotions`, `cms`, `reports`, `payments`, `email-settings`, `settings`.

## 4. Folder structure

```
household-ecommerce/
├─ server.js                    Express app: API, static files, /product/:slug OG injection, admin page guard
├─ .env.example                 All configuration (copy to .env; .env is git-ignored)
├─ src/
│  ├─ config/index.js           Reads .env
│  ├─ db/jsonStore.js           JSON file store (atomic writes, in-memory cache)
│  ├─ repositories/             ONE MODULE PER ENTITY — the only code that touches storage
│  │                            products, categories, users, carts, orders, payments, coupons,
│  │                            promotions, cms, settings, contacts, emails (+ index.js registry)
│  ├─ services/
│  │  ├─ pricing.service.js     Sale prices, promotions, deal of the day, coupons, GST, delivery, COD rule
│  │  ├─ order.service.js       Place order, status workflow, restock, auto-refund, status emails
│  │  ├─ email.service.js       Nodemailer + outbox (demo mode never sends)
│  │  ├─ payments/              PaymentProvider interface, dummy.provider.js, razorpay.provider.js (stub)
│  │  ├─ reviews/               ReviewsService interface + mock adapter + MySQL/Salesforce TODO adapters
│  │  └─ customers/             CustomersService interface + mock adapter + MySQL/Salesforce TODO adapters
│  ├─ emails/templates.js       Branded HTML email templates
│  ├─ middleware/               auth (JWT cookie, roles, admin guard), errors
│  ├─ routes/                   REST API under /api (storefront) and /api/admin (admin)
│  └─ utils/                    validation (PIN, mobile, states), CSV, ids
├─ public/
│  ├─ css/tokens.css            Design tokens (colours, type, radii, shadows) — rebrand here
│  ├─ css/base.css, store.css, admin.css
│  ├─ js/lib/                   api, format (₹/en-IN), session, cart store, icons, page bootstrap
│  ├─ js/components/            header, footer, cartDrawer, chatbot, productCard, quickView,
│  │                            gallery (zoom), share, mapPicker, addressForm, summary, toast
│  ├─ js/pages/                 one script per storefront page
│  ├─ admin/                    admin pages + admin/js (layout, ui kit, charts, one script per page)
│  ├─ chatbot/flows.json        ALL chatbot intents, keywords, replies and quick replies
│  ├─ images/products/<slug>/   main.jpg, alt.jpg, closeup.jpg for each of the 50 products
│  └─ uploads/                  Admin image uploads (git-ignored)
├─ data/                        Runtime JSON data (git-ignored; generated from scripts/seed.js)
├─ storage/outbox/              Generated emails (git-ignored)
├─ db/mysql/schema.sql          MySQL 8 schema — all tables, keys, constraints
├─ db/mysql/seed.sql            Seed data for the schema (generated)
├─ integrations/salesforce/     Object mapping (README.md) + adapter.stub.js
├─ scripts/                     seed, reset, export-sql, generate-images (+ lib/catalogue.js, lib/illustrations.js)
├─ tests/e2e.js                 Playwright end-to-end suite
└─ docs/                        screenshots/ and test-report.md
```

## 5. Architecture

```
Browser (HTML + ES modules)  ──fetch──▶  Express /api  ──▶  routes  ──▶  services  ──▶  repositories  ──▶  JSON files (/data)
       │                                       │                         │                                   (swap → MySQL / Salesforce)
       │                                       │                         ├─ PaymentProvider (dummy | razorpay)
       │                                       │                         ├─ Email service (outbox | SMTP via Nodemailer)
       │                                       │                         └─ ReviewsService / CustomersService (mock | mysql | salesforce)
       └─ /product/<slug>  ──▶ server injects Open Graph + JSON-LD into product.html
```

* **Layering.** Routes never read files; they call services and repositories. Each entity has one repository module with a small, storage-agnostic API (`findById`, `findBySlug`, `create`, `update`, …).
* **Auth.** Passwords hashed with **bcryptjs**. The session is a signed **JWT in an httpOnly, SameSite=Lax cookie** (`hh_session`). Roles: `user`, `admin`. `/api/admin/*` requires an admin, and `/admin/*.html` pages redirect to the admin login on the server.
* **Pricing.** All prices are GST-inclusive. Effective price = sale price (if inside its window) or selling price, minus the best active promotion. The cart total is subtotal − coupon + delivery. GST is shown as "included" and apportioned after the coupon.
* **Cart.** Guests: `localStorage` + `POST /api/cart/quote` for live pricing. Logged in: server cart (`/api/cart`). On login or registration the guest cart (and coupon) is merged into the server cart.
* **Orders.** Placing an order reserves stock and counts coupon usage. Status workflow: `Placed → Confirmed → Packed → Shipped → Out for delivery → Delivered`, plus `Cancelled` and `Returned` (both restock). Online orders start as `Pending Payment`.
* **Libraries are served locally** from `node_modules` (`/vendor/chart.js`, `/vendor/leaflet`) — no CDN. The only external calls happen in the browser: Google Maps JS API (if a key is set) and OpenStreetMap tiles.

## 6. Plugging in the real services

### Razorpay (payments)
1. `npm install razorpay`
2. In `.env`: `PAYMENT_PROVIDER=razorpay`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
3. Finish `src/services/payments/razorpay.provider.js`. The methods (`createOrder`, `verifyPaymentSignature`, `capture`, `refund`, `handleWebhook`) already match the `PaymentProvider` interface, and signature verification is implemented.
4. On `payment.html`, replace the simulated form with Razorpay Checkout (`checkout.razorpay.com/v1/checkout.js`), passing `key`, `order_id = order.gateway.orderId` and `amount`. In the `handler`, POST `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` to **`/api/payments/verify`**. That endpoint, and everything after it (capture, order → Placed/paid, emails), is unchanged.
5. Point a Razorpay webhook to `POST /api/payments/webhook`. Handle `payment.captured`, `payment.failed` and `refund.processed` there to cover users who close the browser.

### MySQL (data)
1. Create the schema: `mysql -u root -p < db/mysql/schema.sql`, then load demo data: `mysql -u root -p < db/mysql/seed.sql`. Both were validated on MariaDB.
2. `npm install mysql2`, set the `MYSQL_*` values and `DATA_PROVIDER=mysql` in `.env`.
3. Implement MySQL versions of the modules in `src/repositories/`, keeping the same method names, and select them in `src/repositories/index.js` based on `config.dataProvider`. Customers and reviews have ready-made TODO adapters in `src/services/*/mysql.adapter.js` (set `CUSTOMERS_PROVIDER=mysql` / `REVIEWS_PROVIDER=mysql`).
4. Orders and payments in the JSON seed are generated relative to today. Migrate real data with a one-off script that reads `/data/*.json` and inserts it.

### Salesforce (CRM)
See **`integrations/salesforce/README.md`** for the object mapping (Person Account, Product2, PricebookEntry, Order/OrderItem, Payment, Case, and a custom `HH_Product_Review__c`) and the sync strategy. A `jsforce` adapter stub is in `integrations/salesforce/adapter.stub.js`. Enable it per area with `CUSTOMERS_PROVIDER=salesforce` and `REVIEWS_PROVIDER=salesforce`.

### SMTP (emails)
Set SMTP host, port, user, password and from address in **Admin → Email settings** (stored in `data/settings.json`) or in `.env` (`SMTP_*`, `MAIL_FROM`). Real sending needs **both** `DEMO_MODE=false` in `.env` **and** the "Demo mode" box unticked in Email settings. Every email is still written to the outbox for audit. Use "Send test email" to verify.

### Google Maps (address pin)
Set `GOOGLE_MAPS_API_KEY=...` in `.env` and enable the **Maps JavaScript API** for that key. Restrict the key to your domain. Without a key (the default), the same pin picker runs on **Leaflet + OpenStreetMap** with a small notice. Saved addresses store `lat`, `lng` and a `https://www.google.com/maps?q=lat,lng` link either way.

## 7. Feature list and status

✅ done · 🟡 done with a demo limitation · 🧪 mock by design

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Home: hero slider (autoplay, swipe, pause, CMS-managed) + Bento grid (latest, offers + deal of the day, categories, best sellers, coupon, promo) | ✅ | Everything driven by CMS + product data |
| 2 | 50 products, 7 categories / 17 subcategories, invented brands, full product fields; listing with filters, sort, search, pagination, breadcrumbs | ✅ | Filters are kept in the URL (shareable, back button works) |
| 3 | Original generated images, 3 views per product, paths stored in data | ✅ | `public/images/products/<slug>/{main,alt,closeup}.jpg`; replace via admin upload |
| 4 | Stable share URLs `/product/<slug>` with server-side OG + JSON-LD; Web Share, copy link, WhatsApp, copy image link | ✅ | OG image is a JPG so WhatsApp previews work once the site is public |
| 5 | Quick View modal (listing + home trending cards) | ✅ | |
| 6 | Zoom: desktop hover lens; mobile tap → fullscreen viewer with pinch, double-tap, pan, swipe | ✅ | |
| 7 | Cart: drawer + page, guest localStorage, merge on login, coupon field, full breakdown | ✅ | |
| 8 | Register, login, logout, forgot/reset password (email to outbox), demo accounts on login | ✅ | |
| 9 | Multiple addresses, Indian validation (PIN, +91 mobile, state list), map pin + "use my current location", lat/lng + Maps link saved | 🟡 | Google Maps path is implemented but untested without a key. Leaflet fallback is tested. OSM tiles were blocked in the build sandbox, so the screenshots show a grey map |
| 10 | COD vs online, Standard/Express delivery charges, COD limit configurable | ✅ | |
| 11 | Dummy gateway (UPI countdown, card Luhn/expiry/CVV, OTP), authorise → verify signature → capture, payment records, `PaymentProvider` interface + Razorpay stub | ✅ | |
| 12 | Emails: Nodemailer + SMTP config, demo outbox, 10 branded templates, status-change emails | ✅ | Real SMTP sending not exercised (demo mode) |
| 13 | Admin dashboard: KPIs, sales chart, recent orders, top products, low stock | ✅ | |
| 14 | Catalogue CRUD, categories/subcategories, image upload (multer), stock, pricing, tags, CSV import/export | ✅ | |
| 15 | Orders: filters, search, detail, status workflow, notes, printable GST invoice | ✅ | CGST+SGST for Tamil Nadu buyers, IGST otherwise |
| 16 | Coupons: flat/%, min order, max discount, dates, per-user + overall limits, category restriction, clear messages | ✅ | |
| 17 | Promotions: sale prices, category/product discounts, scheduled windows, deal of the day, badges, Offers tile | ✅ | |
| 18 | CMS: banners, bento blocks, announcement, footer, static pages, contact info/FAQ, store name + logo | ✅ | |
| 19 | Sales reports: date range, day/week/month, by category, by payment method, top products, COD vs online, states, charts, CSV | ✅ | |
| 20 | Payments admin: list + filters, detail/timeline, dummy refund (full/partial), reconciliation | ✅ | |
| 21 | Email configuration page: SMTP, per-type toggles, test email, template preview, outbox viewer | ✅ | |
| 22 | Reviews + Customers admin screens and product-page review UI on `ReviewsService` / `CustomersService` interfaces | 🧪 | Clearly marked mock data, in memory only. TODO adapters for MySQL and Salesforce |
| 23 | Contact page: form (stored + admin email), address, phone, email, WhatsApp, map, hours, FAQ | ✅ | Enquiries listed under Admin → Customers |
| 24 | Rule-based chatbot on every storefront page; flows in `public/chatbot/flows.json` | ✅ | Categories, product search, offers, coupons, delivery, COD vs online, order tracking (API), returns, account help, human handoff, fallback menu |
| 25 | Mobile-first responsive (360/768/1280+), hamburger + bottom nav, sticky add-to-cart, touch-friendly | ✅ | Automated check for horizontal scroll at 360, 390, 768 and 1366 px |

## 8. Decisions & assumptions

* **Where the code lives.** The run could not reach the GitHub repo-attachment tools (`list_repos` / `add_repo` were not available) and the sandbox's GitHub CLI token was invalid. So the code was built as a **local git repository** (`~/household-ecommerce`) and delivered as a zip that keeps the full `.git` history. Nothing was pushed, and no GitHub repo was created or changed. To publish it: create an empty `RK1405/household-ecommerce`, then `git remote add origin … && git push -u origin main`.
* **Store name** "HomeHaat" (*haat* = traditional market) is an invented placeholder, set only in CMS data. All brands (Rasoi Pro, Sundaram Steel, Kaveri Home, Aangan, Dhaaga, Nivaas, Tara Lights, SwachhLine, Ghar Craft, Sahaj, Neelam Linen, UrjaTech) are fictional.
* **Express 5** with CommonJS on the server and native ES modules in the browser. No build step and no frontend framework, as specified.
* **Session:** a signed JWT in an httpOnly cookie (not express-session), so sessions survive server restarts without a session store. The TTL is set by `SESSION_TTL_HOURS`.
* **Data:** runtime JSON lives in `/data` and is git-ignored. It is **generated by `scripts/seed.js`** on first start, so order dates are always "recent" for the dashboards. `npm run reset` restores the demo state.
* **Checkout requires login.** Guests can browse and build a cart, which merges on login or registration. Guest checkout was left out to keep addresses and order tracking tied to an account.
* **Prices are GST-inclusive** (the norm for Indian B2C). GST rates are plausible placeholders (0/5/12/18%). Delivery is treated as a service at 18% GST on the invoice. **Have a CA confirm the HSN codes and rates** before going live.
* **Delivery:** Standard ₹79 (free at ₹999+) in 4–6 days; Express ₹149 in 1–2 days. COD allowed up to ₹10,000. All editable in Admin → Store settings.
* **Stock** is reserved when the order is placed (including `Pending Payment` online orders). It is released on Cancel or Return. A failed online payment leaves the order in `Pending Payment` so the customer can retry. Admin or customer can cancel it to release stock.
* **Cancelling or returning a paid online order** refunds it automatically through the payment provider and sends the cancellation and refund emails.
* **Images** are original vector illustrations rendered to JPG (no stock photos could be downloaded). There are 3 views per product: main, alternate, close-up. Real photos can replace them through the admin upload.
* **Fonts:** a system font stack (Inter or Poppins are used if installed locally). This avoids bundling font files or calling Google Fonts.
* **Chatbot** is deterministic keyword/intent matching (no AI). Order tracking returns only status information (no personal data), keyed by order number.
* **Reviews and Customers** are intentionally not connected to storage (spec item 22). The *Contact enquiries* list on the Customers page is real data.
* **PIN-code delivery check** on the product page is a demo estimate (no courier API).
* **Demo mode** (`DEMO_MODE=true`) shows demo credentials and forces every email into the outbox, whatever the SMTP settings say.

## 9. Known gaps / next steps

1. **Push to GitHub** (see above) and choose hosting. Set `BASE_URL`, a strong `SESSION_SECRET`, `NODE_ENV=production` (enables `Secure` cookies) and HTTPS.
2. **Razorpay:** finish `razorpay.provider.js`, add Checkout on `payment.html` and set up webhooks (§6). Add a "switch to COD" option after a failed payment.
3. **MySQL repositories:** the schema and seed are ready; the repository implementations are not. Same for the Reviews/Customers MySQL/Salesforce adapters.
4. **Google Maps:** test with a real key. Optionally add Places autocomplete and reverse geocoding to pre-fill city, state and PIN from the pin.
5. **Security hardening for production:** CSRF tokens (SameSite=Lax cookies mitigate most cases today), rate limiting beyond the login limiter, HTML sanitising of CMS page content (currently trusted admin HTML), upload virus scanning, and audit logs for admin actions.
6. **Admin roles:** there is one `admin` role. Add granular roles (catalogue manager, support, finance) if needed.
7. **Couriers and serviceability:** integrate a courier API (e.g. Shiprocket or Delhivery) for real ETAs, AWBs and tracking webhooks.
8. **Accessibility:** keyboard, focus, alt text and contrast were built in and spot-checked. A full WCAG 2.1 AA audit with a screen reader is still to do.
9. **Wishlist, product variants (size/colour), GST invoices for customers in My Account, multi-language (Hindi/Tamil)** are not in scope and not built.
10. **Real product photography** to replace the generated illustrations.
11. The JSON store is fine for a single-process demo. Use MySQL before any multi-user testing.

## 10. Testing & QA

`npm run test:e2e` (Playwright, Chromium) resets the demo data, starts the server on port 3100 and runs **37 checks**:

register, both demo logins, forgot password · admin route protection · browse, filter, sort, search, paginate · quick view · zoom (lens + fullscreen) · share link OG tags + correct product + copy link/image link · guest cart persistence + merge on login · coupon messages (expired, invalid, valid) · address validation + map pin via current location · COD checkout + COD limit · UPI success/failure · card success/decline/invalid Luhn/wrong OTP · confirmation page · outbox emails (welcome, reset, order placed, payment success/failed, shipped, out for delivery, refund, contact) · admin status change → email · GST invoice · product, coupon and banner CRUD reflected on the storefront · reports + CSV · refund + reconciliation · email settings · every chatbot intent · every page at **360, 390, 768 and 1366 px** checked for console errors, broken images, missing alt text and horizontal scroll, plus the mobile sticky add-to-cart, tap-to-zoom and hamburger menu.

The latest run: **37/37 passed, 0 console/network issues** — see `docs/test-report.md`. Screenshots are in `docs/screenshots/` (`home-desktop.png`, `home-mobile.png`, `product-desktop.png`, `product-mobile.png`, `admin-dashboard.png`, …).

## 12. MySQL mode and Render deployment

`DATA_PROVIDER=mysql` stores everything in MySQL instead of `/data` files: records go in table `hh_documents` (one JSON row per record), admin uploads and email HTML in `hh_files`. Tables are created and the demo data is seeded automatically on first start. All data is cached in memory and written through to MySQL, so **run a single app instance**. `npm run reset` wipes and re-seeds the MySQL tables. The relational `db/mysql/schema.sql` is for the later move to normalised tables and is not used by this mode.

Deploy: create a MySQL database (e.g. TiDB Cloud Serverless), then on Render create a Blueprint from this repo (`render.yaml`) and set `MYSQL_URL` and `BASE_URL`. The free Render plan sleeps after ~15 minutes idle.
