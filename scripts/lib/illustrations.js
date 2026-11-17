'use strict';
/**
 * Original, category-styled vector illustrations for the demo catalogue.
 * Each "shape" draws a simple household object inside a 400x400 box centred at (200,200).
 * These are placeholders: replace with real photography via Admin → Products → Upload images.
 */

function hex(h) { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function toHex(rgb) { return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); }
const shade = (c, t) => mix(c, '#000000', t);
const tint = (c, t) => mix(c, '#ffffff', t);

const steel = '#b8c2cc', steelD = '#7d8a96', steelL = '#e6ebef', wood = '#a8754a', woodD = '#7a5233';

const S = {
  kadai: (c) => `
    <ellipse cx="200" cy="300" rx="150" ry="18" fill="#000" opacity=".12"/>
    <path d="M70 190 Q80 300 200 300 Q320 300 330 190 Z" fill="${c}"/>
    <ellipse cx="200" cy="190" rx="130" ry="26" fill="${shade(c, .35)}"/>
    <ellipse cx="200" cy="186" rx="122" ry="20" fill="${shade(c, .55)}"/>
    <path d="M52 182 q-22 0 -22 18 q0 14 22 14" stroke="${steelD}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M348 182 q22 0 22 18 q0 14 -22 14" stroke="${steelD}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M95 220 Q120 280 200 285" stroke="#fff" stroke-width="8" opacity=".25" fill="none" stroke-linecap="round"/>`,
  tawa: (c) => `
    <ellipse cx="190" cy="300" rx="140" ry="16" fill="#000" opacity=".12"/>
    <circle cx="180" cy="200" r="120" fill="${shade(c, .55)}"/>
    <circle cx="180" cy="200" r="104" fill="${shade(c, .35)}"/>
    <circle cx="180" cy="200" r="70" fill="none" stroke="${tint(c, .3)}" stroke-width="3" opacity=".4"/>
    <rect x="290" y="186" width="100" height="28" rx="14" fill="${woodD}"/>
    <rect x="300" y="192" width="80" height="6" rx="3" fill="${wood}"/>`,
  cooker: (c) => `
    <ellipse cx="200" cy="320" rx="130" ry="16" fill="#000" opacity=".12"/>
    <path d="M90 170 h220 v120 q0 30 -30 30 h-160 q-30 0 -30 -30 Z" fill="${c}"/>
    <path d="M80 160 q120 -40 240 0 v14 h-240 Z" fill="${shade(c, .3)}"/>
    <rect x="186" y="112" width="28" height="30" rx="6" fill="#222"/>
    <rect x="194" y="96" width="12" height="20" rx="4" fill="#444"/>
    <rect x="300" y="150" width="90" height="22" rx="11" fill="#222"/>
    <rect x="10" y="150" width="70" height="20" rx="10" fill="#222"/>
    <path d="M110 200 v80" stroke="#fff" stroke-width="10" opacity=".22" stroke-linecap="round"/>`,
  appam: (c) => `
    <ellipse cx="200" cy="300" rx="150" ry="16" fill="#000" opacity=".12"/>
    <circle cx="200" cy="200" r="130" fill="${shade(c, .5)}"/>
    ${[[-55, -55], [0, -70], [55, -55], [-70, 0], [0, 0], [70, 0], [-55, 55], [0, 70], [55, 55]].map(([x, y]) => `<circle cx="${200 + x}" cy="${200 + y}" r="24" fill="${shade(c, .7)}"/><circle cx="${196 + x}" cy="${196 + y}" r="9" fill="${tint(c, .2)}" opacity=".35"/>`).join('')}
    <rect x="318" y="190" width="70" height="22" rx="11" fill="${woodD}"/>`,
  jars: (c) => [0, 1, 2].map((i) => {
    const x = 70 + i * 95, h = 170 - (i % 2) * 30;
    return `<rect x="${x}" y="${300 - h}" width="80" height="${h}" rx="16" fill="${tint(c, .75)}" stroke="${tint(c, .2)}" stroke-width="3" opacity=".95"/>
      <rect x="${x + 4}" y="${300 - h + 40}" width="72" height="${h - 50}" rx="10" fill="${['#e9b44c', '#9c6644', '#d2691e'][i]}" opacity=".85"/>
      <rect x="${x - 4}" y="${290 - h}" width="88" height="22" rx="8" fill="${c}"/>
      <rect x="${x + 10}" y="${300 - h + 30}" width="10" height="${h - 60}" rx="5" fill="#fff" opacity=".5"/>`;
  }).join('') + `<rect x="50" y="300" width="300" height="10" rx="5" fill="#000" opacity=".1"/>`,
  dabba: (c) => `
    <ellipse cx="200" cy="300" rx="150" ry="18" fill="#000" opacity=".12"/>
    <circle cx="200" cy="200" r="135" fill="${steel}"/>
    <circle cx="200" cy="200" r="122" fill="${steelD}"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => { const a = i * Math.PI / 3; return `<circle cx="${200 + Math.cos(a) * 76}" cy="${200 + Math.sin(a) * 76}" r="36" fill="${steelL}"/><circle cx="${200 + Math.cos(a) * 76}" cy="${200 + Math.sin(a) * 76}" r="28" fill="${['#e9b44c', '#c0392b', '#7f5539', '#f4d35e', '#6a994e', '#bc4749'][i]}"/>`; }).join('')}
    <circle cx="200" cy="200" r="36" fill="${steelL}"/><circle cx="200" cy="200" r="28" fill="${c}"/>`,
  containers: (c) => `
    <rect x="60" y="210" width="170" height="90" rx="14" fill="${tint(c, .8)}" stroke="${c}" stroke-width="3"/>
    <rect x="54" y="196" width="182" height="22" rx="8" fill="${c}"/>
    <rect x="180" y="150" width="160" height="150" rx="16" fill="${tint(c, .85)}" stroke="${c}" stroke-width="3"/>
    <rect x="172" y="136" width="176" height="24" rx="8" fill="${shade(c, .15)}"/>
    <rect x="200" y="200" width="120" height="80" rx="8" fill="#8bc34a" opacity=".55"/>
    <rect x="80" y="235" width="130" height="50" rx="8" fill="#ff9800" opacity=".45"/>
    <rect x="40" y="300" width="320" height="10" rx="5" fill="#000" opacity=".1"/>`,
  dinnerset: (c) => `
    <ellipse cx="200" cy="300" rx="160" ry="18" fill="#000" opacity=".1"/>
    <circle cx="170" cy="200" r="120" fill="#fff"/><circle cx="170" cy="200" r="120" fill="none" stroke="${c}" stroke-width="10"/>
    <circle cx="170" cy="200" r="80" fill="none" stroke="${tint(c, .5)}" stroke-width="4"/>
    <circle cx="300" cy="250" r="62" fill="#fff" stroke="${c}" stroke-width="8"/>
    <circle cx="300" cy="250" r="38" fill="${tint(c, .8)}"/>
    <path d="M60 330 h40" stroke="${steelD}" stroke-width="8" stroke-linecap="round"/>`,
  thali: (c) => `
    <ellipse cx="200" cy="305" rx="160" ry="18" fill="#000" opacity=".12"/>
    <circle cx="200" cy="200" r="145" fill="${steel}"/><circle cx="200" cy="200" r="132" fill="${steelL}"/>
    ${[[-70, -50, '#f4a261'], [0, -80, '#e9c46a'], [70, -50, '#2a9d8f'], [80, 30, '#e76f51']].map(([x, y, f]) => `<circle cx="${200 + x}" cy="${200 + y}" r="32" fill="${steelD}"/><circle cx="${200 + x}" cy="${200 + y}" r="26" fill="${f}"/>`).join('')}
    <ellipse cx="160" cy="250" rx="60" ry="35" fill="#fff8e7"/>
    <circle cx="240" cy="260" r="30" fill="#d4a373"/>
    <circle cx="200" cy="200" r="145" fill="none" stroke="${c}" stroke-width="6" opacity=".6"/>`,
  bowls: (c) => [0, 1, 2].map((i) => `<path d="M${50 + i * 105} ${200 + (i % 2) * 40} q50 95 100 0 Z" fill="${[c, tint(c, .3), shade(c, .2)][i]}"/><ellipse cx="${100 + i * 105}" cy="${200 + (i % 2) * 40}" rx="50" ry="12" fill="${shade(c, .35)}"/>`).join('') + `<rect x="40" y="300" width="320" height="8" rx="4" fill="#000" opacity=".1"/>`,
  wallart: (c) => [0, 1, 2].map((i) => {
    const x = 40 + i * 112;
    return `<rect x="${x}" y="90" width="96" height="200" rx="4" fill="${woodD}"/>
      <rect x="${x + 8}" y="98" width="80" height="184" fill="${tint(c, .85)}"/>
      <circle cx="${x + 48}" cy="${150 + i * 10}" r="${22 + i * 4}" fill="${c}"/>
      <path d="M${x + 14} 260 q34 -${40 + i * 10} 68 0" fill="${shade(c, .3)}"/>
      <path d="M${x + 14} 120 h68" stroke="${shade(c, .4)}" stroke-width="3" stroke-dasharray="6 4"/>`;
  }).join(''),
  mandala: (c) => `
    <circle cx="200" cy="200" r="140" fill="none" stroke="${c}" stroke-width="6"/>
    ${Array.from({ length: 16 }, (_, i) => `<ellipse cx="200" cy="95" rx="16" ry="44" fill="${i % 2 ? c : shade(c, .25)}" transform="rotate(${i * 22.5} 200 200)"/>`).join('')}
    ${Array.from({ length: 8 }, (_, i) => `<circle cx="200" cy="140" r="12" fill="${tint(c, .4)}" transform="rotate(${i * 45} 200 200)"/>`).join('')}
    <circle cx="200" cy="200" r="38" fill="${shade(c, .3)}"/><circle cx="200" cy="200" r="18" fill="${tint(c, .5)}"/>`,
  shelves: (c) => [0, 1, 2].map((i) => `<rect x="${60 + i * 30}" y="${110 + i * 75}" width="${280 - i * 60}" height="20" rx="4" fill="${c}"/><rect x="${60 + i * 30}" y="${128 + i * 75}" width="${280 - i * 60}" height="6" fill="${shade(c, .3)}"/>`).join('') +
    `<rect x="90" y="70" width="24" height="40" rx="4" fill="#6a994e"/><circle cx="102" cy="62" r="18" fill="#a7c957"/><rect x="250" y="80" width="40" height="30" rx="3" fill="#e9c46a"/><rect x="150" y="160" width="14" height="35" fill="#bc4749"/><rect x="168" y="165" width="14" height="30" fill="#386641"/><circle cx="230" cy="250" r="14" fill="#f4a261"/>`,
  pendant: (c) => `
    <path d="M200 20 v90" stroke="#333" stroke-width="4"/>
    <path d="M110 230 Q110 110 200 110 Q290 110 290 230 Z" fill="${c}"/>
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${118 + i * 20} 228 Q${200} 100 ${118 + i * 20} 228" stroke="${shade(c, .35)}" stroke-width="3" fill="none"/>`).join('')}
    ${Array.from({ length: 5 }, (_, i) => `<path d="M112 ${140 + i * 20} H288" stroke="${shade(c, .3)}" stroke-width="3" opacity=".7"/>`).join('')}
    <ellipse cx="200" cy="230" rx="90" ry="12" fill="${shade(c, .4)}"/>
    <ellipse cx="200" cy="300" rx="120" ry="60" fill="#ffd166" opacity=".25"/>
    <circle cx="200" cy="240" r="16" fill="#fff3b0"/>`,
  tablelamp: (c) => `
    <ellipse cx="200" cy="330" rx="100" ry="12" fill="#000" opacity=".12"/>
    <path d="M120 70 h160 l40 110 h-240 Z" fill="${tint(c, .7)}"/>
    <path d="M120 70 h160 l40 110 h-240 Z" fill="none" stroke="${tint(c, .3)}" stroke-width="3"/>
    <path d="M150 190 q-40 70 10 130 h80 q50 -60 10 -130 Z" fill="${c}"/>
    <path d="M165 210 q-20 50 5 95" stroke="#fff" stroke-width="7" opacity=".3" fill="none" stroke-linecap="round"/>
    <ellipse cx="200" cy="200" rx="110" ry="30" fill="#ffd166" opacity=".2"/>`,
  stringlights: (c) => `
    <path d="M20 90 Q100 170 200 110 T380 120" stroke="#2d3a3a" stroke-width="3" fill="none"/>
    <path d="M20 210 Q110 290 200 230 T380 240" stroke="#2d3a3a" stroke-width="3" fill="none"/>
    ${[[40, 112], [80, 136], [120, 140], [160, 126], [200, 110], [240, 104], [280, 112], [320, 124], [360, 122], [45, 234], [85, 258], [125, 262], [165, 248], [205, 230], [245, 224], [285, 232], [325, 244], [365, 242]].map(([x, y], i) => `<circle cx="${x}" cy="${y + 14}" r="22" fill="${['#ffd166', c, '#ff8fab', '#90e0ef'][i % 4]}" opacity=".35"/><ellipse cx="${x}" cy="${y + 14}" rx="8" ry="11" fill="${['#ffd166', c, '#ff8fab', '#90e0ef'][i % 4]}"/>`).join('')}
    <text x="200" y="340" font-family="Georgia,serif" font-size="34" text-anchor="middle" fill="${shade(c, .2)}">✦ Shubh Deepavali ✦</text>`,
  cushion: (c) => `
    <ellipse cx="200" cy="320" rx="140" ry="14" fill="#000" opacity=".12"/>
    <path d="M70 90 Q200 60 330 90 Q350 200 330 310 Q200 340 70 310 Q50 200 70 90 Z" fill="${c}"/>
    <path d="M90 110 Q200 90 310 110 Q325 200 310 290 Q200 310 90 290 Q75 200 90 110 Z" fill="none" stroke="${tint(c, .5)}" stroke-width="4" stroke-dasharray="10 8"/>
    ${[[150, 160], [250, 160], [150, 240], [250, 240], [200, 200]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="22" fill="${tint(c, .6)}"/><circle r="10" fill="${shade(c, .3)}"/>${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${Math.cos(a * Math.PI / 180) * 30}" cy="${Math.sin(a * Math.PI / 180) * 30}" r="5" fill="${tint(c, .6)}"/>`).join('')}</g>`).join('')}`,
  throw: (c) => `
    <rect x="70" y="80" width="260" height="230" rx="10" fill="${c}"/>
    ${Array.from({ length: 6 }, (_, i) => `<rect x="70" y="${100 + i * 36}" width="260" height="12" fill="${i % 2 ? tint(c, .55) : shade(c, .3)}"/>`).join('')}
    ${Array.from({ length: 22 }, (_, i) => `<path d="M${76 + i * 12} 310 v24" stroke="${tint(c, .4)}" stroke-width="4" stroke-linecap="round"/>`).join('')}
    <path d="M70 80 q130 40 260 0" fill="${shade(c, .2)}" opacity=".35"/>`,
  mop: (c) => `
    <ellipse cx="200" cy="335" rx="130" ry="12" fill="#000" opacity=".12"/>
    <path d="M110 220 h180 l-20 110 h-140 Z" fill="${c}"/>
    <rect x="100" y="210" width="200" height="18" rx="9" fill="${shade(c, .3)}"/>
    <rect x="236" y="30" width="12" height="250" rx="6" fill="${steel}" transform="rotate(14 242 160)"/>
    <ellipse cx="210" cy="265" rx="55" ry="18" fill="${tint(c, .7)}"/>
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${165 + i * 11} 262 q4 18 0 30" stroke="#f1f1f1" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}`,
  cloths: (c) => [0, 1, 2, 3].map((i) => `<rect x="${70 + i * 18}" y="${110 + i * 40}" width="240" height="70" rx="10" fill="${[c, '#f4a261', '#2a9d8f', '#e76f51'][i]}"/><path d="M${80 + i * 18} ${120 + i * 40} h220" stroke="#fff" stroke-width="2" opacity=".35" stroke-dasharray="3 3"/>`).join(''),
  broom: (c) => `
    <rect x="190" y="30" width="20" height="190" rx="8" fill="${c}"/>
    ${Array.from({ length: 4 }, (_, i) => `<rect x="186" y="${60 + i * 40}" width="28" height="8" rx="3" fill="${shade(c, .35)}"/>`).join('')}
    ${Array.from({ length: 25 }, (_, i) => `<path d="M200 215 Q${120 + i * 6.5} 280 ${100 + i * 8.5} 345" stroke="${i % 3 ? '#d4a373' : '#bc8a5f'}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}`,
  toiletbrush: (c) => `
    <ellipse cx="200" cy="335" rx="80" ry="10" fill="#000" opacity=".12"/>
    <path d="M140 200 h120 l-10 130 h-100 Z" fill="${c}"/>
    <rect x="132" y="190" width="136" height="18" rx="9" fill="${shade(c, .3)}"/>
    <rect x="192" y="40" width="16" height="160" rx="8" fill="${tint(c, .3)}"/>
    <circle cx="200" cy="40" r="14" fill="${shade(c, .2)}"/>`,
  basket: (c) => `
    <ellipse cx="200" cy="330" rx="140" ry="14" fill="#000" opacity=".12"/>
    <path d="M80 130 h240 l-25 195 h-190 Z" fill="${c}"/>
    ${Array.from({ length: 7 }, (_, i) => `<path d="M${85 + i * 2} ${155 + i * 25} H${315 - i * 2}" stroke="${shade(c, .25)}" stroke-width="5"/>`).join('')}
    ${Array.from({ length: 10 }, (_, i) => `<path d="M${100 + i * 22} 130 L${108 + i * 19} 325" stroke="${tint(c, .3)}" stroke-width="3" opacity=".6"/>`).join('')}
    <rect x="72" y="118" width="256" height="20" rx="10" fill="${shade(c, .35)}"/>
    <path d="M150 128 q50 -50 100 0" stroke="${shade(c, .35)}" stroke-width="10" fill="none"/>`,
  dryingstand: (c) => `
    <path d="M60 330 L200 120 L340 330" stroke="${steelD}" stroke-width="10" fill="none"/>
    <path d="M100 330 L200 160 L300 330" stroke="${steel}" stroke-width="6" fill="none"/>
    ${[0, 1, 2, 3].map((i) => `<path d="M${50 - i * 0} ${140 + i * 40} H350" stroke="${steelD}" stroke-width="5"/>`).join('')}
    <path d="M90 140 h70 v80 h-70 Z" fill="${c}"/><path d="M220 180 h80 v70 h-80 Z" fill="${tint(c, .5)}"/><path d="M170 220 h40 v60 h-40 Z" fill="#f4a261"/>`,
  clips: (c) => Array.from({ length: 8 }, (_, i) => {
    const x = 60 + (i % 4) * 80, y = 100 + Math.floor(i / 4) * 130;
    return `<g transform="rotate(${(i % 2 ? 10 : -10)} ${x + 15} ${y + 50})"><rect x="${x}" y="${y}" width="16" height="100" rx="6" fill="${[c, '#f4a261', '#2a9d8f', '#e76f51'][i % 4]}"/><rect x="${x + 18}" y="${y}" width="16" height="100" rx="6" fill="${shade([c, '#f4a261', '#2a9d8f', '#e76f51'][i % 4], .2)}"/><circle cx="${x + 17}" cy="${y + 55}" r="9" fill="${steel}"/></g>`;
  }).join(''),
  towel: (c) => `
    <ellipse cx="200" cy="320" rx="150" ry="14" fill="#000" opacity=".1"/>
    <rect x="60" y="230" width="280" height="80" rx="16" fill="${shade(c, .1)}"/>
    <rect x="80" y="160" width="250" height="80" rx="16" fill="${tint(c, .3)}"/>
    <rect x="70" y="90" width="260" height="80" rx="16" fill="${c}"/>
    ${[110, 180, 250].map((y, i) => `<rect x="${[70, 80, 60][i]}" y="${y + 40}" width="${[260, 250, 280][i]}" height="10" fill="#fff" opacity=".35"/>`).join('')}`,
  gamcha: (c) => `
    <rect x="50" y="80" width="300" height="240" rx="6" fill="${c}"/>
    ${Array.from({ length: 10 }, (_, i) => `<rect x="${50 + i * 30}" y="80" width="12" height="240" fill="${tint(c, .55)}" opacity=".7"/>`).join('')}
    ${Array.from({ length: 8 }, (_, i) => `<rect x="50" y="${80 + i * 30}" width="300" height="10" fill="${shade(c, .3)}" opacity=".6"/>`).join('')}
    ${Array.from({ length: 24 }, (_, i) => `<path d="M${54 + i * 12.5} 320 v18" stroke="${tint(c, .4)}" stroke-width="3"/>`).join('')}`,
  bathset: (c) => `
    <ellipse cx="200" cy="320" rx="160" ry="14" fill="#000" opacity=".1"/>
    <path d="M70 160 q-10 140 20 160 h50 q30 -20 20 -160 Z" fill="${c}"/><rect x="95" y="120" width="20" height="40" fill="${steel}"/><rect x="88" y="112" width="40" height="12" rx="4" fill="${steelD}"/>
    <rect x="170" y="200" width="70" height="120" rx="14" fill="${tint(c, .2)}"/>
    ${[0, 1, 2].map((i) => `<rect x="${185 + i * 14}" y="180" width="8" height="40" rx="4" fill="${['#e76f51', '#2a9d8f', '#e9c46a'][i]}"/>`).join('')}
    <ellipse cx="300" cy="300" rx="55" ry="18" fill="${shade(c, .15)}"/><ellipse cx="300" cy="292" rx="40" ry="10" fill="#fff"/>`,
  bathmat: (c) => `
    <rect x="40" y="110" width="320" height="200" rx="40" fill="${c}"/>
    ${Array.from({ length: 12 }, (_, r) => Array.from({ length: 18 }, (_, k) => `<circle cx="${62 + k * 16}" cy="${128 + r * 15}" r="4" fill="${tint(c, .35)}"/>`).join('')).join('')}`,
  cornershelf: (c) => `
    <path d="M200 40 V360" stroke="${steelD}" stroke-width="10"/>
    ${[0, 1, 2].map((i) => `<path d="M200 ${100 + i * 90} L330 ${130 + i * 90} L200 ${160 + i * 90} L70 ${130 + i * 90} Z" fill="${steel}" stroke="${steelD}" stroke-width="4"/>`).join('')}
    <rect x="150" y="70" width="30" height="58" rx="8" fill="${c}"/><rect x="220" y="170" width="28" height="48" rx="8" fill="${tint(c, .4)}"/><circle cx="190" cy="270" r="18" fill="#f4a261"/>`,
  bedsheet: (c) => `
    <rect x="40" y="200" width="320" height="110" rx="10" fill="${c}"/>
    ${Array.from({ length: 10 }, (_, i) => `<circle cx="${60 + i * 32}" cy="250" r="9" fill="${tint(c, .6)}"/><path d="M${52 + i * 32} 280 h16" stroke="${shade(c, .3)}" stroke-width="4"/>`).join('')}
    <rect x="70" y="120" width="120" height="70" rx="22" fill="${tint(c, .5)}"/><rect x="210" y="120" width="120" height="70" rx="22" fill="${tint(c, .5)}"/>
    <rect x="40" y="200" width="320" height="16" fill="${shade(c, .25)}"/>
    <rect x="30" y="300" width="340" height="30" rx="6" fill="${woodD}"/>`,
  bedcover: (c) => `
    <rect x="50" y="70" width="300" height="260" rx="8" fill="${c}"/>
    ${Array.from({ length: 13 }, (_, i) => `<path d="M60 ${88 + i * 19} H340" stroke="${tint(c, .6)}" stroke-width="2" stroke-dasharray="6 5"/>`).join('')}
    <circle cx="200" cy="200" r="60" fill="${shade(c, .3)}"/><circle cx="200" cy="200" r="40" fill="${tint(c, .5)}"/><circle cx="200" cy="200" r="16" fill="${shade(c, .5)}"/>`,
  pillow: (c) => `
    <ellipse cx="200" cy="300" rx="150" ry="14" fill="#000" opacity=".1"/>
    <path d="M60 150 Q200 110 340 150 Q360 210 340 270 Q200 300 60 270 Q40 210 60 150 Z" fill="${tint(c, .65)}"/>
    <path d="M90 170 Q200 140 310 170" stroke="${c}" stroke-width="4" fill="none" opacity=".6"/>
    <path d="M70 180 Q200 160 330 200 Q330 250 310 260 Q200 280 90 260" fill="${c}" opacity=".18"/>`,
  contourpillow: (c) => `
    <ellipse cx="200" cy="300" rx="150" ry="14" fill="#000" opacity=".1"/>
    <path d="M50 270 V190 Q50 140 110 150 Q170 165 200 200 Q230 165 290 150 Q350 140 350 190 V270 Z" fill="${tint(c, .55)}"/>
    <path d="M50 270 h300 v20 h-300 Z" fill="${c}"/>
    <path d="M70 200 Q140 170 200 220 Q260 170 330 200" stroke="${c}" stroke-width="5" fill="none" opacity=".6"/>`,
  wardrobe: (c) => `
    <rect x="90" y="40" width="220" height="300" rx="10" fill="${c}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="104" y="${60 + i * 55}" width="192" height="44" rx="4" fill="${tint(c, .55)}"/><rect x="120" y="${72 + i * 55}" width="${60 + (i * 23) % 70}" height="26" rx="3" fill="${['#e76f51', '#2a9d8f', '#e9c46a', '#264653', '#f4a261'][i]}"/>`).join('')}
    <rect x="90" y="330" width="220" height="12" rx="4" fill="${shade(c, .3)}"/>`,
  drawer: (c) => `
    <rect x="40" y="110" width="320" height="200" rx="12" fill="${tint(c, .7)}" stroke="${c}" stroke-width="6"/>
    <path d="M150 116 V304 M250 116 V304 M46 210 H354" stroke="${c}" stroke-width="6"/>
    <rect x="70" y="140" width="50" height="10" rx="5" fill="#e76f51"/><rect x="66" y="160" width="60" height="10" rx="5" fill="#264653"/>
    <circle cx="200" cy="160" r="22" fill="#e9c46a"/><rect x="270" y="240" width="60" height="40" rx="6" fill="#2a9d8f"/>`,
  trolley: (c) => `
    ${[0, 1, 2, 3].map((i) => `<rect x="90" y="${70 + i * 70}" width="220" height="50" rx="8" fill="${c}"/><rect x="100" y="${70 + i * 70}" width="200" height="8" fill="${shade(c, .3)}"/>`).join('')}
    <path d="M95 60 V340 M305 60 V340" stroke="${steelD}" stroke-width="8"/>
    <circle cx="110" cy="345" r="12" fill="#333"/><circle cx="290" cy="345" r="12" fill="#333"/>
    <circle cx="150" cy="140" r="14" fill="#e76f51"/><circle cx="180" cy="140" r="14" fill="#f4a261"/><circle cx="240" cy="210" r="14" fill="#6a994e"/>`,
  shoerack: (c) => `
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="70" y="${80 + i * 55}" width="260" height="10" rx="4" fill="${c}"/>`).join('')}
    <path d="M75 60 V340 M325 60 V340" stroke="${shade(c, .3)}" stroke-width="10"/>
    ${[[100, 60, '#e76f51'], [190, 60, '#264653'], [120, 115, '#2a9d8f'], [230, 170, '#e9c46a'], [100, 225, '#6d597a']].map(([x, y, f]) => `<path d="M${x} ${y + 18} q0 -18 20 -18 h20 q10 0 20 10 l30 6 q8 2 8 10 v2 h-98 Z" fill="${f}"/>`).join('')}`,
  utensilrack: (c) => `
    <rect x="50" y="80" width="300" height="14" rx="7" fill="${steelD}"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${80 + i * 48} 94 v20" stroke="${steelD}" stroke-width="4"/>`).join('')}
    <path d="M80 114 v120" stroke="${steel}" stroke-width="8"/><ellipse cx="80" cy="245" rx="18" ry="24" fill="${steel}"/>
    <path d="M128 114 v130" stroke="${steel}" stroke-width="8"/><rect x="114" y="240" width="28" height="40" rx="4" fill="${steel}"/>
    <circle cx="200" cy="190" r="70" fill="${c}"/><circle cx="200" cy="190" r="55" fill="${shade(c, .3)}"/>
    <path d="M272 114 v150" stroke="${woodD}" stroke-width="10"/><circle cx="320" cy="200" r="30" fill="${steelL}" stroke="${steelD}" stroke-width="4"/>
    <rect x="50" y="300" width="300" height="40" rx="8" fill="${steel}"/>`,
  kettle: (c) => `
    <ellipse cx="200" cy="330" rx="120" ry="14" fill="#000" opacity=".12"/>
    <rect x="100" y="305" width="190" height="22" rx="8" fill="#222"/>
    <path d="M120 140 h150 q20 0 20 20 v130 q0 16 -16 16 h-158 q-16 0 -16 -16 v-130 q0 -20 20 -20 Z" fill="${c}"/>
    <path d="M120 140 Q 195 100 270 140" fill="${shade(c, .2)}"/>
    <rect x="178" y="104" width="34" height="14" rx="7" fill="#222"/>
    <path d="M290 160 q60 10 50 80 q-6 40 -50 50" stroke="#222" stroke-width="18" fill="none"/>
    <path d="M100 170 l-40 -30 l6 -10 l44 20" fill="${shade(c, .2)}"/>
    <path d="M135 170 v110" stroke="#fff" stroke-width="10" opacity=".25" stroke-linecap="round"/>`,
  glasskettle: (c) => `
    <ellipse cx="200" cy="330" rx="120" ry="14" fill="#000" opacity=".12"/>
    <rect x="100" y="300" width="190" height="26" rx="8" fill="#222"/>
    <path d="M120 120 h150 l10 180 h-170 Z" fill="#cfe9f5" opacity=".6" stroke="#9cc7da" stroke-width="4"/>
    <path d="M115 240 h165 l5 60 h-175 Z" fill="${c}" opacity=".55"/>
    ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${150 + i * 22}" cy="${260 - (i % 2) * 14}" r="5" fill="#fff" opacity=".7"/>`).join('')}
    <rect x="110" y="104" width="170" height="20" rx="8" fill="#222"/>
    <path d="M280 140 q60 10 50 80 q-6 40 -50 50" stroke="#222" stroke-width="18" fill="none"/>`,
  mixer: (c) => `
    <ellipse cx="200" cy="335" rx="130" ry="12" fill="#000" opacity=".12"/>
    <path d="M110 230 h180 l-10 100 h-160 Z" fill="${c}"/>
    <circle cx="200" cy="285" r="18" fill="#222"/><path d="M200 285 l10 -10" stroke="#fff" stroke-width="4"/>
    <path d="M140 80 h120 l-15 150 h-90 Z" fill="${steelL}" stroke="${steelD}" stroke-width="4"/>
    <rect x="130" y="64" width="140" height="22" rx="8" fill="#222"/>
    <path d="M260 110 q40 20 0 90" stroke="#222" stroke-width="12" fill="none"/>
    <rect x="165" y="215" width="70" height="18" fill="${shade(c, .3)}"/>`,
  handblender: (c) => `
    <ellipse cx="200" cy="345" rx="80" ry="10" fill="#000" opacity=".12"/>
    <rect x="165" y="40" width="70" height="150" rx="34" fill="${c}"/>
    <rect x="186" y="70" width="28" height="40" rx="10" fill="${shade(c, .3)}"/>
    <rect x="188" y="190" width="24" height="110" fill="${steel}"/>
    <path d="M160 300 q40 -20 80 0 v30 h-80 Z" fill="${steelD}"/>
    <rect x="250" y="200" width="70" height="130" rx="10" fill="#cfe9f5" opacity=".7" stroke="#9cc7da" stroke-width="3"/>`,
  iron: (c) => `
    <ellipse cx="200" cy="320" rx="150" ry="14" fill="#000" opacity=".12"/>
    <path d="M40 300 Q60 200 200 190 h140 v110 Z" fill="${steelL}" stroke="${steelD}" stroke-width="4"/>
    <path d="M60 290 Q80 215 200 205 h130 v85 Z" fill="${c}"/>
    <path d="M150 205 q10 -80 90 -80 h70 q20 0 20 20 v60" stroke="${shade(c, .3)}" stroke-width="22" fill="none" stroke-linecap="round"/>
    <circle cx="250" cy="250" r="22" fill="${shade(c, .35)}"/><circle cx="250" cy="250" r="8" fill="#fff"/>`,
  steamiron: (c) => `
    <ellipse cx="200" cy="320" rx="150" ry="14" fill="#000" opacity=".12"/>
    <path d="M40 300 Q60 200 200 190 h140 v110 Z" fill="#222"/>
    ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${110 + i * 45}" cy="292" r="4" fill="#ddd"/>`).join('')}
    <path d="M60 285 Q80 215 200 205 h130 v80 Z" fill="${c}"/>
    <path d="M150 205 q10 -80 90 -80 h70 q20 0 20 20 v60" stroke="${shade(c, .3)}" stroke-width="22" fill="none" stroke-linecap="round"/>
    <rect x="180" y="215" width="90" height="50" rx="12" fill="#cfe9f5" opacity=".75"/>
    ${[0, 1, 2].map((i) => `<path d="M${80 + i * 40} 180 q-15 -25 0 -50 q15 -25 0 -50" stroke="#b0bec5" stroke-width="6" fill="none" opacity=".7" stroke-linecap="round"/>`).join('')}`,
};

const CATEGORY_BG = {
  'kitchen-dining': ['#fff4e6', '#ffe0c2'],
  'home-decor': ['#fdf0f3', '#f7d6e0'],
  cleaning: ['#e9f7f5', '#cdeee8'],
  bath: ['#eaf4fb', '#cfe6f6'],
  bedroom: ['#f3effb', '#e0d6f5'],
  'storage-organisation': ['#f4f6ea', '#e2e8c8'],
  'small-appliances': ['#eef1f6', '#d7dde9'],
};

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/**
 * view: 'main' | 'alt' | 'closeup'
 */
function productSvg({ shape, color, category, name, brand, view }) {
  const draw = S[shape] || S.basket;
  const [bg1, bg2] = CATEGORY_BG[category] || ['#f5f5f5', '#e5e5e5'];
  const W = 800;
  let body;
  if (view === 'main') {
    body = `
      <rect width="800" height="800" fill="url(#bg)"/>
      <circle cx="650" cy="140" r="120" fill="${color}" opacity=".08"/>
      <circle cx="120" cy="680" r="90" fill="${color}" opacity=".08"/>
      <g transform="translate(160 110) scale(1.2)">${draw(color)}</g>
      <text x="400" y="680" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="34" font-weight="700" fill="#1f2d2b" text-anchor="middle">${esc(name.length > 38 ? name.slice(0, 36) + '…' : name)}</text>
      <text x="400" y="722" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="24" fill="#5b6b68" text-anchor="middle" letter-spacing="3">${esc(brand.toUpperCase())}</text>`;
  } else if (view === 'alt') {
    body = `
      <rect width="800" height="800" fill="${shade(bg2, .05)}"/>
      <rect y="560" width="800" height="240" fill="${shade(bg2, .14)}"/>
      <rect y="556" width="800" height="8" fill="${shade(bg2, .22)}"/>
      <ellipse cx="420" cy="590" rx="260" ry="26" fill="#000" opacity=".12"/>
      <g transform="translate(150 140) rotate(-8 240 240) scale(1.15)">${draw(color)}</g>
      <rect x="40" y="40" width="190" height="44" rx="22" fill="#fff" opacity=".85"/>
      <text x="135" y="70" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" font-weight="600" fill="#1f2d2b" text-anchor="middle">Alternate view</text>`;
  } else {
    body = `
      <rect width="800" height="800" fill="${tint(color, .85)}"/>
      <g transform="translate(-260 -230) scale(2.6)">${draw(color)}</g>
      <rect width="800" height="800" fill="url(#dots)" opacity=".35"/>
      <rect x="40" y="40" width="160" height="44" rx="22" fill="#fff" opacity=".9"/>
      <text x="120" y="70" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" font-weight="600" fill="#1f2d2b" text-anchor="middle">Close-up</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#fff"/></pattern>
  </defs>${body}</svg>`;
}

function bannerSvg({ title, subtitle, color, accent, shapes }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="640" viewBox="0 0 1600 640">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, .35)}"/></linearGradient></defs>
  <rect width="1600" height="640" fill="url(#g)"/>
  <circle cx="1350" cy="120" r="260" fill="${accent}" opacity=".18"/>
  <circle cx="1500" cy="600" r="200" fill="#fff" opacity=".07"/>
  ${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 137) % 1600}" cy="${(i * 211) % 640}" r="${2 + (i % 3)}" fill="#fff" opacity=".25"/>`).join('')}
  ${shapes.map((s, i) => `<g transform="translate(${800 + i * 250} ${120 + (i % 2) * 110}) scale(${i === 1 ? 0.85 : 0.72})"><circle cx="200" cy="200" r="190" fill="#fff" opacity=".92"/>${(S[s] || S.basket)(i % 2 ? accent : tint(color, .1))}</g>`).join('')}
</svg>`;
}

module.exports = { productSvg, bannerSvg, SHAPES: Object.keys(S), tint, shade };
