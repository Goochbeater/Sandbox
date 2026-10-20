/* CHAPTER II — THE HUNT (Tatooine). The Dune Sea on the Bloodfin, a Tusken war party, the Jundland Wastes, and
   a Jedi on the flats beside a chrome starship. */
const TAT = {};
TAT.pathX = (z) => 22 * Math.sin(z * 0.011) + 8 * Math.sin(z * 0.031 + 1);
TAT.dunes = function (x, z) {
  const px = TAT.pathX(z), dp = Math.abs(x - px);
  let h = 6.5 * Math.sin(x * 0.034 + 1.6 * Math.sin(z * 0.019)) * (0.55 + 0.45 * Math.sin(z * 0.012 + 1)) + 7 * (fbm2(x * 0.008 + 10, z * 0.008, 3) - 0.5) + 2.5 * Math.sin((x + z * 0.4) * 0.09);
  h *= lerp(0.35, 1, smooth(8, 40, dp));                                // the trail is gentler
  const r0 = Math.hypot(x, z + 6); h = lerp(0, h, smooth(22, 55, r0));   // landing plateau
  // Jundland mesas rise beyond z 270, split by the canyon mouth
  const mouth = Math.abs(x - TAT.pathX(z)) < 9 + Math.max(0, 300 - z) * 0.2;
  if (z > 255) {
    const jag = (fbm2(x * 0.09 + 3, z * 0.09, 3) - 0.5) * 16 + (fbm2(x * 0.3, z * 0.3, 2) - 0.5) * 4;
    const k = smooth(262, 272, z + jag);
    let top = 24 + 10 * fbm2(x * 0.05, z * 0.05, 3) + 4 * (fbm2(x * 0.18 + 5, z * 0.18, 3) - 0.5);
    const t = k * (mouth ? 1 : smooth(9, 14, Math.abs(x - TAT.pathX(z)) + jag * 0.3));
    const tt = Math.floor(t * 4) / 4 + smooth(0.55, 1, (t * 4) % 1) / 4;   // stepped strata on the cliff faces
    h = lerp(h, mouth ? 0.5 + (fbm2(x * 0.1, z * 0.1) - 0.5) : top, mouth ? t : lerp(t, tt, 0.6));
  }
  return h;
};
TAT.ship = function () {   // J-type 327 Nubian royal starship: a long, flat, mirror-chrome dagger (forward = -Z, ≈60 m)
  const g = new THREE.Group();
  const chr = PROPS._nsC || (PROPS._nsC = new THREE.MeshPhysicalMaterial({ color: 0xc4c8d0, metalness: 1, roughness: 0.09, clearcoat: 0.6, clearcoatRoughness: 0.05, envMapIntensity: 1.25 }));
  const dk = PROPS.m('nsd', { color: 0x1a1c22, metalness: 0.7, roughness: 0.3 });
  const glass = PROPS.m('nsg', { color: 0x0a1426, metalness: 0.9, roughness: 0.03, envMapIntensity: 1.8 });
  const hull = PROPS.sdfMesh('jtype', (grp) => {
    const C = grp(0, 0.6), D = grp(1, 0.05), W = grp(2, 0.05);
    C.add(SDF.ell([0, 0, -1], [6.5, 1.55, 28.5]));
    C.add(SDF.ell([0, 0.25, -12], [3.6, 1.3, 17]), 'su', 1.2);
    C.add(SDF.ell([0, 1.15, -4], [2.5, 1.0, 12]), 'su', 1.0);
    C.add(SDF.ell([0, 1.9, -9.5], [1.9, 0.9, 4.6]), 'su', 0.6);
    C.add(SDF.ell([0, -1.1, 3], [3.4, 0.9, 15]), 'su', 0.9);
    C.both(SDF.box([6.4, -0.2, 16.5], [2.4, 0.32, 3.8], 0.25, SDF.rot(0, 14, 0)), 'su', 1.1);
    C.both(SDF.rcone([8.0, -0.2, 11.5], [8.0, -0.2, 21.5], 1.45, 1.2), 'su', 0.5);
    C.both(SDF.rcone([8.0, -0.2, 21.5], [8.0, -0.2, 24.6], 1.2, 0.55), 'su', 0.3);
    D.add(SDF.ell([0, 0, -1], [6.56, 0.07, 28.6]));   // the rim seam where upper and lower hull meet
    D.both(SDF.ell([8.0, -0.2, 24.5], [0.9, 0.9, 0.3]), 'su', 0.05);   // engine nozzles
    D.add(SDF.box([0, -1.95, 1.0], [1.6, 0.1, 3.8], 0.05), 'su', 0.05);   // ramp hatch
    W.add(SDF.ell([0, 2.25, -12.6], [1.35, 0.42, 1.7]));   // bridge viewport
    W.both(SDF.ell([2.9, 1.25, -7], [0.25, 0.18, 0.9], SDF.rot(0, 0, -30)), 'su', 0.02);
  }, [-9.8, -2.4, -30.5, 9.8, 3.1, 29], 0.22);
  const h = new THREE.Mesh(hull, [chr, dk, glass]); g.add(h);
  for (const s of [1, -1]) { const ex = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), KIT.emis(0x8ab4ff, 1.4)); ex.position.set(s * 8.0, -0.2, 24.86); g.add(ex); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g;
};
LEVEL.def('dunes', {
  chapter: 'CHAPTER II', name: 'THE DUNE SEA', world: 'tatooine', cast: ['guard', 'panaka'],
  tex: ['sand', 'rock', 'hull'],
  start: [2, 0, 2, 0], checkpoints: [[2, 0, 2, 0], [TAT.pathX(236), 0, 236, 0]], killY: -30,
  async build(L) {
    TERRAIN.tatooineSky(L);
    TERRAIN.build(TAT.dunes, -220, -140, 220, 330, 2.2, TERRAIN.mat('dunes'));
    const rock = TERRAIN.rockMat(), rs = MG.rs('dunes');
    for (let i = 0; i < 46; i++) {
      const z = rs() * 250 + 10, side = rs() < 0.5 ? -1 : 1, x = TAT.pathX(z) + side * (8 + rs() * 90);
      if (Math.hypot(x, z) < 30) continue;
      TERRAIN.rock(x, z, 2 + rs() * 7, 3 + rs() * 12, i * 97 + 3, rock);
    }
    for (let i = 0; i < 14; i++) { const z = 40 + i * 16 + rs() * 8, x = TAT.pathX(z) + (rs() - 0.5) * 10; TERRAIN.rock(x, z, 1.4 + rs() * 1.8, 3 + rs() * 5, i * 31 + 7, rock); }   // slalom spires on the trail
    for (let i = 0; i < 18; i++) { const a = rs() * PI + PI * 0.5, r = 260 + rs() * 120; TERRAIN.rock(Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.3 - 120, 18 + rs() * 25, 30 + rs() * 50, i * 13 + 5, rock, { col: false }); }
    // the Scimitar on the plateau, probes, the Bloodfin
    L.ship = PROPS.scimitar(); L.ship.position.set(16, 4.6, -12); L.ship.rotation.y = -0.6; LEVEL.add(L.ship);
    PHY.obox(16, -12, 5, 10, 0, 5, -0.6);
    for (const [x, z] of [[-30, 60], [40, 110], [-45, 190], [55, 230]]) { const v = PROPS.vaporator(); v.position.set(x, TAT.dunes(x, z) - 0.2, z); LEVEL.add(v); PHY.cyl(x, z, 0.5, TAT.dunes(x, z), TAT.dunes(x, z) + 4); }
    L.probes = [];
    for (let i = 0; i < 3; i++) { const p = RIDE.probe(); p.position.set(16, 4, -12); L.probes.push({ p, a: -0.9 + i * 0.9 }); }
    L.updates.push((dt, t) => { for (const q of L.probes) { if (!L.flags.launched) continue; const k = Math.min(1, (t - L.flags.launched) / 6); q.p.position.set(16 + Math.sin(q.a) * k * 160, 4 + k * 40, -12 + Math.cos(q.a) * k * 200); q.p.lookAt(q.p.position.clone().add(V3(Math.sin(q.a), 0.2, Math.cos(q.a)))); } });
    RIDE.spawnBike(-3, 7, 0);
    HOLOCRON.place(L, [[16, 5.0, -12], [-60, TAT.dunes(-60, 150), 150], [TAT.pathX(200) + 70, TAT.dunes(TAT.pathX(200) + 70, 200), 200]]);
    // a guide probe hovering at the canyon mouth
    L.beacon = RIDE.probe(); L.beacon.position.set(TAT.pathX(282), TAT.dunes(TAT.pathX(282), 282) + 4, 282);
    L.updates.push((dt, t) => { L.beacon.position.y += Math.sin(t * 2) * 0.01; L.beacon.children[1].visible = Math.sin(t * 8) > 0; });
  },
  onStart(L, cp) {
    const say = (w, t, d, c) => HUD.sub(w, t, d, c);
    HUD.toast('TATOOINE', 'THE DUNE SEA', 3.5);
    CLOAK.wear(PLAYER.a, true);
    const war = () => {
      HUD.obj('Wipe out the Queen\'s scouting party');
      const z = 256, x = TAT.pathX(z);
      LEVEL.wave([['guard', x - 6, z + 6], ['guard', x + 5, z + 8], ['guard', x - 2, z + 14], ['guard', x + 7, z + 16], ['guard', x - 12, z + 4], ['guard', x + 13, z + 10]], () => {
        HUD.obj('Enter the Jundland Wastes'); HUD.sub('DARTH MAUL', 'The probe has found them. The Jundland Wastes.', 3);
        LEVEL.trigger(TAT.pathX(290) - 16, 282, TAT.pathX(290) + 16, 300, () => GAME.next());
      }, { now: true, stagger: 0.2, alert: true });
    };
    if (cp >= 1) { war(); return; }
    if (L.skipIntro) { L.flags.launched = 0.01; HUD.obj('Take the Bloodfin — follow the probe signal north'); }
    // intro: probes launch from the Scimitar
    const P = PLAYER.a; if (!L.skipIntro) { PLAYER.state = 'cine'; HUD.show(false); }
    if (!L.skipIntro) CAM.play({ dur: 6.5, fov: 42, fn: (t, u) => ({ pos: V3(-8 + u * 6, 2.2 + u * 1.5, 14 - u * 3), look: V3(12 - u * 4, 3 + u * 8, -10 + u * 20) }) });
    if (!L.skipIntro) MG.after(1.0, () => { L.flags.launched = LEVEL.cur.t; say('', 'Three DRK-1 probe droids streak out across the Dune Sea.', 3); });
    if (!L.skipIntro) MG.after(4.0, () => say('DARTH SIDIOUS', 'Tatooine is sparsely populated. If the trail is correct, you will find them quickly.', 3.5, 'sid'));
    if (!L.skipIntro) MG.after(6.6, () => { PLAYER.state = 'move'; HUD.show(true); HUD.obj('Take the Bloodfin — follow the probe signal north'); HUD.hint('Walk to the speeder and press ' + IN.keyLabel('grip'), 5); });
    // leaving the bike behind at the mesa
    LEVEL.trigger(TAT.pathX(236) - 60, 236, TAT.pathX(236) + 60, 244, () => {
      if (RIDE.on) { RIDE.dismount(false); HUD.pop('THE WASTES ARE TOO NARROW — ON FOOT'); }
      LEVEL.checkpoint(1); war();
    });
  },
});
/* ------------------------------------------------------------------ canyon + flats */
TAT.cpath = [[0, -10], [8, 40], [-12, 95], [2, 150], [26, 205], [36, 255], [52, 305], [70, 345]];
TAT.cx = function (z) { const P = TAT.cpath; if (z <= P[0][1]) return P[0][0]; for (let i = 1; i < P.length; i++) if (z <= P[i][1]) { const u = (z - P[i - 1][1]) / (P[i][1] - P[i - 1][1]); return lerp(P[i - 1][0], P[i][0], easeIO(u)); } return P[P.length - 1][0]; };
TAT.canyon = function (x, z) {
  const cx = TAT.cx(z), w = 10.5 + 3.5 * Math.sin(z * 0.05) + (z > 330 ? (z - 330) * 1.5 : 0);
  const d = Math.abs(x - cx);
  const floor = 0.4 * (fbm2(x * 0.08, z * 0.08, 2) - 0.5) + (z > 340 ? 0 : 0);
  if (z > 350) { const open = smooth(350, 370, z); const wall = 30 + 10 * fbm2(x * 0.04, z * 0.04, 3); return lerp(lerp(floor, wall, smooth(w, w + 7, d)), floor + 2 * (fbm2(x * 0.02, z * 0.02, 3) - 0.5), open); }
  const wall = 24 + 9 * fbm2(x * 0.045, z * 0.045, 4);
  const jag = (fbm2(x * 0.22, z * 0.22, 3) - 0.5) * 2.4 + (fbm2(x * 0.6 + 7, z * 0.6, 2) - 0.5) * 0.9;
  const t = smooth(w, w + 2.6 + 2.2 * fbm2(z * 0.03, x * 0.03, 2), d + jag * 1.25);
  const terr = Math.floor(t * 5) / 5, tt = lerp(t, terr + smooth(0, 1, (t * 5) % 1) / 5, 0.55);   // stepped strata
  return floor + wall * tt + (t > 0.05 ? jag * t : 0);
};
LEVEL.def('canyon', {
  chapter: 'CHAPTER II', name: 'JUNDLAND WASTES', world: 'tatooine', cast: ['guard', 'panaka', 'quigon'],
  tex: ['sand', 'rock', 'hull', 'adobe'],
  start: [0, 0, -4, 0], checkpoints: [[0, 0, -4, 0], [TAT.cx(160), 0, 160, 0], [TAT.cx(372), 0, 372, 0.8]], killY: -30,
  async build(L) {
    TERRAIN.tatooineSky(L);
    R.scene.fog.density = 0.004;
    TERRAIN.build(TAT.canyon, -60, -30, 170, 430, 1.4, TERRAIN.mat('canyon'));
    const rock = TERRAIN.rockMat(), rs = MG.rs('canyon');
    RUN.scatter({ seed: 'canyonScatter', z0: -20, z1: 380, cx: TAT.cx, h: TAT.canyon, line: () => 99, band: (z) => 9 + 3.5 * Math.sin(z * 0.05), gorge: true, nz: 3, scrub: 0.1, detail: 1, pebScale: 1.0, pebCol: 0xe6d8c0 });   // pebbles + dry scrub on the wash floor
    for (let i = 0; i < 60; i++) { const z = 10 + rs() * 330, w = 10.5 + 3.5 * Math.sin(z * 0.05), x = TAT.cx(z) + (rs() < 0.5 ? -1 : 1) * (w - 2.5 + rs() * 3); TERRAIN.rock(x, z, 0.7 + rs() * 1.8, 0.8 + rs() * 2.4, i * 71 + 9, rock, { col: rs() < 0.5, y: TAT.canyon(TAT.cx(z), z) }); }
    // big fallen outcrops leaning out of the wall bases
    for (let i = 0; i < 26; i++) { const z = 14 + i * 12.5 + rs() * 6, sd = rs() < 0.5 ? -1 : 1, w = 10.5 + 3.5 * Math.sin(z * 0.05), x = TAT.cx(z) + sd * (w + 1.5 + rs() * 2); TERRAIN.rock(x, z, 2.4 + rs() * 2.6, 4 + rs() * 6, i * 131 + 17, rock, { col: false, stretch: 1.1 + rs() * 0.4, y: TAT.canyon(TAT.cx(z), z) }); }
    // krayt dragon skeleton across the canyon floor
    const bone = new THREE.MeshStandardMaterial({ map: TEX.sets.sand.map, color: 0xe4dccb, normalMap: TEX.sets.rock.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.86, envMapIntensity: 0.45 });   // bleached bone (the orange rock map under any tint read as rusty pipes)
    const kz = 175, kx = TAT.cx(kz);
    for (let i = 0; i < 16; i++) { const z = kz - 12 + i * 1.7, x = TAT.cx(z) + 1.5, s = Math.sin(i / 15 * PI) * 3 + 1.4;
      const rib = new THREE.TorusGeometry(s, 0.18, 6, 16, PI); KIT.geo(rib, bone, new THREE.Matrix4().compose(V3(x, 0.1, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, HALF, 0)), V3(1.2, 1.1, 1)));
      KIT.geo(new THREE.SphereGeometry(0.35, 8, 6), bone, new THREE.Matrix4().makeTranslation(x, s * 1.1, z)); }
    const skull = new THREE.SphereGeometry(2.2, 14, 10); KIT.geo(skull, bone, new THREE.Matrix4().compose(V3(kx + 3, 1.2, kz - 15), new THREE.Quaternion(), V3(1.2, 0.8, 2)));
    for (const s of [1, -1]) KIT.geo(new THREE.ConeGeometry(0.4, 3, 8), bone, new THREE.Matrix4().compose(V3(kx + 3 + s * 1.8, 2.8, kz - 14), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, s * 0.4)), V3(1, 1, 1)));
    // the flats: the chrome starship and a moisture farm
    L.nship = TAT.ship(); L.nship.position.set(110, 3.6, 402); L.nship.rotation.y = -1.2; LEVEL.add(L.nship);
    PHY.obox(110, 402, 7, 26, 0, 6, -1.2);
    { const ad = TEX.mat('adobe', { color: 0xe8d4b4 }), dk = PROPS.m('door', { color: 0x1a120c, roughness: 0.9 }), rs2 = MG.rs('espa');
      for (let i = 0; i < 14; i++) { const x = 60 + rs2() * 100, z = 410 + rs2() * 40; if (Math.hypot(x - 110, z - 402) < 22) continue; const y = TAT.canyon(x, z), r = 3 + rs2() * 4;
        KIT.cyl(x, y - 0.5, z, r, r * 0.55 + 0.5, ad, { seg: 24 }); KIT.geo(new THREE.SphereGeometry(r * 0.92, 20, 10, 0, TAU, 0, HALF), ad, new THREE.Matrix4().makeTranslation(x, y + r * 0.55 - 0.1, z), { worldUV: true });
        KIT.box(x - 0.6, y, z + r - 0.3, x + 0.6, y + 2.1, z + r + 0.05, dk, { col: false }); } }
    for (const [x, z] of [[70, 420], [140, 380], [120, 355]]) { const v = PROPS.vaporator(); const y = TAT.canyon(x, z); v.position.set(x, y - 0.2, z); LEVEL.add(v); PHY.cyl(x, z, 0.5, y, y + 4); }
    R.setSun(new THREE.Vector3(-0.35, 0.55, 0.45), 0xfff0d8, 3.2, 0xa8c4ee, 0xc8a078, 0.85);
    HOLOCRON.place(L, [[TAT.cx(176) + 4, 0.5, 176], [TAT.cx(300) + 6, 0.5, 300], [140, TAT.canyon(140, 420), 420]]);
  },
  onStart(L, cp) {
    const say = (w, t, d, c) => HUD.sub(w, t, d, c);
    HUD.toast('TATOOINE', 'JUNDLAND WASTES', 3.5);
    LEVEL.establish(L, cp, { dur: 5, fov: 46, p0: V3(TAT.cx(46) + 3, 24, 46), p1: V3(TAT.cx(-8) + 0.8, 2.2, -8.2), l0: V3(TAT.cx(0), 0.5, -4), l1: V3(TAT.cx(8), 1.5, 8) });
    CLOAK.wear(PLAYER.a, true);
    HUD.obj('Follow the canyon to the flats');
    const ambush = (z, list, cpI) => LEVEL.trigger(TAT.cx(z) - 20, z - 4, TAT.cx(z) + 20, z + 4, () => {
      HUD.sub('', 'Naboo security troopers, sent ahead to guard the Queen\'s route.', 2.5);
      LEVEL.wave(list.map((s) => [s[0], TAT.cx(z + s[2]) + s[1] * 0.55, z + s[2], s[3] || {}]), () => { if (cpI) LEVEL.checkpoint(cpI); HUD.obj('Follow the canyon to the flats'); }, { now: true, stagger: 0.25 });
    });
    if (cp < 1) ambush(95, [['guard', -3, 14], ['guard', 3, 16], ['guard', 0, 22], ['guard', -5, 28], ['guard', 5, 30]], 1);
    if (cp < 2) ambush(215, [['guard', -3, 12], ['guard', 3, 14], ['guard', -2, 20], ['guard', 2, 22], ['guard', 0, 28], ['guard', 5, 34]], 0);
    // the Jedi on the flats
    const duel = () => {
      const q = new Jedi('quigon', { x: 96, y: TAT.canyon(96, 392), z: 392, yaw: -2.4 }); q.home = [96, 392]; L.q = q;
      HUD.setBoss(q, 'QUI-GON JINN', 'JEDI MASTER', 'green'); HUD.obj('Kill the Jedi before he reaches the ship');
      BOSS.extra = () => { if (!L.flags.escape && q.hp < q.hpMax * 0.58) { L.flags.escape = true; TAT.escape(L, q); } };
    };
    LEVEL.trigger(TAT.cx(340) - 40, 336, TAT.cx(340) + 60, 344, () => {
      HUD.sub('CAPTAIN PANAKA', 'Protect the ship! Nobody gets near the Queen!', 3, 'jedi'); HUD.obj('Break Captain Panaka\'s line');
      LEVEL.wave([['panaka', 84, 384], ['guard', 76, 378], ['guard', 90, 376], ['guard', 80, 390]], () => HUD.obj('Find the Jedi'), { now: true, stagger: 0.3 });
    });
    LEVEL.trigger(TAT.cx(360) - 40, 356, TAT.cx(360) + 60, 364, () => {
      LEVEL.checkpoint(2);
      const P = PLAYER.a; PLAYER.state = 'cine'; HUD.show(false);
      duel(); L.q.passive = true;
      CAM.play({ dur: 4.5, fov: 40, fn: (t, u) => ({ pos: V3(P.x - 2, P.y + 2 + u, P.z - 3), look: V3(lerp(P.x, L.q.x, 0.7), 1.5, lerp(P.z, L.q.z, 0.7)) }) });
      say('', 'A Jedi. Here — escorting the Queen to her ship.', 2.4);
      MG.after(2.4, () => say('QUI-GON JINN', 'Anakin, drop!', 1.8, 'jedi'));
      MG.after(4.5, () => { PLAYER.state = 'move'; HUD.show(true); L.q.passive = false; });
    });
    if (cp >= 2) { MG.after(0.1, () => { const t = LEVEL.cur.triggers[LEVEL.cur.triggers.length - 1]; t.fn(); t.done = true; }); }
  },
});
TAT.escape = function (L, q) {
  const P = PLAYER.a; PLAYER.state = 'cine'; HUD.show(false); q.passive = true; q.stop();
  HUD.sub('', 'Qui-Gon breaks away and leaps for the ramp of the rising starship.', 3.5);
  const s = L.nship, p0 = V3(q.x, q.y, q.z), p1 = V3(s.position.x - 2, s.position.y - 1, s.position.z - 4);
  q.jumpT = 0; q.play('leap');
  L.updates.push((dt) => { if (q.jumpT === undefined) return; q.jumpT += dt; const u = sat(q.jumpT / 1.4); q.x = lerp(p0.x, p1.x, u); q.z = lerp(p0.z, p1.z, u); q.y = lerp(p0.y, p1.y, u) + Math.sin(u * PI) * 6; q.vy = 0; if (u >= 1) { q.root.visible = false; q.saber.setVisible(false); if (q.inst.cloth) q.inst.cloth.setVisible(false); } });
  // lift-off: the ship climbs and noses forward; a ring of dust blasts out from under it
  const fw = V3(-Math.sin(s.rotation.y), 0, -Math.cos(s.rotation.y));
  L.updates.push((dt, t) => { if (!L.flags.lift) return; L.flags.lift += dt; const k = L.flags.lift; s.position.y += dt * Math.min(6, k * 3); s.position.addScaledVector(fw, dt * Math.max(0, k - 1.2) * 9); s.rotation.x = -Math.min(0.2, k * 0.05);
    if (k < 2.2 && RNG() < dt * 30) { const a = RNG() * TAU, r = 6 + RNG() * 14; FX.puff(V3(s.position.x + Math.cos(a) * r, TAT.canyon(s.position.x, s.position.z) + 0.4, s.position.z + Math.sin(a) * r), 1, { size: 2.2, grow: 4, col: [0.86, 0.74, 0.56], a: 0.45, spread: 2, life: 2.6, vel: V3(Math.cos(a) * 7, 1, Math.sin(a) * 7) }); } });
  MG.after(1.2, () => { L.flags.lift = 0.01; FX.addShake(0.35); R.kick(0.3); });
  // shot 1: low beside the leap, looking up as he sails for the ramp with the hull above him
  let sx = -(p1.z - p0.z), sz = p1.x - p0.x; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
  const mid = V3((p0.x + p1.x) / 2 + sx * 7, p0.y + 0.7, (p0.z + p1.z) / 2 + sz * 7);
  CAM.play({ dur: 1.6, fov: 50, hold: true, fn: () => ({ pos: mid, look: V3(q.x, q.y + 1.4, q.z) }) });
  // shot 2: over Maul's shoulder, the starship climbing away
  MG.after(1.5, () => { P.yaw = Math.atan2(s.position.x - P.x, s.position.z - P.z); P.play && P.setBase && P.setBase('guard');
    let bx = P.x - s.position.x, bz = P.z - s.position.z; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
    CAM.play({ dur: 4.9, fov: 44, hold: true, ease: 'lin', fn: (t, u) => ({ pos: V3(P.x + bx * (2.4 + u * 0.8) - bz * 0.9, P.y + 1.75 + u * 0.2, P.z + bz * (2.4 + u * 0.8) + bx * 0.9), look: V3(lerp(P.x, s.position.x, 0.8), lerp(P.y + 1.6, s.position.y, 0.7), lerp(P.z, s.position.z, 0.8)) }) }); });
  MG.after(3.8, () => HUD.sub('DARTH MAUL', '…The Jedi escaped. They will go to Coruscant. Then to Naboo. I will be waiting.', 4));
  MG.after(6.0, () => { q.alive = false; GAME.result(false, 'hangar'); });
};
