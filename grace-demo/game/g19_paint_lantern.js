/* THE HOUSE OF THE LANTERN — pixel painters for Wanda's house in the river quarter (STORY.md §9): ochre plaster between
   dark timbers, worn planks, red paper lanterns everywhere, the counter and its bottles, the gallery's five painted doors,
   and the women's rooms. Night: warm from the hearth and the lanterns, cool from the river window. */
const HP = {
  plaster: [0x5a3e28, 0x7a5636, 0x9a7048, 0xb88a5a, 0xcca06c],
  timber: [0x140c06, 0x24160c, 0x3a2414, 0x52341e],
  red: [0x3a0808, 0x6a1010, 0x9a1a14, 0xc8301e, 0xf0603a],
};
/* a gallery door: planks in a colour, iron hinges and ring, her token painted on a board over it */
PX.houseDoor = function (col, token) {
  const W = 34, H = 76, p = new Pix(W, H), T = HP.timber;
  for (let y = 12; y < H; y++) for (let x = 0; x < W; x++) { if (x < 3 || x > W - 4 || y < 15) { p.set(x, y, T[(x + y) % 3 === 0 ? 1 : 2]); continue; }
    const plank = Math.floor((x - 3) / 7); p.set(x, y, C.mul(col, (x - 3) % 7 === 0 ? 0.7 : 0.92 + 0.12 * hash(plank, y >> 3, 1501))); }
  for (const y of [24, 60]) { p.hl(4, 20, y, 0x2a2a2e); p.hl(4, 18, y + 1, 0x4a4a52); }
  p.disc(25, 44, 2.4, 0x5a5a62); p.disc(25, 44, 1.2, 0x2a2a2e);
  p.rect(5, 0, W - 10, 11, T[3]); p.rect(6, 1, W - 12, 9, 0xe8dcc0); token(p, W / 2, 5.5);
  return p.outline(null, 0.6).tex();
};
HP.tokens = {
  rose: (p, x, y) => { p.disc(x, y, 3, 0xc8301e); p.disc(x - 1, y - 1, 1.4, 0xf0603a); p.vl(x, y + 3, y + 4, 0x346a22); },
  compass: (p, x, y) => { for (let a = 0; a < 6.28; a += 0.4) p.set(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 0x2c4478); p.vl(x, y - 4, y + 4, 0x9a6a1c); p.hl(x - 4, x + 4, y, 0x9a6a1c); },
  wheat: (p, x, y) => { p.vl(x, y - 4, y + 4, 0xc8962a); for (let i = 0; i < 3; i++) { p.set(x - 1, y - 3 + i * 2, 0xe8b840); p.set(x + 1, y - 3 + i * 2, 0xe8b840); } },
  shell: (p, x, y) => { for (let i = -3; i <= 3; i++) p.line(x, y + 3, x + i, y - 2, 0xd8a8b8); p.hl(x - 3, x + 3, y + 3, 0xa87888); },
  quill: (p, x, y) => { p.line(x - 3, y + 4, x + 3, y - 4, 0x3a3a44); p.line(x + 3, y - 4, x + 1, y - 1, 0x6a6a74); p.set(x - 3, y + 4, 0x141418); },
  lamp: (p, x, y) => { p.ell(x, y, 2.6, 3.4, 0xc8301e); p.hl(x - 2, x + 2, y - 4, 0xc8962a); p.set(x, y + 4, 0xc8962a); },
};
for (const [k, f] of Object.entries({
  houseWall: () => { const p = new Pix(64, 64), P = HP.plaster, T = HP.timber;   // ochre plaster between timbers: a post, a rail, a brace
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const m = noise1(x * 0.08 + 1.7, 1511) * noise1(y * 0.09 + 4.3, 1512); let c = P[clamp(2 + (PX.dith(x, y) < m * 1.6 ? 1 : 0) - (hash(x >> 1, y >> 1, 1513) < 0.08 ? 1 : 0), 0, 4)];
      const post = x < 5, rail = y >= 30 && y < 35, brace = Math.abs((x - 5) - (63 - y) * 0.85) < 3 && y > 34;
      if (post || rail || brace) { const e = post ? x : rail ? y - 30 : 0; c = T[e === 0 ? 3 : e > 3 ? 0 : 2]; if (hash(x, y, 1514) < 0.12) c = T[1]; }
      p.set(x, y, c); }
    return p.tex({ repeat: true }); },
  housePlanks: () => { const p = new Pix(64, 64), W = [0x2a1a0e, 0x3a2414, 0x4e321c, 0x624026, 0x7a5232];   // worn boards, the grain along them, nail heads, a wine stain
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const b = y >> 3, off = (b * 23) % 64, seam = (x + off) % 64 === 0 || (y & 7) === 7;
      let c = W[clamp(2 + (noise1(x * 0.2 + b * 13, 1521) > 0.55 ? 1 : 0) - (noise1(x * 0.05 + b * 7, 1522) < 0.3 ? 1 : 0), 0, 4)];
      if (seam) c = W[0]; if (((x + off) % 64 === 3 || (x + off) % 64 === 60) && (y & 7) === 3) c = 0x6a6a72; p.set(x, y, c); }
    for (let i = 0; i < 40; i++) { const x = 40 + hash(i, 1, 1523) * 14, y = 20 + hash(i, 2, 1523) * 10; if (Math.hypot(x - 47, y - 25) < 5) p.set(x, y, C.mul(p.get(x, y), 0.7)); }
    return p.tex({ repeat: true, aniso: 4 }); },
  redLantern: () => { const p = new Pix(16, 26);   // a red paper lantern: ribs, a gold cap, a tassel; bright where the candle is
    p.vl(8, 0, 3, 0x3a3a3a); p.rect(5, 3, 7, 2, 0xc8962a);
    for (let y = 5; y < 20; y++) { const hw = 6 * Math.sin((y - 4) / 16 * Math.PI) + 0.5; for (let x = -Math.floor(hw); x <= hw; x++) { const glow = 1 - Math.abs(x) / (hw + 1) * 0.6 - Math.abs(y - 12) / 9 * 0.4; let c = C.mix(0x8a1010, 0xff7a4a, clamp(glow, 0, 1)); if ((y - 5) % 4 === 0) c = C.mul(c, 0.7); p.set(8 + x, y, c); } }
    p.rect(6, 20, 5, 2, 0xc8962a); for (let y = 22; y < 26; y++) p.set(8 + (y % 2), y, 0xc8301e);
    return p.tex({}); },
  doorRose: () => PX.houseDoor(0x9a1a14, HP.tokens.rose), doorCompass: () => PX.houseDoor(0x2c3a6a, HP.tokens.compass), doorWheat: () => PX.houseDoor(0x7a6a4a, HP.tokens.wheat),
  doorShell: () => PX.houseDoor(0xa86a7a, HP.tokens.shell), doorQuill: () => PX.houseDoor(0x3a3a44, HP.tokens.quill), doorLamp: () => PX.houseDoor(0x5a3a2a, HP.tokens.lamp),
  barCounter: () => { const W = 96, H = 38, p = new Pix(W, H), T = HP.timber;   // the counter's front: carved panels, a brass rail; a jug, tankards and a candle on top
    for (let y = 8; y < H; y++) for (let x = 0; x < W; x++) { let c = T[2]; const px = x % 24; if (px < 2 || y < 10 || y > H - 3) c = T[1]; else if (px > 3 && px < 21 && y > 12 && y < H - 5) c = (px === 4 || y === 13) ? T[3] : C.mul(T[2], 1.12); p.set(x, y, c); }
    p.hl(0, W - 1, 8, 0x9a6a3a); p.hl(0, W - 1, 9, T[3]); for (let x = 0; x < W; x++) p.set(x, H - 7, x % 2 ? 0xc8962a : 0x9a6a1c);
    for (const x of [10, 18, 62, 70]) { p.rect(x, 2, 5, 6, 0x8a6a4a); p.rect(x + 5, 3, 2, 3, 0x6a4a2a); p.hl(x, x + 4, 2, 0xa8865a); }
    p.ell(40, 4, 4, 4, 0x6a4a2a); p.rect(38, 0, 4, 2, 0x5a3a20); p.vl(84, 0, 7, 0xf0e8d8); p.set(84, 0, 0xffd250);
    return p.outline(null, 0.6).tex(); },
  bottleShelf: () => { const W = 64, H = 50, p = new Pix(W, H), T = HP.timber, glass = [0x2e6a3a, 0x9a6a1c, 0x6a1a2a, 0x2c4478, 0xc8962a, 0x4a7a5a];   // two shelves of bottles and jars
    for (const y of [22, 47]) { p.hl(0, W - 1, y, T[3]); p.hl(0, W - 1, y + 1, T[1]); p.hl(0, W - 1, y + 2, T[0]); }
    for (const [y0, seed] of [[22, 1531], [47, 1532]]) { let x = 2; while (x < W - 5) { const tall = 8 + Math.floor(hash(x, seed, 1) * 10), w = 3 + Math.floor(hash(x, seed, 2) * 3), c = glass[Math.floor(hash(x, seed, 3) * glass.length)];
      for (let y = y0 - tall; y < y0; y++) for (let k = 0; k < w; k++) { if (y < y0 - tall + 3 && (k === 0 || k === w - 1)) continue;   // the shoulders narrow to the neck
        p.set(x + k, y, C.mul(c, k === 0 ? 1.4 : 1)); }
      p.rect(x + 1, y0 - tall - 2, Math.max(1, w - 2), 2, c); x += w + 1 + Math.floor(hash(x, seed, 4) * 2); } }
    return p.outline(null, 0.6).tex(); },
  tableSet: () => { const W = 48, H = 14, p = new Pix(W, H);   // what's on a tavern table: tankards, a candle stub, dice, a heel of bread
    for (const x of [4, 30]) { p.rect(x, 5, 5, 8, 0x8a6a4a); p.rect(x + 5, 6, 2, 4, 0x6a4a2a); p.hl(x, x + 4, 5, 0xc8b890); }
    p.rect(18, 9, 3, 4, 0xf0e8d8); p.set(19, 8, 0xffd250); p.ell(42, 11, 4, 2, 0xb8803a); p.set(24, 12, 0xf0f0e8); p.set(26, 12, 0xf0f0e8); p.set(25, 11, 0x141414);
    return p.outline(null, 0.6).tex(); },
  lutePlayer: () => { const W = 34, H = 50, p = new Pix(W, H);   // a musician on a stool with a lute, hat over his eyes
    p.rect(10, 38, 12, 3, HP.timber[3]); for (const x of [11, 20]) p.vl(x, 41, 49, HP.timber[2]);
    p.ell(16, 28, 6, 9, 0x2e5a34); p.disc(16, 15, 3.6, 0xd8a888); p.hl(11, 21, 12, 0x5a2a2a); p.rect(13, 9, 7, 3, 0x5a2a2a);
    p.rect(12, 37, 4, 9, 0x3a2e22); p.rect(18, 37, 4, 9, 0x3a2e22); p.rect(11, 46, 5, 2, 0x1a120c); p.rect(18, 46, 5, 2, 0x1a120c);
    p.ell(22, 31, 5, 4, 0xc88a3a); p.disc(22, 31, 1.4, 0x2a1a0e); p.line(24, 29, 32, 18, 0x8a5a2a); p.rect(30, 16, 3, 3, 0x6a4a2a); p.line(14, 26, 22, 30, 0xd8a888);
    return p.outline(null, 0.6).tex(); },
  riverWindow: () => { const W = 40, H = 54, p = new Pix(W, H);   // an arched window, leaded, the river and a moon beyond
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (Math.abs(x - 19.5) > 19.5 - (y < 14 ? 14 - y : 0)) continue;   // a pointed arch
      let c = y > 36 ? C.mix(0x1a2a4a, 0x2a4a6a, (y - 36) / 18) : C.mix(0x0e1630, 0x2a3a6a, y / 36); if (y > 36 && hash(x, y, 1541) < 0.1) c = 0x8aa8d8;
      if (x < 2 || x > W - 3 || y < 2 || y > H - 3) c = HP.timber[2]; else if ((x - 2) % 9 === 0 || (y - 2) % 10 === 0) c = 0x2a2a30; p.set(x, y, c); }
    p.disc(27, 14, 3, 0xe8ecf8); return p.outline(null, 0.6).tex(); },
  cellarArch: () => { const W = 44, H = 66, p = new Pix(W, H), S = [0x2a2622, 0x46423c, 0x5e5a52, 0x7a746a];   // a low stone arch, steps going down into the dark, the iron-bound door open
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const cx = x - 21.5, inArch = y > 18 ? Math.abs(cx) < 15 : Math.hypot(cx, y - 18) < 15, ring = y > 18 ? Math.abs(cx) < 20 : Math.hypot(cx, y - 18) < 20;
      if (!ring) continue; if (!inArch) { p.set(x, y, S[1 + ((x >> 2) + (y >> 2)) % 3]); continue; } const d = (y - 20) / 46; p.set(x, y, C.mul(0x1a120c, 0.4 + d * 0.6)); }
    for (let i = 0; i < 6; i++) { const y = H - 4 - i * 6, w = 13 - i; p.hl(22 - w, 21 + w, y, S[3 - Math.min(2, i >> 1)]); p.hl(22 - w, 21 + w, y + 1, S[0]); }
    for (let y = 22; y < H - 2; y++) for (let x = 2; x < 9; x++) p.set(x, y, (y % 10 === 0) ? 0x3a3a40 : HP.timber[2]);
    return p.outline(null, 0.6).tex(); },
  hearthLogs: () => { const p = new Pix(40, 14); p.line(4, 12, 34, 6, 0x3a2414); p.line(5, 13, 35, 7, 0x5a3a20); p.line(36, 12, 6, 6, 0x3a2414); p.line(35, 13, 5, 7, 0x5a3a20);
    for (let x = 8; x < 32; x++) { p.set(x, 10, hash(x, 1, 1551) < 0.5 ? 0xf06a18 : 0xc83a10); p.set(x, 11, 0x8a1a08); } return p.outline(null, 0.6).tex(); },
  houseQuilt: () => { const p = new Pix(64, 64), cols = [0x8a3a2a, 0xa8784a, 0x6a4a3a, 0xc8a070, 0x5a2a2a, 0x9a6a3a];   // a patchwork quilt, the squares stitched
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const c = cols[Math.floor(hash(x >> 4, y >> 4, 1561) * cols.length)]; p.set(x, y, (x & 15) === 0 || (y & 15) === 0 ? C.mul(c, 0.65) : C.mul(c, 0.95 + 0.1 * hash(x, y, 1562))); }
    return p.tex({ repeat: true }); },
  pillowPix: () => { const p = new Pix(24, 10); p.ell(12, 5, 11, 4.5, 0xe8dcc0); p.ell(10, 4, 7, 2.4, 0xf8f0e0); p.hl(2, 22, 8, 0xc8b898); return p.outline(null, 0.65).tex(); },
  mapWall: () => { const W = 56, H = 42, p = new Pix(W, H);   // Nadia's maps: parchment, roads in red, rivers in blue, a compass rose
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, C.mul(0xd8c49a, 0.9 + 0.15 * hash(x >> 1, y >> 1, 1571)));
    for (let k = 0; k < 4; k++) { let y = 6 + k * 9; for (let x = 2; x < W - 2; x++) { y += Math.round(Math.sin(x * 0.3 + k) * 0.7); p.set(x, clamp(y, 1, H - 2), k % 2 ? 0x2c6aa0 : 0x9a2a1a); } }
    for (let a = 0; a < 6.28; a += 0.8) p.line(44, 32, 44 + Math.cos(a) * 6, 32 + Math.sin(a) * 6, 0x5a3a20); p.disc(44, 32, 1.4, 0x9a6a1c);
    for (let x = 0; x < W; x++) { p.set(x, 0, 0x8a6a3a); p.set(x, H - 1, 0x8a6a3a); }
    return p.outline(null, 0.6).tex(); },
  copperBath: () => { const W = 64, H = 34, p = new Pix(W, H);   // Lena's copper tub on its claws, water to the brim, a cloth over the edge
    for (let y = 6; y < 30; y++) { const hw = 30 - Math.max(0, y - 22) * 1.6; for (let x = -Math.floor(hw); x <= hw; x++) { const l = clamp(0.6 - x / hw * 0.35 - (y - 6) / 24 * 0.25, 0, 1); p.set(32 + x, y, C.ramp([0x5a2a14, 0x8a4a22, 0xb86a32, 0xe0965a], l)); } }
    for (let x = 4; x < 61; x++) { p.set(x, 6, 0xf0b070); p.set(x, 7, 0xe0965a); p.set(x, 8, x % 5 === 0 ? 0xa8c8e0 : 0x6a98c0); }
    for (const x of [10, 54]) { p.rect(x - 2, 30, 4, 4, 0x8a4a22); p.set(x - 3, 33, 0x5a2a14); p.set(x + 2, 33, 0x5a2a14); }
    p.rect(44, 6, 8, 14, 0xf0e8d8); p.vl(44, 6, 19, 0xc8c0b0);
    return p.outline(null, 0.6).tex(); },
  crossTurned: () => { const p = new Pix(14, 22); p.rect(5, 0, 4, 22, 0x5a3a20); p.rect(0, 5, 14, 4, 0x5a3a20); p.rect(6, 1, 2, 20, 0x3a2414); p.set(7, 3, 0x6a6a72); return p.outline(null, 0.6).tex(); },   // its back to the room: the bare wood, a nail
  booksPile: () => { const p = new Pix(24, 20), cols = [0x6a1a1a, 0x1e3a5a, 0x3a5a2a, 0x8a6a2a, 0x4a2a4a]; for (let i = 0; i < 5; i++) { const y = 18 - i * 4, w = 18 - (i % 3) * 3; p.rect(3 + (i % 2) * 2, y - 3, w, 3, cols[i]); p.hl(3 + (i % 2) * 2, 2 + (i % 2) * 2 + w, y - 1, 0xe8dcc0); }
    return p.outline(null, 0.6).tex(); },
  cloakPeg: () => { const p = new Pix(26, 60); p.rect(2, 0, 22, 3, HP.timber[3]); p.ell(12, 22, 9, 18, 0x4a3a2a); p.ell(10, 20, 5, 15, 0x5e4a36); p.rect(9, 2, 6, 4, 0x3a2a1a);   // a soldier's cloak on a peg, his sword hung beside it
    p.vl(21, 4, 52, 0x8a929c); p.vl(22, 4, 52, 0xb8c0c8); p.hl(18, 25, 10, 0x9a6a1c); p.rect(20, 3, 4, 4, 0x3a2414); return p.outline(null, 0.6).tex(); },
  silkSwag: () => { const W = 64, H = 18, p = new Pix(W, H), cols = [0xc8301e, 0x2e6a3a, 0xe8b840];   // Róża's room: silk swags in red, green and gold
    for (let k = 0; k < 3; k++) for (let x = 0; x < W; x++) { const y = 2 + k * 3 + Math.sin(x / W * Math.PI) * 9; for (let d = 0; d < 3; d++) p.set(x, y + d, C.mul(cols[k], d === 0 ? 1.2 : 1)); }
    return p.outline(null, 0.65).tex({}); },
  dressScreen: () => { const W = 48, H = 60, p = new Pix(W, H);   // a three-leaf screen, painted with herons
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const leaf = Math.floor(x / 16), lx = x % 16; let c = lx < 1 || lx > 14 || y < 1 || y > H - 3 ? HP.timber[2] : C.mul(0xd8c49a, 0.92 + 0.08 * hash(x, y >> 2, 1581)); p.set(x, y, c); }
    for (const cx of [8, 24, 40]) { p.ell(cx, 30, 3, 2, 0x5a6a7a); p.line(cx - 1, 28, cx - 3, 18, 0x5a6a7a); p.line(cx, 32, cx - 1, 42, 0x3a3a3a); p.line(cx + 1, 32, cx + 2, 42, 0x3a3a3a); }
    return p.outline(null, 0.6).tex(); },
})) PX.def(k, f);
/* ---------------------------------------------------------------- the bathhouse under the gallery (g55) */
PX.def('tubStaves', () => { const p = new Pix(32, 32);   // oak staves, two iron hoops; goes round the tub (repeat)
  for (let x = 0; x < 32; x++) { const s = Math.floor(x / 4), k = 0.78 + 0.3 * hash(s, 7, 61), edge = x % 4 === 0 ? 0.62 : x % 4 === 3 ? 0.9 : 1;
    for (let y = 0; y < 32; y++) p.set(x, y, C.mul(0x7a4e2a, k * edge * (0.92 + 0.14 * hash(x, y, 62)) * (y < 2 ? 1.25 : 1))); }
  for (const y of [7, 24]) for (let x = 0; x < 32; x++) { p.set(x, y, 0x5a5a62); p.set(x, y + 1, 0x2a2a30); p.set(x, y + 2, C.mul(p.get(x, y + 2), 0.7)); if (x % 8 === 3) p.set(x, y, 0x9a9aa2); }
  return p.tex({ repeat: true }); });
