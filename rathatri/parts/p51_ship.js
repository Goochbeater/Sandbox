/* SHIP — hull models for space flight and the ground ship-call (DARK LEGACY: RATHATRI).
   MODEL  SHIP.build(kind) → THREE.Group in FLY pose: nose +Z, canopy +Y, origin at the hull centre, 1 unit = 1 m.
          Superellipse lofts (SHIP.loft, Catmull-Rom between sections) plus rounded-box greebles, merged per material:
          hull (canvas-painted skin) · dark · trim · glass · emit · plume = 6 draw calls at most. Geometry is baked once
          per kind and shared; each instance owns only its emit and plume materials (thrust flicker).
   CALL   SHIP.call() — action 'ship' (touch SHIP button). The player's hull (SAVE.d.ship) comes in low along the facing,
          walks a twin-cannon bolt line up the street, drops a seismic charge, then the ring. 40 s cooldown (TOUCH.cd.ship).
          Re-themed from bobafet's SLAVE I strafing run (p20d_slave1). Only levels with def.ship = true allow it.
   SPACE  The space core reads SHIP.KINDS and SHIP.HULLS (gameplay numbers) and calls SHIP.build for models. */
const SHIP = {
  on: !MG.test && !MG.flags.noship, cd: 0, CD: 40, run: null, fx: [], grp: null, R0: 150, A1: 130,
  mats: {}, texs: {}, geos: {}, models: {}, DEF: {}, PAINT: {}, marks: {}, _mz: [],
  n: { calls: 0, bolts: 0, hits: 0, booms: 0, strafes: 0 },
  KINDS: ['harbinger', 'interceptor', 'shroud', 'trandoFreighter', 'trandoStalker', 'militiaFighter', 'jediStarfighter', 'hunterDropship', 'picket', 'capital', 'courier'],
  /* ai: 'player' | 'fighter' | 'freighter' | 'dropship' | 'static' | 'capital' (space AI class). len/wing/rad in m (wing = half-span).
     bolts/shot/boomR/delay drive the ground ship-call only; dmg is per space hit for guns and per ground bolt for the player. */
  HULLS: {
    harbinger:       { ai: 'player', name: 'THE HARBINGER', len: 40, wing: 6.5, rad: 21, hp: 900, speed: 55, turn: 0.9, guns: 6, dmg: 26, bolts: 6, shot: 0.16, boomR: 5, delay: 3.2, stealth: false, paint: 'junk' },
    interceptor:     { ai: 'player', name: 'NIGHTBRINGER', len: 11.4, wing: 6.2, rad: 7, hp: 380, speed: 95, turn: 2.1, guns: 2, dmg: 34, bolts: 8, shot: 0.11, boomR: 7, delay: 1.6, stealth: false, paint: 'sith' },
    shroud:          { ai: 'player', name: 'THE SHROUD', len: 13, wing: 8.8, rad: 9.5, hp: 300, speed: 80, turn: 1.7, guns: 4, dmg: 40, bolts: 10, shot: 0.13, boomR: 9, delay: 1.1, stealth: true, paint: 'shroud' },
    trandoFreighter: { ai: 'freighter', name: 'SKULLRENDER', len: 24, wing: 6.5, rad: 13, hp: 900, speed: 26, turn: 0.5, guns: 4, dmg: 14, bolts: 0, shot: 0, boomR: 4, delay: 0, stealth: false, paint: 'trando' },
    trandoStalker:   { ai: 'fighter', name: "STALKER'S SHADOW", len: 30, wing: 7.4, rad: 15, hp: 420, speed: 48, turn: 1.2, guns: 2, dmg: 12, bolts: 0, shot: 0, boomR: 4, delay: 0, stealth: true, paint: 'trando' },
    militiaFighter:  { ai: 'fighter', name: 'FRONTIER FIGHTER', len: 9.5, wing: 4.4, rad: 5, hp: 120, speed: 62, turn: 1.5, guns: 2, dmg: 9, bolts: 0, shot: 0, boomR: 3, delay: 0, stealth: false, paint: 'militia' },
    jediStarfighter: { ai: 'fighter', name: 'JEDI STARFIGHTER', len: 10.8, wing: 4.6, rad: 5.5, hp: 170, speed: 78, turn: 2.2, guns: 2, dmg: 12, bolts: 0, shot: 0, boomR: 3, delay: 0, stealth: false, paint: 'jedi' },
    hunterDropship:  { ai: 'dropship', name: 'HUNTER DROPSHIP', len: 15, wing: 3.4, rad: 8, hp: 300, speed: 34, turn: 0.6, guns: 2, dmg: 8, bolts: 0, shot: 0, boomR: 4, delay: 0, stealth: false, paint: 'hunter' },
    picket:          { ai: 'static', name: 'REPUBLIC PICKET', len: 30, wing: 3.8, rad: 16, hp: 1400, speed: 0, turn: 0, guns: 4, dmg: 18, bolts: 0, shot: 0, boomR: 6, delay: 0, stealth: false, paint: 'picket' },
    capital:         { ai: 'capital', name: 'REPUBLIC CRUISER', len: 59, wing: 6.0, rad: 32, hp: 6000, speed: 12, turn: 0.08, guns: 8, dmg: 30, bolts: 0, shot: 0, boomR: 8, delay: 0, stealth: false, paint: 'picket' },
    courier:         { ai: 'fighter', name: "ASSASSIN'S BLADE", len: 14, wing: 4.2, rad: 7, hp: 220, speed: 72, turn: 1.9, guns: 2, dmg: 10, bolts: 0, shot: 0, boomR: 3, delay: 0, stealth: true, paint: 'stealth' },
  },
};

/* ---------------------------------------------------------------- paint (canvas, 1024², mulberry-seeded per paint) */
SHIP.PAINT = {
  junk:    { base: '#5f625c', tints: ['#4c5452', '#6e5d49', '#55504a', '#3f4a53', '#76735f'], patch: 70, scorch: 14, scar: 10, rust: 90, fleck: 260, accent: '#8a4a22' },
  sith:    { base: '#1b191e', tints: ['#131216', '#25222b', '#2b1c20'], patch: 30, scorch: 26, scar: 40, rust: 30, fleck: 180, accent: '#8a1016', mark: 'sith' },
  shroud:  { base: '#0d0d10', tints: ['#111115', '#1a1a1f'], patch: 10, scorch: 4, scar: 2, rust: 4, fleck: 40, accent: '#7a0f10', mark: 'shroud' },
  trando:  { base: '#4b5541', tints: ['#3c4535', '#5b5a48', '#4a4a3d'], patch: 45, scorch: 16, scar: 14, rust: 110, fleck: 160, accent: '#7a4a2a' },
  militia: { base: '#5c6049', tints: ['#4d5141', '#6b6b58', '#545b4d'], patch: 30, scorch: 8, scar: 6, rust: 40, fleck: 120, accent: '#6b2d22', mark: 'roundel' },
  jedi:    { base: '#b9a987', tints: ['#c9bd9c', '#a59675', '#d6cdb6'], patch: 12, scorch: 3, scar: 2, rust: 10, fleck: 90, accent: '#7a1f1f', mark: 'jedi' },
  hunter:  { base: '#6b5941', tints: ['#5b4b37', '#7e6a4f', '#50443a'], patch: 40, scorch: 14, scar: 10, rust: 100, fleck: 140, accent: '#b0601f', mark: 'hunter' },
  picket:  { base: '#8d9297', tints: ['#7e8388', '#9da2a7', '#70767c'], patch: 20, scorch: 6, scar: 4, rust: 30, fleck: 90, accent: '#3a3f44', mark: 'picket' },
  stealth: { base: '#1e2228', tints: ['#171a1f', '#262b33'], patch: 8, scorch: 2, scar: 1, rust: 3, fleck: 20, accent: '#2b3440' },
};
SHIP.marks.sith = (g, b, R_, N, P) => { // crimson sigil bands with chevrons, Jedi-trophy etchings
  for (const u of [0.16, 0.64]) { const x = u * N; g.fillStyle = P.accent; g.fillRect(x - N * 0.012, 0, N * 0.024, N); b.fillStyle = '#6a6a6a'; b.fillRect(x - N * 0.012, 0, N * 0.024, N);
    g.strokeStyle = P.accent; g.lineWidth = 6; for (let y = 0; y < N; y += 64) { g.beginPath(); g.moveTo(x - 26, y + 40); g.lineTo(x, y); g.lineTo(x + 26, y + 40); g.stroke(); } }
  g.strokeStyle = 'rgba(170,160,140,.45)'; g.lineWidth = 1.5; for (let i = 0; i < 24; i++) { const x = R_() * N, y = R_() * N; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + R_() * 30, y + (R_() - 0.5) * 16); g.stroke(); } };
