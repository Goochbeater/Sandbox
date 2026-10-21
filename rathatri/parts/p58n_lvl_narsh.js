/* NAR SHADDAA · THE COIN ROOM (Act III, a3_narsh). docs/lore/03_mission_worlds.md §8 + the lorebook's "Hunted City" lesson.
   Beats: 1 the spire dock (pay the berth fee) · 2 the promenade: find the fixer and tail him through the crowd without being noticed
   (Traya: "become what their eyes slide past") · 3 the Coin Room plaza: the Exchange's broker hologram auctions a Sith amulet — BID or TAKE
   · 4 the ambush: Exchange gunmen, enforcers and (if you took it) a bounty-hunter pair off the bridge · 5 the cargo lift up to the bridge.
   City geometry: p57n/p57o (NAR). Crowd: NCROWD (Quaternius civilians + Trandoshans on walk loops; they flee when blasters start). */

/* ---- civilians: modelled Quaternius outfits in Smugglers'-Moon colours (spacer, dockhand, merchant, two women), and the hooded fixer */
(function () {
  const g = SC.g, R = SC.R, Pz = SC.Pz, base = CAST.SPECS.quigon, baseF = CAST.SPECS.celene;
  const mk = (name, female, over, qc, qo) => {
    CAST.SPECS[name] = Object.assign({}, female ? baseF : base, { name, cloth: undefined, beard: false, grey: false, braid: false }, over);
    CAST.QC[name] = Object.assign({}, female ? CAST.QC.celene : CAST.QC.quigon, { female: !!female, cullHead: false }, qc); CAST.QO[name] = qo;
  };
  mk('civ_spacer', false, { height: 1.0, skin: { tone: 0xb98a68, brow: 0x2a1c12, stubble: 0.2 } }, { hair: ['Hair_SimpleParted'], hairCol: 0x2a1c12, browCol: 0x2a1c12 },
    { parts: [R('Body', g([SC.toH(205, 0.35, 0.55)], 0.8, 0.9)), R('Arms', g([SC.toH(205, 0.35, 0.55)], 0.8, 0.9)), R('Legs', g([SC.toH(30, 0.3, 0.4)], 0.6, 0.6)), R('Feet_Boots', g([SC.leatherV(0.35, 0.6)], 0.6, 0.55)), R('Body_Belt_1', g([SC.leatherV(0.4)], 1, 0.8), { metal: 0.6 })], hair: ['Hair_SimpleParted'], hairCol: 0x2a1c12, browCol: 0x2a1c12 });
  mk('civ_dock', false, { height: 1.03, shoulders: 1.06, skin: { tone: 0x8a5e44, brow: 0x140d09, stubble: 0.3 } }, { hair: ['Hair_Buzzed'], hairCol: 0x140d09, browCol: 0x140d09 },
    { glove: 0x2a2620, parts: [Pz('Body', g([SC.CREAM(0.6, 0.62)], 0.6, 0.7, 0xd0c0a0)), Pz('Arms', g([SC.CREAM(0.6, 0.62)], 0.6, 0.7, 0xd0c0a0)), R('Legs', g([SC.toH(40, 0.5, 0.45)], 0.8, 0.6)), R('Feet_Boots', g([SC.leatherV(0.3, 0.5)], 0.5, 0.5)), R('Arms_Bracer', g([], 0.1, 0.6), { metal: 0.7 })], hair: ['Hair_Buzzed'], hairCol: 0x140d09, browCol: 0x140d09 });
  mk('civ_merchant', false, { height: 0.97, shoulders: 1.0, skin: { tone: 0xd0a080, brow: 0x5a4030, stubble: 0.1 } }, { hair: ['Hair_SimpleParted'], hairCol: 0x6a5040, browCol: 0x5a4030 },
    { parts: [Pz('Body', g([SC.CREAM(1.1, 0.7), SC.leatherV(1.4, 0.9)], 1.2, 0.9, 0xffd8a0)), Pz('Arms', g([SC.CREAM(1.1, 0.7)], 1.2, 0.9, 0xffd8a0)), Pz('Legs', g([SC.leatherV(0.8, 0.8)], 0.8, 0.7)), Pz('Feet', g([], 0.5, 0.5))], hair: ['Hair_SimpleParted'], hairCol: 0x6a5040, browCol: 0x5a4030 });
  mk('civ_woman', true, { height: 0.97, skin: { tone: 0xa87050, brow: 0x1a1008, stubble: 0 } }, { hair: ['Hair_Long'], hairCol: 0x120a06, browCol: 0x1a1008 },
    { parts: [R('Body', g([SC.toH(320, 0.55, 0.5)], 1.0, 0.85)), R('Arms', g([SC.toH(320, 0.55, 0.5)], 1.0, 0.85)), R('Legs', g([SC.toH(220, 0.3, 0.3)], 0.6, 0.5)), Pz('Feet', g([SC.leatherV(0.25, 0.4)], 0.4, 0.45))], hair: ['Hair_Long'], hairCol: 0x120a06, browCol: 0x1a1008 });
  mk('civ_woman2', true, { height: 1.0, skin: { tone: 0xe0b898, brow: 0x7a5030, stubble: 0 } }, { hair: ['Hair_Buns'], hairCol: 0xa06a3a, browCol: 0x7a5030 },
    { parts: [Pz('Body', g([SC.CREAM(0.5, 0.95)], 0.5, 0.95, 0xe8f0ff)), Pz('Arms', g([SC.CREAM(0.5, 0.95)], 0.5, 0.95, 0xe8f0ff)), Pz('Legs', g([SC.toH(190, 0.4, 0.4)], 0.7, 0.6)), Pz('Feet', g([SC.leatherV(0.35, 0.5)], 0.5, 0.5))], hair: ['Hair_Buns'], hairCol: 0xa06a3a, browCol: 0x7a5030 });
  mk('fixer', false, { height: 0.99, skin: { tone: 0xa88a74, brow: 0x3a3028, stubble: 0.25 } }, { hair: [], hairCol: 0x3a3028, browCol: 0x3a3028 },
    { parts: [Pz('Body', g([SC.CREAM(0.2, 0.32), SC.leatherV(0.4, 0.3)], 0.3, 0.42)), Pz('Arms', g([SC.CREAM(0.2, 0.32)], 0.3, 0.42)), Pz('Legs', g([SC.leatherV(0.3, 0.4)], 0.4, 0.4)), R('Feet_Boots', g([SC.leatherV(0.25, 0.4)], 0.4, 0.4))], hair: [], hairCol: 0x3a3028, browCol: 0x3a3028 });
  SC.extra.fixer = (T) => SC.hood(T, CM.cloth(0x2a2420, 0x4a4036, 0.9, 'fixerHood', true), true);
  CAST.SPECS.dockmaster = Object.assign({}, CAST.SPECS.civ_dock, { name: 'dockmaster', height: 1.0, shoulders: 1.1 }); CAST.QC.dockmaster = Object.assign({}, CAST.QC.civ_dock, { hair: ['Hair_SimpleParted'], hairCol: 0x6a6a6a });
  CAST.QO.dockmaster = Object.assign({}, CAST.QO.civ_dock, { hair: ['Hair_SimpleParted'], hairCol: 0x6a6a6a, browCol: 0x5a5a5a });
})();
/* ---- Exchange muscle: the kit's Black Sun gunmen and enforcers, re-badged for the Exchange */
Object.assign(ENEMY.TYPES, {
  exGun: Object.assign({}, ENEMY.TYPES.thug, { name: 'EXCHANGE GUNMAN', hp: 46 }),
  exEnf: Object.assign({}, ENEMY.TYPES.enforcer, { name: 'EXCHANGE ENFORCER', hp: 96 }),
});

