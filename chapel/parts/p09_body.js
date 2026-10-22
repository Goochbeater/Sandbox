/* BODY SCULPTS — clothed humanoid bodies as signed-distance sculptures in the rest A-pose, meshed at boot.
   A group carries a material tag; every vertex takes the material of the nearest group. Hands are separate
   finer meshes (gloved or bare fists closed around a grip rod along +Z). */
const SCULPT = {};
SCULPT.it = (list) => { const add = (p, op, k) => list.push({ p, op: op || 'su', k: k || 0.001 }); const both = (p, op, k) => { add(p, op, k); add(SDF.mirror(p), op, k); }; return { add, both }; };
/* fist frame for the left hand: A = down the hand, B = back of the hand, Z = grip axis */
SCULPT.fistFrame = function (J) {
  const W = J.wrist, F = J.fist; let A = V.norm(V.sub(F, W)); const Z = [0, 0, 1];
  A = V.norm(V.sub(A, V.mul(Z, V.dot(A, Z)))); const B = V.norm(V.cross(Z, A));
  const P = (u, w, z) => V.add(W, V.add(V.mul(A, u), V.add(V.mul(B, w), V.mul(Z, z))));
  return { W, A, B, Z, P, rot: [A[0], A[1], A[2], B[0], B[1], B[2], Z[0], Z[1], Z[2]], C: P(0.078, 0, 0) };
};
/* closed fist (left) around a rod; o.glove adds a gauntlet cuff */
SCULPT.fist = function (J, o) {
  o = o || {};
  const s = o.scale || 1, F = SCULPT.fistFrame(J), items = [], { add } = SCULPT.it(items), P = F.P;
  add(SDF.box(P(0.043 * s, 0.003, 0.0), [0.036 * s, 0.021 * s, 0.041 * s], 0.014 * s, F.rot));
  const fingers = [[0.03, 0.0105], [0.01, 0.0112], [-0.01, 0.0106], [-0.029, 0.0092]];
  const Rf = 0.0262 * s, C = [0.079 * s, 0];
  for (const [z, r] of fingers) {
    const pts = [78, 18, -52, -118].map((d) => { const a = d * D2R; return P(C[0] + Math.cos(a) * Rf, C[1] + Math.sin(a) * Rf, z * s); });
    for (let i = 0; i < 3; i++) add(SDF.rcone(pts[i], pts[i + 1], r * s * (1 - i * 0.06), r * s * (1 - (i + 1) * 0.06)), 'su', 0.004);
  }
  // knuckle ridge
  add(SDF.cap(P(0.07 * s, 0.021 * s, 0.03 * s), P(0.07 * s, 0.02 * s, -0.028 * s), 0.0105 * s), 'su', 0.008);
  // thumb wraps over the front of the rod on the palm side
  add(SDF.rcone(P(0.018 * s, -0.016 * s, 0.03 * s), P(0.055 * s, -0.027 * s, 0.047 * s), 0.0135 * s, 0.0115 * s), 'su', 0.01);
  add(SDF.rcone(P(0.055 * s, -0.027 * s, 0.047 * s), P(0.083 * s, -0.012 * s, 0.047 * s), 0.0115 * s, 0.0098 * s), 'su', 0.005);
  // wrist
  add(SDF.rcone(P(0.0, 0.0, 0.0), P(-0.05, 0, 0), 0.03 * s, 0.032 * s), 'su', 0.012);
  if (o.glove) {
    const gl = o.gauntlet || 0.07, gr = o.gauntletR || 0.039;
    add(SDF.rcone(P(-0.005, 0, 0), P(-gl, 0, 0), 0.032 * s, gr * s), 'su', 0.008);            // gauntlet, a flare up the forearm
    add(SDF.rcone(P(-gl + 0.004, 0, 0), P(-gl - 0.004, 0, 0), (gr + 0.0015) * s, (gr + 0.0015) * s), 'su', 0.004);   // stitched cuff edge
    if (o.gauntlet) add(SDF.cap(P(-0.03, 0.03, -0.012), P(-0.03, 0.03, 0.012), 0.006 * s), 'su', 0.004);   // strap stud
  }
  return items;
};
/* ------------------------------------------------------------------ generic clothed humanoid
   o: { bulk, chestR, waist, collar:'high'|'low'|'none', lapel, belt:{h, r}, sleeve:[r0,r1], cuff, trouser:[r0,r1],
        boots:true|false, bootTop, mats:{torso, arms, belt, legs, boots, collar}, extra(items helpers) } */