SHIP.marks.shroud = (g, b, R_, N, P) => { // sensor-dampener hex grid and red pinstripes
  const s = 24; g.strokeStyle = 'rgba(44,44,54,.85)'; g.lineWidth = 2; b.strokeStyle = '#303036'; b.lineWidth = 1.5;
  for (let row = 0, y = 0; y < N + s; y += s * 1.5, row++) for (let x = (row & 1) ? s * 0.87 : 0; x < N + s; x += s * 1.73) for (const ctx of [g, b]) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; const px = x + Math.cos(a) * s * 0.85, py = y + Math.sin(a) * s * 0.85; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); }
  g.fillStyle = P.accent; for (const v of [0.14, 0.16, 0.18, 0.8, 0.82]) g.fillRect(0, v * N, N, 3); };
SHIP.marks.roundel = (g, b, R_, N, P) => { // faded frontier roundel on both flanks
  for (const u of [0.25, 0.75]) { const x = u * N, y = 0.5 * N, r = N * 0.11; g.fillStyle = '#c9c6b8'; g.beginPath(); g.arc(x, y, r * 1.05, 0, TAU); g.fill(); g.fillStyle = P.accent; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = '#9a9c94'; g.beginPath(); g.arc(x, y, r * 0.55, 0, TAU); g.fill(); g.fillStyle = '#c9c6b8'; g.fillRect(x - r, y - r * 0.12, r * 2, r * 0.24);
    b.fillStyle = '#505050'; b.beginPath(); b.arc(x, y, r, 0, TAU); b.fill(); } };
SHIP.marks.jedi = (g, b, R_, N, P) => { // white panels and a single red stripe
  for (let i = 0; i < 9; i++) { g.globalAlpha = 0.8; g.fillStyle = '#e8e3d6'; g.fillRect(R_() * N, R_() * N, 80 + R_() * 140, 30 + R_() * 60); g.globalAlpha = 1; }
  g.fillStyle = '#7d2121'; g.fillRect(0, N * 0.56, N, N * 0.02); };
SHIP.marks.hunter = (g, b, R_, N, P) => { // orange bands and pauldron patches
  for (let i = 0; i < 6; i++) { g.fillStyle = P.accent; g.fillRect(R_() * N, N * 0.4 + R_() * N * 0.1, 120 + R_() * 160, 26); } };
SHIP.marks.picket = (g, b, R_, N, P) => { // stencil marks and a painted waterline band
  g.fillStyle = '#2b3136'; for (let i = 0; i < 40; i++) g.fillRect(R_() * N, R_() * N, 8 + R_() * 18, 4 + R_() * 6);
  g.fillStyle = P.accent; g.fillRect(0, N * 0.7, N, 6); };

SHIP.tex = function (name) { // colour + bump pair, cached per paint
  if (SHIP.texs[name]) return SHIP.texs[name];
  const P = SHIP.PAINT[name], N = 1024, R_ = MG.rs('ship:' + name);
  const cv = document.createElement('canvas'), bv = document.createElement('canvas'); cv.width = bv.width = N; cv.height = bv.height = N;
  const g = cv.getContext('2d'), b = bv.getContext('2d');
  const blob = (ctx, x, y, r, c0, c1) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { const cx = x + dx, cy = y + dy; if (cx + r < 0 || cx - r > N || cy + r < 0 || cy - r > N) continue; const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); ctx.fillStyle = gr; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r); } };
  g.fillStyle = P.base; g.fillRect(0, 0, N, N); b.fillStyle = '#7c7c7c'; b.fillRect(0, 0, N, N);
  for (let i = 0; i < P.patch; i++) { const x = R_() * N, y = R_() * N, w = 60 + R_() * 240, h = 40 + R_() * 200; g.globalAlpha = 0.35 + R_() * 0.4; g.fillStyle = P.tints[(R_() * P.tints.length) | 0]; g.fillRect(x, y, w, h); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(12,12,10,.55)'; g.lineWidth = 3; g.strokeRect(x, y, w, h); b.strokeStyle = '#2a2a2a'; b.lineWidth = 4; b.strokeRect(x, y, w, h); }
  // panel seams and rivets: columns round the hull, rows along it
  const cols = 8, rows = 6; g.lineWidth = 3; g.strokeStyle = 'rgba(12,12,10,.6)'; b.lineWidth = 4; b.strokeStyle = '#2c2c2c';
  for (let i = 0; i < cols; i++) { const x = (i + 0.5 + (R_() - 0.5) * 0.3) / cols * N; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, N); g.stroke(); b.beginPath(); b.moveTo(x, 0); b.lineTo(x, N); b.stroke(); }
  for (let j = 0; j < rows; j++) { const y = (j + 0.5) / rows * N; g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); b.beginPath(); b.moveTo(0, y); b.lineTo(N, y); b.stroke();
    for (let x = 6; x < N; x += 28) { g.fillStyle = 'rgba(176,170,150,.5)'; g.beginPath(); g.arc(x, y - 7, 1.9, 0, TAU); g.fill(); b.fillStyle = '#d2d2d2'; b.beginPath(); b.arc(x, y - 7, 2.4, 0, TAU); b.fill(); } }
  // scoring, scorch and battle scars (bump gets the gouges)
  for (let i = 0; i < P.scorch; i++) blob(g, R_() * N, R_() * N, 30 + R_() * 110, 'rgba(8,7,6,.6)', 'rgba(8,7,6,0)');
  for (let i = 0; i < P.scar; i++) { let x = R_() * N, y = R_() * N; const pts = [[x, y]]; for (let k = 0; k < 6; k++) { x += (R_() - 0.5) * 46; y += R_() * 34; pts.push([x, y]); }
    g.lineWidth = 2 + R_() * 3; g.strokeStyle = 'rgba(8,7,6,.85)'; g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
    b.lineWidth = 6; b.strokeStyle = '#202020'; b.beginPath(); pts.forEach((q, k) => k ? b.lineTo(q[0], q[1]) : b.moveTo(q[0], q[1])); b.stroke(); }
  // rust streaks run down from seams, bare-metal flecks, grime
  for (let i = 0; i < P.rust; i++) { const x = R_() * N, y = R_() * N, l = 40 + R_() * 200, gr = g.createLinearGradient(x, y, x, y + l); gr.addColorStop(0, `rgba(122,66,32,${(0.2 + R_() * 0.3).toFixed(2)})`); gr.addColorStop(1, 'rgba(90,50,24,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + R_() * 4, l); }
  for (let i = 0; i < P.fleck; i++) { const x = R_() * N, y = R_() * N, r = 2 + R_() * 7; g.fillStyle = `rgba(150,146,134,${(0.2 + R_() * 0.3).toFixed(2)})`; g.beginPath(); g.ellipse(x, y, r, r * 0.5, R_() * 3, 0, TAU); g.fill(); b.fillStyle = '#6a6a6a'; b.beginPath(); b.ellipse(x, y, r, r * 0.6, 0, 0, TAU); b.fill(); }
  for (let i = 0; i < 380; i++) { g.fillStyle = R_() < 0.6 ? `rgba(20,18,14,${(0.08 + R_() * 0.18).toFixed(2)})` : `rgba(110,70,40,${(0.06 + R_() * 0.12).toFixed(2)})`; g.beginPath(); g.arc(R_() * N, R_() * N, 1 + R_() * 5, 0, TAU); g.fill(); }
  if (P.mark) SHIP.marks[P.mark](g, b, R_, N, P);
  const map = new THREE.CanvasTexture(cv), bump = new THREE.CanvasTexture(bv); map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return (SHIP.texs[name] = { map, bump });
};
SHIP.mat = function (k) { // shared materials: 'hull:<paint>' (textured), 'dark', 'trim', 'glass' (vertex-coloured)
  if (SHIP.mats[k]) return SHIP.mats[k];
  let m;
  if (k.indexOf('hull:') === 0) { const T = SHIP.tex(k.slice(5)); m = new THREE.MeshStandardMaterial({ map: T.map, bumpMap: T.bump, bumpScale: 1.6, roughness: 0.74, metalness: 0.3 }); }
  else if (k === 'glass') m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.7, envMapIntensity: 1.6 });
  else m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: k === 'trim' ? 0.42 : 0.55, metalness: k === 'trim' ? 0.3 : 0.45 });
  return (SHIP.mats[k] = m);
};

