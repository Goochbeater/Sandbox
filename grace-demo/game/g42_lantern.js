/* THE HOUSE OF THE LANTERN — Wanda's house in the river quarter (STORY.md §9). A king can't walk into a brothel, so he
   doesn't: old King Bolesław's siege tunnel runs from a stair behind the chapel's confessional to Wanda's cellar, and in
   the house the king is nobody, the Falconer: no crown, no fur collar, no tabard (rooms with { disguise: true }).
   Two rooms. The common room (LANTERN): the cellar arch, Wanda's counter and bottles, two tables, the hearth, a lute player,
   the river window, the stair up to the gallery and its six painted doors; the women downstairs (Róża, Nadia, Hanna, Lena,
   Agata), Wanda behind the counter, a docker and a League clerk. A woman's room (LROOM): her bed at LOVERS.BED (the night
   scene's positions are world places, so the bed stands exactly where the royal bed does), dressed for whoever he goes up
   with. Every woman is an adult who chooses; the scenes are behind the 18+ gate; the player picks the king's lines.
   The scenes run on the night scene's machinery with a stage of their own (NIGHT.S, g26). */
const LANTERN = SCENE.addRoom(new Room('lantern', { X0: -12, X1: 12, CEIL: 6.4, KZ: 2.8, cam: { y: 2.9, look: 2.7, dist: 19.4, fov: 19 }, exposure: 0.95, reflK: 0.45, disguise: true,
  music: 'castle', ambience: { fire: 0.5, crowd: 0.35, tone: 0.2 }, acoustics: { size: 1.8, wet: 0.3 }, surface: 'wood', caption: ['The House of the Lantern', 'The river quarter, after dark'] }));
const LROOM = SCENE.addRoom(new Room('lroom', { X0: -14.0, X1: 5.6, CEIL: 4.4, KZ: 2.6, cam: { y: 2.45, look: 2.18, dist: 19.4, fov: 19 }, exposure: 0.95, reflK: 0.4, disguise: true,
  music: 'castle', ambience: { fire: 0.25, tone: 0.25 }, acoustics: { size: 1.1, wet: 0.2 }, surface: 'wood' }));
