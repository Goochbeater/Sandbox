/* The siege's daily court, and what came of it.
   Six more petitions across the twelve days (data only; the schema is REALM.PETS in g51), and REALM.ECHO: the table that makes
   earlier choices come back. Every flag a petition or a moment sets should be read somewhere: by an ending (g52), by a scene,
   or by a row here. A row is [flag, value, when, the steward's report, fx]; `when` is 'w3' (court week 3 or later) or 'c4'
   (crisis day 4 or later). Up to three are reported at the start of a court session, each once (REALM.done['echo:flag:value']). */
Object.assign(REALM.PETS, {
  sHoard: { who: 'tomasz', name: 'Tomasz Brzoza, salt merchant', stewardIn: 'Tomasz Brzoza, the salt merchant. He asked for the side door.',
    intro: ['Your Grace. Every barrel of salt in Lodmir is in my cellar, or in the cellars of four men who asked me not to name them.', 'A siege is a long winter with no market. We all know it. We are all buying.'],
    advice: [['steward', 'Salted, the town’s meat lasts a month past the last market, Your Grace. Unsalted, a week.']],
    options: [{ label: 'Requisition it. Every cellar, today, at last year’s price.', reply: ['At last year’s price. Then let the roll show that I came to you first.'], fx: { gold: -1, stores: 3, mood: -1, flag: { sHoard: 1 } } },
      { label: 'Sell as you like. A penny to the crown on every barrel.', reply: ['A penny. By Sunday a barrel will fetch three times today’s price, and you will have your share of that too.'], fx: { gold: 2, mood: -2, flag: { sHoard: 2 } } },
      { label: 'I’ll buy a third at today’s price. The rest goes to open market.', reply: ['A third, and fair. I will tell the others they were not fair enough.'], fx: { gold: -2, stores: 2, mood: 1, flag: { sHoard: 3 } } }] },
  sGate: { who: 'widow', name: 'Zuzanna, a farm wife from the Ostrów road', stewardIn: 'A woman from the Ostrów road, Your Grace. The gate sergeant sent her up rather than answer her.',
    intro: ['Three hundred of us are standing at the Ostrów gate, Your Grace, and the gate is shut. The sergeant says the order is yours.', 'Krasnian riders are in our barley. We left the harvest standing. We brought what would go on a handcart.'],
    advice: [['commander', 'Every mouth inside is bread gone. But there are men out there who can hold a pike.'], ['queen', 'They are yours whichever side of the wall they stand on.']],
    options: [{ label: 'Open the gate. All of them, and bread when they’re in.', reply: ['Then I’ll go down and tell them. They won’t believe me until it moves.'], fx: { stores: -2, mood: 2, flag: { sGate: 1 } } },
      { label: 'Women, children and the old come in. The men join the levy.', reply: ['The men will go. Give them a moment at the handcarts first.'], fx: { stores: -1, army: 1, mood: -1, flag: { sGate: 2 } } },
      { label: 'The gate stays shut. I can’t feed the town I have.', reply: ['No. I didn’t think the order was the sergeant’s.'], fx: { mood: -2, flag: { sGate: 3 } } }] },
  sDesert: { who: 'marshalPet', name: 'Ser Dobiesław, Marshal of the Lists', stewardIn: 'The Marshal of the Lists, Your Grace. He has the muster roll, and he has been at it with a pen.',
    intro: ['Thirty-one men went over the north wall last night, on ropes from the bakehouse. More will go tonight if I do nothing.', 'They’re levy, most of them. Fathers. Not one of them believes Krasna will storm a town over a dinner.'],
    advice: [['commander', 'Hang three and the rest stand. Hang none and the rest find the rope.']],
    options: [{ label: 'Hang three at the north wall, at dawn. The rest will watch.', reply: ['Three. I’ll choose them by lot. It’s the only fair thing left in it.'], fx: { army: 1, mood: -2, flag: { sDesert: 1 } } },
      { label: 'A pardon for any man back on the wall by dusk.', reply: ['Some will come back. The ones who do will know the way out.'], fx: { army: -1, mood: 1, flag: { sDesert: 2 } } },
      { label: 'Nobody hangs. Pay the levy a week ahead, out of my own chest.', reply: ['Paid men climb slower. It’s not nothing, Your Grace.'], fx: { gold: -2, flag: { sDesert: 3 } } }] },
  sWall: { who: 'ferryman', name: 'Staszek, a ferryman', ask: 'Get the quarry stone up to the north wall before it falls.', need: 4, cells: 8, fit: { commander: 2 }, effects: { 5: 'bonus', 7: 'wound' },
    pay: { stores: { cost: 1, pts: 1 }, gold: { cost: 1, pts: 1 } }, stewardIn: 'Staszek the ferryman. Wet again, Your Grace.',
    intro: ['The Kalina has undercut the north wall, Your Grace. There’s a hole under the footing you could drive a cart into.', 'The quarry barges are tied up at the weir, full. I need backs to unload them, and somebody to say I may.'],
    yes: ['Then the wall has its stone by morning. I’ll row the last barge myself.'], short: ['Half the stone. A dry wall and a prayer, then.'], no: ['Then pray it doesn’t rain, Your Grace. You’ve had luck with that so far.'],
    yesFx: { army: 1, flag: { sWall: 1 } }, noFx: { army: -1, mood: -1, flag: { sWall: 0 } } },
  sBells: { who: 'canon', name: 'Canon Leopold', stewardIn: 'Canon Leopold, Your Grace, with the chapter’s seal.',
    intro: ['The chapter has voted, Your Grace. The bells of St Anne’s may go to the League’s factor for the weight of their bronze, if the crown asks it.', 'It would pay the levy for a month. It would also be the first Sunday in two hundred years that Lodmir woke to nothing.'],
    advice: [['steward', 'The factor pays in silver, and he pays today. I have seen his scales.'], ['queen', 'Keep the great bell. A town without its bell has already been taken.']],
    options: [{ label: 'All three. Bronze can be cast again. Men can’t.', reply: ['Then the chapter will sing the hours instead. We are not good singers.'], fx: { gold: 3, mood: -2, flag: { sBells: 1 } } },
      { label: 'The two small bells. The great one stays in its tower.', reply: ['The great one stays. It was always the one they listened for.'], fx: { gold: 1, mood: -1, flag: { sBells: 2 } } },
      { label: 'The bells stay. Ring them every hour, so Krasna hears we’re awake.', reply: ['Every hour. The ringers will want paying, Your Grace. But yes.'], fx: { gold: -1, mood: 2, flag: { sBells: 3 } } }] },
  sQuarter: { who: 'kHerald', name: 'A herald of Krasna', stewardIn: 'The herald of Krasna, Your Grace. Under a white branch, this time.',
    intro: ['Mściwoj of Krasna asks safe passage for the sixty Krasnian households of your town, before the twelfth day.', 'He asks it as a courtesy between neighbours. He will remember how it was answered.'],
    advice: [['spymaster', 'Sixty households inside the walls are sixty reasons for him to be careful where he throws fire.'], ['queen', 'They have lived here forty years. Don’t make a wall of them.']],
    options: [{ label: 'They go freely, with everything they can carry.', reply: ['My lord will hear that Lodmir still keeps guest-right. It may be worth a day to you.'], fx: { gold: -2, days: 1, flag: { sQuarter: 1 } } },
      { label: 'They may go. What is in their cellars stays.', reply: ['He will hear that as well. Word for word.'], fx: { gold: 1, stores: 2, days: -1, flag: { sQuarter: 2 } } },
      { label: 'Nobody leaves. Krasna won’t burn a quarter full of its own.', reply: ['You name them hostages. I will carry it exactly as you said it.'], fx: { army: 1, mood: -1, fam: { halina: -1 }, flag: { sQuarter: 3 } } }] },
});
REALM.CRISIS.push(['sHoard', 3], ['sGate', 4], ['sDesert', 6], ['sWall', 7], ['sBells', 9], ['sQuarter', 10]);
REALM.CRISIS.sort((a, b) => a[1] - b[1]);

