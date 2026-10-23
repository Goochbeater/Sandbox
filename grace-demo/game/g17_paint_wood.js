/* THE WOOD AND THE WOMAN'S HUT — pixel painters. The wood: the archery butt's target, a red deer and a hound in profile (the
   character kit has no animals, so they are painted). The hut: a purple wattle wall, a ritual rug, herbs on a cord, a crystal
   orb and a cauldron. Violet and dark plum throughout the hut; afternoon greens in the wood. */
/* a row of conifers in silhouette along a horizon: each tree a stack of ragged tiers on a short trunk, the left edge lit
   (the sun is in the west). Far rows are painted in a haze colour, near rows in the forest's greens. */
PX.treeRow = function (W, H, dark, lit, seed, spacing, hMin, hMax) {
  const p = new Pix(W, H);
  for (let x0 = -spacing; x0 < W + spacing; x0 += spacing) {
    const cx = x0 + (hash(x0 | 0, seed, 1401) - 0.5) * spacing * 0.5, th = hMin + hash(x0 | 0, seed, 1402) * (hMax - hMin), base = H - 1, top = base - th;
    for (let y = Math.max(0, Math.floor(top)); y <= base; y++) {
      const t = (y - top) / th, tiers = 0.55 + 0.45 * Math.abs(Math.sin(t * 6 * Math.PI));
      const half = th * 0.15 * t * tiers + 0.4;
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        if (x < 0 || x >= W) continue;
        p.set(x, y, x < cx - half * 0.35 ? lit : dark);
      }
    }
    for (let y = Math.floor(base - th * 0.07); y <= base; y++) p.set(Math.round(cx), y, dark);
  }
  return p;
};
PX.def('forestFar', () => PX.treeRow(1024, 128, 0x7f9aaa, 0x9cb6c4, 21, 18, 40, 92).tex({}));
PX.def('forestMid', () => PX.treeRow(1024, 160, 0x3f5e58, 0x5c7c6c, 33, 26, 60, 140).tex({}));
PX.def('forestNear', () => PX.treeRow(1024, 200, 0x1c3626, 0x3c5c42, 47, 40, 90, 190).tex({}));
PX.def('bushPix', () => {   // a clump of bushes: dark green mass, lit top-left, a few berries
  const p = new Pix(64, 40);
  p.ell(32, 26, 28, 13, 0x1e3a24); p.ell(26, 20, 18, 10, 0x2e5a34); p.ell(20, 16, 9, 5, 0x4a7a44);
  for (let i = 0; i < 9; i++) { const x = 10 + i * 5, y = 26 + (i % 3) * 3; p.set(x, y, 0xb03a3a); }
  return p.tex({});
});
PX.def('archeryTarget', () => {   // a straw butt's target: five rings, the gold at the centre
  const W = 40, H = 40, p = new Pix(W, H), c = 19.5;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - c, y - c); if (d > 19) continue;
    p.set(x, y, [0xe8c040, 0xb02a2a, 0x2a4fa8, 0x1a1a1e, 0xf4f0e0][Math.min(Math.floor(d / 4), 4)]);
  }
  return p.tex({});
});
PX.def('deerPix', () => {   // a red deer standing in profile, facing right: a lit back, a pale rump, dark legs, a rough antler
  const p = new Pix(64, 48), B = 0x9a6a40, D = 0x4a2e1c, L = 0xd8b890, W = 0xf0e8d8;
  p.ell(30, 25, 15, 8, B); p.ell(29, 22, 13, 4, C.mul(B, 1.2)); p.ell(18, 24, 3.5, 4, W);
  for (let y = 9; y <= 22; y++) p.rect(Math.round(42 + (22 - y) * 0.12), y, 5, 1, B);   // the neck, leaning up
  p.ell(50, 9, 4.5, 3, B); p.ell(53, 10, 2, 1.6, D); p.set(50, 8, 0x110a08);
  p.vl(47, 3, 7, 0x6a4a2c); p.hl(44, 49, 3, 0x6a4a2c); p.vl(49, 0, 2, 0x6a4a2c);
  for (const x of [20, 25, 36, 41]) p.rect(x, 31, 2, 14, D);
  p.rect(16, 21, 2, 3, L);
  return p.outline(null, 0.6).tex();
});
PX.def('houndPix', () => {   // a grey-brown hound lying with its head up, in profile facing right
  const p = new Pix(40, 26), B = 0x8a7050, D = 0x3a2a1c;
  p.ell(18, 17, 12, 5, B); p.ell(18, 15, 10, 2.5, C.mul(B, 1.2));
  p.ell(31, 11, 4.5, 3.5, B); p.ell(35, 12, 2.5, 1.8, D); p.set(33, 10, 0x0e0a08); p.ell(27, 9, 1.8, 3, D);
  p.rect(9, 19, 2, 4, D); p.rect(13, 20, 2, 3, D); p.rect(22, 20, 2, 3, D); p.rect(26, 20, 2, 3, D);
  p.hl(3, 9, 15, B);
  return p.outline(null, 0.6).tex();
});
/* ---- the hut */
PX.def('hutWall', () => {   // purple-black wattle: staves of woven wood, eight texels to a stave, so the weave reads at the lens
  const p = new Pix(64, 64).fill(0x1e1430);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const over = ((x >> 3) + (y >> 3)) % 2 === 0, stave = over ? (y % 8 >= 3 && y % 8 <= 4) : (x % 8 >= 3 && x % 8 <= 4);
    p.set(x, y, stave ? C.mul(0x5a3a7a, 0.85 + 0.3 * hash(x >> 2, y >> 2, 1301)) : C.mul(0x24183a, 0.9 + 0.15 * hash(x, y, 1302)));
  }
  return p.tex({ repeat: true });
});
PX.def('catPix', () => {   // a black cat sitting in profile, green eyes, its tail round its feet
  const p = new Pix(18, 24), K = 0x0e0a10;
  p.ell(9, 16, 5, 6.5, K); p.ell(9, 7, 3.5, 3.2, K); p.set(7, 2, K); p.set(7, 1, K); p.set(11, 2, K); p.set(11, 1, K);
  p.set(8, 7, 0x8aff8a); p.set(10, 7, 0x8aff8a);
  p.ell(13, 22, 5, 1.5, K);
  return p.tex({});
});
PX.def('jarPix', () => {   // a glass jar of violet liquid with a wooden lid and a name on it, the highlight on the glass
  const p = new Pix(14, 24);
  p.rect(3, 0, 8, 3, 0x6a4a2a);
  for (let y = 3; y < 24; y++) for (let x = 1; x < 13; x++) { const edge = x === 1 || x === 12 || y === 23; p.set(x, y, edge ? 0x4a3a5a : C.mix(0x5a2aa0, 0xb080ff, (x - 1) / 11)); }
  p.hl(3, 10, 8, 0xe8d8ff); p.rect(4, 12, 6, 4, 0xe8dcc0);
  return p.tex({});
});
PX.def('skullPix', () => {   // a skull, two sockets, the teeth in a row
  const p = new Pix(14, 14);
  p.ell(7, 6, 6, 5.5, 0xd8d0c0); p.rect(3, 9, 8, 4, 0xd8d0c0);
  p.disc(4.5, 6.5, 1.6, 0x1a1418); p.disc(9.5, 6.5, 1.6, 0x1a1418); p.set(7, 9, 0x1a1418); p.set(6, 11, 0x1a1418); p.set(8, 11, 0x1a1418);
  return p.outline(null, 0.6).tex();
});
PX.def('cobwebPix', () => {   // a corner of web: radial threads and three rings, clear outside
  const p = new Pix(20, 20), c = 0x9a9ab0, cx = 19, cy = 0;
  for (let a = 0; a <= 8; a++) { const t = a / 8 * Math.PI / 2; p.line(cx, cy, Math.round(cx - Math.cos(t) * 19), Math.round(cy + Math.sin(t) * 19), c); }
  for (const r of [6, 12, 18]) for (let a = 0; a <= 40; a++) { const t = a / 40 * Math.PI / 2; p.set(Math.round(cx - Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), c); }
  return p.tex({});
});
PX.def('runeRug', () => {   // a ritual circle on dark planks: two rings, six spokes and a violet hub
  const W = 64, p = new Pix(W, W), c = 31.5;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - c, y - c), ang = Math.atan2(y - c, x - c);
    let col = C.mul(0x2a2038, 0.9 + 0.2 * hash(x, y, 1311));
    if (d < 30.5) {
      col = 0x3a2a50;
      if (Math.abs(d - 27) < 0.7 || Math.abs(d - 22) < 0.6 || (d > 22 && Math.abs(Math.sin(ang * 6)) < 0.05)) col = 0x9a5cff;
      if (d < 6) col = 0x6a3aa8;
    }
    p.set(x, y, col);
  }
  return p.tex({});
});
PX.def('herbBundle', () => {   // dried herbs and lavender on a cord, hung head down
  const p = new Pix(20, 44);
  p.vl(10, 0, 8, 0x8a7a5a);
  for (let y = 9; y < 40; y++) for (let x = 4; x < 16; x++) { const d = Math.abs(x - 9.5) / (4 + (y - 9) * 0.05); if (d < 1) p.set(x, y, hash(x, y, 1321) > 0.5 ? 0x6a4a9a : 0x4a6a3a); }
  p.hl(5, 14, 38, 0x8a7a5a);
  return p.outline(null, 0.7).tex();
});
PX.def('orbPix', () => {   // a crystal ball with a fog inside it, violet to pale
  const p = new Pix(28, 28), c = 13.5;
  for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) {
    const d = Math.hypot(x - c, y - c) / 13; if (d > 1) continue;
    p.set(x, y, C.mix(0x6a3aff, 0xe8d8ff, clamp(0.9 - d + (x < c && y < c ? 0.4 : 0), 0, 1)));
  }
  p.disc(9, 9, 2, 0xffffff);
  return p.tex({});
});
PX.def('cauldronPix', () => {   // an iron cauldron on three legs, the brew violet and bubbling
  const p = new Pix(40, 40);
  p.rect(9, 35, 3, 4, 0x1a1418); p.rect(28, 35, 3, 4, 0x1a1418);
  p.ell(20, 26, 15, 11, 0x1a1418); p.ell(19, 23, 12, 7, 0x2a2228);
  p.ell(20, 15, 13, 4, 0x6a2ab0); p.ell(18, 14, 7, 2, 0xb880ff); p.set(14, 13, 0xe8d8ff);
  p.hl(6, 34, 26, 0x3a3038);
  return p.outline(null, 0.7).tex();
});
