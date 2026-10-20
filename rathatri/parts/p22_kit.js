/* KIT — level geometry. Shapes are written into per-material buckets (world-scale UVs), merged into one mesh per
   material per 48 m chunk at the end; colliders go to PHY as they are placed. */
const KIT = { B: null, group: null };
KIT.begin = function () { KIT.B = new Map(); KIT.group = new THREE.Group(); KIT.group.name = 'level'; return KIT.group; };
KIT.bucket = function (mat, cx, cz) {
  const ck = Math.floor(cx / 48) + ',' + Math.floor(cz / 48);
  const key = mat.uuid + '|' + ck;
  let b = KIT.B.get(key); if (!b) { b = { mat, P: [], N: [], U: [], I: [], C: null }; KIT.B.set(key, b); }
  return b;
};
/* add a quad (4 corners, CCW seen from the front) with UVs from two world axes */
KIT.quad = function (mat, a, b, c, d, n, uvf) {
  const bk = KIT.bucket(mat, (a[0] + c[0]) / 2, (a[2] + c[2]) / 2), s = mat.userData.tscale || 2;
  const base = bk.P.length / 3;
  for (const p of [a, b, c, d]) { bk.P.push(p[0], p[1], p[2]); bk.N.push(n[0], n[1], n[2]); const uv = uvf(p); bk.U.push(uv[0] / s, uv[1] / s); }
  bk.I.push(base, base + 1, base + 2, base, base + 2, base + 3);
};
/* axis box; faces: mask string of which faces to emit ('xXyYzZ'), default all */
KIT.box = function (x0, y0, z0, x1, y1, z1, mat, o) {
  o = o || {};
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  const f = o.faces || 'xXyYzZ', m = o.mats || {};
  const M = (k) => m[k] || mat;
  if (f.includes('Y')) KIT.quad(M('Y'), [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], (p) => [p[0], -p[2]]);
  if (f.includes('y')) KIT.quad(M('y'), [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], (p) => [p[0], p[2]]);
  if (f.includes('Z')) KIT.quad(M('Z'), [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], (p) => [p[0], p[1]]);
  if (f.includes('z')) KIT.quad(M('z'), [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], (p) => [-p[0], p[1]]);
  if (f.includes('X')) KIT.quad(M('X'), [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], (p) => [-p[2], p[1]]);
  if (f.includes('x')) KIT.quad(M('x'), [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], (p) => [p[2], p[1]]);
  if (o.col !== false) return PHY.box(x0, y0, z0, x1, y1, z1, o.phy);
  return null;
};
/* rotated box about Y (center cx,cz; half sizes hx,hz) */
KIT.obox = function (cx, y0, cz, hx, y1, hz, yaw, mat, o) {
  o = o || {};
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (lx, y, lz) => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
  const N = (lx, lz) => [lx * c + lz * s, 0, -lx * s + lz * c];
  const uvH = (p) => [p[0], -p[2]];
  const top = [P(-hx, y1, hz), P(hx, y1, hz), P(hx, y1, -hz), P(-hx, y1, -hz)];
  KIT.quad(mat, top[0], top[1], top[2], top[3], [0, 1, 0], uvH);
  const sides = [[[-hx, hz], [hx, hz], [0, 1], hx], [[hx, hz], [hx, -hz], [1, 0], hz], [[hx, -hz], [-hx, -hz], [0, -1], hx], [[-hx, -hz], [-hx, hz], [-1, 0], hz]];
  for (const [a, b, n] of sides) {
    const pa = P(a[0], y0, a[1]), pb = P(b[0], y0, b[1]), pc = P(b[0], y1, b[1]), pd = P(a[0], y1, a[1]);
    const L = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]);
    KIT.quad(mat, pa, pb, pc, pd, N(n[0], n[1]), (p) => { const t = Math.hypot(p[0] - pa[0], p[2] - pa[2]); return [t, p[1]]; });
    void L;
  }
  if (o.bottom) KIT.quad(mat, P(-hx, y0, -hz), P(hx, y0, -hz), P(hx, y0, hz), P(-hx, y0, hz), [0, -1, 0], uvH);
  if (o.col !== false) return PHY.obox(cx, cz, hx, hz, y0, y1, yaw, o.phy);
  return null;
};
/* arbitrary geometry transformed into a bucket (UVs: keep the geometry's, scaled) */
KIT.geo = function (geo, mat, matrix, o) {
  o = o || {};
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (matrix) g.applyMatrix4(matrix);
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  let cx = 0, cz = 0; for (let i = 0; i < p.count; i++) { cx += p.getX(i); cz += p.getZ(i); } cx /= p.count; cz /= p.count;
  const bk = KIT.bucket(mat, cx, cz), s = mat.userData.tscale || 2, base = bk.P.length / 3;
  for (let i = 0; i < p.count; i++) {
    bk.P.push(p.getX(i), p.getY(i), p.getZ(i)); bk.N.push(n.getX(i), n.getY(i), n.getZ(i));
    if (o.worldUV) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); if (ay > 0.7) bk.U.push(p.getX(i) / s, p.getZ(i) / s); else if (ax > 0.7) bk.U.push(p.getZ(i) / s, p.getY(i) / s); else bk.U.push(p.getX(i) / s, p.getY(i) / s); }
    else if (uv) bk.U.push(uv.getX(i) * (o.uvs || 1), uv.getY(i) * (o.uvs2 || o.uvs || 1)); else bk.U.push(0, 0);
    bk.I.push(base + i);
  }
  g.dispose();
};
KIT.cyl = function (cx, y0, cz, r, h, mat, o) {
  o = o || {};
  const g = new THREE.CylinderGeometry(o.r1 !== undefined ? o.r1 : r, r, h, o.seg || 24, 1, !!o.open);
  const m = new THREE.Matrix4().makeTranslation(cx, y0 + h / 2, cz);
  KIT.geo(g, mat, m, { worldUV: false, uvs: o.uvs || Math.max(1, Math.round(TAU * r / (mat.userData.tscale || 2))), uvs2: h / (mat.userData.tscale || 2) });
  if (o.col !== false) return PHY.cyl(cx, cz, r, y0, y0 + h, o.phy);
  return null;
};
KIT.lathe = function (prof, cx, cy, cz, mat, o) {
  o = o || {};
  const g = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), o.seg || 24);
  KIT.geo(g, mat, new THREE.Matrix4().makeTranslation(cx, cy, cz), { uvs: o.uvs || 4, uvs2: o.uvs2 || 1 });
};
/* regular-polygon annulus slab (catwalk rings / pit rims) */
KIT.ring = function (cx, cz, rIn, rOut, y0, y1, mat, o) {
  o = o || {};
  const sides = o.sides || 32, rot = o.rot || 0;
  const a0 = o.a0 !== undefined ? o.a0 : 0, a1 = o.a1 !== undefined ? o.a1 : TAU;
  const n = Math.max(3, Math.round(sides * (a1 - a0) / TAU));
  for (let i = 0; i < n; i++) {
    const t0 = a0 + (a1 - a0) * i / n + rot, t1 = a0 + (a1 - a0) * (i + 1) / n + rot;
    const P = (r, t, y) => [cx + Math.cos(t) * r, y, cz + Math.sin(t) * r];
    const uvH = (p) => [p[0], p[2]];
    KIT.quad(mat, P(rIn, t0, y1), P(rIn, t1, y1), P(rOut, t1, y1), P(rOut, t0, y1), [0, 1, 0], uvH);
    KIT.quad(mat, P(rIn, t1, y0), P(rIn, t0, y0), P(rOut, t0, y0), P(rOut, t1, y0), [0, -1, 0], uvH);
    const nm = (t) => [Math.cos(t), 0, Math.sin(t)], tm = (t0 + t1) / 2;
    KIT.quad(o.sideMat || mat, P(rOut, t0, y0), P(rOut, t0, y1), P(rOut, t1, y1), P(rOut, t1, y0), nm(tm), (p) => [Math.atan2(p[2] - cz, p[0] - cx) * rOut, p[1]]);
    const ni = nm(tm); KIT.quad(o.sideMat || mat, P(rIn, t1, y0), P(rIn, t1, y1), P(rIn, t0, y1), P(rIn, t0, y0), [-ni[0], 0, -ni[2]], (p) => [Math.atan2(p[2] - cz, p[0] - cx) * rIn, p[1]]);
  }
  if (o.col !== false && a1 - a0 >= TAU - 1e-3) return PHY.ring(cx, cz, rIn, rOut, y0, y1, sides, rot, o.phy);
  return null;
};
/* railing along a polyline (posts + two rails), with a thin collider */
KIT.rail = function (pts, y, mat, o) {
  o = o || {};
  const h = o.h || 1.0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    for (const hh of [h, h * 0.5]) KIT.obox(cx, y + hh - 0.03, cz, 0.025, y + hh + 0.03, L / 2, yaw, mat, { col: false });
    const np = Math.max(1, Math.round(L / 1.6));
    for (let k = 0; k <= np; k++) { const t = k / np; KIT.box(a[0] + dx * t - 0.03, y, a[1] + dz * t - 0.03, a[0] + dx * t + 0.03, y + h, a[1] + dz * t + 0.03, mat, { col: false }); }
    if (o.col !== false) PHY.obox(cx, cz, 0.08, L / 2, y, y + h, yaw);
  }
};
KIT.stairs = function (x0, z0, x1, z1, y0, y1, axis, mat, n) {
  n = n || Math.max(2, Math.round(Math.abs(y1 - y0) / 0.2));
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, y = y0 + (y1 - y0) * t1;
    if (axis === 'z') KIT.box(x0, Math.min(y0, y1) - 0.2, lerp(z0, z1, t0), x1, y, lerp(z0, z1, t1), mat, { col: false });
    else KIT.box(lerp(x0, x1, t0), Math.min(y0, y1) - 0.2, z0, lerp(x0, x1, t1), y, z1, mat, { col: false });
  }
  const ya = axis === 'z' ? (z0 < z1 ? y0 : y1) : (x0 < x1 ? y0 : y1), yb = axis === 'z' ? (z0 < z1 ? y1 : y0) : (x0 < x1 ? y1 : y0);
  return PHY.ramp(x0, z0, x1, z1, axis, ya, yb);
};
/* a lamp: emissive fixture + a light source for the pool */
KIT.lamp = function (x, y, z, col, i, range, o) {
  o = o || {};
  if (o.fixture !== false) {
    const m = KIT.emis(col, o.glow || 3);
    const g = o.geo || new THREE.SphereGeometry(o.size || 0.12, 12, 8);
    KIT.geo(g, m, new THREE.Matrix4().makeTranslation(x, y, z));
  }
  return R.addLight({ pos: new THREE.Vector3(x, y, z), col: new THREE.Color(col), i: i || 3, range: range || 8, prio: o.prio || 1, on: true });
};
KIT._emis = {};
KIT.emis = function (col, k) {
  const key = col + '_' + k; if (KIT._emis[key]) return KIT._emis[key];
  const c = new THREE.Color(col); const m = new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), toneMapped: false }); m.userData.tscale = 1;
  KIT._emis[key] = m; return m;
};
KIT.end = function () {
  for (const b of KIT.B.values()) {
    if (!b.I.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(b.U, 2));
    g.setIndex(b.I); g.computeBoundingSphere();
    if (b.mat.normalMap) g.computeTangents && false;
    const me = new THREE.Mesh(g, b.mat); me.castShadow = !b.mat.isMeshBasicMaterial && !b.mat.userData.noShadow; me.receiveShadow = !b.mat.isMeshBasicMaterial;
    me.matrixAutoUpdate = false; me.updateMatrix();
    KIT.group.add(me);
  }
  KIT.B = null;
  return KIT.group;
};

