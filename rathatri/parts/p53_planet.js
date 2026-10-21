/* PLANET — the mission worlds (master build §5.3, docs/lore/03_mission_worlds.md visual bibles). One seeded height function per world, sampled
   identically by the terrain mesh, PHY (ground, LOS, AI) and every prop that stands on it (Starfall's rule: one field, every LOD agrees).
   PLANET.build(L, id, o) lays down terrain + water + sky + fog + light + weather + flora/rocks (p53b FLORA) for a bounded mission sector and
   returns { f, W, y(x,z) }. PLANET.descent(L, o) is Starfall's chaptered approach re-skinned dark (orbit → cloud breach → the world takes the
   light → landing corridor → touchdown) with the ship flying the route; tap to skip. SCAN is the artifact-echo pulse (Kreia's "sense the
   battlefield" made literal). Worlds: dxun hutta zx34 ambria raxus krayiss lenico onderon. */
const PLANET = { cur: null };
PLANET.W = {
  dxun: { seed: 3951, half: 210, res: 2.0, amp: 22, scale: 0.0062, ridge: 0.35, warp: 0.6, top: 'ground_lichen', topTint: 0x5a7a3a, slope: 'rock_dark', slopeTint: 0x6a6a58, low: 0x223318, lowY: -2, water: { y: -3.2, col: 0x1a2416 },
    fog: [0x34462e, 0.029], light: { dir: [-0.35, 0.72, 0.45], col: 0xd8f0c0, i: 1.5, sky: 0x9ac080, gnd: 0x2a3a1c, hemi: 2.0 }, grade: { exposure: 1.12, bloom: 0.24, sat: 1.1 },
    sky: { zen: [0.035, 0.05, 0.04], mid: [0.11, 0.15, 0.1], hor: [0.2, 0.27, 0.18], sun: [-0.35, 0.72, 0.45], sunCol: [0.9, 1.0, 0.75], clouds: 0.85, storm: 0.6, lightning: 0.25, planet: { dir: [0.5, 0.42, 0.75], r: 0.17, a: [0.2, 0.3, 0.18], b: [0.14, 0.2, 0.26] } },
    flora: 'jungle', rocks: 26, weather: 'rain', mist: 1 },
  hutta: { seed: 4260, half: 120, res: 1.6, amp: 4, scale: 0.012, ridge: 0.0, warp: 0.3, top: 'ground_lichen', topTint: 0x5a4a2a, slope: 'wall_slates', slopeTint: 0x5a4a38, low: 0x1d1a0c, lowY: -0.4, water: { y: -0.6, col: 0x2a2810 },
    fog: [0x2a2410, 0.06], light: { dir: [-0.2, 0.8, 0.4], col: 0xd8b880, i: 0.9, sky: 0x8a7a50, gnd: 0x2a2410, hemi: 1.3 }, grade: { exposure: 1.2, bloom: 0.25, sat: 0.92 },
    sky: { zen: [0.08, 0.075, 0.04], mid: [0.18, 0.15, 0.07], hor: [0.29, 0.23, 0.09], sun: [-0.2, 0.8, 0.4], sunCol: [0.3, 0.25, 0.12], clouds: 0.95, smear: 1 }, flora: 'swamp', rocks: 6, weather: 'drizzle' },
  zx34: { seed: 7310, half: 160, res: 2.0, amp: 18, scale: 0.008, ridge: 0.7, warp: 0.4, crater: 1, top: 'rock_strata', topTint: 0x6a6276, slope: 'rock_dark', slopeTint: 0x3a3440, low: 0x2a2630, lowY: -6,
    fog: [0x1a1626, 0.022], light: { dir: [0.45, 0.35, 0.82], col: 0xfff4e0, i: 2.2, sky: 0x6a5a80, gnd: 0x16121c, hemi: 0.9 }, grade: { exposure: 1.1, bloom: 0.24, sat: 0.95 },
    sky: { zen: [0.01, 0.01, 0.02], mid: [0.04, 0.035, 0.06], hor: [0.12, 0.1, 0.16], sun: [0.45, 0.35, 0.82], sunCol: [3, 2.9, 2.6], sunSize: 0.9995, stars: 1, planet: { dir: [-0.4, 0.5, -0.76], r: 0.42, a: [0.42, 0.29, 0.16], b: [0.23, 0.16, 0.29], ring: 1 } }, flora: 'none', rocks: 30, weather: 'frost' },
  ambria: { seed: 4400, half: 220, res: 2.2, amp: 14, scale: 0.0075, ridge: 0.15, warp: 0.5, dunes: 1, top: 'ground_lichen', topTint: 0xb07a3c, slope: 'rock_strata', slopeTint: 0x8a5a32, low: 0x0d0b10, lowY: -3, glass: 1, water: { y: -3.6, col: 0x0d0b10, glass: 1 },
    fog: [0x2b1f14, 0.022], light: { dir: [0.4, 0.55, 0.73], col: 0xffd8a0, i: 2.4, sky: 0xd89a52, gnd: 0x3a2414, hemi: 1.1 }, grade: { exposure: 1.12, bloom: 0.22, sat: 1.05 },
    sky: { zen: [0.23, 0.16, 0.11], mid: [0.5, 0.33, 0.18], hor: [0.85, 0.6, 0.32], sun: [0.4, 0.55, 0.73], sunCol: [3.2, 2.4, 1.3], sunSize: 0.998, haze: 1 }, flora: 'none', rocks: 18, weather: 'dust' },
  raxus: { seed: 3960, half: 200, res: 2.0, amp: 16, scale: 0.009, ridge: 0.5, warp: 0.7, heap: 1, top: 'hull_plate_rust', topTint: 0x6b4a32, slope: 'hull_plate_rust', slopeTint: 0x4a3a30, low: 0x4b5a2a, lowY: -3.5, water: { y: -4.2, col: 0x3a4a1a },
    fog: [0x24211c, 0.035], light: { dir: [-0.5, 0.45, 0.74], col: 0xe8c880, i: 1.3, sky: 0x8a7a40, gnd: 0x24211c, hemi: 1.3 }, grade: { exposure: 1.18, bloom: 0.26, sat: 0.95 },
    sky: { zen: [0.11, 0.1, 0.09], mid: [0.22, 0.19, 0.12], hor: [0.35, 0.29, 0.13], sun: [-0.5, 0.45, 0.74], sunCol: [0.9, 0.75, 0.3], clouds: 0.9, smog: 1, lightning: 0.4 }, flora: 'none', rocks: 10, weather: 'acid' },
  krayiss: { seed: 5100, half: 200, res: 2.0, amp: 34, scale: 0.0075, ridge: 0.9, warp: 0.5, top: 'rock_strata', topTint: 0x5a6068, slope: 'rock_dark', slopeTint: 0x3a3e46, low: 0x1b1f26, lowY: -8,
    fog: [0x141820, 0.04], light: { dir: [0.3, 0.5, -0.8], col: 0xa0b8e8, i: 1.3, sky: 0x4a2f6b, gnd: 0x10141a, hemi: 1.4 }, grade: { exposure: 1.2, bloom: 0.3, sat: 1.1 },
    sky: { zen: [0.04, 0.04, 0.1], mid: [0.29, 0.18, 0.42], hor: [0.16, 0.42, 0.45], sun: [0.3, 0.5, -0.8], sunCol: [0.8, 0.9, 1.2], nebula: 1, lightning: 0.7, stars: 0.6 }, flora: 'petrified', rocks: 40, weather: 'wind' },
  lenico: { seed: 6660, half: 200, res: 2.2, amp: 6, scale: 0.008, ridge: 0.2, warp: 0.4, glass: 1, top: 'ground_lichen', topTint: 0x6a6668, slope: 'rock_strata', slopeTint: 0x5d5a5c, low: 0x3e4a52, lowY: -1.2, water: { y: -1.6, col: 0x3e4a52, glass: 1 },
    fog: [0x1c1424, 0.045], light: { dir: [-0.3, 0.42, 0.85], col: 0xc8b8d8, i: 1.0, sky: 0x5a4a6a, gnd: 0x1c1418, hemi: 1.5 }, grade: { exposure: 1.22, bloom: 0.34, sat: 1.05 },
    sky: { zen: [0.04, 0.04, 0.09], mid: [0.1, 0.07, 0.13], hor: [0.22, 0.16, 0.22], sun: [-0.3, 0.42, 0.85], sunCol: [0.7, 0.55, 0.6], aurora: 1, stars: 0.8 }, flora: 'twisted', rocks: 14, weather: 'ash' },
  onderon: { seed: 4000, half: 200, res: 2.0, amp: 10, scale: 0.007, ridge: 0.3, warp: 0.5, top: 'ground_lichen', topTint: 0x5a7040, slope: 'blocks_sand', slopeTint: 0x8a7a60, low: 0x2a3a20, lowY: -2,
    fog: [0x203020, 0.022], light: { dir: [0.4, 0.62, 0.68], col: 0xfff0d8, i: 2.4, sky: 0x8ab0d0, gnd: 0x2a3020, hemi: 1.1 }, grade: { exposure: 1.08, bloom: 0.2, sat: 1.06 },
    sky: { zen: [0.1, 0.2, 0.4], mid: [0.35, 0.5, 0.7], hor: [0.7, 0.75, 0.75], sun: [0.4, 0.62, 0.68], sunCol: [3.4, 3.1, 2.6], sunSize: 0.9993, clouds: 0.55, planet: { dir: [-0.5, 0.35, -0.8], r: 0.09, a: [0.3, 0.42, 0.26], b: [0.2, 0.3, 0.2] } }, flora: 'jungle', rocks: 8, weather: null },
};
PLANET.n2 = (x, z) => vnoise2(x, z);
/* Starfall's stack, trimmed for a bounded sector: macro fbm → domain warp → ridges → per-world shapers (dunes, craters, heap plates)
   → flat pads where the level wants them (LZ, arenas). Returns raw height; PLANET.field() caches it on a grid. */
