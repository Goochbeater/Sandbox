/* POSE — procedural poses for when there's no mocap clip for what a scene needs (lying down, kneeling on a bed, two
   bodies together). A pose is plain data, written in the actor's BODY frame (x = their left, y = toward the head,
   z = their front), plus where the pelvis goes in the world and which way the body faces there:
     { at: [x, y, z]           world position of the pelvis joint
       up: [..], fwd: [..]     world directions of the body's up (pelvis -> head) and front (belly)
       hips:  [dir, front]     optional pelvis tilt
       spine: [dir, front]     the chest (spine_03); spine_01/02 share the bend
       neck:  dir              head: [dir, face]   (dir = up through the crown, face = where the face points)
       armL / armR: [upper, fore, front?, hand?]      legL / legR: [thigh, calf, knee?, foot?]
         … or { ik: [x,y,z], pole, end }       two-bone IK: wrist / ankle on a world point, elbow / knee toward pole
         … or { aimAt: [x,y,z], lower, pole, end }   knee / elbow put down at that point's height, on its bearing (kneeling)
       world: true             optional: all the directions above are world directions (up / fwd / at always are)
       pin: (actor) => Vector3 optional: after posing, slide the body by this much (how two bodies are made to meet) }
   Each named bone is aimed from its bind direction. `front` / `knee` fixes the twist (which way the inner elbow / the
   kneecap faces); forearms, calves, hands and feet swing from their parent, so elbows and knees act as hinges. Bones
   that aren't named ride their parent (clavicles, fingers; hands and feet if not given).
     POSE.solve(actor, pose, Dout)   fill Dout with world-space deltas, the same form a clip sample has
     POSE.drive(actor, fn, dur, o)   actor.puppet: blend from whatever the body is doing now into fn(t, actor) over dur s
                                     (o.lift: arc the pelvis up by this much mid-blend — climbing onto something)
     POSE.release(actor)             hand the body back to the clips */
const POSE = { _q: new THREE.Quaternion(), _m: new THREE.Matrix4(), _v: new THREE.Vector3(), _w: new THREE.Vector3(), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };
POSE.CHILD = { pelvis: 'spine_01', spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'Head', upperarm_l: 'lowerarm_l', lowerarm_l: 'hand_l',
  upperarm_r: 'lowerarm_r', lowerarm_r: 'hand_r', thigh_l: 'calf_l', calf_l: 'foot_l', thigh_r: 'calf_r', calf_r: 'foot_r', foot_l: 'ball_l', foot_r: 'ball_r', hand_l: 'middle_01_l', hand_r: 'middle_01_r' };
