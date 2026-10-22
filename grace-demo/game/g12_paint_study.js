/* STUDY TEXTURES — the king's study at night: green damask, tall shelves, his father's portrait over a small hearth,
   a rain-streaked window, the campaign table, a chess game left half played. */
PX.shelves = function (W, H, rows, seed, base) {   // a tall case of books, jars, scrolls and the odd skull
  const p = new Pix(W, H).fill(C.mul(base, 0.55)), R1 = rng(seed), rh = Math.floor((H - 6) / rows);
  for (let x = 0; x < W; x++) { p.set(x, 0, C.mul(base, 1.3)); p.set(x, 1, base); p.set(x, 2, C.mul(base, 0.7)); p.set(x, H - 1, C.mul(base, 0.4)); p.set(x, H - 2, C.mul(base, 0.8)); }
  for (let y = 0; y < H; y++) { p.set(0, y, base); p.set(1, y, C.mul(base, 0.8)); p.set(W - 1, y, C.mul(base, 0.4)); p.set(W - 2, y, C.mul(base, 0.7)); }
  const cols = [0x6a1a1a, 0x24406a, 0x3a5a2a, 0x7a5a2a, 0x4a2a5a, 0x8a6a3a, 0x2a2a30, 0x9a3a22, 0x1e4a4a, 0x5a1a2a];
  for (let s = 0; s < rows; s++) { const y0 = 3 + s * rh, y1 = y0 + rh - 4;
    for (let x = 2; x < W - 2; x++) { p.set(x, y1 + 1, C.mul(base, 1.15)); p.set(x, y1 + 2, C.mul(base, 0.75)); p.set(x, y1 + 3, C.mul(base, 0.45)); }
    for (let y = y0; y <= y1; y++) for (let x = 2; x < W - 2; x++) p.set(x, y, C.mul(base, 0.32 + 0.1 * (y - y0) / rh));   // shadowed back of the shelf
    let x = 3; while (x < W - 4) { const k = R1();
      if (k < 0.06) { p.disc(x + 3, y1 - 2.5, 2.5, 0x7a8a7a); p.set(x + 2, y1 - 4, 0xc8d8c8); p.rect(x + 2, y1 - 6, 3, 1, 0x4a3a2a); x += 7; continue; }   // a stoppered jar
      if (k < 0.12) { for (let j = 0; j < 3; j++) p.ell(x + 4, y1 - 1 - j * 2, 4, 1, j === 1 ? 0xd0c4a8 : 0xe0d4b8); p.set(x, y1 - 1, 0xa8302a); x += 9; continue; }   // scrolls
      if (k < 0.15 && s > 0) { p.ell(x + 3, y1 - 3, 3, 3, 0xd8ccb0); p.rect(x + 1, y1 - 1, 5, 2, 0xc8bca0); p.set(x + 2, y1 - 3, 0x2a2018); p.set(x + 4, y1 - 3, 0x2a2018); p.set(x + 3, y1 - 1, 0x4a3a2a); x += 8; continue; }   // a skull
      if (k < 0.2) { const n = 3 + Math.floor(R1() * 3); for (let j = 0; j < n; j++) { const c = cols[Math.floor(R1() * cols.length)]; p.rect(x, y1 - j * 2 - 1, 9, 2, c); p.hl(x, x + 8, y1 - j * 2 - 1, C.mul(c, 1.35)); p.vl(x + 8, y1 - j * 2 - 1, y1 - j * 2, 0xe8dcc0); } x += 11; continue; }   // a flat stack
      const w = 2 + Math.floor(R1() * 2), h = Math.min(rh - 5, 9 + Math.floor(R1() * 7)), c = cols[Math.floor(R1() * cols.length)], lean = R1() < 0.08;
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) p.set(x + i + (lean ? Math.floor(j / 6) : 0), y1 - j, j === h - 3 || j === 2 ? 0xd8a43a : C.mul(c, i === 0 ? 1.25 : 0.88));
      x += w + (R1() < 0.18 ? 1 : 0); } }
  return p.jitter(0.03, seed).tex();
};
for (const [k, f] of Object.entries({
  studyWall: () => {   // bottle-green damask, a gold thread lozenge with a small fleur in each
    const p = new Pix(32, 32).fill(0x1c2a22);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const a = (x + y) % 16, b = ((x - y) % 16 + 16) % 16;
      if (a === 0 || b === 0) p.set(x, y, 0x3a4a2e); else if (a === 1 || b === 1) p.set(x, y, 0x16221c); else if (hash(x, y, 301) < 0.06) p.set(x, y, 0x22322a); }
    for (const [cx, cy] of [[8, 0], [24, 0], [0, 8], [16, 8], [8, 16], [24, 16], [0, 24], [16, 24], [8, 32], [24, 32], [32, 8], [32, 24]])
      for (const [dx, dy, c] of [[0, -3, 0x4a5a34], [0, -2, 0x5a6a3a], [-1, -1, 0x4a5a34], [1, -1, 0x4a5a34], [0, 0, 0x6a7a42], [-2, 0, 0x3a4a2e], [2, 0, 0x3a4a2e], [0, 1, 0x4a5a34], [0, 2, 0x3a4a2e]]) p.wset(cx + dx, cy + dy, c);
    return p.jitter(0.04, 302).tex({ repeat: true });
  },
  shelfTall: () => PX.shelves(58, 112, 6, 303, 0x4a2a18),
  shelfTall2: () => PX.shelves(58, 112, 6, 304, 0x4a2a18),
  portrait: () => {   // King Bolesław, painted the year before the siege: grey beard, the old crown, an ermine collar
    const W = 40, H = 52, p = new Pix(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, C.mix(0x2a1e14, 0x120c08, smooth(0, 1, Math.hypot(x - 20, y - 18) / 30)));
    const cx = 20;
    for (let y = 36; y < H; y++) for (let x = 0; x < W; x++) { const hw = 8 + (y - 36) * 1.1; if (Math.abs(x - cx) < hw) p.set(x, y, C.mix(0x4a1418, 0x2a0a0e, Math.abs(x - cx) / hw)); }   // robe
    for (let y = 34; y < 42; y++) for (let x = 0; x < W; x++) { const hw = 7 + (y - 34) * 1.3; if (Math.abs(x - cx) < hw && Math.abs(x - cx) > hw - 5 + (y - 34) * 0.2) p.set(x, y, hash(x, y, 305) < 0.12 ? 0x1a1414 : 0xe8e2d6); }   // ermine
    p.rect(cx - 2, 31, 5, 5, 0xc89a7a);   // neck
    p.ell(cx, 23, 6.5, 8.5, 0xd8aa88); p.ell(cx + 2, 24, 4, 7, 0xe0b898);   // face, lit from the right
    for (let y = 26; y < 36; y++) for (let x = cx - 7; x <= cx + 7; x++) { const u = (x - cx) / 7, v = (y - 26) / 10; if (u * u * (1 + v) + v * v * 0.6 < 1 && y > 26 + Math.abs(u) * 2) p.set(x, y, hash(x, y, 306) < 0.3 ? 0xd8d4cc : 0xaaa49a); }   // beard
    for (let x = cx - 7; x <= cx + 7; x++) for (let y = 15; y < 20; y++) if (y < 17 || Math.abs(x - cx) > 5) p.set(x, y, 0x9a948c);   // hair
    p.hl(cx - 4, cx - 2, 22, 0x3a2418); p.hl(cx + 2, cx + 4, 22, 0x3a2418); p.set(cx - 3, 23, 0x2a1810); p.set(cx + 3, 23, 0x2a1810); p.vl(cx + 1, 23, 26, 0xc0906c); p.hl(cx - 2, cx + 2, 29, 0x7a4a3a);   // brows, eyes, nose, mouth
    for (let x = cx - 7; x <= cx + 7; x++) { p.set(x, 15, 0xc8962e); p.set(x, 14, 0xf0c45e); p.set(x, 13, 0xc8962e); }   // crown band and points
    for (const dx of [-6, -2, 2, 6]) { p.vl(cx + dx, 10, 13, 0xe0b048); p.set(cx + dx, 9, 0xf4d27a); } p.set(cx, 14, 0xa8202a); p.set(cx - 4, 14, 0x2a5aa8); p.set(cx + 4, 14, 0x2a8a4a);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (hash(x, y, 307) < 0.08) p.shade(x, y, 0.88);   // old varnish
    PX.frame(p, W, H, 3);
    return p.tex();
  },
  windowNight: () => {   // the leaded window at night: blue-black sky, the lower town's lamps far below
    const W = 36, H = 76, p = new Pix(W, H), cx = 17.5, top = 18;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const inArch = y >= top || Math.hypot(x - cx, y - top) <= 18; if (!inArch) continue;
      const frame = y >= top ? Math.min(x, W - 1 - x) < 3 || y > H - 5 : Math.hypot(x - cx, y - top) > 15;
      if (frame) { p.set(x, y, C.mul(0x4a443c, 0.85 + 0.3 * hash(x >> 2, y >> 2, 308))); continue; }
      const a = (x + y) % 7, b = ((x - y) % 7 + 7) % 7, lead = a === 0 || b === 0;
      let sky = C.mix(0x0e1424, 0x22304a, smooth(0, 1, y / H));
      if (y > 56 && hash(x, y >> 1, 309) < 0.07) sky = 0xffb860; else if (y > 50 && y < 56 && hash(x, y, 310) < 0.03) sky = 0xd89a50;   // lamps in the lower town
      p.set(x, y, lead ? 0x14100c : sky); }
    p.vl(17, top - 15, H - 5, 0x14100c); p.vl(18, top - 15, H - 5, 0x2a2420); p.hl(3, W - 4, 44, 0x14100c);
    return p.tex();
  },
  rainGlass: () => {   // runnels and beads of rain on the glass (scrolled down the pane)
    const p = new Pix(32, 64);
    for (let i = 0; i < 9; i++) { const x0 = Math.floor(hash(i, 1, 311) * 32), len = 8 + Math.floor(hash(i, 2, 311) * 26), y0 = Math.floor(hash(i, 3, 311) * 64);
      for (let j = 0; j < len; j++) { const x = x0 + Math.round(Math.sin((y0 + j) * 0.3 + i) * 0.8); p.wset(x, y0 + j, 0x9ab0d0); }
      p.set((x0 + 32) % 32, (y0 + len) % 64, 0xd8e8ff); p.set((x0 + 33) % 32, (y0 + len) % 64, 0x9ab0d0); }
    for (let i = 0; i < 40; i++) { const x = Math.floor(hash(i, 4, 311) * 32), y = Math.floor(hash(i, 5, 311) * 64); p.set(x, y, hash(i, 6, 311) < 0.5 ? 0xc8d8f0 : 0x8aa0c0); }
    for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) if (p.a(x, y)) p.d[(y * 32 + x) * 4 + 3] = 200;
    const t = p.tex({ repeat: true, mip: false }); return t;
  },
  curtainGreen: () => PX.curtain([0x0e1a14, 0x14261c, 0x1c3426, 0x26442e, 0x305238, 0x3e6444], 56),
  deskFront: () => PX.drawers(76, 24, 2, 0x4a2616),
  deskTop: () => {   // the desk seen from above: blotter, letters, a broken seal, the week's petitions in a pile
    const W = 76, H = 26, p = new Pix(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, C.mul(0x5a2a18, 0.8 + 0.3 * noise1(x * 0.6 + noise1(y * 0.2, 312) * 4, 313)));
    p.rect(22, 5, 30, 17, 0x2a3a2a); p.rect(23, 6, 28, 15, 0x34483a);   // blotter
    for (const [x, y, w, h, r] of [[26, 8, 12, 9, 0], [36, 10, 11, 8, 1], [6, 6, 12, 14, 0], [8, 4, 11, 14, 1], [58, 8, 12, 12, 0]]) { p.rect(x, y, w, h, r ? 0xe0d4b8 : 0xece2ca); p.hl(x, x + w - 1, y, 0xf8f0dc);
      for (let j = y + 2; j < y + h - 1; j += 2) p.hl(x + 1, x + w - 2 - (j * 7 % 3), j, 0x8a7a6a); }
    p.disc(44, 15, 1.6, 0xa8202a); p.set(44, 15, 0xc84040); p.disc(14, 17, 1.4, 0xa8202a);
    return p.tex();
  },
  inkQuill: () => { const p = new Pix(8, 14); p.rect(1, 9, 5, 5, 0x1a1a22); p.hl(1, 5, 9, 0x3a3a4a); p.rect(2, 8, 3, 1, 0x2a2a30);
    for (let i = 0; i < 9; i++) { p.set(4 + i * 0.35, 8 - i, 0xe8e2d6); p.set(5 + i * 0.35, 8 - i, i < 7 ? 0xc8c0b0 : 0xe8e2d6); } return p.tex(); },
  hourglass: () => { const p = new Pix(8, 12); p.hl(0, 7, 0, 0x6a4a2a); p.hl(0, 7, 11, 0x6a4a2a); p.vl(0, 0, 11, 0x5a3a22); p.vl(7, 0, 11, 0x5a3a22);
    for (let y = 1; y < 11; y++) { const w = Math.round(Math.abs(y - 5.5) * 0.55); for (let x = 3 - w; x <= 4 + w; x++) p.set(x, y, y > 7 || (y < 4 && x > 2 && x < 5) ? 0xd8b070 : 0xa8c0c8); } return p.tex(); },
  chessTop: () => { const p = new Pix(18, 18).fill(0x3a1e10); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x + 1, y + 1, ((x >> 1) + (y >> 1)) % 2 ? 0x2a1a10 : 0xd8c8a0); return p.tex(); },
  chessmen: () => {   // a game left in the middle: the king's side is losing
    const p = new Pix(22, 8), piece = (x, h, c, crown) => { p.rect(x, 8 - h, 2, h - 1, c); p.hl(x - 1, x + 2, 7, c); if (crown) { p.set(x, 8 - h - 1, c); p.set(x + 1, 8 - h - 1, c); } };
    [[1, 4, 0xe8dcc0], [4, 5, 0x2a1a14], [7, 3, 0xe8dcc0], [10, 6, 0x2a1a14, 1], [13, 4, 0x2a1a14], [16, 7, 0xe8dcc0, 1], [19, 3, 0x2a1a14]].forEach(([x, h, c, k]) => piece(x, h, c, k));
    return p.outline(null, 0.6).tex(); },
  stool: () => { const p = new Pix(14, 15); p.rect(0, 0, 14, 3, 0x6a1a1a); p.hl(0, 13, 0, 0x8a2a24); p.rect(0, 3, 14, 2, 0x4a2616);
    for (const x of [1, 11]) p.rect(x, 5, 2, 10, 0x3e2012); p.hl(2, 11, 10, 0x2a140c); return p.tex(); },
  curio: () => {   // a glass-fronted cabinet of oddments: shells, a narwhal tusk, a stuffed owl, a little silver swan
    const W = 36, H = 66, p = new Pix(W, H).fill(0x3a1e10);
    for (let y = 0; y < H; y++) { p.set(0, y, 0x5a3420); p.set(W - 1, y, 0x1e0e06); } for (let x = 0; x < W; x++) { p.set(x, 0, 0x6a3e26); p.set(x, H - 1, 0x1e0e06); }
    const sh = [[3, 18], [21, 36], [39, 54]];
    for (const [y0, y1] of sh) { p.rect(3, y0, W - 6, y1 - y0, 0x1a2420); p.hl(3, W - 4, y1, 0x6a3e26); p.hl(3, W - 4, y1 + 1, 0x2a160c); }
    p.ell(10, 16, 3, 2, 0xe8d8c0); p.ell(18, 16.5, 2.5, 1.5, 0xd8a888); p.ell(26, 15.5, 3, 2.5, 0xf0e0c8); for (let i = 0; i < 6; i++) p.set(24 + i, 14 + (i % 2), 0xc8a888);   // shells
    p.ell(10, 31, 4, 5, 0x6a4a2a); p.ell(10, 27, 3, 3, 0x7a5a34); p.set(9, 27, 0xf0c040); p.set(11, 27, 0xf0c040); p.set(10, 28, 0x3a2a1a);   // owl
    for (let i = 0; i < 15; i++) p.set(18 + i * 0.6, 35 - i * 0.9, i % 2 ? 0xe0d8c8 : 0xc8c0b0);   // tusk
    p.ell(14, 52, 4, 2, 0xd8dce0); p.vl(17, 47, 51, 0xd8dce0); p.set(18, 47, 0xd8dce0); p.set(19, 47, 0xe8a030); p.rect(11, 54, 8, 1, 0x8a8a90);   // silver swan
    p.rect(22, 48, 3, 6, 0x4a7a5a); p.rect(27, 46, 3, 8, 0x8a3a2a); p.set(23, 47, 0x2a2a20); p.set(28, 45, 0x2a2a20);   // bottles
    p.rect(3, 57, W - 6, 7, 0x4a2616); p.hl(3, W - 4, 57, 0x6a3a22); p.disc(18, 60, 1, 0xd6a640);   // drawer
    for (let y = 3; y < 55; y++) for (let x = 3; x < W - 3; x++) { const g = (x + y * 0.6) % 22; if (g < 1.5) p.set(x, y, C.mix(p.get(x, y), 0xc8d8e0, 0.45)); }   // glass glints
    p.vl(17, 3, 55, 0x5a3420); p.vl(18, 3, 55, 0x2a160c);
    return p.tex();
  },
  swordWall: () => {   // his father's sword on a board, the blade nicked from the siege
    const W = 16, H = 48, p = new Pix(W, H);
    p.rect(1, 4, 14, 40, 0x3a1e10); p.hl(1, 14, 4, 0x5a3420); p.hl(1, 14, 43, 0x1e0e06); p.vl(1, 4, 43, 0x4a2a18); p.vl(14, 4, 43, 0x1e0e06);
    p.rect(7, 2, 2, 7, 0x4a2a1a); p.disc(7.5, 1.5, 1.6, 0xc8962e); p.rect(3, 9, 10, 2, 0xc8962e); p.hl(3, 12, 9, 0xf0c45e);
    for (let y = 11; y < 44; y++) { const w = y > 40 ? 44 - y : 2; p.rect(8 - w / 2, y, Math.max(1, w), 1, 0xb8c0c8); p.set(8 - w / 2, y, 0xe0e8f0); }
    p.set(9, 22, 0x3a2e28); p.set(9, 30, 0x3a2e28); p.set(7, 35, 0x3a2e28);
    p.rect(4, 44, 8, 3, 0xb8862e); p.hl(4, 11, 44, 0xe0b048);
    return p.tex();
  },
  armStand: () => { const p = new Pix(16, 30); p.vl(7, 0, 22, 0x6a3e22); p.vl(8, 0, 22, 0x4a2a18); p.line(7, 20, 1, 29, 0x4a2a18); p.line(8, 20, 14, 29, 0x3e2012); p.line(8, 21, 8, 29, 0x5a3420); p.rect(5, 20, 6, 2, 0xb8862e); return p.tex(); },
  figures: () => {   // painted wooden pieces on the campaign map: blue for ours, red for the Margrave's old line
    const p = new Pix(28, 6); [[1, 0x2a4a8a], [4, 0x2a4a8a], [9, 0xa82020], [12, 0xa82020], [15, 0xa82020], [21, 0x2a4a8a], [25, 0xe8dcc0]].forEach(([x, c]) => { p.rect(x, 2, 2, 4, c); p.set(x, 1, C.mul(c, 1.3)); p.set(x + 1, 1, c); });
    return p.outline(null, 0.6).tex(); },
  lantern: () => { const p = new Pix(10, 18); p.vl(4, 0, 3, 0x2a2622); p.vl(5, 0, 3, 0x4a443c); p.rect(2, 3, 6, 2, 0x2a2622);
    for (let y = 5; y < 14; y++) { p.set(1, y, 0x2a2622); p.set(8, y, 0x2a2622); for (let x = 2; x < 8; x++) p.set(x, y, C.mix(0xfff0b0, 0xffa040, Math.abs(x - 4.5) / 4 + (y - 5) / 20)); } p.vl(4, 5, 13, 0x2a2622);
    p.rect(1, 14, 8, 2, 0x2a2622); p.rect(3, 16, 4, 2, 0x4a443c); return p.tex(); },
  globe: () => { const p = new Pix(18, 18); for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) { const u = (x - 8.5) / 8, v = (y - 8.5) / 8; if (u * u + v * v > 1) continue;
      const land = noise1(x * 0.5 + 2, 314) * noise1(y * 0.5 + 5, 315) > 0.3; p.set(x, y, C.mul(land ? 0xb89a5a : 0x2a5a7a, 1.15 - 0.4 * Math.hypot(u + 0.3, v + 0.3))); }
    return p.tex(); },
  rugStudy: () => PX.rug(96, 44, { field: 0x1e3a2a, edge: 0x0e1a12, gold: 0xb8862e, navy: 0x5a1a1a, cream: 0xd8c098 }, 316),
  mantel: () => PX.drawers(80, 6, 1, 0x3e2012),
})) PX.def(k, f);
