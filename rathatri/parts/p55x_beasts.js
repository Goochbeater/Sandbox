/* BEASTS — Dxun's fauna, built like the hero's face was: each species is SCULPTED as one continuous signed-distance body (ribcage, belly, haunch and shoulder masses,
   tapered limbs with muscle, skull / snout / jaw, sockets, ears — smooth-blended, never visible primitives), baked once per species with surface nets into a single
   mesh with fine hide displacement, per-vertex AO, wear on ridges, counter-shading and the species' pattern; skinned to a procedural skeleton (spine, neck chain,
   head, jaw, jointed tail, three-bone legs) with region-restricted distance weights. Motion is procedural: feet stay PLANTED on the ground and step on arcs
   (walk / trot / gallop by speed), two-bone leg IK, head tracking, a spring tail, attack and death poses. Teeth, tusks, horns, claws and plates are rigid pieces on bones.
   `Beast extends Enemy`, so spawning (ENEMY.spawn / LEVEL.wave), damage (COMBAT.damage) and wave clearing all work unchanged.
   Types: cannok (swarm) · maalraa (leaping ambusher) · boma (charger) · zakkeg (armoured heavy). team:'hero' = a bound ally that hunts foes. */
const BEAST = { SPEC: {}, cache: {} };
const _bv1 = new THREE.Vector3(), _bv2 = new THREE.Vector3(), _bv3 = new THREE.Vector3(), _bv4 = new THREE.Vector3(), _bv5 = new THREE.Vector3(), _bv6 = new THREE.Vector3();
const _bq1 = new THREE.Quaternion(), _bq2 = new THREE.Quaternion(), _bq3 = new THREE.Quaternion();
const _ba1 = new THREE.Vector3(), _ba2 = new THREE.Vector3(), _bi = [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3());
/* ---------------------------------------------------------------- species. Metres; +Z forward, +Y up, ground at y = 0, origin between the feet.
   Skeleton joints are given directly; `body` lists the sculpt masses; `pal` the hide. */
