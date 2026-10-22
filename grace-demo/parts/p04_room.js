/* ROOM — the bedchamber, laid out from the reference frame (x runs along the back wall, z toward the camera, y up;
   1 unit = 1 m). Architecture and furniture are boxes with pixel textures projected at 32 texels/m; small props are
   pixel-art cards standing in the room, so they are lit, shadowed and reflected like everything else. */
const ROOM = { X0: -11.6, X1: 11.8, CEIL: 4.7, KZ: 2.6, flames: [], glows: [], lights: {}, inter: [], tick: [] };
ROOM.mats = {};
ROOM.std = function (tex, o) {
  o = o || {};
  const key = (tex ? tex.uuid : 'none') + JSON.stringify(o); if (ROOM.mats[key]) return ROOM.mats[key];
  const m = new THREE.MeshStandardMaterial({ map: tex || null, color: o.col === undefined ? 0xffffff : o.col, roughness: o.rough === undefined ? 0.88 : o.rough, metalness: 0,
    alphaTest: o.alpha ? 0.5 : 0, side: o.side || THREE.FrontSide, emissive: o.emis || 0x000000, emissiveMap: o.emis ? tex : null, emissiveIntensity: o.ei || 1 });
  return (ROOM.mats[key] = m);
};
/* project world coords onto the face's dominant plane → texel-true UVs, so neighbouring pieces share one grid */
ROOM.planarUV = function (geo, tex) {
  const P = geo.attributes.position, N = geo.attributes.normal, uv = new Float32Array(P.count * 2), w = tex.userData.w || 32, h = tex.userData.h || 32, D = PX.D;
  for (let i = 0; i < P.count; i++) {
    const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i)), nz = Math.abs(N.getZ(i)); let a, b;
    if (nz >= nx && nz >= ny) { a = P.getX(i); b = P.getY(i); } else if (nx >= ny) { a = P.getZ(i); b = P.getY(i); } else { a = P.getX(i); b = -P.getZ(i); }
    uv[i * 2] = a * D / w; uv[i * 2 + 1] = b * D / h;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
};
ROOM.add = function (mesh, o) {
  o = o || {}; mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.recv !== false;
  if (o.layer !== undefined) mesh.layers.set(o.layer);
  R.scene.add(mesh); return mesh;
};
/* box spanning x0..x1, y0..y1, z0..z1 */
ROOM.box = function (x0, x1, y0, y1, z0, z1, tex, o) {
  o = o || {};
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  if (o.taper) { const P = g.attributes.position, cx = (x0 + x1) / 2, cz = z0; for (let i = 0; i < P.count; i++) if (P.getY(i) > (y0 + y1) / 2) { P.setX(i, cx + (P.getX(i) - cx) * o.taper[0]); P.setZ(i, cz + (P.getZ(i) - cz) * o.taper[1]); } g.computeVertexNormals(); }
  ROOM.planarUV(g, tex || PX.T.woodDark);
  if (tex === PX.T.brick && o.col === undefined) o = Object.assign({ col: 0xc8bcac }, o);
  const mats = o.front ? [0, 1, 2, 3, 4, 5].map((k) => (k === 4 ? o.front : ROOM.std(tex, o))) : ROOM.std(tex, o);
  if (o.front) { const uv = g.attributes.uv; for (let i = 16; i < 20; i++) uv.setXY(i, (i - 16) % 2, (i - 16) < 2 ? 1 : 0); }
  return ROOM.add(new THREE.Mesh(g, mats), o);
};
/* a pixel card: bottom-centre at (x, y, z), sized from its texture at 32 texels/m (or o.w/o.h metres) */
ROOM.card = function (tex, x, y, z, o) {
  o = o || {};
  const w = o.w || (tex.userData.w / (tex.userData.n || 1)) / PX.D * (o.s || 1), h = o.h || tex.userData.h / PX.D * (o.s || 1);
  const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0);
  if (o.ru) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * o.ru); }
  const m = o.mat || (o.basic ? new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(o.col || 0xffffff).multiplyScalar(o.k || 1), alphaTest: 0.5, side: THREE.DoubleSide })
    : ROOM.std(tex, { alpha: true, side: THREE.DoubleSide, rough: o.rough, col: o.col }));
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z); if (o.ry) me.rotation.y = o.ry; if (o.rx) me.rotation.x = o.rx;
  return ROOM.add(me, { cast: o.cast !== undefined ? o.cast : true, recv: true, layer: o.layer });
};
ROOM.flame = function (x, y, z, s, big) {
  const base = big ? PX.T.fire : PX.T.flame, t = base.clone(); t.needsUpdate = true; t.repeat.x = 1 / base.userData.n; t.userData = Object.assign({}, base.userData);
  const m = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1, 1, 1).multiplyScalar(big ? 3.2 : 2.6), alphaTest: 0.5, side: THREE.DoubleSide });
  const me = ROOM.card(t, x, y, z, { mat: m, s, cast: false });
  const f = { t, n: base.userData.n, ph: hash(x * 10, z * 10, 7) * 8, rate: big ? 11 : 9 }; ROOM.flames.push(f);
  return me;
};
ROOM.glow = function (x, y, z, size, col, k) {
  const m = new THREE.SpriteMaterial({ map: PX.T.glow, color: new THREE.Color(col).multiplyScalar(k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.setScalar(size); R.scene.add(s); ROOM.glows.push({ s, k, size, ph: hash(x * 7, y * 7, 9) * 10 }); return s;
};
ROOM.light = function (L, x, y, z) { L.position.set(x, y, z); L.layers.enableAll(); R.scene.add(L); return L; };
ROOM.shadowLight = function (L, size) {
  L.castShadow = true; L.shadow.mapSize.set(size, size); L.shadow.bias = -0.002; L.shadow.normalBias = 0.02; L.shadow.camera.layers.enable(1); return L;
};
ROOM.interact = function (id, x, y, z, r, use) { ROOM.inter.push({ id, x, y, z, r, use, p: new THREE.Vector3(x, y, z) }); };
/* ---------------------------------------------------------------- build */
ROOM.build = function () {
  const T = PX.T, X0 = ROOM.X0, X1 = ROOM.X1, CE = ROOM.CEIL;
  /* shell */
  const wall = (x0, x1, y0, y1, tex) => { const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0); ROOM.planarUV(g, tex); return ROOM.add(new THREE.Mesh(g, ROOM.std(tex, { rough: 0.92 })), { cast: false }); };
  wall(X0, X1, 1.25, CE, T.wall); wall(X0, X1, 0, 1.25, T.wainscot);
  for (const [x, s] of [[X0, 1], [X1, -1]]) { for (const [y0, y1, tx] of [[1.25, CE, T.wall], [0, 1.25, T.wainscot]]) { const g = new THREE.PlaneGeometry(9, y1 - y0); g.rotateY(s * Math.PI / 2); g.translate(x, (y0 + y1) / 2, 4.5); ROOM.planarUV(g, tx); ROOM.add(new THREE.Mesh(g, ROOM.std(tx, { rough: 0.92 })), { cast: false }); } }
  { const g = new THREE.PlaneGeometry(X1 - X0, 10); g.rotateX(-Math.PI / 2); g.translate((X0 + X1) / 2, 0, 5); ROOM.planarUV(g, T.floor);
    ROOM.floorMat = ROOM.reflective(T.floor); ROOM.add(new THREE.Mesh(g, ROOM.floorMat), { cast: false, layer: 2 }); }
  { const g = new THREE.PlaneGeometry(X1 - X0, 5); g.rotateX(Math.PI / 2); g.translate((X0 + X1) / 2, CE, 2.5); ROOM.planarUV(g, T.ceiling); ROOM.add(new THREE.Mesh(g, ROOM.std(T.ceiling)), { cast: false }); }
  for (let x = X0 + 1.2; x < X1; x += 2.6) ROOM.box(x - 0.14, x + 0.14, CE - 0.3, CE, 0, 5, T.beam, { cast: false });
  ROOM.box(X0, X1, CE - 0.42, CE, 4.6, 5.0, T.beam, { cast: false });
  ROOM.box(X0, X1, CE - 0.16, CE - 0.02, 0, 0.12, T.beam, { cast: false });

  /* fireplace, centred at x = 1.4 */
  const FX = 1.4;
  ROOM.box(FX - 1.3, FX + 1.3, 0, 0.1, 0, 1.15, T.brick);
  const ff = ROOM.card(T.fireFront, FX, 0.1, 0.86, { cast: true }); ff.material = ROOM.std(T.fireFront, { alpha: true, rough: 0.9, col: 0xc8bcac });
  ROOM.box(FX - 1.15, FX - 1.05, 0.1, 1.85, 0, 0.86, T.brick); ROOM.box(FX + 1.05, FX + 1.15, 0.1, 1.85, 0, 0.86, T.brick);
  ROOM.box(FX - 1.05, FX + 1.05, 1.7, 1.85, 0, 0.86, T.brick);
  ROOM.box(FX - 1.05, FX + 1.05, 0.1, 1.7, 0, 0.06, T.soot, { cast: false });
  ROOM.box(FX - 0.62, FX - 0.56, 0.1, 1.4, 0, 0.86, T.soot); ROOM.box(FX + 0.56, FX + 0.62, 0.1, 1.4, 0, 0.86, T.soot);
  ROOM.box(FX - 1.32, FX + 1.32, 1.85, 2.02, 0, 1.06, T.brick, { col: 0xe0d6c6 });
  ROOM.box(FX - 1.15, FX + 1.15, 2.02, 2.9, 0, 0.88, T.brick, { taper: [0.57, 0.68] });
  ROOM.box(FX - 0.66, FX + 0.66, 2.9, CE, 0, 0.6, T.brick);
  ROOM.card(T.crest, FX, 3.05, 0.61, { cast: false });
  ROOM.card(T.logs, FX, 0.1, 0.42, { cast: false });
  ROOM.fireMesh = ROOM.flame(FX, 0.2, 0.46, 0.85, true);
  ROOM.card(T.grate, FX, 0.1, 0.74, { cast: false });
  ROOM.glow(FX, 0.55, 0.7, 2.2, 0xff7a2a, 0.45);
  ROOM.card(T.vase, FX + 0.85, 2.02, 0.55); ROOM.card(T.bottle, FX + 0.62, 2.02, 0.5);
  ROOM.card(T.candles, FX - 1.12, 0.1, 1.05); ROOM.card(T.books, FX - 0.75, 0.1, 1.0); ROOM.card(T.candles, FX + 1.05, 0.1, 1.0);
  for (const [x, y] of [[FX - 1.27, 0.38], [FX - 1.15, 0.5], [FX - 1.02, 0.32], [FX + 0.9, 0.38], [FX + 1.02, 0.5], [FX + 1.15, 0.32]]) ROOM.flame(x, y, 1.06, 0.35);
  ROOM.lights.fire = ROOM.shadowLight(ROOM.light(new THREE.PointLight(0xff8a3c, 11, 0, 2), FX, 0.55, 1.3), R.q === 'low' ? 256 : 512);
  ROOM.lights.fire.shadow.camera.near = 0.2;
  ROOM.interact('fire', FX, 2.3, ROOM.KZ, 1.3);

  /* the four-poster bed, head at the window end */
  const B0 = -9.4, B1 = -6.0, BZ0 = 0.25, BZ1 = 2.05, BT = 3.45;
  for (const [x, z] of [[B0, BZ0], [B1, BZ0], [B0, BZ1], [B1, BZ1]]) { ROOM.box(x - 0.08, x + 0.08, 0, BT, z - 0.08, z + 0.08, T.woodPost, { rough: 0.6 }); ROOM.box(x - 0.11, x + 0.11, 0, 0.5, z - 0.11, z + 0.11, T.woodPost); }
  ROOM.box(B0, B1, BT, BT + 0.12, BZ0 - 0.1, BZ1 + 0.1, T.woodPost);
  ROOM.box(B0 + 0.05, B1 - 0.05, BT + 0.12, BT + 0.2, BZ0, BZ1, T.teal, { col: 0xa8d8d0 });
  ROOM.card(T.valance, (B0 + B1) / 2, BT - 0.3, BZ1 + 0.11, { w: B1 - B0 + 0.24, h: 0.41, ru: (B1 - B0 + 0.24) * PX.D / 64 });
  ROOM.card(T.valance, B1 + 0.11, BT - 0.3, (BZ0 + BZ1) / 2, { w: BZ1 - BZ0 + 0.2, h: 0.41, ru: (BZ1 - BZ0 + 0.2) * PX.D / 64, ry: Math.PI / 2 });
  ROOM.box(B0, B1, 0.18, 0.45, BZ0, BZ1, T.woodRed);
  ROOM.box(B0 + 0.05, B1 - 0.05, 0.45, 0.8, BZ0 + 0.02, BZ1 - 0.02, T.quilt, { rough: 0.95 });
  ROOM.box(B0 + 0.05, B1 - 0.05, 0.25, 0.8, BZ1 - 0.02, BZ1 + 0.03, T.quilt, { rough: 0.95, cast: false });
  ROOM.box(B0 + 0.12, B0 + 0.62, 0.8, 1.0, BZ0 + 0.15, BZ0 + 0.85, T.linen); ROOM.box(B0 + 0.12, B0 + 0.62, 0.8, 1.0, BZ0 + 0.95, BZ1 - 0.15, T.linen);
  ROOM.box(B0 - 0.06, B0 + 0.04, 0.4, 1.7, BZ0, BZ1, T.woodRed);
  ROOM.box(B0 - 0.1, B1 + 0.1, 0.9, BT, 0.03, 0.08, T.teal, { col: 0x7ab0aa, cast: false });
  ROOM.card(T.goldCurtain, B0 + 0.28, 0, BZ1 + 0.04, { h: BT - 0.05, w: 0.7 });
  ROOM.card(T.goldCurtain, B1 - 0.28, 0, BZ1 + 0.04, { h: BT - 0.05, w: 0.7 });
  ROOM.card(T.goldCurtain, B1 + 0.05, 0, BZ0 + 0.35, { h: BT - 0.05, w: 0.6, ry: Math.PI / 2 });
  ROOM.interact('bed', -7.0, 1.5, ROOM.KZ, 1.1);

  /* window by the bed head, with the evening sun */
  ROOM.card(T.window, -10.55, 0.9, 0.04, { basic: true, k: 1.55, cast: false });
  ROOM.glow(-10.55, 2.4, 0.3, 2.6, 0xffc070, 0.22);
  ROOM.lights.sun = ROOM.shadowLight(ROOM.light(new THREE.SpotLight(0xffc27a, 210, 0, 0.75, 0.75, 2), -10.6, 3.4, 0.35), R.q === 'low' ? 512 : 1024);
  ROOM.lights.sun.target.position.set(-7.6, 0.3, 2.2); R.scene.add(ROOM.lights.sun.target);
  ROOM.shafts = [];
  for (const [o, w, a] of [[0, 1.3, 0.34], [0.55, 0.8, 0.22], [-0.4, 0.55, 0.18]]) {
    const g = new THREE.PlaneGeometry(w, 5.4); g.translate(0, -2.7, 0);
    const m = new THREE.MeshBasicMaterial({ map: T.shaft, color: new THREE.Color(0xffc887).multiplyScalar(a), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide });
    const me = new THREE.Mesh(g, m); me.position.set(-10.55 + o, 3.2, 0.5 + o * 0.5); me.rotation.set(-0.35, 0.15, 0.62); R.scene.add(me); ROOM.shafts.push({ me, a, ph: o * 9 });
  }
  ROOM.card(T.plant, -11.15, 0, 0.6, { s: 0.85 });
  ROOM.interact('window', -10.1, 2.2, ROOM.KZ, 1.0);

  /* chest at the bed foot */
  ROOM.box(-5.1, -3.95, 0, 0.6, 1.55, 2.15, T.woodDark, { front: ROOM.std(T.chest) });
  ROOM.box(-5.13, -3.92, 0.6, 0.68, 1.52, 2.18, T.woodPost);
  ROOM.interact('chest', -4.5, 1.25, ROOM.KZ, 0.8);

  /* vanity with its teal glass, the chair */
  ROOM.box(-3.85, -2.35, 0, 0.8, 0.02, 0.58, T.woodDark, { front: ROOM.std(T.vanity) });
  ROOM.box(-3.9, -2.3, 0.8, 0.86, 0, 0.62, T.woodPost);
  { const g = new THREE.PlaneGeometry(0.74, 0.62); g.translate(-3.1, 1.24, 0.08); ROOM.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: T.teal, color: 0x9ae0d8, roughness: 0.15, metalness: 0.3 })), { cast: false }); }
  ROOM.box(-3.5, -2.7, 0.86, 0.9, 0.02, 0.12, T.woodPost); ROOM.box(-3.5, -2.7, 1.55, 1.6, 0.02, 0.12, T.woodPost); ROOM.box(-3.5, -3.45, 0.86, 1.6, 0.02, 0.12, T.woodPost); ROOM.box(-2.75, -2.7, 0.86, 1.6, 0.02, 0.12, T.woodPost);
  ROOM.card(T.vase, -2.55, 0.86, 0.35, { s: 0.9 }); ROOM.card(T.candle, -3.65, 0.86, 0.35); ROOM.flame(-3.65, 1.14, 0.355, 0.3);
  ROOM.card(T.chair, -1.05, 0, 0.9);
  ROOM.interact('vanity', -3.1, 1.85, ROOM.KZ, 0.9);

  /* plant and urn by the hearth */
  ROOM.card(T.plant, -0.3, 0, 0.55); ROOM.card(T.urn, 0.0, 0, 0.95);

  /* right of the hearth: cabinet with fruit, trunk, table, the standing mirror */
  ROOM.box(2.85, 3.6, 0, 0.92, 0.05, 0.55, T.woodRed, { front: ROOM.std(T.cabinet) });
  ROOM.box(2.8, 3.65, 0.92, 0.98, 0.02, 0.6, T.woodPost);
  ROOM.card(T.bowl, 3.22, 0.98, 0.3); ROOM.card(T.candle, 2.95, 0.98, 0.3); ROOM.flame(2.95, 1.26, 0.305, 0.3);
  ROOM.interact('cabinet', 3.22, 1.75, ROOM.KZ, 0.8);
  ROOM.box(3.75, 4.75, 0, 0.7, 0.1, 0.7, T.woodDark, { front: ROOM.std(T.chest) });
  { const g = new THREE.CylinderGeometry(0.3, 0.3, 1.0, 10, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); g.translate(4.25, 0.7, 0.4); ROOM.planarUV(g, T.woodPost); ROOM.add(new THREE.Mesh(g, ROOM.std(T.woodPost))); }
  ROOM.card(T.candelabra, 4.95, 0, 0.25, { s: 1.6 }); for (const [x, y] of [[4.55, 0.9], [4.95, 1.22], [5.35, 0.9]]) ROOM.flame(x, y + 0.02, 0.255, 0.3);
  ROOM.box(5.4, 7.5, 0.78, 0.86, 0.35, 1.25, T.woodRed);
  for (const x of [5.55, 7.35]) for (const z of [0.45, 1.15]) ROOM.box(x - 0.05, x + 0.05, 0, 0.78, z - 0.05, z + 0.05, T.woodPost);
  ROOM.card(T.jug, 5.9, 0.86, 0.85); ROOM.card(T.goblet, 6.25, 0.86, 0.9); ROOM.card(T.goblet, 6.55, 0.86, 0.75);
  ROOM.card(T.candle, 6.95, 0.86, 0.85); ROOM.card(T.candle, 7.12, 0.86, 0.75, { h: 0.22 }); ROOM.flame(6.95, 1.14, 0.855, 0.3); ROOM.flame(7.12, 1.08, 0.755, 0.3);
  ROOM.card(T.chair, 5.05, 0, 0.5, { s: 0.95 });
  ROOM.interact('table', 6.4, 1.55, ROOM.KZ, 1.0);
  ROOM.card(T.mirror, 8.0, 0, 1.35, { ry: -0.25 });
  ROOM.interact('mirror', 8.0, 2.2, ROOM.KZ, 0.9);
  ROOM.light(new THREE.PointLight(0xffa860, 2.2, 0, 2), 6.9, 1.25, 1.3);
  ROOM.light(new THREE.PointLight(0xffa860, 1.4, 0, 2), 4.95, 1.3, 0.5);

  /* the far end: door on toward the throne room */
  ROOM.card(T.door, 10.4, 0, 0.03, { cast: false });
  ROOM.interact('door', 10.4, 2.4, ROOM.KZ, 1.0);

  /* walls: hangings, paintings, drapes, sconces */
  ROOM.card(T.folk, -0.35, 2.45, 0.03, { cast: false }); ROOM.card(T.landscape, 3.15, 2.5, 0.03, { cast: false }); ROOM.card(T.lace, 5.55, 2.35, 0.03, { cast: false });
  ROOM.card(T.swan, 7.2, 2.4, 0.03, { cast: false }); ROOM.card(T.lattice, 9.0, 2.35, 0.03, { cast: false }); ROOM.card(T.folk, -5.0, 2.45, 0.03, { cast: false, s: 0.8 });
  for (const x of [-4.55, -1.65, 4.45, 7.95]) ROOM.card(T.curtain, x, CE - 0.15 - 2.65, 0.12, { h: 2.65, w: 0.62, cast: false });
  for (const [a, b] of [[-4.55, -1.65], [-1.65, 0.6], [2.2, 4.45], [4.45, 7.95], [7.95, 10.9]]) ROOM.card(T.swag, (a + b) / 2, CE - 0.15 - 0.65, 0.16, { w: b - a, h: 0.65, cast: false });
  for (const x of [-2.5, 6.5, 11.25]) {
    ROOM.card(T.sconce, x, 1.95, 0.05, { cast: false }); ROOM.flame(x, 2.18, 0.12, 0.6); ROOM.glow(x, 2.38, 0.2, 1.2, 0xffa050, 0.7);
    ROOM.light(new THREE.PointLight(0xffa050, 7, 0, 2), x, 2.5, 0.45);
  }

  /* rugs (no reflection on them, they stay matte) */
  const rug = (tex, x0, x1, z0, z1) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0.006, (z0 + z1) / 2); ROOM.add(new THREE.Mesh(g, ROOM.std(tex, { rough: 1 })), { cast: false, layer: 2 }); };
  rug(T.rugA, -2.2, 3.8, 1.6, 3.85); rug(T.rugB, 4.9, 7.9, 1.45, 2.7);

  /* foreground: posts and a candle table close to the lens, for the depth of field to chew on */
  ROOM.box(-7.7, -7.42, 0, CE, 6.2, 6.48, T.woodPost, { cast: false });
  ROOM.box(10.6, 10.88, 0, CE, 6.0, 6.28, T.woodPost, { cast: false });
  ROOM.box(-11.2, -8.6, 0.45, 0.55, 6.8, 7.8, T.woodRed, { cast: false });
  ROOM.card(T.candles, -9.6, 0.55, 7.2, { s: 1.6, cast: false }); ROOM.flame(-9.76, 1.07, 7.21, 0.6); ROOM.flame(-9.48, 1.2, 7.21, 0.6);
  ROOM.glow(-9.6, 1.3, 7.25, 1.0, 0xffa050, 0.6);

  /* light */
  ROOM.light(new THREE.HemisphereLight(0x7a6068, 0x3a2418, 2.3), 0, 4, 0);
  const fill = ROOM.light(new THREE.DirectionalLight(0xc0b0d0, 0.95), 2, 4, 14); fill.target.position.set(0, 1.2, 0); R.scene.add(fill.target);
  ROOM.motes();
};
/* the glossy floor: standard material + the mirrored scene, blurred along the view's vertical, faded with fresnel */
ROOM.reflective = function (tex) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, R.reflU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uTexMat; varying vec4 vRefl; varying vec3 vWP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvec4 wp4 = modelMatrix * vec4(transformed, 1.0); vRefl = uTexMat * wp4; vWP = wp4.xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tRefl; uniform float uReflK; uniform vec2 uReflRes; varying vec4 vRefl; varying vec3 vWP;')
      .replace('#include <opaque_fragment>', `
        { vec2 ruv = vRefl.xy / vRefl.w; float seam = texture2D(map, vMapUv).r;
          vec2 px = 1.0 / uReflRes; float ripple = (seam - 0.15) * 0.012;
          ruv.x += ripple;
          vec3 rc = texture2D(tRefl, ruv).rgb * 0.3 + (texture2D(tRefl, ruv + vec2(0.0, px.y * 2.0)).rgb + texture2D(tRefl, ruv - vec2(0.0, px.y * 2.0)).rgb) * 0.22
                  + (texture2D(tRefl, ruv + vec2(px.x, px.y * 5.0)).rgb + texture2D(tRefl, ruv - vec2(px.x, px.y * 5.0)).rgb) * 0.13;
          vec3 V = normalize(cameraPosition - vWP); float fres = 0.35 + 0.65 * pow(1.0 - max(V.y, 0.0), 3.0);
          outgoingLight += rc * uReflK * fres * smoothstep(0.02, 0.09, seam); }
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'reflfloor';
  return m;
};
/* dust in the sunbeam, embers over the fire, and a few big motes near the lens that the DOF turns into bokeh */
ROOM.motes = function () {
  const N = R.q === 'low' ? 60 : 130, pos = new Float32Array(N * 3), seed = new Float32Array(N), kind = [];
  for (let i = 0; i < N; i++) { const r = rng(i * 31 + 5); seed[i] = r() * 100; kind.push(i < N * 0.55 ? 0 : i < N * 0.8 ? 1 : 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: PX.T.mote, size: 0.05, color: new THREE.Color(0xffd8a0).multiplyScalar(1.8), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, sizeAttenuation: true });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; R.scene.add(pts);
  const ember = new THREE.PointsMaterial({ map: PX.T.mote, size: 0.04, color: new THREE.Color(0xff7a2a).multiplyScalar(4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const NE = 26, epos = new Float32Array(NE * 3), eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(epos, 3));
  const ep = new THREE.Points(eg, ember); ep.frustumCulled = false; R.scene.add(ep);
  ROOM.tick.push((t) => {
    for (let i = 0; i < N; i++) { const s = seed[i], k = kind[i]; let x, y, z;
      if (k === 0) { x = -10.6 + ((s * 0.37 + t * 0.05) % 4.6); y = 0.4 + ((s * 0.51 + Math.sin(t * 0.3 + s) * 0.3) % 3.0); z = 0.5 + (s * 0.73 % 3.0); y += Math.sin(t * 0.7 + s * 3) * 0.08; }
      else if (k === 1) { x = -9 + (s * 1.7 % 20); y = 0.6 + (s * 0.41 % 3.2) + Math.sin(t * 0.4 + s) * 0.1; z = 1 + (s * 0.29 % 2.5); }
      else { x = -9 + (s * 2.3 % 20) + Math.sin(t * 0.2 + s) * 0.3; y = 0.4 + (s * 0.61 % 2.4) + Math.sin(t * 0.3 + s * 2) * 0.15; z = 5.2 + (s * 0.37 % 2.6); }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; }
    g.attributes.position.needsUpdate = true;
    for (let i = 0; i < NE; i++) { const life = 2.4, ph = ((t + i * 0.37 * life / 2.6) % life) / life, s = i * 7.1;
      epos[i * 3] = 1.4 + Math.sin(s) * 0.5 + Math.sin(t * 2 + s) * 0.08 * ph; epos[i * 3 + 1] = 0.4 + ph * 1.2; epos[i * 3 + 2] = 0.95 + Math.cos(s) * 0.1 + ph * 0.25; }
    eg.attributes.position.needsUpdate = true;
  });
};
ROOM.update = function (t, dt) {
  for (const f of ROOM.flames) { const fr = Math.floor(t * f.rate + f.ph) % f.n; f.t.offset.x = fr / f.n; }
  const fl = 0.82 + 0.22 * noise1(t * 7.3, 1) + 0.1 * noise1(t * 17.1, 2);
  if (ROOM.lights.fire) ROOM.lights.fire.intensity = 11 * fl;
  for (const g of ROOM.glows) g.s.scale.setScalar(g.size * (0.92 + 0.12 * noise1(t * 5 + g.ph, 3)));
  for (const s of ROOM.shafts || []) s.me.material.opacity = 0.8 + 0.2 * Math.sin(t * 0.4 + s.ph);
  for (const f of ROOM.tick) f(t, dt);
};
