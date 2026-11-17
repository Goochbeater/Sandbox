/* ============================================================================
   SPOREHEART — src/cloth.js : verlet garments (cloth sheets + ribbons) for the procedural cast

   A Sim belongs to one character rig. It owns particles simulated in WORLD space with position-verlet:
       integrate (gravity, wind, damping) → shape pull → distance constraints → body colliders → max-distance → ground
   and renders them as deforming meshes that live at the scene root (identity transform).

     const sim = G.cloth.create(rig, { follow, colliders:[{bone, a:[x,y,z], b:[x,y,z]?, r}] });
     sim.sheet({ bone, cols, rows, rest:(u,v)=>[x,y,z], loop, color, lining, trim, map, thickness, outline,
                 ks:[top,hem], maxDist:[top,hem], gs, pinRows, bones:(u,v)=>boneName })
     sim.ribbon({ bone, pts:[[x,y,z]…], w:[w0,w1], t:[t0,t1], side:[x,y,z], ring:4|6, color, tip, map, outline,
                  ks:[root,tip], maxDist:[root,tip], gs, pin })
   * `rest` / `pts` are authored in the anchor bone's LOCAL space: that is the garment's tailored shape. Every
     particle is softly pulled back to it (ks) and may never stray further than maxDist from it, so cloth keeps the
     silhouette of the concept art, cannot explode, and still swings, lags, whips and settles for real.
   * Sheets are rendered as a thin closed shell (outer + lining + hem), so the ink-outline pass and a contrasting
     lining colour both work. Ribbons are rings of 4/6 vertices (flat tape … round braid) closed at the tip.
   * G.cloth.updateAll(dt) is called once per frame AFTER all gameplay moved the characters (game.js / gallery).
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  const C = (G.cloth = { sims: [], time: 0, wind: { x: 0.9, z: 0.35, gust: 1 }, enabled: true });
  const T = () => G.THREE;
  const GRAV = 9.8;
  const lerp = (a, b, t) => a + (b - a) * t;

  let _v = null, _m = null;

  function Sim(rig, o) {
    o = o || {};
    this.rig = rig; this.root = rig.root; this.follow = o.follow === undefined ? 0.35 : o.follow;
    this.windK = o.wind === undefined ? 1 : o.wind;
    this.damp = o.damp === undefined ? 4.2 : o.damp;
    this.iters = o.iters || 3;
    this.bones = []; this.boneIdx = new Map();
    /* particle build lists */
    this.P = [];            // {bi, lx,ly,lz, w(inv mass), ks, md, gs, r}
    this.Cn = [];           // [i, j, rest, k]
    this.colDefs = (o.colliders || []).slice();
    this.pieces = [];
    this.group = new (T().Group)(); this.group.name = "cloth:" + (rig.id || "char");
    this.ready = false; this.needSnap = true; this.lastX = 0; this.lastY = 0; this.lastZ = 0; this.wasVisible = false;
    this.ground = o.ground === undefined ? true : o.ground;
    this.extra = { x: 0, y: 0, z: 0 };       // extra acceleration on every free particle (updraft while gliding, shock gusts…)
    C.sims.push(this);
  }
  Sim.prototype.bone = function (name) {
    let i = this.boneIdx.get(name);
    if (i === undefined) {
      const b = typeof name === "string" ? this.rig.bones[name] : name;
      if (!b) { console.warn("[cloth] unknown bone", name); return this.bone("hips"); }
      i = this.bones.length; this.bones.push(b); this.boneIdx.set(name, i);
    }
    return i;
  };
  Sim.prototype.addCollider = function (c) { this.colDefs.push(c); return this; };
  Sim.prototype._particle = function (bi, p, w, ks, md, gs, r) {
    this.P.push({ bi: bi, lx: p[0], ly: p[1], lz: p[2], w: w, ks: ks, md: md, gs: gs, r: r || 0.012 });
    return this.P.length - 1;
  };
  Sim.prototype._link = function (i, j, k) {
    const a = this.P[i], b = this.P[j];
    /* rest length measured in the tailored pose (both targets in the same bone space, or close enough) */
    const d = Math.hypot(a.lx - b.lx, a.ly - b.ly, a.lz - b.lz);
    this.Cn.push([i, j, d, k === undefined ? 1 : k]);
  };

  /* --------------------------------------------------------------------------------------------- SHEET */
  Sim.prototype.sheet = function (o) {
    const THREE = T();
    const cols = o.cols, rows = o.rows, loop = !!o.loop, pinRows = o.pinRows === undefined ? 1 : o.pinRows;
    const ks = o.ks || [0.5, 0.03], md = o.maxDist || [0.0, 0.4], gs = o.gs === undefined ? 1 : o.gs;
    const bi0 = this.bone(o.bone);
    const idx = [];
    for (let r = 0; r < rows; r++) {
      const v = rows > 1 ? r / (rows - 1) : 0, row = [];
      for (let c = 0; c < cols; c++) {
        const u = loop ? c / cols : (cols > 1 ? c / (cols - 1) : 0);
        const p = o.rest(u, v, c, r);
        const bi = o.bones ? this.bone(o.bones(u, v)) : bi0;
        const pinned = r < pinRows || (o.pin && o.pin(u, v, c, r));
        const e = Math.pow(v, o.kExp || 1.0);
        row.push(this._particle(bi, p, pinned ? 0 : 1, lerp(ks[0], ks[1], e), lerp(md[0], md[1], Math.pow(v, 1.3)), gs, o.radius || 0.014));
      }
      idx.push(row);
    }
    /* same-bone rest lengths only make sense when both ends share a bone; mixed-bone sheets are authored so the
       targets line up in the bind pose, which is when we measure — so measure in WORLD bind space instead. */
    this._bindLinks = this._bindLinks || [];
    const link = (a, b, k) => this._bindLinks.push([a, b, k]);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const c1 = c + 1 < cols ? c + 1 : (loop ? 0 : -1);
      if (r + 1 < rows) link(idx[r][c], idx[r + 1][c], 1);
      if (c1 >= 0 && r >= pinRows) link(idx[r][c], idx[r][c1], o.kH === undefined ? 0.85 : o.kH);
      if (c1 >= 0 && r + 1 < rows) { link(idx[r][c], idx[r + 1][c1], 0.35); link(idx[r][c1], idx[r + 1][c], 0.35); }
      if (r + 2 < rows) link(idx[r][c], idx[r + 2][c], o.kBend === undefined ? 0.25 : o.kBend);
    }
    /* ---- render shell: outer layer, inner layer (lining), closed along every free edge ---- */
    const vc = loop ? cols + 1 : cols, n1 = vc * rows, nv = n1 * 2;
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
    const cOut = new THREE.Color(o.color === undefined ? 0xffffff : o.color), cIn = new THREE.Color(o.lining === undefined ? (o.color === undefined ? 0xffffff : o.color) : o.lining);
    if (o.lining === undefined) cIn.multiplyScalar(0.62);
    const cTrim = o.trim ? new THREE.Color(o.trim.color) : null, tc = new THREE.Color();
    for (let r = 0; r < rows; r++) for (let c = 0; c < vc; c++) {
      const i = r * vc + c, u = c / (vc - 1), v = rows > 1 ? r / (rows - 1) : 0;
      const tuv = o.uv ? o.uv(u, v) : [u, 1 - v];
      uv[i * 2] = tuv[0]; uv[i * 2 + 1] = tuv[1]; uv[(i + n1) * 2] = tuv[0]; uv[(i + n1) * 2 + 1] = tuv[1];
      tc.copy(cOut);
      if (o.shade) tc.multiplyScalar(o.shade(u, v));
      if (cTrim && r >= rows - (o.trim.rows || 1)) tc.copy(cTrim);
      if (o.paint) { const pc = o.paint(u, v, c, r); if (pc !== undefined && pc !== null) tc.set(pc); }
      col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b;
      col[(i + n1) * 3] = cIn.r; col[(i + n1) * 3 + 1] = cIn.g; col[(i + n1) * 3 + 2] = cIn.b;
    }
    const ind = [];
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < vc - 1; c++) {
      const a = r * vc + c, b = a + 1, d = a + vc, e = d + 1;
      ind.push(a, d, b, b, d, e);                               // outer
      ind.push(a + n1, b + n1, d + n1, b + n1, e + n1, d + n1); // inner (reversed)
    }
    const edge = (a, b) => ind.push(a, b, a + n1, b, b + n1, a + n1);
    for (let c = 0; c < vc - 1; c++) { edge((rows - 1) * vc + c + 1, (rows - 1) * vc + c); edge(c, c + 1); }   // hem + top
    if (!loop) for (let r = 0; r < rows - 1; r++) { edge(r * vc, (r + 1) * vc); edge((r + 1) * vc + vc - 1, r * vc + vc - 1); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aOn", geo.attributes.normal);            // ink outline pushes along the live normals
    geo.setIndex(ind);
    const mesh = this._mesh(geo, o);
    this.pieces.push({ kind: "sheet", idx: idx, cols: cols, rows: rows, vc: vc, loop: loop, th: (o.thickness === undefined ? 0.012 : o.thickness) * 0.5, geo: geo, mesh: mesh, flip: o.flip ? -1 : 1 });
    return mesh;
  };

  /* --------------------------------------------------------------------------------------------- RIBBON */
  Sim.prototype.ribbon = function (o) {
    const THREE = T();
    const pts = o.pts, n = pts.length, R = o.ring || 4;
    const ks = o.ks || [0.5, 0.02], md = o.maxDist || [0.0, 0.5], gs = o.gs === undefined ? 1 : o.gs, pin = o.pin === undefined ? 1 : o.pin;
    const bi = this.bone(o.bone), ids = [];
    for (let i = 0; i < n; i++) {
      const v = n > 1 ? i / (n - 1) : 0;
      ids.push(this._particle(bi, pts[i], i < pin ? 0 : 1, lerp(ks[0], ks[1], Math.pow(v, o.kExp || 1)), lerp(md[0], md[1], Math.pow(v, 1.2)), gs, o.radius || 0.012));
    }
    for (let i = 0; i + 1 < n; i++) this._link(ids[i], ids[i + 1], 1);
    for (let i = 0; i + 2 < n; i++) this._link(ids[i], ids[i + 2], o.kBend === undefined ? 0.3 : o.kBend);
    const nv = n * R + 1;
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
    const c0 = new THREE.Color(o.color === undefined ? 0xffffff : o.color), c1 = new THREE.Color(o.tip === undefined ? (o.color === undefined ? 0xffffff : o.color) : o.tip), tc = new THREE.Color();
    for (let i = 0; i < n; i++) for (let k = 0; k < R; k++) {
      const j = i * R + k, v = i / (n - 1);
      uv[j * 2] = k / R; uv[j * 2 + 1] = 1 - v;
      tc.copy(c0).lerp(c1, Math.pow(v, o.tipExp || 1.6));
      if (o.paint) { const pc = o.paint(v, i, k); if (pc !== undefined && pc !== null) tc.set(pc); }
      col[j * 3] = tc.r; col[j * 3 + 1] = tc.g; col[j * 3 + 2] = tc.b;
    }
    col[(nv - 1) * 3] = c1.r; col[(nv - 1) * 3 + 1] = c1.g; col[(nv - 1) * 3 + 2] = c1.b; uv[(nv - 1) * 2] = 0.5; uv[(nv - 1) * 2 + 1] = 0;
    const ind = [];
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < R; k++) {
      const a = i * R + k, b = i * R + (k + 1) % R, d = a + R, e = b + R;
      ind.push(a, d, b, b, d, e);
    }
    for (let k = 0; k < R; k++) ind.push((n - 1) * R + k, nv - 1, (n - 1) * R + (k + 1) % R);     // tip cap
    for (let k = 1; k < R - 1; k++) ind.push(0, k, k + 1);                                          // root cap
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aOn", geo.attributes.normal);
    geo.setIndex(ind);
    const mesh = this._mesh(geo, o);
    const wA = o.w || [0.05, 0.03], tA = o.t || [0.012, 0.008];
    const prof = [];
    for (let i = 0; i < n; i++) {
      const v = i / (n - 1);
      prof.push(o.profile ? o.profile(v, i) : [lerp(wA[0], wA[1], v) * 0.5, lerp(tA[0], tA[1], v) * 0.5]);
    }
    const side = o.side || [1, 0, 0];
    this.pieces.push({ kind: "ribbon", ids: ids, n: n, R: R, prof: prof, bi: bi, sx: side[0], sy: side[1], sz: side[2], geo: geo, mesh: mesh, tipLen: o.tipLen === undefined ? 0.03 : o.tipLen });
    return mesh;
  };

  Sim.prototype._mesh = function (geo, o) {
    const THREE = T(), A = G.assets;
    let mat = o.mat;
    if (!mat) {
      mat = A.mat.toon(0xffffff, { noCache: true, map: o.map || null, rim: o.rim === undefined ? 1 : o.rim });
      mat.vertexColors = true;
      if (o.emissive) { mat.emissive = new THREE.Color(o.emissive); mat.emissiveIntensity = o.emissiveIntensity || 0.5; }
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.castShadow = o.shadow !== false; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
    mesh.userData.keep = true;
    if (o.outline !== 0 && o.outline !== false) A.outline(mesh, o.outline === undefined ? 0.035 : o.outline, o.outlineColor === undefined ? 0x0d0f14 : o.outlineColor);
    this.group.add(mesh);
    return mesh;
  };

  /* --------------------------------------------------------------------------------------------- finalize */
  Sim.prototype._finalize = function () {
    const n = this.P.length;
    this.n = n;
    this.px = new Float32Array(n); this.py = new Float32Array(n); this.pz = new Float32Array(n);
    this.qx = new Float32Array(n); this.qy = new Float32Array(n); this.qz = new Float32Array(n);      // previous
    this.tx = new Float32Array(n); this.ty = new Float32Array(n); this.tz = new Float32Array(n);      // world targets
    this.nx = new Float32Array(n); this.ny = new Float32Array(n); this.nz = new Float32Array(n);      // per-particle normals (sheets)
    /* bind pose → world, to measure the sheet link rest lengths */
    this.root.updateWorldMatrix(true, true);
    this._targets(1);
    if (this._bindLinks) {
      const s = this._scale || 1;
      for (const L of this._bindLinks) {
        const d = Math.hypot(this.tx[L[0]] - this.tx[L[1]], this.ty[L[0]] - this.ty[L[1]], this.tz[L[0]] - this.tz[L[1]]) / s;
        this.Cn.push([L[0], L[1], d, L[2]]);
      }
      this._bindLinks = null;
    }
    const m = this.Cn.length;
    this.ca = new Uint16Array(m); this.cb = new Uint16Array(m); this.cr = new Float32Array(m); this.ck = new Float32Array(m);
    for (let i = 0; i < m; i++) { this.ca[i] = this.Cn[i][0]; this.cb[i] = this.Cn[i][1]; this.cr[i] = this.Cn[i][2]; this.ck[i] = this.Cn[i][3]; }
    this.cols = this.colDefs.map((c) => ({ bi: this.bone(c.bone), a: c.a || [0, 0, 0], b: c.b || null, r: c.r, ax: 0, ay: 0, az: 0, bx: 0, by: 0, bz: 0, rr: 0 }));
    this.ready = true; this.needSnap = true;
  };

  /* world targets for every particle (+ collider shapes) */
  Sim.prototype._targets = function () {
    const P = this.P, n = P.length, bones = this.bones;
    const rm = this.root.matrixWorld.elements;
    this._scale = Math.hypot(rm[0], rm[1], rm[2]) || 1;
    for (let i = 0; i < n; i++) {
      const p = P[i], e = bones[p.bi].matrixWorld.elements;
      this.tx[i] = e[0] * p.lx + e[4] * p.ly + e[8] * p.lz + e[12];
      this.ty[i] = e[1] * p.lx + e[5] * p.ly + e[9] * p.lz + e[13];
      this.tz[i] = e[2] * p.lx + e[6] * p.ly + e[10] * p.lz + e[14];
    }
    const cs = this.cols;
    if (cs) for (let k = 0; k < cs.length; k++) {
      const c = cs[k], e = bones[c.bi].matrixWorld.elements, a = c.a, b = c.b || c.a;
      c.ax = e[0] * a[0] + e[4] * a[1] + e[8] * a[2] + e[12]; c.ay = e[1] * a[0] + e[5] * a[1] + e[9] * a[2] + e[13]; c.az = e[2] * a[0] + e[6] * a[1] + e[10] * a[2] + e[14];
      c.bx = e[0] * b[0] + e[4] * b[1] + e[8] * b[2] + e[12]; c.by = e[1] * b[0] + e[5] * b[1] + e[9] * b[2] + e[13]; c.bz = e[2] * b[0] + e[6] * b[1] + e[10] * b[2] + e[14];
      c.rr = c.r * Math.hypot(e[0], e[1], e[2]);
    }
  };

  Sim.prototype.reset = function () { this.needSnap = true; };
  Sim.prototype.dispose = function () {
    const i = C.sims.indexOf(this); if (i >= 0) C.sims.splice(i, 1);
    if (this.group.parent) this.group.parent.remove(this.group);
    for (const p of this.pieces) p.geo.dispose();
  };

  /* --------------------------------------------------------------------------------------------- step */
  Sim.prototype.update = function (dt) {
    if (!this.ready) this._finalize();
    /* attach the render group to whatever scene the character is in; hide + re-snap when it is not shown */
    let top = this.root, vis = true;
    while (top.parent) { if (!top.visible) vis = false; top = top.parent; }
    const inScene = !!top.isScene && vis && this.root.visible;
    if (!inScene) { if (this.group.parent) this.group.parent.remove(this.group); this.wasVisible = false; return; }
    if (this.group.parent !== top) top.add(this.group);
    if (!this.wasVisible) { this.needSnap = true; this.wasVisible = true; }

    this.root.updateWorldMatrix(true, true);
    this._targets();
    const n = this.n, P = this.P, px = this.px, py = this.py, pz = this.pz, qx = this.qx, qy = this.qy, qz = this.qz, tx = this.tx, ty = this.ty, tz = this.tz;
    const rp = this.root.matrixWorld.elements, rx = rp[12], ry = rp[13], rz = rp[14], sc = this._scale;
    let jx = rx - this.lastX, jy = ry - this.lastY, jz = rz - this.lastZ;
    this.lastX = rx; this.lastY = ry; this.lastZ = rz;
    if (jx * jx + jy * jy + jz * jz > 6.25) this.needSnap = true;
    if (this.needSnap || dt <= 0) {
      if (this.needSnap) for (let i = 0; i < n; i++) { px[i] = qx[i] = tx[i]; py[i] = qy[i] = ty[i]; pz[i] = qz[i] = tz[i]; }
      else for (let i = 0; i < n; i++) if (P[i].w === 0) { px[i] = tx[i]; py[i] = ty[i]; pz[i] = tz[i]; }
      this.needSnap = false; this._write(); return;
    }
    if (dt > 0.034) dt = 0.034;
    /* the character carries its clothes part of the way: keeps capes readable at dash speeds */
    const f = this.follow;
    if (f > 0) for (let i = 0; i < n; i++) if (P[i].w !== 0) { px[i] += jx * f; py[i] += jy * f; pz[i] += jz * f; qx[i] += jx * f; qy[i] += jy * f; qz[i] += jz * f; }

    const sub = dt > 0.02 ? 2 : 1, h = dt / sub, h2 = h * h, damp = Math.exp(-this.damp * h);
    const W = C.wind, wt = C.time, wk = this.windK * W.gust;
    const groundY = this.ground ? ry + 0.02 * sc : -1e9;
    const ex = this.extra.x * h2, ey = this.extra.y * h2, ez = this.extra.z * h2;
    const ca = this.ca, cb = this.cb, cr = this.cr, ck = this.ck, m = ca.length, cs = this.cols;
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < n; i++) {
        const p = P[i];
        if (p.w === 0) { qx[i] = px[i]; qy[i] = py[i]; qz[i] = pz[i]; px[i] = tx[i]; py[i] = ty[i]; pz[i] = tz[i]; continue; }
        const gust = wk * (0.55 + 0.45 * Math.sin(wt * 1.7 + px[i] * 0.9 + pz[i] * 0.7) + 0.3 * Math.sin(wt * 4.3 + py[i] * 2.1));
        const vx = (px[i] - qx[i]) * damp, vy = (py[i] - qy[i]) * damp, vz = (pz[i] - qz[i]) * damp;
        qx[i] = px[i]; qy[i] = py[i]; qz[i] = pz[i];
        px[i] += vx + W.x * gust * h2 + ex; py[i] += vy - GRAV * p.gs * sc * h2 + ey; pz[i] += vz + W.z * gust * h2 + ez;
        const k = 1 - Math.pow(1 - p.ks, h * 60);
        px[i] += (tx[i] - px[i]) * k; py[i] += (ty[i] - py[i]) * k; pz[i] += (tz[i] - pz[i]) * k;
      }
      for (let it = 0; it < this.iters; it++) {
        for (let c = 0; c < m; c++) {
          const a = ca[c], b = cb[c], wa = P[a].w, wb = P[b].w, ws = wa + wb;
          if (ws === 0) continue;
          let dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6, rest = cr[c] * sc;
          const diff = (d - rest) / d * ck[c] / ws;
          dx *= diff; dy *= diff; dz *= diff;
          px[a] += dx * wa; py[a] += dy * wa; pz[a] += dz * wa;
          px[b] -= dx * wb; py[b] -= dy * wb; pz[b] -= dz * wb;
        }
        if (cs) for (let k = 0; k < cs.length; k++) {
          const c = cs[k], ex = c.bx - c.ax, ey = c.by - c.ay, ez = c.bz - c.az, el2 = ex * ex + ey * ey + ez * ez;
          for (let i = 0; i < n; i++) {
            if (P[i].w === 0) continue;
            let t = 0;
            if (el2 > 1e-8) { t = ((px[i] - c.ax) * ex + (py[i] - c.ay) * ey + (pz[i] - c.az) * ez) / el2; t = t < 0 ? 0 : t > 1 ? 1 : t; }
            const cx = c.ax + ex * t, cy = c.ay + ey * t, cz = c.az + ez * t;
            const dx = px[i] - cx, dy = py[i] - cy, dz = pz[i] - cz, rr = c.rr + P[i].r * sc, d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < rr * rr && d2 > 1e-10) { const d = Math.sqrt(d2), q = (rr - d) / d; px[i] += dx * q; py[i] += dy * q; pz[i] += dz * q; }
          }
        }
      }
      /* tether to the tailored shape + ground */
      for (let i = 0; i < n; i++) {
        const p = P[i]; if (p.w === 0) continue;
        const dx = px[i] - tx[i], dy = py[i] - ty[i], dz = pz[i] - tz[i], d2 = dx * dx + dy * dy + dz * dz, mdv = p.md * sc;
        if (d2 > mdv * mdv) { const q = mdv / Math.sqrt(d2); px[i] = tx[i] + dx * q; py[i] = ty[i] + dy * q; pz[i] = tz[i] + dz * q; }
        if (py[i] < groundY) { py[i] = groundY; px[i] -= (px[i] - qx[i]) * 0.5; pz[i] -= (pz[i] - qz[i]) * 0.5; }
      }
    }
    this._write();
  };

  /* --------------------------------------------------------------------------------------------- particles → vertices */
  Sim.prototype._write = function () {
    const px = this.px, py = this.py, pz = this.pz, sc = this._scale || 1;
    for (let q = 0; q < this.pieces.length; q++) {
      const pc = this.pieces[q], pos = pc.geo.attributes.position.array, nor = pc.geo.attributes.normal.array;
      if (pc.kind === "sheet") {
        const idx = pc.idx, cols = pc.cols, rows = pc.rows, vc = pc.vc, loop = pc.loop, th = pc.th * sc, n1 = vc * rows, fl = pc.flip;
        for (let r = 0; r < rows; r++) for (let c = 0; c < vc; c++) {
          const cc = c % cols, i = idx[r][cc];
          const cl = cc > 0 ? cc - 1 : (loop ? cols - 1 : cc), cr2 = cc + 1 < cols ? cc + 1 : (loop ? 0 : cc);
          const ru = r > 0 ? r - 1 : r, rd = r + 1 < rows ? r + 1 : r;
          const a = idx[r][cl], b = idx[r][cr2], u = idx[ru][cc], d = idx[rd][cc];
          const hx = px[b] - px[a], hy = py[b] - py[a], hz = pz[b] - pz[a], vx = px[d] - px[u], vy = py[d] - py[u], vz = pz[d] - pz[u];
          let nx = (vy * hz - vz * hy) * fl, ny = (vz * hx - vx * hz) * fl, nz = (vx * hy - vy * hx) * fl;
          const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= nl; ny /= nl; nz /= nl;
          const o = (r * vc + c) * 3, o2 = o + n1 * 3;
          pos[o] = px[i] + nx * th; pos[o + 1] = py[i] + ny * th; pos[o + 2] = pz[i] + nz * th;
          pos[o2] = px[i] - nx * th; pos[o2 + 1] = py[i] - ny * th; pos[o2 + 2] = pz[i] - nz * th;
          nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz; nor[o2] = -nx; nor[o2 + 1] = -ny; nor[o2 + 2] = -nz;
        }
      } else {
        const ids = pc.ids, n = pc.n, R = pc.R, e = this.bones[pc.bi].matrixWorld.elements;
        /* width axis from the anchor bone, re-orthogonalised along the chain */
        let sx = e[0] * pc.sx + e[4] * pc.sy + e[8] * pc.sz, sy = e[1] * pc.sx + e[5] * pc.sy + e[9] * pc.sz, sz = e[2] * pc.sx + e[6] * pc.sy + e[10] * pc.sz;
        let tx = 0, ty = -1, tz = 0;
        for (let i = 0; i < n; i++) {
          const a = ids[i > 0 ? i - 1 : 0], b = ids[i + 1 < n ? i + 1 : n - 1], p = ids[i];
          let dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a]; const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dl > 1e-6) { tx = dx / dl; ty = dy / dl; tz = dz / dl; }
          const dp = sx * tx + sy * ty + sz * tz; sx -= tx * dp; sy -= ty * dp; sz -= tz * dp;
          let sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
          if (sl < 1e-4) { sx = tz; sy = 0; sz = -tx; sl = Math.sqrt(sx * sx + sz * sz) || 1; }
          sx /= sl; sy /= sl; sz /= sl;
          const bx = ty * sz - tz * sy, by = tz * sx - tx * sz, bz = tx * sy - ty * sx;       // thickness axis
          const hw = pc.prof[i][0] * sc, ht = pc.prof[i][1] * sc;
          for (let k = 0; k < R; k++) {
            const ang = (k / R) * Math.PI * 2 + (R === 4 ? Math.PI / 4 : 0);
            let cu = Math.cos(ang), su = Math.sin(ang);
            if (R === 4) { cu = cu > 0 ? 1 : -1; su = su > 0 ? 1 : -1; }
            const o = (i * R + k) * 3;
            pos[o] = px[p] + sx * cu * hw + bx * su * ht; pos[o + 1] = py[p] + sy * cu * hw + by * su * ht; pos[o + 2] = pz[p] + sz * cu * hw + bz * su * ht;
            /* normals lean toward the flat faces so tapes shade as tapes */
            const fw = R === 4 ? 0.35 : 1, nx = sx * cu * fw + bx * su, ny = sy * cu * fw + by * su, nz = sz * cu * fw + bz * su, nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            nor[o] = nx / nl; nor[o + 1] = ny / nl; nor[o + 2] = nz / nl;
          }
        }
        const last = ids[n - 1], o = n * R * 3, tl = pc.tipLen * sc;
        pos[o] = px[last] + tx * tl; pos[o + 1] = py[last] + ty * tl; pos[o + 2] = pz[last] + tz * tl;
        nor[o] = tx; nor[o + 1] = ty; nor[o + 2] = tz;
      }
      pc.geo.attributes.position.needsUpdate = true; pc.geo.attributes.normal.needsUpdate = true;
    }
  };

  /* --------------------------------------------------------------------------------------------- module API */
  C.create = function (rig, o) { const s = new Sim(rig, o); rig.cloth = s; return s; };
  C.updateAll = function (dt) {
    if (!C.enabled) return;
    C.time += dt;
    for (let i = 0; i < C.sims.length; i++) {
      try { C.sims[i].update(dt); } catch (e) { if (!C._warned) { C._warned = true; console.error("[cloth]", e); } }
    }
  };
  C.resetAll = function () { for (const s of C.sims) s.needSnap = true; };
  /* helper: default body colliders for a humanoid rig (chest, hips, head, thighs) in units of the rig's height */
  C.bodyColliders = function (rig, k) {
    k = k || {};
    const H = (rig.height || 1.6) / 1.6, B = rig.bones, out = [];
    if (B.hips) out.push({ bone: "hips", a: [0, 0.02 * H, 0], r: (k.hips || 0.13) * H });
    if (B.chest) out.push({ bone: "chest", a: [0, 0.1 * H, 0], r: (k.chest || 0.125) * H });
    if (B.head && k.head !== 0) out.push({ bone: "head", a: [0, (k.headY === undefined ? 0.1 : k.headY) * H, 0], r: (k.head || 0.115) * H });
    for (const S of ["L", "R"]) {
      const hip = B["leg" + S + ".hip"], knee = B["leg" + S + ".knee"], foot = B["leg" + S + ".foot"];
      if (hip && knee) out.push({ bone: "leg" + S + ".hip", a: [0, 0, 0], b: [knee.position.x, knee.position.y, knee.position.z], r: (k.thigh || 0.07) * H });
      if (knee && foot && k.shin !== 0) out.push({ bone: "leg" + S + ".knee", a: [0, 0, 0], b: [foot.position.x, foot.position.y, foot.position.z], r: (k.shin || 0.055) * H });
      if (foot && k.foot !== 0) out.push({ bone: "leg" + S + ".foot", a: [0, -0.01 * H, 0], b: [0, -0.05 * H, 0.1 * H], r: (k.foot || 0.062) * H });
    }
    return out;
  };
})();
