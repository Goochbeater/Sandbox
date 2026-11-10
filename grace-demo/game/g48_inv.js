/* THE INVESTIGATION — chapter four, the twelve days after the feast (STORY.md §5 chapter 4, §7). Eight clues in their
   places, the red herrings' own guilty secrets as notes, a journal to keep them (the book in the top bar, or J), and the
   accusation before Mściwoj in the throne room. Everything here only happens in the crisis (CAL.phase 'crisis'): the rooms
   built their props hidden, and INV.stage shows them; the people's ordinary talk hands over to INV.talk.
   The clues, where they are, and what each needs first (§7.2):
     lip       the Swan Cup, on the throne room's council table    the right lip only: the poisoner knew the custom
     signet    Ser Bogdan, in the throne room                      a Hal signet in the cupbearer's sleeve
     oldSeal   Hanna, at the House of the Lantern (after signet)   the old Margrave's design, kept twelve years
     wolfsHood Father Ambroży at the bier, in the chapel           the poison
     dried     the Woman, in her hut (after wolfsHood)             dried in a cellar: the river quarter sells it
     ledger    Wanda, at the House (after dried)                   "I., one measure of wolf's hood, for rats"
     grey      whoever saw the distraction: Mira of the Salamanders if they played the hall, Konrad if he unmasked, the
               House's lute player if it was only a song             a lady in grey at the cupbearer's sideboard
     report    Ilka's report, on the study desk (after lip)        she knew which lip before anyone told her
   Naming Ilka holds only with lip, oldSeal and ledger or report (§7.4). Every outcome is saved; chapter five begins. */
