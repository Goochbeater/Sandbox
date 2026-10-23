/* THE CONFESSIONAL — an adult scene in the chapel, standing: the king takes Saintess Dorota from behind, bent over the
   confessor's desk in the alcove behind the confession screen. 18+ only: NIGHT.confirm (the age gate) comes first. Dorota
   is twenty-nine, a widow of the lower town who took the veil and kept her hair. She is a saint to the town and, to the king,
   a filthy one; the talk is crude on purpose.
   The scene reuses the night's machinery rather than copying it: the age gate and the choices (NIGHT.confirm, NIGHT.ask),
   the strip and its pace (NIGHT.bar, NIGHT.setPace), undressing (Actor.undress / makeBare, engine/e05 + e13), the rhythm
   and the pins (LOVERS.stroke, LOVERS.entry, LOVERS.rod, g27), POSE.drive (engine/e14) and the night's sounds. Only the
   walk, the standing pose and the talk are new. Each body has its own sprite. The king says only what the player picks. */
const CONF = { on: false, ph: 0, k: 0, finishing: false, hold: false, scripted: false, inPose: false, lineT: 5, brT: 1,
  DESK: { x0: 10.0, x1: 10.9, top: 1.1, zc: 2.2 },
  HIDE: ['queen', 'priest', 'cguardL', 'cguardR'] };   // the nave's people: they can't see past the confession screen
CONF.TALK = {
  first: 'Not in the box, Your Grace. The lattice has ears, and the lower town has never once seen what the saint does with her hands. Come round the back of the desk.',
  take: 'Take her where she stands', leave: 'Leave her be',
  leaveLine: 'Then pray for me, you filthy king, and go before the bells.',
  undress: 'Undo my laces, you bastard. Slowly. The whole town thinks nobody has ever unlaced me.',
  pose: 'Grab my hips and hold them like you own them. You do, you know.',
  options: [
    'You’re the holiest cunt in Lodmir, and I’m going to ruin it.',
    'Beg for it, saint. Tell me what a dirty little whore you are.',
    'Shut your mouth and take it like the sinner you are.'
  ],
  replies: [
    'Then ruin it, Your Grace. Nobody in the lower town has ever been this filthy in church.',
    'Please, Your Grace. I’m a whore for the king, and on Sunday nobody will ever know.',
    'Make me. The Mother can watch. She’s heard worse from my confessor.'
  ],
  finish: ['Don’t you dare stop, you bastard.', 'Oh fuck— gods, yes—'],
  close: 'Mm. Now go and confess that to the Mother, you filthy king.'
};
CONF.LINES = [
  ['The lower town thinks I’m the holiest woman in Lodmir. Look at me now, bent over a confessor’s desk for a king.', 'Mm. Slow, Your Grace. I’m a saint, not a whore. Not yet.'],
  ['Oh— fuck, there. Right there. Don’t you dare be gentle with the saint.', 'The town says I’ve never been touched. Touch me like they’re right about that.'],
  ['Harder. Fill this holy cunt, you bastard, and tell the Mother it was your idea.', 'I’m your freak, Radomir. Your dirty little saint. Don’t you dare stop.']
];
/* the standing pose from behind: she bends over the desk with her hands flat on its top, her back level, her belly toward
   the desk; he stands behind her with his hands on her hips. Her entry is the point his pelvis is pinned to, so each
   stroke moves him in and out. The scene is staged in profile: she faces the desk (+x), he is behind her (-x). */
