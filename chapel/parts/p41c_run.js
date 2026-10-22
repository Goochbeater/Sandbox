/* THE DUNE SEA — the Bloodfin run. 3.3 km of Tatooine at speed, north along a winding line:
     0– 900  the Dune Sea: transverse dune crests with steep lee faces that launch the bike, slalom spires
   900–1500  the badlands: hardpan between stepped mesas, a forest of hoodoos, natural arches over the line
  1500–2450  the gorge: a canyon cut into the plateau, terraced drop-offs, a slot, stone bridges overhead
  2450–3050  the salt flats: flat-out speed past a krayt dragon's skeleton and a dead sandcrawler
  3050–3300  the climb to the Queen's scouting party, camped under the Jundland Wastes
   The ground is an analytic height function (PHY.hf) meshed as a curvilinear grid that follows the line. */
const RUN = { Z1: 3300, CPZ: [0, 900, 1500, 2450, 3060], CHASM: 2150 };
RUN.cx = (z) => 60 * Math.sin(z * 0.0023) + 34 * Math.sin(z * 0.0061) + 12 * Math.sin(z * 0.017);
RUN.line0 = (z) => 11 * Math.sin(z * 0.021 + 0.7);
RUN.line = (z) => { const l = RUN.line0(z); if (z > 1480 && z < 2470) { const w = Math.max(1.5, RUN.canW(z) - 6); return clamp(l, -w, w); } return l; };   // the racing line (kept clear), held inside the gorge
RUN.canW = (z) => 15 + 6 * Math.sin(z * 0.013) + 4 * Math.sin(z * 0.031 + 2) - 5.5 * Math.exp(-Math.pow((z - 2060) / 55, 2));
RUN.canFloor = (z) => { const s = clamp((z - 1560) / 840, 0, 1), n = 6, k = s * n, i = Math.floor(k), fr = k - i; return -24 * (Math.min(n, i + smooth(0.955, 1.0, fr)) / n); };
/* where the gorge wall actually rises to 'up' metres above the floor, scanning out from the centre (walls meander ±11 m) */
RUN.wallD = function (z, side, up) { const fl = RUN.canFloor(z), c = RUN.cx(z); for (let d = 0; d < 60; d += 0.25) if (RUN.h(c + side * d, z) > fl + up) return d; return 60; };
RUN.dune = function (x, z, d, ad) {
  // transverse crests across the line (the jumps), broken into humps so they read as dunes rather than a washboard
  const u = (z + 22 * Math.sin(x * 0.017) + 9 * Math.sin(x * 0.043 + z * 0.002)) / 92, f = u - Math.floor(u), k = Math.floor(u);
  const prof = f < 0.8 ? Math.pow(f / 0.8, 1.7) : 1 - smooth(0.8, 1, f);           // long windward ramp, steep lee drop
  const hump = 0.5 + 0.5 * Math.sin(x * 0.05 + k * 2.1);
  const A = (7 + 5 * Math.sin(k * 1.7 + 0.5)) * smooth(90, 200, z) * (0.35 + 0.65 * hump);
  // seif dunes: long knife-crested ridges running beside the line — one flank in sun, one in shade
  const g = smooth(80, 220, z), side = Math.sign(d) || 1, cr = 30 + 9 * Math.sin(z * 0.0065 + side * 1.3) + 5 * Math.sin(z * 0.019 + side);
  const sd = ad - cr, H = (18 + 9 * Math.sin(z * 0.0042 + side * 2) + 5 * fbm2(x * 0.02, z * 0.02, 2)) * g;
  const seif = H * Math.pow(Math.max(0, 1 - Math.abs(sd) / (sd < 0 ? 22 : 30)), 1.5);
  const far = 34 * smooth(80, 190, ad) * (0.55 + 0.45 * fbm2(x * 0.008, z * 0.008, 2)) * g + 10 * smooth(120, 240, ad) * Math.sin(x * 0.02 + z * 0.012);
  return A * prof * (1 - 0.6 * smooth(18, 40, ad)) + Math.max(seif, far * 0.9) + far * 0.1 + 1.1 * (fbm2(x * 0.05, z * 0.05, 2) - 0.5);
};
RUN.bad = function (x, z, d, ad) {
  const base = 1.4 * (fbm2(x * 0.02, z * 0.02, 3) - 0.5) + 0.5 * Math.sin(z * 0.05 + x * 0.02);
  const jag = (fbm2(x * 0.06 + 7, z * 0.06, 3) - 0.5) * 22, t = smooth(62, 74, ad + jag * 0.5);
  const top = 30 + 12 * fbm2(x * 0.012, z * 0.012, 3), tt = Math.floor(t * 3) / 3 + smooth(0.6, 1, (t * 3) % 1) / 3;
  return base + top * lerp(t, tt, 0.65);
};
RUN.canyon = function (x, z, d, ad) {
  const fl = RUN.canFloor(z), w = RUN.canW(z);
  // meandering walls: buttresses and alcoves, stepped strata ledges, a ragged rim
  const jag = (fbm2(x * 0.035, z * 0.03, 3) - 0.5) * 16 + (fbm2(x * 0.11, z * 0.09, 3) - 0.5) * 6 + 2.2 * Math.sin(z * 0.16 + Math.sign(d) * 2);   // (no finer noise: it aliases into vertical combs between 2 m rows)
  const t = smooth(w, w + 7, ad + jag), n = 7, tt = Math.floor(t * n) / n + smooth(0.62, 1, (t * n) % 1) / n;
  const rim = 38 + 16 * fbm2(x * 0.012, z * 0.012, 3) + 5 * (fbm2(x * 0.06, z * 0.06, 2) - 0.5);
  // the chasm: a rock lip ramps up 3 m, then the floor falls away 55 m for 24 m (clear it at speed or fall in)
  const cz = RUN.CHASM, lip = 3.2 * smooth(cz - 30, cz - 1, z) * (1 - smooth(cz - 1, cz, z)), gap = smooth(cz - 0.5, cz + 1, z) * (1 - smooth(cz + 23, cz + 24.5, z));
  return fl + (lip - 55 * gap) * (1 - t) + 0.7 * (fbm2(x * 0.1, z * 0.1, 2) - 0.5) * (1 - t) + (rim - fl) * lerp(t, tt, 0.72);
};
RUN.flat = (x, z, d, ad) => -24 + 0.3 * (fbm2(x * 0.03, z * 0.03, 2) - 0.5) + 16 * smooth(160, 260, ad) * fbm2(x * 0.01, z * 0.01, 2);
RUN.mesa = function (x, z, d, ad) {
  const ramp = lerp(-24, 4, smooth(3040, 3150, z)), n = fbm2(x * 0.05, z * 0.05, 2) - 0.5;
  const wall = 42 * smooth(3262, 3292, z + n * 20) * smooth(9, 17, ad + n * 6), sides = 30 * smooth(58, 82, ad + n * 16);
  return ramp + 0.5 * (fbm2(x * 0.08, z * 0.08, 2) - 0.5) + Math.max(wall, sides);
};
RUN.h = function (x, z) {
  const d = x - RUN.cx(z), ad = Math.abs(d);
  const wD = 1 - smooth(860, 960, z), wB = smooth(860, 960, z) * (1 - smooth(1460, 1560, z)), wC = smooth(1460, 1560, z) * (1 - smooth(2420, 2520, z)), wF = smooth(2420, 2520, z) * (1 - smooth(2960, 3060, z)), wM = smooth(2960, 3060, z);
  let h = 0;
  if (wD > 0) h += wD * RUN.dune(x, z, d, ad);
  if (wB > 0) h += wB * RUN.bad(x, z, d, ad);
  if (wC > 0) h += wC * RUN.canyon(x, z, d, ad);
  if (wF > 0) h += wF * RUN.flat(x, z, d, ad);
  if (wM > 0) h += wM * RUN.mesa(x, z, d, ad);
  return lerp(0, h, smooth(26, 60, Math.hypot(x, z + 6)));      // the Scimitar's landing plateau
};
/* terrain: chunks of a grid whose columns follow the line (dense near it, sparse far out); normals from the grid itself */
RUN.buildTerrain = async function (mat, progress) {
  const D = []; for (let d = -620; d <= 620;) { D.push(d); const ad = Math.abs(d); d += ad < 48 ? 1.6 : ad < 100 ? 2.2 : ad < 170 ? 4.5 : ad < 280 ? 9 : 24; }   // out to 620 m so the far mesas stand on ground   // fine where walls stand (coarse columns comb a cliff edge)
  const nx = D.length, CH = 150, dz = 2, Z0 = -150, Z1 = RUN.Z1 + 170;
  for (let z0 = Z0; z0 < Z1; z0 += CH) {
    const nz = Math.round(CH / dz), M = 4, rows = nz + 1 + 2 * M;          // margin rows each side: seamless normals after the z-blur
    const H = new Float32Array(rows * nx * 3);
    for (let j = 0; j < rows; j++) { const z = z0 + (j - M) * dz, c = RUN.cx(z); for (let i = 0; i < nx; i++) { const x = c + D[i], k = (j * nx + i) * 3; H[k] = x; H[k + 1] = RUN.h(x, z); H[k + 2] = z; } }
    const at = (j, i, q) => H[(j * nx + i) * 3 + q];
    // grid normals, then blurred along the line: steep walls otherwise band row-by-row (2 m stripes on every cliff)
    const NN = new Float32Array(rows * nx * 3);
    for (let j = 1; j < rows - 1; j++) for (let i = 0; i < nx; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(nx - 1, i + 1), o = (j * nx + i) * 3;
      const ax = at(j, i1, 0) - at(j, i0, 0), ay = at(j, i1, 1) - at(j, i0, 1), az = at(j, i1, 2) - at(j, i0, 2);
      const bx = at(j + 1, i, 0) - at(j - 1, i, 0), by = at(j + 1, i, 1) - at(j - 1, i, 1), bz = at(j + 1, i, 2) - at(j - 1, i, 2);
      let cx = by * az - bz * ay, cy = bz * ax - bx * az, cz = bx * ay - by * ax; if (cy < 0) { cx = -cx; cy = -cy; cz = -cz; } const L = Math.hypot(cx, cy, cz) || 1;
      NN[o] = cx / L; NN[o + 1] = cy / L; NN[o + 2] = cz / L;
    }
    for (let pass = 0; pass < 2; pass++) { const T = NN.slice(); for (let j = 2 + pass; j < rows - 2 - pass; j++) for (let i = 0; i < nx; i++) { const o = (j * nx + i) * 3, a = ((j - 1) * nx + i) * 3, b = ((j + 1) * nx + i) * 3;
      for (let q = 0; q < 3; q++) NN[o + q] = (T[a + q] + 2 * T[o + q] + T[b + q]) * 0.25; } }
    const P = new Float32Array((nz + 1) * nx * 3), N = new Float32Array((nz + 1) * nx * 3), UV = new Float32Array((nz + 1) * nx * 2), RK = new Float32Array((nz + 1) * nx), I = [];
    for (let j = M; j <= nz + M; j++) for (let i = 0; i < nx; i++) {
      const o = ((j - M) * nx + i), src = (j * nx + i) * 3;
      P[o * 3] = H[src]; P[o * 3 + 1] = H[src + 1]; P[o * 3 + 2] = H[src + 2]; UV[o * 2] = P[o * 3] / 5; UV[o * 2 + 1] = P[o * 3 + 2] / 5;
      const L = Math.hypot(NN[src], NN[src + 1], NN[src + 2]) || 1; N[o * 3] = NN[src] / L; N[o * 3 + 1] = NN[src + 1] / L; N[o * 3 + 2] = NN[src + 2] / L;
      RK[o] = smooth(860, 960, P[o * 3 + 2]);   // dune country is sand on every slope
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i + 1 < nx; i++) { const a = j * nx + i, b = a + 1, c = a + nx + 1, e = a + nx; I.push(a, e, b, b, e, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setAttribute('aRk', new THREE.BufferAttribute(RK, 1));
    g.setIndex(I); g.computeBoundingSphere();
    const me = new THREE.Mesh(g, mat); me.receiveShadow = true; me.castShadow = true; LEVEL.add(me);
    if (progress) progress((z0 - Z0) / (Z1 - Z0));
    await MG.yield();
  }
  PHY.hf = RUN.h;
};
/* a natural stone arch between two feet (world xz), apex height over the ground */
RUN.arch = function (ax, az, bx, bz, apex, thick, seed, mat) {
  const ya = RUN.h(ax, az), yb = RUN.h(bx, bz), rs = mulberry(seed), pts = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, x = lerp(ax, bx, u), z = lerp(az, bz, u), y = lerp(ya, yb, u) - 2 + Math.sin(u * PI) * (apex + 2); pts.push(new THREE.Vector3(x, y, z)); }
  const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, 48, thick, 12, false), p = g.attributes.position, nrm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = (fbm3(x * 0.3 + seed, y * 0.3, z * 0.3, 3) - 0.5) * thick * 0.9 + Math.sin(y * 2.2 + seed) * thick * 0.08;
    p.setXYZ(i, x + nrm.getX(i) * k, y + nrm.getY(i) * k * 0.6, z + nrm.getZ(i) * k); }
  g.computeVertexNormals(); KIT.geo(g, mat, null, { worldUV: true });
  TERRAIN.rock(ax, az, thick * 1.6, thick * 3, seed + 1, mat, { detail: 3 }); TERRAIN.rock(bx, bz, thick * 1.6, thick * 3, seed + 2, mat, { detail: 3 });
  void rs;
};
/* the bleached skeleton of a krayt dragon: spine along the line's edge, ribs arching over it (ride through the ribcage) */
RUN.krayt = function (z0) {
  const rk = TEX.sets.rock, bone = new THREE.MeshStandardMaterial({ map: TEX.sets.sand.map, normalMap: rk.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), color: 0xe4dccb, roughness: 0.84, metalness: 0, envMapIntensity: 0.45 });
  // weathered bone: push vertices along their normals with a few octaves of lumps (a clean primitive reads as plastic)
  const lumpy = (geo, amp, f) => { const P = geo.attributes.position, N = (geo.computeVertexNormals(), geo.attributes.normal); for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const n = Math.sin(x * f + y * 1.7) * Math.cos(z * f * 1.3 - x) + 0.5 * Math.sin(x * f * 2.9 - z * f * 2.1 + y * 3.1) + 0.25 * Math.sin(y * f * 5.3 + z * f * 4.7); P.setXYZ(i, x + N.getX(i) * n * amp, y + N.getY(i) * n * amp, z + N.getZ(i) * n * amp); }
    geo.computeVertexNormals(); return geo; };
  const g = new THREE.Group(), side = -1, N = 36;
  const P = (s) => { const z = z0 + s * 2.4, c = RUN.cx(z); return new THREE.Vector3(c + side * (9 + 2.5 * Math.sin(s * 0.18)), RUN.h(c + side * 9, z) + 1.1 + 0.6 * Math.sin(s * 0.3), z); };
  const vg = new THREE.DodecahedronGeometry(1, 0);
  for (let s = 0; s < N; s++) { const p = P(s), sc = 0.9 * (1 - Math.abs(s - 14) / 30); const m = new THREE.Mesh(vg, bone); m.position.copy(p); m.scale.set(sc * 1.3, sc * 1.0, sc * 0.8); m.rotation.set(s * 0.4, s * 0.7, 0); m.castShadow = true; g.add(m);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.22 * sc, 1.6 * sc, 6), bone); sp.position.copy(p).add(V3(0, 1.2 * sc, 0)); sp.castShadow = true; g.add(sp); }
  for (let s = 5; s < 25; s += 1.5) {
    const p = P(s), c = RUN.cx(p.z), far = c - side * (9 + 1.5 * Math.sin(s)), hgt = 7.5 * (1 - Math.abs(s - 14) / 16), yF = RUN.h(far, p.z);
    const curve = new THREE.CatmullRomCurve3([p.clone(), V3(lerp(p.x, far, 0.25), p.y + hgt * 0.95, p.z + 0.6), V3(lerp(p.x, far, 0.62), p.y + hgt, p.z + 1.1), V3(far, yF + 0.2, p.z + 1.6)]);
    const rib = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.24, 7, false), bone); rib.castShadow = true; g.add(rib);
    PHY.cyl(far, p.z + 1.6, 0.45, yF - 2, yF + 2.5);
  }
  // the skull at the head of the spine
  const hp = P(-1.5), skull = new THREE.Group(); skull.position.copy(hp); skull.position.y -= 0.7;   // half sunk in the sand
  const dark = new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 1 }), add = (geo, m, x, y, z, sx, sy, sz, rx, ry, rz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx || 0, ry || 0, rz || 0); skull.add(o); return o; };
  add(lumpy(new THREE.SphereGeometry(1.6, 28, 20), 0.09, 2.2), bone, 0, 0, 0, 1.3, 0.85, 2.0);                       // cranium
  add(lumpy(new THREE.ConeGeometry(1.05, 3.2, 18, 4), 0.07, 2.8), bone, 0, -0.15, -3.1, 1.25, 0.62, 1, -HALF);          // snout
  add(lumpy(new THREE.SphereGeometry(1.2, 20, 12), 0.08, 2.6), bone, 0, -1.0, -2.5, 1.05, 0.42, 2.5, 0.42);           // dropped jaw
  for (const sd of [1, -1]) {
    add(lumpy(new THREE.SphereGeometry(0.62, 14, 10), 0.05, 4), bone, sd * 1.05, 0.72, -0.7, 1.25, 0.5, 0.95);            // brow ridge
    add(new THREE.SphereGeometry(0.44, 12, 8), dark, sd * 1.22, 0.3, -1.05, 1, 0.85, 1.1);                                 // eye socket
    add(new THREE.SphereGeometry(0.18, 8, 6), dark, sd * 0.32, 0.12, -4.45, 1, 0.7, 1.3);                                  // nostril
    for (let i = 0; i < 7; i++) add(new THREE.ConeGeometry(0.075, 0.5 - i * 0.03, 6), bone, sd * (0.62 - i * 0.05), -0.52, -1.9 - i * 0.36, 1, 1, 1, Math.PI + 0.15, 0, sd * 0.12);   // teeth
    const hc = new THREE.CatmullRomCurve3([V3(sd * 1.2, 0.9, 0.6), V3(sd * 1.9, 1.9, 1.6), V3(sd * 2.1, 2.9, 3.0), V3(sd * 1.7, 3.3, 4.2)]);
    const horn = new THREE.TubeGeometry(hc, 20, 0.34, 8, false), HP = horn.attributes.position;   // taper the horn to a point
    for (let i = 0; i < HP.count; i++) { const u = Math.floor(i / 9) / 20, c = hc.getPoint(Math.min(1, u)), k = 1 - u * 0.88; HP.setXYZ(i, c.x + (HP.getX(i) - c.x) * k, c.y + (HP.getY(i) - c.y) * k, c.z + (HP.getZ(i) - c.z) * k); }
    horn.computeVertexNormals(); add(horn, bone, 0, 0, 0, 1, 1, 1);
  }
  skull.rotation.set(0.12, 0.25, -0.22); skull.traverse((o) => { if (o.isMesh) o.castShadow = true; }); g.add(skull); PHY.cyl(hp.x, hp.z, 2.2, hp.y - 3, hp.y + 2);
  LEVEL.add(g);
};
/* a dead sandcrawler, half sunk in the salt */
RUN.crawler = function (x, z, yaw) {
  const rust = new THREE.MeshStandardMaterial({ color: 0x5a3a26, roughness: 0.75, metalness: 0.45, envMapIntensity: 0.6 }), dk = new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 0.8, metalness: 0.3 });
  const g = new THREE.Group(), y = RUN.h(x, z) - 3;
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(9, 14, 16, 4, 1), rust); hull.rotation.y = PI / 4; hull.scale.set(1.9, 1, 0.9); hull.position.y = 8; g.add(hull);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 10), rust); cab.position.set(0, 18, -8); cab.rotation.x = -0.3; g.add(cab);
  for (const s of [1, -1]) { const tr = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 40), dk); tr.position.set(s * 14, 1, 0); g.add(tr); }
  g.position.set(x, y, z); g.rotation.set(0.08, yaw, 0.12); g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); LEVEL.add(g);
  PHY.obox(x, z, 18, 22, y, y + 22, yaw);
};
/* obstacles and set pieces along the whole run */
RUN.dress = function () {
  const rock = TERRAIN.rockMat(), rs = MG.rs('run');
  const at = (z, d) => [RUN.cx(z) + d, z], clearOfLine = (z, d, gap) => Math.abs(d - RUN.line(z)) > gap;
  // Dune Sea: slalom spires near the line, big formations out on the dunes
  for (let z = 140; z < 880; z += 26 + rs() * 22) { let d = (rs() - 0.5) * 28; if (!clearOfLine(z, d, 5)) d += d > RUN.line(z) ? 6 : -6; const [x] = at(z, d); TERRAIN.rock(x, z, 1.3 + rs() * 1.5, 4 + rs() * 7, Math.floor(z * 7), rock, { detail: 3 }); }
  for (let i = 0; i < 26; i++) { const z = 120 + rs() * 780, d = (rs() < 0.5 ? -1 : 1) * (28 + rs() * 110), [x] = at(z, d); TERRAIN.rock(x, z, 4 + rs() * 9, 6 + rs() * 16, i * 53 + 11, rock, { detail: 4 }); }
  // badlands: a hoodoo forest with a weaving clear line, three arches over it
  for (let z = 960; z < 1470; z += 7 + rs() * 7) for (let k = 0; k < 2; k++) {
    const d = (rs() - 0.5) * 96; if (!clearOfLine(z, d, 6.5)) continue; const [x] = at(z, d), tall = rs();
    TERRAIN.rock(x, z, 1.6 + rs() * 2.4, 6 + tall * tall * 22, Math.floor(z * 13 + k), rock, { detail: 3, stretch: 0.8 + rs() * 0.4 });
  }
  for (const [z, span, apex] of [[1080, 11, 15], [1265, 13, 19], [1420, 10, 13]]) { const l = RUN.line(z), [xa] = at(z, l - span), [xb] = at(z + 3, l + span); RUN.arch(xa, z, xb, z + 3, apex, 2.1, Math.floor(z), rock); }
  // the gorge: boulders on the floor (off the line), two stone bridges wall to wall
  for (let z = 1580; z < 2420; z += 16 + rs() * 16) { if (Math.abs(z - RUN.CHASM) < 70) continue; const w = RUN.canW(z) - 3; let d = (rs() - 0.5) * 2 * w; if (!clearOfLine(z, d, 5)) continue; const [x] = at(z, d); TERRAIN.rock(x, z, 1.2 + rs() * 2.2, 2 + rs() * 4, Math.floor(z * 3), rock, { detail: 3 }); }
  // rockfall at the foot of the gorge walls
  for (let z = 1560; z < 2420; z += 9 + rs() * 12) for (const sd of [1, -1]) { if (rs() < 0.35 || Math.abs(z - RUN.CHASM) < 40) continue; const r = 1.2 + rs() * 2.6, d = sd * Math.max(2, RUN.wallD(z, sd, 0.6) - r * 0.4); const [x] = at(z, d); TERRAIN.rock(x, z, r, 2 + rs() * 5, Math.floor(z * 5 + sd), rock, { detail: 3, y: RUN.canFloor(z) }); }
  for (const [z, apex] of [[1830, 24], [2230, 30]]) { const w = RUN.canW(z) + 5, [xa] = at(z, -w), [xb] = at(z, w); RUN.arch(xa, z, xb, z, apex, 2.8, Math.floor(z) + 5, rock); }
  // salt flats: the krayt, a dead sandcrawler, scattered stones; far mesas all along the horizon
  RUN.krayt(2640);
  RUN.crawler(RUN.cx(2880) + 70, 2880, 0.6);
  for (let i = 0; i < 20; i++) { const z = 2480 + rs() * 560, d = (rs() - 0.5) * 120; if (!clearOfLine(z, d, 8)) continue; const [x] = at(z, d); TERRAIN.rock(x, z, 1 + rs() * 2.5, 1.5 + rs() * 3, i * 29 + 3, rock, { detail: 3 }); }
  for (let z = -100; z < RUN.Z1; z += 120 + rs() * 80) for (const s of [1, -1]) { const d = s * (290 + rs() * 140), [x] = at(z, d); TERRAIN.rock(x, z, 20 + rs() * 28, 30 + rs() * 50, Math.floor(z + s * 7), rock, { col: false, detail: 3, y: RUN.h(x, z) }); }
};
/* ground scatter: pebbles and dry scrub carpeting the band either side of the line — near detail streaming
   past is what the eye reads as speed. Instanced in 250 m chunks so each culls on its own; no colliders
   (pebbles on the line stay under the repulsor clearance). */
