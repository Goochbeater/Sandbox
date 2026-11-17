/* ============================================================================
   SPOREHEART — src/char_veil_anim.js : THE POPPIED VEIL — move set (forms I + II)

   Pose-to-pose animation authored against the real rig:
     * every key is a full-body POSE; legs are solved with 2-bone IK so the feet land exactly where the pose
       says (planted feet through lunges, crouches, kneels), feet stay flat unless a pitch is given;
     * sword hands are AIMED: a pose names the direction the blade must point (root space) and the wrist is
       solved from the posed arm chain;
     * keys carry the ease of the move INTO them, so timing reads as: anticipation (slow in) → strike (outExpo,
       2–3 frames) → overshoot/settle (outBack). Hair, coat, tapes and cables follow through via verlet.
   G.veilAnim(anim, rig, form) is called by char_veil.js; registers the clips on the animator.
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  const PI = Math.PI, TAU = PI * 2;

  G.veilAnim = function (anim, rig, form) {
    const THREE = G.THREE, F2 = form === 2;
    const B = rig.bones;
    const NAMES = ["hips", "chest", "neck", "head",
      "armR.sh", "armR.el", "armR.hand", "armL.sh", "armL.el", "armL.hand",
      "legR.hip", "legR.knee", "legR.foot", "legL.hip", "legL.knee", "legL.foot"];
    const REST = {};
    for (const n of NAMES) REST[n] = { r: [B[n].rotation.x, B[n].rotation.y, B[n].rotation.z], p: [B[n].position.x, B[n].position.y, B[n].position.z] };
    const L1 = Math.abs(B["legL.knee"].position.y), L2 = Math.abs(B["legL.foot"].position.y);
    const ANKLE = REST.hips.p[1] + B["legL.hip"].position.y - L1 - L2;          // rest ankle height above the ground
    const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
    const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();
    const m1 = new THREE.Matrix4(), e1 = new THREE.Euler(0, 0, 0, "XYZ"), UP = new THREE.Vector3(0, 1, 0);
    const setRot = (n, r) => B[n].rotation.set(r[0], r[1], r[2]);
    const upd = () => rig.root.updateMatrixWorld(true);

    /* ---- leg IK: place the ankle at a root-space target, knee forward, then flatten the foot ---- */
    function solveLeg(S, tgt, yaw, pitch) {
      const hip = B["leg" + S + ".hip"], knee = B["leg" + S + ".knee"], foot = B["leg" + S + ".foot"];
      hip.rotation.set(0, 0, 0); knee.rotation.set(0, 0, 0); foot.rotation.set(0, 0, 0); upd();
      m1.copy(B.hips.matrixWorld).invert();
      v1.copy(tgt).applyMatrix4(m1).sub(hip.position);                          // target in hips-local, relative to the hip joint
      let L = v1.length(); const maxL = L1 + L2 - 0.004;
      if (L > maxL) { v1.multiplyScalar(maxL / L); L = maxL; }
      if (L < 0.12) L = 0.12;
      const flex = PI - Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - L * L) / (2 * L1 * L2))));
      const A = L1 + L2 * Math.cos(flex), Bz = -L2 * Math.sin(flex);
      const phi = Math.asin(Math.max(-1, Math.min(1, v1.x / Math.max(0.001, A))));
      const a = Math.atan2(v1.z, v1.y) - Math.atan2(Bz, -A * Math.cos(phi));
      hip.rotation.set(a, 0, phi); knee.rotation.set(flex, 0, 0); upd();
      knee.getWorldQuaternion(q1).invert();                                     // foot: flat on the ground, toes along yaw (+pitch)
      e1.set(pitch || 0, yaw || 0, 0, "YXZ"); q2.setFromEuler(e1);
      foot.quaternion.copy(q1.multiply(q2)); e1.setFromQuaternion(foot.quaternion, "XYZ"); foot.rotation.set(e1.x, e1.y, e1.z);
    }

    /* ---- wrist: turn the hand so the blade (prop origin → tip) points along a root-space direction ---- */
    function aimBlade(S, dir, spin) {
      const hand = B["arm" + S + ".hand"], prop = B["prop" + S], tip = B[S === "R" ? "bladeTip" : "bladeTipL"];
      if (!prop || !tip || prop.parent !== hand) return;
      hand.rotation.set(0, 0, 0); upd();
      prop.getWorldPosition(v1); tip.getWorldPosition(v2).sub(v1).normalize();
      v3.set(dir[0], dir[1], dir[2]).normalize(); if (spin) v3.applyAxisAngle(UP, spin);
      q1.setFromUnitVectors(v2, v3);
      hand.getWorldQuaternion(q2); hand.parent.getWorldQuaternion(q3).invert();
      hand.quaternion.copy(q3.multiply(q1).multiply(q2)); e1.setFromQuaternion(hand.quaternion, "XYZ"); hand.rotation.set(e1.x, e1.y, e1.z);
    }

    /* ---- pose → bone values ----
       P = { hp:[x,y,z] hips offset, hr:[x,y,z] hips rot, spin: extra whole-body yaw, ch, nk, hd: spine offsets,
             R/L: { sh:[x,y,z] abs shoulder euler, el: elbow flex (neg), blade:[dir] | hand:[euler] },
             fR/fL: [x, z, lift, yaw, pitch] ankle target in the (spun) root frame, scl:[x,y,z] hips scale } */
    const DEF_R = F2 ? { sh: [0.25, 0, -0.55], el: -0.45 } : { sh: [0.15, 0, -0.25], el: -0.35 };
    const DEF_L = F2 ? { sh: [0.25, 0, 0.55], el: -0.45 } : { sh: [-0.10, 0, 0.22], el: -0.6 };
    function applyPose(P) {
      const sp = P.spin || 0, hp = P.hp || [0, 0, 0], hr = P.hr || [0, 0, 0];
      B.hips.position.set(REST.hips.p[0] + hp[0], REST.hips.p[1] + hp[1], REST.hips.p[2] + hp[2]);
      if (sp) { v1.set(hp[0], 0, hp[2]).applyAxisAngle(UP, sp); B.hips.position.x = REST.hips.p[0] + v1.x; B.hips.position.z = REST.hips.p[2] + v1.z; }
      B.hips.rotation.set(hr[0], hr[1] + sp, hr[2]);
      setRot("chest", P.ch || [0, 0, 0]); setRot("neck", P.nk || [0, 0, 0]); setRot("head", P.hd || [0, 0, 0]);
      for (const S of ["R", "L"]) {
        const A = P[S] || (S === "R" ? DEF_R : DEF_L);
        setRot("arm" + S + ".sh", A.sh); B["arm" + S + ".el"].rotation.set(A.el === undefined ? -0.3 : A.el, 0, 0);
        setRot("arm" + S + ".hand", A.hand || [0, 0, 0]);
      }
      upd();
      for (const S of ["R", "L"]) { const A = P[S]; if (A && A.blade) aimBlade(S, A.blade, sp); }
      for (const S of ["R", "L"]) {
        const f = P["f" + S] || [S === "R" ? -0.085 : 0.085, 0, 0, 0, 0];
        v2.set(f[0], 0, f[1]); if (sp) v2.applyAxisAngle(UP, sp);
        v2.y = ANKLE + (f[2] || 0);
        solveLeg(S, v2.clone(), (f[3] || 0) + sp, f[4] || 0);
      }
    }
    function capture(P) {
      applyPose(P);
      const out = {};
      for (const n of NAMES) out[n] = [B[n].rotation.x - REST[n].r[0], B[n].rotation.y - REST[n].r[1], B[n].rotation.z - REST[n].r[2]];
      out.$pos = [B.hips.position.x - REST.hips.p[0], B.hips.position.y - REST.hips.p[1], B.hips.position.z - REST.hips.p[2]];
      out.$scl = P.scl || [1, 1, 1];
      return out;
    }
    function restore() { for (const n of NAMES) { setRot(n, REST[n].r); B[n].position.set(REST[n].p[0], REST[n].p[1], REST[n].p[2]); } upd(); }

    /* keys: [[t, pose, easeInto], ...]  →  kit keyframes (eulers unwrapped so nothing spins the long way round) */
    function clip(name, keys, opts) {
      const caps = keys.map((k) => capture(k[1]));
      const kfs = [];
      for (const n of NAMES) {
        let prev = null;
        for (let i = 0; i < keys.length; i++) {
          const r = caps[i][n].slice();
          if (prev) for (let c = 0; c < 3; c++) { while (r[c] - prev[c] > PI) r[c] -= TAU; while (r[c] - prev[c] < -PI) r[c] += TAU; }
          prev = r;
          const ease = i + 1 < keys.length ? (keys[i + 1][2] || "inOutQuad") : "linear";
          const kf = { t: keys[i][0], bone: n, rot: r, ease: ease };
          if (n === "hips") { kf.pos = caps[i].$pos; kf.scl = caps[i].$scl; }
          kfs.push(kf);
        }
      }
      anim.addClip(name, kfs, opts || { loop: false });
    }
    const mix = (a, b) => Object.assign({}, a, b);

    /* ======================================================================
       STANCES
       ====================================================================== */
    const READY = F2 ? {
      hp: [0, -0.13, 0], hr: [0.05, -0.22, 0], ch: [0.17, -0.1, 0], nk: [-0.05, 0.1, 0], hd: [-0.12, 0.22, 0],
      R: { sh: [0.22, 0, -0.62], el: -0.5, blade: [-0.5, -0.62, 0.6] }, L: { sh: [0.2, 0, 0.62], el: -0.5, blade: [0.5, -0.62, 0.6] },
      fL: [0.19, 0.2, 0, 0.15], fR: [-0.21, -0.22, 0, -0.5]
    } : {
      hp: [0, -0.07, 0], hr: [0, -0.3, 0], ch: [0.06, -0.12, 0], nk: [0, 0.15, 0], hd: [0.02, 0.27, 0],
      R: { sh: [0.16, 0, -0.26], el: -0.38, blade: [0.36, -0.76, 0.54] }, L: { sh: [-0.12, 0, 0.2], el: -0.62 },
      fL: [0.12, 0.17, 0, 0.1], fR: [-0.16, -0.2, 0, -0.5]
    };
    const P = (o) => mix(READY, o);

    /* ---------------------------------------------------------------- idle */
    clip("idle", [
      [0.0, READY],
      [1.6, P({ hp: [0.012, READY.hp[1] - 0.012, 0], ch: [READY.ch[0] + 0.035, READY.ch[1] - 0.03, 0.012], hd: [READY.hd[0] - 0.02, READY.hd[1] + 0.05, 0.02],
        R: mix(READY.R, { blade: F2 ? [-0.46, -0.66, 0.6] : [0.3, -0.8, 0.52] }) }), "inOutQuad"],
      [3.2, READY, "inOutQuad"]
    ], { loop: true });

    /* ---------------------------------------------------------------- walk (stalk) */
    {
      const st = F2 ? 0.3 : 0.26, hy = READY.hp[1], w = F2 ? 0.16 : 0.11;
      const K = (zl, ll, zr, lr, y, sway, armF) => P({
        hp: [sway, y, 0], hr: [READY.hr[0], READY.hr[1] + sway * 2.4, -sway * 1.2], ch: [READY.ch[0], READY.ch[1] - sway * 3.2, sway * 0.8],
        fL: [w, zl, ll, 0.08, ll ? 0.25 : 0], fR: [-w, zr, lr, -0.2, lr ? 0.25 : 0],
        L: F2 ? READY.L : { sh: [-0.12 - armF * 0.5, 0, 0.2], el: -0.62 + armF * 0.2 }
      });
      clip("walk", [
        [0.0, K(st, 0, -st, 0, hy - 0.03, 0.02, 0.3)],
        [0.225, K(0.02, 0, 0.0, 0.11, hy + 0.012, 0.026, 0), "inOutQuad"],
        [0.45, K(-st, 0, st, 0, hy - 0.03, -0.02, -0.3), "inOutQuad"],
        [0.675, K(0.0, 0.11, 0.02, 0, hy + 0.012, -0.026, 0), "inOutQuad"],
        [0.9, K(st, 0, -st, 0, hy - 0.03, 0.02, 0.3), "inOutQuad"]
      ], { loop: true });
    }

    /* ---------------------------------------------------------------- run (blade trailing) */
    {
      const RA = F2 ? { sh: [0.95, 0, -0.5], el: -0.25, blade: [-0.3, -0.1, -0.95] } : { sh: [0.8, 0, -0.38], el: -0.3, blade: [-0.2, -0.22, -0.95] };
      const LA = F2 ? { sh: [0.95, 0, 0.5], el: -0.25, blade: [0.3, -0.1, -0.95] } : null;
      const K = (zl, ll, pl, zr, lr, pr, y, tw) => ({
        hp: [0, y, 0.05], hr: [0.38, tw, 0], ch: [0.22, -tw * 1.7, 0], nk: [-0.2, 0, 0], hd: [-0.36, tw * 0.7, 0],
        R: RA, L: LA || { sh: [-0.3 + tw * 3.2, 0, 0.25], el: -1.35 },
        fL: [0.09, zl, ll, 0, pl], fR: [-0.09, zr, lr, 0, pr]
      });
      clip("run", [
        [0.0, K(0.42, 0.02, -0.25, -0.36, 0.3, 1.0, -0.2, 0.16)],
        [0.125, K(0.0, 0, 0.1, 0.12, 0.26, 0.5, -0.13, 0.05), "linear"],
        [0.25, K(-0.36, 0.3, 1.0, 0.42, 0.02, -0.25, -0.2, -0.16), "linear"],
        [0.375, K(0.12, 0.26, 0.5, 0.0, 0, 0.1, -0.13, -0.05), "linear"],
        [0.5, K(0.42, 0.02, -0.25, -0.36, 0.3, 1.0, -0.2, 0.16), "linear"]
      ], { loop: true });
    }

    /* ---------------------------------------------------------------- dash wind-up (iai draw) + dash */
    const IAI = {
      hp: [0, -0.3, -0.06], hr: [0.12, 0.6, 0], ch: [0.34, 0.4, 0], nk: [-0.1, -0.3, 0], hd: [-0.22, -0.62, 0],
      R: { sh: [-0.55, 0.95, 0.5], el: -1.25, blade: [0.55, -0.12, -0.83] },
      L: F2 ? { sh: [0.5, 0, 0.75], el: -0.7, blade: [0.75, -0.2, -0.63] } : { sh: [0.55, 0, 0.5], el: -0.9 },
      fR: [-0.1, 0.36, 0, 0], fL: [0.2, -0.42, 0, 0.7, 0.35]
    };
    clip("dashWind", [
      [0.0, READY],
      [0.2, mix(IAI, { hp: [0, -0.22, -0.02] }), "outCubic"],
      [0.5, IAI, "inOutQuad"],
      [0.9, mix(IAI, { hp: [0, -0.32, -0.08], ch: [0.38, 0.44, 0] }), "inOutQuad"]
    ]);
    const DASH = {
      hp: [0, -0.34, 0.16], hr: [0.8, -0.2, 0], ch: [0.25, -0.32, 0], nk: [-0.3, 0.1, 0], hd: [-0.55, 0.35, 0],
      R: { sh: [1.0, 0, -1.15], el: -0.1, blade: [-0.9, 0.05, -0.42] },
      L: F2 ? { sh: [1.0, 0, 1.15], el: -0.1, blade: [0.9, 0.05, -0.42] } : { sh: [1.15, 0, 0.5], el: -0.25 },
      fL: [0.1, 0.56, 0.04, 0, -0.2], fR: [-0.12, -0.6, 0.34, 0, 1.1]
    };
    clip("dash", [
      [0.0, mix(IAI, { hp: [0, -0.3, 0.05] })],
      [0.06, DASH, "outExpo"],
      [0.3, mix(DASH, { hp: [0, -0.3, 0.2], hr: [0.86, -0.25, 0] }), "linear"]
    ]);

    /* ---------------------------------------------------------------- slashes */
    const S1_WIND = {
      hp: [0, -0.16, -0.05], hr: [0, -0.58, 0], ch: [0.02, -0.62, -0.05], nk: [0, 0.4, 0], hd: [0, 0.72, 0],
      R: { sh: [-1.25, 0, -1.6], el: -0.75, blade: [-0.72, 0.3, -0.62] },
      L: F2 ? { sh: [-1.0, 0, 0.35], el: -0.9, blade: [0.25, 0.25, 0.94] } : { sh: [-0.9, 0, 0.25], el: -0.7 },
      fL: [0.13, 0.22, 0, 0.1], fR: [-0.2, -0.26, 0, -0.6]
    };
    const S1_HIT = {
      hp: [0, -0.2, 0.12], hr: [0.08, 0.05, 0], ch: [0.14, 0.1, 0], nk: [0, 0, 0], hd: [0, -0.1, 0],
      R: { sh: [-1.35, 0, -0.35], el: -0.12, blade: [0.25, -0.02, 0.97] },
      L: F2 ? { sh: [-0.4, 0, 0.9], el: -0.6, blade: [0.9, 0.1, 0.4] } : { sh: [0.5, 0, 0.6], el: -0.5 },
      fL: [0.13, 0.36, 0, 0.1], fR: [-0.2, -0.3, 0, -0.6]
    };
    const S1_END = {
      hp: [0.03, -0.22, 0.14], hr: [0.1, 0.5, 0], ch: [0.18, 0.62, 0.05], nk: [0, -0.35, 0], hd: [0, -0.7, 0],
      R: { sh: [-1.2, 0, 0.72], el: -0.3, blade: [0.93, -0.12, 0.33] },
      L: F2 ? { sh: [0.6, 0, 1.2], el: -0.3, blade: [0.8, 0.1, -0.6] } : { sh: [0.85, 0, 0.75], el: -0.4 },
      fL: [0.13, 0.36, 0, 0.1], fR: [-0.2, -0.3, 0, -0.6, 0.2]
    };
    clip("slash1", [
      [0.0, READY],
      [0.09, S1_WIND, "outCubic"],
      [0.13, mix(S1_WIND, { ch: [0.02, -0.68, -0.05] }), "linear"],
      [0.18, S1_HIT, "inCubic"],
      [0.23, S1_END, "outExpo"],
      [0.33, mix(S1_END, { ch: [0.16, 0.54, 0.04], hp: [0.03, -0.2, 0.12] }), "outBack"],
      [0.5, READY, "inOutQuad"]
    ]);
    /* backhand: starts where slash1 ends (they chain), cuts left→right */
    const S2_HIT = {
      hp: [0, -0.2, 0.12], hr: [0.08, 0.0, 0], ch: [0.12, -0.05, 0], hd: [0, 0.05, 0],
      R: { sh: [-1.35, 0, -0.2], el: -0.12, blade: [-0.3, 0.02, 0.95] },
      L: F2 ? { sh: [-1.3, 0, 0.3], el: -0.15, blade: [0.3, 0, 0.95] } : { sh: [0.3, 0, 0.5], el: -0.6 },
      fL: [0.15, 0.2, 0, 0.2], fR: [-0.17, 0.3, 0, -0.2]
    };
    const S2_END = {
      hp: [-0.03, -0.2, 0.12], hr: [0.08, -0.5, 0], ch: [0.16, -0.6, -0.05], nk: [0, 0.35, 0], hd: [0, 0.7, 0],
      R: { sh: [-1.15, 0, -1.55], el: -0.2, blade: [-0.95, -0.05, 0.3] },
      L: F2 ? { sh: [-1.2, 0, -0.5], el: -0.3, blade: [-0.9, -0.1, 0.4] } : { sh: [-0.5, 0, 0.3], el: -0.9 },
      fL: [0.15, 0.2, 0, 0.2, 0.2], fR: [-0.17, 0.3, 0, -0.2]
    };
    clip("slash2", [
      [0.0, READY],
      [0.09, mix(S1_END, { hp: [0.03, -0.18, 0.0], fL: [0.15, 0.2, 0, 0.2], fR: [-0.17, -0.1, 0.08, -0.3] }), "outCubic"],
      [0.13, mix(S1_END, { hp: [0.03, -0.2, 0.02], ch: [0.18, 0.7, 0.05], fL: [0.15, 0.2, 0, 0.2], fR: [-0.17, 0.1, 0.06, -0.2] }), "linear"],
      [0.18, S2_HIT, "inCubic"],
      [0.23, S2_END, "outExpo"],
      [0.33, mix(S2_END, { ch: [0.14, -0.52, -0.04] }), "outBack"],
      [0.5, READY, "inOutQuad"]
    ]);
    /* finisher: high guard → diagonal kesa cut into a deep lunge */
    const S3_WIND = {
      hp: [0, -0.04, -0.1], hr: [-0.1, -0.5, 0], ch: [-0.22, -0.4, -0.08], nk: [0.1, 0.3, 0], hd: [0.15, 0.6, 0],
      R: { sh: [-2.75, 0, -0.55], el: -1.0, blade: [-0.35, 0.55, -0.76] },
      L: F2 ? { sh: [-2.75, 0, 0.55], el: -1.0, blade: [0.35, 0.55, -0.76] } : { sh: [-1.35, 0, 0.1], el: -0.25 },
      fL: [0.13, 0.12, 0, 0.1], fR: [-0.18, -0.3, 0, -0.5, 0.3]
    };
    const S3_END = {
      hp: [0.02, -0.42, 0.22], hr: [0.42, 0.45, 0], ch: [0.5, 0.45, 0.1], nk: [-0.3, -0.25, 0], hd: [-0.45, -0.5, 0],
      R: { sh: [-0.55, 0, 0.55], el: -0.15, blade: [0.72, -0.6, 0.35] },
      L: F2 ? { sh: [-0.55, 0, -0.4], el: -0.15, blade: [-0.72, -0.6, 0.35] } : { sh: [1.1, 0, 0.7], el: -0.3 },
      fL: [0.14, 0.52, 0, 0.1], fR: [-0.2, -0.46, 0, -0.5, 0.5]
    };
    clip("slash3", [
      [0.0, READY],
      [0.16, S3_WIND, "outCubic"],
      [0.24, mix(S3_WIND, { hp: [0, -0.02, -0.12], ch: [-0.26, -0.44, -0.08] }), "inOutQuad"],
      [0.31, S3_END, "outExpo"],
      [0.42, mix(S3_END, { hp: [0.02, -0.38, 0.2], ch: [0.44, 0.4, 0.08] }), "outBack"],
      [0.52, mix(S3_END, { hp: [0.02, -0.38, 0.2], ch: [0.44, 0.4, 0.08] }), "linear"],
      [0.7, READY, "inOutQuad"]
    ]);

    /* ---------------------------------------------------------------- overhead (long readable wind-up → cleave at 0.85) */
    const OH_UP = {
      hp: [0, -0.02, -0.12], hr: [-0.16, -0.12, 0], ch: [-0.3, -0.08, 0], nk: [0.12, 0.05, 0], hd: [0.2, 0.15, 0],
      R: { sh: [-2.95, 0, -0.28], el: -0.75, blade: [0, 0.45, -0.9] },
      L: F2 ? { sh: [-2.95, 0, 0.28], el: -0.75, blade: [0, 0.45, -0.9] } : { sh: [-1.55, 0, 0.05], el: -0.12 },
      fL: [0.12, 0.2, 0, 0.05], fR: [-0.15, -0.3, 0.03, -0.4, 0.45]
    };
    const OH_DOWN = {
      hp: [0, -0.5, 0.26], hr: [0.6, 0.0, 0], ch: [0.55, 0.0, 0], nk: [-0.35, 0, 0], hd: [-0.5, 0, 0],
      R: { sh: [-0.75, 0, -0.1], el: -0.15, blade: [0.06, -0.72, 0.7] },
      L: F2 ? { sh: [-0.75, 0, 0.1], el: -0.15, blade: [-0.06, -0.72, 0.7] } : { sh: [0.9, 0, 0.7], el: -0.4 },
      fL: [0.14, 0.6, 0, 0.05], fR: [-0.18, -0.5, 0, -0.4, 0.7]
    };
    clip("overhead", [
      [0.0, READY],
      [0.3, OH_UP, "outCubic"],
      [0.55, mix(OH_UP, { hp: [0, 0.0, -0.15], ch: [-0.36, -0.08, 0], R: mix(OH_UP.R, { blade: [0, 0.3, -0.95] }) }), "inOutQuad"],
      [0.8, mix(OH_UP, { hp: [0, -0.01, -0.17], ch: [-0.4, -0.08, 0.02] }), "inOutQuad"],
      [0.87, OH_DOWN, "outExpo"],
      [0.98, mix(OH_DOWN, { hp: [0, -0.46, 0.24], ch: [0.5, 0, 0] }), "outBack"],
      [1.3, mix(OH_DOWN, { hp: [0, -0.46, 0.24], ch: [0.52, 0, 0] }), "linear"],
      [1.6, READY, "inOutQuad"]
    ]);

    /* ---------------------------------------------------------------- thrust */
    const TH_BACK = {
      hp: [0, -0.26, -0.16], hr: [0.1, -0.7, 0], ch: [0.12, -0.5, 0], nk: [0, 0.4, 0], hd: [-0.05, 0.75, 0],
      R: { sh: [0.5, 0, -0.5], el: -1.7, blade: [0.1, 0.05, 0.99] },
      L: F2 ? { sh: [0.5, 0, 0.5], el: -1.7, blade: [-0.1, 0.05, 0.99] } : { sh: [-1.45, 0, 0.15], el: -0.2 },
      fL: [0.13, 0.26, 0, 0.1], fR: [-0.2, -0.36, 0, -0.7]
    };
    const TH_OUT = {
      hp: [0, -0.4, 0.3], hr: [0.45, 0.35, 0], ch: [0.3, 0.45, 0], nk: [-0.3, -0.3, 0], hd: [-0.42, -0.45, 0],
      R: { sh: [-1.6, 0, 0.12], el: -0.03, blade: [0, 0.02, 1] },
      L: F2 ? { sh: [-1.6, 0, -0.12], el: -0.03, blade: [0, 0.02, 1] } : { sh: [1.3, 0, 0.45], el: -0.15 },
      fL: [0.13, 0.66, 0, 0.05], fR: [-0.2, -0.5, 0, -0.5, 0.75]
    };
    clip("thrust", [
      [0.0, READY],
      [0.2, TH_BACK, "outCubic"],
      [0.3, mix(TH_BACK, { hp: [0, -0.28, -0.19] }), "inOutQuad"],
      [0.36, TH_OUT, "outExpo"],
      [0.46, mix(TH_OUT, { hp: [0, -0.38, 0.27] }), "outBack"],
      [0.56, mix(TH_OUT, { hp: [0, -0.38, 0.27] }), "linear"],
      [0.75, READY, "inOutQuad"]
    ]);

    /* ---------------------------------------------------------------- spin (wind-up, then a full 360° sweep) */
    const SP_WIND = mix(IAI, {
      hp: [0, -0.26, 0], hr: [0.1, 0.75, 0], ch: [0.2, 0.55, 0], nk: [-0.05, -0.45, 0], hd: [-0.15, -0.85, 0],
      fR: [-0.12, 0.2, 0, 0], fL: [0.2, -0.3, 0, 0.6, 0.3]
    });
    clip("spinWind", [
      [0.0, READY],
      [0.3, SP_WIND, "outCubic"],
      [0.9, mix(SP_WIND, { hp: [0, -0.3, 0], ch: [0.24, 0.62, 0] }), "inOutQuad"]
    ]);
    const SPIN = (a) => ({
      spin: a, hp: [0, -0.24, 0], hr: [0.12, 0, 0.1], ch: [0.1, -0.3, 0], nk: [0, -0.2, 0], hd: [-0.1, -0.3, 0],
      R: { sh: [-1.5, 0, -1.2], el: -0.08, blade: [-0.98, 0.0, 0.2] },
      L: F2 ? { sh: [-1.5, 0, 1.2], el: -0.08, blade: [0.98, 0.0, -0.2] } : { sh: [0.3, 0, 1.3], el: -0.3 },
      fL: [0.1, 0.0, 0, 0], fR: [-0.3, -0.12, 0.2, -0.3, 0.6]
    });
    clip("spin", [
      [0.0, SP_WIND],
      [0.07, SPIN(-0.5), "inCubic"],
      [0.17, SPIN(-PI * 0.75), "linear"],
      [0.27, SPIN(-PI * 1.4), "linear"],
      [0.37, SPIN(-TAU + 0.25), "linear"],
      [0.5, mix(S1_END, { spin: -TAU, hp: [0.03, -0.3, 0.05] }), "outCubic"],
      [0.62, mix(S1_END, { spin: -TAU, hp: [0.03, -0.26, 0.05] }), "outBack"],
      [0.8, mix(READY, { spin: -TAU }), "inOutQuad"]
    ]);

    /* ---------------------------------------------------------------- teleports (anime vanish: twist, pinch to a line) */
    clip("teleportOut", [
      [0.0, READY],
      [0.1, mix(IAI, { hp: [0, -0.34, 0], scl: [1.12, 0.86, 1.12] }), "outCubic"],
      [0.2, mix(READY, { spin: 2.4, hp: [0, 0.0, 0], scl: [0.35, 1.3, 0.35] }), "inCubic"],
      [0.28, mix(READY, { spin: 4.6, hp: [0, 0.02, 0], scl: [0.02, 1.7, 0.02] }), "linear"]
    ]);
    clip("teleportIn", [
      [0.0, mix(READY, { spin: -3.2, hp: [0, 0.02, 0], scl: [0.02, 1.7, 0.02] })],
      [0.08, mix(READY, { spin: -1.2, hp: [0, 0.0, 0], scl: [0.5, 1.25, 0.5] }), "linear"],
      [0.16, mix(IAI, { hp: [0, -0.36, 0], scl: [1.15, 0.84, 1.15] }), "outCubic"],
      [0.3, mix(IAI, { hp: [0, -0.28, 0], scl: [1, 1, 1] }), "outBack"]
    ]);

    /* ---------------------------------------------------------------- reactions */
    const HURT = {
      hp: [0, -0.1, -0.1], hr: [-0.16, -0.1, 0.06], ch: [-0.34, 0.2, 0.08], nk: [-0.15, 0, 0], hd: [-0.3, -0.2, 0.1],
      R: { sh: [0.2, 0, -0.75], el: -0.9, blade: [-0.4, -0.5, 0.75] },
      L: F2 ? { sh: [0.2, 0, 0.75], el: -0.9, blade: [0.4, -0.5, 0.75] } : { sh: [-0.4, 0, 0.7], el: -1.1 },
      fL: [0.12, 0.05, 0, 0.1], fR: [-0.18, -0.34, 0, -0.5]
    };
    clip("hurt", [
      [0.0, READY],
      [0.05, HURT, "outExpo"],
      [0.14, mix(HURT, { hp: [0, -0.12, -0.12] }), "outQuad"],
      [0.32, READY, "inOutQuad"]
    ]);
    const KNEEL = {
      hp: [0, -0.5, 0.02], hr: [0.2, 0.15, 0], ch: [0.46, 0.1, 0.04], nk: [0.2, 0, 0], hd: [0.35, 0.1, 0.05],
      R: { sh: [-0.5, 0, -0.5], el: -0.75, blade: [0.12, -0.97, 0.2] },
      L: F2 ? { sh: [-0.3, 0, 0.5], el: -0.6, blade: [0.3, -0.9, 0.3] } : { sh: [-0.15, 0, 0.35], el: -0.35 },
      fL: [0.16, 0.3, 0, 0.1], fR: [-0.14, -0.36, 0.07, -0.1, 1.2]
    };
    clip("stagger", [
      [0.0, KNEEL],
      [1.0, mix(KNEEL, { hp: [0.015, -0.515, 0.02], ch: [0.56, 0.06, 0.0], hd: [0.42, 0.0, -0.05] }), "inOutQuad"],
      [2.0, KNEEL, "inOutQuad"]
    ], { loop: true });

    /* ---------------------------------------------------------------- taunt */
    const POINT = {
      hp: [0, -0.02, 0], hr: [0, -0.5, 0], ch: [-0.06, -0.3, 0], nk: [0, 0.3, 0], hd: [-0.08, 0.5, 0.16],
      R: { sh: [-1.5, 0, -0.5], el: -0.1, blade: [0, 0.02, 1] },
      L: F2 ? { sh: [0.4, 0, 0.9], el: -0.3, blade: [0.6, -0.7, -0.3] } : { sh: [0.2, 0, 0.5], el: -1.3 },
      fL: [0.12, 0.2, 0, 0.1], fR: [-0.18, -0.24, 0, -0.7]
    };
    const flick = (u) => mix(POINT, { R: mix(POINT.R, { blade: [0, u, 1] }) });
    clip("taunt", [
      [0.0, READY],
      [0.3, POINT, "outBack"],
      [0.5, flick(0.3), "inOutQuad"], [0.62, flick(-0.02), "inOutQuad"],
      [0.76, flick(0.3), "inOutQuad"], [0.88, flick(-0.02), "inOutQuad"],
      [1.2, READY, "inOutQuad"]
    ]);

    /* ---------------------------------------------------------------- transform */
    const CURL = {
      hp: [0, -0.3, 0.02], hr: [0.3, 0, 0], ch: [0.6, 0, 0], nk: [0.25, 0, 0], hd: [0.4, 0, 0],
      R: { sh: [-0.9, 0.9, 0.4], el: -1.9, blade: [0.6, -0.5, -0.6] },
      L: F2 ? { sh: [-0.9, -0.9, -0.4], el: -1.9, blade: [-0.6, -0.5, -0.6] } : { sh: [-0.9, -0.9, -0.4], el: -1.9 },
      fL: [0.13, 0.05, 0, 0.2], fR: [-0.13, -0.05, 0, -0.2]
    };
    const ARCH = {
      hp: [0, -0.03, -0.04], hr: [-0.22, 0, 0], ch: [-0.5, 0, 0], nk: [-0.3, 0, 0], hd: [-0.55, 0, 0],
      R: { sh: [0.45, 0, -1.75], el: -0.25, blade: [-0.85, 0.5, -0.15] },
      L: F2 ? { sh: [0.45, 0, 1.75], el: -0.25, blade: [0.85, 0.5, -0.15] } : { sh: [0.45, 0, 1.75], el: -0.25 },
      fL: [0.2, 0.02, 0, 0.3], fR: [-0.2, -0.02, 0, -0.3]
    };
    clip("transform", [
      [0.0, READY],
      [0.35, CURL, "outCubic"],
      [0.6, mix(CURL, { hp: [0.01, -0.33, 0.02], ch: [0.66, 0.03, 0] }), "inOutQuad"],
      [0.85, mix(CURL, { hp: [-0.01, -0.34, 0.02], ch: [0.68, -0.03, 0] }), "inOutQuad"],
      [0.98, ARCH, "outExpo"],
      [1.12, mix(ARCH, { ch: [-0.44, 0, 0], hd: [-0.5, 0, 0] }), "outBack"],
      [1.4, mix(ARCH, { ch: [-0.52, 0.03, 0], hd: [-0.58, 0, 0.04] }), "inOutQuad"],
      [1.65, mix(ARCH, { ch: [-0.46, -0.03, 0], hd: [-0.52, 0, -0.04] }), "inOutQuad"],
      [2.0, READY, "inOutQuad"]
    ]);

    /* ---------------------------------------------------------------- cast (petals leave at 0.55) + storm loop */
    const GATHER = {
      hp: [0, -0.2, -0.06], hr: [0.05, -0.4, 0], ch: [0.25, -0.3, 0], nk: [0, 0.3, 0], hd: [0.05, 0.4, 0],
      R: { sh: [0.3, 0, -0.5], el: -0.6, blade: [-0.2, -0.9, 0.38] },
      L: F2 ? { sh: [-0.8, 0.5, 0.2], el: -1.6, blade: [-0.5, 0.6, 0.6] } : { sh: [-0.8, 0.5, 0.2], el: -1.7 },
      fL: [0.13, 0.15, 0, 0.1], fR: [-0.18, -0.25, 0, -0.5]
    };
    const RELEASE = {
      hp: [0, -0.12, 0.12], hr: [0.1, 0.25, 0], ch: [0.12, 0.3, 0], nk: [-0.1, -0.2, 0], hd: [-0.15, -0.3, 0],
      R: { sh: [0.5, 0, -0.9], el: -0.2, blade: [-0.8, -0.5, -0.3] },
      L: F2 ? { sh: [-1.75, 0, 0.1], el: -0.05, blade: [0, 0.35, 0.94] } : { sh: [-1.75, 0, 0.1], el: -0.05 },
      fL: [0.13, 0.34, 0, 0.1], fR: [-0.18, -0.3, 0, -0.5, 0.2]
    };
    clip("cast", [
      [0.0, READY],
      [0.25, GATHER, "outCubic"],
      [0.48, mix(GATHER, { hp: [0, -0.23, -0.08] }), "inOutQuad"],
      [0.56, RELEASE, "outExpo"],
      [0.68, mix(RELEASE, { hp: [0, -0.1, 0.1] }), "outBack"],
      [0.85, mix(RELEASE, { hp: [0, -0.1, 0.1] }), "linear"],
      [1.05, READY, "inOutQuad"]
    ]);
    const STORM = (k) => ({
      hp: [0, 0.1 + k * 0.03, 0], hr: [-0.12, 0, 0], ch: [-0.2 + k * 0.04, 0, 0], nk: [-0.1, 0, 0], hd: [-0.2, 0, 0],
      R: { sh: [-0.1, 0, -1.5 - k * 0.08], el: -0.1, blade: [-1, 0.12, 0] },
      L: F2 ? { sh: [-0.1, 0, 1.5 + k * 0.08], el: -0.1, blade: [1, 0.12, 0] } : { sh: [-0.1, 0, 1.5 + k * 0.08], el: -0.1 },
      fL: [0.1, 0.06, 0.22 + k * 0.03, 0.1, 0.75], fR: [-0.1, -0.1, 0.3 + k * 0.03, -0.1, 0.95]
    });
    clip("storm", [[0.0, STORM(0)], [0.6, STORM(1), "inOutQuad"], [1.2, STORM(0), "inOutQuad"]], { loop: true });

    /* ---------------------------------------------------------------- plunge (lands on the telegraph) */
    const PL_AIR = {
      hp: [0, 0.05, 0], hr: [0.5, 0, 0], ch: [0.3, 0, 0], hd: [-0.3, 0, 0],
      R: { sh: [-2.6, 0, -0.2], el: -1.2, blade: [0.05, -0.99, 0.1] },
      L: F2 ? { sh: [-2.6, 0, 0.2], el: -1.2, blade: [-0.05, -0.99, 0.1] } : { sh: [-2.4, 0, 0.3], el: -1.3 },
      fL: [0.12, 0.2, 0.5, 0, 0.6], fR: [-0.12, -0.25, 0.6, 0, 1.0]
    };
    const PL_LAND = {
      hp: [0, -0.52, 0.06], hr: [0.5, 0, 0], ch: [0.5, 0, 0], nk: [-0.2, 0, 0], hd: [-0.35, 0, 0],
      R: { sh: [-0.95, 0, -0.1], el: -0.5, blade: [0.05, -0.99, 0.12] },
      L: F2 ? { sh: [-0.95, 0, 0.1], el: -0.5, blade: [-0.05, -0.99, 0.12] } : { sh: [-0.2, 0, 0.6], el: -0.4 },
      fL: [0.18, 0.3, 0, 0.2], fR: [-0.2, -0.3, 0, -0.4, 0.6]
    };
    clip("plunge", [
      [0.0, PL_AIR],
      [0.06, PL_LAND, "inCubic"],
      [0.16, mix(PL_LAND, { hp: [0, -0.47, 0.06] }), "outBack"],
      [0.5, mix(PL_LAND, { hp: [0, -0.47, 0.06] }), "linear"],
      [0.8, READY, "inOutQuad"]
    ]);

    /* ---------------------------------------------------------------- death */
    const D_KNEES = mix(KNEEL, {
      hp: [0, -0.5, 0.0], hr: [-0.05, 0, 0], ch: [-0.2, 0, 0], hd: [-0.4, 0, 0.1],
      R: { sh: [0.15, 0, -0.5], el: -0.2, blade: [-0.6, -0.75, 0.2] }, L: F2 ? { sh: [0.15, 0, 0.5], el: -0.2, blade: [0.6, -0.75, 0.2] } : { sh: [0.15, 0, 0.45], el: -0.2 },
      fL: [0.16, -0.3, 0.07, 0.1, 1.2], fR: [-0.16, -0.32, 0.07, -0.1, 1.2]
    });
    const D_DOWN = {
      hp: [0.05, -0.8, 0.3], hr: [1.32, 0.2, 0.15], ch: [0.15, 0.15, 0], nk: [0.1, 0.4, 0], hd: [0.1, 0.7, 0],
      R: { sh: [-2.4, 0, -0.7], el: -0.4, blade: [-0.5, -0.05, 0.86] }, L: F2 ? { sh: [-0.4, 0, 1.2], el: -0.6, blade: [0.9, -0.05, 0.4] } : { sh: [-0.4, 0, 1.2], el: -0.6 },
      fL: [0.16, -0.5, 0.04, 0.3, 1.45], fR: [-0.14, -0.56, 0.04, -0.3, 1.45]
    };
    clip("death", [
      [0.0, READY],
      [0.12, HURT, "outExpo"],
      [0.5, mix(HURT, { hp: [0, -0.16, -0.16], ch: [-0.4, 0.25, 0.1] }), "outQuad"],
      [0.8, D_KNEES, "inQuad"],
      [0.92, mix(D_KNEES, { hp: [0, -0.47, 0.0] }), "outBack"],
      [1.3, mix(D_KNEES, { ch: [-0.1, 0.06, 0.04], hd: [-0.2, 0, 0.15] }), "inOutQuad"],
      [1.62, D_DOWN, "inCubic"],
      [1.72, mix(D_DOWN, { hp: [0.05, -0.78, 0.3] }), "outBack"],
      [2.2, D_DOWN, "linear"]
    ]);

    restore();
  };
})();
