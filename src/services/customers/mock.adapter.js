'use strict';
/** MOCK customers — in-memory demo data only, not persisted. Replace with a MySQL/Salesforce adapter. */
const CustomersService = require('./CustomersService');
const ROWS = [
  ['Aditi Kulkarni', 'Pune', 'Maharashtra', 7, 18450, 'VIP'], ['Mohammed Rafi', 'Hyderabad', 'Telangana', 3, 5120, 'Regular'],
  ['Sowmya Krishnan', 'Chennai', 'Tamil Nadu', 12, 31200, 'VIP'], ['Rajesh Patel', 'Ahmedabad', 'Gujarat', 1, 899, 'New'],
  ['Nisha Thomas', 'Kochi', 'Kerala', 4, 7640, 'Regular'], ['Amit Banerjee', 'Kolkata', 'West Bengal', 2, 3398, 'Regular'],
  ['Pooja Agarwal', 'Jaipur', 'Rajasthan', 0, 0, 'New'], ['Suresh Babu', 'Coimbatore', 'Tamil Nadu', 6, 12990, 'Regular'],
  ['Gurpreet Gill', 'Ludhiana', 'Punjab', 9, 22150, 'VIP'], ['Ritika Saxena', 'Noida', 'Uttar Pradesh', 1, 2299, 'New'],
  ['Vivek Hegde', 'Mangaluru', 'Karnataka', 5, 9870, 'Regular'], ['Tanvi Joshi', 'Nagpur', 'Maharashtra', 0, 0, 'Inactive'],
];
class MockCustomersAdapter extends CustomersService {
  constructor() {
    super();
    this.isMock = true;
    this.items = ROWS.map(([name, city, state, orders, spend, segment], i) => ({
      id: `cust_mock_${i + 1}`, name, email: `${name.split(' ')[0].toLowerCase()}.mock@example.com`, phone: `+91 98${String(40000000 + i * 1234567).slice(0, 8)}`,
      city, state, orders, totalSpend: spend, segment, status: segment === 'Inactive' ? 'inactive' : 'active',
      lastOrderAt: orders ? new Date(Date.now() - (i * 5 + 2) * 864e5).toISOString() : null,
      createdAt: new Date(Date.now() - (i * 23 + 10) * 864e5).toISOString(), notes: [], mock: true,
    }));
  }
  async list({ q, segment } = {}) {
    let items = this.items;
    if (segment) items = items.filter((c) => c.segment === segment);
    if (q) { const s = q.toLowerCase(); items = items.filter((c) => `${c.name} ${c.email} ${c.city} ${c.phone}`.toLowerCase().includes(s)); }
    return { items, total: items.length, mock: true };
  }
  async get(id) { return this.items.find((c) => c.id === id) || null; }
  async update(id, patch) { const c = await this.get(id); if (c) Object.assign(c, patch); return c; }
  async addNote(id, text) { const c = await this.get(id); if (c) c.notes.push({ text, at: new Date().toISOString() }); return c; }
}
module.exports = MockCustomersAdapter;
