'use strict';
/* ============ weather (Open-Meteo: free, no key) ============ */
const WX_ICON = c => c == null ? '·' : c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌦️' : '⛈️';
const WX_TEXT = c => c == null ? '' : c === 0 ? 'Clear' : c <= 2 ? 'Partly cloudy' : c === 3 ? 'Overcast' : c <= 48 ? 'Fog' : c <= 57 ? 'Drizzle' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : 'Thunderstorms';
const BANDS = ['hot', 'warm', 'mild', 'cool', 'cold'];
const BAND_LABEL = { hot: 'Hot', warm: 'Warm', mild: 'Mild', cool: 'Cool', cold: 'Cold' };
const BAND_T = { hot: 1, warm: 1.4, mild: 2, cool: 2.6, cold: 3.1 };
const bandOf = t => t >= 29 ? 'hot' : t >= 23 ? 'warm' : t >= 17 ? 'mild' : t >= 11 ? 'cool' : 'cold';

// Each kind of day can have its own place: home (free days), office, church.
const LOC_FIELD = { free: 'location', office: 'officeLocation', church: 'churchLocation' };
const locKey = loc => `${loc.lat},${loc.lon}`;
function locFor(type) { const st = S.settings; return (type === 'office' && st.officeLocation) || (type === 'church' && st.churchLocation) || st.location || null; }
function allLocations() { const m = new Map(); for (const k of ['location', 'officeLocation', 'churchLocation']) { const l = S.settings[k]; if (l) m.set(locKey(l), l); } return [...m.values()]; }
async function fetchOne(loc, force) {
  const key = locKey(loc), have = S.weather.byKey[key];
  if (!force && have && Date.now() - have.fetched < 3 * 3600e3) return;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=8`;
  const r = await fetch(url); if (!r.ok) throw new Error('Weather service unavailable');
  const j = await r.json(), D = j.daily, days = {};
  D.time.forEach((t, i) => {
    const prob = D.precipitation_probability_max?.[i], mm = D.precipitation_sum?.[i] ?? 0;
    days[t] = {
      code: D.weather_code[i], max: D.temperature_2m_max[i], min: D.temperature_2m_min[i],
      amax: D.apparent_temperature_max[i] ?? D.temperature_2m_max[i], amin: D.apparent_temperature_min[i] ?? D.temperature_2m_min[i],
      rain: prob ?? (mm > 1 ? 60 : 0), mm, wind: D.wind_speed_10m_max?.[i] ?? 0,
    };
  });
  S.weather.byKey[key] = { fetched: Date.now(), days };
}
async function fetchWeather(force) {
  if (!S.weather || !S.weather.byKey) S.weather = { byKey: S.weather?.key ? { [S.weather.key]: { fetched: S.weather.fetched, days: S.weather.days } } : {} };
  const locs = allLocations(); if (!locs.length) return null;
  await Promise.all(locs.map(l => fetchOne(l, force)));
  await saveKV('weather'); invalidate();
  return S.weather;
}
function weatherAge() { const f = allLocations().map(l => S.weather?.byKey?.[locKey(l)]?.fetched).filter(Boolean); return f.length ? Math.round((Date.now() - Math.min(...f)) / 60000) : null; }
// Searches the free Open-Meteo place list. South African places are listed first,
// and "Hillcrest, Pretoria" style searches use the part after the comma to narrow it down.
async function searchPlaces(q) {
  const [name, ...rest] = q.split(',').map(x => x.trim());
  const ALIAS = { pretoria: 'tshwane', durban: 'ethekwini', joburg: 'johannesburg', jhb: 'johannesburg', pta: 'tshwane', kzn: 'kwazulu', 'port elizabeth': 'nelson mandela', gqeberha: 'nelson mandela' };
  let hint = rest.join(' ').toLowerCase(); for (const [k, v] of Object.entries(ALIAS)) if (hint.includes(k)) hint += ' ' + v;
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=100&language=en&format=json`);
  const j = await r.json();
  let res = (j.results || []).map(p => ({
    name: [p.name, p.admin2 && p.admin2 !== p.name ? p.admin2.replace(/ (Metropolitan|Local|District) Municipality$/, '') : null, p.admin1, p.country_code].filter(Boolean).join(', '),
    lat: +p.latitude.toFixed(3), lon: +p.longitude.toFixed(3), za: p.country_code === 'ZA', pop: p.population || 0,
    hay: [p.admin1, p.admin2, p.admin3, p.country].filter(Boolean).join(' ').toLowerCase(),
  }));
  if (hint) { const narrowed = res.filter(p => p.hay.includes(hint) || hint.split(' ').some(w => w.length > 2 && p.hay.includes(w))); if (narrowed.length) res = narrowed; }
  res.sort((a, b) => (b.za - a.za) || (b.pop - a.pop));
  return res.slice(0, 10).map(({ name, lat, lon }) => ({ name, lat, lon }));
}
function dayWeather(date) {
  const loc = locFor(dayType(date)), ov = S.wxOverride[date], f = loc ? S.weather?.byKey?.[locKey(loc)]?.days?.[date] : null;
  let wx;
  if (ov) {
    const t = { hot: 31, warm: 25, mild: 19, cool: 13, cold: 7 }[ov.band];
    wx = { band: ov.band, amax: t, amin: t - 9, max: t, min: t - 9, rain: ov.rain ? 70 : 0, code: ov.rain ? 61 : 1, source: 'manual' };
  } else if (f) wx = { ...f, band: bandOf(f.amax), source: 'forecast' };
  else wx = { band: 'mild', amax: null, amin: null, rain: 0, code: null, source: 'none' };
  wx.wet = wx.rain >= 40;
  wx.chill = wx.amin != null && (wx.amin <= 13 || (wx.amax - wx.amin >= 11 && wx.amin < 17));
  wx.windy = (wx.wind || 0) >= 35;
  wx.place = loc?.name || '';
  return wx;
}

