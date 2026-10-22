/* THE STUDY — where the king reads the petitions at night. Left to right along the back wall:
     the door out (opens the map) · two tall bookcases and their ladder · a chess game left half played
     · the small hearth with his father's portrait · the rain-streaked window over the desk · an armillary sphere
     · the old king's sword · the campaign table (opens the map) · a cabinet of curiosities.
   Rain on the glass all evening; lightning now and then lights the room blue. */
const STUDY = SCENE.addRoom(new Room('study', { X0: -10.5, X1: 10.5, CEIL: 4.5, KZ: 2.55, cam: { y: 2.4, look: 2.12, dist: 19.4, fov: 19 }, exposure: 1.02, reflK: 0.45,
  music: 'castle', ambience: { rainGlass: 0.7, fire: 0.4, tone: 0.2 }, acoustics: { size: 1.2, wet: 0.14 }, surface: 'wood',
  caption: ['The Study', 'Rain on the glass'] }));
STUDY.LINES = {
  books: ['Treaties, chronicles, a herbal with the good pages cut out.', 'Father read every one of these. I have read the indexes.', 'The Margrave’s letters are on the top shelf. Nobody has asked for them in twelve years.'],
  chess: ['Zofia’s game. She has taken my queen and is being very gracious about it.', 'Three moves from mate. I will lose in the morning, with dignity.'],
  portrait: ['Father, the year before the siege. The painter made him look patient. He was not.', 'He held the gate nineteen days. I am told I have his chin.'],
  desk: ['Tomorrow’s petitions. A drowned mill, a dowry dispute, a goat with a criminal record.', 'Ilka’s report: riders on the north road again. No banners.', 'A letter from the Margrave’s grandson. Polite. Too polite.'],
  window: ['It has rained for six days. The old men in the town are starting to count.', 'Forty days, last time. Nobody says it out loud.'],
  armillary: ['The heavens on brass rings. The astronomer swears the red star is closer this year.'],
  sword: ['Father’s sword. The nicks are from the twentieth night, they say. He died on the nineteenth.'],
  curio: ['A narwhal’s tooth, an owl, and a silver swan nobody remembers buying.', 'The owl was a gift from the Woman in the Wood. Mother would not let it in the nursery.'],
};
STUDY.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, CE = room.CEIL, KZ = room.KZ, L = room.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle(k, L[k]));
  /* shell: panelling to the dado, green damask above, a beamed ceiling, waxed boards */
  BUILD.plane('z', X0, X1, 0, 1.25, 0, T.wainscot); BUILD.plane('z', X0, X1, 1.25, CE, 0, T.studyWall);
  BUILD.box(X0, X1, 1.22, 1.3, 0, 0.06, T.woodPost, { cast: false });
  for (const [x, ax] of [[X0, 'x+'], [X1, 'x-']]) { BUILD.plane(ax, 0, 9, 0, 1.25, x, T.wainscot); BUILD.plane(ax, 0, 9, 1.25, CE, x, T.studyWall); }
  room.floorMat = BUILD.reflective(T.floor, { k: 0.8 }); BUILD.plane('y+', X0, X1, 0, 10, 0, T.floor, { mat: room.floorMat, layer: 2 });
  BUILD.plane('y-', X0, X1, 0, 12, CE, T.ceiling);
  for (let x = X0 + 1.0; x < X1; x += 2.4) BUILD.box(x - 0.13, x + 0.13, CE - 0.28, CE, 0, 5, T.beam, { cast: false });
  BUILD.box(X0, X1, CE - 0.18, CE - 0.02, 0, 0.1, T.beam, { cast: false });
  /* the door out */
  BUILD.card(T.door, -9.6, 0, 0.03, { cast: false, s: 0.95 });
  BUILD.card(T.sconce, -8.45, 1.9, 0.05, { cast: false }); BUILD.flame(-8.45, 2.13, 0.12, 0.6); BUILD.glow(-8.45, 2.33, 0.2, 1.1, 0xffa050, 0.6);
  BUILD.light(new THREE.PointLight(0xffa050, 5, 0, 2), -8.45, 2.45, 0.5, { flicker: 6.4 });
  room.interact('door', -9.6, 2.4, KZ, 0.9, () => MAP.open()).label = 'Open the map';
  /* the bookcases and their ladder */
  for (const [x, t] of [[-7.7, T.shelfTall], [-5.85, T.shelfTall2]]) { BUILD.box(x - 0.9, x + 0.9, 0, 3.5, 0, 0.42, T.woodDark, { front: BUILD.std(t) }); BUILD.box(x - 0.96, x + 0.96, 3.5, 3.64, 0, 0.48, T.woodPost); BUILD.box(x - 0.95, x + 0.95, 0, 0.1, 0.38, 0.47, T.woodPost, { cast: false }); }
  BUILD.card(T.ladder, -6.8, 0, 0.88, { s: 0.78, rx: -0.12 });
  room.interact('books', -6.8, 3.0, KZ, 1.4, () => say('books'));
  /* chess by the shelves: a little table, two stools, the game */
  { const cx = -4.05, cz = 1.35; BUILD.box(cx - 0.32, cx + 0.32, 0.66, 0.72, cz - 0.32, cz + 0.32, T.woodRed); BUILD.box(cx - 0.05, cx + 0.05, 0, 0.66, cz - 0.05, cz + 0.05, T.woodPost); BUILD.box(cx - 0.22, cx + 0.22, 0, 0.04, cz - 0.22, cz + 0.22, T.woodPost);
    const g = new THREE.PlaneGeometry(0.5, 0.5); g.rotateX(-Math.PI / 2); g.translate(cx, 0.724, cz); BUILD.add(new THREE.Mesh(g, BUILD.std(T.chessTop, { rough: 0.5 })), { cast: false });
    BUILD.card(T.chessmen, cx, 0.724, cz + 0.05, { s: 0.85, cast: false }); BUILD.card(T.chessmen, cx + 0.04, 0.724, cz - 0.12, { s: 0.85, cast: false, ry: Math.PI });
    BUILD.card(T.stool, cx - 0.62, 0, cz + 0.05); BUILD.card(T.stool, cx + 0.62, 0, cz - 0.05);
    BUILD.card(T.candle, cx + 0.2, 0.72, cz - 0.2); BUILD.flame(cx + 0.2, 1.0, cz - 0.195, 0.3); BUILD.light(new THREE.PointLight(0xffb070, 1.2, 0, 2), cx + 0.2, 1.2, cz + 0.2);
    room.interact('chess', cx, 1.6, KZ, 0.8, () => say('chess')); }
  /* the hearth, with his father over it */
  const FX = -1.6;
  BUILD.box(FX - 1.2, FX + 1.2, 0, 0.08, 0, 0.95, T.ashlar, { col: 0xb8aa98 });
  BUILD.box(FX - 1.05, FX - 0.78, 0.08, 1.3, 0, 0.7, T.ashlar, { col: 0xb8aa98 }); BUILD.box(FX + 0.78, FX + 1.05, 0.08, 1.3, 0, 0.7, T.ashlar, { col: 0xb8aa98 });
  BUILD.box(FX - 0.78, FX + 0.78, 1.08, 1.3, 0, 0.7, T.ashlar, { col: 0xb8aa98 }); BUILD.box(FX - 0.78, FX + 0.78, 0.08, 1.08, 0, 0.05, T.soot, { cast: false });
  BUILD.box(FX - 1.2, FX + 1.2, 1.3, 1.42, 0, 0.84, T.woodPost, { front: BUILD.std(T.mantel) });
  BUILD.card(T.logs, FX, 0.08, 0.32, { s: 0.75, cast: false }); BUILD.flame(FX, 0.14, 0.36, 0.6, true); BUILD.card(T.grate, FX, 0.08, 0.58, { s: 0.75, cast: false });
  BUILD.glow(FX, 0.45, 0.6, 1.6, 0xff7a2a, 0.45);
  BUILD.card(T.portrait, FX, 1.78, 0.03, { cast: false, s: 1.05 });
  BUILD.light(new THREE.SpotLight(0xffc890, 14, 0, 0.45, 0.7, 2), FX, 3.9, 1.6).target.position.set(FX, 2.5, 0);
  BUILD.card(T.candles, FX - 0.95, 1.42, 0.5, { s: 0.9 }); BUILD.card(T.hourglass, FX + 0.75, 1.42, 0.45); BUILD.card(T.books, FX + 0.35, 1.42, 0.45, { s: 0.8 });
  for (const [x, y] of [[FX - 1.07, 1.67], [FX - 0.97, 1.76], [FX - 0.86, 1.62]]) BUILD.flame(x, y, 0.51, 0.3);
  room.lights.fire = BUILD.shadow(BUILD.light(new THREE.PointLight(0xff8a3c, 9, 0, 2), FX, 0.5, 1.2, { flicker: 7.1 }), R.q === 'low' ? 256 : 512);
  room.lights.fire.shadow.camera.near = 0.2;
  room.rim = [FX, 1.3, 0.6, 0.55, 5, 0xffa860, room.lights.fire]; room.shadowSrc = [FX, 4.6, 1.1, 5.2];
  room.interact('portrait', FX, 3.3, KZ, 1.0, () => say('portrait'));
  BUILD.card(T.urn, FX + 1.55, 0, 0.35, { s: 0.9 });
  /* the window over the desk: night outside, rain running down the glass */
  const WX = 1.6;
  room.winCard = BUILD.card(T.windowNight, WX, 1.05, 0.02, { basic: true, k: 1.0, cast: false });
  { const rt = T.rainGlass.clone(); rt.needsUpdate = true; rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(1, 2.2);
    const g = new THREE.PlaneGeometry(0.92, 2.2); g.translate(WX, 1.05 + 1.2, 0.035); room.rainMat = new THREE.MeshBasicMaterial({ map: rt, transparent: true, opacity: 0.55, depthWrite: false, color: 0x8aa0c8 });
    BUILD.add(new THREE.Mesh(g, room.rainMat), { cast: false, dyn: true }); room.tick.push((t) => { rt.offset.y = t * 0.08; }); }
  for (const s of [-1, 1]) BUILD.card(T.curtainGreen, WX + s * 0.78, CE - 0.2 - 2.9, 0.1, { h: 2.9, w: 0.58, cast: false });
  BUILD.card(T.swag, WX, CE - 0.2 - 0.55, 0.14, { w: 2.1, h: 0.55, cast: false });
  room.moon = BUILD.light(new THREE.SpotLight(0x7a90c8, 26, 0, 0.6, 0.9, 2), WX, 3.2, 0.3); room.moon.target.position.set(WX + 0.6, 0, 3.0);
  BUILD.shaft(WX, 3.2, 0.4, 0.9, 4.6, 0.09, [-0.5, 0.05, 0.12], 0x8aa4e0);
  const flash = BUILD.light(new THREE.SpotLight(0xc8d8ff, 0, 0, 0.75, 0.6, 2), WX, 3.0, 0.2); flash.target.position.set(WX + 0.5, 0, 4.0);
  BUILD.lightning({ light: flash, k: 120, min: 9, max: 20, thunder: 0.55, onFlash: (f) => { room.winCard.material.color.setScalar(1 + f * 4); room.rainMat.opacity = 0.55 + f * 0.4; } });
  /* the desk */
  BUILD.box(WX - 1.2, WX + 1.2, 0.74, 0.8, 0.85, 1.7, T.woodRed, { rough: 0.6 });
  BUILD.box(WX - 1.15, WX + 1.15, 0, 0.74, 0.9, 1.62, T.woodDark, { front: BUILD.std(T.deskFront) });
  { const g = new THREE.PlaneGeometry(2.36, 0.81); g.rotateX(-Math.PI / 2); g.translate(WX, 0.802, 1.275); BUILD.add(new THREE.Mesh(g, BUILD.std(T.deskTop, { rough: 0.8 })), { cast: false }); }
  BUILD.card(T.chair, WX + 0.1, 0, 0.5, { s: 1.15 });
  BUILD.card(T.inkQuill, WX + 0.75, 0.8, 1.15); BUILD.card(T.candelabra, WX - 0.85, 0.8, 1.05, { s: 0.75 }); BUILD.card(T.books, WX + 0.95, 0.8, 1.45, { s: 0.7 });
  for (const dx of [-0.13, 0, 0.13]) BUILD.flame(WX - 0.85 + dx, 0.8 + (dx ? 0.42 : 0.5), 1.055, 0.28);
  BUILD.glow(WX - 0.85, 1.28, 1.1, 0.8, 0xffa050, 0.5);
  room.lights.desk = BUILD.light(new THREE.PointLight(0xffb070, 3.2, 0, 2), WX - 0.7, 1.45, 1.6, { flicker: 9.2 });
  room.interact('desk', WX, 2.0, KZ, 1.1, () => say(SCENE.cycle('deskOrWindow', ['desk', 'window', 'desk'])));
  /* the armillary sphere: brass rings turning very slowly on a stand */
  { const ax = 3.75, az = 1.05, ay = 1.3; BUILD.card(T.armStand, ax, 0, az, { s: 1.0 });
    const brass = BUILD.std(null, { col: 0xc8962e, rough: 0.35, metal: 0.8 }), arm = new THREE.Group(); arm.position.set(ax, ay, az); BUILD.add(arm, { dyn: true });
    for (const [r, rx, ry] of [[0.3, Math.PI / 2, 0], [0.3, 0, 0], [0.27, 0.41, 0.3], [0.24, Math.PI / 2, 0.5]]) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 4, 40), brass); m.rotation.set(rx, ry, 0); m.castShadow = true; arm.add(m); }
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), BUILD.std(null, { col: 0xf0c45e, rough: 0.3, metal: 0.6 })); arm.add(sun);
    arm.rotation.z = 0.41; room.tick.push((t) => { arm.rotation.y = t * 0.12; });
    room.interact('armillary', ax, 2.1, KZ, 0.55, () => say('armillary')); }
  /* the old king's sword, then the campaign table under its lantern */
  BUILD.card(T.swordWall, 4.75, 1.4, 0.03, { cast: false });
  room.interact('sword', 4.75, 3.0, KZ, 0.5, () => say('sword'));
  BUILD.card(T.sconce, 3.3, 1.9, 0.05, { cast: false }); BUILD.flame(3.3, 2.13, 0.12, 0.6); BUILD.glow(3.3, 2.33, 0.2, 1.1, 0xffa050, 0.55);
  BUILD.light(new THREE.PointLight(0xffa050, 4.5, 0, 2), 3.3, 2.45, 0.5, { flicker: 7.7 });
  { const tx = 6.55, tz = 1.35; BUILD.box(tx - 1.15, tx + 1.15, 0.78, 0.86, tz - 0.6, tz + 0.6, T.woodRed);
    for (const x of [tx - 1.0, tx + 1.0]) for (const z of [tz - 0.48, tz + 0.48]) BUILD.box(x - 0.06, x + 0.06, 0, 0.78, z - 0.06, z + 0.06, T.woodPost);
    BUILD.box(tx - 1.05, tx + 1.05, 0.62, 0.68, tz - 0.5, tz + 0.5, T.woodPost, { cast: false });
    const g = new THREE.PlaneGeometry(1.9, 1.05); g.rotateX(-Math.PI / 2); g.translate(tx, 0.864, tz); BUILD.add(new THREE.Mesh(g, BUILD.std(T.mapSheet, { rough: 0.9 })), { cast: false });
    BUILD.card(T.figures, tx - 0.2, 0.864, tz + 0.1, { cast: false }); BUILD.card(T.figures, tx + 0.45, 0.864, tz - 0.25, { cast: false, s: 0.8 });
    BUILD.card(T.globe, tx + 0.85, 0.86, tz - 0.35, { s: 0.9 });
    BUILD.box(tx - 0.01, tx + 0.01, 3.0, CE, tz - 0.01, tz + 0.01, null, { col: 0x2a2622, cast: false });
    BUILD.card(T.lantern, tx, 2.45, tz, { cast: false }); BUILD.glow(tx, 2.7, tz + 0.05, 1.3, 0xffb060, 0.5);
    room.lights.lantern = BUILD.light(new THREE.PointLight(0xffb060, 5, 0, 2), tx, 2.55, tz + 0.2, { flicker: 5.5 });
    room.interact('table', tx, 2.0, KZ, 1.0, () => MAP.open()).label = 'Open the map'; }
  /* the cabinet of curiosities */
  BUILD.box(8.6, 9.8, 0, 2.06, 0, 0.45, T.woodDark, { front: BUILD.std(T.curio, { rough: 0.35 }) }); BUILD.box(8.55, 9.85, 2.06, 2.16, 0, 0.5, T.woodPost);
  BUILD.card(T.plant, 9.2, 2.16, 0.25, { s: 0.7 });
  BUILD.card(T.sconce, 8.1, 1.9, 0.05, { cast: false }); BUILD.flame(8.1, 2.13, 0.12, 0.6); BUILD.glow(8.1, 2.33, 0.2, 1.1, 0xffa050, 0.55);
  BUILD.light(new THREE.PointLight(0xffa050, 4.2, 0, 2), 8.1, 2.45, 0.6, { flicker: 6.9 });
  room.interact('curio', 9.2, 2.7, KZ, 0.9, () => say('curio'));
  /* the rug, a reading chair and candle stand close to the lens */
  BUILD.rug(T.rugStudy, -1.4, 4.6, 1.75, 4.35);
  BUILD.card(T.chair, -8.3, 0, 6.4, { s: 1.3, cast: false }); BUILD.card(T.candleStand, 9.4, 0, 6.6, { s: 1.1, cast: false });
  for (const [dx, y] of [[-0.3, 2.12], [0, 2.34], [0.3, 2.12]]) BUILD.flame(9.4 + dx, y, 6.61, 0.35);
  BUILD.glow(9.4, 2.3, 6.65, 1.0, 0xffa050, 0.5);
  BUILD.box(-10.0, -9.72, 0, CE, 6.0, 6.28, T.woodPost, { cast: false });
  /* light, dust */
  BUILD.light(new THREE.HemisphereLight(0x50606a, 0x2a1a10, 1.8), 0, 4, 0);
  const fill = BUILD.light(new THREE.DirectionalLight(0xb0b8d0, 0.7), 2, 4, 14); fill.target.position.set(0, 1.2, 0);
  BUILD.motes({ n: 110, boxes: [[-3, 0, 0.3, 2.8, 0.4, 2.5, 0.35], [0.8, 2.6, 0.6, 3.3, 0.3, 3.5, 0.35], [-9, 9, 0.4, 3.4, 1, 4, 0.3]], embers: [FX, 0.35, 0.5] });
  room.update(0, 0);
  return BUILD.end();
};
STUDY.onEnter = function () { if (!CUT.playing) SCENE.caption(...this.caption); };
