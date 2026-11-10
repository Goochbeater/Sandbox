/* RENDER — HD-2D style frame: the room is lit in linear HDR, then
     reflection pass  (mirrored camera → half-res target the glossy floor samples),
     scene pass       (HDR colour + depth),
     depth of field   (half-res gather, "scatter-as-gather" so blurred foreground bleeds over what's behind it; bright
                       samples weigh more, so out-of-focus flames open into bokeh discs; a tent "fill" pass rounds them),
     ambient occlusion (half-res, from the depth buffer: creases, furniture on floors, feet; high quality only),
     bloom            (soft threshold + dual-filter chain at quarter res),
     final            (DOF mix, AO, bloom, exposure, ACES, split-tone grade, vignette, grain → screen).
   ENGINE.md §13p has the numbers and how each was tuned.
   Layers: 0 = room (main + reflection cameras), 2 = main camera only (floor, rugs: things that must not appear in their
   own reflection), 3…31 = one per actor: each character's 3D model is seen only by that actor's sprite camera. */
const R = { q: G.flags.q === 'low' ? 'low' : 'high', fx: !G.flags.nofx, A: 2.96, aoK: G.flags.noao ? 0 : 0.85, farMax: 3.2 };   // aoK: how much occlusion darkens (0 off); farMax: the far field's largest blur (px at a 640 px half buffer)
/* the room's grade: shadows and highlights tinted separately (room.grade = { s: [r, g, b], h: [r, g, b] }, multipliers); the default is a gentle teal-and-amber */
R.GRADE = { s: [0.95, 0.99, 1.06], h: [1.04, 1.0, 0.95] };   // multipliers (not colours): shadows a little cool, highlights a little warm
R.grade = function (g) { const U = R.mat.final.uniforms; U.uTintS.value.fromArray((g && g.s) || R.GRADE.s); U.uTintH.value.fromArray((g && g.h) || R.GRADE.h); };
R.SH = {};
R.SH.vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
R.SH.bsz = `uniform float uFocus, uNear0, uNearR, uNearMax, uFar0, uFarR, uFarMax;
  float bsz(float dist){ return max(smoothstep(uNear0, uNear0 + uNearR, uFocus - dist) * uNearMax, smoothstep(uFar0, uFar0 + uFarR, dist - uFocus) * uFarMax); }`;
