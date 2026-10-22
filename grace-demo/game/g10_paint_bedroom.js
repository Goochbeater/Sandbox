/* BEDROOM TEXTURES — the bedchamber's own pixel art (generic painters live in engine/e02_pixel.js). */
/* ---------------------------------------------------------------- architecture */
PX.wall = function () {
  const p = new Pix(32, 32).fill(0x3b2622);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const a = (x + y) % 16, b = ((x - y) % 16 + 16) % 16;
    if (a === 0 || b === 0) p.set(x, y, 0x2f1d1a);
    else if (a === 1 || b === 1) p.set(x, y, 0x412a25);
  }
  for (const [cx, cy] of [[8, 0], [24, 0], [0, 8], [16, 8], [8, 16], [24, 16], [0, 24], [16, 24], [8, 32], [24, 32], [32, 8], [32, 24]]) {
    for (const [dx, dy, c] of [[0, -2, 0x4a312a], [0, 2, 0x4a312a], [-2, 0, 0x4a312a], [2, 0, 0x4a312a], [0, 0, 0x55382f], [0, -1, 0x432c26], [0, 1, 0x432c26], [-1, 0, 0x432c26], [1, 0, 0x432c26]]) p.wset(cx + dx, cy + dy, c);
  }
  return p.jitter(0.035, 1).tex({ repeat: true });
};
PX.wainscot = function () {
  const p = new Pix(32, 40).fill(0x2e170f);
  p.rect(0, 0, 32, 4, 0x4e2a1b); p.hl(0, 31, 0, 0x6c3e28); p.hl(0, 31, 3, 0x21100a); p.hl(0, 31, 4, 0x1a0c07);
  p.rect(0, 36, 32, 4, 0x2a140c); p.hl(0, 31, 36, 0x48271a);
  for (const x0 of [0]) {
    p.rect(x0 + 3, 7, 26, 26, 0x351b11);
    p.hl(x0 + 3, x0 + 28, 7, 0x4c2a1b); p.vl(x0 + 3, 7, 32, 0x48281a);
    p.hl(x0 + 3, x0 + 28, 32, 0x1c0d07); p.vl(x0 + 28, 7, 32, 0x1f0e08);
    p.rect(x0 + 6, 10, 20, 20, 0x2c160e); p.hl(x0 + 6, x0 + 25, 29, 0x3e2216); p.vl(x0 + 25, 10, 29, 0x3a2014);
  }
  for (let y = 5; y < 36; y++) { p.set(0, y, 0x241109); p.set(1, y, 0x3c2014); }
  return p.jitter(0.04, 2).tex({ repeat: true });
};
PX.floor = function () {
  const p = new Pix(64, 64), tones = [0x3a2016, 0x341c13, 0x40251a, 0x2f1910, 0x382015];
  for (let row = 0; row < 8; row++) {
    let x = Math.floor(hash(row, 7) * 40), k = 0;
    const cuts = []; while (cuts.length < 3) { cuts.push(x % 64); x += 22 + Math.floor(hash(row, k++) * 26); }
    for (let y = row * 8; y < row * 8 + 8; y++) for (let xx = 0; xx < 64; xx++) {
      let seg = 0; for (const c of cuts) if (xx >= c) seg++;
      const base = tones[Math.floor(hash(row, seg, 3) * tones.length)];
      const g = noise1(xx * 0.22 + row * 13.1 + (y - row * 8) * 0.9, row) - 0.5;
      p.set(xx, y, C.mul(base, 1 + g * 0.22));
    }
    p.hl(0, 63, row * 8, 0x1a0d08); p.hl(0, 63, row * 8 + 1, C.mul(tones[row % 5], 1.18));
    for (const c of cuts) p.vl(c, row * 8, row * 8 + 7, 0x1d0f09);
  }
  return p.jitter(0.03, 3).tex({ repeat: true, aniso: 4 });
};
PX.ceiling = function () {
  const p = new Pix(32, 32).fill(0x22130d);
  for (let x = 0; x < 32; x += 8) { p.vl(x, 0, 31, 0x170c08); p.vl(x + 1, 0, 31, 0x2c1a12); }
  return p.jitter(0.05, 4).tex({ repeat: true });
};
PX.beam = function () {
  const p = new Pix(32, 16).fill(0x2e1a10);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) p.set(x, y, C.mul(0x2e1a10, 0.85 + 0.3 * noise1(x * 0.4 + y * 3.7, 5)));
  p.hl(0, 31, 0, 0x45281a); p.hl(0, 31, 15, 0x140a06);
  return p.tex({ repeat: true });
};
PX.brick = function () { const p = new Pix(32, 32); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) PX.brickAt(p, x, y); return p.jitter(0.02, 13).tex({ repeat: true }); };
/* fireplace front: bricks with an arched mouth (transparent) ringed by voussoirs, 2.3 × 1.75 m */
PX.fireFront = function () {
  const W = 74, H = 56, p = new Pix(W, H), cx = 36.5, cy = 38, r = 18;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) PX.brickAt(p, x, y, 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), inside = (y >= cy && Math.abs(dx) < r) || (y < cy && d < r);
    if (inside) { p.set(x, y, 0, 0); continue; }
    const ring = (y >= cy && Math.abs(dx) < r + 3) || (y < cy && d < r + 3);
    if (ring) { const ang = Math.atan2(dy, dx), seg = Math.floor((ang + Math.PI) / (Math.PI / 9));
      const edge = y < cy ? Math.abs(((ang + Math.PI) / (Math.PI / 9)) % 1) < 0.12 : (y - cy) % 5 === 4;
      p.set(x, y, edge ? 0x9a8666 : C.mul(PX.stoneCols[seg % 5], y < cy ? 1.04 : 1.0)); }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p.a(x, y)) { const dx = x - cx, dy = y - cy; const d = y >= cy ? Math.abs(dx) - r : Math.hypot(dx, dy) - r;
    if (d < 6) p.shade(x, y, 0.55 + 0.45 * smooth(0, 6, d)); }   // soot round the mouth
  p.rect(0, 52, W, 4, 0xbcac8a); p.hl(0, W - 1, 52, 0xe6d9bc); p.hl(0, W - 1, 55, 0x8a7858);
  return p.jitter(0.02, 14).tex({ mip: true });
};
PX.soot = function () {
  const p = new Pix(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const row = Math.floor(y / 4), m = (x + (row % 2) * 4) % 8 === 7 || y % 4 === 3;
    p.set(x, y, C.mul(m ? 0x120a07 : 0x2a1c14, 0.7 + 0.6 * hash(x >> 1, y >> 1, 15))); }
  return p.tex({ repeat: true });
};
/* ---------------------------------------------------------------- textiles */
PX.tapestryFolk = function () {
  const W = 48, H = 38, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, (x + y) % 2 ? 0xe6dcc6 : 0xddd2bb);
  for (let x = 0; x < W; x++) for (let y of [2, H - 3]) p.set(x, y, 0xa82a24);
  for (let y = 2; y < H - 2; y++) for (let x of [1, W - 2]) p.set(x, y, 0xa82a24);
  for (let x = 4; x < W - 4; x += 4) { p.set(x, 4, 0x34509a); p.set(x + 1, 5, 0xa82a24); p.set(x, H - 5, 0x34509a); p.set(x + 1, H - 6, 0xa82a24); }
  const tulip = (cx, by) => {
    p.vl(cx, by - 10, by, 0x3f6a2e); p.set(cx - 1, by - 4, 0x4c7d36); p.set(cx - 2, by - 5, 0x4c7d36); p.set(cx + 1, by - 6, 0x4c7d36); p.set(cx + 2, by - 7, 0x4c7d36);
    p.rect(cx - 2, by - 15, 5, 4, 0xbf2f28); p.set(cx - 2, by - 16, 0xbf2f28); p.set(cx, by - 16, 0xbf2f28); p.set(cx + 2, by - 16, 0xbf2f28); p.hl(cx - 1, cx + 1, by - 12, 0x8e1d1a); p.set(cx, by - 14, 0xe0574a);
  };
  tulip(12, 30); tulip(36, 30); tulip(17, 32); tulip(31, 32);
  const fx = 24, fy = 17;
  for (let a = 0; a < 8; a++) { const ang = a * Math.PI / 4; p.disc(fx + Math.cos(ang) * 4, fy + Math.sin(ang) * 4, 1.6, a % 2 ? 0x2c4690 : 0x4362b4); }
  p.disc(fx, fy, 2.2, 0xd9a83a); p.set(fx, fy, 0xb0302a);
  p.vl(fx, fy + 4, 33, 0x3f6a2e); p.set(fx - 1, 27, 0x4c7d36); p.set(fx - 2, 26, 0x4c7d36); p.set(fx + 1, 28, 0x4c7d36); p.set(fx + 2, 27, 0x4c7d36);
  for (let x = -1; x <= W; x++) p.set(x, 0, 0x3a2316);
  for (let x = 2; x < W - 2; x += 2) p.set(x, H - 1, 0xc9bda4);
  return p.tex();
};
PX.tapestryLace = function () {
  const W = 42, H = 40, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, (x + y) % 2 ? 0xebe5da : 0xe2dbcf);
  const q = ['....xx.....', '...x..x....', '...x.......', '....x...xx.', '.xx..x.x..x', 'x..x..x....', 'x.....xxx..', '.x...x...x.', '..xxx.....x', '.........x.', '.....xxxx..'];
  const c = 0xb2342c;
  for (let j = 0; j < 11; j++) for (let i = 0; i < 11; i++) if (q[j][i] === 'x') for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) p.set(21 + sx * (i + 1) - (sx < 0 ? 1 : 0), 20 + sy * (j + 1) - (sy < 0 ? 1 : 0), c);
  for (let x = 2; x < W - 2; x++) { p.set(x, 2, c); p.set(x, H - 3, c); if (x % 3 === 0) { p.set(x, 4, c); p.set(x, H - 5, c); } }
  for (let y = 2; y < H - 2; y++) { p.set(2, y, c); p.set(W - 3, y, c); }
  for (let x = -1; x <= W; x++) p.set(x, 0, 0x3a2316);
  return p.tex();
};
PX.lattice = function () {
  const W = 26, H = 40, p = new Pix(W, H).fill(0x18223e);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = (x + y) % 6, b = ((x - y) % 6 + 6) % 6; if (a === 0 || b === 0) p.set(x, y, 0x4e6aa8); if (a === 0 && b === 0) p.set(x, y, 0xa4bce4); }
  for (let x = 0; x < W; x++) { p.set(x, 0, 0x2c3c66); p.set(x, H - 1, 0x2c3c66); } for (let y = 0; y < H; y++) { p.set(0, y, 0x2c3c66); p.set(W - 1, y, 0x2c3c66); }
  return p.jitter(0.05, 16).tex();
};
/* red drape hung from the ceiling, gathered at a gold tie */
PX.valance = function () {
  const W = 64, H = 13, p = new Pix(W, H);
  for (let x = 0; x < W; x++) {
    p.set(x, 0, 0x3a2216); p.set(x, 1, 0x5a3622);
    for (let y = 2; y < 8; y++) { const m = (Math.abs((x % 8) - 4) + Math.abs(y - 5)) === 2; p.set(x, y, m ? 0xa8682a : (y === 2 ? 0xf2d896 : 0xe2c27e)); }
    const sx = (x % 8) - 3.5, sc = Math.sqrt(Math.max(0, 16 - sx * sx));
    for (let y = 8; y < 8 + sc * 0.9; y++) p.set(x, y, y > 9 + sc * 0.5 ? 0xb88a3a : 0xd6ac58);
    if (x % 8 === 4) { p.set(x, 12, 0xc8922e); p.set(x - 1, 12, 0xa87a26); }
  }
  return p.tex();
};
PX.quilt = function () {
  const p = new Pix(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const a = (x + y) % 8, b = ((x - y) % 8 + 8) % 8, line = a === 0 || b === 0, puff = Math.min(a, 8 - a, b, 8 - b);
    p.set(x, y, line ? 0x9a5418 : C.ramp([0xb46a22, 0xc87a2a, 0xd88c34, 0xe6a044], puff / 4)); }
  return p.jitter(0.03, 17).tex({ repeat: true });
};
PX.linen = function () { const p = new Pix(16, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, C.mul(0xe8dcc2, 0.92 + 0.1 * hash(x, y, 18) - (y % 4 === 0 ? 0.05 : 0))); return p.tex({ repeat: true }); };
PX.teal = function () { const p = new Pix(16, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, C.mul(0x24605e, 0.85 + 0.25 * noise1(x * 0.5 + y * 2.3, 19))); return p.tex({ repeat: true }); };
/* ---------------------------------------------------------------- wood */
PX.chestFront = function () {
  const W = 40, H = 20, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, C.mul(0x3e2214, 0.85 + 0.3 * noise1(x * 0.6 + y * 0.1, 21)));
  for (const x of [5, 6, W - 7, W - 6]) p.vl(x, 0, H - 1, 0x2a2624);
  for (let x = 0; x < W; x++) { p.set(x, 0, 0x5a5048); p.set(x, 1, 0x2a2624); p.set(x, H - 1, 0x1e1a18); }
  for (const x of [5, W - 7]) for (let y = 2; y < H - 1; y += 4) p.set(x + 1, y, 0x8a8278);
  p.rect(18, 4, 4, 5, 0x3a3430); p.rect(19, 5, 2, 3, 0x9a8e80); p.set(19, 9, 0x5a5048); p.set(20, 9, 0x5a5048);
  for (let x = 16; x <= 23; x++) p.set(x, 12, 0x5a5048); p.set(15, 11, 0x5a5048); p.set(24, 11, 0x5a5048); p.set(15, 10, 0x6a6058); p.set(24, 10, 0x6a6058);
  return p.tex();
};
/* ---------------------------------------------------------------- framed art */
PX.landscape = function () {
  const W = 46, H = 30, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = y / H; p.set(x, y, C.mix(0x5c6890, 0xf0b07c, smooth(0.1, 0.62, t))); }
  const ridge = (x, s, k, base) => base - (noise1(x * k, s) * 0.7 + noise1(x * k * 2.3, s + 5) * 0.3) * 9;
  for (let x = 0; x < W; x++) {
    const r1 = ridge(x, 31, 0.18, 19), r2 = ridge(x, 37, 0.25, 23);
    for (let y = Math.floor(r1); y < H; y++) p.set(x, y, y < r1 + 2 ? 0xe8dce8 : 0x8a7c9c);
    for (let y = Math.floor(r2); y < H; y++) p.set(x, y, y < r2 + 1 ? 0xb8a8c0 : 0x5c5672);
    for (let y = 24; y < 27; y++) p.set(x, y, (x + y) % 4 === 0 ? 0xf0c8a0 : 0x8a98b8);
    const tr = 27 - Math.floor(noise1(x * 0.6, 41) * 4); for (let y = tr; y < H; y++) p.set(x, y, y === tr ? 0x3c4a30 : 0x24301e);
  }
  p.disc(34, 13, 2.2, 0xffe2a0);
  PX.frame(p, W, H, 3);
  return p.tex();
};
PX.swanArt = function () {
  const W = 26, H = 38, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, C.mix(0xd2a640, 0x5e6e2c, smooth(0.15, 0.9, y / H)));
  for (let x = 3; x < W - 3; x++) for (let y = 29; y < 35; y++) p.set(x, y, (x + y) % 3 ? 0x3e5a6a : 0x5a7a88);
  p.ell(14, 26, 6, 3.2, 0xf4f0e6); p.ell(12, 25, 4, 2, 0xffffff);
  for (let i = 0; i < 9; i++) { p.set(17 - Math.round(Math.sin(i / 8 * Math.PI) * 2), 24 - i, 0xf4f0e6); p.set(18 - Math.round(Math.sin(i / 8 * Math.PI) * 2), 24 - i, 0xe8e2d4); }
  p.set(16, 15, 0xf4f0e6); p.set(15, 15, 0xe07a20); p.set(14, 16, 0xe07a20); p.set(16, 15, 0x101010);
  for (const x of [4, 6, 21, 22]) for (let y = 18 + (x % 3); y < 32; y++) p.set(x + (y % 5 === 0 ? 1 : 0), y, 0x2e4a1e);
  PX.frame(p, W, H, 3);
  return p.tex();
};
PX.crest = function () {
  const W = 40, H = 46, p = new Pix(W, H);
  const sword = (x0, y0, x1, y1) => { p.line(x0, y0, x1, y1, 0xc6ccd6); p.line(x0 + 1, y0, x1 + 1, y1, 0x8a92a0);
    const gx = x0 + (x1 - x0) * 0.78, gy = y0 + (y1 - y0) * 0.78, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny);
    p.line(gx - nx / l * 4, gy - ny / l * 4, gx + nx / l * 4, gy + ny / l * 4, 0xc8962e);
    p.line(gx, gy, x1 + (x1 - x0) * 0.12, y1 + (y1 - y0) * 0.12, 0x3a2216); };
  sword(20, 2, 20, 30); sword(6, 6, 30, 32); sword(34, 6, 10, 32);
  const sy = 14;
  for (let y = sy; y < H; y++) for (let x = 6; x < 34; x++) { const v = (y - sy) / (H - sy), half = v < 0.55 ? 14 : 14 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.55) / 0.45, 2)));
    const d = Math.abs(x + 0.5 - 20); if (d > half) continue; p.set(x, y, d > half - 1.2 || y === sy ? 0xc8962e : (x + y) % 2 ? 0x24452e : 0x2a4c34); }
  p.ell(20, 30, 5, 3, 0xece8dc); for (let i = 0; i < 7; i++) p.set(23 + (i > 4 ? 1 : 0), 29 - i, 0xece8dc); p.set(24, 22, 0xece8dc); p.set(25, 22, 0xd07a20);
  p.line(18, 33, 17, 38, 0xd07a20); p.line(21, 33, 22, 38, 0xd07a20); p.line(15, 29, 13, 27, 0xd8d2c4);
  return p.tex();
};
/* ---------------------------------------------------------------- sprites (cards) */
PX.plant = function () {
  const W = 30, H = 62, p = new Pix(W, H), R1 = rng(51);
  for (let y = 50; y < H; y++) { const hw = 6 + (y - 50) * 0.15; for (let x = Math.floor(15 - hw); x < 15 + hw; x++) p.set(x, y, x < 12 ? 0x8a4a22 : x > 18 ? 0x6a3416 : 0xa45a2a); }
  p.hl(8, 21, 50, 0xc8703a); p.hl(8, 21, 51, 0xb8602e);
  p.vl(15, 30, 50, 0x3a2414); p.vl(14, 36, 50, 0x4a2e18);
  const blob = (cx, cy, r, k) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x - cx, y - cy) / r + (R1() - 0.5) * 0.5; if (d > 1) continue;
    const lit = (cx - x + cy - y) / r; p.set(x, y, C.ramp([0x142a16, 0x1e3a1e, 0x2c5228, 0x3e6c32, 0x5a8a3e], clamp(0.35 + lit * 0.35 + k + (R1() - 0.5) * 0.3, 0, 0.999))); } };
  for (let i = 0; i < 16; i++) { const a = R1() * Math.PI * 2, rr = R1(); blob(15 + Math.cos(a) * 9 * rr, 24 + Math.sin(a) * 15 * rr, 3.5 + R1() * 3, (i / 16) * 0.2 - 0.1); }
  blob(15, 8, 4.5, 0.15);
  return p.outline(null, 0.65).tex();
};
PX.urn = function () {
  const W = 16, H = 22, p = new Pix(W, H);
  for (let y = 0; y < H; y++) { const v = y / H, hw = v < 0.15 ? 5 : v < 0.25 ? 4 : 4 + Math.sin((v - 0.25) / 0.75 * Math.PI) * 3.5; for (let x = 0; x < W; x++) { const u = (x + 0.5 - 8) / hw; if (Math.abs(u) > 1) continue;
    let c = C.mix(0xe2c488, 0x8a6a3a, smooth(-0.6, 1, u)); if (y === 9 || y === 15) c = 0x7a4a22; if (y > 10 && y < 14 && (x + y) % 3 === 0) c = 0x9a3a22; p.set(x, y, c); } }
  return p.outline(null, 0.7).tex();
};
PX.candles = function () {   // a cluster of three church candles
  const W = 12, H = 14, p = new Pix(W, H);
  for (const [x0, h] of [[1, 9], [5, 13], [9, 7]]) for (let y = H - h; y < H; y++) for (let x = x0; x < x0 + 3; x++) p.set(x, y, x === x0 ? 0xf2ead8 : x === x0 + 2 ? 0xc8bca2 : 0xe4d8c0);
  return p.tex();
};
PX.candle = function () { const p = new Pix(3, 9); for (let y = 1; y < 9; y++) { p.set(0, y, 0xf2ead8); p.set(1, y, 0xe4d8c0); p.set(2, y, 0xc6baa0); } p.set(1, 0, 0x2a2018); return p.tex(); };
PX.vase = function () {
  const p = new Pix(10, 22);
  for (let y = 12; y < 22; y++) { const hw = y < 15 ? 1 : 1 + Math.sin((y - 15) / 7 * Math.PI) * 2.5; for (let x = 0; x < 10; x++) { const u = (x + 0.5 - 5) / hw; if (Math.abs(u) <= 1) p.set(x, y, C.mix(0x5ab0a0, 0x1e5a52, smooth(-0.8, 1, u))); } }
  p.vl(5, 4, 12, 0x3e6a2e); p.set(4, 8, 0x4c7d36); p.set(6, 6, 0x4c7d36);
  p.disc(5, 3, 2.2, 0xc4241e); p.set(4, 2, 0xe8503e); p.set(5, 3, 0x8a1414); p.disc(8, 6, 1.2, 0xb01e1a);
  return p.outline(null, 0.7).tex();
};
PX.bottle = function () { const p = new Pix(6, 12); for (let y = 0; y < 12; y++) { const hw = y < 4 ? 0.8 : 2.6; for (let x = 0; x < 6; x++) { const u = (x + 0.5 - 3) / hw; if (Math.abs(u) <= 1) p.set(x, y, C.mix(0x6ab878, 0x1e5a2e, smooth(-0.7, 1, u))); } } p.set(2, 6, 0xc8f0c8); return p.tex(); };
PX.bowl = function () {
  const W = 22, H = 14, p = new Pix(W, H);
  for (const [x, y, c] of [[6, 5, 0x5a2a6a], [8, 4, 0x7a3a8a], [10, 5, 0x5a2a6a], [7, 7, 0x8a4a9a], [9, 7, 0x6a3478], [12, 3, 0xe2c23a], [14, 4, 0xd4ae2e], [15, 6, 0xe8c840], [11, 6, 0x6a3478]]) p.disc(x, y, 1.7, c);
  p.set(13, 1, 0x3e7a2e); p.set(14, 0, 0x4c8a36); p.set(12, 2, 0xfff0a0); p.set(7, 3, 0xa06ab0);
  for (let y = 8; y < 14; y++) { const hw = y < 12 ? 9 - (y - 8) * 1.2 : 2; for (let x = 0; x < W; x++) { const u = (x + 0.5 - 11) / hw; if (Math.abs(u) <= 1) p.set(x, y, y === 8 ? 0xf2cc68 : C.mix(0xd8a43a, 0x7a5418, smooth(-0.6, 1, u))); } }
  return p.outline(null, 0.7).tex();
};
PX.jug = function () {
  const p = new Pix(14, 18);
  for (let y = 0; y < 18; y++) { const v = y / 18, hw = v < 0.2 ? 2.5 + v * 5 : 3 + Math.sin((v - 0.2) / 0.8 * Math.PI) * 2.8; for (let x = 0; x < 12; x++) { const u = (x + 0.5 - 6) / hw; if (Math.abs(u) <= 1) p.set(x, y, C.mix(0x6ac4b4, 0x1e5c58, smooth(-0.7, 1, u))); } }
  p.set(3, 0, 0x6ac4b4); p.set(2, 0, 0x4a9a8e); for (let y = 4; y < 12; y++) p.set(12 - (y === 4 || y === 11 ? 1 : 0), y, 0x2a7a70); p.set(4, 6, 0xc8f8f0);
  return p.outline(null, 0.7).tex();
};
PX.goblet = function () { const p = new Pix(7, 11); for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) { const hw = 3.4 - y * 0.35; const u = (x + 0.5 - 3.5) / hw; if (Math.abs(u) <= 1) p.set(x, y, C.mix(0xf6d070, 0x8a5c18, smooth(-0.7, 1, u))); }
  p.vl(3, 5, 9, 0xb88a2a); p.hl(1, 5, 10, 0xc8962e); p.set(2, 1, 0xfff4c0); p.hl(1, 5, 0, 0x6a1a1a); return p.tex(); };
