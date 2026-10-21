/* HUNTERS — the human enemy factions (addendum §A/§D, v1.0 §5.5). Republic militia (commando, commSgt, commArmored):
   plastoid-and-fabric plates in olive and slate, tan webbing, carbines, a gunner brain. Freelance bounty hunters
   (bhunter, B, C): mismatched salvage armour, jetpack, whip-cord reel, flamer; brain 'hunter' (AI in p55b). Jedi hunters
   (jhunter, jseeker): the p31 duellist class with hunter:true (AI in p55b). Armour is CLONE.armour re-cut (no clone white
   or blue, no Phase-II bucket); the Jedi templates are the withdrawn order66 set (§3.7). Owns HUNT (internal) and HUNTERS. */
const HUNT = { TEMPLATES: [], KIT: {}, TABLE: [] };
const HUNTERS = { MAX_LIVE: 14, MAX_JEDI: 7 };
HUNT.plate = () => (HUNT._p = HUNT._p || new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.5, metalness: 0.0, clearcoat: 0.2, clearcoatRoughness: 0.5, envMapIntensity: 0.8 }));
/* merge geometries (colour + optional matrix + bone) into one non-indexed skinned buffer (one draw call) */
HUNT.merge = function (list) {
  let n = 0; const G = list.map((it) => { const g = it[0].index ? it[0].toNonIndexed() : it[0]; if (it[2]) g.applyMatrix4(it[2]); if (!g.attributes.normal) g.computeVertexNormals(); n += g.attributes.position.count; return g; });
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3), bone = new Uint16Array(n * 4), wts = new Float32Array(n * 4), c = new THREE.Color(); let k = 0;
  G.forEach((g, gi) => { const P = g.attributes.position, N = g.attributes.normal; c.set(list[gi][1]);
    for (let i = 0; i < P.count; i++, k++) { pos[k * 3] = P.getX(i); pos[k * 3 + 1] = P.getY(i); pos[k * 3 + 2] = P.getZ(i); nrm[k * 3] = N.getX(i); nrm[k * 3 + 1] = N.getY(i); nrm[k * 3 + 2] = N.getZ(i); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; bone[k * 4] = list[gi][3] || 0; wts[k * 4] = 1; } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere(); return { g, bone, wts };
};
/* rigid plates on the logical bones, merged. o.c = palette {plate, dark, grey, tan, roundel, trim}; o.pauld / o.shin = {L, R}
   colours (null = bare); o.pack = jetpack on the back; o.bulk = chest scale. Layout after CLONE.armour (order66 p15g). */
HUNT.armour = function (T, o) {
  if (T._armoured) return; T._armoured = true;
  const J = T.J, def = T.def, C = o.c, B = o.bulk || 1, L = [], m = V.mx;
  const A = (bone, geo, colr, world, rx) => { if (rx) geo.rotateX(rx); geo.translate(world[0], world[1], world[2]); L.push([geo, colr, null, bone]); };
  const cb = (hx, hy, hz, c) => KIT.chamferGeo(hx, hy, hz, c);
  const seg = (bone, t0, t1, r0, r1, colr, sx, sz) => { const b = def[bone]; const g = new THREE.CylinderGeometry(r1, r0, b.len * (t1 - t0), 24, 1); g.scale(sx || 1, 1, sz || 1); g.translate(0, b.len * (t0 + t1) / 2, 0);
    const d = V.norm(V.sub(b.tail, b.head)); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(YUP, V3(d[0], d[1], d[2]))); g.translate(b.head[0], b.head[1], b.head[2]); L.push([g, colr, null, bone]); };
  const cy = J.chest[1], sy = J.shoulder[1], py = J.pelvis[1], cz = J.chest[2];
  // chest: breastplate over a fabric shirt, split line, back plate, yoke, webbing straps
  A(2, cb(0.176 * B, 0.12 * B, 0.124 * B, 0.05), C.plate, [0, cy + 0.085, cz + 0.01]);
  A(2, cb(0.15, 0.012, 0.012, 0.004), C.dark, [0, cy + 0.03, cz + 0.138]);
  A(2, cb(0.07, 0.07, 0.03, 0.02), C.plate, [0, cy + 0.09, cz - 0.125]);
  A(2, cb(0.1, 0.03, 0.05, 0.02), C.plate, [0, sy + 0.035, cz - 0.02]);
  for (const sx of [-1, 1]) A(2, cb(0.018, 0.09, 0.02, 0.008), C.tan, [sx * 0.125, cy + 0.19, cz + 0.02]);
  if (C.roundel) { A(2, new THREE.CylinderGeometry(0.034, 0.034, 0.008, 22), C.roundel, [0.088, cy + 0.15, cz + 0.146], HALF); A(2, new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12), C.dark, [0.088, cy + 0.15, cz + 0.152], HALF); }
  if (o.pack) { A(2, cb(0.11, 0.13, 0.05, 0.02), C.dark, [0, cy + 0.02, cz - 0.15]);                     // jetpack housing
    for (const sx of [-1, 1]) A(2, new THREE.CylinderGeometry(0.035, 0.035, 0.09, 14), C.grey, [sx * 0.06, cy - 0.12, cz - 0.18]); }   // nozzles
  // abdomen, webbing belt, buckle, hip pouches, lower plate
  A(1, cb(0.148, 0.075, 0.108, 0.035), C.plate, [0, (J.spine[1] + cy) / 2 - 0.005, J.spine[2] + 0.012]);
  A(0, cb(0.172, 0.036, 0.125, 0.014), C.tan, [0, py + 0.065, 0.006]);
  A(0, cb(0.04, 0.03, 0.012, 0.006), C.dark, [0, py + 0.065, 0.132]);
  for (const sx of [-1, 1]) A(0, cb(0.03, 0.085, 0.045, 0.02), C.tan, [sx * 0.165, py - 0.06, 0.0]);
  A(0, cb(0.085, 0.07, 0.02, 0.01), C.plate, [0, py - 0.05, 0.12]);
  // collar seal on the neck
  A(3, new THREE.CylinderGeometry(0.062, 0.075, 0.13, 20), C.dark, [0, J.neck[1] + 0.045, J.neck[2] + 0.004]);
  if (o.reel) { const r = new THREE.CylinderGeometry(0.05, 0.05, 0.035, 18); r.rotateZ(HALF); A(0, r, C.grey, [-0.17, py - 0.04, -0.03]); }   // whip-cord reel on the right hip
  if (o.tank) { A(0, new THREE.CylinderGeometry(0.04, 0.04, 0.2, 14), C.grey, [0.17, py - 0.02, -0.07]); A(0, new THREE.CylinderGeometry(0.018, 0.018, 0.06, 10), C.dark, [0.17, py + 0.1, -0.07]); }
  for (const s of [1, -1]) {
    const Lf = s > 0, side = Lf ? 'L' : 'R', ua = Lf ? 6 : 10, fa = Lf ? 7 : 11, th = Lf ? 13 : 16, sh = Lf ? 14 : 17, hb = Lf ? 8 : 12, ft = Lf ? 15 : 18;
    const P = (p) => (Lf ? p : m(p));
    if (o.pauld && o.pauld[side]) { const g1 = new THREE.SphereGeometry(0.082, 28, 16, 0, TAU, 0, HALF * 1.15); g1.scale(1.05, 0.9, 1.1); g1.rotateZ(-s * 0.5); A(ua, g1, o.pauld[side], P([J.shoulder[0] + 0.012, sy + 0.012, J.shoulder[2]])); }
    seg(ua, 0.3, 0.86, 0.057, 0.051, C.plate, 1, 1.05);
    seg(fa, 0.1, 0.92, 0.053, 0.043, C.plate, 1, 1.08);
    seg(fa, 0.18, 0.34, 0.056, 0.053, C.dark, 1, 1.08);
    A(hb, cb(0.03, 0.008, 0.032, 0.006), C.tan, P([J.wrist[0] + 0.05, J.wrist[1] + 0.022, J.wrist[2]]));
    seg(th, 0.12, 0.84, 0.092, 0.07, C.plate, 1, 1.06);
    A(sh, cb(0.05, 0.05, 0.035, 0.022), C.plate, P([J.knee[0], J.knee[1] - 0.005, J.knee[2] + 0.055]));
    seg(sh, 0.06, 0.98, 0.082, 0.07, o.shin && o.shin[side] !== undefined ? o.shin[side] : C.grey, 1, 1.12);
    A(ft, cb(0.058, 0.035, 0.1, 0.025), C.dark, P([J.ankle[0] + 0.004, J.ankle[1] - 0.035, J.ankle[2] + 0.075]));
  }
  const Mg = HUNT.merge(L), n = Mg.g.attributes.position.count, idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i;
  const geo = CHAR.skinGeo(Mg.g.attributes.position.array, Mg.g.attributes.normal.array, idx, { idx: Mg.bone, wts: Mg.wts }, { color: Mg.g.attributes.color });
  T.parts.push({ geo, mats: [HUNT.plate()], name: 'armour' });
};
/* static props on bones (T.attach: pos is relative to the bone joint) */
HUNT.shieldGeo = () => (HUNT._sg = HUNT._sg || KIT.chamferGeo(0.1, 0.19, 0.014, 0.04));
HUNT.shieldMat = () => (HUNT._sm = HUNT._sm || new THREE.MeshStandardMaterial({ color: 0x59616b, roughness: 0.4, metalness: 0.5, envMapIntensity: 1.0 }));
HUNT.flameGeo = () => (HUNT._fg = HUNT._fg || (() => { const g = new THREE.ConeGeometry(0.04, 0.16, 10); g.rotateX(PI); g.translate(0, -0.08, 0); return g; })());
HUNT.flameMat = () => (HUNT._fm = HUNT._fm || new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.1, 0.25), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
/* ---------------------------------------------------------------- helmets (CAST.helmetGroups2 kinds) */
HUNT.helmMilitia = function (HO) {   // half helm: a skull dome and brow band, a short cap rim, ear covers; the face stays open
  const hm = CAST.hm(HO), mm = CAST.mm, S = SDF, K = (v) => v / 1000, it = [];
  const add = (p, op, k) => it.push({ p, op: op || 'su', k: k || 0.001 });
  add(S.ell(hm(0, 30, -4), mm([102, 112, 112])));
  add(S.box(hm(0, 2, 104), mm([118, 20, 22]), K(8)), 'su', K(6));
  add(S.rcone(hm(0, -6, -8), hm(0, -58, 6), K(102), K(98)), 'su', K(10));
  for (const sx of [1, -1]) add(S.box(hm(88 * sx, -22, 20), mm([20, 40, 46]), K(8)), 'su', K(8));
  return { name: 'helmet', items: it, op: 'su', k: 0.006 };
};
HUNT.helmBounty = function (HO) {    // salvage helm: rounded skull, snout guard, a fin along the crown
  const hm = CAST.hm(HO), mm = CAST.mm, S = SDF, K = (v) => v / 1000, it = [];
  const add = (p, op, k) => it.push({ p, op: op || 'su', k: k || 0.001 });
  add(S.ell(hm(0, 28, -6), mm([104, 116, 116])));
  add(S.box(hm(0, -22, 96), mm([92, 74, 24]), K(12)), 'su', K(8));
  add(S.box(hm(0, 118, -12), mm([12, 40, 110]), K(4)), 'su', K(4));
  for (const sx of [1, -1]) add(S.box(hm(92 * sx, -6, 22), mm([18, 60, 60]), K(6)), 'su', K(6));
  add(S.rcone(hm(0, -22, -78), hm(0, -62, -70), K(106), K(98)), 'su', K(10));
  return { name: 'helmet', items: it, op: 'su', k: 0.006 };
};
HUNT.helmTguard = function (HO) {    // Temple Guard cowl and mask (order66 helmetGroups2 'tguard')
  const hm = CAST.hm(HO), mm = CAST.mm, S = SDF, K = (v) => v / 1000, it = [];
  const add = (p, op, k) => it.push({ p, op: op || 'su', k: k || 0.001 });
  add(S.ell(hm(0, 26, -6), mm([104, 124, 122])));
  add(S.rcone(hm(0, -40, -20), hm(0, -170, -40), K(100), K(132)), 'su', K(30));
  add(S.box(hm(0, -215, 0), mm([280, 60, 280]), 0), 'ss', K(8));
  add(S.box(hm(0, -24, 124), mm([58, 84, 40]), K(14)), 'ss', K(10));
  add(S.ell(hm(0, -22, 80), mm([54, 80, 30])), 'su', K(4));
  add(S.box(hm(0, 60, 100), mm([8, 40, 14]), K(4)), 'su', K(8));
  return { name: 'helmet', items: it, op: 'su', k: 0.006 };
};
(function () { const h0 = CAST.helmetGroups2; CAST.helmetGroups2 = function (HO, kind) {
  if (kind === 'militia') return HUNT.helmMilitia(HO);
  if (kind === 'bhunter') return HUNT.helmBounty(HO);
  if (kind === 'tguard') return HUNT.helmTguard(HO);
  return h0(HO, kind);
}; })();
/* carbine: the E-5 rifle model at carbine length (+Y = barrel, muzzle and glow scale with it) */
(function () { const r0 = CAST.rifle; CAST.rifle = function (kind) { if (kind !== 'carbine') return r0(kind); const g = r0('rifle'); g.scale.set(0.92, 0.8, 0.92); return g; }; })();
/* ---------------------------------------------------------------- palettes */
HUNT.MIL = { plate: 0x5b6149, dark: 0x262a24, grey: 0x4a515a, tan: 0x8c7452, roundel: 0x7a2820, trim: 0xb06020 };   // olive drab + slate, tan webbing, dull red roundel
HUNT.BH = [   // three mismatched salvage kits (rust / slate / black with orange trim)
  { plate: 0x9a5a2a, dark: 0x2a2622, grey: 0x6b6862, tan: 0x6b5a40, trim: 0xc8742c, helm: 0x6a4a2a, visor: 0xffa020, pack: true, reel: true, tank: false, pauld: { L: 0x6b6862, R: 0xc8742c }, shin: { L: 0x6b6862, R: 0x9a5a2a } },
  { plate: 0x55595f, dark: 0x2e2a26, grey: 0x7a6d5c, tan: 0x8a7050, trim: 0xb85e20, helm: 0x4e5258, visor: 0xffb030, pack: true, reel: true, tank: false, pauld: { L: 0xb85e20, R: null }, shin: { L: 0x55595f, R: 0x3a3a3c } },
  { plate: 0x1b1b1d, dark: 0x0f0f10, grey: 0x6c5a44, tan: 0x5a4a34, trim: 0xc0692a, helm: 0x1f1f22, visor: 0xffc040, pack: true, reel: true, tank: true, pauld: { L: null, R: 0xc0692a }, shin: { L: 0x6c5a44, R: 0x111112 } },
];
HUNT.TEMPLATES = [];
/* ---------------------------------------------------------------- specs, QC (cullHead lives here: CAST.QC is what the sculpted head reads) and QO */
const HS = (base, o) => Object.assign({}, base, o);
HUNT.visorDark = () => new THREE.MeshStandardMaterial({ color: 0x0b0d0f, roughness: 0.15, metalness: 0.5 });
HUNT.visorAmber = (hex) => new THREE.MeshStandardMaterial({ color: 0x2a1604, emissive: hex, emissiveIntensity: 1.1, roughness: 0.2, metalness: 0.5 });
HUNT.helmMat = (hex, rough, metal) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, envMapIntensity: 1.1 });
const MIL_MATS = () => [CM.cloth(0x4b5140, 0x6a7060, 0.88, 'mlT', true), CM.cloth(0x363b40, 0x52585e, 0.9, 'mlTr', true), CM.leather(0x2a2620, 0.5, 'mlL'), new THREE.MeshStandardMaterial({ color: 0x4a525c, roughness: 0.3, metalness: 0.7, envMapIntensity: 1.2 })];
const RG = (part, g, po) => ['ranger', part, g, po], PZ = (part, g, po) => ['peasant', part, g, po];
const GG = (rules, sat, val, tint) => ({ rules, sat, val, tint });
const OLIVE = { h: 115, w: 80, toH: 72, s: 0.42, v: 0.66, minS: 0.03 }, SLATE = { h: 115, w: 80, toH: 212, s: 0.12, v: 0.62, minS: 0.03 }, TANR = { h: 28, w: 45, toH: 36, s: 0.75, v: 1.02 }, BLACKL = { h: 28, w: 45, s: 0.25, v: 0.3 };
const milParts = () => [RG('Body', GG([OLIVE], 0.9, 0.9)), RG('Arms', GG([OLIVE], 0.9, 0.9)), RG('Arms_Bracer', GG([TANR], 0.7, 1.0), { metal: 0.2 }), RG('Legs', GG([SLATE], 0.8, 0.9)),
  RG('Feet_Boots', GG([BLACKL], 0.4, 0.4), { metal: 0.2 }), RG('Body_Belt_1', GG([TANR], 0.7, 1.0), { metal: 0.3 })];
