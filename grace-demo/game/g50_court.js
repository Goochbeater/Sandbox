/* COURT — holding court from the throne. The steward announces each petitioner, they walk in through the great doors
   and ask; the petition panel opens:
     the bar      `cells` slots; filling `need` of them meets the request, every slot past it earns extra Prosperity;
                  some slots carry effects (✚ wound: whoever fills it loses an action next week, ★ bonus: +1 Prosperity)
     agents       each has action points for the week; every action adds that agent's skill for this request
     items        one-off gifts from the treasury, worth a fixed number of slots
   Grant or refuse; the result plays out, and after the last petitioner the week's Prosperity is split between Gold,
   Stores and Mood. Petitions are data (COURT.PETS), so writing new ones needs no new code. */
const COURT = { done: false, greeted: false, busy: false, prosperity: 0, ledger: [], stats: { gold: 12, stores: 9, mood: 7 },
  agents: [{ id: 'commander', name: 'Ser Bogdan', title: 'Commander', ap: 3, max: 3, wound: 0 }, { id: 'spymaster', name: 'Ilka', title: 'Spymaster', ap: 3, max: 3, wound: 0 }],
  items: [{ id: 'grain', name: 'Seed grain', pts: 2, n: 1 }, { id: 'brooch', name: 'Silver brooch', pts: 2, n: 1 }, { id: 'ledger', name: 'Old toll ledger', pts: 3, n: 1 }] };
