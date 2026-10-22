/* THE QUEEN'S GARDEN — a terrace on the inner bailey, an hour after the rain, the sun low in the west (right).
   Left to right: the cloister arcade (a door back into the castle) · the rose arbour and Halina's bench
   · the old king's memorial against the open sky · the swan fountain, Kazik and his crows
   · Zofia hacking at a practice post · the old apple tree · the oak gate to the training yard.
   Over the balustrade: the lower bailey's roofs, the chapel spire, the curtain wall and its towers, the sky. */
const GARDEN = SCENE.addRoom(new Room('garden', { X0: -14, X1: 14, CEIL: 40, KZ: 3.0, cam: { y: 3.0, look: 2.7, dist: 19.4, fov: 19 }, exposure: 1.0, reflK: 0.32, far: 320,
  fog: [0xd8c4a8, 0.0055], music: 'garden', ambience: { birds: 0.6, fountain: 0.75, wind: 0.2 }, acoustics: { size: 1.0, wet: 0.08 }, surface: 'gravel',
  caption: ["The Queen's Garden", 'An hour after the rain'] }));
GARDEN.LINES = {
  memorial: ['Bolesław the Steadfast. Nineteen days at the gate.', 'Somebody keeps leaving fresh flowers. Nobody admits to it.', 'The inscription says he never broke his word. The inscription was my idea.'],
  fountain: ['The swan has been spitting at the sky for a hundred years. It has not won yet.', 'Mother wished on this fountain for a son. She never said what she thought of the result.'],
  apple: ['The last apples. Kazik climbs for them when nobody is looking. Everybody is looking.', 'Planted the year I was born. It has outgrown me in every way.'],
  view: ['The whole of the inner bailey: smoke from the kitchens, washing on the lines, a guard asleep on the north wall.', 'From up here it looks like a kingdom that has never had a bad week.'],
  gate: ['The training yard. Listen to them.'],
};
GARDEN.TALK = {
  queen: { first: [['king', 'Halina.'], ['queen', 'You found the one dry hour of the week. Sit, before it rains again.'], ['queen', 'Jarek has written. Twice. The River League would like to be friends, at a price.'],
      ['king', 'Everything is at a price with your brother.'], ['queen', 'Everything is at a price with everyone, love. Jarek just writes it down.'], ['queen', 'Go and watch your daughter. She has been murdering that post since noon.']],
    more: ['The League wants an answer before the river rises. It will rise.', 'Kazik talks to those crows as if they answer. Tell me they don’t answer.', 'You flinched when the rain started. You always do.'] },
  zofia: { first: [['zofia', 'Father! Watch: high guard, then the cut Ser Bogdan won’t teach me.'], ['king', 'He won’t teach you because your mother asked him not to.'],
      ['zofia', 'Then you teach me. You’re the king. You outrank Mother.'], ['king', 'No one outranks your mother.']],
    more: ['When I’m a knight I’ll have a real sword. And a horse. And a better post.', 'This post is the Margrave. I’ve killed him eleven times today.', 'The squires laugh. They won’t when I’m bigger.'] },
  kazik: { first: [['kazik', 'Shh. You’ll scare them.'], ['king', 'Feeding the crows again?'], ['kazik', 'They like the crusts. The big one doesn’t eat. She just watches.'],
      ['kazik', 'She says she’s coming when it rains.'], ['king', '…Who says?'], ['kazik', 'The big crow. Weren’t you listening?']],
    more: ['This one’s called Pan Kowal. He steals.', 'It rained less today. The crows don’t like that.', 'Grandfather’s statue has a crow on its head most mornings. I think it’s the same one.'] },
};
GARDEN.met = {};
GARDEN.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, KZ = room.KZ, L = room.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle('g' + k, L[k]));
  const stone = { col: 0xf0e0c8 };   // the throne room's ashlar, warmed by the low sun
  /* the ground: wet lawn (mirror-bright in the puddles), a gravel walk, flagstones round the fountain */
  room.floorMat = BUILD.reflective(T.lawn, { k: 0.7, rough: 0.6 }); BUILD.plane('y+', X0 - 4, X1 + 4, -0.6, 12, 0, T.lawn, { mat: room.floorMat, layer: 2 });
  BUILD.rug(T.gravel, X0 - 2, X1 + 2, KZ - 0.75, KZ + 0.8, { ru: (X1 - X0 + 4), rv: 1.55 });
  BUILD.rug(T.flags, 0.7, 5.7, 0.05, KZ - 0.75, { ru: 2.5, rv: (KZ - 0.8) / 2, y: 0.001 });
  /* the cloister arcade (x −14 … −6.5): three bays, a shadowed walk behind with a lantern and the door into the castle */
  const A0 = -14, BAY = 2.5;
  for (let i = 0; i < 3; i++) BUILD.card(T.arcade, A0 + BAY * (i + 0.5), 0, 0.0, { w: BAY, h: 5.0, cast: true, col: 0xf4e8d4 });
  for (let i = 0; i <= 3; i++) { const x = A0 + BAY * i; BUILD.cyl(x, 0.05, 0.22, 2.55, 0.15, T.ashlar, Object.assign({ seg: 12 }, stone)); BUILD.box(x - 0.24, x + 0.24, 0, 0.22, -0.2, 0.3, T.ashlar, stone); BUILD.box(x - 0.26, x + 0.26, 2.55, 2.72, -0.22, 0.32, T.ashlar, stone); }
  BUILD.box(A0, A0 + BAY * 3, 5.0, 5.25, -0.15, 0.25, T.ashlar, stone);
  BUILD.roof(A0, A0 + BAY * 3, -2.8, 0.2, 5.2, 1.4, T.roofTile, { over: 0.3 });
  BUILD.plane('z', A0, A0 + BAY * 3, 0, 5.2, -2.6, T.plaster); BUILD.plane('y+', A0, A0 + BAY * 3, -2.6, 0, 0.004, T.flags);
  BUILD.plane('y-', A0, A0 + BAY * 3, -2.6, 0, 3.9, T.ceiling); for (let x = A0 + 0.6; x < A0 + BAY * 3; x += 1.25) BUILD.box(x - 0.08, x + 0.08, 3.72, 3.9, -2.6, 0, T.beam, { cast: false });
  BUILD.card(T.door, A0 + BAY * 0.5, 0, -2.57, { cast: false, s: 0.9 });
  room.interact('door', A0 + BAY * 0.5, 2.6, KZ, 0.9, () => MAP.open()).label = 'Into the castle (the map)';
  BUILD.card(T.topiary, A0 + BAY * 1.5, 0, -2.0, { s: 0.95 }); BUILD.card(T.urn, A0 + BAY * 2.5, 0, -2.1);
  { const lx = A0 + BAY * 1.5; BUILD.box(lx - 0.01, lx + 0.01, 3.0, 3.9, -1.31, -1.29, null, { col: 0x2a2622, cast: false }); BUILD.card(T.lantern, lx, 2.45, -1.3, { cast: false }); BUILD.glow(lx, 2.7, -1.25, 1.2, 0xffb060, 0.5);
    room.lights.lantern = BUILD.light(new THREE.PointLight(0xffb060, 3.5, 0, 2), lx, 2.6, -1.0, { flicker: 5.2 }); }
  for (const x of [A0 + BAY * 0.5, A0 + BAY * 1.5, A0 + BAY * 2.5]) BUILD.shaft(x + 0.6, 3.6, 0.2, 1.1, 4.2, 0.12, [-0.35, 0, -0.55], 0xffd8a0);
  /* the rose arbour over Halina's bench (x −6 … −3) */
  const AB0 = -6.0, AB1 = -3.0, AZ0 = 0.55, AZ1 = 2.05;
  for (const x of [AB0, AB1]) for (const z of [AZ0, AZ1]) BUILD.box(x - 0.07, x + 0.07, 0, 2.95, z - 0.07, z + 0.07, T.woodPost);
  for (const z of [AZ0, AZ1]) BUILD.box(AB0 - 0.3, AB1 + 0.3, 2.85, 2.98, z - 0.06, z + 0.06, T.woodPost);
  for (let x = AB0 - 0.15; x <= AB1 + 0.2; x += 0.45) BUILD.box(x - 0.04, x + 0.04, 2.98, 3.06, AZ0 - 0.3, AZ1 + 0.3, T.woodPost, { cast: true });
  for (const x of [AB0, AB1]) { BUILD.card(T.climbRose, x, 0, AZ1 + 0.09, { s: 0.88 }); BUILD.card(T.climbRose, x, 0, AZ0 + 0.09, { s: 0.88 }); }
  BUILD.card(T.roseSwag, (AB0 + AB1) / 2, 2.3, AZ1 + 0.1, { w: 3.4, h: 1.06 }); BUILD.card(T.roseSwag, (AB0 + AB1) / 2, 2.35, AZ0 + 0.1, { w: 3.4, h: 1.06 });
  BUILD.box(-5.35, -3.65, 0, 0.47, 0.95, 1.38, T.ashlar, Object.assign({ front: BUILD.std(T.benchStone, { rough: 0.8 }) }, stone));
  BUILD.card(T.letters, -3.85, 0.47, 1.22, { cast: false }); BUILD.card(T.lavender, -4.5, 0, 0.4, { s: 0.95 });
  /* the balustrade: the terrace's edge, open to the view (x −6.5 … 8.5) */
  const B0 = -6.5, B1 = 8.5;
  BUILD.box(B0, B1, 0, 0.16, -0.32, 0.02, T.ashlar, stone); BUILD.box(B0 - 0.05, B1 + 0.05, 0.96, 1.1, -0.36, 0.06, T.ashlar, stone);
  for (let x = B0 + 0.2; x < B1; x += 0.3) BUILD.cyl(x, -0.15, 0.16, 0.96, 0.07, T.ashlar, Object.assign({ seg: 8, top: 0.75 }, stone));
  for (const x of [B0 + 0.1, 1.0, B1 - 0.1]) BUILD.box(x - 0.2, x + 0.2, 0, 1.18, -0.38, 0.08, T.ashlar, stone);
  for (const x of [1.0]) BUILD.card(T.urn, x, 1.18, -0.15, { s: 0.85 });
  room.interact('view', 6.6, 3.0, KZ, 0.8, () => say('view'));
  /* the old king's memorial, against the open sky, with a wreath and candles */
  BUILD.card(T.memorial, -1.6, 0, 0.7, { s: 1.22 }); BUILD.card(T.wreath, -1.6, 0.5, 1.02, { s: 0.85, cast: false });
  BUILD.card(T.candles, -2.15, 0, 1.0, { s: 0.75 }); for (const [dx, y] of [[-0.12, 0.3], [0, 0.36], [0.1, 0.27]]) BUILD.flame(-2.15 + dx, y, 1.01, 0.28);
  BUILD.glow(-2.15, 0.45, 1.05, 0.7, 0xffa050, 0.4); BUILD.light(new THREE.PointLight(0xffa050, 0.9, 0, 2), -2.1, 0.6, 1.3, { flicker: 9.5 });
  BUILD.card(T.mums, -0.6, 0, 0.7, { s: 0.9 }); BUILD.card(T.asters, -2.9, 0, 0.55, { s: 0.85 });
  room.interact('memorial', -1.6, 3.4, KZ, 0.8, () => say('memorial'));
  /* the swan fountain: an eight-sided basin, a column, a bowl, the swan spouting into the basin */
  const FX = 3.2, FZ = 1.0, FR = 1.75;
  BUILD.cyl(FX, FZ, 0, 0.55, FR, T.ashlar, Object.assign({ seg: 8, open: true }, stone));
  BUILD.cyl(FX, FZ, 0.1, 0.55, FR - 0.2, T.ashlar, { seg: 8, open: true, mat: BUILD.std(T.ashlar, { col: 0xb8a890, side: THREE.BackSide }) });
  { const g = new THREE.RingGeometry(FR - 0.22, FR + 0.04, 8, 1); g.rotateX(-Math.PI / 2); g.translate(FX, 0.56, FZ); BUILD.planarUV(g, T.ashlar); BUILD.add(new THREE.Mesh(g, BUILD.std(T.ashlar, stone))); }
  room.pool = BUILD.pool(T.water, FX, 0.46, FZ, FR - 0.21, { seg: 8, rate: 5, glow: 0.35 });
  BUILD.cyl(FX, FZ, 0.46, 1.62, 0.2, T.ashlar, Object.assign({ seg: 10 }, stone)); BUILD.cyl(FX, FZ, 1.6, 1.95, 0.3, T.ashlar, Object.assign({ seg: 10, top: 2.6 }, stone));
  BUILD.pool(T.water, FX, 1.955, FZ, 0.74, { seg: 10, rate: 7, glow: 0.35 });
  BUILD.card(T.swan, FX + 0.35, 1.95, FZ, { s: 1.0 });
  { const j = BUILD.water(T.jet, FX - 0.81, 0.5, FZ + 0.02, { s: 2.2, rate: 11, k: 1.25 }); j.scale.x = -1; }   // from the beak, arcing into the basin
  room.interact('fountain', FX, 3.0, KZ, 1.0, () => say('fountain'));
  /* Kazik's crows: on the rim and the flagstones. They take off when the king walks through them. */
  room.crows = BUILD.critters(T.crowGround, [[FX - 1.1, 0.56, FZ + 1.42, 1.3], [FX + 0.9, 0.56, FZ + 1.5, 1.3], [FX - 0.4, 0.56, FZ - 1.5, 1.9], [FX + 2.3, 0, KZ + 0.4, 1.3], [FX - 2.2, 0, KZ + 0.6, 1.3], [FX + 1.2, 0, KZ - 0.3, 1.2]], { shy: 1.5, sound: 'whoosh' });
  /* flower beds along the balustrade, edged in clipped box */
  for (const [x0, x1] of [[5.2, 8.3]]) { BUILD.box(x0, x1, 0, 0.32, 0.1, 0.22, T.hedgeBox); BUILD.box(x0, x1, 0, 0.32, 0.95, 1.07, T.hedgeBox); }
  BUILD.card(T.roseBush, 6.0, 0, 0.6, { s: 0.85 }); BUILD.card(T.foxglove, 7.4, 0, 0.45, { s: 0.9 }); BUILD.card(T.asters, 7.6, 0, 0.75, { s: 0.75 }); BUILD.card(T.mums, 0.3, 0, 0.55, { s: 0.8 });
  /* Zofia's practice post, the apple tree, the garden wall and the gate to the yard (x 8.5 … 14) */
  BUILD.card(T.pell, 8.1, 0, 1.55, { s: 0.95 });
  BUILD.box(B1, X1 + 2, 0, 4.1, -0.6, 0, T.ashlar, stone); BUILD.box(B1 - 0.05, X1 + 2, 4.1, 4.32, -0.7, 0.1, T.ashlar, stone);
  BUILD.card(T.ivyWall, 9.2, 0, 0.02, { cast: false, s: 0.95 });
  BUILD.card(T.gardenGate, 13.0, 0, 0.03, { cast: false });
  room.interact('gate', 13.0, 3.6, KZ, 0.9, () => { SCENE.lock++; SCENE.say(SCENE.player, L.gate[0]).then(() => { SCENE.lock--; GAME.save(); SCENE.go('yard', { x: -11.6, face: 1 }); }); });
  BUILD.windCard(T.appleTree, 10.4, 0, 0.95, 'sway', 0.035, { s: 1.0 });
  BUILD.card(T.basket, 9.5, 0, 1.75); BUILD.card(T.ladder, 11.3, 0, 1.25, { s: 0.6, rx: -0.18 }); BUILD.card(T.can, 11.8, 0, 2.0);
  room.interact('apple', 10.4, 3.2, KZ, 0.8, () => say('apple'));
  BUILD.leaves({ n: 18, box: [8.6, 12.4, 0.2, 4.6, 0.6, 2.4], tex: T.leafFrames, speed: 0.45, wind: -0.15 });
  /* the near side: clipped hedges, a cypress, pots and an urn close to the lens for the depth of field */
  for (const [x0, x1] of [[X0 - 2, -10.4], [7.2, 11.6]]) { BUILD.box(x0, x1, 0, 0.45, 7.4, 7.9, T.hedgeBox, { cast: false }); }
  BUILD.card(T.topiary, -9.9, 0, 7.6, { s: 1.0, cast: false }); BUILD.card(T.topiary, 12.2, 0, 7.4, { s: 1.0, cast: false });
  BUILD.windCard(T.cypress, -12.4, 0, 7.6, 'sway', 0.03, { s: 1.15, cast: false }); BUILD.card(T.urn, 12.6, 0, 6.6, { s: 1.2, cast: false });
  BUILD.flock(T.butterfly, [[6.6, 1.0, 1.0, 0.8, 0.3, 1.4], [-4.0, 1.4, 1.6, 0.9, 0.4, -1.2], [0.3, 0.9, 1.0, 0.6, 0.25, 1.7]], { s: 1.0, k: 1.3 });
  /* the view over the balustrade: the lower bailey a storey down, roofs and trees, the chapel, the curtain wall, the sky */
  GARDEN.backdrop(room);
  /* light: the low sun from the west with long shadows, the sky's blue fill, warmth bounced off the stone */
  BUILD.light(new THREE.HemisphereLight(0x9ab4dc, 0x6a5434, 1.25), 0, 20, 0);
  room.sun = BUILD.shadow(BUILD.light(new THREE.DirectionalLight(0xffc888, 3.4), 32, 12, 16), R.q === 'low' ? 1024 : 2048); room.sun.target.position.set(0, 0, 0);
  Object.assign(room.sun.shadow.camera, { left: -22, right: 22, top: 14, bottom: -14, near: 1, far: 90 }); room.sun.shadow.camera.updateProjectionMatrix(); room.sun.shadow.bias = -0.0008;
  const fill = BUILD.light(new THREE.DirectionalLight(0x8aa0d0, 0.45), -14, 8, 18); fill.target.position.set(0, 1, 0);
  room.rim = [18, 5, 6, 0.9, 60, 0xffc070, null]; room.shadowSrc = [26, 9, 10, 80]; room.keyK = 0.9;
  BUILD.motes({ n: 90, boxes: [[-14, -6.5, 0.4, 3.6, -2.4, 0.2, 0.4], [-6, 13, 0.4, 3.6, 0.5, 4, 0.4], [-12, 12, 0.4, 2.8, 5.4, 7.8, 0.2]], col: 0xffe0a0 });
  room.update(0, 0);
  return BUILD.end();
};
GARDEN.backdrop = function (room) {   // the terrace stands a full storey above the lower bailey: only its roofs show over the balustrade
  const T = PX.T, RP = RAMP, D = 10, y0 = -6.5, tile = { stone: PX.stoneTile(RP.stone, D, 501), inner: PX.stoneTile(RP.inner, D, 502), red: PX.tileRoof(RP.red, D, 503), slate: PX.tileRoof(RP.slate, D, 504) };
  const F = (ramp, tl, seed, more) => Object.assign({ ramp, d: D, seed, tile: tl }, more || {});
  BUILD.box(-6.5, 8.5, y0, 0, -0.9, -0.36, T.ashlar, { col: 0xd8c8b0 });   // the terrace's retaining wall
  BUILD.plane('y+', -120, 120, -200, -0.9, y0, T.turfPix);
  /* roofs of the lower bailey, ridges just over the balustrade, chimneys smoking */
  for (const [x0, x1, z0, z1, hh, rh, along, seed] of [[-9, -2, -26, -19, 6.6, 3.4, 0, 511], [0.5, 8, -32, -24, 7.2, 3.6, 0, 512], [10, 16, -24, -17, 6.2, 3.0, 1, 513], [-17, -11, -34, -26, 7.4, 3.6, 1, 514], [-2, 5, -44, -36, 8.4, 3.8, 0, 515], [17, 24, -40, -32, 7.8, 3.4, 0, 516]]) {
    const w = x1 - x0; BUILD.facade(x0, x1, y0, y0 + hh, z0, z1, F(RP.inner, tile.inner, seed, { win: [[w * 0.3, hh - 2.4, 'square', seed & 1], [w * 0.7, hh - 2.4, 'square', 0]], grime: 0.35 }));
    BUILD.roof(x0, x1, z0, z1, y0 + hh, rh, tile.red, { alongZ: !!along, gable: tile.inner, over: 0.4 });
    if (seed % 2) BUILD.box(x1 - 1.6, x1 - 0.9, y0 + hh + 1, y0 + hh + rh + 1.4, (z0 + z1) / 2 - 0.35, (z0 + z1) / 2 + 0.35, tile.inner); }
  for (const [x, z, s] of [[-13, -20, 2.4], [6, -17, 2.0], [13, -30, 2.6], [-6, -32, 2.2], [22, -24, 2.4]]) BUILD.windCard(T.pine, x, y0, z, 'sway', 0.02, { s, cast: false });
  /* the chapel spire, the keep's flank, the curtain wall and its towers */
  BUILD.facade(-26, -18, y0, y0 + 12, -56, -48, F(RP.inner, tile.inner, 521, { win: [[4, 6, 'rose', 1], [1.6, 3, 'tall', 0], [6.4, 3, 'tall', 0]] }));
  BUILD.roof(-26, -18, -56, -48, y0 + 12, 4.5, tile.slate, { alongZ: true, gable: tile.inner, over: 0.5 });
  BUILD.facade(-23.5, -20.5, y0, y0 + 21, -49, -46, F(RP.inner, tile.inner, 522, { win: [[1.5, 16, 'lancet', 0]] })); BUILD.coneRoof(-22, -47.5, y0 + 21, 2.2, 8, RP.slate, D, { seg: 8, seed: 523 });
  BUILD.facade(22, 34, y0, y0 + 30, -66, -54, F(RP.keep, PX.stoneTile(RP.keep, D, 524), 525, { bands: [9, 17], win: [[3, 9, 'tall', 0], [9, 9, 'tall', 1], [6, 15, 'lancet', 1], [3, 22, 'lancet', 0], [9, 22, 'lancet', 1]] }));
  BUILD.box(-90, 90, y0, y0 + 14, -86, -83, tile.stone); BUILD.crenels(-90, -82.7, 90, -82.7, y0 + 14, tile.stone, { w: 1.1, gap: 0.9, h: 1.3 });
  for (const [x, seed] of [[-50, 531], [-8, 532], [36, 533]]) { BUILD.tower(x, -82, y0, y0 + 19, 3.8, F(RP.stone, tile.stone, seed, { win: [[0, 14, 'slit'], [0, 8, 'slit']] })); BUILD.coneRoof(x, -82, y0 + 19, 4.4, 7.5, RP.red, D, { seed }); }
  /* beyond the walls: sunlit hills, a far ridge, the sky */
  BUILD.card(T.ridgeDay, 0, -8, -170, { w: 560, h: 46, basic: true, k: 1.0, cast: false });
  BUILD.sky(T.skyAfternoon, { z: -200, w: 520, h: 190, y: -40, k: 1.0 });
  BUILD.flock(T.crow, [[-8, 14, -40, 14, 2, 0.25], [6, 16, -50, 18, 3, -0.2], [20, 12, -45, 10, 2, 0.3]], { s: 2.2 });
};
GARDEN.onEnter = function () {
  if (!CUT.playing) SCENE.caption(...this.caption);
  const A = CAST.A, room = this, K = SCENE.player;
  if (!room.talkIts) {   // talking to the family: the markers ride along with whoever moves
    room.talkIts = {};
    for (const id of ['queen', 'zofia', 'kazik']) { const a = A[id];
      room.talkIts[id] = room.interact(id, a.x, (a.spec.headY || 2) + 0.7, room.KZ, 0.9, () => GARDEN.talk(id)); room.talkIts[id].label = 'Talk to ' + a.name; }
    SCENE.buildMarks(); }
};
GARDEN.talk = function (id) {
  const A = CAST.A, a = A[id], K = SCENE.player, T = GARDEN.TALK[id], who = (k) => (k === 'king' ? K : A[k]);
  K.faceTo(a.x); if (!a.sitting) { a.faceTo(K.x); a.lookYaw = Math.sign(K.x - a.x) * 0.8; }
  if (!GARDEN.met[id]) { GARDEN.met[id] = true; SCENE.talk(T.first.map(([k, t]) => [who(k), t])).then(() => { a.lookYaw = null; }); }
  else SCENE.say(a, SCENE.cycle('gt' + id, T.more)).then(() => { a.lookYaw = null; });
};
GARDEN.onUpdate = function () {
  const its = this.talkIts; if (!its) return;
  for (const id in its) { const a = CAST.A[id], it = its[id]; it.x = a.x; it.p.x = a.x; }
};
