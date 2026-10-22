/* ACTOR — a character. Each actor is a real 3D model (a Quaternius CC0 base body dressed in re-dyed outfit pieces, plus
   procedural extras: long skirt or gown, fur collar, tabard, crown, helmet, held prop) driven by mocap clips, and each
   frame an orthographic "sprite camera" renders it into a tiny render target at the room's 32 px/m. That target is shown
   on a billboard standing in the room, so the character reads as hand-placed pixel art but turns, walks, sits and
   catches the room's light like a 3D model. Every actor has its own layer (3…31): its model is seen only by its own
   sprite camera, so two characters standing close never bleed into each other's sprite.
   Spec (see game/g40_cast.js for real ones):
     { id, bind: 'rmale'|'rfemale', s, box: [w, h] (sprite frame, m), skin, skinK,
       parts: [[meshKey, primName, dye | 'skin']],  dye = { L: saturated (leather/wool) colour, P: pale (linen) colour, G: green-cloth colour }
       brows, hair: [[meshName, colour]], robe: {…}, collar: {…}, tabard: {…}, crown: { worn }, helmet: { col }, prop: 'spear'|'scroll',
       idle, walk, speed, x, z, face } */
class Actor {
  constructor(spec) {
    this.spec = spec; this.id = spec.id; this.layer = Actor.nextLayer++;
    this.x = spec.x || 0; this.y = 0; this.z = spec.z || 2.6; this.v = 0; this.dir = 0; this.face = spec.face || 1; this.yaw = this.face * 0.42;
    this.target = null; this.onArrive = null; this.speed = spec.speed || 1.1; this.lookYaw = null;
    this.idleT = hash(this.layer, 3) * 10; this.phase = 0; this.talk = 0; this.talking = false; this.actClip = null; this.actT = 0; this.actEv = null;
    this.sitting = null; this.sitK = 0; this.path = null; this.visible = true; this.home = spec.home || null; this.cardDz = 0; this.baseY = spec.y || 0; this.y = this.baseY;
    [this.VW, this.VH] = spec.box || [1.5, 2.4];
    this.homes = spec.homes || null; this.wanderT = 1 + hash(this.layer, 9) * 3; this.routineT = 1 + hash(this.layer, 11) * 2; this.stepN = 0; this.name = spec.name || spec.id;
  }
  get I() { return QA.idx; }
  async build() {
    QA.load();
    const S = this.spec, M = QA.M, I = QA.idx, bindKey = S.bind || 'rmale', bind = M.meshes[bindKey], names = M.skel.names, P = M.skel.parents, sex = bindKey === 'rfemale' ? 'female' : 'male';
    this.bindKey = bindKey; this.sex = sex;
    const root = new THREE.Group(); R.scene.add(root); this.root = root;
    const inner = new THREE.Group(); inner.scale.setScalar(S.s || 1); root.add(inner); this.inner = inner;
    const bones = names.map((n, i) => { const b = new THREE.Bone(); b.name = n; b.position.fromArray(bind.lt[i]); b.quaternion.fromArray(bind.lr[i]); return b; });
    bones.forEach((b, i) => { if (P[i] >= 0) bones[P[i]].add(b); }); inner.add(bones[0]); inner.updateMatrixWorld(true);
    const inv = []; const ibm = QA.arr(bind.ibm); for (let i = 0; i < QA.NB; i++) inv.push(new THREE.Matrix4().fromArray(ibm, i * 16));
    this.skel = new THREE.Skeleton(bones, inv); this.bones = bones;
    this.wr = bind.wr.map((r) => new THREE.Quaternion().fromArray(r)); this.wt = bind.wt; this.pelvisH = bind.wt[1][1];
    this.rootInv = this.wr[0].clone().invert(); this.D = names.map(() => new THREE.Quaternion()); this.W = names.map(() => new THREE.Quaternion()); this.DB = names.map(() => new THREE.Quaternion());
    this.pel = new THREE.Vector3(); this.pb = new THREE.Vector3();
    const skinT = new THREE.Color(S.skin || 0xd8b096).multiplyScalar(S.skinK || 0.92);
    const headTex = await QA.tex(sex + '_col'), handTex = await QA.tex(bindKey + '_col');
    const skin = new THREE.MeshStandardMaterial({ map: headTex, color: skinT, roughness: 0.62 }), hands = new THREE.MeshStandardMaterial({ map: handTex, color: skinT, roughness: 0.62 });
    for (const [mesh, prim, dye] of S.parts || []) {
      const g = QA.geometry(mesh, (p) => p.name === prim && (dye === 'skin' ? p.mat.startsWith('MI_Regular') : !p.mat.startsWith('MI_Regular')));
      if (!g.index.count) { console.warn('no part', mesh, prim); continue; }
      const tex = await QA.tex(mesh.includes('ranger') ? 'ranger_col' : 'peasant_col');
      this.add(g, dye === 'skin' ? hands : Actor.dye(tex, dye));
    }
    // head, eyes and brows from the base body; hair refit from the hair library when it was modelled for the other head
    const H = this.wt[I.Head], ny = this.wt[I.neck_01][1];
    this.add(QA.keep(QA.geometry(sex, (p) => p.mat.startsWith('MI_Superhero')), (x, y, z) => y > ny - 0.035 && Math.abs(x) < 0.11 && z > H[2] - 0.16), skin);
    this.add(QA.geometry(sex, (p) => p.mat === 'MI_Eyes'), new THREE.MeshStandardMaterial({ map: await QA.tex('eye_col'), roughness: 0.3 }));
    const hairMat = (t, c) => new THREE.MeshStandardMaterial({ map: t, color: new THREE.Color(c).multiplyScalar(2.1), roughness: 0.55, side: THREE.DoubleSide, alphaTest: 0.3 });
    const browTex = sex === 'female' ? 'hair2_col' : 'hair1_col';
    this.add(QA.geometry(sex, (p) => p.mat.startsWith('MI_Hair')), hairMat(await QA.tex(browTex), S.brows || 0x1a1512));
    for (const [h, col] of S.hair || []) { const g = QA.refit(QA.geometry(h), QA.HAIR_SRC[h] || 'male', sex); this.add(g, hairMat(await QA.tex(M.meshes[h].prims[0].mat === 'MI_Hair_2' ? 'hair2_col' : 'hair1_col'), col)); }
    if (S.robe) this.robe(S.robe);
    if (S.collar) this.collar(S.collar);
    if (S.tabard) this.tabard(S.tabard);
    this.crownMesh = Actor.crown(S.crown && S.crown.k || 1); this.attachHead(this.crownMesh, S.crown && S.crown.y || 0.135); this.crownMesh.visible = !!(S.crown && S.crown.worn);
    if (S.helmet) { const hm = Actor.helmet(S.helmet.col); this.attachHead(hm, 0.11); }
    if (S.prop) this.prop(S.prop);
    if (S.child) { bones[I.Head].scale.setScalar(S.child.head || 1.2); if (S.child.neck) bones[I.neck_01].scale.setScalar(S.child.neck); }   // children: a bigger head on a smaller body
    root.traverse((o) => o.layers.set(this.layer)); if (this.propObj) this.propObj.traverse((o) => o.layers.set(this.layer));
    this.sitDrop = (() => { const c = QA.clips.Sitting_Idle_Loop; if (!c) return 0.45; QA.sample(c, 0, this.D, this.pel, this.pelvisH); return this.pelvisH + this.pel.y; })();
    this.sprite();
    this.pose([[S.idle || 'Idle_Loop', this.idleT, 1]]);
    return this;
  }
  add(geo, mat) { const me = new THREE.SkinnedMesh(geo, mat); me.frustumCulled = false; me.castShadow = false; me.receiveShadow = true; this.inner.add(me); me.bind(this.skel, new THREE.Matrix4()); return me; }
  /* a rigid object riding the head bone; `up` = how far above the head joint it sits (metres, bind space) */
  attachHead(obj, up) {
    const I = QA.idx, Hb = new THREE.Matrix4().compose(new THREE.Vector3().fromArray(this.wt[I.Head]), this.wr[I.Head], new THREE.Vector3(1, 1, 1));
    const at = new THREE.Matrix4().makeTranslation(0, this.wt[I.Head][1] + up, this.wt[I.Head][2] + 0.017);
    Hb.clone().invert().multiply(at).decompose(obj.position, obj.quaternion, obj.scale); this.bones[I.Head].add(obj);
  }
  /* ---------------------------------------------------------------- procedural garments */
  /* long skirt / gown: a flared tube from the waist down, weighted to the pelvis and, lower down, to the thighs */
  robe(o) {
    const I = QA.idx, NS = 28, NR = 10, top = o.top || 1.0, bot = o.bot === undefined ? 0.36 : o.bot, rx = o.rx || [0.168, 0.29], rz = o.rz || [0.128, 0.25], legK = o.leg === undefined ? 0.62 : o.leg;
    const pos = [], uv = [], J = [], W = [], idx = [];
    for (let j = 0; j <= NR; j++) { const t = j / NR, y = lerp(top, bot, t), f = Math.pow(t, 0.75), ax = lerp(rx[0], rx[1], f), az = lerp(rz[0], rz[1], f);
      for (let i = 0; i <= NS; i++) { const a = i / NS * Math.PI * 2, ripple = 1 + 0.035 * Math.sin(a * 9 + t * 2) * t, x = Math.sin(a) * ax * ripple, z = Math.cos(a) * az * ripple - 0.012;
        pos.push(x, y, z); uv.push(i / NS, t);
        const leg = smooth(0.05, 1, t) * legK, wl = clamp(0.5 + x / 0.2, 0, 1);
        J.push(I.pelvis, I.thigh_l, I.thigh_r, I.spine_01); W.push(1 - leg, leg * wl, leg * (1 - wl), 0); } }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NS; i++) { const a = j * (NS + 1) + i, b = a + NS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(J, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4)); g.setIndex(idx); g.computeVertexNormals();
    const col = o.col, tex = Actor.cloth(56, 20, (p) => { for (let y = 0; y < 20; y++) for (let x = 0; x < 56; x++) p.set(x, y, C.mul(col, 0.8 + 0.35 * (0.5 + 0.5 * Math.sin(x / 56 * Math.PI * 18)) * (y / 20 * 0.7 + 0.3)));
      if (o.trim) for (let x = 0; x < 56; x++) { p.set(x, 18, o.trim); p.set(x, 19, C.mul(o.trim, 0.55)); }
      if (o.band) for (let x = 0; x < 56; x++) { p.set(x, 15, o.band); if (x % 4 === 0) p.set(x, 16, o.band); } });
    this.robeMesh = this.add(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
  }
  /* fur mantle round the shoulders */
  collar(o) {
    const I = QA.idx, g = new THREE.TorusGeometry(1, 0.36, 8, 28); g.rotateX(Math.PI / 2);
    const P = g.attributes.position, J = [], W = [], cy = (o.y || 1.455) * (this.pelvisH / 0.9491), sx = o.rx || 0.19, sz = o.rz || 0.135;
    for (let i = 0; i < P.count; i++) { let x = P.getX(i), y = P.getY(i), z = P.getZ(i); const front = z > 0 ? 1 : 0;
      x *= sx; z = z * sz - 0.02; y = y * (o.thick || 0.075) + cy - front * 0.035 * Math.pow(Math.abs(Math.cos(Math.atan2(P.getX(i), P.getZ(i)))), 2) + Math.abs(x) * 0.15;
      P.setXYZ(i, x * (1 + 0.08 * hash(i, 1)), y, z);
      const side = smooth(0.08, 0.17, Math.abs(x)) * 0.45;
      J.push(I.spine_03, x > 0 ? I.clavicle_l : I.clavicle_r, I.neck_01, 0); W.push(1 - side - 0.1, side, 0.1, 0); }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(J, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4)); g.computeVertexNormals();
    const pal = o.pal || [0x8a6a44, 0xb8946a, 0xd2b488, 0xe6cfa6];
    this.add(g, new THREE.MeshStandardMaterial({ map: Actor.cloth(32, 16, (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) p.set(x, y, C.ramp(pal, hash(x, y, 77) * 0.6 + 0.3 * Math.sin(x * 1.7 + y))); }), roughness: 1 }));
  }
  /* a tabard (or a sash) down the front, just proud of the chest and the skirt */
  tabard(o) {
    const I = QA.idx, from = o.from || ['rm_peasant', 'Male_Peasant_Body'], body = QA.geometry(from[0], (p) => p.name === from[1]), BP = body.attributes.position;
    const front = (y) => { let z = -1; for (let i = 0; i < BP.count; i++) if (Math.abs(BP.getX(i)) < 0.05 && Math.abs(BP.getY(i) - y) < 0.03) z = Math.max(z, BP.getZ(i)); return z; };
    const rb = this.spec.robe || { top: 1.0, bot: 0.36, rz: [0.128, 0.25] }, rTop = rb.top || 1.0, rBot = rb.bot === undefined ? 0.36 : rb.bot, rz = rb.rz || [0.128, 0.25];
    const NR = 16, top = o.top || 1.4, bot = o.bot || rBot + 0.01, hw = o.w || 0.075, pos = [], uv = [], J = [], W = [], idx = [];
    for (let j = 0; j <= NR; j++) { const t = j / NR, y = lerp(top, bot, t);
      const skirtT = clamp((rTop - y) / (rTop - rBot), 0, 1), robeZ = lerp(rz[0], rz[1], Math.pow(skirtT, 0.75)) - 0.012, bz = y > rTop - 0.05 ? front(y) : -1, z = Math.max(bz, y < rTop + 0.02 ? robeZ : -1) + 0.014;
      const w = hw * (1 + skirtT * 0.5);
      for (const s of [-1, 1]) { pos.push(s * w, y, z); uv.push(s < 0 ? 0 : 1, 1 - t);
        if (y > 1.25) { J.push(I.spine_03, I.spine_02, 0, 0); W.push(0.7, 0.3, 0, 0); }
        else if (y > rTop + 0.02) { J.push(I.spine_02, I.spine_01, 0, 0); W.push(0.6, 0.4, 0, 0); }
        else { const leg = smooth(0.05, 1, skirtT) * 0.62; J.push(I.pelvis, I.thigh_l, I.thigh_r, 0); W.push(1 - leg, leg * 0.5, leg * 0.5, 0); } } }
    for (let j = 0; j < NR; j++) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(J, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W, 4)); g.setIndex(idx); g.computeVertexNormals();
    const tex = Actor.cloth(8, 40, (p) => { p.fill(o.col); if (o.trim !== null) for (let y = 0; y < 40; y++) { p.set(0, y, o.trim || 0xb8862e); p.set(7, y, o.trim || 0xb8862e); }
      if (o.emblem) for (const [x, y] of [[3, 6], [4, 6], [2, 7], [3, 7], [4, 7], [5, 7], [3, 8], [4, 8], [3, 9], [4, 9], [3, 5], [4, 5]]) p.set(x, y, o.emblem); });
    tex.wrapS = THREE.ClampToEdgeWrapping;
    this.add(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
  }
  /* a held object: a spear stays upright in the right hand, a scroll rides the left */
  prop(kind) {
    const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.7 }), wood_ = wood, steel = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.3, metalness: 0.8 });
    if (kind === 'spear') { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 2.5, 6), wood); sh.position.y = 0.3; g.add(sh);
      const bl = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 4), steel); bl.position.y = 1.68; g.add(bl);
      const tas = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshStandardMaterial({ color: 0xa82020, roughness: 0.9 })); tas.position.y = 1.48; g.add(tas); }
    if (kind === 'scroll') { const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 })); sc.rotation.z = Math.PI / 2; g.add(sc);
      for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 8), new THREE.MeshStandardMaterial({ color: 0xa8302a })); k.rotation.z = Math.PI / 2; k.position.x = s * 0.16; g.add(k); } }
    if (kind === 'sword' || kind === 'woodsword') {   // gripped: rides the hand bone, so sword clips swing it
      const wood = kind === 'woodsword', L = wood ? 0.6 : 0.8, bm = wood ? new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.8 }) : steel;
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.045, L, 0.012), bm); bl.position.y = 0.1 + L / 2; g.add(bl);
      const gd = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.035), wood ? wood_ : new THREE.MeshStandardMaterial({ color: 0xb8902e, roughness: 0.4, metalness: 0.7 })); gd.position.y = 0.09; g.add(gd);
      const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6), wood_); gr.position.y = 0.0; g.add(gr);
      g.userData.kind = kind; this.attachBone(g, 'hand_r', [-0.085, -0.02, 0], new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)); this.grip = g; return;
    }
    g.userData.kind = kind; R.scene.add(g); this.propObj = g; this.propBone = this.bones[QA.idx[kind === 'spear' ? 'hand_r' : 'hand_l']];
  }
  /* a rigid object riding a bone, placed in bind space: `off` from the joint (m), `rot` its orientation in bind space */
  attachBone(obj, bone, off, rot) {
    const i = QA.idx[bone], Bm = new THREE.Matrix4().compose(new THREE.Vector3().fromArray(this.wt[i]), this.wr[i], new THREE.Vector3(1, 1, 1));
    const at = new THREE.Matrix4().compose(new THREE.Vector3().fromArray(this.wt[i]).add(new THREE.Vector3(...off)), rot || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    Bm.invert().multiply(at).decompose(obj.position, obj.quaternion, obj.scale); this.bones[i].add(obj);
  }
  /* ---------------------------------------------------------------- behaviour */
  walkTo(x, cb) { this.target = x; this.onArrive = cb || null; this.sitting = null; }
  /* where this actor stands in a room (spec.homes: { roomId: { x, z, y, face, idle } }) */
  placeIn(id) { const h = this.homes && this.homes[id]; if (!h) return false; this.stand(); this.x = h.x; this.z = h.z === undefined ? this.z : h.z; this.baseY = this.y = h.y || 0; this.face = h.face || this.face;
    this.yaw = this.face * 0.42; this.target = null; this.v = 0; if (h.idle) this.spec.idle = h.idle; this.curHome = h; if (h.sit) this.sit(Object.assign({}, h.sit)); return true; }
  livesIn(id) { return this.home === id || !!(this.homes && this.homes[id]); }
  faceTo(x) { this.face = Math.sign(x - this.x) || this.face; }
  act(clip, at, ev) { this.actClip = clip; this.actT = 0; this.actEv = ev ? { at, fn: ev } : null; }
  /* sit on a seat { x, y (seat top), z, yaw, cardDz (how far to slide the sprite toward the lens so the seat doesn't hide the legs) } */
  sit(seat) { this.sitting = Object.assign({ fromY: this.y, fromZ: this.z }, seat); this.target = null; this.path = null; this.v = 0; this.x = seat.x; }
  stand(z) { this.sitting = null; this.sitK = 0; this.path = null; this.y = this.baseY; if (z !== undefined) this.z = z; this.cardDz = 0; }
  /* walk in a straight line through 3D (up steps, away from the lens…) at `speed`, then call cb */
  moveTo3(p, cb) { const dx = p.x - this.x, dy = (p.y || 0) - this.y, dz = p.z - this.z, len = Math.hypot(dx, dz) || 0.001;
    this.path = { x0: this.x, y0: this.y, z0: this.z, x1: p.x, y1: p.y || 0, z1: p.z, t: 0, dur: len / (p.speed || 0.85), yaw: Math.atan2(dx, dz), cb }; this.target = null; this.sitting = null; this.sitK = 0; }
  setVisible(on) { this.visible = on; this.card.visible = on; this.blob.visible = on; this.shadow.visible = on; if (this.propObj) this.propObj.visible = on; }
  update(dt) {
    const S0 = this.spec, H = this.curHome || S0;
    if (H.wander && this.target === null && !this.path && !this.sitting && !this.talking && !this.dir) { this.wanderT -= dt;
      if (this.wanderT <= 0) { const w = H.wander; this.walkTo(lerp(w.x0, w.x1, Math.random())); this.wanderT = lerp(w.pause[0], w.pause[1], Math.random()); } }
    if (H.routine && !this.actClip && !this.talking && Math.abs(this.v) < 0.05) { this.routineT -= dt;
      if (this.routineT <= 0) { const r = H.routine, clip = r.clips[Math.floor(Math.random() * r.clips.length)]; this.routineT = lerp(r.every[0], r.every[1], Math.random());
        this.act(clip, r.at || 0.4, () => { if (r.sound && this.visible) AUDIO.sfx(r.sound, { gain: r.gain || 0.35, pan: clamp((this.x - R.cam.position.x) / 10, -0.8, 0.8) }); }); } }
    let dir = this.dir;
    if (!dir && this.target !== null) { const d = this.target - this.x;
      if (Math.abs(d) < 0.06) { this.target = null; const cb = this.onArrive; this.onArrive = null; if (cb) cb(this); }
      else dir = Math.sign(d) * Math.min(1, Math.abs(d) / 0.35 + 0.25); }
    if (this.sitting || this.path) dir = 0;
    this.v = damp(this.v, dir * this.speed, dir ? 5 : 8, dt); this.x += this.v * dt;
    let sp = Math.abs(this.v), pathYaw = null;
    if (this.path) { const P = this.path; P.t += dt; const u = clamp(P.t / P.dur, 0, 1);
      this.x = lerp(P.x0, P.x1, u); this.y = lerp(P.y0, P.y1, u); this.z = lerp(P.z0, P.z1, u); sp = u < 1 ? Math.hypot(P.x1 - P.x0, P.z1 - P.z0) / P.dur : 0; pathYaw = P.yaw; this.v = 0;
      if (u >= 1) { this.path = null; if (P.cb) P.cb(this); } }
    if (sp > 0.05) { this.face = Math.sign(this.v); this.lookYaw = null; }
    if (sp > 0.2 && this.actClip) this.actClip = null;
    this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
    let yawGoal = this.sitting ? (this.sitting.yaw || 0) : pathYaw !== null ? pathYaw : sp > 0.12 ? this.face * 1.32 : this.lookYaw !== null ? this.lookYaw : this.face * 0.42;
    if (Math.abs(yawGoal - this.yaw) > Math.PI) yawGoal += yawGoal > this.yaw ? -Math.PI * 2 : Math.PI * 2;
    this.yaw = damp(this.yaw, yawGoal, sp > 0.12 ? 9 : 4, dt);
    // clips: idle (or seated), talking while a bubble is up, the walk with its playback matched to ground speed, one-shot acts
    this.idleT += dt; this.talk = damp(this.talk, this.talking && sp < 0.1 ? 1 : 0, 3, dt);
    const S = this.spec, walk = S.walk || 'Walk_Loop'; this.phase += dt * sp / QA.speed(walk);
    { const n = Math.floor(this.phase / (QA.clips[walk].dur / 2)); if (n !== this.stepN) { this.stepN = n; if (sp > 0.25 && Actor.onStep && this.visible) Actor.onStep(this); } }
    this.sitK = damp(this.sitK, this.sitting ? 1 : 0, 5, dt);
    const L = [[S.idle || 'Idle_Loop', this.idleT, 1], ['Sitting_Idle_Loop', this.idleT, this.sitK], ['Idle_Talking_Loop', this.idleT * 0.9, this.talk * 0.85 * (1 - this.sitK)], [walk, this.phase, smooth(0.04, 0.55, sp)]];
    if (this.actClip) { this.actT += dt; const c = QA.clips[this.actClip], w = smooth(0, 0.25, this.actT) * smooth(c.dur, c.dur - 0.35, this.actT);
      L.push([this.actClip, Math.min(this.actT, c.dur - 0.02), w * 0.9]);
      if (this.actEv && this.actT >= this.actEv.at) { const f = this.actEv.fn; this.actEv = null; f(this); }
      if (this.actT > c.dur) this.actClip = null; }
    this.pose(L);
    if (this.sitting) { const st = this.sitting, k = this.sitK; this.y = lerp(st.fromY, st.y - (this.sitDrop - (st.drop || 0.1)) * (S.s || 1), k); this.x = st.x; this.z = lerp(st.fromZ, st.z, k); this.cardDz = (st.cardDz || 0) * k; }
    else if (!this.path) this.y = damp(this.y, this.baseY, 8, dt);
    this.root.position.set(this.x, this.y, this.z); this.root.rotation.y = this.yaw;
    if (this.propObj) { this.root.updateMatrixWorld(true); this.propBone.getWorldPosition(this.propObj.position);
      if (this.propObj.userData.kind === 'scroll') this.propObj.quaternion.setFromEuler(new THREE.Euler(0, this.yaw, 0)); else this.propObj.quaternion.identity(); }
  }
  pose(layers) {
    const D = this.D, B = this.DB, pel = this.pel, pb = this.pb;
    let first = true, wsum = 0;
    for (const [name, t, w] of layers) { if (w <= 0.001) continue; const c = QA.clips[name];
      if (first) { QA.sample(c, t, D, pel, this.pelvisH); first = false; wsum = w; continue; }
      QA.sample(c, t, B, pb, this.pelvisH); wsum += w; const k = w / wsum; for (let i = 0; i < D.length; i++) D[i].slerp(B[i], k); pel.lerp(pb, k); }
    const bones = this.bones, P = QA.M.skel.parents, Wq = this.W;
    for (let i = 0; i < bones.length; i++) { if (i === 0) D[0].identity(); Wq[i].copy(D[i]).multiply(this.wr[i]); bones[i].quaternion.copy(P[i] < 0 ? Wq[i] : QA._a.copy(Wq[P[i]]).invert().multiply(Wq[i])); }
    bones[1].position.fromArray(this.wt[1]).add(pel).applyQuaternion(this.rootInv);
  }
  /* ---------------------------------------------------------------- the sprite */
  sprite() {
    const SW = Math.round(this.VW * PX.D), SH = Math.round(this.VH * PX.D);
    const mk = () => new THREE.WebGLRenderTarget(SW, SH, { type: R.type, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, generateMipmaps: false });
    this.rt = mk(); this.rt2 = mk();
    this.cam = new THREE.OrthographicCamera(-this.VW / 2, this.VW / 2, this.VH / 2, -this.VH / 2, 0.1, 14); this.cam.layers.set(this.layer);
    this.fx = Actor.fxMat(); this.fxU = { t: this.rt.texture, texel: new THREE.Vector2(1 / SW, 1 / SH) };
    this.card = new THREE.Mesh(new THREE.PlaneGeometry(this.VW, this.VH), new THREE.MeshBasicMaterial({ map: this.rt2.texture, alphaTest: 0.5 })); this.card.castShadow = false; this.card.receiveShadow = false; R.scene.add(this.card);
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: PX.T.glow, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.layers.set(2); R.scene.add(this.blob);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3)); sg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2)); sg.setIndex([0, 1, 2, 1, 3, 2]);
    this.shadowMat = Actor.shadowMat(this.rt.texture, SW, SH);
    this.shadow = new THREE.Mesh(sg, this.shadowMat); this.shadow.frustumCulled = false; this.shadow.layers.set(2); R.scene.add(this.shadow);
    Actor.lights();
  }
  render(room) {
    if (!this.visible) return;
    const r = R.r, cy = this.VH / 2 - 0.05, c = Actor._c.set(this.x, this.y + cy, this.z), cam = this.cam;
    const sx = R.toView(c, Actor._sv).x; if (sx < -R.vw * 0.25 || sx > R.vw * 1.25) return;   // off-screen: keep the last sprite
    const d = Actor._d.copy(c).sub(R.cam.position).normalize();
    cam.position.copy(c).addScaledVector(d, -7); cam.lookAt(c); cam.updateMatrixWorld();
    this.card.position.copy(c).addScaledVector(d, -this.cardDz); this.card.quaternion.copy(cam.quaternion);
    const K = Actor.key, RM = Actor.rim, rs = room && room.rim;
    K.position.set(this.x - 2.5, 4 + this.y, this.z + 6); K.target.position.set(this.x, 1.2 + this.y, this.z); K.intensity = room && room.keyK !== undefined ? room.keyK : 1.1;
    if (rs) { RM.position.set(rs[0], rs[1], rs[2]); RM.target.position.set(this.x, 1.2 + this.y, this.z); RM.color.set(rs[5] || 0xffa860);
      RM.intensity = rs[3] * smooth(rs[4], 1, Math.abs(this.x - rs[0])) * (rs[6] ? rs[6].intensity / rs[6].userData.base : 1); } else RM.intensity = 0;
    const bg = R.scene.background; R.scene.background = null; r.setClearColor(0x000000, 0);
    r.setRenderTarget(this.rt); r.clear(); r.render(R.scene, cam);
    this.fx.uniforms.t.value = this.fxU.t; this.fx.uniforms.uTexel.value.copy(this.fxU.texel);
    R.quad.material = this.fx; r.setRenderTarget(this.rt2); r.clear(); r.render(R.quadScene, R.quadCam);
    R.scene.background = bg;
    // floor shadows: a soft contact blob, and the sprite's silhouette projected from the room's main low light
    this.blob.position.set(this.x, this.y + 0.008, this.z + 0.02);
    const ss = room && room.shadowSrc;
    if (!ss || this.sitting) { this.shadowMat.uniforms.uK.value = 0; return; }
    const L = Actor._L.set(ss[0], ss[1], ss[2]), right = Actor._r.set(1, 0, 0).applyQuaternion(cam.quaternion), up = Actor._u.set(0, 1, 0).applyQuaternion(cam.quaternion);
    const base = c.clone().addScaledVector(up, -this.VH / 2), corners = [base.clone().addScaledVector(right, -this.VW / 2), base.clone().addScaledVector(right, this.VW / 2)];
    for (const b of corners.slice()) { const tp = b.clone().addScaledVector(up, this.VH); const k = L.y / Math.max(L.y - tp.y, 0.35); corners.push(new THREE.Vector3(L.x + (tp.x - L.x) * k, 0.01, L.z + (tp.z - L.z) * k)); }
    corners[0].y = corners[1].y = 0.01;
    const sp = this.shadow.geometry.attributes.position; corners.forEach((v, i) => sp.setXYZ(i, v.x, v.y, v.z)); sp.needsUpdate = true;
    this.shadowMat.uniforms.uK.value = 0.55 * smooth(ss[3], 1.0, Math.abs(this.x - ss[0]));
  }
}
Actor.nextLayer = 3; Actor._sv = {}; Actor.onStep = null;
Actor._c = new THREE.Vector3(); Actor._d = new THREE.Vector3(); Actor._L = new THREE.Vector3(); Actor._r = new THREE.Vector3(); Actor._u = new THREE.Vector3();
/* the sprite pass: a 1 px dark rim round the silhouette, and colours posterised to 24 levels (in a tone-mapped space) */
Actor.fxMat = function () {
  if (Actor._fx) return Actor._fx;
  return (Actor._fx = new THREE.ShaderMaterial({ vertexShader: R.SH.vert, depthTest: false, depthWrite: false, uniforms: { t: { value: null }, uTexel: { value: new THREE.Vector2() }, uOut: { value: G.flags.nooutline ? 0 : 1 } },
    fragmentShader: `varying vec2 vUv; uniform sampler2D t; uniform vec2 uTexel; uniform float uOut;
      vec3 post(vec3 c){ vec3 d = pow(c / (1.0 + c), vec3(1.0 / 2.2)); d = floor(d * 24.0 + 0.5) / 24.0; vec3 l = pow(d, vec3(2.2)); return l / max(1.0 - l, 1e-3); }
      void main(){ vec4 c = texture2D(t, vUv);
        if (c.a < 0.5) { if (uOut < 0.5) { gl_FragColor = vec4(0.0); return; }
          vec4 a = texture2D(t, vUv + vec2(uTexel.x, 0.0)), b = texture2D(t, vUv - vec2(uTexel.x, 0.0)), d = texture2D(t, vUv + vec2(0.0, uTexel.y)), e = texture2D(t, vUv - vec2(0.0, uTexel.y));
          float n = step(0.5, a.a) + step(0.5, b.a) + step(0.5, d.a) + step(0.5, e.a);
          if (n > 0.5) { vec3 s = (a.rgb * step(0.5, a.a) + b.rgb * step(0.5, b.a) + d.rgb * step(0.5, d.a) + e.rgb * step(0.5, e.a)) / n; gl_FragColor = vec4(s * 0.28, 1.0); return; }
          gl_FragColor = vec4(0.0); return; }
        gl_FragColor = vec4(post(c.rgb), 1.0); }` }));
};
Actor.shadowMat = (tex, SW, SH) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2,
  uniforms: { t: { value: tex }, uK: { value: 0 }, uTexel: { value: new THREE.Vector2(1 / SW, 1 / SH) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D t; uniform float uK; uniform vec2 uTexel;
    void main(){ float a = 0.0; for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) a += texture2D(t, vUv + vec2(float(i), float(j)) * uTexel * (1.0 + vUv.y * 2.5)).a; a /= 25.0;
      gl_FragColor = vec4(0.0, 0.0, 0.0, a * uK * (1.0 - vUv.y * 0.75)); }` });
/* a key and a rim light that only the sprite cameras see: they keep faces and dark clothes readable in a dark room */
Actor.lights = function () {
  if (Actor.key) return;
  const set = (L) => { L.layers.disableAll(); for (let i = 3; i < 32; i++) L.layers.enable(i); R.scene.add(L); R.scene.add(L.target); return L; };
  Actor.key = set(new THREE.DirectionalLight(0xffd8b0, 1.1)); Actor.rim = set(new THREE.DirectionalLight(0xffa860, 0.9));
};
/* outfit dye: the painted texture keeps its shading; saturated leather/wool (L), green cloth (G) and pale linen or
   metal (P) are re-coloured separately, scaled by how bright the original paint was. A missing target keeps the paint. */
Actor.dyes = {};
Actor.dye = function (tex, d) {
  const key = tex.uuid + JSON.stringify(d); if (Actor.dyes[key]) return Actor.dyes[key];
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: d.rough || 0.8, metalness: d.metal || 0, side: THREE.DoubleSide });
  const U = { uL: { value: new THREE.Color(d.L === undefined ? 0 : d.L) }, uP: { value: new THREE.Color(d.P === undefined ? 0 : d.P) }, uG: { value: new THREE.Color(d.G === undefined ? 0 : d.G) },
    uUse: { value: new THREE.Vector3(d.L === undefined ? 0 : 1, d.P === undefined ? 0 : 1, d.G === undefined ? 0 : 1) } };
  m.onBeforeCompile = (sh) => {   // one shared program; each material brings its own colours as uniforms
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uL, uP, uG, uUse;').replace('#include <map_fragment>', `#include <map_fragment>
      { vec3 c = pow(max(diffuseColor.rgb, 0.0), vec3(1.0 / 2.2)); float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), sat = (mx - mn) / (mx + 1e-4);
        float hue = 0.0; if (mx - mn > 1e-4) { if (mx == c.r) hue = mod((c.g - c.b) / (mx - mn), 6.0); else if (mx == c.g) hue = (c.b - c.r) / (mx - mn) + 2.0; else hue = (c.r - c.g) / (mx - mn) + 4.0; } hue *= 60.0;
        float wG = smoothstep(0.25, 0.4, sat) * smoothstep(55.0, 70.0, hue) * (1.0 - smoothstep(160.0, 175.0, hue));
        float wL = smoothstep(0.36, 0.5, sat) * (1.0 - wG);
        vec3 lin = diffuseColor.rgb, outc = mix(lin, uP * clamp(mx / 0.6, 0.5, 1.4), uUse.y);
        outc = mix(outc, mix(lin, uL * clamp(mx / 0.26, 0.35, 1.7), uUse.x), wL);
        outc = mix(outc, mix(lin, uG * clamp(mx / 0.22, 0.35, 1.8), uUse.z), wG);
        diffuseColor.rgb = outc; }`);
  };
  m.customProgramCacheKey = () => 'dye3';
  return (Actor.dyes[key] = m);
};
Actor.cloth = function (w, h, draw) { const p = new Pix(w, h); draw(p); const t = p.tex({ mip: false }); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping; t.flipY = true; return t; };
/* the royal crown (also used on its cushion in the bedroom) and a guard's kettle hat */
Actor.crown = function (k) {
  const grp = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xe0a83a, roughness: 0.32, metalness: 0.85, emissive: 0x3a2000 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.1, 0.045, 18, 1, true), gold); grp.add(band);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 4), gold); c.position.set(Math.sin(a) * 0.103, 0.05, Math.cos(a) * 0.103); grp.add(c); }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.014), new THREE.MeshStandardMaterial({ color: 0xc02020, roughness: 0.2, emissive: 0x400000 })); gem.position.set(0, 0.0, 0.108); grp.add(gem);
  grp.scale.setScalar(k); return grp;
};
Actor.helmet = function (col) {
  const grp = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: col || 0x9aa2ae, roughness: 0.35, metalness: 0.8 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.118, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel); grp.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.02, 16), steel); brim.position.y = -0.005; grp.add(brim);
  return grp;
};
