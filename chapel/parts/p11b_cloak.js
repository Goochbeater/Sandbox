/* CLOAK — Maul's hooded travelling cloak: a rigid hood shell (SDF, skinned to the head/neck) + a verlet cape hung
   from the shoulders. Worn on Tatooine and for the hangar reveal, where he lets it fall. */
const CLOAK = {};
CLOAK.build = async function (T) {
  const J = T.J, hc = [0, J.head[1] + 0.125, J.head[2] + 0.005];
  const items = [], add = (p, op, k) => items.push({ p, op: op || 'su', k: k || 0.001 });
  // cowl: shell around the skull (roomy for the horns), open at the face, falling into a mantle
  add(SDF.ell(hc, [0.155, 0.175, 0.175]));
  add(SDF.ell([hc[0], hc[1] - 0.015, hc[2] - 0.005], [0.137, 0.158, 0.158]), 'ss', 0.01);
  add(SDF.ell([0, hc[1] - 0.072, hc[2] + 0.165], [0.086, 0.13, 0.115], SDF.rot(-10, 0, 0)), 'ss', 0.025);   // oval face opening
  add(SDF.rcone([0, J.neck[1] + 0.02, -0.04], [0, J.shoulder[1] - 0.06, -0.05], 0.125, 0.195), 'su', 0.05);   // mantle round the neck
  add(SDF.rcone([0, J.neck[1] + 0.03, -0.04], [0, J.shoulder[1] - 0.07, -0.05], 0.108, 0.178), 'ss', 0.015);
  add(SDF.box([0, J.shoulder[1] - 0.12, 0.08], [0.3, 0.08, 0.18], 0.0), 'ss', 0.03);
  const g = [{ name: 'hood', items, op: 'su', k: 0.01 }];
  const f0 = SDF.compile(g);
  const fold = (x, y, z) => { const a = Math.atan2(x, z); return 0.0038 * Math.sin(a * 6 + y * 14 + Math.sin(a * 2.3) * 1.4) * smooth(hc[1], hc[1] - 0.25, y); };
  const f = (x, y, z) => f0(x, y, z) + fold(x, y, z);
  let m = MESH.nets(f, [-0.26, J.shoulder[1] - 0.2, -0.3, 0.26, hc[1] + 0.22, 0.26], 0.0048);
  m = MESH.largest(m, 300);
  const A = MESH.fieldAttrs(f, m.pos, m.nv);
  const n = m.nv, idx = new Uint16Array(n * 4), wts = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) { const y = m.pos[v * 3 + 1]; const wh = smooth(J.neck[1] - 0.02, J.head[1] + 0.02, y); idx[v * 4] = 4; wts[v * 4] = wh; idx[v * 4 + 1] = 2; wts[v * 4 + 1] = 1 - wh; }
  const geo = CHAR.skinGeo(m.pos, A.nrm, m.idx, { idx, wts }, { aAO: new THREE.BufferAttribute(A.ao, 1) });
  T.cloak = { geo, mat: CM.cloth(0x202025, 0x3e3e4a, 0.86, 'maulCloak', true) };
  // cape: an arc of panels from shoulder to shoulder round the back, to the ankles
  const y = J.shoulder[1] - 0.02, P = [];
  // one continuous panel (separate panels split apart in a headwind)
  P.push(CLOTH.arcPanel({ y, rx: 0.24, rz: 0.17, cz: -0.02, a0: 64, a1: 296, len: 1.22, rows: 12, cols: 15, flare: 0.5, name: 'cape', mat: 'cape', bone: 2, stiff: 0.8, carry: 0.85, damp: 0.9, grav: 1.8 }));
  T.capeSpec = { panels: P };
};
/* wear / drop */
CLOAK.wear = function (a, on) {
  const I = a.inst;
  if (on && !I.cloakMesh) {
    const T = a.T; if (!T.cloak) return;
    const me = new THREE.SkinnedMesh(T.cloak.geo, T.cloak.mat); me.castShadow = true; me.receiveShadow = true; me.frustumCulled = false; I.inner.add(me); me.bind(I.skel, new THREE.Matrix4());
    I.cloakMesh = me;
    const cs = new ClothSet(T.capeSpec, I); cs.addTo(R.scene); I.cape = cs;
    // the cape also collides with the torso and arms
    const g0 = cs.gather.bind(cs);
    cs.gather = function () { g0(); const B = I.bones, wp = (i) => B[i].getWorldPosition(new THREE.Vector3()); this.col.push([wp(1), wp(3), 0.2]); };
  }
  const qh = I.q && I.q.meshes.find((m) => m.name === 'head_hood');   // modelled hood on the outfit body
  if (qh) { qh.visible = on; if (I.cloakMesh) I.cloakMesh.visible = false; } else if (I.cloakMesh) I.cloakMesh.visible = on;
  if (I.cape) I.cape.setVisible(on);
  a.cloaked = on;
};
/* let the cloak fall: the hood vanishes, the cape unpins and drops to the floor */
CLOAK.drop = function (a) {
  const I = a.inst; if (!I.cape) return;
  I.cloakMesh.visible = false; const qh = I.q && I.q.meshes.find((m) => m.name === 'head_hood'); if (qh) qh.visible = false;
  const cs = I.cape; cs.dropped = true;
  for (const P of cs.panels) { P.pd.cols0 = P.pd.cols; }
  cs.sub = (function (orig) { return function (h) { const B = this.inst.bones; for (const P of this.panels) { const p = P.p, q = P.q, n = P.n; for (let k = 0; k < n; k++) { const x = p[k * 3], yy = p[k * 3 + 1], z = p[k * 3 + 2]; p[k * 3] += (x - q[k * 3]) * 0.96; p[k * 3 + 1] += (yy - q[k * 3 + 1]) * 0.96 - 9.8 * h * h; p[k * 3 + 2] += (z - q[k * 3 + 2]) * 0.96; q[k * 3] = x; q[k * 3 + 1] = yy; q[k * 3 + 2] = z; }
      const C = P.C; for (let it = 0; it < 3; it++) for (let c = 0; c < C.length; c += 4) { const ia = C[c], ib = C[c + 1], L = C[c + 2], s = C[c + 3]; const dx = p[ib * 3] - p[ia * 3], dy = p[ib * 3 + 1] - p[ia * 3 + 1], dz = p[ib * 3 + 2] - p[ia * 3 + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6; if (s < 0.5 && d < L) continue; const df = (d - L) / d * 0.5 * s; p[ia * 3] += dx * df; p[ia * 3 + 1] += dy * df; p[ia * 3 + 2] += dz * df; p[ib * 3] -= dx * df; p[ib * 3 + 1] -= dy * df; p[ib * 3 + 2] -= dz * df; }
      const fy = (this.inst.floorY !== undefined ? this.inst.floorY : 0) + 0.02; for (let k = 0; k < n; k++) if (p[k * 3 + 1] < fy) { p[k * 3 + 1] = fy; q[k * 3] = p[k * 3]; q[k * 3 + 2] = p[k * 3 + 2]; } } void B; }; })(cs.sub);
  a.cloaked = false; I.cape = null; I.droppedCape = cs;
  if (LEVEL.cur) LEVEL.cur.updates.push((dt) => cs.step(dt));
};
