'use strict';
/* ============ shell ============ */
const view = $('#view');
function toast(msg, ms = 2400) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, ms); }
function openSheet(html) { const s = $('#sheet'); s.innerHTML = html; $('#sheetWrap').hidden = false; s.scrollTop = 0; document.body.style.overflow = 'hidden'; }
function closeSheet() { $('#sheetWrap').hidden = true; $('#sheet').innerHTML = ''; document.body.style.overflow = ''; S.form = null; S.swap = null; }
const sheetHead = t => `<div class="sheet-head"><h2>${t}</h2><button class="iconbtn" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`;
const ICON = {
  shuffle: '<svg viewBox="0 0 24 24"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>',
};
function setTop(title, actions = '') { $('#screenTitle').textContent = title; $('#topActions').innerHTML = actions; }
function render() {
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  ({ today: renderToday, week: renderWeek, wardrobe: renderWardrobe, saved: renderSaved, settings: renderSettings })[S.tab]();
}
const fmtDate = d => { const x = parseDate(d); return `${DOW_LONG[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`; };
const t0 = v => v == null ? '–' : Math.round(v) + '°';

/* ============ outfit card ============ */
function tile(p, slot, look, extraAttr = '') {
  return `<button class="piece" data-act="piece" data-look="${look}" data-slot="${slot}" ${extraAttr}><img src="${photoURL(p)}" alt="" loading="lazy"><span class="lbl">${ROLE_PREFIX[slot] || ''}${esc(cap(itemName(p)))}</span></button>`;
}
const ROLE_PREFIX = { under: 'Under: ', layer: 'Over: ' };
function outfitCard(L, i, opts = {}) {
  const o = L.o, ctx = L.ctx;
  const mainSlots = ['layer', 'under', 'dress', 'jumpsuit', 'top', 'bottom'].filter(k => o[k]);
  const extraSlots = ['shoes', 'belt', 'bag', 'acc'].filter(k => o[k]);
  const { R, W } = explain(o, ctx);
  return `<article class="card outfit">
    <div class="spread"><div><div class="mood">${esc(opts.kicker || L.mood.label)}</div></div>${opts.badge || ''}</div>
    <div class="pieces">${mainSlots.map(k => tile(o[k], k, i)).join('')}</div>
    ${extraSlots.length ? `<div class="extras">${extraSlots.map(k => tile(o[k], k, i)).join('')}</div>` : ''}
    ${o.take?.length ? `<div class="section-label">Take along</div><div class="extras">${o.take.map((p, ti) => tile(p, 'take', i, `data-ti="${ti}"`)).join('')}</div>` : ''}
    <ul class="reasons">${R.map(r => `<li>${esc(r)}</li>`).join('')}${W.map(r => `<li class="warn">${esc(r)}</li>`).join('')}</ul>
    <div class="actions">${opts.actions ?? `<button class="btn primary" data-act="wear" data-look="${i}">Wear this</button><button class="btn ghost" data-act="save" data-look="${i}">Save look</button>`}</div>
  </article>`;
}

/* ============ TODAY ============ */
function renderToday() {
  setTop('Today', `<button class="iconbtn" data-act="shuffle" aria-label="Shuffle">${ICON.shuffle}</button>`);
  const date = S.date, g = getDay(date), { wx, type } = g.ctx;
  const strip = Array.from({ length: 7 }, (_, n) => { const d = addDays(todayStr(), n), x = parseDate(d); return `<button data-act="date" data-date="${d}" class="${d === date ? 'on' : ''}">${n === 0 ? 'Today' : DOW[x.getDay()]}<b>${x.getDate()}</b></button>`; }).join('');
  let h = `<div class="datestrip">${strip}</div>`;
  h += `<div class="card">
    <div class="spread"><div><div class="muted small">${fmtDate(date)}</div></div><button class="tag daytype" data-act="daytype">${DAYTYPE_LABEL[type]} ▾</button></div>
    <div class="spread" style="margin-top:10px">
      <div class="wx"><div class="big">${wx.source === 'none' ? '🌡️' : WX_ICON(wx.code)}</div>
        <div>${wx.source === 'forecast' ? `<div class="temps">${t0(wx.max)} <span>/ ${t0(wx.min)}</span></div><div class="muted small">${WX_TEXT(wx.code)} · feels ${t0(wx.amax)} · rain ${Math.round(wx.rain)}%${wx.windy ? ' · windy' : ''}</div>`
          : wx.source === 'manual' ? `<div class="temps">${BAND_LABEL[wx.band]}</div><div class="muted small">Set by you${wx.wet ? ' · rain' : ''}</div>`
          : `<div class="temps">No forecast</div><div class="muted small">Assuming a mild day</div>`}</div></div>
      <button class="btn small ghost" data-act="wx">Adjust</button>
    </div>
    ${wx.source === 'none' && !S.settings.location ? `<div class="notice">Set your location for automatic weather. <button class="btn small" data-act="goto-settings">Set location</button></div>` : ''}
  </div>`;
  if (S.lock && S.lockDate === date) { const it = itemById(S.lock); if (it) h += `<div class="banner"><img src="${photoURL(it)}" alt=""><div class="small"><b>Built around</b><br>${esc(cap(itemName(it)))}</div><button class="btn small x" data-act="unlock">Clear</button></div>`; }
  S.viewLooks = [];
  const w = wornOn(date);
  if (w) {
    const o = fromSlots(w.slots, w.take); const ctx = { ...g.ctx, mood: MOODS[g.ctx.type].find(m => m.label === w.mood) || MOODS[g.ctx.type][0] };
    finishKeepTake(o, ctx, w.take);
    S.viewLooks.push({ o, ctx, mood: ctx.mood, worn: true });
    h += outfitCard(S.viewLooks[0], 0, { kicker: `Wearing · ${w.mood || ''}`, badge: '<span class="worn-badge">✓ Chosen</span>', actions: `<button class="btn ghost" data-act="unwear">Change my mind</button><button class="btn ghost" data-act="save" data-look="0">Save look</button>` });
    if (g.looks.length) h += `<div class="section-label">Other options</div>`;
  }
  if (!g.looks.length) {
    h += `<div class="empty"><h2>${S.items.length ? 'Not enough to work with yet' : 'Your wardrobe is empty'}</h2><p>${esc(g.problem || '')}</p><button class="btn primary" data-act="goto-wardrobe">Go to wardrobe</button></div>`;
  }
  g.looks.forEach(L => { if (w && L.o.key === S.viewLooks[0].o.key) return; S.viewLooks.push(L); h += outfitCard(L, S.viewLooks.length - 1, { kicker: `${DAYTYPE_LABEL[type]} · ${L.mood.label}` }); });
  view.innerHTML = h;
}
function finishKeepTake(o, ctx, takeIds) { finishOutfit(o, ctx); if (takeIds?.length) o.take = takeIds.map(itemById).filter(Boolean); }

