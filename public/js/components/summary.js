/** Price breakdown + coupon form shared by cart and checkout. */
import { esc, inr, inr2 } from '../lib/format.js';
import { applyCoupon } from '../lib/cart.js';
import { toast } from './toast.js';

export function summaryHtml(q, { coupon = true, title = 'Price details' } = {}) {
  return `<div class="card card-pad summary"><h3>${title}</h3>
    ${coupon ? `<form class="coupon-form" id="coupon-form" novalidate><label for="coupon" class="sr-only">Coupon code</label><input class="input" id="coupon" name="code" placeholder="Have a coupon?" value="${esc(q.coupon?.code || '')}" autocomplete="off" maxlength="20">${q.coupon?.valid ? '<button type="button" class="btn btn-light" id="coupon-remove">Remove</button>' : '<button class="btn btn-outline">Apply</button>'}</form>
      <p class="coupon-msg ${q.coupon ? (q.coupon.valid ? 'ok' : 'err') : ''}" id="coupon-msg" role="status">${q.coupon ? esc(q.coupon.message) : '<span class="muted">Try WELCOME10, FESTIVE250 or KITCHEN15</span>'}</p><hr class="divider">` : ''}
    <dl>
      <dt>Total MRP (${q.itemCount} items)</dt><dd>${inr(q.mrpTotal)}</dd>
      ${q.mrpTotal > q.subtotal ? `<dt>Discount on MRP</dt><dd class="save">− ${inr(q.mrpTotal - q.subtotal)}</dd>` : ''}
      <dt>Subtotal</dt><dd>${inr(q.subtotal)}</dd>
      ${q.discount ? `<dt>Coupon (${esc(q.coupon.code)})</dt><dd class="save">− ${inr(q.discount)}</dd>` : ''}
      <dt>Delivery (${esc(q.deliveryOptions.find((d) => d.key === q.deliveryMethod)?.label || '')})</dt><dd>${q.delivery ? inr(q.delivery) : '<span class="save">FREE</span>'}</dd>
      <dt class="xs muted">GST included in prices</dt><dd class="xs muted">${inr2(q.gst)}</dd>
      <dt class="total">Total payable</dt><dd class="total">${inr(q.total)}</dd>
    </dl>
    ${q.savings > 0 ? `<p class="save small mt-4 mb-0">🎉 You save ${inr(q.savings)} on this order</p>` : ''}
  </div>`;
}

export function bindCoupon(root, onChange) {
  const form = root.querySelector('#coupon-form'); if (!form) return;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const code = form.code.value.trim();
    const msg = root.querySelector('#coupon-msg');
    if (!code) { msg.className = 'coupon-msg err'; msg.textContent = 'Enter a coupon code'; return; }
    const btn = form.querySelector('button'); btn.classList.add('is-loading');
    const c = await applyCoupon(code); // invalid codes stay visible with their message but give no discount
    if (c?.valid) toast(c.message, { type: 'success' });
    onChange?.();
  };
  root.querySelector('#coupon-remove')?.addEventListener('click', async () => { await applyCoupon(null); onChange?.(); });
}
