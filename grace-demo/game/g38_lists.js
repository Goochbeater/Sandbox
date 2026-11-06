/* THE LISTS — the middle of the Swan Meadow (STORY.md §6.1). Left to right: the gate from the fair · the heralds' tower
   and the herald · the commons' stands · the tiltyard, with the near field where knights fight on foot, the tilt barrier
   behind it where they joust, and the royal stand under its canopy at the back (Halina, King Gniewomir, Queen Wiesława) ·
   the other stands · the Marshal · the archery butts and Zofia · the gate to the pavilions.
   The joust is painted: horses can't be actors (the kit has none), so each rider is a strip of gallop frames on a card. */
const LISTS = FEST.room('lists', 'The Lists', 'Lances, sand and the whole town shouting', { ambience: { crowd: 0.75, birds: 0.2, wind: 0.2 } });
LISTS.ENTRY = -13.8;
LISTS.JX = 4.6;   // where the lances meet: right of the middle, clear of the duellists and the gap in the rail
LISTS.RUN = 10.0;   // each lane runs this far either side of the crossing: both knights wait inside the grounds (at 13.6 the black one stood outside the gate)
LISTS.build = function () {
  const room = BUILD.begin(this), T = PX.T, KZ = room.KZ, L = FEST.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle('ll' + k, L[k]));
  FEST.backdrop(room, { fx: -4, tents: [[-22, -16, 2.4, 0], [-11, -24, 2.0, 1], [17, -19, 2.6, 3], [27, -24, 2.2, 2], [6, -28, 2.0, 0]] });
  /* the gates */
  BUILD.card(T.festGate, -15.4, 0, 1.7); room.interact('toFair', -15.0, 3.0, KZ, 1.0, () => { SCENE.lock++; SCENE.say(SCENE.player, L.toFair[0]).then(() => { SCENE.lock--; GAME.save(); SCENE.go('fair', { x: 13.8, face: -1 }); }); }).label = 'Back to the fair';
  BUILD.card(T.festGate, 15.4, 0, 1.7); room.interact('toCamp', 15.0, 3.0, KZ, 1.0, () => { SCENE.lock++; SCENE.say(SCENE.player, L.toCamp[0]).then(() => { SCENE.lock--; GAME.save(); SCENE.go('camp', { x: CAMP.ENTRY, face: 1 }); }); }).label = 'To the pavilions';
  /* the field: sand from the near rail to the royal stand */
  BUILD.rug(T.sand, -12.5, 12.5, -9.6, 2.2, { ru: 12, rv: 6, y: 0.004 }).material.color = new THREE.Color(0xe0d0b0);
  /* the near rail (open in the middle, where the knights come in) */
  for (const [x0, x1] of [[-12.5, -2.2], [2.2, 12.5]]) { for (const y of [0.5, 1.0]) BUILD.box(x0, x1, y - 0.05, y + 0.04, 2.18, 2.28, T.woodPost, { cast: false });
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.round((x1 - x0) / 2)) BUILD.box(x - 0.06, x + 0.06, 0, 1.06, 2.17, 2.29, T.woodPost); }
  /* the tilt: a timber rail on posts, hung with striped cloth on both faces */
  BUILD.box(-11, 11, 1.25, 1.36, -3.06, -2.94, T.woodPost); for (let x = -11; x <= 11; x += 2.2) BUILD.box(x - 0.07, x + 0.07, 0, 1.36, -3.07, -2.93, T.woodPost);
  BUILD.card(T.tiltCloth, 0, 0.02, -2.9, { w: 22, h: 1.25, ru: 11, cast: false }); BUILD.card(T.tiltCloth, 0, 0.02, -3.1, { w: 22, h: 1.25, ru: 11, ry: Math.PI, cast: false });
  room.interact('tilt', -6.4, 1.8, KZ, 0.7, () => say('tilt'));
  /* the royal stand: a platform, four chairs, a canopy with its valance, the swan and Krasna's eagle on poles */
  BUILD.box(-5, 5, 0, 1.4, -9, -6.8, T.woodRed); BUILD.box(-5.1, 5.1, 1.36, 1.44, -9.05, -6.75, T.woodDark);
  BUILD.box(-1.1, 1.1, 0, 0.46, -6.8, -6.1, T.woodDark); BUILD.box(-1.1, 1.1, 0, 0.92, -6.8, -6.45, T.woodDark);
  BUILD.card(T.folkWide, 0, 0.1, -6.74, { w: 9.6, h: 1.2, cast: false, col: 0x8aa0d8 });
  for (const x of [-2.9, -1.2, 1.2, 2.9]) BUILD.card(T.chair, x, 1.4, -7.75, { s: 1.0 });
  for (const x of [-5, 5]) for (const z of [-9, -6.8]) BUILD.box(x - 0.08, x + 0.08, 1.4, 4.6, z - 0.08, z + 0.08, T.woodPost);
  { const g = new THREE.PlaneGeometry(10.6, 2.8); g.rotateX(-Math.PI / 2 + 0.22); g.translate(0, 4.75, -7.9); BUILD.planarUV(g, T.canvasSwan); BUILD.add(new THREE.Mesh(g, BUILD.std(T.canvasSwan, { side: THREE.DoubleSide })), { cast: true }); }
  BUILD.card(T.canopy, 0, 3.55, -6.7, { w: 10.6, h: 0.95, cast: false });
  for (const [x, t] of [[-5.7, T.bannerBlue], [5.7, T.bannerKrasna]]) { BUILD.box(x - 0.06, x + 0.06, 0, 6.4, -6.7, -6.6, T.woodPost); BUILD.windCard(t, x, 3.6, -6.55, 'wave', 0.08, { cast: false, s: 1.15 }); }
  room.interact('stand', -3.6, 3.6, KZ, 0.6, () => say('stand'));
  /* the commons' stands: three tiers each, the town on every one */
  for (const [x0, x1, seed] of [[-12, -6.2, 0], [6.2, 12, 1]]) {
    for (const [y, za, zb] of [[0.45, -5.0, -4.4], [0.9, -6.0, -5.0], [1.35, -7.4, -6.0]]) { BUILD.box(x0, x1, 0, y, za, zb, T.woodDark); BUILD.box(x0, x1, y - 0.04, y, za, zb + 0.02, T.woodRed); }
    for (const [y, z, k] of [[0.45, -4.68, 0], [0.9, -5.5, 1], [1.35, -6.7, 0]]) BUILD.card((k + seed) % 2 ? T.crowdA : T.crowdB, (x0 + x1) / 2, y, z, { w: x1 - x0, h: 1.25, cast: false });
    room.interact('stands' + seed, (x0 + x1) / 2, 2.4, KZ, 0.6, () => say('stands')); }
  /* the heralds' tower */
  BUILD.box(-13.4, -11.8, 0, 5.2, -2.3, -0.7, T.woodRed); BUILD.box(-13.6, -11.6, 5.2, 5.32, -2.5, -0.5, T.woodDark);
  for (const x of [-13.5, -11.7]) BUILD.box(x - 0.05, x + 0.05, 5.32, 6.1, -0.58, -0.48, T.woodPost);
  BUILD.cone(-12.6, -1.5, 6.1, 1.4, 1.5, T.canvasSwan, { seg: 8 }); BUILD.card(T.bannerBlue, -12.6, 2.2, -0.66, { s: 0.9, cast: false });
  room.interact('tower', -12.6, 4.0, KZ, 0.5, () => say('tower'));
  /* the archery butts at the far end */
  BUILD.card(T.butt, 13.6, 0, 0.5, { s: 0.95 }); BUILD.card(T.butt, 14.8, 0, -0.3, { s: 0.85 }); room.interact('butts', 14.0, 2.4, KZ, 0.6, () => say('butts'));
  /* the jousters at the ends of their lanes, the dust they'll raise, the lance shards, the unhorsed knight */
  // the jousters are animals and knights of the cast (game/g44): LISTS.mount puts each knight in his saddle
  room.shards = []; for (let i = 0; i < 12; i++) { const s = BUILD.card(T.shard, 0, 0, 0, { cast: false, dyn: true, s: 1.4 }); s.visible = false; room.shards.push({ me: s, v: new THREE.Vector3(), spin: 0 }); }
  room.downed = BUILD.card(T.knightDown, 0, 0, -2.0, { cast: false, dyn: true }); room.downed.visible = false;
  room.interact('joust', 4.6, 2.8, KZ, 0.8, () => LISTS.joust(room)).label = 'Watch the joust';
  room.interact('duel', 0.0, 2.8, KZ, 0.7, () => LISTS.duel(room)).label = 'Watch the duel';
  room.interact('favour', 7.2, 2.6, KZ, 0.6, () => LISTS.favour()).label = 'Give your favour to a knight';
  room.interact('loveQueen', -10.2, 2.6, KZ, 0.6, () => LISTS.loveQueen()).label = 'Crown the Queen of Love and Beauty';
  /* bunting high over the stands, the near side's racks and barrels */
  FEST.bunting(-14, -6, -8.4, 5.6); FEST.bunting(6, 14, -8.4, 5.6);
  BUILD.card(T.crowdA, -2, 0, -10.6, { w: 14, h: 1.25, cast: false });
  BUILD.card(T.halberds, -7.2, 0, 7.2, { s: 1.0, cast: false }); BUILD.card(T.barrel, 6.4, 0, 7.4, { s: 1.1, cast: false }); BUILD.card(T.barrel, 7.1, 0, 7.0, { s: 1.1, cast: false });
  BUILD.card(T.hay, 11.2, 0, 7.3, { s: 1.0, cast: false }); BUILD.card(T.hurdle, -12.4, 0, 7.0, { w: 2.6, h: 0.8, cast: false });
  FEST.lights(room);
  BUILD.motes({ n: 70, boxes: [[-12, 12, 0.2, 2.6, -8, 2, 1]], col: 0xf0e0c0 });
  room.update(0, 0);
  return BUILD.end();
};
LISTS.TALKERS = [['queen', 'Call up to Halina'], ['gniewomir', 'Call up to King Gniewomir'], ['wieslawa', 'Call up to Queen Wiesława'], ['zofia', 'Talk to Zofia'], ['dorota', 'Talk to the saint'],
  ['bogdanLists', 'Talk to Ser Bogdan'], ['ottokar', 'Talk to Ser Ottokar'], ['herald', 'Talk to the herald'], ['marshal', 'Talk to the Marshal']];
