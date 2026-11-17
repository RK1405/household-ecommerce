import { initPage, requireLogin } from '../lib/page.js';
import { get, post } from '../lib/api.js';
import { esc, inr } from '../lib/format.js';
import { onCart, cartState, setDelivery, loadCart } from '../lib/cart.js';
import { summaryHtml, bindCoupon } from '../components/summary.js';
import { addressCard, openAddressForm } from '../components/addressForm.js';
import { toast } from '../components/toast.js';

const s = await initPage();
if (!requireLogin(s)) await new Promise(() => {});
const root = document.getElementById('checkout-root');
let addresses = await get('/api/account/addresses');
let selected = (addresses.find((a) => a.isDefault) || addresses[0])?.id;
let payment = 'ONLINE';

function render(state) {
  const q = state.quote;
  if (!q) return;
  if (!q.lines.length) { root.innerHTML = `<div class="card empty"><div class="emoji">🛒</div><h2>Your cart is empty</h2><a class="btn" href="/products.html">Shop now</a></div>`; return; }
  if (!q.codAvailable && payment === 'COD') payment = 'ONLINE';
  root.innerHTML = `<div class="cart-layout"><div class="stack">
    <section class="card card-pad" aria-labelledby="h-addr"><div class="row between"><h2 id="h-addr" style="font-size:1.2rem" class="mb-0">1. Delivery address</h2><button class="btn btn-sm btn-outline" id="add-addr">+ Add new address</button></div>
      <div class="addr-grid mt-4" role="radiogroup" aria-label="Choose delivery address">${addresses.length ? addresses.map((a) => addressCard(a, { selectable: true, checked: a.id === selected, actions: false })).join('') : '<p class="muted">No saved addresses yet. Add one to continue.</p>'}</div>
      <details class="mt-4"><summary class="small" style="cursor:pointer;font-weight:600">Need a GST invoice for your business?</summary><div class="field mt-4" style="max-width:320px"><label for="gstin">GSTIN (optional)</label><input class="input" id="gstin" maxlength="15" placeholder="33AABCH1234Z1Z5" style="text-transform:uppercase"></div></details>
    </section>
    <section class="card card-pad" aria-labelledby="h-del"><h2 id="h-del" style="font-size:1.2rem">2. Delivery speed</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
      ${q.deliveryOptions.map((d) => `<label class="choice"><input type="radio" name="delivery" value="${d.key}" ${q.deliveryMethod === d.key ? 'checked' : ''}><span><strong>${esc(d.label)}</strong> — ${d.charge ? inr(d.charge) : '<span class="save">FREE</span>'}<br><span class="small muted">${esc(d.eta)}${d.freeAbove ? ` · free above ${inr(d.freeAbove)}` : ''}</span></span></label>`).join('')}</div></section>
    <section class="card card-pad" aria-labelledby="h-pay"><h2 id="h-pay" style="font-size:1.2rem">3. Payment method</h2><div class="grid" role="radiogroup">
      <label class="choice"><input type="radio" name="payment" value="ONLINE" ${payment === 'ONLINE' ? 'checked' : ''}><span><strong>💳 Pay online — UPI / Card</strong><br><span class="small muted">Secure payment page · instant confirmation</span></span></label>
      <label class="choice ${q.codAvailable ? '' : 'is-disabled'}"><input type="radio" name="payment" value="COD" ${payment === 'COD' ? 'checked' : ''} ${q.codAvailable ? '' : 'disabled'}><span><strong>💵 Cash on Delivery</strong><br><span class="small muted">${q.codAvailable ? `Pay ${inr(q.total)} in cash or UPI when your order arrives` : esc(q.codMessage)}</span></span></label>
    </div>
    <div class="field mt-4"><label for="note">Delivery instructions (optional)</label><input class="input" id="note" maxlength="300" placeholder="e.g. Call before delivery, leave with security"></div></section>
    </div>
    <aside class="summary-col"><div class="card card-pad mb-4"><h3>Order items (${q.itemCount})</h3>${q.lines.map((l) => `<div class="row" style="gap:10px;flex-wrap:nowrap;margin-bottom:8px"><img src="${l.image}" alt="" style="width:48px;height:48px;border-radius:8px"><span class="small" style="flex:1">${esc(l.name)} × ${l.qty}</span><strong class="small">${inr(l.lineTotal)}</strong></div>`).join('')}<a class="xs" href="/cart.html">Edit cart</a></div>
      ${summaryHtml(q)}
      ${q.issues.length ? `<div class="alert alert-warning mt-4">${q.issues.map((i) => esc(i.message)).join('<br>')}</div>` : ''}
      <div class="alert alert-danger hidden mt-4" id="place-err" role="alert"></div>
      <button class="btn btn-accent btn-lg btn-block mt-4" id="place">${payment === 'COD' ? `Place order · ${inr(q.total)}` : `Continue to payment · ${inr(q.total)}`}</button>
      <p class="xs muted mt-4">By placing the order you agree to our <a href="/page.html?slug=terms">terms</a>. Prices include GST.</p></aside></div>`;
  bindCoupon(root);
}
onCart(render);

root.addEventListener('change', async (e) => {
  if (e.target.name === 'address') selected = e.target.value;
  if (e.target.name === 'payment') { payment = e.target.value; render(cartState()); }
  if (e.target.name === 'delivery') await setDelivery(e.target.value);
});
root.addEventListener('click', async (e) => {
  if (e.target.closest('#add-addr')) openAddressForm(null, { onSaved: async (a) => { addresses = await get('/api/account/addresses'); selected = a.id; render(cartState()); toast('Address saved', { type: 'success' }); } });
  const placeBtn = e.target.closest('#place');
  if (placeBtn) {
    const err = document.getElementById('place-err'); err.classList.add('hidden');
    if (!selected) { err.textContent = 'Please add and select a delivery address.'; err.classList.remove('hidden'); return; }
    const st = cartState();
    placeBtn.classList.add('is-loading'); placeBtn.disabled = true;
    try {
      const r = await post('/api/orders', { addressId: selected, deliveryMethod: st.deliveryMethod, paymentMethod: payment, couponCode: st.quote.coupon?.valid ? st.quote.coupon.code : null, gstin: document.getElementById('gstin')?.value, note: document.getElementById('note')?.value });
      location.href = r.next;
    } catch (ex) {
      err.textContent = ex.message; err.classList.remove('hidden'); placeBtn.classList.remove('is-loading'); placeBtn.disabled = false;
      if (ex.status === 409) loadCart();
    }
  }
});
