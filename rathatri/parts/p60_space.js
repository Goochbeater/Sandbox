/* SPACE — arcade free-flight for thumbs. Left stick steers (yaw about world-up + clamped pitch, banking is visual: no disorienting loops on a phone),
   FIRE (hold, lead-aim assist), BOOST / BRAKE (hold), ROLL (tap: dodge + i-frames), MISSILE (tap, needs a lock), DOMINATE (hold on a crippled, dominable hull), LOCK (cycle).
   One scene group (SPACE.g): procedural star/nebula sky, a planet with atmosphere rim, speed dust, instanced asteroids + wreckage, pooled instanced bolts.
   Missions are data (p61): SPACE.def(id, { name, hull?, env, objectives:[...], onStart(S), onUpdate(S, dt) }) driven by a sequential objective runner.
   Ship models come from SHIP.build (p51); stats from SHIP.HULLS. The ground game is torn down while flying and rebuilt by the next GAME.start. */
const SPACE = { on: false, defs: {}, ships: [], P: null, t: 0, def: null, cb: null, obj: null, oi: -1, done: false, kills: 0, tagKills: {}, alert: 0 };
SPACE.def = function (id, d) { d.id = id; SPACE.defs[id] = d; return d; };
const _sv1 = new THREE.Vector3(), _sv2 = new THREE.Vector3(), _sv3 = new THREE.Vector3(), _sv4 = new THREE.Vector3(), _sq1 = new THREE.Quaternion(), _se1 = new THREE.Euler(0, 0, 0, 'YXZ');
SPACE.TEAMCOL = { player: [1.0, 0.06, 0.05], foe: [0.25, 1.0, 0.3], jedi: [0.3, 0.55, 1.0], ally: [1.0, 0.55, 0.1] };
/* ---------------------------------------------------------------- lifecycle */
SPACE.start = async function (id, cb) {
  const def = SPACE.defs[id]; if (!def) { MG.fail('no space mission ' + id); return; }
  SPACE.cb = cb; SPACE.def = def; MENU.close(); HUD.show(false); MG.state = 'loading';
  const b = MG.$('boot'); if (b) { b.style.display = 'flex'; b.style.opacity = 1; const h1 = b.querySelector('h1'), h2 = b.querySelector('h2'); if (h1) h1.textContent = def.name; if (h2) h2.textContent = def.chapter || 'SPACE'; MG.$('ldQuote').textContent = def.brief ? '“' + def.brief + '”' : GAME.quote(); }
  await MG.loadUI(0.2, 'Plotting the jump');
  SPACE.teardownGround();
  try { await SPACE.build(def); } catch (e) { MG.fail(e); return; }
  await MG.loadUI(1, 'Hyperspace');
  if (b) { b.style.opacity = 0; setTimeout(() => { b.style.display = 'none'; }, 700); }
  SPACE.on = true; SPACE.done = false; MG.state = 'play'; TOUCH.want = 'space'; document.body.classList.add('space'); HUD.show(true);
  SPACE.hyper(true); SPACE.nextObj();
  if (def.onStart) def.onStart(SPACE);
};
SPACE.restart = function () { const id = SPACE.def.id, cb = SPACE.cb; SPACE.stop(); MENU.close(); SPACE.start(id, cb); };
SPACE.teardownGround = function () {
  if (LEVEL.cur) { const L = LEVEL.cur; if (L.group) { R.scene.remove(L.group); L.group.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); } for (const x of L.extras) if (x.parent) x.parent.remove(x); if (L.dispose) L.dispose(); LEVEL.cur = null; }
  ENEMY.clear(); BOSS.clear(); COMBAT.reset(); FX.clear(); PHY.clear(); R.clearLevelLights(); HUD.setBoss(null); CAM.cine = null;
  if (typeof SHIP !== 'undefined' && SHIP.abort) SHIP.abort();
  if (PLAYER.a) { PLAYER.a.dispose(); PLAYER.a = null; }
  R.scene.fog = null; R.scene.background = new THREE.Color(0, 0, 0);
};
SPACE.stop = function () {
  if (SPACE.g) { R.scene.remove(SPACE.g); SPACE.g.traverse((o) => { if (o.geometry && !o.geometry._shared) o.geometry.dispose(); }); }
  for (const s of SPACE.ships) if (s.g) SHIP.dispose(s.g);
  SPACE.ships = []; SPACE.P = null; SPACE.g = null; SPACE.on = false; SPACE.bolts = null; SPACE.missiles = []; SPACE.booms = [];
  if (SPACE.hud) SPACE.hud.root.remove(); SPACE.hud = null; document.body.classList.remove('space');
  R.camera.near = 0.08; R.camera.far = 1400; R.camera.updateProjectionMatrix(); R.renderer.shadowMap.autoUpdate = true; R.clearLevelLights();
  TOUCH.want = 'ground';
};
SPACE.finish = function (res) {
  if (SPACE.done) return; SPACE.done = true; res = res || {}; res.kills = SPACE.kills;
  if (res.fail) { MG.state = 'dead'; HUD.show(false); MENU.open('dead'); return; }
  SPACE.hyper(false);
  MG.after(1.6, () => { const cb = SPACE.cb; SPACE.stop(); if (cb) cb(res); }, true);
};
/* ---------------------------------------------------------------- scene */
SPACE.build = async function (def) {
  const E = def.env || {}, g = SPACE.g = new THREE.Group(); R.scene.add(g);
  R.camera.near = 0.5; R.camera.far = 9000; R.camera.updateProjectionMatrix(); R.renderer.shadowMap.autoUpdate = false; R.renderer.shadowMap.needsUpdate = false;
  const sun = V.norm(E.sun || [0.5, 0.35, 0.8]);
  R.setSun(new THREE.Vector3(sun[0], sun[1], sun[2]), E.sunCol || 0xfff0dc, E.sunI || 2.4, E.amb || 0x223044, 0x050608, 0.55);
  R.resetGrade(); R.G.bloom = (R.G.bloom || 1) * 1.15;
  // sky: procedural stars + nebula (embedded texture when present)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 40, 20), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uNeb: { value: (typeof ASSET !== 'undefined' && ASSET.has && ASSET.has('nebula_a')) ? ASSET.tex('nebula_a') : null }, uHasN: { value: (typeof ASSET !== 'undefined' && ASSET.has && ASSET.has('nebula_a')) ? 1 : 0 }, uTint: { value: new THREE.Color(E.neb || 0x6a2a50) }, uSun: { value: new THREE.Vector3(sun[0], sun[1], sun[2]) } },
    vertexShader: 'varying vec3 vD; varying vec2 vUv; void main(){ vD = normalize(position); vUv = uv; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform sampler2D uNeb; uniform float uHasN; uniform vec3 uTint, uSun; varying vec3 vD; varying vec2 vUv;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y), mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){ vec3 d = normalize(vD); vec3 c = vec3(0.0);
        vec3 q = d * 420.0; vec3 cell = floor(q); float r = h(cell); float st = step(0.985, r) * (1.0 - smoothstep(0.0, 0.42, length(fract(q) - 0.5))); c += st * mix(vec3(0.8,0.85,1.0), vec3(1.0,0.8,0.6), h(cell + 3.0)) * (1.5 + 4.0 * h(cell + 7.0));
        vec3 q2 = d * 140.0; vec3 c2 = floor(q2); c += step(0.993, h(c2)) * (1.0 - smoothstep(0.0, 0.35, length(fract(q2) - 0.5))) * 2.2;
        float nb = n3(d * 2.2) * 0.6 + n3(d * 5.1) * 0.3 + n3(d * 11.0) * 0.1; vec3 neb = uTint * pow(nb, 3.0) * 1.4;
        if (uHasN > 0.5) neb = mix(neb, texture2D(uNeb, vUv).rgb * uTint * 2.2, 0.55);
        c += neb; float s = max(dot(d, uSun), 0.0); c += vec3(1.0, 0.9, 0.7) * (pow(s, 900.0) * 40.0 + pow(s, 30.0) * 0.25);
        gl_FragColor = vec4(c, 1.0); }` }));
  sky.renderOrder = -10; sky.frustumCulled = false; g.add(sky); SPACE.sky = sky;
  // planet + atmosphere rim
  if (E.planet) {
    const P = E.planet, pg = new THREE.SphereGeometry(P.r, 64, 32), tex = P.tex && typeof ASSET !== 'undefined' && ASSET.has(P.tex) ? ASSET.tex(P.tex) : null;
    const pm = new THREE.ShaderMaterial({ uniforms: { uT: { value: tex }, uHas: { value: tex ? 1 : 0 }, uA: { value: new THREE.Color(P.col || 0x3a6a3a) }, uB: { value: new THREE.Color(P.col2 || 0x1a2a14) }, uSun: { value: new THREE.Vector3(sun[0], sun[1], sun[2]) }, uSeed: { value: P.seed || 1 } },
      vertexShader: 'varying vec3 vN; varying vec2 vUv; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D uT; uniform float uHas, uSeed; uniform vec3 uA, uB, uSun; varying vec3 vN; varying vec2 vUv; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y), mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z); }
        void main(){ vec3 d = normalize(vP); float n = n3(d * 3.0 + uSeed) * 0.55 + n3(d * 9.0 + uSeed) * 0.3 + n3(d * 27.0) * 0.15;
          vec3 c = mix(uB, uA, smoothstep(0.35, 0.65, n)); float cl = smoothstep(0.55, 0.75, n3(d * 6.0 + vec3(uSeed * 3.0, 0.0, 0.0)) * 0.7 + n3(d * 19.0) * 0.3); c = mix(c, vec3(0.85, 0.88, 0.9), cl * 0.65);
          if (uHas > 0.5) c = mix(c, texture2D(uT, vUv).rgb, 0.7);
          float l = max(dot(normalize(vN), uSun), 0.0); gl_FragColor = vec4(c * (0.03 + 1.25 * l), 1.0); }` });
    const pl = new THREE.Mesh(pg, pm); pl.position.set(P.at[0], P.at[1], P.at[2]); pl.rotation.z = 0.3; g.add(pl); SPACE.planet = pl;
    const am = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, uniforms: { uC: { value: new THREE.Color(P.atmo || 0x6aa8ff) }, uSun: { value: new THREE.Vector3(sun[0], sun[1], sun[2]) } },
      vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 uC, uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 v = normalize(cameraPosition - vW); float r = pow(1.0 - abs(dot(normalize(vN), v)), 3.0); float l = 0.25 + 0.75 * max(dot(-normalize(vN), uSun) * 0.5 + 0.5, 0.0); gl_FragColor = vec4(uC * r * l * 1.6, 1.0); }' });
    const at = new THREE.Mesh(new THREE.SphereGeometry(P.r * 1.06, 48, 24), am); at.position.copy(pl.position); g.add(at);
  }
  // speed dust: points that wrap around the camera — the sense of velocity
  const N = 380, dp = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) dp[i] = (RNG() - 0.5) * 160;
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xaab4c8, size: 0.32, transparent: true, opacity: 0.55, depthWrite: false })); dust.frustumCulled = false; g.add(dust); SPACE.dust = dust;
  // asteroids + wreckage (instanced; collision spheres)
  SPACE.rocks = []; SPACE.instRocks = null;
  const D = E.debris; if (D) {
    const rg = new THREE.IcosahedronGeometry(1, 2), pos = rg.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = 0.72 + 0.5 * fbm3(x * 1.7 + 4, y * 1.7, z * 1.7, 3); pos.setXYZ(i, x * k, y * k * 0.85, z * k); } rg.computeVertexNormals();
    const rmat = typeof ASSET !== 'undefined' && ASSET.has && ASSET.has('rock_strata') ? ASSET.mat('rock_strata', { color: D.col || 0x8a8278, rough: 0.95, repeat: [2, 2] }) : new THREE.MeshStandardMaterial({ color: D.col || 0x5a524a, roughness: 0.95, flatShading: true });
    const n = D.n || 120, im = new THREE.InstancedMesh(rg, rmat, n), m4 = new THREE.Matrix4(), rs = MG.rs('rocks' + def.id);
    for (let i = 0; i < n; i++) { const a = rs() * TAU, rr = (D.r0 || 120) + rs() * ((D.r1 || 1400) - (D.r0 || 120)), y = (rs() - 0.5) * (D.h || 400), s = (D.s0 || 4) + Math.pow(rs(), 2.6) * ((D.s1 || 40) - (D.s0 || 4));
      const c = D.center || [0, 0, 0], p = new THREE.Vector3(c[0] + Math.cos(a) * rr, c[1] + y, c[2] + Math.sin(a) * rr), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rs() * 6, rs() * 6, rs() * 6));
      m4.compose(p, q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4); SPACE.rocks.push({ p, r: s * 0.95, q, s, spin: (rs() - 0.5) * 0.2, i }); }
    im.instanceMatrix.needsUpdate = true; g.add(im); SPACE.instRocks = im;
    if (D.wreck) { const wg = new THREE.BoxGeometry(1, 0.35, 2.2), wm = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.55, metalness: 0.7 }), wn = D.wreck, wi = new THREE.InstancedMesh(wg, wm, wn);
      for (let i = 0; i < wn; i++) { const a = rs() * TAU, rr = 60 + rs() * 900, s = 3 + rs() * 22, p = new THREE.Vector3(Math.cos(a) * rr, (rs() - 0.5) * 260, Math.sin(a) * rr); m4.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(rs() * 6, rs() * 6, rs() * 6)), new THREE.Vector3(s, s * (0.5 + rs()), s)); wi.setMatrixAt(i, m4); SPACE.rocks.push({ p, r: s * 0.8, wreck: true }); }
      wi.instanceMatrix.needsUpdate = true; g.add(wi); }
  }
  // bolts: two pooled instanced meshes (hot core, additive)
  SPACE.bolts = { list: [], free: [], mesh: {} };
  const bg = new THREE.BoxGeometry(0.22, 0.22, 7); bg._shared = true;
  for (const team of ['player', 'foe', 'jedi', 'ally']) { const c = SPACE.TEAMCOL[team], m = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] * 5 + 0.6, c[1] * 5 + 0.6, c[2] * 5 + 0.6), toneMapped: false }), 160); m.count = 0; m.frustumCulled = false; g.add(m); SPACE.bolts.mesh[team] = m; }
  SPACE.missiles = []; SPACE.booms = []; SPACE.ships = []; SPACE.kills = 0; SPACE.tagKills = {}; SPACE.alert = 0; SPACE.t = 0; SPACE.oi = -1; SPACE.obj = null; SPACE.markers = [];
  // the player
  const kind = def.hull || SHIP.kind(); SPACE.P = SPACE.spawn(kind, { team: 'player', at: def.start || [0, 0, -400], yaw: def.startYaw || 0 });
  const H = SHIP.HULLS[kind], P = SPACE.P; P.shield = P.shieldMax = Math.round(H.hp * 0.45); P.boost = 1; P.missileCd = 0; P.roll = 0; P.rollT = 0; P.lockT = 0; P.domT = 0; P.yaw = def.startYaw || 0; P.pitch = 0; P.bank = 0; P.regenT = 0;
  SPACE.camPos = new THREE.Vector3().copy(P.pos).add(V3(0, 6, -26)); SPACE.camLook = P.pos.clone();
  SPACE.hudInit();
  // env reflection
  const env = new THREE.Scene(); env.background = new THREE.Color(0.02, 0.025, 0.04); R.setEnvFromScene(env);
};
/* ---------------------------------------------------------------- ships */
SPACE.spawn = function (kind, o) {
  o = o || {}; const H = SHIP.HULLS[kind], g = SHIP.build(kind); SPACE.g.add(g);
  const at = Array.isArray(o.at) ? o.at : [0, 0, 0], s = { kind, H, g, pos: new THREE.Vector3(at[0], at[1], at[2]), vel: new THREE.Vector3(), yaw: o.yaw || 0, pitch: 0, bank: 0, speed: H.speed * (o.speedK || 1),
    hp: H.hp * (o.hpK || 1), hpMax: H.hp * (o.hpK || 1), team: o.team || 'foe', ai: o.ai || H.ai, tag: o.tag || kind, alive: true, cd: rnd(0.5, 2), t: 0, r: H.rad * 0.85, name: o.name || H.name, dominable: !!o.dominable, goal: o.goal || null, path: o.path || null, pi: 0,
    burst: 0, evade: 0, ev: new THREE.Vector3(), fwd: new THREE.Vector3(0, 0, 1), sensor: o.sensor || null, hidden: !!o.hidden, invuln: !!o.invuln, boltTeam: o.boltTeam || (o.team === 'player' ? 'player' : kind === 'jediStarfighter' ? 'jedi' : o.team === 'ally' ? 'ally' : 'foe'), onDie: o.onDie || null, maxHpK: 1 };
  SPACE.ships.push(s); SPACE.orient(s); return s;
};
SPACE.orient = function (s) {
  _se1.set(-s.pitch, s.yaw, s.bank + (s.roll || 0), 'YXZ'); s.g.quaternion.setFromEuler(_se1); s.g.position.copy(s.pos);
  s.fwd.set(Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), Math.cos(s.yaw) * Math.cos(s.pitch));
};
SPACE.foes = (team) => SPACE.ships.filter((s) => s.alive && !s.hidden && s.team !== team && (team === 'player' ? s.team !== 'ally' : s.team === 'player' || s.team === 'ally') && !s.dominated);
SPACE.damage = function (s, amt, src) {
  if (!s.alive || s.invuln || s.dominated) return;
  if (s === SPACE.P) {
    if (s.rollT > 0) return;   // barrel roll: untouchable
    s.regenT = 0; if (s.shield > 0) { const a = Math.min(s.shield, amt); s.shield -= a; amt -= a; SPACE.hud.flash('shield'); } if (amt > 0) { s.hp -= amt; FX.addShake(0.25); TOUCH.buzz(25); HUD.hurt(); }
    if (s.domT > 0) { s.domT = 0; HEAT.add(4, 'dominate-broken'); HUD.toast('CONCENTRATION', 'BROKEN', 1.4); }
    if (s.hp <= 0) { s.hp = 0; SPACE.kill(s); SPACE.finish({ fail: true }); }
    return;
  }
  s.hp -= amt; s.flash = 0.1; s.provoked = true;
  if (s.hp <= 0) { if (s.dominable && !s.allowKill) { s.hp = 1; return; } SPACE.kill(s, src); }
};
SPACE.kill = function (s, src) {
  s.alive = false; SPACE.boom(s.pos, s.H.rad * 1.4, s.team === 'player' ? [1, 0.3, 0.1] : [1, 0.55, 0.2]);
  if (s.team !== 'player') { if (src === SPACE.P || (src && src.team === 'player')) { SPACE.kills++; SPACE.tagKills[s.tag] = (SPACE.tagKills[s.tag] || 0) + 1; COMBAT.stylePoint && 0; } if (s.onDie) s.onDie(s); }
  s.g.visible = false;
};
/* explosion: additive expanding shell + sparks + a light pop */
SPACE.boom = function (p, r, col) {
  const m = new THREE.Mesh(SPACE._boomG || (SPACE._boomG = new THREE.IcosahedronGeometry(1, 2)), new THREE.MeshBasicMaterial({ color: new THREE.Color(col[0] * 4, col[1] * 3, col[2] * 2), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.copy(p); SPACE.g.add(m); SPACE.booms.push({ m, t: 0, r, life: 0.9 });
  FX.spark(p, V3(0, 1, 0), 30, 30 + r * 2, [4, 2.2, 1.0], 1.2); FX.flashLight(p, col, 30, r * 6, 0.4);
  if (SPACE.P && p.distanceTo(SPACE.P.pos) < 220) FX.addShake(0.35 * (1 - p.distanceTo(SPACE.P.pos) / 220));
};
/* ---------------------------------------------------------------- bolts */
SPACE.fire = function (from, dir, team, dmg, speed, owner) {
  const B = SPACE.bolts, b = B.free.pop() || { p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion() };
  b.p.copy(from); b.v.copy(dir).normalize().multiplyScalar(speed || 420); b.life = 1.7; b.team = team; b.dmg = dmg; b.owner = owner; b.q.setFromUnitVectors(_sv1.set(0, 0, 1), _sv2.copy(dir).normalize()); B.list.push(b);
};
SPACE.updBolts = function (dt) {
  const B = SPACE.bolts, m4 = SPACE._m4 || (SPACE._m4 = new THREE.Matrix4()), one = SPACE._one || (SPACE._one = new THREE.Vector3(1, 1, 1)), cnt = { player: 0, foe: 0, jedi: 0, ally: 0 };
  for (let i = B.list.length - 1; i >= 0; i--) {
    const b = B.list[i]; b.life -= dt; const p0 = _sv1.copy(b.p); b.p.addScaledVector(b.v, dt);
    let hit = null;
    for (const s of SPACE.ships) { if (!s.alive || s === b.owner || (b.team === 'player' && (s.team === 'player' || s.team === 'ally')) || (b.team !== 'player' && b.team !== 'ally' && s.team !== 'player' && s.team !== 'ally')) continue;
      // segment p0→p vs sphere
      const d = _sv2.subVectors(b.p, p0), f = _sv3.subVectors(p0, s.pos), a = d.dot(d), bb = 2 * f.dot(d), c = f.dot(f) - s.r * s.r, disc = bb * bb - 4 * a * c;
      if (disc >= 0) { const t = (-bb - Math.sqrt(disc)) / (2 * a); if (t >= 0 && t <= 1) { hit = s; break; } } }
    if (!hit && SPACE.rocks.length && b.life > 0) for (const r of SPACE.rocks) { if (b.p.distanceToSquared(r.p) < r.r * r.r) { hit = 'rock'; break; } }
    if (hit || b.life <= 0) {
      if (hit) { FX.spark(b.p, _sv4.copy(b.v).normalize().negate(), 8, 18, b.team === 'player' ? [4, 0.6, 0.3] : [1.2, 4, 1.4], 0.5); if (hit !== 'rock') SPACE.damage(hit, b.dmg, b.owner); }
      B.list.splice(i, 1); B.free.push(b); continue;
    }
    const mesh = B.mesh[b.team], k = cnt[b.team]++; if (k < 160) { m4.compose(b.p, b.q, one); mesh.setMatrixAt(k, m4); }
  }
  for (const t in B.mesh) { B.mesh[t].count = Math.min(160, cnt[t]); B.mesh[t].instanceMatrix.needsUpdate = true; }
};
/* homing missiles (player) */
SPACE.launch = function (P, tgt) {
  const m = new THREE.Mesh(SPACE._misG || (SPACE._misG = new THREE.ConeGeometry(0.35, 2.4, 6).rotateX(Math.PI / 2)), new THREE.MeshBasicMaterial({ color: 0xffd0a0, toneMapped: false }));
  m.position.copy(P.pos).addScaledVector(P.fwd, P.H.len * 0.4); SPACE.g.add(m); SPACE.missiles.push({ m, v: P.fwd.clone().multiplyScalar(P.speed + 40), tgt, life: 6, dmg: 160 });
};
SPACE.updMissiles = function (dt) {
  for (let i = SPACE.missiles.length - 1; i >= 0; i--) {
    const M = SPACE.missiles[i]; M.life -= dt; const t = M.tgt;
    if (t && t.alive) { const want = _sv1.subVectors(t.pos, M.m.position).normalize().multiplyScalar(190); M.v.lerp(want, 1 - Math.exp(-2.6 * dt)); }
    M.m.position.addScaledVector(M.v, dt); M.m.lookAt(_sv2.copy(M.m.position).add(M.v));
    if (Math.random() < 0.6) FX.puff(M.m.position, 1, { size: 0.9, grow: 3, col: [0.7, 0.65, 0.6], a: 0.35, life: 0.8, spread: 0.2 });
    const hit = t && t.alive && M.m.position.distanceTo(t.pos) < t.r + 2;
    if (hit || M.life <= 0) { if (hit) { SPACE.damage(t, M.dmg, SPACE.P); SPACE.boom(M.m.position, 6, [1, 0.6, 0.3]); } SPACE.g.remove(M.m); SPACE.missiles.splice(i, 1); }
  }
};
/* ---------------------------------------------------------------- player flight */
SPACE.flyPlayer = function (dt) {
  const P = SPACE.P, H = P.H; if (!P.alive) return;
  const turn = H.turn * (P.braking ? 1.25 : 1), mx = IN.A.mx, my = IN.A.my;
  P.yawR = damp(P.yawR || 0, -mx * turn, 7, dt); P.pitchR = damp(P.pitchR || 0, (TOUCH.cfg.invertY ? my : -my) * turn * 0.85, 7, dt);
  P.yaw += P.yawR * dt; P.pitch = clamp(P.pitch + P.pitchR * dt, -1.15, 1.15);
  P.bank = damp(P.bank, clamp(P.yawR * 0.55, -0.95, 0.95), 5, dt);
  // speed
  const boost = IN.down('boost') && P.boost > 0.02, brake = IN.down('brake'); P.braking = brake;
  if (boost) P.boost = Math.max(0, P.boost - dt * 0.32); else P.boost = Math.min(1, P.boost + dt * 0.16);
  const vT = H.speed * (boost ? 1.8 : brake ? 0.4 : 1); P.speed = damp(P.speed, vT, boost ? 2.2 : 3, dt); P.boosting = boost;
  // barrel roll (tap): spin + sidestep in the stick direction, untouchable for its duration
  if (IN.hit('roll') && P.rollT <= 0) { P.rollT = 0.6; P.rollDir = mx < -0.2 ? 1 : mx > 0.2 ? -1 : (RNG() < 0.5 ? 1 : -1); TOUCH.buzz(10); }
  if (P.rollT > 0) { P.rollT -= dt; P.roll = (1 - P.rollT / 0.6) * TAU * P.rollDir; const side = _sv1.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); P.pos.addScaledVector(side, -P.rollDir * 26 * dt); if (P.rollT <= 0) P.roll = 0; }
  SPACE.orient(P);
  P.pos.addScaledVector(P.fwd, P.speed * dt);
  // the play volume: past the edge the autopilot turns you back in
  const lim = SPACE.def.bounds || 2400, dc = P.pos.length();
  if (dc > lim) { const want = Math.atan2(-P.pos.x, -P.pos.z); P.yaw = dampA(P.yaw, want, 1.2, dt); P.pitch = damp(P.pitch, 0, 1, dt); if (!SPACE._oobT || MG.rt - SPACE._oobT > 3) { SPACE._oobT = MG.rt; HUD.hint('Leaving the operation area — turning back', 2); } }
  // shields regenerate after a lull
  P.regenT += dt; if (P.regenT > 3.5) P.shield = Math.min(P.shieldMax, P.shield + dt * P.shieldMax * 0.12);
  // collisions: rocks/wrecks and hulls
  for (const r of SPACE.rocks) { const d = P.pos.distanceTo(r.p); if (d < r.r + P.r) { const n = _sv1.subVectors(P.pos, r.p).normalize(); P.pos.copy(r.p).addScaledVector(n, r.r + P.r + 0.5); const imp = P.speed * 0.4; SPACE.damage(P, imp, null); P.speed *= 0.35; P.yaw += (RNG() - 0.5) * 0.6; FX.spark(P.pos, n, 20, 20, [3, 2, 1.2], 0.8); FX.addShake(0.6); break; } }
  for (const s of SPACE.ships) { if (s === P || !s.alive || s.hidden) continue; const d = P.pos.distanceTo(s.pos); if (d < s.r + P.r) { const n = _sv1.subVectors(P.pos, s.pos).normalize(); P.pos.copy(s.pos).addScaledVector(n, s.r + P.r + 0.5); SPACE.damage(P, 30, s); SPACE.damage(s, 60, P); P.speed *= 0.5; } }
  // targeting: the foe nearest the reticle within a cone (or the manual lock while it lasts)
  if (IN.hit('lock')) { const C = SPACE.inCone(P, 0.45, 1400).filter((s) => s !== P.target); P.target = C[0] || null; P.manual = MG.rt; }
  if (!P.target || !P.target.alive || P.target.dominated || (MG.rt - (P.manual || -9) > 6 && P.target !== SPACE.inCone(P, 0.25, 1000)[0])) { P.target = SPACE.inCone(P, 0.25, 1000)[0] || (P.target && P.target.alive && !P.target.dominated ? P.target : null); }
  const T = P.target, tA = T ? SPACE.angTo(P, T.pos) : 9;
  if (T && tA < 0.2 && P.pos.distanceTo(T.pos) < 900) P.lockT = Math.min(1, P.lockT + dt / 0.6); else P.lockT = Math.max(0, P.lockT - dt * 2);
  // guns: alternating muzzles, aim assist to the lead point inside a 10° cone
  P.cd -= dt;
  if (IN.down('fire') && P.cd <= 0) {
    const mz = SHIP.muzzles(P.g, SPACE._mz || (SPACE._mz = [])), k = (P.gi = ((P.gi || 0) + 1) % Math.max(1, mz.length)), from = mz.length ? mz[k] : P.pos;
    let dir = _sv2.copy(P.fwd);
    if (T && tA < 0.18) { const dist = from.distanceTo(T.pos), tt = dist / 420, lead = _sv3.copy(T.fwd).multiplyScalar(T.speed * tt).add(T.pos); dir = _sv2.subVectors(lead, from).normalize(); }
    SPACE.fire(from, dir, 'player', H.dmg, 420 + P.speed, P); P.cd = Math.max(0.09, H.shot * (H.guns > 4 ? 0.9 : 1.15)); SPACE.hud.kick();
  }
  // missile (tap): needs a lock
  P.missileCd = Math.max(0, P.missileCd - dt);
  if (IN.hit('missile')) { if (T && P.lockT >= 1 && P.missileCd <= 0) { SPACE.launch(P, T); P.missileCd = 6; TOUCH.buzz(15); } else HUD.hint('Hold the reticle on a target to lock a missile', 1.6); }
  // DOMINATE (hold): Force-crush a crippled, dominable hull
  const DT = SPACE.domTarget();
  if (DT && IN.down('dominate')) {
    const dur = 2.6 - 0.35 * Math.max(0, POWERS.rank('dominate') - 1); P.domT += dt; DT.speed = damp(DT.speed, 4, 1.5, dt); DT.domShake = P.domT / dur;
    if (Math.random() < 0.5) FX.spark(_sv1.copy(DT.pos).add(_sv2.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(DT.r)), V3(0, 1, 0), 6, 12, [3.5, 0.5, 0.3], 0.6);
    FX.addShake(0.03 + 0.1 * DT.domShake); TOUCH.buzz(5);
    if (P.domT >= dur) { P.domT = 0; SPACE.dominate(DT); }
  } else if (P.domT > 0) P.domT = Math.max(0, P.domT - dt * 2);
  SHIP.thrust(P.g, (P.speed / H.speed) * (boost ? 1 : 0.7));
};
SPACE.domTarget = function () { const P = SPACE.P; if (!P || !(POWERS.has('dominate') || SPACE.def.teachDominate)) return null; for (const s of SPACE.ships) if (s.alive && s.dominable && !s.dominated && s.hp <= s.hpMax * 0.35 && P.pos.distanceTo(s.pos) < 360 && SPACE.angTo(P, s.pos) < 0.5) return s; return null; };
SPACE.domReady = () => !!(SPACE.on && SPACE.domTarget());
SPACE.dominate = function (s) {
  s.dominated = true; s.speed = 0; s.crush = 0; HEAT.force && HEAT.force('dominate');
  HUD.toast('THE FORCE', 'DOMINATED', 2.4); FX.addShake(0.8); TOUCH.buzz(60); SPACE.boom(s.pos, s.r * 0.6, [1, 0.2, 0.1]);
  if (s.onDominate) s.onDominate(s); SPACE.event('dominate', s);
};
SPACE.inCone = function (P, cone, range) {
  const out = [];
  for (const s of SPACE.ships) { if (!s.alive || s.team === 'player' || s.team === 'ally' || s.hidden || s.dominated) continue; const d = P.pos.distanceTo(s.pos); if (d > range) continue; const a = SPACE.angTo(P, s.pos); if (a < cone) out.push([a + d / range * 0.1, s]); }
  return out.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
};
SPACE.angTo = function (s, p) { const d = _sv4.subVectors(p, s.pos).normalize(); return Math.acos(clamp(d.dot(s.fwd), -1, 1)); };
/* ---------------------------------------------------------------- AI */
SPACE.think = function (s, dt) {
  if (!s.alive) return; s.t += dt; s.cd -= dt;
  if (s.dominated) { s.crush = Math.min(1, (s.crush || 0) + dt * 0.6); s.g.scale.set(1 + 0.15 * s.crush, 1 - 0.35 * s.crush, 1 - 0.12 * s.crush); s.pitch += dt * 0.25; s.bank += dt * 0.4; s.pos.addScaledVector(s.fwd, 3 * dt); SPACE.orient(s); SHIP.thrust(s.g, 0); return; }
  const H = s.H, P = SPACE.P; let tgt = null;
  if (s.team === 'ally') { let bd = 1e9; for (const o of SPACE.ships) if (o.alive && o.team === 'foe' && !o.hidden) { const d = o.pos.distanceTo(s.pos); if (d < bd) { bd = d; tgt = o; } } }
  else tgt = s.target || (P && P.alive ? P : null);
  if (s.domShake) { s.g.position.x += (Math.random() - 0.5) * s.domShake * 0.6; s.domShake = Math.max(0, s.domShake - dt); }
  const steerTo = (p, k) => { const dx = p.x - s.pos.x, dy = p.y - s.pos.y, dz = p.z - s.pos.z, wy = Math.atan2(dx, dz), wp = Math.atan2(dy, Math.hypot(dx, dz)); const dyaw = wrapA(wy - s.yaw);
    s.yaw += clamp(dyaw, -H.turn * k * dt, H.turn * k * dt); s.pitch += clamp(wp - s.pitch, -H.turn * 0.7 * k * dt, H.turn * 0.7 * k * dt); s.pitch = clamp(s.pitch, -1.1, 1.1); s.bank = damp(s.bank, clamp(dyaw * 0.9, -0.9, 0.9), 3, dt); };
  if (s.ai === 'fighter' && tgt) {
    const d = s.pos.distanceTo(tgt.pos);
    if (s.evade > 0) { s.evade -= dt; steerTo(_sv1.copy(s.pos).add(s.ev), 1.2); }
    else { const lead = _sv1.copy(tgt.fwd || _sv2.set(0, 0, 1)).multiplyScalar((tgt.speed || 0) * Math.min(1.5, d / 400)).add(tgt.pos); steerTo(lead, 1); if (d < 60 + s.r * 2) { s.evade = rnd(1.4, 2.6); s.ev.set(rnd(-1, 1), rnd(-0.4, 0.6), rnd(-1, 1)).normalize().multiplyScalar(400); } }
    s.speed = damp(s.speed, H.speed * (d > 600 ? 1.25 : 1), 1, dt);
    if (s.cd <= 0 && d < 560 && SPACE.angTo(s, tgt.pos) < 0.16) { const mz = SHIP.muzzles(s.g, s._mz || (s._mz = [])); for (let i = 0; i < Math.min(2, mz.length || 1); i++) { const from = mz[i] || s.pos, sp = (SPACE.def.acc || 0.035); const dir = _sv2.subVectors(tgt.pos, from).normalize(); dir.x += rnd(-sp, sp); dir.y += rnd(-sp, sp); dir.z += rnd(-sp, sp); SPACE.fire(from, dir, s.boltTeam, H.dmg, 300, s); } s.burst++; s.cd = s.burst % 3 === 0 ? rnd(1.4, 2.4) : 0.22; }
  } else if (s.ai === 'freighter' || s.ai === 'dropship' || s.ai === 'capital') {
    if (s.path && s.path.length) { const wp = s.path[s.pi]; const p = _sv1.set(wp[0], wp[1], wp[2]); steerTo(p, 1); if (s.pos.distanceTo(p) < 40 + s.r) { s.pi++; if (s.pi >= s.path.length) { s.path = null; if (s.onArrive) s.onArrive(s); } } }
    else if (s.goal) { steerTo(_sv1.set(s.goal[0], s.goal[1], s.goal[2]), 1); if (s.pos.distanceTo(_sv1) < s.r + 30 && !s.arrived) { s.arrived = true; SPACE.event('arrive', s); } }
    // turrets: fire at the nearest hostile in range from any bearing
    if (tgt && s.cd <= 0 && s.pos.distanceTo(tgt.pos) < (s.ai === 'capital' ? 1400 : 520) && H.guns > 0) { const mz = SHIP.muzzles(s.g, s._mz || (s._mz = [])), from = mz.length ? mz[Math.floor(Math.random() * mz.length)] : s.pos, sp = 0.05; const dir = _sv2.subVectors(_sv3.copy(tgt.pos).addScaledVector(tgt.fwd || _sv4.set(0, 0, 0), (tgt.speed || 0) * 0.6), from).normalize(); dir.x += rnd(-sp, sp); dir.y += rnd(-sp, sp); dir.z += rnd(-sp, sp); SPACE.fire(from, dir, s.boltTeam, H.dmg, s.ai === 'capital' ? 240 : 280, s); s.cd = s.ai === 'capital' ? 0.5 : rnd(0.5, 1.0); }
  } else if (s.ai === 'static') {
    s.speed = 0; s.yaw += (s.spin || 0) * dt;
    if (tgt && s.provoked && s.cd <= 0 && s.pos.distanceTo(tgt.pos) < 600) { const mz = SHIP.muzzles(s.g, s._mz || (s._mz = [])), from = mz[0] || s.pos; SPACE.fire(from, _sv2.subVectors(tgt.pos, from).normalize(), s.boltTeam, H.dmg, 300, s); s.cd = 0.6; }
  }
  if (s.ai !== 'static') s.pos.addScaledVector(s.fwd, s.speed * dt);
  // rocks: AI ships slide around them
  for (const r of SPACE.rocks) { const d = s.pos.distanceTo(r.p); if (d < r.r + s.r + 6) { const n = _sv1.subVectors(s.pos, r.p).normalize(); s.pos.copy(r.p).addScaledVector(n, r.r + s.r + 6); } }
  SPACE.orient(s); SHIP.thrust(s.g, s.speed / Math.max(1, H.speed));
  if (s.flash > 0) s.flash -= dt;
};
/* stealth: picket sensor cones raise SPACE.alert while the player sits inside one */
SPACE.sense = function (dt) {
  const P = SPACE.P; let inCone = false;
  for (const s of SPACE.ships) { if (!s.alive || !s.sensor) continue; const S2 = s.sensor; S2.a = (S2.a || 0) + dt * (S2.spin || 0.25); const dir = _sv1.set(Math.sin(s.yaw + S2.a), 0, Math.cos(s.yaw + S2.a)); if (S2.cone) { S2.cone.position.copy(s.pos); S2.cone.quaternion.setFromUnitVectors(_sv2.set(0, 1, 0), _sv3.copy(dir).negate()); }
    const d = _sv2.subVectors(P.pos, s.pos), L = d.length(); if (L > S2.range) continue; d.normalize(); if (d.dot(dir) > Math.cos(S2.half)) { inCone = true; SPACE.alert = Math.min(100, SPACE.alert + dt * (30 + (1 - L / S2.range) * 60) * (P.boosting ? 1.8 : 1)); } }
  if (!inCone) SPACE.alert = Math.max(0, SPACE.alert - dt * 8);
  if (SPACE.alert >= 100 && !SPACE.detected) { SPACE.detected = true; SPACE.event('detected'); }
};
SPACE.addSensor = function (s, range, half, spin) {
  const h = range, g = new THREE.ConeGeometry(Math.tan(half) * h, h, 24, 1, true); g.translate(0, -h / 2, 0);
  const cone = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x40a0ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); SPACE.g.add(cone);
  s.sensor = { range, half, spin: spin || 0.22, cone, a: 0 };
};
/* ---------------------------------------------------------------- objectives */
SPACE.event = function (kind, s) { const O = SPACE.obj; if (O && O.on && O.on[kind]) O.on[kind](s); if (SPACE.def.on && SPACE.def.on[kind]) SPACE.def.on[kind](s); };
SPACE.nextObj = function () {
  SPACE.oi++; const L = SPACE.def.objectives || []; if (SPACE.oi >= L.length) { SPACE.finish({ rank: SPACE.rank() }); return; }
  const O = SPACE.obj = Object.assign({ t: 0, n: 0 }, L[SPACE.oi]); MISSION.obj(O.text || ''); if (O.hint) HUD.hint(O.hint, O.hintT || 6);
  if (O.type === 'reach') SPACE.marker(O.at, O.r || 80);
  if (O.start) O.start(SPACE, O);
};
SPACE.objUpdate = function (dt) {
  const O = SPACE.obj; if (!O || SPACE.done) return; O.t += dt; let ok = false;
  if (O.type === 'reach') ok = SPACE.P.pos.distanceTo(_sv1.set(O.at[0], O.at[1], O.at[2])) < (O.r || 80);
  else if (O.type === 'destroy') { const n = SPACE.ships.filter((s) => s.tag === O.tag && !s.alive).length; O.n = n; if (O.count) MISSION.obj(O.text + '  ' + Math.min(n, O.count) + '/' + O.count); ok = n >= (O.count || 1); }
  else if (O.type === 'survive') ok = O.t >= O.time;
  else if (O.type === 'cripple') ok = SPACE.ships.some((s) => s.tag === O.tag && s.alive && s.hp <= s.hpMax * 0.35);
  else if (O.type === 'dominate') ok = SPACE.ships.some((s) => s.tag === O.tag && s.dominated);
  else if (O.type === 'custom') ok = O.check(SPACE, O, dt);
  if (O.fail && O.fail(SPACE, O)) { SPACE.finish({ fail: true }); return; }
  if (O.update) O.update(SPACE, O, dt);
  if (ok) { if (O.done) O.done(SPACE, O); SPACE.clearMarkers(); MG.after(0.4, () => SPACE.nextObj()); SPACE.obj = null; }
};
SPACE.marker = function (at, r) { const m = new THREE.Mesh(new THREE.TorusGeometry(r * 0.35, r * 0.02, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff5a40, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.position.set(at[0], at[1], at[2]); SPACE.g.add(m); SPACE.markers.push(m); SPACE.wp = m; return m; };
SPACE.clearMarkers = function () { for (const m of SPACE.markers) SPACE.g.remove(m); SPACE.markers = []; SPACE.wp = null; };
SPACE.rank = function () { const t = SPACE.t, par = SPACE.def.par || 240, hpK = SPACE.P ? SPACE.P.hp / SPACE.P.hpMax : 0; const sc = (t < par ? 1 : par / t) * 0.6 + hpK * 0.4; return sc > 0.85 ? 'S' : sc > 0.7 ? 'A' : sc > 0.5 ? 'B' : 'C'; };
/* ---------------------------------------------------------------- per frame */
SPACE.update = function (dt) {
  if (!SPACE.on || !SPACE.P) return; SPACE.t += dt;
  if (!SPACE.done) SPACE.flyPlayer(dt);
  for (const s of SPACE.ships) if (s !== SPACE.P) SPACE.think(s, dt);
  SPACE.updBolts(dt); SPACE.updMissiles(dt);
  if (SPACE.ships.some((s) => s.sensor)) SPACE.sense(dt);
  for (let i = SPACE.booms.length - 1; i >= 0; i--) { const b = SPACE.booms[i]; b.t += dt; const u = b.t / b.life; b.m.scale.setScalar(b.r * (0.3 + 1.6 * easeOut(u))); b.m.material.opacity = 1 - u; if (u >= 1) { SPACE.g.remove(b.m); b.m.material.dispose(); SPACE.booms.splice(i, 1); } }
  if (SPACE.instRocks) { /* rocks are static: no per-frame matrix uploads */ }
  if (SPACE.wp) SPACE.wp.rotation.y += dt * 0.6, SPACE.wp.lookAt(R.camera.position);
  SPACE.objUpdate(dt); if (SPACE.def.onUpdate) SPACE.def.onUpdate(SPACE, dt);
  SPACE.camera(dt); SPACE.hudUpdate(dt);
};
SPACE.camera = function (dt) {
  const P = SPACE.P, cam = R.camera, H = P.H, k = clamp(H.len / 14, 0.8, 3.2);
  const back = (P.boosting ? 15 : 12) * k, up = 3.6 * k, q = P.g.quaternion;
  const want = _sv1.set(0, up, -back); _sq1.setFromEuler(_se1.set(-P.pitch * 0.6, P.yaw, 0, 'YXZ')); want.applyQuaternion(_sq1).add(P.pos);
  // look-around with the right thumb (springs back)
  SPACE.lookX = damp((SPACE.lookX || 0) + IN.A.lx * 0.0, 0, 3, dt);
  SPACE.camPos.lerp(want, 1 - Math.exp(-7 * dt));
  const look = _sv2.copy(P.fwd).multiplyScalar(30 * k).add(P.pos); look.y += up * 0.3; SPACE.camLook.lerp(look, 1 - Math.exp(-10 * dt));
  cam.position.copy(SPACE.camPos); const s = FX.shake * FX.shake * 0.5, t = MG.rt * 31; cam.position.x += (vnoise2(t, 1.3) - 0.5) * s; cam.position.y += (vnoise2(t, 7.1) - 0.5) * s;
  cam.up.set(0, 1, 0).applyAxisAngle(_sv3.copy(P.fwd), -P.bank * 0.35); cam.lookAt(SPACE.camLook); void q;
  const fov = 62 + (P.boosting ? 16 : 0) - (P.braking ? 4 : 0); if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = damp(cam.fov, fov, 4, dt); cam.updateProjectionMatrix(); }
  SPACE.sky.position.copy(cam.position);
  // dust wraps around the camera
  const D = SPACE.dust.geometry.attributes.position, c = cam.position, a = D.array;
  for (let i = 0; i < a.length; i += 3) { let x = a[i] - c.x, y = a[i + 1] - c.y, z = a[i + 2] - c.z; if (x > 80) a[i] -= 160; else if (x < -80) a[i] += 160; if (y > 80) a[i + 1] -= 160; else if (y < -80) a[i + 1] += 160; if (z > 80) a[i + 2] -= 160; else if (z < -80) a[i + 2] += 160; }
  D.needsUpdate = true; SPACE.dust.material.size = 0.32 + (P.boosting ? 0.25 : 0);
  cam.updateMatrixWorld();
};
/* ---------------------------------------------------------------- HUD */
SPACE.CSS = `
body.space #hpBox, body.space #combo, body.space #holo { display: none !important; }
#spHud { position: fixed; inset: 0; pointer-events: none; z-index: 12; font-family: var(--f, sans-serif); color: #f2e3d6; }
#spBars { position: absolute; left: calc(14px + env(safe-area-inset-left)); top: calc(10px + env(safe-area-inset-top)); width: min(30vw, 230px); }
#spBars .l { font-size: 11px; letter-spacing: .3em; color: #c9a89e; margin: 0 0 3px; display: flex; justify-content: space-between; }
#spBars .b { height: 7px; background: rgba(20,4,3,.72); border: 1px solid rgba(255,80,60,.28); margin-bottom: 7px; transform: skewX(-20deg); overflow: hidden; }
#spBars .b i { display: block; height: 100%; width: 100%; transform-origin: left; }
#spHull i { background: linear-gradient(90deg,#7a0a04,#ff3a1e 70%,#ffb090); } #spShield i { background: linear-gradient(90deg,#0a2a5a,#3a8aff 70%,#c0e0ff); } #spBoost i { background: linear-gradient(90deg,#5a3a0a,#ffb040 70%,#fff0c0); }
#spRet { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; opacity: .85; transition: transform .06s; }
#spRet:before { content: ''; position: absolute; inset: 0; border: 2px solid rgba(255,90,70,.85); border-radius: 50%; box-shadow: 0 0 8px rgba(255,40,20,.6); }
#spRet:after { content: ''; position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; margin: -2px 0 0 -2px; background: #fff; border-radius: 50%; }
#spLead { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border: 2px solid #ffd060; transform: rotate(45deg); opacity: 0; }
.spT { position: absolute; width: 40px; height: 40px; margin: -20px 0 0 -20px; border: 1.5px solid rgba(120,255,140,.75); opacity: 0; }
.spT.foe { border-color: rgba(255,120,80,.85); } .spT.lock { border-color: #ffd060; box-shadow: 0 0 10px rgba(255,200,60,.8); } .spT.obj { border-color: #ff5a40; border-width: 2px; }
.spT b { position: absolute; left: 0; right: 0; bottom: -6px; height: 3px; background: rgba(0,0,0,.6); } .spT b i { display: block; height: 100%; background: #ff6a40; }
.spT s { position: absolute; left: 50%; top: -16px; transform: translateX(-50%); font: 700 10px var(--f, sans-serif); letter-spacing: .18em; color: #ffc8b8; text-decoration: none; white-space: nowrap; }
.spA { position: absolute; width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-bottom: 16px solid #ff5a40; opacity: 0; filter: drop-shadow(0 0 4px #f20); }
#spAlert { position: absolute; left: 50%; top: calc(60px + env(safe-area-inset-top)); transform: translateX(-50%); width: min(34vw, 260px); display: none; text-align: center; }
#spAlert .l { font-size: 11px; letter-spacing: .4em; color: #8ab8ff; } #spAlert .b { height: 5px; background: rgba(5,10,25,.7); border: 1px solid rgba(100,160,255,.35); margin-top: 3px; } #spAlert .b i { display: block; height: 100%; background: linear-gradient(90deg,#3a8aff,#ff3a3a); width: 0; }
#spDom { position: absolute; left: 50%; top: 62%; transform: translateX(-50%); width: min(40vw, 300px); text-align: center; opacity: 0; transition: opacity .2s; }
#spDom .l { font-size: 12px; letter-spacing: .45em; color: #ff8a70; text-shadow: 0 0 8px #f20; } #spDom .b { height: 6px; margin-top: 5px; border: 1px solid rgba(255,80,60,.5); background: rgba(30,4,3,.8); } #spDom .b i { display: block; height: 100%; width: 0; background: linear-gradient(90deg,#7a0a04,#ff3a1e,#fff); }
#spWarp { position: fixed; inset: 0; z-index: 13; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at center, rgba(255,255,255,.95) 0%, rgba(180,200,255,.5) 18%, rgba(0,0,0,0) 60%); transition: opacity .5s; }
#spFlashS { position: fixed; inset: 0; pointer-events: none; z-index: 11; opacity: 0; box-shadow: inset 0 0 80px 20px rgba(80,150,255,.6); transition: opacity .25s; }
`;
SPACE.hudInit = function () {
  if (!SPACE._css) { SPACE._css = 1; const st = document.createElement('style'); st.textContent = SPACE.CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.id = 'spHud';
  root.innerHTML = `<div id="spBars"><div class="l"><span>HULL</span><span id="spShip"></span></div><div class="b" id="spHull"><i></i></div><div class="l"><span>SHIELD</span></div><div class="b" id="spShield"><i></i></div><div class="l"><span>BOOST</span></div><div class="b" id="spBoost"><i></i></div></div>
    <div id="spRet"></div><div id="spLead"></div><div id="spAlert"><div class="l">SENSOR EXPOSURE</div><div class="b"><i></i></div></div><div id="spDom"><div class="l">DOMINATE</div><div class="b"><i></i></div></div><div id="spWarp"></div><div id="spFlashS"></div>`;
  document.body.appendChild(root);
  const $ = (q) => root.querySelector(q), T = [];
  for (let i = 0; i < 10; i++) { const d = document.createElement('div'); d.className = 'spT'; d.innerHTML = '<s></s><b><i></i></b>'; root.appendChild(d); T.push(d); }
  const A = []; for (let i = 0; i < 4; i++) { const d = document.createElement('div'); d.className = 'spA'; root.appendChild(d); A.push(d); }
  SPACE.hud = { root, hull: $('#spHull i'), shield: $('#spShield i'), boost: $('#spBoost i'), ret: $('#spRet'), lead: $('#spLead'), alert: $('#spAlert'), alertI: $('#spAlert i'), dom: $('#spDom'), domI: $('#spDom i'), warp: $('#spWarp'), fs: $('#spFlashS'), T, A,
    flash: (k) => { const e = SPACE.hud.fs; e.style.transition = 'none'; e.style.opacity = 0.9; requestAnimationFrame(() => { e.style.transition = 'opacity .35s'; e.style.opacity = 0; }); },
    kick: () => { SPACE.hud.kt = 0.06; } };
  $('#spShip').textContent = SPACE.P.H.name;
  TOUCH.cd.missile = () => SPACE.P ? SPACE.P.missileCd / 6 : 0;
};
SPACE.proj = function (p, out) { const v = _sv4.copy(p).project(R.camera); out[0] = (v.x * 0.5 + 0.5) * innerWidth; out[1] = (-v.y * 0.5 + 0.5) * innerHeight; out[2] = v.z; return out; };
SPACE.hudUpdate = function (dt) {
  const h = SPACE.hud, P = SPACE.P; if (!h || !P) return; const pr = SPACE._pr || (SPACE._pr = [0, 0, 0]);
  h.hull.style.transform = 'scaleX(' + sat(P.hp / P.hpMax).toFixed(3) + ')'; h.shield.style.transform = 'scaleX(' + sat(P.shield / P.shieldMax).toFixed(3) + ')'; h.boost.style.transform = 'scaleX(' + P.boost.toFixed(3) + ')';
  h.kt = Math.max(0, (h.kt || 0) - dt); h.ret.style.transform = 'scale(' + (1 + h.kt * 3).toFixed(3) + ')';
  // reticle sits where the guns point (~250 m ahead)
  SPACE.proj(_sv1.copy(P.fwd).multiplyScalar(250).add(P.pos), pr); h.ret.style.left = pr[0] + 'px'; h.ret.style.top = pr[1] + 'px'; h.ret.style.marginLeft = '-23px'; h.ret.style.right = 'auto';
  // target brackets (nearest 10 on screen)
  const list = SPACE.ships.filter((s) => s.alive && s !== P && !s.hidden).sort((a, b) => a.pos.distanceToSquared(P.pos) - b.pos.distanceToSquared(P.pos)); let k = 0, ak = 0;
  const objTag = SPACE.obj && SPACE.obj.tag;
  for (const s of list) {
    if (k >= h.T.length) break; SPACE.proj(s.pos, pr); const onS = pr[2] < 1 && pr[0] > -20 && pr[0] < innerWidth + 20 && pr[1] > -20 && pr[1] < innerHeight + 20;
    if (!onS) { if ((s.tag === objTag || s.dominable) && ak < h.A.length) { const a = h.A[ak++], cx = innerWidth / 2, cy = innerHeight / 2; let dx = pr[0] - cx, dy = pr[1] - cy; if (pr[2] > 1) { dx = -dx; dy = -dy; } const ang = Math.atan2(dy, dx), R2 = Math.min(cx, cy) * 0.82; a.style.left = (cx + Math.cos(ang) * R2 - 9) + 'px'; a.style.top = (cy + Math.sin(ang) * R2 - 8) + 'px'; a.style.transform = 'rotate(' + (ang + HALF) + 'rad)'; a.style.opacity = 0.9; } continue; }
    const d = h.T[k++], dist = s.pos.distanceTo(P.pos), sz = clamp(2600 / Math.max(30, dist) * (s.r / 6), 22, 90);
    d.style.left = pr[0] + 'px'; d.style.top = pr[1] + 'px'; d.style.width = d.style.height = sz + 'px'; d.style.margin = (-sz / 2) + 'px 0 0 ' + (-sz / 2) + 'px'; d.style.opacity = s.team === 'ally' ? 0.5 : 0.92;
    d.className = 'spT' + (s.team === 'foe' ? ' foe' : '') + (P.target === s && P.lockT >= 1 ? ' lock' : '') + (s.tag === objTag ? ' obj' : '');
    d.firstChild.textContent = (P.target === s || s.tag === objTag || s.dominable) ? s.name + ' · ' + Math.round(dist) + 'M' : '';
    d.lastChild.firstChild.style.width = (sat(s.hp / s.hpMax) * 100).toFixed(0) + '%'; d.lastChild.style.display = P.target === s || s.dominable ? 'block' : 'none';
  }
  for (; k < h.T.length; k++) h.T[k].style.opacity = 0;
  if (SPACE.wp && ak < h.A.length) { SPACE.proj(SPACE.wp.position, pr); const onS = pr[2] < 1 && pr[0] > 0 && pr[0] < innerWidth && pr[1] > 0 && pr[1] < innerHeight; if (!onS) { const a = h.A[ak++], cx = innerWidth / 2, cy = innerHeight / 2; let dx = pr[0] - cx, dy = pr[1] - cy; if (pr[2] > 1) { dx = -dx; dy = -dy; } const ang = Math.atan2(dy, dx), R2 = Math.min(cx, cy) * 0.82; a.style.left = (cx + Math.cos(ang) * R2 - 9) + 'px'; a.style.top = (cy + Math.sin(ang) * R2 - 8) + 'px'; a.style.transform = 'rotate(' + (ang + HALF) + 'rad)'; a.style.opacity = 0.9; } }
  for (; ak < h.A.length; ak++) h.A[ak].style.opacity = 0;
  // lead pip on the target
  const T = P.target; if (T && T.alive) { const tt = T.pos.distanceTo(P.pos) / 420; SPACE.proj(_sv1.copy(T.fwd).multiplyScalar(T.speed * tt).add(T.pos), pr); h.lead.style.left = pr[0] + 'px'; h.lead.style.top = pr[1] + 'px'; h.lead.style.opacity = pr[2] < 1 ? 0.9 : 0; } else h.lead.style.opacity = 0;
  const st = SPACE.ships.some((s) => s.sensor && s.alive); h.alert.style.display = st ? 'block' : 'none'; if (st) h.alertI.style.width = SPACE.alert.toFixed(1) + '%';
  const dT = SPACE.domTarget(); h.dom.style.opacity = dT ? 1 : 0; if (dT) { const dur = 2.6 - 0.35 * Math.max(0, POWERS.rank('dominate') - 1); h.domI.style.width = (sat(P.domT / dur) * 100).toFixed(1) + '%'; }
};
/* hyperspace: a white bloom in / out */
SPACE.hyper = function (arrive) { const h = SPACE.hud; if (!h) return; const w = h.warp; w.style.transition = 'none'; w.style.opacity = arrive ? 1 : 0; requestAnimationFrame(() => { w.style.transition = 'opacity ' + (arrive ? '1.1s' : '1.2s'); w.style.opacity = arrive ? 0 : 1; }); if (!arrive && SPACE.P) { SPACE.P.speed *= 3; R.kick && R.kick(0.8); } };