/* ============ day rules ============ */
function dayType(date) {
  if (S.dayType[date]) return S.dayType[date];
  const dow = parseDate(date).getDay();
  if (dow === +S.settings.churchDay) return 'church';
  if (S.settings.officeDays.includes(dow)) return 'office';
  return 'free';
}
const DAYTYPE_LABEL = { office: 'Office day', church: 'Church', free: 'Free day' };
const MOODS = {
  office: [{ label: 'Polished', target: 2.2, layer: 0.6 }, { label: 'Easy', target: 1.8 }, { label: 'A little colour', target: 2, colour: 1.6 }],
  church: [{ label: 'Elegant', target: 3 }, { label: 'Soft & pretty', target: 2.7, colour: 1.6 }, { label: 'Simple', target: 2.4 }],
  free: [{ label: 'Relaxed', target: 1 }, { label: 'Out & about', target: 2 }, { label: 'Dressed up', target: 3 }],
};
const MAIN = ['top', 'bottom', 'dress', 'jumpsuit'];
const SLOTS = ['under', 'top', 'bottom', 'dress', 'jumpsuit', 'layer', 'shoes', 'belt', 'bag', 'acc'];
const SLOT_TYPE = { top: 'top', bottom: 'bottom', dress: 'dress', jumpsuit: 'jumpsuit', under: 'top', layer: 'outer', shoes: 'shoes', belt: 'belt', bag: 'bag', acc: 'acc' };
const mainPieces = o => [o.dress, o.jumpsuit, o.top, o.bottom].filter(Boolean);
const filled = o => SLOTS.filter(k => o[k]).map(k => [k, o[k]]);
const isShort = it => it.length === 'mini' || it.style === 'shorts';

