'use strict';
const router = require('express').Router();
const repo = require('../../repositories');

const DAY = 864e5;
const paidLike = (o) => !['Cancelled', 'Returned', 'Pending Payment'].includes(o.status);

router.get('/dashboard', (req, res) => {
  const days = Number(req.query.days) || 30;
  const since = Date.now() - days * DAY;
  const orders = repo.orders.all();
  const inRange = orders.filter((o) => Date.parse(o.createdAt) >= since);
  const valid = inRange.filter(paidLike);
  const revenue = valid.reduce((a, o) => a + o.totals.total, 0);
  const prevValid = orders.filter((o) => Date.parse(o.createdAt) >= since - days * DAY && Date.parse(o.createdAt) < since).filter(paidLike);
  const prevRevenue = prevValid.reduce((a, o) => a + o.totals.total, 0);
  const users = repo.users.all().filter((u) => u.role === 'user');
  const newCustomers = users.filter((u) => Date.parse(u.createdAt) >= since).length;
  const products = repo.products.all();
  const lowStock = products.filter((p) => p.stock <= (p.lowStockThreshold || 5)).map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, image: p.images[0] })).sort((a, b) => a.stock - b.stock);
  // daily series
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY); const key = d.toISOString().slice(0, 10);
    const dayOrders = valid.filter((o) => o.createdAt.slice(0, 10) === key);
    series.push({ date: key, revenue: dayOrders.reduce((a, o) => a + o.totals.total, 0), orders: dayOrders.length });
  }
  const top = {};
  valid.forEach((o) => o.items.forEach((i) => { top[i.productId] = top[i.productId] || { productId: i.productId, name: i.name, image: i.image, qty: 0, revenue: 0 }; top[i.productId].qty += i.qty; top[i.productId].revenue += i.lineTotal; }));
  const statusCounts = {};
  orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  res.json({
    range: { days },
    kpis: {
      revenue, prevRevenue, orders: valid.length, prevOrders: prevValid.length, aov: valid.length ? Math.round(revenue / valid.length) : 0,
      newCustomers, totalCustomers: users.length, lowStock: lowStock.length, pendingOrders: orders.filter((o) => ['Placed', 'Confirmed', 'Packed'].includes(o.status)).length,
      newEnquiries: repo.contacts.all().filter((c) => c.status === 'new').length,
    },
    series, statusCounts,
    topProducts: Object.values(top).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    recentOrders: orders.slice(0, 8).map((o) => ({ id: o.id, orderNo: o.orderNo, customer: o.customer.name, total: o.totals.total, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, createdAt: o.createdAt })),
    lowStock: lowStock.slice(0, 8),
  });
});

module.exports = router;
