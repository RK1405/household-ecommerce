import { initPage } from '../lib/page.js';
import { get, post } from '../lib/api.js';
import { esc, inr, date, stars } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { addToCart } from '../lib/cart.js';
import { createGallery } from '../components/gallery.js';
import { shareButtons } from '../components/share.js';
import { toast } from '../components/toast.js';
import { productCard, bindProductActions, badgeHtml, priceHtml } from '../components/productCard.js';
import { openCartDrawer } from '../components/cartDrawer.js';

const s = await initPage({ active: 'shop' });
bindProductActions();
const slug = location.pathname.startsWith('/product/') ? decodeURIComponent(location.pathname.split('/')[2]) : new URLSearchParams(location.search).get('slug');

let p;
try { p = await get(`/api/products/${encodeURIComponent(slug || '')}`); }
catch {
  document.getElementById('pdp').innerHTML = `<div class="empty"><div class="emoji">🧐</div><h1 style="font-size:1.6rem">Product not found</h1><p>It may have been removed or the link is incorrect.</p><a class="btn" href="/products.html">Browse products</a></div>`;
  throw new Error('not found');
}
document.title = `${p.name} | ${s.cms.store.name}`;
if (!location.pathname.startsWith('/product/')) history.replaceState(null, '', `/product/${p.slug}${location.hash}`);

document.getElementById('crumbs').innerHTML = `<li><a href="/">Home</a></li><li><a href="/products.html?category=${p.category}">${esc(p.categoryName)}</a></li><li><a href="/products.html?category=${p.category}&subcategory=${p.subcategory}">${esc(p.subcategoryName)}</a></li><li aria-current="page">${esc(p.name)}</li>`;
const pr = p.pricing;
const maxQty = Math.min(10, p.stock);
document.getElementById('pdp').innerHTML = `<div class="pdp">
  <div id="gallery"></div>
  <div class="pdp-info">
    <a class="small" href="/products.html?brand=${encodeURIComponent(p.brand)}" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase">${esc(p.brand)}</a>
    <h1>${esc(p.name)}</h1>
    <div class="pdp-meta"><a href="#reviews" class="row" style="gap:6px" data-goto-reviews><span class="rating-pill">${p.rating} ★</span><span>${p.ratingCount} ratings</span></a><span>SKU: ${esc(p.sku)}</span></div>
    <div class="row" style="gap:6px;margin-bottom:10px">${pr.badges.map(badgeHtml).join('')}</div>
    <div class="pdp-price">${priceHtml(p)}</div>
    <p class="xs muted">MRP inclusive of all taxes · GST ${p.gstRate}% included${pr.promotion ? ` · ${esc(pr.promotion.name)} applied` : ''}${pr.onSale ? ` · Sale ends ${date(pr.saleEnd)}` : ''}</p>
    ${pr.promotion?.dealOfDay ? `<div class="alert alert-warning">⚡ <strong>Deal of the Day</strong> — extra ${inr(pr.promotion.amount)} off, today only.</div>` : ''}
    <p style="font-weight:700;color:${p.inStock ? (p.lowStock ? 'var(--c-warning)' : 'var(--c-success)') : 'var(--c-danger)'}">${p.inStock ? (p.lowStock ? `Hurry! Only ${p.stock} left in stock` : '✓ In stock') : 'Currently out of stock'}</p>
    <p class="small" id="return-note" style="margin:0 0 8px">${p.returnPolicy?.days > 0 ? `↩️ <strong>${p.returnPolicy.days}-day easy returns</strong> <span class="muted">· free pickup</span>` : `🚫 <strong>No returns</strong> <span class="muted">${p.returnPolicy?.reason === 'under-min-price' ? `· products under ${inr(p.returnPolicy.minPrice)} are not returnable` : '· this product is not returnable'}</span>`}</p>
    <div class="buy-row" id="buy-row">
      <div class="qty" id="qty"><button type="button" data-d="-1" aria-label="Decrease quantity">−</button><input id="qty-input" type="number" min="1" max="${maxQty || 1}" value="1" aria-label="Quantity"><button type="button" data-d="1" aria-label="Increase quantity">+</button></div>
      <button class="btn btn-outline btn-lg" id="add-btn" ${p.inStock ? '' : 'disabled'}>${icon('cart')} Add to cart</button>
      <button class="btn btn-accent btn-lg" id="buy-btn" ${p.inStock ? '' : 'disabled'}>Buy now</button>
    </div>
    <h3 class="mt-4">Highlights</h3>
    <ul class="highlights">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    <div class="delivery-box mt-4">
      <div class="row" style="gap:8px">${icon('truck')}<strong>Check delivery</strong></div>
      <form class="row mt-4" id="pin-form" style="gap:8px"><label for="pin" class="sr-only">PIN code</label><input class="input" id="pin" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit PIN code" style="max-width:220px;min-height:40px"><button class="btn btn-sm">Check</button></form>
      <p class="small mt-4 mb-0" id="pin-msg">Standard: ${inr(s.config.delivery.standard.charge)} (FREE above ${inr(s.config.delivery.standard.freeAbove)}) · ${esc(s.config.delivery.standard.eta)}<br>Express: ${inr(s.config.delivery.express.charge)} · ${esc(s.config.delivery.express.eta)}<br>💵 Cash on Delivery available · ↩️ 7-day easy returns</p>
    </div>
    <div class="mt-4"><h3>Share this product</h3><div id="share"></div></div>
  </div></div>`;