FEST.TALK.bogdanLists = FEST.TALK.commander;
LISTS.onEnter = function () { if (!CUT.playing) SCENE.caption(...this.caption); FEST.talkers(this, LISTS.TALKERS); LISTS.mount(true); };
LISTS.onUpdate = function () { FEST.follow(this); LISTS.ride(); };
/* the two jousting pairs: each knight sits his horse (Actor.sit on a saddle 1.72 m up, a little nearer the lens than the
   horse, so his sprite draws over it); LISTS.ride keeps him there every frame, wherever the horse is */
LISTS.pairs = () => { const A = CAST.A; return [{ h: A.joustHorseK, k: A.joustK, z: -2.35, x0: LISTS.JX - LISTS.RUN }, { h: A.joustHorseB, k: A.joustB, z: -3.65, x0: LISTS.JX + LISTS.RUN }].filter((p) => p.h && p.k); };
LISTS.mount = function (reset) {
  for (const P of LISTS.pairs()) { const { h, k } = P;
    if (reset) { h.x = P.x0; h.z = P.z; h.face = P.x0 < LISTS.JX ? 1 : -1; h.lookYaw = h.face * 1.5; h.yaw = h.lookYaw; h.held = null; h.gaitK = 0; k.setVisible(true); k.offstage = false; }
    k.sit({ x: h.x, y: 1.72, z: P.z + 0.34, yaw: h.face * 1.45, cardDz: 0.3, drop: 0.12 }); k.face = h.face; k.mounted = h; }
};
LISTS.ride = function () { for (const P of LISTS.pairs()) { const { h, k } = P; if (k.mounted !== h || !k.sitting) continue; k.sitting.x = h.x; k.sitting.yaw = h.face * 1.45; k.face = h.face; } };
/* ---------------------------------------------------------------- the duel on foot: Bogdan against Ottokar */
LISTS.duel = async function (room) {
  const A = CAST.A, a = A.bogdanLists, b = A.ottokar, K = SCENE.player; if (!a || !b) return;
  SCENE.lock++;
  try {
    await FEST.stepTo(-2.9, 0); await FEST.cam(room, { focus: 0, dist: 11.5, y: 2.3, look: 1.7 }, 1.2);
    AUDIO.sfx('fanfare', { gain: 0.7 }); await FEST.say(A.herald, 'hdl', FEST.TALK.herald.duel);
    a.lookYaw = 1.25; b.lookYaw = -1.25; a.faceTo(b.x); b.faceTo(a.x);
    const pan = clamp((0 - R.cam.position.x) / 10, -0.8, 0.8);
    const bout = (att, def, combo) => new Promise((res) => { att.act(combo ? 'Sword_Regular_Combo' : 'Sword_Attack', 0, null); const hits = combo ? [0.55, 1.2, 1.95] : [0.75];
      let t = 0; const q = hits.flatMap((h) => [[h - 0.32, () => def.act('Sword_Block', 0, null)], [h, () => AUDIO.sfx('clang', { gain: 0.5, pan })]]);
      const f = (T, dt) => { t += dt; while (q.length && t >= q[0][0]) q.shift()[1](); if (t > (combo ? 2.9 : 1.7)) { room.tick = room.tick.filter((g) => g !== f); res(); } }; room.tick.push(f); });
    for (let i = 0; i < 4; i++) { await bout(i % 2 ? b : a, i % 2 ? a : b, i !== 1); if (i === 1) AUDIO.sfx('cheer', { gain: 0.45, dur: 1.6 }); await SCENE.wait(350); }
    const bogdanWins = FEST.favour === 'bogdan', win = bogdanWins ? a : b, lose = bogdanWins ? b : a;
    win.act('Sword_Attack', 0.7, () => { AUDIO.sfx('clang', { gain: 0.7, pan }); lose.act('Fixing_Kneeling', 0, null); });
    await SCENE.wait(1800); AUDIO.sfx('cheer', { gain: 0.95, dur: 3.2 }); FEST.duels++;
    await SCENE.talk(bogdanWins ? [[A.herald, 'Ser Bogdan of Lodmir!'], [a, 'Twelve years, Your Grace. Worth every one.'], [K, 'Your favour won it, Bogdan. Mine, I mean.']]
      : [[A.herald, 'Ser Ottokar of Krasna!'], [b, 'Your commander yields like a gentleman. He fights like a bear.'], [K, 'He’ll be unbearable at supper.']]);
  } finally { a.lookYaw = null; b.lookYaw = null; K.lookYaw = null; await FEST.cam(room, null, 1.0); SCENE.lock--; }
};
/* ---------------------------------------------------------------- the joust: three courses, the black knight unhorses the prince on the third */
LISTS.joust = async function (room) {
  const A = CAST.A, K = SCENE.player, [r1, r2] = LISTS.pairs(); SCENE.lock++;
  if (!r1 || !r2) { SCENE.lock--; return; }
  try {
    await FEST.stepTo(LISTS.JX - 3.4, LISTS.JX); await FEST.cam(room, { focus: LISTS.JX, dist: 16.5, y: 3.9, look: 1.6 }, 1.4);   // close enough that the riders fill the frame as they cross
    AUDIO.sfx('fanfare', { gain: 0.8 }); if (A.herald) await FEST.say(A.herald, 'hjo', FEST.TALK.herald.joust);
    for (let pass = 0; pass < 3; pass++) {
      const dir = pass % 2 ? -1 : 1;   // the prince rides right on the first course, left on the second…
      await LISTS.course(room, r1, r2, dir, pass === 2);
      if (pass < 2) { AUDIO.sfx('cheer', { gain: 0.7, dur: 2.2 }); await SCENE.wait(700); }
    }
    AUDIO.sfx('cheer', { gain: 1.0, dur: 3.6 }); FEST.jousts++;
    await SCENE.talk([[A.herald || K, 'The Black Swan unhorses the Prince of Krasna!'], [K, SCENE.cycle('joK', ['Gniewomir is laughing. Mściwoj is not. Somebody will pay for that at the feast.', 'Whoever is under that mask, he rides like a man who’s been angry for twelve years.'])]]);
    await NIGHT.fade(true);   // reset the lists behind a blink
    room.downed.visible = false; LISTS.mount(true);
    await NIGHT.fade(false);
  } finally { K.lookYaw = null; await FEST.cam(room, null, 1.0); SCENE.lock--; }
};
/* one course: the destriers gallop at each other down their lanes (held in the Gallop clip, driven along x), the knights
   in their saddles, lances meet over the barrier, shards fly. unhorse: the prince comes out of the saddle, falls into the sand
   short of his horse (his body drops; on landing the painted knight in the sand takes his place) and the horse runs on */
