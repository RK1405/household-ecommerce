'use strict';
const router = require('express').Router();
const repo = require('../../repositories');
const { toCsv } = require('../../utils/csv');

const DAY = 864e5;
const counts = (o) => !['Cancelled', 'Returned', 'Pending Payment'].includes(o.status);

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y) / DAY + 1) / 7)).padStart(2, '0')}`;
}
const keyFor = (iso, g) => (g === 'month' ? iso.slice(0, 7) : g === 'week' ? isoWeek(new Date(iso)) : iso.slice(0, 10));

function build(q) {
  const to = q.to || new Date().toISOString().slice(0, 10);
  const from = q.from || new Date(Date.now() - 29 * DAY).toISOString().slice(0, 10);
  const group = ['day', 'week', 'month'].includes(q.group) ? q.group : 'day';
  const all = repo.orders.all().filter((o) => o.createdAt.slice(0, 10) >= from && o.createdAt.slice(0, 10) <= to);
  const orders = all.filter(counts);
  const products = Object.fromEntries(repo.products.all().map((p) => [p.id, p]));
  const cats = Object.fromEntries(repo.categories.all().map((c) => [c.slug, c.name]));

  // buckets (include empty days/weeks/months)
  const buckets = new Map();
  for (let t = Date.parse(from); t <= Date.parse(to); t += DAY) { const k = keyFor(new Date(t).toISOString(), group); if (!buckets.has(k)) buckets.set(k, { period: k, revenue: 0, orders: 0, items: 0, discount: 0, gst: 0 }); }
  orders.forEach((o) => { const b = buckets.get(keyFor(o.createdAt, group)); if (!b) return; b.revenue += o.totals.total; b.orders++; b.items += o.items.reduce((a, i) => a + i.qty, 0); b.discount += o.totals.discount; b.gst += o.totals.gst; });

  const byCategory = {}, byPayment = { COD: { method: 'COD', orders: 0, revenue: 0 }, ONLINE: { method: 'Online', orders: 0, revenue: 0 } }, byMethod = {}, top = {}, byState = {};
  const payments = repo.payments.all();
  orders.forEach((o) => {
    byPayment[o.paymentMethod].orders++; byPayment[o.paymentMethod].revenue += o.totals.total;
    const pm = o.paymentMethod === 'COD' ? 'COD' : (payments.find((p) => p.orderId === o.id && ['captured', 'refunded'].includes(p.status))?.method || 'Online');
    byMethod[pm] = byMethod[pm] || { method: pm, orders: 0, revenue: 0 }; byMethod[pm].orders++; byMethod[pm].revenue += o.totals.total;
    const st = o.shippingAddress?.state || 'Unknown'; byState[st] = (byState[st] || 0) + o.totals.total;
    o.items.forEach((i) => {
      const c = i.category || products[i.productId]?.category || 'other';
      byCategory[c] = byCategory[c] || { category: cats[c] || c, revenue: 0, qty: 0 }; byCategory[c].revenue += i.lineTotal; byCategory[c].qty += i.qty;
      top[i.productId] = top[i.productId] || { productId: i.productId, name: i.name, sku: i.sku, qty: 0, revenue: 0 }; top[i.productId].qty += i.qty; top[i.productId].revenue += i.lineTotal;
    });
  });
  const revenue = orders.reduce((a, o) => a + o.totals.total, 0);
  return {
    from, to, group,
    summary: {
      revenue, orders: orders.length, aov: orders.length ? Math.round(revenue / orders.length) : 0,
      itemsSold: orders.reduce((a, o) => a + o.items.reduce((x, i) => x + i.qty, 0), 0),
      discounts: orders.reduce((a, o) => a + o.totals.discount, 0), gst: Math.round(orders.reduce((a, o) => a + o.totals.gst, 0)),
      cancelled: all.filter((o) => o.status === 'Cancelled').length, returned: all.filter((o) => o.status === 'Returned').length,
    },
    series: [...buckets.values()],
    byCategory: Object.values(byCategory).sort((a, b) => b.revenue - a.revenue),
    byPayment: Object.values(byPayment), byMethod: Object.values(byMethod),
    byState: Object.entries(byState).map(([state, revenue]) => ({ state, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    topProducts: Object.values(top).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };
}

router.get('/reports/sales', (req, res) => res.json(build(req.query)));

router.get('/reports/sales.csv', (req, res) => {
  const r = build(req.query);
  const type = req.query.type || 'series';
  const rows = type === 'products' ? r.topProducts : type === 'categories' ? r.byCategory : type === 'payments' ? r.byMethod : r.series;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sales-${type}-${r.from}_to_${r.to}.csv"`);
  res.send('﻿' + toCsv(rows, Object.keys(rows[0] || { empty: '' })));
});

module.exports = router;