CONF.pose = function (name, ph, k, A) {
  const S = LOVERS.stroke(ph), zc = CONF.DESK.zc, Q = A.Q, K = A.K, W = (o) => Object.assign({ world: true }, o);
  const depth = lerp(0.035, 0.118, S) * (0.85 + 0.15 * k);
  const pinK = (a) => LOVERS.entry(Q, LOVERS._a).sub(LOVERS.rod(a, depth, LOVERS._b));   // move him onto her
  const hip = (sd) => LOVERS.at(Q, 'pelvis', [sd * 0.15, 0.97, -0.03]);                    // his hands on her hips
  const hand = (sd) => [10.45, CONF.DESK.top + 0.03, zc + sd * 0.14];                       // her hands flat on the desk
  return {
    queen: W({ at: [9.3, 0.95, zc], up: [0.968, 0.25, 0], fwd: [0.25, -0.968, 0], head: [[0.7, 0.7, 0], [0.9, -0.45, 0]],
      armL: { ik: hand(1), pole: [-0.3, -1, 0] }, armR: { ik: hand(-1), pole: [-0.3, -1, 0] },
      legL: [[0, -1, 0], [0, -1, 0]], legR: [[0, -1, 0], [0, -1, 0]] }),
    king: W({ at: [9.05, 0.95, zc], up: [0.05, 1, 0], fwd: [1, -0.05, 0],
      armL: { ik: hip(1), pole: [-0.3, -0.2, 1] }, armR: { ik: hip(-1), pole: [-0.3, -0.2, -1] },
      legL: [[0, -1, 0], [0, -1, 0]], legR: [[0, -1, 0], [0, -1, 0]], pin: pinK })
  };
};
CONF.drive = function (dur) {
  const A = CONF.A, f = (who) => () => CONF.pose('behind', CONF.ph, CONF.k, A)[who];
  return Promise.all([POSE.drive(A.K, f('king'), dur, { lift: 0.04 }), POSE.drive(A.Q, f('queen'), dur, { lift: 0.04 })]);
};
/* the walk: one straight leg at a time, the way the court walks petitioners up to the dais */
CONF.glide = (a, p) => new Promise((r) => a.moveTo3(Object.assign({ y: 0, speed: 1.25 }, p), r));
CONF.walk = async function (a, pts) { for (const p of pts) await CONF.glide(a, p); };
/* the rhythm, the breath and the sounds: the same as the bed's, without the bed's camera */
CONF.tick = function (t, dt) {
  if (!CONF.on || !CONF.inPose) return;
  const K = CONF.A.K, Q = CONF.A.Q;
  const rate = CONF.hold ? 0 : 3.4 * NIGHT.pace * (CONF.finishing ? 1.35 : 1);
  const S0 = LOVERS.stroke(CONF.ph); CONF.ph += rate * dt; const S1 = LOVERS.stroke(CONF.ph);
  if (!CONF.finishing) CONF.k = Math.min(1, CONF.k + dt * 0.012 * NIGHT.pace);
  const k = CONF.k, ar = K.arousal || 0; K.setArousal(ar + clamp(0.8 - ar, -dt * 0.08, dt * 0.4));
  const pan = clamp((K.x - R.cam.position.x) / 10, -0.8, 0.8);
  if (S0 < 0.9 && S1 >= 0.9) {   // the deep end of every stroke
    AUDIO.sfx('skin', { gain: 0.22 + 0.3 * k * Math.min(1.4, NIGHT.pace), pan });
    if (Math.random() < 0.35 + 0.3 * k) AUDIO.sfx('creak', { gain: 0.5 + 0.4 * NIGHT.pace, pan, delay: 0.04 });
  }
  CONF.brT -= dt;
  if (CONF.brT <= 0) { const her = Math.random() < 0.65; CONF.brT = lerp(2.2, 0.75, k) / Math.sqrt(NIGHT.pace) * (0.8 + Math.random() * 0.4);
    AUDIO.sfx('breath', { gain: (her ? 0.34 : 0.24) + 0.36 * k, pitch: her ? 1150 + Math.random() * 450 : 640 + Math.random() * 200, dur: lerp(0.75, 0.45, k), pan }); }
  CONF.lineT -= dt;
  if (CONF.lineT <= 0 && !SCENE.bubble && !CONF.scripted) {
    const band = k < 0.35 ? 0 : k < 0.7 ? 1 : 2;
    SCENE.say(Q, SCENE.cycle('conf' + band, CONF.LINES[band])); CONF.lineT = lerp(7.5, 4.2, k) * (0.8 + Math.random() * 0.5);
  }
};
/* between the rhythm, now and then: the player picks what the king says, and she answers (the king speaks only what was
   picked). The pace strip comes back after each exchange. */
