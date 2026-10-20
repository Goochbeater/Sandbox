/* QBODY — characters built on the CC0 base bodies. A template (T.qb) carries the body key, scale, a (costumed) geometry
   and materials; CharInst builds a 65-joint render skeleton beside the 19-bone logical rig and QB.drive() copies the
   logical rig's pose onto it every frame (spine_01 blended, fingers from real grip / relaxed hand shapes). */
QB.GRIP = null;
QB.handShapes = function () {
  if (QB.GRIP) return QB.GRIP;
  const NB = QB.NB, S = QB.M.skel, tmp = new Float32Array(NB * 4), q = (i) => new THREE.Quaternion(tmp[i * 4], tmp[i * 4 + 1], tmp[i * 4 + 2], tmp[i * 4 + 3]);
  const rel = (clip, t, side) => {   // finger deltas relative to the hand: G = D_hand^-1 · D_finger (from the given side, mirrored to both)
    QB.sample(QB.clips[clip], t, false, tmp, null);
    const out = {}; const hand = q(QB.idx['hand_' + side]).invert();
    S.names.forEach((n, i) => { if (!/_0\d(_leaf)?_[lr]$/.test(n) || !n.endsWith('_' + side)) return; const g = hand.clone().multiply(q(i));
      out[n] = g; const m = n.slice(0, -1) + (side === 'r' ? 'l' : 'r'); out[m] = new THREE.Quaternion(g.x, -g.y, -g.z, g.w); });
    return out;
  };
  QB.GRIP = { grip: rel('Sword_Idle', 0.2, 'r'), open: rel('Idle_Loop', 0.4, 'r') };
  return QB.GRIP;
};
/* build the render skeleton for an instance */
QB.attach = function (inst, T) {
  const qb = T.qb, b = QB.bind(qb.key), NB = QB.NB, P = QB.M.skel.parents, names = QB.M.skel.names;
  const bones = names.map((n, i) => { const o = new THREE.Bone(); o.name = 'q_' + n; o.position.set(...b.lt[i]); o.quaternion.set(...b.lr[i]); return o; });
  bones.forEach((o, i) => { if (P[i] >= 0) bones[P[i]].add(o); });
  const root = bones[0]; root.scale.setScalar(qb.s); inst.inner.add(root); inst.inner.updateMatrixWorld(true);
  const inv = []; for (let i = 0; i < NB; i++) inv.push(new THREE.Matrix4().fromArray(b.ibm, i * 16));
  const skel = new THREE.Skeleton(bones, inv);
  const meshes = [];
  for (const part of qb.parts) {
    const me = new THREE.SkinnedMesh(part.geo, part.mats.length > 1 ? part.mats : part.mats[0]);
    me.frustumCulled = false; me.castShadow = part.shadow !== false; me.receiveShadow = true; me.name = part.name || 'qbody'; if (part.hidden) me.visible = false;
    inst.inner.add(me); me.bind(skel, new THREE.Matrix4()); meshes.push(me); inst.meshes.push(me);
  }
  // per-joint delta source: logical bone index (>=0), -1 = parent's delta, -2 = finger (hand · grip shape), -3 = spine_01 blend
  const src = new Int16Array(NB).fill(-1), hand = new Int16Array(NB).fill(-1);
  names.forEach((n, i) => { const k = QB.MAP.indexOf(n); if (k >= 0) src[i] = k; else if (/_0\d(_leaf)?_[lr]$/.test(n)) { src[i] = -2; hand[i] = n.endsWith('_l') ? 8 : 12; } else if (n === 'spine_01') src[i] = -3; });
  inst.q = { bones, skel, meshes, s: qb.s, wr: b.wr.map((r) => new THREE.Quaternion(...r)), lt: b.lt, src, hand, D: names.map(() => new THREE.Quaternion()), W: names.map(() => new THREE.Quaternion()),
    our: [], rootInvRot: new THREE.Quaternion(...b.wr[0]).invert(), gripL: 1, gripR: 1 };
  for (let i = 0; i < 19; i++) inst.q.our.push(new THREE.Quaternion());
  QB.handShapes();
};
QB._t = new THREE.Quaternion(); QB._v = new THREE.Vector3();
QB.PARENT19 = [-1, 0, 1, 2, 3, 2, 5, 6, 7, 2, 9, 10, 11, 0, 13, 14, 0, 16, 17];
QB.drive = function (inst) {
  const Q = inst.q, B = inst.bones, our = Q.our, P = QB.M.skel.parents, names = QB.M.skel.names;
  // logical rig world rotations (inner space; rest = identity)
  for (let i = 0; i < 19; i++) { const p = QB.PARENT19[i]; if (p < 0) our[i].copy(B[i].quaternion); else our[i].copy(our[p]).multiply(B[i].quaternion); }
  const G = QB.GRIP, fingersFromMocap = inst.mo && inst.mo.fingers;
  for (let i = 0; i < names.length; i++) {
    const s = Q.src[i], D = Q.D[i];
    if (i === 0) D.identity();
    else if (s >= 0) D.copy(our[s]);
    else if (s === -3) D.copy(our[0]).slerp(our[1], 0.55);
    else if (s === -2) {
      if (fingersFromMocap) D.copy(fingersFromMocap[i]);
      else { const h = Q.hand[i], g = h === 8 ? Q.gripL : Q.gripR, shp = G.grip[names[i]], op = G.open[names[i]];
        D.copy(our[h]); if (shp && op) { QB._t.copy(op).slerp(shp, g); D.multiply(QB._t); } }
    } else D.copy(Q.D[P[i]]);
    Q.W[i].copy(D).multiply(Q.wr[i]);
  }
  for (let i = 0; i < names.length; i++) {
    const bone = Q.bones[i], p = P[i];
    if (p < 0) bone.quaternion.copy(Q.W[i]); else bone.quaternion.copy(Q.W[p]).invert().multiply(Q.W[i]);
  }
  // pelvis follows the logical root bone (position in inner space → root joint space)
  const pv = QB._v.copy(B[0].position).applyQuaternion(Q.rootInvRot).multiplyScalar(1 / Q.s);
  Q.bones[1].position.copy(pv);
};
/* ---------------------------------------------------------------- costume (regions from bind-space position) */
QB.regions = function (key, s) {
  const b = QB.bind(key), y = (n) => b.wt[QB.idx[n]][1], x = (n) => Math.abs(b.wt[QB.idx[n]][0]);
  return { wristX: x('hand_l'), elbowX: x('lowerarm_l'), shoulderX: x('upperarm_l') - 0.02, neckY: (y('neck_01') + y('spine_03')) * 0.5 + 0.03, headY: y('Head') - 0.03, pelvisY: y('pelvis'), kneeY: y('calf_l'), ankleY: y('foot_l'), s };
};
/* smooth + inflate clothed areas so garments drape over the anatomy instead of shrink-wrapping it */
QB.dress = function (geo, R, spec) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal, n = pos.count;
  // weld by position so seams move together
  const key = (i) => Math.round(pos.getX(i) * 2000) + ',' + Math.round(pos.getY(i) * 2000) + ',' + Math.round(pos.getZ(i) * 2000);
  const id = new Int32Array(n), groups = new Map(); let gc = 0;
  for (let i = 0; i < n; i++) { const k = key(i); let g = groups.get(k); if (g === undefined) { g = gc++; groups.set(k, g); } id[i] = g; }
  const gp = new Float32Array(gc * 3), gn = new Float32Array(gc * 3), cnt = new Float32Array(gc);
  for (let i = 0; i < n; i++) { const g = id[i]; gp[g * 3] += pos.getX(i); gp[g * 3 + 1] += pos.getY(i); gp[g * 3 + 2] += pos.getZ(i); gn[g * 3] += nrm.getX(i); gn[g * 3 + 1] += nrm.getY(i); gn[g * 3 + 2] += nrm.getZ(i); cnt[g]++; }
  for (let g = 0; g < gc; g++) { for (let q = 0; q < 3; q++) gp[g * 3 + q] /= cnt[g]; const l = Math.hypot(gn[g * 3], gn[g * 3 + 1], gn[g * 3 + 2]) || 1; for (let q = 0; q < 3; q++) gn[g * 3 + q] /= l; }
  const nb = Array.from({ length: gc }, () => new Set()), I = geo.index.array;
  for (let t = 0; t < I.length; t += 3) { const a = id[I[t]], b = id[I[t + 1]], c = id[I[t + 2]]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  const amt = new Float32Array(gc), infl = new Float32Array(gc);
  const keep = new Uint8Array(gc).fill(1), maxIn = new Float32Array(gc);
  for (let g = 0; g < gc; g++) { const r = spec(gp[g * 3], gp[g * 3 + 1], gp[g * 3 + 2], R); amt[g] = r.smooth; infl[g] = r.inflate; if (r.shrink) keep[g] = 0; maxIn[g] = r.maxIn || 0; }
  const P0 = gp.slice(), tmp = new Float32Array(gc * 3), iters = spec.iters || 24;
  for (let it = 0; it < iters; it++) {
    for (let g = 0; g < gc; g++) { let sx = 0, sy = 0, sz = 0, k = 0; for (const o of nb[g]) { sx += gp[o * 3]; sy += gp[o * 3 + 1]; sz += gp[o * 3 + 2]; k++; } const a = Math.min(1, amt[g]) * (spec.taubin ? (it & 1 ? -0.53 : 0.5) : 0.5) * (it < iters * Math.min(1, amt[g] + 0.2) ? 1 : 0); tmp[g * 3] = k ? gp[g * 3] + (sx / k - gp[g * 3]) * a : gp[g * 3]; tmp[g * 3 + 1] = k ? gp[g * 3 + 1] + (sy / k - gp[g * 3 + 1]) * a : gp[g * 3 + 1]; tmp[g * 3 + 2] = k ? gp[g * 3 + 2] + (sz / k - gp[g * 3 + 2]) * a : gp[g * 3 + 2]; }
    gp.set(tmp);
  }
  // extra plain (shrinking) passes where a garment should hang flat over the anatomy (chest, abs); the push-back below
  // restores the volume
  if (spec.flatIters) { const fl = new Float32Array(gc); let any = false; for (let g = 0; g < gc; g++) { const r = spec(P0[g * 3], P0[g * 3 + 1], P0[g * 3 + 2], R); fl[g] = r.flat || 0; if (fl[g]) any = true; }
    if (any) for (let it = 0; it < spec.flatIters; it++) { for (let g = 0; g < gc; g++) { if (!fl[g]) { tmp[g * 3] = gp[g * 3]; tmp[g * 3 + 1] = gp[g * 3 + 1]; tmp[g * 3 + 2] = gp[g * 3 + 2]; continue; } let sx = 0, sy = 0, sz = 0, k = 0; for (const o of nb[g]) { sx += gp[o * 3]; sy += gp[o * 3 + 1]; sz += gp[o * 3 + 2]; k++; } const a = 0.5 * fl[g]; tmp[g * 3] = gp[g * 3] + (sx / k - gp[g * 3]) * a; tmp[g * 3 + 1] = gp[g * 3 + 1] + (sy / k - gp[g * 3 + 1]) * a; tmp[g * 3 + 2] = gp[g * 3 + 2] + (sz / k - gp[g * 3 + 2]) * a; } gp.set(tmp); } }
  // keep volume: push smoothed points back out to at least the original surface, then inflate
  for (let g = 0; g < gc; g++) { const dx = P0[g * 3] - gp[g * 3], dy = P0[g * 3 + 1] - gp[g * 3 + 1], dz = P0[g * 3 + 2] - gp[g * 3 + 2]; const out = dx * gn[g * 3] + dy * gn[g * 3 + 1] + dz * gn[g * 3 + 2]; const back = keep[g] ? Math.max(0, out - maxIn[g]) : 0; for (let q = 0; q < 3; q++) gp[g * 3 + q] += gn[g * 3 + q] * (back + infl[g]); }
  const bindPos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { bindPos[i * 3] = pos.getX(i); bindPos[i * 3 + 1] = pos.getY(i); bindPos[i * 3 + 2] = pos.getZ(i); const g = id[i]; pos.setXYZ(i, gp[g * 3], gp[g * 3 + 1], gp[g * 3 + 2]); }
  geo.setAttribute('aBind', new THREE.BufferAttribute(bindPos, 3));
  pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  return geo;
};
/* drop triangles (e.g. the head, replaced by a sculpted one) */
QB.cull = function (geo, fn) {
  const pos = geo.attributes.position, I = geo.index.array, keep = [];
  const groups = geo.groups.map((g) => ({ start: g.start, count: g.count, materialIndex: g.materialIndex }));
  const out = []; const ng = [];
  for (const g of groups) { const s0 = out.length; for (let t = g.start; t < g.start + g.count; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2]; if (fn(pos.getX(a), pos.getY(a), pos.getZ(a)) && fn(pos.getX(b), pos.getY(b), pos.getZ(b)) && fn(pos.getX(c), pos.getY(c), pos.getZ(c))) continue; out.push(a, b, c); } ng.push({ start: s0, count: out.length - s0, materialIndex: g.materialIndex }); }
  void keep; geo.setIndex(new THREE.BufferAttribute(new Uint32Array(out), 1)); geo.clearGroups(); for (const g of ng) if (g.count) geo.addGroup(g.start, g.count, g.materialIndex);
  return geo;
};
/* costume material: skin texture where uncovered, fabric / leather elsewhere, chosen per pixel from the bind position */
QB.costume = async function (key, R, c) {
  const col = await QB.texture(key + '_col', true), nrm = await QB.texture(key + '_nrm', false), rgh = await QB.texture(key + '_rgh', false);
  const m = new THREE.MeshPhysicalMaterial({ map: col, normalMap: nrm, roughnessMap: rgh, roughness: 1, metalness: 0, sheen: 1, sheenColor: new THREE.Color(c.sheen || 0x3a3a46), sheenRoughness: 0.5, envMapIntensity: 0.8 });
  const v3 = (h) => { const q = new THREE.Color(h); return `vec3(${q.r.toFixed(4)},${q.g.toFixed(4)},${q.b.toFixed(4)})`; };
  const F = (x) => (+x).toFixed(4);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFill = CM.fillU; CM.rimHook(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aBind; varying vec3 vB;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvB = aBind;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec3 uFill; varying vec3 vB;
      float ch(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float cn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(ch(i), ch(i + vec3(1,0,0)), f.x), mix(ch(i + vec3(0,1,0)), ch(i + vec3(1,1,0)), f.x), f.y), mix(mix(ch(i + vec3(0,0,1)), ch(i + vec3(1,0,1)), f.x), mix(ch(i + vec3(0,1,1)), ch(i + vec3(1,1,1)), f.x), f.y), f.z); }
      // region: 0 skin, 1 upper garment, 2 lower garment, 3 glove, 4 boot, 5 sleeve (upper garment colour 2)
      float gSkin, gTop, gLow, gGlove, gBoot;
      void region(vec3 p){ float ax = abs(p.x); bool arm = ax > ${F(R.shoulderX)} && p.y > ${F(R.pelvisY + 0.3)};
        gGlove = ${c.glove ? `smoothstep(${F(R.wristX - (c.gauntlet || 0.02))}, ${F(R.wristX - (c.gauntlet || 0.02) + 0.01)}, ax) * (arm ? 1.0 : 0.0)` : '0.0'};
        gBoot = ${c.boots ? `1.0 - smoothstep(${F(c.bootY - 0.01)}, ${F(c.bootY)}, p.y)` : '0.0'};
        float neck = smoothstep(${F(R.neckY + (c.collar ? (c.collarH || 0.05) : 0) - 0.008)}, ${F(R.neckY + (c.collar ? (c.collarH || 0.05) : 0) + 0.008)}, p.y) * (arm ? 0.0 : 1.0);
        ${c.collar ? '' : `neck *= max(1.0 - smoothstep(0.068, 0.078, length(vec2(p.x, p.z + 0.02))), smoothstep(${F(R.headY - 0.005)}, ${F(R.headY + 0.01)}, p.y));   // a round neckline, not a cut across the shoulders`}
        float sleeve = arm ? (1.0 - smoothstep(${F(c.sleeveX || R.wristX - 0.02)}, ${F((c.sleeveX || R.wristX - 0.02) + 0.01)}, ax)) : 1.0;
        gTop = (p.y > ${F(R.pelvisY - 0.02)} || arm) ? sleeve * (1.0 - neck) : 0.0;
        gTop *= 1.0 - gGlove; gLow = p.y <= ${F(R.pelvisY - 0.02)} && !arm ? 1.0 - gBoot : 0.0;
        gSkin = clamp(1.0 - gTop - gLow - gGlove - gBoot, 0.0, 1.0); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        region(vB);
        float fold = cn(vB * vec3(26.0, 9.0, 26.0)) * 0.6 + cn(vB * vec3(60.0, 22.0, 60.0)) * 0.4;
        vec3 cTop = ${c.vest ? `(abs(vB.x) > ${F(R.shoulderX)} && vB.y > ${F(R.pelvisY + 0.3)} ? ${v3(c.top)} : ${v3(c.vest)})` : v3(c.top)} * (0.88 + 0.24 * fold), cLow = ${v3(c.low)} * (0.88 + 0.22 * fold), cGl = ${v3(c.gloveCol || 0x121214)}, cBt = ${v3(c.bootCol || 0x141416)};
        vec3 skinC = diffuseColor.rgb * ${c.skinTintV ? `vec3(${c.skinTintV.map(F).join(',')})` : v3(c.skinTint || 0xffffff)};
        ${MG.flags.dbgreg ? 'cTop = vec3(1.0, 0.0, 0.0); cLow = vec3(0.0, 1.0, 0.0); cGl = vec3(0.0, 0.0, 1.0); cBt = vec3(1.0, 1.0, 0.0);' : ''}
        diffuseColor.rgb = skinC * gSkin + cTop * gTop + cLow * gLow + cGl * gGlove + cBt * gBoot;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = roughnessFactor * gSkin + ${c.vest ? `(abs(vB.x) > ${F(R.shoulderX)} && vB.y > ${F(R.pelvisY + 0.3)} ? ${F(c.topRough || 0.82)} : ${F(c.vestRough || 0.7)})` : F(c.topRough || 0.82)} * gTop + ${F(c.lowRough || 0.85)} * gLow + 0.36 * gGlove + 0.4 * gBoot;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float cover = 1.0 - gSkin; normal = normalize(mix(normal, nonPerturbedNormal, cover));
          // fabric folds as a bump from the bind position: trousers fall in vertical folds and bunch above the boots,
          // sleeves ring round the arm, the tunic creases from the sash
          vec3 p = vB; float ax = abs(p.x); bool armP = ax > ${F(R.shoulderX)} && p.y > ${F(R.pelvisY + 0.3)};
          float h = 0.0;
          if (armP) h = (cn(vec3(p.x * 34.0, p.y * 9.0, p.z * 9.0)) - 0.5) * 0.006 + (cn(vec3(p.x * 80.0, p.y * 20.0, p.z * 20.0)) - 0.5) * 0.0015;
          else if (p.y < ${F(R.pelvisY - 0.02)}) {
            float bunch = ${c.bootY ? `smoothstep(${F(c.bootY + 0.16)}, ${F(c.bootY + 0.01)}, p.y)` : '0.0'};
            float vert = cn(vec3(p.x * 30.0, p.y * 3.2, p.z * 30.0)) - 0.5;
            float ring = sin(p.y * 150.0 + cn(p * 22.0) * 5.0) * 0.5;
            h = vert * 0.009 * (1.0 - bunch * 0.6) + ring * 0.004 * bunch + (cn(p * vec3(70.0, 16.0, 70.0)) - 0.5) * 0.0018;
          } else h = (cn(vec3(p.x * 22.0 + p.y * 9.0, p.y * 7.0, p.z * 22.0)) - 0.5) * 0.006 + (cn(p * vec3(60.0, 18.0, 60.0)) - 0.5) * 0.0015;
          h *= cover * (1.0 - gGlove) * (1.0 - gBoot);
          vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition); float hx = dFdx(h), hy = dFdy(h);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1);
          vec3 grad = sign(det) * (hx * r1 + hy * r2); normal = normalize(abs(det) * normal - grad * ${F(c.foldBump || 1.0)}); }`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        material.sheenColor *= (1.0 - gSkin * 0.9); material.sheenRoughness = mix(0.45, 0.7, gSkin);`)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL);
  };
  m.customProgramCacheKey = () => 'qcos_' + (c.id || key);
  return m;
};
/* ---------------------------------------------------------------- Maul on the base body */
CHAR.maulQBody = async function (T, J, s) {
  const key = 'male', R = QB.regions(key, s);
  const { geo } = QB.geometry(key, (p) => p.name.startsWith('Sphere'));
  QB.cull(geo, (x, y) => y > R.headY - 0.004 && Math.abs(x) < 0.16);   // the sculpted Zabrak head replaces the base head
  const bootY = 0.37, P = R.pelvisY;
  const dressSpec = (x, y, z, R) => { const ax = Math.abs(x), arm = ax > R.shoulderX && y > P + 0.3;
    if (arm) { if (ax > R.wristX - 0.075) return { smooth: 0.35, inflate: 0.004 };                      // gloved hand
      const fa = smooth(R.elbowX - 0.05, R.wristX - 0.12, ax); return { smooth: 1.0, inflate: 0.012 + 0.008 * fa, maxIn: 0.03 }; }
    if (y > R.neckY - 0.02) return { smooth: 0.5, inflate: 0.006, maxIn: 0.004 };                     // neck (under the collar)
    if (y > P - 0.03) return { smooth: 1.0, inflate: 0.016, maxIn: 0.03 };                          // tunic over the chest / abs
    if (y > bootY + 0.02) { const blouse = smooth(bootY + 0.3, bootY + 0.06, y), thigh = smooth(P - 0.3, P - 0.08, y);
      return { smooth: 1.0, inflate: 0.026 + 0.018 * blouse + 0.008 * thigh, maxIn: 0.04 }; }              // loose trousers, bloused over the boots
    if (y < R.ankleY + 0.03) return { smooth: 1.0, inflate: 0.011, shrink: true };                     // boot foot: toes smoothed away
    return { smooth: 1.0, inflate: 0.014, maxIn: 0.02 }; };                                           // boot shaft
  dressSpec.iters = 70; dressSpec.taubin = true;
  QB.dress(geo, R, dressSpec);
  const mat = await QB.costume(key, R, { id: 'maul', top: 0x1d1d22, low: 0x18181b, glove: true, gauntlet: 0.1, boots: true, bootY, collar: 1, collarH: 0.4, sheen: 0x3c3c48 });
  const arm = (x, y) => Math.abs(x) > R.shoulderX && y > P + 0.3;
  const dbg = MG.flags.dbgshell;
  const f = (v) => v.toFixed(4), A = `(abs(vB.x) < ${f(R.shoulderX)} || vB.y < ${f(P + 0.3)})`;
  const neckTop = R.headY + 0.012, neckBase = 1.485;
  const cloth = QB.shellMat(dbg ? 0xff2020 : 0x1d1b1d, 'cloth', 'maulObi', `${A} && vB.y > ${f(P + 0.045)} && vB.y < ${f(P + 0.165)}`);
  const leather = QB.shellMat(dbg ? 0x20ff20 : 0x0f0f11, 'leather', 'maulBelt', `${A} && vB.y > ${f(P + 0.014)} && vB.y < ${f(P + 0.054)}`);
  const collarM = QB.shellMat(dbg ? 0xff8020 : 0x1d1d22, 'cloth', 'maulCollar', `vB.y > ${f(neckBase - 0.012)} && vB.y < ${f(neckTop)}`);
  const tab = QB.shellMat(dbg ? 0x2040ff : 0x161619, 'cloth', 'maulTab', `${A} && abs(vB.x) > 0.038 && abs(vB.x) < ${f(0.112)} && vB.y > ${f(P + 0.1)}`);
  const parts = [{ geo, mats: [mat], name: 'qbody' }];
  parts.push({ geo: QB.shell(geo, (x, y) => !arm(x, y) && y > P + 0.02 && y < P + 0.19, 0.019), mats: [cloth], name: 'obi' });
  parts.push({ geo: QB.shell(geo, (x, y) => !arm(x, y) && y > P - 0.005 && y < P + 0.075, 0.03), mats: [leather], name: 'belt' });
  parts.push({ geo: QB.shell(geo, (x, y, z) => !arm(x, y) && y > neckBase - 0.04 && y < neckTop + 0.02 && Math.hypot(x, z + 0.02) < 0.11, (x, y) => 0.011 + 0.008 * smooth(neckBase, neckTop, y)), mats: [collarM], name: 'collar' });
  parts.push({ geo: QB.shell(geo, (x, y, z) => !arm(x, y) && y > P + 0.08 && y < neckBase + 0.03 && Math.abs(x) > 0.02 && Math.abs(x) < 0.135 && !(y > 1.43 && Math.hypot(x, z) < 0.065), 0.021), mats: [tab], name: 'tabard' });
  parts.push({ geo: QB.shell(geo, (x, y) => !arm(x, y) && y > bootY - 0.035 && y < bootY + 0.012, 0.012), mats: [leather], name: 'bootcuff' });
  parts.push({ geo: QB.shell(geo, (x, y) => arm(x, y) && Math.abs(x) > R.wristX - 0.115 && Math.abs(x) < R.wristX - 0.075, (x) => 0.004 + 0.01 * smooth(R.wristX - 0.075, R.wristX - 0.115, Math.abs(x))), mats: [leather], name: 'gauntlet' });
  T.qb = { key, s, parts }; T.clothR = 1.22;   // baggier trousers: wider leg colliders for the skirt
};