/* ============ WEEK ============ */
function renderWeek() {
  setTop('This week', `<button class="iconbtn" data-act="refresh-wx" aria-label="Refresh weather">${ICON.refresh}</button>`);
  let h = `<p class="muted small">Your top pick for each day. Pieces aren't repeated across the week where possible. Tap a day for more options.</p>`;
  for (let n = 0; n < 7; n++) {
    const d = addDays(todayStr(), n), x = parseDate(d), g = getDay(d), w = wornOn(d);
    const o = w ? fromSlots(w.slots) : g.looks[0]?.o, wx = g.ctx.wx;
    const pics = o ? ['layer', 'under', 'dress', 'jumpsuit', 'top', 'bottom', 'shoes'].filter(k => o[k]).map(k => `<img src="${photoURL(o[k])}" alt="">`).join('') : '<span class="muted small">Not enough items yet</span>';
    h += `<div class="card weekcard" data-act="date" data-date="${d}" data-go="today">
      <div class="d"><span class="muted small">${n === 0 ? 'Today' : DOW[x.getDay()]}</span><b>${x.getDate()}</b></div>
      <div><div class="row"><span class="tag daytype">${DAYTYPE_LABEL[g.ctx.type]}</span><span class="small muted">${wx.source === 'forecast' ? `${WX_ICON(wx.code)} ${t0(wx.max)} / ${t0(wx.min)} · ${Math.round(wx.rain)}% rain` : wx.source === 'manual' ? BAND_LABEL[wx.band] : 'No forecast'}</span>${w ? '<span class="worn-badge small">✓</span>' : ''}</div>
      <div class="thumbs">${pics}</div>${o?.take?.length ? `<div class="small muted" style="margin-top:4px">+ take ${esc(o.take.map(itemName).join(' or '))}</div>` : ''}</div>
    </div>`;
  }
  view.innerHTML = h;
}

/* ============ WARDROBE ============ */
function renderWardrobe() {
  setTop('Wardrobe');
  const I = S.items;
  if (!I.length) {
    view.innerHTML = `<div class="empty"><h2>Let's add your clothes</h2><p>Photograph each item on a plain background (a bed or the floor works). The app picks up the colour and checks it against your True Summer palette.</p>
      <div class="row" style="justify-content:center;margin-top:14px"><button class="btn primary" data-act="add-item">Add first item</button><button class="btn ghost" data-act="demo-load">Try with demo clothes</button></div></div>`;
    return;
  }
  const counts = t => I.filter(i => i.type === t).length;
  const chips = [['all', `All ${I.length}`], ...TYPES.filter(t => counts(t.id)).map(t => [t.id, `${t.plural} ${counts(t.id)}`]), ['wash', 'In the wash'], ['out', 'Outside palette'], ['under', 'Can go under']];
  const F = S.filter;
  const list = I.filter(i => F === 'all' ? true : F === 'wash' ? i.inWash : F === 'out' ? i.pm.status === 'out' : F === 'under' ? i.canUnder : i.type === F)
    .sort((a, b) => TYPES.findIndex(t => t.id === a.type) - TYPES.findIndex(t => t.id === b.type) || b.created - a.created);
  view.innerHTML = `<div class="filters">${chips.map(([v, l]) => `<button class="chip ${F === v ? 'on' : ''}" data-act="filter" data-val="${v}">${esc(l)}</button>`).join('')}</div>
    <div class="grid">${list.map(i => `<button class="tile" data-act="item" data-id="${i.id}"><img src="${photoURL(i)}" alt="" loading="lazy"><span class="dot" style="background:${i.colour}"></span>${i.inWash ? '<span class="wash">In the wash</span>' : ''}<span class="nm">${esc(cap(itemName(i)))}</span></button>`).join('') || '<p class="muted">Nothing here.</p>'}</div>
    <button class="fab" data-act="add-item">+ Add item</button>`;
}
function itemDetail(id) {
  const it = itemById(id); if (!it) return;
  const d = daysSince(it.id, addDays(todayStr(), 1));
  const kv = [
    ['Type', `${TYPE[it.type].label} · ${it.style}`],
    ['Colour', `<span class="row"><span class="swatch" style="width:20px;height:20px;border-radius:6px;background:${it.colour}"></span>${esc(it.pm.label)} <span class="tag ${STATUS_CLASS[it.pm.status]}">${STATUS_LABEL[it.pm.status]}</span></span>`],
    hasLength(it) ? ['Length', LENGTH_LABEL[it.length]] : null,
    hasSleeves(it) ? ['Sleeves', cap(it.sleeves)] : null,
    ['Dressiness', DRESSY[it.dressy]],
    ['shoes', 'belt', 'bag', 'acc'].includes(it.type) ? null : ['Warmth', WARMTH[it.warmth]],
    ['Pattern', PATTERN[it.pattern]],
    ['Wear for', (it.occ || []).map(cap).join(', ') || 'Anything'],
    it.type === 'top' ? ['Goes under', it.canUnder ? 'Yes' : 'No'] : null,
    ['top', 'dress', 'jumpsuit'].includes(it.type) ? ['Needs under', UNDER[it.needsUnder]] : null,
    ['dress', 'jumpsuit', 'bottom', 'outer'].includes(it.type) ? ['Belt', it.belt ? 'Looks good belted' : 'No'] : null,
    ['shoes', 'outer', 'bag'].includes(it.type) ? ['Rain', it.rainOK ? 'Fine in the rain' : 'Not for rain'] : null,
    ['Last worn', d == null ? 'Not logged yet' : d <= 1 ? 'Today' : `${d - 1} days ago`],
  ].filter(Boolean);
  openSheet(`${sheetHead(esc(cap(itemName(it))))}
    <img class="detail-img" src="${photoURL(it)}" alt="">
    ${it.pm.note ? `<div class="notice">${esc(it.pm.note)}</div>` : ''}
    <dl class="kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <div class="row" style="margin-top:16px">
      <button class="btn primary" data-act="style-item" data-id="${it.id}">Build outfits around this</button>
      <button class="btn" data-act="wash-item" data-id="${it.id}">${it.inWash ? 'Back from the wash' : 'Put in the wash'}</button>
    </div>
    <div class="row" style="margin-top:8px"><button class="btn ghost" data-act="edit-item" data-id="${it.id}">Edit tags</button><button class="btn ghost danger" data-act="del-item" data-id="${it.id}">Delete</button></div>`);
}