/* volumetric-looking light shaft: an additive quad pair (crossed) fading along its length and edges */
KIT.shaftMat = function (col, a) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false,
    uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: a }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uCol; uniform float uA, uT; varying vec2 vUv; varying vec3 vW;
      float h(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ float e = sin(vUv.x * 3.14159); float l = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
        float d = 0.6 + 0.8 * n3(vW * 1.3 + vec3(0.0, uT * 0.15, uT * 0.1));
        gl_FragColor = vec4(uCol * uA * e * e * l * d, 1.0); }` });
};
KIT.shaft = function (L, p, dir, w, len, col, a) {
  const m = KIT.shaftMat(col, a || 0.06);
  const g = new THREE.PlaneGeometry(w, len); g.translate(0, -len / 2, 0); g.rotateY(0);
  const grp = new THREE.Group();
  for (const r of [0, HALF]) { const me = new THREE.Mesh(g, m); me.rotation.y = r; me.renderOrder = 3; grp.add(me); }
  grp.position.copy(p); grp.quaternion.setFromUnitVectors(V3(0, -1, 0), dir.clone().normalize());
  LEVEL.add(grp); L.updates.push((dt, t) => { m.uniforms.uT.value = t; });
  return grp;
};
/* chamfered box: bevelled edges catch the light the way machined / cast parts do (c = chamfer size) */
KIT.chamferGeo = function (hx, hy, hz, c) {
  const h = [hx, hy, hz]; c = Math.min(c, hx * 0.49, hy * 0.49, hz * 0.49);
  const P = [], N = [];
  const tri = (a, b, d, n) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ad = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]; const cr = [ab[1] * ad[2] - ab[2] * ad[1], ab[2] * ad[0] - ab[0] * ad[2], ab[0] * ad[1] - ab[1] * ad[0]]; if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { const t = b; b = d; d = t; } P.push(...a, ...b, ...d); N.push(...n, ...n, ...n); };
  const quad = (a, b, d, e, n) => { tri(a, b, d, n); tri(a, d, e, n); };
  const V = (ax, va, bx, vb, cx, vc) => { const v = [0, 0, 0]; v[ax] = va; v[bx] = vb; v[cx] = vc; return v; };
  for (let a = 0; a < 3; a++) for (const s of [-1, 1]) {   // faces
    const b = (a + 1) % 3, d = (a + 2) % 3, n = [0, 0, 0]; n[a] = s;
    const x = s * h[a], eb = h[b] - c, ed = h[d] - c;
    quad(V(a, x, b, -eb, d, -ed), V(a, x, b, eb, d, -ed), V(a, x, b, eb, d, ed), V(a, x, b, -eb, d, ed), n);
  }
  for (let a = 0; a < 3; a++) { const b = (a + 1) % 3, t = (a + 2) % 3; for (const sa of [-1, 1]) for (const sb of [-1, 1]) {   // edges
    const n = [0, 0, 0]; n[a] = sa * Math.SQRT1_2; n[b] = sb * Math.SQRT1_2; const et = h[t] - c;
    quad(V(a, sa * h[a], b, sb * (h[b] - c), t, -et), V(a, sa * (h[a] - c), b, sb * h[b], t, -et), V(a, sa * (h[a] - c), b, sb * h[b], t, et), V(a, sa * h[a], b, sb * (h[b] - c), t, et), n);
  } }
  const k = 1 / Math.sqrt(3);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) tri([sx * hx, sy * (hy - c), sz * (hz - c)], [sx * (hx - c), sy * hy, sz * (hz - c)], [sx * (hx - c), sy * (hy - c), sz * hz], [sx * k, sy * k, sz * k]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  return g;
};
KIT.bbox = function (x0, y0, z0, x1, y1, z1, mat, o) {
  o = o || {};
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  const g = KIT.chamferGeo((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2, o.c || 0.05);
  KIT.geo(g, mat, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), { worldUV: true });
  if (o.col !== false) return PHY.box(x0, y0, z0, x1, y1, z1, o.phy);
  return null;
};
/* chamfered box with any orientation: centre, half sizes, euler (no collider) */
KIT.rbox = function (cx, cy, cz, hx, hy, hz, rx, ry, rz, mat, c) {
  const g = KIT.chamferGeo(hx, hy, hz, c || 0.04);
  KIT.geo(g, mat, new THREE.Matrix4().compose(V3(cx, cy, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(1, 1, 1)), { worldUV: true });
};
/* a beam between two points (square section w, chamfered) */
KIT.beam = function (a, b, w, mat, c) {
  const d = V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(); d.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d);
  const g = KIT.chamferGeo(w / 2, L / 2, w / 2, c || Math.min(0.04, w * 0.2));
  KIT.geo(g, mat, new THREE.Matrix4().compose(V3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, V3(1, 1, 1)), { worldUV: true });
};
/* cargo crate: bevelled body, raised frame round each side panel, corner guards, lid latches, side handles + optional
   stripe. Built into KIT buckets (static), with a box collider. */
KIT.crate = function (x, z, w, h, d, body, trim, o) {
  o = o || {}; const y0 = o.y || 0, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y0 + h, t = Math.min(0.06, Math.min(w, h, d) * 0.07);
  KIT.bbox(x0 + 0.01, y0, z0 + 0.01, x1 - 0.01, y1, z1 - 0.01, body, { c: t * 0.6, col: false });
  // corner guards on the four vertical edges + the lid rim
  for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) KIT.bbox(cx - t, y0, cz - t, cx + t, y1, cz + t, trim, { c: t * 0.35, col: false });
  KIT.bbox(x0 - 0.004, y1 - t * 0.9, z0 - 0.004, x1 + 0.004, y1 + 0.004, z1 + 0.004, trim, { c: t * 0.3, col: false });
  KIT.bbox(x0 - 0.004, y0, z0 - 0.004, x1 + 0.004, y0 + t * 0.9, z1 + 0.004, trim, { c: t * 0.3, col: false });
  // raised frame round each side panel (a few mm proud, so it catches a highlight)
  const fr = t * 0.45, pr = 0.012;
  for (const s of [-1, 1]) {
    const fz = s > 0 ? z1 : z0, fx = s > 0 ? x1 : x0;
    KIT.bbox(x0 + t, y0 + h * 0.5 - fr / 2, fz - (s > 0 ? 0 : pr), x1 - t, y0 + h * 0.5 + fr / 2, fz + (s > 0 ? pr : 0), trim, { c: fr * 0.3, col: false });
    KIT.bbox(fx - (s > 0 ? 0 : pr), y0 + h * 0.5 - fr / 2, z0 + t, fx + (s > 0 ? pr : 0), y0 + h * 0.5 + fr / 2, z1 - t, trim, { c: fr * 0.3, col: false });
    // handles on the long sides
    if (w >= d) { for (const hx of [x0 + w * 0.3, x1 - w * 0.3]) KIT.bbox(hx - 0.07, y1 - h * 0.28, fz - (s > 0 ? 0 : 0.035), hx + 0.07, y1 - h * 0.22, fz + (s > 0 ? 0.035 : 0), trim, { c: 0.008, col: false }); }
    else { for (const hz of [z0 + d * 0.3, z1 - d * 0.3]) KIT.bbox(fx - (s > 0 ? 0 : 0.035), y1 - h * 0.28, hz - 0.07, fx + (s > 0 ? 0.035 : 0), y1 - h * 0.22, hz + 0.07, trim, { c: 0.008, col: false }); }
  }
  // lid latches
  for (const lx of [x0 + w * 0.25, x1 - w * 0.25]) for (const s of [-1, 1]) KIT.bbox(lx - 0.035, y1 - t * 2.2, (s > 0 ? z1 : z0) - 0.012, lx + 0.035, y1 - t * 0.3, (s > 0 ? z1 : z0) + 0.012, trim, { c: 0.006, col: false });
  if (o.stripe) KIT.bbox(x0 - 0.006, y0 + h * 0.66, z0 - 0.006, x1 + 0.006, y0 + h * 0.66 + 0.06, z1 + 0.006, o.stripe, { c: 0.006, col: false });
  if (o.lamp) KIT.box(x - 0.08, y1 + 0.001, z - 0.04, x + 0.08, y1 + 0.012, z + 0.04, KIT.emis(o.lamp, 3), { col: false });
  return PHY.box(x0, y0, z0, x1, y1, z1);
};