SCULPT.humanoid = function (J, o) {
  o = o || {};
  const G = [], bk = o.bulk || 1, mats = Object.assign({ torso: 'tunic', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'leather', collar: 'tunic', hips: 'tunic' }, o.mats || {});
  const grp = (name, mat, k) => { const items = []; const g = { name, items, op: 'su', k: k || 0.02, mat }; G.push(g); return Object.assign(SCULPT.it(items), { g }); };
  const cy = J.chest[1], sy = J.shoulder[1], py = J.pelvis[1];
  // ---- torso
  const T = grp('torso', mats.torso, 0.03);
  T.add(SDF.ell([0, cy + 0.035, 0.005], [0.15 * bk, 0.155, 0.11 * bk]));
  T.add(SDF.ell([0, cy - 0.08, 0.0], [0.142 * bk, 0.13, 0.1 * bk]), 'su', 0.06);
  T.add(SDF.ell([0, py + 0.12, 0.01], [0.13 * bk * (o.waist || 1), 0.1, 0.095 * bk * (o.belly || 1)]), 'su', 0.05);
  T.add(SDF.ell([0, cy + 0.06, -0.045], [0.15 * bk, 0.12, 0.075 * bk]), 'su', 0.05);
  T.add(SDF.ell([0, cy + 0.06, 0.03 * bk], [0.14 * bk, 0.075, 0.082 * bk]), 'su', 0.05);   // one broad chest plane (two lobes read as a bust)
  T.both(SDF.ell([0.1 * bk, cy - 0.03, -0.03], [0.07 * bk, 0.13, 0.07 * bk]), 'su', 0.05);
  T.both(SDF.cap([0.04, sy + 0.048, -0.032], [0.15 * bk, sy + 0.014, -0.03], 0.046 * bk), 'su', 0.05);
  T.both(SDF.ell([J.shoulder[0] + 0.0, sy - 0.03, J.shoulder[2] + 0.005], [0.056 * bk, 0.07, 0.062 * bk]), 'su', 0.045);
  if (o.lapel) {   // wrap-over front: an inflated copy of the torso, kept on one side of the diagonal (collar → opposite hip)
    const P1 = [0.08 * bk, sy + 0.0], P2 = [-0.115 * bk, py + 0.1], L = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
    let nx = -(P2[1] - P1[1]) / L, ny = (P2[0] - P1[0]) / L; if (nx < 0) { nx = -nx; ny = -ny; }
    const mx = (P1[0] + P2[0]) / 2, my = (P1[1] + P2[1]) / 2, hs = 0.4, inf = 0.0085;
    const W = grp('wrap', mats.torso, 0.002);
    W.add(SDF.ell([0, cy + 0.035, 0.005], [0.15 * bk + inf, 0.155 + inf, 0.11 * bk + inf]));
    W.add(SDF.ell([0, cy - 0.08, 0.0], [0.142 * bk + inf, 0.13, 0.1 * bk + inf]), 'su', 0.06);
    W.add(SDF.ell([0, py + 0.12, 0.01], [0.13 * bk * (o.waist || 1) + inf, 0.1, 0.095 * bk * (o.belly || 1) + inf]), 'su', 0.05);
    W.add(SDF.ell([0, cy + 0.06, 0.03 * bk], [0.14 * bk + inf, 0.075, 0.082 * bk + inf]), 'su', 0.05);
    W.add(SDF.box([mx + nx * hs, my + ny * hs, 0.22], [hs, 0.6, 0.22], 0.0, SDF.rot(0, 0, Math.atan2(ny, nx) / D2R)), 'si', 0.003);
    W.add(SDF.box([0, (sy + 0.02 + py + 0.03) / 2, 0.22], [0.4, (sy + 0.02 - py - 0.03) / 2, 0.22], 0.0), 'si', 0.01);
  }
  if (o.tabard) {   // raised front + back tabard strips over the tunic
    T.add(SDF.box([0, cy - 0.02, 0.098 * bk], [0.075, 0.2, 0.012], 0.008, SDF.rot(8, 0, 0)), 'su', 0.02);
    T.add(SDF.box([0, cy - 0.01, -0.105 * bk], [0.085, 0.21, 0.012], 0.008, SDF.rot(-6, 0, 0)), 'su', 0.02);
  }
  // ---- collar
  if (o.collar === 'high') {
    const C = grp('collar', mats.collar, 0.015);
    C.add(SDF.rcone([0, sy - 0.015, -0.014], [0, J.head[1] - 0.018, -0.004], 0.09, 0.069));
    C.add(SDF.rcone([0, J.head[1] - 0.03, -0.004], [0, J.head[1] - 0.012, -0.003], 0.073, 0.072), 'su', 0.006);
    C.add(SDF.ell([0, sy + 0.005, 0.0], [0.11, 0.035, 0.1]), 'su', 0.035);
  } else if (o.collar === 'low') {
    const C = grp('collar', mats.collar, 0.015);
    C.add(SDF.ell([0, sy + 0.005, -0.01], [0.085, 0.035, 0.085]), 'su', 0.03);
  }
  // ---- arms (sleeves)
  const A = grp('arms', mats.arms, 0.025);
  const sl = o.sleeve || [0.056, 0.047, 0.041];
  A.both(SDF.rcone(J.shoulder, J.elbow, sl[0] * bk, sl[1] * bk));
  A.both(SDF.ell(V.lerp(J.shoulder, J.elbow, 0.45), [0.05 * bk, 0.08, 0.05 * bk], SDF.rotAlong(V.sub(J.elbow, J.shoulder))), 'su', 0.03);
  A.both(SDF.rcone(J.elbow, V.lerp(J.elbow, J.wrist, 0.92), sl[1] * bk, sl[2] * bk), 'su', 0.02);
  if (o.cuff) A.both(SDF.rcone(V.lerp(J.elbow, J.wrist, 0.55), V.lerp(J.elbow, J.wrist, 0.93), sl[2] * bk * 1.02, o.cuff * bk), 'su', 0.02);
  // ---- belt
  if (o.belt !== false) {
    const bl = o.belt || {}, bh = bl.h || 0.047, by = py + (bl.y || 0.055);
    const B = grp('belt', bl.obi ? mats.torso : mats.belt, 0.006);
    B.add(SDF.ell([0, by, 0.004], [(bl.r || 0.153) * bk, 0.35, (bl.rz || 0.12) * bk]));
    B.add(SDF.box([0, by, 0], [0.4, bh, 0.4], 0.0), 'si', 0.012);
    if (bl.obi) for (const [dy, dr] of [[-bh * 0.55, 0.004], [0, 0.007], [bh * 0.5, 0.004]]) B.add(SDF.ell([0, by + dy, 0.004], [(bl.r || 0.153) * bk + dr, 0.012, (bl.rz || 0.12) * bk + dr]), 'su', 0.008);   // wrapped pleats
    if (bl.sash) { B.add(SDF.ell([0, by - 0.005, 0.01], [(bl.r || 0.153) * bk + 0.008, 0.02, (bl.rz || 0.12) * bk + 0.008]), 'su', 0.01); }
    // a narrower strap belt over it, a buckle, and (Jedi, troopers) pouches round the back
    const br = (bl.r || 0.153) * bk + (bl.obi ? 0.009 : 0), brz = (bl.rz || 0.12) * bk + (bl.obi ? 0.009 : 0), y2 = by - bh * (bl.obi ? 0.62 : 0.35);
    const B2 = grp('belt2', bl.strapMat || mats.belt, 0.002);
    B2.add(SDF.ell([0, y2, 0.004], [br + 0.011, 0.35, brz + 0.011])); B2.add(SDF.box([0, y2, 0], [0.4, 0.0115, 0.4], 0.0), 'si', 0.003);
    const Bk = grp('buckle', 'extra', 0.002);
    Bk.add(SDF.box([0, y2, brz + 0.016], [0.026, 0.019, 0.006], 0.004));
    Bk.add(SDF.box([0, y2, brz + 0.022], [0.016, 0.01, 0.004], 0.002), 'ss', 0.002);
    if (bl.pouches) for (const a of [62, 100, 138, -62, -100, -138]) { const r = a * D2R, px = Math.sin(r) * (br + 0.02), pz = Math.cos(r) * (brz + 0.02);
      B2.add(SDF.box([px, y2 - 0.012, pz], [0.024, 0.03, 0.014], 0.006, SDF.rot(0, a, 0)), 'su', 0.004); B2.add(SDF.box([px, y2 + 0.014, pz], [0.026, 0.008, 0.017], 0.004, SDF.rot(0, a, 0)), 'su', 0.003); }
  }
  // ---- hips + legs
  const H = grp('hips', mats.hips, 0.03);
  H.add(SDF.ell([0, py - 0.03, 0.0], [0.15 * bk, 0.1, 0.108 * bk]));
  const L = grp('legs', mats.legs, 0.03);
  const tr = o.trouser || [0.082, 0.058];
  L.both(SDF.rcone(J.hip, J.knee, tr[0] * bk, tr[1] * bk));
  L.both(SDF.ell(V.lerp(J.hip, J.knee, 0.45), [0.068 * bk, 0.14, 0.07 * bk], SDF.rotAlong(V.sub(J.knee, J.hip))), 'su', 0.04);
  L.both(SDF.sph(J.knee, tr[1] * 0.95 * bk), 'su', 0.02);
  const bootTop = o.bootTop || 0.47;
  const kneeB = [J.knee[0] + 0.002, bootTop, J.knee[2] - 0.018];
  if (o.boots !== false) {
    L.both(SDF.rcone(J.knee, kneeB, tr[1] * bk, 0.054 * bk), 'su', 0.02);
    const Bt = grp('boots', mats.boots, 0.012);
    Bt.both(SDF.rcone(kneeB, J.ankle, 0.057 * bk, 0.046 * bk));
    Bt.both(SDF.ell([J.ankle[0] - 0.004, (bootTop + J.ankle[1]) * 0.55, J.ankle[2] - 0.012], [0.05 * bk, 0.09, 0.05 * bk]), 'su', 0.03);
    Bt.both(SDF.rcone(kneeB, V.add(kneeB, [0, -0.028, 0]), 0.063 * bk, 0.06 * bk), 'su', 0.004);
    SCULPT.feet(Bt, J, bk);
  } else {
    L.both(SDF.rcone(J.knee, J.ankle, tr[1] * bk, 0.05 * bk), 'su', 0.02);
    const Bt = grp('boots', mats.boots, 0.012);
    SCULPT.feet(Bt, J, bk);
  }
  if (o.tabards) {   // Jedi tabards: a strip over each shoulder, down the chest and the back to the belt (crisp overlay layer)
    const inf = 0.011;
    for (const sx of [1, -1]) {
      const Tb = grp(sx > 0 ? 'tabardL' : 'tabardR', o.tabards, 0.002); Tb.g.layer = 'tabards';
      Tb.add(SDF.ell([0, cy + 0.035, 0.005], [0.15 * bk + inf, 0.155 + inf, 0.11 * bk + inf]));
      Tb.add(SDF.ell([0, cy - 0.08, 0.0], [0.142 * bk + inf, 0.13, 0.1 * bk + inf]), 'su', 0.06);
      Tb.add(SDF.ell([0, py + 0.12, 0.01], [0.13 * bk * (o.waist || 1) + inf, 0.1, 0.095 * bk * (o.belly || 1) + inf]), 'su', 0.05);
      Tb.add(SDF.ell([0, cy + 0.06, 0.03 * bk], [0.14 * bk + inf, 0.075, 0.082 * bk + inf]), 'su', 0.05);
      Tb.add(SDF.cap([0.04 * sx, sy + 0.048, -0.032], [0.15 * bk * sx, sy + 0.014, -0.03], 0.046 * bk + inf), 'su', 0.05);
      Tb.add(SDF.box([sx * 0.078 * bk, (sy + 0.07 + py + 0.02) / 2, 0], [0.036 * bk, (sy + 0.07 - py - 0.02) / 2, 0.3], 0.004), 'si', 0.004);
    }
  }
  if (o.extra) o.extra(grp, J);
  if (mats.torso !== mats.arms) {
    // a vest / jerkin / armour worn OVER a shirt: the shirt torso stays in the blended body (sleeve material) and the
    // torso garment becomes its own layer, so the armholes and neckline get clean edges instead of a ragged material seam
    const T0 = G.find((g) => g.name === 'torso'), shirt = { name: 'shirt', items: T0.items.map((it) => ({ p: it.p, op: it.op, k: it.k })), op: 'su', k: 0.03, mat: mats.arms };
    for (const g of G) if (g.name === 'torso' || g.name === 'wrap' || g.name === 'pads' || g.name === 'armor') g.layer = 'vest';
    const inf = (p) => p.t === 'ell' ? Object.assign({}, p, { r: p.r.map((q) => q + 0.006) }) : p.t === 'rc' ? Object.assign({}, p, { ra: p.ra + 0.006, rb: p.rb + 0.006 }) : p.t === 'box' ? Object.assign({}, p, { h: p.h.map((q) => q + 0.006) }) : p;
    T0.items = T0.items.map((it) => ({ p: inf(it.p), op: it.op, k: it.k }));
    G.push(shirt);
  }
  return G;
};
SCULPT.feet = function (Bt, J, bk) {
  const a = J.ankle, t = J.toe;
  Bt.both(SDF.ell([a[0] + 0.003, 0.052, (a[2] + t[2]) * 0.5 - 0.005], [0.047 * bk, 0.05, 0.115]), 'su', 0.03);
  Bt.both(SDF.ell([t[0], 0.04, t[2] - 0.015], [0.042 * bk, 0.035, 0.05]), 'su', 0.02);
  Bt.both(SDF.box([a[0] + 0.003, 0.012, (a[2] + t[2]) * 0.5 - 0.0], [0.05 * bk, 0.012, 0.135], 0.01), 'su', 0.008);
  Bt.both(SDF.box([a[0], 0.028, a[2] - 0.025], [0.04 * bk, 0.027, 0.035], 0.012), 'su', 0.01);
};
/* fabric folds: small displacement bands (metres), kept off leather */
SCULPT.folds = function (J, amt) {
  const A = amt || 1;
  const ew = J.elbow, sh = J.shoulder, wr = J.wrist;
  return function (x, y, z) {
    let d = 0; const ax = Math.abs(x);
    // sleeve rings near the elbow and forearm bunching
    const ux = ew[0] - sh[0], uy = ew[1] - sh[1], L1 = Math.hypot(ux, uy);
    const s = ((ax - sh[0]) * ux + (y - sh[1]) * uy) / (L1 * L1);
    if (s > 0.35 && s < 1.9 && ax > 0.2) {
      // irregular, spiralling bunching concentrated at the inside of the elbow (not uniform rings)
      const g = Math.exp(-((s - 1.02) * (s - 1.02)) * 9) + 0.35 * Math.exp(-((s - 1.6) * (s - 1.6)) * 14);
      const inner = 0.45 + 0.55 * smooth(0.02, -0.04, z - ew[2]);
      const w = Math.sin(s * 26 + z * 55 + Math.sin(y * 70) * 1.8) * (0.6 + 0.4 * Math.sin(s * 9 + 1.3));
      d += 0.0022 * A * g * inner * w;
    }
    // set-in sleeve seam: a shallow groove round the top of the arm
    if (s > 0.0 && s < 0.2 && ax > 0.15) d += 0.0014 * A * Math.exp(-((s - 0.085) * (s - 0.085)) * 1800);
    // torso: vertical folds gathering into the belt, diagonal pull under the chest
    if (y > J.pelvis[1] + 0.07 && y < J.chest[1] + 0.02 && ax < 0.17) {
      const ang = Math.atan2(x, z);
      const g = smooth(J.chest[1] + 0.02, J.chest[1] - 0.12, y) * smooth(J.pelvis[1] + 0.07, J.pelvis[1] + 0.14, y);
      d += 0.0022 * A * g * Math.sin(ang * 13 + y * 9 + Math.sin(ang * 5) * 1.2);
    }
    // trousers: bunching above the boot + knee creases
    if (y > 0.4 && y < 0.62 && ax < 0.16) {
      const ang = Math.atan2(x - sgn(x) * 0.105, z);
      d += 0.0028 * A * Math.exp(-((y - 0.5) * (y - 0.5)) * 400) * Math.sin(y * 150 + ang * 2.5);
    }
    if (y > 0.62 && y < 0.9 && ax < 0.19) {
      const ang = Math.atan2(x - sgn(x) * 0.1, z);
      d += 0.0018 * A * Math.sin(ang * 5 + y * 40) * smooth(0.62, 0.7, y) * smooth(0.9, 0.82, y);
    }
    return d;
  };
};
/* mesh a group list as LAYERED garments: every group is its own closed surface (its own crisp edge where it overlaps
   another — a vest over a shirt, a belt over a tunic), then all layers are merged into one mesh with a per-vertex
   material. AO is taken against the union so garments shadow what they overlap. o.layers === false → the old single
   blended union. Returns {pos, nrm, idx, nv, ao, mat(Uint8 per vertex)} either way. */
