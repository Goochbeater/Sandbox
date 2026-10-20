/* TEXTURES — procedural albedo / normal / roughness sets rasterised at boot (tileable). A generator returns per-pixel
   [r, g, b (0..1 sRGB), height (0..1), roughness (0..1), emissive? ]. Normal maps come from the height via Sobel. */
const TEX = { sets: {}, size: 512 };
TEX.tn = function (x, y, p, oct) {   // tileable fbm on a period p (x,y in 0..p)
  let s = 0, a = 0.5, n = 0, f = 1;
  for (let i = 0; i < (oct || 4); i++) {
    const P = p * f, X = x * f, Y = y * f;
    // tile by wrapping lattice coordinates
    const ix = Math.floor(X), iy = Math.floor(Y), fx = X - ix, fy = Y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const h = (a1, b1) => hash3(((a1 % P) + P) % P, ((b1 % P) + P) % P, i * 17 + 3);
    const v = lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy);
    s += a * v; n += a; a *= 0.5; f *= 2;
  }
  return s / n;
};
TEX.build = function (name, gen, o) {
  o = o || {};
  const N = o.size || TEX.size;
  const cA = document.createElement('canvas'); cA.width = cA.height = N; const xA = cA.getContext('2d'); const iA = xA.createImageData(N, N);
  const cR = document.createElement('canvas'); cR.width = cR.height = N; const xR = cR.getContext('2d'); const iR = xR.createImageData(N, N);
  const H = new Float32Array(N * N);
  let cE = null, iE = null, xE = null; if (o.emissive) { cE = document.createElement('canvas'); cE.width = cE.height = N; xE = cE.getContext('2d'); iE = xE.createImageData(N, N); }
  const out = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    out[5] = out[6] = out[7] = 0;
    gen(x / N, y / N, out, x, y, N);
    const k = (y * N + x) * 4;
    iA.data[k] = clamp(out[0] * 255, 0, 255); iA.data[k + 1] = clamp(out[1] * 255, 0, 255); iA.data[k + 2] = clamp(out[2] * 255, 0, 255); iA.data[k + 3] = 255;
    H[y * N + x] = out[3];
    const r = clamp(out[4] * 255, 0, 255); iR.data[k] = r; iR.data[k + 1] = r; iR.data[k + 2] = r; iR.data[k + 3] = 255;
    if (iE) { iE.data[k] = clamp(out[5] * 255, 0, 255); iE.data[k + 1] = clamp(out[6] * 255, 0, 255); iE.data[k + 2] = clamp(out[7] * 255, 0, 255); iE.data[k + 3] = 255; }
  }
  xA.putImageData(iA, 0, 0); xR.putImageData(iR, 0, 0); if (xE) xE.putImageData(iE, 0, 0);
  // normal from height (wrapping Sobel)
  const cN = document.createElement('canvas'); cN.width = cN.height = N; const xN = cN.getContext('2d'); const iN = xN.createImageData(N, N);
  const st = o.bump || 4.0;
  const hh = (x, y) => H[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (hh(x + 1, y - 1) + 2 * hh(x + 1, y) + hh(x + 1, y + 1)) - (hh(x - 1, y - 1) + 2 * hh(x - 1, y) + hh(x - 1, y + 1));
    const dy = (hh(x - 1, y + 1) + 2 * hh(x, y + 1) + hh(x + 1, y + 1)) - (hh(x - 1, y - 1) + 2 * hh(x, y - 1) + hh(x + 1, y - 1));
    let nx = -dx * st, ny = dy * st, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const k = (y * N + x) * 4; iN.data[k] = (nx * 0.5 + 0.5) * 255; iN.data[k + 1] = (ny * 0.5 + 0.5) * 255; iN.data[k + 2] = (nz * 0.5 + 0.5) * 255; iN.data[k + 3] = 255;
  }
  xN.putImageData(iN, 0, 0);
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
  const set = { map: mk(cA, true), normalMap: mk(cN, false), roughnessMap: mk(cR, false), emissiveMap: cE ? mk(cE, true) : null, scale: o.scale || 2 };
  TEX.sets[name] = set; return set;
};
/* ---------------------------------------------------------------- generators (u,v in 0..1, tileable) */
TEX.G = {
  marble(u, v, o) {   // Theed floor: pale stone tiles, soft clouded veins, grout
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), w1 = TEX.tn(u * 4 + 13, v * 4 + 7, 4, 4), w2 = TEX.tn(u * 4 + 3, v * 4 + 17, 4, 4);
    const f = TEX.tn(u * 4 + w1 * 1.6, v * 4 + w2 * 1.6, 4, 5);
    const vein = (1 - smooth(0.0, 0.035, Math.abs(f - 0.5))) * 0.55 + (1 - smooth(0.0, 0.015, Math.abs(TEX.tn(u * 8 + w2 * 3, v * 8, 8, 4) - 0.5))) * 0.25;
    const tx = (u * 2) % 1, ty = (v * 2) % 1, gr = Math.min(Math.min(tx, 1 - tx), Math.min(ty, 1 - ty)) < 0.005 ? 1 : 0;
    const tile = hash2(Math.floor(u * 2), Math.floor(v * 2)) * 0.06;
    const b = 0.84 - n * 0.08 - vein * 0.16 - tile;
    o[0] = b * 0.98; o[1] = b * 0.95; o[2] = b * 0.9; if (gr) { o[0] *= 0.6; o[1] *= 0.6; o[2] *= 0.6; }
    o[3] = gr ? 0 : 0.6 + n * 0.05; o[4] = gr ? 0.7 : 0.12 + n * 0.1 + vein * 0.05;
  },
  nabooWall(u, v, o) {   // warm sandstone panels with horizontal courses
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), c = TEX.tn(u * 32, v * 32, 32, 2);
    const cy = (v * 4) % 1, cx = (u * 2 + Math.floor(v * 4) * 0.5) % 1;
    const seam = (cy < 0.012 || cx < 0.006) ? 1 : 0;
    const b = 0.72 + n * 0.14 + c * 0.05 - hash2(Math.floor(u * 2 + Math.floor(v * 4) * 0.5), Math.floor(v * 4)) * 0.06;
    o[0] = b * 0.93; o[1] = b * 0.82; o[2] = b * 0.66; if (seam) { o[0] *= 0.6; o[1] *= 0.6; o[2] *= 0.6; }
    o[3] = seam ? 0.2 : 0.55 + n * 0.2 + c * 0.1; o[4] = 0.55 + n * 0.2;
  },
  metalPanel(u, v, o) {   // generator complex: dark grey-green plates, seams, rivets, grime
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), g = TEX.tn(u * 16 + 5, v * 16, 16, 3);
    const px = (u * 2) % 1, py = (v * 4) % 1;
    const seam = (px < 0.01 || py < 0.02) ? 1 : 0;
    const rv = ((Math.hypot((px - 0.05) * 2, (py - 0.1) * 4) < 0.02) || (Math.hypot((px - 0.95) * 2, (py - 0.1) * 4) < 0.02)) ? 1 : 0;
    const id = hash2(Math.floor(u * 2), Math.floor(v * 4));
    const b = 0.44 + id * 0.08 + n * 0.08 - g * g * 0.16;
    o[0] = b * 0.92; o[1] = b * 0.97; o[2] = b; if (seam) { o[0] *= 0.4; o[1] *= 0.4; o[2] *= 0.4; }
    o[3] = seam ? 0 : rv ? 1 : 0.5 + n * 0.08; o[4] = 0.42 + g * 0.35 - rv * 0.2;
  },
  grate(u, v, o) {   // catwalk grating
    const P = 16, gx = (u * P) % 1, gy = (v * P) % 1;
    const bar = (gx < 0.22 || gy < 0.22) ? 1 : 0, n = TEX.tn(u * 8, v * 8, 8, 3);
    const b = bar ? 0.34 + n * 0.08 : 0.03;
    o[0] = b; o[1] = b * 1.02; o[2] = b * 1.05; o[3] = bar ? 0.9 : 0.0; o[4] = bar ? 0.4 + n * 0.2 : 0.9;
  },
  ribWall(u, v, o) {   // laser corridor / melting pit walls: vertical ribs, light grey
    const r = (u * 12) % 1, n = TEX.tn(u * 8, v * 8, 8, 4);
    const rib = Math.sin(r * PI), band = (v * 3) % 1 < 0.02 ? 1 : 0;
    const b = 0.5 + rib * 0.12 + n * 0.08 - band * 0.2;
    o[0] = b * 0.92; o[1] = b * 0.95; o[2] = b; o[3] = rib * 0.8 - band * 0.3; o[4] = 0.35 + n * 0.2;
  },
  sand(u, v, o) {
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), f = TEX.tn(u * 64, v * 64, 64, 2), w = TEX.tn(u * 4 + 3, v * 4, 4, 3);
    const rip = Math.sin((v * 26 + u * 3 + n * 5 + w * 3) * TAU) * 0.5 + 0.5, rk = 0.35 + 0.65 * TEX.tn(u * 2 + 9, v * 2 + 1, 2, 3);
    const peb = TEX.tn(u * 128, v * 128, 128, 1) > 0.82 ? 1 : 0;
    const b = 0.8 + n * 0.1 + f * 0.07 - rip * 0.035 * rk - peb * 0.1;
    o[0] = b * 0.97; o[1] = b * 0.8; o[2] = b * 0.59; o[3] = rip * 0.35 * rk + f * 0.3 + peb * 0.3; o[4] = 0.92;
  },
  rock(u, v, o) {   // weathered sandstone: soft strata, cracks, pitting
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), w = TEX.tn(u * 4, v * 4, 4, 4), m = TEX.tn(u * 16 + 5, v * 16, 16, 3);
    const strata = Math.sin((v * 6 + w * 1.8) * TAU) * 0.5 + 0.5, cr = Math.pow(Math.max(0, 1 - Math.abs(TEX.tn(u * 8 + 2, v * 3, 8, 3) - 0.5) * 30), 2) * smooth(0.55, 0.75, TEX.tn(u * 2, v * 2, 2, 2));
    const b = 0.56 + strata * 0.07 + n * 0.16 + m * 0.06 - cr * 0.18;
    o[0] = b * 0.94; o[1] = b * 0.72; o[2] = b * 0.52; o[3] = strata * 0.2 + n * 0.6 + m * 0.3 - cr * 0.6; o[4] = 0.9;
  },
  adobe(u, v, o) {
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), s = TEX.tn(u * 32, v * 32, 32, 3);
    const b = 0.78 + n * 0.1 + s * 0.06 - Math.pow(TEX.tn(u * 4 + 9, v * 4, 4, 3), 4) * 0.3;
    o[0] = b * 0.94; o[1] = b * 0.84; o[2] = b * 0.7; o[3] = n * 0.6 + s * 0.4; o[4] = 0.92;
  },
  duracrete(u, v, o) {   // Coruscant: grey panels, stains
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), st = TEX.tn(u * 4 + 2, v * 4 + 8, 4, 4);
    const px = (u * 2) % 1, py = (v * 2) % 1, seam = (px < 0.006 || py < 0.006) ? 1 : 0;
    const b = 0.42 + n * 0.1 - Math.pow(st, 2) * 0.18 + hash2(Math.floor(u * 2), Math.floor(v * 2)) * 0.05;
    o[0] = b * 0.95; o[1] = b * 0.97; o[2] = b; if (seam) { o[0] *= 0.75; o[1] *= 0.75; o[2] *= 0.75; }
    o[3] = seam ? 0.38 : 0.5 + n * 0.1; o[4] = 0.25 + st * 0.45 + n * 0.15;   // wet-ish
  },
  darkMarble(u, v, o) {   // Black Sun: black marble with gold veins
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), w = TEX.tn(u * 4 + 1, v * 4 + 3, 4, 3);
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 2 + v * 3 + w * 2.5) * TAU)), 40);
    const tx = (u * 2) % 1, ty = (v * 2) % 1, gr = Math.min(Math.min(tx, 1 - tx), Math.min(ty, 1 - ty)) < 0.005 ? 1 : 0;
    const b = 0.04 + n * 0.03;
    o[0] = b + vein * 0.55; o[1] = b + vein * 0.38; o[2] = b + vein * 0.12; if (gr) { o[0] = 0.5; o[1] = 0.36; o[2] = 0.12; }
    o[3] = gr ? 0.3 : 0.5; o[4] = gr ? 0.3 : 0.08 + n * 0.05;
  },
  carpet(u, v, o) {
    const n = TEX.tn(u * 64, v * 64, 64, 2), P = 8, m = TEX.tn(u * P, v * P, P, 3);
    const bx = Math.abs(u - 0.5) > 0.44 ? 1 : 0;
    const b = 0.3 + n * 0.12 + m * 0.05;
    o[0] = bx ? 0.6 : b * 1.2; o[1] = bx ? 0.42 : b * 0.08; o[2] = bx ? 0.12 : b * 0.07; o[3] = n; o[4] = 0.95;
  },
  sithFloor(u, v, o) {   // training hall: heavy dark steel plates, worn, with a sparse red inlay
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), g = TEX.tn(u * 16, v * 16, 16, 3), sc = TEX.tn(u * 32 + 7, v * 32, 32, 2);
    const px = (u * 2) % 1, py = (v * 2) % 1, seam = (px < 0.006 || py < 0.006) ? 1 : 0;
    const tid = hash2(Math.floor(u * 2), Math.floor(v * 2));
    const inl = (tid > 0.86 && Math.abs(py - 0.5) < 0.004 && px > 0.15 && px < 0.85) ? 1 : 0;
    const scratch = (Math.abs(((u * 37 + v * 3) % 1) - 0.5) < 0.002 && sc > 0.6 ? 0.12 : 0) + (Math.abs(((v * 29 - u * 2) % 1) - 0.5) < 0.002 && sc < 0.35 ? 0.1 : 0);
    const b = 0.3 + n * 0.08 - g * 0.06 + tid * 0.05 + scratch;
    o[0] = b * 0.96; o[1] = b * 0.97; o[2] = b; if (seam) { o[0] *= 0.35; o[1] *= 0.35; o[2] *= 0.35; }
    o[3] = seam ? 0 : inl ? 0.25 : 0.55 + n * 0.05; o[4] = 0.22 + g * 0.35 - scratch * 0.5;
    if (inl) { o[5] = 0.8; o[6] = 0.04; o[7] = 0.02; o[0] = 0.25; o[1] = 0.02; o[2] = 0.02; }
  },
  towerWin(u, v, o, x, y, N) {   // Coruscant skyscraper facade with emissive windows
    const cx = Math.floor(u * 16), cy = Math.floor(v * 32), fx = (u * 16) % 1, fy = (v * 32) % 1;
    const win = fx > 0.15 && fx < 0.85 && fy > 0.25 && fy < 0.8;
    const lit = hash2(cx, cy) > 0.74, warm = hash2(cx + 7, cy) > 0.35;
    const n = TEX.tn(u * 8, v * 8, 8, 3), b = 0.12 + n * 0.05;
    o[0] = b; o[1] = b * 1.02; o[2] = b * 1.1; o[3] = win ? 0.2 : 0.6; o[4] = win ? 0.1 : 0.5;
    if (win) { o[0] = 0.04; o[1] = 0.05; o[2] = 0.07; if (lit) { const k = 0.6 + hash2(cx, cy + 3) * 0.4; o[5] = (warm ? 1.0 : 0.6) * k; o[6] = (warm ? 0.72 : 0.8) * k; o[7] = (warm ? 0.42 : 1.0) * k; } }
  },
  hull(u, v, o) {   // ship / droid painted metal (neutral, tinted by material colour)
    const P = 8, n = TEX.tn(u * P, v * P, P, 5), g = TEX.tn(u * 16 + 3, v * 16, 16, 3);
    const px = (u * 4) % 1, py = (v * 4) % 1, seam = (px < 0.01 || py < 0.01) ? 1 : 0;
    const b = 0.78 + n * 0.1 - g * g * 0.25;
    o[0] = o[1] = o[2] = seam ? b * 0.55 : b; o[3] = seam ? 0 : 0.5 + n * 0.1; o[4] = 0.35 + g * 0.3;
  },
};
TEX.init = async function (list, progress) {
  let i = 0;
  const cfg = { marble: { scale: 4, bump: 2, size: 1024 }, nabooWall: { scale: 4, bump: 3 }, metalPanel: { scale: 3, bump: 5 }, grate: { scale: 1.5, bump: 6 }, ribWall: { scale: 3, bump: 4 },
    sand: { scale: 5, bump: 3, size: 512 }, rock: { scale: 6, bump: 5 }, adobe: { scale: 4, bump: 3 }, duracrete: { scale: 4, bump: 1.6 }, darkMarble: { scale: 4, bump: 1.5, size: 1024 },
    carpet: { scale: 3, bump: 2 }, sithFloor: { scale: 4, bump: 3, emissive: true }, towerWin: { scale: 24, bump: 1, emissive: true, size: 512 }, hull: { scale: 3, bump: 3 } };
  for (const name of list) {
    if (TEX.sets[name]) continue;
    TEX.build(name, TEX.G[name], cfg[name] || {});
    i++; if (progress) await progress(i / list.length); else await MG.yield();
  }
};
/* material from a texture set */
TEX.mat = function (name, o) {
  o = o || {};
  const key = name + JSON.stringify(o);
  if (TEX._mats && TEX._mats[key]) return TEX._mats[key];
  TEX._mats = TEX._mats || {};
  const s = TEX.sets[name];
  const m = new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, color: o.color !== undefined ? o.color : 0xffffff,
    roughness: o.rough !== undefined ? o.rough : 1, metalness: o.metal || 0, envMapIntensity: o.env !== undefined ? o.env : 0.7, side: o.side || THREE.FrontSide });
  m.normalScale.set(o.ns || 1, o.ns || 1);
  if (s.emissiveMap && o.emis !== false) { m.emissiveMap = s.emissiveMap; m.emissive = new THREE.Color(o.emisCol !== undefined ? o.emisCol : 0xffffff); m.emissiveIntensity = o.emisI || 2.0; }
  m.userData.tscale = o.scale || s.scale;
  if (o.macro !== 0) TEX.macro(m, o.macro === undefined ? 1 : o.macro, o.streak === undefined ? 1 : o.streak);
  if (o.refl) TEX.reflect(m, o.refl, key);
  TEX._mats[key] = m; return m;
};