/* ---- the crowd: walkers on lanes under the arcades and along the walks, idlers at stalls and kiosks. Cheap: no physics, no combat,
   animation LOD by distance, and they scatter (then fade) when the shooting starts */
const NCROWD = { list: [], panic: false };
NCROWD.KINDS = ['civ_spacer', 'civ_dock', 'civ_merchant', 'civ_woman', 'civ_woman2', 'trandoshan', 'trandoshan2'];
NCROWD.spawn = function (L, n) {
  NCROWD.list = []; NCROWD.panic = false; const R = NAR.rr(4727);
  const lanes = [[-12.6, 20, 96], [-13.8, 22, 95], [12.6, 18, 96], [13.8, 22, 64], [-3.2, 42, 96], [3.4, 40, 96]];
  for (let i = 0; i < n; i++) {
    const kind = NCROWD.KINDS[i % NCROWD.KINDS.length]; if (!CHAR.T[kind]) continue;
    const idle = i % 4 === 3, ln = lanes[i % lanes.length], z = idle ? [36, 52, 60, 84, 90][i % 5] : ln[1] + R() * (ln[2] - ln[1]), x = idle ? (i % 2 ? -1 : 1) * (11.8 + R() * 1.2) : ln[0] + (R() - 0.5) * 0.6;
    const a = new Actor(CHAR.T[kind], { x, y: 0, z, yaw: R() < 0.5 ? 0 : Math.PI, hp: 50, team: 'neutral', moves: MOV.cine });
    a.gravK = 0; a.grounded = true; a.floorY = 0;
    const c = { a, lane: ln, idle, dir: a.yaw === 0 ? 1 : -1, spd: 1.05 + R() * 0.45, ph: R() * 10, alpha: 1, base: idle ? pick(['talk', 'fold', 'idle']) : 'walk', lod: 0 };
    a.setBase(c.base, 0); a.animate(0.016); a.pose3D(0.016); a.root.traverse((m) => { if (m.isMesh) m.castShadow = false; }); NCROWD.list.push(c);
  }
  L.updates.push((dt) => NCROWD.update(dt));
  L.dispose = ((d0) => () => { if (d0) d0(); for (const c of NCROWD.list) c.a.dispose(); NCROWD.list = []; })(L.dispose);
};
NCROWD.scatter = function () { if (NCROWD.panic) return; NCROWD.panic = true; for (const c of NCROWD.list) { c.base = 'run'; c.spd = 4 + Math.random() * 1.5; c.flee = 2.5 + Math.random() * 2.5; } };
NCROWD.update = function (dt) {
  const P = PLAYER.a, cam = R.camera.position;
  for (const c of NCROWD.list) {
    const a = c.a; if (!a.root.visible && c.gone) continue;
    if (NCROWD.panic) {   // run for the walls and the gate, then fade out of the story
      if (P) { const dx = a.x - P.x, dz = a.z - P.z, d = Math.hypot(dx, dz) || 1; const tx = Math.sign(a.x || 1) * 18.5, tz = a.z + dz / d * 6; const yaw = Math.atan2(tx - a.x + dx / d * 4, tz - a.z); a.yaw = dampA(a.yaw, yaw, 6, dt); }
      a.x += Math.sin(a.yaw) * c.spd * dt; a.z += Math.cos(a.yaw) * c.spd * dt; a.x = clamp(a.x, -18.6, 18.6); a.z = clamp(a.z, 17.5, 97);
      c.flee -= dt; if (c.flee < 0) { c.alpha -= dt * 0.8; if (c.alpha <= 0) { a.root.visible = false; c.gone = true; continue; } }
      a.setBase('walk');
    } else if (!c.idle) {
      const ln = c.lane; a.z += c.dir * c.spd * dt; if (a.z > ln[2]) c.dir = -1; if (a.z < ln[1]) c.dir = 1;
      let want = c.dir > 0 ? 0 : Math.PI;
      if (P && Math.abs(P.x - a.x) < 1.2 && (P.z - a.z) * c.dir > 0 && Math.abs(P.z - a.z) < 2.4) { want += (P.x < a.x ? -0.6 : 0.6) * c.dir; a.x += (P.x < a.x ? 1 : -1) * dt * 0.9; }   // sidestep the player
      a.x = lerp(a.x, ln[0], dt * 0.3); a.yaw = dampA(a.yaw, want, 5, dt);
    } else if (P) { const d = Math.hypot(P.x - a.x, P.z - a.z); if (d < 4) a.yaw = dampA(a.yaw, Math.atan2(P.x - a.x, P.z - a.z), 2, dt); }
    const dc = Math.hypot(cam.x - a.x, cam.z - a.z);
    if (dc > 52) { a.root.visible = false; continue; } a.root.visible = true;
    c.lod += dt; const step = dc > 34 ? 0.12 : dc > 18 ? 0.05 : 0;   // far walkers animate at 8–20 Hz
    if (c.lod >= step) { a.animate(c.lod); a.pose3D(c.lod); c.lod = 0; } else { a.root.position.set(a.x, a.y, a.z); a.root.rotation.y = a.yaw; }
  }
};

