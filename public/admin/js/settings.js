import { initAdmin } from './layout.js';
import { get, put } from '/js/lib/api.js';
import { esc } from '/js/lib/format.js';
import { toast } from './ui.js';

const { cfg } = await initAdmin('settings', 'Store settings');
const s = await get('/api/admin/settings');
const f = document.getElementById('f');
f.state.innerHTML = cfg.states.map((x) => `<option ${x === s.tax.state ? 'selected' : ''}>${esc(x)}</option>`).join('');
Object.assign(f, {});
f.std_charge.value = s.delivery.standard.charge; f.std_free.value = s.delivery.standard.freeAbove ?? ''; f.std_eta.value = s.delivery.standard.eta;
f.exp_charge.value = s.delivery.express.charge; f.exp_free.value = s.delivery.express.freeAbove ?? ''; f.exp_eta.value = s.delivery.express.eta;
f.cod_enabled.checked = s.cod.enabled; f.cod_max.value = s.cod.maxOrderValue; f.cod_min.value = s.cod.minOrderValue; f.low.value = s.lowStockThreshold; f.returnMin.value = s.returns?.minPrice ?? 1000;
f.legalName.value = s.tax.legalName; f.gstin.value = s.tax.gstin; f.invoicePrefix.value = s.tax.invoicePrefix;
document.getElementById('env').innerHTML = [['Demo mode', s.env.demoMode ? 'ON' : 'OFF'], ['Payment provider', s.env.paymentProvider], ['Data provider', s.env.dataProvider], ['Google Maps key', s.env.googleMapsKeySet ? 'Configured' : 'Not set (OpenStreetMap fallback)'], ['Base URL', s.env.baseUrl || '(auto)']].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
f.onsubmit = async (e) => {
  e.preventDefault();
  try {
    await put('/api/admin/settings', {
      delivery: { standard: { charge: f.std_charge.value, freeAbove: f.std_free.value, eta: f.std_eta.value }, express: { charge: f.exp_charge.value, freeAbove: f.exp_free.value, eta: f.exp_eta.value } },
      cod: { enabled: f.cod_enabled.checked, maxOrderValue: f.cod_max.value, minOrderValue: f.cod_min.value },
      tax: { legalName: f.legalName.value, gstin: f.gstin.value.toUpperCase(), state: f.state.value, invoicePrefix: f.invoicePrefix.value },
      lowStockThreshold: f.low.value,
      returns: { minPrice: f.returnMin.value },
    });
    toast('Settings saved', { type: 'success' });
  } catch (err) { toast(err.message, { type: 'error' }); }
};
