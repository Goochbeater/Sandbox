/* THE FEAST — the Swan Festival's last night in the great hall (STORY.md §5 chapter 3 "The night", §6.3, §7.1). The throne
   room's own hall (THRONE.hall) dressed for it: a high table on the dais, two lower tables in the side bays, the cupbearer's
   sideboard where the lectern stood, Krasna's banners beside the swan's, two musicians by the great doors, and the Swan Cup.
   The night (FEAST.play): the king walks the hall and talks to his guests → takes his seat (the lens comes in on the high
   table) → two choices that set the stage without his knowing it (§6.3): guest-right for the masked knight, and fire
   indoors → the courses → the Salamanders spit fire between them (Ilka is gone from her place while every eye is on the
   fire) → the Black Swan Knight unmasks: Konrad of Hal → the loving cup, the host from the left lip, the guest from the
   right → Gniewomir laughs, sets it down and dies with his hand still on it → outside, the rain → Mściwoj, King of Krasna for
   an hour, and the doors → twelve days → chapter four (CAL.phase 'crisis'). The king's words are the player's (NIGHT.ask).
   Only adults are at the feast; Zofia and Kazik are in bed. */
const FEAST = SCENE.addRoom(new Room('feast', { X0: -13.5, X1: 13.5, CEIL: 6.4, KZ: 3.25, cam: { y: 2.95, look: 2.62, dist: 19.4, fov: 19 }, exposure: 0.92, reflK: 0.85,
  caption: ['The Feast', 'The last night of the Swan Festival'], music: 'throne', ambience: { crowd: 0.6, fire: 0.3 }, acoustics: { size: 3.2, wet: 0.4 }, surface: 'stone' }));