/* a garment shell: the body triangles inside a region, pushed out along their normals (keeps the body's skinning, so the
   piece can never float off or sink in). opt.off(x,y,z) → offset metres; opt.cap: close the band edges with a lip */
QB.shell = function (geo, pred, off, name) {
  const pos = geo.attributes.position, nrm = geo.attributes.normal, bp = geo.attributes.aBind, J = geo.attributes.skinIndex, W = geo.attributes.skinWeight, I = geo.index.array;
  const map = new Map(), P = [], N = [], B = [], JJ = [], WW = [], out = [];
  const vert = (i) => { let k = map.get(i); if (k !== undefined) return k; k = P.length / 3; map.set(i, k);
    const bx = bp.getX(i), by = bp.getY(i), bz = bp.getZ(i), o = typeof off === 'function' ? off(bx, by, bz) : off;
    P.push(pos.getX(i) + nrm.getX(i) * o, pos.getY(i) + nrm.getY(i) * o, pos.getZ(i) + nrm.getZ(i) * o); N.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i)); B.push(bx, by, bz);
    for (let q = 0; q < 4; q++) { JJ.push(J.getComponent(i, q)); WW.push(W.getComponent(i, q)); } return k; };
  for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2]; const ok = (i) => pred(bp.getX(i), bp.getY(i), bp.getZ(i)); if (!(ok(a) && ok(b) && ok(c))) continue; out.push(vert(a), vert(b), vert(c)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('aBind', new THREE.Float32BufferAttribute(B, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(JJ, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(WW, 4)); g.setIndex(out); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
};
/* simple material for shells: cloth or leather, with world-space fold / grain from the bind position */
QB.shellMat = function (hex, kind, id, clip) {
  const leather = kind === 'leather';
  const m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: leather ? 0.38 : 0.8, metalness: 0, sheen: leather ? 0 : 1, sheenColor: new THREE.Color(0x3c3c48), sheenRoughness: 0.5, clearcoat: leather ? 0.3 : 0, clearcoatRoughness: 0.45, side: THREE.DoubleSide, envMapIntensity: 0.9 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFill = CM.fillU; CM.rimHook(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aBind; varying vec3 vB;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvB = aBind;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFill; varying vec3 vB;\nfloat sh1(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        ${clip ? 'if (!(' + clip + ')) discard;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float g = sh1(floor(vB * ${leather ? '420.0' : '160.0'})); diffuseColor.rgb *= ${leather ? '0.9 + 0.2 * g' : '0.9 + 0.12 * g + 0.1 * sin(vB.y * 140.0)'}; }`)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL);
  };
  m.customProgramCacheKey = () => 'qshell_' + id; return m;
};
