'use strict';
const files = require('../db/files');
/**
 * Email service. In demo mode (DEMO_MODE=true, or the admin toggle) emails are NEVER sent:
 * the rendered HTML is written to storage/outbox and indexed in data/emails.json.
 * With demo mode off and SMTP configured, Nodemailer sends via SMTP (and still logs to the outbox).
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config');
const repo = require('../repositories');
const templates = require('../emails/templates');
const { id } = require('../utils/ids');

function smtpSettings() {
  const s = repo.settings.get().email || {};
  const smtp = { ...config.smtp, ...Object.fromEntries(Object.entries(s.smtp || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined)) };
  return { smtp, demoMode: config.demoMode || s.demoMode !== false, enabled: s.enabled || {}, adminEmail: s.adminEmail || config.adminEmail };
}

function baseUrl() { return config.baseUrl || `http://localhost:${config.port}`; }

async function send(type, to, data = {}) {
  const { smtp, demoMode, enabled } = smtpSettings();
  if (enabled[type] === false) return { skipped: true, reason: 'disabled' };
  const store = repo.cms.get().store;
  const { subject, html } = templates.render(type, data, { store, baseUrl: baseUrl() });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `${stamp}_${type}_${id()}.html`;
  await files.put('outbox', file, html, 'text/html; charset=utf-8');
  const record = { id: id('em_'), type, label: templates.LABELS[type], to, subject, file, orderNo: data.order?.orderNo || null, status: 'outbox', createdAt: new Date().toISOString() };
  if (!demoMode && smtp.host) {
    try {
      const transport = nodemailer.createTransport({ host: smtp.host, port: Number(smtp.port), secure: !!smtp.secure, auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined });
      await transport.sendMail({ from: smtp.from, to, subject, html });
      record.status = 'sent';
    } catch (e) {
      record.status = 'failed';
      record.error = e.message;
    }
  }
  repo.emails.create(record);
  return record;
}

/** Fire-and-forget helper so email problems never break checkout. */
function queue(type, to, data) {
  send(type, to, data).catch((e) => console.error('[email]', type, e.message));
}

function preview(type) {
  const store = repo.cms.get().store;
  const sampleOrder = repo.orders.all()[0];
  const sample = {
    user: { name: 'Priya Raman', email: 'user@demo.com' },
    link: `${baseUrl()}/login.html?reset=sample-token`,
    order: sampleOrder,
    payment: { id: 'pay_sample123', amount: sampleOrder?.totals.total || 1999, method: 'UPI', failureReason: 'Declined by bank (demo)' },
    refund: { id: 'rfnd_sample', amount: sampleOrder?.totals.total || 1999 },
    contact: { name: 'Arjun', email: 'arjun@example.com', phone: '9876543210', topic: 'Order help', message: 'Where is my order?' },
  };
  return templates.render(type, sample, { store, baseUrl: baseUrl() });
}

const STATUS_EMAIL = { Shipped: 'order_shipped', 'Out for delivery': 'out_for_delivery', Delivered: 'delivered', Cancelled: 'cancelled', Returned: 'refund' };

module.exports = { send, queue, preview, smtpSettings, STATUS_EMAIL, LABELS: templates.LABELS, TYPES: templates.TYPES };
