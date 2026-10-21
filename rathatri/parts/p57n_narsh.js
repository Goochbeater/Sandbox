/* NAR SHADDAA — the Smugglers' Moon, ported from the Boba Fett build's undercity promenade (bobafet.html p27b_narsh, NSH.*) into this
   engine's idiom. Same city: a street at the bottom of a vertical durasteel canyon (|x| < 20, z 16..98), stacks of shopfronts, window
   bays, balconies, pipes, cables and neon on both walls, signs and holo-ads from one procedural atlas (Aurebesh-style glyphs, cantina
   signs, Hutt clan emblems), the Exchange's counting tower at the north end (z < 16) with its roof pad and a parked freighter, a landing
   platform past the south gate (z 101..132), an instanced city of lit spires going on for ever, air-traffic lanes and freighters, sweeping
   searchlights, and the dusk sky with Nal Hutta hanging huge in it.
   What changed in the port: one merge builder feeds four meshes (solid, props, neon, signs); the solid shader keeps NSH's facade logic
   (aK kinds) over a triplanar photo of rusted plate from assets/extra (hull_plate_rust); every prop that stands on the street registers
   its own collider with PHY (NSH dressed colliders that already existed); the ground is a fresh ferrocrete shader for this layout.
   Public: NAR.build(L, o) → { pad, holo, lift, fy }; NAR.U.t (shader clock, ticked by the level). */
const NAR = { U: { t: { value: 0 } }, mats: {}, ships: [], search: [] };
NAR.rr = (seed) => { let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
NAR.GL = `float nsH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nsN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(nsH(i), nsH(i + vec2(1, 0)), f.x), mix(nsH(i + vec2(0, 1)), nsH(i + vec2(1, 1)), f.x), f.y); }
float nsF(vec2 p){ return nsN(p) * 0.5 + nsN(p * 2.07 + 3.1) * 0.3 + nsN(p * 4.3 + 7.7) * 0.2; }`;

/* ---------------- merge builder: non-indexed triangles, colour, uv, one float attribute (aK = surface kind) ---------------- */
NAR.MB = class {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; this.k = []; this.col = [1, 1, 1]; this.K = 0; this.M = new THREE.Matrix4(); this.S = []; this._v = new THREE.Vector3(); this._n = new THREE.Vector3(); this._nm = new THREE.Matrix3(); }
  push(m) { this.S.push(this.M.clone()); this.M = this.M.clone().multiply(m); return this; }
  pushT(x, y, z, ry, rx, rz, s) { return this.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), new THREE.Vector3(s || 1, s || 1, s || 1))); }
  pop() { this.M = this.S.pop() || new THREE.Matrix4(); return this; }
  color(r, g, b) { this.col = g === undefined ? [r, r, r] : [r, g, b]; return this; }
  vert(x, y, z, nx, ny, nz, u, v) { const p = this._v.set(x, y, z).applyMatrix4(this.M); this._nm.getNormalMatrix(this.M); const n = this._n.set(nx, ny, nz).applyMatrix3(this._nm).normalize();
    this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.c.push(this.col[0], this.col[1], this.col[2]); this.u.push(u || 0, v || 0); this.k.push(this.K); }
  tri(a, b, c, n) { for (const q of [a, b, c]) this.vert(q[0], q[1], q[2], n[0], n[1], n[2], q[3], q[4]); }
  quad(a, b, c, d, uv) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; const U = uv || [0, 0, 1, 1];
    const A = [a[0], a[1], a[2], U[0], U[1]], B = [b[0], b[1], b[2], U[2], U[1]], C = [c[0], c[1], c[2], U[2], U[3]], D = [d[0], d[1], d[2], U[0], U[3]]; this.tri(A, B, C, [nx, ny, nz]); this.tri(A, C, D, [nx, ny, nz]); }
  box(x, y, z, w, h, d, ry, o) { o = o || {}; const hw = w / 2, hd = d / 2; if (ry) this.pushT(x, y, z, ry); const X = ry ? 0 : x, Z = ry ? 0 : z, Y = ry ? 0 : y;
    const P = (sx, sy, sz) => [X + sx * hw, Y + (sy > 0 ? h : 0), Z + sz * hd];
    if (!o.noTop) this.quad(P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1)); if (o.bottom) this.quad(P(-1, 0, -1), P(1, 0, -1), P(1, 0, 1), P(-1, 0, 1));
    this.quad(P(-1, 0, 1), P(1, 0, 1), P(1, 1, 1), P(-1, 1, 1)); this.quad(P(1, 0, -1), P(-1, 0, -1), P(-1, 1, -1), P(1, 1, -1));
    this.quad(P(1, 0, 1), P(1, 0, -1), P(1, 1, -1), P(1, 1, 1)); this.quad(P(-1, 0, -1), P(-1, 0, 1), P(-1, 1, 1), P(-1, 1, -1)); if (ry) this.pop(); return this; }
  aabb(x0, y0, z0, x1, y1, z1, o) { return this.box((x0 + x1) / 2, y0, (z0 + z1) / 2, Math.abs(x1 - x0), y1 - y0, Math.abs(z1 - z0), 0, o); }
  cyl(x, y, z, r0, r1, h, seg, o) { o = o || {}; seg = seg || 10; for (let i = 0; i < seg; i++) { const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      this.quad([x + c1 * r0, y, z + s1 * r0], [x + c0 * r0, y, z + s0 * r0], [x + c0 * r1, y + h, z + s0 * r1], [x + c1 * r1, y + h, z + s1 * r1]);
      if (o.cap !== false && r1 > 0.001) this.tri([x, y + h, z, 0, 0], [x + c1 * r1, y + h, z + s1 * r1, 0, 0], [x + c0 * r1, y + h, z + s0 * r1, 0, 0], [0, 1, 0]); } return this; }
  tube(P, r, seg) { seg = seg || 6; const up = new THREE.Vector3(0, 1, 0); for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], d = new THREE.Vector3().subVectors(b, a), L = d.length(); if (L < 1e-4) continue; d.normalize(); const q = new THREE.Quaternion().setFromUnitVectors(up, d); this.push(new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1))); this.cyl(0, 0, 0, r, r, L, seg, { cap: false }); this.pop(); } return this; }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('aK', new THREE.Float32BufferAttribute(this.k, 1)); g.computeBoundingSphere(); return g; }
  get tris() { return this.p.length / 9; }
};

