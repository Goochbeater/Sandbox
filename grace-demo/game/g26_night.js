/* THE NIGHT — an adult scene between King Radomir and Queen Halina (38 and 36, married thirteen years), played in the
   bedchamber itself with the engine's own actors: no overlay, no cut. 18+ only: the player confirms their age once
   (kept in this browser).
   The beats: night falls on the room → Halina is by the hearth → he goes to her and they talk (her brother's League,
   the rain he flinches at) → the player chooses to take her to bed or not → they walk to the bed together → she has
   him unlace her, then undresses him → she ties the bed curtains back → they climb in → kissing, then whichever
   positions the player picks, at the pace the player picks → finish → afterglow → morning.
   Bodies: Actor.undress / makeBare (engine/e05 + e13), positions from LOVERS (g27) driven by POSE (engine/e14). In bed
   both bodies are drawn in ONE sprite (the queen is hosted in the king's), so where they touch they overlap correctly;
   that sprite's box is widened to the whole bed and its card slid forward of the pillows. The room camera eases in
   toward the bed (the player can pull it back out), it never leaves the room. */
const NIGHT = { AGE: 'swan.age18', on: false, pace: 1, ph: 0, k: 0, pos: null, closer: true, finishing: false };
NIGHT.aged = () => { try { return localStorage.getItem(NIGHT.AGE) === '1'; } catch (e) { return false; } };
NIGHT.confirm = function (then) {
  if (NIGHT.aged()) { then(); return; }
  const g = $('ageGate'); g.hidden = false; SCENE.modal = true; $('ageYes').focus();
  $('ageYes').onclick = () => { try { localStorage.setItem(NIGHT.AGE, '1'); } catch (e) { /* */ } g.hidden = true; SCENE.modal = false; then(); };
  $('ageNo').onclick = () => { g.hidden = true; SCENE.modal = false; };
};
NIGHT.PACE = { nSlow: 0.6, nMid: 1, nFast: 1.7 };
NIGHT.init = function () {
  for (const id in NIGHT.PACE) $(id).onclick = () => NIGHT.setPace(NIGHT.PACE[id]);
  $('nView').onclick = () => { NIGHT.closer = !NIGHT.closer; $('nView').textContent = NIGHT.closer ? 'Wider' : 'Closer'; };
  $('nFinish').onclick = () => NIGHT.finish();
};
NIGHT.start = function () { if (NIGHT.on || SCENE.lock || CUT.playing) return; NIGHT.confirm(() => NIGHT.play().catch(fail)); };
/* ---------------------------------------------------------------- the strip under the picture */
NIGHT.bar = function (rows) {   // rows: which of 'ask' / 'pos' / 'pace' to show
  const el = $('night'); el.hidden = !rows.length;
  $('nAsk').hidden = !rows.includes('ask'); $('nPos').hidden = !rows.includes('pos'); $('nPace').hidden = !rows.includes('pace');
};
NIGHT.ask = function (opts) {   // a choice under the picture -> the index picked (keys 1..n work too)
  return new Promise((res) => {
    const row = $('nAsk'); row.innerHTML = '';
    const pick = (i) => { window.removeEventListener('keydown', key, true); row.innerHTML = ''; NIGHT.bar([]); AUDIO.sfx('page', { gain: 0.3 }); res(i); };
    const key = (e) => { const i = +e.key - 1; if (i >= 0 && i < opts.length) { e.preventDefault(); e.stopPropagation(); pick(i); } };
    opts.forEach((t, i) => { const b = document.createElement('button'); b.className = 'btn' + (i === 0 ? ' gold' : ''); b.textContent = t; b.onclick = (e) => { e.stopPropagation(); pick(i); }; row.append(b); });
    window.addEventListener('keydown', key, true); NIGHT.bar(['ask']); row.firstChild.focus();
  });
};
NIGHT.setPace = function (k) { NIGHT.pace = k; for (const id in NIGHT.PACE) $(id).classList.toggle('on', NIGHT.PACE[id] === k); };
NIGHT.posBar = function () {
  const row = $('nPos'); row.innerHTML = '';
  for (const n of ['kiss', 'missionary', 'ride', 'behind']) { if (n === NIGHT.pos) continue;
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = LOVERS.LABEL[n]; b.onclick = (e) => { e.stopPropagation(); NIGHT.to(n); }; row.append(b); }
};
/* ---------------------------------------------------------------- little helpers */
NIGHT.walk = (a, x) => new Promise((r) => { if (Math.abs(a.x - x) < 0.07) { r(); return; } a.walkTo(x, () => r()); });
NIGHT.tweens = [];
NIGHT.tween = (dur, fn) => new Promise((r) => NIGHT.tweens.push({ t: 0, dur, fn, r }));
NIGHT.beat = (ms) => SCENE.wait(ms);
NIGHT.look = (a, at) => { a.lookYaw = typeof at === 'number' ? at : (Math.sign(at.x - a.x) || 1) * 1.12; };
NIGHT.say = (a, t, ms) => SCENE.say(a, t).then(() => ms ? SCENE.wait(ms) : null);   // a passing remark (no tap needed)
NIGHT.fade = async (on) => { const f = $('fade'); f.classList.toggle('off', !on); await SCENE.wait(on ? 950 : 500); };
/* the camera: 'room' = the room's own framing, 'bed' = eased in on the bed (or only re-centred, if the player wants it wider) */
NIGHT.CAM = { bed: { fov: 13.5, y: 2.05, look: 1.62, focus: -7.72 }, wide: { fov: 17, y: 2.3, look: 1.9, focus: -7.72 } };
NIGHT.camTick = function (dt) {
  const room = BEDROOM, c = room.cam, c0 = NIGHT.cam0; if (!c0) return;
  const g = NIGHT.camMode === 'bed' ? (NIGHT.closer ? NIGHT.CAM.bed : NIGHT.CAM.wide) : { fov: c0.fov, y: c0.y, look: c0.look, focus: null };
  c.fov = damp(c.fov, g.fov, 0.7, dt); c.y = damp(c.y, g.y, 0.7, dt); c.look = damp(c.look, g.look, 0.7, dt);
  room.focusDz = NIGHT.camMode === 'bed' ? damp(room.focusDz || 0, room.KZ - 1.97, 0.7, dt) : damp(room.focusDz || 0, 0, 0.7, dt);   // keep the bed sharp
  room.camFocus = g.focus === null ? (Math.abs(c.fov - c0.fov) < 0.15 ? c0.focus : room.camFocus) : g.focus;
};
/* ---------------------------------------------------------------- every frame while the night is on */
NIGHT.tick = function (t, dt) {
  for (let i = NIGHT.tweens.length - 1; i >= 0; i--) { const w = NIGHT.tweens[i]; w.t += dt; const u = clamp(w.t / w.dur, 0, 1); w.fn(smooth(0, 1, u)); if (u >= 1) { NIGHT.tweens.splice(i, 1); w.r(); } }
  NIGHT.camTick(dt);
  NIGHT.lensK = clamp(NIGHT.lensK + Math.sign(NIGHT.lensT - NIGHT.lensK) * dt * 1.6, 0, 1); BEDROOM.lens(NIGHT.lensK);   // the near posts clear as the camera pushes in (0.6 s)
  if (!NIGHT.inBed) return;
  const p = NIGHT.pos, slow = p === 'kiss' || p === 'after', K = NIGHT.A.K, Q = NIGHT.A.Q;
  const rate = NIGHT.hold ? 0 : slow ? 1.1 : 3.4 * NIGHT.pace * (NIGHT.finishing ? 1.35 : 1);
  const S0 = LOVERS.stroke(NIGHT.ph); NIGHT.ph += rate * dt; const S1 = LOVERS.stroke(NIGHT.ph);
  if (!slow && !NIGHT.finishing) NIGHT.k = Math.min(1, NIGHT.k + dt * 0.012 * NIGHT.pace);
  const ag = p === 'after' ? 0.1 : p === 'kiss' ? 0.75 : 1, ar = K.arousal || 0; K.setArousal(ar + clamp(ag - ar, -dt * 0.08, dt * 0.4));
  const pan = clamp((K.x - R.cam.position.x) / 10, -0.8, 0.8), k = NIGHT.k;
  if (!slow && S0 < 0.9 && S1 >= 0.9) {   // the deep end of every stroke
    AUDIO.sfx('skin', { gain: 0.22 + 0.3 * k * Math.min(1.4, NIGHT.pace), pan });
    if (Math.random() < 0.35 + 0.3 * k) AUDIO.sfx('creak', { gain: 0.5 + 0.4 * NIGHT.pace, pan, delay: 0.04 });
  }
  NIGHT.brT -= dt;
  if (NIGHT.brT <= 0) { const her = Math.random() < 0.65; NIGHT.brT = lerp(slow ? 3.2 : 2.2, 0.75, k) / Math.sqrt(slow ? 1 : NIGHT.pace) * (0.8 + Math.random() * 0.4);
    AUDIO.sfx('breath', { gain: (her ? 0.34 : 0.24) + 0.36 * k, pitch: her ? 1150 + Math.random() * 450 : 640 + Math.random() * 200, dur: slow ? 1.1 : lerp(0.75, 0.45, k), pan });
    if (p === 'kiss' && Math.random() < 0.5) AUDIO.sfx('kiss', { gain: 0.35, pan, delay: 0.2 }); }
  NIGHT.lineT -= dt;
  if (NIGHT.lineT <= 0 && !SCENE.bubble && !NIGHT.scripted) { const L = NIGHT.LINES[p]; if (L) { const band = k < 0.35 ? 0 : k < 0.7 ? 1 : 2, set = L[Math.min(band, L.length - 1)];
    const [who, text] = SCENE.cycle('night_' + p + band, set); SCENE.say(who === 'K' ? K : Q, text); }
    NIGHT.lineT = lerp(7.5, 4.2, k) * (0.8 + Math.random() * 0.5); }
};
/* ---------------------------------------------------------------- positions */
NIGHT.drive = function (name, dur, lift) {
  const A = NIGHT.A; NIGHT.pos = name;
  const fK = () => LOVERS.pose(NIGHT.pos, NIGHT.ph, NIGHT.k, A).king, fQ = () => LOVERS.pose(NIGHT.pos, NIGHT.ph, NIGHT.k, A).queen;
  return Promise.all([POSE.drive(A.K, fK, dur, { lift }), POSE.drive(A.Q, fQ, dur, { lift })]);
};
NIGHT.to = async function (name) {
  if (NIGHT.busy || name === NIGHT.pos || NIGHT.finishing) return; NIGHT.busy = true;
  AUDIO.sfx('sheets', { gain: 0.8 }); NIGHT.posBar(); $('nPos').querySelectorAll('button').forEach((b) => b.disabled = true);
  await NIGHT.drive(name, name === 'behind' || NIGHT.pos === 'behind' ? 2.0 : 1.6, 0.12);
  NIGHT.posBar(); NIGHT.busy = false;
  const L = NIGHT.ENTER[name]; if (L) { NIGHT.scripted = true; for (const [w, t] of L) await NIGHT.say(w === 'K' ? NIGHT.A.K : NIGHT.A.Q, t, 150); NIGHT.scripted = false; NIGHT.lineT = 3; }
};
/* ---------------------------------------------------------------- the scene */
NIGHT.play = async function (o) {
  o = o || {};
  const room = BEDROOM, K = SCENE.player, Q = CAST.A.queen; if (SCENE.room !== room || NIGHT.on) return;
  NIGHT.on = true; NIGHT.A = { K, Q }; NIGHT.lensK = 0; NIGHT.lensT = 0; NIGHT.pos = null; NIGHT.k = 0; NIGHT.ph = 0; NIGHT.inBed = false; NIGHT.finishing = false; NIGHT.hold = false; NIGHT.brT = 1; NIGHT.lineT = 5;
  SCENE.lock++; NIGHT.tweens = []; room.tick.push(NIGHT.tick); NIGHT.camMode = 'room';
  NIGHT.cam0 = { fov: room.cam.fov, y: room.cam.y, look: room.cam.look, focus: room.camFocus };
  NIGHT.keep = { idle: Q.spec.idle, home: Q.curHome, baseY: Q.baseY };
  NIGHT.done = new Promise((r) => { NIGHT.resolve = r; });
  await NIGHT.fade(true);
  // nightfall: moonlight, the hearth, a candle by the bed. Halina warming her hands at the fire, the king across the room
  room.setNight(true); await Promise.all([K.makeBare(), Q.makeBare()]);
  K.stand(); K.target = null; K.x = o.fast ? -6.4 : -2.6; K.z = room.KZ; K.face = 1; K.lookYaw = null; K.yaw = 0.42;
  Q.spec.idle = 'Idle_Loop'; Q.curHome = { idle: 'Idle_Loop' }; Q.stand(); Q.baseY = Q.y = 0; Q.dress();
  Q.x = o.fast ? -7.0 : 1.0; Q.z = room.KZ - 0.12; Q.face = -1; Q.lookYaw = Math.PI * 0.93; Q.yaw = Q.lookYaw; Q.setVisible(true);
  SCENE.camX = SCENE.camGoal(); SCENE.render();
  if (!o.fast) SCENE.caption('That night', 'The storm has blown itself out. The castle sleeps; the queen does not.');
  await NIGHT.fade(false);
  if (!o.fast) {
    await NIGHT.beat(700);
    await NIGHT.walk(K, 0.15); NIGHT.look(K, Q);
    await SCENE.talk([[Q, "You're late again. The candles in your study burn faster than the ones in here."]]);
    NIGHT.look(Q, K); await NIGHT.beat(450);
    await SCENE.talk([
      [K, "Petitions. Grain. The Margrave's riders on the east road."],
      [Q, "And my brother's letter. Jarek is still waiting for an answer."],
      [K, "The League wants the river tolls for ten years. That isn't an alliance, Halina. It's a leash."],
      [Q, "A leash with grain on the end of it. Think about it tomorrow."],
      [Q, "You flinched at supper when the rain started. You always do."],
      [K, "An old habit. From the siege."],
      [Q, "One day you'll tell me the rest of it."]]);
    await NIGHT.walk(Q, 0.6); NIGHT.look(Q, K); Q.act('Interact');
    await SCENE.talk([[Q, "Not tonight, though. Tonight you look like a man who needs taking to bed."]]);
    if (await NIGHT.ask(['Take her hand', 'Not tonight']) === 1) {
      await SCENE.talk([[K, "I'd only keep you awake. Go to bed, love. I'll sit by the fire a while."], [Q, "Don't sit there until dawn."]]);
      Q.act('Interact'); await NIGHT.beat(900); return NIGHT.end(false);
    }
    await SCENE.talk([[K, "Then take me."], [Q, "Come here."]]);
    AUDIO.sfx('kiss', { gain: 0.3 }); await NIGHT.beat(300);
    // she leads him by the hand to the bed
    const toBed = NIGHT.walk(Q, -8.0); await NIGHT.beat(380); const him = NIGHT.walk(K, -7.4);
    await NIGHT.beat(2200); NIGHT.say(Q, "Leave the kingdom outside the door. One hour.");
    await Promise.all([toBed, him]);
  }
  NIGHT.look(Q, K); NIGHT.look(K, Q); await NIGHT.beat(400);
  // undressing, a layer at a time: he unlaces her gown, she takes off his robe, then the rest
  await SCENE.talk([[Q, "Help me with these laces. My maids tie them like they're guarding a gate."]]);
  Q.lookYaw = -1.3; await NIGHT.beat(500); K.act('Interact'); AUDIO.sfx('sheets', { gain: 0.45 }); await NIGHT.beat(1100);
  await Q.undress('outer'); AUDIO.sfx('sheets', { gain: 0.8 }); await NIGHT.beat(500);
  NIGHT.look(Q, K); await NIGHT.beat(350);
  await SCENE.talk([[Q, "Your turn."]]);
  Q.act('Interact'); await NIGHT.beat(800); await K.undress('outer'); AUDIO.sfx('sheets', { gain: 0.8 }); await NIGHT.beat(400);
  await SCENE.talk([[K, "Your hands are cold."], [Q, "Then warm them."]]);
  K.act('Interact'); Q.act('Interact'); await NIGHT.beat(700);
  await Q.undress('all'); await K.undress('all'); K.setArousal(0.25); AUDIO.sfx('sheets', { gain: 1 }); await NIGHT.beat(700);
  await SCENE.talk([[K, "Gods, Halina."], [Q, "Thirteen years, and you still look at me like that."], [K, "Thirteen years, and you still let me."]]);
  // she ties the bed curtains back to the posts, he takes the other side
  const qc = NIGHT.walk(Q, -8.72), kc = NIGHT.walk(K, -6.62); await Promise.all([qc, kc]);
  Q.lookYaw = Math.PI * 0.9; K.lookYaw = Math.PI * 0.9; Q.act('Interact'); K.act('Interact');
  NIGHT.say(Q, "Leave them open. I want the firelight."); AUDIO.sfx('sheets', { gain: 0.6 });
  await NIGHT.tween(1.3, (u) => BEDROOM.tieBack(u)); await NIGHT.beat(500);
  await Promise.all([NIGHT.walk(Q, -8.0), NIGHT.walk(K, -7.4)]); NIGHT.look(Q, K); NIGHT.look(K, Q); await NIGHT.beat(300);
  // into bed: one sprite for both bodies from here on, box widened to the whole bed, card slid forward of the pillows
  K.reframe(3.9, 2.5); K.frame = new THREE.Vector3(-7.7, 1.5, LOVERS.BED.zc); K.cardDz = 1.6; Q.hostInto(K);
  NIGHT.camMode = 'bed'; NIGHT.lensT = 1; AUDIO.sfx('sheets', { gain: 1 }); AUDIO.sfx('creak', { gain: 0.6, delay: 0.6 });
  NIGHT.tween(2.2, (u) => { K.cardDz = lerp(1.6, LOVERS.BED.zc + 0.82 - LOVERS.BED.zc, u); });
  await NIGHT.drive('kiss', 2.1, 0.34);
  NIGHT.inBed = true; NIGHT.lineT = 5;
  NIGHT.scripted = true; for (const [w, t] of NIGHT.ENTER.kiss) await NIGHT.say(w === 'K' ? K : Q, t, 200); NIGHT.scripted = false;
  NIGHT.setPace(1); NIGHT.posBar(); $('nView').textContent = NIGHT.closer ? 'Wider' : 'Closer'; NIGHT.bar(['pos', 'pace']);
  if (o.pos) NIGHT.to(o.pos);
  await NIGHT.done;
};
NIGHT.finish = async function () {
  if (NIGHT.finishing || NIGHT.busy || !NIGHT.inBed) return;
  const K = NIGHT.A.K, Q = NIGHT.A.Q; NIGHT.bar([]); NIGHT.scripted = true;
  if (NIGHT.pos !== 'kiss') {   // the end of it: faster, then held deep, then still
    NIGHT.finishing = true; NIGHT.k = Math.max(NIGHT.k, 0.85); NIGHT.pace = Math.max(NIGHT.pace, 1.5);
    await NIGHT.say(Q, "Don't stop. Don't you dare stop.", 900); await NIGHT.say(K, "Halina—", 700);
    NIGHT.hold = true; NIGHT.ph = Math.ceil(NIGHT.ph / (Math.PI * 2)) * Math.PI * 2 + 0.38 * Math.PI * 2;
    AUDIO.sfx('breath', { gain: 0.9, pitch: 1500, dur: 1.4 }); AUDIO.sfx('breath', { gain: 0.6, pitch: 620, dur: 1.2, delay: 0.3 });
    await NIGHT.say(Q, "Oh— gods, yes—", 1400); await NIGHT.beat(1200);
    NIGHT.hold = false; NIGHT.finishing = false;
  } else await NIGHT.say(Q, "Just hold me, then.", 300);
  AUDIO.sfx('sheets', { gain: 0.9 }); await NIGHT.drive('after', 2.4, 0.08); NIGHT.k = 0.2;
  await SCENE.talk([[Q, "Mm. Now you can tell me about the rain."], [K, "Tomorrow."], [Q, "You always say tomorrow."], [K, "And you always ask. Stay."], [Q, "Where else would I go? Sleep, my king."]]);
  await NIGHT.beat(1200); NIGHT.scripted = false; await NIGHT.end(true);
};
NIGHT.end = async function (slept) {
  const room = BEDROOM, K = NIGHT.A.K, Q = NIGHT.A.Q, c0 = NIGHT.cam0;
  NIGHT.bar([]); await NIGHT.fade(true);
  NIGHT.lensT = 0; NIGHT.lensK = 0; BEDROOM.lens(0);   // behind the fade: the foreground props are back
  NIGHT.inBed = false; NIGHT.camMode = 'room'; Object.assign(room.cam, { fov: c0.fov, y: c0.y, look: c0.look }); room.camFocus = c0.focus; room.focusDz = 0;
  POSE.release(K); POSE.release(Q); Q.hostInto(null); K.frame = null; K.reframe(); K.cardDz = 0;
  K.dress(); Q.dress(); K.setArousal(0); BEDROOM.tieBack(0); room.setNight(false);
  Q.setVisible(false); Q.spec.idle = NIGHT.keep.idle; Q.curHome = NIGHT.keep.home; Q.baseY = Q.y = NIGHT.keep.baseY;
  K.stand(); K.x = -6.4; K.z = room.KZ; K.y = 0; K.face = 1; K.yaw = 0.42; K.lookYaw = null;
  const i = room.tick.indexOf(NIGHT.tick); if (i >= 0) room.tick.splice(i, 1);
  NIGHT.tweens = []; NIGHT.on = false; SCENE.camX = SCENE.camGoal(); SCENE.lock--;
  if (slept) SCENE.caption('Morning', 'Halina rose before you. Her side of the bed is still warm.');
  await NIGHT.fade(false); if (NIGHT.resolve) NIGHT.resolve();
};
/* ---------------------------------------------------------------- what they say in bed: lines on entering a position,
   then passing remarks by how far gone they are (k < 0.35, < 0.7, beyond) */