/* Republic militia: rifleman, sergeant (orange pauldron, shield wall, drops the power cell), armoured shield trooper */
CAST.SPECS.commando = HS(CAST.SPECS.csf, { name: 'commando', height: 1.02, shoulders: 1.04, helm2: 'militia', hair: [], beard: false, cloth: undefined, skin: { tone: 0xb07a5a }, gloves: true,
  visor: HUNT.visorDark(), helmetMat: HUNT.helmMat(0x4b5140, 0.5, 0.3), mats: MIL_MATS });
CAST.QC.commando = HS(CAST.QC.csf, { outfit: 'uniform', top: 0x4b5140, vest: 0x4b5140, belt: 0x6b5638, low: 0x3c4046, boots: 0x1c1b18, glove: 0x1a1a18, bootY: 0.44, cullHead: true, hair: [], hairCol: 0x2a2020, browCol: 0x2a2020 });
CAST.QO.commando = { cullHead: true, glove: 0x1a1a18, parts: milParts() };
HUNT.KIT.commando = { c: HUNT.MIL, pauld: { L: null, R: null }, shin: { L: HUNT.MIL.grey, R: HUNT.MIL.grey } };
HUNT.KIT.commSgt = { c: HUNT.MIL, pauld: { L: HUNT.MIL.plate, R: HUNT.MIL.trim }, shin: { L: HUNT.MIL.grey, R: HUNT.MIL.grey }, shield: true };
HUNT.KIT.commArmored = { c: HUNT.MIL, bulk: 1.12, pauld: { L: HUNT.MIL.plate, R: HUNT.MIL.plate }, shin: { L: HUNT.MIL.dark, R: HUNT.MIL.dark }, shield: true };
CAST.SPECS.commSgt = HS(CAST.SPECS.commando, { name: 'commSgt', height: 1.06, shoulders: 1.08 });
CAST.QC.commSgt = HS(CAST.QC.commando, { top: 0x4b5140 });
CAST.QO.commSgt = CAST.QO.commando;
CAST.SPECS.commArmored = HS(CAST.SPECS.commando, { name: 'commArmored', height: 1.04, shoulders: 1.14, bulk: 1.1 });
CAST.QC.commArmored = HS(CAST.QC.commando, {});
CAST.QO.commArmored = CAST.QO.commando;
HUNT.TEMPLATES.push('commando', 'commSgt', 'commArmored');
/* freelance bounty hunters: Mandalorian-War salvage, three kits; jetpack housing, whip reel, flamer tank */
const bhParts = [
  [RG('Body', GG([{ h: 115, w: 80, toH: 20, s: 1.0, v: 0.9, minS: 0.03 }], 1.0, 0.9)), RG('Arms', GG([{ h: 115, w: 80, toH: 212, s: 0.1, v: 0.6, minS: 0.03 }], 0.9, 0.9)), RG('Arms_Bracer', GG([TANR], 0.7, 1.0), { metal: 0.3 }), RG('Legs', GG([{ h: 115, w: 80, toH: 212, s: 0.1, v: 0.55, minS: 0.03 }], 0.8, 0.9)), RG('Feet_Boots', GG([BLACKL], 0.4, 0.4), { metal: 0.2 }), RG('Body_Belt_1', GG([{ h: 28, w: 45, toH: 22, s: 1.1, v: 0.9 }], 0.9, 1.0), { metal: 0.4 })],
  [RG('Body', GG([{ h: 115, w: 80, toH: 212, s: 0.14, v: 0.6, minS: 0.03 }], 0.9, 0.9)), RG('Arms', GG([{ h: 115, w: 80, toH: 22, s: 1.1, v: 0.85, minS: 0.03 }], 1.0, 0.9)), RG('Arms_Bracer', GG([BLACKL], 0.5, 0.6), { metal: 0.3 }), RG('Legs', GG([{ h: 115, w: 80, toH: 72, s: 0.4, v: 0.55, minS: 0.03 }], 0.8, 0.9)), RG('Feet_Boots', GG([TANR], 0.7, 0.8), { metal: 0.1 }), RG('Body_Belt_1', GG([BLACKL], 0.6, 0.6), { metal: 0.4 })],
  [RG('Body', GG([{ h: 115, w: 80, toH: 0, s: 0.05, v: 0.42, minS: 0.03 }], 0.5, 0.5)), RG('Arms', GG([{ h: 115, w: 80, toH: 20, s: 1.0, v: 0.8, minS: 0.03 }], 0.9, 0.9)), RG('Arms_Bracer', GG([BLACKL], 0.4, 0.5), { metal: 0.3 }), RG('Legs', GG([{ h: 115, w: 80, toH: 212, s: 0.1, v: 0.35, minS: 0.03 }], 0.6, 0.8)), RG('Feet_Boots', GG([BLACKL], 0.4, 0.35), { metal: 0.2 }), RG('Body_Belt_1', GG([{ h: 28, w: 45, toH: 20, s: 1.0, v: 0.8 }], 0.9, 1.0), { metal: 0.4 })]];
