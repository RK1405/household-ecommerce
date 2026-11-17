'use strict';
class HttpError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details; } }
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function errorHandler(err, req, res, _next) {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error('[error]', req.method, req.originalUrl, err);
  if (req.originalUrl.startsWith('/api')) return res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : err.message, details: err.details });
  res.status(status).send(err.message);
}
module.exports = { HttpError, wrap, errorHandler };
