/* SPOREHEART — villains.js : Agent B
   The Poppied Veil (assassin miniboss), the Sporefather (3-phase boss) and spore imp adds.
   Owns: model builders, procedural animation, AI state machines, entity factory.
   Classic script IIFE -> window.G.villains.
   RULE: no THREE access at parse time; every THREE call happens inside a function. */
(function () {
  "use strict";
  const G = window.G;
  const U = G.util;
  const PAL = G.CONF.PAL;

  /* =====================================================================
     MODULE STATE
     ===================================================================== */
  let sceneRef = null;
  let MAT = null;
  let XG = null;
  const active = [];              // every live { entity, ai } pair spawned here

  function A() { return G.assets; }
  function T() { return G.THREE; }
  function geos() { return G.assets.geo(); }

  /* tiny shared extra geometries (created once, after boot) */
  function xg() {
    if (XG) return XG;
    const TH = T();
    XG = {
      oct: new TH.OctahedronGeometry(1, 0),
      dome: new TH.SphereGeometry(1, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
      domeLo: new TH.SphereGeometry(1, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.58),
      plane: new TH.PlaneGeometry(1, 1),
      ring: new TH.TorusGeometry(1, 0.1, 6, 22),
      cone3: new TH.ConeGeometry(1, 1, 3)
    };
    return XG;
  }

  function latheGeo(pts, segs, phiStart, phiLen) {
    const TH = T();
    const v = [];
    for (let i = 0; i < pts.length; i++) v.push(new TH.Vector2(pts[i][0], pts[i][1]));
    return new TH.LatheGeometry(v, segs || 20, phiStart || 0, phiLen || Math.PI * 2);
  }

  /* =====================================================================
     MATERIALS  (shared across all villain models — keeps draw-call state low)
     ===================================================================== */
  function mats() {
    if (MAT) return MAT;
    const a = A(), tx = a.tex, m = a.mat, TH = T();
    const toon = (c, o) => m.toon(c, o);
    MAT = {
      /* ---- assassin ---- */
      skin: toon(0xf2dccd),
      hair: toon(0xe9e9f0),
      helmet: toon(0x9aa7b6, { map: tx.wear() }),
      helmetDark: toon(0x66717f),
      metal: toon(0x3d4552),
      metalDark: toon(0x262b34),
      coat: toon(PAL.cloakBlack),
      coatIn: toon(0x0e1018, { side: TH.DoubleSide }),
      shirt: toon(PAL.inkNavy),
      red: toon(PAL.red),
      redGlow: m.glow(0xff4a38, 1.15),
      orange: toon(PAL.orange, { emissive: 0x5e2200, emissiveIntensity: 0.3 }),
      orangeGlow: m.glow(0xff7a33, 1.35),
      olive: toon(PAL.olive),
      boot: toon(0xefe9de),
      bone: toon(PAL.bone),
      ribbon: toon(0xc92f3f, { side: TH.DoubleSide, emissive: 0x4a0a12, emissiveIntensity: 0.35 }),
      blade: toon(0xe2eaf2),
      eyeRed: tx ? m.flat(0xffffff, {
        map: tx.animeEye(PAL.red), transparent: true, side: TH.DoubleSide, depthWrite: false
      }) : m.flat(0xffffff),
      poppy: toon(0xe0342f, { emissive: 0x4a0a0a, emissiveIntensity: 0.3 }),
      poppyCore: toon(0x201014),

      /* ---- spore kin ---- */
      moss: toon(0x33543c),
      mossDark: toon(PAL.deepMoss),
      mossLight: toon(0x4d7a52),
      cap: toon(PAL.capRed, { map: tx.capSpots(PAL.capRed, PAL.spotCream) }),
      capDark: toon(0x9e3026, { map: tx.capSpots(0x9e3026, PAL.spotCream) }),
      gills: toon(0xe9d8a8, { map: tx.gills(), side: TH.DoubleSide }),
      cream: toon(PAL.spotCream),
      sporeGlow: m.glow(0xff7a33, 1.3),
      pinkCore: m.glow(0xff9ec4, 1.7),
      hyphae: toon(0xd9c9a2),
      claw: toon(0x1d2320),
      vein: m.glow(0xff6a20, 1.5),
      maw: m.glow(0xff9ec4, 1.5),
      eyeGlow: m.glow(0xffb060, 1.5),
      impBody: toon(0xd8c9a4),
      impCap: toon(0xd64533, { map: tx.capSpots(0xd64533, 0xf5ead2) })
    };
    return MAT;
  }

  /* =====================================================================
     BUILD HELPERS
     ===================================================================== */
  function node(parent, name, x, y, z) {
    const TH = T();
    const g = new TH.Group();
    g.name = name || "node";
    g.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(g);
    return g;
  }

  function mk(parent, geo, mat, o) {
    const TH = T();
    o = o || {};
    const mesh = new TH.Mesh(geo, mat);
    if (o.p) mesh.position.set(o.p[0], o.p[1], o.p[2]);
    if (o.r) mesh.rotation.set(o.r[0], o.r[1], o.r[2]);
    if (o.s !== undefined) {
      if (typeof o.s === "number") mesh.scale.setScalar(o.s);
      else mesh.scale.set(o.s[0], o.s[1], o.s[2]);
    }
    mesh.castShadow = o.shadow !== false;
    mesh.receiveShadow = o.shadow !== false;
    if (o.name) mesh.name = o.name;
    if (o.out) A().outline(mesh, o.out === true ? 0.02 : o.out, o.oc || 0x101216);
    if (parent) parent.add(mesh);
    return mesh;
  }

  /* cylinder between two local points (hyphae, antlers, cables) */
  function seg(parent, a, b, r, mat, o) {
    const TH = T();
    o = o || {};
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
    const mesh = new TH.Mesh(geos().cyl, mat);
    mesh.position.set((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    mesh.scale.set(r, len, r);
    const up = new TH.Vector3(0, 1, 0);
    const dir = new TH.Vector3(dx / len, dy / len, dz / len);
    mesh.quaternion.setFromUnitVectors(up, dir);
    mesh.castShadow = o.shadow !== false;
    mesh.receiveShadow = o.shadow !== false;
    if (o.out) A().outline(mesh, o.out === true ? 0.02 : o.out, 0x101216);
    if (parent) parent.add(mesh);
    return mesh;
  }

  function sprite(parent, color, scale, opacity, x, y, z) {
    const s = A().glowSprite(color, scale, opacity);
    s.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(s);
    return s;
  }

  /* small red poppy flower */
  function poppy(parent, x, y, z, scale) {
    const g = node(parent, "poppy", x, y, z);
    g.scale.setScalar(scale || 1);
    mk(g, geos().sphereLo, mats().poppyCore, { p: [0, 0, 0], s: [0.022, 0.018, 0.022], shadow: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      mk(g, geos().sphereLo, mats().poppy, {
        p: [Math.sin(a) * 0.032, 0.006, Math.cos(a) * 0.032],
        s: [0.03, 0.012, 0.042], r: [0.55, a, 0], shadow: false
      });
    }
    return g;
  }

  /* ---- long streaming ribbon: chained pivot nodes, wave them procedurally ---- */
  function buildRibbons(parent, count, segCount, segLen, width, phase0) {
    const out = [];
    for (let r = 0; r < count; r++) {
      let p = node(parent, "ribbonRoot", 0, 0, 0);
      p.rotation.z = (r - (count - 1) * 0.5) * 0.18;
      p.rotation.x = 0.15;
      const nodes = [];
      for (let i = 0; i < segCount; i++) {
        const n = node(p, "ribbonSeg", 0, i === 0 ? 0 : -segLen, 0);
        const w = width * (1 - i * 0.05);
        mk(n, xg().plane, mats().ribbon, {
          p: [0, -segLen * 0.5, 0], s: [w, segLen, 1], shadow: false
        });
        nodes.push(n);
        p = n;
      }
      out.push({ nodes: nodes, phase: (phase0 || 0) + r * 1.7, sign: r % 2 ? -1 : 1 });
    }
    return out;
  }

  function waveRibbons(ribbons, t, amp, snap) {
    if (!ribbons) return;
    for (let r = 0; r < ribbons.length; r++) {
      const rb = ribbons[r], nodes = rb.nodes;
      for (let i = 0; i < nodes.length; i++) {
        const k = i / nodes.length;
        const s = Math.sin(t * 4.4 + rb.phase - i * 0.58);
        const c = Math.cos(t * 3.2 + rb.phase * 1.3 - i * 0.42);
        nodes[i].rotation.x = (snap || 0) * (1.2 - k * 0.55) + s * amp * (0.35 + k * 1.1);
        nodes[i].rotation.z = rb.sign * c * amp * (0.3 + k) * 0.85;
      }
    }
  }

  /* =====================================================================
     MODEL: ASSASSIN — "THE POPPIED VEIL"  (~1.85u, lean hammerhead duelist)
     ===================================================================== */
  function buildAssassin() {
    const TH = T(), g = geos(), m = mats(), x = xg();
    const root = new TH.Group();
    root.name = "assassin";
    const parts = { root: root, height: 1.85, radius: 0.42, team: "enemy" };

    /* ---------- skeleton ---------- */
    const hips = node(root, "hips", 0, 0.96, 0); parts.hips = hips;
    const chest = node(hips, "chest", 0, 0.14, 0); parts.chest = chest;
    const head = node(chest, "head", 0, 0.56, 0); parts.head = head;

    /* ---------- torso ---------- */
    mk(chest, new TH.CylinderGeometry(0.155, 0.125, 0.46, 12), m.shirt,
      { p: [0, 0.22, 0], out: 0.028 });
    mk(chest, g.sphere, m.shirt, { p: [0, 0.43, 0], s: [0.17, 0.08, 0.13] });
    mk(hips, g.cyl, m.metalDark, { p: [0, 0.04, 0], s: [0.163, 0.07, 0.135], shadow: false });
    mk(hips, g.box, m.orange, { p: [0, 0.04, 0.128], s: [0.075, 0.05, 0.02], shadow: false });

    /* olive skirt panel under the open coat */
    mk(hips, new TH.CylinderGeometry(0.17, 0.27, 0.34, 14, 1, true), m.olive,
      { p: [0, -0.30, 0], out: 0.016 });
    mk(hips, g.cyl, m.cream, { p: [0, -0.465, 0], s: [0.272, 0.022, 0.272], shadow: false });

    /* ---------- raincoat (open front so the emblem reads) ---------- */
    const coat = node(hips, "coat", 0, 0.02, 0); parts.coat = coat;
    mk(coat, latheGeo([[0.19, 0.20], [0.215, 0.04], [0.27, -0.14], [0.34, -0.32], [0.40, -0.48]],
      22, Math.PI * 0.10, Math.PI * 1.80), m.coatIn, { out: 0.012 });
    /* jagged hem */
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * 0.18 + (i / 10) * Math.PI * 1.64;
      mk(coat, x.cone3, m.coat, {
        p: [Math.sin(a) * 0.385, -0.545, Math.cos(a) * 0.385],
        s: [0.075, 0.16, 0.03], r: [Math.PI, a, 0], shadow: false
      });
    }
    /* shoulder mantle */
    mk(chest, g.sphere, m.coat, { p: [0.185, 0.42, 0], s: [0.13, 0.085, 0.15], out: 0.03 });
    mk(chest, g.sphere, m.coat, { p: [-0.185, 0.42, 0], s: [0.13, 0.085, 0.15], out: 0.03 });
    mk(chest, g.sphere, m.coat, { p: [0, 0.44, -0.05], s: [0.19, 0.09, 0.13] });

    /* high collar, gap facing forward */
    mk(chest, new TH.CylinderGeometry(0.30, 0.185, 0.30, 16, 1, true, Math.PI * 0.22, Math.PI * 1.56),
      m.coatIn, { p: [0, 0.47, 0], r: [0.05, 0, 0], out: 0.014 });
    /* red piping on collar lip */
    mk(chest, new TH.TorusGeometry(0.295, 0.012, 5, 24, Math.PI * 1.56), m.red,
      { p: [0, 0.615, 0], r: [Math.PI / 2, 0, Math.PI * 0.22], shadow: false });

    /* diamond straps + red emblem */
    mk(chest, g.box, m.red, { p: [-0.055, 0.26, 0.142], s: [0.05, 0.40, 0.016], r: [0, 0, 0.72], shadow: false });
    mk(chest, g.box, m.red, { p: [0.055, 0.26, 0.146], s: [0.05, 0.40, 0.016], r: [0, 0, -0.72], shadow: false });
    mk(chest, x.oct, m.orange, { p: [-0.075, 0.34, 0.155], s: [0.042, 0.058, 0.016], shadow: false });
    mk(chest, x.oct, m.orange, { p: [0.075, 0.26, 0.158], s: [0.042, 0.058, 0.016], shadow: false });
    mk(chest, x.oct, m.orange, { p: [0, 0.14, 0.158], s: [0.046, 0.062, 0.016], shadow: false });
    mk(chest, g.circle, m.redGlow, { p: [0, 0.345, 0.152], s: 0.062, shadow: false });
    mk(chest, x.ring, m.red, { p: [0, 0.345, 0.148], s: [0.082, 0.082, 0.082], shadow: false });
    /* dangling under-straps */
    mk(hips, g.box, m.red, { p: [-0.07, -0.12, 0.155], s: [0.035, 0.30, 0.012], r: [0.18, 0, 0.10], shadow: false });
    mk(hips, g.box, m.red, { p: [0.085, -0.16, 0.145], s: [0.03, 0.26, 0.012], r: [0.14, 0, -0.12], shadow: false });

    /* ---------- arms ---------- */
    const sleeveGeo = new TH.CylinderGeometry(0.115, 0.17, 0.38, 12, 1, true);
    const armL = {}, armR = {};
    armL.sh = node(chest, "armL.sh", 0.185, 0.38, 0);
    armL.sh.rotation.z = -0.10;
    mk(armL.sh, g.cyl, m.shirt, { p: [0, -0.12, 0], s: [0.052, 0.26, 0.052] });
    mk(armL.sh, sleeveGeo, m.coatIn, { p: [0, -0.17, 0], r: [0, 0, 0], out: 0.014 });
    armL.el = node(armL.sh, "armL.el", 0, -0.26, 0);
    armL.hand = node(armL.el, "armL.hand", 0, -0.25, 0);
    /* mechanical left forearm */
    mk(armL.el, g.cyl, m.metal, { p: [0, -0.115, 0], s: [0.062, 0.24, 0.062], out: 0.022 });
    mk(armL.el, g.torus, m.metalDark, { p: [0, -0.03, 0], s: [0.063, 0.063, 0.063], r: [Math.PI / 2, 0, 0], shadow: false });
    mk(armL.el, g.torus, m.metalDark, { p: [0, -0.16, 0], s: [0.066, 0.066, 0.066], r: [Math.PI / 2, 0, 0], shadow: false });
    mk(armL.el, g.box, m.metalDark, { p: [0, -0.10, 0.05], s: [0.05, 0.12, 0.04], shadow: false });
    mk(armL.el, g.sphereLo, m.redGlow, { p: [0.052, -0.15, 0.045], s: 0.026, shadow: false });
    sprite(armL.el, 0xff4433, 0.30, 0.8, 0.052, -0.15, 0.05);
    /* claw glove */
    mk(armL.hand, g.sphere, m.metalDark, { p: [0, -0.03, 0], s: [0.062, 0.06, 0.055] });
    for (let i = 0; i < 3; i++) {
      mk(armL.hand, g.cone, m.red, {
        p: [(i - 1) * 0.032, -0.11, 0.02], s: [0.017, 0.09, 0.017],
        r: [2.7 + (i - 1) * 0.12, 0, 0], shadow: false
      });
    }

    armR.sh = node(chest, "armR.sh", -0.185, 0.38, 0);
    armR.sh.rotation.z = 0.10;
    mk(armR.sh, g.cyl, m.shirt, { p: [0, -0.12, 0], s: [0.052, 0.26, 0.052] });
    mk(armR.sh, sleeveGeo, m.coatIn, { p: [0, -0.17, 0], out: 0.014 });
    armR.el = node(armR.sh, "armR.el", 0, -0.26, 0);
    mk(armR.el, g.cyl, m.shirt, { p: [0, -0.11, 0], s: [0.046, 0.23, 0.046] });
    armR.hand = node(armR.el, "armR.hand", 0, -0.245, 0);
    mk(armR.hand, g.sphere, m.metalDark, { p: [0, -0.035, 0], s: [0.055, 0.065, 0.05] });

    parts.armL = armL; parts.armR = armR;

    /* ---------- katana (propL) + scabbard ---------- */
    const propL = node(armL.hand, "propL", 0, -0.07, 0.02);
    propL.rotation.set(0.22, 0, 0.06);
    parts.propL = propL;
    const kat = node(propL, "katana", 0, 0, 0);
    mk(kat, g.cyl, m.metalDark, { p: [0, 0.02, 0], s: [0.026, 0.24, 0.026] });
    for (let i = 0; i < 5; i++) {
      mk(kat, g.torus, m.red, { p: [0, -0.08 + i * 0.048, 0], s: [0.028, 0.028, 0.028], r: [Math.PI / 2, 0.5, 0], shadow: false });
    }
    mk(kat, g.cyl, m.metal, { p: [0, 0.152, 0], s: [0.056, 0.018, 0.056] });
    mk(kat, g.sphereLo, m.bone, { p: [0, -0.115, 0], s: 0.028, shadow: false });
    let bp = kat;
    for (let i = 0; i < 3; i++) {
      const bn = node(bp, "bladeSeg", 0, i === 0 ? 0.16 : 0.34, 0);
      bn.rotation.x = -0.045;
      mk(bn, g.box, i === 2 ? m.blade : m.blade, { p: [0, 0.17, 0], s: [0.014, 0.345, 0.048], out: 0.04 });
      bp = bn;
    }
    mk(bp, g.cone, m.blade, { p: [0, 0.35, 0], s: [0.026, 0.1, 0.028], shadow: false });
    /* ribbons from the pommel */
    parts.ribbons = buildRibbons(propL, 2, 7, 0.155, 0.085, 0);
    parts.ribbons2 = buildRibbons(hips, 1, 6, 0.15, 0.07, 2.2);
    parts.ribbons2[0].nodes[0].position.set(0.19, 0.02, -0.16);

    /* scabbard at hip */
    const scab = node(hips, "scabbard", 0.17, -0.06, -0.04);
    scab.rotation.set(0.62, 0.05, 0.28);
    mk(scab, g.box, m.coat, { p: [0, -0.36, 0], s: [0.052, 0.86, 0.062], out: 0.02 });
    mk(scab, g.box, m.metal, { p: [0, 0.06, 0], s: [0.06, 0.05, 0.07], shadow: false });
    mk(scab, g.box, m.red, { p: [0, -0.30, 0], s: [0.058, 0.03, 0.068], shadow: false });

    /* ---------- legs ---------- */
    const legL = {}, legR = {};
    legL.hip = node(hips, "legL.hip", 0.10, -0.02, 0);
    mk(legL.hip, g.cyl, m.shirt, { p: [0, -0.23, 0], s: [0.072, 0.46, 0.072] });
    legL.knee = node(legL.hip, "legL.knee", 0, -0.46, 0);
    mk(legL.knee, new TH.CylinderGeometry(0.052, 0.075, 0.44, 10), m.boot, { p: [0, -0.22, 0], out: 0.026 });
    mk(legL.knee, g.sphere, m.boot, { p: [0, -0.02, 0.015], s: [0.077, 0.062, 0.075] });
    mk(legL.knee, g.box, m.metalDark, { p: [0, -0.30, 0.055], s: [0.05, 0.10, 0.02], shadow: false });
    legL.foot = node(legL.knee, "legL.foot", 0, -0.44, 0);
    mk(legL.foot, g.box, m.boot, { p: [0, 0.045, 0.045], s: [0.10, 0.09, 0.24], out: 0.022 });
    mk(legL.foot, g.box, m.metalDark, { p: [0, 0.004, 0.05], s: [0.105, 0.022, 0.25], shadow: false });

    legR.hip = node(hips, "legR.hip", -0.10, -0.02, 0);
    mk(legR.hip, g.cyl, m.shirt, { p: [0, -0.23, 0], s: [0.072, 0.46, 0.072] });
    legR.knee = node(legR.hip, "legR.knee", 0, -0.46, 0);
    mk(legR.knee, new TH.CylinderGeometry(0.052, 0.075, 0.44, 10), m.boot, { p: [0, -0.22, 0], out: 0.026 });
    mk(legR.knee, g.sphere, m.boot, { p: [0, -0.02, 0.015], s: [0.077, 0.062, 0.075] });
    mk(legR.knee, g.box, m.metalDark, { p: [0, -0.30, 0.055], s: [0.05, 0.10, 0.02], shadow: false });
    legR.foot = node(legR.knee, "legR.foot", 0, -0.44, 0);
    mk(legR.foot, g.box, m.boot, { p: [0, 0.045, 0.045], s: [0.10, 0.09, 0.24], out: 0.022 });
    mk(legR.foot, g.box, m.metalDark, { p: [0, 0.004, 0.05], s: [0.105, 0.022, 0.25], shadow: false });
    parts.legL = legL; parts.legR = legR;

    /* ---------- head ---------- */
    mk(head, g.sphere, m.skin, { p: [0, 0.02, 0.005], s: [0.125, 0.145, 0.12], out: 0.024 });
    /* ears */
    mk(head, g.sphereLo, m.skin, { p: [0.115, 0.02, -0.005], s: [0.018, 0.035, 0.026], shadow: false });
    mk(head, g.sphereLo, m.skin, { p: [-0.115, 0.02, -0.005], s: [0.018, 0.035, 0.026], shadow: false });

    /* hammerhead helmet */
    const helm = node(head, "helmet", 0, 0, 0); parts.helmet = helm;
    mk(helm, g.sphere, m.helmet, { p: [0, 0.062, -0.008], s: [0.158, 0.125, 0.168], out: 0.03 });
    mk(helm, g.sphere, m.helmet, { p: [0.195, 0.05, -0.012], s: [0.12, 0.082, 0.108], out: 0.032 });
    mk(helm, g.sphere, m.helmet, { p: [-0.195, 0.05, -0.012], s: [0.12, 0.082, 0.108], out: 0.032 });
    mk(helm, g.cyl, m.helmetDark, { p: [0.30, 0.05, -0.012], s: [0.08, 0.03, 0.08], r: [0, 0, Math.PI / 2] });
    mk(helm, g.cyl, m.helmetDark, { p: [-0.30, 0.05, -0.012], s: [0.08, 0.03, 0.08], r: [0, 0, Math.PI / 2] });
    /* orange circle decals on lobe faces */
    mk(helm, g.circle, m.orange, { p: [0.333, 0.05, 0.0], s: 0.046, r: [0, Math.PI / 2, 0], shadow: false });
    mk(helm, g.circle, m.orange, { p: [-0.333, 0.05, 0.0], s: 0.046, r: [0, -Math.PI / 2, 0], shadow: false });
    /* side lens modules */
    mk(helm, g.box, m.metal, { p: [0.285, -0.015, 0.085], s: [0.06, 0.045, 0.07], shadow: false });
    mk(helm, g.box, m.metal, { p: [-0.285, -0.015, 0.085], s: [0.06, 0.045, 0.07], shadow: false });
    mk(helm, g.sphereLo, m.redGlow, { p: [0.285, -0.015, 0.122], s: 0.02, shadow: false });
    mk(helm, g.sphereLo, m.redGlow, { p: [-0.285, -0.015, 0.122], s: 0.02, shadow: false });
    /* brim + crown ridge */
    mk(helm, g.box, m.helmet, { p: [0, 0.005, 0.115], s: [0.31, 0.028, 0.15], r: [0.14, 0, 0], out: 0.03 });
    mk(helm, g.box, m.helmetDark, { p: [0, 0.155, -0.01], s: [0.038, 0.03, 0.25], shadow: false });
    /* helmet wear scratches: tiny pale plates */
    mk(helm, g.box, m.helmetDark, { p: [0.09, 0.14, 0.09], s: [0.06, 0.012, 0.02], r: [0, 0.3, 0.2], shadow: false });
    mk(helm, g.box, m.helmetDark, { p: [-0.12, 0.10, 0.11], s: [0.05, 0.01, 0.018], r: [0, -0.2, -0.15], shadow: false });

    /* face: red anime eyes + cool smirk */
    mk(head, x.plane, m.eyeRed, { p: [0.053, 0.028, 0.124], s: [0.078, 0.088, 1], r: [0, 0.22, 0], shadow: false });
    mk(head, x.plane, m.eyeRed, { p: [-0.053, 0.028, 0.124], s: [0.078, 0.088, 1], r: [0, -0.22, 0], shadow: false });
    mk(head, g.box, m.poppyCore, { p: [0.022, -0.035, 0.128], s: [0.048, 0.008, 0.008], r: [0, 0, 0.2], shadow: false });
    /* black mechanical skull respirator */
    mk(head, g.sphere, m.metalDark, { p: [0, -0.085, 0.078], s: [0.088, 0.072, 0.062], out: 0.022 });
    mk(head, g.sphereLo, m.metal, { p: [0, -0.125, 0.06], s: [0.07, 0.035, 0.045], shadow: false });
    for (let i = 0; i < 6; i++) {
      mk(head, g.box, m.bone, {
        p: [-0.045 + i * 0.018, -0.088, 0.132], s: [0.012, 0.02, 0.012], shadow: false
      });
    }
    /* respirator tubes into the collar */
    seg(head, [0.06, -0.13, 0.055], [0.10, -0.24, 0.01], 0.012, m.metalDark, { shadow: false });
    seg(head, [-0.06, -0.13, 0.055], [-0.10, -0.24, 0.01], 0.012, m.metalDark, { shadow: false });
    /* bone-teeth grill collar */
    mk(chest, g.torus, m.metalDark, { p: [0, 0.50, 0], s: [0.145, 0.115, 0.145], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 7; i++) {
      const a = -0.9 + i * 0.3;
      mk(chest, g.box, m.bone, {
        p: [Math.sin(a) * 0.15, 0.505, Math.cos(a) * 0.145],
        s: [0.018, 0.05, 0.016], r: [0.15, a, 0], shadow: false
      });
    }

    /* ---------- long white hair ---------- */
    const hairBack = node(head, "hairBack", 0, 0.05, -0.10); parts.hairBack = hairBack;
    for (let i = 0; i < 5; i++) {
      const off = (i - 2) * 0.055;
      const strand = node(hairBack, "hairStrand", off, -0.04, -0.02);
      strand.rotation.z = off * 1.6;
      strand.rotation.x = 0.06 + Math.abs(off) * 0.4;
      mk(strand, g.box, m.hair, {
        p: [0, -0.44, 0], s: [0.085 - Math.abs(off) * 0.4, 0.88, 0.035], out: 0.04
      });
      mk(strand, x.cone3, m.hair, { p: [0, -0.90, 0], s: [0.035, 0.09, 0.02], r: [Math.PI, 0, 0], shadow: false });
    }
    /* side locks + bangs */
    mk(head, g.box, m.hair, { p: [0.125, -0.10, 0.045], s: [0.045, 0.34, 0.05], r: [0, 0, 0.08], shadow: false });
    mk(head, g.box, m.hair, { p: [-0.125, -0.10, 0.045], s: [0.045, 0.34, 0.05], r: [0, 0, -0.08], shadow: false });
    for (let i = 0; i < 3; i++) {
      mk(head, g.box, m.hair, {
        p: [(i - 1) * 0.062, 0.10, 0.100], s: [0.06, 0.13, 0.03],
        r: [0.12, (i - 1) * 0.25, (i - 1) * 0.22], shadow: false
      });
    }

    /* ---------- poppy accents ---------- */
    poppy(hips, 0.185, -0.04, 0.10, 1.15);
    poppy(chest, -0.16, 0.36, 0.115, 0.95);
    poppy(head, -0.16, 0.055, -0.03, 0.7);

    return { root: root, parts: parts, height: 1.85, radius: 0.42, team: "enemy" };
  }

  /* =====================================================================
     MODEL: BOSS 1 — SPORE-SHAMAN  (~2.2u, gliding, big spotted cap hat)
     ===================================================================== */
  function buildBoss1() {
    const TH = T(), g = geos(), m = mats(), x = xg();
    const root = new TH.Group();
    root.name = "boss1";
    const parts = { root: root, height: 2.2, radius: 0.62, team: "enemy", phase: 1 };

    const hips = node(root, "hips", 0, 1.05, 0); parts.hips = hips;
    const chest = node(hips, "chest", 0, 0.08, 0); parts.chest = chest;
    const head = node(chest, "head", 0, 0.46, 0.02); parts.head = head;

    /* ---- robe (glides, no feet) ---- */
    mk(hips, latheGeo([[0.235, 0.10], [0.28, -0.14], [0.36, -0.44], [0.47, -0.74], [0.545, -1.00]],
      22, 0, Math.PI * 2), m.mossDark, { out: 0.012, shadow: true });
    /* robe hem moss tufts */
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mk(hips, x.cone3, m.moss, {
        p: [Math.sin(a) * 0.52, -1.05, Math.cos(a) * 0.52],
        s: [0.10, 0.18, 0.05], r: [Math.PI, a, 0], shadow: false
      });
    }
    /* front stole */
    mk(hips, g.box, m.moss, { p: [0, -0.42, 0.33], s: [0.22, 0.86, 0.03], r: [-0.10, 0, 0], shadow: false });
    for (let i = 0; i < 3; i++) {
      mk(hips, x.oct, m.orangeGlow, { p: [0, -0.16 - i * 0.28, 0.35], s: [0.035, 0.05, 0.02], shadow: false });
    }

    /* ---- torso + moss wraps ---- */
    mk(chest, g.sphere, m.moss, { p: [0, 0.16, 0], s: [0.27, 0.30, 0.23], out: 0.026 });
    mk(chest, g.torus, m.mossDark, { p: [0, 0.02, 0], s: [0.235, 0.235, 0.20], r: [Math.PI / 2, 0, 0], shadow: false });
    mk(chest, g.torus, m.mossDark, { p: [0, 0.24, 0], s: [0.255, 0.255, 0.22], r: [Math.PI / 2, 0, 0.1], shadow: false });
    /* hanging moss strands */
    for (let i = 0; i < 5; i++) {
      const a = -0.8 + i * 0.4;
      mk(chest, g.box, m.mossLight, {
        p: [Math.sin(a) * 0.24, -0.14, Math.cos(a) * 0.22],
        s: [0.035, 0.22 + (i % 2) * 0.12, 0.02], r: [0.1, a, 0], shadow: false
      });
    }

    /* ---- arms (wide sleeves) ---- */
    const sleeve = new TH.CylinderGeometry(0.085, 0.19, 0.52, 12, 1, true);
    const armL = {}, armR = {};
    armL.sh = node(chest, "armL.sh", 0.245, 0.30, 0);
    armL.sh.rotation.z = -0.42;
    mk(armL.sh, sleeve, m.mossDark, { p: [0, -0.24, 0], out: 0.014 });
    armL.el = node(armL.sh, "armL.el", 0, -0.30, 0);
    armL.hand = node(armL.el, "armL.hand", 0, -0.30, 0);
    mk(armL.hand, g.sphereLo, m.mossLight, { p: [0, -0.02, 0], s: [0.06, 0.075, 0.055] });
    for (let i = 0; i < 3; i++) {
      mk(armL.hand, g.cone, m.cream, {
        p: [(i - 1) * 0.035, -0.10, 0.02], s: [0.016, 0.09, 0.016], r: [2.9, 0, 0], shadow: false
      });
    }
    armR.sh = node(chest, "armR.sh", -0.245, 0.30, 0);
    armR.sh.rotation.z = 0.42;
    mk(armR.sh, sleeve, m.mossDark, { p: [0, -0.24, 0], out: 0.014 });
    armR.el = node(armR.sh, "armR.el", 0, -0.30, 0);
    armR.hand = node(armR.el, "armR.hand", 0, -0.30, 0);
    mk(armR.hand, g.sphereLo, m.mossLight, { p: [0, -0.02, 0], s: [0.06, 0.075, 0.055] });
    parts.armL = armL; parts.armR = armR;

    /* ---- head ---- */
    mk(head, g.sphere, m.mossDark, { p: [0, 0.03, 0], s: [0.16, 0.17, 0.15], out: 0.024 });
    /* beard gills */
    for (let i = 0; i < 7; i++) {
      const a = -0.75 + i * 0.25;
      mk(head, g.box, m.gills, {
        p: [Math.sin(a) * 0.13, -0.13, Math.cos(a) * 0.11],
        s: [0.022, 0.13, 0.015], r: [0.35, a, 0], shadow: false
      });
    }
    mk(head, g.sphereLo, m.sporeGlow, { p: [0.055, 0.035, 0.135], s: 0.028, shadow: false });
    mk(head, g.sphereLo, m.sporeGlow, { p: [-0.055, 0.035, 0.135], s: 0.028, shadow: false });
    sprite(head, 0xff9a50, 0.22, 0.55, 0, 0.03, 0.14);

    /* ---- huge spotted cap hat ---- */
    const cap = node(head, "cap", 0, 0.11, 0); parts.cap = cap;
    mk(cap, x.dome, m.cap, { p: [0, 0, 0], s: [0.63, 0.50, 0.63], out: 0.012 });
    mk(cap, g.torus, m.capDark, { p: [0, 0.005, 0], s: [0.615, 0.615, 0.615], r: [Math.PI / 2, 0, 0], shadow: false });
    /* gill fringe */
    mk(cap, new TH.CylinderGeometry(0.58, 0.645, 0.13, 26, 1, true), m.gills,
      { p: [0, -0.06, 0], shadow: false });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      mk(cap, g.cone, m.gills, {
        p: [Math.sin(a) * 0.60, -0.14 - (i % 3) * 0.03, Math.cos(a) * 0.60],
        s: [0.035, 0.10 + (i % 3) * 0.04, 0.035], r: [Math.PI, a, 0], shadow: false
      });
    }
    mk(cap, g.cyl, m.cream, { p: [0, -0.01, 0], s: [0.10, 0.10, 0.10], shadow: false });
    /* stem into hat */
    mk(cap, g.cyl, m.cream, { p: [0, -0.03, 0], s: [0.155, 0.07, 0.155], shadow: false });

    /* ---- fused-shroom staff (propR) ---- */
    const propR = node(armR.hand, "propR", 0, -0.04, 0.02);
    propR.rotation.set(0.08, 0, 0.05);
    parts.propR = propR;
    mk(propR, g.cyl, m.mossDark, { p: [0, 0.45, 0], s: [0.032, 1.55, 0.032] });
    for (let i = 0; i < 4; i++) {
      mk(propR, g.torus, m.moss, {
        p: [0, -0.18 + i * 0.34, 0], s: [0.042, 0.042, 0.042],
        r: [Math.PI / 2, i * 0.7, 0], shadow: false
      });
    }
    mk(propR, g.cyl, m.cream, { p: [0, 1.27, 0], s: [0.055, 0.16, 0.055] });
    mk(propR, x.dome, m.cap, { p: [0, 1.35, 0], s: [0.22, 0.15, 0.22], out: 0.02 });
    mk(propR, g.torus, m.capDark, { p: [0, 1.35, 0], s: [0.215, 0.215, 0.215], r: [Math.PI / 2, 0, 0], shadow: false });
    mk(propR, new TH.CylinderGeometry(0.20, 0.225, 0.05, 16, 1, true), m.gills, { p: [0, 1.31, 0], shadow: false });
    sprite(propR, 0xffb060, 0.42, 0.75, 0, 1.36, 0);
    /* dangling bone charm */
    mk(propR, g.cyl, m.red, { p: [0.09, 0.98, 0], s: [0.006, 0.20, 0.006], r: [0, 0, 0.35], shadow: false });
    mk(propR, g.sphereLo, m.bone, { p: [0.135, 0.87, 0], s: [0.03, 0.03, 0.028], shadow: false });

    /* ---- drifting spore motes (animated by AI) ---- */
    parts.motes = [];
    for (let i = 0; i < 7; i++) {
      const s = sprite(root, i % 2 ? 0xff9a50 : 0xffd0a0, 0.16 + (i % 3) * 0.05, 0.7, 0, 0, 0);
      parts.motes.push({ s: s, r: 0.55 + (i % 4) * 0.22, y: 0.4 + i * 0.23, sp: 0.5 + i * 0.13, ph: i * 1.7 });
    }
    parts.cloak = [];

    return { root: root, parts: parts, height: 2.2, radius: 0.62, team: "enemy" };
  }

  /* =====================================================================
     MODEL: BOSS 2 — ANTLER-HYPHAE BRAWLER  (~2.6u, torn robe, claws)
     ===================================================================== */
  function antler(parent, side, bx, by, bz, s, withGlow) {
    const m = mats(), x = xg();
    const P = [
      [bx, by, bz],
      [bx + 0.20 * s * side, by + 0.26 * s, bz - 0.03 * s],
      [bx + 0.32 * s * side, by + 0.56 * s, bz + 0.02 * s],
      [bx + 0.38 * s * side, by + 0.86 * s, bz - 0.05 * s],
      [bx + 0.32 * s * side, by + 1.10 * s, bz + 0.05 * s]
    ];
    for (let i = 0; i < P.length - 1; i++) {
      seg(parent, P[i], P[i + 1], 0.055 * s * (1 - i * 0.13), m.hyphae, { shadow: false });
    }
    /* side branches */
    const B1 = [bx + 0.44 * s * side, by + 0.42 * s, bz + 0.20 * s];
    const B2 = [bx + 0.52 * s * side, by + 0.72 * s, bz - 0.20 * s];
    seg(parent, P[1], B1, 0.035 * s, m.hyphae, { shadow: false });
    seg(parent, P[2], B2, 0.032 * s, m.hyphae, { shadow: false });
    /* little mushroom caps at the tips */
    const tips = [P[3], P[4], B1, B2];
    for (let i = 0; i < tips.length; i++) {
      const tp = tips[i];
      mk(parent, x.domeLo, m.cap, { p: tp, s: [0.075 * s, 0.055 * s, 0.075 * s], shadow: false });
      if (withGlow) sprite(parent, 0xff9a50, 0.16 * s, 0.5, tp[0], tp[1] + 0.03, tp[2]);
    }
  }

  function buildBoss2() {
    const TH = T(), g = geos(), m = mats(), x = xg();
    const root = new TH.Group();
    root.name = "boss2";
    const parts = { root: root, height: 2.6, radius: 0.85, team: "enemy", phase: 2 };

    const hips = node(root, "hips", 0, 1.12, 0); parts.hips = hips;
    const chest = node(hips, "chest", 0, 0.14, 0.02); chest.rotation.x = 0.30; parts.chest = chest;
    const head = node(chest, "head", 0, 0.46, 0.19); parts.head = head;

    /* ---- legs (bent digitigrade) ---- */
    const legL = {}, legR = {};
    legL.hip = node(hips, "legL.hip", 0.21, -0.03, 0); legL.hip.rotation.x = 0.22;
    mk(legL.hip, new TH.CylinderGeometry(0.135, 0.10, 0.56, 10), m.mossDark, { p: [0, -0.28, 0], out: 0.024 });
    legL.knee = node(legL.hip, "legL.knee", 0, -0.56, 0); legL.knee.rotation.x = -0.44;
    mk(legL.knee, new TH.CylinderGeometry(0.095, 0.075, 0.54, 10), m.moss, { p: [0, -0.27, 0], out: 0.024 });
    mk(legL.knee, g.sphere, m.mossDark, { p: [0, -0.02, 0.02], s: [0.10, 0.09, 0.11] });
    legL.foot = node(legL.knee, "legL.foot", 0, -0.54, 0);
    legL.foot.rotation.x = 0.22;
    mk(legL.foot, g.box, m.claw, { p: [0, 0.06, 0.10], s: [0.15, 0.12, 0.32], out: 0.02 });
    for (let i = 0; i < 3; i++) {
      mk(legL.foot, g.cone, m.bone, {
        p: [(i - 1) * 0.05, 0.03, 0.28], s: [0.022, 0.12, 0.022], r: [Math.PI / 2, 0, 0], shadow: false
      });
    }
    legR.hip = node(hips, "legR.hip", -0.21, -0.03, 0); legR.hip.rotation.x = 0.22;
    mk(legR.hip, new TH.CylinderGeometry(0.135, 0.10, 0.56, 10), m.mossDark, { p: [0, -0.28, 0], out: 0.024 });
    legR.knee = node(legR.hip, "legR.knee", 0, -0.56, 0); legR.knee.rotation.x = -0.44;
    mk(legR.knee, new TH.CylinderGeometry(0.095, 0.075, 0.54, 10), m.moss, { p: [0, -0.27, 0], out: 0.024 });
    mk(legR.knee, g.sphere, m.mossDark, { p: [0, -0.02, 0.02], s: [0.10, 0.09, 0.11] });
    legR.foot = node(legR.knee, "legR.foot", 0, -0.54, 0);
    legR.foot.rotation.x = 0.22;
    mk(legR.foot, g.box, m.claw, { p: [0, 0.06, 0.10], s: [0.15, 0.12, 0.32], out: 0.02 });
    for (let i = 0; i < 3; i++) {
      mk(legR.foot, g.cone, m.bone, {
        p: [(i - 1) * 0.05, 0.03, 0.28], s: [0.022, 0.12, 0.022], r: [Math.PI / 2, 0, 0], shadow: false
      });
    }
    parts.legL = legL; parts.legR = legR;

    /* ---- torso: corded mycelium muscle ---- */
    mk(chest, g.sphere, m.mossDark, { p: [0, 0.22, 0], s: [0.42, 0.38, 0.31], out: 0.024 });
    mk(hips, g.sphere, m.mossDark, { p: [0, 0.02, 0], s: [0.28, 0.20, 0.22], out: 0.02 });
    /* muscle cords */
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      seg(chest, [-0.24 + t * 0.10, 0.44, 0.24], [0.16 + t * 0.06, 0.06, 0.26], 0.028, m.moss, { shadow: false });
      seg(chest, [0.24 - t * 0.10, 0.44, 0.24], [-0.16 - t * 0.06, 0.06, 0.26], 0.028, m.moss, { shadow: false });
    }
    /* glowing mycelium veins */
    const veinPts = [
      [[0.22, 0.44, 0.16], [0.06, 0.30, 0.30], [-0.06, 0.18, 0.31], [-0.02, 0.02, 0.24]],
      [[-0.24, 0.40, 0.14], [-0.10, 0.26, 0.29], [0.02, 0.12, 0.30]],
      [[0.20, 0.14, 0.22], [0.10, 0.00, 0.24], [0.18, -0.10, 0.16]]
    ];
    for (let v = 0; v < veinPts.length; v++) {
      const p = veinPts[v];
      for (let i = 0; i < p.length - 1; i++) seg(chest, p[i], p[i + 1], 0.013, m.vein, { shadow: false });
    }
    sprite(chest, 0xff6a20, 0.55, 0.4, 0.02, 0.26, 0.34);

    /* ---- torn robe panels ---- */
    const ragGeo = new TH.CylinderGeometry(0.30, 0.42, 0.72, 10, 1, true, 0, Math.PI * 2);
    mk(hips, ragGeo, m.moss, { p: [0, -0.30, 0], out: 0.012 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      if (i % 3 === 1) continue;
      mk(hips, x.cone3, m.mossDark, {
        p: [Math.sin(a) * 0.40, -0.70 - (i % 2) * 0.08, Math.cos(a) * 0.40],
        s: [0.10, 0.22 + (i % 3) * 0.06, 0.03], r: [Math.PI, a, 0], shadow: false
      });
    }
    /* shoulder moss mantle */
    mk(chest, g.sphere, m.moss, { p: [0.30, 0.42, -0.02], s: [0.18, 0.12, 0.18] });
    mk(chest, g.sphere, m.moss, { p: [-0.30, 0.42, -0.02], s: [0.18, 0.12, 0.18] });

    /* ---- long clawed arms ---- */
    const armL = {}, armR = {};
    armL.sh = node(chest, "armL.sh", 0.36, 0.34, 0.02);
    armL.sh.rotation.z = -0.55;
    mk(armL.sh, new TH.CylinderGeometry(0.115, 0.09, 0.50, 10), m.mossDark, { p: [0, -0.26, 0], out: 0.02 });
    for (let i = 0; i < 2; i++) seg(armL.sh, [0.02, -0.10 - i * 0.16, 0.09], [0.10, -0.14 - i * 0.16, 0.02], 0.012, m.vein, { shadow: false });
    armL.el = node(armL.sh, "armL.el", 0, -0.52, 0);
    armL.el.rotation.x = -0.43;
    mk(armL.el, new TH.CylinderGeometry(0.095, 0.075, 0.56, 10), m.moss, { p: [0, -0.28, 0], out: 0.02 });
    sprite(armL.el, 0xff6a20, 0.28, 0.5, 0, 0.02, 0);
    armL.hand = node(armL.el, "armL.hand", 0, -0.58, 0);
    mk(armL.hand, g.sphere, m.mossDark, { p: [0, -0.03, 0], s: [0.095, 0.085, 0.08] });
    for (let i = 0; i < 4; i++) {
      mk(armL.hand, g.cone, m.claw, {
        p: [(i - 1.5) * 0.042, -0.15, 0.03], s: [0.024, 0.22, 0.024],
        r: [2.75, 0, (i - 1.5) * 0.14], out: 0.04
      });
    }
    armR.sh = node(chest, "armR.sh", -0.36, 0.34, 0.02);
    armR.sh.rotation.z = 0.55;
    mk(armR.sh, new TH.CylinderGeometry(0.115, 0.09, 0.50, 10), m.mossDark, { p: [0, -0.26, 0], out: 0.02 });
    for (let i = 0; i < 2; i++) seg(armR.sh, [-0.02, -0.10 - i * 0.16, 0.09], [-0.10, -0.14 - i * 0.16, 0.02], 0.012, m.vein, { shadow: false });
    armR.el = node(armR.sh, "armR.el", 0, -0.52, 0);
    armR.el.rotation.x = -0.43;
    mk(armR.el, new TH.CylinderGeometry(0.095, 0.075, 0.56, 10), m.moss, { p: [0, -0.28, 0], out: 0.02 });
    sprite(armR.el, 0xff6a20, 0.28, 0.5, 0, 0.02, 0);
    armR.hand = node(armR.el, "armR.hand", 0, -0.58, 0);
    mk(armR.hand, g.sphere, m.mossDark, { p: [0, -0.03, 0], s: [0.095, 0.085, 0.08] });
    for (let i = 0; i < 4; i++) {
      mk(armR.hand, g.cone, m.claw, {
        p: [(i - 1.5) * 0.042, -0.15, 0.03], s: [0.024, 0.22, 0.024],
        r: [2.75, 0, (i - 1.5) * 0.14], out: 0.04
      });
    }
    parts.armL = armL; parts.armR = armR;

    /* ---- head: skull + antler-hyphae crown ---- */
    mk(head, g.sphere, m.mossDark, { p: [0, 0.05, 0], s: [0.18, 0.17, 0.20], out: 0.024 });
    mk(head, g.sphere, m.moss, { p: [0, -0.06, 0.10], s: [0.15, 0.10, 0.16], shadow: false });
    mk(head, g.sphere, m.maw, { p: [0, -0.08, 0.15], s: [0.10, 0.055, 0.08], shadow: false });
    for (let i = 0; i < 4; i++) {
      const a = -0.5 + (i % 2) * 0.5;
      const yy = 0.10 - Math.floor(i / 2) * 0.08;
      mk(head, g.sphereLo, m.sporeGlow, { p: [a * 0.7, yy, 0.175], s: 0.026, shadow: false });
    }
    sprite(head, 0xff6a20, 0.34, 0.55, 0, 0.02, 0.18);
    for (let i = 0; i < 5; i++) { /* teeth */
      mk(head, g.cone, m.bone, {
        p: [(i - 2) * 0.035, -0.135, 0.16], s: [0.012, 0.05, 0.012], r: [Math.PI, 0, 0], shadow: false
      });
    }
    antler(head, 1, 0.07, 0.14, -0.02, 0.95, true);
    antler(head, -1, -0.07, 0.14, -0.02, 0.95, true);
    parts.antlers = [];

    /* ---- glow motes ---- */
    parts.motes = [];
    for (let i = 0; i < 6; i++) {
      const s = sprite(root, 0xff7a33, 0.14 + (i % 3) * 0.04, 0.65, 0, 0, 0);
      parts.motes.push({ s: s, r: 0.7 + (i % 3) * 0.25, y: 0.5 + i * 0.22, sp: 0.6 + i * 0.11, ph: i * 2.1 });
    }
    parts.cloak = [];

    return { root: root, parts: parts, height: 2.6, radius: 0.85, team: "enemy" };
  }

  /* =====================================================================
     MODEL: BOSS 3 — THE SPOREFATHER BEAST  (~7.5u, breakable cap-plates)
     ===================================================================== */
  function buildBoss3() {
    const TH = T(), g = geos(), m = mats(), x = xg();
    const root = new TH.Group();
    root.name = "boss3";
    const parts = { root: root, height: 7.5, radius: 2.25, team: "enemy", phase: 3 };

    const hips = node(root, "hips", 0, 3.25, 0); parts.hips = hips;
    const chest = node(hips, "chest", 0, 0.55, 0); parts.chest = chest;
    const head = node(chest, "head", 0, 1.36, 0.16); parts.head = head;

    /* ---- pelvis + leg haunches ---- */
    mk(hips, g.sphere, m.mossDark, { p: [0, 0.02, 0], s: [0.92, 0.58, 0.62], out: 0.02 });
    mk(hips, g.torus, m.claw, { p: [0, 0.12, 0], s: [0.86, 0.86, 0.66], r: [Math.PI / 2, 0, 0], shadow: false });

    const legL = {}, legR = {};
    for (let side = 0; side < 2; side++) {
      const sgn = side === 0 ? 1 : -1;
      const leg = side === 0 ? legL : legR;
      const nm = side === 0 ? "legL" : "legR";
      leg.hip = node(hips, nm + ".hip", 0.60 * sgn, -0.12, 0);
      leg.hip.rotation.z = -0.06 * sgn;
      mk(leg.hip, new TH.CylinderGeometry(0.38, 0.30, 1.55, 12), m.mossDark, { p: [0, -0.78, 0], out: 0.016 });
      /* bark rings + shelf mushroom */
      for (let i = 0; i < 3; i++) {
        mk(leg.hip, g.torus, m.claw, {
          p: [0, -0.30 - i * 0.42, 0], s: [0.37 - i * 0.02, 0.37 - i * 0.02, 0.37 - i * 0.02],
          r: [Math.PI / 2, 0, 0], shadow: false
        });
      }
      mk(leg.hip, x.domeLo, m.cap, { p: [0.34 * sgn, -0.62, 0.02], s: [0.26, 0.18, 0.26], shadow: false });
      leg.knee = node(leg.hip, nm + ".knee", 0, -1.55, 0);
      leg.knee.rotation.x = 0.16;
      mk(leg.knee, g.sphere, m.moss, { p: [0, 0.02, 0.04], s: [0.34, 0.32, 0.36], out: 0.016 });
      mk(leg.knee, new TH.CylinderGeometry(0.29, 0.25, 1.50, 12), m.mossDark, { p: [0, -0.76, 0], out: 0.016 });
      seg(leg.knee, [0.18, -0.20, 0.20], [0.10, -0.90, 0.26], 0.022, m.vein, { shadow: false });
      leg.foot = node(leg.knee, nm + ".foot", 0, -1.50, 0);
      mk(leg.foot, g.box, m.mossDark, { p: [0, 0.10, 0.24], s: [0.55, 0.24, 0.85], out: 0.014 });
      for (let i = 0; i < 3; i++) {
        mk(leg.foot, g.cone, m.bone, {
          p: [(i - 1) * 0.15, 0.10, 0.68], s: [0.075, 0.34, 0.075],
          r: [Math.PI / 2, 0, 0], out: 0.04
        });
      }
    }
    parts.legL = legL; parts.legR = legR;

    /* ---- torso ---- */
    mk(chest, g.sphere, m.mossDark, { p: [0, 0.76, 0], s: [1.45, 1.28, 1.02], out: 0.012 });
    /* ribbed belly plates */
    for (let i = 0; i < 4; i++) {
      mk(chest, g.sphere, m.moss, {
        p: [0, 0.28 + i * 0.42, 0.78 - i * 0.04], s: [1.02 - i * 0.10, 0.14, 0.16], shadow: false
      });
    }
    /* spine plates (cap armor) */
    const spineYs = [1.52, 1.16, 0.80, 0.44, 0.08];
    for (let i = 0; i < spineYs.length; i++) {
      const scl = 0.55 - i * 0.07;
      const pl = mk(chest, x.domeLo, m.cap, {
        p: [0, spineYs[i], -0.82 - i * 0.05], s: [scl * 1.15, scl * 0.85, scl], r: [-1.05, 0, 0], out: 0.012
      });
      for (let k = 0; k < 2; k++) {
        mk(pl, g.cone, m.cream, {
          p: [(k - 0.5) * 1.1, 0.35, 0.05], s: [0.09, 0.42, 0.09], r: [-0.6, 0, (k - 0.5) * 0.25], shadow: false
        });
      }
    }
    /* chest core (hidden until both plates break) */
    const coreC = mk(chest, g.sphere, m.pinkCore, { p: [0, 0.82, 0.62], s: 0.30, shadow: false });
    coreC.visible = false; parts.coreC = coreC;
    parts.coreCGlow = sprite(chest, 0xff9ec4, 1.5, 0.0, 0, 0.82, 0.62);

    /* ---- shoulders + breakable cap plates ---- */
    const armL = {}, armR = {};
    parts.shoulders = [];
    for (let side = 0; side < 2; side++) {
      const sgn = side === 0 ? 1 : -1;
      const nm = side === 0 ? "L" : "R";
      const pivot = node(chest, "shoulder" + nm + "Pivot", 1.34 * sgn, 0.98, 0);
      pivot.rotation.z = -0.16 * sgn;
      parts["shoulder" + nm + "Pivot"] = pivot;
      mk(pivot, g.sphere, m.mossDark, { p: [0, 0, 0], s: [0.52, 0.48, 0.50], out: 0.016 });
      /* the plate itself — named for detach/break */
      const plate = mk(pivot, x.dome, m.cap, {
        p: [0.12 * sgn, 0.34, 0], s: [0.98, 0.72, 0.86], out: 0.01,
        name: "shoulder" + nm
      });
      parts["shoulder" + nm] = plate;
      for (let k = 0; k < 3; k++) {
        mk(plate, g.cone, m.cream, {
          p: [(-0.25 + k * 0.25) * 1.0, 0.72, (k - 1) * 0.30],
          s: [0.10, 0.55, 0.10], r: [-0.35, 0, (k - 1) * 0.3], shadow: false
        });
      }
      /* glowing core under the plate */
      const core = mk(pivot, g.sphere, m.pinkCore, {
        p: [0.12 * sgn, 0.34, 0], s: 0.40, shadow: false
      });
      core.visible = false;
      parts["core" + nm] = core;
      const cg = sprite(pivot, 0xff9ec4, 1.5, 0.0, 0.12 * sgn, 0.36, 0);
      parts["coreGlow" + nm] = cg;

      /* arm */
      const arm = side === 0 ? armL : armR;
      arm.sh = pivot;
      arm.el = node(pivot, nm === "L" ? "armL.el" : "armR.el", 0.06 * sgn, -0.95, 0.10);
      arm.el.rotation.x = -0.18;
      mk(pivot, new TH.CylinderGeometry(0.36, 0.30, 0.98, 12), m.mossDark, { p: [0, -0.50, 0], out: 0.014 });
      mk(arm.el, g.sphere, m.moss, { p: [0, 0, 0], s: [0.34, 0.33, 0.34] });
      mk(arm.el, new TH.CylinderGeometry(0.30, 0.26, 0.95, 12), m.mossDark, { p: [0, -0.48, 0], out: 0.014 });
      for (let i = 0; i < 2; i++) mk(arm.el, g.torus, m.claw, {
        p: [0, -0.25 - i * 0.35, 0], s: [0.31, 0.31, 0.31], r: [Math.PI / 2, 0, 0], shadow: false
      });
      seg(arm.el, [0.20 * sgn, -0.10, 0.16], [0.16 * sgn, -0.80, 0.22], 0.025, m.vein, { shadow: false });
      arm.hand = node(arm.el, nm === "L" ? "armL.hand" : "armR.hand", 0, -0.98, 0);
      mk(arm.hand, g.sphere, m.mossDark, { p: [0, -0.04, 0.04], s: [0.34, 0.30, 0.36], out: 0.014 });
      for (let i = 0; i < 3; i++) {
        mk(arm.hand, g.cone, m.bone, {
          p: [(i - 1) * 0.16, -0.22, 0.20], s: [0.085, 0.62, 0.085],
          r: [2.5, 0, (i - 1) * 0.18], out: 0.04
        });
      }
      sprite(arm.hand, 0xff6a20, 0.5, 0.4, 0, -0.15, 0.15);
    }
    parts.armL = armL; parts.armR = armR;

    /* ---- neck + beast head ---- */
    mk(chest, new TH.CylinderGeometry(0.42, 0.52, 0.55, 12), m.mossDark, { p: [0, 1.38, 0.10], out: 0.016 });
    mk(head, g.sphere, m.mossDark, { p: [0, 0.10, 0.04], s: [0.58, 0.52, 0.66], out: 0.014 });
    /* brow */
    mk(head, g.box, m.moss, { p: [0, 0.30, 0.36], s: [0.86, 0.18, 0.44], r: [-0.22, 0, 0], out: 0.012 });
    /* eyes (4) */
    for (let i = 0; i < 4; i++) {
      const sgn = i % 2 ? -1 : 1;
      const up = i < 2 ? 1 : 0;
      mk(head, g.sphereLo, m.sporeGlow, {
        p: [sgn * (up ? 0.28 : 0.40), up ? 0.16 : 0.02, 0.50], s: up ? 0.075 : 0.055, shadow: false
      });
      sprite(head, 0xffb060, up ? 0.38 : 0.28, 0.7, sgn * (up ? 0.28 : 0.40), up ? 0.16 : 0.02, 0.54);
    }
    /* snout maw */
    mk(head, g.box, m.mossDark, { p: [0, -0.10, 0.44], s: [0.62, 0.28, 0.52], out: 0.012 });
    mk(head, g.sphere, m.maw, { p: [0, -0.14, 0.60], s: [0.32, 0.16, 0.20], shadow: false });
    sprite(head, 0xff9ec4, 0.9, 0.5, 0, -0.12, 0.68);
    const jaw = node(head, "jaw", 0, -0.24, 0.18); parts.jaw = jaw;
    mk(jaw, g.box, m.mossDark, { p: [0, -0.04, 0.24], s: [0.58, 0.20, 0.56], out: 0.012 });
    for (let i = 0; i < 7; i++) {
      mk(jaw, g.cone, m.bone, {
        p: [(i - 3) * 0.075, 0.08, 0.46], s: [0.032, 0.14, 0.032], shadow: false
      });
    }
    for (let i = 0; i < 7; i++) {
      mk(head, g.cone, m.bone, {
        p: [(i - 3) * 0.075, -0.03, 0.62], s: [0.034, 0.16, 0.034], r: [Math.PI, 0, 0], shadow: false
      });
    }

    /* ---- crown of mushroom antlers ---- */
    antler(head, 1, 0.24, 0.38, -0.02, 1.35, true);
    antler(head, -1, -0.24, 0.38, -0.02, 1.35, true);
    antler(head, 1, 0.0, 0.42, 0.04, 1.55, true);
    parts.antlers = [];

    /* ---- scale-cue spore motes ---- */
    parts.motes = [];
    for (let i = 0; i < 12; i++) {
      const s = sprite(root, i % 3 ? 0xff9a50 : 0xff9ec4, 0.30 + (i % 4) * 0.10, 0.55, 0, 0, 0);
      parts.motes.push({ s: s, r: 2.8 + (i % 5) * 0.55, y: 0.8 + i * 0.55, sp: 0.18 + i * 0.03, ph: i * 0.9 });
    }
    parts.cloak = [];

    return { root: root, parts: parts, height: 7.5, radius: 2.25, team: "enemy" };
  }

  /* =====================================================================
     MODEL: SPORE IMP  (~0.7u, cute angry cap)
     ===================================================================== */
  function buildImp() {
    const TH = T(), g = geos(), m = mats(), x = xg();
    const root = new TH.Group();
    root.name = "imp";
    const parts = { root: root, height: 0.7, radius: 0.35, team: "enemy" };

    const hips = node(root, "hips", 0, 0.26, 0); parts.hips = hips;
    const chest = node(hips, "chest", 0, 0.02, 0); parts.chest = chest;
    const head = node(chest, "head", 0, 0.14, 0); parts.head = head;

    /* body */
    mk(hips, g.sphere, m.impBody, { p: [0, 0.02, 0], s: [0.17, 0.20, 0.16], out: 0.03 });
    /* little feet */
    const legL = {}, legR = {};
    for (let i = 0; i < 2; i++) {
      const leg = i ? legR : legL;
      leg.foot = node(hips, i ? "legR.foot" : "legL.foot", i ? -0.09 : 0.09, -0.18, 0.02);
      mk(leg.foot, g.sphere, m.mossDark, { p: [0, 0, 0.03], s: [0.065, 0.05, 0.10], out: 0.04 });
    }
    parts.legL = legL; parts.legR = legR;
    /* stubby arms */
    const armL = {}, armR = {};
    armL.sh = node(chest, "armL.sh", 0.145, 0.02, 0);
    armL.sh.rotation.z = -0.7;
    mk(armL.sh, g.sphere, m.impBody, { p: [0, -0.07, 0], s: [0.045, 0.09, 0.045], out: 0.04 });
    armR.sh = node(chest, "armR.sh", -0.145, 0.02, 0);
    armR.sh.rotation.z = 0.7;
    mk(armR.sh, g.sphere, m.impBody, { p: [0, -0.07, 0], s: [0.045, 0.09, 0.045], out: 0.04 });
    parts.armL = armL; parts.armR = armR;

    /* cute spotted cap */
    mk(head, g.sphere, m.impBody, { p: [0, 0.01, 0], s: [0.115, 0.10, 0.115], out: 0.03 });
    const cap = node(head, "cap", 0, 0.06, 0); parts.cap = cap;
    mk(cap, x.dome, m.impCap, { p: [0, 0, 0], s: [0.30, 0.22, 0.30], out: 0.03 });
    mk(cap, g.torus, m.capDark, { p: [0, 0, 0], s: [0.295, 0.295, 0.295], r: [Math.PI / 2, 0, 0], shadow: false });
    mk(cap, new TH.CylinderGeometry(0.28, 0.30, 0.05, 18, 1, true), m.gills, { p: [0, -0.02, 0], shadow: false });
    /* angry eyes */
    for (let i = 0; i < 2; i++) {
      const sgn = i ? -1 : 1;
      mk(head, g.sphereLo, m.poppyCore, { p: [sgn * 0.048, 0.035, 0.095], s: [0.026, 0.032, 0.02], shadow: false });
      mk(head, g.box, m.poppyCore, {
        p: [sgn * 0.052, 0.062, 0.10], s: [0.055, 0.014, 0.015], r: [0, 0, sgn * 0.5], shadow: false
      });
      mk(head, g.sphereLo, m.sporeGlow, { p: [sgn * 0.048, 0.032, 0.11], s: 0.012, shadow: false });
    }
    mk(head, g.box, m.poppyCore, { p: [0, -0.03, 0.10], s: [0.05, 0.012, 0.015], shadow: false });
    /* tiny spots glow */
    sprite(cap, 0xffb060, 0.16, 0.3, 0, 0.16, 0.10);

    return { root: root, parts: parts, height: 0.7, radius: 0.35, team: "enemy" };
  }

  /* ---- dispatcher ---- */
  function buildBoss(phase) {
    const p = phase === 3 ? 3 : phase === 2 ? 2 : 1;
    return p === 3 ? buildBoss3() : p === 2 ? buildBoss2() : buildBoss1();
  }

  /* =====================================================================
     TINY ANIMATION / TIMING / TELEGRAPH INFRASTRUCTURE
     ===================================================================== */

  /* scalar tween (used for windup progress, fades, leap arcs) */
  function Tween(v) {
    this.v = v || 0; this.a = this.v; this.b = this.v;
    this.t = 1; this.dur = 1; this.e = "outCubic";
  }
  Tween.prototype.to = function (b, dur, e) {
    this.a = this.v; this.b = b; this.t = 0;
    this.dur = Math.max(0.0001, dur || 0.2); this.e = e || "outCubic";
    return this;
  };
  Tween.prototype.set = function (v) { this.v = this.a = this.b = v; this.t = 1; return this; };
  Tween.prototype.update = function (dt) {
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / this.dur);
      this.v = this.a + (this.b - this.a) * U.ease(this.t, this.e);
    }
    return this.v;
  };

  /* deferred callbacks — closure allocation only at attack setup, never per frame */
  function Timers() { this.list = []; }
  Timers.prototype.after = function (t, fn) { this.list.push({ t: t, fn: fn }); };
  Timers.prototype.update = function (dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const it = l[i];
      it.t -= dt;
      if (it.t <= 0) {
        l.splice(i, 1);
        try { it.fn(); } catch (e) { console.error("[villains:timer]", e); }
      }
    }
  };
  Timers.prototype.clear = function () { this.list.length = 0; };

  /* telegraph meshes: pop in, pulse, fade, auto-remove */
  function Fx(parent) { this.parent = parent || null; this.items = []; }
  Fx.prototype._push = function (obj, life, kind, extra) {
    const it = { obj: obj, life: life, max: life, kind: kind, geo: obj.geometry || null, mat: obj.material || null };
    if (extra) { it.scale0 = extra.scale0 || 0; it.baseOpacity = extra.opacity || 0.75; }
    else it.baseOpacity = 0.75;
    this.items.push(it);
    if (this.parent) this.parent.add(obj);
    return obj;
  };
  Fx.prototype.ring = function (x, y, z, r, color, life) {
    const m = A().ringTelegraph(r, color);
    m.position.set(x, y + 0.07, z);
    const mat = m.material;
    mat.opacity = 0;
    this._push(m, life || 0.9, 1);
    return m;
  };
  Fx.prototype.line = function (x, y, z, angle, len, width, color, life) {
    const TH = T();
    const grp = new TH.Group();
    grp.position.set(x, y + 0.06, z);
    grp.rotation.y = angle;
    const mat = A().mat.flat(color, {
      transparent: true, opacity: 0.5, side: TH.DoubleSide,
      depthWrite: false, blending: TH.AdditiveBlending
    });
    const geo = new TH.PlaneGeometry(width, len);
    const mesh = new TH.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = len * 0.5;
    mesh.renderOrder = 5;
    grp.add(mesh);
    this.items.push({ obj: grp, life: life || 0.9, max: life || 0.9, kind: 2, geo: geo, mat: mat, baseOpacity: 0.6 });
    if (this.parent) this.parent.add(grp);
    return grp;
  };
  Fx.prototype.add = function (obj, life) { return this._push(obj, life || 0.5, 3); };
  Fx.prototype.update = function (dt) {
    const l = this.items;
    for (let i = l.length - 1; i >= 0; i--) {
      const it = l[i];
      it.life -= dt;
      if (it.life <= 0) {
        if (it.obj.parent) it.obj.parent.remove(it.obj);
        if (it.kind === 2) {
          if (it.geo && it.geo.dispose) it.geo.dispose();
          if (it.mat && it.mat.dispose) it.mat.dispose();
        }
        l.splice(i, 1);
        continue;
      }
      const k = 1 - it.life / it.max;
      if (it.kind === 1) {
        const grow = k < 0.22 ? U.ease(k / 0.22, "outBack") : 1;
        it.obj.scale.setScalar(Math.max(0.001, grow));
        it.obj.material.opacity = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(k * 26));
      } else if (it.kind === 2) {
        it.mat.opacity = (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(k * 30))) * (1 - k * 0.35);
      } else {
        it.obj.scale.setScalar(1 + k * 2.2);
        const mm = it.obj.material;
        if (mm) mm.opacity = 0.9 * (1 - k);
      }
    }
  };
  Fx.prototype.clear = function () {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it.obj.parent) it.obj.parent.remove(it.obj);
      if (it.kind === 2) {
        if (it.geo && it.geo.dispose) it.geo.dispose();
        if (it.mat && it.mat.dispose) it.mat.dispose();
      }
    }
    this.items.length = 0;
  };

  /* ---- pose driver: bones remember their build-time rotation, anim adds offsets ---- */
  function getNode(parts, path) {
    const segs = path.split(".");
    let n = parts;
    for (let i = 0; i < segs.length; i++) {
      if (!n) return null;
      n = n[segs[i]];
    }
    return n;
  }

  function RigPose(parts, names) {
    this.items = [];
    this.map = Object.create(null);
    for (let i = 0; i < names.length; i++) {
      const nd = getNode(parts, names[i]);
      if (!nd || !nd.rotation) continue;
      const it = {
        node: nd, name: names[i],
        bx: nd.rotation.x || 0, by: nd.rotation.y || 0, bz: nd.rotation.z || 0,
        x: 0, y: 0, z: 0, cx: 0, cy: 0, cz: 0
      };
      this.items.push(it);
      this.map[names[i]] = it;
    }
  }
  RigPose.prototype.clear = function () {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]; it.x = 0; it.y = 0; it.z = 0;
    }
  };
  RigPose.prototype.set = function (n, x, y, z) {
    const it = this.map[n]; if (!it) return;
    it.x = x || 0; it.y = y || 0; it.z = z || 0;
  };
  RigPose.prototype.add = function (n, x, y, z) {
    const it = this.map[n]; if (!it) return;
    it.x += x || 0; it.y += y || 0; it.z += z || 0;
  };
  RigPose.prototype.apply = function (dt, rate, snap) {
    const r = rate || 22;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i], node = it.node;
      if (snap) { it.cx = it.x; it.cy = it.y; it.cz = it.z; }
      else {
        it.cx = U.damp(it.cx, it.x, r, dt);
        it.cy = U.damp(it.cy, it.y, r, dt);
        it.cz = U.damp(it.cz, it.z, r, dt);
      }
      node.rotation.x = it.bx + it.cx;
      node.rotation.y = it.by + it.cy;
      node.rotation.z = it.bz + it.cz;
    }
  };

  /* =====================================================================
     WORLD / CONTEXT HELPERS
     ===================================================================== */
  let liveCtx = null;
  function getCtx() {
    if (!liveCtx) {
      liveCtx = {
        get player() { return G.player || (G.game && G.game.player) || null; },
        get world() { return G.world || null; },
        get combat() { return G.combat || null; },
        get vfx() { return G.vfx || null; },
        get bus() { return G.bus; },
        get sfx() { return G.sfx || null; },
        get scene() { return sceneRef || (G.game && G.game.scene) || null; }
      };
    }
    return liveCtx;
  }

  function getScene() {
    return sceneRef || (G.game && G.game.scene) || (G.world && G.world.scene) || null;
  }

  function heightAt(world, x, z, def) {
    if (world && typeof world.heightAt === "function") {
      const h = world.heightAt(x, z);
      if (typeof h === "number" && isFinite(h)) return h;
    }
    return def === undefined ? 0 : def;
  }

  /* move an object, push out of world circle-colliders, stay in the arena */
  function moveCircle(obj, dx, dz, radius, world) {
    let x = obj.position.x + dx;
    let z = obj.position.z + dz;
    if (world && world.colliders) {
      const cols = world.colliders;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        if (!c) continue;
        const cr = (c.r || c.radius || 0) + radius;
        const ax = x - (c.x || 0), az = z - (c.z || 0);
        const d2 = ax * ax + az * az;
        if (d2 < cr * cr) {
          const d = Math.sqrt(d2);
          if (d > 0.0001) {
            const push = (cr - d) / d;
            x += ax * push; z += az * push;
          } else {
            x += cr;
          }
        }
      }
    }
    if (world && world.arenaCenter) {
      const ac = world.arenaCenter;
      const R = world.arenaRadius || 24;
      const ax = x - ac.x, az = z - ac.z;
      const d = Math.sqrt(ax * ax + az * az);
      if (d > R * 0.97) {
        const s = (R * 0.97) / d;
        x = ac.x + ax * s; z = ac.z + az * s;
      }
    }
    obj.position.x = x;
    obj.position.z = z;
    obj.position.y = heightAt(world, x, z, obj.position.y);
  }

  function faceTo(obj, tx, tz, dt, rate) {
    const yaw = Math.atan2(tx - obj.position.x, tz - obj.position.z);
    obj.rotation.y = U.angleLerp(obj.rotation.y, yaw, 1 - Math.exp(-(rate || 8) * dt));
  }

  function playerPos(ctx, out) {
    const p = ctx && ctx.player;
    if (!p) return null;
    const o = p.object3D || p;
    if (!o || !o.position) return null;
    out.copy(o.position);
    return out;
  }

  function playerYaw(ctx) {
    const p = ctx && ctx.player;
    const o = p && (p.object3D || p);
    return (o && o.rotation && o.rotation.y) || 0;
  }

  /* =====================================================================
     ENTITY FACTORY (SPEC entity contract)
     ===================================================================== */
  function makeEntity(o) {
    const TH = T();
    const ctx = o.ctx || getCtx();
    const ent = {
      object3D: o.root,
      team: o.team || "enemy",
      radius: o.radius || 0.5,
      height: o.height || 1.8,
      hp: o.hp,
      maxHp: o.hp,
      alive: true,
      name: o.name || "enemy",
      kind: o.kind || o.name || "enemy",
      damageMul: 1,
      invuln: 0,
      flash: 0,
      stagger: 0,
      ai: o.ai || null,
      onHit: null,
      onDeath: o.onDeath || null,
      _hitPos: new TH.Vector3(),
      _dead: false
    };

    ent.flashSprite = A().glowSprite(0xffc8a0, Math.max(0.6, ent.height * 0.7), 0);
    ent.flashSprite.position.set(0, ent.height * 0.55, 0);
    ent.flashSprite.material.opacity = 0;
    if (o.root && o.root.add) o.root.add(ent.flashSprite);

    ent.tick = function (dt) {
      if (ent.flash > 0) ent.flash = Math.max(0, ent.flash - dt * 4.5);
      if (ent.invuln > 0) ent.invuln = Math.max(0, ent.invuln - dt);
      if (ent.flashSprite && ent.flashSprite.material) {
        ent.flashSprite.material.opacity = ent.flash * 0.55;
      }
    };

    ent.die = function () {
      if (ent._dead) return;
      ent._dead = true;
      ent.alive = false;
      ent.hp = 0;
      if (ctx.combat && typeof ctx.combat.unregister === "function") {
        try { ctx.combat.unregister(ent); } catch (e) { console.warn("[villains] unregister", e); }
      }
      if (ctx.bus) ctx.bus.emit("kill", { entity: ent, pos: ent.object3D.position, name: ent.name });
      if (ent.onDeath) { try { ent.onDeath(ent); } catch (e) { console.error("[villains] onDeath", e); } }
    };

    ent.takeDamage = function (amt, hit) {
      if (!ent.alive || ent.invuln > 0) return 0;
      const raw = (typeof amt === "number" && amt > 0) ? amt : ((hit && hit.dmg) || 0);
      const dmg = Math.max(1, raw * (ent.damageMul || 1));
      ent.hp -= dmg;
      ent.flash = 1;
      if (hit && hit.stagger) ent.stagger += hit.stagger;
      if (ent.onHit) {
        try { ent.onHit(hit || {}, dmg); } catch (e) { console.error("[villains] onHit", e); }
      }
      if (ent.ai && typeof ent.ai.onDamaged === "function") ent.ai.onDamaged(dmg, hit || {});
      const p = ent.object3D.position;
      ent._hitPos.set(p.x, p.y + ent.height * 0.62, p.z);
      if (ctx.combat && typeof ctx.combat.damageNumber === "function") {
        try { ctx.combat.damageNumber(ent._hitPos, Math.round(dmg), { crit: !!(hit && hit.heavy) }); } catch (e) { }
      }
      if (ctx.vfx && ctx.vfx.burst && ent.flash > 0.98) {
        try { ctx.vfx.burst(ent._hitPos, "hit", 3); } catch (e) { }
      }
      if (ctx.bus) ctx.bus.emit("enemy:hit", { entity: ent, amt: dmg });
      if (ent.hp <= 0) ent.die();
      return dmg;
    };

    if (ctx.combat && typeof ctx.combat.register === "function") {
      try { ctx.combat.register(ent); } catch (e) { console.warn("[villains] register", e); }
    }
    return ent;
  }

  /* shared helpers for AI classes */
  function makeAura(root, color, scale, y) {
    const s = A().glowSprite(color, scale, 0);
    s.position.set(0, y, 0);
    s.material.opacity = 0;
    root.add(s);
    return s;
  }

  function pulseAura(aura, amt) {
    if (!aura || !aura.material) return;
    aura.material.opacity = amt;
  }

  function shake(ctx, amt, dur) {
    if (ctx.bus) ctx.bus.emit("shake", { amt: amt, dur: dur || 0.2 });
  }

  function sfx(ctx, name, opts) {
    if (ctx.sfx && typeof ctx.sfx.play === "function") {
      try { ctx.sfx.play(name, opts); } catch (e) { }
    }
  }

  function burst(ctx, pos, kind, n) {
    if (ctx.vfx && typeof ctx.vfx.burst === "function") {
      try { ctx.vfx.burst(pos, kind, n); } catch (e) { }
    }
  }

  function hitbox(ctx, opts) {
    if (ctx.combat && typeof ctx.combat.hitbox === "function") {
      try { ctx.combat.hitbox(opts); } catch (e) { console.error("[villains] hitbox", e); }
    }
  }

  function projectile(ctx, opts) {
    if (ctx.combat && typeof ctx.combat.projectile === "function") {
      try { ctx.combat.projectile(opts); } catch (e) { console.error("[villains] projectile", e); }
    }
  }

  /* =====================================================================
     AI: ASSASSIN — "THE POPPIED VEIL"
     ===================================================================== */
  const ASSASSIN_BONES = [
    "hips", "chest", "head", "hairBack",
    "armL.sh", "armL.el", "armL.hand", "armR.sh", "armR.el", "armR.hand",
    "legL.hip", "legL.knee", "legL.foot", "legR.hip", "legR.knee", "legR.foot",
    "propL"
  ];

  function AssassinAI(root, parts, ctx) {
    this.root = root;
    this.parts = parts;
    this.ctx = ctx || getCtx();
    this.radius = 0.42;
    this.height = 1.85;
    this.maxHp = 420;
    this.hp = 420;
    this.entity = null;
    this.state = "spawn";
    this.stateT = 0;
    this.t = 0;
    this.vulnerableWindow = false;
    this.retreats = 0;
    this.attackCd = 1.1;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 1.8;
    this.ribbonT = Math.random() * 10;
    this.ribbonAmp = 0.18;
    this.ribbonSnap = 0;
    this.hipsY = parts.hips ? parts.hips.position.y : 0.96;
    this.moveSpeed = 0;
    this.knockX = 0; this.knockZ = 0;
    this.dashX = 0; this.dashZ = 0;
    this.hitCount = 0;
    this.fx = new Fx(root.parent || getScene());
    this.timers = new Timers();
    this.pose = new RigPose(parts, ASSASSIN_BONES);
    this.aura = makeAura(root, 0xff3020, 1.9, 1.1);
    this._p = new (T().Vector3)();
    this._v = new (T().Vector3)();
    this._v2 = new (T().Vector3)();
    this.playerPos = this._p;
    this.deadEmitted = false;
    this.isAssassin = true;
  }

  AssassinAI.prototype.enter = function (state) {
    this.state = state;
    this.stateT = 0;
    this.vulnerableWindow = false;
    if (this.entity) this.entity.invuln = 0;
    switch (state) {
      case "dashWind": this.beginDashWind(); break;
      case "dashSlash": this.beginDashSlash(); break;
      case "overheadWind": this.beginOverheadWind(); break;
      case "overheadStrike": this.beginOverheadStrike(); break;
      case "feint": this.beginFeint(); break;
      case "retreat": this.beginRetreat(); break;
      case "stagger": this.onStagger(); break;
      case "dead": this.onDeathState(); break;
    }
  };

  AssassinAI.prototype.onDamaged = function (dmg, hit) {
    if (!this.entity || !this.entity.alive) return;
    this.hp = this.entity.hp;
    if (hit && hit.from) {
      const dx = this.root.position.x - hit.from.x;
      const dz = this.root.position.z - hit.from.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const k = (hit.knock || 2) * 0.35;
      this.knockX += (dx / d) * k;
      this.knockZ += (dz / d) * k;
    }
    if (this.vulnerableWindow && this.state === "overheadWind") {
      this.parry();
    }
  };

  AssassinAI.prototype.parry = function () {
    this.vulnerableWindow = false;
    this.enter("stagger");
    this.ribbonSnap = 1;
    burst(this.ctx, this.root.position, "parry", 12);
    if (this.ctx.bus) this.ctx.bus.emit("parry", { pos: this.root.position, entity: this.entity });
    sfx(this.ctx, "parry", { vol: 0.8 });
    shake(this.ctx, 0.35, 0.18);
    if (this.ctx.combat && this.ctx.combat.hitstop) this.ctx.combat.hitstop(0.12);
    if (this.ctx.combat && this.ctx.combat.damageNumber) {
      this._v2.set(this.root.position.x, this.root.position.y + 2.2, this.root.position.z);
      this.ctx.combat.damageNumber(this._v2, "PARRY", { text: true });
    }
  };

  AssassinAI.prototype.onStagger = function () {
    this.vulnerableWindow = true;
    this.staggerT = 2.5;
    this.ribbonAmp = 0.10;
    if (this.entity) this.entity.stagger = 0;
  };

  AssassinAI.prototype.beginDashWind = function () {
    this.attackCd = 0;
    this.vulnerableWindow = false;
    this.ribbonSnap = 0.9;
    const pp = playerPos(this.ctx, this._p);
    const dx = pp ? pp.x - this.root.position.x : Math.sin(this.root.rotation.y);
    const dz = pp ? pp.z - this.root.position.z : Math.cos(this.root.rotation.y);
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    this.dashX = dx / d; this.dashZ = dz / d;
    this.fx.ring(this.root.position.x, this.root.position.y, this.root.position.z, 1.15, 0xff2a1c, 0.42);
    this.fx.line(this.root.position.x, this.root.position.y, this.root.position.z,
      Math.atan2(this.dashX, this.dashZ), 6.5, 0.9, 0xff2a1c, 0.42);
    sfx(this.ctx, "assassin_wind", { vol: 0.5 });
  };

  AssassinAI.prototype.beginDashSlash = function () {
    this.attackCd = 0;
    this.hitCount = 0;
    this.ribbonSnap = 1;
    sfx(this.ctx, "assassin_dash", { vol: 0.55 });
    this.ribbonAmp = 0.30;
    const me = this;
    const swings = [0.08, 0.20, 0.32];
    for (let i = 0; i < swings.length; i++) {
      this.timers.after(swings[i], function () {
        me.slashHit(14 + i * 2, 1.0, i === 2 ? 0.35 : 0.12);
      });
    }
  };

  AssassinAI.prototype.slashHit = function (dmg, reach, heavy) {
    if (!this.entity || !this.entity.alive || this.state !== "dashSlash") return;
    const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y);
    this._v.set(
      this.root.position.x + fx * reach,
      this.root.position.y + 1.0,
      this.root.position.z + fz * reach
    );
    hitbox(this.ctx, {
      team: "enemy", shape: "sphere", pos: this._v.clone(), r: 1.05,
      dmg: dmg, knock: 5, stagger: 12, life: 0.1, src: this.entity,
      heavy: !!heavy, fx: "slash"
    });
    burst(this.ctx, this._v, "slash", 6);
    sfx(this.ctx, "assassin_slash", { vol: 0.4 });
  };

  AssassinAI.prototype.beginOverheadWind = function () {
    this.vulnerableWindow = true;
    this.ribbonAmp = 0.14;
    this.attackCd = 0;
    const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y);
    this.fx.ring(this.root.position.x + fx * 1.1, this.root.position.y, this.root.position.z + fz * 1.1,
      1.6, 0xff2a1c, 0.42);
    sfx(this.ctx, "assassin_wind", { vol: 0.55 });
  };

  AssassinAI.prototype.beginOverheadStrike = function () {
    this.vulnerableWindow = false;
    this.ribbonSnap = 1.2;
    this.ribbonAmp = 0.34;
    const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y);
    this._v.set(this.root.position.x + fx * 1.15, this.root.position.y + 1.0,
      this.root.position.z + fz * 1.15);
    hitbox(this.ctx, {
      team: "enemy", shape: "sphere", pos: this._v.clone(), r: 1.45,
      dmg: 34, knock: 8, stagger: 35, life: 0.12, src: this.entity, heavy: true, fx: "heavy"
    });
    burst(this.ctx, this._v, "petal", 16);
    if (this.ctx.bus) this.ctx.bus.emit("petalBurst", { pos: this._v, n: 16 });
    shake(this.ctx, 0.45, 0.22);
    sfx(this.ctx, "assassin_heavy", { vol: 0.8 });
  };

  AssassinAI.prototype.beginFeint = function () {
    const p = this.root.position;
    burst(this.ctx, p, "petal", 20);
    if (this.ctx.bus) this.ctx.bus.emit("petalBurst", { pos: p, n: 20 });
    sfx(this.ctx, "assassin_vanish", { vol: 0.5 });
    this.root.visible = false;
    const me = this;
    this.timers.after(0.40, function () {
      if (!me.entity || !me.entity.alive) return;
      const pp = playerPos(me.ctx, me._p);
      let bx = pp ? pp.x : me.root.position.x;
      let bz = pp ? pp.z : me.root.position.z;
      if (pp) {
        const yaw = playerYaw(me.ctx);
        bx = pp.x - Math.sin(yaw) * 1.9;
        bz = pp.z - Math.cos(yaw) * 1.9;
      }
      me.root.position.set(bx, heightAt(me.ctx.world, bx, bz, me.root.position.y), bz);
      me.root.visible = true;
      const pp2 = playerPos(me.ctx, me._p);
      if (pp2) me.root.rotation.y = Math.atan2(pp2.x - bx, pp2.z - bz);
      burst(me.ctx, me.root.position, "petal", 14);
      me.enter("overheadWind");
    });
  };

  AssassinAI.prototype.beginRetreat = function () {
    this.retreats++;
    this.root.visible = false;
    const p = this.root.position;
    burst(this.ctx, p, "petal", 26);
    if (this.ctx.bus) this.ctx.bus.emit("petalBurst", { pos: p, n: 26 });
    burst(this.ctx, p, "spore", 8);
    sfx(this.ctx, "assassin_vanish", { vol: 0.7 });
    if (this.entity) this.entity.invuln = 1.2;
    const me = this;
    this.timers.after(0.55, function () {
      if (!me.entity || !me.entity.alive) return;
      const pp = playerPos(me.ctx, me._p);
      const a = Math.random() * Math.PI * 2;
      const dist = 8.5;
      let bx = (pp ? pp.x : 0) + Math.sin(a) * dist;
      let bz = (pp ? pp.z : 0) + Math.cos(a) * dist;
      if (me.ctx.world && me.ctx.world.arenaCenter) {
        const ac = me.ctx.world.arenaCenter, R = (me.ctx.world.arenaRadius || 24) * 0.82;
        const dx = bx - ac.x, dz = bz - ac.z, d = Math.sqrt(dx * dx + dz * dz);
        if (d > R) { bx = ac.x + dx / d * R; bz = ac.z + dz / d * R; }
      }
      me.root.position.set(bx, heightAt(me.ctx.world, bx, bz, 0), bz);
      me.root.visible = true;
      burst(me.ctx, me.root.position, "petal", 18);
      if (me.ctx.bus) me.ctx.bus.emit("assassin:adds", { pos: me.root.position, count: 2, entity: me.entity });
      me.attackCd = 1.3;
      me.enter("stalk");
    });
  };

  AssassinAI.prototype.onDeathState = function () {
    this.vulnerableWindow = false;
    this.aura.material.opacity = 0;
    const p = this.root.position;
    burst(this.ctx, p, "petal", 30);
    if (this.ctx.bus && !this.deadEmitted) {
      this.deadEmitted = true;
      this.ctx.bus.emit("assassin:down", { pos: p, entity: this.entity });
    }
    sfx(this.ctx, "assassin_down", { vol: 0.8 });
  };

  AssassinAI.prototype.onDeath = function () {
    this.hp = 0;
    this.enter("dead");
  };

  AssassinAI.prototype.chooseAttack = function (dist) {
    if (this.entity && this.entity.hp / this.maxHp <= (this.retreats === 0 ? 0.66 : this.retreats === 1 ? 0.33 : -1)) {
      this.enter("retreat");
      return;
    }
    if (dist > 6.2) { this.enter("feint"); return; }
    const r = Math.random();
    if (r < 0.40) this.enter("dashWind");
    else if (r < 0.68) this.enter("feint");
    else this.enter("overheadWind");
  };

  AssassinAI.prototype.update = function (dt, ctx) {
    if (ctx) this.ctx = ctx;
    this.t += dt;
    this.stateT += dt;
    this.ribbonT += dt;
    if (this.entity) {
      this.entity.tick(dt);
      this.hp = this.entity.hp;
    }
    const pp = playerPos(this.ctx, this._p);
    if (this.state !== "dead" && pp) faceTo(this.root, pp.x, pp.z, dt, 7);

    const alive = !this.entity || this.entity.alive;
    const world = this.ctx.world;
    let speed = 0;

    /* knockback decay */
    this.root.position.x += this.knockX * dt;
    this.root.position.z += this.knockZ * dt;
    this.knockX *= Math.exp(-7 * dt);
    this.knockZ *= Math.exp(-7 * dt);

    switch (this.state) {
      case "spawn": {
        if (this.stateT > 0.8) { this.enter("stalk"); this.attackCd = 0.6; }
        break;
      }
      case "stalk": {
        this.attackCd -= dt;
        this.strafeTimer -= dt;
        if (this.strafeTimer <= 0) {
          this.strafeDir *= -1;
          this.strafeTimer = 2.5 + Math.random() * 2.0;
        }
        if (pp) {
          const dx = pp.x - this.root.position.x;
          const dz = pp.z - this.root.position.z;
          const d = Math.sqrt(dx * dx + dz * dz) || 0.001;
          const radial = (d - 3.8) * 1.15;
          const nx = dx / d, nz = dz / d;
          let mx = nx * radial - nz * this.strafeDir * 1.55;
          let mz = nz * radial + nx * this.strafeDir * 1.55;
          const ml = Math.sqrt(mx * mx + mz * mz) || 1;
          speed = 3.1;
          const step = Math.min(1, ml) * speed * dt;
          moveCircle(this.root, (mx / ml) * step, (mz / ml) * step, this.radius, world);
          /* teleport-ish catch-up if far behind */
          if (d > 16) {
            this.root.position.x += nx * 3.5;
            this.root.position.z += nz * 3.5;
          }
          if (this.attackCd <= 0) this.chooseAttack(d);
        }
        break;
      }
      case "dashWind": {
        pulseAura(this.aura, 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(this.stateT * 40)));
        if (pp) {
          const dx = pp.x - this.root.position.x, dz = pp.z - this.root.position.z;
          const d = Math.sqrt(dx * dx + dz * dz) || 1;
          this.dashX = U.damp(this.dashX, dx / d, 8, dt);
          this.dashZ = U.damp(this.dashZ, dz / d, 8, dt);
        }
        if (this.stateT >= 0.35) this.enter("dashSlash");
        break;
      }
      case "dashSlash": {
        pulseAura(this.aura, Math.max(0, 0.32 - this.stateT));
        const step = 16 * dt;
        moveCircle(this.root, this.dashX * step, this.dashZ * step, this.radius, world);
        speed = 16;
        if (this.stateT > 0.42) this.enter("recover");
        break;
      }
      case "overheadWind": {
        pulseAura(this.aura, 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(this.stateT * 48)));
        this.vulnerableWindow = true;
        if (this.stateT >= 0.40) this.enter("overheadStrike");
        break;
      }
      case "overheadStrike": {
        pulseAura(this.aura, Math.max(0, 0.3 - this.stateT * 2));
        if (this.stateT >= 0.22) this.enter("recover");
        break;
      }
      case "recover": {
        if (this.stateT >= 0.55) {
          this.attackCd = 0.9 + Math.random() * 1.1;
          this.enter("stalk");
        }
        break;
      }
      case "feint": {
        /* waits on timer; if it never resolves (edge case), fall back */
        if (this.stateT > 1.2) { this.root.visible = true; this.enter("stalk"); }
        break;
      }
      case "retreat": {
        if (this.stateT > 1.6) { this.root.visible = true; this.enter("stalk"); }
        break;
      }
      case "stagger": {
        this.staggerT = (this.staggerT || 0) - dt;
        this.vulnerableWindow = this.staggerT > 0.4;
        if (this.staggerT <= 0) {
          this.vulnerableWindow = false;
          this.attackCd = 0.7;
          this.enter("stalk");
        }
        break;
      }
      case "dead": {
        this.root.visible = true;
        break;
      }
    }
    if (!alive && this.state !== "dead") this.enter("dead");
    this.moveSpeed = speed;
    this.animate(dt, pp);
    this.fx.update(dt);
    this.timers.update(dt);
  };

  /* ---------- procedural animation ---------- */
  AssassinAI.prototype.animate = function (dt, pp) {
    const P = this.pose, t = this.t, st = this.state, k = this.stateT;
    P.clear();
    const breath = Math.sin(t * 2.1) * 0.018;

    P.set("hips", 0, Math.sin(t * 0.8) * 0.05, 0);
    P.set("chest", 0.03 + breath, 0, Math.sin(t * 1.1) * 0.02);
    P.set("head", Math.sin(t * 1.4) * 0.03 - 0.02, Math.sin(t * 0.7) * 0.06, 0);
    P.set("hairBack", 0.04 + Math.sin(t * 2.0) * 0.03, 0, Math.sin(t * 1.7) * 0.05);
    P.set("armL.sh", 0.05, 0, -0.12);
    P.set("armL.el", -0.30, 0, 0);
    P.set("armL.hand", -0.10, 0, 0);
    P.set("armR.sh", -0.05, 0, 0.14);
    P.set("armR.el", -0.22, 0, 0);
    P.set("legL.hip", 0, 0, 0);
    P.set("legR.hip", 0, 0, 0);
    P.set("propL", 0.10, 0, 0);

    /* idle walk cycle */
    if (this.moveSpeed > 0.4 && st === "stalk") {
      const ph = t * 9;
      P.add("legL.hip", Math.sin(ph) * 0.55, 0, 0);
      P.add("legR.hip", -Math.sin(ph) * 0.55, 0, 0);
      P.add("legL.knee", Math.max(0, -Math.sin(ph)) * 0.7, 0, 0);
      P.add("legR.knee", Math.max(0, Math.sin(ph)) * 0.7, 0, 0);
      P.add("armR.sh", Math.sin(ph) * 0.22, 0, 0);
      P.add("chest", 0.05, Math.sin(ph) * 0.06, 0);
    }

    switch (st) {
      case "spawn":
        P.set("chest", 0.35, 0, 0);
        P.set("head", -0.18, 0, 0);
        break;
      case "dashWind": {
        const e = U.ease(k / 0.35, "inQuad");
        P.set("chest", 0.34, 0.5, 0);
        P.set("head", -0.12, 0, 0);
        P.set("armL.sh", -2.45 + e * 0.4, -0.4, -0.35);
        P.set("armL.el", -0.55, 0, 0);
        P.set("propL", 0.26, 0, 0);
        P.set("armR.sh", 0.55, 0, 0.4);
        P.set("legL.hip", -0.55, 0, 0);
        P.set("legL.knee", 0.9, 0, 0);
        P.set("legR.hip", 0.42, 0, 0);
        P.set("legR.knee", 0.35, 0, 0);
        this.parts.hips.position.y = this.hipsY - 0.08 * e;
        break;
      }
      case "dashSlash": {
        const sw = U.ease(Math.min(1, k / 0.28), "outQuad");
        P.set("chest", 0.55, -0.55 + sw * 0.9, 0);
        P.set("head", -0.18, 0, 0);
        P.set("armL.sh", -1.9, 0.5 - sw * 1.4, -0.55);
        P.set("armL.el", -0.15, 0, 0);
        P.set("propL", 0.15, 0, 0);
        P.set("armR.sh", -0.8, 0, 0.55);
        P.set("legL.hip", -0.85, 0, 0);
        P.set("legR.hip", 0.7, 0, 0);
        P.set("legR.knee", 0.55, 0, 0);
        this.parts.hips.position.y = this.hipsY - 0.10;
        break;
      }
      case "overheadWind": {
        const e = U.ease(k / 0.4, "outQuad");
        P.set("chest", -0.16, -0.22, 0);
        P.set("head", 0.10, 0, 0);
        P.set("armL.sh", -2.85 - e * 0.25, -0.35, -0.5);
        P.set("armL.el", -0.85, 0, 0);
        P.set("propL", 0.42, 0, 0);
        P.set("armR.sh", -0.4, 0, 0.45);
        P.set("legL.hip", -0.25, 0, 0);
        P.set("legR.hip", 0.2, 0, 0);
        break;
      }
      case "overheadStrike": {
        const e = U.ease(Math.min(1, k / 0.12), "inCubic");
        P.set("chest", 0.62, 0.28, 0);
        P.set("head", 0.25, 0, 0);
        P.set("armL.sh", -2.7 + e * 1.85, -0.2, -0.35);
        P.set("armL.el", -0.9 + e * 0.8, 0, 0);
        P.set("propL", 0.1, 0, 0);
        P.set("armR.sh", -0.9, 0, 0.5);
        P.set("legL.hip", -0.95, 0, 0);
        P.set("legL.knee", 1.1, 0, 0);
        P.set("legR.hip", 0.55, 0, 0);
        this.parts.hips.position.y = this.hipsY - 0.14;
        break;
      }
      case "recover": {
        const e = 1 - Math.min(1, k / 0.55);
        P.set("chest", 0.3 * e + breath, 0.15 * e, 0);
        P.set("armL.sh", -0.9 * e, 0, -0.3 * e - 0.12);
        P.set("armL.el", -0.4, 0, 0);
        P.set("legL.hip", -0.4 * e, 0, 0);
        P.set("legR.hip", 0.25 * e, 0, 0);
        this.parts.hips.position.y = this.hipsY - 0.06 * e;
        break;
      }
      case "stagger": {
        const wob = Math.sin(t * 13) * 0.05 * Math.max(0, 1 - k * 0.4);
        P.set("chest", 0.46, 0.18 + wob, 0.12 + wob);
        P.set("head", 0.42, 0.1, wob);
        P.set("hairBack", 0.35, 0, 0.1);
        P.set("armL.sh", 0.25, 0, -0.55);
        P.set("armL.el", -0.15, 0, 0);
        P.set("armR.sh", 0.35, 0, 0.55);
        P.set("armR.el", -0.1, 0, 0);
        P.set("legL.hip", -0.35, 0, 0);
        P.set("legL.knee", 0.55, 0, 0);
        P.set("legR.hip", 0.25, 0, 0);
        P.set("legR.knee", 0.35, 0, 0);
        this.parts.hips.position.y = this.hipsY - 0.12;
        break;
      }
      case "dead": {
        const e = U.ease(Math.min(1, k / 1.1), "outQuart");
        P.set("chest", 0.75 * e, 0.15 * e, 0.2 * e);
        P.set("head", 0.55 * e, 0.2 * e, 0.2 * e);
        P.set("hairBack", 0.6 * e, 0, 0);
        P.set("armL.sh", 0.55 * e, 0, -0.4);
        P.set("armL.el", -0.1, 0, 0);
        P.set("armR.sh", 0.6 * e, 0, 0.4);
        P.set("armR.el", -0.2, 0, 0);
        P.set("legL.hip", -1.35 * e, 0, 0.1);
        P.set("legL.knee", 2.1 * e, 0, 0);
        P.set("legR.hip", -0.2 * e, 0, 0);
        P.set("legR.knee", 1.7 * e, 0, 0);
        this.parts.hips.position.y = this.hipsY - 0.42 * e;
        break;
      }
      default:
        this.parts.hips.position.y = U.damp(this.parts.hips.position.y, this.hipsY, 10, dt);
    }
    if (st !== "dashWind" && st !== "dashSlash" && st !== "overheadStrike" && st !== "stagger" &&
      st !== "dead" && st !== "recover") {
      this.parts.hips.position.y = this.hipsY + Math.sin(t * 2.2) * 0.012;
    }
    P.apply(dt, st === "dead" ? 6 : 24);

    /* ribbons + aura */
    this.ribbonAmp = U.damp(this.ribbonAmp, st === "stalk" || st === "spawn" ? 0.16 : 0.2, 4, dt);
    this.ribbonSnap = Math.max(0, this.ribbonSnap - dt * 2.2);
    waveRibbons(this.parts.ribbons, this.ribbonT, this.ribbonAmp, this.ribbonSnap);
    waveRibbons(this.parts.ribbons2, this.ribbonT * 1.2, this.ribbonAmp * 0.8, this.ribbonSnap * 0.7);
    if (st !== "dashWind" && st !== "dashSlash" && st !== "overheadWind" && st !== "overheadStrike") {
      pulseAura(this.aura, 0);
    }
    if (st !== "dead") {
      const h = this._v.set(this.root.position.x, this.root.position.y + 0.02, this.root.position.z);
      /* petal motes drifting at her feet */
      if (Math.random() < dt * 1.6) burst(this.ctx, h, "petal", 1);
    }
  };

  /* =====================================================================
     AI: THE SPOREFATHER — 3 phase boss
     ===================================================================== */
  const BOSS_BONES = {
    1: ["hips", "chest", "head", "cap", "armL.sh", "armL.el", "armL.hand",
      "armR.sh", "armR.el", "armR.hand", "propR"],
    2: ["hips", "chest", "head", "armL.sh", "armL.el", "armL.hand",
      "armR.sh", "armR.el", "armR.hand", "legL.hip", "legL.knee", "legL.foot",
      "legR.hip", "legR.knee", "legR.foot"],
    3: ["hips", "chest", "head", "jaw", "shoulderLPivot", "shoulderRPivot",
      "armL.el", "armL.hand", "armR.el", "armR.hand",
      "legL.hip", "legL.knee", "legL.foot", "legR.hip", "legR.knee", "legR.foot"]
  };

  const STATE_MAX = {
    intro: 2, roar: 1.4, volley: 1.8, geyser: 2.4, swipe: 1.0, teleport: 1.2,
    combo: 3.0, leap: 2.0, mines: 1.8, slamTel: 1.8, chargeTel: 1.6, charge: 2.6,
    stunned: 4.0, breathTel: 1.4, breath: 3.6, summon: 2.4, stagger: 4.6, dead: 99
  };

  function BossAI(root, parts, ctx, phase) {
    this.root = root;
    this.parts = parts;
    this.phase = phase || 1;
    this.ctx = ctx || getCtx();
    this.entity = null;
    this.maxHp = 1500;
    this.hp = 1500;
    this.radius = parts.radius || 0.8;
    this.height = parts.height || 2.2;
    this.state = "intro";
    this.stateT = 0;
    this.t = 0;
    this.staggerBar = 0;
    this.staggerT = 0;
    this.exposed = false;
    this.exposedT = 0;
    this.attackCd = 2.4;
    this.teleCd = 0;
    this.comboIndex = 0;
    this.moveAmount = 0;
    this.stepT = 0;
    this.leapT = 0;
    this.leapDur = 0.85;
    this.leapFromX = 0; this.leapFromZ = 0; this.leapToX = 0; this.leapToZ = 0; this.leapGY = 0;
    this.chargeDX = 0; this.chargeDZ = 0; this.chargeHitT = 0;
    this.dmgLog = [];
    this.mines = [];
    this.plates = [];
    this.platesBroken = 0;
    this.debris = [];
    this.deathEmitted = false;
    this.breathMesh = null;
    this.breathMat = null;
    this.groundY = root.position.y;
    this.bobY = 0;
    this.knockX = 0; this.knockZ = 0;
    this.pose = new RigPose(parts, BOSS_BONES[this.phase]);
    this.fx = new Fx(root.parent || getScene());
    this.timers = new Timers();
    this.aura = makeAura(root, 0xff5a2a, Math.max(3, this.height * 0.7), this.height * 0.55);
    this._p = new (T().Vector3)();
    this._v = new (T().Vector3)();
    this._v2 = new (T().Vector3)();
    this.isBoss = true;
  }

  BossAI.prototype.homeState = function () {
    return this.phase === 1 ? "glide" : this.phase === 2 ? "chase" : "walk";
  };

  BossAI.prototype.enter = function (state) {
    if (this.state === state) return;
    this.state = state;
    this.stateT = 0;
    this.moveAmount = 0;
    if (state !== "breath" && this.breathMesh) this.removeBreathMesh();
    if (state === "stagger") { this.timers.clear(); this.fx.clear(); }
    if (state === "dead") { this.timers.clear(); this.fx.clear(); this.clearMines(); }
  };

  BossAI.prototype.applyGround = function () {
    const w = this.ctx.world;
    const gy = heightAt(w, this.root.position.x, this.root.position.z, this.groundY);
    this.groundY = gy;
    if (this.state === "leap") return;
    this.root.position.y = gy + (this.phase === 1 ? 0.18 + Math.sin(this.t * 1.5) * 0.09 : 0);
  };

  /* ---------- damage / phase / stagger ---------- */
  BossAI.prototype.onDamaged = function (dmg, hit) {
    if (!this.entity || !this.entity.alive) return;
    this.hp = this.entity.hp;
    this.lastDmgT = this.t;
    this.dmgLog.push({ t: this.t, amt: dmg });
    if (this.staggerT <= 0) this.staggerBar += dmg * (this.phase === 3 ? 0.30 : 0.42);
    if (this.staggerBar >= 100 && this.staggerT <= 0) {
      this.staggerBar = 0;
      this.staggerT = 4;
      this.exposed = true;
      this.applyDamageMul();
      burst(this.ctx, this.root.position, "spore", 24);
      if (this.ctx.bus) this.ctx.bus.emit("boss:stagger", { entity: this.entity });
      sfx(this.ctx, "boss_stagger", { vol: 0.8 });
    }
    if (hit && hit.from) {
      const dx = this.root.position.x - hit.from.x;
      const dz = this.root.position.z - hit.from.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const k = Math.min(2.5, (hit.knock || 2) * 0.12);
      this.knockX += (dx / d) * k;
      this.knockZ += (dz / d) * k;
    }
    if (this.phase === 1 && this.teleCd <= 0 && this.state !== "teleport" && this.state !== "roar" && this.state !== "intro") {
      let sum = 0;
      for (let i = 0; i < this.dmgLog.length; i++) {
        if (this.t - this.dmgLog[i].t < 3) sum += this.dmgLog[i].amt;
      }
      if (sum >= 40) this.teleportAway();
    }
    /* phase transitions (70% / 30%) */
    const frac = this.entity.hp / this.maxHp;
    if (this.phase === 1 && frac <= 0.70) this.setPhase(2);
    else if (this.phase === 2 && frac <= 0.30) this.setPhase(3);
  };

  BossAI.prototype.applyDamageMul = function () {
    if (this.entity) this.entity.damageMul = this.exposed ? 2 : 1;
  };

  BossAI.prototype.setPhase = function (n) {
    if (n <= this.phase) return;
    const prev = this.phase;
    const pos = this.root.position.clone();
    const rotY = this.root.rotation.y;
    const parent = this.root.parent || getScene();

    this.timers.clear();
    this.fx.clear();
    this.clearMines();
    this.removeBreathMesh();
    this.plates = [];
    this.platesBroken = 0;
    this.exposed = false;
    this.exposedT = 0;
    this.staggerT = 0;
    this.staggerBar = 0;
    this.phase = n;

    const built = buildBoss(n);
    built.root.position.copy(pos);
    built.root.rotation.y = rotY;
    if (parent) {
      parent.remove(this.root);
      parent.add(built.root);
    }
    const oldSprite = this.entity ? this.entity.flashSprite : null;
    this.root = built.root;
    this.parts = built.parts;
    this.radius = built.radius;
    this.height = built.height;
    if (this.entity) {
      this.entity.object3D = built.root;
      this.entity.radius = built.radius;
      this.entity.height = built.height;
      if (oldSprite) {
        if (oldSprite.parent) oldSprite.parent.remove(oldSprite);
        built.root.add(oldSprite);
        oldSprite.position.set(0, built.height * 0.55, 0);
        oldSprite.scale.setScalar(Math.max(0.8, built.height * 0.35));
      }
      this.entity.damageMul = 1;
    }
    this.pose = new RigPose(built.parts, BOSS_BONES[n]);
    this.aura = makeAura(built.root, 0xff5a2a, Math.max(3, built.height * 0.7), built.height * 0.55);
    this.fx.parent = parent;
    this.groundY = pos.y;

    /* transfigure shockwave + roar */
    this._v.set(pos.x, pos.y + 0.8, pos.z);
    hitbox(this.ctx, {
      team: "enemy", shape: "sphere", pos: this._v.clone(), r: n === 3 ? 8.5 : 6.5,
      dmg: 10, knock: 16, stagger: 40, life: 0.15, src: this.entity, heavy: true
    });
    burst(this.ctx, this._v, "spore", 46);
    burst(this.ctx, this._v, "shard", 18);
    this.fx.ring(pos.x, pos.y, pos.z, n === 3 ? 8.5 : 6.5, 0xff7a33, 0.75);
    shake(this.ctx, 1.0, 0.8);
    sfx(this.ctx, "boss_roar", { vol: 1 });
    if (this.ctx.bus) this.ctx.bus.emit("boss:phase", { n: n, phase: n, entity: this.entity, boss: this, from: prev });
    this.enter("roar");

    if (n === 3) {
      const me = this;
      this.timers.after(1.3, function () { me.spawnPlates(); });
    }
  };

  /* ---------- breakable shoulder plates (P3) ---------- */
  BossAI.prototype.spawnPlates = function () {
    if (this.phase !== 3 || !this.entity || !this.entity.alive) return;
    const TH = T();
    const parent = this.root.parent || getScene();
    this.root.updateMatrixWorld(true);
    const sides = ["L", "R"];
    for (let i = 0; i < 2; i++) {
      const side = sides[i];
      const plateMesh = this.parts["shoulder" + side];
      if (!plateMesh) continue;
      const anchor = new TH.Object3D();
      anchor.name = "plateAnchor" + side;
      plateMesh.getWorldPosition(anchor.position);
      if (parent) parent.add(anchor);
      const me = this;
      const ent = makeEntity({
        root: anchor, radius: 1.0, height: 1.4, hp: 60, ctx: this.ctx,
        name: "shoulder" + side, kind: "bossPlate",
        onDeath: function () { me.breakPlate(side, plateMesh); }
      });
      ent.isPlate = true;
      this.plates.push({ side: side, mesh: plateMesh, ent: ent, anchor: anchor, broken: false });
    }
  };

  BossAI.prototype.breakPlate = function (side, plateMesh) {
    let rec = null;
    for (let i = 0; i < this.plates.length; i++) if (this.plates[i].side === side) rec = this.plates[i];
    if (rec && rec.broken) return;
    if (rec) rec.broken = true;
    const TH = T();
    const wp = new TH.Vector3();
    this.root.updateMatrixWorld(true);
    plateMesh.getWorldPosition(wp);
    const core = this.parts["core" + side];
    const cg = this.parts["coreGlow" + side];
    if (core) core.visible = true;
    if (cg && cg.material) cg.material.opacity = 0.9;
    /* detached plate debris */
    const clone = new TH.Mesh(plateMesh.geometry, plateMesh.material);
    clone.position.copy(wp);
    clone.scale.copy(plateMesh.scale).multiplyScalar(0.9);
    clone.rotation.set(0.2, 0, (side === "L" ? 1 : -1) * 0.3);
    if (this.root.parent) this.root.parent.add(clone);
    this.debris.push({
      m: clone, vx: (side === "L" ? 1 : -1) * (2.5 + Math.random() * 2.5),
      vy: 5.5, vz: -1.5 - Math.random() * 2, spin: 2.5, life: 3.2
    });
    plateMesh.visible = false;
    if (rec && rec.anchor && rec.anchor.parent) rec.anchor.parent.remove(rec.anchor);
    this.platesBroken++;
    this.exposed = true;
    this.applyDamageMul();
    burst(this.ctx, wp, "spore", 30);
    burst(this.ctx, wp, "shard", 14);
    shake(this.ctx, 0.7, 0.45);
    sfx(this.ctx, "plate_break", { vol: 1 });
    if (this.ctx.bus) {
      this.ctx.bus.emit("boss:plateBreak", {
        side: side, pos: wp, entity: this.entity, broken: this.platesBroken, remaining: 2 - this.platesBroken
      });
    }
    if (this.platesBroken >= 2) {
      if (this.parts.coreC) this.parts.coreC.visible = true;
      if (this.parts.coreCGlow && this.parts.coreCGlow.material) this.parts.coreCGlow.material.opacity = 0.9;
      burst(this.ctx, wp, "core", 20);
    }
    if (this.staggerT <= 0) this.staggerT = 1.4;
  };

  BossAI.prototype.updatePlates = function (dt) {
    if (!this.plates.length) return;
    this.root.updateMatrixWorld(true);
    for (let i = 0; i < this.plates.length; i++) {
      const rec = this.plates[i];
      if (rec.broken || !rec.anchor) continue;
      rec.mesh.getWorldPosition(rec.anchor.position);
    }
  };

  BossAI.prototype.updateDebris = function (dt) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      d.vy -= 16 * dt;
      d.m.position.x += d.vx * dt;
      d.m.position.y += d.vy * dt;
      d.m.position.z += d.vz * dt;
      d.m.rotation.x += d.spin * dt;
      d.m.rotation.y += d.spin * 0.6 * dt;
      if (d.m.position.y < 0.1) { d.m.position.y = 0.1; d.vy = Math.abs(d.vy) * 0.25; d.vx *= 0.7; d.vz *= 0.7; }
      if (d.life <= 0) {
        if (d.m.parent) d.m.parent.remove(d.m);
        this.debris.splice(i, 1);
      }
    }
  };

  /* ---------- spore mines ---------- */
  function buildMineMesh() {
    const TH = T(), g = geos(), m = mats();
    const grp = new TH.Group();
    grp.name = "sporeMine";
    mk(grp, g.sphere, m.mossDark, { p: [0, 0.32, 0], s: [0.36, 0.34, 0.36], shadow: false });
    mk(grp, g.sphere, m.sporeGlow, { p: [0, 0.34, 0], s: [0.26, 0.24, 0.26], shadow: false });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      mk(grp, g.cone, m.cream, {
        p: [Math.sin(a) * 0.30, 0.52, Math.cos(a) * 0.30],
        s: [0.055, 0.26, 0.055], r: [-0.5, a, 0], shadow: false
      });
    }
    grp.userData.glow = sprite(grp, 0xff7a33, 0.9, 0.6, 0, 0.34, 0);
    return grp;
  }

  BossAI.prototype.spawnMines = function (count) {
    const TH = T();
    const pp = playerPos(this.ctx, this._p);
    const cx = pp ? pp.x : this.root.position.x;
    const cz = pp ? pp.z : this.root.position.z;
    const parent = this.root.parent || getScene();
    const me = this;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.random() * 3.4;
      const x = cx + Math.sin(a) * r;
      const z = cz + Math.cos(a) * r;
      const gy = heightAt(this.ctx.world, x, z, this.groundY);
      const mesh = buildMineMesh();
      mesh.position.set(x, gy, z);
      if (parent) parent.add(mesh);
      const mine = { mesh: mesh, armed: false, dead: false, exploded: false, t: 0 };
      mine.ent = makeEntity({
        root: mesh, radius: 0.55, height: 0.8, hp: 10, ctx: this.ctx,
        name: "sporeMine", kind: "mine",
        onDeath: function () { me.removeMine(mine); }
      });
      this.mines.push(mine);
      this.timers.after(1.0 + i * 0.12, function () { mine.armed = true; });
    }
    sfx(this.ctx, "mine_spawn", { vol: 0.5 });
  };

  BossAI.prototype.removeMine = function (mine) {
    if (mine.dead) return;
    mine.dead = true;
    const p = mine.mesh.position;
    if (mine.mesh.parent) mine.mesh.parent.remove(mine.mesh);
    if (!mine.exploded) {
      burst(this.ctx, p, "spore", 10);
      sfx(this.ctx, "mine_pop", { vol: 0.5 });
    }
    for (let i = this.mines.length - 1; i >= 0; i--) if (this.mines[i] === mine) this.mines.splice(i, 1);
  };

  BossAI.prototype.detonateMine = function (mine) {
    if (mine.dead) return;
    mine.exploded = true;
    const p = mine.mesh.position;
    this._v.set(p.x, p.y + 0.6, p.z);
    hitbox(this.ctx, {
      team: "enemy", shape: "sphere", pos: this._v.clone(), r: 2.8,
      dmg: 20, knock: 10, stagger: 20, life: 0.12, src: this.entity, heavy: true
    });
    burst(this.ctx, this._v, "spore", 26);
    burst(this.ctx, this._v, "dirt", 10);
    this.fx.ring(p.x, p.y, p.z, 2.8, 0xff7a33, 0.45);
    shake(this.ctx, 0.4, 0.3);
    sfx(this.ctx, "mine_boom", { vol: 0.7 });
    mine.ent.die();
  };

  BossAI.prototype.updateMines = function (dt) {
    if (!this.mines.length) return;
    const pp = playerPos(this.ctx, this._p);
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];
      mine.t += dt;
      if (!mine.mesh.parent) { this.mines.splice(i, 1); continue; }
      const pulse = 0.9 + Math.sin(mine.t * 8) * (mine.armed ? 0.12 : 0.04);
      mine.mesh.scale.setScalar(pulse);
      const glow = mine.mesh.userData.glow;
      if (glow && glow.material) glow.material.opacity = mine.armed ? 0.55 + 0.35 * Math.sin(mine.t * 12) : 0.3;
      if (mine.armed && pp && !mine.dead) {
        const dx = pp.x - mine.mesh.position.x, dz = pp.z - mine.mesh.position.z;
        if (dx * dx + dz * dz < 2.4 * 2.4) this.detonateMine(mine);
      }
    }
  };

  BossAI.prototype.clearMines = function () {
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];
      if (mine.mesh.parent) mine.mesh.parent.remove(mine.mesh);
      if (mine.ent && mine.ent.alive) {
        mine.ent.alive = false; mine.ent._dead = true;
        if (this.ctx.combat && this.ctx.combat.unregister) {
          try { this.ctx.combat.unregister(mine.ent); } catch (e) { }
        }
      }
    }
    this.mines.length = 0;
  };

  /* ---------- attacks: phase 1 ---------- */
  BossAI.prototype.staffPos = function (out) {
    if (this.parts.propR && this.parts.propR.getWorldPosition) {
      this.root.updateMatrixWorld(true);
      return this.parts.propR.getWorldPosition(out);
    }
    return out.set(this.root.position.x, this.root.position.y + this.height * 0.75, this.root.position.z);
  };

  BossAI.prototype.startVolley = function () {
    this.enter("volley");
    const me = this;
    for (let i = 0; i < 3; i++) {
      this.timers.after(0.16 + i * 0.24, function () {
        if (!me.entity || !me.entity.alive || (me.state !== "volley" && me.state !== "roar")) return;
        const pp = playerPos(me.ctx, me._p);
        if (!pp) return;
        const src = me.staffPos(me._v2);
        me._v.copy(pp);
        me._v.y += 1.0;
        projectile(me.ctx, {
          from: src.clone(), target: me._v.clone(), speed: 18, r: 0.30, dmg: 9,
          team: "enemy", homing: 0.55, life: 4, trail: true, src: me.entity, kind: "sporeBolt"
        });
        burst(me.ctx, src, "spore", 5);
        sfx(me.ctx, "bolt", { vol: 0.35 });
      });
    }
    this.timers.after(1.25, function () { if (me.state === "volley") me.enter(me.homeState()); });
    this.attackCd = 3.1 + Math.random();
  };

  BossAI.prototype.startGeyser = function () {
    this.enter("geyser");
    const me = this;
    const TH = T();
    const pp = playerPos(this.ctx, this._p);
    const cx = pp ? pp.x : this.root.position.x;
    const cz = pp ? pp.z : this.root.position.z;
    const n = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = i === 0 ? 0 : 2.0 + Math.random() * 3.0;
      const x = cx + Math.sin(a) * rad;
      const z = cz + Math.cos(a) * rad;
      const gy = heightAt(this.ctx.world, x, z, this.groundY);
      this.fx.ring(x, gy, z, 1.75, 0xff7a33, 1.1);
      this.timers.after(1.1, function () {
        if (!me.entity || !me.entity.alive) return;
        const pos = new TH.Vector3(x, gy + 0.9, z);
        hitbox(me.ctx, {
          team: "enemy", shape: "sphere", pos: pos, r: 1.8, dmg: 16,
          knock: 8, stagger: 25, life: 0.14, src: me.entity
        });
        burst(me.ctx, pos, "spore", 24);
        burst(me.ctx, pos, "dirt", 10);
        me.fx.ring(x, gy, z, 2.2, 0xffb060, 0.4);
        shake(me.ctx, 0.3, 0.25);
        sfx(me.ctx, "geyser", { vol: 0.6 });
      });
    }
    this.timers.after(1.55, function () { if (me.state === "geyser") me.enter(me.homeState()); });
    this.attackCd = 3.6 + Math.random();
  };

  BossAI.prototype.startSwipe = function () {
    this.enter("swipe");
    const me = this;
    this.timers.after(0.30, function () {
      if (!me.entity || !me.entity.alive) return;
      const fx = Math.sin(me.root.rotation.y), fz = Math.cos(me.root.rotation.y);
      me._v.set(me.root.position.x + fx * 1.9, me.root.position.y + 1.0, me.root.position.z + fz * 1.9);
      hitbox(me.ctx, {
        team: "enemy", shape: "sphere", pos: me._v.clone(), r: 1.9,
        dmg: 14, knock: 7, stagger: 18, life: 0.12, src: me.entity
      });
      burst(me.ctx, me._v, "slash", 8);
      sfx(me.ctx, "boss_swipe", { vol: 0.5 });
    });
    this.timers.after(0.85, function () { if (me.state === "swipe") me.enter(me.homeState()); });
    this.attackCd = 2.2 + Math.random();
  };

  BossAI.prototype.teleportAway = function () {
    this.teleCd = 6;
    this.enter("teleport");
    this.timers.clear();
    const me = this;
    const from = this.root.position;
    burst(this.ctx, from, "spore", 20);
    burst(this.ctx, from, "mote", 12);
    this.root.visible = false;
    sfx(this.ctx, "boss_blink", { vol: 0.6 });
    this.timers.after(0.35, function () {
      if (!me.entity || !me.entity.alive) return;
      const pp = playerPos(me.ctx, me._p);
      const a = Math.random() * Math.PI * 2;
      let x = (pp ? pp.x : 0) + Math.sin(a) * 9.5;
      let z = (pp ? pp.z : 0) + Math.cos(a) * 9.5;
      if (me.ctx.world && me.ctx.world.arenaCenter) {
        const ac = me.ctx.world.arenaCenter, R = (me.ctx.world.arenaRadius || 24) * 0.86;
        const dx = x - ac.x, dz = z - ac.z, d = Math.sqrt(dx * dx + dz * dz);
        if (d > R) { x = ac.x + dx / d * R; z = ac.z + dz / d * R; }
      }
      me.root.position.set(x, heightAt(me.ctx.world, x, z, me.groundY) + 0.18, z);
      me.root.visible = true;
      burst(me.ctx, me.root.position, "spore", 22);
      me.fx.ring(x, me.root.position.y, z, 2.2, 0xff7a33, 0.5);
      if (me.state === "teleport") me.enter(me.homeState());
    });
    this.timers.after(1.0, function () { if (me.state === "teleport") me.enter(me.homeState()); });
  };

  /* ---------- attacks: phase 2 ---------- */
  BossAI.prototype.startCombo = function () {
    this.enter("combo");
    const me = this;
    const n = 2 + Math.floor(Math.random() * 3);
    this.comboIndex = n;
    for (let i = 0; i < n; i++) {
      this.timers.after(0.16 + i * 0.30, function () {
        if (!me.entity || !me.entity.alive || me.state !== "combo") return;
        me.comboIndex = i;
        const fx = Math.sin(me.root.rotation.y), fz = Math.cos(me.root.rotation.y);
        me._v.set(me.root.position.x + fx * 1.65, me.root.position.y + 1.4, me.root.position.z + fz * 1.65);
        hitbox(me.ctx, {
          team: "enemy", shape: "sphere", pos: me._v.clone(), r: 1.55,
          dmg: i === n - 1 ? 14 : 9, knock: i === n - 1 ? 9 : 4,
          stagger: 10, life: 0.11, src: me.entity, heavy: i === n - 1
        });
        burst(me.ctx, me._v, "slash", 6);
        sfx(me.ctx, "claw", { vol: 0.35 });
        if (i === n - 1) shake(me.ctx, 0.28, 0.16);
      });
    }
    this.timers.after(0.2 + n * 0.30, function () {
      if (me.state === "combo") me.enter(me.homeState());
    });
    this.attackCd = 2.6 + Math.random() * 1.2;
  };

  BossAI.prototype.startLeap = function () {
    this.enter("leap");
    const me = this;
    const pp = playerPos(this.ctx, this._p);
    const tx = pp ? pp.x : this.root.position.x;
    const tz = pp ? pp.z : this.root.position.z;
    this.leapFromX = this.root.position.x;
    this.leapFromZ = this.root.position.z;
    this.leapToX = tx;
    this.leapToZ = tz;
    this.leapGY = heightAt(this.ctx.world, tx, tz, this.groundY);
    this.leapT = 0;
    this.leapDur = 0.85;
    this.fx.ring(tx, this.leapGY, tz, 3.4, 0xff3a22, 0.85);
    sfx(this.ctx, "boss_leap", { vol: 0.7 });
    this.timers.after(0.85, function () {
      if (!me.entity || !me.entity.alive) return;
      me.root.position.set(tx, me.leapGY, tz);
      const TH = T();
      const pos = new TH.Vector3(tx, me.leapGY + 1.1, tz);
      hitbox(me.ctx, {
        team: "enemy", shape: "sphere", pos: pos, r: 3.5, dmg: 24,
        knock: 12, stagger: 40, life: 0.14, src: me.entity, heavy: true
      });
      burst(me.ctx, pos, "spore", 32);
      burst(me.ctx, pos, "dirt", 16);
      me.fx.ring(tx, me.leapGY, tz, 3.8, 0xff7a33, 0.5);
      shake(me.ctx, 0.8, 0.5);
      sfx(me.ctx, "slam", { vol: 0.9 });
      me.enter(me.homeState());
    });
    this.attackCd = 3.0 + Math.random();
  };

  /* ---------- attacks: phase 3 ---------- */
  BossAI.prototype.startSlam = function () {
    this.enter("slamTel");
    const me = this;
    const TH = T();
    const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y);
    const px = this.root.position.x + fx * 4.2;
    const pz = this.root.position.z + fz * 4.2;
    this.fx.ring(px, this.groundY, pz, 3.2, 0xff3a22, 0.7);
    this.fx.ring(this.root.position.x, this.groundY, this.root.position.z, 2.6, 0xff3a22, 0.7);
    sfx(this.ctx, "boss_charge", { vol: 0.5 });
    this.timers.after(0.7, function () {
      if (!me.entity || !me.entity.alive) return;
      const fx2 = Math.sin(me.root.rotation.y), fz2 = Math.cos(me.root.rotation.y);
      const base = Math.atan2(fx2, fz2);
      for (let side = -1; side <= 1; side += 2) {
        for (let k = 0; k < 2; k++) {
          const ang = base + side * (0.18 + k * 0.42);
          const dist = 3.0 + k * 1.7;
          me._v.set(
            me.root.position.x + Math.sin(ang) * dist,
            me.groundY + 1.2,
            me.root.position.z + Math.cos(ang) * dist
          );
          hitbox(me.ctx, {
            team: "enemy", shape: "sphere", pos: me._v.clone(), r: 1.8,
            dmg: 13, knock: 11, stagger: 30, life: 0.12, src: me.entity, heavy: true
          });
        }
      }
      me._v.set(me.root.position.x + fx2 * 3.4, me.groundY + 0.6, me.root.position.z + fz2 * 3.4);
      burst(me.ctx, me._v, "spore", 30);
      burst(me.ctx, me._v, "dirt", 20);
      me.fx.ring(px, me.groundY, pz, 4.6, 0xffb060, 0.6);
      shake(me.ctx, 1.25, 0.6);
      sfx(me.ctx, "slam", { vol: 1 });
      me.enter(me.homeState());
    });
    this.attackCd = 3.2 + Math.random();
  };

  BossAI.prototype.startCharge = function () {
    this.enter("chargeTel");
    const pp = playerPos(this.ctx, this._p);
    const dx = pp ? pp.x - this.root.position.x : Math.sin(this.root.rotation.y);
    const dz = pp ? pp.z - this.root.position.z : Math.cos(this.root.rotation.y);
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    this.chargeDX = dx / d;
    this.chargeDZ = dz / d;
    if (pp) this.root.rotation.y = Math.atan2(this.chargeDX, this.chargeDZ);
    this.fx.line(this.root.position.x, this.groundY, this.root.position.z,
      Math.atan2(this.chargeDX, this.chargeDZ), 22, 3.6, 0xff3a22, 0.9);
    this.fx.ring(this.root.position.x, this.groundY, this.root.position.z, 3.2, 0xff3a22, 0.9);
    sfx(this.ctx, "boss_charge", { vol: 0.8 });
    const me = this;
    this.timers.after(0.9, function () {
      if (!me.entity || !me.entity.alive) return;
      me.enter("charge");
      me.chargeHitT = 0;
      sfx(me.ctx, "charge", { vol: 0.8 });
    });
    this.attackCd = 4.0;
  };

  BossAI.prototype.doCharge = function (dt) {
    const w = this.ctx.world;
    const speed = 21;
    const bx = this.root.position.x, bz = this.root.position.z;
    moveCircle(this.root, this.chargeDX * speed * dt, this.chargeDZ * speed * dt, this.radius, w);
    const moved = Math.sqrt((this.root.position.x - bx) * (this.root.position.x - bx) +
      (this.root.position.z - bz) * (this.root.position.z - bz));
    this.moveAmount = moved / Math.max(dt, 0.0001);
    this.chargeHitT -= dt;
    if (this.chargeHitT <= 0) {
      this.chargeHitT = 0.22;
      this._v.set(
        this.root.position.x + this.chargeDX * this.radius * 0.7,
        this.root.position.y + 1.4,
        this.root.position.z + this.chargeDZ * this.radius * 0.7
      );
      hitbox(this.ctx, {
        team: "enemy", shape: "sphere", pos: this._v.clone(), r: 2.3,
        dmg: 18, knock: 14, stagger: 30, life: 0.12, src: this.entity, heavy: true
      });
      burst(this.ctx, this._v, "dirt", 8);
      sfx(this.ctx, "boss_step", { vol: 0.6 });
    }
    let wall = this.stateT > 1.25 || moved < speed * dt * 0.4;
    if (w && w.arenaCenter) {
      const R = w.arenaRadius || 24;
      const dx = this.root.position.x - w.arenaCenter.x;
      const dz = this.root.position.z - w.arenaCenter.z;
      if (dx * dx + dz * dz > (R * 0.90) * (R * 0.90)) wall = true;
    }
    if (wall) this.wallImpact();
  };

  BossAI.prototype.wallImpact = function () {
    this.enter("stunned");
    this.stunT = 3;
    this.exposed = true;
    this.exposedT = 6;
    this.applyDamageMul();
    if (this.parts.coreL) this.parts.coreL.visible = true;
    if (this.parts.coreR) this.parts.coreR.visible = true;
    if (this.parts.coreGlowL && this.parts.coreGlowL.material) this.parts.coreGlowL.material.opacity = 0.9;
    if (this.parts.coreGlowR && this.parts.coreGlowR.material) this.parts.coreGlowR.material.opacity = 0.9;
    const p = this.root.position;
    burst(this.ctx, p, "shard", 26);
    burst(this.ctx, p, "spore", 20);
    shake(this.ctx, 1.4, 1.0);
    sfx(this.ctx, "wall_impact", { vol: 1 });
    this.fx.ring(p.x, this.groundY, p.z, 6.0, 0xffb060, 0.7);
    if (this.ctx.bus) this.ctx.bus.emit("boss:stun", { pos: p, entity: this.entity, dur: 3 });
    const me = this;
    this.timers.after(3.0, function () {
      if (me.state !== "stunned") return;
      me.enter(me.homeState());
      me.attackCd = 1.4;
    });
  };

  BossAI.prototype.startBreath = function () {
    this.enter("breathTel");
    const me = this;
    sfx(this.ctx, "boss_inhale", { vol: 0.6 });
    this.timers.after(0.6, function () {
      if (!me.entity || !me.entity.alive || me.state !== "breathTel") return;
      me.enter("breath");
      const TH = T();
      const mat = A().mat.flat(0xff9ec4, {
        transparent: true, opacity: 0.15, depthWrite: false,
        blending: TH.AdditiveBlending, side: TH.DoubleSide
      });
      const geo = new TH.ConeGeometry(2.9, 10, 16, 1, true);
      const mesh = new TH.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, -0.02, 5.3);
      mesh.renderOrder = 4;
      me.parts.head.add(mesh);
      me.breathMesh = mesh;
      me.breathMat = mat;
      sfx(me.ctx, "spore_breath", { vol: 0.8 });
      me.breathTick = 0;
      me.timers.after(2.5, function () {
        if (me.state !== "breath") return;
        me.removeBreathMesh();
        me.enter(me.homeState());
      });
    });
    this.attackCd = 4.2;
  };

  BossAI.prototype.removeBreathMesh = function () {
    if (this.breathMesh) {
      if (this.breathMesh.parent) this.breathMesh.parent.remove(this.breathMesh);
      if (this.breathMesh.geometry && this.breathMesh.geometry.dispose) this.breathMesh.geometry.dispose();
      if (this.breathMat && this.breathMat.dispose) this.breathMat.dispose();
      this.breathMesh = null;
      this.breathMat = null;
    }
  };

  BossAI.prototype.doBreath = function (dt, pp) {
    if (pp) faceTo(this.root, pp.x, pp.z, dt, 1.4);
    if (this.breathMat) this.breathMat.opacity = 0.12 + 0.07 * (0.5 + 0.5 * Math.sin(this.t * 18));
    this.breathTick -= dt;
    if (this.breathTick <= 0 && pp) {
      this.breathTick = 0.2;
      const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y);
      this._v.set(
        this.root.position.x + fx * 4.2,
        this.root.position.y + this.height * 0.72,
        this.root.position.z + fz * 4.2
      );
      hitbox(this.ctx, {
        team: "enemy", shape: "sphere", pos: this._v.clone(), r: 2.2,
        dmg: 6, knock: 3, stagger: 5, life: 0.16, src: this.entity
      });
      if (Math.random() < 0.6) burst(this.ctx, this._v, "spore", 3);
    }
  };

  BossAI.prototype.startSummon = function () {
    this.enter("summon");
    const me = this;
    const TH = T();
    for (let i = 0; i < 3; i++) {
      this.timers.after(0.3 + i * 0.22, function () {
        if (!me.entity || !me.entity.alive) return;
        const a = me.root.rotation.y + (i - 1) * 0.85;
        const x = me.root.position.x + Math.sin(a) * 3.6;
        const z = me.root.position.z + Math.cos(a) * 3.6;
        const gy = heightAt(me.ctx.world, x, z, me.groundY);
        const pos = new TH.Vector3(x, gy, z);
        spawnImp(pos, me.ctx);
        burst(me.ctx, pos, "spore", 12);
        sfx(me.ctx, "summon", { vol: 0.6 });
      });
    }
    this.timers.after(1.6, function () { if (me.state === "summon") me.enter(me.homeState()); });
    this.attackCd = 4.5;
  };

  /* ---------- movement states ---------- */
  BossAI.prototype.doGlide = function (dt, pp) {
    if (pp) {
      const dx = pp.x - this.root.position.x;
      const dz = pp.z - this.root.position.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 0.001;
      const nx = dx / d, nz = dz / d;
      const radial = (d - 8.6) * 0.9;
      let mx = nx * radial - nz * 1.3;
      let mz = nz * radial + nx * 1.3;
      const ml = Math.sqrt(mx * mx + mz * mz) || 1;
      const step = Math.min(1, ml) * 2.6 * dt;
      moveCircle(this.root, (mx / ml) * step, (mz / ml) * step, this.radius, this.ctx.world);
      this.moveAmount = 2.6;
      faceTo(this.root, pp.x, pp.z, dt, 3.5);
      this.attackCd -= dt;
      if (this.attackCd <= 0) {
        if (d < 3.8 && Math.random() < 0.6) this.startSwipe();
        else if (Math.random() < 0.55) this.startVolley();
        else this.startGeyser();
      }
    }
  };

  BossAI.prototype.doChase = function (dt, pp) {
    if (!pp) return;
    const dx = pp.x - this.root.position.x;
    const dz = pp.z - this.root.position.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 0.001;
    faceTo(this.root, pp.x, pp.z, dt, 6);
    if (d > 2.8) {
      const step = Math.min(d - 2.6, 5.8 * dt);
      moveCircle(this.root, (dx / d) * step, (dz / d) * step, this.radius, this.ctx.world);
      this.moveAmount = 5.8;
    } else {
      const nx = dx / d, nz = dz / d;
      moveCircle(this.root, -nz * 1.4 * dt + nx * 0.4 * dt, nx * 1.4 * dt + nz * 0.4 * dt, this.radius, this.ctx.world);
      this.moveAmount = 1.4;
    }
    this.attackCd -= dt;
    if (this.attackCd <= 0) {
      if (d < 3.2 && Math.random() < 0.7) this.startCombo();
      else if (d < 8 && Math.random() < 0.45) this.startLeap();
      else if (Math.random() < 0.55) this.startCombo();
      else this.startMines(3);
    }
  };

  BossAI.prototype.startMines = function (n) {
    this.enter("mines");
    this.spawnMines(n || 3);
    const me = this;
    this.timers.after(1.2, function () { if (me.state === "mines") me.enter(me.homeState()); });
    this.attackCd = 3.4 + Math.random();
  };

  BossAI.prototype.doWalk = function (dt, pp) {
    if (!pp) return;
    const dx = pp.x - this.root.position.x;
    const dz = pp.z - this.root.position.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 0.001;
    faceTo(this.root, pp.x, pp.z, dt, 2.6);
    if (d > 5.5) {
      const step = Math.min(d - 5, 3.2 * dt);
      moveCircle(this.root, (dx / d) * step, (dz / d) * step, this.radius, this.ctx.world);
      this.moveAmount = 3.2;
    } else if (d < 3.8) {
      moveCircle(this.root, -(dx / d) * 1.2 * dt, -(dz / d) * 1.2 * dt, this.radius, this.ctx.world);
      this.moveAmount = 1.2;
    }
    /* heavy footfalls */
    if (this.moveAmount > 1.5) {
      this.stepT += dt;
      if (this.stepT > 0.5) {
        this.stepT = 0;
        shake(this.ctx, 0.12, 0.12);
        sfx(this.ctx, "boss_step", { vol: 0.35 });
      }
    }
    this.attackCd -= dt;
    if (this.attackCd <= 0) {
      const r = Math.random();
      if (r < 0.33) this.startSlam();
      else if (r < 0.62) this.startCharge();
      else if (r < 0.83) this.startBreath();
      else this.startSummon();
    }
  };

  /* ---------- main update ---------- */
  BossAI.prototype.update = function (dt, ctx) {
    if (ctx) this.ctx = ctx;
    this.t += dt;
    this.stateT += dt;
    if (this.entity) { this.entity.tick(dt); this.hp = this.entity.hp; }
    this.teleCd = Math.max(0, this.teleCd - dt);
    this.updateDebris(dt);
    this.updateMines(dt);
    this.updatePlates(dt);
    this.fx.update(dt);
    this.timers.update(dt);

    /* knockback */
    if (this.knockX || this.knockZ) {
      this.root.position.x += this.knockX * dt;
      this.root.position.z += this.knockZ * dt;
      this.knockX *= Math.exp(-8 * dt);
      this.knockZ *= Math.exp(-8 * dt);
    }

    const pp = playerPos(this.ctx, this._p);
    let moved = false;

    if (!this.entity || !this.entity.alive) {
      this.animate(dt, pp);
      return;
    }

    /* prune damage log */
    const dl = this.dmgLog;
    let cut = 0;
    while (cut < dl.length && this.t - dl[cut].t > 3.5) cut++;
    if (cut > 4) dl.splice(0, cut);

    /* phase safety net */
    const frac = this.hp / this.maxHp;
    if (this.phase === 1 && frac <= 0.70) { this.setPhase(2); this.animate(dt, pp); return; }
    if (this.phase === 2 && frac <= 0.30) { this.setPhase(3); this.animate(dt, pp); return; }

    /* stagger takes over */
    if (this.staggerT > 0) {
      this.staggerT -= dt;
      if (this.state !== "stagger") {
        this.timers.clear();
        this.enter("stagger");
      }
      if (this.staggerT <= 0) {
        this.attackCd = 1.2;
        this.enter(this.homeState());
      }
      this.applyGround();
      this.animate(dt, pp);
      return;
    }
    this.staggerBar = Math.max(0, this.staggerBar - dt * 2.2);

    switch (this.state) {
      case "intro":
        if (this.stateT > 1.3) this.enter(this.homeState());
        break;
      case "roar":
        if (this.stateT > 1.15) { this.attackCd = 1.2; this.enter(this.homeState()); }
        break;
      case "glide": this.doGlide(dt, pp); break;
      case "chase": this.doChase(dt, pp); break;
      case "walk": this.doWalk(dt, pp); break;
      case "leap":
        moved = true;
        this.leapT = Math.min(1, this.stateT / this.leapDur);
        this.root.position.x = U.lerp(this.leapFromX, this.leapToX, this.leapT);
        this.root.position.z = U.lerp(this.leapFromZ, this.leapToZ, this.leapT);
        this.root.position.y = this.leapGY + Math.sin(this.leapT * Math.PI) * 3.4;
        break;
      case "charge": this.doCharge(dt); break;
      case "breath": this.doBreath(dt, pp); break;
      case "teleport": break;
      case "dead": break;
      default: {
        /* stationary attack states — safety valve */
        const max = STATE_MAX[this.state] || 2.0;
        if (this.stateT > max) this.enter(this.homeState());
        break;
      }
    }

    if (!moved) this.applyGround();

    /* stagger bar / exposed core timers */
    if (this.exposedT > 0) {
      this.exposedT -= dt;
      if (this.exposedT <= 0 && this.platesBroken === 0 && this.staggerT <= 0) {
        this.exposed = false;
        this.applyDamageMul();
        if (this.parts.coreL) this.parts.coreL.visible = false;
        if (this.parts.coreR) this.parts.coreR.visible = false;
        if (this.parts.coreGlowL && this.parts.coreGlowL.material) this.parts.coreGlowL.material.opacity = 0;
        if (this.parts.coreGlowR && this.parts.coreGlowR.material) this.parts.coreGlowR.material.opacity = 0;
      }
    }
    this.animate(dt, pp);
  };

  BossAI.prototype.onDeath = function () {
    if (this.deathEmitted) return;
    this.deathEmitted = true;
    this.hp = 0;
    this.enter("dead");
    this.removeBreathMesh();
    this.clearMines();
    this.applyDamageMul();
    for (let i = 0; i < this.plates.length; i++) {
      const rec = this.plates[i];
      if (rec.ent && rec.ent.alive) {
        rec.ent.alive = false; rec.ent._dead = true;
        if (this.ctx.combat && this.ctx.combat.unregister) {
          try { this.ctx.combat.unregister(rec.ent); } catch (e) { }
        }
      }
      if (rec.anchor && rec.anchor.parent) rec.anchor.parent.remove(rec.anchor);
    }
    const p = this.root.position;
    burst(this.ctx, p, "spore", 60);
    burst(this.ctx, p, "core", 24);
    shake(this.ctx, 1.6, 1.4);
    sfx(this.ctx, "boss_down", { vol: 1 });
    if (this.ctx.bus) this.ctx.bus.emit("boss:down", { pos: p, entity: this.entity, phase: this.phase });
  };

  /* ---------- procedural animation ---------- */
  BossAI.prototype.animate = function (dt, pp) {
    const P = this.pose, t = this.t, st = this.state;
    if (!P) return;
    P.clear();
    const breathe = Math.sin(t * 1.6) * 0.03;
    P.set("hips", 0, Math.sin(t * 0.5) * 0.05, 0);
    P.set("chest", 0.02 + breathe, 0, 0);
    P.set("head", Math.sin(t * 1.2) * 0.04, Math.sin(t * 0.62) * 0.08, 0);

    if (this.phase === 1) {
      P.set("cap", Math.sin(t * 1.35) * 0.045, Math.sin(t * 0.7) * 0.03, Math.sin(t * 1.1) * 0.03);
      P.set("armL.sh", 0, 0, -0.42 + Math.sin(t * 1.8) * 0.05);
      P.set("armL.el", -0.22, 0, 0);
      P.set("armR.sh", 0, 0, 0.42 + Math.sin(t * 1.8 + 1) * 0.05);
      P.set("armR.el", -0.22, 0, 0);
      P.set("propR", Math.sin(t * 1.3) * 0.05, 0, Math.sin(t * 1.1) * 0.04);
      if (st === "volley") {
        const k = Math.min(1, this.stateT / 0.2);
        P.set("armR.sh", -0.9 * k, 0.1, 0.75);
        P.set("armR.el", -0.5, 0, 0);
        P.set("cap", -0.12 * k, 0, 0.1 * k);
      } else if (st === "geyser") {
        P.set("armL.sh", -1.4, 0, -0.9);
        P.set("armR.sh", -1.4, 0, 0.9);
        P.set("propR", 0.3, 0, 0);
        P.set("cap", -0.16, 0, 0);
      } else if (st === "swipe") {
        const sw = Math.min(1, this.stateT / 0.3);
        P.set("chest", 0.35, -0.4 + sw * 0.8, 0);
        P.set("armR.sh", -1.1, 0, 0.9 - sw * 0.4);
      } else if (st === "roar") {
        P.set("chest", -0.2, 0, 0);
        P.set("head", -0.28, 0, 0);
        P.set("cap", -0.2, 0, 0);
        P.set("armL.sh", 0.4, 0, -1.1);
        P.set("armR.sh", 0.4, 0, 1.1);
        P.set("propR", 0, 0, 0.5);
      } else if (st === "stagger") {
        P.set("chest", 0.5, 0.15, 0.15);
        P.set("head", 0.5, 0.2, 0.1);
        P.set("cap", 0.25, 0, 0.1);
        P.set("armL.sh", 0.3, 0, -0.6);
        P.set("armR.sh", 0.3, 0, 0.6);
      } else if (st === "dead") {
        P.set("chest", 0.9, 0.2, 0.3);
        P.set("head", 0.7, 0, 0.2);
        P.set("cap", 0.5, 0, 0.2);
        P.set("armL.sh", 0.5, 0, -0.8);
        P.set("armR.sh", 0.5, 0, 0.8);
      }
      P.apply(dt, st === "dead" ? 3 : 8);
    } else if (this.phase === 2) {
      const walk = this.moveAmount > 0.5;
      const ph = t * 7;
      P.set("chest", 0.30 + breathe, 0, 0);
      P.set("head", -0.18 + Math.sin(t * 1.4) * 0.05, Math.sin(t * 0.7) * 0.1, 0);
      P.set("armL.sh", 0.1, 0, -0.55);
      P.set("armL.el", -0.43, 0, 0);
      P.set("armR.sh", 0.1, 0, 0.55);
      P.set("armR.el", -0.43, 0, 0);
      if (walk) {
        P.add("legL.hip", Math.sin(ph) * 0.55, 0, 0);
        P.add("legR.hip", -Math.sin(ph) * 0.55, 0, 0);
        P.add("legL.knee", Math.max(0, -Math.sin(ph)) * 0.45, 0, 0);
        P.add("legR.knee", Math.max(0, Math.sin(ph)) * 0.45, 0, 0);
        P.add("armL.sh", 0, Math.sin(ph) * 0.2, 0);
        P.add("armR.sh", 0, -Math.sin(ph) * 0.2, 0);
      }
      if (st === "combo") {
        const sw = Math.sin(this.stateT * 18);
        P.set("chest", 0.45, Math.sin(this.stateT * 12) * 0.4, 0);
        P.set("armL.sh", -1.5 + sw * 0.5, 0, -0.3);
        P.set("armL.el", -0.2, 0, 0);
        P.set("armR.sh", -1.5 - sw * 0.5, 0, 0.3);
        P.set("armR.el", -0.2, 0, 0);
      } else if (st === "leap") {
        P.set("legL.hip", -0.8, 0, 0);
        P.set("legR.hip", -0.8, 0, 0);
        P.set("legL.knee", 1.2, 0, 0);
        P.set("legR.knee", 1.2, 0, 0);
        P.set("armL.sh", -1.2, 0, -0.8);
        P.set("armR.sh", -1.2, 0, 0.8);
        P.set("chest", 0.5, 0, 0);
      } else if (st === "roar") {
        P.set("chest", -0.1, 0, 0);
        P.set("head", -0.5, 0, 0);
        P.set("armL.sh", 0.3, 0, -1.3);
        P.set("armR.sh", 0.3, 0, 1.3);
      } else if (st === "stagger") {
        P.set("chest", 0.7, 0.2, 0.2);
        P.set("head", 0.5, 0.3, 0.15);
        P.set("armL.sh", 0.45, 0, -0.9);
        P.set("armR.sh", 0.45, 0, 0.9);
        P.set("legL.knee", 0.6, 0, 0);
        P.set("legR.knee", 0.4, 0, 0);
      } else if (st === "dead") {
        P.set("chest", 1.1, 0.2, 0.25);
        P.set("head", 0.6, 0.2, 0.2);
        P.set("armL.sh", 0.6, 0, -0.9);
        P.set("armR.sh", 0.6, 0, 0.9);
        P.set("legL.hip", -0.7, 0, 0);
        P.set("legR.hip", -0.7, 0, 0);
        P.set("legL.knee", 1.6, 0, 0);
        P.set("legR.knee", 1.6, 0, 0);
      }
      P.apply(dt, st === "dead" ? 3 : 12);
    } else {
      const walk = this.moveAmount > 0.5;
      const ph = t * 3.4;
      P.set("chest", 0.08 + breathe * 1.5, 0, Math.sin(t * 0.6) * 0.02);
      P.set("head", -0.12 + Math.sin(t * 1.1) * 0.04, Math.sin(t * 0.5) * 0.08, 0);
      P.set("jaw", st === "breath" ? 0.5 + Math.sin(t * 9) * 0.08 : 0.06);
      P.set("shoulderLPivot", 0, 0, -0.16 + Math.sin(t * 1.4) * 0.03);
      P.set("shoulderRPivot", 0, 0, 0.16 - Math.sin(t * 1.4) * 0.03);
      P.set("armL.el", -0.18 + Math.sin(t * 1.2) * 0.05, 0, 0);
      P.set("armR.el", -0.18 + Math.sin(t * 1.2 + 1) * 0.05, 0, 0);
      if (walk) {
        P.add("legL.hip", Math.sin(ph) * 0.36, 0, 0);
        P.add("legR.hip", -Math.sin(ph) * 0.36, 0, 0);
        P.add("legL.knee", Math.max(0, -Math.sin(ph)) * 0.4, 0, 0);
        P.add("legR.knee", Math.max(0, Math.sin(ph)) * 0.4, 0, 0);
        P.add("chest", 0, 0, Math.sin(ph) * 0.05);
      }
      if (st === "slamTel") {
        const e = Math.min(1, this.stateT / 0.6);
        P.set("shoulderLPivot", 0, 0, -1.5 * e);
        P.set("shoulderRPivot", 0, 0, 1.5 * e);
        P.set("armL.el", -0.4 - e * 0.5, 0, 0);
        P.set("armR.el", -0.4 - e * 0.5, 0, 0);
        P.set("chest", -0.15 * e, 0, 0);
        P.set("jaw", 0.2 * e, 0, 0);
      } else if (st === "chargeTel") {
        P.set("chest", 0.45, 0, 0);
        P.set("head", 0.2, 0, 0);
        P.set("legL.hip", 0.4, 0, 0);
        P.set("legR.hip", -0.4, 0, 0);
        P.set("jaw", 0.35, 0, 0);
      } else if (st === "charge") {
        P.set("chest", 0.62, 0, 0);
        P.set("head", 0.15, 0, 0);
        P.set("jaw", 0.5 + Math.sin(t * 14) * 0.1);
        P.set("legL.hip", 0.8, 0, 0);
        P.set("legR.hip", -0.8, 0, 0);
        P.set("armL.el", -0.9, 0, 0);
        P.set("armR.el", -0.9, 0, 0);
      } else if (st === "stunned") {
        P.set("chest", 0.9, 0.3, 0.35);
        P.set("head", 0.6, 0.4, 0.3);
        P.set("jaw", 0.6, 0, 0);
        P.set("shoulderLPivot", 0, 0, -0.5);
        P.set("shoulderRPivot", 0, 0, 0.5);
        P.set("legL.hip", -0.5, 0, 0);
        P.set("legR.hip", -0.5, 0, 0);
        P.set("legL.knee", 0.9, 0, 0);
        P.set("legR.knee", 0.9, 0, 0);
      } else if (st === "breath") {
        P.set("chest", -0.1, 0, 0);
        P.set("head", 0.1, 0, 0);
        P.set("jaw", 0.62 + Math.sin(t * 16) * 0.06);
      } else if (st === "summon") {
        P.set("shoulderLPivot", -0.9, 0, -1.2);
        P.set("shoulderRPivot", -0.9, 0, 1.2);
        P.set("chest", -0.15, 0, 0);
        P.set("head", -0.35, 0, 0);
        P.set("jaw", 0.55, 0, 0);
      } else if (st === "roar") {
        P.set("chest", -0.25, 0, 0);
        P.set("head", -0.55, 0, 0);
        P.set("jaw", 0.9);
        P.set("shoulderLPivot", 0.4, 0, -1.3);
        P.set("shoulderRPivot", 0.4, 0, 1.3);
      } else if (st === "stagger") {
        P.set("chest", 0.75, 0.25, 0.2);
        P.set("head", 0.6, 0.3, 0.2);
        P.set("jaw", 0.5, 0, 0);
        P.set("shoulderLPivot", 0.25, 0, -0.4);
        P.set("shoulderRPivot", 0.25, 0, 0.4);
        P.set("legL.hip", -0.35, 0, 0);
        P.set("legR.hip", -0.35, 0, 0);
        P.set("legL.knee", 0.7, 0, 0);
        P.set("legR.knee", 0.7, 0, 0);
      } else if (st === "dead") {
        const e = U.ease(Math.min(1, this.stateT / 3.0), "outCubic");
        P.set("chest", 0.9 * e, 0.2 * e, 0.3 * e);
        P.set("head", 0.8 * e, 0.2 * e, 0.3 * e);
        P.set("jaw", 0.8 * e);
        P.set("shoulderLPivot", 0.6 * e, 0, -0.7);
        P.set("shoulderRPivot", 0.6 * e, 0, 0.7);
        P.set("legL.hip", -1.2 * e, 0, 0);
        P.set("legR.hip", -1.2 * e, 0, 0);
        P.set("legL.knee", 2.0 * e, 0, 0);
        P.set("legR.knee", 2.0 * e, 0, 0);
        this.parts.hips.position.y = 3.25 - 0.55 * e;
      }
      P.apply(dt, st === "dead" ? 2.5 : 7);
    }

    /* drifting motes */
    const motes = this.parts.motes;
    if (motes) {
      for (let i = 0; i < motes.length; i++) {
        const mo = motes[i];
        const a = t * mo.sp + mo.ph;
        mo.s.position.set(Math.sin(a) * mo.r, mo.y + Math.sin(t * 1.3 + mo.ph) * 0.18, Math.cos(a) * mo.r);
      }
    }
    /* core pulse */
    const pulse = 1 + Math.sin(t * 6) * 0.09;
    for (let i = 0; i < 2; i++) {
      const core = this.parts["core" + (i ? "R" : "L")];
      if (core && core.visible) core.scale.setScalar(0.40 * pulse);
    }
    if (this.parts.coreC && this.parts.coreC.visible) this.parts.coreC.scale.setScalar(0.30 * pulse);
    /* aura pulse on telegraph states */
    let auraAmt = 0;
    if (st === "slamTel" || st === "chargeTel" || st === "breathTel" || st === "stunned" || st === "stagger") {
      auraAmt = 0.16 + 0.18 * (0.5 + 0.5 * Math.sin(t * 12));
    }
    if (this.aura && this.aura.material) {
      this.aura.material.opacity = U.damp(this.aura.material.opacity || 0, auraAmt, 8, dt);
    }
  };

  /* =====================================================================
     AI: SPORE IMP
     ===================================================================== */
  function ImpAI(root, parts, ctx) {
    this.root = root;
    this.parts = parts;
    this.ctx = ctx || getCtx();
    this.radius = 0.35;
    this.height = 0.7;
    this.entity = null;
    this.state = "hop";
    this.stateT = 0;
    this.t = Math.random() * 4;
    this.attackCd = 0.8 + Math.random() * 0.8;
    this.hopPhase = Math.random() * Math.PI;
    this.hopRate = 5.2 + Math.random() * 1.2;
    this.leapX = 0; this.leapZ = 0;
    this.knockX = 0; this.knockZ = 0;
    this.pose = new RigPose(parts, ["hips", "chest", "head", "cap", "armL.sh", "armR.sh", "legL.foot", "legR.foot"]);
    this.fx = new Fx(root.parent || getScene());
    this.timers = new Timers();
    this.aura = makeAura(root, 0xff7a33, 0.9, 0.4);
    this._p = new (T().Vector3)();
    this._v = new (T().Vector3)();
    this.isImp = true;
  }

  ImpAI.prototype.enter = function (s) { this.state = s; this.stateT = 0; };

  ImpAI.prototype.onDamaged = function (dmg, hit) {
    if (hit && hit.from) {
      const dx = this.root.position.x - hit.from.x;
      const dz = this.root.position.z - hit.from.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      this.knockX += (dx / d) * 3.5;
      this.knockZ += (dz / d) * 3.5;
    }
  };

  ImpAI.prototype.onDeath = function () {
    const p = this.root.position;
    burst(this.ctx, p, "spore", 18);
    burst(this.ctx, p, "capShard", 6);
    burst(this.ctx, p, "mote", 6);
    sfx(this.ctx, "imp_pop", { vol: 0.5 });
    if (this.ctx.bus) this.ctx.bus.emit("imp:death", { pos: p, entity: this.entity });
    this.root.visible = false;
    this.removeMe = 0.1;
  };

  ImpAI.prototype.update = function (dt, ctx) {
    if (ctx) this.ctx = ctx;
    this.t += dt;
    this.stateT += dt;
    if (this.entity) {
      this.entity.tick(dt);
      if (!this.entity.alive) { this.animate(dt); return; }
    }
    const pp = playerPos(this.ctx, this._p);
    const world = this.ctx.world;
    this.root.position.x += this.knockX * dt;
    this.root.position.z += this.knockZ * dt;
    this.knockX *= Math.exp(-8 * dt);
    this.knockZ *= Math.exp(-8 * dt);

    if (pp) faceTo(this.root, pp.x, pp.z, dt, 8);
    const d = pp ? Math.sqrt(
      (pp.x - this.root.position.x) * (pp.x - this.root.position.x) +
      (pp.z - this.root.position.z) * (pp.z - this.root.position.z)
    ) : 99;

    let hopY = 0;
    switch (this.state) {
      case "hop": {
        this.attackCd -= dt;
        this.hopPhase += dt * this.hopRate;
        hopY = Math.abs(Math.sin(this.hopPhase)) * 0.22;
        if (pp && d > 1.2 && d < (this.leash || 999)) {
          const step = 2.3 * dt;
          moveCircle(this.root, ((pp.x - this.root.position.x) / d) * step,
            ((pp.z - this.root.position.z) / d) * step, this.radius, world);
        }
        if (this.attackCd <= 0 && d < 2.6 && d < (this.leash || 999)) this.enter("wind");
        break;
      }
      case "wind": {
        pulseAura(this.aura, 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(this.stateT * 40)));
        hopY = 0.05;
        if (this.stateT >= 0.32) {
          this.enter("lunge");
          if (pp) {
            this.leapX = (pp.x - this.root.position.x) / (d || 1);
            this.leapZ = (pp.z - this.root.position.z) / (d || 1);
          }
          sfx(this.ctx, "imp_yell", { vol: 0.4 });
        }
        break;
      }
      case "lunge": {
        hopY = Math.sin(Math.min(1, this.stateT / 0.24) * Math.PI) * 0.35;
        const step = 7.0 * dt;
        moveCircle(this.root, this.leapX * step, this.leapZ * step, this.radius, world);
        if (this.stateT >= 0.10 && !this.lunged) {
          this.lunged = true;
          const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y);
          this._v.set(this.root.position.x + fx * 0.55, this.root.position.y + 0.42, this.root.position.z + fz * 0.55);
          hitbox(this.ctx, {
            team: "enemy", shape: "sphere", pos: this._v.clone(), r: 0.75,
            dmg: 7, knock: 5, stagger: 8, life: 0.1, src: this.entity
          });
          burst(this.ctx, this._v, "spore", 8);
        }
        if (this.stateT >= 0.26) {
          this.lunged = false;
          this.enter("recover");
        }
        break;
      }
      case "recover": {
        hopY = Math.max(0, 0.06 - this.stateT * 0.2);
        if (this.stateT >= 0.45) {
          this.attackCd = 1.0 + Math.random() * 1.2;
          this.enter("hop");
        }
        break;
      }
    }
    const gy = heightAt(world, this.root.position.x, this.root.position.z, 0);
    this.root.position.y = gy + hopY;
    this.animate(dt);
    this.fx.update(dt);
    this.timers.update(dt);
    if (this.removeMe !== undefined) {
      this.removeMe -= dt;
      if (this.removeMe <= 0 && this.root.parent) {
        this.root.parent.remove(this.root);
        this.removeMe = undefined;
        this.gone = true;
      }
    }
  };

  ImpAI.prototype.animate = function (dt) {
    const P = this.pose, t = this.t;
    P.clear();
    const hop = Math.abs(Math.sin(this.hopPhase));
    P.set("hips", 0, Math.sin(t * 3) * 0.08, 0);
    P.set("chest", 0.08 + hop * 0.15, 0, Math.sin(t * 7) * 0.06);
    P.set("head", -0.05, Math.sin(t * 5) * 0.12, 0);
    P.set("cap", Math.sin(t * 6) * 0.08, 0, Math.sin(t * 5) * 0.08);
    P.set("armL.sh", Math.sin(t * 9) * 0.5, 0, -0.2);
    P.set("armR.sh", -Math.sin(t * 9) * 0.5, 0, 0.2);
    P.set("legL.foot", 0, 0, 0);
    if (this.state === "wind") {
      P.set("chest", 0.5, 0, 0);
      P.set("head", -0.35, 0, 0);
      P.set("cap", -0.2, 0, 0);
    } else if (this.state === "lunge") {
      P.set("chest", -0.25, 0, 0);
      P.set("head", 0.3, 0, 0);
      P.set("armL.sh", -1.2, 0, -0.5);
      P.set("armR.sh", -1.2, 0, 0.5);
    } else if (this.state === "recover") {
      P.set("chest", 0.3, 0, 0);
    }
    P.apply(dt, 18);
  };

  /* =====================================================================
     SPAWNING + PUBLIC API
     ===================================================================== */
  function placeAt(root, pos, world) {
    if (!pos) { root.position.set(0, heightAt(world, 0, 0, 0), 0); return root; }
    if (pos.position) pos = pos.position;
    const x = typeof pos.x === "number" ? pos.x : 0;
    const z = typeof pos.z === "number" ? pos.z : 0;
    const y = typeof pos.y === "number" ? pos.y : heightAt(world, x, z, 0);
    root.position.set(x, y, z);
    return root;
  }

  function track(pair) {
    active.push(pair);
    return pair;
  }

  function spawnAssassin(pos, ctxArg) {
    const ctx = ctxArg || getCtx();
    const built = buildAssassin();
    const scene = getScene() || (ctx.scene || null);
    if (scene) scene.add(built.root);
    placeAt(built.root, pos, ctx.world);
    const ai = new AssassinAI(built.root, built.parts, ctx);
    const entity = makeEntity({
      root: built.root, radius: built.radius, height: built.height, hp: 420, ctx: ctx,
      name: "assassin", kind: "assassin", ai: ai,
      onDeath: function () { ai.onDeath(); }
    });
    ai.entity = entity;
    entity.ai = ai;
    ai.maxHp = 420;
    return track({ entity: entity, ai: ai, root: built.root, parts: built.parts, name: "assassin" });
  }

  function spawnBoss(pos, ctxArg, phaseArg) {
    const ctx = ctxArg || getCtx();
    const phase = phaseArg || 1;
    const built = buildBoss(phase);
    const scene = getScene() || (ctx.scene || null);
    if (scene) scene.add(built.root);
    placeAt(built.root, pos, ctx.world);
    const ai = new BossAI(built.root, built.parts, ctx, phase);
    const entity = makeEntity({
      root: built.root, radius: built.radius, height: built.height, hp: 1500, ctx: ctx,
      name: "sporefather", kind: "boss", ai: ai,
      onDeath: function () { ai.onDeath(); }
    });
    ai.entity = entity;
    entity.ai = ai;
    ai.maxHp = 1500;
    ai.hp = 1500;
    return track({ entity: entity, ai: ai, root: built.root, parts: built.parts, name: "sporefather" });
  }

  function spawnImp(pos, ctxArg) {
    const ctx = ctxArg || getCtx();
    const built = buildImp();
    const scene = getScene() || (ctx.scene || null);
    if (scene) scene.add(built.root);
    placeAt(built.root, pos, ctx.world);
    const ai = new ImpAI(built.root, built.parts, ctx);
    const entity = makeEntity({
      root: built.root, radius: 0.35, height: 0.7, hp: 40, ctx: ctx,
      name: "sporeImp", kind: "imp", ai: ai,
      onDeath: function () { ai.onDeath(); }
    });
    ai.entity = entity;
    entity.ai = ai;
    return track({ entity: entity, ai: ai, root: built.root, parts: built.parts, name: "sporeImp" });
  }

  function update(dt, ctx) {
    for (let i = active.length - 1; i >= 0; i--) {
      const a = active[i];
      if (a.ai.gone) { active.splice(i, 1); continue; }
      try { a.ai.update(dt, ctx); }
      catch (e) { console.error("[villains] update", e); }
    }
  }

  function init(scene) {
    sceneRef = scene || sceneRef;
    try { mats(); } catch (e) { console.warn("[villains] mat warmup skipped", e); }
    if (getScene() && !init._built) {
      init._built = false;
    }
    return G.villains;
  }

  G.villains = {
    init: init,
    spawnAssassin: spawnAssassin,
    spawnBoss: spawnBoss,
    spawnImp: spawnImp,
    buildAssassin: buildAssassin,
    buildBoss: buildBoss,
    buildImp: buildImp,
    update: update,
    active: active,
    AssassinAI: AssassinAI,
    BossAI: BossAI,
    ImpAI: ImpAI,
    get scene() { return sceneRef; }
  };
})();
