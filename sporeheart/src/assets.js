/* SPOREHEART — assets.js : procedural textures, toon materials, shared geometry, outline/rim helpers
   Everything visual originates here so the whole game shares one art pipeline. */
(function () {
  "use strict";
  const G = window.G;
  const cache = { tex: {}, mat: {}, geo: {} };

  function T() { return G.THREE; }

  /* ============ CANVAS TEXTURE FACTORY ============ */
  function canvasTex(key, w, h, draw, opts) {
    if (cache.tex[key]) return cache.tex[key];
    const THREE = T();
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (opts && opts.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
    if (opts && opts.nearest) { tex.magFilter = THREE.NearestFilter; }
    cache.tex[key] = tex;
    return tex;
  }
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");

  /* ---- concrete texture set ---- */
  const texBuilders = {
    // 4-step toon ramp with cool-tinted shadow bands (RGB; sampled as .rgb by the patched chunk)
    toonGradient() {
      const THREE = T();
      if (cache.tex.toonGradient) return cache.tex.toonGradient;
      const data = new Uint8Array([
        104, 116, 172, 255,
        158, 172, 214, 255,
        226, 232, 250, 255,
        255, 252, 244, 255]);
      const t = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
      t.minFilter = t.magFilter = THREE.NearestFilter;
      t.needsUpdate = true;
      cache.tex.toonGradient = t;
      return t;
    },
    eye: (irisHex, ringHex) => canvasTex("eye_" + irisHex + "_" + ringHex, 128, 128, (ctx, w, h) => {
      ctx.fillStyle = "#0e0f12"; ctx.fillRect(0, 0, w, h); // eyelid/shadow base
      const cx = w / 2, cy = h / 2;
      const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 58);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.75, "#f4efe2"); g.addColorStop(1, "#cfc8b8");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 58, 52, 0, 0, Math.PI * 2); ctx.fill();
      if (ringHex) { ctx.strokeStyle = hex(ringHex); ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.stroke(); }
      const ig = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
      ig.addColorStop(0, "#20242c"); ig.addColorStop(0.45, hex(irisHex)); ig.addColorStop(1, "#10130f");
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy, ringHex ? 26 : 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0a0c10"; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath(); ctx.arc(cx - 12, cy - 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 9, cy + 8, 3, 0, Math.PI * 2); ctx.fill();
    }),
    animeEye: (irisHex) => canvasTex("animeEye_" + irisHex, 128, 160, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      // white
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(cx, h * 0.52, w * 0.42, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      // iris
      const g = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.95);
      g.addColorStop(0, "#1c2418"); g.addColorStop(0.35, hex(irisHex)); g.addColorStop(1, "#0d120c");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, h * 0.55, w * 0.30, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#101210";
      ctx.beginPath(); ctx.ellipse(cx, h * 0.56, w * 0.13, h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      // highlights
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath(); ctx.arc(cx - w * 0.10, h * 0.38, w * 0.075, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.arc(cx + w * 0.10, h * 0.68, w * 0.04, 0, Math.PI * 2); ctx.fill();
      // upper lash line
      ctx.strokeStyle = "#15161c"; ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.ellipse(cx, h * 0.5, w * 0.42, h * 0.4, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    }),
    glyphs: () => canvasTex("glyphs", 256, 256, (ctx, w, h) => {
      ctx.fillStyle = "#00000000"; ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(245,234,210,0.9)"; ctx.lineWidth = 5; ctx.lineCap = "round";
      const cells = 4, s = w / cells;
      for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
        if ((i * 7 + j * 3) % 3 === 0) continue;
        const x = i * s + s / 2, y = j * s + s / 2, r = s * 0.28;
        ctx.beginPath();
        const kind = (i + j) % 4;
        if (kind === 0) { ctx.arc(x, y, r, 0, Math.PI * 2); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); }
        else if (kind === 1) { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); }
        else if (kind === 2) { ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); }
        else { ctx.arc(x, y, r, 0.3, Math.PI - 0.3); }
        ctx.stroke();
      }
    }),
    zigzag: () => canvasTex("zigzag", 256, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = hex(G.CONF.PAL.orange); ctx.lineWidth = 9; ctx.lineJoin = "round";
      ctx.beginPath();
      const n = 8, step = w / n;
      for (let i = 0; i <= n; i++) { const x = i * step, y = i % 2 ? h * 0.2 : h * 0.8; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // stitch dots
      ctx.fillStyle = "rgba(242,233,216,0.85)";
      for (let i = 0; i < n * 2; i++) { ctx.beginPath(); ctx.arc(i * step / 2 + 6, h / 2, 2.4, 0, Math.PI * 2); ctx.fill(); }
    }, { repeat: true }),
    cobble: () => canvasTex("cobble", 512, 512, (ctx, w, h) => {
      ctx.fillStyle = "#3d4a4a"; ctx.fillRect(0, 0, w, h);
      const R = G.util.rand;
      for (let i = 0; i < 240; i++) {
        const x = R(w), y = R(h), r = R(14, 30);
        const shade = 60 + R(-14, 26);
        ctx.fillStyle = `rgb(${shade - 8},${shade + 6},${shade})`;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * R(0.7, 0.95), R(Math.PI), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(16,22,22,0.55)"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.5, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      }
      // moss flecks
      ctx.fillStyle = "rgba(70,120,80,0.35)";
      for (let i = 0; i < 130; i++) { ctx.beginPath(); ctx.arc(R(w), R(h), R(1, 4), 0, Math.PI * 2); ctx.fill(); }
    }, { repeat: true }),
    wood: () => canvasTex("wood", 256, 256, (ctx, w, h) => {
      ctx.fillStyle = "#5a4028"; ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 4) {
        const wob = Math.sin(x * 0.09) * 6 + Math.sin(x * 0.021) * 14;
        ctx.strokeStyle = `rgba(40,26,14,${0.16 + 0.12 * Math.abs(Math.sin(x * 0.13))})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, 0);
        for (let y = 0; y <= h; y += 16) ctx.lineTo(x + Math.sin(y * 0.05 + x) * 3 + wob * 0.1, y);
        ctx.stroke();
      }
      const R = G.util.rand;
      for (let i = 0; i < 7; i++) { // knots
        const x = R(w), y = R(h);
        ctx.strokeStyle = "rgba(34,20,10,0.5)"; ctx.lineWidth = 2.5;
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x, y, k * 5, k * 3.4, 0.3, 0, Math.PI * 2); ctx.stroke(); }
      }
    }, { repeat: true }),
    capSpots: (base, spots) => canvasTex("cap_" + base + "_" + spots, 256, 256, (ctx, w, h) => {
      ctx.fillStyle = hex(base); ctx.fillRect(0, 0, w, h);
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0, "rgba(255,255,255,0.18)"); vg.addColorStop(1, "rgba(0,0,0,0.28)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      const R = G.util.rand;
      ctx.fillStyle = hex(spots);
      for (let i = 0; i < 26; i++) {
        const x = R(w), y = R(h * 0.85), r = R(6, 20);
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, R(Math.PI), 0, Math.PI * 2); ctx.fill();
      }
    }, { repeat: true }),
    gills: () => canvasTex("gills", 256, 128, (ctx, w, h) => {
      ctx.fillStyle = "#e9d8a8"; ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 6) {
        ctx.strokeStyle = `rgba(120,80,40,${0.25 + 0.25 * Math.abs(Math.sin(x))})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 8, h); ctx.stroke();
      }
    }, { repeat: true }),
    skygrad: () => canvasTex("skygrad", 16, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#123a3d"); g.addColorStop(0.42, "#2c6e63");
      g.addColorStop(0.72, "#5fb5a0"); g.addColorStop(0.9, "#a8ddc0"); g.addColorStop(1, "#d8e9c8");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }),
    glowdot: () => canvasTex("glowdot", 64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }),
    ring: () => canvasTex("ring", 128, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(64, 64, 52, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(64, 64, 50, 0, Math.PI * 2); ctx.stroke();
    }),
    slash: () => canvasTex("slash", 256, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.48, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }),
    petal: () => canvasTex("petal", 64, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#e8433a";
      ctx.beginPath(); ctx.ellipse(32, 34, 18, 26, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(120,10,20,0.55)";
      ctx.beginPath(); ctx.ellipse(36, 42, 10, 16, 0.4, 0, Math.PI * 2); ctx.fill();
    }),
    wear: () => canvasTex("wear", 128, 128, (ctx, w, h) => {
      ctx.fillStyle = "#8b98a6"; ctx.fillRect(0, 0, w, h);
      const R = G.util.rand;
      ctx.strokeStyle = "rgba(40,46,56,0.5)";
      for (let i = 0; i < 40; i++) {
        ctx.lineWidth = R(1, 2.5);
        ctx.beginPath(); const x = R(w), y = R(h);
        ctx.moveTo(x, y); ctx.lineTo(x + R(-22, 22), y + R(-22, 22)); ctx.stroke();
      }
      ctx.fillStyle = "rgba(230,238,245,0.18)";
      for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(R(w), R(h), R(1, 5), 0, Math.PI * 2); ctx.fill(); }
    }, { repeat: true })
  };

  /* ============ SHARED SHADER STATE ============ */
  const SHARED = {};
  let sharedReady = false;
  function ensureShared() {
    if (sharedReady) return;
    const THREE = T();
    SHARED.uRimDir = { value: new THREE.Vector3(-0.35, 0.45, -0.82).normalize() };   // view-space direction the rim "comes from"
    SHARED.uRimCol = { value: new THREE.Color(0x9ff4e0) };
    SHARED.uRes = { value: new THREE.Vector2(1280, 720) };
    SHARED.uTime = { value: 0 };
    sharedReady = true;
    /* the stock toon chunk only reads the ramp's red channel; read all three so shadows can be tinted */
    THREE.ShaderChunk.gradientmap_pars_fragment = THREE.ShaderChunk.gradientmap_pars_fragment
      .replace("texture2D( gradientMap, coord ).r )", "texture2D( gradientMap, coord ).rgb )");
  }
  function patchToon(m, rimK) {
    ensureShared();
    m.userData.rimK = rimK;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRimDir = SHARED.uRimDir; sh.uniforms.uRimCol = SHARED.uRimCol;
      sh.uniforms.uRimK = { value: rimK };
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uRimDir; uniform vec3 uRimCol; uniform float uRimK;")
        .replace("#include <opaque_fragment>",
          "float rimF = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.4);\n" +
          "float rimS = saturate(dot(normalize(normal), uRimDir) * 0.6 + 0.55);\n" +
          "outgoingLight += uRimCol * rimF * rimS * uRimK * 0.55;\n#include <opaque_fragment>");
    };
    m.customProgramCacheKey = () => "toon2";
  }
  /* average normals of coincident vertices → a seamless outline direction even on hard-edged boxes */
  function smoothNormals(geo) {
    if (geo.attributes.aOn || !geo.attributes.normal) return;
    const THREE = T();
    const pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count;
    const map = new Map(), keys = new Array(n);
    for (let i = 0; i < n; i++) {
      const k = Math.round(pos.getX(i) * 2000) + "_" + Math.round(pos.getY(i) * 2000) + "_" + Math.round(pos.getZ(i) * 2000);
      keys[i] = k;
      let e = map.get(k);
      if (!e) { e = [0, 0, 0]; map.set(k, e); }
      e[0] += nor.getX(i); e[1] += nor.getY(i); e[2] += nor.getZ(i);
    }
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const e = map.get(keys[i]); const l = Math.hypot(e[0], e[1], e[2]) || 1;
      out[i * 3] = e[0] / l; out[i * 3 + 1] = e[1] / l; out[i * 3 + 2] = e[2] / l;
    }
    geo.setAttribute("aOn", new THREE.BufferAttribute(out, 3));
  }
  const OUTLINE_VERT = `
    attribute vec3 aOn; uniform float uPx; uniform vec2 uRes;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec3 vn = normalize(normalMatrix * aOn);
      vec4 clip = projectionMatrix * mv;
      float fade = mix(1.0, 0.45, smoothstep(14.0, 70.0, -mv.z));
      vec2 dir = normalize(vn.xy + vec2(1e-5));
      clip.xy += dir * (2.0 * uPx * fade * (uRes.y / 1000.0)) / uRes * clip.w;
      gl_Position = clip;
    }`;
  const OUTLINE_FRAG = `uniform vec3 uCol; void main(){ gl_FragColor = vec4(uCol, 1.0); }`;

  /* ============ MATERIALS ============ */
  const mats = {
    toon(color, opts = {}) {
      const THREE = T();
      const key = "toon_" + color + "_" + JSON.stringify(opts.map ? opts.map.uuid : 0) + (opts.emissive || 0) + (opts.transparent ? 1 : 0) + (opts.side || 0) + "_" + (opts.rim === undefined ? 1 : opts.rim);
      if (!opts.noCache && cache.mat[key]) return cache.mat[key];
      const m = new THREE.MeshToonMaterial({
        color, gradientMap: texBuilders.toonGradient(),
        map: opts.map || null,
        transparent: !!opts.transparent, opacity: opts.opacity !== undefined ? opts.opacity : 1,
        side: opts.side || THREE.FrontSide
      });
      if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity || 0.6; }
      patchToon(m, opts.rim === undefined ? 1 : opts.rim);
      if (!opts.noCache) cache.mat[key] = m;
      return m;
    },
    flat(color, opts = {}) {
      const THREE = T();
      return new THREE.MeshBasicMaterial({
        color, transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
        side: opts.side || THREE.FrontSide, map: opts.map || null,
        depthWrite: opts.depthWrite !== false, blending: opts.blending || THREE.NormalBlending,
        fog: opts.fog !== false
      });
    },
    glow(color, intensity = 1) {
      const THREE = T();
      const key = "glow_" + color + "_" + intensity;
      if (cache.mat[key]) return cache.mat[key];
      const m = new THREE.MeshBasicMaterial({ color });
      m.color.multiplyScalar(intensity);
      cache.mat[key] = m;
      return m;
    },
    sprite(color, opts = {}) {
      const THREE = T();
      return new THREE.SpriteMaterial({
        map: opts.map || texBuilders.glowdot(), color,
        transparent: true, opacity: opts.opacity ?? 0.9,
        blending: opts.blending || THREE.AdditiveBlending, depthWrite: false
      });
    },
    /* screen-space ink line: back-face shell pushed along the smoothed normal by N pixels */
    outline(color = 0x101216, px = 2.2) {
      const THREE = T();
      const key = "outline_" + color + "_" + px.toFixed(2);
      if (!cache.mat[key]) {
        const m = new THREE.ShaderMaterial({
          uniforms: { uCol: { value: new THREE.Color(color) }, uPx: { value: px }, uRes: SHARED.uRes },
          vertexShader: OUTLINE_VERT, fragmentShader: OUTLINE_FRAG, side: THREE.BackSide, fog: false
        });
        m.userData.isOutlineMat = true;
        cache.mat[key] = m;
      }
      return cache.mat[key];
    }
  };

  /* ============ SHARED GEOMETRY ============ */
  function geos() {
    const THREE = T();
    if (cache.geo.done) return cache.geo;
    Object.assign(cache.geo, {
      sphere: new THREE.SphereGeometry(1, 20, 14),
      sphereLo: new THREE.SphereGeometry(1, 10, 8),
      box: new THREE.BoxGeometry(1, 1, 1),
      cone: new THREE.ConeGeometry(1, 1, 12),
      coneLo: new THREE.ConeGeometry(1, 1, 7),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
      cylLo: new THREE.CylinderGeometry(1, 1, 1, 7),
      plane: new THREE.PlaneGeometry(1, 1),
      circle: new THREE.CircleGeometry(1, 24),
      torus: new THREE.TorusGeometry(1, 0.25, 8, 20),
      capsule: new THREE.CapsuleGeometry(1, 1, 4, 10),
      done: true
    });
    return cache.geo;
  }

  /* ============ HELPERS ============ */
  const helpers = {
    // inverted-hull outline; add meshes of a group; returns outline meshes added
    outline(mesh, thickness = 0.02, color = 0x101216) {
      const THREE = T();
      if (!mesh.geometry) return null;
      smoothNormals(mesh.geometry);
      const px = Math.min(5, 0.9 + thickness * 38);
      const o = new THREE.Mesh(mesh.geometry, mats.outline(color, Math.round(px * 4) / 4));
      o.raycast = () => {}; // outlines never block picking
      o.userData.isOutline = true;
      o.castShadow = false; o.receiveShadow = false;
      mesh.add(o);
      return o;
    },
    outlineGroup(root, thickness = 0.02, color = 0x101216, filter) {
      const out = [];
      root.traverse((m) => {
        if (m.isMesh && !m.userData.isOutline && !m.userData.noOutline && (!filter || filter(m))) {
          const o = helpers.outline(m, thickness, color);
          if (o) out.push(o);
        }
      });
      return out;
    },
    addRim(mat, strength = 0.5, power = 2.5) {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uRim = { value: strength };
        shader.uniforms.uRimPow = { value: power };
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\nuniform float uRim; uniform float uRimPow;")
          .replace("#include <dithering_fragment>",
            `#include <dithering_fragment>
            vec3 rimView = normalize( vViewPosition );
            float rim = pow( 1.0 - abs( dot( normalize( vNormal ), rimView ) ), uRimPow );
            gl_FragColor.rgb += rim * uRim * 0.35;`);
        if (shader.vertexShader.includes("vNormal") === false) {
          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nvarying vec3 vNormalR; varying vec3 vViewR;");
        }
      };
      return mat;
    },
    /* vertex wind for instanced cross-quad foliage (height = local y 0..1) */
    windify(mat, amp = 0.16) {
      ensureShared();
      const prev = mat.onBeforeCompile;
      mat.onBeforeCompile = (sh) => {
        if (prev) prev(sh);
        sh.uniforms.uTime = SHARED.uTime;
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uTime;")
          .replace("#include <begin_vertex>", `#include <begin_vertex>
            #ifdef USE_INSTANCING
              float wph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.29;
            #else
              float wph = 0.0;
            #endif
            float wy = position.y * position.y;
            transformed.x += (sin(uTime * 1.7 + wph) + 0.5 * sin(uTime * 3.1 + wph * 2.0)) * ${amp.toFixed(3)} * wy;
            transformed.z += cos(uTime * 1.3 + wph * 1.3) * ${(amp * 0.7).toFixed(3)} * wy;`);
      };
      mat.customProgramCacheKey = () => "wind" + amp;
      return mat;
    },
    glowSprite(color, scale = 1, opacity = 0.9) {
      const THREE = T();
      const s = new THREE.Sprite(mats.sprite(color, { opacity }));
      s.scale.setScalar(scale);
      return s;
    },
    ringTelegraph(radius, color = 0xff5040) {
      const THREE = T();
      const m = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.86, radius, 40),
        mats.flat(color, { transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 5;
      m.userData.noOutline = true;
      return m;
    },
    labelSprite(text, opts = {}) {
      const THREE = T();
      const key = "label_" + text + (opts.color || "");
      const t = canvasTex(key, 256, 96, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.font = `bold ${opts.size || 44}px ${opts.font || "Georgia, serif"}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 8; ctx.strokeStyle = "rgba(10,12,14,0.85)";
        ctx.strokeText(text, w / 2, h / 2);
        ctx.fillStyle = opts.color || "#f2e9d8";
        ctx.fillText(text, w / 2, h / 2);
      });
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
      s.scale.set(2.2, 0.82, 1);
      return s;
    },
    mesh(geo, mat, opts = {}) {
      const THREE = T();
      const m = new THREE.Mesh(geo, mat);
      if (opts.p) m.position.set(opts.p[0], opts.p[1], opts.p[2]);
      if (opts.r) m.rotation.set(opts.r[0], opts.r[1], opts.r[2]);
      if (opts.s) (typeof opts.s === "number") ? m.scale.setScalar(opts.s) : m.scale.set(opts.s[0], opts.s[1], opts.s[2]);
      if (opts.shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
      if (opts.outline) helpers.outline(m, opts.outline === true ? 0.02 : opts.outline, opts.outlineColor);
      return m;
    }
  };

  G.assets = { tex: texBuilders, mat: mats, geo: geos, cache, uniforms: SHARED, ensureShared, smoothNormals, ...helpers };
})();
