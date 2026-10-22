/* THE TRAINING YARD — the outer bailey on a cold bright morning after rain; sun from the east (left).
   Left to right: the gate back to the garden · the armoury lean-to (shields, the castle door, sword rack, table,
   grindstone, a barrel of wooden swords) · the gambeson stand (one peg empty) and the trough · Ser Bogdan watching
   · the roped ring where Ser Jan and Ser Mikołaj spar · hay, and the stairs up to the wall-walk · Wojtek at the pell
   · the archery butts. Pennants on the wall-walk; the inner bailey's towers and the keep beyond. */
const YARD = SCENE.addRoom(new Room('yard', { X0: -13, X1: 13, CEIL: 40, KZ: 3.0, cam: { y: 3.0, look: 2.7, dist: 19.4, fov: 19 }, exposure: 1.0, reflK: 0.38, far: 320,
  fog: [0xb8c6d4, 0.0045], music: 'yard', ambience: { wind: 0.45, birds: 0.15, crowd: 0.08 }, acoustics: { size: 1.6, wet: 0.12 }, surface: 'sand',
  caption: ['The Training Yard', 'Morning drill'] }));
YARD.LINES = {
  armoury: ['Every blade numbered and oiled. Bogdan counts them on Sundays.', 'Practice swords on the left, real ones on the right. The squires mix them up exactly once.'],
  gambeson: ['One gambeson missing. A small one.', 'The small gambeson is back. With straw in it.'],
  trough: ['The horses drink here, and the squires, and on bad days Ser Jan.'],
  stairs: ['Up to the wall-walk. The view is better than the company.'],
  butts: ['Ser Jan put three in the gold yesterday and has not stopped mentioning it.', 'Somebody has drawn the Margrave’s face on the far butt. Nobody will say who.'],
  gate: ['Back to the garden.'],
};
YARD.TALK = {
  commander: { first: [['commander', 'Your Grace. Come to see whether my lads can still tell the pointy end from the handle?'], ['king', 'And can they?'],
      ['commander', 'Most days. Wojtek there swings like he’s threshing wheat, but he swings hard.'], ['commander', 'A word, Your Grace. Someone’s been borrowing a gambeson from the stand. A small one. It comes back with straw in it.'],
      ['king', '…I’ll speak to her.'], ['commander', 'I never said “her”, Your Grace.']],
    more: ['The Margrave’s grandson keeps three hundred horse at Hal. I’m only saying.', 'Rain’s no good for steel. Or men. Or horses. Or me.', 'Give me a war or give me a pay rise, Your Grace. Either will do.'] },
  knightA: { more: ['Ser Jan, Your Grace. He keeps his guard low. I keep winning.', 'Begging your pardon, Your Grace, he is about to lose again.'] },
  knightB: { more: ['Ser Mikołaj, Your Grace. Jan’s guard is high because he is tall, not because he is good.', 'Watch his left foot, Your Grace. Everybody else does.'] },
  recruit: { more: ['Wojtek, Your Grace! I’m going to be a knight!', 'The post is winning, Your Grace. But not by much.', 'Ser Bogdan says I’ve got the arms for it. He didn’t say what else.'] },
};
YARD.met = {};
YARD.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, KZ = room.KZ, L = room.LINES, WH = 3.4;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle('y' + k, L[k]));
  const grey = { col: 0xdcd8d0 };   // wet dark stone (the title fortress's), lifted a touch by the morning
  /* the ground: packed sand with puddles (they hold the sky), a darker trodden ring */
  room.floorMat = BUILD.reflective(T.sand, { k: 0.85, rough: 0.55 }); BUILD.plane('y+', X0 - 4, X1 + 4, -1, 12, 0, T.sand, { mat: room.floorMat, layer: 2 });
  /* the inner curtain wall at the back: wet grey stone, a wall-walk, merlons against the sky */
  BUILD.box(X0 - 3, X1 + 3, 0.45, WH, -1.2, 0, T.stoneWet, grey); BUILD.box(X0 - 3, X1 + 3, 0, 0.45, -1.2, 0.12, T.stoneDark, { col: 0x8a847c });   // wall on a dark plinth
  BUILD.box(X0 - 3, X1 + 3, WH - 0.12, WH + 0.16, -1.3, 0.2, T.ashlar, { col: 0xb8b4ac });   // a pale cornice…
  for (let x = X0 - 2.8; x < X1 + 3; x += 0.8) BUILD.box(x - 0.11, x + 0.11, WH - 0.4, WH - 0.12, 0, 0.16, T.ashlar, { col: 0xa8a49c, cast: false });   // …on corbels
  BUILD.crenels(X0 - 3, -0.05, X1 + 3, -0.05, WH + 0.16, T.stoneWet, { w: 0.7, gap: 0.55, h: 0.85, t: 0.4 });
  for (const x of [-5.6, 0.9, 6.6]) { BUILD.box(x - 0.32, x + 0.32, 0, WH - 0.4, 0, 0.42, T.stoneWet, Object.assign({ taper: [1, 0.5] }, grey)); BUILD.box(x - 0.36, x + 0.36, 0, 0.5, 0, 0.5, T.stoneDark, { col: 0x8a847c }); }   // buttresses
  /* ivy: pouring over the battlements, climbing the buttresses and the corners */
  for (const [x, s] of [[-12.6, 0.9], [-4.4, 1.0], [-0.9, 0.8], [3.4, 1.05], [8.2, 0.85], [12.2, 1.0]]) BUILD.card(T.ivyDrape, x, WH + 0.2 - 2.0 * s, 0.22, { cast: false, s });
  for (const [x, s] of [[-5.6, 0.95], [0.9, 0.85], [6.6, 0.9], [-12.9, 0.9], [11.6, 0.75]]) BUILD.card(T.ivyClimb, x, 0, 0.46, { cast: false, s });
  /* ornament: torch brackets (cold this morning), tethering rings, the drill roster */
  for (const x of [-4.9, 1.6, 5.9, 10.9]) BUILD.card(T.torchCold, x, 1.7, 0.04, { cast: false });
  for (const x of [-2.4, -1.6, 7.3]) BUILD.card(T.ringIron, x, 1.05, 0.04, { cast: false });
  BUILD.card(T.roster, -2.05, 1.25, 0.04, { cast: false });
  for (const x of [-4.2, 4.6]) { BUILD.box(x - 0.05, x + 0.05, WH, WH + 3.2, -0.65, -0.55, T.woodPost, { cast: false }); BUILD.windCard(x < 0 ? T.pennantRed : T.pennantBlue, x + 1.32, WH + 2.3, -0.6, 'wave', 0.14, { cast: false }); }
  BUILD.card(T.banner, 2.4, 0.55, 0.05, { cast: false, s: 0.6 }); for (const x of [-0.05, 4.85]) BUILD.card(T.bannerBlue, x, 0.9, 0.05, { cast: false, s: 0.55 });   // the royal banner behind the ring
  /* the gate back to the garden */
  BUILD.card(T.gardenGate, -12.3, 0, 0.03, { cast: false, s: 0.95 }); BUILD.card(T.crestStone, -12.3, 3.35 - 1.5, 0.05, { cast: false, s: 0.95 });
  room.interact('gate', -12.3, 3.5, KZ, 0.9, () => { SCENE.lock++; SCENE.say(SCENE.player, L.gate[0]).then(() => { SCENE.lock--; GAME.save(); SCENE.go('garden', { x: 12.2, face: -1 }); }); });
  /* the armoury lean-to: posts, a shingled roof sloping off the wall, everything a garrison needs within reach */
  const AR0 = -11.4, AR1 = -6.0;
  for (const x of [AR0, AR1, (AR0 + AR1) / 2]) BUILD.box(x - 0.09, x + 0.09, 0, 2.7, 2.3, 2.48, T.woodPost);
  BUILD.box(AR0 - 0.2, AR1 + 0.2, 2.6, 2.76, 2.25, 2.52, T.woodPost);
  for (const x of [AR0, AR1, (AR0 + AR1) / 2]) 
  { const g = new THREE.PlaneGeometry(AR1 - AR0 + 0.6, Math.hypot(2.7, WH + 0.25 - 2.76)); g.rotateX(-Math.PI / 2 + Math.atan2(WH + 0.25 - 2.76, 2.7)); g.translate((AR0 + AR1) / 2, (2.76 + WH + 0.25) / 2 + 0.06, 1.3);
    BUILD.planarUV(g, T.shingles); BUILD.add(new THREE.Mesh(g, BUILD.std(T.shingles, { side: THREE.DoubleSide }))); }
  BUILD.card(T.shieldBoard, -10.2, 1.45, 0.04, { cast: false });
  BUILD.card(T.door, -8.4, 0, 0.03, { cast: false, s: 0.88 });
  room.interact('door', -8.4, 2.6, KZ, 0.7, () => MAP.open()).label = 'Into the castle (the map)';
  BUILD.card(T.swordRack, -6.95, 0, 0.35, { s: 1.0 });
  BUILD.card(T.helmTable, -9.6, 0, 1.4, { s: 1.0 }); BUILD.card(T.grindstone, -11.0, 0, 1.75); BUILD.card(T.practiceBarrel, -6.3, 0, 1.75);
  for (const x of [-10.0, -7.4]) { BUILD.card(T.lantern, x, 1.95, 2.1, { cast: false, s: 0.85 }); BUILD.glow(x, 2.18, 2.15, 1.0, 0xffb060, 0.5); BUILD.light(new THREE.PointLight(0xffb060, 2.2, 0, 2), x, 2.2, 2.4, { flicker: 5.5 + x * 0.1 }); }
  BUILD.card(T.crate, -11.9, 0, 2.6, { s: 0.9 }); BUILD.card(T.crate, -11.7, 0.8, 2.55, { s: 0.75 }); BUILD.card(T.sacks, -5.6, 0, 2.3, { s: 0.9 });
  BUILD.card(T.halberds, -11.2, 0, 0.18, { s: 0.85 });
  room.interact('armoury', -8.8, 3.3, KZ, 1.6, () => say('armoury'));
  /* the gambeson stand, the trough */
  BUILD.card(T.gambesons, -5.1, 0, 0.55, { s: 0.95 });
  room.interact('gambeson', -5.1, 2.8, KZ, 0.6, () => say('gambeson'));
  BUILD.box(-4.6, -3.1, 0, 0.55, 0.5, 1.05, T.woodDark); { const g = new THREE.PlaneGeometry(1.4, 0.45); g.rotateX(-Math.PI / 2); g.translate(-3.85, 0.5, 0.775); BUILD.add(new THREE.Mesh(g, BUILD.std(null, { col: 0x3a5068, rough: 0.1, metal: 0.2 })), { cast: false }); }
  room.interact('trough', -3.85, 1.6, KZ, 0, () => say('trough')).hidden = true;
  /* the sparring ring: four posts, ropes on three sides (the near side left open for the view) */
  const RG0 = -1.6, RG1 = 6.4, RZ0 = 0.7, RZ1 = 2.55;
  BUILD.rug(T.sand, RG0, RG1, RZ0, RZ1 + 0.6, { ru: 8, rv: 2.4, y: 0.002 }).material.color = new THREE.Color(0xc8b8a0);
  for (const x of [RG0, RG1]) for (const z of [RZ0, RZ1]) BUILD.box(x - 0.06, x + 0.06, 0, 1.15, z - 0.06, z + 0.06, T.woodPost);
  BUILD.card(T.rope, (RG0 + RG1) / 2, 0.75, RZ0, { w: RG1 - RG0, h: 0.25, ru: 6, cast: false }); BUILD.card(T.rope, (RG0 + RG1) / 2, 0.38, RZ0, { w: RG1 - RG0, h: 0.25, ru: 6, cast: false });
  for (const x of [RG0, RG1]) { BUILD.card(T.rope, x, 0.75, (RZ0 + RZ1) / 2, { w: RZ1 - RZ0, h: 0.25, ry: Math.PI / 2, cast: false }); BUILD.card(T.rope, x, 0.38, (RZ0 + RZ1) / 2, { w: RZ1 - RZ0, h: 0.25, ry: Math.PI / 2, cast: false }); }
  /* hay, and the stairs up to the wall-walk (a solid stone flight against the wall) */
  BUILD.card(T.hay, 7.0, 0, 0.45, { s: 0.95 }); BUILD.card(T.bucket, 6.9, 0, 1.35); BUILD.card(T.bucket, 7.2, 0, 1.55); BUILD.card(T.crate, 11.4, 0, 2.2, { s: 0.85 }); BUILD.card(T.barrel, 12.6, 0, 1.9, { s: 0.9 });
  { const S0 = 7.7, S1 = 10.5, n = 12, run = (S1 - S0) / n, ang = Math.atan2(WH, S1 - S0), len = Math.hypot(S1 - S0, WH);   // a timber stair: two stringers, treads, a rail, a landing at the top
    for (let i = 0; i < n; i++) { const x = S0 + run * i, y = WH * (i + 1) / n; BUILD.box(x - 0.02, x + run + 0.02, y - 0.07, y, 0.06, 0.94, T.woodRed); BUILD.box(x - 0.01, x + 0.02, y - WH / n, y - 0.07, 0.1, 0.9, T.woodDark, { cast: false }); }
    for (const z of [0.02, 0.98]) { const g = new THREE.BoxGeometry(len + 0.3, 0.26, 0.08); g.rotateZ(ang); g.translate((S0 + S1) / 2, WH / 2 - 0.08, z); BUILD.planarUV(g, T.woodPost); BUILD.add(new THREE.Mesh(g, BUILD.std(T.woodPost))); }
    { const g = new THREE.BoxGeometry(len + 0.2, 0.07, 0.07); g.rotateZ(ang); g.translate((S0 + S1) / 2, WH / 2 + 0.92, 1.0); BUILD.planarUV(g, T.woodPost); BUILD.add(new THREE.Mesh(g, BUILD.std(T.woodPost)), { cast: false }); }
    for (let i = 0; i <= 3; i++) { const x = S0 + (S1 - S0) * i / 3, y = WH * i / 3; BUILD.box(x - 0.04, x + 0.04, y, y + 0.92, 0.96, 1.04, T.woodPost, { cast: false }); }
    BUILD.box(S1, S1 + 1.3, WH - 0.1, WH, -0.2, 1.0, T.woodRed); for (const x of [S1 + 0.05, S1 + 1.25]) BUILD.box(x - 0.08, x + 0.08, 0, WH - 0.1, 0.84, 1.0, T.woodPost);
    room.interact('stairs', (S0 + S1) / 2, 2.6, KZ, 0.6, () => say('stairs')); }
  /* Wojtek's pell and the archery butts */
  BUILD.card(T.pell, 9.65, 0, 1.9, { s: 1.0 });
  BUILD.card(T.butt, 12.05, 0, 1.15, { s: 0.95 }); BUILD.card(T.butt, 12.95, 0, 0.7, { s: 0.85 });
  room.interact('butts', 12.3, 2.6, KZ, 0.6, () => say('butts'));
  /* the near side: a fence, spears, barrels and a cart wheel close to the lens */
  for (const [x0, x1] of [[X0 - 3, -3.2], [5.6, X1 + 3]]) { BUILD.box(x0, x1, 0.62, 0.72, 7.3, 7.38, T.woodPost, { cast: false }); BUILD.box(x0, x1, 0.25, 0.33, 7.3, 7.38, T.woodPost, { cast: false });
    for (let x = x0 + 0.4; x < x1; x += 2.2) BUILD.box(x - 0.06, x + 0.06, 0, 0.92, 7.28, 7.4, T.woodPost, { cast: false }); }
  BUILD.card(T.halberds, -12.6, 0, 7.6, { s: 1.0, cast: false }); BUILD.card(T.barrel, 8.6, 0, 7.1, { s: 1.1, cast: false }); BUILD.card(T.barrel, 9.3, 0, 7.5, { s: 1.1, cast: false });
  BUILD.card(T.cartWheel, 11.6, 0, 7.4, { s: 1.1, cast: false, rx: -0.12 });
  /* beyond the wall: the inner bailey's towers, roofs, the keep, the morning sky */
  YARD.backdrop(room);
  /* light: a low cold sun from the east, a blue sky fill, shadows thrown to the right */
  BUILD.light(new THREE.HemisphereLight(0xa8c4ec, 0x6a5a48, 1.35), 0, 20, 0);
  room.sun = BUILD.shadow(BUILD.light(new THREE.DirectionalLight(0xfff0dc, 3.0), -28, 14, 16), R.q === 'low' ? 1024 : 2048); room.sun.target.position.set(0, 0, 0);
  Object.assign(room.sun.shadow.camera, { left: -22, right: 22, top: 14, bottom: -14, near: 1, far: 90 }); room.sun.shadow.camera.updateProjectionMatrix(); room.sun.shadow.bias = -0.0008;
  const fill = BUILD.light(new THREE.DirectionalLight(0xc8b8a0, 0.4), 16, 6, 18); fill.target.position.set(0, 1, 0);
  room.rim = [-18, 6, 4, 0.7, 60, 0xfff0d0, null]; room.shadowSrc = [-26, 10, 10, 80]; room.keyK = 0.95;
  BUILD.motes({ n: 50, boxes: [[-12, 12, 0.3, 2.8, 0.5, 4, 1]], col: 0xfff0d8 });
  room.update(0, 0);
  return BUILD.end();
};
YARD.backdrop = function (room) {
  const T = PX.T, RP = RAMP, D = 12, tile = { stone: PX.stoneTile(RP.stone, D, 701), inner: PX.stoneTile(RP.inner, D, 702), keep: PX.stoneTile(RP.keep, D, 703), red: PX.tileRoof(RP.red, D, 704), slate: PX.tileRoof(RP.slate, D, 705) };
  const F = (ramp, tl, seed, more) => Object.assign({ ramp, d: D, seed, tile: tl }, more || {});
  BUILD.plane('y+', -120, 120, -200, -1.2, 0, T.turfPix);
  /* low roofs just over the wall, a drum tower framing the left, the keep framing the right, open sky over the ring */
  for (const [x0, x1, z0, z1, hh, rh, along, seed] of [[-9, -3, -20, -14, 6.5, 3.0, 0, 711], [-1, 6, -26, -19, 7, 3.2, 1, 712], [8, 14, -22, -16, 6.2, 2.8, 0, 713], [-18, -12, -26, -20, 7, 3, 1, 714]]) {
    const w = x1 - x0; BUILD.facade(x0, x1, 0, hh, z0, z1, F(RP.inner, tile.inner, seed, { win: [[w * 0.3, hh - 2.4, 'square', 0], [w * 0.7, hh - 2.4, 'square', 0]], grime: 0.3 }));
    BUILD.roof(x0, x1, z0, z1, hh, rh, tile.red, { alongZ: !!along, gable: tile.inner, over: 0.4 }); }
  BUILD.tower(-17, -30, 0, 15, 3.6, F(RP.stone, tile.stone, 721, { win: [[0.3, 11, 'lancet', 0], [0.3, 6, 'slit']], bands: [13] })); BUILD.coneRoof(-17, -30, 15, 4.2, 7.5, RP.red, D, { seed: 722 });
  const kx0 = 16, kx1 = 27, kz0 = -52, kz1 = -42;
  BUILD.facade(kx0, kx1, 0, 30, kz0, kz1, F(RP.keep, tile.keep, 731, { bands: [10, 20], win: [[2.5, 6, 'tall', 0], [8.5, 6, 'tall', 0], [5.5, 14, 'lancet', 0], [2.5, 23, 'lancet', 0], [8.5, 23, 'lancet', 0]] }));
  BUILD.box(kx0 - 0.4, kx1 + 0.4, 28.8, 30.6, kz0 - 0.4, kz1 + 0.4, tile.keep); BUILD.crenels(kx0 - 0.2, kz1 + 0.15, kx1 + 0.2, kz1 + 0.15, 30.6, tile.keep);
  BUILD.coneRoof((kx0 + kx1) / 2, (kz0 + kz1) / 2, 30.6, 7.6, 10, RP.slate, D, { seg: 4, seed: 734 });
  BUILD.tower(6, -60, 0, 14, 3.2, F(RP.stone, tile.stone, 741, { win: [[0, 10, 'slit']] })); BUILD.coneRoof(6, -60, 14, 3.8, 7, RP.red, D, { seed: 742 });
  for (const [x, z, s] of [[-6, -26, 2.4], [11, -30, 2.6], [-11, -34, 2.8], [2, -36, 2.2]]) BUILD.windCard(T.pine, x, 0, z, 'sway', 0.02, { s, cast: false });
  BUILD.sky(T.skyMorning, { z: -200, w: 520, h: 190, y: -40, k: 1.0 });
  BUILD.flock(T.crow, [[-10, 16, -30, 10, 2, 0.3], [12, 20, -40, 14, 3, -0.25]], { s: 2.0 });
};
YARD.onEnter = function () {
  if (!CUT.playing) SCENE.caption(...this.caption);
  const A = CAST.A, room = this;
  if (!room.talkIts) {
    room.talkIts = {};
    for (const id of ['commander', 'knightA', 'knightB', 'recruit']) { const a = A[id];
      room.talkIts[id] = room.interact(id, a.x, (a.spec.headY || 2) + 0.6, room.KZ, 0.8, () => YARD.talk(id)); room.talkIts[id].label = 'Talk to ' + a.name; }
    SCENE.buildMarks(); }
  A.commander.lookYaw = 0.9; YARD.bout = { next: 1.2, att: 0, q: [] };
};
YARD.talk = function (id) {
  const A = CAST.A, a = A[id], K = SCENE.player, T = YARD.TALK[id], who = (k) => (k === 'king' ? K : A[k]);
  K.faceTo(a.x); a.faceTo(K.x); a.lookYaw = Math.sign(K.x - a.x) * 0.8; a.actClip = null;
  const done = () => { a.lookYaw = id === 'commander' ? 0.9 : null; };
  if (T.first && !YARD.met[id]) { YARD.met[id] = true; SCENE.talk(T.first.map(([k, t]) => [who(k), t])).then(done); }
  else SCENE.say(a, SCENE.cycle('yt' + id, T.more)).then(done);
};
/* the bout: the two knights take turns, the attacker runs a combo (or one heavy cut), the other blocks in time,
   steel rings on every hit. Timed in game seconds, so pausing the game pauses the fight. */