/* ---------------- materials ---------------- */
/* durasteel / duracrete over a triplanar photo of rusted plate: the photo's grain and pitting stay, its hue only where the rust streaks are.
   aK: 0 wall with window strips, 1 plain metal, 2 shop interior, 3 cargo shutter, 4 tower glazing, 5 painted hull, 6 window glass with a room
   behind it, 7 panelled wall (no windows). All from world position, so the merged mesh needs no uv. */
NAR.solidMat = function () {
  const tex = ASSET.tex('hull_plate_rust'), m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.55, envMapIntensity: 0.8 });
  m.onBeforeCompile = function (sh) { sh.uniforms.nT = NAR.U.t; sh.uniforms.uRust = { value: tex };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aK; varying float vK; varying vec3 vNW; varying vec3 vNN;').replace('#include <project_vertex>', '#include <project_vertex>\n vK = aK; vNW = (modelMatrix * vec4(transformed, 1.0)).xyz; vNN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float nT; uniform sampler2D uRust; varying float vK; varying vec3 vNW; varying vec3 vNN;\n' + NAR.GL)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec3 nsEm = vec3(0.0); float nsR = 1.0, nsM = 1.0; { vec3 N = normalize(vNN), W = vNW; float top = step(0.7, abs(N.y)); vec2 fp = abs(N.x) > abs(N.z) ? vec2(W.z, W.y) : vec2(W.x, W.y); if (top > 0.5) fp = W.xz;
    float K = floor(vK + 0.5); vec3 vc = vColor.rgb;
    float rust = nsF(vec2(fp.x * 0.3, fp.y * 0.05) + W.xz * 0.01); float stk = smoothstep(0.5, 0.9, nsF(vec2(fp.x * 1.9, fp.y * 0.045 + 3.0))); float rk = smoothstep(0.5, 0.85, rust) * (K > 4.5 && K < 5.5 ? 0.25 : 0.8) + stk * 0.35;
    vec3 tA = texture2D(uRust, fp * 0.42).rgb; vec3 tm = texture2D(uRust, vec2(0.5), 16.0).rgb; float lm = max(dot(tm, vec3(0.3, 0.59, 0.11)), 0.04); float lt = dot(tA, vec3(0.3, 0.59, 0.11)) / lm;
    vec3 det = mix(vec3(mix(1.0, lt, 0.75)), tA / lm * vec3(0.95, 0.72, 0.55), clamp(rk, 0.0, 1.0));
    vec2 pc = fp / vec2(2.4, 1.8); vec2 pf = fract(pc); float sm = smoothstep(0.0, 0.025, pf.x) * (1.0 - smoothstep(0.975, 1.0, pf.x)) * smoothstep(0.0, 0.035, pf.y) * (1.0 - smoothstep(0.965, 1.0, pf.y));
    float pv = nsH(floor(pc) + floor(W.xz * 0.07) * 13.0); vec2 rq = vec2(fract(fp.x / 0.3) - 0.5, (pf.y - 0.06) * 6.0); float riv = (1.0 - smoothstep(0.1, 0.2, length(rq))) * (1.0 - top);
    vec3 b = vc * det * 0.5 * (0.8 + 0.36 * pv) * mix(0.5, 1.0, sm) * (1.0 + riv * 0.45);
    b *= 1.0 - stk * 0.35; b *= mix(0.3, 1.0, smoothstep(-0.5, 9.0, W.y)) * mix(0.7, 1.0, smoothstep(0.0, 0.4, fract(fp.y / 3.6)));
    float fy = fract(fp.y / 3.6); float bulk = (1.0 - top) * (1.0 - smoothstep(0.0, 0.035, fy)); b *= 1.0 - bulk * 0.5;
    if (K < 0.5 || K > 3.5 && K < 4.5) { float dens = K > 3.5 ? 1.0 : 0.0; float ch = mix(1.1, 1.6, dens); vec2 cell = vec2(floor(fp.x / ch), floor(fp.y / 3.6)); vec2 wf = vec2(fract(fp.x / ch), fy);
      float grp = step(0.42, nsH(vec2(floor(fp.x / 7.7), cell.y) + floor((W.x + W.z) * 0.031) * 3.1)) + dens; float win = step(mix(0.2, 0.04, dens), wf.x) * step(wf.x, mix(0.8, 0.96, dens)) * step(mix(0.36, 0.3, dens), wf.y) * step(wf.y, mix(0.62, 0.7, dens)) * step(5.2, W.y) * (1.0 - top) * min(grp, 1.0);
      float hh = nsH(cell + floor((W.x + W.z) * 0.031) * 7.3); float lit = step(mix(0.78, 0.66, dens), hh);
      vec3 wc = hh > 0.985 ? vec3(0.4, 1.2, 1.6) : hh > 0.9 ? vec3(1.3, 1.2, 1.05) : vec3(1.6, 0.8, 0.32); wc *= 0.6 + 0.4 * smoothstep(0.3, 0.7, wf.y);
      b = mix(b, vec3(0.02, 0.022, 0.032), win * 0.92); nsEm += wc * lit * win * (0.45 + 0.55 * nsH(cell * 1.31 + 4.0)); nsR = mix(nsR, 0.12, win); nsM = mix(nsM, 0.2, win); }
    if (K > 5.5 && K < 6.5) { vec2 cell = vec2(floor(fp.x / 1.1 + 0.001), floor(fp.y / 3.6)); float hh = nsH(cell + floor(W.x * 0.05 + W.z * 0.017) * 5.7); float u = fract(fp.x / 1.1), v = smoothstep(0.3, 0.72, fract(fp.y / 3.6)); float lit = step(0.45, hh);
      vec3 room = hh > 0.9 ? vec3(0.3, 0.8, 1.1) : hh > 0.84 ? vec3(0.9, 0.35, 0.7) : hh > 0.66 ? vec3(0.95, 0.85, 0.7) : vec3(1.3, 0.6, 0.24); room *= 0.55 + 0.6 * v;
      float depth = smoothstep(0.0, 0.25, u) * (1.0 - smoothstep(0.75, 1.0, u)) * 0.6 + 0.4; float blind = hh > 0.5 && hh < 0.7 ? 0.55 + 0.45 * step(0.5, fract(W.y * 9.0)) : 1.0; float fig = 1.0 - step(0.93, hh) * (1.0 - smoothstep(0.0, 0.08, abs(u - 0.5) - 0.12)) * 0.8;
      b = vec3(0.012, 0.014, 0.02); nsEm += room * lit * depth * blind * fig * (0.6 + 0.6 * nsH(cell + 9.0)) * 0.85; nsR = 0.07; nsM = 0.25; }
    if (K > 1.5 && K < 2.5) { float h2 = nsH(floor(W.xz * 0.16) + 2.0); vec3 ic = h2 > 0.66 ? vec3(0.25, 0.9, 1.2) : h2 > 0.33 ? vec3(1.3, 0.35, 0.9) : vec3(1.4, 0.75, 0.3); float shl = 0.55 + 0.45 * step(0.5, fract(W.y * 1.6)); b = vec3(0.03); nsEm += ic * shl * (0.5 + 0.5 * smoothstep(0.0, 2.5, W.y)); nsR = 0.3; }
    if (K > 2.5 && K < 3.5) { float rib = fract(fp.y * 3.2); b *= 0.5 + 0.5 * smoothstep(0.0, 0.2, rib) * (1.0 - smoothstep(0.75, 1.0, rib)); nsM = 1.3; }
    if (K > 0.5 && K < 1.5) { nsM = 1.3; nsR = 0.85; }
    if (K > 4.5 && K < 5.5) { nsM = 1.0; nsR = 0.65; }
    diffuseColor.rgb = b; nsR *= 0.9 + 0.25 * rust; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor * nsR, 0.05, 1.0);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = clamp(metalnessFactor * nsM, 0.0, 1.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += nsEm;'); };
  m.customProgramCacheKey = () => 'narSolid'; return m;
};
/* ferrocrete street: 3 m slabs with seams and bolts, painted lanes, a hazard kerb at |x| 9.4..10, deck plates and grates on the walks,
   oil stains and wear; the platform past the gate gets landing-bay markings; a wet sheen that the neon reads in */
