/* THE BEDCHAMBER — laid out from the reference frame. The king starts here; the crown waits on its cushion beside the
   standing mirror, and the door at the far right leads to the throne room once he's wearing it. */
const BEDROOM = SCENE.addRoom(new Room('bedroom', { X0: -11.6, X1: 11.8, CEIL: 4.7, KZ: 2.6, cam: { y: 2.45, look: 2.18, dist: 19.4, fov: 19 }, exposure: 1.0, reflK: 0.6,
  caption: ["The King's Bedchamber", 'An evening in late autumn'] }));
BEDROOM.LINES = {
  fire: ['The hearth keeps the frost out. Mostly.', 'Grandfather said a king may be cold anywhere but in front of his people.'],
  bed: ['Not yet. The petitioners come at first light, and I have only read half their letters.', 'Sleep is for kings with smaller kingdoms.'],
  window: ['Snow on the passes already. The harvest had better hold.', 'From up here the lower town looks peaceful. It never is.'],
  chest: ["My father's campaign chest. It still smells of oil and old rope.", 'Maps, a broken spur, and a letter I promised never to read.'],
  vanity: ['Ink, sealing wax, and a dozen decrees waiting for my name.', 'Every signature costs somebody something.'],
  cabinet: ['Grapes from the southern valleys. A gift, they said. Gifts are never only gifts.', 'Someone keeps eating the good ones.'],
  table: ['Two goblets. The queen will be up late again.', 'Wine from the neighbours. I should have it tasted first.'],
  mirrorOn: ['There. Now I look like someone people should obey.', 'The crown sits straight. The man under it, less so.'],
  mirrorOff: ["Something's missing. The crown is on its stand.", 'A king without his crown is just a tired man in a good coat.'],
  crownOn: ['The crown. Heavier every week.'], crownOff: ['Off it comes, just for tonight.'],
  doorNo: ["I can't hold court bare-headed. The crown first."], doorGo: ['To the throne room. They are waiting.'],
};
BEDROOM.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, CE = room.CEIL, L = room.LINES, say = (k) => SCENE.say(SCENE.player, SCENE.cycle(k, L[k]));
  /* shell */
  BUILD.plane('z', X0, X1, 1.25, CE, 0, T.wall); BUILD.plane('z', X0, X1, 0, 1.25, 0, T.wainscot);
  for (const [x, ax] of [[X0, 'x+'], [X1, 'x-']]) { BUILD.plane(ax, 0, 9, 1.25, CE, x, T.wall); BUILD.plane(ax, 0, 9, 0, 1.25, x, T.wainscot); }
  room.floorMat = BUILD.reflective(T.floor); BUILD.plane('y+', X0, X1, 0, 10, 0, T.floor, { mat: room.floorMat, layer: 2 });
  BUILD.plane('y-', X0, X1, 0, 12, CE, T.ceiling);
  for (let x = X0 + 1.2; x < X1; x += 2.6) BUILD.box(x - 0.14, x + 0.14, CE - 0.3, CE, 0, 5, T.beam, { cast: false });
  BUILD.box(X0, X1, CE - 0.42, CE, 4.6, 5.0, T.beam, { cast: false });
  BUILD.box(X0, X1, CE - 0.16, CE - 0.02, 0, 0.12, T.beam, { cast: false });

  /* fireplace, centred at x = 1.4 */
  const FX = 1.4;
  BUILD.box(FX - 1.3, FX + 1.3, 0, 0.1, 0, 1.15, T.brick);
  const ff = BUILD.card(T.fireFront, FX, 0.1, 0.86, { cast: true }); ff.material = BUILD.std(T.fireFront, { alpha: true, rough: 0.9, col: 0xc8bcac });
  BUILD.box(FX - 1.15, FX - 1.05, 0.1, 1.85, 0, 0.86, T.brick); BUILD.box(FX + 1.05, FX + 1.15, 0.1, 1.85, 0, 0.86, T.brick);
  BUILD.box(FX - 1.05, FX + 1.05, 1.7, 1.85, 0, 0.86, T.brick);
  BUILD.box(FX - 1.05, FX + 1.05, 0.1, 1.7, 0, 0.06, T.soot, { cast: false });
  BUILD.box(FX - 0.62, FX - 0.56, 0.1, 1.4, 0, 0.86, T.soot); BUILD.box(FX + 0.56, FX + 0.62, 0.1, 1.4, 0, 0.86, T.soot);
  BUILD.box(FX - 1.32, FX + 1.32, 1.85, 2.02, 0, 1.06, T.brick, { col: 0xe0d6c6 });
  BUILD.box(FX - 1.15, FX + 1.15, 2.02, 2.9, 0, 0.88, T.brick, { taper: [0.57, 0.68] });
  BUILD.box(FX - 0.66, FX + 0.66, 2.9, CE, 0, 0.6, T.brick);
  BUILD.card(T.crest, FX, 3.05, 0.61, { cast: false });
  BUILD.card(T.logs, FX, 0.1, 0.42, { cast: false });
  BUILD.flame(FX, 0.2, 0.46, 0.85, true);
  BUILD.card(T.grate, FX, 0.1, 0.74, { cast: false });
  BUILD.glow(FX, 0.55, 0.7, 2.2, 0xff7a2a, 0.45);
  BUILD.card(T.vase, FX + 0.85, 2.02, 0.55); BUILD.card(T.bottle, FX + 0.62, 2.02, 0.5);
  BUILD.card(T.candles, FX - 1.12, 0.1, 1.05); BUILD.card(T.books, FX - 0.75, 0.1, 1.0); BUILD.card(T.candles, FX + 1.05, 0.1, 1.0);
  for (const [x, y] of [[FX - 1.27, 0.38], [FX - 1.15, 0.5], [FX - 1.02, 0.32], [FX + 0.9, 0.38], [FX + 1.02, 0.5], [FX + 1.15, 0.32]]) BUILD.flame(x, y, 1.06, 0.35);
  room.lights.fire = BUILD.shadow(BUILD.light(new THREE.PointLight(0xff8a3c, 11, 0, 2), FX, 0.55, 1.3, { flicker: 7.3 }), R.q === 'low' ? 256 : 512);
  room.lights.fire.shadow.camera.near = 0.2;
  room.rim = [FX, 1.4, 0.6, 0.6, 6, 0xffa860, room.lights.fire];   // firelight on the characters' backs
  room.shadowSrc = [FX, 5.0, 1.2, 5.5];                             // …and their silhouettes thrown across the floor
  room.interact('fire', FX, 2.3, room.KZ, 1.3, () => say('fire'));

  /* the four-poster bed, head at the window end */
  const B0 = -9.4, B1 = -6.0, BZ0 = 0.25, BZ1 = 2.05, BT = 3.45;
  for (const [x, z] of [[B0, BZ0], [B1, BZ0], [B0, BZ1], [B1, BZ1]]) { BUILD.box(x - 0.08, x + 0.08, 0, BT, z - 0.08, z + 0.08, T.woodPost, { rough: 0.6 }); BUILD.box(x - 0.11, x + 0.11, 0, 0.5, z - 0.11, z + 0.11, T.woodPost); }
  BUILD.box(B0, B1, BT, BT + 0.12, BZ0 - 0.1, BZ1 + 0.1, T.woodPost);
  BUILD.box(B0 + 0.05, B1 - 0.05, BT + 0.12, BT + 0.2, BZ0, BZ1, T.teal, { col: 0xa8d8d0 });
  BUILD.card(T.valance, (B0 + B1) / 2, BT - 0.3, BZ1 + 0.11, { w: B1 - B0 + 0.24, h: 0.41, ru: (B1 - B0 + 0.24) * PX.D / 64 });
  BUILD.card(T.valance, B1 + 0.11, BT - 0.3, (BZ0 + BZ1) / 2, { w: BZ1 - BZ0 + 0.2, h: 0.41, ru: (BZ1 - BZ0 + 0.2) * PX.D / 64, ry: Math.PI / 2 });
  BUILD.box(B0, B1, 0.18, 0.45, BZ0, BZ1, T.woodRed);
  BUILD.box(B0 + 0.05, B1 - 0.05, 0.45, 0.8, BZ0 + 0.02, BZ1 - 0.02, T.quilt, { rough: 0.95 });
  BUILD.box(B0 + 0.05, B1 - 0.05, 0.25, 0.8, BZ1 - 0.02, BZ1 + 0.03, T.quilt, { rough: 0.95, cast: false });
  BUILD.box(B0 + 0.12, B0 + 0.62, 0.8, 1.0, BZ0 + 0.15, BZ0 + 0.85, T.linen); BUILD.box(B0 + 0.12, B0 + 0.62, 0.8, 1.0, BZ0 + 0.95, BZ1 - 0.15, T.linen);
  BUILD.box(B0 - 0.06, B0 + 0.04, 0.4, 1.7, BZ0, BZ1, T.woodRed);
  BUILD.box(B0 - 0.1, B1 + 0.1, 0.9, BT, 0.03, 0.08, T.teal, { col: 0x7ab0aa, cast: false });
  BUILD.card(T.goldCurtain, B0 + 0.28, 0, BZ1 + 0.04, { h: BT - 0.05, w: 0.7 });
  BUILD.card(T.goldCurtain, B1 - 0.28, 0, BZ1 + 0.04, { h: BT - 0.05, w: 0.7 });
  BUILD.card(T.goldCurtain, B1 + 0.05, 0, BZ0 + 0.35, { h: BT - 0.05, w: 0.6, ry: Math.PI / 2 });
  room.interact('bed', -7.0, 1.5, room.KZ, 1.1, () => say('bed'));

  /* window by the bed head, with the evening sun */
  BUILD.card(T.window, -10.55, 0.9, 0.04, { basic: true, k: 1.55, cast: false });
  BUILD.glow(-10.55, 2.4, 0.3, 2.6, 0xffc070, 0.22);
  room.lights.sun = BUILD.shadow(BUILD.light(new THREE.SpotLight(0xffc27a, 210, 0, 0.75, 0.75, 2), -10.6, 3.4, 0.35), R.q === 'low' ? 512 : 1024);
  room.lights.sun.target.position.set(-7.6, 0.3, 2.2);
  for (const [o, w, a] of [[0, 1.3, 0.34], [0.55, 0.8, 0.22], [-0.4, 0.55, 0.18]]) BUILD.shaft(-10.55 + o, 3.2, 0.5 + o * 0.5, w, 5.4, a, [-0.35, 0.15, 0.62]);
  BUILD.card(T.plant, -11.15, 0, 0.6, { s: 0.85 });
  room.interact('window', -10.1, 2.2, room.KZ, 1.0, () => say('window'));

  /* chest at the bed foot */
  BUILD.box(-5.1, -3.95, 0, 0.6, 1.55, 2.15, T.woodDark, { front: BUILD.std(T.chest) });
  BUILD.box(-5.13, -3.92, 0.6, 0.68, 1.52, 2.18, T.woodPost);
  room.interact('chest', -4.5, 1.25, room.KZ, 0.8, () => { SCENE.player.act('Interact'); say('chest'); });

  /* vanity with its teal glass, the chair */
  BUILD.box(-3.85, -2.35, 0, 0.8, 0.02, 0.58, T.woodDark, { front: BUILD.std(T.vanity) });
  BUILD.box(-3.9, -2.3, 0.8, 0.86, 0, 0.62, T.woodPost);
  { const g = new THREE.PlaneGeometry(0.74, 0.62); g.translate(-3.1, 1.24, 0.08); BUILD.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: T.teal, color: 0x9ae0d8, roughness: 0.15, metalness: 0.3 })), { cast: false }); }
  BUILD.box(-3.5, -2.7, 0.86, 0.9, 0.02, 0.12, T.woodPost); BUILD.box(-3.5, -2.7, 1.55, 1.6, 0.02, 0.12, T.woodPost); BUILD.box(-3.5, -3.45, 0.86, 1.6, 0.02, 0.12, T.woodPost); BUILD.box(-2.75, -2.7, 0.86, 1.6, 0.02, 0.12, T.woodPost);
  BUILD.card(T.vase, -2.55, 0.86, 0.35, { s: 0.9 }); BUILD.card(T.candle, -3.65, 0.86, 0.35); BUILD.flame(-3.65, 1.14, 0.355, 0.3);
  BUILD.card(T.chair, -1.05, 0, 0.9);
  room.interact('vanity', -3.1, 1.85, room.KZ, 0.9, () => { SCENE.player.act('Interact'); say('vanity'); });

  /* plant and urn by the hearth */
  BUILD.card(T.plant, -0.3, 0, 0.55); BUILD.card(T.urn, 0.0, 0, 0.95);

  /* right of the hearth: cabinet with fruit, trunk, table, the standing mirror */
  BUILD.box(2.85, 3.6, 0, 0.92, 0.05, 0.55, T.woodRed, { front: BUILD.std(T.cabinet) });
  BUILD.box(2.8, 3.65, 0.92, 0.98, 0.02, 0.6, T.woodPost);
  BUILD.card(T.bowl, 3.22, 0.98, 0.3); BUILD.card(T.candle, 2.95, 0.98, 0.3); BUILD.flame(2.95, 1.26, 0.305, 0.3);
  room.interact('cabinet', 3.22, 1.75, room.KZ, 0.8, () => { SCENE.player.act('Interact'); say('cabinet'); });
  BUILD.box(3.75, 4.75, 0, 0.7, 0.1, 0.7, T.woodDark, { front: BUILD.std(T.chest) });
  { const g = new THREE.CylinderGeometry(0.3, 0.3, 1.0, 10, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); g.translate(4.25, 0.7, 0.4); BUILD.planarUV(g, T.woodPost); BUILD.add(new THREE.Mesh(g, BUILD.std(T.woodPost))); }
  BUILD.card(T.candelabra, 4.95, 0, 0.25, { s: 1.6 }); for (const [x, y] of [[4.55, 0.9], [4.95, 1.22], [5.35, 0.9]]) BUILD.flame(x, y + 0.02, 0.255, 0.3);
  BUILD.box(5.4, 7.5, 0.78, 0.86, 0.35, 1.25, T.woodRed);
  for (const x of [5.55, 7.35]) for (const z of [0.45, 1.15]) BUILD.box(x - 0.05, x + 0.05, 0, 0.78, z - 0.05, z + 0.05, T.woodPost);
  BUILD.card(T.jug, 5.9, 0.86, 0.85); BUILD.card(T.goblet, 6.25, 0.86, 0.9); BUILD.card(T.goblet, 6.55, 0.86, 0.75);
  BUILD.card(T.candle, 6.95, 0.86, 0.85); BUILD.card(T.candle, 7.12, 0.86, 0.75, { h: 0.22 }); BUILD.flame(6.95, 1.14, 0.855, 0.3); BUILD.flame(7.12, 1.08, 0.755, 0.3);
  BUILD.card(T.chair, 5.05, 0, 0.5, { s: 0.95 });
  room.interact('table', 6.4, 1.55, room.KZ, 1.0, () => say('table'));
  BUILD.card(T.mirror, 8.0, 0, 1.35, { ry: -0.25 });
  room.interact('mirror', 8.0, 2.2, room.KZ, 0.75, () => say(SCENE.player.crownMesh.visible ? 'mirrorOn' : 'mirrorOff'));
  BUILD.light(new THREE.PointLight(0xffa860, 2.2, 0, 2), 6.9, 1.25, 1.3);
  BUILD.light(new THREE.PointLight(0xffa860, 1.4, 0, 2), 4.95, 1.3, 0.5);

  /* the crown on its velvet cushion, on a pedestal by the mirror, catching a little light of its own */
  const CX = 9.15, CZ = 1.05;
  BUILD.box(CX - 0.17, CX + 0.17, 0, 0.06, CZ - 0.17, CZ + 0.17, T.woodPost); BUILD.box(CX - 0.11, CX + 0.11, 0.06, 0.92, CZ - 0.11, CZ + 0.11, T.woodRed, { rough: 0.6 });
  BUILD.box(CX - 0.18, CX + 0.18, 0.92, 0.98, CZ - 0.18, CZ + 0.18, T.woodPost);
  BUILD.box(CX - 0.24, CX + 0.24, 0.98, 1.08, CZ - 0.21, CZ + 0.21, T.velvet, { rough: 0.95 });
  for (const s of [-1, 1]) BUILD.card(T.tassel, CX + s * 0.23, 0.9, CZ + 0.215, { cast: false });
  room.crownCard = BUILD.card(T.crownCard, CX, 1.07, CZ + 0.02, { cast: false, mat: new THREE.MeshStandardMaterial({ map: T.crownCard, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.3, metalness: 0.6, emissive: 0x3a2000, emissiveMap: T.crownCard }) });
  room.crownGlow = BUILD.glow(CX, 1.22, CZ + 0.1, 0.5, 0xffd890, 0.35);
  BUILD.light(new THREE.PointLight(0xffd8a0, 1.6, 0, 2), CX + 0.2, 1.9, CZ + 0.7);
  room.crownIt = room.interact('crown', CX, 1.65, room.KZ, 0.7, () => {
    const K = SCENE.player, on = !K.crownMesh.visible;
    SCENE.lock++; K.lookYaw = 0.9;
    K.act('Interact', 0.85, () => { K.crownMesh.visible = on; room.crownCard.visible = !on; room.crownGlow.visible = !on; });
    SCENE.wait(1500).then(() => { SCENE.lock--; say(on ? 'crownOn' : 'crownOff'); });
  });

  /* the far end: the door on toward the throne room */
  BUILD.card(T.door, 10.4, 0, 0.03, { cast: false });
  room.interact('door', 10.4, 2.4, room.KZ, 1.0, () => {
    const K = SCENE.player;
    if (!K.crownMesh.visible) { say('doorNo'); SCENE.pulse(room.crownIt); return; }
    SCENE.lock++; SCENE.say(K, L.doorGo[0]).then(() => { SCENE.lock--; SCENE.go('throne', { x: THRONE.ENTRY, face: 1 }); });
  });

  /* walls: hangings, paintings, drapes, sconces */
  BUILD.card(T.folk, -0.35, 2.45, 0.03, { cast: false }); BUILD.card(T.landscape, 3.15, 2.5, 0.03, { cast: false }); BUILD.card(T.lace, 5.55, 2.35, 0.03, { cast: false });
  BUILD.card(T.swan, 7.2, 2.4, 0.03, { cast: false }); BUILD.card(T.lattice, 9.0, 2.35, 0.03, { cast: false }); BUILD.card(T.folk, -5.0, 2.45, 0.03, { cast: false, s: 0.8 });
  for (const x of [-4.55, -1.65, 4.45, 7.95]) BUILD.card(T.curtain, x, CE - 0.15 - 2.65, 0.12, { h: 2.65, w: 0.62, cast: false });
  for (const [a, b] of [[-4.55, -1.65], [-1.65, 0.6], [2.2, 4.45], [4.45, 7.95], [7.95, 10.9]]) BUILD.card(T.swag, (a + b) / 2, CE - 0.15 - 0.65, 0.16, { w: b - a, h: 0.65, cast: false });
  for (const x of [-2.5, 6.5, 11.25]) {
    BUILD.card(T.sconce, x, 1.95, 0.05, { cast: false }); BUILD.flame(x, 2.18, 0.12, 0.6); BUILD.glow(x, 2.38, 0.2, 1.2, 0xffa050, 0.7);
    BUILD.light(new THREE.PointLight(0xffa050, 7, 0, 2), x, 2.5, 0.45);
  }

  /* rugs (no reflection on them, they stay matte) */
  BUILD.rug(T.rugA, -2.2, 3.8, 1.6, 3.85); BUILD.rug(T.rugB, 4.9, 7.9, 1.45, 2.7);

  /* foreground: posts and a candle table close to the lens, for the depth of field to chew on */
  BUILD.box(-7.7, -7.42, 0, CE, 6.2, 6.48, T.woodPost, { cast: false });
  BUILD.box(10.6, 10.88, 0, CE, 6.0, 6.28, T.woodPost, { cast: false });
  BUILD.box(-11.2, -8.6, 0.45, 0.55, 6.8, 7.8, T.woodRed, { cast: false });
  BUILD.card(T.candles, -9.6, 0.55, 7.2, { s: 1.6, cast: false }); BUILD.flame(-9.76, 1.07, 7.21, 0.6); BUILD.flame(-9.48, 1.2, 7.21, 0.6);
  BUILD.glow(-9.6, 1.3, 7.25, 1.0, 0xffa050, 0.6);

  /* light, dust */
  BUILD.light(new THREE.HemisphereLight(0x7a6068, 0x3a2418, 2.3), 0, 4, 0);
  const fill = BUILD.light(new THREE.DirectionalLight(0xc0b0d0, 0.95), 2, 4, 14); fill.target.position.set(0, 1.2, 0);
  BUILD.motes({ n: 130, boxes: [[-10.6, -6.0, 0.4, 3.4, 0.5, 3.5, 0.55], [-9, 11, 0.6, 3.8, 1, 3.5, 0.25], [-9, 11, 0.4, 2.8, 5.2, 7.8, 0.2]], embers: [FX, 0.4, 0.95] });
  room.update(0, 0);
  return BUILD.end();
};
BEDROOM.onEnter = function () { SCENE.caption(...this.caption); };
