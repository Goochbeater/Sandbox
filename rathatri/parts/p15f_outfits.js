/* OUTFITS — the cast (and Maul) dressed in modelled clothing: Quaternius "Modular Character Outfits – Fantasy" (CC0),
   regular human proportions on the same 65-joint skeleton, mixed and matched per character and repainted in the shader:
   each outfit texture is baked to class masks (primary / secondary / neutral) + painted detail, so a part takes any
   three-colour palette while keeping its stitching, folds and wear. Heads (with modelled hair) come from the base
   characters; Maul keeps his sculpted Zabrak head. */
QB.OUT = { rmale: { ranger: 'rm_ranger', peasant: 'rm_peasant', P: 'Male_' }, rfemale: { ranger: 'rf_ranger', peasant: 'rf_peasant', P: 'Female_' } };
QB._lin = (hex) => new THREE.Color(hex);
/* g = grade: { rules: [{ h, w, toH, s, v }] (hue-selective remaps, degrees), sat, val, tint }; the painted colours,
   shading and wear stay — only the hues / values the rules pick out change */
QB.outfitMat = async function (kind, g, id, o) {
  o = o || {}; g = g || {};
  const col = await QB.texture(kind + '_col', true), nrm = await QB.texture(kind + '_nrm', false), orm = await QB.texture(kind + '_orm', false);
  const m = new THREE.MeshPhysicalMaterial({ map: col, normalMap: nrm, normalScale: new THREE.Vector2(o.ns || 1, -(o.ns || 1)), roughnessMap: orm, metalnessMap: orm, aoMap: orm, aoMapIntensity: 0.9, roughness: o.rough || 1, metalness: 1,
    sheen: o.sheen !== undefined ? o.sheen : 0.6, sheenColor: new THREE.Color(o.sheenCol || 0x6a6a74), sheenRoughness: 0.55, envMapIntensity: o.env !== undefined ? o.env : 0.85 });
  const rule = (r) => r ? [new THREE.Vector4(r.h / 360, (r.w || 40) / 360, r.toH === undefined || r.toH === null ? -1 : r.toH / 360, r.minS || 0.08), new THREE.Vector2(r.s === undefined ? 1 : r.s, r.v === undefined ? 1 : r.v)] : [new THREE.Vector4(0, 0, -1, 9), new THREE.Vector2(1, 1)];
  const R0 = rule(g.rules && g.rules[0]), R1 = rule(g.rules && g.rules[1]), R2 = rule(g.rules && g.rules[2]);
  const U = { uR0: { value: R0[0] }, uS0: { value: R0[1] }, uR1: { value: R1[0] }, uS1: { value: R1[1] }, uR2: { value: R2[0] }, uS2: { value: R2[1] },
    uG: { value: new THREE.Vector2(g.sat === undefined ? 1 : g.sat, g.val === undefined ? 1 : g.val) }, uTint: { value: new THREE.Color(g.tint || 0xffffff) }, uMetal: { value: o.metal !== undefined ? o.metal : 1 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U); sh.uniforms.uFill = CM.fillU; CM.rimHook(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec4 uR0, uR1, uR2; uniform vec2 uS0, uS1, uS2, uG; uniform vec3 uTint, uFill; uniform float uMetal;
      vec3 q_rgb2hsv(vec3 c) { vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y); return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-6)), d / (q.x + 1e-6), q.x); }
      vec3 q_hsv2rgb(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
      vec3 q_rule(vec3 c, vec4 R, vec2 S) { vec3 h = q_rgb2hsv(c); float d = abs(fract(h.x - R.x + 0.5) - 0.5);
        float w = (1.0 - smoothstep(R.y * 0.55, R.y, d)) * smoothstep(R.w, R.w + 0.08, h.y);
        vec3 h2 = vec3(R.z >= 0.0 ? R.z : h.x, clamp(h.y * S.x, 0.0, 1.0), h.z * S.y); return mix(c, q_hsv2rgb(h2), w); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 c = pow(max(diffuseColor.rgb, 0.0), vec3(1.0 / 2.2));   // grade in display space (hues read as painted)
          c = q_rule(c, uR0, uS0); c = q_rule(c, uR1, uS1); c = q_rule(c, uR2, uS2);
          float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, uG.x) * uG.y;
          diffuseColor.rgb = pow(max(c, 0.0), vec3(2.2)) * uTint; }`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor *= uMetal;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL);
  };
  m.customProgramCacheKey = () => 'qout2';
  return m;
};
/* skin (head / bare arms) on the pack's painted skin, tinted to the character's tone */
QB.skinMat = async function (tex, toneHex, id, o) {
  o = o || {};
  const col = await QB.texture(tex + '_col', true), nrm = await QB.texture(tex + '_nrm', false), rgh = QB.tex[tex + '_rgh:l'] || (document.getElementById('tex_' + tex + '_rgh') ? await QB.texture(tex + '_rgh', false) : null);
  const base = new THREE.Color().setRGB(170 / 255, 113 / 255, 79 / 255, THREE.SRGBColorSpace), t = new THREE.Color(toneHex || 0xc8906c);
  const m = new THREE.MeshPhysicalMaterial({ map: col, normalMap: nrm, normalScale: new THREE.Vector2(0.8, -0.8), roughnessMap: rgh, roughness: rgh ? 1 : 0.55, metalness: 0,
    color: new THREE.Color(clamp(t.r / base.r, 0.1, 1.8), clamp(t.g / base.g, 0.1, 1.8), clamp(t.b / base.b, 0.1, 1.8)), sheen: 0.35, sheenColor: new THREE.Color(0xa05040), sheenRoughness: 0.5, envMapIntensity: 0.55 });
  m.onBeforeCompile = (sh) => { sh.uniforms.uFill = CM.fillU; CM.rimHook(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFill;').replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL); };
  m.customProgramCacheKey = () => 'qskin';
  return m;
};
QB.gloveMat = function (hex, id) { const m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color(0x404048), envMapIntensity: 0.9 });
  m.onBeforeCompile = (sh) => { sh.uniforms.uFill = CM.fillU; CM.rimHook(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFill;').replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL); };
  m.customProgramCacheKey = () => 'qglove'; return m; };
/* keep only the triangles whose three corners pass fn (e.g. the head of a full body) */
QB._keepFix = function (geo, fn) {   // QB.cull drops a triangle only when ALL corners fail; keep() needs "drop if ANY fails"
  const pos = geo.attributes.position, I = geo.index.array, out = [];
  for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2]; if (fn(pos.getX(a), pos.getY(a), pos.getZ(a)) && fn(pos.getX(b), pos.getY(b), pos.getZ(b)) && fn(pos.getX(c), pos.getY(c), pos.getZ(c))) out.push(a, b, c); }
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(out), 1)); geo.clearGroups(); geo.addGroup(0, out.length, 0); geo.computeBoundingSphere(); return geo;
};
/* dress T in an outfit. o = { bind: 'rmale'|'rfemale', s, parts: [[kind, part, pal, opts]], head: bool, tone, glove, hair: [], hairCol, browCol } */
QB.buildOutfit = async function (T, o) {
  const bind = o.bind, OB = QB.OUT[bind], parts = [], sex = bind === 'rfemale' ? 'female' : 'male';
  const skinTex = bind, skin = await QB.skinMat(skinTex, o.tone, (o.id || 'q') + 'skin');
  const glove = o.glove !== undefined && o.glove !== null ? QB.gloveMat(o.glove, (o.id || 'q') + 'glv') : null;
  for (const [kind, part, pal, po] of o.parts) {
    const key = OB[kind], name = OB.P + kind[0].toUpperCase() + kind.slice(1) + '_' + part;
    const { geo, mats } = QB.geometry(key, (p) => p.name === name);
    if (!geo.index.count) { console.warn('no outfit part', name); continue; }
    const mat = await QB.outfitMat(kind, pal, (o.id || 'q') + name, po);
    if (po && po.grow) { const H = QB.bind(bind).wt[QB.idx.Head], P = geo.attributes.position, k = po.grow; for (let i = 0; i < P.count; i++) P.setXYZ(i, H[0] + (P.getX(i) - H[0]) * k[0], H[1] + (P.getY(i) - H[1]) * k[1] + (k[3] || 0), H[2] + (P.getZ(i) - H[2]) * k[2] + (k[4] || 0)); P.needsUpdate = true; geo.computeBoundingSphere(); }
    parts.push({ geo, mats: mats.map((mn) => (mn.startsWith('MI_Regular') ? (glove || skin) : mat)), name: part.toLowerCase(), hidden: po && po.hidden });
    // Jedi tabards: bands cut from the tunic's own surface, over the shoulders to the belt front and back
    if (o.tabard && part === 'Body') {
      const g2 = geo.clone(); g2.setAttribute('aBind', g2.attributes.position.clone());
      const pel = QB.bind(bind).wt[QB.idx.pelvis][1], nk = QB.bind(bind).wt[QB.idx.neck_01][1], x0 = o.tabard.x0 || 0.045, x1 = o.tabard.x1 || 0.118;
      const sh = QB.shell(g2, (x, y, z) => Math.abs(x) > x0 - 0.02 && Math.abs(x) < x1 + 0.02 && y > pel + 0.04 && y < nk + 0.04 && !(y > nk - 0.08 && Math.hypot(x, z + 0.02) < 0.068), 0.011);
      parts.push({ geo: sh, mats: [QB.shellMat(o.tabard.col, 'cloth', (o.id || 'q') + 'tab', `abs(vB.x) > ${x0.toFixed(3)} && abs(vB.x) < ${x1.toFixed(3)} && vB.y > ${(pel + 0.07).toFixed(3)}`)], name: 'tabard' });
    }
  }
  if (o.head) {
    const hk = sex, H = QB.bind(hk).wt[QB.idx.Head], ny = QB.bind(hk).wt[QB.idx.neck_01][1];
    const { geo } = QB.geometry(hk, (p) => p.mat.startsWith('MI_Superhero'));
    QB._keepFix(geo, (x, y, z) => y > ny - (o.neckDrop || 0.035) && Math.abs(x) < 0.11 && z > H[2] - 0.16);
    parts.push({ geo, mats: [await QB.skinMat(hk, o.tone, (o.id || 'q') + 'head')], name: 'head' });
    parts.push({ geo: QB.geometry(hk, (p) => p.mat === 'MI_Eyes').geo, mats: [await QB.eyeMat()], name: 'eyes', shadow: false });
    parts.push({ geo: QB.geometry(hk, (p) => p.mat.startsWith('MI_Hair')).geo, mats: [await QB.hairMat(o.browCol || o.hairCol || 0x2a1c12, (o.id || 'q') + 'brow', sex === 'female' ? 'hair2' : 'hair1')], name: 'brows', shadow: false });
    for (const h of o.hair || []) { const g = QB.refit(QB.geometry(h).geo, QB.HAIR_SRC[h] || 'male', hk); const tx = QB.M.meshes[h].prims[0].mat === 'MI_Hair_2' ? 'hair2' : 'hair1';
      parts.push({ geo: g, mats: [await QB.hairMat(o.hairCol || 0x3a2818, (o.id || 'q') + h, tx)], name: h }); }
  }
  T.qb = { key: bind, s: o.s, parts };
  T.grip = SCULPT.fistFrame(T.J);
};
/* ---------------------------------------------------------------- Maul: the ranger's layered leathers dyed black */
CHAR.maulOutfit = async function (T, J, s) {
  const blk = { sat: 0.1, val: 0.27, tint: 0xe8e8ff }, lea = { sat: 0.06, val: 0.17, tint: 0xf0f0ff }, M = { metal: 0.12, ns: 0.55, env: 0.35 };
  await QB.buildOutfit(T, { bind: 'rmale', s, id: 'maul', head: false, glove: 0x0e0e10,
    parts: [['ranger', 'Body', blk, { sheenCol: 0x505060, ns: 0.7, env: 0.5, metal: 0.2 }], ['ranger', 'Body_Belt_1', lea, M], ['ranger', 'Legs', blk, { ns: 0.7, env: 0.5, metal: 0.2 }], ['ranger', 'Feet_Boots', lea, M], ['ranger', 'Arms', blk, { ns: 0.7, env: 0.5, metal: 0.2 }],
      // the travelling hood (worn with the cloak): the ranger's cowl, roomier for the horns
      ['ranger', 'Head_Hood', { sat: 0.1, val: 0.34, tint: 0xe8e8ff }, { hidden: true, grow: [1.16, 1.1, 1.14, 0.012, 0.004], sheenCol: 0x505060 }]] });
  T.clothR = 1.0;
};
/* ---------------------------------------------------------------- the cast: outfit parts + a grade per character
   ranger texture: green cloth (hue ≈115°) + brown leather (≈30°); peasant: brown vest / trousers / boots (≈30°, saturated)
   + cream shirt (≈40°, pale) */
CAST.QO = (function () {
  const R = (part, g, po) => ['ranger', part, g, po], Pz = (part, g, po) => ['peasant', part, g, po];
  const GREEN = 115, BROWN = 28;
  const g = (rules, sat, val, tint) => ({ rules, sat, val, tint });
  const jedi = (body, legs, boots) => [Pz('Body', body), Pz('Arms', body), Pz('Legs', legs), R('Feet_Boots', boots), R('Body_Belt_1', g([], 1, 0.8), { metal: 0.6 })];
  const uni = (cloth, leather, legs, boots, x) => [R('Body', cloth), R('Arms', cloth), R('Arms_Bracer', leather, { metal: 0.7 }), R('Legs', legs), R('Feet_Boots', boots), R('Body_Belt_1', leather, { metal: 0.7 })].concat(x || []);
  const toBlue = (h, s, v) => ({ h: GREEN, w: 80, toH: h, s, v, minS: 0.03 }), CREAM = (s, v) => ({ h: 38, w: 30, s, v, minS: 0.02 }), leatherV = (v, s) => ({ h: BROWN, w: 45, s: s === undefined ? 1 : s, v });
  return {
    quigon: { tabard: { col: 0x4e3c2a }, parts: jedi(g([leatherV(0.95, 0.85), CREAM(1.3, 0.72)], 0.9, 0.95, 0xfff0dc), g([leatherV(2.1, 0.55)], 0.8, 1.0, 0xfff0e0), g([], 0.7, 0.55)), hair: ['Hair_Long', 'Hair_Beard'], hairCol: 0x5a4636, browCol: 0x4a3626 },
    obiwan: { tabard: { col: 0x9a8462 }, parts: jedi(g([leatherV(1.35, 0.55), CREAM(1.15, 0.8)], 0.85, 0.95), g([leatherV(2.8, 0.42)], 0.8, 1.0, 0xfff4e4), g([], 0.7, 0.55)), hair: ['Hair_SimpleParted'], hairCol: 0x9a6a3e, browCol: 0x7a5230 },
    darsha: { female: true, tabard: { col: 0x5a4430, x0: 0.04, x1: 0.1 }, parts: jedi(g([leatherV(1.1, 0.8), CREAM(1.2, 0.74)], 0.9, 0.95, 0xfff0e0), g([leatherV(2.2, 0.5)], 0.8, 0.95, 0xfff0e0), g([], 0.7, 0.5)), hair: ['Hair_Buns'], hairCol: 0x3a2214, browCol: 0x3a2418 },
    guard: { parts: uni(g([toBlue(220, 0.9, 1.0), leatherV(0.8)], 1, 1), g([leatherV(0.75)], 1, 0.9), g([toBlue(29, 0.35, 0.55)], 0.8, 0.9), g([], 0.6, 0.45), [R('Acc_Pauldron', g([toBlue(220, 0.9, 1.0)], 1, 1), { metal: 0.8 })]), glove: 0x16120e, hair: ['Hair_Buzzed'], hairCol: 0x2a1c12 },
    panaka: { parts: uni(g([toBlue(29, 0.2, 0.35), leatherV(0.55)], 0.8, 0.9), g([leatherV(0.5)], 0.8, 0.85), g([toBlue(29, 0.1, 0.35)], 0.5, 0.8), g([], 0.5, 0.4)), glove: 0x141210, hair: ['Hair_Buzzed'], hairCol: 0x120c08 },
    csf: { cullHead: true, parts: uni(g([toBlue(223, 0.7, 0.55), { h: BROWN, w: 45, toH: 220, s: 0.35, v: 0.7 }], 1, 1), g([{ h: BROWN, w: 45, toH: 220, s: 0.3, v: 0.6 }], 1, 1), g([toBlue(223, 0.4, 0.4)], 0.8, 0.9), g([], 0.4, 0.4), [R('Acc_Pauldron', g([toBlue(223, 0.5, 0.7), { h: BROWN, w: 45, toH: 220, s: 0.3, v: 0.8 }], 1, 1), { metal: 0.9 })]), glove: 0x121216 },
    senate: { cullHead: true, parts: uni(g([toBlue(227, 1.1, 0.95), { h: BROWN, w: 45, toH: 225, s: 0.9, v: 0.8 }], 1, 1), g([{ h: BROWN, w: 45, toH: 225, s: 0.8, v: 0.7 }], 1, 1), g([toBlue(227, 1.0, 0.8)], 1, 0.9), g([], 0.4, 0.4)), glove: 0x101014 },
    gungan: { cullHead: true, parts: [Pz('Body', g([{ h: 38, w: 32, toH: 32, s: 2.2, v: 0.86, minS: 0.02 }, leatherV(0.9)], 0.95, 1.0)), Pz('Legs', g([leatherV(0.9)], 0.9, 1.0)), Pz('Feet', g([], 0.9, 0.9)), Pz('Arms', g([{ h: 38, w: 32, toH: 32, s: 2.2, v: 0.86, minS: 0.02 }, leatherV(0.9)], 0.95, 1.0))] },   // Gungan warrior leathers, not a clean white shirt
    thug: { cullHead: true, parts: uni(g([], 0.15, 0.4), g([], 0.1, 0.35), g([], 0.1, 0.35), g([], 0.1, 0.3), [R('Acc_Pauldron', g([], 0.1, 0.5), { metal: 0.9 })]), glove: 0x121214 },
    enforcer: { cullHead: true, parts: uni(g([toBlue(0, 0.8, 0.6), leatherV(0.5, 0.6)], 1, 1), g([leatherV(0.55, 0.5)], 1, 1), g([], 0.1, 0.35), g([], 0.1, 0.3), [R('Acc_Pauldron', g([toBlue(43, 0.9, 1.2), { h: BROWN, w: 45, toH: 42, s: 1.2, v: 1.3 }], 1, 1), { metal: 0.95 })]), glove: 0x141414 },
    tusken: { cullHead: true, parts: [Pz('Body', g([], 0.35, 1.2, 0xe8dcc0)), Pz('Arms', g([], 0.35, 1.2, 0xe8dcc0)), Pz('Legs', g([], 0.35, 1.0, 0xe0d4b8)), R('Feet_Boots', g([], 0.3, 0.7)), R('Arms_Bracer', g([], 0.4, 0.7))], glove: 0x4a3424 },
    garyn: { parts: [Pz('Body', g([{ h: BROWN, w: 40, toH: 358, s: 1.2, v: 0.8, minS: 0.3 }, { h: 42, w: 30, s: 0.1, v: 0.25 }], 1, 1)), Pz('Arms', g([{ h: 42, w: 40, s: 0.1, v: 0.25 }], 1, 1)), Pz('Legs', g([], 0.1, 0.3)), R('Feet_Boots', g([], 0.1, 0.3)), R('Body_Belt_1', g([], 0.5, 0.6), { metal: 0.9 })], hair: [], browCol: 0x1a2a14 },
  };
})();
CAST.qOutfit = async function (T, spec, qc, key, s, withHead) {
  const o = CAST.QO[spec.name]; if (!o) return CAST.qBody(T, spec, qc, key === 'rfemale' ? 'female' : 'male', s, withHead);
  await QB.buildOutfit(T, { bind: key, s, id: 'q_' + spec.name, head: withHead, tone: spec.skin && spec.skin.tone, glove: o.glove, tabard: o.tabard, hair: o.hair, hairCol: o.hairCol, browCol: (spec.skin && spec.skin.brow) || o.browCol, parts: o.parts });
  T.clothR = 1.0;
};
