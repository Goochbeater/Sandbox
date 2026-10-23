/* THE CONFESSIONAL — an adult scene in the chapel, standing: the king takes Saintess Dorota from behind, bent over the
   confessor's desk beside the box. 18+ only: NIGHT.confirm (the age gate) comes first. Dorota is twenty-nine, a widow of the
   lower town who took the veil and kept her hair. The scene reuses the night's machinery rather than copying it: the age
   gate and the choices (NIGHT.confirm, NIGHT.ask), the strip and its pace (NIGHT.bar, NIGHT.setPace), undressing
   (Actor.undress / makeBare, engine/e05 + e13), the rhythm and the pins (LOVERS.stroke, LOVERS.entry, LOVERS.rod, g27),
   POSE.drive (engine/e14) and the night's sounds. Only the standing pose is new. As in the bed, both bodies are drawn in
   the king's sprite, so where they touch they overlap correctly. The king says only what the player chooses. */
const CONF = { on: false, ph: 0, k: 0, finishing: false, hold: false, scripted: false, inPose: false, lineT: 5, brT: 1,
  DESK: { x0: 10.0, x1: 10.9, top: 1.1, zc: 2.2 } };
CONF.LINES = [
  ['Slowly. The desk is old, and so am I.', 'Mm. Yes. Like that, Your Grace.'],
  ['Oh— there. Don’t be gentle with the saints.', 'Don’t stop. The Mother is looking the other way.'],
  ['Don’t stop. Mother forgive me, don’t stop.', 'Now— please, now—']
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
/* the strip under the picture: the pace, and how it ends */
CONF.bar = function () {
  const row = $('nPos'); row.innerHTML = '';
  const add = (t, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = t; b.onclick = (e) => { e.stopPropagation(); fn(); }; row.append(b); };
  add('Finish her', () => CONF.finish()); add('Let her go', () => CONF.end(false));
  NIGHT.setPace(1); $('nView').hidden = true; $('nFinish').hidden = true; NIGHT.bar(['pos', 'pace']);   // the bed's camera and finish don't apply here
};
CONF.start = function () { if (CONF.on || SCENE.lock || CUT.playing) return; NIGHT.confirm(() => CONF.play().catch(fail)); };
CONF.play = async function () {
  const room = CHAPEL, K = SCENE.player, Q = CAST.A.dorota;
  if (SCENE.room !== room || CONF.on) return;
  CONF.on = true; CONF.A = { K, Q }; CONF.ph = 0; CONF.k = 0; CONF.finishing = false; CONF.hold = false; CONF.inPose = false; CONF.lineT = 5; CONF.brT = 1;
  SCENE.lock++;
  await NIGHT.fade(true);
  await Promise.all([K.makeBare(), Q.makeBare()]);
  const zc = CONF.DESK.zc;
  K.stand(); K.target = null; K.x = 8.0; K.z = zc; K.face = 1; K.lookYaw = null; K.yaw = 0.42;
  Q.stand(); Q.x = 9.3; Q.z = zc; Q.face = 1; Q.lookYaw = null; Q.yaw = 0.42; Q.setVisible(true);
  room.tick.push(CONF.tick);
  SCENE.camX = SCENE.camGoal(); SCENE.render();
  await NIGHT.fade(false);
  // the box is a poor screen; she leads him round to the desk
  await SCENE.talk([[Q, 'Not in the box, Your Grace. The lattice has ears. Come round the back of the desk.']]);
  if (await NIGHT.ask(['Take her where she stands', 'Leave her be']) === 1) {
    await SCENE.talk([[Q, 'Then pray for me, and go before the bells.']]);
    return CONF.end(false);
  }
  await SCENE.talk([[Q, 'Undo my laces. Slowly. I am a saintess, and nobody has ever undone me.']]);
  Q.act('Interact'); await NIGHT.beat(500);
  await Q.undress('outer'); AUDIO.sfx('sheets', { gain: 0.6 }); await NIGHT.beat(400);
  await K.undress('outer'); AUDIO.sfx('sheets', { gain: 0.6 }); await NIGHT.beat(400);
  await Q.undress('all'); await K.undress('all'); K.setArousal(0.25); AUDIO.sfx('sheets', { gain: 0.8 }); await NIGHT.beat(500);
  // she bends over the desk and he takes her hips: one sprite for both, widened to take in the desk's end
  K.reframe(3.0, 2.4); K.frame = new THREE.Vector3(9.7, 1.2, zc); K.cardDz = 0.4; Q.hostInto(K);
  await CONF.drive(1.8);
  CONF.inPose = true; CONF.lineT = 4; CONF.bar();
  SCENE.say(Q, 'Hold my hips. Hold them like you mean it.');
};
CONF.finish = async function () {
  if (CONF.finishing || !CONF.on) return;
  CONF.finishing = true; NIGHT.bar([]); CONF.scripted = true;
  CONF.k = Math.max(CONF.k, 0.85); NIGHT.pace = Math.max(NIGHT.pace, 1.5);
  await NIGHT.say(CONF.A.Q, 'Don’t you dare stop.', 900);
  CONF.hold = true; AUDIO.sfx('breath', { gain: 0.9, pitch: 1500, dur: 1.4 });
  await NIGHT.say(CONF.A.Q, 'Oh— gods, yes—', 1400); await NIGHT.beat(1200);
  CONF.hold = false; CONF.scripted = false;
  await SCENE.talk([[CONF.A.Q, 'Mm. Now you can make your confession, Your Grace. Quietly.']]);
  await CONF.end(true);
};
/* back to the nave: the bodies are handed back to the clips and dressed, the saintess to her place at the rail */
CONF.end = async function (finished) {
  const room = CHAPEL, K = CONF.A.K, Q = CONF.A.Q;   // also when turned down before undressing: they are put back the same way
  NIGHT.bar([]); $('nView').hidden = false; $('nFinish').hidden = false; await NIGHT.fade(true);
  POSE.release(K); POSE.release(Q); Q.hostInto(null); K.frame = null; K.reframe(); K.cardDz = 0;
  K.dress(); Q.dress(); K.setArousal(0);
  Q.stand(); Q.x = 1.8; Q.z = 2.2; Q.face = -1; Q.yaw = -0.42; Q.lookYaw = null; Q.baseY = Q.y = 0; Q.setVisible(true);
  K.stand(); K.x = 7.9; K.z = room.KZ; K.y = 0; K.face = 1; K.yaw = 0.42; K.lookYaw = null;
  const i = room.tick.indexOf(CONF.tick); if (i >= 0) room.tick.splice(i, 1);
  CONF.on = false; CONF.inPose = false; CONF.finishing = false; CONF.hold = false; CONF.scripted = false;
  SCENE.camX = SCENE.camGoal(); SCENE.lock--;
  await NIGHT.fade(false);
};