PX.def('copperBoiler', () => { const W = 34, H = 62, p = new Pix(W, H);   // a riveted copper on a brick firebox, the fire door ajar
  for (let y = 44; y < H; y++) for (let x = 2; x < W - 2; x++) { const row = Math.floor((y - 44) / 4), bx = (x + (row % 2) * 4) % 8; p.set(x, y, bx === 0 || (y - 44) % 4 === 0 ? 0x3a2a24 : C.mul(0x8a4a3a, 0.8 + 0.3 * hash(Math.floor((x + (row % 2) * 4) / 8), row, 63))); }
  p.rect(11, 49, 12, 10, 0x1a1210); for (let y = 51; y < 58; y++) for (let x = 13; x < 21; x++) p.set(x, y, C.ramp([0xb83a10, 0xff8a2a, 0xffd070], clamp(1 - Math.hypot(x - 17, y - 56) / 6, 0, 1)));
  for (let y = 8; y < 44; y++) for (let x = 5; x < W - 5; x++) { const u = (x - 5) / (W - 11), l = clamp(0.85 - Math.abs(u - 0.32) * 1.5, 0, 1); p.set(x, y, C.ramp([0x4a2210, 0x8a4a22, 0xc87a3a, 0xf0b070], l)); }
  for (let x = 5; x < W - 5; x++) { const u = (x - 5) / (W - 11), dy = Math.round(5 * Math.sqrt(Math.max(0, 1 - Math.pow(u * 2 - 1, 2)))); for (let y = 8 - dy; y < 8; y++) p.set(x, y, C.ramp([0x4a2210, 0x8a4a22, 0xc87a3a, 0xf0b070], clamp(0.9 - Math.abs(u - 0.32) * 1.5, 0, 1))); }
  for (const y of [14, 28, 42]) for (let x = 5; x < W - 5; x++) { p.set(x, y, 0x5a2a14); if (x % 4 === 1) p.set(x, y - 1, 0xf8c890); }
  p.rect(15, 0, 4, 4, 0x8a4a22); p.rect(W - 6, 30, 5, 3, 0xc87a3a); p.rect(W - 3, 30, 2, 6, 0x8a4a22);
  return p.outline(null, 0.55).tex(); });
