/** Chart.js helpers (Chart.js served locally from /vendor/chart.js). */
const COLORS = ['#0f766e', '#f97350', '#f59e0b', '#3a86c8', '#7b5ea7', '#6a8d3a', '#4a5d7e', '#d16d8f'];
let loading;
export function loadChart() {
  loading ||= window.Chart ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/vendor/chart.js/chart.umd.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  return loading;
}
const inrTick = (v) => `₹${Number(v).toLocaleString('en-IN', { notation: 'compact', maximumFractionDigits: 1 })}`;
const font = { family: getComputedStyle(document.documentElement).getPropertyValue('--font-sans') };

export async function lineChartAsync(canvas, labels, datasets) {
  await loadChart();
  return new window.Chart(canvas, {
    type: 'line',
    data: { labels, datasets: datasets.map((d, i) => ({ borderColor: COLORS[i], backgroundColor: i ? `${COLORS[i]}55` : `${COLORS[i]}22`, fill: !d.type, tension: .35, pointRadius: 0, borderWidth: 2, ...d })) },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { font } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.dataset.yAxisID === 'y1' ? c.raw : `₹${Number(c.raw).toLocaleString('en-IN')}`}` } } },
      scales: { y: { ticks: { callback: inrTick }, grid: { color: '#eee' } }, y1: { position: 'right', grid: { display: false }, display: datasets.some((d) => d.yAxisID === 'y1'), ticks: { precision: 0 } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } } },
  });
}
/** Synchronous-looking wrapper returning an object with destroy(). */
export function lineChart(canvas, labels, datasets) {
  const h = { chart: null, destroy() { this.chart?.destroy(); } };
  lineChartAsync(canvas, labels, datasets).then((c) => { h.chart = c; });
  return h;
}
export async function doughnut(canvas, labels, data) {
  await loadChart();
  return new window.Chart(canvas, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: COLORS, borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.label}: ₹${Number(c.raw).toLocaleString('en-IN')}` } } } } });
}
export async function bar(canvas, labels, data, label = 'Revenue (₹)') {
  await loadChart();
  return new window.Chart(canvas, { type: 'bar', data: { labels, datasets: [{ label, data, backgroundColor: COLORS[0], borderRadius: 6 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: inrTick } } } } });
}
