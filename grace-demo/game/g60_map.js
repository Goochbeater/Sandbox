/* THE MAP — the Swan Fortress and its valley on a sheet of parchment, painted at 192 × 120 like every other texture.
   North is up: mountains and the north road, the Wood to the west, the river and the lower town to the south-east.
   Pins for the five places open so far; the chapel, the lower town and the Wood are drawn but locked. */
const WORLD = {};
WORLD.paint = function (p) {
  const W = p.w, H = p.h;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {   // parchment, darker and foxed toward the edges
    const e = Math.min(x, y, W - 1 - x, H - 1 - y), n = noise1(x * 0.11 + noise1(y * 0.07, 601) * 3, 602);
    let c = C.mix(0xe8d8b0, 0xd0b888, n * 0.6); c = C.mix(c, 0x9a7a4a, smooth(10, 0, e) * 0.7); if (hash(x, y, 603) < 0.012) c = C.mul(c, 0.86); p.set(x, y, c); }
  const ink = 0x4a3420, faint = 0x8a6a40;
  // mountains along the top
  for (let i = 0; i < 14; i++) { const cx = 8 + i * 13 + (hash(i, 1, 604) - 0.5) * 6, h = 8 + hash(i, 2, 604) * 7;
    for (let k = 0; k <= h; k++) { p.set(cx - k * 0.8, 6 + h - k, ink); p.set(cx + k * 0.8, 6 + h - k, ink); if (k < h * 0.5) for (let j = 1; j < k * 0.8; j += 2) p.set(cx + j, 6 + h - k + 1, faint); } }
  // the Wood to the west: clumps of little trees
  for (let i = 0; i < 70; i++) { const x = 6 + hash(i, 3, 605) * 44, y = 34 + hash(i, 4, 605) * 58; if (Math.hypot(x - 26, y - 62) > 26) continue;
    p.disc(x, y, 2, 0x5a6a3a); p.set(x, y - 2, 0x7a8a4a); p.set(x, y + 2, ink); p.set(x - 1, y + 1, 0x3a4a2a); }
  p.disc(26, 62, 3, 0xc8a870); p.set(26, 62, 0xc85030);   // the clearing, and its fire
  // the river, from the north-west to the south-east
  for (let t = 0; t <= 1; t += 0.002) { const x = lerp(-4, W + 4, t), y = 26 + t * 86 + Math.sin(t * 9) * 8; for (let k = -2; k <= 2; k++) p.set(x, y + k, Math.abs(k) === 2 ? 0x4a6a7a : 0x7a9aa8); }
  // the north road and the road down to the town
  for (let y = 4; y < 30; y += 2) p.set(100 + Math.sin(y * 0.2) * 2, y, ink);
  for (let t = 0; t < 1; t += 0.03) p.set(lerp(104, 166, t), lerp(96, 104, t) + Math.sin(t * 6) * 2, ink);
  // the lower town: red roofs by the river
  for (let i = 0; i < 26; i++) { const x = 150 + hash(i, 5, 606) * 30, y = 96 + hash(i, 6, 606) * 16; if (y > H - 6) continue; p.rect(x, y, 3, 2, 0xa8402a); p.hl(x, x + 2, y + 2, ink); }
  // the rock and the curtain wall
  const wall = [[62, 30], [146, 26], [154, 56], [140, 94], [70, 96], [56, 66]];
  for (let y = 22; y < 100; y++) for (let x = 50; x < 160; x++) if (inPoly(x, y, wall)) p.set(x, y, C.mix(p.get(x, y), 0xb8a888, 0.55));
  for (let i = 0; i < wall.length; i++) { const [x0, y0] = wall[i], [x1, y1] = wall[(i + 1) % wall.length]; p.line(x0, y0, x1, y1, ink); p.line(x0 + 1, y0 + 1, x1 + 1, y1 + 1, faint); }
  for (const [x, y] of wall) { p.disc(x, y, 3.5, 0x8a7a6a); p.disc(x, y, 2, 0xa8402a); }   // towers with red caps
  p.rect(96, 92, 10, 7, 0x8a7a6a); p.rect(99, 95, 4, 4, ink);   // the gatehouse
  // the keep (NE), the great hall, the chapel
  p.rect(118, 30, 22, 26, 0x7a6a5a); p.rect(119, 31, 20, 24, 0x9a8a78); for (let x = 118; x < 140; x += 3) p.set(x, 30, ink); p.disc(129, 43, 3, 0xa8402a);
  p.rect(80, 40, 30, 14, 0x8a7a6a); p.rect(81, 41, 28, 12, 0xa89880); p.rect(92, 44, 6, 6, 0x7a2a24);
  p.rect(82, 28, 10, 8, 0x8a7a6a); p.vl(87, 24, 28, ink); p.hl(85, 89, 25, ink);
  // the gardens (west of the hall): lawn, hedges, a fountain
  p.rect(62, 56, 26, 22, 0x6a8a4a); for (let y = 58; y < 76; y += 6) p.hl(64, 86, y, 0x3a5a2a); p.disc(75, 67, 3, 0x7a9aa8); p.disc(75, 67, 1, 0xe8e8f0);
  for (let i = 0; i < 18; i++) p.set(63 + hash(i, 7, 607) * 24, 57 + hash(i, 8, 607) * 20, hash(i, 9, 607) < 0.5 ? 0xc84a5a : 0xe8d070);
  // the training yard (south-east bailey): beaten sand, a ring, the butts
  p.rect(112, 66, 30, 22, 0xd8c08a); p.ell(124, 77, 8, 6, 0xc8a870); p.ell(124, 77, 6, 4, 0xd8c08a); for (const x of [136, 139]) { p.disc(x, 70, 1.5, 0xa8302a); p.set(x, 70, 0xe8dcc0); }
  // compass rose
  const cx = 176, cy = 22; p.line(cx, cy - 9, cx, cy + 9, ink); p.line(cx - 7, cy, cx + 7, cy, ink); for (let k = 1; k < 4; k++) { p.hl(cx - k, cx + k, cy - 9 + k * 2, 0xa8302a); } p.disc(cx, cy, 1.5, ink);
  for (let x = 0; x < W; x++) { p.set(x, 0, 0x6a4a24); p.set(x, H - 1, 0x6a4a24); } for (let y = 0; y < H; y++) { p.set(0, y, 0x6a4a24); p.set(W - 1, y, 0x6a4a24); }
};
const inPoly = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
WORLD.places = [
  { id: 'bedroom', name: 'Bedchamber', sub: 'the keep', x: 140, y: 33, room: 'bedroom', at: { x: 9.7, face: -1 } },
  { id: 'study', name: 'Study', sub: 'the keep', x: 124, y: 56, room: 'study', at: { x: -8.6, face: 1 } },
  { id: 'throne', name: 'Throne Room', sub: 'the great hall', x: 95, y: 50, room: 'throne', at: { x: -12.2, face: 1 } },
  { id: 'garden', name: 'Gardens', sub: 'Halina and the children', x: 72, y: 62, room: 'garden', at: { x: -11.4, face: 1 } },
  { id: 'yard', name: 'Training Yard', sub: 'Ser Bogdan', x: 126, y: 80, room: 'yard', at: { x: -10.2, face: 1 } },
  { id: 'chapel', name: 'Chapel', sub: 'not yet', x: 70, y: 30, locked: true },
  { id: 'town', name: 'Lower Town', sub: 'not yet', x: 164, y: 100, locked: true },
  { id: 'wood', name: 'The Wood', sub: 'not yet', x: 26, y: 58, locked: true },
];
WORLD.init = function () {
  for (const pl of WORLD.places) if (pl.room && !SCENE.rooms[pl.room]) { pl.locked = true; pl.sub = 'being built'; }   // rooms not in this build yet
  MAP.setup(WORLD.paint, 192, 120, WORLD.places); MAP.music = 'map';
  MAP.onPick = (pl) => {
    const K = SCENE.player;
    if (pl.room === 'throne' && !K.crownMesh.visible) { if (MAP.prev) AUDIO.playMusic(MAP.prev, 1.2); SCENE.say(K, 'I can’t hold court bare-headed. The crown first.'); return; }
    GAME.save(); SCENE.go(pl.room, pl.at).then(() => GAME.save());
  };
};
