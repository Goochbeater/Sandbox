/* THE CHAPEL — the lower bailey's chapel, down the cloister stair from the gardens. A nave of three bays with the altar at
   the far end. The choir stalls face each other across the aisle, so the people in them are seen in profile, like the
   court. Left to right along the back wall:
     A arch to the garden · B the stoup, the saint's lancet, Our Lady · C the pilaster, the altar, the reredos under the rose
     D the bishop, the swan's lancet · E the confessional on the right
   The walking line runs in front of the stalls. Saintess Dorota keeps the chancel rail; Halina sits in the stall nearest
   the aisle. The king's replies to Dorota are his choices (NIGHT.ask): what he says, and how far he goes, is the player's. */
const CHAPEL = SCENE.addRoom(new Room('chapel', { X0: -12, X1: 12, CEIL: 7.6, KZ: 3.0, cam: { y: 2.8, look: 2.55, dist: 19.4, fov: 19 }, exposure: 0.92, reflK: 0.85,
  music: 'castle', ambience: { fire: 0.25, tone: 0.2 }, acoustics: { size: 3.6, wet: 0.5 }, surface: 'stone',
  caption: ['The Chapel', 'Vespers, and nobody in a hurry'] }));
CHAPEL.ENTRY = -9.6;   // where the king arrives from the garden's cloister stair
CHAPEL.met = false; CHAPEL.queenMet = false; CHAPEL.priestMet = false; CHAPEL.flirt = 0; CHAPEL.cold = 0;   // kept in the save: see GAME.state
CHAPEL.LINES = {
  arch: ['Back out to the garden. The sun is still up there, being generous to somebody else.'],
  stoup: ['Holy water. Dip your fingers and make the sign. Don’t leave them wet for the saintess to notice.'],
  glass: ['Saints in coloured glass, flat as playing cards and twice as holy. The blue one is Saint Wanda, who was never seen with her hair up, according to the sermons.'],
  swan: ['The swan of our house, white on red, in glass. The glazier was paid in silver and wrote the swan a better neck than God gave it.'],
  rose: ['Three metres of glass, every piece of it looking at the altar. That is more attention than I have ever had in this kingdom.'],
  virgin: ['The Lady in blue. She has been looking at the same wall for two hundred years and has never once complained.'],
  bishop: ['Bishop Stanisław. Martyred for refusing a bishopric he had already been promised. Lodmir has never been good with paperwork.'],
  altar: ['Linen, gold thread and a candle for every sin the chapel has heard this month. The lilies on the frontal took a whole winter.'],
  lamp: ['The sanctuary lamp. It burns for as long as somebody remembers to fill it.'],
  votive: ['Light a candle for the rain to stop. Light another for the saintess, if you are honest about it.'],
  confess: ['Whisper your sins through the lattice, Your Grace. I will decide which of them are worth penance.'],
  confessFlirt: ['The lattice is a poor screen for a man with hands like yours.'],
};
CHAPEL.TALK = {
  first: [['dorota', 'Your Grace. Out of the rain and into God’s house. That is either devotion or a very good excuse.'],
    ['dorota', 'Don’t look so caught. Everyone in the lower town knows what you do on the Sabbath: nothing, very slowly.']],
  options: ['I came for the quiet.', 'Your altar is the only thing in here I can’t stop looking at.', 'I came for you, Saintess. The chapel is an excuse.'],
  replies: [
    [['dorota', 'Quiet. Then I’ll keep my voice low and my candles lower, and you can pretend I’m part of the altar.']],
    [['dorota', 'Then you have found the one thing in Lodmir worth staring at, and you are doing it under the Mother’s nose.']],
    [['dorota', 'Bold. My confessor would beat you for the sentiment. I am inclined to take it under advisement.']]],
  queen: [null,
    [['queen', 'Dorota. The altar is for prayer. Your neckline has been asked to kneel.']],
    [['queen', 'Radomir.'], ['queen', 'I am sitting in the house of God with my hands folded, and you are doing this in front of me.']]],
  close: [['dorota', 'Vespers, Your Grace. The confessional is open after. Bring the whole list.']],
  again: {
    options: ['Tell her you’ll come to the box after vespers.', 'Tell her you’ll pray instead.'],
    replies: [
      [['dorota', 'Then I’ll leave the lattice open a finger’s width. Mind your hands, they’re not as holy as your face.']],
      [['dorota', 'Pray, then. I’ll be listening at the lattice, if you change your mind.']]],
  },
  queenAgain: [['queen', 'Still at it, the two of you. I shall have to start counting.']],
  queenFirst: ['Radomir. You’re standing in the aisle like a man waiting to be hanged.', 'Sit. Pray, if you like. God listens better than your steward.'],
  queenWarm: ['Still in the one dry corner of the city. I approve.', 'Kazik says the crows like this chapel. I think they only like the candles.'],
  queenCold: ['I see Dorota is still preaching to you.', 'Some of us come here to pray, you know. I count the ones who don’t.'],
  priestFirst: ['Your Grace. Vespers begins when the Saintess has finished her sermon, which will be some time yet.', 'The Mother hears everything said in this chapel. I hear it too, and I write it down.'],
  priestWarm: ['The chapel is open to all of Lodmir. I wish the sinners were quieter about it.', 'Pray for the rain to stop, Your Grace. The river does not care what the court wants.'],
  priestFlirt: ['I have heard thirty years of confessions, Your Grace. Yours will be the short one.', 'The lower town says the Saintess is here to pray. The lower town is wrong about a great many things.'],
  guard: ['Halt. Nobody passes the rail without the Saintess’s leave.', 'Nobody has ever had her leave. We are told that is a compliment.'],
};
CHAPEL.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, CE = room.CEIL, KZ = room.KZ, L = room.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle(k, L[k]));
  /* shell: plaster walls, a stone plinth, the ultramarine vault and its ribs */
  BUILD.plane('z', X0, X1, 0, CE, 0, T.chWall);
  BUILD.plane('z', X0, X1, 0.5, 1.9, 0.01, T.hallWainscot);   // the carved panelling, as in the throne hall
  BUILD.plane('z', X0, X1, 5.55, 5.86, 0.02, T.frieze, { rough: 0.8 });   // the gold rosette frieze under the vault
  for (const [x, ax] of [[X0, 'x+'], [X1, 'x-']]) BUILD.plane(ax, 0, 10, 0, CE, x, T.chWall);
  BUILD.box(X0, X1, 0, 0.5, 0, 0.3, T.ashlar);
  room.floorMat = BUILD.reflective(T.chFlags, { k: 1.0, rough: 0.35 }); BUILD.plane('y+', X0, X1, 0, 12, 0, T.chFlags, { mat: room.floorMat, layer: 2 });
  BUILD.plane('y-', X0, X1, 0, 14, CE, T.chVault);
  for (let x = X0 + 1.5; x < X1; x += 3) BUILD.box(x - 0.15, x + 0.15, CE - 0.55, CE, 0, 9, T.ashlar, { cast: false });
  /* the back wall: pilasters, the arch to the garden, the stoup, the lancets, the statues */
  for (const x of [-3.4, 3.4]) BUILD.box(x - 0.3, x + 0.3, 0, CE, 0, 0.45, T.ashlar);
  BUILD.card(T.arch, -10.6, 0, 0.02, { basic: true, k: 1.0, cast: false });
  room.interact('arch', -10.6, 3.2, KZ, 1.0, () => { SCENE.lock++; SCENE.say(SCENE.player, L.arch[0]).then(() => { SCENE.lock--; GAME.save(); SCENE.go('garden', { x: -7.75, face: 1 }); }); });
  BUILD.light(new THREE.PointLight(0xffa860, 4, 0, 2), -10.6, 1.6, 0.8, { flicker: 5 });
  BUILD.box(-9.2, -8.5, 0, 0.9, 0.9, 1.4, T.ashlar); BUILD.card(T.chStoup, -8.85, 0.9, 1.15, { cast: false });
  room.interact('stoup', -8.85, 1.6, KZ, 0.9, () => say('stoup'));
  for (const [x, tex] of [[-8.4, T.chGlassSaint], [-5.2, T.chGlassSwan], [5.2, T.chGlassSwan], [8.4, T.chGlassSaint]]) {
    BUILD.card(tex, x, 1.8, 0.03, { basic: true, k: 1.25, cast: false }); BUILD.glow(x, 3.5, 0.3, 4.0, 0xffe0a0, 0.14);
    BUILD.light(new THREE.PointLight(0xb8d0ff, 2.5, 0, 2), x, 3.2, 1.2);
    BUILD.shaft(x, 4.8, 0.6, 1.2, 6, 0.16, [-0.42, 0, 0.3], 0xc8d8ff); BUILD.shaft(x + 0.4, 4.6, 0.5, 0.6, 6, 0.1, [-0.42, 0.1, 0.3], 0xc8d8ff); }
  room.interact('glass', -8.4, 3.2, KZ, 1.0, () => say('glass'));
  room.interact('swan', -5.2, 3.2, KZ, 1.0, () => say('swan'));
  for (const [x, tex, who] of [[-6.8, T.chStatueA, 'virgin'], [6.8, T.chStatueB, 'bishop']]) {
    BUILD.box(x - 0.4, x + 0.4, 0, 0.5, 0.05, 0.7, T.ashlar); BUILD.card(tex, x, 0.5, 0.42);
    room.interact(who, x, 2.7, KZ, 1.0, () => say(who)); }
  /* the altar: two steps, the table in red brocade and white linen, a tabernacle with a gilt cross, candles, the reredos */
  BUILD.box(-2.25, 2.25, 0, 0.16, 0, 1.0, T.ashlar); BUILD.box(-1.9, 1.9, 0.16, 0.3, 0, 0.8, T.ashlar);
  BUILD.box(-1.5, 1.5, 0.3, 1.02, 0.1, 0.72, T.chAltarCloth, { front: BUILD.std(T.chAltarFront) });
  BUILD.box(-0.36, 0.36, 1.02, 1.42, 0.2, 0.5, T.gilt, { rough: 0.4, metal: 0.5 });
  BUILD.box(-0.05, 0.05, 1.42, 1.8, 0.33, 0.37, T.gilt, { rough: 0.4, metal: 0.5 }); BUILD.box(-0.18, 0.18, 1.55, 1.6, 0.33, 0.37, T.gilt, { rough: 0.4, metal: 0.5 });
  for (const x of [-1.7, 1.7]) { BUILD.card(T.candleStand, x, 0.3, 0.6, { s: 0.5 });
    for (const [dx, y] of [[-0.12, 1.02], [0, 1.14], [0.12, 1.02]]) BUILD.flame(x + dx, y, 0.61, 0.2); }
  BUILD.card(T.chReredos, 0, 1.0, 0.04, { cast: false });
  BUILD.card(T.chRose, 0, 3.8, 0.03, { basic: true, k: 1.3, cast: false });
  BUILD.glow(0, 5.0, 0.3, 3.4, 0xffd890, 0.16);
  room.interact('altar', -1.2, 1.7, KZ, 1.0, () => say('altar'));
  room.interact('rose', 0, 4.7, KZ, 1.0, () => say('rose'));
  /* the sanctuary lamp on its chain, red and low, and the chancel rail across the aisle */
  BUILD.box(-1.71, -1.69, 3.2, CE, 0.66, 0.74, T.woodDark, { cast: false }); BUILD.card(T.chLamp, -1.7, 2.6, 0.7, { cast: false });
  BUILD.glow(-1.7, 2.7, 0.7, 0.9, 0xff3a2a, 0.5); BUILD.light(new THREE.PointLight(0xff4030, 1.5, 0, 2), -1.7, 2.5, 0.8);
  room.interact('lamp', -1.7, 2.8, KZ, 0.9, () => say('lamp'));
  for (let x = -2.2; x <= 2.21; x += 0.2) BUILD.box(x - 0.03, x + 0.03, 0, 0.95, 1.02, 1.08, T.woodDark);
  BUILD.box(-2.25, 2.25, 0.95, 1.02, 1.0, 1.1, T.woodDark); BUILD.box(-2.33, -2.17, 0, 1.1, 0.98, 1.12, T.woodDark); BUILD.box(2.17, 2.33, 0, 1.1, 0.98, 1.12, T.woodDark);
  /* the choir stalls, left and right of the aisle, facing it: seats, tall backs, carved stall ends */
  for (const s of [-1, 1]) {
    const xs = s * 2.8;
    BUILD.box(s < 0 ? -3.6 : 3.38, s < 0 ? -3.38 : 3.6, 0, 1.9, 0.5, 2.5, T.chPew);
    for (const zc of [0.75, 1.25, 1.75, 2.25]) {
      BUILD.box(xs - 0.55, xs + 0.55, 0.42, 0.5, zc - 0.22, zc + 0.22, T.chPew);
      BUILD.box(xs - 0.5, xs + 0.5, 0, 0.42, zc - 0.2, zc + 0.2, T.chPew); }
  }
  /* the nave: the aisle runner, a votive stand by the lancets */
  BUILD.rug(T.runnerZ, -1.05, 1.05, 0.9, 7.5, { rv: 6 });
  BUILD.card(T.chVotive, -4.2, 0, 0.7, { s: 1.0, cast: false });
  for (const [px, py] of [[7, 1.25], [19, 1.25], [31, 1.25], [7, 0.875], [19, 0.875], [31, 0.875]]) BUILD.flame(-4.2 - 0.625 + px / 32, py, 0.7, 0.2);
  room.interact('votive', -4.2, 1.8, KZ, 1.0, () => say('votive'));
  /* a prayer bench under the right-hand lancet and a lectern for the readings, as in the throne hall's bench and lectern */
  BUILD.box(7.6, 9.1, 0, 0.46, 0.2, 0.6, T.woodDark, { front: BUILD.std(T.bench) }); BUILD.box(7.55, 9.15, 0.46, 0.52, 0.16, 0.64, T.woodPost);
  BUILD.card(T.lectern, -5.9, 0, 1.45, { s: 0.9 });
  /* the confessor's desk in front of the box, where the confessional scene is played (g29): a wood body, a velvet top */
  BUILD.box(10.0, 10.9, 0, 1.1, 2.0, 2.4, T.woodDark); BUILD.box(9.95, 10.95, 1.1, 1.13, 1.95, 2.45, T.velvet, { cast: false });
  /* the confessional on the right, its lattice facing the aisle */
  BUILD.box(9.4, 11.5, 0, 2.2, 0.1, 1.3, T.woodDark, { front: BUILD.std(T.chConfess) }); BUILD.box(9.3, 11.6, 2.2, 2.35, 0.0, 1.45, T.woodDark);
  room.interact('confess', 10.4, 2.5, KZ, 1.0, () => CHAPEL.confess());
  /* the foreground, close to the lens and out of focus, as in the throne hall: two piers and a brazier for the depth of field */
  for (const [x, z] of [[-7.6, 7.3], [10.9, 7.0]]) { const g = new THREE.CylinderGeometry(0.48, 0.48, CE, 16); g.translate(x, CE / 2, z); BUILD.planarUV(g, T.ashlar); BUILD.add(new THREE.Mesh(g, BUILD.std(T.ashlar, { col: 0xb8b0a4 })), { cast: false });
    BUILD.box(x - 0.6, x + 0.6, 0, 0.4, z - 0.6, z + 0.6, T.ashlar, { cast: false }); }
  BUILD.card(T.brazier, -10.4, 0, 7.8, { s: 1.5, cast: false }); BUILD.flame(-10.4, 0.66, 7.81, 0.9, true); BUILD.glow(-10.4, 1.1, 7.85, 1.4, 0xff8a2a, 0.3);
  BUILD.light(new THREE.PointLight(0xff8a3c, 4, 0, 2), -10.4, 1.3, 7.5, { flicker: 7 });
  /* church banners on the pilasters, hung from gilt rods above the torches, as the throne hall hangs its banners */
  for (const x of [-3.4, 3.4]) { BUILD.card(T.chBanner, x, 2.85, 0.56, { cast: false }); BUILD.box(x - 0.72, x + 0.72, 5.78, 5.86, 0.5, 0.62, T.gilt, { cast: false }); }
  /* a stone niche behind each statue */
  for (const x of [-6.8, 6.8]) BUILD.card(T.chNiche, x, 0.5, 0.03, { cast: false });
  /* torches on the pilasters and between the statues: a bracket card, a flame, a glow and a warm light, as the throne has */
  for (const [x, y, z] of [[-3.4, 2.25, 0.47], [3.4, 2.25, 0.47], [-6.8, 3.2, 0.1], [6.8, 3.2, 0.1]]) {
    BUILD.card(T.sconce, x, y, z, { cast: false }); BUILD.flame(x, y + 0.23, z + 0.07, 0.6); BUILD.glow(x, y + 0.43, z + 0.15, 1.1, 0xffa050, 0.42);
    BUILD.light(new THREE.PointLight(0xffa050, 4.2, 0, 2), x, y + 0.5, z + 0.9, { flicker: 6 + x * 0.1 }); }
  /* two shadow-casting spots, as the throne has: the light through the rose onto the altar, and the saint's window's cool light */
  room.lights.rose = BUILD.shadow(BUILD.light(new THREE.SpotLight(0xffe2b0, 110, 0, 0.5, 0.8, 2), 0, 6.8, 3.6), R.q === 'low' ? 512 : 1024);
  room.lights.rose.target.position.set(0, 1.4, 0.4);
  room.lights.winL = BUILD.shadow(BUILD.light(new THREE.SpotLight(0x9ab8ff, 80, 0, 0.6, 0.8, 2), -7.0, 6.0, 2.6), R.q === 'low' ? 512 : 1024);
  room.lights.winL.target.position.set(-7.0, 0, 0.8);
  /* the chandeliers over the walk line, as in the throne room */
  for (const cx of [-6.0, 6.0]) {
    const iron = BUILD.std(null, { col: 0x2a2622, rough: 0.5, metal: 0.6 }), y = 5.0, z = KZ - 0.2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.035, 6, 26), iron); ring.rotation.x = Math.PI / 2; ring.position.set(cx, y, z); BUILD.add(ring, { cast: false });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = cx + Math.sin(a) * 0.7, zz = z + Math.cos(a) * 0.7;
      const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), BUILD.std(null, { col: 0xf0e8d6, rough: 0.7 })); cd.position.set(x, y + 0.1, zz); BUILD.add(cd, { cast: false });
      BUILD.flame(x, y + 0.17, zz, 0.26); }
    BUILD.glow(cx, y + 0.25, z, 1.8, 0xffb070, 0.22);
    BUILD.light(new THREE.PointLight(0xffb070, 6, 0, 2), cx, y + 0.1, z, { flicker: 8 }); }
  /* the choir and the people in it: Halina and Dorota are placed by their specs (g40) */
  /* the priest in the aisle, and the castle's guards at the two ends of the nave */
  room.interact('priest', -1.1, 2.8, KZ, 1.0, () => CHAPEL.priest()).label = 'Talk to Father Ambroży';
  for (const [id, x] of [['cguardL', -8.1], ['cguardR', 8.1]]) room.interact(id, x, 3.0, KZ, 1.0, () => SCENE.say(CAST.A[id], SCENE.cycle('guard', CHAPEL.TALK.guard))).label = 'Talk to the guard';
  room.interact('queen', -2.8, 2.6, KZ, 0.9, () => CHAPEL.queen()).label = 'Talk to Halina';
  room.interact('dorota', 1.8, 2.7, KZ, 1.0, () => CHAPEL.dorota()).label = 'Talk to Saintess Dorota';
  /* light: the cool glass, the warm candles, a hemisphere for the vault, a fill from the lens side */
  BUILD.light(new THREE.HemisphereLight(0x8a9ac0, 0x3a2a1c, 1.5), 0, 6, 0);
  const fill = BUILD.light(new THREE.DirectionalLight(0xa8b8e0, 0.6), 2, 5, 15); fill.target.position.set(0, 1.5, 0);
  BUILD.light(new THREE.PointLight(0xffc890, 3, 0, 2), 0, 2.4, 0.9, { flicker: 3 });
  room.rim = [0, 2.2, 1.2, 0.5, 9, 0xffd8a0, null];
  room.shadowSrc = [0, 5.0, 4.0, 7.5];
  BUILD.motes({ n: 110, boxes: [[-11, -3, 0.5, 5, 0.5, 4, 0.3], [3, 11, 0.5, 5, 0.5, 4, 0.3], [-12, 12, 0.6, 5, 1, 4, 0.25], [-1.5, 1.5, 1.2, 4.5, 0.5, 3, 0.3]], col: 0xfff2d8 });
  room.update(0, 0);
  return BUILD.end();
};
CHAPEL.onEnter = function () { if (!CUT.playing) SCENE.caption(...this.caption); };
/* Dorota. The first visit: a greeting, then the king's choice of what to say, then her answer, then Halina if the king
   flirted. Later visits: a shorter exchange with another choice. The king only ever says what the player picks. */