const BSP = (o) => o;
Object.assign(BEAST.SPEC, {
  maalraa: BSP({ size: 1.0, h: 0.026, hide: { kind: 'fur', s: 0.09, bump: 0.9 }, mid: [0, 0.73, -0.02],
    pelvis: [0, 0.71, -0.46], chest: [0, 0.71, 0.4], neck: [[0, 0.06, 0.13], [0, 0.08, 0.12], [0, 0.04, 0.1]], jaw: [0, -0.058, 0.02], jawEnd: [0, -0.092, 0.232], snout: [0, -0.034, 0.242],
    FL: [[0.13, 0.6, 0.38], [0.12, 0.37, 0.31], [0.11, 0.09, 0.36], [0.11, 0.018, 0.45]], HL: [[0.13, 0.66, -0.5], [0.15, 0.42, -0.36], [0.13, 0.17, -0.62], [0.13, 0.018, -0.53]],
    tail: { n: 7, seg: 0.14, dir: [0, -0.35, -1], curl: 0.22, r0: 0.045, r1: 0.013 },
    body: { rib: [[0, 0.7, 0.16], [0.155, 0.19, 0.33]], belly: [[0, 0.6, -0.06], [0.13, 0.12, 0.3]], haunch: [[0, 0.67, -0.4], [0.15, 0.17, 0.21]], shoulder: [[0, 0.72, 0.36], [0.14, 0.15, 0.15]], spineR: [0.13, 0.135], k: 0.09 },
    neckR: [0.088, 0.066], head: { cran: [0.096, 0.084, 0.112], snR: [0.062, 0.036], cheek: [0.056, -0.026, 0.078, 0.05], brow: 0.032, jawR: [0.047, 0.026], eye: [0.054, 0.03, 0.09, 0.017], ear: [[0.055, 0.07, -0.02], [0.085, 0.165, -0.06], 0.032] },
    legR: { FU: [0.074, 0.05], FL: [0.046, 0.03], HU: [0.095, 0.055], HL: [0.048, 0.03], HM: [0.03, 0.024], paw: [0.046, 0.03, 0.064], musF: [0.075, 0.13, 0.1], musH: [0.09, 0.16, 0.12] },
    pal: { back: 0xa8763c, belly: 0xd8c098, pat: 'rosette', patCol: 0x22160e, patF: 9, dark: 0x4a3420 },
    fangs: { up: 0.045, lo: 0.03 }, claws: 0.035, eyeCol: 0xd8b030, gait: { stepH: 0.07, stride: 0.55, run: 7.0 } }),
  cannok: BSP({ size: 0.55, h: 0.0225, hide: { kind: 'fur', s: 0.06, bump: 1.4 }, bristles: 11, mid: [0, 0.38, 0],
    pelvis: [0, 0.38, -0.21], chest: [0, 0.36, 0.19], neck: [[0, 0.02, 0.07], [0, 0.0, 0.06], [0, -0.01, 0.065]], jaw: [0, -0.045, 0.02], jawEnd: [0, -0.06, 0.13], snout: [0, -0.035, 0.17],
    FL: [[0.075, 0.3, 0.19], [0.078, 0.18, 0.15], [0.072, 0.05, 0.19], [0.072, 0.012, 0.235]], HL: [[0.078, 0.33, -0.23], [0.085, 0.2, -0.15], [0.078, 0.1, -0.29], [0.078, 0.012, -0.24]],
    tail: { n: 4, seg: 0.065, dir: [0, -0.5, -1], curl: 0.0, r0: 0.03, r1: 0.008 },
    body: { rib: [[0, 0.37, 0.02], [0.125, 0.125, 0.23]], belly: [[0, 0.31, -0.02], [0.1, 0.08, 0.18]], haunch: [[0, 0.37, -0.19], [0.115, 0.125, 0.13]], shoulder: [[0, 0.42, 0.14], [0.11, 0.13, 0.12]], spineR: [0.1, 0.11], k: 0.07 },
    neckR: [0.095, 0.075], head: { cran: [0.07, 0.065, 0.08], snR: [0.05, 0.036], cheek: [0.045, -0.025, 0.04, 0.035], brow: 0.02, jawR: [0.036, 0.022], eye: [0.047, 0.02, 0.05, 0.013], ear: [[0.045, 0.045, -0.02], [0.06, 0.085, -0.045], 0.022], disc: true },
    legR: { FU: [0.04, 0.03], FL: [0.028, 0.02], HU: [0.05, 0.034], HL: [0.03, 0.02], HM: [0.02, 0.017], paw: [0.03, 0.02, 0.04], musF: [0.05, 0.08, 0.07], musH: [0.06, 0.09, 0.08] },
    pal: { back: 0x4a3a2c, belly: 0x8a765c, pat: 'bristle', patCol: 0x1c1410, patF: 30, dark: 0x241a14, stripe: true },
    tusks: 0.075, claws: 0.018, eyeCol: 0xffb030, gait: { stepH: 0.045, stride: 0.26, run: 5.6 } }),
  boma: BSP({ size: 1.9, h: 0.06, hide: { kind: 'scale', s: 0.3, bump: 2.2 }, mid: [0, 1.45, 0],
    pelvis: [0, 1.36, -0.8], chest: [0, 1.58, 0.72], neck: [[0, -0.04, 0.26], [0, -0.12, 0.22], [0, -0.12, 0.24]], jaw: [0, -0.16, 0.04], jawEnd: [0, -0.22, 0.42], snout: [0, -0.1, 0.5],
    FL: [[0.33, 1.24, 0.74], [0.33, 0.78, 0.66], [0.31, 0.22, 0.74], [0.31, 0.04, 0.84]], HL: [[0.31, 1.2, -0.85], [0.34, 0.78, -0.6], [0.31, 0.42, -1.02], [0.31, 0.04, -0.9]],
    tail: { n: 4, seg: 0.24, dir: [0, -0.7, -1], curl: 0, r0: 0.16, r1: 0.05 },
    body: { rib: [[0, 1.34, 0.18], [0.54, 0.6, 0.84]], belly: [[0, 1.04, 0.0], [0.44, 0.38, 0.68]], haunch: [[0, 1.3, -0.7], [0.47, 0.5, 0.52]], shoulder: [[0, 1.66, 0.58], [0.5, 0.5, 0.5]], spineR: [0.44, 0.5], k: 0.24, hump: [[0, 1.86, 0.5], [0.34, 0.26, 0.42]] },
    neckR: [0.42, 0.32], head: { cran: [0.27, 0.25, 0.3], snR: [0.21, 0.17], cheek: [0.17, -0.06, 0.12, 0.13], brow: 0.13, jawR: [0.16, 0.11], eye: [0.21, 0.07, 0.17, 0.045], plate: true },
    legR: { FU: [0.24, 0.17], FL: [0.15, 0.13], HU: [0.27, 0.17], HL: [0.15, 0.12], HM: [0.12, 0.11], paw: [0.15, 0.08, 0.17], musF: [0.27, 0.36, 0.3], musH: [0.29, 0.42, 0.34] },
    pal: { back: 0x56604a, belly: 0x8c9078, pat: 'scale', patCol: 0x1e2618, patF: 5, dark: 0x262c20 },
    horns: [{ at: 'head', p: [0.17, 0.2, 0.08], d: [0.55, 0.35, 0.75], len: 0.62, r: 0.085, curve: 0.5 }, { at: 'head', p: [0, 0.02, 0.62], d: [0, 0.7, 0.7], len: 0.34, r: 0.07, curve: -0.25, mid: true }], ridge: { n: 7, from: -0.6, to: 0.75, sz: 0.26 }, claws: 0.0, hooves: true, eyeCol: 0xff7a20, gait: { stepH: 0.12, stride: 1.3, run: 12 } }),
  zakkeg: BSP({ size: 2.6, h: 0.078, hide: { kind: 'hide', s: 0.42, bump: 2.6 }, mid: [0, 1.8, 0],
    pelvis: [0, 1.66, -1.12], chest: [0, 1.94, 0.98], neck: [[0, 0.02, 0.36], [0, -0.06, 0.36], [0, -0.1, 0.34]], jaw: [0, -0.17, 0.0], jawEnd: [0, -0.24, 0.78], snout: [0, -0.08, 0.82],
    FL: [[0.52, 1.6, 0.98], [0.62, 1.0, 0.84], [0.56, 0.3, 1.04], [0.56, 0.05, 1.28]], HL: [[0.5, 1.5, -1.17], [0.57, 1.0, -0.76], [0.53, 0.5, -1.38], [0.52, 0.05, -1.16]],
    tail: { n: 8, seg: 0.36, dir: [0, -0.32, -1], curl: 0.06, r0: 0.4, r1: 0.07 },
    body: { rib: [[0, 1.64, 0.25], [0.74, 0.78, 1.15]], belly: [[0, 1.3, 0.0], [0.6, 0.5, 0.9]], haunch: [[0, 1.56, -0.95], [0.64, 0.7, 0.7]], shoulder: [[0, 1.9, 0.85], [0.7, 0.72, 0.62]], spineR: [0.62, 0.66], k: 0.3, hump: [[0, 2.2, 0.55], [0.44, 0.3, 0.8]] },
    neckR: [0.55, 0.36], head: { cran: [0.34, 0.31, 0.46], snR: [0.28, 0.17], cheek: [0.26, -0.08, 0.1, 0.19], brow: 0.16, jawR: [0.25, 0.13], eye: [0.27, 0.1, 0.25, 0.055], crest: true },
    legR: { FU: [0.34, 0.24], FL: [0.22, 0.16], HU: [0.36, 0.22], HL: [0.2, 0.15], HM: [0.15, 0.13], paw: [0.24, 0.12, 0.3], musF: [0.4, 0.5, 0.42], musH: [0.4, 0.58, 0.46] },
    pal: { back: 0x4e3826, belly: 0xa08458, pat: 'mottle', patCol: 0x150d08, patF: 2.6, dark: 0x22160e, bands: true },
    teeth: { n: 7, up: 0.13, lo: 0.1 }, ridge: { n: 9, from: -1.15, to: 1.05, sz: 0.62, tail: 5, scute: true }, claws: 0.38, eyeCol: 0xffc828, gait: { stepH: 0.16, stride: 1.6, run: 6.5 } }),
});
/* Worley / cellular noise: distances to the nearest two jittered feature points → [F1, F2] (rosettes, spots, scale grooves) */
BEAST._cr = [0, 0];
BEAST.cell = function (x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let f1 = 9, f2 = 9;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    const cx = ix + dx, cy = iy + dy, cz = iz + dz, px = cx + hash3(cx, cy, cz), py = cy + hash3(cx + 31, cy, cz), pz = cz + hash3(cx, cy + 57, cz);
    const d = Math.hypot(x - px, y - py, z - pz); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  BEAST._cr[0] = f1; BEAST._cr[1] = f2; return BEAST._cr;
};
/* ---------------------------------------------------------------- skeleton: [name, parent, head, end?] built from a species spec */
BEAST.skel = function (S) {
  const B = [], add = (n, par, head, end) => { B.push({ n, par: par === null ? -1 : B.findIndex((b) => b.n === par), head: head.slice(), end: end ? end.slice() : null }); return head; };
  const V3a = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  add('root', null, S.mid); add('pelvis', 'root', S.pelvis); add('spine', 'root', S.mid); add('chest', 'spine', S.chest);
  let p = S.chest; const nk = ['neck1', 'neck2', 'head'], par = ['chest', 'neck1', 'neck2'];
  for (let i = 0; i < 3; i++) { p = V3a(p, S.neck[i]); add(nk[i], par[i], p); }
  const head = p; add('jaw', 'head', V3a(head, S.jaw), V3a(head, S.jawEnd));
  B[B.length - 2].end = V3a(head, S.snout);
  // tail
  const T = S.tail, d = V.norm(T.dir); let tp = S.pelvis.slice(); tp[2] -= S.size * 0.06;
  for (let i = 0; i < T.n; i++) { const dd = V.norm([d[0], d[1] + T.curl * i * 0.9, d[2]]); add('tail' + i, i ? 'tail' + (i - 1) : 'pelvis', tp, i === T.n - 1 ? V3a(tp, V.mul(dd, T.seg)) : null); tp = V3a(tp, V.mul(dd, T.seg)); }
  // legs (left = -x). front: upper→lower→foot; hind: thigh→shin→meta
  for (const [k, side] of [['FL', -1], ['FR', 1], ['HL', -1], ['HR', 1]]) {
    const L = S[k[0] === 'F' ? 'FL' : 'HL'].map((q) => [Math.abs(q[0]) * side, q[1], q[2]]);
    const host = k[0] === 'F' ? 'chest' : 'pelvis';
    add(k + 'u', host, L[0]); add(k + 'l', k + 'u', L[1]); add(k + 'f', k + 'l', L[2], L[3]);
  }
  for (const b of B) if (!b.end) { const c = B.find((x) => B[x.par] === b); b.end = c ? c.head.slice() : V3a(b.head, [0, 0, 0.05]); }
  B.idx = {}; B.forEach((b, i) => { B.idx[b.n] = i; }); return B;
};
/* ---------------------------------------------------------------- the sculpt: one region group per body part, smooth-unioned */
BEAST.sculpt = function (S, B) {
  const P = (n) => B[B.idx[n]].head, E = (n) => B[B.idx[n]].end, a3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const bd = S.body, k = bd.k, G = [];
  const it = (p, op, kk) => ({ p, op: op || 'su', k: kk === undefined ? k * 0.5 : kk });
  // torso: spine core + masses
  const tor = [it(SDF.rcone(P('pelvis'), P('chest'), bd.spineR[0], bd.spineR[1]), 'u'), it(SDF.ell(bd.rib[0], bd.rib[1])), it(SDF.ell(bd.belly[0], bd.belly[1])), it(SDF.ell(bd.haunch[0], bd.haunch[1])), it(SDF.ell(bd.shoulder[0], bd.shoulder[1]))];
  if (bd.hump) tor.push(it(SDF.ell(bd.hump[0], bd.hump[1]), 'su', k * 0.8));
  G.push({ name: 'torso', items: tor, bones: ['root', 'spine', 'chest', 'pelvis'] });
  // neck
  const n0 = a3(P('chest'), [0, bd.spineR[1] * 0.25, 0]);
  G.push({ name: 'neck', op: 'su', k: k * 0.7, items: [it(SDF.rcone(n0, P('neck1'), S.neckR[0], lerp(S.neckR[0], S.neckR[1], 0.5)), 'u'), it(SDF.rcone(P('neck1'), P('neck2'), lerp(S.neckR[0], S.neckR[1], 0.5), S.neckR[1] * 0.95)), it(SDF.rcone(P('neck2'), P('head'), S.neckR[1] * 0.95, S.neckR[1] * 0.85))], bones: ['chest', 'neck1', 'neck2', 'head'] });
  // head (skull, snout, cheeks, brow, sockets, ears, nostrils)
  const H = S.head, hp = P('head'), sn = E('head');
  const hi = [it(SDF.ell(a3(hp, [0, H.cran[1] * 0.25, 0]), H.cran), 'u'), it(SDF.rcone(a3(hp, [0, -H.cran[1] * 0.1, H.cran[2] * 0.4]), sn, H.snR[0], H.snR[1]), 'su', k * 0.35)];
  for (const sx of [-1, 1]) hi.push(it(SDF.ell(a3(hp, [sx * H.cheek[0], H.cheek[1], H.cheek[2]]), [H.cheek[3], H.cheek[3] * 0.9, H.cheek[3] * 1.15]), 'su', k * 0.3));
  hi.push(it(SDF.ell(a3(hp, [0, H.cran[1] * 0.55, H.cran[2] * 0.45]), [H.cran[0] * 0.9, H.brow * 0.8, H.brow * 1.3]), 'su', k * 0.25));   // brow ridge
  if (H.plate) hi.push(it(SDF.box(a3(hp, [0, H.cran[1] * 0.75, H.cran[2] * 0.55]), [H.cran[0] * 0.95, H.brow * 0.35, H.cran[2] * 0.75], H.brow * 0.25, SDF.rot(-12, 0, 0)), 'su', k * 0.15));   // boma frontal shield
  if (H.crest) for (const sx of [-1, 1]) hi.push(it(SDF.rcone(a3(hp, [sx * H.cran[0] * 0.75, H.cran[1] * 0.45, -H.cran[2] * 0.1]), a3(hp, [sx * H.cran[0] * 1.25, H.cran[1] * 0.75, -H.cran[2] * 0.8]), H.brow * 0.55, H.brow * 0.12), 'su', k * 0.2));
  if (H.disc) hi.push(it(SDF.rcone(a3(sn, [0, 0, -0.03]), a3(sn, [0, 0.005, 0.012]), H.snR[1] * 1.15, H.snR[1] * 1.15), 'su', 0.01));   // cannok's pig-disc snout
  for (const sx of [-1, 1]) hi.push(it(SDF.sph(a3(hp, [sx * H.eye[0], H.eye[1], H.eye[2]]), H.eye[3] * 1.25), 'ss', H.eye[3] * 0.6));   // eye sockets
  for (const sx of [-1, 1]) hi.push(it(SDF.sph(a3(sn, [sx * H.snR[1] * 0.42, H.snR[1] * 0.3, 0.0]), H.snR[1] * 0.22), 'ss', H.snR[1] * 0.18));   // nostrils
  if (H.ear) for (const sx of [-1, 1]) hi.push(it(SDF.rcone(a3(hp, [sx * H.ear[0][0], H.ear[0][1], H.ear[0][2]]), a3(hp, [sx * H.ear[1][0], H.ear[1][1], H.ear[1][2]]), H.ear[2], H.ear[2] * 0.15), 'su', H.ear[2] * 0.6));
  G.push({ name: 'head', op: 'su', k: k * 0.45, items: hi, bones: ['head', 'neck2'] });
  // jaw
  G.push({ name: 'jaw', op: 'su', k: k * 0.12, items: [it(SDF.rcone(P('jaw'), E('jaw'), H.jawR[0], H.jawR[1]), 'u'), it(SDF.ell(lerp3(P('jaw'), E('jaw'), 0.15), [H.jawR[0] * 1.15, H.jawR[0] * 0.8, H.jawR[0] * 1.1]), 'su', k * 0.2)], bones: ['jaw', 'head'] });
  // tail
  const ti = []; for (let i = 0; i < S.tail.n; i++) { const t0 = i / S.tail.n, t1 = (i + 1) / S.tail.n; ti.push(it(SDF.rcone(P('tail' + i), E('tail' + i), lerp(S.tail.r0, S.tail.r1, t0), lerp(S.tail.r0, S.tail.r1, t1)), i ? 'su' : 'u', S.tail.r0 * 0.3)); }
  G.push({ name: 'tail', op: 'su', k: k * 0.55, items: ti, bones: ['pelvis'].concat(Array.from({ length: S.tail.n }, (_, i) => 'tail' + i)) });
  // legs
  const R = S.legR;
  for (const L of ['FL', 'FR', 'HL', 'HR']) {
    const f = L[0] === 'F', u = P(L + 'u'), l = P(L + 'l'), ft = P(L + 'f'), toe = E(L + 'f'), mus = f ? R.musF : R.musH, rU = f ? R.FU : R.HU, rL = f ? R.FL : R.HL;
    const li = [it(SDF.ell(lerp3(u, l, 0.3), mus), 'u'), it(SDF.rcone(u, l, rU[0], rU[1]), 'su', k * 0.4), it(SDF.rcone(l, ft, rL[0], rL[1]), 'su', rL[0] * 0.5)];
    li.push(it(SDF.rcone(ft, a3(toe, [0, R.paw[1] * 0.2, 0]), f ? rL[1] : R.HM[0], R.paw[1] * 0.9), 'su', R.paw[1] * 0.6));
    li.push(it(SDF.ell(a3(toe, [0, R.paw[1] * 0.4, 0]), R.paw), 'su', R.paw[1] * 0.6));
    G.push({ name: L, op: 'su', k: k * (f ? 0.75 : 0.85), items: li, bones: [f ? 'chest' : 'pelvis', L + 'u', L + 'l', L + 'f'] });
  }
  return G;
};
/* ---------------------------------------------------------------- bake: mesh, detail, colour, AO, skin weights (cached per species) */
BEAST.bake = function (name) {
  if (BEAST.cache[name]) return BEAST.cache[name];
  const S = BEAST.SPEC[name], B = BEAST.skel(S), G = BEAST.sculpt(S, B), f = SDF.compile(G), regs = f.groups;
  // bounds
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (const g of G) { const b = g.bound; x0 = Math.min(x0, b.c[0] - b.r); y0 = Math.min(y0, b.c[1] - b.r); z0 = Math.min(z0, b.c[2] - b.r); x1 = Math.max(x1, b.c[0] + b.r); y1 = Math.max(y1, b.c[1] + b.r); z1 = Math.max(z1, b.c[2] + b.r); }
  const h = S.h, m0 = MESH.nets(f, [x0 - h * 2, Math.max(-0.02, y0 - h * 2), z0 - h * 2, x1 + h * 2, y1 + h * 2, z1 + h * 2], h, { block: 4 });
  const m = MESH.largest(m0, 200); const nv = m.nv, pos = m.pos, sz = S.size;
  const g3 = [0, 0, 0], nrm = new Float32Array(nv * 3);
  // hide detail: displace along the field normal by multi-scale noise (wrinkles + scale bumps), then recompute normals from the mesh
  const fq = 1 / (sz * 0.045), amp = sz * 0.0055;
  for (let v = 0; v < nv; v++) { const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]; SDF.grad(f, x, y, z, h * 0.5, g3);
    const n = fbm3(x * fq, y * fq, z * fq, 3) - 0.5, n2 = vnoise3(x * fq * 3.1, y * fq * 3.1, z * fq * 3.1) - 0.5, d = (n * 1.0 + n2 * 0.35) * amp;
    pos[v * 3] = x + g3[0] * d; pos[v * 3 + 1] = y + g3[1] * d; pos[v * 3 + 2] = z + g3[2] * d; nrm[v * 3] = g3[0]; nrm[v * 3 + 1] = g3[1]; nrm[v * 3 + 2] = g3[2]; }
  const mn = MESH.normals(pos, m.idx, nv);
  for (let i = 0; i < nv * 3; i++) mn[i] = mn[i] * 0.7 + nrm[i] * 0.3;
  for (let v = 0; v < nv; v++) { const l = Math.hypot(mn[v * 3], mn[v * 3 + 1], mn[v * 3 + 2]) || 1; mn[v * 3] /= l; mn[v * 3 + 1] /= l; mn[v * 3 + 2] /= l; }
  // colour: counter-shading (dark back / pale belly), species pattern, AO in the creases, wear on convex ridges
  const pal = S.pal, cB = new THREE.Color(pal.back), cV = new THREE.Color(pal.belly), cP = new THREE.Color(pal.patCol), cD = new THREE.Color(pal.dark);
  const col = new Float32Array(nv * 3), tmp = new THREE.Color(), midY = S.mid[1];
  const skinI = new Uint16Array(nv * 4), skinW = new Float32Array(nv * 4), segA = B.map((b) => b.head), segB = B.map((b) => b.end);
  const boneSet = G.map((g) => g.bones.map((n) => B.idx[n]));
  const pf = pal.patF / sz;
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], ny = mn[v * 3 + 1];
    // region: the group whose own field is nearest
    let rg = 0, rv = 1e9; for (let i = 0; i < regs.length; i++) { const t = regs[i](x, y, z); if (t < rv) { rv = t; rg = i; } }
    const rn = G[rg].name;
    let belly = sat(-ny * 0.95 + 0.08 - (y - midY) / (sz * 0.7)); if (rn === 'jaw') belly = Math.max(belly, 0.6); if (rn[0] === 'F' || rn[0] === 'H') belly *= 0.45;
    tmp.copy(cB).lerp(cV, smooth(0.32, 0.82, belly)); tmp.lerp(cD, sat((ny - 0.55) * 2.2) * 0.3);   // pale underside, darker spine line
    // pattern
    let p = 0;
    if (pal.pat === 'rosette') { const limb = rn[0] === 'F' || rn[0] === 'H' || rn === 'head' || rn === 'tail', C = BEAST.cell(x * pf * (limb ? 1.8 : 1), y * pf * (limb ? 1.8 : 1), z * pf * (limb ? 1.8 : 1)), f1 = C[0];
      if (limb) p = 1 - smooth(0.16, 0.26, f1); else { const ring = (smooth(0.17, 0.25, f1) - smooth(0.34, 0.44, f1)) * smooth(0.3, 0.55, vnoise3(x * pf * 3.3, y * pf * 3.3, z * pf * 3.3)); p = ring * 0.95; tmp.lerp(cD, (1 - smooth(0.12, 0.26, f1)) * 0.35); }
      p *= 1 - belly * 0.85; }
    else if (pal.pat === 'bristle') { p = smooth(0.55, 0.9, vnoise3(x * pf, y * pf, z * pf)) * 0.55 + (pal.stripe ? smooth(0.55, 0.95, 1 - Math.abs(x) / (sz * 0.09)) * sat((y - midY) / (sz * 0.1) + 0.5) * 0.7 : 0); }
    else if (pal.pat === 'scale') { const c = fbm3(x * pf, y * pf, z * pf, 3), C = BEAST.cell(x * pf * 2.2, y * pf * 2.2, z * pf * 2.2); p = (smooth(0.52, 0.64, c) * 0.55 + (1 - smooth(0.02, 0.09, C[1] - C[0])) * 0.45) * (1 - belly * 0.8); }
    else if (pal.pat === 'mottle') { const c = fbm3(x * pf, y * pf, z * pf, 4); p = smooth(0.46, 0.6, c) * 0.8; if (pal.bands) p = Math.max(p, smooth(0.35, 0.8, Math.sin(z * pf * 3.1 + c * 4)) * (1 - belly) * 0.85); p *= 1 - belly * 0.6; }
    tmp.lerp(cP, sat(p * 1.15));
    if (rn[0] === 'F' || rn[0] === 'H') tmp.lerp(cD, sat((S.mid[1] * 0.45 - y) / (S.mid[1] * 0.5)) * 0.75);   // darker lower legs / socks
    // AO (taps scaled to the animal) and curvature-ish wear
    let occ = 0, w = 1; for (let i = 1; i <= 4; i++) { const hh = sz * (0.012 + 0.03 * i); const dd = f(x + mn[v * 3] * hh, y + ny * hh, z + mn[v * 3 + 2] * hh); occ += Math.max(0, hh - dd) / hh * w; w *= 0.7; }
    const ao = 1 - sat(occ * 0.75), base = f(x, y, z), conv = sat((f(x + mn[v * 3] * h * 2, y + ny * h * 2, z + mn[v * 3 + 2] * h * 2) - base) / (h * 2) - 0.85);
    const k = (0.35 + 0.65 * ao) * (1 + conv * 0.25);
    col[v * 3] = tmp.r * k; col[v * 3 + 1] = tmp.g * k; col[v * 3 + 2] = tmp.b * k;
    // skin weights: distance to each allowed bone's segment, inverse-power falloff, top four
    const set = boneSet[rg], ws = [];
    for (const bi of set) { const a = segA[bi], b = segB[bi], abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2], L2 = abx * abx + aby * aby + abz * abz || 1e-6;
      const t = clamp(((x - a[0]) * abx + (y - a[1]) * aby + (z - a[2]) * abz) / L2, 0, 1), dx = x - a[0] - abx * t, dy = y - a[1] - aby * t, dz = z - a[2] - abz * t;
      ws.push([bi, Math.pow(1 / (Math.sqrt(dx * dx + dy * dy + dz * dz) + sz * 0.02), 4)]); }
    ws.sort((p1, p2) => p2[1] - p1[1]); let tw = 0; for (let i = 0; i < 4 && i < ws.length; i++) tw += ws[i][1];
    for (let i = 0; i < 4; i++) { skinI[v * 4 + i] = i < ws.length ? ws[i][0] : 0; skinW[v * 4 + i] = i < ws.length ? ws[i][1] / tw : 0; }
  }
  const geo = MESH.geometry(pos, m.idx, mn);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinI, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinW, 4));
  geo.computeBoundingSphere();
  const mat = BEAST.hideMat(S.hide);
  return (BEAST.cache[name] = { S, B, geo, mat, nt: m.idx.length / 3, nv });
};
/* tileable hide height maps (256², periodic): 'fur' grain, 'scale' cellular plates with grooves, 'hide' wrinkled leather */
BEAST.hideTex = function (kind) {
  BEAST._ht = BEAST._ht || {}; if (BEAST._ht[kind]) return BEAST._ht[kind];
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N), D = im.data;
  const cells = kind === 'fur' ? 22 : kind === 'scale' ? 9 : 6, per = (i) => ((i % cells) + cells) % cells;
  const cellF = (u, v) => { const X = u * cells, Y = v * cells, ix = Math.floor(X), iy = Math.floor(Y); let f1 = 9, f2 = 9;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const cx = ix + dx, cy = iy + dy, hx = cx + hash3(per(cx), per(cy), 1), hy = cy + hash3(per(cx), per(cy), 2); const d = Math.hypot(X - hx, Y - hy); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
    return [f1, f2]; };
  const pn = (u, v, f) => { const X = u * f, Y = v * f, ix = Math.floor(X), iy = Math.floor(Y), fx = X - ix, fy = Y - iy, w = (a) => ((a % f) + f) % f, h = (a, b) => hash3(w(a), w(b), 9);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return lerp(lerp(h(ix, iy), h(ix + 1, iy), sx), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), sx), sy); };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N; let h;
    if (kind === 'fur') { const n1 = pn(u, v * 0.25, 64), n2 = pn(u, v, 32), C = cellF(u, v); h = 0.55 * n1 + 0.3 * n2 + 0.25 * (1 - smooth(0.0, 0.5, C[0])); }
    else if (kind === 'scale') { const C = cellF(u, v), dome = 1 - smooth(0.0, 0.75, C[0]), groove = smooth(0.0, 0.12, C[1] - C[0]); h = (0.35 + 0.55 * dome) * (0.25 + 0.75 * groove) + 0.12 * pn(u, v, 32); }
    else { const C = cellF(u, v), groove = smooth(0.0, 0.1, C[1] - C[0]), w1 = pn(u, v, 16), w2 = pn(u, v, 48); h = 0.45 * groove + 0.35 * w1 + 0.25 * w2; }
    const b = Math.round(clamp(h, 0, 1) * 255), k = (j * N + i) * 4; D[k] = D[k + 1] = D[k + 2] = b; D[k + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return (BEAST._ht[kind] = t);
};
/* hide material: vertex colour × triplanar hide detail (rest-pose object space, so it rides the skin), screen-space bump from the same height, + the character fill/rim */
BEAST.hideMat = function (H) {
  const key = 'hide_' + H.kind + '_' + H.s + '_' + H.bump; BEAST.mats = BEAST.mats || {}; if (BEAST.mats[key]) return BEAST.mats[key];
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.0, envMapIntensity: 0.5 });
  const U = { uHide: { value: BEAST.hideTex(H.kind) }, uHideS: { value: H.s }, uBump: { value: H.bump } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U); sh.uniforms.uFill = CM.fillU; CM.rimHook(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRestP; varying vec3 vRestN;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvRestN = objectNormal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRestP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uFill; uniform sampler2D uHide; uniform float uHideS, uBump; varying vec3 vRestP; varying vec3 vRestN;
float beastH() { vec3 w = pow(abs(normalize(vRestN)), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5); vec3 p = vRestP / uHideS;
  return texture2D(uHide, p.zy).r * w.x + texture2D(uHide, p.xz).r * w.y + texture2D(uHide, p.xy).r * w.z; }
vec3 beastBump(vec3 sp, vec3 sn, vec2 dH, float fd) { vec3 sx = normalize(dFdx(sp)), sy = normalize(dFdy(sp)), r1 = cross(sy, sn), r2 = cross(sn, sx); float det = dot(sx, r1) * fd;
  vec3 g = sign(det) * (dH.x * r1 + dH.y * r2); return normalize(abs(det) * sn - g); }`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat bH = beastH(); diffuseColor.rgb *= 0.72 + 0.56 * bH;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec2 dH = vec2(dFdx(bH), dFdy(bH)) * uBump; normal = beastBump(-vViewPosition, normal, dH, faceDirection); }')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (0.5 - bH) * 0.25, 0.3, 1.0);')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL);
  };
  m.customProgramCacheKey = () => 'beasthide';
  return (BEAST.mats[key] = m);
};
/* the characters' camera-relative fill + thin rim, so shaded flanks keep their form */
BEAST.lit = function (m, key) { m.onBeforeCompile = (sh) => { sh.uniforms.uFill = CM.fillU; CM.rimHook(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFill;').replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL); }; m.customProgramCacheKey = () => 'beast_' + key; return m; };
BEAST.mats = {};
BEAST.mat = (key, hex, rough, metal, emis) => BEAST.mats[key] || (BEAST.mats[key] = BEAST.lit(new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal || 0, emissive: emis || 0, emissiveIntensity: emis ? 1.6 : 0, envMapIntensity: 0.7 }), key));
/* a horn / tusk / claw: a curved tapering tube along a bent path */
BEAST.hornGeo = function (len, r, curve, seg) {
  const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector3(0, Math.sin(t * curve) * len * 0.35, t * len)); }
  const path = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(path, 8, r, seg || 7, false), p = g.attributes.position, n = 9 * (seg || 7 + 1);
  // taper: shrink rings toward the tip (ring i at u = i/8)
  for (let i = 0; i < p.count; i++) { const ring = Math.floor(i / ((seg || 7) + 1)), u = ring / 8, c = path.getPointAt(Math.min(1, u)); const k = 1 - u * 0.92; p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k); }
  g.computeVertexNormals(); void n; return g;
};
/* ---------------------------------------------------------------- an instance: skinned mesh + bones + rigid pieces */
BEAST.instance = function (name) {
  const K = BEAST.bake(name), S = K.S, B = K.B, bones = [];
  for (const b of B) { const bo = new THREE.Bone(); bo.name = b.n; const p = b.par >= 0 ? B[b.par].head : [0, 0, 0]; bo.position.set(b.head[0] - p[0], b.head[1] - p[1], b.head[2] - p[2]); if (b.par >= 0) bones[b.par].add(bo); bones.push(bo); }
  const mesh = new THREE.SkinnedMesh(K.geo, K.mat); mesh.add(bones[0]); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  const at = (bn, obj, p) => { const b = B[B.idx[bn]]; obj.position.set(p[0] - b.head[0], p[1] - b.head[1], p[2] - b.head[2]); bones[B.idx[bn]].add(obj); obj.castShadow = true; return obj; };
  const ivory = BEAST.mat('ivory', 0xe2d8c0, 0.45), horn = BEAST.mat('horn', 0x2e2620, 0.38, 0.05), eyeM = BEAST.mat('eye_' + name, 0x050302, 0.08, 0, S.eyeCol);
  const hp = B[B.idx.head].head, H = S.head;
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(H.eye[3], 10, 8), eyeM); at('head', e, [hp[0] + sx * H.eye[0] * 0.96, hp[1] + H.eye[1], hp[2] + H.eye[2]]); e.castShadow = false; }
  const sn = B[B.idx.head].end, jp = B[B.idx.jaw].head, je = B[B.idx.jaw].end;
  if (S.fangs) for (const sx of [-1, 1]) { const t = new THREE.Mesh(BEAST.hornGeo(S.fangs.up, S.fangs.up * 0.2, 0.4, 5), ivory); t.rotation.x = Math.PI / 2 + 0.25; at('head', t, [sn[0] + sx * H.snR[1] * 0.55, sn[1] - H.snR[1] * 0.45, sn[2] - H.snR[1] * 0.6]);
    const b = new THREE.Mesh(BEAST.hornGeo(S.fangs.lo, S.fangs.lo * 0.2, 0.4, 5), ivory); b.rotation.x = -Math.PI / 2 - 0.2; at('jaw', b, [je[0] + sx * H.jawR[1] * 0.6, je[1] + H.jawR[1] * 0.7, je[2] - H.jawR[1] * 0.7]); }
  if (S.teeth) for (let i = 0; i < S.teeth.n; i++) for (const sx of [-1, 1]) { const u = i / (S.teeth.n - 1), z = lerp(hp[2] + H.cran[2] * 0.4, sn[2] - H.snR[1] * 0.3, u), w = lerp(H.snR[0], H.snR[1], u) * 0.78;
    const t = new THREE.Mesh(BEAST.hornGeo(S.teeth.up * (0.6 + 0.5 * Math.sin(u * 3)), S.teeth.up * 0.16, 0.3, 4), ivory); t.rotation.x = Math.PI / 2 + 0.1; at('head', t, [sx * w, lerp(hp[1] - H.cran[1] * 0.35, sn[1] - H.snR[1] * 0.55, u), z]);
    const zl = lerp(jp[2] + H.jawR[0] * 0.8, je[2] - H.jawR[1] * 0.4, u), b = new THREE.Mesh(BEAST.hornGeo(S.teeth.lo * (0.6 + 0.4 * Math.cos(u * 3)), S.teeth.lo * 0.16, 0.3, 4), ivory); b.rotation.x = -Math.PI / 2 - 0.1; at('jaw', b, [sx * lerp(H.jawR[0], H.jawR[1], u) * 0.8, lerp(jp[1], je[1], u) + lerp(H.jawR[0], H.jawR[1], u) * 0.85, zl]); }
  if (S.tusks) for (const sx of [-1, 1]) { const t = new THREE.Mesh(BEAST.hornGeo(S.tusks, S.tusks * 0.16, 1.4, 6), ivory); t.rotation.set(-1.1, sx * 0.45, 0); at('jaw', t, [je[0] + sx * H.jawR[0] * 0.75, je[1] + H.jawR[0] * 0.3, je[2] - H.jawR[0] * 1.6]); }
  if (S.horns) for (const hn of S.horns) for (const sx of (hn.mid ? [0] : [-1, 1])) { const g = BEAST.hornGeo(hn.len, hn.r, hn.curve, 8), mm = new THREE.Mesh(g, hn.mid ? ivory : horn); const d = V.norm([hn.d[0] * (sx || 1) * (hn.mid ? 0 : 1), hn.d[1], hn.d[2]]);
    mm.quaternion.setFromUnitVectors(_bv1.set(0, 0, 1), _bv2.set(d[0], d[1], d[2])); if (!hn.mid) mm.rotateZ(sx * 0.4); at(hn.at, mm, [hp[0] + hn.p[0] * (sx || 0), hp[1] + hn.p[1], hp[2] + hn.p[2]]); }
  if (S.bristles) { const bg = new THREE.ConeGeometry(S.size * 0.018, S.size * 0.12, 4); for (let i = 0; i < S.bristles; i++) { const u = i / (S.bristles - 1), z = lerp(S.pelvis[2] * 0.7, S.chest[2] * 1.1, u), bn = z > 0.05 ? 'chest' : 'pelvis';
    for (const sx of [-0.4, 0, 0.4]) { const c = new THREE.Mesh(bg, BEAST.mat('bristle', 0x1a120c, 0.9)); c.rotation.set(-0.7 + rnd(-0.15, 0.15), 0, sx * 0.9); at(bn, c, [sx * S.size * 0.06, S.mid[1] + S.body.shoulder[1][1] * 0.95 * (0.75 + 0.25 * Math.sin(u * PI)), z]); } } }
  if (S.claws) for (const L of ['FL', 'FR', 'HL', 'HR']) { const toe = B[B.idx[L + 'f']].end, w = S.legR.paw[0]; for (const dx of [-0.55, 0, 0.55]) { const c = new THREE.Mesh(BEAST.hornGeo(S.claws, S.claws * 0.18, -1.1, 5), horn); c.rotation.x = 0.35; at(L + 'f', c, [toe[0] + dx * w, toe[1] + S.legR.paw[1] * 0.45, toe[2] + S.legR.paw[2] * 0.75]); } }
  if (S.hooves) for (const L of ['FL', 'FR', 'HL', 'HR']) { const toe = B[B.idx[L + 'f']].end, P2 = S.legR.paw, hv = new THREE.Mesh(new THREE.CylinderGeometry(P2[0] * 0.95, P2[0] * 1.1, P2[1] * 1.1, 10), horn); at(L + 'f', hv, [toe[0], toe[1] + P2[1] * 0.5, toe[2]]); }
  if (S.ridge) {   // boma: curved keratin spikes; zakkeg: paired domed armour scutes down the spine and tail
    const R2 = S.ridge, scute = R2.scute, kera = BEAST.mat('kera', 0x221c18, 0.42, 0.05);
    const sg = scute ? (() => { const g = new THREE.SphereGeometry(R2.sz * 0.5, 10, 6, 0, TAU, 0, Math.PI / 2); g.scale(0.62, 0.42, 1.0); return g; })() : BEAST.hornGeo(R2.sz, R2.sz * 0.2, -0.9, 6);
    const top = (z) => S.mid[1] + S.body.rib[1][1] * 0.97 + (S.body.hump ? Math.max(0, 1 - Math.abs(z - S.body.hump[0][2]) / S.body.hump[1][2]) * S.body.hump[1][1] * 0.75 : 0);
    for (let i = 0; i < R2.n; i++) { const u = i / (R2.n - 1), z = lerp(R2.from, R2.to, u), bn = z > 0.15 * S.size ? 'chest' : z < -0.3 * S.size ? 'pelvis' : 'spine', k = 0.7 + 0.45 * Math.sin(u * PI);
      for (const sx of (scute ? [-1, 1] : [0])) { const pl = new THREE.Mesh(sg, kera); if (scute) { pl.rotation.set(-0.12, 0, sx * 0.42); } else { pl.rotation.x = -1.95; } pl.scale.setScalar(k); at(bn, pl, [sx * R2.sz * 0.3, top(z) - R2.sz * (scute ? 0.42 : 0.08), z]); } }
    for (let i = 0; i < (R2.tail || 0); i++) { const tb = B[B.idx['tail' + i]], r = lerp(S.tail.r0, S.tail.r1, i / S.tail.n); for (const sx of (scute ? [-1, 1] : [0])) { const pl = new THREE.Mesh(sg, kera); if (scute) pl.rotation.set(-0.1, 0, sx * 0.5); else pl.rotation.x = -1.9; pl.scale.setScalar(Math.max(0.25, 0.75 - i * 0.12)); at('tail' + i, pl, [tb.head[0] + sx * r * 0.35, tb.head[1] + r * 0.8, tb.head[2]]); } }
  }
  const axes = B.map((b) => new THREE.Vector3(b.end[0] - b.head[0], b.end[1] - b.head[1], b.end[2] - b.head[2]).normalize());
  const lens = B.map((b) => Math.hypot(b.end[0] - b.head[0], b.end[1] - b.head[1], b.end[2] - b.head[2]));
  return { mesh, bones, K, S, B, axes, lens };
};
/* rotate bone so its rest axis points along world direction d */
BEAST.aim = function (bone, axisLocal, d) {
  const wq = bone.getWorldQuaternion(_bq1), cur = _ba1.copy(axisLocal).applyQuaternion(wq).normalize(), dn = _ba2.copy(d).normalize();
  const dq = _bq2.setFromUnitVectors(cur, dn), pq = bone.parent.getWorldQuaternion(_bq3).invert();
  bone.quaternion.copy(pq.multiply(dq.multiply(wq))); bone.updateMatrixWorld(true);
};
/* two-bone IK: U, L bones (lengths a, b) so L's end reaches T; bend toward `pole` */
BEAST.ik2 = function (U, L, axU, axL, a, b, T, pole) {
  const Q = _bi, S = U.getWorldPosition(Q[0]), d = Q[1].subVectors(T, S); let dist = d.length(); const mx = (a + b) * 0.998, mn = Math.abs(a - b) + 1e-3;
  dist = clamp(dist, mn, mx); d.normalize();
  const bend = Q[2].copy(pole).addScaledVector(d, -pole.dot(d)); if (bend.lengthSq() < 1e-8) bend.set(0, 1, 0); bend.normalize();
  const ca = clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const Kp = Q[3].copy(S).addScaledVector(d, ca * a).addScaledVector(bend, sa * a);
  const Tc = Q[4].copy(S).addScaledVector(d, dist);
  BEAST.aim(U, axU, Q[5].subVectors(Kp, S));
  BEAST.aim(L, axL, Q[5].subVectors(Tc, L.getWorldPosition(Q[0])));
};
/* ---------------------------------------------------------------- templates for ENEMY.TYPES (empty humanoid rig: the Actor base needs one, the beast draws itself) */
BEAST.tpl = function () {
  if (CHAR.T.__beast) return CHAR.T.__beast;
  const J = RIG.joints({ height: 1, shoulders: 1 }), def = RIG.def(J);
  return (CHAR.T.__beast = { name: '__beast', J, def, parts: [], attach: [], grip: null, cloth: null });
};
{ const _tp = ENEMY.tplOf; ENEMY.tplOf = function (n) { if (n === '__beast') return BEAST.tpl(); return _tp(n); }; }
{ const _sp = ENEMY.spawn; ENEMY.spawn = function (type, x, z, o) { const D = ENEMY.TYPES[type]; if (D && D.cls && !(o && o.cls)) o = Object.assign({}, o, { cls: D.cls }); return _sp(type, x, z, o); }; }
/* ---------------------------------------------------------------- the creature */
const LEGS4 = ['FL', 'FR', 'HL', 'HR'];
class Beast extends Enemy {
  constructor(type, o) {
    super(type, Object.assign({}, o, { noMo: true }));
    const D = this.D, Bd = D.beast; this.Bd = Bd;
    const I = this.rig = BEAST.instance(Bd.model), S = this.S = I.S; this.root.add(I.mesh); this.inst.mo = null;
    this.r = Bd.r; this.h = Bd.h; this.ext = S.size * 1.2; this.step = Math.max(0.45, S.size * 0.25); this.bs = 'idle'; this.bsT = 0; this.atk = null; this.breath = rnd(0, 6); this.dmgK = 1;
    if (o.team) this.team = o.team;
    const bi = I.B.idx; this.bi = bi;
    // legs: rest foot points (body frame), plant state
    this.legs = LEGS4.map((L, i) => { const f = I.B[bi[L + 'f']]; return { L, i, front: L[0] === 'F', foot: new THREE.Vector3(f.end[0], 0, f.end[2]), plant: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), sw: false, st: 0, dur: 0.3, lastPh: 0,
      wristOff: new THREE.Vector3(f.head[0] - f.end[0], f.head[1] - f.end[1], f.head[2] - f.end[2]), U: I.bones[bi[L + 'u']], Lo: I.bones[bi[L + 'l']], F: I.bones[bi[L + 'f']], aU: I.axes[bi[L + 'u']], aL: I.axes[bi[L + 'l']], aF: I.axes[bi[L + 'f']], la: I.lens[bi[L + 'u']], lb: I.lens[bi[L + 'l']] }; });
    this.gaitPh = rnd(0, 1); this.tailV = new Float32Array(S.tail.n * 2); this.yawPrev = this.yaw; this.turnK = 0; this.lookYawB = 0; this.lookPitchB = 0; this.planted = false;
    this.animate(0.016); this.pose3D(0.016);
  }
  /* --- the humanoid layers are inert */
  play() { return null; } stop() {} setBase(n) { this.base = n; } flinch() {} aimOverride() {} postPose() {}
  caps() { return this.capsW || null; }   // world capsules [ax,ay,az,bx,by,bz,r] for blade hits on long bodies (COMBAT.sweep)
  head(out) { return this.rig ? this.rig.bones[this.bi.head].getWorldPosition(out || V3()) : (out || V3()).set(this.x, this.y + 1, this.z); }
  chest(out) { return this.rig ? this.rig.bones[this.bi.chest].getWorldPosition(out || V3()) : (out || V3()).set(this.x, this.y + 0.8, this.z); }
  target() {
    if (this.team !== 'foe') { let best = null, bd = 30; for (const e of COMBAT.foes()) { const d = this.dist(e); if (d < bd) { bd = d; best = e; } } return best; }
    const P = PLAYER.a; return P && P.alive ? P : null;
  }
  /* --- brains */
  think(dt) {
    const D = this.D, Bd = this.Bd, T = this.target(); this.bsT += dt;
    if (this.passive || !T) { this.vx *= 0.85; this.vz *= 0.85; this.bs = 'idle'; return; }
    const d = this.dist(T);
    if (!this.alerted) { this.vx *= 0.8; this.vz *= 0.8; if (this.team !== 'foe' || d < (Bd.sense || 14) || (d < 22 && this.seesPlayer(22))) this.alert(); return; }
    this.graceT -= dt; if (this.graceT > 0) { this.vx *= 0.9; this.vz *= 0.9; this.yaw = dampA(this.yaw, this.angTo(T), 3, dt); return; }
    if (this.atk) { this.runAtk(dt, T, d); return; }
    if (this.bs === 'recover') { this.vx *= 0.88; this.vz *= 0.88; if (this.bsT > (this.recoverT || 0.8)) this.bs = 'engage'; return; }
    if (this.bs === 'flee') { const ax = this.x - T.x, az = this.z - T.z, L = Math.hypot(ax, az) || 1; this.vx = damp(this.vx, ax / L * D.speed * 1.15, 5, dt); this.vz = damp(this.vz, az / L * D.speed * 1.15, 5, dt); this.yaw = dampA(this.yaw, Math.atan2(ax, az), 6, dt); if (this.bsT > 2.5 || d > 20) this.bs = 'engage'; return; }
    if (this.hp < this.hpMax * (Bd.flee || 0) && this.team === 'foe' && !this.fled) { this.fled = true; this.bs = 'flee'; this.bsT = 0; return; }
    this.bs = 'engage';
    const ai = Bd.ai; this.yaw = dampA(this.yaw, this.angTo(T), ai === 'charger' || ai === 'heavy' ? 3 : 6, dt);
    const ax = (T.x - this.x) / (d || 1), az = (T.z - this.z) / (d || 1);
    let fx = 0, fz = 0, spd = D.speed;
    if (ai === 'swarm') { fx = ax; fz = az; if (d < 1.2) { fx = fz = 0; } this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rnd(0.8, 1.8); } fx += -az * this.strafe * 0.4; fz += ax * this.strafe * 0.4; }
    else if (ai === 'ambusher') { const ring = 7.5; if (d > ring + 2) { fx = ax; fz = az; } else if (d < ring - 2.5) { fx = -ax * 0.6; fz = -az * 0.6; } else { fx = -az * this.strafe; fz = ax * this.strafe; } this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rnd(1.5, 3.2); } spd = D.speed * (d < ring + 2 ? 0.45 : 1); }
    else if (ai === 'charger') { if (d > 10) { fx = ax; fz = az; spd = D.speed * 0.6; } }
    else { fx = ax; fz = az; if (d < Bd.keep) { fx = fz = 0; } spd = D.speed; }
    const L = Math.hypot(fx, fz); this.vx = damp(this.vx, L ? fx / L * spd : 0, 4, dt); this.vz = damp(this.vz, L ? fz / L * spd : 0, 4, dt);
    this.atkCd = (this.atkCd === undefined ? rnd(0.4, 1.2) : this.atkCd) - dt;
    if (this.atkCd <= 0 && d < Bd.reach + 6) for (const A of Bd.attacks) { if (d >= A.min && d <= A.max && (!A.when || A.when(this, d, T)) && (A.w === undefined || RNG() < A.w)) { if (A.token && !COMBAT.wantToken('melee', this, A.token)) continue; this.startAtk(A, T); break; } }
  }
  startAtk(A, T) { this.atk = { A, t: 0, hit: false, dir: this.angTo(T), go: false }; this.bs = 'atk'; this.vx *= 0.3; this.vz *= 0.3; }
  runAtk(dt, T, d) {
    const k = this.atk, A = k.A; k.t += dt;
    if (k.t < A.wind) { this.yaw = dampA(this.yaw, this.angTo(T), A.track === undefined ? 5 : A.track, dt); k.dir = this.yaw; this.vx *= 0.8; this.vz *= 0.8; return; }
    if (A.kind === 'leap' || A.kind === 'charge') {
      if (!k.go) { k.go = true; k.sx = this.x; k.sz = this.z; this.vx = Math.sin(k.dir) * A.speed; this.vz = Math.cos(k.dir) * A.speed; if (A.kind === 'leap') { this.vy = A.lift; this.grounded = false; } }
      if (A.kind === 'charge') { this.vx = damp(this.vx, Math.sin(k.dir) * A.speed, 8, dt); this.vz = damp(this.vz, Math.cos(k.dir) * A.speed, 8, dt); if (this.hitWall) { this.hitWall = null; k.crash = true; } }
      if (!k.hit && this.strikeHit(T, A)) k.hit = true;
      const run = Math.hypot(this.x - k.sx, this.z - k.sz);
      if ((k.t > A.wind + A.act && (A.kind !== 'leap' || this.grounded)) || (A.kind === 'charge' && (run > A.dist || k.crash))) this.endAtk(k.crash ? 1.7 : A.rec, k.crash);
      return;
    }
    this.vx *= 0.8; this.vz *= 0.8;
    if (A.kind === 'bite' && k.t > A.wind && k.t < A.wind + A.act * 0.5) { this.vx += Math.sin(k.dir) * dt * A.lunge; this.vz += Math.cos(k.dir) * dt * A.lunge; }
    if (!k.hit && k.t >= A.wind + (A.hitAt || 0.05)) { k.hit = true; this.strikeHit(T, A); if (PLAYER.a && this.dist(PLAYER.a) < 16) FX.addShake(A.shake || 0.06); }
    if (k.t > A.wind + A.act) this.endAtk(A.rec);
  }
  endAtk(rec, stunned) { COMBAT.freeToken('melee', this); this.atk = null; this.bs = 'recover'; this.bsT = 0; this.recoverT = rec; this.atkCd = rnd(0.6, 1.4) * (this.Bd.ai === 'swarm' ? 0.6 : 1);
    if (stunned) { this.stunB = 1.7; FX.puff(V3(this.x, this.y + 0.5, this.z), 7, { size: 0.6, col: [0.45, 0.4, 0.35], a: 0.4, spread: 1.4, life: 1.2 }); FX.addShake(0.3); } }
  strikeHit(T, A) {
    if (!T || !T.alive) return false; const reach = A.range + T.r + this.S.size * 0.25;
    const hp = this.head(_bv1), d = Math.min(this.dist(T), Math.hypot(T.x - hp.x, T.z - hp.z) + this.S.size * 0.2); if (d > reach || Math.abs(T.y - this.y) > 2.2 + this.h * 0.5) return false;
    const ang = Math.abs(wrapA(this.angTo(T) - this.yaw)); if (A.arc < PI && ang > A.arc * 0.5) return false;
    const dir = V3(T.x - this.x, 0, T.z - this.z).normalize(), info = { src: this, kind: 'melee', dir, beast: true };
    if (A.knock) { info.knock = true; info.force = A.knock; }
    COMBAT.damage(T, A.dmg * this.dmgK, info); return true;
  }
  /* --- reactions */
  onHit(info) {
    this.alert(); this.hurtT = 0.3; this.hurtDir = info.dir ? Math.atan2(info.dir.x, info.dir.z) - this.yaw : 0; const Bd = this.Bd;
    if (this.atk && !this.atk.go && this.atk.t < this.atk.A.wind * 0.6 && !Bd.noInterrupt && (info.heavy || info.knock || info.force)) { this.atk = null; COMBAT.freeToken('melee', this); }
    const heavy = info.knock || info.force || info.heavy || info.kind === 'slam' || info.kind === 'plunge' || info.kind === 'sweep';
    if (heavy && !Bd.heavy) { const d = info.dir || V3(0, 0, 1), f = (info.force || 5) * (Bd.knockK || 1); this.vx = d.x * f; this.vz = d.z * f; this.vy = 2.2 * (Bd.knockK || 1); this.grounded = false; this.bs = 'recover'; this.bsT = 0; this.recoverT = 0.7; this.atk = null; }
    else if (heavy && Bd.heavy && (info.kind === 'slam' || info.kind === 'plunge' || (info.force || 0) > 6)) { this.stunB = 1.2; this.atk = null; this.bs = 'recover'; this.bsT = 0; this.recoverT = 1.2; }
    else if (info.dir && !Bd.heavy) { this.vx += info.dir.x * 1.5; this.vz += info.dir.z * 1.5; }
  }
  onDamage(amt, info) {
    const Bd = this.Bd; let k = 1;
    if (Bd.armor !== undefined) { const heavy = info.heavy || info.knock || info.kind === 'slam' || info.kind === 'plunge' || info.kind === 'exec' || info.kind === 'push' || info.kind === 'grip' || info.kind === 'throw'; k = heavy ? 1 : Bd.armor; }
    if (this.stunB > 0) k *= 1.8; return amt * k;
  }
  onGrip() { this.gripped = true; this.gy0 = this.y; this.vx = this.vz = 0; this.atk = null; COMBAT.freeToken('melee', this); }
  gripUpdate(dt) { this.stT += dt; this.y = damp(this.y, this.gy0 + Math.min(1.2, 2.4 / this.S.size), 5, dt); this.vy = 0; this.grounded = false; this.animate(dt); this.pose3D(dt); }
  onGripThrow(v) { this.gripped = false; this.vx = v.x; this.vz = v.z; this.vy = v.y; this.bs = 'recover'; this.recoverT = 0.9; }
  onExec() {} onParried() {}
  onDie(info) {
    COMBAT.freeToken('melee', this); this.gripped = false; this.atk = null; this.dieSide = RNG() < 0.5 ? 1 : -1;
    const d = info.dir; if (d) { const f = (info.knock || info.heavy ? 4 : 1.6) / Math.max(1, this.S.size * 0.6); this.vx = d.x * f; this.vz = d.z * f; }
    if (info.src && info.src.isPlayer && (info.heavy || info.kind === 'exec')) { MG.hitStop = Math.max(MG.hitStop, 0.1); FX.addShake(0.25); }
    FX.puff(this.chest(V3()), 5, { size: 0.5 * this.S.size, col: [0.35, 0.08, 0.06], a: 0.35, spread: 0.9, life: 0.9 });
  }
  vanish() { this.gone = true; this.hidden = true; this.alive = false; this.root.visible = false; }
  update(dt) { this.stunB = Math.max(0, (this.stunB || 0) - dt); this.hurtT = Math.max(0, (this.hurtT || 0) - dt); super.update(dt); }
  /* --- procedural motion: everything happens in pose3D (needs world matrices); animate only advances clocks */
  animate(dt) { if (!this.rig) return; this.breath += dt * (this.alive ? 1.6 : 0); this.adt = dt; }
  pose3D(dt) {
    this.syncRoot(); if (!this.rig) return;
    const cd = R.camera.position.distanceTo(_bv1.set(this.x, this.y, this.z)); this.lodN = (this.lodN || 0) + 1; this.lodDt = (this.lodDt || 0) + dt;
    if (cd > 32 && this.lodN % 4 !== 0 && this.planted) return;   // far away: pose at quarter rate
    dt = this.lodDt; this.lodDt = 0;
    const I = this.rig, S = this.S, bo = I.bones, bi = this.bi, sz = S.size, G = S.gait, alive = this.alive;
    for (const b of bo) b.quaternion.identity();
    bo[bi.root].position.set(S.mid[0], S.mid[1], S.mid[2]);
    const sp = this.grounded ? Math.hypot(this.vx, this.vz) : 0, run = sp / G.run;
    const turn = wrapA(this.yaw - this.yawPrev) / Math.max(1e-3, dt); this.yawPrev = this.yaw; this.turnK = damp(this.turnK, clamp(turn, -3, 3), 6, dt);
    const A = this.atk, aT = A ? A.t : 0, wind = A ? A.A.wind : 1, u = A ? sat(aT / wind) : 0, act = A && aT > wind ? sat((aT - wind) / Math.max(0.05, A.A.act)) : 0, kind = A ? A.A.kind : '';
    // ---- body pose: bob, pitch, roll; attacks and states add on top
    let bodyY = 0, pitch = 0, roll = 0, yawB = 0, neckP = 0, headP = 0, jaw = 0.05 + 0.03 * Math.sin(this.breath * 2.2), lunge = 0, tailWhip = 0, frontLift = 0;
    const deadT = alive ? 0 : sat((this.deadT || 0) / 0.85);
    if (alive) {
      bodyY = -Math.abs(Math.sin(this.gaitPh * TAU * 2)) * G.stepH * 0.35 * sat(run * 2) + Math.sin(this.breath) * sz * 0.004;
      pitch = -sat(run - 0.6) * 0.06; roll = -this.turnK * 0.05 * sat(run * 2); yawB = this.turnK * 0.08;
      if (A) {
        if (kind === 'bite') { neckP = u < 1 ? -0.35 * u : 0.45 * Math.sin(act * PI); headP = u < 1 ? -0.25 * u : 0.3 * Math.sin(act * PI); jaw = u < 1 ? 0.75 * u : 0.75 * (1 - act); pitch += u < 1 ? -0.05 * u : 0.08 * Math.sin(act * PI); }
        else if (kind === 'swipe') { frontLift = u < 1 ? u : 1 - act; pitch += u < 1 ? -0.22 * u : -0.22 + 0.4 * act; jaw = 0.55 * (u < 1 ? u : 1 - act); neckP = -0.15 * frontLift; }
        else if (kind === 'leap') { if (u < 1) { bodyY -= sz * 0.13 * u; pitch -= 0.12 * u; neckP = -0.2 * u; } else if (!this.grounded) { pitch = 0.12 - 0.3 * act; jaw = 0.9; neckP = 0.2; } }
        else if (kind === 'charge') { neckP = 0.55 * u; headP = 0.25 * u; pitch += 0.05 * u; jaw = 0.05; }
        else if (kind === 'sweep') { yawB += (u < 1 ? -0.4 * u : -0.4 + 1.0 * act); tailWhip = u < 1 ? -0.6 * u : -0.6 + 2.0 * Math.sin(act * PI); jaw = 0.5; }
      }
      if (this.hurtT > 0) { const h2 = Math.sin(sat(this.hurtT / 0.3) * PI); roll += Math.sin(this.hurtDir || 0) * 0.12 * h2; pitch -= 0.08 * h2; }
      if (this.stunB > 0) { neckP += 0.35; headP += 0.2; bodyY -= sz * 0.03; jaw = 0.3; }
      if (this.gripped) { roll = Math.sin(MG.rt * 7) * 0.15; jaw = 0.7 + 0.2 * Math.sin(MG.rt * 13); neckP = -0.3; }
    } else { roll = deadT * 1.38 * this.dieSide; bodyY = -deadT * (S.mid[1] - S.body.rib[1][0] * 1.05); neckP = 0.25 * deadT; jaw = 0.55 * deadT; }
    // head tracking toward the target (yaw/pitch shared down the neck)
    const T = alive ? this.target() : null; let ly = 0, lp = 0;
    if (T) { const hp = this.head(_bv1); ly = clamp(wrapA(Math.atan2(T.x - hp.x, T.z - hp.z) - this.yaw), -1.0, 1.0); lp = clamp(Math.atan2((T.y + 1.0) - hp.y, Math.hypot(T.x - hp.x, T.z - hp.z)), -0.5, 0.4); }
    this.lookYawB = damp(this.lookYawB, ly, 4, dt); this.lookPitchB = damp(this.lookPitchB, -lp, 4, dt);
    const R0 = bo[bi.root]; R0.position.y += bodyY; R0.position.z += lunge; R0.rotation.set(pitch, 0, roll);
    bo[bi.spine].rotation.set(0, yawB * 0.5, 0); bo[bi.chest].rotation.set(-frontLift * 0.35, yawB * 0.5, 0); bo[bi.pelvis].rotation.set(0, -yawB * 0.4, 0);
    const nk = (a) => bo[bi[a]].rotation; nk('neck1').set(neckP * 0.5 + this.lookPitchB * 0.3, this.lookYawB * 0.3, 0); nk('neck2').set(neckP * 0.3 + this.lookPitchB * 0.3, this.lookYawB * 0.3, 0); nk('head').set(headP + this.lookPitchB * 0.4, this.lookYawB * 0.4, 0);
    nk('jaw').set(jaw, 0, 0);
    // tail: damped spring per segment, lagging the body's turning; droops when dead
    const n = S.tail.n;
    for (let i = 0; i < n; i++) { const tgt = -this.turnK * 0.18 + Math.sin(this.breath * 1.3 - i * 0.6) * 0.1 * (alive ? 1 : 0) + tailWhip * (i + 1) / n * 0.6;
      const v = this.tailV; v[i * 2 + 1] += ((tgt - v[i * 2]) * 22 - v[i * 2 + 1] * 5) * dt; v[i * 2] += v[i * 2 + 1] * dt;
      nk('tail' + i).set(alive ? 0.03 : 0.12 * deadT, v[i * 2] * (0.6 + i * 0.12), 0); }
    // apply rotations (rotation set → quaternion)
    for (const b of bo) b.quaternion.setFromEuler(b.rotation);
    this.root.updateMatrixWorld(true);
    // ---- feet: planted stepping (or tucked in the air / folded when dead)
    const fw = _bv3.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)), up = _bv4.set(0, 1, 0);
    const gaitW = sp < G.run * 0.35 ? 'walk' : (kind === 'charge' || sp > G.run * 0.8) ? 'gallop' : 'trot';
    const OFF = gaitW === 'walk' ? [0.25, 0.75, 0.0, 0.5] : gaitW === 'trot' ? [0.0, 0.5, 0.5, 0.0] : [0.0, 0.12, 0.55, 0.65], duty = gaitW === 'walk' ? 0.62 : gaitW === 'trot' ? 0.5 : 0.38;
    const stride = G.stride * (0.6 + sat(run) * 1.2), cyc = clamp(stride / Math.max(0.2, sp), 0.24, 1.3);
    if (sp > 0.15) this.gaitPh = (this.gaitPh + dt / cyc) % 1;
    const rootW = this.root, gy = (x, z) => { const g = this.gy(x, z); return g === null || g === undefined ? this.y : g; };
    let anySw = false; for (const lg of this.legs) anySw = anySw || lg.sw;
    for (const lg of this.legs) {
      const ideal = rootW.localToWorld(_bv1.copy(lg.foot)); ideal.addScaledVector(_bv2.set(this.vx, 0, this.vz), cyc * duty * 0.5);
      ideal.y = gy(ideal.x, ideal.z);
      if (!this.planted) { lg.plant.copy(ideal); }
      if (!alive || this.gripped || !this.grounded) {   // no planting: feet follow the body (tucked)
        const tuck = !alive ? 0.12 * sz * deadT : (this.gripped ? 0.25 * sz : 0.18 * sz);
        lg.plant.copy(ideal); lg.plant.y = (!alive ? ideal.y + sz * 0.15 : this.y + tuck) ; lg.sw = false;
        if (!alive) { lg.plant.addScaledVector(_bv2.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)), this.dieSide * sz * 0.35 * deadT * (lg.L[1] === 'L' ? -1 : 1) * 0.2); }
      } else if (lg.sw) {
        lg.st += dt / lg.dur; lg.to.copy(ideal);
        if (lg.st >= 1) { lg.sw = false; lg.plant.copy(lg.to); } else { const s = easeIO(lg.st); lg.plant.lerpVectors(lg.from, lg.to, s); lg.plant.y += Math.sin(s * PI) * G.stepH * (0.6 + sat(run)); }
      } else {
        const p = (this.gaitPh + OFF[lg.i]) % 1, lp2 = lg.lastPh; lg.lastPh = p;
        const cross = sp > 0.15 && ((lp2 < duty && p >= duty) || (lp2 > p && duty < 0.05));
        const far = lg.plant.distanceTo(ideal) > G.stride * 0.42;
        if (cross || (sp <= 0.15 && far && !anySw)) { lg.sw = true; lg.st = 0; lg.dur = sp > 0.15 ? cyc * (1 - duty) : 0.24 + sz * 0.05; lg.from.copy(lg.plant); anySw = true; }
      }
    }
    this.planted = true;
    { const c = this.capsW || (this.capsW = [new Float32Array(7), new Float32Array(7), new Float32Array(7)]), w = (k2, a2, b2, r) => { const A2 = bo[bi[a2]].getWorldPosition(_bv5), B2 = b2 === 'snout' ? bo[bi.head].localToWorld(_bv6.set(0, 0, S.head.snR[0] * 0 + this.rig.lens[bi.head])) : bo[bi[b2]].getWorldPosition(_bv6); c[k2][0] = A2.x; c[k2][1] = A2.y; c[k2][2] = A2.z; c[k2][3] = B2.x; c[k2][4] = B2.y; c[k2][5] = B2.z; c[k2][6] = r; };
      w(0, 'pelvis', 'chest', S.body.rib[1][0] * 0.95); w(1, 'chest', 'snout', S.neckR[0] * 0.9); w(2, 'pelvis', 'tail' + Math.min(S.tail.n - 1, 2), S.tail.r0 * 1.1); }
    // attack overrides for the front feet
    if (alive && frontLift > 0) for (const lg of this.legs) if (lg.front) { const f2 = lg.L === 'FL' ? 1 : 0.6; lg.plant.addScaledVector(up, frontLift * sz * 0.35 * f2).addScaledVector(fw, frontLift * sz * 0.25 * f2); }
    // ---- leg IK: wrist/hock target = foot + rest wrist offset (rotated with the body), knee poles (front elbows back, hind knees forward)
    for (const lg of this.legs) {
      const T2 = _bv1.copy(lg.wristOff).applyQuaternion(rootW.quaternion).add(lg.plant);
      const pole = _bv2.copy(fw).multiplyScalar(lg.front ? -1 : 1).addScaledVector(up, 0.15);
      if (!alive) pole.addScaledVector(fw, lg.front ? -0.5 : 0.5);
      BEAST.ik2(lg.U, lg.Lo, lg.aU, lg.aL, lg.la, lg.lb, T2, pole);
      BEAST.aim(lg.F, lg.aF, _bv5.subVectors(lg.plant, lg.F.getWorldPosition(_bv6)));
    }
  }
}
/* ---------------------------------------------------------------- the roster (ENEMY.TYPES) */
Object.assign(ENEMY.TYPES, {
  cannok: { tpl: '__beast', cls: Beast, hp: 22, brain: 'beast', moves: 'melee', dmg: 6, speed: 5.4, name: 'CANNOK', drain: 2, r: 0.3, h: 0.6,
    beast: { model: 'cannok', ai: 'swarm', r: 0.3, h: 0.6, reach: 1.2, sense: 12, flee: 0.25,
      attacks: [{ n: 'bite', kind: 'bite', min: 0, max: 1.7, wind: 0.3, act: 0.24, rec: 0.7, range: 1.1, arc: 1.6, dmg: 6, hitAt: 0.06, shake: 0.03, lunge: 18 }] } },
  maalraa: { tpl: '__beast', cls: Beast, hp: 80, brain: 'beast', moves: 'melee', dmg: 12, speed: 6.4, name: 'MAALRAA', drain: 6, r: 0.48, h: 1.1,
    beast: { model: 'maalraa', ai: 'ambusher', r: 0.48, h: 1.1, reach: 7, sense: 20, flee: 0.15, knockK: 1,
      attacks: [{ n: 'pounce', kind: 'leap', min: 3.5, max: 11, wind: 0.65, act: 0.55, rec: 1.0, speed: 10.5, lift: 4.4, range: 1.4, arc: PI * 2, dmg: 16, knock: 4.5, w: 0.9 },
        { n: 'claw', kind: 'swipe', min: 0, max: 2.3, wind: 0.4, act: 0.3, rec: 0.8, range: 1.7, arc: 1.7, dmg: 11, hitAt: 0.08 }] } },
  boma: { tpl: '__beast', cls: Beast, hp: 190, brain: 'beast', moves: 'melee', dmg: 18, speed: 3.8, name: 'BOMA', drain: 10, r: 0.85, h: 1.9,
    beast: { model: 'boma', ai: 'charger', r: 0.85, h: 1.9, reach: 14, sense: 16, armor: 0.6, knockK: 0.35,
      attacks: [{ n: 'charge', kind: 'charge', min: 5, max: 14, wind: 1.0, act: 1.6, rec: 1.2, speed: 12, dist: 15, range: 1.4, arc: PI * 2, dmg: 22, knock: 7, track: 3 },
        { n: 'gore', kind: 'swipe', min: 0, max: 3.1, wind: 0.5, act: 0.35, rec: 1.0, range: 2.1, arc: 1.5, dmg: 16, knock: 4, hitAt: 0.1 }] } },
  zakkeg: { tpl: '__beast', cls: Beast, hp: 640, brain: 'beast', moves: 'melee', dmg: 24, speed: 3.2, name: 'ZAKKEG', drain: 20, r: 1.2, h: 2.8,
    beast: { model: 'zakkeg', ai: 'heavy', r: 1.2, h: 2.8, reach: 6, keep: 3.2, sense: 22, armor: 0.3, heavy: true, noInterrupt: true,
      attacks: [{ n: 'claw', kind: 'swipe', min: 0, max: 4.4, wind: 0.75, act: 0.4, rec: 1.0, range: 3.4, arc: 1.9, dmg: 22, knock: 5, hitAt: 0.1, shake: 0.18, w: 0.7 },
        { n: 'tail', kind: 'sweep', min: 0, max: 6, wind: 0.95, act: 0.6, rec: 1.3, range: 4.8, arc: PI * 2, dmg: 26, knock: 8, hitAt: 0.15, shake: 0.25, w: 0.5, when: (e, d) => d < 5.5 },
        { n: 'bite', kind: 'bite', min: 2.2, max: 6.5, wind: 0.8, act: 0.5, rec: 1.2, range: 3.6, arc: 1.0, dmg: 30, hitAt: 0.2, shake: 0.2, w: 0.55, lunge: 30 }] } },
});
