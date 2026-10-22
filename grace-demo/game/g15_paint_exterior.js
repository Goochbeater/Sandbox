/* EXTERIOR TEXTURES — the Swan Fortress seen from the hill: wet stone, red tile, a storm sky, the army of the siege,
   and the wood where the bargain was made. */
PX.def('stoneWet', () => {
  const p = new Pix(64, 64), cols = [0x5e5a58, 0x56524f, 0x66615c, 0x4e4b4a, 0x5a5552];
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const row = Math.floor(y / 10), off = (row % 2) * 9, bx = Math.floor((x + off) / 18);
    const mort = (x + off) % 18 === 17 || y % 10 === 9; let c = cols[Math.floor(hash(bx, row, 201) * 5)];
    if (mort) c = 0x33302f; else { c = C.mul(c, 0.9 + 0.18 * noise1(x * 0.5 + y * 0.3, 202)); if (y % 10 === 0) c = C.mul(c, 1.08); if (hash(x >> 1, y >> 1, 203) < 0.05) c = 0x3e4a3a; }
    const wet = smooth(0.4, 1, noise1(x * 0.08 + y * 0.02, 204)) * 0.25; p.set(x, y, C.mix(c, 0x2a3040, wet)); }
  return p.tex({ repeat: true });
});
PX.def('rockFace', () => { const p = new Pix(64, 64); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const n = noise1(x * 0.21 + noise1(y * 0.17, 205) * 4, 206) * 0.6 + noise1(x * 0.6 + y * 0.6, 207) * 0.4;
  p.set(x, y, C.ramp([0x2a2826, 0x3a3632, 0x4a4540, 0x5a544c, 0x3a4a34], n * 0.99)); } return p.tex({ repeat: true }); });
PX.def('grassWet', () => {
  const p = new Pix(64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const n = noise1(x * 0.15 + y * 0.09, 208), pud = noise1(x * 0.05 + 3, 209) * noise1(y * 0.07 + 7, 210);
    let c = C.ramp([0x1e2a1a, 0x26341e, 0x2e3e22, 0x3a4a28], clamp(n + (hash(x, y, 211) - 0.5) * 0.3, 0, 0.99));
    if (pud > 0.42) c = pud > 0.5 ? 0x8a98b0 : 0x4a5466; p.set(x, y, c); }
  return p.tex({ repeat: true, aniso: 4 });
});
PX.def('mud', () => { const p = new Pix(32, 32); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const n = noise1(x * 0.3 + y * 0.2, 212); p.set(x, y, n > 0.72 ? 0x7a8498 : C.ramp([0x2a2018, 0x3a2c20, 0x4a3828], n)); } return p.tex({ repeat: true }); });
PX.def('roofTile', () => { const p = new Pix(32, 32); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const row = Math.floor(y / 4), u = (x + (row % 2) * 3) % 6;
  p.set(x, y, C.mul(u === 0 ? 0x4a1410 : y % 4 === 3 ? 0x5a1a14 : 0x8a2a1e, 0.85 + 0.25 * hash(Math.floor((x + (row % 2) * 3) / 6), row, 213))); } return p.tex({ repeat: true }); });
PX.def('windowLit', () => { const p = new Pix(8, 14); for (let y = 0; y < 14; y++) for (let x = 0; x < 8; x++) { const top = y < 4 ? Math.hypot(x - 3.5, y - 4) < 4 : true; if (!top) continue;
  p.set(x, y, x === 0 || x === 7 || y > 12 ? 0x2a2420 : x === 3 || x === 4 || y === 8 ? 0x5a3a1a : C.mix(0xffd890, 0xff9a3a, y / 14)); } return p.tex(); });