FEAST.ENTRY = -12.2; FEAST.TX = 1.5; FEAST.DOORX = 11.9;
FEAST.HIGH = { x0: -1.3, x1: 4.3, z0: 1.75, z1: 2.35, top: 1.23 };
FEAST.CUP = { x: 2.15, y: 1.23, z: 2.2 };
FEAST.SEAT = { x: 1.5, y: 0.93, z: 1.45, yaw: 0, cardDz: 0.32 };
FEAST.GUESTS = ['queen', 'dorota', 'gniewomir', 'wieslawa', 'commander', 'jarek', 'konrad', 'msciwoj', 'ottokar', 'spymaster', 'jacek', 'steward'];
FEAST.SHOW = ['salA', 'salB', 'salC'];   // shown only for their turn between the courses
FEAST.LINES = Object.assign({}, THRONE.LINES, {
  arch: ['Not before the toast. A host who leaves his own feast starts a war by morning.'],
  doors: ['The great doors, shut on the night. Krasnian knights outside them, ours inside.'],
  cup: ['The Swan Cup. Two lips: the host drinks from the left, the guest from the right. My grandfather had it made so nobody could poison one king without poisoning the other. It was a joke, then.'],
  sideboard: ['Jacek’s sideboard: the wine, the jug for the cup, and Jacek, sweating.'],
  musicians: ['They know three Krasnian songs. They’ve played all three twice.'],
  table: ['Boar, pike, pies, figs from the south. Halina has been planning this since Easter.'],
});
/* ---------------------------------------------------------------- the hall, dressed */
FEAST.build = function () {
  const room = BUILD.begin(this); THRONE.hall(room, { feast: true });
  room.inter = room.inter.filter((i) => ['window', 'books', 'banner', 'doors', 'halberds'].includes(i.id));   // no court tonight, no way out
  FEAST.dress(room); room.update(0, 0);
  const out = BUILD.end();
  room.cup = FEAST.makeCup(); room.group.add(room.cup);   // after the merge: the cup moves
  return out;
};
FEAST.dress = function (room) {
  const T = PX.T, KZ = room.KZ, H = FEAST.HIGH, L = room.LINES, say = (k) => SCENE.say(SCENE.player, SCENE.cycle('fe' + k, L[k]));
  /* the high table on the dais: linen to the floor, the runner and the swan on its front, the food along it, candles */
  BUILD.box(H.x0, H.x1, 0, H.top, H.z0, H.z1, T.linen, { front: BUILD.std(T.feastFrontHigh, { rough: 0.9 }) });
  BUILD.card(T.feastFoodHigh, (H.x0 + H.x1) / 2, H.top, 1.98, { cast: false, w: H.x1 - H.x0 - 0.1 });
  for (const x of [-0.95, 0.95, 3.35]) { BUILD.card(T.candle, x, H.top, 2.12); BUILD.flame(x, H.top + 0.28, 2.125, 0.3); }
  BUILD.light(new THREE.PointLight(0xffb070, 3.2, 0, 2), 1.5, 2.0, 2.6, { flicker: 9 });
  room.interact('cup', FEAST.CUP.x, 2.4, KZ, 0.5, () => say('cup')).label = 'Look at the Swan Cup';
  room.interact('seat', FEAST.TX, 3.0, KZ, 0.6, () => FEAST.play().catch(fail)).label = 'Take your seat at the high table';
  /* the lower tables in the side bays, and the town's people at the right-hand one */
  for (const [x0, x1] of [[-10.4, -6.0], [6.8, 10.8]]) {
    BUILD.box(x0, x1, 0, 0.78, 1.0, 1.5, T.linen, { front: BUILD.std(T.feastFrontLow, { rough: 0.9 }) });
    BUILD.card(T.feastFoodLow, (x0 + x1) / 2, 0.78, 1.18, { cast: false, w: x1 - x0 - 0.1 });
    for (const x of [x0 + 1.1, x1 - 1.1]) { BUILD.card(T.candle, x, 0.78, 1.32); BUILD.flame(x, 1.06, 1.325, 0.3); }
    BUILD.light(new THREE.PointLight(0xffb070, 2.0, 0, 2), (x0 + x1) / 2, 1.4, 1.9, { flicker: 8 + x0 });
  }
  BUILD.card(T.crowdA, 9.95, 0.42, 0.6, { w: 1.6, h: 1.2, cast: false });
  room.interact('table', -8.2, 2.2, KZ, 0.6, () => say('table'));
  /* the cupbearer's sideboard, where the lectern stood: the wine, the jug for the cup */
  BUILD.box(-4.5, -3.3, 0, 0.92, 0.5, 1.0, T.woodDark, { front: BUILD.std(T.sideboard) });
  BUILD.card(T.jug, -4.15, 0.92, 0.8); BUILD.card(T.goblet, -3.7, 0.92, 0.82); BUILD.card(T.candle, -3.5, 0.92, 0.7); BUILD.flame(-3.5, 1.2, 0.705, 0.3);
  room.interact('sideboard', -3.9, 2.0, KZ, 0.5, () => say('sideboard'));
  /* Krasna's banners beside the swan's; the musicians by the great doors */
  for (const x of [-0.35, 3.35]) BUILD.card(T.bannerKrasna, x, 3.05, 0.05, { cast: false, s: 0.8 });
  BUILD.card(T.lutePlayer, 11.0, 0, 0.85); { const m = BUILD.card(T.lutePlayer, 12.7, 0, 0.75); m.scale.x = -1; }
  room.interact('musicians', 11.8, 2.4, KZ, 0.5, () => { AUDIO.sfx('chime', { gain: 0.3 }); say('musicians'); });
  /* the fire-spitters' blasts (FAIR.blast), and a cold flash for the lightning when it begins to rain */
  room.blasts = [0, 1, 2].map(() => { const a = BUILD.anim(T.blast, 0, 0, 0, { basic: true, k: 3.2, cast: false, s: 1.0 }); a.me.visible = false; return a; });
  room.lights.flash = BUILD.light(new THREE.PointLight(0xff8a3c, 0, 0, 2), 1.5, 2.2, 3.4);
  room.lights.storm = BUILD.light(new THREE.PointLight(0xc8d8ff, 0, 0, 2), 0, 4.6, 1.2);
};
FEAST.makeCup = function () {   // the Swan Cup: a gilt bowl on a stem, a handle on each side (the two lips), larger than life so it reads
  const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xe0a83a, roughness: 0.28, metalness: 0.85, emissive: 0x4a2a00 });
  const prof = [[0, 0], [0.11, 0], [0.11, 0.02], [0.04, 0.05], [0.03, 0.16], [0.05, 0.19], [0.12, 0.24], [0.14, 0.34], [0.13, 0.35]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 18), gold));
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.013, 6, 12, Math.PI), gold); h.position.set(s * 0.14, 0.27, 0); h.rotation.z = -s * Math.PI / 2; g.add(h); }
  const swan = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.5 })); swan.position.set(0, 0.2, 0.13); g.add(swan);
  g.position.set(FEAST.CUP.x, FEAST.CUP.y, FEAST.CUP.z); g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  return g;
};
/* the guests in their places; the fire-spitters out of sight until their turn; talk markers over everyone */
FEAST.onEnter = function () {
  const A = CAST.A;
  if (!CUT.playing) SCENE.caption(...this.caption);
  for (const id of FEAST.SHOW) if (A[id]) A[id].setVisible(false);
  if (A.konrad && A.konrad.maskMesh) A.konrad.maskMesh.visible = true;
  this.cup.position.set(FEAST.CUP.x, FEAST.CUP.y, FEAST.CUP.z); this.cup.rotation.set(0, 0, 0);
  FEST.talkers(this, FEAST.GUESTS.filter((id) => A[id]).map((id) => [id, 'Talk to ' + (A[id].name || id), () => FEAST.talk(id)]));
};
FEAST.TALK = {
  queen: ['You’re late. Gniewomir has told the story of your father and the bridge twice, and I’ve laughed both times.', 'Smile. Wiesława is watching me watch you.'],
  dorota: ['I blessed the cup this morning, Your Grace, with the whole town watching. It has never been so holy.', 'Your wife is three seats away. Behave, for once in your life.'],
  gniewomir: ['Bolesław’s boy! Sit, sit. Tonight we drink from the same cup, and tomorrow we sign, eh? (He coughs into his fist.) The damp in your hall.', 'Your wine is thin, your hall is cold, and your bear is better company than my son. I love it here.'],
  wieslawa: ['He has coughed since the spring and won’t let a physician near him. Make him drink less, if you can. You can’t.', 'Ser Ottokar is a fine knight. Everyone says so. Don’t you think so?'],
  commander: ['Three hundred Krasnians and their swords in my hall. I’ve counted the doors twice.', 'If you want me sober, Your Grace, say so now. In an hour it’ll be too late.'],
  jarek: ['If your king signs, Radomir, the river is Krasna’s toll road. Think of your wife’s brother when you drink.', 'Lovely feast. Expensive. I’ve seen the bills.'],
  konrad: ['I’m told the custom of this house is that a masked guest is a guest, Your Grace.', 'Your hall hasn’t changed. The gate under the chapel tower: what do they call it now?'],
  msciwoj: ['My father thinks you’re the son he should have had. I think you’re a man with a small army and a long river.', 'The Black Swan. Sitting there in a mask like a girl at a wedding. Who is he?'],
  ottokar: ['Your Grace.', 'A fine joust. Whoever the Black Swan is, he has been angry for a long time.'],
  spymaster: ['Every Krasnian in this hall has a knife, and most of them have two. Drink last, if you drink at all.', 'Jacek has had the cup since noon. I’ve had my eye on Jacek since noon.'],
  jacek: ['Your Grace! The cup is ready, Your Grace. I fill it when the steward says. Not before. Not before, Your Grace.', 'I’ve never poured for two kings. I’ve never poured for one.'],
  steward: ['Your Grace. When you’re ready, take your seat, and the hall will follow.', 'The kitchens say nine courses. The kitchens are optimists.'],
};
FEAST.talk = function (id) { const a = CAST.A[id]; if (!a || SCENE.lock) return; if (!a.sitting) { a.faceTo(SCENE.player.x); } SCENE.say(a, SCENE.cycle('ft' + id, FEAST.TALK[id])); };
/* ---------------------------------------------------------------- the night */
FEAST.say = (a, t) => SCENE.say(a, t, { wait: true });
/* walk a guest along legs [x, z, speed?]: always round a table's end, never through its cloth */
FEAST.walk = async (a, legs) => { for (const [x, z, sp] of legs) await new Promise((r) => a.moveTo3({ x, z, speed: sp }, r)); };
FEAST.pick = async (opts) => { const i = await NIGHT.ask(opts); await SCENE.say(SCENE.player, opts[i], { wait: true }); return i; };   // the king says what the player picked
FEAST.play = async function () {
  const A = CAST.A, K = SCENE.player, room = FEAST; if (FEAST.on || SCENE.lock) return;
  FEAST.on = true; SCENE.lock++; NIGHT.quiet();   // the walking hint is done: it would sit under the night's choices
  try {
    // to his seat (behind the fade: up the dais and round the end of the table), and the lens comes in on the high table
    await NIGHT.fade(true); K.stand(); K.sit(Object.assign({}, FEAST.SEAT)); K.sitK = 1; K.face = 1; K.lookYaw = null; K.target = null;   // seated at once, behind the fade
    await SCENE.lens(room, { focus: 1.5, dist: 15.5, y: 2.35, look: 1.75, fov: 17 }, 0.01);   // (seated, he sees only seated markers: none tonight)
    await NIGHT.fade(false); AUDIO.sfx('clink', { gain: 0.6 });
    // the steward's two questions: they set the stage, and nobody knows it
    await FEAST.say(A.steward, 'Your Grace. Before the first course: the masked knight asks guest-right at your table.');
    CAL.konrad = (await FEAST.pick(['He rode well. Let him eat with us.', 'No masks at my table. He can eat in the yard.'])) === 0;
    if (!CAL.konrad && A.konrad) { const k = A.konrad; k.stand(); await FEAST.walk(k, [[-5.75, 0.85], [-5.6, 2.4], [11.9, 2.6, 1.4]]); k.setVisible(false); }
    await FEAST.say(A.steward, 'And the Salamanders ask to play the hall between the courses.');
    CAL.fire = (await FEAST.pick(['Let them. It’s the last night.', 'Not indoors. Not with these hangings.'])) === 0;
    // the courses
    SCENE.caption('The first course', 'Pike in saffron, and Krasnian toasts'); AUDIO.sfx('clink', { gain: 0.5, delay: 0.6 });
    await SCENE.talk([[A.gniewomir, 'Bolesław’s boy! Your father held this hall nineteen days against Hal. I’d have held it twenty, but I’d have been drunk for nineteen.'],
      [A.queen, 'He says that every year.'], [A.gniewomir, 'Every year it’s true! (He laughs, and the laugh turns into a cough.)']]);
    AUDIO.sfx('cough', { gain: 0.7, pitch: 0.9 });
    // the moment every eye leaves the high table: the fire, or the knight's name, or a song. Ilka is gone from her place for it
    const ilka = A.spymaster; if (ilka) ilka.setVisible(false);
    if (CAL.fire) await FEAST.fire();
    if (CAL.konrad) await FEAST.unmask();
    if (!CAL.fire && !CAL.konrad) { SCENE.caption('The second course', 'The musicians play the ballad of the swan, and the hall sings'); AUDIO.sfx('cheer', { gain: 0.5, dur: 3 }); await SCENE.wait(3600); }
    if (ilka) ilka.setVisible(true);
    await FEAST.toast();
    await FEAST.after();
  } finally { SCENE.lock--; FEAST.on = false; }
};
/* the fire-spitters in the hall: in through the great doors, onto the floor before the high table, three blasts and then all three */
FEAST.fire = async function () {
  const A = CAST.A, S = FEAST.SHOW.map((id) => A[id]), room = FEAST; if (!S.every(Boolean)) return;
  SCENE.caption('Between the courses', 'The Salamanders'); AUDIO.sfx('drum', { gain: 0.7 });
  const spots = [[-0.6, -1], [0.45, -1], [3.45, 1]];   // either side of the king's place, so the host still shows
  S.forEach((s, i) => { s.setVisible(true); s.stand(); s.x = 11.2 + i * 0.6; s.z = 2.6; });
  await Promise.all(S.map((s, i) => new Promise((r) => s.moveTo3({ x: spots[i][0], z: 2.95, speed: 1.6 }, r))));
  S.forEach((s, i) => { s.face = spots[i][1]; s.lookYaw = null; });
  await SCENE.wait(500);
  for (let i = 0; i < 3; i++) { FAIR.blast(room, i, 1.0); await SCENE.wait(1400); }
  for (let i = 0; i < 3; i++) FAIR.blast(room, i, 1.3);
  await SCENE.wait(900); AUDIO.sfx('cheer', { gain: 0.9, dur: 3.0 });
  await SCENE.say(A.gniewomir, 'Ha! Fire in the hall! Bolesław would have had you all hanged, and then paid you double.', { wait: true });
  await Promise.all(S.map((s, i) => new Promise((r) => s.moveTo3({ x: 11.2 + i * 0.6, z: 2.6, speed: 1.6 }, r))));
  S.forEach((s) => s.setVisible(false));
};
/* the Black Swan Knight's name: he comes out onto the floor and takes off the mask */
FEAST.unmask = async function () {
  const A = CAST.A, k = A.konrad, M = A.msciwoj; if (!k) return;
  k.stand(); await FEAST.walk(k, [[-5.75, 0.85], [-5.6, 2.3], [0.3, 2.95]]);
  k.face = 1; k.lookYaw = 0.7;
  await FEAST.say(k, 'Guest-right, Your Grace. You gave it, so I’ll give you my name.');
  k.act('Interact', 0.5, () => { if (k.maskMesh) k.maskMesh.visible = false; AUDIO.sfx('gasp', { gain: 0.8 }); }); await SCENE.wait(1300);
  await FEAST.say(k, 'Konrad. Son of Dietrich, Margrave of Hal.');
  if (M) { M.stand(); M.lookYaw = -1.0; }
  await SCENE.talk([[M || A.ottokar, 'Hal! Under your roof, Radomir? At your table?'],
    [A.gniewomir, 'Sit down, boy. Guest-right is guest-right. Even for Hal. Especially for Hal: it’s the only thing they’ve ever had from us.']]);
  const i = await FEAST.pick(['Sit, Konrad. Tonight you’re my guest.', 'You were asked for a name, not a speech.', 'Why are you in my hall?']);
  if (i === 2) await FEAST.say(k, 'To ask where my father’s army went. Twelve years, and nobody in Hal will say. I thought the man whose father won might know.');
  else await FEAST.say(k, 'As you say, Your Grace.');
  await FEAST.walk(k, [[-5.6, 2.3], [-5.75, 0.85], [-6.7, 0.72]]); k.sit(Object.assign({}, k.homes.feast.sit));
  if (M) { M.sit(Object.assign({}, M.homes.feast.sit)); M.lookYaw = null; }
};
/* the loving cup: Jacek fills it; the host drinks from the left lip; the guest from the right; and Gniewomir dies */
FEAST.toast = async function () {
  const A = CAST.A, K = SCENE.player, G = A.gniewomir, J = A.jacek, room = FEAST, cup = room.cup;
  AUDIO.sfx('fanfare', { gain: 0.5 }); await FEAST.say(A.steward, 'The loving cup!');
  if (J) { J.stand(); await FEAST.walk(J, [[-2.0, 2.75], [FEAST.CUP.x - 0.3, 2.75]]); J.face = 1; J.lookYaw = 2.6;
    J.act('Interact', 0.4, () => AUDIO.sfx('whoosh', { gain: 0.25 })); await SCENE.wait(1400); await FEAST.walk(J, [[-2.0, 2.75], [-3.1, 1.5]]); J.face = -1; J.lookYaw = null; }
  await FEAST.say(G, 'Host first, boy. The left lip. Your grandfather’s joke.');
  CAL.toast = await FEAST.pick(['To Krasna and Lodmir: one cup, two lips.', 'To the sun, while it holds.', 'To my father, who held this hall.']);
  // he lifts it from the left, drinks, sets it down nearer his guest
  K.act('Interact', 0.55); await FEAST.lift(cup, 1.62, 1.95, 1.0); AUDIO.sfx('clink', { gain: 0.5 });
  await FEAST.say(G, SCENE.cycle('feG', ['To Bolesław’s boy! And to his thin wine!']));
  G.act('Interact', 0.55); await FEAST.lift(cup, 2.55, 1.95, 1.0); AUDIO.sfx('clink', { gain: 0.6 });
  await FEAST.say(G, 'Ha! Krasnian wine would have…'); AUDIO.sfx('cough', { gain: 0.9, n: 4, pitch: 0.85 }); await SCENE.wait(900);
  await FEAST.say(G, '…would have…');
  // he folds forward over the table, his hand still on the cup. The hall stops.
  FEAST.die(G); AUDIO.ambience({ crowd: 0, fire: 0.3 }); AUDIO.playMusic(null, 1.2); AUDIO.sfx('thud', { gain: 0.6, delay: 1.0 });
  await SCENE.wait(2000); AUDIO.sfx('gasp', { gain: 1.0, dur: 0.9 });
  await FEAST.say(A.wieslawa, 'Gniewomir? Gniewomir!');
  // outside, it begins to rain
  AUDIO.sfx('thunder', { gain: 1.0 }); FEAST.lightning(); AUDIO.ambience({ rainGlass: 0.9, crowd: 0.05, fire: 0.25 });
  SCENE.caption('', 'Outside, for the first time in seven days, it is raining.');
  await SCENE.wait(2200);
};
FEAST.lift = function (cup, x, y, dur) {   // the cup comes up to whoever drinks and goes back down where he sets it
  const x0 = cup.position.x, y0 = cup.position.y; return new Promise((res) => { let t = 0; const f = (T, dt) => { t += dt; const u = Math.min(1, t / (dur * 2));
    const up = Math.sin(Math.min(1, u * 1.15) * Math.PI); cup.position.x = lerp(x0, x, smooth(0, 0.5, u)); cup.position.y = y0 + up * (y - y0); cup.rotation.z = up * 0.35 * Math.sign(x - FEAST.TX - 0.6);
    if (u >= 1) { cup.position.y = y0; cup.rotation.z = 0; FEAST.tick = FEAST.tick.filter((g) => g !== f); res(); } }; FEAST.tick.push(f); }); };
