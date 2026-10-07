'use strict';
/* ============ helpers ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pad = n => String(n).padStart(2, '0');
const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); };
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const todayStr = () => dateStr(new Date());
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

/* ============ clothing vocabulary ============ */
const TYPES = [
  { id: 'top', label: 'Top', plural: 'Tops' },
  { id: 'bottom', label: 'Bottom', plural: 'Bottoms' },
  { id: 'dress', label: 'Dress', plural: 'Dresses' },
  { id: 'jumpsuit', label: 'Jumpsuit', plural: 'Jumpsuits' },
  { id: 'outer', label: 'Jacket / layer', plural: 'Jackets & layers' },
  { id: 'shoes', label: 'Shoes', plural: 'Shoes' },
  { id: 'belt', label: 'Belt', plural: 'Belts' },
  { id: 'bag', label: 'Bag', plural: 'Bags' },
  { id: 'acc', label: 'Accessory', plural: 'Accessories' },
];
const TYPE = Object.fromEntries(TYPES.map(t => [t.id, t]));

// Each style carries sensible defaults; you can change any of them when tagging.
// d = dressiness (1 casual, 2 smart-casual, 3 dressy), w = warmth (1 light, 2 medium, 3 warm)
const STYLES = {
  top: {
    'tee': { d: 1, w: 1, sleeves: 'short', canUnder: true },
    'blouse': { d: 2, w: 1, sleeves: 'long' },
    'button-up shirt': { d: 2, w: 1, sleeves: 'long', canUnder: true },
    'knit / jumper': { d: 2, w: 3, sleeves: 'long' },
    'turtleneck': { d: 2, w: 2, sleeves: 'long', canUnder: true },
    'camisole': { d: 2, w: 1, sleeves: 'sleeveless', canUnder: true },
    'tank / vest': { d: 1, w: 1, sleeves: 'sleeveless', canUnder: true },
    'bodysuit': { d: 2, w: 1, sleeves: 'long', canUnder: true },
    'sheer blouse': { d: 3, w: 1, sleeves: 'long', needsUnder: 'always' },
    'dressy top': { d: 3, w: 1, sleeves: 'short' },
    'sweatshirt / hoodie': { d: 1, w: 3, sleeves: 'long' },
  },
  bottom: {
    'jeans': { d: 1, w: 2, length: 'full' },
    'tailored trousers': { d: 2, w: 2, length: 'full' },
    'wide-leg trousers': { d: 2, w: 1, length: 'full' },
    'linen trousers': { d: 1, w: 1, length: 'full' },
    'skirt': { d: 2, w: 1, length: 'midi' },
    'culottes': { d: 2, w: 1, length: 'midi' },
    'shorts': { d: 1, w: 1, length: 'mini' },
    'leggings / joggers': { d: 1, w: 2, length: 'full' },
  },
  dress: {
    'shift dress': { d: 2, w: 1, sleeves: 'short', length: 'knee' },
    'wrap dress': { d: 2, w: 1, sleeves: 'short', length: 'midi', belt: true },
    'shirt dress': { d: 2, w: 1, sleeves: 'long', length: 'midi', belt: true },
    'fit & flare dress': { d: 3, w: 1, sleeves: 'short', length: 'knee', belt: true },
    'slip dress': { d: 3, w: 1, sleeves: 'sleeveless', length: 'midi', needsUnder: 'sometimes' },
    'pinafore dress': { d: 2, w: 2, sleeves: 'sleeveless', length: 'knee', needsUnder: 'always' },
    'sundress': { d: 1, w: 1, sleeves: 'sleeveless', length: 'midi' },
    'maxi dress': { d: 2, w: 1, sleeves: 'short', length: 'maxi', belt: true },
    'knit dress': { d: 2, w: 3, sleeves: 'long', length: 'midi', belt: true },
    'bodycon dress': { d: 3, w: 1, sleeves: 'short', length: 'knee' },
    'formal dress': { d: 3, w: 1, sleeves: 'short', length: 'midi' },
  },
  jumpsuit: {
    'jumpsuit': { d: 2, w: 1, sleeves: 'short', length: 'full', belt: true },
    'sleeveless jumpsuit': { d: 2, w: 1, sleeves: 'sleeveless', length: 'full', needsUnder: 'sometimes', belt: true },
    'playsuit': { d: 1, w: 1, sleeves: 'short', length: 'mini' },
    'dungarees': { d: 1, w: 2, sleeves: 'sleeveless', length: 'full', needsUnder: 'always' },
  },
  outer: {
    'blazer': { d: 2, w: 2 },
    'cardigan': { d: 2, w: 2, belt: true },
    'light cardigan / shrug': { d: 2, w: 1 },
    'denim jacket': { d: 1, w: 2 },
    'leather jacket': { d: 2, w: 2 },
    'trench coat': { d: 2, w: 2, rainOK: true, belt: true },
    'raincoat': { d: 1, w: 2, rainOK: true },
    'wool coat': { d: 3, w: 3 },
    'puffer': { d: 1, w: 3, rainOK: true },
    'kimono': { d: 1, w: 1 },
    'shacket': { d: 1, w: 2 },
  },
  shoes: {
    'sneakers': { d: 1, rainOK: true },
    'flats': { d: 2, rainOK: true },
    'loafers': { d: 2, rainOK: true },
    'low / block heels': { d: 2, rainOK: true },
    'heels': { d: 3, rainOK: false },
    'sandals': { d: 1, rainOK: false },
    'heeled sandals': { d: 3, rainOK: false },
    'mules': { d: 2, rainOK: false },
    'ankle boots': { d: 2, rainOK: true },
    'knee boots': { d: 2, rainOK: true },
  },
  belt: { 'thin belt': { d: 2 }, 'wide belt': { d: 2 }, 'waist / corset belt': { d: 3 }, 'chain belt': { d: 3 } },
  bag: { 'tote': { d: 2 }, 'shoulder bag': { d: 2 }, 'crossbody': { d: 1 }, 'clutch': { d: 3 }, 'backpack': { d: 1 } },
  acc: { 'scarf': { d: 2 }, 'necklace': { d: 2 }, 'earrings': { d: 2 }, 'hat': { d: 1 }, 'watch': { d: 2 } },
};
const LENGTHS = ['mini', 'knee', 'midi', 'maxi', 'full'];
const LENGTH_LABEL = { mini: 'Mini / short', knee: 'Knee', midi: 'Midi', maxi: 'Maxi', full: 'Full length' };
const SLEEVES = ['sleeveless', 'short', '3/4', 'long'];
const DRESSY = { 1: 'Casual', 2: 'Smart-casual', 3: 'Dressy' };
const WARMTH = { 1: 'Light', 2: 'Medium', 3: 'Warm' };
const PATTERN = { plain: 'Plain', subtle: 'Subtle print', bold: 'Bold print' };
const UNDER = { never: 'No', sometimes: 'For office, church & cool days', always: 'Always' };
const SLOT_LABEL = { top: 'Top', bottom: 'Bottom', dress: 'Dress', jumpsuit: 'Jumpsuit', under: 'Under', layer: 'Wear', shoes: 'Shoes', belt: 'Belt', bag: 'Bag', acc: 'Accessory' };
const hasLength = it => ['dress', 'jumpsuit'].includes(it.type) || (it.type === 'bottom' && ['skirt', 'shorts', 'culottes'].includes(it.style));
const hasSleeves = it => ['top', 'dress', 'jumpsuit'].includes(it.type);