const BH_NAMES = ['bhunter', 'bhunterB', 'bhunterC'];
BH_NAMES.forEach((nm, i) => {
  const k = HUNT.BH[i];
  CAST.SPECS[nm] = HS(CAST.SPECS.csf, { name: nm, height: 1.04 + i * 0.01, shoulders: 1.02 + i * 0.03, helm2: 'bhunter', hair: [], beard: false, cloth: undefined, skin: { tone: [0xa67a5a, 0xb08060, 0x8a5e44][i] }, gloves: true,
    visor: HUNT.visorAmber(k.visor), helmetMat: HUNT.helmMat(k.helm, 0.4, 0.5) });
  CAST.QC[nm] = HS(CAST.QC.csf, { outfit: 'uniform', top: k.plate, vest: k.dark, belt: k.tan, low: k.dark, boots: 0x1a1816, glove: 0x161412, bootY: 0.44, cullHead: true, hair: [], hairCol: 0x1a1410, browCol: 0x1a1410 });
  CAST.QO[nm] = { cullHead: true, glove: 0x161412, parts: bhParts[i] };
  HUNT.KIT[nm] = { c: { plate: k.plate, dark: k.dark, grey: k.grey, tan: k.tan, trim: k.trim }, pauld: k.pauld, shin: k.shin, pack: k.pack, reel: k.reel, tank: k.tank, bulk: 1.0 + i * 0.02 };
  HUNT.TEMPLATES.push(nm);
});
/* withdrawn Jedi templates (§3.7): robes in blue and green, the hunter pool. jseeker wears the hooded cloak (CLOAK) */
(function () {
  const J0 = CAST.SPECS.quigon, JF = CAST.SPECS.darsha, S = HS;
  const robe = (tab, len) => (J) => CAST.skirt(J, { len: len || 0.44, mat: 'robeTan', tabard: 0.52, tabMat: tab || 'robeBrown' });
  const mk = (name, base, spec, qc, qo) => { CAST.SPECS[name] = S(base, Object.assign({ name }, spec)); CAST.QC[name] = S(base === JF ? CAST.QC.darsha : CAST.QC.quigon, qc); CAST.QO[name] = Object.assign({ hair: qc.hair, hairCol: qc.hairCol, browCol: qc.browCol }, qo); HUNT.TEMPLATES.push(name); };
  const jedi = (body, legs, boots, belt, fem) => [PZ('Body', body), PZ('Arms', body), PZ('Legs', legs), RG(fem ? 'Feet' : 'Feet_Boots', boots), RG('Body_Belt_1', belt || GG([], 1, 0.8), { metal: 0.6 })];   // female outfits name the boots 'Feet'
  const cream = GG([leatherV(1.2, 0.6), CREAM(1.15, 0.8)], 0.85, 0.95), tan = GG([leatherV(0.95, 0.85), CREAM(1.3, 0.7)], 0.9, 0.95, 0xfff0dc), umber = GG([leatherV(0.7, 0.9), CREAM(1.5, 0.5)], 0.9, 0.9, 0xffe8d0);
  const legsL = GG([leatherV(2.6, 0.45)], 0.8, 1.0, 0xfff4e4), legsD = GG([leatherV(1.6, 0.6)], 0.8, 1.0), boots = GG([], 0.7, 0.55);
  function leatherV(v, s) { return { h: 28, w: 45, s: s === undefined ? 1 : s, v }; }
  function CREAM(s, v) { return { h: 38, w: 30, s, v, minS: 0.02 }; }
  mk('jknight', J0, { height: 1.0, shoulders: 1.0, beard: false, hair: 'short', hairCol: 0x6a4a2a, skin: { tone: 0xd2a07e, brow: 0x5a3a20 }, cloth: robe() },
    { hair: ['Hair_SimpleParted'], hairCol: 0x7a5632, browCol: 0x5a3c22 }, { tabard: { col: 0x8a7454 }, parts: jedi(cream, legsL, boots) });
  mk('jknight2', J0, { height: 1.05, shoulders: 1.04, hairCol: 0x1c1410, skin: { tone: 0x8a5c3e, brow: 0x1a100a, lip: 0x6a4030 }, cloth: robe('robeBrown', 0.48) },
    { hair: ['Hair_Buzzed', 'Hair_Beard'], hairCol: 0x1c1410, browCol: 0x1a100a }, { tabard: { col: 0x3e2e20 }, parts: jedi(umber, legsD, boots) });
  mk('jknight3', J0, { height: 1.02, shoulders: 1.0, hairCol: 0x8a7a66, skin: { tone: 0xc8946e, brow: 0x6a5a48 }, cloth: robe() },
    { hair: ['Hair_Long'], hairCol: 0x2a1c12, browCol: 0x2a1c12 }, { tabard: { col: 0x5a4430 }, parts: jedi(tan, legsD, boots) });
  mk('jseeker', J0, { height: 1.02, shoulders: 1.0, hairCol: 0xb8b0a4, grey: true, skin: { tone: 0xc8b49a, brow: 0x8a8278 }, cloth: robe('robeTan', 0.46) },   // Halun Tesk: pale hooded cloak, blindfold
    { hair: ['Hair_Long'], hairCol: 0xb4aca0, browCol: 0x8a8278 }, { tabard: { col: 0x9a9284 }, parts: jedi(GG([leatherV(1.3, 0.2), CREAM(1.4, 0.8)], 0.5, 1.0), GG([leatherV(2.2, 0.3)], 0.5, 1.0), GG([], 0.5, 0.5)) });
  mk('jknightf', JF, { height: 0.97, hairCol: 0x6a3a1c, skin: { tone: 0xd8a888, brow: 0x5a321c, lip: 0xa85a50, sss: 0xb04a3a }, cloth: robe('robeBrown') },
    { female: true, hair: ['Hair_Buns'], hairCol: 0x7a421e, browCol: 0x5a321c }, { female: true, tabard: { col: 0x6a5238, x0: 0.04, x1: 0.1 }, parts: jedi(cream, legsL, GG([], 0.7, 0.5), null, true) });
  mk('jknightf2', JF, { height: 0.99, hairCol: 0x141010, skin: { tone: 0x9a6a4a, brow: 0x1a120c, lip: 0x7a4438, sss: 0x903a2a }, cloth: robe() },
    { female: true, hair: ['Hair_BuzzedFemale'], hairCol: 0x141010, browCol: 0x1a120c }, { female: true, tabard: { col: 0x4a3626, x0: 0.04, x1: 0.1 }, parts: jedi(tan, legsD, GG([], 0.7, 0.5), null, true) });
  // Temple Guard: masked and anonymous, a yellow blade
  CAST.SPECS.tguard = S(J0, { name: 'tguard', height: 1.04, shoulders: 1.04, hairRes: 0.0026, helm2: 'tguard', gloves: true, hair: [], beard: false, skin: { tone: 0xc08a68 },
    helmetMat: new THREE.MeshPhysicalMaterial({ color: 0xd8d2c0, roughness: 0.36, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 1.0 }),
    cloth: (J) => CAST.skirt(J, { len: 0.72, rx: 0.168, rz: 0.136, flare: 0.3, mat: 'robeTan', tabard: 0.78, tabMat: 'robeBrown' }) });
  CAST.QC.tguard = S(CAST.QC.senate, { top: 0xd8d0bc, low: 0xc8c0aa, belt: 0x6a5a34, boots: 0x3a2e22, glove: 0x2a2018, cullHead: true });
  CAST.QO.tguard = { cullHead: true, glove: 0x2a2018, tabard: { col: 0xa88a3c, x0: 0.035, x1: 0.105 },
    parts: jedi(GG([leatherV(2.2, 0.25), CREAM(0.6, 1.05)], 0.6, 1.08, 0xfffaf0), GG([leatherV(2.6, 0.25)], 0.5, 1.05, 0xfff8ee), GG([], 0.5, 0.6), GG([{ h: 28, w: 45, toH: 44, s: 1.3, v: 1.3 }], 1, 1.1)) };
  HUNT.TEMPLATES.push('tguard');
})();
/* ---------------------------------------------------------------- templates: armour, props and the seeker's cloak, built with CAST.need */
HUNT.cloakFor = async function (T) {   // pale grey hood and tan cape: CLOAK.build sets the shapes, the colours are swapped here
  await CLOAK.build(T);
  if (T.cloak) T.cloak.mat = CM.cloth(0x8d8a82, 0xc0bcb0, 0.9, 'seekCloak', true);
  if (T.capeSpec) for (const p of T.capeSpec.panels) p.mat = 'robeTan';
};
(function () { const need0 = CAST.need; CAST.need = async function (names, progress) {
  await need0(names, progress);
  for (const n of names) {
    const T = CHAR.T[n]; if (!T || !HUNT.TEMPLATES.includes(n)) continue;
    const k = HUNT.KIT[n];
    if (k && k.c && !T._armoured) {
      if (k.shield) T.attach.push({ bone: 7, geo: HUNT.shieldGeo(), mat: HUNT.shieldMat(), pos: [0.0, -0.14, 0.1], name: 'shield', shadow: true });
      if (k.pack) T.attach.push({ bone: 2, geo: HUNT.flameGeo(), mat: HUNT.flameMat(), pos: [0, -0.14, -0.2], name: 'flame' });
      HUNT.armour(T, k);
    }
    if (n === 'jseeker' && !T.cloak) await HUNT.cloakFor(T);
  }
}; })();
/* ---------------------------------------------------------------- ENEMY.TYPES (cls is bound in p55b, after the classes exist) */
Object.assign(ENEMY.TYPES, {
  commando:   { tpl: 'commando', hp: 52, brain: 'gunner', moves: 'trooper', weapon: 'carbine', dmg: 8, burst: 3, acc: 0.08, range: [6, 16], speed: 3.6, name: 'MILITIA COMMANDO', col: [1.0, 0.72, 0.3] },
  commSgt:    { tpl: 'commSgt', hp: 90, brain: 'gunner', moves: 'trooper', weapon: 'carbine', dmg: 11, burst: 4, acc: 0.07, range: [6, 18], speed: 3.2, name: 'COMMANDO SERGEANT', col: [1.0, 0.72, 0.3], shield: true, drop: 'cell' },
  commArmored:{ tpl: 'commArmored', hp: 120, brain: 'gunner', moves: 'trooper', weapon: 'carbine', dmg: 9, burst: 3, acc: 0.09, range: [5, 14], speed: 2.7, name: 'SHIELD COMMANDO', col: [1.0, 0.72, 0.3], shield: true },
  bhunter:    { tpl: 'bhunter', hp: 120, brain: 'hunter', moves: 'trooper', weapon: 'carbine', dmg: 10, burst: 2, acc: 0.1, range: [4, 14], speed: 4.4, jet: true, whip: true, flamer: true, name: 'BOUNTY HUNTER', col: [1, 0.7, 0.2], drain: 8 },
  bhunterB:   { tpl: 'bhunterB', hp: 120, brain: 'hunter', moves: 'trooper', weapon: 'carbine', dmg: 10, burst: 2, acc: 0.1, range: [4, 14], speed: 4.4, jet: true, whip: true, flamer: true, name: 'BOUNTY HUNTER', col: [1, 0.7, 0.2], drain: 8 },
  bhunterC:   { tpl: 'bhunterC', hp: 120, brain: 'hunter', moves: 'trooper', weapon: 'carbine', dmg: 10, burst: 2, acc: 0.1, range: [4, 14], speed: 4.4, jet: true, whip: true, flamer: true, name: 'BOUNTY HUNTER', col: [1, 0.7, 0.2], drain: 8 },
  jhunter:    { jedi: true, tpl: ['jknight', 'jknight2', 'jknightf', 'jknightf2', 'tguard'], hp: 110, colors: ['blue', 'green'], name: 'JEDI HUNTER', guard: 40, aggr: 0.65, drain: 8, dmgK: 0.55, hunter: true },
  jseeker:    { jedi: true, tpl: ['jseeker'], hp: 70, colors: ['green'], name: 'JEDI SEEKER', guard: 22, aggr: 0.5, drain: 6, dmgK: 0.45, hunter: true, sensesEcho: true, cloak: true },
});
HUNT.FAC = { commando: 'commando', commSgt: 'commando', commArmored: 'commando', bhunter: 'bhunter', bhunterB: 'bhunter', bhunterC: 'bhunter', jhunter: 'jhunter', jseeker: 'jhunter' };
/* a Jedi hunter: the p31 duellist with its own HP, drain, guard and cloak (the template picks the blade colour) */
HUNT.spawnJedi = function (type, x, z, o) {
  const D = ENEMY.TYPES[type], sp = ENEMY.findSpot(x, z, o.y !== undefined ? o.y : (PHY.hf ? undefined : 0));
  const tpl = o.tpl || pick(D.tpl), color = o.color || (tpl === 'tguard' ? 'yellow' : pick(D.colors));
  const hp = o.hp || D.hp * (MG.difficulty === 'hard' ? 1.3 : MG.difficulty === 'easy' ? 0.7 : 1);
  const j = new JediHunter(type, Object.assign({}, o, { x: sp[0], y: sp[1], z: sp[2], tpl, color, hp, hunter: true, aggr: D.aggr }));
  j.type = type; j.name = D.name; j.home = [sp[0], sp[2]]; j.isBoss = false; j.noExec = false; j.drain = D.drain;
  j.guardMax = j.guard = D.guard; j.pushCd = rnd(5, 9); j.dmgK = D.dmgK || 1; j.sensesEcho = !!D.sensesEcho;
  if (D.cloak && CHAR.T[tpl] && CHAR.T[tpl].cloak) CLOAK.wear(j, true);
  return j;
};
(function () { const sp0 = ENEMY.spawn; ENEMY.spawn = function (type, x, z, o) {
  o = o || {};
  const D = ENEMY.TYPES[type];
  if (!D) return sp0(type, x, z, o);
  const e = D.jedi ? HUNT.spawnJedi(type, x, z, o) : sp0(type, x, z, D.cls ? Object.assign({}, o, { cls: D.cls }) : o);
  if (e && HUNT.FAC[type] && RNG() < 0.3) ENEMY.bark(e, 'idle');
  return e;
}; })();
/* ---------------------------------------------------------------- spawn tables (addendum §D tiers; HEAT.tier() in p50b picks the tier) */
HUNT.TABLE = [
  [],                                                  // 0: beasts only
  [['bhunter', 2]],                                    // 1: a bounty hunter pair
  [['commando', 4], ['commSgt', 1]],                   // 2: militia fireteam of four and a sergeant
  [['commando', 4], ['commSgt', 1], ['jseeker', 1]],   // 3: fireteam and a Jedi seeker
  [['jhunter', 2], ['commando', 3], ['commSgt', 1]],   // 4: the Kyros hunt cell: two Jedi hunters, sergeant fireteam
];
HUNTERS.table = (tier) => HUNT.TABLE[Math.max(0, Math.min(4, tier | 0))].map((x) => x.slice());
HUNTERS.jedi = () => BOSS.list.filter((b) => b.hunter && b.alive && !b.hidden).length;
HUNTERS.live = () => ENEMY.list.filter((e) => e.alive && !e.hidden).length + HUNTERS.jedi();
HUNTERS.castAll = () => HUNT.TEMPLATES.slice();
/* ring of units around (cx,cz), capped at the mobile budget (<= 14 live, <= 7 Jedi). Returns the spawned enemies. */
HUNTERS.spawnAround = function (L, tier, cx, cz, r) {
  const units = []; for (const [t, n] of HUNTERS.table(tier)) for (let i = 0; i < n; i++) units.push(t === 'bhunter' ? pick(BH_NAMES) : t);   // the family 'bhunter' picks a colourway
  const out = [];
  units.forEach((t, i) => {
    const jedi = !!ENEMY.TYPES[t].jedi;
    if (HUNTERS.live() >= HUNTERS.MAX_LIVE || (jedi && HUNTERS.jedi() >= HUNTERS.MAX_JEDI)) return;
    const a = (i / units.length) * TAU + rnd(-0.2, 0.2), rr = (r || 26) * rnd(0.55, 0.9);
    const x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr;
    const e = ENEMY.spawn(t, x, z, { yaw: Math.atan2(cx - x, cz - z), alert: true });
    if (e) out.push(e);
  });
  if (L) L.hunters = (L.hunters || []).concat(out);
  return out;
};
/* extra keyed moves for the hunter brains, on the trooper set (MOV.init compiles it; MOCAP only maps the named ones) */
MOV.trooper.lunge = { dur: 0.85, keys: [K(0, [-0.1, 1.2, 0.2], [0.4, 0.5, 0.8], { g: 'both', oR: -0.1, oL: 0.14, st: 'guard', cr: 0.05 }),
  K(0.25, [0.0, 1.45, 0.5], [0.2, -0.2, 0.96], { g: 'R', oR: -0.1, st: 'lungeL', pi: 0.35, cr: 0.2, air: 1, liftL: 0.5, liftR: 0.3 }),
  K(0.55, [-0.1, 1.1, 0.5], [0.1, -0.4, 0.9], { g: 'R', st: 'lungeL', pi: 0.2, cr: 0.15 }), K(0.85, [-0.1, 1.05, 0.2], [0.35, 0.5, 0.8], { g: 'both', oR: -0.1, oL: 0.14, st: 'guard', cr: 0.05 })] };
