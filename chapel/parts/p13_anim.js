/* ANIMATION — prop-driven poses. A pose places the PROP (saber / rifle / staff) in body space and says which hands
   hold it; arms are solved by two-bone IK onto the grips, legs by IK onto foot targets, the spine by a few angles.
   Body space: character origin on the ground, +Z forward, +X left. Blending = lerp/slerp of the pose fields. */
class Pose {
  constructor() {
    this.hp = new THREE.Vector3(0, 1.05, 0.3);     // prop (hilt centre) position, body space
    this.hq = new THREE.Quaternion();              // prop orientation (+Y = blade axis)
    this.gL = 1; this.gR = 1;                      // hand grip weights (1 = on the prop)
    this.oL = 0.132; this.oR = -0.132;             // grip offsets along the prop axis
    this.fL = new THREE.Vector3(0.35, 1.0, 0.1);   // free-hand targets (body space)
    this.fR = new THREE.Vector3(-0.35, 1.0, 0.1);
    this.yaw = 0; this.twist = 0; this.pitch = 0; this.lean = 0; this.crouch = 0.05; this.hipTilt = 0;
    this.flip = 0; this.roll = 0; this.off = new THREE.Vector3();
    this.footL = new THREE.Vector3(0.13, 0, 0.1); this.footR = new THREE.Vector3(-0.13, 0, -0.1);
    this.liftL = 0; this.liftR = 0; this.toeL = 0; this.toeR = 0;
    this.headYaw = 0; this.headPitch = 0; this.air = 0;
  }
  copy(o) {
    this.hp.copy(o.hp); this.hq.copy(o.hq); this.gL = o.gL; this.gR = o.gR; this.oL = o.oL; this.oR = o.oR; this.fL.copy(o.fL); this.fR.copy(o.fR);
    this.yaw = o.yaw; this.twist = o.twist; this.pitch = o.pitch; this.lean = o.lean; this.crouch = o.crouch; this.hipTilt = o.hipTilt; this.flip = o.flip; this.roll = o.roll; this.off.copy(o.off);
    this.footL.copy(o.footL); this.footR.copy(o.footR); this.liftL = o.liftL; this.liftR = o.liftR; this.toeL = o.toeL; this.toeR = o.toeR;
    this.headYaw = o.headYaw; this.headPitch = o.headPitch; this.air = o.air; return this;
  }
  blend(a, b, t) {   // this = lerp(a, b, t)
    const L = lerp;
    this.hp.lerpVectors(a.hp, b.hp, t); this.hq.slerpQuaternions(a.hq, b.hq, t);
    this.gL = L(a.gL, b.gL, t); this.gR = L(a.gR, b.gR, t); this.oL = L(a.oL, b.oL, t); this.oR = L(a.oR, b.oR, t);
    this.fL.lerpVectors(a.fL, b.fL, t); this.fR.lerpVectors(a.fR, b.fR, t);
    this.yaw = a.yaw + wrapA(b.yaw - a.yaw) * t; this.twist = L(a.twist, b.twist, t); this.pitch = L(a.pitch, b.pitch, t); this.lean = L(a.lean, b.lean, t);
    this.crouch = L(a.crouch, b.crouch, t); this.hipTilt = L(a.hipTilt, b.hipTilt, t); this.flip = L(a.flip, b.flip, t); this.roll = L(a.roll, b.roll, t); this.off.lerpVectors(a.off, b.off, t);
    this.footL.lerpVectors(a.footL, b.footL, t); this.footR.lerpVectors(a.footR, b.footR, t);
    this.liftL = L(a.liftL, b.liftL, t); this.liftR = L(a.liftR, b.liftR, t); this.toeL = L(a.toeL, b.toeL, t); this.toeR = L(a.toeR, b.toeR, t);
    this.headYaw = L(a.headYaw, b.headYaw, t); this.headPitch = L(a.headPitch, b.headPitch, t); this.air = L(a.air, b.air, t);
    return this;
  }
}
const ANIM = {};
ANIM.STANCE = {
  guard: [[0.15, 0.17, 0.25], [-0.15, -0.17, -0.35]], wide: [[0.25, 0.04, 0.3], [-0.25, -0.06, -0.3]], neutral: [[0.12, 0.03, 0.08], [-0.12, -0.03, -0.08]],
  lungeL: [[0.15, 0.46, 0.2], [-0.14, -0.34, -0.4]], lungeR: [[0.14, -0.34, 0.4], [-0.15, 0.46, -0.2]], spin: [[0.11, 0.05, 0.0], [-0.11, -0.05, 0.0]],
  back: [[0.15, -0.05, 0.3], [-0.16, -0.36, -0.5]], cross: [[0.02, 0.2, 0.6], [-0.18, -0.2, -0.2]], kick: [[0.13, 0.0, 0.2], [-0.12, 0.3, 0.0]],
};
/* rest-derived limb data for IK (per template) */
ANIM.limbData = function (T) {
  const d = T.def, P = (i) => new THREE.Vector3(...d[i].head), E = (i) => new THREE.Vector3(...d[i].tail);
  const mk = (a, b, pole) => {
    const sA = P(a), eA = E(a), eB = E(b);
    const dirA = eA.clone().sub(sA).normalize(), dirB = eB.clone().sub(eA).normalize();
    const up = (dir) => { const u = pole.clone().addScaledVector(dir, -pole.dot(dir)); return u.normalize(); };
    return { la: sA.distanceTo(eA), lb: eA.distanceTo(eB), dirA, dirB, upA: up(dirA), upB: up(dirB) };
  };
  const g = T.grip || SCULPT.fistFrame(T.J);
  const gripOff = new THREE.Vector3(...V.sub(g.C, g.W));      // wrist -> grip centre (left, rest)
  return { armL: mk(6, 7, V3(0, -0.15, -1).normalize()), armR: mk(10, 11, V3(0, -0.15, -1).normalize()), legL: mk(13, 14, V3(0, 0, 1)), legR: mk(16, 17, V3(0, 0, 1)),
    gripOffL: gripOff, gripOffR: new THREE.Vector3(-gripOff.x, gripOff.y, gripOff.z), com: 0.95 };
};
ANIM._t = { v: [], q: [] }; for (let i = 0; i < 22; i++) { ANIM._t.v.push(new THREE.Vector3()); ANIM._t.q.push(new THREE.Quaternion()); }
ANIM.Z = new THREE.Vector3(0, 0, 1);
ANIM.qEuler = function (x, y, z, q) { _e1.set(x, y, z, 'YXZ'); return q.setFromEuler(_e1); };
/* apply a pose to a character instance. inst.root must already hold world position / facing.
   inst.prop: Object3D placed at the hilt (body space → world). groundY(x,z) optional. */
