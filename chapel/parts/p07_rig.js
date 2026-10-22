/* RIG — one humanoid skeleton shared by every character (proportions scale per character). Rest pose = A-pose,
   bone rest orientations are identity, so a bone's local quaternion IS its rotation relative to the rest pose.
   Units: metres, +Y up, character faces +Z, +X = character's left. */
const RIG = {};
RIG.NAMES = ['root', 'spine', 'chest', 'neck', 'head', 'clavL', 'uarmL', 'farmL', 'handL', 'clavR', 'uarmR', 'farmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
RIG.PARENT = [-1, 0, 1, 2, 3, 2, 5, 6, 7, 2, 9, 10, 11, 0, 13, 14, 0, 16, 17];
RIG.B = {}; RIG.NAMES.forEach((n, i) => { RIG.B[n] = i; });
/* rest joints for a 1.0-scale body (Maul). mirror() gives the right side. */
RIG.J0 = {
  pelvis: [0, 0.98, 0], spine: [0, 1.10, -0.012], chest: [0, 1.28, -0.02], neck: [0, 1.485, -0.028], head: [0, 1.585, -0.015], headTop: [0, 1.80, 0.0],
  clav: [0.025, 1.452, 0.0], shoulder: [0.176, 1.445, -0.03], elbow: [0.356, 1.226, -0.032], wrist: [0.494, 1.014, -0.01], fist: [0.531, 0.953, -0.006],
  hip: [0.094, 0.935, 0.0], knee: [0.104, 0.515, 0.016], ankle: [0.11, 0.087, -0.022], toe: [0.118, 0.018, 0.135],
};
RIG.joints = function (sc) {
  sc = sc || {};
  const h = sc.height || 1, sw = sc.shoulders || 1, J = {};
  for (const k in RIG.J0) { const p = RIG.J0[k]; J[k] = [p[0] * h * (['clav', 'shoulder', 'elbow', 'wrist', 'fist'].includes(k) ? sw : 1), p[1] * h, p[2] * h]; }
  return J;
};
RIG.def = function (J) {
  const m = V.mx;
  const L = [
    ['root', J.pelvis, J.spine], ['spine', J.spine, J.chest], ['chest', J.chest, J.neck], ['neck', J.neck, J.head], ['head', J.head, J.headTop],
    ['clavL', J.clav, J.shoulder], ['uarmL', J.shoulder, J.elbow], ['farmL', J.elbow, J.wrist], ['handL', J.wrist, J.fist],
    ['clavR', m(J.clav), m(J.shoulder)], ['uarmR', m(J.shoulder), m(J.elbow)], ['farmR', m(J.elbow), m(J.wrist)], ['handR', m(J.wrist), m(J.fist)],
    ['thighL', J.hip, J.knee], ['shinL', J.knee, J.ankle], ['footL', J.ankle, J.toe],
    ['thighR', m(J.hip), m(J.knee)], ['shinR', m(J.knee), m(J.ankle)], ['footR', m(J.ankle), m(J.toe)],
  ];
  return L.map((b, i) => ({ i, name: b[0], parent: RIG.PARENT[i], head: b[1].slice(), tail: b[2].slice(), len: V.len(V.sub(b[2], b[1])) }));
};
/* skin weights: nearest bone segment + its parent/children (no cross-limb bleed). Optional forced bone per vertex. */
RIG.weights = function (bones, pos, n, opt) {
  opt = opt || {};
  const NB = bones.length, idx = new Uint16Array(n * 4), wts = new Float32Array(n * 4);
  const segD = (b, x, y, z) => { const a = b.head, t = b.tail; const ux = t[0] - a[0], uy = t[1] - a[1], uz = t[2] - a[2]; const L2 = ux * ux + uy * uy + uz * uz;
    let s = ((x - a[0]) * ux + (y - a[1]) * uy + (z - a[2]) * uz) / L2; s = s < 0 ? 0 : s > 1 ? 1 : s; const dx = x - a[0] - ux * s, dy = y - a[1] - uy * s, dz = z - a[2] - uz * s; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
  const d = new Float64Array(NB), kids = bones.map(() => []);
  for (const b of bones) if (b.parent >= 0) kids[b.parent].push(b.i);
  const allow = opt.allow || null;
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    if (opt.forced) { const f = opt.forced(x, y, z, v); if (f) { for (let k = 0; k < 4; k++) { idx[v * 4 + k] = k < f.length ? f[k][0] : 0; wts[v * 4 + k] = k < f.length ? f[k][1] : 0; } continue; } }
    let best = 0, bd = 1e9;
    for (let i = 0; i < NB; i++) { if (allow && !allow[i]) { d[i] = 1e9; continue; } let q = segD(bones[i], x, y, z); if (opt.bias) q += opt.bias(i, x, y, z); d[i] = q; if (q < bd) { bd = q; best = i; } }
    const cand = [best]; const bb = bones[best];
    if (bb.parent >= 0) cand.push(bb.parent);
    for (const c of kids[best]) cand.push(c);
    if (best === 2) cand.push(6, 10);
    if (best === 0) cand.push(13, 16);
    const w = []; let sum = 0;
    for (const c of cand) { if (d[c] > 1e8) { w.push(0); continue; } const q = Math.max(d[c], 0.004); const ww = 1 / Math.pow(q, opt.pow || 5); w.push(ww); sum += ww; }
    const order = cand.map((c, i) => [c, w[i] / sum]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s2 = 0; for (const o of order) s2 += o[1];
    for (let k = 0; k < 4; k++) { if (k < order.length) { idx[v * 4 + k] = order[k][0]; wts[v * 4 + k] = order[k][1] / s2; } }
  }
  return { idx, wts };
};
/* build THREE.Bone hierarchy for an instance */
RIG.makeBones = function (def) {
  const bones = def.map((b) => { const o = new THREE.Bone(); o.name = b.name; return o; });
  def.forEach((b, i) => {
    if (b.parent < 0) { bones[i].position.set(b.head[0], b.head[1], b.head[2]); }
    else { const p = def[b.parent]; bones[i].position.set(b.head[0] - p.head[0], b.head[1] - p.head[1], b.head[2] - p.head[2]); bones[b.parent].add(bones[i]); }
    bones[i].userData.rest = bones[i].position.clone();
  });
  return bones;
};

/* ---------------------------------------------------------------- IK helpers (world space) */
const IK = {};
IK._a = new THREE.Vector3(); IK._b = new THREE.Vector3(); IK._c = new THREE.Vector3(); IK._d = new THREE.Vector3(); IK._e = new THREE.Vector3();
IK._qa = new THREE.Quaternion(); IK._qb = new THREE.Quaternion(); IK._m = new THREE.Matrix4(); IK._m2 = new THREE.Matrix4();
/* world quaternion that maps (restDir, restUp) onto (dir, up) */
IK.basisQ = function (restDir, restUp, dir, up, out) {
  const x0 = IK._a.copy(restDir).normalize(), z0 = IK._b.crossVectors(x0, restUp).normalize(), y0 = IK._c.crossVectors(z0, x0);
  IK._m.makeBasis(x0, y0, z0);
  const x1 = IK._d.copy(dir).normalize(), z1 = IK._e.crossVectors(x1, up).normalize(); const y1 = _v5.crossVectors(z1, x1);
  IK._m2.makeBasis(x1, y1, z1);
  IK._m2.multiply(IK._m.transpose());
  return out.setFromRotationMatrix(IK._m2);
};
/* set a bone's local quaternion so that its WORLD rotation equals qw (bone rest orientation is identity) */
IK.setWorldQ = function (bone, qw) {
  const pq = bone.parent.getWorldQuaternion(IK._qa);
  bone.quaternion.copy(pq.invert().multiply(qw));
  bone.updateMatrixWorld(true);
};
/* two-bone solve: bones A (upper) and B (lower); root position S (world), target T, pole direction hint P (world).
   restDirA/restDirB: rest bone directions (world at rest), restPoleA: rest bend direction. Lengths la, lb. */
IK.twoBone = function (A, Bb, S, T, P, rd, out) {
  const la = rd.la, lb = rd.lb;
  const st = IK._d.subVectors(T, S); let dist = st.length();
  const maxR = (la + lb) * 0.9995, minR = Math.abs(la - lb) * 1.02 + 1e-3;
  if (dist > maxR) { st.multiplyScalar(maxR / dist); dist = maxR; }
  if (dist < minR) { st.multiplyScalar(minR / Math.max(dist, 1e-5)); dist = minR; }
  const dirST = _v4.copy(st).normalize();
  // elbow: along the S-T line + perpendicular toward the pole
  const a = (la * la - lb * lb + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, la * la - a * a));
  const pole = _v3.copy(P).addScaledVector(dirST, -P.dot(dirST));
  if (pole.lengthSq() < 1e-8) pole.set(0, 0, -1).addScaledVector(dirST, -dirST.z);
  pole.normalize();
  const E = out.elbow.copy(S).addScaledVector(dirST, a).addScaledVector(pole, h);
  const W = out.end.copy(S).addScaledVector(dirST, dist);
  // upper: direction S->E, up = pole-ish (perpendicular, toward the bend side)
  const dA = _v1.subVectors(E, S).normalize();
  const upA = _v2.subVectors(W, E).normalize().negate();   // points from the bend back along the lower bone
  const qA = IK.basisQ(rd.dirA, rd.upA, dA, IK._upFix(dA, upA, pole), out.qA);
  IK.setWorldQ(A, qA);
  const dB = _v1.subVectors(W, E).normalize();
  const qB = IK.basisQ(rd.dirB, rd.upB, dB, IK._upFix(dB, pole, pole), out.qB);
  IK.setWorldQ(Bb, qB);
  return out;
};
IK._t = new THREE.Vector3();
IK._upFix = function (dir, up, pole) { const u = IK._t.copy(pole).addScaledVector(dir, -pole.dot(dir)); if (u.lengthSq() < 1e-8) u.copy(up); return u.normalize(); };
