'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const bool = (v, d = false) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(String(v)));
const ROOT = path.join(__dirname, '..', '..');

const config = {
  root: ROOT,
  port: Number(process.env.PORT || 3000),
  baseUrl: (process.env.BASE_URL || '').replace(/\/$/, ''),
  env: process.env.NODE_ENV || 'development',
  demoMode: bool(process.env.DEMO_MODE, true),
  session: {
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
    ttlHours: Number(process.env.SESSION_TTL_HOURS || 72),
    cookieName: 'hh_session',
  },
  dataProvider: process.env.DATA_PROVIDER || 'json',
  paths: {
    data: path.join(ROOT, 'data'),
    seed: path.join(ROOT, 'data', 'seed'),
    public: path.join(ROOT, 'public'),
    uploads: path.join(ROOT, 'public', 'uploads'),
    outbox: path.join(ROOT, 'storage', 'outbox'),
  },
  payments: {
    provider: process.env.PAYMENT_PROVIDER || 'dummy',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    dummySecret: process.env.DUMMY_GATEWAY_SECRET || 'dummy_gateway_secret',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'HomeHaat <no-reply@homehaat.example>',
  },
  mysql: {
    url: process.env.MYSQL_URL || '',
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'homehaat',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'homehaat',
    ssl: bool(process.env.MYSQL_SSL, false),
  },
  adminEmail: process.env.ADMIN_EMAIL || 'admin@demo.com',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
};

module.exports = config;