PLANET.rawHeight = function (W, pads) {
  const s = W.scale, A = W.amp, sx = (W.seed % 1000) * 1.37, sz = (W.seed % 997) * 2.11;
  return (x, z) => {
    let X = x * s + sx, Z = z * s + sz;
    const wx = (fbm2(X * 0.7 + 5.2, Z * 0.7 - 1.3, 3) - 0.5) * W.warp * 2.2, wz = (fbm2(X * 0.7 - 7.7, Z * 0.7 + 3.1, 3) - 0.5) * W.warp * 2.2; X += wx; Z += wz;
    let h = (fbm2(X, Z, 5) - 0.5) * 2;
    if (W.ridge) { const r = 1 - Math.abs(fbm2(X * 1.9 + 11, Z * 1.9 - 4, 4) * 2 - 1); h = lerp(h, r * r * 1.4 - 0.45, W.ridge * 0.6); }
    if (W.dunes) { const d = Math.sin((x * 0.9 + z * 0.4) * 0.045 + fbm2(X * 2, Z * 2, 2) * 5); h += (Math.abs(d) * 0.5 - 0.25) * 0.5; }
    if (W.crater) { const cx = Math.floor(x / 70), cz = Math.floor(z / 70); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const gx = cx + i, gz = cz + j, hr = hash2(gx + W.seed, gz); if (hr < 0.45) continue; const px = (gx + hash2(gx, gz + 7)) * 70, pz = (gz + hash2(gx + 3, gz)) * 70, R = 12 + hash2(gx, gz) * 22, d = Math.hypot(x - px, z - pz) / R; if (d < 1.4) h += (d < 1 ? (d * d - 1) * 0.35 : Math.sin((d - 1) / 0.4 * Math.PI) * 0.12) * (R / 30); } }
    if (W.heap) { const c = Math.floor(x / 9) + Math.floor(z / 9) * 131; h += (hash2(c, 5) - 0.5) * 0.08; }
    let y = h * A;
    for (const p of pads || []) { const d = Math.hypot(x - p[0], z - p[1]), k = 1 - smooth(p[2], p[2] + (p[4] || 14), d); y = lerp(y, p[3], k); }
    return y;
  };
};
PLANET.field = function (raw, x0, z0, x1, z1, res) {   // cache on a grid; bilinear lookups for PHY/AI, raw for out-of-grid
  const nx = Math.ceil((x1 - x0) / res) + 1, nz = Math.ceil((z1 - z0) / res) + 1, H = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) H[j * nx + i] = raw(x0 + i * res, z0 + j * res);
  const f = (x, z) => { const fx = (x - x0) / res, fz = (z - z0) / res; if (fx < 0 || fz < 0 || fx >= nx - 1 || fz >= nz - 1) return raw(x, z); const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * nx + i;
    return (H[k] * (1 - u) + H[k + 1] * u) * (1 - v) + (H[k + nx] * (1 - u) + H[k + nx + 1] * u) * v; };
  f.raw = raw; return f;
};
/* terrain: triplanar photo textures (top / slope) tinted per world, a low "mire" tint below lowY, macro tone drift, wetness by height;
   glass worlds polish their flats into mirror-dark obsidian */
