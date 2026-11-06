/* THE SWAN FESTIVAL — pixel painters for the three festival grounds (the fair, the lists, the pavilions). Midsummer
   afternoon, the sun from the west (left): every painted thing is lit on its left and top edges. Bright, saturated
   livery colours: Lodmir's swan blue and white, Krasna's red and white, the League's river teal and gold. */
const FP = {
  red: [0x4a0e0c, 0x7a1a16, 0xa82a24, 0xcc4436, 0xe8705a],
  white: [0x9a9284, 0xbcb4a4, 0xdcd4c2, 0xf0e8d8, 0xfffaf0],
  blue: [0x101a30, 0x1e2e52, 0x2c4478, 0x3c5ea0, 0x5a7cc0],
  gold: [0x6a4410, 0x9a6a1c, 0xc8962a, 0xe8b840, 0xf8dc78],
  green: [0x16300e, 0x244a18, 0x346a22, 0x4a8a2e, 0x6aaa42],
  wood: [0x1e1208, 0x3a2414, 0x5a3a20, 0x7a522e, 0x9a6c3e, 0xbc8a52],
  teal: [0x0c2a2a, 0x14404a, 0x1e5a5e, 0x2e7a78, 0x4a9a92],
  steel: [0x22262e, 0x3e444e, 0x5e6670, 0x8a929c, 0xb8c0c8, 0xe8eef2],
  black: [0x0c0c10, 0x16161c, 0x22222a, 0x30303a, 0x46465a],
  skins: [0xf0c8a8, 0xd8a88a, 0xb88a6a, 0x8a5a3a, 0x5a3a24],
};
/* vertical stripes, a lit top and a shaded bottom; scallop: a dagged lower edge (an awning's valance) */
PX.stripes = function (W, H, a, b, n, scallop) {
  const p = new Pix(W, H), sw = W / n;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (scallop && y > H - 6) { const u = ((x % sw) / sw - 0.5) * 2; if (y - (H - 6) > 5 * (1 - u * u)) continue; }
    const base = Math.floor(x / sw) % 2 ? b : a, fold = 0.92 + 0.14 * Math.sin((x % sw) / sw * Math.PI);   // each stripe a soft fold
    p.set(x, y, C.mul(base, fold * (y < 2 ? 1.12 : y > H - 8 ? 0.84 : 1)));
  }
  return p;
};
/* a stall's counter: planks on top, a cloth skirt in front, a shadow under the lip */
PX.counter = function (p, x0, x1, y0, H, skirt) {
  const Wd = FP.wood;
  for (let x = x0; x < x1; x++) { p.set(x, y0, Wd[5]); p.set(x, y0 + 1, Wd[4]); p.set(x, y0 + 2, Wd[2]); }
  for (let y = y0 + 3; y < H; y++) for (let x = x0; x < x1; x++) { const k = (x - x0) % 6 === 0 ? 0.78 : 1; p.set(x, y, C.mul(skirt, k * (y === y0 + 3 ? 0.7 : 1))); }
  for (let x = x0; x < x1; x += 4) p.set(x + 1, H - 1, C.mul(skirt, 0.6));
};
/* a crowd: rows of heads and shoulders in market colours, lit from the left; arms up here and there (cheering) */
PX.crowd = function (W, H, seed, rows) {
  const p = new Pix(W, H), cloth = [0xa82a24, 0x2c4478, 0x346a22, 0xc8962a, 0x6a4a2a, 0xdcd4c2, 0x5a3a6a, 0x7a1a16, 0x8a6a3a];
  for (let r = 0; r < (rows || 2); r++) {
    const by = H - 2 - r * 9;
    for (let x = -4 + r * 4; x < W + 6; x += 7 + Math.floor(hash(x, r, seed) * 4)) {
      const sk = FP.skins[Math.floor(hash(x, r, seed + 1) * FP.skins.length)], cl = cloth[Math.floor(hash(x, r, seed + 2) * cloth.length)], hy = by - 12 - Math.floor(hash(x, r, seed + 3) * 3);
      p.ell(x, by - 3, 5, 6, cl); p.ell(x - 1, by - 5, 3, 3, C.mul(cl, 1.2));
      p.disc(x, hy, 2.8, sk); p.set(x - 1, hy - 1, C.mul(sk, 1.15));
      const hat = hash(x, r, seed + 4); if (hat < 0.3) p.hl(x - 3, x + 3, hy - 2, cl === 0xdcd4c2 ? 0x3a2a1a : 0xdcd4c2); else if (hat < 0.6) { p.hl(x - 2, x + 2, hy - 3, 0x3a2414); p.hl(x - 2, x + 2, hy - 2, 0x5a3a20); }
      if (hash(x, r, seed + 5) < 0.18) { p.line(x + 3, by - 6, x + 5, hy - 5, cl); p.disc(x + 5, hy - 6, 1, sk); }   // an arm up
    }
  }
  return p.outline(null, 0.7);
};
/* a burst of fire blown from a fire-spitter's mouth, facing right: n frames from a lick of flame to a ball to smoke */
PX.blastFrames = function (W, H, n) {
  const p = new Pix(W * n, H), cols = [0x8a1a08, 0xc83a10, 0xf06a18, 0xffa02c, 0xffd250, 0xfff0a8];
  for (let f = 0; f < n; f++) { const t = (f + 1) / n, ox = f * W, len = W * (0.25 + 0.75 * Math.min(1, t * 1.6)), rad = H * 0.48 * Math.min(1, t * 1.3), fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = x / len; if (u > 1) continue; const r = rad * Math.sqrt(u) * (0.9 + 0.2 * noise1(x * 0.4 + f * 3, 931)), d = Math.abs(y - H / 2) / Math.max(1, r);
      if (d > 1) continue; const heat = (1 - d) * (1 - u * 0.6) * fade + (noise1(x * 0.6 + y * 0.5 + f * 7, 932) - 0.5) * 0.35;
      if (heat < 0.08) { if (t > 0.6 && hash(x, y, 933 + f) < 0.4) p.set(ox + x, y, 0x4a4040); continue; } p.set(ox + x, y, cols[clamp(Math.floor(heat * cols.length * 1.1), 0, cols.length - 1)]); } }
  const tx = p.tex({ mip: false }); tx.userData.n = n; return tx;
};
for (const [k, f] of Object.entries({
  skySummer: () => { const W = 512, H = 200, p = new Pix(W, H), S = [0x2a5ab0, 0x346ab8, 0x407ac0, 0x5088c8, 0x669ad0, 0x82b0da, 0xa2c6e2, 0xc4dcea, 0xdce8ee];   // high summer: deep blue, piled white cumulus
    const cloud = (x, y) => { const n = noise1(x * 0.014 + noise1(y * 0.05, 812) * 1.4, 813) * 0.55 + noise1(x * 0.045 + 3.1, 814) * noise1(y * 0.07 + 1.3, 815) * 0.9; return n - (0.76 - 0.26 * Math.pow(Math.abs(y / H - 0.42) * 2, 2)); };   // mostly blue: a fair-weather sky
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = Math.pow(y / H, 1.15) * (S.length - 1.01); let c = S[clamp(Math.floor(t + (PX.dith(x, y) - 0.5) * 0.3), 0, S.length - 1)];
      const cl = cloud(x, y); if (cl > 0) { const top = cloud(x, y - 2) <= 0, bot = cloud(x, y + 3) <= 0, CL = [0xa8b4c4, 0xc8d2dc, 0xe4eaf0, 0xf6f8fa, 0xffffff]; let i = cl > 0.12 ? 2 : 3; if (bot) i = cl > 0.05 ? 1 : 0; if (top || cloud(x - 2, y - 2) <= 0) i = 4; c = CL[i]; }
      p.set(x, y, c); }
    return p.tex({ mip: false }); },
  fairGround: () => { const p = new Pix(64, 64), G = [0x2a4418, 0x36561e, 0x446a26, 0x547c2e, 0x688e38], D = [0x5a4630, 0x6e563a, 0x846a48], S = [0xa8904a, 0xc8ac5a];   // trampled meadow: worn earth where the crowd walks, straw, daisies
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const wear = noise1(x * 0.07 + 2.3, 821) * noise1(y * 0.09 + 5.1, 822), g = hash(x >> 1, y, 823);
      let c = G[clamp(2 + (PX.dith(x, y) < 0.5 ? 1 : 0) - (g < 0.25 ? 1 : 0) + (g > 0.9 ? 1 : 0), 0, 4)];
      if (wear > 0.34) c = D[clamp(Math.floor((wear - 0.34) * 18 + PX.dith(x, y) * 0.8), 0, 2)]; else if (wear > 0.29) c = G[0];
      const h = hash(x, y, 824); if (h < 0.03) c = S[h < 0.015 ? 0 : 1]; else if (h > 0.992) c = h > 0.996 ? 0xf8f8f0 : 0xf0d040;
      p.set(x, y, c); }
    return p.tex({ repeat: true, aniso: 4 }); },
  awningRed: () => PX.stripes(64, 28, 0xb8302a, 0xf0e8d8, 8, true).tex({}),
  awningBlue: () => PX.stripes(64, 28, 0x2c4478, 0xe8c040, 8, true).tex({}),
  awningGreen: () => PX.stripes(64, 28, 0x2e6a3a, 0xf0e8d8, 8, true).tex({}),
  canvasKrasna: () => PX.stripes(64, 64, 0xa82a24, 0xf0e8d8, 8, false).tex({ repeat: true }),
  canvasLilac: () => PX.stripes(64, 64, 0x6a4a8a, 0xe8e0f0, 8, false).tex({ repeat: true }),
  canvasBlack: () => PX.stripes(64, 64, 0x16161c, 0x24242c, 8, false).tex({ repeat: true }),
  canvasTeal: () => PX.stripes(64, 64, 0x1e5a5e, 0xe8c040, 8, false).tex({ repeat: true }),
  canvasSwan: () => PX.stripes(64, 64, 0x2c4478, 0xf0e8d8, 8, false).tex({ repeat: true }),
  bunting: () => { const W = 128, H = 16, p = new Pix(W, H), cols = [0xb8302a, 0xf0e8d8, 0x2c4478, 0xe8b840, 0x346a22];   // flags on a sagging string
    const sy = (x) => 2 + Math.sin(x / W * Math.PI) * 4;
    for (let x = 0; x < W; x++) p.set(x, Math.round(sy(x)), 0x5a4a3a);
    for (let i = 0; i < 16; i++) { const x0 = i * 8 + 1, c = cols[i % cols.length]; for (let dx = 0; dx < 6; dx++) { const y0 = Math.round(sy(x0 + dx)) + 1, len = 7 - Math.abs(dx - 2.5) * 2; for (let dy = 0; dy < len; dy++) p.set(x0 + dx, y0 + dy, dx < 2 ? C.mul(c, 1.12) : c); } }
    return p.tex({}); },
  stallHoney: () => { const W = 64, H = 40, p = new Pix(W, H);   // honey cakes, jars of amber honey, a beehive sign
    PX.counter(p, 1, W - 1, 22, H, 0x2c4478);
    for (let i = 0; i < 6; i++) { const x = 6 + i * 6, y = 19; p.ell(x, y, 2.6, 1.6, 0xc8862a); p.hl(x - 1, x + 1, y - 1, 0xe8b850); }
    for (let i = 0; i < 4; i++) { const x = 44 + i * 5; p.rect(x, 13, 4, 8, 0xc8861a); p.rect(x, 13, 4, 2, 0xe8dcc0); p.vl(x, 15, 20, 0xf0b840); }
    p.ell(32, 7, 6, 5, 0xc8962a); for (let k = 0; k < 4; k++) p.hl(27, 37, 4 + k * 2, 0x9a6a1c); p.rect(31, 9, 2, 2, 0x3a2414); p.vl(32, 0, 2, 0x5a4a3a);
    return p.outline(null, 0.6).tex(); },
  stallSausage: () => { const W = 64, H = 40, p = new Pix(W, H);   // the sausage grill: coals, sausages, strings of them hanging
    PX.counter(p, 1, W - 1, 22, H, 0x7a1a16);
    p.rect(8, 16, 30, 6, 0x2a2420); for (let x = 9; x < 37; x++) p.set(x, 20, hash(x, 1, 841) < 0.5 ? 0xf06a18 : 0xc83a10);
    for (let i = 0; i < 6; i++) { p.rect(10 + i * 4, 15, 3, 2, 0x8a3a1a); p.set(10 + i * 4, 15, 0xb85a2a); }
    for (let s = 0; s < 3; s++) for (let i = 0; i < 4; i++) { const x = 44 + s * 6, y = 2 + i * 4; p.ell(x, y + 2, 1.6, 2, 0x8a3a1a); p.set(x - 1, y + 1, 0xb85a2a); }
    p.hl(40, 62, 1, 0x5a4a3a);
    return p.outline(null, 0.6).tex(); },
  stallRibbons: () => { const W = 64, H = 44, p = new Pix(W, H), cols = [0xb8302a, 0x2c4478, 0xe8b840, 0x346a22, 0xd8a8c8, 0xf0e8d8, 0x5a3a6a];   // ribbons hanging from a rail, bolts of cloth
    p.hl(2, W - 3, 2, FP.wood[4]); p.hl(2, W - 3, 3, FP.wood[2]);
    for (let i = 0; i < 14; i++) { const x = 4 + i * 4, c = cols[i % cols.length], len = 14 + Math.floor(hash(i, 1, 851) * 10); for (let y = 4; y < 4 + len; y++) { p.set(x + Math.sin(y * 0.4 + i) * 0.6, y, c); p.set(x + 1 + Math.sin(y * 0.4 + i) * 0.6, y, C.mul(c, 0.8)); } }
    PX.counter(p, 1, W - 1, 30, H, 0x5a3a6a);
    for (let i = 0; i < 5; i++) { const x = 6 + i * 11, c = cols[(i * 3) % cols.length]; p.ell(x, 27, 5, 3, c); p.ell(x - 1, 26, 3, 1.4, C.mul(c, 1.2)); }
    return p.outline(null, 0.6).tex(); },
  stallBread: () => { const W = 64, H = 40, p = new Pix(W, H);   // Marta's bread: loaves, plaited rings, a basket of rolls
    PX.counter(p, 1, W - 1, 22, H, 0x6a5a3a);
    for (let i = 0; i < 4; i++) { const x = 8 + i * 9; p.ell(x, 18, 4, 3, 0xa8702a); p.ell(x - 1, 17, 2.5, 1.5, 0xd09a48); p.set(x - 2, 17, 0xe8c070); p.set(x + 1, 18, 0x8a5a20); }
    for (const x of [46, 55]) { for (let a = 0; a < 6.28; a += 0.3) p.set(x + Math.cos(a) * 3.5, 15 + Math.sin(a) * 2.5, 0xb8803a); p.set(x, 13, 0xe8c070); }
    p.ell(30, 10, 6, 3, 0x8a6a3a); for (let i = 0; i < 4; i++) p.disc(27 + i * 2, 8, 1.4, 0xd09a48);
    return p.outline(null, 0.6).tex(); },
  stageCurtain: () => { const W = 96, H = 64, p = new Pix(W, H);   // the Salamanders' backcloth: red velvet in folds, gold fringe, a painted salamander in a sun
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const f = Math.sin(x / W * Math.PI * 9), k = 0.72 + 0.28 * (f * 0.5 + 0.5); p.set(x, y, C.mul(0xa82a24, k * (y < 6 ? 1.1 : 1))); }
    for (let x = 0; x < W; x++) { p.set(x, H - 3, 0xe8b840); p.set(x, H - 2, x % 2 ? 0xc8962a : 0xe8b840); if (x % 3 === 0) p.set(x, H - 1, 0xc8962a); }
    for (let a = 0; a < 6.28; a += 0.26) { for (let r = 11; r < 16; r++) p.set(48 + Math.cos(a) * r, 30 + Math.sin(a) * r * 0.9, r < 13 ? 0xf8dc78 : 0xe8b840); }
    p.disc(48, 30, 10, 0xe8b840); p.disc(48, 30, 8, 0xf8dc78);
    for (let i = 0; i < 16; i++) { const t = i / 15, x = 40 + t * 16, y = 30 + Math.sin(t * 6) * 3; p.disc(x, y, 1.6 - t * 0.6, 0x2a6a2a); }   // the salamander, curled in the sun
    p.set(56, 29, 0x0e0a08); for (const [x, y] of [[43, 33], [45, 27], [51, 33], [53, 27]]) p.set(x, y, 0x2a6a2a);
    return p.tex({}); },
  puppetBooth: () => { const W = 48, H = 84, p = new Pix(W, H);   // a tall booth of striped cloth, a stage window at the top with its little curtains
    for (let y = 22; y < H; y++) for (let x = 2; x < W - 2; x++) p.set(x, y, C.mul((x >> 2) % 2 ? 0xe8b840 : 0xa82a24, y > H - 4 ? 0.8 : 1));
    for (let y = 2; y < 24; y++) for (let x = 2; x < W - 2; x++) { const inside = y > 6 && y < 22 && x > 6 && x < W - 7; p.set(x, y, inside ? 0x1a1214 : C.mul(0x2c4478, y < 5 ? 1.15 : 1)); }
    for (let y = 7; y < 22; y++) { p.set(7, y, 0xa82a24); p.set(8, y, 0xa82a24); p.set(W - 9, y, 0xa82a24); p.set(W - 8, y, 0xa82a24); }
    p.hl(4, W - 5, 21, 0xe8b840); p.hl(4, W - 5, 22, 0x9a6a1c);
    for (let x = 4; x < W - 4; x += 4) { p.set(x, 0, 0xe8b840); p.set(x + 1, 1, 0xe8b840); }
    return p.outline(null, 0.6).tex(); },
  puppets: () => { const W = 30, H = 16, n = 3, p = new Pix(W * n, H);   // the king puppet (crown, beard) and the river-wife (blue, long hair), bobbing
    for (let f = 0; f < n; f++) { const o = f * W, b1 = [0, 2, 1][f], b2 = [2, 0, 1][f];
      p.rect(o + 5, 8 + b1, 7, 8 - b1, 0x2b2c38); p.disc(o + 8, 5 + b1, 3, 0xe8b896); p.hl(o + 6, o + 10, 1 + b1, 0xe8b840); p.set(o + 6, b1, 0xe8b840); p.set(o + 10, b1, 0xe8b840); p.hl(o + 6, o + 10, 7 + b1, 0x1a1210);
      p.rect(o + 18, 8 + b2, 7, 8 - b2, 0x2c6aa0); p.disc(o + 21, 5 + b2, 3, 0xf0c8a8); p.vl(o + 18, 3 + b2, 12 + b2, 0x3a6a8a); p.vl(o + 24, 3 + b2, 12 + b2, 0x3a6a8a);
      if (f === 2) p.line(o + 12, 9, o + 17, 9, 0xe8b896); }
    const t = p.outline(null, 0.6).tex({ mip: false }); t.userData.n = n; return t; },
  fortuneWagon: () => { const W = 96, H = 76, p = new Pix(W, H), Wd = FP.wood;   // a painted wagon: curved green roof, red body with gold scrolls, a lamp-lit window, wheels
    for (let y = 12; y < 54; y++) for (let x = 10; x < 86; x++) { let c = 0x7a1a16; if (x < 13 || x > 82 || y > 51) c = 0x4a0e0c; if ((x - 10) % 18 === 0) c = 0xc8962a; p.set(x, y, c); }
    for (let x = 6; x < 90; x++) { const top = 12 - Math.sin((x - 6) / 84 * Math.PI) * 9; for (let y = Math.floor(top); y < 13; y++) p.set(x, y, y < top + 2 ? 0x4a8a2e : 0x2e6a22); }
    p.rect(52, 22, 14, 12, 0x3a2414); p.rect(53, 23, 12, 10, 0xf8c860); p.vl(59, 23, 32, 0x3a2414); p.hl(53, 64, 28, 0x3a2414);   // the lit window
    p.rect(22, 20, 14, 31, 0x5a3a20); p.rect(23, 21, 12, 29, 0x7a522e); p.set(33, 36, 0xe8b840);   // the door
    for (let i = 0; i < 6; i++) { p.set(70 + Math.cos(i) * 4, 40 + Math.sin(i) * 3, 0xe8b840); } p.disc(70, 40, 1.6, 0x2c4478); p.set(70, 40, 0xf0e8d8);   // an eye, painted
    for (const cx of [26, 72]) { for (let a = 0; a < 6.283; a += 0.03) for (let r = 9; r < 12; r++) p.set(cx + Math.cos(a) * r, 62 + Math.sin(a) * r, r === 11 ? 0x2a2420 : Wd[4 - (r - 9)]);
      for (let s = 0; s < 10; s++) { const a = s / 10 * 6.283; for (let r = 2; r < 9; r++) p.set(cx + Math.cos(a) * r, 62 + Math.sin(a) * r, 0xc8962a); } p.disc(cx, 62, 2, 0x5a3a20); }
    for (let i = 0; i < 4; i++) p.hl(4 + i * 2, 12 - i, 54 + i * 4, Wd[3]);   // steps
    p.vl(88, 20, 30, 0x3a3a3a); p.rect(86, 30, 5, 6, 0x3a3a3a); p.rect(87, 31, 3, 4, 0xf8c860);   // a lantern on a hook
    return p.outline(null, 0.6).tex(); },
  maypole: () => { const W = 16, H = 160, p = new Pix(W, H);   // the pole, a flower crown on top
    for (let y = 10; y < H; y++) { p.set(7, y, FP.wood[4]); p.set(8, y, FP.wood[3]); p.set(9, y, FP.wood[2]); if ((y >> 3) % 2) p.set(8, y, 0xf0e8d8); }
    for (let a = 0; a < 6.28; a += 0.25) { const x = 8 + Math.cos(a) * 6, y = 9 + Math.sin(a) * 2.4; p.disc(x, y, 1.4, [0xb8302a, 0xf0e8d8, 0xe8b840, 0xd8a8c8][Math.floor(a * 2) % 4]); }
    p.disc(8, 4, 2.4, 0x2c4478); p.set(8, 1, 0xe8b840);
    return p.outline(null, 0.6).tex(); },
  ribbon: () => { const W = 6, H = 96, p = new Pix(W, H), c = [0xb8302a, 0x2c4478, 0xe8b840, 0x346a22, 0xd8a8c8, 0xf0e8d8];   // a fan of ribbons from the maypole's top (it waves)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, C.mul(c[x], y > H - 4 ? 0.8 : 1));
    return p.tex({}); },
  festGate: () => { const W = 100, H = 108, p = new Pix(W, H), Wd = FP.wood;   // the meadow's gate: two poles wound with ribbon, an arched board with the swan in a garland, pennants on top
    for (const x0 of [6, 88]) for (let y = 14; y < H; y++) { for (let k = 0; k < 6; k++) p.set(x0 + k, y, Wd[k < 2 ? 5 : k < 4 ? 4 : 2]); if (((y + x0) >> 2) % 3 === 0) for (let k = 0; k < 6; k++) p.set(x0 + k, y, k < 3 ? 0xb8302a : 0x8a1e1a); }
    for (let x = 4; x < W - 4; x++) { const top = 24 - Math.sin((x - 4) / (W - 8) * Math.PI) * 14; for (let y = Math.floor(top); y < top + 9; y++) p.set(x, y, y < top + 2 ? Wd[5] : y > top + 7 ? Wd[1] : Wd[3]); }
    for (let i = 0; i < 26; i++) { const x = 8 + i * 3.4, top = 24 - Math.sin((x - 4) / (W - 8) * Math.PI) * 14; p.disc(x, top + 10, 1.6, i % 3 ? 0x346a22 : [0xb8302a, 0xf0e8d8, 0xe8b840][i % 3]); }
    p.ell(50, 15, 9, 6, 0x2c4478); p.ell(51, 16, 5, 2.6, 0xf0e8d8); p.vl(46, 9, 15, 0xf0e8d8); p.set(45, 9, 0xe8b840);   // the swan on blue
    for (const x of [9, 91]) { p.vl(x, 0, 14, 0x3a2a1a); for (let i = 0; i < 9; i++) { const hw = 3 - i * 0.3; for (let k = 0; k <= hw; k++) { p.set(x + 1 + i, 2 + k, x < 50 ? 0xb8302a : 0x2c4478); p.set(x + 1 + i, 2 - k + 3, x < 50 ? 0xb8302a : 0x2c4478); } } }
    return p.outline(null, 0.6).tex(); },
  crowdA: () => PX.crowd(256, 40, 861, 2).tex({}),
  crowdB: () => PX.crowd(256, 40, 871, 2).tex({}),
  hurdle: () => { const W = 64, H = 24, p = new Pix(W, H), Wd = FP.wood;   // a woven hurdle fence
    for (const x of [2, 31, 60]) for (let y = 0; y < H; y++) { p.set(x, y, Wd[4]); p.set(x + 1, y, Wd[2]); }
    for (let r = 0; r < 4; r++) for (let x = 0; x < W; x++) { const y = 4 + r * 5 + Math.round(Math.sin((x + r * 7) * 0.2) * 1.2); p.set(x, y, Wd[(x + r) % 9 < 5 ? 4 : 3]); p.set(x, y + 1, Wd[2]); }
    return p.outline(null, 0.6).tex({}); },
  tiltCloth: () => { const W = 64, H = 26, p = new Pix(W, H);   // the tilt barrier: a timber rail hung with striped cloth to the ground
    for (let x = 0; x < W; x++) { p.set(x, 0, FP.wood[5]); p.set(x, 1, FP.wood[4]); p.set(x, 2, FP.wood[2]); }
    for (let y = 3; y < H; y++) for (let x = 0; x < W; x++) { const s = Math.floor((x + y * 0.6) / 8) % 2; p.set(x, y, C.mul(s ? 0xf0e8d8 : 0x2c4478, (y === 3 ? 0.75 : 1) * (0.92 + 0.08 * Math.sin(x * 0.4)))); }
    return p.tex({ repeat: true }); },
  canopy: () => { const W = 96, H = 30, p = new Pix(W, H);   // the royal stand's canopy valance: swan blue, gold swans, a dagged gold edge
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = ((x % 12) / 12 - 0.5) * 2; if (y > H - 7 && y - (H - 7) > 6 * (1 - u * u)) continue; p.set(x, y, y > H - 8 ? 0xe8b840 : C.mul(0x2c4478, y < 2 ? 1.2 : 1)); }
    for (let i = 0; i < 4; i++) { const cx = 12 + i * 24; p.ell(cx, 12, 4, 2.4, 0xf0e8d8); p.vl(cx - 3, 6, 12, 0xf0e8d8); p.set(cx - 4, 6, 0xe8b840); }
    return p.tex({}); },
  bannerKrasna: () => { const W = 30, H = 70, p = new Pix(W, H);   // Krasna: a white eagle on red, gold fringe
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (y >= H - 8 && Math.abs(x - 14.5) < (y - (H - 8)) * 2) continue;   // a swallow tail at the foot
      p.set(x, y, y === H - 1 || (y >= H - 8 && Math.abs(x - 14.5) < (y - (H - 9)) * 2) ? 0xe8b840 : C.mul(0xa82a24, x < 3 ? 1.15 : 1)); }
    p.ell(15, 26, 4, 6, 0xf0e8d8); p.disc(15, 18, 2.6, 0xf0e8d8); p.set(17, 18, 0xe8b840);
    for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { p.line(15 + s * 3, 22 + i, 15 + s * (11 - i * 0.3), 16 + i * 1.6, 0xf0e8d8); }
    p.line(13, 32, 11, 38, 0xf0e8d8); p.line(17, 32, 19, 38, 0xf0e8d8);
    return p.outline(null, 0.65).tex(); },
  bannerLeague: () => { const W = 30, H = 70, p = new Pix(W, H);   // the River League: teal, three gold waves
    for (let y = 0; y < H - 4; y++) for (let x = 0; x < W; x++) p.set(x, y, C.mul(0x1e5a5e, x < 3 ? 1.15 : 1));
    for (let k = 0; k < 3; k++) for (let x = 3; x < W - 3; x++) { const y = 18 + k * 14 + Math.round(Math.sin(x * 0.55) * 2); p.set(x, y, 0xe8b840); p.set(x, y + 1, 0xc8962a); }
    for (let x = 0; x < W; x += 2) p.vl(x, H - 4, H - 1, 0xe8b840);
    return p.outline(null, 0.65).tex(); },
  pennantKrasna: () => PX.pennant(0xa82a24, 0xf0e8d8, 0xe8b840),
  pennantBlack: () => PX.pennant(0x16161c, 0x5a5a6a, 0x3a3a46),
  pennantLeague: () => PX.pennant(0x1e5a5e, 0xe8b840, 0xe8b840),
  knightDown: () => { const W = 64, H = 22, p = new Pix(W, H), S = FP.steel;   // the unhorsed knight in the dust, Krasna's red on his surcoat
    p.ell(30, 15, 18, 5, 0xa82a24); p.ell(28, 13, 14, 3, 0xcc4436); p.rect(46, 11, 10, 7, S[3]); p.hl(47, 55, 11, S[4]); p.hl(49, 54, 14, 0x0c0c10);
    p.line(12, 15, 2, 18, S[2]); p.line(12, 17, 3, 20, S[2]); p.line(40, 18, 44, 21, S[2]); for (let x = 6; x < 30; x++) p.set(x, 8, x % 4 < 2 ? 0xa82a24 : 0xf0e8d8);   // legs, the broken lance
    return p.outline(null, 0.6).tex(); },
  shard: () => { const p = new Pix(8, 3); p.hl(0, 7, 1, 0xf0e8d8); p.hl(1, 6, 0, 0xdcd4c2); p.hl(0, 5, 2, 0xa82a24); return p.tex({}); },
  blast: () => PX.blastFrames(48, 28, 6),
  striker: () => { const W = 20, H = 140, p = new Pix(W, H), Wd = FP.wood;   // the strongman's high striker: a post with a painted scale, the bell on top, the pad at the foot
    for (let y = 10; y < H - 6; y++) { p.set(8, y, Wd[5]); p.set(9, y, Wd[4]); p.set(10, y, Wd[4]); p.set(11, y, Wd[2]); if ((y - 10) % 12 === 0) p.hl(6, 13, y, [0xb8302a, 0xe8b840, 0x346a22, 0x2c4478][Math.floor((y - 10) / 12) % 4]); }
    p.ell(10, 6, 5, 5, 0xc8962a); p.ell(9, 5, 3, 3, 0xf8dc78); p.hl(5, 15, 10, 0x9a6a1c);
    p.rect(2, H - 6, 16, 6, Wd[3]); p.rect(5, H - 8, 10, 3, 0x6a3a2a); p.hl(5, 14, H - 8, 0x8a5a3a);
    return p.outline(null, 0.6).tex(); },
  puck: () => { const p = new Pix(8, 6); p.rect(0, 0, 8, 6, 0x5a5a62); p.rect(1, 1, 6, 2, 0x8a8a92); p.set(2, 1, 0xc8c8d0); return p.tex({}); },
  campTable: () => { const W = 64, H = 34, p = new Pix(W, H), Wd = FP.wood;   // the Krasnian king's table: a map weighted with a dagger, a jug, goblets, a candle
    p.rect(0, 16, W, 3, Wd[4]); p.hl(0, W - 1, 19, Wd[1]); for (const x of [5, W - 7]) { p.line(x, 20, x - 3, H - 1, Wd[2]); p.line(x + 1, 20, x + 4, H - 1, Wd[3]); }
    p.rect(14, 12, 26, 5, 0xe8dcc0); p.hl(14, 39, 12, 0xf8f0dc); for (let i = 0; i < 6; i++) p.set(18 + i * 3, 14 + (i % 2), 0x8a6a4a); p.line(20, 15, 34, 13, 0x2c6aa0);   // the map, a river on it
    p.hl(24, 31, 12, 0xb8c0c8); p.set(23, 12, 0xc8962a);
    p.rect(44, 7, 5, 9, 0x8a6a3a); p.rect(45, 6, 3, 2, 0x6a4a2a); for (const x of [51, 56]) { p.rect(x, 11, 3, 4, 0xc8962a); p.set(x + 1, 15, 0xc8962a); }
    p.vl(8, 6, 15, 0xf0e8d8); p.set(8, 5, 0xffd250);
    return p.outline(null, 0.6).tex(); },
  barge: () => { const W = 160, H = 60, p = new Pix(W, H), Wd = FP.wood;   // the League's river barge: a long low hull, a cabin, barrels, a mast, the League's banner
    for (let y = 36; y < 52; y++) { const l = 4 + Math.max(0, y - 44) * 1.2, r = W - 4 - Math.max(0, y - 40) * 1.6; for (let x = Math.floor(l); x <= r; x++) p.set(x, y, y === 36 ? Wd[5] : (y - 36) % 4 === 3 ? Wd[1] : Wd[y < 42 ? 3 : 2]); }
    for (let y = 22; y < 36; y++) for (let x = 60; x < 104; x++) p.set(x, y, y < 25 ? 0x1e5a5e : x % 8 === 0 ? Wd[1] : Wd[3]);
    p.rect(72, 27, 6, 5, 0xf8c860); p.rect(88, 27, 6, 5, 0xf8c860);
    for (const x of [20, 30, 40, 118, 128]) { p.rect(x, 28, 8, 8, Wd[4]); p.hl(x, x + 7, 30, 0x3a3a3a); p.hl(x, x + 7, 34, 0x3a3a3a); }
    for (let y = 0; y < 36; y++) p.set(112, y, Wd[2]); p.hl(104, 120, 6, Wd[3]);
    for (let y = 2; y < 16; y++) for (let x = 113; x < 123; x++) p.set(x, y, (y - 2) % 5 === 3 ? 0xe8b840 : 0x1e5a5e);
    return p.outline(null, 0.6).tex(); },
  campfire: () => { const W = 30, H = 12, p = new Pix(W, H);   // a ring of stones round crossed logs
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI, x = 15 - Math.cos(a) * 12; p.ell(x, 9 - Math.sin(a) * 2, 2.4, 2, i % 2 ? 0x6a645c : 0x8a847a); }
    p.line(7, 8, 22, 4, 0x3a2414); p.line(8, 9, 23, 5, 0x5a3a20); p.line(22, 8, 8, 4, 0x3a2414); p.line(21, 9, 7, 5, 0x5a3a20);
    for (let x = 11; x < 20; x++) p.set(x, 7, hash(x, 2, 881) < 0.5 ? 0xf06a18 : 0xc83a10);
    return p.outline(null, 0.6).tex(); },
})) PX.def(k, f);