const INV = { found: {}, notes: {}, outcome: null, said: {} };
INV.init0 = JSON.stringify(INV);
INV.reset = function () { Object.assign(INV, JSON.parse(INV.init0)); INV.accusing = false; };
INV.state = function () { return { found: INV.found, notes: INV.notes, outcome: INV.outcome, said: INV.said }; };
INV.load = function (s) { INV.reset(); if (s) for (const k of ['found', 'notes', 'outcome', 'said']) if (k in s) INV[k] = s[k]; };
INV.on = () => CAL.phase === 'crisis';
INV.has = (...ids) => ids.every((id) => INV.found[id]);
INV.CLUES = {
  lip: ['The right lip of the Swan Cup', 'A dark crust on the right lip only: the guest’s. The left, where I drank, is clean. Whoever poisoned it knew the custom, host left and guest right. Every Lodmiri knows it. No Krasnian does.', 'the Swan Cup, in the throne room'],
  signet: ['A Hal signet in the cupbearer’s sleeve', 'Bogdan’s men found it on Jacek: a boar, and HAL round it. Jacek swears he never saw it. It points at Konrad. It points very neatly.', 'Ser Bogdan'],
  oldSeal: ['The old Margrave’s seal', 'Hanna knows the design: the old Margrave’s, Dietrich’s father’s. Her husband stripped rings like it off Hal’s dead after the siege. Whoever owned this one has kept it twelve years.', 'Hanna, at the House of the Lantern'],
  wolfsHood: ['Wolf’s hood', 'Father Ambroży laid him out: blue lips, a numb tongue, the heart stopped like a slammed door. Aconite. Wolf’s hood. It grows in the Wood.', 'Father Ambroży, at the bier'],
  dried: ['Dried in a cellar', 'The Woman: “Mine grows. Yours was dried in a cellar. Smell it.” Dried wolf’s hood is sold in the river quarter, by the measure, for rats.', 'the Woman, in the Wood'],
  ledger: ['Wanda’s ledger', '“I., one measure of wolf’s hood, for rats.” A week before the festival. A grey cloak, good wool. Wanda remembers the wool.', 'Wanda, at the House of the Lantern'],
  grey: ['The lady in grey', 'While every eye was elsewhere, a lady in grey was at the cupbearer’s sideboard, by the cup.', ''],
  report: ['Ilka’s report', 'Her report on the night says the poison was “on the guest’s lip”. Nobody told her which lip. Bogdan didn’t. I didn’t.', 'the study'],
};
INV.ORDER = ['lip', 'signet', 'oldSeal', 'wolfsHood', 'dried', 'ledger', 'grey', 'report'];
INV.NOTES = {
  ilka: 'Ilka: “The signet says Hal. Hal says Konrad. Sometimes the obvious is just the truth.”',
  dorota: 'Dorota blessed the cup that morning, in front of the town. “If you think a blessing poisons, you’ve been going to the wrong church.”',
  wieslawa: 'Wiesława says she never left the hall all night.',
  ottokar: 'Ser Ottokar says he watched the fire with everyone else.',
  affair: 'Lena: Queen Wiesława and Ser Ottokar spent the fire in her room, and paid in gold. They’ll lie about it to the grave.',
  agata: 'Agata says the saint is capable of anything. Agata left the saint’s convent, and hates her.',
  jarek: 'Jarek skims the Kalina tolls (everyone knows it, nobody can prove it). “A man who steals by the barrel doesn’t poison by the cup.”',
  konrad: 'Konrad came to ask where his father’s army went. He hated Gniewomir, who turned him away in the spring. He says he never went near the high table.',
  woman: 'The Woman: “I didn’t need to. Kings are always being killed by someone. I only knew which week.”',
};
INV.find = function (id) {
  if (INV.found[id]) return false; INV.found[id] = CAL.crisis || 1;
  COURT.toast('A clue: ' + INV.CLUES[id][0]); AUDIO.sfx('page', { gain: 0.8 }); AUDIO.sfx('chime', { gain: 0.25, delay: 0.2 }); INV.badge(true); GAME.save(); return true;
};
INV.note = function (id) { if (INV.notes[id]) return; INV.notes[id] = CAL.crisis || 1; INV.badge(true); GAME.save(); };
INV.witness = () => (CAL.fire ? 'salA' : CAL.konrad ? 'konrad' : 'lute');   // who saw the lady in grey depends on how the feast went
/* ---------------------------------------------------------------- the rooms in chapter four */
CAST.specs.konrad.homes.camp = { x: 13.7, z: 2.2, face: -1 };   // at the black tent, in chapter four
CAST.specs.salA.homes.camp = { x: -9.2, z: 2.3, face: 1 };   // the Salamanders' wagon at the camp's edge, in chapter four
CAST.specs.msciwoj.homes.throne = { x: 9.8, z: 2.5, face: -1 };   // only for the accusation
INV.stage = function (room) {
  const A = CAST.A, on = INV.on(), id = room.id, show = (a, v) => { if (a) { a.offstage = !v; a.setVisible(v); } };
  if (CAL.feastDone && A.gniewomir && A.gniewomir.visible) show(A.gniewomir, false);   // dead since the feast, wherever his homes are
  room.inter = room.inter.filter((i) => !(CAST.A[i.id] && CAST.A[i.id].spec.gone && CAST.A[i.id].spec.gone()));   // no marker over the dead (only them: petitioners are hidden at entry and walk in later)
  document.body.classList.toggle('inv', true);   // the book is always there: the week before the crisis, the clues in it
  if (id === 'chapel') { for (const m of room.bier || []) m.visible = on; if (room.bierLight) room.bierLight.intensity = on ? 3.2 : 0;
    const it = room.inter.find((i) => i.id === 'bier'); if (it) it.hidden = !on;
    const P = A.priest; if (P && on) { P.x = -1.9; P.z = 2.25; P.face = 1; } }
  if (id === 'throne') { if (room.crisisCup) room.crisisCup.visible = on || CAL.phase === 'ch5';
    for (const k of ['swanCup', 'accuse']) { const it = room.inter.find((i) => i.id === k); if (it) it.hidden = !on || (k === 'accuse' && !!INV.outcome); }
    const ac = room.inter.find((i) => i.id === 'accuse'); if (ac) ac.label = 'Summon Mściwoj and name the hand';
    if (!INV.accusing) show(A.msciwoj, false); }
  if (id === 'study') { const it = room.inter.find((i) => i.id === 'report'); if (it) { it.hidden = !on; it.label = 'Read Ilka’s report on the feast'; } }
  if (id === 'camp') { show(A.konrad, on); show(A.salA, on && INV.witness() === 'salA');
    if (on) FEST.talkers(room, [['konrad', 'Talk to Konrad of Hal'], ['salA', 'Talk to Mira of the Salamanders']]); else room.inter = room.inter.filter((i) => i.id !== 'konrad' && i.id !== 'salA'); }
  SCENE.buildMarks();
};
/* ---------------------------------------------------------------- what people say in the crisis */
INV.TALK = {
  commander: () => INV.has('signet') ? [['commander', 'Krasnian knights at every gate, mine at every door. We are all being very polite.']]
    : [['commander', 'We searched every servant last night, Your Grace. The cupbearer had this up his sleeve.'], ['commander', '(A heavy gold signet: a boar, and HAL around it.)'],
      ['king', 'Jacek?'], ['commander', 'Swears on his mother he never saw it. He’s in the cells, crying. Either he’s the best liar in Lodmir, or somebody put it there.'], ['find', 'signet']],
  spymaster: () => [['spymaster', SCENE.cycle('iIlka', ['The signet says Hal, Your Grace. Hal says Konrad. Sometimes the obvious is just the truth.', 'My people are in the Krasnian camp. They’ll hear everything worth hearing.'])], ['note', 'ilka']],
  queen: () => [['queen', SCENE.cycle('iQueen', ['Jarek didn’t do this. Whatever else my brother is, he isn’t this. Tell me you know that.', 'Wiesława hasn’t stopped crying. Or she hasn’t stopped pretending to. I can’t tell any more.'])]],
  steward: () => [['steward', `Day ${CAL.crisis} of twelve, Your Grace. The Krasnians are counting louder than I am.`]],
  dorota: () => [['dorota', 'I blessed that cup in front of the whole town. If you think a blessing poisons, you’ve been going to the wrong church.'], ['note', 'dorota']],
  msciwoj: () => [['msciwoj', SCENE.cycle('iMs', [`Day ${CAL.crisis}, Radomir. I am counting. So is my mother.`, 'My father goes home in the rain. Bring me a name before he gets there.'])]],
  wieslawa: () => [['wieslawa', 'I never left the hall. I was at my husband’s side the whole night. Why would you ask me that?'], ['note', 'wieslawa']],
  ottokar: () => [['ottokar', 'I was in the hall, Your Grace. Watching the fire, like everyone.'], ['note', 'ottokar']],
  jarek: () => [['jarek', 'Do I skim the Kalina tolls? Everyone says so. Nobody can prove it. A man who steals by the barrel doesn’t poison by the cup, Radomir.'], ['note', 'jarek']],
  konrad: () => (INV.witness() === 'konrad' && !INV.has('grey')
    ? [['konrad', 'I was on your floor with every eye on me. Not every eye. A lady in grey went behind your high table while I was talking.'], ['konrad', 'I took her for a servant. Your servants don’t dress like that.'], ['find', 'grey'], ['note', 'konrad']]
    : [['konrad', 'I came to ask where my father’s army went. I hated Gniewomir: he turned me away in the spring. I never went near your table.'], ['note', 'konrad']]),
  salA: () => (INV.has('grey') ? [['salA', 'We’re packing. Nobody wants fire in a town that’s burying a king.']]
    : [['salA', 'While we blew, a lady in grey was at the cupbearer’s sideboard. Grey like a dove that’s been up the chimney.'], ['salA', 'Everyone else was watching us. Everyone always watches us.'], ['find', 'grey']]),
  lute: () => (INV.witness() === 'lute' && !INV.has('grey')
    ? [['lute', 'I played the feast, sir. While the hall sang the swan ballad, a lady in grey went behind the high table. I sang louder. It’s what you do.'], ['find', 'grey']]
    : [['king', 'He plays the swan ballad, slowly, like a dirge. Nobody asks him to stop.']]),
  hanna: () => (INV.has('signet') && !INV.has('oldSeal')
    ? [['king', '(He shows her the signet.)'], ['hanna', 'That’s the old Margrave’s seal. Not Dietrich’s: his father’s. My husband stripped rings like that off Hal’s dead after the siege, and sold them to anyone.'],
      ['hanna', 'Whoever had that one has kept it twelve years.'], ['find', 'oldSeal']]
    : [['hanna', 'A king died of your wine, they say. I’m sorry for whoever has to carry him home.']]),
  lena: () => [['lena', 'The Krasnian queen and her knight had my room the night of the feast, while the fire was on. Paid in gold. They’ll lie about it until they’re dead.'], ['note', 'affair']],
  agata: () => [['agata', 'The saint blessed the cup? Then she could have done anything to it. I lived in her convent. She’s capable of anything.'], ['note', 'agata']],
  roza: () => [['roza', 'The Krasnian squires drink here and cry. One of them told me the prince cries too. Don’t tell the prince.']],
  nadia: () => [['nadia', 'The Krasnians say Mściwoj will burn Lodmir to the river. They say it in five languages. I understand all five.']],
  wanda: () => (INV.has('dried') && !INV.has('ledger')
    ? [['wanda', 'Dried wolf’s hood? For rats, sir. Every house on the river has rats.'], ['wanda', '(She turns the ledger round and puts her finger on a line.) A week before the festival. “I., one measure of wolf’s hood, for rats.”'],
      ['wanda', 'A grey cloak. Good wool. I remember the wool: you don’t see wool like that down here.'], ['find', 'ledger']]
    : [['wanda', SCENE.cycle('iWanda', ['The whole river is talking about the cup. Nobody is saying anything worth a penny.', 'You look like a man who hasn’t slept, Falconer. Sit. Drink. Then go and find out who did it.'])]]),
};
INV.who = (k) => { const A = CAST.A; if (k === 'king') return SCENE.player; if (k === 'lute') return { x: 5.9, y: 0, z: 0.7, v: 0, visible: true, talking: false, speakAt: (o) => o.set(5.9, 1.9, 0.7) }; return A[k] || SCENE.player; };
INV.talk = async function (id) {
  const f = INV.TALK[id]; if (!f || SCENE.lock) return; const K = SCENE.player, a = CAST.A[id];
  if (a && a.visible) { K.faceTo(a.x); if (!a.sitting) { a.faceTo(K.x); a.lookYaw = Math.sign(K.x - a.x) * 0.8; } }
  SCENE.lock++;
  try { for (const [k, t] of f()) { if (k === 'find') INV.find(t); else if (k === 'note') INV.note(t); else await SCENE.say(INV.who(k), t, { wait: true }); } }
  finally { SCENE.lock--; if (a && !a.sitting) a.lookYaw = null; }
};
/* the cup, the bier, the Woman, the report */
INV.cup = async function () {
  const K = SCENE.player; if (SCENE.lock) return; SCENE.lock++;
  try { K.act('Interact', 0.6); await SCENE.wait(700);
    if (!INV.has('lip')) { await SCENE.talk([[K, 'The Swan Cup, under Bogdan’s guard. A dark crust on the right lip. Only the right.'], [K, 'The left is clean. I drank from the left. The guest drinks from the right: every Lodmiri knows it. No Krasnian does.']]); INV.find('lip'); }
    else await SCENE.say(K, 'The right lip. Whoever did this grew up in this hall, or near it.', { wait: true }); }
  finally { SCENE.lock--; }
};
INV.bier = async function () {
  const P = CAST.A.priest, K = SCENE.player; if (SCENE.lock) return; SCENE.lock++;
  try { if (P) { P.faceTo(K.x); K.faceTo(P.x); }
    if (!INV.has('wolfsHood')) { await SCENE.talk([[K, 'Gniewomir. Laid out in my chapel, in his own colours, with his sword on him.'],
      [P, 'I washed him for the journey, Your Grace. Blue lips. A numb tongue, his queen says: he couldn’t say what was wrong. The heart stopped like a slammed door.'],
      [P, 'Wolf’s hood. Aconite. I’ve seen it twice: once in a dog, once in a bishop. It grows in the Wood, and every apothecary in the river quarter sells it dried, for rats.']]); INV.find('wolfsHood'); }
    else await SCENE.say(P, SCENE.cycle('iPriest', ['They carry him home on the twelfth day. I pray for him every hour, and for us every half.', 'The Krasnian knights at the door kneel when I pass. I don’t think it’s for me.']), { wait: true }); }
  finally { SCENE.lock--; }
};
INV.woman = async function () {
  const W = CAST.A.hutWitch, K = SCENE.player; if (SCENE.lock || !W) return; SCENE.lock++;
  try { W.faceTo(K.x); K.faceTo(W.x);
    if (!INV.said.woman) { INV.said.woman = true; await SCENE.talk([[W, 'I sold you sunshine. A king stopped breathing. You think one paid for the other.'], [K, 'Did it?'],
      [W, 'I didn’t need to. Kings are always being killed by someone. I only knew which week.']]); INV.note('woman'); }
    if (INV.has('wolfsHood') && !INV.has('dried')) { await SCENE.talk([[K, 'Wolf’s hood. Father Ambroży swears to it. It grows in your wood.'],
      [W, 'Mine grows. Yours was dried in a cellar. Smell it, next time, before you come and accuse an old woman of her own garden.'], [W, 'The river quarter sells it by the measure. For rats, they say. Everyone has rats.']]); INV.find('dried'); }
    else if (INV.said.woman) await SCENE.say(W, SCENE.cycle('iWoman', ['Twelve days. I’ve had longer and done less.', 'Your cat misses you. She says so with her claws.']), { wait: true }); }
  finally { SCENE.lock--; }
};
INV.report = async function () {
  const K = SCENE.player; if (SCENE.lock) return; SCENE.lock++;
  try { K.act('Interact', 0.6); await SCENE.wait(600);
    await SCENE.say(K, '“Report of the night of the feast. The cupbearer, Jacek, had the cup from noon. The fire-spitters held the hall’s eye at the second course. The poison was on the guest’s lip of the cup…”', { wait: true });
    if (INV.has('lip') && !INV.has('report')) { await SCENE.say(K, 'The guest’s lip. I never told her which lip. Bogdan swears he didn’t. Nobody did.', { wait: true }); INV.find('report'); }
    else if (!INV.has('lip')) await SCENE.say(K, 'Thorough, as ever. Ilka misses nothing.', { wait: true }); }
  finally { SCENE.lock--; }
};
/* ---------------------------------------------------------------- the journal */
INV.badge = (on) => { const b = $('jrnBtn'); if (b) b.classList.toggle('new', !!on); };
INV.WORD = (v) => (v >= 8 ? 'devoted' : v >= 5 ? 'close' : v >= 3 ? 'watchful' : v >= 1 ? 'cold' : 'lost to you');
INV.render = function () {
  if (CAL.phase === 'court' || CAL.phase === 'festival') {   // before the crisis the book is the king's week: what waits, and how the house stands
    const c = CAL.caption() || ['The King’s Week', '']; $('jrnTitle').textContent = c[0].split(' · ')[0]; $('jrnSub').textContent = c[0].split(' · ')[1] || c[1];
    const todo = CAL.phase === 'court' ? REALM.todo() : [c[1], CAL.fest === 3 ? 'Tonight: the feast. The bedchamber door leads to the hall.' : 'The bed ends the day.'];
    const F = REALM.fam; $('jrnText').innerHTML = `<h4>This ${CAL.phase === 'court' ? 'week' : 'day'}</h4>${todo.map((t) => `<p>${t}</p>`).join('')}
      <h4>The realm</h4><p>Gold ${COURT.stats.gold} · Stores ${COURT.stats.stores} · Mood ${COURT.stats.mood} · Army ${REALM.army}</p>
      <h4>The family</h4><p>Halina is ${INV.WORD(F.halina)}. Zofia is ${INV.WORD(F.zofia)}. Kazik is ${INV.WORD(F.kazik)}.</p>`; return; }
  $('jrnTitle').textContent = CAL.phase === 'done' && END.seen ? END.TITLES[END.seen] : 'The Dead King';
  const n = INV.ORDER.filter((id) => INV.found[id]).length, sub = INV.outcome ? 'The name was given.' : CAL.phase === 'crisis' ? `Day ${CAL.crisis} of twelve · ${n} of 8 clues` : `${n} of 8 clues`;
  $('jrnSub').textContent = sub + (CAL.phase === 'crisis' && REALM.waiting() ? ' · a petitioner waits in the hall' : '');
  const clues = INV.ORDER.filter((id) => INV.found[id]).map((id) => { const [t, d, w] = INV.CLUES[id]; const where = id === 'grey' ? { salA: 'Mira of the Salamanders', konrad: 'Konrad of Hal', lute: 'the lute player at the House' }[INV.witness()] : w;
    return `<div class="clue"><b>${t}</b><p>${d}</p><small>${where} · day ${INV.found[id]}</small></div>`; }).join('') || '<p>Nothing yet. The cup, the body, the people at the feast: start there.</p>';
  const notes = Object.keys(INV.NOTES).filter((id) => INV.notes[id]).map((id) => `<p>${INV.NOTES[id]}</p>`).join('');
  $('jrnText').innerHTML = `<h4>Clues</h4>${clues}${notes ? `<h4>What people say</h4>${notes}` : ''}`;
};
INV.panel = function (on) {
  const P = $('journal'); if (on && (SCENE.lock || SCENE.modal || CUT.playing)) return;
  if (on) { INV.render(); INV.badge(false); AUDIO.sfx('page', { gain: 0.7 }); }
  P.hidden = !on; SCENE.modal = on; (on ? $('jrnBack') : $('cv')).focus();
};
INV.init = function () {
  $('jrnBtn').onclick = (e) => { e.stopPropagation(); INV.panel(true); }; $('jrnBack').onclick = () => INV.panel(false);
  window.addEventListener('keydown', (e) => { if (!document.body.classList.contains('inv') || TITLE.on) return;
    if (e.code === 'KeyJ' && $('journal').hidden && !SCENE.modal) { e.preventDefault(); INV.panel(true); }
    else if ((e.code === 'Escape' || e.code === 'KeyJ') && !$('journal').hidden) { e.preventDefault(); e.stopImmediatePropagation(); INV.panel(false); } }, true);
};
/* ---------------------------------------------------------------- the accusation (§7.4) */
INV.OUT = {
  ilkaHand: { text: 'Ilka is hanged at the Krasnian camp at dawn, in the rain. Peace with Krasna. Lodmir has lost its eyes, and the one person who knew about the first bargain.', war: null },
  ilkaPoison: { text: 'Ilka takes the poison she carries, at the foot of the throne. Peace. Mściwoj was cheated of his justice, and he won’t forget it.', war: null },
  ilkaTunnel: { text: 'Ilka goes down the old stair behind the confessional and is gone. Krasna’s patience breaks the same night.', war: 'krasna' },
  konrad: { text: 'Mściwoj believes it: Krasna and Lodmir together against Hal. The Pact is signed in the rain, on Krasna’s terms. The war of the cup is a war with Hal.', war: 'hal' },
  jarek: { text: 'The League closes the river. Halina doesn’t speak to you for a week. Krasna is satisfied, for a season.', war: null },
  family: { text: 'Mściwoj kills Ser Ottokar in the hall with his own hands. When the truth comes out, he turns on Lodmir for the insult to his mother.', war: 'krasna' },
  woman: { text: 'Mściwoj sends forty men into the Wood. Six come back. The Woman’s price goes up.', war: null },
  blame: { text: 'Lodmir pays the blood-price: the Swan Pass and a chest of gold. Peace, and a poorer, smaller kingdom.', war: null },
  wrong: { text: '', war: null },
  none: { text: 'The twelfth day ends with no name. Three hundred Krasnian knights become twenty thousand.', war: 'krasna' },
};
INV.accuse = async function () {
  const A = CAST.A, K = SCENE.player, M = A.msciwoj, I = A.spymaster, room = THRONE; if (SCENE.lock || INV.outcome || !M) return;
  SCENE.lock++; let staged = false;
  try {
    if ((await NIGHT.ask(['Summon Mściwoj, and name the hand', 'Not yet'])) === 1) return;
    await NIGHT.fade(true); staged = true; INV.accusing = true;
    K.stand(); K.x = room.TX + 0.9; K.z = room.KZ; K.face = 1; K.lookYaw = null; M.offstage = false; M.setVisible(true); M.stand(); M.x = 6.3; M.z = 2.7; M.face = -1; M.lookYaw = null;
    await SCENE.lens(room, { focus: 3.6, dist: 15.5, y: 2.45, look: 1.85, fov: 17 }, 0.01);
    await NIGHT.fade(false); AUDIO.sfx('drum', { gain: 0.6 });
    await SCENE.say(M, `Day ${CAL.crisis} of twelve, Radomir. My father is a day nearer home. Whose hand?`, { wait: true });
    const pick = await NIGHT.ask(['Ilka, my spymaster', 'Konrad of Hal', 'Jarek of Velka', 'Wiesława and Ottokar', 'The Woman in the Wood', 'Mine: I’ll pay the blood-price']);
    let key = ['ilka', 'konrad', 'jarek', 'family', 'woman', 'blame'][pick];
    await SCENE.say(K, ['Ilka. My own spymaster.', 'Konrad of Hal.', 'Jarek of Velka.', 'Your mother, Mściwoj. And Ser Ottokar.', 'The Woman in the Wood.', 'Mine. Lodmir will pay the blood-price.'][pick], { wait: true });
    if (key === 'ilka') {
      if (!(INV.has('lip', 'oldSeal') && (INV.has('ledger') || INV.has('report')))) {   // not enough: he laughs, and the days run
        await SCENE.talk([[M, 'Your own spymaster? On what? A cup and a feeling? Bring me proof, Radomir, not a name.'], [M, 'And it costs you. Two days.']]);
        CAL.crisis = Math.min(12, CAL.crisis + 2); return;
      }
      if (I) { I.stand(); await new Promise((r) => I.moveTo3({ x: room.TX - 0.6, z: 2.75 }, r)); I.face = 1; I.lookYaw = null; }
      await SCENE.talk([[K, 'The guest’s lip, in her report, before anyone told her. The old Margrave’s seal, from the siege’s dead. A measure of wolf’s hood in a river-house ledger, in a grey cloak.'],
        [I || K, 'Yes.'], [I || K, 'I did it for Lodmir. The Pact was a knife at our throat for a hundred years, and you were going to sign it, Radomir. I watched you decide.'],
        [I || K, 'Every Lodmiri knows the custom. No Krasnian does. That was the whole of it.'], [M, 'Then she’s mine.']]);
      const f = await NIGHT.ask(['Hand her to Krasna', 'Let her take her own poison', 'Let her go: the stair behind the confessional']);
      key = ['ilkaHand', 'ilkaPoison', 'ilkaTunnel'][f];
      await SCENE.say(K, ['She’s yours, Mściwoj.', 'Ilka. The vial in your sleeve. Here, where I can see it.', 'Go, Ilka. Now. Down the old stair.'][f], { wait: true });
    } else {
      await SCENE.say(M, { konrad: 'Hal. Of course it was Hal. Then Krasna and Lodmir finish what my father started: sign the Pact, Radomir. Tonight.', jarek: 'The League’s man. Your wife’s brother. You’d give me him? Then I’ll take him.',
        family: 'My mother. My mother and Ottokar. (He goes white, then red.) Ottokar!', woman: 'A witch in a wood. You’re giving me a witch.', blame: 'Then Lodmir pays. The pass, and gold. My father’s price, not mine.' }[key], { wait: true });
    }
    await INV.conclude(key);
  } finally {
    if (staged) { INV.accusing = false; M.setVisible(false); M.offstage = true; if (I) { I.stand(); I.placeIn('throne'); } SCENE.lensReset(room); }   // the throne room may already be behind us (conclude): no eased lens
    SCENE.lock--;
  }
};
/* the name is given: chapter five, and the war if it comes to war (the battle, BATTLE.play) */
INV.conclude = async function (key) {
  const O = INV.OUT[key]; INV.outcome = key; CAL.phase = 'ch5'; GAME.save();
  await NIGHT.fade(true); SCENE.caption('Chapter Five · The War of the Cup', O.text); await SCENE.wait(6500);
  if (O.war && typeof BATTLE !== 'undefined') await BATTLE.play({ enemy: O.war });
  await END.play();   // chapter six: the fortieth night, the Woman's price, the ending the ledgers earned (g52); then the title
};
/* the twelfth day ran out (CAL.next) */
INV.timeout = function () { if (INV.outcome) return; INV.pendingEnd = true; };   // CAL.morning plays it out: the war, and the end
