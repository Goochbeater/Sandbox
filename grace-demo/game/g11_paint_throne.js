/* THRONE ROOM TEXTURES — a dusk-blue hall (teal damask, cream stone, black-and-cream marble) warmed by torches,
   chandeliers and a red-and-gold throne bay. Same 32 texels/m grid as the bedroom. */
PX.def('hallWall', () => {
  const p = new Pix(32, 32).fill(0x22374a);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const a = (x + y) % 16, b = ((x - y) % 16 + 16) % 16;
    if (a === 0 || b === 0) p.set(x, y, 0x182838); else if (a === 1 || b === 1) p.set(x, y, 0x2a4256); }
  for (const [cx, cy] of [[8, 0], [24, 0], [0, 8], [16, 8], [32, 8], [8, 16], [24, 16], [0, 24], [16, 24], [32, 24], [8, 32], [24, 32]]) {
    for (const [dx, dy] of [[0, -3], [0, 3], [-3, 0], [3, 0]]) p.wset(cx + dx, cy + dy, 0x355268);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.wset(cx + dx, cy + dy, 0x3e5c72);
    p.wset(cx, cy, 0x4c6e86); }
  return p.jitter(0.04, 101).tex({ repeat: true });
});
PX.def('hallWainscot', () => {
  const p = new Pix(32, 45).fill(0x2a1810);
  p.rect(0, 0, 32, 5, 0x4a2c1c); p.hl(0, 31, 0, 0x6c4028); p.hl(0, 31, 4, 0x1a0c06); p.rect(0, 41, 32, 4, 0x24140c); p.hl(0, 31, 41, 0x40261a);
  // an arched panel: frame, recessed field, carved rosette
  for (let y = 8; y < 39; y++) for (let x = 4; x < 28; x++) { const arch = y < 14 ? Math.hypot(x - 15.5, y - 14) <= 11.5 : true; if (!arch) continue;
    const edge = y < 14 ? Math.hypot(x - 15.5, y - 14) > 10.2 : x < 5 || x > 26 || y > 37; p.set(x, y, edge ? 0x4a2a1a : 0x31190f); }
  for (let y = 15; y < 36; y++) { p.set(6, y, 0x3e2216); p.set(25, y, 0x1c0e08); } p.hl(6, 25, 36, 0x1c0e08);
  p.disc(15.5, 25, 3.2, 0x40241a); p.disc(15.5, 25, 1.6, 0x5a3420); p.set(15, 24, 0x7a4a2c);
  for (let y = 5; y < 41; y++) { p.set(0, y, 0x1a0c06); p.set(1, y, 0x3a2014); }
  return p.jitter(0.035, 102).tex({ repeat: true });
});
PX.def('frieze', () => {
  const p = new Pix(32, 10).fill(0x6a1a1a);
  p.hl(0, 31, 0, 0xd8a43a); p.hl(0, 31, 9, 0xd8a43a); p.hl(0, 31, 1, 0x3a0e0e); p.hl(0, 31, 8, 0x3a0e0e);
  for (let x = 0; x < 32; x++) for (let y = 2; y < 8; y++) { const u = x % 8, d = Math.abs(u - 4) + Math.abs(y - 4.5); if (d < 2) p.set(x, y, 0xe8c060); else if (d < 3) p.set(x, y, 0x2a4a60); }
  return p.tex({ repeat: true });
});
PX.def('ashlar', () => {
  const p = new Pix(32, 32), cols = [0xc2b9a6, 0xb6ad98, 0xccc4b2, 0xbab09c, 0xc6bca8];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const row = Math.floor(y / 8), bx = Math.floor((x + (row % 2) * 8) / 16);
    const mx = (x + (row % 2) * 8) % 16 === 15, my = y % 8 === 7;
    if (mx || my) { p.set(x, y, 0x857b6a); continue; }
    let c = cols[Math.floor(hash(bx, row, 103) * 5)]; if (y % 8 === 0) c = C.mul(c, 1.06); if ((x + (row % 2) * 8) % 16 === 14) c = C.mul(c, 0.9);
    p.set(x, y, C.mul(c, 0.95 + 0.1 * hash(x >> 1, y >> 1, 104))); }
  const t = p.tex({ repeat: true }); t.userData.tint = 0xd0c8bc; return t;
});
/* polished marble: cream and black squares 0.75 m, with veins */
PX.def('marble', () => {
  const p = new Pix(48, 48);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dark = ((x / 24 | 0) + (y / 24 | 0)) % 2 === 1, v = noise1(x * 0.21 + noise1(y * 0.13, 105) * 5 + y * 0.05, 106), vein = Math.abs(v - 0.5) < 0.03;
    let c = dark ? C.mul(0x2a2c36, 0.9 + 0.2 * noise1(x * 0.3 + y * 0.7, 107)) : C.mul(0xd4ccba, 0.92 + 0.1 * noise1(x * 0.4 + y * 0.3, 108));
    if (vein) c = dark ? 0x4a4e5a : 0xa8a090;
    if (x % 24 === 0 || y % 24 === 0) c = C.mul(c, 0.6);
    p.set(x, y, c); }
  return p.tex({ repeat: true, aniso: 4 });
});
/* the long red runner: 1 m wide (32 px), tiled along x */
PX.def('runner', () => {
  const p = new Pix(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const b = Math.min(y, 31 - y);
    let c = 0x7e1616;
    if (b < 1) c = 0x2a0a0a; else if (b < 3) c = 0xc8962e; else if (b < 6) c = (x + b) % 4 < 2 ? 0x1e2a48 : 0xe2d4b4; else if (b < 7) c = 0xc8962e;
    else { const u = x % 16 - 8, v = y - 16, d = Math.abs(u) + Math.abs(v); if (d < 3) c = 0xd8a43a; else if (d < 5) c = 0x5a0e10; else if (d === 6) c = 0xc8962e; }
    p.set(x, y, C.mul(c, 0.94 + 0.12 * hash(x, y, 109))); }
  return p.tex({ repeat: true, aniso: 4 });
});
PX.def('throneBack', () => {   // tufted red velvet in a gilded frame, 1.3 × 2.1 m
  const W = 42, H = 68, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const top = y < 12 ? Math.abs(x - 20.5) < (12 - y) * 0.7 + 8 : true; if (!top) continue;
    const b = Math.min(x, W - 1 - x, H - 1 - y, y < 12 ? 99 : 99);
    if (b < 3 || (y < 13 && Math.abs(x - 20.5) > (12 - y) * 0.7 + 5)) { p.set(x, y, C.ramp(PX.GOLD, (x + y) % 3 === 0 ? 0.95 : 0.6)); continue; }
    const a = (x + y) % 8, c = ((x - y) % 8 + 8) % 8, tuft = a === 0 && c === 0, seam = a === 0 || c === 0;
    p.set(x, y, tuft ? 0xd8a43a : seam ? 0x4a0a12 : C.ramp([0x5a0c14, 0x741420, 0x8c1c26, 0xa02a2e], clamp(0.5 + 0.4 * Math.sin(Math.min(a, 8 - a, c, 8 - c) * 0.8) - 0.1, 0, 0.999))); }
  for (let x = 14; x < 28; x++) for (let y = 2; y < 10; y++) if (Math.hypot(x - 20.5, y - 6) < 3.6) p.set(x, y, (x + y) % 2 ? 0x24452e : 0x2a4c34);
  p.set(20, 5, 0xece8dc); p.set(21, 5, 0xece8dc); p.set(20, 6, 0xece8dc); p.set(21, 6, 0xece8dc); p.set(22, 4, 0xece8dc);
  return p.tex();
});
PX.def('gilt', () => { const p = new Pix(16, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, C.ramp(PX.GOLD, clamp(0.55 + 0.35 * Math.sin(x * 0.9 + Math.sin(y * 0.8) * 2) + (hash(x, y, 110) - 0.5) * 0.2, 0, 0.999))); return p.tex({ repeat: true }); });
/* the royal banner behind the throne: red, gold border, the white swan crest, a tasselled hem */
PX.def('banner', () => {
  const W = 80, H = 136, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const hem = y > H - 14 ? Math.abs(((x + 4) % 10) - 5) * 1.6 + (H - 14) : H; if (y > hem) continue;
    const b = Math.min(x, W - 1 - x, y, hem - y);
    let c = C.ramp(PX.RED, 0.45 + 0.3 * Math.sin(x / W * Math.PI * 6) * 0.5 + 0.15);
    if (b < 2) c = 0xd8a43a; else if (b < 3) c = 0x5a1010; else if (b < 6 && (x + y) % 4 < 2) c = 0xc8922e; else if (b < 7) c = 0xd8a43a;
    p.set(x, y, c); }
  // crest shield + swan
  const sx = 40, sy = 40;
  for (let y = sy - 18; y < sy + 26; y++) for (let x = sx - 18; x < sx + 18; x++) { const v = (y - (sy - 18)) / 44, half = v < 0.55 ? 18 : 18 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.55) / 0.45, 2)));
    const d = Math.abs(x + 0.5 - sx); if (d > half) continue; p.set(x, y, d > half - 1.5 || y === sy - 18 ? 0xd8a43a : (x + y) % 2 ? 0x24452e : 0x2a4c34); }
  p.ell(sx, sy + 8, 8, 4.5, 0xece8dc); p.ell(sx - 2, sy + 7, 5, 2.5, 0xffffff);
  for (let i = 0; i < 12; i++) { const xx = sx + 4 + Math.round(Math.sin(i / 11 * Math.PI) * 2.5); p.set(xx, sy + 5 - i, 0xece8dc); p.set(xx + 1, sy + 5 - i, 0xe0dace); }
  p.set(sx + 6, sy - 7, 0xd07a20); p.set(sx + 7, sy - 7, 0xd07a20); p.set(sx + 5, sy - 7, 0x101010);
  for (let x = 20; x < 60; x++) { const y = 92 + Math.round(Math.sin(x * 0.5) * 2); p.set(x, y, 0xd8a43a); }
  return p.outline(null, 0.7).tex();
});
PX.def('bannerBlue', () => {
  const W = 24, H = 100, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const hem = y > H - 8 ? H - 8 + (Math.abs(x - 11.5) < 3 ? 6 : Math.abs(x - 11.5) < 7 ? 3 : 0) : H; if (y > hem) continue;
    const b = Math.min(x, W - 1 - x); let c = C.mix(0x1c2a4e, 0x2c3e6e, 0.5 + 0.5 * Math.sin(x * 0.8)); if (b < 1) c = 0xd8a43a; else if (b < 2) c = 0x121a30;
    if (y % 18 === 9 && Math.abs(x - 11.5) < 5) c = 0xd8a43a; if (y % 18 === 9 && Math.abs(x - 11.5) < 2) c = 0xe8e2d6; p.set(x, y, c); }
  return p.outline(null, 0.7).tex();
});
/* stained glass for dusk: deep blues and greens, a gold rose, lead lines */
PX.def('stained', () => {
  const W = 40, H = 104, p = new Pix(W, H), cx = 19.5, top = 20;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inA = y >= top || Math.hypot(x - cx, y - top) <= 20; if (!inA) continue;
    const fr = y >= top ? Math.min(x, W - 1 - x) < 3 || y > H - 5 : Math.hypot(x - cx, y - top) > 17;
    if (fr) { p.set(x, y, C.mul([0xc2b9a6, 0xb6ad98, 0xccc4b2][Math.floor(hash(x >> 2, y >> 2, 111) * 3)], 0.9)); continue; }
    const a = (x + y) % 8, b = ((x - y) % 8 + 8) % 8, lead = a === 0 || b === 0 || x === 19 || x === 20;
    const cell = Math.floor((x + y) / 8) * 7 + Math.floor((x - y + 100) / 8) * 3, pal = [0x2a6a8a, 0x1e8a7a, 0x3a5aa8, 0x2a8a5a, 0x5a3a8a, 0x3a9aa8];
    let c = pal[cell % pal.length]; if (y > H - 30) c = C.mix(c, 0x4a8a5a, 0.4);
    const rose = Math.hypot(x - cx, y - 26); if (rose < 7) c = rose < 2.5 ? 0xffd880 : (Math.atan2(y - 26, x - cx) * 4 / Math.PI + 8) % 2 < 1 ? 0xe8a030 : 0xb02828;
    p.set(x, y, lead ? 0x1a1a1e : c); }
  return p.tex();
});
PX.def('doorDouble', () => {
  const W = 66, H = 116, p = new Pix(W, H), cx = 32.5, top = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const inA = y >= top || Math.hypot(x - cx, y - top) <= 33; if (!inA) continue;
    const fr = y >= top ? Math.min(x, W - 1 - x) < 4 : Math.hypot(x - cx, y - top) > 29;
    if (fr) { p.set(x, y, C.mul([0xc2b9a6, 0xb6ad98, 0xccc4b2][Math.floor(hash(x >> 2, y >> 3, 112) * 3)], (x + y) % 9 === 0 ? 0.8 : 0.95)); continue; }
    if (Math.abs(x - cx) < 0.6) { p.set(x, y, 0x120804); continue; }
    const plank = Math.floor((x - 4) / 7), g = noise1(y * 0.4 + plank * 9, 113); p.set(x, y, (x - 4) % 7 === 0 ? 0x1e0f08 : C.mul(0x4e2c18, 0.82 + 0.34 * g)); }
  for (const y of [44, 76, 104]) { for (let x = 4; x < W - 4; x++) { p.set(x, y, 0x2a2624); p.set(x, y + 1, 0x4a4440); } for (let x = 7; x < W - 4; x += 5) p.set(x, y, 0x9a9288); }
  for (const x of [27, 38]) { p.disc(x, 70, 3, 0x2a2624); p.disc(x, 70, 2, 0x8a8278); p.disc(x, 70, 1.2, 0x2a2624); }
  return p.tex();
});
PX.def('arch', () => {   // an open archway: stone surround, the warm corridor beyond fading to dark
  const W = 52, H = 104, p = new Pix(W, H), cx = 25.5, top = 26;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const inA = y >= top || Math.hypot(x - cx, y - top) <= 26; if (!inA) continue;
    const fr = y >= top ? Math.min(x, W - 1 - x) < 5 : Math.hypot(x - cx, y - top) > 21;
    if (fr) { p.set(x, y, C.mul([0xc2b9a6, 0xb6ad98, 0xccc4b2][Math.floor(hash(x >> 2, y >> 3, 114) * 3)], 0.92)); continue; }
    const t = y / H, glow = smooth(0.2, 1.0, t) * (1 - Math.abs(x - cx) / 26);
    p.set(x, y, C.mix(0x1a0e08, 0xe8a050, glow * 0.85)); }
  return p.tex();
});
PX.def('bookcase', () => {
  const W = 58, H = 78, p = new Pix(W, H).fill(0x2a160c), R1 = rng(115);
  for (let x = 0; x < W; x++) { p.set(x, 0, 0x5a3420); p.set(x, 1, 0x4a2a1a); p.set(x, H - 1, 0x1a0c06); }
  for (let y = 0; y < H; y++) { p.set(0, y, 0x4a2a1a); p.set(1, y, 0x3a2014); p.set(W - 1, y, 0x1a0c06); p.set(W - 2, y, 0x3a2014); }
  const cols = [0x6a1a1a, 0x24406a, 0x3a5a2a, 0x7a5a2a, 0x4a2a5a, 0x8a6a3a, 0x2a2a30, 0x9a3a22];
  for (let s = 0; s < 4; s++) { const y0 = 3 + s * 19, y1 = y0 + 15;
    for (let x = 2; x < W - 2; x++) { p.set(x, y1 + 1, 0x5a3420); p.set(x, y1 + 2, 0x3a2014); }
    let x = 3; while (x < W - 4) { const kind = R1();
      if (kind < 0.08) { p.disc(x + 3, y1 - 2.5, 2.5, 0x8a9a8a); p.set(x + 2, y1 - 4, 0xc8d8c8); x += 7; continue; }       // a jar
      if (kind < 0.16) { for (let k = 0; k < 3; k++) p.ell(x + 4, y1 - 1 - k * 2, 4, 1, 0xe0d4b8); p.set(x, y1 - 1, 0xa8302a); x += 9; continue; }   // scrolls
      const w = 2 + Math.floor(R1() * 2), h = 9 + Math.floor(R1() * 6), c = cols[Math.floor(R1() * cols.length)], lean = R1() < 0.1;
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) p.set(x + i + (lean ? Math.floor(j / 6) : 0), y1 - j, j === h - 3 ? 0xd8a43a : C.mul(c, i === 0 ? 1.2 : 0.9));
      x += w + (R1() < 0.2 ? 1 : 0); } }
  return p.tex();
});
PX.def('folkWide', () => {   // embroidered hanging after the reference: red and blue flowers, a green vine border
  const W = 56, H = 44, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, (x + y) % 2 ? 0xe4dac4 : 0xdad0b8);
  for (let x = 0; x < W; x++) { p.set(x, 2, 0xa82a24); p.set(x, H - 3, 0xa82a24); if (x % 4 < 2) { p.set(x, 4, 0x3f6a2e); p.set(x, H - 5, 0x3f6a2e); } }
  for (let y = 2; y < H - 2; y++) { p.set(1, y, 0xa82a24); p.set(W - 2, y, 0xa82a24); }
  const flower = (cx, cy, big) => { const r = big ? 4 : 3; for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4; p.disc(cx + Math.cos(an) * r, cy + Math.sin(an) * r, big ? 1.8 : 1.3, a % 2 ? 0xb8302a : 0xd8443a); } p.disc(cx, cy, big ? 2.4 : 1.6, 0x34509a); p.set(cx, cy, 0xe0b040); };
  for (let x = 6; x < W - 5; x += 2) { const y = 22 + Math.round(Math.sin(x * 0.35) * 6); p.set(x, y, 0x3f6a2e); p.set(x + 1, y, 0x4c7d36); }
  flower(28, 21, true); flower(14, 17, false); flower(42, 17, false); flower(9, 29, false); flower(47, 29, false);
  for (const [x, y] of [[20, 27], [36, 27], [22, 14], [34, 14]]) { p.disc(x, y, 1.6, 0x34509a); p.set(x, y, 0xe8e0c8); }
  for (let x = -1; x <= W; x++) p.set(x, 0, 0x3a2316);
  for (let x = 2; x < W - 2; x += 2) p.set(x, H - 1, 0xc9bda4);
  return p.tex();
});
PX.def('shieldDisplay', () => {   // two crossed spears behind a round shield
  const W = 44, H = 44, p = new Pix(W, H);
  for (const [x0, y0, x1, y1] of [[4, 40, 40, 4], [40, 40, 4, 4]]) { p.line(x0, y0, x1, y1, 0x4a2c18); p.line(x0 + 1, y0, x1 + 1, y1, 0x3a2012);
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy); for (let i = 0; i < 6; i++) { p.set(x1 - dx / l * i, y1 - dy / l * i, 0xc6ccd6); p.set(x1 - dx / l * i + 1, y1 - dy / l * i, 0x8a92a0); } }
  p.disc(22, 22, 11, 0x5a3420); p.disc(22, 22, 10, 0x7a1a1a); for (let a = 0; a < 16; a++) { const an = a * Math.PI / 8; p.set(22 + Math.cos(an) * 8.5, 22 + Math.sin(an) * 8.5, 0xd8a43a); }
  p.disc(22, 22, 3, 0xa8b0bc); p.set(21, 21, 0xe8eef4);
  for (let a = 0; a < 64; a++) { const an = a * Math.PI / 32; p.set(22 + Math.cos(an) * 11, 22 + Math.sin(an) * 11, 0x2a1810); }
  return p.tex();
});
PX.def('halberds', () => {
  const W = 34, H = 86, p = new Pix(W, H);
  for (const x of [6, 17, 28]) { p.vl(x, 10, H - 4, 0x4a2c18); p.vl(x + 1, 10, H - 4, 0x2e1a0e);
    for (let y = 2; y < 12; y++) p.set(x, y, 0xc6ccd6); p.set(x + 1, 3, 0x8a92a0);
    for (let y = 10; y < 18; y++) { const w = y < 14 ? y - 9 : 18 - y; for (let i = 1; i <= w; i++) p.set(x - i, y, i === w ? 0x8a92a0 : 0xc6ccd6); } }
  p.rect(1, 52, 32, 3, 0x3a2012); p.hl(1, 32, 52, 0x5a3420); p.rect(1, H - 4, 32, 4, 0x2a160c); p.hl(1, 32, H - 4, 0x4a2a1a);
  return p.tex();
});
PX.def('mapSheet', () => {
  const W = 40, H = 26, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); p.set(x, y, C.mul(0xd8c49a, 0.88 + 0.12 * noise1(x * 0.3 + y * 0.9, 116) - (e < 1 ? 0.15 : 0))); }
  for (let x = 2; x < W - 2; x++) { const y = 13 + Math.round(Math.sin(x * 0.3) * 4 + Math.sin(x * 0.9) * 1.2); p.set(x, y, 0x5a7a9a); }
  for (const [x, y] of [[10, 7], [24, 9], [31, 18], [16, 19]]) { p.set(x, y, 0x8a2a1a); p.set(x + 1, y, 0x8a2a1a); p.set(x, y - 1, 0x3a2a1a); }
  for (let i = 0; i < 9; i++) p.set(6 + i * 3, 4 + Math.round(Math.sin(i) * 1.5), 0x6a5a3a);
  return p.tex();
});
PX.def('lectern', () => {
  const W = 20, H = 40, p = new Pix(W, H), w = 0x4a2616, d = 0x2a140c, l = 0x6a3a22;
  p.rect(8, 12, 4, 25, w); p.vl(8, 12, 36, l); p.rect(4, 36, 12, 4, d); p.hl(4, 15, 36, w);
  for (let y = 4; y < 13; y++) { const x0 = 2 + Math.floor((12 - y) * 0.2); p.hl(x0, W - 1 - x0, y, y === 4 ? l : w); }
  for (let y = 1; y < 6; y++) { p.hl(3, 9, y, 0xece2c8); p.hl(10, 16, y, 0xe2d6ba); } p.vl(9, 1, 5, 0xb8a88a); p.hl(4, 8, 3, 0x6a5a4a); p.hl(11, 15, 2, 0x6a5a4a); p.set(15, 6, 0xa8302a); p.set(15, 7, 0xa8302a);
  return p.tex();
});
PX.def('candleStand', () => {   // a tall iron floor candelabrum
  const W = 22, H = 66, p = new Pix(W, H), i = 0x2c2622, h = 0x5a524a;
  p.vl(10, 14, H - 6, i); p.vl(11, 14, H - 6, h); for (const [a, b] of [[4, H - 1], [17, H - 1]]) p.line(10, H - 8, a, b, i); p.hl(8, 13, H - 8, h);
  for (let x = 2; x <= 19; x++) p.set(x, 14 + Math.round(Math.pow((x - 10.5) / 8.5, 2) * -3) + 3, i);
  for (const x of [2, 10, 19]) { p.hl(x - 1, x + 1, x === 10 ? 10 : 13, h); for (let y = (x === 10 ? 2 : 5); y < (x === 10 ? 10 : 13); y++) { p.set(x, y, 0xf0e8d6); p.set(x + 1, y, 0xc8bca2); } }
  return p.tex();
});
PX.def('brazier', () => {
  const W = 30, H = 30, p = new Pix(W, H), i = 0x2c2622, h = 0x5a524a;
  for (let y = 4; y < 13; y++) { const hw = 13 - (y - 4) * 0.9; for (let x = 0; x < W; x++) if (Math.abs(x - 14.5) < hw) p.set(x, y, y === 4 ? h : C.mix(0x4a4440, 0x1c1816, (y - 4) / 9)); }
  for (let x = 3; x < 27; x++) if (hash(x, 5, 117) > 0.4) p.set(x, 4, 0xff8a2a);
  p.line(9, 12, 4, H - 1, i); p.line(20, 12, 25, H - 1, i); p.vl(14, 12, H - 1, i); p.vl(15, 12, H - 1, h);
  return p.tex();
});
PX.def('stoneDark', () => { const p = new Pix(32, 32); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, C.mul(0x6a645a, 0.8 + 0.3 * hash(x >> 2, y >> 2, 118) - (x % 16 === 15 || y % 8 === 7 ? 0.25 : 0))); return p.tex({ repeat: true }); });
PX.def('bench', () => PX.drawers(60, 14, 1, 0x4a2616));
/* the runner turned 90°, for the strip of carpet that climbs the dais */
PX.def('runnerZ', () => { const src = PX.T.runner.image, cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const g = cv.getContext('2d');
  g.translate(16, 16); g.rotate(Math.PI / 2); g.drawImage(src, -16, -16); const p = new Pix(32, 32); p.d.set(g.getImageData(0, 0, 32, 32).data); return p.tex({ repeat: true, aniso: 4 }); });
