/* THE FAIRGROUND — the west end of the Swan Meadow, where the town road comes in (STORY.md §6.1). Left to right: the gate
   from the road · Marta's bread, the honey cakes, the sausage grill · the ale tent · the Salamanders' stage · ribbons · the
   bear's pen (Bartosz, Kazik) · the puppet booth · the strongman's hammer · the fortune teller's wagon, the maypole · the
   gate to the lists. Behind: bunting, the crowd, a sea of tents, and the Swan Fortress on its hill. */
const FAIR = FEST.room('fair', 'The Swan Fair', 'Midsummer, and seven days without rain', { ambience: { crowd: 0.6, birds: 0.25, wind: 0.15, fire: 0.08 } });
FAIR.ENTRY = -13.6;   // from the road (the map)
FAIR.build = function () {
  const room = BUILD.begin(this), T = PX.T, KZ = room.KZ, L = FEST.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle('fl' + k, L[k]));
  FEST.backdrop(room, { town: true, fx: 8, tents: [[-26, -15, 2.4, 0], [-17, -22, 2.0, 1], [-7, -18, 2.6, 2], [4, -24, 2.2, 3], [14, -16, 2.4, 0], [24, -21, 2.0, 1], [33, -26, 2.6, 2]] });
  /* the gate from the road, and the gate to the lists */
  BUILD.card(T.festGate, -14.9, 0, 1.7, { cast: true });
  room.interact('road', -14.6, 3.0, KZ, 1.0, () => MAP.open()).label = 'The road (the map)';
  BUILD.card(T.festGate, 15.4, 0, 1.7, { cast: true });
  room.interact('toLists', 15.0, 3.0, KZ, 1.0, () => { SCENE.lock++; SCENE.say(SCENE.player, L.toLists[0]).then(() => { SCENE.lock--; GAME.save(); SCENE.go('lists', { x: LISTS.ENTRY, face: 1 }); }); }).label = 'To the lists';
  /* the food stalls */
  FEST.stall(-12.6, 1.05, 2.4, T.stallBread, T.awningGreen); room.interact('bread', -12.6, 1.9, KZ, 0.9, () => say('bread'));
  FEST.stall(-10.2, 1.05, 2.4, T.stallHoney, T.awningBlue);
  room.interact('honey', -10.2, 1.9, KZ, 0.9, () => { FEST.cakes++; AUDIO.sfx('coin', { gain: 0.6 }); say('honey'); }).label = 'Buy honey cakes';
  FEST.stall(-7.8, 1.05, 2.4, T.stallSausage, T.awningRed); room.interact('sausage', -7.8, 1.9, KZ, 0.9, () => say('sausage'));
  BUILD.glow(-8.2, 1.25, 1.85, 1.1, 0xff7a2a, 0.35); BUILD.light(new THREE.PointLight(0xff8a3c, 1.4, 0, 2), -8.2, 1.3, 2.1, { flicker: 6 });
  FEST.smoke(room, -8.3, 1.5, 1.6, 0.8);
  /* the ale tent: barrels and a trestle inside, the flap open to the meadow */
  BUILD.tent(-4.6, -0.3, 2.0, 2.3, 1.7, T.canvasSwan, T.canvasSwan, { open: 1.7, valance: T.awningBlue, pennant: T.pennantBlue });
  for (const [x, z] of [[-5.5, -0.9], [-4.7, -1.2], [-3.9, -0.8]]) BUILD.card(T.barrel, x, 0, z, { s: 0.9 });
  BUILD.box(-5.6, -3.6, 0.72, 0.8, 0.2, 0.7, T.woodDark); for (const x of [-5.4, -3.8]) BUILD.box(x - 0.05, x + 0.05, 0, 0.72, 0.3, 0.6, T.woodPost);
  room.interact('ale', -4.6, 2.4, KZ, 1.0, () => say('ale'));
  /* the Salamanders' stage: a plank platform, the scorched backcloth, a torch at each end */
  const SX0 = -1.8, SX1 = 2.6, SH = 0.8; room.stageX = (SX0 + SX1) / 2;
  BUILD.box(SX0, SX1, 0, SH, 0.0, 1.8, T.woodDark); BUILD.box(SX0, SX1, SH - 0.06, SH, 0.0, 1.85, T.woodRed);
  BUILD.card(T.awningRed, room.stageX, 0.05, 1.86, { w: SX1 - SX0, h: SH - 0.05, cast: false });
  BUILD.card(T.stageCurtain, room.stageX, SH, 0.06, { w: SX1 - SX0, h: (SX1 - SX0) * 64 / 96, cast: false });
  for (const x of [SX0 + 0.12, SX1 - 0.12]) { BUILD.box(x - 0.05, x + 0.05, SH, SH + 2.0, 1.55, 1.65, T.woodPost); BUILD.flame(x, SH + 2.0, 1.62, 0.6); BUILD.glow(x, SH + 2.2, 1.65, 1.0, 0xffa050, 0.35);
    BUILD.light(new THREE.PointLight(0xffa050, 2.0, 0, 2), x, SH + 2.2, 1.9, { flicker: 7 + x }); }
  room.lights.flash = BUILD.light(new THREE.PointLight(0xffa040, 0, 0, 2), room.stageX, SH + 1.8, 2.0);
  room.blasts = [-0.9, 0.4, 1.7].map(() => { const a = BUILD.anim(T.blast, 0, 0, 0, { basic: true, k: 3.2, cast: false, s: 1.0 }); a.me.visible = false; return a; });
  room.interact('stage', room.stageX, 2.8, KZ, 1.4, () => FAIR.fire(room)).label = 'Watch the Salamanders';
  /* ribbons */
  FEST.stall(4.0, 1.05, 2.2, T.stallRibbons, T.awningGreen);
  room.interact('ribbons', 4.0, 2.0, KZ, 0.9, () => FAIR.ribbons()).label = 'Buy a ribbon';
  /* the bear's pen: woven hurdles, the bear dancing on his chain */
  const BX0 = 5.6, BX1 = 8.4, BZ0 = 0.4, BZ1 = 2.0;
  BUILD.card(T.hurdle, (BX0 + BX1) / 2, 0, BZ1, { w: BX1 - BX0, h: 0.75, ru: 1.4 }); BUILD.card(T.hurdle, (BX0 + BX1) / 2, 0, BZ0, { w: BX1 - BX0, h: 0.75, ru: 1.4 });
  for (const x of [BX0, BX1]) BUILD.card(T.hurdle, x, 0, (BZ0 + BZ1) / 2, { w: BZ1 - BZ0, h: 0.75, ry: Math.PI / 2 });
  BUILD.solid(BX0, BX1, 0, 0.75, BZ0, BZ1);
  BUILD.box(7.0 - 0.05, 7.0 + 0.05, 0, 1.3, 0.6, 0.7, T.woodPost);   // the chain's stake
  // Wojciech is an animal of the cast (game/g44), up on his hind legs on the chain; petted from FAIR.onEnter
  room.interact('bearFree', BX0 - 0.3, 1.6, KZ, 0.7, () => FAIR.freeBear(room)).label = 'Buy the bear his freedom';
  /* the puppet booth, the puppets in its window */
  BUILD.card(T.puppetBooth, 9.6, 0, 1.4);
  room.puppets = BUILD.anim(T.puppets, 9.6, 1.96, 1.43, { cast: false }); room.puppets.paused = true;
  room.interact('puppetBooth', 9.6, 2.9, KZ, 0.8, () => FAIR.puppetShow(room)).label = 'Watch the puppet play';
  /* the strongman's hammer: the post, the puck that flies up it, the bell */
  BUILD.card(T.striker, 11.2, 0, 1.3, { cast: true });
  room.puck = BUILD.card(T.puck, 11.2, 0.15, 1.33, { cast: false, dyn: true });
  room.bell = BUILD.glow(11.2, 4.2, 1.35, 1.2, 0xffe080, 0); room.bell.visible = false;
  room.interact('striker', 11.2, 2.6, KZ, 0.8, () => FAIR.hammer(room)).label = 'Swing the hammer';
  /* the fortune teller's wagon, the maypole behind it */
  BUILD.card(T.fortuneWagon, 12.8, 0, 0.3); BUILD.card(T.lantern, 14.0, 1.6, 0.9, { cast: false, s: 0.7 }); BUILD.glow(14.0, 1.8, 0.95, 0.9, 0xffb060, 0.4);
  BUILD.card(T.maypole, 14.3, 0, -1.4, { cast: true });
  for (const [dx, ry] of [[-0.25, 0.4], [0.2, -0.3], [0.05, 1.2], [-0.1, -1.0]]) BUILD.windCard(T.ribbon, 14.3 + dx, 1.9, -1.35, 'wave', 0.1, { cast: false, ry });
  room.interact('maypole', 14.3, 3.4, KZ, 0.6, () => say('maypole'));
  /* the meadow's dressing: bunting, the crowd beyond the stalls, the near side's barrels and hurdles */
  FEST.bunting(-15.5, -6.2, -0.7, 4.6); FEST.bunting(-6.2, 6.2, -2.2, 5.3); FEST.bunting(6.2, 16, -0.6, 4.8);
  for (const [x, z, t] of [[-9, -3.0, T.crowdA], [-1, -3.4, T.crowdB], [7, -3.0, T.crowdA], [14, -4.2, T.crowdB], [-15, -4.6, T.crowdB]]) BUILD.card(t, x, 0, z, { w: 8, h: 1.25, cast: false });
  BUILD.card(T.hay, -9.5, 0, 7.4, { s: 1.0, cast: false }); BUILD.card(T.barrel, -3.6, 0, 7.2, { s: 1.1, cast: false }); BUILD.card(T.barrel, -2.9, 0, 7.6, { s: 1.1, cast: false });
  BUILD.card(T.hurdle, 2.6, 0, 7.2, { w: 2.6, h: 0.8, cast: false }); BUILD.card(T.cartWheel, 9.4, 0, 7.4, { s: 1.1, cast: false, rx: -0.12 }); BUILD.card(T.crate, 12.6, 0, 7.0, { s: 0.9, cast: false });
  FEST.lights(room);
  BUILD.motes({ n: 60, boxes: [[-15, 15, 0.4, 3.6, 0.5, 3.6, 0.5]], col: 0xfff0c0 });
  room.update(0, 0);
  return BUILD.end();
};
FAIR.TALKERS = [['queen', 'Talk to Halina'], ['kazik', 'Talk to Kazik'], ['martaFair', 'Talk to Marta'], ['bartosz', 'Talk to Bartosz'], ['salA', 'Talk to Mira'], ['salB', 'Talk to Tessa'], ['salC', 'Talk to Ola'],
  ['fortune', 'Have your fortune told'], ['townA', 'Talk to the townsman'], ['townB', 'Talk to the townswoman'], ['townC', 'Talk to the townsman'], ['townD', 'Talk to the townswoman'], ['fairGuard', 'Talk to the guard']];