const gal = createGallery(document.getElementById('gallery'), p.images, { name: p.name });
shareButtons(document.getElementById('share'), { title: p.name, text: `${p.name} for ${inr(pr.finalPrice)} on ${s.cms.store.name}`, path: `/product/${p.slug}`, getImage: gal.current });

const qtyInput = document.getElementById('qty-input');
document.getElementById('qty').onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) qtyInput.value = Math.max(1, Math.min(maxQty || 1, Number(qtyInput.value) + Number(b.dataset.d))); };
async function add(btn, thenCheckout) {
  btn.classList.add('is-loading');
  try {
    await addToCart(p.id, Math.max(1, Math.min(maxQty, Number(qtyInput.value) || 1)));
    if (thenCheckout) location.href = '/checkout.html';
    else { toast('Added to cart', { type: 'success', action: { label: 'Checkout', href: '/checkout.html' } }); openCartDrawer(); }
  } catch (e) { toast(e.message, { type: 'error' }); } finally { btn.classList.remove('is-loading'); }
}
document.getElementById('add-btn').onclick = (e) => add(e.currentTarget);
document.getElementById('buy-btn').onclick = (e) => add(e.currentTarget, true);
document.getElementById('pin-form').onsubmit = (e) => {
  e.preventDefault();
  const v = document.getElementById('pin').value.trim(), m = document.getElementById('pin-msg');
  if (!/^[1-9]\d{5}$/.test(v)) { m.innerHTML = '<span style="color:var(--c-danger)">Please enter a valid 6-digit PIN code.</span>'; return; }
  const d = new Date(Date.now() + (p.stock > 0 ? 5 : 8) * 864e5);
  m.innerHTML = `✅ Delivers to <strong>${v}</strong> by <strong>${date(d.toISOString(), { weekday: 'short', day: 'numeric', month: 'short' })}</strong> (Standard) · Express available<br><span class="xs muted">Demo estimate — connect a courier serviceability API later.</span>`;
};

// Sticky add-to-cart bar (mobile) appears once the main buy row scrolls out of view
const sticky = document.getElementById('sticky-buy');
sticky.innerHTML = `<div>${priceHtml(p)}</div><button class="btn btn-accent" id="sticky-add" ${p.inStock ? '' : 'disabled'}>${icon('cart')} Add to cart</button>`;
document.getElementById('sticky-add').onclick = (e) => add(e.currentTarget);
new IntersectionObserver(([en]) => { const show = !en.isIntersecting && en.boundingClientRect.top < 0; sticky.classList.toggle('show', show); sticky.setAttribute('aria-hidden', String(!show)); document.body.classList.toggle('has-sticky', show); }).observe(document.getElementById('buy-row'));