COURT.PETS = [
  { who: 'marta', name: "Marta, a miller's widow", ask: 'Clear the bandits off the old mill road.', need: 4, cells: 8, fit: { commander: 2, spymaster: 1 }, effects: { 5: 'wound', 7: 'bonus' },
    stewardIn: 'Marta, of the lower mill.',
    intro: ['Your Grace. Bandits hold the old mill road. Nothing has reached the lower town in nine days.', 'My sons want to take it back themselves. They are millers. They will get themselves killed.'],
    yes: ["Thank you, Your Grace. I'll tell them the crown remembered us."], short: ['Then we will manage. We always do.'], no: ['I see. Good evening, Your Grace.'] },
  { who: 'tomasz', name: 'Tomasz Brzoza, salt merchant', ask: 'Find out who is skimming the river tolls.', need: 5, cells: 9, fit: { commander: 1, spymaster: 2 }, effects: { 4: 'bonus', 7: 'wound' },
    stewardIn: 'Master Tomasz Brzoza, of the salt barges.',
    intro: ['Your Grace, the tolls at the Kalina ford have doubled since spring.', "Someone pockets the difference, and it isn't the crown. I have the receipts."],
    yes: ["Then I'll keep my receipts close, Your Grace. And my door locked."], short: ['Half a job is still a job, I suppose. Thank you, Your Grace.'], no: ['Of course. The river can wait. It always has.'] },
];
COURT.TALK = {
  steward: { before: ['Your Grace. Two petitioners tonight, and both of them early.', 'The throne is warm, Your Grace. I had a brazier under it all afternoon.'], after: ["A fair evening's work, Your Grace. I've written it all down."] },
  queen: { before: ['You kept them waiting again.', 'Wear the crown straight, love. They notice.'], after: ['You were kind tonight. Be careful who learns that you are kind.'] },
  commander: { before: ['Ser Bogdan, Your Grace. Point me at the trouble.', 'My men are bored. Bored men drink.'], after: ['Give me a week and the roads will be quiet.'] },
  spymaster: { before: ['Ilka, Your Grace. I hear everything. Most of it is dull.', 'The salt merchant has been asking questions in the taverns. Listen to him.'], after: ['Somebody at the ford is about to have a very bad week.'] },
};
/* ---------------------------------------------------------------- the hall */
COURT.enterHall = function () {
  const room = THRONE, A = CAST.A;
  if (!COURT.wired) { COURT.wired = true;
    for (const id of ['steward', 'queen', 'commander', 'spymaster']) { const a = A[id]; room.interact(id, a.x, a.y + (a.spec.headY || 2.1) + 0.45, room.KZ, 0.75, () => {
      a.faceTo(SCENE.player.x); a.lookYaw = Math.sign(SCENE.player.x - a.x) * 0.9; SCENE.say(a, SCENE.cycle(id + (COURT.done ? 'A' : 'B'), COURT.TALK[id][COURT.done ? 'after' : 'before'])); }).label = 'Talk to the ' + id; }
    room.interact('rise', room.TX, 3.75, room.KZ, 99, () => COURT.rise()).seated = true;
    SCENE.buildMarks(); }
  if (!COURT.greeted) { COURT.greeted = true; setTimeout(() => { SCENE.say(A.steward, 'Your Grace. The petitioners are waiting. The throne, whenever you are ready.'); SCENE.pulse(room.inter.find((i) => i.id === 'throne')); }, 5200); }
};
COURT.update = function (dt) {
  const room = THRONE; room.doorLight.intensity = damp(room.doorLight.intensity, room.doorOpen.visible ? 9 : 0, 4, dt);
};
COURT.door = function (open) { THRONE.doorOpen.visible = open; THRONE.doorClosed.visible = !open; };
const arrive = (a, x) => new Promise((r) => a.walkTo(x, r));
const glide = (a, p) => new Promise((r) => a.moveTo3(p, r));
/* up the dais and onto the throne; court begins the first time */
COURT.sit = async function () {
  if (COURT.busy) return; COURT.busy = true; SCENE.lock++;
  const K = SCENE.player, room = THRONE;
  await arrive(K, room.TX); await glide(K, { x: room.TX, y: 0.48, z: 1.62, speed: 0.8 });
  K.sit(room.seat); await SCENE.wait(900);
  room.camFocus = room.TX + 1.6;
  SCENE.lock--; COURT.busy = false;
  if (!COURT.done) COURT.run();
};
COURT.rise = async function () {
  if (COURT.busy || SCENE.modal) return; COURT.busy = true; SCENE.lock++;
  const K = SCENE.player, room = THRONE; room.camFocus = null;
  K.stand(); K.y = 0.48; K.z = 1.62; K.yaw = 0; await glide(K, { x: room.TX, y: 0, z: room.KZ, speed: 0.8 }); K.face = 1;
  SCENE.lock--; COURT.busy = false;
};
COURT.run = async function () {
  COURT.busy = true; SCENE.lock++;
  const A = CAST.A;
  await SCENE.talk([[A.steward, 'Court is in session. Let the first petitioner in.']]);
  for (const p of COURT.PETS) await COURT.petition(p);
  await SCENE.talk([[A.steward, 'That is everyone for tonight, Your Grace.']]);
  SCENE.lock--;
  await COURT.week();
  COURT.done = true; COURT.busy = false;
  SCENE.say(A.queen, 'Well done. Now come away from that chair before it grows into you.');
};
COURT.petition = async function (p) {
  const A = CAST.A, pet = A[p.who], room = THRONE;
  await SCENE.talk([[A.steward, p.stewardIn]]);
  COURT.door(true); pet.offstage = false; pet.setVisible(true); pet.x = room.DOORX; pet.z = 3.0; pet.face = -1; pet.yaw = -1.3;
  await SCENE.wait(500);
  const walking = arrive(pet, room.SPOT); setTimeout(() => COURT.door(false), 2600); await walking;
  pet.lookYaw = -0.95; pet.act('Interact'); await SCENE.wait(900);
  await SCENE.talk(p.intro.map((t) => [pet, t]));
  const res = await COURT.panel(p);
  const lines = p[res.kind];
  if (res.kind === 'yes') COURT.toast('+' + res.gain + ' Prosperity'); else if (res.kind === 'short') COURT.toast('Prosperity −1');
  await SCENE.talk(lines.map((t) => [pet, t]));
  for (const w of res.notes) await SCENE.talk([[A.steward, w]]);
  pet.lookYaw = null; COURT.door(true); await arrive(pet, room.DOORX + 0.3); pet.setVisible(false); pet.offstage = true; COURT.door(false);
  await SCENE.wait(500);
};
/* ---------------------------------------------------------------- the petition panel */
COURT.panel = function (p) {
  return new Promise((done) => {
    SCENE.modal = true; const el = $('court'); el.hidden = false;
    const use = {}; for (const a of COURT.agents) use[a.id] = 0; const items = new Set(), seq = [];
    $('cpWho').textContent = p.name; $('cpAsk').textContent = p.ask;
    const sources = () => { const s = []; for (const q of seq) s.push(q); return s; };
    const total = () => seq.reduce((t, q) => t + q.pts, 0);
    const render = () => {
      // bar: cells filled in the order help was sent, so each effect lands on whoever filled that cell
      const bar = $('cpBar'); bar.innerHTML = ''; let cell = 0; const owner = [];
      for (const q of sources()) for (let k = 0; k < q.pts; k++) owner[cell++] = q;
      for (let i = 1; i <= p.cells; i++) { const c = document.createElement('div'); c.className = 'cell' + (i <= cell ? ' on' : '') + (i === p.need ? ' need' : '') + (i > p.need ? ' extra' : '');
        const fx = p.effects[i]; if (fx) { const s = document.createElement('span'); s.className = 'fx ' + fx; s.textContent = fx === 'wound' ? '✚' : '★'; s.title = fx === 'wound' ? 'Wound: whoever fills this loses an action next week' : 'Bonus: +1 Prosperity'; c.appendChild(s); }
        if (i === p.need) { const n = document.createElement('em'); n.textContent = 'need'; c.appendChild(n); }
        bar.appendChild(c); }
      const t = total(), over = Math.max(0, Math.min(t, p.cells) - p.need);
      $('cpNote').textContent = t === 0 ? `Needs ${p.need} of ${p.cells}. Send an agent or offer something from the treasury.` : t >= p.need ? `Meets the request${over ? `, with ${over} to spare` : ''}.` : `Short by ${p.need - t}.`;
      $('cpGrant').textContent = t >= p.need ? 'Grant' : t ? 'Grant anyway' : 'Grant';
      $('cpGrant').disabled = t === 0;
      // agents
      const ag = $('cpAgents'); ag.innerHTML = '';
      for (const a of COURT.agents) { const left = a.ap - use[a.id], fit = p.fit[a.id] || 0, card = document.createElement('div'); card.className = 'agent';
        card.innerHTML = `<div class="an">${a.name} <span class="at">${a.title} · +${fit} each</span></div><div class="pips">${'<i class="on"></i>'.repeat(left)}${'<i></i>'.repeat(a.max - left)}</div>`;
        const ctl = document.createElement('div'); ctl.className = 'ctl';
        const minus = document.createElement('button'); minus.className = 'pm'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Recall one action from ' + a.name); minus.disabled = !use[a.id];
        const plus = document.createElement('button'); plus.className = 'pm'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Send ' + a.name); plus.disabled = left <= 0 || total() >= p.cells;
        const n = document.createElement('span'); n.className = 'n'; n.textContent = use[a.id];
        minus.onclick = () => { use[a.id]--; seq.splice(seq.map((q) => q.src).lastIndexOf(a.id), 1); render(); };
        plus.onclick = () => { use[a.id]++; seq.push({ src: a.id, pts: fit }); render(); };
        ctl.append(minus, n, plus); card.appendChild(ctl); ag.appendChild(card); }
      // items
      const it = $('cpItems'); it.innerHTML = '<div class="lbl">From the treasury</div>';
      for (const i of COURT.items) { const b = document.createElement('button'); b.className = 'item' + (items.has(i.id) ? ' on' : ''); b.disabled = !i.n && !items.has(i.id);
        b.innerHTML = `${i.name} <b>+${i.pts}</b>`; b.setAttribute('aria-pressed', items.has(i.id));
        b.onclick = () => { if (items.has(i.id)) { items.delete(i.id); seq.splice(seq.findIndex((q) => q.src === i.id), 1); } else { items.add(i.id); seq.push({ src: i.id, pts: i.pts }); } render(); };
        it.appendChild(b); }
      COURT._owner = owner;
    };
    const finish = (kind) => {
      el.hidden = true; SCENE.modal = false; const t = total(), notes = [];
      if (kind === 'yes') {
        for (const a of COURT.agents) a.ap -= use[a.id];
        for (const id of items) COURT.items.find((i) => i.id === id).n--;
        const filled = Math.min(t, p.cells); let gain = 1 + Math.max(0, filled - p.need);
        for (let i = 1; i <= filled; i++) { const fx = p.effects[i], who = COURT._owner[i - 1];
          if (fx === 'bonus') gain++;
          if (fx === 'wound' && who) { const a = COURT.agents.find((g) => g.id === who.src); if (a) { a.wound++; notes.push(`${a.name} came back wounded. One action fewer next week.`); } } }
        if (t < p.need) { COURT.prosperity -= 1; done({ kind: 'short', gain: -1, notes }); return; }
        COURT.prosperity += gain; COURT.ledger.push([p.name, gain]); done({ kind: 'yes', gain, notes }); return;
      }
      done({ kind: 'no', gain: 0, notes });
    };
    $('cpGrant').onclick = () => finish('yes'); $('cpRefuse').onclick = () => finish('no');
    render(); setTimeout(() => $('cpGrant').focus(), 50);
  });
};
/* ---------------------------------------------------------------- the end of the week */
COURT.week = function () {
  return new Promise((done) => {
    SCENE.modal = true; const el = $('week'); el.hidden = false; $('wkResult').hidden = true; $('wkSplit').hidden = false;
    const P = Math.max(0, COURT.prosperity), add = { gold: 0, stores: 0, mood: 0 }, names = { gold: 'Gold', stores: 'Stores', mood: 'Mood' };
    $('wkEarned').textContent = COURT.prosperity >= 0 ? `Prosperity this week: ${COURT.prosperity}` : `Prosperity this week: ${COURT.prosperity}. Nothing to share out.`;
    const render = () => { const left = P - add.gold - add.stores - add.mood, box = $('wkRows'); box.innerHTML = '';
      for (const k of ['gold', 'stores', 'mood']) { const row = document.createElement('div'); row.className = 'wrow';
        row.innerHTML = `<span class="wn">${names[k]}</span><span class="wv">${COURT.stats[k]}${add[k] ? ` <b>+${add[k]}</b>` : ''}</span>`;
        const m = document.createElement('button'); m.className = 'pm'; m.textContent = '−'; m.disabled = !add[k]; m.setAttribute('aria-label', 'Less to ' + names[k]); m.onclick = () => { add[k]--; render(); };
        const pl = document.createElement('button'); pl.className = 'pm'; pl.textContent = '+'; pl.disabled = left <= 0; pl.setAttribute('aria-label', 'More to ' + names[k]); pl.onclick = () => { add[k]++; render(); };
        row.append(m, pl); box.appendChild(row); }
      $('wkLeft').textContent = left > 0 ? `${left} left to share out` : 'All shared out';
      $('wkSeal').disabled = left > 0; };
    $('wkSeal').onclick = () => {
      for (const k in add) COURT.stats[k] += add[k];
      const wages = COURT.agents.length; COURT.stats.gold -= wages; const lines = [`Wages paid: ${wages} gold.`];
      for (const a of COURT.agents) { a.ap = Math.max(1, a.max - a.wound); lines.push(`${a.name}: ${a.ap} action${a.ap > 1 ? 's' : ''} next week${a.wound ? ' (resting a wound)' : ''}.`); a.wound = 0; }
      $('wkSplit').hidden = true; $('wkResult').hidden = false;
      $('wkStats').textContent = `Gold ${COURT.stats.gold}  ·  Stores ${COURT.stats.stores}  ·  Mood ${COURT.stats.mood}`; $('wkNotes').textContent = lines.join(' ');
      $('wkDone').focus();
    };
    $('wkDone').onclick = () => { el.hidden = true; SCENE.modal = false; done(); };
    render();
  });
};
COURT.toast = function (text) { const t = $('toast'); t.textContent = text; t.classList.add('on'); clearTimeout(COURT._tt); COURT._tt = setTimeout(() => t.classList.remove('on'), 2200); };