FAIR.onEnter = function () {
  if (!CUT.playing) SCENE.caption(...this.caption);
  FEST.talkers(this, FAIR.TALKERS);
  const bear = CAST.A.bear;
  if (bear) { bear.offstage = !!FEST.bearFreed; bear.setVisible(!FEST.bearFreed); bear.rearGoal = bear.rear = FEST.bearFreed ? 0 : 1; bear.lookYaw = null;
    if (!FEST.bearFreed) bear.petSpot(this, FAIR.BEAR_PET); }
  if (FEST.bearFreed) { this.inter = this.inter.filter((i) => i.id !== 'bear'); const it = this.inter.find((i) => i.id === 'bearFree'); if (it) it.hidden = true; }
  SCENE.buildMarks();
};
FAIR.onUpdate = function () { FEST.follow(this); };
/* ---------------------------------------------------------------- the Salamanders */
FAIR.fire = async function (room) {
  const A = CAST.A, S = [A.salA, A.salB, A.salC], K = SCENE.player; if (!S.every(Boolean)) return;
  if (REALM.flags.fire === 0) { SCENE.say(A.bartosz || K, 'No licence for fire, Your Grace. Your own seal on it. The Salamanders are sulking in the wagon.'); return; }
  SCENE.lock++;
  try {
    await FEST.stepTo(room.stageX - 2.9, room.stageX);   // stand to one side: the stage is the show
    await FEST.cam(room, { focus: room.stageX, dist: 12.5, y: 2.6, look: 2.2 }, 1.3);
    await FEST.say(A.bartosz, 'fireIntro', FEST.TALK.bartosz.fire);
    for (let i = 0; i < 3; i++) { FAIR.blast(room, i, 1.0); await SCENE.wait(1500); }
    for (let i = 0; i < 3; i++) FAIR.blast(room, i, 1.35);
    await SCENE.wait(900); AUDIO.sfx('cheer', { gain: 0.9, dur: 3.2 });
    FEST.fires++;
    await SCENE.say(K, SCENE.cycle('fireK', ['I’ve seen sieges with less fire in them.', 'Halina will say it’s dangerous. Halina will also have been watching.', 'Pay them double. Quietly.']));
  } finally { K.lookYaw = null; await FEST.cam(room, null, 1.0); SCENE.lock--; }
};
/* one sister's blast: she leans back and blows, a plume of fire rolls up and out from her mouth, the stage lights up */
FAIR.blast = function (room, i, big) {
  const s = [CAST.A.salA, CAST.A.salB, CAST.A.salC][i], b = room.blasts[i], f = s.face || 1;
  s.act('Interact', 0, null);
  // the card pivots on its bottom centre; put the plume's root (its left middle, before the flip) at her mouth, angled up and out
  const mx = s.x + f * 0.22, my = s.y + 1.6, th = f * 0.55, lx = -f * big * 1.5 / 2, ly = big * 0.875 / 2;
  b.me.scale.set(f * big, big, 1); b.me.rotation.z = th;
  b.me.position.set(mx - (lx * Math.cos(th) - ly * Math.sin(th)), my - (lx * Math.sin(th) + ly * Math.cos(th)), s.z + 0.15);
  b.me.visible = true; b.set(0); AUDIO.sfx('fwoosh', { gain: 0.8 * big, pan: clamp((s.x - R.cam.position.x) / 8, -0.8, 0.8) });
  let t = 0; const tick = (T, dt) => { t += dt; const fr = Math.floor(t / 0.11); room.lights.flash.intensity = 26 * big * Math.max(0, 1 - t / 0.8);
    if (fr >= b.n) { b.me.visible = false; room.lights.flash.intensity = 0; room.tick = room.tick.filter((g) => g !== tick); } else b.set(fr); };
  room.tick.push(tick);
};
/* ---------------------------------------------------------------- the bear */
/* petting him: he drops onto all fours, lowers his head into the hand, and goes back up when the hand goes */
FAIR.BEAR_PET = { id: 'bear', label: 'Pet the bear', clip: 'Idle_2_HeadLow', holdFor: 3.0, sound: 'pant', soundO: { gain: 0.9 }, headY: 1.9, stand: 1.25,
  says: ['(He sits down at once, the way he does when the music stops.)', 'Hrrmf.', '(He leans his whole head into the king’s hand. It’s like being leaned on by a door.)'],
  lines: ['Hello, Wojciech. You don’t like dancing either, do you.', 'He smells of hay and old honey and something sad.'],
  onReact: (b) => { b.rearGoal = 0; setTimeout(() => { if (!FEST.bearFreed && SCENE.room === FAIR) b.rearGoal = 1; }, 4600); }, onPet: () => FAIR.petBear() };