NAR.groundMat = function () {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.15, envMapIntensity: 0.55 });
  m.onBeforeCompile = (sh) => { sh.uniforms.nT = NAR.U.t;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vNW;').replace('#include <project_vertex>', '#include <project_vertex>\n vNW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float nT; varying vec3 vNW;\n' + NAR.GL)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec3 nsEm = vec3(0.0); float nsR = 1.0, nsM = 1.0; { vec2 p = vNW.xz; float ax = abs(p.x); vec3 c; float grain = 0.78 + 0.3 * nsF(p * 0.9);
    float stain = smoothstep(0.6, 0.82, nsF(p * 0.17 + 5.0)); float wear = smoothstep(0.32, 0.62, nsF(p * 1.4 + 1.7));
    if (p.y > 100.5) { vec2 t = fract(p / 4.0), ti = floor(p / 4.0); float sm = smoothstep(0.0, 0.01, t.x) * (1.0 - smoothstep(0.99, 1.0, t.x)) * smoothstep(0.0, 0.01, t.y) * (1.0 - smoothstep(0.99, 1.0, t.y));
      c = vec3(0.24, 0.24, 0.26) * (0.86 + 0.2 * nsH(ti)) * grain * mix(0.5, 1.0, sm); float ring = abs(length(p - vec2(-5.0, 118.0)) - 9.0); c = mix(c, vec3(0.7, 0.5, 0.08), (1.0 - smoothstep(0.15, 0.22, ring)) * wear * 0.9);
      float chev = step(ax, 3.0) * step(fract((p.y - ax * 0.62) / 3.4), 0.13) * step(p.y, 112.0); c = mix(c, vec3(0.7, 0.46, 0.08), chev * wear * 0.85); nsM = 1.6; nsR = mix(0.8, 0.6, stain); }
    else if (ax > 10.2) { vec2 t = fract(p / vec2(1.25, 1.25)), ti = floor(p / 1.25); float sm = smoothstep(0.0, 0.03, t.x) * (1.0 - smoothstep(0.97, 1.0, t.x)) * smoothstep(0.0, 0.03, t.y) * (1.0 - smoothstep(0.97, 1.0, t.y));
      float grate = mod(ti.x + ti.y, 5.0) < 0.5 ? 1.0 : 0.0; vec2 g = fract(p * vec2(6.0, 1.5)); float slot = grate * step(0.35, g.x) * step(g.x, 0.75) * step(0.1, g.y) * step(g.y, 0.9);
      vec2 d = fract(p * 3.4); float tread = (1.0 - grate) * smoothstep(0.42, 0.5, abs(fract(d.x + d.y) - 0.5) * 2.0) * 0.18;
      c = vec3(0.21, 0.21, 0.23) * (0.82 + 0.26 * nsH(ti + 3.0)) * mix(0.45, 1.0, sm) * (1.0 - tread) * grain; c = mix(c, vec3(0.02, 0.02, 0.025), slot); c = mix(c, c * vec3(1.2, 0.7, 0.42), smoothstep(0.55, 0.8, nsF(p * 0.4 + 9.0)) * 0.6);
      float bolt = (1.0 - grate) * (1.0 - smoothstep(0.03, 0.05, length(t - 0.08))); c += bolt * 0.08; nsM = 2.5; nsR = mix(0.62, 0.9, wear); }
    else { vec2 t = fract(p / vec2(3.0, 3.0)), si = floor(p / 3.0); float sm = smoothstep(0.0, 0.012, t.x) * (1.0 - smoothstep(0.988, 1.0, t.x)) * smoothstep(0.0, 0.012, t.y) * (1.0 - smoothstep(0.988, 1.0, t.y));
      c = vec3(0.25, 0.24, 0.26) * (0.86 + 0.22 * nsH(si)) * grain * mix(0.42, 1.0, sm); float bolt = 1.0 - smoothstep(0.02, 0.035, length(abs(t - 0.5) - 0.44)); c *= 1.0 - bolt * 0.4;
      float dash = step(0.45, fract(p.y / 4.2)); float l1 = (1.0 - smoothstep(0.07, 0.1, abs(ax - 3.35))) * dash; float l2 = 1.0 - smoothstep(0.09, 0.12, abs(ax - 9.15)); float l0 = (1.0 - smoothstep(0.06, 0.09, abs(ax - 0.18))) * step(40.0, p.y);
      float hz = step(9.42, ax) * step(ax, 9.98) * step(0.5, fract((p.x * sign(p.x) + p.y) * 0.85));
      float plaza = step(p.y, 40.0); float ring = abs(length(p - vec2(0.0, 30.0)) - 6.4); float inl = (1.0 - smoothstep(0.04, 0.08, ring)) * plaza;
      vec3 paint = vec3(0.7, 0.46, 0.08); c = mix(c, paint * 0.95, clamp(l1 * (1.0 - plaza) + l2 * 0.9, 0.0, 1.0) * wear * 0.85); c = mix(c, vec3(0.6, 0.6, 0.58), l0 * wear * 0.8); c = mix(c, hz > 0.5 ? vec3(0.7, 0.5, 0.06) : vec3(0.03), step(9.42, ax) * step(ax, 9.98) * wear * 0.9);
      nsEm += vec3(0.2, 1.4, 1.9) * inl * (0.75 + 0.25 * sin(nT * 1.7)); nsR = mix(0.95, 0.7, stain); }
    float wet = smoothstep(0.55, 0.75, nsF(p * 0.11 + 2.0)); nsR *= mix(1.0, 0.32, wet); c *= mix(1.0, 0.7, wet);
    c = mix(c, c * vec3(0.32, 0.3, 0.34), stain * 0.75); diffuseColor.rgb *= c * 0.5; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor * nsR, 0.05, 1.0);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = clamp(metalnessFactor * nsM, 0.0, 1.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += nsEm;'); };
  m.customProgramCacheKey = () => 'narGround'; return m;
};
/* neon tubes: HDR vertex colour (bloom picks it up) */
NAR.neonMat = () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: true });
/* signs and holos from the atlas; aK = 0 steady, 0..1 flicker phase, >= 2 holo (scanlines, shimmer) */
NAR.signMat = function (tex) {
  const m = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false });
  m.onBeforeCompile = (sh) => { sh.uniforms.nT = NAR.U.t;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aK; varying float vK; varying vec3 vNW;').replace('#include <project_vertex>', '#include <project_vertex>\n vK = aK; vNW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float nT; varying float vK; varying vec3 vNW;\nfloat nsH1(float x){ return fract(sin(x * 91.17) * 43758.5453); }')
      .replace('#include <color_fragment>', `#include <color_fragment>
  { float f = 1.0; if (vK > 0.001 && vK < 1.5) { float tt = floor(nT * 14.0 + vK * 97.0); f = nsH1(tt) > 0.12 ? 1.0 : 0.15; f *= nsH1(floor(nT * 0.6 + vK * 31.0)) > 0.2 ? 1.0 : 0.25; }
    if (vK >= 1.5) { float ph = vK - 2.0; float sl = 0.62 + 0.38 * step(0.45, fract(vNW.y * 7.0 - nT * 1.3)); float sh = 0.85 + 0.15 * sin(nT * 23.0 + ph * 40.0); float gl = step(0.985, fract(nT * 0.37 + ph)) * 0.6; f = sl * sh * (1.0 - gl); diffuseColor.rgb *= vec3(0.75, 1.0, 1.25); }
    float d = length(vNW - cameraPosition); diffuseColor.rgb *= f * mix(1.0, 0.35, smoothstep(60.0, 260.0, d)); }`); };
  m.customProgramCacheKey = () => 'narSign'; return m;
};