PX.def('gateArch', () => {
  const W = 96, H = 144, p = new Pix(W, H), cx = 47.5, top = 48;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const inA = y >= top || Math.hypot(x - cx, y - top) <= 47; if (!inA) continue;
    const fr = y >= top ? Math.min(x, W - 1 - x) < 8 : Math.hypot(x - cx, y - top) > 40;
    if (fr) { const seg = y < top ? Math.floor((Math.atan2(y - top, x - cx) + Math.PI) / 0.2) : Math.floor(y / 10); p.set(x, y, C.mul([0x6a6460, 0x5e5854, 0x726c66][seg % 3], 0.95)); continue; }
    const grid = (x % 8 === 3 || y % 9 === 4); p.set(x, y, grid && y < H - 30 ? 0x2a2624 : C.mix(0x1a1210, 0x5a3418, smooth(0.3, 1, y / H) * 0.6)); }
  return p.tex();
});
PX.def('skyStorm', () => { const p = new Pix(16, 96); for (let y = 0; y < 96; y++) for (let x = 0; x < 16; x++) { const t = y / 96; p.set(x, y, C.mix(C.mix(0x10141e, 0x26304a, smooth(0, 0.6, t)), 0x4a4a5a, smooth(0.6, 1, t))); }
  const t = p.tex({ mip: false }); t.magFilter = THREE.LinearFilter; return t; });
PX.def('skyDawn', () => { const p = new Pix(16, 96); for (let y = 0; y < 96; y++) for (let x = 0; x < 16; x++) { const t = y / 96; p.set(x, y, C.mix(C.mix(0x3a4458, 0x8a8a98, smooth(0, 0.65, t)), 0xd8a890, smooth(0.6, 1, t))); }
  const t = p.tex({ mip: false }); t.magFilter = THREE.LinearFilter; return t; });
const cloudSheet = (seed, cols, dens) => () => {   // a seamless band of cloud: big shapes from a loop in noise space, soft shading with a 2-level dither
  const W = 384, H = 112, p = new Pix(W, H), ramp = (k) => { const f = k * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(f)); return C.mix(cols[i], cols[i + 1], f - i); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = x / W * Math.PI * 2;
    const n = (noise1(Math.cos(u) * 3 + 10 + y * 0.025, seed) * 0.5 + noise1(Math.sin(u) * 6 + y * 0.06 + 40, seed + 1) * 0.35 + noise1(x * 0.12 + y * 0.18, seed + 2) * 0.15) - (Math.abs(y - H * 0.55) / H) * 0.9;
    if (n < dens + (hash(x, y, seed + 3) - 0.5) * 0.012) continue; const k = clamp((n - dens) * 3.2 + ((x + y) % 2) * 0.03, 0, 1); p.set(x, y, ramp(k * (0.55 + 0.45 * (1 - y / H)))); }
  return p.tex({ repeat: true });
};
PX.def('cloudsA', cloudSheet(214, [0x161a26, 0x1e2434, 0x283044, 0x343c52], 0.18));
PX.def('cloudsB', cloudSheet(218, [0x2a3042, 0x3a4256, 0x4a526a, 0x5a6278], 0.24));
PX.def('cloudsDawn', cloudSheet(222, [0x5a5a6a, 0x7a7484, 0x9a8a92, 0xc8a8a0], 0.26));
PX.def('mountains', () => {
  const W = 256, H = 72, p = new Pix(W, H);
  for (let x = 0; x < W; x++) { const r1 = 18 + (noise1(x * 0.04, 225) * 0.7 + noise1(x * 0.12, 226) * 0.3) * 40, r2 = 40 + (noise1(x * 0.05, 227) * 0.6 + noise1(x * 0.18, 228) * 0.4) * 26;
    for (let y = Math.floor(r1); y < H; y++) p.set(x, y, y < r1 + 1 ? 0x5a6278 : C.mix(0x3a4256, 0x2a3040, (y - r1) / 30));
    for (let y = Math.floor(r2); y < H; y++) p.set(x, y, y < r2 + 1 ? 0x3a4256 : 0x1c2030); }
  return p.tex();
});
PX.def('pine', () => {
  const W = 40, H = 112, p = new Pix(W, H), R1 = rng(229);
  p.rect(18, 90, 4, 22, 0x2a1c12); p.vl(18, 90, 111, 0x3a2818);
  for (let y = 4; y < 96; y++) { const t = (y - 4) / 92, tier = (y - 4) % 14 / 14, hw = (2 + t * 17) * (0.55 + 0.45 * tier); for (let x = 0; x < W; x++) { const d = Math.abs(x + 0.5 - 20); if (d > hw) continue;
    p.set(x, y, C.ramp([0x0e1a14, 0x14241a, 0x1c3022, 0x28402c], clamp(0.4 + (20 - x) / 40 + (R1() - 0.5) * 0.4 - tier * 0.2, 0, 0.999))); } }
  return p.outline(null, 0.6).tex();
});
PX.def('deadTree', () => {
  const W = 60, H = 100, p = new Pix(W, H);
  const br = (x, y, a, len, w) => { for (let i = 0; i < len; i++) { const xx = x + Math.cos(a) * i, yy = y - Math.sin(a) * i; for (let k = -w; k <= w; k++) p.set(xx + k, yy, i % 5 === 0 ? 0x2a2018 : 0x1a140e); }
    if (len > 8) { br(x + Math.cos(a) * len * 0.6, y - Math.sin(a) * len * 0.6, a + 0.6, len * 0.55, Math.max(0, w - 1)); br(x + Math.cos(a) * len, y - Math.sin(a) * len, a - 0.5, len * 0.5, Math.max(0, w - 1)); } };
  br(30, 99, Math.PI / 2, 50, 3); br(30, 70, Math.PI * 0.8, 22, 1); br(30, 62, Math.PI * 0.25, 20, 1);
  return p.tex();
});
PX.def('tuft', () => { const p = new Pix(24, 14), R1 = rng(230); for (let i = 0; i < 26; i++) { const x0 = 2 + R1() * 20, h = 5 + R1() * 9, lean = (R1() - 0.5) * 4, c = C.ramp([0x1a2616, 0x24341c, 0x324624, 0x44582c], R1());
  for (let k = 0; k < h; k++) p.set(x0 + lean * k / h, 13 - k, c); } return p.tex(); });
