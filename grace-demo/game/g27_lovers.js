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
LOVERS.NAMES = ['kiss', 'missionary', 'ride', 'behind', 'after'];
LOVERS.LABEL = { kiss: 'Kiss her', missionary: 'Lay her down', ride: 'Let her ride', behind: 'From behind', after: 'Hold her' };
/* her opening, in the world now (body-space point between the vulva and the perineum, carried by the pelvis) */
LOVERS.entry = function (Q, out) {
  const M = Q.marks; if (!Q._eB) Q._eB = [0, lerp(M.crotch[1], M.perineum[1], 0.4), lerp(M.crotch[2], M.perineum[2], 0.4)];
  return POSE.point(Q, 'pelvis', Q._eB, out);
};
/* a point d metres up his shaft from the root */
LOVERS.rod = (K, d, out) => K.sexGroup.userData.shaft.localToWorld(out.set(0, d, 0));
LOVERS.bone = (a, n, out) => a.bones[QA.idx[n]].getWorldPosition(out || new THREE.Vector3());
LOVERS.at = (a, bone, p) => POSE.point(a, bone, p, new THREE.Vector3()).toArray();   // a body-space point riding one bone
/* the in-out curve: 1 = all the way in. A quick push and a slower draw back reads better than a sine */
LOVERS.stroke = (ph) => { const u = ((ph / (Math.PI * 2)) % 1 + 1) % 1; return u < 0.38 ? smooth(0, 0.38, u) : 1 - smooth(0.38, 1, u); };
LOVERS.pose = function (name, ph, k, A) {
  const S = LOVERS.stroke(ph), sw = Math.sin(ph * 0.5), B = LOVERS.BED, zc = B.zc, W = (o) => Object.assign({ world: true }, o);
  const K = A.K, Q = A.Q, depth = lerp(0.035, 0.118, S) * (0.85 + 0.15 * k);
  const pinK = (a) => LOVERS.entry(Q, LOVERS._a).sub(LOVERS.rod(a, depth, LOVERS._b));   // move him onto her
  const pinQ = (a) => LOVERS.rod(K, depth, LOVERS._a).sub(LOVERS.entry(a, LOVERS._b));   // move her onto him
  const hand = (a, n, p) => LOVERS.at(a, n, p);
  switch (name) {
    case 'kiss': {   // kneeling up on the quilt, face to face, kissing; his hands on her waist, her arms round his neck
      const q = 0.012 * sw, lean = 0.04 * k;
      return {
        queen: W({ at: [-7.88 + q, 1.28, zc], up: [0.02 + lean, 1, 0], fwd: [1, -0.02, 0], spine: [[0.08 + lean, 1, 0]], head: [[0.12 + 0.1 * k, 1, 0], [1, 0.25 + 0.1 * k, 0]],
          armL: [[0.5, 0.65, -0.4], [0.3, 0.25, 0.9]], armR: [[0.5, 0.65, 0.4], [0.3, 0.25, -0.9]],
          legL: [[0.05, -1, -0.12], [-1, -0.06, 0], null, [-1, -0.08, 0]], legR: [[0.05, -1, 0.12], [-1, -0.06, 0], null, [-1, -0.08, 0]] }),
        king: W({ at: [-7.52 + q, 1.31, zc], up: [-0.02 - lean, 1, 0], fwd: [-1, -0.02, 0], spine: [[-0.06 - lean, 1, 0]], head: [[-0.08, 1, 0], [-1, -0.08, 0]],
          armL: [[-0.35, -0.85, 0.4], [-0.8, -0.35 + 0.2 * sw, -0.45]], armR: [[-0.35, -0.85, -0.4], [-0.8, -0.35 - 0.2 * sw, 0.45]],
          legL: [[-0.05, -1, 0.12], [1, -0.06, 0], null, [1, -0.08, 0]], legR: [[-0.05, -1, -0.12], [1, -0.06, 0], null, [1, -0.08, 0]] }) };
    }
    case 'missionary': {   // her on her back, head on the pillow, knees up and apart (drawn up higher as k rises);
      // him kneeling between her thighs, up on his hands. Pinned: he moves onto her at the stroke's depth, she rocks with it
      const push = -0.016 * S, lift = smooth(0.35, 1, k);
      const tL = [lerp(0.35, 0.22, lift), lerp(0.65, 0.84, lift), lerp(-0.68, -0.5, lift)], tR = [tL[0], tL[1], -tL[2]];
      const cL = [lerp(0.8, 0.95, lift), lerp(-0.55, 0.05, lift), lerp(-0.15, 0.2, lift)], cR = [cL[0], cL[1], -cL[2]];
      const sh = (n) => LOVERS.bone(K, n).toArray();
      return {
        queen: W({ at: [-8.3 + push, 0.92, zc], up: [-1, 0, 0], fwd: [0, 1, 0], spine: [[-1, 0.2, 0], [0.2, 1, 0]],
          head: [[-1, 0.35 - 0.2 * k * S, 0], [0.35 - 0.25 * k, 1, 0]],
          armL: { ik: sh('upperarm_r'), pole: [0.2, -0.4, -1] }, armR: { ik: sh('upperarm_l'), pole: [0.2, -0.4, 1] },
          legL: [tL, cL], legR: [tR, cR] }),
        king: W({ at: [-8.12, 1.12, zc], up: [-0.95, 0.3, 0], fwd: [-0.3, -0.95, 0],
          spine: [[-0.85, 0.53, 0], [-0.53, -0.85, 0]], head: [[-0.8, 0.6 - 0.1 * k, 0], [-0.6, -0.8, 0]],
          armL: { ik: [-8.66, 0.87, zc + 0.25], pole: [0.4, 0.2, 0.6], end: [-1, -0.08, 0.1] }, armR: { ik: [-8.66, 0.87, zc - 0.25], pole: [0.4, 0.2, -0.6], end: [-1, -0.08, -0.1] },
          legL: { aimAt: [-7.72, 0.87, zc + 0.15], lower: [1, -0.03, 0.03], pole: [-1, -0.4, 0], end: [1, -0.08, 0] },
          legR: { aimAt: [-7.72, 0.87, zc - 0.15], lower: [1, -0.03, -0.03], pole: [-1, -0.4, 0], end: [1, -0.08, 0] }, pin: pinK }) };
    }
    case 'ride': {   // him on his back, head and shoulders on the pillow, hands on her hips; her kneeling astride him,
      // knees either side of his hips, hands on his chest, riding: pinned onto him at the stroke's depth, rocking her hips
      const rock = 0.14 * Math.sin(ph) * (0.6 + 0.4 * k), hip = (sd) => LOVERS.at(Q, 'pelvis', [sd * 0.15, 0.95, -0.01]);
      const chest = (sd) => LOVERS.at(K, 'spine_03', [sd * 0.09, 1.3, 0.12]);
      return {
        king: W({ at: [-8.2, 0.92, zc], up: [-1, 0.12, 0], fwd: [0.12, 1, 0], spine: [[-1, 0.32, 0], [0.32, 1, 0]], head: [[-1, 0.5, 0], [0.5, 1, 0]],
          armL: { ik: hip(-1), pole: [0.3, -0.2, -1] }, armR: { ik: hip(1), pole: [0.3, -0.2, 1] },
          legL: [[1, -0.04, -0.07], [1, -0.02, 0], null, [0.35, 0.9, -0.1]], legR: [[1, -0.04, 0.07], [1, -0.02, 0], null, [0.35, 0.9, 0.1]] }),
        queen: W({ at: [-8.16, 1.2, zc], up: [-0.12 - rock * 0.5, 1, 0], fwd: [-1, -0.12 - rock * 0.5, 0], hips: [[rock, 1, 0], [-1, rock, 0]],
          spine: [[-0.1 + rock * 0.4 - 0.1 * k, 1, 0], [-1, 0, 0]], head: [[0.05 + 0.25 * k * S, 1, 0], [-1, -0.2 + 0.5 * k * S, 0]],
          armL: { ik: chest(-1), pole: [0.3, 0, 1] }, armR: { ik: chest(1), pole: [0.3, 0, -1] },
          legL: { aimAt: [-8.06, 0.87, zc + 0.25], lower: [1, -0.03, 0.03], pole: [-1, -0.3, 0.2], end: [1, -0.08, 0] },
          legR: { aimAt: [-8.06, 0.87, zc - 0.25], lower: [1, -0.03, -0.03], pole: [-1, -0.3, -0.2], end: [1, -0.08, 0] }, pin: pinQ }) };
    }
    case 'behind': {   // her on hands and knees facing the pillows, back dipped, head up; him kneeling up behind her, hands
      // on her hips. Pinned: he moves into her at the stroke's depth; she is pushed forward a little on every stroke
      const push = -0.022 * S, hip = (sd) => LOVERS.at(Q, 'pelvis', [sd * 0.15, 0.97, -0.03]);
      return {
        queen: W({ at: [-7.86 + push, 1.25, zc], up: [-0.996, 0.08, 0], fwd: [-0.08, -0.996, 0], spine: [[-1, -0.06 - 0.05 * k, 0], [-0.06, -1, 0]],
          head: [[-0.8, 0.6 + 0.15 * k * S, 0], [-1, -0.1 + 0.3 * k * S, 0]],
          armL: { ik: [-8.42 + push * 0.3, 0.885, zc + 0.16], pole: [1, 0, 0.2], end: [-1, -0.02, 0] }, armR: { ik: [-8.42 + push * 0.3, 0.885, zc - 0.16], pole: [1, 0, -0.2], end: [-1, -0.02, 0] },
          legL: { aimAt: [-7.8, 0.87, zc + 0.13], lower: [1, -0.04, 0], pole: [-1, -0.2, 0], end: [1, -0.08, 0] },
          legR: { aimAt: [-7.8, 0.87, zc - 0.13], lower: [1, -0.04, 0], pole: [-1, -0.2, 0], end: [1, -0.08, 0] } }),
        king: W({ at: [-7.55, 1.27, zc], up: [-0.12, 1, 0], fwd: [-1, -0.12, 0], spine: [[-0.05 - 0.1 * k, 1, 0], [-1, -0.1, 0]], head: [[-0.15, 1, 0], [-1, -0.45, 0]],
          armL: { ik: hip(1), pole: [0.3, 0, 1] }, armR: { ik: hip(-1), pole: [0.3, 0, -1] },
          legL: { aimAt: [-7.45, 0.87, zc + 0.16], lower: [1, -0.04, 0], pole: [-1, -0.2, 0], end: [1, -0.08, 0] },
          legR: { aimAt: [-7.45, 0.87, zc - 0.16], lower: [1, -0.04, 0], pole: [-1, -0.2, 0], end: [1, -0.08, 0] }, pin: pinK }) };
    }
    case 'after': default: {   // afterwards: him on his back, her curled on her side against him, head on his chest,
      // an arm and a leg over him; his arm round her. Slow breathing (ph still turns, slowly)
      const br = 0.006 * Math.sin(ph);
      return {
        king: W({ at: [-8.2, 0.92 + br, zc], up: [-1, 0.12, 0], fwd: [0.12, 1, 0], spine: [[-1, 0.3, 0], [0.3, 1, 0]], head: [[-1, 0.5, 0.1], [0.5, 1, 0.25]],
          armL: [[-0.3, -0.25, -0.9], [0.5, 0.1, -0.85]], armR: { ik: LOVERS.at(Q, 'spine_03', [0, 1.3, -0.13]), pole: [0, -1, 0.3] },
          legL: [[1, -0.04, -0.07], [1, -0.02, 0], null, [0.35, 0.9, -0.1]], legR: [[1, -0.04, 0.05], [1, -0.02, 0], null, [0.35, 0.9, 0.1]] }),
        queen: W({ at: [-8.12, 0.98, zc + 0.36], up: [-1, 0.05, -0.15], fwd: [0, -0.35, -1], spine: [[-0.9, 0.2, -0.35], [0, -0.4, -1]], head: [[-0.85, 0.15, -0.5], [0.2, -0.6, -1]],
          armR: { ik: LOVERS.at(K, 'spine_03', [-0.1, 1.28, 0.1]), pole: [0.2, 1, 0] }, armL: [[-0.5, -0.2, -0.3], [-0.8, 0.1, -0.2]],
          legR: [[0.65, 0.1, -0.75], [0.75, -0.3, -0.2]], legL: [[1, 0.02, 0.08], [0.9, 0.06, 0.3], null, [1, 0.1, 0.1]] }) };
    }
  }
};