ANIM.apply = function (inst, P, opt) {
  opt = opt || {};
  const T = inst.T, B = inst.bones, LD = inst.LD || (inst.LD = ANIM.limbData(T)), sc = inst.scale || 1;
  const vv = ANIM._t.v, qq = ANIM._t.q;
  // holder: body yaw + flip/roll about the centre of mass
  const H = inst.holder, com = LD.com;
  H.position.set(P.off.x, P.off.y + com, P.off.z);
  ANIM.qEuler(P.flip, P.yaw, P.roll, H.quaternion);
  if (!inst.inner) { inst.inner = new THREE.Group(); inst.inner.position.y = -com; while (H.children.length) inst.inner.add(H.children[0]); H.add(inst.inner); }
  // reset bones
  for (let i = 0; i < B.length; i++) { B[i].position.copy(B[i].userData.rest); B[i].quaternion.identity(); }
  // pelvis: crouch + hip tilt + a little counter-twist
  B[0].position.y -= P.crouch; B[0].position.x += P.lean * 0.04;
  ANIM.qEuler(P.pitch * 0.25, -P.twist * 0.35, P.hipTilt, B[0].quaternion);
  ANIM.qEuler(P.pitch * 0.4, P.twist * 0.55, P.lean * 0.5, B[1].quaternion);
  ANIM.qEuler(P.pitch * 0.45, P.twist * 0.7, P.lean * 0.5, B[2].quaternion);
  ANIM.qEuler(-P.pitch * 0.35 + P.headPitch * 0.4, P.headYaw * 0.4 - P.twist * 0.35, -P.lean * 0.4, B[3].quaternion);
  ANIM.qEuler(-P.pitch * 0.35 + P.headPitch * 0.6, P.headYaw * 0.6 - P.twist * 0.35, -P.lean * 0.3, B[4].quaternion);
  const mo = inst.mo && inst.mo.on ? inst.mo : null;
  if (mo) MOCAP.trunk(inst, mo);
  inst.root.updateMatrixWorld(true);
  const inner = inst.inner, M = inner.matrixWorld;
  // ---- legs
  const gy = opt.groundY;
  const legs = [[13, 14, 15, P.footL, P.liftL, LD.legL, P.toeL], [16, 17, 18, P.footR, P.liftR, LD.legR, P.toeR]];
  const qBody = qq[0]; inner.getWorldQuaternion(qBody);
  for (const [a, b, f, tgt, lift, rd, toe] of legs) {
    const T0 = vv[0].copy(tgt); T0.y += 0.087 + lift * 0.18;     // ankle height above the sole
    T0.applyMatrix4(M);
    if (gy && P.air < 0.5 && lift < 0.05) { const g = gy(T0.x, T0.z); if (g !== null && g !== undefined) T0.y = Math.max(T0.y, g + 0.087 * sc); }
    const S = B[a].getWorldPosition(vv[1]);
    const pole = vv[2].set(Math.sin(P.yaw) * 0.0 + 0, 0, 1).applyQuaternion(qBody);
    pole.addScaledVector(vv[3].set(tgt.x > 0 ? 0.15 : -0.15, 0, 0).applyQuaternion(qBody), 1);
    IK.twoBone(B[a], B[b], S, T0, pole, rd, ANIM._ikOut);
    // foot flat (yaw with the body) + toe pitch
    const qf = qq[1].copy(qBody).multiply(ANIM.qEuler(toe - lift * 0.5, 0, 0, qq[2]));
    IK.setWorldQ(B[f], qf);
  }
  if (mo) MOCAP.legs(inst, mo, opt, P, LD);
  // ---- prop
  const prop = inst.prop;
  const hpW = vv[4].copy(P.hp).applyMatrix4(M);
  if (mo) MOCAP.propFollow(inst, mo, hpW);
  const hqW = qq[3].copy(qBody).multiply(P.hq);
  const axis = vv[5].set(0, 1, 0).applyQuaternion(hqW);
  // ---- arms (two passes: second pass re-aims the wrist with the solved hand orientation)
  const arms = [[6, 7, 8, P.gL, P.oL, P.fL, LD.armL, LD.gripOffL, 1], [10, 11, 12, P.gR, P.oR, P.fR, LD.armR, LD.gripOffR, -1]];
  let corr = null;
  if (prop && P.gL > 0.5 && P.gR > 0.5 && opt.fitProp !== false) corr = vv[6].set(0, 0, 0);
  for (let pass = 0; pass < (corr ? 3 : 1); pass++) {
    if (pass >= 1 && corr) { hpW.addScaledVector(corr, pass === 1 ? 0.6 : 0.8); corr.set(0, 0, 0); }   // pull the hilt into the fists (3 passes: a reach-limited hand still closes on it)
    for (const [a, b, h, gw, go, free, rd, gOff, side] of arms) {
      const S = B[a].getWorldPosition(vv[7]);
      const grip = vv[8].copy(hpW).addScaledVector(axis, go);
      const freeW = vv[9].copy(free).applyMatrix4(M);
      const tgt = vv[10].lerpVectors(freeW, grip, sat(gw));
      // hand orientation: grip axis (hand +Z) onto the prop axis, sign chosen for the least wrist bend
      const pole = vv[11].set(side * 0.5, -0.5, -1).applyQuaternion(qBody).normalize();
      // elbow continuity: lean the pole toward last frame's elbow side, so a wrist passing in line with the shoulder
      // can't snap the elbow to the other side of the arm in one frame (the 110–130° upper-arm pops in lunges/slams)
      const epm = inst._ep || (inst._ep = {}), ep = epm[h];
      if (ep) pole.multiplyScalar(0.45).add(ep).normalize();
      // first solve assuming the grip offset in the current forearm frame
      const farmQ = qq[4];
      for (let it = 0; it < 2; it++) {
        B[b].getWorldQuaternion(farmQ);
        const zNow = vv[12].set(0, 0, 1).applyQuaternion(farmQ);
        // symmetric staff: which end the hand grips has HYSTERESIS — a plain sign test flipped the hand 180° every frame
        // whenever the hilt passed square to the forearm (the a5 slam, spins): the saber visibly stuttered
        const gs = inst._gs || (inst._gs = {}); if (gs[h] === undefined) gs[h] = 1;
        const gft = inst._gft || (inst._gft = {});
        // decided from the BODY, not the forearm (the forearm is the IK's own output: testing it made the grip flip
        // back and forth every frame at rest — the twisted, jittering off hand). Hand +Z points to the upper end.
        const rs = axis.dot(vv[19].set(0, 1, 0.35).applyQuaternion(qBody)) * (MG.flags.gsr ? -1 : 1);
        if (inst.symProp && it === 0 && !inst.inAct && rs * gs[h] < -0.2) { gs[h] = -gs[h]; gft[h] = 12; }
        if (it === 0 && gft[h] > 0) gft[h]--;   // hands never let go mid-move: the grip end is locked while an action plays
        const ax = vv[13].copy(axis); if (inst.symProp && gs[h] < 0) ax.negate();
        if (gw < 0.5) ax.copy(zNow);
        const qh = qq[5].setFromUnitVectors(zNow, ax).multiply(farmQ);
        // wrist rate limit (vs LAST FRAME's hand, applied before the IK so the arm is solved for the hand it will show):
        // a re-grip turns over a few frames, never a one-frame 180° pop
        const hqm = inst._hq || (inst._hq = {}), pq = hqm[h];
        if (inst.symProp && pq && gft[h] > 0) { const ang = pq.angleTo(qh); if (ang > 0.6) qh.copy(qq[6].copy(pq).slerp(qh, 0.6 / ang)); }   // only while a re-grip is turning
        const off = vv[14].copy(gOff).applyQuaternion(qh).multiplyScalar(sc);
        const wristT = vv[15].copy(tgt).sub(off);
        IK.twoBone(B[a], B[b], S, wristT, pole, rd, ANIM._ikOut);
        if (window.__ikdbg && it === 1) (window.__ikdbg[h] = { d: S.distanceTo(wristT), reach: (rd.la + rd.lb) * (inst.scale || 1), min: Math.abs(rd.la - rd.lb) * (inst.scale || 1), sc: inst.scale || 1, wristMiss: B[h].getWorldPosition(new THREE.Vector3()).distanceTo(wristT), elbowLen: B[b].getWorldPosition(new THREE.Vector3()).distanceTo(S), foreLen: B[b].getWorldPosition(new THREE.Vector3()).distanceTo(B[h].getWorldPosition(new THREE.Vector3())) });
        if (it === 1) { const eb = B[b].getWorldPosition(vv[17]).sub(S), sd = vv[18].copy(wristT).sub(S).normalize(); eb.addScaledVector(sd, -eb.dot(sd)); if (eb.lengthSq() > 1e-6) (epm[h] || (epm[h] = new THREE.Vector3())).copy(eb.normalize()); }
        if (it === 1) (hqm[h] || (hqm[h] = new THREE.Quaternion())).copy(qh);
        IK.setWorldQ(B[h], qh);
        if (it === 1 && corr && gw > 0.5 && pass < 2) { const got = B[h].getWorldPosition(vv[16]).add(off); corr.add(got.sub(tgt)); }
      }
    }
  }
  if (prop) {
    // prop into world space
    prop.position.copy(hpW); prop.quaternion.copy(hqW); prop.scale.setScalar(sc);
    prop.updateMatrixWorld(true);
  }
  let gL = sat(P.gL), gR = sat(P.gR);
  if (mo) { MOCAP.arms(inst, mo, P, LD); gL = lerp(gL, mo.twoHand, mo.wFull); gR = lerp(gR, 1, mo.wFull); }
  if (inst.q) { inst.q.gripL = gL * 0.85 + 0.15; inst.q.gripR = gR * 0.85 + 0.15; QB.drive(inst); }
  if (window.__ikdbg && prop && inst === (PLAYER.a && PLAYER.a.inst)) { const ax = new THREE.Vector3(0, 1, 0).applyQuaternion(prop.quaternion); for (const [h, off] of [[8, LD.gripOffL], [12, LD.gripOffR]]) { const bq = B[h].getWorldQuaternion(new THREE.Quaternion()), gp = off.clone().applyQuaternion(bq).multiplyScalar(inst.scale || 1).add(B[h].getWorldPosition(new THREE.Vector3())).sub(prop.position); const al = gp.dot(ax); (window.__ikdbg['end' + h] = gp.addScaledVector(ax, -al).length()); } window.__ikdbg.P = [P.gL, P.gR, !!corr, mo ? mo.wAL : -1, mo ? mo.wAR : -1]; }
};
ANIM._ikOut = { elbow: new THREE.Vector3(), end: new THREE.Vector3(), qA: new THREE.Quaternion(), qB: new THREE.Quaternion() };
/* quaternion that points +Y along dir (body space) with a roll about it */
ANIM.axisQ = function (dx, dy, dz, roll, out) {
  const d = _v1.set(dx, dy, dz).normalize();
  out = out || new THREE.Quaternion();
  out.setFromUnitVectors(YUP, d);
  if (roll) out.premultiply(_q2.setFromAxisAngle(d, roll));
  return out;
};
/* ------------------------------------------------------------------ clips
   key: {t, h:[x,y,z], a:[dx,dy,dz], r:roll, yaw, tw, pi, le, cr, st:'stance', g:'both'|'L'|'R', fl:[..], fr:[..], ly, lz, lx, ...} */
