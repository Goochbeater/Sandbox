/* AGENTS — the two people the king can take into his service (STORY.md §2): Dobrawa the herbalist, who comes down from the
   hills in week three to treat Kazik, and Brother Anzelm the chronicler, who is at the study's shelves in week four.
   Each is a moment (REALM.EVENTS) that sets a flag. A recruit then matters in four places:
     the court     a new agent in the aid panel (COURT.agents; shown only on petitions they are fit for), and an option in
                   later petitions that exists only with them (`need: 'dobrawa'` on an option; REALM.choose filters)
     the murder    their own road to a clue (INV.TALK): Anzelm reads the old seal, Dobrawa smells that the root was dried
     the Woman     a piece of what the king needs to name her (END.named; the journal lists what he has: AGENTS.lore)
     the room      they stay where they were met, with something to say in every chapter (AGENTS.talk)
   Whoever is turned away is gone when the king next comes in. */
const AGENTS = {
  dobrawa: { room: 'garden', week: 3, name: 'Dobrawa', agent: { id: 'herbalist', name: 'Dobrawa', title: 'Herbalist', ap: 2, max: 2, wound: 0, recruit: true } },
  anzelm: { room: 'study', week: 4, name: 'Brother Anzelm', agent: { id: 'chronicler', name: 'Brother Anzelm', title: 'Chronicler', ap: 2, max: 2, wound: 0, recruit: true } },
};
/* ---------------------------------------------------------------- who they are */
CAST.specs.dobrawa = Object.assign(townswoman('dobrawa', 0x4a5a3a, 0x9a9488, 'Hair_Buns', { garden: { x: 7.35, z: 2.2, face: -1, idle: 'Idle_Loop' } }),
  { name: 'Dobrawa', s: 0.95, skin: 0xd8a888, brows: 0x6a6258, robe: { col: 0x3e4c30, top: 0.95, bot: 0.05, rx: [0.16, 0.34], rz: [0.13, 0.28], trim: 0x8a6a3a, leg: 0.45 } });
