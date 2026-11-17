import { initPage } from '../lib/page.js';
import { esc, inr } from '../lib/format.js';
import { onCart, setQty, removeItem } from '../lib/cart.js';
import { summaryHtml, bindCoupon } from '../components/summary.js';

const s = await initPage();
const root = document.getElementById('cart-root');

function render(state) {
  const q = state.quote;
  if (!q.lines.length) { root.innerHTML = `<div class="card empty"><div class="emoji">🛒</div><h2>Your cart is empty</h2><p>Explore our festive offers and household essentials.</p><a class="btn btn-accent" href="/products.html">Start shopping</a></div>`; return; }
  root.innerHTML = `<div class="cart-layout"><section class="card card-pad" aria-label="Cart items">
      ${q.freeDeliveryGap > 0 ? `<div class="free-ship">Add <strong>${inr(q.freeDeliveryGap)}</strong> more for FREE standard delivery<div class="bar"><span style="width:${Math.min(100, 100 - (q.freeDeliveryGap / 999) * 100)}%"></span></div></div>` : '<div class="free-ship">🎉 Your order qualifies for FREE standard delivery</div>'}
      ${q.issues.length ? `<div class="alert alert-warning">${q.issues.map((i) => esc(i.message)).join('<br>')}</div>` : ''}
      ${q.lines.map((l) => `<div class="cart-line"><a href="/product/${l.slug}"><img src="${l.image}" alt="${esc(l.name)}"></a>
        <div><span class="xs muted">${esc(l.brand)}</span><br><a class="nm" href="/product/${l.slug}">${esc(l.name)}</a>
          <div class="price"><span class="now" style="font-size:1rem">${inr(l.price)}</span>${l.mrp > l.price ? `<span class="mrp">${inr(l.mrp)}</span><span class="off">${Math.round(((l.mrp - l.price) / l.mrp) * 100)}% off</span>` : ''}</div>
          <div class="row" style="margin-top:8px"><div class="qty sm"><button data-act="dec" data-id="${l.productId}" aria-label="Decrease quantity of ${esc(l.name)}">−</button><input value="${l.qty}" aria-label="Quantity" readonly><button data-act="inc" data-id="${l.productId}" aria-label="Increase quantity of ${esc(l.name)}" ${l.qty >= Math.min(10, l.stock) ? 'disabled' : ''}>+</button></div><button class="remove" data-act="rm" data-id="${l.productId}">Remove</button></div></div>
        <strong class="nowrap">${inr(l.lineTotal)}</strong></div>`).join('')}
      <a class="link-btn mt-4" href="/products.html" style="display:inline-block">← Continue shopping</a>
    </section>
    <aside class="summary-col">${summaryHtml(q)}<a class="btn btn-accent btn-lg btn-block mt-4" href="/checkout.html" ${q.issues.some((i) => /out of stock/.test(i.message)) ? 'aria-disabled="true"' : ''}>Proceed to checkout →</a>
      <p class="xs muted mt-4">🔒 Safe & secure payments · 💵 COD available · ↩️ Easy 7-day returns</p></aside></div>`;
  bindCoupon(root);
}
onCart(render);
root.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const line = (await import('../lib/cart.js')).cartState().items.find((i) => i.productId === b.dataset.id);
  b.disabled = true;
  if (b.dataset.act === 'inc') await setQty(b.dataset.id, line.qty + 1);
  if (b.dataset.act === 'dec') await setQty(b.dataset.id, line.qty - 1);
  if (b.dataset.act === 'rm') await removeItem(b.dataset.id);
});
