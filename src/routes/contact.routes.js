'use strict';
const router = require('express').Router();
const repo = require('../repositories');
const email = require('../services/email.service');
const { HttpError } = require('../middleware/errors');
const { isEmail, isMobile, normPhone } = require('../utils/validate');
const { id } = require('../utils/ids');

router.post('/', (req, res) => {
  const b = req.body || {};
  const errors = {};
  if (!String(b.name || '').trim()) errors.name = 'Name is required';
  if (!isEmail(b.email)) errors.email = 'Enter a valid email';
  if (b.phone && !isMobile(b.phone)) errors.phone = 'Enter a valid 10-digit mobile number';
  if (String(b.message || '').trim().length < 10) errors.message = 'Please write at least 10 characters';
  if (b.website) errors.website = 'Spam detected'; // honeypot
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
  const contact = repo.contacts.create({ id: id('ct_'), name: String(b.name).trim(), email: b.email.trim(), phone: b.phone ? normPhone(b.phone) : '', topic: String(b.topic || 'General').slice(0, 40), orderNo: String(b.orderNo || '').slice(0, 20), message: String(b.message).trim().slice(0, 2000), status: 'new', createdAt: new Date().toISOString() });
  email.queue('contact_admin', email.smtpSettings().adminEmail, { contact });
  res.status(201).json({ message: `Thanks ${contact.name.split(' ')[0]}! We have received your message and will reply within one working day. Reference: ${contact.id.toUpperCase()}` });
});

module.exports = router;