PX.def('rock', () => { const p = new Pix(40, 22); for (let y = 0; y < 22; y++) for (let x = 0; x < 40; x++) { const top = 4 + Math.abs(x - 18) * 0.35 + noise1(x * 0.3, 231) * 5; if (y < top) continue;
  p.set(x, y, C.ramp([0x22201e, 0x34302c, 0x46413a, 0x5a544a], clamp(0.75 - (y - top) / 22 + (hash(x >> 1, y >> 1, 232) - 0.5) * 0.3 - x / 120, 0, 0.999))); } return p.outline(null, 0.6).tex(); });
PX.def('crow', () => {   // 3 frames: wings up, level, down
  const W = 12, H = 8, n = 3, p = new Pix(W * n, H);
  for (let f = 0; f < n; f++) { const o = f * W, wy = [1, 3, 6][f];
    p.rect(o + 4, 3, 4, 2, 0x0c0c10); p.set(o + 8, 3, 0x0c0c10); p.set(o + 9, 3, 0x3a3020);
    p.line(o + 5, 3, o + 1, wy, 0x0c0c10); p.line(o + 6, 3, o + 2, wy, 0x14141a); p.line(o + 6, 4, o + 10, wy, 0x0c0c10); p.set(o + 3, 4, 0x0c0c10); p.set(o + 2, 5, 0x0c0c10); }
  const t = p.tex({ mip: false }); t.userData.n = n; return t;
});
PX.def('flag', () => { const W = 30, H = 18, p = new Pix(W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (x > W - 4 && Math.abs(y - 9) < (x - (W - 4)) * 1.6) continue;
  p.set(x, y, x < 2 ? 0x2a2018 : C.mix(0xb02420, 0x6a1010, y / H)); } p.ell(13, 9, 5, 3, 0xece8dc); for (let i = 0; i < 5; i++) p.set(16 + (i > 2 ? 1 : 0), 8 - i, 0xece8dc); return p.tex(); });
