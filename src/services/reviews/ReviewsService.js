'use strict';
/**
 * ReviewsService interface — NOT connected to storage yet (by design).
 * Rama will connect MySQL or Salesforce later: implement one of the adapters in this folder and
 * select it in reviews/index.js (REVIEWS_PROVIDER env or DATA_PROVIDER).
 *
 *   listByProduct(productId, { page, sort })   -> { items, summary: { average, count, distribution } }
 *   list({ status, q, rating, page })            -> { items, total }
 *   create({ productId, userId, name, rating, title, body }) -> review (status: 'pending')
 *   moderate(id, status)                         -> review   ('approved' | 'rejected' | 'pending')
 *   reply(id, text)                              -> review
 *   remove(id)                                   -> boolean
 */
class ReviewsService {
  async listByProduct() { throw new Error('not implemented'); }
  async list() { throw new Error('not implemented'); }
  async create() { throw new Error('not implemented'); }
  async moderate() { throw new Error('not implemented'); }
  async reply() { throw new Error('not implemented'); }
  async remove() { throw new Error('not implemented'); }
}
module.exports = ReviewsService;