/* ---------------------------------------------------------------- geometry kit (bake-time only) */
SHIP.sample = function (S, z) { // Catmull-Rom over sections [z, halfW, halfH, offY, exponent] → [halfW, halfH, offY, e]
  let i = 0; while (i < S.length - 2 && z > S[i + 1][0]) i++;
  const s0 = S[Math.max(0, i - 1)], s1 = S[i], s2 = S[i + 1], s3 = S[Math.min(S.length - 1, i + 2)];
  const t = sat((z - s1[0]) / ((s2[0] - s1[0]) || 1)), out = [0, 0, 0, 0];
  for (let k = 1; k <= 4; k++) { const p0 = s0[k], p1 = s1[k], p2 = s2[k], p3 = s3[k]; const v = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t); out[k - 1] = k === 3 ? v : Math.max(0.03, v); }
  return out;
};
/* put: transform, drop to non-indexed, fill uv / vertex colour, file under a slot. o = {x,y,z,rx,ry,rz,sx,sy,sz,c,k} */
SHIP.SLOT_C = { dark: '#34373a', trim: '#66635c', glass: '#22303a', emit: '#ffffff' }; // default vertex tint: unset parts must not read as white
SHIP.put = function (b, slot, g, o) {
  o = o || {};
  g.applyMatrix4(_m1.compose(_v1.set(o.x || 0, o.y || 0, o.z || 0), _q1.setFromEuler(_e1.set(o.rx || 0, o.ry || 0, o.rz || 0)), _v2.set(o.sx || 1, o.sy || 1, o.sz || 1)));
  if (!g.attributes.normal) g.computeVertexNormals();
  if (g.index) g = g.toNonIndexed();
  const n = g.attributes.position.count;
  if (!g.attributes.uv) { const P = g.attributes.position.array, uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { uv[i * 2] = (P[i * 3] + P[i * 3 + 2]) * 0.5; uv[i * 2 + 1] = P[i * 3 + 1] * 0.5; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
  if (slot !== 'hull') { const c = new THREE.Color(o.c !== undefined ? o.c : SHIP.SLOT_C[slot]), k = o.k || 1, C = new Float32Array(n * 3); for (let i = 0; i < n; i++) { C[i * 3] = c.r * k; C[i * 3 + 1] = c.g * k; C[i * 3 + 2] = c.b * k; } g.setAttribute('color', new THREE.BufferAttribute(C, 3)); }
  b[slot].push(g); return g;
};
SHIP.merge = function (list, slot) { // concatenate non-indexed pieces of one slot into one geometry
  if (!list || !list.length) return null;
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const col = slot !== 'hull', P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), C = col ? new Float32Array(n * 3) : null; let o = 0;
  for (const g of list) { const c = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); U.set(g.attributes.uv.array, o * 2); if (col) C.set(g.attributes.color.array, o * 3); o += c; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  if (col) m.setAttribute('color', new THREE.BufferAttribute(C, 3)); m.computeBoundingSphere(); return m;
};
SHIP.rbox = function (w, h, d, c) { // box with rounded edges: 2×2×2 cells, corners pulled in by c
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2); c = Math.max(0.01, Math.min(c, Math.min(w, h, d) * 0.45));
  const P = g.attributes.position, hx = w / 2 - c, hy = h / 2 - c, hz = d / 2 - c;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ix = clamp(x, -hx, hx), iy = clamp(y, -hy, hy), iz = clamp(z, -hz, hz), dx = x - ix, dy = y - iy, dz = z - iz, l = Math.hypot(dx, dy, dz) || 1; P.setXYZ(i, ix + dx / l * c, iy + dy / l * c, iz + dz / l * c); }
  g.computeVertexNormals(); return g;
};
SHIP.box = function (b, slot, w, h, d, o) { return SHIP.put(b, slot, SHIP.rbox(w, h, d, Math.min(w, h, d) * 0.3), o); };
SHIP.cz = function (b, slot, r0, r1, len, o) { const g = new THREE.CylinderGeometry(r1, r0, len, (o && o.seg) || 12, 1, false); g.rotateX(Math.PI / 2); return SHIP.put(b, slot, g, o); }; // r0 at -Z (back), r1 at +Z
SHIP.cy = function (b, slot, r0, r1, h, o) { return SHIP.put(b, slot, new THREE.CylinderGeometry(r1, r0, h, (o && o.seg) || 12, 1, false), o); }; // r0 bottom, r1 top
SHIP.sp = function (b, slot, r, o) { return SHIP.put(b, slot, new THREE.SphereGeometry(r, 12, 8), o); };
SHIP.pl = function (b, slot, pts, t, o) { // flat plate: planform [x,z] extruded t along Y (wings, blades, ramps)
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))), { depth: t, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.translate(0, 0, -t / 2); g.rotateX(Math.PI / 2); return SHIP.put(b, slot, g, o); };
SHIP.fn = function (b, slot, pts, t, o) { // side-profile fin: [z,y] extruded t along X (winglets, ram-blades)
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))), { depth: t, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.translate(0, 0, -t / 2); g.rotateY(-Math.PI / 2); return SHIP.put(b, slot, g, o); };
SHIP.bar = function (b, slot, x1, z1, x2, z2, y, t, o) { // thin strip between two points on the XZ plane (edge glows, pinstripes)
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
  return SHIP.box(b, slot, L, t, t * 1.3, Object.assign({ x: (x1 + x2) / 2, y, z: (z1 + z2) / 2, ry: -Math.atan2(dz, dx) }, o || {})); };
