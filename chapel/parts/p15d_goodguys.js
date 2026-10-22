/* THE GOOD GUYS — Phantom Menace enemies: Gungan Grand Army warriors, Senate Guards, Coruscant Security, Captain
   Panaka, the Twi'lek Padawan Darsha Assant (from "Shadow Hunter"), plus holographic Jedi for Sidious' training hall. */
/* Gungan head: long skull, duck bill, eyestalks, haillu ear-flaps hanging to the shoulders (mm around the head origin) */
CAST.gunganGroups = function (HO) {
  const hm = CAST.hm(HO), mm = CAST.mm, S = SDF, K = (v) => v / 1000, it = [];
  const add = (p, op, k) => it.push({ p, op: op || 'su', k: k || 0.001 }); const both = (p, op, k) => { add(p, op, k); add(SDF.mirror(p), op, k); };
  add(S.ell(hm(0, 20, -10), mm([72, 80, 100])));                                   // cranium, long front-to-back
  add(S.ell(hm(0, -10, 70), mm([55, 55, 70])), 'su', K(26));                        // face mass
  add(S.ell(hm(0, -42, 130), mm([36, 26, 70]), S.rot(-8, 0, 0)), 'su', K(22));     // the bill
  add(S.ell(hm(0, -62, 118), mm([32, 12, 58]), S.rot(-4, 0, 0)), 'su', K(10));     // lower jaw
  add(S.ell(hm(0, -52, 150), mm([30, 4, 40])), 'ss', K(3));                         // mouth line
  both(S.ell(hm(18, -28, 180), mm([6, 4, 7])), 'ss', K(3));                        // nostrils
  both(S.rcone(hm(28, 70, 40), hm(38, 118, 58), K(13), K(10)), 'su', K(14));      // eyestalks
  both(S.sph(hm(40, 124, 62), K(16)), 'su', K(8));                                  // eyelid domes
  both(S.rcone(hm(62, 10, -30), hm(92, -170, -80), K(34), K(22)), 'su', K(30));   // haillu (ear flaps)
  both(S.ell(hm(84, -110, -62), mm([18, 80, 46]), S.rot(8, 0, -12)), 'su', K(24));
  add(S.rcone(hm(0, -60, -20), hm(0, -200, -30), K(46), K(56)), 'su', K(16));      // neck
  return [{ name: 'head', items: it, op: 'su', k: 0.02 }];
};
/* Twi'lek lekku: two tapering head-tails from the back of the skull over the shoulders */
CAST.lekkuGroups = function (HO) {
  const hm = CAST.hm(HO), K = (v) => v / 1000, it = [];
  for (const s of [1, -1]) {
    const pts = [[s * 34, 40, -70], [s * 48, -20, -100], [s * 62, -110, -95], [s * 76, -210, -70], [s * 84, -300, -40], [s * 86, -380, -10]];
    const rs = [30, 29, 25, 20, 14, 7];
    for (let i = 0; i + 1 < pts.length; i++) it.push({ p: SDF.rcone(hm(...pts[i]), hm(...pts[i + 1]), K(rs[i]), K(rs[i + 1])), op: 'su', k: K(12) });
  }
  return { name: 'lekku', items: it, op: 'su', k: 0.01 };
};
/* Senate Guard helmet: tall rounded helm with a crest and a dark visor band */
CAST.helmetGroups2 = function (HO, kind) {
  const hm = CAST.hm(HO), mm = CAST.mm, S = SDF, K = (v) => v / 1000, it = [];
  const add = (p, op, k) => it.push({ p, op: op || 'su', k: k || 0.001 });
  if (kind === 'senate') {
    // tall ceremonial helm: domed shell down over the cheeks, a flared neck guard, a recessed faceplate and a crest fin
    add(S.ell(hm(0, 40, -4), mm([100, 150, 124])));
    add(S.rcone(hm(0, -40, -40), hm(0, -165, -78), K(98), K(122)), 'su', K(26));
    add(S.box(hm(0, -200, 0), mm([240, 60, 240]), 0), 'ss', K(10));
    add(S.box(hm(0, -18, 118), mm([62, 86, 44]), K(10)), 'ss', K(8));              // face recess
    add(S.box(hm(0, -22, 96), mm([56, 80, 8]), K(8)), 'su', K(3));                  // faceplate
    add(S.box(hm(0, 186, -14), mm([7, 52, 128]), K(5)), 'su', K(18));               // crest fin
    for (const sx of [1, -1]) add(S.ell(hm(92 * sx, -40, 30), mm([14, 70, 60])), 'su', K(10));   // cheek guards
  } else if (kind === 'csf') {
    add(S.ell(hm(0, 22, 0), mm([92, 108, 110])));
    add(S.box(hm(0, -150, 0), mm([220, 80, 220]), 0), 'ss', K(18));
    add(S.box(hm(0, -12, 96), mm([80, 26, 16]), K(8)), 'su', K(4));
  } else if (kind === 'panaka') {   // soft officer's cap with a short peak
    add(S.ell(hm(0, 52, -8), mm([90, 64, 102])));
    add(S.box(hm(0, 0, -8), mm([200, 40, 200]), 0), 'ss', K(4));
    add(S.box(hm(0, 40, 94), mm([74, 5, 30]), K(3), S.rot(18, 0, 0)), 'su', K(5));
  }
  return { name: 'helmet', items: it, op: 'su', k: 0.006 };
};
/* build: an extension of CAST.human with alternative heads */
CAST.humanX = async function (spec) {
  if (spec.gungan || spec.lekku || spec.helm2) {
    const base = HEADS.humanGroups;
    if (spec.gungan) HEADS.humanGroups = (HO) => CAST.gunganGroups(HO);
    const hair0 = CAST.hairGroups; const helm0 = CAST.helmetGroups;
    if (spec.lekku) CAST.hairGroups = (HO) => CAST.lekkuGroups(HO);
    if (spec.helm2) CAST.helmetGroups = (HO) => CAST.helmetGroups2(HO, spec.helm2);
    try { return await CAST.human(Object.assign({}, spec, { hair: spec.lekku ? 'lekku' : spec.hair, helmet: spec.helm2 || spec.helmet })); }
    finally { HEADS.humanGroups = base; CAST.hairGroups = hair0; CAST.helmetGroups = helm0; }
  }
  return CAST.human(spec);
};
Object.assign(CAST.SPECS, {
  guard: { name: 'guard', height: 1.0, headRes: 0.0032, bodyRes: 0.0072, hairRes: 0.004, helmet: 'naboo', goggles: true, skin: { tone: 0xc08a68, stubble: 0.25 }, gloves: true,
    body: { bulk: 1.03, collar: 'high', lapel: false, sleeve: [0.057, 0.049, 0.043], cuff: 0.047, belt: { h: 0.055, pouches: true }, trouser: [0.082, 0.06], bootTop: 0.5, mats: { torso: 'leather', arms: 'tunic', belt: 'extra', legs: 'trousers', boots: 'extra', collar: 'tunic' },
      extra: (grp, J) => { const A = grp('pads', 'leather', 0.008); A.both(SDF.ell([0.19, J.shoulder[1] - 0.005, -0.02], [0.07, 0.045, 0.075]), 'su', 0.01); A.add(SDF.cap([0.13, J.pelvis[1] + 0.02, 0.08], [0.16, J.pelvis[1] - 0.1, 0.06], 0.035), 'su', 0.01); } },
    mats: () => [CM.cloth(0x2e3a52, 0x4a5a78, 0.85, 'gdT', true), CM.cloth(0x3a3026, 0x5a4a3a, 0.9, 'gdTr', true), CM.leather(0x5a3a22, 0.48, 'gdL'), CM.leather(0x1a1410, 0.4, 'gdB')] },
  panaka: { name: 'panaka', height: 1.03, shoulders: 1.06, headRes: 0.003, bodyRes: 0.007, hairRes: 0.0038, helm2: 'panaka', skin: { tone: 0x6a4630, brow: 0x1a1008, lip: 0x5a3a2a, stubble: 0.3 }, gloves: true, eyes: 'brown',
    helmetMat: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.45, metalness: 0.3 }),
    body: { bulk: 1.12, collar: 'high', lapel: true, sleeve: [0.06, 0.052, 0.046], cuff: 0.05, belt: { h: 0.058, pouches: true }, trouser: [0.086, 0.062], bootTop: 0.5, mats: { torso: 'leather', arms: 'leather', belt: 'extra', legs: 'trousers', boots: 'extra', collar: 'leather' } },
    mats: () => [CM.cloth(0x2a2c36, 0x4a4e5e, 0.85, 'pkT', true), CM.cloth(0x2a2a30, 0x484852, 0.9, 'pkTr', true), CM.leather(0x33241a, 0.4, 'pkL'), CM.leather(0x1a1410, 0.345, 'pkB')],
    cloth: (J) => CAST.skirt(J, { len: 0.55, rx: 0.165, rz: 0.13, mat: 'thug' }) },
  gungan: { name: 'gungan', height: 1.1, shoulders: 0.92, headRes: 0.0034, bodyRes: 0.0074, gungan: true, eyes: 'gungan', eyePos: [40, 124, 66], eyeR: 0.0135, skin: { tone: 0xc88a52, brow: 0xa06a3a, lip: 0xb07a48, sss: 0xa05020, plain: true },
    body: { bulk: 0.86, collar: 'low', sleeve: [0.05, 0.042, 0.036], belt: { h: 0.05 }, trouser: [0.07, 0.05], bootTop: 0.36, boots: true, mats: { torso: 'leather', arms: 'extra', belt: 'leather', legs: 'trousers', boots: 'extra', collar: 'leather' },
      extra: (grp, J) => { const A = grp('armor', 'leather', 0.006); A.add(SDF.box([0, J.chest[1] + 0.02, 0.01], [0.13, 0.16, 0.11], 0.04), 'su', 0.02); A.both(SDF.ell([0.17, J.shoulder[1] - 0.01, -0.02], [0.07, 0.05, 0.08]), 'su', 0.01); } },
    mats: () => [CM.cloth(0x6a5236, 0x8a7458, 0.9, 'gnT', true), CM.cloth(0x7a5e3e, 0x9a8060, 0.9, 'gnTr', true), CM.leather(0x5a3c22, 0.55, 'gnL'), CM.plain(0xc0844e, 0.6, 0, 'gnSkin')],
    cloth: (J) => ({ panels: [CLOTH.arcPanel({ y: J.pelvis[1] + 0.01, rx: 0.14, rz: 0.11, a0: -50, a1: 50, len: 0.36, rows: 7, cols: 5, flare: 0.3, name: 'gF', mat: 'robeBrown' }), CLOTH.arcPanel({ y: J.pelvis[1] + 0.01, rx: 0.14, rz: 0.11, a0: 130, a1: 230, len: 0.38, rows: 7, cols: 5, flare: 0.3, name: 'gB', mat: 'robeBrown' })] }) },
  senate: { name: 'senate', height: 1.04, headRes: 0.0036, bodyRes: 0.0074, hairRes: 0.004, helm2: 'senate', gloves: true, skin: { tone: 0xc08a68 },
    visor: new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 0.1, metalness: 0.8, envMapIntensity: 1.6 }),
    helmetMat: new THREE.MeshPhysicalMaterial({ color: 0x1e3c9a, roughness: 0.25, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.3 }),
    body: { bulk: 1.05, collar: 'high', lapel: true, sleeve: [0.064, 0.058, 0.056], cuff: 0.066, belt: { h: 0.05, sash: true }, trouser: [0.086, 0.064], bootTop: 0.46, mats: { torso: 'tunic', arms: 'tunic', belt: 'extra', legs: 'tunic', boots: 'leather', collar: 'tunic' } },
    mats: () => [CM.cloth(0x22398c, 0x39508e, 0.9, 'snT', true), CM.cloth(0x1a2c70, 0x2e3e76, 0.9, 'snTr', true), CM.leather(0x101014, 0.4, 'snL'), new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.9 })],
    cloth: (J) => { const sk = CAST.skirt(J, { len: 0.78, rx: 0.17, rz: 0.14, flare: 0.28, mat: 'senate' });
      sk.panels.push(CLOTH.arcPanel({ y: J.shoulder[1] - 0.02, rx: 0.25, rz: 0.18, cz: -0.02, a0: 100, a1: 260, len: 1.32, rows: 12, cols: 8, flare: 0.45, name: 'cape', mat: 'senate', bone: 2, stiff: 0.7, carry: 0.85, damp: 0.9, grav: 1.8 }));
      return sk; } },
  csf: { name: 'csf', height: 1.02, headRes: 0.0036, bodyRes: 0.0074, hairRes: 0.004, helm2: 'csf', gloves: true, skin: { tone: 0xb07a5a },
    visor: new THREE.MeshStandardMaterial({ color: 0x08121a, emissive: 0x2a8aff, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.6 }),
    helmetMat: new THREE.MeshStandardMaterial({ color: 0x1a2438, roughness: 0.3, metalness: 0.6, envMapIntensity: 1.2 }),
    body: { bulk: 1.06, collar: 'high', sleeve: [0.058, 0.05, 0.044], belt: { h: 0.055, pouches: true }, trouser: [0.084, 0.06], bootTop: 0.47, mats: { torso: 'extra', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'leather', collar: 'tunic' },
      extra: (grp, J) => { const A = grp('armor', 'extra', 0.01); A.add(SDF.box([0, J.chest[1] + 0.03, 0.02], [0.165, 0.15, 0.125], 0.03), 'su', 0.02); A.both(SDF.ell([0.19, J.shoulder[1] - 0.01, -0.02], [0.068, 0.048, 0.072]), 'su', 0.01); } },
    mats: () => [CM.cloth(0x1c2436, 0x3a4a68, 0.85, 'cfT', true), CM.cloth(0x1a1e28, 0x343c50, 0.9, 'cfTr', true), CM.leather(0x121216, 0.42, 'cfL'), new THREE.MeshStandardMaterial({ color: 0x2a3650, roughness: 0.28, metalness: 0.75, envMapIntensity: 1.3 })] },
  darsha: { name: 'darsha', height: 0.97, shoulders: 0.9, headRes: 0.0026, bodyRes: 0.0066, hairCol: 0x3a2214, eyes: 'brown', skin: { tone: 0xc99478, brow: 0x3a2418, lip: 0xa05a50, sss: 0xb04a3a },   // human, as in Shadow Hunter
    body: { bulk: 0.9, waist: 0.9, collar: 'low', lapel: true, tabards: 'trousers', sleeve: [0.052, 0.044, 0.04], cuff: 0.046, belt: { h: 0.05, sash: true, pouches: true }, trouser: [0.074, 0.054], bootTop: 0.49, mats: { torso: 'tunic', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'extra', collar: 'tunic' } },
    mats: () => [CM.cloth(0x9a7e58, 0x8a7a60, 0.9, 'dsT', true), CM.cloth(0x6a5238, 0x6a5a48, 0.9, 'dsTr', true), CM.leather(0x3a2616, 0.5, 'dsL'), CM.leather(0x22160e, 0.45, 'dsB')],
    cloth: (J) => CAST.skirt(J, { len: 0.44, mat: 'robeTan', tabard: 0.52, tabMat: 'robeBrown' }) },
});
/* eyes: Gungan (amber) */
(function () { const e0 = CM.eye; CM.eye = function (type) { return e0(type === 'gungan' ? 'sith' : type); }; })();
/* lazy builder hook */
(function () { const need0 = CAST.need; CAST.need = async function (names, progress) {
  let i = 0;
  for (const n of names) {
    if (!CHAR.T[n] && CAST.SPECS[n] && (CAST.SPECS[n].gungan || CAST.SPECS[n].lekku || CAST.SPECS[n].helm2)) { const s = CAST.SPECS[n]; CHAR.T[n] = await CAST.humanX(Object.assign({}, s, { mats: s.mats() })); }
    i++;
  }
  return need0(names, progress);
}; })();
/* energy shield (Gungan) — a translucent disc on the forearm */
CAST.shield = function () {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 10, 0, TAU, 0, 0.55), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.8, 1.6), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  m.rotation.x = HALF; return m;
};
