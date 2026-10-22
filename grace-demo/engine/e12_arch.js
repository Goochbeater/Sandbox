/* ARCHITECTURE — buildings seen from a distance, made the way the rooms' furniture is: every face painted to its own
   size as pixel art (a limited palette ramp, highlights on top edges, dark mortar, grime low down, rain streaks,
   windows with a separate glow mask), then wrapped on real 3D boxes, drum towers and cone roofs.

   The pixel-scale rule (why the rooms look right): one texel should land on about 3 screen pixels. The rooms get that
   from 32 texels/m seen from 19 m. Anything further away needs proportionally coarser textures:
     BUILD.density(dist, fov) → texels per metre that match the rooms at that viewing distance.
   Painters take a ramp: 6 colours from darkest (mortar, deep shadow) to lightest (top-edge highlight).
     PX.facade(wm, hm, f)        → { map, emap, lits }  a wall face painted to wm × hm metres
     PX.towerWrap(r, hm, f)      → { map, emap, lits }  goes once round a drum tower
     PX.coneWrap(r, h, ramp, d)  → a cone roof's tiles     PX.stoneTile(ramp, d, seed) / PX.tileRoof(ramp, d, seed) repeatable
     BUILD.facade(x0, x1, y0, y1, z0, z1, f)  BUILD.tower(x, z, y0, y1, r, f)  build and light them
   f: { ramp, d, seed, win: [[x, y, kind, lit]], arch: [x, w, h], bands: [y], crest: [x, y], grime, streaks, tile } */
