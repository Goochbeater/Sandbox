/* LOVERS — the night scene's body positions on the royal bed, as POSE data (engine/e14_pose.js).
   LOVERS.pose(name, ph, k, A) -> { king, queen }   A = { K: king actor, Q: queen actor }
     ph  the rhythm phase in radians (the scene advances it at the pace the player picks)
     k   0..1, how worked-up they are: deepens the motion, tips heads back, raises her legs
   Directions are world directions (world: true): +x runs from the pillows toward the foot of the bed, +y up, +z toward
   the lens. Everything is staged in profile so the room camera reads both bodies. Where the bodies join, one body is
   pinned to the other: LOVERS.entry() is her opening (a point on her pelvis), LOVERS.rod() a point along his shaft, and
   the pin slides the pinned body so they meet at the depth the rhythm asks for. Hands reach for the other body's bones
   with two-bone IK, knees are planted on the quilt. Checked headlessly with tools/posecheck.js. */
const LOVERS = { BED: { x0: -9.4, x1: -6.0, z0: 0.25, z1: 2.05, top: 0.80, zc: 1.15, pillow: -9.03 }, _a: new THREE.Vector3(), _b: new THREE.Vector3() };
LOVERS.NAMES = ['kiss', 'missionary', 'ride', 'reverse', 'behind', 'lap', 'edge', 'after'];
LOVERS.MENU = ['kiss', 'missionary', 'ride', 'reverse', 'behind', 'lap', 'edge'];   // what the position strip offers, in this order
LOVERS.LABEL = { kiss: 'Kiss', missionary: 'On her back', ride: 'She rides', reverse: 'Turned away', behind: 'From behind', lap: 'In his lap', edge: 'Bed’s edge', after: 'Hold her' };   // short: seven must fit a phone's width
LOVERS.FOCUS = { kiss: -7.7, missionary: -8.25, ride: -8.2, reverse: -8.1, behind: -7.85, lap: -8.6, edge: -6.45, after: -8.2 };   // where the close lens looks (x), by position
LOVERS.CARD = { edge: 1.14 };   // how far the shared sprite's card sits toward the lens (default 0.82): at the bed's edge he stands by the near foot post, which would cut him in two
LOVERS.LIKE = { reverse: 'ride', lap: 'ride', edge: 'missionary' };   // whose lines a position borrows when a scene wrote none for it
LOVERS.RATE = { lap: 0.6, edge: 1.05 };                               // a position's own tempo (x the pace): the lap is a slow grind
LOVERS.FRAME = { w: 4.7, h: 3.0, x: -7.45, y: 1.5 };                  // the one sprite both bodies share: the whole bed and a man standing at its foot
LOVERS.O = { x: 0, y: 0, z: 0 };                                      // where the bed's positions are staged: an offset from the royal bed (LOVERS.stage)
LOVERS.stage = (o) => { LOVERS.O = Object.assign({ x: 0, y: 0, z: 0 }, o || {}); };
/* her opening, in the world now (body-space point between the vulva and the perineum, carried by the pelvis) */
LOVERS.entry = function (Q, out) {
  const M = Q.marks; if (!Q._eB) Q._eB = [0, lerp(M.crotch[1], M.perineum[1], 0.4), lerp(M.crotch[2], M.perineum[2], 0.4)];
  return POSE.point(Q, 'pelvis', Q._eB, out);
};
/* a point d metres up his shaft from the root */
LOVERS.rod = (K, d, out) => K.sexGroup.userData.shaft.localToWorld(out.set(0, d, 0));
LOVERS.bone = (a, n, out) => a.bones[QA.idx[n]].getWorldPosition(out || new THREE.Vector3());
LOVERS.at = (a, bone, p) => POSE.point(a, bone, p, new THREE.Vector3()).toArray();   // a body-space point riding one bone
/* ---------------------------------------------------------------- the rhythm
   One phase, several readings of it, so a body moves as a body and not as a block (ENGINE.md §13q):
     stroke(ph)   0..1, 1 = all the way in: a quick drive (30% of the cycle), a beat held at the deep end, a slower draw back
     jolt(ph)     the impact: a damped ripple that starts at the deep end and dies away within the cycle
     stroke(ph - lag)   the same curve later: the chest answers the hips 0.7 rad on, the head 1.3 rad on
   and three slow turns of the same phase that never line up with the stroke: amp (how deep this stroke goes, 0.8..1),
   sway (the head rolling from side to side), br (breath). They are functions of ph, so they quicken with the pace. */
