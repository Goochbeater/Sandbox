/* THE PAVILIONS — the east end of the Swan Meadow, along the river (STORY.md §6.1). Left to right: the gate from the
   lists · the Krasnian soldiers' tents and their fire · the River League's barge at the bank, and Jarek · King Gniewomir's
   great pavilion, open at the front, the king at his maps · Prince Mściwoj at his arming stand · Queen Wiesława's tent and
   Ser Ottokar · the horse lines and the groom · the black tent with no banner, and the masked knight's squire. */
const CAMP = FEST.room('camp', 'The Pavilions', 'Krasna’s camp, the League’s barge, and a black tent', { ambience: { crowd: 0.25, birds: 0.35, wind: 0.25, fire: 0.2, fountain: 0.25 } });
CAMP.ENTRY = -13.8;
CAMP.build = function () {
  const room = BUILD.begin(this), T = PX.T, KZ = room.KZ, L = FEST.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle('cl' + k, L[k]));
  FEST.backdrop(room, { fx: 34, tents: [[-24, -16, 2.2, 0], [-14, -20, 2.0, 0], [24, -15, 2.4, 0]] });
  /* the river along the back: moving water from bank to bank, the far bank's trees */
  { const t = T.water.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60 / T.water.userData.n, 8); t.userData = Object.assign({}, T.water.userData);
    const g = new THREE.PlaneGeometry(300, 34); g.rotateX(-Math.PI / 2); g.translate(0, 0.03, -22);
    BUILD.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, color: new THREE.Color(0x8ab0c8), roughness: 0.2, metalness: 0.1, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.18 })), { cast: false, dyn: true });
    room.tick.push((Tm) => { t.offset.x = Tm * 0.02; t.offset.y = Tm * 0.004; }); }   // the current: the whole strip drifts downstream
  BUILD.card(T.forestNear, -20, 0, -40, { w: 70, h: 12, basic: true, cast: false }); BUILD.card(T.forestNear, 40, 0, -42, { w: 70, h: 12, basic: true, cast: false });
  room.interact('river', -2.0, 1.4, KZ, 0.5, () => say('river'));
  /* the gate from the lists */
  BUILD.card(T.festGate, -15.4, 0, 1.7); room.interact('toLists', -15.0, 3.0, KZ, 1.0, () => { SCENE.lock++; SCENE.say(SCENE.player, L.toLists[0].replace('to the lists', 'back to the lists')).then(() => { SCENE.lock--; GAME.save(); SCENE.go('lists', { x: 13.8, face: -1 }); }); }).label = 'Back to the lists';
  /* the Krasnian soldiers: two tents, a fire, a log to sit on */
  BUILD.tent(-12.4, -0.2, 1.5, 1.7, 1.3, T.canvasKrasna, T.canvasKrasna, { pennant: T.pennantKrasna, seg: 12 });
  BUILD.tent(-9.4, -1.8, 1.5, 1.7, 1.3, T.canvasKrasna, T.canvasKrasna, { pennant: T.pennantKrasna, seg: 12 });
  BUILD.card(T.campfire, -10.4, 0, 1.6, { s: 1.0 }); BUILD.flame(-10.4, 0.2, 1.62, 0.9, true); BUILD.glow(-10.4, 0.7, 1.65, 1.6, 0xff8a2a, 0.35);
  BUILD.light(new THREE.PointLight(0xff8a3c, 3.0, 0, 2), -10.4, 0.9, 1.9, { flicker: 7 }); FEST.smoke(room, -10.4, 0.9, 1.5, 1.0);
  BUILD.box(-11.6, -10.9, 0, 0.32, 0.6, 0.95, T.woodPost); room.interact('campfire', -10.4, 1.4, KZ, 0.8, () => say('campfire'));
  /* the League: the barge moored at the bank, a gangplank, crates of river goods, the League's banner */
  BUILD.card(T.barge, -6.0, 0, -6.2, { cast: true }); BUILD.box(-6.3, -5.5, 0.05, 0.12, -5.6, -3.0, T.woodDark, { cast: false });
  for (const [x, z, t] of [[-4.0, 0.8, T.crate], [-3.4, 1.3, T.barrel], [-7.6, 1.0, T.sacks]]) BUILD.card(t, x, 0, z, { s: 0.9 });
  BUILD.box(-7.25, -7.15, 0, 4.2, 0.45, 0.55, T.woodPost); BUILD.windCard(T.bannerLeague, -7.2, 1.9, 0.6, 'wave', 0.08, { cast: false });
  room.interact('barge', -6.0, 1.6, KZ, 0.6, () => say('barge'));
  /* King Gniewomir's pavilion: red and white, open at the front, a carpet, his table of maps, Krasna's eagle at the door */
  BUILD.tent(0.2, -0.95, 2.7, 2.6, 2.1, T.canvasKrasna, T.canvasKrasna, { open: 1.9, valance: T.awningRed, pennant: T.pennantKrasna });
  BUILD.rug(T.rugA, -1.6, 2.0, -2.6, 0.9, { y: 0.01 });
  BUILD.card(T.campTable, 0.2, 0, -0.75, { s: 1.0 }); BUILD.card(T.chair, 0.2, 0, -1.45, { s: 1.0 });
  BUILD.card(T.candleStand, -1.4, 0, -1.6, { s: 0.8 }); BUILD.flame(-1.4, 1.35, -1.58, 0.25); BUILD.light(new THREE.PointLight(0xffb070, 1.6, 0, 2), -1.2, 1.5, -1.0, { flicker: 6 });
  for (const x of [-2.7, 3.1]) { BUILD.box(x - 0.06, x + 0.06, 0, 4.4, 1.55, 1.65, T.woodPost); BUILD.windCard(T.bannerKrasna, x, 2.0, 1.7, 'wave', 0.08, { cast: false }); }
  room.interact('pavilion', 1.8, 3.4, KZ, 0.6, () => say('pavilion'));
  room.interact('pact', -0.9, 2.6, KZ, 0.6, () => CAMP.pact()).label = 'Discuss the pact';
  /* Prince Mściwoj's arming stand, and a barrel to arm-wrestle on */
  BUILD.card(T.swordRack, 5.0, 0, 0.9, { s: 1.0 }); BUILD.card(T.barrel, 3.4, 0, 1.45, { s: 1.0 });
  room.interact('wrestle', 3.4, 1.9, KZ, 0.6, () => CAMP.wrestle(room)).label = 'Arm-wrestle the prince';
  /* Queen Wiesława's tent: lilac and white, the flap half open */
  BUILD.tent(7.2, -0.6, 1.8, 2.1, 1.6, T.canvasLilac, T.canvasLilac, { open: 1.1, valance: T.awningBlue, pennant: T.pennantKrasna });
  /* the horse lines: a rail, the prince's grey (he can be petted) and a bay, hay, buckets */
  BUILD.box(9.6, 13.0, 0.95, 1.05, 0.25, 0.35, T.woodPost); for (const x of [9.7, 11.3, 12.9]) BUILD.box(x - 0.06, x + 0.06, 0, 1.05, 0.24, 0.36, T.woodPost);
  const grey = BUILD.card(T.horseGrey, 10.6, 0, 0.75, { s: 1.0 });
  BUILD.pet(grey, { id: 'horse', label: 'Pet the grey destrier', frames: [T.horseGreyNuzzle, T.horseGreyEar], rate: 2, dur: 3.0, sound: 'snort', headY: 2.0, stand: 1.75,
    says: ['(He lowers his great head and blows warm air into the king’s palm.)', '(Hrrrff.)', '(He leans into the hand, then tries to eat the king’s sleeve.)'],
    lines: ['The prince’s horse. Better manners than the prince.', 'You’re carrying him tomorrow. Carry him gently.'] });
  BUILD.card(T.horseBay, 12.3, 0, 0.55, { s: 1.0 }); BUILD.card(T.hay, 13.6, 0, 0.3, { s: 0.8 }); BUILD.card(T.bucket, 11.4, 0, 1.4); BUILD.card(T.bucket, 9.4, 0, 1.2);
  room.interact('horses', 12.3, 2.4, KZ, 0.6, () => say('horses'));
  /* the black tent: no banner, no pennant, the flap laced shut */
  BUILD.tent(14.8, -0.7, 1.6, 2.0, 1.5, T.canvasBlack, T.canvasBlack, { seg: 12 });
  room.interact('blackTent', 14.8, 3.0, KZ, 0.6, () => say('blackTent'));
  /* the near side: barrels, hay, a weapon rack, a fence */
  BUILD.card(T.barrel, -12.4, 0, 7.2, { s: 1.1, cast: false }); BUILD.card(T.hay, 2.8, 0, 7.4, { s: 1.0, cast: false }); BUILD.card(T.halberds, 9.2, 0, 7.2, { s: 1.0, cast: false });
  BUILD.card(T.hurdle, -4.6, 0, 7.1, { w: 2.6, h: 0.8, cast: false }); BUILD.card(T.cartWheel, 13.6, 0, 7.4, { s: 1.1, cast: false, rx: -0.12 });
  FEST.lights(room);
  BUILD.motes({ n: 50, boxes: [[-14, 14, 0.3, 3.4, 0.5, 3.6, 0.6]], col: 0xfff0c0 });
  room.update(0, 0);
  return BUILD.end();
};
CAMP.TALKERS = [['gniewomir', 'Talk to King Gniewomir'], ['msciwoj', 'Talk to Prince Mściwoj'], ['wieslawa', 'Talk to Queen Wiesława'], ['ottokar', 'Talk to Ser Ottokar'], ['jarek', 'Talk to Jarek'],
  ['squire', 'Talk to the squire'], ['groom', 'Talk to the groom'], ['kSoldierA', 'Talk to the soldier'], ['kSoldierB', 'Talk to the soldier']];
