/* THE WAR CAMP — chapter five, when the accusation made a war (INV.OUT[key].war): the host of Lodmir under canvas in the
   grey hour before the battle, drizzle on everything. The king walks it and does what a king does there:
     the map table   the plan, with Ser Bogdan (three orders of battle; the player's words)
     the stores      a double ration and the wine, or march light
     the fire        a word to the men: their homes, silver, or silence
     the surgeon     Dobrawa, if she is in his service (she saves a tenth of what the day costs)
     Zofia           if she is close to him she has ridden out in a groom's coat
   then the stakes at the camp's edge, and the order to form up: BATTLE.play, and what the day came to (WARCAMP.result:
   the army's strength and those choices), told back in the camp at dusk; then the ending (g52). ENGINE.md §13w. */
const WARCAMP = FEST.room('warcamp', 'The War Camp', 'The host of Lodmir, the grey hour before', { fog: [0x9ea8ac, 0.0052], exposure: 0.98, music: 'intro',
  ambience: { crowd: 0.3, wind: 0.5, fire: 0.3, rain: 0.55 }, grade: { s: [0.94, 0.99, 1.07], h: [1.0, 1.0, 0.98] } });
Object.assign(WARCAMP, { war: null, plan: 0, fed: 0, spoke: 0, zofia: 0, fought: false });
WARCAMP.init0 = JSON.stringify({ war: null, plan: 0, fed: 0, spoke: 0, zofia: 0, fought: false });
WARCAMP.reset = function () { Object.assign(WARCAMP, JSON.parse(WARCAMP.init0)); };
WARCAMP.state = function () { const s = {}; for (const k in JSON.parse(WARCAMP.init0)) s[k] = WARCAMP[k]; return s; };
WARCAMP.load = function (s) { WARCAMP.reset(); if (s) for (const k in JSON.parse(WARCAMP.init0)) if (k in s) WARCAMP[k] = s[k]; };
WARCAMP.LINES = {
  road: ['The road home. Four miles, and the whole town watching it.', 'Nobody goes back up that road today. Least of all me.'],
  rack: ['Somebody has been at these with a whetstone all night. Somebody couldn’t sleep either.', 'My father’s armourer marked every blade with a swan. Half of these still have it.'],
  horse: ['Burza. She has carried me to three tourneys and no wars. She seems to know the difference.', '(She blows into his palm, and looks past him at the field.)'],
  tent: ['Empty. A surgeon’s table, and nobody to stand at it. I should have thought of that in the spring.'],
  pavilion: ['My father’s campaign tent. It still smells of him: wet wool and candle smoke.', 'The swan on the valance has lost an eye to moths. It looks better for it.'],
};
/* ---------------------------------------------------------------- the people of the camp */
CAST.specs.commander.homes.warcamp = { x: 2.3, z: 1.45, face: -1, idle: 'Idle_FoldArms_Loop' };
CAST.specs.zofia.homes.warcamp = { x: -6.9, z: 2.15, face: 1, idle: 'Idle_Loop' };
CAST.specs.dobrawa.homes.warcamp = { x: 6.2, z: 1.75, face: -1, idle: 'Idle_Loop' };
CAST.specs.warhorse.homes.warcamp = { x: 11.0, z: 0.75, face: -1 };
CAST.specs.wSergeant = Object.assign(knight('wSergeant', 0x24405a, -9.3, -1), { name: 'Sergeant Maciek', lazy: true, helmet: undefined, hair: [['Hair_Buzzed', 0x5a4a3a], ['Hair_Beard', 0x5a4a3a]], idle: 'Idle_Loop', homes: { warcamp: { x: -9.3, z: 2.0, face: -1, idle: 'Idle_Loop' } } });
CAST.specs.wSentry = Object.assign(knight('wSentry', 0x24405a, 13.7, 1), { name: 'the sentry', lazy: true, homes: { warcamp: { x: 13.7, z: 2.05, face: 1, idle: 'Sword_Idle' } } });
WARCAMP.build = function () {
  const room = BUILD.begin(this), T = PX.T, KZ = room.KZ, L = WARCAMP.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle('wc' + k, L[k]));
  /* the meadow under the fortress, an overcast sky, and the host's tents to the tree line: Lodmir's white and the levy's teal */
  FEST.backdrop(room, { fx: -34, sky: T.skyBattle, skyK: 1.05, cans: [T.canvasWar, T.canvasWar, T.canvasSwan, T.canvasWar], pens: [T.pennantBlue, T.pennantBlue, T.pennantBlue, T.pennantBlue], tents: [[-27, -13, 2.0, 1], [-20, -19, 2.2, 2], [-13, -14, 1.9, 1], [-5, -17, 2.3, 1], [5, -21, 2.0, 2], [12, -14, 2.1, 1], [20, -18, 2.3, 1], [28, -13, 2.0, 2], [-33, -24, 2.2, 1], [35, -25, 2.4, 1], [-2, -30, 2.2, 2], [18, -31, 2.2, 1]] });
  { const street = BUILD.rug(T.sand, -20, 20, -1.4, 6.2, { ru: 20, rv: 3.8, y: 0.004 }); street.material = street.material.clone(); street.material.color = new THREE.Color(0x8e7e68); }   // the camp's street: four thousand pairs of boots (the yard's packed sand, wet)
  /* the host: knots of men waiting between the tents, shields on rails, more fires than anyone can count */
  for (const [x, z, s, fl] of [[-5.6, -5.5, 1.0, 0], [4.6, -7.5, 1.0, 1], [-15.5, -6.5, 1.0, 1], [11.5, -5.0, 1.0, 0], [16.5, -8.5, 1.0, 1], [-10.5, -11, 1.0, 0], [0.5, -12.5, 1.0, 0], [22, -10, 1.0, 1], [-22, -9, 1.0, 0]]) {
    BUILD.card(T.soldiers, x, 0, z, { s: 1.15 * s, cast: false, w: fl ? -3.45 : undefined }); if (fl) { BUILD.card(T.campfire, x + 2.4, 0, z + 0.3, { s: 0.9, cast: false }); BUILD.flame(x + 2.4, 0.2, z + 0.32, 0.8, true); BUILD.glow(x + 2.4, 0.7, z + 0.4, 1.5, 0xff8a2a, 0.4); } }
  for (const [x, z] of [[-6.0, 0.4], [4.4, 0.2], [13.6, -1.6], [-14.6, -2.2]]) BUILD.card(T.shieldStack, x, 0, z, { cast: false });
  for (const [x, z] of [[-13.6, -3.4], [4.3, -3.2], [10.6, -2.9]]) BUILD.card(T.soldiers, x, 0, z, { s: 1.15, cast: false });   // three knots near enough to have faces: the far ones are a blur of blue, which is right for the far ones
  /* the road home, and the baggage: a wagon's worth of barrels, sacks and crates under an awning (the stores) */
  BUILD.card(T.hurdle, -15.6, 0, 1.4, { w: 1.6, h: 0.8 }); room.interact('road', -15.2, 2.4, KZ, 0.8, () => say('road'));
  for (const [x, z, t, s] of [[-13.9, 1.3, T.barrel, 1.0], [-13.2, 0.8, T.barrel, 0.95], [-13.0, 1.5, T.sacks, 1.0], [-12.2, 1.1, T.crate, 1.0], [-12.3, 1.75, T.crate, 0.8], [-14.5, 0.7, T.sacks, 0.9]]) BUILD.card(t, x, 0, z, { s });
  BUILD.card(T.cartWheel, -11.5, 0, 1.2, { s: 0.9 });
  room.interact('stores', -13.1, 2.2, KZ, 0.9, () => WARCAMP.stores()).label = 'The baggage and the stores';
  /* the men's tents, their fire, a log, spears stacked */
  BUILD.tent(-10.9, -1.6, 1.5, 1.7, 1.3, T.canvasWar, T.canvasWar, { pennant: T.pennantBlue, seg: 12 });
  BUILD.tent(-7.6, -2.3, 1.5, 1.7, 1.3, T.canvasWar, T.canvasWar, { seg: 12 });
  BUILD.card(T.campfire, -10.5, 0, 1.55, { s: 1.0 }); BUILD.flame(-10.5, 0.2, 1.57, 0.9, true); BUILD.glow(-10.5, 0.7, 1.6, 1.7, 0xff8a2a, 0.4);
  room.lights.fire = BUILD.light(new THREE.PointLight(0xff8a3c, 4.2, 0, 2), -10.5, 0.9, 1.9, { flicker: 7 }); FEST.smoke(room, -10.5, 0.9, 1.45, 1.1);
  BUILD.box(-11.9, -11.2, 0, 0.32, 0.55, 0.9, T.woodPost); BUILD.card(T.halberds, -8.3, 0, 0.7, { s: 1.0 });
  /* the armourer's rack */
  BUILD.card(T.swordRack, -4.4, 0, 0.9, { s: 1.0 }); BUILD.card(T.barrel, -3.4, 0, 1.2, { s: 0.9 }); room.interact('rack', -4.4, 2.3, KZ, 0.7, () => say('rack'));
  /* the king's pavilion: Lodmir's white and blue, open at the front, the old king's carpet, the map table, banners */
  BUILD.tent(0.4, -1.0, 2.8, 2.7, 2.2, T.canvasSwan, T.canvasSwan, { open: 1.9, valance: T.awningBlue, pennant: T.pennantBlue });
  BUILD.rug(T.rugB, -1.5, 2.3, -2.6, 0.85, { y: 0.012 });
  BUILD.card(T.campTable, 0.4, 0, -0.7, { s: 1.05 }); BUILD.card(T.chair, 0.4, 0, -1.5, { s: 1.0 });
  BUILD.card(T.candleStand, -1.3, 0, -1.6, { s: 0.8 }); BUILD.flame(-1.3, 1.35, -1.58, 0.25); room.lights.candle = BUILD.light(new THREE.PointLight(0xffb070, 2.4, 0, 2), -0.9, 1.5, -0.8, { flicker: 6 });
  for (const x of [-2.6, 3.4]) { BUILD.box(x - 0.06, x + 0.06, 0, 4.6, 1.55, 1.65, T.woodPost); BUILD.windCard(T.bannerBlue, x, 2.1, 1.7, 'wave', 0.1, { cast: false }); }
  room.interact('pavilion', 1.0, 3.6, KZ, 0.6, () => say('pavilion'));
  room.interact('plan', -0.6, 2.2, KZ, 0.8, () => WARCAMP.council()).label = 'The map table: plan the battle';
  /* the surgeon's tent */
  BUILD.tent(7.0, -0.7, 1.8, 2.0, 1.5, T.canvasWar, T.canvasWar, { open: 1.2, seg: 14 }); BUILD.card(T.linen, 7.0, 1.55, 1.12, { w: 0.5, h: 0.5, cast: false, col: 0xe8e0d0 }); BUILD.box(6.94, 7.06, 1.62, 1.98, 1.13, 1.14, T.woodRed, { col: 0xb02a2a, cast: false }); BUILD.box(6.82, 7.18, 1.74, 1.86, 1.13, 1.14, T.woodRed, { col: 0xb02a2a, cast: false });   // a red cross on a white cloth over the door
  BUILD.box(6.5, 7.6, 0.5, 0.58, -0.9, -0.3, T.woodPost); BUILD.card(T.sacks, 8.2, 0, 0.8, { s: 0.8 }); BUILD.card(T.bucket, 5.6, 0, 1.0);
  room.interact('surgeon', 7.0, 2.9, KZ, 0.7, () => WARCAMP.surgeon()).label = 'The surgeon’s tent';
  /* the horse lines: Burza, hay, a bucket */
  BUILD.box(9.4, 12.8, 0.95, 1.05, 0.15, 0.25, T.woodPost); for (const x of [9.5, 11.1, 12.7]) BUILD.box(x - 0.06, x + 0.06, 0, 1.05, 0.14, 0.26, T.woodPost);
  BUILD.card(T.hay, 12.4, 0, 0.75, { s: 0.8 }); BUILD.card(T.bucket, 9.7, 0, 1.1);
  room.interact('horse', 11.0, 2.6, KZ, 0.7, () => { SCENE.player.act('Interact'); say('horse'); });
  /* the camp's edge: sharpened stakes, and across the field their fires */
  for (const x of [14.4, 15.3, 16.2]) BUILD.card(T.hurdle, x, 0, 1.3 + (x % 1) * 0.4, { w: 1.0, h: 0.9 });
  for (let i = 0; i < 14; i++) { const x = 24 + i * 4.2 + hash(i, 1, 81) * 3, z = -62 - hash(i, 2, 81) * 34; BUILD.glow(x, 0.9, z, 1.5 + hash(i, 3, 81), 0xff8a3a, 0.95); }   // across the field, in front of the far trees: theirs
  room.interact('ride', 15.2, 2.6, KZ, 0.9, () => WARCAMP.ride()).label = 'The stakes: give the order to form up';
  /* the near side */
  BUILD.card(T.barrel, -13.2, 0, 7.2, { s: 1.1, cast: false }); BUILD.card(T.halberds, 5.6, 0, 7.3, { s: 1.0, cast: false }); BUILD.card(T.hurdle, -3.8, 0, 7.1, { w: 2.6, h: 0.8, cast: false }); BUILD.card(T.cartWheel, 12.6, 0, 7.4, { s: 1.1, cast: false, rx: -0.12 });
  /* an overcast dawn: a grey dome of light, almost no sun, the fire and the candle doing the warm work; drizzle */
  BUILD.light(new THREE.HemisphereLight(0xb8c4d0, 0x5a5a48, 1.75), 0, 20, 0);
  room.sun = BUILD.shadow(BUILD.light(new THREE.DirectionalLight(0xd8dce4, 1.25), -24, 22, 20), R.q === 'low' ? 1024 : 2048); room.sun.target.position.set(0, 0, 0);
  Object.assign(room.sun.shadow.camera, { left: -26, right: 26, top: 16, bottom: -16, near: 1, far: 100 }); room.sun.shadow.camera.updateProjectionMatrix(); room.sun.shadow.bias = -0.0008;
  room.rim = [-20, 6, 5, 0.45, 60, 0xd0d8e4, null]; room.shadowSrc = [-24, 16, 14, 80]; room.keyK = 0.7;
  BUILD.rain({ n: 1800, box: [-30, 30, 0, 16, -8, 12], speed: 16, wind: 0.2, len: 0.55, opacity: 0.15 });
  BUILD.motes({ n: 30, boxes: [[-14, 14, 0.3, 3.0, 0.5, 3.6, 0.4]], col: 0xd8dce0 });
  room.update(0, 0);
  return BUILD.end();
};
WARCAMP.TALK = {
  commander: ['Four thousand, Your Grace, and half of them have held a pike before. I’ve fought with worse and I’m still here.', 'Come to the table when you’re ready. They’ll form up however you say. That’s what frightens me.'],
  wSergeant: { krasna: ['Twenty thousand, they say, sir. I’ve stopped counting at the ones in front of me.', 'The lads were at your fair, Your Grace. They drank with those Krasnians. It sits badly.'],
    hal: ['Hal again. My father went up against Hal on your father’s wall, Your Grace. He’d have liked to see Krasnians on our side of it.', 'They say the young Margrave rides in his father’s helm. Then I know what to aim at.'] },
  wSentry: { krasna: ['Their fires, Your Grace. I count a new one every time I blink.', 'They sang, about an hour ago. Then they stopped. I liked the singing better.'],
    hal: ['Hal’s fires on the left, Your Grace. Krasna’s behind us, which I keep having to remind myself is good.', 'Boars on every shield over there. I’ve never liked pork.'] },
  dobrawa: ['Lint, honey, strong wine and a saw. Send them to me walking if you can, Your Grace. The ones who are carried, I mostly keep company.', 'I’ve boiled every knife. Your sergeant thinks it’s witchcraft. Let him.'],
};
WARCAMP.onEnter = function () {
  const A = CAST.A, room = this, show = (a, v) => { if (a) { a.offstage = !v; a.setVisible(v); } };
  show(A.dobrawa, AGENTS.has('dobrawa')); show(A.zofia, REALM.fam.zofia >= 6 && WARCAMP.zofia !== 2);
  const list = [['commander', 'Talk to Ser Bogdan', () => WARCAMP.talk('commander')], ['wSergeant', 'The sergeant, at the fire', () => WARCAMP.fire()], ['wSentry', 'Talk to the sentry', () => WARCAMP.talk('wSentry')]];
  if (A.dobrawa && A.dobrawa.visible) list.push(['dobrawa', 'Talk to Dobrawa', () => WARCAMP.talk('dobrawa')]);
  if (A.zofia && A.zofia.visible) list.push(['zofia', 'Zofia?', () => WARCAMP.zofiaTalk()]);
  room.inter = room.inter.filter((i) => !['dobrawa', 'zofia'].includes(i.id)); FEST.talkers(room, list);
  WARCAMP.dusk(WARCAMP.fought);
  if (!CUT.playing) SCENE.caption(...(WARCAMP.fought ? ['The War Camp', 'Dusk. Fewer fires than this morning'] : this.caption));
};
/* after the battle the same camp at dusk: the sky's light down to two fifths, the fires up, a colder grade with warm
   highlights, the fog closing in. Lights keep their built strength in userData.base, so it undoes exactly */