/* ---- the broker hologram: a spherical droid's image (the lore says nobody has seen the droid since Malachor; the hologram still bids) */
const NSL = { };
NSL.gotoHolo = function () {
  const U = SC.holoU(), m = SC.holoMat(0x7ab8ff, false, U), mE = SC.holoMat(0xff7a6a, false, U), g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), m); g.add(body);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 8, 40), m); band.rotation.x = Math.PI / 2; g.add(band);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.12, 24), mE); eye.rotation.x = Math.PI / 2; eye.position.set(0, 0.04, 0.47); g.add(eye);
  for (const s of [-1, 1]) { const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.32, 12), m); pod.rotation.z = Math.PI / 2; pod.position.set(s * 0.6, -0.05, 0); g.add(pod); const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), m); ant.position.set(s * 0.18, 0.72, -0.1); ant.rotation.z = s * 0.25; g.add(ant); }
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.9, 1.3, 28, 1, true), SC.holoMat(0x3a70d0, false, U)); cone.position.y = -1.0; g.add(cone);
  g.userData.U = U; g.scale.setScalar(0.001); return g;
};
NSL.amulet = function () {   // a Sith amulet: a dark iron disc with a crimson stone, on a chain, under a ray-shield
  const g = new THREE.Group(), iron = new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.9, roughness: 0.35, envMapIntensity: 1.2 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 24), iron); disc.rotation.x = Math.PI / 2; g.add(disc);
  for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.04, 4), iron); const a = i / 6 * TAU; sp.position.set(Math.cos(a) * 0.062, Math.sin(a) * 0.062, 0); sp.rotation.z = a - Math.PI / 2; g.add(sp); }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 0.2, 0.12), toneMapped: false })); gem.position.z = 0.01; g.add(gem);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.62, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.2, 0.12), transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  shield.position.y = 0.05; g.add(shield); g.userData.shield = shield; g.userData.gem = gem; return g;
};

