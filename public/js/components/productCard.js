/** Product card markup + delegated handlers (add to cart, quick view). */
import { esc, inr } from '../lib/format.js';
import { addToCart } from '../lib/cart.js';
import { toast } from './toast.js';
import { openQuickView } from './quickView.js';
import { openCartDrawer } from './cartDrawer.js';

export const badgeHtml = (b) => `<span class="badge badge-${b.type}">${esc(b.label)}</span>`;

export function priceHtml(p, cls = '') {
  const pr = p.pricing;
  return `<div class="price ${cls}"><span class="now">${inr(pr.finalPrice)}</span>${p.mrp > pr.finalPrice ? `<span class="mrp" aria-label="MRP">${inr(p.mrp)}</span><span class="off">${pr.discountPct}% off</span>` : ''}</div>`;
}

export function productCard(p) {
  const badges = p.pricing.badges.slice(0, 2);
  return `<article class="pcard fade-up" data-id="${p.id}">
    <div class="media">
      <a href="/product/${p.slug}" tabindex="-1" aria-hidden="true"><img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy" width="400" height="400">${p.images[1] ? `<img class="alt" src="${p.images[1]}" alt="" loading="lazy">` : ''}</a>
      <div class="badges">${badges.map(badgeHtml).join('')}</div>
      ${!p.inStock ? '<div class="oos">Out of stock</div>' : ''}
      <button class="btn btn-sm qv" data-qv="${p.slug}" aria-label="Quick view ${esc(p.name)}">Quick view</button>
    </div>
    <div class="body">
      <span class="brand-name">${esc(p.brand)}</span>
      <a class="name" href="/product/${p.slug}">${esc(p.name)}</a>
      <div class="row" style="gap:6px"><span class="rating-pill" aria-label="Rated ${p.rating} out of 5">${p.rating} ★</span><span class="xs muted">(${p.ratingCount})</span></div>
      ${priceHtml(p)}
      <button class="btn btn-sm btn-outline add" data-add="${p.id}" ${p.inStock ? '' : 'disabled'}>${p.inStock ? 'Add to cart' : 'Notify me'}</button>
    </div>
  </article>`;
}

export const skeletonCards = (n = 8) => Array.from({ length: n }, () => '<div class="skeleton skel-card" aria-hidden="true"></div>').join('');

let bound = false;
export function bindProductActions(root = document) {
  if (bound) return; bound = true;
  root.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      add.classList.add('is-loading'); add.disabled = true;
      try { await addToCart(add.dataset.add, 1); toast('Added to cart', { type: 'success', action: { label: 'View cart', href: '/cart.html' } }); }
      catch (err) { toast(err.message, { type: 'error' }); }
      finally { add.classList.remove('is-loading'); add.disabled = false; }
      return;
    }
    const qv = e.target.closest('[data-qv]');
    if (qv) { e.preventDefault(); openQuickView(qv.dataset.qv); }
  });
}
export { openCartDrawer };