/* the Margrave's army: two frames of a crowd of spearmen, shields and helms catching the firelight */
PX.def('army', () => {
  const W = 200, H = 76, n = 2, p = new Pix(W * n, H), R1 = rng(233), men = [];
  for (let i = 0; i < 34; i++) men.push([R1() * (W - 10) + 5, 20 + R1() * 40, R1()]);
  men.sort((a, b) => a[1] - b[1]);
  for (let f = 0; f < n; f++) for (const [mx, my, s] of men) { const o = f * W, bob = (f + Math.floor(s * 3)) % 2, x = Math.floor(o + mx), y = Math.floor(my) - bob, dark = 0x101014;
    p.rect(x - 3, y - 18, 6, 18, dark); p.rect(x - 2, y - 24, 5, 6, 0x1a1a20); p.hl(x - 3, x + 3, y - 24, 0x6a6a72); p.set(x - 1, y - 21, 0x3a2a20);
    p.vl(x + 5, y - 40 + bob, y + 2, 0x2a2018); p.set(x + 5, y - 41 + bob, 0x9aa0aa); p.set(x + 5, y - 42 + bob, 0xc8ccd4);
    if (s > 0.4) { p.rect(x - 7, y - 16, 5, 9, 0x3a1410); p.vl(x - 7, y - 16, y - 8, 0xc8883a); }
    p.rect(x - 3, y, 2, 10, dark); p.rect(x + 1, y, 2, 10, dark); }
  for (let y = 60; y < H; y++) for (let x = 0; x < W * n; x++) if (p.a(x, y)) p.shade(x, y, 0.7);
  const t = p.tex({ mip: false }); t.userData.n = n; return t;
});
PX.def('ladder', () => { const p = new Pix(14, 140); for (let y = 0; y < 140; y++) { p.set(1, y, 0x3a2614); p.set(2, y, 0x5a3a20); p.set(11, y, 0x3a2614); p.set(12, y, 0x5a3a20); if (y % 10 === 4) p.hl(1, 12, y, 0x4a2e18); } return p.tex(); });
PX.def('tent', () => { const W = 48, H = 30, p = new Pix(W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const hw = (y / H) * 24; if (Math.abs(x + 0.5 - 24) > hw) continue;
  p.set(x, y, Math.abs(x + 0.5 - 24) < 2 && y > 14 ? 0x1a1410 : C.mix(0xb8ae98, 0x6a6258, Math.abs(x - 24) / 24 + (x % 7 === 0 ? 0.1 : 0))); } p.vl(24, 0, 2, 0x3a2a1a); return p.outline(null, 0.7).tex(); });
PX.def('smokeSoft', () => { const cv = document.createElement('canvas'), s = 64; cv.width = cv.height = s; const g = cv.getContext('2d'), r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,0.8)'); r.addColorStop(0.5, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; });
/* ---------------------------------------------------------------- the fortress as a diorama: palettes for the
   architecture painters (engine/e12_arch.js), and the land, sky and ridges painted at the title view's pixel scale */
const RAMP = {
  stone: [0x2a2430, 0x4a4048, 0x6a5e60, 0x8a7c76, 0xa8988a, 0xc4b4a0],     // the curtain wall: warm grey, moonlit
  inner: [0x26222c, 0x403a44, 0x5a5258, 0x766c6c, 0x908478, 0xa89a8a],     // buildings inside the walls
  keep: [0x2e2834, 0x4e4650, 0x726868, 0x948a82, 0xb2a696, 0xccc0aa],      // the keep, paler and newer
  red: [0x2a0e14, 0x4a1418, 0x6e1e1c, 0x922c22, 0xb2402c, 0xcc5a3a],       // clay roofs
  slate: [0x14161e, 0x22283a, 0x323a52, 0x46506a, 0x5c6884, 0x7480a0],     // slate roofs
  rock: [0x16141c, 0x24202a, 0x352f38, 0x48404a, 0x5c525a, 0x726668],
};
const dens = (t, d, tint) => { t.userData.d = d; if (tint !== undefined) t.userData.tint = tint; return t; };
PX.def('cragPix', () => {   // the crag as pixel-art rock: boulder cells with a lit upper-left rim, a shadowed lower-right, dark cracks between, moss on top
  const W = 64, H = 64, p = new Pix(W, H), R = RAMP.rock, seeds = [];
  for (let i = 0; i < 16; i++) seeds.push([hash(i, 1, 260) * W, hash(i, 2, 260) * H * 1.0, Math.floor(hash(i, 3, 260) * 2)]);
  const near = (x, y) => { let a = 1e9, b = 1e9, ai = 0; for (let i = 0; i < seeds.length; i++) for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
    const dx = (x - seeds[i][0] - ox) * 1.0, dy = (y - seeds[i][1] - oy) * 1.5, d = Math.hypot(dx, dy); if (d < a) { b = a; a = d; ai = i; } else if (d < b) b = d; } return { a, b, i: ai }; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = near(x + 0.5, y + 0.5), s0 = seeds[n.i], edge = n.b - n.a;
    let c = 2 + s0[2]; const up = near(x + 0.5, y - 1.5).i !== n.i, left = near(x - 1.5, y + 0.5).i !== n.i, down = near(x + 0.5, y + 2.5).i !== n.i, right = near(x + 2.5, y + 0.5).i !== n.i;
    if (up || left) c = 4 + (up && hash(x, y, 261) < 0.3 ? 1 : 0); else if (down || right) c = 1;
    if (edge < 1.1) c = 0; else if (!up && !left && PX.dith(x, y) < 0.25 && c > 1) c -= 1;
    p.set(x, y, PX.ramp(R, c)); if (up && hash(x, y, 262) < 0.35) p.set(x, y, hash(x, y, 263) < 0.5 ? 0x34462a : 0x26341e); }
  return dens(p.tex({ repeat: true, aniso: 4 }), 5); });