/* ============ item form ============ */
function editItem(id) {
  const src = id ? itemById(id) : null;
  const d = src ? { ...src, _occTouched: true } : newItem(S.filter in TYPE ? S.filter : 'top');
  S.form = { d, isNew: !src, canvas: null, cross: null };
  drawForm();
}
function chipGroup(field, options, cur, multi = false) {
  return `<div class="chips">${options.map(([v, l]) => { const on = multi ? (cur || []).map(String).includes(String(v)) : String(cur) === String(v); return `<button type="button" class="chip ${on ? 'on' : ''}" data-act="f" data-field="${field}" data-val="${esc(v)}">${esc(l)}</button>`; }).join('')}</div>`;
}
const toggleRow = (field, title, desc, on) => `<label class="toggle"><span><span class="t">${title}</span><br><span class="d">${desc}</span></span><span class="switch"><input type="checkbox" data-tg="${field}" ${on ? 'checked' : ''}><span></span></span></label>`;
function drawForm() {
  const f = S.form, d = f.d; prepItem(d);
  const keep = $('#sheet').scrollTop;
  const pm = d.pm;
  const lens = d.type === 'jumpsuit' ? ['mini', 'knee', 'full'] : d.style === 'shorts' ? ['mini', 'knee'] : ['mini', 'knee', 'midi', 'maxi'];
  const img = d.photo ? (f.previewURL || (f.previewURL = URL.createObjectURL(d.photo))) : null;
  const sec = [];
  sec.push(`<div class="field"><div class="photo-pick" id="photoBox">${img ? `<img id="formImg" src="${img}" alt="">${f.cross ? `<span class="cross" style="left:${f.cross[0]}%;top:${f.cross[1]}%"></span>` : ''}` : `<div class="ph">No photo yet<br><span class="small">Lay the item flat on a plain background</span></div>`}</div>
    <div class="row" style="justify-content:center;margin-top:10px"><label class="btn ${img ? 'ghost' : 'primary'}">${img ? 'Change photo' : 'Take or choose photo'}<input type="file" accept="image/*" id="fileIn" hidden></label></div>
    ${img ? '<div class="hint" style="text-align:center">Tap the photo on the fabric to pick the exact colour.</div>' : ''}</div>`);
  sec.push(`<div class="field"><span class="lab">Type</span>${chipGroup('type', TYPES.map(t => [t.id, t.label]), d.type)}</div>`);
  sec.push(`<div class="field"><span class="lab">Style</span>${chipGroup('style', Object.keys(STYLES[d.type]).map(s => [s, cap(s)]), d.style)}</div>`);
  sec.push(`<div class="field"><span class="lab">Colour</span>
    <div class="colourrow"><span class="swatch" style="background:${d.colour}"></span><div><b>${esc(pm.label)}</b> <span class="tag ${STATUS_CLASS[pm.status]}">${STATUS_LABEL[pm.status]}</span>${pm.note ? `<div class="small muted">${esc(pm.note)}</div>` : ''}</div></div>
    <div class="hint">Or choose the closest colour:</div>
    <div class="palette">${PALETTE.map(p => `<button type="button" title="${p.name}" style="background:${p.hex}" class="${d.colour === p.hex ? 'on' : ''}" data-act="f" data-field="colour" data-val="${p.hex}"></button>`).join('')}</div>
    <div class="hint">Other colours (outside your palette):</div>
    <div class="palette">${OTHER_COLOURS.map(([n, hx]) => `<button type="button" title="${n}" style="background:${hx}" class="${d.colour === hx ? 'on' : ''}" data-act="f" data-field="colour" data-val="${hx}"></button>`).join('')}</div>
    <div class="row" style="margin-top:8px"><label class="small muted">Exact colour <input type="color" id="colourIn" value="${d.colour}" style="vertical-align:middle;width:44px;height:30px;border:0;background:none"></label></div></div>`);
  if (hasLength(d)) sec.push(`<div class="field"><span class="lab">Length</span>${chipGroup('length', lens.map(l => [l, LENGTH_LABEL[l]]), d.length)}${d.length === 'mini' ? '<div class="hint">Mini lengths are never suggested for the office.</div>' : ''}</div>`);
  if (hasSleeves(d)) sec.push(`<div class="field"><span class="lab">Sleeves</span>${chipGroup('sleeves', SLEEVES.map(s => [s, cap(s)]), d.sleeves)}</div>`);
  sec.push(`<div class="field"><span class="lab">Pattern</span>${chipGroup('pattern', Object.entries(PATTERN), d.pattern)}</div>`);
  sec.push(`<div class="field"><span class="lab">How dressy</span>${chipGroup('dressy', Object.entries(DRESSY), d.dressy)}</div>`);
  if (!['shoes', 'belt', 'bag', 'acc'].includes(d.type)) sec.push(`<div class="field"><span class="lab">Warmth</span>${chipGroup('warmth', Object.entries(WARMTH), d.warmth)}</div>`);
  sec.push(`<div class="field"><span class="lab">Wear it for</span>${chipGroup('occ', [['office', 'Office'], ['church', 'Church'], ['weekend', 'Weekend']], d.occ, true)}<div class="hint">Saturdays can use anything; this mainly controls weekdays and Sundays.</div></div>`);
  const tg = [];
  if (d.type === 'top') tg.push(toggleRow('canUnder', 'Can go under other pieces', 'e.g. a fitted tee or turtleneck under a pinafore or sleeveless jumpsuit', d.canUnder));
  if (['dress', 'jumpsuit', 'bottom', 'outer'].includes(d.type)) tg.push(toggleRow('belt', 'Looks good with a belt', 'Belts are suggested with this piece', d.belt));
  if (['shoes', 'outer', 'bag'].includes(d.type)) tg.push(toggleRow('rainOK', 'Fine in the rain', d.type === 'shoes' ? 'Closed, not suede' : 'Water-resistant', d.rainOK));
  if (!f.isNew) tg.push(toggleRow('inWash', 'In the wash', 'Skip it until it\'s clean', d.inWash));
  if (['top', 'dress', 'jumpsuit'].includes(d.type)) sec.push(`<div class="field"><span class="lab">Needs something underneath</span>${chipGroup('needsUnder', Object.entries(UNDER), d.needsUnder)}<div class="hint">Pinafores, dungarees and sheer tops usually need a layer under them.</div></div>`);
  if (tg.length) sec.push(`<div class="field"><span class="lab">Details</span><div class="card" style="margin:0;padding:4px 14px">${tg.join('')}</div></div>`);
  sec.push(`<div class="field"><label for="nameIn">Name (optional)</label><input type="text" id="nameIn" value="${esc(d.name || '')}" placeholder="${esc(cap(`${pm.label} ${d.style}`))}"></div>`);
  openSheet(`${sheetHead(f.isNew ? 'Add item' : 'Edit item')}${sec.join('')}
    <div class="sheet-foot">${f.isNew ? '<button class="btn" data-act="save-item" data-more="1">Save & add another</button>' : '<button class="btn" data-close>Cancel</button>'}<button class="btn primary" data-act="save-item">Save</button></div>`);
  $('#sheet').scrollTop = keep;
}
async function loadPhoto(file) {
  const bmp = await createImageBitmap(file);
  const max = 900, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  return { canvas: c, blob };
}
async function formCanvas() {
  const f = S.form; if (f.canvas) return f.canvas;
  if (!(f.d.photo instanceof Blob)) return null;
  const bmp = await createImageBitmap(f.d.photo); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); f.canvas = c; return c;
}
async function pickFromPhoto(ev) {
  const img = $('#formImg'), c = await formCanvas(); if (!img || !c) return;
  const r = img.getBoundingClientRect(), ar = c.width / c.height, br = r.width / r.height;
  let w = r.width, h = r.height, ox = 0, oy = 0;
  if (ar > br) { h = r.width / ar; oy = (r.height - h) / 2; } else { w = r.height * ar; ox = (r.width - w) / 2; }
  const px = (ev.clientX - r.left - ox) / w, py = (ev.clientY - r.top - oy) / h;
  if (px < 0 || py < 0 || px > 1 || py > 1) return;
  const x = c.getContext('2d', { willReadFrequently: true }), sx = Math.round(px * c.width), sy = Math.round(py * c.height), R = 4;
  const dd = x.getImageData(Math.max(0, sx - R), Math.max(0, sy - R), R * 2, R * 2).data;
  let rr = 0, gg = 0, bb = 0, n = 0; for (let i = 0; i < dd.length; i += 4) { rr += dd[i]; gg += dd[i + 1]; bb += dd[i + 2]; n++; }
  S.form.d.colour = rgbToHex(rr / n, gg / n, bb / n);
  S.form.cross = [((ev.clientX - r.left) / r.width * 100).toFixed(1), ((ev.clientY - r.top) / r.height * 100).toFixed(1)];
  drawForm();
}
function setField(field, val) {
  const d = S.form.d;
  if (field === 'type') { if (d.type === val) return; d.type = val; applyStyle(d, Object.keys(STYLES[val])[0]); }
  else if (field === 'style') { const keepOcc = d._occTouched; d._occTouched = false; applyStyle(d, val); if (keepOcc && !S.form.isNew) d._occTouched = true; }
  else if (field === 'occ') { d._occTouched = true; d.occ = d.occ.includes(val) ? d.occ.filter(x => x !== val) : [...d.occ, val]; }
  else if (field === 'dressy' || field === 'warmth') { d[field] = +val; if (!d._occTouched) d.occ = defaultOcc(d); }
  else if (field === 'length') { d.length = val; if (!d._occTouched) d.occ = defaultOcc(d); else if (val === 'mini') d.occ = d.occ.filter(o => o !== 'office'); }
  else if (field === 'colour') { d.colour = val; S.form.cross = null; }
  else d[field] = val;
  drawForm();
}
async function saveItem(more) {
  const f = S.form, d = f.d;
  d.name = ($('#nameIn')?.value || '').trim();
  delete d._occTouched; prepItem(d);
  const clean = { ...d }; delete clean.pm;
  await DB.putItem(clean);
  const i = S.items.findIndex(x => x.id === d.id); if (i >= 0) S.items[i] = d; else S.items.push(d);
  dropURL(d.id); if (f.previewURL) URL.revokeObjectURL(f.previewURL);
  invalidate();
  toast(f.isNew ? 'Added to your wardrobe' : 'Saved');
  if (more) { const type = d.type; S.form = { d: newItem(type), isNew: true }; drawForm(); render(); }
  else { closeSheet(); render(); }
}