BUILD.density = (dist, fov) => Math.round(32 * 19.4 * Math.tan(THREE.MathUtils.degToRad(19) / 2) / (dist * Math.tan(THREE.MathUtils.degToRad(fov || 19) / 2)) * 10) / 10;
PX.BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
PX.dith = (x, y) => (PX.BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
PX.ramp = (R, i) => R[clamp(Math.round(i), 0, R.length - 1)];
/* courses of stone blocks into a Pix (wrapping in x when tile): 3-4 px courses, 4-8 px blocks, a highlight row on top,
   a mortar row under, the odd chipped or darker block */
PX.stones = function (p, R, seed, x0, y0, w, h, wrapX) {
  let y = y0, row = 0;
  while (y < y0 + h) {
    const ch = Math.min(y0 + h - y, 3 + (hash(row, 1, seed) < 0.35 ? 1 : 0)); let x = -Math.floor(hash(row, 2, seed) * 6), k = 0;
    while (x < w) {
      const bw = 4 + Math.floor(hash(row, k, seed + 3) * 5), bi = 2 + (hash(row, k, seed + 4) < 0.3 ? 1 : 0) - (hash(row, k, seed + 5) < 0.18 ? 1 : 0);
      for (let j = 0; j < ch; j++) for (let i = 0; i < bw; i++) {
        const px = x + i; if (!wrapX && (px < 0 || px >= w)) continue;
        let c = bi; if (j === 0 && hash(row, k, seed + 10) < 0.7) c = bi + 1; if (j === ch - 1) c = hash(px, y + j, seed + 6) < 0.2 ? 0 : 1; else if (i === 0) c = hash(row, k, seed + 7) < 0.7 ? 1 : bi - 1;
        if (j > 0 && j < ch - 1 && i > 0 && hash(px, y + j, seed + 8) < 0.08) c = bi + (hash(px, y, seed + 9) < 0.5 ? -1 : 1);
        if (wrapX) p.wset(x0 + px, y + j, PX.ramp(R, c)); else p.set(x0 + px, y + j, PX.ramp(R, c));
      }
      x += bw; k++;
    }
    y += ch; row++;
  }
};
/* weathering over what's painted: grime rising from the foot (dithered), rain streaks running down, moss low down */
PX.weather = function (p, R, f, wrapX) {
  const W = p.w, H = p.h, seed = (f.seed || 1) + 50, idx = new Map(R.map((c, i) => [c, i]));
  const darker = (x, y, n) => { const c = p.get(x, y), i = idx.get(c); if (i !== undefined) p.set(x, y, PX.ramp(R, i - n)); };
  const g = f.grime === undefined ? 0.3 : f.grime;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = (y / H - (1 - g)) / g; if (t > PX.dith(x, y)) darker(x, y, 1); }
  const sn = f.streaks === undefined ? Math.round(W / 6) : f.streaks;
  for (let k = 0; k < sn; k++) { const x = Math.floor(hash(k, 1, seed) * W), len = H * (0.15 + 0.5 * hash(k, 2, seed)), y0 = Math.floor(hash(k, 3, seed) * H * 0.3);
    for (let y = y0; y < Math.min(H, y0 + len); y++) if (hash(x, y, seed + 4) < 0.7 - 0.4 * (y - y0) / len) darker(x, y, 1); }
  for (let x = 0; x < W; x++) for (let y = H - 3; y < H; y++) if (hash(x, y, seed + 5) < 0.35) p.set(x, y, hash(x, y, seed + 6) < 0.5 ? 0x26341e : 0x34462a);
};
/* ivy climbing from the foot: f.ivy = [[x (m, or radians round a tower), width (m), height (m)], …] */
PX.ivy = function (p, f, W, H) {
  const G = [0x101a10, 0x1a2a18, 0x26381e, 0x344826, 0x46582e];
  for (const [xm, wm, hm] of f.ivy || []) { const cx = f.ivyAngle ? ((xm / (Math.PI * 2)) % 1 + 1) % 1 * W : xm * f.d, hw = wm * f.d / 2, top = H - hm * f.d;
    for (let y = Math.floor(top - 4); y < H; y++) for (let x = Math.floor(cx - hw - 3); x <= cx + hw + 3; x++) {
      const u = (x - cx) / hw, reach = top + (u * u) * (H - top) * 0.7 + noise1(x * 0.4, 290) * 5; if (y < reach || Math.abs(u) > 1.15) continue;
      if (hash(x, y, 291) < 0.82) { const c = G[clamp(Math.floor(hash(x >> 1, y >> 1, 292) * 3) + ((x + y) % 3 === 0 ? 1 : 0) + (y < reach + 2 ? 1 : 0), 0, 4)]; p.wset(x, y, c); } } }
};
/* a window or opening (PX.opening) at (cx, by) = bottom centre in px. kinds: slit, lancet, tall, square, rose */
PX.WIN = { slit: [1, 4], lancet: [2, 5], tall: [3, 8], square: [2, 2], rose: [5, 5] };
PX.opening = function (p, e, R, cx, by, kind, lit) {
  const [w, h] = PX.WIN[kind], x0 = Math.round(cx - w / 2), top = by - h, glass = (x, y, t) => {
    const c = lit ? C.ramp([0xffe8a0, 0xffc050, 0xf09030, 0xc06018], clamp(t, 0, 0.999)) : C.ramp([0x2a3044, 0x141824, 0x0c0e16], clamp(t * 1.4, 0, 0.999));
    p.set(x, y, c); if (lit) e.set(x, y, c); };
  const inside = (x, y) => { if (kind === 'rose') return Math.hypot(x - cx + 0.5, y - (by - 2.5)) <= 2.5;
    if (y < top || y >= by || x < x0 || x >= x0 + w) return false; if ((kind === 'lancet' || kind === 'tall') && y === top && w > 1) return x === x0 + Math.floor((w - 1) / 2) || (w === 2 && x === x0 + 1) ? true : false; return true; };
  for (let y = top - 2; y <= by + 1; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) {
    if (inside(x, y)) { const mull = w >= 3 && x === x0 + 1 && kind !== 'rose', tr = kind === 'tall' && y === by - 4; glass(x, y, mull || tr ? 0.9 : (y - top) / h * 0.7 + (x - x0) / w * 0.15); if ((mull || tr) && lit) { p.set(x, y, 0x5a2a10); e.set(x, y, 0x3a1a08); } continue; }
    const near = inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1);
    if (near) p.set(x, y, y === by ? PX.ramp(R, 4) : PX.ramp(R, 1));   // a dark reveal, a pale sill
  }
};
PX.tex2 = function (p, e, d) { const map = p.tex({ aniso: 4 }), emap = e.tex(); map.userData.d = emap.userData.d = d; return { map, emap }; };
PX.facade = function (wm, hm, f) {
  const d = f.d, W = Math.max(4, Math.round(wm * d)), H = Math.max(4, Math.round(hm * d)), p = new Pix(W, H), e = new Pix(W, H).fill(0), R = f.ramp, lits = [];
  PX.stones(p, R, f.seed || 1, 0, 0, W, H, false);
  for (const by of f.bands || []) { const y = H - Math.round(by * d); p.hl(0, W - 1, y, PX.ramp(R, 5)); p.hl(0, W - 1, y + 1, PX.ramp(R, 3)); p.hl(0, W - 1, y + 2, PX.ramp(R, 0)); }
  PX.weather(p, R, f, false); PX.ivy(p, f, W, H);
  if (f.top !== false) { p.hl(0, W - 1, 0, PX.ramp(R, 1)); }
  if (f.arch) { const [ax, aw, ah] = f.arch, cx = ax * d, hw = aw * d / 2, top = H - ah * d, rr = hw;
    for (let y = Math.floor(top - rr - 3); y < H; y++) for (let x = Math.floor(cx - hw - 3); x <= cx + hw + 3; x++) {
      const dy = Math.max(0, top - y), r = Math.hypot(x + 0.5 - cx, dy), inArch = (y >= top && Math.abs(x + 0.5 - cx) < hw) || (y < top && r < rr);
      const ring = !inArch && ((y >= top && Math.abs(x + 0.5 - cx) < hw + 2) || (y < top && r < rr + 2));
      if (inArch) { const t = clamp((y - (top - rr)) / (H - (top - rr)), 0, 1), grate = y < top + ah * d * 0.45 && ((x & 1) === 0 || (y & 1) === 0);
        const c = grate ? 0x1c1a20 : C.mix(0x0e0a0c, 0xb86a24, smooth(0.35, 1, t)); p.set(x, y, c); if (!grate && t > 0.4) e.set(x, y, C.mul(c, 0.6)); }
      else if (ring) p.set(x, y, PX.ramp(R, (Math.floor(Math.atan2(top - y, x - cx) * 4) & 1) ? 4 : 2));
    } }
  if (f.crest) { const cx = Math.round(f.crest[0] * d), cy = H - Math.round(f.crest[1] * d);
    for (let y = -4; y <= 4; y++) for (let x = -3; x <= 3; x++) { if (y > 1 && Math.abs(x) > 4 - y) continue; p.set(cx + x, cy + y, Math.abs(x) === 3 || y === -4 || (y > 1 && Math.abs(x) === 4 - y) ? 0xc8962e : 0x24346a); }
    p.set(cx, cy - 1, 0xe8e8f0); p.set(cx - 1, cy, 0xe8e8f0); p.set(cx, cy, 0xe8e8f0); p.set(cx + 1, cy, 0xe8e8f0); p.set(cx + 1, cy - 2, 0xe8e8f0); }
  for (const [x, y, kind, lit] of f.win || []) { PX.opening(p, e, R, Math.round(x * d), H - Math.round(y * d), kind, lit); if (lit) lits.push([x, y + PX.WIN[kind][1] / d / 2]); }
  return Object.assign(PX.tex2(p, e, d), { lits });
};
PX.towerWrap = function (r, hm, f) {
  const d = f.d, W = Math.max(8, Math.round(Math.PI * 2 * r * d)), H = Math.max(4, Math.round(hm * d)), p = new Pix(W, H), e = new Pix(W, H).fill(0), R = f.ramp, lits = [];
  PX.stones(p, R, f.seed || 1, 0, 0, W, H, true);
  for (const by of f.bands || []) { const y = H - Math.round(by * d); p.hl(0, W - 1, y, PX.ramp(R, 5)); p.hl(0, W - 1, y + 1, PX.ramp(R, 0)); }
  PX.weather(p, R, f, true); PX.ivy(p, f, W, H);
  for (const [a, y, kind, lit] of f.win || []) { const cx = Math.round(((a / (Math.PI * 2)) % 1 + 1) % 1 * W); PX.opening(p, e, R, cx, H - Math.round(y * d), kind, lit); if (lit) lits.push([a, y + PX.WIN[kind][1] / d / 2]); }
  return Object.assign(PX.tex2(p, e, d), { lits });
};
PX.coneWrap = function (r, h, R, d, seed) {   // tile courses round a cone: ribs every 3 px, a highlight row per course, the eave in shadow
  const W = Math.max(8, Math.round(Math.PI * 2 * r * d)), H = Math.max(6, Math.round(Math.hypot(r, h) * d)), p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const row = y >> 1, off = row & 1, lip = (y & 1) === 1, gap = (x + off * 2) % 4 === 0;
    let c = lip ? 2 : 3; if (lip && gap) c = 1; if (!lip && gap && hash(x, row, seed) < 0.5) c = 2; if (!lip && (x + off * 2) % 4 === 2 && hash(x, row, seed + 2) < 0.4) c = 4;
    if (hash(x >> 2, row, seed + 1) < 0.06) c -= 1; if (y < 2) c = 2; if (y >= H - 2) c = y === H - 1 ? 0 : 1;
    p.set(x, y, PX.ramp(R, c)); }
  const t = p.tex({ aniso: 4 }); t.userData.d = d; return t;
};
PX.stoneTile = function (R, d, seed) { const p = new Pix(48, 24); PX.stones(p, R, seed, 0, 0, 48, 24, true); const t = p.tex({ repeat: true, aniso: 4 }); t.userData.d = d; return t; };
PX.tileRoof = function (R, d, seed) { const p = new Pix(24, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const row = y >> 1, off = row & 1, lip = (y & 1) === 0, gap = (x + off * 2) % 4 === 0;   // v runs up the slope: the lip is the lower row
    let c = lip ? 2 : 3; if (lip && gap) c = 1; if (!lip && (x + off * 2) % 4 === 2 && hash(x, row, seed + 2) < 0.4) c = 4; if (hash(x >> 2, row, seed) < 0.06) c -= 1; p.set(x, y, PX.ramp(R, c)); }
  const t = p.tex({ repeat: true, aniso: 4 }); t.userData.d = d; return t; };