CONF.askLoop = async function () {
  const T = CONF.TALK;
  while (CONF.on && CONF.inPose && !CONF.finishing) {
    await NIGHT.beat(lerp(11000, 6000, CONF.k));
    if (!CONF.on || !CONF.inPose || CONF.finishing) break;
    CONF.scripted = true;
    const i = await NIGHT.ask(T.options);
    CONF.scripted = false;
    if (!CONF.on || !CONF.inPose) break;
    CONF.k = Math.min(1, CONF.k + 0.05);   // filthy talk gets her going
    await SCENE.talk([[CONF.A.K, T.options[i]], [CONF.A.Q, T.replies[i]]]);
    CONF.bar();
  }
};
/* the strip under the picture: the pace, and how it ends */
CONF.bar = function () {
  const row = $('nPos'); row.innerHTML = '';
  const add = (t, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = t; b.onclick = (e) => { e.stopPropagation(); fn(); }; row.append(b); };
  add('Finish her', () => CONF.finish()); add('Let her go', () => CONF.end(false));
  NIGHT.setPace(1); $('nView').hidden = true; $('nFinish').hidden = true; NIGHT.bar(['pos', 'pace']);   // the bed's camera and finish don't apply here
};
CONF.start = function () { if (CONF.on || SCENE.lock || CUT.playing) return; NIGHT.confirm(() => CONF.play().catch(fail)); };
CONF.play = async function () {
  const room = CHAPEL, K = SCENE.player, Q = CAST.A.dorota, T = CONF.TALK;
  if (SCENE.room !== room || CONF.on) return;
  CONF.on = true; CONF.A = { K, Q }; CONF.ph = 0; CONF.k = 0; CONF.finishing = false; CONF.hold = false; CONF.inPose = false; CONF.lineT = 5; CONF.brT = 1;
  SCENE.lock++; room.tick.push(CONF.tick);
  // in the nave, at the rail: she tells him where to go
  Q.stand(); K.stand(); K.target = null;
  await SCENE.talk([[Q, T.first]]);
  if (await NIGHT.ask([T.take, T.leave]) === 1) { await SCENE.talk([[Q, T.leaveLine]]); return CONF.end(false); }
  // the people in the nave can't see past the confession screen: they're out of the scene for its length
  for (const id of CONF.HIDE) CAST.A[id].setVisible(false);
  // she walks round the end of the screen to the desk, and he follows her in behind her
  await CONF.walk(Q, [{ x: 4.2, z: 3.0 }, { x: 8.5, z: 3.0 }, { x: 9.3, z: CONF.DESK.zc }]);
  await CONF.walk(K, [{ x: 9.4, z: 3.0 }, { x: 8.0, z: CONF.DESK.zc }]);
  // the alcove goes dark but for the candle on the desk (and his light)
  await NIGHT.fade(true); CHAPEL.dim(true);
  await Promise.all([K.makeBare(), Q.makeBare()]);
  K.stand(); Q.stand(); K.face = 1; Q.face = 1; K.lookYaw = null; Q.lookYaw = null;
  await NIGHT.fade(false);
  await SCENE.talk([[Q, T.undress]]);
  Q.act('Interact'); await NIGHT.beat(500);
  await Q.undress('outer'); AUDIO.sfx('sheets', { gain: 0.6 }); await NIGHT.beat(400);
  await K.undress('outer'); AUDIO.sfx('sheets', { gain: 0.6 }); await NIGHT.beat(400);
  await Q.undress('all'); await K.undress('all');
  if (K.sexGroup) K.sexGroup.visible = false;   // the scene shows no genitals: the pin reads world positions, which still update when hidden
  K.setArousal(0.25); AUDIO.sfx('sheets', { gain: 0.8 }); await NIGHT.beat(500);
  // each body keeps its own sprite, widened to take in the reach (his hands at her hips, hers on the desk), so both read
  // her card stays in front (the frame that read well): he is behind her in profile, and his body shows only where it isn't hidden by hers
  K.hostInto(null); K.reframe(2.0, 2.4); K.frame = new THREE.Vector3(8.9, 1.2, CONF.DESK.zc); K.cardDz = 0.05;
  Q.hostInto(null); Q.reframe(2.6, 2.4); Q.frame = new THREE.Vector3(9.75, 1.2, CONF.DESK.zc); Q.cardDz = 0.1;
  await CONF.drive(1.8);
  CONF.inPose = true; CONF.lineT = 4; CONF.bar();
  SCENE.say(Q, T.pose);
  CONF.askLoop().catch(fail);
};
CONF.finish = async function () {
  if (CONF.finishing || !CONF.on) return;
  const T = CONF.TALK;
  CONF.finishing = true; NIGHT.bar([]); CONF.scripted = true;
  CONF.k = Math.max(CONF.k, 0.85); NIGHT.pace = Math.max(NIGHT.pace, 1.5);
  await NIGHT.say(CONF.A.Q, T.finish[0], 900);
  CONF.hold = true; AUDIO.sfx('breath', { gain: 0.9, pitch: 1500, dur: 1.4 });
  await NIGHT.say(CONF.A.Q, T.finish[1], 1400); await NIGHT.beat(1200);
  CONF.hold = false; CONF.scripted = false;
  await SCENE.talk([[CONF.A.Q, T.close]]);
  await CONF.end(true);
};
/* back to the nave: the bodies are handed back to the clips and dressed, the saintess to her place at the rail, and the
   people in the nave come back into view */
CONF.end = async function (finished) {
  const room = CHAPEL, K = CONF.A ? CONF.A.K : SCENE.player, Q = CONF.A ? CONF.A.Q : CAST.A.dorota;
  NIGHT.bar([]); $('nView').hidden = false; $('nFinish').hidden = false; await NIGHT.fade(true);
  CHAPEL.dim(false);
  POSE.release(K); POSE.release(Q); K.frame = null; K.reframe(); K.cardDz = 0; Q.frame = null; Q.reframe(); Q.cardDz = 0; Q.hostInto(null); K.hostInto(null);
  K.dress(); Q.dress(); K.setArousal(0);
  Q.stand(); Q.x = 1.8; Q.z = 2.2; Q.face = -1; Q.yaw = -0.42; Q.lookYaw = null; Q.baseY = Q.y = 0; Q.setVisible(true);
  K.stand(); K.x = 7.9; K.z = room.KZ; K.y = 0; K.face = 1; K.yaw = 0.42; K.lookYaw = null;
  for (const id of CONF.HIDE) CAST.A[id].setVisible(true);
  const i = room.tick.indexOf(CONF.tick); if (i >= 0) room.tick.splice(i, 1);
  CONF.on = false; CONF.inPose = false; CONF.finishing = false; CONF.hold = false; CONF.scripted = false;
  SCENE.camX = SCENE.camGoal(); SCENE.lock--;
  await NIGHT.fade(false);
};
