/** Mini-cart drawer (shared on every storefront page). */
import { esc, inr } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { onCart, setQty, removeItem, cartState } from '../lib/cart.js';

let drawer, overlay, lastFocus;

export function mountCartDrawer() {
  if (drawer) return;
  overlay = document.createElement('div'); overlay.className = 'overlay';
  drawer = document.createElement('aside');
  drawer.className = 'drawer'; drawer.id = 'cart-drawer'; drawer.setAttribute('aria-label', 'Shopping cart'); drawer.setAttribute('aria-hidden', 'true'); drawer.setAttribute('role', 'dialog');
  drawer.innerHTML = `<div class="drawer-head"><h3 class="mb-0">Your cart</h3><button class="icon-btn" data-close aria-label="Close cart">${icon('close')}</button></div><div class="drawer-body" id="cd-body"></div><div class="drawer-foot" id="cd-foot"></div>`;
  document.body.append(overlay, drawer);
  overlay.addEventListener('click', closeCartDrawer);
  drawer.querySelector('[data-close]').addEventListener('click', closeCartDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeCartDrawer(); });
  drawer.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const id = b.dataset.id; const line = cartState().items.find((i) => i.productId === id);
    b.disabled = true;
    if (b.dataset.act === 'inc') await setQty(id, (line?.qty || 0) + 1);
    if (b.dataset.act === 'dec') await setQty(id, (line?.qty || 1) - 1);
    if (b.dataset.act === 'rm') await removeItem(id);
  });
  onCart(render);
}

function render(state) {
  const q = state.quote; const body = drawer.querySelector('#cd-body'), foot = drawer.querySelector('#cd-foot');
  if (!q || !q.lines.length) {
    body.innerHTML = `<div class="empty"><div class="emoji">🛒</div><p>Your cart is empty.</p><a class="btn" href="/products.html">Start shopping</a></div>`;
    foot.innerHTML = ''; return;
  }
  body.innerHTML = (q.freeDeliveryGap > 0 ? `<div class="free-ship">Add <strong>${inr(q.freeDeliveryGap)}</strong> more for FREE standard delivery<div class="bar"><span style="width:${Math.min(100, 100 - (q.freeDeliveryGap / 999) * 100)}%"></span></div></div>` : `<div class="free-ship">🎉 You get FREE standard delivery</div>`) +
    q.lines.map((l) => `<div class="cart-line"><a href="/product/${l.slug}"><img src="${l.image}" alt="${esc(l.name)}"></a><div><a class="nm" href="/product/${l.slug}">${esc(l.name)}</a><div class="price"><span class="now" style="font-size:1rem">${inr(l.price)}</span>${l.mrp > l.price ? `<span class="mrp">${inr(l.mrp)}</span>` : ''}</div>
      <div class="row" style="margin-top:6px"><div class="qty sm"><button data-act="dec" data-id="${l.productId}" aria-label="Decrease quantity">−</button><input value="${l.qty}" aria-label="Quantity" readonly><button data-act="inc" data-id="${l.productId}" aria-label="Increase quantity" ${l.qty >= Math.min(10, l.stock) ? 'disabled' : ''}>+</button></div><button class="remove" data-act="rm" data-id="${l.productId}">Remove</button></div></div><strong>${inr(l.lineTotal)}</strong></div>`).join('') +
    (q.issues.length ? `<div class="alert alert-warning mt-4">${q.issues.map((i) => esc(i.message)).join('<br>')}</div>` : '');
  foot.innerHTML = `<div class="summary"><dl><dt>Subtotal (${q.itemCount} items)</dt><dd>${inr(q.subtotal)}</dd>${q.discount ? `<dt>Coupon ${esc(q.coupon.code)}</dt><dd class="save">− ${inr(q.discount)}</dd>` : ''}<dt>You save</dt><dd class="save">${inr(q.savings)}</dd></dl></div>
    <div class="row mt-4"><a class="btn btn-outline" style="flex:1" href="/cart.html">View cart</a><a class="btn btn-accent" style="flex:1" href="/checkout.html">Checkout</a></div>`;
}

export function openCartDrawer() {
  lastFocus = document.activeElement;
  drawer.classList.add('open'); overlay.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll');
  drawer.querySelector('[data-close]').focus();
}
export function closeCartDrawer() {
  drawer.classList.remove('open'); overlay.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll');
  lastFocus?.focus?.();
}
