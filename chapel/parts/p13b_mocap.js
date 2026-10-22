/* MOCAP — motion-capture clips (Quaternius Universal Animation Library, CC0) layered onto the 19-bone logical rig.
   A frame = world rotations of the 19 logical bones (the D of their Q joints, which apply to any T-pose rig) plus a
   pelvis offset normalised by the clip's pelvis height. Every actor runs a locomotion blend (idle / walk / jog / sprint,
   phase-synced; hips turned toward the travel direction for strafes, played backwards for back-pedalling) under one-shot
   action clips. ANIM.apply mixes the frame in per bone group:
     body — trunk + legs + any FREE arm from the clip, weapon arms stay on the prop IK;
     full — the clip drives both arms and the weapon rides the hand (sword attacks, reactions without a weapon). */
const MOCAP = { ready: false };
const _v6 = new THREE.Vector3(), _v7 = new THREE.Vector3(), _v8 = new THREE.Vector3();
class MoFrame {
  constructor() { this.q = []; for (let i = 0; i < 19; i++) this.q.push(new THREE.Quaternion()); this.p = new THREE.Vector3(); }
  copy(o) { for (let i = 0; i < 19; i++) this.q[i].copy(o.q[i]); this.p.copy(o.p); return this; }
  mix(o, w) { if (w <= 0.0001) return this; if (w >= 0.9999) return this.copy(o); for (let i = 0; i < 19; i++) this.q[i].slerp(o.q[i], w); this.p.lerp(o.p, w); return this; }
}
MOCAP.PARENT = [-1, 0, 1, 2, 3, 2, 5, 6, 7, 2, 9, 10, 11, 0, 13, 14, 0, 16, 17];
MOCAP.MIR = [0, 1, 2, 3, 4, 9, 10, 11, 12, 5, 6, 7, 8, 16, 17, 18, 13, 14, 15];
MOCAP.LOCO = ['Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'];
MOCAP.V = [1.0, 3.4, 5.8];          // ground speed of each locomotion clip (m/s), measured from the clips' stance feet
/* clip sets per fighter family: the idle each base pose maps to (null = keyframed only), whether free arms follow the clip */
MOCAP.SETS = {
  maul: { base: { guard: 'Sword_Idle', run: 'Sword_Idle', idleCalm: 'Idle_Loop' }, arms: true, stance: 0.5, upright: 0.86 },
  jedi: { base: { guard: 'Sword_Idle', run: 'Sword_Idle' }, arms: true, stance: 0.55, upright: 0.4 },
  trooper: { base: { idle: 'Idle_Loop', run: 'Idle_Loop', aim: 'Pistol_Idle_Loop' }, arms: true },
  melee: { base: { idle: 'Sword_Idle', run: 'Sword_Idle' }, arms: true, stance: 0.6 },
  brawler: { base: { idle: 'Sword_Idle', run: 'Sword_Idle' }, arms: false, stance: 0.6 },
};
MOCAP.init = function () {
  if (MOCAP.ready) return true;
  if (!QB.ready) return false;
  MOCAP.J = QB.MAP.map((n) => QB.idx[n]);
  // phase offset of each loop: the frame where the left foot is furthest forward (heel strike) becomes phase 0
  const Jn = QB.joints('male', 1), f = new MoFrame(), v = new THREE.Vector3();
  const kneeOff = new THREE.Vector3(...V.sub(Jn.knee, Jn.hip)), ankOff = new THREE.Vector3(...V.sub(Jn.ankle, Jn.knee));
  MOCAP.PH0 = {};
  for (const n of MOCAP.LOCO.concat(['Crouch_Fwd_Loop'])) { const c = QB.clips[n]; if (!c) continue; let best = -9, bi = 0;
    for (let i = 0; i < c.nf - 1; i++) { MOCAP.sample(n, i / 30, true, f); const z = v.copy(kneeOff).applyQuaternion(f.q[13]).z + _v5.copy(ankOff).applyQuaternion(f.q[14]).z; if (z > best) { best = z; bi = i; } }
    MOCAP.PH0[n] = bi / (c.nf - 1); }
  MOCAP.moveSpecs();
  MOCAP.ready = true; return true;
};
MOCAP._a = new THREE.Quaternion(); MOCAP._b = new THREE.Quaternion();
/* sample a clip at time t (s) into a MoFrame; mirror swaps left and right */
MOCAP.sample = function (name, t, loop, out, mirror) {
  const c = QB.clips[name], nf = c.nf; let fr = t * 30;
  if (loop) fr = ((fr % (nf - 1)) + (nf - 1)) % (nf - 1); else fr = Math.max(0, Math.min(nf - 1, fr));
  const i0 = Math.floor(fr), i1 = Math.min(nf - 1, i0 + 1), u = fr - i0, D = c.Dq, NB = QB.NB, s = 1 / 32767, a = MOCAP._a, b = MOCAP._b, J = MOCAP.J;
  for (let i = 0; i < 19; i++) {
    const k = J[i], o0 = (i0 * NB + k) * 4, o1 = (i1 * NB + k) * 4;
    a.set(D[o0] * s, D[o0 + 1] * s, D[o0 + 2] * s, D[o0 + 3] * s); b.set(D[o1] * s, D[o1 + 1] * s, D[o1 + 2] * s, D[o1 + 3] * s);
    a.slerp(b, u).normalize();
    if (mirror) out.q[MOCAP.MIR[i]].set(a.x, -a.y, -a.z, a.w); else out.q[i].copy(a);
  }
  const P = c.Pp, h = 1 / c.pelvisH;
  out.p.set((P[i0 * 3] + (P[i1 * 3] - P[i0 * 3]) * u) * h, (P[i0 * 3 + 1] + (P[i1 * 3 + 1] - P[i0 * 3 + 1]) * u) * h, (P[i0 * 3 + 2] + (P[i1 * 3 + 2] - P[i0 * 3 + 2]) * u) * h);
  if (mirror) out.p.x = -out.p.x;
  return out;
};
/* a move's clip: seq = [[clip, t0, t1, dur?], ...] played back to back over the move's duration (dur per segment
   defaults to its share of the move by clip length); a null clip holds the previous frame */
