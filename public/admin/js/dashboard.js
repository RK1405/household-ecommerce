import { initAdmin } from './layout.js';
import { get } from '/js/lib/api.js';
import { esc, inr, num, date, statusBadge } from '/js/lib/format.js';
import { lineChart } from './charts.js';

await initAdmin('dashboard', 'Dashboard');
let chart;
async function load() {
  const d = await get(`/api/admin/dashboard?days=${document.getElementById('range').value}`);
  const k = d.kpis;
  const delta = (a, b) => { if (!b) return ''; const p = Math.round(((a - b) / b) * 100); return `<span class="delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}% vs prev.</span>`; };
  document.getElementById('kpis').innerHTML = `
    <div class="kpi"><div class="lbl">Revenue</div><div class="val">${inr(k.revenue)}</div>${delta(k.revenue, k.prevRevenue)}</div>
    <div class="kpi"><div class="lbl">Orders</div><div class="val">${num(k.orders)}</div>${delta(k.orders, k.prevOrders)}</div>
    <div class="kpi"><div class="lbl">Avg. order value</div><div class="val">${inr(k.aov)}</div><span class="xs muted">${k.pendingOrders} orders to fulfil</span></div>
    <div class="kpi"><div class="lbl">New customers</div><div class="val">${num(k.newCustomers)}</div><span class="xs muted">${k.totalCustomers} total</span></div>
    <div class="kpi ${k.lowStock ? 'warn' : ''}"><div class="lbl">Low stock</div><div class="val">${k.lowStock}</div><a class="xs" href="/admin/products.html?stock=low">Restock →</a></div>`;
  chart?.destroy();
  chart = lineChart(document.getElementById('sales-chart'), d.series.map((x) => date(x.date, { day: 'numeric', month: 'short' })), [{ label: 'Revenue (₹)', data: d.series.map((x) => x.revenue) }, { label: 'Orders', data: d.series.map((x) => x.orders), yAxisID: 'y1', type: 'bar' }]);
  document.getElementById('top').innerHTML = d.topProducts.map((p, i) => `<li class="row" style="flex-wrap:nowrap"><strong>${i + 1}</strong><img class="thumb" src="${p.image}" alt=""><span style="flex:1">${esc(p.name)}<br><span class="xs muted">${p.qty} sold</span></span><strong>${inr(p.revenue)}</strong></li>`).join('') || '<li class="muted">No sales in this period</li>';
  document.getElementById('recent').innerHTML = d.recentOrders.map((o) => `<tr><td><a href="/admin/orders.html?id=${o.id}">${esc(o.orderNo)}</a></td><td>${esc(o.customer)}</td><td>${date(o.createdAt)}</td><td>${o.paymentMethod === 'COD' ? 'COD' : 'Online'} ${statusBadge(o.paymentStatus)}</td><td>${statusBadge(o.status)}</td><td class="num">${inr(o.total)}</td></tr>`).join('');
  document.getElementById('low').innerHTML = d.lowStock.map((p) => `<li class="row" style="flex-wrap:nowrap"><img class="thumb" src="${p.image}" alt=""><span style="flex:1">${esc(p.name)}<br><span class="xs muted">${esc(p.sku)}</span></span><span class="badge ${p.stock ? 'badge-warning' : 'badge-danger'}">${p.stock ? `${p.stock} left` : 'Out of stock'}</span></li>`).join('') || '<li class="muted">All products are well stocked 🎉</li>';
}
document.getElementById('range').onchange = load;
load();
