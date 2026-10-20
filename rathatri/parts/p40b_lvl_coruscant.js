/* CHAPTER I · parts 2–3 — the rooftops of Coruscant in the rain, and the Black Sun fortress (boss: Alexi Garyn). */
const COR = {};
/* rain: streaks falling around the camera */
COR.rain = function (L, n) {
  const N = n || 1600, P = new Float32Array(N * 6), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.LineBasicMaterial({ color: new THREE.Color(0.55, 0.6, 0.75), transparent: true, opacity: 0.35, depthWrite: false, fog: true });
  const lines = new THREE.LineSegments(g, m); lines.frustumCulled = false; LEVEL.add(lines);
  const seeds = []; for (let i = 0; i < N; i++) seeds.push([rnd(-18, 18), rnd(0, 22), rnd(-18, 18)]);
  L.updates.push((dt, t) => {
    const c = R.camera.position;
    for (let i = 0; i < N; i++) { const s = seeds[i]; s[1] -= dt * 24; if (s[1] < -6) s[1] += 28; const x = c.x + ((s[0] - c.x * 0.0) % 36 + 36) % 36 - 18, z = c.z + ((s[2]) % 36 + 36) % 36 - 18, y = c.y + s[1] - 8;
      P[i * 6] = x; P[i * 6 + 1] = y; P[i * 6 + 2] = z; P[i * 6 + 3] = x + 0.05; P[i * 6 + 4] = y - 0.55; P[i * 6 + 5] = z + 0.03; }
    g.attributes.position.needsUpdate = true;
    // splashes on the ground round Maul
    const PL = PLAYER.a; if (PL && PL.grounded) for (let k = 0; k < 3; k++) if (RNG() < dt * 14) FX.puff(V3(PL.x + rnd(-7, 7), PL.y + 0.03, PL.z + rnd(-7, 7)), 1, { size: 0.05, grow: 3.5, col: [0.55, 0.6, 0.7], a: 0.45, life: 0.28, spread: 0.3, rise: 0.4, drag: 3 });
  });
};
/* skyscraper facade (non-instanced KIT geometry): the city's lit-window texture projected in world space, ledges + piers */
COR.facadeMat = function (seed) {
  const key = 'facade' + seed; if (COR[key]) return COR[key];
  const set = TEX.sets.towerWin;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: set.map, emissiveMap: set.emissiveMap, emissive: new THREE.Color(1.0, 0.85, 0.7), emissiveIntensity: 1.6, roughness: 0.35, metalness: 0.3, envMapIntensity: 0.8 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <map_fragment>', `vec2 wuv = (abs(vWN.x) > 0.5 ? vWP.zy : vWP.xy) / 24.0 + vec2(${(seed * 0.37).toFixed(2)}, ${(seed * 0.71).toFixed(2)});
        vec4 texelColor = texture2D(map, wuv);
        float fy = fract(vWP.y / 7.0), ledge = step(0.86, fy);
        float fx = fract((abs(vWN.x) > 0.5 ? vWP.z : vWP.x) / 6.0 + ${(seed * 0.13).toFixed(2)}), pier = step(0.84, fx);
        float solid = max(ledge, pier);
        diffuseColor.rgb *= mix(texelColor.rgb, vec3(0.12, 0.115, 0.12), solid);`)
      .replace('#include <emissivemap_fragment>', `vec3 em = texture2D(emissiveMap, wuv).rgb * (1.0 - solid) * smoothstep(-70.0, -8.0, vWP.y + 0.0) ; em += vec3(1.4, 0.7, 0.4) * step(0.975, fy) * 0.6;
        totalEmissiveRadiance *= em;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.12, 0.6, solid);');
  };
  m.customProgramCacheKey = () => key; m.userData.tscale = 6;
  COR[key] = m; return m;
};
/* holo-sign: a framed panel of scrolling, flickering Aurebesh-like glyph rows + its coloured light */
COR.sign = function (L, x, y, z, w, h, col, yaw) {
  const c = new THREE.Color(col);
  const m = new THREE.ShaderMaterial({ toneMapped: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uC: { value: c }, uS: { value: Math.random() * 100 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uS; uniform vec3 uC; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec2 g = vec2(vUv.x * ${Math.max(4, Math.round(w * 3))}.0 + floor(uT * 1.5) * 0.0, vUv.y * ${Math.max(2, Math.round(h * 2.2))}.0);
        vec2 cell = floor(g), f = fract(g);
        float row = floor(g.y); float scroll = floor(uT * 2.0 + row * 3.0 + uS);
        float on = step(0.35, h(vec2(cell.x + scroll, row + uS)));
        vec2 q = f * 4.0; vec2 qi = floor(q);
        float glyph = step(0.45, h(qi + vec2(cell.x * 7.0 + scroll, row * 13.0))) * step(0.12, f.x) * step(f.x, 0.88) * step(0.15, f.y) * step(f.y, 0.85);
        float border = 1.0 - step(0.03, vUv.x) * step(vUv.x, 0.97) * step(0.05, vUv.y) * step(vUv.y, 0.95);
        float flick = 0.88 + 0.12 * step(0.5, h(vec2(floor(uT * 17.0), uS)));
        vec3 base = uC * 0.18;
        gl_FragColor = vec4((base + uC * (glyph * on * 2.6 + border * 3.0)) * flick, 1.0); }` });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); pl.position.set(x, y, z); pl.rotation.y = yaw || 0; LEVEL.add(pl);
  const fr = TEX.mat('metalPanel', { color: 0x2a2a30, metal: 0.5 });
  KIT.geo(KIT.chamferGeo(w / 2 + 0.12, h / 2 + 0.12, 0.08, 0.03), fr, new THREE.Matrix4().compose(V3(x, y, z).addScaledVector(V3(Math.sin(yaw || 0), 0, Math.cos(yaw || 0)), -0.1), new THREE.Quaternion().setFromAxisAngle(YUP, yaw || 0), V3(1, 1, 1)), { worldUV: true });
  L.updates.push((dt, t) => { m.uniforms.uT.value = t; });
  return R.addLight({ pos: V3(x, y, z).add(V3(Math.sin(yaw || 0), 0, Math.cos(yaw || 0)).multiplyScalar(1.5)), col: c, i: 3, range: 11, prio: 1, on: true });
};
/* rooftop hardware */
COR.mast = function (x, y, z, h, mat) {
  KIT.bbox(x - 0.5, y, z - 0.5, x + 0.5, y + 0.4, z + 0.5, mat, { c: 0.05, col: false });
  KIT.beam([x, y, z], [x, y + h, z], 0.14, mat);
  for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; KIT.beam([x + Math.cos(a) * 1.6, y, z + Math.sin(a) * 1.6], [x, y + h * 0.55, z], 0.035, mat); }
  for (let yy = y + 2; yy < y + h - 1; yy += 2.2) KIT.beam([x - 0.5, yy, z], [x + 0.5, yy, z], 0.05, mat);
  KIT.geo(new THREE.SphereGeometry(0.1, 8, 6), KIT.emis(0xff2010, 9), new THREE.Matrix4().makeTranslation(x, y + h + 0.1, z));
};
COR.dish = function (x, y, z, r, yaw, mat) {
  KIT.beam([x, y, z], [x, y + 1.4, z], 0.16, mat);
  const d = new THREE.LatheGeometry([[0.02, 0], [r * 0.5, r * 0.07], [r, r * 0.28], [r * 1.02, r * 0.3]].map((p) => new THREE.Vector2(p[0], p[1])), 20);
  KIT.geo(d, mat, new THREE.Matrix4().compose(V3(x, y + 1.6, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.9, yaw, 0, 'YXZ')), V3(1, 1, 1)), { worldUV: true });
};
/* neon sign: emissive panel + coloured light */
COR.neon = function (x, y, z, w, h, col, yaw, i) {
  const g = new THREE.PlaneGeometry(w, h); const m = new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(YUP, yaw || 0), V3(1, 1, 1));
  KIT.geo(g, KIT.emis(col, i || 3), m); KIT.geo(new THREE.PlaneGeometry(w, h), KIT.emis(col, i || 3), new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(YUP, (yaw || 0) + PI), V3(1, 1, 1)));
  return R.addLight({ pos: V3(x, y, z).add(V3(Math.sin(yaw || 0), 0, Math.cos(yaw || 0)).multiplyScalar(1.2)), col: new THREE.Color(col), i: 2.5, range: 9, prio: 1, on: true });
};
LEVEL.def('rooftops', {
  chapter: 'CHAPTER I', name: 'THE SENATE DISTRICT', world: 'coruscant', cast: ['csf', 'senate'],
  tex: ['duracrete', 'metalPanel', 'towerWin', 'grate'],
  start: [0, 0, -4, 0], checkpoints: [[0, 0, -4, 0], [2, -2, 60, 0], [0, 4, 104, 0]], killY: -40,
  async build(L) {
    const roof = TEX.mat('duracrete', { color: 0x8a8a96, env: 0.8, rough: 0.92, refl: 0.6 }), wall = TEX.mat('metalPanel', { color: 0x6a6a78 }), grate = TEX.mat('grate', { env: 0.8 }), dark = TEX.mat('metalPanel', { color: 0x3a3a44 });
    let fseed = 1;
    const block = (x0, z0, x1, z1, y) => {
      const fac = COR.facadeMat(fseed++ % 3 + 1);
      KIT.box(x0, y - 1.2, z0, x1, y, z1, roof, { mats: { x: wall, X: wall, z: wall, Z: wall } });
      KIT.box(x0 + 0.02, y - 90, z0 + 0.02, x1 - 0.02, y - 1.2, z1 - 0.02, fac, { faces: 'xXzZ', col: false }); PHY.box(x0, y - 90, z0, x1, y - 1.2, z1);
      for (const [a0, a1] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) KIT.bbox(a0 - 0.35, y - 90, a1 - 0.35, a0 + 0.35, y + 0.6, a1 + 0.35, dark, { c: 0.08, col: false });
      for (const xx of [x0, x1]) { KIT.bbox(xx - 0.22, y, z0 + 0.35, xx + 0.22, y + 0.55, z1 - 0.35, wall, { c: 0.06 }); KIT.bbox(xx - 0.28, y + 0.55, z0 + 0.3, xx + 0.28, y + 0.66, z1 - 0.3, dark, { c: 0.03, col: false }); }
      for (const zz of [z0, z1]) KIT.bbox(x0 + 0.35, y - 0.05, zz - 0.2, x1 - 0.35, y + 0.18, zz + 0.2, dark, { c: 0.04, col: false });
      for (let yy = y - 4; yy > y - 60; yy -= 14) KIT.bbox(x0 - 0.3, yy, z0 - 0.3, x1 + 0.3, yy + 0.6, z1 + 0.3, dark, { c: 0.1, col: false });
    };
    block(-8, -10, 8, 10, 0);                                   // P0 landing pad
    KIT.ring(0, 0, 5.5, 5.8, 0, 0.03, KIT.emis(0xffb040, 2), { sides: 40, col: false });
    KIT.box(-1.3, -0.4, 10, 1.3, 0, 22, grate); KIT.rail([[-1.3, 10], [-1.3, 22]], 0, dark); KIT.rail([[1.3, 10], [1.3, 22]], 0, dark);
    block(-10, 22, 10, 44, 0);                                  // P1
    // rooftop plant: vented housings with a cap, a grille on top and a warm service strip
    const unit = (x, y0, z, w, h, d) => { const X0 = x - w / 2, X1 = x + w / 2, Z0 = z - d / 2, Z1 = z + d / 2, y1 = y0 + h;
      KIT.box(X0, y0, Z0, X1, y1, Z1, wall); KIT.box(X0 - 0.08, y1, Z0 - 0.08, X1 + 0.08, y1 + 0.12, Z1 + 0.08, dark, { col: false });
      KIT.box(X0 + 0.2, y1 + 0.12, Z0 + 0.2, X1 - 0.2, y1 + 0.2, Z1 - 0.2, grate, { col: false });
      KIT.box(X0 - 0.02, y0 + h * 0.7, Z0 + 0.2, X1 + 0.02, y0 + h * 0.7 + 0.05, Z1 - 0.2, KIT.emis(0xffa040, 2.4), { col: false });
      KIT.box(X0 + 0.2, y0 + h * 0.7, Z0 - 0.02, X1 - 0.2, y0 + h * 0.7 + 0.05, Z1 + 0.02, KIT.emis(0xffa040, 2.4), { col: false });
      for (let v = y0 + 0.25; v < y0 + h * 0.62; v += 0.18) KIT.box(X0 - 0.03, v, Z0 + 0.25, X1 + 0.03, v + 0.06, Z1 - 0.25, dark, { col: false }); };
    for (const [x, z, w, h, d] of [[-6, 28, 2.5, 1.6, 2.5], [5, 33, 1.8, 2.2, 3], [-2, 40, 3, 1.2, 1.5], [7, 41, 1.5, 3.5, 1.5]]) unit(x, 0, z, w, h, d);
    block(-6, 48, 14, 72, -2);                                  // P2 (a jump down across the gap)
    for (let z = 44.5; z < 48; z += 1.2) KIT.box(-0.2, -0.02, z, 0.2, 0.02, z + 0.7, KIT.emis(0xffa020, 3), { col: false });
    for (const [x, z, w, h, d] of [[0, 56, 2, 1.4, 4], [9, 64, 3, 2, 2], [-3, 68, 1.5, 1.5, 1.5]]) unit(x, -2, z, w, h, d);
    KIT.stairs(2, 72, 8, 80, -2, 4, 'z', TEX.mat('metalPanel', { color: 0x4a4a54, rough: 0.85, env: 0.4 }));   // up to P3
    block(-12, 80, 8, 104, 4);                                  // P3 landing pad with a parked speeder
    const sp = PROPS.speeder(); sp.scale.setScalar(1.15); sp.position.set(-6, 4.7, 92); sp.rotation.y = 0.6; LEVEL.add(sp); PHY.obox(-6, 92, 0.4, 2.4, 4, 5.4, 0.6);
    KIT.box(-4, 4, 104, 4, 4.4, 112, grate);                    // walkway
    block(-16, 112, 16, 142, 4);                                // P4 terrace before the tower
    // the Senate office tower: a dark spire with gold bands
    const tower = COR.facadeMat(3), gold = PROPS.m('gold', { color: 0xc8962e, metalness: 1, roughness: 0.3, emissive: 0x201000 }), towerD = TEX.mat('metalPanel', { color: 0x24242a, metal: 0.6, env: 1.2, rough: 0.35 });
    KIT.box(-18, -60, 142, 18, 120, 170, tower, { faces: 'xXzZ' }); PHY.box(-18, -60, 142, 18, 120, 170);
    KIT.box(-18, 120, 142, 18, 121, 170, towerD, { col: false });
    for (let x = -18; x <= 18.01; x += 4.5) KIT.bbox(x - 0.35, 12, 141.2, x + 0.35, 120, 142.2, towerD, { c: 0.1, col: false });   // vertical fins
    for (let y = 12; y < 120; y += 9) KIT.bbox(-18.4, y, 141.5, 18.4, y + 0.45, 142.1, gold, { c: 0.08, col: false });
    KIT.bbox(-19, 4, 139.5, 19, 12, 142, towerD, { c: 0.15, col: false }); KIT.bbox(-19.5, 11.6, 138.8, 19.5, 12.6, 142.2, gold, { c: 0.1, col: false });   // podium + canopy
    for (const x of [-13, -8, 8, 13]) KIT.bbox(x - 0.45, 4, 138.9, x + 0.45, 11.6, 139.8, towerD, { c: 0.1 });
    // lit lobby glazing between the podium pillars, a glowing transom over the doors, light spilling onto the terrace
    const lobby = KIT.emis(0xffc890, 1.5);
    for (const [x0, x1] of [[-18.5, -13.5], [-12.5, -8.5], [8.5, 12.5], [13.5, 18.5]]) { KIT.box(x0, 4.3, 139.45, x1, 11.2, 139.5, lobby, { col: false }); for (let x = x0 + 1.25; x < x1; x += 1.25) KIT.bbox(x - 0.04, 4.3, 139.3, x + 0.04, 11.2, 139.55, towerD, { c: 0.01, col: false }); KIT.bbox(x0, 7.6, 139.3, x1, 7.7, 139.55, towerD, { c: 0.01, col: false }); }
    KIT.box(-4.2, 12.05, 139.45, 4.2, 12.5, 139.5, KIT.emis(0xffd8a0, 3), { col: false });
    for (const x of [-15.5, -10.5, 10.5, 15.5]) KIT.lamp(x, 6, 137.6, 0xffc080, 3.5, 9, { fixture: false });
    for (const sx of [-1, 1]) KIT.beam([sx * 16, 120, 156], [sx * 5, 150, 156], 0.8, towerD);
    KIT.beam([0, 120, 156], [0, 175, 156], 0.9, towerD); KIT.geo(new THREE.SphereGeometry(0.4, 10, 8), KIT.emis(0xff2010, 9), new THREE.Matrix4().makeTranslation(0, 175.5, 156));
    // the Galactic Republic crest over the doors: ring, hub and eight spokes
    const crest = (m) => KIT.geo(m.g, KIT.emis(0xffd8a0, 2.4), m.m);
    const T0 = (x, y, rz) => new THREE.Matrix4().compose(V3(x, y, 141.7), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, PI, rz)), V3(1, 1, 1));
    crest({ g: new THREE.RingGeometry(2.0, 2.45, 48), m: T0(0, 13, 0) }); crest({ g: new THREE.CircleGeometry(0.6, 24), m: T0(0, 13, 0) });
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; crest({ g: new THREE.PlaneGeometry(0.22, 1.35), m: T0(Math.cos(a) * 1.3, 13 + Math.sin(a) * 1.3, a - HALF) }); }
    L.door = LEVEL.door(-4, 4, 141.2, 4, 12, 141.8, TEX.mat('metalPanel', { color: 0x2a2418 }));
    // neon + lamps
    COR.sign(L, 10.6, 3.2, 30, 3.4, 1.4, 0xff2a8a, -HALF); COR.sign(L, -10.6, 2.8, 38, 2.4, 1.8, 0x30e0ff, HALF); COR.sign(L, 14.6, 1.2, 60, 3.6, 1.2, 0xffa020, -HALF); COR.sign(L, -12.6, 7.4, 90, 3.2, 1.6, 0x9a40ff, HALF); COR.sign(L, 16.6, 7.4, 125, 4.2, 1.6, 0xff3030, -HALF);
    for (const [x, z] of [[10.6, 30], [-10.6, 38], [14.6, 60], [-12.6, 90], [16.6, 125]]) KIT.beam([x, 0, z], [x, x > 0 && z === 60 ? -2 : 8, z], 0.1, dark);
    // masts, dishes, pipe runs and landing lights
    const steel = TEX.mat('metalPanel', { color: 0x5a5a66, metal: 0.6, env: 1.0, rough: 0.4 });
    for (const [x, y, z, h] of [[-8, 0, 25, 9], [9, 0, 43, 12], [12.5, -2, 70, 8], [-11, 4, 101, 14], [14, 4, 114, 10], [-14, 4, 138, 7]]) COR.mast(x, y, z, h, steel);
    for (const [x, y, z, r, yaw] of [[-8, 0, 32, 1.1, 0.6], [11.5, -2, 54, 1.4, -0.4], [-14, 4, 120, 1.6, 1.2]]) COR.dish(x, y, z, r, yaw, steel);
    for (const [x0, z0, z1, y] of [[-9.6, 23, 43, 0.25], [13.6, 49, 71, -1.75], [-15.6, 113, 141, 4.25]]) { KIT.beam([x0, y, z0], [x0, y, z1], 0.22, steel); KIT.beam([x0 + 0.35, y + 0.05, z0], [x0 + 0.35, y + 0.05, z1], 0.14, steel); }
    for (let a = 0; a < 16; a++) { const an = a / 16 * TAU; KIT.geo(new THREE.CylinderGeometry(0.06, 0.08, 0.06, 8), KIT.emis(a % 2 ? 0xffb040 : 0xffe0a0, 5), new THREE.Matrix4().makeTranslation(Math.cos(an) * 7.2, 0.03, Math.sin(an) * 7.2)); }
    for (let x = -10; x <= 6; x += 2) KIT.geo(new THREE.CylinderGeometry(0.06, 0.08, 0.06, 8), KIT.emis(0x60c0ff, 5), new THREE.Matrix4().makeTranslation(x, 4.03, 82));
    for (const [x, y, z] of [[6, 3, 0], [-6, 3, 0], [8, 2.5, 30], [-8, 2.5, 38], [9, 1.2, 62], [4, 7, 96], [-10, 7, 128], [10, 7, 128]]) KIT.lamp(x, y, z, 0xffd0a0, 2.4, 11, { size: 0.07, glow: 1.6 });   // (4.5 made a blinding specular blob on the glossy roof)
    for (const [x, y, z, c] of [[0, 6, 26, 0xa0b0ff], [0, 5, 58, 0xffb070], [-4, 10, 90, 0xa0b0ff], [0, 10, 118, 0xffb070], [0, 12, 134, 0xff9040]]) KIT.lamp(x, y, z, c, 6, 20, { fixture: false });
    SKY.coruscant(L, { r0: 95, n: 900, base: -10, fog: 0.0042, cz: 60, sunDir: V3(-0.3, 0.07, 1) });
    R.setSun(new THREE.Vector3(-0.3, 0.22, 1), 0xffa060, 2.8, 0x6a6090, 0x4a2418, 0.8);
    R.G.exposure = 1.18; R.G.bloom = 0.2;
    R.G.ssr = 1.0; R.G.ssrMax = 40; R.setShadowBox(26, 160);
    R.G.vol = 1.0; R.G.volDen = 0.0055; R.G.volFall = 0.02; R.G.volH = -10; R.G.volOut = 1.0; R.G.volG = 0.7; R.G.volMax = 60; R.G.volAmb.setRGB(0.012, 0.008, 0.012);
    R.G.gShadow.setRGB(0.9, 0.93, 1.1); R.G.gHigh.setRGB(1.06, 0.98, 0.92);
    COR.rain(L, 900);
    HOLOCRON.place(L, [[7, 3.5, 41], [12.5, -2, 52], [-10, 4, 83]]);
  },
  onStart(L, cp) {
    HUD.toast('CORUSCANT', 'THE SENATE DISTRICT', 3.5);
    LEVEL.establish(L, cp, { dur: 5, fov: 46, p0: V3(-13, 7.5, -17), p1: V3(0.6, 2.3, -7.9), l0: V3(5, 4, 22), l1: V3(0.2, 1.5, 2) });
    HUD.obj('Cross the Senate District — the Padawan is close');
    const add = (z, list, cpi) => LEVEL.trigger(-30, z - 3, 30, z + 3, () => LEVEL.wave(list, () => { if (cpi) LEVEL.checkpoint(cpi); }, { now: true, stagger: 0.3 }));
    if (cp < 1) { add(20, [['csf', -5, 32], ['csf', 5, 36], ['senate', 0, 40]], 0); HUD.hint('Jump the gap: ' + IN.keyLabel('jump') + ' then ' + IN.keyLabel('jump') + ' again in the air to Force flip', 5); }
    if (cp < 2) add(47, [['csf', 4, 60, { y: -2 }], ['csf', 10, 66, { y: -2 }], ['senate', 0, 64, { y: -2 }], ['senate', -3, 70, { y: -2 }]], 1);
    if (cp < 3) add(76, [['csf', -8, 98, { y: 4 }], ['csf', 4, 100, { y: 4 }], ['senate', -2, 96, { y: 4 }], ['senate', 3, 94, { y: 4 }]], 2);
    LEVEL.trigger(-30, 108, 30, 114, () => LEVEL.wave([['senate', -6, 132, { y: 4 }], ['senate', 6, 132, { y: 4 }], ['csf', -12, 136, { y: 4 }], ['csf', 12, 136, { y: 4 }], ['csf', 0, 138, { y: 4 }]], () => {
      HUD.obj('Enter the tower — the Padawan is inside'); L.door.openIt(); HUD.sub('DARTH MAUL', 'I can feel her. A Jedi, frightened, alone.', 3);
      LEVEL.trigger(-4, 139, 4, 142, () => GAME.next(), { y0: 3, y1: 8 });
    }, { now: true, stagger: 0.3 }));
  },
});
/* ------------------------------------------------------------------ Alexi Garyn: Teras Käsi */
const FB = (t, fl, fr, x) => K(t, [-0.25, 0.95, 0.0], [0, 1, 0], Object.assign({ g: 'L', gL: 0, gR: 0, oL: 0, fl, fr }, x || {}));
MOV.brawler = {
  idle: { loop: true, keys: [FB(0, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { st: 'guard', cr: 0.1, tw: -0.3, headYaw: 0.25 }), FB(0.8, [0.13, 1.44, 0.27], [-0.11, 1.35, 0.2], { cr: 0.13 }), FB(1.6, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { cr: 0.1 })] },
  run: { loop: true, keys: [FB(0, [0.18, 1.2, 0.15], [-0.18, 1.2, 0.15], { st: 'neutral', cr: 0.05, pi: 0.12 })] },
  jab: { dur: 0.42, ev: [[0.12, 0.2, 0, 7, 'fist']], keys: [FB(0, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { st: 'guard', tw: -0.3, cr: 0.1 }), FB(0.14, [0.12, 1.42, 0.28], [-0.05, 1.45, 0.66], { tw: 0.1, st: 'lungeR', pi: 0.15 }), FB(0.42, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { tw: -0.3, st: 'guard', pi: 0 })] },
  cross: { dur: 0.48, ev: [[0.16, 0.26, 0, 9, 'fist']], keys: [FB(0, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { st: 'guard', tw: -0.3 }), FB(0.18, [0.03, 1.45, 0.7], [-0.12, 1.36, 0.18], { tw: -0.6, st: 'lungeL', pi: 0.2 }), FB(0.48, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { tw: -0.3, st: 'guard', pi: 0 })] },
  kick: { dur: 0.7, ev: [[0.28, 0.4, 0, 13, 'kick']], keys: [FB(0, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { st: 'guard', yaw: 0 }), FB(0.18, [0.25, 1.3, 0.1], [-0.2, 1.25, 0.1], { st: 'kick', yaw: -0.6, liftR: 0.8, fR: [-0.1, 0.5, 0.2] }),
    FB(0.34, [0.25, 1.3, 0.0], [-0.25, 1.2, -0.05], { yaw: -1.5, liftR: 1.5, fR: [-0.05, 0.62, 0.7], pi: -0.3 }), FB(0.7, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { yaw: 0, liftR: 0, st: 'guard', pi: 0 })] },
  fly: { dur: 0.95, ev: [[0.45, 0.62, 0, 16, 'kick']], keys: [FB(0, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { st: 'guard', cr: 0.1 }), FB(0.2, [0.12, 1.3, 0.2], [-0.1, 1.3, 0.2], { cr: 0.35 }),
    FB(0.45, [0.3, 1.5, -0.1], [-0.3, 1.5, -0.1], { air: 1, liftL: 1.0, liftR: 0.3, fL: [0.1, 0.6, 0.65], pi: -0.4, cr: 0.0 }), FB(0.95, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { air: 0, liftL: 0, liftR: 0, pi: 0, cr: 0.15, st: 'guard' })] },
  evade: { dur: 0.36, keys: [FB(0, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { st: 'guard', lean: 0 }), FB(0.12, [0.2, 1.2, 0.2], [0.0, 1.2, 0.2], { lean: 0.6, cr: 0.3, pi: -0.2, st: 'wide' }), FB(0.36, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { lean: 0, cr: 0.1, pi: 0, st: 'guard' })] },
  hit: { dur: 0.4, keys: [FB(0, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { st: 'guard' }), FB(0.1, [0.2, 1.3, 0.1], [-0.2, 1.3, 0.1], { pi: -0.35, tw: 0.4, headPitch: -0.4, st: 'back' }), FB(0.4, [0.12, 1.42, 0.28], [-0.1, 1.33, 0.22], { pi: 0, tw: -0.3, headPitch: 0, st: 'guard' })] },
  stun: MOV.trooper.stun, knock: MOV.trooper.knock, death: MOV.trooper.death, choke: MOV.trooper.choke, execd: MOV.trooper.execd,
};
MOV.brawler.stun = { loop: true, keys: [FB(0, [0.3, 1.0, 0.25], [-0.3, 1.0, 0.25], { st: 'wide', cr: 0.24, pi: 0.35, headPitch: 0.35 }), FB(0.7, [0.3, 1.0, 0.25], [-0.3, 1.0, 0.25], { cr: 0.28, lean: 0.12 }), FB(1.4, [0.3, 1.0, 0.25], [-0.3, 1.0, 0.25], { cr: 0.24 })] };
ENEMY.TYPES.garyn = { tpl: 'garyn', hp: 460, brain: 'brawler', moves: 'brawler', dmg: 10, speed: 4.2, name: 'Alexi Garyn', drain: 30, boss: true };
class Garyn extends Enemy {
  constructor(o) {
    super('garyn', o); this.isBoss = true; this.noExec = true; this.dodge = 100; this.dodgeMax = 100; this.cd = 1.5; this.combo = [];
    this.guard = 100; this.guardMax = 100; this.brainFn = (dt, d) => this.fight(dt, d); this.base = 'idle';
  }
  fight(dt, d) {
    const P = this.P;
    this.dodge = Math.min(this.dodgeMax, this.dodge + dt * 5.5); this.guard = this.dodge;
    if (this.act && ['jab', 'cross', 'kick', 'fly', 'evade'].includes(this.act)) { this.vx *= 0.85; this.vz *= 0.85; this.yaw = dampA(this.yaw, this.angTo(P), 3, dt); this.hitCheck(); if (this.act === 'fly' && this.actT < 0.5) { const f = this.forward(V3()); this.moveH(f.x * dt * 7, f.z * dt * 7); } return; }
    this.yaw = dampA(this.yaw, this.angTo(P), 10, dt);
    const want = 1.6; this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rnd(0.8, 1.8); }
    const ax = (P.x - this.x) / (d || 1), az = (P.z - this.z) / (d || 1);
    let fx = 0, fz = 0; if (d > want + 0.4) { fx += ax; fz += az; } else if (d < want - 0.4) { fx -= ax; fz -= az; }
    fx += -az * this.strafe * 0.8; fz += ax * this.strafe * 0.8; const L = Math.hypot(fx, fz) || 1, spd = d > 6 ? 6 : 3.4;
    this.vx = damp(this.vx, fx / L * spd, 8, dt); this.vz = damp(this.vz, fz / L * spd, 8, dt); this.setBase(d > 6 ? 'run' : 'idle');
    this.cd -= dt * (MG.difficulty === 'hard' ? 1.3 : MG.difficulty === 'easy' ? 0.7 : 1);
    if (this.combo.length && !this.act) { this.hitDone = false; this.play(this.combo.shift(), { fade: 0.05 }); return; }
    if (this.cd <= 0) {
      if (d > 4 && d < 9) { this.hitDone = false; this.play('fly', { fade: 0.08 }); this.cd = rnd(1.4, 2.4); return; }
      if (d < 2.6) { this.combo = pick([['jab', 'cross', 'kick'], ['jab', 'jab', 'cross'], ['kick', 'cross'], ['cross', 'kick'], ['jab', 'kick']]); this.hitDone = false; this.play(this.combo.shift(), { fade: 0.05 }); this.cd = rnd(1.8, 3.0); }
    }
  }
  hitCheck() {
    const c = this.actClip, P = this.P; if (!c || !c.ev || this.hitDone) return; const e = c.ev[0];
    if (this.actT >= e[0] && this.actT <= e[1]) { const d = this.dist(P), ang = Math.abs(wrapA(this.angTo(P) - this.yaw)); if (d < 2.3 && ang < 1.1) { this.hitDone = true; COMBAT.damage(P, e[3], { src: this, kind: 'melee', knock: this.act === 'fly', dir: V3(P.x - this.x, 0, P.z - this.z).normalize() }); FX.puff(P.chest(V3()), 3, { size: 0.3, col: [0.6, 0.6, 0.6], a: 0.3, life: 0.5 }); FX.addShake(0.25); } }
  }
  /* no blocking a lightsaber barehanded: he evades, and evasion costs stamina */
  tryBlock(atk, dmg, kind) {
    if (!this.alive || this.state === 'stun' || this.state === 'execd' || (this.act && ['jab', 'cross', 'kick', 'fly'].includes(this.act))) return false;
    const cost = dmg * (kind === 'slam' || kind === 'whirl' || kind === 'sweep' ? 3.0 : 2.0) * (PLAYER.rageOn ? 1.6 : 1);
    if (this.dodge < cost) { this.dodge = 0; this.stunned = true; this.stop(); this.play('stun'); this.setState('stun'); this.combo = []; HUD.pop('GARYN IS SPENT — ' + IN.keyLabel('grip').replace(/<[^>]+>/g, '') + ' TO STRIKE'); return false; }
    this.dodge -= cost; this.play('evade', { fade: 0.03 });
    const side = RNG() < 0.5 ? 1 : -1, f = V3(this.x - atk.x, 0, this.z - atk.z).normalize(); this.moveH(-f.z * side * 1.4 + f.x * 0.6, f.x * side * 1.4 + f.z * 0.6);
    FX.puff(V3(this.x, this.y + 1, this.z), 2, { size: 0.3, col: [0.4, 0.6, 0.35], a: 0.25, life: 0.4 });
    return true;
  }
  onHit(info) { if (info.knock) return super.onHit(info); if (this.state === 'stun') return; if (!this.act || !['jab', 'cross', 'kick', 'fly'].includes(this.act)) { this.play('hit', { fade: 0.03 }); this.setState('stagger'); this.combo = []; } }
  onExec() { this.stop(); this.play('stun'); this.setState('stun'); this.stT = 0.5; }
  resistGrip() { HUD.pop('GARYN BREAKS FREE'); this.cd = 0; return true; }
}
LEVEL.def('blacksun', {
  chapter: 'CHAPTER I', name: 'SHADOW HUNTER', world: 'coruscant', cast: ['csf', 'senate', 'darsha'],
  tex: ['darkMarble', 'carpet', 'metalPanel', 'towerWin'],
  start: [0, 0, -26, 0], checkpoints: [[0, 0, -26, 0], [0, 0, 0, 0]], killY: -20,
  async build(L) {
    const floor = TEX.mat('darkMarble', { env: 1.2, rough: 0.18, refl: 0.9 }), carpet = new THREE.MeshPhysicalMaterial({ color: 0x4a0e0a, roughness: 0.92, sheen: 1, sheenColor: new THREE.Color(0x8a2a20), sheenRoughness: 0.5, envMapIntensity: 0.3 }), wall = TEX.mat('metalPanel', { color: 0x3a3430, env: 0.6 }), black = new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.2, metalness: 0.6, envMapIntensity: 1.4 }); black.userData.tscale = 3;
    const gold = PROPS.m('gold', { color: 0xc8962e, metalness: 1, roughness: 0.3, emissive: 0x201000 }); gold.userData.tscale = 2;
    const X = 16, Z0 = -32, Z1 = 32, H = 16;
    KIT.box(-X, -1, Z0, X, 0, Z1, floor);
    KIT.box(-2.4, 0, Z0, 2.4, 0.02, Z1 - 8, carpet, { col: false });
    for (const s of [-1, 1]) { KIT.box(s * X, 0, Z0, s * (X + 1), H, Z1, wall); for (let z = Z0 + 4; z < Z1; z += 8) { KIT.cyl(s * (X - 3), 0, z, 0.9, H, black, { seg: 20 }); KIT.cyl(s * (X - 3), H - 1.2, z, 1.15, 0.5, gold, { col: false, seg: 20 }); KIT.cyl(s * (X - 3), 0, z, 1.15, 0.4, gold, { col: false, seg: 20 });
      // braziers
      KIT.lathe([[0, 0], [0.55, 0], [0.4, 0.15], [0.28, 0.7], [0.62, 1.05], [0.72, 1.2], [0.5, 1.18], [0, 1.1]], s * (X - 6), 0, z + 4, gold, { seg: 20 }); PHY.cyl(s * (X - 6), z + 4, 0.55, 0, 1.2);
      const bl = KIT.lamp(s * (X - 6), 1.8, z + 4, 0xff8a30, 5, 11, { fixture: false }); L.fires = L.fires || []; L.fires.push([V3(s * (X - 6), 1.2, z + 4), bl]); } }
    L.updates.push((dt, t) => { for (const [p, lt] of L.fires) { lt.i = 4.2 + Math.sin(t * 17 + p.z) * 0.6 + Math.sin(t * 31 + p.x) * 0.4; if (RNG() < dt * 26) FX.puff(p, 1, { add: true, size: 0.26, grow: 0.25, col: [3.2, 1.25, 0.32], a: 0.9, life: 0.55, spread: 0.18, rise: 2.4, drag: 0.6, jit: 0.22 }); if (RNG() < dt * 3) FX.puff(V3(p.x, p.y + 0.9, p.z), 1, { size: 0.35, grow: 3, col: [0.12, 0.1, 0.09], a: 0.25, life: 2.2, spread: 0.2, rise: 1.2 }); } });
    KIT.box(-X, 0, Z0 - 1, X, H, Z0, wall); KIT.box(-X, H, Z0, X, H + 0.5, Z1, black, { col: false });
    // the window wall behind the throne: open bays between gold-capped piers, the low sun pouring down the hall
    PHY.box(-X, 0, Z1, X, H, Z1 + 1);
    KIT.bbox(-X, 0, Z1, X, 1.0, Z1 + 1, wall, { c: 0.06, col: false }); KIT.bbox(-X, H - 1.6, Z1, X, H, Z1 + 1, wall, { c: 0.06, col: false });
    for (let x = -X; x <= X + 0.01; x += 6.4) { KIT.bbox(x - 0.55, 0, Z1 - 0.2, x + 0.55, H, Z1 + 1.1, black, { c: 0.12, col: false }); KIT.bbox(x - 0.7, H - 2.2, Z1 - 0.35, x + 0.7, H - 1.6, Z1 + 1.1, gold, { c: 0.06, col: false }); KIT.bbox(x - 0.7, 0, Z1 - 0.35, x + 0.7, 0.8, Z1 + 1.1, gold, { c: 0.06, col: false }); }
    for (let x = -X + 3.2; x < X; x += 6.4) { KIT.bbox(x - 0.07, 1, Z1 + 0.4, x + 0.07, H - 1.6, Z1 + 0.6, black, { c: 0.02, col: false }); for (const y of [5.5, 10]) KIT.bbox(x - 3.2, y - 0.06, Z1 + 0.4, x + 3.2, y + 0.06, Z1 + 0.6, black, { c: 0.02, col: false }); }
    // side walls: tall recessed panels between pilasters, warm uplights
    for (const s of [-1, 1]) for (let z = Z0; z < Z1; z += 8) {
      KIT.bbox(s * (X - 0.35), 0, z - 0.4, s * X, H, z + 0.4, black, { c: 0.08, col: false });
      KIT.bbox(s * (X - 0.12), 1.4, z + 0.9, s * X, H - 2, z + 7.1, TEX.mat('darkMarble', { env: 1.0, rough: 0.3 }), { c: 0.04, col: false });
      KIT.bbox(s * (X - 0.2), H - 2, z, s * X, H - 1.7, z + 8, gold, { c: 0.03, col: false });
      KIT.box(s * (X - 0.4), 0.3, z + 3.6, s * (X - 0.3), 0.36, z + 4.4, KIT.emis(0xffc080, 4), { col: false });
    }
    // coffered ceiling: gold-edged beams in a grid
    for (let z = Z0; z <= Z1; z += 4) KIT.bbox(-X, H - 0.9, z - 0.25, X, H, z + 0.25, black, { c: 0.06, col: false });
    for (let x = -X; x <= X; x += 4) KIT.bbox(x - 0.25, H - 0.9, Z0, x + 0.25, H, Z1, black, { c: 0.06, col: false });
    for (let z = Z0; z <= Z1; z += 4) KIT.box(-X, H - 0.92, z - 0.27, X, H - 0.9, z + 0.27, gold, { col: false });
    // the throne dais
    KIT.box(-7, 0, 20, 7, 0.6, 30, black); KIT.box(-4, 0.6, 24, 4, 1.2, 30, black); KIT.box(-1.2, 1.2, 27, 1.2, 4.2, 28.2, gold);
    KIT.stairs(-3, 17.5, 3, 20, 0, 0.6, 'z', gold);
    const sun = new THREE.RingGeometry(2.6, 3.2, 48); KIT.geo(sun, KIT.emis(0xffd8a0, 2.2), new THREE.Matrix4().compose(V3(0, 9, Z1 - 0.3), new THREE.Quaternion().setFromAxisAngle(YUP, PI), V3(1, 1, 1)));
    KIT.geo(new THREE.CircleGeometry(0.9, 32), KIT.emis(0xffd8a0, 2.2), new THREE.Matrix4().compose(V3(0, 9, Z1 - 0.3), new THREE.Quaternion().setFromAxisAngle(YUP, PI), V3(1, 1, 1)));
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; KIT.geo(new THREE.PlaneGeometry(0.28, 1.7), KIT.emis(0xffd8a0, 2.2), new THREE.Matrix4().compose(V3(Math.cos(a) * 1.75, 9 + Math.sin(a) * 1.75, Z1 - 0.3), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, PI, a - HALF)), V3(1, 1, 1))); }
    // the Vigo council ring (mid hall)
    KIT.ring(0, 2, 4.2, 5.2, 0, 0.9, black, { sides: 32 }); KIT.ring(0, 2, 5.2, 5.35, 0.9, 0.95, gold, { sides: 32, col: false });
    for (let x = -12; x <= 12; x += 8) KIT.lamp(x, 12, 0, 0xffc890, 3, 14, { fixture: false });
    KIT.lamp(0, 7, 24, 0xffa050, 5, 16, { fixture: false });
    SKY.coruscant(L, { r0: 90, n: 600, base: -30, fog: 0.0036, cz: 60, sunDir: V3(0.1, 0.08, 1) });
    R.setSun(new THREE.Vector3(0.12, 0.2, 1), 0xffa060, 3.0, 0x6a5658, 0x3a2016, 0.85);
    R.G.exposure = 1.1; R.G.bloom = 0.22; R.G.ssr = 1.0; R.G.ssrMax = 45;
    R.setShadowBox(36, 180); R.G.vol = 1.3; R.G.volDen = 0.03; R.G.volFall = 0.03; R.G.volOut = 0.0; R.G.volG = 0.65; R.G.volMax = 70;
    R.G.gShadow.setRGB(0.9, 0.94, 1.12); R.G.gHigh.setRGB(1.08, 0.98, 0.88);
    L.door = LEVEL.door(-4, 0, Z0 - 0.6, 4, 8, Z0 - 0.1, TEX.mat('metalPanel', { color: 0x2a2418 }));
    HOLOCRON.place(L, [[-13, 0, 26], [13, 0, -26], [0, 1.2, 29]]);
  },
  onStart(L, cp) {
    const say = (w, t, d, c) => HUD.sub(w, t, d, c);
    HUD.toast('CORUSCANT', 'SHADOW HUNTER', 3.5);
    LEVEL.establish(L, cp, { dur: 5.5, fov: 44, p0: V3(-9, 10, -29.5), p1: V3(0.7, 2.2, -30.2), l0: V3(0, 3, 22), l1: V3(0, 1.6, -18) });
    const boss = () => {
      const d = new Jedi('darsha', { x: 0, y: 1.2, z: 26, yaw: PI, aggr: 1.1 }); d.home = [0, 18]; L.d = d;
      HUD.setBoss(d, 'DARSHA ASSANT', 'JEDI PADAWAN · SHADOW HUNTER', ''); HUD.obj('Kill the Padawan');
      BOSS.extra = () => {
        if (!L.flags.adds && d.hp < d.hpMax * 0.5) { L.flags.adds = true; say('DARSHA ASSANT', 'Security — seal the doors! Don\'t let him leave!', 2.5, 'jedi'); LEVEL.wave([['senate', -10, 20], ['senate', 10, 20]], null, { now: true }); }
        if (!d.alive && !L.flags.done) { L.flags.done = true; MG.after(1.5, () => say('DARTH SIDIOUS', 'The Padawan is dead, and the traitor with her. Now — the Queen of Naboo has slipped the blockade.', 5, 'sid')); MG.after(7, () => GAME.result(false, 'dunes')); }
      };
    };
    if (cp >= 1) { boss(); return; }
    say('DARTH MAUL', 'The Padawan is here. I can smell her fear.', 2.5);
    HUD.obj('Cut through the Senate Guard');
    LEVEL.wave([['csf', -8, -2], ['csf', 8, -2], ['senate', 0, 10], ['csf', -10, 10], ['csf', 10, 10], ['senate', -4, 14]], () => {
      LEVEL.checkpoint(1);
      PLAYER.state = 'cine'; HUD.show(false);
      boss(); L.d.passive = true; L.d.saber.ignite(undefined, false); L.d.saber.ign = [0];
      CAM.play({ dur: 5, fov: 34, fn: (t, u) => ({ pos: V3(1.6, 1.9, 19 - u * 2), look: V3(0, 1.8, 26) }) });
      say('DARSHA ASSANT', 'You\'re the one who killed Hath Monchar. The Council will know what you are.', 3.6, 'jedi');
      MG.after(2.4, () => { L.d.saber.ignite(undefined, true); });
      MG.after(3.8, () => say('DARTH MAUL', 'The Council will never hear of me.', 2));
      MG.after(5.2, () => { PLAYER.state = 'move'; HUD.show(true); L.d.passive = false; });
    }, { now: true, stagger: 0.3 });
  },
});