CAST.specs.anzelm = { id: 'anzelm', name: 'Brother Anzelm', lazy: true, bind: 'rmale', s: 0.98, skin: 0xd8b094, skinK: 0.9, home: 'study', x: -5.55, z: 1.5, face: -1, headY: 2.08, idle: 'Idle_Loop',
  parts: [part(P_M('Body'), { L: 0x7a6040, P: 0x8a7048 }), part(P_M('Arms'), { L: 0x7a6040, P: 0x7a6040 }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x4a3a28, P: 0x4a3a28 }), part(P_M('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
  brows: 0x8a8278, hair: [['Hair_Buzzed', 0x9a9288]], robe: { col: 0x7a6040, top: 1.0, bot: 0.04, rx: [0.17, 0.33], rz: [0.13, 0.28], trim: 0xd0c098, leg: 0.5 }, prop: 'scroll' };   // an undyed habit with a pale hem: a dark one vanished against the shelves
/* ---------------------------------------------------------------- the two moments */
REALM.EVENTS.push(
  { id: 'dobrawa', week: 3, room: 'garden', who: 'dobrawa', note: 'A hill-woman is in the garden with Kazik, and a jar of something',
    talk: [['dobrawa', 'Hold still, little prince. Coltsfoot and honey. It tastes like a wet dog, and it works.'], ['kazik', 'The big crow gave me this. For luck.'],
      ['dobrawa', '(She takes a black feather out of his fist. It is knotted with red thread. She looks at you, and not at him.)'],
      ['dobrawa', 'Dobrawa, Your Grace. The Queen sent to the hills for me. I know whose knot that is. So do you.']],
    options: [{ label: 'Stay in the castle, Dobrawa. For the boy. And for what you know.', reply: [['dobrawa', 'For the boy. What I know costs extra: I’ll want the old still-room, and no priest in it.']], fx: { gold: -1, fam: { kazik: 1, halina: 1 }, flag: { dobrawa: 1 } } },
      { label: 'Treat his cough. The feather is a child’s toy.', reply: [['dobrawa', 'Then I’ll burn the toy, and go home. Send to the hills again when it rains.']], fx: { fam: { kazik: 1 }, flag: { dobrawa: 0 } } },
      { label: 'We have a physician. Thank the Queen for her trouble.', reply: [['dobrawa', 'You have a man who bleeds children. Good day, Your Grace.']], fx: { fam: { halina: -1 }, flag: { dobrawa: 0 } } }] },
  { id: 'anzelm', week: 4, room: 'study', who: 'anzelm', note: 'A monk is at the shelves in the study',
    talk: [['anzelm', 'Forgive me, Your Grace. The steward said the shelves, not the desk. I have not touched the desk.'],
      ['anzelm', 'Brother Anzelm, of the Kalina cloister. The abbot wants a chronicle of the siege, to be read at midsummer.'],
      ['anzelm', 'The rolls stop on the nineteenth night. They begin again on the twenty-first, in another hand. I would like to know what the twentieth was.']],
    options: [{ label: 'The archive is yours. Write what you find, and bring it to me first.', reply: [['anzelm', 'To you first. And then as it was, Your Grace. I am too old to write it twice.']], fx: { gold: -1, fam: { halina: 1 }, flag: { anzelm: 1 } } },
      { label: 'Write the siege the town remembers. Nineteen days.', reply: [['anzelm', 'Nineteen days and a miracle. It reads well aloud. I will write that one at the cloister, then.']], fx: { mood: 1, flag: { anzelm: 0 } } }] });
/* ---------------------------------------------------------------- what a recruit changes in court */
Object.assign(REALM.PETS.flood.fit, { herbalist: 1 }); Object.assign(REALM.PETS.sWall.fit, { herbalist: 1 }); Object.assign(REALM.PETS.warehouse.fit, { chronicler: 2 });   // poultices for the diggers and the hauliers; a mob won't push a monk off a doorstep
REALM.PETS.sGate.options.push({ need: 'dobrawa', label: 'Open the gate. Dobrawa looks at every one of them before they pass.', reply: ['Then the sick get a bed, and the well get a wall to sleep under. That is more than we came to ask.'], fx: { stores: -2, mood: 2, army: 1, flag: { sGate: 4 } } });
REALM.PETS.mother.options.push({ need: 'anzelm', label: 'He goes to the Kalina cloister, under Brother Anzelm’s roof. Not a cell, and not the street.', reply: ['A cloister. He can’t even sing. But yes. God keep you, Your Grace.'], fx: { mood: 1, flag: { jacek: 2 } } });
REALM.PETS.sQuarter.options.push({ need: 'anzelm', label: 'They go. Brother Anzelm writes down every house and what is in it, to be given back.', reply: ['A roll, under a monk’s seal. My lord did not expect that of Lodmir. Nor did I.'], fx: { days: 2, mood: -1, flag: { sQuarter: 4 } } });
REALM.ECHO.push(['sGate', 4, 'c7', 'No fever inside the Ostrów gate, Your Grace. Dobrawa turned eleven aside to the pest-house, and nobody argued with her.', null],
  ['jacek', 2, 'c8', 'The cupbearer is copying psalms at the Kalina cloister. Badly, the brothers say. Krasna has not asked for him.', null]);
AGENTS.has = (k) => REALM.flags[k] === 1;
/* the aid panel's roster follows the flags (a new game or a load starts from Bogdan and Ilka: COURT.reset) */
AGENTS.sync = function () {
  for (const k in AGENTS) { const d = AGENTS[k]; if (!d.agent) continue; const i = COURT.agents.findIndex((a) => a.id === d.agent.id);
    if (AGENTS.has(k) && i < 0) COURT.agents.push(Object.assign({}, d.agent)); else if (!AGENTS.has(k) && i >= 0) COURT.agents.splice(i, 1); }
  if (SCENE.room && SCENE.room.built) { AGENTS.stage(SCENE.room, true); SCENE.buildMarks(); }   // the marker over a new recruit, without waiting for the next visit
};
/* ---------------------------------------------------------------- in their rooms */
AGENTS.here = (k) => AGENTS.has(k) || (CAL.phase === 'court' && CAL.week === AGENTS[k].week && REALM.flags[k] === undefined);
AGENTS.stage = function (room, keep) {   // keep: don't touch who is standing there (mid-visit); only the talk markers
  for (const k in AGENTS) { const d = AGENTS[k], a = CAST.A[k]; if (!d.room || d.room !== room.id || !a) continue;
    if (!keep) { const v = AGENTS.here(k); a.offstage = !v; a.setVisible(v); }
    let it = room.inter.find((i) => i.id === k);
    if (!it && AGENTS.has(k)) { it = room.interact(k, a.x, (a.spec.headY || 2) + 0.7, room.KZ, 0.9, () => AGENTS.talk(k)); it.label = 'Talk to ' + d.name; }
    if (it) it.hidden = !(AGENTS.has(k) && a.visible); }
};
AGENTS.TALK = {
  dobrawa: { lore: ['My grandmother left milk on the step for her, and called her by a name. I won’t say it in a garden.', 'But know this much: a thing that is named has to bargain. That is the whole of the old law.'],
    court: ['He slept through the night. It’s the honey. The coltsfoot is there to make him respect it.', 'Your still-room had forty years of dust in it, and one dead owl. I kept the owl.'],
    festival: ['Seven dry days in a year like this one. I’d ask who paid for them, if I thought I’d like the answer.', 'I’ve told the prince the bear is not for freeing. He is thinking about it.'],
    ch5: ['Lint, honey, strong wine and a saw. That is all there is to a war, from where I stand.'], done: ['It rains like rain now. Just rain. I had forgotten the sound of it.'] },
  anzelm: { lore: ['The twentieth night is not in the rolls, Your Grace. But your father wrote a word in the margin of the nineteenth, and scraped it out.', 'Scraped vellum remembers. In a slanting light I can read it. I think it is a name.'],
    court: ['Your father’s clerks wrote a fine hand, and lied in it very evenly. One gets fond of them.', 'Nineteen days of siege, Your Grace, and somebody counted every loaf. I know what Lodmir ate. Not yet why it lived.'],
    festival: ['They will read my chronicle at the Blessing of the Lists. I have left the twentieth night as a blank line. Let them wonder.', 'A fair is a chronicle with the dull parts taken out.'],
    ch5: ['I am writing this week as it happens. It is harder. Nobody has decided yet what it was.'], done: ['It is written, Your Grace. All twenty nights. You may burn it or bind it.'] },
};
AGENTS.talk = async function (k) {
  if (SCENE.lock) return; if (CAL.phase === 'crisis' && INV.TALK[k] && REALM.done['lore:' + k]) return INV.talk(k);
  const a = CAST.A[k], K = SCENE.player, T = AGENTS.TALK[k]; K.faceTo(a.x); a.faceTo(K.x); a.lookYaw = Math.sign(K.x - a.x) * 0.8;
  SCENE.lock++;
  try { if (!REALM.done['lore:' + k]) { REALM.done['lore:' + k] = 1; for (const t of T.lore) await SCENE.say(a, t, { wait: true }); INV.badge(true); GAME.save(); }
    else await SCENE.say(a, SCENE.cycle('ag_' + k + CAL.phase, T[CAL.phase] || T.court), { wait: true }); }
  finally { SCENE.lock--; a.lookYaw = null; }
};
/* ---------------------------------------------------------------- the murder: their own road to a clue (g48) */
INV.ALT = {
  oldSeal: { anzelm: ['The old Margrave’s seal', 'Brother Anzelm counted the boar’s tusks: four. Dietrich’s seal has two. This is his father’s, struck for the captains who died under my walls. Somebody took it from a dead hand and kept it twelve years.', 'Brother Anzelm, in the study'] },
  dried: { dobrawa: ['Dried in a cellar', 'Dobrawa smelled the scraping from the cup: no bite in the nose. Fresh root makes the eyes run. This was dried and kept somewhere damp: cellar stock, sold by the measure in the river quarter, for rats.', 'Dobrawa, in the garden'] },
};
INV.TALK.anzelm = () => (INV.has('signet') && !INV.has('oldSeal')
  ? [['king', '(He lays the signet on the open roll.)'], ['anzelm', 'A boar, and HAL round it. But count the tusks, Your Grace: four. Dietrich’s seal has two. He changed it when he buried his father.'],
    ['anzelm', 'This is the old Margrave’s. They were struck for his captains, and his captains died under your walls. Somebody took this from a dead hand, and kept it twelve years.'], ['find', 'oldSeal', 'anzelm']]
  : [['anzelm', SCENE.cycle('iAnzelm', ['A king dead at a feast. I have nine of those in the chronicles. In seven of them it was somebody at the table.', 'Bring me anything with writing on it, Your Grace. Or a seal. Seals don’t know how to lie.'])]]);
INV.TALK.dobrawa = () => (INV.has('lip', 'wolfsHood') && !INV.has('dried')
  ? [['king', '(He shows her a scraping from the cup’s lip, in a fold of linen.)'], ['dobrawa', '(She smells it. She does not taste it.) Wolf’s hood, yes. But there’s no bite in the nose. Fresh root makes your eyes run.'],
    ['dobrawa', 'This was dried, and kept somewhere damp. Cellar stock. They sell it by the measure in the river quarter, for rats.'], ['find', 'dried', 'dobrawa']]
  : [['dobrawa', SCENE.cycle('iDobrawa', [INV.has('wolfsHood') ? 'Whoever did it knew the dose. A measure kills rats. A pinch more kills a king.' : 'Blue lips and a stopped heart, they say in the kitchen. Ask whoever laid him out what his tongue looked like.', 'Bring me what’s left on that cup, if anything is. My nose is older than your priest’s.'])]]);
/* ---------------------------------------------------------------- the Woman's name: what the king has of it (the journal) */
AGENTS.lore = function () {
  const F = REALM.flags, out = [];
  if (F.hela === 1) out.push('Babka Hela delivered half of Lodmir. She says the old people had a name for the Woman, and that she has not forgotten it.');
  if (F.letter === 1) out.push('My father’s letter is in the desk. There is a name in it that I have not said aloud.');
  if (F.anzelm === 1 && REALM.done['lore:anzelm']) out.push('Brother Anzelm: a word was scraped out of the siege rolls on the nineteenth night. He can read it in a slanting light.');
  if (F.dobrawa === 1 && REALM.done['lore:dobrawa']) out.push('Dobrawa: a thing that is named has to bargain.');
  if (!out.length) return '';
  return `<h4>The Woman in the Wood</h4>${out.map((t) => `<p>${t}</p>`).join('')}${END.named() ? '<p><i>Who remembers it, where it is written, what it is for. I think I could say it, if I had to.</i></p>' : ''}`;
};