PX.def('towelRail', () => { const W = 44, H = 36, p = new Pix(W, H);   // a drying rail: two linens and a red house robe
  p.rect(2, 4, 2, 32, 0x4a3020); p.rect(W - 4, 4, 2, 32, 0x4a3020); p.rect(2, 4, W - 4, 2, 0x6a4428); p.hl(0, 5, 35, 0x3a2418); p.hl(W - 6, W - 1, 35, 0x3a2418);
  for (const [x0, w, h, c] of [[7, 9, 20, 0xe8dcc4], [18, 9, 24, 0xd8ccb0], [29, 10, 28, 0xa82a2a]]) for (let y = 5; y < 5 + h; y++) for (let x = x0; x < x0 + w; x++)
    p.set(x, y, C.mul(c, (0.82 + 0.2 * noise1((x - x0) * 0.9, 64 + x0)) * (y === 5 ? 1.2 : 1) * (y > 5 + h - 3 && (x + y) % 2 ? 0.85 : 1)));
  return p.outline(null, 0.6).tex(); });
PX.def('bathBucket', () => { const p = new Pix(13, 13); for (let y = 3; y < 13; y++) { const hw = 5 - (y - 3) * 0.12; for (let x = -Math.round(hw); x <= hw; x++) p.set(6 + x, y, C.mul(0x7a4e2a, (x % 2 ? 0.85 : 1) * (0.9 + 0.2 * hash(x, y, 65)))); }
  p.hl(1, 11, 5, 0x3a3a42); p.hl(2, 10, 10, 0x3a3a42); p.hl(2, 10, 3, 0x6a98c0); p.line(1, 3, 6, 0, 0x4a3020); p.line(6, 0, 11, 3, 0x4a3020); return p.outline(null, 0.6).tex(); });
