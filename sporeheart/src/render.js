/* SPOREHEART — render.js : HDR scene target (MSAA) → bloom → grade/vignette/radial-blur composite
   + a dynamic-resolution governor tuned for phones (Galaxy Z Fold 4 inner screen is ~2K, so the
   governor starts at a modest scale and climbs while frame time allows).

   G.render.init(renderer, scene, camera)   G.render.frame(dtReal)   G.render.resize()
   G.render.fx.radial / .aberration / .hurt / .flash / .grade / .exposure   (all decay in update)
   G.render.setQuality('auto'|'high'|'low')                                                    */
(function () {
  "use strict";
  const G = window.G;
  const R = (G.render = { fx: { radial: 0, radialX: 0.5, radialY: 0.5, aberration: 0, hurt: 0, flash: 0, flashColor: [1, 1, 1], exposure: 1.0, boss: 0 } });

  let renderer, scene, camera, THREE;
  let rtScene = null, rtA = [], rtB = [];
  let quad, quadScene, quadCam;
  let matBright, matDown, matUp, matComp;
  let enabled = true, hdr = true;
  let scale = 0.85, baseDpr = 1, quality = "auto";
  let acc = 0, frames = 0, slow = 0, fast = 0, lastW = 0, lastH = 0, time = 0;
  const MIPS = 4;

  const VERT = `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  const FRAG_BRIGHT = `
    precision highp float; varying vec2 vUv; uniform sampler2D tSrc; uniform float uThresh; uniform float uKnee;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb;
      float br = max(c.r, max(c.g, c.b));
      float soft = clamp(br - uThresh + uKnee, 0.0, 2.0 * uKnee); soft = soft * soft / (4.0 * uKnee + 1e-4);
      float w = max(soft, br - uThresh) / max(br, 1e-4);
      gl_FragColor = vec4(c * w, 1.0);
    }`;
  const FRAG_DOWN = `
    precision highp float; varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
      c += texture2D(tSrc, vUv + vec2(-1.0,-1.0) * uTexel).rgb;
      c += texture2D(tSrc, vUv + vec2( 1.0,-1.0) * uTexel).rgb;
      c += texture2D(tSrc, vUv + vec2(-1.0, 1.0) * uTexel).rgb;
      c += texture2D(tSrc, vUv + vec2( 1.0, 1.0) * uTexel).rgb;
      gl_FragColor = vec4(c / 8.0, 1.0);
    }`;
  const FRAG_UP = `
    precision highp float; varying vec2 vUv; uniform sampler2D tSrc; uniform sampler2D tPrev; uniform vec2 uTexel; uniform float uMix;
    void main(){
      vec3 c = texture2D(tSrc, vUv + vec2(-2.0, 0.0) * uTexel).rgb;
      c += texture2D(tSrc, vUv + vec2(-1.0, 1.0) * uTexel).rgb * 2.0;
      c += texture2D(tSrc, vUv + vec2( 0.0, 2.0) * uTexel).rgb;
      c += texture2D(tSrc, vUv + vec2( 1.0, 1.0) * uTexel).rgb * 2.0;
      c += texture2D(tSrc, vUv + vec2( 2.0, 0.0) * uTexel).rgb;
      c += texture2D(tSrc, vUv + vec2( 1.0,-1.0) * uTexel).rgb * 2.0;
      c += texture2D(tSrc, vUv + vec2( 0.0,-2.0) * uTexel).rgb;
      c += texture2D(tSrc, vUv + vec2(-1.0,-1.0) * uTexel).rgb * 2.0;
      c /= 12.0;
      gl_FragColor = vec4(c + texture2D(tPrev, vUv).rgb * uMix, 1.0);
    }`;
  const FRAG_COMP = `
    precision highp float; varying vec2 vUv;
    uniform sampler2D tScene; uniform sampler2D tBloom;
    uniform float uBloom, uExposure, uRadial, uAberr, uHurt, uFlash, uTime, uBoss;
    uniform vec2 uCenter; uniform vec3 uFlashColor; uniform vec2 uRes;
    vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 dir = uv - uCenter;
      float dl = length(dir);
      vec3 col;
      /* radial speed blur (dash / glide) */
      if (uRadial > 0.002) {
        vec3 acc = vec3(0.0); float tot = 0.0;
        for (int i = 0; i < 8; i++) {
          float k = float(i) / 7.0;
          float w = 1.0 - k * 0.6;
          vec2 p = uCenter + dir * (1.0 - uRadial * 0.22 * k * smoothstep(0.05, 0.6, dl));
          acc += texture2D(tScene, p).rgb * w; tot += w;
        }
        col = acc / tot;
      } else col = texture2D(tScene, uv).rgb;
      /* chromatic aberration grows toward the edges */
      if (uAberr > 0.002) {
        vec2 o = dir * uAberr * 0.02 * (0.3 + dl);
        col.r = texture2D(tScene, uv + o).r; col.b = texture2D(tScene, uv - o).b;
      }
      col += texture2D(tBloom, uv).rgb * uBloom;
      col *= uExposure;
      /* grade: teal-cool shadows, warm highlights, a touch of saturation (matches the key art) */
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, 1.12);
      col *= mix(vec3(0.94, 1.02, 1.04), vec3(1.05, 1.0, 0.94), smoothstep(0.1, 1.2, l));
      /* boss tension: crush toward crimson */
      col = mix(col, col * vec3(1.18, 0.82, 0.8), uBoss * 0.5);
      col = aces(col);
      /* vignette */
      float vg = smoothstep(0.95, 0.28, dl * 1.25);
      col *= mix(0.62, 1.0, vg);
      col = mix(col, col * vec3(1.5, 0.35, 0.35), uHurt * smoothstep(0.2, 0.9, dl) * 0.8);
      col = mix(col, uFlashColor, uFlash);
      col = pow(col, vec3(1.0 / 2.2));
      col += (hash(uv * uRes + uTime) - 0.5) / 255.0;      // dither: kills banding in the teal sky gradient
      gl_FragColor = vec4(col, 1.0);
    }`;

  function mat(frag, uniforms) {
    return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  }
  function makeRT(w, h, type) {
    const rt = new THREE.WebGLRenderTarget(Math.max(2, w | 0), Math.max(2, h | 0), {
      type: type, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false
    });
    rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
    return rt;
  }

  R.init = function (r, s, c) {
    renderer = r; scene = s; camera = c; THREE = G.THREE;
    const gl = renderer.getContext();
    const isGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
    hdr = isGL2 && !!renderer.extensions.get("EXT_color_buffer_float") || !!renderer.extensions.get("EXT_color_buffer_half_float");
    G.assets.ensureShared();
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.info.autoReset = false;
    baseDpr = Math.min(window.devicePixelRatio || 1, 2);
    quad = new THREE.Mesh(new THREE.BufferGeometry(), null);
    quad.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    quad.frustumCulled = false;
    quadScene = new THREE.Scene(); quadScene.add(quad);
    quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    matBright = mat(FRAG_BRIGHT, { tSrc: { value: null }, uThresh: { value: 1.15 }, uKnee: { value: 0.7 } });
    matDown = mat(FRAG_DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    matUp = mat(FRAG_UP, { tSrc: { value: null }, tPrev: { value: null }, uTexel: { value: new THREE.Vector2() }, uMix: { value: 1 } });
    matComp = mat(FRAG_COMP, {
      tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 0.55 }, uExposure: { value: 1 }, uRadial: { value: 0 },
      uAberr: { value: 0 }, uHurt: { value: 0 }, uFlash: { value: 0 }, uTime: { value: 0 }, uBoss: { value: 0 },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uFlashColor: { value: new THREE.Vector3(1, 1, 1) }, uRes: { value: new THREE.Vector2(1, 1) }
    });
    R.setQuality(G.settings && G.settings.quality || "auto");
    R.resize();
    return R;
  };

  R.setQuality = function (q) {
    quality = q || "auto";
    if (quality === "high") scale = 1.0; else if (quality === "low") scale = 0.6; else scale = Math.min(scale, 0.9);
    enabled = true;
    R.resize(true);
  };

  R.resize = function (force) {
    if (!renderer) return;
    const cw = window.innerWidth, ch = window.innerHeight;
    const dpr = baseDpr * scale;
    const w = Math.max(2, Math.round(cw * dpr)), h = Math.max(2, Math.round(ch * dpr));
    if (!force && w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
    const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    if (rtScene) rtScene.dispose();
    rtScene = new THREE.WebGLRenderTarget(w, h, {
      type: type, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: true, stencilBuffer: false, samples: scale >= 0.7 ? 4 : 2, generateMipmaps: false
    });
    rtScene.texture.colorSpace = THREE.LinearSRGBColorSpace;
    for (const a of rtA) a.dispose(); for (const b of rtB) b.dispose();
    rtA = []; rtB = [];
    let bw = w >> 1, bh = h >> 1;
    for (let i = 0; i < MIPS; i++) { rtA.push(makeRT(bw, bh, type)); rtB.push(makeRT(bw, bh, type)); bw >>= 1; bh >>= 1; }
    matComp.uniforms.uRes.value.set(w, h);
    G.assets.uniforms.uRes.value.set(w, h);
    if (G.game && G.game.camera) { G.game.camera.aspect = cw / ch; G.game.camera.updateProjectionMatrix(); }
  };

  function pass(m, target) {
    quad.material = m;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }

  /* dynamic resolution: climb slowly, drop fast */
  function govern(dt) {
    if (quality !== "auto") return;
    acc += dt; frames++;
    if (acc < 0.5) return;
    const ms = (acc / frames) * 1000; acc = 0; frames = 0;
    if (ms > 23) { slow++; fast = 0; } else if (ms < 15.5) { fast++; slow = 0; } else { slow = 0; fast = 0; }
    if (slow >= 2 && scale > 0.5) { scale = Math.max(0.5, scale - 0.1); slow = 0; R.resize(); }
    else if (fast >= 6 && scale < 1.0) { scale = Math.min(1.0, scale + 0.05); fast = 0; R.resize(); }
  }

  R.frame = function (dtReal) {
    time += dtReal;
    const fx = R.fx;
    fx.radial = Math.max(0, fx.radial - dtReal * 3.5);
    fx.aberration = Math.max(0, fx.aberration - dtReal * 3.0);
    fx.hurt = Math.max(0, fx.hurt - dtReal * 1.8);
    fx.flash = Math.max(0, fx.flash - dtReal * 3.2);
    govern(dtReal);
    R.resize();
    renderer.info.reset();
    if (!enabled) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }

    renderer.setRenderTarget(rtScene);
    renderer.clear();
    renderer.render(scene, camera);

    matBright.uniforms.tSrc.value = rtScene.texture;
    pass(matBright, rtA[0]);
    for (let i = 1; i < MIPS; i++) {
      matDown.uniforms.tSrc.value = rtA[i - 1].texture;
      matDown.uniforms.uTexel.value.set(1 / rtA[i - 1].width, 1 / rtA[i - 1].height);
      pass(matDown, rtA[i]);
    }
    let src = rtA[MIPS - 1];
    for (let i = MIPS - 2; i >= 0; i--) {
      matUp.uniforms.tSrc.value = src.texture;
      matUp.uniforms.tPrev.value = rtA[i].texture;
      matUp.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      matUp.uniforms.uMix.value = 0.55;
      pass(matUp, rtB[i]);
      src = rtB[i];
    }
    const u = matComp.uniforms;
    u.tScene.value = rtScene.texture; u.tBloom.value = rtB[0].texture;
    u.uBloom.value = 0.5; u.uExposure.value = fx.exposure; u.uRadial.value = fx.radial; u.uAberr.value = fx.aberration;
    u.uHurt.value = fx.hurt; u.uFlash.value = fx.flash * 0.8; u.uTime.value = time % 100; u.uBoss.value = fx.boss;
    u.uCenter.value.set(fx.radialX, fx.radialY);
    u.uFlashColor.value.set(fx.flashColor[0], fx.flashColor[1], fx.flashColor[2]);
    pass(matComp, null);
  };

  R.flash = function (hexColor, amt) {
    const c = hexColor || 0xffffff;
    R.fx.flashColor = [Math.pow(((c >> 16) & 255) / 255, 2.2), Math.pow(((c >> 8) & 255) / 255, 2.2), Math.pow((c & 255) / 255, 2.2)];
    R.fx.flash = Math.max(R.fx.flash, amt || 0.4);
  };
  Object.defineProperty(R, "scale", { get() { return scale; } });
  R.info = () => ({ scale, hdr, w: lastW, h: lastH, quality });
})();
