/* THE CHAPEL — pixel painters. Glass and the rose are painted with the alpha outside the arch or circle left clear, so the
   cards cut out cleanly. The rest is opaque. Repeating surfaces (plaster, vault, floor, altar cloth) tile on their own. */
PX.glassLancet = function (W, H, bg, fig) {   // a round-topped lancet: leaded diamonds, a figure in front, clear outside the arch
  const p = new Pix(W, H), R = W / 2, cx = W / 2 - 0.5;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y < R && Math.hypot(x - cx, y - R) > R) continue;
    const lead = (x + y) % 7 === 0 || ((x - y) % 7 + 7) % 7 === 0 || x <= 1 || x >= W - 2 || y >= H - 2;
    const f = fig(x, y, cx);
    p.set(x, y, lead ? 0x1a1a1e : f !== null ? f : bg(x, y));
  }
  return p.tex({});
};
PX.saintFig = (robe, cloak) => (x, y, cx) => {   // a standing saint: gold halo, a face, a blue robe, a red cloak on one side
  const dh = Math.hypot(x - cx, y - 30);
  if (dh >= 6 && dh <= 7.5) return 0xf0d060;
  if (Math.hypot(x - cx, y - 37) < 3.6) return 0xf0c8a0;
  if (y >= 42 && Math.abs(x - cx) <= 4 + (y - 42) * 0.14) {
    if (x < cx - 2 - (y - 42) * 0.1 && y < 84) return cloak;
    return Math.round(x - cx) % 4 === 0 ? C.mul(robe, 0.7) : robe;
  }
  return null;
};
PX.swanFig = (x, y, cx) => {   // the swan of the house, white on the red
  if ((((x - cx) / 9) ** 2 + ((y - 66) / 5) ** 2) < 1) return 0xf4f0e6;
  if (Math.hypot(x - cx - 6, y - 56) < 3) return 0xf4f0e6;
  return null;
};
PX.def('chGlassSaint', () => PX.glassLancet(48, 112, (x, y) => C.mix(0x3a8a6a, 0xc8b848, y / 112), PX.saintFig(0x2a4a9a, 0xa82a2a)));
PX.def('chGlassSwan', () => PX.glassLancet(48, 112, (x, y) => C.mix(0x9a2226, 0xc8a040, hash(x >> 2, y >> 2, 931) * 0.35), PX.swanFig));
PX.def('chRose', () => {   // the rose over the altar: twelve petals of glass in three rings, spokes and leads
  const W = 80, c = 39.5, R = 39.5, p = new Pix(W, W), cols = [0x2a4a9a, 0xb02a2a, 0x2a8a5a, 0x6a3a9a, 0x3a9aa8, 0xc0602a];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - c, y - c); if (d > R) continue;
    const ang = Math.atan2(y - c, x - c), seg = Math.floor((ang / (Math.PI * 2) + 1) * 12) % 12, ring = d < 10 ? 0 : d < 22 ? 1 : 2;
    const col = ring === 0 ? (seg % 2 ? 0xe8b040 : 0xfff0c0) : cols[(seg + ring * 3) % cols.length];
    const lead = d < 1.4 || Math.abs(d - 10) < 0.6 || Math.abs(d - 22) < 0.6 || d > R - 1.2 || Math.abs(Math.sin(ang * 6)) < 0.05;
    p.set(x, y, lead ? 0x1a1a1e : col);
  }
  return p.tex({});
});
PX.def('chReredos', () => {   // gold leaf, a red-and-gold cross, two saints kneeling at the foot in blue
  const W = 96, H = 84, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = C.mix(0x9a7a30, 0xd8b860, hash(x >> 3, y >> 3, 941) * 0.8 + 0.1 * Math.sin((x + y) * 0.4));
    if ((x >= 45 && x <= 50 && y >= 8 && y <= 70) || (x >= 28 && x <= 67 && y >= 22 && y <= 28)) c = 0x7a1a24;
    if ((x === 44 || x === 51) && y >= 8 && y <= 70 || (x === 27 || x === 68) && y >= 22 && y <= 28) c = 0xc8a040;
    const l = y >= 44 && Math.abs(x - 16) <= 8 + (y - 44) * 0.12, r = y >= 44 && Math.abs(x - 80) <= 8 + (y - 44) * 0.12;
    if (l) c = x < 12 ? 0xa82a2a : 0x2a4a9a;
    if (r) c = x > 84 ? 0xa82a2a : 0x2a4a9a;
    if ((x < 10 || x > 86) && y >= 40) c = C.mul(c, 0.8);
    p.set(x, y, c);
  }
  /* the figure on the cross, pale against the red, and the two saints: a face and a gold halo above each blue robe */
  for (let y = 13; y <= 33; y++) { p.set(47, y, 0xf0e6d0); p.set(48, y, 0xf0e6d0); }
  for (let x = 37; x <= 58; x++) p.set(x, 24, 0xf0e6d0);
  p.disc(47.5, 11, 2.2, 0xf0e6d0);
  for (const cx of [16, 80]) {
    p.disc(cx, 38, 3.6, 0xe8c0a0);
    for (let y = 30; y <= 46; y++) for (let x = cx - 8; x <= cx + 8; x++) { const d = Math.hypot(x - cx, y - 38); if (d > 5.5 && d < 7) p.set(x, y, 0xf0d060); }
  }
  return p.jitter(0.02, 942).tex({});
});
/* a cream damask, the chapel's wall: a lattice of ochre lines with a gold-tipped boss at every crossing (the same
   construction as the throne's damask, so the wall reads as a pattern at distance and as stone up close) */
