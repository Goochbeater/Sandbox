/* ============================================================================
   SPOREHEART — src/charakit.js
   MARIONETTE — the in-house procedural character studio.

   Everything here is authored from primitives: rig joints, capsule limbs,
   lathe shells, extruded cloth, curved eye patches and a tiny keyframe
   animator with cross-fades, additive idle layers and secondary sway.

   PUBLIC API (window.G.kit)
     kit.rig(opts)                   -> rig {root, body, bones, parts, add, bone}
     kit.anim(rig)                   -> animator
     kit.mat.toon/mapToon/flat/glow/eye
     kit.geo.*                       -> cached shared geometry factory
     kit.mk(geo, mat, opts)          -> mesh (+ inverted-hull outline when opts.o)
     kit.outline(mesh, t)
     kit.head(opts), kit.hairBob(opts), kit.panel(opts)
     kit.skull(size, opts), kit.crystal(size,color), kit.glowDisc(...)

   Rig node convention (SPEC): hips, chest, head, hairBack,
     armL{sh,el,hand}, armR{sh,el,hand}, legL{hip,knee,foot},
     legR{hip,knee,foot}, cloak[] (+ cloakTip[]), propR/propL, extras.

   NOTE: no THREE object is touched until a builder runs (G.THREE is null at
   parse time). No allocations happen inside anim.update(dt).
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  if (!G || !G.CONF) throw new Error("charakit.js requires core.js");
  const PI = Math.PI, TAU = PI * 2;
  const PAL = G.CONF.PAL;
  const T = () => G.THREE;
  const A = () => G.assets;
  const U = G.util;

  const K = (G.kit = G.kit || {});
  K.version = "MARIONETTE 1.0";

  /* ==========================================================================
     SECTION 1 — MATERIALS
     Toon materials come from assets (shared/cached). Materials that carry a
     canvas map are created uncached so the shared cache is never poisoned by
     a map swap. Glow = MeshBasic (no bloom pass in this game).
     ========================================================================== */
  const flatCache = Object.create(null);
  const mat = {};

  mat.toon = function (color, opts) {
    opts = opts || {};
    if (opts.map) return mat.mapToon(color, opts.map, opts);
    const o = {};
    if (opts.side !== undefined) o.side = opts.side;
    if (opts.transparent) { o.transparent = true; o.opacity = opts.opacity === undefined ? 1 : opts.opacity; }
    if (opts.emissive !== undefined) { o.emissive = opts.emissive; o.emissiveIntensity = opts.emissiveIntensity; }
    return A().mat.toon(color, o);
  };

  mat.mapToon = function (color, map, opts) {
    opts = opts || {};
    const m = A().mat.toon(color, { noCache: true, transparent: opts.transparent !== false, opacity: opts.opacity === undefined ? 1 : opts.opacity });
    m.map = map;
    if (opts.side !== undefined) m.side = opts.side;
    if (opts.emissive !== undefined) { m.emissive = new (T().Color)(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity || 0.5; }
    m.needsUpdate = true;
    return m;
  };

  mat.flat = function (color, opts) {
    opts = opts || {};
    if (opts.map || opts.transparent) return A().mat.flat(color, opts);
    const key = color + "_" + (opts.side || 0);
    let m = flatCache[key];
    if (!m) { m = flatCache[key] = A().mat.flat(color, opts); }
    return m;
  };

  mat.eye = function (tex) {
    return A().mat.flat(0xffffff, { map: tex, transparent: true, depthWrite: false, side: T().DoubleSide, fog: false });
  };

  mat.glow = function (color, i) { return A().mat.glow(color, i || 1); };

  mat.additive = function (color, opacity) {
    return A().mat.flat(color, {
      transparent: true, opacity: opacity === undefined ? 0.9 : opacity, side: T().DoubleSide,
      depthWrite: false, blending: T().AdditiveBlending
    });
  };

  /* ==========================================================================
     SECTION 2 — GEOMETRY FACTORY (cached by parameter signature)
     ========================================================================== */
  const GC = Object.create(null);
  function gcache(key, make) {
    let g = GC[key];
    if (g === undefined) { g = make(); GC[key] = g; }
    return g;
  }
  function V2(x, y) { return new (T().Vector2)(x, y); }
  function num(n) { return Math.round(n * 10000) / 10000; }

  const geo = {};

  geo.sphere = () => gcache("sphere", () => new (T().SphereGeometry)(1, 18, 12));
  geo.sphereLo = () => gcache("sphereLo", () => new (T().SphereGeometry)(1, 10, 7));
  geo.box = () => gcache("box", () => new (T().BoxGeometry)(1, 1, 1));
  geo.plane = () => gcache("plane", () => new (T().PlaneGeometry)(1, 1));
  geo.circle = () => gcache("circle", () => new (T().CircleGeometry)(1, 20));
  geo.cone = () => gcache("cone", () => new (T().ConeGeometry)(1, 1, 12));
  geo.cone6 = () => gcache("cone6", () => new (T().ConeGeometry)(1, 1, 6));
  geo.octa = () => gcache("octa", () => new (T().OctahedronGeometry)(1, 0));

  geo.cyl = function (rt, rb, h, seg, open) {
    seg = seg || 12;
    const key = "cyl_" + num(rt) + "_" + num(rb) + "_" + num(h) + "_" + seg + (open ? "_o" : "");
    return gcache(key, () => new (T().CylinderGeometry)(rt, rb, h, seg, 1, !!open));
  };

  geo.torus = function (r, tube, arc, radialSeg, tubularSeg) {
    arc = arc === undefined ? TAU : arc;
    radialSeg = radialSeg || 7; tubularSeg = tubularSeg || 16;
    const key = "tor_" + num(r) + "_" + num(tube) + "_" + num(arc) + "_" + radialSeg + "_" + tubularSeg;
    return gcache(key, () => new (T().TorusGeometry)(r, tube, radialSeg, tubularSeg, arc));
  };

  geo.ring = function (ri, ro, seg) {
    seg = seg || 24;
    return gcache("ring_" + num(ri) + "_" + num(ro) + "_" + seg, () => new (T().RingGeometry)(ri, ro, seg));
  };

  /* Lathe shell — points are [[radius, y], ...] from bottom to top.
     phi = 0 starts at +Z, sweeping toward +X. */
  geo.lathe = function (points, seg, phiStart, phiLength, key) {
    seg = seg || 18;
    phiStart = phiStart || 0;
    phiLength = phiLength === undefined ? TAU : phiLength;
    const k = "lathe_" + (key || points.length + ":" + num(points[0][0]) + ":" + num(points[points.length - 1][1])) + "_" + seg + "_" + num(phiStart) + "_" + num(phiLength);
    return gcache(k, () => {
      const pts = [];
      for (let i = 0; i < points.length; i++) pts.push(V2(points[i][0], points[i][1]));
      return new (T().LatheGeometry)(pts, seg, phiStart, phiLength);
    });
  };

  /* Bell / robe shell: open frustum with optional jagged (tattered) hem. */
  geo.bell = function (rTop, rBot, h, seg, jag, rows) {
    seg = seg || 18; rows = rows || 5;
    const key = "bell_" + num(rTop) + "_" + num(rBot) + "_" + num(h) + "_" + seg + "_" + num(jag||0) + "_" + rows;
    return gcache(key, () => {
      const pos = [], uv = [], idx = [];
      for (let j = 0; j <= rows; j++) {
        const v = j / rows, y = h * (1 - v);
        const rr = rTop + (rBot - rTop) * Math.pow(v, 0.85);
        for (let i = 0; i <= seg; i++) {
          const u = i / seg, a = u * TAU;
          let yy = y;
          if (j === rows && jag) yy -= jag * (0.25 + 0.75 * Math.abs(Math.sin(a * 4.5 + 0.6)));
          pos.push(Math.sin(a) * rr, yy, Math.cos(a) * rr);
          uv.push(u, 1 - v);
        }
      }
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < seg; i++) {
          const a = j * (seg + 1) + i, b = a + seg + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
      const g = new (T().BufferGeometry)();
      g.setAttribute("position", new (T().Float32BufferAttribute)(pos, 3));
      g.setAttribute("uv", new (T().Float32BufferAttribute)(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    });
  };

  /* Tattered cloth panel: extruded, top edge at y = 0, hangs to -len,
     jagged hem. Used for cloak panels, skirt panels, ponchos, sashes. */
  geo.tatter = function (w, len, jag, thick, points, flare) {
    thick = thick || 0.02; points = points || 4; flare = flare || 1.06;
    const key = "tat_" + num(w) + "_" + num(len) + "_" + num(jag) + "_" + num(thick) + "_" + points + "_" + num(flare);
    return gcache(key, () => {
      const half = w / 2;
      const s = new (T().Shape)();
      s.moveTo(-half, 0);
      s.lineTo(half, 0);
      s.lineTo(half * flare, -len * 0.52);
      for (let i = 0; i <= points; i++) {
        const x = half * flare - (half * 2 * flare) * (i / points);
        const y = -len + (i % 2 === 0 ? -jag : jag * 0.22);
        s.lineTo(x, y);
      }
      s.lineTo(-half * flare, -len * 0.52);
      s.closePath();
      const g = new (T().ExtrudeGeometry)(s, { depth: thick, bevelEnabled: false, curveSegments: 2, steps: 1 });
      g.translate(0, 0, -thick / 2);
      g.computeVertexNormals();
      return g;
    });
  };

  /* Hair strand / ribbon card: tapered extruded blade, top at y = 0. */
  geo.strand = function (w, len, thick, curve) {
    thick = thick || 0.014; curve = curve || 0.20;
    const key = "str_" + num(w) + "_" + num(len) + "_" + num(thick) + "_" + num(curve);
    return gcache(key, () => {
      const s = new (T().Shape)();
      s.moveTo(-w / 2, 0);
      s.lineTo(w / 2, 0);
      s.lineTo(w * 0.42 + curve * w, -len * 0.55);
      s.lineTo(curve * w, -len);
      s.lineTo(-w * 0.38 + curve * w * 0.4, -len * 0.5);
      s.closePath();
      const g = new (T().ExtrudeGeometry)(s, { depth: thick, bevelEnabled: false, curveSegments: 2, steps: 1 });
      g.translate(0, 0, -thick / 2);
      g.computeVertexNormals();
      return g;
    });
  };

  /* Curved patch on a sphere of radius r, centred on azimuth az / elevation el.
     Used for anime eyes, blush, glowing lenses and skull eye-sockets. UV maps
     straight onto the canvas eye textures. */
  geo.eyePatch = function (r, az, wAng, el, hAng, segU, segV, roll) {
    segU = segU || 10; segV = segV || 10; roll = roll || 0;
    const key = "eyep_" + num(r) + "_" + num(az) + "_" + num(wAng) + "_" + num(el) + "_" + num(hAng) + "_" + segU + "_" + segV + "_" + num(roll);
    return gcache(key, () => {
      const pos = [], uv = [], idx = [];
      const cr = Math.cos(roll), sr = Math.sin(roll);
      for (let v = 0; v <= segV; v++) {
        const fv = v / segV;
        const e = el + (0.5 - fv) * hAng;
        for (let u = 0; u <= segU; u++) {
          const fu = u / segU;
          const a = az + (fu - 0.5) * wAng;
          const x = r * Math.cos(e) * Math.sin(a);
          const y = r * Math.sin(e);
          const z = r * Math.cos(e) * Math.cos(a);
          pos.push(x * cr - y * sr, x * sr + y * cr, z);
          uv.push(fu, 1 - fv);
        }
      }
      for (let v = 0; v < segV; v++) {
        for (let u = 0; u < segU; u++) {
          const a = v * (segU + 1) + u, b = a + segU + 1;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
      const g = new (T().BufferGeometry)();
      g.setAttribute("position", new (T().Float32BufferAttribute)(pos, 3));
      g.setAttribute("uv", new (T().Float32BufferAttribute)(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    });
  };

  /* Wavy, drooping disc (witch hat brim). Two-layer shell with rims. */
  geo.brim = function (rIn, rOut, yIn, yOut, thick, waveAmp, waves, seg) {
    seg = seg || 36;
    const key = "brim_" + num(rIn) + "_" + num(rOut) + "_" + num(yIn) + "_" + num(yOut) + "_" + num(thick) + "_" + num(waveAmp) + "_" + num(waves) + "_" + seg;
    return gcache(key, () => {
      const rows = 3, pos = [], uv = [], idx = [];
      const per = (rows + 1) * (seg + 1);
      for (let layer = 0; layer < 2; layer++) {
        const sy = layer === 0 ? thick / 2 : -thick / 2;
        for (let j = 0; j <= rows; j++) {
          const t = j / rows, rr = rIn + (rOut - rIn) * t;
          for (let i = 0; i <= seg; i++) {
            const u = i / seg, a = u * TAU;
            const droop = waveAmp * Math.sin(a * waves) * t * t;
            pos.push(Math.sin(a) * rr, yIn + (yOut - yIn) * t + droop + sy, Math.cos(a) * rr);
            uv.push(u, t);
          }
        }
      }
      const I = (layer, j, i) => layer * per + j * (seg + 1) + i;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < seg; i++) {
          const a = I(0, j, i), b = I(0, j + 1, i);
          idx.push(a, b, a + 1, b, b + 1, a + 1);
          const c = I(1, j, i), d = I(1, j + 1, i);
          idx.push(c, c + 1, d, d, c + 1, d + 1);
        }
      }
      for (let i = 0; i < seg; i++) { // outer + inner rims
        const t0 = I(0, rows, i), t1 = I(0, rows, i + 1), b0 = I(1, rows, i), b1 = I(1, rows, i + 1);
        idx.push(t0, b0, t1, t1, b0, b1);
        const u0 = I(0, 0, i), u1 = I(0, 0, i + 1), v0 = I(1, 0, i), v1 = I(1, 0, i + 1);
        idx.push(u0, u1, v0, u1, v1, v0);
      }
      const g = new (T().BufferGeometry)();
      g.setAttribute("position", new (T().Float32BufferAttribute)(pos, 3));
      g.setAttribute("uv", new (T().Float32BufferAttribute)(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    });
  };

  /* Twisted gnarled tube along +Y (staff shafts). Kink offsets baked in. */
  geo.gnarl = function (len, rBottom, rTop, seg, kinks) {
    kinks = kinks || 5;
    const key = "gnarl_" + num(len) + "_" + num(rBottom) + "_" + num(rTop) + "_" + seg + "_" + kinks;
    return gcache(key, () => {
      const rows = 10, pos = [], uv = [], idx = [];
      for (let j = 0; j <= rows; j++) {
        const v = j / rows;
        const y = v * len;
        const r = rBottom + (rTop - rBottom) * v;
        const ox = Math.sin(v * PI * 2.0) * 0.012 + Math.sin(v * kinks * PI) * 0.008;
        const oz = Math.cos(v * PI * 1.6) * 0.01;
        for (let i = 0; i <= seg; i++) {
          const u = i / seg, a = u * TAU;
          const wob = 1 + 0.12 * Math.sin(a * 3 + v * 9);
          pos.push(Math.sin(a) * r * wob + ox, y, Math.cos(a) * r * wob + oz);
          uv.push(u, v);
        }
      }
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < seg; i++) {
          const a = j * (seg + 1) + i, b = a + seg + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
      const g = new (T().BufferGeometry)();
      g.setAttribute("position", new (T().Float32BufferAttribute)(pos, 3));
      g.setAttribute("uv", new (T().Float32BufferAttribute)(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    });
  };

  /* ==========================================================================
     SECTION 3 — MESH + OUTLINE HELPERS
     ========================================================================== */
  let meshTally = 0;

  function mk(g, m, o) {
    o = o || {};
    const mesh = new (T().Mesh)(g, m);
    if (o.p) mesh.position.set(o.p[0], o.p[1], o.p[2]);
    if (o.r) mesh.rotation.set(o.r[0], o.r[1], o.r[2]);
    if (o.s !== undefined) {
      if (typeof o.s === "number") mesh.scale.setScalar(o.s);
      else mesh.scale.set(o.s[0], o.s[1], o.s[2]);
    }
    mesh.castShadow = o.shadow !== false;
    mesh.receiveShadow = o.recv !== false;
    if (o.ro !== undefined) mesh.renderOrder = o.ro;
    if (o.name) mesh.name = o.name;
    if (o.noOutline) mesh.userData.noOutline = true;
    if (o.o) outline(mesh, o.o, o.oc);
    meshTally++;
    return mesh;
  }

  function outline(mesh, thickness, color) {
    const o = A().outline(mesh, thickness === undefined ? 0.05 : thickness, color || 0x0d0f14);
    if (o) meshTally++;
    return o;
  }

  K.mk = mk;
  K.outline = outline;
  K.geo = geo;
  K.mat = mat;
  K.meshTally = () => meshTally;

  /* --- static batching -----------------------------------------------------
     Rigid parts that share a material are welded into one geometry so the
     cast stays under the mesh budget without losing any modelled detail.
     (No-op on the headless stub, where children is not a real array.) */
  function mergeGeos(geos) {
    const THREE = T();
    let count = 0;
    for (let i = 0; i < geos.length; i++) count += geos[i].attributes.position.count;
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    let o = 0;
    for (let i = 0; i < geos.length; i++) {
      const g = geos[i];
      const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      pos.set(p.array, o * 3);
      if (n) nor.set(n.array, o * 3);
      if (u) uv.set(u.array, o * 2);
      o += p.count;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    out.computeBoundingBox();
    return out;
  }

  function mergeBake(THREE, container, children) {
    const buckets = [];
    for (let i = 0; i < children.length; i++) {
      const ch = children[i];
      if (!ch.isMesh || ch.children.length > 0 || ch.userData.keep) continue;
      let bucket = null;
      for (let b = 0; b < buckets.length; b++) if (buckets[b].mat === ch.material) { bucket = buckets[b]; break; }
      if (!bucket) { bucket = { mat: ch.material, meshes: [] }; buckets.push(bucket); }
      bucket.meshes.push(ch);
    }
    for (let b = 0; b < buckets.length; b++) {
      const arr = buckets[b].meshes;
      if (arr.length < 2) continue;
      const geos = [];
      let cast = false, recv = false, order = 0;
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        m.updateMatrix();
        const gg = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        gg.applyMatrix4(m.matrix);
        geos.push(gg);
        cast = cast || m.castShadow; recv = recv || m.receiveShadow;
        order = Math.max(order, m.renderOrder);
      }
      const mesh = new THREE.Mesh(mergeGeos(geos), buckets[b].mat);
      mesh.castShadow = cast; mesh.receiveShadow = recv;
      mesh.renderOrder = order;
      mesh.userData.merged = true;
      for (let i = 0; i < arr.length; i++) container.remove(arr[i]);
      container.add(mesh);
    }
  }

  K.mergeStatic = function (group) {
    if (!group || !Array.isArray(group.children)) return group;
    mergeBake(T(), group, group.children.slice());
    return group;
  };

  K.mergeRig = function (rig) {
    if (!rig || !rig.bones) return rig;
    const paths = Object.keys(rig.bones);
    for (let i = 0; i < paths.length; i++) {
      const bone = rig.bones[paths[i]];
      if (!Array.isArray(bone.children)) continue;
      mergeBake(T(), bone, bone.children.slice());
    }
    return rig;
  };

  /* ==========================================================================
     SECTION 4 — RIG
     ========================================================================== */
  function nestPart(rig, path, obj) {
    const segs = path.split(".");
    let cur = rig.parts;
    for (let i = 0; i < segs.length - 1; i++) {
      const key = segs[i], nextNumeric = /^\d+$/.test(segs[i + 1]);
      if (cur[key] === undefined) cur[key] = nextNumeric ? [] : {};
      cur = cur[key];
    }
    const last = segs[segs.length - 1];
    if (/^\d+$/.test(last)) cur[+last] = obj;
    else cur[last] = obj;
  }

  K.rig = function (opts) {
    opts = opts || {};
    const THREE = T();
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    body.name = "body";

    const rig = {
      id: opts.name || "char",
      height: opts.height || 1.5,
      root, body,
      bones: Object.create(null),
      parts: {},
      height0: opts.height || 1.5
    };
    root.name = "char_" + rig.id;
    root.userData.isCharacter = true;
    root.userData.rig = rig;

    rig.bone = function (path, parentPath, p, r, data) {
      const o = new THREE.Object3D();
      o.name = path;
      if (p) o.position.set(p[0], p[1], p[2]);
      if (r) o.rotation.set(r[0], r[1], r[2]);
      const parent = parentPath ? rig.bones[parentPath] : body;
      if (!parent) console.warn("[kit] missing parent", parentPath, "for", path);
      (parent || body).add(o);
      if (data) {
        if (data.sway) { o.userData.sway = data.sway; o.userData.phase = data.phase || 0; }
        if (data.tag) o.userData.tag = data.tag;
      }
      rig.bones[path] = o;
      nestPart(rig, path, o);
      return o;
    };

    rig.add = function (path, g, m, o) {
      const mesh = mk(g, m, o);
      const b = rig.bones[path];
      if (b) b.add(mesh); else body.add(mesh);
      return mesh;
    };

    rig.group = function (path, p, r) {
      const g = new THREE.Group();
      if (p) g.position.set(p[0], p[1], p[2]);
      if (r) g.rotation.set(r[0], r[1], r[2]);
      const b = rig.bones[path];
      if (b) b.add(g); else body.add(g);
      return g;
    };

    rig.attach = function (path, obj) {
      const b = rig.bones[path];
      if (b) b.add(obj); else body.add(obj);
      return obj;
    };

    rig.countMeshes = function () {
      let n = 0;
      root.traverse((m) => { if (m.isMesh) n++; });
      return n;
    };

    return rig;
  };

  /* ==========================================================================
     SECTION 5 — ANIMATOR
     Keyframes: [{t, bone:'armR.sh', rot:[x,y,z], pos:[x,y,z], scl:[x,y,z], ease}]
     * rot/pos are ADDITIVE offsets from the rig's rest pose.
     * scl is a MULTIPLIER of rest scale (default 1).
     * Missing fields inherit the previous key on that channel.
     * Clip channels only own the bones they mention, so a base clip (idle)
     keeps living underneath attack clips.
     ========================================================================== */
  K.anim = function (rig) {
    const names = Object.keys(rig.bones);
    const n = names.length;
    const bones = new Array(n);
    const indexOf = Object.create(null);
    for (let i = 0; i < n; i++) { bones[i] = rig.bones[names[i]]; indexOf[names[i]] = i; }

    const rest = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      const b = bones[i], o = i * 9;
      rest[o] = b.rotation.x; rest[o + 1] = b.rotation.y; rest[o + 2] = b.rotation.z;
      rest[o + 3] = b.position.x; rest[o + 4] = b.position.y; rest[o + 5] = b.position.z;
      rest[o + 6] = b.scale.x; rest[o + 7] = b.scale.y; rest[o + 8] = b.scale.z;
    }

    const bufA = new Float32Array(n * 9);
    const bufB = new Float32Array(n * 9);
    const bufBase = new Float32Array(n * 9);
    const useA = new Uint8Array(n);
    const useB = new Uint8Array(n);
    const useBase = new Uint8Array(n);

    /* secondary-motion bones (flagged at rig time via {sway}) */
    let swayCount = 0;
    for (let i = 0; i < n; i++) if (bones[i].userData.sway) swayCount++;
    const swayIdx = new Int32Array(swayCount);
    const swayAmp = new Float32Array(swayCount);
    const swayPhase = new Float32Array(swayCount);
    for (let i = 0, k = 0; i < n; i++) {
      const sw = bones[i].userData.sway;
      if (sw) { swayIdx[k] = i; swayAmp[k] = sw; swayPhase[k] = bones[i].userData.phase || 0; k++; }
    }
    const idHips = indexOf.hips === undefined ? -1 : indexOf.hips;
    const idChest = indexOf.chest === undefined ? -1 : indexOf.chest;
    const idHead = indexOf.head === undefined ? -1 : indexOf.head;

    const clips = Object.create(null);
    const layers = [];
    const tmpList = [];
    const tmpMap = Object.create(null);
    let cur = null, prev = null, base = null;
    let clock = 0, baseTime = 0, idleAmp = 1, paused = false, lastSpeed = 0, pendingDone = null;

    const st = { name: null, t: 0, speed: 1, loop: true, done: false, fade: 1, fadeDur: 0, onDone: null };
    const pv = { name: null, t: 0, speed: 1, dur: 0, loop: true };

    const warned = Object.create(null);
    function warnOnce(msg) { if (!warned[msg]) { warned[msg] = 1; console.warn("[kit:anim] " + msg); } }

    function toVec(v, fallback) {
      if (!v) return fallback ? fallback.slice() : null;
      if (typeof v === "object" && v.length !== undefined) return [v[0], v[1], v[2]];
      return [v.x || 0, v.y || 0, v.z || 0];
    }

    function makeClip(name, kfs, opts) {
      opts = opts || {};
      const byBone = Object.create(null);
      let dur = 0;
      for (let i = 0; i < kfs.length; i++) {
        const kf = kfs[i];
        const idx = indexOf[kf.bone];
        if (idx === undefined) { warnOnce("clip '" + name + "' references unknown bone '" + kf.bone + "'"); continue; }
        let ch = byBone[idx];
        if (!ch) ch = byBone[idx] = { i: idx, keys: [], path: kf.bone };
        ch.keys.push({
          t: kf.t,
          rot: toVec(kf.rot), pos: toVec(kf.pos), scl: toVec(kf.scl),
          ease: kf.ease || "inOutQuad"
        });
        if (kf.t > dur) dur = kf.t;
      }
      const channels = [];
      for (const k in byBone) {
        const ch = byBone[k];
        ch.keys.sort((a, b) => a.t - b.t);
        let lr = [0, 0, 0], lp = [0, 0, 0], ls = [1, 1, 1];
        for (let i = 0; i < ch.keys.length; i++) {
          const key = ch.keys[i];
          if (key.rot) lr = key.rot; else key.rot = lr;
          if (key.pos) lp = key.pos; else key.pos = lp;
          if (key.scl) ls = key.scl; else key.scl = ls;
        }
        channels.push(ch);
      }
      return {
        name, channels, dur: opts.dur || dur,
        loop: opts.loop === undefined ? true : !!opts.loop,
        speed: opts.speed || 1
      };
    }

    function addClip(name, kfs, opts) { clips[name] = makeClip(name, kfs, opts); return clips[name]; }

    function play(name, opts) {
      opts = opts || {};
      const clip = clips[name];
      if (!clip) { warnOnce("missing clip '" + name + "'"); return null; }
      const fade = opts.fade === undefined ? 0.12 : opts.fade;
      if (cur && cur.name !== name && fade > 0) {
        pv.name = cur.name; pv.t = st.t; pv.speed = st.speed; pv.dur = cur.dur; pv.loop = st.loop;
        st.fadeDur = fade; st.fade = 0;
      } else if (!cur) {
        pv.name = null; st.fadeDur = 0; st.fade = 1;
      }
      cur = clip;
      st.name = name;
      st.t = 0;
      st.speed = opts.speed || clip.speed || 1;
      st.loop = opts.once ? false : (opts.loop === undefined ? clip.loop : !!opts.loop);
      st.done = false;
      st.onDone = opts.onDone || null;
      paused = false;
      pendingDone = null;
      return clip;
    }

    function setBase(name) {
      base = name ? clips[name] || null : null;
      baseTime = 0;
      if (name && !base) warnOnce("missing base clip '" + name + "'");
    }

    /* static pose, no time advancement */
    function pose(name) {
      const clip = clips[name];
      if (!clip) { warnOnce("missing pose '" + name + "'"); return; }
      cur = clip; prev = null; pv.name = null;
      st.name = name; st.t = 0; st.loop = true; st.fadeDur = 0; st.fade = 1; paused = true;
      render(0);
    }

    function stop(fade) {
      if (!cur) return;
      pv.name = cur.name; pv.t = st.t; pv.speed = st.speed; pv.dur = cur.dur; pv.loop = st.loop;
      st.fadeDur = fade === undefined ? 0.2 : fade; st.fade = 0;
      cur = null; st.name = null; st.done = true;
    }

    function sampleClip(clip, time, out, used) {
      const chs = clip.channels;
      for (let c = 0; c < chs.length; c++) {
        const ch = chs[c], keys = ch.keys, nk = keys.length;
        let k0 = keys[0], k1 = keys[0], u = 0;
        if (nk > 1) {
          if (time <= keys[0].t) { k0 = k1 = keys[0]; }
          else if (time >= keys[nk - 1].t) { k0 = k1 = keys[nk - 1]; }
          else {
            for (let i = 0; i < nk - 1; i++) {
              if (time >= keys[i].t && time <= keys[i + 1].t) {
                k0 = keys[i]; k1 = keys[i + 1];
                const span = k1.t - k0.t;
                u = span > 0 ? (time - k0.t) / span : 0;
                u = U.ease(u, k0.ease);
                break;
              }
            }
          }
        }
        const o = ch.i * 9;
        out[o] = k0.rot[0] + (k1.rot[0] - k0.rot[0]) * u;
        out[o + 1] = k0.rot[1] + (k1.rot[1] - k0.rot[1]) * u;
        out[o + 2] = k0.rot[2] + (k1.rot[2] - k0.rot[2]) * u;
        out[o + 3] = k0.pos[0] + (k1.pos[0] - k0.pos[0]) * u;
        out[o + 4] = k0.pos[1] + (k1.pos[1] - k0.pos[1]) * u;
        out[o + 5] = k0.pos[2] + (k1.pos[2] - k0.pos[2]) * u;
        out[o + 6] = k0.scl[0] + (k1.scl[0] - k0.scl[0]) * u;
        out[o + 7] = k0.scl[1] + (k1.scl[1] - k0.scl[1]) * u;
        out[o + 8] = k0.scl[2] + (k1.scl[2] - k0.scl[2]) * u;
        used[ch.i] = 1;
      }
    }

    function off(path) {
      let o = tmpMap[path];
      if (!o) {
        const idx = indexOf[path];
        if (idx === undefined) { warnOnce("layer offset on unknown bone '" + path + "'"); return null; }
        o = tmpMap[path] = { i: idx, used: false, rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, sx: 0, sy: 0, sz: 0 };
        tmpList.push(o);
      }
      o.used = true;
      return o;
    }

    function render(dt) {
      useA.fill(0); useB.fill(0); useBase.fill(0);
      if (base) sampleClip(base, baseTime, bufBase, useBase);
      if (cur) sampleClip(cur, st.t, bufA, useA);
      const hasPrev = !!(pv.name && clips[pv.name]);
      if (hasPrev) sampleClip(clips[pv.name], pv.t, bufB, useB);

      for (let i = 0; i < tmpList.length; i++) {
        const t = tmpList[i];
        t.used = false; t.rx = t.ry = t.rz = t.px = t.py = t.pz = 0; t.sx = t.sy = t.sz = 0;
      }
      for (let i = 0; i < layers.length; i++) layers[i](clock, dt || 0, anim);

      const mix = (hasPrev && st.fadeDur > 0) ? U.clamp01(st.fade) : 1;
      const im = 1 - mix;
      const speedK = U.clamp01(lastSpeed / 7);
      const idleK = idleAmp;
      const breath = Math.sin(clock * 2.1) * idleK;
      const bob = Math.sin(clock * 2.1 + 0.35) * idleK;
      const headSway = Math.sin(clock * 0.62) * idleK;

      for (let i = 0; i < n; i++) {
        const o = i * 9;
        const acted = useA[i] || useB[i];
        let rx = 0, ry = 0, rz = 0, px = 0, py = 0, pz = 0, sx = 1, sy = 1, sz = 1;

        if (!acted && useBase[i]) {
          rx = bufBase[o]; ry = bufBase[o + 1]; rz = bufBase[o + 2];
          px = bufBase[o + 3]; py = bufBase[o + 4]; pz = bufBase[o + 5];
          sx = bufBase[o + 6]; sy = bufBase[o + 7]; sz = bufBase[o + 8];
        }
        if (useA[i]) {
          rx += bufA[o] * mix; ry += bufA[o + 1] * mix; rz += bufA[o + 2] * mix;
          px += bufA[o + 3] * mix; py += bufA[o + 4] * mix; pz += bufA[o + 5] * mix;
          sx *= 1 + (bufA[o + 6] - 1) * mix; sy *= 1 + (bufA[o + 7] - 1) * mix; sz *= 1 + (bufA[o + 8] - 1) * mix;
        }
        if (useB[i]) {
          rx += bufB[o] * im; ry += bufB[o + 1] * im; rz += bufB[o + 2] * im;
          px += bufB[o + 3] * im; py += bufB[o + 4] * im; pz += bufB[o + 5] * im;
          sx *= 1 + (bufB[o + 6] - 1) * im; sy *= 1 + (bufB[o + 7] - 1) * im; sz *= 1 + (bufB[o + 8] - 1) * im;
        }
        for (let j = 0; j < tmpList.length; j++) {
          const t = tmpList[j];
          if (t.used && t.i === i) {
            rx += t.rx; ry += t.ry; rz += t.rz;
            px += t.px; py += t.py; pz += t.pz;
            sx += t.sx; sy += t.sy; sz += t.sz;
          }
        }
        if (i === idHips) {
          py += bob * 0.007;
          rx += breath * 0.006;
        }
        if (i === idChest) {
          rx += breath * 0.013;
          sy *= 1 + breath * 0.010;
          sx *= 1 + breath * 0.006;
        }
        if (i === idHead) {
          ry += headSway * 0.040;
          rz += Math.sin(clock * 0.83 + 1.4) * 0.020 * idleK;
          rx += Math.sin(clock * 1.7 + 0.8) * 0.012 * idleK;
        }
        for (let j = 0; j < swayCount; j++) {
          if (swayIdx[j] === i) {
            const ph = swayPhase[j];
            const amp = swayAmp[j] * idleK;
            rx += Math.sin(clock * 1.55 + ph) * amp + speedK * amp * 2.6 + Math.sin(clock * 6.2 + ph) * amp * 0.55 * speedK;
            rz += Math.cos(clock * 1.2 + ph) * amp * 0.55;
            break;
          }
        }

        const b = bones[i];
        b.rotation.set(rest[o] + rx, rest[o + 1] + ry, rest[o + 2] + rz);
        b.position.set(rest[o + 3] + px, rest[o + 4] + py, rest[o + 5] + pz);
        b.scale.set(rest[o + 6] * sx, rest[o + 7] * sy, rest[o + 8] * sz);
      }
    }

    function update(dt, ctx) {
      dt = dt || 0;
      if (dt > 0.12) dt = 0.12;
      lastSpeed = ctx && ctx.speed !== undefined ? ctx.speed : lastSpeed;
      if (!(dt > 0)) { render(0); return; }
      clock += dt;
      if (!paused) {
        if (cur) {
          st.t += dt * st.speed;
          if (!st.loop && cur.dur > 0) {
            if (st.t >= cur.dur) {
              st.t = cur.dur;
              if (!st.done) { st.done = true; if (st.onDone) pendingDone = st.onDone; }
            }
          } else if (cur.dur > 0) {
            st.t = st.t % cur.dur;
          }
        }
        if (pv.name && st.fadeDur > 0) {
          st.fade += dt / st.fadeDur;
          if (st.fade >= 1) { st.fade = 1; pv.name = null; }
          pv.t += dt * pv.speed;
          if (pv.dur > 0) pv.t = pv.loop ? pv.t % pv.dur : Math.min(pv.t, pv.dur);
        }
        if (base && base.dur > 0) baseTime = (baseTime + dt) % base.dur;
      }
      render(dt);
      if (pendingDone) { const fn = pendingDone; pendingDone = null; fn(st.name); }
    }

    const anim = {
      rig, clips, play, pose, stop, addClip, setBase, update, off,
      isPlaying(name) { return st.name === name && !st.done; },
      get name() { return st.name; },
      get time() { return st.t; },
      get duration() { return cur ? cur.dur : 0; },
      get finished() { return st.done; },
      get paused() { return paused; },
      setSpeed(s) { st.speed = s; },
      setIdle(v) { idleAmp = v; },
      setPaused(v) { paused = !!v; },
      layer(fn) { layers.push(fn); return anim; },
      clipNames() { return Object.keys(clips); },
      has(name) { return !!clips[name]; }
    };
    return anim;
  };

  /* ==========================================================================
     SECTION 6 — FACE / HEAD
     ========================================================================== */
  K.head = function (o) {
    const THREE = T();
    o = o || {};
    const r = o.r || 0.16;
    const g = new THREE.Group();
    const skin = o.skinMat || K.mat.toon(o.skin || 0xf3ddc9);

    /* skull + jaw */
    g.add(mk(geo.sphere(), skin, { s: [r * 1.02, r, r * 0.99], o: o.outline === undefined ? 0.05 : o.outline }));
    g.add(mk(geo.sphere(), skin, { p: [0, -r * 0.60, r * 0.10], s: [r * 0.80, r * 0.56, r * 0.76] }));
    if (o.ears !== false) {
      for (let s = -1; s <= 1; s += 2) {
        g.add(mk(geo.sphereLo(), skin, { p: [s * r * 0.99, -r * 0.05, -r * 0.02], s: [r * 0.13, r * 0.19, r * 0.11], shadow: false }));
      }
    }

    /* huge anime eyes: curved patches hugging the skull */
    if (o.eyeTex) {
      const eyeMat = mat.eye(o.eyeTex);
      const ewA = o.eyeAngW || 0.84, ehA = o.eyeAngH || 0.98;
      const az = o.eyeAz || 0.45, el = o.eyeEl === undefined ? 0.02 : o.eyeEl;
      for (let s = -1; s <= 1; s += 2) {
        const m = new THREE.Mesh(geo.eyePatch(r * 1.014, s * az, ewA, el, ehA, 10, 12, s * (o.eyeRoll || 0)), eyeMat);
        m.userData.noOutline = true;
        m.renderOrder = 3;
        m.castShadow = false; m.receiveShadow = false;
        g.add(m);
      }
      /* lower lash hint — a soft dark rim under each eye */
      if (o.lash !== false) {
        const lm = mat.flat(o.lashColor || 0x2a1e28, { transparent: true, opacity: 0.35, depthWrite: false, side: T().DoubleSide });
        for (let s = -1; s <= 1; s += 2) {
          const m = new THREE.Mesh(geo.eyePatch(r * 1.005, s * az, ewA * 0.9, el - ehA * 0.46, 0.10, 6, 3), lm);
          m.userData.noOutline = true; m.renderOrder = 2; g.add(m);
        }
      }
    }

    /* blush discs */
    if (o.blush) {
      const bm = mat.flat(o.blush, { transparent: true, opacity: o.blushOpacity === undefined ? 0.40 : o.blushOpacity, depthWrite: false, side: T().DoubleSide });
      for (let s = -1; s <= 1; s += 2) {
        const m = new THREE.Mesh(geo.eyePatch(r * 1.008, s * (o.blushAz || 0.94), 0.40, o.blushEl === undefined ? -0.44 : o.blushEl, 0.24, 6, 6), bm);
        m.userData.noOutline = true; m.renderOrder = 2; g.add(m);
      }
    }

    /* mouth */
    if (o.mouth !== false) {
      const mm = mat.flat(o.mouthColor || 0x3a2228, {});
      const mr = o.mouthR || r * 0.14;
      const tor = new THREE.Mesh(geo.torus(mr, r * 0.018, PI * 0.86, 5, 12), mm);
      tor.rotation.z = PI * 0.07;
      tor.scale.z = 0.5;
      tor.position.set(0, o.mouthY === undefined ? -r * 0.54 : o.mouthY, r * 0.845);
      tor.userData.noOutline = true;
      g.add(tor);
    }
    K.mergeStatic(g);
    return g;
  };

  /* ==========================================================================
     SECTION 7 — HAIR
     Layered lathe shell + strand cones + extruded bang cards.
     ========================================================================== */
  K.hairBob = function (o) {
    const THREE = T();
    o = o || {};
    const r = o.r || 0.16;
    const m = o.mat || K.mat.toon(o.color || 0x171a22);
    const g = new THREE.Group();
    const len = o.len || 1.0;

    /* back mass: lathe shell hugging the skull from the back, open at the face */
    const shell = mk(geo.lathe(
      [[r * 0.55, -r * 1.02 * len], [r * 1.02, -r * 0.72 * len], [r * 1.09, -r * 0.2], [r * 1.04, r * 0.55], [r * 0.62, r * 0.95], [r * 0.20, r * 1.0], [r * 0.03, r * 1.02]],
      20, PI * 0.42, PI * 1.16, "bob")
      , K.mat.toon(o.color || 0x171a22, { side: T().DoubleSide }),
      { o: o.outline === undefined ? 0.045 : o.outline }
    );
    shell.position.set(0, r * 0.02, -r * 0.03);
    g.add(shell);

    /* back volume so the silhouette reads round from the side */
    g.add(mk(geo.sphere(), m, { p: [0, r * 0.02, -r * 0.17], s: [r * 1.06, r * 1.03, r * 0.96], recv: false }));

    /* straight bangs across the forehead */
    const nb = o.bangs === undefined ? 7 : o.bangs;
    for (let i = 0; i < nb; i++) {
      const t = nb === 1 ? 0.5 : i / (nb - 1);
      const a = (-0.98 + 1.96 * t) * (o.bangSpread || 1);
      const w = r * (0.30 - 0.10 * Math.abs(t - 0.5) * 2);
      const L = r * (o.bangLen || 0.44) * (1.0 + 0.12 * Math.sin(t * PI));
      const px = Math.sin(a) * r * 0.86, pz = Math.cos(a) * r * 0.93;
      const m2 = mk(geo.strand(w, L, 0.012, 0.15), m, { p: [px, r * 0.56, pz], r: [0.10, a, (t - 0.5) * 0.25] });
      g.add(m2);
    }
    /* side locks framing the face */
    for (let s = -1; s <= 1; s += 2) {
      const a = s * 1.22;
      g.add(mk(geo.strand(r * 0.34, r * (o.sideLen || 1.28), 0.016, 0.2), m,
        { p: [Math.sin(a) * r * 0.92, r * 0.30, Math.cos(a) * r * 0.92], r: [0.06, a, s * 0.10] }));
    }
    /* back strands spilling under the shell */
    const nk = o.back === undefined ? 5 : o.back;
    for (let i = 0; i < nk; i++) {
      const t = nk === 1 ? 0.5 : i / (nk - 1);
      const a = PI + (-0.85 + 1.7 * t);
      g.add(mk(geo.strand(r * 0.36, r * (1.05 + 0.25 * Math.sin(t * PI)) * len, 0.014, 0.25), m,
        { p: [Math.sin(a) * r * 0.78, r * 0.05, Math.cos(a) * r * 0.80], r: [0.05, a, (t - 0.5) * 0.3] }));
    }
    K.mergeStatic(g);
    return g;
  };

  /* ==========================================================================
     SECTION 8 — CLOTH
     K.panel: hinged two-segment tattered panel. Attach `group` to a cloak bone;
     send anim offsets to g.userData.tip for the secondary hinge.
     ========================================================================== */
  K.panel = function (o) {
    const THREE = T();
    const g = new THREE.Group();
    const upper = o.upper || 0.20, lower = o.lower || 0.20;
    const w = o.w || 0.24, thick = o.thick || 0.02;
    const m = o.mat;
    const oc = o.outline === undefined ? 0.05 : o.outline;

    g.add(mk(geo.tatter(w, upper, 0, thick, 2, o.flare || 1.04), m, { o: oc }));
    const tip = new THREE.Group();
    tip.position.set(0, -upper, 0);
    tip.rotation.x = o.bend || 0;
    tip.add(mk(geo.tatter(w * (o.flare2 || 1.1), lower, o.jag === undefined ? 0.05 : o.jag, thick * 0.9, o.points || 4), m, { o: oc }));
    g.add(tip);
    g.userData.tip = tip;
    return g;
  };

  /* ==========================================================================
     SECTION 9 — SMALL PROPS
     ========================================================================== */
  K.skull = function (size, o) {
    const THREE = T();
    o = o || {};
    const s = size || 0.05;
    const g = new THREE.Group();
    const boneM = o.mat || K.mat.toon(PAL.bone);
    const darkM = K.mat.toon(0x16181c);
    g.add(mk(geo.sphere(), boneM, { s: [s, s * 0.95, s * 0.94], o: s > 0.05 ? 0.06 : 0 }));
    g.add(mk(geo.sphere(), boneM, { p: [0, -s * 0.62, s * 0.18], s: [s * 0.66, s * 0.44, s * 0.66] }));
    for (let k = -1; k <= 1; k += 2) {
      g.add(mk(geo.sphereLo(), darkM, { p: [k * s * 0.36, s * 0.04, s * 0.64], s: [s * 0.27, s * 0.31, s * 0.20], shadow: false }));
    }
    if (!o.simple) {
      g.add(mk(geo.cone6(), darkM, { p: [0, -s * 0.24, s * 0.72], r: [PI, 0, 0], s: [s * 0.13, s * 0.20, s * 0.09], shadow: false }));
      for (let i = -1; i <= 1; i++) {
        g.add(mk(geo.box(), boneM, { p: [i * s * 0.24, -s * 0.66, s * 0.60], s: [s * 0.13, s * 0.16, s * 0.07], shadow: false }));
      }
    }
    return g;
  };

  K.crystal = function (size, color, o) {
    const THREE = T();
    o = o || {};
    const g = new THREE.Group();
    const s = size || 0.04;
    const m = K.mat.toon(color || PAL.pinkGlow, { emissive: color || PAL.pinkGlow, emissiveIntensity: 0.55, transparent: true, opacity: 0.92 });
    g.add(mk(geo.octa(), m, { s: [s * 0.9, s * 2.4, s * 0.9], r: [o.rx || 0.15, o.ry || 0, o.rz || 0.1] }));
    const gl = new THREE.Mesh(geo.sphereLo(), mat.additive(color || PAL.pinkGlow, 0.28));
    gl.scale.setScalar(s * 3.2);
    gl.userData.noOutline = true;
    g.add(gl);
    return g;
  };

  K.glowDisc = function (r, color, opacity) {
    const THREE = T();
    const m = new THREE.Mesh(geo.circle(), mat.additive(color, opacity === undefined ? 0.9 : opacity));
    m.scale.setScalar(r);
    m.userData.noOutline = true;
    m.castShadow = false; m.receiveShadow = false;
    return m;
  };

  K.cord = function (len, thick, color) {
    return mk(geo.cyl(thick, thick, len, 5), K.mat.toon(color === undefined ? 0x2a2420 : color), { p: [0, -len / 2, 0], shadow: false });
  };

  /* ==========================================================================
     SECTION 10 — SHARED ANIMATION LIBRARY
     Generic snap helpers so every character's clips share timing DNA:
     anticipation -> smear -> recovery.
     ========================================================================== */
  K.TIMING = {
    light: { wind: 0.13, hit: 0.07, rec: 0.20 },
    heavy: { wind: 0.34, hit: 0.09, rec: 0.34 },
    cast: { wind: 0.28, hit: 0.10, rec: 0.36 }
  };

  K.kf = function (t, bone, rot, pos, scl, ease) {
    return { t: t, bone: bone, rot: rot, pos: pos, scl: scl, ease: ease };
  };

  /* quick uniform idle generator: subtle weight shift, used as each
     character's base clip under actions */
  K.idleClip = function (anim, o) {
    o = o || {};
    const L = o.dur || 2.6;
    const keys = [
      { t: 0, bone: "chest", rot: [0, 0, 0] },
      { t: L * 0.5, bone: "chest", rot: [o.breath || 0.015, 0, 0.008] },
      { t: L, bone: "chest", rot: [0, 0, 0] },
      { t: 0, bone: "head", rot: [0, 0, 0] },
      { t: L * 0.33, bone: "head", rot: [0.01, o.headTurn || 0.05, 0] },
      { t: L * 0.72, bone: "head", rot: [-0.01, -(o.headTurn || 0.05), 0] },
      { t: L, bone: "head", rot: [0, 0, 0] }
    ];
    anim.addClip(o.name || "idle", keys, { loop: true });
    return keys;
  };

  K.debugStats = function (rig) {
    return { meshes: rig.countMeshes ? rig.countMeshes() : 0, bones: Object.keys(rig.bones).length };
  };
})();