WARCAMP.dusk = function (on) {
  const room = this; if (!room.built) return;
  room.group.traverse((o) => { if (o.isLight && o.userData.base !== undefined) o.intensity = o.userData.base * (on ? (o.isPointLight ? 1.6 : 0.4) : 1); });
  for (const f of room.flick) f.base = f.L.userData.base * (on ? 1.6 : 1);
  R.mat.final.uniforms.uExpo.value = room.exposure * (on ? 0.86 : 1); R.grade(on ? { s: [0.9, 0.95, 1.14], h: [1.1, 0.98, 0.88] } : room.grade);
  if (R.scene.fog) { R.scene.fog.color.set(on ? 0x565c66 : 0x9ea8ac); if (R.scene.fog.density !== undefined) R.scene.fog.density = on ? 0.008 : 0.0052; }
};
WARCAMP.talk = async function (id) {
  const a = CAST.A[id], K = SCENE.player, T = WARCAMP.TALK[id]; if (!a || SCENE.lock) return;
  K.faceTo(a.x); a.faceTo(K.x); a.lookYaw = Math.sign(K.x - a.x) * 0.8;
  await SCENE.say(a, SCENE.cycle('wt' + id, Array.isArray(T) ? T : T[WARCAMP.war] || T.krasna)); a.lookYaw = null;
};
/* a choice in the camp: somebody speaks, the king answers in the player's words, somebody replies */
WARCAMP.ask = async function (a, lines, options) {
  const K = SCENE.player; if (SCENE.lock) return -1; SCENE.lock++;
  try { if (a) { K.faceTo(a.x); a.faceTo(K.x); a.lookYaw = Math.sign(K.x - a.x) * 0.8; }
    await SCENE.talk(lines.map((t) => [a || K, t]));
    const i = await NIGHT.ask(options.map((o) => o.label)), o = options[i];
    if (!/^\(/.test(o.label)) await SCENE.say(K, o.label.replace(/ \([^)]*\)$/, ''), { wait: true });
    if (o.reply) await SCENE.say(a || K, o.reply, { wait: true });
    if (o.fx) REALM.fx(o.fx); if (o.set) Object.assign(WARCAMP, o.set); GAME.save(); return i;
  } finally { SCENE.lock--; if (a) a.lookYaw = null; }
};
WARCAMP.council = async function () {
  const B = CAST.A.commander, enemy = WARCAMP.war === 'hal' ? 'Hal' : 'Krasna';
  if (WARCAMP.fought) return SCENE.say(SCENE.player, 'The map is still pinned as it was this morning. It was wrong by a hundred yards and a great many men.');
  if (WARCAMP.plan) return SCENE.say(B, ['', 'We hold the rise. I’ve had the stakes moved up.', 'The horse is saddled and out of sight, Your Grace. On your word.', 'One line. I’ve told them there’s nobody behind them. They’ve gone very quiet.'][WARCAMP.plan]);
  return WARCAMP.ask(B, [`Here’s the field, Your Grace. A rise behind our right, soft ground on their left, and ${enemy} across the middle of it.`, 'I can give you three battles. I can’t tell you which one we’re in until it’s over.'], [
    { label: 'We hold the rise, and let them break on us.', reply: 'The old way. It’s old because the men who used it lived.', set: { plan: 1 } },
    { label: 'The horse goes round their left through the soft ground. On my word.', reply: 'If it’s soft for them it’s soft for us. But if it works, Your Grace, they’ll sing about it.', set: { plan: 2 } },
    { label: 'Every man in one line. No reserve.', reply: 'Then nobody runs, because there’s nowhere behind to run to. I’ve seen it work. Once.', set: { plan: 3 } }]);
};
WARCAMP.stores = async function () {
  if (WARCAMP.fed || WARCAMP.fought) return SCENE.say(SCENE.player, WARCAMP.fed === 1 ? 'The barrels are broached. For an hour it sounded like the fair.' : 'Biscuit, and a mouthful of water. The barrels are still roped.');
  return WARCAMP.ask(null, ['Biscuit, salt pork, and nine barrels of the wine we didn’t pour at midsummer.'], [
    { label: 'A double ration, and broach the wine. (Stores −2)', fx: { stores: -2 }, set: { fed: 1 } },
    { label: 'The usual measure. They’ll march the lighter for it.', set: { fed: 2 } }]);
};
WARCAMP.fire = async function () {
  const S = CAST.A.wSergeant; if (WARCAMP.spoke || WARCAMP.fought) return WARCAMP.talk('wSergeant');
  return WARCAMP.ask(S, ['Your Grace. Don’t get up, lads. Get up, lads.', 'They’d take a word from you, sir. Doesn’t have to be a good one.'], [
    { label: 'You know what’s behind you. Your own doors. That’s all there is to say.', reply: 'That’ll do, sir. That’ll do very well.', fx: { mood: 1 }, set: { spoke: 1 } },
    { label: 'A mark of silver to every man still standing at dusk. (Gold −2)', reply: 'Hear that? Stay on your feet, you’re worth money.', fx: { gold: -2 }, set: { spoke: 2 } },
    { label: '(Say nothing. Sit down at their fire a while.)', reply: 'Shove up, Wojtek. Give the king the dry end of the log.', set: { spoke: 3 } }]);
};
WARCAMP.surgeon = async function () {
  const D = CAST.A.dobrawa; if (D && D.visible) return WARCAMP.talk('dobrawa');
  return SCENE.say(SCENE.player, SCENE.cycle('wctent', WARCAMP.LINES.tent));
};
WARCAMP.zofiaTalk = async function () {
  const Z = CAST.A.zofia; if (WARCAMP.zofia) return SCENE.say(Z, 'I’m carrying water. It’s heavier than a sword, Father. Nobody tells you that.');
  const i = await WARCAMP.ask(Z, ['Don’t be angry. I rode out with the grooms. Nobody looked under the hood.', 'I’m not asking to fight. I’m asking not to be the one who waited at a window.'], [
    { label: 'You stay with the baggage, and you carry water to the surgeon. That is an order from your king.', reply: 'Yes, Your Grace. Yes. Thank you. I’ll carry all of it.', fx: { fam: { zofia: 2, halina: -1 } }, set: { zofia: 1 } },
    { label: 'Ser Bogdan’s squire takes you home. Now. Your mother has lost enough sleep.', reply: 'Then I’ll watch from the wall. You can’t order me not to look.', fx: { fam: { zofia: -1, halina: 1 } }, set: { zofia: 2 } }]);
  if (i === 1 && Z) { Z.offstage = true; Z.setVisible(false); this.inter = this.inter.filter((q) => q.id !== 'zofia'); SCENE.buildMarks(); }
};
/* ---------------------------------------------------------------- what the day comes to
   strength: the army as the weeks left it, plus a fed host, a word at the fire, and the plan (holding the rise is worth
   one; the flanking ride two with an army that can afford it, and costs one with an army that can't; one line nothing) */
