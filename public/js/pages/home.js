import { initPage } from '../lib/page.js';
import { get } from '../lib/api.js';
import { esc, inr, date } from '../lib/format.js';
import { productCard, bindProductActions, skeletonCards, priceHtml, badgeHtml } from '../components/productCard.js';
import { copyText } from '../components/share.js';

await initPage({ active: 'home' });
bindProductActions();
document.getElementById('trending').innerHTML = skeletonCards(4);

const home = await get('/api/home');
renderHero(home.banners);
renderBento(home.blocks);
get('/api/products?sort=rating&limit=8').then((r) => { document.getElementById('trending').innerHTML = r.items.map(productCard).join(''); });

/* ---------- Hero slider: autoplay, dots, arrows, swipe, pause on hover/focus, reduced-motion aware ---------- */
function renderHero(banners) {
  const el = document.getElementById('hero');
  if (!banners.length) { el.remove(); return; }
  el.innerHTML = `<div class="hero-track">${banners.map((b, i) => `<div class="hero-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${banners.length}: ${esc(b.title)}">
      <img src="${esc(b.image)}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>
      <div class="hero-copy"><span class="eyebrow" style="color:#ffd9b8">${esc(home.blocks.find((x) => x.type === 'coupon')?.coupon ? 'Festive season' : 'New season')}</span><h2>${esc(b.title)}</h2><p>${esc(b.subtitle)}</p>${b.ctaText ? `<div><a class="btn btn-accent" href="${esc(b.ctaLink)}" ${i ? 'tabindex="-1"' : ''}>${esc(b.ctaText)} →</a></div>` : ''}</div></div>`).join('')}</div>
    ${banners.length > 1 ? `<button class="hero-nav prev" aria-label="Previous slide">‹</button><button class="hero-nav next" aria-label="Next slide">›</button>
    <div class="hero-dots">${banners.map((_, i) => `<button aria-label="Go to slide ${i + 1}" aria-current="${i === 0}"></button>`).join('')}</div>
    <button class="hero-pause" aria-label="Pause slideshow">❚❚</button>` : ''}`;
  if (banners.length < 2) return;
  const track = el.querySelector('.hero-track'), dots = [...el.querySelectorAll('.hero-dots button')], slides = [...el.querySelectorAll('.hero-slide')];
  let i = 0, timer = null, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const go = (n) => {
    i = (n + banners.length) % banners.length;
    track.style.transform = `translateX(-${i * 100}%)`;
    dots.forEach((d, j) => d.setAttribute('aria-current', String(j === i)));
    slides.forEach((s, j) => { s.setAttribute('aria-hidden', String(j !== i)); s.querySelectorAll('a').forEach((a) => (a.tabIndex = j === i ? 0 : -1)); });
  };
  const start = () => { stop(); if (!paused) timer = setInterval(() => go(i + 1), 5000); };
  const stop = () => clearInterval(timer);
  el.querySelector('.prev').onclick = () => { go(i - 1); start(); };
  el.querySelector('.next').onclick = () => { go(i + 1); start(); };
  dots.forEach((d, j) => (d.onclick = () => { go(j); start(); }));
  const pauseBtn = el.querySelector('.hero-pause');
  pauseBtn.onclick = () => { paused = !paused; pauseBtn.textContent = paused ? '▶' : '❚❚'; pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow'); paused ? stop() : start(); };
  el.addEventListener('mouseenter', stop); el.addEventListener('mouseleave', start);
  el.addEventListener('focusin', stop); el.addEventListener('focusout', start);
  let sx = null;
  el.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; stop(); }, { passive: true });
  el.addEventListener('touchend', (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); sx = null; start(); });
  go(0); start();
}

/* ---------- Bento grid (CMS-driven blocks) ---------- */
function mini(p) { return `<a class="mini" href="/product/${p.slug}" data-qv-long="${p.slug}">${p.pricing.badges[0] ? badgeHtml(p.pricing.badges[0]) : ''}<img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy"><div class="t">${esc(p.name)}</div>${priceHtml(p)}</a>`; }