/* ---------------- the sign atlas: Aurebesh-style glyphs, cantina signs, Hutt clan emblems, holo-ads (8 x 16 cells) ---------------- */
NAR.PAL = ['#3ef0ff', '#ff3ad8', '#ffb43a', '#ff4040', '#7dff5a', '#b07aff', '#d8f0ff', '#ff7a2a', '#40a0ff'];
NAR.PALC = [[0.3, 2.6, 3.2], [3.2, 0.5, 2.6], [3.4, 1.7, 0.4], [3.4, 0.5, 0.45], [1.0, 3.2, 0.7], [1.8, 0.9, 3.4], [2.6, 2.8, 3.2]];
NAR.TINT = [[0.56, 0.52, 0.46], [0.6, 0.38, 0.26], [0.42, 0.46, 0.34], [0.34, 0.42, 0.5], [0.66, 0.5, 0.3], [0.5, 0.44, 0.42], [0.3, 0.4, 0.4], [0.62, 0.3, 0.24]];
NAR.CRATEC = [[0.55, 0.5, 0.4], [0.4, 0.44, 0.5], [0.6, 0.4, 0.22], [0.42, 0.46, 0.36], [0.65, 0.58, 0.3]];
NAR.glyph = function (g, code, x, y, w, h) {
  const R = NAR.rr(code * 7919 + 131), P = (i, j) => [x + i * w / 2, y + j * h / 3];
  const segs = [[[0, 0], [2, 0]], [[0, 3], [2, 3]], [[0, 0], [0, 3]], [[2, 0], [2, 3]], [[0, 0], [2, 3]], [[2, 0], [0, 3]], [[0, 1.5], [2, 1.5]], [[1, 0], [1, 3]], [[0, 0], [1, 1.5]], [[2, 0], [1, 1.5]], [[1, 1.5], [2, 3]], [[0, 3], [1, 1.5]], [[0, 1], [2, 1]], [[0, 2], [2, 2]]];
  const n = 2 + Math.floor(R() * 2.6), used = new Set(); g.beginPath();
  for (let i = 0; i < n; i++) { let s = Math.floor(R() * segs.length); if (used.has(s)) s = (s + 3) % segs.length; used.add(s); const [a, b] = segs[s]; const A = P(a[0], a[1]), B = P(b[0], b[1]); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); }
  g.stroke();
};
NAR.word = function (g, seed, x, y, h, n, col, vert) {
  const w = h * 0.62, gap = h * 0.32; g.lineCap = 'square'; g.lineJoin = 'miter';
  for (const pass of [0, 1]) { g.strokeStyle = pass ? '#ffffff' : col; g.lineWidth = pass ? Math.max(1.5, h * 0.05) : h * 0.13; g.shadowColor = col; g.shadowBlur = pass ? h * 0.25 : h * 0.4;
    for (let i = 0; i < n; i++) { if (vert) NAR.glyph(g, seed * 31 + i * 7, x, y + i * (h + gap * 0.6), h * 0.9, h * 0.62); else NAR.glyph(g, seed * 31 + i * 7, x + i * (w + gap), y, w, h); } }
  g.shadowBlur = 0;
};
NAR.emblem = function (g, cx, cy, r, col, col2) {   // a Hutt clan sigil: ring, crescent, three flames, a bar and an eye
  g.save(); g.translate(cx, cy); g.lineCap = 'round';
  for (const pass of [0, 1]) { g.strokeStyle = pass ? '#fff6e0' : col; g.shadowColor = col; g.shadowBlur = r * (pass ? 0.12 : 0.3); g.lineWidth = r * (pass ? 0.03 : 0.085);
    g.beginPath(); g.arc(0, 0, r * 0.9, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.74, 0.35, 2.8); g.stroke();
    for (const s of [-1, 0, 1]) { g.beginPath(); g.moveTo(s * r * 0.36, r * 0.42); g.quadraticCurveTo(s * r * 0.62, -r * 0.05, s * r * 0.22 + s * 0.001, -r * (s ? 0.52 : 0.68)); g.stroke(); }
    g.strokeStyle = pass ? '#fff6e0' : (col2 || col); g.beginPath(); g.moveTo(-r * 0.46, r * 0.56); g.lineTo(r * 0.46, r * 0.56); g.stroke(); g.beginPath(); g.arc(0, r * 0.08, r * 0.1, 0, TAU); g.stroke(); }
  g.restore(); g.shadowBlur = 0;
};
NAR.atlas = function () {
  const S = 2048, cw = 256, ch = 128, cv = document.createElement('canvas'); cv.width = S; cv.height = S; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, S, S); const R = NAR.rr(77);
  for (let i = 0; i < 128; i++) {
    const cx = (i % 8) * cw, cy = Math.floor(i / 8) * ch, col = NAR.PAL[Math.floor(R() * NAR.PAL.length)], col2 = NAR.PAL[Math.floor(R() * NAR.PAL.length)];
    g.save(); g.beginPath(); g.rect(cx + 2, cy + 2, cw - 4, ch - 4); g.clip();
    if (i < 64) { const kind = i % 4;   // horizontal signs
      if (kind === 0 || kind === 2) { const n = 3 + Math.floor(R() * 4), h = 56 - n * 3; NAR.word(g, i, cx + 22, cy + (ch - h) / 2, h, n, col); if (R() < 0.6) { g.strokeStyle = col2; g.lineWidth = 5; g.shadowColor = col2; g.shadowBlur = 14; g.strokeRect(cx + 8, cy + 10, cw - 16, ch - 20); g.shadowBlur = 0; } }
      else if (kind === 1) { NAR.emblem(g, cx + 54, cy + ch / 2, 46, col, col2); NAR.word(g, i, cx + 112, cy + 36, 40, 3, col2); NAR.word(g, i + 5, cx + 112, cy + 86, 18, 6, col); }
      else {   // cantina: a cocktail glass and a word
        g.strokeStyle = col; g.lineWidth = 6; g.shadowColor = col; g.shadowBlur = 16; g.beginPath(); g.moveTo(cx + 22, cy + 26); g.lineTo(cx + 78, cy + 26); g.lineTo(cx + 50, cy + 62); g.closePath(); g.moveTo(cx + 50, cy + 62); g.lineTo(cx + 50, cy + 100); g.moveTo(cx + 34, cy + 102); g.lineTo(cx + 66, cy + 102); g.stroke(); g.fillStyle = col2; g.beginPath(); g.arc(cx + 62, cy + 20, 7, 0, 6.3); g.fill();
        NAR.word(g, i, cx + 100, cy + 34, 48, 4, col2); } }
    else if (i < 96) {   // vertical blade signs: glyphs stacked along +x of the cell (the quad maps u to height)
      g.translate(cx + cw, cy); g.rotate(Math.PI / 2); NAR.word(g, i, 26, 36, 50, 4, col, true); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(cx + 2, cy + 2, cw - 4, ch - 4); g.clip(); g.strokeStyle = col2; g.lineWidth = 4; g.shadowColor = col2; g.shadowBlur = 10; g.strokeRect(cx + 6, cy + 8, cw - 12, ch - 16); g.shadowBlur = 0; }
    else {   // holo-ads
      const gr = g.createLinearGradient(cx, cy, cx, cy + ch); gr.addColorStop(0, 'rgba(40,140,255,0.35)'); gr.addColorStop(1, 'rgba(10,30,80,0.05)'); g.fillStyle = gr; g.fillRect(cx, cy, cw, ch); const k = i % 4;
      if (k === 0) { NAR.emblem(g, cx + 70, cy + 64, 52, '#7fd8ff', '#ffd27a'); NAR.word(g, i, cx + 136, cy + 30, 34, 3, '#bfeaff'); NAR.word(g, i + 9, cx + 136, cy + 80, 16, 6, '#7fd8ff'); }
      else if (k === 1) { g.strokeStyle = '#9fe8ff'; g.lineWidth = 4; g.shadowColor = '#4fc8ff'; g.shadowBlur = 12; g.beginPath(); g.ellipse(cx + 80, cy + 66, 50, 30, 0, 0, 6.283); g.moveTo(cx + 120, cy + 56); g.lineTo(cx + 160, cy + 44); g.moveTo(cx + 120, cy + 76); g.lineTo(cx + 160, cy + 88); g.moveTo(cx + 64, cy + 36); g.lineTo(cx + 96, cy + 96); g.stroke(); g.shadowBlur = 0; NAR.word(g, i, cx + 170, cy + 40, 30, 2, '#ffd27a'); }
      else if (k === 2) { g.fillStyle = 'rgba(255,90,200,0.55)'; for (let q = 0; q < 6; q++) { const hh = 20 + R() * 70; g.fillRect(cx + 26 + q * 22, cy + ch - 18 - hh, 14, hh); } NAR.word(g, i, cx + 170, cy + 32, 26, 2, '#ff9adf'); NAR.word(g, i + 3, cx + 170, cy + 76, 18, 3, '#bfeaff'); }
      else { NAR.word(g, i, cx + 20, cy + 22, 40, 5, '#ffe08a'); g.fillStyle = 'rgba(120,220,255,0.5)'; g.fillRect(cx + 20, cy + 84, cw - 40, 6); NAR.word(g, i + 1, cx + 20, cy + 96, 14, 9, '#9fe8ff'); } }
    g.restore();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
};
NAR.cellUV = (i) => { const c = i % 8, r = Math.floor(i / 8); return [c / 8 + 0.002, 1 - (r + 1) / 16 + 0.002, (c + 1) / 8 - 0.002, 1 - r / 16 - 0.002]; };
NAR.emblemTex = function (c1, c2) { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); NAR.emblem(g, 256, 256, 230, c1 || '#ffb43a', c2 || '#ff3ad8'); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };

/* ---------------- the sky: dusk over the Smugglers' Moon, Nal Hutta hanging in it (banded, a storm spot, a thin green limb) ---------------- */
NAR.PLANET = new THREE.Vector3(-0.124, 0.454, -0.882).normalize();
NAR.SKY_BODY = `uniform vec3 uP;
${NAR.GL}
vec3 narSky(vec3 d, float t){ float up = d.y;
  vec3 zen = vec3(0.045, 0.03, 0.11), mid = vec3(0.5, 0.13, 0.2), hor = vec3(1.3, 0.5, 0.16);
  vec3 col = mix(hor, mid, smoothstep(-0.02, 0.2, up)); col = mix(col, zen, smoothstep(0.16, 0.72, up));
  vec3 S = normalize(vec3(-0.5, 0.1, 0.86)); float cs = max(dot(d, S), 0.0); col += vec3(1.2, 0.55, 0.22) * pow(cs, 5.0) * 0.7 + vec3(2.2, 1.2, 0.5) * pow(cs, 90.0);
  vec2 cp = d.xz / (max(up, 0.015) + 0.06); float cl = nsF(cp * vec2(0.22, 0.9) + vec2(t * 0.003, 0.0)) * 0.7 + nsF(cp * 1.7 + 4.0) * 0.3; cl = smoothstep(0.5, 0.76, cl) * smoothstep(0.0, 0.05, up) * (1.0 - smoothstep(0.18, 0.36, up));
  col = mix(col, mix(vec3(0.75, 0.24, 0.34), vec3(1.5, 0.75, 0.36), pow(cs, 1.5) + 0.25 * (1.0 - smoothstep(0.0, 0.2, up))), cl * 0.45);
  vec3 sp = d * 300.0; float st = step(0.9986, nsH(floor(sp.xy) + floor(sp.z) * 17.0)) * smoothstep(0.3, 0.75, up); col += vec3(0.8, 0.85, 1.0) * st * 0.9;
  vec3 P = normalize(uP); float pr = 0.165; vec3 ax = normalize(cross(P, vec3(0.0, 1.0, 0.0))), ay = cross(ax, P);
  vec2 q = vec2(dot(d, ax), dot(d, ay)) / sin(pr); float r2 = dot(q, q); float front = step(0.0, dot(d, P));
  if (r2 < 1.0 && front > 0.5) { float z = sqrt(1.0 - r2); vec3 nW = q.x * ax + q.y * ay - z * P; vec3 L = normalize(vec3(-0.75, 0.35, 0.55));
    vec3 tilt = normalize(vec3(0.18, 1.0, 0.12)); float lat = dot(nW, tilt); float lon = atan(dot(nW, ax), dot(nW, -P)) + t * 0.0015;
    float w = nsF(vec2(lon * 3.0, lat * 9.0)) * 0.9 + nsF(vec2(lon * 9.0, lat * 26.0)) * 0.25; float b = lat * 13.0 + w * 2.6; float s1 = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(b)), s2 = 0.5 + 0.5 * sin(b * 2.3 + 1.7);
    vec3 alb = mix(vec3(0.24, 0.3, 0.1), vec3(0.5, 0.32, 0.14), s1); alb = mix(alb, vec3(0.7, 0.66, 0.3), s2 * s2 * 0.6); alb = mix(alb, vec3(0.14, 0.17, 0.08), smoothstep(0.6, 0.9, nsF(vec2(lon * 4.0 + 2.0, lat * 14.0))) * 0.6);
    float spot = 1.0 - smoothstep(0.0, 0.1, length(vec2((lon - 0.4) * 1.3, lat + 0.22))); alb = mix(alb, vec3(0.62, 0.46, 0.26), spot * 0.7);
    float dif = smoothstep(-0.12, 0.7, dot(nW, L)); vec3 pc = alb * (0.015 + 1.7 * dif); pc += vec3(0.42, 0.52, 0.22) * pow(1.0 - z, 4.0) * (0.15 + 0.8 * dif); pc = mix(pc, col, 0.05 + 0.4 * (1.0 - smoothstep(-0.02, 0.22, up)));
    col = mix(col, pc, 1.0 - smoothstep(0.985, 1.0, r2)); }
  else if (front > 0.5) { float e = sqrt(r2) - 1.0; col += vec3(0.25, 0.32, 0.12) * exp(-e * 30.0) * 0.5; }
  col = mix(col, vec3(1.05, 0.46, 0.3), exp(-max(up, 0.0) * 14.0) * 0.55);
  if (up < 0.0) col = mix(vec3(0.5, 0.2, 0.2), vec3(0.08, 0.04, 0.09), 1.0 - smoothstep(-0.25, 0.0, up));
  return col; }`;