WARCAMP.strength = function () {
  const a = REALM.army; return a + (WARCAMP.fed === 1 ? 1 : 0) + (WARCAMP.spoke === 1 || WARCAMP.spoke === 2 ? 1 : 0) + (WARCAMP.plan === 1 ? 1 : WARCAMP.plan === 2 ? (a >= 5 ? 2 : -1) : 0);
};
WARCAMP.result = function () {
  const s = WARCAMP.strength(), k = s >= 8 ? 2 : s >= 5 ? 1 : 0, save = AGENTS.has('dobrawa') ? 1 : 0;
  return { k, fx: [{ army: -3 + save, mood: -2, stores: -1, flag: { battle: 0 } }, { army: -2 + save, flag: { battle: 1 } }, { army: -1 + save, mood: 2, flag: { battle: 2 } }][k],
    line: ['The line went at the second charge, Your Grace. We are behind the stakes with what is left. They did not follow. I don’t know why.', 'We held. That is the whole of it: we are where we were this morning, and so are they, and the field between is full.', 'They broke, Your Grace. I watched them go and I still don’t believe it. The field is ours, and everything on it.'][k] };
};
WARCAMP.ride = async function () {
  const B = CAST.A.commander, K = SCENE.player; if (SCENE.lock || WARCAMP.fought) return;
  if (!WARCAMP.plan) { SCENE.say(B, 'A word at the map table first, Your Grace. I’d like to know which battle I’m dying in.'); return; }
  SCENE.lock++; let i; try { await SCENE.say(K, 'Their fires are going out one by one. They’re forming up.', { wait: true }); i = await NIGHT.ask(['Sound the horns. Form up the host.', 'Not yet']); } finally { SCENE.lock--; }
  if (i !== 0) return;
  WARCAMP.fought = true; const res = WARCAMP.result(); GAME.save();
  await BATTLE.play({ enemy: WARCAMP.war });   // it comes back to this room, at dusk
  SCENE.lock++;
  try { await SCENE.wait(1200); if (B) { K.faceTo(B.x); B.faceTo(K.x); } await SCENE.say(B || K, res.line, { wait: true }); REALM.fx(res.fx); if (res.fx.army > -3 + 0 && AGENTS.has('dobrawa')) COURT.toast('Dobrawa’s tent sent a tenth of them back to the line');
    await SCENE.wait(2600); } finally { SCENE.lock--; }
  await END.play();
};
/* from the accusation (INV.conclude): the host is already in the field */
WARCAMP.begin = async function (war) {
  WARCAMP.reset(); WARCAMP.war = war; await SCENE.prepare('warcamp'); SCENE.enter('warcamp', { x: -12.2, face: 1 }); R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame();
  GAME.save(); await NIGHT.fade(false);
};
MAP.gate = function () {   // no map on the morning of a battle
  if (!SCENE.room || SCENE.room.id !== 'warcamp') return false;
  SCENE.say(SCENE.player, SCENE.cycle('wcmap', ['The host marches at first light. There is nowhere else for a king to be.', 'Not today. Everything on that map is behind me.'])); return true;
};