/* the bones under spine_01, neck_01 and the right upper arm, once */
FEAST.sub = function (i) { const P = QA.M.skel.parents, out = [i]; for (let j = 0; j < P.length; j++) { let p = P[j]; while (p >= 0) { if (p === i) { out.push(j); break; } p = P[p]; } } return out; };
/* a seated man folding forward over the table: the sitting clip, then the whole upper body pitched forward about spine_01
   (every bone in the subtree turned together, so it moves as one piece), the head dropped further, the right arm left
   forward on the table toward the cup. D holds each bone's world-space turn from the bind pose (Actor.compose), so a turn
   about the body's X axis is a premultiply */
FEAST.die = function (a) {
  const I = QA.idx, X = new THREE.Vector3(1, 0, 0), q = new THREE.Quaternion(), S1 = FEAST.sub(I.spine_01), NK = FEAST.sub(I.neck_01), AR = FEAST.sub(I.upperarm_r);
  let k = 0; a.dead = true;
  a.puppet = (b, dt) => { k = Math.min(1, k + dt / 1.3); const e = smooth(0, 1, k);
    QA.sample(QA.clips.Sitting_Idle_Loop, 0.4, b.D, b.pel, b.pelvisH);
    q.setFromAxisAngle(X, 0.78 * e); for (const i of S1) b.D[i].premultiply(q);
    q.setFromAxisAngle(X, 0.45 * e); for (const i of NK) b.D[i].premultiply(q);
    q.setFromAxisAngle(X, -0.75 * e); for (const i of AR) b.D[i].premultiply(q); };
};
FEAST.lightning = function () { const L = FEAST.lights.storm; let t = 0; const f = (T, dt) => { t += dt; L.intensity = t < 0.08 || (t > 0.18 && t < 0.26) ? 60 : 0; if (t > 0.4) { L.intensity = 0; FEAST.tick = FEAST.tick.filter((g) => g !== f); } }; FEAST.tick.push(f); };
/* Mściwoj, King of Krasna for an hour; the doors; twelve days; chapter four */
FEAST.after = async function () {
  const A = CAST.A, K = SCENE.player, M = A.msciwoj, G = A.gniewomir, room = FEAST;
  if (M) { M.stand(); await FEAST.walk(M, [[6.5, 0.85], [6.4, 2.6], [3.0, 2.75, 1.5]]); M.face = -1; M.lookYaw = 2.7; }
  await SCENE.talk([[M, 'Father. Father!'], [A.wieslawa, 'He’s not breathing. Mściwoj, he’s not…'],
    [M, 'He drank from your cup, Radomir. At your table. Under your roof, on your guest-right.']]);
  if (A.ottokar) { const o = A.ottokar; o.stand(); FEAST.walk(o, [[11.1, 0.85], [11.4, 2.6, 1.4]]); }
  await FEAST.say(A.commander, 'The Krasnians are at the doors, Your Grace. Both sides of them. Your word.');
  const d = await FEAST.pick(['Close the doors. No one leaves this hall tonight.', 'Open the doors. Let them go.']); CAL.doors = d === 0 ? 'closed' : 'open';
  if (d === 0) { AUDIO.sfx('door', { gain: 0.9 }); await FEAST.say(M, 'Good. Then whoever did this is still in here with us.'); }
  else { for (const id of ['jarek', 'konrad', 'dorota']) if (A[id] && A[id].visible) A[id].setVisible(false); await FEAST.say(M, 'Open them, then. Let your poisoner walk home in the rain.'); }
  await SCENE.talk([[M, 'Twelve days. The time it takes to carry a king home to Krasna and put him in the ground.'],
    [M, 'Bring me the hand that did this by then, Radomir. Or three hundred knights become twenty thousand.']]);
  await FEAST.pick(['You’ll have a name.', 'I’m sorry, Mściwoj. Truly.', 'Don’t threaten me in my own hall.']);
  // the end of the night: chapter four, and the morning after in the bedchamber
  await NIGHT.fade(true);
  CAL.phase = 'crisis'; CAL.crisis = 1; CAL.day++; CAL.feastDone = true; FEST.feast = true;
  if (G) { G.puppet = null; G.offstage = true; G.setVisible(false); }
  room.camFocus = null; await SCENE.lens(room, null, 0.01);
  SCENE.caption('Chapter Four · The Dead King', 'Twelve days. Then war.'); await SCENE.wait(4800);
  K.stand(); await SCENE.prepare('bedroom'); SCENE.enter('bedroom', { x: -6.4, face: 1 }); R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame();
  GAME.save(); await NIGHT.fade(false); CAL.morning();
};
