/* ============================================================================
   SPOREHEART — src/characters.js
   The cast, modelled entirely from charakit primitives.

     witch  — the player: oversized bent hat, ink cloak, skull pauldron, eye staff
     crane  — heavy companion: heron-skull helm, cannon gauntlet, black bell robe
     drone  — support companion: mint braids, glyph poncho, potion staff, puffball

   Every character exposes the SPEC rig (hips/chest/head/hairBack/arms/legs/
   cloak[]/propR/propL) plus extras, a MARIONETTE animator with the full clip
   set, and {root, parts, anim, height, radius, team}.
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  if (!G || !G.kit) throw new Error("characters.js requires charakit.js");
  const K = G.kit, PAL = G.CONF.PAL, U = G.util, A = G.assets;
  const T = () => G.THREE;
  const PI = Math.PI, TAU = PI * 2;

  const C = {};
  const DEFS = {
    witch: { height: 1.45, radius: 0.34, team: "player" },
    crane: { height: 2.40, radius: 0.55, team: "player" },
    drone: { height: 1.30, radius: 0.30, team: "player" }
  };

  /* keyframe helper: KF(time, bone, rot, pos, scl, ease) */
  const KF = K.kf;

  /* ==========================================================================
     WITCH — player / chibi staff-mage
     ========================================================================== */
  function buildWitch() {
    const rig = K.rig({ name: "witch", height: DEFS.witch.height });
    const g = K.geo, M = K.mat;
    const DS = T().DoubleSide;
    const add = rig.add.bind(rig);

    /* -- palette ------------------------------------------------------- */
    const skinM = M.toon(0xf3dcc6);
    const hairM = M.toon(0x15171f);
    const cloakM = M.toon(PAL.inkNavy);
    const cloakDk = M.toon(0x1a2130);
    const mantleM = M.toon(0x2a3444, { side: DS });
    const creamM = M.toon(PAL.cream);
    const orangeM = M.toon(PAL.orange);
    const boneM = M.toon(PAL.bone);
    const skirtM = M.toon(0x52678c);
    const skirtLt = M.toon(0x93a3bf);
    const leatherM = M.toon(0x6b4e33);
    const leatherDk = M.toon(0x4a3626);
    const woodM = M.toon(0x3a2c21);
    const oliveM = M.toon(0x6f7d3c);
    const darkM = M.toon(0x14161a);
    const brassM = M.toon(0xb08a4a);

    /* -- skeleton ------------------------------------------------------ */
    rig.bone("hips", null, [0, 0.70, 0]);
    rig.bone("chest", "hips", [0, 0.26, 0]);
    rig.bone("neck", "chest", [0, 0.17, 0]);
    rig.bone("head", "neck", [0, 0.10, 0]);
    rig.bone("hairBack", "head", [0, 0.03, -0.05], null, { sway: 0.035, phase: 0.4 });
    rig.bone("hat", "head", [0, 0.15, -0.012], [-0.25, 0, -0.05]);
    rig.bone("hatTip", "hat", [0, 0.24, 0], [0.20, 0, -0.30], { sway: 0.022, phase: 1.7 });

    rig.bone("armL.sh", "chest", [0.155, 0.13, 0], [0, 0, 0.13]);
    rig.bone("armL.el", "armL.sh", [0, -0.19, 0]);
    rig.bone("armL.hand", "armL.el", [0, -0.17, 0]);
    rig.bone("armR.sh", "chest", [-0.155, 0.13, 0], [0, 0, -0.13]);
    rig.bone("armR.el", "armR.sh", [0, -0.19, 0]);
    rig.bone("armR.hand", "armR.el", [0, -0.17, 0]);

    rig.bone("legL.hip", "hips", [0.075, -0.06, 0]);
    rig.bone("legL.knee", "legL.hip", [0, -0.20, 0]);
    rig.bone("legL.foot", "legL.knee", [0, -0.20, 0]);
    rig.bone("legR.hip", "hips", [-0.075, -0.06, 0]);
    rig.bone("legR.knee", "legR.hip", [0, -0.20, 0]);
    rig.bone("legR.foot", "legR.knee", [0, -0.20, 0]);

    rig.bone("scarf", "neck", [0.055, 0.03, 0.09], [0.2, 0, 0.15], { sway: 0.055, phase: 2.2 });

    /* cloak: five hinged panels, each with a secondary tip hinge */
    const panelAng = [0.60, 1.76, PI, -1.76, -0.60];
    for (let i = 0; i < panelAng.length; i++) {
      const a = panelAng[i];
      rig.bone("cloak." + i, "chest", [Math.sin(a) * 0.175, -0.03, Math.cos(a) * 0.175], [-0.10, a, 0],
        { sway: 0.045 + i * 0.008, phase: i * 1.15 });
      rig.bone("cloakTip." + i, "cloak." + i, [0, -0.22, 0], [0.12, 0, 0], { sway: 0.065, phase: i * 1.15 + 0.5 });
    }

    /* props */
    rig.bone("propR", "armR.hand", [0, -0.03, 0.0]);
    rig.bone("staff", "propR", [0, 0, 0], [0.02, 0, 0.13]);
    rig.bone("staffEye", "staff", [0, 1.80, 0]);
    rig.bone("charm", "staffEye", [0.12, -0.03, 0], [0, 0, 0], { sway: 0.10, phase: 3.1 });
    rig.bone("propL", "armL.hand", [0, -0.02, 0]);

    /* -- body ---------------------------------------------------------- */
    add("hips", g.sphere(), skirtM, { s: [0.135, 0.115, 0.115] });
    add("chest", g.sphere(), skirtM, { p: [0, 0.04, 0], s: [0.135, 0.135, 0.11] });
    add("chest", g.bell(0.12, 0.17, 0.30, 14, 0, 2), skirtM, { p: [0, -0.12, 0], o: 0.05 });
    add("neck", g.cyl(0.045, 0.05, 0.10, 10), skinM, { p: [0, 0.02, 0] });

    /* layered blue skirt (under the cloak) */
    for (let i = 0; i < 4; i++) {
      const a = 0.7 + i * (TAU / 4);
      const sk = K.mk(g.tatter(0.20, 0.24, 0.025, 0.014, 3, 1.05), skirtM, {});
      sk.position.set(Math.sin(a) * 0.115, 0.02, Math.cos(a) * 0.115);
      sk.rotation.set(-0.17, a, 0);
      rig.attach("hips", sk);
    }
    /* front panel with pale rolled lining */
    const front = K.mk(g.tatter(0.17, 0.23, 0.02, 0.016, 3, 1.02), skirtM, {});
    front.position.set(0, 0.0, 0.135);
    front.rotation.set(-0.2, 0, 0);
    rig.attach("hips", front);
    add("hips", g.cyl(0.075, 0.08, 0.035, 12), skirtLt, { p: [0, -0.10, 0.135], r: [PI / 2, 0, 0] });

    /* -- legs ---------------------------------------------------------- */
    for (const s of ["L", "R"]) {
      add("leg" + s + ".hip", g.cyl(0.052, 0.046, 0.20, 9), skinM, { p: [0, -0.10, 0] });
      add("leg" + s + ".knee", g.cyl(0.046, 0.042, 0.19, 9), leatherDk, { p: [0, -0.095, 0] });
      add("leg" + s + ".foot", g.cyl(0.062, 0.076, 0.24, 10), leatherDk, { p: [0, -0.12, 0], o: 0.06 });
      add("leg" + s + ".foot", g.sphere(), leatherDk, { p: [0, -0.20, 0.045], s: [0.076, 0.045, 0.115] });
      add("leg" + s + ".foot", g.box(), leatherM, { p: [0, -0.05, 0.045], s: [0.10, 0.03, 0.13] });
    }

    /* -- arms + flared sleeves ---------------------------------------- */
    for (const s of ["L", "R"]) {
      add("arm" + s + ".sh", g.cyl(0.042, 0.036, 0.18, 8), skinM, { p: [0, -0.09, 0] });
      add("arm" + s + ".el", g.cyl(0.034, 0.030, 0.16, 8), skinM, { p: [0, -0.08, 0] });
      add("arm" + s + ".hand", g.sphere(), skinM, { s: [0.045, 0.05, 0.042], shadow: false });
      /* sleeve upper */
      add("arm" + s + ".sh", g.cyl(0.075, 0.10, 0.22, 10), cloakM, { p: [0, -0.10, 0], o: 0.05 });
      /* sleeve cuff flares over the hand */
      add("arm" + s + ".el", g.cyl(0.085, 0.135, 0.20, 10), cloakM, { p: [0, -0.09, 0], o: 0.05 });
    }

    /* -- cloak mantle + zigzag trim ----------------------------------- */
    const mantle = K.mk(g.bell(0.155, 0.265, 0.34, 18, 0, 3), mantleM, { p: [0, 0.17, 0], o: 0.035 });
    mantle.userData.noOutline = false;
    rig.attach("chest", mantle);
    const trimMat = M.mapToon(0xffffff, A.tex.zigzag(), { transparent: true, side: DS });
    const trim = K.mk(g.cyl(0.268, 0.276, 0.075, 22, true), trimMat, { p: [0, -0.10, 0], ro: 1 });
    trim.userData.noOutline = true;
    rig.attach("chest", trim);
    /* collar of the mantle */
    add("chest", g.torus(0.145, 0.035, TAU, 6, 14), cloakDk, { p: [0, 0.205, 0], r: [PI / 2, 0, 0] });

    /* -- five tattered cloak panels ---------------------------------- */
    for (let i = 0; i < panelAng.length; i++) {
      add("cloak." + i, g.tatter(0.245, 0.225, 0, 0.018, 2, 1.05), cloakM, { o: 0.045 });
      add("cloakTip." + i, g.tatter(0.27, 0.245, 0.05, 0.016, 4, 1.10), cloakM, { o: 0.045 });
    }

    /* -- cowl scarf (lumpy torus stack) ------------------------------- */
    const cowlA = add("neck", g.torus(0.095, 0.042, TAU, 7, 16), creamM, { p: [0, 0.0, 0], r: [PI / 2, 0.2, 0], s: [1.05, 1.0, 0.9], o: 0.06 });
    add("neck", g.torus(0.105, 0.046, TAU, 7, 16), creamM, { p: [0, 0.045, 0.005], r: [PI / 2 + 0.12, -0.1, 0], s: [1.02, 1.0, 0.92], o: 0.05 });
    add("neck", g.torus(0.10, 0.040, TAU, 7, 16), creamM, { p: [0, 0.085, -0.005], r: [PI / 2 - 0.1, 0.35, 0], s: [0.98, 1.0, 0.9] });
    /* scarf tail */
    add("scarf", g.tatter(0.075, 0.24, 0.03, 0.014, 3, 1.05), creamM, { r: [0.15, 0, 0] });

    /* -- waist gear --------------------------------------------------- */
    const belt1 = K.mk(g.torus(0.135, 0.019, TAU, 6, 18), leatherM, { p: [0, 0.035, 0], r: [PI / 2, 0, 0], s: [1, 1, 0.86] });
    rig.attach("hips", belt1);
    const belt2 = K.mk(g.torus(0.125, 0.014, TAU, 6, 18), leatherDk, { p: [0, -0.035, 0], r: [PI / 2, 0, 0], s: [1, 1, 0.88] });
    rig.attach("hips", belt2);
    add("hips", g.box(), brassM, { p: [0, 0.035, 0.117], s: [0.048, 0.036, 0.022] });
    add("hips", g.box(), leatherDk, { p: [0.075, 0.035, 0.10], s: [0.03, 0.05, 0.016], r: [0, 0.6, 0] });

    /* pouches */
    add("hips", g.box(), leatherM, { p: [-0.125, -0.055, 0.055], s: [0.072, 0.085, 0.055], r: [0, -0.35, 0], o: 0.05 });
    add("hips", g.box(), leatherDk, { p: [-0.127, -0.018, 0.057], s: [0.076, 0.032, 0.06], r: [0, -0.35, 0] });
    add("hips", g.box(), leatherM, { p: [0.128, -0.05, 0.03], s: [0.06, 0.075, 0.05], r: [0, 0.4, 0], o: 0.05 });

    /* satchel on the right hip (-X): olive leather, orange book, spyglass */
    add("hips", g.box(), oliveM, { p: [-0.15, -0.055, -0.02], s: [0.115, 0.125, 0.075], r: [0, 0.2, 0.05], o: 0.05 });
    add("hips", g.box(), creamM, { p: [-0.15, 0.005, -0.02], s: [0.118, 0.035, 0.078], r: [0, 0.2, 0.05] });
    add("hips", g.box(), orangeM, { p: [-0.155, 0.075, -0.005], s: [0.08, 0.105, 0.022], r: [0.3, 0.35, -0.12], o: 0.04 });
    add("hips", g.cyl(0.014, 0.014, 0.13, 8), brassM, { p: [-0.10, 0.075, -0.05], r: [0.45, 0, 0.35] });
    add("hips", g.cyl(0.018, 0.018, 0.05, 8), darkM, { p: [-0.093, 0.10, -0.085], r: [0.45, 0, 0.35] });
    add("hips", g.box(), leatherM, { p: [-0.15, 0.03, -0.058], s: [0.10, 0.09, 0.012] });

    /* front cloth wrap + sheathed dagger */
    const wrap = K.mk(g.tatter(0.155, 0.20, 0.02, 0.014, 3, 1.02), creamM, { p: [0, -0.005, 0.145], r: [-0.18, 0, 0] });
    rig.attach("hips", wrap);
    add("hips", g.box(), darkM, { p: [0.135, -0.075, 0.055], s: [0.026, 0.15, 0.018], r: [0.1, 0, -0.25] });
    add("hips", g.cyl(0.012, 0.012, 0.075, 6), leatherDk, { p: [0.155, 0.02, 0.075], r: [0.15, 0, -0.3] });

    /* -- head + face -------------------------------------------------- */
    const headG = K.head({
      r: 0.16,
      skinMat: skinM,
      eyeTex: A.tex.animeEye(PAL.olive),
      eyeAngW: 0.80, eyeAngH: 0.74, eyeAz: 0.45, eyeEl: -0.05,
      blush: 0xe08c8c, blushOpacity: 0.38, blushAz: 1.02, blushEl: -0.44,
      mouth: true, mouthColor: 0x35222a, mouthR: 0.020, mouthY: -0.092
    });
    headG.position.set(0, 0.06, 0);
    rig.attach("head", headG);

    /* bob hair */
    const hair = K.hairBob({ r: 0.16, mat: hairM, color: 0x15171f, bangs: 6, back: 4, bangLen: 0.42, sideLen: 1.10, len: 1.05 });
    hair.position.set(0, 0.06, 0);
    rig.attach("head", hair);
    /* hair sway follows the head, plus a long back lock on its own bone */
    add("hairBack", g.strand(0.06, 0.30, 0.016, 0.22), hairM, { p: [0, 0.0, 0], r: [0.1, PI, 0] });
    add("hairBack", g.strand(0.05, 0.26, 0.014, 0.2), hairM, { p: [0.07, -0.01, -0.01], r: [0.12, PI - 0.3, 0] });

    /* -- hat ---------------------------------------------------------- */
    const brim = K.mk(g.brim(0.17, 0.40, 0.015, -0.055, 0.022, 0.035, 4, 36), cloakDk, { o: 0.035 });
    brim.userData.noOutline = false;
    rig.attach("hat", brim);
    add("hat", g.cyl(0.185, 0.30, 0.24, 16, true), cloakDk, { p: [0, 0.12, 0], o: 0.04 });
    /* orange band + knot + tails */
    add("hat", g.cyl(0.288, 0.305, 0.075, 18, true), orangeM, { p: [0, 0.075, 0], o: 0.02 });
    add("hat", g.sphere(), orangeM, { p: [0.075, 0.062, 0.275], s: [0.048, 0.036, 0.038], o: 0.03 });
    add("hat", g.strand(0.05, 0.16, 0.014, 0.3), orangeM, { p: [0.085, 0.045, 0.29], r: [0.1, 0.15, 0.2] });
    add("hat", g.strand(0.042, 0.12, 0.012, 0.35), orangeM, { p: [0.055, 0.05, 0.295], r: [0.2, 0.1, -0.35] });
    /* skull button on the band, right side */
    const btn = K.skull(0.032, { simple: true });
    btn.position.set(-0.20, 0.082, 0.185);
    btn.rotation.set(0.1, -0.85, 0);
    rig.attach("hat", btn);
    /* hat tip: second hinge segment + crumpled point */
    add("hatTip", g.cyl(0.05, 0.185, 0.26, 14, true), cloakDk, { p: [0, 0.13, 0], o: 0.04 });
    add("hatTip", g.cone(), cloakDk, { p: [0.012, 0.305, 0.02], r: [0.55, 0, 0.25], s: [0.055, 0.14, 0.055] });

    /* -- skull pauldron on the left shoulder -------------------------- */
    const pauld = K.skull(0.082, { simple: true });
    pauld.position.set(0.175, 0.175, 0.005);
    pauld.rotation.set(0.06, 0.55, -0.12);
    rig.attach("chest", pauld);
    /* cyan socket glow inside the left eye socket */
    add("chest", g.sphereLo(), M.glow(PAL.cyan, 1), { p: [0.205, 0.20, 0.10], s: 0.018, shadow: false, noOutline: true });
    const socketGlow = A.glowSprite(PAL.cyan, 0.20, 0.65);
    socketGlow.position.set(0.205, 0.20, 0.10);
    rig.attach("chest", socketGlow);
    /* bat-wing stamp */
    add("chest", g.cone6(), darkM, { p: [0.145, 0.215, 0.075], r: [1.2, 0.4, 2.2], s: [0.018, 0.05, 0.008], shadow: false });
    add("chest", g.cone6(), darkM, { p: [0.215, 0.225, 0.055], r: [1.2, -0.4, 1.0], s: [0.016, 0.045, 0.008], shadow: false });
    /* strap across the chest */
    const strap = K.mk(g.torus(0.16, 0.016, PI * 1.05, 5, 14), leatherM, { p: [0, 0.10, 0.0], r: [0, 0, 0.95] });
    rig.attach("chest", strap);

    /* -- eye staff (propR) ------------------------------------------- */
    const staffG = K.mk(g.gnarl(2.10, 0.030, 0.020, 8, 5), woodM, { p: [0, -0.55, 0], o: 0.06 });
    rig.attach("staff", staffG);
    /* knots on the shaft */
    add("staff", g.sphereLo(), woodM, { p: [0.03, 0.35, 0.01], s: [0.045, 0.035, 0.04] });
    add("staff", g.sphereLo(), woodM, { p: [-0.025, 1.05, 0.02], s: [0.04, 0.03, 0.045] });
    add("staff", g.torus(0.035, 0.012, PI * 1.3, 5, 8), leatherM, { p: [0, 0.55, 0], r: [0, 0, 0.2] });
    /* claw cage around the eyeball */
    for (let i = 0; i < 3; i++) {
      add("staff", g.torus(0.135, 0.017, PI * 0.92, 5, 10), woodM,
        { p: [0, 1.62, 0], r: [0, i * TAU / 3, -0.12], s: [1, 1.15, 1] });
    }
    /* eyeball */
    add("staffEye", g.sphere(), boneM, { s: [0.125, 0.125, 0.125], o: 0.05 });
    const irisMat = M.eye(A.tex.eye(0x4aa8d8, PAL.orange));
    const iris = new (T().Mesh)(g.eyePatch(0.1275, 0, 1.32, 0.0, 1.32, 12, 12), irisMat);
    iris.userData.noOutline = true; iris.renderOrder = 3;
    rig.attach("staffEye", iris);
    add("staffEye", g.sphereLo(), M.flat(0xffffff), { p: [0.045, 0.045, 0.105], s: 0.022, shadow: false, noOutline: true });
    const eyeGlow = A.glowSprite(0x8fdcff, 0.62, 0.32);
    rig.attach("staffEye", eyeGlow);
    /* dangling red charm on a cord */
    const charmCord = K.mk(g.cyl(0.006, 0.006, 0.16, 5), leatherDk, { p: [0, -0.08, 0], shadow: false });
    rig.attach("charm", charmCord);
    const charm = K.mk(g.octa(), M.toon(PAL.red, { emissive: PAL.red, emissiveIntensity: 0.35 }), { p: [0, -0.18, 0], s: [0.026, 0.05, 0.026], o: 0.02 });
    rig.attach("charm", charm);
    /* pink crystal tied below the eye */
    const crystal = K.crystal(0.045, PAL.pinkGlow);
    crystal.position.set(0, -0.19, 0.02);
    rig.attach("staffEye", crystal);
    add("staffEye", g.cyl(0.004, 0.004, 0.12, 4), leatherM, { p: [0, -0.10, 0.02], shadow: false });

    /* ======================================================================
       ANIMATION — snappy anticipation / smear / recovery
       ====================================================================== */
    const anim = K.anim(rig);
    K.idleClip(anim, { dur: 2.6, breath: 0.018, headTurn: 0.055 });

    anim.addClip("run", [
      { t: 0.00, bone: "legL.hip", rot: [-0.62, 0, 0], ease: "outQuad" },
      { t: 0.00, bone: "legL.knee", rot: [0.38, 0, 0] },
      { t: 0.00, bone: "legR.hip", rot: [0.55, 0, 0] },
      { t: 0.00, bone: "legR.knee", rot: [0.82, 0, 0] },
      { t: 0.00, bone: "armL.sh", rot: [0.55, 0, 0.06] },
      { t: 0.00, bone: "armL.el", rot: [-0.45, 0, 0] },
      { t: 0.00, bone: "armR.sh", rot: [-0.22, 0, -0.04] },
      { t: 0.00, bone: "chest", rot: [-0.17, 0.09, 0] },
      { t: 0.00, bone: "hips", pos: [0, 0.0, 0], rot: [0, 0.09, 0.03] },
      { t: 0.155, bone: "legL.hip", rot: [-0.12, 0, 0], ease: "inQuad" },
      { t: 0.155, bone: "legL.knee", rot: [0.12, 0, 0] },
      { t: 0.155, bone: "legR.hip", rot: [0.18, 0, 0] },
      { t: 0.155, bone: "legR.knee", rot: [0.45, 0, 0] },
      { t: 0.155, bone: "hips", pos: [0, 0.035, 0] },
      { t: 0.155, bone: "armL.sh", rot: [0.05, 0, 0.08] },
      { t: 0.31, bone: "legL.hip", rot: [0.55, 0, 0], ease: "outQuad" },
      { t: 0.31, bone: "legL.knee", rot: [0.82, 0, 0] },
      { t: 0.31, bone: "legR.hip", rot: [-0.62, 0, 0] },
      { t: 0.31, bone: "legR.knee", rot: [0.38, 0, 0] },
      { t: 0.31, bone: "armL.sh", rot: [-0.5, 0, 0.1] },
      { t: 0.31, bone: "armL.el", rot: [-0.7, 0, 0] },
      { t: 0.31, bone: "armR.sh", rot: [0.12, 0, -0.06] },
      { t: 0.31, bone: "chest", rot: [-0.17, -0.09, 0] },
      { t: 0.31, bone: "hips", pos: [0, 0.0, 0], rot: [0, -0.09, -0.03] },
      { t: 0.465, bone: "legL.hip", rot: [0.18, 0, 0], ease: "inQuad" },
      { t: 0.465, bone: "legL.knee", rot: [0.45, 0, 0] },
      { t: 0.465, bone: "legR.hip", rot: [-0.12, 0, 0] },
      { t: 0.465, bone: "legR.knee", rot: [0.12, 0, 0] },
      { t: 0.465, bone: "hips", pos: [0, 0.035, 0] },
      { t: 0.465, bone: "armL.sh", rot: [0.05, 0, 0.08] },
      { t: 0.62, bone: "legL.hip", rot: [-0.62, 0, 0] },
      { t: 0.62, bone: "legL.knee", rot: [0.38, 0, 0] },
      { t: 0.62, bone: "legR.hip", rot: [0.55, 0, 0] },
      { t: 0.62, bone: "legR.knee", rot: [0.82, 0, 0] },
      { t: 0.62, bone: "armL.sh", rot: [0.55, 0, 0.06] },
      { t: 0.62, bone: "armL.el", rot: [-0.45, 0, 0] },
      { t: 0.62, bone: "armR.sh", rot: [-0.22, 0, -0.04] },
      { t: 0.62, bone: "chest", rot: [-0.17, 0.09, 0] },
      { t: 0.62, bone: "hips", pos: [0, 0.0, 0], rot: [0, 0.09, 0.03] }
    ], { dur: 0.62 });

    /* attack 1 — wide right-to-left staff sweep */
    anim.addClip("attack1", [
      { t: 0.00, bone: "chest", rot: [0, 0, 0], ease: "outQuad" },
      { t: 0.00, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.00, bone: "armR.el", rot: [0, 0, 0] },
      { t: 0.00, bone: "propR", rot: [0, 0, 0] },
      { t: 0.10, bone: "chest", rot: [0.05, -0.45, 0], ease: "inQuad" },
      { t: 0.10, bone: "armR.sh", rot: [-0.35, 0.2, -0.45] },
      { t: 0.10, bone: "armR.el", rot: [-1.05, 0, 0] },
      { t: 0.10, bone: "propR", rot: [-0.2, 0, -0.35] },
      { t: 0.10, bone: "head", rot: [0, -0.25, 0] },
      { t: 0.10, bone: "hips", rot: [0, -0.18, 0] },
      { t: 0.205, bone: "chest", rot: [-0.08, 0.55, 0], ease: "outCubic" },
      { t: 0.205, bone: "armR.sh", rot: [-1.18, -0.25, 0.28] },
      { t: 0.205, bone: "armR.el", rot: [-0.15, 0, 0] },
      { t: 0.205, bone: "propR", rot: [0.35, 0, 0.55] },
      { t: 0.205, bone: "head", rot: [0, 0.3, 0] },
      { t: 0.205, bone: "hips", rot: [0, 0.25, 0] },
      { t: 0.205, bone: "legL.hip", rot: [-0.25, 0, 0] },
      { t: 0.30, bone: "chest", rot: [-0.05, 0.62, 0], ease: "inOutQuad" },
      { t: 0.30, bone: "armR.sh", rot: [-1.25, -0.3, 0.32] },
      { t: 0.30, bone: "propR", rot: [0.4, 0, 0.6] },
      { t: 0.52, bone: "chest", rot: [0, 0, 0] },
      { t: 0.52, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.52, bone: "armR.el", rot: [0, 0, 0] },
      { t: 0.52, bone: "propR", rot: [0, 0, 0] },
      { t: 0.52, bone: "head", rot: [0, 0, 0] },
      { t: 0.52, bone: "hips", rot: [0, 0, 0] },
      { t: 0.52, bone: "legL.hip", rot: [0, 0, 0] }
    ], { loop: false });

    /* attack 2 — reverse sweep with a hop-step */
    anim.addClip("attack2", [
      { t: 0.00, bone: "chest", rot: [0, 0, 0] },
      { t: 0.00, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.00, bone: "propR", rot: [0, 0, 0] },
      { t: 0.09, bone: "chest", rot: [0, 0.5, 0], ease: "inQuad" },
      { t: 0.09, bone: "armR.sh", rot: [-1.1, 0, 0.2] },
      { t: 0.09, bone: "armR.el", rot: [-0.9, 0, 0] },
      { t: 0.09, bone: "propR", rot: [0.45, 0, 0.35] },
      { t: 0.09, bone: "hips", rot: [0, 0.2, 0] },
      { t: 0.19, bone: "chest", rot: [-0.1, -0.6, 0], ease: "outCubic" },
      { t: 0.19, bone: "armR.sh", rot: [-0.95, 0.25, -0.55] },
      { t: 0.19, bone: "armR.el", rot: [-0.2, 0, 0] },
      { t: 0.19, bone: "propR", rot: [-0.3, 0, -0.55] },
      { t: 0.19, bone: "hips", rot: [0, -0.3, 0], pos: [0, 0.02, 0.04] },
      { t: 0.19, bone: "legR.hip", rot: [-0.35, 0, 0] },
      { t: 0.32, bone: "chest", rot: [-0.05, -0.65, 0], ease: "inOutQuad" },
      { t: 0.32, bone: "armR.sh", rot: [-1.0, 0.3, -0.6] },
      { t: 0.32, bone: "propR", rot: [-0.32, 0, -0.6] },
      { t: 0.55, bone: "chest", rot: [0, 0, 0] },
      { t: 0.55, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.55, bone: "armR.el", rot: [0, 0, 0] },
      { t: 0.55, bone: "propR", rot: [0, 0, 0] },
      { t: 0.55, bone: "hips", rot: [0, 0, 0], pos: [0, 0, 0] },
      { t: 0.55, bone: "legR.hip", rot: [0, 0, 0] }
    ], { loop: false });

    /* attack 3 — spinning finisher */
    anim.addClip("attack3", [
      { t: 0.00, bone: "hips", rot: [0, 0, 0] },
      { t: 0.00, bone: "chest", rot: [0, 0, 0] },
      { t: 0.00, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.14, bone: "hips", rot: [0, -0.55, 0], pos: [0, -0.02, 0], ease: "inQuad" },
      { t: 0.14, bone: "chest", rot: [0, -0.45, 0] },
      { t: 0.14, bone: "armR.sh", rot: [-0.6, 0, -0.9] },
      { t: 0.14, bone: "armR.el", rot: [-1.1, 0, 0] },
      { t: 0.14, bone: "propR", rot: [0, 0, -0.6] },
      { t: 0.14, bone: "head", rot: [0, -0.4, 0] },
      { t: 0.34, bone: "hips", rot: [0, 2.4, 0], pos: [0, 0.06, 0], ease: "outCubic" },
      { t: 0.34, bone: "chest", rot: [0, 0.3, 0] },
      { t: 0.34, bone: "armR.sh", rot: [-1.45, 0, 0.35] },
      { t: 0.34, bone: "armR.el", rot: [-0.1, 0, 0] },
      { t: 0.34, bone: "propR", rot: [0.45, 0, 0.4] },
      { t: 0.34, bone: "head", rot: [0, 0.3, 0] },
      { t: 0.46, bone: "hips", rot: [0, 2.85, 0], pos: [0, -0.03, 0], ease: "inQuad" },
      { t: 0.46, bone: "armR.sh", rot: [-1.5, 0, 0.4] },
      { t: 0.78, bone: "hips", rot: [0, TAU, 0], pos: [0, 0, 0], ease: "outQuad" },
      { t: 0.78, bone: "chest", rot: [0, 0, 0] },
      { t: 0.78, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.78, bone: "armR.el", rot: [0, 0, 0] },
      { t: 0.78, bone: "propR", rot: [0, 0, 0] },
      { t: 0.78, bone: "head", rot: [0, 0, 0] }
    ], { loop: false });

    /* heavy — overhead two-hand slam */
    anim.addClip("heavy", [
      { t: 0.00, bone: "chest", rot: [0, 0, 0] },
      { t: 0.00, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.00, bone: "armL.sh", rot: [0, 0, 0] },
      { t: 0.00, bone: "hips", pos: [0, 0, 0] },
      { t: 0.30, bone: "chest", rot: [0.28, 0, 0], ease: "outQuad" },
      { t: 0.30, bone: "armR.sh", rot: [-2.65, 0, -0.15] },
      { t: 0.30, bone: "armR.el", rot: [-0.55, 0, 0] },
      { t: 0.30, bone: "armL.sh", rot: [-2.3, 0, 0.4] },
      { t: 0.30, bone: "armL.el", rot: [-0.7, 0, 0] },
      { t: 0.30, bone: "propR", rot: [-0.5, 0, 0] },
      { t: 0.30, bone: "head", rot: [-0.2, 0, 0] },
      { t: 0.30, bone: "hips", pos: [0, 0.03, -0.02], rot: [-0.1, 0, 0] },
      { t: 0.30, bone: "hatTip", rot: [-0.2, 0, 0] },
      { t: 0.41, bone: "chest", rot: [-0.55, 0, 0], ease: "outCubic" },
      { t: 0.41, bone: "armR.sh", rot: [-0.35, 0, -0.1] },
      { t: 0.41, bone: "armR.el", rot: [-0.05, 0, 0] },
      { t: 0.41, bone: "armL.sh", rot: [-0.3, 0, 0.2] },
      { t: 0.41, bone: "armL.el", rot: [-0.1, 0, 0] },
      { t: 0.41, bone: "propR", rot: [0.75, 0, 0] },
      { t: 0.41, bone: "head", rot: [0.3, 0, 0] },
      { t: 0.41, bone: "hips", pos: [0, -0.075, 0.03], rot: [0.16, 0, 0] },
      { t: 0.41, bone: "hatTip", rot: [0.35, 0, 0] },
      { t: 0.52, bone: "hips", pos: [0, -0.07, 0.03], rot: [0.15, 0, 0], ease: "inOutQuad" },
      { t: 1.12, bone: "chest", rot: [0, 0, 0] },
      { t: 1.12, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 1.12, bone: "armR.el", rot: [0, 0, 0] },
      { t: 1.12, bone: "armL.sh", rot: [0, 0, 0] },
      { t: 1.12, bone: "armL.el", rot: [0, 0, 0] },
      { t: 1.12, bone: "propR", rot: [0, 0, 0] },
      { t: 1.12, bone: "head", rot: [0, 0, 0] },
      { t: 1.12, bone: "hips", pos: [0, 0, 0], rot: [0, 0, 0] },
      { t: 1.12, bone: "hatTip", rot: [0, 0, 0] }
    ], { loop: false });

    /* cast — staff raised, free hand thrust forward */
    anim.addClip("cast", [
      { t: 0.00, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.00, bone: "armL.sh", rot: [0, 0, 0] },
      { t: 0.00, bone: "chest", rot: [0, 0, 0] },
      { t: 0.26, bone: "armR.sh", rot: [-1.95, 0, -0.2], ease: "outQuad" },
      { t: 0.26, bone: "armR.el", rot: [-0.35, 0, 0] },
      { t: 0.26, bone: "propR", rot: [-0.2, 0, 0.1] },
      { t: 0.26, bone: "armL.sh", rot: [-1.25, 0, 0.45] },
      { t: 0.26, bone: "armL.el", rot: [-0.95, 0, 0] },
      { t: 0.26, bone: "chest", rot: [-0.12, 0, 0] },
      { t: 0.26, bone: "head", rot: [-0.14, 0, 0] },
      { t: 0.40, bone: "armL.sh", rot: [-1.45, 0, 0.15], ease: "outCubic" },
      { t: 0.40, bone: "armL.el", rot: [-0.15, 0, 0] },
      { t: 0.40, bone: "chest", rot: [-0.05, 0.22, 0] },
      { t: 0.56, bone: "chest", rot: [-0.05, 0.22, 0], ease: "inOutQuad" },
      { t: 0.92, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.92, bone: "armR.el", rot: [0, 0, 0] },
      { t: 0.92, bone: "propR", rot: [0, 0, 0] },
      { t: 0.92, bone: "armL.sh", rot: [0, 0, 0] },
      { t: 0.92, bone: "armL.el", rot: [0, 0, 0] },
      { t: 0.92, bone: "chest", rot: [0, 0, 0] },
      { t: 0.92, bone: "head", rot: [0, 0, 0] }
    ], { loop: false });

    /* dash — tucked, cloak streaming */
    anim.addClip("dash", [
      { t: 0.00, bone: "chest", rot: [-0.45, 0, 0], ease: "outQuad" },
      { t: 0.00, bone: "hips", pos: [0, -0.07, 0], rot: [0.1, 0, 0] },
      { t: 0.00, bone: "legL.hip", rot: [-0.5, 0, 0] },
      { t: 0.00, bone: "legL.knee", rot: [0.9, 0, 0] },
      { t: 0.00, bone: "legR.hip", rot: [0.6, 0, 0] },
      { t: 0.00, bone: "legR.knee", rot: [0.5, 0, 0] },
      { t: 0.00, bone: "armL.sh", rot: [0.8, 0, 0.3] },
      { t: 0.00, bone: "armR.sh", rot: [-0.9, 0, -0.2] },
      { t: 0.00, bone: "head", rot: [-0.1, 0, 0] },
      { t: 0.16, bone: "hips", pos: [0, 0.04, 0], rot: [0.05, 0, 0] },
      { t: 0.16, bone: "legL.hip", rot: [-0.15, 0, 0] },
      { t: 0.16, bone: "legL.knee", rot: [0.35, 0, 0] },
      { t: 0.16, bone: "legR.hip", rot: [0.75, 0, 0] },
      { t: 0.16, bone: "legR.knee", rot: [0.25, 0, 0] },
      { t: 0.34, bone: "chest", rot: [-0.2, 0, 0], ease: "inOutQuad" },
      { t: 0.34, bone: "hips", pos: [0, 0, 0], rot: [0, 0, 0] },
      { t: 0.34, bone: "legL.hip", rot: [0, 0, 0] },
      { t: 0.34, bone: "legL.knee", rot: [0, 0, 0] },
      { t: 0.34, bone: "legR.hip", rot: [0, 0, 0] },
      { t: 0.34, bone: "legR.knee", rot: [0, 0, 0] },
      { t: 0.34, bone: "armL.sh", rot: [0, 0, 0] },
      { t: 0.34, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.34, bone: "head", rot: [0, 0, 0] }
    ], { loop: false, dur: 0.34 });

    /* hit */
    anim.addClip("hit", [
      { t: 0.00, bone: "chest", rot: [0.28, 0, 0], ease: "outQuad" },
      { t: 0.00, bone: "head", rot: [0.32, 0, 0] },
      { t: 0.00, bone: "armL.sh", rot: [0.35, 0, 0.5] },
      { t: 0.00, bone: "armR.sh", rot: [0.3, 0, -0.4] },
      { t: 0.00, bone: "hips", pos: [0, -0.03, -0.03] },
      { t: 0.12, bone: "chest", rot: [0.34, 0, 0], ease: "inOutQuad" },
      { t: 0.12, bone: "hips", pos: [0, -0.04, -0.04] },
      { t: 0.38, bone: "chest", rot: [0, 0, 0] },
      { t: 0.38, bone: "head", rot: [0, 0, 0] },
      { t: 0.38, bone: "armL.sh", rot: [0, 0, 0] },
      { t: 0.38, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.38, bone: "hips", pos: [0, 0, 0] }
    ], { loop: false });

    /* death — stagger, spin out, collapse */
    anim.addClip("death", [
      { t: 0.00, bone: "chest", rot: [0.3, 0, 0] },
      { t: 0.00, bone: "head", rot: [0.35, 0, 0] },
      { t: 0.35, bone: "chest", rot: [0.15, -0.4, 0], ease: "inOutQuad" },
      { t: 0.35, bone: "hips", rot: [0.1, -0.3, 0.1], pos: [0, -0.05, -0.05] },
      { t: 0.35, bone: "legL.knee", rot: [0.5, 0, 0] },
      { t: 0.35, bone: "legR.knee", rot: [0.6, 0, 0] },
      { t: 0.85, bone: "hips", rot: [1.35, -0.5, 0.25], pos: [0, -0.42, -0.18], ease: "inQuad" },
      { t: 0.85, bone: "chest", rot: [-0.2, 0, 0] },
      { t: 0.85, bone: "head", rot: [0.5, 0.3, 0] },
      { t: 0.85, bone: "armL.sh", rot: [-0.6, 0, 0.6] },
      { t: 0.85, bone: "armR.sh", rot: [-0.5, 0, -0.5] },
      { t: 0.85, bone: "legL.hip", rot: [0.4, 0, 0] },
      { t: 0.85, bone: "legR.hip", rot: [0.2, 0, 0] },
      { t: 1.25, bone: "hips", rot: [1.45, -0.55, 0.3], pos: [0, -0.47, -0.2], ease: "outQuad" },
      { t: 1.25, bone: "head", rot: [0.6, 0.35, 0.2] },
      { t: 1.8, bone: "hips", rot: [1.45, -0.55, 0.3], pos: [0, -0.47, -0.2] },
      { t: 1.8, bone: "head", rot: [0.6, 0.35, 0.2] }
    ], { loop: false, dur: 1.8 });

    /* glide — cloak spread, arms out (used by cloak-glide) */
    anim.addClip("glide", [
      { t: 0.00, bone: "armL.sh", rot: [-0.2, 0, 1.0], ease: "outQuad" },
      { t: 0.00, bone: "armR.sh", rot: [-0.2, 0, -1.0] },
      { t: 0.00, bone: "chest", rot: [0.12, 0, 0] },
      { t: 0.00, bone: "legL.hip", rot: [-0.3, 0, 0] },
      { t: 0.00, bone: "legL.knee", rot: [0.3, 0, 0] },
      { t: 0.00, bone: "legR.hip", rot: [0.25, 0, 0] },
      { t: 0.00, bone: "legR.knee", rot: [0.2, 0, 0] },
      { t: 0.00, bone: "head", rot: [-0.12, 0, 0] },
      { t: 0.80, bone: "armL.sh", rot: [-0.28, 0, 1.12], ease: "inOutQuad" },
      { t: 0.80, bone: "armR.sh", rot: [-0.28, 0, -1.12] },
      { t: 0.80, bone: "chest", rot: [0.16, 0, 0] },
      { t: 0.80, bone: "head", rot: [-0.14, 0, 0] },
      { t: 1.60, bone: "armL.sh", rot: [-0.2, 0, 1.0] },
      { t: 1.60, bone: "armR.sh", rot: [-0.2, 0, -1.0] },
      { t: 1.60, bone: "chest", rot: [0.12, 0, 0] },
      { t: 1.60, bone: "head", rot: [-0.12, 0, 0] }
    ], { dur: 1.6 });

    /* staff-eye pulse + charm flutter layer */
    anim.layer(function (t) {
      const eye = anim.off("staffEye");
      if (eye) { eye.rx = Math.sin(t * 0.9) * 0.06; eye.ry = Math.sin(t * 0.55) * 0.12; }
      const ch = anim.off("charm");
      if (ch) { ch.rz = Math.sin(t * 2.4) * 0.12; ch.rx = Math.sin(t * 1.7) * 0.08; }
    });

    anim.setBase("idle");
    anim.play("idle", { fade: 0 });
    anim.update(0);

    K.mergeRig(rig);

    rig.root.scale.setScalar(1);
    rig.parts.root = rig.root;
    rig.parts.body = rig.body;
    const meshCount = rig.countMeshes();
    if (meshCount > 118) console.warn("[chars] witch meshes:", meshCount);

    return {
      id: "witch", root: rig.root, parts: rig.parts, anim,
      height: DEFS.witch.height, radius: DEFS.witch.radius, team: DEFS.witch.team,
      rig, meshes: meshCount
    };
  }

  /* ==========================================================================
     CRANE — companion heavy / heron-skull helm + cannon gauntlet (HUvn6wtWE)
     ========================================================================== */
  function buildCrane() {
    const rig = K.rig({ name: "crane", height: DEFS.crane.height });
    const g = K.geo, M = K.mat;
    const DS = T().DoubleSide;
    const add = rig.add.bind(rig);

    /* -- palette ------------------------------------------------------- */
    const robeM = M.toon(0x17181f);
    const robeM2 = M.toon(0x222634, { side: DS });
    const boneM = M.toon(0xeae3d0);
    const boneDk = M.toon(0xcfc6b0);
    const redM = M.toon(0xe8433a);
    const redDk = M.toon(0x9e2a24);
    const metalM = M.toon(0x9aa3ae);
    const metalDk = M.toon(0x565e6a);
    const darkM = M.toon(0x101216);
    const pinkM = M.glow(PAL.pinkGlow, 1);
    const amberM = M.glow(0xff9a3c, 1);

    /* -- skeleton ------------------------------------------------------ */
    rig.bone("hips", null, [0, 1.14, 0]);
    rig.bone("chest", "hips", [0, 0.42, 0]);
    rig.bone("neck", "chest", [0, 0.26, 0]);
    rig.bone("head", "neck", [0, 0.15, 0]);
    rig.bone("hairBack", "head", [0, 0.02, -0.10], [0.15, 0, 0], { sway: 0.03, phase: 0.9 });

    rig.bone("armL.sh", "chest", [0.235, 0.20, 0], [0, 0, 0.10]);
    rig.bone("armL.el", "armL.sh", [0, -0.30, 0]);
    rig.bone("armL.hand", "armL.el", [0, -0.28, 0]);
    rig.bone("armR.sh", "chest", [-0.235, 0.20, 0], [0, 0, -0.10]);
    rig.bone("armR.el", "armR.sh", [0, -0.30, 0]);
    rig.bone("armR.hand", "armR.el", [0, -0.26, 0]);
    rig.bone("cannon", "armR.hand", [0, -0.05, 0.02]);

    rig.bone("legL.hip", "hips", [0.105, -0.08, 0]);
    rig.bone("legL.knee", "legL.hip", [0, -0.44, 0]);
    rig.bone("legL.foot", "legL.knee", [0, -0.46, 0]);
    rig.bone("legR.hip", "hips", [-0.105, -0.08, 0]);
    rig.bone("legR.knee", "legR.hip", [0, -0.44, 0]);
    rig.bone("legR.foot", "legR.knee", [0, -0.46, 0]);

    /* robe hem: five hinged tatters hanging from the hips */
    const hemAng = [0.55, 1.65, PI, -1.65, -0.55];
    for (let i = 0; i < hemAng.length; i++) {
      const a = hemAng[i];
      rig.bone("cloak." + i, "hips", [Math.sin(a) * 0.22, -0.06, Math.cos(a) * 0.22], [-0.06, a, 0],
        { sway: 0.035 + i * 0.006, phase: i * 1.3 });
      rig.bone("cloakTip." + i, "cloak." + i, [0, -0.42, 0], [0.08, 0, 0], { sway: 0.05, phase: i * 1.3 + 0.6 });
    }
    /* chest sashes */
    rig.bone("sashL", "chest", [0.07, 0.02, 0.20], [0.10, 0.15, 0], { sway: 0.06, phase: 2.0 });
    rig.bone("sashR", "chest", [-0.06, 0.04, 0.20], [0.14, -0.12, 0], { sway: 0.055, phase: 3.3 });
    /* little mech helper arms folded on the back */
    rig.bone("helperL", "chest", [0.17, 0.30, -0.13], [0.3, 0, 0.5], { sway: 0.02, phase: 1.1 });
    rig.bone("helperR", "chest", [-0.17, 0.30, -0.13], [0.3, 0, -0.5], { sway: 0.02, phase: 2.6 });
    /* katana at the left hip */
    rig.bone("katana", "hips", [0.21, 0.02, 0.04], [0.35, 0, 0.55]);

    /* -- legs (mostly hidden under the robe) --------------------------- */
    for (const s of ["L", "R"]) {
      add("leg" + s + ".hip", g.cyl(0.075, 0.065, 0.42, 8), darkM, { p: [0, -0.21, 0] });
      add("leg" + s + ".knee", g.cyl(0.060, 0.055, 0.44, 8), darkM, { p: [0, -0.22, 0] });
      add("leg" + s + ".foot", g.box(), boneDk, { p: [0, -0.06, 0.03], s: [0.11, 0.07, 0.22], o: 0.05 });
    }

    /* -- robe body: one big bell from shoulders to near the ground ----- */
    const robe = K.mk(g.bell(0.20, 0.46, 1.55, 16, 0, 3), robeM, { p: [0, -0.58, 0], o: 0.045 });
    rig.attach("chest", robe);
    /* shoulder mantle */
    add("chest", g.bell(0.24, 0.30, 0.30, 14, 0, 2), robeM, { p: [0, 0.16, 0], o: 0.04 });
    /* high collar */
    add("neck", g.cyl(0.155, 0.175, 0.20, 14, true), robeM, { p: [0, 0.06, 0], o: 0.04 });
    add("neck", g.torus(0.16, 0.030, TAU, 6, 14), redDk, { p: [0, -0.045, 0], r: [PI / 2, 0, 0] });

    /* hem panels */
    for (let i = 0; i < hemAng.length; i++) {
      add("cloak." + i, g.tatter(0.24, 0.44, 0, 0.016, 2, 1.03), robeM2, { o: 0.04 });
      add("cloakTip." + i, g.tatter(0.26, 0.34, 0.05, 0.014, 4, 1.06), robeM2, { o: 0.04 });
    }

    /* red sashes knotted at the chest */
    add("chest", g.sphere(), redM, { p: [0, 0.10, 0.20], s: [0.06, 0.05, 0.045], o: 0.04 });
    add("sashL", g.tatter(0.11, 0.52, 0.04, 0.012, 3, 1.02), redM, { o: 0.04 });
    add("sashR", g.tatter(0.10, 0.44, 0.05, 0.012, 3, 1.02), redM, { o: 0.04 });
    /* waist sash band */
    add("hips", g.cyl(0.225, 0.235, 0.09, 16, true), redDk, { p: [0, 0.02, 0], o: 0.03 });

    /* -- heron-skull helm ---------------------------------------------- */
    add("head", g.sphere(), boneM, { p: [0, 0.05, 0.01], s: [0.185, 0.165, 0.205], o: 0.05 });
    /* crown ridge */
    add("head", g.sphere(), boneDk, { p: [0, 0.115, -0.03], s: [0.13, 0.085, 0.16], o: 0.04 });
    /* long beak: two segments curving down + red tip */
    add("head", g.cone(), boneM, { p: [0, -0.01, 0.24], r: [1.85, 0, 0], s: [0.062, 0.30, 0.05], o: 0.05 });
    add("head", g.cone(), boneM, { p: [0, -0.13, 0.335], r: [2.35, 0, 0], s: [0.042, 0.20, 0.036], o: 0.05 });
    add("head", g.cone(), redM, { p: [0, -0.225, 0.365], r: [2.6, 0, 0], s: [0.026, 0.10, 0.022] });
    /* dark brim band shadowing the eyes */
    add("head", g.cyl(0.19, 0.20, 0.07, 14, true), darkM, { p: [0, 0.015, 0.02], o: 0.03 });
    /* glowing amber eyes under the brim */
    add("head", g.sphereLo(), amberM, { p: [0.065, -0.025, 0.155], s: 0.026, shadow: false, noOutline: true });
    add("head", g.sphereLo(), amberM, { p: [-0.065, -0.025, 0.155], s: 0.026, shadow: false, noOutline: true });
    const eyeGlow = A.glowSprite(0xff7a30, 0.34, 0.5);
    eyeGlow.position.set(0, -0.025, 0.16);
    rig.attach("head", eyeGlow);
    /* crest fins swept back */
    add("head", g.cone6(), boneDk, { p: [0.05, 0.16, -0.12], r: [-1.9, 0, 0.35], s: [0.02, 0.16, 0.008], shadow: false });
    add("head", g.cone6(), boneDk, { p: [-0.05, 0.16, -0.12], r: [-1.9, 0, -0.35], s: [0.02, 0.16, 0.008], shadow: false });
    /* white hair strands spilling under the back of the helm */
    add("hairBack", g.strand(0.05, 0.42, 0.014, 0.18), boneM, { p: [0.06, 0, 0], r: [0.1, PI, 0] });
    add("hairBack", g.strand(0.045, 0.36, 0.012, 0.22), boneM, { p: [-0.05, 0, -0.01], r: [0.14, PI + 0.25, 0] });
    add("hairBack", g.strand(0.04, 0.30, 0.012, 0.2), boneM, { p: [0, -0.01, -0.03], r: [0.2, PI - 0.3, 0] });

    /* -- left arm: sleeve + hand ---------------------------------------- */
    add("armL.sh", g.cyl(0.085, 0.10, 0.30, 10), robeM, { p: [0, -0.14, 0], o: 0.05 });
    add("armL.el", g.cyl(0.095, 0.13, 0.28, 10), robeM, { p: [0, -0.12, 0], o: 0.05 });
    add("armL.hand", g.sphere(), boneDk, { s: [0.05, 0.055, 0.05] });

    /* -- right arm + massive cannon gauntlet ---------------------------- */
    add("armR.sh", g.cyl(0.085, 0.095, 0.30, 10), robeM, { p: [0, -0.14, 0], o: 0.05 });
    add("armR.el", g.cyl(0.075, 0.085, 0.24, 10), metalDk, { p: [0, -0.11, 0] });
    /* cannon body points forward from the fist */
    add("cannon", g.cyl(0.135, 0.155, 0.52, 12), boneM, { p: [0, 0, 0.16], r: [PI / 2, 0, 0], o: 0.05 });
    add("cannon", g.cyl(0.16, 0.15, 0.10, 12), metalDk, { p: [0, 0, 0.40], r: [PI / 2, 0, 0], o: 0.04 });
    add("cannon", g.box(), boneDk, { p: [0, 0.10, 0.05], s: [0.16, 0.06, 0.30], o: 0.04 });
    /* barrel cluster: hex ring of six + center, each with a pink optic */
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 6;
      const bx = i === 6 ? 0 : Math.sin(a) * 0.072;
      const by = i === 6 ? 0 : Math.cos(a) * 0.072;
      add("cannon", g.cyl(0.026, 0.026, 0.16, 8), metalDk, { p: [bx, by, 0.47], r: [PI / 2, 0, 0] });
      add("cannon", g.circle(), pinkM, { p: [bx, by, 0.556], s: 0.020, shadow: false, noOutline: true });
    }
    const muzzleGlow = A.glowSprite(PAL.pinkGlow, 0.5, 0.4);
    muzzleGlow.position.set(0, 0, 0.56);
    rig.attach("cannon", muzzleGlow);
    /* red cables wrapping the gauntlet */
    add("cannon", g.torus(0.15, 0.014, PI * 1.2, 5, 12), redM, { p: [0, 0, 0.05], r: [0, 0.4, 0.6] });
    add("cannon", g.torus(0.14, 0.012, PI * 1.1, 5, 12), redDk, { p: [0, -0.02, 0.24], r: [0.2, -0.5, -0.8] });
    /* claws under the muzzle */
    for (let i = -1; i <= 1; i++) {
      add("cannon", g.cone6(), metalDk, { p: [i * 0.055, -0.145, 0.38], r: [PI + 0.5, 0, i * 0.3], s: [0.020, 0.085, 0.016] });
    }

    /* -- helper arms on the back ---------------------------------------- */
    for (const b of ["helperL", "helperR"]) {
      add(b, g.sphereLo(), metalDk, { s: [0.045, 0.045, 0.045] });
      add(b, g.cyl(0.020, 0.017, 0.16, 6), metalM, { p: [0, -0.08, 0], r: [0.4, 0, 0] });
      add(b, g.cyl(0.016, 0.014, 0.14, 6), metalM, { p: [0.01, -0.20, 0.04], r: [-0.5, 0, 0] });
      add(b, g.cone6(), metalDk, { p: [0.02, -0.28, 0.08], r: [PI - 0.4, 0, 0.3], s: [0.012, 0.05, 0.010], shadow: false });
      add(b, g.cone6(), metalDk, { p: [-0.005, -0.28, 0.08], r: [PI - 0.4, 0, -0.3], s: [0.012, 0.05, 0.010], shadow: false });
    }

    /* -- katana at the left hip ----------------------------------------- */
    add("katana", g.box(), darkM, { p: [0, -0.30, 0], s: [0.045, 0.62, 0.03], o: 0.04 });
    add("katana", g.cyl(0.032, 0.032, 0.014, 10), redDk, { p: [0, 0.02, 0] });
    add("katana", g.cyl(0.016, 0.016, 0.14, 8), darkM, { p: [0, 0.09, 0] });
    add("katana", g.torus(0.018, 0.006, TAU, 5, 10), redM, { p: [0, 0.10, 0], r: [PI / 2, 0, 0] });

    /* ======================================================================
       ANIMATION
       ====================================================================== */
    const anim = K.anim(rig);
    K.idleClip(anim, { dur: 3.4, breath: 0.012, headTurn: 0.035 });

    /* volley — cannon raised, three recoil pulses */
    anim.addClip("attack", [
      { t: 0.00, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.00, bone: "chest", rot: [0, 0, 0] },
      { t: 0.00, bone: "cannon", rot: [0, 0, 0] },
      { t: 0.22, bone: "armR.sh", rot: [-1.35, 0.15, -0.25], ease: "outQuad" },
      { t: 0.22, bone: "armR.el", rot: [-0.25, 0, 0] },
      { t: 0.22, bone: "chest", rot: [0, 0.28, 0] },
      { t: 0.22, bone: "head", rot: [0, -0.15, 0] },
      { t: 0.34, bone: "cannon", rot: [0.10, 0, 0], ease: "outCubic" },
      { t: 0.40, bone: "cannon", rot: [0, 0, 0] },
      { t: 0.50, bone: "cannon", rot: [0.10, 0, 0], ease: "outCubic" },
      { t: 0.56, bone: "cannon", rot: [0, 0, 0] },
      { t: 0.66, bone: "cannon", rot: [0.12, 0, 0], ease: "outCubic" },
      { t: 0.72, bone: "cannon", rot: [0, 0, 0] },
      { t: 1.10, bone: "armR.sh", rot: [0, 0, 0], ease: "inOutQuad" },
      { t: 1.10, bone: "armR.el", rot: [0, 0, 0] },
      { t: 1.10, bone: "chest", rot: [0, 0, 0] },
      { t: 1.10, bone: "head", rot: [0, 0, 0] }
    ], { loop: false, dur: 1.10 });

    /* salute — helm tilt + cannon fist tap (spawn flourish) */
    anim.addClip("salute", [
      { t: 0.00, bone: "head", rot: [0, 0, 0] },
      { t: 0.00, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.18, bone: "head", rot: [0.22, 0, 0.10], ease: "outQuad" },
      { t: 0.18, bone: "armR.sh", rot: [-0.6, 0, -0.5] },
      { t: 0.18, bone: "armR.el", rot: [-1.3, 0, 0] },
      { t: 0.55, bone: "head", rot: [0.22, 0, 0.10], ease: "inOutQuad" },
      { t: 0.85, bone: "head", rot: [0, 0, 0] },
      { t: 0.85, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.85, bone: "armR.el", rot: [0, 0, 0] }
    ], { loop: false, dur: 0.85 });

    /* helper-arm wiggle + muzzle flicker layer */
    anim.layer(function (t) {
      const hL = anim.off("helperL");
      if (hL) { hL.rz = Math.sin(t * 1.8) * 0.10; hL.rx = Math.sin(t * 1.3 + 1) * 0.06; }
      const hR = anim.off("helperR");
      if (hR) { hR.rz = -Math.sin(t * 1.6 + 0.5) * 0.10; hR.rx = Math.sin(t * 1.45) * 0.06; }
      const cn = anim.off("cannon");
      if (cn) cn.py = Math.sin(t * 2.2) * 0.004;
    });

    anim.setBase("idle");
    anim.play("idle", { fade: 0 });
    anim.update(0);

    K.mergeRig(rig);

    rig.parts.root = rig.root;
    rig.parts.body = rig.body;
    const meshCount = rig.countMeshes();
    if (meshCount > 118) console.warn("[chars] crane meshes:", meshCount);

    return {
      id: "crane", root: rig.root, parts: rig.parts, anim,
      height: DEFS.crane.height, radius: DEFS.crane.radius, team: DEFS.crane.team,
      rig, meshes: meshCount
    };
  }

  /* ==========================================================================
     DRONE — companion support / herbalist girl + puffball + helper drone
     (HUvn2CdW)
     ========================================================================== */
  function buildDrone() {
    const rig = K.rig({ name: "drone", height: DEFS.drone.height });
    const g = K.geo, M = K.mat;
    const DS = T().DoubleSide;
    const add = rig.add.bind(rig);

    /* -- palette ------------------------------------------------------- */
    const skinM = M.toon(0xf6ddc4);
    const hairM = M.toon(0x9fe8d0);
    const hairDk = M.toon(0x6fc7ae);
    const cloakM = M.toon(0x14333a);
    const cloakDk = M.toon(0x0e2429);
    const ponchoM = M.toon(0xa8c86a, { side: DS });
    const ponchoDk = M.toon(0x7ba04c);
    const orangeM = M.toon(PAL.orange);
    const orangeDk = M.toon(0xc26a1e);
    const woodM = M.toon(0x4a3524);
    const oliveM = M.toon(0x8a9455);
    const creamM = M.toon(PAL.cream);
    const darkM = M.toon(0x14161a);
    const metalM = M.toon(0x8a93a0);

    /* -- skeleton ------------------------------------------------------ */
    rig.bone("hips", null, [0, 0.58, 0]);
    rig.bone("chest", "hips", [0, 0.20, 0]);
    rig.bone("neck", "chest", [0, 0.13, 0]);
    rig.bone("head", "neck", [0, 0.08, 0]);
    rig.bone("hairBack", "head", [0, 0.02, -0.06], [0.1, 0, 0], { sway: 0.04, phase: 0.5 });
    rig.bone("braidL", "head", [0.14, -0.02, 0.02], [0, 0, 0.15], { sway: 0.09, phase: 1.4 });
    rig.bone("braidR", "head", [-0.14, -0.02, 0.02], [0, 0, -0.15], { sway: 0.09, phase: 2.8 });

    rig.bone("armL.sh", "chest", [0.13, 0.09, 0], [0, 0, 0.12]);
    rig.bone("armL.el", "armL.sh", [0, -0.15, 0]);
    rig.bone("armL.hand", "armL.el", [0, -0.13, 0]);
    rig.bone("armR.sh", "chest", [-0.13, 0.09, 0], [0, 0, -0.12]);
    rig.bone("armR.el", "armR.sh", [0, -0.15, 0]);
    rig.bone("armR.hand", "armR.el", [0, -0.13, 0]);

    rig.bone("legL.hip", "hips", [0.06, -0.05, 0]);
    rig.bone("legL.knee", "legL.hip", [0, -0.16, 0]);
    rig.bone("legL.foot", "legL.knee", [0, -0.16, 0]);
    rig.bone("legR.hip", "hips", [-0.06, -0.05, 0]);
    rig.bone("legR.knee", "legR.hip", [0, -0.16, 0]);
    rig.bone("legR.foot", "legR.knee", [0, -0.16, 0]);

    /* cloak panels */
    const panelAng = [0.7, PI, -0.7];
    for (let i = 0; i < panelAng.length; i++) {
      const a = panelAng[i];
      rig.bone("cloak." + i, "chest", [Math.sin(a) * 0.12, -0.02, Math.cos(a) * 0.12], [-0.08, a, 0],
        { sway: 0.05, phase: i * 1.6 });
    }
    /* staff in the LEFT hand, potion bottle dangling off it */
    rig.bone("propL", "armL.hand", [0, -0.02, 0]);
    rig.bone("staff", "propL", [0, 0, 0], [0.04, 0, -0.10]);
    rig.bone("bottle", "staff", [0.05, 0.72, 0.02], [0, 0, 0], { sway: 0.14, phase: 1.9 });
    /* backpack + puffball creature riding it */
    rig.bone("pack", "chest", [0, 0.02, -0.13]);
    rig.bone("drone", "pack", [0.02, 0.14, -0.05], [0, 0.4, 0], { sway: 0.05, phase: 4.0 });
    /* independent floating helper drone */
    rig.bone("hover", null, [0.45, 0.95, 0.25]);

    /* -- body ------------------------------------------------------------ */
    add("hips", g.sphere(), cloakDk, { s: [0.115, 0.10, 0.10] });
    add("chest", g.sphere(), cloakM, { p: [0, 0.02, 0], s: [0.115, 0.12, 0.10] });
    add("chest", g.bell(0.10, 0.145, 0.22, 12, 0, 2), cloakM, { p: [0, -0.10, 0], o: 0.05 });
    add("neck", g.cyl(0.040, 0.045, 0.08, 10), skinM, { p: [0, 0.01, 0] });
    /* high collar */
    add("neck", g.cyl(0.075, 0.09, 0.09, 12, true), cloakDk, { p: [0, 0.045, 0], o: 0.04 });

    /* cloak panels under the poncho */
    for (let i = 0; i < panelAng.length; i++) {
      add("cloak." + i, g.tatter(0.16, 0.24, 0.03, 0.014, 3, 1.04), cloakM, { o: 0.045 });
    }

    /* -- poncho with glyph band ------------------------------------------ */
    const poncho = K.mk(g.bell(0.085, 0.24, 0.26, 16, 3, 3), ponchoM, { p: [0, 0.10, 0], o: 0.045 });
    rig.attach("chest", poncho);
    const glyphBand = K.mk(g.cyl(0.205, 0.225, 0.07, 18, true),
      M.mapToon(0xffffff, A.tex.glyphs(), { transparent: true, side: DS }), { p: [0, -0.005, 0], ro: 1 });
    glyphBand.userData.noOutline = true;
    rig.attach("chest", glyphBand);
    /* poncho shoulder points */
    add("chest", g.cone6(), ponchoDk, { p: [0.15, 0.13, 0.02], r: [0.3, 0, -2.2], s: [0.02, 0.07, 0.012], shadow: false });
    add("chest", g.cone6(), ponchoDk, { p: [-0.15, 0.13, 0.02], r: [0.3, 0, 2.2], s: [0.02, 0.07, 0.012], shadow: false });

    /* -- legs: stubby, dangling ------------------------------------------ */
    for (const s of ["L", "R"]) {
      add("leg" + s + ".hip", g.cyl(0.042, 0.038, 0.15, 8), cloakDk, { p: [0, -0.075, 0] });
      add("leg" + s + ".foot", g.sphere(), woodM, { p: [0, -0.03, 0.01], s: [0.055, 0.045, 0.075], o: 0.05 });
    }

    /* -- arms + orange segmented mechanical braces ----------------------- */
    for (const s of ["L", "R"]) {
      add("arm" + s + ".sh", g.cyl(0.038, 0.034, 0.13, 8), skinM, { p: [0, -0.065, 0] });
      add("arm" + s + ".hand", g.sphere(), skinM, { s: [0.038, 0.042, 0.036], shadow: false });
      /* three-segment orange brace on the forearm */
      add("arm" + s + ".el", g.cyl(0.048, 0.044, 0.045, 10), orangeM, { p: [0, -0.01, 0], o: 0.04 });
      add("arm" + s + ".el", g.cyl(0.050, 0.046, 0.045, 10), orangeDk, { p: [0, -0.065, 0] });
      add("arm" + s + ".el", g.cyl(0.048, 0.044, 0.045, 10), orangeM, { p: [0, -0.12, 0], o: 0.04 });
    }

    /* -- head + face ------------------------------------------------------ */
    const headG = K.head({
      r: 0.15,
      skinMat: skinM,
      eyeTex: A.tex.animeEye(0xcf9430),
      eyeAngW: 0.82, eyeAngH: 0.76, eyeAz: 0.46, eyeEl: -0.06,
      blush: 0xd8544a, blushOpacity: 0.5, blushAz: 1.0, blushEl: -0.42,
      mouth: true, mouthColor: 0x35222a, mouthR: 0.018, mouthY: -0.088
    });
    headG.position.set(0, 0.05, 0);
    rig.attach("head", headG);

    /* mint hair + twin braids */
    const hair = K.hairBob({ r: 0.15, mat: hairM, color: 0x9fe8d0, bangs: 5, back: 3, bangLen: 0.40, sideLen: 0.7, len: 0.55 });
    hair.position.set(0, 0.05, 0);
    rig.attach("head", hair);
    for (const b of ["braidL", "braidR"]) {
      add(b, g.sphere(), hairM, { p: [0, -0.06, 0], s: [0.045, 0.05, 0.042] });
      add(b, g.sphere(), hairDk, { p: [0, -0.14, 0.01], s: [0.038, 0.042, 0.036] });
      add(b, g.sphere(), hairM, { p: [0, -0.21, 0.015], s: [0.030, 0.034, 0.029] });
      add(b, g.cone6(), orangeM, { p: [0, -0.26, 0.015], r: [PI, 0, 0], s: [0.020, 0.035, 0.018], shadow: false });
    }
    /* orange disc ear-cups + antenna */
    add("head", g.cyl(0.055, 0.055, 0.028, 14), orangeM, { p: [0.155, 0.02, 0], r: [0, 0, PI / 2], o: 0.04 });
    add("head", g.cyl(0.055, 0.055, 0.028, 14), orangeM, { p: [-0.155, 0.02, 0], r: [0, 0, PI / 2], o: 0.04 });
    add("head", g.cyl(0.030, 0.030, 0.012, 10), darkM, { p: [0.172, 0.02, 0], r: [0, 0, PI / 2], shadow: false });
    add("head", g.cyl(0.030, 0.030, 0.012, 10), darkM, { p: [-0.172, 0.02, 0], r: [0, 0, PI / 2], shadow: false });
    add("head", g.cyl(0.004, 0.004, 0.12, 5), metalM, { p: [0.0, 0.22, -0.02], r: [0, 0, 0.25], shadow: false });
    add("head", g.sphereLo(), orangeM, { p: [0.016, 0.28, -0.02], s: 0.014, shadow: false, noOutline: true });

    /* -- crooked wooden staff + hanging potion ---------------------------- */
    add("staff", g.gnarl(1.05, 0.022, 0.016, 7, 4), woodM, { p: [0, -0.30, 0], o: 0.06 });
    add("staff", g.sphereLo(), woodM, { p: [0.02, 0.30, 0.01], s: [0.035, 0.028, 0.032] });
    add("bottle", g.cyl(0.004, 0.004, 0.05, 5), darkM, { p: [0, -0.025, 0], shadow: false });
    add("bottle", g.sphere(), M.glow(0x7de89a, 1), { p: [0, -0.085, 0], s: [0.032, 0.038, 0.032], shadow: false });
    add("bottle", g.cyl(0.012, 0.012, 0.018, 8), woodM, { p: [0, -0.048, 0], shadow: false });

    /* -- backpack + three-eyed puffball creature --------------------------- */
    add("pack", g.box(), oliveM, { p: [0, 0, 0], s: [0.16, 0.18, 0.09], o: 0.05 });
    add("pack", g.box(), creamM, { p: [0, 0.05, -0.048], s: [0.12, 0.07, 0.012] });
    /* puffball body */
    add("drone", g.sphere(), creamM, { s: [0.075, 0.07, 0.07], o: 0.05 });
    /* three yellow eyes, triangle formation */
    const eyePos = [[-0.032, 0.022, 0.058], [0.032, 0.022, 0.058], [0, -0.028, 0.066]];
    for (const ep of eyePos) {
      add("drone", g.sphereLo(), M.flat(0xffd94a), { p: ep, s: 0.016, shadow: false, noOutline: true });
      add("drone", g.sphereLo(), darkM, { p: [ep[0], ep[1], ep[2] + 0.010], s: 0.007, shadow: false, noOutline: true });
    }
    /* tiny beak */
    add("drone", g.cone6(), orangeM, { p: [0, -0.005, 0.075], r: [PI / 2, 0, 0], s: [0.012, 0.022, 0.010], shadow: false });

    /* -- floating helper drone ---------------------------------------------- */
    add("hover", g.sphere(), metalM, { s: [0.05, 0.045, 0.05], o: 0.05 });
    add("hover", g.sphereLo(), M.glow(0x8fdcff, 1), { p: [0, 0, 0.045], s: 0.018, shadow: false, noOutline: true });
    add("hover", g.cyl(0.085, 0.085, 0.006, 12), darkM, { p: [0, 0.055, 0], shadow: false });
    add("hover", g.cone6(), orangeM, { p: [0, -0.055, 0], r: [PI, 0, 0], s: [0.014, 0.03, 0.012], shadow: false });
    const hoverGlow = A.glowSprite(0x8fdcff, 0.22, 0.5);
    rig.attach("hover", hoverGlow);

    /* ======================================================================
       ANIMATION
       ====================================================================== */
    const anim = K.anim(rig);
    K.idleClip(anim, { dur: 2.2, breath: 0.02, headTurn: 0.06 });

    /* burst — staff thrust forward, free arm thrown up */
    anim.addClip("attack", [
      { t: 0.00, bone: "armL.sh", rot: [0, 0, 0] },
      { t: 0.00, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.00, bone: "chest", rot: [0, 0, 0] },
      { t: 0.14, bone: "chest", rot: [0, 0.35, 0], ease: "inQuad" },
      { t: 0.14, bone: "armL.sh", rot: [0.5, 0, 0.3] },
      { t: 0.14, bone: "armR.sh", rot: [-0.5, 0, -0.6] },
      { t: 0.30, bone: "chest", rot: [-0.10, -0.30, 0], ease: "outCubic" },
      { t: 0.30, bone: "armL.sh", rot: [-1.35, 0, 0.15] },
      { t: 0.30, bone: "armL.el", rot: [-0.15, 0, 0] },
      { t: 0.30, bone: "propL", rot: [-0.3, 0, 0.2] },
      { t: 0.30, bone: "armR.sh", rot: [-2.2, 0, -0.4] },
      { t: 0.30, bone: "armR.el", rot: [-0.3, 0, 0] },
      { t: 0.30, bone: "head", rot: [-0.10, 0, 0] },
      { t: 0.48, bone: "armL.sh", rot: [-1.4, 0, 0.15], ease: "inOutQuad" },
      { t: 0.80, bone: "chest", rot: [0, 0, 0] },
      { t: 0.80, bone: "armL.sh", rot: [0, 0, 0] },
      { t: 0.80, bone: "armL.el", rot: [0, 0, 0] },
      { t: 0.80, bone: "propL", rot: [0, 0, 0] },
      { t: 0.80, bone: "armR.sh", rot: [0, 0, 0] },
      { t: 0.80, bone: "armR.el", rot: [0, 0, 0] },
      { t: 0.80, bone: "head", rot: [0, 0, 0] }
    ], { loop: false, dur: 0.80 });

    /* hover-bob + puffball wiggle + helper drone orbit layer */
    anim.layer(function (t) {
      const hips = anim.off("hips");
      if (hips) hips.py = Math.sin(t * 2.1) * 0.018;
      const dr = anim.off("drone");
      if (dr) { dr.rz = Math.sin(t * 3.1) * 0.10; dr.py = Math.abs(Math.sin(t * 4.2)) * 0.012; }
      const hv = anim.off("hover");
      if (hv) {
        hv.px = Math.cos(t * 0.9) * 0.10;
        hv.pz = Math.sin(t * 0.9) * 0.10;
        hv.py = Math.sin(t * 2.4 + 1.2) * 0.05;
      }
      const bt = anim.off("bottle");
      if (bt) bt.rz = Math.sin(t * 2.6 + 0.7) * 0.14;
    });

    anim.setBase("idle");
    anim.play("idle", { fade: 0 });
    anim.update(0);

    K.mergeRig(rig);

    rig.parts.root = rig.root;
    rig.parts.body = rig.body;
    const meshCount = rig.countMeshes();
    if (meshCount > 118) console.warn("[chars] drone meshes:", meshCount);

    return {
      id: "drone", root: rig.root, parts: rig.parts, anim,
      height: DEFS.drone.height, radius: DEFS.drone.radius, team: DEFS.drone.team,
      rig, meshes: meshCount
    };
  }

  /* ==========================================================================
     REGISTRY
     ========================================================================== */
  const REG = Object.create(null);
  /* new-style characters (src/char_<id>.js) register themselves here and override the legacy builders below */
  C.define = function (id, def, builder) { DEFS[id] = def; REG[id] = builder; C.heights[id] = def.height; C.radii[id] = def.radius; };
  C.build = function (id) {
    if (REG[id]) return REG[id]();
    switch (id) {
      case "witch": return buildWitch();
      case "crane": return buildCrane();
      case "drone": return buildDrone();
      default: throw new Error("[chars] unknown character id: " + id);
    }
  };
  C.has = function (id) { return !!DEFS[id] || !!REG[id]; };
  C.list = function () {
    return Object.keys(DEFS).map(function (k) {
      return { id: k, height: DEFS[k].height, radius: DEFS[k].radius, team: DEFS[k].team };
    });
  };
  C.heights = { witch: DEFS.witch.height, crane: DEFS.crane.height, drone: DEFS.drone.height };
  C.radii = { witch: DEFS.witch.radius, crane: DEFS.crane.radius, drone: DEFS.drone.radius };

  G.chars = C;
})();