function occOK(it, type) { if (type === 'free') return true; return !it.occ?.length || it.occ.includes(type); }
function mainOK(it, ctx) {
  if (it.inWash || !occOK(it, ctx.type)) return false;
  const b = ctx.wx.band;
  if (ctx.type === 'office' && isShort(it)) return false;
  if (ctx.type === 'church' && (it.style === 'shorts' || (isShort(it) && !S.settings.miniChurch))) return false;
  if (it.style === 'shorts' && ['mild', 'cool', 'cold'].includes(b)) return false;
  if (b === 'hot' && it.warmth === 3) return false;
  return true;
}
function buildPool(ctx) {
  const I = S.items, b = ctx.wx.band;
  const ok = (it, t) => it.type === t && !it.inWash && occOK(it, ctx.type);
  return {
    tops: I.filter(i => i.type === 'top' && mainOK(i, ctx)),
    bottoms: I.filter(i => i.type === 'bottom' && mainOK(i, ctx)),
    dresses: I.filter(i => i.type === 'dress' && mainOK(i, ctx)),
    jumpsuits: I.filter(i => i.type === 'jumpsuit' && mainOK(i, ctx)),
    under: I.filter(i => i.type === 'top' && i.canUnder && !i.inWash),
    layer: I.filter(i => ok(i, 'outer') && !(b === 'hot' && i.warmth === 3)),
    take: I.filter(i => i.type === 'outer' && !i.inWash),
    shoes: I.filter(i => ok(i, 'shoes')),
    belt: I.filter(i => ok(i, 'belt')),
    bag: I.filter(i => ok(i, 'bag')),
    acc: I.filter(i => ok(i, 'acc')),
  };
}
function buildCtx(date, extra = {}) {
  const ctx = { date, type: dayType(date), wx: dayWeather(date), seed: String(S.seeds[date] || 0), avoid: extra.avoid || null };
  ctx.pool = buildPool(ctx);
  ctx.mood = MOODS[ctx.type][0];
  return ctx;
}
function daysSince(id, date) {
  if (!S.wornIdx) { S.wornIdx = new Map(); for (const w of S.worn) for (const v of Object.values(w.slots)) { if (!S.wornIdx.has(v)) S.wornIdx.set(v, []); S.wornIdx.get(v).push(w.date); } }
  let last = null;
  for (const d of S.wornIdx.get(id) || []) if (d < date && (last == null || d > last)) last = d;
  return last == null ? null : daysBetween(last, date);
}