/* ---------------------------------------------------------------- what came of it */
REALM.ECHO = [
  ['marta', 1, 'w3', 'The old mill road is open, Your Grace. Marta’s sons sent the first flour up the hill this morning.', { stores: 1 }],
  ['marta', 0, 'w3', 'The old mill road is still shut. Bread is a penny dearer in the lower town.', { stores: -1 }],
  ['tolls', 1, 'w3', 'Tomasz’s receipts named the toll-skimmer, Your Grace: a League factor. He has repaid what he had not yet shipped.', { gold: 1 }],
  ['tolls', 0, 'w3', 'The river tolls came in short again. Somebody has grown used to it.', { gold: -1 }],
  ['pensions', 2, 'w3', 'The widows lit forty candles for your father on Sunday. And one for you, which is not usual for the living.', { mood: 1 }],
  ['zofiaShoots', 1, 'w4', 'The princess has put forty arrows in the butt this week, Your Grace. And one through my hat. The yard has started to bet on her.', { mood: 1 }],
  ['inquiry', 1, 'w4', 'The chapter has sent its finding on the Saintess to the bishop: nothing proven, nothing disproven. The pilgrims have doubled.', { gold: 1 }],
  ['inquiry', 0, 'w4', 'Canon Leopold preached on kings who keep their saints behind a curtain. The cathedral was full.', { mood: -1 }],
  ['host', 2, 'c2', 'Half of Krasna’s knights say they were never better fed than at your table. Some of them say it in Mściwoj’s tent.', { days: 1 }],
  ['host', 1, 'c2', 'Krasna’s knights remember thin wine, Your Grace. It is a small thing. They keep mentioning it.', { mood: -1 }],
  ['preach', 1, 'c2', 'Brother Remigiusz’s walkers carried sandbags to the wall after their prayers. Four hundred pairs of bare feet.', { army: 1 }],
  ['preach', 0, 'c2', 'Brother Remigiusz preaches in the fields now, where Ser Bogdan can’t see him home. More listen.', { mood: -1 }],
  ['pensions', 1, 'c3', 'Harvest or no harvest, the widows came for the other half. I paid it, Your Grace. It was your word.', { gold: -2 }],
  ['pensions', 0, 'c3', 'The Widows of the Siege will not carry stone to the wall. They say they have given that wall enough.', { army: -1 }],
  ['flood', 1, 'c4', 'The river wall held through the feast night, Your Grace. The tanners have sent hides for the garrison.', { stores: 1 }],
  ['flood', 0, 'c4', 'Tanners’ Row went under on the feast night. The hides are lost, and the row asks where the king was.', { gold: -1, mood: -1 }],
  ['foster', 1, 'c6', 'The Queen has had the prince’s chest packed for Velka since the feast, Your Grace. It stands by her door. He has seen it.', { fam: { kazik: -1 } }],
  ['foster', 0, 'c6', 'The physician you sent for has come up from the League’s barge. He charges like a siege. The prince slept through the night.', { gold: -1, fam: { kazik: 1 } }],
  ['sGate', 1, 'c7', 'The Ostrów people are sleeping in the cathedral nave. Their men have asked for pikes.', { army: 1 }],
  ['sGate', 3, 'c7', 'There is fever in the ditch below the Ostrów gate. The guards have stopped looking down.', { mood: -1 }],
  ['jacek', 1, 'c8', 'Jacek the cupbearer is carrying stone at the north wall. Nobody asked him to.', { army: 1 }],
  ['jacek', 0, 'c8', 'The cupbearer has taken a fever in his cell. His mother is at the gate again, Your Grace. She does not shout.', { mood: -1 }],
  ['sDesert', 1, 'c9', 'Nobody has gone over the north wall since the hangings. Nobody sings on it either.', null],
  ['warehouse', 1, 'c10', 'Master Hanusz’s letter reached Mściwoj. The answer was one word, Your Grace: “Noted.” From him that is warm.', { mood: 1 }],
  ['warehouse', 0, 'c10', 'The Krasnian warehouse burned on the eighth night. The League’s barge has slipped its moorings since.', { gold: -1 }],
];
REALM.echoDue = function () {
  const due = (at) => { const n = +at.slice(1); return at[0] === 'w' ? (CAL.phase === 'court' ? CAL.week >= n : CAL.phase === 'crisis') : CAL.phase === 'crisis' && CAL.crisis >= n; };
  return REALM.ECHO.filter(([f, v, at]) => REALM.flags[f] === v && !REALM.done['echo:' + f + ':' + v] && due(at)).slice(0, 3);
};
REALM.echo = async function () {   // the steward's report, before the first petitioner (COURT.run)
  const rows = REALM.echoDue(), S = CAST.A.steward; if (!rows.length) return 0;
  await SCENE.say(S, 'Before the hall fills, Your Grace: what came of it.', { wait: true });
  for (const [f, v, , line, fx] of rows) { REALM.done['echo:' + f + ':' + v] = 1; await SCENE.say(S, line, { wait: true }); REALM.fx(fx); }
  return rows.length;
};
