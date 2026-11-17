/* ============================================================================
   SPOREHEART — src/char_veil_cloth.js : THE POPPIED VEIL — verlet garments
     form I  : raincoat hem (closed sheet round the hips), three red tapes, hime hair (back curtain + two locks)
     form II : five torn coat shreds off the shoulders, shoulder rags, six long tapes, hair streaming upward
   Replaces the hinged rigid panels (their bones are hidden) with real cloth that swings, lags and settles.
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  const PI = Math.PI, TAU = PI * 2;
  const sin = Math.sin, cos = Math.cos;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* polyline for a hanging chain: start p, initial euler r (XYZ), n segments, each bending a little more */
  function chainPts(THREE, p, r, n, seg, bend) {
    const pts = [p.slice()], q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], "XYZ"));
    const step = new THREE.Quaternion().setFromEuler(new THREE.Euler(bend === undefined ? 0.05 : bend, 0, 0, "XYZ")), d = new THREE.Vector3();
    let x = p[0], y = p[1], z = p[2];
    for (let i = 0; i < n; i++) {
      d.set(0, -seg, 0).applyQuaternion(q); x += d.x; y += d.y; z += d.z; pts.push([x, y, z]); q.multiply(step);
    }
    return pts;
  }
  const subdiv = (pts, k) => {       // linear resample: k points per segment → smoother ribbons
    const out = [];
    for (let i = 0; i + 1 < pts.length; i++) for (let j = 0; j < k; j++) { const t = j / k; out.push([lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t), lerp(pts[i][2], pts[i + 1][2], t)]); }
    out.push(pts[pts.length - 1].slice());
    return out;
  };

  G.veilCloth = function (rig, form, MT) {
    const THREE = G.THREE, F2 = form === 2, B = rig.bones;
    const hide = (n) => { if (B[n]) B[n].visible = false; };
    const sim = G.cloth.create(rig, {
      follow: 0.3, damp: 3.6,
      colliders: G.cloth.bodyColliders(rig, { hips: 0.115, chest: 0.118, head: 0, thigh: 0.068, shin: 0.05 })
        .concat([{ bone: "chest", a: [0, 0.2, -0.01], r: 0.11 }])
    });
    const hairMat = MT.hair.m, coatMat = MT.coat.m;
    const RED = 0xee5f56, RED_TIP = 0xa5b9b2;

    /* ------------------------------------------------------------------ hair (both forms) */
    hide("hairBack"); hide("lockL"); hide("lockR");
    {
      const lift = F2 ? 1 : 0;                                      // form II: the hair rides the heat, streaming up and back
      const W = (v) => 0.112 * (0.86 + 0.34 * sin(Math.min(1, v * 1.15) * PI * 0.5));
      sim.sheet({
        bone: "head", cols: 9, rows: 9, mat: hairMat, outline: 0, thickness: 0.004,
        rest(u, v) {
          const x = (u - 0.5) * 2 * W(v), a = lift ? 0.62 + 0.42 * v : 0.05 + 0.1 * v, L = 0.68 * v;
          return [x, 0.145 - cos(a) * L + (lift ? 0.02 : 0), -0.092 - sin(a) * L - 0.035 * sin(v * PI * 0.5) - Math.abs(x) * 0.12];
        },
        ks: F2 ? [0.6, 0.012] : [0.55, 0.035], maxDist: F2 ? [0.0, 0.5] : [0.0, 0.36], gs: F2 ? 0.1 : 0.7, kExp: 0.8, radius: 0.02
      });
      for (const sx of [1, -1]) {
        const base = [sx * 0.098, 0.14, 0.035];
        const raw = F2
          ? chainPts(THREE, base, [0.5, 0, sx * 0.3], 5, 0.12, 0.09)
          : [[0, 0, 0], [0.014 * sx, -0.1, 0.052], [0.026 * sx, -0.2, 0.108], [0.03 * sx, -0.29, 0.142], [0.03 * sx, -0.4, 0.164], [0.026 * sx, -0.5, 0.176], [0.022 * sx, -0.6, 0.176]].map((p) => [base[0] + p[0], base[1] + p[1], base[2] + p[2]]);
        sim.ribbon({
          bone: "head", pts: subdiv(raw, 2), mat: hairMat, outline: 0, ring: 4,
          side: F2 ? [sx * 0.9, 0, -0.4] : [sx * 0.75, 0, -0.66],
          profile: (v) => [(0.036 + 0.01 * sin(v * PI)) * (1 - 0.35 * v * v), 0.006],
          ks: F2 ? [0.6, 0.015] : [0.6, 0.04], maxDist: F2 ? [0, 0.4] : [0, 0.26], gs: F2 ? 0.15 : 0.8, tipLen: 0.05, radius: 0.016
        });
      }
    }

    if (!F2) {
      /* ---------------------------------------------------------------- raincoat hem: one closed sheet round the hips */
      for (let i = 0; i < 6; i++) hide("cloakBase." + i);
      const prof = [[0.03, 0.288, 0.198], [-0.04, 0.315, 0.225], [-0.10, 0.345, 0.262], [-0.17, 0.378, 0.3], [-0.25, 0.404, 0.33]];   // y, rx, rz
      const at = (v) => {
        const f = v * (prof.length - 1), i = Math.min(prof.length - 2, Math.floor(f)), t = f - i;
        return [lerp(prof[i][0], prof[i + 1][0], t), lerp(prof[i][1], prof[i + 1][1], t), lerp(prof[i][2], prof[i + 1][2], t)];
      };
      const sq = (c) => Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.25);      // same squarish section as the coat body
      sim.sheet({
        bone: "hips", cols: 22, rows: 6, loop: true, mat: coatMat, outline: 0.035, outlineColor: 0x0b0e15, thickness: 0.014,
        rest(u, v) {
          const th = u * TAU, p = at(v), fold = 1 + 0.035 * sin(th * 5 + 0.7) * v + 0.02 * sin(th * 9 + 2) * v;
          const hem = v > 0.99 ? -0.02 * (0.5 + 0.5 * sin(th * 4.5 + 0.6)) - 0.012 * (0.5 + 0.5 * sin(th * 11)) : 0;
          return [sq(sin(th)) * p[1] * fold, p[0] + hem, sq(cos(th)) * p[2] * fold];
        },
        ks: [0.5, 0.07], maxDist: [0.0, 0.2], gs: 0.85, kH: 0.9, kExp: 0.7, radius: 0.016
      });
      /* three red tapes hanging off the hem */
      const tape = (th, x, len, w) => {
        const p0 = [sq(sin(th)) * 0.335 + x * cos(th), -0.05, sq(cos(th)) * 0.252 - x * sin(th)];
        const out = [sin(th), 0, cos(th)];
        const pts = [];
        for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([p0[0] + out[0] * 0.075 * t, p0[1] - len * t, p0[2] + out[2] * 0.075 * t]); }
        sim.ribbon({ bone: "hips", pts: pts, color: RED, tip: RED_TIP, tipExp: 6, ring: 4, side: [cos(th), 0, -sin(th)], w: [w, w * 0.94], t: [0.006, 0.005],
          outline: 0.02, outlineColor: 0x5a1512, ks: [0.5, 0.03], maxDist: [0.0, 0.3], gs: 1, tipLen: 0.012, emissive: 0x3a0a08, emissiveIntensity: 0.5, radius: 0.02 });
      };
      tape(-0.2, 0, 0.44, 0.038); tape(TAU / 6 - 0.12, 0, 0.36, 0.03); tape(4 * TAU / 6 + 0.2, 0, 0.42, 0.03);
    } else {
      /* ---------------------------------------------------------------- form II: torn coat shreds, rags, long tapes */
      for (let i = 0; i < 5; i++) hide("cloakBase." + i);
      hide("ragL"); hide("ragR");
      for (const n of ["tapeA", "tapeB", "tapeC", "tapeD", "tapeE", "tapeF"]) hide(n + ".0");
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.095, topY = i % 2 ? 0.18 : 0.2, wide = 0.15 + (i % 2) * 0.02, len = 0.66 + (i % 2) * 0.1 - Math.abs(i - 2) * 0.04;
        const raw = chainPts(THREE, [x, topY, -0.115 - 0.01 * Math.abs(i - 2)], [0.32 + 0.05 * Math.abs(i - 2), (i - 2) * 0.16, 0], 4, len / 4, 0.1);
        sim.ribbon({
          bone: "chest", pts: subdiv(raw, 2), mat: coatMat, ring: 4, side: [1, 0, 0], outline: 0.03, outlineColor: 0x0b0e15,
          profile: (v) => [wide * 0.5 * (1 - 0.25 * v) * (v > 0.9 ? 0.55 : 1) * (1 + 0.12 * sin(v * 17 + i)), 0.007],
          ks: [0.5, 0.012], maxDist: [0.0, 0.62], gs: 0.42, tipLen: 0.09, kBend: 0.2, radius: 0.02
        });
      }
      for (const sx of [1, -1]) {
        const sh = sx > 0 ? "armL.sh" : "armR.sh";
        sim.ribbon({
          bone: sh, pts: subdiv(chainPts(THREE, [sx * 0.04, 0.05, -0.04], [0.25, 0, sx * 0.1], 3, 0.15, 0.12), 2), mat: coatMat, ring: 4, side: [1, 0, 0],
          outline: 0.03, outlineColor: 0x0b0e15, profile: (v) => [0.09 * (1 - 0.3 * v), 0.007], ks: [0.5, 0.02], maxDist: [0, 0.4], gs: 0.5, tipLen: 0.07, radius: 0.02
        });
      }
      const tapes = [
        ["hips", [0.05, 0.03, -0.125], [0.62, 0.22, 0.0], 0.84, 0.05], ["hips", [-0.05, 0.03, -0.125], [0.62, -0.22, 0.0], 0.84, 0.05],
        ["hips", [0.15, 0.02, 0.0], [0.5, 0.9, 0.2], 0.76, 0.04], ["hips", [-0.15, 0.02, 0.0], [0.5, -0.9, -0.2], 0.76, 0.04],
        ["chest", [0.17, 0.2, -0.06], [0.9, 0.5, 0.3], 0.8, 0.036], ["chest", [-0.17, 0.2, -0.06], [0.9, -0.5, -0.3], 0.8, 0.036]
      ];
      for (const [bone, p, r, len, w] of tapes) {
        sim.ribbon({
          bone: bone, pts: chainPts(THREE, p, r, 9, len / 9, 0.03), color: RED, tip: 0xff9a7a, ring: 4, side: [cos(r[1]), 0, -sin(r[1])], w: [w, w * 0.7], t: [0.006, 0.004],
          outline: 0.02, outlineColor: 0x5a1512, ks: [0.5, 0.008], maxDist: [0.0, 0.8], gs: 0.3, tipLen: 0.03, emissive: 0x5a1008, emissiveIntensity: 0.7, radius: 0.02
        });
      }
    }
    return sim;
  };
})();
