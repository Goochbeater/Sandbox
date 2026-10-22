/* RENDER — HDR MSAA scene → bloom mip chain → ACES + grade → screen. A fixed pool of point lights is re-targeted
   every frame at the strongest nearby light sources (sabers, bolts, lamps), so shaders never recompile. */
const R = {
  renderer: null, scene: null, camera: null, cw: 1, ch: 1, dpr: 1, scale: 1, w: 1, h: 1,
  msaa: 4, bloomMips: 6, rt: null, down: [], up: [], mats: {}, fpsEMA: 60, dtEMA: 1 / 60, calls: 0, tris: 0,
  G: { ao: 0.8, aoR: 0.6, exposure: 1.25, bloom: 0.22, bloomThr: 1.05, sat: 1.05, contrast: 1.05, vig: 0.42, grain: 0.022, ca: 0.3, lift: 0.0,
    tint: new THREE.Color(1, 1, 1), fade: 0, rage: 0, hurt: 0, focusBlur: 0,
    // volumetric sunlight (shadow-mapped in-scatter): strength, density, fog floor + falloff, light outside the shadow box, phase g
    vol: 0, volDen: 0.03, volH: 0, volFall: 0.08, volOut: 1, volG: 0.55, volMax: 70, volAmb: new THREE.Color(0, 0, 0), volTint: new THREE.Color(1, 1, 1),
    gShadow: new THREE.Color(1, 1, 1), gHigh: new THREE.Color(1, 1, 1),
    ssr: 0, ssrMax: 30, zoom: 0, haze: 0 },   // screen-space reflections on materials that write a reflectivity mask (TEX.mat refl)
  lights: [], lightSrc: [], NL: 7, dynScale: 1, dynOn: true,
};
R.init = function () {
  const cv = MG.$('cv');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  r.outputColorSpace = THREE.LinearSRGBColorSpace;
  r.toneMapping = THREE.NoToneMapping;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = true;
  r.info.autoReset = false;
  r.debug.onShaderError = (gl, prog, vs, fs) => { const m = 'SHADER ERROR ' + gl.getProgramInfoLog(prog) + ' FS:' + gl.getShaderInfoLog(fs) + ' VS:' + gl.getShaderInfoLog(vs); MG.errors.push(m.slice(0, 3000)); console.error(m.slice(0, 6000)); };
  R.renderer = r; R.gl = r.getContext();
  if (MG.flags.q === 'low') { R.msaa = 0; }
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(58, 1, 0.08, 1400);
  R.scene.add(R.camera);
  // lighting rig shared by every level (levels retune it)
  R.hemi = new THREE.HemisphereLight(0x8899aa, 0x221a18, 0.6); R.scene.add(R.hemi);
  R.sun = new THREE.DirectionalLight(0xffffff, 2.0); R.sun.castShadow = true;
  R.sun.shadow.mapSize.set(2048, 2048); R.sun.shadow.bias = -0.00025; R.sun.shadow.normalBias = 0.025;
  const sc = R.sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 120;
  R.scene.add(R.sun); R.scene.add(R.sun.target);
  R.sunDir = new THREE.Vector3(0.4, 0.8, 0.3).normalize(); R.shadowFocus = new THREE.Vector3();
  for (let i = 0; i < R.NL; i++) { const L = new THREE.PointLight(0xff0000, 0, 8, 2); L.castShadow = false; R.scene.add(L); R.lights.push(L); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  R.quad = new THREE.Mesh(g, null); R.quad.frustumCulled = false;
  R.qscene = new THREE.Scene(); R.qscene.add(R.quad); R.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  R.pmrem = new THREE.PMREMGenerator(r);
  R.buildPost(); R.buildAO(); R.buildVol();
  R.G_DEF = {}; for (const k in R.G) { const v = R.G[k]; R.G_DEF[k] = v && v.isColor ? v.clone() : v; }
  R.resize(true);
  window.addEventListener('resize', () => R.resize(true));
};
const POST_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
R.buildPost = function () {
  const mk = (fs, uni) => new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: fs, uniforms: uni, depthTest: false, depthWrite: false });
  R.mats.pre = mk(`uniform sampler2D tSrc; uniform vec2 texel; uniform float thr, knee; varying vec2 vUv;
    vec3 kw(vec3 s, inout float w){ s = min(s, vec3(40.0)); float k = 1.0 / (1.0 + max(s.r, max(s.g, s.b)) * 0.25); w += k; return s * k; }
    void main(){ float w = 0.0;   // Karis-weighted: a lone sun glint in a glossy floor no longer blooms into a white blob; saber blades keep their glow
      vec3 c = kw(texture2D(tSrc, vUv + texel*vec2(-1.,-1.)).rgb, w) + kw(texture2D(tSrc, vUv + texel*vec2(1.,-1.)).rgb, w) + kw(texture2D(tSrc, vUv + texel*vec2(-1.,1.)).rgb, w) + kw(texture2D(tSrc, vUv + texel*vec2(1.,1.)).rgb, w);
      c /= max(w, 1e-4);
      float br = max(c.r, max(c.g, c.b)); float soft = clamp(br - thr + knee, 0.0, 2.0*knee); soft = soft*soft/(4.0*knee + 1e-4);
      float k = max(soft, br - thr) / max(br, 1e-4); gl_FragColor = vec4(c * k, 1.0); }`,
    { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, thr: { value: 1.0 }, knee: { value: 0.5 } });
  R.mats.down = []; R.mats.upm = [];
  for (let i = 0; i < R.bloomMips; i++) {
    R.mats.down.push(mk(`uniform sampler2D tSrc; uniform vec2 texel; varying vec2 vUv;
      void main(){ vec3 a = texture2D(tSrc, vUv + texel*vec2(-1.,-1.)).rgb, b = texture2D(tSrc, vUv + texel*vec2(1.,-1.)).rgb, c = texture2D(tSrc, vUv + texel*vec2(-1.,1.)).rgb, d = texture2D(tSrc, vUv + texel*vec2(1.,1.)).rgb, e = texture2D(tSrc, vUv).rgb;
        gl_FragColor = vec4((a+b+c+d)*0.125 + e*0.5, 1.0); }`, { tSrc: { value: null }, texel: { value: new THREE.Vector2() } }));
    R.mats.upm.push(mk(`uniform sampler2D tLo, tHi; uniform vec2 texel; uniform float w; varying vec2 vUv;
      void main(){ vec3 s = texture2D(tLo, vUv).rgb*4.0;
        s += (texture2D(tLo, vUv+vec2(texel.x,0.)).rgb + texture2D(tLo, vUv-vec2(texel.x,0.)).rgb + texture2D(tLo, vUv+vec2(0.,texel.y)).rgb + texture2D(tLo, vUv-vec2(0.,texel.y)).rgb)*2.0;
        s += texture2D(tLo, vUv+texel).rgb + texture2D(tLo, vUv-texel).rgb + texture2D(tLo, vUv+vec2(texel.x,-texel.y)).rgb + texture2D(tLo, vUv+vec2(-texel.x,texel.y)).rgb;
        gl_FragColor = vec4(texture2D(tHi, vUv).rgb + s/16.0*w, 1.0); }`, { tLo: { value: null }, tHi: { value: null }, texel: { value: new THREE.Vector2() }, w: { value: 1.0 } }));
  }
  R.mats.comp = mk(`uniform sampler2D tScene, tBloom, tAO, tVol, tSSR; uniform float aoK, volK, ssrK; uniform vec4 uShock; uniform float uZoom, uSharp; uniform sampler2D tDepthC; uniform float uHaze, uNear, uFar; uniform vec3 gShadow, gHigh; uniform vec2 texel; uniform vec2 res; uniform float time, exposure, bloom, sat, contrast, vig, grain, ca, lift, fade, rage, hurt;
    uniform vec3 tint; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p*vec2(443.897, 441.423)); p += dot(p, p.yx+19.19); return fract((p.x+p.y)*p.x); }
    vec3 RRTODT(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 iM = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
      const mat3 oM = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
      return clamp(oM * RRTODT(iM * c), 0.0, 1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, 1.055*pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c)); }
    void main(){
      vec2 uv = vUv;
      if (uShock.w > 0.0) { vec2 d = uv - uShock.xy; d.x *= res.x / res.y; float rr = length(d); float R0 = uShock.z * 0.85;
        float w = exp(-pow((rr - R0) * 14.0, 2.0)) * (1.0 - uShock.z); uv -= (d / max(rr, 1e-4)) * vec2(res.y / res.x, 1.0) * w * uShock.w * 0.035; }
      if (uHaze > 0.0) { float dz = texture2D(tDepthC, uv).r; float lin = uNear * uFar / (uFar - dz * (uFar - uNear));
        float k = smoothstep(35.0, 160.0, lin) * uHaze; uv += vec2(sin(uv.y * 420.0 + time * 7.0) * 0.6 + sin(uv.y * 170.0 - time * 4.3), cos(uv.x * 260.0 + time * 5.1)) * 0.00075 * k; }
      vec2 cc = uv - 0.5; float r2 = dot(cc, cc);
      vec2 off = cc * r2 * ca * 0.012;
      vec3 c = vec3(texture2D(tScene, uv + off).r, texture2D(tScene, uv).g, texture2D(tScene, uv - off).b);
      { vec3 nb = (texture2D(tScene, uv + vec2(texel.x, 0.0)).rgb + texture2D(tScene, uv - vec2(texel.x, 0.0)).rgb + texture2D(tScene, uv + vec2(0.0, texel.y)).rgb + texture2D(tScene, uv - vec2(0.0, texel.y)).rgb) * 0.25;
        c = max(c + (c - nb) * uSharp, vec3(0.0)); }   // contrast-adaptive-ish sharpen: keeps edges crisp, more so when dyn-res drops
      if (uZoom > 0.001) { vec3 zb = c; for (int i = 1; i < 7; i++) { vec2 zu = 0.5 + cc * (1.0 - float(i) * uZoom * 0.011); zb += texture2D(tScene, zu).rgb; } c = mix(c, zb / 7.0, smoothstep(0.02, 0.2, sqrt(r2))); }
      float ao = texture2D(tAO, uv).r; if (aoK > 1.5) { gl_FragColor = vec4(vec3(ao), 1.0); return; } c *= mix(1.0, ao, aoK);
      if (ssrK > 0.0) { vec4 rf = texture2D(tSSR, uv); c = c * (1.0 - clamp(rf.a * ssrK, 0.0, 1.0)) + rf.rgb * ssrK; }
      if (volK > 0.0) { vec4 vo = texture2D(tVol, uv); c += vo.rgb * volK; }
      vec3 b = texture2D(tBloom, uv).rgb;
      c += b * bloom;
      c *= exposure * tint;
      float l0 = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // dark-side rage: drain colour except reds, crush blacks
      vec3 rg = vec3(l0) * vec3(1.0, 0.82, 0.78); rg.r = max(rg.r, c.r * 1.1);
      c = mix(c, rg, rage * 0.72);
      c = aces(c);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat);
      c *= mix(gShadow, gHigh, smoothstep(0.05, 0.7, l));
      c = (c - 0.5) * contrast + 0.5 + lift;
      c *= 1.0 - vig * smoothstep(0.12, 0.72, r2 * 1.6);
      c = mix(c, c * vec3(1.0, 0.25, 0.2), hurt * smoothstep(0.05, 0.5, r2 * 1.8));
      c = clamp(c, 0.0, 1.0);
      c = srgb(c);
      c += (hash(uv * res + fract(time * 7.13) * 91.0) - 0.5) * grain;
      c = mix(c, vec3(0.0), fade);
      gl_FragColor = vec4(c, 1.0); }`,
    { tScene: { value: null }, tBloom: { value: null }, tAO: { value: null }, aoK: { value: 0.75 }, texel: { value: new THREE.Vector2() }, res: { value: new THREE.Vector2() }, time: { value: 0 },
      exposure: { value: 1 }, bloom: { value: 0.2 }, sat: { value: 1 }, contrast: { value: 1 }, vig: { value: 0.4 }, grain: { value: 0.02 }, ca: { value: 0.5 }, lift: { value: 0 },
      fade: { value: 0 }, rage: { value: 0 }, hurt: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) },
      tVol: { value: null }, volK: { value: 0 }, tSSR: { value: null }, ssrK: { value: 0 }, uShock: { value: new THREE.Vector4(0.5, 0.5, 1, 0) }, uZoom: { value: 0 }, uSharp: { value: 0.3 }, tDepthC: { value: null }, uHaze: { value: 0 }, uNear: { value: 0.08 }, uFar: { value: 1400 }, gShadow: { value: new THREE.Color(1, 1, 1) }, gHigh: { value: new THREE.Color(1, 1, 1) } });
};
R.buildAO = function () {
  const mk = (fs, uni) => new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: fs, uniforms: uni, depthTest: false, depthWrite: false });
  const common = `uniform sampler2D tDepth; uniform mat4 pInv; uniform mat4 proj; varying vec2 vUv;
    vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).r; vec4 p = pInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }`;
  R.mats.ao = mk(common + `
    uniform vec2 texel; uniform float radius, time;
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      float d0 = texture2D(tDepth, vUv).r; if (d0 >= 0.9999) { gl_FragColor = vec4(1.0); return; }
      vec3 P = vpos(vUv);
      vec3 Px = vpos(vUv + vec2(texel.x, 0.0)) - P, Py = vpos(vUv + vec2(0.0, texel.y)) - P;
      vec3 N = normalize(cross(Px, Py)); if (dot(N, P) > 0.0) N = -N;
      float ang = h12(gl_FragCoord.xy) * 6.2831853, occ = 0.0; float R = radius * (1.0 + 0.0 * time);
      for (int i = 0; i < 9; i++) {
        float fi = float(i) + 0.5; float r = sqrt(fi / 9.0) * R; float a = ang + fi * 2.39996;
        vec3 dir = vec3(cos(a), sin(a), 0.0);
        vec3 T = normalize(cross(N, vec3(0.3, 0.7, 0.6))); vec3 B = cross(N, T);
        vec3 S = P + (T * dir.x + B * dir.y) * r + N * r * (0.35 + 0.6 * fract(fi * 0.618));
        vec4 c = proj * vec4(S, 1.0); vec2 suv = c.xy / c.w * 0.5 + 0.5;
        if (suv.x < 0.0 || suv.y < 0.0 || suv.x > 1.0 || suv.y > 1.0) continue;
        float sz = vpos(suv).z;
        float rng = smoothstep(0.0, 1.0, R / max(abs(P.z - sz), 1e-3));
        occ += (sz >= S.z + 0.03 ? 1.0 : 0.0) * rng;
      }
      float ao = 1.0 - occ / 9.0;
      gl_FragColor = vec4(vec3(ao), 1.0);
    }`, { tDepth: { value: null }, pInv: { value: new THREE.Matrix4() }, proj: { value: new THREE.Matrix4() }, texel: { value: new THREE.Vector2() }, radius: { value: 0.55 }, time: { value: 0 } });
  const blur = (dx, dy) => mk(common + `
    uniform sampler2D tAO; uniform vec2 dir;
    void main(){ float z0 = vpos(vUv).z; float s = 0.0, w = 0.0;
      for (int i = -4; i <= 4; i++) { vec2 uv = vUv + dir * float(i); float z = vpos(uv).z; float ww = exp(-float(i * i) * 0.12) * exp(-abs(z - z0) * 6.0); s += texture2D(tAO, uv).r * ww; w += ww; }
      gl_FragColor = vec4(vec3(s / max(w, 1e-4)), 1.0); }`, { tDepth: { value: null }, tAO: { value: null }, pInv: { value: new THREE.Matrix4() }, proj: { value: new THREE.Matrix4() }, dir: { value: new THREE.Vector2(dx, dy) } });
  R.mats.aoBH = blur(1, 0); R.mats.aoBV = blur(0, 1);
};
R.buildVol = function () {
  const mk = (fs, uni) => new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: fs, uniforms: uni, depthTest: false, depthWrite: false });
  R.mats.vol = mk(`#include <packing>
    uniform sampler2D tDepth, tShadow; uniform mat4 pInv, camW, shM; uniform vec3 camPos, sunDir, sunCol, ambCol;
    uniform float den, h0, fall, outLit, g, maxD, time, bias; varying vec2 vUv;
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      float d = texture2D(tDepth, vUv).r;
      vec4 vp = pInv * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); vec3 V = vp.xyz / vp.w;
      float dist = length(V); vec3 dv = V / max(dist, 1e-4);
      if (d >= 0.99999) dist = maxD; dist = min(dist, maxD);
      vec3 rd = normalize((camW * vec4(dv, 0.0)).xyz);
      const int N = 16; float st = dist / float(N);
      float jit = h12(gl_FragCoord.xy + fract(time * 7.31) * 113.0);
      float ct = dot(rd, sunDir); float ph = (1.0 - g * g) / (12.566 * pow(max(1.0 + g * g - 2.0 * g * ct, 1e-3), 1.5));
      vec3 acc = vec3(0.0); float T = 1.0;
      for (int i = 0; i < N; i++) {
        vec3 p = camPos + rd * ((float(i) + jit) * st);
        float dn = den * exp(-max(p.y - h0, 0.0) * fall);
        vec4 sc = shM * vec4(p, 1.0); sc.xyz /= sc.w;
        float lit = outLit;
        if (sc.x > 0.002 && sc.x < 0.998 && sc.y > 0.002 && sc.y < 0.998 && sc.z < 1.0) lit = step(sc.z - bias, unpackRGBAToDepth(texture2D(tShadow, sc.xy)));
        acc += T * dn * st * (sunCol * (lit * ph) + ambCol);
        T *= exp(-dn * st);
      }
      gl_FragColor = vec4(acc, T);
    }`, { tDepth: { value: null }, tShadow: { value: null }, pInv: { value: new THREE.Matrix4() }, camW: { value: new THREE.Matrix4() }, shM: { value: new THREE.Matrix4() },
    camPos: { value: new THREE.Vector3() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, ambCol: { value: new THREE.Color() },
    den: { value: 0.03 }, h0: { value: 0 }, fall: { value: 0.08 }, outLit: { value: 1 }, g: { value: 0.55 }, maxD: { value: 70 }, time: { value: 0 }, bias: { value: 0.002 } });
  const blur = () => mk(`uniform sampler2D tDepth, tSrc; uniform mat4 pInv; uniform vec2 dir; varying vec2 vUv;
    float vz(vec2 uv){ float d = texture2D(tDepth, uv).r; vec4 p = pInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.z / p.w; }
    void main(){ float z0 = vz(vUv); vec4 s = vec4(0.0); float w = 0.0;
      for (int i = -4; i <= 4; i++) { vec2 uv = vUv + dir * float(i); float ww = exp(-float(i * i) * 0.1) * exp(-abs(vz(uv) - z0) * 1.5); s += texture2D(tSrc, uv) * ww; w += ww; }
      gl_FragColor = s / max(w, 1e-4); }`, { tDepth: { value: null }, tSrc: { value: null }, pInv: { value: new THREE.Matrix4() }, dir: { value: new THREE.Vector2() } });
  R.mats.volBH = blur(); R.mats.volBV = blur(); R.mats.ssrBH = blur(); R.mats.ssrBV = blur();
  R.mats.ssr = mk(`uniform sampler2D tDepth, tScene; uniform mat4 pInv, proj; uniform vec2 texel; uniform float maxD, time; varying vec2 vUv;
    vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).r; vec4 p = pInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      float m = clamp(1.0 - texture2D(tScene, vUv).a, 0.0, 1.0);
      float d0 = texture2D(tDepth, vUv).r;
      if (m < 0.01 || d0 >= 0.9999) { gl_FragColor = vec4(0.0); return; }
      vec3 P = vpos(vUv);
      vec3 a = vpos(vUv + vec2(texel.x, 0.0)) - P, b = P - vpos(vUv - vec2(texel.x, 0.0));
      vec3 c = vpos(vUv + vec2(0.0, texel.y)) - P, e = P - vpos(vUv - vec2(0.0, texel.y));
      vec3 N = normalize(cross(abs(a.z) < abs(b.z) ? a : b, abs(c.z) < abs(e.z) ? c : e)); if (dot(N, P) > 0.0) N = -N;
      vec3 V = normalize(P), Rd = normalize(reflect(V, N));
      float fres = 0.08 + 0.92 * pow(1.0 - clamp(dot(-V, N), 0.0, 1.0), 4.0);
      float t = 0.12 + 0.2 * h12(gl_FragCoord.xy + fract(time * 3.7) * 71.0), st = 0.18, tp = 0.0; vec2 huv = vec2(0.0); float hit = 0.0;
      for (int i = 0; i < 22; i++) {
        vec3 Q = P + Rd * t; vec4 cl = proj * vec4(Q, 1.0); vec2 uv = cl.xy / cl.w * 0.5 + 0.5;
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 || cl.w < 0.0) break;
        float sz = vpos(uv).z, dz = sz - Q.z;
        if (dz > 0.0 && dz < 0.25 + t * 0.06) {
          float lo = tp, hi = t;
          for (int k = 0; k < 4; k++) { float mid = 0.5 * (lo + hi); vec3 Q2 = P + Rd * mid; vec4 c2 = proj * vec4(Q2, 1.0); vec2 u2 = c2.xy / c2.w * 0.5 + 0.5; if (vpos(u2).z - Q2.z > 0.0) hi = mid; else lo = mid; }
          vec3 Qh = P + Rd * hi; vec4 ch = proj * vec4(Qh, 1.0); huv = ch.xy / ch.w * 0.5 + 0.5; hit = 1.0 - smoothstep(maxD * 0.6, maxD, hi); break;
        }
        tp = t; t += st; st *= 1.17; if (t > maxD) break;
      }
      vec2 ed = smoothstep(vec2(0.0), vec2(0.08), huv) * (1.0 - smoothstep(vec2(0.92), vec2(1.0), huv));
      hit *= ed.x * ed.y * smoothstep(-0.1, 0.25, -Rd.z + 0.3);
      vec3 col = hit > 0.0 ? texture2D(tScene, huv).rgb : vec3(0.0);
      float w = hit * m * fres; gl_FragColor = vec4(min(col, vec3(40.0)) * w, w);
    }`, { tDepth: { value: null }, tScene: { value: null }, pInv: { value: new THREE.Matrix4() }, proj: { value: new THREE.Matrix4() }, texel: { value: new THREE.Vector2() }, maxD: { value: 30 }, time: { value: 0 } });
};
R.G_DEF = null;
R.resetGrade = function () {   // every level starts from the same look and sets its own
  if (!R.G_DEF) return;
  for (const k in R.G_DEF) { const v = R.G_DEF[k]; if (v && v.isColor) R.G[k].copy(v); else R.G[k] = v; }
  if (typeof CM !== 'undefined') {
    CM.fillU.value.setRGB(0.3, 0.29, 0.28);
    const w = typeof LEVEL !== 'undefined' && LEVEL.cur && LEVEL.cur.def ? LEVEL.cur.def.world : '';
    CM.rimU.value.setRGB(...({ coruscant: [0.5, 0.32, 0.28], tatooine: [0.56, 0.48, 0.38], naboo: [0.5, 0.45, 0.4] }[w] || [0.45, 0.38, 0.34]));
  }
};
R.resize = function () {
  const w = Math.max(1, window.innerWidth || 1280), h = Math.max(1, window.innerHeight || 720);
  R.cw = w; R.ch = h;
  R.dprBase = Math.min(window.devicePixelRatio || 1, MG.flags.dpr || 1.5);
  const wantMsaa = MG.flags.msaa !== undefined ? +MG.flags.msaa : MG.flags.q === 'low' || R.dprBase > 1.25 ? 0 : 2;   // Retina: pixel density does the anti-aliasing; 4× on the HDR target cost ~35 % of the frame on big screens; 2× + the comp sharpen is the balance if (wantMsaa !== R.msaa) { R.msaa = wantMsaa; if (R.rt) { R.rt.dispose(); R.rt = null; R.w = 0; } }
  R.applyScale();
};
R.applyScale = function () {
  const dpr = R.dprBase * R.dynScale;
  R.renderer.setPixelRatio(dpr); R.renderer.setSize(R.cw, R.ch, true);
  const W = Math.max(2, Math.round(R.cw * dpr)), H = Math.max(2, Math.round(R.ch * dpr));
  if (W === R.w && H === R.h && R.rt) return;
  R.w = W; R.h = H;
  R.camera.aspect = R.cw / R.ch; R.camera.updateProjectionMatrix();
  if (R.rt) R.rt.dispose();
  const dt = new THREE.DepthTexture(W, H); dt.type = THREE.UnsignedIntType; dt.minFilter = dt.magFilter = THREE.NearestFilter;
  R.rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: R.msaa, depthBuffer: true, depthTexture: dt });
  if (R.aoA) { R.aoA.dispose(); R.aoB.dispose(); }
  const ao = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  R.aoA = new THREE.WebGLRenderTarget(W >> 1, H >> 1, ao); R.aoB = new THREE.WebGLRenderTarget(W >> 1, H >> 1, ao);
  if (R.volA) { R.volA.dispose(); R.volB.dispose(); }
  R.volA = new THREE.WebGLRenderTarget(W >> 2, H >> 2, ao); R.volB = new THREE.WebGLRenderTarget(W >> 2, H >> 2, ao);
  if (R.ssrA) { R.ssrA.dispose(); R.ssrB.dispose(); }
  R.ssrA = new THREE.WebGLRenderTarget(W >> 1, H >> 1, ao); R.ssrB = new THREE.WebGLRenderTarget(W >> 1, H >> 1, ao);
  R.rt.texture.minFilter = THREE.LinearFilter; R.rt.texture.magFilter = THREE.LinearFilter;
  for (const t of R.down) t.dispose(); for (const t of R.up) t.dispose(); R.down = []; R.up = [];
  let w = W >> 1, hh = H >> 1;
  for (let i = 0; i < R.bloomMips; i++) {
    const o = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    R.down.push(new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, hh), o));
    R.up.push(new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, hh), o));
    w >>= 1; hh >>= 1;
  }
};
R.pass = function (mat, target) { R.quad.material = mat; R.renderer.setRenderTarget(target); R.renderer.render(R.qscene, R.qcam); };
/* ---------------------------------------------------------------- light pool */
R.addLight = function (src) { R.lightSrc.push(src); return src; };   // {pos:Vector3, col:Color, i, range, on, prio}
R.removeLight = function (src) { const i = R.lightSrc.indexOf(src); if (i >= 0) R.lightSrc.splice(i, 1); };
R.clearLevelLights = function () { R.lightSrc = R.lightSrc.filter((s) => s.persist); };
R.updateLights = function () {
  const cam = R.camera.position, foc = R.shadowFocus;
  const cand = [];
  for (const s of R.lightSrc) {
    if (s.on === false || s.i <= 0.001) continue;
    const d = Math.min(s.pos.distanceTo(cam), s.pos.distanceTo(foc));
    if (d > s.range * 3.2 + 14) continue;
    s._score = (s.prio || 1) * s.i * s.range / (1 + d * d * 0.02);
    cand.push(s);
  }
  cand.sort((a, b) => b._score - a._score);
  for (let i = 0; i < R.NL; i++) {
    const L = R.lights[i], s = cand[i];
    if (!s) { L.intensity = 0; L.visible = true; continue; }
    L.position.copy(s.pos); L.color.copy(s.col); L.intensity = s.i; L.distance = s.range; L.decay = 2;
  }
};
R.setSun = function (dir, color, inten, hemiSky, hemiGnd, hemiI) {
  R.sunDir.copy(dir).normalize(); R.sun.color.set(color); R.sun.intensity = inten * Math.PI;   // r155+ physical units
  R.hemi.color.set(hemiSky); R.hemi.groundColor.set(hemiGnd); R.hemi.intensity = hemiI * Math.PI;
};
R.setShadowBox = function (half, far) {   // levels trade shadow texel density for coverage (volumetrics need the lit volume covered)
  const c = R.sun.shadow.camera; c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.far = far || 120; c.updateProjectionMatrix();
};
R.updateShadow = function (focus) {
  R.shadowFocus.copy(focus);
  // texel-snapped so the shadow edge does not swim
  const cam = R.sun.shadow.camera, span = (cam.right - cam.left), tex = span / R.sun.shadow.mapSize.x;
  const up = Math.abs(R.sunDir.y) > 0.99 ? new THREE.Vector3(0, 0, 1) : YUP;
  const zx = R.sunDir.clone().negate(), xx = new THREE.Vector3().crossVectors(up, zx).normalize(), yx = new THREE.Vector3().crossVectors(zx, xx);
  const fx = Math.round(focus.dot(xx) / tex) * tex, fy = Math.round(focus.dot(yx) / tex) * tex, fz = focus.dot(zx);
  const f = xx.multiplyScalar(fx).add(yx.multiplyScalar(fy)).add(zx.multiplyScalar(fz));
  R.sun.target.position.copy(f); R.sun.position.copy(f).addScaledVector(R.sunDir, 60);
  R.sun.target.updateMatrixWorld(); R.sun.updateMatrixWorld();
};
/* environment map from a sky scene (or any scene) */
R.setEnvFromScene = function (sc) {
  if (R.envRT) R.envRT.dispose();
  R.envRT = R.pmrem.fromScene(sc, 0.02, 0.1, 400);
  R.scene.environment = R.envRT.texture;
};
/* ---------------------------------------------------------------- frame */
R.render = function (dt) {
  const r = R.renderer;
  r.info.reset();
  R.updateLights();
  // shadows re-render every other frame (half the cost; a one-frame lag is invisible at 60 fps)
  R._sf = (R._sf || 0) + 1; r.shadowMap.autoUpdate = false; if (R._sf % 2 === 0 || dt === 0) r.shadowMap.needsUpdate = true;
  r.setRenderTarget(R.rt); r.clear(true, true, false);
  r.render(R.scene, R.camera);
  R.calls = r.info.render.calls; R.tris = r.info.render.triangles;
  if (R.G.ao > 0) {
    const cam = R.camera, a = R.mats.ao.uniforms;
    a.tDepth.value = R.rt.depthTexture; a.pInv.value.copy(cam.projectionMatrixInverse); a.proj.value.copy(cam.projectionMatrix); a.texel.value.set(2 / R.w, 2 / R.h); a.radius.value = R.G.aoR;
    R.pass(R.mats.ao, R.aoA);
    for (const [m, src, dst, dx, dy] of [[R.mats.aoBH, R.aoA, R.aoB, 2 / R.w, 0], [R.mats.aoBV, R.aoB, R.aoA, 0, 2 / R.h]]) { const u = m.uniforms; u.tDepth.value = R.rt.depthTexture; u.tAO.value = src.texture; u.pInv.value.copy(cam.projectionMatrixInverse); u.dir.value.set(dx, dy); R.pass(m, dst); }
  }
  // volumetric sunlight
  const G = R.G;
  const sm = R.sun.shadow.map;
  const volOn = G.vol > 0 && sm && R.sun.castShadow;
  if (volOn) {
    const cam = R.camera, u = R.mats.vol.uniforms;
    u.tDepth.value = R.rt.depthTexture; u.tShadow.value = sm.texture; u.pInv.value.copy(cam.projectionMatrixInverse); u.camW.value.copy(cam.matrixWorld); u.shM.value.copy(R.sun.shadow.matrix);
    u.camPos.value.setFromMatrixPosition(cam.matrixWorld); u.sunDir.value.copy(R.sunDir); u.sunCol.value.copy(R.sun.color).multiplyScalar(R.sun.intensity / Math.PI).multiply(G.volTint); u.ambCol.value.copy(G.volAmb);
    u.den.value = G.volDen; u.h0.value = G.volH; u.fall.value = G.volFall; u.outLit.value = G.volOut; u.g.value = G.volG; u.maxD.value = G.volMax; u.time.value = MG.rt;
    R.pass(R.mats.vol, R.volA);
    for (const [m, src, dst, dx, dy] of [[R.mats.volBH, R.volA, R.volB, 4 / R.w, 0], [R.mats.volBV, R.volB, R.volA, 0, 4 / R.h]]) { const bu = m.uniforms; bu.tDepth.value = R.rt.depthTexture; bu.tSrc.value = src.texture; bu.pInv.value.copy(cam.projectionMatrixInverse); bu.dir.value.set(dx, dy); R.pass(m, dst); }
  }
  // screen-space reflections (premultiplied colour in rgb, weight in a)
  const ssrOn = G.ssr > 0;
  if (ssrOn) {
    const cam = R.camera, u = R.mats.ssr.uniforms;
    u.tDepth.value = R.rt.depthTexture; u.tScene.value = R.rt.texture; u.pInv.value.copy(cam.projectionMatrixInverse); u.proj.value.copy(cam.projectionMatrix); u.texel.value.set(2 / R.w, 2 / R.h); u.maxD.value = G.ssrMax; u.time.value = MG.rt;
    R.pass(R.mats.ssr, R.ssrA);
    for (const [m, src, dst, dx, dy] of [[R.mats.ssrBH, R.ssrA, R.ssrB, 2 / R.w, 0], [R.mats.ssrBV, R.ssrB, R.ssrA, 0, 2 / R.h]]) { const bu = m.uniforms; bu.tDepth.value = R.rt.depthTexture; bu.tSrc.value = src.texture; bu.pInv.value.copy(cam.projectionMatrixInverse); bu.dir.value.set(dx * 0.6, dy * 0.6); R.pass(m, dst); }
  }
  // bloom
  const pre = R.mats.pre; pre.uniforms.tSrc.value = R.rt.texture; pre.uniforms.texel.value.set(1 / R.w, 1 / R.h); pre.uniforms.thr.value = G.bloomThr; pre.uniforms.knee.value = 0.6;
  R.pass(pre, R.down[0]);
  for (let i = 1; i < R.bloomMips; i++) { const m = R.mats.down[i]; m.uniforms.tSrc.value = R.down[i - 1].texture; m.uniforms.texel.value.set(1 / R.down[i - 1].width, 1 / R.down[i - 1].height); R.pass(m, R.down[i]); }
  let lo = R.down[R.bloomMips - 1];
  for (let i = R.bloomMips - 2; i >= 0; i--) { const m = R.mats.upm[i]; m.uniforms.tLo.value = lo.texture; m.uniforms.tHi.value = R.down[i].texture; m.uniforms.texel.value.set(1 / lo.width, 1 / lo.height); m.uniforms.w.value = i < 2 ? 1.0 : 0.85; R.pass(m, R.up[i]); lo = R.up[i]; }
  const c = R.mats.comp.uniforms;
  c.tScene.value = R.rt.texture; c.tBloom.value = lo.texture; c.tAO.value = R.aoA.texture; c.aoK.value = R.G.ao; c.texel.value.set(1 / R.w, 1 / R.h); c.res.value.set(R.w, R.h); c.time.value = MG.rt;
  c.exposure.value = G.exposure; c.bloom.value = G.bloom; c.sat.value = G.sat; c.contrast.value = G.contrast; c.vig.value = G.vig; c.grain.value = G.grain; c.ca.value = G.ca;
  c.lift.value = G.lift; c.fade.value = G.fade; c.rage.value = G.rage; c.hurt.value = G.hurt; c.tint.value.copy(G.tint);
  c.tSSR.value = R.ssrA.texture; c.ssrK.value = ssrOn ? G.ssr : 0;
  if (R._shk) { R._shk.t += Math.max(dt, 0) * 1.7; if (R._shk.t >= 1) R._shk = null; }
  c.uShock.value.set(R._shk ? R._shk.x : 0.5, R._shk ? R._shk.y : 0.5, R._shk ? R._shk.t : 1, R._shk ? R._shk.a : 0);
  G.zoom = Math.max(0, G.zoom - Math.max(dt, 0) * 2.8); c.uZoom.value = G.zoom; c.uSharp.value = 0.18 + (1 - R.dynScale) * 1.4;
  c.uHaze.value = G.haze; c.tDepthC.value = R.rt.depthTexture; c.uNear.value = R.camera.near; c.uFar.value = R.camera.far;
  c.tVol.value = R.volA.texture; c.volK.value = volOn ? G.vol : 0; c.gShadow.value.copy(G.gShadow); c.gHigh.value.copy(G.gHigh);
  R.pass(R.mats.comp, null);
  // dynamic resolution (only while playing and visible)
  if (dt > 0 && dt < 0.25) {
    R.dtEMA = lerp(R.dtEMA, dt, 0.05); R.fpsEMA = 1 / R.dtEMA;
    if (R.dynOn && !MG.headless && !document.hidden && MG.rt > 6) {
      R._dynT = (R._dynT || 0) + dt;
      if (R._dynT > 1.2) {
        R._dynT = 0;
        const old = R.dynScale;
        if (R.fpsEMA < 47) R.dynScale = Math.max(0.75, R.dynScale - 0.06);
        else if (R.fpsEMA > 58.5) R.dynScale = Math.min(1, R.dynScale + 0.04);
        if (Math.abs(old - R.dynScale) > 1e-3) R.applyScale();
      }
    }
  }
};
R.shot = function (q) { R.render(0); return R.renderer.domElement.toDataURL('image/jpeg', q || 0.9); };

/* a screen-space shockwave rippling out from a world point (Force push, slams, rage) */
R.shock = function (p, amp) {
  const v = _v5.copy(p).project(R.camera); if (v.z > 1) return;
  R._shk = { x: v.x * 0.5 + 0.5, y: v.y * 0.5 + 0.5, t: 0, a: amp || 1 };
};
R.kick = function (z) { R.G.zoom = Math.max(R.G.zoom, z); };   // radial speed blur