CHAPEL.dorota = async function () {
  const A = CAST.A, K = SCENE.player, D = A.dorota, T = CHAPEL.TALK, who = (k) => (k === 'king' ? K : k === 'dorota' ? D : A.queen);
  K.faceTo(D.x); D.faceTo(K.x); D.lookYaw = Math.sign(K.x - D.x) * 0.6;
  SCENE.lock++;
  try {
    if (!CHAPEL.met) {
      CHAPEL.met = true;
      await SCENE.talk(T.first.map(([k, t]) => [who(k), t]));
      const pick = await NIGHT.ask(T.options);
      await SCENE.talk([[K, T.options[pick]], ...T.replies[pick].map(([k, t]) => [who(k), t])]);
      if (pick > 0) { CHAPEL.flirt += pick; CHAPEL.cold++; await SCENE.talk(T.queen[pick].map(([k, t]) => [who(k), t])); }
      await SCENE.talk(T.close.map(([k, t]) => [who(k), t]));
    } else {
      const pick = await NIGHT.ask(T.again.options);
      await SCENE.talk([[K, T.again.options[pick]], ...T.again.replies[pick].map(([k, t]) => [who(k), t])]);
      if (pick === 0) { CHAPEL.flirt++; CHAPEL.cold++; await SCENE.talk(T.queenAgain.map(([k, t]) => [who(k), t])); }
    }
  } finally { D.lookYaw = null; SCENE.lock--; }
};
/* the confessional: a few lines through the lattice. Once the saintess has flirted with him enough (CHAPEL.flirt, two or more),
   the king may take her up on the offer, behind the desk; that scene is CONF (g29), behind the age gate */
