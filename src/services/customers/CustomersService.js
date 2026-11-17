'use strict';
/**
 * CustomersService interface — NOT connected to storage yet (by design; MySQL/Salesforce later).
 *   list({ q, segment, page })  -> { items, total }
 *   get(id)                     -> customer (with orders summary, addresses, notes)
 *   update(id, patch)           -> customer  (e.g. status: active|blocked, tags, notes)
 *   addNote(id, text)           -> customer
 */
class CustomersService {
  async list() { throw new Error('not implemented'); }
  async get() { throw new Error('not implemented'); }
  async update() { throw new Error('not implemented'); }
  async addNote() { throw new Error('not implemented'); }
}
module.exports = CustomersService;
