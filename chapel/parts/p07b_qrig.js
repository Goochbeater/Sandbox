/* QB — baked CC0 character assets (Quaternius Universal Base Characters + Universal Animation Library).
   Bodies are 65-bone skinned meshes in a T-pose bind; clips are per-bone WORLD rotation deltas D = W_anim · W_bind⁻¹,
   which apply to any T-pose skeleton. The game's own 19-bone logical rig (RIG) is rebuilt on the body's joints, so
   gameplay keeps its bones; each frame the render skeleton is driven from the logical rig (QB.drive). */
const QB = { ready: false, M: null, buf: null, tex: {}, clips: {} };
QB.load = async function () {
  if (QB.ready) return true;
  const js = document.getElementById('qjson'), bs = document.getElementById('qbin'); if (!js || !bs) return false;
  QB.M = JSON.parse(js.textContent);
  const bin = atob(bs.textContent.trim()), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  QB.buf = u8.buffer;
  QB.NB = QB.M.skel.names.length; QB.idx = {}; QB.M.skel.names.forEach((n, i) => { QB.idx[n] = i; });
  for (const k in QB.M.clips) { const c = QB.M.clips[k]; c.name = k; c.Dq = QB.arr(c.D); c.Pp = QB.arr(c.P); c.fps = 30; QB.clips[k] = c; }
  QB.ready = true; return true;
};
QB.arr = function (r) { const T = { Float32Array, Int16Array, Uint8Array, Uint16Array, Uint32Array }[r.t]; return new T(QB.buf, r.o, r.n); };
QB.texture = async function (name, srgb) {
  const key = name + (srgb ? ':s' : ':l'); if (QB.tex[key]) return QB.tex[key];
  const el = document.getElementById('tex_' + name); if (!el) return null;
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + el.textContent.trim(); try { await img.decode(); } catch (e) { /* */ }
  const t = new THREE.Texture(img); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  QB.tex[key] = t; return t;
};
/* bind data of a body: world bind rotation/translation per joint (inner space, metres, facing +Z, +X = left) */
QB.bind = function (key) { const m = QB.M.meshes[key]; return { wr: m.wr, wt: m.wt, lr: m.lr, lt: m.lt, ibm: QB.arr(m.ibm) }; };
/* geometry of a mesh entry (body / hair), grouped per primitive; returns { geo, mats: [materialName...], names } */
QB.geometry = function (key, filter) {
  const m = QB.M.meshes[key], prims = m.prims.filter((p) => !filter || filter(p));
  let nv = 0, ni = 0; for (const p of prims) { nv += p.nv; ni += p.nt * 3; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), J = new Uint16Array(nv * 4), W = new Float32Array(nv * 4), I = new Uint32Array(ni);
  const geo = new THREE.BufferGeometry(); let vo = 0, io = 0; const mats = [], names = [];
  prims.forEach((p, gi) => {
    pos.set(QB.arr(p.pos), vo * 3); const n16 = QB.arr(p.nrm); for (let i = 0; i < n16.length; i++) nrm[vo * 3 + i] = n16[i] / 32767;
    if (p.uv) uv.set(QB.arr(p.uv), vo * 2);
    const j8 = QB.arr(p.j), w8 = QB.arr(p.w); for (let i = 0; i < p.nv * 4; i++) { J[vo * 4 + i] = j8[i]; W[vo * 4 + i] = w8[i] / 255; }
    const ind = QB.arr(p.idx); for (let i = 0; i < ind.length; i++) I[io + i] = ind[i] + vo;
    geo.addGroup(io, ind.length, gi); mats.push(p.mat); names.push(p.name);
    vo += p.nv; io += ind.length;
  });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(J, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4));
  geo.setIndex(new THREE.BufferAttribute(I, 1)); geo.computeBoundingSphere();
  return { geo, mats, names };
};
/* ---------------------------------------------------------------- clips
   sample world deltas for every joint at time t into out (Float32Array NB*4) + pelvis offset (Vector3) */
QB._qa = new THREE.Quaternion(); QB._qb = new THREE.Quaternion();
QB.sample = function (c, t, loop, out, pel) {
  const nf = c.nf, NB = QB.NB; let f = t * c.fps;
  if (loop) { f = ((f % (nf - 1)) + (nf - 1)) % (nf - 1); } else f = Math.max(0, Math.min(nf - 1, f));
  const i0 = Math.floor(f), i1 = Math.min(nf - 1, i0 + 1), u = f - i0, D = c.Dq, a = QB._qa, b = QB._qb, s = 1 / 32767;
  for (let k = 0; k < NB; k++) {
    const o0 = (i0 * NB + k) * 4, o1 = (i1 * NB + k) * 4;
    a.set(D[o0] * s, D[o0 + 1] * s, D[o0 + 2] * s, D[o0 + 3] * s); b.set(D[o1] * s, D[o1 + 1] * s, D[o1 + 2] * s, D[o1 + 3] * s);
    a.slerp(b, u).normalize(); out[k * 4] = a.x; out[k * 4 + 1] = a.y; out[k * 4 + 2] = a.z; out[k * 4 + 3] = a.w;
  }
  if (pel) { const P = c.Pp; pel.set(P[i0 * 3] + (P[i1 * 3] - P[i0 * 3]) * u, P[i0 * 3 + 1] + (P[i1 * 3 + 1] - P[i0 * 3 + 1]) * u, P[i0 * 3 + 2] + (P[i1 * 3 + 2] - P[i0 * 3 + 2]) * u); }
  return out;
};
/* logical rig <-> Q joints. Our 19 bones and the Q joint each one's rotation is taken from. */
QB.MAP = ['pelvis', 'spine_02', 'spine_03', 'neck_01', 'Head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r'];
/* joints for RIG.def from a body's bind pose (scaled) */
QB.joints = function (key, s) {
  const b = QB.bind(key), P = (n, d) => { const v = b.wt[QB.idx[n]]; return [v[0] * s + (d ? d[0] : 0), v[1] * s + (d ? d[1] : 0), v[2] * s + (d ? d[2] : 0)]; };
  const hl = P('hand_l'), mid = P('middle_01_l'), fist = [hl[0] + (mid[0] - hl[0]) * 0.72, hl[1] + (mid[1] - hl[1]) * 0.72 - 0.012 * s, hl[2] + (mid[2] - hl[2]) * 0.72 + 0.004 * s];
  const hd = P('Head');
  return { pelvis: P('pelvis'), spine: P('spine_01'), chest: P('spine_03'), neck: P('neck_01'), head: hd, headTop: [0, hd[1] + 0.2 * s, hd[2] + 0.015 * s],
    clav: P('clavicle_l'), shoulder: P('upperarm_l'), elbow: P('lowerarm_l'), wrist: hl, fist, hip: P('thigh_l'), knee: P('calf_l'), ankle: P('foot_l'), toe: P('ball_l') };
};
