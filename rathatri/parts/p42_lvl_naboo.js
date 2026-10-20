/* CHAPTER III — DUEL OF THE FATES (Naboo, Theed). Hangar → generator shaft → laser gates + melting pit. */
const NABOO = {};
NABOO.sky = function (L, o) {
  o = o || {};
  const U = { uT: { value: 0 } };
  const dome = SKY.dome(U, `void main(){ vec3 d = normalize(vD); float el = d.y;
      vec3 zen = vec3(0.16, 0.32, 0.72), hor = vec3(0.95, 0.72, 0.48), low = vec3(0.5, 0.45, 0.42);
      vec3 c = mix(hor, zen, smoothstep(0.0, 0.55, el)); c = mix(low, c, smoothstep(-0.2, 0.02, el));
      vec3 sd = normalize(vec3(0.3, 0.35, 1.0)); float s = max(dot(d, sd), 0.0);
      c += vec3(1.6, 1.1, 0.6) * pow(s, 18.0) + vec3(30.0, 24.0, 16.0) * smoothstep(0.9993, 0.9997, s);
      float cl = smoothstep(0.55, 0.8, fb(d.xz / max(0.1, el + 0.15) * 1.2 + uT * 0.004)); c = mix(c, vec3(1.1, 1.0, 0.95), cl * 0.45 * smoothstep(0.02, 0.2, el));
      gl_FragColor = vec4(c * ${o.k || '1.0'}, 1.0); }`);
  LEVEL.add(dome); L.updates.push((dt, t) => { U.uT.value = t; });
  const env = new THREE.Scene(); env.add(new THREE.Mesh(dome.geometry, dome.material));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(200, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.4, 0.35) })); floor.rotation.x = -HALF; floor.position.y = -2; env.add(floor);
  L.env = env;
  return dome;
};
/* Theed skyline beyond the hangar mouth: domes, colonnades, a waterfall haze */
NABOO.theed = function (cx, cz, n) {
  const g = new THREE.Group(), stone = new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.8, envMapIntensity: 0.6 }), dome = new THREE.MeshStandardMaterial({ color: 0x5a8a78, roughness: 0.4, metalness: 0.4 });
  const rs = MG.rs('theed');
  for (let i = 0; i < (n || 26); i++) {
    const x = cx + (rs() - 0.5) * 360, z = cz + 60 + rs() * 260, w = 12 + rs() * 22, h = 10 + rs() * 30;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), stone); b.position.set(x, h / 2 - 12, z); g.add(b);
    if (rs() < 0.6) { const d = new THREE.Mesh(new THREE.SphereGeometry(w * 0.42, 20, 10, 0, TAU, 0, HALF), rs() < 0.5 ? dome : stone); d.position.set(x, h - 12, z); g.add(d); }
    if (rs() < 0.3) { const t = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.6, h * 1.6, 12), stone); t.position.set(x + w * 0.4, h * 0.8 - 12, z - w * 0.3); g.add(t); }
  }
  LEVEL.add(g); return g;
};
LEVEL.def('hangar', {
  chapter: 'CHAPTER III', name: 'THEED HANGAR', world: 'naboo', cast: ['guard', 'gungan', 'panaka', 'quigon', 'obiwan'],
  tex: ['marble', 'nabooWall', 'metalPanel', 'hull'],
  start: [0, 0, -22, 0], checkpoints: [[0, 0, -22, 0], [0, 0, -6, 0]], killY: -20,
  async build(L) {
    const niche = TEX.mat('nabooWall', { color: 0x9a8a70, env: 0.4 }), bronze = PROPS.m('bronze', { color: 0x8a6a3a, metalness: 1, roughness: 0.35 });
    const floor = TEX.mat('marble', { color: 0xa8a4a0, env: 1.0, rough: 0.35, refl: 0.9 }), wall = TEX.mat('nabooWall', { env: 0.6 }), trim = TEX.mat('nabooWall', { color: 0x8a7a64 }), metal = TEX.mat('metalPanel', { color: 0xb0b0b8, env: 0.8 });
    const X = 20, Z0 = -30, Z1 = 42, H = 18;
    KIT.box(-X, -1, Z0, X, 0, Z1 + 12, floor);
    // side walls with pilasters and a clerestory of windows
    for (const s of [-1, 1]) {
      KIT.box(s * X, 0, Z0, s * (X + 1), 10, Z1, wall);
      KIT.box(s * X, 15.5, Z0, s * (X + 1), H, Z1, wall);
      for (let z = Z0; z <= Z1; z += 6) { KIT.box(s * (X - 0.7), 0, z - 0.8, s * X, H, z + 0.8, trim); }
      PHY.box(Math.min(s * X, s * (X + 1)), 10, Z0, Math.max(s * X, s * (X + 1)), 15.5, Z1);
      KIT.box(s * (X - 0.3), 9.6, Z0, s * X, 10.2, Z1, trim, { col: false });
      // arched niches between the pilasters, each with a bronze sconce
      for (let z = Z0 + 3; z < Z1; z += 6) {
        const sh = new THREE.Shape(); sh.moveTo(-1.6, 0); sh.lineTo(1.6, 0); sh.lineTo(1.6, 5.4); sh.absarc(0, 5.4, 1.6, 0, PI, false); sh.lineTo(-1.6, 0);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.08, bevelSegments: 2, curveSegments: 20 });
        KIT.geo(g, niche, new THREE.Matrix4().compose(V3(s * (X - 0.04), 1.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s * -HALF, 0)), V3(1, 1, 1)), { worldUV: true });
        KIT.geo(new THREE.TorusGeometry(1.72, 0.1, 8, 24, PI), trim, new THREE.Matrix4().compose(V3(s * (X - 0.12), 6.6, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, HALF, 0)), V3(1, 1, 1)));
        KIT.lathe([[0, 0], [0.16, 0.02], [0.2, 0.18], [0.12, 0.3], [0, 0.3]], s * (X - 0.35), 4.2, z, bronze, { seg: 12 });
        KIT.geo(new THREE.SphereGeometry(0.09, 10, 8), KIT.emis(0xffc890, 6), new THREE.Matrix4().makeTranslation(s * (X - 0.35), 4.55, z));
      }
    }
    // back wall with the palace door
    KIT.box(-X, 0, Z0 - 1, -3.5, H, Z0, wall); KIT.box(3.5, 0, Z0 - 1, X, H, Z0, wall); KIT.box(-3.5, 7, Z0 - 1, 3.5, H, Z0, wall);
    KIT.box(-3.5, -1, Z0 - 8, 3.5, 0, Z0 - 1, floor); KIT.box(-3.5, 7, Z0 - 8, 3.5, 8, Z0 - 1, trim); for (const s of [-1, 1]) KIT.box(s * 3.5, 0, Z0 - 8, s * 4.5, 8, Z0 - 1, wall);
    KIT.box(-4.2, 7, Z0 - 0.2, 4.2, 7.6, Z0 + 0.6, trim, { col: false });
    // back wall dressing: pilasters, arched niches, cornice, and a grand arch over the palace door
    for (const x of [-17, -11, -5.2, 5.2, 11, 17]) KIT.bbox(x - 0.8, 0, Z0, x + 0.8, H, Z0 + 0.7, trim, { c: 0.08, col: false });
    for (const x of [-14, -8, 8, 14]) {
      if (Math.abs(x) < 7) continue;
      const sh = new THREE.Shape(); sh.moveTo(-1.6, 0); sh.lineTo(1.6, 0); sh.lineTo(1.6, 5.4); sh.absarc(0, 5.4, 1.6, 0, PI, false); sh.lineTo(-1.6, 0);
      KIT.geo(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.08, bevelSegments: 2, curveSegments: 20 }), niche, new THREE.Matrix4().makeTranslation(x, 1.2, Z0 + 0.02), { worldUV: true });
      KIT.geo(new THREE.TorusGeometry(1.72, 0.1, 8, 24, PI), trim, new THREE.Matrix4().makeTranslation(x, 6.6, Z0 + 0.12));
    }
    KIT.bbox(-X, 9.6, Z0, X, 10.3, Z0 + 0.9, trim, { c: 0.06, col: false }); KIT.bbox(-X, 15.2, Z0, X, 15.8, Z0 + 0.8, trim, { c: 0.06, col: false });
    KIT.geo(new THREE.TorusGeometry(4.6, 0.35, 10, 40, PI), trim, new THREE.Matrix4().makeTranslation(0, 7.6, Z0 + 0.3));
    for (let x = -X + 6; x <= X - 6; x += 6) KIT.geo(new THREE.TorusGeometry(2.1, 0.22, 8, 20, PI), trim, new THREE.Matrix4().makeTranslation(x, 13.4, Z0 + 0.2));
    // front: the open hangar mouth framed by massive jambs + lintel
    KIT.box(-X, 14, Z1, X, H, Z1 + 1.2, wall); for (const s of [-1, 1]) KIT.box(s * 13, 0, Z1, s * X, 14, Z1 + 1.2, wall);
    KIT.box(-X, H, Z0, X, H + 0.6, Z1 + 1.2, trim, { col: false });
    for (let z = Z0 + 4; z < Z1; z += 8) KIT.box(-X, H - 1.4, z - 0.4, X, H, z + 0.4, trim, { col: false });
    // outside apron + parapet beyond the mouth
    KIT.box(-40, -1, Z1 + 12, 40, 0, Z1 + 30, floor); KIT.box(-40, 0, Z1 + 30, 40, 1.1, Z1 + 31, trim);
    PHY.box(-13, 0, Z1 + 1, 13, 20, Z1 + 1.4);   // keep the duel inside (invisible glass-like field)
    // fighters
    L.fighters = [];
    // the Queen's Royal Starship, chrome, parked along the east wall
    { const sh = TAT.ship(); sh.scale.setScalar(0.5); sh.position.set(11.5, 3.1, 12); sh.rotation.y = PI; LEVEL.add(sh);
      // indoors the mirror hull reads as a white slab: a softer, darker chrome, a dorsal bridge, a cockpit strip and landing legs
      const leg = new THREE.MeshStandardMaterial({ color: 0x5a5e66, metalness: 0.7, roughness: 0.4 });
      for (const [x, z] of [[0, -17], [3.6, 10], [-3.6, 10]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 5, 10), leg); l.position.set(x, -3.8, z); sh.add(l); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.25, 14), leg); f.position.set(x, -6.1, z); sh.add(f); }
      sh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); PHY.obox(11.5, 12, 4.2, 14.5, 0, 4.5, PI); L.royal = sh; }
    for (let z = Z0 + 3; z < Z1; z += 6) for (const sx of [-1, 1]) { const a = new THREE.TorusGeometry(2.1, 0.22, 8, 20, PI); KIT.geo(a, trim, new THREE.Matrix4().compose(V3(sx * (X - 0.1), 13.4, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, HALF, 0)), V3(1, 1, 1))); }
    for (const [x, z, yaw] of [[-11, 2, 0.1], [-11, 20, 0.05]]) {
      const f = PROPS.n1(); f.position.set(x, 1.3, z); f.rotation.y = yaw + PI; LEVEL.add(f); L.fighters.push(f);
      PHY.obox(x, z, 3.0, 5.6, 0, 2.2, yaw + PI);
    }
    // cargo + fuel canisters
    const crate = TEX.mat('hull', { color: 0xd0c8b8, env: 0.5, rough: 0.7 }), band = PROPS.m('gold', { color: 0xc8962e, metalness: 1, roughness: 0.3, emissive: 0x201000 });
    const crTrim = TEX.mat('metalPanel', { color: 0x6a6a72, metal: 0.6, rough: 0.4, env: 1.0 });
    const cr = (x, z, w, h, d) => KIT.crate(x, z, w, h, d, crate, crTrim, { stripe: band, lamp: 0x40c0ff });
    cr(-4, 14, 2, 1.2, 1.4); cr(5, 26, 1.6, 1.0, 1.6); cr(-15.5, 10, 1.4, 1.5, 3.2); cr(15.5, 12, 1.4, 1.5, 3.2); cr(4, -12, 1.2, 0.9, 1.2);
    for (const [x, z] of [[-7, -16], [7.5, 30], [-16, 30]]) KIT.cyl(x, 0, z, 0.55, 1.6, metal);
    // lighting: late-afternoon sun pouring through the mouth + clerestory
    NABOO.sky(L); NABOO.theed(0, Z1);
    R.setSun(new THREE.Vector3(-0.72, 0.52, 0.42), 0xffd8a4, 3.0, 0xb8c8e8, 0x7a6048, 0.5);
    R.G.exposure = 1.15; R.G.bloom = 0.18;
    R.G.ssr = 1.0; R.G.ssrMax = 40; CM.fillU.value.setRGB(0.5, 0.48, 0.45);
    L.updates.push((dt) => { const P = PLAYER.a; if (P && RNG() < dt * 14) FX.puff(V3(P.x + rnd(-10, 10), rnd(0.5, 9), P.z + rnd(-10, 10)), 1, { add: true, size: 0.025, col: [1.2, 1.05, 0.8], a: 0.5, life: 5, spread: 0.06, rise: 0.03, drag: 0.1 }); });
    R.setShadowBox(34, 160); R.G.vol = 1.0; R.G.volDen = 0.03; R.G.volFall = 0.04; R.G.volOut = 0.0; R.G.volG = 0.62; R.G.volMax = 80;
    R.scene.fog = new THREE.FogExp2(new THREE.Color(0.75, 0.68, 0.6), 0.0035);
    for (const s of [-1, 1]) for (let z = Z0 + 6; z < Z1; z += 12) KIT.lamp(s * (X - 2), 12, z, 0xffe0b8, 3, 16, { fixture: false });
    KIT.lamp(0, 5, Z0 + 2, 0xffd8a8, 4, 12, { fixture: false });
    R.G.gShadow.setRGB(0.92, 0.96, 1.08); R.G.gHigh.setRGB(1.05, 1.0, 0.94);
    // floor markings: painted bays round the fighters and a centre line
    const paint = new THREE.MeshStandardMaterial({ color: 0xc89a30, roughness: 0.6 });
    const bay = (x, z, w, d) => { for (const [a0, b0, a1, b1] of [[x - w, z - d, x + w, z - d + 0.12], [x - w, z + d - 0.12, x + w, z + d], [x - w, z - d, x - w + 0.12, z + d], [x + w - 0.12, z - d, x + w, z + d]]) KIT.box(a0, 0, b0, a1, 0.006, b1, paint, { col: false }); };
    bay(-11, 2, 4.2, 7.2); bay(-11, 20, 4.2, 7.2); bay(11.5, 12, 6, 16);
    for (let z = Z0 + 2; z < Z1; z += 3) KIT.box(-0.08, 0, z, 0.08, 0.006, z + 1.6, paint, { col: false });
    // astromechs servicing the fighters
    for (const [x, z, yaw, c] of [[-7.2, 6.5, -0.8, 0x1a4aa8], [-14.6, 17, 1.2, 0xa81a1a], [-7.5, 22, -1.9, 0x1a4aa8], [7, 4, 0.6, 0xc88a1a]]) { const r2 = PROPS.r2(c); r2.position.set(x, 0, z); r2.rotation.y = yaw; LEVEL.add(r2); PHY.cyl(x, z, 0.35, 0, 1.1); }
    L.door = LEVEL.door(-3.5, 0, Z0 - 0.6, 3.5, 7, Z0 - 0.2, metal);
    HOLOCRON.place(L, [[-15.5, 1.5, 10], [0, 0, -36], [17, 0, 38]]);
  },
  onStart(L, cp) {
    const say = (w, t, d, c) => HUD.sub(w, t, d, c);
    HUD.toast('NABOO', 'THEED HANGAR', 3.5);
    LEVEL.establish(L, cp, { dur: 5.5, fov: 46, p0: V3(-6, 12, 14), p1: V3(0.8, 2.2, -26), l0: V3(2, 3, 60), l1: V3(0, 1.5, -14) });   // pull back out of the hangar towards the defenders, ending behind Maul (a path that crosses its look point flips the view)
    if (cp < 1) CLOAK.wear(PLAYER.a, true);
    const duo = () => {
      HUD.obj('Destroy the Jedi');
      const q = new Jedi('quigon', { x: -2.5, y: 0, z: 26, yaw: PI }); const o = new Jedi('obiwan', { x: 2.5, y: 0, z: 27, yaw: PI });
      q.home = [0, 10]; o.home = [0, 10];
      L.jedi = [q, o]; NABOO.duoBar(q, o);
      BOSS.extra = () => {
        const f = (q.hp + o.hp) / (q.hpMax + o.hpMax);
        if (f < 0.72 && !L.flags.retreat) { L.flags.retreat = true; NABOO.retreat(L); }
      };
    };
    if (cp >= 1) { duo(); return; }
    say('DARTH SIDIOUS', 'Wipe them out. All of them.', 3, 'sid');
    HUD.obj('Break the Naboo and Gungan defenders'); HUD.hint('Gungan shields stop light strikes — use heavy attacks. ' + IN.keyLabel('push') + ' Force push sends boomas back.', 7);
    MG.after(1.5, () => LEVEL.wave([['guard', -8, 10], ['guard', 8, 10], ['gungan', -4, 20], ['gunganShield', 4, 20], ['gunganBooma', -14, 30], ['gunganBooma', 14, 30]], () => {
      HUD.sub('CAPTAIN PANAKA', 'Hold the hangar! Your Highness, stay back!', 3, 'jedi');
      LEVEL.wave([['panaka', 0, 30], ['guard', -10, 26], ['guard', 10, 26], ['gunganShield', -3, 22], ['gungan', 3, 22]], () => {
      LEVEL.checkpoint(1);
      // the Jedi arrive
      const P = PLAYER.a; PLAYER.state = 'cine'; HUD.show(false);
      duo(); for (const j of L.jedi) { j.passive = true; j.x += 0; j.z += 10; }
      P.yaw = P.angTo({ x: 0, z: 30 }); CAM.play({ dur: 2.2, fov: 36, fn: (t, u) => ({ pos: V3(P.x - 1.2, 1.6, P.z - 2.2 + u * 0.4), look: V3(0, 1.5, 28 - u * 4) }) });
      say('QUI-GON JINN', 'We\'ll handle this.', 2.5, 'jedi');
      PLAYER.saber.ignite(undefined, false); PLAYER.saber.ign = [0, 0];
      MG.after(1.2, () => { CLOAK.drop(PLAYER.a); HUD.sub('', 'The cloak falls away.', 1.4); });
      MG.after(2.4, () => { PLAYER.saber.ignite(0, true); FX.addShake(0.15); }); MG.after(3.3, () => { PLAYER.saber.ignite(1, true); FX.addShake(0.2); HUD.sub('', 'Maul ignites the second blade.', 1.6); });
      MG.after(2.2, () => CAM.play({ dur: 2.8, fov: 30, fn: (t, u) => ({ pos: V3(P.x + Math.sin(P.yaw) * 2.2 + Math.cos(P.yaw) * 0.6, 1.55, P.z + Math.cos(P.yaw) * 2.2 - Math.sin(P.yaw) * 0.6), look: V3(P.x, 1.45, P.z) }) }));

      MG.after(5.0, () => { PLAYER.state = 'move'; HUD.show(true); for (const j of L.jedi) j.passive = false; HUD.hint('Jedi block — break their guard with heavies, then ' + IN.keyLabel('grip') + ' to strike. Hold ' + IN.keyLabel('block') + ' as their blade flares to parry.', 7); });
      }, { now: true, stagger: 0.3 });
    }, { now: true, stagger: 0.3 }));
  },
});
NABOO.duoBar = function (q, o) {
  const fake = { get hp() { return q.hp + o.hp; }, get hpMax() { return q.hpMax + o.hpMax; }, get guard() { return Math.min(q.guard, o.guard); }, guardMax: 100, get alive() { return q.alive || o.alive; }, keepBar: true };
  HUD.setBoss(fake, 'QUI-GON JINN  ·  OBI-WAN KENOBI', 'JEDI MASTER AND PADAWAN', 'green');
};
NABOO.retreat = function (L) {
  const P = PLAYER.a; PLAYER.state = 'cine'; HUD.show(false);
  for (const j of L.jedi) { j.passive = true; j.stop(); j.setBase('run'); }
  HUD.sub('', 'The Jedi fall back into the power generator…', 3);
  CAM.play({ dur: 3.2, fov: 40, fn: (t, u) => ({ pos: V3(P.x + 3, 2.2, P.z + 3), look: V3(P.x, 1.2, P.z - 4) }) });
  L.updates.push((dt) => { for (const j of L.jedi) { if (!j.alive) continue; j.steer(0, -34, 5.5, dt); j.yaw = Math.atan2(j.vx, j.vz); } });
  L.door.openIt();
  MG.after(3.4, () => GAME.next());
};
/* ------------------------------------------------------------------ the power generator */
LEVEL.def('generator', {
  chapter: 'CHAPTER III', name: 'THE GENERATOR', world: 'naboo', cast: ['quigon', 'obiwan'],
  tex: ['metalPanel', 'grate', 'ribWall'],
  start: [0, 0, -40, 0], checkpoints: [[0, 0, -40, 0], [0, -18, 30, PI]], killY: -45,
  async build(L) {
    const wall = TEX.mat('metalPanel', { color: 0x7a8a8a, env: 0.7 }), dark = TEX.mat('metalPanel', { color: 0x4a5252, env: 0.6 }), grate = TEX.mat('grate', { env: 0.8 }), rib = TEX.mat('ribWall', { color: 0x8a9696 });
    const X = 30, Z0 = -46, Z1 = 46;
    // shaft walls (deep) with light bands
    for (const s of [-1, 1]) { KIT.box(s * X, -95, Z0, s * (X + 1), 28, Z1, wall, { col: false }); KIT.box(-X, -95, s > 0 ? Z1 : Z0 - 1, X, 28, s > 0 ? Z1 + 1 : Z0, wall, { col: false }); }
    for (let y = -78; y < 20; y += 26) for (const s of [-1, 1]) { KIT.box(s * (X - 0.05), y, Z0, s * (X - 0.02), y + 0.3, Z1, KIT.emis(0xb8f0ff, 0.7), { col: false }); }
    for (let z = Z0 + 8; z < Z1; z += 16) for (const s of [-1, 1]) KIT.box(s * (X - 0.05), -60, z - 0.4, s * (X - 0.02), 18, z + 0.4, KIT.emis(0x7ab0c0, 0.5), { col: false });
    // structure: buttresses up the shaft walls, ring ledges every 13 m, deep-set panels
    const rib2 = TEX.mat('metalPanel', { color: 0x5e6a6c, env: 0.9, rough: 0.4, metal: 0.4 });
    for (const s of [-1, 1]) {
      for (let z = Z0 + 4; z < Z1; z += 8) KIT.bbox(s * (X - 1.1), -95, z - 0.7, s * X, 28, z + 0.7, rib2, { c: 0.15, col: false });
      for (let x = -X + 4; x < X; x += 8) KIT.bbox(x - 0.7, -95, s > 0 ? Z1 - 1.1 : Z0 + 1.1, x + 0.7, 28, s > 0 ? Z1 : Z0, rib2, { c: 0.15, col: false });
      for (let y = -88; y < 24; y += 13) { KIT.bbox(s * (X - 1.6), y, Z0, s * X, y + 0.9, Z1, rib2, { c: 0.12, col: false }); KIT.bbox(-X, y, s > 0 ? Z1 - 1.6 : Z0, X, y + 0.9, s > 0 ? Z1 : Z0 + 1.6, rib2, { c: 0.12, col: false }); }
    }
    // generator pylons: huge glowing columns
    for (const [x, z] of [[-18, 22], [18, -16], [-20, -24], [20, 30]]) {
      KIT.cyl(x, -95, z, 3.2, 125, dark, { seg: 32 });
      for (let y = -86; y < 28; y += 9) KIT.cyl(x, y, z, 3.35, 0.45, KIT.emis(0x9fe8ff, 2.4), { col: false, seg: 32 });
      KIT.cyl(x, -95, z, 3.5, 3, KIT.emis(0x9fe8ff, 1.2), { col: false, seg: 32 }); KIT.cyl(x, 24, z, 3.6, 1.2, dark, { col: false, seg: 32 });
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; KIT.rbox(x + Math.cos(a) * 3.28, -35, z + Math.sin(a) * 3.28, 0.09, 58, 0.34, 0, -a, 0, k % 2 ? KIT.emis(0xbff4ff, 1.6) : rib2, 0.03); }
      for (let y = -84; y < 24; y += 18) KIT.cyl(x, y, z, 3.75, 1.2, rib2, { col: false, seg: 32 });
      KIT.lamp(x, -2, z, 0x9fe8ff, 6, 18, { fixture: false });
    }
    // catwalks (narrow, no rails) + round platforms
    const cat = (x0, z0, x1, z1, y, w) => { const dx = x1 - x0, dz = z1 - z0, L2 = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz); KIT.obox((x0 + x1) / 2, y - 0.4, (z0 + z1) / 2, (w || 1.6) / 2, y, L2 / 2, yaw, grate); KIT.obox((x0 + x1) / 2, y - 0.7, (z0 + z1) / 2, 0.3, y - 0.4, L2 / 2, yaw, dark, { col: false }); };
    const plat = (x, z, y, r) => { KIT.ring(x, z, 0, r, y - 0.5, y, grate, { sides: 28, sideMat: dark, col: false }); PHY.cyl(x, z, r, y - 0.5, y); KIT.ring(x, z, r - 0.15, r, y, y + 0.05, KIT.emis(0xffa040, 2), { sides: 28, col: false }); };
    KIT.box(-7, -1, Z0, 7, 0, Z0 + 8, grate); KIT.box(-7, -3, Z0, 7, -1, Z0 + 8, dark, { col: false });
    cat(0, -38, 0, -14, 0, 2.2); plat(0, -10, 0, 5);
    cat(-4.5, -10, -18, -4, 0); plat(-19, -3, 0, 3.2);
    cat(4.5, -10, 16, 6, 0); plat(17, 8, 0, 3.2);
    plat(-10, 14, -9, 3.6); plat(8, 22, -9, 3.6); cat(-7, 15, 5, 21, -9);
    cat(-19, -1, -11, 11, -9);
    plat(0, 34, -18, 4.5); cat(8, 25, 2, 31, -18, 2.0); cat(-10, 17, -3, 31, -18, 2.0);
    // stepping platforms for the descent (each drop ≤ 4.5 m), with amber chevrons marking the way down
    plat(12.8, 14.8, -4.5, 2.3); plat(5.2, 28.2, -13.5, 2.2); plat(-14, 6, -4.5, 2.2);
    for (const [x, z, y, yaw] of [[15.2, 11.4, 0.02, 2.5], [10.6, 18.2, -4.48, 2.6], [6.6, 25.6, -8.98, 2.8], [3.6, 30.6, -13.48, 2.6], [-16.5, 1.5, 0.02, 0.5], [-12.5, 9.5, -4.48, 0.3]])
      for (let k = 0; k < 3; k++) KIT.geo(new THREE.PlaneGeometry(0.5, 0.18), KIT.emis(0xffa020, 3), new THREE.Matrix4().compose(V3(x + Math.sin(yaw) * k * 0.4, y + 0.03, z + Math.cos(yaw) * k * 0.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(-HALF, 0, -yaw)), V3(1, 1, 1)));
    KIT.box(-3, -18.5, 38, 3, -18, Z1, grate); // exit ledge to the laser corridor
    HOLOCRON.place(L, [[-19, 0, -3], [8, -9, 22], [-10, -9, 14]]);
    KIT.box(-3.2, -18, Z1 - 0.2, -2.6, -11, Z1 + 1, dark); KIT.box(2.6, -18, Z1 - 0.2, 3.2, -11, Z1 + 1, dark); KIT.box(-3.2, -11.6, Z1 - 0.2, 3.2, -11, Z1 + 1, dark);
    KIT.box(-2.6, -18, Z1 + 0.6, 2.6, -11.6, Z1 + 0.7, KIT.emis(0xff2010, 1.5), { col: false });
    // bottomless glow + haze
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(70, 100), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.9, 1.2), toneMapped: false, fog: false })); glow.rotation.x = -HALF; glow.position.y = -94; LEVEL.add(glow);
    for (const [x, z] of [[0, -10], [-19, -3], [17, 8]]) KIT.lamp(x, 3.5, z, 0xffc890, 4, 12, { fixture: false });
    for (const [x, z] of [[-10, 14], [8, 22], [0, 34]]) KIT.lamp(x, -5.5, z, 0xffc890, 4, 12, { fixture: false });
    KIT.lamp(0, -30, 0, 0x9fe8ff, 8, 40, { fixture: false });
    R.setSun(new THREE.Vector3(0.22, 1.0, 0.12), 0xbfe8ff, 1.4, 0x4a5a64, 0x1a2a30, 0.35);
    R.G.exposure = 1.4; R.G.bloom = 0.28;
    L.updates.push((dt) => { const P = PLAYER.a; if (P && RNG() < dt * 16) FX.puff(V3(P.x + rnd(-12, 12), P.y + rnd(-6, 6), P.z + rnd(-12, 12)), 1, { add: true, size: 0.035, col: [0.5, 1.4, 1.6], a: 0.8, life: 4, spread: 0.1, rise: 0.25, drag: 0.2 }); });
    R.setShadowBox(48, 200); R.G.vol = 1.0; R.G.volDen = 0.02; R.G.volFall = 0.0; R.G.volOut = 0.6; R.G.volG = 0.35; R.G.volMax = 90; R.G.volAmb.setRGB(0.015, 0.05, 0.06);
    R.G.gShadow.setRGB(0.9, 1.0, 1.08); R.G.gHigh.setRGB(1.04, 1.02, 0.96);
    R.scene.background = new THREE.Color(0.01, 0.015, 0.02);
    R.scene.fog = new THREE.FogExp2(new THREE.Color(0.05, 0.08, 0.09), 0.012);
    const env = new THREE.Scene(); env.background = new THREE.Color(0.02, 0.03, 0.035);
    for (let i = 0; i < 8; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.2, 1.4), side: THREE.DoubleSide })); p.position.set(Math.cos(i / 8 * TAU) * 30, 0, Math.sin(i / 8 * TAU) * 30); p.lookAt(0, 0, 0); env.add(p); }
    const b = new THREE.Mesh(new THREE.CircleGeometry(40, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.9, 1.1) })); b.rotation.x = -HALF; b.position.y = -30; env.add(b);
    L.env = env;
  },
  onStart(L, cp) {
    const say = (w, t, d, c) => HUD.sub(w, t, d, c);
    HUD.toast('THEED', 'POWER GENERATOR', 3);
    LEVEL.establish(L, cp, { dur: 5.5, fov: 48, p0: V3(7, -36, 6), p1: V3(0.8, 2.2, -44.2), l0: V3(0, -6, -12), l1: V3(0, 0.6, -30) });
    if (cp >= 1) { HUD.obj('Follow Qui-Gon to the laser gates'); return; }
    HUD.obj('Destroy the Jedi');
    const q = new Jedi('quigon', { x: -1.5, y: 0, z: -8, yaw: PI, hpMul: 0.8 }); const o = new Jedi('obiwan', { x: 1.5, y: 0, z: -7, yaw: PI, hpMul: 0.8 });
    q.hp *= 0.85; o.hp *= 0.85; q.home = [0, -10]; o.home = [0, -10]; L.jedi = [q, o]; NABOO.duoBar(q, o);
    HUD.hint('No rails over the shaft. ' + IN.keyLabel('push') + ' Force push can send a Jedi over the edge — and so can they.', 6);
    BOSS.extra = () => {
      if (!L.flags.kick && o.hp < o.hpMax * 0.45) { L.flags.kick = true; NABOO.kickObi(L, q, o); }
      if (L.flags.kick && !L.flags.qdown && q.hp < q.hpMax * 0.5) { L.flags.qdown = true; NABOO.quiDown(L, q); }
    };
  },
});
NABOO.kickObi = function (L, q, o) {
  const P = PLAYER.a; PLAYER.state = 'cine'; HUD.show(false); q.passive = true; o.passive = true; o.stop();
  // Maul kicks the padawan off the catwalk
  P.yaw = P.angTo(o); P.play('kick', { fade: 0.05 });
  const away = V3(o.x - P.x, 0, o.z - P.z).normalize();
  CAM.play({ dur: 3.2, fov: 40, fn: (t, u) => ({ pos: V3(P.x - away.z * 4 - away.x * 2, P.y + 2.2, P.z + away.x * 4 - away.z * 2), look: V3(o.x, o.y + 0.5 - u * 3, o.z) }) });
  MG.after(0.2, () => { o.vx = away.x * 7; o.vz = away.z * 7; o.vy = 4; o.play('knock'); o.state = 'knock'; FX.addShake(0.4); HUD.sub('', 'Maul kicks Obi-Wan from the catwalk.', 2.5); });
  MG.after(2.0, () => { o.hidden = true; o.root.visible = false; o.saber.setVisible(false); if (o.inst.cloth) o.inst.cloth.setVisible(false); o.alive = false; COMBAT.actors.splice(COMBAT.actors.indexOf(o), 1); });
  MG.after(3.3, () => { PLAYER.state = 'move'; HUD.show(true); q.passive = false; HUD.setBoss(q, 'QUI-GON JINN', 'JEDI MASTER', 'green'); });
};
NABOO.quiDown = function (L, q) {
  const P = PLAYER.a; PLAYER.state = 'cine'; HUD.show(false); q.passive = true; q.stop();
  HUD.sub('', 'Qui-Gon leaps for the lower levels, toward the laser gates.', 3);
  CAM.play({ dur: 3, fov: 44, fn: (t, u) => ({ pos: V3(P.x + 2, P.y + 3, P.z - 4), look: V3(lerp(q.x, 0, u), lerp(q.y + 1, -17, u), lerp(q.z, 34, u)) }) });
  const q0 = V3(q.x, q.y, q.z);
  L.updates.push((dt) => { if (!q.jumpT && q.jumpT !== 0) return; q.jumpT += dt; const u = sat(q.jumpT / 1.6); q.x = lerp(q0.x, 0, u); q.z = lerp(q0.z, 34, u); q.y = lerp(q0.y, -18, u) + Math.sin(u * PI) * 5; q.vy = 0; q.grounded = u >= 1; });
  q.jumpT = 0; q.play('leap');
  MG.after(1.7, () => { q.jumpT = undefined; q.hidden = true; q.root.visible = false; q.saber.setVisible(false); if (q.inst.cloth) q.inst.cloth.setVisible(false); q.alive = false; COMBAT.actors.splice(COMBAT.actors.indexOf(q), 1); HUD.setBoss(null); });
  MG.after(3.1, () => { PLAYER.state = 'move'; HUD.show(true); HUD.obj('Follow Qui-Gon — drop to the lowest catwalk'); HUD.hint('Follow the amber chevrons down the stepping platforms', 5); LEVEL.checkpoint(1); });
  LEVEL.trigger(-3, 40, 3, 46, () => GAME.next(), { y0: -20, y1: -15 });
};
/* ------------------------------------------------------------------ laser gates + melting pit */
LEVEL.def('pit', {
  chapter: 'CHAPTER III', name: 'THE MELTING PIT', world: 'naboo', cast: ['quigon', 'obiwan'],
  tex: ['ribWall', 'metalPanel', 'grate'],
  start: [0, 0, -4, 0], checkpoints: [[0, 0, -4, 0], [0, 0, 60, 0]], killY: -25,
  async build(L) {
    const rib = TEX.mat('ribWall', { color: 0xc8d0d4, env: 0.8 }), dark = TEX.mat('metalPanel', { color: 0x5a6266 }), floor = TEX.mat('metalPanel', { color: 0xa0a8ac, env: 1.2, rough: 0.28, refl: 0.7 });
    // corridor: z 0..64, x -3..3, h 7, ribbed walls, a lit channel in the ceiling
    KIT.box(-3, -1, -8, 3, 0, 64, floor);
    for (const s of [-1, 1]) { KIT.box(s * 3, 0, -8, s * 3.6, 7.5, 64, rib); KIT.box(s * 2.9, 6.6, -8, s * 3, 6.9, 64, KIT.emis(0xff4020, 1.2), { col: false }); }
    KIT.box(-3.6, 7.5, -8, 3.6, 8, 64, dark); KIT.box(-3, 0, -8.6, 3, 8, -8, dark);
    // gates: frames + energy walls
    L.gates = [];
    const gz = [10, 18, 26, 34, 42, 50];
    for (let i = 0; i < gz.length; i++) {
      const z = gz[i];
      for (const s of [-1, 1]) KIT.box(s * 2.4, 0, z - 0.35, s * 3, 7.5, z + 0.35, dark);
      KIT.box(-3, 6.2, z - 0.35, 3, 7.5, z + 0.35, dark);
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
        uniforms: { uT: { value: 0 }, uA: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform float uT, uA; varying vec2 vUv; void main(){ float x = abs(vUv.x - 0.5) * 2.0; float edge = smoothstep(0.86, 1.0, x); float scan = pow(0.5 + 0.5 * sin(vUv.y * 90.0 + uT * 24.0), 14.0); float flow = pow(0.5 + 0.5 * sin(vUv.y * 11.0 - uT * 6.0 + x * 2.0), 4.0); float fl = 0.85 + 0.15 * sin(uT * 60.0 + vUv.y * 9.0); vec3 c = vec3(2.6, 0.26, 0.12) * (0.03 + scan * 0.45 + flow * 0.08 + edge * 1.4) * fl; gl_FragColor = vec4(c * uA * 0.4, 1.0); }' });
      const g = new THREE.Group();
      for (let k = 0; k < 2; k++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 6.2), m); pl.position.set(0, 3.1, z + (k - 0.5) * 0.14); g.add(pl); }   // two layers: six gates of three stacked into a red whiteout
      LEVEL.add(g);
      const col = PHY.box(-2.4, 0, z - 0.2, 2.4, 6.2, z + 0.2);
      const Ls = R.addLight({ pos: V3(0, 3, z), col: new THREE.Color(1, 0.15, 0.06), i: 2.4, range: 8, prio: 2, on: true });
      L.gates.push({ z, m, g, col, Ls, open: false, a: 1, i });
    }
    // the pit room: circle r 14 centred at z 78
    const PZ = 78, PR = 14, pr = 3.2;
    KIT.ring(0, PZ, pr, PR, -1, 0, floor, { sides: 48, sideMat: dark });
    KIT.ring(0, PZ, pr - 0.2, pr, -40, 0, dark, { sides: 32, col: false });
    KIT.ring(0, PZ, pr, pr + 0.35, 0, 0.12, KIT.emis(0xffa050, 3), { sides: 32, col: false });
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; const x = Math.sin(a) * (PR + 0.3), z = PZ + Math.cos(a) * (PR + 0.3); if (Math.abs(x) < 3.2 && z < PZ) continue; KIT.obox(x, 0, z, 1.9, 12, 0.35, a, rib); }
    PHY.ring(0, PZ, PR, PR + 1, 0, 12, 24, 0);
    KIT.box(-3, -1, 64, 3, 0, PZ - PR + 1, floor);
    for (const s of [-1, 1]) KIT.box(s * 3, 0, 64, s * 3.6, 7.5, PZ - PR + 0.6, rib);
    const pitGlow = new THREE.Mesh(new THREE.CircleGeometry(pr, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.6), toneMapped: false })); pitGlow.rotation.x = -HALF; pitGlow.position.set(0, -38, PZ); LEVEL.add(pitGlow);
    KIT.lamp(0, -2, PZ, 0xffa050, 8, 14, { fixture: false });
    // the shaft: rings of light stepping down into the furnace, ribbed walls, heat rising out of it
    for (let d = 1; d <= 9; d++) { const y = -d * 3.8, u = d / 9; const c = new THREE.Color(0xd8e8ff).lerp(new THREE.Color(0xff6a20), u); KIT.ring(0, PZ, pr - 0.34, pr - 0.16, y - 0.12, y + 0.12, KIT.emis(c.getHex(), 2 + u * 2.5), { sides: 32, col: false }); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; KIT.obox(Math.sin(a) * (pr - 0.26), -38, PZ + Math.cos(a) * (pr - 0.26), 0.1, -0.02, 0.1, a, dark, { col: false }); }
    const heat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false,
      uniforms: { uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying float vY; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uT; varying vec2 vUv; varying float vY; void main(){ float g = vY < 0.0 ? pow(clamp(-vY / 38.0, 0.0, 1.0), 1.6) * 0.55 : exp(-vY * 0.45) * 0.14; float fl = 0.7 + 0.3 * sin(vUv.x * 44.0 + vY * 1.3 - uT * 3.0) * sin(vUv.x * 19.0 - uT * 1.7 + vY * 0.6); gl_FragColor = vec4(vec3(1.6, 0.5, 0.14) * g * fl, 1.0); }' });
    for (const [h, y, r] of [[36, -19, pr - 0.45], [8, 4, pr - 0.1]]) { const hc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true), heat); hc.position.set(0, y, PZ); hc.renderOrder = 3; LEVEL.add(hc); }
    L.updates.push((dt, t) => { heat.uniforms.uT.value = t; if (RNG() < dt * 10) { const a = rnd(0, TAU), r = rnd(0, pr - 0.5); FX.puff(V3(Math.sin(a) * r, rnd(-3, 0), PZ + Math.cos(a) * r), 1, { add: true, size: 0.035, col: [3, 1.1, 0.3], a: 0.9, life: 3, spread: 0.3, rise: 1.4, drag: 0.2 }); } });
    // the skylight: a lit ring in the dome and a cold column of light falling onto the pit
    KIT.ring(0, PZ, 5.2, 5.9, 11.85, 12, KIT.emis(0xe0ecff, 2.4), { sides: 48, col: false });
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; KIT.obox(Math.sin(a) * 9.5, 11.4, PZ + Math.cos(a) * 9.5, 0.25, 12, 4.5, a, dark, { col: false }); }

    KIT.lamp(0, 10.5, PZ, 0xd8e8ff, 9, 22, { fixture: false });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; if (i % 2 === 0) KIT.lamp(Math.sin(a) * 11.5, 7, PZ + Math.cos(a) * 11.5, 0xd8e8ff, 11, 24, { fixture: false }); KIT.box(Math.sin(a) * 14.2 - 0.3, 1, PZ + Math.cos(a) * 14.2 - 0.3, Math.sin(a) * 14.2 + 0.3, 10, PZ + Math.cos(a) * 14.2 + 0.3, KIT.emis(0xe8f0ff, 2.5), { col: false }); }
    KIT.ring(0, PZ, 5.25, PR + 1.2, 12, 12.6, dark, { sides: 48, col: false });   // roof with an open oculus over the pit
    for (const z of [2, 14, 22, 30, 38, 46, 56]) KIT.lamp(0, 6.4, z, 0xf0f4ff, 5, 11, { fixture: false });
    R.setSun(new THREE.Vector3(0.12, 1, 0.16), 0xe8f0ff, 2.4, 0x8a98aa, 0x3a2e28, 1.1);
    R.setShadowBox(24, 160); R.G.vol = 0.45; R.G.volDen = 0.011; R.G.volFall = 0.0; R.G.volOut = 0.0; R.G.volG = 0.3; R.G.volMax = 50; R.G.volAmb.setRGB(0.004, 0.004, 0.005);
    R.G.ssr = 1.0; R.G.ssrMax = 30;
    R.G.exposure = 1.2; R.G.bloom = 0.16;
    R.scene.background = new THREE.Color(0.02, 0.02, 0.025);
    R.scene.fog = new THREE.FogExp2(new THREE.Color(0.06, 0.05, 0.05), 0.012);
    const env = new THREE.Scene(); env.background = new THREE.Color(0.06, 0.065, 0.075);
    { const top = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.0, 1.2), side: THREE.DoubleSide })); top.rotation.x = HALF; top.position.y = 14; env.add(top); }
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.3, 0.15), side: THREE.DoubleSide })); p.position.set(Math.cos(i) * 20, 2, Math.sin(i) * 20); p.lookAt(0, 0, 0); env.add(p); }
    L.env = env;
    L.PZ = PZ;
    HOLOCRON.place(L, [[0, 0, -6], [-9, 0, 86], [9, 0, 86]]);
  },
  update(L, dt) {
    // gates: cycle open 3.2 s / closed 4.5 s, staggered front-to-back so a run through is a rhythm
    const P = PLAYER.a;
    for (const g of L.gates) {
      if (g.lock !== undefined) g.open = !g.lock;
      else { const ph = ((L.t + g.i * 0.55) % 7.7); g.open = ph < 3.2; }
      g.a = damp(g.a, g.open ? 0 : 1, 12, dt); g.m.uniforms.uA.value = g.a; g.m.uniforms.uT.value = L.t; g.g.visible = g.a > 0.02; g.col.off = g.open; g.Ls.i = g.a * 4;
      if (!g.open && P && Math.abs(P.z - g.z) < 0.55 && Math.abs(P.x) < 2.4 && P.alive) { COMBAT.damage(P, 10, { kind: 'laser', unblockable: true }); P.z += P.z < g.z ? -1.2 : 1.2; FX.spark(V3(P.x, P.y + 1.2, g.z), V3(0, 0, P.z < g.z ? -1 : 1), 16, 5, [4, 1, 0.4]); }
    }
  },
  onStart(L, cp) {
    const say = (w, t, d, c) => HUD.sub(w, t, d, c);
    HUD.toast('THEED', 'THE LASER GATES', 3);
    LEVEL.establish(L, cp, { dur: 4.5, fov: 40, p0: V3(-1.6, 6.6, -7.6), p1: V3(0.8, 2.2, -7.6), l0: V3(0, 3.2, 62), l1: V3(0, 1.5, 4) });
    const gates = L.gates;
    const final = () => NABOO.pitDuel(L);
    if (cp >= 1) { for (const g of gates) g.lock = false; final(); return; }
    HUD.obj('Run the laser gates');
    HUD.hint('The gates cycle. Time your run — the energy walls burn.', 5);
    // Qui-Gon waits, kneeling, beyond the last gate
    const q = new Jedi('quigon', { x: 0, y: 0, z: 56, yaw: PI, hpMul: 0.8 }); q.passive = true; q.play('kneel'); q.saber.ignite(undefined, false); L.q = q;
    LEVEL.trigger(-3, 44, 3, 49, () => {
      // the last gate slams shut: the standoff
      const P = PLAYER.a; PLAYER.state = 'cine'; HUD.show(false); for (const g of gates) g.lock = true;
      P.x = 0; P.z = 47.5; P.yaw = 0; P.vx = P.vz = 0; P.setBase('guard');
      CAM.play({ dur: 7, fov: 34, fn: (t, u) => ({ pos: V3(2.2 - u * 1.2, 1.3, 49.2 + u * 0.3), look: V3(0, 1.1, 53 - u * 2) }) });
      say('', 'A wall of energy between them. Qui-Gon kneels in meditation. Maul paces, like a caged animal.', 5);
      MG.after(7.2, () => { for (const g of gates) g.lock = false; gates[5].lock = false; q.stop(); q.saber.ignite(undefined, true); q.play('guard'); PLAYER.state = 'move'; HUD.show(true); LEVEL.checkpoint(1); final(); });
    });
  },
});
/* pick a cinematic camera spot around `at` that the level geometry doesn't block: candidates on a ring (preferred
   angle first), each tested with a ray from the subject; returns the unit direction to use */
