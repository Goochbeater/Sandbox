/* THE SWAN FESTIVAL — three grounds on the meadow below the fortress (STORY.md §6): the fair (g37_fair.js), the lists
   (g38_lists.js) and the pavilions (g39_camp.js), joined by gates at their ends; the Swan Meadow pin on the map leads to
   the fair. This file holds what they share: the festival's state (saved by GAME.state), the meadow's backdrop and light,
   stalls, bunting and the far tents, the camera moves for the shows, a speaker for things that aren't actors (puppets,
   a crowd), the timing meter (the hammer, the arm-wrestling), and all the festival's talk. */
const FEST = { bearFreed: false, cakes: 0, ribbon: null, puppets: null, fortune: 0, fires: 0, duels: 0, jousts: 0, favour: null, loveQueen: null, hammer: 0, wrestle: null, pact: null, met: {} };
FEST.init0 = JSON.stringify(FEST);
FEST.reset = function () { Object.assign(FEST, JSON.parse(FEST.init0)); };
FEST.state = function () { const s = {}; for (const k of Object.keys(JSON.parse(FEST.init0))) s[k] = FEST[k]; return s; };
FEST.load = function (s) { FEST.reset(); if (s) for (const k of Object.keys(JSON.parse(FEST.init0))) if (k in s) FEST[k] = s[k]; };
/* every festival ground is the same kind of room: a 32 m strip of meadow, the walk line at z 3, the yard's lens */
FEST.room = function (id, title, sub, more) {
  return SCENE.addRoom(new Room(id, Object.assign({ X0: -16, X1: 16, CEIL: 40, KZ: 3.0, cam: { y: 3.0, look: 2.7, dist: 19.4, fov: 19 }, exposure: 1.0, reflK: 0.25, far: 420,
    fog: [0xd8dcd0, 0.0024], music: 'garden', ambience: { crowd: 0.5, birds: 0.3, wind: 0.2 }, acoustics: { size: 1.6, wet: 0.08 }, surface: 'grass', caption: [title, sub] }, more || {})));
};
/* ---------------------------------------------------------------- the meadow: ground, sky, the fortress on its hill */
FEST.backdrop = function (room, o) {
  o = o || {}; const T = PX.T, RP = RAMP, D = 12;
  BUILD.plane('y+', -150, 150, -300, 14, 0, T.fairGround);
  BUILD.sky(T.skySummer, { z: -300, w: 760, h: 260, y: -50, k: 1.0 });
  /* far trees in haze, the hill with the Swan Fortress on it, the near trees at its foot */
  BUILD.card(T.forestFar, o.fx || 0, 0, -240, { w: 420, h: 52, basic: true, cast: false });
  const hx = o.fx || 0, hz = -230;
  BUILD.terrain({ x0: hx - 120, x1: hx + 120, z0: hz - 40, z1: hz + 70, step: 4, cast: false,
    h: (x, z) => { const u = (x - hx) / 55, v = (z - hz) / 36; return 16 * Math.exp(-(u * u + v * v) * 1.4) - 0.5; },
    cls: (x, z, ny) => (ny > 0.8 ? 'turf' : 'rock'), tex: { turf: T.turfPix, rock: T.cragPix }, side: { rock: true }, facet: { rock: true } });
  const tile = { stone: PX.stoneTile(RP.stone, D, 901), keep: PX.stoneTile(RP.keep, D, 902), red: PX.tileRoof(RP.red, D, 903), slate: PX.tileRoof(RP.slate, D, 904) };
  const F = (ramp, tl, seed, more) => Object.assign({ ramp, d: D, seed, tile: tl }, more || {}), y0 = 12, wz = hz + 10;
  BUILD.facade(hx - 22, hx + 22, y0, y0 + 9, wz - 2, wz, F(RP.stone, tile.stone, 911, { grime: 0.35 }));   // the curtain wall
  BUILD.crenels(hx - 22, wz, hx + 22, wz, y0 + 9, tile.stone, { w: 1.3, gap: 1.0, h: 1.3, t: 0.7 });
  BUILD.facade(hx - 3.2, hx + 3.2, y0, y0 + 12, wz - 1, wz + 1.2, F(RP.stone, tile.stone, 912, { win: [[3.2, 9, 'lancet', 0]], grime: 0.3 }));   // the gatehouse
  for (const [x, seed] of [[hx - 23, 921], [hx + 23, 922], [hx - 5.2, 923], [hx + 5.2, 924]]) { const big = Math.abs(x - hx) > 10, r = big ? 3.4 : 2.0, h = big ? 15 : 14;
    BUILD.tower(x, wz - 0.5, y0, y0 + h, r, F(RP.stone, tile.stone, seed, { win: [[0.3, h - 4, 'lancet', 0], [0.3, h - 9, 'slit']] })); BUILD.coneRoof(x, wz - 0.5, y0 + h, r * 1.18, r * 2.2, RP.red, D, { seed: seed + 5 }); }
  BUILD.roof(hx - 18, hx - 7, hz - 4, hz + 5, y0 + 10, 4.5, tile.red, { gable: tile.stone, over: 0.4 });   // the great hall
  BUILD.facade(hx + 6, hx + 15, y0, y0 + 24, hz - 8, hz, F(RP.keep, tile.keep, 931, { bands: [8, 16], win: [[2.5, 6, 'tall', 0], [6.5, 6, 'tall', 0], [4.5, 14, 'lancet', 0], [2.5, 20, 'lancet', 0], [6.5, 20, 'lancet', 0]] }));   // the keep
  BUILD.coneRoof(hx + 10.5, hz - 4, y0 + 24, 6.6, 8, RP.slate, D, { seg: 4, seed: 934 });
  BUILD.tower(hx - 10, hz - 6, y0, y0 + 17, 1.8, F(RP.stone, tile.stone, 941, { win: [[0, 13, 'lancet', 0]] })); BUILD.coneRoof(hx - 10, hz - 6, y0 + 17, 2.2, 9, RP.slate, D, { seed: 942 });   // the chapel's spire
  for (const [x, y, z, t] of [[hx - 23, y0 + 15 + 7.5, wz - 0.5, T.pennantBlue], [hx + 23, y0 + 15 + 7.5, wz - 0.5, T.pennantBlue], [hx + 10.5, y0 + 32, hz - 4, T.pennantRed]]) {
    BUILD.box(x - 0.15, x + 0.15, y - 0.6, y + 3.4, z - 0.15, z + 0.15, T.woodPost, { cast: false }); BUILD.windCard(t, x + 4, y + 1.6, z, 'wave', 0.1, { cast: false, s: 3.2 }); }
  BUILD.card(T.forestMid, hx - 70, 0, -170, { w: 128, h: 20, basic: true, cast: false }); BUILD.card(T.forestMid, hx + 80, 0, -175, { w: 128, h: 20, basic: true, cast: false });
  BUILD.card(T.forestNear, hx, 0, -150, { w: 70, h: 12, basic: true, cast: false });
  /* the town's roofs to the west, if this ground can see them */
  if (o.town) for (const [x0, x1, z0, z1, hh, seed] of [[-78, -66, -96, -86, 7, 951], [-64, -54, -104, -92, 8, 952], [-92, -80, -110, -98, 6.5, 953], [-52, -44, -90, -82, 6, 954], [-70, -60, -120, -110, 9, 955]]) {
    BUILD.facade(x0, x1, 0, hh, z0, z1, F(RP.inner, PX.stoneTile(RP.inner, D, seed), seed, { win: [[(x1 - x0) * 0.3, hh - 2.6, 'square', 0], [(x1 - x0) * 0.7, hh - 2.6, 'square', 0]], grime: 0.3 }));
    BUILD.roof(x0, x1, z0, z1, hh, 3.6, tile.red, { gable: tile.stone, over: 0.4 }); }
  /* a sea of tents behind the ground, flags on every one */
  const cans = [T.canvasKrasna, T.canvasSwan, T.canvasTeal, T.canvasLilac], pens = [T.pennantRed, T.pennantBlue, T.pennantLeague, T.pennantKrasna];
  for (const [x, z, r, i] of o.tents || []) BUILD.tent(x, z, r, r * 1.05, r * 0.9, cans[i % 4], cans[i % 4], { pennant: pens[i % 4], seg: 12 });
  BUILD.flock(T.crow, [[-20, 26, -60, 12, 2, 0.3], [24, 30, -80, 16, 3, -0.25]], { s: 2.0 });
};
/* the afternoon sun from the west, with long shadows; a summer sky's fill; a warm bounce off the meadow */
FEST.lights = function (room) {
  BUILD.light(new THREE.HemisphereLight(0xb4ccec, 0x6a7440, 1.35), 0, 20, 0);
  room.sun = BUILD.shadow(BUILD.light(new THREE.DirectionalLight(0xfff0d6, 3.3), -30, 15, 18), R.q === 'low' ? 1024 : 2048); room.sun.target.position.set(0, 0, 0);
  Object.assign(room.sun.shadow.camera, { left: -26, right: 26, top: 16, bottom: -16, near: 1, far: 100 }); room.sun.shadow.camera.updateProjectionMatrix(); room.sun.shadow.bias = -0.0008;
  const fill = BUILD.light(new THREE.DirectionalLight(0xc8d4e8, 0.45), 18, 7, 18); fill.target.position.set(0, 1, 0);
  room.rim = [-20, 6, 5, 0.7, 60, 0xfff0d0, null]; room.shadowSrc = [-28, 11, 11, 80]; room.keyK = 0.95;
};
/* a stall: four poles, a striped awning sloping down to the front with its dagged edge, the painted counter and wares */
FEST.stall = function (x, z, w, front, awning, o) {
  o = o || {}; const T = PX.T, d = 1.5, h0 = 2.5, h1 = 2.05, x0 = x - w / 2, x1 = x + w / 2;
  for (const px of [x0 + 0.06, x1 - 0.06]) for (const pz of [z - d / 2, z + d / 2]) BUILD.box(px - 0.05, px + 0.05, 0, pz < z ? h0 : h1, pz - 0.05, pz + 0.05, T.woodPost);
  const g = new THREE.PlaneGeometry(w + 0.3, Math.hypot(d + 0.3, h0 - h1)); g.rotateX(-Math.PI / 2 + Math.atan2(h0 - h1, d + 0.3)); g.translate(x, (h0 + h1) / 2 + 0.03, z);
  BUILD.planarUV(g, awning); BUILD.add(new THREE.Mesh(g, BUILD.std(awning, { side: THREE.DoubleSide, rough: 0.9 })), { cast: true });
  BUILD.card(awning, x, h1 - 0.42, z + d / 2 + 0.16, { w: w + 0.3, h: 0.42, cast: false });   // the valance off the front edge, shallow enough to clear the wares
  BUILD.card(front, x, 0, z + d / 2 - 0.12, { w: o.fw || w * 0.94, h: o.fh || (w * 0.94) * front.userData.h / front.userData.w, cast: true });
  BUILD.solid(x0, x1, 0, h1, z - d / 2, z + d / 2);
};
/* smoke from a grill or a fire: soft puffs that rise, spread and fade, one after another */
FEST.smoke = function (room, x, y, z, k) {
  const puffs = []; for (let i = 0; i < 5; i++) { const m = new THREE.SpriteMaterial({ map: PX.T.smokeSoft, color: 0x8a8480, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(m); BUILD.add(s, { cast: false }); puffs.push({ s, m, ph: i / 5 }); }
  room.tick.push((T) => { for (const p of puffs) { const u = (T * 0.22 + p.ph) % 1; p.s.position.set(x + Math.sin(u * 5 + p.ph * 9) * 0.15 + u * 0.5, y + u * 2.2 * (k || 1), z);
    p.s.scale.setScalar((0.35 + u * 1.3) * (k || 1)); p.m.opacity = 0.32 * Math.sin(u * Math.PI) * (k || 1); } });
};
/* bunting on two poles: o.y high; the flags sway */
FEST.bunting = function (x0, x1, z, y) {
  const T = PX.T; for (const x of [x0, x1]) BUILD.box(x - 0.05, x + 0.05, 0, y + 0.3, z - 0.05, z + 0.05, T.woodPost, { cast: false });
  for (let x = x0; x < x1 - 0.5; x += 4) BUILD.windCard(T.bunting, x + 2, y - 0.5, z, 'wave', 0.06, { cast: false, w: Math.min(4, x1 - x), h: 0.5 });
};
/* ---------------------------------------------------------------- shows: the camera, voices, the meter */
/* ease the lens to a new framing (focus x, dist, y, look) and back (to = null); resolves when it's there */
FEST.cam = (room, to, dur) => SCENE.lens(room, to, dur);   // engine/e06: eases focus, dist, y, look and fov
/* walk the king to a place to watch from (out of the show's way), wait until he has stopped, and turn him to face it */
FEST.stepTo = async function (x, lookX) {
  const K = SCENE.player; if (Math.abs(K.x - x) > 0.1) await new Promise((res) => K.walkTo(x, res));
  for (let i = 0; i < 60 && Math.abs(K.v) > 0.1; i++) await SCENE.wait(30);
  if (lookX !== undefined) { K.faceTo(lookX); K.lookYaw = Math.sign(lookX - K.x) * 1.0; }
};
/* something that can speak a bubble but isn't an actor: a puppet, a voice from the crowd */
FEST.voice = function (x, y, z) { const v = { x, y, z, v: 0, talking: false, visible: true, speakAt: (out) => out.set(v.x, v.y, v.z) }; return v; };
/* the timing meter: a needle runs back and forth; E, Space or a tap stops it. Resolves 0..1 (1 = dead in the gold) */
FEST.meter = function (label) {
  return new Promise((res) => {
    const el = document.createElement('div'); el.className = 'meter'; el.innerHTML = '<span></span><div class="track"><i></i><b></b></div>'; el.querySelector('span').textContent = label;
    $('ui').appendChild(el); const knob = el.querySelector('b'), t0 = performance.now(); let done = false;
    const pos = () => { const u = ((performance.now() - t0) / 1000) % 2; return u < 1 ? u : 2 - u; };
    const loop = () => { if (done) return; knob.style.left = (pos() * 100).toFixed(1) + '%'; requestAnimationFrame(loop); }; loop();
    const hit = (e) => { if (done || (e.type === 'keydown' && !['KeyE', 'Space', 'Enter'].includes(e.code))) return; e.preventDefault(); e.stopPropagation(); done = true;
      window.removeEventListener('keydown', hit, true); window.removeEventListener('pointerdown', hit, true);
      const p = pos(), score = clamp(1 - Math.abs(p - 0.86) / 0.4, 0, 1); el.classList.add('done'); knob.style.left = (p * 100).toFixed(1) + '%'; setTimeout(() => el.remove(), 700); res(score); };
    setTimeout(() => { window.addEventListener('keydown', hit, true); window.addEventListener('pointerdown', hit, true); }, 250);   // the tap that opened it doesn't stop it
  });
};
FEST.say = (who, key, lines) => SCENE.say(who, SCENE.cycle(key, lines));
/* a choice under the picture, outside the adult scenes: NIGHT.ask's strip, which any conversation can use */
FEST.ask = (opts) => NIGHT.ask(opts);
/* talk to a festival actor: a fuller first meeting, then one line at a time. T: { first: [[who, text]], more: [...] } */
FEST.talk = async function (id, T) {
  if (CAL.phase === 'crisis' && INV.TALK[id]) return INV.talk(id);   // chapter four: everyone is asked about the feast (g48)
  const A = CAST.A, a = A[id], K = SCENE.player; if (!a) return;
  K.faceTo(a.x); if (!a.sitting) { a.faceTo(K.x); a.lookYaw = Math.sign(K.x - a.x) * 0.8; }
  const who = (k) => (k === 'king' ? K : k === id ? a : A[k] || a);
  if (T.first && !FEST.met[id]) { FEST.met[id] = true; await SCENE.talk(T.first.map(([k, t]) => [who(k), t])); }
  else await SCENE.say(a, SCENE.cycle('ft' + id, T.more));
  if (!a.sitting) a.lookYaw = null;
};
/* put a talk marker over each named actor in the room (they don't wander, so the marker stays put) */
FEST.talkers = function (room, list) {
  for (const [id, label, fn] of list) { const a = CAST.A[id]; if (!a || !a.visible || room.inter.some((i) => i.id === id)) continue;   // no marker over someone who isn't there (the dead king, in chapter four)
    const hy = (a.curHome && a.curHome.sit ? a.curHome.sit.y - 0.5 : a.y) + (a.spec.headY || 2.05) + 0.45;   // over the head, standing or seated (in the stand, far off)
    room.interact(id, a.x, hy, a.z, 0.8, fn || (() => FEST.talk(id, FEST.TALK[id]))).label = label || 'Talk to ' + (a.name || id); }
  SCENE.buildMarks();
};
/* a wandering actor's talk marker follows them (call from the room's onUpdate) */
FEST.follow = function (room) { for (const it of room.inter) { const a = CAST.A[it.id]; if (a && a.curHome && a.curHome.wander) { it.x = a.x; it.p.x = a.x; } } };
/* ---------------------------------------------------------------- what everyone says */
FEST.TALK = {
  queen: { first: [['queen', 'You came. I had a wager with Zofia that you would spend the whole fair in the Krasnian tent.'], ['king', 'What did you wager?'],
      ['queen', 'A honey cake. I’ve already eaten it.']],
    more: ['Buy the boy a honey cake and stop looking at the pavilions. The pact will keep for an hour.', 'Half the town is here. The other half is picking the first half’s pockets.',
      'Gniewomir kissed my hand for so long I thought he was reading my rings.'] },
  kazik: { first: [['kazik', 'Father! Father, the bear has a name, it’s Wojciech, and he hates dancing. You can tell.'], ['king', 'How can you tell?'],
      ['kazik', 'He looks at the ground the whole time. That’s what I do in dancing lessons.']],
    more: ['If you bought him, he could live in the Wood. The Woman would let him. She lets the crows.', 'Wojciech is looking at me. I think he knows we’re talking about him.',
      'Can the bear come to the castle? He could sleep in Ser Bogdan’s bed. Ser Bogdan sleeps in the yard anyway.'] },
  martaFair: { first: [['martaFair', 'Your Grace! My mill’s flour, my hands, my oven. The Krasnians have bought half of it already.'], ['king', 'How is the mill road?'],
      ['martaFair', 'Quiet, since the crown remembered us. My boys are here somewhere, drinking what I paid them.']],
    more: ['Take a loaf for the queen. She won’t eat it, but she’ll like that you brought it.', 'The Krasnian cooks buy flour like they mean to feed an army.'] },
  bartosz: { first: [['bartosz', 'Bartosz Kuglarz, Your Grace, master of the players and keeper of the finest bear in three kingdoms!'], ['king', 'He doesn’t look happy.'],
      ['bartosz', 'He’s a bear, Your Grace. They never look happy. It’s the eyebrows.'], ['bartosz', 'The Salamanders go on when the crowd’s thick. Ask, and they’ll light the sky for you.']],
    more: ['Three sisters, three mouths full of fire, not one burnt eyebrow in eleven years.', 'The bear? Bought him off a monk. Don’t ask what the monk wanted him for.',
      'You’ve a kind face for a king. It’s bad for business, but it’s a kind face.'],
    fire: ['Lords, ladies, and you lot at the back! The Salamanders of the South!', 'Mind your hats! The Salamanders!'] },
  salA: { more: ['Mira. The eldest. I do the big one at the end.', 'Lamp oil, a mouthful of it, and a very good reason not to breathe in.'] },
  salB: { more: ['Tessa. The middle one. The one who caught fire in Velka, once. Once.', 'The Krasnian prince asked if we do private shows. We told him the price. He went pale.'] },
  salC: { more: ['Ola. The youngest. I juggle the torches while they do the hard part.', 'You should see it at night. In the day it’s only fire. At night it’s a wonder.'] },
  fortune: { first: [['fortune', 'Sit, my king. No coin. The cards have already been paid for.'], ['king', 'By whom?'],
      ['fortune', 'By you, a long time ago. Shall I turn one over?'], ['fortune', 'The Tower, and a cup. You’ll lose something at the feast.'], ['fortune', 'Not yours.']],
    more: ['The cup again. It keeps coming up. I’d keep an eye on cups, if I were a king.', 'A bear in the Wood, a crow at a window, a king on the floor. The cards are in a mood today.',
      'You’ve a cat’s hair on your sleeve. Black. I won’t ask whose.'] },
  townA: { more: ['Sun for the festival. Seven days of it, they say. The priest says it’s a miracle. My wife says it’s witchcraft. I say it’s sun.', 'The Krasnian ale is weak and their songs are long.'] },
  townB: { more: ['Your Grace! Oh — Your Grace. I didn’t, I’m sorry. Lovely day for it.', 'Did you see the Salamanders? I’ve never been so warm in my life.'] },
  townC: { more: ['Three hundred Krasnian knights in the meadow and not one of them can dance.', 'My cousin says the masked knight is a ghost. My cousin also says the bear can talk.'] },
  townD: { more: ['The saint’s blessing is at noon. I want a good spot. She looks right at you, they say.', 'Ribbons, Your Grace? For the queen? Or for — well. For the queen.'] },
  fairGuard: { more: ['All quiet, Your Grace. Two pickpockets, one brawl, and a goose loose in the ale tent.', 'The bear’s chain is stronger than it looks. So is the bear.'] },
  herald: { more: ['Hear ye, and so on, Your Grace. My voice goes at three. I’m saving it.', 'The Black Swan Knight gives no name. The rules allow it, if the Marshal does.'],
    duel: ['My lords! Ser Bogdan, Commander of Lodmir, against Ser Ottokar Wilk, Champion of the Queen of Krasna!', 'Again, my lords! Bogdan of Lodmir, Ottokar of Krasna!'],
    joust: ['Prince Mściwoj of Krasna! Against the Black Swan Knight, who gives no name!', 'Three courses, my lords! Prince Mściwoj, and the Black Swan!'] },
  marshal: { first: [['marshal', 'Ser Dobiesław, Marshal of the Lists. Your Grace honours us.'], ['king', 'Who is the masked knight?'],
      ['marshal', 'He paid his fee and swore the oath with his visor down. The old rules allow it. I didn’t write the old rules, Your Grace.']],
    more: ['Blunted lances, Your Grace. Mostly blunted.', 'The Krasnian prince has broken eleven lances this morning and one squire.', 'If you would give a favour, Your Grace, the herald will carry it.'] },
  zofia: { first: [['zofia', 'Father! Did you see? Two in the gold and one in the blue, and the Krasnian boy got one in the grass.'], ['king', 'You’re in the junior bouts?'],
      ['zofia', 'The Marshal said the rules don’t say “boys”. Mother said the rules don’t say “princesses” either. So.']],
    more: ['If I win, I want a real bow. With a name.', 'Ser Bogdan says I pull with my shoulder and not my back. Ser Bogdan pulls with his mouth.'] },
  dorota: { first: [['dorota', 'Your Grace. The blessing went well, I think. They cheered the lances louder than God, but that’s tournaments.'], ['king', 'You were the most beautiful thing on the field.'],
      ['dorota', 'Hush. The queen is twenty paces away, and the Canon is ten. Bless you, Your Grace. Loudly.']],
    more: ['Every knight wanted me to touch his lance before the joust. I told them the saints are very busy.', 'Come to the chapel tonight. For confession. Bring a great deal to confess.',
      'The Krasnian queen hasn’t taken her eyes off her champion. Interesting, isn’t it.'] },
  commander: { more: ['A Krasnian, Your Grace. I’ve been waiting twelve years to hit one with permission.', 'Ottokar fights like a man with something to lose. I fight like a man with a pension.'] },
  ottokar: { first: [['ottokar', 'Ser Ottokar Wilk. My queen’s shield. Your commander has a fine arm, Your Grace.'], ['king', 'You serve the queen, not the king?'],
      ['ottokar', 'In Krasna that is a distinction with a difference. Excuse me.']],
    more: ['My queen asks that you forgive her for not rising. The stand is high and her husband is watching.', 'I don’t talk about the black knight. Nobody in our camp does.'] },
  gniewomir: { first: [['gniewomir', 'Bolesław’s boy! Look at you, with his chin and none of his temper. Sit, sit. Wine?'], ['king', 'You never came, in the siege.'],
      ['gniewomir', 'No. I was a coward with a large army, and your father was a brave man with a small one. Let’s not do it that way again.'],
      ['gniewomir', 'My pact, Radomir. My knights in your pass, my road through your mountains, and nobody from Hal ever darkens your gate again. Think on it. Not long.']],
    more: ['I have one summer left in me, the physicians say. I’d like to spend it being thanked.', 'Your wife is cleverer than you. Mine is cleverer than me. It’s the way of things.',
      'This Black Swan of yours — who pays for a mask like that? Somebody angry and rich.', 'Sign it at the feast, in front of everyone. A pact is a performance.'] },
  wieslawa: { first: [['wieslawa', 'King Radomir. My husband talks of nothing but your pass. I am the other thing he talks about, now and then.'], ['king', 'You were born in Velka.'],
      ['wieslawa', 'And married in Krasna. Your wife and I were girls at the same court. Ask her what I was like. Then ask her what I’m like now.']],
    more: ['My cousin Jarek is on his barge counting things. He’ll be counting you next.', 'Ser Ottokar is my sworn shield. You will find him wherever I am. Most places.',
      'The prince hates the pact. The king loves it. I love a quiet room, and there are none.'] },
  msciwoj: { first: [['msciwoj', 'The host! Come to see if Krasna’s prince is as tall as they say? He is.'], ['king', 'And the pact?'],
      ['msciwoj', 'My father’s pact. When I am king, I will want your friendship, not your mountains. Tell him I said it. He won’t listen.'],
      ['msciwoj', 'Arm-wrestle me, Radomir. A king who won’t is a king who can’t.']],
    more: ['That masked crow unseated three of my knights. Tomorrow he meets me.', 'My father is dying and pretending he isn’t. Kings are bad at both.', 'Again? Your arm is still attached, so we can go again.'] },
  jarek: { first: [['jarek', 'Brother-in-law! You look poorer. Is that the festival, or the rain?'], ['king', 'You came in person.'],
      ['jarek', 'For my sister. And because a road through your pass would empty my river. You understand. It’s nothing personal. It’s tolls.']],
    more: ['Halina writes that you’re keeping a secret. She writes it in the margins, which is how she shouts.', 'Gniewomir’s road would cost the League thirty thousand a year. I mention it in passing.',
      'Your toll-keepers at the Kalina ford are very honest men. Very honest. Don’t look at the books.'] },
  squire: { first: [['squire', 'My knight sees no one, Your Grace. He apologises. He says he has seen you before.'], ['king', 'Where?'],
      ['squire', 'He didn’t say. He asked me what the gate below the chapel tower is called now. I said I didn’t know. Do you?']],
    more: ['My knight prays at night, facing the Wood. I don’t ask.', 'The black horse is called Ash. He bites everyone but my knight.'] },
  groom: { more: ['That grey is the prince’s. Best horse in the meadow and he knows it. Mind his teeth — no, he likes you.', 'Hay, water, and nobody waving flags at them. That’s all a horse wants.'] },
  kSoldierA: { more: ['Your Grace. The prince says we’re guests. The prince says a lot of things.', 'Your ale is better than ours. Don’t tell the prince.'] },
  kSoldierB: { more: ['Twelve years since the siege. My father was in the army that didn’t come. He drinks about it.', 'Pretty country, Your Grace. Wet, though.'] },
};
FEST.LINES = {
  road: ['The road back to the town, and the map.'], toLists: ['Through the gate to the lists.'], toFair: ['Back through the gate to the fair.'], toCamp: ['On along the river to the pavilions.'],
  honey: ['Honey cakes. The bees are royal, technically. They live on crown land.', 'I’ll take three. One for Kazik, one for Halina, one for the walk.'],
  sausage: ['Sausages on the coals. The smoke smells like every summer of my childhood.', 'A sausage, a king, a moment of peace.'],
  ribbons: ['Ribbons for a lady’s sleeve, or a lady’s favourite. Silk from the south, dyed in Velka.'],
  bread: ['Marta’s bread. Her mill, her flour, her oven, and a queue of Krasnian cooks.'],
  ale: ['The ale tent. The noise from in there is half song and half argument.', 'Someone in there is singing about my father. The words are not kind. The tune is lovely.'],
  stage: ['The Salamanders’ stage. The backcloth is scorched in three places.'],
  puppetBooth: ['A puppet booth. The king puppet has my beard and somebody else’s belly.'],
  wagon: ['A painted wagon with an eye on the door. The eye follows you. It’s only paint.'],
  maypole: ['The maypole. The ribbons will be plaited by sunset, if the dancers don’t kill each other.'],
  striker: ['The strongman’s hammer. Ring the bell and win a ribbon. Kings ring it more often than you’d think. Or it’s rigged.'],
  tilt: ['The tilt: a barrier down the middle so the horses can’t meet head on. Only the lances do.'],
  stand: ['The royal stand. Halina, Gniewomir, and Wiesława, in three chairs that don’t like each other.'],
  stands: ['The town in its best clothes, on planks Bogdan swears will hold.'],
  butts: ['The archery butts. Zofia’s arrows are the ones in the middle.'],
  tower: ['The heralds’ tower. The herald climbs it to be heard and stays up there to be left alone.'],
  pavilion: ['Gniewomir’s pavilion: red and white, bigger than my chapel, with a carpet in it.'],
  barge: ['The League’s barge, moored where everyone can see it. Jarek does nothing by accident.'],
  blackTent: ['A black tent with no banner. The squire guards it like there’s a body inside.'],
  campfire: ['Krasnian soldiers round a fire, cooking something that used to be a goose.'],
  horses: ['The horse lines. Destriers the size of houses, eating like it’s their last day.'],
  river: ['The river, low and brown. Seven days of sun and it’s already shy.'],
};