PX.def('bathStool', () => { const p = new Pix(16, 22);   // a three-legged stool with a jug, a soap dish and a folded cloth
  p.rect(1, 12, 14, 2, 0x6a4428); p.vl(2, 14, 21, 0x4a3020); p.vl(13, 14, 21, 0x4a3020); p.vl(8, 14, 20, 0x3a2418);
  p.rect(2, 5, 4, 7, 0xb86a32); p.rect(3, 3, 2, 2, 0xb86a32); p.set(6, 6, 0xb86a32); p.rect(7, 9, 4, 3, 0xe8dcc4); p.hl(7, 10, 8, 0xf8f0e0); p.rect(11, 10, 4, 2, 0xd8c8a0);
  return p.outline(null, 0.6).tex(); });
PX.def('bathPlaster', () => { const p = new Pix(64, 64);   // limewash over stone, damp-stained toward the floor
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const blot = 0.5 * noise1(x * 0.13, 66 + Math.floor(y / 9)) + 0.5 * noise1(y * 0.13, 69 + Math.floor(x / 9));   // blotches, not streaks: one noise along a diagonal read as wood grain
    p.set(x, y, C.mul(0xc8b496, 0.86 + 0.14 * blot + 0.05 * hash(x, y, 67))); }
  for (let i = 0; i < 5; i++) { let x = Math.floor(hash(i, 1, 68) * 64), y = Math.floor(hash(i, 2, 68) * 64); for (let k = 0; k < 9; k++) { p.set(x, y, 0x8a7a66); x += hash(i, k, 70) > 0.5 ? 1 : 0; y += 1; } }   // hairline cracks
  return p.tex({ repeat: true }); });