NABOO.freeDist = function (at, a, y) {
  const rc = NABOO._rc || (NABOO._rc = new THREE.Raycaster()), G = LEVEL.cur && LEVEL.cur.group; if (!G) return 40;
  rc.set(V3(at.x, y, at.z), V3(Math.sin(a), 0, Math.cos(a))); rc.far = 40; const h = rc.intersectObject(G, true)[0]; return h ? h.distance - 0.5 : 40;
};
/* the most open horizontal direction around a point (angle) */
NABOO.openAng = function (at, y) { let best = 0, bd = -1; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, d = NABOO.freeDist(at, a, y); if (d > bd) { bd = d; best = a; } } return best; };
NABOO.clearDir = function (at, pref, r, y) {
  const rc = NABOO._rc || (NABOO._rc = new THREE.Raycaster()), G = LEVEL.cur && LEVEL.cur.group; const a0 = Math.atan2(pref[0], pref[1]);
  if (!G) return [pref[0], pref[1], r];
  const free = (a) => NABOO.freeDist(at, a, y);
  // near the preferred angle a closer camera beats swinging round onto the axis; further round, any clear spot
  for (const [span, rmin] of [[2, r * 0.5], [8, r]]) for (let k = 0; k <= span * 2; k++) {
    const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (TAU / 16), f = free(a);
    if (f >= rmin) return [Math.sin(a), Math.cos(a), Math.min(r, f)];
  }
  return [pref[0], pref[1], r * 0.5];
};
NABOO.pitDuel = function (L) {
  let q = L.q;
  if (!q || !q.alive) { q = new Jedi('quigon', { x: 0, y: 0, z: 60, yaw: PI, hpMul: 0.8 }); L.q = q; }
  q.passive = false; q.hp = q.hpMax * 0.8; q.home = [0, L.PZ - 6];
  HUD.setBoss(q, 'QUI-GON JINN', 'JEDI MASTER', 'green'); HUD.obj('Defeat Qui-Gon Jinn');
  q.onDefeat = () => {
    const P = PLAYER.a; PLAYER.state = 'cine'; HUD.show(false);
    HUD.sub('', 'The hilt to the chin — and the blade. The Jedi Master falls.', 3.5);
    MG.slowmo = 0.35;
    // square them up (Maul a step off the Jedi, facing him) and strike; a side-on two-shot, then low behind the Jedi
    let dx = q.x - P.x, dz = q.z - P.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    { // in the corridor the camera needs the long axis: turn the duel across it, Maul on whichever side has room
      const ca = NABOO.openAng(q, 1.2), cx = Math.sin(ca), cz = Math.cos(ca); let ex = cz, ez = -cx; if (ex * dx + ez * dz < 0) { ex = -ex; ez = -ez; }
      if (NABOO.freeDist(q, Math.atan2(-ex, -ez), 1.0) < 1.5) { ex = -ex; ez = -ez; } dx = ex; dz = ez; }
    P.x = q.x - dx * 1.25; P.z = q.z - dz * 1.25; P.vx = P.vz = 0; P.yaw = Math.atan2(dx, dz); P.play('exec', { fade: 0.08 });
    const mx = (P.x + q.x) / 2, mz = (P.z + q.z) / 2, [sx, sz, sr] = NABOO.clearDir({ x: mx, z: mz }, [-dz, dx], 3.4, 1.3), fv = 34 + (3.4 - sr) * 9;
    CAM.play({ dur: 1.9, fov: fv, hold: true, ease: 'lin', fn: (t, u) => ({ pos: V3(mx + sx * sr * (1 - u * 0.12), 1.25, mz + sz * sr * (1 - u * 0.12)), look: V3(mx, 1.25 - u * 0.1, mz) }) });
    MG.after(1.8, () => { const [bx, bz, br] = NABOO.clearDir(q, [dx + sx * 0.6, dz + sz * 0.6], 2.0, 0.5);
      CAM.play({ dur: 1.9, fov: 38, hold: true, fn: (t, u) => ({ pos: V3(q.x + bx * br, 0.45 + u * 0.15, q.z + bz * br), look: V3(P.x, 1.2 + u * 0.3, P.z) }) }); });
    MG.after(3.6, () => {
      HUD.sub('OBI-WAN KENOBI', 'NOOOO!', 2, 'jedi');
      const o = new Jedi('obiwan', { x: 0, y: 0, z: 52, yaw: 0, aggr: 1.35 }); o.home = [0, L.PZ - 6];
      HUD.setBoss(o, 'OBI-WAN KENOBI', 'PADAWAN — ENRAGED', ''); HUD.obj('Defeat Obi-Wan Kenobi');
      MG.after(0.2, () => { CAM.play({ dur: 2.2, fov: 40, fn: (t, u) => ({ pos: V3(1.5, 1.6, 64 - u * 2), look: V3(0, 1.3, 52 + u * 4) }) }); });
      MG.after(2.5, () => { if (PLAYER.state === 'cine') { PLAYER.state = 'move'; HUD.show(true); } });
      o.onDefeat = () => {
        // the finale in three shots: low over the fallen padawan · the hero shot (he turns to us, twirls, a warm key on
        // the face against the red pit) · the crane up out of the pit as the blades die
        const P2 = PLAYER.a, ox = o.x, oz = o.z; PLAYER.state = 'cine'; HUD.show(false); MG.slowmo = 0.3;
        HUD.sub('', 'The padawan falls. No Jedi left to stand against the Sith.', 3.5);
        let ux = P2.x - ox, uz = P2.z - oz; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
        const [ax, az, ar] = NABOO.clearDir({ x: ox, z: oz }, [-ux - uz * 0.87, -uz + ux * 0.87], 2.1, 0.6);
        CAM.play({ dur: 2.8, fov: 36, hold: true, fn: (t, u) => ({ pos: V3(ox + ax * ar, 0.42 + u * 0.3, oz + az * ar), look: V3(P2.x, 0.8 + u * 0.75, P2.z) }) });
        // hero direction: away from the pit (the glowing shaft behind him), unless he stands near the wall
        let hx = P2.x, hz = P2.z - L.PZ; const hl = Math.hypot(hx, hz); if (hl < 1) { hx = -uz; hz = ux; } else { hx /= hl; hz /= hl; if (hl > 9.5) { hx = -hx; hz = -hz; } }
        let hr; [hx, hz, hr] = NABOO.clearDir(P2, [hx, hz], 3.2, 1.1);
        let key = null;
        MG.after(2.6, () => {
          P2.yaw = Math.atan2(hx, hz); P2.vx = P2.vz = 0; P2.play('flourish', { fade: 0.25 });
          key = R.addLight({ pos: V3(P2.x + hx * 1.3 - hz * 0.5, 1.95, P2.z + hz * 1.3 + hx * 0.5), col: new THREE.Color(1.0, 0.62, 0.45), i: 2.6, range: 4.5, on: true, prio: 10 });
          CAM.play({ dur: 4.4, fov: 30 + (3.2 - hr) * 8, hold: true, ease: 'lin', fn: (t, u) => { const d = hr - 0.1 - u * Math.min(1.0, hr * 0.35); return { pos: V3(P2.x + hx * d + hz * 0.45, 1.0 + u * 0.2, P2.z + hz * d - hx * 0.45), look: V3(P2.x, 1.48, P2.z) }; } });
          MG.after(0.4, () => HUD.sub('DARTH MAUL', 'At last we have revealed ourselves to the Jedi. At last… we have revenge.', 4.5));
        });
        MG.after(9.2, () => { if (P2.saber) P2.saber.ignite(undefined, false); });
        MG.after(7.0, () => {
          const cf = Math.max(2.6, Math.min(3.6, NABOO.freeDist(P2, Math.atan2(hx, hz), 1.2)));
          CAM.play({ dur: 3.6, fov: 42, hold: true, fn: (t, u) => { const d = 2.1 + u * (cf - 2.1); return { pos: V3(P2.x + hx * d, 1.2 + u * 2.9, P2.z + hz * d), look: V3(P2.x - hx * u * 2, 1.2 - u * 0.7, P2.z - hz * u * 2) }; } });
        });
        MG.after(10.4, () => { if (key) key.on = false; GAME.result(true); });
      };
    });
  };
};
