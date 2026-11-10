/* THE REALM — the kingdom loop (STORY.md §4, §5 chapters 1–2, §8; ENGINE.md §13r). Chapters one and two are four weeks.
   Each week: walk the castle (a family moment or two waits in a room: REALM.EVENTS), hold court (a queue of petitioners:
   REALM.WEEKS), settle the ledger (COURT.week), then the bed ends the week (CAL). What the king decides moves the realm's
   ledgers, shown in the bar at the top: Gold, Stores, Mood (COURT.stats) and Army; and the family's, never shown as numbers
   (REALM.fam: halina, zofia, kazik). Flags carry choices forward: into the festival (the fire licence, masked knights),
   the crisis (Krasna's patience) and the endings (g52).
   A petition is data. Two kinds:
     aid       the cell panel (COURT.panel): need / cells / fit / effects, pay: { gold: { cost, pts }, stores: {…} },
               yes / short / no lines, yesFx / noFx
     decision  options: [{ label (the king's words), reply: [petitioner's lines], fx }], advice: [[who, line]] before it
   fx = { gold, stores, mood, army, fam: { halina, zofia, kazik }, flag: { name: value }, rumour, cold, days } */
const REALM = { army: 5, fam: { halina: 5, zofia: 5, kazik: 5 }, flags: {}, done: {}, heardIds: {} };
REALM.init0 = JSON.stringify(REALM);
REALM.reset = function () { Object.assign(REALM, JSON.parse(REALM.init0)); };
REALM.state = function () { return { army: REALM.army, fam: REALM.fam, flags: REALM.flags, done: REALM.done, heardIds: REALM.heardIds }; };
REALM.load = function (s) { REALM.reset(); if (s) for (const k of ['army', 'fam', 'flags', 'done', 'heardIds']) if (k in s) REALM[k] = s[k]; };
REALM.kingdom = () => COURT.stats.gold + COURT.stats.stores + COURT.stats.mood + REALM.army;
REALM.family = () => REALM.fam.halina + REALM.fam.zofia + REALM.fam.kazik;
/* ---------------------------------------------------------------- the bar at the top */
REALM.NAMES = { gold: 'Gold', stores: 'Stores', mood: 'Mood', army: 'Army' };
REALM.val = (k) => (k === 'army' ? REALM.army : COURT.stats[k]);
REALM.hud = function () {
  const el = $('realm'); if (!el) return; document.body.classList.toggle('realm', !!SCENE.room && SCENE.room.id !== 'exterior' && SCENE.room.id !== 'battle');
  for (const k in REALM.NAMES) { const b = el.querySelector(`[data-k="${k}"] b`), v = REALM.val(k); if (b && b.textContent !== String(v)) { b.textContent = v; b.parentNode.classList.toggle('low', v <= 2); } }
};
/* apply what a decision costs and earns; says so in the toast, and pulses the numbers that moved */
REALM.fx = function (o) {
  if (!o) return; const said = [];
  for (const k of ['gold', 'stores', 'mood']) if (o[k]) { COURT.stats[k] = Math.max(0, COURT.stats[k] + o[k]); said.push(`${REALM.NAMES[k]} ${o[k] > 0 ? '+' : '−'}${Math.abs(o[k])}`); }
  if (o.army) { REALM.army = Math.max(0, REALM.army + o.army); said.push(`Army ${o.army > 0 ? '+' : '−'}${Math.abs(o.army)}`); }
  for (const k in o.fam || {}) REALM.fam[k] = clamp(REALM.fam[k] + o.fam[k], 0, 10);
  for (const k in o.flag || {}) REALM.flags[k] = o.flag[k];
  if (o.rumour) HOUSE.rumour += o.rumour; if (o.cold) CHAPEL.cold += o.cold;
  if (o.days && CAL.phase === 'crisis') { CAL.crisis = clamp(CAL.crisis - o.days, 1, 12); said.push(o.days > 0 ? `Krasna waits ${o.days} day${o.days > 1 ? 's' : ''} longer` : `A day lost`); }
  if (said.length) COURT.toast(said.join(' · '));
  const el = $('realm'); if (el) for (const k in REALM.NAMES) if (o[k]) { const s = el.querySelector(`[data-k="${k}"]`); s.classList.remove('up', 'down'); void s.offsetWidth; s.classList.add(o[k] > 0 ? 'up' : 'down'); }
  REALM.hud();
};
/* ---------------------------------------------------------------- the petitioners (lazy; they live in the throne room, offstage) */
{ const at = { home: 'throne', homes: null, x: 12.4, z: 3.0, face: -1, offstage: true, lazy: true }, S = CAST.specs;
  const man = (id, name, body, hair, beard, more) => Object.assign(townsman(id, body, hair, beard, null), at, { name }, more || {});
  const woman = (id, name, dress, hair, style, more) => Object.assign(townswoman(id, dress, hair, style, null), at, { name }, more || {});
  Object.assign(S, {
    widow: woman('widow', 'Jadwiga', 0x3e3e48, 0x8a8478, 'Hair_Buns'),
    kHerald: man('kHerald', 'the herald of Krasna', 0xa82a24, 0x3a2414, false, { s: 1.03 }),
    hela: woman('hela', 'Babka Hela', 0x5a4632, 0xc8c2b8, 'Hair_Buns', { s: 0.92 }),
    hanusz: man('hanusz', 'Master Hanusz', 0x6a1a2a, 0x2a1c12, true, { collar: { pal: [0x3a2a1a, 0x4a3624, 0x5a442e, 0x6a5238] } }),
    remigiusz: man('remigiusz', 'Brother Remigiusz', 0x5a4e40, 0x6a5a48, true, { s: 0.98 }),
    ferryman: man('ferryman', 'Staszek', 0x2e4a5a, 0x8a6a3a, false),
    bartoszPet: Object.assign({}, S.bartosz, at, { id: 'bartoszPet', name: 'Bartosz Kuglarz' }),
    marshalPet: Object.assign({}, S.marshal, at, { id: 'marshalPet', name: 'Ser Dobiesław' }),
    canon: Object.assign({}, S.priest, at, { id: 'canon', name: 'Canon Leopold', idle: 'Idle_FoldArms_Loop', hair: [['Hair_SimpleParted', 0x2e2a2a]], brows: 0x2a2424, prop: undefined,
      robe: Object.assign({}, S.priest.robe, { col: 0x5a1a2a, trim: 0xd8a43a }), tabard: Object.assign({}, S.priest.tabard, { col: 0x2a1a22 }) }),
  }); }
