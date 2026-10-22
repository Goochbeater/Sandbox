/* YARD TEXTURES — the training yard on a cold bright morning after rain: packed sand and puddles, the armoury's racks,
   straw men and archery butts, pennants cracking on the wall. Light from the east (left). */
const YPAL = {
  sand: [0x4a3e30, 0x5e5040, 0x726250, 0x887660, 0x9e8a70, 0xb8a284],
  wood: [0x241608, 0x3a2412, 0x52361c, 0x6a4826, 0x845c32, 0xa07440],
  straw: [0x6a5020, 0x8a6a2a, 0xa88838, 0xc8a84a, 0xe0c868],
  steel: [0x2a2e36, 0x4a505a, 0x6e7680, 0x9aa2ac, 0xc8d0d8, 0xf0f4f8],
  cloth: [0x5a1418, 0x7a1e20, 0x9a2a28, 0xb83a32],
};
/* a sword standing point-down in a rack (px): tip at y0, the blade with its fuller, the crossguard, grip and pommel above */
PX.sword = function (p, x, y0, len, pal) {
  const S = pal || YPAL.steel;
  for (let i = 0; i < len; i++) { const y = y0 - i, tip = i < 2; p.set(x, y, S[tip ? 4 : 3]); p.set(x + 1, y, S[tip ? 2 : 4]); if (!tip && i % 6 === 3) p.set(x, y, S[5]); }
  const gy = y0 - len; p.hl(x - 2, x + 3, gy, 0x8a6a2a); p.hl(x - 2, x + 3, gy - 1, 0xb88a3a);
  for (let k = 2; k <= 5; k++) { p.set(x, gy - k, k === 5 ? 0xb88a3a : 0x3a2412); p.set(x + 1, gy - k, k === 5 ? 0x8a6a2a : 0x2a1a0c); }
};
for (const [k, f] of Object.entries({
  sand: () => { const p = new Pix(64, 64), S = YPAL.sand;   // packed sand and mud, boot prints, straw, puddles holding the sky
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const n = noise1(x * 0.09 + y * 0.06, 601), m = noise1(x * 0.04 + 7, 602) * noise1(y * 0.05 + 3, 603);
      let i = 2 + (PX.dith(x, y) < n ? 1 : 0) - (m > 0.32 ? 1 : 0); if (hash(x, y, 604) < 0.05) i += hash(x, y, 605) < 0.5 ? 1 : -1; let c = S[clamp(i, 0, 5)];
      if (m > 0.42) c = m > 0.5 ? 0x9ab0c8 : 0x5a6a80; p.set(x, y, c); }
    for (let i = 0; i < 14; i++) { const x = hash(i, 1, 606) * 64, y = hash(i, 2, 606) * 64; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2], [0, 4], [1, 4]]) p.wset(x + dx, y + dy, S[1]); }   // boot prints
    for (let i = 0; i < 30; i++) { const x = hash(i, 3, 606) * 64, y = hash(i, 4, 606) * 64, a = hash(i, 5, 606) * 3; for (let k = 0; k < 3; k++) p.wset(Math.round(x + Math.cos(a) * k), Math.round(y + Math.sin(a) * k), YPAL.straw[3]); }
    return p.tex({ repeat: true, aniso: 4 }); },
  shingles: () => { const p = new Pix(32, 32);   // the armoury's roof: split oak shingles, silvered by weather
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const row = y >> 2, off = (row & 1) * 3, col = Math.floor((x + off) / 6), v = y & 3; let c = C.mul([0x6a6056, 0x5a5048, 0x766a5e, 0x4e463e][Math.floor(hash(col, row, 607) * 4)], 0.9 + 0.2 * hash(x, y, 608));
      if ((x + off) % 6 === 0) c = 0x2a2420; if (v === 3) c = 0x221c18; else if (v === 0) c = C.mul(c, 1.15); p.set(x, y, c); }
    return p.tex({ repeat: true }); },
  swordRack: () => { const W = 66, H = 58, p = new Pix(W, H), Wd = YPAL.wood;   // six swords point-down in a rack
    for (let x = 2; x < W - 2; x++) { p.set(x, 18, Wd[4]); p.set(x, 19, Wd[3]); p.set(x, 20, Wd[1]); p.set(x, H - 6, Wd[4]); p.set(x, H - 5, Wd[2]); p.set(x, H - 4, Wd[1]); }
    for (const x of [3, 4, W - 5, W - 4]) for (let y = 14; y < H; y++) p.set(x, y, Wd[x % 2 ? 2 : 3]);
    for (let i = 0; i < 6; i++) PX.sword(p, 9 + i * 9, H - 7, 34 + (i % 2) * 3);
    return p.outline(null, 0.6).tex(); },
  shieldBoard: () => { const W = 76, H = 42, p = new Pix(W, H);   // shields hung on pegs: the swan, a red chevron, a quartered blue and gold
    for (let y = 2; y < 6; y++) p.hl(0, W - 1, y, YPAL.wood[y === 2 ? 4 : 2]);
    const heater = (cx, top, f1, f2, kind) => { for (let y = 0; y < 30; y++) { const hw = y < 16 ? 10 : 10 - (y - 16) * 0.72; for (let x = -Math.floor(hw); x <= hw; x++) {
      let c = f1; if (kind === 'chev' && Math.abs(y - 18 + Math.abs(x) * 0.9) < 3) c = f2; if (kind === 'quart' && ((x < 0) !== (y < 14))) c = f2; if (Math.abs(x) >= Math.floor(hw) || y === 0) c = 0x5a5048; p.set(cx + x, top + y, c); } }
      if (kind === 'swan') { p.ell(cx, top + 15, 4, 2.4, 0xe8e8f0); p.vl(cx - 3, top + 8, top + 14, 0xe8e8f0); p.set(cx - 4, top + 8, 0xd8902a); } };
    heater(13, 7, 0x24346a, 0, 'swan'); heater(38, 9, 0xe8dcc0, 0x9a2a28, 'chev'); heater(63, 7, 0x2a4a8a, 0xd8a43a, 'quart');
    for (const x of [13, 38, 63]) { p.set(x, 5, 0x2a2a2a); p.set(x, 6, 0x4a4a4a); }
    return p.outline(null, 0.6).tex(); },
  gambesons: () => { const W = 44, H = 66, p = new Pix(W, H), Wd = YPAL.wood;   // a stand of padded jackets — one peg empty
    for (let y = 4; y < H; y++) { p.set(21, y, Wd[3]); p.set(22, y, Wd[2]); } p.hl(2, 41, 6, Wd[4]); p.hl(2, 41, 7, Wd[2]); p.hl(12, 31, H - 2, Wd[3]); p.hl(10, 33, H - 1, Wd[1]);
    const jacket = (cx, col) => { for (let y = 8; y < 36; y++) { const hw = y < 12 ? 6 + (y - 8) : 9; for (let x = -hw; x <= hw; x++) { let c = (y + (x & 1)) % 4 === 0 ? C.mul(col, 0.75) : col; if (Math.abs(x) === hw) c = C.mul(col, 0.6); p.set(cx + x, y, c); } }
      for (let y = 10; y < 26; y++) { p.set(cx - 12, y, C.mul(col, 0.8)); p.set(cx + 12, y, C.mul(col, 0.8)); } };
    jacket(10, 0xc8b890); jacket(33, 0xb8a880);
    p.set(21, 9, 0x8a8a8a); p.set(22, 9, 0x6a6a6a);   // the empty middle peg
    return p.outline(null, 0.6).tex(); },
  helmTable: () => { const W = 56, H = 30, p = new Pix(W, H), Wd = YPAL.wood, S = YPAL.steel;   // a trestle table: a helm, gauntlets, an oil rag, a whetstone
    p.rect(0, 14, W, 3, Wd[4]); p.hl(0, W - 1, 17, Wd[1]); for (const x of [4, W - 6]) { p.line(x, 18, x - 3, H - 1, Wd[2]); p.line(x + 1, 18, x + 4, H - 1, Wd[3]); }
    for (let y = 2; y < 14; y++) { const hw = y < 5 ? 3 + y : 7; for (let x = -hw; x <= hw; x++) p.set(14 + x, y, S[clamp(3 + Math.round(-x / hw * 1.5) - (y > 10 ? 1 : 0), 0, 5)]); } p.hl(9, 19, 8, S[0]); p.set(14, 6, S[5]);
    p.rect(26, 10, 7, 4, S[2]); p.rect(34, 11, 6, 3, S[3]); p.rect(42, 11, 8, 3, 0xd8ccb0); p.hl(42, 49, 11, 0xa89a80);
    return p.outline(null, 0.6).tex(); },
  grindstone: () => { const p = new Pix(30, 32), Wd = YPAL.wood; p.disc(15, 14, 10, 0x8a8478); p.disc(15, 14, 8, 0xa8a094); p.disc(15, 14, 2, 0x4a4440); for (let a = 0; a < 6.28; a += 0.5) p.set(15 + Math.cos(a) * 9, 14 + Math.sin(a) * 9, 0x6a645c);
    p.line(4, 31, 10, 18, Wd[2]); p.line(26, 31, 20, 18, Wd[2]); p.hl(6, 24, 26, Wd[3]); p.line(15, 14, 26, 8, 0x3a3a3a); return p.outline(null, 0.6).tex(); },
  practiceBarrel: () => { const W = 26, H = 44, p = new Pix(W, H), Wd = YPAL.wood;   // a barrel bristling with wooden practice swords
    for (const [x, h] of [[7, 22], [11, 25], [15, 21], [19, 24]]) { for (let y = 20 - h + 18; y < 20; y++) { p.set(x, y, Wd[4]); p.set(x + 1, y, Wd[3]); } p.hl(x - 2, x + 3, 13, Wd[2]); }
    for (let y = 18; y < H; y++) { const hw = 11 + Math.sin((y - 18) / (H - 18) * Math.PI) * 1.5; for (let x = -Math.floor(hw); x <= hw; x++) { let c = Wd[clamp(3 + Math.round(-x / hw * 1.4), 0, 5)]; if ((x + 13) % 5 === 0) c = Wd[1]; if (y === 22 || y === 23 || y === H - 5 || y === H - 6) c = y % 2 ? 0x3a3a3a : 0x5a5a5a; p.set(13 + x, y, c); } }
    return p.outline(null, 0.6).tex(); },
  barrel: () => { const W = 26, H = 30, p = new Pix(W, H), Wd = YPAL.wood;
    for (let y = 0; y < H; y++) { const hw = 11 + Math.sin(y / H * Math.PI) * 1.5; for (let x = -Math.floor(hw); x <= hw; x++) { let c = Wd[clamp(3 + Math.round(-x / hw * 1.4), 0, 5)]; if ((x + 13) % 5 === 0) c = Wd[1]; if (y === 4 || y === 5 || y === H - 6 || y === H - 5) c = y % 2 ? 0x3a3a3a : 0x5a5a5a; if (y === 0) c = Wd[5]; p.set(13 + x, y, c); } }
    return p.outline(null, 0.6).tex(); },
  hay: () => { const W = 64, H = 40, p = new Pix(W, H), S = YPAL.straw;   // a stack of hay bales, string-bound
    const bale = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { let i = 2 + (hash(x, y >> 1, 609) < 0.4 ? 1 : 0) - (hash(x >> 1, y, 610) < 0.2 ? 1 : 0); if (y === y0) i = 4; if (y === y0 + h - 1 || x === x0 + w - 1) i = 0; if (x === x0) i = 3; p.set(x, y, S[clamp(i, 0, 4)]); }
      for (const xx of [x0 + Math.floor(w * 0.3), x0 + Math.floor(w * 0.7)]) for (let y = y0; y < y0 + h; y++) p.set(xx, y, 0x6a5a3a); };
    bale(2, 22, 30, 17); bale(32, 22, 30, 17); bale(16, 6, 30, 16);
    for (let i = 0; i < 20; i++) p.set(hash(i, 1, 611) * 64, 36 + hash(i, 2, 611) * 4, S[3]);
    return p.outline(null, 0.6).tex(); },
  butt: () => { const W = 42, H = 66, p = new Pix(W, H), Wd = YPAL.wood, S = YPAL.straw;   // an archery butt on its stand, arrows in it
    p.line(6, H - 1, 16, 20, Wd[2]); p.line(36, H - 1, 26, 20, Wd[2]); p.line(21, H - 1, 21, 40, Wd[1]);
    for (let y = 0; y < 42; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 20.5, y - 20.5); if (d > 18) continue; let c = S[2 + ((Math.floor(d * 1.4 + Math.atan2(y - 20.5, x - 20.5) * 2) & 1))];
      if (d < 15 && d >= 12) c = 0xe8e0d0; if (d < 12 && d >= 8) c = 0x2a4a8a; if (d < 8 && d >= 4.5) c = 0xb82a22; if (d < 4.5) c = 0xe8b82a; if (d > 17) c = S[0]; p.set(x, y, c); }
    for (const [x, y, a] of [[19, 18, 0.5], [24, 23, 0.8], [13, 26, 0.3], [28, 12, 1.0]]) { for (let k = 0; k < 9; k++) p.set(x + Math.cos(a + 3.6) * k * 0.7, y + Math.sin(a + 3.6) * k * 0.7, 0x5a3a1a); p.set(x + Math.cos(a + 3.6) * 7, y + Math.sin(a + 3.6) * 7, 0xe8e8e8); }
    return p.outline(null, 0.6).tex(); },
  rope: () => { const p = new Pix(64, 8); for (let x = 0; x < 64; x++) { const y = 2 + Math.sin(x / 64 * Math.PI) * 3; p.set(x, y, (x & 3) < 2 ? 0xc8a868 : 0x8a6a38); p.set(x, y + 1, 0x6a5028); } const t = p.tex({ repeat: true }); return t; },
  pennantRed: () => PX.pennant(0x9a2a28, 0xe8dcc0, 0xd8a43a),
  pennantBlue: () => PX.pennant(0x24346a, 0xe8e8f0, 0xd8a43a),
  cartWheel: () => { const p = new Pix(44, 44), Wd = YPAL.wood; for (let a = 0; a < 6.283; a += 0.01) for (let r = 18; r < 21; r++) p.set(22 + Math.cos(a) * r, 22 + Math.sin(a) * r, r === 20 ? 0x3a3a3a : Wd[3 - (r - 18)]);
    for (let s = 0; s < 8; s++) { const a = s / 8 * 6.283; for (let r = 4; r < 18; r++) p.set(22 + Math.cos(a) * r, 22 + Math.sin(a) * r, Wd[3]); } p.disc(22, 22, 4, Wd[2]); p.disc(22, 22, 2, 0x3a3a3a); return p.outline(null, 0.6).tex(); },
  ivyDrape: () => { const W = 72, H = 64, p = new Pix(W, H);   // ivy pouring over the battlements: thick at the top, strands trailing down
    const G = [0x0c180c, 0x142614, 0x1e381a, 0x2c4c22, 0x3e642c, 0x52782e];
    for (let i = 0; i < 14; i++) PX.foliage(p, 4 + i * 5 + (hash(i, 1, 620) - 0.5) * 4, 4 + hash(i, 2, 620) * 5, 6, 5, G, 621 + i, { holes: 0.12, rough: 0.8 });
    for (let k = 0; k < 9; k++) { let x = 6 + hash(k, 3, 620) * 60; const len = 14 + hash(k, 4, 620) * 44; for (let y = 6; y < len; y++) { x += Math.sin(y * 0.3 + k) * 0.4; p.set(x, y, 0x2a2014);
        if (y % 3 === 0) { const sx = y % 6 ? 1 : -1; p.set(x + sx, y, G[3]); p.set(x + sx * 2, y, G[2]); p.set(x + sx, y - 1, G[4]); } }
      PX.foliage(p, x, len, 3, 3, G, 630 + k, { holes: 0.1 }); }
    for (let i = 0; i < 10; i++) { const x = Math.round(hash(i, 5, 620) * W), y = Math.round(hash(i, 6, 620) * 12); if (p.a(x, y)) p.set(x, y, 0x9a3a1a); }
    return p.outline(null, 0.55).tex(); },
  ivyClimb: () => { const W = 56, H = 110, p = new Pix(W, H), G = [0x0c180c, 0x142614, 0x1e381a, 0x2c4c22, 0x3e642c, 0x52782e];   // ivy climbing a buttress from the foot: stems, then leaves
    for (let k = 0; k < 5; k++) { let x = 24 + (hash(k, 1, 640) - 0.5) * 18; const top = 10 + hash(k, 2, 640) * 50; for (let y = H - 1; y > top; y--) { x += Math.sin(y * 0.15 + k * 2) * 0.5; p.set(x, y, 0x3a2a18); p.set(x + 1, y, 0x2a1e10);
        if (y % 4 === 0) PX.foliage(p, x + (y % 8 ? 3 : -3), y, 3.2, 2.6, G, 641 + k * 50 + y, { holes: 0.1 }); }
      PX.foliage(p, x, top, 6, 5, G, 700 + k, { holes: 0.1 }); }
    PX.foliage(p, 28, H - 10, 22, 10, G, 710, { holes: 0.15, flatBottom: 0.8 });
    return p.outline(null, 0.55).tex(); },
  crestStone: () => { const W = 56, H = 48, p = new Pix(W, H), S = [0x2a2826, 0x46423e, 0x5e5a54, 0x7a746c, 0x96908a, 0xb8b2aa];   // the swan carved over the gate, in a shield with leafy mantling
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = (x - 27.5) / 14, v = (y - 6) / 34; const inS = v >= 0 && v <= 1 && Math.abs(u) <= (v < 0.55 ? 1 : 1 - (v - 0.55) / 0.45 * 0.95);
      const mant = !inS && v > -0.1 && v < 0.9 && Math.abs(u) < 1.75 && noise1(x * 0.35 + y * 0.2, 650) > 0.42 - Math.abs(u) * 0.05;
      if (inS) { let c = S[3]; if (Math.abs(u) > (v < 0.55 ? 0.88 : 1 - (v - 0.55) / 0.45 * 0.95 - 0.12) || v < 0.05) c = S[5]; p.set(x, y, c); } else if (mant) p.set(x, y, S[noise1(x * 0.6, 651) > 0.5 ? 4 : 2]); }
    p.ell(27, 26, 7, 4, S[5]); p.ell(28, 27, 6, 3, S[4]); for (let y = 12; y < 26; y++) { p.set(21 + Math.sin(y * 0.3), y, S[5]); p.set(22 + Math.sin(y * 0.3), y, S[4]); } p.ell(21, 12, 2.5, 2, S[5]); p.set(18, 12, S[2]);
    for (let i = 0; i < 5; i++) { p.set(30 + i * 1.6, 21 - i, S[5]); p.set(31 + i * 1.6, 22 - i, S[4]); }
    for (let x = 4; x < 52; x++) { p.set(x, H - 3, S[5]); p.set(x, H - 2, S[2]); p.set(x, H - 1, S[1]); }   // a little ledge
    return p.outline(null, 0.55).tex(); },
  roster: () => { const W = 40, H = 34, p = new Pix(W, H), Wd = YPAL.wood;   // the drill roster: a board, sheets pinned to it, a tally scratched in chalk
    p.rect(0, 0, W, H, Wd[2]); p.rect(1, 1, W - 2, H - 2, Wd[3]); for (let y = 1; y < H - 1; y += 4) p.hl(1, W - 2, y, Wd[2]);
    for (const [x, y, w, h] of [[4, 4, 14, 18], [21, 3, 15, 12], [22, 17, 13, 13]]) { p.rect(x, y, w, h, 0xe8dcc0); p.hl(x, x + w - 1, y, 0xf8f0dc); for (let yy = y + 3; yy < y + h - 1; yy += 2) p.hl(x + 2, x + w - 3 - ((yy * 7) % 4), yy, 0x6a5a4a); p.set(x + Math.floor(w / 2), y + 1, 0x8a8a8a); }
    for (let i = 0; i < 6; i++) { p.vl(5 + i * 2, 25, 30, 0xe8e8e0); } p.line(4, 30, 16, 25, 0xe8e8e0);
    return p.outline(null, 0.6).tex(); },
  crate: () => { const W = 30, H = 26, p = new Pix(W, H), Wd = YPAL.wood; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let c = Wd[3 + ((y >> 2) & 1 ? 0 : 1) - (x === 0 || y === 0 ? 0 : 0)]; if (x < 2 || x > W - 3 || y < 2 || y > H - 3) c = Wd[2]; if (Math.abs(x - y * W / H) < 1.3 || Math.abs(W - 1 - x - y * W / H) < 1.3) c = Wd[2]; if ((y & 3) === 3) c = C.mul(c, 0.8); p.set(x, y, c); }
    for (const [x, y] of [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]]) p.set(x, y, 0x8a8a8a); return p.outline(null, 0.6).tex(); },
  sacks: () => { const W = 40, H = 24, p = new Pix(W, H); for (const [cx, cy, rx, ry] of [[11, 15, 10, 8], [28, 16, 10, 7], [19, 9, 9, 7]]) for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { if ((x / rx) ** 2 + (y / ry) ** 2 > 1) continue; const l = clamp(0.55 - x / rx * 0.25 - y / ry * 0.25, 0, 0.99); p.set(cx + x, cy + y, C.ramp([0x6a5a3a, 0x8a7650, 0xa8946a, 0xc8b488], l + ((x + y) % 3 === 0 ? -0.08 : 0))); }
    p.hl(17, 21, 3, 0x5a4a2a); return p.outline(null, 0.6).tex(); },
  bucket: () => { const p = new Pix(14, 14), Wd = YPAL.wood; for (let y = 4; y < 14; y++) { const hw = 5 - (y - 4) * 0.12; for (let x = -Math.floor(hw); x <= hw; x++) p.set(7 + x, y, (x + 7) % 3 === 0 ? Wd[2] : Wd[4]); } p.hl(1, 12, 6, 0x4a4a4a); p.hl(2, 11, 12, 0x4a4a4a); for (let a = 0; a < 3.14; a += 0.15) p.set(7 + Math.cos(a) * 5, 4 - Math.sin(a) * 4, 0x3a3a3a); return p.outline(null, 0.6).tex(); },
  ringIron: () => { const p = new Pix(8, 10); p.rect(3, 0, 2, 3, 0x3a3a3a); for (let a = 0; a < 6.28; a += 0.2) p.set(4 + Math.cos(a) * 3, 6 + Math.sin(a) * 3, a < 3 ? 0x5a5a5a : 0x2a2a2a); return p.tex(); },
  torchCold: () => { const p = new Pix(10, 22); p.rect(3, 12, 4, 10, 0x2c2622); p.vl(3, 12, 21, 0x5a524a); p.rect(2, 7, 6, 4, 0x2a2018); p.rect(3, 3, 4, 5, 0x3a2a1a); p.set(4, 2, 0x1a1410); p.set(5, 2, 0x2a1e14); p.line(4, 11, 1, 16, 0x2c2622); p.line(6, 11, 9, 16, 0x2c2622); return p.tex(); },
  skyMorning: () => { const W = 512, H = 200, p = new Pix(W, H), S = [0x3a6aa8, 0x4a7ab4, 0x5a8abe, 0x6e9ac6, 0x86aed0, 0xa2c0d8, 0xbcd0e0, 0xd8e2ea];   // cold blue, piled cumulus with grey bellies
    const cloud = (x, y) => { const n = noise1(x * 0.016 + noise1(y * 0.05, 612) * 1.2, 613) * 0.55 + noise1(x * 0.05 + y * 0.08, 614) * 0.45; return n - (0.6 - 0.25 * Math.pow(Math.abs(y / H - 0.45) * 2, 2)); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = Math.pow(y / H, 1.3) * (S.length - 1.01); let c = S[clamp(Math.floor(t + (PX.dith(x, y) - 0.5) * 0.3), 0, S.length - 1)];
      const cl = cloud(x, y); if (cl > 0) { const top = cloud(x, y - 2) <= 0, bot = cloud(x, y + 3) <= 0, CL = [0x8a96a8, 0xa8b2c0, 0xc8d0da, 0xe8eef2, 0xffffff]; let i = cl > 0.12 ? 2 : 3; if (bot) i = 0 + (cl > 0.05 ? 1 : 0); if (top) i = 4; else if (cloud(x - 2, y - 2) <= 0) i = 4; c = CL[i]; }
      p.set(x, y, c); }
    return p.tex({ mip: false }); },
})) PX.def(k, f);
/* a swallow-tailed pennant, 24 × 84 px, for a pole on the wall-walk: field, a pale cross band, gold edge */
PX.pennant = function (field, band, edge) {
  const W = 84, H = 22, p = new Pix(W, H);
  for (let x = 0; x < W; x++) { const hw = 10 - x * 0.06, notch = x > W - 14 ? (x - (W - 14)) * 0.75 : -1; for (let y = 0; y < H; y++) { const v = Math.abs(y - 10.5); if (v > hw || v < notch) continue;
    let c = field; if (Math.abs(x - 18) < 3) c = band; if (v > hw - 1) c = edge; if (x < 2) c = 0x3a2a1a; p.set(x, y, c); } }
  return p.outline(null, 0.65).tex();
};
