/* ============================================================================
   SPOREHEART — src/char_thistle.js
   THISTLE & HOB — the mend-and-strafe ally.

   Thistle: a pale, deadpan girl with mint braids, two orange ram-horn bobbles,
   red war-paint, a lime rune-painted poncho, cross straps and a big olive pack.
   Hob: the three-eyed, grumbling hood-ghost riding that pack.

   Everything is procedural: lofted sweeps, parametric cloth/hair surfaces,
   rounded boxes, canvas-painted decals/textures, vertex-colour baked groups
   (one geometry + one ink outline per rigid bone group).

   parts: root, body, head, chest, hob, hobEyes, hobMouth, lantern, potionHand,
          vial, plus the SPEC rig nodes (hips/neck/armL/armR/legL/legR/propR/propL...)
   clips: idle, summon, cast, fire, salute, walk (+ run, hit as bonuses)
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  if (!G || !G.kit || !G.chars) throw new Error("char_thistle.js requires charakit.js + characters.js");
  const K = G.kit, U = G.util;
  const T = () => G.THREE;
  const A = () => G.assets;
  const PI = Math.PI, TAU = PI * 2;
  const KF = K.kf;
  const DEF = { height: 1.4, radius: 0.32, team: "player" };

  /* ==========================================================================
     0. SMALL MATH / NOISE
     ========================================================================== */
  const sstep = (a, b, x) => { const t = U.clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = U.lerp;
  function hash2(x, y) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function rngMaker(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ==========================================================================
     1. PALETTE (sampled from refs/codex2.jpg, lifted a touch for the toon ramp)
     ========================================================================== */
  const C = {
    skin: 0xf8e2dc, skinSh: 0xe9c9cc, earIn: 0xe8706c, lip: 0xb85a62,
    hair: 0xbdeadb, hairLt: 0xdcf7ee, hairDk: 0x86c4b1, braidTie: 0xe6f4f1,
    horn: 0xf6862f, hornDk: 0x8a4a1a, hornIn: 0x2b1409, hornWhite: 0xf3ecec,
    collar: 0x0f6150, collarDk: 0x0a4639, brass: 0xd9a443, brassDk: 0x9a6f26,
    coat: 0x1b7a66, coatDk: 0x0f5848,
    lime: 0xb7c83a, limeDk: 0x8aa22c, glyph: 0xf4e27a,
    strap: 0xff7f30, strapDk: 0xd8581c, buckle: 0xf4f1e8, steel: 0xaab3b6,
    leather: 0x7a5d3a, leatherDk: 0x4a3827, leatherLt: 0x9a7a4e, olive: 0x7f8e55, oliveDk: 0x5a6a3c,
    pants: 0x86b2d2, pantsDk: 0x6c97ba, patch: 0x5f95bd, stitch: 0xeee4c8,
    boot: 0x5a4533, bootLt: 0x7a6248, sole: 0x2c2219,
    skinHand: 0xf3d3cf,
    pack: 0xa8a574, packDk: 0x838258, packLt: 0xbab787, packTaupe: 0xa28d88, packTaupeDk: 0x7a6563,
    wood: 0x8d7757, woodDk: 0x5f4d3a, woodKnot: 0x44382b,
    hobHood: 0x8db856, hobHoodDk: 0x5f8c3f, hobHoodLt: 0xaed36e,
    hobFace: 0xeee7c8, hobFaceSh: 0xd3ccae, hobBody: 0x9cc470, hobBelly: 0xe3dfb8, hobBib: 0xff7a35,
    hobRing: 0xffe21c, hobPupil: 0x0a0c08, hobMouth: 0x3a1218,
    jarGlow: 0xff4a1c, jarCap: 0xc4c92c, jarCapDk: 0x8a9020, jarBand: 0xf3f0e4,
    amber: 0xffb02e, cord: 0x6d6a2a, scarf: 0x9fbdb8, scarfDk: 0x7ea09c
  };

  /* ==========================================================================
     2. GEOMETRY TOOLKIT (all THREE access lazy — builder time only)
     ========================================================================== */
  /* Bake: welds many positioned primitives into one vertex-coloured geometry. */
  function Bake() {
    const THREE = T();
    this.P = []; this.N = []; this.U = []; this.Cc = []; this.I = []; this.n = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._nm = new THREE.Matrix3();
    this._v = new THREE.Vector3(); this._nv = new THREE.Vector3(); this._c = new THREE.Color();
  }
  /* o: p,r,s,order  col(hex)  grad:[hexB,y0,y1] (lerp col->hexB along final y)  shade(x,y,z,nx,ny,nz)->mul  ds(double)  */
  Bake.prototype.add = function (g, hex, o) {
    o = o || {};
    const p = o.p || [0, 0, 0], r = o.r || [0, 0, 0];
    let s = o.s; if (s === undefined) s = [1, 1, 1]; else if (typeof s === "number") s = [s, s, s];
    this._e.set(r[0], r[1], r[2], o.order || "XYZ");
    this._q.setFromEuler(this._e);
    this._m.compose(this._p.set(p[0], p[1], p[2]), this._q, this._s.set(s[0], s[1], s[2]));
    this._nm.getNormalMatrix(this._m);
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const c0 = this._c.set(hex);
    const r0 = c0.r, g0 = c0.g, b0 = c0.b;
    let r1 = r0, g1 = g0, b1 = b0, gy0 = 0, gy1 = 1;
    if (o.grad) { const c1 = new (T().Color)(o.grad[0]); r1 = c1.r; g1 = c1.g; b1 = c1.b; gy0 = o.grad[1]; gy1 = o.grad[2]; }
    const base = this.n, cnt = pos.count;
    const flip = (s[0] * s[1] * s[2]) < 0;
    for (let i = 0; i < cnt; i++) {
      this._v.fromBufferAttribute(pos, i).applyMatrix4(this._m);
      this._nv.fromBufferAttribute(nor, i).applyMatrix3(this._nm).normalize();
      if (flip) this._nv.multiplyScalar(-1);
      this.P.push(this._v.x, this._v.y, this._v.z);
      this.N.push(this._nv.x, this._nv.y, this._nv.z);
      if (uv) this.U.push(uv.getX(i), uv.getY(i)); else this.U.push(0, 0);
      let mr = r0, mg = g0, mb = b0;
      if (o.grad) { const t = U.clamp01((this._v.y - gy0) / (gy1 - gy0)); mr = lerp(r0, r1, t); mg = lerp(g0, g1, t); mb = lerp(b0, b1, t); }
      let k = 1;
      if (o.shade) k = o.shade(this._v.x, this._v.y, this._v.z, this._nv.x, this._nv.y, this._nv.z);
      this.Cc.push(mr * k, mg * k, mb * k);
    }
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        if (flip) this.I.push(base + idx.getX(i), base + idx.getX(i + 2), base + idx.getX(i + 1));
        else this.I.push(base + idx.getX(i), base + idx.getX(i + 1), base + idx.getX(i + 2));
      }
    } else {
      for (let i = 0; i < cnt; i += 3) {
        if (flip) this.I.push(base + i, base + i + 2, base + i + 1); else this.I.push(base + i, base + i + 1, base + i + 2);
      }
    }
    this.n += cnt;
    return this;
  };
  Bake.prototype.build = function () {
    const THREE = T();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.U, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.Cc, 3));
    g.setIndex(this.I);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  };

  /* parametric grid surface. fn(u,v,out) fills out[0..2]. */
  function surf(nu, nv, fn, o) {
    o = o || {};
    const THREE = T();
    const cnt = (nu + 1) * (nv + 1);
    const pos = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), out = [0, 0, 0];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, k = j * (nu + 1) + i;
      fn(u, v, out);
      pos[k * 3] = out[0]; pos[k * 3 + 1] = out[1]; pos[k * 3 + 2] = out[2];
      uv[k * 2] = u * (o.us || 1); uv[k * 2 + 1] = 1 - v;
    }
    const idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + nu + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    /* auto-orient: outward = away from centre */
    let cx = o.center ? o.center[0] : 0, cy = o.center ? o.center[1] : 0, cz = o.center ? o.center[2] : 0;
    if (!o.center) { for (let k = 0; k < cnt; k++) { cx += pos[k * 3]; cy += pos[k * 3 + 1]; cz += pos[k * 3 + 2]; } cx /= cnt; cy /= cnt; cz /= cnt; }
    const nor = g.attributes.normal;
    let dsum = 0;
    for (let k = 0; k < cnt; k++) dsum += nor.getX(k) * (pos[k * 3] - cx) + nor.getZ(k) * (pos[k * 3 + 2] - cz) + nor.getY(k) * (pos[k * 3 + 1] - cy) * (o.yw === undefined ? 1 : o.yw);
    if ((dsum < 0) !== !!o.invert) {
      const ia = g.index.array;
      for (let q = 0; q < ia.length; q += 3) { const t = ia[q + 1]; ia[q + 1] = ia[q + 2]; ia[q + 2] = t; }
      g.computeVertexNormals();
    }
    fixSeam(g, nu, nv, o.wrapU);
    return g;
  }
  function fixSeam(g, nu, nv, wrapU) {
    const nor = g.attributes.normal, pos = g.attributes.position;
    const rowW = nu + 1;
    if (wrapU) {
      for (let j = 0; j <= nv; j++) {
        const a = j * rowW, b = a + nu;
        const x = nor.getX(a) + nor.getX(b), y = nor.getY(a) + nor.getY(b), z = nor.getZ(a) + nor.getZ(b), l = Math.hypot(x, y, z) || 1;
        nor.setXYZ(a, x / l, y / l, z / l); nor.setXYZ(b, x / l, y / l, z / l);
      }
    }
    /* pole rows: average normals when the row collapses to a point */
    for (const j of [0, nv]) {
      const a = j * rowW;
      let same = true;
      for (let i = 1; i <= nu; i++) if (Math.abs(pos.getX(a + i) - pos.getX(a)) > 1e-5 || Math.abs(pos.getY(a + i) - pos.getY(a)) > 1e-5 || Math.abs(pos.getZ(a + i) - pos.getZ(a)) > 1e-5) { same = false; break; }
      if (same) {
        let x = 0, y = 0, z = 0;
        for (let i = 0; i <= nu; i++) { x += nor.getX(a + i); y += nor.getY(a + i); z += nor.getZ(a + i); }
        const l = Math.hypot(x, y, z) || 1;
        for (let i = 0; i <= nu; i++) nor.setXYZ(a + i, x / l, y / l, z / l);
      }
    }
    nor.needsUpdate = true;
  }

  /* lofted tube along a Catmull-Rom path. ctrl: [x,y,z, rx, rz?]. caps: 0 open, 1 round, 2 flat. */
  function sweep(ctrl, o) {
    o = o || {};
    const THREE = T();
    const seg = o.seg || 8, sub = o.sub || 4, n = ctrl.length;
    const S = [];
    const cr = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
    for (let i = 0; i < n - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
      const last = i === n - 2;
      for (let k = 0; k < sub + (last ? 1 : 0); k++) {
        const t = k / sub, e = o.rlin ? t : t * t * (3 - 2 * t);
        const rx1 = p1[3], rx2 = p2[3], rz1 = p1[4] === undefined ? p1[3] : p1[4], rz2 = p2[4] === undefined ? p2[3] : p2[4];
        S.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t), cr(p0[2], p1[2], p2[2], p3[2], t),
          lerp(rx1, rx2, e), lerp(rz1, rz2, e)]);
      }
    }
    const m = S.length;
    const rings = [];
    let Nx = 0, Ny = 0, Nz = 0;
    const up = o.up || [0, 0, 1];
    for (let i = 0; i < m; i++) {
      const a = S[Math.max(0, i - 1)], b = S[Math.min(m - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      if (i === 0) {
        Nx = up[0]; Ny = up[1]; Nz = up[2];
        if (Math.abs(Nx * tx + Ny * ty + Nz * tz) > 0.95) { Nx = 1; Ny = 0; Nz = 0; }
      }
      const d = Nx * tx + Ny * ty + Nz * tz;
      Nx -= tx * d; Ny -= ty * d; Nz -= tz * d;
      const nl = Math.hypot(Nx, Ny, Nz) || 1; Nx /= nl; Ny /= nl; Nz /= nl;
      const Bx = ty * Nz - tz * Ny, By = tz * Nx - tx * Nz, Bz = tx * Ny - ty * Nx;
      rings.push({ p: S[i], t: [tx, ty, tz], n: [Nx, Ny, Nz], b: [Bx, By, Bz], rx: S[i][3], rz: S[i][4], off: 0, sc: 1 });
    }
    const lst = [];
    if (o.capS) {
      const r = rings[0], rm = (r.rx + r.rz) * 0.5;
      if (o.capS === 2) lst.push({ ...r, sc: 0.0001, off: 0 });
      else for (let k = 4; k >= 1; k--) { const ph = k / 4 * PI * 0.5; lst.push({ ...r, sc: Math.cos(ph), off: -rm * Math.sin(ph) * (o.capLen || 1) }); }
    }
    for (const r of rings) lst.push(r);
    if (o.capE) {
      const r = rings[m - 1], rm = (r.rx + r.rz) * 0.5;
      if (o.capE === 2) lst.push({ ...r, sc: 0.0001, off: 0 });
      else for (let k = 1; k <= 4; k++) { const ph = k / 4 * PI * 0.5; lst.push({ ...r, sc: Math.max(0.0001, Math.cos(ph)), off: rm * Math.sin(ph) * (o.capLen || 1) }); }
    }
    const R = lst.length, W = seg + 1;
    const pos = new Float32Array(R * W * 3), uv = new Float32Array(R * W * 2);
    for (let i = 0; i < R; i++) {
      const r = lst[i];
      for (let k = 0; k <= seg; k++) {
        const a = k / seg * TAU, ca = Math.cos(a) * r.rx * r.sc, sa = Math.sin(a) * r.rz * r.sc;
        const q = (i * W + k) * 3;
        pos[q] = r.p[0] + r.n[0] * ca + r.b[0] * sa + r.t[0] * r.off;
        pos[q + 1] = r.p[1] + r.n[1] * ca + r.b[1] * sa + r.t[1] * r.off;
        pos[q + 2] = r.p[2] + r.n[2] * ca + r.b[2] * sa + r.t[2] * r.off;
        uv[(i * W + k) * 2] = k / seg; uv[(i * W + k) * 2 + 1] = i / (R - 1);
      }
    }
    const idx = [];
    for (let i = 0; i < R - 1; i++) for (let k = 0; k < seg; k++) {
      const a = i * W + k, b = a + W;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    fixSeam(g, seg, R - 1, true);
    return g;
  }

  /* rounded box with analytic smooth normals and tan-spaced rounding rings */
  function rbox(w, h, d, r, m, ni) {
    const THREE = T();
    m = m || 3; ni = ni === undefined ? 1 : ni;
    const H = [w / 2, h / 2, d / 2];
    r = Math.min(r, H[0] * 0.98, H[1] * 0.98, H[2] * 0.98);
    const hi = [H[0] - r, H[1] - r, H[2] - r];
    const coords = (a) => {
      const l = [];
      for (let k = 0; k <= m; k++) l.push(-(hi[a] + r * Math.tan(PI / 4 * (1 - k / m))));
      /* l: from -H (k=0) to -hi (k=m) */
      for (let q = 1; q < ni; q++) l.push(lerp(-hi[a], hi[a], q / ni));
      const pos = [];
      for (let k = m; k >= 0; k--) pos.push(hi[a] + r * Math.tan(PI / 4 * (1 - k / m)));
      return l.concat(pos);
    };
    const cs = [coords(0), coords(1), coords(2)];
    const P = [], N = [], Uv = [], I = [];
    for (let ax = 0; ax < 3; ax++) for (let sg = -1; sg <= 1; sg += 2) {
      const b = (ax + 1) % 3, c = (ax + 2) % 3, nb = cs[b].length, nc = cs[c].length;
      const base = P.length / 3;
      for (let j = 0; j < nc; j++) for (let i = 0; i < nb; i++) {
        const p = [0, 0, 0]; p[ax] = sg * H[ax]; p[b] = cs[b][i]; p[c] = cs[c][j];
        const inn = [Math.max(-hi[0], Math.min(hi[0], p[0])), Math.max(-hi[1], Math.min(hi[1], p[1])), Math.max(-hi[2], Math.min(hi[2], p[2]))];
        const dx = p[0] - inn[0], dy = p[1] - inn[1], dz = p[2] - inn[2], dl = Math.hypot(dx, dy, dz) || 1;
        const nx = dx / dl, ny = dy / dl, nz = dz / dl;
        P.push(inn[0] + nx * r, inn[1] + ny * r, inn[2] + nz * r);
        N.push(nx, ny, nz);
        Uv.push(p[b] / (2 * H[b]) + 0.5, p[c] / (2 * H[c]) + 0.5);
      }
      for (let j = 0; j < nc - 1; j++) for (let i = 0; i < nb - 1; i++) {
        const a = base + j * nb + i, bb = a + nb;
        if (sg > 0) I.push(a, a + 1, bb, a + 1, bb + 1, bb); else I.push(a, bb, a + 1, a + 1, bb, bb + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(Uv, 2));
    g.setIndex(I);
    return g;
  }

  /* curved quad/disc patch lying on a sphere of radius R in its own tangent frame (centre at origin, faces +Z). */
  function capQuad(R, w, h, nx, ny) {
    const THREE = T();
    nx = nx || 6; ny = ny || 6;
    return surf(nx, ny, (u, v, out) => {
      const x = (u - 0.5) * w, y = (0.5 - v) * h;
      out[0] = x; out[1] = y; out[2] = Math.sqrt(Math.max(1e-6, R * R - x * x - y * y)) - R;
    }, { center: [0, 0, -R], invert: false });
  }
  function capDisc(R, rx, ry, seg) {
    seg = seg || 20;
    return surf(seg, 3, (u, v, out) => {
      const a = u * TAU, rho = v;
      const x = rx * rho * Math.cos(a), y = ry * rho * Math.sin(a);
      out[0] = x; out[1] = y; out[2] = Math.sqrt(Math.max(1e-6, R * R - x * x - y * y)) - R;
    }, { center: [0, 0, -R], wrapU: true });
  }

  /* blunt/tapered hair card hanging from y=0 down to -len; double sided use. */
  function card(w, len, o) {
    o = o || {};
    const rows = o.rows || 5, tipW = o.tip === undefined ? 0.35 : o.tip, bend = o.bend || 0, jag = o.jag || 0;
    return surf(2, rows, (u, v, out) => {
      const ww = w * lerp(1, tipW, Math.pow(v, 1.6));
      const x = (u - 0.5) * ww + (o.sweepX || 0) * v * v * w;
      out[0] = x; out[1] = -len * v + (v >= 1 ? -jag * (u - 0.5) : 0); out[2] = bend * v * v * len;
    }, { center: [0, 0, -1] });
  }

  /* ==========================================================================
     3. CACHES + CANVAS TEXTURES
     ========================================================================== */
  const GEO = Object.create(null);
  const memo = (k, fn) => GEO[k] || (GEO[k] = fn());
  const TEXC = Object.create(null);
  function paintTex(key, w, h, draw, repeat) {
    if (TEXC[key]) return TEXC[key];
    const THREE = T();
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d"), w, h);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (repeat) tex.wrapS = THREE.RepeatWrapping;
    TEXC[key] = tex;
    return tex;
  }
  const hexs = (n, a) => {
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return a === undefined ? "rgb(" + r + "," + g + "," + b + ")" : "rgba(" + r + "," + g + "," + b + "," + a + ")";
  };
  function brush(c, x0, y0, x1, y1, w0, w1) {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    c.beginPath();
    c.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); c.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
    c.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); c.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2);
    c.closePath(); c.fill();
  }

  /* face decal: az in [-1.15,1.15], el in [-0.95, 0.60] */
  const FACE = { az: 1.15, el0: 0.60, el1: -0.95 };
  function texFace() {
    return paintTex("face", 512, 512, (c, w, h) => {
      const X = (az) => (az + FACE.az) / (2 * FACE.az) * w, Y = (el) => (FACE.el0 - el) / (FACE.el0 - FACE.el1) * h;
      c.clearRect(0, 0, w, h);
      /* soft lilac shade under the fringe */
      let g = c.createLinearGradient(0, Y(0.36), 0, Y(0.12));
      g.addColorStop(0, "rgba(150,130,175,0.30)"); g.addColorStop(1, "rgba(150,130,175,0)");
      c.fillStyle = g; c.fillRect(X(-0.95), Y(0.36), X(0.95) - X(-0.95), Y(0.12) - Y(0.36));
      /* blush */
      for (let s = -1; s <= 1; s += 2) {
        const cx = X(s * 0.58), cy = Y(-0.24);
        g = c.createRadialGradient(cx, cy, 2, cx, cy, 78);
        g.addColorStop(0, "rgba(250,140,140,0.62)"); g.addColorStop(0.6, "rgba(250,150,150,0.28)"); g.addColorStop(1, "rgba(250,150,150,0)");
        c.fillStyle = g; c.fillRect(cx - 90, cy - 90, 180, 180);
      }
      const nx = X(0), ny = Y(-0.36);
      g = c.createRadialGradient(nx, ny, 2, nx, ny, 40);
      g.addColorStop(0, "rgba(246,130,140,0.55)"); g.addColorStop(1, "rgba(246,130,140,0)");
      c.fillStyle = g; c.fillRect(nx - 50, ny - 50, 100, 100);
      /* war-paint: two diagonal red stripes per cheek, outer-high to inner-low */
      for (let s = -1; s <= 1; s += 2) {
        c.fillStyle = "rgba(214,70,64,0.96)";
        brush(c, X(s * 0.86), Y(-0.17), X(s * 0.50), Y(-0.37), 15, 22);
        c.fillStyle = "rgba(226,92,78,0.96)";
        brush(c, X(s * 0.82), Y(-0.36), X(s * 0.56), Y(-0.52), 13, 18);
        c.fillStyle = "rgba(255,170,150,0.35)";
        brush(c, X(s * 0.80), Y(-0.19), X(s * 0.56), Y(-0.33), 4, 5);
      }
      /* brows: pale mint strokes, inner end lower (serious) */
      c.lineCap = "round";
      for (let s = -1; s <= 1; s += 2) {
        c.strokeStyle = "rgba(158,214,196,0.95)"; c.lineWidth = 7;
        c.beginPath(); c.moveTo(X(s * 0.20), Y(0.255)); c.quadraticCurveTo(X(s * 0.42), Y(0.31), X(s * 0.66), Y(0.215)); c.stroke();
      }
      /* nose + mouth */
      c.strokeStyle = "rgba(176,92,108,0.85)"; c.lineWidth = 4;
      c.beginPath(); c.moveTo(X(-0.035), Y(-0.355)); c.lineTo(X(0.0), Y(-0.40)); c.lineTo(X(0.035), Y(-0.37)); c.stroke();
      c.strokeStyle = "rgba(120,52,66,0.95)"; c.lineWidth = 5; c.lineJoin = "round";
      c.beginPath(); c.moveTo(X(-0.085), Y(-0.625)); c.lineTo(X(-0.045), Y(-0.665)); c.lineTo(X(0.05), Y(-0.665)); c.lineTo(X(0.09), Y(-0.63)); c.stroke();
      /* tiny chin shade */
      g = c.createRadialGradient(X(0), Y(-0.86), 2, X(0), Y(-0.86), 60);
      g.addColorStop(0, "rgba(200,160,190,0.28)"); g.addColorStop(1, "rgba(200,160,190,0)");
      c.fillStyle = g; c.fillRect(X(0) - 70, Y(-0.86) - 70, 140, 140);
    });
  }

  function texEye(mirror) {
    return paintTex("eye" + (mirror ? "R" : "L"), 256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.save();
      if (mirror) { c.translate(w, 0); c.scale(-1, 1); }
      const lens = () => {
        c.beginPath(); c.moveTo(18, 150);
        c.bezierCurveTo(46, 74, 160, 40, 238, 118);
        c.bezierCurveTo(206, 218, 74, 232, 18, 150);
        c.closePath();
      };
      lens(); c.fillStyle = "#fdf3ec"; c.fill();
      c.save(); lens(); c.clip();
      /* iris */
      const cx = 132, cy = 138;
      let g = c.createRadialGradient(cx, cy + 20, 6, cx, cy, 82);
      g.addColorStop(0, "#f2f463"); g.addColorStop(0.45, "#a6d636"); g.addColorStop(0.85, "#3f9a2c"); g.addColorStop(1, "#1d4b1c");
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 80, 0, TAU); c.fill();
      /* darker upper iris from the lid shadow */
      g = c.createLinearGradient(0, 50, 0, 140);
      g.addColorStop(0, "rgba(10,40,10,0.62)"); g.addColorStop(1, "rgba(10,40,10,0)");
      c.fillStyle = g; c.fillRect(0, 40, w, 110);
      c.fillStyle = "#0b100c"; c.beginPath(); c.ellipse(cx, cy - 4, 25, 31, 0, 0, TAU); c.fill();
      c.fillStyle = "rgba(255,255,255,0.96)"; c.beginPath(); c.arc(cx - 26, cy - 30, 15, 0, TAU); c.fill();
      c.fillStyle = "rgba(255,255,255,0.7)"; c.beginPath(); c.arc(cx + 28, cy + 36, 8, 0, TAU); c.fill();
      /* lid shadow on the sclera */
      g = c.createLinearGradient(0, 60, 0, 110);
      g.addColorStop(0, "rgba(120,70,90,0.30)"); g.addColorStop(1, "rgba(120,70,90,0)");
      c.fillStyle = g; c.fillRect(0, 50, w, 70);
      c.restore();
      /* heavy upper lid + flick */
      c.lineCap = "round"; c.lineJoin = "round";
      c.strokeStyle = "#2a1620"; c.lineWidth = 17;
      c.beginPath(); c.moveTo(14, 152); c.bezierCurveTo(46, 74, 160, 40, 238, 118); c.stroke();
      c.lineWidth = 11; c.beginPath(); c.moveTo(232, 114); c.quadraticCurveTo(246, 108, 252, 92); c.stroke();
      c.strokeStyle = "rgba(120,72,92,0.7)"; c.lineWidth = 6;
      c.beginPath(); c.moveTo(34, 182); c.bezierCurveTo(80, 226, 190, 220, 224, 140); c.stroke();
      c.restore();
    });
  }

  /* hair cap: strands run down v */
  function texHair() {
    return paintTex("hair", 512, 512, (c, w, h) => {
      const R = rngMaker(77);
      let g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#b5e6d6"); g.addColorStop(0.55, "#bdeadb"); g.addColorStop(1, "#a6dccb");
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      /* angel ring */
      g = c.createLinearGradient(0, h * 0.14, 0, h * 0.42);
      g.addColorStop(0, "rgba(235,255,248,0)"); g.addColorStop(0.5, "rgba(235,255,248,0.55)"); g.addColorStop(1, "rgba(235,255,248,0)");
      c.fillStyle = g; c.fillRect(0, h * 0.14, w, h * 0.28);
      /* strands */
      c.lineCap = "round";
      for (let i = 0; i < 150; i++) {
        const x = R() * w, y0 = R() * h * 0.5, len = h * (0.35 + R() * 0.65), light = R() > 0.45;
        c.strokeStyle = light ? "rgba(236,255,250," + (0.18 + R() * 0.35) + ")" : "rgba(104,168,150," + (0.14 + R() * 0.3) + ")";
        c.lineWidth = 1 + R() * 3;
        c.beginPath(); c.moveTo(x, y0);
        c.bezierCurveTo(x + (R() - 0.5) * 6, y0 + len * 0.35, x + (R() - 0.5) * 8, y0 + len * 0.7, x + (R() - 0.5) * 6, y0 + len);
        c.stroke();
      }
      /* shadowed roots/ends */
      g = c.createLinearGradient(0, h * 0.82, 0, h);
      g.addColorStop(0, "rgba(90,150,134,0)"); g.addColorStop(1, "rgba(90,150,134,0.34)");
      c.fillStyle = g; c.fillRect(0, h * 0.82, w, h * 0.18);
    }, true);
  }

  /* poncho: u wraps around (0.5 = front), v from neck (0) to hem (1) */
  const GLYPHS = [
    [[[0.5, 0], [0.5, 1]], [[0.5, 0.45], [0.95, 0.1]], [[0.5, 0.55], [0.05, 0.95]]],
    [[[0.1, 0.05], [0.9, 0.95]], [[0.9, 0.05], [0.1, 0.95]], [[0.5, 0.0], [0.5, 0.25]]],
    [[[0.15, 0.0], [0.5, 0.55]], [[0.85, 0.0], [0.5, 0.55]], [[0.5, 0.55], [0.5, 1.0]], [[0.15, 0.78], [0.85, 0.78]]],
    [[[0.1, 0.1], [0.7, 0.0]], [[0.7, 0.0], [0.2, 0.5]], [[0.2, 0.5], [0.85, 0.42]], [[0.85, 0.42], [0.3, 1.0]]],
    [[[0.25, 0.0], [0.25, 1.0]], [[0.25, 0.3], [0.85, 0.0]], [[0.25, 0.65], [0.85, 0.4]], [[0.6, 0.2], [0.6, 1.0]]],
    [[[0.5, 0.0], [0.5, 1.0]], [[0.12, 0.3], [0.88, 0.3]], [[0.2, 0.0], [0.8, 0.6]]]
  ];
  function texPoncho() {
    return paintTex("poncho", 1024, 512, (c, w, h) => {
      const R = rngMaker(1234);
      let g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#86a028"); g.addColorStop(0.5, "#93aa2e"); g.addColorStop(1, "#9cb234");
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      /* painterly mottling (wraps horizontally) */
      for (let i = 0; i < 230; i++) {
        const x = R() * w, y = R() * h, rw = 24 + R() * 80, rh = 10 + R() * 34, a = R() * PI;
        const tone = R();
        c.fillStyle = tone > 0.62 ? "rgba(224,226,96," + (0.22 + R() * 0.3) + ")" : tone > 0.28 ? "rgba(140,170,44," + (0.22 + R() * 0.28) + ")" : "rgba(98,128,36," + (0.18 + R() * 0.22) + ")";
        for (const ox of [-w, 0, w]) { c.beginPath(); c.ellipse(x + ox, y, rw, rh, a, 0, TAU); c.fill(); }
      }
      /* big pale paint patches in the mid area */
      for (let i = 0; i < 26; i++) {
        const x = R() * w, y = h * (0.12 + R() * 0.55), rw = 18 + R() * 40, rh = 8 + R() * 18;
        c.fillStyle = "rgba(236,226,110,0.30)";
        for (const ox of [-w, 0, w]) { c.beginPath(); c.ellipse(x + ox, y, rw, rh, R() * PI, 0, TAU); c.fill(); }
      }
      /* dry-brush streaks */
      c.lineCap = "round";
      for (let i = 0; i < 160; i++) {
        const x = R() * w, y = R() * h * 0.9, l = 20 + R() * 60;
        c.strokeStyle = R() > 0.5 ? "rgba(235,235,120,0.16)" : "rgba(80,110,30,0.2)"; c.lineWidth = 1 + R() * 2.5;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 8, y + l); c.stroke();
      }
      /* rune glyphs: heavy yellow strokes near the hem (stretched for the uv aspect) */
      const GW = 74, GH = 150;
      const place = [[0.33, 0.62, 0], [0.405, 0.74, 1], [0.47, 0.58, 2], [0.535, 0.76, 3], [0.60, 0.60, 4], [0.665, 0.74, 5],
        [0.73, 0.58, 2], [0.80, 0.72, 0], [0.87, 0.6, 3], [0.94, 0.74, 4], [0.03, 0.6, 1], [0.10, 0.74, 5], [0.17, 0.60, 0], [0.24, 0.74, 3]];
      for (const pl of place) {
        const gl = GLYPHS[pl[2]], gx = pl[0] * w - GW / 2, gy = pl[1] * h - GH / 2;
        const rot = (R() - 0.5) * 0.3;
        c.save(); c.translate(gx + GW / 2, gy + GH / 2); c.rotate(rot);
        for (let pass = 0; pass < 2; pass++) {
          c.strokeStyle = pass === 0 ? "rgba(246,226,112,0.95)" : "rgba(255,246,170,0.55)";
          c.lineWidth = pass === 0 ? 17 : 7; c.lineCap = "butt"; c.lineJoin = "miter";
          for (const st of gl) {
            c.beginPath();
            c.moveTo((st[0][0] - 0.5) * GW + (pass ? 2 : 0), (st[0][1] - 0.5) * GH);
            c.lineTo((st[1][0] - 0.5) * GW + (pass ? 2 : 0), (st[1][1] - 0.5) * GH);
            c.stroke();
          }
        }
        c.restore();
      }
      /* frayed hem darkening + thread ticks */
      g = c.createLinearGradient(0, h * 0.9, 0, h);
      g.addColorStop(0, "rgba(90,110,30,0)"); g.addColorStop(1, "rgba(80,100,26,0.55)");
      c.fillStyle = g; c.fillRect(0, h * 0.9, w, h * 0.1);
      c.strokeStyle = "rgba(70,90,24,0.7)"; c.lineWidth = 1.5;
      for (let i = 0; i < 260; i++) { const x = R() * w, y = h * (0.93 + R() * 0.05); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 3, y + 10 + R() * 14); c.stroke(); }
      /* tiny burn / pinholes */
      c.fillStyle = "rgba(40,50,14,0.85)";
      for (const [u, v] of [[0.58, 0.46], [0.36, 0.33], [0.78, 0.4], [0.05, 0.5]]) { c.beginPath(); c.ellipse(u * w, v * h, 6, 11, 0.3, 0, TAU); c.fill(); }
      /* upper teal coat edge peeking at the neck */
      g = c.createLinearGradient(0, 0, 0, h * 0.07);
      g.addColorStop(0, "rgba(60,90,30,0.7)"); g.addColorStop(1, "rgba(60,90,30,0)");
      c.fillStyle = g; c.fillRect(0, 0, w, h * 0.07);
    }, true);
  }

  /* ==========================================================================
     4. SHAPE FUNCTIONS (skull, hair, poncho) shared by geometry + placement
     ========================================================================== */
  const SK = { rx: 0.131, ry: 0.124, rz: 0.120 };
  /* skull surface: azimuth az (0 = +Z, + toward +X), polar th (0 top .. PI bottom), radial scale k. head-centre origin. */
  function skullP(az, th, k, out) {
    const sT = Math.sin(th), cT = Math.cos(th);
    const low = th > PI * 0.5 ? (th - PI * 0.5) / (PI * 0.5) : 0;
    const wk = 1 - 0.36 * Math.pow(low, 1.2);
    const dk = 1 - 0.14 * Math.pow(low, 1.5);
    out[0] = SK.rx * wk * sT * Math.sin(az) * k;
    out[1] = SK.ry * cT * k * (low > 0 ? 1.02 : 1);
    out[2] = SK.rz * dk * sT * Math.cos(az) * k + (low > 0 ? 0.012 * Math.sin(low * PI) * Math.max(0, Math.cos(az)) : 0);
  }

  /* hair: u -> az (0.5 = front); v 0 top .. 1 bottom edge. */
  const HAIR_NU = 112, HAIR_NV = 20;
  function hairBottom(az) {
    /* returns {th: cap end polar (<= TH_C), tail: extra hanging length (m)} */
    const a = Math.abs(az);
    const step = (q, n) => Math.floor(q * n) / n;
    let el, tail = 0;
    if (a < 0.98) {                                   /* blunt fringe, stepped */
      const blk = Math.floor((az + 0.98) / 0.2);
      const jit = [0.04, -0.03, 0.05, -0.02, 0.03, -0.04, 0.02, -0.03, 0.04, -0.02][blk % 10];
      el = 0.24 + jit * 0.5 + 0.03 * Math.cos(az * 1.6);
    } else if (a < 1.48) {                            /* sideburn lock in front of the ear */
      const q = (a - 0.98) / 0.5;
      el = lerp(0.20, -0.78, sstep(0.0, 0.25, q)) - 0.02 * Math.sin(q * 9);
      if (q > 0.78) el = lerp(el, 0.16, sstep(0.78, 0.98, q));
    } else if (a < 1.80) {                            /* ear gap: hair stays above the ear */
      el = lerp(0.16, 0.10, (a - 1.48) / 0.32);
      const q = sstep(1.62, 1.80, a);
      el = lerp(el, -1.0, q);
    } else {                                          /* bob behind the ear */
      el = -1.0;
    }
    if (a >= 1.74) {                                  /* bob hangs below the skull rim */
      const q = sstep(1.74, 2.15, a);
      tail = 0.10 * q + 0.06 * q * (0.5 + 0.5 * Math.sin(az * 5.5));
    }
    return { el: Math.max(el, -1.0), tail };
  }
  const TH_C = 1.9;
  function hairP(u, v, out) {
    const az = (u - 0.5) * TAU;
    const hb = hairBottom(az);
    const thEnd = Math.min(PI * 0.5 - hb.el, TH_C);
    const VC = 0.64;
    if (v <= VC || hb.tail <= 0) {
      const t = hb.tail <= 0 ? v : v / VC;
      const th = thEnd * t;
      const flare = 1.075 + 0.05 * sstep(0.9, 1.9, th) + 0.012 * Math.sin(az * 7.0 + th * 3.0);
      skullP(az, th, flare, out);
    } else {
      skullP(az, thEnd, 1.075 + 0.05 + 0.012 * Math.sin(az * 7.0 + thEnd * 3.0), out);
      const p = (v - VC) / (1 - VC);
      const y0 = out[1], ytail = -0.185 + 0.0;
      const grow = 1 + 0.07 * Math.sin(p * PI * 0.5) - 0.10 * p * p;
      out[0] *= grow; out[2] *= grow;
      out[1] = y0 - hb.tail * p;
    }
  }

  /* poncho. theta from +Z toward +X. chest-local: y=+0.27 neck hole .. hem. */
  const PN = { yTop: 0.265, nu: 88, nv: 22 };
  function ponchoHem(th) {
    /* chest-local hem height (world = +0.73): lowest toward +X front, high on the -X side */
    const base = -0.215 - 0.115 * Math.sin(th) + 0.025 * Math.cos(th);
    const vee = -0.045 * Math.exp(-Math.pow((th - 0.55) / 0.5, 2));
    const back = 0.02 * Math.exp(-Math.pow((Math.abs(th) - PI) / 0.7, 2));
    return base + vee + back;
  }
  function ponchoP(u, s, out, fold) {
    const th = (u - 0.5) * TAU;
    const hem = ponchoHem(th), sinT = Math.sin(th), cosT = Math.cos(th);
    /* elliptical plan: wider across the shoulders */
    const side = Math.abs(sinT);
    const rHem = 0.255 + 0.075 * side + 0.012 * Math.cos(th * 2 + 1.0);
    const rShoulder = 0.150 + 0.050 * side;
    const rNeck = 0.083;
    const a = sstep(0, 0.20, s), b = Math.pow(s, 1.15);
    let r = rNeck + (rShoulder - rNeck) * a + (rHem - rShoulder) * Math.pow(sstep(0.10, 1.0, s), 1.1);
    const drop = 0.075 * a + (PN.yTop - 0.075 - hem) * Math.pow(Math.max(0, (s - 0.12) / 0.88), 1.0);
    let y = PN.yTop - drop;
    if (fold) {
      const f = s * s;
      r += (0.014 * Math.sin(th * 9 + 0.6) + 0.008 * Math.sin(th * 15 + 2.0) + 0.006 * Math.sin(th * 4 - 1.0)) * f;
      y += 0.010 * Math.sin(th * 11 + 1.3) * f * s;
    }
    out[0] = r * sinT * (0.96 + 0.12 * side) * 1.0;
    out[1] = y;
    out[2] = r * cosT * (cosT < 0 ? 0.92 : 1.0);
  }


  /* point on the (un-folded) poncho surface, offset along its outward normal */
  function ponchoPoint(th, s, off, outP, outN) {
    const u = th / TAU + 0.5, e = 0.004;
    const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
    ponchoP(u, s, a, false); ponchoP(u + e, s, b, false); ponchoP(u, s + e, c, false);
    const du = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dv = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / l, n[1] / l, n[2] / l];
    if (n[0] * a[0] + n[2] * a[2] + n[1] * (a[1] - 0.05) * 0.3 < 0) n = [-n[0], -n[1], -n[2]];
    outP[0] = a[0] + n[0] * off; outP[1] = a[1] + n[1] * off; outP[2] = a[2] + n[2] * off;
    if (outN) { outN[0] = n[0]; outN[1] = n[1]; outN[2] = n[2]; }
  }
  const sgnpow = (x, p) => (x < 0 ? -1 : 1) * Math.pow(Math.abs(x), p);
  /* flat rounded band riding a surface: pts/nrm = [[x,y,z]...] control points + normals */
  function band(pts, nrm, hw, ht, o) {
    o = o || {};
    const THREE = T();
    const sub = o.sub || 5, seg = o.seg || 12, n = pts.length;
    const cr = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
    const S = [], NN = [];
    for (let i = 0; i < n - 1; i++) {
      const i0 = Math.max(0, i - 1), i1 = i, i2 = i + 1, i3 = Math.min(n - 1, i + 2);
      const last = i === n - 2;
      for (let k = 0; k < sub + (last ? 1 : 0); k++) {
        const t = k / sub;
        S.push([cr(pts[i0][0], pts[i1][0], pts[i2][0], pts[i3][0], t), cr(pts[i0][1], pts[i1][1], pts[i2][1], pts[i3][1], t), cr(pts[i0][2], pts[i1][2], pts[i2][2], pts[i3][2], t)]);
        const nx = lerp(nrm[i1][0], nrm[i2][0], t), ny = lerp(nrm[i1][1], nrm[i2][1], t), nz = lerp(nrm[i1][2], nrm[i2][2], t), nl = Math.hypot(nx, ny, nz) || 1;
        NN.push([nx / nl, ny / nl, nz / nl]);
      }
    }
    const m = S.length, W = seg + 1, R = m + 2;
    const pos = new Float32Array(R * W * 3), uv = new Float32Array(R * W * 2);
    const put3 = (ri, pp, nn, tt, sc, off) => {
      const sx = nn[1] * tt[2] - nn[2] * tt[1], sy = nn[2] * tt[0] - nn[0] * tt[2], sz = nn[0] * tt[1] - nn[1] * tt[0];
      const sl = Math.hypot(sx, sy, sz) || 1;
      for (let k = 0; k <= seg; k++) {
        const a = k / seg * TAU, cw = sgnpow(Math.cos(a), 0.4) * hw * sc, ct = sgnpow(Math.sin(a), 0.5) * ht * sc;
        const q = (ri * W + k) * 3;
        pos[q] = pp[0] + sx / sl * cw + nn[0] * ct + tt[0] * off;
        pos[q + 1] = pp[1] + sy / sl * cw + nn[1] * ct + tt[1] * off;
        pos[q + 2] = pp[2] + sz / sl * cw + nn[2] * ct + tt[2] * off;
        uv[(ri * W + k) * 2] = k / seg; uv[(ri * W + k) * 2 + 1] = ri / (R - 1);
      }
    };
    const tan = (i) => { const a = S[Math.max(0, i - 1)], b = S[Math.min(m - 1, i + 1)]; const x = b[0] - a[0], y = b[1] - a[1], z = b[2] - a[2], l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
    put3(0, S[0], NN[0], tan(0), 0.02, 0);
    for (let i = 0; i < m; i++) put3(i + 1, S[i], NN[i], tan(i), 1, 0);
    put3(R - 1, S[m - 1], NN[m - 1], tan(m - 1), 0.02, 0);
    const idx = [];
    for (let i = 0; i < R - 1; i++) for (let k = 0; k < seg; k++) { const a = i * W + k, b = a + W; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    /* orientation: flip if normals point inward relative to the surface normal */
    const nor = g.attributes.normal; let d = 0;
    for (let i = 1; i < R - 1; i += 2) { const q = (i * W + 0) * 3, nn = NN[Math.min(m - 1, i - 1)]; d += nor.array[q] * nn[0] + nor.array[q + 1] * nn[1] + nor.array[q + 2] * nn[2]; }
    /* ring angle 0 points along the strap's side, so test the thickness side instead (angle PI/2) */
    d = 0;
    for (let i = 2; i < R - 2; i += 3) { const q = (i * W + (seg >> 2)) * 3, nn = NN[Math.min(m - 1, i - 1)]; d += nor.array[q] * nn[0] + nor.array[q + 1] * nn[1] + nor.array[q + 2] * nn[2]; }
    if (d < 0) { const ia = g.index.array; for (let q = 0; q < ia.length; q += 3) { const t = ia[q + 1]; ia[q + 1] = ia[q + 2]; ia[q + 2] = t; } g.computeVertexNormals(); }
    fixSeam(g, seg, R - 1, true);
    return g;
  }
  /* euler (XYZ) from a frame given by x/y/z axes */
  function frameEuler(x, y, z) {
    const THREE = T();
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(x[0], x[1], x[2]), new THREE.Vector3(y[0], y[1], y[2]), new THREE.Vector3(z[0], z[1], z[2]));
    const e = new THREE.Euler().setFromRotationMatrix(m, "XYZ");
    return [e.x, e.y, e.z];
  }


  /* ==========================================================================
     5. BUILDER
     ========================================================================== */
  function vertexMat(ds) {
    const m = A().mat.toon(0xffffff, { noCache: true, side: ds ? T().DoubleSide : undefined });
    m.vertexColors = true; m.needsUpdate = true;
    return m;
  }
  function texMat(tex, o) {
    o = o || {};
    const m = K.mat.mapToon(0xffffff, tex, { transparent: !!o.transparent, side: o.ds ? T().DoubleSide : undefined });
    if (o.offset) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; m.depthWrite = false; }
    return m;
  }

  function build() {
    const THREE = T();
    const rig = K.rig({ name: "thistle", height: DEF.height });
    const g = K.geo;
    const vc = vertexMat(false), vcD = vertexMat(true);
    const bone = rig.bone.bind(rig);
    const baked = (key, fn) => memo("b_" + key, () => { const b = new Bake(); fn(b); return b.build(); });
    /* attach a vertex-coloured mesh to a bone (never merged: it carries a colour attribute) */
    function put(boneName, geo, o) {
      o = o || {};
      const m = K.mk(geo, o.ds ? vcD : vc, { p: o.p, r: o.r, s: o.s, o: o.o, oc: o.oc, name: o.name, shadow: o.shadow, noOutline: o.noOutline });
      m.userData.keep = true;
      if (o.parent) o.parent.add(m); else rig.attach(boneName, m);
      return m;
    }
    const sph = g.sphere(), sphL = g.sphereLo(), cone = g.cone(), cone6 = g.cone6();
    const cyl = (rt, rb, h, sg, open) => g.cyl(rt, rb, h, sg || 12, open);

    /* ---------- skeleton ---------- */
    bone("base", null, [0, 0, 0]);
    bone("hips", "base", [0, 0.56, 0]);
    bone("chest", "hips", [0, 0.17, 0]);
    bone("neck", "chest", [0, 0.21, 0]);
    bone("head", "neck", [0, 0.11, 0]);
    bone("hairBack", "head", [0, 0.115, -0.112], [0.10, 0, 0], { sway: 0.035, phase: 0.4 });
    bone("scarf", "neck", [0.075, 0.075, -0.045], [0.25, 0.35, -0.45], { sway: 0.05, phase: 2.3 });
    const brLen = [0.112, 0.112, 0.10];
    for (const s of ["L", "R"]) {
      const sg = s === "L" ? 1 : -1, ph = sg > 0 ? 0 : 1.7;
      bone("braid" + s + ".0", "head", [sg * 0.118, 0.085, 0.012], [-0.88, 0, -sg * 0.06], { sway: 0.030, phase: 1.2 + ph });
      bone("braid" + s + ".1", "braid" + s + ".0", [0, -brLen[0], 0], [0.30, 0, 0], { sway: 0.045, phase: 1.9 + ph });
      bone("braid" + s + ".2", "braid" + s + ".1", [0, -brLen[1], 0], [0.34, 0, 0], { sway: 0.055, phase: 2.6 + ph });
      bone("tassel" + s, "braid" + s + ".2", [0, -brLen[2], 0], [0, 0, 0], { sway: 0.07, phase: 3.3 + ph });
      bone("horn" + s, "head", [sg * 0.128, 0.205, -0.015], [0, 0, 0], { sway: 0.018, phase: 0.7 + ph });
    }
    bone("armL.sh", "chest", [0.140, 0.185, 0], [0.0, 0, 0.12]);
    bone("armL.el", "armL.sh", [0, -0.19, 0], [-0.08, 0, 0]);
    bone("armL.hand", "armL.el", [0, -0.165, 0]);
    bone("armR.sh", "chest", [-0.140, 0.185, 0], [-0.22, 0, -0.14]);
    bone("armR.el", "armR.sh", [0, -0.19, 0], [-0.32, 0, 0]);
    bone("armR.hand", "armR.el", [0, -0.165, 0]);
    bone("legL.hip", "hips", [0.078, -0.03, 0]);
    bone("legL.knee", "legL.hip", [0, -0.25, 0]);
    bone("legL.foot", "legL.knee", [0, -0.22, 0]);
    bone("legR.hip", "hips", [-0.078, -0.03, 0]);
    bone("legR.knee", "legR.hip", [0, -0.25, 0]);
    bone("legR.foot", "legR.knee", [0, -0.22, 0]);
    bone("propR", "armR.hand", [0, -0.02, 0.012], [0.0, 0, 0]);
    bone("propL", "armL.hand", [0, -0.02, 0.012]);


    /* pack, hooked staff, lantern, Hob */
    bone("pack", "chest", [0, -0.13, -0.235], [0, 0, 0]);
    bone("staffB", "pack", [0.215, -0.195, -0.015], [0.0, 0, -0.03]);
    bone("lantern", "staffB", [0.205, 1.075, 0.0], [0, 0, 0], { sway: 0.10, phase: 1.9 });
    bone("hob", "pack", [0.115, 0.246, -0.005], [0, 0.16, 0]);
    bone("hobBody", "hob", [0, 0, 0]);
    bone("hobHead", "hobBody", [0, 0.112, 0.0], [0, 0, 0]);
    bone("hoodTip", "hobHead", [0, 0.178, -0.012], [-0.35, 0, 0], { sway: 0.05, phase: 0.8 });
    bone("hobArmL", "hobBody", [0.070, 0.090, 0.012], [0, 0, 0.45], { sway: 0.03, phase: 1.1 });
    bone("hobArmR", "hobBody", [-0.070, 0.090, 0.012], [0, 0, -0.45], { sway: 0.03, phase: 2.1 });
    bone("hobEyes", "hobHead", [0, 0, 0]);
    bone("hobMouth", "hobHead", [0, 0.030, 0.066], [0.0, 0, 0]);
    bone("vial", "propL", [0, -0.05, 0.03], [0, 0, 0]);
    bone("stick", "propR", [0, 0, 0], [0.46, 0, 0.16]);

    /* ======================================================================
       HEAD — skull, ears, decals, eyes
       ====================================================================== */
    const hg = rig.group("head", [0, 0.15, 0]);
    {
      const skullGeo = memo("skull", () => surf(48, 30, (u, v, out) => skullP((u - 0.5) * TAU, v * PI, 1, out), { wrapU: true, center: [0, 0, 0] }));
      const headSkin = baked("headSkin", (b) => {
        b.add(skullGeo, C.skin);
        for (const sg of [-1, 1]) {
          /* big leaf ears poking out of the hair */
          b.add(sph, C.skin, { p: [sg * 0.141, -0.022, -0.014], s: [0.020, 0.052, 0.037], r: [0, sg * 0.35, sg * 0.22] });
          b.add(sph, C.earIn, { p: [sg * 0.1535, -0.020, -0.004], s: [0.007, 0.036, 0.024], r: [0, sg * 0.35, sg * 0.22] });
          b.add(sph, C.skin, { p: [sg * 0.157, -0.003, 0.002], s: [0.006, 0.014, 0.012], r: [0, sg * 0.35, sg * 0.22] });
        }
      });
      put("head", headSkin, { parent: hg, o: 0.05, name: "skin" });

      /* painted face decal */
      const faceGeo = memo("faceDecal", () => surf(40, 32, (u, v, out) => {
        const az = (u - 0.5) * 2 * FACE.az, el = FACE.el0 + v * (FACE.el1 - FACE.el0);
        skullP(az, PI * 0.5 - el, 1.005, out);
      }, { center: [0, 0, 0] }));
      const faceMesh = new THREE.Mesh(faceGeo, texMat(texFace(), { transparent: true, offset: true }));
      faceMesh.userData.noOutline = true; faceMesh.renderOrder = 2; faceMesh.castShadow = false;
      hg.add(faceMesh);

      /* eyes: bones so they can blink via scale */
      const eyeGeo = memo("eyeQuad", () => capQuad(0.12, 0.068, 0.062, 8, 6));
      for (const s of ["L", "R"]) {
        const sg = s === "L" ? 1 : -1;
        const az = sg * 0.425, th = PI * 0.5 + 0.075;
        const P0 = [0, 0, 0], P1 = [0, 0, 0], P2 = [0, 0, 0];
        skullP(az, th, 1.012, P0); skullP(az + 0.01, th, 1.012, P1); skullP(az, th + 0.01, 1.012, P2);
        const tu = new THREE.Vector3(P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]).normalize();
        const tv = new THREE.Vector3(P2[0] - P0[0], P2[1] - P0[1], P2[2] - P0[2]).normalize();
        const zAx = new THREE.Vector3().crossVectors(tu, tv).multiplyScalar(-1).normalize();   /* outward */
        const yAx = tv.clone().multiplyScalar(-1);
        const xAx = new THREE.Vector3().crossVectors(yAx, zAx).normalize();
        yAx.crossVectors(zAx, xAx).normalize();
        const mat4 = new THREE.Matrix4().makeBasis(xAx, yAx, zAx);
        const eu = new THREE.Euler().setFromRotationMatrix(mat4, "XYZ");
        const eb = bone("eye" + s, "head", [P0[0], P0[1] + 0.15, P0[2]], [eu.x, eu.y, eu.z + sg * 0.07]);
        const eyeMat = K.mat.eye(texEye(s === "R")); eyeMat.polygonOffset = true; eyeMat.polygonOffsetFactor = -4; eyeMat.polygonOffsetUnits = -4;
        const em = new THREE.Mesh(eyeGeo, eyeMat);
        em.userData.noOutline = true; em.renderOrder = 3; em.castShadow = false;
        eb.add(em);
      }
    }

    /* ---------- hair cap + fringe ---------- */
    {
      const hairGeo = memo("hairCap", () => surf(HAIR_NU, HAIR_NV, hairP, { wrapU: true, center: [0, 0, 0], yw: 0.4 }));
      const hairMat = texMat(texHair(), { ds: true });
      const hm = K.mk(hairGeo, hairMat, { o: 0.05, name: "hair" });
      hm.userData.keep = true;
      hg.add(hm);
    }

    /* ---------- horn bobbles ---------- */
    for (const s of ["L", "R"]) {
      const sg = s === "L" ? 1 : -1;
      const hornGeo = baked("horn" + s, (b) => {
        const ctrl = [[0, 0, 0, 0.014], [0.018, 0.006, -0.010, 0.021], [0.040, 0.012, -0.006, 0.027], [0.058, 0.012, 0.014, 0.031], [0.062, 0.006, 0.036, 0.033], [0.054, 0.0, 0.054, 0.033]];
        const sw = sweep(ctrl.map((c) => [c[0] * sg, c[1], c[2], c[3], c[3] * 0.92]), { seg: 14, sub: 5, capS: 1, up: [0, 1, 0] });
        b.add(sw, C.horn, { grad: [C.hornDk, -0.01, 0.075], shade: (x, y, z, nx, ny, nz) => 0.92 + 0.08 * Math.sin(z * 120) });
        /* dark spiral hollow + white bobble inside the mouth */
        const cup = memo("hornCup", () => capDisc(0.06, 0.026, 0.026, 18));
        b.add(cup, C.hornIn, { p: [sg * 0.054, 0.0, 0.0605], r: [-0.05, 0, 0], s: [0.8, 0.8, 1] });
        b.add(sph, C.hornWhite, { p: [sg * 0.054 - sg * 0.006, -0.003, 0.0575], s: [0.014, 0.012, 0.010] });
      });
      put("horn" + s, hornGeo, { o: 0.04, name: "horn" + s });
    }

    /* ---------- braids ---------- */
    for (const s of ["L", "R"]) {
      const sg = s === "L" ? 1 : -1;
      const lumpC = [C.hair, C.hairLt, C.hair, C.hairDk, C.hair, C.hairLt];
      for (let k = 0; k < 3; k++) {
        const geo = baked("braid" + k, (b) => {
          const L = brLen[k];
          /* two lumps per bone + a hair tie between them */
          for (let q = 0; q < 2; q++) {
            const y = -L * (0.27 + 0.46 * q);
            b.add(sph, lumpC[(k * 2 + q) % 6], { p: [(q ? -0.003 : 0.003), y, 0.0], s: [0.027, L * 0.30, 0.025], r: [0, 0, (q ? 0.28 : -0.28)], grad: [C.hairDk, -L, 0],
              shade: (x, yy, z, nx, ny, nz) => 0.9 + 0.14 * ny });
          }
          b.add(g.torus(0.017, 0.0045, TAU, 6, 12), C.hairDk, { p: [0, -L * 0.50, 0], r: [PI / 2, 0, 0], s: [1.0, 1.0, 1.3] });
          b.add(g.torus(0.019, 0.0055, TAU, 6, 12), C.braidTie, { p: [0, -L * 0.995, 0], r: [PI / 2, 0, 0], s: [1.0, 1.0, 1.3] });
        });
        put("braid" + s + "." + k, geo, { o: 0.035, name: "braid" });
      }
      /* tassel strands */
      const tassGeo = baked("tassel", (b) => {
        const R = rngMaker(901);
        for (let i = 0; i < 11; i++) {
          const t = i / 10 - 0.5;
          const len = 0.105 + 0.03 * R() - 0.02 * Math.abs(t);
          const cd = card(0.016, len, { rows: 4, tip: 0.3, bend: 0.1 });
          b.add(cd, i % 3 === 0 ? C.hairLt : (i % 3 === 1 ? C.hair : C.hairDk), { p: [t * 0.028, -0.005, (R() - 0.5) * 0.02], r: [(R() - 0.5) * 0.25, (R() - 0.5) * 0.6, -t * 0.55], grad: [C.hair, -0.12, 0] });
        }
        b.add(sph, C.hair, { p: [0, -0.008, 0], s: [0.024, 0.016, 0.02] });
      });
      put("tassel" + s, tassGeo, { ds: true, o: 0.02, name: "tassel" });
    }
    /* back-of-bob loose locks */
    {
      const geo = baked("hairBackLocks", (b) => {
        const R = rngMaker(55);
        for (let i = 0; i < 9; i++) {
          const t = i / 8 - 0.5, a = PI + t * 2.3;
          const len = 0.085 + 0.03 * R();
          b.add(card(0.045, len, { rows: 3, tip: 0.55 }), i % 2 ? C.hair : C.hairDk, { p: [Math.sin(a) * 0.118, 0.0, Math.cos(a) * 0.118 - 0.0], r: [0.05, a, 0], grad: [C.hair, -0.1, 0] });
        }
      });
      put("hairBack", geo, { ds: true, o: 0.03, name: "hairBackLocks" });
    }

    /* ======================================================================
       NECK + COLLAR + SCARF FLAP
       ====================================================================== */
    put("neck", baked("neck", (b) => { b.add(cyl(0.040, 0.048, 0.17, 10), C.skin, { p: [0, 0.085, 0] }); }), { name: "neck" });
    {
      const collarGeo = memo("collar", () => surf(40, 5, (u, v, out) => {
        const az = (u - 0.5) * TAU, c = Math.cos(az), sn = Math.sin(az);
        const hgt = 0.085 + 0.030 * Math.max(0, c) - 0.020 * Math.max(0, -c);
        const r = 0.090 + 0.020 * v + 0.006 * Math.sin(az * 5);
        out[0] = sn * r * 1.05; out[1] = 0.005 + hgt * v; out[2] = c * r * 0.96;
      }, { wrapU: true, center: [0, 0.05, 0] }));
      const colB = baked("collarB", (b) => {
        b.add(collarGeo, C.collar, { grad: [C.collarDk, 0.0, 0.16], shade: (x, y, z, nx, ny, nz) => 0.92 + 0.1 * ny });
        b.add(g.torus(0.100, 0.010, TAU, 6, 24), C.collarDk, { p: [0, 0.110, 0.004], r: [PI / 2 - 0.12, 0, 0], s: [1.07, 0.95, 1.0] });
        /* overlapping front placket + brass button + hairline crack */
        b.add(rbox(0.056, 0.085, 0.014, 0.006, 2), C.collar, { p: [-0.028, 0.062, 0.0885], r: [0.1, -0.18, 0.02] });
        b.add(cyl(0.0125, 0.0125, 0.007, 12), C.brass, { p: [-0.034, 0.072, 0.0985], r: [PI / 2 + 0.1, 0, 0] });
        b.add(rbox(0.014, 0.0025, 0.002, 0.001, 1), C.brassDk, { p: [-0.034, 0.072, 0.1025], r: [0, 0, 0.7] });
        b.add(rbox(0.014, 0.0025, 0.002, 0.001, 1), C.brassDk, { p: [-0.034, 0.072, 0.1025], r: [0, 0, -0.7] });
      });
      put("neck", colB, { o: 0.035, ds: true, name: "collar" });
      /* pale hood fold draped over the +X shoulder */
      const flap = baked("scarf", (b) => {
        const f = surf(8, 8, (u, v, out) => {
          const x = (u - 0.5) * (0.115 + 0.045 * v), y = -0.14 * v;
          out[0] = x; out[1] = y; out[2] = 0.012 * Math.sin(u * PI * 3 + v * 2) * v + 0.018 * Math.sin(v * PI) - 0.02 * (u - 0.5) * (u - 0.5);
        }, { center: [0, 0, -1] });
        b.add(f, C.scarf, { grad: [C.scarfDk, -0.14, 0], shade: (x, y, z, nx) => 0.92 + 0.12 * Math.abs(nx) });
      });
      put("scarf", flap, { ds: true, o: 0.03, name: "scarf" });
    }

    /* ======================================================================
       TORSO (under the poncho), ARMS
       ====================================================================== */
    put("chest", baked("torso", (b) => {
      b.add(sph, C.coat, { p: [0, 0.01, 0], s: [0.125, 0.185, 0.105] });
      b.add(sph, C.coatDk, { p: [0, -0.10, 0], s: [0.135, 0.10, 0.11] });
    }), { name: "torso" });

    for (const s of ["L", "R"]) {
      const sg = s === "L" ? 1 : -1;
      put("arm" + s + ".sh", baked("upperArm", (b) => {
        b.add(sweep([[0, 0.025, 0, 0.050], [0, -0.06, 0, 0.049], [0, -0.17, 0, 0.044], [0, -0.195, 0, 0.044]], { seg: 10, sub: 3, capS: 1, up: [0, 0, 1] }), C.coat, { shade: (x, y, z, nx, ny, nz) => 0.92 + 0.1 * ny });
      }), { o: 0.04, name: "upperArm" });
      put("arm" + s + ".el", baked("foreArm", (b) => {
        b.add(sweep([[0, 0.02, 0, 0.046], [0, -0.06, 0, 0.043], [0, -0.115, 0, 0.044], [0, -0.135, 0, 0.060], [0, -0.17, 0, 0.066]], { seg: 12, sub: 3, capS: 1, up: [0, 0, 1] }), C.coat, { shade: (x, y, z, nx, ny, nz) => 0.92 + 0.1 * ny });
        b.add(g.torus(0.064, 0.012, TAU, 6, 16), C.coatDk, { p: [0, -0.165, 0], r: [PI / 2, 0, 0] });
        b.add(g.torus(0.050, 0.008, TAU, 6, 14), C.coatDk, { p: [0, -0.125, 0], r: [PI / 2, 0, 0] });
        b.add(rbox(0.035, 0.012, 0.012, 0.004, 1), C.brass, { p: [sg * 0.052, -0.085, 0.020], r: [0, 0.5, 0.3 * sg] });
      }), { o: 0.04, name: "foreArm" });
      put("arm" + s + ".hand", baked("hand" + s, (b) => {
        b.add(cyl(0.026, 0.028, 0.04, 8), C.skinHand, { p: [0, 0.01, 0] });
        b.add(sph, C.skinHand, { p: [0, -0.034, 0.004], s: [0.034, 0.042, 0.032] });
        for (let i = 0; i < 4; i++) b.add(sph, C.skinHand, { p: [(i - 1.5) * 0.015, -0.068 + (i === 1 || i === 2 ? -0.004 : 0), 0.014], s: [0.0085, 0.016, 0.011] });
        b.add(sph, C.skinHand, { p: [-sg * 0.027, -0.03, 0.020], s: [0.010, 0.017, 0.010], r: [0.3, 0, sg * 0.6] });
      }), { o: 0.03, name: "hand" });
    }

    /* ======================================================================
       HIPS: belt, pouches, coat skirt, legs
       ====================================================================== */
    {
      const skirt = memo("coatSkirt", () => surf(48, 8, (u, v, out) => {
        const az = (u - 0.5) * TAU, sn = Math.sin(az), cs = Math.cos(az);
        const hem = -0.21 - 0.045 * Math.max(0, -sn) * Math.max(0, cs + 0.3) + 0.06 * Math.max(0, sn) + 0.02 * Math.cos(az * 5.0) * v;
        const y = lerp(0.075, hem, v);
        const r = 0.125 + 0.075 * Math.pow(v, 1.2) + 0.008 * Math.sin(az * 6 + v * 2) * v;
        out[0] = sn * r * 1.08; out[1] = y; out[2] = cs * r * 0.95;
      }, { wrapU: true, center: [0, 0.1, 0] }));
      put("hips", baked("hipsB", (b) => {
        b.add(skirt, C.coat, { grad: [C.coatDk, -0.2, 0.05] });
        /* pelvis / trouser top */
        b.add(sph, C.pants, { p: [0, -0.04, 0], s: [0.125, 0.10, 0.105] });
        /* belt + buckle */
        b.add(g.torus(0.142, 0.017, TAU, 6, 28), C.leatherDk, { p: [0, 0.062, 0], r: [PI / 2, 0, 0], s: [1.02, 0.86, 1.0] });
        b.add(rbox(0.052, 0.040, 0.014, 0.005, 2), C.brass, { p: [0, 0.062, 0.121] });
        b.add(rbox(0.026, 0.020, 0.010, 0.003, 1), C.leatherDk, { p: [0, 0.062, 0.1295] });
      }), { o: 0.04, ds: true, name: "hipsB" });
      /* pouches (brown, orange accents) */
      put("hips", baked("pouches", (b) => {
        const sh = (x, y, z, nx, ny, nz) => 0.9 + 0.12 * ny;
        /* right hip: big pouch + small lower pouch */
        b.add(rbox(0.104, 0.115, 0.074, 0.016, 2), C.leather, { p: [-0.168, -0.005, 0.066], r: [0, -0.45, 0.04], shade: sh });
        b.add(rbox(0.108, 0.040, 0.080, 0.012, 2), C.leatherDk, { p: [-0.171, 0.040, 0.068], r: [0, -0.45, 0.04] });
        b.add(rbox(0.016, 0.100, 0.010, 0.004, 1), C.strap, { p: [-0.164, 0.005, 0.104], r: [0, -0.45, 0.04] });
        b.add(rbox(0.074, 0.075, 0.060, 0.014, 2), C.leatherLt, { p: [-0.150, -0.083, 0.082], r: [0, -0.45, -0.08], shade: sh });
        b.add(rbox(0.078, 0.024, 0.066, 0.010, 2), C.leatherDk, { p: [-0.152, -0.056, 0.084], r: [0, -0.45, -0.08] });
        b.add(rbox(0.010, 0.050, 0.008, 0.003, 1), C.strapDk, { p: [-0.141, -0.083, 0.116], r: [0, -0.45, -0.08] });
        /* olive tab hanging in front */
        b.add(rbox(0.048, 0.150, 0.014, 0.006, 2), C.olive, { p: [0.040, -0.040, 0.138], r: [0.05, 0.15, 0.0], shade: sh });
        b.add(cyl(0.007, 0.007, 0.016, 6), C.brass, { p: [0.040, 0.020, 0.147], r: [PI / 2, 0, 0] });
        /* left hip pouch */
        b.add(rbox(0.082, 0.095, 0.062, 0.014, 2), C.leather, { p: [0.168, -0.01, 0.050], r: [0, 0.5, -0.04], shade: sh });
        b.add(rbox(0.086, 0.034, 0.066, 0.010, 2), C.leatherDk, { p: [0.171, 0.028, 0.052], r: [0, 0.5, -0.04] });
      }), { o: 0.04, name: "pouches" });

      for (const s of ["L", "R"]) {
        const sg = s === "L" ? 1 : -1;
        put("leg" + s + ".hip", baked("thigh", (b) => {
          b.add(sweep([[0, 0.03, 0, 0.066], [0, -0.08, 0, 0.068], [0, -0.20, 0, 0.074], [0, -0.255, 0, 0.078]], { seg: 12, sub: 3, capS: 1, up: [0, 0, 1] }), C.pants, { shade: (x, y, z, nx, ny, nz) => 0.92 + 0.1 * ny });
        }), { o: 0.04, name: "thigh" });
        put("leg" + s + ".knee", baked("shin" + s, (b) => {
          b.add(sweep([[0, 0.02, 0, 0.076], [0, -0.06, 0, 0.082], [0, -0.14, 0, 0.088], [0, -0.20, 0, 0.098]], { seg: 14, sub: 3, up: [0, 0, 1] }), C.pants, { shade: (x, y, z, nx, ny, nz) => 0.92 + 0.1 * ny });
          b.add(g.torus(0.094, 0.011, TAU, 6, 18), C.pantsDk, { p: [0, -0.205, 0], r: [PI / 2, 0, 0] });
          /* knee patch with stitches */
          b.add(rbox(0.074, 0.074, 0.012, 0.01, 2), C.patch, { p: [sg > 0 ? 0.0 : -0.005, -0.045, 0.087], r: [-0.12, 0, sg * 0.08] });
          b.add(rbox(0.082, 0.004, 0.003, 0.001, 1), C.stitch, { p: [sg > 0 ? 0.0 : -0.005, -0.012, 0.094], r: [-0.12, 0, sg * 0.08] });
          b.add(rbox(0.082, 0.004, 0.003, 0.001, 1), C.stitch, { p: [sg > 0 ? 0.0 : -0.005, -0.078, 0.092], r: [-0.12, 0, sg * 0.08] });
        }), { o: 0.04, name: "shin" });
        put("leg" + s + ".foot", baked("boot", (b) => {
          const sh = (x, y, z, nx, ny, nz) => 0.9 + 0.12 * ny;
          b.add(cyl(0.056, 0.060, 0.10, 12), C.boot, { p: [0, 0.015, -0.004], shade: sh });
          b.add(sweep([[0, -0.015, -0.035, 0.056, 0.052], [0, -0.030, 0.045, 0.056, 0.042], [0, -0.040, 0.112, 0.046, 0.030]], { seg: 10, sub: 3, capE: 1, capS: 1, up: [0, 1, 0], capLen: 0.8 }), C.boot, { shade: sh });
          b.add(rbox(0.100, 0.020, 0.205, 0.008, 2), C.sole, { p: [0, -0.052, 0.034] });
          b.add(g.torus(0.058, 0.012, TAU, 6, 14), C.bootLt, { p: [0, 0.058, -0.004], r: [PI / 2, 0, 0] });
          b.add(rbox(0.030, 0.050, 0.010, 0.004, 1), C.leatherDk, { p: [0, 0.004, 0.052], r: [-0.4, 0, 0] });
        }), { o: 0.04, name: "boot" });
      }
    }

    /* ======================================================================
       PONCHO — vertex-animated cloth shell (hem waves), painted texture
       ====================================================================== */
    const ponchoGeo = surf(PN.nu, PN.nv, (u, v, out) => ponchoP(u, v, out, true), { wrapU: true, center: [0, 0.05, 0] });
    {
      const pm = K.mk(ponchoGeo, texMat(texPoncho(), { ds: true }), { o: 0.045, name: "poncho" });
      pm.userData.keep = true;
      rig.attach("chest", pm);
      rig.parts.ponchoMesh = pm;
    }


    /* ======================================================================
       STRAPS + LAMP PANEL on the poncho (chest bone)
       ====================================================================== */
    {
      const tmpP = [0, 0, 0], tmpN = [0, 0, 0];
      const pathOf = (spec, off) => {
        const P = [], N = [];
        for (const q of spec) { ponchoPoint(q[0], q[1], off, tmpP, tmpN); P.push([tmpP[0], tmpP[1], tmpP[2]]); N.push([tmpN[0], tmpN[1], tmpN[2]]); }
        return { P, N };
      };
      const A_ = [[-2.80, 0.36], [-2.35, 0.20], [-1.80, 0.085], [-1.35, 0.075], [-0.95, 0.15], [-0.45, 0.30], [0.05, 0.43], [0.55, 0.60], [1.00, 0.76], [1.30, 0.86]];
      const B_ = [[2.80, 0.36], [2.35, 0.20], [1.80, 0.085], [1.35, 0.075], [0.95, 0.15], [0.45, 0.30], [-0.05, 0.43], [-0.55, 0.60], [-1.00, 0.76], [-1.30, 0.86]];
      const pa = pathOf(A_, 0.010), pb = pathOf(B_, 0.016);
      const gA = memo("strapA", () => band(pa.P, pa.N, 0.024, 0.0070, { sub: 5, seg: 12 }));
      const gB = memo("strapB", () => band(pb.P, pb.N, 0.022, 0.0070, { sub: 5, seg: 12 }));
      const frameAt = (spec, i, off) => {
        const a = pathOf([spec[i]], off), b = pathOf([spec[Math.min(spec.length - 1, i + 1)]], off), c = pathOf([spec[Math.max(0, i - 1)]], off);
        const t = [b.P[0][0] - c.P[0][0], b.P[0][1] - c.P[0][1], b.P[0][2] - c.P[0][2]]; const tl = Math.hypot(t[0], t[1], t[2]) || 1;
        const T_ = [t[0] / tl, t[1] / tl, t[2] / tl], n = a.N[0];
        const w = [n[1] * T_[2] - n[2] * T_[1], n[2] * T_[0] - n[0] * T_[2], n[0] * T_[1] - n[1] * T_[0]];
        const wl = Math.hypot(w[0], w[1], w[2]) || 1;
        const w1 = [w[0] / wl, w[1] / wl, w[2] / wl];
        const t2 = [w1[1] * n[2] - w1[2] * n[1], w1[2] * n[0] - w1[0] * n[2], w1[0] * n[1] - w1[1] * n[0]];
        return { p: a.P[0], T: t2, w: w1, n };
      };
      put("chest", baked("straps", (b) => {
        const shS = (x, y, z, nx, ny, nz) => 0.9 + 0.14 * ny;
        b.add(gA, C.strap, { shade: shS });
        b.add(gB, C.strapDk, { shade: shS });
        /* white buckle plates (painting: pale rectangular clips) + holes + rivets */
        const bk = (spec, i, off, sc) => {
          const f = frameAt(spec, i, off + 0.004);
          const eu = frameEuler(f.w, f.T, f.n);
          b.add(rbox(0.052 * sc, 0.040 * sc, 0.008, 0.003, 1), C.buckle, { p: f.p, r: eu });
          b.add(rbox(0.026 * sc, 0.016 * sc, 0.010, 0.002, 1), C.leatherDk, { p: [f.p[0] + f.n[0] * 0.003, f.p[1] + f.n[1] * 0.003, f.p[2] + f.n[2] * 0.003], r: eu });
        };
        bk(A_, 3, 0.008, 1.0);
        bk(A_, 7, 0.008, 0.9);
        bk(B_, 5, 0.014, 0.8);
        const rv = frameAt(A_, 4, 0.016);
        b.add(sphL, C.brass, { p: rv.p, s: 0.0065 });
        const rv2 = frameAt(A_, 5, 0.016);
        b.add(sphL, C.brass, { p: rv2.p, s: 0.0065 });
      }), { o: 0.025, name: "straps" });

      /* brown lamp panel with two glowing studs, front -X chest */
      const f0 = pathOf([[-0.62, 0.48]], 0.012);
      const eu = frameEuler([Math.cos(-0.62), 0, -Math.sin(-0.62)], [0, 1, 0], f0.N[0]);
      put("chest", baked("lampPanel", (b) => {
        b.add(rbox(0.058, 0.112, 0.016, 0.008, 2), C.leatherDk, { p: f0.P[0], r: eu });
        b.add(rbox(0.044, 0.090, 0.012, 0.006, 1), C.leather, { p: [f0.P[0][0] + f0.N[0][0] * 0.006, f0.P[0][1], f0.P[0][2] + f0.N[0][2] * 0.006], r: eu });
      }), { o: 0.03, name: "lampPanel" });
      const glowM = K.mat.glow(C.amber, 1.8);
      for (const dy of [0.028, -0.022]) {
        const m = K.mk(sphL, glowM, { p: [f0.P[0][0] + f0.N[0][0] * 0.016, f0.P[0][1] + dy, f0.P[0][2] + f0.N[0][2] * 0.016], s: [0.0125, 0.0125, 0.008], shadow: false, noOutline: true });
        m.rotation.y = -0.62;
        rig.attach("chest", m);
      }
    }

    /* ======================================================================
       BACKPACK
       ====================================================================== */
    put("pack", baked("pack", (b) => {
      const sh = (x, y, z, nx, ny, nz) => 0.86 + 0.16 * ny + 0.05 * Math.min(0, y) * 4;
      const sh2 = (x, y, z, nx, ny, nz) => 0.9 + 0.12 * ny;
      b.add(rbox(0.34, 0.40, 0.19, 0.055, 3, 2), C.pack, { shade: sh });
      b.add(rbox(0.30, 0.15, 0.075, 0.03, 2), C.packDk, { p: [0, -0.15, -0.120], shade: sh2 });                 /* lower pocket */
      b.add(rbox(0.31, 0.20, 0.050, 0.022, 2), C.packLt, { p: [0, 0.02, -0.110], shade: sh2 });                 /* big flap */
      b.add(rbox(0.30, 0.0045, 0.0045, 0.002, 1), C.stitch, { p: [0, -0.078, -0.136] });
      for (const sx of [-0.14, 0.14]) b.add(rbox(0.0045, 0.17, 0.0045, 0.002, 1), C.stitch, { p: [sx, 0.02, -0.136] });
      b.add(rbox(0.32, 0.08, 0.205, 0.032, 2), C.packTaupe, { p: [0, 0.212, 0], shade: sh2 });                  /* roll cap */
      b.add(rbox(0.20, 0.15, 0.032, 0.014, 2), C.packTaupe, { p: [0.0, 0.135, -0.118], r: [0.05, 0, 0], shade: sh2 });
      b.add(rbox(0.034, 0.032, 0.012, 0.004, 1), C.brass, { p: [0.0, 0.080, -0.138] });
      for (const sx of [-0.10, 0.10]) b.add(g.torus(0.022, 0.006, TAU, 5, 10), C.packTaupeDk, { p: [sx, 0.255, -0.04], r: [PI / 2, 0, 0.3] });
      /* orange vertical strap + white clip, thin second strap */
      b.add(rbox(0.036, 0.31, 0.014, 0.005, 1), C.strap, { p: [0.045, -0.005, -0.138] });
      b.add(rbox(0.050, 0.030, 0.012, 0.004, 1), C.buckle, { p: [0.045, 0.045, -0.147] });
      b.add(rbox(0.016, 0.26, 0.010, 0.004, 1), C.strapDk, { p: [-0.095, -0.03, -0.134] });
      /* side pockets with flaps */
      for (const sx of [-1, 1]) {
        b.add(rbox(0.075, 0.17, 0.15, 0.03, 2), C.packDk, { p: [sx * 0.19, -0.075, -0.005], shade: sh2 });
        b.add(rbox(0.080, 0.055, 0.158, 0.02, 2), C.pack, { p: [sx * 0.19, 0.002, -0.005], shade: sh2 });
        b.add(rbox(0.012, 0.050, 0.006, 0.002, 1), C.strap, { p: [sx * 0.19, 0.0, -0.088] });
      }
      /* tag + dangling straps */
      b.add(rbox(0.034, 0.034, 0.006, 0.002, 1), C.buckle, { p: [-0.055, -0.135, -0.162], r: [0, 0, 0.785] });
      b.add(card(0.016, 0.10, { rows: 3, tip: 0.9 }), C.packDk, { p: [0.115, -0.20, -0.100] });
      b.add(card(0.016, 0.075, { rows: 3, tip: 0.9 }), C.packDk, { p: [-0.12, -0.20, -0.100] });
      b.add(card(0.014, 0.12, { rows: 3, tip: 0.9 }), C.strapDk, { p: [0.22, -0.16, -0.01], r: [0, PI / 2, 0] });
    }), { o: 0.05, ds: true, name: "pack" });
    /* shoulder straps/yoke where the poncho meets the pack handled by the cross straps above */

    /* ======================================================================
       HOOKED STAFF + LANTERN JAR (pack side)
       ====================================================================== */
    {
      const st = [[0, 0, 0, 0.0215], [0.008, 0.16, 0.006, 0.0195], [-0.004, 0.32, -0.010, 0.0240], [0.014, 0.50, 0.008, 0.0200], [0.018, 0.66, -0.012, 0.0255], [-0.002, 0.82, 0.010, 0.0205], [0.004, 0.98, -0.010, 0.0230],
        [0.020, 1.10, 0.004, 0.0250], [0.058, 1.195, -0.004, 0.0225], [0.112, 1.250, 0.006, 0.0215], [0.168, 1.242, -0.004, 0.0205], [0.206, 1.19, 0.004, 0.0175], [0.214, 1.14, 0.0, 0.0145]];
      put("staffB", baked("hookStaff", (b) => {
        b.add(sweep(st.map((c) => [c[0], c[1], c[2], c[3], c[3] * 0.9]), { seg: 9, sub: 5, capS: 1, capE: 1, up: [0, 0, 1] }), C.wood, {
          shade: (x, y, z, nx, ny, nz) => (0.78 + 0.34 * vnoise(Math.atan2(nz, nx) * 2.2 + 11, y * 18)) * (0.9 + 0.12 * ny) });
        const knots = [[0.012, 0.58, -0.004, 0.030], [0.004, 0.82, -0.012, 0.024], [0.016, 1.13, -0.005, 0.030], [0.001, 0.18, 0.0, 0.026]];
        for (const k of knots) b.add(sph, C.woodDk, { p: [k[0], k[1], k[2]], s: [k[3], k[3] * 0.8, k[3] * 0.95], r: [0.4, 0.2, 0.3] });
        /* claw twigs at the hook tip */
        b.add(sweep([[0.205, 1.2, 0, 0.011], [0.226, 1.17, 0.012, 0.0085], [0.243, 1.12, 0.020, 0.005]], { seg: 6, sub: 3, capE: 1, up: [0, 0, 1] }), C.woodDk);
        b.add(sweep([[0.205, 1.2, 0, 0.011], [0.232, 1.19, -0.012, 0.008], [0.256, 1.15, -0.016, 0.0045]], { seg: 6, sub: 3, capE: 1, up: [0, 0, 1] }), C.woodDk);
        b.add(sweep([[0.168, 1.245, 0, 0.012], [0.176, 1.285, 0.01, 0.007], [0.172, 1.31, 0.014, 0.004]], { seg: 6, sub: 3, capE: 1, up: [0, 0, 1] }), C.woodDk);
        /* leather lashings to the pack */
        for (const y of [0.30, 0.46]) b.add(g.torus(0.026, 0.0085, TAU, 6, 12), C.leatherDk, { p: [0.004 + y * 0.01, y, 0.0], r: [PI / 2, 0, 0], s: [1, 1, 1.2] });
      }), { o: 0.05, name: "hookStaff" });
    }
    /* glowing potion jar: cap + band + glowing body (shared by the lantern and the hand-held vial) */
    function makeJar(boneName, withCord) {
      const parts = baked(withCord ? "jarCap" : "vialCap", (b) => {
        if (withCord) b.add(sweep([[0, 0.02, 0, 0.0045], [0.0, -0.04, 0, 0.0035], [0.0, -0.10, 0, 0.0035]], { seg: 5, sub: 2, up: [0, 0, 1] }), C.cord);
        b.add(cone, C.jarCap, { p: [0, -0.131, 0], s: [0.030, 0.062, 0.030], grad: [C.jarCapDk, -0.16, -0.10] });
        b.add(cone, C.jarCapDk, { p: [0, -0.1065, 0], s: [0.0075, 0.012, 0.0075] });
        b.add(cyl(0.0305, 0.0305, 0.014, 14), C.jarBand, { p: [0, -0.1635, 0] });
      });
      const m1 = put(boneName, parts, { o: 0.03, name: "jarCap" });
      const jarGeo = memo("jarBody", () => {
        const pts = [[0.0, -0.236], [0.020, -0.234], [0.0275, -0.222], [0.0295, -0.20], [0.0292, -0.172], [0.0, -0.171]];
        return new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(q[0], q[1])), 16);
      });
      const jar = K.mk(jarGeo, K.mat.glow(C.jarGlow, 1.7), { o: 0.03, oc: 0x6a1608, name: "jar" });
      rig.attach(boneName, jar);
      const core = K.mk(sphL, K.mat.glow(0xffd36a, 2.2), { p: [0, -0.205, 0], s: [0.014, 0.020, 0.014], shadow: false, noOutline: true });
      rig.attach(boneName, core);
      const glow = A().glowSprite(0xff6a28, withCord ? 0.34 : 0.26, withCord ? 0.5 : 0.45);
      glow.position.set(0, -0.2, 0);
      rig.attach(boneName, glow);
      return { cap: m1, jar, core, glow };
    }
    {
      const lj = makeJar("lantern", true);
      rig.parts.lanternGlow = lj.glow; rig.parts.jar = lj.jar;
      const vj = makeJar("vial", false);
      /* vial hangs upright in the fist: shift so the jar centre sits in the palm, tiny scale */
      for (const o of [vj.cap, vj.jar, vj.core, vj.glow]) { o.position.y += 0.20; }
      rig.bones["vial"].scale.setScalar(0.85);
      rig.parts.vialGlow = vj.glow;
    }

    /* ======================================================================
       WALKING STICK (propR) + potion vial (propL, shown during cast)
       ====================================================================== */
    {
      const sp = [[0, -0.56, 0, 0.0155], [0.006, -0.38, 0.004, 0.0185], [-0.004, -0.18, -0.006, 0.0200], [0.004, 0.0, 0.004, 0.0215], [-0.003, 0.20, -0.004, 0.0185], [0.005, 0.42, 0.006, 0.0205], [-0.004, 0.62, -0.004, 0.0180], [0.014, 0.74, -0.012, 0.0155]];
      put("stick", baked("stick", (b) => {
        b.add(sweep(sp.map((c) => [c[0], c[1], c[2], c[3], c[3] * 0.92]), { seg: 8, sub: 5, capS: 1, capE: 1, up: [0, 0, 1] }), C.wood, {
          shade: (x, y, z, nx, ny, nz) => (0.8 + 0.3 * vnoise(Math.atan2(nz, nx) * 2 + 3, y * 16)) * (0.9 + 0.12 * ny) });
        for (const k of [[0.001, -0.20, 0.0, 0.026], [-0.002, 0.30, 0.004, 0.024], [0.0, 0.58, -0.004, 0.022]]) b.add(sph, C.woodDk, { p: [k[0], k[1], k[2]], s: [k[3], k[3] * 0.8, k[3]], r: [0.3, 0.2, 0.2] });
        b.add(g.torus(0.021, 0.0075, TAU, 6, 12), C.leatherDk, { p: [0, 0.05, 0], r: [PI / 2, 0, 0], s: [1, 1, 1.4] });
        b.add(cyl(0.018, 0.016, 0.03, 8), C.leatherDk, { p: [0, -0.545, 0] });
      }), { o: 0.045, name: "stick" });
    }


    /* ======================================================================
       HOB — the three-eyed hood-ghost riding the pack
       ====================================================================== */
    const HF = { c: [0, 0.068, 0.012], r: [0.088, 0.074, 0.064] };
    function hobSurface(az, el, off, outP, outN) {
      const ce = Math.cos(el), se = Math.sin(el), ca = Math.cos(az), sa = Math.sin(az);
      const x = HF.r[0] * ce * sa, y = HF.r[1] * se, z = HF.r[2] * ce * ca;
      let nx = x / (HF.r[0] * HF.r[0]), ny = y / (HF.r[1] * HF.r[1]), nz = z / (HF.r[2] * HF.r[2]);
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      outP[0] = HF.c[0] + x + nx * off; outP[1] = HF.c[1] + y + ny * off; outP[2] = HF.c[2] + z + nz * off;
      outN[0] = nx; outN[1] = ny; outN[2] = nz;
    }
    function hobFrame(az, el, off) {
      const P = [0, 0, 0], N = [0, 0, 0];
      hobSurface(az, el, off, P, N);
      const xa = [N[2], 0, -N[0]]; const xl = Math.hypot(xa[0], xa[1], xa[2]) || 1;
      const x1 = [xa[0] / xl, 0, xa[2] / xl];
      const y1 = [N[1] * x1[2] - N[2] * x1[1], N[2] * x1[0] - N[0] * x1[2], N[0] * x1[1] - N[1] * x1[0]];
      return { p: P, n: N, rot: frameEuler(x1, y1, N) };
    }
    {
      const shHob = (x, y, z, nx, ny, nz) => 0.9 + 0.14 * ny;
      /* body: little green lump + cream belly + orange bib + stubby feet */
      put("hobBody", baked("hobBody", (b) => {
        b.add(sph, C.hobBody, { p: [0, 0.046, -0.004], s: [0.074, 0.052, 0.064], grad: [C.hobHoodDk, 0.0, 0.07], shade: shHob });
        b.add(sph, C.hobBelly, { p: [0.004, 0.042, 0.046], s: [0.044, 0.040, 0.022], r: [-0.1, 0, 0.1] });
        b.add(sph, C.hobBib, { p: [0, 0.087, 0.046], s: [0.056, 0.014, 0.034], r: [0.55, 0, 0] });
        b.add(sph, C.hobBib, { p: [0.0, 0.080, 0.070], s: [0.020, 0.020, 0.010], r: [0.3, 0, 0] });
        b.add(g.torus(0.066, 0.012, TAU, 6, 16), C.hobHoodDk, { p: [0, 0.014, -0.002], r: [PI / 2, 0, 0], s: [1.0, 1.0, 1.1] });
        for (const sx of [-1, 1]) b.add(sph, C.hobHoodDk, { p: [sx * 0.040, 0.010, 0.046], s: [0.024, 0.014, 0.036] });
      }), { o: 0.035, name: "hobBody" });
      for (const sd of ["L", "R"]) {
        put("hobArm" + sd, baked("hobArm", (b) => {
          b.add(sph, C.hobBody, { p: [0, -0.026, 0], s: [0.019, 0.038, 0.019], shade: shHob });
          b.add(sph, C.hobHood, { p: [0, -0.058, 0.002], s: [0.016, 0.014, 0.016] });
        }), { o: 0.025, name: "hobArm" });
      }
      /* face (cream) */
      put("hobHead", baked("hobFace", (b) => {
        b.add(sph, C.hobFace, { p: HF.c, s: HF.r, shade: (x, y, z, nx, ny, nz) => 0.94 + 0.08 * ny });
        b.add(sph, C.hobFaceSh, { p: [0, HF.c[1] - 0.052, HF.c[2] + 0.022], s: [0.060, 0.026, 0.050] });
        b.add(sph, C.hobFace, { p: [0, HF.c[1] - 0.030, HF.c[2] + 0.040], s: [0.062, 0.040, 0.034] });
      }), { o: 0.04, name: "hobFace" });
      /* hood shell: smaller than the face at the front so the face pokes through */
      const hoodGeo = memo("hobHood", () => {
        const prof = [[0.000, 0.070], [0.025, 0.094], [0.068, 0.106], [0.115, 0.096], [0.150, 0.078], [0.172, 0.056], [0.184, 0.030], [0.190, 0.0]];
        const prAt = (v) => { const f = v * (prof.length - 1), i = Math.min(prof.length - 2, Math.floor(f)), t = f - i; const e = t * t * (3 - 2 * t); return [lerp(prof[i][0], prof[i + 1][0], t), lerp(prof[i][1], prof[i + 1][1], e * 0.6 + t * 0.4)]; };
        return surf(40, 22, (u, v, out) => {
          const az = (u - 0.5) * TAU, pa = prAt(v), y = pa[0];
          const aa = Math.abs(az);
          let f = lerp(0.70, 1.0, sstep(0.55, 1.30, aa));
          f = lerp(f, 1.0, sstep(0.125, 0.165, y));
          const brim = 0.016 * Math.exp(-Math.pow((y - 0.140) / 0.020, 2)) * (1 - sstep(0.5, 1.25, aa));
          const r = pa[1] * f + brim + 0.003 * Math.sin(az * 5 + y * 30);
          out[0] = Math.sin(az) * r; out[1] = y; out[2] = Math.cos(az) * r * 0.93 - 0.014;
        }, { wrapU: true, center: [0, 0.09, 0], yw: 0.5 });
      });
      put("hobHead", baked("hobHoodShell", (b) => {
        b.add(hoodGeo, C.hobHood, {
          grad: [C.hobHoodDk, 0.0, 0.07],
          shade: (x, y, z, nx, ny, nz) => (0.84 + 0.2 * vnoise(x * 60 + 5, y * 60 + z * 60)) * (0.92 + 0.12 * ny)
        });
      }), { o: 0.045, ds: true, name: "hobHood" });
      put("hoodTip", baked("hoodTipB", (b) => {
        b.add(sweep([[0, -0.034, 0, 0.066], [0, 0, 0, 0.056], [0, 0.036, -0.010, 0.040], [0, 0.066, -0.030, 0.025], [0, 0.086, -0.054, 0.012], [0, 0.097, -0.082, 0.004]],
          { seg: 12, sub: 4, capE: 1, up: [0, 0, 1] }), C.hobHood, {
          grad: [C.hobHoodLt, 0.0, 0.1],
          shade: (x, y, z, nx, ny, nz) => (0.86 + 0.2 * vnoise(x * 60 + 9, y * 60 + z * 60)) * (0.92 + 0.12 * ny)
        });
      }), { o: 0.04, name: "hoodTipMesh" });

      /* three yellow-ringed eyes; pupils are bones so they can dart; the eye bone scales to blink */
      const eyeSpec = [[-0.02, 0.36, 0.0225], [0.64, -0.08, 0.0230], [-0.62, 0.02, 0.0220]];
      const dgeo = (r) => memo("hobDisc" + r, () => capDisc(0.07, r, r, 18));
      const flatM = (hex, po) => { const m = A().mat.flat(hex, { side: THREE.DoubleSide, fog: false }); m.polygonOffset = true; m.polygonOffsetFactor = po; m.polygonOffsetUnits = po; return m; };
      const mBlack = flatM(C.hobPupil, -1), mYel = flatM(C.hobRing, -2), mPup = flatM(C.hobPupil, -3), mHi = flatM(0xffffff, -4);
      for (let i = 0; i < 3; i++) {
        const es = eyeSpec[i], fr = hobFrame(es[0], es[1], 0.0008), R_ = es[2];
        const eb = bone("hobEye" + i, "hobEyes", fr.p, fr.rot);
        const m0 = new THREE.Mesh(dgeo(R_ * 1.16), mBlack); m0.userData.noOutline = true; m0.castShadow = false; eb.add(m0);
        const m1 = new THREE.Mesh(dgeo(R_), mYel); m1.userData.noOutline = true; m1.position.z = 0.0004; m1.castShadow = false; eb.add(m1);
        const pb = bone("hobPupil" + i, "hobEye" + i, [0, 0, 0.0009]);
        const m2 = new THREE.Mesh(dgeo(R_ * 0.60), mPup); m2.userData.noOutline = true; m2.castShadow = false; pb.add(m2);
        const m3 = new THREE.Mesh(dgeo(R_ * 0.17), mHi); m3.userData.noOutline = true; m3.position.set(-R_ * 0.22, R_ * 0.26, 0.0006); m3.castShadow = false; pb.add(m3);
      }
      {
        const fr = hobFrame(0.0, 0.05, 0.0008);
        const nb = bone("hobNose", "hobHead", fr.p, fr.rot);
        const mn = new THREE.Mesh(dgeo(0.0042), mPup); mn.userData.noOutline = true; mn.castShadow = false; nb.add(mn);
      }
      /* mouth: hidden at rest (scale y 0 by layer), opens to grumble / spit; also the seed anchor */
      {
        const fr = hobFrame(0.0, -0.44, 0.0010);
        const mb = rig.bones["hobMouth"];
        mb.position.set(fr.p[0], fr.p[1], fr.p[2]);
        mb.rotation.set(fr.rot[0], fr.rot[1], fr.rot[2]);
        const mo = new THREE.Mesh(memo("hobMouthDisc", () => capDisc(0.07, 0.024, 0.016, 16)), flatM(C.hobMouth, -2)); mo.userData.noOutline = true; mo.castShadow = false;
        mb.add(mo);
        const tg = new THREE.Mesh(memo("hobTongue", () => capDisc(0.07, 0.012, 0.006, 12)), flatM(0xe0607a, -3)); tg.position.set(0, -0.006, 0.0006); tg.userData.noOutline = true; tg.castShadow = false;
        mb.add(tg);
      }
    }

    return finish(rig);
  }

  function finish(rig) {
    K.mergeRig(rig);
    rig.parts.root = rig.root; rig.parts.body = rig.body;
    const anim = K.anim(rig);
    anim.addClip("idle", [{ t: 0, bone: "chest", rot: [0, 0, 0] }, { t: 2.4, bone: "chest", rot: [0, 0, 0] }], { loop: true });
    anim.setBase("idle"); anim.play("idle", { fade: 0 }); anim.update(0);
    const meshCount = rig.countMeshes();
    return { id: "thistle", root: rig.root, parts: rig.parts, anim, height: DEF.height, radius: DEF.radius, team: DEF.team, rig, meshes: meshCount };
  }

  G.chars.define("thistle", DEF, build);
})();
