/** Fetch wrapper for the REST API. Throws ApiError with .status and .details (field errors). */
export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details || {}; }
}

export async function api(path, { method = 'GET', body, form, signal } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {}, signal };
  if (form) opts.body = form;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch(path.startsWith('/') ? path : `/api/${path}`, opts); }
  catch { throw new ApiError(0, 'Network error — please check your connection.'); }
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, (data && data.error) || res.statusText, data && data.details);
  return data;
}

export const get = (p) => api(p);
export const post = (p, body) => api(p, { method: 'POST', body: body ?? {} });
export const put = (p, body) => api(p, { method: 'PUT', body });
export const del = (p) => api(p, { method: 'DELETE' });