/* ============ scoring ============ */
function faceItems(o) {
  const a = [];
  const base = o.dress || o.jumpsuit || o.top;
  if (base) a.push([base, 1]);
  if (o.layer) a.push([o.layer, 0.6]);
  if (o.under && (o.under.style === 'turtleneck' || ['pinafore dress', 'dungarees', 'sleeveless jumpsuit'].includes(base?.style))) a.push([o.under, 0.7]);
  // an accessory near the face only matters when the main piece isn't already a palette colour
  if (o.acc && ['scarf', 'necklace'].includes(o.acc.style) && base && base.pm.status !== 'in') a.push([o.acc, 0.8]);
  return a;
}
function colourScore(o, ctx) {
  let s = 0;
  const face = faceItems(o);
  for (const [p, wt] of face) { const st = p.pm.status; s += st === 'in' ? 1.5 * wt : st === 'close' ? 0.6 * wt : -2.2 * wt; }
  for (const p of [o.bottom, o.shoes, o.bag, o.belt].filter(Boolean)) if (p.pm.status === 'out' && !p.pm.neutral) s -= 0.4;
  const vis = [o.layer, o.top, o.dress, o.jumpsuit, o.bottom, o.under, o.acc?.style === 'scarf' ? o.acc : null].filter(Boolean);
  const chrom = [];
  for (const p of vis) for (const m of [p.pm, p.pm2]) { if (!m || m.neutral) continue; if (!chrom.some(c => dE2000(c, m.lab) < 12)) chrom.push(m.lab); }
  // a print that contains a palette colour softens an off-palette main colour near the face
  const base = o.dress || o.jumpsuit || o.top;
  if (base && base.pm.status === 'out' && base.pm2?.status === 'in' && base.pattern !== 'plain') s += 0.8;
  s += echoes(o).length * 1.0;
  if (chrom.length > 2) s -= (chrom.length - 2) * 2.5;
  for (let i = 0; i < chrom.length; i++) for (let j = i + 1; j < chrom.length; j++) {
    let dh = Math.abs(hueOf(chrom[i]) - hueOf(chrom[j])); if (dh > 180) dh = 360 - dh;
    const vivid = chroma(chrom[i]) > 22 && chroma(chrom[j]) > 22;
    if (dh < 25) s += 0.8; else if (dh < 60) s += 0.3; else if (dh < 150 && vivid) s -= 1.0; else if (vivid) s -= 0.2;
  }
  if (o.top && o.bottom) { const dL = Math.abs(o.top.pm.L - o.bottom.pm.L); if (dL > 55) s -= 1.4; else if (dL < 35) s += 0.3; }
  if (ctx.mood.colour && face.some(([p, wt]) => !p.pm.neutral && p.pm.status !== 'out' && wt >= 0.7)) s += ctx.mood.colour;
  return s;
}
// a second colour in one piece repeated as the main colour of another piece ties the outfit together
function echoes(o) {
  const items = filled(o).map(([, p]) => p), out = [];
  for (const p of items) {
    if (!p.pm2) continue;
    const q = items.find(x => x !== p && dE2000(x.pm.lab, p.pm2.lab) < 12);
    if (q) out.push([p, q]);
  }
  return out;
}
function fitScore(o) {
  let s = 0; const base = o.dress || o.jumpsuit || o.top;
  if (o.top && o.bottom && o.top.fit && o.bottom.fit) {
    if (isLoose(o.top.fit) && isLoose(o.bottom.fit)) s -= (o.top.fit === 'oversized' || o.bottom.fit === 'oversized') ? 3 : 1.8;
    else if (isLoose(o.top.fit) !== isLoose(o.bottom.fit)) s += 0.6;
  }
  if (o.layer?.fit === 'oversized' && base && (base.fit === 'oversized' || (isLoose(base.fit) && (!o.bottom || isLoose(o.bottom.fit))))) s -= 1.2;
  if (o.belt && base && isLoose(base.fit)) s += 0.5;
  return s;
}
function fabricScore(o, ctx) {
  let s = 0;
  const cl = [o.under, o.top, o.bottom, o.dress, o.jumpsuit, o.layer].filter(p => p && p.fabric);
  const has = (...fs) => cl.some(p => fs.includes(p.fabric));
  const stmt = cl.filter(p => STATEMENT_FABRIC.includes(p.fabric)).length;
  if (stmt > 1) s -= 1.5 * (stmt - 1);
  if (has('sequin / sparkle') && ctx.type === 'office') s -= 2.5;
  const den = cl.filter(p => p.fabric === 'denim');
  if (den.length > 1) s -= dE2000(den[0].pm.lab, den[1].pm.lab) < 10 ? 1.2 : 0.2;
  // texture contrasts count only what's clearly visible (not an under-layer)
  const vis = [o.top, o.bottom, o.dress, o.jumpsuit, o.layer].filter(p => p && p.fabric), vhas = (...fs) => vis.some(p => fs.includes(p.fabric));
  if (vhas('knit', 'wool') && vhas('silk / satin', 'chiffon / sheer')) s += 0.4;
  if (vhas('denim') && vhas('silk / satin', 'lace', 'chiffon / sheer')) s += 0.4;
  if (o.layer?.fabric === 'leather / faux leather' && (o.dress || has('silk / satin', 'chiffon / sheer'))) s += 0.5;
  if (has('corduroy') && has('silk / satin', 'sequin / sparkle')) s -= 0.8;
  if (has('linen') && has('velvet', 'sequin / sparkle')) s -= 1;
  if (ctx.mood.target <= 1.2 && has('sequin / sparkle', 'velvet')) s -= 0.8;
  if (o.shoes?.fabric === 'suede' && ctx.wx.wet) s -= 1.5;
  return s;
}
function blockedHit(o) {
  if (!S.blocked.length) return null;
  const ids = new Set(filled(o).map(([, p]) => p.id));
  return S.blocked.find(b => b.ids.every(id => ids.has(id))) || null;
}
function scoreOutfit(o, ctx) {
  const { mood, wx } = ctx; let s = 0;
  const mains = mainPieces(o);
  for (const p of mains) s -= Math.abs(p.dressy - mood.target) * 1.6;
  if (o.layer) s -= Math.abs(o.layer.dressy - mood.target) * 0.7;
  if (o.shoes) s -= Math.abs(o.shoes.dressy - mood.target) * 1.1;
  if (o.bag) s -= Math.abs(o.bag.dressy - mood.target) * 0.4;
  if (o.belt) s -= Math.abs(o.belt.dressy - mood.target) * 0.3;
  // warmth vs weather
  const w = avg(mains.map(p => p.warmth)) + (o.layer ? 0.4 * o.layer.warmth : 0) + (o.under && o.under.sleeves !== 'sleeveless' ? 0.3 : 0);
  s -= Math.abs(w - BAND_T[wx.band]) * 2.2;
  const hotish = wx.band === 'hot' || wx.band === 'warm', coldish = wx.band === 'cool' || wx.band === 'cold';
  for (const p of mains) {
    if (wx.band === 'hot' && p.sleeves === 'long') s -= 0.8;
    if (coldish && p.length === 'mini') s -= 1.2;
    if (p.type === 'top' && p.canUnder && p.sleeves === 'sleeveless' && ctx.type !== 'free') s -= 0.6;
  }
  if (o.under && hotish) s -= o.under.sleeves === 'long' ? 1.5 : 0.5;
  s += colourScore(o, ctx);
  // patterns: one statement at a time
  const pats = [o.layer, o.top, o.bottom, o.dress, o.jumpsuit, o.under, o.acc].filter(Boolean).map(p => p.pattern);
  const bold = pats.filter(p => p === 'bold').length, subtle = pats.filter(p => p === 'subtle').length;
  if (bold > 1) s -= 4 * (bold - 1); if (bold && subtle) s -= 1.5 * subtle; if (subtle > 1) s -= 0.8 * (subtle - 1);
  // shoes
  if (o.shoes) {
    const st = o.shoes.style;
    if (wx.wet && !o.shoes.rainOK) s -= 2.2;
    if (/sandals/.test(st) && coldish) s -= 2.5;
    if (/sandals|mules/.test(st) && wx.band === 'mild') s -= 0.6;
    if (/boots/.test(st)) s += wx.band === 'hot' ? -2.5 : wx.band === 'warm' ? -1 : coldish ? 0.6 : 0;
    if (o.shoes.pm.neutral) s += 0.4;
  }
  if (o.layer) { if (wx.wet && o.layer.rainOK) s += 0.5; if (ctx.type === 'office' && o.layer.style === 'blazer') s += 0.5; if (mood.layer) s += mood.layer; }
  if (o.belt) { if (o.shoes && dE2000(o.belt.pm.lab, o.shoes.pm.lab) < 15) s += 0.7; if (!o.belt.pm.neutral && o.belt.pm.status === 'out') s -= 0.6; }
  if (o.bag && o.bag.pm.neutral) s += 0.3;
  if (o.acc) {
    const st = o.acc.style;
    if (st === 'scarf') s += coldish ? 0.6 : wx.band === 'hot' ? -2.5 : wx.band === 'warm' ? -1 : -0.3;
    if (st === 'hat') s += (hotish && ctx.type === 'free') ? 0.5 : -0.8;
    if (st === 'necklace' || st === 'earrings') s += mood.target >= 2.5 ? 0.6 : 0;
  }
  s += fitScore(o) + fabricScore(o, ctx);
  if (blockedHit(o)) s -= 60;
  // recency, week variety and a little randomness (Shuffle changes the seed)
  const rd = +S.settings.repeatDays || 0;
  for (const [slot, p] of filled(o)) {
    const main = MAIN.includes(slot);
    const d = daysSince(p.id, ctx.date);
    if (d != null && d < rd) s -= (rd - d) / rd * (main ? 3.5 : 1);
    if (ctx.avoid?.has(p.id)) s -= main ? 2.5 : 0.4;
    s += hash(p.id + ctx.seed + ctx.date) * (main ? 1.4 : 0.6);
  }
  return s;
}
const best = (cands, f) => { let b = null, bs = -1e9; for (const c of cands) { const v = f(c); if (v > bs) { bs = v; b = c; } } return b; };