PX.def('turfPix', () => { const p = new Pix(32, 32), G = [0x101a14, 0x18261a, 0x203222, 0x2c402a, 0x3a5034];   // wet turf: dark field, lighter blades in little clusters
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const n = noise1(x * 0.2 + y * 0.13, 265); let c = n > 0.6 ? 2 : 1; if (PX.dith(x, y) < (n - 0.4) * 0.8) c++;
    if (hash(x, y, 266) < 0.06) c = 3; if (hash(x, y, 267) < 0.015) c = 4; p.set(x, y, G[c]); }
  return dens(p.tex({ repeat: true, aniso: 4 }), 5); });
PX.def('meadowPix', () => { const p = new Pix(64, 64), G = [0x0e1610, 0x162218, 0x1e2e1e, 0x283c26, 0x34482e];   // the meadow under the rain: grass with puddles holding the sky
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const n = noise1(x * 0.11 + y * 0.07, 268), pud = noise1(x * 0.13 + 3, 269) * noise1(y * 0.21 + 7, 270);
    let c = G[n > 0.55 ? 2 : 1]; if (PX.dith(x, y) < (n - 0.35) * 0.7) c = G[3]; if (hash(x, y, 271) < 0.03) c = G[4];
    p.set(x, y, c); }
  return dens(p.tex({ repeat: true, aniso: 4 }), 5); });
PX.def('roadPix', () => { const p = new Pix(24, 24), M = [0x1e1814, 0x2a2018, 0x382a20, 0x46362a];
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const n = noise1(x * 0.3 + y * 0.25, 272), rut = (x % 12 === 3 || x % 12 === 8); let c = M[1 + (PX.dith(x, y) < n * 0.8 ? 1 : 0)];
    if (rut) c = M[0]; if (n > 0.84) c = 0x5a6278; if (hash(x, y, 273) < 0.04) c = M[3]; p.set(x, y, c); }
  return dens(p.tex({ repeat: true }), 5); });
/* the night sky, painted once (not tiled): bands dithered into each other, a moon behind thinning cloud, storm cloud
   masses with moonlit rims; brighter low down so the fortress stands out against it */
