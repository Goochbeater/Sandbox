/* Q CAST — the cast on the CC0 base bodies: real textured heads with modelled hair, bodies dressed per costume
   (tunic / uniform smoothed and eased off the anatomy, sleeves, trousers bloused into boots, gloves), garment shells for
   belts, sashes and tabards. Sculpted heads remain for Gungans and behind closed helmets. */
CAST.QC = {
  quigon: { outfit: 'jedi', top: 0x75664f, tabard: 0x5e4a34, sash: 0x9c8866, belt: 0x3a2416, low: 0x74644c, boots: 0x2e1e14, bootY: 0.46, hair: ['Hair_Long', 'Hair_Beard'], hairCol: 0x5a4636, browCol: 0x4a3626 },
  obiwan: { outfit: 'jedi', top: 0xcdbd9b, tabard: 0xae9a76, sash: 0xd6c6a4, belt: 0x4a2e1a, low: 0xb4a282, boots: 0x2e1e14, bootY: 0.46, hair: ['Hair_SimpleParted'], hairCol: 0x9a6a3e, browCol: 0x7a5230 },
  darsha: { outfit: 'jedi', female: true, top: 0x9a7e58, tabard: 0x6a5238, sash: 0xa88c64, belt: 0x3a2616, low: 0x6a5238, boots: 0x22160e, bootY: 0.44, hair: ['Hair_Buns'], hairCol: 0x3a2214, browCol: 0x3a2418 },
  guard: { outfit: 'uniform', top: 0x2e3a52, vest: 0x2a190e, belt: 0x2a2018, low: 0x3a3026, boots: 0x1a1410, glove: 0x1a1410, bootY: 0.46, hair: ['Hair_Buzzed'], hairCol: 0x2a1c12, collarShell: 0x2e3a52 },
  panaka: { outfit: 'uniform', top: 0x221e1c, vest: 0x1e140e, belt: 0x1a1410, low: 0x2a2a30, boots: 0x1a1410, glove: 0x1a1410, bootY: 0.46, hair: ['Hair_Buzzed'], hairCol: 0x120c08, collarShell: 0x3a281c },
  senate: { outfit: 'robe', top: 0x22398c, belt: 0x101014, low: 0x1a2c70, boots: 0x101014, glove: 0x101014, bootY: 0.4, cullHead: true, collarShell: 0x22398c },
  csf: { outfit: 'uniform', top: 0x1c2436, vest: 0x2a3650, belt: 0x121216, low: 0x1a1e28, boots: 0x121216, glove: 0x121216, bootY: 0.44, cullHead: true },
  gungan: { outfit: 'uniform', top: 0x7a6044, vest: 0x5a3c22, belt: 0x5a3c22, low: 0x7a5e3e, boots: 0x6a4a2e, bootY: 0.3, cullHead: true },
  thug: { outfit: 'uniform', top: 0x2a2a30, vest: 0x1a1a1c, belt: 0x141414, low: 0x222226, boots: 0x141414, glove: 0x141414, bootY: 0.44, cullHead: true },
  enforcer: { outfit: 'uniform', top: 0x3a1414, vest: 0x3a2a14, belt: 0x141414, low: 0x1c1c20, boots: 0x141414, glove: 0x141414, bootY: 0.44, cullHead: true, bulk: 1.2 },
  tusken: { outfit: 'robe', top: 0x8a7a5e, low: 0x6a5a44, belt: 0x4a3424, boots: 0x5a4a38, glove: 0x4a3424, bootY: 0.36, cullHead: true },
  garyn: { outfit: 'uniform', top: 0x4a0e0c, belt: 0x101010, low: 0x141416, boots: 0x101010, bootY: 0.46, hair: [], sdfHair: true, browCol: 0x1a2a14, collarShell: 0x4a0e0c },
};
CAST.useQ = function (spec) { return (typeof QB !== 'undefined' && QB.ready && !MG.flags.sdf && CAST.QC[spec.name]) || null; };
/* hair / eye materials on the pack's textures (grey hair maps tinted to the character's colour) */
QB.hairMat = async function (hex, id, tex) {
  const col = await QB.texture(tex + '_col', true), nrm = tex === 'hair1' ? await QB.texture('hair1_nrm', false) : null;
  const c = new THREE.Color(hex), k = 2.1;
  const m = new THREE.MeshPhysicalMaterial({ map: col, normalMap: nrm, color: new THREE.Color(c.r * k, c.g * k, c.b * k), roughness: 0.52, metalness: 0, sheen: 1, sheenColor: c.clone().multiplyScalar(2.2), sheenRoughness: 0.32, side: THREE.DoubleSide, envMapIntensity: 0.7 });
  m.onBeforeCompile = (sh) => { sh.uniforms.uFill = CM.fillU; CM.rimHook(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFill;').replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL); };
  m.customProgramCacheKey = () => 'qhair';
  return m;
};
QB.eyeMat = async function () {
  if (QB._eye) return QB._eye;
  QB._eye = new THREE.MeshPhysicalMaterial({ map: await QB.texture('eye_col', true), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2 });
  return QB._eye;
};
/* hair made for the other body: moved and scaled from one head to the other */
QB.HAIR_SRC = { Hair_Long: 'female', Hair_Buns: 'female', Hair_BuzzedFemale: 'female', Eyebrows_Female: 'female' };
QB.refit = function (geo, from, to) {
  if (from === to) return geo;
  const a = QB.bind(from).wt[QB.idx.Head], b = QB.bind(to).wt[QB.idx.Head], k = from === 'female' ? [1.06, 1.0, 1.04] : [0.94, 1.0, 0.96], P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) P.setXYZ(i, b[0] + (P.getX(i) - a[0]) * k[0], b[1] + (P.getY(i) - a[1]) * k[1], b[2] + (P.getZ(i) - a[2]) * k[2]);
  P.needsUpdate = true; geo.computeBoundingSphere(); return geo;
};
CAST.qBody = async function (T, spec, qc, key, s, withHead) {
  const R = QB.regions(key, s);
  const { geo } = QB.geometry(key, (p) => p.mat.startsWith('MI_Superhero'));
  if (!withHead) QB.cull(geo, (x, y) => y > R.headY - 0.004 && Math.abs(x) < 0.16);
  const P = R.pelvisY, bootY = qc.bootY || 0.42, jedi = qc.outfit === 'jedi', robe = qc.outfit === 'robe';
  const sl = jedi ? [0.016, 0.034] : robe ? [0.02, 0.036] : [0.011, 0.014], tor = (jedi ? 0.018 : robe ? 0.022 : 0.013) * (qc.bulk || 1), leg = jedi ? 0.02 : robe ? 0.03 : 0.017, bl = jedi ? 0.012 : 0.016;
  const dressSpec = (x, y, z, R) => { const ax = Math.abs(x), arm = ax > R.shoulderX && y > P + 0.3;
    if (arm) { if (ax > R.wristX - 0.075) return qc.glove ? { smooth: 0.35, inflate: 0.004 } : { smooth: 0, inflate: 0 };
      const fa = smooth(R.elbowX - 0.05, R.wristX - 0.12, ax); return { smooth: 1.0, inflate: sl[0] + (sl[1] - sl[0]) * fa, maxIn: 0.045 }; }
    if (y > R.neckY - 0.02) return withHead ? { smooth: 0, inflate: 0 } : { smooth: 0.5, inflate: 0.006, maxIn: 0.004 };
    if (y > P - 0.03) return { smooth: 1.0, inflate: tor + 0.006, maxIn: 0.07, flat: y > P + 0.12 && y < R.neckY - 0.03 ? 1 : 0.4 };
    if (y > bootY + 0.02) { const blouse = smooth(bootY + 0.3, bootY + 0.06, y); return { smooth: 1.0, inflate: leg + bl * blouse, maxIn: 0.04 }; }
    if (y < R.ankleY + 0.03) return { smooth: 1.0, inflate: 0.011, shrink: true };
    return { smooth: 1.0, inflate: 0.014, maxIn: 0.02 }; };
  dressSpec.iters = 160; dressSpec.taubin = true; dressSpec.flatIters = 30;
  QB.dress(geo, R, dressSpec);
  const base = new THREE.Color().setRGB(170 / 255, 112 / 255, 78 / 255, THREE.SRGBColorSpace), tone = new THREE.Color(spec.skin && spec.skin.tone || 0xc8906c);
  const skinTintV = [tone.r / base.r, tone.g / base.g, tone.b / base.b].map((v) => clamp(v, 0.12, 1.8));
  const mat = await QB.costume(key, R, { id: 'q_' + spec.name, top: qc.top, low: qc.low, vest: qc.vest, glove: !!qc.glove, gloveCol: qc.glove, gauntlet: 0.02, boots: true, bootY, bootCol: qc.boots,
    collar: withHead ? 0 : 1, collarH: 0.4, sheen: jedi ? 0x5a5448 : 0x3a3a44, skinTintV, foldBump: jedi || robe ? 1.9 : 1.2, sleeveX: qc.glove ? undefined : R.wristX - 0.075 });
  const parts = [{ geo, mats: [mat], name: 'qbody' }];
  if (withHead) {
    parts.push({ geo: QB.geometry(key, (p) => p.mat === 'MI_Eyes').geo, mats: [await QB.eyeMat()], name: 'eyes', shadow: false });
    const bh = spec.skin && spec.skin.brow || qc.browCol || qc.hairCol || 0x2a1c12;
    parts.push({ geo: QB.geometry(key, (p) => p.mat.startsWith('MI_Hair')).geo, mats: [await QB.hairMat(bh, spec.name + 'brow', key === 'female' ? 'hair2' : 'hair1')], name: 'brows', shadow: false });
    for (const h of qc.hair || []) { const g = QB.refit(QB.geometry(h).geo, QB.HAIR_SRC[h] || 'male', key); const tx = QB.M.meshes[h].prims[0].mat === 'MI_Hair_2' ? 'hair2' : 'hair1';
      parts.push({ geo: g, mats: [await QB.hairMat(qc.hairCol || 0x3a2818, spec.name + h, tx)], name: h }); }
  }
  // garment shells, clipped per pixel in bind space
  const arm = (x, y) => Math.abs(x) > R.shoulderX && y > P + 0.3, f = (v) => v.toFixed(4), A = `(abs(vB.x) < ${f(R.shoulderX)} || vB.y < ${f(P + 0.3)})`, neckBase = R.neckY - 0.008;
  if (qc.belt) parts.push({ geo: QB.shell(geo, (x, y) => !arm(x, y) && y > P - 0.005 && y < P + 0.075, 0.026), mats: [QB.shellMat(qc.belt, 'leather', spec.name + 'Belt', `${A} && vB.y > ${f(P + 0.014)} && vB.y < ${f(P + 0.052)}`)], name: 'belt' });
  if (qc.sash) parts.push({ geo: QB.shell(geo, (x, y) => !arm(x, y) && y > P + 0.02 && y < P + 0.19, 0.018), mats: [QB.shellMat(qc.sash, 'cloth', spec.name + 'Sash', `${A} && vB.y > ${f(P + 0.05)} && vB.y < ${f(P + 0.16)}`)], name: 'sash' });
  if (qc.tabard) parts.push({ geo: QB.shell(geo, (x, y, z) => !arm(x, y) && y > P + 0.08 && y < neckBase + 0.03 && Math.abs(x) > 0.02 && Math.abs(x) < 0.14 && !(y > neckBase - 0.06 && Math.hypot(x, z) < 0.065), 0.024),
    mats: [QB.shellMat(qc.tabard, 'cloth', spec.name + 'Tab', `${A} && abs(vB.x) > 0.04 && abs(vB.x) < 0.118 && vB.y > ${f(P + 0.1)}`)], name: 'tabard' });
  if (qc.collarShell) { const top = R.headY - 0.02;
    parts.push({ geo: QB.shell(geo, (x, y, z) => !arm(x, y) && y > neckBase - 0.04 && y < top + 0.02 && Math.hypot(x, z + 0.02) < 0.11, (x, y) => 0.01 + 0.006 * smooth(neckBase, top, y)), mats: [QB.shellMat(qc.collarShell, 'cloth', spec.name + 'Col', `vB.y > ${f(neckBase - 0.01)} && vB.y < ${f(top - 0.035)} && length(vec2(vB.x, vB.z + 0.02)) < 0.092`)], name: 'collar' }); }
  if (qc.boots) parts.push({ geo: QB.shell(geo, (x, y) => !arm(x, y) && y > bootY - 0.035 && y < bootY + 0.012, 0.011), mats: [QB.shellMat(qc.boots, 'leather', spec.name + 'Cuff', `vB.y > ${f(bootY - 0.022)} && vB.y < ${f(bootY + 0.004)}`)], name: 'bootcuff' });
  T.qb = { key, s, parts }; T.clothR = jedi || robe ? 1.15 : 1.1;
  T.grip = SCULPT.fistFrame(T.J);
};