function rankTake(o, ctx) {
  const { wx } = ctx; const tgt = wx.amin == null ? 2 : wx.amin < 8 ? 3 : wx.amin < 14 ? 2 : 1;
  return ctx.pool.take.filter(p => p !== o.layer).map(p => {
    let s = -Math.abs(p.warmth - tgt) * 1.5;
    if (wx.wet) s += p.rainOK ? 2.5 : -1;
    s -= Math.abs(p.dressy - ctx.mood.target) * 0.6;
    if (p.pm.neutral || p.pm.status !== 'out') s += 0.4;
    s += hash(p.id + ctx.seed) * 0.3;
    return [p, s];
  }).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}

/* turn a base (dress / jumpsuit / top+bottom) into a full outfit */
function complete(base, ctx, force) {
  const o = { ...base, why: {}, flags: {} };
  const P = ctx.pool, band = ctx.wx.band, coldish = band === 'cool' || band === 'cold';
  const mains = mainPieces(o);
  const sc = x => scoreOutfit(x, ctx);
  const F = force?.slot;
  // 1. under-layer
  const needU = mains.find(p => p.needsUnder === 'always' || (p.needsUnder === 'sometimes' && (ctx.type !== 'free' || coldish)));
  if (needU) {
    const cands = P.under.filter(u => !mains.includes(u) && (o.top ? u.sleeves === 'sleeveless' : true));
    o.under = best(cands, u => sc({ ...o, under: u }));
    if (o.under) o.why.under = needU; else o.flags.noUnder = needU;
  }
  // 2. layer to wear
  const sleeveless = mains.some(p => p.sleeves === 'sleeveless') && !(o.under && o.under.sleeves !== 'sleeveless');
  const cover = sleeveless && ((ctx.type === 'office' && S.settings.coverOffice) || (ctx.type === 'church' && S.settings.coverChurch));
  if (F === 'layer') { o.layer = force.item; o.why.layer = 'chosen'; }
  else if (coldish || cover) {
    const cands = cover && !coldish ? P.layer.filter(l => l.warmth <= 2) : P.layer;
    o.layer = best(cands, l => sc({ ...o, layer: l }));
    if (o.layer) o.why.layer = coldish ? 'cold' : 'cover'; else o.flags.noLayer = coldish ? 'cold' : 'cover';
  } else if (band === 'mild' || band === 'warm') {
    const l = best(P.layer.filter(l => band === 'mild' ? l.warmth <= 2 : l.warmth === 1), l => sc({ ...o, layer: l }));
    if (l && sc({ ...o, layer: l }) > sc(o) + 0.2) { o.layer = l; o.why.layer = 'style'; }
  }
  // 3. shoes, belt, bag, accessory
  if (F === 'shoes') o.shoes = force.item; else o.shoes = best(P.shoes, x => sc({ ...o, shoes: x }));
  if (F === 'belt') o.belt = force.item;
  else if (mains.some(p => p.belt) || o.layer?.belt) { const b = best(P.belt, x => sc({ ...o, belt: x })); if (b && sc({ ...o, belt: b }) > sc(o) + 0.4) o.belt = b; }
  if (F === 'bag') o.bag = force.item; else o.bag = best(P.bag, x => sc({ ...o, bag: x }));
  if (F === 'acc') o.acc = force.item;
  else { const a = best(P.acc, x => sc({ ...o, acc: x })); if (a && sc({ ...o, acc: a }) > sc(o) + 0.6) o.acc = a; }
  finishOutfit(o, ctx);
  return o;
}
// jacket to take along + final score (also re-run after a swap)
function finishOutfit(o, ctx) {
  const { wx } = ctx;
  const needTake = (!o.layer && (wx.chill || wx.wet || wx.windy)) || (wx.wet && o.layer && !o.layer.rainOK);
  o.take = needTake ? rankTake(o, ctx).slice(0, 2) : [];
  o.flags.noTake = needTake && !o.take.length;
  o.score = scoreOutfit(o, ctx) - (o.flags.noUnder ? 4 : 0) - (o.flags.noLayer ? 2 : 0);
  o.key = SLOTS.filter(k => o[k]).map(k => o[k].id).sort().join('|');
  o.blocked = !!blockedHit(o);
  return o;
}

