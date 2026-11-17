'use strict';
/**
 * Customers & Reviews admin endpoints. These use the MOCK CustomersService / ReviewsService
 * (in-memory, clearly marked mock data) — intentionally NOT integrated with storage.
 * Contact enquiries are real (stored in data/contacts.json).
 */
const router = require('express').Router();
const repo = require('../../repositories');
const customers = require('../../services/customers');
const reviews = require('../../services/reviews');
const { wrap, HttpError } = require('../../middleware/errors');

router.get('/customers', wrap(async (req, res) => res.json(await customers().list(req.query))));
router.get('/customers/:id', wrap(async (req, res) => { const c = await customers().get(req.params.id); if (!c) throw new HttpError(404, 'Customer not found'); res.json(c); }));
router.put('/customers/:id', wrap(async (req, res) => res.json(await customers().update(req.params.id, { status: req.body.status, segment: req.body.segment }))));
router.post('/customers/:id/notes', wrap(async (req, res) => res.json(await customers().addNote(req.params.id, String(req.body.text || '').slice(0, 300)))));

router.get('/reviews', wrap(async (req, res) => res.json(await reviews().list(req.query))));
router.post('/reviews/:id/moderate', wrap(async (req, res) => {
  if (!['approved', 'rejected', 'pending'].includes(req.body.status)) throw new HttpError(400, 'Invalid status');
  res.json(await reviews().moderate(req.params.id, req.body.status));
}));
router.post('/reviews/:id/reply', wrap(async (req, res) => res.json(await reviews().reply(req.params.id, String(req.body.text || '').slice(0, 500)))));
router.delete('/reviews/:id', wrap(async (req, res) => res.json({ ok: await reviews().remove(req.params.id) })));

router.get('/contacts', (req, res) => res.json(repo.contacts.all()));
router.put('/contacts/:id', (req, res) => res.json(repo.contacts.update(req.params.id, { status: req.body.status === 'resolved' ? 'resolved' : 'new' })));

module.exports = router;
