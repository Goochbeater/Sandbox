/* CHAPTER I · part 1 — THE WORKS. Sidious' hidden training hall in Coruscant's industrial district: a derelict
   foundry with window walls onto the night city. Maul proves himself against Trade Federation droids. */
const HOLO = {};
HOLO.mat = function (col) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color(col || 0x5aa0ff) }, uA: { value: 1 } },
    vertexShader: 'varying vec3 vW; varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT, uA; uniform vec3 uCol; varying vec3 vW; varying vec3 vN; varying vec3 vV;
      float h(float n){ return fract(sin(n)*43758.5453); }
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float scan = 0.6 + 0.4 * sin(vW.y * 90.0 - uT * 8.0);
        float flick = 0.85 + 0.15 * h(floor(uT * 24.0)); float band = step(0.97, fract(vW.y * 1.3 - uT * 0.7)) * 0.6;
        vec3 c = uCol * (0.25 + 1.4 * pow(f, 1.6)) * scan * flick + uCol * band;
        gl_FragColor = vec4(c * uA, 1.0); }` });
};
/* a hooded, cloaked figure (Sidious) as a hologram */
HOLO.sidious = function (x, y, z, scale) {
  const g = new THREE.Group(), m = HOLO.mat(0x6aa8ff);
  const robe = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0], [0.52, 0], [0.5, 0.12], [0.44, 0.5], [0.36, 0.95], [0.31, 1.25], [0.36, 1.38], [0.3, 1.47], [0.12, 1.52], [0, 1.53]].map((p) => new THREE.Vector2(p[0], p[1])), 32), m);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.2, 22, 16, -2.2, 4.4, 0, 2.3), m); hood.position.set(0, 1.62, 0.0); hood.scale.set(1, 1.1, 1.25); hood.rotation.y = PI;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), HOLO.mat(0x10254a)); face.position.set(0, 1.58, 0.05);
  const drape = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 20, 1, true), m); drape.position.set(0, 1.35, -0.02);
  for (const s of [1, -1]) { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.46, 12), m); sl.position.set(s * 0.13, 1.0, 0.2); sl.rotation.set(1.25, 0, s * 0.5); g.add(sl); }
  g.add(robe, hood, face, drape);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 0.05, 32), HOLO.mat(0x6aa8ff)); beam.position.y = -0.02; g.add(beam);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.9, 2.2, 24, 1, true), HOLO.mat(0x3a70d0)); cone.position.y = 1.1; cone.material.uniforms.uA.value = 0.07; g.add(cone);
  g.position.set(x, y, z); g.scale.setScalar(scale || 1.6);
  g.userData.mats = [m, face.material, beam.material, cone.material];
  g.userData.tick = (t) => { for (const mm of g.userData.mats) mm.uniforms.uT.value = t; g.position.x = x + (Math.random() < 0.02 ? 0.03 : 0); };
  return g;
};
LEVEL.def('works', {
  chapter: 'CHAPTER I', name: 'THE WORKS', world: 'coruscant', cast: ['obiwan', 'quigon', 'darsha'],
  tex: ['sithFloor', 'metalPanel', 'duracrete', 'towerWin', 'grate'],
  start: [0, 0.3, -7, PI],
  checkpoints: [[0, 0.3, -7, 0], [0, 0.3, 2, 0]],
  killY: -30,
  async build(L) {
    const floor = TEX.mat('sithFloor', { emisCol: 0xff2010, emisI: 1.2, env: 1.0, rough: 0.3, refl: 0.8 }), wall = TEX.mat('metalPanel', { color: 0x9a9aa8, env: 0.6 }), dark = TEX.mat('metalPanel', { color: 0x4a4a55, env: 0.5 }),
      dura = TEX.mat('duracrete', { color: 0x8a8a96 }), grate = TEX.mat('grate', { env: 0.6 });
    const X = 18, Z0 = -14, Z1 = 22, H = 14;
    // floor + dais
    KIT.box(-X, -1, Z0, X, 0, Z1, floor);
    KIT.ring(0, -8, 0, 3.2, 0, 0.3, dark, { sides: 40 });
    KIT.ring(0, -8, 3.2, 3.45, 0, 0.12, KIT.emis(0xff1a0a, 5), { sides: 40, col: false });
    PHY.cyl(0, -8, 3.2, 0, 0.3);
    const frame = TEX.mat('metalPanel', { color: 0x34343c, metal: 0.55, env: 1.0, rough: 0.42 }), steelD = TEX.mat('metalPanel', { color: 0x4a4a54, env: 0.7, rough: 0.55 });
    // window walls: heavy steel frames and floor-to-roof glazing onto the city (the glass is an invisible collider)
    for (const s of [-1, 1]) {
      const xa = Math.min(s * X, s * (X + 0.6)), xb = Math.max(s * X, s * (X + 0.6));
      KIT.bbox(s * (X - 0.2), 0, Z0, s * (X + 0.9), 1.1, Z1, wall, { c: 0.06 });
      PHY.box(xa, 0, Z0, xb, H, Z1);
      for (let z = Z0; z <= Z1 + 0.01; z += 4) { KIT.bbox(s * (X - 0.4), 0, z - 0.34, s * (X + 0.55), H, z + 0.34, frame, { c: 0.09, col: false }); KIT.bbox(s * (X - 0.62), 1.1, z - 0.16, s * (X - 0.4), H - 0.9, z + 0.16, steelD, { c: 0.04, col: false }); }
      for (let z = Z0 + 2; z < Z1; z += 4) KIT.bbox(s * (X - 0.06), 1.1, z - 0.06, s * (X + 0.22), H, z + 0.06, frame, { c: 0.02, col: false });
      for (const y of [4.3, 8.3, 11.6]) KIT.bbox(s * (X - 0.18), y - 0.11, Z0, s * (X + 0.4), y + 0.11, Z1, frame, { c: 0.03, col: false });
      KIT.bbox(s * (X - 0.7), H - 0.9, Z0, s * (X + 0.7), H + 0.3, Z1, frame, { c: 0.08, col: false });
      // side catwalk at 4.2 m with a stair
      KIT.box(s * (X - 3.2), 4.0, -4, s * X, 4.2, 20, grate);
      for (let z = -4; z <= 20; z += 4) KIT.bbox(s * (X - 3.3), 3.55, z - 0.1, s * (X - 0.4), 4.0, z + 0.1, frame, { c: 0.03, col: false });
      KIT.rail([[s * (X - 3.2), -4], [s * (X - 3.2), 20]], 4.2, dark);
      KIT.stairs(s * (X - 3.2), -12.5, s * (X - 0.2), -4, 0, 4.2, 'z', dark);
    }
    // back wall: a great round window behind the holo alcove (Sidious' eye on the city)
    { const sh = new THREE.Shape(); sh.moveTo(-X - 0.6, 0); sh.lineTo(X + 0.6, 0); sh.lineTo(X + 0.6, H + 0.5); sh.lineTo(-X - 0.6, H + 0.5); sh.lineTo(-X - 0.6, 0);
      const hole = new THREE.Path(); hole.absarc(0, 7.6, 5.4, 0, TAU, true); sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false, curveSegments: 48 });
      KIT.geo(g, wall, new THREE.Matrix4().makeTranslation(0, 0, Z0 - 0.7), { worldUV: true }); PHY.box(-X, 0, Z0 - 0.7, X, H, Z0);
      const rim = (r, t) => KIT.geo(new THREE.TorusGeometry(r, t, 10, 64), frame, new THREE.Matrix4().makeTranslation(0, 7.6, Z0 - 0.3), { uvs: 8 });
      rim(5.4, 0.34); rim(2.3, 0.2); rim(0.6, 0.16);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; KIT.beam([Math.cos(a) * 0.6, 7.6 + Math.sin(a) * 0.6, Z0 - 0.3], [Math.cos(a) * 5.4, 7.6 + Math.sin(a) * 5.4, Z0 - 0.3], i % 3 ? 0.12 : 0.24, frame); }
      for (const s of [-1, 1]) { KIT.bbox(s * 6.6, 0, Z0 - 0.1, s * 7.6, H, Z0 + 0.5, frame, { c: 0.08, col: false }); KIT.bbox(s * 13, 0, Z0 - 0.1, s * 14, H, Z0 + 0.5, frame, { c: 0.08, col: false }); } }
    KIT.bbox(-4, 0, Z0, 4, 0.5, Z0 + 3, dark, { c: 0.08 });
    KIT.cyl(0, 0.5, Z0 + 1.5, 1.0, 0.15, KIT.emis(0x4a90ff, 2.5), { col: false });
    // front wall with the blast door opening (x -4..4, y 0..8)
    KIT.box(-X, 0, Z1, -4, H, Z1 + 0.6, wall); KIT.box(4, 0, Z1, X, H, Z1 + 0.6, wall); KIT.box(-4, 8, Z1, 4, H, Z1 + 0.6, wall);
    for (const s of [-1, 1]) { KIT.bbox(s * 4, 0, Z1 - 0.4, s * 4.8, 8.6, Z1 + 0.8, frame, { c: 0.1 }); for (const x of [8, 12.5, 16]) KIT.bbox(s * (x - 0.45), 0, Z1 - 0.35, s * (x + 0.45), H, Z1, frame, { c: 0.07, col: false }); }
    KIT.bbox(-4.8, 8, Z1 - 0.4, 4.8, 9, Z1 + 0.8, frame, { c: 0.1 });
    for (const y of [3.2, 10.5]) KIT.bbox(-X, y - 0.14, Z1 - 0.3, X, y + 0.14, Z1, frame, { c: 0.04, col: false });
    // roof: triangulated steel trusses every 6 m, dark decking and a cold skylight along the ridge
    KIT.box(-X, H + 0.3, Z0, X, H + 0.8, Z1, dark, { col: false });
    for (let z = Z0 + 3; z < Z1; z += 6) {
      const yt = H - 0.2, yb = H - 2.5;
      KIT.beam([-X, yt, z], [X, yt, z], 0.34, frame); KIT.beam([-X, yb, z], [X, yb, z], 0.3, frame);
      for (let i = 0; i <= 12; i++) { const x = -X + i * 3; KIT.beam([x, yb, z], [x, yt, z], 0.16, frame); if (i < 12) KIT.beam([x, i % 2 ? yt : yb, z], [x + 3, i % 2 ? yb : yt, z], 0.14, frame); }
      KIT.beam([-X, yb - 1.4, z], [-X + 3, yb, z], 0.26, frame); KIT.beam([X, yb - 1.4, z], [X - 3, yb, z], 0.26, frame);
    }
    for (let z = Z0; z < Z1; z += 6) KIT.box(-1.4, H + 0.25, z + 0.4, 1.4, H + 0.3, z + 5.6, KIT.emis(0x9fb4ff, 1.4), { col: false });
    for (const x of [-9, 9]) KIT.box(x - 0.6, H + 0.25, Z0, x + 0.6, H + 0.3, Z1, KIT.emis(0x6a7aa8, 0.8), { col: false });
    // pillars: bevelled shafts on plinths, corbels up into the trusses
    for (const x of [-11, 11]) for (const z of [-6, 4, 14]) {
      KIT.bbox(x - 0.7, 0, z - 0.7, x + 0.7, H - 2.5, z + 0.7, wall, { c: 0.14 }); KIT.bbox(x - 0.95, 0, z - 0.95, x + 0.95, 0.9, z + 0.95, frame, { c: 0.08, col: false });
      KIT.bbox(x - 0.85, H - 3.3, z - 0.85, x + 0.85, H - 2.5, z + 0.85, frame, { c: 0.08, col: false });
      for (const d of [0.72]) { KIT.bbox(x - d - 0.06, 1.2, z - 0.3, x - d + 0.02, H - 3.5, z + 0.3, frame, { c: 0.02, col: false }); KIT.bbox(x + d - 0.02, 1.2, z - 0.3, x + d + 0.06, H - 3.5, z + 0.3, frame, { c: 0.02, col: false }); }
      KIT.lamp(x, 3.2, z + 0.85, 0xff2a10, 3.5, 9, { size: 0.09 });
    }
    // inlaid ring around the training dais
    KIT.ring(0, -8, 5.8, 5.95, 0.001, 0.012, KIT.emis(0xff2010, 2.2), { sides: 64, col: false });
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; KIT.obox(Math.sin(a) * 4.6, 0.001, -8 + Math.cos(a) * 4.6, 0.03, 0.012, 1.1, a, KIT.emis(0xff2010, 1.6), { col: false }); }
    // cover: crates and machinery
    const crate = (x, z, w, h, d) => KIT.crate(x, z, w, h, d, dura, TEX.mat('metalPanel', { color: 0x3a3a42, metal: 0.6, rough: 0.45, env: 0.8 }), { lamp: 0xff2a10 });
    crate(-6, 8, 2, 1.3, 1.4); crate(7, 12, 1.6, 1.1, 1.6); crate(-8.5, 17, 2.4, 2.2, 2); crate(5, 0, 1.2, 0.9, 1.2); crate(8.5, -9, 2, 1.6, 2);
    // wall strip lights (cool) along the lower band + back wall uplights
    for (const sx of [-1, 1]) for (let z = Z0 + 4; z < Z1 - 2; z += 8) { KIT.box(sx * (X - 0.06), 2.6, z - 1.2, sx * (X - 0.02), 2.75, z + 1.2, KIT.emis(0xb8c4ff, 3), { col: false }); KIT.lamp(sx * (X - 0.8), 2.5, z, 0x9fb0ff, 2.2, 7, { fixture: false }); }
    for (const [x, z, c] of [[-14, -8, 0xff6a3a], [14, 6, 0x8aa0ff], [-14, 14, 0x8aa0ff], [14, 18, 0xff6a3a]]) KIT.lamp(x, 7.5, z, c, 5, 14, { fixture: false });
    for (const x of [-8, 8]) { KIT.box(x - 1.5, 0.05, Z0 + 0.05, x + 1.5, 0.2, Z0 + 0.25, KIT.emis(0xff3a20, 4), { col: false }); KIT.lamp(x, 1.2, Z0 + 1, 0xff3a20, 3, 9, { fixture: false }); }
    // industrial dressing: tanks, pipe runs, a gantry crane, hanging chains
    const steel = TEX.mat('metalPanel', { color: 0x8a8e96, metal: 0.6, env: 1.0 }), rust = TEX.mat('metalPanel', { color: 0x7a5a48, env: 0.5 });
    for (const [x, z, r, h] of [[-15.5, -11, 1.6, 7], [-15.5, -7.2, 1.2, 5.5], [15.5, 20, 1.5, 6.5]]) { KIT.cyl(x, 0, z, r, h, rust, { seg: 28 }); for (let y = 1; y < h; y += 1.6) KIT.cyl(x, y, z, r + 0.06, 0.12, steel, { col: false, seg: 28 }); KIT.cyl(x, h, z, r * 0.6, 0.6, steel, { col: false }); }
    for (const sx of [-1, 1]) for (const y of [9.2, 9.8]) KIT.geo(new THREE.CylinderGeometry(0.18, 0.18, Z1 - Z0, 12), steel, new THREE.Matrix4().compose(V3(sx * (X - 0.5), y + (sx > 0 ? 0 : 0.3), (Z0 + Z1) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(HALF, 0, 0)), V3(1, 1, 1)), { uvs: 1, uvs2: 12 });
    const gz = 6; KIT.box(-X, 11.4, gz - 0.5, X, 12.2, gz + 0.5, steel, { col: false }); KIT.box(-1.2, 10.6, gz - 0.7, 1.2, 11.4, gz + 0.7, rust, { col: false });
    for (let i = 0; i < 6; i++) { const cz = gz + (i - 2.5) * 0.18; KIT.box(-0.03, 5.2 + i * 0.1, cz - 0.03, 0.03, 10.6, cz + 0.03, steel, { col: false }); }
    KIT.box(-0.9, 4.6, gz - 0.9, 0.9, 5.3, gz + 0.9, rust, { col: false });   // the hook block
    for (const [x, z] of [[-8, -12], [9, 8], [-4, 19]]) { for (let k = 0; k < 16; k++) { const y = H - 0.5 - k * 0.45; KIT.geo(new THREE.TorusGeometry(0.08, 0.02, 5, 8), steel, new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, k % 2 ? HALF : 0, 0)), V3(1, 1.6, 1))); } }
    // welding sparks spilling from the gantry
    L.updates.push((dt) => { if (RNG() < dt * 3) { const p = V3(rnd(-8, 8), 11.3, gz + rnd(-0.4, 0.4)); FX.spark(p, V3(0, -1, 0), 6, 2.5, [4, 2.4, 1.2], 1.1); FX.flashLight(p, [1, 0.6, 0.3], 3, 6, 0.08); } });
    // hanging red lamps
    for (const [x, z] of [[-5, -2], [5, -2], [-5, 10], [5, 10], [0, 18]]) { KIT.box(x - 0.02, H - 3.2, z - 0.02, x + 0.02, H - 0.9, z + 0.02, dark, { col: false }); KIT.lamp(x, H - 3.4, z, 0xff4a28, 7, 15, { size: 0.16 }); }
    L.holoLight = KIT.lamp(0, 2.5, Z0 + 1.5, 0x4a90ff, 0, 8, { fixture: false });
    // door
    L.door = LEVEL.door(-4, 0, Z1 - 0.1, 4, 8, Z1 + 0.5, TEX.mat('metalPanel', { color: 0x6a6a74 }));
    { const dm = L.door.m, rib = TEX.mat('metalPanel', { color: 0x3a3a44 }), seam = KIT.emis(0xff2a10, 4), amber = new THREE.MeshStandardMaterial({ color: 0xc88a20, roughness: 0.6 });
      const add = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; dm.add(b); };
      add(0.08, 7.6, 0.06, 0, 0, -0.33, seam);
      for (const y of [-2.6, 0.2, 2.8]) add(7.6, 0.35, 0.12, 0, y, -0.36, rib);
      for (let i = 0; i < 9; i++) add(0.45, 0.5, 0.05, -3.6 + i * 0.9, -3.55, -0.33, i % 2 ? rib : amber); }
    // outside: the city
    SKY.coruscant(L, { r0: 105, n: 1000, base: -55, fog: 0.0026, sunDir: V3(-1, 0.07, 0.25), keepOut: [[-260, 20, 215, 95]] });
    // light rig: cool city glow through the windows + dim red fill
    R.setSun(new THREE.Vector3(-0.8, 0.3, 0.2), 0xffa060, 2.6, 0x9a88a8, 0x6a3428, 1.35);
    R.G.exposure = 1.5; R.G.gShadow.setRGB(0.92, 0.95, 1.08); R.G.gHigh.setRGB(1.06, 1.0, 0.92);
    R.setShadowBox(24, 140); R.G.vol = 1.4; R.G.volDen = 0.035; R.G.volFall = 0.03; R.G.volOut = 0.0; R.G.volG = 0.6; R.G.volMax = 50; R.G.ssr = 1.0; R.G.ssrMax = 35;
    // industrial sconces high on the end walls so the upper hall never falls to a black void
    for (const z of [Z0 + 0.1, Z1 - 0.1]) for (const x of [-12, -4, 4, 12]) { const zz = z < 0 ? z + 0.35 : z - 0.35; KIT.box(x - 0.5, 8.6, zz - 0.25, x + 0.5, 8.75, zz + 0.25, dark, { col: false }); KIT.box(x - 0.45, 8.5, zz - 0.2, x + 0.45, 8.6, zz + 0.2, KIT.emis(0xffb070, 3), { col: false }); KIT.lamp(x, 8.2, zz, 0xffa060, 3.5, 12, { fixture: false }); }
    // interior env: the window walls as bright panels so steel and the floor pick up reflections
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(sx < 0 ? 1.1 : 0.4, sx < 0 ? 0.55 : 0.3, sx < 0 ? 0.3 : 0.45), side: THREE.DoubleSide })); w.position.set(sx * 18, 7, 4); w.rotation.y = HALF; L.env.add(w); }
    { const f = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.12, 0.08), side: THREE.DoubleSide })); f.rotation.x = HALF; f.position.y = 13; L.env.add(f); } R.G.bloom = 0.22; R.G.tint.setRGB(1.02, 0.98, 1.0);
    // light shafts through the western windows + drifting dust
    const sd = V3(0.8, -0.3, -0.2).normalize();
    for (let z = Z0 + 2; z < Z1; z += 4) KIT.shaft(L, V3(-X + 0.2, 10.5, z), sd, 3.0, 15, 0xffa870, 0.03);
    L.updates.push((dt) => { if (RNG() < dt * 14) FX.puff(V3(rnd(-12, 8), rnd(0.5, 7), rnd(-12, 20)), 1, { add: true, size: 0.03, col: [0.8, 0.8, 1.0], a: 0.5, life: 5, spread: 0.08, rise: 0.02, drag: 0.1 }); });
    // Sidious hologram (hidden until he speaks)
    L.holo = HOLO.sidious(0, 0.65, Z0 + 1.5, 1.7); L.holo.visible = false; LEVEL.add(L.holo);
    L.updates.push((dt, t) => { L.holo.userData.tick(t); });
    HOLOCRON.place(L, [[16.2, 4.2, 18], [-8.5, 2.2, 17], [-16.2, 4.2, -2]]);
  },
  onStart(L, cp) {
    const say = (who, t, d, c) => HUD.sub(who, t, d, c);
    const holo = (on) => { L.holo.visible = on; L.holoLight.i = on ? 3 : 0; };
    HUD.obj('Prove yourself to your Master');
    const w3 = () => { HUD.hint(IN.keyLabel('push') + ' Force push  ·  ' + IN.keyLabel('grip') + ' Force grip  ·  ' + IN.keyLabel('throw') + ' saber throw  ·  ' + IN.keyLabel('heavy') + ' Dark Whirlwind breaks guards', 8);
      LEVEL.wave([['holojedi', -5, 12], ['holojedi', 5, 12], ['holojedi', 0, 17]], () => {
      holo(true); say('DARTH SIDIOUS', 'Good. The Jedi are only shadows to you now. But one of them is real, and she is hunting us.', 5.5, 'sid');
      MG.after(5.8, () => say('DARTH SIDIOUS', 'The Neimoidian Hath Monchar has sold our plans for Naboo. A Padawan, Darsha Assant, has been sent to find him.', 6, 'sid'));
      MG.after(12, () => say('DARTH SIDIOUS', 'Find them. Silence them both. Leave no one alive who knows.', 4, 'sid'));
      MG.after(16.2, () => { say('DARTH MAUL', 'Yes, my Master.', 2.5); holo(false); L.door.openIt(); HUD.obj('Hunt the Padawan through the Senate District'); HUD.hint('Exit through the blast door', 4); });
      LEVEL.checkpoint(1);
    }, { now: true, stagger: 0.8 }); };
    const w2 = () => { HUD.hint('Jedi block. Hold ' + IN.keyLabel('block') + ' as a blade flares to PARRY, then strike. Heavy attacks crack a guard.', 7); LEVEL.wave([['holojedi', -6, 12], ['holojedi', 6, 14]], () => {
      MG.after(2.5, w3);
    }, { now: true, stagger: 1.2 }); };
    const w1 = () => { HUD.hint(IN.keyLabel('attack') + ' strike · keep pressing for the five-hit combo  ·  ' + IN.keyLabel('lock') + ' lock on', 6); LEVEL.wave([['holojedi', 0, 10]], () => { HUD.hint(IN.keyLabel('jump') + ' jump · press again to Force flip · ' + IN.keyLabel('dodge') + ' dodge', 5); MG.after(2, w2); }, { now: true }); };
    if (cp >= 1) { L.door.openIt(); HUD.obj('Hunt the Padawan through the Senate District'); }
    else if (MG.skipIntro) w1();
    else {
      // intro: Maul kneels on the dais, the hologram speaks
      PLAYER.state = 'cine'; HUD.show(false);
      const a = PLAYER.a; a.play('kneel'); holo(true);
      // a wide crane down through the sunlit hall that settles on the kneeling apprentice
      CAM.play({ dur: 10, fov: 40, fn: (t, u) => { const v = clamp((u - 0.25) / 0.75, 0, 1), k = easeIO(clamp(u / 0.3, 0, 1));
        const cp2 = V3(2.6 - v * 1.2, 1.15 + v * 0.3, -3.6 - v * 0.6), cl = V3(-0.4 + v * 0.2, 1.4 + v * 0.2, -10.5 + v * 1.2);
        return { pos: V3(-3, 10.5, 16).lerp(cp2, k), look: V3(0, 3.5, -10).lerp(cl, k) }; } });
      HUD.toast('CORUSCANT', 'THE WORKS', 4);
      MG.after(3.7, () => say('DARTH SIDIOUS', 'Lord Maul. Before you go hunting, one final test.', 3.5, 'sid'));
      MG.after(7.1, () => say('DARTH SIDIOUS', 'Face the Jedi — or their shadows. Show me they are nothing.', 3.2, 'sid'));
      MG.after(10, () => { holo(false); PLAYER.state = 'move'; a.stop(0.3); a.yaw = 0; CAM.reset(0); HUD.show(true); w1(); });
    }
    // exit to the rooftops
    LEVEL.trigger(-4, 22.2, 4, 24, () => { if (L.door.open) GAME.next(); });
  },
});
