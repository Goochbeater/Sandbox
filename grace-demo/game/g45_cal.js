/* THE CALENDAR (STORY.md §4, §12): which day it is, and what kind of day. Phases:
     'court'    chapter 1's day: the rain has come back and court is in session (the demo's first day)
     'festival' the Swan Festival (chapter 3), days 1–3: the meadow is open, there is no court, the sun holds
     'crisis'   chapter 4: the twelve days after the feast, and the rain again
   A day ends in the bed (CAL.bed: sleep, or the night with Halina behind the 18+ gate); NIGHT.end and CAL.sleep both hand
   the morning to CAL.next. The feast is the festival's third night: on day 3 the bedchamber's door opens on the hall
   dressed for it (FEAST, g46) and the bed refuses. Chapters 1–2's weeks aren't built yet: between the court day and the
   festival a card says what happened in them. Everything here is saved (GAME.state). */
const CAL = { phase: 'court', day: 1, fest: 0, crisis: 0, feastDone: false, doors: null, toast: null, konrad: null, fire: null };
CAL.init0 = JSON.stringify(CAL);
CAL.reset = function () { Object.assign(CAL, JSON.parse(CAL.init0)); };
CAL.KEYS = ['phase', 'day', 'fest', 'crisis', 'feastDone', 'doors', 'toast', 'konrad', 'fire'];
CAL.state = function () { const o = {}; for (const k of CAL.KEYS) o[k] = CAL[k]; return o; };
CAL.load = function (s) { CAL.reset(); if (s) for (const k of CAL.KEYS) if (k in s) CAL[k] = s[k]; };
CAL.festival = () => CAL.phase === 'festival';
CAL.DAYS = {
  festival: [null, ['The Swan Festival · Day One', 'The Fairground: the guests ride in, the fire-spitters, the bear'],
    ['The Swan Festival · Day Two', 'The Lists: the melee and the archery. The Pact by evening'],
    ['The Swan Festival · Day Three', 'The joust and the pavilions. Tonight, the feast']],
  crisis: (n) => [`The Dead King · Day ${n} of twelve`, n < 12 ? 'Krasna is waiting. So is the rain.' : 'The last day.'],
};
CAL.caption = function () {
  if (CAL.phase === 'festival') return CAL.DAYS.festival[CAL.fest];
  if (CAL.phase === 'crisis') return CAL.DAYS.crisis(CAL.crisis);
  return null;
};
/* what isn't on today (the lists' bouts have their days); null when it is. Outside the festival week (a test link straight
   onto a ground) everything is open */
CAL.notYet = function (what) {
  if (!CAL.festival()) return null;
  const day = { duel: 2, archery: 2, joust: 3, loveQueen: 3 }[what] || 1;
  return CAL.fest >= day ? null : ['', '', 'The melee and the archery are tomorrow, Your Grace. Today the meadow is the fair’s.', 'The joust is the last day’s, Your Grace. Two more sunrises.'][day];
};
/* the map: the meadow is the festival's (and after the feast, the Krasnian camp's); the castle is always there */
MAP.onOpen = function (places) { const m = places.find((p) => p.id === 'meadow'); if (!m) return;
  m.locked = CAL.phase === 'court'; m.sub = CAL.phase === 'court' ? 'in the fifth week' : CAL.phase === 'festival' ? 'the festival' : 'the Krasnian camp';
  if (CAL.phase === 'crisis') { m.room = 'camp'; m.at = { x: -13.4, face: 1 }; } else { m.room = 'fair'; m.at = { x: FAIR.ENTRY, face: 1 }; } };   // after the feast the fair is packed away; Krasna mourns in its pavilions
/* the bed. Day three's night is the feast's */
CAL.bed = async function () {
  const K = SCENE.player; if (SCENE.lock) return;
  if (CAL.festival() && CAL.fest === 3 && !CAL.feastDone) { SCENE.say(K, SCENE.cycle('calFeast', ['Not tonight. The whole of Krasna is waiting in the great hall.', 'The feast first. Then sleep, if anyone sleeps.'])); return; }
  SCENE.lock++; let i;
  try { i = await NIGHT.ask(['Sleep until morning', 'Go to bed with Halina (18+)', 'Not yet']); } finally { SCENE.lock--; }
  if (i === 0) return CAL.sleep();
  if (i === 1) { if (K.crownMesh.visible) { K.crownMesh.visible = false; BEDROOM.crownCard.visible = BEDROOM.crownGlow.visible = true; }   // the crown back on its cushion first
    return NIGHT.start(); }
};
/* sleep without the scene: the fade, the next day, morning */
CAL.sleep = async function () {
  const K = SCENE.player; SCENE.lock++;
  try { await NIGHT.fade(true); AUDIO.sfx('sheets', { gain: 0.5 }); await SCENE.wait(900);
    K.stand(); K.x = -6.4; K.z = BEDROOM.KZ; K.face = 1; K.yaw = 0.42;
    await CAL.next(); await NIGHT.fade(false); CAL.morning(); }
  finally { SCENE.lock--; }
};
/* the night is over (inside the fade): move the day on. Returns the bridging card's lines, if the day jumped */
CAL.next = async function () {
  if (CAL.phase === 'court') {   // chapters 1 and 2 aren't built: say what the weeks between held, then the festival
    CAL.phase = 'festival'; CAL.fest = 1; CAL.day += 28; CAL.bridge = ['Four weeks later', 'The rain stopped on the morning the guests were due. Nobody in Lodmir remembers a June so dry.'];
  } else if (CAL.phase === 'festival') { if (CAL.fest < 3) { CAL.fest++; CAL.day++; } }
  else if (CAL.phase === 'crisis') { if (CAL.crisis < 12) { CAL.crisis++; CAL.day++; } }
  else CAL.day++;
  GAME.save();
};
/* the morning's caption (after the fade). The bridge card, when the day jumped, goes first */
CAL.morning = function () {
  const c = CAL.caption(), b = CAL.bridge; CAL.bridge = null;
  if (b) { SCENE.caption(b[0], b[1]); if (c) setTimeout(() => SCENE.caption(c[0], c[1]), 5200); }
  else if (c) SCENE.caption(c[0], c[1]); else SCENE.caption('Morning', 'The rain again, on the glass.');
};
/* the weather: in the crisis the rain is back, on every window (the indoor rooms) and on everything (the outdoor ones) */
CAL.OUT = ['garden', 'yard', 'wood', 'fair', 'lists', 'camp'];
SCENE.afterEnter = function (room) {
  if (CAL.phase !== 'crisis' || CUT.playing || !room.ambience) return;
  AUDIO.ambience(Object.assign({}, room.ambience, CAL.OUT.includes(room.id) ? { rain: 0.8, birds: 0 } : { rainGlass: 0.75 }));
};