PX.candelabra = function () {
  const p = new Pix(18, 24), b = 0xb88a2a, d = 0x7a5418;
  p.vl(9, 8, 22, b); p.hl(6, 12, 23, d); p.hl(7, 11, 22, b);
  for (let x = 3; x <= 15; x++) { const y = 12 + Math.round(Math.pow((x - 9) / 6, 2) * -4) + 4; p.set(x, y, b); }
  for (const x of [3, 9, 15]) { p.hl(x - 1, x + 1, x === 9 ? 7 : 11, d); for (let y = (x === 9 ? 1 : 5); y < (x === 9 ? 7 : 11); y++) { p.set(x, y, 0xf0e8d6); } }
  return p.tex();
};
PX.books = function () {
  const p = new Pix(16, 9), cols = [0x6a1a1a, 0x24406a, 0x3a5a2a, 0x7a5a2a];
  [[0, 3, 15, 0], [1, 6, 13, 1], [2, 0, 12, 2]].forEach(([i, y, w, c]) => { p.rect(1 + i, y, w, 3, cols[c]); p.hl(1 + i, w + i, y, C.mul(cols[c], 1.4)); p.vl(w + i, y, y + 2, 0xe8dcc0); });
  return p.tex();
};
PX.mirror = function () {
  const W = 30, H = 62, p = new Pix(W, H), cx = 14.5, cy = 26, rx = 12.5, ry = 24;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = (x - cx) / rx, v = (y - cy) / ry, d = Math.sqrt(u * u + v * v);
    if (d > 1) continue; const rim = d > 0.86;
    if (rim) p.set(x, y, d > 0.95 ? 0x7a5214 : (x - y) % 4 === 0 ? 0xf4d27a : C.mix(0xdcae4a, 0x9a6a1e, smooth(-1, 1, u + v)));
    else { const streak = ((x * 0.8 + y) % 14) < 2.4 && u + v < 0.3; p.set(x, y, streak ? 0x6ab89e : C.mix(0x2e7a66, 0x123c36, smooth(-0.8, 0.8, u - v * 0.4))); } }
  for (let y = 50; y < H; y++) { p.set(6 + (y - 50) * -0.3, y, 0x9a6a1e); p.set(23 + (y - 50) * 0.3, y, 0x9a6a1e); }
  p.hl(4, 25, H - 1, 0x6a4614);
  return p.outline(null, 0.7).tex();
};
PX.sconce = function () {
  const p = new Pix(10, 18), i = 0x2c2622, h = 0x5a524a;
  p.rect(3, 12, 4, 6, i); p.vl(3, 12, 17, h); p.rect(2, 7, 6, 3, 0x6a4a2a); p.hl(2, 7, 7, 0x9a6a3a); p.vl(4, 4, 7, 0x3a2a1c); p.vl(5, 3, 7, 0x4a3422);
  p.line(4, 10, 2, 14, i); p.line(6, 10, 8, 14, i);
  return p.tex();
};
PX.chair = function () {
  const W = 18, H = 32, p = new Pix(W, H), w = 0x4a2616, d = 0x2a140c, l = 0x6a3a22;
  for (const x of [2, 3, 14, 15]) p.vl(x, 2, H - 1, x === 2 || x === 14 ? l : w);
  p.hl(2, 15, 2, l); p.hl(1, 16, 1, w); p.set(1, 0, w); p.set(16, 0, w); p.hl(6, 11, 0, w); p.hl(5, 12, 1, l);
  p.rect(4, 4, 10, 11, d); for (let y = 5; y < 14; y++) { p.set(8, y, w); p.set(9, y, l); }
  p.rect(1, 17, 16, 3, w); p.hl(1, 16, 17, l); p.hl(1, 16, 19, d);
  p.rect(2, 20, 2, 12, w); p.rect(14, 20, 2, 12, w); p.hl(4, 13, 26, d);
  return p.tex();
};
PX.door = function () {
  const W = 42, H = 82, p = new Pix(W, H), cx = 20.5, top = 20;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const inArch = y >= top || Math.hypot(x - cx, y - top) <= 20.5; if (!inArch) continue;
    const out = y >= top ? Math.min(x, W - 1 - x) < 3 : Math.hypot(x - cx, y - top) > 17.5;
    if (out) { PX.brickAt(p, x, y, 1); continue; }
    const plank = Math.floor((x - 3) / 6), g = noise1(y * 0.5 + plank * 9, 61); p.set(x, y, (x - 3) % 6 === 0 ? 0x1e0f08 : C.mul(0x4a2a18, 0.82 + 0.34 * g)); }
  for (const y of [32, 62]) { p.hl(3, W - 4, y, 0x2a2624); p.hl(3, W - 4, y + 1, 0x4a4440); for (let x = 5; x < W - 4; x += 5) p.set(x, y, 0x8a8278); }
  p.disc(30, 48, 2, 0x2a2624); p.disc(30, 48, 1, 0x8a8278);
  return p.tex();
};
PX.window = function () {
  const W = 36, H = 76, p = new Pix(W, H), cx = 17.5, top = 18;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const inArch = y >= top || Math.hypot(x - cx, y - top) <= 18; if (!inArch) continue;
    const frame = y >= top ? Math.min(x, W - 1 - x) < 3 || y > H - 5 : Math.hypot(x - cx, y - top) > 15;
    if (frame) { p.set(x, y, C.mul(PX.stoneCols[Math.floor(hash(x >> 2, y >> 2, 62) * 5)], 0.9)); continue; }
    const a = (x + y) % 7, b = ((x - y) % 7 + 7) % 7, lead = a === 0 || b === 0, sky = C.mix(0xfff2c8, 0xffcf7a, smooth(0, 1, y / H));
    const branch = noise1(x * 0.35 + 3, 63) > 0.62 && y > 30 && y < 60 && hash(x, y, 64) > 0.3;
    p.set(x, y, lead ? 0x3a2c20 : branch ? 0xb08a50 : sky); }
  p.vl(17, top - 15, H - 5, 0x2a2018); p.vl(18, top - 15, H - 5, 0x4a3a2a); p.hl(3, W - 4, 44, 0x2a2018);
  return p.tex();
};
/* ---------------------------------------------------------------- fire */
PX.logs = function () {
  const W = 40, H = 12, p = new Pix(W, H);
  const log = (x0, y0, x1, y1, r) => { for (let i = 0; i <= 40; i++) { const x = lerp(x0, x1, i / 40), y = lerp(y0, y1, i / 40); for (let k = -r; k <= r; k++) p.set(x, y + k, k < 0 ? 0x5a3420 : k > 0 ? 0x24140c : 0x3e2416); } p.disc(x1, y1, r, 0xc87a3a); p.set(x1, y1, 0xff9a3a); };
  log(2, 9, 30, 6, 2); log(38, 9, 10, 6, 2); log(6, 10, 34, 10, 1.6);
  for (let i = 0; i < 26; i++) { const x = 4 + Math.floor(hash(i, 1, 65) * 32), y = 7 + Math.floor(hash(i, 2, 65) * 5); if (p.a(x, y)) p.set(x, y, hash(i, 3, 65) > 0.5 ? 0xff7a1a : 0xffc040); }
  return p.tex();
};
PX.grate = function () {
  const W = 44, H = 16, p = new Pix(W, H), c = 0x1c1816, h = 0x4a4440;
  p.hl(0, W - 1, 4, c); p.hl(0, W - 1, 5, h); p.hl(0, W - 1, H - 2, c); p.hl(0, W - 1, H - 1, h);
  for (let x = 1; x < W; x += 4) { p.vl(x, 2, H - 1, c); p.set(x, 1, h); p.set(x, 0, c); p.set(x + 1, 3, h); }
  return p.tex();
};
/* soft (non-pixel) helpers: glows, shafts, motes */
/* ---------------------------------------------------------------- registry */
for (const [k, f] of Object.entries({
  wall: PX.wall, wainscot: PX.wainscot, floor: PX.floor, ceiling: PX.ceiling, beam: PX.beam, fireFront: PX.fireFront, soot: PX.soot,
  folk: PX.tapestryFolk, lace: PX.tapestryLace, lattice: PX.lattice, landscape: PX.landscape, swan: PX.swanArt, crest: PX.crest,
  valance: PX.valance, quilt: PX.quilt, linen: PX.linen, teal: PX.teal, chest: PX.chestFront,
  plant: PX.plant, urn: PX.urn, candles: PX.candles, candle: PX.candle, vase: PX.vase, bottle: PX.bottle, bowl: PX.bowl, jug: PX.jug, goblet: PX.goblet,
  candelabra: PX.candelabra, books: PX.books, mirror: PX.mirror, sconce: PX.sconce, chair: PX.chair, door: PX.door, window: PX.window, logs: PX.logs, grate: PX.grate,
})) PX.def(k, f);
PX.def('rugA', () => PX.rug(128, 48, { field: 0x7e1a16, edge: 0x2a0e0c, gold: 0xc8923a, navy: 0x22304e, cream: 0xe2d4b4 }, 71));
PX.def('rugB', () => PX.rug(80, 40, { field: 0x6a2a18, edge: 0x200c08, gold: 0xb8862e, navy: 0x3a1a2a, cream: 0xd8c098 }, 72));
PX.def('curtain', () => PX.curtain(PX.RED, 58)); PX.def('swag', () => PX.swag(PX.RED)); PX.def('goldCurtain', () => PX.curtain(PX.GOLD, 50));
PX.def('cabinet', () => PX.drawers(24, 22, 3, 0x56301c)); PX.def('vanity', () => PX.drawers(40, 16, 2, 0x4e2a18));
PX.def('brick', () => { const t = PX.brick(); t.userData.tint = 0xc8bcac; return t; });   // cream stone, dimmed so the firelight doesn't blow it out
/* the crown on its cushion, and the cushion's velvet */
PX.def('crownCard', () => {
  const p = new Pix(18, 12), g1 = 0xf4d27a, g2 = 0xd8a43a, g3 = 0x8a5c18;
  for (let x = 2; x < 16; x++) for (let y = 7; y < 12; y++) p.set(x, y, y === 7 ? g1 : y === 11 ? g3 : (x + y) % 5 === 0 ? g1 : g2);
  for (const cx of [3, 6, 9, 12, 15]) { const h = cx === 9 ? 6 : cx === 6 || cx === 12 ? 4 : 3; for (let y = 7 - h; y < 7; y++) { p.set(cx - 1, y, g2); p.set(cx, y, y < 7 - h + 1 ? g1 : g2); } p.set(cx - 1, 6 - h, g1); p.set(cx, 6 - h, 0xfff0b0); }
  p.set(8, 9, 0xc0201e); p.set(9, 9, 0xe8403a); p.set(5, 9, 0x2a4ab0); p.set(12, 9, 0x2a4ab0); p.set(9, 8, 0xff8080);
  return p.outline(null, 0.6).tex();
});
PX.def('velvet', () => { const p = new Pix(16, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, C.ramp([0x4a0a12, 0x6a1018, 0x861820, 0xa02428], clamp(0.5 + 0.35 * Math.sin((x + y) * 0.7) + (hash(x, y, 31) - 0.5) * 0.3, 0, 0.999))); return p.tex({ repeat: true }); });
PX.def('tassel', () => { const p = new Pix(3, 6); p.set(1, 0, 0xd8a43a); for (let y = 1; y < 6; y++) { p.set(0, y, 0xc8922e); p.set(1, y, 0xf0c45e); p.set(2, y, 0xa87a26); } return p.tex(); });