/* ============ swap sheet ============ */
function openSwap(lookIdx, slot, ti) {
  const L = S.viewLooks[lookIdx]; if (!L) return;
  const o = L.o, ctx = L.ctx;
  let alts, cur;
  if (slot === 'take') { alts = rankTake(o, ctx); cur = o.take[ti]; }
  else { alts = alternatives(o, slot, ctx); cur = o[slot]; }
  const optional = ['under', 'layer', 'belt', 'bag', 'acc', 'take'].includes(slot);
  S.swap = { lookIdx, slot, ti };
  const title = slot === 'take' ? 'Jacket to take' : SLOT_LABEL[slot] === 'Wear' ? 'Layer' : SLOT_LABEL[slot];
  openSheet(`${sheetHead('Swap ' + title.toLowerCase())}
    <p class="muted small">Best matches first for this outfit and today's weather.</p>
    <div class="alts">${optional ? `<button class="tile" data-act="pick-alt" data-id="" style="display:grid;place-items:center;aspect-ratio:1/1"><span class="muted">None</span></button>` : ''}
    ${alts.slice(0, 17).map(p => `<button class="tile ${p === cur ? 'cur' : ''}" data-act="pick-alt" data-id="${p.id}"><img src="${photoURL(p)}" alt=""><span class="dot" style="background:${p.colour}"></span><span class="nm">${esc(cap(itemName(p)))}</span></button>`).join('')}</div>
    ${!alts.length ? '<p class="muted">Nothing else of this type in your wardrobe yet.</p>' : ''}
    <div style="margin-top:14px"><button class="btn ghost" data-act="open-item" data-id="${cur?.id || ''}" ${cur ? '' : 'disabled'}>View item details</button></div>`);
}
function pickAlt(id) {
  const { lookIdx, slot, ti } = S.swap, L = S.viewLooks[lookIdx], o = L.o, it = id ? itemById(id) : null;
  if (slot === 'take') { o.take = [...o.take]; if (it) o.take[ti] = it; else o.take.splice(ti, 1); const keep = o.take; finishOutfit(o, L.ctx); o.take = keep; }
  else { o[slot] = it; if (slot === 'layer') o.why.layer = it ? 'chosen' : null; if (slot === 'under') o.flags.noUnder = null; if (slot === 'layer') o.flags.noLayer = null; const keep = o.take; finishOutfit(o, L.ctx); if (L.worn) o.take = keep; }
  closeSheet();
  if (L.worn) { const w = wornOn(S.date); w.slots = toSlots(o); w.take = o.take.map(p => p.id); saveKV('worn'); invalidate(); }
  const html = outfitCard(L, lookIdx, L.worn ? { kicker: `Wearing · ${L.mood.label}`, badge: '<span class="worn-badge">✓ Chosen</span>', actions: `<button class="btn ghost" data-act="unwear">Change my mind</button><button class="btn ghost" data-act="save" data-look="${lookIdx}">Save look</button>` } : { kicker: `${DAYTYPE_LABEL[L.ctx.type]} · ${L.mood.label}` });
  const cards = $$('.outfit', view); if (cards[lookIdx]) cards[lookIdx].outerHTML = html; else render();
}

