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

    /* one skinned draw per material instead of ~24 separate meshes + outlines (bones still animate everything) */
    if (G.kit && G.kit.skinBake) G.kit.skinBake({ root: root, body: root, bones: { hips: hips, chest: chest, head: head, cap: cap,
      "legL.foot": legL.foot, "legR.foot": legR.foot, "armL.sh": armL.sh, "armR.sh": armR.sh } });

    return { root: root, parts: parts, height: 0.7, radius: 0.35, team: "enemy" };
  }

  /* ---- dispatcher ---- */
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
    ent.flashSprite.material.opacity = 0; ent.flashSprite.visible = false;
    if (o.root && o.root.add) o.root.add(ent.flashSprite);

    ent.tick = function (dt) {
      if (ent.flash > 0) ent.flash = Math.max(0, ent.flash - dt * 4.5);
      if (ent.invuln > 0) ent.invuln = Math.max(0, ent.invuln - dt);
      if (ent.flashSprite && ent.flashSprite.material) {
        ent.flashSprite.material.opacity = ent.flash * 0.55;
        ent.flashSprite.visible = ent.flash > 0.005;
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
    s.material.opacity = 0; s.visible = false;
    root.add(s);
    return s;
  }

  function pulseAura(aura, amt) {
    if (!aura || !aura.material) return;
    aura.material.opacity = amt;
    aura.visible = amt > 0.005;
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
        /* each imp owns its baked skin (geometry + bone texture): free them, the rest is shared */
        let sk = null;
        this.root.traverse((o) => { if (o.isSkinnedMesh && o.userData.skinBaked) { o.geometry.dispose(); sk = o.skeleton; } });
        if (sk) sk.dispose();
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
    spawnImp: spawnImp,
    buildImp: buildImp,
    update: update,
    active: active,
    ImpAI: ImpAI,
    get scene() { return sceneRef; }
  };
})();