NAR.sky = function (L) {
  const U = { uT: { value: 40 }, uP: { value: NAR.PLANET.clone() } };
  const dome = SKY.dome(U, NAR.SKY_BODY + '\nvoid main(){ gl_FragColor = vec4(narSky(normalize(vD), uT), 1.0); }');
  L.updates.push((dt, t) => { U.uT.value = 40 + t; });
  return dome;
};
/* env for PMREM: the sky, two lit window walls and a dark street, so metal and wet ferrocrete pick up the canyon */
NAR.envScene = function () {
  const sc = new THREE.Scene(), U = { uT: { value: 40 }, uP: { value: NAR.PLANET.clone() } };
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: U, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uT; varying vec3 vD;\n' + NAR.SKY_BODY + '\nvoid main(){ gl_FragColor = vec4(narSky(normalize(vD), uT), 1.0); }' });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 28), m));
  const gm = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } void main(){ vec3 c = vec3(0.05, 0.035, 0.06); float f = step(0.9, h(floor(vP.xy * 0.6 + vP.z * 0.3))); float k = h(floor(vP.xy * 0.6) + 7.0); c += (k > 0.6 ? vec3(0.2, 1.4, 1.8) : k > 0.3 ? vec3(1.8, 0.3, 1.4) : vec3(1.9, 1.0, 0.4)) * f * 0.6; gl_FragColor = vec4(c, 1.0); }' });
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), gm); w.position.set(s * 9, 20, 0); w.rotation.y = -s * Math.PI / 2; sc.add(w); }
  const gd = new THREE.Mesh(new THREE.CircleGeometry(49, 40), new THREE.MeshBasicMaterial({ color: 0x1a1418 })); gd.rotation.x = -Math.PI / 2; gd.position.y = -1.2; sc.add(gd);
  return sc;
};

