'use strict';
/**
 * MOCK adapter — clearly marked demo data, kept in memory only (resets on server restart).
 * Nothing here is persisted. Replace with mysql.adapter.js or salesforce.adapter.js.
 */
const ReviewsService = require('./ReviewsService');

const NAMES = ['Ananya S.', 'Rahul K.', 'Lakshmi V.', 'Imran A.', 'Sneha P.', 'Gaurav M.', 'Deepa R.', 'Joseph T.'];
const TEXT = [
  ['Excellent quality', 'Sturdy and well finished. Exactly as described, delivery was quick too.'],
  ['Value for money', 'Good product at this price. Packaging could be better.'],
  ['Loved it', 'Looks premium in person. My mother was very happy with it.'],
  ['Decent', 'Does the job. Slightly smaller than I expected.'],
  ['Highly recommend', 'Using it daily for 3 weeks now, no complaints at all.'],
  ['Not bad', 'Average quality, but the customer support was helpful.'],
];

class MockReviewsAdapter extends ReviewsService {
  constructor(products) {
    super();
    this.isMock = true;
    this.items = [];
    let n = 0;
    for (const p of products.slice(0, 50)) {
      const count = 2 + (p.id.charCodeAt(4) % 3);
      for (let i = 0; i < count; i++) {
        const t = TEXT[(n + i) % TEXT.length];
        const rating = [5, 4, 5, 3, 5, 4][(n + i) % 6];
        this.items.push({
          id: `rev_mock_${++n}`, productId: p.id, productName: p.name, productSlug: p.slug, userId: null, name: NAMES[n % NAMES.length],
          rating, title: t[0], body: t[1], verified: n % 3 !== 0, status: n % 9 === 0 ? 'pending' : 'approved', reply: null, helpful: (n * 7) % 23,
          createdAt: new Date(Date.now() - (n % 60) * 864e5).toISOString(), mock: true,
        });
      }
    }
  }
  summary(list) {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    list.forEach((r) => { distribution[r.rating]++; });
    const average = list.length ? Math.round((list.reduce((a, r) => a + r.rating, 0) / list.length) * 10) / 10 : 0;
    return { average, count: list.length, distribution };
  }
  async listByProduct(productId) {
    const items = this.items.filter((r) => r.productId === productId && r.status === 'approved');
    return { items, summary: this.summary(items), mock: true };
  }
  async list({ status, q, rating } = {}) {
    let items = this.items;
    if (status) items = items.filter((r) => r.status === status);
    if (rating) items = items.filter((r) => r.rating === Number(rating));
    if (q) { const s = q.toLowerCase(); items = items.filter((r) => `${r.productName} ${r.name} ${r.title} ${r.body}`.toLowerCase().includes(s)); }
    return { items, total: items.length, mock: true };
  }
  async create(data) {
    const r = { id: `rev_mock_${Date.now()}`, ...data, status: 'pending', verified: false, reply: null, helpful: 0, createdAt: new Date().toISOString(), mock: true };
    this.items.unshift(r);
    return r;
  }
  async moderate(id, status) { const r = this.items.find((x) => x.id === id); if (r) r.status = status; return r || null; }
  async reply(id, text) { const r = this.items.find((x) => x.id === id); if (r) r.reply = { text, at: new Date().toISOString() }; return r || null; }
  async remove(id) { const i = this.items.findIndex((x) => x.id === id); if (i >= 0) this.items.splice(i, 1); return i >= 0; }
}
module.exports = MockReviewsAdapter;
