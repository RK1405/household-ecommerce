/** Printable GST tax invoice. Prices are GST-inclusive; taxable value and CGST/SGST or IGST are back-calculated. */
import { get } from '/js/lib/api.js';
import { esc, date } from '/js/lib/format.js';

const o = await get(`/api/orders/${encodeURIComponent(new URLSearchParams(location.search).get('id'))}`);
const f2 = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intra = (o.shippingAddress.state || '') === o.tax.state; // same state → CGST+SGST, else IGST
const ratio = o.totals.subtotal ? (o.totals.subtotal - o.totals.discount) / o.totals.subtotal : 1;
const rows = o.items.map((i, n) => {
  const gross = i.lineTotal * ratio; const taxable = gross / (1 + i.gstRate / 100); const tax = gross - taxable;
  return { n: n + 1, ...i, gross, taxable, tax };
});
// Delivery charge treated as a service at 18% GST (assumption — confirm with your CA)
const del = o.totals.delivery; const delTaxable = del / 1.18; const delTax = del - delTaxable;
const T = rows.reduce((a, r) => ({ taxable: a.taxable + r.taxable, tax: a.tax + r.tax }), { taxable: delTaxable, tax: delTax });
document.title = `Invoice ${o.orderNo}`;
document.getElementById('invoice').innerHTML = `
  <div class="row between" style="align-items:flex-start"><div><h1 style="font-size:1.4rem;margin:0">TAX INVOICE</h1><div class="small muted">Original for recipient</div></div><div style="text-align:right"><strong style="font-size:1.1rem">${esc(o.store.name)}</strong><br>${esc(o.tax.legalName)}<br>GSTIN: <strong>${esc(o.tax.gstin)}</strong><br>State: ${esc(o.tax.state)}</div></div>
  <hr class="divider">
  <div class="a-grid half"><div><strong>Bill to</strong><br>${esc(o.billingAddress.name)}<br>${esc(o.billingAddress.line1)}${o.billingAddress.line2 ? `, ${esc(o.billingAddress.line2)}` : ''}<br>${esc(o.billingAddress.city)}, ${esc(o.billingAddress.state)} – ${esc(o.billingAddress.pincode)}<br>+91 ${esc(o.billingAddress.phone)}${o.gstin ? `<br>GSTIN: ${esc(o.gstin)}` : ''}</div>
  <div><table><tbody><tr><th>Invoice no.</th><td>${esc(o.tax.invoicePrefix)}${esc(o.orderNo.replace(/\D/g, ''))}</td></tr><tr><th>Order no.</th><td>${esc(o.orderNo)}</td></tr><tr><th>Date</th><td>${date(o.createdAt)}</td></tr><tr><th>Place of supply</th><td>${esc(o.shippingAddress.state)}</td></tr><tr><th>Payment</th><td>${o.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid (online)'} – ${esc(o.paymentStatus)}</td></tr></tbody></table></div></div>
  <table class="mt-4"><thead><tr><th>#</th><th>Item</th><th>HSN</th><th class="r">Qty</th><th class="r">Taxable value (₹)</th><th class="r">GST %</th>${intra ? '<th class="r">CGST (₹)</th><th class="r">SGST (₹)</th>' : '<th class="r">IGST (₹)</th>'}<th class="r">Total (₹)</th></tr></thead>
  <tbody>${rows.map((r) => `<tr><td>${r.n}</td><td>${esc(r.name)}<br><span class="xs muted">${esc(r.sku)}</span></td><td>${esc(r.hsn || '')}</td><td class="r">${r.qty}</td><td class="r">${f2(r.taxable)}</td><td class="r">${r.gstRate}</td>${intra ? `<td class="r">${f2(r.tax / 2)}</td><td class="r">${f2(r.tax / 2)}</td>` : `<td class="r">${f2(r.tax)}</td>`}<td class="r">${f2(r.gross)}</td></tr>`).join('')}
  ${del ? `<tr><td>${rows.length + 1}</td><td>Delivery charges (${esc(o.deliveryMethod)})</td><td>9965</td><td class="r">1</td><td class="r">${f2(delTaxable)}</td><td class="r">18</td>${intra ? `<td class="r">${f2(delTax / 2)}</td><td class="r">${f2(delTax / 2)}</td>` : `<td class="r">${f2(delTax)}</td>`}<td class="r">${f2(del)}</td></tr>` : ''}
  <tr><th colspan="4" class="r">Total</th><th class="r">${f2(T.taxable)}</th><th></th>${intra ? `<th class="r">${f2(T.tax / 2)}</th><th class="r">${f2(T.tax / 2)}</th>` : `<th class="r">${f2(T.tax)}</th>`}<th class="r">${f2(o.totals.total)}</th></tr></tbody></table>
  ${o.totals.discount ? `<p class="small mt-4">Coupon ${esc(o.totals.couponCode)} discount of ₹${f2(o.totals.discount)} has been apportioned across items before tax.</p>` : ''}
  <p class="mt-4"><strong>Amount payable: ₹${f2(o.totals.total)}</strong></p>
  <p class="xs muted mt-4">This is a computer-generated invoice for a DEMO store and is not a valid tax document. Tax treatment (e.g. GST on delivery) should be confirmed with a chartered accountant.</p>`;
