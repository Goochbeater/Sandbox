/* RAGDOLL — the struck-down go limp: verlet particles on the rig's joints (+ head top and toes), bone-length and
   torso-brace constraints, ground contact with friction, the body capsule against the level's walls. Every frame the
   19-bone rig is rebuilt from the particles (root from the hip / spine basis, each bone the minimal turn from its parent
   frame onto its particle), so the base-body skeleton and the cloth follow as usual. The killing blow sets the launch. */
const RAG = { list: [] };
// particle -> bone whose head it sits on (-1 = derived); radius
RAG.PB = [0, 1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18];
RAG.R = [0.13, 0.12, 0.13, 0.07, 0.1, 0.06, 0.05, 0.05, 0.06, 0.05, 0.05, 0.08, 0.06, 0.05, 0.08, 0.06, 0.05, 0.1, 0.04, 0.04];
// 17 head top, 18 toe L, 19 toe R
RAG.BONES = [[1, 2], [2, 3], [3, 4], [4, 17], [5, 5], [6, 6], [7, 7], [9, 8], [10, 9], [11, 10], [13, 12], [14, 13], [15, 18], [16, 15], [17, 16], [18, 19]];   // [bone, target particle]
RAG.PAR = [-1, 0, 1, 2, 3, 2, 5, 6, 7, 2, 9, 10, 11, 0, 13, 14, 0, 16, 17];
RAG.C = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 17], [2, 5], [5, 6], [6, 7], [2, 8], [8, 9], [9, 10], [0, 11], [11, 12], [12, 13], [0, 14], [14, 15], [15, 16], [13, 18], [16, 19],
  // braces: a rigid torso box, head on the shoulders, feet at an angle to the shins, no knee / elbow folding flat
  [5, 8], [11, 14], [5, 11], [8, 14], [5, 14], [8, 11], [0, 2], [3, 5], [3, 8], [4, 5], [4, 8], [2, 4], [1, 5], [1, 8], [12, 18], [15, 19], [2, 17], [0, 3]];
