/* CHARACTERS — templates (meshed once at boot) and instances (SkinnedMesh + bones + attachments per actor). */
const CHAR = { T: {} };
CHAR.MAT_IDS = { tunic: 0, trousers: 1, leather: 2, extra: 3, skin: 4, metal: 5 };
/* skinned geometry from mesh data + weights */
CHAR.skinGeo = function (pos, nrm, idx, W, extra) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(W.idx, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W.wts, 4));
  if (extra) for (const k in extra) g.setAttribute(k, extra[k]);
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
};
/* split a triangle list into material groups by majority vertex material */
CHAR.groupByMat = function (g, matOf, idx) {
  const buckets = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const a = matOf[idx[t]], b = matOf[idx[t + 1]], c = matOf[idx[t + 2]];
    const m = (a === b || a === c) ? a : (b === c ? b : a);
    if (!buckets.has(m)) buckets.set(m, []); buckets.get(m).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  const all = []; const groups = [];
  for (const [m, list] of [...buckets.entries()].sort((p, q) => p[0] - q[0])) { groups.push({ start: all.length, count: list.length, mat: m }); for (const v of list) all.push(v); }
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(all), 1));
  for (const gr of groups) g.addGroup(gr.start, gr.count, gr.mat);
  return groups;
};
/* head-mesh weights (head space y/z): jaw-line plane tilted up toward the back */
CHAR.headWeights = function (hp, n) {
  const idx = new Uint16Array(n * 4), wts = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) {
    const y = hp[v * 3 + 1], z = hp[v * 3 + 2];
    const cut = -0.78 - (z + 0.45) * 0.36;
    const wh = smooth(cut - 0.18, cut + 0.1, y), wc = 1 - smooth(-2.15, -1.7, y);
    const wn = Math.max(0, 1 - wh - wc);
    const o = [[4, wh], [3, wn], [2, wc]].filter((q) => q[1] > 1e-4); let s = 0; for (const q of o) s += q[1];
    for (let k = 0; k < 4; k++) { idx[v * 4 + k] = k < o.length ? o[k][0] : 0; wts[v * 4 + k] = k < o.length ? o[k][1] / s : 0; }
  }
  return { idx, wts };
};
CHAR.fistWeights = function (m, J, side, def) {
  const F = SCULPT.fistFrame(J); const n = m.nv, idx = new Uint16Array(n * 4), wts = new Float32Array(n * 4);
  const hb = side > 0 ? 8 : 12, fb = side > 0 ? 7 : 11;
  const A = side > 0 ? F.A : V.mx(F.A), W = side > 0 ? F.W : V.mx(F.W);
  for (let v = 0; v < n; v++) {
    const p = [m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2]];
    const u = V.dot(V.sub(p, W), A);
    const wf = smooth(0.0, -0.06, u) * 0.85;
    idx[v * 4] = hb; wts[v * 4] = 1 - wf; idx[v * 4 + 1] = fb; wts[v * 4 + 1] = wf;
  }
  return { idx, wts };
};
/* ------------------------------------------------------------------ MAUL */
CHAR.buildMaul = async function (progress) {
  const useQ = !MG.flags.sdf && await QB.load(), QS = 0.985;
  const qkey = useQ && QB.M.meshes.rmale && !MG.flags.paint ? 'rmale' : 'male';   // modelled outfits (regular body) when baked
  const J = useQ ? QB.joints(qkey, QS) : RIG.joints({ shoulders: 1.06 }), def = RIG.def(J);
  const T = { name: 'maul', J, def, parts: [], attach: [], height: 1.78 };
  progress && await progress(0.1, 'Carving the Zabrak skull');
  const H = await MH.bake(MG.flags.hv || 0.0185);
  // head space -> rest metres
  const n = H.nv, pos = new Float32Array(n * 3), HK = 0.1 * (qkey === 'rmale' ? 1.07 : 1);   // regular-proportion body: a 7 % bigger head (it read pin-headed on those shoulders)
  for (let v = 0; v < n; v++) { pos[v * 3] = J.head[0] + (H.pos[v * 3] - MH.HP[0]) * HK; pos[v * 3 + 1] = J.head[1] + (H.pos[v * 3 + 1] - MH.HP[1]) * HK; pos[v * 3 + 2] = J.head[2] + (H.pos[v * 3 + 2] - MH.HP[2]) * HK; }
  const hw = CHAR.headWeights(H.pos, n);
  const hg = CHAR.skinGeo(pos, H.nrm, H.idx, hw, { aHead: new THREE.BufferAttribute(H.pos, 3), aHorn: new THREE.BufferAttribute(H.horn, 1), aAO: new THREE.BufferAttribute(H.ao, 1) });
  T.parts.push({ geo: hg, mats: [CM.maulSkin()], name: 'head' });
  // eyes (attached to the head bone)
  for (const s of [1, -1]) {
    const e = [MH.EYE_C[0] * s, MH.EYE_C[1], MH.EYE_C[2]];
    const wp = [J.head[0] + (e[0] - MH.HP[0]) * HK, J.head[1] + (e[1] - MH.HP[1]) * HK, J.head[2] + (e[2] - MH.HP[2]) * HK];
    T.attach.push({ bone: 4, geo: new THREE.SphereGeometry(MH.EYE_R * HK * 0.985, 28, 20), mat: CM.eye('sith'), pos: V.sub(wp, J.head), rotY: s * 0.05, name: 'eye' });
  }
  progress && await progress(0.35, 'Weaving the Sith robes');
  if (useQ) await (qkey === 'rmale' ? CHAR.maulOutfit(T, J, QS) : CHAR.maulQBody(T, J, QS));
  else {
    // Maul's costume: fitted high-collared wrap tunic, black tabards, a wide wrapped obi with a leather strap over it, loose
    // trousers bloused over knee boots (turned-down cuff, heavy sole), long leather gauntlets
    const G = SCULPT.humanoid(J, { bulk: 1.07, collar: 'high', lapel: true, tabards: 'trousers', sleeve: [0.063, 0.054, 0.047], cuff: 0.05,
      belt: { h: 0.105, y: 0.075, obi: true, strapMat: 'leather', pouches: true }, trouser: [0.1, 0.074], bootTop: 0.5,
      extra: (grp, J) => {
        const X = grp('boottrim', 'leather', 0.004); X.g.layer = 'boottrim';
        for (const s of [1, -1]) {
          const k = [J.knee[0] * s + 0.002 * s, 0.5, J.knee[2] - 0.018];
          X.add(SDF.rcone([k[0], 0.475, k[2]], [k[0], 0.535, k[2]], 0.066, 0.071), 'su', 0.004);                          // turned-down cuff
          X.add(SDF.box([J.ankle[0] * s + 0.003 * s, 0.012, (J.ankle[2] + J.toe[2]) * 0.5], [0.054, 0.013, 0.14], 0.008), 'su', 0.004);   // heavy sole
          X.add(SDF.box([J.ankle[0] * s, 0.026, J.ankle[2] - 0.038], [0.043, 0.027, 0.034], 0.01), 'su', 0.004);           // heel
        }
        const Bl = grp('blouse', 'trousers', 0.02);
        for (const s of [1, -1]) Bl.add(SDF.ell([J.knee[0] * s, 0.57, J.knee[2] - 0.012], [0.078, 0.07, 0.08]));             // trousers bloused over the boot tops
      } });
    // the box must reach past the A-pose wrists (x ±0.49): at ±0.34 the arms were sliced off mid-sleeve and the forearms never meshed
    const B = await SCULPT.mesh(G, J, { folds: SCULPT.folds(J, 1), res: MG.flags.br || 0.0056, matIds: CHAR.MAT_IDS, box: [-0.6, -0.005, -0.21, 0.6, 1.62, 0.23] });
    const bw = RIG.weights(def, B.pos, B.nv, { allow: def.map((b) => b.i !== 4) });
    const bg = CHAR.skinGeo(B.pos, B.nrm, B.idx, bw, { aAO: new THREE.BufferAttribute(B.ao, 1) });
    CHAR.groupByMat(bg, B.mat, B.idx);
    T.parts.push({ geo: bg, mats: [CM.cloth(0x222228, 0x4a4a58, 0.82, 'maulTunic'), CM.cloth(0x1c1c21, 0x3e3e4a, 0.88, 'maulTrous'), CM.leather(0x141416, 0.38, 'maulLeather'), CM.leather(0x1a1a1d, 0.5, 'maulX')], name: 'body' });
    progress && await progress(0.55, 'Gloving the hands');
    const fists = await SCULPT.meshFists(J, { glove: true, gauntlet: 0.11, gauntletR: 0.05, res: MG.flags.fr || 0.0026 });
    fists.forEach((m, i) => {
      const w = CHAR.fistWeights(m, J, i === 0 ? 1 : -1, def);
      T.parts.push({ geo: CHAR.skinGeo(m.pos, m.nrm, m.idx, w, { aAO: new THREE.BufferAttribute(m.ao, 1) }), mats: [CM.leather(0x141416, 0.36, 'maulGlove')], name: 'fist' + i });
    });
  }
  T.grip = SCULPT.fistFrame(J);
  T.cloth = CLOTH.maulSpec(J);
  progress && await progress(0.85, 'Stitching the cloak');
  await CLOAK.build(T);
  T.stats = { head: H.stats, body: T.qb ? { nv: T.qb.parts[0].geo.attributes.position.count, nt: T.qb.parts[0].geo.index.count / 3 } : {} };
  CHAR.T.maul = T;
  return T;
};
/* ------------------------------------------------------------------ instance */
class CharInst {
  constructor(T, opt) {
    opt = opt || {};
    this.T = T; this.root = new THREE.Group(); this.root.name = T.name;
    this.bones = RIG.makeBones(T.def);
    const holder = new THREE.Group(); this.holder = holder; this.root.add(holder);
    const inner = new THREE.Group(); this.inner = inner; holder.add(inner);
    holder.position.y = 0.95; inner.position.y = -0.95;
    inner.add(this.bones[0]);
    this.root.updateMatrixWorld(true);
    this.skel = new THREE.Skeleton(this.bones);
    this.meshes = [];
    for (const p of T.parts) {
      const me = new THREE.SkinnedMesh(p.geo, p.mats.length > 1 ? p.mats : p.mats[0]);
      me.castShadow = !/^(head|hair|beard|braid|helmet|fist)/.test(p.name) || p.name === 'head' && T.name === 'maul'; me.receiveShadow = true; me.frustumCulled = false; me.name = p.name;
      inner.add(me); me.bind(this.skel, new THREE.Matrix4());
      this.meshes.push(me);
    }
    if (T.qb) QB.attach(this, T);
    this.att = {};
    for (const a of T.attach) {
      const me = new THREE.Mesh(a.geo, a.mat); me.position.set(a.pos[0], a.pos[1], a.pos[2]); if (a.rotY) me.rotation.y = a.rotY; if (a.rotX) me.rotation.x = a.rotX;
      me.castShadow = !!a.shadow; this.bones[a.bone].add(me); (this.att[a.name] = this.att[a.name] || []).push(me);
    }
    this.cloth = T.cloth ? new ClothSet(T.cloth, this) : null;
    this.root.updateMatrixWorld(true);
  }
  setVisible(v) { this.root.visible = v; if (this.cloth) this.cloth.setVisible(v); }
  dispose() { if (this.root.parent) this.root.parent.remove(this.root); if (this.cloth) this.cloth.dispose(); if (this.cape) this.cape.dispose(); if (this.droppedCape) this.droppedCape.dispose(); }
}