/* ============ True Summer palette ============ */
const PALETTE = [
  // neutrals
  ['Soft White', '#F1EFEA', 1], ['Light Cool Grey', '#C9CDD2', 1], ['Cool Grey', '#9EA4AC', 1], ['Slate Grey', '#6E7A86', 1],
  ['Blue Charcoal', '#4A5260', 1], ['Greyed Navy', '#3C4A66', 1], ['Soft Navy', '#2F3B5A', 1], ['Rose Brown', '#8A6B6B', 1], ['Cool Taupe', '#9C918C', 1], ['Pewter', '#848A90', 1],
  // blues
  ['Powder Blue', '#B3C6DE', 0], ['Sky Blue', '#8EB2D8', 0], ['Periwinkle', '#8D9AD3', 0], ['Cornflower', '#6E8ECC', 0], ['Slate Blue', '#6A7DAF', 0], ['Denim Blue', '#5C7AA3', 0],
  // greens / teals
  ['Soft Aqua', '#94CBCB', 0], ['Mint', '#A9D4C4', 0], ['Sage Teal', '#8FAAA2', 0], ['Soft Teal', '#5F9C9E', 0], ['Jade', '#4C9A89', 0], ['Spruce', '#4A7676', 0],
  // pinks / reds
  ['Pale Pink', '#E8C6CC', 0], ['Dusty Rose', '#C99DA4', 0], ['Rose Pink', '#D4899A', 0], ['Watermelon', '#DE6C7B', 0], ['Strawberry', '#C8434F', 0],
  ['Raspberry', '#B3415D', 0], ['Soft Fuchsia', '#C25C96', 0], ['Cranberry', '#8E2F47', 0], ['Cool Burgundy', '#76304A', 0],
  // purples
  ['Lavender', '#B8A8D2', 0], ['Lilac', '#C7A9C8', 0], ['Mauve', '#A27B99', 0], ['Orchid', '#AA7BAE', 0], ['Soft Violet', '#8970AE', 0], ['Plum', '#6C4A6C', 0],
  // yellow
  ['Light Lemon', '#EDE7A8', 0],
].map(([name, hex, neutral]) => ({ name, hex, neutral: !!neutral }));

