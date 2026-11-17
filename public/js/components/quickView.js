/** Quick View modal: gallery, price, qty, add to cart, link to the full page. */
import { get } from '../lib/api.js';
import { esc } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { addToCart } from '../lib/cart.js';
import { createGallery } from './gallery.js';
import { toast } from './toast.js';
import { badgeHtml, priceHtml } from './productCard.js';

let modal, overlay, lastFocus;
function ensure() {
  if (modal) return;
  overlay = document.createElement('div'); overlay.className = 'overlay';
  modal = document.createElement('div'); modal.className = 'modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'qv-title');
  document.body.append(overlay, modal);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open') && !document.querySelector('.viewer.open')) close(); });
}
function close() { modal.classList.remove('open'); overlay.classList.remove('open'); document.body.classList.remove('no-scroll'); lastFocus?.focus?.(); }

export async function openQuickView(slug) {
  ensure(); lastFocus = document.activeElement;
  modal.innerHTML = `<div class="modal-head"><strong id="qv-title">Quick view</strong><button class="icon-btn" data-close aria-label="Close">${icon('close')}</button></div><div class="modal-body"><div class="qv-grid"><div class="skeleton" style="aspect-ratio:1"></div><div><div class="skeleton" style="height:28px;width:80%"></div><div class="skeleton mt-4" style="height:120px"></div></div></div></div>`;
  modal.querySelector('[data-close]').onclick = close;
  modal.classList.add('open'); overlay.classList.add('open'); document.body.classList.add('no-scroll');
  modal.querySelector('[data-close]').focus();
  try {
    const p = await get(`/api/products/${encodeURIComponent(slug)}`);
    modal.querySelector('.modal-body').innerHTML = `<div class="qv-grid"><div data-gal></div><div>
      <span class="brand-name small muted">${esc(p.brand)} · ${esc(p.subcategoryName || '')}</span>
      <h2 id="qv-title2" style="font-size:1.4rem;margin:.3rem 0">${esc(p.name)}</h2>
      <div class="row" style="gap:6px">${p.pricing.badges.map(badgeHtml).join('')}</div>
      <div class="row mt-4"><span class="rating-pill">${p.rating} ★</span><span class="small muted">${p.ratingCount} ratings</span></div>
      <div class="pdp-price mt-4">${priceHtml(p)}</div><p class="xs muted">Inclusive of all taxes (GST ${p.gstRate}%)</p>
      <ul class="highlights small">${p.highlights.slice(0, 3).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      <p class="small ${p.inStock ? (p.lowStock ? 'muted' : '') : ''}" style="color:${p.inStock ? (p.lowStock ? 'var(--c-warning)' : 'var(--c-success)') : 'var(--c-danger)'};font-weight:700">${p.inStock ? (p.lowStock ? `Hurry, only ${p.stock} left` : 'In stock') : 'Out of stock'}</p>
      <div class="buy-row"><div class="qty" data-qty><button type="button" data-d="-1" aria-label="Decrease">−</button><input type="number" min="1" max="${Math.min(10, p.stock)}" value="1" aria-label="Quantity"><button type="button" data-d="1" aria-label="Increase">+</button></div>
      <button class="btn btn-accent" data-add ${p.inStock ? '' : 'disabled'}>${icon('cart')} Add to cart</button></div>
      <a class="link-btn" href="/product/${p.slug}">View full details →</a></div></div>`;
    modal.querySelector('.modal-head strong').textContent = p.name;
    createGallery(modal.querySelector('[data-gal]'), p.images, { name: p.name, compact: true });
    const input = modal.querySelector('[data-qty] input');
    modal.querySelector('[data-qty]').onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) input.value = Math.max(1, Math.min(Number(input.max) || 10, Number(input.value) + Number(b.dataset.d))); };
    modal.querySelector('[data-add]').onclick = async (e) => {
      const b = e.currentTarget; b.classList.add('is-loading');
      try { await addToCart(p.id, Number(input.value) || 1); toast(`${p.name} added to cart`, { type: 'success', action: { label: 'Checkout', href: '/checkout.html' } }); close(); }
      catch (err) { toast(err.message, { type: 'error' }); } finally { b.classList.remove('is-loading'); }
    };
  } catch (e) {
    modal.querySelector('.modal-body').innerHTML = `<div class="alert alert-danger">${esc(e.message)}</div>`;
  }
}