const HOUSE = { found: false, met: {}, trust: {}, nights: {}, rumour: 0, warned: 0, with: null };
HOUSE.init0 = JSON.stringify(HOUSE);
HOUSE.reset = function () { Object.assign(HOUSE, JSON.parse(HOUSE.init0)); };
HOUSE.state = function () { return { found: HOUSE.found, met: HOUSE.met, trust: HOUSE.trust, nights: HOUSE.nights, rumour: HOUSE.rumour, warned: HOUSE.warned }; };
HOUSE.load = function (s) { HOUSE.reset(); if (s) for (const k of ['found', 'met', 'trust', 'nights', 'rumour', 'warned']) if (k in s) HOUSE[k] = s[k]; };
HOUSE.WOMEN = ['roza', 'nadia', 'hanna', 'lena', 'agata'];
LANTERN.LINES = {
  cellar: ['Down the cellar steps and back along the tunnel. My father walked it every Thursday for eleven years.'],
  counter: ['Wanda’s counter: forty bottles, half of them honest.'], hearth: ['A good fire, and somebody’s socks drying in front of it.'],
  window: ['The river under the moon. Somewhere up that hill a king is supposed to be asleep.'], lute: ['He plays the same four songs. The third one is about my father. I know all the words.'],
  stair: ['The gallery. Six doors, each painted for the woman behind it.'], tables: ['Dice, ale and somebody’s bread. Nobody looks up.']
};
LROOM.LINES = { door: ['Back down to the common room.'], wash: ['Cold water, a cracked bowl, a clean cloth. More care than most inns.'], bed: ['A good bed. Better than the Krasnian prince’s, I’d bet.'], window: ['The river again, and the fortress lights over it.'] };
/* ---------------------------------------------------------------- the common room */
LANTERN.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, CE = room.CEIL, KZ = room.KZ, L = room.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle('hl' + k, L[k]));
  /* the shell: half-timbered walls, worn planks, the beams overhead */
  BUILD.plane('z', X0, X1, 0, CE, 0, T.houseWall);
  for (const [x, ax] of [[X0, 'x+'], [X1, 'x-']]) BUILD.plane(ax, 0, 9, 0, CE, x, T.houseWall);
  room.floorMat = BUILD.reflective(T.housePlanks, { k: 0.6, rough: 0.6 }); BUILD.plane('y+', X0, X1, 0, 9, 0, T.housePlanks, { mat: room.floorMat, layer: 2 });
  BUILD.plane('y-', X0, X1, 0, 9, CE, T.housePlanks, { col: 0x6a5a4a });
  for (let x = X0 + 1.4; x < X1; x += 2.8) BUILD.box(x - 0.15, x + 0.15, CE - 0.4, CE, 0, 9, T.beam, { cast: false });
  /* the gallery: a floor over the back of the room on posts, a balustrade, six painted doors, a red lantern by each */
  BUILD.box(X0 + 0.1, 8.0, 3.1, 3.3, 0, 1.5, T.woodDark); BUILD.box(X0 + 0.1, 8.0, 2.95, 3.1, 1.4, 1.55, T.beam);
  for (const x of [-9.6, -3.9, 2.0, 6.5]) BUILD.box(x - 0.1, x + 0.1, 0, 3.1, 1.38, 1.52, T.beam);
  BUILD.box(X0 + 0.1, 8.0, 4.06, 4.16, 1.44, 1.54, T.woodRed);
  for (let x = X0 + 0.3; x < 8.0; x += 0.42) BUILD.box(x - 0.03, x + 0.03, 3.3, 4.06, 1.46, 1.52, T.woodPost, { cast: false });
  for (const [x, t] of [[-9.0, T.doorRose], [-5.6, T.doorCompass], [-2.2, T.doorWheat], [1.2, T.doorShell], [4.6, T.doorQuill], [7.2, T.doorLamp]]) BUILD.card(t, x, 3.3, 0.03, { cast: false });
  for (const x of [-7.3, -3.9, -0.5, 2.9, 6.0]) { BUILD.card(T.redLantern, x, 4.5, 0.4, { cast: false }); BUILD.glow(x, 4.85, 0.45, 1.0, 0xff4a2a, 0.45); }
  BUILD.light(new THREE.PointLight(0xff5a3a, 2.2, 0, 2), -3.9, 4.8, 1.0, { flicker: 3 }); BUILD.light(new THREE.PointLight(0xff5a3a, 2.2, 0, 2), 2.9, 4.8, 1.0, { flicker: 3.4 });
  /* the stair up to the gallery, at the right */
  { const S0 = 7.8, S1 = 11.0, H = 3.1, n = 12, run = (S1 - S0) / n;
    for (let i = 0; i < n; i++) { const x = S0 + run * i, y = H * (i + 1) / n; BUILD.box(x - 0.02, x + run + 0.02, y - 0.07, y, 0.3, 1.25, T.woodRed); BUILD.box(x - 0.01, x + 0.02, y - H / n, y - 0.07, 0.34, 1.21, T.woodDark, { cast: false }); }
    BUILD.box(S1, X1 - 0.1, H - 0.1, H, 0, 1.5, T.woodDark);
    const len = Math.hypot(S1 - S0, H), ang = Math.atan2(H, S1 - S0); { const g = new THREE.BoxGeometry(len + 0.2, 0.07, 0.07); g.rotateZ(ang); g.translate((S0 + S1) / 2, H / 2 + 0.92, 1.3); BUILD.planarUV(g, T.woodPost); BUILD.add(new THREE.Mesh(g, BUILD.std(T.woodPost)), { cast: false }); }
    for (let i = 0; i <= 3; i++) { const x = S0 + (S1 - S0) * i / 3, y = H * i / 3; BUILD.box(x - 0.04, x + 0.04, y, y + 0.92, 1.26, 1.34, T.woodPost, { cast: false }); }
    BUILD.card(T.barrel, 8.8, 0, 0.6, { s: 0.8 }); BUILD.card(T.crate, 9.6, 0, 0.5, { s: 0.7 });
    room.interact('stair', 9.4, 3.4, KZ, 0.6, () => say('stair')); }
  /* the cellar arch: the tunnel's end */
  BUILD.card(T.cellarArch, -10.6, 0, 0.03, { cast: false }); BUILD.glow(-10.6, 0.9, 0.2, 1.6, 0x2a1a10, 0.3);
  room.interact('cellar', -10.6, 2.4, KZ, 0.9, () => LANTERN.leave()).label = 'Down the cellar, back to the chapel';
  /* Wanda's counter, her bottles, a candle */
  BUILD.box(-8.8, -5.4, 0, 1.1, 0.8, 1.4, T.woodDark, { front: BUILD.std(T.barCounter) }); BUILD.box(-8.85, -5.35, 1.1, 1.16, 0.75, 1.45, T.woodRed);
  BUILD.card(T.barCounter, -7.1, 0, 1.42, { w: 3.4, h: 1.18, cast: false });
  BUILD.card(T.bottleShelf, -7.1, 1.3, 0.04, { cast: false }); BUILD.flame(-5.8, 1.42, 1.1, 0.25); BUILD.light(new THREE.PointLight(0xffb070, 1.4, 0, 2), -5.8, 1.6, 1.6, { flicker: 7 });
  room.interact('counter', -6.3, 1.9, KZ, 0.6, () => say('counter'));
  /* two tables, benches, the regulars behind them */
  for (const tx of [-2.7, 0.4]) { BUILD.box(tx - 0.7, tx + 0.7, 0.72, 0.8, 1.0, 1.6, T.woodRed); for (const dx of [-0.6, 0.6]) BUILD.box(tx + dx - 0.05, tx + dx + 0.05, 0, 0.72, 1.25, 1.35, T.woodPost);
    BUILD.box(tx - 0.8, tx + 0.8, 0.4, 0.46, 0.5, 0.8, T.woodDark); BUILD.card(T.tableSet, tx, 0.8, 1.3, { cast: false });
    BUILD.card(tx < 0 ? T.crowdA : T.crowdB, tx, 0.42, 0.62, { w: 1.7, h: 1.25, cast: false, ru: 0.22 });
    BUILD.light(new THREE.PointLight(0xffb070, 1.0, 0, 2), tx - 0.1, 1.1, 1.5, { flicker: 8 + tx }); }
  room.interact('tables', -1.2, 1.4, KZ, 0.5, () => say('tables'));
  /* the hearth: stone jambs, a lintel, the chimney breast, a good fire */
  BUILD.box(2.6, 3.0, 0, 1.5, 0, 0.6, T.ashlar); BUILD.box(4.6, 5.0, 0, 1.5, 0, 0.6, T.ashlar); BUILD.box(2.5, 5.1, 1.5, 1.9, 0, 0.7, T.ashlar); BUILD.box(2.8, 4.8, 1.9, 3.1, 0, 0.5, T.ashlar, { col: 0xb8a898 });
  BUILD.card(T.hearthLogs, 3.8, 0.02, 0.35, { cast: false }); BUILD.flame(3.8, 0.12, 0.38, 1.0, true); BUILD.glow(3.8, 0.7, 0.45, 2.0, 0xff8a2a, 0.4);
  room.lights.fire = BUILD.light(new THREE.PointLight(0xff8a3c, 8, 0, 2), 3.8, 0.9, 1.1, { flicker: 7 });
  room.interact('hearth', 3.8, 2.2, KZ, 0.7, () => say('hearth'));
  /* the lute player, the river window and its moonlight */
  BUILD.card(T.lutePlayer, 5.9, 0, 0.7); room.interact('lute', 5.9, 1.9, KZ, 0.5, () => { AUDIO.sfx('chime', { gain: 0.3 }); say('lute'); });
  BUILD.card(T.riverWindow, 7.1, 1.0, 0.03, { basic: true, k: 1.1, cast: false }); BUILD.glow(7.1, 1.8, 0.2, 1.8, 0x8aa8e8, 0.2);
  room.lights.moon = BUILD.shadow(BUILD.light(new THREE.SpotLight(0x8aa8e0, 60, 0, 0.55, 0.8, 2), 7.1, 2.4, 0.3), R.q === 'low' ? 512 : 1024); room.lights.moon.target.position.set(6.2, 0, 2.6);
  room.interact('window', 7.1, 2.9, KZ, 0.5, () => say('window'));
  /* lanterns in the open front of the room, high up; the near side: a curtain, a table's edge, a barrel */
  for (const x of [-8, -4, 0, 4, 8]) { BUILD.box(x - 0.01, x + 0.01, 5.3, CE, 2.2, 2.22, T.woodPost, { cast: false }); BUILD.card(T.redLantern, x, 4.5, 2.2, { cast: false, s: 1.2 }); BUILD.glow(x, 4.95, 2.25, 1.3, 0xff4a2a, 0.5); }
  BUILD.light(new THREE.PointLight(0xff5a3a, 2.4, 0, 2), -4, 4.6, 2.6, { flicker: 2.5 }); BUILD.light(new THREE.PointLight(0xff5a3a, 2.4, 0, 2), 4, 4.6, 2.6, { flicker: 2.8 });
  BUILD.card(T.curtain, X0 + 0.6, 0, 7.0, { cast: false, col: 0xb83a2a }); BUILD.box(2.8, 5.2, 0.72, 0.8, 6.6, 7.4, T.woodRed, { cast: false }); BUILD.card(T.tableSet, 4.0, 0.8, 7.0, { cast: false });
  BUILD.card(T.barrel, 9.4, 0, 7.4, { s: 1.1, cast: false });
  /* light: a low warm room, the hearth and the lanterns doing the work */
  BUILD.light(new THREE.HemisphereLight(0x6a4a3a, 0x24140c, 1.5), 0, 5, 0);
  const fill = BUILD.light(new THREE.DirectionalLight(0xc8a890, 0.35), 2, 5, 15); fill.target.position.set(0, 1.5, 0);
  room.rim = [3.8, 1.2, 1.2, 0.6, 9, 0xff9a50, room.lights.fire]; room.shadowSrc = [3.8, 2.2, 1.2, 8];
  BUILD.motes({ n: 70, boxes: [[-11, 11, 0.4, 5.6, 0.5, 4, 0.25]], embers: [3.8, 0.4, 0.4], col: 0xffd8b0 });
  room.update(0, 0);
  return BUILD.end();
};
LANTERN.onEnter = function () {
  if (!CUT.playing) SCENE.caption(...this.caption);
  const room = this;
  for (const id of HOUSE.WOMEN.concat(['wanda'])) if (CAST.A[id] && !room.inter.some((i) => i.id === id)) { const a = CAST.A[id], sit = a.curHome && a.curHome.sit;
    room.interact(id, a.x, (sit ? sit.y - 0.45 : a.y) + (a.spec.headY || 2.0) + 0.45, a.z, 0.8, () => (id === 'wanda' ? HOUSE.wanda() : HOUSE.meet(id))).label = 'Talk to ' + a.name; }
  FEST.talkers(room, [['docker', 'Talk to the docker'], ['clerk', 'Talk to the League clerk', () => HOUSE.clerk()]]);
  /* Wanda has been waiting twelve years: she speaks first, as soon as the room is free (the arrival's fade and any line in
     progress hold the lock; a single timer that found it held used to miss her welcome altogether) */
  if (!HOUSE.met.wanda) { const t0 = performance.now(), tryW = () => { if (SCENE.room !== LANTERN || HOUSE.met.wanda) return;
    if (SCENE.lock || SCENE.modal || CUT.playing || NIGHT.on || performance.now() - t0 < 1600) { setTimeout(tryW, 250); return; } HOUSE.wanda(); }; setTimeout(tryW, 250); }
  else if (HOUSE.rumour >= 3 * (HOUSE.warned + 1) && HOUSE.warned < 2) { HOUSE.warned++; setTimeout(() => SCENE.say(CAST.A.wanda, HOUSE.W.wanda.warn[HOUSE.warned - 1]), 1800); }
};
LANTERN.leave = function () { SCENE.lock++; SCENE.say(SCENE.player, LANTERN.LINES.cellar[0]).then(() => { SCENE.lock--; GAME.save(); SCENE.go('chapel', { x: 10.6, face: -1 }); }); };
/* ---------------------------------------------------------------- a woman's room */
LROOM.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, CE = room.CEIL, L = room.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle('lr' + k, L[k]));
  BUILD.plane('z', X0, X1, 0, CE, 0, T.houseWall);
  for (const [x, ax] of [[X0, 'x+'], [X1, 'x-']]) BUILD.plane(ax, 0, 9, 0, CE, x, T.houseWall);
  room.floorMat = BUILD.reflective(T.housePlanks, { k: 0.5, rough: 0.6 }); BUILD.plane('y+', X0, X1, 0, 9, 0, T.housePlanks, { mat: room.floorMat, layer: 2 });
  BUILD.plane('y-', X0, X1, 0, 9, CE, T.housePlanks, { col: 0x6a5a4a });
  for (let x = X0 + 1.2; x < X1; x += 2.6) BUILD.box(x - 0.14, x + 0.14, CE - 0.36, CE, 0, 9, T.beam, { cast: false });
  /* the bed, exactly where the royal bed stands (LOVERS.BED), so every position fits it */
  const B = LOVERS.BED, B0 = B.x0, B1 = B.x1, BZ0 = B.z0, BZ1 = B.z1;
  for (const [x, z] of [[B0, BZ0], [B1, BZ0], [B0, BZ1], [B1, BZ1]]) BUILD.box(x - 0.08, x + 0.08, 0, z === BZ0 && x === B0 ? 1.9 : 1.15, z - 0.08, z + 0.08, T.woodPost);
  BUILD.box(B0, B1, 0.18, 0.45, BZ0, BZ1, T.woodRed);
  room.quilt = BUILD.box(B0 + 0.05, B1 - 0.05, 0.45, 0.8, BZ0 + 0.02, BZ1 - 0.02, T.houseQuilt, { rough: 0.95, dyn: true }); room.quilt.material = room.quilt.material.clone();
  room.quiltFront = BUILD.box(B0 + 0.05, B1 - 0.05, 0.25, 0.8, BZ1 - 0.02, BZ1 + 0.03, T.houseQuilt, { rough: 0.95, cast: false, dyn: true }); room.quiltFront.material = room.quilt.material;
  BUILD.box(B0 + 0.12, B0 + 0.62, 0.8, 0.98, BZ0 + 0.15, BZ0 + 0.85, T.linen); BUILD.box(B0 + 0.12, B0 + 0.62, 0.8, 0.98, BZ0 + 0.95, BZ1 - 0.15, T.linen);
  BUILD.box(B0 - 0.06, B0 + 0.04, 0.4, 1.85, BZ0, BZ1, T.woodRed);
  room.interact('bed', -7.7, 1.5, room.KZ, 1.0, () => say('bed'));
  /* left of the headboard (the room runs 4.5 m past it, so the eased-in night camera can centre on the bed on a 2.8:1 phone
     strip rather than stop at the wall; see ENGINE.md §13i): a chest, her washstand with a bowl, a jug and a candle, a mirror */
  BUILD.card(T.plant, -13.5, 0, 0.5, { s: 0.8 }); BUILD.box(-13.5, -12.5, 0, 0.55, 1.2, 1.75, T.woodDark, { front: BUILD.std(T.chest) });
  BUILD.box(-12.2, -11.0, 0, 0.82, 0.25, 0.85, T.woodDark); BUILD.box(-12.25, -10.95, 0.82, 0.88, 0.2, 0.9, T.woodRed);
  BUILD.card(T.candle, -12.0, 0.88, 0.45); BUILD.flame(-12.0, 1.16, 0.455, 0.3); BUILD.card(T.bowl, -11.6, 0.88, 0.55); BUILD.card(T.jug, -11.2, 0.88, 0.5);
  BUILD.card(T.linen, -10.98, 0.3, 0.88, { w: 0.35, h: 0.5, cast: false });
  room.lights.wash = BUILD.light(new THREE.PointLight(0xffa860, 1.6, 0, 2), -12.0, 1.3, 1.0, { flicker: 9 });
  BUILD.card(T.mirror, -10.3, 0, 0.5, { s: 0.85, ry: 0.2 });
  room.interact('wash', -11.6, 1.6, room.KZ, 0.6, () => say('wash'));
  /* the bedside table and its candle; a red lantern over the bed; the window with the moon */
  BUILD.box(-5.7, -5.1, 0, 0.72, 1.3, 1.9, T.woodDark); BUILD.card(T.candleStand, -5.4, 0.72, 1.6, { s: 0.45 }); BUILD.flame(-5.4, 1.32, 1.62, 0.22);
  room.lights.candle = BUILD.light(new THREE.PointLight(0xffa050, 3.4, 0, 2), -5.4, 1.4, 1.9, { flicker: 8 });
  BUILD.box(-7.71, -7.69, 3.3, CE, 1.19, 1.21, T.woodPost, { cast: false }); BUILD.card(T.redLantern, -7.7, 2.75, 1.2, { cast: false }); BUILD.glow(-7.7, 3.1, 1.25, 1.0, 0xff4a2a, 0.45);
  BUILD.light(new THREE.PointLight(0xff6a40, 2.6, 0, 2), -7.7, 3.0, 1.8, { flicker: 3 });   // the red lantern over the bed lights the scene
  BUILD.card(T.riverWindow, -2.6, 1.0, 0.03, { basic: true, k: 1.1, cast: false }); BUILD.glow(-2.6, 1.8, 0.2, 1.6, 0x8aa8e8, 0.2);
  room.lights.moon = BUILD.shadow(BUILD.light(new THREE.SpotLight(0x8aa8e0, 50, 0, 0.6, 0.8, 2), -2.6, 2.6, 0.3), R.q === 'low' ? 512 : 1024); room.lights.moon.target.position.set(-6.0, 0.6, 1.4);
  room.interact('window', -2.6, 2.9, room.KZ, 0.5, () => say('window'));
  BUILD.card(T.dressScreen, 1.4, 0, 0.6); BUILD.card(T.chair, -0.6, 0, 1.6, { s: 1.0 });
  BUILD.card(T.doorLamp, 4.2, 0, 0.03, { cast: false }); room.interact('door', 4.2, 2.4, room.KZ, 0.8, () => LROOM.downstairs()).label = 'Back down to the common room';
  /* each woman's things, shown only when it's her room: Róża's silks, Nadia's maps, Hanna's husband's cloak and sword,
     Lena's copper bath (steaming), Agata's turned cross and her books */
  const D = (tex, x, y, z, o) => BUILD.card(tex, x, y, z, Object.assign({ cast: false, dyn: true }, o));
  room.dress = {
    roza: [D(T.silkSwag, -7.7, 2.15, 0.06, { w: 3.6, h: 1.0 }), D(T.silkSwag, -2.6, 2.9, 0.06, { w: 2.0, h: 0.56 })],
    nadia: [D(T.mapWall, -4.2, 1.2, 0.04), D(T.mapWall, -0.2, 1.5, 0.04, { s: 0.7 })],
    hanna: [D(T.cloakPeg, -4.4, 0.8, 0.05)],
    lena: [D(T.copperBath, -0.6, 0, 1.2, { cast: true })],
    agata: [D(T.crossTurned, -4.2, 1.7, 0.04), D(T.booksPile, -5.4, 0.72, 1.75), D(T.booksPile, 0.4, 0, 0.5)]
  };
  room.steam = []; for (let i = 0; i < 4; i++) { const m = new THREE.SpriteMaterial({ map: T.smokeSoft, color: 0xd8d0d8, transparent: true, opacity: 0, depthWrite: false }); const s = new THREE.Sprite(m); BUILD.add(s, { cast: false }); room.steam.push({ s, m, ph: i / 4 }); }
  room.tick.push((t) => { const on = HOUSE.with === 'lena'; for (const p of room.steam) { const u = (t * 0.18 + p.ph) % 1; p.s.visible = on; p.s.position.set(-0.6 + Math.sin(u * 4 + p.ph * 7) * 0.3, 0.9 + u * 1.6, 1.2); p.s.scale.setScalar(0.5 + u * 1.2); p.m.opacity = 0.22 * Math.sin(u * Math.PI); } });
  BUILD.card(T.curtain, X1 - 0.5, 0, 6.8, { cast: false, col: 0xb83a2a });
  BUILD.light(new THREE.HemisphereLight(0x7a5a4a, 0x1c120c, 1.6), 0, 4, 0);
  const fill = BUILD.light(new THREE.DirectionalLight(0xc8a8a0, 0.3), 2, 4, 14); fill.target.position.set(-4, 1.2, 0);
  room.rim = [-5.4, 1.4, 1.9, 0.5, 6, 0xffa050, room.lights.candle]; room.shadowSrc = [-5.4, 1.6, 1.9, 6];
  BUILD.motes({ n: 48, boxes: [[-13.2, 4.5, 0.4, 3.6, 0.5, 3.2, 0.2]], col: 0xffd8b0 });
  room.update(0, 0);
  return BUILD.end();
};
LROOM.QUILT = { roza: 0xe0947a, nadia: 0xb8b0e0, hanna: 0xece2cc, lena: 0xeca8b8, agata: 0xa0a0b0 };
/* dress the room for her and show only her (all the women live here, for their layers; one is shown) */
LROOM.onEnter = function () {
  const room = this, id = HOUSE.with;
  for (const k in room.dress) for (const m of room.dress[k]) m.visible = k === id;
  room.quilt.material.color.set(LROOM.QUILT[id] || 0xffffff);
  for (const w of HOUSE.WOMEN) if (CAST.A[w]) CAST.A[w].setVisible(w === id);
};
LROOM.downstairs = function () { if (NIGHT.on) return; GAME.save(); SCENE.go('lantern', { x: 9.0, face: -1 }); };
/* ---------------------------------------------------------------- meeting the women */
HOUSE.band = (id) => { const t = HOUSE.trust[id] || 0; return t < 3 ? 0 : t < 6 ? 1 : 2; };
HOUSE.meet = async function (id) {
  const A = CAST.A, Q = A[id], W = HOUSE.W[id], K = SCENE.player; if (!Q) return;
  K.faceTo(Q.x); if (!Q.sitting) { Q.faceTo(K.x); Q.lookYaw = Math.sign(K.x - Q.x) * 0.8; }
  const who = (k) => (k === 'king' ? K : Q); let locked = true; SCENE.lock++;
  try {
    if (!HOUSE.met[id]) { HOUSE.met[id] = true; HOUSE.trust[id] = (HOUSE.trust[id] || 0) + 1; await SCENE.talk(W.first.map(([k, t]) => [who(k), t])); }
    else await SCENE.say(Q, SCENE.cycle('hm' + id, W.more), { wait: true });
    const i = await NIGHT.ask(['Go upstairs with her (18+)', 'Talk a while', 'Leave her be']);
    if (i === 1) { HOUSE.trust[id] = (HOUSE.trust[id] || 0) + 1; await SCENE.say(Q, SCENE.cycle('ht' + id, W.talk), { wait: true }); }
    else if (i === 0) { SCENE.lock--; locked = false; AUDIO.sfx('coin', { gain: 0.5 }); NIGHT.confirm(() => HOUSE.scene(id).catch(fail)); }
  } finally { if (locked) SCENE.lock--; if (!Q.sitting) Q.lookYaw = null; }
};
HOUSE.wanda = async function () {
  const A = CAST.A, Wd = A.wanda, K = SCENE.player, W = HOUSE.W.wanda; if (!Wd || SCENE.lock) return;
  K.faceTo(Wd.x); SCENE.lock++;
  try {
    if (!HOUSE.met.wanda) { HOUSE.met.wanda = true; HOUSE.found = true; await SCENE.talk(W.first.map(([k, t]) => [k === 'king' ? K : Wd, t])); }
    else await SCENE.say(Wd, SCENE.cycle('hwd', W.more.concat(W.talk)), { wait: true });
  } finally { SCENE.lock--; }
};
HOUSE.clerk = async function () {
  const C0 = CAST.A.clerk; if (!C0) return; HOUSE.rumour++;   // talking to the League's clerk is how the Falconer gets a name
  await FEST.talk('clerk', HOUSE.W.clerk);
};
/* ---------------------------------------------------------------- upstairs: her room, the bed, the night scene's engine */
HOUSE.stage = function (id) {
  const W = HOUSE.W[id]; return { room: LROOM, enter: W.enter, lines: W.lines, cam: NIGHT.CAM, lens: null, finish: HOUSE.finish, end: HOUSE.end };
};
HOUSE.scene = async function (id) {
  const K = SCENE.player, Q = CAST.A[id], W = HOUSE.W[id]; if (!Q || NIGHT.on) return;
  SCENE.lock++;
  try {
    await SCENE.say(Q, W.yes, { wait: true });
    HOUSE.with = id; await SCENE.go('lroom', { x: 3.4, face: -1 });   // LROOM.onEnter dresses the room for her
    const room = LROOM;
    NIGHT.S = HOUSE.stage(id); NIGHT.on = true; NIGHT.A = { K, Q }; NIGHT.lensK = 0; NIGHT.lensT = 0; NIGHT.pos = null; NIGHT.k = 0; NIGHT.ph = 0; NIGHT.inBed = false; NIGHT.finishing = false; NIGHT.hold = false; NIGHT.brT = 1; NIGHT.lineT = 5;
    NIGHT.tweens = []; room.tick.push(NIGHT.tick); NIGHT.camMode = 'room'; NIGHT.cam0 = { fov: room.cam.fov, y: room.cam.y, look: room.cam.look, focus: room.camFocus };
    NIGHT.done = new Promise((r) => { NIGHT.resolve = r; });
    Q.x = 2.4; Q.z = room.KZ - 0.15; Q.face = -1; Q.yaw = -0.42; Q.lookYaw = null;
    await Promise.all([K.makeBare(), Q.makeBare()]);
    NIGHT.look(Q, K); await SCENE.talk(W.intro.map(([k, t]) => [k === 'K' ? K : Q, t]));
    const her = NIGHT.walk(Q, -7.9); await NIGHT.beat(350); const him = NIGHT.walk(K, -7.3); await Promise.all([her, him]);
    NIGHT.look(Q, K); NIGHT.look(K, Q); await NIGHT.beat(300);
    await SCENE.talk([[Q, W.undress[0]]]);
    K.act('Interact'); AUDIO.sfx('sheets', { gain: 0.45 }); await NIGHT.beat(900); await Q.undress('outer'); AUDIO.sfx('sheets', { gain: 0.8 });
    Q.act('Interact'); await NIGHT.beat(700); await K.undress('outer'); AUDIO.sfx('sheets', { gain: 0.8 }); await NIGHT.beat(300);
    await SCENE.talk(W.undress.slice(1).map(([k, t]) => [k === 'K' ? K : Q, t]));
    K.act('Interact'); Q.act('Interact'); await NIGHT.beat(600);
    await Q.undress('all'); await K.undress('all'); if (K.sexGroup) K.sexGroup.visible = false;   // the house rule: he is never shown
    K.setArousal(0.3); AUDIO.sfx('sheets', { gain: 1 }); await NIGHT.beat(500);
    // into bed: one sprite for both bodies, as the royal bed has it
    K.reframe(3.9, 2.5); K.frame = new THREE.Vector3(-7.7, 1.5, LOVERS.BED.zc); K.cardDz = 1.6; Q.hostInto(K);
    NIGHT.camMode = 'bed'; NIGHT.lensT = 1; AUDIO.sfx('creak', { gain: 0.6, delay: 0.6 });
    NIGHT.tween(2.2, (u) => { K.cardDz = lerp(1.6, 0.82, u); });
    await NIGHT.drive('kiss', 2.1, 0.34);
    NIGHT.inBed = true; NIGHT.lineT = 5;
    NIGHT.scripted = true; for (const [w, t] of W.enter.kiss) await NIGHT.say(w === 'K' ? K : Q, t, 200); NIGHT.scripted = false;
    NIGHT.setPace(1); NIGHT.posBar(); $('nView').hidden = false; $('nFinish').hidden = false; $('nView').textContent = NIGHT.closer ? 'Wider' : 'Closer'; NIGHT.bar(['pos', 'pace']);
    if (W.fav) NIGHT.to(W.fav);   // her favourite: she moves him there herself
    await NIGHT.done;
  } finally { SCENE.lock--; }
};
HOUSE.finish = async function () {
  const K = NIGHT.A.K, Q = NIGHT.A.Q, W = HOUSE.W[HOUSE.with]; NIGHT.bar([]); NIGHT.scripted = true;
  if (NIGHT.pos !== 'kiss') {
    NIGHT.finishing = true; NIGHT.k = Math.max(NIGHT.k, 0.85); NIGHT.pace = Math.max(NIGHT.pace, 1.5);
    await NIGHT.say(Q, W.finish[0], 900); await NIGHT.say(K, W.finish[1], 700);
    NIGHT.hold = true; NIGHT.ph = Math.ceil(NIGHT.ph / (Math.PI * 2)) * Math.PI * 2 + 0.38 * Math.PI * 2;
    AUDIO.sfx('breath', { gain: 0.9, pitch: 1500, dur: 1.4 }); AUDIO.sfx('breath', { gain: 0.6, pitch: 620, dur: 1.2, delay: 0.3 });
    await NIGHT.say(Q, W.finish[2], 1400); await NIGHT.beat(1100);
    NIGHT.hold = false; NIGHT.finishing = false;
  } else await NIGHT.say(Q, W.cuddle, 300);
  AUDIO.sfx('sheets', { gain: 0.9 }); await NIGHT.drive('after', 2.4, 0.08); NIGHT.k = 0.2;
  await SCENE.talk(W.after.map(([w, t]) => [w === 'K' ? K : Q, t]));
  await NIGHT.beat(700); NIGHT.scripted = false; await HOUSE.end(true);
};
HOUSE.end = async function (slept) {
  const K = NIGHT.A.K, Q = NIGHT.A.Q, room = LROOM, c0 = NIGHT.cam0, id = HOUSE.with;
  NIGHT.bar([]); await NIGHT.fade(true);
  NIGHT.inBed = false; NIGHT.camMode = 'room'; Object.assign(room.cam, { fov: c0.fov, y: c0.y, look: c0.look }); room.camFocus = c0.focus; room.focusDz = 0;
  POSE.release(K); POSE.release(Q); Q.hostInto(null); K.frame = null; K.reframe(); K.cardDz = 0;
  K.dress(); Q.dress(); K.setArousal(0);   // dress() puts the disguise back on
  room.tick = room.tick.filter((f) => f !== NIGHT.tick); NIGHT.tweens = []; NIGHT.on = false; NIGHT.S = null;
  HOUSE.trust[id] = (HOUSE.trust[id] || 0) + (slept ? 2 : 1); HOUSE.nights[id] = (HOUSE.nights[id] || 0) + 1; HOUSE.rumour++; HOUSE.with = null;
  await SCENE.prepare('lantern'); SCENE.enter('lantern', { x: 8.6, face: -1 }); R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame();
  SCENE.caption('Later', 'The common room has thinned. The fire hasn’t.'); GAME.save();
  await NIGHT.fade(false); if (NIGHT.resolve) NIGHT.resolve();
};