R.SH.lin = `uniform float uCNear, uCFar; float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * uCNear * uCFar / (uCFar + uCNear - z * (uCFar - uCNear)); }`;
R.init = function () {
  const r = new THREE.WebGLRenderer({ canvas: $('cv'), antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!G.flags.test });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NoToneMapping; r.setPixelRatio(1);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = false;
  R.r = r;
  const ext = r.extensions;
  R.hdr = r.capabilities.isWebGL2 && (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'));
  R.type = R.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  R.scene = new THREE.Scene(); R.scene.background = new THREE.Color(0x030203);
  R.cam = new THREE.PerspectiveCamera(19, R.A, 1, 70); R.cam.layers.enable(2);
  R.reflCam = new THREE.PerspectiveCamera(19, R.A, 1, 70);
  R.quadScene = new THREE.Scene(); R.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  R.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); R.quad.frustumCulled = false; R.quadScene.add(R.quad);
  R.texMat = new THREE.Matrix4();   // world → reflection texture coords, read by the floor shader
  R.reflU = { tRefl: { value: null }, uTexMat: { value: R.texMat }, uReflK: { value: 0.6 }, uReflRes: { value: new THREE.Vector2(1, 1) } };
  const U = (o) => Object.assign({ uFocus: { value: 20 }, uNear0: { value: 0.8 }, uNearR: { value: 3.2 }, uNearMax: { value: 11 }, uFar0: { value: 3.0 }, uFarR: { value: 10 }, uFarMax: { value: 2.2 },
    uCNear: { value: R.cam.near }, uCFar: { value: R.cam.far } }, o);
  const M = (frag, uni) => new THREE.ShaderMaterial({ vertexShader: R.SH.vert, fragmentShader: frag, uniforms: uni, depthTest: false, depthWrite: false });
  R.dofU = U({});
  R.mat = {
    down: M(`varying vec2 vUv; uniform sampler2D tCol, tDep; uniform vec2 uTexel; ${R.SH.lin}
      void main(){ vec2 o = uTexel * 0.5; vec3 c = texture2D(tCol, vUv).rgb;
        float d = min(min(texture2D(tDep, vUv + vec2(-o.x, -o.y)).x, texture2D(tDep, vUv + vec2(o.x, -o.y)).x), min(texture2D(tDep, vUv + vec2(-o.x, o.y)).x, texture2D(tDep, vUv + vec2(o.x, o.y)).x));
        gl_FragColor = vec4(min(c, vec3(60.0)), lin(d)); }`, Object.assign({ tCol: { value: null }, tDep: { value: null }, uTexel: { value: new THREE.Vector2() } }, R.dofU)),
    blur: M(`varying vec2 vUv; uniform sampler2D tHalf; uniform vec2 uTexel; uniform float uRad, uMax, uBokeh, uBThr; ${R.SH.bsz}
      void main(){ vec4 c0 = texture2D(tHalf, vUv); float cd = c0.a, cs = bsz(cd); vec3 col = c0.rgb; float tot = 1.0, nearW = 0.0, rad = uRad;
        for (int i = 0; i < 200; i++) { if (rad >= uMax) break; float a = float(i) * 2.39996323;
          vec4 s = texture2D(tHalf, vUv + vec2(cos(a), sin(a)) * uTexel * rad); float ss = bsz(s.a);
          if (s.a > cd) ss = clamp(ss, 0.0, cs * 2.0);
          float m = smoothstep(rad - 0.5, rad + 0.5, ss);
          float w = 1.0 + m * uBokeh * smoothstep(uBThr, uBThr * 3.0, max(s.r, max(s.g, s.b)));   // highlights weigh more: bokeh
          col += mix(col / tot, s.rgb, m) * w; tot += w;
          if (s.a < cd - 0.4) nearW = max(nearW, m * smoothstep(uMax, uMax * 0.3, rad));
          rad += uRad / rad; }
        gl_FragColor = vec4(col / tot, nearW); }`, Object.assign({ tHalf: { value: null }, uTexel: { value: new THREE.Vector2() }, uRad: { value: 0.7 }, uMax: { value: 11 }, uBokeh: { value: 5 }, uBThr: { value: 1.25 } }, R.dofU)),
    /* fill: a 3x3 tent over the gather (four bilinear taps), which rounds the bokeh and hides the spiral's sparseness */
    fill: M(`varying vec2 vUv; uniform sampler2D t; uniform vec2 uTexel;
      void main(){ vec2 o = uTexel * 0.5; vec4 a = texture2D(t, vUv + vec2(-o.x, -o.y)), b = texture2D(t, vUv + vec2(o.x, -o.y)), c = texture2D(t, vUv + vec2(-o.x, o.y)), d = texture2D(t, vUv + vec2(o.x, o.y));
        vec4 s = (a + b + c + d) * 0.25; gl_FragColor = vec4(s.rgb, mix(s.a, max(max(a.a, b.a), max(c.a, d.a)), 0.5)); }`, { t: { value: null }, uTexel: { value: new THREE.Vector2() } }),
    /* ambient occlusion from depth alone (after McGuire's scalable ambient obscurance): view-space position from the
       depth buffer, the normal from its nearer neighbours, ten taps on a rotated spiral within uRad metres */
    ao: M(`varying vec2 vUv; uniform sampler2D tDep; uniform vec2 uTexel, uProj; uniform float uRad, uInt, uBias, uMaxD; ${R.SH.lin}
      vec3 P(vec2 uv){ float d = lin(texture2D(tDep, uv).x); return vec3((uv * 2.0 - 1.0) * uProj * d, -d); }
      float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      void main(){ vec3 p = P(vUv); float d = -p.z; if (d > uMaxD) { gl_FragColor = vec4(1.0); return; }
        vec3 x1 = P(vUv + vec2(uTexel.x, 0.0)) - p, x0 = p - P(vUv - vec2(uTexel.x, 0.0)), y1 = P(vUv + vec2(0.0, uTexel.y)) - p, y0 = p - P(vUv - vec2(0.0, uTexel.y));
        vec3 n = normalize(cross(abs(x1.z) < abs(x0.z) ? x1 : x0, abs(y1.z) < abs(y0.z) ? y1 : y0));
        float a0 = ign(gl_FragCoord.xy) * 6.2831853, sum = 0.0, r2 = uRad * uRad;
        for (int i = 0; i < 10; i++) { float fi = (float(i) + 0.5) / 10.0, a = a0 + float(i) * 2.39996323;
          vec3 v = P(vUv + vec2(cos(a), sin(a)) * sqrt(fi) * uRad / (2.0 * d * uProj)) - p; float vv = dot(v, v);
          sum += max(dot(v, n) - uBias - 0.0015 * d, 0.0) / (vv + 0.02) * smoothstep(r2 * 1.6, r2 * 0.4, vv); }
        gl_FragColor = vec4(vec3(clamp(1.0 - uInt * uRad * sum / 10.0, 0.0, 1.0)), 1.0); }`,
      Object.assign({ tDep: { value: null }, uTexel: { value: new THREE.Vector2() }, uProj: { value: new THREE.Vector2(1, 1) }, uRad: { value: 0.6 }, uInt: { value: 1.5 }, uBias: { value: 0.03 }, uMaxD: { value: 45 } }, R.dofU)),
    aoBlur: M(`varying vec2 vUv; uniform sampler2D tAO, tHalf; uniform vec2 uTexel;
      void main(){ float d0 = texture2D(tHalf, vUv).a, s = 0.0, w = 0.0;
        for (int i = 0; i < 4; i++) { vec2 o = vec2(i < 2 ? -1.0 : 1.0, (i == 0 || i == 2) ? -1.0 : 1.0) * uTexel;
          float k = 1.0 / (1.0 + abs(texture2D(tHalf, vUv + o).a - d0) * 4.0); s += texture2D(tAO, vUv + o).r * k; w += k; }
        gl_FragColor = vec4(vec3(s / w), 1.0); }`, { tAO: { value: null }, tHalf: { value: null }, uTexel: { value: new THREE.Vector2() } }),
    pre: M(`varying vec2 vUv; uniform sampler2D t; uniform vec2 uTexel; uniform float uThr, uKnee;
      void main(){ vec2 o = uTexel; vec3 c = (texture2D(t, vUv + vec2(-o.x, -o.y)).rgb + texture2D(t, vUv + vec2(o.x, -o.y)).rgb + texture2D(t, vUv + vec2(-o.x, o.y)).rgb + texture2D(t, vUv + vec2(o.x, o.y)).rgb) * 0.25;
        float br = max(c.r, max(c.g, c.b)); float s = clamp(br - uThr + uKnee, 0.0, 2.0 * uKnee); s = s * s / (4.0 * uKnee + 1e-4);
        gl_FragColor = vec4(c * max(s, br - uThr) / max(br, 1e-4), 1.0); }`, { t: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: 1.0 }, uKnee: { value: 0.5 } }),
    kd: M(`varying vec2 vUv; uniform sampler2D t; uniform vec2 uTexel;
      void main(){ vec2 h = uTexel; vec3 s = texture2D(t, vUv).rgb * 4.0 + texture2D(t, vUv - h).rgb + texture2D(t, vUv + h).rgb + texture2D(t, vUv + vec2(h.x, -h.y)).rgb + texture2D(t, vUv - vec2(h.x, -h.y)).rgb;
        gl_FragColor = vec4(s / 8.0, 1.0); }`, { t: { value: null }, uTexel: { value: new THREE.Vector2() } }),
    ku: M(`varying vec2 vUv; uniform sampler2D t, tAdd; uniform vec2 uTexel;
      void main(){ vec2 h = uTexel; vec3 s = texture2D(t, vUv + vec2(-h.x * 2.0, 0.0)).rgb + texture2D(t, vUv + vec2(-h.x, h.y)).rgb * 2.0 + texture2D(t, vUv + vec2(0.0, h.y * 2.0)).rgb
        + texture2D(t, vUv + vec2(h.x, h.y)).rgb * 2.0 + texture2D(t, vUv + vec2(h.x * 2.0, 0.0)).rgb + texture2D(t, vUv + vec2(h.x, -h.y)).rgb * 2.0 + texture2D(t, vUv + vec2(0.0, -h.y * 2.0)).rgb + texture2D(t, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
        gl_FragColor = vec4(s / 12.0 + texture2D(tAdd, vUv).rgb, 1.0); }`, { t: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } }),
    final: M(`varying vec2 vUv; uniform sampler2D tScene, tBlur, tBloom, tDep, tAO; uniform float uFx, uBloom, uExpo, uTime, uAO; uniform vec2 uRes; uniform vec3 uTintS, uTintH; ${R.SH.bsz} ${R.SH.lin}
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        vec3 col = texture2D(tScene, vUv).rgb;
        if (uFx > 0.5) {
          vec4 b = texture2D(tBlur, vUv); float cs = bsz(lin(texture2D(tDep, vUv).x));
          float bm = clamp(max(smoothstep(0.35, 1.3, cs), b.a), 0.0, 1.0);
          col = mix(col, b.rgb, bm);
          col *= mix(1.0, mix(texture2D(tAO, vUv).r, 1.0, bm * 0.7), uAO);       // occlusion fades where the picture is out of focus
          col += texture2D(tBloom, vUv).rgb * uBloom;
        }
        col *= uExpo;
        col = aces(col);
        col = pow(col, vec3(0.94, 1.0, 1.08));                                    // warm the mids, cool nothing
        float l = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(l), col, 1.08);  // a touch more saturation
        col *= mix(uTintS, uTintH, smoothstep(0.12, 0.7, l));                       // split tone: the room's shadows and highlights each lean their own way
        vec2 q = (vUv - 0.5) * vec2(1.0, 0.62); col *= mix(0.62, 1.0, smoothstep(0.62, 0.12, length(q)));
        col = pow(col, vec3(1.0 / 2.2));
        col += (h12(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * (uFx > 0.5 ? 0.035 : 1.0 / 255.0);
        gl_FragColor = vec4(col, 1.0); }`, Object.assign({ tScene: { value: null }, tBlur: { value: null }, tBloom: { value: null }, tDep: { value: null }, tAO: { value: null }, uAO: { value: 0 }, uTintS: { value: new THREE.Color(0.95, 0.99, 1.07) }, uTintH: { value: new THREE.Color(1.04, 1.0, 0.95) }, uFx: { value: 1 }, uBloom: { value: 0.55 },
      uExpo: { value: 1.0 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2() } }, R.dofU)),
  };
  window.addEventListener('resize', R.resize); window.addEventListener('orientationchange', () => setTimeout(R.resize, 200));
  R.resize();
};
R.mk = function (w, h, o) {
  o = o || {};
  const t = new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), { type: R.type, format: THREE.RGBAFormat, depthBuffer: !!o.depth, stencilBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  if (o.depthTex) { t.depthTexture = new THREE.DepthTexture(t.width, t.height); t.depthTexture.type = THREE.UnsignedIntType; }
  return t;
};
/* the film frame: as wide as the screen allows, letterboxed between 1.9:1 (a Fold's near-square inner screen) and 2.96:1
   (a 20:9 phone). Narrower frames get a slightly wider lens (R.fovK) so they don't feel cramped. */
