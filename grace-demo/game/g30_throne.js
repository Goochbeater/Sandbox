/* THE THRONE ROOM — a long dusk-blue hall. The king comes in through the archway on the left (from the bedchamber);
   petitioners come through the great doors on the right. Bays between stone pilasters, left to right:
     A arch to the corridor · B stained window, bench, halberds · C bookcase, embroidered hanging, the steward's lectern
     D the throne bay: three-step dais, throne, royal banner, blue banners, candle stands · E stained window, council table
     F the great doors.   Chandeliers hang over the walk line; foreground columns and a brazier frame the lens. */
const THRONE = SCENE.addRoom(new Room('throne', { X0: -13.5, X1: 13.5, CEIL: 6.4, KZ: 3.25, cam: { y: 2.95, look: 2.62, dist: 19.4, fov: 19 }, exposure: 0.92, reflK: 0.85,
  caption: ['The Throne Room', 'Court is in session'], music: 'throne', ambience: { crowd: 0.35, fire: 0.25 }, acoustics: { size: 3.2, wet: 0.4 }, surface: 'stone' }));
THRONE.ENTRY = -12.2; THRONE.TX = 1.5; THRONE.DOORX = 11.9; THRONE.SPOT = 4.55;   // arch, throne, great doors, where petitioners stand
THRONE.LINES = {
  arch: ['Back to the bedchamber.'], window: ['The lamps are lit in the lower town. Everyone who came tonight walked up that hill.', 'Dusk already. Court always runs long.'],
  books: ['Law, lineage, and three hundred years of grudges, alphabetised.'], banner: ['The swan of our house. My grandmother said it bites.'],
  map: ['The kingdom on one sheet of calfskin. It looks so manageable from here.', 'Somebody has drawn a little gallows over the ford. I suspect the steward.'],
  doors: ['The petitioners come through there.'], halberds: ['Polished every morning, used never. Let it stay that way.'],
};
THRONE.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, CE = room.CEIL, KZ = room.KZ, L = room.LINES, TX = room.TX;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle(k, L[k]));
  /* shell: wainscot, damask, a painted frieze, cornice, timber ceiling */
  BUILD.plane('z', X0, X1, 0, 1.4, 0, T.hallWainscot); BUILD.plane('z', X0, X1, 1.4, 5.6, 0, T.hallWall);
  BUILD.plane('z', X0, X1, 5.6, 5.91, 0.01, T.frieze, { rough: 0.8 }); BUILD.plane('z', X0, X1, 5.91, CE, 0, T.hallWall);
  BUILD.box(X0, X1, 5.91, 6.08, 0, 0.16, T.ashlar);
  for (const [x, ax] of [[X0, 'x+'], [X1, 'x-']]) { BUILD.plane(ax, 0, 10, 0, 1.4, x, T.hallWainscot); BUILD.plane(ax, 0, 10, 1.4, CE, x, T.hallWall); }
  room.floorMat = BUILD.reflective(T.marble, { k: 1.0, rough: 0.35 }); BUILD.plane('y+', X0, X1, 0, 12, 0, T.marble, { mat: room.floorMat, layer: 2 });
  BUILD.plane('y-', X0, X1, 0, 14, CE, T.ceiling);
  for (let x = X0 + 0.9; x < X1; x += 2.7) BUILD.box(x - 0.16, x + 0.16, CE - 0.36, CE, 0, 7, T.beam, { cast: false });
  BUILD.box(X0, X1, CE - 0.7, CE, 6.6, 7.0, T.beam, { cast: false });
  /* pilasters with torches */
  for (const x of [-11.2, -7.2, -3.2, 6.2, 10.2]) {
    BUILD.box(x - 0.35, x + 0.35, 0, CE, 0, 0.32, T.ashlar); BUILD.box(x - 0.43, x + 0.43, 0, 0.36, 0, 0.42, T.ashlar); BUILD.box(x - 0.43, x + 0.43, 5.38, 5.6, 0, 0.42, T.ashlar);
    BUILD.card(T.sconce, x, 2.25, 0.34, { cast: false }); BUILD.flame(x, 2.48, 0.41, 0.6); BUILD.glow(x, 2.68, 0.5, 1.1, 0xffa050, 0.42);
    BUILD.light(new THREE.PointLight(0xffa050, 4.2, 0, 2), x, 2.75, 1.25, { flicker: 6 + x * 0.1 });
  }
  /* A — the archway back to the bedchamber */
  BUILD.card(T.arch, -12.35, 0, 0.02, { basic: true, k: 1.0, cast: false });
  BUILD.light(new THREE.PointLight(0xffa860, 5, 0, 2), -12.35, 1.6, 0.8, { flicker: 5 });
  room.interact('arch', -12.35, 3.6, KZ, 1.0, () => { SCENE.lock++; SCENE.say(SCENE.player, L.arch[0]).then(() => { SCENE.lock--; SCENE.go('bedroom', { x: 9.7, face: -1 }); }); });
  /* B — stained window, bench, halberds */
  BUILD.card(T.stained, -9.2, 1.95, 0.02, { basic: true, k: 1.35, cast: false }); BUILD.glow(-9.2, 3.6, 0.3, 3.0, 0x5aa0d8, 0.22);
  room.lights.winL = BUILD.shadow(BUILD.light(new THREE.SpotLight(0x7a9ae0, 140, 0, 0.62, 0.8, 2), -9.2, 4.4, 0.35), R.q === 'low' ? 512 : 1024);
  room.lights.winL.target.position.set(-7.6, 0, 3.6);
  for (const [o, w, a] of [[0, 1.1, 0.22], [0.4, 0.6, 0.14]]) BUILD.shaft(-9.2 + o, 4.6, 0.5, w, 6, a, [-0.42, 0.1, 0.3], 0x8ab4f0);
  BUILD.box(-10.4, -8.0, 0, 0.46, 0.05, 0.5, T.woodDark, { front: BUILD.std(T.bench) }); BUILD.box(-10.45, -7.95, 0.46, 0.52, 0.02, 0.54, T.woodPost);
  BUILD.card(T.halberds, -7.9, 0, 0.12, { s: 0.95 });
  room.interact('window', -9.2, 3.6, KZ, 1.0, () => say('window'));
  /* C — bookcase, hanging, lectern */
  BUILD.box(-6.65, -4.85, 0, 2.44, 0, 0.45, T.woodDark, { front: BUILD.std(T.bookcase) }); BUILD.box(-6.72, -4.78, 2.44, 2.54, 0, 0.5, T.woodPost);
  BUILD.card(T.folkWide, -5.75, 2.95, 0.02, { cast: false });
  BUILD.card(T.lectern, -4.05, 0, 0.85);
  BUILD.card(T.candleStand, -3.75, 0, 0.45, { s: 0.8 }); for (const [dx, y] of [[-0.25, 1.4], [0, 1.6], [0.25, 1.4]]) BUILD.flame(-3.75 + dx * 0.8, y, 0.46, 0.3);
  room.interact('books', -5.75, 2.9, KZ, 1.0, () => say('books'));
  /* D — the dais and the throne */
  const S1 = [-2.4, 5.4, 2.5], S2 = [-1.9, 4.9, 2.1], S3 = [-1.4, 4.4, 1.7];
  BUILD.box(S1[0], S1[1], 0, 0.16, 0, S1[2], T.ashlar); BUILD.box(S2[0], S2[1], 0.16, 0.32, 0, S2[2], T.ashlar); BUILD.box(S3[0], S3[1], 0.32, 0.48, 0, S3[2], T.ashlar);
  for (const [s, y, z0] of [[S1, 0.16, S2[2]], [S2, 0.32, S3[2]], [S3, 0.48, 0.3]]) { BUILD.rug(T.runnerZ, TX - 0.75, TX + 0.75, z0, s[2] + 0.01, { y, layer: 0, rv: (s[2] - z0) }); BUILD.box(TX - 0.75, TX + 0.75, y - 0.16, y - 0.002, s[2], s[2] + 0.012, T.runnerZ, { cast: false }); }
  // the throne: plinth, seat, tufted back in a gilded frame, arms with finials, a crown on top
  BUILD.box(TX - 0.78, TX + 0.78, 0.48, 0.6, 0.32, 1.38, T.gilt, { rough: 0.4, metal: 0.5 });
  BUILD.box(TX - 0.66, TX + 0.66, 0.6, 0.98, 0.42, 1.26, T.woodRed, { rough: 0.6 });
  BUILD.box(TX - 0.62, TX + 0.62, 0.98, 1.08, 0.45, 1.22, T.velvet, { rough: 0.95 });
  BUILD.box(TX - 0.66, TX + 0.66, 0.98, 2.9, 0.33, 0.47, T.gilt, { rough: 0.4, metal: 0.5 });
  BUILD.card(T.throneBack, TX, 0.98, 0.48, { cast: true });
  for (const s of [-1, 1]) { BUILD.box(TX + s * 0.72 - 0.09, TX + s * 0.72 + 0.09, 0.6, 1.36, 0.42, 1.3, T.gilt, { rough: 0.4, metal: 0.5 });
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), BUILD.std(T.gilt, { rough: 0.3, metal: 0.7 })); f.position.set(TX + s * 0.72, 1.44, 1.24); BUILD.add(f);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), BUILD.std(T.gilt, { rough: 0.3, metal: 0.7 })); c.position.set(TX + s * 0.6, 3.02, 0.45); BUILD.add(c); }
  BUILD.card(T.crownCard, TX, 2.98, 0.46, { s: 1.7, cast: false });
  room.seat = { x: TX, y: 1.08, z: 0.98, yaw: 0, cardDz: 0.42, drop: 0.08 };
  // banners, candle stands, the throne's own light
  BUILD.box(TX - 1.45, TX + 1.45, 5.7, 5.78, 0.02, 0.1, T.gilt); BUILD.card(T.banner, TX, 1.47, 0.06, { cast: false });
  for (const x of [-1.95, 4.95]) { BUILD.card(T.bannerBlue, x, 2.45, 0.05, { cast: false }); BUILD.box(x - 0.45, x + 0.45, 5.56, 5.62, 0.02, 0.08, T.gilt); }
  for (const x of [-2.75, 5.75]) { BUILD.card(T.candleStand, x, 0, 1.3); for (const [dx, y] of [[-0.27, 1.93], [0, 2.13], [0.27, 1.93]]) BUILD.flame(x + dx, y, 1.31, 0.32);
    BUILD.glow(x, 2.15, 1.35, 0.9, 0xffa050, 0.45); BUILD.light(new THREE.PointLight(0xffa860, 4, 0, 2), x, 2.2, 1.5, { flicker: 9 }); }
  room.lights.throne = BUILD.shadow(BUILD.light(new THREE.SpotLight(0xffd8a8, 150, 0, 0.36, 0.65, 2), TX, 6.2, 4.6), R.q === 'low' ? 512 : 1024);
  room.lights.throne.target.position.set(TX, 0.9, 0.9);
  room.interact('throne', TX, 3.7, KZ, 1.0, () => COURT.sit());
  room.interact('banner', TX - 1.0, 5.0, KZ, 0, () => say('banner')).hidden = true;
  /* E — the second window and the council table with its map */
  BUILD.card(T.stained, 8.2, 1.95, 0.02, { basic: true, k: 1.35, cast: false }); BUILD.glow(8.2, 3.6, 0.3, 3.0, 0x5aa0d8, 0.22);
  { const L2 = BUILD.light(new THREE.SpotLight(0x7a9ae0, 90, 0, 0.6, 0.8, 2), 8.2, 4.4, 0.35); L2.target.position.set(7.0, 0, 3.4); }
  for (const [o, w, a] of [[0, 1.1, 0.2], [-0.4, 0.6, 0.12]]) BUILD.shaft(8.2 + o, 4.6, 0.5, w, 6, a, [-0.42, -0.1, -0.3], 0x8ab4f0);
  BUILD.box(6.9, 9.5, 0.8, 0.88, 0.45, 1.55, T.woodRed);
  for (const x of [7.05, 9.35]) for (const z of [0.55, 1.45]) BUILD.box(x - 0.06, x + 0.06, 0, 0.8, z - 0.06, z + 0.06, T.woodPost);
  { const g = new THREE.PlaneGeometry(1.25, 0.81); g.rotateX(-Math.PI / 2); g.translate(8.1, 0.885, 1.0); BUILD.add(new THREE.Mesh(g, BUILD.std(T.mapSheet, { rough: 0.9 })), { cast: false }); }
  BUILD.card(T.candle, 7.3, 0.88, 1.2); BUILD.flame(7.3, 1.16, 1.205, 0.3); BUILD.card(T.goblet, 9.1, 0.88, 1.1); BUILD.card(T.books, 8.9, 0.88, 0.75, { s: 0.8 });
  BUILD.card(T.chair, 8.2, 0, 0.25); BUILD.light(new THREE.PointLight(0xffa860, 1.6, 0, 2), 7.3, 1.35, 1.5);
  room.interact('map', 8.2, 1.8, KZ, 1.0, () => say('map'));
  /* F — the great doors (they open for petitioners) */
  room.doorClosed = BUILD.card(T.doorDouble, room.DOORX, 0, 0.02, { cast: false, dyn: true });
  room.doorOpen = BUILD.card(T.arch, room.DOORX, 0, 0.015, { basic: true, k: 1.2, cast: false, w: 2.06, h: 3.62, dyn: true }); room.doorOpen.visible = false;
  room.doorLight = BUILD.light(new THREE.PointLight(0xffb070, 0, 0, 2), room.DOORX, 1.6, 0.9);
  BUILD.card(T.shieldDisplay, 12.95, 2.6, 0.03, { cast: false }); BUILD.card(T.halberds, 13.0, 0, 0.12, { s: 0.9 });
  room.interact('doors', room.DOORX, 4.0, KZ, 1.0, () => say('doors'));
  /* chandeliers over the walk line */
  for (const cx of [-5.6, 9.0]) {
    const iron = BUILD.std(null, { col: 0x2a2622, rough: 0.5, metal: 0.6 }), y = 4.75, z = KZ - 0.2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 6, 28), iron); ring.rotation.x = Math.PI / 2; ring.position.set(cx, y, z); BUILD.add(ring, { cast: false });
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 20), iron); ring2.rotation.x = Math.PI / 2; ring2.position.set(cx, y - 0.12, z); BUILD.add(ring2, { cast: false });
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, ch = new THREE.Mesh(new THREE.BoxGeometry(0.02, CE - y, 0.02), iron); ch.position.set(cx + Math.sin(a) * 0.45, (CE + y) / 2, z + Math.cos(a) * 0.45); ch.rotation.set(Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2); BUILD.add(ch, { cast: false }); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, x = cx + Math.sin(a) * 0.85, zz = z + Math.cos(a) * 0.85;
      const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), BUILD.std(null, { col: 0xf0e8d6, rough: 0.7 })); cd.position.set(x, y + 0.1, zz); BUILD.add(cd, { cast: false });
      BUILD.flame(x, y + 0.17, zz, 0.28); }
    BUILD.glow(cx, y + 0.25, z, 2.0, 0xffb070, 0.25);
    BUILD.light(new THREE.PointLight(0xffb070, 8, 0, 2), cx, y + 0.1, z, { flicker: 8 });
  }
  /* the long runner, foreground columns and brazier */
  BUILD.rug(T.runner, X0, X1, KZ - 0.5, KZ + 0.5, { ru: (X1 - X0) });
  for (const [x, z] of [[-7.6, 7.3], [10.9, 7.0]]) { const g = new THREE.CylinderGeometry(0.48, 0.48, CE, 16); g.translate(x, CE / 2, z); BUILD.planarUV(g, T.ashlar); BUILD.add(new THREE.Mesh(g, BUILD.std(T.ashlar, { col: 0xb8b0a4 })), { cast: false });
    BUILD.box(x - 0.6, x + 0.6, 0, 0.4, z - 0.6, z + 0.6, T.ashlar, { cast: false }); }
  BUILD.card(T.brazier, -10.4, 0, 7.8, { s: 1.5, cast: false }); BUILD.flame(-10.4, 0.66, 7.81, 0.9, true); BUILD.glow(-10.4, 1.1, 7.85, 1.4, 0xff8a2a, 0.3);
  BUILD.light(new THREE.PointLight(0xff8a3c, 4, 0, 2), -10.4, 1.3, 7.5, { flicker: 7 });
  /* light, dust */
  BUILD.light(new THREE.HemisphereLight(0x4a5a80, 0x3a2418, 2.1), 0, 5, 0);
  const fill = BUILD.light(new THREE.DirectionalLight(0xa8b4e0, 0.75), 2, 5, 15); fill.target.position.set(0, 1.5, 0);
  room.rim = [TX, 3.2, 0.5, 0.55, 12, 0xffc890, null];
  room.shadowSrc = [TX, 6.2, 4.6, 7.5];
  BUILD.motes({ n: 120, boxes: [[-10.4, -6.5, 0.4, 4.4, 0.5, 4, 0.3], [6.8, 10.4, 0.4, 4.4, 0.5, 4, 0.25], [-12, 12, 0.6, 4.5, 1, 4, 0.25], [-11, 12, 0.4, 3.2, 5.6, 8.2, 0.2]], col: 0xd8e0ff });
  room.update(0, 0);
  return BUILD.end();
};
THRONE.onEnter = function () { if (CUT.playing) return; SCENE.caption(...this.caption); COURT.enterHall(); };
/* the hall twelve years ago, the night the old king died: every torch and chandelier out, moonlight through the glass,
   one cold pool of light on the empty throne and his crown left on the seat; only the two candle stands still burn */
