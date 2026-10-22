// Bake Quaternius CC0 assets into assets/q.bin + assets/q.json (+ JPEG textures in assets/).
// Bodies/hair: skinned meshes + skeleton bind data. Clips: per-bone WORLD rotation deltas D(t) = W_anim * W_bind^-1
// (skeleton-agnostic: apply to any T-pose bind), pelvis world offset from bind, 30 fps, int16-quantised.
const { load } = require('./gltf.js');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const A = process.env.HOME + '/maul-assets';
const BC = A + '/UBC/Universal Base Characters[Standard]/Base Characters/Godot - UE/';
const HR = A + '/UBC/Universal Base Characters[Standard]/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/';
const OUT = path.resolve(__dirname, '../assets');
// ---- tiny math
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qinv = (a) => [-a[0], -a[1], -a[2], a[3]];
const qrot = (q, v) => { const u = [q[0], q[1], q[2]], s = q[3]; const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], uu = u[0] * u[0] + u[1] * u[1] + u[2] * u[2]; const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; return [0, 1, 2].map((i) => 2 * d * u[i] + (s * s - uu) * v[i] + 2 * s * c[i]); };
const qnorm = (q) => { const l = Math.hypot(...q) || 1; return q.map((x) => x / l); };
const qslerp = (a, b, t) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; let bb = b; if (d < 0) { d = -d; bb = b.map((x) => -x); } if (d > 0.9995) return qnorm(a.map((x, i) => x + (bb[i] - x) * t)); const th = Math.acos(d), s = Math.sin(th); return a.map((x, i) => (x * Math.sin((1 - t) * th) + bb[i] * Math.sin(t * th)) / s); };
// ---- binary writer
const chunks = []; let off = 0; const put = (typed) => { const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength); const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; } const o = off; chunks.push(b); off += b.length; return { o, n: typed.length, t: typed.constructor.name }; };
const M = { skel: null, meshes: {}, clips: {}, tex: {} };
// ---- skeleton (from a file): names, parents, local bind TRS, world bind (from IBM)
function skeleton(G) {
  const J = G.json, s = J.skins[0], names = s.joints.map((j) => J.nodes[j].name), idx = {}; s.joints.forEach((j, k) => (idx[j] = k));
  const parentOf = {}; J.nodes.forEach((n, i) => (n.children || []).forEach((c) => (parentOf[c] = i)));
  const parents = s.joints.map((j) => (parentOf[j] !== undefined && idx[parentOf[j]] !== undefined ? idx[parentOf[j]] : -1));
  const lt = s.joints.map((j) => J.nodes[j].translation || [0, 0, 0]), lr = s.joints.map((j) => J.nodes[j].rotation || [0, 0, 0, 1]), ls = s.joints.map((j) => J.nodes[j].scale || [1, 1, 1]);
  const ibm = G.acc(s.inverseBindMatrices).data;
  // world bind rotation/translation via FK of the node locals (from the armature root, which sits at identity)
  const wr = [], wt = [];
  for (let k = 0; k < names.length; k++) { const p = parents[k]; if (p < 0) { wr[k] = qnorm(lr[k]); wt[k] = lt[k].slice(); } else { wr[k] = qnorm(qmul(wr[p], lr[k])); const v = qrot(wr[p], lt[k]); wt[k] = [wt[p][0] + v[0], wt[p][1] + v[1], wt[p][2] + v[2]]; } }
  return { names, parents, lt, lr, ls, ibm, wr, wt, joints: s.joints };
}
// ---- skinned mesh primitive -> compact arrays
function meshPrim(G, mi, pi, jointRemap) {
  const p = G.json.meshes[mi].primitives[pi], a = p.attributes;
  const pos = G.acc(a.POSITION).data, nrm = G.acc(a.NORMAL).data, uv = a.TEXCOORD_0 !== undefined ? G.acc(a.TEXCOORD_0).data : null;
  const jn = G.acc(a.JOINTS_0).data, wt = G.acc(a.WEIGHTS_0).data, ind = G.acc(p.indices).data;
  const nv = pos.length / 3, J8 = new Uint8Array(nv * 4), W8 = new Uint8Array(nv * 4);
  for (let v = 0; v < nv; v++) { let s = 0; for (let k = 0; k < 4; k++) s += wt[v * 4 + k]; let acc = 0; for (let k = 0; k < 4; k++) { J8[v * 4 + k] = jointRemap ? jointRemap[jn[v * 4 + k]] : jn[v * 4 + k]; const w = k < 3 ? Math.round(wt[v * 4 + k] / s * 255) : 255 - acc; W8[v * 4 + k] = Math.max(0, w); acc += k < 3 ? Math.round(wt[v * 4 + k] / s * 255) : 0; } }
  const N16 = new Int16Array(nrm.length); for (let i = 0; i < nrm.length; i++) N16[i] = Math.round(nrm[i] * 32767);
  const I = nv < 65536 ? new Uint16Array(ind) : new Uint32Array(ind);
  return { pos: put(new Float32Array(pos)), nrm: put(N16), uv: uv ? put(new Float32Array(uv)) : null, j: put(J8), w: put(W8), idx: put(I), nv, nt: ind.length / 3, mat: G.json.materials[p.material].name };
}
function jpg(src, name, px, q) { const dst = path.join(OUT, name); execSync(`sips -s format jpeg -s formatOptions ${q} -Z ${px} "${src}" --out "${dst}"`, { stdio: 'ignore' }); M.tex[name] = fs.statSync(dst).size; }
// ---- bodies
for (const [key, file, tex] of [['male', 'Superhero_Male_FullBody.gltf', ['T_Superhero_Male_Dark', 'T_Superhero_Male_Normal', 'T_Superhero_Male_Roughness']], ['female', 'Superhero_Female_FullBody.gltf', ['T_Superhero_Female_Dark_BaseColor', 'T_Superhero_Female_Normal', 'T_Superhero_Female_Roughness']]]) {
  const G = load(BC + file), S = skeleton(G);
  if (!M.skel) M.skel = { names: S.names, parents: S.parents };
  const remap = S.names.map((n) => M.skel.names.indexOf(n));
  const prims = []; G.json.meshes.forEach((m, mi) => m.primitives.forEach((p, pi) => prims.push(Object.assign(meshPrim(G, mi, pi, remap), { name: m.name }))));
  const ibm = new Float32Array(M.skel.names.length * 16); S.names.forEach((n, k) => ibm.set(S.ibm.subarray(k * 16, k * 16 + 16), remap[k] * 16));
  const lt = [], lr = []; S.names.forEach((n, k) => { lt[remap[k]] = S.lt[k]; lr[remap[k]] = S.lr[k]; });
  const wt = [], wr = []; S.names.forEach((n, k) => { wt[remap[k]] = S.wt[k]; wr[remap[k]] = S.wr[k]; });
  M.meshes[key] = { prims, ibm: put(ibm), lt, lr, wt, wr };
  jpg(BC + tex[0] + '.png', key + '_col.jpg', 2048, 82); jpg(BC + tex[1] + '.png', key + '_nrm.jpg', 2048, 88); jpg(BC + tex[2] + '.png', key + '_rgh.jpg', 1024, 80);
}
jpg(BC + 'T_Hair_1_BaseColor.png', 'hair1_col.jpg', 1024, 82); jpg(BC + 'T_Hair_1_Normal.png', 'hair1_nrm.jpg', 1024, 85);
jpg(BC + 'T_Hair_2_BaseColor.png', 'hair2_col.jpg', 1024, 82); jpg(BC + 'T_Eye_Brown.png', 'eye_col.jpg', 256, 85);
// ---- hair (rigged to Head bone)
for (const h of ['Hair_Long', 'Hair_Beard', 'Hair_SimpleParted', 'Hair_Buzzed', 'Hair_Buns', 'Hair_BuzzedFemale', 'Eyebrows_Regular', 'Eyebrows_Female']) {
  const G = load(HR + h + '.gltf'); const S = skeleton(G); const remap = S.names.map((n) => M.skel.names.indexOf(n));
  const prims = []; G.json.meshes.forEach((m, mi) => m.primitives.forEach((p, pi) => prims.push(Object.assign(meshPrim(G, mi, pi, remap), { name: m.name }))));
  M.meshes[h] = { prims };
}
// ---- outfits (Modular Character Outfits - Fantasy, CC0): regular-proportion bodies on the same 65-joint skeleton.
// Each outfit's bind becomes a body key ('rmale' / 'rfemale', no prims); its parts are prim lists named by mesh.
const OF = A + '/MCOF/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits/';
for (const [key, file, bind] of [['rm_ranger', 'Male_Ranger', 'rmale'], ['rm_peasant', 'Male_Peasant', 'rmale'], ['rf_ranger', 'Female_Ranger', 'rfemale'], ['rf_peasant', 'Female_Peasant', 'rfemale']]) {
  const G = load(OF + file + '.gltf'), S = skeleton(G), remap = S.names.map((n) => M.skel.names.indexOf(n));
  if (remap.some((r) => r < 0)) throw new Error('outfit joint missing ' + file);
  const prims = []; G.json.meshes.forEach((m, mi) => m.primitives.forEach((p, pi) => prims.push(Object.assign(meshPrim(G, mi, pi, remap), { name: m.name }))));
  if (!M.meshes[bind]) {
    const ibm = new Float32Array(M.skel.names.length * 16); S.names.forEach((n, k) => ibm.set(S.ibm.subarray(k * 16, k * 16 + 16), remap[k] * 16));
    const lt = [], lr = [], wt = [], wr = []; S.names.forEach((n, k) => { lt[remap[k]] = S.lt[k]; lr[remap[k]] = S.lr[k]; wt[remap[k]] = S.wt[k]; wr[remap[k]] = S.wr[k]; });
    M.meshes[bind] = { prims: [], ibm: put(ibm), lt, lr, wt, wr };
  }
  M.meshes[key] = { prims, bind };
}
// ---- clips
const src = [[A + '/UAL1/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb', ['A_TPose', 'Idle_Loop', 'Sword_Idle', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Roll', 'Hit_Chest', 'Hit_Head', 'Death01', 'Punch_Jab', 'Punch_Cross', 'Sword_Attack', 'Spell_Simple_Enter', 'Spell_Simple_Shoot', 'Spell_Simple_Exit', 'Spell_Simple_Idle_Loop', 'Pistol_Idle_Loop', 'Pistol_Aim_Neutral', 'Pistol_Aim_Up', 'Pistol_Aim_Down', 'Pistol_Shoot', 'Pistol_Reload', 'Push_Loop', 'Interact', 'Driving_Loop', 'Idle_Talking_Loop', 'Fixing_Kneeling', 'Sitting_Idle_Loop']],
  [A + '/UAL2/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb', ['Hit_Knockback', 'LayToIdle', 'Idle_FoldArms_Loop', 'Melee_Hook', 'Melee_Hook_Rec', 'NinjaJump_Start', 'NinjaJump_Idle_Loop', 'NinjaJump_Land', 'OverhandThrow', 'Slide_Start', 'Slide_Loop', 'Slide_Exit', 'Sword_Block', 'Sword_Dash', 'Sword_Heavy_Combo', 'Sword_Regular_A', 'Sword_Regular_A_Rec', 'Sword_Regular_B', 'Sword_Regular_B_Rec', 'Sword_Regular_C', 'Sword_Regular_Combo', 'Idle_Shield_Break', 'Idle_Shield_Loop', 'Shield_Dash', 'ClimbUp_1m']]];
const FPS = 30;
for (const [file, list] of src) {
  const G = load(file), J = G.json, S = skeleton(G);
  const remap = S.names.map((n) => M.skel.names.indexOf(n)), nodeToK = {}; S.joints.forEach((j, k) => (nodeToK[j] = k));
  const pelvisK = S.names.indexOf('pelvis');
  for (const an of J.animations) {
    if (!list.includes(an.name)) continue;
    const ch = {}; let dur = 0;
    for (const c of an.channels) { const k = nodeToK[c.target.node]; if (k === undefined) continue; const smp = an.samplers[c.sampler]; const t = G.acc(smp.input).data, v = G.acc(smp.output).data; dur = Math.max(dur, t[t.length - 1]); (ch[k] = ch[k] || {})[c.target.path] = { t, v, n: c.target.path === 'rotation' ? 4 : 3 }; }
    const nf = Math.max(1, Math.round(dur * FPS) + 1), nb = S.names.length;
    const sampleCh = (c, time) => { const t = c.t, n = c.n; if (time <= t[0]) return Array.from(c.v.subarray(0, n)); if (time >= t[t.length - 1]) return Array.from(c.v.subarray((t.length - 1) * n, t.length * n)); let i = 0; while (i < t.length - 2 && time > t[i + 1]) i++; const u = (time - t[i]) / (t[i + 1] - t[i]); const a = Array.from(c.v.subarray(i * n, i * n + n)), b = Array.from(c.v.subarray((i + 1) * n, (i + 2) * n)); return n === 4 ? qslerp(a, b, u) : a.map((x, q) => x + (b[q] - x) * u); };
    const D = new Int16Array(nf * nb * 4), P = new Float32Array(nf * 3); const constant = new Uint8Array(nb).fill(1);
    const frames = [];
    for (let f = 0; f < nf; f++) {
      const time = Math.min(dur, f / FPS), wr = [], wt = [];
      for (let k = 0; k < nb; k++) { const c = ch[k] || {}; const lr = c.rotation ? qnorm(sampleCh(c.rotation, time)) : S.lr[k], lt = c.translation ? sampleCh(c.translation, time) : S.lt[k]; const p = S.parents[k];
        if (p < 0) { wr[k] = lr; wt[k] = lt; } else { wr[k] = qnorm(qmul(wr[p], lr)); const v = qrot(wr[p], lt); wt[k] = [wt[p][0] + v[0], wt[p][1] + v[1], wt[p][2] + v[2]]; } }
      frames.push({ wr, wt });
    }
    for (let f = 0; f < nf; f++) {
      const { wr, wt } = frames[f];
      for (let k = 0; k < nb; k++) { let d = qnorm(qmul(wr[k], qinv(S.wr[k]))); if (d[3] < 0) d = d.map((x) => -x); const o = (f * nb + remap[k]) * 4; for (let q = 0; q < 4; q++) D[o + q] = Math.round(d[q] * 32767); if (f > 0) { const o0 = remap[k] * 4; for (let q = 0; q < 4; q++) if (Math.abs(D[o + q] - D[o0 + q]) > 40) constant[remap[k]] = 0; } }
      for (let q = 0; q < 3; q++) P[f * 3 + q] = wt[pelvisK][q] - S.wt[pelvisK][q];
    }
    // hand speed analysis (strike windows): right + left hand world speed, m/s
    const hr = S.names.indexOf('hand_r'), hl = S.names.indexOf('hand_l'), sp = [];
    for (let f = 1; f < nf; f++) { const a = frames[f].wt, b = frames[f - 1].wt; sp.push([Math.hypot(a[hr][0] - b[hr][0], a[hr][1] - b[hr][1], a[hr][2] - b[hr][2]) * FPS, Math.hypot(a[hl][0] - b[hl][0], a[hl][1] - b[hl][1], a[hl][2] - b[hl][2]) * FPS]); }
    M.clips[an.name] = { nf, dur, D: put(D), P: put(P), speed: sp.map((s) => [+s[0].toFixed(2), +s[1].toFixed(2)]), pelvisH: S.wt[pelvisK][1] };
  }
}
M.srcPelvisH = { male: M.meshes.male.wt[M.skel.names.indexOf('pelvis')][1] };
const bin = Buffer.concat(chunks);
fs.writeFileSync(path.join(OUT, 'q.bin'), bin);
fs.writeFileSync(path.join(OUT, 'q.json'), JSON.stringify(M));
console.log('bin', (bin.length / 1024).toFixed(0) + 'KB', 'json', (fs.statSync(path.join(OUT, 'q.json')).size / 1024).toFixed(0) + 'KB', 'clips', Object.keys(M.clips).length, 'tex', JSON.stringify(M.tex));
console.log('missing', [].concat(...src.map((s) => s[1])).filter((n) => !M.clips[n]).join(','));
