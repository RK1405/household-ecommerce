import { initPage } from '../lib/page.js';
import { get } from '../lib/api.js';
import { esc, inr } from '../lib/format.js';
import { productCard, bindProductActions, skeletonCards } from '../components/productCard.js';

await initPage({ active: new URLSearchParams(location.search).get('offers') ? 'offers' : 'shop' });
bindProductActions();

const grid = document.getElementById('grid'), form = document.getElementById('filter-form');
const KEYS = ['q', 'category', 'subcategory', 'brand', 'minPrice', 'maxPrice', 'rating', 'inStock', 'offers', 'tag', 'sort', 'page'];
let state = Object.fromEntries(KEYS.map((k) => [k, new URLSearchParams(location.search).get(k) || '']));
const cats = await get('/api/categories');
let facets = null;

function syncUrl(push = true) {
  const p = new URLSearchParams();
  KEYS.forEach((k) => { if (state[k]) p.set(k, state[k]); });
  const url = `${location.pathname}${p.toString() ? `?${p}` : ''}`;
  push ? history.pushState(state, '', url) : history.replaceState(state, '', url);
}

function renderFilters() {
  const subs = state.subcategory ? state.subcategory.split(',') : [];
  const brands = state.brand ? state.brand.split(',') : [];
  form.innerHTML = `
    <div class="filter-group"><h4>Category</h4>
      <label class="check"><input type="radio" name="category" value="" ${!state.category ? 'checked' : ''}> All categories</label>
      ${cats.map((c) => `<label class="check"><input type="radio" name="category" value="${c.slug}" ${state.category === c.slug ? 'checked' : ''}> ${esc(c.name)} <span class="xs muted">(${c.count})</span></label>
        ${state.category === c.slug ? `<div class="sub-list">${c.children.map((s) => `<label class="check"><input type="checkbox" name="subcategory" value="${s.slug}" ${subs.includes(s.slug) ? 'checked' : ''}> ${esc(s.name)} <span class="xs muted">(${s.count})</span></label>`).join('')}</div>` : ''}`).join('')}
    </div>
    <div class="filter-group"><h4>Price (₹)</h4>
      <div class="price-inputs"><input class="input" type="number" name="minPrice" min="0" placeholder="Min ${facets ? facets.minPrice : ''}" value="${esc(state.minPrice)}" aria-label="Minimum price"><span>–</span><input class="input" type="number" name="maxPrice" min="0" placeholder="Max ${facets ? facets.maxPrice : ''}" value="${esc(state.maxPrice)}" aria-label="Maximum price"></div>
      <div class="chips mt-4">${[[0, 499], [500, 999], [1000, 1999], [2000, 99999]].map(([a, b]) => `<button type="button" class="chip" data-range="${a}-${b}">${b > 9999 ? `${inr(a)}+` : `${inr(a)}–${inr(b)}`}</button>`).join('')}</div>
    </div>
    <div class="filter-group"><h4>Customer rating</h4>
      ${[4.5, 4, 3.5].map((r) => `<label class="check"><input type="radio" name="rating" value="${r}" ${state.rating === String(r) ? 'checked' : ''}> ${r}★ & above</label>`).join('')}
      <label class="check"><input type="radio" name="rating" value="" ${!state.rating ? 'checked' : ''}> Any rating</label>
    </div>
    <div class="filter-group"><h4>Availability & offers</h4>
      <label class="check"><input type="checkbox" name="inStock" value="1" ${state.inStock ? 'checked' : ''}> In stock only</label>
      <label class="check"><input type="checkbox" name="offers" value="1" ${state.offers ? 'checked' : ''}> On offer / deals</label>
      <label class="check"><input type="checkbox" name="tag" value="new-arrival" ${state.tag === 'new-arrival' ? 'checked' : ''}> New arrivals</label>
    </div>
    ${facets ? `<div class="filter-group"><h4>Brand</h4>${facets.brands.map((b) => `<label class="check"><input type="checkbox" name="brand" value="${esc(b)}" ${brands.includes(b) ? 'checked' : ''}> ${esc(b)}</label>`).join('')}</div>` : ''}`;
}

function readForm() {
  const fd = new FormData(form);
  const prevCat = state.category;
  state.category = fd.get('category') || '';
  state.subcategory = state.category === prevCat ? fd.getAll('subcategory').join(',') : '';
  state.brand = fd.getAll('brand').join(',');
  state.minPrice = fd.get('minPrice') || ''; state.maxPrice = fd.get('maxPrice') || '';
  state.rating = fd.get('rating') || ''; state.inStock = fd.get('inStock') || ''; state.offers = fd.get('offers') || '';
  state.tag = fd.get('tag') || (state.tag && state.tag !== 'new-arrival' ? state.tag : '');
  state.page = '';
}

function chips() {
  const labels = [];
  const cat = cats.find((c) => c.slug === state.category);
  if (state.q) labels.push(['q', `“${state.q}”`]);
  if (cat) labels.push(['category', cat.name]);
  state.subcategory && state.subcategory.split(',').forEach((s) => labels.push([`subcategory:${s}`, cat?.children.find((x) => x.slug === s)?.name || s]));
  state.brand && state.brand.split(',').forEach((b) => labels.push([`brand:${b}`, b]));
  if (state.minPrice || state.maxPrice) labels.push(['price', `${state.minPrice ? inr(state.minPrice) : '₹0'} – ${state.maxPrice ? inr(state.maxPrice) : 'any'}`]);
  if (state.rating) labels.push(['rating', `${state.rating}★+`]);
  if (state.inStock) labels.push(['inStock', 'In stock']);
  if (state.offers) labels.push(['offers', 'On offer']);
  if (state.tag) labels.push(['tag', state.tag.replace('-', ' ')]);
  document.getElementById('active-chips').innerHTML = labels.map(([k, l]) => `<button class="chip" data-chip="${esc(k)}" aria-label="Remove filter ${esc(l)}">${esc(l)} ✕</button>`).join('') + (labels.length > 1 ? '<button class="chip" data-chip="all">Clear all</button>' : '');
}

