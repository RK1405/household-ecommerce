import { initPage, requireLogin } from '../lib/page.js';
import { get } from '../lib/api.js';
import { esc, inr, inr2, dateTime, statusBadge } from '../lib/format.js';
import { formatAddress } from '../components/addressForm.js';
import { loadCart } from '../lib/cart.js';

const s = await initPage();
if (!requireLogin(s)) await new Promise(() => {});
loadCart();
const root = document.getElementById('conf-root');
try {
  const o = await get(`/api/orders/${encodeURIComponent(new URLSearchParams(location.search).get('order'))}`);
  const pending = o.paymentMethod === 'ONLINE' && o.paymentStatus !== 'paid';
  const eta = s.config.delivery[o.deliveryMethod]?.eta;
  root.innerHTML = `<div class="card card-pad" style="text-align:center">
      <div class="result-icon ${pending ? 'fail' : 'ok'}">${pending ? '!' : '✓'}</div>
      <h1 style="font-size:1.8rem">${pending ? 'Payment pending' : 'Thank you! Your order is placed 🎉'}</h1>
      <p class="muted">Order <strong>${esc(o.orderNo)}</strong> · ${dateTime(o.createdAt)}</p>
      <p>${pending ? 'We have not received your payment yet.' : `A confirmation email has been sent to <strong>${esc(o.customer.email)}</strong>. Estimated delivery: <strong>${esc(eta)}</strong>.`}</p>
      <div class="row" style="justify-content:center">${pending ? `<a class="btn btn-accent" href="/payment.html?order=${o.id}">Complete payment</a>` : `<a class="btn" href="/account.html#orders">Track order</a>`}<a class="btn btn-light" href="/products.html">Continue shopping</a></div>
    </div>
    <div class="grid mt-5" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      <div class="card card-pad"><h3>Delivery address</h3><p class="small mb-0"><strong>${esc(o.shippingAddress.name)}</strong> · +91 ${esc(o.shippingAddress.phone)}<br>${formatAddress(o.shippingAddress)}</p>${o.shippingAddress.mapsUrl ? `<a class="xs" href="${esc(o.shippingAddress.mapsUrl)}" target="_blank" rel="noopener">📍 Map pin</a>` : ''}</div>
      <div class="card card-pad"><h3>Payment</h3><p class="small mb-0">${o.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Online'} ${statusBadge(o.paymentStatus)}<br>${o.payments.filter((p) => p.status === 'captured').map((p) => `${esc(p.method)} · ${esc(p.id)}`).join('<br>')}<br>Delivery: ${esc(o.deliveryMethod)} · Status ${statusBadge(o.status)}</p></div>
    </div>
    <div class="card card-pad mt-5 summary"><h3>Order summary</h3>
      ${o.items.map((i) => `<div class="row" style="gap:10px;flex-wrap:nowrap;margin-bottom:10px"><img src="${i.image}" alt="" style="width:56px;height:56px;border-radius:10px"><a href="/product/${i.slug}" class="small" style="flex:1">${esc(i.name)} × ${i.qty}</a><strong>${inr(i.lineTotal)}</strong></div>`).join('')}
      <hr class="divider"><dl><dt>Subtotal</dt><dd>${inr(o.totals.subtotal)}</dd>${o.totals.discount ? `<dt>Coupon ${esc(o.totals.couponCode)}</dt><dd class="save">− ${inr(o.totals.discount)}</dd>` : ''}<dt>Delivery</dt><dd>${o.totals.delivery ? inr(o.totals.delivery) : 'FREE'}</dd><dt class="xs muted">GST included</dt><dd class="xs muted">${inr2(o.totals.gst)}</dd><dt class="total">Total</dt><dd class="total">${inr(o.totals.total)}</dd></dl></div>`;
} catch (e) {
  root.innerHTML = `<div class="card empty"><div class="emoji">🤔</div><h2>Order not found</h2><p>${esc(e.message)}</p><a class="btn" href="/account.html#orders">My orders</a></div>`;
}
