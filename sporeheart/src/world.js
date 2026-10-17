/* SPOREHEART — world.js : Morel Hollow (hub) + Rotheart boss arena.
   Agent C owns this file. Classic-script IIFE attaching G.world.

   Provides: init/update, heightAt, colliders, breakables, gate, arena mood lerp,
   sky dome, lighting rig, village props, Rotheart cavern.
   Rules honoured: no THREE at parse time, no allocations in update(), shared geoms,
   InstancedMesh for vegetation, toon shading + inverted-hull outlines on hero props. */
(function () {
  "use strict";
  const G = window.G;
  const W = (G.world = G.world || {});
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const T = function () { return G.THREE; };
  const A = function () { return G.assets; };
  const U = G.util;

  /* =====================================================================
     PUBLIC CONTRACT (read by player / combat / game / vfx)
     ===================================================================== */
  W.colliders = [];             // static circles {x,z,r,y0,y1}
  W.breakables = [];            // breakable records (also returned by registerBreakable)
  W.geysers = [];               // arena telegraph anchors {x,z,r}
  W.plazaCenter = { x: 0, z: 0 };
  W.gatePos = { x: 0, z: -40 };
  W.arenaCenter = { x: 0, z: -80 };
  W.arenaRadius = 22;
  W.hubRadius = 52;
  W.bounds = { x: 0, z: 0, r: 50 };     // hard movement bound (player clamps to r-1)
  W.platforms = [];             // landable circles {x,z,r,top,alive}  (mushroom caps…)
  W.bouncers = [];              // launch pads {x,y,z,r,power}
  W.hookPoints = [];            // warp anchors {x,y,z}
  W.inArena = false;

  /* =====================================================================
     INTERNAL STATE
     ===================================================================== */
  const S = {
    built: false, scene: null, root: null, hub: null, arena: null, sky: null,
    mats: {}, geoms: {}, tex: {},
    sway: [],        // giant caps that breathe
    smoke: [],       // chimney puffs
    lanterns: [],    // {sprite, light, phase, baseI}
    pulses: [],      // {mat, color, base, amp, speed, phase} glow modulation
    collapsing: [],  // breakable meshes mid-collapse
    breakables: [],  // live breakable records
    gateColliders: [],
    arenaLights: [],
    avoid: [],       // keep-out circles for vegetation scattering
    lightPool: [], lightCursor: 0,
    moteGeo: null, motePos: null, moteVel: null,
    dripGeo: null, dripPos: null, dripMeta: null,
    gate: { open: false, t: 0, left: null, right: null, glow: null, seam: null, light: null },
    arenaMix: 0, arenaTarget: 0,
    mood: null, time: 0, tv: null
  };
  const M = S.mats, GG = S.geoms, TX = S.tex;

  /* =====================================================================
     SMALL UTILITIES
     ===================================================================== */
  function smoothstep(a, b, x) { const t = U.clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function V3(x, y, z) { return new (T().Vector3)(x || 0, y || 0, z || 0); }
  function outlineOf(mesh, thickness, color) {
    const o = A().outline(mesh, thickness === undefined ? 0.02 : thickness, color === undefined ? 0x121915 : color);
    if (o) { o.castShadow = false; o.receiveShadow = false; }
    return o;
  }
  function addCollider(x, z, r, y0, y1) {
    const c = { x, z, r, y0: y0 || 0, y1: y1 === undefined ? 4 : y1 };
    W.colliders.push(c);
    return c;
  }
  function meshAt(geo, mat, x, y, z, shadow) {
    const m = new (T().Mesh)(geo, mat);
    m.position.set(x, y, z);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  }
  function glowSprite(color, scale, opacity) {
    const THREE = T();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: A().tex.glowdot(), color, transparent: true, opacity: opacity === undefined ? 0.85 : opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    sp.scale.setScalar(scale);
    return sp;
  }

  /* ---- geometry merge (init-time only) : lets one mesh carry many parts ---- */
  function mergeGeos(list) {
    const THREE = T();
    const parts = [];
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      parts.push(g.index ? g.toNonIndexed() : g);
    }
    let count = 0;
    for (let i = 0; i < parts.length; i++) count += parts[i].attributes.position.count;
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    let o3 = 0, o2 = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      pos.set(p.attributes.position.array, o3);
      if (p.attributes.normal) nor.set(p.attributes.normal.array, o3);
      if (p.attributes.uv) uv.set(p.attributes.uv.array, o2);
      o3 += p.attributes.position.count * 3;
      o2 += p.attributes.position.count * 2;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return out;
  }
  // clone + transform a shared geometry for merging
  function xform(geo, px, py, pz, rx, ry, rz, sx, sy, sz) {
    const THREE = T();
    const g = geo.clone();
    const m = new THREE.Matrix4();
    m.compose(
      new THREE.Vector3(px || 0, py || 0, pz || 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)),
      new THREE.Vector3(sx === undefined ? 1 : sx, sy === undefined ? (sx === undefined ? 1 : sx) : sy, sz === undefined ? (sx === undefined ? 1 : sx) : sz)
    );
    g.applyMatrix4(m);
    return g;
  }
  function repeatTex(t, x, y) {
    const c = t.clone();
    c.wrapS = c.wrapT = T().RepeatWrapping;
    c.repeat.set(x, y);
    c.needsUpdate = true;
    return c;
  }
  function tex2d(key, w, h, draw, opts) {
    if (TX[key]) return TX[key];
    const THREE = T();
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (opts && opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    TX[key] = t;
    return t;
  }

  /* =====================================================================
     PROCEDURAL TEXTURES (local to the world — assets.js keeps character maps)
     ===================================================================== */
  function buildTextures() {
    const R = Math.random;
    // --- painterly village grass ---
    tex2d("grass", 512, 512, function (ctx, w, h) {
      ctx.fillStyle = "#3a6448"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 460; i++) {
        const x = R() * w, y = R() * h, r = 8 + R() * 52;
        ctx.fillStyle = "rgba(" + (36 + R() * 44 | 0) + "," + (84 + R() * 58 | 0) + "," + (56 + R() * 38 | 0) + ",0.16)";
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62, R() * 3, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 1100; i++) {
        const x = R() * w, y = R() * h, l = 3 + R() * 9;
        ctx.strokeStyle = "rgba(" + (74 + R() * 60 | 0) + "," + (120 + R() * 74 | 0) + "," + (70 + R() * 40 | 0) + ",0.45)";
        ctx.lineWidth = 1 + R() * 1.3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 4, y - l); ctx.stroke();
      }
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = R() > 0.55 ? "rgba(245,234,210,0.75)" : "rgba(214,120,140,0.55)";
        ctx.beginPath(); ctx.arc(R() * w, R() * h, 1.3 + R() * 1.2, 0, TAU); ctx.fill();
      }
    }, { repeat: true });

    // --- worn dirt path (soft alpha edge) ---
    tex2d("dirt", 256, 256, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.16, w / 2, h / 2, w * 0.5);
      g.addColorStop(0, "rgba(126,102,72,0.95)");
      g.addColorStop(0.62, "rgba(112,92,66,0.8)");
      g.addColorStop(1, "rgba(100,86,62,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) {
        const a = R() * TAU, rad = Math.pow(R(), 0.6) * w * 0.46;
        const x = w / 2 + Math.cos(a) * rad, y = h / 2 + Math.sin(a) * rad;
        ctx.fillStyle = "rgba(" + (70 + R() * 60 | 0) + "," + (58 + R() * 44 | 0) + "," + (44 + R() * 30 | 0) + "," + (0.12 + R() * 0.3) + ")";
        ctx.beginPath(); ctx.ellipse(x, y, 2 + R() * 9, 1.5 + R() * 6, R() * 3, 0, TAU); ctx.fill();
      }
      // pebbles + flagstones
      for (let i = 0; i < 44; i++) {
        const a = R() * TAU, rad = Math.pow(R(), 0.7) * w * 0.4;
        const x = w / 2 + Math.cos(a) * rad, y = h / 2 + Math.sin(a) * rad;
        ctx.fillStyle = "rgba(" + (120 + R() * 40 | 0) + "," + (124 + R() * 40 | 0) + "," + (112 + R() * 30 | 0) + ",0.5)";
        ctx.beginPath(); ctx.ellipse(x, y, 3 + R() * 7, 2 + R() * 5, R() * 3, 0, TAU); ctx.fill();
      }
    });

    // --- cavern basalt ---
    tex2d("rock", 256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#4a3a3c"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = "rgba(" + (48 + R() * 50 | 0) + "," + (36 + R() * 30 | 0) + "," + (38 + R() * 26 | 0) + ",0.5)";
        ctx.beginPath(); ctx.ellipse(R() * w, R() * h, 6 + R() * 26, 4 + R() * 16, R() * 3, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = "rgba(20,14,16,0.55)";
      for (let i = 0; i < 36; i++) {
        ctx.lineWidth = 1 + R() * 2.4;
        let x = R() * w, y = R() * h;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 60; y += (R() - 0.5) * 60; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      for (let i = 0; i < 60; i++) { // orange mineral flecks
        ctx.fillStyle = "rgba(" + (180 + R() * 60 | 0) + "," + (90 + R() * 40 | 0) + ",40,0.35)";
        ctx.beginPath(); ctx.arc(R() * w, R() * h, 1 + R() * 2.6, 0, TAU); ctx.fill();
      }
    }, { repeat: true });

    // --- striped market awning ---
    const awning = function (c1, c2, key) {
      tex2d(key, 256, 128, function (ctx, w, h) {
        ctx.fillStyle = c2; ctx.fillRect(0, 0, w, h);
        const n = 8, sw = w / n;
        for (let i = 0; i < n; i += 2) { ctx.fillStyle = c1; ctx.fillRect(i * sw, 0, sw, h); }
        for (let i = 0; i < 700; i++) { // cloth weave
          ctx.fillStyle = "rgba(" + (0 + R() * 255 | 0) + "," + (0 + R() * 255 | 0) + "," + (0 + R() * 255 | 0) + ",0.03)";
          ctx.fillRect(R() * w, R() * h, 1 + R() * 3, 1);
        }
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 1);
        ctx.fillStyle = "rgba(255,255,255,0.09)";
        ctx.fillRect(0, 0, w, 10);
      }, { repeat: true });
    };
    awning("#d64533", "#f2e9d8", "awningA");
    awning("#ff9d4a", "#3f6b62", "awningB");

    // --- grass tuft billboard ---
    tex2d("blade", 96, 96, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 22; i++) {
        const x0 = w * 0.5 + (R() - 0.5) * w * 0.5, len = h * (0.4 + R() * 0.56);
        const lean = (R() - 0.5) * 30;
        const g = ctx.createLinearGradient(0, h, 0, h - len);
        g.addColorStop(0, "rgba(52,96,64,1)");
        g.addColorStop(1, "rgba(" + (96 + R() * 60 | 0) + "," + (150 + R() * 60 | 0) + ",90,1)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.6 + R() * 2.2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x0, h);
        ctx.quadraticCurveTo(x0 + lean * 0.3, h - len * 0.55, x0 + lean, h - len);
        ctx.stroke();
      }
    });

    // --- poppy billboard ---
    tex2d("poppy", 64, 64, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "#3f6644"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(32, 64); ctx.quadraticCurveTo(30, 44, 33, 26); ctx.stroke();
      ctx.fillStyle = "#e8433a";
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 - 0.4;
        ctx.beginPath();
        ctx.ellipse(33 + Math.cos(a) * 8, 20 + Math.sin(a) * 7, 8, 6, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = "#2a1218"; ctx.beginPath(); ctx.arc(33, 20, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(33, 20, 1.8, 0, TAU); ctx.fill();
    });

    // --- spore pod skin ---
    tex2d("pod", 128, 128, function (ctx, w, h) {
      ctx.fillStyle = "#5d2b33"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = "rgba(" + (120 + R() * 90 | 0) + "," + (40 + R() * 40 | 0) + "," + (50 + R() * 30 | 0) + ",0.35)";
        ctx.beginPath(); ctx.arc(R() * w, R() * h, 2 + R() * 8, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 26; i++) { // glowing veins
        ctx.strokeStyle = "rgba(255,140,90,0.5)"; ctx.lineWidth = 1 + R() * 1.6;
        let x = R() * w, y = R() * h;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 22; y += (R() - 0.5) * 22; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }, { repeat: true });
  }

  /* =====================================================================
     MATERIALS
     ===================================================================== */
  function buildMaterials() {
    const mat = A().mat, PAL = G.CONF.PAL, tex = A().tex;
    const toon = mat.toon;
    M.ground = toon(0xffffff, { map: repeatTex(TX.grass, 34, 34) });
    M.cobble = toon(0xd8ded4, { map: repeatTex(tex.cobble(), 7, 7) });
    M.path = toon(0xffffff, { map: repeatTex(TX.dirt, 2, 2), transparent: true });
    M.rock = toon(0xffffff, { map: repeatTex(TX.rock, 4, 4) });
    M.arenaFloor = toon(0xc98a86, { map: repeatTex(TX.rock, 6, 6) });
    M.plaster = toon(0xe6d9bd);
    M.plaster2 = toon(0xd6c6a8);
    M.wood = toon(0xffffff, { map: repeatTex(tex.wood(), 1, 2) });
    M.woodDark = toon(0x54402c);
    M.woodPale = toon(0xb99a72);
    M.bark = toon(0xffffff, { map: repeatTex(tex.wood(), 3, 2) });
    M.barkDark = toon(0x3b2c22);
    M.capRed = toon(0xffffff, { map: repeatTex(tex.capSpots(PAL.capRed, PAL.spotCream), 3, 2) });
    M.capOrange = toon(0xffffff, { map: repeatTex(tex.capSpots(0xd9832f, PAL.spotCream), 3, 2) });
    M.capTeal = toon(0xffffff, { map: repeatTex(tex.capSpots(0x3f8f83, PAL.mint), 3, 2) });
    M.capElder = toon(0xffffff, { map: repeatTex(tex.capSpots(0x5a4a63, 0xd9c3b0), 2, 2) });
    M.capPlum = toon(0xffffff, { map: repeatTex(tex.capSpots(0x8a4b5e, PAL.spotCream), 3, 2) });
    M.gills = toon(0xfff0d2, { map: repeatTex(tex.gills(), 3, 1), emissive: 0xffc978, emissiveIntensity: 0.55, side: T().DoubleSide });
    M.gillsRed = toon(0xffd8c2, { map: repeatTex(tex.gills(), 4, 1), emissive: 0xff6a3a, emissiveIntensity: 0.7, side: T().DoubleSide });
    M.leaf = toon(0x6f8f4a);
    M.moss = toon(0x41603e);
    M.cloth = toon(0xf2e9d8);
    M.awningA = toon(0xffffff, { map: repeatTex(TX.awningA, 1, 1), side: T().DoubleSide });
    M.awningB = toon(0xffffff, { map: repeatTex(TX.awningB, 1, 1), side: T().DoubleSide });
    M.pod = toon(0xffffff, { map: repeatTex(TX.pod, 1, 2), emissive: 0x561018, emissiveIntensity: 0.5 });
    M.root = toon(0x6b4a3c);
    M.rootDark = toon(0x452f28);
    M.arenaWall = toon(0xa2635c, { map: repeatTex(TX.rock, 5, 3), emissive: 0x2a0a08, emissiveIntensity: 0.6 });

    // dedicated (uncached) glow materials so world can pulse them safely
    M.fountGlow = new (T().MeshBasicMaterial)({ color: 0xffcf8a });
    M.seamGlow = new (T().MeshBasicMaterial)({ color: 0x9ff2d8 });
    M.hubWindowGlow = new (T().MeshBasicMaterial)({ color: 0xffc06a });
    M.arenaGlow = new (T().MeshBasicMaterial)({ color: 0xff6a3a });
    M.heartGlow = new (T().MeshBasicMaterial)({ color: 0xff4a3a });
    M.podGlow = new (T().MeshBasicMaterial)({ color: 0xff9a5a });
    M.geyserGlow = new (T().MeshBasicMaterial)({ color: 0xffb066 });
    // shared cached glows
    M.glowAmber = mat.glow(0xffb347, 1.1);
    M.glowPink = mat.glow(0xff9ec4, 1.15);
    M.glowCyan = mat.glow(0x59d8e8, 1.0);
    M.glowMoss = mat.glow(0x8fe0b8, 0.9);
  }

  /* =====================================================================
     SHARED GEOMETRY
     ===================================================================== */
  function buildGeoms() {
    const THREE = T(), g = A().geo();
    GG.box = g.box; GG.cyl = g.cyl; GG.cylLo = g.cylLo;
    GG.cone = g.cone; GG.coneLo = g.coneLo;
    GG.sphere = g.sphere; GG.sphereLo = g.sphereLo;
    GG.plane = g.plane; GG.circle = g.circle; GG.torus = g.torus;
    GG.cap = new THREE.SphereGeometry(1, 26, 14, 0, TAU, 0, Math.PI * 0.56);
    GG.capLo = new THREE.SphereGeometry(1, 16, 9, 0, TAU, 0, Math.PI * 0.56);
    GG.gillCone = new THREE.ConeGeometry(1, 1, 22, 1, true);
    GG.taper = new THREE.CylinderGeometry(0.82, 1.12, 1, 14, 1, false);
    GG.stalkTaper = new THREE.CylinderGeometry(0.62, 1, 1, 12, 1, true);

    /* crossed billboard quads for grass (4 tris, double-sided-friendly) */
    const pos = new Float32Array([
      -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0,
      -0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0,
      0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5,
      0, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5
    ]);
    const nor = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
    const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
    const cross = new THREE.BufferGeometry();
    cross.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    cross.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    cross.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    GG.cross = cross;

    /* picket fence post (post + pointed cap), merged */
    GG.picket = mergeGeos([
      xform(g.box, 0, 0.4, 0, 0, 0, 0, 0.1, 0.8, 0.05),
      xform(g.cone, 0, 0.9, 0, 0, 0, 0, 0.075, 0.22, 0.075)
    ]);

    /* tiny glowing mushroom (stem + cap handled by two instanced meshes) */
    GG.shroomStem = mergeGeos([xform(g.cylLo, 0, 0.09, 0, 0, 0, 0, 0.045, 0.18, 0.045)]);
    GG.shroomCap = mergeGeos([
      xform(GG.capLo, 0, 0.19, 0, 0, 0, 0, 0.15, 0.11, 0.15)
    ]);

    /* crate / barrel / pot hero breakable pieces */
    GG.crate = mergeGeos([
      xform(g.box, 0, 0.5, 0, 0, 0, 0, 1, 1, 1),
      xform(g.box, 0, 0.5, 0, 0, 0, 0, 1.03, 0.11, 1.03),
      xform(g.box, 0, 0.12, 0, 0, 0, 0, 1.03, 0.1, 1.03)
    ]);
    GG.barrel = mergeGeos([
      xform(g.cyl, 0, 0.5, 0, 0, 0, 0, 0.42, 1, 0.42),
      xform(g.torus, 0, 0.78, 0, Math.PI / 2, 0, 0, 0.42, 0.42, 0.42),
      xform(g.torus, 0, 0.24, 0, Math.PI / 2, 0, 0, 0.42, 0.42, 0.42)
    ]);
    GG.pot = mergeGeos([
      xform(g.sphere, 0, 0.34, 0, 0, 0, 0, 0.32, 0.34, 0.32),
      xform(g.cyl, 0, 0.62, 0, 0, 0, 0, 0.16, 0.16, 0.16)
    ]);
  }

  /* =====================================================================
     TERRAIN HEIGHT FUNCTION (pure, no raycasts)
     ===================================================================== */
  const STREETS = [
    { x0: 0, z0: -13, x1: 0, z1: -38, hw: 4.2 },   // north street to gate
    { x0: 9, z0: 0, x1: 36, z1: 0, hw: 3.8 },      // east street
    { x0: 0, z0: 13, x1: 0, z1: 38, hw: 3.8 },     // south street
    { x0: 0, z0: -38, x1: 0, z1: -60, hw: 5.6 }    // gate corridor -> arena mouth
  ];
  function corridorMask(x, z, s) {
    const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
    const len2 = dx * dx + dz * dz;
    let t = len2 > 0 ? ((x - s.x0) * dx + (z - s.z0) * dz) / len2 : 0;
    t = U.clamp01(t);
    const px = s.x0 + dx * t, pz = s.z0 + dz * t;
    const d = Math.sqrt((x - px) * (x - px) + (z - pz) * (z - pz));
    return 1 - smoothstep(s.hw, s.hw + 4.5, d);
  }
  function heightAt(x, z) {
    // Rotheart cavern floor: flat basin with a soft central dais
    if (z < -56) {
      const dx = x - W.arenaCenter.x, dz = z - W.arenaCenter.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      return 0.34 * (1 - smoothstep(4.8, 7.4, d));
    }
    const d = Math.sqrt(x * x + z * z);
    // rolling village rim (kept gentle so movement stays predictable)
    const rim = smoothstep(15.5, 44, d);
    const wob = 0.55 + 0.30 * Math.sin(x * 0.17 + 1.1) * Math.cos(z * 0.15 - 0.4) + 0.16 * Math.sin((x + z) * 0.31);
    let h = rim * (1.05 * wob);
    let flat = 1 - smoothstep(14.5, 19.5, d); // plaza disc
    for (let i = 0; i < STREETS.length; i++) flat = Math.max(flat, corridorMask(x, z, STREETS[i]));
    h *= (1 - flat);
    return h;
  }
  W.heightAt = heightAt;

  /* =====================================================================
     INIT
     ===================================================================== */
  W.init = function (scene) {
    if (S.built) return W;
    const THREE = T();
    S.scene = scene || new THREE.Scene();
    S.built = true;
    W.scene = S.scene;
    W.bounds.x = 0; W.bounds.z = 0; W.bounds.r = 50; W.inArena = false;
    if (!G.util.tmp || !G.util.tmp.v1) G.util.initTmp();
    S.tv = G.util.tmp;

    S.root = new THREE.Group();
    S.root.name = "world";
    S.scene.add(S.root);
    S.hub = new THREE.Group(); S.hub.name = "hub";
    S.arena = new THREE.Group(); S.arena.name = "rotheart";
    S.sky = new THREE.Group(); S.sky.name = "sky";
    S.root.add(S.sky); S.root.add(S.hub); S.root.add(S.arena);

    buildTextures();
    buildMaterials();
    buildGeoms();

    buildSky();
    buildLights();
    buildTerrain();
    buildPlaza();
    buildHouses();
    buildElderTrees();
    buildVegetation();
    buildTraversal();
    buildGate();
    // (Rotheart cavern removed — the assassin fight happens in the town square)
    buildMotes();
    buildBounds();

    S.time = 0;
    applyMood(0);
    return W;
  };

  /* =====================================================================
     SKY : gradient dome, moon, stars, distant silhouettes
     ===================================================================== */
  function buildSky() {
    const THREE = T();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 20),
      new THREE.MeshBasicMaterial({ map: A().tex.skygrad(), side: THREE.BackSide, fog: false, depthWrite: false })
    );
    dome.scale.setScalar(205);
    dome.renderOrder = -20;
    dome.frustumCulled = false;
    S.sky.add(dome);

    // big low moon — sits up-right of the elder gate from the spawn view
    const moonGlow = glowSprite(0xfff2cf, 54, 0.5);
    moonGlow.position.set(40, 66, -152);
    moonGlow.material.fog = false;
    S.sky.add(moonGlow);
    const moonCore = glowSprite(0xfffaf0, 17, 0.95);
    moonCore.position.copy(moonGlow.position);
    S.sky.add(moonCore);

    // stars (static, one draw call)
    const N = 140;
    const sp = new Float32Array(N * 3);
    const sc = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * TAU, el = Math.random() * 0.9 + 0.18, r = 175;
      sp[i * 3] = Math.cos(a) * Math.cos(el) * r;
      sp[i * 3 + 1] = Math.sin(el) * r;
      sp[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r;
      const b = 0.5 + Math.random() * 0.5;
      sc[i * 3] = b; sc[i * 3 + 1] = b * 0.98; sc[i * 3 + 2] = b * 0.9;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sg.setAttribute("color", new THREE.BufferAttribute(sc, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({
      size: 1.5, map: A().tex.glowdot(), transparent: true, opacity: 0.85,
      depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      sizeAttenuation: true, fog: false
    }));
    stars.frustumCulled = false;
    S.sky.add(stars);

    /* distant silhouettes : mushroom skyline + cloud bands */
    const capSil = mergeGeos([
      xform(GG.capLo, 0, 1, 0, 0, 0, 0, 1, 0.62, 1),
      xform(GG.taper, 0, 0.1, 0, 0, 0, 0, 0.22, 1.4, 0.22)
    ]);
    const cloudSil = mergeGeos([
      xform(GG.sphereLo, -1.5, 0, 0, 0, 0, 0, 1.5, 0.45, 0.9),
      xform(GG.sphereLo, 0.2, 0.35, 0, 0, 0, 0, 1.9, 0.6, 1.0),
      xform(GG.sphereLo, 1.9, 0.05, 0, 0, 0, 0, 1.3, 0.4, 0.85)
    ]);
    const silMat = new THREE.MeshBasicMaterial({ color: 0x2e6a63, fog: false, transparent: true, opacity: 0.72 });
    const silMatFar = new THREE.MeshBasicMaterial({ color: 0x3e8377, fog: false, transparent: true, opacity: 0.55 });
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0x9ed8c2, fog: false, transparent: true, opacity: 0.22, depthWrite: false });

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + 0.14;
      const r = 128 + (i % 3) * 16;
      const m = new THREE.Mesh(capSil, i % 2 ? silMat : silMatFar);
      m.position.set(Math.cos(a) * r, -6 + (i % 4) * 2, Math.sin(a) * r);
      m.scale.setScalar(9 + (i % 5) * 4.5);
      m.rotation.y = Math.random() * TAU;
      m.frustumCulled = true;
      S.sky.add(m);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.5;
      const r = 118 + (i % 2) * 22;
      const m = new THREE.Mesh(cloudSil, cloudMat);
      m.position.set(Math.cos(a) * r, 36 + (i % 3) * 13, Math.sin(a) * r);
      m.scale.setScalar(11 + (i % 4) * 5);
      m.rotation.y = -a + Math.PI / 2;
      S.sky.add(m);
    }
  }

  /* =====================================================================
     LIGHTS : hemi + shadow key + rim back + 8 pooled lantern points
     ===================================================================== */
  function buildLights() {
    const THREE = T(), sc = S.scene;

    const hemi = new THREE.HemisphereLight(0x7fd3bd, 0x24402f, 1.05);
    hemi.position.set(0, 40, 0);
    sc.add(hemi);
    S.hemi = hemi;

    const key = new THREE.DirectionalLight(0xffe4bc, 2.6);
    key.position.set(28, 44, 22);
    key.target.position.set(0, 0, -8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const cam = key.shadow.camera;
    cam.left = -30; cam.right = 30; cam.top = 30; cam.bottom = -30;
    cam.near = 2; cam.far = 120;
    cam.updateProjectionMatrix();
    key.shadow.bias = -0.0007;
    key.shadow.normalBias = 0.035;
    key.shadow.radius = 2;
    sc.add(key);
    sc.add(key.target);
    S.key = key;

    const back = new THREE.DirectionalLight(0x59d8e8, 0.7);
    back.position.set(-32, 16, -44);
    sc.add(back);
    S.back = back;

    for (let i = 0; i < 8; i++) {
      const pl = new THREE.PointLight(0xffb347, 0, 16, 2);
      pl.castShadow = false;
      pl.visible = false;
      sc.add(pl);
      S.lightPool.push(pl);
    }

    sc.fog = new THREE.FogExp2(0x2f6a61, 0.0125);
    if (!sc.background) sc.background = new THREE.Color(0x1d4744);

    const C = THREE.Color;
    S.mood = {
      hubFog: new C(0x2f6a61), bossFog: new C(0x3b1315),
      hubSky: new C(0x7fd3bd), bossSky: new C(0xff7a4a),
      hubGnd: new C(0x24402f), bossGnd: new C(0x2a0c0e),
      hubKey: new C(0xffe4bc), bossKey: new C(0xff9a70),
      hubBack: new C(0x59d8e8), bossBack: new C(0xff5040),
      hubDens: 0.0125, bossDens: 0.0265,
      hubKeyI: 2.6, bossKeyI: 1.5,
      hubHemiI: 1.05, bossHemiI: 0.8
    };
  }

  function takeLight(intensity, distance) {
    const pl = S.lightPool[S.lightCursor % S.lightPool.length];
    S.lightCursor++;
    pl.intensity = intensity;
    pl.distance = distance;
    pl.visible = true;
    return pl;
  }

  function applyMood(k) {
    const mo = S.mood, sc = S.scene;
    if (!mo) return;
    sc.fog.color.copy(mo.hubFog).lerp(mo.bossFog, k);
    sc.fog.density = U.lerp(mo.hubDens, mo.bossDens, k);
    S.hemi.color.copy(mo.hubSky).lerp(mo.bossSky, k);
    S.hemi.groundColor.copy(mo.hubGnd).lerp(mo.bossGnd, k);
    S.hemi.intensity = U.lerp(mo.hubHemiI, mo.bossHemiI, k);
    S.key.color.copy(mo.hubKey).lerp(mo.bossKey, k);
    S.key.intensity = U.lerp(mo.hubKeyI, mo.bossKeyI, k);
    S.back.color.copy(mo.hubBack).lerp(mo.bossBack, k);
    S.back.intensity = U.lerp(0.7, 0.95, k);
    for (let i = 0; i < S.arenaLights.length; i++) {
      const al = S.arenaLights[i];
      al.intensity = al.userData.baseI * k;
      al.visible = k > 0.01;
    }
    for (let i = 0; i < S.lanterns.length; i++) {
      const l = S.lanterns[i];
      l.baseI = U.lerp(9.5, 5.0, k);
    }
  }

  /* =====================================================================
     TERRAIN : displaced painterly ground, cobble plaza, dirt streets
     ===================================================================== */
  function buildTerrain() {
    const THREE = T();
    const geo = new THREE.PlaneGeometry(260, 260, 108, 108);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, M.ground);
    ground.receiveShadow = true;
    ground.name = "ground";
    S.hub.add(ground);

    // plaza cobble disc + stone rim
    const disc = new THREE.Mesh(new THREE.CircleGeometry(15.4, 64), M.cobble);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.02;
    disc.receiveShadow = true;
    S.hub.add(disc);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(15.4, 0.16, 6, 72), M.woodDark);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.05;
    rim.receiveShadow = true;
    S.hub.add(rim);

    // dirt street ribbons (soft alpha edges read as trodden earth)
    const paths = [
      { x: 0, z: -25, w: 9.5, l: 27, r: 0 },        // north street
      { x: 22, z: 0, w: 8.5, l: 27, r: Math.PI / 2 }, // east street
      { x: 0, z: 25, w: 8.5, l: 27, r: 0 },         // south street
      { x: 0, z: -49, w: 12.5, l: 24, r: 0 }        // gate corridor
    ];
    for (let i = 0; i < paths.length; i++) {
      const cfg = paths[i];
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(cfg.w, cfg.l), M.path);
      pl.rotation.x = -Math.PI / 2;
      pl.rotation.z = cfg.r;
      pl.position.set(cfg.x, 0.035, cfg.z);
      pl.receiveShadow = false;
      pl.renderOrder = 1;
      S.hub.add(pl);
    }

    // moss + worn patches for painterly breakup
    const mossMat = new THREE.MeshBasicMaterial({ color: 0x2f5236, transparent: true, opacity: 0.22, depthWrite: false });
    for (let i = 0; i < 8; i++) {
      const a = i * 1.7, r = 6 + (i % 4) * 4.5;
      const m = new THREE.Mesh(GG.circle, mossMat);
      m.rotation.x = -Math.PI / 2;
      m.scale.setScalar(2.4 + (i % 3) * 1.6);
      m.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r);
      m.renderOrder = 2;
      S.hub.add(m);
    }
  }

  /* =====================================================================
     PLAZA : fountain, lanterns, banners, market stalls
     ===================================================================== */
  function buildPlaza() {
    const THREE = T();

    /* ---- central tiered mushroom fountain ---- */
    const f = new THREE.Group();
    f.position.set(0, 0, 0);
    S.hub.add(f);

    const basin = meshAt(GG.cyl, M.cobble, 0, 0.3, 0);
    basin.scale.set(4.3, 0.66, 4.3);
    f.add(basin);
    const basinLip = meshAt(GG.torus, M.woodDark, 0, 0.62, 0);
    basinLip.scale.set(4.3, 0.28, 4.3);
    basinLip.rotation.x = Math.PI / 2;
    f.add(basinLip);

    // dedicated fountain gill material (pulsed from update)
    M.fountGill = A().mat.toon(0xfff2d8, {
      map: repeatTex(A().tex.gills(), 4, 1), emissive: 0xffcf8a,
      emissiveIntensity: 0.85, side: THREE.DoubleSide, noCache: true
    });
    M.water = new THREE.MeshBasicMaterial({ color: 0x2f7679, transparent: true, opacity: 0.92 });
    const water = new THREE.Mesh(GG.circle, M.water);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.63;
    water.scale.setScalar(4.12);
    f.add(water);

    const tiers = [
      { r: 3.05, h: 1.05, y: 1.15, stalk: 0.72 },
      { r: 2.05, h: 0.78, y: 2.25, stalk: 0.52 },
      { r: 1.18, h: 0.52, y: 3.15, stalk: 0.36 }
    ];
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const stalk = meshAt(GG.taper, i === 0 ? M.cobble : M.plaster, 0, t.y - 0.15, 0);
      stalk.scale.set(t.stalk, 0.95, t.stalk);
      f.add(stalk);
      const cap = new THREE.Mesh(GG.cap, i === 2 ? M.capTeal : M.capPlum);
      cap.scale.set(t.r, t.h, t.r);
      cap.position.y = t.y + 0.32;
      cap.castShadow = true; cap.receiveShadow = true;
      f.add(cap);
      outlineOf(cap, 0.018, 0x16201c);
      const gill = new THREE.Mesh(GG.gillCone, M.fountGill);
      gill.scale.set(t.r * 0.98, t.h * 0.9, t.r * 0.98);
      gill.position.y = t.y + 0.32;
      f.add(gill);
      // glowing spout orb
      const orb = new THREE.Mesh(GG.sphereLo, M.fountGlow);
      orb.scale.setScalar(0.16 + i * 0.02);
      orb.position.y = t.y + 0.55;
      f.add(orb);
      const sp = glowSprite(0xffd79a, t.r * 1.25, 0.42);
      sp.position.y = t.y + 0.42;
      f.add(sp);
      S.pulses.push({ kind: "opacity", obj: sp, base: 0.42, amp: 0.35, speed: 1.3 + i * 0.4, phase: i * 1.7 });
    }

    const topGlow = glowSprite(0x9ff2d8, 3.2, 0.55);
    topGlow.position.y = 3.9;
    f.add(topGlow);
    S.pulses.push({ kind: "opacity", obj: topGlow, base: 0.55, amp: 0.3, speed: 0.9, phase: 0.4 });
    S.pulses.push({ kind: "emissive", mat: M.fountGill, base: 0.85, amp: 0.45, speed: 1.6, phase: 0 });
    S.pulses.push({ kind: "emissive", mat: M.fountGlow, base: 1.0, amp: 0.18, speed: 2.2, phase: 1.1, baseCol: M.fountGlow.color.clone() });

    const fl = takeLight(11, 17);
    fl.position.set(0, 2.6, 0);
    fl.color.setHex(0xffc98a);
    addCollider(0, 0, 4.35, 0, 4.2);
    addPulseRings(f, 3);

    /* ---- objective beacon: a soft pillar of light over the square (hidden once the duel starts) ---- */
    S.beaconOn = true;
    S.beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 3.4, 70, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffb36a, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    S.beacon.position.set(0, 35, 0); S.beacon.renderOrder = 4; S.hub.add(S.beacon);

    /* ---- lantern posts around the plaza ---- */
    const lanternAngles = [45, 105, 165, 225, 285, 345];
    for (let i = 0; i < lanternAngles.length; i++) {
      const a = lanternAngles[i] * DEG;
      makeLantern(Math.cos(a) * 11.8, Math.sin(a) * 11.8);
    }

    /* ---- banner ropes with pennant flags ---- */
    const ropePairs = [[0, 2], [2, 4], [4, 0]];
    for (let i = 0; i < ropePairs.length; i++) {
      const a0 = lanternAngles[ropePairs[i][0]] * DEG;
      const a1 = lanternAngles[ropePairs[i][1]] * DEG;
      bannerRope(Math.cos(a0) * 11.8, Math.sin(a0) * 11.8, Math.cos(a1) * 11.8, Math.sin(a1) * 11.8, 4.3);
    }

    /* ---- market stalls (all breakable) ---- */
    const stallAngles = [200, 225, 250, 290, 315, 340];
    for (let i = 0; i < stallAngles.length; i++) {
      const a = stallAngles[i] * DEG;
      makeStall(Math.cos(a) * 9.9, Math.sin(a) * 9.9, a + Math.PI, i % 2);
    }
  }

  function addPulseRings(parent, count) {
    const THREE = T();
    for (let i = 0; i < count; i++) {
      const r = A().ringTelegraph(1, 0x8fe8d8);
      r.material.opacity = 0.5;
      r.material.color.setHex(0x8fe8d8);
      r.position.set(0, 0.68 + i * 0.005, 0);
      r.scale.setScalar(1.1 + i * 1.05);
      parent.add(r);
      S.pulses.push({ kind: "ripple", obj: r, base: 1.1 + i * 1.05, amp: 0.25, speed: 0.8 + i * 0.22, phase: i * 2.1 });
    }
  }

  function makeLantern(x, z) {
    const THREE = T();
    const g = new THREE.Group();
    const y = heightAt(x, z);
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(-x, -z);
    S.hub.add(g);

    const post = meshAt(GG.cyl, M.woodDark, 0, 1.45, 0);
    post.scale.set(0.11, 2.9, 0.11);
    g.add(post);
    const foot = meshAt(GG.cyl, M.cobble, 0, 0.12, 0);
    foot.scale.set(0.3, 0.24, 0.3);
    g.add(foot);
    const arm = meshAt(GG.box, M.woodDark, 0, 2.92, 0.18);
    arm.scale.set(0.09, 0.09, 0.46);
    g.add(arm);
    const cage = meshAt(GG.torus, M.woodDark, 0, 2.62, 0.38);
    cage.scale.set(0.27, 0.27, 0.27);
    g.add(cage);
    const roof = meshAt(GG.coneLo, M.woodDark, 0, 2.95, 0.38);
    roof.scale.set(0.34, 0.26, 0.34);
    g.add(roof);
    const bulb = new THREE.Mesh(GG.sphereLo, M.glowAmber);
    bulb.scale.setScalar(0.19);
    bulb.position.set(0, 2.6, 0.38);
    bulb.castShadow = false;
    g.add(bulb);

    const sp = glowSprite(0xffc46a, 2.7, 0.72);
    sp.position.set(0, 2.6, 0.38);
    g.add(sp);

    const light = takeLight(9.5, 16);
    light.position.set(0, 2.62, 0.38);
    light.color.setHex(0xffb861);

    const lrec = { sprite: sp, light: light, phase: x * 0.7 + z * 0.4, baseI: 9.5, bulb: bulb, broken: false };
    S.lanterns.push(lrec);
    W.registerBreakable({ mesh: g, x, z, r: 0.45, hp: 34, debris: "glass", h: 3, onBreak: function () { lrec.broken = true; light.intensity = 0; light.visible = false; sp.visible = false; } });
    // hanging planter at the foot
    const planter = meshAt(GG.sphereLo, M.leaf, 0.34, 0.32, 0.1);
    planter.scale.set(0.3, 0.22, 0.3);
    g.add(planter);
    return g;
  }

  function bannerRope(x0, z0, x1, z1, height) {
    const THREE = T();
    const pts = [];
    const N = 26;
    const sag = 0.55;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = U.lerp(x0, x1, t), z = U.lerp(z0, z1, t);
      const y = height + Math.sin(t * Math.PI) * -sag;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x2a2620 }));
    S.hub.add(line);

    // pennant flags instanced along the rope
    const NF = 14;
    const im = new THREE.InstancedMesh(flagGeo(), new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide, vertexColors: false
    }), NF);
    im.castShadow = false; im.receiveShadow = false;
    im.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    const col = new THREE.Color();
    const cols = [0xff7a33, 0xf2e9d8, 0x59d8e8, 0xd64533];
    for (let i = 0; i < NF; i++) {
      const t = (i + 0.5) / NF;
      const x = U.lerp(x0, x1, t), z = U.lerp(z0, z1, t);
      const y = height + Math.sin(t * Math.PI) * -sag - 0.02;
      q.setFromEuler(new THREE.Euler(0, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, Math.sin(i * 1.3) * 0.08));
      v.set(x, y, z);
      sc.set(1, 1, 1);
      m4.compose(v, q, sc);
      im.setMatrixAt(i, m4);
      col.setHex(cols[i % cols.length]);
      if (im.setColorAt) im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    S.hub.add(im);
  }

  function flagGeo() {
    const THREE = T();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
      0, 0, 0, 0.42, 0, 0, 0, -0.46, 0
    ]), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0]), 2));
    return g;
  }

  /* ---- market stall : posts, counter, awning, hanging goods ---- */
  function makeStall(x, z, rotY, variant) {
    const THREE = T();
    const g = new THREE.Group();
    const y = heightAt(x, z);
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    S.hub.add(g);

    // wood parts merged: 4 posts + counter + top rails
    const wood = mergeGeos([
      xform(GG.box, -1.4, 1.1, -0.75, 0, 0, 0, 0.14, 2.2, 0.14),
      xform(GG.box, 1.4, 1.1, -0.75, 0, 0, 0, 0.14, 2.2, 0.14),
      xform(GG.box, -1.4, 1.62, 0.75, 0, 0, 0, 0.12, 1.25, 0.12),
      xform(GG.box, 1.4, 1.62, 0.75, 0, 0, 0, 0.12, 1.25, 0.12),
      xform(GG.box, 0, 0.92, 0, 0, 0, 0, 2.9, 0.12, 1.7),
      xform(GG.box, 0, 0.5, 0.82, 0, 0, 0, 2.9, 0.86, 0.12),
      xform(GG.box, 0, 1.72, -0.72, 0, 0, 0, 2.6, 0.1, 0.1),
      xform(GG.box, 0, 2.28, 0.78, 0, 0, 0, 3.1, 0.1, 0.1)
    ]);
    const woodMesh = new THREE.Mesh(wood, M.wood);
    woodMesh.castShadow = true; woodMesh.receiveShadow = true;
    g.add(woodMesh);
    outlineOf(woodMesh, 0.006, 0x1a1410);

    // awning
    const awning = new THREE.Mesh(GG.plane, variant ? M.awningB : M.awningA);
    awning.scale.set(3.3, 2.0, 1);
    awning.rotation.x = -Math.PI / 2 + 0.33;
    awning.position.set(0, 2.52, 0.05);
    awning.castShadow = true; awning.receiveShadow = true;
    g.add(awning);
    const valance = new THREE.Mesh(GG.plane, variant ? M.awningB : M.awningA);
    valance.scale.set(3.3, 0.3, 1);
    valance.position.set(0, 2.22, 0.98);
    g.add(valance);

    // produce + pots (clay) with a couple of glowing mushrooms on the counter
    const goods = mergeGeos([
      xform(GG.pot, -0.85, 0.98, 0.1, 0, 0, 0, 1.0, 1.0, 1.0),
      xform(GG.pot, 0.15, 0.98, -0.1, 0, 0.6, 0, 0.8, 0.8, 0.8),
      xform(GG.sphereLo, -0.85, 1.28, 0.1, 0, 0, 0, 0.3, 0.2, 0.3),
      xform(GG.box, 0.95, 1.02, 0.1, 0, 0.45, 0, 0.6, 0.3, 0.5),
      xform(GG.sphereLo, 0.55, 1.14, 0.15, 0, 0, 0, 0.12, 0.1, 0.12),
      xform(GG.sphereLo, 0.75, 1.12, -0.05, 0, 0, 0, 0.11, 0.09, 0.11)
    ]);
    const goodsMesh = new THREE.Mesh(goods, M.woodPale);
    goodsMesh.castShadow = true; goodsMesh.receiveShadow = true;
    g.add(goodsMesh);

    // hanging goods strings
    const hang = mergeGeos([
      xform(GG.box, -0.9, 2.05, 0.75, 0, 0, 0, 0.02, 0.5, 0.02),
      xform(GG.sphereLo, -0.9, 1.76, 0.75, 0, 0, 0, 0.16, 0.2, 0.16),
      xform(GG.box, -0.4, 2.05, 0.75, 0, 0, 0, 0.02, 0.42, 0.02),
      xform(GG.sphereLo, -0.4, 1.8, 0.75, 0, 0, 0, 0.12, 0.15, 0.12),
      xform(GG.box, 0.65, 2.05, 0.75, 0, 0, 0, 0.02, 0.6, 0.02),
      xform(GG.cone, 0.65, 1.55, 0.75, 0, 0, 0, 0.15, 0.3, 0.15)
    ]);
    const hangMesh = new THREE.Mesh(hang, M.moss);
    hangMesh.castShadow = true;
    g.add(hangMesh);

    const glow = glowSprite(0xffb861, 1.8, 0.55);
    glow.position.set(1.35, 2.16, 0.9);
    g.add(glow);

    const rec = W.registerBreakable({
      mesh: g, x, z, r: 1.75, hp: 60, debris: "stall", h: 2.8,
      onHit: function (b) {
        b.mesh.position.x = b.x + (Math.random() - 0.5) * 0.05;
        b.mesh.position.z = b.z + (Math.random() - 0.5) * 0.05;
      }
    });
    g.userData.breakable = rec;
    return g;
  }

  /* ---- scattered crates, barrels, pots (breakable clutter) ---- */
  function makeCrate(x, z, size, rot) {
    const THREE = T();
    const y = heightAt(x, z);
    const m = new THREE.Mesh(GG.crate, M.wood);
    m.position.set(x, y, z);
    m.rotation.y = rot || 0;
    m.scale.setScalar(size);
    m.castShadow = true; m.receiveShadow = true;
    S.hub.add(m);
    outlineOf(m, 0.01, 0x1a1410);
    W.registerBreakable({ mesh: m, x, z, r: size * 0.8, hp: 26, debris: "wood", h: size });
    return m;
  }
  function makeBarrel(x, z, rot) {
    const THREE = T();
    const y = heightAt(x, z);
    const m = new THREE.Mesh(GG.barrel, M.woodDark);
    m.position.set(x, y, z);
    m.rotation.y = rot || 0;
    m.scale.setScalar(0.72);
    m.castShadow = true; m.receiveShadow = true;
    S.hub.add(m);
    outlineOf(m, 0.012, 0x1a1410);
    W.registerBreakable({ mesh: m, x, z, r: 0.55, hp: 30, debris: "wood", h: 0.95 });
    return m;
  }
  function makePot(x, z) {
    const THREE = T();
    const y = heightAt(x, z);
    const m = new THREE.Mesh(GG.pot, M.woodPale);
    m.position.set(x, y, z);
    m.rotation.y = Math.random() * TAU;
    m.castShadow = true; m.receiveShadow = true;
    S.hub.add(m);
    W.registerBreakable({ mesh: m, x, z, r: 0.42, hp: 16, debris: "stone", h: 0.7 });
    return m;
  }

  /* =====================================================================
     MOTES : one shared drifting spore system (300 pts) for the whole hub
     ===================================================================== */
  function buildMotes() {
    const THREE = T();
    const N = 300;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * TAU, r = 4 + Math.random() * 46;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.4 + Math.random() * 15;
      pos[i * 3 + 2] = Math.sin(a) * r;
      vel[i * 3] = 0.18 + Math.random() * 0.5;     // rise speed
      vel[i * 3 + 1] = Math.random() * TAU;        // drift phase
      vel[i * 3 + 2] = 0.25 + Math.random() * 0.8; // sway
      const gold = Math.random() > 0.55;
      col[i * 3] = gold ? 1.0 : 0.55;
      col[i * 3 + 1] = gold ? 0.82 : 0.95;
      col[i * 3 + 2] = gold ? 0.45 : 0.85;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.34, map: A().tex.glowdot(), transparent: true, opacity: 0.8,
      depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      sizeAttenuation: true, fog: true
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    S.hub.add(pts);
    S.moteGeo = geo;
    S.motePos = pos;
    S.moteVel = vel;
    S.moteMat = mat;

    /* fountain drips (own tiny system, same treatment) */
    const ND = 56;
    const dp = new Float32Array(ND * 3);
    const meta = new Float32Array(ND * 3); // radius, topY, speed
    for (let i = 0; i < ND; i++) {
      const a = Math.random() * TAU;
      const tierR = [3.0, 2.0, 1.15][i % 3];
      meta[i * 3] = tierR;
      meta[i * 3 + 1] = [1.4, 2.5, 3.4][i % 3];
      meta[i * 3 + 2] = 1.6 + Math.random() * 1.2;
      dp[i * 3] = Math.cos(a) * tierR;
      dp[i * 3 + 1] = Math.random() * meta[i * 3 + 1];
      dp[i * 3 + 2] = Math.sin(a) * tierR;
    }
    const dgeo = new THREE.BufferGeometry();
    dgeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dmat = new THREE.PointsMaterial({
      size: 0.18, map: A().tex.glowdot(), color: 0xbfe9ff, transparent: true,
      opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    const drips = new THREE.Points(dgeo, dmat);
    drips.frustumCulled = false;
    drips.renderOrder = 6;
    S.hub.add(drips);
    S.dripGeo = dgeo;
    S.dripPos = dp;
    S.dripMeta = meta;
  }

  /* =====================================================================
     HOUSES : stalk + spotted cap roof, glowing door/windows, chimney smoke
     ===================================================================== */
  function makeHouse(cx, cz, rotY, scale, capMat, variant, doorGlowMat) {
    const THREE = T();
    const y = heightAt(cx, cz);
    const g = new THREE.Group();
    g.position.set(cx, y, cz);
    g.rotation.y = rotY;
    g.scale.setScalar(scale);
    S.hub.add(g);

    const plinth = meshAt(GG.cyl, M.cobble, 0, 0.2, 0);
    plinth.scale.set(2.95, 0.62, 2.95);
    g.add(plinth);

    const body = meshAt(GG.taper, variant ? M.plaster2 : M.plaster, 0, 1.95, 0);
    body.scale.set(2.4, 3.6, 2.4);
    g.add(body);

    // roof cap
    const cap = new THREE.Mesh(GG.cap, capMat);
    cap.scale.set(4.3, 2.5, 4.3);
    cap.position.y = 3.62;
    cap.castShadow = true; cap.receiveShadow = true;
    g.add(cap);
    outlineOf(cap, 0.014, 0x1b2420);

    // gills tucked under the cap
    const gills = new THREE.Mesh(GG.gillCone, M.gills);
    gills.scale.set(4.1, 0.82, 4.1);
    gills.position.y = 3.6;
    g.add(gills);

    // merged woodwork : door frame, window frames, chimney, hanging planters
    const wood = mergeGeos([
      xform(GG.torus, 0, 1.32, 2.4, 0, 0, 0, 1.0, 1.06, 0.85),
      xform(GG.torus, -1.5, 2.5, 1.95, 0, 0.62, 0, 0.46, 0.46, 0.5),
      xform(GG.torus, 1.5, 2.5, 1.95, 0, -0.62, 0, 0.46, 0.46, 0.5),
      xform(GG.cyl, 1.5, 5.05, -0.7, 0, 0, 0, 0.42, 2.3, 0.42),
      xform(GG.box, 1.5, 6.18, -0.7, 0, 0, 0, 0.62, 0.16, 0.62),
      xform(GG.box, -3.0, 3.15, 1.5, 0, 0.3, 0, 0.7, 0.14, 0.4),
      xform(GG.box, 3.0, 3.05, -1.4, 0, -0.5, 0, 0.6, 0.12, 0.36),
      xform(GG.box, 0, 0.28, 2.7, 0, 0, 0, 1.8, 0.16, 0.8)
    ]);
    const woodMesh = new THREE.Mesh(wood, M.woodDark);
    woodMesh.castShadow = true; woodMesh.receiveShadow = true;
    g.add(woodMesh);

    // glowing door + windows (single merged additive-free emissive mesh)
    const glow = mergeGeos([
      xform(GG.circle, 0, 1.32, 2.44, 0, 0, 0, 0.86, 0.92, 1),
      xform(GG.circle, -1.5, 2.5, 2.0, 0, 0.62, 0, 0.38, 0.38, 1),
      xform(GG.circle, 1.5, 2.5, 2.0, 0, -0.62, 0, 0.38, 0.38, 1)
    ]);
    const glowMesh = new THREE.Mesh(glow, doorGlowMat || M.hubWindowGlow);
    glowMesh.castShadow = false;
    g.add(glowMesh);

    // door lintel cap (little mushroom over the door)
    const lintel = new THREE.Mesh(GG.cap, M.capOrange);
    lintel.scale.set(1.28, 0.55, 1.28);
    lintel.position.set(0, 2.28, 2.34);
    lintel.castShadow = true;
    g.add(lintel);

    // hanging planter blossoms
    const blooms = new THREE.Mesh(GG.sphereLo, M.leaf);
    blooms.scale.set(0.34, 0.24, 0.34);
    blooms.position.set(-3.0, 3.3, 1.5);
    g.add(blooms);

    // chimney smoke
    const smoke = glowSprite(0xdff2e6, 1.5, 0.2);
    smoke.position.set(1.5, 6.5, -0.7);
    g.add(smoke);
    S.smoke.push({ sprite: smoke, phase: Math.random() * TAU, y0: 6.5, speed: 0.5 + Math.random() * 0.3 });

    // warm porch light
    const porch = glowSprite(0xffb861, 1.5, 0.5);
    porch.position.set(0, 2.05, 2.7);
    g.add(porch);
    S.pulses.push({ kind: "opacity", obj: porch, base: 0.5, amp: 0.18, speed: 1.9, phase: Math.random() * 6 });

    addCollider(cx, cz, 2.62 * scale, 0, y + 5.0 * scale);
    /* the cap is walkable: a dome platform the player can bounce / wall-kick onto */
    W.platforms.push({ x: cx, z: cz, r: 4.3 * scale * 0.9, y0: y + 3.62 * scale, h: 2.5 * scale, R: 4.3 * scale, dome: true, alive: true });
    S.houses = S.houses || []; S.houses.push({ x: cx, z: cz, s: scale, y: y, rot: rotY });
    S.avoid.push({ x: cx, z: cz, r: 3.2 * scale });
    return g;
  }

  function buildHouses() {
    const P = Math.PI;
    // north street canyon (frames the elder gate from spawn)
    makeHouse(-8.8, -19.5, P / 2, 1.05, M.capRed, 0);
    makeHouse(8.9, -22.8, -P / 2, 0.94, M.capOrange, 1);
    makeHouse(-9.6, -30.5, P / 2, 0.88, M.capRed, 1);
    makeHouse(9.4, -32.5, -P / 2, 1.02, M.capTeal, 0);
    // east street
    makeHouse(19, -9.8, 0, 0.96, M.capPlum, 0);
    makeHouse(27.5, 9.8, P, 1.08, M.capRed, 1);
    makeHouse(34, -9.6, 0, 0.85, M.capOrange, 1);
    // south street (spawn side)
    makeHouse(-9.4, 20.5, P / 2, 1.0, M.capRed, 0);
    makeHouse(9.6, 26.5, -P / 2, 0.92, M.capRed, 1);

    // scattered clutter around the plaza ring
    makeCrate(11.6, 2.6, 0.95, 0.3);
    makeCrate(-11.2, 4.2, 0.85, -0.4);
    makeCrate(-11.6, 3.2, 0.7, 0.9);
    makeCrate(7.2, -12.4, 0.9, 0.7);
    makeCrate(-7.6, -12.9, 0.78, -0.2);
    makeBarrel(12.4, -1.4, 0.2);
    makeBarrel(-12.6, -1.2, 1.1);
    makeBarrel(5.4, 12.2, 0.6);
    makePot(-4.6, 11.6);
    makePot(4.8, 11.9);
    makePot(12.9, 6.2);
  }

  /* =====================================================================
     ELDER MUSHROOM TREES : giant swaying caps
     ===================================================================== */
  function makeElderTree(x, z, h, r, tilt) {
    const THREE = T();
    const g = new THREE.Group();
    const y = heightAt(x, z);
    g.position.set(x, y, z);
    g.rotation.y = Math.random() * TAU;
    S.hub.add(g);

    const stalkH = h * 0.72;
    const stalk = meshAt(GG.stalkTaper, M.bark, 0, stalkH / 2, 0);
    stalk.scale.set(r * 0.3, stalkH, r * 0.3);
    g.add(stalk);

    // root flare
    const foot = meshAt(GG.cylLo, M.rootDark, 0, 0.35, 0);
    foot.scale.set(r * 0.44, 0.7, r * 0.44);
    g.add(foot);

    const capGroup = new THREE.Group();
    capGroup.position.y = stalkH;
    g.add(capGroup);

    const cap = new THREE.Mesh(GG.cap, M.capElder);
    cap.scale.set(r, r * 0.52, r);
    cap.rotation.z = tilt || 0;
    cap.castShadow = true; cap.receiveShadow = true;
    capGroup.add(cap);
    outlineOf(cap, 0.01, 0x1a1a1a);

    const gills = new THREE.Mesh(GG.gillCone, M.gills);
    gills.scale.set(r * 0.99, r * 0.34, r * 0.99);
    gills.rotation.z = tilt || 0;
    capGroup.add(gills);

    // spore lamps under the cap
    const lightAng = Math.random() * TAU;
    const sp = glowSprite(0x9ff2d8, r * 0.9, 0.36);
    sp.position.set(Math.cos(lightAng) * r * 0.45, -r * 0.16, Math.sin(lightAng) * r * 0.45);
    capGroup.add(sp);
    S.pulses.push({ kind: "opacity", obj: sp, base: 0.36, amp: 0.4, speed: 0.6 + Math.random() * 0.5, phase: Math.random() * 6 });

    // hanging vine
    const vine = meshAt(GG.cylLo, M.moss, r * 0.55, -r * 0.3, r * 0.2);
    vine.scale.set(0.05, r * 0.55, 0.05);
    capGroup.add(vine);

    S.sway.push({ obj: capGroup, phase: Math.random() * TAU, amp: 0.026 + Math.random() * 0.02, speed: 0.32 + Math.random() * 0.18 });
    addCollider(x, z, r * 0.34, 0, stalkH);
    S.avoid.push({ x, z, r: r * 0.62 });
    return g;
  }

  function buildElderTrees() {
    makeElderTree(-27, -17, 9.5, 5.4, 0.05);
    makeElderTree(28, -21, 10.5, 6.0, -0.06);
    makeElderTree(-31, 7, 8.2, 4.6, 0.04);
    makeElderTree(32, 8, 9.0, 5.2, -0.05);
    makeElderTree(-18, 28, 7.4, 4.2, 0.03);
    makeElderTree(21, 30, 8.4, 5.0, -0.04);
    makeElderTree(-39, -33, 12.0, 7.4, 0.06);
    makeElderTree(41, -36, 12.5, 7.8, -0.05);
    makeElderTree(-42, 27, 10.0, 6.2, 0.04);
    makeElderTree(43, 27, 9.2, 5.6, -0.03);
    makeElderTree(2, 43, 8.0, 5.0, 0.02);
    makeElderTree(-17, -44, 13.0, 7.0, 0.05);
    makeElderTree(17.5, -45, 13.5, 7.2, -0.05);
    // small mushroom clusters at their feet
    const spots = [[-24, -20], [25, -24], [-29, 4], [30, 5], [-16, 25], [19, 27], [38, 24]];
    for (let i = 0; i < spots.length; i++) {
      makeShroomCluster(spots[i][0], spots[i][1]);
    }
  }

  function makeShroomCluster(x, z) {
    const THREE = T();
    for (let i = 0; i < 3; i++) {
      const ox = (Math.random() - 0.5) * 2.6, oz = (Math.random() - 0.5) * 2.6;
      const s = 0.5 + Math.random() * 0.7;
      const stem = new THREE.Mesh(GG.cylLo, M.plaster);
      stem.scale.set(0.09 * s, 0.5 * s, 0.09 * s);
      stem.position.set(x + ox, heightAt(x + ox, z + oz) + 0.25 * s, z + oz);
      S.hub.add(stem);
      const cap = new THREE.Mesh(GG.capLo, M.glowMoss);
      cap.scale.set(0.34 * s, 0.22 * s, 0.34 * s);
      cap.position.set(x + ox, heightAt(x + ox, z + oz) + 0.52 * s, z + oz);
      S.hub.add(cap);
    }
  }

  /* =====================================================================
     VEGETATION : fences, grass, poppies, glowing mushrooms (instanced)
     ===================================================================== */
  function freeSpot(x, z, pad) {
    const av = S.avoid;
    for (let i = 0; i < av.length; i++) {
      const a = av[i], dx = x - a.x, dz = z - a.z, rr = a.r + pad;
      if (dx * dx + dz * dz < rr * rr) return false;
    }
    return true;
  }


  /* =====================================================================
     TRAVERSAL + SET PIECES : bounce caps, warp pods, rooftop access, spore pods
     ===================================================================== */
  function makeBouncer(x, z, scale) {
    const THREE = T();
    const y = heightAt(x, z), g = new THREE.Group();
    g.position.set(x, y, z); S.hub.add(g);
    const stem = meshAt(GG.taper, M.plaster, 0, 0.35, 0); stem.scale.set(0.5 * scale, 0.7, 0.5 * scale); g.add(stem);
    if (!M.bounceCap) M.bounceCap = A().mat.toon(0xffffff, { map: A().tex.capSpots(0xff6f9c, 0xfff0f6), emissive: 0xff3a78, emissiveIntensity: 0.25, noCache: true });
    const cap = new THREE.Mesh(GG.cap, M.bounceCap); cap.scale.set(1.55 * scale, 0.85 * scale, 1.55 * scale); cap.position.y = 0.62;
    cap.castShadow = true; cap.receiveShadow = true; g.add(cap); outlineOf(cap, 0.02, 0x2a0c18);
    const glow = glowSprite(0xff7aa8, 4.2 * scale, 0.5); glow.position.y = 0.9; g.add(glow);
    const ring = A().ringTelegraph(1.35 * scale, 0xff9ec4); ring.position.y = 0.06; ring.material.opacity = 0.55; g.add(ring);
    S.pulses.push({ kind: "ripple", obj: ring, base: 1.35 * scale, amp: 0.2, speed: 0.9, phase: Math.random() * 3 });
    S.avoid.push({ x: x, z: z, r: 2.2 });
    W.bouncers.push({ x: x, z: z, y: y + 0.62, r: 1.45 * scale, power: 17.5, mesh: cap, glow: glow, squash: 0 });
    return g;
  }

  function makeHookPod(x, y, z) {
    const THREE = T();
    const g = new THREE.Group(); g.position.set(x, y, z); S.hub.add(g);
    const core = new THREE.Mesh(GG.sphereLo, M.podGlow); core.scale.setScalar(0.3); g.add(core);
    const ring = new THREE.Mesh(GG.torus, M.podGlow); ring.scale.setScalar(0.75); ring.rotation.x = Math.PI / 2; g.add(ring);
    const glow = glowSprite(0xffb066, 2.8, 0.6); g.add(glow);
    W.hookPoints.push({ x: x, y: y, z: z, group: g, ring: ring, glow: glow });
    return g;
  }

  function makeSporePod(x, z) {
    const THREE = T();
    const g = new THREE.Group(); g.position.set(x, heightAt(x, z), z); S.hub.add(g);
    const stem = meshAt(GG.cylLo, M.root, 0, 0.32, 0); stem.scale.set(0.2, 0.7, 0.2); g.add(stem);
    const bulb = new THREE.Mesh(GG.sphere, M.pod); bulb.scale.set(0.62, 0.8, 0.62); bulb.position.y = 0.95; bulb.castShadow = true; g.add(bulb);
    outlineOf(bulb, 0.018, 0x180808);
    const glow = glowSprite(0xff8a4a, 2.6, 0.55); glow.position.y = 0.95; g.add(glow);
    S.pulses.push({ kind: "opacity", obj: glow, base: 0.55, amp: 0.35, speed: 2.2 + Math.random(), phase: Math.random() * 6 });
    W.registerBreakable({
      mesh: g, x: x, z: z, r: 0.6, hp: 16, debris: "pod", h: 1.6,
      onBreak: function () { sporeBlast(x, heightAt(x, z) + 0.8, z); }
    });
    return g;
  }
  /* an exploding spore pod: hurts foes (big on bosses), chains into neighbouring pods, nips the player a little */
  function sporeBlast(x, y, z) {
    const R = 4.6;
    G.vfx.ringShockwave({ x: x, y: y - 0.7, z: z }, 0xff9a5a, R); G.vfx.ringShockwave({ x: x, y: y - 0.7, z: z }, 0xffd79a, R * 0.6);
    G.vfx.burst({ x: x, y: y, z: z }, { count: 36, color: 0xffa04a, speed: 9, size: 0.55, life: 0.7, gravity: -2, spread: 1, tex: "glow" });
    G.vfx.petals({ x: x, y: y, z: z }); G.vfx.shake(0.45);
    try { G.sfx.play("explosion", { vol: 0.8 }); } catch (e) { /* ignore */ }
    const es = G.combat.entities;
    for (let i = 0; i < es.length; i++) {
      const e = es[i]; if (!e || e.team !== "enemy" || e.alive === false) continue;
      const p = e.object3D.position; if (Math.hypot(p.x - x, p.z - z) > R + (e.radius || 0.5)) continue;
      G.combat.applyDamage(e, e.isBoss ? 42 : 30, 9, e.isBoss ? 1.2 : 0.8, null, x, y, z, true, "player", 4);
    }
    const P = G.player;
    if (P && P.alive && Math.hypot(P.x - x, P.z - z) < 3 && P.y < y + 1.5) G.combat.applyDamage(P.ent, 9, 7, 0.3, null, x, y, z, false, "enemy", 3);
    W.hitBreakables({ x: x, y: y, z: z }, 3.6, 40, "player");
  }

  function buildTraversal() {
    /* bounce caps: two on the spawn street (teaches the verbs), the rest ring the houses nearest the plaza */
    [[-4.4, 28], [4.6, 31.5], [-4.7, 17.5], [4.9, 22.4], [-5.6, -24], [5.6, -27], [14.5, -5.4], [22.4, 5.4], [30.5, -4.8]].forEach(function (p) { makeBouncer(p[0], p[1], 1); });
    /* warp pods over the roofs + around the square */
    const H = S.houses || [];
    for (let i = 0; i < H.length; i++) makeHookPod(H[i].x, H[i].y + 9.4 * H[i].s, H[i].z);
    [[0, 8, 15.5], [14, 7.5, 6], [-14, 7.5, 6], [14.5, 8, -9], [-14.5, 8, -9], [0, 9, -16], [0, 6.5, 24], [0, 8, 36]].forEach(function (p) { makeHookPod(p[0], p[1], p[2]); });
    /* spore pods ring the square — hit one near a foe */
    [[12.6, 8.6], [-12.4, 8.9], [14.4, -6.8], [-14.4, -6.6], [0, -14.4], [7.4, 13.6], [-7.8, 13.2], [5, -13], [-5, -12.6]].forEach(function (p) { makeSporePod(p[0], p[1]); });
    /* extra breakable clutter so the square can be wrecked */
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.3, r = 12.2 + (i % 3) * 1.3;
      if (i % 3 === 0) makeBarrel(Math.cos(a) * r, Math.sin(a) * r, a); else if (i % 3 === 1) makeCrate(Math.cos(a) * r, Math.sin(a) * r, 0.8 + (i % 2) * 0.2, a); else makePot(Math.cos(a) * r, Math.sin(a) * r);
    }
    /* stacks of crates along the streets */
    [[3.2, 24, 0.9], [3.9, 24.4, 0.75], [-3.4, 33, 0.9], [-3.1, 12, 0.8], [3.4, -17, 0.85], [-3.6, -21, 0.9], [-3.4, -21.4, 0.7]].forEach(function (c, k) { makeCrate(c[0], c[1], c[2], k * 0.7); });
  }

  function buildFences() {
    const THREE = T();
    const runs = [
      [-6.4, -14.0, -6.4, -17.6], [-6.4, -22.5, -6.4, -27.4], [-6.4, -32.6, -6.4, -35.4],
      [6.4, -14.0, 6.4, -19.2], [6.4, -25.4, 6.4, -30.2], [6.4, -34.2, 6.4, -36.4],
      [14.0, -6.4, 18.6, -6.4], [21.6, -6.4, 25.4, -6.4],
      [14.0, 6.4, 20.4, 6.4], [23.4, 6.4, 25.8, 6.4],
      [-6.4, 14.0, -6.4, 18.6], [-6.4, 23.6, -6.4, 30.4],
      [6.4, 14.0, 6.4, 22.4]
    ];
    let total = 0;
    const counts = [];
    for (let i = 0; i < runs.length; i++) {
      const dx = runs[i][2] - runs[i][0], dz = runs[i][3] - runs[i][1];
      const len = Math.sqrt(dx * dx + dz * dz);
      const n = Math.max(2, Math.round(len / 0.5));
      counts.push(n);
      total += n;
    }
    const pickets = new THREE.InstancedMesh(GG.picket, M.woodPale, total);
    pickets.castShadow = true; pickets.receiveShadow = true;
    const rails = new THREE.InstancedMesh(GG.box, M.woodPale, runs.length * 2);
    rails.castShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    const eul = new THREE.Euler();
    let k = 0, rk = 0;
    for (let i = 0; i < runs.length; i++) {
      const r0 = runs[i];
      const dx = r0[2] - r0[0], dz = r0[3] - r0[1];
      const len = Math.sqrt(dx * dx + dz * dz);
      const ang = Math.atan2(dx, dz);
      const n = counts[i];
      for (let j = 0; j < n; j++) {
        const t = (j + 0.5) / n;
        const x = r0[0] + dx * t, z = r0[1] + dz * t;
        eul.set(0, ang + (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.05);
        q.setFromEuler(eul);
        pos.set(x, heightAt(x, z), z);
        scl.set(1, 0.9 + Math.random() * 0.22, 1);
        m4.compose(pos, q, scl);
        pickets.setMatrixAt(k++, m4);
      }
      for (let h = 0; h < 2; h++) {
        const y = h ? 0.72 : 0.38;
        eul.set(0, ang, 0);
        q.setFromEuler(eul);
        pos.set((r0[0] + r0[2]) / 2, heightAt((r0[0] + r0[2]) / 2, (r0[1] + r0[3]) / 2) + y, (r0[1] + r0[3]) / 2);
        scl.set(0.06, 0.07, len);
        m4.compose(pos, q, scl);
        rails.setMatrixAt(rk++, m4);
      }
    }
    pickets.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    S.hub.add(pickets);
    S.hub.add(rails);
  }

  function buildVegetation() {
    const THREE = T();
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    const eul = new THREE.Euler();
    const col = new THREE.Color();

    // ---- grass tufts ----
    const NG = 980;
    const grassMat = A().mat.toon(0xffffff, {
      map: TX.blade, transparent: true, side: THREE.DoubleSide, noCache: true
    });
    grassMat.alphaTest = 0.42;
    A().windify(grassMat, 0.2);
    grassMat.depthWrite = true;
    const grass = new THREE.InstancedMesh(GG.cross, grassMat, NG);
    grass.castShadow = false; grass.receiveShadow = true;
    let gi = 0, guard = 0;
    while (gi < NG && guard < NG * 14) {
      guard++;
      const a = Math.random() * TAU;
      const r = 15.8 + Math.pow(Math.random(), 0.7) * 34;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (z < -52) continue;
      if (!freeSpot(x, z, 0.5)) continue;
      const s = 0.55 + Math.random() * 0.85;
      eul.set(0, Math.random() * TAU, 0);
      q.setFromEuler(eul);
      pos.set(x, heightAt(x, z) - 0.02, z);
      scl.set(0.9 + Math.random() * 0.8, s, 1);
      m4.compose(pos, q, scl);
      grass.setMatrixAt(gi, m4);
      const tint = 0.82 + Math.random() * 0.3;
      col.setRGB(tint * 0.92, tint, tint * 0.85);
      if (grass.setColorAt) grass.setColorAt(gi, col);
      gi++;
    }
    grass.count = gi;
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    S.hub.add(grass);

    // ---- poppies ----
    const NP = 240;
    const poppyMat = A().mat.toon(0xffffff, { map: TX.poppy, transparent: true, side: THREE.DoubleSide, noCache: true });
    poppyMat.alphaTest = 0.4;
    A().windify(poppyMat, 0.14);
    const poppies = new THREE.InstancedMesh(GG.cross, poppyMat, NP);
    poppies.castShadow = false;
    let pi = 0, pg = 0;
    while (pi < NP && pg < NP * 16) {
      pg++;
      const a = Math.random() * TAU;
      const r = 15.4 + Math.pow(Math.random(), 0.6) * 30;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (z < -52 || !freeSpot(x, z, 0.4)) continue;
      const s = 0.45 + Math.random() * 0.4;
      eul.set(0, Math.random() * TAU, (Math.random() - 0.5) * 0.15);
      q.setFromEuler(eul);
      pos.set(x, heightAt(x, z) - 0.01, z);
      scl.set(0.6 * s, s, 1);
      m4.compose(pos, q, scl);
      poppies.setMatrixAt(pi, m4);
      pi++;
    }
    poppies.count = pi;
    poppies.instanceMatrix.needsUpdate = true;
    S.hub.add(poppies);

    // ---- little glowing mushrooms (two instanced meshes sharing transforms) ----
    const NS = 130;
    const stemMat = A().mat.toon(0xdfdcc8, { noCache: true });
    const capMat = new THREE.MeshBasicMaterial({ color: 0x9ff2d8 });
    const stems = new THREE.InstancedMesh(GG.shroomStem, stemMat, NS);
    const caps = new THREE.InstancedMesh(GG.shroomCap, capMat, NS);
    caps.castShadow = false;
    let si = 0, sg = 0;
    while (si < NS && sg < NS * 16) {
      sg++;
      // clustered near trees / map rim
      const a = Math.random() * TAU;
      const r = 16 + Math.pow(Math.random(), 0.8) * 30;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (z < -52 || !freeSpot(x, z, 0.15)) continue;
      const s = 0.7 + Math.random() * 1.5;
      eul.set(0, Math.random() * TAU, 0);
      q.setFromEuler(eul);
      pos.set(x, heightAt(x, z), z);
      scl.set(s, s, s);
      m4.compose(pos, q, scl);
      stems.setMatrixAt(si, m4);
      caps.setMatrixAt(si, m4);
      si++;
    }
    stems.count = si; caps.count = si;
    stems.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    S.hub.add(stems);
    S.hub.add(caps);

    buildFences();
  }

  /* =====================================================================
     ELDER GATE : colossal mushroom wall + sealed glowing gate
     ===================================================================== */
  function buildGate() {
    const THREE = T();
    const gz = W.gatePos.z;
    const g = new THREE.Group();
    S.hub.add(g);

    // mass of the elder wall behind the gate
    const wall = meshAt(GG.box, M.barkDark, 0, 9, gz - 9);
    wall.scale.set(34, 20, 12);
    g.add(wall);

    // two colossal trunks flanking the gate
    for (let s = -1; s <= 1; s += 2) {
      const trunk = meshAt(GG.taper, M.bark, s * 12.5, 9, gz - 2);
      trunk.scale.set(6.2, 19, 6.2);
      g.add(trunk);
      const cap = new THREE.Mesh(GG.cap, M.capElder);
      cap.scale.set(15, 7.4, 15);
      cap.position.set(s * 12.5, 18.4, gz - 2);
      cap.rotation.z = s * -0.07;
      cap.castShadow = true; cap.receiveShadow = true;
      g.add(cap);
      outlineOf(cap, 0.008, 0x181818);
      const gills = new THREE.Mesh(GG.gillCone, M.gills);
      gills.scale.set(14.6, 4.4, 14.6);
      gills.position.set(s * 12.5, 18.2, gz - 2);
      g.add(gills);
      addCollider(s * 12.5, gz - 2, 6.4, 0, 19);
    }

    // overarching cap above the doorway
    const archCap = new THREE.Mesh(GG.cap, M.capElder);
    archCap.scale.set(20, 9, 17);
    archCap.position.set(0, 20.5, gz - 3);
    archCap.castShadow = true; archCap.receiveShadow = true;
    g.add(archCap);
    outlineOf(archCap, 0.008, 0x181818);

    // root arch frame (half torus) + pillars
    const arch = meshAt(GG.torus, M.root, 0, 0.2, gz);
    arch.scale.set(7.2, 11.5, 1.4);
    arch.geometry = new THREE.TorusGeometry(1, 0.16, 7, 26, Math.PI);
    g.add(arch);
    for (let s = -1; s <= 1; s += 2) {
      const pil = meshAt(GG.cyl, M.root, s * 7.0, 4.4, gz);
      pil.scale.set(1.15, 9.2, 1.15);
      g.add(pil);
      const knob = meshAt(GG.sphereLo, M.root, s * 7.0, 9.1, gz);
      knob.scale.setScalar(1.35);
      g.add(knob);
      addCollider(s * 7.0, gz, 1.3, 0, 9);
      // hanging root strands
      for (let i = 0; i < 3; i++) {
        const rs = meshAt(GG.cylLo, M.rootDark, s * (4.6 + i * 0.9), 5.6 - i * 1.3, gz + 0.6);
        rs.scale.set(0.09, 3.4 - i * 0.7, 0.09);
        g.add(rs);
      }
    }

    // doors (two halves sliding apart)
    const doorMat = new THREE.MeshToonMaterial({
      color: 0x6d5442, map: repeatTex(A().tex.wood(), 2, 3),
      gradientMap: A().tex.toonGradient(), emissive: 0x1a2d26, emissiveIntensity: 0.4
    });
    for (let s = -1; s <= 1; s += 2) {
      const half = new THREE.Group();
      half.position.set(s * 2.35, 0, gz);
      g.add(half);
      const panel = meshAt(GG.box, doorMat, 0, 5.4, 0);
      panel.scale.set(4.55, 10.8, 0.85);
      half.add(panel);
      outlineOf(panel, 0.008, 0x141210);
      // iron bands
      for (let i = 0; i < 3; i++) {
        const band = meshAt(GG.box, M.rootDark, 0, 2.2 + i * 3.0, 0.5);
        band.scale.set(4.4, 0.26, 0.1);
        band.castShadow = false;
        half.add(band);
      }
      // rune plate
      const rune = new THREE.Mesh(GG.plane, new THREE.MeshBasicMaterial({
        map: A().tex.glyphs(), transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false, color: 0x9ff2d8
      }));
      rune.scale.set(2.6, 2.6, 1);
      rune.position.set(0, 5.6, 0.46);
      half.add(rune);
      // handle ring
      const ring = meshAt(GG.torus, M.woodDark, -s * 1.5, 4.6, 0.5);
      ring.scale.setScalar(0.34);
      half.add(ring);
      if (s < 0) S.gate.left = half; else S.gate.right = half;
    }

    // glowing seam + light + sprites
    const seam = new THREE.Mesh(GG.box, M.seamGlow);
    seam.scale.set(0.16, 10.6, 0.95);
    seam.position.set(0, 5.4, gz);
    seam.castShadow = false;
    g.add(seam);
    S.gate.seam = seam;
    S.gate.seamA = new THREE.Color(0x9ff2d8);
    S.gate.seamB = new THREE.Color(0x08120f);

    S.gate.glowA = glowSprite(0x9ff2d8, 9, 0.55);
    S.gate.glowA.position.set(0, 6.2, gz + 1.2);
    g.add(S.gate.glowA);
    S.gate.glowB = glowSprite(0xffd79a, 5.5, 0.4);
    S.gate.glowB.position.set(0, 10.6, gz + 1.0);
    g.add(S.gate.glowB);
    S.gate.glow = S.gate.glowA;

    const gl = takeLight(9, 20);
    gl.position.set(0, 4.5, gz + 2.2);
    gl.color.setHex(0x9ff2d8);
    S.gate.light = gl;

    // gate colliders (released by openGate)
    S.gateColliders.push(addCollider(0, gz, 5.4, 0, 12));
    S.gateColliders.push(addCollider(-3.2, gz, 3.4, 0, 12));
    S.gateColliders.push(addCollider(3.2, gz, 3.4, 0, 12));

    // decorative glow-moss tufts along the wall foot
    for (let i = 0; i < 7; i++) {
      const x = -10 + i * 3.3;
      const m = new THREE.Mesh(GG.sphereLo, M.glowMoss);
      m.scale.set(1.1, 0.4, 0.9);
      m.position.set(x, 0.18, gz - 0.4);
      m.castShadow = false;
      g.add(m);
    }
  }

  /* =====================================================================
     ROTHEART ARENA : cavern inside the elder shroom, 80u north
     ===================================================================== */
  function buildArena() {
    const THREE = T();
    const cx = W.arenaCenter.x, cz = W.arenaCenter.z;

    const floor = new THREE.Mesh(new THREE.CircleGeometry(23.6, 64), M.arenaFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.012, cz);
    floor.receiveShadow = true;
    S.arena.add(floor);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(22.8, 0.42, 6, 80), M.rootDark);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(cx, 0.12, cz);
    rim.receiveShadow = true;
    S.arena.add(rim);

    // cavern shell (gap toward the south mouth)
    M.arenaShell = A().mat.toon(0x9c5a55, {
      map: repeatTex(TX.rock, 6, 3), side: THREE.DoubleSide, noCache: true,
      emissive: 0x2a0a08, emissiveIntensity: 0.55
    });
    const wallGeo = new THREE.CylinderGeometry(24.2, 25.6, 20, 44, 1, true, 0.32, TAU - 0.64);
    const wall = new THREE.Mesh(wallGeo, M.arenaShell);
    wall.position.set(cx, 10, cz);
    wall.receiveShadow = true;
    S.arena.add(wall);

    M.arenaCeil = A().mat.toon(0x5a2a2a, { side: THREE.BackSide, noCache: true, emissive: 0x240707, emissiveIntensity: 0.7 });
    const ceil = new THREE.Mesh(GG.cap, M.arenaCeil);
    ceil.scale.set(26, 13, 26);
    ceil.position.set(cx, 12.6, cz);
    S.arena.add(ceil);

    // ---- the Rotheart itself : glowing organ mass at the far end ----
    const heartG = new THREE.Group();
    heartG.position.set(cx, 9.5, cz - 17.5);
    S.arena.add(heartG);
    const heart = new THREE.Mesh(GG.sphere, M.heartGlow);
    heart.scale.set(5.2, 6.4, 5.2);
    heartG.add(heart);
    for (let s = -1; s <= 1; s += 2) {
      const lobe = new THREE.Mesh(GG.sphere, M.heartGlow);
      lobe.scale.set(3.4, 3.2, 3.4);
      lobe.position.set(s * 3.4, 2.6, 0);
      heartG.add(lobe);
    }
    for (let i = 0; i < 6; i++) {
      const cage = meshAt(GG.torus, M.rootDark, 0, 0, 0, false);
      cage.rotation.set(i * 0.62, i * 1.07, i * 0.35);
      cage.scale.setScalar(6.8 + i * 0.42);
      heartG.add(cage);
    }
    const hGlow = glowSprite(0xff5a3a, 30, 0.4);
    heartG.add(hGlow);
    S.pulses.push({ kind: "opacity", obj: hGlow, base: 0.4, amp: 0.32, speed: 1.15, phase: 0 });
    const hGlow2 = glowSprite(0xffd0a0, 9, 0.5);
    heartG.add(hGlow2);
    S.pulses.push({ kind: "opacity", obj: hGlow2, base: 0.5, amp: 0.4, speed: 1.9, phase: 1.2 });

    // ---- giant root arches ringing the cavern ----
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.52;
      const rx = cx + Math.cos(a) * 19.4, rz = cz + Math.sin(a) * 19.4;
      const arch = meshAt(GG.torus, M.root, rx, 0.2, rz);
      arch.geometry = new THREE.TorusGeometry(1, 0.19, 7, 22, Math.PI);
      arch.scale.set(6.4, 11.5, 2.2);
      arch.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      arch.rotation.x = -0.1;
      S.arena.add(arch);
      // buttress roots
      for (let s = -1; s <= 1; s += 2) {
        const bx = rx + Math.cos(a + Math.PI / 2) * s * 6.2;
        const bz = rz + Math.sin(a + Math.PI / 2) * s * 6.2;
        const br = meshAt(GG.cyl, M.rootDark, bx, 4.6, bz);
        br.scale.set(1.15, 9.4, 1.15);
        br.rotation.z = s * 0.08;
        S.arena.add(br);
      }
    }

    // ---- spore geysers (telegraph anchors) ----
    const gAngles = [28, 88, 148, 208, 268, 328];
    for (let i = 0; i < gAngles.length; i++) {
      const a = gAngles[i] * DEG;
      const gx = cx + Math.cos(a) * 15.2, gz = cz + Math.sin(a) * 15.2;
      makeGeyser(gx, gz);
      W.geysers.push({ x: gx, z: gz, r: 2.4, angle: a });
    }

    // ---- central dais ----
    const dais = meshAt(GG.cyl, M.arenaFloor, cx, 0.18, cz);
    dais.scale.set(5.5, 0.36, 5.5);
    S.arena.add(dais);
    const daisRim = new THREE.Mesh(GG.torus, M.arenaGlow);
    daisRim.scale.set(5.5, 5.5, 5.5);
    daisRim.rotation.x = Math.PI / 2;
    daisRim.position.set(cx, 0.36, cz);
    S.arena.add(daisRim);
    const glyph = new THREE.Mesh(GG.circle, new THREE.MeshBasicMaterial({
      map: A().tex.glyphs(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
      depthWrite: false, color: 0xff8a5a
    }));
    glyph.rotation.x = -Math.PI / 2;
    glyph.position.set(cx, 0.38, cz);
    glyph.scale.setScalar(4.4);
    S.arena.add(glyph);
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4 + 0.4;
      const px = cx + Math.cos(a) * 5.0, pz = cz + Math.sin(a) * 5.0;
      const pil = meshAt(GG.cyl, M.rootDark, px, 1.5, pz);
      pil.scale.set(0.34, 2.6, 0.34);
      S.arena.add(pil);
      const tip = glowSprite(0xff7a4a, 2.2, 0.6);
      tip.position.set(px, 2.95, pz);
      S.arena.add(tip);
      S.pulses.push({ kind: "opacity", obj: tip, base: 0.6, amp: 0.35, speed: 2.4, phase: i * 1.4 });
    }

    // ---- breakable spore pods ----
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + 0.26;
      makePod(cx + Math.cos(a) * 9.4, cz + Math.sin(a) * 9.4, i);
    }

    // ---- hanging root curtain at the mouth ----
    for (let i = 0; i < 9; i++) {
      const x = cx - 8 + i * 2;
      const z = cz + 21.4 + Math.sin(i) * 0.6;
      const root = meshAt(GG.cylLo, M.rootDark, x, 8.2, z);
      root.scale.set(0.16, 5.6 + (i % 3) * 1.6, 0.16);
      S.arena.add(root);
    }

    // ---- arena mood lights (0 intensity until setArena('boss')) ----
    const l1 = new THREE.PointLight(0xff7a3a, 0, 52, 2);
    l1.position.set(cx, 8.5, cz);
    l1.userData.baseI = 70;
    l1.visible = false;
    S.scene.add(l1);
    S.arenaLights.push(l1);
    const l2 = new THREE.PointLight(0xff3a2a, 0, 38, 2);
    l2.position.set(cx, 4.2, cz + 15);
    l2.userData.baseI = 26;
    l2.visible = false;
    S.scene.add(l2);
    S.arenaLights.push(l2);
  }

  function makeGeyser(x, z) {
    const THREE = T();
    const vent = meshAt(GG.cone, M.rootDark, x, 0.42, z);
    vent.scale.set(1.5, 1.0, 1.5);
    S.arena.add(vent);
    const pool = new THREE.Mesh(GG.circle, M.geyserGlow);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.5, z);
    pool.scale.setScalar(1.15);
    S.arena.add(pool);
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0xffb066, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const jet = new THREE.Mesh(GG.cone, jetMat);
    jet.scale.set(0.9, 3.0, 0.9);
    jet.position.set(x, 2.0, z);
    S.arena.add(jet);
    S.pulses.push({ kind: "jet", obj: jet, base: 3.0, amp: 0.35, speed: 0.85, phase: x * 0.31 + z * 0.17 });
    const sp = glowSprite(0xffb066, 4.2, 0.5);
    sp.position.set(x, 1.0, z);
    S.arena.add(sp);
    S.pulses.push({ kind: "opacity", obj: sp, base: 0.5, amp: 0.35, speed: 1.4, phase: z * 0.2 });
    const spore = glowSprite(0xffe0b0, 2.0, 0.4);
    spore.position.set(x, 3.4, z);
    S.arena.add(spore);
    S.pulses.push({ kind: "opacity", obj: spore, base: 0.4, amp: 0.5, speed: 2.1, phase: x });
  }

  function makePod(x, z) {
    const THREE = T();
    const g = new THREE.Group();
    g.position.set(x, heightAt(x, z), z);
    S.arena.add(g);

    const stem = meshAt(GG.cylLo, M.root, 0, 0.4, 0);
    stem.scale.set(0.26, 0.9, 0.26);
    g.add(stem);
    const bulb = new THREE.Mesh(GG.sphere, M.pod);
    bulb.scale.set(1.02, 1.3, 1.02);
    bulb.position.y = 1.25;
    bulb.castShadow = true; bulb.receiveShadow = true;
    g.add(bulb);
    outlineOf(bulb, 0.018, 0x180808);
    const glow = glowSprite(0xff9a5a, 2.8, 0.55);
    glow.position.y = 1.25;
    g.add(glow);
    S.pulses.push({ kind: "opacity", obj: glow, base: 0.55, amp: 0.35, speed: 1.5 + Math.random(), phase: Math.random() * 6 });

    W.registerBreakable({ mesh: g, x, z, r: 1.05, hp: 45, debris: "shroom", h: 2.4 });
    return g;
  }

  /* =====================================================================
     WORLD BOUNDS : invisible wall rings (hub perimeter, corridor, cavern)
     ===================================================================== */
  function buildBounds() {
    // hub perimeter — gap left open for the gate corridor
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * TAU;
      const x = Math.cos(a) * 54, z = Math.sin(a) * 54;
      if (z < -24 && Math.abs(x) < 13) continue;
      addCollider(x, z, 4.2, 0, 7);
    }
    // corridor side walls between gate and cavern
    for (let z = -42; z >= -58; z -= 3.2) {
      addCollider(-9.6, z, 3.3, 0, 12);
      addCollider(9.6, z, 3.3, 0, 12);
    }
    // cavern wall ring — gap at the south mouth
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      const x = W.arenaCenter.x + Math.cos(a) * 24.2;
      const z = W.arenaCenter.z + Math.sin(a) * 24.2;
      if (Math.sin(a) > 0.84 && Math.abs(x) < 7.5) continue;
      addCollider(x, z, 3.4, 0, 16);
    }
  }

  /* =====================================================================
     BREAKABLES
     ===================================================================== */
  W.registerBreakable = function (o) {
    if (!o || !o.mesh) return null;
    const hp = o.hp || 30;
    const rec = {
      mesh: o.mesh, x: o.x, z: o.z, r: o.r || 1, hp: hp, maxHp: hp,
      debris: o.debris || "wood", alive: true, kind: o.kind || "prop",
      onBreak: o.onBreak || null, onHit: o.onHit || null,
      flash: 0, deadT: 0,
      baseScale: o.mesh.scale ? o.mesh.scale.x : 1,
      meshY: o.mesh.position ? o.mesh.position.y : 0,
      meshRotZ: o.mesh.rotation ? o.mesh.rotation.z : 0
    };
    rec.collider = addCollider(o.x, o.z, rec.r, 0, o.h === undefined ? rec.r * 1.7 : o.h);
    rec.collider.breakable = rec;
    S.breakables.push(rec);
    W.breakables.push(rec);
    return rec;
  };

  const DROPS = { wood: ["heal", 0.28, 1], stall: ["heal", 1, 3], stone: ["mana", 0.5, 1], shroom: ["mana", 0.8, 2], pod: ["mana", 0.0, 0], glass: ["mana", 0.3, 1], clay: ["mana", 0.5, 1] };
  function destroyBreakable(b) {
    if (!b.alive) return;
    b.alive = false;
    b.deadT = 0;
    if (b.collider) {
      const i = W.colliders.indexOf(b.collider);
      if (i >= 0) W.colliders.splice(i, 1);
      b.collider = null;
    }
    if (G.stats) G.stats.breaks = (G.stats.breaks || 0) + 1;
    const y = (b.mesh ? b.mesh.position.y : 0) + 0.7;
    if (G.bus && G.bus.emit) G.bus.emit("breakable:burst", { scheme: b.debris, x: b.x, y: y, z: b.z });
    const kind = b.debris === "stone" ? "clay" : b.debris;
    const big = b.debris === "stall" ? 1.5 : Math.max(0.8, (b.r || 1) * 1.1);
    if (G.debris) G.debris.burst(b.x, y + 0.4, b.z, { kind: kind, size: big, power: 5 + big * 2, up: 6 });
    const dr = DROPS[b.debris];
    if (dr && G.pickups && Math.random() < dr[1]) G.pickups.spawn(b.x, y, b.z, dr[0], Math.max(1, dr[2]));
    if (G.sfx && typeof G.sfx.play === "function") {
      try { G.sfx.play(b.debris === "wood" || b.debris === "stall" ? "breakWood" : "breakShroom", { vol: 0.9 }); } catch (e) { /* audio optional */ }
    }
    if (G.vfx) { try { G.vfx.shake(b.debris === "stall" ? 0.22 : 0.12); G.vfx.hitSpark && G.vfx.hitSpark({ x: b.x, y: y, z: b.z }); } catch (e2) { /* ignore */ } }
    if (G.input) G.input.haptic(b.debris === "stall" ? 30 : 12);
    if (b.mesh) { b.mesh.visible = false; }
    S.shatterCount = (S.shatterCount || 0) + 1;
    if (b.onBreak) b.onBreak(b);
  }

  W.hitBreakables = function (pos, r, dmg, team) {
    if (!S.built || !pos) return 0;
    const px = pos.x, pz = pos.z;
    const py = typeof pos.y === "number" ? pos.y : 0;
    const rad = r || 0.8;
    const d0 = typeof dmg === "number" && dmg > 0 ? dmg : 1;
    let hits = 0;
    for (let i = 0; i < S.breakables.length; i++) {
      const b = S.breakables[i];
      if (!b.alive) continue;
      const dx = px - b.x, dz = pz - b.z, rr = rad + b.r;
      if (dx * dx + dz * dz > rr * rr) continue;
      if (py > (b.collider ? b.collider.y1 : 2) + 1.4) continue;
      b.hp -= d0;
      b.flash = 1;
      hits++;
      if (b.onHit) b.onHit(b, d0);
      if (b.hp <= 0) destroyBreakable(b);
    }
    return hits;
  };

  /* =====================================================================
     GATE + ARENA MOOD API
     ===================================================================== */
  function releaseGateColliders() {
    for (let i = 0; i < S.gateColliders.length; i++) {
      const idx = W.colliders.indexOf(S.gateColliders[i]);
      if (idx >= 0) W.colliders.splice(idx, 1);
    }
    S.gateColliders.length = 0;
  }

  W.openGate = function () {
    if (!S.built || S.gate.open) return false;
    S.gate.open = true;
    S.gate.t = 0;
    if (G.bus && G.bus.emit) {
      G.bus.emit("gate:open", { x: W.gatePos.x, z: W.gatePos.z, duration: 2.2 });
    }
    if (G.sfx && typeof G.sfx.play === "function") {
      try { G.sfx.play("portal", { pos: { x: W.gatePos.x, y: 5, z: W.gatePos.z } }); } catch (e) {}
    }
    return true;
  };
  W.isGateOpen = function () { return !!S.gate.open; };

  /* mood only: 'boss' darkens the sky a little for the duel; beastArena() pushes it to full crimson */
  W.setArena = function (name) {
    S.arenaTarget = name === "boss" ? 0.3 : 0;
    if (G.bus && G.bus.emit) G.bus.emit("world:arena", { name: name });
    return W;
  };
  W.setBeacon = function (on) { S.beaconOn = !!on; };
  W.beastArena = function (on) { S.arenaTarget = on ? 1 : 0; return W; };
  /* smash every breakable within r of (x,z) — used by boss shockwaves / nova / slam */
  const _sp = { x: 0, y: 0, z: 0 };
  W.shatterNear = function (x, z, r, dmg) { _sp.x = x; _sp.z = z; return W.hitBreakables(_sp, r, dmg || 30, "enemy"); };
  W.getArenaMood = function () { return S.arenaMix; };

  /* =====================================================================
     UPDATE  (no allocations)
     ===================================================================== */
  W.update = function (dt, t) {
    if (!S.built) return;
    dt = (typeof dt === "number" && dt > 0) ? Math.min(dt, 0.05) : 0.016;
    S.time += dt;
    const time = (typeof t === "number" && isFinite(t)) ? t : S.time;
    A().uniforms.uTime.value = time;
    /* the shadow frustum follows Mira (texel-snapped, no shimmer): sharper shadows, fewer casters */
    if (S.key && G.player) {
      const sn = 60 / S.key.shadow.mapSize.x, tx = Math.round(G.player.x / sn) * sn, tz = Math.round(G.player.z / sn) * sn;
      S.key.target.position.set(tx, 0, tz); S.key.position.set(tx + 28, 44, tz + 22);
      S.key.target.updateMatrixWorld();
    }
    /* objective beacon */
    if (S.beacon) {
      S.beacon.visible = S.beaconOn;
      if (S.beaconOn) { S.beacon.material.opacity = 0.16 + 0.07 * Math.sin(time * 2.2); S.beacon.rotation.y = time * 0.3; }
    }
    const sin = Math.sin, cos = Math.cos;

    /* --- giant caps breathe --- */
    for (let i = 0; i < S.sway.length; i++) {
      const s = S.sway[i];
      s.obj.rotation.z = sin(time * s.speed + s.phase) * s.amp;
      s.obj.rotation.x = cos(time * s.speed * 0.77 + s.phase) * s.amp * 0.65;
    }

    /* --- lanterns flicker + bob --- */
    for (let i = 0; i < S.lanterns.length; i++) {
      const l = S.lanterns[i];
      if (l.broken) continue;
      const f = 0.88 + 0.12 * sin(time * 3.1 + l.phase) + 0.05 * sin(time * 7.7 + l.phase * 2.3);
      l.light.intensity = l.baseI * f;
      l.sprite.material.opacity = 0.6 * f + 0.12;
      l.sprite.position.y = 2.6 + sin(time * 1.2 + l.phase) * 0.035;
      if (l.bulb) l.bulb.scale.setScalar(0.19 * (0.92 + 0.12 * f));
    }

    /* --- chimney smoke --- */
    for (let i = 0; i < S.smoke.length; i++) {
      const s = S.smoke[i];
      let k = (time * s.speed + s.phase) % 1;
      if (k < 0) k += 1;
      s.sprite.position.y = s.y0 + k * 2.4;
      s.sprite.position.x = 1.5 + sin(k * 4 + s.phase) * 0.22;
      s.sprite.material.opacity = 0.2 * (1 - k) * Math.min(1, k * 5);
      s.sprite.scale.setScalar(1.0 + k * 2.4);
    }

    /* --- glow pulses / ripples / geyser jets --- */
    for (let i = 0; i < S.pulses.length; i++) {
      const p = S.pulses[i];
      const s = 0.5 + 0.5 * sin(time * p.speed + p.phase);
      if (p.kind === "opacity") {
        p.obj.material.opacity = p.base * (1 - p.amp + p.amp * s);
      } else if (p.kind === "emissive") {
        if (p.mat.emissiveIntensity !== undefined) p.mat.emissiveIntensity = p.base * (1 - p.amp * 0.5 + p.amp * s);
        else if (p.mat.color && p.baseCol) p.mat.color.copy(p.baseCol).multiplyScalar(0.85 + 0.3 * s);
      } else if (p.kind === "ripple") {
        const k = (time * p.speed + p.phase) % 1;
        p.obj.scale.setScalar(p.base * (0.75 + k * 1.5));
        p.obj.material.opacity = 0.42 * (1 - k);
      } else if (p.kind === "jet") {
        p.obj.scale.y = p.base * (0.65 + 0.6 * s);
        p.obj.material.opacity = 0.18 + 0.22 * s;
      }
    }

    /* --- ambient spore motes (single shared buffer) --- */
    const mp = S.motePos, mv = S.moteVel;
    if (mp) {
      const n = mp.length / 3;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        mp[i3 + 1] += mv[i3] * dt;
        mp[i3] += sin(time * 0.55 + mv[i3 + 1]) * mv[i3 + 2] * dt;
        mp[i3 + 2] += cos(time * 0.47 + mv[i3 + 1]) * mv[i3 + 2] * dt;
        if (mp[i3 + 1] > 17.5) {
          mp[i3 + 1] = 0.25;
          const a = Math.random() * TAU, r = 3.5 + Math.random() * 42;
          mp[i3] = cos(a) * r;
          mp[i3 + 2] = sin(a) * r;
        }
        const d2 = mp[i3] * mp[i3] + mp[i3 + 2] * mp[i3 + 2];
        if (d2 > 2500) { mp[i3] *= 0.985; mp[i3 + 2] *= 0.985; }
      }
      S.moteGeo.attributes.position.needsUpdate = true;
    }

    /* --- fountain drips --- */
    const dp = S.dripPos, dm = S.dripMeta;
    if (dp) {
      const n = dp.length / 3;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        dp[i3 + 1] -= dm[i3 + 2] * dt * 2.4;
        if (dp[i3 + 1] < 0.62) {
          const a = Math.random() * TAU;
          dp[i3] = cos(a) * dm[i3];
          dp[i3 + 2] = sin(a) * dm[i3];
          dp[i3 + 1] = dm[i3 + 1];
        }
      }
      S.dripGeo.attributes.position.needsUpdate = true;
    }

    /* --- gate opening --- */
    const gate = S.gate;
    if (gate.open && gate.t < 1) {
      gate.t = Math.min(1, gate.t + dt / 2.2);
      const e = 1 - Math.pow(1 - gate.t, 3);
      if (gate.left) { gate.left.position.x = -(2.35 + 5.1 * e); gate.left.position.y = -0.45 * e; }
      if (gate.right) { gate.right.position.x = (2.35 + 5.1 * e); gate.right.position.y = -0.45 * e; }
      if (gate.t > 0.28) releaseGateColliders();
      if (gate.seam) {
        M.seamGlow.color.copy(gate.seamA).lerp(gate.seamB, e);
        gate.seam.scale.y = 10.6 * (1 - e);
      }
      if (gate.glowA) gate.glowA.material.opacity = 0.55 * (1 - e * 0.9);
      if (gate.glowB) gate.glowB.material.opacity = 0.4 * (1 - e * 0.9);
      if (gate.light) gate.light.intensity = 9 * (1 - e * 0.65);
    } else if (!gate.open && gate.glowA) {
      gate.glowA.material.opacity = 0.46 + 0.14 * sin(time * 1.7);
      gate.glowB.material.opacity = 0.32 + 0.1 * sin(time * 2.3 + 1.2);
      if (gate.light) gate.light.intensity = 8.4 + 1.4 * sin(time * 2.1);
    }

    /* --- arena mood lerp (~1.5s) --- */
    S.arenaMix = U.damp(S.arenaMix, S.arenaTarget, 2.6, dt);
    if (Math.abs(S.arenaMix - S.arenaTarget) < 0.002) S.arenaMix = S.arenaTarget;
    applyMood(S.arenaMix);

    /* --- breakable hit flash --- */
    for (let i = 0; i < S.breakables.length; i++) {
      const b = S.breakables[i];
      if (b.alive && b.flash > 0) {
        b.flash -= dt * 5;
        if (b.flash < 0) b.flash = 0;
        if (b.mesh) b.mesh.scale.setScalar(b.baseScale * (1 + 0.05 * b.flash));
      }
    }

    /* --- bounce caps squash, hook pods bob --- */
    for (let i = 0; i < W.bouncers.length; i++) {
      const bo = W.bouncers[i];
      if (bo.squash > 0) bo.squash = Math.max(0, bo.squash - dt * 3.2);
      const k = bo.squash, wob = Math.sin(time * 9) * k * 0.12;
      bo.mesh.scale.set(1 + 0.25 * k + wob, 1 - 0.5 * k + wob, 1 + 0.25 * k + wob);
      bo.glow.material.opacity = 0.5 + 0.25 * Math.sin(time * 3 + i) + k * 0.4;
    }
    for (let i = 0; i < W.hookPoints.length; i++) {
      const h = W.hookPoints[i];
      h.group.position.y = h.y + Math.sin(time * 1.6 + i * 1.9) * 0.18;
      h.ring.rotation.z = time * 1.4 + i; h.ring.rotation.x = Math.PI / 2 + Math.sin(time * 0.8 + i) * 0.4;
      const hot = G.player && G.player.hookReady ? 1 : 0;
      h.glow.material.opacity = 0.55 + 0.25 * Math.sin(time * 4 + i) + hot * 0.15;
    }
  };

})();