SCULPT.mesh = async function (G, J, o) {
  o = o || {};
  if (o.layers === false) return SCULPT.meshUnion(G, J, o);
  const fAll0 = SDF.compile(G), fold = o.folds || null;
  const fAll = fold ? (x, y, z) => fAll0(x, y, z) + fold(x, y, z) : fAll0;
  const res = o.res || 0.0048, B0 = o.box || [-0.6, -0.005, -0.22, 0.6, 1.9, 0.24], matIds = o.matIds || {};
  const P = [], N = [], AO = [], I = [], MT = []; let base = 0;
  // the body itself stays one smoothly blended surface (organic joins); belts, buckle and boots are crisp overlay layers
  const OVER = o.overlays || ['belt', 'belt2', 'buckle', 'boots'];
  const tag = (g) => g.layer || (OVER.includes(g.name) ? g.name : null);
  const baseG = G.filter((g) => !tag(g)), byLayer = new Map();
  for (const g of G) { const t = tag(g); if (!t) continue; if (!byLayer.has(t)) byLayer.set(t, []); byLayer.get(t).push(g); }
  const layers = [{ base: true, groups: baseG }].concat([...byLayer.values()].map((groups) => ({ groups })));
  for (const Lr of layers) {
    const fg0 = SDF.compile(Lr.groups.map((g) => Object.assign({}, g, { bound: null })));
    const cloth = Lr.base || Lr.groups[0].mat === 'tunic' || Lr.groups[0].mat === 'trousers';
    const fg = cloth && fold ? (x, y, z) => fg0(x, y, z) + fold(x, y, z) : fg0;
    const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const g of Lr.groups) for (const it of g.items) { if (it.op === 'ss' || it.op === 's' || it.op === 'si') continue; const b = SDF.primBound(it.p); for (let a = 0; a < 3; a++) { bb[a] = Math.min(bb[a], b.c[a] - b.r); bb[a + 3] = Math.max(bb[a + 3], b.c[a] + b.r); } }
    for (let a = 0; a < 3; a++) { bb[a] = Math.max(B0[a], bb[a] - 0.012); bb[a + 3] = Math.min(B0[a + 3], bb[a + 3] + 0.012); }
    if (bb[3] <= bb[0] || bb[4] <= bb[1] || bb[5] <= bb[2]) continue;
    const ext = Math.max(bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]), r = ext < 0.16 ? res * 0.55 : res;
    let m = MESH.nets(fg, bb, r); if (!m.nv) continue; m = MESH.largest(m, Lr.base ? 400 : 24);
    const An = MESH.fieldAttrs(fg, m.pos, m.nv), Ao = MESH.fieldAttrs(fAll, m.pos, m.nv).ao;
    const gfs = fg0.groups;
    for (let v = 0; v < m.nv; v++) {
      const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
      let best = 0; if (gfs.length > 1) { let bd = 1e9; for (let i = 0; i < gfs.length; i++) { const d = gfs[i](x, y, z); if (d < bd) { bd = d; best = i; } } }
      P.push(x, y, z); N.push(An.nrm[v * 3], An.nrm[v * 3 + 1], An.nrm[v * 3 + 2]); AO.push(Math.min(An.ao[v], Ao[v])); MT.push(matIds[Lr.groups[best].mat] || 0);
    }
    for (let t = 0; t < m.idx.length; t++) I.push(m.idx[t] + base);
    base += m.nv;
    await MG.yield();
  }
  return { pos: new Float32Array(P), nrm: new Float32Array(N), ao: new Float32Array(AO), idx: new Uint32Array(I), nv: base, mat: new Uint8Array(MT) };
};
SCULPT.meshUnion = async function (G, J, o) {
  o = o || {};
  const f0 = SDF.compile(G), fold = o.folds || null;
  const f = fold ? (x, y, z) => f0(x, y, z) + fold(x, y, z) : f0;
  const res = o.res || 0.0048;
  const box = o.box || [-0.34, -0.005, -0.2, 0.34, 1.62, 0.22];
  let m = MESH.nets(f, box, res);
  await MG.yield();
  m = MESH.largest(m, 800);
  const A = MESH.fieldAttrs(f, m.pos, m.nv);
  const matOf = new Uint8Array(m.nv), gf = f0.groups;
  const matIds = o.matIds || {};
  for (let v = 0; v < m.nv; v++) {
    const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
    let best = 0, bd = 1e9;
    for (let i = 0; i < gf.length; i++) { const d = gf[i](x, y, z); if (d < bd) { bd = d; best = i; } }
    matOf[v] = matIds[G[best].mat] || 0;
  }
  return { pos: m.pos, nrm: A.nrm, ao: A.ao, idx: m.idx, nv: m.nv, mat: matOf };
};
SCULPT.meshFists = async function (J, o) {
  o = o || {};
  const itemsL = SCULPT.fist(J, o);
  const gL = [{ name: 'fistL', items: itemsL, op: 'su', k: 0.01 }];
  const itemsR = itemsL.map((it) => ({ p: SDF.mirror(it.p), op: it.op, k: it.k }));
  const gR = [{ name: 'fistR', items: itemsR, op: 'su', k: 0.01 }];
  const out = [];
  for (const g of [gL, gR]) {
    const f = SDF.compile(g); const b = g[0].bound || SDF.groupBound(g[0].items);
    const r = b.r + 0.012, box = [b.c[0] - r, b.c[1] - r, b.c[2] - r, b.c[0] + r, b.c[1] + r, b.c[2] + r];
    let m = MESH.nets(f, box, o.res || 0.0024); m = MESH.largest(m, 200);
    const A = MESH.fieldAttrs(f, m.pos, m.nv);
    out.push({ pos: m.pos, nrm: A.nrm, ao: A.ao, idx: m.idx, nv: m.nv });
    await MG.yield();
  }
  return out;
};
