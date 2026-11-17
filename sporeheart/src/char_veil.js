/* ============================================================================
   SPOREHEART — src/char_veil.js
   THE POPPIED VEIL — assassin boss. Two forms sharing one rig:
     veil   "Duelist"   hammerhead helm, black rubber respirator, oversized navy
                        raincoat with red tape straps, olive pleated skirt,
                        mech right forearm, red katana + black saya
     veil2  "Unveiled"  coat torn off the shoulders, black red-panelled bodysuit,
                        armoured shoulders, both arms mech, visor lowered with
                        slit eyes, dual katanas, streaming tapes, hair lifted

   Everything is code: lofted shells, swept tubes, slabs, painted canvases.
   Geometry is built once per form (cached), pieces are welded per bone+material
   so the whole cast stays inside the mobile draw-call budget.
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  if (!G || !G.kit || !G.chars) throw new Error("char_veil.js requires charakit.js + characters.js");
  const K = G.kit;
  const PI = Math.PI, TAU = PI * 2;
  const T = () => G.THREE;
  const A = () => G.assets;
  const sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, abs = Math.abs;

  const BLADE_LEN = 1.0;      /* metres of visible blade (tsuba -> tip) */

  /* ---------------------------------------------------------------- utils */
  function sgnpow(v, e) { return v < 0 ? -Math.pow(-v, e) : Math.pow(v, e); }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function sstep(a, b, x) { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hexs = (n) => "#" + n.toString(16).padStart(6, "0");

  /* ---------------------------------------------------------------- grid
     Parametric surface -> indexed BufferGeometry. fn(u, v, out, i, j) writes
     out[0..2] (position) and may overwrite out[3..4] (uv). v runs top -> bottom.
     o.flip reverses winding; o.auto orients rows outward from their own centre;
     o.axis=[cx,cz] orients by the vector from a vertical axis; o.closeU welds the
     normal seam. */
  function grid(nu, nv, fn, o) {
    o = o || {};
    const TH = T();
    const cnt = (nu + 1) * (nv + 1);
    const pos = new Float32Array(cnt * 3), uvs = new Float32Array(cnt * 2);
    const out = [0, 0, 0, 0, 0];
    let k = 0, q = 0;
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        out[3] = i / nu; out[4] = 1 - j / nv;
        fn(i / nu, j / nv, out, i, j);
        pos[k++] = out[0]; pos[k++] = out[1]; pos[k++] = out[2];
        uvs[q++] = out[3]; uvs[q++] = out[4];
      }
    }
    let flip = !!o.flip;
    if (o.auto || o.axis) {
      let tot = 0;
      for (let j = 0; j < nv; j++) {
        let cx = 0, cy = 0, cz = 0;
        if (o.auto) {
          for (let i = 0; i < nu; i++) { const p = (j * (nu + 1) + i) * 3; cx += pos[p]; cy += pos[p + 1]; cz += pos[p + 2]; }
          cx /= nu; cy /= nu; cz /= nu;
        } else { cx = o.axis[0]; cz = o.axis[1]; }
        for (let i = 0; i < nu; i++) {
          const a = (j * (nu + 1) + i) * 3, b = a + (nu + 1) * 3, c = a + 3;
          const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
          const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const rx = pos[a] - cx, ry = o.auto ? pos[a + 1] - cy : 0, rz = pos[a + 2] - cz;
          tot += nx * rx + ny * ry + nz * rz;
        }
      }
      flip = tot < 0;
    }
    const idx = [];
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + nu + 1;
        if (!flip) idx.push(a, b, a + 1, b, b + 1, a + 1);
        else idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = new TH.BufferGeometry();
    g.setAttribute("position", new TH.BufferAttribute(pos, 3));
    g.setAttribute("uv", new TH.BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    if (o.closeU) {
      const n = g.attributes.normal;
      for (let j = 0; j <= nv; j++) {
        const a = j * (nu + 1), b = a + nu;
        const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b);
        const l = Math.hypot(x, y, z) || 1;
        n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
      }
    }
    return g;
  }

  /* ----------------------------------------------------------- Bld (welder)
     Collects transformed copies of geometries; geo() returns one BufferGeometry. */
  let _m4, _n3, _eu, _qt, _va, _vs, _col;
  function scratch() {
    if (_m4) return;
    const TH = T();
    _m4 = new TH.Matrix4(); _n3 = new TH.Matrix3(); _eu = new TH.Euler(); _qt = new TH.Quaternion();
    _va = new TH.Vector3(); _vs = new TH.Vector3(); _col = new TH.Color();
  }
  function Bld() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }
  /* o: {p, r, s, order, uv:[u0,v0,du,dv]} */
  Bld.prototype.add = function (g, o) {
    o = o || {}; scratch();
    const p = o.p || [0, 0, 0], r = o.r || [0, 0, 0];
    const s = o.s === undefined ? [1, 1, 1] : (typeof o.s === "number" ? [o.s, o.s, o.s] : o.s);
    _eu.set(r[0], r[1], r[2], o.order || "XYZ"); _qt.setFromEuler(_eu);
    _va.set(p[0], p[1], p[2]); _vs.set(s[0], s[1], s[2]);
    _m4.compose(_va, _qt, _vs); _n3.getNormalMatrix(_m4);
    const det = s[0] * s[1] * s[2];
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, ca = g.attributes.color;
    const e = _m4.elements, ne = _n3.elements, base = this.n, cnt = pa.count;
    const uvm = o.uv;
    let cr = 1, cg = 1, cb = 1;
    if (o.c !== undefined) { _col.setHex(o.c); cr = _col.r; cg = _col.g; cb = _col.b; }
    for (let i = 0; i < cnt; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      this.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      if (na) {
        const nx = na.getX(i), ny = na.getY(i), nz = na.getZ(i);
        const a = ne[0] * nx + ne[3] * ny + ne[6] * nz, b = ne[1] * nx + ne[4] * ny + ne[7] * nz, c = ne[2] * nx + ne[5] * ny + ne[8] * nz;
        const l = Math.hypot(a, b, c) || 1;
        this.nor.push(a / l, b / l, c / l);
      } else this.nor.push(0, 1, 0);
      if (ua) {
        const u = ua.getX(i), v = ua.getY(i);
        if (uvm) this.uv.push(uvm[0] + u * uvm[2], uvm[1] + v * uvm[3]); else this.uv.push(u, v);
      } else this.uv.push(0, 0);
      if (ca && o.c === undefined) this.col.push(ca.getX(i), ca.getY(i), ca.getZ(i)); else this.col.push(cr, cg, cb);
    }
    const ix = g.index;
    const ni = ix ? ix.count : cnt;
    for (let i = 0; i < ni; i += 3) {
      const a = ix ? ix.getX(i) : i, b = ix ? ix.getX(i + 1) : i + 1, c = ix ? ix.getX(i + 2) : i + 2;
      if (det >= 0) this.idx.push(base + a, base + b, base + c); else this.idx.push(base + a, base + c, base + b);
    }
    this.n += cnt;
    return this;
  };
  Bld.prototype.geo = function () {
    const TH = T();
    const g = new TH.BufferGeometry();
    g.setAttribute("position", new TH.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute("normal", new TH.BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute("uv", new TH.BufferAttribute(new Float32Array(this.uv), 2));
    g.setAttribute("color", new TH.BufferAttribute(new Float32Array(this.col), 3));
    g.setIndex(new TH.BufferAttribute(this.n > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx), 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  };

  /* --------------------------------------------------- profile + loft surface
     rings: [{y, rx, rz, cx, cz}] ordered top -> bottom (y descending). Hermite
     interpolation in y gives smooth lofts from a handful of rings. */
  function profile(rings) {
    const n = rings.length;
    const s = new Float32Array(n), K4 = ["rx", "rz", "cx", "cz"];
    for (let i = 0; i < n; i++) s[i] = rings[0].y - rings[i].y;
    const f = {}, d = {};
    for (let k = 0; k < 4; k++) {
      const key = K4[k];
      f[key] = new Float32Array(n); d[key] = new Float32Array(n);
      for (let i = 0; i < n; i++) f[key][i] = rings[i][key] || 0;
      for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        d[key][i] = b === a ? 0 : (f[key][b] - f[key][a]) / (s[b] - s[a]);
      }
    }
    return function (y, out) {
      const sv = rings[0].y - y;
      let i = 0;
      if (sv <= 0) { i = 0; } else if (sv >= s[n - 1]) { i = n - 2; } else { while (i < n - 2 && sv > s[i + 1]) i++; }
      const h = s[i + 1] - s[i];
      let t = (sv - s[i]) / h;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      const t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      for (let k = 0; k < 4; k++) {
        const key = K4[k];
        out[key] = h00 * f[key][i] + h10 * h * d[key][i] + h01 * f[key][i + 1] + h11 * h * d[key][i + 1];
        if (k < 2 && out[key] < 0) out[key] = 0;
      }
    };
  }
  /* surf(y, th, out, lift): th = 0 is +Z (front), growing toward +X */
  function loftSurf(rings, o) {
    o = o || {};
    const prof = profile(rings), P = { rx: 0, rz: 0, cx: 0, cz: 0 };
    const sq = o.sq || 2, e = 2 / sq, fold = o.fold;
    return function (y, th, out, lift) {
      prof(y, P);
      let s = sin(th), c = cos(th);
      if (sq !== 2) { s = sgnpow(s, e); c = sgnpow(c, e); }
      const k = fold ? fold(th, y) : 1;
      lift = lift || 0;
      out[0] = P.cx + (P.rx * k + lift) * s;
      out[1] = y;
      out[2] = P.cz + (P.rz * k + lift) * c;
    };
  }
  /* shell from a surface: u runs th0..th1 (default full turn, seam at the back) */
  function loft(surf, yTop, yBot, rows, seg, o) {
    o = o || {};
    const th0 = o.th0 === undefined ? -PI : o.th0, th1 = o.th1 === undefined ? PI : o.th1;
    const lift = o.lift || 0, hem = o.hem;
    return grid(seg, rows, function (u, v, out) {
      const th = th0 + (th1 - th0) * u;
      let yb = yBot;
      if (hem) yb += hem(th);
      const y = yTop + (yb - yTop) * v;
      surf(y, th, out, lift);
      out[3] = o.uvu ? o.uvu(u) : u;
      out[4] = 1 - (o.vOf ? o.vOf(y, yTop, yBot) : v);
    }, { auto: true, closeU: th1 - th0 > TAU - 0.01 });
  }
  /* decal: flat shape draped on a loft surface. shape(u, v) -> [dx, dy] (metres) */
  function decal(surf, thC, yC, nu, nv, shape, lift, flip) {
    const p0 = [0, 0, 0], p1 = [0, 0, 0];
    surf(yC, thC, p0, 0); surf(yC, thC + 0.1, p1, 0);
    const Rc = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) / 0.1 || 0.2;
    const sh = [0, 0];
    return grid(nu, nv, function (u, v, out) {
      shape(u, v, sh);
      surf(yC + sh[1], thC + sh[0] / Rc, out, lift);
    }, { axis: [0, 0], flip: flip });
  }
  const ringShape = (rxo, ryo, rxi, ryi, rot) => function (u, v, o) {
    const a = u * TAU, r0x = lerp(rxi, rxo, v), r0y = lerp(ryi, ryo, v);
    const x = cos(a) * r0x, y = sin(a) * r0y, c = cos(rot || 0), s = sin(rot || 0);
    o[0] = x * c - y * s; o[1] = x * s + y * c;
  };
  const rectShape = (w, h, rot) => function (u, v, o) {
    const x = (u - 0.5) * w, y = (0.5 - v) * h, c = cos(rot || 0), s = sin(rot || 0);
    o[0] = x * c - y * s; o[1] = x * s + y * c;
  };

  /* ----------------------------------------------------------------- tube
     Swept elliptical tube along a Catmull-Rom path. radii: [[rx, rz], ...]
     (matching pts) or numbers. Rounded end caps. */
  function tube(pts, radii, seg, rows, o) {
    o = o || {};
    if (typeof radii === "number") radii = [radii, radii];
    const TH = T();
    const vp = pts.map((p) => new TH.Vector3(p[0], p[1], p[2]));
    const curve = new TH.CatmullRomCurve3(vp, false, "centripetal");
    const nr = rows + 1;
    const P = [], Tn = [], R = [];
    const ref0 = new TH.Vector3(0, 0, 1);
    let nrm = null;
    const tn = new TH.Vector3(), bn = new TH.Vector3();
    for (let r = 0; r < nr; r++) {
      const t = r / rows;
      P.push(curve.getPoint(t)); tn.copy(curve.getTangent(t)).normalize(); Tn.push(tn.clone());
      if (!nrm) {
        const ref = abs(tn.z) < 0.9 ? ref0 : new TH.Vector3(1, 0, 0);
        nrm = ref.clone().sub(tn.clone().multiplyScalar(ref.dot(tn))).normalize();
      } else {
        nrm = nrm.clone().sub(tn.clone().multiplyScalar(nrm.dot(tn))).normalize();
      }
      const fi = t * (radii.length - 1), i0 = Math.min(radii.length - 2, Math.floor(fi)), ft = fi - i0;
      const ra = radii[i0], rb = radii[Math.min(radii.length - 1, i0 + 1)];
      const rxa = typeof ra === "number" ? ra : ra[0], rza = typeof ra === "number" ? ra : ra[1];
      const rxb = typeof rb === "number" ? rb : rb[0], rzb = typeof rb === "number" ? rb : rb[1];
      R.push({ n: nrm, b: bn.crossVectors(tn, nrm).clone(), rx: lerp(rxa, rxb, ft), rz: lerp(rza, rzb, ft) });
    }
    const capRows = o.caps === false ? 0 : 2;
    const total = nr + capRows * 2;
    return grid(seg, total - 1, function (u, v, out, i, j) {
      let r, sc = 1, ex = 0;
      if (j < capRows) { r = 0; sc = j === 0 ? 0 : 0.82; ex = j === 0 ? -1 : -0.5; }
      else if (j >= capRows + nr) { r = nr - 1; const k = j - (capRows + nr); sc = k === capRows - 1 ? 0 : 0.82; ex = k === capRows - 1 ? 1 : 0.5; }
      else r = j - capRows;
      const a = u * TAU, rr = R[r], p = P[r], tt = Tn[r];
      const ca = cos(a) * rr.rx * sc, sa = sin(a) * rr.rz * sc;
      ex *= rr.rx * 0.55;
      out[0] = p.x + rr.n.x * ca + rr.b.x * sa + tt.x * ex;
      out[1] = p.y + rr.n.y * ca + rr.b.y * sa + tt.y * ex;
      out[2] = p.z + rr.n.z * ca + rr.b.z * sa + tt.z * ex;
    }, { auto: true, closeU: true });
  }

  /* ----------------------------------------------------------------- slab
     Thick plate from a parametric sheet: two offset skins + rim strip. */
  function slab(nu, nv, fn, th, o) {
    o = o || {};
    const TH = T();
    const cnt = (nu + 1) * (nv + 1);
    const base = new Float32Array(cnt * 3), nrm = new Float32Array(cnt * 3);
    const a = [0, 0, 0, 0, 0], b = [0, 0, 0, 0, 0], c = [0, 0, 0, 0, 0], d = [0, 0, 0, 0, 0];
    const eps = 0.002;
    const uvs = new Float32Array(cnt * 2);
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const u = i / nu, v = j / nv, k = (j * (nu + 1) + i) * 3;
        a[3] = u; a[4] = 1 - v;
        fn(u, v, a, i, j);
        base[k] = a[0]; base[k + 1] = a[1]; base[k + 2] = a[2];
        uvs[(j * (nu + 1) + i) * 2] = a[3]; uvs[(j * (nu + 1) + i) * 2 + 1] = a[4];
        fn(Math.min(1, u + eps), v, b, i, j); fn(Math.max(0, u - eps), v, c, i, j);
        const ux = b[0] - c[0], uy = b[1] - c[1], uz = b[2] - c[2];
        fn(u, Math.min(1, v + eps), b, i, j); fn(u, Math.max(0, v - eps), d, i, j);
        const vx = b[0] - d[0], vy = b[1] - d[1], vz = b[2] - d[2];
        let nx = vy * uz - vz * uy, ny = vz * ux - vx * uz, nz = vx * uy - vy * ux;
        const l = Math.hypot(nx, ny, nz) || 1;
        nrm[k] = nx / l; nrm[k + 1] = ny / l; nrm[k + 2] = nz / l;
      }
    }
    const pos = new Float32Array(cnt * 6), uv2 = new Float32Array(cnt * 4);
    for (let n = 0; n < cnt; n++) {
      const t0 = typeof th === "function" ? th(n % (nu + 1) / nu, Math.floor(n / (nu + 1)) / nv) : th;
      for (let q = 0; q < 3; q++) {
        pos[n * 3 + q] = base[n * 3 + q] + nrm[n * 3 + q] * t0 * 0.5;
        pos[cnt * 3 + n * 3 + q] = base[n * 3 + q] - nrm[n * 3 + q] * t0 * 0.5;
      }
      uv2[n * 2] = uvs[n * 2]; uv2[n * 2 + 1] = uvs[n * 2 + 1];
      uv2[cnt * 2 + n * 2] = uvs[n * 2]; uv2[cnt * 2 + n * 2 + 1] = uvs[n * 2 + 1];
    }
    const idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const p = j * (nu + 1) + i, q = p + nu + 1;
      idx.push(p, q, p + 1, q, q + 1, p + 1);
      idx.push(cnt + p, cnt + p + 1, cnt + q, cnt + q, cnt + p + 1, cnt + q + 1);
    }
    for (let i = 0; i < nu; i++) {
      let p0 = i, p1 = i + 1;
      idx.push(p0, p1, cnt + p0, p1, cnt + p1, cnt + p0);
      p0 = nv * (nu + 1) + i; p1 = p0 + 1;
      idx.push(p0, cnt + p0, p1, p1, cnt + p0, cnt + p1);
    }
    for (let j = 0; j < nv; j++) {
      let p0 = j * (nu + 1), p1 = (j + 1) * (nu + 1);
      idx.push(p0, cnt + p0, p1, p1, cnt + p0, cnt + p1);
      p0 = j * (nu + 1) + nu; p1 = (j + 1) * (nu + 1) + nu;
      idx.push(p0, p1, cnt + p0, p1, cnt + p1, cnt + p0);
    }
    const g = new TH.BufferGeometry();
    g.setAttribute("position", new TH.BufferAttribute(pos, 3));
    g.setAttribute("uv", new TH.BufferAttribute(uv2, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  /* superellipsoid (unit): n=2 sphere, n~4 chunky rounded box */
  const SUPER = Object.create(null);
  function superG(n, nu, nv) {
    nu = nu || 16; nv = nv || 10;
    const key = n + "_" + nu + "_" + nv;
    if (SUPER[key]) return SUPER[key];
    const e = 2 / n;
    SUPER[key] = grid(nu, nv, function (u, v, out) {
      const lon = u * TAU, lat = (0.5 - v) * PI;
      const cl = sgnpow(cos(lat), e), sl = sgnpow(sin(lat), e);
      out[0] = cl * sgnpow(cos(lon), e); out[1] = sl; out[2] = -cl * sgnpow(sin(lon), e);
    }, { auto: true, closeU: true });
    return SUPER[key];
  }

  /* ------------------------------------------------------- canvas textures */
  const TEXC = Object.create(null);
  function tex(key, w, h, draw, rep) {
    if (TEXC[key]) return TEXC[key];
    const TH = T();
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    draw(ctx, w, h);
    const t = new TH.CanvasTexture(c);
    t.colorSpace = TH.SRGBColorSpace;
    t.anisotropy = 4;
    if (rep) t.wrapS = t.wrapT = TH.RepeatWrapping;
    TEXC[key] = t;
    return t;
  }

  /* silver hair curtain: strands with ragged pointed tips (alpha-cut), angel-ring band */
  function paintHair(tip, dark) {
    return function (ctx, w, h) {
      const R = rng(7 + (tip ? 3 : 0));
      ctx.clearRect(0, 0, w, h);
      const n = 26, sw = w / n;
      for (let j = 0; j < n; j++) {
        const x0 = j * sw - sw * 0.1, ww = sw * (1.05 + R() * 0.5);
        const L = h * (0.80 + R() * 0.2) - (j % 5 === 0 ? h * 0.07 : 0);
        const tp = h * (0.05 + R() * 0.05);
        const g = ctx.createLinearGradient(0, 0, 0, L);
        g.addColorStop(0, "#9eb0cc"); g.addColorStop(0.07, "#c9d7ea"); g.addColorStop(0.15, "#f4f8ff");
        g.addColorStop(0.24, "#dbe5f2"); g.addColorStop(0.6, "#e6edf7"); g.addColorStop(1, "#c4d3e8");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, 0); ctx.lineTo(x0 + ww, 0); ctx.lineTo(x0 + ww, L - tp);
        ctx.lineTo(x0 + ww * (0.35 + R() * 0.3), L); ctx.lineTo(x0, L - tp * (0.6 + R() * 0.5));
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(96,118,160," + (0.28 + R() * 0.25) + ")"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x0 + ww, 0); ctx.lineTo(x0 + ww, L - tp); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255," + (0.35 + R() * 0.3) + ")"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x0 + ww * 0.35, h * 0.1); ctx.lineTo(x0 + ww * 0.3, L - tp * 1.4); ctx.stroke();
      }
      if (dark) {      /* shadow near the scalp and a cool veil */
        const gg = ctx.createLinearGradient(0, 0, 0, h * 0.5);
        gg.addColorStop(0, "rgba(40,60,110,0.35)"); gg.addColorStop(1, "rgba(40,60,110,0)");
        ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h * 0.5);
      }
      if (tip) {         /* red-tinted tips (form 2) */
        ctx.globalCompositeOperation = "source-atop";
        const g2 = ctx.createLinearGradient(0, h * 0.5, 0, h);
        g2.addColorStop(0, "rgba(255,70,60,0)"); g2.addColorStop(0.55, "rgba(255,70,56,0.62)"); g2.addColorStop(1, "rgba(255,40,36,0.95)");
        ctx.fillStyle = g2; ctx.fillRect(0, h * 0.5, w, h * 0.5);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalCompositeOperation = "source-over";
    };
  }

  /* scalp / fringe texture (no alpha cut; full coverage) */
  function paintHairCap(ctx, w, h) {
    const R = rng(21);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#e8f0fa"); g.addColorStop(0.35, "#dfe8f4"); g.addColorStop(1, "#c3d2e8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const x = R() * w;
      ctx.strokeStyle = R() < 0.5 ? "rgba(90,115,160,0.30)" : "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1 + R() * 1.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (R() - 0.5) * 6, h); ctx.stroke();
    }
    /* angel ring */
    const rg = ctx.createLinearGradient(0, h * 0.22, 0, h * 0.5);
    rg.addColorStop(0, "rgba(255,255,255,0)"); rg.addColorStop(0.5, "rgba(255,255,255,0.65)"); rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, h * 0.22, w, h * 0.28);
  }

  /* coat cloth: navy slate with brush strokes, creases and a little wet sheen */
  function paintCoat(ctx, w, h) {
    const R = rng(11);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#35506a"); g.addColorStop(0.5, "#2c4560"); g.addColorStop(1, "#243a52");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) {
      const x = R() * w, y = R() * h, l = 12 + R() * 50, a = 1.2 + (R() - 0.5) * 0.9;
      const lite = R() < 0.45;
      ctx.strokeStyle = lite ? "rgba(96,132,166," + (0.05 + R() * 0.12) + ")" : "rgba(10,20,34," + (0.06 + R() * 0.13) + ")";
      ctx.lineWidth = 2 + R() * 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cos(a) * l, y + sin(a) * l); ctx.stroke();
    }
    /* creases */
    for (let i = 0; i < 26; i++) {
      const x = R() * w;
      ctx.strokeStyle = "rgba(8,16,28,0.20)"; ctx.lineWidth = 1.5 + R() * 2;
      ctx.beginPath(); ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 40) ctx.lineTo(x + sin(y * 0.03 + i) * 9, y);
      ctx.stroke();
    }
    /* tiny red stitch ticks */
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = "rgba(235,70,56,0.5)";
      ctx.fillRect(R() * w, R() * h, 7 + R() * 9, 2);
    }
  }

  /* hammerhead crown — painted from above: front = canvas top, character's left (+X) = canvas right */
  function paintHelm(ctx, w, h) {
    const R = rng(5);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#9ab4cc"); g.addColorStop(0.5, "#86a3bd"); g.addColorStop(1, "#7391ac");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    /* brushed wear */
    for (let i = 0; i < 700; i++) {
      const x = R() * w, y = R() * h, l = 10 + R() * 40;
      ctx.strokeStyle = R() < 0.5 ? "rgba(190,214,236," + (0.05 + R() * 0.1) + ")" : "rgba(52,76,104," + (0.05 + R() * 0.1) + ")";
      ctx.lineWidth = 1.5 + R() * 3.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (R() - 0.5) * 8); ctx.stroke();
    }
    /* panel seams */
    ctx.strokeStyle = "rgba(40,62,88,0.7)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.12); ctx.lineTo(w * 0.5, h * 0.92); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.12, h * 0.5); ctx.lineTo(w * 0.88, h * 0.5); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.2); ctx.quadraticCurveTo(w * 0.5, h * 0.3, w * 0.8, h * 0.2); ctx.stroke();
    /* red paint: big splotches on the character's right (canvas left) end, a star, a circle on the left side */
    ctx.fillStyle = "#f44a38";
    function blob(cx, cy, r, n, j) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = i / n * TAU, rr = r * (1 - j + R() * j * 2);
        const x = cx + cos(a) * rr * 1.25, y = cy + sin(a) * rr;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill();
    }
    blob(w * 0.13, h * 0.30, h * 0.15, 11, 0.38);
    blob(w * 0.21, h * 0.50, h * 0.09, 9, 0.42);
    blob(w * 0.30, h * 0.18, h * 0.06, 8, 0.4);
    blob(w * 0.07, h * 0.62, h * 0.05, 7, 0.4);
    blob(w * 0.93, h * 0.74, h * 0.045, 7, 0.4);
    /* star */
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -PI / 2 + i * PI / 5, r = (i % 2 ? 0.45 : 1) * h * 0.075;
      const x = w * 0.31 + cos(a) * r, y = h * 0.40 + sin(a) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    /* red circle with slit */
    ctx.beginPath(); ctx.arc(w * 0.74, h * 0.46, h * 0.085, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#7a1c18"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w * 0.74 - h * 0.07, h * 0.46 + h * 0.025); ctx.lineTo(w * 0.74 + h * 0.07, h * 0.46 - h * 0.03); ctx.stroke();
    /* rim stripe */
    ctx.fillStyle = "rgba(244,74,56,0.9)"; ctx.fillRect(w * 0.64, h * 0.03, w * 0.07, h * 0.012);
    /* scratches */
    ctx.strokeStyle = "rgba(235,245,255,0.55)"; ctx.lineWidth = 1.4;
    for (let i = 0; i < 22; i++) {
      const x = R() * w, y = R() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + R() * 22, y - 4 + R() * 8); ctx.stroke();
    }
  }

  /* olive pleated skirt */
  function paintSkirt(ctx, w, h) {
    const R = rng(13);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#8b9a68"); g.addColorStop(1, "#9aa97a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += w / 24) {
      ctx.fillStyle = "rgba(40,60,50,0.20)"; ctx.fillRect(x, 0, w / 60, h);
      ctx.fillStyle = "rgba(232,240,214,0.14)"; ctx.fillRect(x + w / 40, 0, w / 70, h);
    }
    for (let i = 0; i < 240; i++) {
      ctx.strokeStyle = R() < 0.5 ? "rgba(50,70,28,0.12)" : "rgba(236,242,170,0.10)";
      ctx.lineWidth = 1 + R() * 3;
      const x = R() * w, y = R() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 5, y + 12 + R() * 28); ctx.stroke();
    }
    const hg = ctx.createLinearGradient(0, h * 0.8, 0, h);
    hg.addColorStop(0, "rgba(30,40,20,0)"); hg.addColorStop(1, "rgba(30,40,20,0.35)");
    ctx.fillStyle = hg; ctx.fillRect(0, h * 0.8, w, h * 0.2);
  }

  /* hilt wrap — red ito with dark lozenge gaps */
  function paintWrap(ctx, w, h) {
    ctx.fillStyle = "#2a1112"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e0432f";
    const s = w / 2;
    for (let j = -1; j < 3; j++) for (let i = -1; i < 3; i++) {
      const cx = i * s + (j % 2 ? s / 2 : 0), cy = j * s * 0.5 + s * 0.25;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.36); ctx.lineTo(cx + s * 0.42, cy); ctx.lineTo(cx, cy + s * 0.36); ctx.lineTo(cx - s * 0.42, cy); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,170,120,0.35)";
    for (let j = 0; j < 4; j++) ctx.fillRect(0, j * h / 4 + 2, w, 2);
  }

  /* saya — black lacquer with a lattice wrap near the mouth */
  function paintSaya(ctx, w, h) {
    ctx.fillStyle = "#14181f"; ctx.fillRect(0, 0, w, h);
    const lg = ctx.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, "rgba(120,150,190,0)"); lg.addColorStop(0.3, "rgba(120,150,190,0.25)"); lg.addColorStop(0.5, "rgba(120,150,190,0)");
    ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2c3644"; ctx.lineWidth = 3;
    for (let k = -h; k < h * 2; k += 14) {
      ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(w, k + w); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, k + w); ctx.lineTo(w, k); ctx.stroke();
    }
    ctx.fillStyle = "#14181f"; ctx.fillRect(0, h * 0.35, w, h * 0.65);
    ctx.fillStyle = "rgba(200,70,56,0.8)"; ctx.fillRect(0, h * 0.34, w, 5);
  }

  /* form-2 bodysuit — black with red panel seams */
  function paintSuit(ctx, w, h) {
    const R = rng(17);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1c222d"); g.addColorStop(1, "#141922");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      ctx.strokeStyle = R() < 0.5 ? "rgba(96,120,160,0.10)" : "rgba(0,0,0,0.18)";
      ctx.lineWidth = 2 + R() * 4;
      const x = R() * w, y = R() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 10, y + 14 + R() * 26); ctx.stroke();
    }
    ctx.fillStyle = "#e8402e";
    ctx.fillRect(w * 0.48, 0, w * 0.04, h);                     /* centre line (front) */
    ctx.fillRect(0, h * 0.62, w, h * 0.035);                    /* waist stripe */
    ctx.fillRect(0, h * 0.18, w, h * 0.02);
    ctx.fillStyle = "rgba(232,64,46,0.9)";
    for (let k = 0; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(w * 0.1 + k * w * 0.2, h * 0.7); ctx.lineTo(w * 0.2 + k * w * 0.2, h * 0.7); ctx.lineTo(w * 0.15 + k * w * 0.2, h * 0.98); ctx.closePath(); ctx.fill();
    }
  }

  /* face decals — red-eyed pale girl (form 1) / mouth + war marks (form 2).
     Canvas covers theta in [-0.8, 0.8], head height y in [0.0, 0.2] (chin..brow). */
  function paintFace(form) {
    return function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      const sg = ctx.createLinearGradient(0, 0, 0, h);
      sg.addColorStop(0, "#d9cbe2"); sg.addColorStop(0.28, "#f1e2ee"); sg.addColorStop(1, "#f6e9f1");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
      const sh = ctx.createLinearGradient(w * 0.5, 0, w, 0);
      sh.addColorStop(0, "rgba(150,130,190,0)"); sh.addColorStop(1, "rgba(150,130,190,0.30)");
      ctx.fillStyle = sh; ctx.fillRect(w * 0.5, 0, w * 0.5, h);
      const Y = (yw) => (0.2 - yw) / 0.2 * h;
      const X = (th) => (th + 0.8) / 1.6 * w;
      /* blush */
      const bl = (cx, cy, rr) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, "rgba(232,120,150,0.30)"); g.addColorStop(1, "rgba(232,120,150,0)");
        ctx.fillStyle = g; ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      };
      bl(X(-0.5), Y(0.062), 36); bl(X(0.5), Y(0.062), 36);
      /* nose hint */
      ctx.strokeStyle = "rgba(168,126,152,0.8)"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(X(0.015), Y(0.074)); ctx.lineTo(X(0.05), Y(0.062)); ctx.stroke();
      /* mouth: thin red lips, slight smirk */
      const my = Y(0.040);
      ctx.fillStyle = "#e0243a";
      ctx.beginPath();
      ctx.moveTo(X(-0.12), my + 3); ctx.quadraticCurveTo(X(-0.02), my - 12, X(0.0), my - 4);
      ctx.quadraticCurveTo(X(0.03), my - 12, X(0.13), my - 2); ctx.quadraticCurveTo(X(0.02), my + 20, X(-0.12), my + 3);
      ctx.fill();
      ctx.strokeStyle = "#7a1424"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(X(-0.12), my + 3); ctx.quadraticCurveTo(X(0.0), my + 2, X(0.13), my - 2); ctx.stroke();
      if (form === 1) {
        for (let s = -1; s <= 1; s += 2) {
          const cx = X(s * 0.37), cy = Y(0.108);
          ctx.save(); ctx.translate(cx, cy); ctx.scale(s, 1);
          /* sclera */
          ctx.fillStyle = "#efe8f3";
          ctx.beginPath(); ctx.moveTo(-58, 6); ctx.quadraticCurveTo(-8, -40, 54, -18); ctx.quadraticCurveTo(10, 30, -58, 6); ctx.fill();
          /* iris (red) */
          const ig = ctx.createRadialGradient(0, -2, 2, 0, -2, 31);
          ig.addColorStop(0, "#ff7660"); ig.addColorStop(0.5, "#e8222c"); ig.addColorStop(1, "#7a0c1c");
          ctx.save(); ctx.beginPath(); ctx.moveTo(-58, 6); ctx.quadraticCurveTo(-8, -40, 54, -18); ctx.quadraticCurveTo(10, 30, -58, 6); ctx.clip();
          ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(-2, -2, 28, 34, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "#2a0710"; ctx.beginPath(); ctx.ellipse(-2, -2, 8, 22, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.arc(-11, -13, 6, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(255,200,190,0.6)"; ctx.beginPath(); ctx.arc(8, 8, 3, 0, TAU); ctx.fill();
          /* upper lid shadow */
          const lg = ctx.createLinearGradient(0, -34, 0, -4);
          lg.addColorStop(0, "rgba(40,16,40,0.55)"); lg.addColorStop(1, "rgba(40,16,40,0)");
          ctx.fillStyle = lg; ctx.fillRect(-60, -40, 120, 40);
          ctx.restore();
          /* heavy upper lash, flicked outward */
          ctx.strokeStyle = "#1b1220"; ctx.lineWidth = 7; ctx.lineJoin = "round";
          ctx.beginPath(); ctx.moveTo(-60, 7); ctx.quadraticCurveTo(-8, -42, 56, -20); ctx.stroke();
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(52, -19); ctx.lineTo(70, -30); ctx.stroke();
          ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(120,40,70,0.8)";
          ctx.beginPath(); ctx.moveTo(-50, 12); ctx.quadraticCurveTo(0, 30, 40, 4); ctx.stroke();
          /* crease + brow */
          ctx.strokeStyle = "rgba(150,110,150,0.6)"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(-46, -12); ctx.quadraticCurveTo(0, -56, 48, -34); ctx.stroke();
          ctx.strokeStyle = "rgba(160,176,200,0.9)"; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(-50, -52); ctx.quadraticCurveTo(0, -78, 56, -58); ctx.stroke();
          ctx.restore();
        }
      } else {
        /* war marks: two red slashes under the visor */
        ctx.strokeStyle = "rgba(240,52,44,0.9)"; ctx.lineWidth = 7; ctx.lineCap = "round";
        for (let s = -1; s <= 1; s += 2) {
          ctx.beginPath(); ctx.moveTo(X(s * 0.52), Y(0.095)); ctx.lineTo(X(s * 0.40), Y(0.045)); ctx.stroke();
          ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(s * 0.58), Y(0.075)); ctx.lineTo(X(s * 0.47), Y(0.03)); ctx.stroke(); ctx.lineWidth = 7;
        }
      }
    };
  }

  function featherFace(fn) {
    return function (ctx, w, h) {
      fn(ctx, w, h);
      ctx.globalCompositeOperation = "destination-in";
      let g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.1, "rgba(0,0,0,1)"); g.addColorStop(0.9, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.9, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    };
  }

  /* soft red glow disc used for the iris/lens glow overlays */
  function paintGlow(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,0.75)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  /* ============================================================ small shapes */
  const GEO = Object.create(null);      /* welded geometry cache: form|bone|mat */
  const MATS = Object.create(null);     /* material tables per form */
  const SHARED = Object.create(null);   /* shared one-off geometries */
  let VCM = null;

  function shared(key, make) { return SHARED[key] || (SHARED[key] = make()); }
  function eulerTo(nx, ny, nz) {        /* XYZ euler turning +Y into the given direction */
    const TH = T();
    const q = new TH.Quaternion().setFromUnitVectors(new TH.Vector3(0, 1, 0), new TH.Vector3(nx, ny, nz).normalize());
    const e = new TH.Euler().setFromQuaternion(q, "XYZ");
    return [e.x, e.y, e.z];
  }

  /* flat palette baked into vertex colours (albedo; the toon ramp + key light lift it) */
  const C = {
    skin: 0xf2dce8, boot: 0xe6edf0, guard: 0xa8bdb6, sole: 0x37424f, metal: 0xa6bac9, metalD: 0x5a6d82, glove: 0x182029,
    rubber: 0x1f2a36, rubberHi: 0x58728a, red: 0xe9402e, redD: 0x8e231c, helmP: 0x88a6c0, helmD: 0x56708c, helmBlk: 0x141c28,
    lens: 0x0b1118, tape: 0xee5f56, tapeTip: 0xa5b9b2, poppy: 0xff4636, poppyH: 0x2a1119, poppyS: 0xffe19a, suitD: 0x1a212c,
    coatDk: 0x182332, tsuba: 0x3a475a, sayaTip: 0xe8e2d4, white: 0xffffff
  };

  /* poppy: five cupped petals + dark heart; local +Y is the bloom axis, radius 1 */
  function petalGeo() {
    return shared("petal", () => grid(6, 7, function (u, v, out) {
      const x = (u - 0.5) * 2;
      const hw = (0.12 + 0.5 * sin(Math.min(v, 1) * PI * 0.62)) * sqrt(Math.max(0, 1 - Math.pow(v, 7)));
      const X = x * hw;
      out[0] = X; out[2] = v * 1.0; out[1] = 0.32 * Math.pow(v, 1.4) + 0.95 * X * X;
    }, {}));
  }
  function poppyGeo() {
    return shared("poppy", () => {
      const b = new Bld();
      for (let k = 0; k < 5; k++) b.add(petalGeo(), { c: k % 2 ? 0xff4a38 : 0xf23b2c, r: [-0.62 + (k % 2) * 0.14, k * TAU / 5 + 0.3, 0], order: "YXZ", s: [1.02 + (k % 3) * 0.06, 1, 1.0 + (k % 2) * 0.08] });
      b.add(K.geo.sphereLo(), { c: C.poppyH, p: [0, 0.06, 0], s: [0.2, 0.13, 0.2] });
      for (let k = 0; k < 8; k++) {
        const a = k * TAU / 8;
        b.add(K.geo.sphereLo(), { c: C.poppyS, p: [cos(a) * 0.17, 0.13, sin(a) * 0.17], s: 0.035 });
      }
      return b.geo();
    });
  }

  /* hammerhead crown shell (helmet-local; +Z front). */
  const CROWN = { a: 0.31, bf: 0.145, bb: 0.155, H: 0.145, n: 3.4, D: 0.056 };
  function crownPt(th, k, out, lift) {
    const c0 = CROWN, ph = k * PI * 0.5, sc = sin(ph) + (lift || 0);
    const hgt = c0.H * Math.pow(cos(ph), 0.85);
    const s = sgnpow(sin(th), 2 / c0.n), c = sgnpow(cos(th), 2 / c0.n);
    const b = c > 0 ? c0.bf * (1 + 0.42 * Math.pow(k, 4)) : c0.bb;
    const x = c0.a * sc * s * (1 + 0.05 * k);
    out[0] = x; out[2] = b * sc * c;
    out[1] = hgt - c0.D * Math.pow(x / c0.a, 2) - (c > 0 ? 0.034 * Math.pow(k, 3) * c : 0);
  }
  function crownGeo() {
    return shared("crown", () => grid(44, 16, function (u, v, out) {
      crownPt((u - 0.5) * TAU, v, out, 0);
      out[3] = 0.5 + out[0] / 0.70; out[4] = 0.5 + out[2] / 0.70;
    }, { auto: true, closeU: true }));
  }
  function crownUnder() {
    return shared("crownU", () => grid(44, 3, function (u, v, out) {
      crownPt((u - 0.5) * TAU, 1, out, 0);
      const f = 1 - v * 0.985;
      out[0] *= f; out[2] *= f; out[1] = out[1] * (1 - v) + (-0.02 - CROWN.D * Math.pow(out[0] / CROWN.a, 2)) * v;
    }, {}));
  }

  /* katana blade prism; which 0 = body faces, 1 = edge bevels. section: spine, right, ridge, edge, ridge, left */
  function bladeGeo(which, grow) {
    return shared("blade" + which + "_" + (grow || 0), () => {
      const TH = T();
      const rows = 18, L = BLADE_LEN, y0 = 0.165, sori = 0.055;
      const sect = (s) => {
        const tipf = s > 0.92 ? Math.pow(Math.max(0, 1 - (s - 0.92) / 0.08), 0.65) : 1;
        const w = (0.064 - 0.014 * s) * tipf + (grow || 0) * 0.5 * tipf, t = (0.0125 - 0.003 * s) * tipf + (grow || 0) * 0.3 * tipf;
        const cy = y0 + L * s, cz = -sori * s * s + (s > 0.92 ? 0.3 * w * (s - 0.92) / 0.08 : 0);
        return [[-t / 2, cy, cz - w * 0.45], [t / 2, cy, cz - w * 0.45], [t / 2, cy, cz + w * 0.02], [0, cy, cz + w * 0.55], [-t / 2, cy, cz + w * 0.02]];
      };
      const faces = which === 0 ? [0, 1, 4] : [2, 3];
      const pos = [], idx = [];
      for (let r = 0; r < rows; r++) {
        const sA = sect(r / rows), sB = sect((r + 1) / rows);
        const czA = (sA[0][2] + sA[3][2]) * 0.5;
        for (let q = 0; q < faces.length; q++) {
          const f = faces[q], f2 = (f + 1) % 5;
          const A0 = sA[f], B0 = sA[f2], C0 = sB[f], D0 = sB[f2];
          const base = pos.length / 3;
          pos.push(A0[0], A0[1], A0[2], B0[0], B0[1], B0[2], C0[0], C0[1], C0[2], D0[0], D0[1], D0[2]);
          const ux = C0[0] - A0[0], uy = C0[1] - A0[1], uz = C0[2] - A0[2], vx = B0[0] - A0[0], vy = B0[1] - A0[1], vz = B0[2] - A0[2];
          const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
          const dot = nx * (A0[0]) + nz * (A0[2] - czA);
          if (dot >= 0) idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
          else idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }
      }
      const g = new TH.BufferGeometry();
      g.setAttribute("position", new TH.BufferAttribute(new Float32Array(pos), 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    });
  }

  /* hair sheet (hanging curtain): path pts, half-width fn(t), across(t)->[x,y,z] */
  function hairSheet(pts, hw, across, wrap, nu, nv) {
    const TH = T();
    const curve = new TH.CatmullRomCurve3(pts.map((p) => new TH.Vector3(p[0], p[1], p[2])), false, "centripetal");
    const P = [];
    for (let j = 0; j <= nv; j++) P.push(curve.getPoint(j / nv));
    return grid(nu, nv, function (u, v, out, i, j) {
      const p = P[j], x = (u - 0.5) * 2, w = hw(v), ac = across(v);
      const a = x * w;
      out[0] = p.x + ac[0] * a; out[1] = p.y + ac[1] * a; out[2] = p.z + ac[2] * a + (wrap ? wrap * a * a : 0);
    }, {});
  }

  /* ======================================================================== */
  /*  MATERIALS                                                               */
  /* ======================================================================== */
  function makeMats(form) {
    if (MATS[form]) return MATS[form];
    const TH = T(), M = K.mat, DS = TH.DoubleSide, F2 = form === 2;
    const toon = (c, o) => M.toon(c, o);
    const map = (tx, o) => M.mapToon(0xffffff, tx, Object.assign({ transparent: false }, o || {}));
    const t = {};
    const INK = 0x0b0e15;
    if (!VCM) {
      const mk = (side) => { const m = A().mat.toon(0xffffff, { noCache: true, side: side }); m.vertexColors = true; m.needsUpdate = true; return m; };
      VCM = { solid: mk(undefined), ds: mk(DS) };
    }
    const txHairCap = tex("v_haircap", 128, 256, paintHairCap);
    const txHair = tex("v_hair" + form, 256, 512, paintHair(F2, true));
    const txCoat = tex("v_coat", 512, 512, paintCoat, true);
    const txHelm = tex("v_helm", 512, 512, paintHelm);
    const txSkirt = tex("v_skirt", 256, 256, paintSkirt, true);
    const txWrap = tex("v_wrap", 128, 128, paintWrap, true);
    const txSaya = tex("v_saya", 64, 256, paintSaya, true);
    const txSuit = tex("v_suit", 256, 256, paintSuit, true);
    const txFace = tex("v_face" + form, 512, 320, featherFace(paintFace(form)));
    const txGlow = tex("v_glow", 64, 64, paintGlow);

    t.vc = { m: VCM.solid, o: 0.026, oc: INK };
    t.vcn = { m: VCM.solid, o: 0 };
    t.vcd = { m: VCM.ds, o: 0, shadow: false };
    t.face = { m: M.eye(txFace), o: 0, shadow: false };
    t.hairCap = { m: map(txHairCap, { emissive: 0xa4b6d6, emissiveIntensity: 0.38 }), o: 0.02, oc: 0x41567c };
    const hc = map(txHair, { side: DS, emissive: 0xa4b6d6, emissiveIntensity: 0.42 }); hc.alphaTest = 0.45; hc.needsUpdate = true;
    t.hair = { m: hc, o: 0 };
    const coatM = map(txCoat, { side: DS });
    t.coat = { m: coatM, o: 0.035, oc: INK };
    t.coatN = { m: coatM, o: 0 };
    t.helm = { m: map(txHelm), o: 0.032, oc: 0x14222f };
    t.redGlow = { m: M.glow(0xff3a28, 1.9), o: 0, shadow: false };
    t.skirt = { m: map(txSkirt, { side: DS }), o: 0.028, oc: 0x25301a };
    t.lining = { m: toon(0x17497a, { side: DS }), o: 0.02, oc: 0x0b2038 };
    t.saya = { m: map(txSaya), o: 0.022, oc: 0x05070b };
    t.suit = { m: map(txSuit), o: 0.026, oc: 0x05070b };
    t.blade = { m: toon(0xff5a36, { emissive: 0xff3b1c, emissiveIntensity: 0.85 }), o: 0.022, oc: 0x9a1a0c };
    t.bladeEdge = { m: M.glow(0xffa468, F2 ? 2.6 : 2.0), o: 0, shadow: false };
    const bh = A().mat.flat(0xff4a24, { transparent: true, opacity: F2 ? 0.34 : 0.22, side: DS, depthWrite: false, blending: TH.AdditiveBlending });
    t.bladeHalo = { m: bh, o: 0, shadow: false };
    t.handle = { m: map(txWrap), o: 0.02, oc: 0x3a0e0c };
    const eg = A().mat.flat(0xff2a1c, { map: txGlow, transparent: true, depthWrite: false, blending: TH.AdditiveBlending, side: DS, fog: false });
    eg.color.multiplyScalar(F2 ? 2.4 : 1.7);
    t.eyeGlow = { m: eg, o: 0 };
    MATS[form] = t;
    return t;
  }

  /* ======================================================================== */
  /*  BUILD                                                                   */
  /* ======================================================================== */
  function build(form) {
    const TH = T(), g = K.geo;
    const F2 = form === 2;
    const MT = makeMats(form);
    const rig = K.rig({ name: F2 ? "veil2" : "veil", height: 1.85 });
    const bone = rig.bone.bind(rig);

    /* ------------------------------------------------------------ welder */
    const buckets = Object.create(null), order = [];
    function put(boneName, key, factory, xf) {
      const id = boneName + "|" + key;
      let b = buckets[id];
      if (!b) {
        const gk = form + "|" + id;
        b = buckets[id] = { bone: boneName, key: key, gk: gk, bld: GEO[gk] ? null : new Bld() };
        order.push(id);
      }
      if (b.bld) b.bld.add(factory(), xf);
    }
    const pc = (b, col, f, xf) => put(b, "vc", f, Object.assign({ c: col }, xf || {}));     /* solid + ink outline */
    const pn = (b, col, f, xf) => put(b, "vcn", f, Object.assign({ c: col }, xf || {}));    /* solid, no outline */
    const pd = (b, col, f, xf) => put(b, "vcd", f, Object.assign({ c: col }, xf || {}));    /* double sided, no outline */
    function flush() {
      for (let i = 0; i < order.length; i++) {
        const b = buckets[order[i]];
        let geo = GEO[b.gk];
        if (!geo) geo = GEO[b.gk] = b.bld.geo();
        const spec = MT[b.key];
        if (!spec) { console.warn("[veil] missing material", b.key); continue; }
        const mesh = K.mk(geo, spec.m, { o: spec.o, oc: spec.oc, shadow: spec.shadow !== false });
        mesh.name = b.bone + ":" + b.key;
        rig.attach(b.bone, mesh);
      }
    }
    const box = () => g.box();
    const sph = () => g.sphere();

    /* ----------------------------------------------------------- skeleton */
    const BH = 1.0;                                     /* hips height */
    bone("hips", null, [0, BH, 0]);
    bone("chest", "hips", [0, 0.20, 0]);
    bone("neck", "chest", [0, 0.25, 0]);
    bone("head", "neck", [0, 0.07, 0]);
    bone("helmet", "head", [0, 0.185, 0]);
    bone("visor", "helmet", [0, 0.045, 0.125], [F2 ? 0.04 : -1.3, 0, 0]);
    bone("flapR", "helmet", [-0.255, -0.01, 0.045], null, { sway: 0.03, phase: 0.6 });
    bone("flapL", "helmet", [0.2, -0.01, 0.105], null, { sway: 0.026, phase: 1.9 });
    bone("cable", "helmet", [-0.215, -0.08, 0.02], null, { sway: 0.07, phase: 2.7 });
    bone("hairBack", "head", [0, 0.12, -0.075], F2 ? [0.62, 0, 0] : [0.04, 0, 0], { sway: 0.03, phase: 0.4 });
    bone("hairBack2", "hairBack", [0, -0.32, -0.128], F2 ? [0.30, 0, 0] : [0.05, 0, 0], { sway: 0.05, phase: 1.1 });
    for (const [S, sx] of [["L", 1], ["R", -1]]) {
      bone("lock" + S, "head", [sx * 0.098, 0.14, 0.035], F2 ? [0.5, 0, sx * 0.30] : [0.02, 0, sx * 0.03], { sway: 0.022, phase: sx > 0 ? 0.2 : 1.7 });
      bone("lock" + S + "2", "lock" + S, [sx * 0.026, -0.20, 0.108], F2 ? [0.3, 0, sx * 0.18] : [0.03, 0, 0], { sway: 0.04, phase: sx > 0 ? 1.4 : 2.6 });
    }
    /* arms: rest = hanging slightly out; right (blade) arm a little forward */
    bone("armL.sh", "chest", [0.15, 0.15, 0], [F2 ? 0.14 : 0.03, 0, F2 ? 0.34 : 0.17]);
    bone("armL.el", "armL.sh", [0, -0.27, 0], [F2 ? -0.52 : -0.10, 0, 0]);
    bone("armL.hand", "armL.el", [0, -0.26, 0], [0, 0, 0]);
    bone("armR.sh", "chest", [-0.15, 0.15, 0], [F2 ? 0.14 : 0.06, 0, F2 ? -0.34 : -0.17]);
    bone("armR.el", "armR.sh", [0, -0.27, 0], [F2 ? -0.52 : -0.20, 0, 0]);
    bone("armR.hand", "armR.el", [0, -0.26, 0], [0, 0, 0]);
    if (!F2) {
      bone("cuffL", "armL.el", [0, -0.02, 0], null, { sway: 0.05, phase: 0.9 });
      bone("cuffR", "armR.el", [0, -0.02, 0], null, { sway: 0.05, phase: 2.0 });
    }
    bone("legL.hip", "hips", [0.085, -0.04, 0]);
    bone("legL.knee", "legL.hip", [0, -0.47, 0]);
    bone("legL.foot", "legL.knee", [0, -0.45, 0]);
    bone("legR.hip", "hips", [-0.085, -0.04, 0]);
    bone("legR.knee", "legR.hip", [0, -0.47, 0]);
    bone("legR.foot", "legR.knee", [0, -0.45, 0]);
    bone("propR", "armR.hand", [0, -0.05, 0.004]);
    if (F2) bone("propL", "armL.hand", [0, -0.05, 0.004]);
    else bone("propL", "hips", [-0.205, 0.02, 0.085]);        /* saya mouth anchor */
    bone("bladeTip", "propR", [0, 0.165 + BLADE_LEN, -0.058]);
    if (F2) bone("bladeTipL", "propL", [0, 0.165 + BLADE_LEN, -0.058]);

    /* ---------------------------------------------------------- surfaces */
    const HEAD = loftSurf([
      { y: 0.225, rx: 0.0, rz: 0.0, cz: -0.005 }, { y: 0.213, rx: 0.05, rz: 0.056, cz: -0.006 },
      { y: 0.19, rx: 0.087, rz: 0.094, cz: -0.010 }, { y: 0.15, rx: 0.100, rz: 0.106, cz: -0.012 },
      { y: 0.11, rx: 0.097, rz: 0.100, cz: -0.004 }, { y: 0.075, rx: 0.085, rz: 0.088, cz: 0.003 },
      { y: 0.045, rx: 0.066, rz: 0.072, cz: 0.012 }, { y: 0.022, rx: 0.040, rz: 0.046, cz: 0.024 },
      { y: 0.007, rx: 0.016, rz: 0.018, cz: 0.034 }, { y: 0.0, rx: 0.002, rz: 0.002, cz: 0.036 }]);
    const coatFold = (th, y) => 1 + 0.020 * sin(5 * th + 3.0 * y) + 0.014 * sin(9 * th - 5 * y + 1.0) + 0.008 * sin(15 * th + 2);
    const COAT = loftSurf([
      { y: 0.27, rx: 0.125, rz: 0.12, cz: -0.012 }, { y: 0.20, rx: 0.17, rz: 0.135, cz: -0.012 },
      { y: 0.145, rx: 0.212, rz: 0.158 }, { y: 0.05, rx: 0.25, rz: 0.175 },
      { y: -0.08, rx: 0.272, rz: 0.186 }, { y: -0.22, rx: 0.288, rz: 0.196 }], { fold: coatFold, sq: 2.25 });
    const FLARE = loftSurf([
      { y: 0.02, rx: 0.292, rz: 0.200 }, { y: -0.04, rx: 0.315, rz: 0.225 },
      { y: -0.10, rx: 0.345, rz: 0.262 }, { y: -0.14, rx: 0.372, rz: 0.292 }], { fold: coatFold, sq: 2.25 });
    const SKIRT = loftSurf([
      { y: 0.04, rx: 0.180, rz: 0.160 }, { y: -0.08, rx: 0.232, rz: 0.208 },
      { y: -0.24, rx: 0.288, rz: 0.256 }, { y: -0.40, rx: 0.325, rz: 0.292 }],
      { fold: (th, y) => 1 + 0.05 * sin(th * 22 + y * 2.0) * sstep(0.0, -0.3, y) + 0.012 * sin(th * 5 + 1) });
    const waveHem = (a, b, c) => (th) => -a * (0.5 + 0.5 * sin(th * b + c));

    /* ======================================================================
       LEGS
       ====================================================================== */
    for (const [S, sx] of [["L", 1], ["R", -1]]) {
      const hip = "leg" + S + ".hip", knee = "leg" + S + ".knee", foot = "leg" + S + ".foot";
      pc(hip, C.skin, () => tube([[0, 0.03, 0], [0, -0.23, 0.006], [0, -0.475, 0]], [[0.066, 0.07], [0.056, 0.059], [0.046, 0.049]], 12, 6));
      /* knee guard + boot shaft */
      pc(knee, C.guard, () => superG(3.2, 16, 10), { p: [0, -0.07, 0.016], s: [0.068, 0.098, 0.072] });
      pc(knee, C.metalD, () => g.torus(0.06, 0.012, TAU, 6, 16), { p: [0, -0.175, 0.004], r: [PI / 2, 0, 0], s: [1, 0.95, 1.1] });
      pc(knee, C.boot, () => tube([[0, -0.06, 0], [0, -0.22, 0.006], [0, -0.425, -0.004]],
        [[0.05, 0.052], [0.048, 0.053], [0.036, 0.04]], 14, 6));
      pc(knee, C.red, () => g.circle(), { p: [0, -0.08, 0.092], s: 0.016 });
      pc(foot, C.boot, () => superG(3.0, 14, 9), { p: [0, -0.005, 0.045], s: [0.05, 0.034, 0.105] });
      pc(foot, C.boot, () => superG(3.0, 12, 8), { p: [0, 0.018, -0.01], s: [0.044, 0.034, 0.05] });
      pc(foot, C.guard, () => superG(3.0, 12, 8), { p: [0, 0.0, 0.12], s: [0.04, 0.026, 0.05] });
      pc(foot, C.sole, () => box(), { p: [0, -0.035, 0.04], s: [0.054, 0.014, 0.125] });
      pc(foot, C.sole, () => box(), { p: [0, -0.03, -0.035], s: [0.046, 0.024, 0.04] });
    }

    /* ======================================================================
       HEAD, FACE, NECK
       ====================================================================== */
    pc("head", C.skin, () => loft(HEAD, 0.225, 0.0, 22, 30, {}));
    put("head", "face", () => grid(22, 16, function (u, v, out) {
      HEAD(0.2 - 0.2 * v, -0.8 + 1.6 * u, out, 0.0025);
    }, { axis: [0, 0] }));
    pn("neck", C.skin, () => tube([[0, -0.06, 0], [0, 0.02, 0.004], [0, 0.085, 0.012]], [[0.04, 0.042], [0.036, 0.038], [0.034, 0.036]], 12, 4));

    /* iris glow overlays (parts.eyes in form 1) */
    const eyes = [];
    if (!F2) {
      for (const sx of [-1, 1]) {
        const geo = grid(8, 6, function (u, v, out) {
          HEAD(0.108 + 0.026 * (0.5 - v) * 2, sx * 0.37 + (u - 0.5) * 0.22, out, 0.004);
        }, { axis: [0, 0] });
        const m = new TH.Mesh(geo, MT.eyeGlow.m);
        m.userData.keep = true; m.userData.noOutline = true; m.renderOrder = 6; m.castShadow = false; m.receiveShadow = false;
        eyes.push(m);
      }
    }

    /* ======================================================================
       HAIR  (silver hime: blunt fringe, long front locks, long back curtains)
       ====================================================================== */
    put("head", "hairCap", () => loft(HEAD, 0.232, 0.13, 8, 30, { lift: 0.011 }));
    put("head", "hairCap", () => loft(HEAD, 0.14, 0.035, 8, 22, { lift: 0.011, th0: 0.78, th1: TAU - 0.78 }));
    put("head", "hairCap", () => loft(HEAD, 0.2, 0.139, 6, 22, { lift: 0.017, th0: -1.05, th1: 1.05, hem: (th) => 0.0035 * sin(th * 9) + 0.002 * sin(th * 23) }));
    const BACKW = (v, base) => base * (0.86 + 0.34 * sin(Math.min(1, v * 1.15) * PI * 0.5));
    const bAcross = () => [1, 0, 0];
    const curtainTop = [[0, 0.02, -0.02], [0, -0.07, -0.062], [0, -0.20, -0.108], [0, -0.32, -0.128]];
    const curtainBot = [[0, 0.02, 0.0], [0, -0.08, -0.006], [0, -0.17, -0.012], [0, -0.25, -0.016], [0, -0.32, -0.02]];
    for (const [off, wid, ln, u0] of [[0, 0.088, 1.0, 0.0], [-0.062, 0.05, 0.9, 0.35], [0.062, 0.05, 0.94, 0.6]]) {
      put("hairBack", "hair", () => hairSheet(curtainTop.map((p) => [p[0] + off * 0.9, p[1], p[2] - Math.abs(off) * 0.12]), (v) => BACKW(v * 0.5, wid), bAcross, 1.8, 6, 6),
        { uv: [u0, 0.62, 0.4, 0.38] });
      put("hairBack2", "hair", () => hairSheet(curtainBot.map((p) => [p[0] + off * 1.05, p[1] * ln, p[2] - Math.abs(off) * 0.10]), (v) => BACKW(0.5 + v * 0.5, wid) * (1 + 0.1 * v), bAcross, 1.8, 6, 9),
        { uv: [u0, 0.0, 0.4, 0.64] });
    }
    for (const [S, sx] of [["L", 1], ["R", -1]]) {
      const lockAcross = (v) => { const psi = lerp(1.15, 0.12, sstep(0.0, 0.6, v)); return [cos(psi) * sx, 0, -sin(psi)]; };
      const top = [[0.0, 0.0, 0.0], [0.014 * sx, -0.10, 0.052], [0.026 * sx, -0.20, 0.108]];
      const bot = [[0.0, 0.03, 0.0], [0.004 * sx, -0.12, 0.034], [0.0, -0.26, 0.056], [-0.004 * sx, -0.40, 0.068]];
      put("lock" + S, "hair", () => hairSheet(top, (v) => 0.034 + 0.008 * v, lockAcross, 0.0, 4, 5), { uv: [0.1, 0.62, 0.34, 0.38] });
      put("lock" + S + "2", "hair", () => hairSheet(bot, (v) => 0.042 - 0.016 * v, (v) => lockAcross(0.55 + v * 0.45), 0.0, 4, 8), { uv: [0.5, 0.0, 0.34, 0.64] });
      put("lock" + S + "2", "hair", () => hairSheet(bot.map((p) => [p[0] + 0.03 * sx, p[1] * 0.78, p[2] - 0.012]), (v) => 0.02 - 0.008 * v, (v) => lockAcross(0.55 + v * 0.45), 0.0, 2, 6), { uv: [0.0, 0.1, 0.18, 0.6] });
    }

    /* ======================================================================
       HELMET  (hammerhead)
       ====================================================================== */
    put("helmet", "helm", crownGeo);
    pc("helmet", C.helmBlk, crownUnder);
    for (const sx of [-1, 1]) {
      pc("helmet", C.helmP, () => superG(4.2, 16, 10), { p: [sx * 0.345, 0.0, 0.02], s: [0.052, 0.078, 0.1] });
      pc("helmet", C.helmD, () => box(), { p: [sx * 0.345, -0.05, 0.03], s: [0.046, 0.014, 0.088] });
    }
    /* embossed circle on the right block (painting), small red lens on the left block */
    pc("helmet", C.metalD, () => g.torus(0.034, 0.006, TAU, 6, 18), { p: [-0.345, 0.006, 0.122] });
    pc("helmet", C.metalD, () => g.torus(0.02, 0.005, TAU, 6, 14), { p: [-0.345, 0.006, 0.122] });
    pc("helmet", C.helmBlk, () => g.torus(0.026, 0.006, TAU, 6, 14), { p: [0.345, 0.008, 0.122] });
    put("helmet", "redGlow", () => g.circle(), { p: [0.345, 0.008, 0.124], s: 0.014 });
    /* camera module (character right, -X) */
    pc("helmet", C.helmP, () => g.cyl(0.056, 0.056, 0.095, 18), { p: [-0.205, -0.045, 0.082], r: [PI / 2, 0, 0] });
    pc("helmet", C.helmD, () => g.cyl(0.064, 0.064, 0.03, 18), { p: [-0.205, -0.045, 0.04], r: [PI / 2, 0, 0] });
    pc("helmet", C.lens, () => g.cyl(0.042, 0.042, 0.03, 16), { p: [-0.205, -0.045, 0.138], r: [PI / 2, 0, 0] });
    pc("helmet", C.metalD, () => g.torus(0.044, 0.008, TAU, 6, 18), { p: [-0.205, -0.045, 0.14] });
    put("helmet", "redGlow", () => g.circle(), { p: [-0.205, -0.045, 0.1555], s: 0.016 });
    pc("helmet", C.helmP, () => superG(3.4, 12, 8), { p: [-0.205, 0.0, 0.0], s: [0.046, 0.05, 0.06] });
    /* red lens eye on the crown */
    pc("helmet", C.helmD, () => g.torus(0.034, 0.008, TAU, 6, 18), { p: [-0.105, 0.1, 0.075], r: [0.95, 0, 0] });
    put("helmet", "redGlow", () => g.circle(), { p: [-0.105, 0.1, 0.075], r: [-0.62, 0, 0], s: 0.026 });
    /* rear grille */
    pc("helmet", C.helmBlk, () => box(), { p: [0, 0.015, -0.16], s: [0.32, 0.045, 0.03] });
    for (let i = -2; i <= 2; i++) pn("helmet", C.red, () => box(), { p: [i * 0.05, 0.015, -0.1765], s: [0.016, 0.026, 0.004] });
    /* black beak flap (left, +X) — hangs in front of the cheek */
    pc("flapL", C.helmBlk, () => slab(4, 8, function (u, v, o) {
      const w = lerp(0.07, 0.018, Math.pow(v, 1.3));
      o[0] = (u - 0.5) * 2 * w; o[1] = -v * 0.27; o[2] = 0.016 * Math.sin(v * 2.4) - 0.03 * (u - 0.5) * (u - 0.5);
    }, 0.016));
    pc("flapL", C.helmD, () => box(), { p: [0, -0.02, 0.012], s: [0.09, 0.014, 0.03] });
    /* grey cheek plate + dangling plate (right, -X) and cable */
    pc("flapR", C.helmP, () => slab(4, 6, function (u, v, o) {
      const w = lerp(0.052, 0.036, v);
      o[0] = (u - 0.5) * 2 * w; o[1] = -v * 0.2; o[2] = -0.016 * (u - 0.5) * (u - 0.5) * 4 + 0.01 * v;
    }, 0.016), { p: [0.035, 0.02, -0.02] });
    pc("flapR", C.helmD, () => g.cyl(0.011, 0.011, 0.02, 10), { p: [0.035, -0.08, 0.0], r: [PI / 2, 0, 0] });
    pn("cable", C.lens, () => tube([[0, 0, 0], [-0.01, -0.07, 0.01], [0.02, -0.14, -0.02], [0.04, -0.22, -0.07], [0.02, -0.30, -0.12]], 0.0085, 6, 10));
    /* visor plate (hinged at the crown front): raised brim (form 1) / lowered faceplate (form 2) */
    const VW = 0.265;
    const visorSurf = (u, v, o) => {
      const x = (u - 0.5) * 2, L = 0.165 - 0.068 * x * x;
      o[0] = x * VW; o[1] = -v * L; o[2] = -0.11 * x * x - 0.018 * v * v + 0.012 * sin(v * PI);
    };
    pc("visor", C.helmP, () => slab(22, 6, visorSurf, 0.02));
    pn("visor", C.red, () => grid(10, 3, function (u, v, o) { visorSurf(0.5 + 0.36 + u * 0.1, 0.0 + v * 0.26, o); o[2] += 0.0125; }, {}));
    if (F2) {
      for (const sx of [-1, 1]) {
        const geo = slab(8, 2, function (u, v, o) {
          visorSurf(0.5 + sx * (0.03 + 0.1 * u), 0.46 + (v - 0.5) * 0.12 - 0.1 * u, o);
          o[2] += 0.0145;
        }, 0.008);
        const slit = new TH.Mesh(geo, MT.redGlow.m);
        slit.userData.keep = true; slit.userData.noOutline = true; slit.castShadow = false;
        rig.attach("visor", slit);
        eyes.push(slit);
      }
    }

    /* ======================================================================
       RESPIRATOR COLLAR
       ====================================================================== */
    pc("neck", C.rubber, () => g.torus(0.118, 0.042, TAU, 8, 20), { p: [0, -0.005, 0.0], r: [PI / 2, 0, 0], s: [1.0, 0.92, 1.0] });
    pc("neck", C.rubber, () => g.torus(0.108, 0.036, TAU, 8, 20), { p: [0, 0.042, 0.004], r: [PI / 2 + 0.1, 0, 0], s: [1.0, 0.95, 1.0] });
    pc("neck", C.rubber, () => g.torus(0.132, 0.034, TAU, 8, 20), { p: [0, -0.052, -0.004], r: [PI / 2, 0, 0], s: [1.0, 0.9, 1.0] });
    pc("neck", C.rubber, () => superG(2.8, 14, 10), { p: [0.072, 0.012, 0.112], s: [0.066, 0.056, 0.06] });
    pc("neck", C.rubber, () => superG(3, 12, 8), { p: [0, 0.062, 0.07], s: [0.052, 0.02, 0.042] });
    pc("neck", C.rubberHi, () => g.torus(0.022, 0.006, TAU, 6, 14), { p: [0.078, 0.022, 0.168] });
    pc("neck", C.lens, () => g.circle(), { p: [0.078, 0.022, 0.168], s: 0.018 });
    pc("neck", C.rubber, () => g.cyl(0.02, 0.022, 0.05, 10), { p: [-0.07, -0.002, 0.118], r: [PI / 2 - 0.3, 0.2, 0] });
    pc("neck", C.red, () => g.torus(0.022, 0.005, TAU, 5, 12), { p: [-0.07, -0.002, 0.145], r: [0.4, 0.2, 0] });
    pc("neck", C.rubber, () => tube([[0.1, 0.0, 0.1], [0.15, -0.015, 0.0], [0.115, -0.01, -0.11], [0.04, 0.0, -0.15]], 0.015, 6, 12));

    /* ----------------------------------------------------------------------
       helpers: poppies + hanging chains
       ---------------------------------------------------------------------- */
    const poppyAt = (boneName, p, n, sz) => {
      const eul = eulerTo(n[0], n[1], n[2]);
      put(boneName, "vcd", poppyGeo, { p: p, r: eul, s: sz });
    };
    function chain(name, parent, p, r, n, segLen, w0, w1, sway, phase, col, tipCol) {
      for (let k = 0; k < n; k++) {
        const bn = name + "." + k;
        bone(bn, k === 0 ? parent : name + "." + (k - 1), k === 0 ? p : [0, -segLen, 0], k === 0 ? r : [0.05, 0, 0], { sway: sway * (1 + 0.28 * k), phase: phase + k * 0.8 });
        const w = lerp(w0, w1, k / Math.max(1, n - 1));
        pd(bn, col, () => box(), { p: [0, -segLen * 0.5, 0], s: [w, segLen * 1.03, 0.0045] });
        if (k === n - 1) pd(bn, tipCol || col, () => g.cone(), { p: [0, -segLen - w * 0.35, 0], r: [0, PI / 4, PI], s: [w * 0.72, w * 0.9, 0.004] });
      }
    }

    /* ======================================================================
       COAT (form 1) / SUIT (form 2)
       ====================================================================== */
    if (!F2) {
      put("chest", "coat", () => loft(COAT, 0.29, -0.215, 18, 44, { th0: -PI, th1: PI }));
      /* rolled hood collar + back pile */
      pc("chest", C.coatDk, () => g.torus(0.145, 0.05, TAU, 8, 24), { p: [0, 0.255, -0.012], r: [PI / 2 + 0.08, 0, 0], s: [1.0, 1.0, 1.05] });
      pc("chest", C.coatDk, () => superG(2.6, 14, 8), { p: [0.0, 0.285, -0.14], s: [0.15, 0.09, 0.075] });
      /* panels (cloak.n): hinge at the waist, one hem shell each */
      const NP = 6, PW = 0.62;
      const hingeR = (a) => [0.292 * sin(a), 0.02, 0.2 * cos(a)];
      for (let i = 0; i < NP; i++) {
        const a = i * TAU / NP, h = hingeR(a);
        bone("cloakBase." + i, "hips", h, [0, a, 0]);
        bone("cloak." + i, "cloakBase." + i, [0, 0, 0], [0, 0, 0], { sway: 0.04 + (i % 2) * 0.012, phase: i * 1.1 });
        bone("cloakTip." + i, "cloak." + i, [0, -0.1, 0.02], [0.03, 0, 0], { sway: 0.055, phase: i * 1.1 + 0.6 });
        const ca = cos(-a), sa = sin(-a), hx = h[0], hz = h[2];
        const xf = { p: [-(hx * ca + hz * sa), -h[1], -(-hx * sa + hz * ca)], r: [0, -a, 0] };
        put("cloak." + i, "coat", () => loft(FLARE, 0.02, -0.14, 6, 12, { th0: a - PW, th1: a + PW, hem: (th) => -0.012 * (0.5 + 0.5 * sin(th * 4.5 + 0.6)) }), xf);
        if (i === 0) pn("cloak.0", C.red, () => decal(FLARE, -0.17, -0.055, 2, 8, rectShape(0.036, 0.15, 0), 0.0045), { p: [0, -h[1], 0] });
      }
      /* red tape: long front strap + hanging ends */
      pn("chest", C.red, () => decal(COAT, -0.17, -0.075, 2, 10, rectShape(0.036, 0.285, 0), 0.0045));
      pn("chest", C.red, () => decal(COAT, -0.17, 0.095, 2, 2, rectShape(0.05, 0.022, 0), 0.0055));
      pn("chest", C.red, () => decal(COAT, 0.2, 0.065, 20, 3, ringShape(0.062, 0.078, 0.036, 0.05, 0.3), 0.005));
      pn("chest", C.red, () => decal(COAT, 0.03, -0.04, 2, 12, rectShape(0.006, 0.34, 0), 0.0045));
      pn("chest", C.red, () => decal(COAT, -0.55, 0.19, 2, 3, rectShape(0.022, 0.05, 0.4), 0.005));
      /* right-shoulder patch: circle emblem + red tab */
      pn("chest", C.red, () => decal(COAT, -0.92, 0.185, 16, 2, ringShape(0.032, 0.032, 0.0, 0.0, 0), 0.006));
      pn("chest", C.helmBlk, () => decal(COAT, -0.92, 0.185, 16, 2, ringShape(0.026, 0.026, 0.0, 0.0, 0), 0.0072));
      pn("chest", C.red, () => decal(COAT, -0.92, 0.185, 16, 2, ringShape(0.016, 0.016, 0.0, 0.0, 0), 0.0084));
      pn("chest", C.red, () => decal(COAT, -0.92, 0.135, 2, 3, rectShape(0.036, 0.05, 0.0), 0.006));
      chain("strapF", "cloakTip.0", [-0.07, -0.02, 0.0], [0.0, 0, 0], 2, 0.15, 0.036, 0.034, 0.035, 0.3, C.tape, C.tapeTip);
      chain("strapS", "cloakTip.1", [-0.04, -0.02, 0.0], [0.02, 0, 0], 2, 0.13, 0.03, 0.028, 0.045, 1.7, C.tape, C.tapeTip);
      chain("strapB", "cloakTip.4", [0.07, -0.02, 0.0], [0.0, 0, 0], 2, 0.17, 0.03, 0.028, 0.04, 2.6, C.tape, C.tapeTip);
      /* sleeves */
      for (const [S, sx] of [["L", 1], ["R", -1]]) {
        const SL = loftSurf([{ y: 0.04, rx: 0.088, rz: 0.09 }, { y: -0.10, rx: 0.10, rz: 0.108 }, { y: -0.22, rx: 0.122, rz: 0.134 }, { y: -0.30, rx: 0.134, rz: 0.144 }],
          { fold: (th, y) => 1 + 0.05 * sin(th * 3 + y * 8) + 0.03 * sin(th * 7 + 1) });
        put("arm" + S + ".sh", "coat", () => loft(SL, 0.05, -0.30, 8, 20, {}));
        put("arm" + S + ".sh", "coat", () => sph(), { p: [-sx * 0.01, 0.01, 0], s: [0.098, 0.092, 0.1] });
        const CL = loftSurf([{ y: 0.0, rx: 0.13, rz: 0.14 }, { y: -0.07, rx: 0.155, rz: 0.168 }, { y: -0.14, rx: 0.178, rz: 0.19 }],
          { fold: (th, y) => 1 + 0.06 * sin(th * 4 + y * 12 + (sx > 0 ? 1 : 3)) + 0.035 * sin(th * 9 + 2) });
        put("cuff" + S, "coat", () => loft(CL, 0.0, -0.14, 6, 22, { hem: (th) => 0.03 * Math.sin(th - 0.4) - 0.012 * (0.5 + 0.5 * sin(th * 3)) }));
      }
    } else {
      /* =================== FORM 2: bodysuit ====================== */
      const TORSO = loftSurf([
        { y: 0.26, rx: 0.044, rz: 0.044 }, { y: 0.215, rx: 0.095, rz: 0.062 }, { y: 0.17, rx: 0.145, rz: 0.088 },
        { y: 0.09, rx: 0.138, rz: 0.098, cz: 0.006 }, { y: 0.0, rx: 0.122, rz: 0.092, cz: 0.004 },
        { y: -0.1, rx: 0.10, rz: 0.08 }, { y: -0.2, rx: 0.108, rz: 0.084 }]);
      put("chest", "suit", () => loft(TORSO, 0.26, -0.21, 16, 30, { uvu: (u) => u * 1.2 }));
      pn("chest", C.red, () => decal(TORSO, 0.2, 0.09, 20, 3, ringShape(0.06, 0.074, 0.034, 0.048, 0.3), 0.004));
      pc("chest", C.helmP, () => superG(3.2, 14, 8), { p: [0, 0.12, 0.062], s: [0.1, 0.06, 0.04] });
      pn("chest", C.red, () => box(), { p: [0, 0.135, 0.1], s: [0.1, 0.008, 0.004] });
      const PELV = loftSurf([{ y: 0.06, rx: 0.108, rz: 0.084 }, { y: -0.02, rx: 0.14, rz: 0.106 }, { y: -0.1, rx: 0.15, rz: 0.11 }]);
      put("hips", "suit", () => loft(PELV, 0.06, -0.10, 6, 24, {}));
      pc("hips", C.suitD, () => g.torus(0.133, 0.026, TAU, 8, 24), { p: [0, 0.045, 0], r: [PI / 2, 0, 0], s: [1.0, 0.82, 1.0] });
      pc("hips", C.red, () => g.torus(0.136, 0.011, TAU, 6, 24), { p: [0, 0.012, 0], r: [PI / 2, 0, 0], s: [1.0, 0.82, 1.0] });
      pc("hips", C.metal, () => superG(3.4, 12, 8), { p: [0, 0.042, 0.118], s: [0.045, 0.036, 0.02] });
      pn("hips", C.red, () => g.circle(), { p: [0, 0.042, 0.1385], s: 0.022 });
      for (const sx of [-1, 1]) {
        pc("hips", C.helmP, () => superG(3.4, 12, 8), { p: [sx * 0.158, -0.035, 0.0], s: [0.028, 0.085, 0.092], r: [0, 0, sx * 0.1] });
        pn("hips", C.red, () => box(), { p: [sx * 0.184, -0.035, 0.0], s: [0.006, 0.07, 0.06], r: [0, 0, sx * 0.1] });
      }
      for (const [S, sx] of [["L", 1], ["R", -1]]) {
        const sh = "arm" + S + ".sh";
        pc(sh, C.helmP, () => superG(3, 16, 10), { p: [sx * 0.025, 0.045, 0.0], s: [0.105, 0.075, 0.115], r: [0, 0, sx * 0.25] });
        pc(sh, C.helmD, () => g.torus(0.1, 0.014, TAU, 6, 20), { p: [sx * 0.015, 0.0, 0], r: [PI / 2, 0, sx * 0.2], s: [1.0, 1.0, 0.7] });
        pn(sh, C.red, () => g.circle(), { p: [sx * 0.098, 0.06, 0.0], r: [0, sx * PI / 2, 0], s: 0.03 });
        pc(sh, C.suitD, () => tube([[0, 0.02, 0], [0, -0.14, 0.004], [0, -0.28, 0]], [[0.052, 0.054], [0.046, 0.048], [0.042, 0.044]], 10, 5));
        pc(sh, C.red, () => g.torus(0.05, 0.01, TAU, 5, 14), { p: [0, -0.13, 0], r: [PI / 2, 0, 0] });
        bone("rag" + S, sh, [sx * 0.04, 0.05, -0.04], [0.25, 0, sx * 0.1], { sway: 0.07, phase: sx > 0 ? 0.4 : 1.9 });
        bone("rag" + S + "1", "rag" + S, [0, -0.2, 0], [0.12, 0, 0], { sway: 0.1, phase: sx > 0 ? 1.4 : 2.9 });
        put("rag" + S, "coatN", () => g.tatter(0.17, 0.2, 0.0, 0.016, 3, 1.1));
        put("rag" + S + "1", "coatN", () => g.tatter(0.19, 0.22, 0.08, 0.014, 5, 1.12));
        pd(sh, C.poppyH, () => tube([[0, 0, 0], [sx * 0.03, 0.06, 0.0], [sx * 0.05, 0.13, -0.02], [sx * 0.07, 0.19, -0.04]], 0.008, 5, 8), { p: [sx * 0.07, 0.09, -0.04] });
        poppyAt(sh, [sx * 0.14, 0.27, -0.07], [sx * 0.4, 0.8, -0.15], 0.115);
        poppyAt(sh, [sx * 0.05, 0.15, -0.115], [sx * 0.2, 0.55, -0.8], 0.075);
        poppyAt(sh, [sx * 0.12, 0.14, 0.07], [sx * 0.7, 0.6, 0.3], 0.06);
      }
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.095, topY = i % 2 ? 0.18 : 0.2;
        bone("cloakBase." + i, "chest", [x, topY, -0.115 - 0.01 * Math.abs(i - 2)], [0.15 + 0.03 * Math.abs(i - 2), (i - 2) * 0.12, 0]);
        bone("cloak." + i, "cloakBase." + i, null, null, { sway: 0.07 + i * 0.01, phase: i * 1.2 });
        bone("cloakTip." + i, "cloak." + i, [0, -0.28, 0], [0.08, 0, 0], { sway: 0.11, phase: i * 1.2 + 0.7 });
        put("cloak." + i, "coatN", () => g.tatter(0.15 + (i % 2) * 0.02, 0.29, 0.0, 0.018, 3, 1.05));
        put("cloakTip." + i, "coatN", () => g.tatter(0.16, 0.34, 0.1 + (i % 2) * 0.04, 0.016, 5, 1.05));
      }
    }

    /* ======================================================================
       SKIRT (olive pleats + blue lining)
       ====================================================================== */
    if (!F2) {
      put("hips", "skirt", () => loft(SKIRT, 0.04, -0.40, 12, 48, { hem: waveHem(0.02, 3.2, 0.5) }));
      const LIN = loftSurf([{ y: -0.28, rx: 0.25, rz: 0.225 }, { y: -0.40, rx: 0.30, rz: 0.272 }, { y: -0.46, rx: 0.345, rz: 0.316 }],
        { fold: (th, y) => 1 + 0.05 * sin(th * 11 + y * 4) + 0.03 * sin(th * 4) });
      put("hips", "lining", () => loft(LIN, -0.29, -0.46, 5, 40, { hem: waveHem(0.045, 4.2, 1.2) }));
    } else {
      const SK2 = loftSurf([{ y: 0.04, rx: 0.18, rz: 0.16 }, { y: -0.10, rx: 0.238, rz: 0.21 }, { y: -0.26, rx: 0.285, rz: 0.256 }],
        { fold: (th, y) => 1 + 0.05 * sin(th * 22 + y * 2.0) * sstep(0.0, -0.2, y) });
      put("hips", "skirt", () => loft(SK2, 0.04, -0.26, 8, 44, { hem: (th) => -0.05 * (0.5 + 0.5 * sin(th * 5.3 + 0.5)) - 0.025 * (0.5 + 0.5 * sin(th * 11.3)) }));
      const LI2 = loftSurf([{ y: -0.17, rx: 0.225, rz: 0.2 }, { y: -0.26, rx: 0.268, rz: 0.245 }, { y: -0.32, rx: 0.31, rz: 0.285 }]);
      put("hips", "lining", () => loft(LI2, -0.17, -0.32, 3, 36, { hem: (th) => -0.06 * (0.5 + 0.5 * sin(th * 6.1 + 1.2)) - 0.03 * (0.5 + 0.5 * sin(th * 12.3)) }));
    }

    /* ======================================================================
       ARMS: mech forearms, hands, katana, saya
       ====================================================================== */
    function mechForearm(S, sx) {
      const el = "arm" + S + ".el";
      pc(el, C.metal, () => tube([[0, -0.02, 0], [0, -0.13, 0.004], [0, -0.255, 0.0]], [[0.052, 0.056], [0.044, 0.05], [0.036, 0.04]], 12, 5));
      pc(el, C.metalD, () => g.torus(0.05, 0.012, TAU, 6, 16), { p: [0, -0.04, 0], r: [PI / 2, 0, 0] });
      pc(el, C.metalD, () => g.torus(0.04, 0.011, TAU, 6, 16), { p: [0, -0.19, 0], r: [PI / 2, 0, 0] });
      pc(el, C.metalD, () => box(), { p: [sx * 0.02, -0.1, 0.045], s: [0.034, 0.1, 0.022] });
      pc(el, C.metalD, () => g.cyl(0.036, 0.036, 0.012, 18), { p: [0, -0.125, 0.048], r: [PI / 2, 0, 0] });
      pc(el, C.red, () => g.cyl(0.028, 0.028, 0.012, 18), { p: [0, -0.125, 0.052], r: [PI / 2, 0, 0] });
      pc(el, C.red, () => g.torus(0.041, 0.0085, TAU, 6, 16), { p: [0, -0.222, 0], r: [PI / 2, 0, 0] });
      pc(el, C.red, () => box(), { p: [0, -0.222, 0.045], s: [0.032, 0.016, 0.014] });
      pc(el, C.metalD, () => g.cyl(0.007, 0.007, 0.15, 6), { p: [-sx * 0.036, -0.12, 0.012] });
    }
    function fist(S, sx) {
      const p = "prop" + S;
      pc(p, C.glove, () => superG(3, 12, 8), { p: [0, 0.0, -0.032], s: [0.036, 0.048, 0.024] });
      for (let k = 0; k < 4; k++) {
        pc(p, C.glove, () => g.torus(0.0205, 0.0095, PI * 1.55, 6, 12), { p: [0, -0.052 + k * 0.0205, 0.0], r: [PI / 2, 0, PI * 0.28 + PI * 0.5] });
      }
      pc(p, C.glove, () => tube([[0, 0, 0], [0.0, 0.02, 0.02], [0.0, 0.052, 0.022]], [0.011, 0.011], 6, 3), { p: [sx * 0.026, -0.02, -0.02] });
      pc(p, C.red, () => box(), { p: [0, 0.0, 0.034], s: [0.03, 0.058, 0.007] });
      pc(p, C.metalD, () => box(), { p: [0, 0.0, -0.05], s: [0.034, 0.05, 0.008] });
    }
    mechForearm("R", -1);
    fist("R", -1);
    if (F2) { mechForearm("L", 1); fist("L", 1); }
    else {
      pc("armL.el", C.glove, () => tube([[0, -0.02, 0], [0, -0.13, 0.004], [0, -0.255, 0.0]], [[0.04, 0.042], [0.034, 0.036], [0.03, 0.032]], 10, 4));
      pc("armL.el", C.metalD, () => g.torus(0.034, 0.011, TAU, 6, 14), { p: [0, -0.2, 0], r: [PI / 2, 0, 0] });
      pc("armL.el", C.red, () => g.torus(0.035, 0.008, TAU, 6, 14), { p: [0, -0.235, 0], r: [PI / 2, 0, 0] });
      const h = "armL.hand";
      pc(h, C.glove, () => superG(3, 12, 8), { p: [0, -0.04, 0.004], s: [0.034, 0.04, 0.022] });
      for (let k = 0; k < 4; k++) {
        pc(h, C.glove, () => tube([[0, 0, 0], [0, -0.03, 0.004], [0, -0.058, -0.004]], 0.0085 - k * 0.0005, 5, 3), { p: [-0.0225 + k * 0.015, -0.075, 0.0], r: [0.12 + k * 0.02, 0, 0] });
      }
      pc(h, C.glove, () => tube([[0, 0, 0], [0.012, -0.022, 0.012], [0.018, -0.042, 0.03]], 0.01, 5, 3), { p: [-0.026, -0.03, 0.01] });
      pn(h, C.red, () => box(), { p: [0, -0.052, 0.021], s: [0.05, 0.006, 0.006] });
    }

    /* katana (propR; propL in form 2) */
    function katana(S) {
      const p = "prop" + S;
      put(p, "handle", () => tube([[0, -0.15, 0], [0, 0.0, 0], [0, 0.165, 0]], [[0.0165, 0.0135], [0.0195, 0.0158], [0.0165, 0.0135]], 12, 6), { uv: [0, 0, 2.5, 4] });
      pc(p, C.metal, () => superG(3.4, 12, 8), { p: [0, -0.155, 0], s: [0.0215, 0.015, 0.0175] });
      pc(p, C.tsuba, () => superG(3.2, 18, 8), { p: [0, 0.172, 0], s: [0.046, 0.007, 0.039] });
      pc(p, C.red, () => g.torus(0.04, 0.0035, TAU, 5, 18), { p: [0, 0.18, 0], r: [PI / 2, 0, 0], s: [1, 0.85, 1] });
      pc(p, C.metal, () => superG(3, 10, 6), { p: [0, 0.196, -0.004], s: [0.019, 0.016, 0.0145] });
      put(p, "blade", () => bladeGeo(0, 0));
      put(p, "bladeEdge", () => bladeGeo(1, 0));
      put(p, "bladeHalo", () => bladeGeo(0, 0.05));
    }
    katana("R");
    if (F2) katana("L");

    /* saya (form 1) on the right hip, tip up and back */
    if (!F2) {
      const sayaPath = [[0, 0, 0], [0, 0.3, -0.006], [0, 0.62, -0.025], [0, 0.95, -0.058]];
      put("propL", "saya", () => tube(sayaPath, [[0.026, 0.0185], [0.0235, 0.0172], [0.0215, 0.016], [0.02, 0.0148]], 14, 14), { uv: [0, 0, 2, 1] });
      pc("propL", C.metal, () => g.torus(0.0275, 0.0075, TAU, 6, 16), { p: [0, 0.002, 0], r: [PI / 2, 0, 0], s: [1, 0.72, 1] });
      pc("propL", C.red, () => g.torus(0.0245, 0.0045, TAU, 5, 14), { p: [0, 0.26, -0.005], r: [PI / 2, 0, 0], s: [1, 0.72, 1] });
      pc("propL", C.sayaTip, () => superG(2.6, 10, 8), { p: [0, 0.968, -0.062], s: [0.0235, 0.036, 0.021], r: [0.12, 0, 0] });
      pc("propL", C.metalD, () => g.torus(0.0225, 0.005, TAU, 5, 14), { p: [0, 0.925, -0.052], r: [PI / 2 - 0.05, 0, 0], s: [1, 0.72, 1] });
      pd("propL", C.red, () => tube([[0.0, 0.1, 0.02], [0.03, 0.06, 0.07], [0.05, 0.0, 0.1], [0.05, -0.07, 0.1]], 0.0055, 5, 8));
      chain("sageo", "propL", [0.05, -0.07, 0.1], [0.0, 0, 0], 3, 0.1, 0.022, 0.02, 0.06, 0.5, C.tape, C.tape);
    }

    /* poppies */
    if (!F2) {
      poppyAt("chest", [-0.095, 0.255, 0.15], [-0.4, 0.55, 0.75], 0.052);
      poppyAt("chest", [0.1, 0.29, -0.2], [0.3, 0.6, -0.75], 0.058);
      poppyAt("hips", [0.255, 0.0, 0.14], [0.8, 0.3, 0.5], 0.05);
      poppyAt("helmet", [0.18, 0.1, -0.06], [0.45, 0.8, -0.35], 0.055);
      poppyAt("hips", [-0.2, -0.38, 0.17], [-0.4, -0.1, 0.9], 0.046);
    } else {
      poppyAt("helmet", [0.19, 0.1, -0.05], [0.45, 0.8, -0.35], 0.06);
      poppyAt("hips", [0.17, -0.02, -0.1], [0.5, 0.2, -0.8], 0.06);
    }

    /* ribbons (form 2 streaming tapes) */
    if (F2) {
      chain("tapeA", "hips", [0.05, 0.03, -0.125], [0.62, 0.22, 0.0], 3, 0.26, 0.05, 0.04, 0.06, 0.2, C.tape, C.tape);
      chain("tapeB", "hips", [-0.05, 0.03, -0.125], [0.62, -0.22, 0.0], 3, 0.26, 0.05, 0.04, 0.06, 1.3, C.tape, C.tape);
      chain("tapeC", "hips", [0.15, 0.02, 0.0], [0.5, 0.9, 0.2], 3, 0.24, 0.04, 0.03, 0.07, 2.1, C.tape, C.tape);
      chain("tapeD", "hips", [-0.15, 0.02, 0.0], [0.5, -0.9, -0.2], 3, 0.24, 0.04, 0.03, 0.07, 3.0, C.tape, C.tape);
      chain("tapeE", "chest", [0.17, 0.2, -0.06], [0.9, 0.5, 0.3], 3, 0.25, 0.036, 0.028, 0.07, 0.8, C.tape, C.tape);
      chain("tapeF", "chest", [-0.17, 0.2, -0.06], [0.9, -0.5, -0.3], 3, 0.25, 0.036, 0.028, 0.07, 1.9, C.tape, C.tape);
    }

    flush();
    K.mergeRig(rig);

    /* ------------------------------------------------------- aim the blades */
    function aimProp(propName, handName, dir, edgeDir) {
      rig.root.updateMatrixWorld(true);
      const prop = rig.bones[propName], hand = rig.bones[handName];
      const hq = new TH.Quaternion(); hand.getWorldQuaternion(hq);
      const d = new TH.Vector3(dir[0], dir[1], dir[2]).normalize();
      const q = new TH.Quaternion().setFromUnitVectors(new TH.Vector3(0, 1, 0), d);
      const e = new TH.Vector3(0, 0, 1).applyQuaternion(q);
      const w = new TH.Vector3(edgeDir[0], edgeDir[1], edgeDir[2]);
      w.sub(d.clone().multiplyScalar(w.dot(d))).normalize();
      const ang = Math.atan2(new TH.Vector3().crossVectors(e, w).dot(d), e.dot(w));
      q.premultiply(new TH.Quaternion().setFromAxisAngle(d, ang));
      prop.quaternion.copy(hq.invert().multiply(q));
      prop.rotation.setFromQuaternion(prop.quaternion, "XYZ");
    }
    aimProp("propR", "armR.hand", F2 ? [-0.5, -0.5, 0.7] : [0.6, -0.62, 0.5], [0, -1, 0.2]);
    if (F2) aimProp("propL", "armL.hand", [0.5, -0.5, 0.7], [0, -1, 0.2]);
    else {
      const sq = new TH.Quaternion().setFromUnitVectors(new TH.Vector3(0, 1, 0), new TH.Vector3(-0.36, 0.60, -0.71).normalize());
      rig.bones.propL.quaternion.copy(sq);
      rig.bones.propL.rotation.setFromQuaternion(sq, "XYZ");
    }
    return { rig: rig, eyes: eyes };
  }

  /* ======================================================================== */
  function makeChar(form) {
    const B = build(form), rig = B.rig;
    const anim = K.anim(rig);
    /* the full move set lives in char_veil_anim.js (pose-to-pose clips with baked leg IK + blade aiming) */
    if (G.veilAnim) G.veilAnim(anim, rig, form);
    else anim.addClip("idle", [{ t: 0, bone: "chest", rot: [0, 0, 0] }, { t: 2.6, bone: "chest", rot: [0, 0, 0] }], { loop: true });
    for (const e of B.eyes) if (!e.parent) rig.attach("head", e);
    anim.setBase("idle"); anim.play("idle", { fade: 0 }); anim.update(0);
    const parts = rig.parts;
    parts.root = rig.root; parts.body = rig.body; parts.eyes = B.eyes;
    const meshes = rig.countMeshes();
    return { id: form === 2 ? "veil2" : "veil", root: rig.root, parts: parts, anim: anim, rig: rig, height: 1.85, radius: 0.42, team: "enemy", meshes: meshes, bladeLength: BLADE_LEN };
  }
  G.chars.define("veil", { height: 1.85, radius: 0.42, team: "enemy" }, () => makeChar(1));
  G.chars.define("veil2", { height: 1.85, radius: 0.42, team: "enemy" }, () => makeChar(2));
})();
