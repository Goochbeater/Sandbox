/* BEAST — animals as real 3D models, drawn the way the people are. Each kind is a CC0 Quaternius animal (baked by
   tools/animals.mjs into assets/animals/<kind>.glb and embedded in the page), read here by a small glTF-binary reader
   (skinned meshes, materials, an embedded texture, LINEAR clips: all these files hold). A Beast is an Actor (engine/e05) with
   a different body: the same layer, the same orthographic sprite camera at the room's 32 px/m, the same rim and posterising
   pass, the same floor shadows, homes, placeIn and setVisible, so an animal reads as the same kind of pixel art as the people
   beside it and catches the room's light. What a Beast adds: its clips through a three.js AnimationMixer (idle, the grazing
   and head-low idles, walk and gallop matched to ground speed), a routine of idles, a one-shot act, a held clip, a procedural
   tail wag, and petting (SCENE.pet / Beast.petSpot). ENGINE.md §13j.
   Spec: { id, beast: kind, h (height in metres, standing), box: [w, h] sprite frame, col: { materialName: hex } recolours,
     tint (multiplies every colour), idle, idles: [[clip, weight]], speed, walkSpeed (m/s of the Walk clip at timeScale 1),
     gallopAt, yawK (idle three-quarter turn, radians off facing the lens), home/homes/offstage/lazy as for any actor } */
const BEAST = { kinds: {}, CT: { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array },
  NC: { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 } };