RAG.MIN = [[11, 13, 0.62], [14, 16, 0.62], [5, 7, 0.5], [8, 10, 0.5], [7, 11, 0.12], [10, 14, 0.12], [13, 16, 0.12], [7, 10, 0.1]];   // [a, b, fraction of rest length kept at least]
RAG.start = function (a, dir, force, hitP) {
  const I = a.inst, B = I.bones, T = a.T, n = 20; a.inst.root.updateMatrixWorld(true);
  const x = new Float32Array(n * 3), xp = new Float32Array(n * 3), v = new THREE.Vector3();
  for (let i = 0; i < 17; i++) { B[RAG.PB[i]].getWorldPosition(v); x[i * 3] = v.x; x[i * 3 + 1] = v.y; x[i * 3 + 2] = v.z; }
  const loc = (bone, p, q) => { v.set(...V.sub(p, q)).applyMatrix4(new THREE.Matrix4().extractRotation(B[bone].matrixWorld)).multiplyScalar(I.scale || 1).add(B[bone].getWorldPosition(_v5)); return v; };
  const J = T.J; const put = (i, w) => { x[i * 3] = w.x; x[i * 3 + 1] = w.y; x[i * 3 + 2] = w.z; };
  put(17, loc(4, J.headTop, J.head)); put(18, loc(15, J.toe, J.ankle)); put(19, loc(18, [-J.toe[0], J.toe[1], J.toe[2]], [-J.ankle[0], J.ankle[1], J.ankle[2]]));
  // launch: the body keeps its motion; the blow shoves the upper body hardest so it topples over the feet
  const h = 1 / 60, d = dir || V3(0, 0, -1), F = force || 3;
  const wUp = [0.55, 0.7, 0.9, 1, 1, 0.9, 0.8, 0.8, 0.9, 0.8, 0.8, 0.5, 0.35, 0.2, 0.5, 0.35, 0.2, 1, 0.2, 0.2];
  for (let i = 0; i < n; i++) { const k = wUp[i]; const vx = (a.vx || 0) + d.x * F * k, vy = Math.max(0, a.vy || 0) + F * (0.18 + 0.2 * k), vz = (a.vz || 0) + d.z * F * k;
    xp[i * 3] = x[i * 3] - vx * h; xp[i * 3 + 1] = x[i * 3 + 1] - vy * h; xp[i * 3 + 2] = x[i * 3 + 2] - vz * h; }
  // a spin: the hit point side goes first
  if (hitP) { const s = (rnd(0, 1) < 0.5 ? 1 : -1) * F * 0.25; for (const i of [5, 6, 7]) xp[i * 3 + 1] += s * h; for (const i of [8, 9, 10]) xp[i * 3 + 1] -= s * h; }
  const L = (c) => Math.hypot(x[c[0] * 3] - x[c[1] * 3], x[c[0] * 3 + 1] - x[c[1] * 3 + 1], x[c[0] * 3 + 2] - x[c[1] * 3 + 2]);
  const rest = RAG.C.map(L), mins = RAG.MIN.map((m) => L(m) * m[2]);
  const r = { a, x, xp, rest, mins, t: 0, sleep: 0, acc: 0, touch: 0, ground: new Float32Array(n).fill(-1e9) };
  a.rag = r; a.topple = null; RAG.list.push(r);
  if (I.prop && a.setProp) a.setProp(null);
  return r;
};
RAG.step = function (r, h) {
  const x = r.x, xp = r.xp, n = 20, a = r.a, g = -9.8 * h * h;
  for (let i = 0; i < n; i++) { const o = i * 3; const vx = (x[o] - xp[o]) * 0.995, vy = (x[o + 1] - xp[o + 1]) * 0.995, vz = (x[o + 2] - xp[o + 2]) * 0.995; xp[o] = x[o]; xp[o + 1] = x[o + 1]; xp[o + 2] = x[o + 2]; x[o] += vx; x[o + 1] += vy + g; x[o + 2] += vz; }
  const C = RAG.C, rest = r.rest;
  for (let it = 0; it < 8; it++) {
    for (let c = 0; c < C.length; c++) { const i = C[c][0] * 3, j = C[c][1] * 3; const dx = x[j] - x[i], dy = x[j + 1] - x[i + 1], dz = x[j + 2] - x[i + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6, f = (d - rest[c]) / d * 0.5 * (c < 19 ? 1 : 0.8);
      x[i] += dx * f; x[i + 1] += dy * f; x[i + 2] += dz * f; x[j] -= dx * f; x[j + 1] -= dy * f; x[j + 2] -= dz * f; }
    for (let c = 0; c < RAG.MIN.length; c++) { const i = RAG.MIN[c][0] * 3, j = RAG.MIN[c][1] * 3, m = r.mins[c]; const dx = x[j] - x[i], dy = x[j + 1] - x[i + 1], dz = x[j + 2] - x[i + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6; if (d >= m) continue; const f = (d - m) / d * 0.5;
      x[i] += dx * f; x[i + 1] += dy * f; x[i + 2] += dz * f; x[j] -= dx * f; x[j + 1] -= dy * f; x[j + 2] -= dz * f; }
    // ground + friction
    for (let i = 0; i < n; i++) { const o = i * 3, rr = RAG.R[i]; let gy = r.ground[i];
      if (it === 0) { const gg = PHY.ground(x[o], x[o + 2], 0.05, x[o + 1] + 0.5, x[o + 1] - 3); gy = r.ground[i] = gg === null ? -1e9 : gg; }
      if (x[o + 1] - rr < gy) { x[o + 1] = gy + rr; if (xp[o + 1] < x[o + 1]) xp[o + 1] = x[o + 1]; r.touch |= 1 << i; } }
  }
  // sliding friction on everything touching the ground (once per step)
  for (let i = 0; i < n; i++) if (r.touch & (1 << i)) { const o = i * 3; xp[o] += (x[o] - xp[o]) * 0.22; xp[o + 2] += (x[o + 2] - xp[o + 2]) * 0.22; }
  r.touch = 0;
  // walls: slide the pelvis capsule through the level collision and carry the whole body with it
  const px = x[0], pz = x[2], ox = a.x, oz = a.z; a.x = r.px === undefined ? px : r.px; a.z = r.pz === undefined ? pz : r.pz;
  PHY.move(a, px - a.x, pz - a.z); const cx = a.x - px, cz = a.z - pz;
  if (Math.abs(cx) + Math.abs(cz) > 1e-5) for (let i = 0; i < n; i++) { x[i * 3] += cx; x[i * 3 + 2] += cz; xp[i * 3] += cx * 0.7; xp[i * 3 + 2] += cz * 0.7; }
  r.px = a.x; r.pz = a.z; void ox; void oz;
  let ke = 0; for (let i = 0; i < n * 3; i++) { const dv = x[i] - xp[i]; ke += dv * dv; }
  r.sleep = ke < 2e-7 ? r.sleep + h : 0;
};
RAG._q = new THREE.Quaternion(); RAG._q2 = new THREE.Quaternion(); RAG._m = new THREE.Matrix4(); RAG._a = new THREE.Vector3(); RAG._b = new THREE.Vector3(); RAG._c = new THREE.Vector3(); RAG._d = new THREE.Vector3();
RAG.pose = function (r) {
  const a = r.a, I = a.inst, B = I.bones, x = r.x, T = a.T, def = T.def, P = (i, out) => out.set(x[i * 3], x[i * 3 + 1], x[i * 3 + 2]);
  // the actor's origin rides under the pelvis so culling, shadows and the vanish effect stay with the body
  a.x = x[0]; a.z = x[2]; I.root.position.set(a.x, a.y, a.z);
  I.root.updateMatrixWorld(true);
  const inner = I.inner, innerQ = inner.getWorldQuaternion(RAG._q2);
  // root: current hip/spine basis against the rest basis
  if (!r.restB) { const J = T.J; const up = RAG._a.set(...V.sub(J.chest, J.pelvis)).normalize(), lf = RAG._b.set(...V.sub(J.hip, [-J.hip[0], J.hip[1], J.hip[2]])).normalize();
    r.restB = new THREE.Matrix4(); const xx = lf.clone().addScaledVector(up, -lf.dot(up)).normalize(), zz = new THREE.Vector3().crossVectors(xx, up); r.restB.makeBasis(xx, up.clone(), zz); r.restBi = r.restB.clone().invert(); }
  const up = P(2, RAG._a).sub(P(0, RAG._c)).normalize(), lf = P(11, RAG._b).sub(P(14, RAG._d)).normalize();
  const xx = lf.addScaledVector(up, -lf.dot(up)).normalize(), zz = RAG._c.crossVectors(xx, up);
  const qW = RAG._q.setFromRotationMatrix(RAG._m.makeBasis(xx, up, zz).multiply(r.restBi));
  IK.setWorldQ(B[0], qW);
  B[0].position.copy(inner.worldToLocal(P(0, RAG._d)));
  B[0].updateMatrixWorld(true);
  const sc = I.scale || 1;
  for (const [bi, pi] of RAG.BONES) {
    const b = B[bi], par = B[RAG.PAR[bi]]; par.updateMatrixWorld(true);
    const pq = par.getWorldQuaternion(RAG._q2), d = def[bi], rest = RAG._a.set(d.tail[0] - d.head[0], d.tail[1] - d.head[1], d.tail[2] - d.head[2]).applyQuaternion(pq).normalize();
    b.position.copy(b.userData.rest); b.quaternion.identity(); b.updateMatrixWorld(true);
    const cur = P(pi, RAG._b).sub(b.getWorldPosition(RAG._c)); if (cur.lengthSq() < 1e-8) continue; cur.normalize();
    const q = RAG._q.setFromUnitVectors(rest, cur).multiply(pq); IK.setWorldQ(b, q); b.updateMatrixWorld(true);
  }
  for (const bi of [8, 12]) { B[bi].quaternion.set(0, 0, 0, 1); }
  void sc;
  if (I.q) { I.q.gripL = 0.35; I.q.gripR = 0.35; QB.drive(I); }
};
RAG.update = function (a, dt) {
  const r = a.rag; if (!r) return;
  r.t += dt; r.acc += Math.min(dt, 0.05); const h = 1 / 90;
  if (r.sleep < 0.6) { let k = 0; while (r.acc >= h && k < 6) { RAG.step(r, h); r.acc -= h; k++; } if (k === 6) r.acc = 0; }
  RAG.pose(r);
  if (a.inst.cloth) a.inst.cloth.step(dt);
  if (a.inst.cape) a.inst.cape.step(dt);
};
