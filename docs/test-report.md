# E2E test report

Run: 2026-11-17T20:56:15.102Z · 37/37 checks passed

| Result | Check | Time |
|---|---|---|
| ✅ | Home page renders slider and CMS bento blocks | 0.5s |
| ✅ | Register a new account (welcome email in outbox) | 0.8s |
| ✅ | Forgot password writes a reset email to the outbox | 0.3s |
| ✅ | Admin demo account can log in (and is blocked from nothing on storefront) | 0.6s |
| ✅ | Admin pages are protected server-side | 0.1s |
| ✅ | Browse, filter (category + subcategory + in-stock + offers), sort and paginate | 1.6s |
| ✅ | Quick view opens with gallery, price and add-to-cart | 1.6s |
| ✅ | Product zoom: hover lens on desktop + fullscreen viewer | 0.5s |
| ✅ | Shareable link serves Open Graph tags and opens the right product; images have direct URLs | 0.6s |
| ✅ | Cart persists for guests (localStorage) and shows price breakdown | 0.6s |
| ✅ | Coupons: invalid/expired messages and valid discount | 0.5s |
| ✅ | Login merges guest cart into the server cart (user@demo.com) | 0.4s |
| ✅ | Add an address with Indian validation and a map pin (current location) | 1.2s |
| ✅ | Checkout with Cash on Delivery → confirmation + order email | 0.8s |
| ✅ | COD limit rule blocks COD above ₹10,000 | 0.6s |
| ✅ | Online payment: UPI success | 10.7s |
| ✅ | Online payment: UPI failure (fail@upi) + retry screen | 9.2s |
| ✅ | Online payment: Card success (Luhn + OTP 123456) | 2.7s |
| ✅ | Online payment: Card decline (4000 0000 0000 0002) | 1.0s |
| ✅ | Card form rejects an invalid (non-Luhn) number | 0.3s |
| ✅ | Account shows orders with tracking timeline | 0.2s |
| ✅ | Contact form stores the message and emails the admin (outbox) | 0.4s |
| ✅ | Chatbot answers every intent (rule-based) | 6.8s |
| ✅ | Dashboard KPIs, chart, recent orders and low stock | 0.9s |
| ✅ | Order status change (Shipped) sends the email to the outbox | 1.3s |
| ✅ | GST invoice renders | 0.1s |
| ✅ | Admin product CRUD (create, edit, delete) reflects on the storefront | 2.7s |
| ✅ | Admin coupon CRUD works at the storefront cart | 0.4s |
| ✅ | Admin banner CRUD (create, delete) reflects in the home slider | 1.0s |
| ✅ | Sales reports render charts and tables | 1.4s |
| ✅ | Payments: reconciliation and dummy refund | 1.1s |
| ✅ | Email settings: test email + template preview + outbox list | 0.3s |
| ✅ | Every admin page loads without errors | 7.3s |
| ✅ | No console errors, broken images or horizontal scroll at 360px | 13.5s |
| ✅ | No console errors, broken images or horizontal scroll at 390px | 15.0s |
| ✅ | No console errors, broken images or horizontal scroll at 768px | 12.4s |
| ✅ | No console errors, broken images or horizontal scroll at 1366px | 13.3s |

## Console / network issues (0)

None.