/* ---------------------------------------------------------------- four weeks of court */
REALM.TITLE = [null, ['Week One · The Rain Returns', 'Court is waiting'], ['Week Two · The Rain Returns', 'A herald from Krasna is at the gate'],
  ['Week Three · Grain and Debt', 'The festival is three weeks off'], ['Week Four · Grain and Debt', 'The last week before midsummer']];
REALM.PETS = {
  marta: Object.assign(COURT.PETS[0], { pay: { gold: { cost: 2, pts: 1 } }, yesFx: { army: 1, flag: { marta: 1 } }, noFx: { mood: -1, flag: { marta: 0 } } }),
  tomasz: Object.assign(COURT.PETS[1], { yesFx: { gold: 1, flag: { tolls: 1 } }, noFx: { flag: { tolls: 0 } } }),
  widows: { who: 'widow', name: 'Jadwiga, for the Widows of the Siege', stewardIn: 'The Widows of the Siege, Your Grace. Forty of them. One will speak.',
    intro: ['Your Grace. Our men held your father’s gate for nineteen days. He promised every widow a pension out of his own mouth.', 'Twelve years. Not one of us has seen a coin of it.'],
    advice: [['steward', 'The promise is in the rolls, Your Grace. So is the reason it was never paid: there was no money then either.']],
    options: [{ label: 'Every pension my father promised. With the twelve years.', reply: ['Then he was a king, and so are you. I’ll tell them.'], fx: { gold: -4, mood: 2, flag: { pensions: 2 } } },
      { label: 'Half now. The rest at harvest, on my word.', reply: ['A king’s word. We have one of those already. Half, then.'], fx: { gold: -2, mood: 1, flag: { pensions: 1 } } },
      { label: 'The treasury can’t bear it. Not this year.', reply: ['No. It never can.'], fx: { mood: -2, flag: { pensions: 0 } } }] },
  herald: { who: 'kHerald', name: 'A herald of Krasna', stewardIn: 'A herald, Your Grace. In King Gniewomir’s colours.',
    intro: ['Gniewomir, King of Krasna, greets Bolesław’s son. He will come to your Swan Festival at midsummer, with his queen, his heir and three hundred knights.', 'He comes to renew the friendship of your fathers. He asks only that the wine be better than last time.'],
    advice: [['spymaster', 'Three hundred knights is not a visit, Your Grace. It’s a reminder.'], ['queen', 'It is also three hundred purses. Host him well.']],
    options: [{ label: 'Lodmir will host him as my father would have.', reply: ['My king will be glad of it. He speaks of your father often. And of the wine.'], fx: { gold: -3, mood: 2, flag: { host: 2, krasna: 1 } } },
      { label: 'He is welcome. The treasury will do what it can.', reply: ['I will tell him… that he is welcome.'], fx: { gold: -1, mood: 1, flag: { host: 1 } } }] },
  hela: { who: 'hela', name: 'Babka Hela, a midwife', stewardIn: 'Hela, the midwife of the lower town. She would not say why.',
    intro: ['A child was born in Tanners’ Row on the first night of the rain, Your Grace. A boy. He has a mark on his shoulder like a crow’s foot.', 'The row wants him put out on the hill. The mother wants me to ask the king.'],
    advice: [['queen', 'Kazik was born in the rain. Remember what they said about him.']],
    options: [{ label: 'The child is under the crown’s protection. Say so in the row.', reply: ['Then I’ll say it loudly. I delivered you too, you know. You were a quiet one.'], fx: { mood: -1, fam: { kazik: 1, halina: 1 }, flag: { hela: 1 } } },
      { label: 'Take him to the sisters at the chapel. Quietly.', reply: ['Quietly. Yes. That’s how it’s usually done.'], fx: { stores: -1, flag: { hela: 0 } } },
      { label: 'I won’t stand between the town and its fears.', reply: ['No. Your father didn’t either, at the end.'], fx: { mood: 1, fam: { halina: -1 }, flag: { hela: -1 } } }] },
  hanusz: { who: 'hanusz', name: 'Master Hanusz, factor of Krasna', stewardIn: 'Master Hanusz, who keeps the Krasnian warehouse.',
    intro: ['Your Grace. Krasnian salt pays four pence the barrel at your gate. Lodmiri salt pays nothing.', 'With my king coming to your festival, a gesture would be remembered.'],
    advice: [['steward', 'Four pence the barrel is a third of the gate’s takings, Your Grace.']],
    options: [{ label: 'Half customs on Krasnian salt until the year’s end.', reply: ['Remembered, Your Grace. In Krasna we keep long ledgers.'], fx: { gold: -2, flag: { krasna: 2 } } },
      { label: 'The customs stand. Krasna can afford four pence.', reply: ['As you say. We keep long ledgers for that, too.'], fx: { gold: 2, flag: { krasna: -1 } } }] },
  bartosz: { who: 'bartoszPet', name: 'Bartosz Kuglarz, master of players', stewardIn: 'Bartosz Kuglarz, with a bear’s worth of bowing.',
    intro: ['Your Grace! The Salamanders spit fire, my bear dances, my puppets insult everyone equally. All I lack is a licence.', 'For the fire, in particular. It has been a dry week, and your aldermen are nervous men.'],
    advice: [['commander', 'Fire in a wooden town at midsummer. I’d want water at every corner.']],
    options: [{ label: 'Licensed. With water barrels by the stage, at your cost.', reply: ['At my cost! You wound me. Done, Your Grace.'], fx: { mood: 1, flag: { fire: 1 } } },
      { label: 'Players, puppets and the bear. No fire in my town.', reply: ['No fire. The Salamanders will sulk. It’s worse than the fire.'], fx: { mood: -1, flag: { fire: 0 } } }] },
  marshal: { who: 'marshalPet', name: 'Ser Dobiesław, Marshal of the Lists', stewardIn: 'The Marshal of the Lists, with the tourney roll.',
    intro: ['The roll, Your Grace. Two questions. A knight has entered under a black shield and no name: do masked men ride in Lodmir?', 'And the princess has put her own name down for the junior butts. In ink.'],
    advice: [['queen', 'She practised her letters for a week to write that.']],
    options: [{ label: 'Masked knights may ride. And my daughter shoots.', reply: ['Then it will be a tourney to remember. I’ll find her a bow that isn’t a toy.'], fx: { fam: { zofia: 2 }, flag: { masked: 1, zofiaShoots: 1 } } },
      { label: 'Masked knights may ride. The princess watches.', reply: ['I’ll tell her myself. From a distance.'], fx: { fam: { zofia: -1 }, flag: { masked: 1 } } },
      { label: 'Open faces only. And no children at the butts.', reply: ['Open faces. The black shield will be struck from the roll.'], fx: { fam: { zofia: -1 }, flag: { masked: 0 } } }] },
  canon: { who: 'canon', name: 'Canon Leopold', stewardIn: 'Canon Leopold, from the cathedral chapter.',
    intro: ['Your Grace. The lower town calls your chapel’s Saintess a worker of miracles. The chapter has not examined a single one.', 'I ask leave to hold an inquiry. A formality. Miracles survive formalities, if they are miracles.'],
    advice: [['queen', 'Let him. I would like to hear her answers myself.']],
    options: [{ label: 'Hold your inquiry, Canon.', reply: ['The chapter thanks you. I will begin with her confessional.'], fx: { mood: 1, cold: 1, flag: { inquiry: 1 } } },
      { label: 'The Saintess is not yours to question.', reply: ['Not mine. I see. Then I shall simply watch, Your Grace. I am a patient watcher.'], fx: { rumour: 1, flag: { inquiry: 0 } } }] },
  preacher: { who: 'remigiusz', name: 'Brother Remigiusz, a preacher', stewardIn: 'One Brother Remigiusz. Barefoot. He walked in on his own.',
    intro: ['Forty days it rained when your father died, king! Forty! And now it comes again, and you hold a fair!', 'Let the people walk barefoot round the walls and beg the sky’s pardon. Or answer to it.'],
    advice: [['spymaster', 'He has four hundred followers and no plan. Let him walk; a tired mob is a quiet mob.']],
    options: [{ label: 'Let them walk. I’ll send bread for the walkers.', reply: ['Bread. The sky will see it. So will they.'], fx: { stores: -1, mood: 1, flag: { preach: 1 } } },
      { label: 'No processions. Ser Bogdan will see them home, gently.', reply: ['Gently! The rain won’t be gentle with you, king!'], fx: { mood: -1, flag: { preach: 0 } } }] },
  flood: { who: 'ferryman', name: 'Staszek, a ferryman', ask: 'Shore up the river wall before the lower town floods.', need: 5, cells: 9, fit: { commander: 1, spymaster: 1 }, effects: { 4: 'bonus', 8: 'wound' },
    pay: { stores: { cost: 1, pts: 1 }, gold: { cost: 2, pts: 1 } }, stewardIn: 'A ferryman, Your Grace. Wet to the knees.',
    intro: ['The Kalina’s over the first step of the quay, Your Grace. Another hand’s breadth and Tanners’ Row is a pond.', 'We’ve sandbags for half the wall, and backs for a quarter of it.'],
    yes: ['Then the row will keep its feet dry. I’ll row you across free, the rest of my life.'], short: ['Half a wall holds half a river. We’ll take it.'], no: ['Then we’ll move the old ones upstairs, and wait.'],
    yesFx: { mood: 1, flag: { flood: 1 } }, noFx: { mood: -2, flag: { flood: 0 } } },
  /* the crisis: three more, one every third day */
  flour: { who: 'marta', name: "Marta, a miller's widow", stewardIn: 'Marta of the lower mill. She says it can’t wait.',
    intro: ['Krasnian quartermasters, Your Grace. Buying flour by the wagon. Every mill on the river.', 'Nobody buys that much bread for a funeral.'],
    advice: [['commander', 'Twenty thousand men eat forty wagons a week. She’s right.']],
    options: [{ label: 'Sell them nothing. Every sack comes up the hill.', reply: ['Then my sons will bring it tonight. They’ve wanted to do something.'], fx: { stores: 3, days: -1 } },
      { label: 'Sell, and count every wagon for me.', reply: ['Count them. Yes. I can count.'], fx: { gold: 3, army: 1 } }] },
  mother: { who: 'widow', name: 'Agnieszka, mother of the cupbearer', stewardIn: 'The cupbearer’s mother, Your Grace. She has been at the gate since the feast.',
    intro: ['He is twenty-three, Your Grace. He has carried cups since he was nine and never dropped one.', 'Somebody put that ring on my boy. Let him come home.'],
    advice: [['spymaster', 'Krasna wants someone in a cell. If not him, they’ll ask who.']],
    options: [{ label: 'Jacek goes home tonight. I’ll answer for him.', reply: ['God keep you. God keep you, Your Grace.'], fx: { mood: 1, days: -1, flag: { jacek: 1 } } },
      { label: 'He stays where he is safe, until I have a name.', reply: ['Safe. In a cell. Yes, Your Grace.'], fx: { mood: -1, flag: { jacek: 0 } } }] },
  warehouse: { who: 'hanusz', name: 'Master Hanusz, factor of Krasna', ask: 'Guard the Krasnian warehouse from the mob.', need: 4, cells: 8, fit: { commander: 2, spymaster: 1 }, effects: { 6: 'wound' },
    pay: { gold: { cost: 2, pts: 1 } }, stewardIn: 'Master Hanusz. He came by the back stair.',
    intro: ['They’ve chalked a cup on my door, Your Grace. Tonight they’ll bring torches.', 'Forty years I’ve bought your salt. My king would count it a courtesy, if I had a door tomorrow.'],
    yes: ['I’ll write to Mściwoj tonight. He listens to ledgers.'], short: ['Half a guard. I’ll move what I can.'], no: ['Then I’ll watch it burn from the barge.'],
    yesFx: { days: 2, flag: { warehouse: 1 } }, noFx: { days: -1, flag: { warehouse: 0 } } },
};
REALM.WEEKS = [null, ['marta', 'tomasz', 'widows'], ['herald', 'hela', 'hanusz'], ['bartosz', 'marshal', 'canon'], ['preacher', 'flood']];
REALM.CRISIS = [['flour', 2], ['mother', 5], ['warehouse', 8]];   // [petition, the crisis day it comes on]
REALM.queue = function () {
  const ids = CAL.phase === 'court' ? REALM.WEEKS[CAL.week] || [] : CAL.phase === 'crisis' ? REALM.CRISIS.filter(([id, d]) => CAL.crisis >= d && !REALM.heardIds[id]).map(([id]) => id) : [];
  return ids.filter((id) => !REALM.heardIds[id] && CAST.A[REALM.PETS[id].who]).map((id) => Object.assign(REALM.PETS[id], { id }));
};
REALM.heard = (p) => { REALM.heardIds[p.id] = 1; };
REALM.waiting = () => REALM.queue().length > 0;
/* a decision: advice from the hall, the king's words (the player's), the reply, the cost */
REALM.choose = async function (p, pet) {
  const A = CAST.A, K = SCENE.player;
  for (const [who, line] of p.advice || []) if (A[who] && A[who].visible) await SCENE.say(A[who], line, { wait: true });
  const i = await NIGHT.ask(p.options.map((o) => o.label)), o = p.options[i];
  await SCENE.say(K, o.label, { wait: true });
  await SCENE.talk(o.reply.map((t) => [pet, t]));
  REALM.fx(o.fx);
};
/* the week's keep, after the ledger: the castle eats, and an empty treasury or larder is felt in the town */
REALM.upkeep = function () {
  if (CAL.phase !== 'court') return; const o = { stores: -1 };
  if (COURT.stats.gold <= 0 || COURT.stats.stores <= 1) o.mood = -1;
  REALM.fx(o);
};
/* a new week (CAL.next): court sits again, the agents are rested (COURT.week did that) */
REALM.newWeek = function () { COURT.done = false; COURT.greeted = false; COURT.prosperity = 0; COURT.ledger = []; INV.badge(true); };   // the journal's dot: a new week's page
/* ---------------------------------------------------------------- moments: something waiting in a room, once, in its week */
REALM.EVENTS = [
  { id: 'zofiaSword', week: 1, room: 'garden', who: 'zofia', note: 'Zofia is in the garden with a wooden sword',
    talk: [['zofia', 'Father! Ser Bogdan says I hold it like a spoon. I don’t. Watch.'], ['zofia', '(She cuts the head off a rose. She looks at it. She looks at you.)']],
    options: [{ label: 'Then hold it like a sword. Bogdan trains you properly, from tomorrow.', reply: [['zofia', 'Properly! With the real pells? I’ll be up before him.']], fx: { fam: { zofia: 2 } } },
      { label: 'I’ll show you myself. Dawn, in the yard. Don’t tell your mother.', reply: [['zofia', 'I won’t tell. I won’t sleep either.']], fx: { fam: { zofia: 3, halina: -1 } } },
      { label: 'A princess has no business with swords, Zofia.', reply: [['zofia', 'Grandfather’s gate was held by people who had no business with swords.']], fx: { fam: { zofia: -2 } } }] },
  { id: 'letter', week: 1, room: 'study', who: null, note: 'Something is behind the old king’s portrait in the study',
    talk: [['king', 'The portrait hangs crooked. There’s a letter behind it, in my father’s hand.'], ['king', '“If the rain comes back, do not go to her again.” And a second sheet: “Wanda keeps my other key.”']],
    options: [{ label: 'Burn it.', reply: [['king', 'It burns like any other paper. I thought it wouldn’t.']], fx: { flag: { letter: 0 } } },
      { label: 'Keep it. In the desk, under the seal.', reply: [['king', 'Locked away. Halina has never once opened this desk.']], fx: { flag: { letter: 1 } } }] },
  { id: 'crow', week: 2, room: 'garden', who: 'kazik', note: 'Kazik is talking to the crows at the fountain',
    talk: [['kazik', 'Father, the big crow says she’s coming when it rains.'], ['kazik', 'It says your name, too. It says it wrong.']],
    options: [{ label: 'Who is coming, Kazik? Tell me what it says.', reply: [['kazik', 'The lady from the wood. It says you know her. Do you?']], fx: { fam: { kazik: 2 } } },
      { label: 'Crows don’t talk. Come inside, you’re wet through.', reply: [['kazik', 'This one does. But all right.']], fx: { fam: { kazik: -1 } } }] },
  { id: 'truth', week: 3, room: 'garden', who: 'queen', note: 'Halina wants a word in the garden',
    talk: [['queen', 'You flinched again last night. At rain. A man who held a gate at nineteen.'], ['queen', 'Thirteen years, Radomir. Tell me what happened on the twentieth night.']],
    options: [{ label: 'I rode out to ask for help. I got it. That’s all I can say.', reply: [['queen', 'That’s more than you’ve ever said. I’ll take it. For now.']], fx: { fam: { halina: 2 }, flag: { told: 1 } } },
      { label: 'Nothing happened. The Margrave lost his nerve.', reply: [['queen', 'You’re a poor liar. It’s one of the things I married.']], fx: { fam: { halina: -1 }, flag: { told: 0 } } },
      { label: '(Say nothing.)', reply: [['queen', 'No. Of course not.']], fx: { flag: { told: 0 } } }] },
  { id: 'foster', week: 4, room: 'garden', who: 'queen', note: 'Halina has a letter from her brother about Kazik',
    talk: [['queen', 'Jarek offers to foster Kazik in Velka. Sea air, the League’s physicians. He coughs every night now.'], ['queen', 'I want him well more than I want him here. Say something.']],
    options: [{ label: 'He stays. This is his home, and I am his father.', reply: [['queen', 'Then find him a physician who is better than sea air.']], fx: { fam: { kazik: 2, halina: -1 }, flag: { foster: 0 } } },
      { label: 'After the festival. Let him see the bear first.', reply: [['queen', 'After the festival. Thank you.']], fx: { fam: { halina: 2, kazik: -1 }, flag: { foster: 1 } } }] },
  { id: 'bargain', week: 4, room: 'hut', who: 'hutWitch', note: 'The festival needs sun. The Woman in the Wood sells weather',
    talk: [['hutWitch', 'You want sun for your fair. Seven dry days, in a year like this one.'], ['hutWitch', 'I’ll sell them. For a king’s breath. No more than that.'], ['king', 'Whose?'], ['hutWitch', 'A king’s. You of all men know I’m exact.']],
    options: [{ label: 'Seven days of sun. Done.', reply: [['hutWitch', 'Done. Enjoy your joust.']], fx: { mood: 2, flag: { bargain2: 1 } } },
      { label: 'No. Not again. The fair can be wet.', reply: [['hutWitch', 'Then it will be. You’ve grown careful. It doesn’t suit you.']], fx: { mood: -2, flag: { bargain2: 0 } } }] },
];
REALM.todo = function () {   // what the journal lists in a court week
  if (CAL.phase !== 'court') return []; const out = [COURT.done ? 'Court has sat. The bed ends the week.' : `Hold court in the throne room (${(REALM.WEEKS[CAL.week] || []).length} petitioners)`];
  for (const e of REALM.EVENTS) if (e.week === CAL.week && !REALM.done[e.id]) out.push(e.note);
  return out;
};
REALM.who = (k) => (k === 'king' ? SCENE.player : CAST.A[k] || SCENE.player);
REALM.enter = function (room) {
  REALM.hud(); if (CAL.phase !== 'court' || CUT.playing) return;
  const e = REALM.EVENTS.find((q) => q.week === CAL.week && q.room === room.id && !REALM.done[q.id]); if (!e) return;
  const t0 = performance.now(), poll = () => { if (SCENE.room !== room || REALM.done[e.id]) return;
    if (SCENE.lock || SCENE.modal || CUT.playing || NIGHT.on || SCENE.bubble || performance.now() - t0 < 1800) { setTimeout(poll, 250); return; } REALM.moment(e).catch(fail); };
  setTimeout(poll, 250);
};
REALM.moment = async function (e) {
  const K = SCENE.player, a = e.who ? CAST.A[e.who] : null; if (e.who && (!a || !a.visible)) return;
  REALM.done[e.id] = 1; SCENE.lock++;
  try { if (a) { K.faceTo(a.x); if (!a.sitting) { a.faceTo(K.x); a.lookYaw = Math.sign(K.x - a.x) * 0.8; } }
    await SCENE.talk(e.talk.map(([k, t]) => [REALM.who(k), t]));
    const i = await NIGHT.ask(e.options.map((o) => o.label)), o = e.options[i];
    if (!/^\(/.test(o.label)) await SCENE.say(K, o.label, { wait: true });
    await SCENE.talk(o.reply.map(([k, t]) => [REALM.who(k), t])); REALM.fx(o.fx); GAME.save(); }
  finally { SCENE.lock--; if (a && !a.sitting) a.lookYaw = null; }
};