PX.def('doorBath', () => { const W = 34, H = 66, p = new Pix(W, H);   // the bathhouse door: low, arched, planked, a copper jug painted on it
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const top = 14 - Math.round(Math.sqrt(Math.max(0, 196 - Math.pow((x - 16.5) * 0.85, 2)))); if (y < top) continue;
    const fr = x < 3 || x > W - 4 || y < top + 3; p.set(x, y, fr ? C.mul(0x3a2418, 0.9 + 0.2 * hash(x, y, 72)) : C.mul(0x6a4a30, (x % 6 === 3 ? 0.7 : 1) * (0.85 + 0.25 * noise1(y * 0.3 + x, 73)))); }
  for (const y of [22, 52]) p.hl(4, W - 5, y, 0x2a2a30); p.rect(14, 30, 6, 8, 0xc87a3a); p.rect(15, 28, 4, 2, 0xc87a3a); p.set(20, 31, 0xc87a3a); p.set(21, 32, 0xc87a3a); p.hl(14, 19, 30, 0xf0b070); p.set(W - 8, 40, 0xd8b060);
  for (let x = 4; x < W - 4; x++) if (hash(x, 9, 74) > 0.5) p.set(x, H - 1, 0xd8d0c8);
  return p.tex(); });
PX.def('bathShelf', () => { const W = 46, H = 30, p = new Pix(W, H);   // two shelves of jars, soap, a stack of cloths, a sprig drying
  for (const y of [13, 28]) { p.rect(0, y, W, 2, 0x5a3c24); p.hl(0, W - 1, y, 0x7a5434); }
  const jar = (x, y, w, h, c) => { p.rect(x, y - h, w, h, c); p.hl(x, x + w - 1, y - h, C.mul(c, 1.35)); p.rect(x + 1, y - h - 2, w - 2, 2, 0xc8b490); };
  jar(2, 13, 5, 8, 0x4a7a6a); jar(9, 13, 4, 6, 0xb86a32); jar(15, 13, 6, 9, 0x6a5a8a); jar(24, 13, 4, 5, 0xa83a3a); p.rect(31, 9, 9, 4, 0xe8dcc4); p.hl(31, 39, 9, 0xf8f0e0); p.hl(31, 39, 11, 0xc8bca4);
  jar(3, 28, 6, 7, 0x8a6a3a); p.rect(12, 24, 6, 4, 0xe8d8a8); p.rect(20, 25, 5, 3, 0xd8c8e0); jar(28, 28, 5, 9, 0x3a6a8a); jar(36, 28, 7, 6, 0x4a7a4a); p.line(41, 0, 43, 8, 0x4a6a3a); p.line(43, 0, 42, 9, 0x5a7a4a);
  return p.outline(null, 0.6).tex(); });