RUN.scatter = function (o) {
  o = o || {}; const rs = MG.rs(o.seed || 'scatter'), s = TEX.sets.rock, CH = 250, cx = o.cx || RUN.cx, hf = o.h || RUN.h, line = o.line || RUN.line, Z0 = o.z0 !== undefined ? o.z0 : -40, Z1 = o.z1 || RUN.Z1;
  const peb = new THREE.IcosahedronGeometry(0.5, o.detail || 0); { const P = peb.attributes.position; for (let i = 0; i < P.count; i++) { const k = 0.78 + 0.44 * hash3(P.getX(i) * 97, P.getY(i) * 131, P.getZ(i) * 173); P.setXYZ(i, P.getX(i) * k, P.getY(i) * k * 0.62, P.getZ(i) * k); } peb.computeVertexNormals(); }
  const pm = new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, color: o.pebCol || 0xd6c8b0, roughness: 0.92, envMapIntensity: 0.5 });
  // scrub: a fan of thin blades (double-sided), dry olive-tan fading to bleached tips
  const bl = [], bc = [];
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rs() * 0.5, lean = 0.35 + rs() * 0.5, h = 0.55 + rs() * 0.5, w = 0.035; const cx = Math.cos(a), sz = Math.sin(a), tx = cx * lean * h, tz = sz * lean * h;
    bl.push(-sz * w, 0, cx * w, sz * w, 0, -cx * w, tx, h, tz); bc.push(0.07, 0.055, 0.03, 0.07, 0.055, 0.03, 0.3, 0.24, 0.14); }
  const scrub = new THREE.BufferGeometry(); scrub.setAttribute('position', new THREE.Float32BufferAttribute(bl, 3)); scrub.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3)); scrub.computeVertexNormals();
  const sm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, envMapIntensity: 0.3 });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Pv = new THREE.Vector3(), Sv = new THREE.Vector3();
  let nP = 0, nS = 0;
  for (let z0 = Z0; z0 < Z1; z0 += CH) {
    const pebs = [], scr = [];
    for (let z = z0; z < Math.min(Z1, z0 + CH); z += 0.9) {
      const gorge = o.band ? !!o.gorge : z > 1500 && z < 2450, band = o.band ? o.band(z) : gorge ? Math.max(4, RUN.canW(z) - 1) : 42, nz = o.nz || (gorge ? 3 : 4);
      if (!o.band && Math.abs(z - RUN.CHASM) < 24) continue;
      for (let k = 0; k < nz; k++) {
        const d = (rs() - 0.5) * 2 * band, x = cx(z) + d, zz = z + rs() * 0.9, onLine = Math.abs(d - line(zz)) < 7;
        const y = hf(x, zz); if (y === undefined || isNaN(y)) continue;
        if (rs() < (o.scrub !== undefined ? o.scrub : gorge ? 0 : 0.22)) { if (onLine) continue; const sc = 0.5 + rs() * 0.9; Q.setFromEuler(E.set((rs() - 0.5) * 0.25, rs() * TAU, (rs() - 0.5) * 0.25)); M.compose(Pv.set(x, y - 0.03, zz), Q, Sv.set(sc, sc * (0.7 + rs() * 0.6), sc)); scr.push(M.clone()); continue; }
        let r = 0.06 + Math.pow(rs(), 4) * (onLine ? 0.12 : 0.42); r *= o.pebScale || (gorge ? 1.3 : 1);
        Q.setFromEuler(E.set(rs() * 3, rs() * TAU, rs() * 3)); M.compose(Pv.set(x, y - r * 0.35, zz), Q, Sv.set(r * 2, r * 2, r * 2)); pebs.push(M.clone());
      }
    }
    for (const [list, geo, mat] of [[pebs, peb, pm], [scr, scrub, sm]]) {
      if (!list.length) continue; const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; LEVEL.add(im);
      if (geo === peb) nP += list.length; else nS += list.length;
    }
  }
  RUN.nScatter = [nP, nS];
};
/* wind streaks: sand motes hanging in the air, drawn as motion-blur lines along the bike's velocity — at
   speed they rip past the lens and give the run its pace; they fade out entirely at a crawl */
