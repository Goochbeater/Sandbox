/* ASSETS — the baked CC0 character bundle (Quaternius base bodies, outfits, hair and Universal Animation Library clips),
   cut down from the character kit by tools/trim_assets.py and embedded in the page as #kjson (layout), #kbin (base64
   binary) and #tex_<name> (JPEG textures). Same layout as the kit's q.json / q.bin:
     skel     65 joint names + parents (one skeleton for every body)
     meshes   per body: bind pose (lt/lr local, wt/wr world, ibm inverse bind matrices) and primitives
              (pos, nrm int16, uv, 4 joints + 4 weights per vertex, indices, material name)
     clips    per clip: nf frames at 30 fps of per-joint WORLD rotation deltas D = W_anim · W_bind⁻¹ (int16 quaternions,
              so they retarget onto any body on this skeleton) + the pelvis offset P, normalised by the clip's pelvisH */
const QA = { tx: {} };
QA.load = function () {
  if (QA.M) return;
  QA.M = JSON.parse($('kjson').textContent);
  const bin = atob($('kbin').textContent.trim()), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  QA.buf = u8.buffer; QA.NB = QA.M.skel.names.length; QA.idx = {}; QA.M.skel.names.forEach((n, i) => { QA.idx[n] = i; });
  QA.clips = {}; for (const k in QA.M.clips) { const c = QA.M.clips[k]; c.name = k; c.Dq = QA.arr(c.D); c.Pp = QA.arr(c.P); QA.clips[k] = c; }
};
QA.arr = (r) => new ({ Float32Array, Int16Array, Uint8Array, Uint16Array, Uint32Array }[r.t])(QA.buf, r.o, r.n);
QA.tex = async function (name) {
  if (QA.tx[name]) return QA.tx[name];
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + $('tex_' + name).textContent.trim(); await img.decode();
  const t = new THREE.Texture(img); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return (QA.tx[name] = t);
};
/* geometry of a mesh entry, optionally only some primitives */
QA.geometry = function (key, filter) {
  const m = QA.M.meshes[key], prims = m.prims.filter((p) => !filter || filter(p));
  let nv = 0, ni = 0; for (const p of prims) { nv += p.nv; ni += p.nt * 3; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), J = new Uint16Array(nv * 4), W = new Float32Array(nv * 4), I = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const p of prims) {
    pos.set(QA.arr(p.pos), vo * 3); const n16 = QA.arr(p.nrm); for (let i = 0; i < n16.length; i++) nrm[vo * 3 + i] = n16[i] / 32767;
    if (p.uv) uv.set(QA.arr(p.uv), vo * 2);
    const j8 = QA.arr(p.j), w8 = QA.arr(p.w); for (let i = 0; i < p.nv * 4; i++) { J[vo * 4 + i] = j8[i]; W[vo * 4 + i] = w8[i] / 255; }
    const ind = QA.arr(p.idx); for (let i = 0; i < ind.length; i++) I[io + i] = ind[i] + vo;
    vo += p.nv; io += ind.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(J, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4)); g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
};
/* drop triangles unless all three corners pass fn */
QA.keep = function (g, fn) { const P = g.attributes.position, I = g.index.array, out = []; for (let t = 0; t < I.length; t += 3) { if ([I[t], I[t + 1], I[t + 2]].every((i) => fn(P.getX(i), P.getY(i), P.getZ(i)))) out.push(I[t], I[t + 1], I[t + 2]); } g.setIndex(out); return g; };
/* hair modelled for the other head: moved and scaled from one head to the other */
QA.HAIR_SRC = { Hair_Long: 'female', Hair_Buns: 'female' };
QA.refit = function (g, from, to) {
  if (from === to) return g;
  const a = QA.M.meshes[from].wt[QA.idx.Head], b = QA.M.meshes[to].wt[QA.idx.Head], k = from === 'female' ? [1.06, 1.0, 1.04] : [0.94, 1.0, 0.96], P = g.attributes.position;
  for (let i = 0; i < P.count; i++) P.setXYZ(i, b[0] + (P.getX(i) - a[0]) * k[0], b[1] + (P.getY(i) - a[1]) * k[1], b[2] + (P.getZ(i) - a[2]) * k[2]);
  P.needsUpdate = true; return g;
};
/* sample a clip at time t (looping) into per-joint world deltas + the pelvis offset scaled to a body's pelvis height */
QA._a = new THREE.Quaternion(); QA._b = new THREE.Quaternion();
QA.sample = function (c, t, out, pel, pelvisH) {
  const nf = c.nf, NB = QA.NB; let f = ((t * 30) % (nf - 1) + (nf - 1)) % (nf - 1);
  const i0 = Math.floor(f), i1 = Math.min(nf - 1, i0 + 1), u = f - i0, D = c.Dq, a = QA._a, b = QA._b, s = 1 / 32767;
  for (let k = 0; k < NB; k++) { const o0 = (i0 * NB + k) * 4, o1 = (i1 * NB + k) * 4;
    a.set(D[o0] * s, D[o0 + 1] * s, D[o0 + 2] * s, D[o0 + 3] * s); b.set(D[o1] * s, D[o1 + 1] * s, D[o1 + 2] * s, D[o1 + 3] * s); out[k].copy(a.slerp(b, u).normalize()); }
  const Pp = c.Pp, k = pelvisH / c.pelvisH;
  pel.set(lerp(Pp[i0 * 3], Pp[i1 * 3], u) * k, lerp(Pp[i0 * 3 + 1], Pp[i1 * 3 + 1], u) * k, lerp(Pp[i0 * 3 + 2], Pp[i1 * 3 + 2], u) * k);
};
/* forward-kinematics foot travel of a loop relative to the pelvis: proportional to its ground speed (Walk_Loop = 1.0 m/s) */
QA.stride = function (name, bind) {
  const c = QA.clips[name], B = QA.M.meshes[bind || 'rmale'], wr = B.wr.map((r) => new THREE.Quaternion().fromArray(r)), D = wr.map(() => new THREE.Quaternion()), p = new THREE.Vector3(), P = QA.M.skel.parents, foot = QA.idx.foot_l;
  let mn = 9, mx = -9;
  for (let f = 0; f < c.nf - 1; f++) { QA.sample(c, f / 30, D, p, 1);
    const W = D.map((d, i) => d.clone().multiply(wr[i])), pos = [];
    for (let i = 0; i < W.length; i++) pos.push(P[i] < 0 ? new THREE.Vector3() : new THREE.Vector3().fromArray(B.lt[i]).applyQuaternion(W[P[i]]).add(pos[P[i]]));
    const z = pos[foot].z - pos[1].z; mn = Math.min(mn, z); mx = Math.max(mx, z); }
  return mx - mn;
};
QA.speedOf = {};
QA.speed = function (name) { if (!QA.speedOf[name]) QA.speedOf[name] = name === 'Walk_Loop' ? 1.0 : QA.stride(name) / QA.stride('Walk_Loop'); return QA.speedOf[name]; };