ANIM.keyPose = function (k, prev, out) {
  out.copy(prev);
  if (k.h) out.hp.set(k.h[0], k.h[1], k.h[2]);
  if (k.a) ANIM.axisQ(k.a[0], k.a[1], k.a[2], k.r || 0, out.hq);
  if (k.q) out.hq.copy(k.q);
  if (k.g) { out.gL = k.g === 'both' || k.g === 'L' ? 1 : 0; out.gR = k.g === 'both' || k.g === 'R' ? 1 : 0; out.oL = k.g === 'both' ? (k.oL !== undefined ? k.oL : 0.132) : 0; out.oR = k.g === 'both' ? (k.oR !== undefined ? k.oR : -0.132) : 0; if (k.g === 'L' && k.oL !== undefined) out.oL = k.oL; if (k.g === 'R' && k.oR !== undefined) out.oR = k.oR; }
  if (k.oL !== undefined && k.g !== 'R') out.oL = k.oL; if (k.oR !== undefined && k.g !== 'L') out.oR = k.oR;
  if (k.fl) out.fL.set(k.fl[0], k.fl[1], k.fl[2]); if (k.fr) out.fR.set(k.fr[0], k.fr[1], k.fr[2]);
  for (const f of ['yaw', 'twist', 'pitch', 'lean', 'crouch', 'hipTilt', 'flip', 'roll', 'headYaw', 'headPitch', 'air', 'liftL', 'liftR', 'toeL', 'toeR']) if (k[f] !== undefined) out[f] = k[f];
  if (k.tw !== undefined) out.twist = k.tw; if (k.pi !== undefined) out.pitch = k.pi; if (k.le !== undefined) out.lean = k.le; if (k.cr !== undefined) out.crouch = k.cr;
  if (k.st) { const s = ANIM.STANCE[k.st]; out.footL.set(s[0][0], 0, s[0][1]); out.footR.set(s[1][0], 0, s[1][1]); }
  if (k.fL) out.footL.set(k.fL[0], k.fL[1] || 0, k.fL[2]); if (k.fR) out.footR.set(k.fR[0], k.fR[1] || 0, k.fR[2]);
  if (k.off) out.off.set(k.off[0], k.off[1], k.off[2]);
  return out;
};
/* compile a clip: resolve every key into a full Pose (each key inherits the previous one) */
ANIM.compile = function (clip, base) {
  if (clip._poses) return clip;
  let prev = base || ANIM.basePose; clip._poses = [];
  for (const k of clip.keys) { const p = ANIM.keyPose(k, prev, new Pose()); clip._poses.push(p); prev = p; }
  clip.dur = clip.dur || Math.max(0.001, clip.keys[clip.keys.length - 1].t);
  return clip;
};
ANIM._ta = new Pose(); ANIM._tb = new Pose();
/* sample with Catmull-Rom on the prop path and eased blends elsewhere */
ANIM.sample = function (clip, t, out) {
  const K = clip.keys, P = clip._poses, n = K.length;
  if (n === 1 || !(t > K[0].t)) return out.copy(P[0]);
  if (t >= K[n - 1].t) return out.copy(P[n - 1]);
  let i = 0; while (i < n - 2 && t > K[i + 1].t) i++;
  const k0 = K[i], k1 = K[i + 1]; let u = (t - k0.t) / Math.max(1e-5, k1.t - k0.t);
  const e = k1.ease || 'io';
  const ue = e === 'lin' ? u : e === 'out' ? easeOut(u) : e === 'in' ? u * u : easeIO(u);
  out.blend(P[i], P[i + 1], ue);
  // Catmull-Rom for the prop position (smooth arcs through keys)
  const p0 = P[Math.max(0, i - 1)].hp, p1 = P[i].hp, p2 = P[i + 1].hp, p3 = P[Math.min(n - 1, i + 2)].hp;
  const uu = e === 'lin' ? u : ue, u2 = uu * uu, u3 = u2 * uu;
  out.hp.set(
    0.5 * ((2 * p1.x) + (-p0.x + p2.x) * uu + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
    0.5 * ((2 * p1.y) + (-p0.y + p2.y) * uu + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
    0.5 * ((2 * p1.z) + (-p0.z + p2.z) * uu + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * u2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * u3));
  return out;
};
/* ------------------------------------------------------------------ locomotion
   A biomechanical walk/run cycle layered on a carry pose (whatever the hands are doing). Everything derives from speed:
   cadence and ground-contact fraction set how far a planted foot travels (= body speed × stance time, so feet never
   slide); running adds a flight phase, a high heel kick behind, knee drive in front, a forward lean, bounce through
   the knees, shoulders counter-rotating against the hips and a pumping free arm. phase 0 = left foot contact. */
ANIM.gait = function (v, two, lat) {
  const run = sat((v - 2.3) / 2.6);
  let f = lerp(0.85 + 0.2 * Math.min(v, 2.3), 1.45 + 0.065 * v, run);            // strides (L+R) per second
  if (two) f *= 1.4;                                                              // guarded stance: short quick steps
  if (lat > 0.5) f *= 1 + (lat - 0.5) * 0.7;                                      // side-steps quicker still
  const stance = lerp(0.6, 0.34, run);                                           // fraction of the cycle a foot is planted
  const travel = Math.min(v * stance / Math.max(f, 0.3), 1.2);                  // planted-foot travel (m)
  return { run, f, stance, travel };
};
ANIM.cadence = (v, two, lat) => (v < 0.05 ? 0 : ANIM.gait(v, two, lat).f);
ANIM._fp = { z: 0, y: 0, toe: 0, h: 0 };
/* one foot: returns body-space z / height / toe pitch for cycle phase p (0 = contact) */
ANIM.footPath = function (p, G, o) {
  const c = G.travel * lerp(0.42, 0.34, G.run), back = c - G.travel;             // lands a little ahead, leaves well behind
  if (p < G.stance) {                                                            // planted: slides back at body speed
    const u = p / G.stance; o.z = lerp(c, back, u); o.y = 0; o.h = 0;
    o.toe = lerp(G.run * 0.05 - 0.12 * (1 - G.run), 0.55 * (0.4 + G.run), smooth(0.55, 1.0, u)); return o;
  }
  const q = (p - G.stance) / (1 - G.stance), R = G.run;
  // swing: kicks up behind (heel toward the seat when running), drives the knee through, reaches out, claws back to land
  const reach = c + 0.05 + 0.08 * R;
  const zk = [back, back + 0.02 * R, lerp(back * 0.5, back * 0.3, R), c * 0.35 + 0.05, reach, c];
  const tk = [0, 0.22, 0.42, 0.62, 0.86, 1];
  let i = 0; while (i < tk.length - 2 && q > tk[i + 1]) i++;
  const uu = (q - tk[i]) / (tk[i + 1] - tk[i]); o.z = lerp(zk[i], zk[i + 1], easeIO(uu));
  const hy = lerp(0.1, 0.36, R) * (0.55 + 0.45 * sat(G.travel / 1.2));           // heel kick height
  const yk = [0, hy, hy * 0.85, lerp(0.09, 0.28, R), lerp(0.05, 0.11, R), 0];
  o.y = lerp(yk[i], yk[i + 1], easeIO(uu));
  const tpk = [0.55 * (0.4 + R), 0.95 * R + 0.3, 0.6 * R + 0.1, -0.1, -0.25 * (1 - R) - 0.05, lerp(-0.12, 0.05, R)];
  o.toe = lerp(tpk[i], tpk[i + 1], easeIO(uu)); o.h = sat(o.y / 0.05);
  return o;
};
ANIM.loco = function (carry, speed, mdx, mdz, phase, out, extra) {
  out.copy(carry);
  const v = speed; if (v < 0.05) return out;
  const L = Math.hypot(mdx, mdz) || 1, dx = mdx / L, dz = mdz / L;
  const two = carry.gL > 0.5 && carry.gR > 0.5;                                   // both hands on the weapon (guard strafe)
  const G = ANIM.gait(v, two, Math.abs(dx)), run = G.run, wgt = sat(v / 0.9);
  const R = two ? run * 0.55 : run;
  const fp = ANIM._fp;
  for (const side of [1, -1]) {
    const ph = ((phase + (side > 0 ? 0 : 0.5)) % 1 + 1) % 1;
    ANIM.footPath(ph, G, fp);
    const tgt = side > 0 ? out.footL : out.footR, rest = side > 0 ? carry.footL : carry.footR;
    const w = 0.105 * side * (1 - R * 0.3);                                       // runners' feet track closer to the midline
    const tx = w + dx * fp.z + (-dz) * 0 , tz = dz * fp.z;
    let fx = tx; if (Math.abs(dx) > 0.35) fx = side > 0 ? Math.max(fx, 0.07) : Math.min(fx, -0.07);   // side-steps never cross the feet
    tgt.x = lerp(rest.x, fx, wgt); tgt.z = lerp(rest.z, tz, wgt); tgt.y = lerp(rest.y, fp.y, wgt);
    if (side > 0) { out.toeL = lerp(out.toeL, fp.toe, wgt); out.liftL = Math.max(out.liftL, fp.h * 0.06 * wgt); }
    else { out.toeR = lerp(out.toeR, fp.toe, wgt); out.liftR = Math.max(out.liftR, fp.h * 0.06 * wgt); }
  }
  // pelvis height: bent knees while running, lowest just after each contact, highest in flight (two bounces per stride)
  const s2 = Math.cos((phase * 2 - G.stance * 0.35) * TAU);                      // -1 at the dip after contact
  out.crouch += (lerp(0.02, 0.058, R) + lerp(0.012, 0.03, R) * (-s2)) * wgt;
  out.pitch += lerp(0.05, 0.24, R) * dz * wgt + (two ? 0 : 0.03 * run * Math.cos(phase * 2 * TAU) * wgt);
  out.lean += -lerp(0.05, 0.14, R) * dx * wgt;
  const sw = Math.sin(phase * TAU);                                               // +1 when the left leg swings back
  out.twist += sw * lerp(0.1, 0.24, R) * wgt * (two ? 0.5 : 1) * dz;
  out.hipTilt += Math.sin((phase + 0.1) * TAU * 2) * lerp(0.04, 0.07, R) * wgt;
  out.headPitch -= lerp(0.05, 0.22, R) * dz * wgt * 0.6;                          // keep the eyes level
  // arms: the free hand pumps forward/up when the opposite leg is forward, elbow bent; the weapon hand swings less
  const pump = -sw * wgt, amp = lerp(0.14, 0.3, R);
  if (carry.gL < 0.5) { out.fL.z += pump * amp * dz + 0.06 * R; out.fL.y += (pump > 0 ? pump * lerp(0.05, 0.22, R) : pump * 0.04) + 0.12 * R; out.fL.x -= 0.07 * R; }
  if (carry.gR < 0.5) { out.fR.z += -pump * amp * dz + 0.06 * R; out.fR.y += (-pump > 0 ? -pump * lerp(0.05, 0.22, R) : -pump * 0.04) + 0.12 * R; out.fR.x += 0.07 * R; }
  if (!two && (carry.gL > 0.5) !== (carry.gR > 0.5)) {                             // one-handed weapon rides with its arm
    const k = carry.gR > 0.5 ? -pump : pump; out.hp.z += k * amp * 0.45 * dz; out.hp.y += Math.abs(k) * 0.04 * R - 0.02 * R;
  }
  // accelerate / brake / turn (extra = {acc, turn})
  if (extra) {
    out.pitch += clamp(extra.acc * 0.028, -0.26, 0.2) * wgt;
    out.lean += clamp(-extra.turn * 0.09 * sat(v / 4), -0.32, 0.32);
  }
  return out;
};
ANIM.basePose = new Pose();