// Tabs
const sec = document.getElementById('details-section'); sec.hidden = false;
document.getElementById('tab-desc').innerHTML = `<p>${esc(p.description)}</p><ul class="highlights">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul><p class="xs muted">Images are original illustrations for this demo and can be replaced with photos from Admin → Products.</p>`;
document.getElementById('tab-specs').innerHTML = `<div class="table-wrap"><table class="table"><tbody>${[['Brand', p.brand], ['SKU', p.sku], ['Category', `${p.categoryName} › ${p.subcategoryName}`], ['MRP', inr(p.mrp)], ['GST rate', `${p.gstRate}%`], ['HSN code', p.hsn || '—'], ['Approx. weight', `${p.weightKg} kg`], ['Country of origin', 'India']].map(([k, v]) => `<tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>`;
const tabs = [...sec.querySelectorAll('[role=tab]')];
const selectTab = (t) => { tabs.forEach((x) => { x.setAttribute('aria-selected', String(x === t)); document.getElementById(x.getAttribute('aria-controls')).hidden = x !== t; }); };
tabs.forEach((t) => (t.onclick = () => selectTab(t)));
document.querySelector('[data-goto-reviews]').onclick = (e) => { e.preventDefault(); selectTab(document.getElementById('t-rev')); sec.scrollIntoView({ behavior: 'smooth' }); };
if (location.hash === '#reviews') { selectTab(document.getElementById('t-rev')); setTimeout(() => sec.scrollIntoView(), 300); }

// Reviews (mock service — not persisted)
async function loadReviews() {
  const r = await get(`/api/products/${p.slug}/reviews`);
  const sm = r.summary;
  document.getElementById('reviews').innerHTML = `<div class="mock-banner">🧪 Reviews use <strong>mock data</strong> (ReviewsService mock adapter). They will be connected to MySQL/Salesforce later — new reviews are not saved permanently.</div>
    <div class="review-summary"><div><div class="big-rating">${sm.average || '—'}</div><div class="stars"><span class="s">${stars(sm.average)}</span></div><p class="small muted">${sm.count} reviews</p>
      ${[5, 4, 3, 2, 1].map((n) => `<div class="dist-row"><span>${n}★</span><div class="bar"><span style="width:${sm.count ? (sm.distribution[n] / sm.count) * 100 : 0}%"></span></div><span class="xs muted">${sm.distribution[n]}</span></div>`).join('')}
      <button class="btn btn-outline btn-sm mt-4" id="write-review">Write a review</button></div>
    <div><form id="review-form" class="card card-pad mb-4" hidden>
      <h3>Rate this product</h3>
      <div class="star-input" role="radiogroup" aria-label="Rating">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="r${n}" name="rating" value="${n}"><label for="r${n}" title="${n} stars">★</label>`).join('')}</div>
      <div class="field mt-4"><label for="rv-title">Title</label><input class="input" id="rv-title" name="title" maxlength="80"></div>
      <div class="field"><label for="rv-body">Your review</label><textarea class="input" id="rv-body" name="body" maxlength="1000" required></textarea></div>
      ${s.user ? '' : '<div class="field"><label for="rv-name">Your name</label><input class="input" id="rv-name" name="name" maxlength="40"></div>'}
      <div class="row"><button class="btn">Submit review</button><button type="button" class="btn btn-ghost" id="rv-cancel">Cancel</button></div><p class="field-error" id="rv-err"></p></form>
      <div id="review-list">${r.items.map((x) => `<div class="review"><div class="row"><span class="rating-pill">${x.rating} ★</span><strong>${esc(x.title)}</strong></div><p class="mt-4 mb-0">${esc(x.body)}</p><p class="xs muted mb-0">${esc(x.name)} · ${date(x.createdAt)} ${x.verified ? '· ✔ Verified buyer' : ''}</p>${x.reply ? `<p class="small" style="background:var(--c-surface-2);padding:8px 12px;border-radius:8px;margin-top:8px"><strong>Seller reply:</strong> ${esc(x.reply.text)}</p>` : ''}</div>`).join('') || '<p class="muted">No reviews yet. Be the first!</p>'}</div></div></div>`;
  const f = document.getElementById('review-form');
  document.getElementById('write-review').onclick = () => { f.hidden = false; f.querySelector('input').focus(); };
  document.getElementById('rv-cancel').onclick = () => { f.hidden = true; };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(f));
    try { const res = await post(`/api/products/${p.slug}/reviews`, fd); toast(res.message, { type: 'success', timeout: 6000 }); f.reset(); f.hidden = true; }
    catch (err) { document.getElementById('rv-err').textContent = err.message; }
  };
}
loadReviews();
document.getElementById('related').innerHTML = p.related.slice(0, 4).map(productCard).join('');