PX.def('chWall', () => {
  const p = new Pix(32, 32).fill(0xd6c6a2);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const a = (x + y) % 16, b = ((x - y) % 16 + 16) % 16;
    if (a === 0 || b === 0) p.set(x, y, 0xb8a278); else if (a === 1 || b === 1) p.set(x, y, 0xe6d8b6); }
  for (const [cx, cy] of [[8, 0], [24, 0], [0, 8], [16, 8], [32, 8], [8, 16], [24, 16], [0, 24], [16, 24], [32, 24], [8, 32], [24, 32]]) {
    for (const [dx, dy] of [[0, -3], [0, 3], [-3, 0], [3, 0]]) p.wset(cx + dx, cy + dy, 0xa8703a);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.wset(cx + dx, cy + dy, 0xb88a4a);
    p.wset(cx, cy, 0xc8a040); }
  return p.jitter(0.025, 901).tex({ repeat: true });
});
PX.def('chVault', () => {   // ultramarine vault with gold stars
  const p = new Pix(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, C.ramp([0x1c2c5a, 0x243a6e, 0x2c4a80], hash(x, y, 911)));
  for (const [x, y] of [[4, 5], [20, 11], [11, 22], [27, 26]]) { p.set(x, y, 0xe8c060); p.set(x + 1, y, 0xc8a040); p.set(x, y + 1, 0xc8a040); }
  return p.tex({ repeat: true });
});
/* worn grey flagstones, a metre square each: varied tones, a dark joint, a few hairline cracks */
PX.def('chFlags', () => {
  const p = new Pix(64, 64), tones = [0x6e6a62, 0x7a7468, 0x66625a, 0x847c6e, 0x726c60];
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const cell = ((x >> 5) * 7 + (y >> 5) * 13) % tones.length;
    let c = C.mul(tones[cell], 0.9 + 0.2 * hash(x, y, 921));
    if (x % 32 === 0 || y % 32 === 0) c = 0x3c3830;
    if (Math.abs(noise1(x * 0.2 + y * 0.05, 922) - 0.5) < 0.012) c = C.mul(c, 0.8);
    p.set(x, y, c);
  }
  return p.tex({ repeat: true, aniso: 4 });
});
PX.def('chAltarCloth', () => {   // white linen with a gold border
  const p = new Pix(16, 16); p.fill(0xf0ead6);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (x === 0 || x === 15 || y === 0 || y === 15) p.set(x, y, 0xc8a040);
    else if ((x + y) % 4 === 0) p.set(x, y, 0xe0d090);
  }
  return p.jitter(0.015, 951).tex({ repeat: true });
});
PX.def('chAltarFront', () => {   // red brocade with gold crosses
  const p = new Pix(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const gold = (x % 8 === 4 && y % 8 >= 2 && y % 8 <= 6) || (y % 8 === 4 && x % 8 >= 2 && x % 8 <= 6);
    p.set(x, y, gold ? 0xc8a040 : C.mul(0x7a1a24, 0.85 + 0.2 * hash(x, y, 961)));
  }
  return p.tex({ repeat: true });
});
PX.def('chPew', () => PX.wood(0x5a3620, 31));
PX.def('chStoup', () => {   // a stone font: the basin in shadow, the water lit at the rim
  const p = new Pix(24, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 24; x++) {
    const r = Math.hypot((x - 11.5) / 11, (y - 9) / 4.5);
    let c = y < 12 ? (r < 1 ? C.mix(0x3a6a8a, 0x9ac8e0, clamp(1 - r + hash(x, y, 981) * 0.2, 0, 1)) : 0x8a8478) : C.mul(0xb8b0a0, 0.8 + 0.2 * hash(x, y, 982));
    if (y >= 12 && (x < 3 || x > 20)) c = C.mul(c, 0.7);
    p.set(x, y, c);
  }
  return p.tex({});
});
PX.def('chStatueA', () => {   // Our Lady: a white face and veil, a blue cloak, a gold crown
  const p = new Pix(24, 64);
  p.ell(12, 9, 3.4, 3.8, 0xf2eee4);
  for (let y = 14; y < 62; y++) { const hw = 3 + (y - 14) * 0.09; for (let x = Math.floor(12 - hw); x <= 12 + hw; x++) p.set(x, y, C.mul(0x3a5aa8, 0.8 + 0.25 * noise1(x * 0.6 + y * 0.1, 991)));
    if (y < 24) for (let x = 8; x <= 16; x++) p.set(x, y, 0xf2eee4); }
  for (let x = 8; x <= 16; x++) p.set(x, 5, 0xc8a040);
  p.hl(9, 15, 4, 0xc8a040); p.vl(12, 6, 13, 0xf2eee4);
  return p.tex({});
});
PX.def('chStatueB', () => {   // a bishop saint: a gold mitre, a green cope with a gold orphrey
  const p = new Pix(24, 64);
  for (let y = 2; y < 9; y++) { const hw = (y - 2) * 0.7; for (let x = Math.floor(12 - hw); x <= 12 + hw; x++) p.set(x, y, 0xc8a040); }
  p.ell(12, 13, 3.3, 3.6, 0xe8c8a8);
  for (let y = 17; y < 62; y++) { const hw = 3.5 + (y - 17) * 0.08; for (let x = Math.floor(12 - hw); x <= 12 + hw; x++) p.set(x, y, C.mul(0x2e5a3a, 0.8 + 0.25 * noise1(x * 0.6 + y * 0.1, 992)));
    if (y > 20) { p.set(11, y, 0xc8a040); p.set(12, y, 0xc8a040); } }
  return p.tex({});
});
PX.def('chConfess', () => {   // the confessional screen: a lattice of holes in dark oak
  const W = 48, H = 64, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x < 2 || x > 45 || y < 2 || y > 61) { p.set(x, y, 0x3a2414); continue; }
    const hx = x % 6, hy = y % 6, hole = hx >= 1 && hx <= 4 && hy >= 1 && hy <= 4;
    p.set(x, y, hole ? 0x0e0a08 : C.mul(0x5a3620, 0.9 + 0.2 * hash(x, y, 1001)));
  }
  return p.tex({});
});
PX.def('chVotive', () => {   // an iron stand with rows of votive candles
  const W = 40, H = 48, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y >= 44) { p.set(x, y, 0x2a2622); continue; }
    if (x === 3 || x === 4 || x === 35 || x === 36) p.set(x, y, 0x3a3630);
    if (y === 12 || y === 26) p.set(x, y, 0x3a3630);
  }
  for (const row of [14, 28, 38]) for (let x = 6; x <= 32; x += 6) { p.rect(x, row - 6, 2, 6, 0xf0e6c8); p.set(x + 1, row - 6, 0xc8b890); }
  return p.tex({});
});
/* a church banner, hung from a gilt rod: white linen, a red cross down a gold stem, a gold border and a fringed hem */
PX.def('chBanner', () => {
  const W = 40, H = 92, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const hem = y > H - 6 ? (H - 6) + (Math.abs(((x + 2) % 6) - 3) >= 2 ? 3 : 0) : H;
    if (y > hem) continue;
    const b = Math.min(x, W - 1 - x, y);
    let c = C.mul(0xe8e0cc, 0.95 + 0.06 * hash(x, y, 1201));
    if (b < 2) c = 0xc8a040; else if (b < 3) c = 0x6a4a20;
    const cross = (x >= 18 && x <= 21 && y >= 16 && y <= 70) || (x >= 12 && x <= 27 && y >= 30 && y <= 33);
    if (cross) c = (x === 18 || x === 21 || y === 30 || y === 33) ? 0x6a1414 : 0xa82a2a;
    p.set(x, y, c);
  }
  return p.outline(null, 0.7).tex();
});
/* a niche for each statue: a stone-framed round arch with a dark hollow, clear outside the arch */
PX.def('chNiche', () => {
  const W = 40, H = 78, R = 16, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - 19.5, y - R), inArch = y >= R || d <= R;
    if (!inArch) continue;
    const edge = y >= R ? (x < 3 || x > 36) : d > R - 3;
    p.set(x, y, edge ? C.mul(0xb8a888, 0.85 + 0.2 * hash(x, y, 1211)) : C.mix(0x2a3450, 0x161c2c, clamp(y / H, 0, 1)));
  }
  return p.tex({});
});
PX.def('chLamp', () => {   // the sanctuary lamp: a red glass cup on a chain
  const p = new Pix(12, 20);
  p.vl(6, 0, 4, 0x7a7e88);
  p.ell(6, 11, 4, 5, 0xb81e1e); p.ell(5, 9, 1.5, 2, 0xff8a8a); p.hl(3, 9, 16, 0x6a1010);
  return p.tex({});
});