/* ============ day type & weather sheets ============ */
function openDayType() {
  const cur = S.dayType[S.date] || 'auto';
  openSheet(`${sheetHead('What kind of day?')}<p class="muted small">${fmtDate(S.date)}. Change this for public holidays, leave or special events.</p>
    ${chipGroup('daytype', [['auto', 'Automatic'], ['office', 'Office'], ['church', 'Church / dressy'], ['free', 'Free day (all options)']], cur)}`);
}
function openWx() {
  const ov = S.wxOverride[S.date];
  openSheet(`${sheetHead('Weather for ' + fmtDate(S.date))}
    <p class="muted small">Override the forecast if you know better (e.g. an air-conditioned office or an evening event).</p>
    <div class="field"><span class="lab">Temperature</span>${chipGroup('band', BANDS.map(b => [b, BAND_LABEL[b]]), ov?.band)}</div>
    <div class="field"><span class="lab">Rain</span>${chipGroup('rain', [['0', 'Dry'], ['1', 'Rain']], ov ? (ov.rain ? '1' : '0') : '')}</div>
    <div class="sheet-foot"><button class="btn" data-act="wx-reset">Use forecast</button><button class="btn primary" data-close>Done</button></div>`);
}

/* ============ SAVED ============ */
function renderSaved() {
  setTop('Saved looks');
  if (!S.saved.length) { view.innerHTML = `<div class="empty"><h2>No saved looks yet</h2><p>Tap "Save look" on any outfit you love and it'll be kept here to wear again.</p></div>`; return; }
  S.viewLooks = [];
  const ctx = buildCtx(S.date);
  view.innerHTML = `<p class="muted small">Tap "Wear" to choose a look for ${S.date === todayStr() ? 'today' : fmtDate(S.date)}.</p>` + S.saved.slice().reverse().map(sv => {
    const o = fromSlots(sv.slots, sv.take); if (!mainPieces(o).length) return '';
    const c = { ...ctx, mood: MOODS[ctx.type][0] }; finishKeepTake(o, c, sv.take);
    S.viewLooks.push({ o, ctx: c, mood: { label: sv.mood || 'Saved' }, saved: sv.id });
    const i = S.viewLooks.length - 1;
    return outfitCard(S.viewLooks[i], i, { kicker: `${DAYTYPE_LABEL[sv.type] || ''} · ${sv.mood || ''}`, actions: `<button class="btn primary" data-act="wear" data-look="${i}">Wear</button><button class="btn ghost danger" data-act="saved-del" data-id="${sv.id}">Remove</button>` });
  }).join('');
}