/* ---- the tail meter (Traya's lesson: neither too close nor lost) */
NSL.meter = function (on) {
  let el = document.getElementById('nsTail');
  if (!el) { el = document.createElement('div'); el.id = 'nsTail'; el.innerHTML = '<b>UNSEEN</b><i><u></u></i><em></em>';
    el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 74px);transform:translateX(-50%);z-index:25;width:min(260px,44vw);font:600 10px/1.2 Inter,system-ui,sans-serif;letter-spacing:.24em;color:#e9dccb;text-align:center;pointer-events:none;transition:opacity .3s;text-shadow:0 1px 3px #000';
    const st = document.createElement('style'); st.textContent = '#nsTail i{display:block;height:4px;margin:5px 0 4px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden}#nsTail u{display:block;height:100%;width:0;background:linear-gradient(90deg,#e9dccb,#ff5a3c);transition:width .15s}#nsTail em{font-style:normal;letter-spacing:.12em;opacity:.8;font-weight:500}#nsTail.hot b{color:#ff6a4a}';
    document.head.appendChild(st); document.body.appendChild(el); }
  el.style.opacity = on ? 1 : 0; return el;
};

LEVEL.def('narshaddaa', {
  chapter: 'ACT III', name: 'NAR SHADDAA · THE COIN ROOM', world: 'narshaddaa', hero: 3, sheathed: true,
  cast: ['exGun', 'exEnf'].map((t) => ENEMY.TYPES[t].tpl).concat(['bhunter', 'bhunterB', 'fixer', 'dockmaster', 'civ_spacer', 'civ_dock', 'civ_merchant', 'civ_woman', 'civ_woman2', 'trandoshan', 'trandoshan2']),
  tex: [], start: [3, 0, 114, Math.PI], checkpoints: [[3, 0, 114, Math.PI], [0, 0, 38, Math.PI]], killY: -20,
  async build(L) {
    const lite = typeof QUAL !== 'undefined' && QUAL.tier === 'low';
    const N = NAR.build(L, { lite }); L.N = N;
    TEX.reflect(NAR.mats.ground, 0.55, 'narGround');
    LEVEL.add(NAR.sky(L)); L.env = NAR.envScene();
    R.setSun(new THREE.Vector3(-0.5, 0.38, 0.78), 0xff9a70, 1.1, 0x9a7a96, 0x3a2628, 2.1);
    R.scene.fog = new THREE.FogExp2(new THREE.Color(0.18, 0.08, 0.1), 0.0062);
    R.G.exposure = 1.22; R.G.bloom = 0.34; R.G.ssr = lite ? 0 : 1.0; R.G.ssrMax = 34; R.setShadowBox(26, 170);
    R.G.gShadow.setRGB(0.93, 0.98, 1.09); R.G.gHigh.setRGB(1.1, 0.98, 0.88); R.G.sat = 1.18;
    if (!lite) { R.G.vol = 1.0; R.G.volDen = 0.004; R.G.volFall = 0.02; R.G.volH = 0; R.G.volOut = 1.0; R.G.volG = 0.62; R.G.volMax = 70; R.G.volAmb.setRGB(0.014, 0.007, 0.011); }
    // the Harbinger on the platform, cold engines, ramp down
    if (typeof SHIP !== 'undefined' && SHIP.build) { try { const sh = SHIP.build(SAVE.d.ship || 'harbinger'); SHIP.pose && SHIP.pose(sh, 'land', 1); sh.position.set(-5, 0, 119); sh.rotation.y = 0.55; LEVEL.add(sh); L.ship = sh; PHY.obox(-5, 119, 5, 12, 0, 6, 0.55); } catch (e) { console.warn('narsh ship', e); } }
    // the broker hologram and the amulet on the pedestal
    const h = N.holo; L.goto = NSL.gotoHolo(); L.goto.position.set(h[0], h[1] + 2.4, h[2]); LEVEL.add(L.goto);
    L.amulet = NSL.amulet(); L.amulet.position.set(h[0], h[1] + 0.32, h[2]); LEVEL.add(L.amulet);
    L.updates.push((dt, t) => { const G = L.goto; G.userData.U.uT.value = t; G.rotation.y = Math.sin(t * 0.4) * 0.5 + (L.gotoFace || 0); G.position.y = h[1] + 2.4 + Math.sin(t * 1.3) * 0.06;
      const k = L.gotoOn ? 1 : 0.001; G.scale.setScalar(damp(G.scale.x, k, 4, dt)); const A = L.amulet; if (!A.userData.taken) { A.rotation.y = t * 0.8; A.userData.gem.scale.setScalar(1 + 0.15 * Math.sin(t * 5)); } });
    // the cargo lift car
    const lift = N.lift, car = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0x4a4a4e, metalness: 0.8, roughness: 0.5 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 3.4), steel); car.add(floor);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 0.06), steel); r.position.set(0, 1.05, s * 1.7); car.add(r); const r2 = r.clone(); r2.rotation.y = Math.PI / 2; r2.position.set(s * 1.7, 1.05, 0); car.add(r2); }
    const glow = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.7, 0.4), toneMapped: false })); glow.position.set(0, 0.1, 1.66); car.add(glow);
    car.position.set(lift.x, 0.08, lift.z); LEVEL.add(car); L.car = car;
    HOLOCRON.place(L, [[-18.2, 0, 60], [15.2, 0, 99.5], [-16.5, 0, 22]]);
    // ambient crowd
    NCROWD.spawn(L, lite ? 10 : 18);
    CAST.need(['fixer', 'dockmaster']);
  },
  onStart(L, cp) {
    const N = L.N, h = N.holo; L.st = { cp, tail: 0, notice: 0, fee: cp > 0, met: cp > 0, auction: cp > 0, ambush: false, blown: false, look: 0, lookT: 6 };
    HUD.toast('NAR SHADDAA', 'THE SMUGGLERS’ MOON', 3.5);
    if (typeof CODEX !== 'undefined') CODEX.unlock('place_nar_shaddaa', true);
    // the dockmaster at the office window, a power droid by his stool
    const dm = new Actor(CHAR.T.dockmaster, { x: 11.2, y: 0, z: 104.3, yaw: -HALF, hp: 50, team: 'neutral', moves: MOV.cine }); dm.setBase('fold', 0); dm.gravK = 0; dm.grounded = true; L.dm = dm;
    const fx = new Actor(CHAR.T.fixer, { x: -6.2, y: 0, z: 93.6, yaw: Math.PI * 0.2, hp: 60, team: 'neutral', moves: MOV.cine }); fx.setBase('idle', 0); fx.gravK = 0; fx.grounded = true; L.fixer = fx;
    for (const a of [dm, fx]) { a.animate(0.016); a.pose3D(0.016); }
    L.dispose = ((d0) => () => { if (d0) d0(); for (const a of [L.dm, L.fixer]) if (a) a.dispose(); NSL.meter(false); })(L.dispose);
    L.updates.push((dt) => {
      for (const a of [L.dm, L.fixer]) if (a && a.root.visible) { a.animate(dt); a.pose3D(dt); }
      if (L.st.tail === 1) NSL.tailUpdate(L, dt);
      if (L.lifting) NSL.liftUpdate(L, dt);
    });
    if (cp === 0) {
      LEVEL.establish && LEVEL.establish(L, cp, { dur: 6, fov: 50, p0: V3(-8, 34, 140), p1: V3(2, 4, 121), l0: V3(0, 30, 40), l1: V3(1, 2, 100) });
      HUD.obj('Pay the berth fee — the dock office by the gate');
      MG.after(2.4, () => HUD.sub('TRAYA', 'The coin is a leash, and the Hutts hold the other end. Walk softly. Every ledger here has eyes.', 6, 'sid'));
      LEVEL.interactable(12.2, 0, 104.3, 2.6, 'PAY FEE', () => NSL.payFee(L), { once: true });
    } else NSL.respawnPlaza(L);
  },
});
NSL.say = (who, line, dur, cls) => HUD.sub(who, line, dur || Math.max(2.6, line.length * 0.065), cls);
NSL.payFee = function (L) {
  const S = L.st; S.fee = true; L.dm.setBase('talk');
  const seq = [['DOCKMASTER', 'Berth fee’s forty. Exchange tax is another twenty. Don’t ask what the tax pays for.'], ['RATHATRI', 'It pays for you to forget my ship.'], ['DOCKMASTER', 'Forgetting costs extra. Your contact’s inside the gate. Hood. Doesn’t like being looked at.']];
  let t = 0; for (const [w, l] of seq) { MG.after(t, () => NSL.say(w, l)); t += Math.max(2.8, l.length * 0.065) + 0.3; }
  MG.after(t, () => { L.dm.setBase('fold'); HUD.obj('Find the fixer inside the gate'); LEVEL.interactable(L.fixer.x, 0, L.fixer.z, 2.4, 'SPEAK', () => NSL.meetFixer(L), { once: true }); });
};
NSL.FIXPATH = [[-6.2, 93.6], [-11.6, 86], [-12.2, 74], [-11.4, 62], [-4.5, 56.5], [2.2, 50], [8.8, 43], [6.5, 36.5], [2.6, 33.2]];
NSL.meetFixer = function (L) {
  const S = L.st; S.met = true; L.fixer.yaw = Math.atan2(PLAYER.a.x - L.fixer.x, PLAYER.a.z - L.fixer.z); L.fixer.setBase('talk');
  const seq = [['VESS', 'You’re the buyer from the jungle moon. You look like you’d rather steal it.'], ['RATHATRI', 'I’m deciding.'], ['VESS', 'Then decide quietly. Walk behind me. Not close. The Exchange counts faces.'], ['TRAYA', 'Do not hide from them. Become what their eyes slide past.', 'sid']];
  let t = 0; for (const [w, l, c] of seq) { MG.after(t, () => NSL.say(w, l, 0, c)); t += Math.max(2.8, l.length * 0.065) + 0.3; }
  MG.after(t, () => { S.tail = 1; S.wp = 1; L.fixer.setBase('walk'); HUD.obj('Tail the fixer to the Coin Room — stay 8–14 m back when he turns'); NSL.meter(true); });
};
/* the tail: notice rises when too close, too fast, too loud (Force, blades) or caught in his glance; lost if too far. 100 = blown. */
NSL.tailUpdate = function (L, dt) {
  const S = L.st, F = L.fixer, P = PLAYER.a; if (!P) return;
  const wp = NSL.FIXPATH[S.wp]; let moving = true;
  if (S.look > 0) { S.look -= dt; moving = false; F.yaw = dampA(F.yaw, Math.atan2(P.x - F.x, P.z - F.z), 5, dt); if (S.look <= 0) F.setBase('walk'); }
  else if (wp) { const dx = wp[0] - F.x, dz = wp[1] - F.z, d = Math.hypot(dx, dz); if (d < 0.4) { S.wp++; if (!NSL.FIXPATH[S.wp]) { S.tail = 2; F.setBase('fold'); NSL.meter(false); NSL.toPlaza(L); return; } }
    else { F.yaw = dampA(F.yaw, Math.atan2(dx, dz), 4, dt); F.x += Math.sin(F.yaw) * 1.32 * dt; F.z += Math.cos(F.yaw) * 1.32 * dt; } }
  S.lookT -= dt; if (S.lookT <= 0 && moving) { S.look = 1.5; S.lookT = 7 + Math.random() * 5; F.setBase('idle'); }
  const d = Math.hypot(P.x - F.x, P.z - F.z), sp = Math.hypot(P.vx || 0, P.vz || 0); let dn = -7, why = 'UNSEEN';
  if (d < 3.6) { dn = 22; why = 'TOO CLOSE'; } else if (d > 16) { dn = 12; why = 'LOSING HIM'; } else if (sp > 4.2 && d < 9) { dn = 9; why = 'RUNNING'; }
  if (S.look > 0) { const ang = Math.abs(wrapA(Math.atan2(P.x - F.x, P.z - F.z) - F.yaw)); if (ang < 0.9 && d < 8) { dn = Math.max(dn, 22); why = 'HE LOOKS BACK'; } else if (ang < 0.9) why = 'HE LOOKS BACK \u00b7 HOLD'; }
  if (/^(attack|grip|exec|throw)$/.test(PLAYER.state) || (P.act && /^(a\d|heavy|lunge|push|throw|slam|whirl|spin)/.test(P.act)) || !HERO.sheathed) { dn = Math.max(dn, 40); why = HERO.sheathed ? 'TOO LOUD' : 'BLADE LIT'; }
  S.notice = clamp(S.notice + dn * dt, 0, 100);
  const el = NSL.meter(true); el.querySelector('u').style.width = S.notice + '%'; el.querySelector('b').textContent = S.notice > 60 ? 'NOTICED' : 'UNSEEN'; el.querySelector('em').textContent = why + ' · ' + d.toFixed(0) + ' M'; el.classList.toggle('hot', S.notice > 60);
  if (S.notice >= 100) { S.tail = 3; S.blown = true; NSL.meter(false); F.setBase('walk'); NSL.say('VESS', 'You were seen. They’re coming — the plaza, now!'); NCROWD.scatter(); NSL.ambush(L, true); }
};
/* the plaza: the fixer arrives, the broker hologram wakes. Auction scene (CINE, in-level) with the BID / TAKE choice */
NSL.toPlaza = function (L, fromCp) {
  const S = L.st; HUD.obj('The Coin Room — step up to the pedestal');
  if (fromCp) { L.fixer.x = 2.6; L.fixer.z = 33.2; L.fixer.setBase('fold'); S.met = S.fee = true; }
  LEVEL.trigger(-6, 26, 6, 36, () => NSL.auction(L));
};
NSL.auction = function (L) {
  const S = L.st; if (S.auction) return; S.auction = true; L.gotoOn = true; LEVEL.checkpoint && LEVEL.checkpoint(1);
  if (typeof CODEX !== 'undefined') CODEX.unlock('history_goto_exchange');
  L.gotoFace = Math.atan2(PLAYER.a.x - L.goto.position.x, PLAYER.a.z - L.goto.position.z);
  const done = () => { const k = SAVE.choice('x_ns_auction') || 'B'; S.choice = k; NSL.afterAuction(L, k); };
  if (S.blown) { SAVE.choice('x_ns_auction', 'B'); NSL.say('GOTO', 'The Exchange regrets that bidding is closed. Collection has begun.'); done(); return; }
  if (CINE.has('x_ns_auction')) CINE.play('x_ns_auction', done); else done();
};
NSL.afterAuction = function (L, k) {
  const A = L.amulet; A.userData.taken = true; A.userData.shield.visible = false;
  const P = PLAYER.a, p0 = A.position.clone(); let t = 0;   // the amulet comes to his hand
  const up = (dt) => { t += dt; const k2 = Math.min(1, t / 0.9), tgt = V3(P.x, P.y + 1.2, P.z); A.position.lerpVectors(p0, tgt, k2 * k2); A.rotation.y += dt * 10; if (k2 >= 1 && A.visible) { A.visible = false; SAVE.giveArtifact('sith_amulet'); HUD.toast('ARTIFACT', 'SITH AMULET', 3.2); FX.ring && FX.ring(V3(P.x, P.y + 0.05, P.z), [2.4, 0.3, 0.15], 2, 0.5); } };
  L.updates.push(up);
  if (k === 'A') { HEAT.sub(3); NSL.say('GOTO', 'Sold. The Exchange thanks you, and will remember your face as a customer. Three other parties prefer to remember it as a bounty.'); }
  else { HEAT.add(10, 'exchange'); NSL.say('GOTO', 'Theft is a bid with unusual terms. The Exchange accepts. Collection begins now.'); }
  MG.after(1.2, () => { L.gotoOn = false; NCROWD.scatter(); NSL.ambush(L, k !== 'A'); });
  L.fixer.setBase('walk'); L.fixerFlee = (dt) => { const F = L.fixer; F.yaw = dampA(F.yaw, Math.PI * 0.15, 4, dt); F.x += Math.sin(F.yaw) * 3.4 * dt; F.z += Math.cos(F.yaw) * 3.4 * dt; if (F.z > 60) F.root.visible = false; };
  L.updates.push((dt) => L.fixerFlee && L.fixerFlee(dt));
};
/* the ambush: from the vault door, the arcades and (for a thief) two hunters off the bridge */
NSL.ambush = function (L, hard) {
  const S = L.st; if (S.ambush) return; S.ambush = true; HUD.obj('Survive the Exchange');
  const w1 = [['exGun', -4, 19.5], ['exGun', 4, 19.5], ['exEnf', 0, 18.4], ['exGun', -13, 40], ['exGun', 13.5, 44]];
  if (hard) w1.push(['exEnf', -8, 22], ['exGun', 9, 24]);
  LEVEL.wave(w1, () => {
    const w2 = hard ? [['bhunter', -6, 46, { y: 6 }], ['bhunterB', 6, 48, { y: 6 }], ['exGun', -12, 58]] : [['exEnf', -10, 52], ['exGun', 11, 56], ['exGun', -2, 60]];
    HUD.sub(hard ? 'BOUNTY HUNTER' : 'EXCHANGE', hard ? 'That’s him. The Exchange pays double if the amulet comes back clean.' : 'Boss says the customer’s always right. Boss isn’t here.', 4);
    LEVEL.wave(w2, () => { HUD.obj('Ride the cargo lift up to the bridge'); NSL.liftReady(L); }, { now: true, stagger: 0.5 });
  }, { now: true, stagger: 0.35 });
};
NSL.liftReady = function (L) {
  const lift = L.N.lift;
  LEVEL.interactable(lift.x, 0, lift.z, 2.4, 'RIDE LIFT', () => {
    const P = PLAYER.a; P.x = lift.x; P.z = lift.z; P.vx = P.vz = 0; PLAYER.state = 'cine'; L.lifting = { t: 0 }; TOUCH.want = 'none';
    CAM.play({ p0: V3(lift.x - 9, 6, lift.z + 12), p1: V3(lift.x - 14, 40, lift.z + 22), l0: V3(lift.x, 2, lift.z), l1: V3(lift.x, 34, lift.z), dur: 8, fov: 50, hold: true });
    NSL.say('TRAYA', 'You bought it, or you took it. Either way, someone now owes someone. That is the only law on this moon.', 6, 'sid');
  }, { once: true });
};
NSL.liftUpdate = function (L, dt) {
  const T = L.lifting, lift = L.N.lift, P = PLAYER.a; T.t += dt; const k = clamp(T.t / 8, 0, 1), y = (k * k * (3 - 2 * k)) * lift.top;
  L.car.position.y = 0.08 + y; P.x = lift.x; P.z = lift.z; P.y = y + 0.16; P.vy = 0; P.grounded = true; P.floorY = P.y;
  if (T.t > 8.5 && !T.done) { T.done = true; NSL.say('RATHATRI', 'Then they owe me.', 3); MG.after(1.8, () => { if (typeof MISSION !== 'undefined' && MISSION.cur) MISSION.complete({ rank: L.st.blown ? 'B' : 'A', note: L.st.choice === 'A' ? 'BOUGHT' : 'TAKEN' }); else GAME.toHub && GAME.toHub(); }); }
};
/* the auction, staged in-level: Rathatri where the player stands, Vess at his shoulder, the broker hologram over the pedestal */
CINE.def('x_ns_auction', {
  level: null,
  stage: [{ id: 'rath', cast: 'rath3', pos: [1.4, 0, 34.6], yaw: Math.PI }, { id: 'vess', cast: 'fixer', pos: [3.4, 0, 33.6], yaw: -2.4, base: 'fold' }],
  onStart(c) { const P = PLAYER.a, a = c.actors.rath, v = c.actors.vess, L = LEVEL.cur; if (P && a) { a.x = P.x; a.z = P.z; a.yaw = Math.atan2(0 - P.x, 30 - P.z); } if (L && L.fixer) { L.fixer.root.visible = false; if (v) { v.x = L.fixer.x; v.z = L.fixer.z; v.yaw = Math.atan2(0 - v.x, 30 - v.z); } } },
  onEnd() { const L = LEVEL.cur; if (L && L.fixer) L.fixer.root.visible = true; },
  cam: [CINE.cam.fix([0, 2.2, 44], [0, 9, 18], [0.6, 2.6, 41], [0, 6, 22], 50), CINE.cam.orbit([0, 0, 30], 7.2, 2.4, 0.3, 0.1, 42, 3.0), CINE.cam.orbit([0, 0, 30], 6.4, 2.2, -0.15, -0.35, 42, 3.0),
    CINE.cam.close('vess', 1.6, 1.6, 0.3, 32), CINE.cam.over('vess', 'rath', 34), CINE.cam.orbit([0, 0, 30], 5.0, 3.2, 0.6, 0.8, 38, 3.4), CINE.cam.over('rath', 'vess', 38)],
  act: { 3: [{ who: 'vess', base: 'talk' }], 4: [{ who: 'vess', base: 'fold' }, { who: 'rath', base: 'talk' }], 5: [{ who: 'rath', base: 'idle' }] },
});
CINE.SPK.GOTO = 'jedi';
