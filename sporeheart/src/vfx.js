/* SPOREHEART — vfx.js : pooled particle systems, ribbon trails, shock rings, portals, shake, slow-mo
   Agent D (action layer). Classic script; attaches G.vfx. No THREE usage at parse time.

   API
     G.vfx.init(scene)
     G.vfx.update(dt, camera)
     G.vfx.burst(pos, {count,color,speed,size,life,gravity,spread,tex})
     G.vfx.slashTrail(points[], color)
     G.vfx.ringShockwave(pos, color[, radius])
     G.vfx.telegraph(pos, radius, color, dur) -> {mesh,kill}
     G.vfx.petals(pos)
     G.vfx.portal(pos, color[, opts]) -> {group,kill}
     G.vfx.shake(amt) / G.vfx.getShakeOffset(dt, outVec3)
     G.vfx.slowmo(scale, dur) / G.vfx.flash(color, opacity)
     G.vfx.hitSpark(pos) / G.vfx.soulWisps(pos) / G.vfx.reset()

   PERF: particles are ONE THREE.Points per texture type with preallocated buffers, densely packed
   and compacted in place each frame (no allocations in update). Rings / ribbons / portals / sprites
   all come from fixed pools. Nothing here does per-frame canvas work. */
(function () {
  "use strict";
  const G = window.G;
  if (!G) return;
  const V = (G.vfx = {});
  const TAU = Math.PI * 2;

  function rnd(a, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------------- value readers (safe with stubs / plain objects) ---------------- */
  const COL = { r: 1, g: 1, b: 1 };
  function readColor(c, out) {
    out = out || COL;
    if (typeof c === "number") {
      out.r = ((c >> 16) & 255) / 255;
      out.g = ((c >> 8) & 255) / 255;
      out.b = (c & 255) / 255;
    } else if (c && typeof c === "object") {
      if (typeof c.r === "number" && typeof c.g === "number") { out.r = c.r; out.g = c.g; out.b = c.b; }
      else if (typeof c.x === "number" && typeof c.y === "number") { out.r = c.x; out.g = c.y; out.b = c.z; }
      else { out.r = out.g = out.b = 1; }
    } else { out.r = out.g = out.b = 1; }
    return out;
  }
  const POS = { x: 0, y: 0, z: 0 };
  function readPos(p, out) {
    out = out || POS;
    if (!p) { out.x = out.y = out.z = 0; return out; }
    const x = p.x, y = p.y, z = p.z;
    out.x = typeof x === "number" && isFinite(x) ? x : 0;
    out.y = typeof y === "number" && isFinite(y) ? y : 0;
    out.z = typeof z === "number" && isFinite(z) ? z : 0;
    return out;
  }
  function hexStr(c) {
    if (typeof c === "number") return "#" + (c >>> 0).toString(16).padStart(6, "0");
    const cc = readColor(c, { r: 1, g: 1, b: 1 });
    const h = (n) => Math.round(clamp(n, 0, 1) * 255).toString(16).padStart(2, "0");
    return "#" + h(cc.r) + h(cc.g) + h(cc.b);
  }

  /* ---------------- scene ---------------- */
  let sceneRef = null;
  let inited = false;
  const systems = Object.create(null);

  function addToScene(obj) {
    if (sceneRef && typeof sceneRef.add === "function") { sceneRef.add(obj); return true; }
    return false;
  }
  function removeFromScene(obj) {
    if (sceneRef && typeof sceneRef.remove === "function") sceneRef.remove(obj);
  }

  function texOf(name) {
    const A = G.assets;
    if (!A || !A.tex) return null;
    const f = A.tex[name];
    if (typeof f === "function") { try { return f(); } catch (e) { return null; } }
    return f || null;
  }

  /* ================================================================
     PARTICLE SYSTEMS  (one THREE.Points per texture type)
     ================================================================ */
  const PARTICLE_VERT = `
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aAlpha;
    uniform float uScale;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vColor = aColor;
      vAlpha = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = max(1.0, aSize * (uScale / max(0.001, -mv.z)));
      gl_Position = projectionMatrix * mv;
    }`;
  const PARTICLE_FRAG = `
    uniform sampler2D uMap;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec4 tex = texture2D(uMap, gl_PointCoord);
      gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
    }`;

  const SYSTEM_SPEC = {
    glow: { tex: "glowdot", additive: true, max: 560 },
    petal: { tex: "petal", additive: false, max: 240 },
    slash: { tex: "slash", additive: true, max: 220 },
    ring: { tex: "ring", additive: true, max: 160 }
  };

  function createSystem(key) {
    const THREE = G.THREE;
    const spec = SYSTEM_SPEC[key];
    if (!THREE || !spec) return null;
    const tex = texOf(spec.tex);
    if (!tex) return null;
    const max = spec.max;
    const pos = new Float32Array(max * 3);
    const col = new Float32Array(max * 3);
    const siz = new Float32Array(max);
    const alp = new Float32Array(max);
    const vel = new Float32Array(max * 3);
    const life = new Float32Array(max);
    const maxLife = new Float32Array(max);
    const grav = new Float32Array(max);
    const drag = new Float32Array(max);
    const base = new Float32Array(max);
    const phase = new Float32Array(max);
    const wob = new Float32Array(max);

    const geo = new THREE.BufferGeometry();
    const aPos = new THREE.BufferAttribute(pos, 3);
    const aCol = new THREE.BufferAttribute(col, 3);
    const aSiz = new THREE.BufferAttribute(siz, 1);
    const aAlp = new THREE.BufferAttribute(alp, 1);
    if (aPos.setUsage && THREE.DynamicDrawUsage) aPos.setUsage(THREE.DynamicDrawUsage);
    if (aCol.setUsage && THREE.DynamicDrawUsage) aCol.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", aPos);
    geo.setAttribute("aColor", aCol);
    geo.setAttribute("aSize", aSiz);
    geo.setAttribute("aAlpha", aAlp);
    geo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uScale: { value: 300 } },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: spec.additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = spec.additive ? 8 : 7;
    addToScene(points);

    return {
      key, geo, mat, points, max, count: 0, cursor: 0,
      pos, col, siz, alp, vel, life, maxLife, grav, drag, base, phase, wob,
      aPos, aCol, aSiz, aAlp
    };
  }

  function getSystem(key) {
    if (systems[key] !== undefined) return systems[key];
    systems[key] = createSystem(key);
    return systems[key];
  }

  function emitParticles(sys, p, o) {
    if (!sys) return;
    o = o || {};
    const count = Math.max(1, (o.count | 0) || 1);
    readColor(o.color === undefined ? 0xffd9ea : o.color, COL);
    const speed = o.speed === undefined ? 4 : o.speed;
    const size = o.size === undefined ? 0.32 : o.size;
    const lifeT = o.life === undefined ? 0.5 : o.life;
    const gravity = o.gravity === undefined ? -2.5 : o.gravity;
    const spread = o.spread === undefined ? 1 : o.spread;
    const dragV = o.drag === undefined ? 1.4 : o.drag;
    const sizeJit = o.sizeJitter === undefined ? 0.45 : o.sizeJitter;
    const spawnR = o.spawnRadius === undefined ? 0.14 : o.spawnRadius;

    let dx = 0, dy = 1, dz = 0, hasDir = false;
    if (o.dir) {
      readPos(o.dir, POS);
      const l = Math.hypot(POS.x, POS.y, POS.z) || 1;
      dx = POS.x / l; dy = POS.y / l; dz = POS.z / l;
      if (l > 0.0001) hasDir = true;
    }

    for (let n = 0; n < count; n++) {
      let i;
      if (sys.count < sys.max) { i = sys.count++; }
      else { sys.cursor = (sys.cursor + 1) % sys.max; i = sys.cursor; }
      const i3 = i * 3;

      sys.pos[i3] = p.x + rnd(-spawnR, spawnR);
      sys.pos[i3 + 1] = p.y + rnd(-spawnR, spawnR);
      sys.pos[i3 + 2] = p.z + rnd(-spawnR, spawnR);

      // random unit-ish direction, biased along o.dir
      let rx = rnd(-1, 1), ry = rnd(-1, 1), rz = rnd(-1, 1);
      const rl = Math.hypot(rx, ry, rz) || 1;
      rx /= rl; ry /= rl; rz /= rl;
      const sp = speed * rnd(0.55, 1.2);
      if (hasDir) {
        sys.vel[i3] = (dx * 0.75 + rx * spread * 0.6) * sp;
        sys.vel[i3 + 1] = (dy * 0.75 + ry * spread * 0.6) * sp;
        sys.vel[i3 + 2] = (dz * 0.75 + rz * spread * 0.6) * sp;
      } else {
        sys.vel[i3] = rx * sp * spread;
        sys.vel[i3 + 1] = (ry * 0.6 + 0.35) * sp * spread;
        sys.vel[i3 + 2] = rz * sp * spread;
      }

      sys.col[i3] = COL.r;
      sys.col[i3 + 1] = COL.g;
      sys.col[i3 + 2] = COL.b;

      const sz = size * (1 + rnd(-sizeJit, sizeJit));
      sys.siz[i] = Math.max(0.01, sz);
      sys.base[i] = sys.siz[i];
      sys.alp[i] = 1;
      sys.maxLife[i] = Math.max(0.05, lifeT * rnd(0.75, 1.3));
      sys.life[i] = sys.maxLife[i];
      sys.grav[i] = gravity;
      sys.drag[i] = dragV;
      sys.phase[i] = rnd(0, TAU);
      sys.wob[i] = o.wobble === undefined ? rnd(0, 0.4) : o.wobble;
    }
    sys.aCol.needsUpdate = true;
  }

  function updateSystem(sys, dt) {
    if (!sys || sys.count === 0) return;
    const pos = sys.pos, vel = sys.vel, life = sys.life, ml = sys.maxLife;
    const siz = sys.siz, base = sys.base, alp = sys.alp, grav = sys.grav, drag = sys.drag;
    const phase = sys.phase, wob = sys.wob;
    let i = 0;
    while (i < sys.count) {
      life[i] -= dt;
      if (life[i] <= 0) {
        const last = --sys.count;
        if (i !== last) {
          const a = i * 3, b = last * 3;
          pos[a] = pos[b]; pos[a + 1] = pos[b + 1]; pos[a + 2] = pos[b + 2];
          vel[a] = vel[b]; vel[a + 1] = vel[b + 1]; vel[a + 2] = vel[b + 2];
          siz[i] = siz[last]; base[i] = base[last]; alp[i] = alp[last];
          life[i] = life[last]; ml[i] = ml[last]; grav[i] = grav[last];
          drag[i] = drag[last]; phase[i] = phase[last]; wob[i] = wob[last];
        }
        continue; // re-test index i (now swapped in)
      }
      const i3 = i * 3;
      const k = life[i] / ml[i];
      // integrate
      const dr = 1 - Math.min(0.9, drag[i] * dt);
      vel[i3] *= dr;
      vel[i3 + 2] *= dr;
      vel[i3 + 1] = vel[i3 + 1] * dr + grav[i] * dt;
      pos[i3] += vel[i3] * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt;
      if (wob[i] > 0) {
        const s = Math.sin(phase[i] + life[i] * 5.0) * wob[i] * dt;
        pos[i3] += s;
        pos[i3 + 2] += Math.cos(phase[i] + life[i] * 4.0) * wob[i] * dt;
      }
      // fade curve: quick pop in, long fade out
      const pop = Math.min(1, (ml[i] - life[i]) * 14);
      alp[i] = pop * Math.pow(k, 0.65);
      siz[i] = base[i] * (0.55 + 0.45 * k);
      i++;
    }
    sys.geo.setDrawRange(0, sys.count);
    sys.aPos.needsUpdate = true;
    sys.aSiz.needsUpdate = true;
    sys.aAlp.needsUpdate = true;
  }

  /* ================================================================
     RIBBON SLASH TRAILS
     ================================================================ */
  const ribbons = [];
  const RIBBON_PTS = 14;

  function createRibbon() {
    const THREE = G.THREE;
    if (!THREE) return null;
    const pos = new Float32Array(RIBBON_PTS * 2 * 3);
    const col = new Float32Array(RIBBON_PTS * 2 * 3);
    const idx = [];
    for (let i = 0; i < RIBBON_PTS - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    const aPos = new THREE.BufferAttribute(pos, 3);
    const aCol = new THREE.BufferAttribute(col, 3);
    geo.setAttribute("position", aPos);
    geo.setAttribute("color", aCol);
    geo.setIndex(idx);
    geo.setDrawRange(0, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, vertexColors: true, transparent: true, opacity: 1,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 9;
    addToScene(mesh);
    return { geo, aPos, aCol, mat, mesh, active: false, life: 0, maxLife: 0 };
  }

  function getRibbon() {
    for (let i = 0; i < ribbons.length; i++) if (!ribbons[i].active) return ribbons[i];
    const r = createRibbon();
    if (r) ribbons.push(r);
    return r;
  }

  V.slashTrail = function (points, color) {
    if (!points || points.length < 2) return;
    const THREE = G.THREE;
    if (!THREE) return;
    const r = getRibbon();
    if (!r) return;
    const n = Math.min(points.length, RIBBON_PTS);
    readColor(color === undefined ? 0xffc2dd : color, COL);
    const width = 0.30;
    const pos = r.geo.attributes.position.array; // our own Float32Array (same ref at runtime)
    const colArr = r.geo.attributes.color.array;
    const P0 = { x: 0, y: 0, z: 0 }, P1 = { x: 0, y: 0, z: 0 }, PN = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < n; i++) {
      readPos(points[i], P0);
      // tangent
      const ia = Math.max(0, i - 1), ib = Math.min(n - 1, i + 1);
      readPos(points[ia], P1); readPos(points[ib], PN);
      let tx = PN.x - P1.x, ty = PN.y - P1.y, tz = PN.z - P1.z;
      // perpendicular in horizontal plane: cross(tangent, up)
      let px = tz, py = 0, pz = -tx;
      const pl = Math.hypot(px, py, pz) || 1;
      px /= pl; py /= pl; pz /= pl;
      const taper = Math.sin(Math.PI * (i / Math.max(1, n - 1)));
      const w = width * (0.25 + 0.75 * taper) * 0.5;
      const b = i * 6;
      pos[b] = P0.x + px * w; pos[b + 1] = P0.y + py * w; pos[b + 2] = P0.z + pz * w;
      pos[b + 3] = P0.x - px * w; pos[b + 4] = P0.y - py * w; pos[b + 5] = P0.z - pz * w;
      // additive vertex fade: bright head, dark tail (dark == invisible when added)
      const head = 0.35 + 0.65 * (i / Math.max(1, n - 1));
      const fade = taper * head;
      for (let k = 0; k < 2; k++) {
        const c = b + k * 3;
        colArr[c] = COL.r * fade;
        colArr[c + 1] = COL.g * fade;
        colArr[c + 2] = COL.b * fade;
      }
    }
    // collapse unused points onto last
    readPos(points[n - 1], P0);
    for (let i = n; i < RIBBON_PTS; i++) {
      const b = i * 6;
      for (let k = 0; k < 6; k += 3) {
        pos[b + k] = P0.x; pos[b + k + 1] = P0.y; pos[b + k + 2] = P0.z;
        colArr[b + k] = 0; colArr[b + k + 1] = 0; colArr[b + k + 2] = 0;
      }
    }
    r.aPos.needsUpdate = true;
    r.aCol.needsUpdate = true;
    r.geo.setDrawRange(0, (n - 1) * 6);
    r.maxLife = 0.22;
    r.life = r.maxLife;
    r.active = true;
    r.mesh.visible = true;
    r.mat.opacity = 1;
  };

  function updateRibbons(dt) {
    for (let i = 0; i < ribbons.length; i++) {
      const r = ribbons[i];
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) { r.active = false; r.mesh.visible = false; continue; }
      const k = r.life / r.maxLife;
      r.mat.opacity = k * k;
    }
  }

  /* ================================================================
     EXPANDING GROUND RINGS
     ================================================================ */
  const rings = [];
  let ringGeo = null;
  function getRingGeo() {
    const THREE = G.THREE;
    if (!ringGeo && THREE) ringGeo = new THREE.RingGeometry(0.86, 1, 44);
    return ringGeo;
  }
  function createRing() {
    const THREE = G.THREE;
    const geo = getRingGeo();
    if (!THREE || !geo) return null;
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    mesh.renderOrder = 6;
    addToScene(mesh);
    return { mesh, mat, active: false, life: 0, maxLife: 0.6, r0: 0.3, r1: 3, y: 0.03, x: 0, z: 0 };
  }
  function getRing() {
    for (let i = 0; i < rings.length; i++) if (!rings[i].active) return rings[i];
    const r = createRing();
    if (r) rings.push(r);
    return r;
  }

  let groundAt = function (x, z) {
    if (G.world && typeof G.world.heightAt === "function") {
      const h = G.world.heightAt(x, z);
      if (typeof h === "number" && isFinite(h)) return h;
    }
    return 0;
  };

  V.ringShockwave = function (pos, color, radius) {
    const r = getRing();
    if (!r) return null;
    readPos(pos, POS);
    readColor(color === undefined ? 0xffb3d4 : color, COL);
    r.x = POS.x; r.z = POS.z;
    r.y = (POS.y && POS.y !== 0 ? POS.y : groundAt(POS.x, POS.z)) + 0.035;
    r.r0 = Math.max(0.15, (radius || 3) * 0.18);
    r.r1 = radius || 3;
    r.maxLife = 0.55 + r.r1 * 0.035;
    r.life = r.maxLife;
    r.active = true;
    r.mesh.visible = true;
    r.mesh.position.set(r.x, r.y, r.z);
    r.mesh.scale.set(r.r0, r.r0, r.r0);
    r.mat.color.setRGB(COL.r, COL.g, COL.b);
    r.mat.opacity = 0.95;
    return r;
  };

  function updateRings(dt) {
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) { r.active = false; r.mesh.visible = false; continue; }
      const k = 1 - r.life / r.maxLife;          // 0 -> 1
      const e = 1 - Math.pow(1 - k, 3);          // outCubic
      const rad = r.r0 + (r.r1 - r.r0) * e;
      r.mesh.scale.set(rad, rad, rad);
      r.mesh.position.y = r.y + k * 0.12;
      r.mat.opacity = Math.pow(1 - k, 1.5) * 0.85;
    }
  }

  /* ================================================================
     PORTALS (companion call-in swirl)
     ================================================================ */
  const portals = [];
  function createPortal() {
    const THREE = G.THREE;
    if (!THREE) return null;
    const group = new THREE.Group();
    const glowTex = texOf("glowdot");
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff9ec4, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xfff0f6, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 8, 36), ringMat);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 6, 28), ringMat);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.68, 28), discMat);
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTex, color: 0xff9ec4, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const glow = new THREE.Sprite(spriteMat);
    glow.scale.setScalar(2.6);
    group.add(torus); group.add(inner); group.add(disc); group.add(glow);
    group.visible = false;
    addToScene(group);
    return { group, torus, inner, disc, glow, ringMat, discMat, spriteMat, active: false, life: 0, maxLife: 1.4 };
  }
  function getPortal() {
    for (let i = 0; i < portals.length; i++) if (!portals[i].active) return portals[i];
    const p = createPortal();
    if (p) portals.push(p);
    return p;
  }

  V.portal = function (pos, color, opts) {
    const p = getPortal();
    if (!p) return null;
    readPos(pos, POS);
    readColor(color === undefined ? 0xff9ec4 : color, COL);
    p.group.position.set(POS.x, POS.y + 1.15, POS.z);
    p.group.rotation.set(0, (opts && typeof opts.face === "number") ? opts.face : 0, 0);
    p.ringMat.color.setRGB(COL.r, COL.g, COL.b);
    p.spriteMat.color.setRGB(COL.r, COL.g, COL.b);
    p.group.scale.setScalar(0.05);
    p.group.visible = true;
    p.active = true;
    p.maxLife = (opts && opts.life) || 1.4;
    p.life = p.maxLife;
    // immediate opening pop
    V.burst({ x: POS.x, y: POS.y + 0.6, z: POS.z }, {
      count: 18, color: color === undefined ? 0xff9ec4 : color, speed: 5.5,
      size: 0.34, life: 0.5, gravity: 0.6, spread: 1, tex: "glow"
    });
    return p;
  };

  function updatePortals(dt) {
    for (let i = 0; i < portals.length; i++) {
      const p = portals[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; p.group.visible = false; continue; }
      const age = p.maxLife - p.life;
      const open = Math.min(1, age / 0.28);
      const close = Math.min(1, p.life / 0.4);
      const s = (open < 1 ? G.util.ease(open, "outBack") : 1) * (0.85 + 0.15 * Math.sin(age * 9)) * close;
      p.group.scale.setScalar(Math.max(0.02, s));
      p.torus.rotation.z += dt * 2.2;
      p.inner.rotation.z -= dt * 3.7;
      p.disc.rotation.z += dt * 1.1;
      p.ringMat.opacity = 0.9 * close;
      p.discMat.opacity = (0.25 + 0.12 * Math.sin(age * 12)) * close;
      p.spriteMat.opacity = 0.75 * close;
      p.glow.scale.setScalar(2.4 + 0.35 * Math.sin(age * 8));
    }
  }

  /* ================================================================
     TELEGRAPHS (assets.ringTelegraph wrapper w/ auto-fade)
     ================================================================ */
  const telegraphs = [];
  V.telegraph = function (pos, radius, color, dur) {
    const THREE = G.THREE;
    const A = G.assets;
    if (!THREE) return null;
    let mesh = null;
    if (A && typeof A.ringTelegraph === "function") {
      try { mesh = A.ringTelegraph(Math.max(0.1, radius || 1), color === undefined ? 0xff5040 : color); } catch (e) { mesh = null; }
    }
    if (!mesh) {
      mesh = new THREE.Mesh(new THREE.RingGeometry((radius || 1) * 0.9, radius || 1, 40),
        new THREE.MeshBasicMaterial({ color: color === undefined ? 0xff5040 : color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      mesh.rotation.x = -Math.PI / 2;
    }
    readPos(pos, POS);
    const y = (POS.y && POS.y !== 0) ? POS.y : groundAt(POS.x, POS.z);
    mesh.position.set(POS.x, y + 0.04, POS.z);
    if (mesh.userData) mesh.userData.noOutline = true;
    addToScene(mesh);
    const rec = { mesh, t: 0, dur: Math.max(0.2, dur || 1.0), alive: true };
    telegraphs.push(rec);
    if (mesh.material) mesh.material.opacity = 0;
    rec.kill = function () {
      rec.alive = false;
      removeFromScene(mesh);
      if (mesh.material && typeof mesh.material.dispose === "function") mesh.material.dispose();
      if (mesh.geometry && typeof mesh.geometry.dispose === "function") mesh.geometry.dispose();
      const idx = telegraphs.indexOf(rec);
      if (idx >= 0) telegraphs.splice(idx, 1);
    };
    return rec;
  };

  function updateTelegraphs(dt) {
    for (let i = telegraphs.length - 1; i >= 0; i--) {
      const t = telegraphs[i];
      if (!t.alive) continue;
      t.t += dt;
      const k = t.t / t.dur;
      let op = 0.85;
      if (k < 0.12) op = 0.85 * (k / 0.12);
      else if (k > 0.75) op = 0.85 * (1 - (k - 0.75) / 0.25);
      if (t.mesh.material) t.mesh.material.opacity = Math.max(0, op);
      if (k >= 1) t.kill();
    }
  }

  /* ================================================================
     SHAKE / TIME / FLASH
     ================================================================ */
  V.trauma = 0;
  V.timeScale = 1;
  V._slowT = 0;
  V._slowTarget = 1;
  V._shakeT = 0;

  V.shake = function (amt) {
    V.trauma = clamp(V.trauma + (typeof amt === "number" ? amt : 0.2), 0, 1);
  };

  V.getShakeOffset = function (dt, out) {
    // decay lives in update() so reading the offset never double-drains trauma
    const s = V.trauma * V.trauma;
    const t = V._shakeT;
    const x = (Math.sin(t * 41.3) + Math.sin(t * 97.7) * 0.5) * 0.26 * s;
    const y = (Math.sin(t * 58.9) + Math.sin(t * 131.3) * 0.5) * 0.20 * s;
    const z = (Math.sin(t * 33.1) + Math.sin(t * 77.3) * 0.5) * 0.18 * s;
    if (out && typeof out.set === "function") out.set(x, y, z);
    else if (out) { out.x = x; out.y = y; out.z = z; }
    return out;
  };

  V.slowmo = function (scale, dur) {
    V._slowTarget = typeof scale === "number" ? clamp(scale, 0.05, 1) : 0.4;
    V._slowT = Math.max(0.05, dur || 0.6);
    V.timeScale = V._slowTarget;
    G.timeScale = V.timeScale;
  };

  V.flash = function (color, opacity) {
    G.bus.emit("vfx:flash", {
      color: color === undefined ? 0xffffff : color,
      opacity: opacity === undefined ? 0.3 : opacity
    });
  };

  /* ================================================================
     PRESET EFFECTS
     ================================================================ */
  V.burst = function (pos, opts) {
    const o = opts || {};
    readPos(pos, POS);
    let key = o.tex || "glow";
    if (!SYSTEM_SPEC[key]) key = "glow";
    emitParticles(getSystem(key), POS, o);
  };

  V.hitSpark = function (pos) {
    readPos(pos, POS);
    emitParticles(getSystem("glow"), POS, {
      count: 12, color: 0xfff2c8, speed: 7.5, size: 0.26, life: 0.26,
      gravity: -7, spread: 1, drag: 3.2, tex: "glow"
    });
    emitParticles(getSystem("slash"), POS, {
      count: 5, color: 0xffb347, speed: 4.5, size: 0.5, life: 0.17,
      gravity: 0, spread: 1, drag: 5, tex: "slash"
    });
  };

  V.petals = function (pos) {
    readPos(pos, POS);
    emitParticles(getSystem("petal"), POS, {
      count: 20, color: 0xe8433a, speed: 3.0, size: 0.30, life: 1.7,
      gravity: -1.1, spread: 1, drag: 1.1, wobble: 0.9, tex: "petal", spawnRadius: 0.3
    });
    emitParticles(getSystem("petal"), POS, {
      count: 8, color: 0xff9ec4, speed: 1.6, size: 0.22, life: 1.3,
      gravity: -0.6, spread: 1, drag: 1.4, wobble: 0.6, tex: "petal", spawnRadius: 0.2
    });
  };

  V.soulWisps = function (pos) {
    readPos(pos, POS);
    emitParticles(getSystem("glow"), { x: POS.x, y: POS.y + 0.7, z: POS.z }, {
      count: 16, color: 0x9fe8ff, speed: 2.1, size: 0.30, life: 1.7,
      gravity: 0.55, spread: 0.8, drag: 0.7, wobble: 1.3, tex: "glow", spawnRadius: 0.35
    });
    emitParticles(getSystem("glow"), { x: POS.x, y: POS.y + 0.5, z: POS.z }, {
      count: 7, color: 0xff9ec4, speed: 1.4, size: 0.36, life: 1.2,
      gravity: 0.35, spread: 0.7, drag: 0.9, wobble: 0.9, tex: "glow", spawnRadius: 0.3
    });
  };

  /* ---------------- ambient world motes ---------------- */
  let ambientT = 0;
  V.ambient = function (dt, center) {
    ambientT -= dt;
    if (ambientT > 0) return;
    ambientT = 0.11;
    readPos(center, POS);
    emitParticles(getSystem("glow"), {
      x: POS.x + rnd(-9, 9), y: POS.y + rnd(0.3, 3.4), z: POS.z + rnd(-9, 9)
    }, {
      count: 1, color: 0xbfe3d2, speed: 0.25, size: rnd(0.10, 0.20), life: rnd(2.4, 4.2),
      gravity: 0.05, spread: 0.6, drag: 0.2, wobble: 0.6, tex: "glow", spawnRadius: 0.2
    });
  };

  /* ================================================================
     BUS HOOKS
     ================================================================ */
  function onHit(d) {
    if (!d) return;
    const p = d.pos || (d.target && d.target.object3D && d.target.object3D.position);
    if (p) V.hitSpark(p);
  }
  function onKill(d) {
    const p = d && (d.pos || (d.target && d.target.object3D && d.target.object3D.position));
    if (p) V.soulWisps(p);
  }
  function onBreak(d) {
    if (!d || !d.pos) return;
    readPos(d.pos, POS);
    const warm = d.scheme === "stone" ? 0xb8b0a0 : d.scheme === "shroom" ? 0xffb0c8 : 0xa8763f;
    emitParticles(getSystem("glow"), POS, {
      count: 22, color: warm, speed: 6, size: 0.34, life: 0.7,
      gravity: -9, spread: 1, drag: 2.2, tex: "glow", spawnRadius: 0.3
    });
    V.ringShockwave(POS, warm, 1.8);
  }
  function onPetal(d) {
    V.petals((d && d.pos) || { x: 0, y: 1, z: 0 });
  }

  /* ================================================================
     LIFECYCLE
     ================================================================ */
  V.init = function (scene) {
    sceneRef = scene || null;
    if (inited) return;
    inited = true;
    V.timeScale = 1;
    V._slowT = 0;
    V._slowTarget = 1;
    V.trauma = 0;
    V._shakeT = 0;
    G.timeScale = 1;
    // warm the two systems used every combat frame
    getSystem("glow");
    getSystem("petal");
    G.bus.on("hit", onHit);
    G.bus.on("kill", onKill);
    G.bus.on("breakable:burst", onBreak);
    G.bus.on("petalBurst", onPetal);
  };

  V.reset = function () {
    for (const k in systems) {
      const s = systems[k];
      if (!s) continue;
      s.count = 0;
      s.geo.setDrawRange(0, 0);
    }
    for (let i = 0; i < ribbons.length; i++) { ribbons[i].active = false; ribbons[i].mesh.visible = false; }
    for (let i = 0; i < rings.length; i++) { rings[i].active = false; rings[i].mesh.visible = false; }
    for (let i = 0; i < portals.length; i++) { portals[i].active = false; portals[i].group.visible = false; }
    for (let i = telegraphs.length - 1; i >= 0; i--) telegraphs[i].kill();
    V.trauma = 0;
    V.timeScale = 1;
    V._slowT = 0;
    V._slowTarget = 1;
    G.timeScale = 1;
  };

  V.update = function (dt, camera) {
    dt = typeof dt === "number" && dt > 0 ? Math.min(dt, 0.05) : 0;
    for (const k in systems) updateSystem(systems[k], dt);
    updateRibbons(dt);
    updateRings(dt);
    updatePortals(dt);
    updateTelegraphs(dt);

    V.trauma = Math.max(0, V.trauma - dt * 1.7);
    V._shakeT += dt;

    // slow-mo hold then smooth recovery
    if (V._slowT > 0) {
      V._slowT -= dt;
      if (V._slowT <= 0) V._slowTarget = 1;
    }
    if (Math.abs(V.timeScale - V._slowTarget) > 0.002) {
      V.timeScale = G.util.damp(V.timeScale, V._slowTarget, 9, dt || 0.016);
    } else {
      V.timeScale = V._slowTarget;
    }
    G.timeScale = V.timeScale;
  };

  V.stats = function () {
    let live = 0;
    for (const k in systems) if (systems[k]) live += systems[k].count;
    return { particles: live, ribbons: ribbons.length, rings: rings.length, portals: portals.length };
  };
})();