RUN.streaks = function (L) {
  const N = 90, pos = new Float32Array(N * 4 * 3), al = new Float32Array(N * 4), idx = [];
  for (let i = 0; i < N; i++) { const o = i * 4; idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); for (let k = 0; k < 4; k++) al[o + k] = k < 2 ? 1 : 0; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(al, 1)); g.setIndex(idx);
  const U = { uA: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
    vertexShader: 'attribute float aT; varying float vT; varying float vD; void main(){ vT = aT; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uA; varying float vT; varying float vD; void main(){ float a = uA * pow(max(sin(3.14159 * vT), 0.0), 1.5) * smoothstep(2.0, 6.0, vD) * (1.0 - smoothstep(30.0, 48.0, vD)); gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * a, 1.0); }' });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 5; LEVEL.add(mesh);
  const P = [], rs = Math.random;
  const spawn = (q, c, f, far) => { const d = far ? 8 + rs() * 40 : 34 + rs() * 12, sd = (rs() - 0.5) * 26; q.x = c.x + f.x * d + f.z * sd; q.z = c.z + f.z * d - f.x * sd; const gy = RUN.h(q.x, q.z); q.y = (isNaN(gy) ? c.y - 2 : gy) + 0.4 + Math.pow(rs(), 1.6) * 7; q.w = 0.013 + rs() * 0.024; };
  for (let i = 0; i < N; i++) P.push({ x: 0, y: -999, z: 0, w: 0.02 });
  const cp = new THREE.Vector3(), side = new THREE.Vector3(), dir = new THREE.Vector3(), tv = new THREE.Vector3();
  L.updates.push(() => {
    const on = RIDE.on && RIDE.bike, sp = on ? Math.hypot(RIDE.vx, RIDE.vz) : 0; U.uA.value = damp(U.uA.value, clamp((sp - 20) / 40, 0, 1) * 0.62, 4, 1 / 60);
    mesh.visible = U.uA.value > 0.01; if (!mesh.visible) { for (const q of P) q.y = -999; return; }
    const c = R.camera.position, f = tv.set(RIDE.vx, 0, RIDE.vz).normalize(), len = 0.05 * sp + 0.6;
    for (let i = 0; i < N; i++) {
      const q = P[i], rx = q.x - c.x, rz = q.z - c.z, ahead = rx * f.x + rz * f.z;
      if (q.y < -900 || ahead < -2 || ahead > 60 || Math.abs(rx * f.z - rz * f.x) > 18) spawn(q, c, f, q.y < -900);
      dir.set(-RIDE.vx, -(RIDE.vy || 0), -RIDE.vz).normalize().multiplyScalar(len);
      cp.set(q.x - c.x, q.y - c.y, q.z - c.z); side.crossVectors(dir, cp).normalize().multiplyScalar(q.w * Math.max(1, cp.length() * 0.05));
      const o = i * 12;
      pos[o] = q.x - side.x; pos[o + 1] = q.y - side.y; pos[o + 2] = q.z - side.z; pos[o + 3] = q.x + side.x; pos[o + 4] = q.y + side.y; pos[o + 5] = q.z + side.z;
      pos[o + 6] = q.x + dir.x - side.x; pos[o + 7] = q.y + dir.y - side.y; pos[o + 8] = q.z + dir.z - side.z; pos[o + 9] = q.x + dir.x + side.x; pos[o + 10] = q.y + dir.y + side.y; pos[o + 11] = q.z + dir.z + side.z;
    }
    g.attributes.position.needsUpdate = true;
  });
};
/* dust devils: sand motes spiralling up a wandering vertical axis, radius flaring with height (Points, soft sprite) */
RUN.devils = function (L) {
  const rs = MG.rs('devils'), N = 640, D = []; RUN._dv = D;
  const tex = RUN.glowTex();
  for (const [z0, d0] of [[260, 34], [470, -40], [640, 26], [1180, -30]]) {
    const pos = new Float32Array(N * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ map: tex, color: 0xa08058, size: 4.2, sizeAttenuation: true, transparent: true, opacity: 0.26, depthWrite: false });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; LEVEL.add(pts);
    const P = []; for (let i = 0; i < N; i++) P.push({ h: Math.pow(rs(), 1.6) * 26, a: rs() * TAU, r: rs(), s: 0.6 + rs() * 0.8 });   // denser at the foot
    D.push({ pts, pos, P, z0, d0, ph: rs() * 10 });
  }
  L.updates.push((dt, t) => {
    const cz = R.camera.position.z;
    for (const d of D) {
      d.pts.visible = Math.abs(d.z0 - cz) < 420; if (!d.pts.visible) continue;
      const z = d.z0 + 18 * Math.sin(t * 0.07 + d.ph), x = RUN.cx(z) + d.d0 + 14 * Math.sin(t * 0.11 + d.ph * 2), gy = RUN.h(x, z); d.x = x; d.z = z; d.gy = gy;
      for (let i = 0; i < N; i++) { const q = d.P[i]; q.h += dt * (3.5 + q.s * 3); q.a += dt * (2.8 - q.h * 0.05) * q.s; if (q.h > 26) { q.h = 0; q.r = rs(); }
        const rad = (0.6 + q.h * 0.2) * (0.55 + 0.45 * q.r) + 0.4 * Math.sin(q.h * 0.4 + t), lean = q.h * q.h * 0.012;
        d.pos[i * 3] = x + Math.cos(q.a) * rad + lean; d.pos[i * 3 + 1] = gy + q.h; d.pos[i * 3 + 2] = z + Math.sin(q.a) * rad + lean * 0.4; }
      d.pts.geometry.attributes.position.needsUpdate = true;
    }
  });
};
/* the guide: a probe droid that runs ahead along the line, waits if you stop */
RUN.glowTex = function () { if (RUN._gt) return RUN._gt; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (RUN._gt = new THREE.CanvasTexture(c)); };
RUN.guide = function (L) {
  const p = RIDE.probe(); L.guide = { p, z: 60 }; p.scale.setScalar(2.2);
  // a beacon you can pick out against the sky at 70 m: a pulsing red glow and a fading light trail
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: new THREE.Color(6, 0.5, 0.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, map: RUN.glowTex() })); glow.scale.setScalar(3.2); p.add(glow); L.guide.glow = glow;
  L.updates.push((dt, t) => {
    const P = PLAYER.a, G = L.guide; if (!P) return;
    const want = Math.min(RUN.Z1 - 40, Math.max(G.z, P.z + 70));
    G.z = damp(G.z, want, 1.4, dt); const x = RUN.cx(G.z) + RUN.line(G.z) * 0.6, y = RUN.h(x, G.z) + 5 + Math.sin(t * 2) * 0.4;
    G.p.position.set(x, y, G.z); G.p.lookAt(x, y, G.z + 5); G.p.children[1].visible = Math.sin(t * 8) > 0; const pu = 0.6 + 0.4 * Math.sin(t * 8); G.glow.material.opacity = pu; G.glow.scale.setScalar(1.0 + pu * 0.7);
    if (RNG() < 0.6) FX.puff(G.p.position.clone(), 1, { add: true, size: 0.5, grow: 0.5, col: [1.0, 0.15, 0.05], a: 0.55, life: 0.45, spread: 0.05, rise: 0 });
  });
};
/* the gorge ambush: Tusken snipers silhouetted on the rims, tracking the Bloodfin and firing leading shots down at it
   (most crack past close; a few hit for a sting) */