PLANET.terrainMat = function (W) {
  const top = ASSET.tex(W.top), topN = ASSET.has(W.top + '_nrm') ? ASSET.tex(W.top + '_nrm') : null, sl = ASSET.tex(W.slope), slN = ASSET.has(W.slope + '_nrm') ? ASSET.tex(W.slope + '_nrm') : null;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.55 });
  const U = { tTop: { value: top }, tSl: { value: sl }, tTopN: { value: topN || ASSET._solid(true) }, tSlN: { value: slN || ASSET._solid(true) }, uTopT: { value: new THREE.Color(W.topTint) }, uSlT: { value: new THREE.Color(W.slopeTint) }, uLow: { value: new THREE.Color(W.low) }, uLowY: { value: W.lowY || -999 }, uGlass: { value: W.glass ? 1 : 0 }, uWet: { value: W.weather === 'rain' || W.weather === 'drizzle' || W.weather === 'acid' ? 1 : 0 } };
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPW; varying vec3 vPN;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvPW = (modelMatrix * vec4(transformed, 1.0)).xyz; vPN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D tTop, tSl, tTopN, tSlN; uniform vec3 uTopT, uSlT, uLow; uniform float uLowY, uGlass, uWet; varying vec3 vPW; varying vec3 vPN;
float pH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(pH(i), pH(i + vec2(1, 0)), f.x), mix(pH(i + vec2(0, 1)), pH(i + vec2(1, 1)), f.x), f.y); }
vec3 triT(sampler2D t, vec3 p, vec3 w, float s){ return texture2D(t, p.zy / s).rgb * w.x + texture2D(t, p.xz / s).rgb * w.y + texture2D(t, p.xy / s).rgb * w.z; }
float pSteep; float pGlassK;`)
      .replace('#include <map_fragment>', `{ vec3 n = normalize(vPN); vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
        pSteep = 1.0 - smoothstep(0.62, 0.84, n.y);
        float macro = pN(vPW.xz * 0.018) * 0.6 + pN(vPW.xz * 0.06) * 0.4;
        vec2 tuv = mat2(0.8, -0.6, 0.6, 0.8) * vPW.xz;
        vec3 tc = mix(texture2D(tTop, vPW.xz / 4.2).rgb, texture2D(tTop, tuv / 9.7).rgb, smoothstep(0.35, 0.65, pN(vPW.xz * 0.012 + 3.0))) * uTopT * 2.2;
        vec3 sc = triT(tSl, vPW, w, 5.5) * uSlT * 2.0;
        vec3 c = mix(tc, sc, pSteep) * (0.78 + 0.44 * macro);
        float lowK = 1.0 - smoothstep(uLowY - 0.6, uLowY + 0.9, vPW.y); c = mix(c, uLow * (0.8 + 0.4 * pN(vPW.xz * 0.8)), lowK * (1.0 - pSteep) * 0.85);
        pGlassK = uGlass * lowK * (1.0 - pSteep); c = mix(c, vec3(0.025, 0.022, 0.03), pGlassK);
        diffuseColor.rgb *= c; }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        { float wetK = uWet * (0.35 + 0.65 * smoothstep(0.55, 0.8, pN(vPW.xz * 0.09))) * (1.0 - pSteep); roughnessFactor = mix(roughnessFactor, 0.3, wetK); roughnessFactor = mix(roughnessFactor, 0.06, pGlassK); }`)
      .replace('#include <normal_fragment_maps>', `{ vec3 n0 = normalize(vPN); vec3 w = pow(abs(n0), vec3(4.0)); w /= (w.x + w.y + w.z); vec3 tn = texture2D(tTopN, vPW.xz / 4.2).xyz * 2.0 - 1.0; vec3 sn = (texture2D(tSlN, vPW.zy / 5.5).xyz * w.x + texture2D(tSlN, vPW.xz / 5.5).xyz * w.y + texture2D(tSlN, vPW.xy / 5.5).xyz * w.z) * 2.0 - 1.0;
        vec3 d = mix(vec3(tn.x, 0.0, -tn.y), vec3(sn.x, sn.y * 0.0, sn.y), pSteep) * 0.55 * (1.0 - pGlassK); normal = normalize(normal + (viewMatrix * vec4(d, 0.0)).xyz); }`);
  };
  m.customProgramCacheKey = () => 'planetTer';
  return m;
};
/* sky: gradient, sun disc + bloom, cloud bands, and per-world extras: the gas giant / Onderon hanging in it (banded, ringed), stars, the
   Stygian nebula, aurora ribbons, a sun-smear behind overcast, lightning flashes (uFlash) */
PLANET.skyFrag = function (S) {
  const v3 = (a) => 'vec3(' + a.map((x) => (+x).toFixed(4)).join(', ') + ')', P = S.planet;
  return `uniform float uFlash; uniform vec3 uSunD;
    void main(){ vec3 d = normalize(vD); float el = d.y; float sd = max(dot(d, uSunD), 0.0);
      vec3 c = mix(${v3(S.hor)}, ${v3(S.mid)}, smoothstep(-0.02, 0.22, el)); c = mix(c, ${v3(S.zen)}, smoothstep(0.2, 0.85, el));
      c = mix(c, ${v3(S.hor)} * 0.55, 1.0 - smoothstep(-0.3, 0.0, el));
      ${S.stars ? `float st = step(0.9985, h21(floor(d.xy * 700.0 + d.z * 230.0))) * smoothstep(0.05, 0.4, el); c += vec3(st) * ${(+S.stars).toFixed(2)} * 1.4;` : ''}
      ${S.nebula ? `float nb = fb(d.xz / (el + 0.4) * 1.6 + vec2(3.0, 1.0)); c += mix(vec3(0.29, 0.18, 0.42), vec3(0.16, 0.42, 0.45), fb(d.xz * 3.0 + 9.0)) * smoothstep(0.45, 0.85, nb) * 0.9 * smoothstep(0.0, 0.3, el);` : ''}
      ${P ? `{ vec3 PD = normalize(${v3(P.dir)}); float pr = ${(+P.r).toFixed(3)}; vec3 ax = normalize(cross(PD, vec3(0.0, 1.0, 0.0))), ay = cross(ax, PD); vec2 q = vec2(dot(d, ax), dot(d, ay)) / sin(pr); float r2 = dot(q, q);
        if (r2 < 1.0 && dot(d, PD) > 0.0) { float z = sqrt(1.0 - r2); vec3 nW = q.x * ax + q.y * ay - z * PD; float lat = nW.y * 6.0 + fb(vec2(atan(nW.x, nW.z) * 2.0, nW.y * 9.0)) * 1.6; vec3 alb = mix(${v3(P.a)}, ${v3(P.b)}, 0.5 + 0.5 * sin(lat * 3.1));
          float dif = smoothstep(-0.15, 0.7, dot(nW, uSunD)); c = mix(c, alb * (0.03 + 1.6 * dif), 1.0 - smoothstep(0.97, 1.0, r2)); }
        else if (dot(d, PD) > 0.0) c += ${v3(P.a)} * exp(-(sqrt(r2) - 1.0) * 24.0) * 0.4;
        ${P.ring ? `{ vec3 rn = normalize(vec3(0.15, 1.0, 0.25)); float t = dot(PD, rn) / max(dot(d, rn), 0.0001); vec3 hp = d * t - PD; float rr = length(hp) / sin(pr); float ring = smoothstep(1.35, 1.45, rr) * (1.0 - smoothstep(1.9, 2.05, rr)) * step(0.0, t); c = mix(c, vec3(0.7, 0.62, 0.55), ring * 0.3 * (0.6 + 0.4 * sin(rr * 40.0))); }` : ''} }` : ''}
      ${S.aurora ? `{ float ax = d.x * 2.2 + fb(vec2(d.z * 3.0, uT * 0.02)) * 2.0; float band = exp(-pow((el - 0.3 - 0.1 * sin(ax * 2.0 + uT * 0.1)) * 9.0, 2.0)); float cur = pow(fb(vec2(ax * 4.0, uT * 0.05)), 2.0); c += mix(vec3(0.31, 0.82, 0.63), vec3(0.54, 0.35, 0.84), smoothstep(0.2, 0.6, d.z + 0.5)) * band * cur * 2.6; }` : ''}
      c += ${v3(S.sunCol)} * (pow(sd, 8.0) * 0.25 + pow(sd, 64.0) * 0.6) + ${v3(S.sunCol)} * 8.0 * smoothstep(${(S.sunSize || 0.9996).toFixed(5)}, ${((S.sunSize || 0.9996) + 0.0003).toFixed(5)}, sd);
      ${S.clouds ? `vec2 cp = d.xz / max(0.06, el + 0.12) * 1.2 + vec2(uT * 0.006, 0.0); float cl = smoothstep(${(0.62 - S.clouds * 0.3).toFixed(3)}, 0.85, fb(cp * vec2(0.6, 1.4))); vec3 cc = mix(${v3(S.mid)} * 0.8, ${v3(S.sunCol)} * 0.35 + ${v3(S.hor)} * 0.5, pow(sd, 3.0) * 0.7); c = mix(c, cc * (1.0 - ${(+(S.storm || 0)).toFixed(2)} * 0.5), cl * smoothstep(0.0, 0.08, el));` : ''}
      ${S.smear ? 'c += vec3(0.35, 0.28, 0.12) * pow(sd, 6.0) * 0.6;' : ''}
      c += vec3(0.6, 0.7, 1.0) * uFlash * smoothstep(-0.1, 0.4, el);
      gl_FragColor = vec4(c, 1.0); }`;
};
PLANET.sky = function (L, W) {
  const S = W.sky, U = { uT: { value: 0 }, uFlash: { value: 0 }, uSunD: { value: V3(...S.sun).normalize() } };
  const dome = SKY.dome(U, PLANET.skyFrag(S)); LEVEL.add(dome);
  L.updates.push((dt, t) => { U.uT.value = t; if (S.lightning) { if (Math.random() < dt * 0.12 * S.lightning && U.uFlash.value <= 0) U.uFlash.value = 1.2; U.uFlash.value = Math.max(0, U.uFlash.value - dt * (U.uFlash.value > 0.6 ? 2.4 : 6)); PLANET.flash = U.uFlash.value; } });
  const env = new THREE.Scene(); const e2 = SKY.dome({ uT: { value: 0 }, uFlash: { value: 0 }, uSunD: U.uSunD }, PLANET.skyFrag(Object.assign({}, S, { clouds: 0 }))); e2.scale.setScalar(0.04); env.add(e2);
  const gd = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(W.low).multiplyScalar(1.4) })); gd.rotation.x = -HALF; gd.position.y = -2; env.add(gd); L.env = env;
  return dome;
};
/* water / glass lakes: a dark mirror that the SSR pass reads (TEX.reflect mask), gently animated normals by world position */
PLANET.water = function (L, W, x0, z0, x1, z1) {
  const w = W.water; if (!w) return null;
  const m = new THREE.MeshStandardMaterial({ color: w.col, roughness: w.glass ? 0.04 : 0.12, metalness: 0.0, envMapIntensity: 1.2, transparent: !w.glass, opacity: w.glass ? 1 : 0.92 });
  const U = { uT: { value: 0 } };
  m.onBeforeCompile = (sh) => { sh.uniforms.uT = U.uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; varying vec3 vWW;')
      .replace('#include <normal_fragment_maps>', `{ vec2 p = vWW.xz; float a = sin(p.x * 0.9 + uT * 1.3) * 0.5 + sin(p.y * 1.3 - uT * 1.1) * 0.5 + sin((p.x + p.y) * 2.7 + uT * 2.0) * 0.25; float b = cos(p.y * 0.8 + uT * 1.2) * 0.5 + cos((p.x - p.y) * 2.1 - uT * 1.7) * 0.3;
        normal = normalize(normal + (viewMatrix * vec4(a, 0.0, b, 0.0)).xyz * ${w.glass ? '0.005' : '0.06'}); }`); };
  m.customProgramCacheKey = () => 'planetWater' + (w.glass ? 1 : 0);
  TEX.reflect(m, w.glass ? 0.85 : 0.7, 'pw' + (w.glass ? 1 : 0));
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1); g.rotateX(-HALF); const me = new THREE.Mesh(g, m); me.position.set((x0 + x1) / 2, w.y, (z0 + z1) / 2); me.receiveShadow = true; LEVEL.add(me);
  L.updates.push((dt, t) => { U.uT.value = t; });
  return me;
};
/* weather: camera-locked particle boxes (rain streaks, drizzle, ash flakes, dust, frost motes) — one Points draw, no per-particle CPU */
PLANET.weather = function (L, kind) {
  if (!kind) return;
  const K = { rain: { n: 1400, col: 0x9ab0c0, size: 0.07, fall: 22, a: 0.45, stretch: 1 }, drizzle: { n: 900, col: 0xb0a070, size: 0.05, fall: 9, a: 0.35, stretch: 1 }, acid: { n: 900, col: 0xc8c070, size: 0.06, fall: 11, a: 0.35, stretch: 1 },
    ash: { n: 900, col: 0xcfc6b4, size: 0.09, fall: 1.2, a: 0.5, drift: 1.6 }, dust: { n: 1100, col: 0xc49a5a, size: 0.07, fall: 0.4, a: 0.4, drift: 6 }, frost: { n: 500, col: 0xc9d3e0, size: 0.05, fall: 0.3, a: 0.5, drift: 0.6 }, wind: { n: 700, col: 0x7b8088, size: 0.05, fall: 0.2, a: 0.35, drift: 9 } }[kind];
  if (!K) return; const lite = typeof QUAL !== 'undefined' && QUAL.tier === 'low', n = lite ? K.n >> 1 : K.n, B = 26;
  const P = new Float32Array(n * 3), S = new Float32Array(n); for (let i = 0; i < n; i++) { P[i * 3] = (Math.random() - 0.5) * B * 2; P[i * 3 + 1] = Math.random() * B; P[i * 3 + 2] = (Math.random() - 0.5) * B * 2; S[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.BufferAttribute(S, 1));
  const U = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uCol: { value: new THREE.Color(K.col) } };
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: U, fog: false,
    vertexShader: `uniform float uT; uniform vec3 uC; attribute float aS; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y - uT * ${K.fall.toFixed(2)} * (0.8 + 0.4 * aS) - uC.y, ${B.toFixed(1)}) + uC.y - 4.0;
        p.x = mod(p.x + uT * ${(K.drift || 0).toFixed(2)} * (0.7 + 0.6 * aS) - uC.x + ${B.toFixed(1)}, ${(B * 2).toFixed(1)}) + uC.x - ${B.toFixed(1)}; p.z = mod(p.z - uC.z + ${B.toFixed(1)}, ${(B * 2).toFixed(1)}) + uC.z - ${B.toFixed(1)};
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = ${(K.size * 300).toFixed(1)} / -mv.z; vA = 1.0 - smoothstep(4.0, ${B.toFixed(1)}, -mv.z); }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float a = ${K.stretch ? '(1.0 - smoothstep(0.03, 0.08, abs(q.x))) * (1.0 - smoothstep(0.3, 0.5, abs(q.y)))' : '1.0 - smoothstep(0.2, 0.5, length(q))'}; gl_FragColor = vec4(uCol * 1.4, a * vA * ${K.a.toFixed(2)}); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6; LEVEL.add(pts);
  L.updates.push((dt, t) => { U.uT.value = t; U.uC.value.copy(R.camera.position); });
};
/* the whole world for a level. o: { pads:[[x,z,r,y,blend]], half, flora:false, rocks:n, keep:[[x,z,r]] (no props), water:false } */
PLANET.build = function (L, id, o) {
  o = o || {}; const W = Object.assign({}, PLANET.W[id], o.W || {}); PLANET.cur = { id, W };
  const half = o.half || W.half, res = (typeof QUAL !== 'undefined' && QUAL.tier === 'low') ? W.res * 1.35 : W.res;
  const raw = PLANET.rawHeight(W, o.pads), f = PLANET.field(raw, -half - 4, -half - 4, half + 4, half + 4, res);
  TERRAIN.build(f, -half, -half, half, half, res, PLANET.terrainMat(W));
  PHY.hf = (x, z) => (Math.abs(x) > half || Math.abs(z) > half) ? null : f(x, z);
  // the world edge: a skirt of terrain sampled further out at coarse resolution (no collision) so the horizon is land, not void
  { const far = new THREE.Mesh((() => { const g = new THREE.PlaneGeometry(half * 6, half * 6, 48, 48); g.rotateX(-HALF); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), inside = Math.max(Math.abs(x), Math.abs(z)) < half - 2; p.setY(i, inside ? raw(x, z) - 3 : raw(x, z) + (W.flora === 'jungle' ? 6 + 10 * fbm2(x * 0.01, z * 0.01, 2) : 0)); } g.computeVertexNormals(); return g; })(), W.flora === 'jungle' ? new THREE.MeshStandardMaterial({ color: 0x1e2e18, roughness: 0.95, envMapIntensity: 0.2 }) : PLANET.terrainMat(W)); far.receiveShadow = false; LEVEL.add(far); }
  if (W.water && o.water !== false) PLANET.water(L, W, -half * 3, -half * 3, half * 3, half * 3);
  PLANET.sky(L, W);
  R.setSun(V3(...W.light.dir).normalize(), W.light.col, W.light.i, W.light.sky, W.light.gnd, W.light.hemi);
  { const h = W.sky.hor, fc = new THREE.Color().setRGB(h[0] * 0.72, h[1] * 0.72, h[2] * 0.72).lerp(new THREE.Color(W.fog[0]), 0.25); R.scene.fog = new THREE.FogExp2(fc, W.fog[1] * (o.fogK || 1)); }   // fog = the sky's horizon (linear), so far trunks melt into the mist
  if (W.grade) { R.G.exposure = W.grade.exposure; R.G.bloom = W.grade.bloom; R.G.sat = W.grade.sat; }
  R.setShadowBox(28, 160); R.G.ssr = (typeof QUAL !== 'undefined' && QUAL.tier === 'low') ? 0 : (W.water ? 0.8 : 0);
  PLANET.weather(L, o.weather !== undefined ? o.weather : W.weather);
  const y = (x, z) => f(x, z), keep = (o.keep || []).concat((o.pads || []).map((p) => [p[0], p[1], p[2] + 2]));
  const ok = (x, z, r) => !keep.some((k) => Math.hypot(x - k[0], z - k[1]) < k[2] + (r || 0)) && (!W.water || y(x, z) > W.water.y + 0.4);
  if (o.rocks !== 0 && W.rocks) FLORA.rocks(L, W, y, ok, o.rocks || W.rocks, half);
  if (o.flora !== false && typeof FLORA !== 'undefined') FLORA.biome(L, W, y, ok, half, o);
  return { f, W, y, ok, half };
};