/* reflectivity mask: glossy floors write (1 - refl·gloss) into the HDR target's alpha; the SSR pass reflects where it is < 1 */
TEX.reflect = function (m, refl, key) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
      gl_FragColor.a = 1.0 - ${refl.toFixed(3)} * clamp(1.15 - roughnessFactor, 0.0, 1.0);`);
  };
  const k0 = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
  m.customProgramCacheKey = () => k0 + '_refl' + refl.toFixed(3) + (key || '');
  return m;
};

/* world-space weathering on every level material: large-scale tone + roughness drift (breaks texture tiling) and
   vertical grime streaks down walls. Needs no UVs, so it works on any KIT geometry. */
TEX.MACRO_GLSL = `varying vec3 vMW; varying vec3 vMN;
  float mh(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float mvn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mh(i), mh(i + vec2(1, 0)), f.x), mix(mh(i + vec2(0, 1)), mh(i + vec2(1, 1)), f.x), f.y); }
  float mfb(vec2 p){ return mvn(p) * 0.55 + mvn(p * 2.13 + 7.1) * 0.3 + mvn(p * 4.7 + 3.3) * 0.15; }`;
TEX.macro = function (m, k, streak) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMW; varying vec3 vMN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMW = (modelMatrix * vec4(transformed, 1.0)).xyz; vMN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + TEX.MACRO_GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 an = abs(vMN); vec2 mp = an.y > 0.6 ? vMW.xz : (an.x > an.z ? vMW.zy : vMW.xy);
        float mn = mfb(mp * 0.13 + 3.7);
        float gMac = mix(1.0 - 0.2 * ${k.toFixed(2)}, 1.0 + 0.07 * ${k.toFixed(2)}, mn);
        float wall = 1.0 - smoothstep(0.35, 0.6, an.y);
        float stk = mfb(vec2(mp.x * 1.7, mp.y * 0.06)) * mfb(vec2(mp.x * 0.35 + 5.0, mp.y * 0.15));
        gMac *= 1.0 - wall * ${(0.45 * streak).toFixed(2)} * smoothstep(0.18, 0.55, stk);
        diffuseColor.rgb *= gMac;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * mix(0.8, 1.2, mn) + (1.0 - gMac) * 0.25, 0.04, 1.0);');
  };
  const k0 = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
  m.customProgramCacheKey = () => k0 + '_mac' + k.toFixed(2) + '_' + streak;
  return m;
};