PX.def('skyNight', () => {
  const W = 512, H = 220, p = new Pix(W, H), S = [0x0a0c16, 0x10141f, 0x161c2c, 0x1e2639, 0x283248, 0x343f58, 0x434e68, 0x56607a, 0x6a7088], mx = W * 0.64, my = H * 0.26;
  const cloud = (x, y) => { const n = noise1(x * 0.011 + noise1(y * 0.03, 274) * 1.5, 275) * 0.65 + noise1(x * 0.04 + y * 0.06, 276) * 0.35; return n - (0.62 - 0.3 * Math.pow(Math.abs(y / H - 0.42) * 2, 2)); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = Math.pow(y / H, 1.3) * (S.length - 1.01), md = Math.hypot((x - mx) * 0.8, y - my), halo = Math.max(0, 1 - md / 70) * 3.2, f = t + halo;
    let c = S[clamp(Math.floor(f) + (PX.dith(x, y) < f % 1 ? 1 : 0), 0, S.length - 1)];
    const cl = cloud(x, y); if (cl > 0) { const above = cloud(x, y - 2) <= 0, lit = Math.max(0, 1 - md / 150);
      const C2 = [0x0e1220, 0x161c2c, 0x202940, 0x2e3a56, 0x4a5878, 0x7a88a8]; let i = cl > 0.12 ? 0 : cl > 0.05 ? 1 : 2; if (y > H * 0.55) i++; if (above) i = 3 + (lit > 0.4 ? 2 : lit > 0.1 ? 1 : 0);
      else if (cloud(x, y - 4) <= 0 && PX.dith(x, y) < 0.5 + lit) i = Math.max(i, 3); c = C2[i]; }
    if (md < 9) c = md < 7.5 ? (hash(x >> 1, y >> 1, 277) < 0.15 ? 0xb8c0cc : 0xe4e8ee) : 0xa8b0c4;   // the moon
    p.set(x, y, c); }
  return p.tex({ mip: false }); });
PX.def('cloudBand', () => {   // a drifting strip of ragged low cloud, transparent between the rags
  const W = 256, H = 36, p = new Pix(W, H), C2 = [0x161c2c, 0x202940, 0x2e3a56, 0x46547a];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = x / W * Math.PI * 2, n = noise1(Math.cos(u) * 2 + 9 + y * 0.06, 278) * 0.6 + noise1(Math.sin(u) * 5 + y * 0.15, 279) * 0.4 - Math.abs(y / H - 0.5) * 0.9;
    if (n < 0.25) continue; const top = (noise1(Math.cos(u) * 2 + 9 + (y - 2) * 0.06, 278) * 0.6 + noise1(Math.sin(u) * 5 + (y - 2) * 0.15, 279) * 0.4 - Math.abs((y - 2) / H - 0.5) * 0.9) < 0.25;
    p.set(x, y, C2[top ? 3 : n > 0.4 ? 0 : n > 0.32 ? 1 : 2]); }
  return p.tex({ repeat: true, mip: false }); });
PX.ridge = (W, H, seed, base, top, lit, trees) => { const p = new Pix(W, H);   // a mountain ridge: moonlit on the slopes facing left, a band of forest along the foot
  for (let x = 0; x < W; x++) { const r = H * (0.15 + 0.55 * (noise1(x * 0.012, seed) * 0.7 + noise1(x * 0.05, seed + 1) * 0.3)), rn = H * (0.15 + 0.55 * (noise1((x + 1) * 0.012, seed) * 0.7 + noise1((x + 1) * 0.05, seed + 1) * 0.3));
    for (let y = Math.floor(r); y < H; y++) { const face = rn < r && y < r + (H - r) * 0.5; p.set(x, y, y < r + 1 ? top : face && PX.dith(x, y) < 0.6 ? lit : C.mix(base, C.mul(base, 0.7), (y - r) / (H - r))); } }
  if (trees) for (let x = 0; x < W; x += 2 + Math.floor(hash(x, 1, seed) * 3)) { const h = 3 + Math.floor(hash(x, 2, seed) * 4), y0 = H - 6 - Math.floor(hash(x, 3, seed) * 4); for (let j = 0; j < h; j++) for (let i = -Math.floor(j / 2); i <= Math.floor(j / 2); i++) p.set(x + i, y0 - h + j, trees); for (let y = y0; y < H; y++) p.set(x, y, trees); }
  return p.tex({ mip: false }); };