function countdown(el, endIso) {
  const tick = () => {
    const ms = Date.parse(endIso) - Date.now();
    if (ms <= 0) { el.textContent = 'Ended'; return; }
    const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
    el.textContent = h > 48 ? `${date(endIso)}` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  tick(); setInterval(tick, 1000);
}

function renderBento(blocks) {
  const html = blocks.map((b) => {
    switch (b.type) {
      case 'latest': return `<article class="tile tile-latest"><div class="tile-head"><div><span class="eyebrow">New</span><h3>${esc(b.title)}</h3><p class="small muted mb-0">${esc(b.subtitle)}</p></div><a class="link-btn small" href="/products.html?sort=newest">All new →</a></div><div class="mini-grid">${b.items.map(mini).join('')}</div></article>`;
      case 'offers': return `<article class="tile tile-offers"><div class="tile-head"><div><span class="eyebrow">Save more</span><h3>${esc(b.title)}</h3><p class="small muted mb-0">${esc(b.subtitle)}</p></div><a class="link-btn small" href="/products.html?offers=1">All offers →</a></div>
        ${b.deal ? `<a class="deal-card" href="/product/${b.deal.slug}"><img src="${b.deal.images[0]}" alt="${esc(b.deal.name)}"><div><span class="badge badge-deal">⚡ Deal of the Day</span><div class="small" style="font-weight:700;margin:6px 0">${esc(b.deal.name)}</div>${priceHtml(b.deal)}<div class="xs muted">Ends <span class="countdown" data-end="${b.deal.pricing.promotion.endAt}"></span></div></div></a>` : ''}
        <div class="offers-list">${b.items.slice(0, b.deal ? 3 : 4).map(mini).join('')}</div></article>`;
      case 'categories': return `<article class="tile tile-categories"><div class="tile-head"><div><h3>${esc(b.title)}</h3><p class="small muted mb-0">${esc(b.subtitle)}</p></div></div><div class="cat-rail">${b.items.map((c) => `<a class="cat-chip" href="/products.html?category=${c.slug}"><img src="${c.image}" alt="" loading="lazy">${esc(c.name)}<small>${c.count} products</small></a>`).join('')}</div></article>`;
      case 'bestsellers': return `<article class="tile tile-bestsellers"><div class="tile-head"><div><span class="eyebrow">Most loved</span><h3>${esc(b.title)}</h3><p class="small muted mb-0">${esc(b.subtitle)}</p></div><a class="link-btn small" href="/products.html?tag=best-seller">See all →</a></div><div class="mini-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">${b.items.map(mini).join('')}</div></article>`;
      case 'coupon': return b.coupon ? `<article class="tile tile-coupon"><span class="eyebrow" style="color:#ffe1cf">${esc(b.title)}</span><h3>${b.coupon.type === 'flat' ? `Flat ${inr(b.coupon.value)} off` : `${b.coupon.value}% off`}</h3><p class="small mb-0" style="opacity:.9">${esc(b.coupon.description)}</p><div class="coupon-code">${esc(b.coupon.code)} <button type="button" data-copy="${esc(b.coupon.code)}">Copy</button></div><p class="xs mb-0" style="opacity:.8">Valid till ${date(b.coupon.endAt)}</p></article>` : '';
      case 'promo': return `<article class="tile tile-promo"><span class="eyebrow" style="color:#fff3e8">Why ${esc(document.title.split('—')[0].trim())}</span><h3>${esc(b.title)}</h3><p class="small">${esc(b.subtitle)}</p>${b.ctaText ? `<a class="btn btn-sm" href="${esc(b.ctaLink)}">${esc(b.ctaText)}</a>` : ''}</article>`;
      default: return '';
    }
  }).join('');
  const el = document.getElementById('bento');
  el.innerHTML = html;
  el.querySelectorAll('.countdown').forEach((c) => countdown(c, c.dataset.end));
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copyText(b.dataset.copy, `Coupon ${b.dataset.copy} copied`); });
}
