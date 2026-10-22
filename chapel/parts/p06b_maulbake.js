/* MAUL HEAD — GPU bake: dense distance grid → surface nets → projected onto the field → normals, horn mask, AO. */
MH.HP = [0, -0.78, -0.32];          // head pivot (atlas joint) in head space
MH.EYE_C = [0.315, 0.0, 0.675]; MH.EYE_R = 0.12;
MH.FACE = [1.0, 0.62, 0.0, 0.0];    // eyes open, brow furrowed (the scowl), no snarl, jaw closed
// ten horns: azimuth from the face toward +x, polar angle from the crown, length, base radius
MH.HORN_SPEC = [
  [0, 49, 0.26, 0.094],
  [33, 52, 0.30, 0.10], [-33, 52, 0.30, 0.10],
  [77, 56, 0.29, 0.10], [-77, 56, 0.29, 0.10],
  [138, 46, 0.30, 0.10], [-138, 46, 0.30, 0.10],
  [180, 16, 0.42, 0.115],
  [62, 80, 0.21, 0.085], [-62, 80, 0.21, 0.085],
];
MH.horns = function () {
  const sdE = (p, c, r) => { const q = V.sub(p, c); const k0 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]); const k1 = Math.hypot(q[0] / (r[0] * r[0]), q[1] / (r[1] * r[1]), q[2] / (r[2] * r[2])); return k0 * (k0 - 1) / k1; };
  const sm = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const cran = (p) => { let d = sdE(p, [0, 0.31, -0.10], [0.735, 0.855, 0.93]); d = sm(d, sdE(p, [0, 0.43, 0.24], [0.64, 0.56, 0.635]), 0.24); d = sm(d, sdE(p, [0, 0.10, -0.60], [0.62, 0.58, 0.46]), 0.2); return d; };
  const pos = new Float32Array(40), dir = new Float32Array(40); const C = [0, 0.3, -0.1];
  MH.HORN_SPEC.forEach((h, i) => {
    const az = h[0] * D2R, po = h[1] * D2R;
    const d = [Math.sin(po) * Math.sin(az), Math.cos(po), Math.sin(po) * Math.cos(az)];
    let lo = 0.0, hi = 2.5;
    for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (cran(V.add(C, V.mul(d, mid))) < 0) lo = mid; else hi = mid; }
    const t = (lo + hi) / 2, base = V.add(C, V.mul(d, t - 0.02)), e = 1e-3;
    const g = [cran(V.add(base, [e, 0, 0])) - cran(V.add(base, [-e, 0, 0])), cran(V.add(base, [0, e, 0])) - cran(V.add(base, [0, -e, 0])), cran(V.add(base, [0, 0, e])) - cran(V.add(base, [0, 0, -e]))];
    const hd = V.norm(V.add(V.norm(g), [0, 0.28, -0.08]));
    pos.set([base[0], base[1], base[2], h[2]], i * 4); dir.set([hd[0], hd[1], hd[2], h[3]], i * 4);
  });
  return { pos, dir };
};
MH.MAP = `
float mapHead(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float d = sdHeadStatic(p);
  d = applyEye(p, q, d);
  d = applyMouth(p, q, jawSpace(p), d);
  float n = sdRoundCone(p, vec3(0.0, -2.35, -0.3), vec3(0.0, -0.62, -0.34), 0.6, 0.47);
  n = smin(n, sdCapsule(q, vec3(0.44, -0.62, -0.46), vec3(0.13, -2.05, 0.28), 0.09), 0.14);
  n = smin(n, sdEllipsoid(p - vec3(0.0, -1.42, 0.36), vec3(0.075, 0.1, 0.07)), 0.07);
  d = smin(d, n, 0.1);
  return d;
}`;
MH.uniforms = function (hs) {
  const h4 = [], d4 = [];
  for (let i = 0; i < 10; i++) { h4.push(new THREE.Vector4(hs.pos[i * 4], hs.pos[i * 4 + 1], hs.pos[i * 4 + 2], hs.pos[i * 4 + 3])); d4.push(new THREE.Vector4(hs.dir[i * 4], hs.dir[i * 4 + 1], hs.dir[i * 4 + 2], hs.dir[i * 4 + 3])); }
  return { uFace: { value: new THREE.Vector4(...MH.FACE) }, uHorn: { value: h4 }, uHornD: { value: d4 } };
};
MH.bake = async function (voxel) {
  const t0 = performance.now();
  const hs = MH.horns(); MH.hs = hs;
  voxel = voxel || 0.016;
  // bounds (head space): horns set the top/back
  let mn = [-0.95, -2.2, -1.2], mx = [0.95, 1.2, 1.28];
  for (let i = 0; i < 10; i++) {
    const b = [hs.pos[i * 4], hs.pos[i * 4 + 1], hs.pos[i * 4 + 2]], L = hs.pos[i * 4 + 3], d = [hs.dir[i * 4], hs.dir[i * 4 + 1], hs.dir[i * 4 + 2]];
    const tip = V.add(b, V.mul(d, L * 1.1));
    for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], tip[k] - 0.08); mx[k] = Math.max(mx[k], tip[k] + 0.08); }
  }
  const nx = Math.ceil((mx[0] - mn[0]) / voxel), ny = Math.ceil((mx[1] - mn[1]) / voxel), nz = Math.ceil((mx[2] - mn[2]) / voxel);
  const cx = nx + 1, cy = ny + 1, cz = nz + 1;
  const tilesNeeded = Math.ceil(cz / 4), tilesX = Math.max(1, Math.floor(4096 / cx)), tilesY = Math.ceil(tilesNeeded / tilesX);
  const W = tilesX * cx, H = tilesY * cy;
  const U = Object.assign(MH.uniforms(hs), { uO: { value: new THREE.Vector3(...mn) }, uH: { value: voxel }, uC: { value: new THREE.Vector3(cx, cy, cz) }, uTX: { value: tilesX } });
  const fs = MH.COMMON + MH.UNI + MH.SDF + MH.MAP + `
    uniform vec3 uO; uniform float uH; uniform vec3 uC; uniform float uTX;
    float at(float i, float j, float k) { if (k >= uC.z) return 1.0; return mapHead(uO + vec3(i, j, k) * uH); }
    void main() {
      vec2 fc = floor(gl_FragCoord.xy);
      float tx = floor(fc.x / uC.x), ty = floor(fc.y / uC.y);
      float i = fc.x - tx * uC.x, j = fc.y - ty * uC.y;
      float k0 = (ty * uTX + tx) * 4.0;
      gl_FragColor = vec4(at(i, j, k0), at(i, j, k0 + 1.0), at(i, j, k0 + 2.0), at(i, j, k0 + 3.0));
    }`;
  const mat = new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: fs, uniforms: U, depthTest: false, depthWrite: false });
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  R.pass(mat, rt);
  const buf = new Float32Array(W * H * 4);
  R.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  R.renderer.setRenderTarget(null);
  const val = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) {
    const tile = k >> 2, q = k & 3, tx = tile % tilesX, ty = Math.floor(tile / tilesX);
    for (let j = 0; j < cy; j++) { const row = ((ty * cy + j) * W + tx * cx) * 4 + q; const o = cx * j + cx * cy * k; for (let i = 0; i < cx; i++) val[o + i] = buf[row + i * 4]; }
  }
  rt.dispose(); mat.dispose();
  const tBake = performance.now() - t0;
  await MG.yield();
  let m = MESH.netsGrid(val, nx, ny, nz, mn, voxel);
  m = MESH.largest(m, 1500);
  const tNets = performance.now() - t0 - tBake;
  await MG.yield();
  // per-vertex passes: project onto the field, then normal + horn mask, then AO
  const nv = m.nv, TW = 1024, TH = Math.ceil(nv / TW);
  const pdat = new Float32Array(TW * TH * 4);
  for (let v = 0; v < nv; v++) { pdat[v * 4] = m.pos[v * 3]; pdat[v * 4 + 1] = m.pos[v * 3 + 1]; pdat[v * 4 + 2] = m.pos[v * 3 + 2]; pdat[v * 4 + 3] = 1; }
  const vt = (data) => { const t = new THREE.DataTexture(data, TW, TH, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; };
  const vrt = new THREE.WebGLRenderTarget(TW, TH, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const out = new Float32Array(TW * TH * 4);
  const VP = MH.COMMON + MH.UNI + MH.SDF + MH.MAP + `
    uniform sampler2D tP; uniform float uMode;
    vec3 nrm(vec3 p) { const float e = 0.0035; vec2 k = vec2(1.0, -1.0);
      return normalize(k.xyy * mapHead(p + k.xyy * e) + k.yyx * mapHead(p + k.yyx * e) + k.yxy * mapHead(p + k.yxy * e) + k.xxx * mapHead(p + k.xxx * e)); }
    void main() {
      vec4 P = texelFetch(tP, ivec2(gl_FragCoord.xy), 0);
      vec3 p = P.xyz;
      if (uMode < 0.5) {            // project twice onto the zero set
        for (int it = 0; it < 2; it++) { float d = mapHead(p); p -= nrm(p) * d; }
        gl_FragColor = vec4(p, 1.0);
      } else if (uMode < 1.5) {     // normal + horn weight
        vec3 n = nrm(p);
        float hd = p.y > 0.05 ? sdHorns(p) : 1.0;
        float horn = 1.0 - smoothstep(0.004, 0.03, hd);
        gl_FragColor = vec4(n, horn);
      } else {                      // ambient occlusion + cavity
        vec3 n = nrm(p);
        float occ = 0.0, sca = 1.0;
        for (int i = 0; i < 6; i++) { float h = 0.015 + 0.05 * float(i); float dd = mapHead(p + n * h); occ += (h - dd) * sca; sca *= 0.72; }
        float ao = clamp(1.0 - 1.6 * occ, 0.0, 1.0);
        float cav = clamp((mapHead(p + n * 0.02) - 0.02) * -40.0, -1.0, 1.0);
        gl_FragColor = vec4(ao, cav, 0.0, 1.0);
      }
    }`;
  const vmat = new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: VP, uniforms: Object.assign(MH.uniforms(hs), { tP: { value: null }, uMode: { value: 0 } }), depthTest: false, depthWrite: false });
  const run = (tex, mode) => { vmat.uniforms.tP.value = tex; vmat.uniforms.uMode.value = mode; R.pass(vmat, vrt); R.renderer.readRenderTargetPixels(vrt, 0, 0, TW, TH, out); R.renderer.setRenderTarget(null); return out.slice(); };
  const t1 = vt(pdat);
  const proj = run(t1, 0);
  const t2 = vt(proj);
  const nh = run(t2, 1), ao = run(t2, 2);
  t1.dispose(); t2.dispose(); vrt.dispose(); vmat.dispose();
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), horn = new Float32Array(nv), aoA = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    for (let k = 0; k < 3; k++) { const pv = proj[v * 4 + k]; pos[v * 3 + k] = Math.abs(pv - m.pos[v * 3 + k]) < voxel * 1.5 ? pv : m.pos[v * 3 + k]; nrm[v * 3 + k] = nh[v * 4 + k]; }
    horn[v] = nh[v * 4 + 3]; aoA[v] = ao[v * 4];
  }
  MH.mesh = { pos, nrm, idx: m.idx, nv, horn, ao: aoA, stats: { nv, nt: m.idx.length / 3, dims: [nx, ny, nz], ms: Math.round(performance.now() - t0), bake: Math.round(tBake), nets: Math.round(tNets) } };
  return MH.mesh;
};