CHAPEL.confess = async function () {
  const key = CHAPEL.flirt ? 'confessFlirt' : 'confess';
  if (CHAPEL.flirt < 2) { SCENE.say(SCENE.player, SCENE.cycle(key, CHAPEL.LINES[key])); return; }
  if (await NIGHT.ask(['Confess to her, behind the desk', 'Not today']) === 0) CONF.start();
};
/* Father Ambroży, in the aisle before the rail. The first time he speaks about vespers; after that he has opinions about the
   king's company, and the flirting in particular (CHAPEL.flirt). */
CHAPEL.priest = async function () {
  const P = CAST.A.priest, K = SCENE.player, T = CHAPEL.TALK;
  P.faceTo(K.x); K.faceTo(P.x);
  SCENE.lock++;
  try {
    if (!CHAPEL.priestMet) { CHAPEL.priestMet = true; await SCENE.talk(T.priestFirst.map((t) => [P, t])); }
    else await SCENE.say(P, SCENE.cycle('priest', CHAPEL.flirt > 0 ? T.priestFlirt : T.priestWarm));
  } finally { SCENE.lock--; }
};
/* Halina, in her stall. Her lines are cooler once the king has flirted with the saintess (CHAPEL.cold). */
CHAPEL.queen = async function () {
  const Q = CAST.A.queen, T = CHAPEL.TALK;
  SCENE.lock++;
  try {
    if (!CHAPEL.queenMet) { CHAPEL.queenMet = true; await SCENE.talk(T.queenFirst.map((t) => [Q, t])); }
    else await SCENE.say(Q, SCENE.cycle('queen', CHAPEL.cold > 0 ? T.queenCold : T.queenWarm));
  } finally { SCENE.lock--; }
};