MOCAP.sampleSeq = function (spec, t, out) {
  const S = spec.seq; let acc = 0;
  for (let i = 0; i < S.length; i++) { const s = S[i], d = s[3]; if (t < acc + d || i === S.length - 1) { const u = clamp((t - acc) / d, 0, 1);
    if (s[0]) MOCAP.sample(s[0], s[1] + (s[2] - s[1]) * u, false, out, spec.mirror); else { const p = S[i - 1]; MOCAP.sample(p[0], p[2], false, out, spec.mirror); } return out; } acc += d; }
  return out;
};
/* per-instance state */
MOCAP.state = function (a) {
  const set = a.moves === MOV.maul ? 'maul' : a.moves === MOV.jedi ? 'jedi' : a.moves === MOV.trooper ? 'trooper' : a.moves === MOV.melee ? 'melee' : a.moves === MOV.brawler ? 'brawler' : null;
  if (!set) return null;
  const J = a.T.J;
  return { set: MOCAP.SETS[set], f: new MoFrame(), fb: new MoFrame(), fa: new MoFrame(), ft: new MoFrame(), from: new MoFrame(), xf: 1, xfDur: 0.12, key: '', fullFrom: 0, full: 0, prevT: 0, on: false, W: 0, phase: 0, idleT: rnd(0, 3),
    hipYaw: 0, back: false, wT: 0, wLeg: 0, wAL: 0, wAR: 0, wFull: 0, twoHand: 0, oR: 0, hipH: J.pelvis[1], lastSpec: null, chest: new THREE.Vector3(...J.chest) };
};
MOCAP._q = new THREE.Quaternion(); MOCAP._q2 = new THREE.Quaternion(); MOCAP._y = new THREE.Vector3(0, 1, 0);
/* Actor.animate hook: builds this frame's mocap pose + group weights */
MOCAP.actor = function (a, dt) {
  const mo = a.inst.mo; if (!mo) return;
  const set = mo.set, baseClip = set.base[a.base];
  // ---- locomotion blend under the base idle
  const sp = a.grounded ? a.speed : 0, V0 = MOCAP.V;
  const ang = sp > 0.35 ? Math.atan2(a.mvx || 0, a.mvz === undefined ? 1 : a.mvz) : 0;
  const back = sp > 0.35 && (mo.back ? Math.abs(ang) > 1.6 : Math.abs(ang) > 1.95);
  if (back !== mo.back) mo.back = back;
  const hy = back ? wrapA(ang - PI) : ang;
  mo.hipYaw = mo.hipYaw + wrapA(hy - mo.hipYaw) * Math.min(1, dt * 9);
  let w = [0, 0, 0, 0];                       // idle, walk, jog, sprint
  if (sp <= 0.05) w[0] = 1;
  else if (sp < V0[0]) { w[1] = sp / V0[0]; w[0] = 1 - w[1]; }
  else if (sp < V0[1]) { const u = (sp - V0[0]) / (V0[1] - V0[0]); w[1] = 1 - u; w[2] = u; }
  else if (sp < V0[2]) { const u = (sp - V0[1]) / (V0[2] - V0[1]); w[2] = 1 - u; w[3] = u; }
  else w[3] = 1;
  let rate = 0, ws = 0;
  for (let i = 1; i < 4; i++) if (w[i] > 0) { const c = QB.clips[MOCAP.LOCO[i - 1]]; rate += w[i] * (sp / V0[i - 1]) / c.dur; ws += w[i]; }
  if (ws > 0) mo.phase = ((mo.phase + (back ? -1 : 1) * dt * rate / ws) % 1 + 1) % 1;
  mo.idleT += dt;
  const fb = mo.fb;
  if (baseClip) MOCAP.sample(baseClip, mo.idleT, true, fb); else if (w[0] > 0) MOCAP.sample('Idle_Loop', mo.idleT, true, fb);
  let acc = w[0];
  for (let i = 1; i < 4; i++) if (w[i] > 0.001) { const n = MOCAP.LOCO[i - 1], c = QB.clips[n]; const ph = (mo.phase + (MOCAP.PH0[n] || 0)) % 1;
    MOCAP.sample(n, ph * c.dur, true, mo.ft); acc += w[i]; if (acc - w[i] <= 0.001) fb.copy(mo.ft); else fb.mix(mo.ft, w[i] / acc); }
  // travel direction: hips (and legs) turn toward it, the upper body turns most of the way back to the facing
  const hyw = mo.hipYaw * (1 - w[0]);
  if (Math.abs(hyw) > 0.01) {
    const k = clamp(hyw, -1.15, 1.15), qy = MOCAP._q.setFromAxisAngle(MOCAP._y, hyw);
    fb.p.applyQuaternion(qy);
    for (let i = 0; i < 19; i++) fb.q[i].premultiply(qy);
    const qc = MOCAP._q2.setFromAxisAngle(MOCAP._y, -k);
    for (let i = 2; i < 13; i++) fb.q[i].premultiply(qc);
    fb.q[1].premultiply(MOCAP._q2.setFromAxisAngle(MOCAP._y, -k * 0.5));
  }
  if (a.grounded) a.phase = mo.phase;
  // ---- action clip, cross-faded from whatever was showing when it (or the base) changed
  const c = a.act ? a.actClip : null, spec = c && c.mo;
  if (spec) MOCAP.sampleSeq(spec, a.actT * (spec.rate || 1), mo.fa);
  const key = spec ? a.act : 'base:' + baseClip, restart = spec && a.actT < mo.prevT - 1e-4; mo.prevT = spec ? a.actT : 0;
  const fullT = spec && spec.mode === 'full' ? 1 : 0;
  if (key !== mo.key || restart) { mo.from.copy(mo.f); mo.fullFrom = mo.full; mo.xf = 0; mo.xfDur = spec ? Math.max(0.05, a.fadeDur || 0.1) : Math.max(0.12, (c && c.fadeOut) || 0.16); mo.key = key; if (spec) { mo.twoHand = spec.twoHand || 0; mo.oR = spec.oR || 0; } }
  mo.xf = Math.min(1, mo.xf + dt / mo.xfDur); const e = easeIO(mo.xf);
  mo.f.copy(mo.from).mix(spec ? mo.fa : fb, e); mo.full = lerp(mo.fullFrom, fullT, e);
  // stand taller than the clip: keep the pelvis / spine turns, drop part of their forward and sideways tilt
  if (set.upright && !(spec && /knock|death|Fall/i.test(a.act))) for (let i = 0; i < 3; i++) { const q = mo.f.q[i], tw = MOCAP._tw.set(0, q.y, 0, q.w).normalize(); const sw = MOCAP._sw.copy(q).multiply(MOCAP._inv.copy(tw).invert());
    sw.slerp(MOCAP._id, set.upright * (i === 0 ? 1 : 0.8)); q.copy(sw).multiply(tw); }
  // ---- overall weight against the keyframed pose (keyed-only moves, unmapped bases, the air)
  const tgt = c ? (spec || c.moBase ? 1 : 0) : (set.base[a.base] !== undefined ? 1 : 0) * (a.grounded ? 1 : 0);
  const rw = tgt > mo.W ? 1 / Math.max(0.05, a.fadeDur || 0.1) : 1 / 0.12;
  mo.W = tgt > mo.W ? Math.min(tgt, mo.W + dt * rw) : Math.max(tgt, mo.W - dt * rw);
  mo.on = mo.W > 0.001;
  // the clips carry their own falls and turns: the keyed body flips / offsets fade out under them
  if (spec) { const k = 1 - mo.W * e; const P0 = a.pose; P0.flip *= k; P0.roll *= k; P0.off.multiplyScalar(k); }
  mo.lie = !!(spec && /knock|death|Fall/i.test(a.act));
  const P = a.pose, full = mo.full;
  mo.wT = mo.W; mo.wLeg = mo.W;
  const freeL = set.arms ? 1 - sat(P.gL) : 0, freeR = set.arms ? 1 - sat(P.gR) : 0;
  mo.wAL = mo.W * lerp(freeL, 1 - mo.twoHand, full); mo.wAR = mo.W * lerp(freeR, 1, full);
  mo.wFull = mo.W * full;
};
/* ------------------------------------------------------------------ ANIM.apply stages */
MOCAP._loc = new THREE.Quaternion(); MOCAP._inv = new THREE.Quaternion(); MOCAP._id = new THREE.Quaternion(); MOCAP._tw = new THREE.Quaternion(); MOCAP._sw = new THREE.Quaternion();
MOCAP.local = function (f, i, out) { const p = MOCAP.PARENT[i]; if (p < 0) return out.copy(f.q[i]); return out.copy(f.q[p]).invert().multiply(f.q[i]); };
MOCAP.ADD = [0.35, 0.35, 0.35, 1, 1];     // how much of the keyed trunk angles ride on top of the clip (head keeps full look-at)
MOCAP.trunk = function (inst, mo) {
  const B = inst.bones, w = mo.wT, L = MOCAP._loc, q = MOCAP._q2;
  for (let i = 0; i < 5; i++) { MOCAP.local(mo.f, i, L); q.copy(MOCAP._id).slerp(B[i].quaternion, MOCAP.ADD[i]); L.multiply(q); B[i].quaternion.slerp(L, w); }
  const r = B[0].userData.rest, sc = mo.hipH;
  // the sword clips crouch deep; keep only part of the drop (the legs are re-planted below, so the knees straighten)
  const drop = Math.min(0, mo.f.p.y * sc), k = mo.set.stance || 1, lift = mo.f.p.y < 0 && mo.f.p.y > -0.5 && !mo.lie ? -drop * (1 - k) : 0;
  mo.lift = lift * w;
  _v5.set(r.x + mo.f.p.x * sc, r.y + mo.f.p.y * sc + lift, r.z + mo.f.p.z * sc);
  B[0].position.lerp(_v5, w);
};
MOCAP._fq = new THREE.Quaternion(); MOCAP._ik = { elbow: new THREE.Vector3(), end: new THREE.Vector3(), qA: new THREE.Quaternion(), qB: new THREE.Quaternion() };
MOCAP.legs = function (inst, mo, opt, P, LD) {
  const B = inst.bones, w = mo.wLeg, L = MOCAP._loc;
  for (let i = 13; i < 19; i++) { MOCAP.local(mo.f, i, L); B[i].quaternion.slerp(L, w); }
  // plant on uneven ground: each ankle keeps its clip height above the ground under it
  const gy = opt.groundY; if (w < 0.5 || P.air > 0.5) return;
  const baseY = inst.root.position.y, lift = (mo.lift || 0) * (inst.scale || 1);
  if (!gy && lift < 0.005) return;
  for (const [a, b, f, rd] of [[13, 14, 15, LD.legL], [16, 17, 18, LD.legR]]) {
    B[f].updateWorldMatrix(true, false);
    const ank = B[f].getWorldPosition(_v1), g = gy ? gy(ank.x, ank.z) : null;
    let dy = -lift; if (g !== null && g !== undefined) dy += clamp(g - baseY, -0.35, 0.35);
    if (Math.abs(dy) < 0.006) continue;
    const fq = B[f].getWorldQuaternion(MOCAP._fq), S = B[a].getWorldPosition(_v2), K = B[b].getWorldPosition(_v3);
    const T0 = _v4.copy(ank); T0.y += dy;
    const pole = K.sub(_v6.copy(S).add(ank).multiplyScalar(0.5));
    IK.twoBone(B[a], B[b], S, T0, pole, rd, MOCAP._ik);
    B[f].updateWorldMatrix(true, false); IK.setWorldQ(B[f], fq);
  }
};
/* the weapon rides the torso: the keyed prop target moves with the clip's chest */
MOCAP.propFollow = function (inst, mo, hpW) {
  if (mo.wT <= 0) return;
  const c = inst.bones[2]; c.updateWorldMatrix(true, false);
  const cw = c.getWorldPosition(_v1), rest = _v2.copy(mo.chest).applyMatrix4(inst.inner.matrixWorld);
  hpW.addScaledVector(cw.sub(rest), mo.wT * (1 - mo.wFull));
};
MOCAP._hq = new THREE.Quaternion(); MOCAP._rx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
MOCAP.arms = function (inst, mo, P, LD) {
  const B = inst.bones, L = MOCAP._loc;
  if (mo.wAL > 0.001) for (let i = 5; i < 9; i++) { MOCAP.local(mo.f, i, L); B[i].quaternion.slerp(L, mo.wAL); }
  if (mo.wAR > 0.001) for (let i = 9; i < 13; i++) { MOCAP.local(mo.f, i, L); B[i].quaternion.slerp(L, mo.wAR); }
  const prop = inst.prop; if (!prop || mo.wFull < 0.001) return;
  // weapon in the right fist: blade along the thumb side of the grip (+Z of the rest hand)
  const sc = inst.scale || 1, hb = B[12]; hb.updateWorldMatrix(true, false);
  const hq = hb.getWorldQuaternion(MOCAP._hq), grip = hb.getWorldPosition(_v1).add(_v2.copy(LD.gripOffR).applyQuaternion(hq).multiplyScalar(sc));
  const axis = _v3.set(0, 0, 1).applyQuaternion(hq);
  const hp = grip.addScaledVector(axis, -mo.oR * sc), q = MOCAP._q.copy(hq).multiply(MOCAP._rx);
  prop.position.lerp(hp, mo.wFull); prop.quaternion.slerp(q, mo.wFull); prop.updateMatrixWorld(true);
  // off hand back onto the weapon
  if (mo.twoHand > 0.01) {
    const ax = _v3.set(0, 1, 0).applyQuaternion(prop.quaternion), tgt = _v4.copy(prop.position).addScaledVector(ax, (P.oL !== undefined ? P.oL : 0.13) * sc);
    const S = B[6].getWorldPosition(_v5), farmQ = MOCAP._q2;
    for (let it = 0; it < 2; it++) {
      B[7].getWorldQuaternion(farmQ); const zNow = _v6.set(0, 0, 1).applyQuaternion(farmQ); const a2 = _v7.copy(ax); if (inst.symProp && zNow.dot(a2) < 0) a2.negate();
      const qh = MOCAP._hq.setFromUnitVectors(zNow, a2).multiply(farmQ);
      const wristT = _v2.copy(LD.gripOffL).applyQuaternion(qh).multiplyScalar(-sc).add(tgt);
      const pole = _v8.set(0.5, -0.5, -1).applyQuaternion(inst.inner.getWorldQuaternion(MOCAP._fq)).normalize();
      IK.twoBone(B[6], B[7], S, wristT, pole, LD.armL, MOCAP._ik); IK.setWorldQ(B[8], qh);
    }
  }
};
/* clip-backed moves. Durations and hit windows follow the clips (windows from the baked hand-speed peaks). */
MOCAP.moveSpecs = function () {
  const seg = (c, t0, t1, d) => [c, t0, t1, d === undefined ? (t1 - t0) : d];
  const put = (set, name, spec, extra) => { const m = set && set[name]; if (!m) return; m.mo = spec; if (extra) Object.assign(m, extra); if (!spec.seq) return;
    const dur = spec.seq.reduce((s, x) => s + x[3], 0) / (spec.rate || 1); if (spec.fitDur) m.dur = dur; };
  // ---- Maul: a five-hit string cut from the sword combos (one-handed staff, held at its centre), the sprint lunge.
  // A move built from a clip: tc() converts clip time to move time; hit windows sit on the clips' hand-speed peaks.
  const clipMove = (set, name, clip, t0, t1, rate, o) => { const m = set[name]; if (!m) return; const tc = (t) => (t - t0) / rate;
    m.mo = { seq: [[clip, t0, t1, t1 - t0]], mode: 'full', rate, oR: o.oR || 0, twoHand: o.twoHand || 0 };
    m.dur = (t1 - t0) / rate; m.ev = o.ev.map((e) => [tc(e[0]), tc(e[1]), e[2], e[3], e[4]]); m.cancel = tc(o.cancel);
    if (o.move) m.move = o.move.map((q) => [tc(q[0]), q[1]]); if (o.impact !== undefined) m.impact = tc(o.impact); m.fadeOut = o.fadeOut || 0.22; };
  const M = MOV.maul;
  clipMove(M, 'a1', 'Sword_Regular_Combo', 0.0, 0.46, 1.4, { ev: [[0.14, 0.32, 3, 18, 'slash']], cancel: 0.33, move: [[0.06, 0], [0.28, 0.55]] });
  clipMove(M, 'a2', 'Sword_Regular_Combo', 0.46, 1.0, 1.4, { ev: [[0.6, 0.83, 3, 18, 'slash']], cancel: 0.84, move: [[0.52, 0], [0.76, 0.5]] });
  clipMove(M, 'a3', 'Sword_Regular_Combo', 1.0, 1.78, 1.32, { ev: [[1.02, 1.4, 3, 12, 'twirl'], [1.42, 1.69, 3, 14, 'slash']], cancel: 1.6, move: [[1.02, 0], [1.35, 0.45], [1.65, 0.8]] });
  // a4 (the spinning saberstaff cut) and a5 (the leaping slam) stay keyframed: Maul's signature moves have no mocap
  clipMove(M, 'lunge', 'Sword_Dash', 0.0, 0.9, 1.15, { ev: [[0.18, 0.42, 3, 26, 'thrust']], cancel: 0.66, move: [[0.1, 0], [0.4, 3.2]] });
  put(M, 'hit', { seq: [seg('Hit_Chest', 0, 0.33, 0.36)], mode: 'full' });
  for (const k of ['block', 'blockHi', 'deflectL', 'deflectR']) if (M[k]) M[k].moBase = true;
  // knock-down (shared by Maul and the Jedi): thrown flat, then back up; death: a real fall
  put(M, 'knock', { seq: [seg('Hit_Knockback', 0, 0.83, 0.55), seg('LayToIdle', 0.35, 1.53, 0.75)], mode: 'full' });
  put(M, 'death', { seq: [seg('Death01', 0, 2.1, 1.6)], mode: 'full' });
  // ---- Jedi: strikes with a slowed, readable wind-up (Maul's block reads the telegraph), then a fast mocap cut
  const J = MOV.jedi;
  if (J) {
    const strike = (name, segs, ev, move) => { const m = J[name]; if (!m) return; m.mo = { seq: segs, mode: 'full' }; m.dur = segs.reduce((a, x) => a + x[3], 0); m.ev = ev; if (move) m.move = move; m.fadeOut = 0.22; };
    strike('over', [seg('Sword_Attack', 0, 0.27, 0.45), seg('Sword_Attack', 0.27, 0.55, 0.28), seg('Sword_Attack', 0.55, 1.2, 0.42)], [[0.45, 0.68, 1, 16, 'jedi']], [[0.4, 0], [0.62, 0.7]]);
    strike('side', [seg('Sword_Regular_A', 0, 0.14, 0.36), seg('Sword_Regular_A', 0.14, 0.34, 0.2), seg('Sword_Regular_A_Rec', 0, 0.6, 0.38)], [[0.39, 0.54, 1, 14, 'jedi']], [[0.35, 0], [0.55, 0.5]]);
    strike('thrust', [seg('Sword_Dash', 0, 0.2, 0.42), seg('Sword_Dash', 0.2, 0.45, 0.25), seg('Sword_Dash', 0.45, 1.1, 0.36)], [[0.42, 0.66, 1, 18, 'jedi']], [[0.4, 0], [0.62, 1.6]]);
    put(J, 'hit', { seq: [seg('Hit_Chest', 0, 0.33, 0.42)], mode: 'full' });
    for (const k of ['blockMid', 'blockHi', 'blockLo', 'parry']) if (J[k]) J[k].moBase = true;
  }
  // ---- shared reactions (troopers, melee guards, brawlers): real flinches, knock-downs that get back up, deaths
  for (const set of [MOV.trooper, MOV.melee, MOV.brawler]) {
    if (!set) continue;
    put(set, 'hitL', { seq: [seg('Hit_Head', 0, 0.43, 0.46)], mode: 'body' });
    put(set, 'hitR', { seq: [seg('Hit_Chest', 0, 0.33, 0.34), seg(null, 0, 0, 0.12)], mode: 'body', mirror: true });
    put(set, 'hitSpin', { seq: [seg('Hit_Head', 0, 0.43, 0.42)], mode: 'body' });
    put(set, 'hitHeavy', { seq: [seg('Hit_Head', 0, 0.43, 0.45), seg('Hit_Chest', 0.1, 0.33, 0.4)], mode: 'body' });
    put(set, 'hit', { seq: [seg('Hit_Chest', 0, 0.33, 0.4)], mode: 'body' });
    if (set.knock) { const k = Object.assign({}, set.knock); set.knock = k;
      put(set, 'knock', { seq: [seg('Hit_Knockback', 0, 0.83, 0.7), seg(null, 0, 0, 0.35), seg('LayToIdle', 0, 1.53, 1.2)], mode: 'body' }, { dur: 2.25 }); }
    if (set.death) { const d = Object.assign({}, set.death); set.death = d; put(set, 'death', { seq: [seg('Death01', 0, 2.4, 1.9)], mode: 'body' }, { dur: 1.9 }); }
  }
};