LISTS.course = function (room, r1, r2, dir, unhorse) {
  const D = LISTS.COURSE_S || 2.6, X = LISTS.RUN, J = LISTS.JX;   // COURSE_S: seconds a course takes (a headless test slows it to catch frames)
  for (const [P, d] of [[r1, dir], [r2, -dir]]) { const h = P.h; h.face = d; h.lookYaw = d * 1.5; h.held = 'Gallop'; h.gaitK = 1.5; h.x = J - X * d; h.yaw = h.lookYaw; LISTS.mount(false); }
  return new Promise((res) => { let t = 0, hit = false, step = 0, fall = null;
    const f = (T, dt) => { t += dt; const u = Math.min(1, t / D), x = J + lerp(-X * dir, X * dir, u);
      r1.h.x = x; r2.h.x = 2 * J - x;   // they cross at J
      if (t > step) { step += 0.3; AUDIO.sfx('hooves', { gain: 0.5, pan: clamp((x - R.cam.position.x) / 9, -0.8, 0.8) }); }
      if (!hit && u >= 0.48) { hit = true; AUDIO.sfx('crack', { gain: 0.9 }); LISTS.shatter(room, J, 2.4, -3.0);
        if (unhorse) { const k = r1.k; k.mounted = null; fall = { x: k.x, y: k.y, vx: dir * 4.5, vy: 1.2, t: 0 }; } }
      if (fall) { const k = r1.k; fall.t += dt; fall.vy -= 9.8 * dt; fall.x += fall.vx * dt; fall.y += fall.vy * dt; k.sitting.x = fall.x; k.sitting.y = Math.max(0.5, k.sitting.y + fall.vy * dt);
        if (fall.y <= 0.35 && !fall.done) { fall.done = true; AUDIO.sfx('thud', { gain: 1.0 }); k.setVisible(false);
          const d = room.downed; d.position.set(fall.x, 0, -2.05); d.rotation.z = 0; d.scale.x = dir; d.visible = true; } }
      if (u >= 1) { room.tick = room.tick.filter((g) => g !== f); for (const P of [r1, r2]) { P.h.held = null; P.h.gaitK = 0; } res(); } };
    room.tick.push(f); });
};
LISTS.shatter = function (room, x, y, z) {
  for (const s of room.shards) { s.me.visible = true; s.me.position.set(x + (Math.random() - 0.5) * 0.6, y, z); s.v.set((Math.random() - 0.5) * 7, 1.5 + Math.random() * 4.5, (Math.random() - 0.5) * 2); s.spin = (Math.random() - 0.5) * 18; }
  let t = 0; const f = (T, dt) => { t += dt; for (const s of room.shards) { s.v.y -= 9.8 * dt; s.me.position.addScaledVector(s.v, dt); s.me.rotation.z += s.spin * dt; if (s.me.position.y < 0.02) { s.me.position.y = 0.02; s.v.set(0, 0, 0); s.spin = 0; } }
    if (t > 1.6) { for (const s of room.shards) s.me.visible = false; room.tick = room.tick.filter((g) => g !== f); } };
  room.tick.push(f);
};
/* ---------------------------------------------------------------- favours and the crown of love and beauty */
LISTS.favour = async function () {
  const A = CAST.A, K = SCENE.player; SCENE.lock++;
  try {
    await SCENE.say(K, FEST.favour ? 'My favour’s given. A king who takes it back is a king who can’t be trusted with a ribbon.' : 'A favour, for the knight I want to win. Mine to give, and everyone watching.', { wait: true });
    if (FEST.favour) return;
    const i = await FEST.ask(['Ser Bogdan', 'Ser Ottokar of Krasna', 'Prince Mściwoj', 'The Black Swan Knight']); FEST.favour = ['bogdan', 'ottokar', 'msciwoj', 'black'][i];
    await SCENE.talk([[A.marshal || K, ['To Ser Bogdan of Lodmir, the king’s favour!', 'To Ser Ottokar of Krasna, the king’s favour! A courtesy to our guests.', 'To Prince Mściwoj, the king’s favour! Krasna cheers!', 'To… the Black Swan Knight, the king’s favour.'][i]],
      [K, ['Bogdan will be insufferable. Good.', 'Wiesława looked at me when the herald said his name. Only for a moment.', 'Gniewomir is laughing and slapping his knee. The prince is pretending he isn’t pleased.', 'The crowd’s gone quiet. Halina is looking at me like I’ve set fire to something.'][i]]]);
  } finally { SCENE.lock--; }
};
LISTS.loveQueen = async function () {
  const A = CAST.A, K = SCENE.player; SCENE.lock++;
  try {
    if (FEST.loveQueen) { await SCENE.say(K, 'The crown of flowers is given. It’s wilting already, as they do.', { wait: true }); return; }
    await SCENE.say(A.herald || K, 'Your Grace! The lists await the Queen of Love and Beauty. The crown of flowers is yours to give.', { wait: true });
    const i = await FEST.ask(['Halina', 'Queen Wiesława of Krasna', 'Saintess Dorota', 'Marta the miller’s widow']); FEST.loveQueen = ['halina', 'wieslawa', 'dorota', 'marta'][i];
    if (i === 3) COURT.stats.mood = Math.min(20, COURT.stats.mood + 2);
    await SCENE.talk([[A.herald || K, ['The Queen of Lodmir!', 'Queen Wiesława of Krasna!', 'Saintess Dorota of the lower town!', 'Marta… of the mill! Marta of the mill, my lords!'][i]],
      [K, ['Halina didn’t smile. Then she did, when she thought I wasn’t looking.', 'Gniewomir roars and claps. Halina doesn’t move at all. That will cost me tonight.', 'The town cheers its saint. The Canon looks like he swallowed a wasp. Halina looks at the sky.', 'The whole meadow is on its feet. Marta is crying into the flowers and her sons are carrying her round the lists.'][i]]]);
  } finally { SCENE.lock--; }
};
