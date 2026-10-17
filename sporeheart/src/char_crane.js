/* ============================================================================
   SPOREHEART — src/char_crane.js
   BROOD-CRANE — heavy-barrage ally. A pale heron-skull worn as a witch-hat,
   a berry-cluster of glowing lantern-eyes wired across skull and shoulder,
   a bone-and-machine mantle with curling tentacle arms, a huge black-navy
   hooded cloak, a torn red sash and two sheathed katanas.

   Everything is code: lofted skull / cloak / tentacles, vertex-coloured
   mega-meshes (one draw call per rig part), canvas-painted skull, sash and
   eye textures, HDR orb shader, keyframed clips + procedural layers.

   Rig (faces +Z, +X = character left):
     base > hips > chest > neck > head > skull > crown / muzzle / drip.n
     armL/R.{sh,el,hand}, legL/R.{hip,knee,foot}, cloak.n (hem panels),
     sash.n, charm.n, tentL/Rk.{a,b}, cable.n, katana.n, hairBack, …
   parts.orbs = every glowing orb mesh (skull + shoulder + tentacle tips).
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  if (!G || !G.kit || !G.chars) throw new Error("char_crane.js requires charakit.js + characters.js");
  const K = G.kit;
  const PI = Math.PI, TAU = PI * 2;
  const DEF = { height: 2.1, radius: 0.55, team: "player" };

  /* ==========================================================================
     SECTION 0 — palette
     ========================================================================== */
  const COL = {
    bone: 0x969bc4, boneLt: 0xb6bade, boneDk: 0x757aa6, boneSh: 0x555a84,
    metal: 0x5a5f80, metalDk: 0x2e3248, pit: 0x252a40,
    red: 0xe2405a, redDk: 0xa42a40, redHot: 0xff5d70,
    navy: 0x0f1832, navyDk: 0x070b1a, navyLt: 0x1f2f58,
    skin: 0xeee6f4, hair: 0xcddcf2, hairDk: 0x93abd0,
    lacquer: 0x1d2030, gold: 0xc9b27a
  };

  /* ==========================================================================
     SECTION 1 — small math / noise
     ========================================================================== */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function rng(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function h3(x, y, z) {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967295;
  }
  function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let xf = x - xi, yf = y - yi, zf = z - zi;
    xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
    const a = lerp(lerp(h3(xi, yi, zi), h3(xi + 1, yi, zi), xf), lerp(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), xf), yf);
    const b = lerp(lerp(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), xf), lerp(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), xf), yf);
    return lerp(a, b, zf);
  }
  function fbm(x, y, z) { return noise3(x, y, z) * 0.58 + noise3(x * 2.13, y * 2.13, z * 2.13) * 0.28 + noise3(x * 4.37, y * 4.37, z * 4.37) * 0.14; }

  /* monotone-ish cubic through (ts[], vs[]), ts ascending */
  function spline(ts, vs) {
    const n = ts.length, m = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      m[i] = (vs[b] - vs[a]) / (ts[b] - ts[a]);
    }
    return function (t) {
      if (t <= ts[0]) return vs[0];
      if (t >= ts[n - 1]) return vs[n - 1];
      let i = 0; while (t > ts[i + 1]) i++;
      const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1];
    };
  }

  /* colours: sRGB hex ints → linear floats for vertex colours */
  let LIN = null;
  function linTab() {
    LIN = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  }
  function lin3(hex, arr, o) {
    if (!LIN) linTab();
    arr[o] = LIN[(hex >> 16) & 255]; arr[o + 1] = LIN[(hex >> 8) & 255]; arr[o + 2] = LIN[hex & 255];
  }
  function mixHex(a, b, t) {
    t = clamp(t, 0, 1);
    const r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t;
    const g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t;
    const bl = (a & 255) * (1 - t) + (b & 255) * t;
    return ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0);
  }
  function shadeHex(a, k) { // multiply brightness
    const r = clamp(((a >> 16) & 255) * k, 0, 255), g = clamp(((a >> 8) & 255) * k, 0, 255), b = clamp((a & 255) * k, 0, 255);
    return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
  }

  /* module-level caches (geometry / textures survive across builds) */
  const GC = Object.create(null);
  const TEXC = Object.create(null);
  function once(key, make) { let v = GC[key]; if (v === undefined) { v = make(); GC[key] = v; } return v; }

  /* ==========================================================================
     SECTION 2 — geometry toolkit
     ========================================================================== */
  const TMP = {};
  function tmpInit() {
    const T = G.THREE;
    TMP.m = new T.Matrix4(); TMP.q = new T.Quaternion(); TMP.q2 = new T.Quaternion(); TMP.e = new T.Euler();
    TMP.p = new T.Vector3(); TMP.s = new T.Vector3(); TMP.v = new T.Vector3(); TMP.nm = new T.Matrix3();
    TMP.up = new T.Vector3(0, 1, 0); TMP.n = new T.Vector3();
  }

  /* Baker: weld many transformed primitives into ONE vertex-coloured geometry */
  function Baker() { this.P = []; this.N = []; this.C = []; this.U = []; this.I = []; this.n = 0; }
  Baker.prototype.add = function (g, o) {
    o = o || {};
    if (!TMP.m) tmpInit();
    const p = o.p || [0, 0, 0], r = o.r || [0, 0, 0];
    const s = o.s === undefined ? [1, 1, 1] : (typeof o.s === "number" ? [o.s, o.s, o.s] : o.s);
    TMP.e.set(r[0], r[1], r[2], o.order || "XYZ");
    TMP.q.setFromEuler(TMP.e);
    if (o.up) { TMP.n.set(o.up[0], o.up[1], o.up[2]).normalize(); TMP.q2.setFromUnitVectors(TMP.up, TMP.n); TMP.q2.multiply(TMP.q); TMP.q.copy(TMP.q2); }
    TMP.p.set(p[0], p[1], p[2]); TMP.s.set(s[0], s[1], s[2]);
    const m = TMP.m.compose(TMP.p, TMP.q, TMP.s);
    const flip = m.determinant() < 0;
    TMP.nm.getNormalMatrix(m);
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, ca = g.attributes.color;
    const cnt = pa.count, v = TMP.v, base = this.n;
    const cf = o.c, cIsFn = typeof cf === "function";
    const col = [0, 0, 0];
    for (let i = 0; i < cnt; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(m);
      this.P.push(v.x, v.y, v.z);
      const px = v.x, py = v.y, pz = v.z;
      if (na) v.fromBufferAttribute(na, i).applyMatrix3(TMP.nm).normalize(); else v.set(0, 1, 0);
      this.N.push(v.x, v.y, v.z);
      if (ua) this.U.push(ua.getX(i), ua.getY(i)); else this.U.push(0, 0);
      if (ca && cf === undefined) { this.C.push(ca.getX(i), ca.getY(i), ca.getZ(i)); }
      else {
        const hx = cIsFn ? cf(px, py, pz, v.x, v.y, v.z, i) : (cf === undefined ? 0xffffff : cf);
        lin3(hx, col, 0); this.C.push(col[0], col[1], col[2]);
      }
    }
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
        if (flip) this.I.push(base + a, base + c, base + b); else this.I.push(base + a, base + b, base + c);
      }
    } else {
      for (let i = 0; i < cnt; i += 3) {
        if (flip) this.I.push(base + i, base + i + 2, base + i + 1); else this.I.push(base + i, base + i + 1, base + i + 2);
      }
    }
    this.n += cnt;
    g.dispose();
    return this;
  };
  Baker.prototype.build = function () {
    const T = G.THREE;
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(new Float32Array(this.P), 3));
    g.setAttribute("normal", new T.BufferAttribute(new Float32Array(this.N), 3));
    g.setAttribute("color", new T.BufferAttribute(new Float32Array(this.C), 3));
    g.setAttribute("uv", new T.BufferAttribute(new Float32Array(this.U), 2));
    g.setIndex(new T.BufferAttribute(this.n > 65535 ? new Uint32Array(this.I) : new Uint16Array(this.I), 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  };

  /* primitive shortcuts (unit sized; positioned by Baker) */
  const P = {
    sph: (sg) => new (G.THREE.SphereGeometry)(1, sg || 14, Math.max(5, ((sg || 14) * 0.65) | 0)),
    cyl: (rt, rb, h, sg, open) => new (G.THREE.CylinderGeometry)(rt, rb, h, sg || 10, 1, !!open),
    box: (w, h, d) => new (G.THREE.BoxGeometry)(w, h, d),
    cone: (r, h, sg) => new (G.THREE.ConeGeometry)(r, h, sg || 8),
    tor: (r, t, rs, ts, arc) => new (G.THREE.TorusGeometry)(r, t, rs || 6, ts || 20, arc === undefined ? TAU : arc),
    disc: (r, sg) => new (G.THREE.CircleGeometry)(r, sg || 16)
  };

  /* Grid surface: posFn(j,i,out[x,y,z,aux]) → indexed, normals, optional colours.
     wrap: closed in i; dup: duplicate the seam column (for UVs). Auto-orients outward. */
  function gridGeo(rows, cols, posFn, o) {
    o = o || {};
    const T = G.THREE;
    const wrap = !!o.wrap, dup = !!o.dup;
    const nc = wrap && !dup ? cols : cols + 1, nr = rows + 1;
    const Pp = new Float32Array(nr * nc * 3), UV = new Float32Array(nr * nc * 2);
    const Cc = o.col ? new Float32Array(nr * nc * 3) : null;
    const tmp = [0, 0, 0, 0];
    let k = 0, cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++, k++) {
      tmp[3] = 0;
      posFn(j, i, tmp);
      Pp[k * 3] = tmp[0]; Pp[k * 3 + 1] = tmp[1]; Pp[k * 3 + 2] = tmp[2];
      cx += tmp[0]; cy += tmp[1]; cz += tmp[2];
      if (o.uv) { const uv = o.uv(j, i); UV[k * 2] = uv[0]; UV[k * 2 + 1] = uv[1]; }
      else { UV[k * 2] = i / cols; UV[k * 2 + 1] = 1 - j / rows; }
      if (Cc) lin3(o.col(j, i, tmp[0], tmp[1], tmp[2], tmp[3]), Cc, k * 3);
    }
    cx /= k; cy /= k; cz /= k;
    const mkIdx = (flip) => {
      const idx = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const i1 = (i + 1) % nc;
        const a = j * nc + i, b = j * nc + i1, c = (j + 1) * nc + i, d = (j + 1) * nc + i1;
        if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
      }
      return idx;
    };
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(Pp, 3));
    g.setAttribute("uv", new T.BufferAttribute(UV, 2));
    if (Cc) g.setAttribute("color", new T.BufferAttribute(Cc, 3));
    g.setIndex(mkIdx(!!o.flip));
    g.computeVertexNormals();
    if (!o.noAuto) {
      const nor = g.attributes.normal; let s = 0;
      for (let q = 0; q < k; q += 2) {
        let dx, dy, dz;
        if (o.outward) { const ov = o.outward(Math.floor(q / nc), q % nc); dx = ov[0]; dy = ov[1]; dz = ov[2]; }
        else { dx = Pp[q * 3] - cx; dy = o.axisY ? 0 : Pp[q * 3 + 1] - cy; dz = Pp[q * 3 + 2] - cz; }
        s += nor.getX(q) * dx + nor.getY(q) * dy + nor.getZ(q) * dz;
      }
      if (s < 0) { g.setIndex(mkIdx(!o.flip)); g.computeVertexNormals(); }
    }
    if (wrap && dup) { // weld seam normals
      const nor = g.attributes.normal;
      for (let j = 0; j < nr; j++) {
        const a = j * nc, b = j * nc + cols;
        const x = nor.getX(a) + nor.getX(b), y = nor.getY(a) + nor.getY(b), z = nor.getZ(a) + nor.getZ(b);
        const l = Math.hypot(x, y, z) || 1;
        nor.setXYZ(a, x / l, y / l, z / l); nor.setXYZ(b, x / l, y / l, z / l);
      }
    }
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }

  /* Tube along a Catmull-Rom path with radius fn(u) (and optional ellipse ratio). */
  function tubeGeo(pts, radFn, o) {
    o = o || {};
    const T = G.THREE;
    const rows = o.rows || 14, seg = o.seg || 8, ratio = o.ratio || 1;
    const curve = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(p[0], p[1], p[2])), false, "centripetal");
    const fr = curve.computeFrenetFrames(rows, false);
    const pos = [];
    for (let j = 0; j <= rows; j++) pos.push(curve.getPointAt(j / rows));
    return gridGeo(rows, seg, (j, i, out) => {
      const u = j / rows, a = (i / seg) * TAU, r = radFn(u);
      const n = fr.normals[j], b = fr.binormals[j], c = pos[j];
      const ca = Math.cos(a) * r, sa = Math.sin(a) * r * ratio;
      out[0] = c.x + n.x * ca + b.x * sa; out[1] = c.y + n.y * ca + b.y * sa; out[2] = c.z + n.z * ca + b.z * sa;
      out[3] = u;
    }, {
      wrap: true, col: o.col, uv: o.uv, noAuto: !!o.noAuto,
      outward: (j, i) => {
        const a = (i / seg) * TAU, n = fr.normals[j], b = fr.binormals[j], ca = Math.cos(a), sa = Math.sin(a);
        return [n.x * ca + b.x * sa, n.y * ca + b.y * sa, n.z * ca + b.z * sa];
      }
    });
  }

  /* point on a quadratic-ish catenary/arc helper */
  function arcPts(len, curl, n) { // arc in XY plane starting at origin heading +Y, curling toward +X
    const pts = [];
    n = n || 5;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * len;
      if (Math.abs(curl) < 1e-4) pts.push([0, s, 0]);
      else pts.push([(1 - Math.cos(curl * s)) / curl, Math.sin(curl * s) / curl, 0]);
    }
    return pts;
  }

  /* ==========================================================================
     SECTION 3 — painted textures (canvas, cached)
     ========================================================================== */
  function paintTex(key, w, h, fn, opts) {
    if (TEXC[key] !== undefined) return TEXC[key];
    if (typeof document === "undefined") { TEXC[key] = null; return null; }
    const T = G.THREE;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    fn(ctx, w, h);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    if (opts && opts.repeat) tex.wrapS = tex.wrapT = T.RepeatWrapping;
    TEXC[key] = tex;
    return tex;
  }
  const hx = (n) => "#" + n.toString(16).padStart(6, "0");

  /* skull: u (x) along length rear→tip, v (y) around; symmetric about y=0.75h (dorsal) and y=0.25h (ventral) */
  function skullTex() {
    return paintTex("skull", 1024, 256, (ctx, w, h) => {
      const R = rng(11);
      ctx.fillStyle = "#8d92bd"; ctx.fillRect(0, 0, w, h);
      /* broad tonal drift: lighter dorsal, cooler near the beak */
      const g1 = ctx.createLinearGradient(0, 0, w, 0);
      g1.addColorStop(0, "rgba(232,230,250,0.25)"); g1.addColorStop(0.55, "rgba(190,196,230,0.0)"); g1.addColorStop(1, "rgba(120,140,190,0.22)");
      ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
      const g2 = ctx.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0, "rgba(90,96,140,0.30)"); g2.addColorStop(0.25, "rgba(90,96,140,0.00)"); g2.addColorStop(0.5, "rgba(90,96,140,0.30)");
      g2.addColorStop(0.75, "rgba(236,236,252,0.20)"); g2.addColorStop(1, "rgba(90,96,140,0.30)");
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
      /* painterly brush strokes along the length */
      for (let i = 0; i < 520; i++) {
        const x = R() * w, y = R() * h, len = 30 + R() * 150, th = 3 + R() * 16;
        const light = R() < 0.5;
        ctx.fillStyle = light ? "rgba(226,228,250," + (0.08 + R() * 0.16) + ")" : "rgba(104,112,160," + (0.06 + R() * 0.14) + ")";
        ctx.save(); ctx.translate(x, y); ctx.rotate((R() - 0.5) * 0.3);
        ctx.beginPath(); ctx.ellipse(0, 0, len, th, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      /* pits + speckle */
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = "rgba(48,52,84," + (0.25 + R() * 0.45) + ")";
        ctx.beginPath(); ctx.ellipse(R() * w, R() * h, 1 + R() * 3.5, 1 + R() * 2.5, R() * 3, 0, TAU); ctx.fill();
      }
      /* cracks */
      ctx.lineCap = "round";
      for (let i = 0; i < 26; i++) {
        let x = R() * w, y = R() * h;
        ctx.strokeStyle = "rgba(52,56,92," + (0.45 + R() * 0.3) + ")"; ctx.lineWidth = 1 + R() * 1.6;
        ctx.beginPath(); ctx.moveTo(x, y);
        const n = 4 + (R() * 6) | 0;
        for (let k = 0; k < n; k++) { x += 8 + R() * 22; y += (R() - 0.5) * 18; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      /* plate seams: dark lines across the cranium, with a lighter lip */
      for (const sx of [0.10, 0.205, 0.29, 0.40, 0.50, 0.60]) {
        const x = sx * w + (R() - 0.5) * 8;
        ctx.strokeStyle = "rgba(46,50,84,0.55)"; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x, 0);
        for (let y = 0; y <= h; y += 16) ctx.lineTo(x + Math.sin(y * 0.09 + sx * 40) * 3.5, y);
        ctx.stroke();
        ctx.strokeStyle = "rgba(238,240,255,0.30)"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x + 3, 0);
        for (let y = 0; y <= h; y += 16) ctx.lineTo(x + 3 + Math.sin(y * 0.09 + sx * 40) * 3.5, y);
        ctx.stroke();
      }
      /* red blood-stripes running back from the tip along both flanks (symmetric about the dorsal / ventral lines) */
      const stripe = (yc, x0, x1, th, a) => {
        for (const cy of [yc, h * 1.5 - yc]) {
          const yy = cy > h ? cy - h : cy;
          ctx.fillStyle = "rgba(214,50,76," + a + ")";
          ctx.beginPath(); ctx.moveTo(x0, yy - th * 0.5); ctx.lineTo(x1, yy - th * 0.15); ctx.lineTo(x1 + 24, yy); ctx.lineTo(x1, yy + th * 0.15); ctx.lineTo(x0, yy + th * 0.5); ctx.closePath(); ctx.fill();
        }
      };
      for (const cyc of [h * 0.75, h * 0.25]) {
        for (let k = 0; k < 9; k++) {
          const off = (k - 4) * (h * 0.045) + (R() - 0.5) * 6;
          const x0 = w * (0.60 + R() * 0.1), x1 = w * (0.80 + R() * 0.1);
          ctx.fillStyle = "rgba(214,50,76," + (0.55 + R() * 0.3) + ")";
          ctx.beginPath(); ctx.moveTo(x0, cyc + off - 2); ctx.lineTo(x1, cyc + off - 1); ctx.lineTo(x1 + 30 + R() * 40, cyc + off); ctx.lineTo(x1, cyc + off + 1); ctx.lineTo(x0, cyc + off + 2); ctx.closePath(); ctx.fill();
        }
      }
      stripe(h * 0.75 - h * 0.10, w * 0.56, w * 0.78, 12, 0.7);
      /* red band + tip: solid, with jagged forward-pointing teeth */
      ctx.fillStyle = "#d9384c";
      const rx = w * 0.865;
      ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(rx, h);
      for (let y = h; y >= 0; y -= 14) ctx.lineTo(rx - 8 - R() * 26 * (0.6 + 0.4 * Math.sin(y * 0.2)), y);
      ctx.closePath(); ctx.fill();
      /* red tip shading */
      const g3 = ctx.createLinearGradient(rx - 20, 0, w, 0);
      g3.addColorStop(0, "rgba(255,120,130,0.35)"); g3.addColorStop(0.4, "rgba(255,255,255,0)"); g3.addColorStop(1, "rgba(80,10,30,0.45)");
      ctx.fillStyle = g3; ctx.fillRect(rx - 40, 0, w - rx + 40, h);
      /* dark red crust speckles on the tip */
      for (let i = 0; i < 60; i++) { ctx.fillStyle = "rgba(110,16,40,0.5)"; ctx.beginPath(); ctx.arc(rx + R() * (w - rx), R() * h, 1 + R() * 3, 0, TAU); ctx.fill(); }
      /* dorsal ridge highlight */
      ctx.strokeStyle = "rgba(244,244,255,0.45)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, h * 0.75); ctx.lineTo(w * 0.86, h * 0.75); ctx.stroke();
      ctx.strokeStyle = "rgba(60,64,104,0.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, h * 0.75 + 5); ctx.lineTo(w * 0.86, h * 0.75 + 5); ctx.stroke();
    });
  }

  /* torn red sash cloth with rips, paint streaks and a frayed lower edge (alpha-cut) */
  function sashTex() {
    return paintTex("sash", 256, 512, (ctx, w, h) => {
      const R = rng(23);
      ctx.clearRect(0, 0, w, h);
      /* silhouette: ragged sides, long frayed tails */
      ctx.fillStyle = "#dc4458";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0);
      let xr = w - 3; ctx.lineTo(xr, 20);
      for (let y = 30; y < h - 90; y += 22) { xr = w - 2 - R() * 14; ctx.lineTo(xr, y); }
      const tails = 6, tw = w / tails;
      for (let t = 0; t < tails; t++) {
        const xa = w - t * tw, ylen = h - 90 + R() * 80 - (t % 2) * 26;
        ctx.lineTo(xa - 3, ylen - 20); ctx.lineTo(xa - tw * 0.5, ylen + R() * 8); ctx.lineTo(xa - tw + 3, ylen - 22);
      }
      for (let y = h - 90; y > 30; y -= 22) ctx.lineTo(2 + R() * 14, y);
      ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = "source-atop";
      /* paint tones */
      const gg = ctx.createLinearGradient(0, 0, 0, h);
      gg.addColorStop(0, "rgba(255,120,130,0.30)"); gg.addColorStop(0.5, "rgba(120,14,40,0.10)"); gg.addColorStop(1, "rgba(100,10,34,0.40)");
      ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        const x = R() * w, y = R() * h, len = 20 + R() * 120, th = 2 + R() * 9;
        ctx.fillStyle = R() < 0.5 ? "rgba(255,138,148," + (0.10 + R() * 0.2) + ")" : "rgba(104,12,38," + (0.10 + R() * 0.25) + ")";
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2 + (R() - 0.5) * 0.18);
        ctx.beginPath(); ctx.ellipse(0, 0, len, th, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      /* dark rips: knocked-out holes (destination-out below) are drawn as near-black patches first */
      ctx.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 26; i++) {
        const x = 18 + R() * (w - 36), y = 40 + R() * (h - 170), rw = 2 + R() * 8, rh = 6 + R() * 26;
        ctx.beginPath(); ctx.ellipse(x, y, rw, rh, (R() - 0.5) * 0.4, 0, TAU); ctx.fill();
      }
      /* torn vertical slits */
      for (let i = 0; i < 7; i++) {
        const x = 12 + R() * (w - 24), y = 60 + R() * (h - 260), L = 30 + R() * 90;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3 + R() * 3, y + L * 0.5); ctx.lineTo(x - 2, y + L); ctx.lineTo(x - 4, y + L * 0.5); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    });
  }

  /* glowing anime eye: slit almond, dark upper lash, orange-red iris with hot core */
  function eyeTex() {
    return paintTex("eye", 128, 96, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.5, cy = h * 0.56;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w * 0.06, cy + 6);
      ctx.quadraticCurveTo(cx, h * 0.04, w * 0.96, cy - 4);
      ctx.quadraticCurveTo(cx, h * 0.96, w * 0.06, cy + 6);
      ctx.closePath(); ctx.clip();
      ctx.fillStyle = "#6a1226"; ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.46);
      g.addColorStop(0, "#fff7c8"); g.addColorStop(0.18, "#ffd25a"); g.addColorStop(0.45, "#ff7a2e"); g.addColorStop(0.8, "#e02a3c"); g.addColorStop(1, "#7a1030");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.47, h * 0.40, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.arc(cx - 11, cy - 8, 5, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#1a1220"; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(w * 0.04, cy + 8); ctx.quadraticCurveTo(cx, h * 0.00, w * 0.98, cy - 8); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(w * 0.10, cy + 10); ctx.quadraticCurveTo(cx, h * 0.97, w * 0.94, cy - 2); ctx.stroke();
    });
  }

  /* ==========================================================================
     SECTION 4 — materials
     ========================================================================== */
  function vcMat(side, rim) {
    const m = G.assets.mat.toon(0xffffff, { noCache: true, side: side, rim: rim });
    m.vertexColors = true; m.needsUpdate = true;
    return m;
  }

  /* HDR orb: view-dependent disc — hot pale core, pink body, red lens rim, pinker pupil */
  function orbMaterial() {
    const T = G.THREE;
    const c = (hex, k) => { const col = new T.Color(hex); return new T.Vector3(col.r * k, col.g * k, col.b * k); };
    const m = new T.ShaderMaterial({
      uniforms: {
        uCore: { value: c(0xffd9de, 1.0) }, uMid: { value: c(0xff6a80, 1.0) }, uEdge: { value: c(0xe01c3c, 1.0) },
        uPup: { value: c(0xff8e9c, 1.0) }, uK: { value: 1.45 }
      },
      vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader:
        "uniform vec3 uCore; uniform vec3 uMid; uniform vec3 uEdge; uniform vec3 uPup; uniform float uK; varying vec3 vN;\n" +
        "void main(){ vec3 n = normalize(vN); float rr = length(n.xy);\n" +
        " vec3 c = mix(uCore, uMid, smoothstep(0.40, 0.84, rr));\n" +
        " c = mix(c, uEdge, smoothstep(0.84, 0.99, rr));\n" +
        " c = mix(c, uPup, (1.0 - smoothstep(0.17, 0.27, length(n.xy - vec2(0.02, -0.02)))) * 0.85);\n" +
        " c += vec3(1.0, 0.9, 0.9) * (1.0 - smoothstep(0.0, 0.15, length(n.xy - vec2(-0.30, 0.38)))) * 0.45;\n" +
        " gl_FragColor = vec4(c * uK, 1.0); }"
    });
    return m;
  }

  /* ==========================================================================
     SECTION 5 — shape functions (skull, cloak)
     ========================================================================== */
  const SK = {
    z: [-0.30, -0.285, -0.24, -0.15, -0.03, 0.09, 0.20, 0.32, 0.50, 0.68, 0.82, 0.90],
    rx: [0.015, 0.100, 0.190, 0.255, 0.270, 0.240, 0.160, 0.102, 0.070, 0.046, 0.022, 0.004],
    ry: [0.012, 0.085, 0.140, 0.180, 0.180, 0.160, 0.130, 0.108, 0.088, 0.066, 0.036, 0.006],
    cy: [0.000, 0.000, 0.004, 0.010, 0.010, 0.000, -0.006, -0.016, -0.032, -0.048, -0.062, -0.070]
  };
  let skRX, skRY, skCY;
  function skInit() { skRX = spline(SK.z, SK.rx); skRY = spline(SK.z, SK.ry); skCY = spline(SK.z, SK.cy); }
  const SK_Z0 = -0.30, SK_Z1 = 0.90;

  /* skull cross-section point at (z, angle a): a = 0 is +X, π/2 is dorsal */
  function skPoint(z, a, out, bump) {
    const rx = skRX(z), ry = skRY(z), cy = skCY(z);
    const c = Math.cos(a), s = Math.sin(a);
    const beak = sst(0.10, 0.45, z);
    const ex = 2 / lerp(2.5, 2.05, beak);
    let xs = Math.sign(c) * Math.pow(Math.abs(c), ex), ys = Math.sign(s) * Math.pow(Math.abs(s), ex);
    if (s < 0) ys *= lerp(0.62, 0.84, beak);
    const top = Math.exp(-Math.pow((a - PI / 2) / 0.26, 2));
    ys += top * lerp(0.05, 0.16, beak);
    const keel = Math.exp(-Math.pow((a - 1.5 * PI) / 0.22, 2));
    ys -= keel * 0.10 * beak;
    const brow = Math.exp(-Math.pow((z - 0.06) / 0.10, 2)) * (Math.exp(-Math.pow((a - 0.62) / 0.34, 2)) + Math.exp(-Math.pow((a - (PI - 0.62)) / 0.34, 2)));
    xs *= 1 + 0.12 * brow; ys *= 1 + 0.10 * brow;
    let nz = 0;
    if (bump) nz = (fbm(c * 2.2 + z * 6, s * 2.2 + 3, z * 8) - 0.5) * 0.07;
    out[0] = xs * rx * (1 + nz); out[1] = cy + ys * ry * (1 + nz); out[2] = z;
    return out;
  }
  const _sp = [0, 0, 0], _sp2 = [0, 0, 0];
  /* surface point + outward normal (approx) at (z,a), lifted */
  function skSurf(z, a, lift) {
    skPoint(z, a, _sp, false);
    const rx = skRX(z), ry = skRY(z);
    let nx = Math.cos(a) / Math.max(rx, 0.01), ny = Math.sin(a) / Math.max(ry, 0.01);
    const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    return { p: [_sp[0] + nx * lift, _sp[1] + ny * lift, z], n: [nx, ny, 0] };
  }

  function skullGeo() {
    return once("skull", () => {
      skInit();
      const rows = 84, cols = 36;
      return gridGeo(rows, cols, (j, i, out) => {
        const f = j / rows;
        const z = SK_Z0 + (SK_Z1 - SK_Z0) * f;
        skPoint(z, (i / cols) * TAU, out, true);
      }, { wrap: true, dup: true, uv: (j, i) => [j / rows, i / cols], axisY: false });
    });
  }

  /* ---- cloak surface (rest-pose world coordinates) ---- */
  const CL = {
    y: [0.04, 0.22, 0.42, 0.60, 0.80, 1.00, 1.15, 1.30, 1.38, 1.46],
    rx: [0.66, 0.62, 0.56, 0.49, 0.41, 0.355, 0.340, 0.330, 0.30, 0.205],
    rz: [0.62, 0.58, 0.53, 0.45, 0.35, 0.28, 0.252, 0.232, 0.205, 0.165]
  };
  let clRX, clRZ;
  const CL_TOP = 1.46, CL_HEM = 0.05;
  function clInit() { clRX = spline(CL.y, CL.rx); clRZ = spline(CL.y, CL.rz); }
  function clFold(a, y) {
    const v = clamp((CL_TOP - y) / (CL_TOP - CL_HEM), 0, 1);
    const amp = 0.010 + 0.060 * sst(0.10, 1.0, v);
    const back = 1 + 0.55 * Math.max(0, -Math.cos(a)); // deeper folds on the back
    const d = 0.55 * Math.sin(5 * a + 0.8 + 0.9 * v) + 0.30 * Math.sin(8 * a + 2.1 - 1.4 * v) + 0.22 * Math.sin(13 * a + 0.3 + 2.0 * v)
      + 0.30 * Math.sin(3 * a + 4.0 + 0.5 * v);
    const nz = (noise3(Math.sin(a) * 3.1, y * 2.6, Math.cos(a) * 3.1) - 0.5) * 0.5;
    return amp * back * (d + nz);
  }
  const _cs = [0, 0, 0];
  /* angle a: 0 = front (+Z), π = back */
  function cloakSurf(a, y, out) {
    const f = clFold(a, y);
    const rx = clRX(y) + f, rz = clRZ(y) + f;
    out[0] = Math.sin(a) * rx; out[1] = y; out[2] = Math.cos(a) * rz;
    return f;
  }
  function cloakCol(a, y, f) {
    const v = clamp((CL_TOP - y) / (CL_TOP - CL_HEM), 0, 1);
    const amp = 0.010 + 0.060 * sst(0.10, 1.0, v);
    const t = clamp(f / (amp * 1.2 + 1e-4) * 0.5 + 0.5, 0, 1);
    let c = mixHex(COL.navyDk, COL.navyLt, t * 0.85);
    c = mixHex(c, COL.navy, 0.35);
    c = shadeHex(c, 1.0 - 0.28 * sst(0.55, 1.0, v));
    const streak = noise3(Math.sin(a) * 6, y * 1.3, Math.cos(a) * 6);
    c = mixHex(c, COL.navyLt, sst(0.62, 0.9, streak) * 0.28);
    return c;
  }

  /* upper (chest) / lower (hips) cloak shells: world-y ranges, converted to bone-local */
  function cloakShell(yTop, yBot, boneY, grow) {
    const rows = Math.max(6, Math.round((yTop - yBot) / 0.03)), cols = 56;
    return gridGeo(rows, cols, (j, i, out) => {
      const y = yTop + (yBot - yTop) * (j / rows);
      const a = (i / cols) * TAU;
      const f = cloakSurf(a, y, out);
      out[0] *= 1 + grow; out[2] *= 1 + grow;
      out[1] -= boneY; out[3] = f;
    }, {
      wrap: true, axisY: true,
      col: (j, i, x, y, z, f) => cloakCol((i / cols) * TAU, yTop + (yBot - yTop) * (j / rows), f)
    });
  }

  /* hem panel k of n: samples the same surface, expressed in the panel's pivot frame */
  function hemPanel(k, n, yTop, yEnd, lift) {
    const th = (k + 0.5) * (TAU / n) - PI;       // centre angle
    const half = (TAU / n) * 0.5 * (lift > 0 ? 1.14 : 1.0);
    const rows = 7, cols = 9;
    const ct = Math.cos(th), st = Math.sin(th);
    cloakSurf(th, yTop, _cs);
    const pv = [_cs[0] * (1 + lift), yTop, _cs[2] * (1 + lift)];
    const R = rng(97 + k * 13);
    const seeds = []; for (let i = 0; i <= cols; i++) seeds.push(R());
    return { th, pivot: pv, geo: gridGeo(rows, cols, (j, i, out) => {
      const t = i / cols * 2 - 1;
      const a = th + t * half;
      const sy = j / rows;
      /* ragged hem: per-column length with notches */
      const saw = (i % 2 === 0 ? 1 : 0.35) * seeds[i];
      const yE = yEnd + 0.012 + saw * 0.085 + (j === rows ? 0 : 0);
      const y = lerp(yTop, yE, sy);
      const f = cloakSurf(a, y, _cs);
      const wx = _cs[0] * (1 + lift), wz = _cs[2] * (1 + lift);
      const dx = wx - pv[0], dz = wz - pv[2];
      out[0] = dx * ct - dz * st;
      out[1] = y - pv[1];
      out[2] = dx * st + dz * ct;
      out[3] = f;
    }, {
      outward: (j, i) => { const t = (i / cols * 2 - 1) * half; return [Math.sin(t), 0, Math.cos(t)]; },
      col: (j, i, x, y, z, f) => cloakCol(th + (i / cols * 2 - 1) * half, pv[1] + y, f)
    }) };
  }

  /* ==========================================================================
     SECTION 6 — builder helpers
     ========================================================================== */
  function boneCol(x, y, z, nx, ny) {
    const n = fbm(x * 17, y * 17, z * 17);
    let c = mixHex(COL.boneDk, COL.boneLt, 0.28 + 0.55 * n + 0.14 * ny);
    if (noise3(x * 46 + 7, y * 46, z * 46) > 0.82) c = mixHex(c, COL.pit, 0.7);
    return c;
  }
  function poreCol(x, y, z, nx, ny) {
    let c = boneCol(x, y, z, nx, ny);
    if (noise3(x * 30 + 3, y * 30, z * 30 + 9) > 0.70) c = mixHex(c, COL.pit, 0.88);
    return c;
  }
  function metalCol(x, y, z, nx, ny) {
    return mixHex(COL.metalDk, COL.metal, 0.35 + 0.5 * fbm(x * 21, y * 21, z * 21) + 0.1 * ny);
  }

  /* conforming armour plate on the skull surface (bulges up in the middle) */
  function plateGeo(z0, z1, a0, a1, h, seed) {
    const rows = 7, cols = 9, R = rng(seed);
    const jit = []; for (let i = 0; i <= cols; i++) jit.push((R() - 0.5) * 0.016);
    const za = (j, i) => lerp(z0, z1, j / rows) + ((j === 0 || j === rows) ? jit[i] : 0);
    const aa = (i) => lerp(a0, a1, i / cols);
    return gridGeo(rows, cols, (j, i, out) => {
      const fu = j / rows, fv = i / cols;
      const bulge = Math.pow(Math.sin(PI * fu), 0.5) * Math.pow(Math.sin(PI * fv), 0.5);
      const s = skSurf(za(j, i), aa(i), 0.004 + h * bulge);
      out[0] = s.p[0]; out[1] = s.p[1]; out[2] = s.p[2]; out[3] = bulge;
    }, {
      outward: (j, i) => { const a = aa(i), z = za(j, i); return [Math.cos(a) / Math.max(0.02, skRX(z)), Math.sin(a) / Math.max(0.02, skRY(z)), 0]; },
      col: (j, i, x, y, z, b) => {
        let c = mixHex(COL.boneDk, COL.boneLt, 0.40 + 0.40 * b + 0.2 * fbm(x * 15, y * 15, z * 15));
        if (b < 0.35) c = mixHex(c, COL.boneSh, 0.5);
        if (noise3(x * 40, y * 40, z * 40) > 0.84) c = mixHex(c, COL.pit, 0.6);
        return c;
      }
    });
  }

  function sleeveGeo(len, r0, r1, seed, jag) {
    const rows = 8, cols = 18;
    return gridGeo(rows, cols, (j, i, out) => {
      const s = j / rows, a = (i / cols) * TAU;
      const r = lerp(r0, r1, Math.pow(s, 1.5)) * (1 + 0.07 * Math.sin(a * 3 + seed + s * 3) + 0.05 * Math.sin(a * 5 - s * 4 + seed));
      let y = -s * len;
      if (j === rows && jag) y -= jag * (0.3 + 0.7 * Math.abs(Math.sin(a * 3.5 + seed)));
      out[0] = Math.sin(a) * r; out[1] = y; out[2] = Math.cos(a) * r; out[3] = Math.sin(a * 3 + seed + s * 3);
    }, {
      wrap: true, axisY: true,
      col: (j, i, x, y, z, f) => mixHex(mixHex(COL.navyDk, COL.navyLt, 0.5 + 0.35 * f), COL.navy, 0.3)
    });
  }

  function stripGeo(w, len, o) {
    o = o || {};
    const rows = o.rows || 10, cols = o.cols || 4;
    const u0 = o.u0 || 0, u1 = o.u1 === undefined ? 1 : o.u1;
    return gridGeo(rows, cols, (j, i, out) => {
      const s = j / rows, fx = i / cols - 0.5;
      const x = fx * w * (1 - 0.18 * s) + (o.shear ? o.shear * s * s : 0), y = -s * len;
      out[0] = x; out[1] = y; out[2] = o.zf ? o.zf(s, x, y) : 0;
    }, { noAuto: true, uv: (j, i) => [lerp(u0, u1, i / cols), 1 - j / rows * (o.vk || 1)] });
  }

  /* ==========================================================================
     SECTION 7 — the builder
     ========================================================================== */
  function buildCrane() {
    const THREE = G.THREE;
    const rig = K.rig({ name: "crane", height: DEF.height });
    const M = K.mat, g = K.geo, A = G.assets;
    const DS = THREE.DoubleSide;
    const add = rig.add.bind(rig);
    const V3 = THREE.Vector3;
    skInit(); clInit();

    /* ---- shared materials ---- */
    const vc = vcMat(), vcDS = vcMat(DS);
    const vcCloak = vcMat(undefined, 0.25), vcCloakDS = vcMat(DS, 0.25);
    const redM = M.toon(COL.red), redDkM = M.toon(COL.redDk);
    const skinM = M.toon(COL.skin), hairM = M.toon(COL.hair);
    const orbMat = orbMaterial();
    const glowRed = M.glow(0xff4a3a, 2.3);
    const sashM = M.mapToon(0xffffff, sashTex(), { side: DS, transparent: false });
    sashM.alphaTest = 0.5;

    /* ---- skeleton ---- */
    rig.bone("base", null, [0, 0, 0]);
    rig.bone("hips", "base", [0, 0.86, 0]);
    rig.bone("chest", "hips", [0, 0.42, 0]);
    rig.bone("neck", "chest", [0, 0.17, 0]);
    rig.bone("head", "neck", [0, 0.09, 0], [0.10, -0.20, 0.04]);
    rig.bone("hairBack", "head", [0, 0.10, -0.09], [0.12, 0, 0], { sway: 0.03, phase: 0.9 });
    rig.bone("skull", "head", [0, 0.29, -0.03], [0.50, -0.36, -0.10], { sway: 0.006, phase: 0.4 });
    rig.bone("crown", "skull", [0, 0.27, -0.14]);
    rig.bone("muzzle", "skull", [0, -0.07, 0.86]);
    for (const s of ["L", "R"]) {
      const sg = s === "L" ? 1 : -1;
      rig.bone("arm" + s + ".sh", "chest", [sg * 0.30, 0.10, 0], [0, 0, sg * 0.14]);
      rig.bone("arm" + s + ".el", "arm" + s + ".sh", [0, -0.30, 0], [-0.10, 0, 0]);
      rig.bone("arm" + s + ".hand", "arm" + s + ".el", [0, -0.30, 0]);
      rig.bone("leg" + s + ".hip", "hips", [sg * 0.11, -0.06, 0]);
      rig.bone("leg" + s + ".knee", "leg" + s + ".hip", [0, -0.40, 0]);
      rig.bone("leg" + s + ".foot", "leg" + s + ".knee", [0, -0.40, 0]);
    }
    rig.root.updateMatrixWorld(true);

    /* orb registry */
    const orbs = [], halos = [], orbR = [], orbPh = [];
    const orbGeo = once("orbGeo", () => new THREE.SphereGeometry(1, 14, 10));
    function mkOrb(bonePath, p, r, halo, phase) {
      const m = new THREE.Mesh(orbGeo, orbMat);
      m.position.set(p[0], p[1], p[2]); m.scale.setScalar(r);
      m.castShadow = false; m.receiveShadow = false; m.userData.noOutline = true; m.userData.r0 = r;
      if (halo) { const sp = A.glowSprite(halo.color || 0xff3d5a, halo.size || 4.4, halo.op || 0.5); m.add(sp); halos.push(sp); } else halos.push(null);
      rig.attach(bonePath, m);
      orbs.push(m); orbR.push(r); orbPh.push(phase === undefined ? orbs.length * 0.83 : phase);
      return m;
    }

    /* ======================================================================
       SKULL — painted loft + conforming plates + baked machinery
       ====================================================================== */
    const skullMat = M.mapToon(0xffffff, skullTex(), { transparent: false });
    rig.attach("skull", K.mk(skullGeo(), skullMat, { o: 0.05 }));

    const hw = new Baker();
    const surf = (z, aDeg, lift) => skSurf(z, aDeg * PI / 180, lift || 0);
    const PL = [
      [-0.26, -0.12, 52, 128], [-0.12, 0.02, 46, 134], [0.02, 0.16, 56, 124], [0.16, 0.34, 68, 112], [0.34, 0.58, 76, 104],
      [-0.20, -0.02, 8, 42], [-0.20, -0.02, 138, 172], [0.0, 0.14, 5, 38], [0.0, 0.14, 142, 175]
    ];
    for (let k = 0; k < PL.length; k++) {
      const q = PL[k];
      hw.add(plateGeo(q[0], q[1], q[2] * PI / 180, q[3] * PI / 180, 0.016, 31 + k));
    }
    /* rivets around the dorsal plates */
    for (let k = 0; k < 5; k++) {
      const q = PL[k];
      const pts = [[q[0] + 0.012, q[2] + 5], [q[0] + 0.012, q[3] - 5], [q[1] - 0.012, q[2] + 5], [q[1] - 0.012, q[3] - 5], [(q[0] + q[1]) / 2, q[2] + 4], [(q[0] + q[1]) / 2, q[3] - 4]];
      for (const pp of pts) { const s = surf(pp[0], pp[1], 0.012); hw.add(P.sph(6), { p: s.p, s: 0.0068, c: metalCol }); }
    }
    /* clamp bands + red wire wraps */
    for (const zb of [-0.205, 0.195, 0.43]) {
      const rx = skRX(zb) * 1.035 + 0.004, ry = skRY(zb) * 1.0 + 0.008;
      hw.add(P.tor(1, 0.010, 6, 34), { p: [0, skCY(zb) + 0.004, zb], s: [rx, ry, 1], c: zb > 0.3 ? COL.red : metalCol });
    }
    hw.add(P.tor(1, 0.0075, 5, 34), { p: [0, skCY(-0.215) + 0.004, -0.215], s: [skRX(-0.215) * 1.04, skRY(-0.215) * 1.0 + 0.008, 1], c: COL.red });
    /* seam rings on the beak */
    for (const zb of [0.34, 0.52, 0.66]) hw.add(P.tor(1, 0.006, 5, 24), { p: [0, skCY(zb), zb], s: [skRX(zb) * 1.02, skRY(zb) * 1.03, 1], c: metalCol });
    /* beak nostril slits + pores */
    for (const sx of [-1, 1]) {
      hw.add(P.sph(8), { p: [sx * skRX(0.40) * 0.97, skCY(0.40) + 0.012, 0.40], s: [0.004, 0.011, 0.045], c: COL.pit });
      hw.add(P.sph(8), { p: [sx * skRX(0.58) * 0.96, skCY(0.58) + 0.004, 0.58], s: [0.004, 0.008, 0.028], c: COL.pit });
    }

    /* ---- the skull orbs (z, angle°, lift, radius) ---- */
    const SO = [
      [-0.20, 90, 0.160, 0.105], [-0.12, 66, 0.140, 0.090], [-0.12, 114, 0.140, 0.090], [-0.02, 92, 0.140, 0.085],
      [0.06, 118, 0.115, 0.070], [-0.03, 52, 0.125, 0.075], [-0.07, 135, 0.120, 0.075], [-0.27, 70, 0.100, 0.078],
      [-0.265, 110, 0.105, 0.075], [0.12, 66, 0.090, 0.058]
    ];
    SO.forEach((q, k) => {
      const s = surf(q[0], q[1], q[2]), s0 = surf(q[0], q[1], -0.01);
      const n = s.n, r = q[3];
      /* collar + stalk + cup + red band, aligned to the surface normal */
      const L = Math.max(0.02, q[2] - r * 0.55);
      hw.add(P.cyl(0.032, 0.036, 0.022, 8), { p: [s0.p[0] + n[0] * 0.01, s0.p[1] + n[1] * 0.01, q[0]], up: n, c: metalCol });
      hw.add(P.cyl(0.018, 0.022, L, 7), { p: [s0.p[0] + n[0] * (0.01 + L / 2), s0.p[1] + n[1] * (0.01 + L / 2), q[0]], up: n, c: boneCol });
      hw.add(P.cyl(r * 0.62, r * 0.45, 0.02, 10), { p: [s.p[0] - n[0] * (r * 0.78), s.p[1] - n[1] * (r * 0.78), q[0]], up: n, c: metalCol });
      hw.add(P.tor(r * 0.52, 0.0065, 5, 16), { p: [s.p[0] - n[0] * (r * 0.70), s.p[1] - n[1] * (r * 0.70), q[0]], up: n, r: [PI / 2, 0, 0], c: COL.red });
      mkOrb("skull", s.p, r, { size: 4.6, op: k < 6 ? 0.55 : 0.45 }, k * 0.9 + 0.3);
    });
    /* conduits + red wires between stalks */
    const route = (pts, rad, col, lift) => {
      const path = pts.map((q) => surf(q[0], q[1], lift).p);
      hw.add(tubeGeo(path, () => rad, { rows: 14, seg: 6 }), { c: col });
    };
    route([[-0.26, 36], [-0.15, 30], [-0.03, 24], [0.08, 30]], 0.011, metalCol, 0.012);
    route([[-0.26, 144], [-0.15, 150], [-0.03, 156], [0.08, 150]], 0.011, metalCol, 0.012);
    route([[-0.27, 78], [-0.20, 72], [-0.14, 66]], 0.007, COL.red, 0.07);
    route([[-0.14, 62], [-0.07, 78], [-0.01, 86]], 0.006, COL.red, 0.075);
    route([[-0.13, 118], [-0.06, 106], [-0.01, 92]], 0.006, COL.red, 0.07);
    route([[0.07, 116], [0.02, 134], [-0.06, 148]], 0.006, COL.red, 0.06);
    route([[-0.03, 38], [0.03, 52], [0.09, 66]], 0.006, COL.red, 0.05);
    /* the machinery clump on the temples: cog, pistons, hex nuts */
    for (const sg of [1, -1]) {
      const a = sg > 0 ? 14 : 166;
      const c = surf(0.02, a, 0.004);
      hw.add(P.cyl(0.050, 0.050, 0.016, 12), { p: c.p, up: c.n, c: metalCol });
      for (let t = 0; t < 10; t++) {
        const th = (t / 10) * TAU, tx = -c.n[1], ty = c.n[0];
        const bx = Math.cos(th) * 0.054, bz = Math.sin(th) * 0.054;
        hw.add(P.box(0.014, 0.016, 0.014), { p: [c.p[0] + tx * bx, c.p[1] + ty * bx, c.p[2] + bz], up: c.n, r: [0, -th, 0], c: metalCol });
      }
      hw.add(P.cyl(0.022, 0.022, 0.05, 8), { p: [c.p[0] + c.n[0] * 0.03, c.p[1] + c.n[1] * 0.03, c.p[2]], up: c.n, c: boneCol });
      for (const zz of [-0.12, 0.10]) {
        const h2 = surf(zz, a + (sg > 0 ? 10 : -10), 0.004);
        hw.add(P.cyl(0.018, 0.018, 0.016, 6), { p: h2.p, up: h2.n, c: metalCol });
        hw.add(P.cyl(0.010, 0.010, 0.028, 6), { p: [h2.p[0] + h2.n[0] * 0.012, h2.p[1] + h2.n[1] * 0.012, h2.p[2]], up: h2.n, c: COL.redDk });
      }
    }
    const hwGeo = hw.build();
    rig.attach("skull", K.mk(hwGeo, vc, { o: 0.028 }));
    /* glowing red lenses embedded in the skull (cheeks of the helm) */
    for (const sg of [1, -1]) {
      for (const lz of [[-0.07, 24, 0.014], [0.05, 28, 0.018], [0.15, 32, 0.012]]) {
        const s = surf(lz[0], sg > 0 ? lz[1] : 180 - lz[1], 0.006);
        add("skull", g.sphereLo(), glowRed, { p: s.p, s: lz[2], shadow: false, noOutline: true });
      }
    }
    /* dorsal brow lenses */
    for (const sg of [1, -1]) {
      const s = surf(0.11, sg > 0 ? 52 : 128, 0.004);
      add("skull", g.sphereLo(), glowRed, { p: s.p, s: 0.015, shadow: false, noOutline: true });
    }

    /* ======================================================================
       HEAD, FACE, HAIR
       ====================================================================== */
    const headG = K.head({
      r: 0.118, skinMat: skinM, eyeTex: eyeTex(), eyeAngW: 0.74, eyeAngH: 0.58, eyeAz: 0.44, eyeEl: -0.03,
      lash: false, mouth: true, mouthColor: 0x80485c, mouthR: 0.017, mouthY: -0.058
    });
    headG.position.set(0, 0.07, 0);
    headG.traverse((m) => { if (m.isMesh && m.material && m.material.map === TEXC.eye) m.material.color.multiplyScalar(1.9); });
    rig.attach("head", headG);
    /* forehead dot */
    add("head", g.sphereLo(), M.glow(0xff3a4e, 2.2), { p: [0, 0.107, 0.111], s: [0.0085, 0.0085, 0.004], shadow: false, noOutline: true });
    add("neck", g.cyl(0.05, 0.058, 0.14, 10), skinM, { p: [0, 0.0, 0] });

    const hair = K.hairBob({ r: 0.118, mat: hairM, color: COL.hair, bangs: 0, back: 4, sideLen: 2.7, len: 1.35, outline: 0.04 });
    hair.position.set(0, 0.07, 0);
    rig.attach("head", hair);
    /* parted bangs sweeping away from a central gap */
    for (const sg of [1, -1]) {
      for (let k = 0; k < 4; k++) {
        const az = sg * (0.16 + k * 0.27), el = 0.50 - k * 0.04;
        const px = Math.sin(az) * Math.cos(el) * 0.122, py = Math.sin(el) * 0.122 + 0.07, pz = Math.cos(az) * Math.cos(el) * 0.122;
        add("head", g.strand(0.040 - k * 0.003, 0.085 + k * 0.012, 0.012, 0.25), hairM, { p: [px, py, pz], r: [0.30, az, sg * (0.10 + k * 0.06)] });
      }
    }
    /* long back locks on the sway bone */
    for (let k = 0; k < 3; k++) {
      add("hairBack", g.strand(0.07 - k * 0.012, 0.34 - k * 0.04, 0.014, 0.2), hairM, { p: [(k - 1) * 0.06, -0.02 * k, -0.01 * k], r: [0.08, PI + (k - 1) * 0.25, 0] });
    }

    /* collar: high stand-up collar, notched at the throat, tall behind the head */
    const collar = gridGeo(6, 44, (j, i, out) => {
      const a = (i / 44) * TAU, v = j / 6;
      const hh = 0.035 + 0.33 * Math.pow((1 - Math.cos(a)) / 2, 1.4) + 0.05 * Math.abs(Math.sin(a));
      const rx = lerp(0.19, 0.245, Math.pow(v, 1.3)), rz = lerp(0.165, 0.215, Math.pow(v, 1.3));
      const jag = (j === 6 ? (noise3(a * 3, 1.5, 0) - 0.5) * 0.035 : 0);
      out[0] = Math.sin(a) * rx; out[1] = -0.06 + (hh + jag) * v; out[2] = Math.cos(a) * rz + 0.0;
      out[3] = noise3(a * 4, v * 3, 2);
    }, {
      wrap: true, axisY: true,
      col: (j, i, x, y, z, f) => mixHex(mixHex(COL.navyDk, COL.navy, 0.4 + 0.5 * f), COL.navyLt, sst(0.75, 1, j / 6) * 0.35)
    });
    rig.attach("neck", K.mk(collar, vcCloakDS, {}));

    /* ======================================================================
       CLOAK — chest shell, hip shell, hem panels
       ====================================================================== */
    rig.attach("chest", K.mk(cloakShell(1.46, 1.06, 1.28, 0.0), vcCloak, {}));
    rig.attach("hips", K.mk(cloakShell(1.12, 0.43, 0.86, -0.014), vcCloak, {}));
    const PN = 8, hemBones = [];
    for (let k = 0; k < PN; k++) {
      const hp = hemPanel(k, PN, 0.47, 0.05, k % 2 ? 0.012 : 0.002);
      const b = rig.bone("cloak." + k, "hips", [hp.pivot[0], hp.pivot[1] - 0.86, hp.pivot[2]], [0, hp.th, 0], { sway: 0.03 + (k % 3) * 0.006, phase: k * 1.3 });
      b.add(K.mk(hp.geo, vcCloak, {}));
      hemBones.push({ th: hp.th });
    }

    /* ======================================================================
       ARMS (sleeves + hands) and LEGS
       ====================================================================== */
    const handBaker = (sg) => {
      const hb = new Baker();
      const sk = (x, y, z) => COL.skin;
      hb.add(P.sph(10), { p: [0, -0.045, 0], s: [0.034, 0.048, 0.016], c: COL.skin });
      for (let f = 0; f < 4; f++) {
        const fl = 0.052 - Math.abs(f - 1.4) * 0.006;
        hb.add(new THREE.CapsuleGeometry(0.0095, fl, 3, 6), { p: [(f - 1.5) * 0.0215 * sg, -0.098 - fl * 0.3, 0.002], c: COL.skin });
      }
      hb.add(new THREE.CapsuleGeometry(0.0105, 0.04, 3, 6), { p: [-sg * 0.04, -0.062, 0.006], r: [0, 0, sg * 0.7], c: COL.skin });
      return hb.build();
    };
    for (const s of ["L", "R"]) {
      const sg = s === "L" ? 1 : -1;
      rig.attach("arm" + s + ".sh", K.mk(sleeveGeo(0.34, 0.105, 0.092, sg * 1.3, 0), vcCloakDS, {}));
      rig.attach("arm" + s + ".el", K.mk(sleeveGeo(0.33, 0.090, 0.150, sg * 2.1, 0.06), vcCloakDS, {}));
      rig.attach("arm" + s + ".hand", K.mk(handBaker(sg), vc, { o: 0.025 }));
      /* legs: dark trousers + boots (mostly hidden) */
      const lb = new Baker();
      lb.add(P.cyl(0.085, 0.07, 0.42, 8), { p: [0, -0.20, 0], c: COL.navyDk });
      rig.attach("leg" + s + ".hip", K.mk(lb.build(), vc, {}));
      const kb = new Baker();
      kb.add(P.cyl(0.07, 0.06, 0.40, 8), { p: [0, -0.20, 0], c: COL.navyDk });
      rig.attach("leg" + s + ".knee", K.mk(kb.build(), vc, {}));
      const fb = new Baker();
      fb.add(P.cyl(0.075, 0.085, 0.16, 8), { p: [0, 0.06, 0], c: COL.lacquer });
      fb.add(P.sph(10), { p: [0, 0.01, 0.07], s: [0.085, 0.05, 0.15], c: COL.lacquer });
      fb.add(P.sph(8), { p: [0, 0.02, 0.15], s: [0.07, 0.035, 0.05], c: COL.boneDk });
      rig.attach("leg" + s + ".foot", K.mk(fb.build(), vc, { o: 0.03 }));
    }

    /* ======================================================================
       MANTLE — bone yoke, porous shoulder domes, machine clutter, spine
       ====================================================================== */
    const mt = new Baker();
    mt.add(P.tor(1, 0.040, 8, 40), { p: [0, 0.135, -0.005], r: [PI / 2, 0, 0], s: [0.295, 0.205, 1], c: boneCol });
    mt.add(P.sph(18), { p: [0.25, 0.145, 0.0], r: [0, 0, -0.30], s: [0.165, 0.082, 0.158], c: poreCol });
    mt.add(P.sph(18), { p: [-0.245, 0.14, 0.0], r: [0, 0, 0.27], s: [0.150, 0.074, 0.145], c: poreCol });
    mt.add(P.sph(14), { p: [0.21, 0.205, 0.005], r: [0, 0, -0.22], s: [0.105, 0.050, 0.098], c: poreCol });
    mt.add(P.sph(14), { p: [-0.20, 0.195, 0.0], r: [0, 0, 0.2], s: [0.090, 0.044, 0.088], c: poreCol });
    /* overlapping pauldron lames */
    for (const sg of [1, -1]) {
      for (let k = 0; k < 3; k++) {
        mt.add(P.sph(12), { p: [sg * (0.335 + k * 0.035), 0.085 - k * 0.04, 0.0], r: [0, 0, -sg * (0.7 + k * 0.28)], s: [0.075, 0.034, 0.105 - k * 0.012], c: boneCol });
      }
    }
    /* big porthole gear-eye on the +X shoulder, smaller one on -X */
    const eyeN = [0.45, 0.12, 0.88];
    mt.add(P.tor(0.056, 0.014, 6, 24), { p: [0.255, 0.13, 0.145], up: eyeN, r: [PI / 2, 0, 0], c: metalCol });
    mt.add(P.disc(0.048, 18), { p: [0.258, 0.131, 0.150], up: eyeN, r: [-PI / 2, 0, 0], c: COL.pit });
    mt.add(P.tor(0.034, 0.010, 6, 18), { p: [-0.225, 0.115, 0.14], up: [-0.45, 0.1, 0.88], r: [PI / 2, 0, 0], c: metalCol });
    mt.add(P.disc(0.028, 14), { p: [-0.227, 0.116, 0.144], up: [-0.45, 0.1, 0.88], r: [-PI / 2, 0, 0], c: COL.pit });
    /* shoulder orb stalks (chest-local): [x, y, z, r] */
    const SH = [[0.20, 0.30, 0.02, 0.076], [0.31, 0.285, -0.03, 0.084], [0.27, 0.205, 0.10, 0.058], [0.40, 0.215, 0.03, 0.060], [0.19, 0.225, -0.10, 0.058], [0.33, 0.37, -0.11, 0.064]];
    SH.forEach((q, k) => {
      const bx = q[0], bz = q[2], by = 0.17 + (q[0] - 0.25) * -0.25;
      const top = q[1] - q[3] * 0.62, L = Math.max(0.02, top - by);
      mt.add(P.cyl(0.036, 0.040, 0.026, 8), { p: [bx, by, bz], c: metalCol });
      mt.add(P.cyl(0.020, 0.024, L, 7), { p: [bx, by + L / 2, bz], c: boneCol });
      mt.add(P.tor(0.030, 0.0085, 5, 12), { p: [bx, by + L * 0.45, bz], r: [PI / 2, 0, 0], c: k % 2 ? COL.red : metalCol });
      mt.add(P.cyl(q[3] * 0.62, q[3] * 0.44, 0.022, 10), { p: [bx, top - 0.004, bz], c: metalCol });
      mt.add(P.tor(q[3] * 0.52, 0.007, 5, 14), { p: [bx, top + 0.012, bz], r: [PI / 2, 0, 0], c: COL.red });
      mkOrb("chest", [q[0], q[1], q[2]], q[3], { size: 4.6, op: 0.5 }, 5 + k * 0.77);
    });
    /* red cap + yellow tag like the painting's small red lantern */
    mt.add(P.cyl(0.026, 0.03, 0.05, 8), { p: [0.355, 0.30, 0.09], c: COL.red });
    mt.add(P.sph(8), { p: [0.355, 0.33, 0.09], s: 0.024, c: COL.red });
    /* pipes + hex nuts + clutter on the domes */
    const pipe = (pts, rad, col) => mt.add(tubeGeo(pts, () => rad, { rows: 12, seg: 7 }), { c: col });
    pipe([[0.16, 0.12, 0.10], [0.24, 0.07, 0.17], [0.33, 0.05, 0.10]], 0.016, metalCol);
    pipe([[0.12, 0.14, -0.12], [0.22, 0.10, -0.17], [0.34, 0.08, -0.10]], 0.015, metalCol);
    pipe([[-0.14, 0.12, 0.10], [-0.24, 0.06, 0.16], [-0.32, 0.04, 0.08]], 0.014, metalCol);
    for (let k = 0; k < 9; k++) {
      const a = k * 0.9 + 0.3;
      mt.add(P.cyl(0.016, 0.016, 0.014, 6), { p: [0.25 + Math.cos(a) * 0.10, 0.19 + Math.sin(a * 1.3) * 0.01, Math.sin(a) * 0.10], r: [0.2, a, 0.1], c: metalCol });
    }
    /* chain garland across the chest (bone vertebra beads + red cord) */
    const garland = [];
    for (let t = 0; t <= 12; t++) {
      const u = t / 12, x = lerp(-0.27, 0.27, u), y = 0.06 - 0.17 * Math.sin(PI * u);
      const rx = clRX(1.28 + y), rz = clRZ(1.28 + y);
      const zz = rz * Math.sqrt(Math.max(0, 1 - (x / rx) * (x / rx))) + 0.024;
      garland.push([x, y, zz]);
    }
    mt.add(tubeGeo(garland, () => 0.0065, { rows: 40, seg: 5 }), { c: COL.red });
    garland.forEach((p, t) => {
      if (t % 1) return;
      mt.add(P.sph(8), { p: p, s: [0.026, 0.020, 0.020], r: [0, 0, 0.3 * (t % 2 ? 1 : -1)], c: boneCol });
    });
    /* spine down the back + ribs */
    const sp = [];
    for (let k = 0; k < 8; k++) {
      const y = 0.115 - k * 0.062, zb = -(clRZ(1.28 + y) + 0.016);
      sp.push([0, y, zb]);
      mt.add(P.sph(10), { p: [0, y, zb], s: [0.036 - k * 0.002, 0.026, 0.030], c: boneCol });
      mt.add(P.cone(0.014, 0.05, 6), { p: [0, y + 0.004, zb - 0.034], r: [-PI / 2 - 0.25, 0, 0], c: boneCol });
      mt.add(P.cyl(0.0085, 0.0085, 0.050, 5), { p: [0.0, y - 0.031, zb + 0.002], c: COL.red });
    }
    for (let k = 1; k < 4; k++) {
      const y = 0.115 - k * 0.062;
      for (const sg of [1, -1]) {
        const path = [];
        for (let t = 0; t <= 4; t++) {
          const a = PI + sg * (0.10 + t * 0.20);
          const yy = y - 0.012 * t * t * 0.3;
          cloakSurf(a, 1.28 + yy, _cs);
          path.push([_cs[0] * 1.045, yy, _cs[2] * 1.045]);
        }
        mt.add(tubeGeo(path, (u) => lerp(0.014, 0.0065, u), { rows: 12, seg: 6 }), { c: boneCol });
        mt.add(P.sph(6), { p: path[4], s: 0.011, c: COL.red });
      }
    }
    const mtGeo = mt.build();
    rig.attach("chest", K.mk(mtGeo, vc, { o: 0.032 }));

    /* ======================================================================
       TENTACLE ARMS — two-segment curling bone fingers with glowing tips
       ====================================================================== */
    const tentSpecs = [
      { s: 1, root: [0.35, 0.145, 0.03], ra: -1.22, La: 0.21, ka: 1.9, rb: -0.55, Lb: 0.19, kb: -11.5, r0: 0.044 },
      { s: 1, root: [0.31, 0.105, 0.115], ra: -1.65, La: 0.15, ka: 2.4, rb: -0.35, Lb: 0.13, kb: -10, r0: 0.037 },
      { s: 1, root: [0.30, 0.17, -0.09], ra: -1.02, La: 0.17, ka: 1.5, rb: -0.5, Lb: 0.15, kb: -9, r0: 0.037 },
      { s: -1, root: [0.33, 0.125, 0.06], ra: -1.3, La: 0.19, ka: 2.0, rb: -0.5, Lb: 0.16, kb: -11, r0: 0.039 },
      { s: -1, root: [0.31, 0.06, 0.125], ra: -1.75, La: 0.14, ka: 2.3, rb: -0.4, Lb: 0.12, kb: -10, r0: 0.034 },
      { s: -1, root: [0.29, 0.16, -0.08], ra: -1.08, La: 0.17, ka: 1.7, rb: -0.5, Lb: 0.14, kb: -9, r0: 0.034 },
      { s: -1, root: [0.27, 0.10, -0.15], ra: -0.8, La: 0.15, ka: 1.2, rb: -0.5, Lb: 0.13, kb: -8, r0: 0.031 }
    ];
    const tents = [];
    const cntSide = { 1: 0, "-1": 0 };
    tentSpecs.forEach((sp2) => {
      const sg = sp2.s, idx = cntSide[sg]++;
      const nm = "tent" + (sg > 0 ? "L" : "R") + idx;
      const rootP = [sp2.root[0] * sg, sp2.root[1], sp2.root[2]];
      rig.bone(nm + ".a", "chest", rootP, [0, 0, sg * sp2.ra], { sway: 0.03, phase: idx * 1.4 + (sg > 0 ? 0 : 2) });
      /* geometry A */
      const ptsA = arcPts(sp2.La, sp2.ka, 8);
      const endA = ptsA[ptsA.length - 1];
      const turnA = sp2.ka * sp2.La;
      const bb = new Baker();
      const rad = (u, r0) => r0 * (1 - 0.18 * u) * (1 + 0.10 * Math.sin(u * 38));
      bb.add(tubeGeo(ptsA, (u) => rad(u, sp2.r0), { rows: 12, seg: 8 }), { s: [sg, 1, 1], c: boneCol });
      bb.add(P.sph(10), { p: [0, 0, 0], s: sp2.r0 * 1.18, c: metalCol });
      bb.add(P.sph(10), { p: [endA[0] * sg, endA[1], 0], s: sp2.r0 * 1.06, c: metalCol });
      for (const u of [0.28, 0.62]) {
        const i = Math.round(u * 8), p = ptsA[i], th = sp2.ka * u * sp2.La;
        bb.add(P.tor(sp2.r0 * 1.02, 0.0075, 5, 14), { p: [p[0] * sg, p[1], 0], up: [Math.sin(th) * sg, Math.cos(th), 0], r: [PI / 2, 0, 0], c: COL.red });
      }
      rig.attach(nm + ".a", K.mk(bb.build(), vc, { o: 0.028 }));
      /* bone B at A's end */
      rig.bone(nm + ".b", nm + ".a", [endA[0] * sg, endA[1], 0], [0, 0, sg * (-turnA + sp2.rb)], { sway: 0.05, phase: idx * 1.1 + 1 });
      const ptsB = arcPts(sp2.Lb, sp2.kb, 8);
      const endB = ptsB[ptsB.length - 1];
      const bb2 = new Baker();
      bb2.add(tubeGeo(ptsB, (u) => rad(u, sp2.r0 * 0.84), { rows: 12, seg: 8 }), { s: [sg, 1, 1], c: boneCol });
      const turnB = sp2.kb * sp2.Lb;
      const tdir = [Math.sin(turnB) * sg, Math.cos(turnB), 0];
      /* finger-cap socket at the tip */
      bb2.add(P.cyl(sp2.r0 * 0.82, sp2.r0 * 0.70, 0.026, 8), { p: [endB[0] * sg + tdir[0] * 0.01, endB[1] + tdir[1] * 0.01, 0], up: tdir, c: metalCol });
      bb2.add(P.tor(sp2.r0 * 0.82, 0.007, 5, 12), { p: [endB[0] * sg, endB[1], 0], up: tdir, r: [PI / 2, 0, 0], c: COL.red });
      const ptsMid = ptsB[4];
      bb2.add(P.tor(sp2.r0 * 0.80, 0.0065, 5, 14), { p: [ptsMid[0] * sg, ptsMid[1], 0], up: [Math.sin(sp2.kb * sp2.Lb * 0.5) * sg, Math.cos(sp2.kb * sp2.Lb * 0.5), 0], r: [PI / 2, 0, 0], c: COL.red });
      rig.attach(nm + ".b", K.mk(bb2.build(), vc, { o: 0.028 }));
      const tipP = [endB[0] * sg + tdir[0] * 0.040, endB[1] + tdir[1] * 0.040, 0];
      mkOrb(nm + ".b", tipP, 0.028 + (sp2.r0 - 0.024) * 0.8, { size: 4.2, op: 0.42 }, idx * 1.3 + (sg > 0 ? 0.5 : 2.1));
      tents.push({ nm, sg, spec: sp2, turnA, turnB });
    });

    /* ======================================================================
       RED SASH, CHARMS, SHOULDER CABLES, DRIPS, KATANAS
       ====================================================================== */
    /* sash strips hugging the cloak front (baked drape), each on its own sway bone */
    const sashSpec = [
      { x: -0.045, w: 0.17, len: 0.86, u0: 0.0, u1: 0.62, zo: 0.020 },
      { x: 0.060, w: 0.125, len: 1.00, u0: 0.38, u1: 1.0, zo: 0.034 },
      { x: -0.135, w: 0.095, len: 0.60, u0: 0.1, u1: 0.45, zo: 0.012 },
      { x: 0.140, w: 0.085, len: 0.72, u0: 0.55, u1: 0.9, zo: 0.008 },
      { x: 0.005, w: 0.075, len: 0.50, u0: 0.2, u1: 0.4, zo: 0.048 }
    ];
    const SY = 0.15;  // pivot height (chest-local)
    sashSpec.forEach((s, k) => {
      const zf = (u, x, y) => {
        const yw = 1.28 + SY + y, rx = clRX(yw), rz = clRZ(yw);
        const xx = s.x + x;
        const fz = rz * Math.sqrt(Math.max(0.0, 1 - (xx / rx) * (xx / rx)));
        const piv = clRZ(1.28 + SY) * Math.sqrt(Math.max(0, 1 - (s.x / clRX(1.28 + SY)) * (s.x / clRX(1.28 + SY))));
        return fz - piv + s.zo + 0.07 * Math.pow(u, 1.2) + 0.012 * Math.sin(y * 9 + k * 2);
      };
      const pz = clRZ(1.28 + SY) * Math.sqrt(Math.max(0, 1 - (s.x / clRX(1.28 + SY)) * (s.x / clRX(1.28 + SY))));
      const b = rig.bone("sash." + k, "chest", [s.x, SY, pz], [0, 0, 0], { sway: 0.05 + k * 0.004, phase: 2 + k * 1.1 });
      b.add(K.mk(stripGeo(s.w, s.len, { rows: 14, cols: 4, u0: s.u0, u1: s.u1, zf: zf }), sashM, { shadow: false }));
    });
    /* sash knot at the chest */
    {
      const kb = new Baker();
      kb.add(P.sph(10), { p: [0, 0.11, 0.215], s: [0.07, 0.05, 0.04], c: COL.red });
      kb.add(P.sph(10), { p: [-0.04, 0.13, 0.205], s: [0.045, 0.03, 0.03], r: [0, 0, 0.5], c: COL.redDk });
      kb.add(P.sph(10), { p: [0.05, 0.14, 0.205], s: [0.04, 0.028, 0.03], r: [0, 0, -0.4], c: COL.red });
      kb.add(P.tor(0.034, 0.010, 6, 18), { p: [0.0, 0.10, 0.245], c: boneCol });
      kb.add(P.cyl(0.012, 0.012, 0.07, 6), { p: [0.0, 0.10, 0.25], r: [0, 0, PI / 2], c: metalCol });
      rig.attach("chest", K.mk(kb.build(), vc, { o: 0.03 }));
    }
    /* bone charms on cords */
    const charmSpec = [[-0.10, 0.045, 0.19, 0.16], [0.11, 0.03, 0.2, 0.22], [0.01, 0.0, 0.215, 0.13]];
    charmSpec.forEach((c, k) => {
      const b = rig.bone("charm." + k, "chest", [c[0], c[1], c[2] + 0.03], [0, 0, 0], { sway: 0.09, phase: 1.5 + k * 1.7 });
      const cb = new Baker();
      cb.add(P.cyl(0.0035, 0.0035, c[3], 4), { p: [0, -c[3] / 2, 0], c: COL.redDk });
      if (k === 0) { cb.add(P.sph(8), { p: [0, -c[3] - 0.022, 0], s: [0.026, 0.03, 0.024], c: COL.boneLt }); cb.add(P.cone(0.01, 0.022, 5), { p: [0, -c[3] - 0.056, 0.004], r: [PI, 0, 0], c: COL.boneLt }); }
      else if (k === 1) { cb.add(P.tor(0.020, 0.0065, 5, 12), { p: [0, -c[3] - 0.02, 0], c: COL.gold }); cb.add(P.cyl(0.008, 0.008, 0.06, 6), { p: [0, -c[3] - 0.06, 0], c: metalCol }); }
      else { cb.add(P.cyl(0.011, 0.011, 0.07, 6), { p: [0, -c[3] - 0.03, 0], c: boneCol }); cb.add(P.cone(0.012, 0.024, 6), { p: [0, -c[3] - 0.075, 0], r: [PI, 0, 0], c: COL.red }); }
      b.add(K.mk(cb.build(), vc, { o: 0.02 }));
    });

    /* shoulder cables: skull → shoulder cluster, each on its own sway bone */
    const chestB = rig.bones.chest, skullB = rig.bones.skull;
    rig.root.updateMatrixWorld(true);
    const toSkull = (p) => { const v = chestB.localToWorld(new V3(p[0], p[1], p[2])); return skullB.worldToLocal(v); };
    const cableSpec = [
      { a: [-0.22, 22, 0.01], t: [0.30, 0.40, -0.06], sag: 0.10 },
      { a: [-0.28, 58, 0.04], t: [0.20, 0.34, 0.08], sag: 0.14 },
      { a: [-0.06, 152, 0.01], t: [-0.20, 0.10, 0.05], sag: 0.10 },
      { a: [-0.10, 160, 0.01], t: [-0.34, 0.18, -0.02], sag: 0.16 },
      { a: [0.02, 12, 0.01], t: [0.40, 0.22, 0.14], sag: 0.12 }
    ];
    const cableMat = M.toon(COL.red);
    cableSpec.forEach((c, k) => {
      const s = surf(c.a[0], c.a[1], c.a[2]);
      const tv = toSkull(c.t);
      const a0 = s.p, a1 = [tv.x, tv.y, tv.z];
      const down = skullB.worldToLocal(skullB.localToWorld(new V3(0, 0, 0)).add(new V3(0, -1, 0))); // world-down in skull space
      const dlen = Math.hypot(down.x, down.y, down.z);
      const dn = [down.x / dlen, down.y / dlen, down.z / dlen];
      const mid = [(a0[0] + a1[0]) / 2 + dn[0] * c.sag + s.n[0] * 0.06, (a0[1] + a1[1]) / 2 + dn[1] * c.sag + s.n[1] * 0.06, (a0[2] + a1[2]) / 2 + dn[2] * c.sag];
      const mid2 = [lerp(a0[0], mid[0], 0.5), lerp(a0[1], mid[1], 0.5) + 0.0, lerp(a0[2], mid[2], 0.5)];
      const path = [a0, [a0[0] + s.n[0] * 0.05, a0[1] + s.n[1] * 0.05, a0[2]], mid, [(mid[0] + a1[0]) / 2, (mid[1] + a1[1]) / 2 + dn[1] * 0.03, (mid[2] + a1[2]) / 2], a1].map((p) => [p[0] - a0[0], p[1] - a0[1], p[2] - a0[2]]);
      const b = rig.bone("cable." + k, "skull", a0, [0, 0, 0], { sway: 0.018, phase: k * 1.9 });
      b.add(K.mk(tubeGeo(path, (u) => lerp(0.0085, 0.0065, u), { rows: 22, seg: 5 }), cableMat, { shadow: false }));
      const plug = new Baker();
      plug.add(P.cyl(0.012, 0.016, 0.034, 6), { p: [path[4][0], path[4][1], path[4][2]], c: metalCol });
      b.add(K.mk(plug.build(), vc, {}));
    });
    /* blood drips hanging from the beak */
    const downS = (() => { const d = skullB.worldToLocal(skullB.localToWorld(new V3(0, 0, 0)).add(new V3(0, -1, 0))); const l = Math.hypot(d.x, d.y, d.z); return [d.x / l, d.y / l, d.z / l]; })();
    [[0.50, 0.30, 0.0], [0.62, 0.15, 1.2], [0.74, 0.22, 2.4]].forEach((d, k) => {
      const base = surf(d[0], 270, -0.004).p;
      const b = rig.bone("drip." + k, "skull", base, [0, 0, 0], { sway: 0.05, phase: d[2] });
      const L = d[1];
      const path = [[0, 0, 0], [downS[0] * L * 0.35, downS[1] * L * 0.35, downS[2] * L * 0.35], [downS[0] * L * 0.7, downS[1] * L * 0.7, downS[2] * L * 0.7], [downS[0] * L, downS[1] * L, downS[2] * L]];
      const db = new Baker();
      db.add(tubeGeo(path, (u) => lerp(0.0075, 0.0035, u), { rows: 10, seg: 5 }), { c: COL.red });
      db.add(P.sph(7), { p: path[3], s: [0.0085, 0.012, 0.0085], c: COL.red });
      b.add(K.mk(db.build(), vc, { shadow: false }));
    });

    /* katanas on the right hip (-X, the painting's left): hilt forward, scabbard raking back and out */
    const kat = [
      { p: [-0.31, 0.125, 0.285], yaw: 0.46, pit: -0.13, off: 0 },
      { p: [-0.33, 0.052, 0.255], yaw: 0.40, pit: -0.17, off: 1 }
    ];
    kat.forEach((kk, k) => {
      const b = rig.bone("katana." + k, "hips", kk.p, [kk.pit, kk.yaw, 0]);
      const kb = new Baker();
      /* scabbard: tapered lacquer tube with a lighter cap + red wrap band */
      const sheath = tubeGeo([[0, 0, -0.26], [0, 0, -0.6], [0, 0, -1.0]], (u) => lerp(0.0225, 0.0165, u), { rows: 10, seg: 8, ratio: 1.38 });
      kb.add(sheath, { c: (x, y, z) => (z < -0.30 && z > -0.34) || (z < -0.62 && z > -0.66) ? COL.red : mixHex(COL.lacquer, 0x2c3150, 0.3 + 0.5 * fbm(x * 9, y * 9, z * 9)) });
      kb.add(P.cyl(0.026, 0.026, 0.07, 8), { p: [0, 0, -0.24], r: [PI / 2, 0, 0], c: metalCol });         // koiguchi
      kb.add(P.sph(8), { p: [0, 0, -1.0], s: [0.024, 0.017, 0.032], c: metalCol });                       // kojiri
      /* handle: diamond wrap = alternating dark / red bands along its length */
      const hdl = tubeGeo([[0, 0, 0], [0, 0, -0.1], [0, 0, -0.2]], () => 0.0165, { rows: 14, seg: 8, ratio: 1.3 });
      kb.add(hdl, { c: (x, y, z) => ((Math.floor((-z) * 52 + (x > 0 ? 0.5 : 0)) & 1) ? COL.lacquer : COL.redDk) });
      kb.add(P.cyl(0.040, 0.040, 0.010, 14), { p: [0, 0, -0.21], r: [PI / 2, 0, 0], s: [1, 1, 0.8], c: COL.metalDk });  // tsuba
      kb.add(P.sph(8), { p: [0, 0, 0.005], s: 0.024, c: metalCol });                                         // kashira
      rig.attach("katana." + k, K.mk(kb.build(), vc, { o: 0.03 }));
      /* sageo cord loop */
      add("katana." + k, g.torus(0.034, 0.0055, TAU * 0.8, 5, 12), redM, { p: [0, -0.02, -0.34], r: [0, 1.2, 0.4] });
    });
    /* red tassels hanging from the scabbard tips (world-down, own sway bones) */
    kat.forEach((kk, k) => {
      const dx = -Math.sin(kk.yaw), dy = Math.cos(kk.yaw) * Math.sin(kk.pit), dz = -Math.cos(kk.yaw) * Math.cos(kk.pit);
      const tip = [kk.p[0] + dx * 1.0, kk.p[1] + dy * 1.0, kk.p[2] + dz * 1.0];
      const b = rig.bone("tassel." + k, "hips", tip, [0, 0.3, 0], { sway: 0.07, phase: k * 2.4 });
      b.add(K.mk(stripGeo(0.035, 0.36 - k * 0.1, { rows: 8, cols: 2, u0: 0.35 + k * 0.2, u1: 0.55 + k * 0.2 }), sashM, { shadow: false }));
    });

    /* ======================================================================
       finish — anchors, animation, merge
       ====================================================================== */
    rig.parts.root = rig.root; rig.parts.body = rig.body;
    rig.parts.orbs = orbs; rig.parts.halos = halos; rig.parts.orbMat = orbMat;
    rig.parts.tentacles = tents.map((t) => t.nm);

    K.mergeRig(rig);
    const anim = K.anim(rig);

    /* ---- clip authoring helpers: tracks of [t, rot, pos, scl, ease] per bone ---- */
    const clipKeys = [];
    const trk = (bone, keys) => {
      for (const k of keys) {
        let pos = k[2], scl = k[3], ease = k[4];
        if (typeof pos === "string") { ease = pos; pos = undefined; }
        else if (typeof scl === "string") { ease = scl; scl = undefined; }
        clipKeys.push({ t: k[0], bone: bone, rot: k[1] || undefined, pos: pos || undefined, scl: scl || undefined, ease: ease });
      }
    };
    const mirror = (bone, keys) => { /* helper: same keys on L, sign-flipped (rot y/z, pos x) on R */
      trk("armL" + bone, keys);
      trk("armR" + bone, keys.map((k) => [k[0], k[1] ? [k[1][0], -k[1][1], -k[1][2]] : k[1], Array.isArray(k[2]) ? [-k[2][0], k[2][1], k[2][2]] : k[2], k[3], k[4]]));
    };
    const flush = (name, dur, loop) => { anim.addClip(name, clipKeys.slice(), { dur: dur, loop: loop }); clipKeys.length = 0; };
    const Z3 = [0, 0, 0];
    const hemTh = hemBones.map((h) => h.th);
    const tentAll = tents.map((t) => ({ a: t.nm + ".a", b: t.nm + ".b", sg: t.sg }));
    const forTents = (fn) => tentAll.forEach(fn);

    /* ---- idle: slow menacing breathing, head drift, cloak breathing, arms hang heavy ---- */
    trk("hips", [[0, Z3, [0, 0, 0]], [2.0, [0.004, 0, 0], [0, -0.012, 0]], [4.0, Z3, [0, 0, 0]]]);
    trk("chest", [[0, Z3], [2.0, [0.020, 0.012, 0.006]], [4.0, Z3]]);
    trk("neck", [[0, Z3], [1.6, [0.01, 0.03, 0.0]], [3.0, [-0.008, -0.025, 0.008]], [4.0, Z3]]);
    trk("head", [[0, Z3], [1.4, [0.025, 0.07, 0.018]], [2.9, [-0.018, -0.06, -0.012]], [4.0, Z3]]);
    trk("skull", [[0, Z3], [2.0, [-0.018, 0.022, 0.012]], [4.0, Z3]]);
    mirror(".sh", [[0, Z3], [2.0, [0.03, 0, 0.025]], [4.0, Z3]]);
    mirror(".el", [[0, Z3], [2.0, [-0.04, 0, 0]], [4.0, Z3]]);
    for (let k = 0; k < hemTh.length; k++) {
      const ph = k * 0.8;
      trk("cloak." + k, [[0, [0, 0, 0]], [1.0, [-0.025 * Math.sin(ph), 0, 0.01 * Math.cos(ph)]], [2.0, [0.02 * Math.cos(ph), 0, -0.01]], [3.0, [-0.02 * Math.sin(ph + 2), 0, 0.01]], [4.0, [0, 0, 0]]]);
    }
    flush("idle", 4.0, true);

    /* ---- summon (0.6s): rise + unfold, cloak flares, tentacles snap open with overshoot ---- */
    trk("base", [[0, Z3, [0, -0.02, 0], [0.72, 0.50, 0.72]], [0.30, Z3, [0, 0.0, 0], [1.05, 1.07, 1.05], "outBack"], [0.60, Z3, [0, 0, 0], [1, 1, 1], "inOutQuad"]]);
    trk("chest", [[0, [0.22, 0, 0]], [0.30, [-0.07, 0, 0], "outCubic"], [0.60, Z3, null, null, "inOutQuad"]]);
    trk("neck", [[0, [0.15, 0, 0]], [0.34, [-0.05, 0, 0], "outCubic"], [0.60, Z3]]);
    trk("head", [[0, [0.35, 0, 0]], [0.32, [-0.14, 0, 0], "outCubic"], [0.60, Z3, null, null, "inOutQuad"]]);
    trk("skull", [[0, [0.12, 0, 0]], [0.34, [-0.08, 0, 0], "outCubic"], [0.60, Z3]]);
    mirror(".sh", [[0, [0, 0, -0.30]], [0.28, [-0.1, 0, 0.55], "outCubic"], [0.60, Z3, null, null, "inOutQuad"]]);
    mirror(".el", [[0, [-0.4, 0, 0]], [0.28, [-0.2, 0, 0]], [0.60, Z3]]);
    for (let k = 0; k < hemTh.length; k++) {
      trk("cloak." + k, [[0, [0.55, 0, 0]], [0.26, [-0.42, 0, 0], "outBack"], [0.60, Z3, null, null, "inOutQuad"]]);
    }
    forTents((t) => {
      trk(t.a, [[0, [0, 0, t.sg * -0.95]], [0.28, [0, 0, t.sg * 0.34], "outBack"], [0.60, Z3, null, null, "inOutQuad"]]);
      trk(t.b, [[0, [0, 0, t.sg * -0.7]], [0.32, [0, 0, t.sg * 0.30], "outBack"], [0.60, Z3, null, null, "inOutQuad"]]);
    });
    for (let k = 0; k < 5; k++) trk("sash." + k, [[0, [0.5, 0, 0]], [0.30, [-0.25, 0, 0], "outCubic"], [0.60, Z3]]);
    flush("summon", 0.6, false);

    /* ---- fire (0.8s): coil, snap back with the skull thrown skyward, arms + tentacles flare, hold, settle ---- */
    trk("base", [[0, [0, 0, 0], [0, 0, 0], [1, 1, 1]], [0.15, Z3, [0, -0.02, 0], [1.02, 0.97, 1.02], "outQuad"], [0.27, Z3, [0, 0.03, 0], [1.0, 1.03, 1.0], "outCubic"], [0.80, Z3, [0, 0, 0], [1, 1, 1], "inOutQuad"]]);
    trk("hips", [[0, Z3, Z3], [0.15, [0.06, 0, 0], [0, -0.05, 0.02], "outQuad"], [0.27, [-0.05, 0, 0], [0, 0.0, -0.03], "outCubic"], [0.56, [-0.04, 0, 0], [0, 0, -0.02]], [0.80, Z3, Z3, null, "inOutQuad"]]);
    trk("chest", [[0, Z3], [0.15, [0.16, 0, 0], "outQuad"], [0.27, [-0.24, 0.0, 0], "outCubic"], [0.56, [-0.20, 0.04, 0.0]], [0.80, Z3, null, null, "inOutQuad"]]);
    trk("neck", [[0, Z3], [0.15, [0.10, 0, 0]], [0.27, [-0.25, 0, 0], "outCubic"], [0.56, [-0.22, 0, 0]], [0.80, Z3, null, null, "inOutQuad"]]);
    trk("head", [[0, Z3], [0.15, [0.20, 0, 0], "outQuad"], [0.27, [-0.62, 0.12, 0], "outCubic"], [0.56, [-0.55, 0.10, 0]], [0.80, Z3, null, null, "inOutQuad"]]);
    trk("skull", [[0, Z3], [0.15, [0.10, 0, 0]], [0.27, [-0.16, 0, 0.05], "outCubic"], [0.56, [-0.12, 0, 0.04]], [0.80, Z3, null, null, "inOutQuad"]]);
    mirror(".sh", [[0, Z3], [0.15, [0.30, 0, -0.30], "outQuad"], [0.27, [-0.45, 0, 1.55], "outBack"], [0.56, [-0.40, 0, 1.45]], [0.80, Z3, null, null, "inOutQuad"]]);
    mirror(".el", [[0, Z3], [0.15, [-0.8, 0, 0]], [0.27, [-0.35, 0, 0], "outCubic"], [0.56, [-0.25, 0, 0]], [0.80, Z3, null, null, "inOutQuad"]]);
    mirror(".hand", [[0, Z3], [0.27, [0.0, 0, 0.0]], [0.27, [-0.4, 0, 0]], [0.56, [-0.4, 0, 0]], [0.80, Z3]]);
    for (let k = 0; k < hemTh.length; k++) {
      trk("cloak." + k, [[0, [0, 0, 0]], [0.15, [0.14, 0, 0], "outQuad"], [0.27, [-0.46, 0, 0], "outBack"], [0.56, [-0.34 - 0.04 * Math.sin(k * 2), 0, 0]], [0.80, Z3, null, null, "inOutQuad"]]);
    }
    forTents((t, i) => {
      trk(t.a, [[0, Z3], [0.15, [0, 0, t.sg * -0.45], "outQuad"], [0.27, [0, 0, t.sg * 1.05], "outBack"], [0.40, [0, 0, t.sg * (0.92 + 0.08 * Math.sin(i))]], [0.56, [0, 0, t.sg * 1.0]], [0.80, Z3, null, null, "inOutQuad"]]);
      trk(t.b, [[0, Z3], [0.15, [0, 0, t.sg * -0.4]], [0.27, [0, 0, t.sg * 0.85], "outBack"], [0.45, [0, 0, t.sg * 0.70]], [0.56, [0, 0, t.sg * 0.8]], [0.80, Z3, null, null, "inOutQuad"]]);
    });
    for (let k = 0; k < 5; k++) trk("sash." + k, [[0, Z3], [0.15, [0.20, 0, 0]], [0.27, [-0.45, 0, 0], "outCubic"], [0.56, [-0.30, 0, 0]], [0.80, Z3]]);
    flush("fire", 0.8, false);

    /* ---- salute (0.8s): stately bow, right hand to the chest, then stillness (held) ---- */
    trk("hips", [[0, Z3, Z3], [0.40, [0.03, 0, 0], [0, -0.025, 0.03], "inOutQuad"], [0.80, [0.03, 0, 0], [0, -0.025, 0.03]]]);
    trk("chest", [[0, Z3], [0.40, [0.26, 0, 0], "inOutQuad"], [0.80, [0.26, 0, 0]]]);
    trk("neck", [[0, Z3], [0.40, [0.10, 0, 0], "inOutQuad"], [0.80, [0.10, 0, 0]]]);
    trk("head", [[0, Z3], [0.42, [0.20, 0.10, 0], "inOutQuad"], [0.80, [0.20, 0.10, 0]]]);
    trk("skull", [[0, Z3], [0.45, [0.05, 0, 0], "inOutQuad"], [0.80, [0.05, 0, 0]]]);
    trk("armR.sh", [[0, Z3], [0.26, [-0.55, 0.1, 0.30], "outQuad"], [0.45, [-0.80, 0.0, 0.60], "inOutQuad"], [0.80, [-0.80, 0.0, 0.60]]]);
    trk("armR.el", [[0, Z3], [0.26, [-0.9, 0, 0], "outQuad"], [0.45, [-1.85, 0, 0.0], "inOutQuad"], [0.80, [-1.85, 0, 0.0]]]);
    trk("armR.hand", [[0, Z3], [0.45, [-0.2, 0, 0.3], "inOutQuad"], [0.80, [-0.2, 0, 0.3]]]);
    trk("armL.sh", [[0, Z3], [0.45, [0.05, 0, -0.04], "inOutQuad"], [0.80, [0.05, 0, -0.04]]]);
    for (let k = 0; k < hemTh.length; k++) trk("cloak." + k, [[0, [0, 0, 0]], [0.45, [(Math.cos(hemTh[k]) > 0 ? 0.05 : -0.1), 0, 0], "inOutQuad"], [0.80, [(Math.cos(hemTh[k]) > 0 ? 0.05 : -0.1), 0, 0]]]);
    forTents((t) => {
      trk(t.a, [[0, Z3], [0.45, [0, 0, t.sg * -0.22], "inOutQuad"], [0.80, [0, 0, t.sg * -0.22]]]);
      trk(t.b, [[0, Z3], [0.45, [0, 0, t.sg * -0.15], "inOutQuad"], [0.80, [0, 0, t.sg * -0.15]]]);
    });
    flush("salute", 0.8, false);

    /* ---- walk (0.9s loop): slow heavy stride; the hem panels kick opposite the stepping legs ---- */
    {
      const T = 0.9, N = 8, dt8 = T / N;
      const sinS = (i, ph) => Math.sin((i / N) * TAU + ph);
      const keysOf = (fn) => { const out = []; for (let i = 0; i <= N; i++) out.push([i * dt8].concat(fn(i % N, i * dt8))); return out; };
      for (const s of ["L", "R"]) {
        const ph = s === "L" ? 0 : PI, sg = s === "L" ? 1 : -1;
        trk("leg" + s + ".hip", keysOf((i) => [[0.5 * sinS(i, ph + PI / 2) * -1, 0, 0], null, null, "linear"]));
        trk("leg" + s + ".knee", keysOf((i) => [[0.12 + 0.55 * Math.max(0, sinS(i, ph + PI * 1.5 - 0.6)), 0, 0], null, null, "linear"]));
        trk("leg" + s + ".foot", keysOf((i) => [[-0.1 * sinS(i, ph) , 0, 0], null, null, "linear"]));
        trk("arm" + s + ".sh", keysOf((i) => [[0.20 * sinS(i, ph + PI / 2) * 1, 0, 0.02 * sg], null, null, "linear"]));
        trk("arm" + s + ".el", keysOf((i) => [[-0.12 - 0.12 * Math.max(0, sinS(i, ph + PI / 2)), 0, 0], null, null, "linear"]));
      }
      trk("hips", keysOf((i) => [[0.015, 0.07 * sinS(i, PI / 2), 0.03 * sinS(i, 0)], [0.0, 0.028 * Math.cos((i / N) * TAU * 2) - 0.012, 0.0], null, "linear"]));
      trk("chest", keysOf((i) => [[0.05, -0.09 * sinS(i, PI / 2), -0.03 * sinS(i, 0)], null, null, "linear"]));
      trk("head", keysOf((i) => [[0.02 + 0.015 * Math.cos((i / N) * TAU * 2), 0.05 * sinS(i, PI / 2), 0.0], null, null, "linear"]));
      trk("skull", keysOf((i) => [[0.02 * Math.sin((i / N) * TAU * 2), 0, 0.015 * sinS(i, 0)], null, null, "linear"]));
      for (let k = 0; k < hemTh.length; k++) {
        const th = hemTh[k], left = Math.sin(th) > 0, ph = left ? 0 : PI;
        trk("cloak." + k, keysOf((i) => [[-0.26 * Math.cos(th) * sinS(i, ph) + 0.04, 0, -0.26 * Math.sin(th) * sinS(i, ph)], null, null, "linear"]));
      }
      forTents((t, idx) => {
        trk(t.a, keysOf((i) => [[0, 0, t.sg * 0.10 * sinS(i, idx * 1.3 + 0.5)], null, null, "linear"]));
        trk(t.b, keysOf((i) => [[0, 0, t.sg * 0.16 * sinS(i, idx * 1.3 + 1.7)], null, null, "linear"]));
      });
      for (let k = 0; k < 5; k++) trk("sash." + k, keysOf((i) => [[0.12 * sinS(i, k * 0.9 + 2) - 0.1, 0, 0.06 * sinS(i, k)], null, null, "linear"]));
      flush("walk", T, true);
    }

    /* ---- procedural layer: orb pulse / strobe / pop-in, tentacle writhe, skull-lens flicker ---- */
    const nOrb = orbs.length;
    const haloBase = halos.map((h) => (h ? h.material.opacity : 0));
    const uK = orbMat.uniforms.uK;
    const tOffA = tentAll.map((t) => t.a), tOffB = tentAll.map((t) => t.b);
    const easeBack = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
    anim.layer(function (t, dt, an) {
      const nm = an.name, tm = an.time;
      let env = 0, pop = 1, calm = 1;
      if (nm === "fire") {
        env = tm < 0.10 ? 0.12 * tm / 0.10 : tm < 0.27 ? 0.12 + 0.88 * (tm - 0.10) / 0.17 : tm < 0.60 ? 1.0 : Math.max(0, 1 - (tm - 0.60) / 0.20);
      } else if (nm === "salute") calm = 1 - 0.30 * (tm > 0.45 ? 1 : tm / 0.45);
      const summoning = nm === "summon" && tm < 0.55;
      let kk = 0;
      for (let i = 0; i < nOrb; i++) {
        const m = orbs[i], ph = orbPh[i];
        let s = 1 + 0.08 * Math.sin(t * 1.7 + ph) + 0.035 * Math.sin(t * 4.1 + ph * 2.3);
        let op = 0.80 + 0.2 * Math.sin(t * 1.3 + ph * 1.7);
        if (summoning) pop = easeBack((tm - i * 0.010) / 0.34), s *= pop;
        if (env > 0) {
          const st = Math.sin(tm * 58 + i * 2.3) > -0.15 ? 1 : 0.0;
          s *= 1 + 0.55 * env * st;
          op = 0.9 + 1.2 * env * st;
        }
        m.scale.setScalar(orbR[i] * s * (calm > 0.99 ? 1 : (0.85 + 0.15 * calm)));
        const hs = halos[i];
        if (hs) hs.material.opacity = haloBase[i] * op * calm * (summoning ? Math.min(1, Math.max(0, pop)) : 1);
        kk += 1;
      }
      uK.value = 1.45 + 0.16 * Math.sin(t * 1.2) + 1.3 * env * (Math.sin(tm * 58) > -0.1 ? 1 : 0.35);
      for (let i = 0; i < tOffA.length; i++) {
        const a = anim.off(tOffA[i]), b = anim.off(tOffB[i]), sg = tentAll[i].sg;
        if (a) a.rz = sg * 0.075 * Math.sin(t * 0.9 + i * 1.7) + sg * 0.03 * Math.sin(t * 2.3 + i);
        if (b) b.rz = sg * 0.12 * Math.sin(t * 1.25 + i * 1.3 + 1.0) + sg * 0.05 * Math.sin(t * 3.1 + i * 2.0);
      }
    });

    anim.setBase("idle");
    anim.play("idle", { fade: 0 });
    anim.update(0);
    return { id: "crane", root: rig.root, parts: rig.parts, anim, height: DEF.height, radius: DEF.radius, team: DEF.team, rig, meshes: rig.countMeshes() };
  }

  G.chars.define("crane", DEF, buildCrane);
})();