FAIR.petBear = function () {
  const z = CAST.A.kazik; FEST.met.bearPets = (FEST.met.bearPets || 0) + 1;
  if (FEST.met.bearPets === 1 && z && z.visible) return [[z, 'He LIKES you. Bartosz! He likes the king!'], [CAST.A.bartosz, 'He likes anyone with honey on their fingers, little lord.']];
  return null;
};
FAIR.freeBear = async function (room) {
  const A = CAST.A, K = SCENE.player; SCENE.lock++;
  try {
    await SCENE.say(A.bartosz, 'Sell him? He’s the best dancer in my company, Your Grace. Also the only one who doesn’t drink.', { wait: true });
    const i = await FEST.ask(['Buy him, and let him go in the Wood', 'Not today']);
    if (i === 1) { await SCENE.say(K, 'Another day, Bartosz.', { wait: true }); return; }
    COURT.stats.gold = Math.max(0, COURT.stats.gold - 1); AUDIO.sfx('coin', { gain: 0.8 });
    await SCENE.talk([[K, 'Name your price, and then take a third off it, because I’m the king.'], [A.bartosz, 'For a king, the price is the price. For a little prince, it’s half.'],
      [A.kazik, 'Does that mean he’s FREE?'], [K, 'It means Bogdan’s men walk him to the Wood tonight, and the Woman can explain herself to him.']]);
    FEST.bearFreed = true; await NIGHT.fade(true); const bear = A.bear; if (bear) { bear.offstage = true; bear.setVisible(false); }
    room.inter = room.inter.filter((x) => x.id !== 'bear'); { const it = room.inter.find((x) => x.id === 'bearFree'); if (it) it.hidden = true; } SCENE.buildMarks(); await NIGHT.fade(false);
    await SCENE.say(A.kazik, 'Thank you, Father. I’ll visit him. With honey.', { wait: true });
    GAME.save();
  } finally { SCENE.lock--; }
};
/* ---------------------------------------------------------------- ribbons */
FAIR.ribbons = async function () {
  const K = SCENE.player; SCENE.lock++;
  try {
    if (FEST.ribbon) { await SCENE.say(K, FEST.ribbon === 'halina' ? 'Halina’s already wearing the blue one. She pretends she bought it herself.' : FEST.ribbon === 'dorota' ? 'The white ribbon went in my sleeve, for the chapel. Nobody saw.' : 'One ribbon a festival. I’m a king, not a magpie.'); return; }
    await SCENE.say(K, 'Silk from the south, dyed in Velka. One for…', { wait: true });
    const i = await FEST.ask(['Halina (the blue)', 'The saint (the white, hidden in my sleeve)', 'Nobody, I’m only looking']);
    FEST.ribbon = ['halina', 'dorota', 'none'][i]; if (i < 2) AUDIO.sfx('coin', { gain: 0.6 });
    await SCENE.say(K, ['Blue, for the queen. She’ll say it clashes with something. She’ll wear it anyway.', 'White. For later. Nobody needs to know which saint.', 'Only looking. The stallholder has stopped believing me.'][i], { wait: true });
  } finally { SCENE.lock--; }
};
/* ---------------------------------------------------------------- the puppet play */
FAIR.puppetShow = async function (room) {
  const K = SCENE.player, kingP = FEST.voice(9.42, 2.6, 1.45), riverP = FEST.voice(9.82, 2.6, 1.45); SCENE.lock++;
  try {
    await FEST.stepTo(8.0, 9.6); await FEST.cam(room, { focus: 9.6, dist: 11, y: 2.4, look: 2.2 }, 1.2);
    room.puppets.paused = false; const timer = (T) => { if (!room.puppets.paused) room.puppets.set(Math.floor(T * 3) % 3); }; room.tick.push(timer);
    await SCENE.talk([[kingP, 'I am King Radish! I rule the mountains, the rain, and whatever my wife lets me!'], [riverP, 'You rule the rain, husband? Then stop it.'],
      [kingP, 'I can’t. I made a bargain with it.'], [riverP, 'A bargain? With whom? For what? Who pays?'], [kingP, 'Ask me after the festival!']]);
    AUDIO.sfx('cheer', { gain: 0.6, dur: 2.2 });
    room.puppets.paused = true; room.tick = room.tick.filter((g) => g !== timer);
    if (!FEST.puppets) {
      const i = await FEST.ask(['Laugh with the crowd', 'Have it stopped']); FEST.puppets = i === 0 ? 'laughed' : 'stopped';
      if (i === 0) { COURT.stats.mood = Math.min(20, COURT.stats.mood + 1); await SCENE.talk([[K, 'King Radish. I’ve been called worse, and by better puppets.'], [CAST.A.bartosz || K, 'The king laughs! You hear? The king laughs!']]); }
      else await SCENE.talk([[K, 'That’s enough. Pack it away.'], [CAST.A.bartosz || K, 'As Your Grace commands. The booth comes down.'], [K, 'Who wrote that? Nobody’s supposed to know about any bargain.']]);
    } else await SCENE.say(K, FEST.puppets === 'laughed' ? 'Again. I want to see what Radish says next.' : 'They’ve put it back up. With a different king. He looks like Gniewomir.', { wait: true });
  } finally { K.lookYaw = null; await FEST.cam(room, null, 1.0); SCENE.lock--; }
};
/* ---------------------------------------------------------------- the strongman's hammer */
FAIR.hammer = async function (room) {
  const K = SCENE.player; SCENE.lock++;
  try {
    K.faceTo(11.2); await FEST.cam(room, { focus: 11.2, dist: 11, y: 2.6, look: 2.4 }, 0.9);
    const k = await FEST.meter('Swing! (E or tap, in the gold)');
    K.act('Sword_Attack', 0, null); await SCENE.wait(500); AUDIO.sfx('thud', { gain: 0.9 });
    const top = 4.05, peak = 0.15 + (top - 0.15) * Math.min(1, k * 1.08), dur = 0.35 + k * 0.35;
    await new Promise((res) => { let t = 0; const f = (T, dt) => { t += dt; const u = Math.min(1, t / (dur * 2)), y = u < 0.5 ? lerp(0.15, peak, 1 - (1 - u * 2) ** 2) : lerp(peak, 0.15, ((u - 0.5) * 2) ** 2);
      room.puck.position.y = y; if (u >= 1) { room.tick = room.tick.filter((g) => g !== f); res(); } }; room.tick.push(f); });
    FEST.hammer = Math.max(FEST.hammer, k);
    if (peak >= top - 0.05) { AUDIO.sfx('chime', { gain: 0.9 }); room.bell.visible = true; room.bell.material.color.set(0xffe080).multiplyScalar(0.8); setTimeout(() => { room.bell.visible = false; }, 1200);
      AUDIO.sfx('cheer', { gain: 0.8, dur: 2.4 }); await SCENE.say(K, SCENE.cycle('hamWin', ['Ding. The bell, the crowd, and my shoulder will remember it tomorrow.', 'The bell again. I think it is rigged in my favour. I hope it is.']), { wait: true }); }
    else await SCENE.say(K, k > 0.5 ? 'Close. The strongman says close counts for a ribbon. The strongman is being kind.' : 'The puck barely moved. A little girl in the crowd is laughing at me. It might be Zofia.', { wait: true });
  } finally { await FEST.cam(room, null, 0.8); SCENE.lock--; }
};