/* ============ SETTINGS ============ */
function renderSettings() {
  setTop('Settings');
  const st = S.settings;
  const wxAge = S.weather ? Math.round((Date.now() - S.weather.fetched) / 60000) : null;
  view.innerHTML = `
  <div class="card"><h3>Location</h3>
    <p class="small muted">${st.location ? `Weather for <b>${esc(st.location.name)}</b>${wxAge != null ? ` · updated ${wxAge < 60 ? wxAge + ' min' : Math.round(wxAge / 60) + ' h'} ago` : ''}` : 'Not set yet.'}</p>
    <div class="row"><button class="btn" data-act="geo">Use my location</button>${st.location ? '<button class="btn ghost" data-act="refresh-wx">Refresh weather</button>' : ''}</div>
    <div class="field"><input type="search" id="placeQ" placeholder="Or search a town, e.g. Johannesburg"></div><div id="placeRes"></div>
  </div>
  <div class="card"><h3>Day rules</h3>
    <div class="field"><span class="lab">Office days</span>${chipGroup('officeDays', [1, 2, 3, 4, 5, 6, 0].map(n => [n, DOW[n]]), st.officeDays.map(String), true)}</div>
    <div class="field"><span class="lab">Church day</span>${chipGroup('churchDay', [[0, 'Sunday'], [6, 'Saturday'], [-1, 'None']], st.churchDay)}</div>
    ${toggleRow('coverChurch', 'Cover shoulders at church', 'Sleeveless pieces get a cardigan, shrug or blazer', st.coverChurch)}
    ${toggleRow('coverOffice', 'Cover shoulders at the office', 'Same rule on office days', st.coverOffice)}
    ${toggleRow('miniChurch', 'Allow mini lengths on church days', 'Off: only knee length and longer', st.miniChurch)}
    <div class="field"><span class="lab">Avoid repeating main pieces for</span>${chipGroup('repeatDays', [[0, 'Off'], [2, '2 days'], [4, '4 days'], [7, 'A week']], st.repeatDays)}</div>
    <p class="small muted">Office: smart-casual, no minis or shorts. Church: dressier pieces first. Free days (Saturdays): Relaxed, Out & about and Dressed up.</p>
  </div>
  <div class="card"><h3>Your True Summer palette</h3><p class="small muted">Cool, soft and light-to-medium. Wear these near your face; save black, camel, mustard and orange for bottoms, shoes and bags.</p>
    <div class="palette-view">${PALETTE.map(p => `<div><i style="background:${p.hex}"></i>${p.name}</div>`).join('')}</div></div>
  <div class="card"><h3>Backup</h3><p class="small muted">Your clothes are saved only on this device, inside this app. Make a backup now and then, especially before changing phones.</p>
    <div class="row"><button class="btn" data-act="export">Save a backup</button><label class="btn ghost">Restore backup<input type="file" accept=".json,application/json" id="importIn" hidden></label></div></div>
  <div class="card"><h3>Demo clothes</h3><p class="small muted">Drawn sample items so you can see how the app works. Remove them when you've added your own.</p>
    <div class="row"><button class="btn" data-act="demo-load">Add demo clothes</button><button class="btn ghost" data-act="demo-remove">Remove demo clothes</button></div></div>
  <div class="card"><h3>Start over</h3><div class="row"><button class="btn ghost danger" data-act="wipe">Delete everything</button></div></div>
  <p class="small muted" style="text-align:center">Weather by Open-Meteo.com</p>`;
}
async function saveSettings() { await saveKV('settings'); invalidate(); }
async function setLocation(loc) { S.settings.location = loc; await saveSettings(); S.weather = null; try { await fetchWeather(true); toast('Weather loaded for ' + loc.name); } catch { toast('Couldn\'t load the weather. Check your connection.'); } render(); }

