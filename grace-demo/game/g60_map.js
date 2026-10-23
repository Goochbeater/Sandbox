/* THE MAP — a chart of the Swan Fortress and its valley on old parchment, 480 × 300 px, shown at twice that.
   The country round it is drawn in ink and washes like a surveyor's chart: mountains to the north, the Wood to the
   west, the river and the Lower Town to the south-east, fields to the south, roads, a compass rose and a scale.
   The fortress itself is the real 3D diorama (the title screen's), photographed in daylight from the south-east with
   MAP.snap and inked like a hand-coloured engraving, so the map always shows the castle the player actually walks in.
   Pins: rooms anchor to points in that diorama (projected through the photo's camera); places outside it to the sheet. */
const WORLD = { W: 480, H: 300 };
WORLD.INK = 0x3a2614; WORLD.RED = 0x9a2a1a;
WORLD.VIG = { cx: 232, cy: 150, rx: 152, ry: 104, w: 320, h: 216 };   // the inked photograph's oval on the sheet, and its render size
WORLD.CAM = { x: 9, y: 80, z: 20, lx: 2, ly: 6, lz: -27, fov: 36, expo: 2.1 };
WORLD.paint = function (p) {
  const W = p.w, H = p.h, ink = WORLD.INK;
  const set = (x, y, c) => p.set(Math.round(x), Math.round(y), c), mixAt = (x, y, c, k) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; p.set(x, y, C.mix(p.get(x, y), c, k)); };
  /* ---- parchment: fibre, foxing, folds, a scorched edge */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = noise1(x * 0.02 + noise1(y * 0.015, 801) * 2, 802) * 0.6 + noise1(x * 0.11 + y * 0.09, 803) * 0.25 + noise1(y * 0.3 + x * 0.02, 804) * 0.15;
    let c = C.mix(0xf0e2bc, 0xd6bc88, clamp(n * 0.9 + (hash(x, y, 805) - 0.5) * 0.08, 0, 1));
    const e = Math.min(x, y, W - 1 - x, H - 1 - y) + (noise1(x * 0.07 + y * 0.05, 806) - 0.5) * 9;
    if (e < 16) c = C.mix(c, 0x8a5a26, smooth(16, 2, e) * 0.75); if (e < 3) c = C.mix(c, 0x3a1e0a, smooth(3, 0, e));
    for (const [fx, fy] of [[W / 2, -1], [-1, H / 2]]) { const d = fx > 0 ? x - fx : y - fy; if (Math.abs(d) < 1.5) c = C.mul(c, d < 0 ? 1.06 : 0.86); }   // fold creases
    p.set(x, y, c); }
  for (let i = 0; i < 26; i++) { const x = hash(i, 1, 807) * W, y = hash(i, 2, 807) * H, r = 2 + hash(i, 3, 807) * 7;   // foxing
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const d = Math.hypot(xx, yy) / r; if (d < 1 && PX.dith(Math.round(x + xx), Math.round(y + yy)) < (1 - d) * 0.5) mixAt(x + xx, y + yy, 0xa87840, 0.35); } }
  const inVig = (x, y, m) => { const V = WORLD.VIG; return ((x - V.cx) / (V.rx + (m || 0))) ** 2 + ((y - V.cy) / (V.ry + (m || 0))) ** 2 < 1; };
  /* ---- the river, from the mountains in the north-east, past the town, out to the south */
  const river = []; for (let t = 0; t <= 1; t += 0.004) river.push([W - 70 + Math.sin(t * 5.5) * 26 - t * 40, 26 + t * (H - 40) + Math.sin(t * 9) * 6]);
  for (const [x, y] of river) { const w = 3 + (y / H) * 3; for (let k = -w; k <= w; k++) { const yy = y, xx = x + k; if (inVig(xx, yy, 6)) continue; set(xx, yy, Math.abs(k) > w - 1 ? ink : C.mix(0x7a9ab0, 0xa8c0cc, (k + w) / (2 * w))); } }
  for (let i = 0; i < river.length; i += 9) { const [x, y] = river[i]; if (!inVig(x, y, 6)) { set(x - 1, y, 0xd8e4ea); set(x + 1, y - 1, 0xd8e4ea); } }
  /* ---- mountains along the north: an irregular range, back to front; hatched shadow sides, ragged snow, a ridge line, foothills */
  // (a peak is never taller than its base is low, so none pokes through the frame)
  const peak = (cx, by, s, seed) => { const h = Math.min(s * (0.7 + hash(seed, 1, 815) * 0.35), by - 14), lean = (hash(seed, 2, 815) - 0.5) * s * 0.25, ax = cx + lean;
    for (let y = 0; y <= h; y++) { const t = y / h, l = cx - s * 0.5 * t + (noise1(y * 0.4 + seed, 816) - 0.5) * 1.5 + (ax - cx) * (1 - t), r = cx + s * 0.5 * t + (noise1(y * 0.4 + seed + 9, 816) - 0.5) * 1.5 + (ax - cx) * (1 - t), py = by - h + y;
      for (let x = Math.ceil(l); x <= r; x++) { if (inVig(x, py, 8)) continue; const ridge = ax + (x - ax) * 0, shade = x > ax + (t * 1.5); let c = 0xeedcb4;
        if (shade && ((x - py) % 3 === 0)) c = C.mix(c, ink, 0.6); else if (shade) c = 0xe2cea2; if (t < 0.3 + noise1(x * 0.5 + seed, 817) * 0.15 && !shade) c = 0xfbf4e4; set(x, py, c); }
      if (!inVig(l, py, 8)) set(l, py, ink); if (!inVig(r, py, 8)) set(r, py, ink); if (t > 0.08 && !inVig(ax, py, 8) && y % 2 === 0) set(ax + (t * 1.5), py, C.mix(0xe2cea2, ink, 0.7)); } };
  const range = []; for (let i = 0; i < 30; i++) range.push([14 + hash(i, 1, 818) * (W - 28), 34 + hash(i, 2, 818) * 26, 14 + hash(i, 3, 818) * 24 * (hash(i, 4, 818) < 0.25 ? 1.5 : 1), i]);
  range.sort((a, b) => a[1] - b[1]); for (const [x, y, sz, i] of range) peak(x, y, sz, i);
  for (let i = 0; i < 40; i++) { const x = 10 + i * 12 + hash(i, 5, 818) * 8, y = 64 + hash(i, 6, 818) * 8; if (inVig(x, y, 8)) continue; for (let k = -5; k <= 5; k++) { const yy = y - Math.sqrt(Math.max(0, 25 - k * k)) * 0.5; set(x + k, yy, ink); if (k > 1 && k % 2) set(x + k, yy + 2, C.mix(0xd6bc88, ink, 0.4)); } }
  /* ---- hills, the Wood (west), copses */
  const tree = (x, y, r, c) => { if (inVig(x, y, 4)) return; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const d = Math.hypot(xx, yy); if (d > r) continue; set(x + xx, y + yy, d > r - 1 && (xx > 0 || yy > 0) ? ink : xx + yy < -r * 0.6 ? C.mul(c, 1.2) : c); } set(x, y + r + 1, ink); };
  for (let i = 0; i < 420; i++) { const x = 16 + hash(i, 1, 810) * 150, y = 72 + hash(i, 2, 810) * 190, d = Math.hypot((x - 64) / 1.1, y - 168); if (d > 76 + noise1(i * 0.3, 811) * 18) continue; tree(x, y, 2 + Math.floor(hash(i, 3, 810) * 2), [0x6a8a4a, 0x5a7a40, 0x7a9a54][i % 3]); }
  for (let i = 0; i < 70; i++) { const x = 300 + hash(i, 4, 810) * 120, y = 60 + hash(i, 5, 810) * 40; tree(x, y, 2, 0x6a8a4a); }
  for (let i = 0; i < 40; i++) { const x = 150 + hash(i, 6, 810) * 60, y = 240 + hash(i, 7, 810) * 40; tree(x, y, 2, 0x7a9a54); }
  for (let i = 0; i < 14; i++) { const x = 180 + i * 18 + hash(i, 8, 810) * 8, y = 62 + hash(i, 9, 810) * 10; if (inVig(x, y, 6)) continue; for (let k = -6; k <= 6; k++) { const yy = y - Math.sqrt(Math.max(0, 36 - k * k)) * 0.6; set(x + k, yy, ink); if (k > 0 && k % 2 === 0) set(x + k, yy + 2, C.mix(0xd6bc88, ink, 0.4)); } }
  set(64, 168, WORLD.RED); set(65, 168, 0xd86a2a); set(64, 167, 0xf0a040);   // the clearing's fire
  /* ---- fields to the south: a patchwork of washes and furrows, hedges dotted round them */
  for (let i = 0; i < 16; i++) { const x0 = 120 + (i % 8) * 34 + hash(i, 1, 812) * 8, y0 = 238 + Math.floor(i / 8) * 26 + hash(i, 2, 812) * 6, w = 28 + hash(i, 3, 812) * 10, h = 20 + hash(i, 4, 812) * 6, c = [0xd8c070, 0xb8c070, 0xc8a860, 0xa8b878][i % 4], dir = i % 2;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (inVig(x, y, 6) || y > H - 14) continue; let cc = C.mix(p.get(x, y), c, 0.55); if ((dir ? x : y) % 3 === 0) cc = C.mix(cc, ink, 0.25); p.set(x, y, cc); if ((x === x0 || y === y0) && (x + y) % 2 === 0) p.set(x, y, ink); } }
  /* ---- the Lower Town by the river, a bridge, a church */
  const TX = 378, TY = 232;
  for (let i = 0; i < 28; i++) { const x = TX - 34 + hash(i, 1, 813) * 70, y = TY - 18 + hash(i, 2, 813) * 34; if (inVig(x, y, 6)) continue; const roof = [0xa8402a, 0x8a3420, 0xb85a3a][i % 3];
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 5; xx++) set(x + xx, y + yy, yy < 2 ? roof : 0xe8d8b8); for (let xx = -1; xx < 6; xx++) set(x + xx, y + 4, ink); set(x - 1, y + 2, ink); set(x + 5, y + 2, ink); set(x + 2, y - 1, ink); }
  for (let y = TY - 26; y < TY - 10; y++) set(TX - 6, y, ink); set(TX - 7, TY - 22, ink); set(TX - 5, TY - 22, ink); for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 5; xx++) set(TX - 8 + xx, TY - 10 + yy, yy < 2 ? 0x6a6a7a : 0xe8d8b8);
  { const b = river.find(([x, y]) => y > TY - 4); if (b) for (let k = -10; k <= 10; k++) { set(b[0] + k, b[1] - 2, ink); set(b[0] + k, b[1] + 2, ink); if (k % 5 === 0) for (let j = -1; j <= 1; j++) set(b[0] + k, b[1] + j, 0xc8b898); } }
  /* ---- roads: from the castle gate south to the bridge, west into the Wood, north to the pass */
  const road = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], n = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t < n; t++) { if (t % 4 > 1) continue; const x = lerp(a[0], b[0], t / n), y = lerp(a[1], b[1], t / n); if (!inVig(x, y, 3)) set(x, y, ink); } } };
  road([[262, 246], [300, 262], [350, 250], [TX - 30, TY + 4]]); road([[100, 150], [60, 160], [30, 175]]); road([[212, 54], [206, 40], [220, 18]]);
  /* ---- the compass rose and a scale */
  { const cx = W - 44, cy = H - 52;
    const pt = (a, len, wid, dark) => { for (let t = 0; t <= len; t++) { const w = wid * (1 - t / len); for (let k = -w; k <= w; k++) { const x = cx + Math.cos(a) * t - Math.sin(a) * k, y = cy + Math.sin(a) * t + Math.cos(a) * k; set(x, y, (k > 0) === dark ? ink : 0xf4ead0); } } };
    for (let i = 0; i < 8; i++) pt(i * Math.PI / 4 + Math.PI / 8, 10, 2.5, i % 2);
    for (let i = 0; i < 4; i++) pt(i * Math.PI / 2 - Math.PI / 2, 20, 4, true);
    for (let a = 0; a < 6.283; a += 0.02) { set(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13, ink); set(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, ink); }
    for (const [dx, dy] of [[0, -24], [-1, -25], [1, -25], [0, -26], [-2, -26], [2, -26]]) set(cx + dx, cy + dy, WORLD.RED); set(cx, cy, WORLD.RED); }
  { const x0 = 22, y0 = H - 20; for (let i = 0; i < 5; i++) for (let y = 0; y < 3; y++) for (let x = 0; x < 10; x++) set(x0 + i * 10 + x, y0 + y, (i % 2) ? 0xf4ead0 : ink); for (let x = 0; x <= 50; x++) { set(x0 + x, y0 - 1, ink); set(x0 + x, y0 + 3, ink); } for (let i = 0; i <= 5; i++) set(x0 + i * 10, y0 - 2, ink); }
  /* ---- the fortress: photographed, then inked into the oval */
  WORLD.vignette(p);
  /* ---- the frame */
  for (const [m, c] of [[6, ink], [9, ink]]) { for (let x = m; x < W - m; x++) { set(x, m, c); set(x, H - 1 - m, c); } for (let y = m; y < H - m; y++) { set(m, y, c); set(W - 1 - m, y, c); } }
  for (const [x, y] of [[6, 6], [W - 10, 6], [6, H - 10], [W - 10, H - 10]]) for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) set(x + xx, y + yy, (xx + yy) % 2 ? WORLD.RED : ink);
};
/* the 3D fortress, photographed and inked: posterised colour on the paper, ink on every edge, hatching in the shadows */
WORLD.vignette = function (p) {
  const V = WORLD.VIG, Wv = V.w, Hv = V.h, img = MAP.snap('exterior', WORLD.CAM, Wv, Hv, (room, on) => EXTERIOR.mapLight(room, on)), d = img.data, ink = WORLD.INK;
  const lum = new Float32Array(Wv * Hv); for (let i = 0; i < Wv * Hv; i++) lum[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const L = (x, y) => lum[clamp(y, 0, Hv - 1) * Wv + clamp(x, 0, Wv - 1)], ox = Math.round(V.cx - Wv / 2), oy = Math.round(V.cy - Hv / 2), ink3 = C.rgb(ink);
  for (let y = 0; y < Hv; y++) for (let x = 0; x < Wv; x++) {
    const sx = ox + x, sy = oy + y, u = (sx - V.cx) / V.rx, v = (sy - V.cy) / V.ry, rr = Math.hypot(u, v) + (noise1(Math.atan2(v, u) * 3 + 5, 814) - 0.5) * 0.08;
    if (rr > 1 || (rr > 0.9 && PX.dith(sx, sy) < (rr - 0.9) / 0.1)) continue;
    const i = (y * Wv + x) * 4, gx = L(x + 1, y) - L(x - 1, y), gy = L(x, y + 1) - L(x, y - 1), e = Math.hypot(gx, gy), l = lum[y * Wv + x];
    const paper = C.rgb(p.get(sx, sy)); let c = [0, 1, 2].map((k) => { const v0 = d[i + k] / 255, sep = l * [1.05, 0.92, 0.72][k], q = Math.round(lerp(v0, sep, 0.25) * 7) / 7; return clamp(q * lerp(1, paper[k] / 255, 0.35) * 1.08, 0, 1) * 255; });   // hand-coloured: the colour stays, the paper shows through
    if (e > 0.16) c = c.map((v0, k) => lerp(v0, ink3[k], clamp((e - 0.16) * 4, 0, 0.85)));
    else if (l < 0.3 && (sx + sy) % 3 === 0) c = c.map((v0, k) => lerp(v0, ink3[k], 0.45));
    p.set(sx, sy, C.hex(c[0], c[1], c[2]));
  }
  for (let a = 0; a < 6.283; a += 0.004) { const x = V.cx + Math.cos(a) * (V.rx + 2), y = V.cy + Math.sin(a) * (V.ry + 2); if (PX.dith(Math.round(x), Math.round(y)) < 0.7) p.set(Math.round(x), Math.round(y), ink); }
  /* where the rooms are, as seen through the photograph's camera */
  const cam = new THREE.PerspectiveCamera(WORLD.CAM.fov, Wv / Hv, 2, 900); cam.position.set(WORLD.CAM.x, WORLD.CAM.y, WORLD.CAM.z); cam.lookAt(WORLD.CAM.lx, WORLD.CAM.ly, WORLD.CAM.lz); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  for (const pl of WORLD.places) if (pl.at3) { const v = new THREE.Vector3(...pl.at3).project(cam); pl.x = ox + (v.x + 1) / 2 * Wv; pl.y = oy + (1 - v.y) / 2 * Hv; }
};
WORLD.places = [   // at3: a point in the fortress diorama (exterior room coordinates); x, y: on the sheet for places outside it
  { id: 'bedroom', name: 'Bedchamber', sub: 'the keep, above', at3: [16.5, 26, -29.5], side: 'r', room: 'bedroom', at: { x: 9.7, face: -1 } },
  { id: 'study', name: 'Study', sub: 'the keep', at3: [14, 12, -29.5], side: 'l', room: 'study', at: { x: -8.6, face: 1 } },
  { id: 'throne', name: 'Throne Room', sub: 'the great hall', at3: [-5.5, 17, -31], room: 'throne', at: { x: -12.2, face: 1 } },
  { id: 'garden', name: 'Gardens', sub: 'Halina and the children', at3: [-6.3, 8, -21.4], side: 'l', room: 'garden', at: { x: -11.4, face: 1 } },
  { id: 'yard', name: 'Training Yard', sub: 'Ser Bogdan', at3: [25, 8, -38], side: 'r', room: 'yard', at: { x: -10.2, face: 1 } },
  { id: 'chapel', name: 'Chapel', sub: 'the lower bailey', at3: [-21.2, 22, -33.3], side: 'l', room: 'chapel', at: { x: -9.6, face: 1 } },
  { id: 'town', name: 'Lower Town', sub: 'not yet', x: 378, y: 222, locked: true },
  { id: 'wood', name: 'The Wood', sub: 'the clearing', x: 64, y: 164, room: 'wood', at: { x: -9.8, face: 1 } },
];
WORLD.init = function () {
  for (const pl of WORLD.places) if (pl.room && !SCENE.rooms[pl.room]) { pl.locked = true; pl.sub = 'being built'; }   // rooms not in this build yet
  for (const pl of WORLD.places) if (pl.x === undefined) { pl.x = WORLD.W / 2; pl.y = WORLD.H / 2; }
  MAP.setup(WORLD.paint, WORLD.W, WORLD.H, WORLD.places); MAP.music = 'map';
  MAP.onPick = (pl) => {
    const K = SCENE.player;
    if (pl.room === 'throne' && !K.crownMesh.visible) { if (MAP.prev) AUDIO.playMusic(MAP.prev, 1.2); SCENE.say(K, 'I can’t hold court bare-headed. The crown first.'); return; }
    GAME.save(); SCENE.go(pl.room, pl.at).then(() => GAME.save());
  };
};
