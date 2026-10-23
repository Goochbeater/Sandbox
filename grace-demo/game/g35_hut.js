/* THE WOMAN'S HUT — a crooked hut at the end of the path through the wood. Inside: a hearth with a violet cauldron, a ritual rug
   worn into the planks, herbs hung head down on cords, a shelf of jars with names on the lids, a crystal orb on a table, the
   window that faces a moon that isn't where the moon is, and the Woman herself by the fire. Violet and plum throughout: the
   light is violet from the hearth, the window and the orb, the motes are violet, and the wattle walls hold a faint glow.
   Only the king comes here. No one else in the household has a home in this room, and the path into the trees is his alone. */
const HUT = SCENE.addRoom(new Room('hut', { X0: -10, X1: 10, CEIL: 5.2, KZ: 2.6, cam: { y: 2.4, look: 2.2, dist: 19.4, fov: 19 }, exposure: 1.0, reflK: 0.5,
  music: 'title', ambience: { wind: 0.2, tone: 0.3 }, acoustics: { size: 2.4, wet: 0.35 }, surface: 'wood',
  caption: ['The Woman’s Hut', 'Only the king comes this way'] }));
HUT.ENTRY = -10.6;   // from the path: the door is in the back wall, at the left
HUT.LINES = {
  door: ['Back out into the wood, where the light is. The dark is not going anywhere.'],
  cauldron: ['Something green and something violet, simmering since the rain began. Do not put your finger in it. Your finger has done enough.'],
  orb: ['A ball of glass that is not glass. There is a fog inside it that is almost a face, and it is looking at me.'],
  herbs: ['Dried herbs and lavender, hung head down to keep their sleep. Some of them are not herbs.'],
  shelves: ['Jars with names written on the lids. One says Bolesław. Its lid is not screwed down.'],
  rug: ['A ring of runes worn into the planks by feet that stood here a long time ago, most of them bare.'],
  window: ['The window faces a moon that is not where the moon is in the sky.'],
  hearth: ['The fire is violet at the heart and gold at the edge, and it does not seem to need wood.']
};
HUT.TALK = {
  first: [['witch', 'You came alone. Good. Children break everything they touch, and the rain only listens to people who come by themselves.'],
    ['witch', 'Sit by the fire, Radomir. You look like a man who has been carrying his father’s sword in his sleep.']],
  more: ['The rain will stop for you when you have paid what you promised. Not before, and not for less.',
    'Have you thought about what you hold dearest? Do not answer. I already know it is not the crown.',
    'Your wife bakes bread on a Sunday and prays for you on the others. The saints are fond of her. I am fond of her too.']
};
HUT.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, CE = room.CEIL, KZ = room.KZ, L = room.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle(k, L[k]));
  /* the shell: wattle walls, a dark plank floor tinted violet, a black vault with beams */
  BUILD.plane('z', X0, X1, 0, CE, 0, T.hutWall);
  for (const [x, ax] of [[X0, 'x+'], [X1, 'x-']]) BUILD.plane(ax, 0, 10, 0, CE, x, T.hutWall);
  BUILD.plane('y+', X0, X1, 0, 12, 0, T.woodDark, { mat: BUILD.std(T.woodDark, { col: 0x8a70b0, rough: 0.8 }), layer: 2 });
  BUILD.plane('y-', X0, X1, 0, 12, CE, T.hutWall);
  for (let x = X0 + 1.2; x < X1; x += 2.6) BUILD.box(x - 0.14, x + 0.14, CE - 0.45, CE, 0, 9, T.beam, { cast: false });
  /* the door to the wood, in the back wall at the left: an arch with violet light beyond it */
  BUILD.card(T.arch, -8.6, 0, 0.02, { basic: true, k: 0.6, col: 0x7a5ab8, cast: false });
  BUILD.light(new THREE.PointLight(0x9b5cff, 3, 0, 2), -8.6, 1.6, 0.8, { flicker: 5 });
  room.interact('door', -8.6, 2.4, KZ, 1.0, () => { SCENE.lock++; SCENE.say(SCENE.player, L.door[0]).then(() => { SCENE.lock--; GAME.save(); SCENE.go('wood', { x: WOOD.ENTRY, face: 1 }); }); }).label = 'Back out into the wood';
  /* the window: stained glass tinted violet, a glow, a shaft and a shadow-casting spot for the moon */
  BUILD.card(T.stained, 6.6, 1.7, 0.02, { basic: true, k: 1.2, col: 0x9a7aff, cast: false }); BUILD.glow(6.6, 3.2, 0.3, 3.2, 0x9b5cff, 0.25);
  BUILD.shaft(6.6, 4.4, 0.5, 1.0, 5, 0.14, [-0.42, 0, -0.3], 0x9b5cff);
  room.lights.moon = BUILD.shadow(BUILD.light(new THREE.SpotLight(0x9b7cff, 90, 0, 0.5, 0.8, 2), 6.6, 4.8, 1.2), R.q === 'low' ? 512 : 1024);
  room.lights.moon.target.position.set(5.6, 0, 1.2);
  room.interact('window', 6.6, 2.6, KZ, 1.0, () => say('window'));
  /* the shelf of jars, the bookcase tinted plum */
  BUILD.box(-6.6, -4.4, 0, 2.6, 0, 0.5, T.bookcase, { front: BUILD.std(T.bookcase, { col: 0xa890d0 }) });
  room.interact('shelves', -5.5, 1.8, KZ, 1.0, () => say('shelves'));
  /* herbs hung from the beams on cords */
  for (const x of [-3.0, -1.8, 2.2]) { BUILD.box(x - 0.01, x + 0.01, 3.9, CE, 0.9, 0.92, T.woodPost, { cast: false }); BUILD.card(T.herbBundle, x, 3.0, 0.9, { s: 1.0 }); }
  room.interact('herbs', -1.8, 3.0, KZ, 1.2, () => say('herbs'));
  /* the hearth and the cauldron: a stone hearth, the brew violet, a violet glow and light that breathes */
  BUILD.box(-0.8, 1.2, 0, 0.9, 0.2, 1.4, T.ashlar);
  BUILD.card(T.cauldronPix, 0.2, 0.9, 1.25, { s: 1.0, cast: true });
  BUILD.glow(0.2, 1.2, 1.25, 2.4, 0x9b5cff, 0.5);
  BUILD.light(new THREE.PointLight(0x9b5cff, 6, 0, 2), 0.2, 1.4, 1.1, { flicker: 7 });
  room.interact('cauldron', 0.2, 1.5, KZ, 1.0, () => say('cauldron'));
  room.interact('hearth', 0.2, 0.6, KZ, 1.2, () => say('hearth'));
  /* the runed rug in front of the hearth, a candle stand at the left, a little violet light from its flames */
  BUILD.rug(T.runeRug, -1.6, 2.0, 1.2, 3.4, {});
  room.interact('rug', 0.2, 0.1, KZ + 0.4, 1.4, () => say('rug'));
  BUILD.card(T.candleStand, -2.6, 0, 2.2, { s: 0.8 }); BUILD.glow(-2.6, 1.6, 2.2, 1.2, 0x9b5cff, 0.4);
  /* the table with the crystal orb; the Woman stands behind it, by the fire */
  BUILD.box(4.4, 6.0, 0, 0.95, 1.6, 2.4, T.woodDark, { col: 0x9a80c0 });
  BUILD.card(T.orbPix, 5.2, 0.95, 2.0, { s: 1.0, cast: false }); BUILD.glow(5.2, 1.5, 2.0, 1.3, 0x9b5cff, 0.3);
  BUILD.light(new THREE.PointLight(0xa070ff, 2.5, 0, 2), 5.2, 1.6, 2.2, { flicker: 4 });
  room.interact('orb', 5.2, 1.6, KZ, 1.0, () => say('orb'));
  room.interact('witch', 3.6, 2.6, KZ, 1.0, () => HUT.witch()).label = 'Talk to the Woman';
  /* the dressing: jars on the shelf, a skull and a black cat on the table, cobwebs in the corners, a stool, a barrel,
     lanterns and candles, and a hanging over the hearth */
  for (const x of [-6.2, -5.6, -5.0, -4.4]) BUILD.card(T.jarPix, x, 2.6, 0.45, { s: 1.0, cast: false });
  BUILD.card(T.catPix, 4.6, 0.95, 2.55, { s: 1.0, cast: false });
  BUILD.card(T.skullPix, 5.8, 0.95, 2.2, { s: 1.0 });
  BUILD.card(T.cobwebPix, -9.6, 4.2, 0.08, { s: 2.2, cast: false }); BUILD.card(T.cobwebPix, 9.4, 4.4, 0.08, { s: 2.2, cast: false });
  BUILD.box(2.9, 3.5, 0, 0.45, 1.5, 2.0, T.woodDark, { col: 0x8a70b0 });
  BUILD.box(-3.4, -2.2, 0, 1.1, 2.4, 3.2, T.woodDark, { col: 0x7a60a0 });
  BUILD.card(T.lantern, -2.6, 3.0, 1.0, { cast: false }); BUILD.glow(-2.6, 3.2, 1.05, 1.2, 0x9b5cff, 0.4);
  BUILD.card(T.lantern, 8.4, 3.0, 1.2, { cast: false }); BUILD.glow(8.4, 3.2, 1.25, 1.2, 0x9b5cff, 0.4);
  BUILD.card(T.candleStand, 8.0, 0, 1.6, { s: 0.8 }); BUILD.glow(8.0, 1.6, 1.6, 1.2, 0x9b5cff, 0.4);
  BUILD.card(T.folkWide, 0.2, 2.8, 0.03, { cast: false, col: 0x9a80d0 });
  /* a broom against the wall by the door, a sack of something by the barrel, violet mushrooms on the floor */
  BUILD.box(-7.66, -7.6, 0, 2.6, 0.12, 0.18, T.woodPost); BUILD.box(-7.85, -7.42, 0, 0.5, 0.1, 0.22, T.woodDark, { col: 0xb8a070 });
  BUILD.box(-2.0, -1.2, 0, 0.7, 0.4, 1.0, T.woodPost, { col: 0xb0a080 });
  BUILD.card(T.tuft, -0.8, 0, 0.5, { s: 0.9, col: 0x9a6aff }); BUILD.card(T.tuft, 7.6, 0, 1.2, { s: 1.1, col: 0x9a6aff }); BUILD.card(T.tuft, -4.7, 0, 1.4, { s: 0.8, col: 0x9a6aff });
  /* light: a violet hemisphere for the room's base, the moon from the window, the hearth; motes drift up from the fire */
  BUILD.light(new THREE.HemisphereLight(0x3a2a6a, 0x1a0c18, 1.8), 0, 5, 0);
  room.rim = [0.2, 1.4, 1.2, 0.5, 6, 0x9b5cff, null];
  room.shadowSrc = [5.2, 3.4, 3.6, 6];
  BUILD.motes({ n: 110, boxes: [[-9, 9, 0.5, 4.6, 0.5, 4, 0.3]], embers: [0.2, 1.3, 1.2], col: 0xc8a0ff });
  room.update(0, 0);
  return BUILD.end();
};
HUT.onEnter = function () { if (!CUT.playing) SCENE.caption(...this.caption); };
/* the Woman by the fire: a fuller talk the first time, then one line at a time, and the king's own lines are only the player's */
HUT.witch = async function () {
  const K = SCENE.player, W = CAST.A.hutWitch, T = HUT.TALK, who = (k) => (k === 'witch' ? W : K);
  W.faceTo(K.x); K.faceTo(W.x);
  SCENE.lock++;
  try {
    if (!HUT.met) { HUT.met = true; await SCENE.talk(T.first.map(([k, t]) => [who(k), t])); }
    else await SCENE.say(W, SCENE.cycle('witch', T.more));
  } finally { SCENE.lock--; }
};
HUT.met = false;