/* ---------------------------------------------------------------- the descent director (Starfall's chaptered route, re-skinned) */
PLANET.DESC = { dxun: ['Cold orbit', 'Cloud breach', 'The jungle takes the light', 'Tomb line', 'Landing corridor', 'Touchdown'], ambria: ['Inner Rim approach', 'Dust front', 'The glass wastes', 'Mesa line', 'Touchdown'],
  raxus: ['Tion Hegemony', 'Smog ceiling', 'The heap', 'Crane cradle', 'Touchdown'], krayiss: ['Stygian Caldera', 'Nebula storm', 'Basalt crags', 'Saddle', 'Touchdown'], lenico: ['Colony Blue', 'Ash storm', 'Flying blind', 'The Ash Plains', 'Touchdown'],
  zx34: ['The Veil', 'Regolith fields', 'The cliff', 'Moraine', 'Touchdown'], onderon: ['Onderon high orbit', 'Cloud breach', 'The beast-wall', 'Iziz', 'Touchdown'], hutta: ['Nal Hutta', 'Brown overcast', 'The mire', 'The pit', 'Touchdown'] };
PLANET.descCSS = `#descent{position:fixed;left:calc(env(safe-area-inset-left) + 22px);bottom:calc(env(safe-area-inset-bottom) + 18vh);z-index:40;pointer-events:none;color:#e9dccb;opacity:0;transition:opacity .6s;text-shadow:0 2px 6px #000}
#descent.on{opacity:1}#descent i{display:block;font:600 10px/1 Inter,system-ui,sans-serif;letter-spacing:.34em;color:#ff7a5a;margin-bottom:6px;font-style:normal}#descent b{display:block;font:700 22px/1.1 Inter,system-ui,sans-serif;letter-spacing:.12em}
#descent u{display:block;margin-top:9px;height:2px;width:160px;background:rgba(255,255,255,.15);text-decoration:none}#descent u s{display:block;height:100%;width:0;background:#ff5a3c;text-decoration:none}`;
/* o: { lz:[x,y,z], from:[x,y,z], ship:kind, dur, onDone } — the ship flies a smoothed route; the camera chases then holds the touchdown */
PLANET.descent = function (L, o) {
  const id = PLANET.cur && PLANET.cur.id, names = PLANET.DESC[id] || ['Approach', 'Descent', 'Touchdown'], dur = o.dur || 14;
  const lz = V3(...o.lz), from = o.from ? V3(...o.from) : lz.clone().add(V3(-180, 240, -260)), mid1 = from.clone().lerp(lz, 0.45).add(V3(40, 30, 0)), mid2 = lz.clone().add(V3(-40, 30, -60));
  const curve = new THREE.CatmullRomCurve3([from, mid1, mid2, lz.clone().add(V3(0, 9, -14)), lz.clone().add(V3(0, 0.6, 0))]);
  let ship = null; try { ship = SHIP.build(o.ship || SHIP.kind()); SHIP.pose(ship, 'fly', 1); LEVEL.add(ship); } catch (e) { ship = null; }
  if (!document.getElementById('descCSS')) { const st = document.createElement('style'); st.id = 'descCSS'; st.textContent = PLANET.descCSS; document.head.appendChild(st); }
  let el = document.getElementById('descent'); if (!el) { el = document.createElement('div'); el.id = 'descent'; el.innerHTML = '<i></i><b></b><u><s></s></u>'; document.body.appendChild(el); }
  const D = { t: 0, ci: -1, done: false }; L.descent = D; PLAYER.state = 'cine'; if (PLAYER.a) PLAYER.a.root.visible = false; HUD.show(false); document.body.classList.add('cine'); TOUCH.want = 'none';
  const finish = () => { if (D.done) return; D.done = true; if (MG.skipHook === finish) MG.skipHook = null; el.classList.remove('on'); document.body.classList.remove('cine'); CAM.cine = null; CAM.snap = true;
    if (ship) { SHIP.pose(ship, 'land', 1); ship.position.copy(lz).add(V3(o.shipOff ? o.shipOff[0] : -7, 0, o.shipOff ? o.shipOff[1] : 2)); ship.rotation.set(0, o.shipYaw || 0.8, 0); SHIP.thrust(ship, 0); L.ship = ship; if (o.shipCol !== false) PHY.obox(ship.position.x, ship.position.z, 4, 9, ship.position.y, ship.position.y + 6, ship.rotation.y); }
    if (PLAYER.a) { PLAYER.a.root.visible = true; PLAYER.state = 'move'; } HUD.show(true); TOUCH.want = 'ground'; CAM.reset(PLAYER.a ? PLAYER.a.yaw : 0); if (o.onDone) o.onDone(); };
  D.skip = finish; MG.skipHook = finish;
  L.updates.push((dt) => {
    if (D.done) return; D.t += dt; const k = clamp(D.t / dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const p = curve.getPointAt(e), ahead = curve.getPointAt(Math.min(1, e + 0.02));
    if (ship) { ship.position.copy(p); ship.lookAt(ahead); SHIP.thrust(ship, 1 - k * 0.7); }
    const ci = Math.min(names.length - 1, Math.floor(k * names.length)); if (ci !== D.ci) { D.ci = ci; el.querySelector('i').textContent = 'DESCENT · ' + (ci + 1) + ' / ' + names.length; el.querySelector('b').textContent = names[ci].toUpperCase(); el.classList.add('on'); }
    el.querySelector('s').style.width = (k * 100).toFixed(1) + '%';
    const cp = p.clone().add(V3(0, 7 + 30 * (1 - k), 0)).addScaledVector(ahead.clone().sub(p).normalize(), -26 - 20 * (1 - k));
    R.camera.position.lerp(cp, 1 - Math.exp(-3 * dt)); R.camera.lookAt(p.x, p.y + 1, p.z); CAM.cine = { hold: true };
    if (k >= 1) finish();
  });
};
/* ---------------------------------------------------------------- SCAN: the artifact-echo pulse */
const SCAN = { on: false, cd: 0, CD: 4, echoes: [], live: [] };
SCAN.setup = function (L, echoes, o) {
  SCAN.on = true; SCAN.cd = 0; SCAN.echoes = echoes || []; SCAN.live = []; SCAN.R = (o && o.r) || 70;
  if (typeof TOUCH !== 'undefined') TOUCH.cd.scan = () => SCAN.cd / SCAN.CD;
  L.updates.push((dt, t) => SCAN.update(dt, t));
  L.dispose = ((d0) => () => { if (d0) d0(); SCAN.on = false; SCAN.echoes = []; for (const x of SCAN.live) if (x.m.parent) x.m.parent.remove(x.m); SCAN.live = []; })(L.dispose);
};
SCAN.colMat = () => SCAN._cm || (SCAN._cm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uA: { value: 1 }, uT: { value: 0 } },
  vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform float uA, uT; varying vec2 vU; void main(){ float a = (1.0 - vU.y) * (0.6 + 0.4 * sin(vU.y * 30.0 - uT * 6.0)) * (1.0 - abs(vU.x - 0.5) * 1.6); gl_FragColor = vec4(vec3(1.4, 0.35, 2.2) * a * uA, 1.0); }' }));
SCAN.pulse = function () {
  if (!SCAN.on || SCAN.cd > 0 || !PLAYER.a) return; SCAN.cd = SCAN.CD; const P = PLAYER.a;
  FX.ring(V3(P.x, P.y + 0.08, P.z), [1.6, 0.4, 2.6], SCAN.R * 0.5, 1.2); HEAT.add && HEAT.add(0.3, 'scan'); TOUCH.buzz && TOUCH.buzz(15);
  let found = 0;
  for (const e of SCAN.echoes) { if (e.done) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d > (e.r || SCAN.R)) continue; found++;
    MG.after(d / 60, () => { const y = PHY.hf ? (PHY.hf(e.x, e.z) || 0) : (e.y || 0), h = e.h || 9, m = new THREE.Mesh(new THREE.CylinderGeometry(e.w || 0.6, e.w || 0.6, h, 12, 1, true), SCAN.colMat().clone()); m.position.set(e.x, (e.y !== undefined ? e.y : y) + h / 2, e.z); m.renderOrder = 5; R.scene.add(m);
      SCAN.live.push({ m, t: 0, life: e.life || 9 }); const Ls = R.addLight({ pos: m.position.clone(), col: new THREE.Color(0.7, 0.2, 1.0), i: 2.5, range: 7, prio: 2, on: true }); MG.after(e.life || 9, () => R.removeLight(Ls));
      if (e.text) HUD.hint(e.text, 4); if (e.on) e.on(e); if (e.once !== false) e.done = !e.repeat; }); }
  if (!found) HUD.hint('The echo is faint here. Move on and listen again.', 2.4);
};
SCAN.update = function (dt, t) {
  SCAN.cd = Math.max(0, SCAN.cd - dt); if (SCAN.on && (IN.hit('scan') || IN.take('scan', 0.1))) SCAN.pulse();
  for (let i = SCAN.live.length - 1; i >= 0; i--) { const x = SCAN.live[i]; x.t += dt; const a = Math.min(1, x.t * 3) * (1 - smooth(x.life - 1.5, x.life, x.t)); x.m.scale.set(1, Math.min(1, x.t * 2), 1); x.m.material.uniforms.uA.value = a; x.m.material.uniforms.uT.value = t; if (x.t >= x.life) { R.scene.remove(x.m); x.m.geometry.dispose(); x.m.material.dispose(); SCAN.live.splice(i, 1); } }
};
