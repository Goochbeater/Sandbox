/* CHARACTER MATERIALS — Maul's painted skin + bone horns (make-up evaluated per pixel from head-space position),
   eyes, black cloth with sheen, black leather, and simple tinted variants for the other cast. All skinned. */
const CM = { cache: {}, fillU: { value: new THREE.Color(0.36, 0.35, 0.34) }, rimU: { value: new THREE.Color(0.55, 0.48, 0.42) } };
/* character lighting shared by every character material: a soft camera-side fill (so black cloth shows its folds) and a
   rim light that outlines the silhouette against any background (uRim per world, set by R.resetGrade / levels) */
CM.FILL = `{ vec3 nN = normalize(normal); vec3 fl = normalize(vec3(-0.5, 0.55, 0.75)); float nd = max(dot(nN, fl), 0.0); reflectedLight.directDiffuse += diffuseColor.rgb * uFill * (nd * 0.8 + 0.2);
  float rimF = pow(1.0 - clamp(dot(nN, normalize(vViewPosition)), 0.0, 1.0), 3.2); reflectedLight.directSpecular += uRim * rimF * (0.3 + 0.7 * clamp(nN.y * 0.6 + 0.55, 0.0, 1.0)); }`;
CM.rimHook = (sh) => { sh.uniforms.uRim = CM.rimU; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim;'); };
CM.hornUniforms = null;
CM.maulSkin = function () {
  if (CM.cache.maulSkin) return CM.cache.maulSkin;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.0, envMapIntensity: 0.8 });
  const U = MH.uniforms(MH.hs);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U); sh.uniforms.uFill = CM.fillU; CM.rimHook(sh);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aHead; attribute float aHorn; attribute float aAO;\nvarying vec3 vHead; varying float vHorn; varying float vAO;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHead = aHead; vHorn = aHorn; vAO = aAO;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uFill; varying vec3 vHead; varying float vHorn; varying float vAO;\n' + MH.COMMON.replace('#define PI 3.14159265359', '') + MH.UNI +
        `const vec3 HP = vec3(0.0, -0.78, -0.32);
         float snarlLift(float ax) { return uFace.z * (0.008 + 0.046 * exp(-sq((ax - 0.10) / 0.065))); }
         vec3 jawSpace(vec3 p) { vec3 o = vec3(0.0, -0.27, -0.06); vec3 q = p - o; q.yz = rot(-uFace.w * 0.20) * q.yz; return q + o; }
        ` + MH.PAINT + `
         float hornT(vec3 p) { float best = 1e3, tt = 0.0; for (int i = 0; i < 10; i++) { vec3 v = p - uHorn[i].xyz; float t = dot(v, uHornD[i].xyz); float r = length(v - uHornD[i].xyz * t); if (r < best) { best = r; tt = t / uHorn[i].w; } } return clamp(tt, 0.0, 1.0); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float red = makeup(vHead, vec3(0.0));
        float nz = vnoise(vHead * 30.0) * 0.6 + vnoise(vHead * 90.0) * 0.4;
        vec3 redC = vec3(0.50, 0.018, 0.012) * (0.85 + 0.3 * nz);
        vec3 blkC = vec3(0.012, 0.009, 0.009) * (0.8 + 0.4 * nz);
        vec3 skinC = mix(blkC, redC, red);
        float ht = hornT(vHead);
        vec3 hornC = mix(vec3(0.20, 0.13, 0.07), vec3(0.62, 0.52, 0.36), smoothstep(0.0, 0.55, ht)) * (0.8 + 0.35 * vnoise(vHead * vec3(60.0, 160.0, 60.0)));
        hornC = mix(hornC, vec3(0.85, 0.78, 0.62), smoothstep(0.75, 1.0, ht) * 0.5);
        diffuseColor.rgb = mix(skinC, hornC, vHorn);
        float gRough = mix(mix(0.36, 0.52, red), 0.5, vHorn);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vAO; reflectedLight.indirectSpecular *= mix(0.35, 1.0, vAO); reflectedLight.directDiffuse *= mix(0.6, 1.0, vAO);\n' + CM.FILL);
  };
  m.customProgramCacheKey = () => 'maulSkin';
  CM.cache.maulSkin = m; return m;
};
/* body materials: per-vertex AO + a shared 'aSheen' term; black cloth gets physical sheen */
CM.withAO = function (m, key, weave) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFill = CM.fillU; CM.rimHook(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAO; varying float vAO; varying vec3 vRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAO = aAO; vRest = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFill; varying float vAO; varying vec3 vRest;' + (weave ? CM.CLOTH_BUMP : ''))
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + (weave ? '\nnormal = clothBump(normal, vRest);' : ''))
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + (weave ? 'float tw = sin((vRest.x + vRest.y) * 1400.0) * sin((vRest.z - vRest.y) * 1400.0) * clamp(1.5 - fwidth((vRest.x + vRest.y) * 1400.0) * 0.6, 0.0, 1.0); float mot = sin(vRest.x * 37.0 + vRest.y * 23.0) * sin(vRest.z * 41.0 - vRest.y * 19.0); diffuseColor.rgb *= 0.9 + 0.07 * tw + 0.06 * mot;' : ''))
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vAO; reflectedLight.indirectSpecular *= mix(0.3, 1.0, vAO); reflectedLight.directDiffuse *= mix(0.55, 1.0, vAO); reflectedLight.directSpecular *= mix(0.5, 1.0, vAO);\n{ float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.5); reflectedLight.indirectSpecular += vec3(0.05, 0.055, 0.075) * rim * vAO; }\n' + CM.FILL.replace('uFill *', 'uFill * vAO *'));
  };
  m.customProgramCacheKey = () => 'ao_' + key;
  return m;
};
/* fabric micro-relief for skinned cloth: a fine weave + soft wrinkles evaluated on the rest pose (so they stick to the
   cloth as it moves), applied as a derivative bump (perturbNormalArb-style) — no tangents or UVs needed */
CM.CLOTH_BUMP = `
  float cbH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float cbN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(cbH(i), cbH(i + vec3(1,0,0)), f.x), mix(cbH(i + vec3(0,1,0)), cbH(i + vec3(1,1,0)), f.x), f.y), mix(mix(cbH(i + vec3(0,0,1)), cbH(i + vec3(1,0,1)), f.x), mix(cbH(i + vec3(0,1,1)), cbH(i + vec3(1,1,1)), f.x), f.y), f.z); }
  vec3 clothBump(vec3 n, vec3 p){
    float fold = cbN(p * vec3(9.0, 3.2, 9.0)) * 0.9 + cbN(p * vec3(22.0, 7.0, 22.0)) * 0.45;
    float h = fold * 0.004;
    vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition); float dhx = dFdx(h), dhy = dFdy(h);
    vec3 r1 = cross(dpy, n), r2 = cross(n, dpx); float det = dot(dpx, r1);
    vec3 g = sign(det) * (dhx * r1 + dhy * r2);
    vec3 nn = normalize(abs(det) * n - g); return dot(nn, n) > 0.2 ? nn : n;
  }`;
CM.cloth = function (hex, sheenHex, rough, key, weave) {
  const k = 'cloth_' + key; if (CM.cache[k]) return CM.cache[k];
  const m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: rough || 0.86, metalness: 0, sheen: 1.0, sheenColor: new THREE.Color(sheenHex), sheenRoughness: 0.45, envMapIntensity: 0.9, side: THREE.FrontSide });
  CM.withAO(m, k, true); CM.cache[k] = m; return m;
};
CM.leather = function (hex, rough, key) {
  const k = 'leather_' + key; if (CM.cache[k]) return CM.cache[k];
  const m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: rough || 0.42, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 1.0 });
  CM.withAO(m, k); CM.cache[k] = m; return m;
};
CM.plain = function (hex, rough, metal, key, emis) {
  const k = 'plain_' + key; if (CM.cache[k]) return CM.cache[k];
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal || 0, envMapIntensity: 1.0, emissive: emis || 0x000000 });
  CM.withAO(m, k); CM.cache[k] = m; return m;
};
/* eyeball: sclera → iris ring → pupil, in eye-local coordinates (+z = gaze) */
CM.eye = function (type) {
  const k = 'eye_' + type; if (CM.cache[k]) return CM.cache[k];
  const sith = type === 'sith';
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, clearcoat: sith ? 1.0 : 0.7, clearcoatRoughness: 0.03, envMapIntensity: sith ? 1.3 : 0.4 });
  const iris = type === 'sith' ? 'vec3(0.95, 0.62, 0.02)' : type === 'blue' ? 'vec3(0.07, 0.12, 0.2)' : 'vec3(0.22, 0.13, 0.05)';
  const ring = type === 'sith' ? 'vec3(0.55, 0.03, 0.0)' : 'vec3(0.03, 0.03, 0.03)';
  const scl = type === 'sith' ? 'vec3(0.62, 0.42, 0.18)' : 'vec3(0.5, 0.45, 0.41)';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vEye;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvEye = normalize(position);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEye;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float a = acos(clamp(vEye.z, -1.0, 1.0));
        vec3 c = ${scl};
        c = mix(c, ${ring}, 1.0 - smoothstep(${sith ? '0.54, 0.6' : '0.6, 0.66'}, a));
        c = mix(c, ${iris}, 1.0 - smoothstep(${sith ? '0.42, 0.5' : '0.46, 0.56'}, a));
        float ang = atan(vEye.y, vEye.x);
        c *= 0.85 + 0.25 * sin(ang * 23.0) * (1.0 - smoothstep(0.12, 0.5, a));
        c = mix(c, vec3(0.005), 1.0 - smoothstep(0.15, 0.19, a));
        ${sith ? '' : '// human: wider iris, the eyeball darkens into the corners and under the upper lid (the lids occlude it)\n        c = mix(c, c * 0.35, smoothstep(0.62, 1.05, a)); c *= mix(1.0, 0.45, smoothstep(0.05, 0.5, vEye.y));'}
        diffuseColor.rgb = c;`);
  };
  m.customProgramCacheKey = () => k;
  CM.cache[k] = m; return m;
};