THRONE.night = function (on) {
  const room = THRONE, keep = (x, y) => Math.abs(x - room.TX) < 4.6 && y < 2.4;   // the candle stands beside the dais
  if (!room.built || room.nightOn === on) return; room.nightOn = on;
  if (!room.nightCrown) { const ct = PX.T.crownCard; room.nightCrown = BUILD.card(ct, room.TX, 1.08, 0.86, { s: 1.0, cast: false, dyn: true, parent: room.group }); room.nightCrown.visible = false; }
  room.nightCrown.visible = on;
  for (const f of room.flames) if (f.me) f.me.visible = !on || keep(f.me.position.x, f.me.position.y);
  for (const g of room.glows) { g.s.visible = !on || keep(g.s.position.x, g.s.position.y); }
  for (const s of room.shafts) s.me.material.color.copy(new THREE.Color(0x8ab4f0).multiplyScalar(on ? 0.5 : 0.2));
  room.group.traverse((o) => { if (!o.isLight || o.userData.base === undefined) return;
    let k = 1; if (on) { if (o === room.lights.throne) k = 0.75; else if (o.isSpotLight) k = 2.4; else if (o.isPointLight) k = keep(o.position.x, o.position.y) ? 0.45 : 0; else if (o.isHemisphereLight) k = 0.35; else k = 0.5; }
    o.intensity = o.userData.base * k; });
  room.lights.throne.color.set(on ? 0x9ab0ff : 0xffd8a8);
  for (const f of room.flick) f.base = f.L.userData.base * (on ? (keep(f.L.position.x, f.L.position.y) ? 0.45 : 0) : 1);
  R.mat.final.uniforms.uExpo.value = on ? 1.0 : room.exposure;
  for (const a of SCENE.actors) a.setVisible(!on && (a === SCENE.player ? true : a.livesIn('throne') && !a.offstage));
  R.r.shadowMap.needsUpdate = true;
};