CAMP.onEnter = function () { if (!CUT.playing) SCENE.caption(...this.caption); FEST.talkers(this, CAMP.TALKERS); };
CAMP.onUpdate = function () { FEST.follow(this); };
/* ---------------------------------------------------------------- the pact */
CAMP.pact = async function () {
  const A = CAST.A, G = A.gniewomir, K = SCENE.player; if (!G) return; SCENE.lock++;
  try {
    if (FEST.pact) { await SCENE.say(G, { tonight: 'Signed in my head already, boy. At the feast we do it with ink.', after: 'After the feast, then. I’ll drink to it first. I always do.', refuse: 'You refused me. I’ve not been refused since my mother. I find I don’t mind it as much as I should.' }[FEST.pact], { wait: true }); return; }
    await SCENE.talk([[G, 'My knights in your two pass-forts. My road toll-free through your mountains. Your levies at my call, if Hal comes. And Hal will never come.'], [K, 'And Lodmir under your thumb.'],
      [G, 'Under my shield, boy. Thumbs are for small kings.']]);
    const i = await FEST.ask(['Sign it at the feast tonight', 'Sign after the feast, with changes', 'Refuse it']); FEST.pact = ['tonight', 'after', 'refuse'][i];
    await SCENE.talk([[K, ['At the feast, then. In front of everyone.', 'After the feast. One fort, not two. No levies. Ten years, not forever.', 'No. Lodmir has kept its own pass for three hundred years.'][i]],
      [G, ['Ha! A performance! You’re learning, Radomir.', 'One fort, ten years. You bargain like your wife. We’ll argue it over the wine.', 'Your father said the same, the year before Hal came. Think on that, and come back.'][i]]]);
  } finally { SCENE.lock--; }
};
/* ---------------------------------------------------------------- arm-wrestling the prince: two pulls on the meter */
CAMP.wrestle = async function (room) {
  const A = CAST.A, M = A.msciwoj, K = SCENE.player; if (!M) return; SCENE.lock++;
  try {
    await FEST.cam(room, { focus: 3.6, dist: 10, y: 2.3, look: 1.8 }, 1.0);
    await SCENE.say(M, FEST.wrestle ? 'Again? Good. My arm was getting bored.' : 'Elbow on the barrel. Don’t be gentle, I’ll be offended.', { wait: true });
    K.faceTo(M.x); M.faceTo(K.x); K.act('Interact', 0, null); M.act('Interact', 0, null);
    const a = await FEST.meter('Pull! (E or tap, in the gold)'); AUDIO.sfx('thud', { gain: 0.6 });
    const b = await FEST.meter('And again!'); AUDIO.sfx('thud', { gain: 0.8 });
    const won = (a + b) / 2 > 0.62; FEST.wrestle = won ? 'won' : 'lost';
    if (won) { AUDIO.sfx('cheer', { gain: 0.5, dur: 1.8 }); await SCENE.talk([[M, 'Ha! Ha! By the eagle, a mountain king with an arm on him. Don’t tell my father.'], [K, 'I’ll tell everyone.']]); }
    else await SCENE.talk([[M, 'There. Krasna wins. Again, by tradition. You lasted longer than the last king.'], [K, 'How long did the last one last?'], [M, 'He was eight. He cried.']]);
  } finally { await FEST.cam(room, null, 0.8); SCENE.lock--; }
};