RUN.snipers = function (L) {
  L.snip = [];
  const spots = [[1690, 1], [1780, -1], [1870, 1], [1985, -1], [2105, 1], [2250, -1], [2345, 1]];
  const rock = TERRAIN.rockMat();
  for (const [z, side] of spots) {
    // a stone ledge jutting from the gorge wall ~11 m up, the sniper crouched on it against the far wall
    const d = side * (RUN.wallD(z, side, 12) - 0.9), x = RUN.cx(z) + d, y = RUN.canFloor(z) + 11;
    const slab = new THREE.CylinderGeometry(2.1, 1.1, 1.6, 9, 2), sp = slab.attributes.position; for (let i = 0; i < sp.count; i++) { const k = 1 + (fbm3(sp.getX(i) * 0.9 + z, sp.getY(i), sp.getZ(i) * 0.9, 2) - 0.5) * 0.5; sp.setXYZ(i, sp.getX(i) * k, sp.getY(i), sp.getZ(i) * k); } slab.computeVertexNormals();
    const sm = new THREE.Mesh(slab, rock); sm.position.set(x, y - 0.8, z); sm.castShadow = true; sm.receiveShadow = true; LEVEL.add(sm); PHY.cyl(x, z, 1.8, y - 1.6, y);
    const e = ENEMY.spawn('sniper', x, z, { y }); e.passive = true; e.noDrop = true; e.x = x; e.z = z; e.y = y; e.yaw = Math.atan2(-d, 0);
    L.snip.push({ e, cd: 0.6 + (z % 7) * 0.2 });
  }
  L.updates.push((dt) => {
    const b = RIDE.bike; if (!b || !RIDE.on) return;
    for (const s of L.snip) {
      const e = s.e; if (!e.alive) continue;
      const dz = b.position.z - e.z; if (dz < -110 || dz > 25) continue;
      e.yaw = dampA(e.yaw, Math.atan2(b.position.x - e.x, b.position.z - e.z), 6, dt);
      s.cd -= dt; if (s.cd > 0) continue; s.cd = 1.0 + RNG() * 0.8;
      const mz = V3(e.x, e.y + 1.45, e.z), speed = 95, t = b.position.distanceTo(mz) / speed;
      const aim = V3(b.position.x + RIDE.vx * t, b.position.y + 0.6, b.position.z + RIDE.vz * t);
      if (RNG() < 0.65) aim.add(V3(rnd(-2.6, 2.6), rnd(0.6, 2.2), rnd(-2, 3)));   // a near miss that cracks past
      const bolt = COMBAT.fire(mz, aim.sub(mz), { speed, team: 'foe', dmg: 4, shooter: e, col: [1, 0.35, 0.1] }); bolt.g.scale.set(2.6, 2.6, 3.2); bolt.life = 1.6;
      FX.flashLight && FX.flashLight(mz, [1, 0.5, 0.2], 3, 5, 0.06);
    }
  });
  L.updates.push(() => { if (L.snipWarn || !RIDE.on || !RIDE.bike) return; if (RIDE.bike.position.z > 1640) { L.snipWarn = 1; HUD.sub('DARTH MAUL', 'Sand People. On the rims.', 2.5); } });
};
/* speedometer + distance to the signal while riding */
RUN.hud = function (L) {
  let el = document.getElementById('runHud');
  if (!el) { el = document.createElement('div'); el.id = 'runHud';
    el.style.cssText = 'position:fixed;right:4.2vw;bottom:5.5vh;width:210px;text-align:right;color:#f3e6d6;letter-spacing:0.2em;text-shadow:0 1px 8px rgba(0,0,0,.75);pointer-events:none;z-index:6;display:none;font-family:inherit';
    el.innerHTML = '<svg width="210" height="112" viewBox="0 0 210 112" style="display:block;margin-left:auto"><path d="M18 104 A87 87 0 0 1 192 104" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="5" stroke-linecap="round"/><path id="runArc" d="M18 104 A87 87 0 0 1 192 104" fill="none" stroke="#e0412c" stroke-width="5" stroke-linecap="round" stroke-dasharray="274" stroke-dashoffset="274"/></svg>'
      + '<div style="margin-top:-70px;text-align:center"><div id="runSpd" style="font-size:40px;font-weight:700;letter-spacing:0.02em">0</div><div style="font-size:10px;opacity:.7">KM/H</div></div>'
      + '<div style="margin-top:16px;height:3px;background:rgba(255,255,255,.16)"><div id="runBar" style="height:3px;width:0;background:#e0412c;margin-left:auto"></div></div><div id="runDist" style="font-size:10px;opacity:.85;margin-top:6px"></div>';
    (MG.$('hud') || document.body).appendChild(el); }
  L.updates.push(() => { const on = RIDE.on && PLAYER.state === 'ride' && !CAM.cine; el.style.display = on ? 'block' : 'none'; if (!on) return;
    const kmh = Math.abs(RIDE.spd) * 3.6; MG.$('runSpd').textContent = Math.round(kmh); MG.$('runArc').setAttribute('stroke-dashoffset', (274 * (1 - clamp(kmh / 280, 0, 1))).toFixed(1));
    const z = PLAYER.a.z; MG.$('runBar').style.width = (clamp(z / RUN.Z1, 0, 1) * 100).toFixed(1) + '%';
    MG.$('runDist').textContent = 'PROBE SIGNAL  ' + Math.max(0, (RUN.Z1 - 150 - z) / 1000).toFixed(2) + ' KM'; });
};
/* ------------------------------------------------------------------ the level */
Object.assign(LEVEL.defs.dunes, {   // replaces the old short dune crossing (p41)
  chapter: 'CHAPTER II', name: 'THE DUNE SEA', world: 'tatooine', cast: ['guard', 'panaka', 'tusken'],
  tex: ['sand', 'rock', 'hull'],
  start: [2, 0, 2, 0], checkpoints: [[2, 0, 2, 0], [RUN.cx(900), 0, 900, 0], [RUN.cx(1500), 0, 1500, 0], [RUN.cx(2450), -24, 2450, 0], [RUN.cx(3160), 4, 3160, 0]], killY: -70,
  async build(L) {
    // twin suns low in the west: grazing light rakes across the dunes (long shadows read every crest at speed)
    TERRAIN.tatooineSky(L, { sun: new THREE.Vector3(-0.82, 0.3, 0.2), sunI: 3.8 }); R.scene.fog.density = 0.0019; R.setShadowBox(34, 200);
    await RUN.buildTerrain(TERRAIN.mat('dunes', { rk: true }), (p) => MG.loadUI && MG.loadUI(0.6 + p * 0.3, 'Raising the Dune Sea'));
    RUN.dress(); RUN.scatter();
    L.ship = PROPS.scimitar(); L.ship.position.set(16, 4.6, -12); L.ship.rotation.y = -0.6; LEVEL.add(L.ship);
    PHY.obox(16, -12, 5, 10, 0, 5, -0.6);
    for (const [z, d] of [[260, -60], [520, 70], [700, -90]]) { const x = RUN.cx(z) + d, v = PROPS.vaporator(); v.position.set(x, RUN.h(x, z) - 0.2, z); LEVEL.add(v); PHY.cyl(x, z, 0.5, RUN.h(x, z), RUN.h(x, z) + 4); }
    L.probes = [];
    for (let i = 0; i < 3; i++) { const p = RIDE.probe(); p.position.set(16, 4, -12); L.probes.push({ p, a: -0.9 + i * 0.9 }); }
    L.updates.push((dt, t) => { for (const q of L.probes) { if (!L.flags.launched) continue; const k = Math.min(1, (t - L.flags.launched) / 6); q.p.position.set(16 + Math.sin(q.a) * k * 160, 4 + k * 40, -12 + Math.cos(q.a) * k * 400); q.p.lookAt(q.p.position.clone().add(V3(Math.sin(q.a), 0.2, Math.cos(q.a)))); } });
    RIDE.spawnBike(-3, 7, 0);
    const hc = (z, d) => { const x = RUN.cx(z) + d; return [x, RUN.h(x, z), z]; };
    HOLOCRON.place(L, [hc(520, 62), hc(1262, RUN.line(1262)), hc(2700, -14)]);
    RUN.guide(L); RUN.hud(L); RUN.streaks(L); RUN.devils(L);
    L.updates.push((dt) => {
      const b = RIDE.bike; if (!b) return;
      // fell into the chasm: back on the line well before the lip, with some speed to try again
      if (RIDE.on && Math.abs(b.position.z - RUN.CHASM - 12) < 16 && b.position.y < RUN.canFloor(b.position.z) - 10) RIDE.wipeout('LOST TO THE CHASM', 120, 26);
      if (RIDE.on && b.position.z > RUN.CHASM - 60 && b.position.z < RUN.CHASM - 40 && !L.flags.chasmHint) { L.flags.chasmHint = 1; HUD.pop('CHASM AHEAD — FULL THROTTLE'); }
      // the jump shot: leaving the lip at speed, time slows and the camera cuts to the gorge wall looking up at the bike over the void
      if (RIDE.on && RIDE.air && !L.flags.chasmCam && b.position.z > RUN.CHASM - 2 && b.position.z < RUN.CHASM + 5 && RIDE.spd > 26 && !MG.flags.test) {
        L.flags.chasmCam = 1; MG.slowmo = 0.3; MG.slowmoT = 0; MG.slowmoDur = 1.6; R.kick(0.3);
        // down in the void, a little ahead and to the side: the bike crosses the sky over the camera, the far lip in frame
        const x0 = b.position.x + RIDE.vx / Math.max(1, RIDE.vz) * 8, y0 = b.position.y, cz = RUN.CHASM + 8, cx = x0, cy = y0 - 11;   // right under the flight path, deep in the void: a steep look up the slot of sky from any line
        CAM.play({ dur: 1.6, fov: 62, ease: 'lin', fn: (t, u) => ({ pos: V3(cx, cy - u * 0.6, cz + u * 1.5), look: V3(b.position.x, b.position.y + 0.3, b.position.z + 1.5) }) });
      }
      // a riderless bike skids on and settles
      if (!RIDE.on && L.skid > 0.3) { L.skid = damp(L.skid, 0, 1.3, dt); const f = V3(Math.sin(RIDE.yaw), 0, Math.cos(RIDE.yaw)); b.position.x += f.x * L.skid * dt; b.position.z += f.z * L.skid * dt; b.position.y = damp(b.position.y, RUN.h(b.position.x, b.position.z) + 0.45, 8, dt); b.rotateZ(dt * 0.4);
        if (RNG() < 0.5) FX.puff(V3(b.position.x, b.position.y - 0.3, b.position.z), 1, { size: 0.9, grow: 3, col: [0.86, 0.72, 0.52], a: 0.4, spread: 1.5, life: 1.5 }); }
    });
    // the scouting party's camp on the plateau under the Wastes
    { const body = TEX.mat('hull', { color: 0x8a8272, rough: 0.6, metal: 0.3 }), trim = TEX.mat('hull', { color: 0x3a3a40, rough: 0.45, metal: 0.6 });
      for (const [d, dz, w, h] of [[-9, 0, 1.6, 1.1], [8, 6, 1.2, 0.9], [-4, 18, 2.0, 1.2], [12, -2, 1.4, 1.4], [-10.5, 1.8, 1.0, 0.8], [9.4, 7.2, 0.9, 0.7]]) { const z = 3190 + dz, x = RUN.cx(z) + d, y = RUN.h(x, z); KIT.crate(x, z, w, h, w * 0.8, body, trim, { y }); PHY.box(x - w / 2, y, z - w * 0.4, x + w / 2, y + h, z + w * 0.4); }
      // two canvas tents (triangular prisms, ridge up) and a campfire: stone ring, crossed logs, a flickering lamp, sparks + smoke
      const canvas = CLOTH.mat('tusken'), pole = PROPS.m('tentPole', { color: 0x3a2c20, roughness: 0.8 });
      for (const [d, dz, yaw] of [[-11, 11, 0.3], [11.5, 14, -0.25]]) { const z = 3190 + dz, x = RUN.cx(z) + d, y = RUN.h(x, z);
        const tg = new THREE.CylinderGeometry(1.7, 1.7, 3.6, 3, 1); tg.rotateZ(HALF); tg.rotateX(-HALF); tg.rotateY(HALF);   // prism along z, ridge up, flat base
        const t = new THREE.Mesh(tg, canvas); t.rotation.y = yaw; t.position.set(x, y + 0.85, z); t.castShadow = t.receiveShadow = true; LEVEL.add(t);
        for (const e of [-1.85, 1.85]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), pole); pl.position.set(x + Math.sin(yaw) * e, y + 1.1, z + Math.cos(yaw) * e); LEVEL.add(pl); }
        PHY.obox(x, z, 1.7, 1.9, y, y + 1.8, yaw); }
      { const z = 3198, x = RUN.cx(z) - 1.5, y = RUN.h(x, z), rk = TERRAIN.rockMat(), logM = PROPS.m('log', { color: 0x2a1c12, roughness: 0.95 });
        for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; TERRAIN.rock(x + Math.cos(a) * 0.75, z + Math.sin(a) * 0.75, 0.16, 0.2, 700 + i, rk, { col: false, y: y + 0.02, detail: 1 }); }
        for (const a of [0.3, 1.9, 3.4]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 7), logM); lg.position.set(x, y + 0.14, z); lg.rotation.set(HALF, a, 0.25); LEVEL.add(lg); }
        const lt = KIT.lamp(x, y + 0.8, z, 0xff8a30, 4, 12, { fixture: false }), fp = V3(x, y + 0.2, z);
        L.updates.push((dt, t) => { lt.i = 3.6 + Math.sin(t * 17) * 0.6 + Math.sin(t * 29 + 1.3) * 0.4; if (RNG() < dt * 24) FX.puff(fp, 1, { add: true, size: 0.3, grow: 0.25, col: [3.2, 1.25, 0.32], a: 0.9, life: 0.6, spread: 0.25, rise: 2.2, drag: 0.6, jit: 0.22 }); if (RNG() < dt * 3) FX.puff(V3(fp.x, fp.y + 1.1, fp.z), 1, { size: 0.45, grow: 3, col: [0.14, 0.12, 0.1], a: 0.35, life: 3, spread: 0.3, rise: 1.2 }); });
        PHY.cyl(x, z, 0.9, y, y + 0.5); }
      // a supply awning over the crates and a comm mast with a dish: the scouts have been here a while
      { const z = 3192, x = RUN.cx(z) + 9.5, y = RUN.h(x, z), tarp = CLOTH.mat('guard');
        const tp = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.6, 8, 6), tarp); const TP = tp.geometry.attributes.position; for (let i = 0; i < TP.count; i++) TP.setZ(i, -0.25 * Math.cos(TP.getX(i) / 2.6 * HALF) * Math.cos(TP.getY(i) / 1.8 * HALF)); tp.geometry.computeVertexNormals();
        tp.rotation.set(-HALF + 0.12, 0.2, 0); tp.position.set(x, y + 2.3, z); tp.castShadow = tp.receiveShadow = true; LEVEL.add(tp);
        for (const [a, b] of [[-2.4, -1.6], [2.4, -1.6], [-2.4, 1.6], [2.4, 1.6]]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4 - b * 0.1, 6), pole); pl.position.set(x + a * Math.cos(0.2) + b * Math.sin(0.2), y + 1.15, z - a * Math.sin(0.2) + b * Math.cos(0.2)); LEVEL.add(pl); }
        const mx = RUN.cx(3206) - 4, mz = 3206, my = RUN.h(mx, mz), met = PROPS.m('mast', { color: 0x6a6c72, metalness: 0.7, roughness: 0.4 });
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 5.5, 8), met); mast.position.set(mx, my + 2.75, mz); LEVEL.add(mast);
        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 8, 0, TAU, 0, 0.9), met); dish.material.side = THREE.DoubleSide; dish.position.set(mx, my + 4.6, mz); dish.rotation.set(-0.9, 0.6, 0); LEVEL.add(dish);
        for (const a of [0, 2.1, 4.2]) { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.4, 4), pole); g.position.set(mx + Math.cos(a) * 1.3, my + 2.1, mz + Math.sin(a) * 1.3); g.lookAt(mx, my + 4.2, mz); g.rotateX(HALF); LEVEL.add(g); }
        KIT.lamp(mx, my + 5.4, mz, 0xff3020, 0.8, 4, { fixture: true }); PHY.cyl(mx, mz, 0.25, my, my + 5.5); } }
  },
  onStart(L, cp) {
    const say = (w, t, d, c) => HUD.sub(w, t, d, c);
    HUD.toast('TATOOINE', 'THE DUNE SEA', 3.5);
    CLOAK.wear(PLAYER.a, true);
    const war = () => {
      HUD.obj('Wipe out the Queen\'s scouting party');
      const z = 3190, x = RUN.cx(z);
      LEVEL.wave([['guard', x - 6, z + 2], ['guard', x + 5, z + 4], ['guard', x - 2, z + 11], ['guard', x + 7, z + 12], ['guard', x - 12, z + 1], ['panaka', x + 3, z + 16]], () => {
        HUD.obj('Enter the Jundland Wastes'); HUD.sub('DARTH MAUL', 'The probe has found them. The Jundland Wastes.', 3);
        LEVEL.trigger(RUN.cx(3280) - 16, 3272, RUN.cx(3280) + 16, 3300, () => GAME.next());
      }, { now: true, stagger: 0.2, alert: true });
    };
    if (cp < 3) RUN.snipers(L);
    // ride checkpoints: passing each stretch saves; a respawn there puts Maul straight back on the Bloodfin
    RUN.CPZ.forEach((cz, i) => { if (i > 0 && i < 5) LEVEL.trigger(RUN.cx(cz) - 200, cz, RUN.cx(cz) + 200, cz + 6, () => LEVEL.checkpoint(i)); });
    LEVEL.trigger(RUN.cx(3172) - 200, 3170, RUN.cx(3172) + 200, 3180, () => {   // leap at the plateau lip: land at the camp's edge
      if (RIDE.on) {   // Maul leaps from the speeder at full tilt, flips, and lands among them, blade lit; the Bloodfin skids on
        const a = PLAYER.a, sp = RIDE.spd; L.skid = Math.min(sp, 40); RIDE.dismount(false);
        a.vy = 8.5; const f = V3(Math.sin(RIDE.yaw), 0, Math.cos(RIDE.yaw)); a.vx = f.x * Math.min(14, sp * 0.3); a.vz = f.z * Math.min(14, sp * 0.3); a.play('flip', { fade: 0.05 });
        MG.slowmo = 0.35; MG.slowmoT = 0; FX.addShake(0.3); R.kick(0.5); PLAYER.saber.ignite && PLAYER.saber.ignite(undefined, true); HUD.pop('THE CAMP');
      }
      LEVEL.checkpoint(5); war();
    });
    if (cp >= 5) { war(); return; }
    if (cp >= 1) {   // back on the bike at the checkpoint
      const z = RUN.CPZ[cp] + 4, x = RUN.cx(z), b = RIDE.bike; b.position.set(x, RUN.h(x, z) + RIDE.h, z); b.rotation.set(0, Math.atan2(RUN.cx(z + 10) - x, 10), 0);
      PLAYER.a.x = x + 1; PLAYER.a.z = z; RIDE.mount(); L.flags.launched = 0.01; L.guide.z = z + 60;
      HUD.obj('Follow the probe droid to the scouting party'); return;
    }
    if (L.skipIntro) { L.flags.launched = 0.01; HUD.obj('Take the Bloodfin — follow the probe droid north'); }
    const P = PLAYER.a; if (!L.skipIntro) { PLAYER.state = 'cine'; HUD.show(false); }
    if (!L.skipIntro) CAM.play({ dur: 6.5, fov: 42, fn: (t, u) => { const k = smooth(0.25, 1, u); return { pos: V3(-8 + u * 6, 2.2 + u * 3.2, 14 - u * 5), look: V3(lerp(12, RUN.cx(320), k), lerp(3, 16, k), lerp(-10, 320, k)) }; } });   // from the Scimitar out over the Dune Sea, the way the probes fly
    if (!L.skipIntro) MG.after(1.0, () => { L.flags.launched = LEVEL.cur.t; say('', 'Three DRK-1 probe droids streak out across the Dune Sea.', 3); });
    if (!L.skipIntro) MG.after(4.0, () => say('DARTH SIDIOUS', 'Tatooine is sparsely populated. If the trail is correct, you will find them quickly.', 3.5, 'sid'));
    if (!L.skipIntro) MG.after(6.6, () => { PLAYER.state = 'move'; HUD.show(true); HUD.obj('Take the Bloodfin — follow the probe droid north'); HUD.hint('Walk to the speeder and press ' + IN.keyLabel('grip'), 5); });
    void P;
  },
});
