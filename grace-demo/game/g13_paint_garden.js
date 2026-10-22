/* GARDEN TEXTURES — the queen's garden in late autumn, an hour after the rain: low gold sun from the right, wet
   gravel and flagstones, roses going over, an apple tree turning, the swan fountain, the old king's memorial. */
const PAL = {
  leaf: [0x14240f, 0x1e3616, 0x2c4a1c, 0x3e6226, 0x587c30, 0x7a9a3a],          // greens, dark to sunlit
  gold: [0x4a3410, 0x7a5414, 0xa8741a, 0xd09a26, 0xf0c040, 0xfce07a],          // turning leaves
  rust: [0x4a1a0c, 0x7a2a12, 0xa8401a, 0xd06424, 0xf08a3a],
  box: [0x0e1e10, 0x16301a, 0x22421e, 0x305a26, 0x44742e],                     // clipped boxwood
  stone: [0x5a4e44, 0x7a6c5e, 0x9a8a76, 0xb8a68e, 0xd4c2a6, 0xece0c6],          // warm sandstone in low sun
  marble: [0x6a6a72, 0x8e8e96, 0xb0b0b6, 0xcfcfd2, 0xe8e8ea, 0xffffff],
  bronze: [0x1a2a24, 0x2a463a, 0x3e6450, 0x5a8a6a, 0x8ab08a],
};
/* foliage: an elliptical mass of leaf clusters, shaded toward a light direction, with dithered falloff, gaps of shadow,
   and sunlit specks on the bright side. Used for bushes, crowns, hedges and climbers. */
