/* PIXEL — the engine's pixel-art painter. Every texture is painted in code at load time at 32 texels per metre (PX.D) so
   walls, furniture and characters share one pixel grid. Colours are 0xRRGGBB; y = 0 is the top row.
   Rooms register painters with PX.def(name, fn); PX.T.<name> paints on first use and caches the texture. */
const PX = { D: 32, paint: {}, cache: {} };
PX.def = function (name, fn) { PX.paint[name] = fn; };
PX.T = new Proxy(PX.cache, { get: (o, k) => { if (!(k in o)) { if (!PX.paint[k]) throw new Error('no texture painter: ' + String(k)); o[k] = PX.paint[k](); } return o[k]; } });
class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c, a) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 4; this.d[i] = (c >> 16) & 255; this.d[i + 1] = (c >> 8) & 255; this.d[i + 2] = c & 255; this.d[i + 3] = a === undefined ? 255 : a; }
  wset(x, y, c) { this.set(((x % this.w) + this.w) % this.w, ((y % this.h) + this.h) % this.h, c); }
  get(x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; const i = (y * this.w + x) * 4; return (this.d[i] << 16) | (this.d[i + 1] << 8) | this.d[i + 2]; }
  a(x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y * this.w + x) * 4 + 3]; }
  fill(c) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, c); return this; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  hl(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  vl(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.set(x, y, c); }
  line(x0, y0, x1, y1, c) { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
  disc(cx, cy, r, c) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) this.set(x, y, c); }
  ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const u = (x - cx) / rx, v = (y - cy) / ry; if (u * u + v * v <= 1) this.set(x, y, c); } }
  /* multiply brightness where painted */
  shade(x, y, k) { if (!this.a(x, y)) return; this.set(x, y, C.mul(this.get(x, y), k), this.a(x, y)); }
  jitter(amt, seed) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.a(x, y)) this.set(x, y, C.mul(this.get(x, y), 1 + (hash(x, y, seed) - 0.5) * 2 * amt), this.a(x, y)); return this; }
  /* 1 px darker rim where painted pixels meet transparency (sprites read better against busy walls) */
  outline(c, k) { const m = []; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.a(x, y) && (!this.a(x - 1, y) || !this.a(x + 1, y) || !this.a(x, y - 1) || !this.a(x, y + 1))) m.push([x, y]);
    for (const [x, y] of m) this.set(x, y, c === null ? C.mul(this.get(x, y), k || 0.6) : c); return this; }
  tex(o) {
    o = o || {}; const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    cv.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
    t.minFilter = o.mip === false ? THREE.NearestFilter : THREE.NearestMipmapLinearFilter; t.generateMipmaps = o.mip !== false;
    if (o.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = o.aniso || 1;
    t.userData.w = this.w; t.userData.h = this.h; return t;
  }
}
const C = {
  rgb: (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255],
  hex: (r, g, b) => (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255),
  mul: (c, k) => { const [r, g, b] = C.rgb(c); return C.hex(r * k, g * k, b * k); },
  mix: (a, b, t) => { const A = C.rgb(a), B = C.rgb(b); return C.hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); },
  ramp: (cols, t) => cols[clamp(Math.floor(t * cols.length), 0, cols.length - 1)],
};
/* ---------------------------------------------------------------- generic painters, shared by every room */
PX.stoneCols = [0xd8c9a8, 0xcfbf9c, 0xe0d2b2, 0xc8b693, 0xd3c29f];
PX.brickAt = function (p, x, y, ox) {   // returns true if x,y is mortar
  const row = Math.floor(y / 4), bx = Math.floor((x + (row % 2) * 4 + (ox || 0)) / 8);
  const mx = (x + (row % 2) * 4 + (ox || 0)) % 8 === 7, my = y % 4 === 3;
  if (mx || my) { p.set(x, y, 0xa08c6c); return; }
  let c = PX.stoneCols[Math.floor(hash(bx, row, 11) * 5)];
  if (y % 4 === 0) c = C.mul(c, 1.06); if ((x + (row % 2) * 4 + (ox || 0)) % 8 === 6 && y % 4 === 2) c = C.mul(c, 0.9);
  if (hash(x, y, 12) < 0.04) c = C.mul(c, 0.88);
  p.set(x, y, c);
};
PX.rug = function (w, h, pal, seed) {
  const p = new Pix(w, h);
  for (let y = 0; y < h; y++) for (let x = 3; x < w - 3; x++) {
    const bx = Math.min(x - 3, w - 4 - x), by = Math.min(y, h - 1 - y), b = Math.min(bx, by);
    let c = pal.field;
    if (b < 1) c = pal.edge; else if (b < 3) c = pal.gold; else if (b < 7) { const z = ((bx < by ? y : x) + (b % 2)) % 4; c = (b === 4 || b === 5) && z < 2 ? pal.cream : pal.navy; }
    else if (b < 8) c = pal.gold;
    else {
      const u = x - w / 2, v = y - h / 2, period = 22, lu = ((u % period) + period) % period - period / 2, d = Math.abs(lu) + Math.abs(v) * 1.2;
      if (d < 3) c = pal.gold; else if (d < 5) c = pal.cream; else if (d < 8) c = pal.navy; else if (d < 9) c = pal.cream;
      else if ((x + y) % 6 === 0 && hash(x, y, seed) < 0.5) c = C.mul(pal.field, 0.8);
    }
    p.set(x, y, C.mul(c, 0.94 + 0.12 * hash(x, y, seed)));
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < 3; x++) if (y % 2 === 0 && hash(x, y, seed + 1) > 0.25) { p.set(x, y, 0xd8ccb0); p.set(w - 1 - x, y, 0xd8ccb0); }
  return p.tex({ aniso: 4 });
};
PX.curtain = function (pal, tie) {
  const W = 20, H = 84, p = new Pix(W, H);
  for (let y = 0; y < H; y++) {
    const gather = y < tie ? lerp(1, 0.5, Math.pow(y / tie, 1.4)) : lerp(0.5, 0.62, (y - tie) / (H - tie)), hw = W / 2 * gather;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - W / 2) / hw; if (Math.abs(u) > 1) continue;
      if (y > H - 4 && Math.abs(u) > 0.75 - (H - y) * 0.1) continue;
      const fold = 0.5 + 0.5 * Math.sin(u * Math.PI * (3.5 - gather) + 0.6), edge = 1 - Math.pow(Math.abs(u), 4) * 0.4;
      p.set(x, y, C.ramp(pal, fold * edge * (0.85 + 0.15 * (1 - y / H))));
    }
  }
  for (let x = 0; x < W; x++) if (p.a(x, tie)) { p.set(x, tie, 0xd6a23e); p.set(x, tie + 1, 0x9a6a1c); }
  return p.outline(null, 0.72).tex();
};
PX.swag = function (pal) {
  const W = 64, H = 22, p = new Pix(W, H);
  for (let x = 0; x < W; x++) {
    const s = Math.sin(Math.PI * (x + 0.5) / W), bot = 7 + s * 13;
    for (let y = 0; y < H; y++) { if (y > bot) continue; const v = y / bot, band = 0.5 + 0.5 * Math.sin(v * Math.PI * 3.2 - s * 1.2);
      p.set(x, y, C.ramp(pal, band * (0.75 + 0.25 * s) * (v > 0.85 ? 0.75 : 1))); }
  }
  return p.outline(null, 0.7).tex();
};
PX.RED = [0x3a090d, 0x560f15, 0x72161b, 0x8e2022, 0xa8302c, 0xbc4236];
PX.GOLD = [0x5a3910, 0x7e5216, 0xa06c1e, 0xc4892c, 0xdca444, 0xf0c45e];
PX.wood = function (base, seed) {
  const p = new Pix(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const g = noise1(x * 0.9 + noise1(y * 0.15, seed) * 6, seed + 1); p.set(x, y, C.mul(base, 0.8 + 0.38 * g)); }
  return p.jitter(0.03, seed).tex({ repeat: true });
};
PX.drawers = function (w, h, rows, base) {   // a cabinet / chest front: frame, drawer fronts, brass pulls
  const p = new Pix(w, h).fill(C.mul(base, 0.8));
  const rh = (h - 2) / rows;
  for (let r = 0; r < rows; r++) {
    const y0 = Math.round(1 + r * rh), y1 = Math.round(1 + (r + 1) * rh) - 2;
    for (let y = y0; y <= y1; y++) for (let x = 1; x < w - 1; x++) p.set(x, y, C.mul(base, 0.95 + 0.15 * noise1(x * 0.7 + y * 0.2, r + 3)));
    p.hl(1, w - 2, y0, C.mul(base, 1.25)); p.hl(1, w - 2, y1, C.mul(base, 0.55));
    const my = Math.round((y0 + y1) / 2); p.set(Math.floor(w / 2) - 1, my, 0xd6a640); p.set(Math.floor(w / 2), my, 0xb88a2a); if (w > 20) { p.set(4, my, 0xb88a2a); p.set(w - 5, my, 0xb88a2a); }
  }
  return p.tex();
};
PX.frame = function (p, w, h, t) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const b = Math.min(x, y, w - 1 - x, h - 1 - y); if (b >= t) continue;
    p.set(x, y, b === 0 ? 0x6a4614 : b === t - 1 ? 0x8a5c18 : (x + y) % 3 === 0 ? 0xf2cc68 : 0xc8962e); }
};
PX.flameFrames = function (W, H, n, tongues, seed) {
  const p = new Pix(W * n, H);
  const cols = [0x8a1a08, 0xc83a10, 0xf06a18, 0xffa02c, 0xffd250, 0xfff0a8];
  for (let f = 0; f < n; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = 1 - y / H; let heat = 0;
    for (let k = 0; k < tongues; k++) { const cx = (k + 0.5) / tongues * W + (noise1(f * 0.9 + k * 7.3 + y * 0.15, seed + k) - 0.5) * W / tongues * 0.9;
      const hgt = 0.55 + 0.45 * noise1(f * 1.3 + k * 3.1, seed + 20 + k), width = (W / tongues) * 0.55 * Math.pow(Math.max(0, 1 - v / hgt), 0.7);
      heat = Math.max(heat, width > 0 ? 1 - Math.abs(x + 0.5 - cx) / width : 0); }
    heat = heat * (0.75 + 0.5 * noise1(x * 0.7 + f * 2.1 + y * 0.4, seed + 40)) - v * 0.15;
    if (heat > 0.05) p.set(f * W + x, y, C.ramp(cols, clamp(heat * 1.15, 0, 0.999)));
  }
  const t = p.tex({ mip: false }); t.userData.n = n; return t;
};
PX.soft = function (kind) {
  const cv = document.createElement('canvas'), s = 64; cv.width = cv.height = s; const g = cv.getContext('2d');
  if (kind === 'glow') { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); }
  if (kind === 'shaft') { const l = g.createLinearGradient(0, 0, s, 0); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,1)'); l.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'destination-in'; const v = g.createLinearGradient(0, 0, 0, s); v.addColorStop(0, 'rgba(0,0,0,0.9)'); v.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = v; g.fillRect(0, 0, s, s); }
  if (kind === 'mote') { g.fillStyle = '#fff'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
};
/* shared textures every room can use */
PX.def('flame', () => PX.flameFrames(10, 18, 8, 1, 90)); PX.def('fire', () => PX.flameFrames(40, 30, 8, 4, 91));
PX.def('glow', () => PX.soft('glow')); PX.def('shaft', () => PX.soft('shaft')); PX.def('mote', () => PX.soft('mote'));
PX.def('woodDark', () => PX.wood(0x4a2616, 81)); PX.def('woodRed', () => PX.wood(0x5a2a18, 82)); PX.def('woodPost', () => PX.wood(0x3e2012, 83));
