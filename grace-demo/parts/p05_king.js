/* KING — the ruler is a real 3D character (Quaternius CC0 base body + outfit pieces from the character kit, mocap from
   the Universal Animation Library) rendered every frame by an orthographic "sprite camera" into a 48 × 77 px target at
   the room's 32 px/m. That target is shown on a billboard standing in the room, so he reads as hand-placed pixel art
   but turns, walks and catches the firelight like a 3D model. The model lives on layer 1: only the sprite camera sees it. */
const KING = { s: 1.04, x: -1.6, z: 2.6, v: 0, face: 1, yaw: 0.35, crown: false, talk: 0, act: null, actT: 0, phase: 0, idleT: 0, VW: 1.5, VH: 2.4 };
const QA = {};   // the baked asset bundle (same layout as the kit's q.json / q.bin)
QA.load = function () {
  QA.M = JSON.parse($('kjson').textContent);
  const bin = atob($('kbin').textContent.trim()), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  QA.buf = u8.buffer; QA.NB = QA.M.skel.names.length; QA.idx = {}; QA.M.skel.names.forEach((n, i) => { QA.idx[n] = i; });
  QA.clips = {}; for (const k in QA.M.clips) { const c = QA.M.clips[k]; c.Dq = QA.arr(c.D); c.Pp = QA.arr(c.P); QA.clips[k] = c; }
};
QA.arr = (r) => new ({ Float32Array, Int16Array, Uint8Array, Uint16Array, Uint32Array }[r.t])(QA.buf, r.o, r.n);
QA.tex = async function (name) {
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + $('tex_' + name).textContent.trim(); await img.decode();
  const t = new THREE.Texture(img); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
};
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
/* outfit dye: the painted texture keeps its shading; saturated leather/wool (vest, trousers, boots) and pale linen (shirt,
   sleeves) are re-coloured separately by their saturation, scaled by how bright the original paint was */
