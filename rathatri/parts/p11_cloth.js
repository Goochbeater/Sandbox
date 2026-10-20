/* CLOTH — verlet panels (tunic skirts, tabards, robes, capes). Top row pinned to a bone; legs and hips collide.
   Simulated in world space at a fixed 1/60 s step, re-meshed every frame (normals from the grid). */
const CLOTH = {};
/* a panel hanging from an arc of the waist ellipse: a0..a1 = angles (deg) from +Z toward +X */
CLOTH.arcPanel = function (o) {
  const cols = o.cols || 6, rows = o.rows || 8, pts = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const t = i / (cols - 1), a = lerp(o.a0, o.a1, t) * D2R, f = j / (rows - 1);
    const r = 1 + (o.flare || 0.3) * f;
    pts.push([Math.sin(a) * o.rx * r + (o.cx || 0), o.y - f * o.len, Math.cos(a) * o.rz * r + (o.cz || 0)]);
  }
  return { cols, rows, pts, bone: o.bone || 0, mat: o.mat || 'tunic', stiff: o.stiff || 1, name: o.name || 'panel', thick: o.thick || 0.004, damp: o.damp, carry: o.carry, grav: o.grav };
};
/* a flat strip hanging from a straight top edge (tabard / cape) */
CLOTH.stripPanel = function (o) {
  const cols = o.cols || 5, rows = o.rows || 9, pts = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const t = i / (cols - 1), f = j / (rows - 1);
    const top = V.lerp(o.p0, o.p1, t);
    pts.push(V.add(top, V.add([0, -f * o.len, 0], V.mul(o.out || [0, 0, 0], f))));
  }
  return { cols, rows, pts, bone: o.bone || 0, mat: o.mat || 'tunic', stiff: o.stiff || 1, name: o.name || 'strip', thick: o.thick || 0.004 };
};
CLOTH.maulSpec = function (J) {
  const y = J.pelvis[1] + 0.012, P = [];
  const base = { y, rx: 0.168, rz: 0.134, len: 0.56, rows: 10, cols: 6, flare: 0.3 };
  P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: -58, a1: -18, cols: 3, name: 'skirtF1' }))); P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 18, a1: 58, cols: 3, name: 'skirtF2' })));
  P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 52, a1: 128, cols: 5, len: 0.44, name: 'skirtL' })));
  P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 122, a1: 162, cols: 3, name: 'skirtB1' }))); P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 198, a1: 238, cols: 3, name: 'skirtB2' })));
  P.push(CLOTH.arcPanel(Object.assign({}, base, { a0: 232, a1: 308, cols: 5, len: 0.44, name: 'skirtR' })));
  // long tabard strips front and back, over the skirt
  P.push(CLOTH.arcPanel({ y: y + 0.004, rx: 0.194, rz: 0.16, a0: -22, a1: 22, len: 0.66, rows: 10, cols: 4, flare: 0.3, name: 'tabF', mat: 'tabard' }));
  P.push(CLOTH.arcPanel({ y: y + 0.004, rx: 0.194, rz: 0.16, a0: 158, a1: 202, len: 0.68, rows: 10, cols: 4, flare: 0.3, name: 'tabB', mat: 'tabard' }));
  return { panels: P, colliders: 'legs' };
};
CLOTH.mats = {};
CLOTH.mat = function (key) {
  if (CLOTH.mats[key]) return CLOTH.mats[key];
  const spec = { tunic: [0x222228, 0x4a4a58, 0.84], tabard: [0x24242a, 0x4e4e5c, 0.8], robeBrown: [0x4c3322, 0x7c5c46, 0.9], robeTan: [0x8a7458, 0xc8b89a, 0.92],
    tusken: [0x7a6a52, 0xb0a080, 0.95], guard: [0x3a2a1c, 0x806850, 0.85], thug: [0x151517, 0x404050, 0.8], cape: [0x131316, 0x2e2c32, 0.84, 0.55, 0.3], red: [0x5a0808, 0xa04040, 0.85], senate: [0x21388a, 0x3a4f90, 0.88] }[key] || [0x222222, 0x555555, 0.9];
  const m = new THREE.MeshPhysicalMaterial({ color: spec[0], roughness: spec[2], metalness: 0, sheen: spec[3] !== undefined ? spec[3] : 1, sheenColor: new THREE.Color(spec[1]), sheenRoughness: 0.45, side: THREE.DoubleSide, envMapIntensity: spec[4] !== undefined ? spec[4] : 0.9 });
  m.onBeforeCompile = (sh) => {   // the characters' camera fill light, so dark cloth still shows its folds
    sh.uniforms.uFill = CM.fillU; CM.rimHook(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFill;').replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + CM.FILL.replace('rimF = pow(', 'rimF = 0.55 * pow(').replace(', 3.2)', ', 7.0)'));   // thin panels are edge-on to the camera everywhere: a wide rim would grey out black cloth
  };
  m.customProgramCacheKey = () => 'clothpanel';
  CLOTH.mats[key] = m; return m;
};
class ClothSet {
  constructor(spec, inst) {
    this.inst = inst; this.panels = []; this.acc = 0; this.first = true; this.visible = true;
    for (const pd of spec.panels) {
      const n = pd.cols * pd.rows, p = new Float32Array(n * 3), q = new Float32Array(n * 3), rest = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { rest[k * 3] = pd.pts[k][0]; rest[k * 3 + 1] = pd.pts[k][1]; rest[k * 3 + 2] = pd.pts[k][2]; }
      // local offsets from the pin bone's rest head
      const bh = inst.T.def[pd.bone].head;
      const loc = new Float32Array(n * 3); for (let k = 0; k < n; k++) { loc[k * 3] = rest[k * 3] - bh[0]; loc[k * 3 + 1] = rest[k * 3 + 1] - bh[1]; loc[k * 3 + 2] = rest[k * 3 + 2] - bh[2]; }
      // constraints
      const C = [], id = (i, j) => j * pd.cols + i;
      const add = (a, b, s) => { const d = Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1], rest[a * 3 + 2] - rest[b * 3 + 2]); C.push(a, b, d, s); };
      for (let j = 0; j < pd.rows; j++) for (let i = 0; i < pd.cols; i++) {
        if (i + 1 < pd.cols) add(id(i, j), id(i + 1, j), 1);
        if (j + 1 < pd.rows) add(id(i, j), id(i, j + 1), 1);
        if (i + 1 < pd.cols && j + 1 < pd.rows) { add(id(i, j), id(i + 1, j + 1), 0.6); add(id(i + 1, j), id(i, j + 1), 0.6); }
        if (j + 2 < pd.rows) add(id(i, j), id(i, j + 2), 0.35 * pd.stiff);
        if (i + 2 < pd.cols) add(id(i, j), id(i + 2, j), 0.3 * pd.stiff);
      }
      // mesh
      const g = new THREE.BufferGeometry();
      const pa = new THREE.BufferAttribute(new Float32Array(n * 3), 3); pa.setUsage(THREE.DynamicDrawUsage);
      const na = new THREE.BufferAttribute(new Float32Array(n * 3), 3); na.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', pa); g.setAttribute('normal', na);
      const I = []; for (let j = 0; j + 1 < pd.rows; j++) for (let i = 0; i + 1 < pd.cols; i++) { const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1); I.push(a, d, b, b, d, c); }
      g.setIndex(I);
      const me = new THREE.Mesh(g, CLOTH.mat(pd.mat)); me.castShadow = true; me.receiveShadow = true; me.frustumCulled = false;
      // hip-hung panels also spring softly toward a hanging shape skinned to the pelvis and the nearest thigh, so strides
      // carry them and they can never stay tangled between the legs
      let fol = null;
      if (pd.bone === 0 && spec.colliders === 'legs' && pd.follow !== 0) {
        const cols = pd.cols, rows = pd.rows, hg = new Float32Array(n * 3), lp = new Float32Array(n * 3), lt = new Float32Array(n * 3), wt = new Float32Array(n), drv = new Uint8Array(cols);
        const h0 = inst.T.def[0].head;
        for (let k = 0; k < n; k++) { const c = k % cols, r = k / cols | 0, dx = rest[k * 3] - rest[c * 3], dy = rest[k * 3 + 1] - rest[c * 3 + 1], dz = rest[k * 3 + 2] - rest[c * 3 + 2];
          const L = Math.hypot(dx, dy, dz), hx = dx * 0.3, hz = dz * 0.3, hy = -Math.sqrt(Math.max(0, L * L - hx * hx - hz * hz));
          hg[k * 3] = rest[c * 3] + hx; hg[k * 3 + 1] = rest[c * 3 + 1] + hy; hg[k * 3 + 2] = rest[c * 3 + 2] + hz;
          const sx = rest[c * 3], d = sx >= 0 ? 13 : 16; drv[c] = d; const th = inst.T.def[d].head;
          lp[k * 3] = hg[k * 3] - h0[0]; lp[k * 3 + 1] = hg[k * 3 + 1] - h0[1]; lp[k * 3 + 2] = hg[k * 3 + 2] - h0[2];
          lt[k * 3] = hg[k * 3] - th[0]; lt[k * 3 + 1] = hg[k * 3 + 1] - th[1]; lt[k * 3 + 2] = hg[k * 3 + 2] - th[2];
          wt[k] = clamp(Math.abs(sx) / 0.1, 0.3, 1) * 0.75 * (r / (rows - 1)); }
        fol = { lp, lt, wt, drv, k: pd.follow || 0.07 };
      }
      this.panels.push({ pd, n, p, q, rest, loc, C: new Float32Array(C), mesh: me, geo: g, fol });
    }
    this.group = new THREE.Group(); for (const P of this.panels) this.group.add(P.mesh);
    this.col = [];
  }
  addTo(scene) { scene.add(this.group); }
  setVisible(v) { this.visible = v; this.group.visible = v; }
  dispose() { if (this.group.parent) this.group.parent.remove(this.group); for (const P of this.panels) P.geo.dispose(); }
  /* collision capsules from current bone world positions */
  gather() {
    const B = this.inst.bones, c = this.col; c.length = 0;
    const wp = (i) => B[i].getWorldPosition(new THREE.Vector3());
    const sc = this.inst.root.scale.x * (this.inst.T.clothR || 1);
    const hipL = wp(13), kneeL = wp(14), ankL = wp(15), hipR = wp(16), kneeR = wp(17), ankR = wp(18), pel = wp(0), sp = wp(1);
    c.push([hipL, kneeL, 0.098 * sc], [kneeL, ankL, 0.07 * sc], [hipR, kneeR, 0.098 * sc], [kneeR, ankR, 0.07 * sc], [pel.clone().add(V3(0, -0.02, 0)), sp, 0.15 * sc]);
    if (this.hasCape === undefined) this.hasCape = this.panels.some((P) => P.pd.bone === 2);
    if (this.hasCape) { const nk = wp(3); c.push([sp.clone(), nk, 0.19 * sc]); }   // capes drape over the back, not through it
    if (this.inst.extraCol) for (const e of this.inst.extraCol) c.push(e);   // e.g. the speeder the wearer is riding
  }
  reset() { this.first = true; }
  step(dt) {
    if (!this.visible) return;
    this.inst.root.updateMatrixWorld(true);
    // riding: the cloth lives in the vehicle's moving frame — carry every particle by the root's travel this frame, or a
    // 40 m/s body reads as a teleport (jump > 0.6) and the cloth was snapped + re-settled 40 substeps EVERY frame (17 ms)
    const rp = this.inst.root.getWorldPosition(this._rpT || (this._rpT = new THREE.Vector3()));
    if (this._rp && this.inst.drape && !this.first) {
      const dx = rp.x - this._rp.x, dy = rp.y - this._rp.y, dz = rp.z - this._rp.z;
      if (dx * dx + dy * dy + dz * dz < 25) for (const P of this.panels) { const p = P.p, q = P.q; for (let k = 0; k < P.n * 3; k += 3) { p[k] += dx; p[k + 1] += dy; p[k + 2] += dz; q[k] += dx; q[k + 1] += dy; q[k + 2] += dz; } }
    }
    (this._rp || (this._rp = new THREE.Vector3())).copy(rp);
    this.gather();
    this.acc += Math.min(dt, 0.1);
    const H = 1 / 60; let n = 0;
    // after a reset (spawn / teleport) let the cloth fall into its hang off-screen, so it never shows the flared rest shape
    if (this.first) { this.sub(H); this.resettle = true; }
    while (this.acc >= H && n < 3) { this.sub(H); this.acc -= H; n++; }
    if (this.resettle) { this.resettle = false; for (let i = 0; i < 40; i++) this.sub(H); }
    if (n === 3) this.acc = 0;
    this.remesh();
  }
  sub(h) {
    const B = this.inst.bones, g = -9.8 * h * h, W = this.inst.wind, wx = W ? W.x * h * h : 0, wy = W ? W.y * h * h : 0, wz = W ? W.z * h * h : 0;
    for (const P of this.panels) {
      const pd = P.pd, m = B[pd.bone].matrixWorld, cols = pd.cols, p = P.p, q = P.q, loc = P.loc, n = P.n;
      const tmp = _v1;
      if (this.first) { for (let k = 0; k < n; k++) { tmp.set(loc[k * 3], loc[k * 3 + 1], loc[k * 3 + 2]).applyMatrix4(m); p[k * 3] = q[k * 3] = tmp.x; p[k * 3 + 1] = q[k * 3 + 1] = tmp.y; p[k * 3 + 2] = q[k * 3 + 2] = tmp.z; } continue; }
      // pinned top row (and how far the body carried it this step)
      let jump = 0, bx = 0, by = 0, bz = 0; const bv = P.bv || (P.bv = new Float32Array(cols * 3));
      for (let i = 0; i < cols; i++) { tmp.set(loc[i * 3], loc[i * 3 + 1], loc[i * 3 + 2]).applyMatrix4(m); jump = Math.max(jump, Math.abs(tmp.x - p[i * 3]) + Math.abs(tmp.z - p[i * 3 + 2])); bx += tmp.x - p[i * 3]; by += tmp.y - p[i * 3 + 1]; bz += tmp.z - p[i * 3 + 2]; bv[i * 3] = tmp.x - p[i * 3]; bv[i * 3 + 1] = tmp.y - p[i * 3 + 1]; bv[i * 3 + 2] = tmp.z - p[i * 3 + 2]; p[i * 3] = q[i * 3] = tmp.x; p[i * 3 + 1] = q[i * 3 + 1] = tmp.y; p[i * 3 + 2] = q[i * 3 + 2] = tmp.z; }
      if (jump > 0.6) { for (let k = 0; k < n; k++) { tmp.set(loc[k * 3], loc[k * 3 + 1], loc[k * 3 + 2]).applyMatrix4(m); p[k * 3] = q[k * 3] = tmp.x; p[k * 3 + 1] = q[k * 3 + 1] = tmp.y; p[k * 3 + 2] = q[k * 3 + 2] = tmp.z; } this.resettle = true; continue; }   // teleported: snap to rest, settle below
      bx /= cols; by /= cols; bz /= cols;
      // integrate: velocity relative to the body is damped, so the cloth travels with its wearer and only lags a little.
      // Each column is carried by its own pin (not the average), so spins and turns drag the cloth round with the body.
      const damp = pd.damp || 0.95, carry = pd.carry !== undefined ? pd.carry : 0.55;
      for (let k = cols; k < n; k++) {
        const x = p[k * 3], y = p[k * 3 + 1], z = p[k * 3 + 2], t3 = (k % cols) * 3;
        const vx = x - q[k * 3], vy = y - q[k * 3 + 1], vz = z - q[k * 3 + 2];
        bx = bv[t3]; by = bv[t3 + 1]; bz = bv[t3 + 2];
        let wk = (k / cols | 0) / (pd.rows - 1);   // lower rows catch more of the wind
        if (W && this.inst.flutter) wk *= 1 + this.inst.flutter * Math.sin(MG.t * 13 + (k % cols) * 1.1 + (k / cols | 0) * 0.8) * Math.sin(MG.t * 4.3 + (k % cols) * 0.4);
        p[k * 3] += bx * carry + (vx - bx * carry) * damp + wx * wk; p[k * 3 + 1] += by * carry + (vy - by * carry) * damp + g * (pd.grav || 1) + wy * wk; p[k * 3 + 2] += bz * carry + (vz - bz * carry) * damp + wz * wk;
        q[k * 3] = x; q[k * 3 + 1] = y; q[k * 3 + 2] = z;
      }
      const DR = this.inst.drape;
      if (DR && pd.bone === 2) {   // riding: spring toward a streamer hung from each pinned column along the wind
        if (!P.segL) { let sL = 0, c = 0; for (let k = cols; k < n; k++) { const j = k - cols; sL += Math.hypot(P.rest[k * 3] - P.rest[j * 3], P.rest[k * 3 + 1] - P.rest[j * 3 + 1], P.rest[k * 3 + 2] - P.rest[j * 3 + 2]); c++; } P.segL = sL / c; }
        const d = DR.dir, sg = P.segL, cxm = (p[0] + p[(cols - 1) * 3]) * 0.5, czm = (p[2] + p[(cols - 1) * 3 + 2]) * 0.5, T = MG.t;
        // a tapering streamer with travelling ripples (side-to-side and up-down) — lively, but it can never leave its lane
        const sx = -d.z, sz = d.x, sl = Math.hypot(sx, sz) || 1, amp = DR.amp || 0.07;
        for (let k = cols; k < n; k++) { const c = k % cols, r = (k / cols | 0), u = r / (pd.rows - 1), L = r * sg, spread = -0.12 * u;
          const w1 = Math.sin(u * 7.5 - T * 10.5 + c * 0.35) * amp * u, w2 = Math.sin(u * 5.2 - T * 8.1 + c * 0.9) * amp * 0.8 * u;
          const tx = p[c * 3] + d.x * L + (p[c * 3] - cxm) * spread + sx / sl * w1, ty = p[c * 3 + 1] + d.y * L + w2, tz = p[c * 3 + 2] + d.z * L + (p[c * 3 + 2] - czm) * spread + sz / sl * w1, kf = DR.k * (0.35 + 0.65 * u);
          p[k * 3] += (tx - p[k * 3]) * kf; p[k * 3 + 1] += (ty - p[k * 3 + 1]) * kf; p[k * 3 + 2] += (tz - p[k * 3 + 2]) * kf; }
      }
      if (P.fol) { const F = P.fol, m0 = B[0].matrixWorld, tp = _v2, tt = _v3;
        for (let k = cols; k < n; k++) { const r = (k / cols | 0) / (pd.rows - 1), kf = F.k * (0.3 + 0.7 * r), mt = B[F.drv[k % cols]].matrixWorld;
          tp.set(F.lp[k * 3], F.lp[k * 3 + 1], F.lp[k * 3 + 2]).applyMatrix4(m0); tt.set(F.lt[k * 3], F.lt[k * 3 + 1], F.lt[k * 3 + 2]).applyMatrix4(mt); tp.lerp(tt, F.wt[k]);
          p[k * 3] += (tp.x - p[k * 3]) * kf; p[k * 3 + 1] += (tp.y - p[k * 3 + 1]) * kf; p[k * 3 + 2] += (tp.z - p[k * 3 + 2]) * kf; } }
      // constraints + collisions
      const C = P.C;
      for (let it = 0; it < 4; it++) {
        for (let c = 0; c < C.length; c += 4) {
          const a = C[c], b = C[c + 1], L = C[c + 2], s = C[c + 3];
          const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2], bx = p[b * 3], by = p[b * 3 + 1], bz = p[b * 3 + 2];
          const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
          if (s < 0.5 && d < L) continue;                 // bend/shear springs only resist stretching... and a little compression
          const diff = (d - L) / d * 0.5 * s;
          const wa = a < cols ? 0 : 1, wb = b < cols ? 0 : 1, ws = wa + wb; if (!ws) continue;
          const k2 = 2 / ws;
          if (wa) { p[a * 3] += dx * diff * k2 * wa; p[a * 3 + 1] += dy * diff * k2 * wa; p[a * 3 + 2] += dz * diff * k2 * wa; }
          if (wb) { p[b * 3] -= dx * diff * k2 * wb; p[b * 3 + 1] -= dy * diff * k2 * wb; p[b * 3 + 2] -= dz * diff * k2 * wb; }
        }
        for (let k = cols; k < n; k++) this.collide(p, k);
      }
      if (!P.teth) { P.teth = new Float32Array(n); const r = P.rest; for (let k = cols; k < n; k++) { const t = k % cols; P.teth[k] = Math.hypot(r[k * 3] - r[t * 3], r[k * 3 + 1] - r[t * 3 + 1], r[k * 3 + 2] - r[t * 3 + 2]) * 1.04; } }
      for (let k = cols; k < n; k++) { const t = k % cols; const dx = p[k * 3] - p[t * 3], dy = p[k * 3 + 1] - p[t * 3 + 1], dz = p[k * 3 + 2] - p[t * 3 + 2], d = Math.hypot(dx, dy, dz), L = P.teth[k]; if (d > L) { const f = L / d; p[k * 3] = p[t * 3] + dx * f; p[k * 3 + 1] = p[t * 3 + 1] + dy * f; p[k * 3 + 2] = p[t * 3 + 2] + dz * f; } }
      // floor
      const fy = this.inst.floorY !== undefined ? this.inst.floorY + 0.02 : -1e9;
      for (let k = cols; k < n; k++) if (p[k * 3 + 1] < fy) p[k * 3 + 1] = fy;
    }
    this.first = false;
  }
  collide(p, k) {
    const x = p[k * 3], y = p[k * 3 + 1], z = p[k * 3 + 2];
    for (const [a, b, r] of this.col) {
      const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, L2 = ux * ux + uy * uy + uz * uz;
      let t = ((x - a.x) * ux + (y - a.y) * uy + (z - a.z) * uz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = a.x + ux * t, cy = a.y + uy * t, cz = a.z + uz * t, dx = x - cx, dy = y - cy, dz = z - cz, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < r * r) { const d = Math.sqrt(d2) || 1e-5, s = r / d; p[k * 3] = cx + dx * s; p[k * 3 + 1] = cy + dy * s; p[k * 3 + 2] = cz + dz * s; }
    }
  }
  remesh() {
    for (const P of this.panels) {
      const pa = P.geo.attributes.position, na = P.geo.attributes.normal, p = P.p, cols = P.pd.cols, rows = P.pd.rows;
      pa.array.set(p); pa.needsUpdate = true;
      const N = na.array;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i, l = j * cols + Math.max(0, i - 1), r = j * cols + Math.min(cols - 1, i + 1), u = Math.max(0, j - 1) * cols + i, d = Math.min(rows - 1, j + 1) * cols + i;
        const ax = p[r * 3] - p[l * 3], ay = p[r * 3 + 1] - p[l * 3 + 1], az = p[r * 3 + 2] - p[l * 3 + 2];
        const bx = p[d * 3] - p[u * 3], by = p[d * 3 + 1] - p[u * 3 + 1], bz = p[d * 3 + 2] - p[u * 3 + 2];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const L = Math.hypot(nx, ny, nz) || 1;
        N[k * 3] = -nx / L; N[k * 3 + 1] = -ny / L; N[k * 3 + 2] = -nz / L;
      }
      na.needsUpdate = true;
      P.geo.computeBoundingSphere();
    }
  }
}