/* the reader: GLB bytes -> { json, acc(i) }; acc returns a tightly packed typed array (strided views are copied out) */
BEAST.parse = function (u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let off = 12, json = null, bin = null;
  while (off + 8 <= u8.byteLength) { const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), chunk = u8.subarray(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(chunk)); else if (type === 0x004E4942) bin = chunk; off += 8 + len; }
  const cache = {};
  const acc = (i) => { if (cache[i]) return cache[i];
    const a = json.accessors[i], bv = json.bufferViews[a.bufferView], T = BEAST.CT[a.componentType], n = BEAST.NC[a.type], cs = T.BYTES_PER_ELEMENT, es = cs * n;
    const start = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || es, out = new T(a.count * n);
    if (stride === es) out.set(new T(bin.slice(start, start + a.count * es).buffer));
    else { const row = new Uint8Array(es), view = new T(row.buffer); for (let k = 0; k < a.count; k++) { row.set(bin.subarray(start + k * stride, start + k * stride + es)); out.set(view, k * n); } }
    return (cache[i] = { arr: out, n, norm: !!a.normalized }); };
  const view = (i) => { const bv = json.bufferViews[i]; return bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength); };
  return { json, acc, view };
};
/* a kind is parsed once: its geometries (one per primitive), its clips and its texture are shared by every animal of it */
BEAST.kind = async function (k) {
  if (BEAST.kinds[k]) return BEAST.kinds[k];
  const el = document.getElementById('beast_' + k); if (!el) throw new Error('no animal ' + k);
  const P = BEAST.parse(Uint8Array.from(atob(el.textContent), (c) => c.charCodeAt(0))), J = P.json;
  const attr = (i) => { const a = P.acc(i); return new THREE.BufferAttribute(a.arr, a.n, a.norm); };
  // every mesh: the skinned body, and rigid parts hung on a bone (the stag's antlers ride its head)
  const geos = J.meshes.map((mesh) => mesh.primitives.map((pr) => { const g = new THREE.BufferGeometry(), A = pr.attributes;
    g.setAttribute('position', attr(A.POSITION)); if (A.NORMAL !== undefined) g.setAttribute('normal', attr(A.NORMAL));
    if (A.TEXCOORD_0 !== undefined) g.setAttribute('uv', attr(A.TEXCOORD_0)); if (A.COLOR_0 !== undefined) g.setAttribute('color', attr(A.COLOR_0));
    if (A.JOINTS_0 !== undefined) { g.setAttribute('skinIndex', attr(A.JOINTS_0)); g.setAttribute('skinWeight', attr(A.WEIGHTS_0)); }
    if (pr.indices !== undefined) g.setIndex(attr(pr.indices));
    if (A.NORMAL === undefined) g.computeVertexNormals(); g.userData.mat = pr.material; g.userData.vc = A.COLOR_0 !== undefined; return g; }));
  let tex = null;
  if (J.images && J.images.length) { const im = J.images[0], url = URL.createObjectURL(new Blob([P.view(im.bufferView)], { type: im.mimeType }));
    const img = new Image(); img.src = url; await img.decode(); tex = new THREE.Texture(img); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true; }
  // clips: tracks address nodes by index ('n12'), so every instance resolves them in its own hierarchy
  const PATH = { rotation: 'quaternion', translation: 'position', scale: 'scale' };
  const clips = {}; for (const an of J.animations || []) { const tracks = [];
    for (const ch of an.channels) { const s = an.samplers[ch.sampler], t = P.acc(s.input).arr, v = P.acc(s.output), name = 'n' + ch.target.node + '.' + PATH[ch.target.path];
      const vals = v.norm ? Float32Array.from(v.arr, (x) => Math.max(x / (v.arr instanceof Int16Array ? 32767 : 127), -1)) : v.arr;
      const T = ch.target.path === 'rotation' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
      tracks.push(new T(name, t, vals, s.interpolation === 'STEP' ? THREE.InterpolateDiscrete : THREE.InterpolateLinear)); }
    clips[an.name] = new THREE.AnimationClip(an.name, -1, tracks); }
  const ia = P.acc(J.skins[0].inverseBindMatrices).arr, ibm = []; for (let i = 0; i < ia.length / 16; i++) ibm.push(new THREE.Matrix4().fromArray(ia, i * 16));
  return (BEAST.kinds[k] = { k, J, geos, tex, clips, ibm });
};
/* one animal's body: its own node hierarchy (bones), shared geometry, its own (recoloured) materials */
BEAST.instance = function (K, S) {
  const J = K.J, skin = J.skins[0], jointSet = new Set(skin.joints);
  const objs = J.nodes.map((n, i) => { const o = jointSet.has(i) ? new THREE.Bone() : new THREE.Object3D(); o.name = 'n' + i; o.userData.gname = n.name || '';
    if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
    else { if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); }
    return o; });
  J.nodes.forEach((n, i) => { for (const c of n.children || []) objs[i].add(objs[c]); });
  const scene = new THREE.Group(); for (const i of J.scenes[J.scene || 0].nodes) scene.add(objs[i]);
  const mats = J.materials.map((m) => { const pb = m.pbrMetallicRoughness || {}, f = pb.baseColorFactor || [1, 1, 1, 1];
    const c = S.col && S.col[m.name] !== undefined ? new THREE.Color(S.col[m.name]) : new THREE.Color().fromArray(f);
    if (S.tint) c.multiply(new THREE.Color(S.tint));
    return new THREE.MeshStandardMaterial({ color: c, map: pb.baseColorTexture ? K.tex : null, roughness: S.rough || 0.78, metalness: 0, name: m.name }); });   // the packs say metal 0.4 (an FBX import's guess): fur isn't
  const bones = skin.joints.map((j) => objs[j]), skel = new THREE.Skeleton(bones, K.ibm.map((m) => m.clone()));
  const meshes = [], rigid = [];
  J.nodes.forEach((n, ni) => { if (n.mesh === undefined) return;
    for (const g of K.geos[n.mesh]) { const mat = mats[g.userData.mat] || mats[0]; if (g.userData.vc) mat.vertexColors = true;
      if (n.skin !== undefined) {
        const me = new THREE.SkinnedMesh(g, mat); me.frustumCulled = false; me.castShadow = false; me.receiveShadow = true;
        // glTF ignores a skinned mesh node's own transform (these carry the FBX import's -90° and x100): the joints alone
        // place the vertices, so bind with identity. Binding with the node's matrix made every animal a hundred times too big
        objs[ni].add(me); me.bind(skel, new THREE.Matrix4()); meshes.push(me);
      } else { const me = new THREE.Mesh(g, mat); me.frustumCulled = false; me.castShadow = false; me.receiveShadow = true; objs[ni].add(me); rigid.push(me); } } });
  return { scene, objs, bones, meshes, rigid, mats };
};
class Beast extends Actor {
  get I() { return null; }
  async build() {
    const S = this.spec, K = await BEAST.kind(S.beast);
    const root = new THREE.Group(); root.visible = false; R.scene.add(root); this.root = root;   // hidden until its layers are set: a model built mid-room (CAST.prefetch) must never reach the main camera
    const inner = new THREE.Group(); root.add(inner); this.inner = inner;
    const B = BEAST.instance(K, S); this.body = B; this.mats = B.mats; inner.add(B.scene);
    // scale to the spec's standing height, feet on the floor (the bind pose's box: skinning only moves it a little)
    // measure the rest pose as skinned (the raw positions are in the armature's space: Z up, a hundredth of the size)
    const box = new THREE.Box3(), v = new THREE.Vector3(); B.scene.updateMatrixWorld(true);
    for (const m of B.meshes) { const n = m.geometry.attributes.position.count; for (let i = 0; i < n; i += 3) { m.getVertexPosition(i, v); box.expandByPoint(v.applyMatrix4(m.matrixWorld)); } }
    for (const m of B.rigid) { const n = m.geometry.attributes.position.count; for (let i = 0; i < n; i += 3) box.expandByPoint(v.fromBufferAttribute(m.geometry.attributes.position, i).applyMatrix4(m.matrixWorld)); }
    this.rest = box;
    const k = (S.h || 1) / Math.max(box.max.y - box.min.y, 1e-3); inner.scale.setScalar(k); inner.position.y = -box.min.y * k; this.k = k;
    this.byName = {}; for (const o of B.objs) if (o.userData.gname) this.byName[o.userData.gname] = o;
    if (S.caparison) this.caparison(S.caparison, box, k);
    this.tail = Object.keys(this.byName).filter((n) => /^Tail\d*$/.test(n)).sort().map((n) => this.byName[n]);
    // bones the code turns or scales on top of the clips (the tail's wag, S.bones' reshaping, the rear): their unturned
    // rotation is put back before each mixer update, so a clip that doesn't key them can't let the turns pile up
    this.scales = Object.entries(S.bones || {}).filter(([n]) => this.byName[n]).map(([n, o]) => [this.byName[n], o.s]);
    this.rearB = ['Torso', 'FrontShoulder.L', 'FrontShoulder.R', 'BackShoulder.L', 'BackShoulder.R', 'Neck1', 'Head'].map((n) => this.byName[n]).filter(Boolean);
    this.ov = [...new Set(this.tail.concat(this.rearB))]; this.ovQ = this.ov.map((b) => b.quaternion.clone()); this.rear = 0; this.rearGoal = 0;
    this.head = this.byName.Head || this.byName.Head_end || null;
    this.mixer = new THREE.AnimationMixer(B.scene); this.clips = K.clips; this.acts = {}; this.cur = null; this.wag = 0; this.wagT = 0; this.held = null; this.one = null;
    this.clothes = []; this.crownMesh = { visible: false }; this.sitDrop = 0; this.pelvisH = 0;
    root.traverse((o) => o.layers.set(this.layer)); root.visible = true;
    this.sprite(); this.blob.scale.set(this.VW * 0.8, 1, 1);
    this.idleClip = S.idle || 'Idle'; this.routineT = 2 + hash(this.seq, 5) * 4;
    this.play(this.idleClip, 0); this.mixer.update(hash(this.seq, 7) * 3);
    return this;
  }
  action(name) { if (this.acts[name]) return this.acts[name]; const c = this.clips[name]; if (!c) return null; const a = this.mixer.clipAction(c); a.enabled = true; return (this.acts[name] = a); }
  /* crossfade to a looping clip (fade seconds) */
  play(name, fade) { if (this.cur === name) return; const a = this.action(name); if (!a) return; const prev = this.cur && this.acts[this.cur];
    a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.clampWhenFinished = false; a.setEffectiveWeight(1); a.play();
    if (prev && fade > 0) prev.crossFadeTo(a, fade, false); else if (prev) prev.stop(); this.cur = name; }
  /* a one-shot clip, then back to whatever the animal was doing; ev(at seconds) fires once on the way */
  act(name, at, ev) { const a = this.action(name); if (!a) { if (ev) ev(this); return; } this.one = { name, t: 0, at: at || 0, ev: ev || null, dur: a.getClip().duration };
    const prev = this.cur && this.acts[this.cur]; a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); if (prev) prev.crossFadeTo(a, 0.25, false); this.cur = name; }
  get actClip() { return this.one ? this.one.name : null; }
  set actClip(v) { if (v === null) this.one = null; }
  hold(name) { this.held = name || null; }
  update(dt) {
    if (this.puppet) { this.puppet(this, dt); this.root.position.set(this.x, this.y, this.z); this.root.rotation.y = this.yaw; return; }
    const S = this.spec, H = this.curHome || S;
    if (H.wander && this.target === null && !this.path && !this.one && !this.held) { this.wanderT -= dt;
      if (this.wanderT <= 0) { const w = H.wander; this.walkTo(lerp(w.x0, w.x1, Math.random())); this.wanderT = lerp(w.pause[0], w.pause[1], Math.random()); } }
    let dir = this.dir;
    if (!dir && this.target !== null) { const d = this.target - this.x;
      if (Math.abs(d) < 0.06) { this.target = null; const cb = this.onArrive; this.onArrive = null; if (cb) cb(this); }
      else dir = Math.sign(d) * Math.min(1, Math.abs(d) / 0.5 + 0.2); }
    if (this.one || this.held) dir = 0;
    this.v = damp(this.v, dir * this.speed, dir ? 3 : 5, dt); this.x += this.v * dt; const sp = Math.abs(this.v);
    if (this.path) { const P = this.path; P.t += dt; const u = clamp(P.t / P.dur, 0, 1); this.x = lerp(P.x0, P.x1, u); this.z = lerp(P.z0, P.z1, u); if (u >= 1) { this.path = null; if (P.cb) P.cb(this); } }
    if (sp > 0.05) { this.face = Math.sign(this.v); this.lookYaw = null; }
    let goal = sp > 0.1 ? this.face * (S.walkYaw || 1.5) : this.lookYaw !== null ? this.lookYaw : this.face * (S.yawK || 1.2);
    this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw)); if (Math.abs(goal - this.yaw) > Math.PI) goal += goal > this.yaw ? -Math.PI * 2 : Math.PI * 2;
    this.yaw = damp(this.yaw, goal, 3.5, dt);
    // which clip: a one-shot, a held clip, the gait, or the idle routine
    if (this.one) { const o = this.one; o.t += dt; if (o.ev && o.t >= o.at) { const f = o.ev; o.ev = null; f(this); }
      if (o.t >= o.dur - 0.05) { this.one = null; this.cur = null; } }
    if (!this.one) {
      const gal = S.gallopAt || 2.4, want = this.held || (sp > gal ? 'Gallop' : sp > 0.08 ? 'Walk' : this.idleClip);
      this.play(this.clips[want] ? want : 'Idle', 0.35);
      const w = this.acts.Walk, g = this.acts.Gallop; if (w) w.timeScale = want === 'Walk' ? clamp(sp / (S.walkSpeed || 1.2), 0.4, 1.8) : 1;
      if (g) g.timeScale = this.gaitK || (want === 'Gallop' ? clamp(sp / (S.gallopSpeed || 6), 0.6, 1.6) : 1);   // gaitK: a driven animal (the joust) sets its own pace
      if (!this.held && sp < 0.05 && S.idles) { this.routineT -= dt;   // a routine of idles: graze, look round, lower the head
        if (this.routineT <= 0) { let r = Math.random() * S.idles.reduce((t, [, w]) => t + w, 0), pick = S.idles[0][0]; for (const [c, w] of S.idles) { r -= w; if (r <= 0) { pick = c; break; } }
          this.idleClip = pick; this.routineT = lerp(S.idleEvery ? S.idleEvery[0] : 5, S.idleEvery ? S.idleEvery[1] : 11, Math.random()); } }
    }
    // the tail: a wag over whatever the clip is doing (petting, a happy hound). Put last frame's unwagged rotation back
    // first: a clip that doesn't key the tail would otherwise keep the wag and add to it every frame
    this.ov.forEach((b, i) => b.quaternion.copy(this.ovQ[i]));
    this.mixer.update(dt);
    this.ov.forEach((b, i) => this.ovQ[i].copy(b.quaternion));
    for (const [b, sc] of this.scales) b.scale.set(sc[0], sc[1], sc[2]);
    this.wag = damp(this.wag, this.wagGoal || 0, 3, dt); this.wagT += dt * (7 + this.wag * 6);
    if (this.wag > 0.01) { const ax = Beast._ax.fromArray(S.wagAxis || [0, 0, 1]); this.tail.forEach((b, i) => { b.rotateOnAxis(ax, Math.sin(this.wagT - i * 0.5) * 0.22 * this.wag); }); }
    // up on the hind legs (the dancing bear): the torso pitches up about the hips, the forelegs come up and paddle, he sways
    this.rear = damp(this.rear, this.rearGoal, this.rearGoal < this.rear ? 5 : 1.6, dt);   // down at once (a hand on his head), up slowly
    if (this.rear > 0.002) { const r = this.rear, B = this.byName, ax = Beast._ax.fromArray(S.rearAxis || [1, 0, 0]), t = this.wagT * 0.35;
      // (signs found by eye on the Quaternius rig: +X lifts the chest, so the neck turns back -X to keep the head level)
      if (B.Torso) B.Torso.rotateOnAxis(ax, (S.rearAng || 1.15) * r);
      if (B.Neck1) B.Neck1.rotateOnAxis(ax, (S.rearNeck || -0.95) * r);
      // the leg bones are rolled differently from the spine: about their own Y the forelegs come up in front of the chest
      // (about X they swing toward the lens, invisible in profile; that cost three rounds of frames to find)
      const lax = Beast._ax2.fromArray(S.rearLegAxis || [0, 1, 0]);
      for (const [n, ph] of [['FrontShoulder.L', 0], ['FrontShoulder.R', Math.PI]]) if (B[n]) B[n].rotateOnAxis(lax, ((S.rearLeg || 1.2) + 0.22 * Math.sin(t * 2 + ph)) * r);
      for (const n of ['BackShoulder.L', 'BackShoulder.R']) if (B[n]) B[n].rotateOnAxis(ax, (S.rearHip || -0.35) * r);
      this.inner.rotation.z = Math.sin(t) * 0.07 * r; } else this.inner.rotation.z = 0;
    if (!this.path) this.y = damp(this.y, this.baseY, 8, dt);
    this.root.position.set(this.x, this.y, this.z); this.root.rotation.y = this.yaw;
  }
  pose() {} compose() {}
  /* a knight's horse cloth: an inverted U drawn along the body (it hangs to o.y0 off a back at o.y1, o.w either side, from
     o.z0 at the rump to o.z1 at the chest, metres in the animal's own frame facing +Z), riding o.bone (default Torso) so it
     rocks with the gallop. Striped o.col[0]/o.col[1] (o.n stripes), a dark hem, a swan on the flank in colour o.swan */
  caparison(o, box, k) {
    const bone = this.byName[o.bone || 'Torso']; if (!bone) return;
    const W = 48, H = 24, p = new Pix(W, H), [c0, c1] = o.col, n = o.n || 6;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const st = Math.floor(x / (W / n)) % 2 ? c1 : c0, hem = y > H - 4; p.set(x, y, hem ? C.mul(st, 0.55) : C.mul(st, 0.92 + 0.08 * hash(x, y, 3))); }
    if (o.swan) { const cx = W / 2 | 0; p.ell(cx, 14, 6, 2.5, o.swan); p.ell(cx - 4, 13, 3, 1.5, o.swan); for (let y = 6; y < 13; y++) p.set(cx + 4 + (y < 8 ? 1 : 0), y, o.swan); p.rect(cx + 4, 5, 3, 2, o.swan); p.set(cx + 7, 6, 0xd89a2a); }
    const tex = p.tex({ mip: false });
    const sec = []; const w = o.w || 0.44, y0 = o.y0 || 0.62, y1 = o.y1 || 1.72, r = o.r || 0.24;
    sec.push([-w, y0], [-w, y1 - r]); for (let i = 1; i < 8; i++) { const a = Math.PI - i / 8 * Math.PI; sec.push([Math.cos(a) * w, y1 - r + Math.sin(a) * r]); } sec.push([w, y1 - r], [w, y0]);
    const len = [0]; for (let i = 1; i < sec.length; i++) len.push(len[i - 1] + Math.hypot(sec[i][0] - sec[i - 1][0], sec[i][1] - sec[i - 1][1]));
    const pos = [], uv = [], idx = [], z0 = o.z0 === undefined ? -1.0 : o.z0, z1 = o.z1 === undefined ? 0.85 : o.z1, L = len[len.length - 1];
    for (const [zi, z] of [[0, z0], [1, z1]]) sec.forEach(([x, y], i) => { pos.push(x, y, z); uv.push(zi, 1 - Math.abs(len[i] / L * 2 - 1)); });   // v: 0 at both hems, 1 over the back
    const m = sec.length; for (let i = 0; i < m - 1; i++) idx.push(i, i + 1, m + i, i + 1, m + i + 1, m + i);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    // metres in the animal's frame -> the body's file units (inner scales by k and lifts the feet to y 0) -> the bone's rest frame
    const toScene = new THREE.Matrix4().makeTranslation(0, box.min.y, 0).multiply(new THREE.Matrix4().makeScale(1 / k, 1 / k, 1 / k));
    const sc = this.body.scene; sc.updateMatrixWorld(true); const rel = sc.matrixWorld.clone().invert().multiply(bone.matrixWorld);   // the bone's rest frame within the model
    g.applyMatrix4(toScene); g.applyMatrix4(rel.invert());
    const me = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide })); me.frustumCulled = false; bone.add(me); this.cloth = me;
  }
  speakAt(out) { if (this.head) { this.head.getWorldPosition(out); out.y += 0.35; return out; } return out.set(this.x, this.y + (this.spec.h || 1) + 0.3, this.z); }
}
Beast._ax = new THREE.Vector3(); Beast._ax2 = new THREE.Vector3();
/* petting: the king steps to one side, stops, reaches (or kneels), and on the hand's arrival the animal answers with its
   own clip (o.clip, e.g. a head-low nuzzle or the cat's headbutt), a wag (o.wag) and a sound; then o.says / o.lines /
   o.onPet as BUILD.pet has them. Works for a Beast or a painted card (BUILD.pet calls this with a card adapter). */