KING.dye = function (tex, a, b, o) {
  o = o || {};
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: o.rough || 0.8, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uA = { value: new THREE.Color(a) }; sh.uniforms.uB = { value: new THREE.Color(b) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec3 uA, uB;`).replace('#include <map_fragment>', `#include <map_fragment>
      { vec3 c = pow(max(diffuseColor.rgb, 0.0), vec3(1.0 / 2.2)); float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), sat = (mx - mn) / (mx + 1e-4);
        float w = smoothstep(0.36, 0.5, sat); vec3 A = uA * clamp(mx / 0.26, 0.35, 1.7), B = uB * clamp(mx / 0.6, 0.5, 1.4);
        diffuseColor.rgb = mix(B, A, w); }`);
  };
  m.customProgramCacheKey = () => 'dye' + a + '_' + b;
  return m;
};
KING.canvasTex = function (w, h, draw) { const p = new Pix(w, h); draw(p); const t = p.tex({ mip: false }); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping; return t; };
KING.build = async function () {
  QA.load();
  const M = QA.M, I = QA.idx, bind = M.meshes.rmale, names = M.skel.names, P = M.skel.parents;
  const root = new THREE.Group(); root.layers.set(1); KING.root = root; R.scene.add(root);
  const inner = new THREE.Group(); inner.scale.setScalar(KING.s); root.add(inner); KING.inner = inner;
  const bones = names.map((n, i) => { const b = new THREE.Bone(); b.name = n; b.position.fromArray(bind.lt[i]); b.quaternion.fromArray(bind.lr[i]); return b; });
  bones.forEach((b, i) => { if (P[i] >= 0) bones[P[i]].add(b); }); inner.add(bones[0]); inner.updateMatrixWorld(true);
  const inv = []; const ibm = QA.arr(bind.ibm); for (let i = 0; i < QA.NB; i++) inv.push(new THREE.Matrix4().fromArray(ibm, i * 16));
  const skel = new THREE.Skeleton(bones, inv);
  KING.bones = bones; KING.wr = bind.wr.map((r) => new THREE.Quaternion().fromArray(r)); KING.wt = bind.wt;
  KING.rootInv = KING.wr[0].clone().invert(); KING.D = names.map(() => new THREE.Quaternion()); KING.W = names.map(() => new THREE.Quaternion());
  KING.DB = names.map(() => new THREE.Quaternion());
  const add = (geo, mat) => { const me = new THREE.SkinnedMesh(geo, mat); me.layers.set(1); me.frustumCulled = false; me.castShadow = false; me.receiveShadow = true; inner.add(me); me.bind(skel, new THREE.Matrix4()); return me; };
  const tx = {}; for (const n of ['male_col', 'rmale_col', 'hair1_col', 'hair2_col', 'eye_col', 'peasant_col']) tx[n] = await QA.tex(n);
  const COAT = 0x2b2c38, LINEN = 0xe8e2d6;
  const skinTone = new THREE.Color(0xd8b096);
  const skin = new THREE.MeshStandardMaterial({ map: tx.male_col, color: skinTone.clone().multiplyScalar(0.92), roughness: 0.62 });
  const hands = new THREE.MeshStandardMaterial({ map: tx.rmale_col, color: skinTone.clone().multiplyScalar(0.92), roughness: 0.62 });
  const part = (n) => QA.geometry('rm_peasant', (p) => p.name === 'Male_Peasant_' + n && p.mat === 'MI_Peasant');
  add(part('Body'), KING.dye(tx.peasant_col, COAT, 0x34343f));
  add(part('Arms'), KING.dye(tx.peasant_col, 0x24252e, COAT));
  add(QA.geometry('rm_peasant', (p) => p.name === 'Male_Peasant_Arms' && p.mat === 'MI_Regular_Male'), hands);
  add(part('Legs'), KING.dye(tx.peasant_col, 0x26252c, 0x26252c));
  add(part('Feet'), KING.dye(tx.peasant_col, 0x18120e, 0x2a1e16, { rough: 0.5 }));
  // head, eyes and brows from the base body, hair and beard refit from the hair library
  const H = KING.wt[I.Head], ny = KING.wt[I.neck_01][1];
  add(QA.keep(QA.geometry('male', (p) => p.mat.startsWith('MI_Superhero')), (x, y, z) => y > ny - 0.035 && Math.abs(x) < 0.11 && z > H[2] - 0.16), skin);
  add(QA.geometry('male', (p) => p.mat === 'MI_Eyes'), new THREE.MeshStandardMaterial({ map: tx.eye_col, roughness: 0.3 }));
  const hairMat = (t, c) => new THREE.MeshStandardMaterial({ map: t, color: new THREE.Color(c).multiplyScalar(2.1), roughness: 0.55, side: THREE.DoubleSide, alphaTest: 0.3 });
  add(QA.geometry('male', (p) => p.mat.startsWith('MI_Hair')), hairMat(tx.hair1_col, 0x1a1512));
  add(QA.geometry('Hair_SimpleParted'), hairMat(tx.hair1_col, 0x1e1814));
  add(QA.geometry('Hair_Beard'), hairMat(tx.hair1_col, 0x1c1612));
  KING.robe(add, COAT); KING.collar(add); KING.tabard(add, LINEN);
  KING.crownMesh = KING.makeCrown(bones[I.Head]);
  // the clip speeds: stride from the feet, scaled to the kit's measured 1.0 m/s for Walk_Loop
  const st = (n) => KING.stride(QA.clips[n]); KING.V = { Walk_Loop: 1.0, Walk_Formal_Loop: st('Walk_Formal_Loop') / st('Walk_Loop') };
  KING.sprite();
};
/* the long coat skirt: a flared tube from the waist to mid-shin, weighted to the pelvis and, lower down, to the thighs */
KING.robe = function (add, col) {
  const I = QA.idx, NS = 28, NR = 10, top = 1.0, bot = 0.36, pos = [], uv = [], J = [], W = [], idx = [];
  for (let j = 0; j <= NR; j++) { const t = j / NR, y = lerp(top, bot, t), f = Math.pow(t, 0.75), rx = lerp(0.168, 0.29, f), rz = lerp(0.128, 0.25, f);
    for (let i = 0; i <= NS; i++) { const a = i / NS * Math.PI * 2, ripple = 1 + 0.035 * Math.sin(a * 9 + t * 2) * t, x = Math.sin(a) * rx * ripple, z = Math.cos(a) * rz * ripple - 0.012;
      pos.push(x, y, z); uv.push(i / NS, t);
      const leg = smooth(0.05, 1, t) * 0.62, wl = clamp(0.5 + x / 0.2, 0, 1);
      J.push(I.pelvis, I.thigh_l, I.thigh_r, I.spine_01); W.push(1 - leg, leg * wl, leg * (1 - wl), 0); } }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NS; i++) { const a = j * (NS + 1) + i, b = a + NS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(J, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4)); g.setIndex(idx); g.computeVertexNormals();
  const tex = KING.canvasTex(56, 20, (p) => { for (let y = 0; y < 20; y++) for (let x = 0; x < 56; x++) p.set(x, y, C.mul(col, 0.8 + 0.35 * (0.5 + 0.5 * Math.sin(x / 56 * Math.PI * 18)) * (y / 20 * 0.7 + 0.3)));
    for (let x = 0; x < 56; x++) { p.set(x, 18, 0xb8862e); p.set(x, 19, 0x6a4a1a); } });
  KING.robeMesh = add(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
};
/* fur mantle round the shoulders */
KING.collar = function (add) {
  const I = QA.idx, g = new THREE.TorusGeometry(1, 0.36, 8, 28); g.rotateX(Math.PI / 2);
  const P = g.attributes.position, J = [], W = [];
  for (let i = 0; i < P.count; i++) { let x = P.getX(i), y = P.getY(i), z = P.getZ(i); const front = z > 0 ? 1 : 0;
    x *= 0.19; z = z * 0.135 - 0.02; y = y * 0.075 + 1.455 - front * 0.035 * Math.pow(Math.abs(Math.cos(Math.atan2(P.getX(i), P.getZ(i)))), 2) + Math.abs(x) * 0.15;
    P.setXYZ(i, x * (1 + 0.08 * hash(i, 1)), y, z);
    const side = smooth(0.08, 0.17, Math.abs(x)) * 0.45;
    J.push(I.spine_03, x > 0 ? I.clavicle_l : I.clavicle_r, I.neck_01, 0); W.push(1 - side - 0.1, side, 0.1, 0); }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(J, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4)); g.computeVertexNormals();
  const tex = KING.canvasTex(32, 16, (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) p.set(x, y, C.ramp([0x8a6a44, 0xb8946a, 0xd2b488, 0xe6cfa6], hash(x, y, 77) * 0.6 + 0.3 * Math.sin(x * 1.7 + y))); });
  add(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
};
/* the white tabard down the front, sitting just proud of the chest and the coat skirt */
KING.tabard = function (add, col) {
  const I = QA.idx, body = QA.geometry('rm_peasant', (p) => p.name === 'Male_Peasant_Body'), BP = body.attributes.position;
  const front = (y) => { let z = -1; for (let i = 0; i < BP.count; i++) if (Math.abs(BP.getX(i)) < 0.05 && Math.abs(BP.getY(i) - y) < 0.03) z = Math.max(z, BP.getZ(i)); return z; };
  const NR = 16, top = 1.4, bot = 0.37, hw = 0.075, pos = [], uv = [], J = [], W = [], idx = [];
  for (let j = 0; j <= NR; j++) { const t = j / NR, y = lerp(top, bot, t);
    const skirtT = clamp((1.0 - y) / (1.0 - 0.36), 0, 1), robeZ = lerp(0.128, 0.25, Math.pow(skirtT, 0.75)) - 0.012, bz = y > 0.95 ? front(y) : -1, z = Math.max(bz, y < 1.02 ? robeZ : -1) + 0.014;
    const w = hw * (1 + skirtT * 0.5);
    for (const s of [-1, 1]) { pos.push(s * w, y, z); uv.push(s < 0 ? 0 : 1, 1 - t);
      if (y > 1.25) { J.push(I.spine_03, I.spine_02, 0, 0); W.push(0.7, 0.3, 0, 0); }
      else if (y > 1.02) { J.push(I.spine_02, I.spine_01, 0, 0); W.push(0.6, 0.4, 0, 0); }
      else { const leg = smooth(0.05, 1, skirtT) * 0.62; J.push(I.pelvis, I.thigh_l, I.thigh_r, 0); W.push(1 - leg, leg * 0.5, leg * 0.5, 0); } } }
  for (let j = 0; j < NR; j++) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(J, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4)); g.setIndex(idx); g.computeVertexNormals();
  const tex = KING.canvasTex(8, 40, (p) => { p.fill(col); for (let y = 0; y < 40; y++) { p.set(0, y, 0xb8862e); p.set(7, y, 0xb8862e); }
    for (const [x, y] of [[3, 6], [4, 6], [2, 7], [3, 7], [4, 7], [5, 7], [3, 8], [4, 8], [3, 9], [4, 9], [3, 5], [4, 5]]) p.set(x, y, 0x1a1a24); });
  tex.wrapS = THREE.ClampToEdgeWrapping; tex.flipY = true;
  add(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
};
/* gold crown on the head bone (worn when he chooses to, at the mirror) */
KING.makeCrown = function (head) {
  const grp = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xe0a83a, roughness: 0.32, metalness: 0.85, emissive: 0x3a2000 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.1, 0.045, 18, 1, true), gold); grp.add(band);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 4), gold); c.position.set(Math.sin(a) * 0.103, 0.05, Math.cos(a) * 0.103); grp.add(c); }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.014), new THREE.MeshStandardMaterial({ color: 0xc02020, roughness: 0.2, emissive: 0x400000 })); gem.position.set(0, 0.0, 0.108); grp.add(gem);
  grp.traverse((o) => o.layers.set(1));
  const Hb = new THREE.Matrix4().compose(new THREE.Vector3().fromArray(KING.wt[QA.idx.Head]), KING.wr[QA.idx.Head], new THREE.Vector3(1, 1, 1));
  const at = new THREE.Matrix4().makeTranslation(0, 1.74, 0.0);
  const local = Hb.clone().invert().multiply(at); local.decompose(grp.position, grp.quaternion, grp.scale);
  head.add(grp); grp.visible = KING.crown; return grp;
};
/* ---------------------------------------------------------------- animation */
KING._a = new THREE.Quaternion(); KING._b = new THREE.Quaternion(); KING._p = new THREE.Vector3(); KING._p2 = new THREE.Vector3();
KING.sample = function (c, t, out, pel) {
  const nf = c.nf, NB = QA.NB; let f = ((t * 30) % (nf - 1) + (nf - 1)) % (nf - 1);
  const i0 = Math.floor(f), i1 = Math.min(nf - 1, i0 + 1), u = f - i0, D = c.Dq, a = KING._a, b = KING._b, s = 1 / 32767;
  for (let k = 0; k < NB; k++) { const o0 = (i0 * NB + k) * 4, o1 = (i1 * NB + k) * 4;
    a.set(D[o0] * s, D[o0 + 1] * s, D[o0 + 2] * s, D[o0 + 3] * s); b.set(D[o1] * s, D[o1 + 1] * s, D[o1 + 2] * s, D[o1 + 3] * s); out[k].copy(a.slerp(b, u).normalize()); }
  const Pp = c.Pp, k = KING.wt[1][1] / c.pelvisH;
  pel.set(lerp(Pp[i0 * 3], Pp[i1 * 3], u) * k, lerp(Pp[i0 * 3 + 1], Pp[i1 * 3 + 1], u) * k, lerp(Pp[i0 * 3 + 2], Pp[i1 * 3 + 2], u) * k);
};
/* forward-kinematics foot travel of a loop (relative to the pelvis): proportional to its ground speed */
KING.stride = function (c) {
  const D = QA.M.skel.names.map(() => new THREE.Quaternion()), p = new THREE.Vector3(), lt = QA.M.meshes.rmale.lt, P = QA.M.skel.parents, foot = QA.idx.foot_l;
  let mn = 9, mx = -9;
  for (let f = 0; f < c.nf - 1; f++) { KING.sample(c, f / 30, D, p);
    const W = D.map((d, i) => d.clone().multiply(KING.wr[i])), pos = [];
    for (let i = 0; i < W.length; i++) pos.push(P[i] < 0 ? new THREE.Vector3() : new THREE.Vector3().fromArray(lt[i]).applyQuaternion(W[P[i]]).add(pos[P[i]]));
    const z = pos[foot].z - pos[1].z; mn = Math.min(mn, z); mx = Math.max(mx, z); }
  return mx - mn;
};
KING.pose = function (layers) {   // layers: [[clip, t, weight], ...] blended in order
  const D = KING.D, B = KING.DB, pel = KING._p, pb = KING._p2;
  let first = true, wsum = 0;
  for (const [name, t, w] of layers) { if (w <= 0.001) continue; const c = QA.clips[name];
    if (first) { KING.sample(c, t, D, pel); first = false; wsum = w; continue; }
    KING.sample(c, t, B, pb); wsum += w; const k = w / wsum; for (let i = 0; i < D.length; i++) D[i].slerp(B[i], k); pel.lerp(pb, k); }
  const bones = KING.bones, P = QA.M.skel.parents, Wq = KING.W;
  for (let i = 0; i < bones.length; i++) { if (i === 0) D[0].identity(); Wq[i].copy(D[i]).multiply(KING.wr[i]); bones[i].quaternion.copy(P[i] < 0 ? Wq[i] : KING._a.copy(Wq[P[i]]).invert().multiply(Wq[i])); }
  bones[1].position.fromArray(KING.wt[1]).add(pel).applyQuaternion(KING.rootInv);
};
/* ---------------------------------------------------------------- the sprite */
KING.sprite = function () {
  const SW = Math.round(KING.VW * PX.D), SH = Math.round(KING.VH * PX.D);
  const mk = () => new THREE.WebGLRenderTarget(SW, SH, { type: R.type, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, generateMipmaps: false });
  KING.rt = mk(); KING.rt2 = mk(); KING.rt2.depthBuffer = false;
  KING.cam = new THREE.OrthographicCamera(-KING.VW / 2, KING.VW / 2, KING.VH / 2, -KING.VH / 2, 0.1, 14); KING.cam.layers.set(1);
  KING.fx = new THREE.ShaderMaterial({ vertexShader: R.SH.vert, depthTest: false, depthWrite: false, uniforms: { t: { value: KING.rt.texture }, uTexel: { value: new THREE.Vector2(1 / SW, 1 / SH) }, uOut: { value: G.flags.nooutline ? 0 : 1 } },
    fragmentShader: `varying vec2 vUv; uniform sampler2D t; uniform vec2 uTexel; uniform float uOut;
      vec3 post(vec3 c){ vec3 d = pow(c / (1.0 + c), vec3(1.0 / 2.2)); d = floor(d * 24.0 + 0.5) / 24.0; vec3 l = pow(d, vec3(2.2)); return l / max(1.0 - l, 1e-3); }
      void main(){ vec4 c = texture2D(t, vUv);
        if (c.a < 0.5) { if (uOut < 0.5) { gl_FragColor = vec4(0.0); return; }
          vec4 a = texture2D(t, vUv + vec2(uTexel.x, 0.0)), b = texture2D(t, vUv - vec2(uTexel.x, 0.0)), d = texture2D(t, vUv + vec2(0.0, uTexel.y)), e = texture2D(t, vUv - vec2(0.0, uTexel.y));
          float n = step(0.5, a.a) + step(0.5, b.a) + step(0.5, d.a) + step(0.5, e.a);
          if (n > 0.5) { vec3 s = (a.rgb * step(0.5, a.a) + b.rgb * step(0.5, b.a) + d.rgb * step(0.5, d.a) + e.rgb * step(0.5, e.a)) / n; gl_FragColor = vec4(s * 0.28, 1.0); return; }
          gl_FragColor = vec4(0.0); return; }
        gl_FragColor = vec4(post(c.rgb), 1.0); }` });
  const g = new THREE.PlaneGeometry(KING.VW, KING.VH);
  KING.card = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: KING.rt2.texture, alphaTest: 0.5 })); KING.card.castShadow = false; KING.card.receiveShadow = false; R.scene.add(KING.card);
  // shadows: a soft contact blob, and the silhouette thrown across the floor by the hearth
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: PX.T.glow, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.layers.set(2); R.scene.add(blob); KING.blob = blob;
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3)); sg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2)); sg.setIndex([0, 1, 2, 1, 3, 2]);
  KING.shadowMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, uniforms: { t: { value: KING.rt.texture }, uK: { value: 0.5 }, uTexel: { value: new THREE.Vector2(1 / SW, 1 / SH) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform sampler2D t; uniform float uK; uniform vec2 uTexel;
      void main(){ float a = 0.0; for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) a += texture2D(t, vUv + vec2(float(i), float(j)) * uTexel * (1.0 + vUv.y * 2.5)).a; a /= 25.0;
        gl_FragColor = vec4(0.0, 0.0, 0.0, a * uK * (1.0 - vUv.y * 0.75)); }` });
  KING.shadow = new THREE.Mesh(sg, KING.shadowMat); KING.shadow.frustumCulled = false; KING.shadow.layers.set(2); R.scene.add(KING.shadow);
  // a key and rim light that only the sprite camera sees: they keep his face and coat readable against the dark room
  const key = new THREE.DirectionalLight(0xffd8b0, 1.1); key.layers.set(1); R.scene.add(key); R.scene.add(key.target); KING.key = key;
  const rim = new THREE.DirectionalLight(0xffa860, 0.9); rim.layers.set(1); R.scene.add(rim); R.scene.add(rim.target); KING.rim = rim;
};
KING._c = new THREE.Vector3(); KING._d = new THREE.Vector3();
KING.render = function () {
  const r = R.r, c = KING._c.set(KING.x, 1.15, KING.z), cam = KING.cam;
  const d = KING._d.copy(c).sub(R.cam.position).normalize();
  cam.position.copy(c).addScaledVector(d, -7); cam.lookAt(c); cam.updateMatrixWorld();
  KING.card.position.copy(c); KING.card.quaternion.copy(cam.quaternion);
  KING.key.position.set(KING.x - 2.5, 4, KING.z + 6); KING.key.target.position.set(KING.x, 1.2, KING.z);
  KING.rim.position.set(1.4, 1.4, 0.6); KING.rim.target.position.set(KING.x, 1.2, KING.z);
  const fd = Math.abs(KING.x - 1.4); KING.rim.intensity = 1.6 * smooth(6, 1, fd) * (ROOM.lights.fire ? ROOM.lights.fire.intensity / 30 : 1);
  const bg = R.scene.background; R.scene.background = null; r.setClearColor(0x000000, 0);
  r.setRenderTarget(KING.rt); r.clear(); r.render(R.scene, cam);
  R.quad.material = KING.fx; r.setRenderTarget(KING.rt2); r.clear(); r.render(R.quadScene, R.quadCam);
  R.scene.background = bg;
  // floor shadows
  KING.blob.position.set(KING.x, 0.008, KING.z + 0.02);
  const L = new THREE.Vector3(1.4, 5.0, 1.2), right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  const base = c.clone().addScaledVector(up, -KING.VH / 2), corners = [base.clone().addScaledVector(right, -KING.VW / 2), base.clone().addScaledVector(right, KING.VW / 2)];
  for (const b of corners.slice()) { const tp = b.clone().addScaledVector(up, KING.VH); const k = L.y / Math.max(L.y - tp.y, 0.35); corners.push(new THREE.Vector3(L.x + (tp.x - L.x) * k, 0.01, L.z + (tp.z - L.z) * k)); }
  corners[0].y = corners[1].y = 0.01;
  const sp = KING.shadow.geometry.attributes.position; corners.forEach((v, i) => sp.setXYZ(i, v.x, v.y, v.z)); sp.needsUpdate = true;
  KING.shadowMat.uniforms.uK.value = 0.55 * smooth(5.5, 1.0, fd);
};