PX.def('ridgeFar', () => PX.ridge(512, 64, 280, 0x2e3850, 0x4e5a74, 0x3e4862, 0));
PX.def('ridgeNear', () => PX.ridge(512, 72, 283, 0x1a2030, 0x323c54, 0x262e42, 0x111620));
PX.def('forestFloor', () => { const p = new Pix(64, 64), G = [0x0e0e0a, 0x16160e, 0x1e1c12, 0x262418, 0x2e2a1c];   // the Wood at close range: needles, leaf litter, moss, a few stones
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const n = noise1(x * 0.09 + y * 0.07, 290); let c = G[1 + (PX.dith(x, y) < n ? 1 : 0)]; if (noise1(x * 0.05 + 4, 291) * noise1(y * 0.06 + 2, 292) > 0.42) c = PX.dith(x, y) < 0.6 ? 0x1e2a16 : 0x26341c; p.set(x, y, c); }
  for (let i = 0; i < 140; i++) { const x = hash(i, 1, 293) * 64, y = hash(i, 2, 293) * 64, a = hash(i, 3, 293) * 3.14, l = 2 + hash(i, 4, 293) * 3; for (let k = 0; k < l; k++) p.wset(Math.round(x + Math.cos(a) * k), Math.round(y + Math.sin(a) * k), hash(i, 5, 293) < 0.5 ? 0x4a3a22 : 0x3a2e1a); }
  for (let i = 0; i < 12; i++) { const x = hash(i, 6, 293) * 64, y = hash(i, 7, 293) * 64; p.wset(x, y, 0x4a4644); p.wset(x + 1, y, 0x3a3634); p.wset(x, y - 1, 0x5a5654); }
  return p.tex({ repeat: true, aniso: 4 }); });
PX.def('slit', () => { const p = new Pix(3, 9); for (let y = 0; y < 9; y++) for (let x = 0; x < 3; x++) p.set(x, y, x === 1 && y > 0 && y < 8 ? 0x0a0808 : 0x4a4642); return dens(p.tex(), 6); });
PX.def('winCastle', () => { const p = new Pix(6, 10);   // a lit lancet window, warm glass in a dark reveal
  for (let y = 0; y < 10; y++) for (let x = 0; x < 6; x++) { if (y < 2 && Math.hypot(x - 2.5, y - 2.5) > 2.9) continue; const edge = x === 0 || x === 5 || y === 9;
    p.set(x, y, edge ? 0x1e1a18 : x === 2 || x === 3 ? (y === 5 ? 0x5a3a1a : C.mix(0xffe0a0, 0xffa040, y / 10)) : y === 5 ? 0x5a3a1a : C.mix(0xffd890, 0xff9030, y / 10)); }
  return dens(p.tex(), 5); });
PX.def('gateDeep', () => { const W = 16, H = 22, p = new Pix(W, H);   // the gate passage: portcullis half raised, torchlight beyond
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (y < 8 && Math.hypot(x - 7.5, y - 8) > 8) continue; const edge = y < 8 ? Math.hypot(x - 7.5, y - 8) > 6.6 : x < 2 || x > 13;
    let c = edge ? C.mul(0x6e6a66, 0.8 + 0.3 * hash(x >> 1, y >> 1, 248)) : C.mix(0x0c0806, 0x6a3a14, smooth(4, 22, y) * 0.8);
    if (!edge && y < 13 && (x % 3 === 0 || y % 3 === 0)) c = 0x1a1612; p.set(x, y, c); }
  return dens(p.tex(), 4); });
PX.def('hoarding', () => { const p = new Pix(32, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) { const pl = Math.floor(x / 4); p.set(x, y, x % 4 === 0 ? 0x1a0e08 : C.mul(0x4a2e1c, 0.8 + 0.3 * noise1(y * 0.4 + pl * 7, 249))); }
  return dens(p.tex({ repeat: true }), 10); });
PX.def('swanBanner', () => { const W = 10, H = 26, p = new Pix(W, H);   // a long hanging banner: blue field, white swan, gold edge, swallowtail foot
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (y > H - 4 && Math.abs(x - 4.5) < (y - (H - 4)) * 1.3) continue; p.set(x, y, x === 0 || x === W - 1 ? 0xc8962e : C.mix(0x2a3a7a, 0x1a2450, x / W)); }
  p.ell(4.5, 11, 2.5, 1.5, 0xe8e8f0); p.vl(6, 6, 10, 0xe8e8f0); p.set(5, 6, 0xe8e8f0); p.set(4, 6, 0xe0902a); p.hl(1, 8, 1, 0xc8962e);
  return dens(p.tex(), 6); });