SHIP.loft = function (b, slot, S, o) { // superellipse loft along Z through sections [z, hw, hh, offY, e]
  o = o || {}; const z0 = S[0][0], z1 = S[S.length - 1][0], NR = Math.max(10, S.length * 4), NT = o.seg || 20, P = [], UV = [], I = [], W = NT + 1;
  for (let j = 0; j <= NR; j++) { const z = z0 + (z1 - z0) * j / NR, q = SHIP.sample(S, z), e = q[3];
    for (let i = 0; i <= NT; i++) { const a = i / NT * TAU, ca = Math.cos(a), sa = Math.sin(a);
      P.push(Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e) * q[0], Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e) * q[1] + q[2], z);
      UV.push(i / NT * 2, (z - z0) / (z1 - z0) * 2.5); } }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NT; i++) { const a = j * W + i, c = a + W; I.push(a, a + 1, c + 1, a, c + 1, c); }
  for (const [jr, back] of [[0, true], [NR, false]]) { const z = z0 + (z1 - z0) * jr / NR, ci = P.length / 3; P.push(0, SHIP.sample(S, z)[2], z); UV.push(0.5, 0.5);
    for (let i = 0; i < NT; i++) { const a = jr * W + i, c = a + 1; if (back) I.push(ci, c, a); else I.push(ci, a, c); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
  return SHIP.put(b, slot, g, o);
};
/* dress: scatter n rounded boxes over the loft surface between zA and zB (panels, vents, plating) */
SHIP.dress = function (b, slot, S, zA, zB, n, R_, sz, cols) {
  for (let i = 0; i < n; i++) {
    const z = zA + (zB - zA) * R_(), q = SHIP.sample(S, z), hw = q[0], hh = q[1], oy = q[2], a = R_() * TAU, ca = Math.cos(a), sa = Math.sin(a);
    const nx = ca / hw, ny = sa / hh, l = Math.hypot(nx, ny) || 1, ux = nx / l, uy = ny / l;
    const w = sz * (0.5 + R_()), h = sz * (0.12 + 0.12 * R_()), d = sz * (0.6 + R_() * 1.2);
    SHIP.box(b, slot, w, h, d, { x: ca * hw + ux * h * 0.4, y: sa * hh + oy + uy * h * 0.4, z, rz: Math.atan2(uy, ux) - HALF, c: cols[(R_() * cols.length) | 0] });
  } };
SHIP.mz = function (b, x, y, z) { b.muz.push(new THREE.Vector3(x, y, z)); };
SHIP.turret = function (b, x, y, z, r, reach) { // base, housing and twin barrels reaching +Z (muzzles at the tips)
  SHIP.cy(b, 'dark', r, r * 1.1, 0.7, { x, y: y + 0.35, z, seg: 14 });
  SHIP.box(b, 'dark', r * 1.5, r * 0.9, r * 1.7, { x, y: y + 0.95, z, c: '#3a3c3e' });
  for (const s of [-1, 1]) { const bx = x + s * r * 0.36; SHIP.cz(b, 'dark', 0.1, 0.12, reach, { x: bx, y: y + 0.95, z: z + r * 0.6 + reach / 2, seg: 8 }); SHIP.mz(b, bx, y + 0.95, z + r * 0.6 + reach); }
};
SHIP.eng = function (b, x, y, z, r, len, col, k) { // nacelle, glowing nozzle disc at the back, plume registered for thrust
  const zb = z - len / 2;
  SHIP.cz(b, 'dark', r * 0.86, r, len, { x, y, z, seg: 16 });
  const d = new THREE.CircleGeometry(r * 0.7, 16); d.rotateY(Math.PI); SHIP.put(b, 'emit', d, { x, y, z: zb - 0.02, c: col, k: k || 2.4 });
  b.eng.push({ pos: new THREE.Vector3(x, y, zb), r }); b.plume.push({ x, y, z: zb, r: r * 0.78, len: r * 5.5, col });
};
SHIP.plumeGeo = function (list) { // one merged plume: a frustum per engine, aT 0 at the nozzle → 1 at the tip (the shader stretches it)
  if (!list.length) return null; const P = [], T = [], L = [], C = [], NS = 10;
  for (const e of list) { const c = new THREE.Color(e.col);
    for (let i = 0; i < NS; i++) { const a0 = i / NS * TAU, a1 = (i + 1) / NS * TAU, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const V = [[c0 * e.r, s0 * e.r, 0], [c1 * e.r, s1 * e.r, 0], [c1 * e.r * 0.25, s1 * e.r * 0.25, 1], [c0 * e.r, s0 * e.r, 0], [c1 * e.r * 0.25, s1 * e.r * 0.25, 1], [c0 * e.r * 0.25, s0 * e.r * 0.25, 1]];
      for (const v of V) { P.push(e.x + v[0], e.y + v[1], e.z); T.push(v[2]); L.push(e.len); C.push(c.r, c.g, c.b); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(T, 1)); g.setAttribute('aL', new THREE.Float32BufferAttribute(L, 1)); g.setAttribute('aC', new THREE.Float32BufferAttribute(C, 3)); return g;
};

/* ---------------------------------------------------------------- kinds: lofts and greebles (nose +Z) */
SHIP.DEF.harbinger = function (b, R_) { // battered CR90-style corvette: long cylinder, hammerhead bow, patchwork plating, 3 turrets
  const S = [[-20, 3.0, 3.3, 0, 2.6], [-14, 3.9, 3.9, 0, 2.8], [-5, 4.3, 4.2, 0, 3.0], [7, 4.3, 4.1, -0.1, 3.0], [12, 4.5, 3.6, -0.1, 2.8], [15, 6.2, 2.7, -0.2, 3.0], [17.4, 7.2, 1.8, -0.2, 3.4], [18.8, 6.4, 1.3, -0.2, 3.2], [20, 1.4, 0.9, -0.1, 2.2]];
  SHIP.loft(b, 'hull', S);
  SHIP.dress(b, 'dark', S, -17, 16, 30, R_, 1.3, ['#2e3032', '#3a3a36', '#4d4a43', '#25282b']);
  SHIP.dress(b, 'trim', S, -16, 14, 7, R_, 1.0, ['#7a4a22', '#6a6a60']);
  SHIP.box(b, 'dark', 3.2, 1.7, 4.4, { x: 0, y: 4.85, z: 9, c: '#3a3d40' });
  SHIP.box(b, 'glass', 2.6, 0.7, 0.2, { x: 0, y: 5.1, z: 11.2, c: '#27404c' });
  SHIP.turret(b, 0, 3.9, 4, 1.1, 2.4); SHIP.turret(b, 0, -3.9, -6, 1.0, 2.2); SHIP.turret(b, 0, 2.4, 14.6, 0.9, 2.0);
  for (const s of [-1, 1]) {
    SHIP.eng(b, s * 3.4, 0.2, -18.5, 2.3, 6, '#ff7a2a', 2.4);
    SHIP.box(b, 'dark', 1.2, 1.2, 5.2, { x: s * 2.2, y: 0.2, z: -17.6, c: '#303336' });
    SHIP.sp(b, 'emit', 0.12, { x: s * 6.9, y: 0.4, z: 17.4, c: s < 0 ? '#ff2a20' : '#30ff60', k: 4 });
  }
  SHIP.cy(b, 'dark', 0.05, 0.05, 3.4, { x: -1.6, y: 6.2, z: -6 }); SHIP.sp(b, 'emit', 0.14, { x: -1.6, y: 7.9, z: -6, c: '#ff3020', k: 3 });
};
SHIP.DEF.interceptor = function (b, R_) { // the seized Sith Interceptor: dagger hull, forward-swept blades, ram-blades, crimson edges
  const S = [[-5.6, 2.1, 1.3, 0, 2.2], [-3.2, 2.0, 1.2, 0, 2.4], [-0.6, 1.4, 0.95, 0.1, 2.6], [1.8, 1.0, 0.62, 0.15, 2.6], [3.8, 0.5, 0.36, 0.1, 2.4], [5.6, 0.12, 0.1, 0, 2.0]];
  SHIP.loft(b, 'hull', S);
  SHIP.loft(b, 'glass', [[0.2, 0.5, 0.24, 0.6, 2.4], [1.6, 0.45, 0.22, 0.55, 2.4], [2.8, 0.16, 0.12, 0.48, 2.2]], { c: '#2a0c10' });
  SHIP.dress(b, 'dark', S, -4, 3, 10, R_, 0.6, ['#1d1c1e', '#4a2a22', '#2a2a2e']);
  for (const s of [-1, 1]) {
    SHIP.pl(b, 'hull', [[s * 0.6, -3.6], [s * 0.6, 1.4], [s * 5.8, 3.4], [s * 6.2, 0.6]], 0.22, { y: -0.05 });
    SHIP.bar(b, 'emit', s * 0.6, 1.4, s * 5.8, 3.4, 0.12, 0.06, { c: '#c81a22', k: 2.5 });
    SHIP.fn(b, 'dark', [[-2.6, -0.2], [1.6, -0.15], [5.4, 0.25], [2.2, -0.62], [-2.6, -0.9]], 0.22, { x: s * 1.1 });
    SHIP.eng(b, s * 1.1, 0, -5.4, 0.6, 1.6, '#ff3a18', 2.6);
    SHIP.cz(b, 'dark', 0.09, 0.09, 1.0, { x: s * 0.5, y: -0.05, z: 4.6, seg: 8 }); SHIP.mz(b, s * 0.5, -0.05, 5.1);
  }
  SHIP.bar(b, 'emit', 0, -4.2, 0, 3.8, 0.95, 0.05, { c: '#b2121a', k: 2.2 });
};
SHIP.DEF.shroud = function (b, R_) { // heavily modified Infiltrator: matte flying wing, red pinstripes, concussion emitters
  const S = [[-6.4, 6.1, 0.4, -0.1, 2.6], [-5.2, 8.4, 0.58, -0.05, 3.0], [-3.2, 8.8, 0.66, -0.02, 3.2], [-0.6, 7.2, 0.62, 0, 3.0], [2.0, 4.2, 0.55, 0, 2.8], [4.4, 1.6, 0.42, 0.04, 2.6], [6.2, 0.35, 0.22, 0.05, 2.4]];
  SHIP.loft(b, 'hull', S);
  SHIP.loft(b, 'glass', [[0.8, 0.9, 0.36, 0.5, 2.2], [2.6, 0.7, 0.28, 0.42, 2.2], [4.2, 0.26, 0.16, 0.34, 2.0]], { c: '#3a0a0c' });
  SHIP.dress(b, 'dark', S, -5.5, 5, 8, R_, 0.6, ['#15151a', '#1e1e24']);
  for (const s of [-1, 1]) {
    SHIP.fn(b, 'hull', [[-6.2, 0], [-2.6, 0], [-4.2, 1.5], [-5.8, 1.2]], 0.16, { x: s * 8.4 });
    SHIP.bar(b, 'emit', s * 4.2, 2.0, s * 1.6, 4.4, 0.62, 0.05, { c: '#c2141c', k: 2.6 });
    SHIP.eng(b, s * 2.6, -0.1, -6.2, 0.62, 1.6, '#ff2a2a', 2.2);
    SHIP.mz(b, s * 2.4, -0.2, 2.4); SHIP.mz(b, s * 4.6, -0.2, 0.6);
  }
};
SHIP.DEF.trandoFreighter = function (b, R_) { // modified Ghtroc wedge: ram prow, trophy spikes, weapon pods
  const S = [[-12, 5.4, 4.6, 0, 2.6], [-6, 5.6, 4.6, 0, 2.8], [0, 5.0, 4.0, -0.1, 2.9], [5, 4.2, 3.0, -0.2, 2.8], [8.5, 3.0, 2.0, -0.3, 2.6], [10.8, 1.8, 1.3, -0.4, 2.4], [12, 0.8, 0.8, -0.5, 2.0]];
  SHIP.loft(b, 'hull', S);
  SHIP.dress(b, 'dark', S, -10, 10, 30, R_, 1.2, ['#2c2e2a', '#3b3a33', '#4a3b2d']);
  SHIP.dress(b, 'trim', S, -9, 9, 6, R_, 1.0, ['#7a4a22', '#6b5b3f']);
  SHIP.box(b, 'dark', 3.4, 1.8, 4.2, { x: 0, y: -1.3, z: 11.1, c: '#3a3530' });
  SHIP.cz(b, 'trim', 0.65, 0.05, 3.2, { y: -1.0, z: 14.5, c: '#8c8270', seg: 10 });
  for (const s of [-1, 1]) for (const z of [-7, -2]) { SHIP.cy(b, 'trim', 0.12, 0.02, 2.6, { x: s * 1.9, y: 5.4, z, seg: 6 }); SHIP.sp(b, 'trim', 0.34, { x: s * 1.9, y: 6.9, z, c: '#c8bfa6' }); }
  for (const s of [-1, 1]) { SHIP.box(b, 'dark', 2.8, 1.5, 2.4, { x: s * 4.7, y: -0.8, z: -4, c: '#34322d' }); SHIP.box(b, 'dark', 2.8, 1.5, 2.4, { x: s * 4.7, y: -0.8, z: 4.6, c: '#34322d' });
    SHIP.cz(b, 'dark', 0.13, 0.13, 2.6, { x: s * 4.7, y: -0.5, z: -4 + 2.4, seg: 8 }); SHIP.mz(b, s * 4.7, -0.5, -4 + 3.6);
    SHIP.cz(b, 'dark', 0.13, 0.13, 2.6, { x: s * 4.7, y: -0.5, z: 4.6 + 2.4, seg: 8 }); SHIP.mz(b, s * 4.7, -0.5, 4.6 + 3.6);
    SHIP.eng(b, s * 2.6, -0.4, -12.2, 1.2, 1.6, '#ff8a2a', 2.6); }
  SHIP.eng(b, 0, 0.7, -12.2, 0.9, 1.6, '#ff8a2a', 2.6);
};
SHIP.DEF.trandoStalker = function (b, R_) { // VCX-100 style: sleek fuselage, sensor boom and dish, stub wings, cloak emitters
  const S = [[-15, 1.5, 1.3, 0, 2.6], [-9, 2.2, 1.9, 0, 2.8], [-3, 2.5, 2.0, 0.1, 2.9], [3, 2.5, 2.0, 0.1, 2.9], [9, 2.2, 1.7, 0.2, 2.8], [12.5, 1.6, 1.2, 0.2, 2.6], [14.5, 1.0, 0.85, 0.15, 2.4], [15, 0.5, 0.45, 0.1, 2.2]];
  SHIP.loft(b, 'hull', S);
  SHIP.dress(b, 'dark', S, -12, 12, 14, R_, 0.9, ['#2a2d2a', '#383b36', '#20231f']);
  for (const s of [-1, 1]) { SHIP.pl(b, 'hull', [[s * 1.2, -3.8], [s * 1.2, 1.2], [s * 7.4, -0.4], [s * 6.0, -4.2]], 0.24, { y: -0.12 }); SHIP.eng(b, s * 0.9, 0, -15.2, 0.7, 1.4, '#7fb5ff', 2.4); SHIP.mz(b, s * 0.35, -0.2, 12.6); }
  SHIP.box(b, 'dark', 0.6, 0.8, 9.0, { x: 0, y: 2.5, z: 0 });
  SHIP.cy(b, 'dark', 0.08, 0.08, 1.0, { x: 0, y: 2.9, z: -4 }); SHIP.sp(b, 'trim', 1.2, { x: 0, y: 3.4, z: -4, sy: 0.22, rx: -0.45, seg: 10 });
  SHIP.cz(b, 'trim', 0.12, 0.03, 5, { x: 0, y: 0.1, z: 17.5, seg: 6 });
};
SHIP.DEF.militiaFighter = function (b, R_) { // Republic frontier single-seat fighter: narrow hull, swept wings, roundel on the flanks
  const S = [[-4.6, 0.55, 0.5, 0, 2.8], [-2.6, 0.7, 0.65, 0, 2.8], [0, 0.85, 0.72, 0.1, 2.6], [2.2, 0.72, 0.6, 0.1, 2.6], [4.0, 0.4, 0.34, 0.05, 2.4], [4.8, 0.14, 0.12, 0, 2.0]];
  SHIP.loft(b, 'hull', S);
  SHIP.loft(b, 'glass', [[0.1, 0.5, 0.4, 0.85, 2.6], [1.8, 0.45, 0.32, 0.8, 2.6], [2.8, 0.2, 0.14, 0.6, 2.2]], { c: '#202a30' });
  SHIP.dress(b, 'dark', S, -3, 3, 6, R_, 0.5, ['#3a3c36', '#2a2c28']);
  for (const s of [-1, 1]) {
    SHIP.pl(b, 'dark', [[s * 0.6, -2.6], [s * 0.6, 1.4], [s * 4.4, -0.8], [s * 4.4, -3.8]], 0.14, { y: 0, c: '#4a4c48' }); // unpainted: the roundel stays on the fuselage
    SHIP.cz(b, 'dark', 0.07, 0.07, 0.9, { x: s * 4.2, y: -0.1, z: -2.3, seg: 6 }); SHIP.mz(b, s * 4.4, -0.1, -2.3);
    SHIP.eng(b, s * 0.42, 0, -4.4, 0.3, 0.8, '#ffb070', 2.4);
    SHIP.cz(b, 'dark', 0.06, 0.06, 0.8, { x: s * 0.3, y: -0.2, z: 4.4, seg: 6 }); SHIP.mz(b, s * 0.3, -0.2, 4.8);
  }
};
SHIP.DEF.jediStarfighter = function (b, R_) { // small Jedi interceptor: forward cockpit, forward-swept wings, tan and white
  const S = [[-5.4, 0.45, 0.4, 0, 2.6], [-3, 0.55, 0.5, 0, 2.6], [-0.5, 0.55, 0.52, 0, 2.6], [1.8, 0.5, 0.46, 0.05, 2.6], [3.4, 0.42, 0.36, 0.1, 2.6], [4.6, 0.2, 0.18, 0.1, 2.2], [5.4, 0.08, 0.08, 0.1, 2.0]];
  SHIP.loft(b, 'hull', S);
  SHIP.loft(b, 'glass', [[1.4, 0.45, 0.35, 0.5, 2.4], [3.0, 0.42, 0.3, 0.5, 2.4], [4.1, 0.2, 0.16, 0.4, 2.2]], { c: '#1e2f3c' });
  SHIP.dress(b, 'dark', S, -4, 2, 4, R_, 0.4, ['#3c3e3a', '#2c2e2c']);
  for (const s of [-1, 1]) { SHIP.pl(b, 'hull', [[s * 0.4, -2.6], [s * 0.4, -0.8], [s * 4.6, 1.4], [s * 4.6, 0.0]], 0.14, { y: -0.05 });
    SHIP.eng(b, s * 0.55, 0, -5.2, 0.36, 0.9, '#8ad0ff', 2.6); SHIP.mz(b, s * 4.6, -0.1, 0.8); }
  SHIP.fn(b, 'hull', [[-5.0, 0.2], [-2.4, 0.2], [-2.8, 1.9], [-4.4, 1.6]], 0.12, { x: 0 });
};
SHIP.DEF.hunterDropship = function (b, R_) { // boxy troop dropship: side doors, rear ramp, skids, salvage-orange trim
  const S = [[-7.2, 2.6, 2.2, 0, 6], [-4.0, 3.0, 2.5, 0, 6], [0, 3.1, 2.6, 0, 6], [4.8, 3.0, 2.5, 0, 6], [6.4, 2.6, 2.2, -0.2, 6], [7.4, 2.3, 1.9, -0.2, 6]];
  SHIP.loft(b, 'hull', S);
  SHIP.box(b, 'glass', 2.2, 0.9, 0.14, { x: 0, y: 0.7, z: 7.45, c: '#1d2a33' });
  SHIP.dress(b, 'dark', S, -6, 6, 24, R_, 1.0, ['#2a2a2c', '#3a3530', '#222426']);
  SHIP.dress(b, 'trim', S, -6, 6, 5, R_, 0.9, ['#a85a1e', '#6d4a2a']);
  for (const s of [-1, 1]) {
    SHIP.box(b, 'dark', 0.12, 2.4, 3.6, { x: s * 3.12, y: -0.2, z: -0.8, c: '#222426' });
    SHIP.box(b, 'dark', 0.24, 0.24, 12.4, { x: s * 2.3, y: -3.0, z: 0.2, c: '#2a2a2c' });
    SHIP.box(b, 'dark', 0.2, 1.0, 0.2, { x: s * 2.3, y: -2.5, z: 3.2, c: '#2a2a2c' });
    SHIP.eng(b, s * 2.4, 1.4, -7.6, 0.72, 1.6, '#ff9040', 2.4);
    SHIP.cz(b, 'dark', 0.16, 0.18, 1.5, { x: s * 3.3, y: 0.3, z: 5.4, seg: 8 }); SHIP.mz(b, s * 3.3, 0.3, 6.15);
  }
  SHIP.pl(b, 'dark', [[-2.1, -7.0], [2.1, -7.0], [2.3, -9.2], [-2.3, -9.2]], 0.14, { y: -2.0 });
};
SHIP.DEF.picket = function (b, R_) { // static Republic picket: blunt corvette, bridge block, sensor dish on a mast, two turrets
  const S = [[-15, 2.2, 2.2, 0, 2.8], [-11, 2.9, 2.8, 0, 3.0], [-3, 3.2, 3.0, 0, 3.0], [6, 3.2, 3.0, 0, 3.0], [11.5, 2.8, 2.6, 0, 2.9], [14.4, 2.0, 1.8, 0, 2.6], [15, 0.9, 0.85, 0, 2.2]];
  SHIP.loft(b, 'hull', S);
  SHIP.dress(b, 'dark', S, -13, 13, 26, R_, 1.2, ['#41464c', '#4a4f55', '#363a3f']);
  SHIP.box(b, 'dark', 3.4, 1.8, 5.0, { x: 0, y: 4.1, z: 4.0, c: '#41464c' });
  SHIP.box(b, 'glass', 2.8, 0.5, 0.2, { x: 0, y: 4.4, z: 6.55, c: '#1d3440' });
  SHIP.cy(b, 'dark', 0.2, 0.2, 4.2, { x: 0, y: 5.4, z: -6 });
  SHIP.sp(b, 'trim', 4.2, { x: 0, y: 7.6, z: -6, sy: 0.14, rx: -0.45, seg: 12 });
  SHIP.turret(b, 0, 3.1, 8.5, 1.0, 2.2); SHIP.turret(b, 0, -3.0, -7, 1.0, 2.2);
  for (const s of [-1, 1]) { SHIP.box(b, 'dark', 1.4, 1.6, 4.6, { x: s * 2.2, y: -0.2, z: -12, c: '#303336' }); SHIP.eng(b, s * 2.2, 0, -15.6, 1.1, 2.2, '#8fb8ff', 2.4); }
};
SHIP.DEF.capital = function (b, R_) { // distant Republic cruiser: low detail on purpose (a backdrop, not a dogfight target)
  const S = [[-28, 4.0, 4.0, 0, 3.0], [-10, 6.0, 5.5, 0, 3.0], [10, 6.0, 5.5, 0, 3.0], [24, 4.0, 3.6, -0.4, 2.8], [29, 2.0, 2.0, -0.4, 2.4], [31, 0.6, 0.6, -0.3, 2.0]];
  SHIP.loft(b, 'hull', S, { seg: 14 });
  SHIP.dress(b, 'dark', S, -24, 24, 12, R_, 2.4, ['#41464c', '#363a3f']);
  SHIP.box(b, 'dark', 4.5, 3.0, 9.0, { x: 0, y: 7.0, z: 14, c: '#41464c' });
  SHIP.turret(b, 0, 5.5, -6, 1.6, 4.5); SHIP.turret(b, 0, -5.4, 6, 1.6, 4.5);
  SHIP.eng(b, -3.2, -0.3, -28.4, 2.0, 3.6, '#9ab8ff', 2.2); SHIP.eng(b, 3.2, -0.3, -28.4, 2.0, 3.6, '#9ab8ff', 2.2); SHIP.eng(b, 0, 0.2, -28.4, 2.4, 3.6, '#9ab8ff', 2.4);
};
SHIP.DEF.courier = function (b, R_) { // Star Courier stealth ship: sleek wedge, small delta wings, faint engine, hidden cannons
  const S = [[-6.2, 1.2, 0.8, 0, 2.6], [-3.0, 1.6, 0.9, 0, 2.8], [0.6, 1.5, 0.75, 0.05, 2.8], [3.8, 1.0, 0.55, 0.1, 2.6], [6.2, 0.45, 0.33, 0.1, 2.4], [7.0, 0.1, 0.1, 0, 2.0]];
  SHIP.loft(b, 'hull', S);
  SHIP.loft(b, 'glass', [[1.2, 0.55, 0.22, 0.5, 2.4], [3.6, 0.5, 0.2, 0.45, 2.4], [5.2, 0.2, 0.1, 0.35, 2.2]], { c: '#0c1420' });
  SHIP.dress(b, 'dark', S, -4, 4, 5, R_, 0.4, ['#1a1d22', '#262b31']);
  for (const s of [-1, 1]) { SHIP.pl(b, 'hull', [[s * 0.6, -1.8], [s * 0.6, 1.4], [s * 4.2, -2.6], [s * 4.2, -3.4]], 0.16, { y: -0.1 });
    SHIP.bar(b, 'emit', s * 0.6, 1.4, s * 4.2, -2.6, -0.05, 0.03, { c: '#5a6cff', k: 0.8 });
    SHIP.cz(b, 'dark', 0.08, 0.08, 0.6, { x: s * 0.6, y: -0.2, z: 4.2, seg: 6 }); SHIP.mz(b, s * 0.6, -0.2, 4.5); }
  SHIP.eng(b, 0, 0, -6.0, 0.5, 0.9, '#7a9cff', 1.2);
};

/* ---------------------------------------------------------------- bake, build, pose, thrust, muzzles */
SHIP.bld = function () { return { hull: [], dark: [], trim: [], glass: [], emit: [], muz: [], eng: [], plume: [] }; };
SHIP.bake = function (kind) { // runs once per kind: lofts, greebles, merged per slot
  const b = SHIP.bld(); SHIP.DEF[kind](b, MG.rs('shipbuild:' + kind));
  const geo = {}; for (const s of ['hull', 'dark', 'trim', 'glass', 'emit']) geo[s] = SHIP.merge(b[s], s);
  geo.plume = SHIP.plumeGeo(b.plume);
  return { geo, muz: b.muz, eng: b.eng };
};
SHIP.build = function (kind) { // fly-pose model; geometry shared per kind, emit/plume materials per instance
  if (!SHIP.HULLS[kind]) kind = 'harbinger';
  const H = SHIP.HULLS[kind], C = SHIP.geos[kind] || (SHIP.geos[kind] = SHIP.bake(kind));
  const g = new THREE.Group(); g.name = 'ship:' + kind;
  const piv = new THREE.Group(), body = new THREE.Group(); piv.add(body); g.add(piv);
  const emat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const pmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uK: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'attribute float aT; attribute float aL; attribute vec3 aC; uniform float uK; varying float vT; varying vec3 vC; void main(){ vT = aT; vC = aC; vec3 p = position; p.z -= aT * aL * (0.15 + 0.85 * uK); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform float uK, uT; varying float vT; varying vec3 vC; void main(){ float a = pow(1.0 - vT, 1.5) * uK * (0.82 + 0.18 * sin(vT * 26.0 + uT * 46.0)); gl_FragColor = vec4(vC * a * 2.0, a); }' });
  const add = (geo, mat, shadow) => { if (!geo) return null; const m = new THREE.Mesh(geo, mat); m.castShadow = !!shadow; m.receiveShadow = true; body.add(m); return m; };
  add(C.geo.hull, SHIP.mat('hull:' + H.paint), true);
  add(C.geo.dark, SHIP.mat('dark'), true);
  add(C.geo.trim, SHIP.mat('trim'), true);
  add(C.geo.glass, SHIP.mat('glass'), false);
  add(C.geo.emit, emat, false);
  add(C.geo.plume, pmat, false).frustumCulled = false;
  g._rig = { piv, body, emat, pmat, len: H.len };
  g.userData = { muzzles: C.muz.map((v) => v.clone()), engines: C.eng.map((e) => ({ pos: e.pos.clone(), r: e.r })), len: H.len, wing: H.wing, radius: H.rad, kind };
  return g;
};
SHIP.model = function (kind) { // one cached instance per kind for the ground call (parked hidden between runs)
  let g = SHIP.models[kind]; if (!g) { g = SHIP.models[kind] = SHIP.build(kind); R.scene.add(g); }
  g.visible = false; return g;
};
/* pose: k = 1 'fly' (nose +Z, origin hull centre) · k = 1 'land' (stands on its tail, nose +Y, origin at the feet); k blends. */
SHIP.pose = function (g, mode, k) {
  const S = g._rig; if (!S) return; k = k === undefined ? 1 : sat(k);
  const f = mode === 'fly' ? k : 1 - k, e = f * f * (3 - 2 * f);
  S.piv.rotation.x = -(1 - e) * HALF; S.piv.position.y = (1 - e) * S.len * 0.5;
};
/* thrust: v 0..1 lengthens the plumes, flickers them, and brightens the nozzle discs */
SHIP.thrust = function (g, v) { const S = g._rig; if (!S) return; v = sat(v); S.pmat.uniforms.uK.value = v; S.pmat.uniforms.uT.value = MG.t; S.emat.color.setScalar(0.75 + 0.25 * v); };
SHIP.muzzles = function (g, out) { // world-space gun points, in userData order
  const S = g._rig, U = g.userData; out = out || []; if (!S) { out.length = 0; return out; }
  g.updateMatrixWorld(true);
  for (let i = 0; i < U.muzzles.length; i++) { out[i] = out[i] || new THREE.Vector3(); out[i].copy(U.muzzles[i]); S.piv.localToWorld(out[i]); }
  out.length = U.muzzles.length; return out;
};
SHIP.dispose = function (g) { // removes the instance and frees its own materials (geometry is shared, kept)
  if (!g) return; if (g.parent) g.parent.remove(g);
  const S = g._rig; if (S) { S.emat.dispose(); S.pmat.dispose(); g._rig = null; }
};

/* ---------------------------------------------------------------- ground ship-call (G / touch SHIP) */
SHIP.shipName = (k) => SHIP.HULLS[k || SHIP.kind()].name;
SHIP.kind = function () { const k = SAVE.d && SAVE.d.ship; return SHIP.HULLS[k] && SHIP.HULLS[k].ai === 'player' ? k : 'harbinger'; };
SHIP.avail = function () { return !!(SHIP.on && LEVEL.cur && LEVEL.cur.def && LEVEL.cur.def.ship && !SHIP.run && SHIP.cd <= 0 && PLAYER.a && PLAYER.a.alive); };
SHIP.floor = function (x, z, y0) { const y = PHY.ground(x, z, 0.3, y0 + 40, y0 - 30); return y === null ? y0 : y; };
SHIP.fxg = function () { if (!SHIP.grp) { SHIP.grp = new THREE.Group(); R.scene.add(SHIP.grp); } return SHIP.grp; };
SHIP.call = function () { // pins the run to the call-time frame: origin and facing of the player
  if (!SHIP.avail() || PLAYER.state === 'cine' || PLAYER.state === 'dead') return false;
  const P = PLAYER.a, kind = SHIP.kind(), H = SHIP.HULLS[kind], g = SHIP.model(kind);
  SHIP.run = { kind, H, g, lvl: LEVEL.cur, t: -H.delay, fired: 0, charge: false, shk: 0, ox: P.x, oy: P.y, oz: P.z, dx: Math.sin(P.yaw), dz: Math.cos(P.yaw) };
  HUD.toast(H.name, 'STRAFING RUN INBOUND', 2.4);
  FX.ring(V3(P.x, P.y + 0.08, P.z), [2.2, 0.3, 0.1], 4, 1.4);
  if (!H.stealth && typeof HEAT !== 'undefined') HEAT.add(6, 'ship');
  SHIP.cd = SHIP.CD; SHIP.n.calls++;
  return true;
};
SHIP.abort = function () { // level change or death mid-run: take the ship and every live effect away
  if (SHIP.run && SHIP.run.g) SHIP.run.g.visible = false;
  SHIP.run = null; SHIP.fx.length = 0; if (SHIP.grp) SHIP.grp.clear();
};
SHIP.tick = function (dt) { // per LEVEL.update: cooldown, the G / touch press, the run, and the timed effects
  SHIP.cd = Math.max(0, SHIP.cd - dt);
  if (IN.take('ship', 0.12)) SHIP.call();
  const R_ = SHIP.run;
  if (R_ && (R_.lvl !== LEVEL.cur || !PLAYER.a || !PLAYER.a.alive)) SHIP.abort();
  for (let i = SHIP.fx.length - 1; i >= 0; i--) if (SHIP.fx[i](dt) === false) SHIP.fx.splice(i, 1);
  if (!SHIP.run) return;
  const H = R_.H, g = R_.g, dx = R_.dx, dz = R_.dz;
  R_.t += dt; if (R_.t < 0) return;                                           // inbound delay: the Harbinger is slow to arrive
  const spd = H.speed, along = -SHIP.R0 + spd * R_.t;
  if (along > SHIP.A1) { g.visible = false; SHIP.run = null; SHIP.n.strafes++; return; }
  const x = R_.ox + dx * along, z = R_.oz + dz * along, fl = SHIP.floor(x, z, R_.oy), alt = 9 + H.len * 0.25;
  g.visible = true; g.position.set(x, fl + alt, z); g.lookAt(x + dx * 12, fl + alt * 0.88, z + dz * 12);
  SHIP.thrust(g, 0.85 + 0.15 * Math.sin(R_.t * 31));
  const passT = SHIP.R0 / spd, t0 = passT - 0.3;                             // the cannons open just before the ship passes overhead
  while (R_.fired < H.bolts && R_.t >= t0 + R_.fired * H.shot) SHIP.fire(R_, H, g);
  if (!R_.charge && R_.t >= passT + 0.1) { R_.charge = true; SHIP.charge(V3(x, fl + alt, z), R_.ox + dx * 16, R_.oz + dz * 16, H, R_); }
  if (Math.abs(along) < 26) { R_.shk -= dt; if (R_.shk <= 0) { R_.shk = 0.1; FX.addShake(0.07); } }
};
SHIP.fire = function (R_, H, g) { // one cannon bolt: alternating muzzles, aimed up the street ahead of the player
  const k = R_.fired++, lat = (k & 1 ? 1.4 : -1.4) + Math.sin(k * 2.7) * 0.5, ahead = 6 + 8 * k;
  const tx = R_.ox + R_.dx * ahead + R_.dz * lat, tz = R_.oz + R_.dz * ahead - R_.dx * lat, ty = SHIP.floor(tx, tz, R_.oy);
  const M = SHIP.muzzles(g, SHIP._mz), a = M[k % M.length].clone(); SHIP.n.bolts++;
  SHIP.bolt(a, V3(tx, ty, tz), () => SHIP.impact(tx, tz, R_.oy, H));
};
SHIP.bolt = function (a, b, done) { // a streak that flies from the muzzle to the ground point; done() on arrival
  if (!SHIP._bg) { SHIP._bg = new THREE.CylinderGeometry(0.09, 0.09, 1, 6, 1, true); SHIP._bg.rotateX(Math.PI / 2); SHIP._bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.8, 0.4), toneMapped: false }); }
  const m = new THREE.Mesh(SHIP._bg, SHIP._bm); m.scale.set(1, 1, 3.2); m.position.copy(a); m.lookAt(b); SHIP.fxg().add(m);
  const T = a.distanceTo(b) / 260; let t = 0;
  SHIP.fx.push((dt) => { t += dt; const u = Math.min(1, t / T); m.position.lerpVectors(a, b, u); if (u < 1) return true; SHIP.fxg().remove(m); if (done) done(); return false; });
};
SHIP.impact = function (x, z, y0, H) { // bolt strike: sparks, scorch, small splash
  const y = SHIP.floor(x, z, y0), p = V3(x, y + 0.1, z), up = V3(0, 1, 0);
  FX.spark(p, up, 12, 7, [4, 1.6, 0.6], 0.35); FX.puff(p, 5, { add: true, size: 0.12, grow: 3, col: [1.2, 0.5, 0.25], a: 0.8, life: 0.4 });
  FX.flashLight(p, [1, 0.4, 0.2], 3, 6, 0.1); FX.scorch(p, up, 0.7);
  SHIP.splash(x, z, H.boomR * 0.5, H.dmg, 'ship');
};
SHIP.splash = function (x, z, r, dmg, kind) { // damage every foe inside r (full at the centre, half at the edge)
  const P = PLAYER.a; let n = 0;
  for (const e of COMBAT.foes()) { const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz); if (d > r + e.r) continue; const l = d || 1;
    COMBAT.damage(e, dmg * (1 - 0.5 * Math.min(1, d / r)), { src: P, kind, heavy: kind === 'slam', dir: { x: dx / l, z: dz / l } }); n++; }
  SHIP.n.hits += n; return n;
};
SHIP.charge = function (from, x, z, H, R_) { // the seismic charge: a lobbed dark sphere
  if (!SHIP._cg) { SHIP._cg = new THREE.SphereGeometry(0.35, 12, 8); SHIP._cm = new THREE.MeshStandardMaterial({ color: 0x3a3e44, metalness: 0.9, roughness: 0.3, emissive: 0x3a1010, emissiveIntensity: 0.8 }); }
  const m = new THREE.Mesh(SHIP._cg, SHIP._cm), to = V3(x, SHIP.floor(x, z, R_.oy), z), y0 = R_.oy; m.position.copy(from); SHIP.fxg().add(m);
  let t = 0; const T = 0.75;
  SHIP.fx.push((dt) => { t += dt; const u = Math.min(1, t / T); m.position.lerpVectors(from, to, u); m.position.y += Math.sin(u * Math.PI) * 4; m.rotation.x += dt * 9;
    if (u < 1) return true; SHIP.fxg().remove(m); SHIP.seismic(x, z, y0, H); return false; });
};
SHIP.seismic = function (x, z, y0, H) { // a beat of silence, then the ring tears outward and the shock follows
  const p = V3(x, SHIP.floor(x, z, y0), z), up = V3(0, 1, 0); let t = 0, boom = false;
  SHIP.fx.push((dt) => { t += dt; if (t < 0.42) return true;
    if (!boom) { boom = true; SHIP.n.booms++;
      FX.ring(p, [2.6, 0.45, 0.2], H.boomR * 2.2, 0.9); FX.flashLight(p, [1, 0.35, 0.2], 26, 30, 0.6); FX.spark(p, up, 30, 9, [4, 2, 1], 0.6);
      FX.puff(p, 16, { size: 0.9, grow: 3.5, spread: 6, life: 2.2, col: [0.32, 0.3, 0.28], a: 0.45 }); FX.scorch(p, up, H.boomR * 1.1);
      R.shock(p, 0.9); R.kick(0.6); FX.addShake(0.9);
      SHIP.splash(x, z, H.boomR, H.dmg * 2.4, 'slam'); }
    return false; });
};

/* per-frame hook (wrapped onto LEVEL.update below, like p24c_interact) */
{ const _u = LEVEL.update; LEVEL.update = function (dt) { _u(dt); SHIP.tick(dt); }; }
TOUCH.cd.ship = () => SHIP.cd / SHIP.CD;