/* ============ generate a day ============ */
function generateDay(date, extra = {}) {
  const ctx = buildCtx(date, extra), P = ctx.pool;
  const lock = extra.lock ? itemById(extra.lock) : null;
  let bases = [];
  P.dresses.forEach(d => bases.push({ dress: d }));
  P.jumpsuits.forEach(j => bases.push({ jumpsuit: j }));
  P.tops.forEach(t => P.bottoms.forEach(b => bases.push({ top: t, bottom: b })));
  let force = null;
  if (lock) {
    if (MAIN.includes(lock.type)) {
      bases = bases.filter(b => b[lock.type] === lock);
      if (!bases.length) { // the item isn't normally chosen today; build around it anyway
        if (lock.type === 'top') bases = (P.bottoms.length ? P.bottoms : S.items.filter(i => i.type === 'bottom' && !i.inWash)).map(b => ({ top: lock, bottom: b }));
        else if (lock.type === 'bottom') bases = (P.tops.length ? P.tops : S.items.filter(i => i.type === 'top' && !i.inWash)).map(t => ({ top: t, bottom: lock }));
        else bases = [{ [lock.type]: lock }];
      }
    } else force = { slot: { outer: 'layer', shoes: 'shoes', belt: 'belt', bag: 'bag', acc: 'acc' }[lock.type], item: lock };
  }
  if (!bases.length) return { ctx, looks: [], problem: shortage(ctx) };
  const looks = [], used = new Set(), keys = new Set();
  for (const mood of MOODS[ctx.type]) {
    const m = { ...ctx, mood };
    const ranked = bases.map(b => [b, scoreOutfit(b, m)]).sort((a, b) => b[1] - a[1]).slice(0, 30);
    let bo = null, bs = -1e9;
    for (const [b] of ranked) {
      const o = complete(b, m, force);
      if (keys.has(o.key) || o.blocked) continue;
      const overlap = mainPieces(o).filter(p => used.has(p.id) && p !== lock).length;
      const v = o.score - overlap * 6;
      if (v > bs) { bs = v; bo = o; }
    }
    if (bo) { mainPieces(bo).forEach(p => used.add(p.id)); keys.add(bo.key); looks.push({ mood, o: bo, ctx: m }); }
  }
  return { ctx, looks };
}
function shortage(ctx) {
  const where = { office: 'for the office', church: 'for church', free: '' }[ctx.type];
  const n = t => S.items.filter(i => i.type === t).length;
  if (!S.items.length) return 'Add some clothes to your wardrobe and outfits will appear here.';
  let msg = `To build outfits ${where} I need at least one dress or jumpsuit, or one top and one bottom`;
  msg += ctx.type === 'free' ? ' that aren\'t in the wash.' : ` tagged "${ctx.type === 'office' ? 'Office' : 'Church'}" and not in the wash.`;
  msg += ` You have ${n('top')} tops, ${n('bottom')} bottoms, ${n('dress')} dresses and ${n('jumpsuit')} jumpsuits.`;
  return msg;
}
// cached day plans; later days avoid the main pieces planned for earlier days this week
function getDay(date) {
  const key = date + '#' + (S.seeds[date] || 0) + '#' + (S.lock && S.lockDate === date ? S.lock : '');
  if (S.cache.has(key)) return S.cache.get(key);
  let avoid = null;
  const t = todayStr();
  if (date > t && daysBetween(t, date) <= 7) {
    avoid = new Set();
    for (let d = t; d < date; d = addDays(d, 1)) {
      const g = getDay(d); const w = wornOn(d);
      const o = w ? fromSlots(w.slots) : g.looks[0]?.o;
      if (o) mainPieces(o).forEach(p => avoid.add(p.id));
    }
  }
  const g = generateDay(date, { avoid, lock: S.lockDate === date ? S.lock : null });
  S.cache.set(key, g);
  return g;
}
const wornOn = date => S.worn.find(w => w.date === date);
function fromSlots(slots, take = []) {
  const o = { why: {}, flags: {} };
  for (const [k, id] of Object.entries(slots)) { const it = itemById(id); if (it) o[k] = it; }
  o.take = take.map(itemById).filter(Boolean);
  return o;
}
const toSlots = o => Object.fromEntries(filled(o).map(([k, p]) => [k, p.id]));

