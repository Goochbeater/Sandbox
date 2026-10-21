/* FLORA — vegetation, rocks and ruins for PLANET worlds. Generators ported from Starfall (fernGeometry, organicCrown, canopy cards, grass
   clusters, hero trees with buttress roots and hanging vines, drifting spores) and re-tuned for Dxun's jungle, Hutta's mire, Krayiss's petrified
   lichen-trees and Lenico's twisted ash trees. Static trees go through KIT buckets (merged per material per 48 m chunk); small repeated plants
   are InstancedMeshes split into a 3×3 grid of chunks so frustum culling still works; everything leafy sways in the vertex shader (no CPU).
   Ruins: weathered Sith pillars, arches, walls, hooded statues, obelisks with glyph strips, tomb doors, ward stones — all with moss/grime. */
const FLORA = { U: { t: { value: 0 } }, M: {} };
FLORA.rs = (seed) => mulberry(seed >>> 0);
/* ---- canvas textures: jungle bark (fissures, moss, lichen) and a leaf-mat for crowns */
FLORA.barkTex = function (base, moss) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d'), r = FLORA.rs(91);
  g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 46; i++) { const x = r() * 256, w = 2 + r() * 6; g.strokeStyle = 'rgba(8,6,4,' + (0.35 + r() * 0.4) + ')'; g.lineWidth = w; g.beginPath(); g.moveTo(x, 0); let xx = x; for (let y = 0; y <= 512; y += 32) { xx += (r() - 0.5) * 10; g.lineTo(xx, y); } g.stroke();
    g.strokeStyle = 'rgba(255,240,210,0.06)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + w, 0); g.lineTo(x + w + (r() - 0.5) * 12, 512); g.stroke(); }
  for (let i = 0; i < 2600; i++) { const x = r() * 256, y = r() * 512; g.fillStyle = r() < 0.5 ? 'rgba(255,235,200,0.05)' : 'rgba(0,0,0,0.08)'; g.fillRect(x, y, 1 + r() * 3, 1 + r() * 5); }
  for (let i = 0; i < 70; i++) { const x = r() * 256, y = r() * 512, rr = 6 + r() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, moss); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
};
FLORA.leafTex = function (base, light, dark) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = FLORA.rs(77); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const x = r() * 256, y = r() * 256, a = r() * TAU, L = 6 + r() * 14, W = 2 + r() * 5; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = r() < 0.55 ? light : dark; g.globalAlpha = 0.35 + r() * 0.5; g.beginPath(); g.ellipse(0, 0, L, W, 0, 0, TAU); g.fill(); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
};
/* ---- wind: leafy materials bend by height above their base, phased by world position */
FLORA.sway = function (m, k, inst) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, rr) => { if (prev) prev(sh, rr); sh.uniforms.uWT = FLORA.U.t;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWT;').replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec3 bw = ${inst ? '(modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz' : '(modelMatrix * vec4(transformed, 1.0)).xyz'}; float hk = ${inst ? 'max(position.y, 0.0)' : 'clamp((bw.y - 2.0) * 0.06, 0.0, 1.5)'};
        float ph = bw.x * 0.21 + bw.z * 0.17; float sw = sin(uWT * 1.3 + ph) * 0.6 + sin(uWT * 2.9 + ph * 1.7) * 0.25;
        transformed.x += sw * hk * ${k.toFixed(3)}; transformed.z += cos(uWT * 1.1 + ph * 1.3) * 0.5 * hk * ${k.toFixed(3)}; }`); };
  const ck = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => ''; m.customProgramCacheKey = () => ck() + 'sway' + k + (inst ? 'i' : 's'); return m;
};
/* moss on top faces + grime at the base: rocks, ruins, logs */
FLORA.moss = function (m, mossCol, amt) {
  const prev = m.onBeforeCompile, U = { uMoss: { value: new THREE.Color(mossCol) }, uMA: { value: amt } };
  m.onBeforeCompile = (sh, rr) => { if (prev) prev(sh, rr); Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMN2; varying vec3 vMW2;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMN2 = normalize(mat3(modelMatrix) * objectNormal); vMW2 = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uMoss; uniform float uMA; varying vec3 vMN2; varying vec3 vMW2;\nfloat mH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float n = mH(floor(vMW2 * 3.0)) * 0.5 + mH(floor(vMW2 * 0.7)) * 0.5; float top = smoothstep(0.35, 0.85, vMN2.y + (n - 0.5) * 0.5); diffuseColor.rgb = mix(diffuseColor.rgb, uMoss * (0.7 + 0.6 * n), top * uMA); }`); };
  const ck = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => ''; m.customProgramCacheKey = () => ck() + 'moss' + amt; return m;
};
FLORA.mats = function (W) {
  const key = W.flora + W.seed; if (FLORA.M.key === key) return FLORA.M; const M = FLORA.M = { key };
  const J = W.flora === 'jungle';
  M.bark = FLORA.moss(new THREE.MeshStandardMaterial({ map: FLORA.barkTex(J ? '#3a2e22' : W.flora === 'swamp' ? '#3a3424' : '#5a5650', J ? 'rgba(70,110,40,0.55)' : 'rgba(110,110,100,0.25)'), roughness: 0.92, envMapIntensity: 0.4 }), J ? 0x3a5a22 : 0x6a6a60, J ? 0.55 : 0.15); M.bark.userData.tscale = 1;
  M.crown = FLORA.sway(new THREE.MeshStandardMaterial({ map: FLORA.leafTex(J ? '#284a1c' : '#3a3a30', J ? '#5a8a34' : '#7a7a6a', J ? '#142a0e' : '#2a2a22'), vertexColors: true, roughness: 0.82, side: THREE.DoubleSide, envMapIntensity: 0.4, emissive: J ? 0x13260c : 0x000000 }), 0.35, false); M.crown.userData.tscale = 1;
  M.vine = FLORA.sway(new THREE.MeshStandardMaterial({ color: J ? 0x2a4a1c : 0x3a3a2a, roughness: 0.8 }), 0.5, false); M.vine.userData.tscale = 1;
  const fb = ASSET.tex('foliage_branch'); fb.wrapS = fb.wrapT = THREE.ClampToEdgeWrapping;
  M.card = FLORA.sway(new THREE.MeshStandardMaterial({ map: fb, alphaTest: 0.45, side: THREE.DoubleSide, color: J ? 0x6a9a50 : 0x8a8a70, roughness: 0.8, envMapIntensity: 0.3 }), 0.22, true);
  M.fern = FLORA.sway(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75, color: J ? 0xffffff : 0xb0b0a0, envMapIntensity: 0.3 }), 0.12, true);
  M.leaf = FLORA.sway(new THREE.MeshStandardMaterial({ map: FLORA.broadleafTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, envMapIntensity: 0.45, emissive: 0x081206 }), 0.1, true);
  M.reed = FLORA.sway(new THREE.MeshStandardMaterial({ map: FLORA.reedTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85, envMapIntensity: 0.25 }), 0.3, true);
  M.dead = FLORA.moss(new THREE.MeshStandardMaterial({ map: FLORA.barkTex(W.flora === 'twisted' ? '#4a4646' : '#3a3e46', 'rgba(150,150,140,0.2)'), roughness: 0.95, envMapIntensity: 0.3 }), 0x7b8088, 0.3); M.dead.userData.tscale = 1;
  return M;
};
FLORA.reedTex = function () { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = FLORA.rs(5);
  for (let i = 0; i < 40; i++) { const x = r() * 256, h = 90 + r() * 160, tip = x + (r() - 0.5) * 60, base = 256; const gr = g.createLinearGradient(x, base, tip, base - h); gr.addColorStop(0, '#2a2810'); gr.addColorStop(0.4, '#5a5a28'); gr.addColorStop(1, '#a09a58'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 2.6, base); g.quadraticCurveTo(x + (r() - 0.5) * 20, base - h * 0.5, tip, base - h); g.quadraticCurveTo(x + (r() - 0.5) * 20, base - h * 0.45, x + 2.6, base); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

/* ---- geometry generators (Starfall ports) */
FLORA.fernGeo = function (fronds, segs, hue) {   // fan of curved fronds with paired leaflets, colour by height
  const p = [], c = [], col = new THREE.Color(); fronds = fronds || 7; segs = segs || 8;
  const tri = (a, b, d, t) => { for (const q of [a, b, d]) { p.push(q.x, q.y, q.z); col.setHSL((hue || 0.27) + t * 0.025, 0.42, 0.13 + q.y * 0.16); c.push(col.r, col.g, col.b); } };
  for (let f = 0; f < fronds; f++) { const ang = f * 2.39996, len = 1.0 + (f % 4) * 0.23;
    const at = (t, s) => V3(Math.sin(ang) * t * len + Math.cos(ang) * (s || 0), Math.sin(t * Math.PI * 0.8) * len * 0.65, Math.cos(ang) * t * len - Math.sin(ang) * (s || 0));
    for (let k = 0; k < segs; k++) { const t = (k + 0.4) / segs, u = (k + 1.4) / segs, w = Math.sin(t * Math.PI) * len * 0.2; tri(at(t, -0.014), at(t, 0.014), at(u), f / fronds);
      for (const side of [-1, 1]) { const root = at(t), tip = at(t + 0.12, side * w), mid = at(t + 0.025, side * w * 0.65); mid.y += 0.03; tri(root, mid, tip, f / fronds); tri(root, tip, at(t + 0.08, side * w * 0.5), f / fronds); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals(); return g;
};
FLORA.crownGeo = function (segs, rings, c0, c1) {   // organicCrown: a rippled, folded half-dome; vertex colour darkens toward the rim
  const g = new THREE.SphereGeometry(1, segs || 22, rings || 10, 0, TAU, 0, Math.PI * 0.86), p = g.attributes.position, c = [], A = new THREE.Color(c0 || 0x9ac080), B = new THREE.Color(c1 || 0x3a5a30);
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x), r = Math.hypot(x, z), rip = 1 + Math.sin(a * 7) * 0.06 + Math.sin(a * 19) * 0.025; const fold = Math.sin(a * 28) * 0.03 * r * r;
    x *= rip; z *= rip; y = (y > 0 ? Math.pow(y, 0.75) : y * 0.55) * 0.8 + fold + Math.sin(a * 7) * 0.08 * r * r; const k = A.clone().lerp(B, r * 0.7); p.setXYZ(i, x, y, z); c.push(k.r, k.g, k.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals(); return g;
};
FLORA.cardGeo = function () { const g = new THREE.BufferGeometry(), P = [], U = [], N = []; for (let j = 0; j < 3; j++) { const a = j * Math.PI / 3, dx = Math.cos(a) * 0.6, dz = Math.sin(a) * 0.6;
    const v = [[-dx, 0, -dz, 0, 0], [dx, 0, dz, 1, 0], [dx, 1.1, dz, 1, 1], [-dx, 0, -dz, 0, 0], [dx, 1.1, dz, 1, 1], [-dx, 1.1, -dz, 0, 1]]; for (const q of v) { P.push(q[0], q[1], q[2]); U.push(q[3], q[4]); N.push(0, 0.9, 0.35); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return g; };
/* ---- instanced scatter, chunked 3×3 so the frustum culls */
FLORA.scatter = function (geo, mat, list, half, o) {
  o = o || {}; const n = 3, cs = (half * 2) / n, bins = [];
  for (let i = 0; i < n * n; i++) bins.push([]);
  for (const it of list) { const bx = clamp(Math.floor((it[0] + half) / cs), 0, n - 1), bz = clamp(Math.floor((it[2] + half) / cs), 0, n - 1); bins[bz * n + bx].push(it); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), out = [];
  for (const b of bins) { if (!b.length) continue; const im = new THREE.InstancedMesh(geo, mat, b.length);
    b.forEach((it, i) => { e.set(it[5] || 0, it[3], it[6] || 0, 'YXZ'); q.setFromEuler(e); const s = it[4]; m4.compose(V3(it[0], it[1], it[2]), q, o.sy ? V3(s, s * o.sy, s) : V3(s, s, s)); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = !!o.cast; im.receiveShadow = true; LEVEL.add(im); out.push(im); }
  return out;
};
/* ---- trees */
FLORA.tube = (pts, r0, r1, seg, rad) => { const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position, n = seg + 1;
  // taper: TubeGeometry has constant radius 1; rescale each ring about the curve point
  for (let i = 0; i < n; i++) { const t = i / seg, c = curve.getPointAt(t), r = lerp(r0, r1, t); for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; const x = p.getX(k) - c.x, y = p.getY(k) - c.y, z = p.getZ(k) - c.z; p.setXYZ(k, c.x + x * r, c.y + y * r, c.z + z * r); } }
  g.computeVertexNormals(); return g; };
/* the Dxun giant: a leaning trunk 30–50 m tall on plank buttresses, four limbs, each ending in a clustered crown (overlapping leaf
   domes ringed with leaf cards for a ragged silhouette), vines hanging from the limbs. s = scale */
FLORA.buttressGeo = function (d, h, t) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(d, 0); sh.quadraticCurveTo(d * 0.25, h * 0.18, 0, h); sh.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: t * 0.25, bevelSize: t * 0.2, bevelSegments: 1, curveSegments: 6 }); g.translate(0, 0, -t / 2); return g; };
FLORA.megatree = function (M, x, y, z, s, rs) {
  const H = (30 + rs() * 18) * s, lean = (rs() - 0.5) * 0.1, a0 = rs() * TAU, L = (dx, dy, dz) => V3(x + dx, y + dy, z + dz), tr = 1.55 * s;
  const tp = [L(0, -1.5, 0), L(Math.cos(a0) * lean * H * 0.3, H * 0.35, Math.sin(a0) * lean * H * 0.3), L(Math.cos(a0 + 0.8) * lean * H * 0.6, H * 0.7, Math.sin(a0 + 0.8) * lean * H * 0.6), L(Math.cos(a0) * lean * H, H, Math.sin(a0) * lean * H)];
  KIT.geo(FLORA.tube(tp, tr, tr * 0.38, 10, 10), M.bark, null, { uvs: H / 4, uvs2: 2 });
  const nb = 5 + Math.floor(rs() * 3);
  for (let r = 0; r < nb; r++) { const a = r / nb * TAU + rs() * 0.5, d = (3.4 + rs() * 2.2) * s, h = (4.5 + rs() * 3.5) * s, g = FLORA.buttressGeo(d, h, 0.32 * s);
    KIT.geo(g, M.bark, new THREE.Matrix4().compose(L(Math.cos(a) * tr * 0.6, -0.4, Math.sin(a) * tr * 0.6), new THREE.Quaternion().setFromAxisAngle(YUP, -a), V3(1, 1, 1)), { worldUV: true }); }
  const crowns = [];
  for (let b = 0; b < 4; b++) { const a = a0 + b * (TAU / 4) + (rs() - 0.5) * 0.7, yb = H * (0.66 + rs() * 0.2), reach = (6 + rs() * 5) * s, base = L(Math.cos(a0) * lean * yb, yb, Math.sin(a0) * lean * yb), e = base.clone().add(V3(Math.sin(a) * reach, (3 + rs() * 4) * s, Math.cos(a) * reach));
    KIT.geo(FLORA.tube([base.clone().add(V3(0, -3 * s, 0)), base.clone().lerp(e, 0.5).add(V3(0, 1.2 * s, 0)), e], 0.55 * s, 0.18 * s, 7, 6), M.bark, null, { uvs: 2, uvs2: 1 }); crowns.push(e);
    for (let k = 0; k < 4; k++) { const t = 0.3 + k * 0.17, p = base.clone().lerp(e, t), len = (5 + rs() * 12) * s; KIT.geo(FLORA.tube([p, p.clone().add(V3((rs() - 0.5) * 0.8, -len * 0.5, (rs() - 0.5) * 0.8)), p.clone().add(V3(0, -len, 0))], 0.06 * s, 0.04 * s, 4, 3), M.vine, null, { uvs: 1, uvs2: 1 }); } }
  crowns.push(tp[3].clone().add(V3(0, 2 * s, 0)));
  for (const c of crowns) for (let j = 0; j < 5; j++) { const rad = (2.4 + rs() * 1.8) * s, off = V3((rs() - 0.5) * 6 * s, (rs() - 0.4) * 3 * s, (rs() - 0.5) * 6 * s), m = new THREE.Matrix4().compose(c.clone().add(off), new THREE.Quaternion().setFromEuler(new THREE.Euler((rs() - 0.5) * 0.5, rs() * TAU, (rs() - 0.5) * 0.5)), V3(rad, rad * (0.7 + rs() * 0.25), rad));
    KIT.geo(FLORA.crownGeo(14, 9, 0xa8d088, 0x3a5a2c), M.crown, m, { uvs: rad / 2, uvs2: rad / 2 }); }
  PHY.cyl(x, z, tr * 1.25, y - 3, y + H);
  return { crowns, H };
};
FLORA.broadleafTex = function () {   // a big jungle leaf: midrib, veins, a torn edge, alpha cut-out
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d'), r = FLORA.rs(17);
  g.translate(128, 500); const path = new Path2D(); path.moveTo(0, 0); path.bezierCurveTo(-120, -110, -125, -360, 0, -490); path.bezierCurveTo(125, -360, 120, -110, 0, 0);
  const gr = g.createLinearGradient(0, 0, 0, -490); gr.addColorStop(0, '#1a3010'); gr.addColorStop(0.5, '#3a6a24'); gr.addColorStop(1, '#5a8a34'); g.fillStyle = gr; g.fill(path);
  g.save(); g.clip(path); g.strokeStyle = 'rgba(190,220,140,0.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -485); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(170,210,120,0.35)';
  for (let i = 1; i < 16; i++) { const yy = -i * 30; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(0, yy); g.quadraticCurveTo(sx * 50, yy - 18, sx * 110, yy - 46); g.stroke(); } }
  for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,200,0.05)' : 'rgba(0,0,0,0.07)'; g.fillRect(-128 + r() * 256, -500 + r() * 500, 2 + r() * 4, 2 + r() * 4); }
  g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 7; i++) { const yy = -60 - r() * 380, sx = r() < 0.5 ? -1 : 1; g.beginPath(); g.moveTo(sx * 130, yy); g.lineTo(sx * (30 + r() * 40), yy - 6 - r() * 8); g.lineTo(sx * 130, yy - 18); g.fill(); }
  g.restore(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
FLORA.broadleafGeo = function (n) {   // n leaves on short petioles, each a curved, drooping strip
  const P = [], U = [], I = []; n = n || 6;
  for (let l = 0; l < n; l++) { const a = l / n * TAU + (l % 2) * 0.3, len = 1.1 + (l % 3) * 0.25, w = 0.42, lift = 0.5 + (l % 2) * 0.2, base = P.length / 3;
    for (let k = 0; k <= 6; k++) { const t = k / 6, d = 0.15 + t * len, yy = lift + Math.sin(t * Math.PI * 0.85) * 0.35 - t * t * 0.55; for (const sx of [-1, 1]) { const ww = sx * w * 0.5 * (0.35 + Math.sin(t * Math.PI) * 0.75); const cx = Math.sin(a) * d + Math.cos(a) * ww, cz = Math.cos(a) * d - Math.sin(a) * ww; P.push(cx, yy + Math.abs(ww) * 0.18, cz); U.push(sx < 0 ? 0 : 1, t); } }
    for (let k = 0; k < 6; k++) { const i0 = base + k * 2; I.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
};
FLORA.smalltree = function (M, x, y, z, s, rs) {   // understory palm-tree: thin trunk, one crown, a few vines
  const H = (7 + rs() * 5) * s, a = rs() * TAU, top = V3(x + Math.cos(a) * 0.8 * s, y + H, z + Math.sin(a) * 0.8 * s);
  KIT.geo(FLORA.tube([V3(x, y - 0.4, z), V3(x + Math.cos(a) * 0.2, y + H * 0.5, z + Math.sin(a) * 0.2), top], 0.32 * s, 0.16 * s, 6, 6), M.bark, null, { uvs: H / 3, uvs2: 1 });
  for (let j = 0; j < 2; j++) { const rad = (1.5 + rs() * 1.1) * s, off = V3((rs() - 0.5) * 2 * s, (rs() - 0.3) * s, (rs() - 0.5) * 2 * s); KIT.geo(FLORA.crownGeo(12, 7, 0x98c078, 0x2e4a22), M.crown, new THREE.Matrix4().compose(top.clone().add(off), new THREE.Quaternion().setFromAxisAngle(YUP, rs() * TAU), V3(rad, rad * 0.72, rad)), { uvs: 1.5, uvs2: 1.5 }); }
  PHY.cyl(x, z, 0.36 * s, y - 2, y + H);
};
FLORA.deadtree = function (M, x, y, z, s, rs, helix) {   // petrified (Krayiss) or twisted (Lenico): a helixing trunk, bare forks, cone tips
  const H = (6 + rs() * 7) * s, pts = []; for (let i = 0; i <= 5; i++) { const t = i / 5, a = t * (helix ? 5 : 1.6) + rs(); pts.push(V3(x + Math.cos(a) * (helix ? 0.6 : 0.3) * s * t, y - 0.5 + H * t, z + Math.sin(a) * (helix ? 0.6 : 0.3) * s * t)); }
  KIT.geo(FLORA.tube(pts, 0.42 * s, 0.08 * s, 10, 6), M.dead, null, { uvs: H / 3, uvs2: 1 });
  for (let b = 0; b < 3; b++) { const p0 = pts[2 + b], a = rs() * TAU, e = p0.clone().add(V3(Math.cos(a) * 2.2 * s, (1 + rs() * 1.5) * s, Math.sin(a) * 2.2 * s)); KIT.geo(FLORA.tube([p0, p0.clone().lerp(e, 0.5).add(V3(0, 0.3 * s, 0)), e], 0.14 * s, 0.03 * s, 5, 4), M.dead, null, { uvs: 1, uvs2: 1 }); }
  PHY.cyl(x, z, 0.42 * s, y - 1, y + H);
};
FLORA.log = function (M, x, y, z, s, rs) { const a = rs() * TAU, L = (6 + rs() * 7) * s, dx = Math.cos(a) * L / 2, dz = Math.sin(a) * L / 2;
  KIT.geo(FLORA.tube([V3(x - dx, y + 0.5 * s, z - dz), V3(x, y + 0.7 * s, z), V3(x + dx, y + 0.45 * s, z + dz)], 0.6 * s, 0.45 * s, 8, 8), M.bark, null, { uvs: L / 3, uvs2: 2 }); PHY.obox(x, z, 0.55 * s, L / 2, y, y + 1.1 * s, Math.atan2(dx, dz)); };
/* ---- rocks: TERRAIN.rock strata boulders with moss (jungle) or bare */
FLORA.rocks = function (L, W, y, ok, n, half) {
  const rs = FLORA.rs(W.seed * 7 + 1), mat = FLORA.moss(ASSET.mat(W.slope === 'hull_plate_rust' ? 'rock_dark' : W.slope, { color: W.slopeTint, rough: 0.95, env: 0.4 }).clone(), W.flora === 'jungle' ? 0x3a5a22 : W.flora === 'swamp' ? 0x3b4a1e : 0x8a8478, W.flora === 'jungle' || W.flora === 'swamp' ? 0.8 : 0.15);
  mat.userData.tscale = 5;
  for (let i = 0, k = 0; i < n * 4 && k < n; i++) { const x = (rs() - 0.5) * 2 * (half - 8), z = (rs() - 0.5) * 2 * (half - 8), r = 1.2 + Math.pow(rs(), 2) * 5; if (!ok(x, z, r + 2)) continue; k++; TERRAIN.rock(x, z, r, r * (0.6 + rs() * 0.8), (W.seed + i * 13) | 0, mat, { y: y(x, z), detail: r > 3 ? 4 : 3 }); }
};
/* ---- the biomes */
FLORA.biome = function (L, W, y, ok, half, o) {
  const M = FLORA.mats(W), rs = FLORA.rs(W.seed * 3 + 5), lite = typeof QUAL !== 'undefined' && QUAL.tier === 'low', K = lite ? 0.55 : 1, list = (n, r, fn) => { const out = []; for (let i = 0, k = 0; i < n * 5 && k < n; i++) { const x = (rs() - 0.5) * 2 * (half - 4), z = (rs() - 0.5) * 2 * (half - 4); if (!ok(x, z, r)) continue; const yy = y(x, z); const it = fn(x, yy, z); if (it) { out.push(it); k++; } } return out; };
  L.updates.push((dt, t) => { FLORA.U.t.value = t; });
  if (W.flora === 'jungle') {
    const big = Math.round((o.trees || 34) * K), crowns = [];
    list(big, 7, (x, yy, z) => { const s = 0.95 + rs() * 0.75; const t = FLORA.megatree(M, x, yy, z, s, rs); crowns.push(...t.crowns); return 1; });
    list(Math.round(70 * K), 2.5, (x, yy, z) => { FLORA.smalltree(M, x, yy, z, 0.8 + rs() * 0.8, rs); return 1; });
    FLORA.scatter(FLORA.cardGeo(), M.card, list(Math.round(260 * K), 1.5, (x, yy, z) => [x, yy - 0.3, z, rs() * TAU, 2.2 + rs() * 2.6]), half, { cast: !lite });
    list(Math.round(14 * K), 5, (x, yy, z) => { FLORA.log(M, x, yy, z, 0.8 + rs() * 0.6, rs); return 1; });
    FLORA.scatter(FLORA.fernGeo(lite ? 5 : 7, lite ? 5 : 7), M.fern, list(Math.round(620 * K), 1.0, (x, yy, z) => [x, yy - 0.05, z, rs() * TAU, 0.9 + rs() * 1.8]), half, { cast: false });
    FLORA.scatter(FLORA.broadleafGeo(6), M.leaf, list(Math.round(420 * K), 1.0, (x, yy, z) => [x, yy - 0.1, z, rs() * TAU, 0.9 + rs() * 1.7]), half, { cast: !lite });
    FLORA.scatter(FLORA.cardGeo(), M.card, list(Math.round(300 * K), 1.6, (x, yy, z) => [x, yy - 0.1, z, rs() * TAU, 1.2 + rs() * 2.2]), half, { cast: !lite });
    // leaf cards fill the canopy rims: a silhouette against the storm sky instead of smooth domes
    const rim = []; for (const c of crowns) for (let k = 0; k < (lite ? 6 : 12); k++) { const a = rs() * TAU, rr = 2 + rs() * 6.5; rim.push([c.x + Math.cos(a) * rr, c.y - 2.5 + rs() * 4, c.z + Math.sin(a) * rr, rs() * TAU, 3.2 + rs() * 3.5, (rs() - 0.5) * 1.0, (rs() - 0.5) * 1.0]); }
    FLORA.scatter(FLORA.cardGeo(), M.card, rim, half + 20, { cast: false });
    FLORA.spores(L, half, 0xd8f0a0, lite ? 300 : 700);
    // god rays through the canopy gaps
    for (let i = 0; i < (lite ? 3 : 7); i++) { const x = (rs() - 0.5) * half * 1.4, z = (rs() - 0.5) * half * 1.4; if (!ok(x, z, 2)) continue; const yy = y(x, z); KIT.shaft(L, V3(x, yy + 26, z), V3(0.25, -1, 0.15).normalize(), 3.2 + rs() * 3, 30, 0xd8f0b0, 0.09); }
  } else if (W.flora === 'swamp') {
    FLORA.scatter(FLORA.cardGeo(), M.reed, list(Math.round(420 * K), 0.6, (x, yy, z) => (yy < (W.lowY || 0) + 1.2 ? [x, yy - 0.1, z, rs() * TAU, 0.8 + rs() * 1.1] : null)), half, { sy: 1.4 });
    list(Math.round(16 * K), 3, (x, yy, z) => { FLORA.deadtree(M, x, yy, z, 0.7 + rs() * 0.5, rs, false); return 1; });
    FLORA.scatter(FLORA.fernGeo(5, 5, 0.17), M.fern, list(Math.round(160 * K), 1, (x, yy, z) => [x, yy - 0.05, z, rs() * TAU, 0.5 + rs()]), half);
  } else if (W.flora === 'petrified' || W.flora === 'twisted') {
    list(Math.round((W.flora === 'twisted' ? 26 : 34) * K), 3, (x, yy, z) => { FLORA.deadtree(M, x, yy, z, 0.8 + rs() * 0.9, rs, W.flora === 'twisted'); return 1; });
  }
};
FLORA.spores = function (L, half, col, n) {   // drifting motes in the light — near-field depth without hiding the view
  const P = new Float32Array(n * 3); for (let i = 0; i < n; i++) { P[i * 3] = (Math.random() - 0.5) * 60; P[i * 3 + 1] = Math.random() * 14; P[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const U = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uCol: { value: new THREE.Color(col) } };
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U, fog: false,
    vertexShader: 'uniform float uT; uniform vec3 uC; varying float vA; void main(){ vec3 p = position; p.x = mod(p.x + sin(uT * 0.3 + p.y) * 2.0 - uC.x + 30.0, 60.0) + uC.x - 30.0; p.z = mod(p.z + cos(uT * 0.25 + p.x) * 2.0 - uC.z + 30.0, 60.0) + uC.z - 30.0; p.y += uC.y - 3.0 + sin(uT * 0.5 + p.x * 0.3) * 0.6; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 26.0 / -mv.z; vA = (1.0 - smoothstep(3.0, 30.0, -mv.z)) * (0.5 + 0.5 * sin(uT * 2.0 + p.z)); }',
    fragmentShader: 'uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uCol * 1.6, (1.0 - smoothstep(0.1, 0.5, d)) * vA * 0.7); }' });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; LEVEL.add(pts); L.updates.push((dt, t) => { U.uT.value = t; U.uC.value.copy(R.camera.position); });
};

/* ---------------------------------------------------------------- RUINS (Sith stone, Mandalorian iron, glyph light) */
FLORA.stone = function (tex, tint, moss) { const k = 'st' + tex + tint + moss; if (FLORA.M[k]) return FLORA.M[k]; const m = FLORA.moss(ASSET.mat(tex || 'blocks_sand', { color: tint || 0x6a6a60, rough: 0.9, env: 0.45 }).clone(), moss === undefined ? 0x3a5a22 : moss, moss === null ? 0 : 0.6); m.userData.tscale = 2.5; FLORA.M[k] = m; return m; };
FLORA.glyphMat = (col, k) => KIT.emis(col || 0xff2a1a, k || 2.2);
FLORA.pillar = function (x, y, z, r, h, mat, o) {   // a fluted Sith pillar; broken tops lean, drums lie at the foot
  o = o || {}; const n = 12, prof = []; prof.push([r * 1.25, -0.5], [r * 1.25, 0.5], [r, 0.7]); for (let i = 0; i <= 8; i++) prof.push([r * (1 - i * 0.012), 0.7 + (h - 1.6) * i / 8]); prof.push([r * 1.18, h - 0.7], [r * 1.18, h]);
  const g = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), n); const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getZ(i), pp.getX(i)), f = 1 - 0.07 * Math.pow(Math.abs(Math.cos(a * n / 2)), 4); pp.setX(i, pp.getX(i) * f); pp.setZ(i, pp.getZ(i) * f); } g.computeVertexNormals();
  const tilt = o.broken ? (Math.random() - 0.5) * 0.12 : 0; KIT.geo(g, mat, new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, Math.random() * TAU, tilt * 0.6)), V3(1, o.broken ? 0.55 + Math.random() * 0.3 : 1, 1)), { uvs: 3, uvs2: h / 2 });
  if (o.glyph) KIT.ring(x, z, r * 1.02, r * 1.08, y + h * 0.42, y + h * 0.42 + 0.12, FLORA.glyphMat(o.glyph), { sides: 24, col: false });
  PHY.cyl(x, z, r * 1.15, y - 1, y + h);
};
FLORA.wall = function (x0, z0, x1, z1, y, h, th, mat, rs) {   // a run of uneven ashlar: blocks shifted, some fallen, the top ragged
  const L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.8));
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, cx = lerp(x0, x1, t), cz = lerp(z0, z1, t), hh = h * (0.45 + 0.55 * rs()); for (let k = 0; k < Math.ceil(hh / 1.1); k++) { const y0 = y + k * 1.1, y1 = Math.min(y + hh, y0 + 1.1), jx = (rs() - 0.5) * 0.12; KIT.obox(cx + jx, y0, cz, th / 2 + rs() * 0.06, y1 - 0.02, L / n / 2 - 0.03, yaw + (rs() - 0.5) * 0.04, mat, { col: false }); }
    if (rs() < 0.3) { const fx = cx + (rs() - 0.5) * 3, fz = cz + (rs() - 0.5) * 3; KIT.obox(fx, y - 0.2, fz, 0.6, y + 0.6, 0.45, rs() * 3, mat, { col: false }); } }
  PHY.obox((x0 + x1) / 2, (z0 + z1) / 2, th / 2 + 0.05, L / 2, y - 1, y + h * 0.75, yaw);
};
FLORA.arch = function (x, y, z, yaw, w, h, mat, glyph) {   // a trapezoid Sith arch: two battered piers and a heavy lintel with a glyph band
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (const sx of [-1, 1]) { const p = P(sx * (w / 2 + 0.7), 0); KIT.obox(p[0], y - 0.5, p[1], 0.75, y + h, 0.9, yaw + sx * 0.03, mat); }
  const p = P(0, 0); KIT.obox(p[0], y + h, p[1], w / 2 + 1.6, y + h + 1.4, 1.05, yaw, mat); KIT.obox(p[0], y + h + 1.4, p[1], w / 2 + 1.1, y + h + 1.9, 0.8, yaw, mat, { col: false });
  if (glyph) KIT.obox(p[0] + s * 1.06, y + h + 0.5, p[1] + c * 1.06, w / 2 + 0.8, y + h + 0.72, 0.02, yaw, FLORA.glyphMat(glyph, 1.8), { col: false });
};
FLORA.obelisk = function (x, y, z, sides, h, base, mat, glyph) {   // tapered n-sided black glass/stone prism, glyph strips on each face
  const g = new THREE.CylinderGeometry(base * 0.42, base, h, sides, 1); g.translate(0, h / 2, 0); KIT.geo(g, mat, new THREE.Matrix4().makeTranslation(x, y - 0.6, z), { uvs: 2, uvs2: h / 3 });
  const tip = new THREE.ConeGeometry(base * 0.42, base * 1.2, sides); tip.translate(0, h + base * 0.6, 0); KIT.geo(tip, mat, new THREE.Matrix4().makeTranslation(x, y - 0.6, z));
  if (glyph) for (let i = 0; i < sides; i++) { const a = (i + 0.5) / sides * TAU, rr = base * 0.72 * Math.cos(Math.PI / sides) + 0.03; for (let k = 0; k < 6; k++) { const yy = y + h * (0.2 + k * 0.11), w = 0.18; const gg = new THREE.PlaneGeometry(w, h * 0.06); const m = new THREE.Matrix4().compose(V3(x + Math.sin(a) * (rr - k * 0.04 * base), yy, z + Math.cos(a) * (rr - k * 0.04 * base)), new THREE.Quaternion().setFromAxisAngle(YUP, a), V3(1, 1, 1)); KIT.geo(gg, FLORA.glyphMat(glyph, 2.4), m); } }
  PHY.cyl(x, z, base * 0.9, y - 1, y + h);
};
FLORA.statue = function (x, y, z, yaw, s, mat, o) {   // a hooded Sith: robe lathe, hood, folded hands, a broken blade held point-down; o.fallen lays it over
  o = o || {}; const prof = [[0.0, 0], [0.62, 0], [0.66, 0.15], [0.5, 1.0], [0.42, 1.55], [0.46, 1.95], [0.34, 2.15], [0.2, 2.3], [0.0, 2.32]];
  const robe = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), 14); robe.scale(1, 1, 0.8);
  const hood = new THREE.SphereGeometry(0.3, 12, 8, 0, TAU, 0, Math.PI * 0.62); hood.scale(1, 1.15, 1.1); hood.translate(0, 2.5, -0.02); const face = new THREE.SphereGeometry(0.2, 10, 6); face.scale(1, 1.1, 0.6); face.translate(0, 2.42, 0.1);
  const hands = new THREE.BoxGeometry(0.34, 0.22, 0.2); hands.translate(0, 1.55, 0.36); const blade = new THREE.BoxGeometry(0.05, 1.2, 0.02); blade.translate(0, 0.95, 0.46); const guard = new THREE.BoxGeometry(0.28, 0.05, 0.06); guard.translate(0, 1.5, 0.46);
  const ped = new THREE.BoxGeometry(1.6, 0.6, 1.4); ped.translate(0, -0.3, 0);
  const Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(o.fallen ? -HALF * 0.96 : 0, yaw, o.fallen ? 0.2 : 0)), M = new THREE.Matrix4().compose(V3(x, y + (o.fallen ? 0.5 : 0.6) * s, z), Q, V3(s, s, s));
  for (const g of [robe, hood, hands, blade, guard]) KIT.geo(g, mat, M, { worldUV: true });
  KIT.geo(face, KIT.emis(0x000000, 1), M);
  if (!o.fallen) { KIT.geo(ped, mat, new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(YUP, yaw), V3(s, s, s)), { worldUV: true }); if (o.eyes) for (const sx of [-1, 1]) KIT.geo(new THREE.SphereGeometry(0.022, 6, 4), FLORA.glyphMat(o.eyes, 4), new THREE.Matrix4().compose(V3(x, y + 0.6 * s, z), Q, V3(s, s, s)).multiply(new THREE.Matrix4().makeTranslation(sx * 0.07, 2.47, 0.21))); }
  PHY.cyl(x, z, 0.8 * s, y - 1, y + 3 * s);
};
FLORA.tombDoor = function (x, y, z, yaw, w, h, mat, glyph) {   // a battered trapezoid portal in a slab face, a black recess, a glyph lintel; returns the threshold point
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (const sx of [-1, 1]) { const p = P(sx * (w / 2 + 1.2), 0); KIT.obox(p[0], y - 1, p[1], 1.2, y + h + 1.5, 1.4, yaw + sx * 0.06, mat); }
  { const p = P(0, 0); KIT.obox(p[0], y + h, p[1], w / 2 + 2.4, y + h + 2.2, 1.5, yaw, mat); const q = P(0, -1.6); KIT.obox(q[0], y - 0.5, q[1], w / 2 + 0.2, y + h, 0.25, yaw, KIT.emis(0x040203, 1), { col: false });
    KIT.obox(p[0] + s * 1.52, y + h + 0.8, p[1] + c * 1.52, w / 2 + 1.2, y + h + 1.05, 0.02, yaw, FLORA.glyphMat(glyph || 0xff2a1a, 2.2), { col: false });
    for (let k = 0; k < 4; k++) { const st = P(0, 1.6 + k * 0.6); KIT.obox(st[0], y - 1, st[1], w / 2 + 0.8 - k * 0.1, y + 0.36 - k * 0.12, 0.3, yaw, mat); } }
  return V3(...P(0, 3.2)).setY(y);
};
FLORA.wardStone = function (x, y, z, mat, col) {   // a standing stone with a ring of half-understood glyphs; returns the glyph material for flicker
  const g = new THREE.CylinderGeometry(0.5, 0.75, 2.6, 6, 1); g.translate(0, 1.3, 0); const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) pp.setX(i, pp.getX(i) * (0.7 + 0.3 * Math.cos(pp.getZ(i) * 3))); g.computeVertexNormals();
  KIT.geo(g, mat, new THREE.Matrix4().makeTranslation(x, y - 0.3, z), { worldUV: true });
  const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(col || 0xff3a20).multiplyScalar(2.4), toneMapped: false }); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.025, 6, 28), gm); ring.rotation.x = HALF; ring.position.set(x, y + 1.6, z); LEVEL.add(ring);
  PHY.cyl(x, z, 0.7, y - 1, y + 2.4); return { ring, mat: gm };
};