PX.foliage = function (p, cx, cy, rx, ry, pal, seed, o) {
  o = o || {}; const lx = o.light ? o.light[0] : 0.7, ly = o.light ? o.light[1] : -0.6, n = pal.length;
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, edge = 1 + (noise1(x * 0.45 + y * 0.31, seed) - 0.5) * (o.rough || 0.5) + (hash(x, y, seed + 1) - 0.5) * 0.12;
    const d = Math.hypot(u, v); if (d > edge) continue;
    if (o.flatBottom && v > o.flatBottom) continue;
    const lit = clamp(0.5 + (u * lx + v * ly) * 0.55 + (1 - d) * 0.15, 0, 1), cl = noise1(x * 0.6 + seed, seed + 2) * noise1(y * 0.6, seed + 3);
    let i = Math.floor(lit * (n - 1.2) + (PX.dith(x, y) - 0.5) * 0.9 + (cl - 0.25) * 1.2); if (hash(x, y, seed + 4) < (o.holes || 0.05) * (1.2 - lit)) i = 0;
    if (d > edge - 0.08 && lit < 0.5) i = Math.max(0, i - 1);
    p.set(x, y, pal[clamp(i, 0, n - 1)]);
  }
};
/* small blooms scattered over painted foliage: [ [colour, highlight], … ] */
PX.blooms = function (p, cx, cy, rx, ry, cols, count, seed, size) {
  for (let i = 0; i < count; i++) { const a = hash(i, 1, seed) * 6.283, r = Math.sqrt(hash(i, 2, seed)), x = Math.round(cx + Math.cos(a) * r * rx * 0.9), y = Math.round(cy + Math.sin(a) * r * ry * 0.85);
    if (!p.a(x, y)) continue; const [c, h] = cols[Math.floor(hash(i, 3, seed) * cols.length)];
    if ((size || 2) >= 3) { p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, h); p.set(x, y + 1, C.mul(c, 0.7)); p.set(x, y, C.mul(c, 0.85)); }
    else { p.set(x, y, c); p.set(x + 1, y, C.mul(c, 0.75)); p.set(x, y - 1, h); } }
};
for (const [k, f] of Object.entries({
  /* ---------------------------------------------------------------- ground */
  lawn: () => { const p = new Pix(64, 64), G = [0x1a2e14, 0x24401a, 0x2e5020, 0x3c6228, 0x52782e, 0x6e9038];   // grass after rain, leaves fallen in it
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const n = noise1(x * 0.13 + y * 0.09, 401), blade = hash(x, y >> 1, 402); let i = 2 + (PX.dith(x, y) < n * 0.9 ? 1 : 0) - (n < 0.3 ? 1 : 0);
      if (blade < 0.12) i = 4; else if (blade < 0.16) i = 0; if (hash(x, y, 403) < 0.012) i = 5; p.set(x, y, G[clamp(i, 0, 5)]); }
    for (let i = 0; i < 26; i++) { const x = Math.floor(hash(i, 1, 404) * 64), y = Math.floor(hash(i, 2, 404) * 64), c = [0xd09a26, 0xa8741a, 0xd06424, 0x9a2a22][i % 4]; p.wset(x, y, c); p.wset(x + 1, y, C.mul(c, 0.8)); p.wset(x, y + 1, C.mul(c, 0.7)); }
    for (let i = 0; i < 8; i++) { const x = Math.floor(hash(i, 3, 404) * 64), y = Math.floor(hash(i, 4, 404) * 64); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) p.wset(x + dx, y + dy, 0xf0ece0); p.wset(x, y, 0xf0c040); }   // late daisies
    return p.tex({ repeat: true, aniso: 4 }); },
  gravel: () => { const p = new Pix(32, 32).fill(0x6a5e50);   // pea gravel, dark with the wet
    for (let i = 0; i < 150; i++) { const x = hash(i, 1, 405) * 32, y = hash(i, 2, 405) * 32, r = hash(i, 3, 405) < 0.3 ? 1.6 : 1.1, c = [0x9a8c78, 0x8a7c68, 0xaa9c86, 0x7a6e60, 0xb4a690, 0x8a8478][Math.floor(hash(i, 4, 405) * 6)];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const d = Math.hypot(dx, dy); if (d > r) continue; p.wset(x + dx, y + dy, dx < 0 && dy < 0 ? C.mul(c, 1.18) : dx > 0 && dy > 0 ? C.mul(c, 0.72) : c); } }
    for (let i = 0; i < 40; i++) p.wset(hash(i, 5, 405) * 32, hash(i, 6, 405) * 32, 0xe8e0d0);   // wet glints
    return p.tex({ repeat: true, aniso: 4 }); },
  flags: () => { const p = new Pix(64, 64), seeds = [];   // irregular flagstones round the fountain, moss in the joints
    for (let i = 0; i < 9; i++) seeds.push([hash(i, 1, 406) * 64, hash(i, 2, 406) * 64, Math.floor(hash(i, 3, 406) * 3)]);
    const near = (x, y) => { let a = 1e9, b = 1e9, ai = 0; for (let i = 0; i < seeds.length; i++) for (const ox of [-64, 0, 64]) for (const oy of [-64, 0, 64]) { const d = Math.hypot(x - seeds[i][0] - ox, y - seeds[i][1] - oy); if (d < a) { b = a; a = d; ai = i; } else if (d < b) b = d; } return { a, b, i: ai }; };
    const S = PAL.stone;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const n = near(x + 0.5, y + 0.5), e = n.b - n.a; let c = S[2 + seeds[n.i][2] % 2];
      if (e < 1.2) c = hash(x, y, 407) < 0.5 ? 0x2e3a1e : 0x3e4a26; else if (e < 2.2) c = S[1]; else if (near(x - 1.5, y - 1.5).i !== n.i) c = S[4];
      if (e > 2.2 && hash(x >> 1, y >> 1, 408) < 0.07) c = C.mul(c, 0.88); if (e > 3 && hash(x, y, 409) < 0.015) c = 0xfff4e0; p.set(x, y, c); }
    return p.tex({ repeat: true, aniso: 4 }); },
  hedgeBox: () => { const p = new Pix(32, 32);   // clipped boxwood, for the 3D hedges' sides and tops
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const n = noise1(x * 0.5 + y * 0.35, 410) * 0.6 + hash(x >> 1, y >> 1, 411) * 0.4; let i = Math.floor(n * 4.2);
      if (hash(x, y, 412) < 0.05) i = 0; if (hash(x, y, 413) < 0.04) i = 4; p.set(x, y, PAL.box[clamp(i, 0, 4)]); }
    return p.tex({ repeat: true, aniso: 4 }); },
  plaster: () => { const p = new Pix(32, 32);   // limewashed plaster inside the cloister, warm and a little cracked
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const n = noise1(x * 0.2 + y * 0.15, 414); p.set(x, y, C.ramp([0xb8a48a, 0xc6b296, 0xd2bea2], clamp(n + (hash(x, y, 415) - 0.5) * 0.2, 0, 0.999))); }
    for (let i = 0; i < 3; i++) { let x = hash(i, 1, 416) * 32, y = hash(i, 2, 416) * 32; for (let k = 0; k < 10; k++) { p.wset(x, y, 0x8a7a64); x += hash(i, k, 417) < 0.5 ? 1 : 0; y += 1; } }
    return p.tex({ repeat: true }); },
  /* ---------------------------------------------------------------- planting */
  roseBush: () => { const p = new Pix(56, 40); PX.foliage(p, 28, 22, 26, 18, PAL.leaf, 420, { flatBottom: 0.85, holes: 0.08 });
    PX.blooms(p, 28, 18, 24, 14, [[0xb02030, 0xe86070], [0xc83a4a, 0xf890a0], [0xe8d0c0, 0xffffff]], 26, 421, 3);
    PX.blooms(p, 28, 20, 24, 16, [[0xd8641a, 0xf0a040]], 10, 422, 2);   // hips
    return p.outline(null, 0.6).tex(); },
  lavender: () => { const p = new Pix(48, 26); PX.foliage(p, 24, 20, 23, 7, [0x2a3a2a, 0x3e5040, 0x566a56, 0x728a70], 423, { flatBottom: 0.9 });
    for (let x = 2; x < 46; x += 2) { const h = 7 + Math.floor(hash(x, 1, 424) * 8), lean = (hash(x, 2, 424) - 0.5) * 0.4; for (let j = 0; j < h; j++) { const y = 15 - j, xx = Math.round(x + lean * j); p.set(xx, y, j > h - 6 ? [0x5a3a8a, 0x7a54aa, 0x9a74c8][(j + x) % 3] : 0x4a5a48); } }
    return p.outline(null, 0.65).tex(); },
  asters: () => { const p = new Pix(44, 22); PX.foliage(p, 22, 15, 21, 8, PAL.leaf, 425, { flatBottom: 0.9 });
    PX.blooms(p, 22, 12, 20, 7, [[0x8a74c8, 0xc8b8f0], [0x6a5ab0, 0xa898e0]], 24, 426, 3); for (let i = 0; i < 24; i++) { const x = Math.round(22 + (hash(i, 1, 427) - 0.5) * 36), y = Math.round(12 + (hash(i, 2, 427) - 0.5) * 12); if (p.a(x, y)) p.set(x, y, 0xf0c040); }
    return p.outline(null, 0.6).tex(); },
  mums: () => { const p = new Pix(40, 24); PX.foliage(p, 20, 16, 19, 9, PAL.leaf, 428, { flatBottom: 0.9 });
    PX.blooms(p, 20, 12, 17, 7, [[0xd8762a, 0xf8b050], [0xe8a020, 0xfce07a], [0xa83a1a, 0xe06a3a]], 20, 429, 3); return p.outline(null, 0.6).tex(); },
  foxglove: () => { const p = new Pix(22, 56); PX.foliage(p, 11, 48, 10, 8, PAL.leaf, 430, { flatBottom: 0.9 });
    for (const [x0, h] of [[7, 40], [13, 46], [10, 34]]) { for (let y = 48 - h; y < 44; y++) p.set(x0, y, 0x3e6226); for (let y = 50 - h; y < 40; y += 3) { p.set(x0 - 1, y, 0xc06aa0); p.set(x0 + 1, y + 1, 0xd88ab8); p.set(x0 - 1, y + 1, 0x8a3a6a); } }
    return p.outline(null, 0.6).tex(); },
  climbRose: () => { const p = new Pix(30, 112);   // roses up an arbour post
    for (let y = 0; y < 112; y += 1) { const x = 15 + Math.sin(y * 0.15) * 6; p.set(Math.round(x), y, 0x3a2a14); }
    for (let i = 0; i < 9; i++) PX.foliage(p, 15 + Math.sin(i * 1.7) * 6, 8 + i * 12, 9, 7, PAL.leaf, 431 + i, { holes: 0.12 });
    PX.blooms(p, 15, 56, 13, 54, [[0xb02030, 0xe86070], [0xc83a4a, 0xf890a0]], 34, 440, 3); return p.outline(null, 0.6).tex(); },
  roseSwag: () => { const p = new Pix(96, 30);   // roses trailing along the arbour beam
    for (let i = 0; i < 9; i++) { const x = 6 + i * 10.5, sag = Math.sin((i + 0.5) / 9 * Math.PI) * 6; PX.foliage(p, x, 9 + sag, 8, 7, PAL.leaf, 441 + i, { holes: 0.1 }); }
    for (let i = 0; i < 5; i++) { const x = 10 + i * 19, l = 6 + hash(i, 1, 450) * 10; for (let j = 0; j < l; j++) p.set(x + Math.round(Math.sin(j * 0.6)), 14 + j, PAL.leaf[2 + (j & 1)]); }
    PX.blooms(p, 48, 12, 46, 9, [[0xb02030, 0xe86070], [0xc83a4a, 0xf890a0], [0xe8d0c0, 0xffffff]], 30, 451, 3); return p.outline(null, 0.6).tex(); },
  appleTree: () => { const W = 132, H = 164, p = new Pix(W, H);   // an old apple tree, half turned, apples still on it; sun from the right
    const bark = [0x1e140c, 0x2e2012, 0x46301a, 0x5e4224, 0x7a5a32];
    const limb = (x0, y0, x1, y1, w0, w1) => { for (let t = 0; t <= 1; t += 0.01) { const x = lerp(x0, x1, t) + Math.sin(t * 7 + x0) * 2, y = lerp(y0, y1, t), w = lerp(w0, w1, t);
      for (let k = -w; k <= w; k++) p.set(Math.round(x + k), Math.round(y), bark[clamp(Math.round(2 + (k / w) * 1.6 + (hash(Math.round(x + k), Math.round(y), 452) - 0.5)), 0, 4)]); } };
    limb(62, 163, 60, 100, 6, 4); limb(60, 110, 34, 70, 3.5, 1.5); limb(61, 104, 92, 62, 3.5, 1.5); limb(60, 100, 66, 50, 3, 1.2); limb(46, 88, 22, 92, 2, 1); limb(78, 84, 106, 88, 2, 1);
    for (let x = 52; x < 74; x++) for (let y = 156; y < 164; y++) if (hash(x, y, 453) < 0.5 && Math.abs(x - 62) < 10 - (163 - y)) p.set(x, y, bark[1]);   // root flare
    const crowns = [[64, 74, 52, 30, 0], [40, 56, 30, 26, 1], [88, 54, 32, 26, 0], [64, 38, 34, 26, 1], [30, 82, 20, 14, 0], [100, 82, 22, 15, 1]];   // a round crown, half green, half turned
    crowns.forEach(([x, y, rx, ry, g], i) => PX.foliage(p, x, y, rx, ry, g ? PAL.gold : PAL.leaf.slice(1).concat([0xa8b040]), 454 + i, { holes: 0.1, rough: 0.35 }));
    for (let i = 0; i < 40; i++) { const x = Math.round(14 + hash(i, 1, 460) * 104), y = Math.round(30 + hash(i, 2, 460) * 64); if (!p.a(x, y) || hash(i, 3, 460) < 0.3) continue;
      p.set(x, y, 0xb82018); p.set(x + 1, y, 0x8a1410); p.set(x, y + 1, 0x8a1410); p.set(x + 1, y + 1, 0x6a0e0c); p.set(x, y - 1, 0xf0603a); }   // apples
    return p.outline(null, 0.6).tex(); },
  cypress: () => { const W = 26, H = 120, p = new Pix(W, H);
    for (let y = 0; y < H - 6; y++) { const t = y / (H - 6), hw = Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * 11 + 1; for (let x = 0; x < W; x++) { const u = (x + 0.5 - 13) / hw; if (Math.abs(u) > 1 + (hash(x, y >> 1, 461) - 0.5) * 0.3) continue;
      const lit = clamp(0.45 + u * 0.4 + (noise1(y * 0.4 + x * 0.2, 462) - 0.5) * 0.6, 0, 0.999); p.set(x, y, C.ramp([0x0c1a10, 0x142a18, 0x1e3a1e, 0x2c4e26, 0x3e6230], lit)); } }
    p.rect(12, H - 6, 2, 6, 0x3a2a18); return p.outline(null, 0.6).tex(); },
  topiary: () => { const W = 30, H = 50, p = new Pix(W, H); PX.foliage(p, 15, 14, 13, 13, PAL.box, 463, { rough: 0.25, holes: 0.03 }); p.rect(14, 26, 2, 10, 0x3a2a18);
    for (let y = 34; y < 50; y++) { const hw = 9 - (y - 34) * 0.18; for (let x = Math.round(15 - hw); x <= 15 + hw; x++) p.set(x, y, y < 37 ? 0xc06a3a : C.ramp([0x7a3a1e, 0x9a4a26, 0xb85a2e], clamp(0.3 + (x - 15) / hw * 0.4, 0, 0.999))); }
    p.hl(5, 25, 34, 0xd88a5a); return p.outline(null, 0.6).tex(); },
  urn: () => { const W = 30, H = 34, p = new Pix(W, H); PX.foliage(p, 15, 9, 14, 8, PAL.leaf, 464, { holes: 0.1 }); PX.blooms(p, 15, 7, 12, 6, [[0xd02020, 0xf86050], [0xe84a5a, 0xffa0a0]], 14, 465, 3);
    for (let y = 14; y < 34; y++) { const t = (y - 14) / 20, hw = y < 17 ? 11 : y > 30 ? 6 : 8 + Math.sin(t * Math.PI) * 3; for (let x = Math.round(15 - hw); x <= 15 + hw; x++) p.set(x, y, C.ramp(PAL.stone, clamp(0.35 + (x - 15) / hw * 0.4 + (y === 14 ? 0.3 : 0), 0, 0.999))); }
    return p.outline(null, 0.6).tex(); },
  espalier: () => { const W = 76, H = 88, p = new Pix(W, H);   // a pear trained flat against the wall, three tiers
    for (let y = 20; y < H; y++) { p.set(37, y, 0x3a2a18); p.set(38, y, 0x4e3a22); }
    for (const y of [26, 46, 66]) for (let x = 6; x < 70; x++) { p.set(x, y, 0x3e2c18); if (x % 6 === 0) PX.foliage(p, x, y - 2, 4, 3, PAL.leaf, 466 + x + y, { holes: 0.15 }); }
    PX.foliage(p, 38, 12, 10, 10, PAL.gold, 470, { holes: 0.12 });
    for (let i = 0; i < 14; i++) { const x = 8 + Math.floor(hash(i, 1, 471) * 60), y = [28, 48, 68][i % 3]; p.set(x, y, 0xc8b040); p.set(x, y + 1, 0xb0a030); p.set(x + 1, y + 1, 0x8a8020); p.set(x, y + 2, 0x8a8020); }
    return p.outline(null, 0.65).tex(); },
  ivyWall: () => { const W = 64, H = 96, p = new Pix(W, H);   // ivy climbing the garden wall
    for (let i = 0; i < 26; i++) { const x = 32 + (hash(i, 1, 472) - 0.5) * 50 * (1 - i / 40), y = H - 6 - hash(i, 2, 472) * (H - 10) * (0.4 + 0.6 * (1 - Math.abs(x - 32) / 32)); PX.foliage(p, x, y, 7, 6, [0x0e1e0e, 0x1a3218, 0x284a20, 0x3a6228], 473 + i, { holes: 0.2, rough: 0.9 }); }
    for (let i = 0; i < 18; i++) { const x = Math.round(10 + hash(i, 3, 472) * 44), y = Math.round(20 + hash(i, 4, 472) * 70); if (p.a(x, y)) p.set(x, y, 0xa83a1a); }   // a few leaves gone red
    return p.outline(null, 0.6).tex(); },
  /* ---------------------------------------------------------------- the fountain */
  water: () => { const W = 64, H = 64, n = 4, p = new Pix(W * n, H);   // the basin's surface: sky in it, rings spreading from the jet
    for (let f = 0; f < n; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 32, y - 32), ring = Math.sin(d * 0.7 - f * Math.PI / 2) > 0.75;
      let c = C.mix(0x2a4a5a, 0x5a8a9a, clamp(0.5 + (y - 32) / 70 + noise1(x * 0.2 + f, 474) * 0.3, 0, 1)); if (ring && d < 30) c = C.mix(c, 0xc8e0e8, 0.5); if (hash(x, y, 475 + f) < 0.01) c = 0xfff4d8; p.set(f * W + x, y, c); }
    const t = p.tex({ mip: false }); t.userData.n = n; return t; },
  jet: () => { const W = 26, H = 34, n = 6, p = new Pix(W * n, H);   // water arcing from the swan's beak into the basin
    for (let f = 0; f < n; f++) { for (let t = 0; t <= 1; t += 0.008) { const x = 2 + t * 21, y = 2 + t * t * 30 + Math.sin(t * 20 + f) * 0.3; const w = 0.4 + t * 0.9;
        for (let k = -w; k <= w; k++) if (hash(Math.round(x), Math.round(y + k), 476 + f) < 0.85 - t * 0.3) p.set(f * W + Math.round(x + k * 0.3), Math.round(y + k * 0.4), (Math.round(t * 40) + f) % 7 === 0 ? 0xffffff : k < 0 ? 0xc8e4f0 : 0x8abcd0); }
      for (let i = 0; i < 8; i++) p.set(f * W + 18 + hash(i, f, 477) * 8, 26 + hash(i, f + 9, 477) * 8, 0xd8ecf4); }
    const t = p.tex({ mip: false }); t.userData.n = n; return t; },
  swan: () => { const W = 34, H = 36, p = new Pix(W, H), M = PAL.marble;   // the marble swan on the fountain's column, wings half raised
    p.ell(17, 27, 13, 7, M[3]); p.ell(19, 26, 10, 5, M[4]); for (let y = 10; y < 27; y++) { const x = 7 + (27 - y) * 0.15 + Math.sin(y * 0.3) * 1.5; p.set(Math.round(x), y, M[3]); p.set(Math.round(x) + 1, y, M[4]); p.set(Math.round(x) + 2, y, M[2]); }
    p.ell(8, 9, 3, 2.4, M[4]); p.set(4, 9, 0xd8902a); p.set(5, 9, 0xb8701a); p.set(3, 10, 0xd8902a); p.set(8, 8, 0x2a2a30);
    for (let i = 0; i < 9; i++) for (let k = 0; k < 10 - i; k++) { p.set(18 + i * 1.5 + k * 0.4, 20 - i * 1.2 - k * 0.3, M[k % 2 ? 3 : 4]); p.set(22 + i * 1.3, 22 - i * 1.4 - k * 0.2, M[2]); }
    for (let y = 30; y < H; y++) p.hl(9, 25, y, M[1 + (y & 1)]); return p.outline(null, 0.55).tex(); },
  /* ---------------------------------------------------------------- the memorial, the arcade, the gate */
  memorial: () => { const W = 44, H = 92, p = new Pix(W, H), B = PAL.bronze, S = PAL.stone;   // Bolesław in green bronze: crowned, both hands on the sword's pommel
    for (let y = 58; y < H; y++) for (let x = 6; x < 38; x++) { let c = S[2 + ((x - 6) < 3 ? 1 : 0) - ((37 - x) < 3 ? 1 : 0)]; if (y === 58 || y === 66 || y === H - 6) c = S[4]; if (y === 59 || y === 67 || y === H - 5) c = S[1];
      if (y > 70 && y < 82 && x > 11 && x < 33 && (y - 71) % 3 === 0 && hash(x, y, 478) < 0.75) c = S[0]; p.set(x, y, c); }   // plinth with an inscription
    for (let y = 54; y < 58; y++) p.hl(8, 35, y, S[3]);
    const fig = (x, y) => { const cx = 22; if (y < 4 || y > 54) return false; if (y < 12) return Math.hypot(x - cx, y - 9) < 4.2; if (y < 15) return Math.abs(x - cx) < 2; if (y < 40) return Math.abs(x - cx) < 7 + (y - 15) * 0.18; return Math.abs(x - cx) < 9 + (y - 40) * 0.12 && !(y > 44 && Math.abs(x - cx) < 1); };
    for (let y = 0; y < 58; y++) for (let x = 0; x < W; x++) if (fig(x, y)) { const lit = clamp(0.4 + (x - 22) / 18 + (noise1(x * 0.4 + y * 0.3, 479) - 0.5) * 0.4, 0, 0.999); p.set(x, y, C.ramp(B, lit)); }
    for (let x = 18; x <= 26; x++) p.set(x, 5, 0x9ab878); for (const x of [18, 20, 22, 24, 26]) p.set(x, 4, 0xb0c890);   // crown
    for (let y = 24; y < 56; y++) { p.set(22, y, y < 30 ? B[1] : 0x8aa0a0); p.set(23, y, y < 30 ? B[1] : 0xb8c8c8); } p.hl(17, 28, 29, B[4]);   // the sword, point down
    return p.outline(null, 0.6).tex(); },
  wreath: () => { const p = new Pix(22, 22); for (let a = 0; a < 6.283; a += 0.05) for (let r = 6; r < 10; r++) { const x = 11 + Math.cos(a) * r, y = 11 + Math.sin(a) * r; p.set(x, y, PAL.leaf[2 + ((a * 9 + r) | 0) % 3]); }
    for (const [x, y] of [[8, 17], [14, 18], [11, 19]]) { p.set(x, y, 0xb02020); p.set(x + 1, y, 0xd84040); } p.rect(9, 18, 4, 4, 0xa81818); return p.outline(null, 0.6).tex(); },
  arcade: () => { const W = 80, H = 160, p = new Pix(W, H), S = PAL.stone, cx = 39.5, spring = 74, r = 32;   // one bay of the cloister: a round arch on capitals, voussoirs, the wall above
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const inArch = (y >= spring && Math.abs(x + 0.5 - cx) < r) || (y < spring && Math.hypot(x + 0.5 - cx, y - spring) < r); if (inArch) continue;
      const ring = y < spring + 2 && Math.hypot(x + 0.5 - cx, y - spring) < r + 6, a = Math.atan2(spring - y, x + 0.5 - cx);
      let c; if (ring) { const v = Math.floor(a / Math.PI * 13); c = S[(v & 1) ? 3 : 4]; if (Math.hypot(x + 0.5 - cx, y - spring) > r + 5) c = S[1]; if (Math.abs(((a / Math.PI * 13) % 1)) < 0.08) c = S[1]; }
      else { const row = Math.floor(y / 10), bx = Math.floor((x + (row % 2) * 10) / 20); c = S[2 + (hash(bx, row, 480) < 0.4 ? 1 : 0)]; if (y % 10 === 9 || (x + (row % 2) * 10) % 20 === 19) c = S[1]; if (y % 10 === 0) c = C.mul(c, 1.06); }
      if (y > spring - 3 && y < spring + 4 && (x < 9 || x > W - 10)) c = y === spring - 3 ? S[5] : S[4];   // capitals
      p.set(x, y, c); }
    return p.tex(); },
  gardenGate: () => { const W = 70, H = 108, p = new Pix(W, H), S = PAL.stone, cx = 34.5, top = 34;   // the oak gate to the training yard, in a stone arch
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const inA = y >= top ? Math.abs(x + 0.5 - cx) < 28 : Math.hypot(x + 0.5 - cx, y - top) < 28; const ring = !inA && (y >= top ? Math.abs(x + 0.5 - cx) < 35 : Math.hypot(x + 0.5 - cx, y - top) < 35);
      if (!inA && !ring) continue; if (ring) { const a = Math.atan2(top - y, x - cx); p.set(x, y, y < top ? S[(Math.floor(a * 6) & 1) ? 3 : 4] : S[2 + ((y >> 3) & 1)]); continue; }
      const plank = Math.floor((x - 7) / 7), g = noise1(y * 0.4 + plank * 9, 481); let c = (x - 7) % 7 === 0 || x === 34 ? 0x1e1008 : C.mul(0x6a4422, 0.8 + 0.35 * g);
      if (y === 52 || y === 53 || y === 88 || y === 89) c = y & 1 ? 0x4a4440 : 0x2a2622; if ((y === 52 || y === 88) && (x % 5 === 0)) c = 0x9a9288; p.set(x, y, c); }
    p.disc(29, 70, 2, 0x2a2622); p.disc(29, 70, 1, 0xa8a090); p.disc(40, 70, 2, 0x2a2622); p.disc(40, 70, 1, 0xa8a090);
    return p.tex(); },
  benchStone: () => { const p = new Pix(64, 16), S = PAL.stone;   // the queen's bench: a carved stone seat
    for (let y = 0; y < 16; y++) for (let x = 0; x < 64; x++) { let c = S[3]; if (y < 3) c = y === 0 ? S[5] : S[4]; else if (x > 8 && x < 56 && y > 4) c = S[1 + (y > 12 ? 0 : 1)]; if ((x === 8 || x === 55) && y > 3) c = S[4]; if (y === 15) c = S[0]; p.set(x, y, c); }
    for (const cx of [4, 59]) for (let y = 6; y < 14; y++) p.set(cx, y, S[2]); return p.tex(); },
  /* ---------------------------------------------------------------- small things */
  letters: () => { const p = new Pix(14, 8); p.rect(0, 2, 10, 6, 0xe8dcc0); p.rect(3, 0, 10, 6, 0xf4ead4); p.hl(4, 11, 2, 0x8a7a6a); p.hl(4, 10, 4, 0x8a7a6a); p.disc(10, 4, 1, 0x2a5aa8); return p.outline(null, 0.7).tex(); },
  basket: () => { const p = new Pix(18, 13); for (let y = 4; y < 13; y++) for (let x = 1; x < 17; x++) p.set(x, y, (x + y) % 3 === 0 ? 0x5a3a1a : 0x8a6234); p.hl(1, 16, 4, 0xa87a44);
    for (const x of [4, 7, 10, 13]) { p.disc(x, 3, 1.6, 0xb82018); p.set(x - 1, 2, 0xf0603a); } return p.outline(null, 0.6).tex(); },
  can: () => { const p = new Pix(16, 12); p.rect(3, 3, 8, 9, 0x5a6a6a); p.hl(3, 10, 3, 0x8a9a9a); p.line(11, 6, 15, 2, 0x5a6a6a); p.rect(14, 1, 2, 2, 0x4a5a5a); p.line(4, 3, 7, 0, 0x4a5a5a); p.line(7, 0, 10, 3, 0x4a5a5a); return p.outline(null, 0.6).tex(); },
  pell: () => { const W = 18, H = 62, p = new Pix(W, H);   // a practice post wrapped in straw, hacked about
    for (let y = 0; y < H; y++) for (let x = 5; x < 13; x++) p.set(x, y, C.mul(0x6a4a2a, 0.8 + 0.3 * noise1(y * 0.5 + x, 482)));
    for (let y = 6; y < 38; y++) for (let x = 3; x < 15; x++) { const c = (y + x * 3) % 5 === 0 ? 0x8a6a2a : (x + y) % 3 ? 0xc8a050 : 0xd8b860; p.set(x, y, c); }
    for (const y of [8, 22, 36]) p.hl(3, 14, y, 0x4a3a2a); for (let i = 0; i < 10; i++) { const y = 10 + hash(i, 1, 483) * 26, x = 4 + hash(i, 2, 483) * 9; p.set(x, y, 0x5a3a1a); p.set(x + 1, y - 1, 0x5a3a1a); }
    for (let x = 1; x < 17; x++) { p.set(x, H - 1, 0x3a2a18); p.set(x, H - 2, 0x4a3a22); } return p.outline(null, 0.6).tex(); },
  leafFrames: () => { const n = 4, p = new Pix(5 * n, 4), cols = [[0xd09a26, 0xf0c040], [0xd06424, 0xf08a3a], [0x9a2a22, 0xc04030], [0x7a5414, 0xa8741a]];
    for (let f = 0; f < n; f++) { const [a, b] = cols[f]; p.set(f * 5 + 1, 1, b); p.set(f * 5 + 2, 1, a); p.set(f * 5 + 3, 2, a); p.set(f * 5 + 2, 2, b); p.set(f * 5 + 1, 2, a); p.set(f * 5 + 2, 3, C.mul(a, 0.7)); p.set(f * 5 + 0, 1, C.mul(a, 0.8)); }
    const t = p.tex(); t.userData.n = n; return t; },
  crowGround: () => { const W = 14, H = 12, n = 5, p = new Pix(W * n, H);   // idle, pecking, head up, two wingbeats
    const body = (o, dy, headX, headY) => { p.ell(o + 7, 8 + dy, 4, 2.6, 0x14141c); p.ell(o + 6, 7.5 + dy, 3, 1.6, 0x24242e); p.disc(o + headX, headY + dy, 1.8, 0x14141c); p.set(o + headX - 2, headY + dy, 0x3a3a3a); p.set(o + headX - 3, headY + dy + (headY > 8 ? 1 : 0), 0x3a3a3a); p.set(o + headX, headY + dy - 1, 0x8a8aa0);
      p.hl(o + 10, o + 12, 7 + dy, 0x14141c); p.set(o + 6, 11, 0x2a2a2a); p.set(o + 8, 11, 0x2a2a2a); };
    body(0, 0, 3.5, 6); body(W, 1, 3, 10); body(W * 2, 0, 4, 4.5);
    for (const [f, up] of [[3, 1], [4, 0]]) { const o = f * W; p.ell(o + 7, 7, 3.4, 1.4, 0x14141c); p.disc(o + 3, 6.5, 1.4, 0x14141c); p.set(o + 1, 6, 0x3a3a3a); p.hl(o + 10, o + 12, 7, 0x14141c);   // body, head, tail
      for (let i = 0; i < 5; i++) { const y = up ? 6 - i * 1.1 : 8 + i * 0.9, w = 3 - Math.floor(i / 2); for (let k = 0; k < w; k++) p.set(o + 5 + i + k * 0.5, y + (up ? k * 0.4 : -k * 0.4), k === 0 ? 0x2a2a3a : 0x14141c); } }
    for (let i = 0; i < W * n; i++) for (let y = 0; y < H; y++) if (p.get(i, y) === 0x24242e && hash(i, y, 488) < 0.5) p.set(i, y, 0x3a4058);   // a blue-black sheen
    const t = p.tex(); t.userData.n = n; return t; },
  butterfly: () => { const n = 2, p = new Pix(7 * n, 5); for (const [f, w] of [[0, 3], [1, 1]]) { const o = f * 7; for (let k = 0; k < w; k++) { p.set(o + 2 - k, 1, 0xf0a030); p.set(o + 4 + k, 1, 0xf0a030); p.set(o + 2 - k, 2, 0xd8701a); p.set(o + 4 + k, 2, 0xd8701a); p.set(o + 2 - k, 3, 0x2a1a0a); p.set(o + 4 + k, 3, 0x2a1a0a); } p.vl(o + 3, 1, 3, 0x1a1008); }
    const t = p.tex(); t.userData.n = n; return t; },
  ridgeDay: () => PX.ridge(512, 64, 487, 0x8a9a8a, 0xb8c0b0, 0xc8c8a8, 0x5a6a50),   // far hills in the afternoon haze, woods along the foot
  /* ---------------------------------------------------------------- the sky over the garden: after the rain, the sun low in the west (right) */
  skyAfternoon: () => { const W = 512, H = 200, p = new Pix(W, H), S = [0x3a5a8a, 0x4a6a98, 0x5a7aa6, 0x6e8cb2, 0x86a0bc, 0xa2b4c4, 0xc8c0b8, 0xe8c8a0, 0xf8d890], sx = W * 0.86, sy = H * 0.78;
    const cloud = (x, y) => { const n = noise1(x * 0.014 + noise1(y * 0.05, 484) * 1.4, 485) * 0.6 + noise1(x * 0.05 + y * 0.07, 486) * 0.4; return n - (0.6 - 0.22 * Math.pow(Math.abs(y / H - 0.38) * 2, 2)); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sd = Math.hypot((x - sx) * 0.6, y - sy), glow = Math.max(0, 1 - sd / 120) * 2.6, t = Math.pow(y / H, 1.5) * (S.length - 1.01) + glow;
      let c = S[clamp(Math.floor(t + (PX.dith(x, y) - 0.5) * 0.3), 0, S.length - 1)];
      const cl = cloud(x, y); if (cl > 0) { const below = cloud(x, y + 2) <= 0, above = cloud(x, y - 2) <= 0, warm = Math.max(0, 1 - sd / 260);
        const CL = [0x6a6a8a, 0x8a84a0, 0xa89cb0, 0xd8b0a0, 0xf0c890, 0xfce8b8]; let i = cl > 0.1 ? 1 : 2; if (below) i = 3 + (warm > 0.4 ? 2 : warm > 0.15 ? 1 : 0); else if (above) i = 2 + (warm > 0.3 ? 1 : 0); else if (PX.dith(x, y) < warm * 0.6) i++; c = CL[clamp(i, 0, 5)]; }
      if (sd < 7) c = 0xfff8e0; p.set(x, y, c); }
    return p.tex({ mip: false }); },
})) PX.def(k, f);