/* ---------------- signs ---------------- */
NAR.signQuad = function (G, x, y, z, w, h, sx, cell, fl, I) {   // a flat sign on a canyon face (normal along -sx in x)
  const uv = NAR.cellUV(cell), nx = -sx; G.color(I || 2, I || 2, I || 2); G.K = fl || 0; const z0 = z - w / 2, z1 = z + w / 2;
  if (nx > 0) G.quad([x, y, z1], [x, y, z0], [x, y + h, z0], [x, y + h, z1], uv); else G.quad([x, y, z0], [x, y, z1], [x, y + h, z1], [x, y + h, z0], uv);
};
NAR.signQuadZ = function (G, x, y, z, w, h, nz, cell, fl, I) {   // a sign facing +z / -z centred at x
  const uv = NAR.cellUV(cell); G.color(I || 2, I || 2, I || 2); G.K = fl || 0; const x0 = x - w / 2, x1 = x + w / 2;
  if (nz > 0) G.quad([x0, y, z], [x1, y, z], [x1, y + h, z], [x0, y + h, z], uv); else G.quad([x1, y, z], [x0, y, z], [x0, y + h, z], [x1, y + h, z], uv);
};
NAR.bladeQuad = function (G, xa, xb, y, h, z, cell, fl) {   // a blade sign: two faces (±z), the vertical cell maps u along the height
  const c = NAR.cellUV(cell); G.color(2.3, 2.3, 2.3); G.K = fl || 0; const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
  for (const s of [-1, 1]) { const zz = z + s * 0.16; const A = [x0, y, zz, c[0], c[1]], B = [x1, y, zz, c[0], c[3]], C = [x1, y + h, zz, c[2], c[3]], D = [x0, y + h, zz, c[2], c[1]];
    if (s > 0) { G.tri(A, B, C, [0, 0, 1]); G.tri(A, C, D, [0, 0, 1]); } else { G.tri(B, A, D, [0, 0, -1]); G.tri(B, D, C, [0, 0, -1]); } }
};