MOV.trooper.whip = { dur: 0.6, keys: [K(0, [-0.12, 1.36, 0.28], [0, 0, 1], { g: 'both', oR: -0.1, oL: 0.15, st: 'guard', cr: 0.05 }), K(0.2, [-0.1, 1.3, 0.45], [0.2, 0.3, 0.9], { g: 'R', oR: -0.1, st: 'neutral', tw: 0.6, cr: 0.1 }),
  K(0.38, [0.0, 1.28, 0.55], [0.6, 0.2, 0.7], { g: 'R', st: 'neutral', tw: -0.4, cr: 0.12 }), K(0.6, [-0.12, 1.36, 0.28], [0, 0, 1], { g: 'both', oR: -0.1, oL: 0.15, st: 'guard', cr: 0.05 })] };
MOV.trooper.flame = { dur: 1.3, keys: [K(0, [-0.12, 1.36, 0.28], [0, 0, 1], { g: 'both', oR: -0.1, oL: 0.15, st: 'guard', cr: 0.05 }), K(0.3, [-0.05, 1.32, 0.35], [0.1, 0.1, 1], { g: 'both', oR: -0.1, oL: 0.15, st: 'wide', cr: 0.08, headPitch: -0.1 }),
  K(1.3, [-0.12, 1.36, 0.28], [0, 0, 1], { g: 'both', oR: -0.1, oL: 0.15, st: 'guard', cr: 0.05 })] };