POSE.v = (a) => new THREE.Vector3(a[0], a[1], a[2]).normalize();
/* the rotation taking the body/bind frame (+y, +z) to (dir, front); front is made perpendicular to dir */
POSE.frame = function (dir, front, out) {
  const e1 = dir.clone().normalize(), e2 = front.clone().addScaledVector(e1, -front.dot(e1));
  if (e2.lengthSq() < 1e-6) { e2.set(0, 0, 1).addScaledVector(e1, -e1.z); if (e2.lengthSq() < 1e-6) e2.set(0, 1, 0).addScaledVector(e1, -e1.y); }
  e2.normalize(); const e3 = new THREE.Vector3().crossVectors(e1, e2);
  // columns: where body +y, +z, +x go  (x = y cross z)
  return out.setFromRotationMatrix(POSE._m.makeBasis(e3, e1, e2));
};
POSE.bind = function (a) {   // the body's bind directions, cached per actor
  if (a._pb) return a._pb; const I = QA.idx, wt = a.wt, b = {};
  for (const n in POSE.CHILD) { const i = I[n], c = I[POSE.CHILD[n]]; b[n] = new THREE.Vector3(wt[c][0] - wt[i][0], wt[c][1] - wt[i][1], wt[c][2] - wt[i][2]).normalize(); }
  b.Head = new THREE.Vector3(0, 1, 0); return (a._pb = b);
};
POSE.solve = function (a, P, D) {
  const par = QA.M.skel.parents, names = QA.M.skel.names, B = POSE.bind(a), Z = POSE.Z, Y = POSE.Y;
  const L = a._pl || (a._pl = names.map(() => new THREE.Quaternion()));
  const Qb = POSE.frame(POSE.v(P.up), POSE.v(P.fwd), new THREE.Quaternion());   // body -> world
  // P.world: the limb directions are given in world terms (easier when staging bodies on furniture) -> into body terms
  const Qi = Qb.clone().invert(), aim = {}, swing = {}, v = P.world ? (d) => POSE.v(d).applyQuaternion(Qi) : POSE.v;
  const F0 = P.world ? P.fwd : [0, 0, 1];   // default fronts: the body's own
  if (P.hips) aim.pelvis = [v(P.hips[0]), v(P.hips[1] || F0)];
  if (P.spine) { const t = v(P.spine[0]), f = v(P.spine[1] || F0);
    aim.spine_01 = [Y.clone().lerp(t, 0.35).normalize(), Z.clone().lerp(f, 0.35).normalize()];
    aim.spine_02 = [Y.clone().lerp(t, 0.7).normalize(), Z.clone().lerp(f, 0.7).normalize()]; aim.spine_03 = [t, f]; }
  const face = P.head ? v(P.head[1] || F0) : null;
  if (P.neck) aim.neck_01 = [v(P.neck), face || v(P.spine ? P.spine[1] || F0 : F0)];
  if (P.head) aim.Head = [v(P.head[0]), face];
  // limbs: [upper, lower, front?, end?] directions, or { ik: [x, y, z] world target for the wrist / ankle, pole: world
  // direction the elbow / knee points, end: hand / foot direction } — a two-bone chain solved once the shoulder / hip is placed
  const ik = {}, LIMB = [['armL', 'l', 'upperarm_', 'lowerarm_', 'hand_', 1], ['armR', 'r', 'upperarm_', 'lowerarm_', 'hand_', 1], ['legL', 'l', 'thigh_', 'calf_', 'foot_', -1], ['legR', 'r', 'thigh_', 'calf_', 'foot_', -1]];
  for (const [k, sd, u, l, e, sg] of LIMB) { const A = P[k]; if (!A) continue;
    if (Array.isArray(A)) { aim[u + sd] = [v(A[0]), v(A[2] || F0)]; if (A[1]) swing[l + sd] = v(A[1]); if (A[3]) swing[e + sd] = v(A[3]); }
    else { ik[u + sd] = { T: new THREE.Vector3().fromArray(A.ik || A.aimAt), aimAt: !!A.aimAt, lower: A.lower && v(A.lower), pole: new THREE.Vector3().fromArray(A.pole || [0, 0, 1]), lo: l + sd, sg };
      if (A.end) swing[e + sd] = v(A.end); }
  }
  const q0 = POSE._q, fb = new THREE.Quaternion(), bd = new THREE.Vector3(), sc = a.spec.s || 1, I = QA.idx, wt = a.wt;
  const pos = a._pj || (a._pj = names.map(() => new THREE.Vector3())), off = new THREE.Vector3(), Dq = new THREE.Quaternion();
  const len = (i, j) => sc * Math.hypot(wt[j][0] - wt[i][0], wt[j][1] - wt[i][1], wt[j][2] - wt[i][2]);
  pos[1].fromArray(P.at);
  for (let i = 1; i < names.length; i++) {
    const n = names[i], p = par[i];
    if (i > 1) { off.set(wt[i][0] - wt[p][0], wt[i][1] - wt[p][1], wt[i][2] - wt[p][2]).multiplyScalar(sc).applyQuaternion(Dq.copy(Qb).multiply(L[p])); pos[i].copy(pos[p]).add(off); }
    if (ik[n] && ik[n].aimAt) {   // aim the upper bone at a world point (a knee onto the quilt), the lower bone along `lower`
      // the knee keeps the target's height and bearing and lands one thigh-length from the hip
      const c = ik[n], S = pos[i], la = len(i, I[c.lo]), dy = c.T.y - S.y, h = new THREE.Vector3(c.T.x - S.x, 0, c.T.z - S.z);
      const dirW = Math.abs(dy) < la * 0.999 && h.lengthSq() > 1e-8 ? h.normalize().multiplyScalar(Math.sqrt(la * la - dy * dy)).setY(dy).normalize() : c.T.clone().sub(S).normalize();
      const nrm = c.pole.clone().addScaledVector(dirW, -c.pole.dot(dirW)).normalize();
      aim[n] = [dirW.applyQuaternion(Qi), nrm.multiplyScalar(-c.sg).applyQuaternion(Qi)]; if (c.lower) swing[c.lo] = c.lower;
    } else if (ik[n]) {   // two-bone IK: the elbow / knee goes toward the pole, the upper bone aims at it, the lower at the target
      const c = ik[n], j = I[c.lo], la = len(i, j), lb = len(j, I[POSE.CHILD[c.lo]]), S = pos[i];
      const u = c.T.clone().sub(S); const d = clamp(u.length(), Math.abs(la - lb) + 1e-3, (la + lb) * 0.999); u.normalize();
      const ca = (la * la + d * d - lb * lb) / (2 * la * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
      const nrm = c.pole.clone().addScaledVector(u, -c.pole.dot(u)); if (nrm.lengthSq() < 1e-6) nrm.set(0, 1, 0).addScaledVector(u, -u.y); nrm.normalize();
      const E = S.clone().addScaledVector(u, la * ca).addScaledVector(nrm, la * sa), Tt = S.clone().addScaledVector(u, d);
      // the inner elbow faces away from the pole; the kneecap faces toward it
      aim[n] = [E.clone().sub(S).normalize().applyQuaternion(Qi), nrm.clone().multiplyScalar(-c.sg).applyQuaternion(Qi)];
      swing[c.lo] = Tt.sub(E).normalize().applyQuaternion(Qi);
    }
    if (aim[n]) {   // frame(target) * frame(bind)^-1, bind front = body +z
      POSE.frame(aim[n][0], aim[n][1], L[i]); POSE.frame(B[n], Z, fb); L[i].multiply(fb.invert());
    } else if (swing[n]) {   // hinge: the parent's rotation, then the shortest swing onto the target
      bd.copy(B[n]).applyQuaternion(L[p]); q0.setFromUnitVectors(bd, swing[n]); L[i].copy(q0).multiply(L[p]);
    } else if (i === 1) L[i].identity(); else L[i].copy(L[p]);
    D[i].copy(Qb).multiply(L[i]);
  }
  D[0].identity();
  return P.at;
};
POSE.drive = function (a, fn, dur, o) {
  o = o || {}; dur = dur === undefined ? 0.8 : dur;
  const yaw = new THREE.Quaternion().setFromAxisAngle(POSE.Y, a.puppet ? 0 : a.yaw), s = a.spec.s || 1;
  const st = { fn, t: 0, dur, k: dur > 0 ? 0 : 1, lift: o.lift || 0, D: a.D.map(() => new THREE.Quaternion()),
    from: a.D.map((q) => yaw.clone().multiply(q)),
    fromP: new THREE.Vector3().fromArray(a.wt[1]).add(a.pel).multiplyScalar(s).applyQuaternion(yaw).add(POSE._v.set(a.x, a.y, a.z)) };
  if (a.puppet && a.pose_ && a.pose_.k < 1) st.from = a.D.map((q) => q.clone());   // mid-blend: start from what's on screen
  a.pose_ = st; a.puppet = POSE.tick; a.target = null; a.path = null; a.sitting = null; a.pel.set(0, 0, 0);
  return new Promise((r) => { st.done = r; if (st.k >= 1) r(); });
};
POSE.tick = function (a, dt) {
  const st = a.pose_, s = a.spec.s || 1, n = a.D.length; st.t += dt;
  const P = st.fn(st.t, a); POSE.solve(a, P, st.D);
  const at = POSE._w.fromArray(P.at);
  if (st.k < 1) {
    st.k = Math.min(1, st.k + dt / st.dur); const k = smooth(0, 1, st.k);
    for (let i = 0; i < n; i++) a.D[i].slerpQuaternions(st.from[i], st.D[i], k);
    at.lerpVectors(st.fromP, at.clone(), k); at.y += Math.sin(Math.PI * k) * st.lift;
    if (st.k >= 1 && st.done) st.done();
  } else for (let i = 0; i < n; i++) a.D[i].copy(st.D[i]);
  a.pel.set(0, 0, 0); a.yaw = 0;
  a.x = at.x - s * a.wt[1][0]; a.y = at.y - s * a.wt[1][1]; a.z = at.z - s * a.wt[1][2];
  if (P.pin) {   // P.pin(a) -> how far the posed body is from where it must touch. Slide the pelvis by that much (eased in
    // while blending) and solve again from there, so planted hands and knees (IK targets) stay where they were asked to be
    a.compose(); a.root.position.set(a.x, a.y, a.z); a.root.rotation.y = 0; a.root.updateMatrixWorld(true);
    const d = P.pin(a);
    if (d) { const k = st.k < 1 ? smooth(0, 1, st.k) : 1; at.addScaledVector(d, k); P.at = at.toArray(); POSE.solve(a, P, st.D);
      if (st.k < 1) for (let i = 0; i < n; i++) a.D[i].slerpQuaternions(st.from[i], st.D[i], smooth(0, 1, st.k)); else for (let i = 0; i < n; i++) a.D[i].copy(st.D[i]);
      a.x = at.x - s * a.wt[1][0]; a.y = at.y - s * a.wt[1][1]; a.z = at.z - s * a.wt[1][2]; }
  }
};
/* a point given in body space, carried by one bone, in the world right now (the bones' matrices must be current) */
POSE.point = function (a, bone, p, out) {
  const i = QA.idx[bone], c = a._pp || (a._pp = {}), key = bone + p.join(',');
  if (!c[key]) { const Bm = new THREE.Matrix4().compose(new THREE.Vector3().fromArray(a.wt[i]), a.wr[i], new THREE.Vector3(1, 1, 1)).invert(); c[key] = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(Bm); }
  return a.bones[i].localToWorld(out.copy(c[key]));
};
POSE.release = function (a) { a.puppet = null; a.pose_ = null; a.pel.set(0, 0, 0); };