// common colours outside the palette, used for naming and the colour picker
const OTHER_COLOURS = [['Black', '#1C1C1E'], ['Bright White', '#FFFFFF'], ['Beige', '#D9C7A7'], ['Camel', '#C19A6B'], ['Chocolate', '#5A3A29'], ['Mustard', '#D4A017'], ['Orange', '#E8772E'], ['Rust', '#B7472A'], ['Coral', '#F27C6A'], ['Red', '#D21F2C'], ['Hot Pink', '#F0388F'], ['Olive', '#6B6B2F'], ['Kelly Green', '#2E9E4B'], ['Cobalt', '#1F4FBF'], ['Teal', '#00807F'], ['Khaki', '#B5A46A']];
/* ============ colour maths ============ */
function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase(); }
function rgbToLab([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = f(r), G = f(g), B = f(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const g3 = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  x = g3(x); y = g3(y); z = g3(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const labOf = hex => rgbToLab(hexToRgb(hex));
const chroma = lab => Math.hypot(lab[1], lab[2]);
const hueOf = lab => (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360;
function dE2000(l1, l2) {
  const [L1, a1, b1] = l1, [L2, a2, b2] = l2, rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h1p = (Math.atan2(b1, a1p) / rad + 360) % 360, h2p = (Math.atan2(b2, a2p) / rad + 360) % 360;
  const dL = L2 - L1, dC = C2p - C1p;
  let dh = h2p - h1p; if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh * rad / 2);
  const Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = h1p + h2p; if (C1p * C2p !== 0) { if (Math.abs(h1p - h2p) > 180) hb += (hb < 360 ? 360 : -360); hb /= 2; }
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const SL = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * T;
  const RT = -2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
PALETTE.forEach(p => p.lab = labOf(p.hex));

// How well a colour suits True Summer
function paletteMatch(hex, style) {
  const lab = labOf(hex), C = chroma(lab);
  let best = null, bestD = 1e9;
  for (const p of PALETTE) { const d = dE2000(lab, p.lab); if (d < bestD) { bestD = d; best = p; } }
  let status = bestD <= 8 ? 'in' : bestD <= 15 ? 'close' : 'out', note = '';
  const neutral = C < 10 || (best.neutral && bestD <= 15) || style === 'jeans' || (lab[0] < 30 && C < 25);
  if (lab[0] < 20 && C < 12) { status = 'out'; note = 'Black is harsh by your face: great for bottoms, shoes and bags.'; }
  else if (lab[0] > 94 && C < 6) { status = 'close'; note = 'Bright white is a touch stark; soft white is kinder.'; }
  else if (status === 'out') {
    const h = hueOf(lab);
    if (C > 20 && h > 40 && h < 100) note = 'Warm golden / orange tones fight cool True Summer colouring. Keep it away from your face.';
    else note = 'Outside the True Summer palette. Keep it away from your face or add a palette colour near it.';
  }
  let label = best.name;
  if (status === 'out') { let bd = 1e9; for (const [n, hx] of [...OTHER_COLOURS, ...PALETTE.map(p => [p.name, p.hex])]) { const dd = dE2000(lab, labOf(hx)); if (dd < bd) { bd = dd; label = n; } } }
  if (status === 'out' && !note.includes(best.name) && C >= 10) note += ` Closest palette shade: ${best.name}.`;
  return { name: best.name, label, hex: best.hex, dE: Math.round(bestD), status, neutral, note, lab, L: lab[0], C, h: hueOf(lab) };
}
const STATUS_LABEL = { in: 'True Summer', close: 'Close to palette', out: 'Outside palette' };
const STATUS_CLASS = { in: 'ok', close: 'warn', out: 'bad' };

/* ============ colour detection from a photo ============ */
function detectColour(canvas) {
  const W = 60, H = Math.round(canvas.height / canvas.width * 60) || 60;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(canvas, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  const px = [], border = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = (j * W + i) * 4; if (d[k + 3] < 128) continue;
    const rgb = [d[k], d[k + 1], d[k + 2]];
    const edge = i < 3 || j < 3 || i >= W - 3 || j >= H - 3;
    if (edge) border.push(rgb);
    const dx = (i / W - 0.5), dy = (j / H - 0.5), wgt = Math.max(0.05, 1 - Math.hypot(dx, dy) * 1.7);
    px.push({ rgb, lab: rgbToLab(rgb), w: wgt });
  }
  // k-means (k=5) in Lab
  const K = 5; let cents = [];
  for (let i = 0; i < K; i++) cents.push(px[Math.floor((i + 0.5) / K * px.length)].lab.slice());
  let assign = new Array(px.length).fill(0);
  for (let it = 0; it < 10; it++) {
    px.forEach((p, n) => { let bi = 0, bd = 1e9; cents.forEach((c, ci) => { const dd = (p.lab[0] - c[0]) ** 2 + (p.lab[1] - c[1]) ** 2 + (p.lab[2] - c[2]) ** 2; if (dd < bd) { bd = dd; bi = ci; } }); assign[n] = bi; });
    const sums = cents.map(() => [0, 0, 0, 0]);
    px.forEach((p, n) => { const s = sums[assign[n]]; s[0] += p.lab[0] * p.w; s[1] += p.lab[1] * p.w; s[2] += p.lab[2] * p.w; s[3] += p.w; });
    cents = cents.map((c, i) => sums[i][3] ? [sums[i][0] / sums[i][3], sums[i][1] / sums[i][3], sums[i][2] / sums[i][3]] : c);
  }
  // background = the cluster that dominates the border
  const bcount = new Array(K).fill(0);
  border.forEach(rgb => { const l = rgbToLab(rgb); let bi = 0, bd = 1e9; cents.forEach((c, ci) => { const dd = (l[0] - c[0]) ** 2 + (l[1] - c[1]) ** 2 + (l[2] - c[2]) ** 2; if (dd < bd) { bd = dd; bi = ci; } }); bcount[bi]++; });
  const bgIdx = bcount.indexOf(Math.max(...bcount));
  const bgShare = bcount[bgIdx] / Math.max(1, border.length);
  const wsum = new Array(K).fill(0); px.forEach((p, n) => wsum[assign[n]] += p.w);
  let bestI = -1, bestW = -1;
  wsum.forEach((w, i) => { if (bgShare > 0.45 && i === bgIdx) return; if (w > bestW) { bestW = w; bestI = i; } });
  if (bestI < 0) bestI = wsum.indexOf(Math.max(...wsum));
  // average the original rgb of that cluster for a faithful hex
  let r = 0, g = 0, b = 0, n = 0;
  px.forEach((p, i) => { if (assign[i] === bestI) { r += p.rgb[0] * p.w; g += p.rgb[1] * p.w; b += p.rgb[2] * p.w; n += p.w; } });
  return rgbToHex(r / n, g / n, b / n);
}

/* ============ storage (IndexedDB, on this device only) ============ */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('true-summer-wardrobe', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('items', { keyPath: 'id' }); d.createObjectStore('kv'); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  _tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode), s = t.objectStore(store); let out;
      const r = fn(s); if (r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  allItems() { return this._tx('items', 'readonly', s => s.getAll()); },
  putItem(it) { return this._tx('items', 'readwrite', s => s.put(it)); },
  delItem(id) { return this._tx('items', 'readwrite', s => s.delete(id)); },
  clearItems() { return this._tx('items', 'readwrite', s => s.clear()); },
  get(k) { return this._tx('kv', 'readonly', s => s.get(k)); },
  set(k, v) { return this._tx('kv', 'readwrite', s => s.put(v, k)); },
};

/* ============ app state ============ */
const DEFAULT_SETTINGS = {
  location: null,            // home / free days {name, lat, lon}
  officeLocation: null,      // office days (null = same as home)
  churchLocation: null,      // church days (null = same as home)
  officeDays: [1, 2, 3, 4, 5],
  churchDay: 0,
  coverOffice: false,        // sleeveless needs cover at the office
  coverChurch: true,         // sleeveless needs cover at church
  miniChurch: false,         // allow mini lengths on Sunday
  repeatDays: 4,             // avoid re-wearing main pieces within this many days
};
const S = {
  items: [], urls: new Map(), settings: { ...DEFAULT_SETTINGS },
  saved: [], worn: [], dayType: {}, wxOverride: {}, weather: null,
  tab: 'today', date: todayStr(), seeds: {}, lock: null, filter: 'all', cache: new Map(),
};
const itemById = id => S.items.find(i => i.id === id);
function photoURL(it) {
  if (!it) return '';
  if (S.urls.has(it.id)) return S.urls.get(it.id);
  let u = '';
  if (it.photo instanceof Blob) u = URL.createObjectURL(it.photo);
  else u = silhouetteURL(it);
  S.urls.set(it.id, u); return u;
}
function dropURL(id) { const u = S.urls.get(id); if (u && u.startsWith('blob:')) URL.revokeObjectURL(u); S.urls.delete(id); }
function invalidate() { S.cache.clear(); S.wornIdx = null; }
async function saveKV(k) { await DB.set(k, S[k]); }

/* ============ simple drawn silhouettes (used for items without a photo + demo) ============ */
function silhouetteURL(it) {
  const c = document.createElement('canvas'); c.width = c.height = 240; const x = c.getContext('2d');
  x.fillStyle = '#ECE8EB'; x.fillRect(0, 0, 240, 240);
  const col = it.colour || '#999'; x.fillStyle = col; x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2;
  const P = pts => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); x.stroke(); };
  const s = it.style || '';
  const long = it.sleeves === 'long' || it.sleeves === '3/4', sl = it.sleeves === 'sleeveless';
  const L = { mini: 150, knee: 180, midi: 200, maxi: 225, full: 225 }[it.length] || 190;
  if (it.type === 'top' || it.type === 'outer') {
    const bot = it.type === 'outer' ? 200 : 175;
    if (sl) P([[85, 50], [105, 45], [120, 60], [135, 45], [155, 50], [160, bot], [80, bot]]);
    else { const sx = long ? 165 : 110; P([[80, 50], [105, 40], [120, 55], [135, 40], [160, 50], [200, sx], [180, sx + 8], [160, 95], [160, bot], [80, bot], [80, 95], [60, sx + 8], [40, sx]]); }
    if (it.type === 'outer') { x.strokeStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.moveTo(120, 55); x.lineTo(120, 200); x.stroke(); }
  } else if (it.type === 'bottom') {
    if (/skirt|culottes/.test(s)) P([[90, 40], [150, 40], [175, L], [65, L]]);
    else if (/shorts/.test(s)) P([[85, 40], [155, 40], [165, 120], [125, 120], [120, 80], [115, 120], [75, 120]]);
    else P([[85, 30], [155, 30], [165, 220], [130, 220], [120, 90], [110, 220], [75, 220]]);
  } else if (it.type === 'dress') {
    const sx = sl ? 0 : (long ? 150 : 95);
    if (sx) { P([[95, 45], [70, 55], [50, sx], [65, sx + 6], [95, 90]]); P([[145, 45], [170, 55], [190, sx], [175, sx + 6], [145, 90]]); }
    P([[95, 30], [110, 40], [130, 40], [145, 30], [148, 105], [180, L], [60, L], [92, 105]]);
  } else if (it.type === 'jumpsuit') {
    if (!sl) { P([[95, 45], [70, 55], [55, 105], [70, 110], [95, 85]]); P([[145, 45], [170, 55], [185, 105], [170, 110], [145, 85]]); }
    const Lb = it.length === 'mini' ? 160 : 225;
    P([[95, 30], [145, 30], [148, 120], [162, Lb], [126, Lb], [120, 145], [114, Lb], [78, Lb], [92, 120]]);
  } else if (it.type === 'shoes') {
    x.beginPath(); x.ellipse(120, 150, 75, 30, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    if (/boots/.test(s)) { x.fillRect(150, s.includes('knee') ? 40 : 90, 40, s.includes('knee') ? 110 : 60); }
    if (/heel/.test(s)) { x.fillRect(170, 150, 12, 45); }
  } else if (it.type === 'belt') {
    x.fillRect(20, 105, 200, 30); x.strokeRect(20, 105, 200, 30); x.strokeStyle = '#bbb'; x.lineWidth = 6; x.strokeRect(100, 98, 40, 44);
  } else if (it.type === 'bag') {
    x.lineWidth = 8; x.strokeStyle = col; x.beginPath(); x.arc(120, 100, 40, Math.PI, 0); x.stroke(); x.lineWidth = 2; x.strokeStyle = 'rgba(0,0,0,.18)';
    x.fillRect(60, 100, 120, 90); x.strokeRect(60, 100, 120, 90);
  } else {
    if (s === 'scarf') { P([[60, 60], [180, 60], [170, 90], [140, 95], [150, 200], [120, 200], [115, 100], [70, 90]]); }
    else { x.lineWidth = 6; x.strokeStyle = col; x.beginPath(); x.arc(120, 100, 55, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke(); x.beginPath(); x.arc(120, 160, 12, 0, Math.PI * 2); x.fill(); }
  }
  return c.toDataURL('image/png');
}

/* ============ item defaults ============ */
function newItem(type = 'top') { const it = { id: uid(), type, created: Date.now(), colour: '#9EA4AC', pattern: 'plain', occ: ['office', 'church', 'weekend'], inWash: false, photo: null }; applyStyle(it, Object.keys(STYLES[type])[0]); return it; }
function applyStyle(it, style) {
  const st = STYLES[it.type][style] || {};
  it.style = style;
  it.dressy = st.d || 2; it.warmth = st.w || 2;
  it.sleeves = hasSleeves(it) ? (st.sleeves || 'short') : null;
  it.length = hasLength(it) ? (st.length || 'knee') : (it.type === 'bottom' || it.type === 'jumpsuit' ? 'full' : null);
  it.canUnder = !!st.canUnder;
  it.needsUnder = st.needsUnder || 'never';
  it.belt = !!st.belt;
  it.rainOK = st.rainOK ?? (it.type === 'outer' ? false : it.type === 'shoes' ? true : false);
  if (!it._occTouched) it.occ = defaultOcc(it);
}
function defaultOcc(it) {
  const o = ['weekend'];
  const short = it.length === 'mini' || it.style === 'shorts';
  if (it.dressy <= 2 && !short && it.style !== 'sweatshirt / hoodie') o.unshift('office');
  if (it.dressy >= 2 && !short) o.splice(o.indexOf('weekend'), 0, 'church');
  if (['belt', 'bag', 'acc'].includes(it.type)) return ['office', 'church', 'weekend'];
  return o;
}
function itemName(it) { return it.name?.trim() || `${it.pm?.label || ''} ${it.style}`.trim(); }
function prepItem(it) { it.pm = paletteMatch(it.colour, it.style); return it; }