function crumbs() {
  const cat = cats.find((c) => c.slug === state.category);
  const sub = cat && state.subcategory && !state.subcategory.includes(',') ? cat.children.find((s) => s.slug === state.subcategory) : null;
  const parts = [['/', 'Home'], ['/products.html', 'Shop']];
  if (cat) parts.push([`/products.html?category=${cat.slug}`, cat.name]);
  if (sub) parts.push([`/products.html?category=${cat.slug}&subcategory=${sub.slug}`, sub.name]);
  document.getElementById('crumbs').innerHTML = parts.map(([h, l], i) => i === parts.length - 1 ? `<li aria-current="page">${esc(l)}</li>` : `<li><a href="${h}">${esc(l)}</a></li>`).join('');
  const title = state.q ? `Results for “${state.q}”` : sub ? sub.name : cat ? cat.name : state.offers ? 'Offers & deals' : state.tag === 'new-arrival' ? 'New arrivals' : state.tag === 'best-seller' ? 'Best sellers' : 'All products';
  document.getElementById('list-title').textContent = title;
  document.title = `${title} | ${document.title.split('|').pop().trim()}`;
}

async function load(push = false) {
  if (push) syncUrl();
  grid.innerHTML = skeletonCards(6);
  const p = new URLSearchParams(); KEYS.forEach((k) => state[k] && p.set(k, state[k])); p.set('limit', '12');
  const r = await get(`/api/products?${p}`);
  facets = r.facets;
  document.getElementById('sort').value = state.sort || 'relevance';
  document.getElementById('result-count').textContent = `${r.total} product${r.total === 1 ? '' : 's'}`;
  grid.innerHTML = r.items.length ? r.items.map(productCard).join('') : `<div class="empty" style="grid-column:1/-1"><div class="emoji">🔍</div><h3>No products match these filters</h3><p>Try removing a filter or searching for something else.</p><button class="btn btn-outline" data-chip="all">Clear filters</button></div>`;
  const pag = document.getElementById('pagination');
  pag.innerHTML = r.pages > 1 ? `<button data-page="${r.page - 1}" ${r.page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>${Array.from({ length: r.pages }, (_, i) => `<button data-page="${i + 1}" ${i + 1 === r.page ? 'aria-current="page"' : ''}>${i + 1}</button>`).join('')}<button data-page="${r.page + 1}" ${r.page === r.pages ? 'disabled' : ''} aria-label="Next page">›</button>` : '';
  renderFilters(); chips(); crumbs();
}

// events
form.addEventListener('change', (e) => { if (e.target.name === 'minPrice' || e.target.name === 'maxPrice') return; readForm(); if (matchMedia('(min-width: 1000px)').matches) load(true); else renderFilters(); });
form.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); readForm(); load(true); } });
form.addEventListener('focusout', (e) => { if (['minPrice', 'maxPrice'].includes(e.target.name) && matchMedia('(min-width: 1000px)').matches) { readForm(); load(true); } });
form.addEventListener('click', (e) => { const r = e.target.closest('[data-range]'); if (!r) return; const [a, b] = r.dataset.range.split('-'); form.minPrice.value = a; form.maxPrice.value = b > 9999 ? '' : b; readForm(); if (matchMedia('(min-width: 1000px)').matches) load(true); });
document.getElementById('sort').addEventListener('change', (e) => { state.sort = e.target.value; state.page = ''; load(true); });
document.getElementById('pagination').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (!b || b.disabled) return; state.page = b.dataset.page; load(true); document.getElementById('main').scrollIntoView({ behavior: 'smooth' }); });
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-chip]'); if (!c) return;
  const k = c.dataset.chip;
  if (k === 'all') KEYS.forEach((x) => { if (x !== 'sort') state[x] = ''; });
  else if (k.startsWith('subcategory:')) state.subcategory = state.subcategory.split(',').filter((s) => s !== k.split(':')[1]).join(',');
  else if (k.startsWith('brand:')) state.brand = state.brand.split(',').filter((s) => s !== k.slice(6)).join(',');
  else if (k === 'price') { state.minPrice = ''; state.maxPrice = ''; }
  else { state[k] = ''; if (k === 'category') state.subcategory = ''; }
  state.page = ''; load(true);
});
// mobile filter drawer
const fEl = document.getElementById('filters'), fOv = document.getElementById('filters-overlay');
const setF = (o) => { fEl.classList.toggle('open', o); fOv.classList.toggle('open', o); document.body.classList.toggle('no-scroll', o); };
document.getElementById('filters-open').onclick = () => setF(true);
document.getElementById('filters-close').onclick = () => setF(false);
fOv.onclick = () => setF(false);
document.getElementById('filters-apply').onclick = () => { readForm(); setF(false); load(true); };
document.getElementById('filters-clear').onclick = () => { KEYS.forEach((x) => { if (x !== 'sort' && x !== 'q') state[x] = ''; }); setF(false); load(true); };
window.addEventListener('popstate', () => { state = Object.fromEntries(KEYS.map((k) => [k, new URLSearchParams(location.search).get(k) || ''])); load(false); });

load(false);