YARD.onUpdate = function (dt) {
  const A = CAST.A, a = A.knightA, b = A.knightB, B = YARD.bout, its = this.talkIts; if (!B) return;
  for (const id in its || {}) { const ac = A[id], it = its[id]; it.x = ac.x; it.p.x = ac.x; }
  const busy = a.talking || b.talking;
  if (!a.talking && a.lookYaw !== 1.25) a.lookYaw = 1.25; if (!b.talking && b.lookYaw !== -1.25) b.lookYaw = -1.25;
  B.next -= dt;
  if (B.next <= 0 && !busy) {
    const [att, def] = B.att ? [b, a] : [a, b]; B.att ^= 1; const combo = Math.random() < 0.6, hits = combo ? [0.55, 1.2, 1.95] : [0.75];
    att.act(combo ? 'Sword_Regular_Combo' : 'Sword_Attack', 0, null);
    const pan = clamp(((a.x + b.x) / 2 - R.cam.position.x) / 10, -0.8, 0.8);
    for (const t of hits) { B.q.push({ t: G.t + t - 0.32, fn: () => { if (!def.talking) def.act('Sword_Block', 0, null); } }); B.q.push({ t: G.t + t, fn: () => AUDIO.sfx('clang', { gain: 0.45, pan }) }); }
    B.next = (combo ? 3.4 : 2.2) + Math.random() * 1.2;
  }
  for (let i = B.q.length - 1; i >= 0; i--) if (G.t >= B.q[i].t) { const e = B.q[i]; B.q.splice(i, 1); if (!busy) e.fn(); }
};