/* build them: the painted face on the +z side of a box (the rest in the repeatable stone), glows on the lit windows */
BUILD.facade = function (x0, x1, y0, y1, z0, z1, f) {
  const F = PX.facade(x1 - x0, y1 - y0, f), m = BUILD.std(F.map, { emap: F.emap, emis: 0xffffff, ei: f.ei || 2.4, rough: 0.9 });
  const me = BUILD.box(x0, x1, y0, y1, z0, z1, f.tile, { front: m, cast: f.cast });
  for (const [x, y] of F.lits) BUILD.glow(x0 + x, y0 + y, z1 + 0.5, f.glow || 2.6, 0xffa850, 0.16);
  return me;
};
BUILD.tower = function (x, z, y0, y1, r, f) {
  const F = PX.towerWrap(r, y1 - y0, f), m = BUILD.std(F.map, { emap: F.emap, emis: 0xffffff, ei: f.ei || 2.4, rough: 0.9 });
  const me = BUILD.cyl(x, z, y0, y1, r, F.map, { wrap: true, mat: m, top: f.batter, seg: f.seg || 24 });
  for (const [a, y] of F.lits) BUILD.glow(x + Math.sin(a) * (r + 0.4), y0 + y, z + Math.cos(a) * (r + 0.4), f.glow || 2.4, 0xffa850, 0.16);
  return me;
};
BUILD.coneRoof = function (x, z, y, r, h, R, d, o) { o = o || {}; const t = PX.coneWrap(r, h, R, d, o.seed || 7); return BUILD.cone(x, z, y, r, h, t, Object.assign({ wrap: true, seg: o.seg || 24 }, o)); };