PX.def('bathPegs', () => { const W = 60, H = 44, p = new Pix(W, H);   // a peg rail: a linen shift, a towel, a red robe, a hat
  p.rect(0, 2, W, 3, 0x5a3c24); p.hl(0, W - 1, 2, 0x7a5434); for (const x of [6, 20, 34, 50]) p.rect(x, 4, 2, 3, 0x3a2418);
  const hang = (x0, w, h, c, flare) => { for (let y = 6; y < 6 + h; y++) { const f = Math.round((y - 6) / h * flare); for (let x = x0 - f; x < x0 + w + f; x++) p.set(x, y, C.mul(c, (0.8 + 0.22 * noise1((x - x0) * 0.8, 75 + x0)) * (y < 8 ? 1.15 : 1))); } };
  hang(3, 8, 30, 0xe8dcc4, 3); hang(17, 8, 18, 0xd0c4a8, 0); hang(30, 10, 36, 0xa82a2a, 3); p.ell(51, 9, 5, 2.5, 0x4a3a2a); p.rect(48, 5, 6, 3, 0x4a3a2a);
  return p.outline(null, 0.6).tex(); });
PX.def('herbBunch', () => { const p = new Pix(10, 16); p.vl(5, 0, 3, 0x8a6a3a); for (let y = 3; y < 16; y++) { const hw = Math.min(4, 1 + (y - 3) * 0.4); for (let x = -Math.round(hw); x <= hw; x++) if (hash(x, y, 76) > 0.25) p.set(5 + x, y, C.mul(hash(x, y, 77) > 0.8 ? 0x9a7aa8 : 0x5a7a4a, 0.75 + 0.4 * hash(x, y, 78))); } return p.outline(null, 0.6).tex(); });
PX.def('streetSlit', () => { const W = 40, H = 18, p = new Pix(W, H);   // a barred slit at street level: night, a wet cobble or two, the moon on them
  p.rect(0, 0, W, H, 0x4a4038); for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) p.set(x, y, C.mul(0x2a3a68, 0.7 + 0.5 * (y / H) + 0.25 * hash(Math.floor(x / 5), Math.floor(y / 3), 79)));
  for (const x of [9, 19, 29]) p.vl(x, 2, H - 3, 0x1a1a20); p.hl(1, W - 2, 1, 0x7a6e60); return p.tex(); });
PX.def('duckboard', () => { const p = new Pix(32, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) p.set(x, y, y % 4 === 3 ? 0x1a140e : C.mul(0x8a6844, 0.8 + 0.3 * noise1(x * 0.4 + Math.floor(y / 4) * 9, 80))); return p.tex({ repeat: true }); });