/* ============ swaps ============ */
function alternatives(o, slot, ctx) {
  let cands = S.items.filter(i => i.type === SLOT_TYPE[slot] && !i.inWash);
  if (slot === 'under') cands = cands.filter(i => i.canUnder);
  return cands.map(c => [c, scoreOutfit({ ...o, [slot]: c }, ctx)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}

/* ============ explanations ============ */
function explain(o, ctx) {
  const R = [], W = [], { wx } = ctx, nm = p => itemName(p);
  const base = o.dress || o.jumpsuit || o.top;
  // weather & layers
  if (o.layer) {
    const y = o.why.layer;
    if (y === 'cold') R.push(`${cap(nm(o.layer))} on: it's a ${wx.band} day${wx.amax != null ? ` (feels like ${Math.round(wx.amax)}°C at most)` : ''}.`);
    else if (y === 'cover') R.push(`${cap(nm(o.layer))} covers your shoulders for ${ctx.type === 'church' ? 'church' : 'the office'}.`);
    else if (y === 'style') R.push(`${cap(nm(o.layer))} finishes the look${ctx.type === 'office' ? ' and keeps it office-smart' : ''}.`);
  }
  if (o.under) R.push(`${cap(nm(o.under))} underneath the ${base?.style || 'outfit'}${o.why.under?.needsUnder === 'always' ? ': it needs a layer under it' : ' for a more covered look'}.`);
  if (o.take?.length) {
    const why = [wx.wet ? `${Math.round(wx.rain)}% chance of rain` : '', wx.chill && wx.amin != null ? `${Math.round(wx.amin)}°C in the morning/evening` : '', wx.windy ? 'windy' : ''].filter(Boolean).join(', ');
    R.push(`Take ${o.take.map(nm).join(' or ')} with you${why ? ` (${why})` : ''}.`);
  }
  // colour
  if (base) {
    const pm = base.pm;
    if (pm.status === 'in') R.push(`${pm.name} near your face: right in your True Summer palette.`);
    else if (pm.status === 'close') R.push(`Close to ${pm.name} from your palette.`);
    else {
      const rescue = [o.acc, o.layer, o.under].find(p => p && faceItems(o).some(([f]) => f === p) && p.pm.status === 'in' && !p.pm.neutral);
      if (rescue) R.push(`The ${rescue.style} brings ${rescue.pm.name} up to your face, which balances the ${nm(base)}.`);
      else W.push(`The ${nm(base)} isn't a True Summer colour. ${pm.note || ''}`.trim());
    }
  }
  if (o.top && o.bottom && Math.abs(o.top.pm.L - o.bottom.pm.L) < 35) R.push('Soft contrast between top and bottom, which suits True Summer colouring.');
  for (const [p, q] of echoes(o)) R.push(`The ${p.pm2.label} in the ${nm(p)} picks up the ${nm(q)}.`);
  // fit
  if (o.top && o.bottom && o.top.fit && o.bottom.fit && isLoose(o.top.fit) !== isLoose(o.bottom.fit))
    R.push(`${isLoose(o.top.fit) ? 'Relaxed top balanced by a neater bottom' : 'Fitted top balances the fuller bottom'}: good proportions.`);
  if (o.belt && base && isLoose(base.fit)) R.push(`The belt gives the ${base.style} some waist definition.`);
  if (o.top && o.bottom && isLoose(o.top.fit) && isLoose(o.bottom.fit)) W.push('Both halves are loose: tuck the top in or add a belt to keep some shape.');
  // fabric
  const cl = [o.under, o.top, o.bottom, o.dress, o.jumpsuit, o.layer].filter(p => p && p.fabric), vis = cl.filter(p => p !== o.under), has = (...fs) => vis.some(p => fs.includes(p.fabric));
  if (has('knit', 'wool') && has('silk / satin', 'chiffon / sheer')) R.push('Soft knit with something silky: a lovely texture contrast.');
  else if (has('denim') && has('silk / satin', 'lace', 'chiffon / sheer')) R.push('Denim dressed up with a finer fabric.');
  else if (o.layer?.fabric === 'leather / faux leather' && o.dress) R.push('The leather jacket gives the dress an edge.');
  if (cl.filter(p => STATEMENT_FABRIC.includes(p.fabric)).length > 1) W.push('Two statement fabrics: consider swapping one for something plainer.');
  const den = cl.filter(p => p.fabric === 'denim');
  if (den.length > 1 && dE2000(den[0].pm.lab, den[1].pm.lab) < 10) W.push('Double denim in the same shade: choose different washes so they look intentional.');
  // rules
  const lenPiece = [o.dress, o.jumpsuit, o.bottom].find(p => p && hasLength(p));
  if (ctx.type === 'office' && lenPiece && lenPiece.length !== 'full') R.push(`${LENGTH_LABEL[lenPiece.length]} length keeps it office-appropriate.`);
  if (o.shoes && wx.wet && o.shoes.rainOK) R.push(`${cap(nm(o.shoes))} handle the rain.`);
  if (o.belt) R.push(`Optional: add the ${nm(o.belt)}${o.shoes && dE2000(o.belt.pm.lab, o.shoes.pm.lab) < 15 ? ' (it matches your shoes)' : ''}.`);
  // warnings
  if (o.flags.noUnder) W.push(`The ${nm(o.flags.noUnder)} needs something underneath, but nothing is tagged "can go under". Add a fitted tee, cami or turtleneck.`);
  if (o.flags.noLayer === 'cold') W.push('It\'s cool, but no jacket or cardigan is available for today.');
  if (o.flags.noLayer === 'cover') W.push(`Sleeveless for ${ctx.type === 'church' ? 'church' : 'the office'}: add a cardigan or shrug to your wardrobe.`);
  if (o.flags.noTake) W.push('You may need a jacket later, but none is in your wardrobe yet.');
  if (o.shoes && wx.wet && !o.shoes.rainOK) W.push(`Rain is likely and the ${nm(o.shoes)} aren't rain-friendly.`);
  if (!o.shoes && S.items.some(i => i.type === 'shoes')) W.push('No suitable shoes found for today.');
  for (const p of mainPieces(o)) { const d = daysSince(p.id, ctx.date); if (d != null && d < (+S.settings.repeatDays || 0)) W.push(`You wore the ${nm(p)} ${d === 1 ? 'yesterday' : d + ' days ago'}.`); }
  return { R, W };
}