NIGHT.ENTER = {
  kiss: [['Q', "Slowly. We have all night for once."]],
  missionary: [['Q', "Lie on me. I want your weight."], ['K', "Like this?"], ['Q', "Exactly like this."]],
  ride: [['Q', "On your back, my king. Tonight I rule."], ['K', "Gods help the realm."]],
  behind: [['Q', "Like the night after the coronation. Remember?"], ['K', "I've never forgotten."]]
};
NIGHT.LINES = {
  kiss: [[['Q', "Mm."], ['K', "You taste of wine."], ['Q', "Touch me."]], [['Q', "Your hands... yes, there."], ['K', "You're shaking."]], [['Q', "I can't wait any more."], ['K', "Then don't."]]],
  missionary: [[['Q', "Slow... like that."], ['K', "Look at me."], ['Q', "Deeper."]], [['Q', "Oh— yes."], ['K', "Halina..."], ['Q', "Harder. Please."]], [['Q', "Don't stop— don't stop—"], ['K', "Gods, you feel—"], ['Q', "Fill me."]]],
  ride: [[['Q', "Hold still. Let me."], ['K', "You're beautiful like this."]], [['Q', "Mm— there— right there."], ['K', "Ride me, love."]], [['Q', "I'm close— I'm so close—"], ['K', "Take it. All of it."]]],
  behind: [[['Q', "Hold my hips."], ['K', "Like this?"]], [['Q', "Harder— yes—"], ['K', "That's it."]], [['Q', "Oh gods— don't stop—"], ['K', "Halina—"]]],
  after: [[['Q', "Mm."]]]
};