SCENE.pet = async function (st, at, react, o) {
  const K = SCENE.player; if (st.busy) return; st.busy = true; SCENE.lock++;
  try {
    const px = at(), side = Math.sign(K.x - px) || 1, sx = px + side * (o.stand || 0.8);   // step to one side first, so his body doesn't cover the animal
    if (Math.abs(K.x - sx) > 0.08) await new Promise((res) => K.walkTo(sx, res));
    for (let i = 0; i < 100 && Math.abs(K.v) > 0.1; i++) await SCENE.wait(30);   // an actor moving faster than 0.2 drops a one-shot clip, so stop first
    K.faceTo(px); st.n++;
    const clip = o.kneel ? 'Fixing_Kneeling' : 'Interact';
    await new Promise((res) => { let hand = false; K.act(clip, o.at || (o.kneel ? 1.1 : 0.7), () => { hand = true; });   // the hand arrives…
      const poll = () => { if (!hand && K.actClip === clip) { setTimeout(poll, 30); return; }   // …or the reach was cancelled: go on regardless
        react(); if (o.sound) AUDIO.sfx(o.sound, Object.assign({ gain: 0.7, pan: clamp((px - R.cam.position.x) / 10, -0.8, 0.8) }, o.soundO)); res(); };
      poll(); });
    await SCENE.wait(400);
    if (o.says) await SCENE.say(o.voice, SCENE.cycle(o.id + '.says', o.says));
    const extra = o.onPet ? o.onPet(st.n) : null;
    if (extra && extra.length) await SCENE.talk(extra); else if (o.lines) await SCENE.say(K, SCENE.cycle(o.id + '.lines', o.lines));
  } finally { SCENE.lock--; st.busy = false; }
};
/* a pettable Beast: call from the room's onEnter (the marker is placed where the animal stands now). o as SCENE.pet, plus
   clip (its answer), hold (seconds to keep it), wag (0..1), headY (marker height) */
Beast.prototype.petSpot = function (room, o) {
  const b = this, st = this.petSt || (this.petSt = { n: 0 });
  room.inter = room.inter.filter((i) => i.id !== o.id);
  const it = room.interact(o.id, b.x, b.y + (o.headY || b.spec.h || 1) + 0.25, b.z, o.r || 0.9, () => SCENE.pet(st, () => b.x, () => {
    b.target = null; b.lookYaw = Math.sign(SCENE.player.x - b.x) * (b.spec.lookK || 1.0);   // turn toward his hand
    if (o.clip) { if (o.holdFor) { b.hold(o.clip); setTimeout(() => { b.hold(null); }, o.holdFor * 1000); } else b.act(o.clip); }
    if (o.wag) { b.wagGoal = o.wag; setTimeout(() => { b.wagGoal = b.spec.wag || 0; }, (o.wagFor || 3) * 1000); }
    if (o.onReact) o.onReact(b);
  }, Object.assign({ voice: b }, o)));
  it.label = o.label || 'Pet the ' + o.id; it.pet = st; it.beast = b; return it;
};