LOVERS.stroke = (ph) => { const u = ((ph / (Math.PI * 2)) % 1 + 1) % 1; return u < 0.3 ? smooth(0, 0.3, u) : u < 0.38 ? 1 : 1 - smooth(0.38, 1, u); };
LOVERS.jolt = (ph) => { const u = ((ph / (Math.PI * 2)) % 1 + 1) % 1, d = u - 0.3; return d < 0 ? 0 : Math.exp(-d * 7) * Math.sin(d * 22); };
LOVERS.tilt = (U, F, a) => { const c = Math.cos(a), n = Math.sin(a); return [[U[0] * c + F[0] * n, U[1] * c + F[1] * n, U[2] * c + F[2] * n], [F[0] * c - U[0] * n, F[1] * c - U[1] * n, F[2] * c - U[2] * n]]; };   // a pelvis (or chest) tipped a radians toward its own front
LOVERS.mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
LOVERS.pose = function (name, ph, k, A) {
  const L = LOVERS, B = L.BED, O = L.O, zc = B.zc + O.z, X = (x) => x + O.x, Y = (y) => y + O.y, W = (o) => Object.assign({ world: true }, o);
  const S = L.stroke(ph), S1 = L.stroke(ph - 0.7), S2 = L.stroke(ph - 1.3), J = L.jolt(ph) * (0.35 + 0.65 * k), sw = Math.sin(ph * 0.5);
  const amp = 0.8 + 0.2 * Math.sin(ph * 0.173 + 0.6), sway = Math.sin(ph * 0.19 + 1.1), br = Math.sin(ph * 0.31);
  const K = A.K, Q = A.Q, depth = lerp(0.035, 0.118, S * amp) * (0.85 + 0.15 * k);
  const pinK = (a) => L.entry(Q, L._a).sub(L.rod(a, depth, L._b));   // move him onto her
  const pinQ = (a) => L.rod(K, depth, L._a).sub(L.entry(a, L._b));   // move her onto him
  const at = (a, n, p) => L.at(a, n, p), bone = (a, n) => L.bone(a, n).toArray();
  switch (name) {
    case 'kiss': {   // kneeling up on the quilt, face to face, kissing; his hands on her waist, her arms round his neck.
      // They breathe, sway together, and lean in further as it builds
      const q = 0.014 * sw, lean = 0.04 * k + 0.012 * br, rise = 0.008 * br;
      return {
        queen: W({ at: [X(-7.88) + q, Y(1.28) + rise, zc], up: [0.02 + lean, 1, 0.02 * sway], fwd: [1, -0.02, 0], spine: [[0.08 + lean + 0.03 * br, 1, 0]], head: [[0.12 + 0.1 * k, 1, 0.1 * sway], [1, 0.25 + 0.1 * k, 0.12 * sway]],
          armL: [[0.5, 0.65, -0.4], [0.3, 0.25 + 0.08 * sw, 0.9]], armR: [[0.5, 0.65, 0.4], [0.3, 0.25 - 0.08 * sw, -0.9]],
          legL: [[0.05, -1, -0.12], [-1, -0.06, 0], null, [-1, -0.08, 0]], legR: [[0.05, -1, 0.12], [-1, -0.06, 0], null, [-1, -0.08, 0]] }),
        king: W({ at: [X(-7.52) + q, Y(1.31) - rise, zc], up: [-0.02 - lean, 1, 0.02 * sway], fwd: [-1, -0.02, 0], spine: [[-0.06 - lean - 0.03 * br, 1, 0]], head: [[-0.08, 1, -0.08 * sway], [-1, -0.08, -0.1 * sway]],
          armL: [[-0.35, -0.85, 0.4], [-0.8, -0.35 + 0.22 * sw, -0.45]], armR: [[-0.35, -0.85, -0.4], [-0.8, -0.35 - 0.22 * sw, 0.45]],
          legL: [[-0.05, -1, 0.12], [1, -0.06, 0], null, [1, -0.08, 0]], legR: [[-0.05, -1, -0.12], [1, -0.06, 0], null, [1, -0.08, 0]] }) };
    }
    case 'missionary': {   // her on her back, head on the pillow, knees up and apart (drawn up higher as k rises);
      // him kneeling between her thighs, up on his hands. He drives from the hips (the pelvis tucks under at the deep
      // end, the back rounds against it); she takes each stroke through her body: pushed up the bed, her back arching a
      // beat later, her head a beat after that, rolling on the pillow; past k 0.6 one arm goes back to grip the pillow
      const push = -0.016 * S - 0.012 * J, lift = smooth(0.35, 1, k), grip = smooth(0.55, 0.85, k);
      const tL = [lerp(0.35, 0.22, lift), lerp(0.65, 0.84, lift), lerp(-0.68, -0.5, lift) - 0.05 * S1], tR = [tL[0], tL[1], -tL[2]];
      const cL = [lerp(0.8, 0.95, lift), lerp(-0.55, 0.05, lift) + 0.14 * (S1 - 0.5) * k, lerp(-0.15, 0.2, lift)], cR = [cL[0], cL[1], -cL[2]];
      const [hu, hf] = L.tilt([-0.95, 0.3, 0], [-0.3, -0.95, 0], 0.26 * S - 0.1), [su, sf] = L.tilt([-0.85, 0.53, 0], [-0.53, -0.85, 0], -0.12 * S + 0.04);
      return {
        queen: W({ at: [X(-8.3) + push, Y(0.92), zc], up: [-1, 0, 0], fwd: [0, 1, 0], spine: [[-1, 0.2 + 0.12 * S1 * k + 0.025 * br, 0], [0.2, 1, 0]],
          head: [[-1, 0.35 - 0.2 * k * S2, 0.2 * sway * k], [0.35 - 0.25 * k - 0.12 * S2 * k, 1, 0.35 * sway]],
          armL: { ik: L.mix3(bone(K, 'upperarm_r'), [X(-8.98), Y(0.98), zc - 0.34], grip), pole: [0.2, -0.4, -1] }, armR: { ik: bone(K, 'upperarm_l'), pole: [0.2, -0.4, 1] },
          legL: [tL, cL], legR: [tR, cR] }),
        king: W({ at: [X(-8.12), Y(1.12), zc], up: [-0.95, 0.3, 0], fwd: [-0.3, -0.95, 0], hips: [hu, hf],
          spine: [su, sf], head: [[-0.8, 0.6 - 0.1 * k + 0.1 * S2, 0.06 * sway], [-0.6, -0.8 + 0.12 * S2, 0]],
          armL: { ik: [X(-8.66), Y(0.87), zc + 0.25], pole: [0.4, 0.2, 0.6], end: [-1, -0.08, 0.1] }, armR: { ik: [X(-8.66), Y(0.87), zc - 0.25], pole: [0.4, 0.2, -0.6], end: [-1, -0.08, -0.1] },
          legL: { aimAt: [X(-7.72), Y(0.87), zc + 0.15], lower: [1, -0.03, 0.03], pole: [-1, -0.4, 0], end: [1, -0.08, 0] },
          legR: { aimAt: [X(-7.72), Y(0.87), zc - 0.15], lower: [1, -0.03, -0.03], pole: [-1, -0.4, 0], end: [1, -0.08, 0] }, pin: pinK }) };
    }
    case 'ride': {   // him on his back, head and shoulders on the pillow, hands on her hips, lifting to meet her; her kneeling
      // astride him, hands on his chest, riding: pinned onto him at the stroke's depth, her hips rocking, her back and
      // head following a beat behind, the head tipping back and rolling as it builds
      const rock = 0.15 * Math.sin(ph) * (0.6 + 0.4 * k), hip = (sd) => at(Q, 'pelvis', [sd * 0.15, 0.95, -0.01]);
      const chest = (sd) => at(K, 'spine_03', [sd * 0.09, 1.3, 0.12]);
      return {
        king: W({ at: [X(-8.2), Y(0.92) + 0.022 * S * k, zc], up: [-1, 0.12, 0], fwd: [0.12, 1, 0], spine: [[-1, 0.32 + 0.03 * br, 0], [0.32, 1, 0]], head: [[-1, 0.5 + 0.1 * S2 * k, 0.05 * sway], [0.5, 1, 0.1 * sway]],
          armL: { ik: hip(-1), pole: [0.3, -0.2, -1] }, armR: { ik: hip(1), pole: [0.3, -0.2, 1] },
          legL: [[1, -0.04 + 0.05 * S * k, -0.07], [1, -0.02 - 0.05 * S * k, 0], null, [0.35, 0.9, -0.1]], legR: [[1, -0.04 + 0.05 * S * k, 0.07], [1, -0.02 - 0.05 * S * k, 0], null, [0.35, 0.9, 0.1]] }),
        queen: W({ at: [X(-8.16), Y(1.2), zc], up: [-0.12 - rock * 0.5, 1, 0.03 * sway], fwd: [-1, -0.12 - rock * 0.5, 0], hips: [[rock, 1, 0], [-1, rock, 0]],
          spine: [[-0.1 + rock * 0.4 - 0.1 * k - 0.14 * (S1 - 0.5) * k, 1, 0], [-1, 0, 0]], head: [[0.05 + 0.25 * k * S2, 1, 0.14 * sway], [-1, -0.2 + 0.5 * k * S2, 0.22 * sway]],
          armL: { ik: chest(-1), pole: [0.3, 0, 1] }, armR: { ik: chest(1), pole: [0.3, 0, -1] },
          legL: { aimAt: [X(-8.06), Y(0.87), zc + 0.25], lower: [1, -0.03, 0.03], pole: [-1, -0.3, 0.2], end: [1, -0.08, 0] },
          legR: { aimAt: [X(-8.06), Y(0.87), zc - 0.25], lower: [1, -0.03, -0.03], pole: [-1, -0.3, -0.2], end: [1, -0.08, 0] }, pin: pinQ }) };
    }
    case 'reverse': {   // as the ride, but she has turned to face the foot of the bed: leaning forward on her hands on his
      // knees, her back to him, his hands at her hips; as it builds she sits up and leans back, head tipping toward him
      const rock = 0.15 * Math.sin(ph) * (0.6 + 0.4 * k), back = smooth(0.45, 0.9, k), lean = lerp(0.34, -0.1, back);
      const hip = (sd) => at(Q, 'pelvis', [sd * 0.15, 0.95, -0.01]), knee = (n, sd) => at(K, n, [sd * 0.1, 0.5, 0.07]);
      return {
        king: W({ at: [X(-8.2), Y(0.92) + 0.022 * S * k, zc], up: [-1, 0.12, 0], fwd: [0.12, 1, 0], spine: [[-1, 0.32 + 0.03 * br, 0], [0.32, 1, 0]], head: [[-1, 0.55 + 0.08 * S2 * k, 0.05 * sway], [0.55, 1, 0.08 * sway]],
          armL: { ik: hip(1), pole: [-0.3, -0.2, -1] }, armR: { ik: hip(-1), pole: [-0.3, -0.2, 1] },
          legL: [[1, 0.02 + 0.04 * S * k, -0.08], [1, -0.05, 0], null, [0.35, 0.9, -0.1]], legR: [[1, 0.02 + 0.04 * S * k, 0.08], [1, -0.05, 0], null, [0.35, 0.9, 0.1]] }),
        queen: W({ at: [X(-8.16), Y(1.2), zc], up: [lean + rock * 0.5, 1, 0.03 * sway], fwd: [1, -lean - rock * 0.5, 0], hips: [[-rock + 0.1, 1, 0], [1, rock - 0.1, 0]],
          spine: [[lean * 1.2 - rock * 0.4 + 0.14 * (S1 - 0.5) * k, 1, 0], [1, -lean, 0]], head: [[lean * 0.6 - 0.3 * k * S2, 1, 0.14 * sway], [1, 0.1 + 0.45 * k * S2, 0.22 * sway]],
          armL: { ik: L.mix3(knee('calf_l', 1), at(K, 'thigh_l', [0.12, 0.78, 0.09]), back), pole: [-0.3, 0.2, -1] }, armR: { ik: L.mix3(knee('calf_r', -1), at(K, 'thigh_r', [-0.12, 0.78, 0.09]), back), pole: [-0.3, 0.2, 1] },
          legL: { aimAt: [X(-8.26), Y(0.87), zc - 0.25], lower: [-1, -0.03, -0.03], pole: [1, -0.3, -0.2], end: [-1, -0.08, 0] },
          legR: { aimAt: [X(-8.26), Y(0.87), zc + 0.25], lower: [-1, -0.03, 0.03], pole: [1, -0.3, 0.2], end: [-1, -0.08, 0] }, pin: pinQ }) };
    }
    case 'behind': {   // her on hands and knees facing the pillows; him kneeling up behind her, hands on her hips, driving
      // from the hips. Each stroke pushes her forward and runs up her back to her head; as it builds she goes down onto
      // her forearms (her shoulders drop, her hips stay up) and his head goes back
      const push = -0.022 * S - 0.014 * J, drop = smooth(0.6, 0.92, k), hip = (sd) => at(Q, 'pelvis', [sd * 0.15, 0.97, -0.03]);
      const [hu, hf] = L.tilt([-0.12, 1, 0], [-1, -0.12, 0], 0.24 * S - 0.08), hy = Y(0.885) - 0.0 * drop;
      return {
        queen: W({ at: [X(-7.86) + push, Y(1.25), zc], up: [-0.996, 0.08 - 0.3 * drop, 0], fwd: [-0.08 - 0.3 * drop, -0.996, 0], spine: [[-1, -0.06 - 0.05 * k - 0.09 * S1 - 0.25 * drop, 0], [-0.06, -1, 0]],
          head: [[-0.8, 0.6 + 0.15 * k * S + 0.18 * J - 0.5 * drop, 0.16 * sway], [-1, -0.1 + 0.3 * k * S2, 0.28 * sway]],
          armL: { ik: [X(-8.42) + push * 0.3 - 0.1 * drop, hy, zc + 0.16], pole: [1, -0.6 * drop, 0.2], end: [-1, -0.02, 0] }, armR: { ik: [X(-8.42) + push * 0.3 - 0.1 * drop, hy, zc - 0.16], pole: [1, -0.6 * drop, -0.2], end: [-1, -0.02, 0] },
          legL: { aimAt: [X(-7.8), Y(0.87), zc + 0.13], lower: [1, -0.04, 0], pole: [-1, -0.2, 0], end: [1, -0.08, 0] },
          legR: { aimAt: [X(-7.8), Y(0.87), zc - 0.13], lower: [1, -0.04, 0], pole: [-1, -0.2, 0], end: [1, -0.08, 0] } }),
        king: W({ at: [X(-7.55), Y(1.27), zc], up: [-0.12, 1, 0], fwd: [-1, -0.12, 0], hips: [hu, hf], spine: [[-0.05 - 0.1 * k + 0.1 * S, 1, 0], [-1, -0.1, 0]], head: [[-0.15 + 0.2 * S2 * k, 1, 0.05 * sway], [-1, -0.45 + 0.4 * S2 * k, 0]],
          armL: { ik: hip(1), pole: [0.3, 0, 1] }, armR: { ik: hip(-1), pole: [0.3, 0, -1] },
          legL: { aimAt: [X(-7.45), Y(0.87), zc + 0.16], lower: [1, -0.04, 0], pole: [-1, -0.2, 0], end: [1, -0.08, 0] },
          legR: { aimAt: [X(-7.45), Y(0.87), zc - 0.16], lower: [1, -0.04, 0], pole: [-1, -0.2, 0], end: [1, -0.08, 0] }, pin: pinK }) };
    }
    case 'lap': {   // him sitting up against the pillows, legs out along the bed; her astride his lap, face to face, arms
      // round his neck, his hands at the small of her back. Slow (LOVERS.RATE): she grinds more than she rides, their
      // chests close, her head beside his, tipping back as it builds
      const rock = 0.2 * Math.sin(ph) * (0.6 + 0.4 * k), close = 0.03 * br;
      return {
        king: W({ at: [X(-8.82), Y(0.93), zc], up: [-0.34, 1, 0], fwd: [1, 0.34, 0], spine: [[-0.3 + close, 1, 0], [1, 0.3, 0]], head: [[-0.1 + 0.12 * S2 * k, 1, 0.06 * sway], [1, 0.05 + 0.2 * S2 * k, 0.1 * sway]],
          armL: { ik: at(Q, 'spine_01', [-0.12, 1.06, -0.1]), pole: [0, -0.3, -1] }, armR: { ik: at(Q, 'spine_01', [0.12, 1.06, -0.1]), pole: [0, -0.3, 1] },
          legL: [[1, -0.03, -0.09], [1, -0.03, 0], null, [0.35, 0.9, -0.1]], legR: [[1, -0.03, 0.09], [1, -0.03, 0], null, [0.35, 0.9, 0.1]] }),
        queen: W({ at: [X(-8.6), Y(1.04), zc], up: [-0.1 - rock * 0.4 - close, 1, 0.03 * sway], fwd: [-1, -0.1 - rock * 0.4, 0], hips: [[rock * 1.1, 1, 0], [-1, rock * 1.1, 0]],
          spine: [[-0.16 + rock * 0.3 - 0.1 * (S1 - 0.5) * k, 1, 0], [-1, 0, 0]], head: [[-0.05 + 0.3 * k * S2, 1, 0.16 * sway], [-1, -0.05 + 0.5 * k * S2, 0.3 * sway]],
          armL: { ik: at(K, 'spine_03', [-0.13, 1.44, -0.07]), pole: [0, 0.5, 1] }, armR: { ik: at(K, 'spine_03', [0.13, 1.44, -0.07]), pole: [0, 0.5, -1] },
          legL: { aimAt: [X(-8.92), Y(0.87), zc + 0.3], lower: [1, -0.03, 0.03], pole: [-1, -0.3, 0.2], end: [1, -0.08, 0] },
          legR: { aimAt: [X(-8.92), Y(0.87), zc - 0.3], lower: [1, -0.03, -0.03], pole: [-1, -0.3, -0.2], end: [1, -0.08, 0] }, pin: pinQ }) };
    }
    case 'edge': {   // her on her back across the foot of the bed, hips at its edge, legs up against his shoulders; him
      // standing on the floor at the foot, his hands on her thighs, driving from the hips with his feet planted. She is
      // pushed up the quilt on every stroke; her arms go back over her head as it builds
      const push = -0.02 * S - 0.014 * J, over = smooth(0.4, 0.8, k), spread = 0.12 + 0.1 * smooth(0.5, 1, k);
      const [hu, hf] = L.tilt([-0.16, 1, 0], [-1, -0.16, 0], 0.26 * S - 0.09);
      const armUp = (sd) => L.mix3([0.2, 0.25, sd * 0.95], [-0.9, 0.12, sd * 0.4], over);
      return {
        queen: W({ at: [X(-6.12) + push, Y(0.92), zc], up: [-1, 0, 0], fwd: [0, 1, 0], spine: [[-1, 0.12 + 0.12 * S1 * k + 0.025 * br, 0], [0.12, 1, 0]],
          head: [[-1, 0.1 - 0.12 * k * S2, 0.2 * sway * k], [0.15 - 0.2 * k - 0.1 * S2 * k, 1, 0.35 * sway]],
          armL: [armUp(-1), [-0.8, 0.1, -0.5 + 0.3 * over]], armR: [armUp(1), [-0.8, 0.1, 0.5 - 0.3 * over]],
          legL: [[0.42, 0.9, -spread], [0.8, 0.58 + 0.1 * (S1 - 0.5), -0.06]], legR: [[0.42, 0.9, spread], [0.8, 0.58 + 0.1 * (S1 - 0.5), 0.06]] }),
        king: W({ at: [X(-5.9), 0.97, zc], up: [-0.16, 1, 0], fwd: [-1, -0.16, 0], hips: [hu, hf], spine: [[-0.2 + 0.1 * S, 1, 0], [-1, -0.2, 0]], head: [[-0.2 + 0.15 * S2 * k, 1, 0.05 * sway], [-1, -0.5 + 0.35 * S2 * k, 0]],
          armL: { ik: at(Q, 'thigh_r', [-0.1, 0.7, 0.09]), pole: [0.2, -0.5, 1] }, armR: { ik: at(Q, 'thigh_l', [0.1, 0.7, 0.09]), pole: [0.2, -0.5, -1] },
          legL: { ik: [X(-5.78), 0.1, zc + 0.17], pole: [-1, 0.1, 0.1], end: [-1, -0.3, 0] }, legR: { ik: [X(-5.78), 0.1, zc - 0.17], pole: [-1, 0.1, -0.1], end: [-1, -0.3, 0] }, pin: pinK }) };
    }
    case 'after': default: {   // afterwards: him on his back, her curled on her side against him, head on his chest,
      // an arm and a leg over him; his arm round her. Slow breathing (ph still turns, slowly), not quite in time
      const b1 = 0.007 * Math.sin(ph), b2 = 0.006 * Math.sin(ph * 0.83 + 0.9);
      return {
        king: W({ at: [X(-8.2), Y(0.92) + b1, zc], up: [-1, 0.12, 0], fwd: [0.12, 1, 0], spine: [[-1, 0.3 + 4 * b1, 0], [0.3, 1, 0]], head: [[-1, 0.5, 0.1], [0.5, 1, 0.25]],
          armL: [[-0.3, -0.25, -0.9], [0.5, 0.1, -0.85]], armR: { ik: at(Q, 'spine_03', [0, 1.3, -0.13]), pole: [0, -1, 0.3] },
          legL: [[1, -0.04, -0.07], [1, -0.02, 0], null, [0.35, 0.9, -0.1]], legR: [[1, -0.04, 0.05], [1, -0.02, 0], null, [0.35, 0.9, 0.1]] }),
        queen: W({ at: [X(-8.12), Y(0.98) + b2, zc + 0.36], up: [-1, 0.05, -0.15], fwd: [0, -0.35, -1], spine: [[-0.9, 0.2 + 3 * b2, -0.35], [0, -0.4, -1]], head: [[-0.85, 0.15, -0.5], [0.2, -0.6, -1]],
          armR: { ik: at(K, 'spine_03', [-0.1 + 0.04 * Math.sin(ph * 0.37), 1.28, 0.1]), pole: [0.2, 1, 0] }, armL: [[-0.5, -0.2, -0.3], [-0.8, 0.1, -0.2]],
          legR: [[0.65, 0.1, -0.75], [0.75, -0.3, -0.2]], legL: [[1, 0.02, 0.08], [0.9, 0.06, 0.3], null, [1, 0.1, 0.1]] }) };
    }
  }
};
