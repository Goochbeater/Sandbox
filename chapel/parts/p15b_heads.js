/* HEADS — human heads (sculpt ported from EVERREALM), parameterised by the head origin (ear-canal midpoint). */
const HEADS = {};
HEADS.humanGroups = function (HO, eyeO) {
  const hm = (x, y, z) => [HO[0] + x / 1000, HO[1] + y / 1000, HO[2] + z / 1000];
  const mmv = (a) => a.map((x) => x / 1000);
  const EYE = hm(32, 7, 60), EYER = 0.0125;
  const it = [], add = (p, op, k) => it.push({ p, op: op || 'su', k: k || 0.001 });
  const both = (p, op, k) => { add(p, op, k); add(SDF.mirror(p), op, k); };
  const S = SDF, K = (v) => v / 1000;
  // cranium + face mass
  add(S.ell(hm(0, 31, -14), mmv([75, 88, 98])));
  add(S.ell(hm(0, -16, 22), mmv([62, 80, 56])), 'su', K(18));
  add(S.ell(hm(0, 40, 36), mmv([60, 52, 50])), 'su', K(14)); // forehead fill
  both(S.ell(hm(76, 18, 46), mmv([12, 22, 20])), 'ss', K(16)); // temples
  // jaw (mandible) and chin
  both(S.rcone(hm(16, -95, 57), hm(51, -72, -10), K(16), K(13)), 'su', K(14));
  add(S.ell(hm(0, -91, 69), mmv([18, 15, 15])), 'su', K(14));
  both(S.sph(hm(10.5, -95, 67), K(9)), 'su', K(8)); // square chin corners
  add(S.ell(hm(0, -86, 78), mmv([12, 10, 7])), 'su', K(8)); // mental protuberance
  // cheekbones + cheeks
  both(S.ell(hm(47, -6, 45), mmv([19, 12, 21]), SDF.rot(0, 28, -8)), 'su', K(16));
  both(S.ell(hm(42, -30, 47), mmv([20, 22, 20])), 'su', K(18));
  both(S.ell(hm(28, -48, 62), mmv([15, 15, 15])), 'su', K(12)); // buccal fill beside the mouth
  // brow ridge + glabella
  both(S.cap(hm(42, 18, 66), hm(12, 18.5, 77), K(8)), 'su', K(12));
  add(S.sph(hm(0, 14, 77), K(7)), 'su', K(10));
  // nose
  add(S.rcone(hm(0, 5, 75), hm(0, -23, 95), K(5.8), K(6.6)), 'su', K(10));
  add(S.sph(hm(0, -27, 96.5), K(8.4)), 'su', K(7));
  both(S.ell(hm(10.5, -32.5, 89.5), mmv([6.8, 6, 7])), 'su', K(8));
  add(S.ell(hm(0, -35, 93.5), mmv([4.5, 3.5, 6])), 'su', K(5));
  both(S.ell(hm(6.2, -37.4, 91.5), mmv([3.2, 1.8, 4.2])), 'ss', K(1.6));
  // muzzle + lips
  add(S.ell(hm(0, -56, 60), mmv([30, 26, 30])), 'su', K(16));
  both(S.ell(hm(8, -50.5, 86), mmv([15, 5.4, 7])), 'su', K(4));
  add(S.ell(hm(0, -60, 84), mmv([19.5, 6.5, 7.4])), 'su', K(4));
  add(S.ell(hm(0, -55.3, 78), mmv([22.5, 0.85, 15])), 'ss', K(1.2)); // lip seam
  both(S.sph(hm(22.5, -55.5, 80.5), K(2.4)), 'ss', K(2.5)); // mouth corners
  add(S.ell(hm(0, -45, 90), mmv([3.5, 5, 3])), 'ss', K(3)); // philtrum
  // eyes: an almond pit opened through the face mass, a solid lid ball (with the almond cut) filling it, then room
  // for the eyeball. The pit/ball gap closes by smooth union into a soft orbital crease.
  const lidO = { side: 1, w: 1.22, up: 0.4, lo: 0.29, upo: 0.02, loo: -0.02, yaw: 0.14, tilt: 0.08, solid: true };
  both(S.ell(V.add(EYE, [0.001, 0.0, 0.009]), mmv([15.5, 11.5, 12])), 'ss', K(6));
  both(S.lid(EYE, EYER, K(2.2), lidO), 'su', K(6));
  both(S.sph(EYE, EYER + K(0.35)), 's');
  // neck
  add(S.rcone(hm(0, -66, -18), hm(0, -205, -24), K(51), K(61)), 'su', K(10));
  both(S.rcone(hm(52, -34, -30), hm(14, -172, 30), K(11.5), K(14)), 'su', K(14));
  add(S.ell(hm(0, -110, 38), mmv([7.5, 8.5, 6.5])), 'su', K(7)); // larynx
  const earL = [], earR = []; HEADS.ear(earL, 1, hm); HEADS.ear(earR, -1, hm); earL[0].op = earR[0].op = 'u';
  return [{ name: 'head', items: it, op: 'su', k: 0.03 }, { name: 'earL', items: earL, op: 'su', k: 0.005 }, { name: 'earR', items: earR, op: 'su', k: 0.005 }];
};
/* human ear: pinna plate + helix rim + concha bowl + lobe + tragus, in a tilted local frame */
HEADS.ear = function (it, side, hm) {
  const K = (v) => v / 1000; const mmv = (a) => a.map((x) => x / 1000);
  const c = hm(78.5 * side, 4, -11);
  const rotM = SDF.rot(-14, -28 * side, 6 * side); // world->local rows
  // local->world: columns of rows^T
  const L = (lx, ly, lz) => { lx *= side; const r = rotM; return [c[0] + (r[0] * lx + r[3] * ly + r[6] * lz) / 1000, c[1] + (r[1] * lx + r[4] * ly + r[7] * lz) / 1000, c[2] + (r[2] * lx + r[5] * ly + r[8] * lz) / 1000]; };
  it.push({ p: SDF.ell(c, mmv([4.2, 30, 18.5]), rotM), op: 'su', k: K(5) });
  // helix rim: arc from front-top, over the top, down the back to the lobe
  let prev = null;
  for (let i = 0; i <= 22; i++) {
    const a = lerp(1.9, -1.95, i / 22); // angle in (y,z) plane, measured from +z (front)
    const ry = 29 * Math.sin(a) + (a < 0 ? -2 : 0), rz = 17.5 * Math.cos(a) - 2;
    const p = L(2.6, ry, rz);
    if (prev) it.push({ p: SDF.cap(prev, p, K(2.9)), op: 'u', k: K(2) });
    prev = p;
  }
  it.push({ p: SDF.ell(L(1.5, 6, -3), mmv([2.8, 15, 7])), op: 'su', k: K(3) }); // antihelix
  it.push({ p: SDF.ell(L(3.5, -4, 3), mmv([6, 10, 7.5])), op: 'ss', k: K(2.2) }); // concha
  it.push({ p: SDF.ell(L(0.5, -26, 3), mmv([3.8, 8, 6.5])), op: 'su', k: K(3) }); // lobe
  it.push({ p: SDF.ell(L(1, -3, 15.5), mmv([3, 4.5, 3])), op: 'su', k: K(2.5) }); // tragus
};