/* ============ backup ============ */
const blobToDataURL = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
async function exportBackup() {
  const items = [];
  for (const it of S.items) { const c = { ...it }; delete c.pm; if (c.photo instanceof Blob) c.photo = await blobToDataURL(c.photo); items.push(c); }
  const data = { app: 'true-summer-wardrobe', version: 1, exported: new Date().toISOString(), items, settings: S.settings, saved: S.saved, worn: S.worn };
  const file = new File([JSON.stringify(data)], `wardrobe-backup-${todayStr()}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Wardrobe backup' }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  toast('Backup saved');
}
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'true-summer-wardrobe') throw new Error();
    for (const it of data.items) { if (typeof it.photo === 'string' && it.photo.startsWith('data:')) it.photo = await (await fetch(it.photo)).blob(); await DB.putItem(it); }
    S.settings = { ...DEFAULT_SETTINGS, ...data.settings }; S.saved = data.saved || []; S.worn = data.worn || [];
    await Promise.all(['settings', 'saved', 'worn'].map(saveKV));
    await loadItems(); invalidate(); toast(`Restored ${data.items.length} items`); render();
  } catch { toast('That file isn\'t a wardrobe backup'); }
}

/* ============ demo ============ */
const DEMO = [
  ['top', 'tee', '#F1EFEA'], ['top', 'blouse', '#C99DA4'], ['top', 'button-up shirt', '#B3C6DE'], ['top', 'knit / jumper', '#3C4A66'], ['top', 'turtleneck', '#9EA4AC'],
  ['top', 'camisole', '#E8C6CC'], ['top', 'blouse', '#D4A017'], ['top', 'dressy top', '#B3415D'], ['top', 'tee', '#5F9C9E', { pattern: 'subtle' }],
  ['bottom', 'jeans', '#5C7AA3'], ['bottom', 'tailored trousers', '#1C1C1E'], ['bottom', 'wide-leg trousers', '#9C918C'], ['bottom', 'skirt', '#6E7A86', { pattern: 'subtle' }],
  ['bottom', 'skirt', '#2F3B5A', { length: 'mini' }], ['bottom', 'shorts', '#C9CDD2'],
  ['dress', 'wrap dress', '#B3415D'], ['dress', 'shift dress', '#6A7DAF'], ['dress', 'pinafore dress', '#4A5260'], ['dress', 'slip dress', '#B8A8D2'],
  ['dress', 'maxi dress', '#94CBCB', { pattern: 'bold' }], ['dress', 'fit & flare dress', '#76304A'],
  ['jumpsuit', 'jumpsuit', '#2F3B5A'], ['jumpsuit', 'sleeveless jumpsuit', '#4C9A89'],
  ['outer', 'blazer', '#3C4A66'], ['outer', 'cardigan', '#C99DA4'], ['outer', 'denim jacket', '#5C7AA3'], ['outer', 'trench coat', '#9C918C'], ['outer', 'wool coat', '#C19A6B'], ['outer', 'light cardigan / shrug', '#F1EFEA'],
  ['shoes', 'sneakers', '#F1EFEA'], ['shoes', 'loafers', '#8A6B6B'], ['shoes', 'heels', '#9C918C'], ['shoes', 'ankle boots', '#4A5260'], ['shoes', 'sandals', '#8A6B6B'], ['shoes', 'low / block heels', '#2F3B5A'],
  ['belt', 'thin belt', '#8A6B6B'], ['belt', 'wide belt', '#4A5260'],
  ['bag', 'tote', '#9C918C'], ['bag', 'crossbody', '#8A6B6B'], ['bag', 'clutch', '#848A90'],
  ['acc', 'scarf', '#8D9AD3'], ['acc', 'necklace', '#F1EFEA'],
];
async function loadDemo() {
  for (const [type, style, colour, extra] of DEMO) {
    const it = newItem(type); applyStyle(it, style); it.colour = colour; it.demo = true; Object.assign(it, extra || {});
    if (extra) it.occ = defaultOcc(it);
    await DB.putItem(it);
  }
  await loadItems(); invalidate(); toast('Demo clothes added'); render();
}
async function removeDemo() { for (const it of S.items.filter(i => i.demo)) { await DB.delItem(it.id); dropURL(it.id); } await loadItems(); invalidate(); toast('Demo clothes removed'); render(); }

/* ============ events ============ */
let delArm = null;
document.addEventListener('click', async e => {
  if (e.target.closest('[data-close]')) { closeSheet(); return; }
  if (e.target.id === 'formImg') { pickFromPhoto(e); return; }
  const tab = e.target.closest('#tabs button'); if (tab) { S.tab = tab.dataset.tab; window.scrollTo(0, 0); render(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, D = el.dataset;
  switch (a) {
    case 'date': S.date = D.date; if (D.go) S.tab = D.go; window.scrollTo(0, 0); render(); break;
    case 'shuffle': S.seeds[S.date] = (S.seeds[S.date] || 0) + 1; invalidate(); render(); toast('New options'); break;
    case 'daytype': openDayType(); break;
    case 'wx': openWx(); break;
    case 'wx-reset': delete S.wxOverride[S.date]; await saveKV('wxOverride'); invalidate(); closeSheet(); render(); break;
    case 'piece': openSwap(+D.look, D.slot, +D.ti || 0); break;
    case 'pick-alt': pickAlt(D.id); break;
    case 'open-item': closeSheet(); itemDetail(D.id); break;
    case 'wear': {
      const L = S.viewLooks[+D.look]; const date = S.date;
      S.worn = S.worn.filter(w => w.date !== date);
      S.worn.push({ date, slots: toSlots(L.o), take: (L.o.take || []).map(p => p.id), mood: L.mood.label, type: L.ctx.type });
      await saveKV('worn'); invalidate(); if (S.tab === 'saved') S.tab = 'today'; render(); window.scrollTo(0, 0); toast('Enjoy your day!'); break;
    }
    case 'unwear': S.worn = S.worn.filter(w => w.date !== S.date); await saveKV('worn'); invalidate(); render(); break;
    case 'save': {
      const L = S.viewLooks[+D.look]; const slots = toSlots(L.o); const key = Object.values(slots).sort().join('|');
      if (S.saved.some(s => Object.values(s.slots).sort().join('|') === key)) { toast('Already saved'); break; }
      S.saved.push({ id: uid(), slots, take: (L.o.take || []).map(p => p.id), mood: L.mood.label, type: L.ctx.type, savedAt: Date.now() });
      await saveKV('saved'); toast('Look saved'); break;
    }
    case 'saved-del': S.saved = S.saved.filter(s => s.id !== D.id); await saveKV('saved'); render(); break;
    case 'unlock': S.lock = null; S.lockDate = null; invalidate(); render(); break;
    case 'goto-settings': S.tab = 'settings'; render(); break;
    case 'goto-wardrobe': S.tab = 'wardrobe'; render(); break;
    case 'filter': S.filter = D.val; render(); break;
    case 'add-item': editItem(null); break;
    case 'item': itemDetail(D.id); break;
    case 'edit-item': editItem(D.id); break;
    case 'style-item': S.lock = D.id; S.lockDate = S.date; invalidate(); closeSheet(); S.tab = 'today'; render(); window.scrollTo(0, 0); break;
    case 'wash-item': { const it = itemById(D.id); it.inWash = !it.inWash; const c = { ...it }; delete c.pm; await DB.putItem(c); invalidate(); closeSheet(); render(); toast(it.inWash ? 'Skipped until it\'s washed' : 'Back in rotation'); break; }
    case 'del-item': {
      if (delArm !== D.id) { delArm = D.id; el.textContent = 'Tap again to delete'; setTimeout(() => delArm = null, 3000); break; }
      await DB.delItem(D.id); dropURL(D.id); S.items = S.items.filter(i => i.id !== D.id); invalidate(); closeSheet(); render(); toast('Deleted'); break;
    }
    case 'f': {
      if (S.form) { setField(D.field, D.val); break; }
      const st = S.settings;
      if (D.field === 'daytype') { if (D.val === 'auto') delete S.dayType[S.date]; else S.dayType[S.date] = D.val; await saveKV('dayType'); invalidate(); closeSheet(); render(); break; }
      if (D.field === 'band' || D.field === 'rain') {
        const ov = S.wxOverride[S.date] || { band: dayWeather(S.date).band, rain: dayWeather(S.date).wet };
        if (D.field === 'band') ov.band = D.val; else ov.rain = D.val === '1';
        S.wxOverride[S.date] = ov; await saveKV('wxOverride'); invalidate(); openWx(); render(); break;
      }
      if (D.field === 'officeDays') { const n = +D.val; st.officeDays = st.officeDays.includes(n) ? st.officeDays.filter(x => x !== n) : [...st.officeDays, n]; }
      else if (D.field === 'churchDay') st.churchDay = +D.val;
      else if (D.field === 'repeatDays') st.repeatDays = +D.val;
      await saveSettings(); render(); break;
    }
    case 'save-item': saveItem(!!D.more); break;
    case 'geo':
      if (!navigator.geolocation) { toast('Location isn\'t available here, so search instead'); break; }
      toast('Finding you…');
      navigator.geolocation.getCurrentPosition(p => setLocation({ name: 'My location', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }), () => toast('Location blocked, so search for your town instead'), { timeout: 15000 });
      break;
    case 'place': setLocation({ name: D.name, lat: +D.lat, lon: +D.lon }); break;
    case 'refresh-wx': try { await fetchWeather(true); toast('Weather updated'); render(); } catch { toast('Couldn\'t reach the weather service'); } break;
    case 'export': exportBackup(); break;
    case 'demo-load': loadDemo(); break;
    case 'demo-remove': removeDemo(); break;
    case 'wipe': {
      if (delArm !== 'wipe') { delArm = 'wipe'; el.textContent = 'Tap again: this deletes all clothes and history'; setTimeout(() => delArm = null, 4000); break; }
      await DB.clearItems(); S.saved = []; S.worn = []; S.dayType = {}; S.wxOverride = {};
      await Promise.all(['saved', 'worn', 'dayType', 'wxOverride'].map(saveKV)); S.urls.forEach((u, id) => dropURL(id)); await loadItems(); invalidate(); render(); toast('Everything deleted'); break;
    }
  }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'fileIn' && t.files[0]) {
    try {
      const { canvas, blob } = await loadPhoto(t.files[0]);
      const f = S.form; if (f.previewURL) URL.revokeObjectURL(f.previewURL);
      f.previewURL = null; f.canvas = canvas; f.cross = null; f.d.photo = blob; f.d.colour = detectColour(canvas); drawForm();
    } catch { toast('Couldn\'t read that photo'); }
  } else if (t.id === 'colourIn' && S.form) { S.form.d.colour = t.value.toUpperCase(); S.form.cross = null; drawForm(); }
  else if (t.id === 'importIn' && t.files[0]) importBackup(t.files[0]);
  else if (t.dataset.tg) {
    if (S.form) { S.form.d[t.dataset.tg] = t.checked; }
    else { S.settings[t.dataset.tg] = t.checked; await saveSettings(); }
  }
});
let placeT;
document.addEventListener('input', e => {
  if (e.target.id !== 'placeQ') return;
  clearTimeout(placeT); const q = e.target.value.trim();
  if (q.length < 3) { $('#placeRes').innerHTML = ''; return; }
  placeT = setTimeout(async () => {
    try { const res = await searchPlaces(q); $('#placeRes').innerHTML = res.length ? `<div class="chips">${res.map(p => `<button class="chip" data-act="place" data-name="${esc(p.name)}" data-lat="${p.lat}" data-lon="${p.lon}">${esc(p.name)}</button>`).join('')}</div>` : '<p class="small muted">No matches.</p>'; }
    catch { $('#placeRes').innerHTML = '<p class="small muted">Search needs an internet connection.</p>'; }
  }, 350);
});

/* ============ start ============ */
async function loadItems() { S.items = (await DB.allItems()).map(prepItem); }
async function init() {
  await DB.open();
  await loadItems();
  S.settings = { ...DEFAULT_SETTINGS, ...(await DB.get('settings') || {}) };
  for (const k of ['saved', 'worn']) S[k] = (await DB.get(k)) || [];
  for (const k of ['dayType', 'wxOverride']) S[k] = (await DB.get(k)) || {};
  S.weather = (await DB.get('weather')) || null;
  render();
  if (S.settings.location) fetchWeather().then(() => render()).catch(() => { if (S.weather) toast('Offline: using the last forecast'); });
  navigator.storage?.persist?.();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
  // roll over to the new day if the app stays open overnight
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.date < todayStr()) { S.date = todayStr(); invalidate(); render(); } });
}
init().catch(err => { view.innerHTML = `<div class="empty"><h2>Something went wrong</h2><p>${esc(err.message)}</p></div>`; });