R.resize = function () {
  const W = window.innerWidth, H = window.innerHeight, a = W / H;
  R.A = clamp(a * 1.25, 1.9, 2.96); R.fovK = 1 + 0.18 * (2.96 - R.A) / 1.06;
  let vw = W, vh = W / R.A; if (vh > H) { vh = H; vw = H * R.A; }
  vw = Math.round(vw); vh = Math.round(vh);
  const v = $('view'); v.style.width = vw + 'px'; v.style.height = vh + 'px'; v.style.left = Math.round((W - vw) / 2) + 'px'; v.style.top = Math.round((H - vh) / 2) + 'px';
  const bar = Math.round((H - vh) / 2); $('topbar').style.height = Math.max(bar, 48) + 'px'; $('botbar').style.height = Math.max(bar, 28) + 'px';
  $('topbar').style.top = (bar < 30 ? Math.round((H - vh) / 2) : 0) + 'px'; $('topbar').style.height = (bar < 30 ? 48 : bar) + 'px';
  R.vw = vw; R.vh = vh;
  const dpr = Math.min(window.devicePixelRatio || 1, 3), cap = R.q === 'low' ? 1100 : 2000;
  let bw = vw * dpr * (R.q === 'low' ? 0.6 : 1); if (bw > cap) bw = cap; bw = Math.round(bw); const bh = Math.round(bw / R.A);
  R.bw = bw; R.bh = bh;
  R.r.setSize(bw, bh, false);
  R.cam.aspect = R.A; R.cam.fov = (R.baseFov || 19) * R.fovK; R.cam.updateProjectionMatrix();
  for (const k in R.rt || {}) R.rt[k].dispose();
  const hw = bw >> 1, hh = bh >> 1, qw = bw >> 2, qh = bh >> 2, rs = R.q === 'low' ? 0.25 : 0.5;
  R.rt = { scene: R.mk(bw, bh, { depth: true, depthTex: true }), refl: R.mk(bw * rs, bh * rs, { depth: true }), half: R.mk(hw, hh), blur: R.mk(hw, hh), blur2: R.mk(hw, hh), ao: R.mk(hw, hh), ao2: R.mk(hw, hh) };
  R.reflU.uReflRes.value.set(R.rt.refl.width, R.rt.refl.height);
  R.bl = []; R.bu = [];
  for (let i = 0, w = qw, h = qh; i < 5; i++, w >>= 1, h >>= 1) { R.bl.push(R.mk(w, h)); if (i < 4) R.bu.push(R.mk(w, h)); }
  R.rt.scene.texture.minFilter = THREE.LinearFilter;
  if (R.onResize) R.onResize();
};
R.pass = function (mat, target) { R.quad.material = mat; R.r.setRenderTarget(target || null); R.r.render(R.quadScene, R.quadCam); };
/* mirror the main camera in the floor (y = 0); texMat maps a world point into the reflection target */
R.updateReflection = function () {
  const c = R.cam, rc = R.reflCam;
  c.updateMatrixWorld();
  const p = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld), fwd = new THREE.Vector3(0, 0, -1).transformDirection(c.matrixWorld), up = new THREE.Vector3(0, 1, 0).transformDirection(c.matrixWorld);
  rc.position.set(p.x, -p.y, p.z); rc.up.set(up.x, -up.y, up.z); rc.lookAt(p.x + fwd.x, -(p.y + fwd.y), p.z + fwd.z);
  rc.projectionMatrix.copy(c.projectionMatrix); rc.near = c.near; rc.far = c.far; rc.updateMatrixWorld();
  R.texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
};
R.frame = function (t) {
  const r = R.r, m = R.mat, rt = R.rt; R.timeU.value = t;
  R.updateReflection();
  R.reflU.tRefl.value = null;
  r.setRenderTarget(rt.refl); r.clear(); if (R.reflU.uReflK.value > 0) r.render(R.scene, R.reflCam);   // dry rooms skip the mirror pass
  R.reflU.tRefl.value = rt.refl.texture;
  r.setRenderTarget(rt.scene); r.clear(); r.render(R.scene, R.cam);
  const fx = R.fx;
  if (fx) {
    m.down.uniforms.tCol.value = rt.scene.texture; m.down.uniforms.tDep.value = rt.scene.depthTexture; m.down.uniforms.uTexel.value.set(1 / rt.scene.width, 1 / rt.scene.height);
    R.pass(m.down, rt.half);
    const hs = rt.half.width / 640;   // blur sizes are authored for a 640 px wide half-res buffer
    m.blur.uniforms.tHalf.value = rt.half.texture; m.blur.uniforms.uTexel.value.set(1 / rt.half.width, 1 / rt.half.height);
    m.blur.uniforms.uRad.value = (R.q === 'low' ? 1.25 : 0.75); m.blur.uniforms.uMax.value = 11 * hs;
    R.dofU.uNearMax.value = 11 * hs; R.dofU.uFarMax.value = R.farMax * hs;
    R.pass(m.blur, rt.blur);
    m.fill.uniforms.t.value = rt.blur.texture; m.fill.uniforms.uTexel.value.set(1 / rt.blur.width, 1 / rt.blur.height); R.pass(m.fill, rt.blur2);
    if (R.q === 'high' && R.aoK > 0) { const th = Math.tan(THREE.MathUtils.degToRad(R.cam.fov / 2)), A = m.ao.uniforms;
      A.tDep.value = rt.scene.depthTexture; A.uTexel.value.set(1 / rt.ao.width, 1 / rt.ao.height); A.uProj.value.set(th * R.cam.aspect, th); R.pass(m.ao, rt.ao);
      m.aoBlur.uniforms.tAO.value = rt.ao.texture; m.aoBlur.uniforms.tHalf.value = rt.half.texture; m.aoBlur.uniforms.uTexel.value.set(1 / rt.ao.width, 1 / rt.ao.height); R.pass(m.aoBlur, rt.ao2); }
    m.pre.uniforms.t.value = rt.blur2.texture; m.pre.uniforms.uTexel.value.set(1 / rt.blur.width, 1 / rt.blur.height);
    R.pass(m.pre, R.bl[0]);
    for (let i = 1; i < 5; i++) { m.kd.uniforms.t.value = R.bl[i - 1].texture; m.kd.uniforms.uTexel.value.set(0.5 / R.bl[i - 1].width, 0.5 / R.bl[i - 1].height); R.pass(m.kd, R.bl[i]); }
    for (let i = 3; i >= 0; i--) { const src = i === 3 ? R.bl[4] : R.bu[i + 1]; m.ku.uniforms.t.value = src.texture; m.ku.uniforms.tAdd.value = R.bl[i].texture;
      m.ku.uniforms.uTexel.value.set(0.5 / src.width, 0.5 / src.height); R.pass(m.ku, R.bu[i]); }
  }
  const f = m.final.uniforms;
  f.tScene.value = rt.scene.texture; f.tDep.value = rt.scene.depthTexture; f.tBlur.value = rt.blur2.texture; f.tBloom.value = R.bu[0].texture; f.tAO.value = rt.ao2.texture; f.uAO.value = fx && R.q === 'high' ? R.aoK : 0;
  f.uFx.value = fx ? 1 : 0; f.uTime.value = t; f.uRes.value.set(R.bw, R.bh);
  R.pass(m.final, null);
};
/* project a world point to CSS px inside #view (for the HTML markers and the speech bubble) */
R.toView = function (v, out) { const p = v.clone().project(R.cam); out.x = (p.x * 0.5 + 0.5) * R.vw; out.y = (-p.y * 0.5 + 0.5) * R.vh; out.z = p.z; return out; };
