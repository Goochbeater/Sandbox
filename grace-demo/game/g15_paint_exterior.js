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
