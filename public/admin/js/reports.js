import { initAdmin } from './layout.js';
import { get } from '/js/lib/api.js';
import { esc, inr, num } from '/js/lib/format.js';
import { lineChartAsync, doughnut, bar } from './charts.js';

await initAdmin('reports', 'Sales reports');
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const setRange = (r) => {
  const now = new Date();
  document.getElementById('to').value = iso(now);
  document.getElementById('from').value = r === 'mtd' ? iso(new Date(now.getFullYear(), now.getMonth(), 1)) : iso(new Date(Date.now() - (Number(r) - 1) * 864e5));
};
setRange(30);
const charts = [];
async function load() {
  const p = new URLSearchParams(new FormData(document.getElementById('f')));
  document.querySelectorAll('[data-csv]').forEach((a) => { a.href = `/api/admin/reports/sales.csv?${p}&type=${a.dataset.csv}`; a.setAttribute('download', ''); });
  const r = await get(`/api/admin/reports/sales?${p}`);
  const s = r.summary;
  document.getElementById('kpis').innerHTML = [['Revenue', inr(s.revenue)], ['Orders', num(s.orders)], ['Avg. order value', inr(s.aov)], ['Items sold', num(s.itemsSold)], ['Discounts given', inr(s.discounts)]].map(([l, v]) => `<div class="kpi"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('') + `<div class="kpi"><div class="lbl">GST collected</div><div class="val">${inr(s.gst)}</div></div><div class="kpi"><div class="lbl">Cancelled / returned</div><div class="val">${s.cancelled} / ${s.returned}</div></div>`;
  charts.splice(0).forEach((c) => c.destroy());
  charts.push(await lineChartAsync(document.getElementById('c-series'), r.series.map((x) => x.period), [{ label: 'Revenue (₹)', data: r.series.map((x) => x.revenue) }, { label: 'Orders', data: r.series.map((x) => x.orders), type: 'bar', yAxisID: 'y1' }]));
  charts.push(await doughnut(document.getElementById('c-cat'), r.byCategory.map((x) => x.category), r.byCategory.map((x) => x.revenue)));
  charts.push(await doughnut(document.getElementById('c-pay'), r.byPayment.map((x) => x.method), r.byPayment.map((x) => x.revenue)));
  charts.push(await bar(document.getElementById('c-state'), r.byState.map((x) => x.state), r.byState.map((x) => x.revenue)));
  document.getElementById('t-method').innerHTML = r.byMethod.map((m) => `<tr><td>${esc(m.method)}</td><td class="num">${m.orders}</td><td class="num">${inr(m.revenue)}</td></tr>`).join('');
  document.getElementById('t-top').innerHTML = r.topProducts.map((t) => `<tr><td>${esc(t.name)}<br><span class="xs muted">${esc(t.sku)}</span></td><td class="num">${t.qty}</td><td class="num">${inr(t.revenue)}</td></tr>`).join('');
}
document.getElementById('f').onsubmit = (e) => { e.preventDefault(); load(); };
document.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { setRange(b.dataset.r); load(); }));
load();
