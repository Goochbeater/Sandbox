/* ============================================================================
   SPOREHEART — src/char_witch.js
   MIRA, THE SPORE WITCH — player character, modelled after refs/codex0.jpg
   (young apprentice mage: huge bent black hat with orange bands, blunt black bob,
   cream cowl, ink poncho with orange stitched patch, periwinkle duster with huge
   rolled cuffs, belts, satchel + spyglass, green pack with a skull trinket and the
   eyeball staff).

   Everything is code: lofted forms, painted canvas textures, vertex-coloured baked
   detail meshes (one draw call per bone), hinged cloth.  Registers over the legacy
   builder:  G.chars.define("witch", {...}, builder)

   Conventions: metres, +Y up, faces +Z, character LEFT = +X (staff hand).
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  if (!G || !G.kit || !G.chars) throw new Error("char_witch.js requires charakit.js + characters.js");
  const K = G.kit;
  const PI = Math.PI, TAU = PI * 2;
  const T = () => G.THREE;

  /* ==========================================================================
     SECTION 1 — SMALL UTILITIES
     ========================================================================== */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
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
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return mix(hash(i), hash(i + 1), u); }

  const _lin = Object.create(null);
  /* sRGB hex -> linear [r,g,b] (what vertex colours want) */
  function lin(hex) {
    let c = _lin[hex];
    if (!c) { const k = new (T().Color)(hex); c = _lin[hex] = [k.r, k.g, k.b]; }
    return c;
  }

  /* Catmull-Rom through arrays of numbers / [x,y,z] */
  function crScalar(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  function spline(pts, t) {            // pts: array of numbers or arrays, t in 0..1
    const n = pts.length - 1;
    const f = clamp(t, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(f)), u = f - i;
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(n, i + 2)];
    if (typeof b === "number") return crScalar(a, b, c, d, u);
    return [crScalar(a[0], b[0], c[0], d[0], u), crScalar(a[1], b[1], c[1], d[1], u), crScalar(a[2], b[2], c[2], d[2], u)];
  }

  /* ==========================================================================
     SECTION 2 — GEOMETRY TOOLS
     loft()  : elliptical rings swept along a spine (organic tubes, cloth shells, hats)
     Bake    : merges many primitives into ONE vertex-coloured geometry
     ========================================================================== */
  function loft(secs, seg, o) {
    o = o || {};
    const THREE = T();
    const n = secs.length;
    const a0 = o.a0 === undefined ? -PI : o.a0, a1 = o.a1 === undefined ? PI : o.a1;
    const full = Math.abs(a1 - a0 - TAU) < 1e-5;
    const ref = o.ref || [0, 0, 1];
    const seg1 = seg + 1;
    const pos = new Float32Array(n * seg1 * 3), uv = new Float32Array(n * seg1 * 2);
    const col = o.col ? new Float32Array(n * seg1 * 3) : null;
    const se = o.sq ? 2 / o.sq : 0;
    /* cumulative arclength for v */
    const cum = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      const p = secs[i - 1].c, q = secs[i].c;
      cum[i] = cum[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    }
    const tot = cum[n - 1] || 1;
    const cen = [];
    for (let i = 0; i < n; i++) {
      const s = secs[i];
      const pa = secs[i > 0 ? i - 1 : 0].c, pb = secs[i < n - 1 ? i + 1 : n - 1].c;
      let tx = pb[0] - pa[0], ty = pb[1] - pa[1], tz = pb[2] - pa[2];
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let rr = ref;
      let d = rr[0] * tx + rr[1] * ty + rr[2] * tz;
      let bx = rr[0] - tx * d, by = rr[1] - ty * d, bz = rr[2] - tz * d;
      let bl = Math.hypot(bx, by, bz);
      if (bl < 1e-3) { rr = [1, 0, 0]; d = tx; bx = 1 - tx * d; by = -ty * d; bz = -tz * d; bl = Math.hypot(bx, by, bz) || 1; }
      bx /= bl; by /= bl; bz /= bl;
      const nx = ty * bz - tz * by, ny = tz * bx - tx * bz, nz = tx * by - ty * bx;
      const vv = s.v !== undefined ? s.v : (o.v0 === undefined ? 0 : o.v0) + ((o.v1 === undefined ? 1 : o.v1) - (o.v0 === undefined ? 0 : o.v0)) * (o.vIdx ? i / (n - 1) : cum[i] / tot);
      cen.push(s.c);
      for (let k = 0; k <= seg; k++) {
        const a = a0 + (a1 - a0) * k / seg;
        let sn = Math.sin(a), cs = Math.cos(a);
        if (se) { sn = Math.sign(sn) * Math.pow(Math.abs(sn), se); cs = Math.sign(cs) * Math.pow(Math.abs(cs), se); }
        const m = o.fn ? o.fn(a, i / (n - 1), i, k) : 1;
        const rx = s.rx * m, rz = (s.rz === undefined ? s.rx : s.rz) * m;
        const j = (i * seg1 + k) * 3;
        pos[j] = s.c[0] + nx * rx * sn + bx * rz * cs;
        pos[j + 1] = s.c[1] + ny * rx * sn + by * rz * cs + (o.dy ? o.dy(a, i, k, i / (n - 1)) : 0);
        pos[j + 2] = s.c[2] + nz * rx * sn + bz * rz * cs;
        const q = (i * seg1 + k) * 2;
        uv[q] = (o.u0 === undefined ? 0 : o.u0) + ((o.u1 === undefined ? 1 : o.u1) - (o.u0 === undefined ? 0 : o.u0)) * (k / seg);
        uv[q + 1] = 1 - vv;
        if (col) {
          const cc = o.col(i, k, a, i / (n - 1));
          const l = typeof cc === "number" ? lin(cc) : cc;
          col[j] = l[0]; col[j + 1] = l[1]; col[j + 2] = l[2];
        }
      }
    }
    /* winding: make triangles face outward from the spine */
    const idx = [];
    const mi = Math.max(0, Math.min(n - 2, n >> 1)), mk_ = seg >> 1;
    const ia = (mi * seg1 + mk_) * 3, ib = ((mi + 1) * seg1 + mk_) * 3, ic = (mi * seg1 + mk_ + 1) * 3;
    const e1x = pos[ib] - pos[ia], e1y = pos[ib + 1] - pos[ia + 1], e1z = pos[ib + 2] - pos[ia + 2];
    const e2x = pos[ic] - pos[ia], e2y = pos[ic + 1] - pos[ia + 1], e2z = pos[ic + 2] - pos[ia + 2];
    const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
    const c0 = cen[mi];
    const dot = fx * (pos[ia] - c0[0]) + fy * (pos[ia + 1] - c0[1]) + fz * (pos[ia + 2] - c0[2]);
    const flip = o.flip ? dot > 0 : dot < 0;
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < seg; k++) {
        const a = i * seg1 + k, b = a + seg1;
        if (flip) idx.push(a, a + 1, b, a + 1, b + 1, b);
        else idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    if (col) g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    if (full) {                       // weld shading across the seam
      const nr = g.attributes.normal.array;
      for (let i = 0; i < n; i++) {
        const p = (i * seg1) * 3, q = (i * seg1 + seg) * 3;
        const x = nr[p] + nr[q], y = nr[p + 1] + nr[q + 1], z = nr[p + 2] + nr[q + 2];
        const l = Math.hypot(x, y, z) || 1;
        nr[p] = nr[q] = x / l; nr[p + 1] = nr[q + 1] = y / l; nr[p + 2] = nr[q + 2] = z / l;
      }
    }
    g.userData.seg = seg; g.userData.n = n; g.userData.flip = flip;
    return g;
  }

  /* cut rows i0..i1 out of a loft (keeps the exact normals -> seamless joints) */
  function loftSlice(g, i0, i1, shift) {
    const THREE = T();
    const seg1 = g.userData.seg + 1, flip = g.userData.flip;
    const out = new THREE.BufferGeometry();
    const names = ["position", "normal", "uv", "color"];
    for (let q = 0; q < names.length; q++) {
      const src = g.attributes[names[q]];
      if (!src) continue;
      const is = src.itemSize;
      const arr = new Float32Array((i1 - i0 + 1) * seg1 * is);
      arr.set(src.array.subarray(i0 * seg1 * is, (i1 + 1) * seg1 * is));
      if (names[q] === "position" && shift) {
        for (let i = 0; i < arr.length; i += 3) { arr[i] -= shift[0]; arr[i + 1] -= shift[1]; arr[i + 2] -= shift[2]; }
      }
      out.setAttribute(names[q], new THREE.BufferAttribute(arr, is));
    }
    const idx = [], seg = seg1 - 1;
    for (let i = 0; i < i1 - i0; i++) for (let k = 0; k < seg; k++) {
      const a = i * seg1 + k, b = a + seg1;
      if (flip) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    out.setIndex(idx);
    out.userData.seg = g.userData.seg; out.userData.n = i1 - i0 + 1; out.userData.flip = flip;
    return out;
  }

  /* translate a geometry's positions in place and return it */
  function shifted(g, dx, dy, dz) { g.translate(dx, dy, dz); return g; }

  /* Bake — weld primitives into one geometry with per-vertex colour */
  function Bake() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }
  Bake.prototype.add = function (g, color, o) {
    o = o || {};
    const THREE = T();
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    if (o.p) p.set(o.p[0], o.p[1], o.p[2]);
    if (o.r) { e.set(o.r[0], o.r[1], o.r[2], o.ro || "XYZ"); q.setFromEuler(e); }
    if (o.s !== undefined) { if (typeof o.s === "number") s.setScalar(o.s); else s.set(o.s[0], o.s[1], o.s[2]); }
    m.compose(p, q, s);
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const flipW = m.determinant() < 0;
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
    const v = new THREE.Vector3(), nn = new THREE.Vector3();
    const base = this.n;
    const cf = typeof color === "function" ? color : null;
    const c0 = cf ? null : (typeof color === "number" ? lin(color) : color);
    const kk = o.k === undefined ? 1 : o.k;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m);
      if (N) nn.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); else nn.set(0, 1, 0);
      this.pos.push(v.x, v.y, v.z);
      this.nor.push(nn.x, nn.y, nn.z);
      this.uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
      let c;
      if (cf) { c = cf(v.x, v.y, v.z, i, nn); if (typeof c === "number") c = lin(c); }
      else if (C && color === null) c = [C.getX(i), C.getY(i), C.getZ(i)];
      else c = c0;
      this.col.push(c[0] * kk, c[1] * kk, c[2] * kk);
    }
    if (g.index) {
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i += 3) {
        if (flipW) this.idx.push(base + ix[i], base + ix[i + 2], base + ix[i + 1]);
        else this.idx.push(base + ix[i], base + ix[i + 1], base + ix[i + 2]);
      }
    } else {
      for (let i = 0; i < P.count; i += 3) {
        if (flipW) this.idx.push(base + i, base + i + 2, base + i + 1);
        else this.idx.push(base + i, base + i + 1, base + i + 2);
      }
    }
    this.n += P.count;
    return this;
  };
  Bake.prototype.geo = function () {
    const THREE = T();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  };

  /* primitives for bake (own instances so we can freely transform) */
  const PR = {};
  function prim(kind, a, b, c, d) {
    const THREE = T();
    const key = kind + "_" + a + "_" + b + "_" + c + "_" + d;
    if (PR[key]) return PR[key];
    let g;
    switch (kind) {
      case "sph": g = new THREE.SphereGeometry(1, a || 14, b || 10); break;
      case "box": g = new THREE.BoxGeometry(1, 1, 1); break;
      case "cyl": g = new THREE.CylinderGeometry(a, b, c, d || 10, 1); break;      // rTop, rBot, h, seg
      case "cone": g = new THREE.ConeGeometry(1, 1, a || 8); break;
      case "tor": g = new THREE.TorusGeometry(a, b, c || 6, d || 14); break;
      default: g = new THREE.BoxGeometry(1, 1, 1);
    }
    PR[key] = g;
    return g;
  }

  /* rounded cloth flap / tatter in the XY plane, top edge at y=0 hanging to -len.
     optional wave (z displacement) and jagged hem */
  function flap(w, len, jag, wave, segW, segH, taper, seed) {
    const THREE = T();
    segW = segW || 6; segH = segH || 5;
    const R = rng(seed || 3);
    const pos = [], uv = [], idx = [];
    const jr = [];
    for (let i = 0; i <= segW; i++) jr.push(R());
    for (let j = 0; j <= segH; j++) {
      const v = j / segH;
      for (let i = 0; i <= segW; i++) {
        const u = i / segW;
        const half = (w / 2) * (1 + (taper === undefined ? 0.15 : taper) * v);
        let y = -len * v;
        if (j === segH && jag) y -= jag * (i % 2 === 0 ? 0.3 + jr[i] * 0.7 : jr[i] * 0.25);
        const x = (u - 0.5) * 2 * half;
        const z = wave ? Math.sin(u * PI * 3 + seed) * wave * v + Math.sin(u * 9 + v * 4) * wave * 0.25 * v : 0;
        pos.push(x, y, z); uv.push(u, 1 - v);
      }
    }
    for (let j = 0; j < segH; j++) for (let i = 0; i < segW; i++) {
      const a = j * (segW + 1) + i, b = a + segW + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  /* ==========================================================================
     SECTION 3 — PAINTED TEXTURES (canvas, built once, cached at module level)
     ========================================================================== */
  const TX = {};
  function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function mkTex(c, repeat) {
    const THREE = T();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const rgbOf = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const css = (c, a) => "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (a === undefined ? 1 : a) + ")";
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const shade = (c, k) => (k >= 0 ? mixc(c, [255, 255, 255], k) : mixc(c, [0, 0, 0], -k));

  /* painterly dry-brush strokes */
  function strokes(ctx, w, h, base, o) {
    const R = rng(o.seed || 7);
    for (let i = 0; i < o.n; i++) {
      const x = R() * w, y = R() * h;
      const len = o.len * (0.35 + R() * 0.9), wid = o.wid * (0.4 + R() * 1.1);
      const ang = (o.ang || 0) + (R() - 0.5) * (o.spread === undefined ? 0.25 : o.spread);
      const k = (R() * 2 - 1) * o.k;
      ctx.strokeStyle = css(shade(base, k), o.alpha === undefined ? 0.4 : o.alpha);
      ctx.lineWidth = wid; ctx.lineCap = "round";
      const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
      for (let ox = (o.wrap ? -w : 0); ox <= (o.wrap ? w : 0); ox += w) {
        ctx.beginPath(); ctx.moveTo(x + ox, y); ctx.lineTo(x + ox + dx, y + dy); ctx.stroke();
      }
    }
  }
  function vbands(ctx, w, h, base, count, k, alpha, seed, wrap) {      // broad soft vertical fold bands
    const R = rng(seed);
    for (let i = 0; i < count; i++) {
      const x = R() * w, bw = w * (0.03 + R() * 0.06);
      const kk = (R() * 2 - 1) * k;
      for (let ox = (wrap ? -w : 0); ox <= (wrap ? w : 0); ox += w) {
        const g = ctx.createLinearGradient(x + ox - bw, 0, x + ox + bw, 0);
        g.addColorStop(0, css(shade(base, kk), 0)); g.addColorStop(0.5, css(shade(base, kk), alpha)); g.addColorStop(1, css(shade(base, kk), 0));
        ctx.fillStyle = g; ctx.fillRect(x + ox - bw, 0, bw * 2, h);
      }
    }
  }
  function speckle(ctx, w, h, col, n, r0, r1, alpha, seed) {
    const R = rng(seed);
    ctx.fillStyle = css(col, alpha);
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(R() * w, R() * h, r0 + R() * (r1 - r0), 0, TAU); ctx.fill(); }
  }
  function stitchLine(ctx, pts, col, len, gap, wid) {   // dashed stitching along a polyline
    ctx.strokeStyle = css(col, 0.9); ctx.lineWidth = wid; ctx.lineCap = "round";
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      for (let d = 0; d < L - len; d += len + gap) {
        ctx.beginPath(); ctx.moveTo(a[0] + ux * d, a[1] + uy * d); ctx.lineTo(a[0] + ux * (d + len), a[1] + uy * (d + len)); ctx.stroke();
      }
    }
  }

  /* ---- HAT cone: navy-black cloth, scuffed grey crown patch, two orange bands ---- */
  function texHat() {
    if (TX.hat) return TX.hat;
    const w = 512, h = 512, c = cv(w, h), ctx = c.getContext("2d");
    const base = [30, 37, 54];
    ctx.fillStyle = css(base); ctx.fillRect(0, 0, w, h);
    vbands(ctx, w, h, base, 10, 0.25, 0.25, 11, true);
    strokes(ctx, w, h, base, { n: 700, len: 90, wid: 4, ang: PI / 2, spread: 0.5, k: 0.25, alpha: 0.25, seed: 5, wrap: true });
    /* lighter greyish crown base at the FRONT (u centre) like the painting */
    const gc = ctx.createRadialGradient(w * 0.5, h * 0.02, 4, w * 0.5, h * 0.02, w * 0.30);
    gc.addColorStop(0, "rgba(104,110,112,0.95)"); gc.addColorStop(0.6, "rgba(84,90,98,0.55)"); gc.addColorStop(1, "rgba(60,66,80,0)");
    ctx.fillStyle = gc; ctx.fillRect(0, 0, w, h * 0.3);
    strokes(ctx, w, h * 0.22, [96, 102, 106], { n: 110, len: 40, wid: 5, ang: 0.15, spread: 0.7, k: 0.2, alpha: 0.22, seed: 9, wrap: true });
    /* orange bands (hand-painted, ragged edges, slanted) */
    const orange = [244, 108, 34];
    function band(v0, v1, seed) {
      const R = rng(seed);
      ctx.beginPath();
      const top = [], bot = [];
      for (let x = 0; x <= w; x += 8) {
        const sl = Math.sin((x / w) * TAU + 0.6) * h * 0.022;
        top.push([x, v0 * h + sl + (R() - 0.5) * 5]);
        bot.push([x, v1 * h + sl + (R() - 0.5) * 5]);
      }
      ctx.moveTo(top[0][0], top[0][1]);
      for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
      for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
      ctx.closePath(); ctx.fillStyle = css(orange); ctx.fill();
      /* dry brush variation inside */
      for (let i = 0; i < 70; i++) {
        const x = R() * w, y = (v0 + R() * (v1 - v0)) * h + Math.sin((x / w) * TAU + 0.6) * h * 0.022;
        ctx.strokeStyle = css(shade(orange, (R() - 0.45) * 0.4), 0.55); ctx.lineWidth = 2 + R() * 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 + R() * 30, y + (R() - 0.5) * 6); ctx.stroke();
      }
    }
    band(0.20, 0.30, 21);
    band(0.43, 0.58, 22);
    /* scuffs, torn spot with ochre, small stitched patch */
    strokes(ctx, w, h * 0.5, [120, 124, 120], { n: 18, len: 22, wid: 2, ang: 0.8, spread: 1.2, k: 0.2, alpha: 0.5, seed: 14, wrap: true });
    ctx.save(); ctx.translate(w * 0.32, h * 0.72); ctx.rotate(-0.4);
    ctx.strokeStyle = "rgba(150,148,128,0.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 6); ctx.stroke();
    ctx.strokeStyle = "rgba(190,150,70,0.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 9); ctx.lineTo(18, 14); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(34,52,62,0.9)"; ctx.fillRect(w * 0.66, h * 0.64, 54, 40);
    stitchLine(ctx, [[w * 0.66 + 4, h * 0.64 + 4], [w * 0.66 + 50, h * 0.64 + 4], [w * 0.66 + 50, h * 0.64 + 36], [w * 0.66 + 4, h * 0.64 + 36], [w * 0.66 + 4, h * 0.64 + 4]], [210, 180, 120], 5, 4, 2);
    TX.hat = mkTex(c, true);
    return TX.hat;
  }

  /* ---- BRIM: planar, scuffed light rim, grey crown halo ---- */
  function texBrim() {
    if (TX.brim) return TX.brim;
    const w = 512, h = 512, c = cv(w, h), ctx = c.getContext("2d");
    const base = [30, 37, 54];
    ctx.fillStyle = css(base); ctx.fillRect(0, 0, w, h);
    const R = rng(31);
    /* radial brush strokes */
    for (let i = 0; i < 900; i++) {
      const a = R() * TAU, d0 = 0.08 + R() * 0.40, len = 0.03 + R() * 0.09;
      const x0 = w / 2 + Math.cos(a) * d0 * w, y0 = h / 2 + Math.sin(a) * d0 * h;
      const x1 = w / 2 + Math.cos(a) * (d0 + len) * w, y1 = h / 2 + Math.sin(a) * (d0 + len) * h;
      ctx.strokeStyle = css(shade(base, (R() * 2 - 0.9) * 0.28), 0.28); ctx.lineWidth = 2 + R() * 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    /* sun-faded grey halo near the crown */
    const g = ctx.createRadialGradient(w / 2, h / 2, 0.1 * w, w / 2, h / 2, 0.30 * w);
    g.addColorStop(0, "rgba(96,102,104,0.75)"); g.addColorStop(1, "rgba(70,76,88,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    /* scuffed light outer rim */
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * TAU, rr = 0.445 + vnoise(i * 0.35) * 0.03 + (R() - 0.5) * 0.01;
      const x = w / 2 + Math.cos(a) * rr * w, y = h / 2 + Math.sin(a) * rr * h;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.lineTo(w * 2, h / 2); ctx.lineTo(w * 2, h * 2); ctx.lineTo(-w, h * 2); ctx.lineTo(-w, -h); ctx.lineTo(w * 2, -h); ctx.lineTo(w * 2, h / 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(112,118,120,0.80)"; ctx.fill("evenodd");
    strokes(ctx, w, h, [112, 118, 120], { n: 140, len: 24, wid: 3, ang: 0, spread: 6.28, k: 0.3, alpha: 0.5, seed: 17 });
    /* grey scratch flecks + a patched mend */
    speckle(ctx, w, h, [120, 124, 122], 22, 1, 3, 0.4, 4);
    TX.brim = mkTex(c, false);
    return TX.brim;
  }

  /* ---- PONCHO: slate ink cloth, dark hem, ochre flecks, orange zig-zag patch + ribbon ---- */
  function texPoncho() {
    if (TX.poncho) return TX.poncho;
    const w = 1024, h = 512, c = cv(w, h), ctx = c.getContext("2d");
    const base = [76, 86, 114];
    ctx.fillStyle = css(base); ctx.fillRect(0, 0, w, h);
    vbands(ctx, w, h, base, 22, 0.22, 0.22, 41, true);
    strokes(ctx, w, h, base, { n: 1400, len: 80, wid: 5, ang: PI / 2, spread: 0.35, k: 0.28, alpha: 0.30, seed: 3, wrap: true });
    /* darker hem band */
    const hg = ctx.createLinearGradient(0, h * 0.62, 0, h);
    hg.addColorStop(0, "rgba(20,26,40,0)"); hg.addColorStop(1, "rgba(14,18,30,0.80)");
    ctx.fillStyle = hg; ctx.fillRect(0, h * 0.62, w, h * 0.38);
    /* lighter shoulder wash */
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.35);
    sg.addColorStop(0, "rgba(130,140,172,0.35)"); sg.addColorStop(1, "rgba(130,140,172,0)");
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.35);
    speckle(ctx, w, h, [200, 140, 64], 70, 1.2, 3.2, 0.7, 8);
    speckle(ctx, w, h, [160, 170, 190], 90, 1, 2.4, 0.4, 9);
    /* orange stitched zig-zag patch (character-left chest), drawn in cm so it is not stretched */
    const orange = [250, 108, 34];
    const PXC = w / 160, PYC = h / 32.6;                    // px per cm (circumference ~160 cm, v span ~32.6 cm)
    ctx.save();
    ctx.translate(w * 0.572, h * 0.60); ctx.scale(PXC, PYC);
    ctx.lineJoin = "miter"; ctx.lineCap = "butt"; ctx.miterLimit = 6;
    const zz = [[-11.5, -0.5], [-6.5, 3.4], [-1.5, -2.0], [3.5, 3.6], [9.0, -2.4]];
    ctx.strokeStyle = css(orange); ctx.lineWidth = 3.6;
    ctx.beginPath(); zz.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = css(shade(orange, 0.3), 0.75); ctx.lineWidth = 0.9;
    ctx.beginPath(); zz.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] - 0.9) : ctx.moveTo(p[0], p[1] - 0.9))); ctx.stroke();
    ctx.strokeStyle = "rgba(255,230,190,0.9)"; ctx.lineWidth = 0.28; ctx.setLineDash([0.9, 0.7]);
    ctx.beginPath(); zz.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + 0.2) : ctx.moveTo(p[0], p[1] + 0.2))); ctx.stroke();
    ctx.setLineDash([]);
    /* ragged ends */
    ctx.fillStyle = css(orange);
    ctx.beginPath(); ctx.moveTo(-12.4, -2.0); ctx.lineTo(-10.6, -2.4); ctx.lineTo(-10.2, 1.2); ctx.lineTo(-12.6, 0.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8.0, -4.2); ctx.lineTo(10.2, -3.8); ctx.lineTo(10.0, -0.4); ctx.lineTo(7.8, -0.9); ctx.closePath(); ctx.fill();
    /* hanging ribbon tails */
    ctx.beginPath(); ctx.moveTo(-17.6, -4.5); ctx.lineTo(-15.0, -4.5); ctx.lineTo(-15.4, 6.5); ctx.lineTo(-17.4, 5.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-14.6, -3.0); ctx.lineTo(-12.8, -2.6); ctx.lineTo(-13.6, 2.6); ctx.closePath(); ctx.fill();
    ctx.restore();
    TX.poncho = mkTex(c, true);
    return TX.poncho;
  }

  /* ---- COAT: periwinkle painted folds ---- */
  function texCoat() {
    if (TX.coat) return TX.coat;
    const w = 512, h = 512, c = cv(w, h), ctx = c.getContext("2d");
    const base = [112, 138, 186];
    ctx.fillStyle = css(base); ctx.fillRect(0, 0, w, h);
    vbands(ctx, w, h, base, 16, 0.32, 0.45, 61, true);
    strokes(ctx, w, h, base, { n: 900, len: 120, wid: 7, ang: PI / 2, spread: 0.3, k: 0.30, alpha: 0.32, seed: 2, wrap: true });
    strokes(ctx, w, h, [182, 202, 232], { n: 120, len: 60, wid: 3, ang: PI / 2, spread: 0.4, k: 0.1, alpha: 0.5, seed: 12, wrap: true });
    const hg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    hg.addColorStop(0, "rgba(44,66,96,0)"); hg.addColorStop(1, "rgba(44,66,96,0.55)");
    ctx.fillStyle = hg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    speckle(ctx, w, h, [60, 90, 120], 40, 1, 3, 0.4, 3);
    TX.coat = mkTex(c, true);
    return TX.coat;
  }

  /* ---- SLEEVE: sleeve blue, lighter rolled cuff, dark inside (v runs shoulder -> inside) ---- */
  function texSleeve() {
    if (TX.sleeve) return TX.sleeve;
    const w = 256, h = 512, c = cv(w, h), ctx = c.getContext("2d");
    const base = [112, 138, 186];
    ctx.fillStyle = css(base); ctx.fillRect(0, 0, w, h);
    vbands(ctx, w, h, base, 8, 0.3, 0.45, 5, true);
    strokes(ctx, w, h, base, { n: 400, len: 90, wid: 6, ang: PI / 2, spread: 0.3, k: 0.28, alpha: 0.3, seed: 6, wrap: true });
    /* cuff zone v 0.54..0.88 lighter, with a crease at the roll edge */
    const cuff = [142, 168, 212];
    ctx.fillStyle = css(cuff); ctx.fillRect(0, h * 0.54, w, h * 0.34);
    strokes(ctx, w, h * 0.34, cuff, { n: 120, len: 50, wid: 5, ang: 0.05, spread: 0.3, k: 0.14, alpha: 0.35, seed: 8, wrap: true });
    ctx.fillStyle = "rgba(60,84,118,0.55)"; ctx.fillRect(0, h * 0.535, w, h * 0.016);
    ctx.fillStyle = "rgba(40,58,86,0.7)"; ctx.fillRect(0, h * 0.87, w, h * 0.02);
    /* inside of the cuff: very dark */
    ctx.fillStyle = "rgb(24,34,48)"; ctx.fillRect(0, h * 0.89, w, h * 0.11);
    speckle(ctx, w, h * 0.5, [60, 90, 124], 16, 1, 2.6, 0.4, 2);
    TX.sleeve = mkTex(c, true);
    return TX.sleeve;
  }

  /* ---- SCARF: cream wool with sage shadows ---- */
  function texScarf() {
    if (TX.scarf) return TX.scarf;
    const w = 512, h = 256, c = cv(w, h), ctx = c.getContext("2d");
    const base = [240, 238, 208];
    ctx.fillStyle = css(base); ctx.fillRect(0, 0, w, h);
    const R = rng(77);
    for (let i = 0; i < 26; i++) {      // sage fold shadows
      const x = R() * w, y = R() * h, rw = 30 + R() * 70, rh = 10 + R() * 26;
      for (let ox = -w; ox <= w; ox += w) {
        const g = ctx.createRadialGradient(x + ox, y, 2, x + ox, y, rw);
        g.addColorStop(0, "rgba(176,198,162,0.55)"); g.addColorStop(1, "rgba(176,198,162,0)");
        ctx.save(); ctx.translate(x + ox, y); ctx.scale(1, rh / rw); ctx.translate(-(x + ox), -y);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + ox, y, rw, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
    strokes(ctx, w, h, base, { n: 360, len: 60, wid: 4, ang: 0.3, spread: 1.0, k: 0.12, alpha: 0.3, seed: 19, wrap: true });
    strokes(ctx, w, h, [120, 140, 112], { n: 70, len: 26, wid: 2, ang: 0.4, spread: 1.4, k: 0.2, alpha: 0.35, seed: 20, wrap: true });
    TX.scarf = mkTex(c, true);
    return TX.scarf;
  }

  /* ---- STAFF WOOD: grey-brown bark with pale streaks, v runs along the shaft ---- */
  function texWood() {
    if (TX.wood) return TX.wood;
    const w = 256, h = 512, c = cv(w, h), ctx = c.getContext("2d");
    const base = [122, 110, 100];
    ctx.fillStyle = css(base); ctx.fillRect(0, 0, w, h);
    vbands(ctx, w, h, base, 14, 0.4, 0.55, 7, true);
    strokes(ctx, w, h, base, { n: 900, len: 100, wid: 5, ang: PI / 2, spread: 0.22, k: 0.38, alpha: 0.4, seed: 7, wrap: true });
    strokes(ctx, w, h, [222, 214, 196], { n: 160, len: 70, wid: 3, ang: PI / 2, spread: 0.3, k: 0.1, alpha: 0.5, seed: 8, wrap: true });
    strokes(ctx, w, h, [58, 52, 50], { n: 160, len: 44, wid: 3, ang: PI / 2, spread: 0.4, k: 0.2, alpha: 0.55, seed: 9, wrap: true });
    TX.wood = mkTex(c, true);
    return TX.wood;
  }

  /* ---- FACE decal: brows, blush, nose, mouth (spherical map az[-1,1] x el[-0.85,0.45]) ---- */
  const FACE = { az: 1.0, el0: -0.85, el1: 0.45, w: 640, h: 416 };
  function texFace() {
    if (TX.face) return TX.face;
    const w = FACE.w, h = FACE.h, c = cv(w, h), ctx = c.getContext("2d");
    const X = (az) => (az + FACE.az) / (2 * FACE.az) * w;
    const Y = (el) => (FACE.el1 - el) / (FACE.el1 - FACE.el0) * h;
    const R = rng(91);
    ctx.clearRect(0, 0, w, h);
    /* blush: broad soft pink-red across cheeks and the bridge of the nose, with brush hatching */
    for (const s of [-1, 1]) {
      const cx = X(s * 0.60), cy = Y(-0.20);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.62);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 96);
      g.addColorStop(0, "rgba(226,104,108,0.78)"); g.addColorStop(0.6, "rgba(232,128,126,0.5)"); g.addColorStop(1, "rgba(236,150,146,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 96, 0, TAU); ctx.fill(); ctx.restore();
      for (let i = 0; i < 26; i++) {
        const x = cx + (R() - 0.5) * 120, y = cy + (R() - 0.5) * 44;
        ctx.strokeStyle = "rgba(214,92,100,0.22)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 18, y + 7 * (R() - 0.3)); ctx.stroke();
      }
    }
    { const g = ctx.createRadialGradient(X(0), Y(-0.15), 2, X(0), Y(-0.15), 56);
      g.addColorStop(0, "rgba(232,118,120,0.55)"); g.addColorStop(1, "rgba(232,128,126,0)");
      ctx.fillStyle = g; ctx.fillRect(X(0) - 60, Y(-0.15) - 60, 120, 120); }
    /* nose: little pink-brown dab with a small shade under it */
    ctx.fillStyle = "rgba(204,104,104,0.75)";
    ctx.beginPath(); ctx.ellipse(X(0.01), Y(-0.205), 15, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(170,86,88,0.6)"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(X(0.01), Y(-0.195), 14, 0.35, PI - 0.35); ctx.stroke();
    /* brows: thin, worried (inner ends higher) */
    ctx.strokeStyle = "rgba(34,40,50,0.92)"; ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(X(s * 0.17), Y(0.235));
      ctx.quadraticCurveTo(X(s * 0.40), Y(0.235), X(s * 0.67), Y(0.19));
      ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(34,40,50,0.5)";
      ctx.beginPath(); ctx.moveTo(X(s * 0.17), Y(0.22)); ctx.quadraticCurveTo(X(s * 0.4), Y(0.22), X(s * 0.64), Y(0.175)); ctx.stroke();
      ctx.strokeStyle = "rgba(34,40,50,0.92)";
    }
    /* tiny neutral mouth, corners slightly down */
    ctx.strokeStyle = "rgba(150,82,84,0.95)"; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(X(-0.085), Y(-0.545)); ctx.quadraticCurveTo(X(0), Y(-0.525), X(0.085), Y(-0.55)); ctx.stroke();
    ctx.strokeStyle = "rgba(236,150,146,0.5)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(X(-0.05), Y(-0.585)); ctx.quadraticCurveTo(X(0), Y(-0.575), X(0.05), Y(-0.588)); ctx.stroke();
    TX.face = mkTex(c, false);
    return TX.face;
  }

  /* ---- EYE (one eye, its own patch so it can blink): big olive-gold iris, white all round ---- */
  function texEye() {
    if (TX.eye) return TX.eye;
    const w = 256, h = 256, c = cv(w, h), ctx = c.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.52;
    /* sclera */
    const sg = ctx.createRadialGradient(cx, cy, 20, cx, cy, 112);
    sg.addColorStop(0, "#fffdf6"); sg.addColorStop(0.8, "#f6efe6"); sg.addColorStop(1, "#e4d4cc");
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(cx, cy, 108, 100, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 108, 100, 0, 0, TAU); ctx.clip();
    /* iris */
    const ig = ctx.createLinearGradient(0, cy - 66, 0, cy + 70);
    ig.addColorStop(0, "#3c3c1c"); ig.addColorStop(0.35, "#7e7e2c"); ig.addColorStop(0.75, "#b4a640"); ig.addColorStop(1, "#d2bc58");
    ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(cx, cy - 2, 62, 68, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#2a2a14"; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx, cy - 2, 62, 68, 0, 0, TAU); ctx.stroke();
    /* radial iris fibres */
    ctx.strokeStyle = "rgba(60,58,20,0.35)"; ctx.lineWidth = 2;
    for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 26, cy - 2 + Math.sin(a) * 28); ctx.lineTo(cx + Math.cos(a) * 58, cy - 2 + Math.sin(a) * 63); ctx.stroke(); }
    ctx.fillStyle = "#16160c"; ctx.beginPath(); ctx.ellipse(cx, cy - 2, 26, 29, 0, 0, TAU); ctx.fill();
    /* highlights */
    ctx.fillStyle = "rgba(255,255,255,0.97)"; ctx.beginPath(); ctx.arc(cx - 6, cy - 22, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(cx + 24, cy + 26, 6, 0, TAU); ctx.fill();
    /* upper lid shadow */
    const lg = ctx.createLinearGradient(0, cy - 100, 0, cy - 38);
    lg.addColorStop(0, "rgba(50,36,40,0.55)"); lg.addColorStop(1, "rgba(50,36,40,0)");
    ctx.fillStyle = lg; ctx.fillRect(0, cy - 100, w, 66);
    ctx.restore();
    /* lashes / lid line (thick on top, faint below) */
    ctx.strokeStyle = "#1c1c26"; ctx.lineCap = "round";
    ctx.lineWidth = 11; ctx.beginPath(); ctx.ellipse(cx, cy, 108, 100, 0, PI * 1.03, PI * 1.97); ctx.stroke();
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx - 106, cy - 12); ctx.lineTo(cx - 124, cy - 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 106, cy - 12); ctx.lineTo(cx + 124, cy - 22); ctx.stroke();
    ctx.strokeStyle = "rgba(170,100,100,0.55)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(cx, cy, 108, 100, 0, PI * 0.1, PI * 0.9); ctx.stroke();
    TX.eye = mkTex(c, false);
    return TX.eye;
  }

  /* ---- STAFF EYEBALL decal: teal-blue ring, orange iris, pupil + veins (spherical map) ---- */
  const SE = { half: 1.1 };
  function texStaffEye() {
    if (TX.seye) return TX.seye;
    const w = 512, h = 512, c = cv(w, h), ctx = c.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, ppr = w / (2 * SE.half);       // px per radian
    const R = rng(55);
    /* veins */
    ctx.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      const a = R() * TAU, r0 = 1.05 + R() * 0.05, r1 = 0.55 + R() * 0.25;
      ctx.strokeStyle = "rgba(206,70,70," + (0.35 + R() * 0.3) + ")"; ctx.lineWidth = 1.2 + R() * 1.6;
      ctx.beginPath();
      let x = cx + Math.cos(a) * r0 * ppr, y = cy + Math.sin(a) * r0 * ppr;
      ctx.moveTo(x, y);
      const steps = 6;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps, rr = mix(r0, r1, t), aa = a + Math.sin(t * 5 + i) * 0.12;
        ctx.lineTo(cx + Math.cos(aa) * rr * ppr, cy + Math.sin(aa) * rr * ppr);
      }
      ctx.stroke();
    }
    /* blue ring */
    const rb = 0.47 * ppr, ro = 0.31 * ppr, rp = 0.14 * ppr;
    ctx.fillStyle = "#2c7fb0"; ctx.beginPath(); ctx.arc(cx, cy, rb * 1.06, 0, TAU); ctx.fill();
    const bg = ctx.createRadialGradient(cx, cy, ro, cx, cy, rb);
    bg.addColorStop(0, "#5cc0e6"); bg.addColorStop(1, "#4aa6d6");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, rb, 0, TAU); ctx.fill();
    /* orange iris */
    const og = ctx.createRadialGradient(cx, cy, rp, cx, cy, ro);
    og.addColorStop(0, "#b85a14"); og.addColorStop(0.55, "#f09a2a"); og.addColorStop(1, "#e87c1c");
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, ro, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(120,50,10,0.45)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rp, cy + Math.sin(a) * rp); ctx.lineTo(cx + Math.cos(a) * ro * 0.96, cy + Math.sin(a) * ro * 0.96); ctx.stroke(); }
    /* pupil */
    ctx.fillStyle = "#17110d"; ctx.beginPath(); ctx.ellipse(cx, cy, rp, rp * 1.05, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.98)"; ctx.beginPath(); ctx.arc(cx - rp * 0.38, cy - rp * 0.42, rp * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(cx + rp * 0.45, cy + rp * 0.5, rp * 0.14, 0, TAU); ctx.fill();
    TX.seye = mkTex(c, false);
    return TX.seye;
  }

  /* ==========================================================================
     SECTION 4 — HEAD MAPPING (shared by skull, face decal, eyes)
     ========================================================================== */
  const HEAD = { rx: 0.182, ry: 0.176, rz: 0.178, cy: 0.185 };
  /* direction -> point on the (egg-shaped) head, optional radial offset */
  function headPt(dx, dy, dz, off) {
    let X = dx * HEAD.rx, Y = dy * HEAD.ry, Z = dz * HEAD.rz;
    if (dy < 0) {
      const k = Math.pow(clamp(-dy, 0, 1), 1.45);
      X *= 1 - 0.34 * k; Z *= 1 - 0.20 * k;
      Z += 0.010 * k;
    }
    if (off) { const l = Math.hypot(dx, dy, dz) || 1; X += dx / l * off; Y += dy / l * off; Z += dz / l * off; }
    return [X, Y, Z];
  }
  function headGeo() {
    const THREE = T();
    const g = new THREE.SphereGeometry(1, 44, 30);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const q = headPt(p.getX(i), p.getY(i), p.getZ(i), 0);
      p.setXYZ(i, q[0], q[1], q[2]);
    }
    g.computeVertexNormals();
    return g;
  }
  function faceDecalGeo(off) {
    const THREE = T();
    const sw = 28, sh = 22, pos = [], uv = [], idx = [];
    for (let j = 0; j <= sh; j++) {
      const fv = j / sh, el = FACE.el1 + (FACE.el0 - FACE.el1) * fv;
      for (let i = 0; i <= sw; i++) {
        const fu = i / sw, az = -FACE.az + 2 * FACE.az * fu;
        const q = headPt(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az), off);
        pos.push(q[0], q[1], q[2]); uv.push(fu, 1 - fv);
      }
    }
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      const a = j * (sw + 1) + i, b = a + sw + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  /* an eye patch with its own local origin on the head surface; mesh gets positioned there */
  function eyePatchGeo(R, wAng, hAng, seg, zoff) {
    const THREE = T();
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= seg; j++) {
      const fv = j / seg, e = (0.5 - fv) * hAng;
      for (let i = 0; i <= seg; i++) {
        const fu = i / seg, a = (fu - 0.5) * wAng;
        pos.push(R * Math.cos(e) * Math.sin(a), R * Math.sin(e), R * Math.cos(e) * Math.cos(a) - R + (zoff || 0));
        uv.push(fu, 1 - fv);
      }
    }
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i, b = a + seg + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  /* big spherical decal patch (staff eye iris / veins) */
  function sphPatchGeo(r, half, seg) {
    const THREE = T();
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= seg; j++) {
      const fv = j / seg, e = (0.5 - fv) * 2 * half;
      for (let i = 0; i <= seg; i++) {
        const fu = i / seg, a = (fu - 0.5) * 2 * half;
        const dx = Math.cos(e) * Math.sin(a), dy = Math.sin(e), dz = Math.cos(e) * Math.cos(a);
        pos.push(dx * r, dy * r, dz * r); uv.push(fu, 1 - fv);
      }
    }
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i, b = a + seg + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  /* ==========================================================================
     SECTION 5 — BRIM
     ========================================================================== */
  function brimGeo(Rmax, r0) {
    const THREE = T();
    const rows = 9, seg = 64;
    const pos = [], uv = [], idx = [];
    const per = (rows + 1) * (seg + 1);
    const thick = 0.016;
    function Redge(a) {   // ragged outline with a few torn notches
      let r = Rmax * (1 + 0.022 * Math.sin(a * 5 + 0.7) + 0.016 * Math.sin(a * 11 + 2.0));
      r -= 0.028 * Math.exp(-Math.pow((a - 1.15) / 0.07, 2));
      r -= 0.022 * Math.exp(-Math.pow((a + 2.2) / 0.06, 2));
      r -= 0.02 * Math.exp(-Math.pow((a - 2.7) / 0.05, 2));
      return r;
    }
    function height(r, a, t) {
      const droop = 0.029 - 0.041 * Math.cos(a) + 0.010 * Math.sin(a * 3 + 1.0);
      const lift = 0.014 * Math.sin(Math.min(1, t * 2.4) * PI * 0.6);
      return lift - droop * Math.pow(t, 1.9) + Math.sin(a * 6 + 0.4) * 0.007 * t * t;
    }
    for (let layer = 0; layer < 2; layer++) {
      const dyl = layer === 0 ? 0 : -thick;
      for (let j = 0; j <= rows; j++) {
        const t = j / rows;
        for (let i = 0; i <= seg; i++) {
          const a = -PI + (i / seg) * TAU;
          const re = Redge(a), r = r0 + (re - r0) * t;
          const x = Math.sin(a) * r, z = Math.cos(a) * r;
          pos.push(x, height(r, a, t) + dyl, z);
          uv.push(0.5 + x / (2 * Rmax * 1.06), 0.5 + z / (2 * Rmax * 1.06));
        }
      }
    }
    const I = (layer, j, i) => layer * per + j * (seg + 1) + i;
    for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) {
      const a = I(0, j, i), b = I(0, j + 1, i);
      idx.push(a, b, a + 1, a + 1, b, b + 1);                // top (faces up)
      const c = I(1, j, i), d = I(1, j + 1, i);
      idx.push(c, c + 1, d, c + 1, d + 1, d);                // bottom (faces down)
    }
    for (let i = 0; i < seg; i++) {                          // outer rim
      const t0 = I(0, rows, i), t1 = I(0, rows, i + 1), b0 = I(1, rows, i), b1 = I(1, rows, i + 1);
      idx.push(t0, b0, t1, t1, b0, b1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

    /* ==========================================================================
     SECTION 6 — THE BUILDER
     ========================================================================== */
  const C = {
    skin: 0xf4d0c4, skinIn: 0xe59a92, hair: 0x161d2c, hairHi: 0x34506e,
    beige: 0xa89a74, beigeD: 0x786d52, boot: 0x3a2a26, sole: 0x2b201c,
    leather: 0x8a5834, leatherD: 0x54351f, brass: 0xd8ac52, silver: 0xd2d9de, red: 0xe0402c,
    teal: 0x62998f, white: 0xf3efe2,
    khaki: 0x7c7440, khakiD: 0x5a542c, tan: 0xa89868, tanL: 0xbcae80,
    bookG: 0x507a3a, bookO: 0xef6c30,
    pack: 0x56833a, packD: 0x37602a, roll: 0x9dad96, skull: 0xdfe2cf, skullD: 0x18201c,
    orange: 0xf26a24, tanBtn: 0xe4c490
  };

  function ringSq(rx, rz, a, e) {
    let s = Math.sin(a), c = Math.cos(a);
    if (e) { const q = 2 / e; s = Math.sign(s) * Math.pow(Math.abs(s), q); c = Math.sign(c) * Math.pow(Math.abs(c), q); }
    return [rx * s, rz * c];
  }

  function buildWitch() {
    const THREE = T();
    const rig = K.rig({ name: "witch", height: 1.5 });
    const A = G.assets;
    const DS = THREE.DoubleSide;
    const mk = K.mk;

    /* ------------------------------------------------------------ materials */
    const vc = A.mat.toon(0xffffff, { noCache: true });
    vc.vertexColors = true; vc.needsUpdate = true;
    const vcSkin = A.mat.toon(0xffffff, { noCache: true, emissive: 0xf0b8a8, emissiveIntensity: 0.30 });
    vcSkin.vertexColors = true; vcSkin.needsUpdate = true;
    const vcD = A.mat.toon(0xffffff, { noCache: true, side: DS });
    vcD.vertexColors = true; vcD.needsUpdate = true;
    const mapM = (tex, side) => K.mat.mapToon(0xffffff, tex, { transparent: false, side: side });
    const mHat = mapM(texHat());
    const mBrim = mapM(texBrim());
    const mPoncho = mapM(texPoncho(), DS);
    const mCoat = mapM(texCoat(), DS);
    const mSleeve = mapM(texSleeve(), DS);
    const mScarf = mapM(texScarf(), DS);
    const mWood = mapM(texWood());
    rimScale(mScarf, 0.18); rimScale(mHat, 0.45); rimScale(mBrim, 0.45); rimScale(mPoncho, 0.6); rimScale(vcSkin, 0.35); rimScale(mCoat, 0.7); rimScale(mSleeve, 0.7);
    const mFace = K.mat.eye(texFace());
    const mEye = K.mat.eye(texEye());
    const mSEye = K.mat.eye(texStaffEye());

    /* ------------------------------------------------------------ helpers */
    function put(parent, geo, mat, o, keep) {
      const m = mk(geo, mat, o);
      if (keep) m.userData.keep = true;
      parent.add(m);
      return m;
    }
    function putVC(bone, bake, o, dbl) {
      return put(rig.bones[bone], bake.geo ? bake.geo() : bake, dbl ? vcD : vc, o, true);
    }
    const sph = prim("sph", 14, 10), sphLo = prim("sph", 9, 7), box = prim("box"), cone8 = prim("cone", 8);

    /* ------------------------------------------------------------ skeleton */
    const eyeAz = 0.43, eyeEl = -0.02;
    const eyeDir = [Math.cos(eyeEl) * Math.sin(eyeAz), Math.sin(eyeEl), Math.cos(eyeEl) * Math.cos(eyeAz)];
    const eyeP = headPt(eyeDir[0], eyeDir[1], eyeDir[2], 0.002);

    rig.bone("hips", null, [0, 0.62, 0]);
    rig.bone("chest", "hips", [0, 0.28, 0]);
    rig.bone("neck", "chest", [0, 0.18, 0]);
    rig.bone("head", "neck", [0, 0.04, 0]);
    rig.bone("hairBack", "head", [0, HEAD.cy, -0.10], null, { sway: 0.05, phase: 0.4 });
    rig.bone("hat", "head", [0, 0.305, -0.010], [-0.03, 0, 0.09]);
    /* hat spine (hat-local): bent cone leaning toward +X with a flicked tip */
    const HAT_PTS = [[0, 0, 0], [0.004, 0.07, -0.004], [0.040, 0.142, -0.016], [0.105, 0.215, -0.030], [0.190, 0.290, -0.048], [0.290, 0.355, -0.066], [0.395, 0.415, -0.082], [0.495, 0.470, -0.096], [0.580, 0.515, -0.102]];
    const HAT_R = [0.236, 0.232, 0.208, 0.172, 0.136, 0.100, 0.066, 0.032, 0.004];
    const HAT_N = 26, HAT_SPLIT = 17;
    const hatSecs = [];
    for (let i = 0; i < HAT_N; i++) {
      const t = i / (HAT_N - 1);
      hatSecs.push({ c: spline(HAT_PTS, t), rx: spline(HAT_R, t), rz: spline(HAT_R, t) * 0.97 });
    }
    rig.bone("hatTip", "hat", hatSecs[HAT_SPLIT].c, null, { sway: -0.03, phase: 1.7 });
    rig.bone("eyeL", "head", [eyeP[0], eyeP[1] + HEAD.cy, eyeP[2]], [-eyeEl, eyeAz, 0]);
    rig.bone("eyeR", "head", [-eyeP[0], eyeP[1] + HEAD.cy, eyeP[2]], [-eyeEl, -eyeAz, 0]);
    rig.bones.eyeL.rotation.order = "YXZ"; rig.bones.eyeR.rotation.order = "YXZ";
    rig.bones.eyeL.rotation.set(-eyeEl, eyeAz, 0); rig.bones.eyeR.rotation.set(-eyeEl, -eyeAz, 0);

    rig.bone("armL.sh", "chest", [0.19, 0.13, 0], [0, 0, 0.30]);
    rig.bone("armL.el", "armL.sh", [0, -0.25, 0], [-0.20, 0, 0.06]);
    rig.bone("armL.hand", "armL.el", [0, -0.24, 0]);
    rig.bone("armR.sh", "chest", [-0.19, 0.13, 0], [0, 0, -0.13]);
    rig.bone("armR.el", "armR.sh", [0, -0.25, 0], [-0.14, 0, 0]);
    rig.bone("armR.hand", "armR.el", [0, -0.24, 0]);
    for (const s of ["L", "R"]) {
      const sx = s === "L" ? 1 : -1;
      rig.bone("leg" + s + ".hip", "hips", [sx * 0.08, -0.04, 0]);
      rig.bone("leg" + s + ".knee", "leg" + s + ".hip", [0, -0.235, 0]);
      rig.bone("leg" + s + ".foot", "leg" + s + ".knee", [0, -0.245, 0]);
    }
    rig.bone("scarfF", "neck", [0.085, -0.045, 0.19], [0.18, 0.0, 0.10], { sway: 0.07, phase: 2.2 });
    rig.bone("scarfB", "neck", [-0.03, -0.045, -0.205], [-0.15, PI, 0], { sway: 0.06, phase: 0.9 });
    rig.bone("pack", "chest", [-0.03, 0.02, -0.31], null, { sway: 0.012, phase: 2.9 });
    rig.bone("skull", "pack", [-0.31, 0.30, 0.02], [0.0, -2.0, 0.0], { sway: 0.03, phase: 1.3 });
    rig.bones.skull.scale.setScalar(1.4);
    rig.bone("satchel", "chest", [0.285, -0.145, 0.185], [0.0, 0.18, -0.02], { sway: 0.03, phase: 3.3 });
    rig.bone("propR", "armR.hand", [0, -0.11, 0.01]);
    rig.bone("propL", "armL.hand", [0, -0.11, 0.015]);
    rig.bone("staff", "propL", [0, 0, 0]);
    const STAFF_EYE_Y = 0.62;
    rig.bone("staffEye", "staff", [0, STAFF_EYE_Y, 0.0]);
    rig.bone("charm", "staff", [0.155, 0.545, 0.045], [0, 0, 0], { sway: 0.10, phase: 3.1 });
    /* the staff stands upright in the world (leaning slightly outward) at rest */
    rig.root.updateMatrixWorld(true);
    {
      const q = new THREE.Quaternion();
      rig.bones.propL.getWorldQuaternion(q);
      const want = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, 0, -0.10));
      rig.bones.staff.quaternion.copy(q.invert().multiply(want));
    }

    /* ------------------------------------------------------------ HEAD + HAIR */
    {
      const b = new Bake();
      const skin = (x, y, z) => {
        const yy = y - HEAD.cy;
        const t = clamp(-yy / 0.17, 0, 1);
        return [lin(C.skin)[0] * (1 - 0.04 * t), lin(C.skin)[1] * (1 - 0.06 * t), lin(C.skin)[2] * (1 - 0.07 * t)];
      };
      b.add(headGeo(), skin, { p: [0, HEAD.cy, 0] });
      for (const s of [-1, 1]) {
        b.add(prim("sph", 12, 9), C.skin, { p: [s * 0.176, HEAD.cy - 0.004, -0.012], s: [0.026, 0.064, 0.047], r: [0, s * 0.45, s * 0.10] });
        b.add(prim("sph", 12, 9), C.skinIn, { p: [s * 0.1865, HEAD.cy - 0.002, -0.004], s: [0.012, 0.043, 0.030], r: [0, s * 0.45, s * 0.10] });
      }
      b.add(prim("cyl", 0.058, 0.066, 0.12, 12), C.skin, { p: [0, -0.02, -0.005] });
      put(rig.bones.head, b.geo(), vcSkin, { o: 0.03 }, true);
      /* painted face decal + the two big eyes (own bones so they can blink) */
      const fm = new THREE.Mesh(faceDecalGeo(0.0025), mFace);
      fm.position.y = HEAD.cy; fm.renderOrder = 2; fm.userData.noOutline = true; fm.userData.keep = true;
      fm.castShadow = false; fm.receiveShadow = false;
      rig.bones.head.add(fm);
      const eg = eyePatchGeo(HEAD.rx * 1.004, 0.56, 0.52, 10, 0.0015);
      for (const s of ["eyeL", "eyeR"]) {
        const em = new THREE.Mesh(eg, mEye);
        em.renderOrder = 3; em.userData.noOutline = true; em.userData.keep = true;
        em.castShadow = false; em.receiveShadow = false;
        rig.bones[s].add(em);
      }
    }
    /* hair: shell with blunt bangs + temple locks (cap on head), bob skirt on hairBack */
    {
      const HX = 0.198, HZ = 0.194, HY = 0.190;
      const ybot = (a) => {                         // a = |angle from front|
        let y;
        if (a < 1.02) {                              // bangs: blunt, uneven strands with a small parting
          const strand = Math.floor(a * 4.6 + 0.3);
          y = 0.052 + 0.014 * hash(strand * 3.7 + 1.1) + 0.003 * Math.sin(a * 21);
          y += 0.06 * Math.exp(-Math.pow((a - 0.07) / 0.045, 2));   // little parting gap
        } else if (a < 1.22) y = mix(0.07, 0.115, sstep(1.02, 1.22, a));
        else if (a < 1.92) y = 0.115;                // above the ears
        else if (a < 2.35) y = mix(0.115, -0.265, sstep(1.92, 2.35, a));
        else y = -0.265 - 0.012 * Math.abs(Math.sin(a * 9.0)) * 1.0;
        return y;
      };
      const hairCol = (y, a, k) => {
        const hl = Math.exp(-Math.pow((y - 0.085) / 0.04, 2)) * (0.45 + 0.55 * Math.cos(a - 0.5));
        const n = 0.85 + 0.30 * hash(k * 1.37);
        const dark = y < -0.1 ? 0.8 : 1.0;
        const c0 = lin(C.hair), c1 = lin(C.hairHi);
        const t = clamp(hl * 0.85, 0, 1);
        return [mix(c0[0], c1[0], t) * n * dark, mix(c0[1], c1[1], t) * n * dark, mix(c0[2], c1[2], t) * n * dark];
      };
      /* cap grid */
      const KC = 72, RC = 14;
      const cp = [], ci = [], cc = [], cu = [];
      for (let k = 0; k <= KC; k++) {
        const a = -PI + (k / KC) * TAU, aa = Math.abs(a);
        const yb = ybot(aa);
        const phiB = yb >= 0 ? Math.acos(clamp(yb / HY, -1, 1)) : PI / 2;
        for (let j = 0; j <= RC; j++) {
          const phi = (j / RC) * phiB;
          const sp = Math.sin(phi);
          const ridge = 1 + 0.010 * Math.sin(a * 34 + j * 0.3);
          const hz = Math.cos(a) < 0 ? HZ * 1.07 : HZ;
          const y = HY * Math.cos(phi);
          cp.push(HX * sp * Math.sin(a) * ridge, y, hz * sp * Math.cos(a) * ridge - 0.006);
          const l = hairCol(y, a, k); cc.push(l[0], l[1], l[2]);
          cu.push(k / KC, j / RC);
        }
      }
      for (let k = 0; k < KC; k++) for (let j = 0; j < RC; j++) {
        const a = k * (RC + 1) + j, b2 = a + RC + 1;
        ci.push(a, a + 1, b2, a + 1, b2 + 1, b2);
      }
      const capG = new THREE.BufferGeometry();
      capG.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3));
      capG.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
      capG.setAttribute("uv", new THREE.Float32BufferAttribute(cu, 2));
      capG.setIndex(ci);
      capG.computeVertexNormals();
      /* make sure the normals point outward (test one) */
      {
        const n = capG.attributes.normal, p = capG.attributes.position;
        const i0 = (Math.floor(KC / 2)) * (RC + 1) + 4;
        if (n.getX(i0) * p.getX(i0) + n.getY(i0) * (p.getY(i0)) + n.getZ(i0) * p.getZ(i0) < 0) {
          const ix = capG.index.array;
          for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
          capG.computeVertexNormals();
        }
      }
      const hb = new Bake();
      hb.add(capG, null, { p: [0, HEAD.cy, 0] });
      /* temple locks in front of the ears + a couple of loose strands */
      for (const s of [-1, 1]) {
        const lockC = (x, y, z) => hairCol(y - HEAD.cy, 1.2, y * 40 + s);
        hb.add(flap(0.036, 0.15, 0.012, 0.004, 2, 4, -0.2, 5 + s), lockC, { p: [s * 0.168, HEAD.cy + 0.09, 0.062], r: [0.1, s * 1.18, s * 0.05] });
        hb.add(flap(0.026, 0.11, 0.010, 0.003, 2, 3, -0.1, 8 + s), lockC, { p: [s * 0.158, HEAD.cy + 0.07, 0.092], r: [0.08, s * 1.0, s * -0.04] });
      }
      putVC("head", hb, { o: 0.035 }, true);
      /* bob skirt */
      const KS = 52, RS = 8, aS = 1.9;
      const sp_ = [], si = [], sc = [], su = [];
      for (let k = 0; k <= KS; k++) {
        const a = aS + (k / KS) * (TAU - 2 * aS), aa = a > PI ? TAU - a : a;
        const yb = Math.min(0, ybot(aa));
        for (let j = 0; j <= RS; j++) {
          const f = j / RS, y = yb * f;
          const flare = Math.pow(-y / 0.28, 1.1);
          const back = Math.cos(a) < 0 ? 1.0 : 0.0;
          const hx = HX + 0.030 * flare, hz = HZ * 1.05 + 0.032 * flare * (0.6 + 0.4 * back);
          const ridge = 1 + 0.012 * Math.sin(a * 30 + j * 0.4);
          sp_.push(hx * Math.sin(a) * ridge, y, hz * Math.cos(a) * ridge - 0.006);
          const l = hairCol(y, a, k + 3); sc.push(l[0], l[1], l[2]);
          su.push(k / KS, f);
        }
      }
      for (let k = 0; k < KS; k++) for (let j = 0; j < RS; j++) {
        const a = k * (RS + 1) + j, b2 = a + RS + 1;
        si.push(a, b2, a + 1, a + 1, b2, b2 + 1);
      }
      const skG = new THREE.BufferGeometry();
      skG.setAttribute("position", new THREE.Float32BufferAttribute(sp_, 3));
      skG.setAttribute("color", new THREE.Float32BufferAttribute(sc, 3));
      skG.setAttribute("uv", new THREE.Float32BufferAttribute(su, 2));
      skG.setIndex(si);
      skG.computeVertexNormals();
      {
        const n = skG.attributes.normal, p = skG.attributes.position;
        const i0 = Math.floor(KS / 2) * (RS + 1) + 4;
        if (n.getX(i0) * p.getX(i0) + n.getZ(i0) * p.getZ(i0) < 0) {
          const ix = skG.index.array;
          for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
          skG.computeVertexNormals();
        }
      }
      const sb = new Bake();
      sb.add(skG, null, { p: [0, 0, 0.10] });          // head-centre frame -> hairBack frame
      putVC("hairBack", sb, { o: 0.03 }, true);
      /* shift: hairBack origin is at (0, cy, -0.10) in head frame, geometry y is head-centre relative -> add cy offset via bone y */
      rig.bones.hairBack.children[rig.bones.hairBack.children.length - 1].position.y = 0;
    }

    /* ------------------------------------------------------------ HAT */
    {
      const HATP = rig.bones.hat, TIPP = rig.bones.hatTip;
      const hatFn = (a, t) => {
        const dent = -0.11 * Math.exp(-Math.pow((a - 2.3) / 0.55, 2)) * sstep(0.18, 0.5, t) * (1 - sstep(0.72, 0.95, t));
        return 1 + dent + 0.035 * Math.sin(a * 3 + t * 9) * (0.3 + t) + 0.02 * Math.sin(a * 7 + t * 17) * t;
      };
      const full = loft(hatSecs, 36, { fn: hatFn, v0: 0, v1: 1 });
      const lower = loftSlice(full, 0, HAT_SPLIT);
      const upper = loftSlice(full, HAT_SPLIT, HAT_N - 1, hatSecs[HAT_SPLIT].c);
      put(HATP, lower, mHat, { o: 0.035, shadow: false });
      put(TIPP, upper, mHat, { o: 0.035, shadow: false });
      put(HATP, brimGeo(0.48, 0.17), mBrim, { o: 0.03 }).castShadow = false;
      /* tan button on the orange band + a little steel rivet */
      const sg = full.userData.seg + 1, pos = full.attributes.position, nor = full.attributes.normal;
      function surf(i, a) {
        const k = Math.round(((a + PI) / TAU) * full.userData.seg), j = i * sg + k;
        return [[pos.getX(j), pos.getY(j), pos.getZ(j)], [nor.getX(j), nor.getY(j), nor.getZ(j)]];
      }
      const bi = 6;       // section nearest the first orange band (v ~ 0.25)
      const sf = surf(bi, 0.10);
      const bb = new Bake();
      bb.add(sph, C.tanBtn, { p: [sf[0][0] + sf[1][0] * 0.014, sf[0][1] + sf[1][1] * 0.014, sf[0][2] + sf[1][2] * 0.014], s: [0.040, 0.034, 0.036] });
      bb.add(prim("tor", 0.036, 0.008, 6, 14), C.leatherD, { p: [sf[0][0] + sf[1][0] * 0.004, sf[0][1] + sf[1][1] * 0.004, sf[0][2] + sf[1][2] * 0.004], r: [PI / 2 - 0.5, 0.1, 0] });
      const sf2 = surf(5, 0.85);
      bb.add(sph, C.silver, { p: [sf2[0][0] + sf2[1][0] * 0.008, sf2[0][1] + sf2[1][1] * 0.008, sf2[0][2] + sf2[1][2] * 0.008], s: 0.014 });
      putVC("hat", bb, { o: 0.025 });
    }

    /* ------------------------------------------------------------ SCARF (cream cowl + flaps) */
    {
      const SC = [[-0.07, 0.255, 0.215], [-0.035, 0.250, 0.210], [0.01, 0.232, 0.198], [0.045, 0.205, 0.178], [0.07, 0.172, 0.150], [0.082, 0.142, 0.125], [0.0825, 0.118, 0.105], [0.0835, 0.105, 0.095]];
      const secs = SC.map((s) => ({ c: [0, s[0], 0], rx: s[1], rz: s[2] }));
      const n = secs.length;
      const g = loft(secs, 40, {
        sq: 2.2,
        fn: (a, t, i) => {
          const v = i / (n - 1);
          let m = 1 + 0.050 * Math.sin(a * 3 + 0.5 + i * 0.6) + 0.032 * Math.sin(a * 6 + i) + 0.018 * Math.sin(a * 11 + i * 2);
          m += 0.16 * Math.exp(-Math.pow((a - 0.95) / 0.55, 2)) * (1 - v) * 0.9;      // big lobe over the +X chest
          return m;
        },
        dy: (a, i, k, t) => {
          const front = Math.max(0, Math.cos(a));
          let d = -0.052 * Math.pow(front, 1.4) * Math.pow(t, 1.6);
          d -= 0.085 * Math.exp(-Math.pow((a - 0.85) / 0.45, 2)) * Math.pow(1 - t, 2.5);   // hanging lobe
          d -= 0.03 * Math.exp(-Math.pow((a + 0.7) / 0.6, 2)) * Math.pow(1 - t, 2);
          return d;
        }
      });
      put(rig.bones.neck, g, mScarf, { o: 0.03 });
      /* swaying flaps of the cowl */
      put(rig.bones.scarfF, flap(0.13, 0.15, 0.03, 0.012, 5, 5, 0.25, 4), mScarf, { o: 0.025 });
      put(rig.bones.scarfB, flap(0.14, 0.12, 0.028, 0.010, 5, 4, 0.2, 6), mScarf, { o: 0.025 });
    }

    /* ------------------------------------------------------------ PONCHO (+ hinged frayed tails) */
    const PON = [[0.205, 0.125, 0.110], [0.175, 0.178, 0.150], [0.125, 0.245, 0.190], [0.055, 0.285, 0.220], [-0.015, 0.310, 0.240], [-0.080, 0.330, 0.260]];
    const PON_SQ = 2.5;
    const hinges = [];
    {
      const secs = PON.map((s) => ({ c: [0, s[0], 0], rx: s[1], rz: s[2] }));
      const shellFn = (a, t) => 1 + 0.020 * Math.sin(a * 5 + 0.8) * t + 0.016 * Math.sin(a * 9 + 2.0) * t + 0.012 * Math.sin(a * 3) * t;
      const shell = loft(secs, 44, { sq: PON_SQ, fn: shellFn, v0: 0, v1: 0.86 });
      put(rig.bones.chest, shell, mPoncho, { o: 0.035 });
      /* shoulder yoke fold at the collar */
      /* hinged tails */
      const hem = PON[PON.length - 1];
      const arcs = [[-PI, -PI / 2, 0.115], [-PI / 2, 0, 0.060], [0, PI / 2, 0.075], [PI / 2, PI, 0.110]];
      arcs.forEach((arc, idx) => {
        const am = (arc[0] + arc[1]) / 2, L = arc[2];
        const pp = ringSq(hem[1], hem[2], am, PON_SQ);
        const piv = [pp[0], hem[0], pp[1]];
        const secs2 = [
          { c: [0, hem[0], 0], rx: hem[1], rz: hem[2], v: 0.86 },
          { c: [0, hem[0] - L * 0.45, 0], rx: hem[1] * 1.025, rz: hem[2] * 1.025, v: 0.93 },
          { c: [0, hem[0] - L, 0], rx: hem[1] * 1.055, rz: hem[2] * 1.055, v: 1.0 }
        ];
        const g = loft(secs2, 14, {
          sq: PON_SQ, a0: arc[0], a1: arc[1], u0: (arc[0] + PI) / TAU, u1: (arc[1] + PI) / TAU,
          fn: (a, t, i) => 1 + 0.02 * Math.sin(a * 11 + idx) * i,
          dy: (a, i) => (i === 2 ? -0.05 * (0.15 + 0.85 * Math.abs(Math.sin(a * 17 + idx * 2.1)) * Math.abs(Math.sin(a * 7 + 1.3))) : 0)
        });
        const m4 = new THREE.Matrix4().compose(new THREE.Vector3(piv[0], piv[1], piv[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, am + PI, 0)), new THREE.Vector3(1, 1, 1));
        g.applyMatrix4(m4.clone().invert());
        const bn = rig.bone("cloakP" + idx, "chest", piv, [0, am + PI, 0], { sway: 0.04 + idx * 0.004, phase: idx * 1.3 });
        const hg = new THREE.Group();
        hg.name = "cloakHinge" + idx;
        bn.add(hg);
        put(hg, g, mPoncho, { o: 0.03 });
        hinges.push(hg);
      });
    }

    /* ------------------------------------------------------------ COAT (open periwinkle duster + hinged tails) */
    const COAT = [[0.28, 0.222, 0.180], [0.16, 0.238, 0.192], [-0.02, 0.262, 0.212], [-0.25, 0.300, 0.240]];
    const COAT_SQ = 2.3, CA0 = 0.5, CA1 = TAU - 0.5;
    {
      const secs = COAT.map((s) => ({ c: [0, s[0], 0], rx: s[1], rz: s[2] }));
      const fold = (a, t) => 1 + 0.050 * Math.sin(a * 6 + 0.3) * (0.4 + t) + 0.030 * Math.sin(a * 11 + 1.2) * t;
      const g = loft(secs, 40, { sq: COAT_SQ, a0: CA0, a1: CA1, fn: fold, v0: 0, v1: 0.5, u0: 0, u1: 1 });
      put(rig.bones.hips, g, mCoat, { o: 0.035 });
      const hem = COAT[COAT.length - 1], L = 0.30;
      const edges = [CA0, 1.9, PI, 4.38, CA1];
      for (let idx = 0; idx < 4; idx++) {
        const a0 = edges[idx], a1 = edges[idx + 1], am = (a0 + a1) / 2;
        const pp = ringSq(hem[1], hem[2], am, COAT_SQ);
        const piv = [pp[0], hem[0], pp[1]];
        const secs2 = [
          { c: [0, hem[0], 0], rx: hem[1], rz: hem[2], v: 0.5 },
          { c: [0, hem[0] - L * 0.4, 0], rx: hem[1] * 1.075, rz: hem[2] * 1.075, v: 0.72 },
          { c: [0, hem[0] - L * 0.8, 0], rx: hem[1] * 1.15, rz: hem[2] * 1.15, v: 0.9 },
          { c: [0, hem[0] - L, 0], rx: hem[1] * 1.18, rz: hem[2] * 1.18, v: 1.0 }
        ];
        const tg = loft(secs2, 14, {
          sq: COAT_SQ, a0: a0, a1: a1, u0: (a0 - CA0) / (CA1 - CA0), u1: (a1 - CA0) / (CA1 - CA0),
          fn: (a, t, i) => fold(a, 0.6 + 0.4 * (i / 3)) * (1 + 0.03 * Math.sin(a * 8 + idx * 2) * i),
          dy: (a, i) => (i === 3 ? -0.035 * (0.1 + 0.9 * Math.abs(Math.sin(a * 6.5 + idx))) : 0)
        });
        const m4 = new THREE.Matrix4().compose(new THREE.Vector3(piv[0], piv[1], piv[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, am + PI, 0)), new THREE.Vector3(1, 1, 1));
        tg.applyMatrix4(m4.clone().invert());
        const bn = rig.bone("cloakC" + idx, "hips", piv, [0, am + PI, 0], { sway: 0.03 + idx * 0.004, phase: idx * 1.1 + 0.5 });
        const hg = new THREE.Group();
        hg.name = "cloakHinge" + (4 + idx);
        bn.add(hg);
        put(hg, tg, mCoat, { o: 0.035 });
        hinges.push(hg);
      }
    }

    /* ------------------------------------------------------------ TORSO under the poncho (teal shirt, white cloth, belts) */
    {
      const b = new Bake();
      b.add(loft([{ c: [0, -0.22, 0], rx: 0.17, rz: 0.14 }, { c: [0, -0.12, 0], rx: 0.165, rz: 0.135 }, { c: [0, 0.02, 0], rx: 0.16, rz: 0.13 }, { c: [0, 0.14, 0], rx: 0.135, rz: 0.11 }], 20, { sq: 2.2, fn: (a, t) => 1 + 0.05 * Math.sin(a * 5 + t * 6) }),
        (x, y) => mix3(lin(C.teal), lin(0x4f8a82), clamp((0.0 - y) / 0.25, 0, 1)), {});
      putVC("chest", b, { o: 0.02 });
    }
    {
      /* hips: shirt hem, bunched white cloth, belts, hanging tab, pouch */
      const b = new Bake();
      const wcol = (x, y, z) => mix3(lin(C.white), lin(0xb7c4b8), clamp(0.5 - (y + 0.01) / 0.2, 0, 1) * 0.8);
      /* white cloth bunched under the belts */
      b.add(sph, wcol, { p: [0.015, 0.0, 0.135], s: [0.115, 0.095, 0.052], r: [0.1, 0.05, 0.1] });
      b.add(sph, wcol, { p: [0.065, -0.035, 0.125], s: [0.055, 0.075, 0.045], r: [0.2, 0.3, -0.2] });
      b.add(sph, wcol, { p: [-0.04, -0.045, 0.128], s: [0.05, 0.07, 0.04], r: [0.1, -0.3, 0.15] });
      b.add(flap(0.12, 0.15, 0.025, 0.018, 4, 4, 0.1, 9), wcol, { p: [0.02, 0.0, 0.158], r: [-0.1, 0, 0] });
      /* belts: two layered, the lower one slung at an angle */
      const leather = (x, y, z, i) => mix3(lin(C.leather), lin(C.leatherD), clamp(0.5 * hash(Math.floor(x * 40) + Math.floor(y * 55)) , 0, 0.6));
      const b1 = loft([{ c: [0, 0.088, 0], rx: 0.195, rz: 0.165 }, { c: [0, 0.052, 0], rx: 0.196, rz: 0.166 }], 36, { sq: 2.3 });
      b.add(b1, C.leather, { k: 1.0 });
      const b2 = loft([{ c: [0, 0.040, 0], rx: 0.200, rz: 0.168 }, { c: [0, 0.004, 0], rx: 0.201, rz: 0.169 }], 36, { sq: 2.3 });
      b.add(b2, C.leatherD, { r: [0.0, 0, 0.16], p: [0, 0, 0], k: 1.0 });
      /* studs */
      for (let i = 0; i < 16; i++) {
        const a = -0.8 + i * 0.1, r = ringSq(0.2, 0.17, a, 2.3);
        b.add(sphLo, C.brass, { p: [r[0], 0.071, r[1] + 0.0], s: 0.0105 });
      }
      for (let i = 0; i < 10; i++) {
        const a = -0.55 + i * 0.12, r = ringSq(0.205, 0.172, a, 2.3);
        b.add(sphLo, C.brass, { p: [r[0], 0.022 + r[0] * 0.16, r[1] + 0.0], s: 0.0095 });
      }
      b.add(box, C.brass, { p: [0.0, 0.072, 0.168], s: [0.050, 0.044, 0.014] });
      b.add(box, C.leatherD, { p: [0.0, 0.072, 0.176], s: [0.026, 0.024, 0.008] });
      /* hanging leather tab (viewer-left) with a red stripe */
      b.add(box, C.leatherD, { p: [-0.115, -0.065, 0.158], s: [0.058, 0.17, 0.012], r: [0.1, -0.2, 0.04] });
      b.add(box, C.red, { p: [-0.145, -0.04, 0.164], s: [0.007, 0.075, 0.006], r: [0.1, -0.2, 0.04] });
      /* back pouch + belt knot for the back view */
      b.add(box, C.leather, { p: [0.085, -0.02, -0.168], s: [0.075, 0.085, 0.045], r: [0, 0.2, 0] });
      b.add(box, C.leatherD, { p: [0.085, 0.015, -0.168], s: [0.079, 0.03, 0.049], r: [0, 0.2, 0] });
      b.add(sphLo, C.brass, { p: [0.085, 0.0, -0.194], s: 0.011 });
      putVC("hips", b, { o: 0.022 });
    }

    /* ------------------------------------------------------------ LEGS: wide khaki trousers + sturdy boots */
    for (const s of ["L", "R"]) {
      const sx = s === "L" ? 1 : -1;
      const trCol = (i, k, a) => { const t = hash(k * 0.73 + i * 5.1 + sx); return mix3(lin(C.beige), lin(C.beigeD), 0.35 * t); };
      const thigh = loft([{ c: [0, 0.09, 0], rx: 0.094, rz: 0.094 }, { c: [0, -0.06, 0], rx: 0.096, rz: 0.096 }, { c: [0, -0.24, 0], rx: 0.104, rz: 0.104 }], 18,
        { fn: (a, t) => 1 + 0.05 * Math.sin(a * 3 + t * 4 + sx), col: trCol });
      putVC("leg" + s + ".hip", thigh, { o: 0.028 });
      const shin = loft([{ c: [0, 0.01, 0], rx: 0.104, rz: 0.104 }, { c: [0, -0.12, 0], rx: 0.108, rz: 0.106 }, { c: [0, -0.22, 0], rx: 0.120, rz: 0.116 }, { c: [0, -0.255, 0], rx: 0.114, rz: 0.112 }], 18,
        { fn: (a, t) => 1 + 0.05 * Math.sin(a * 4 + t * 3 + sx * 2), col: trCol });
      putVC("leg" + s + ".knee", shin, { o: 0.028 });
      /* boot */
      const b = new Bake();
      const bootC = (x, y, z) => mix3(lin(C.boot), lin(0x6a5144), clamp((y + 0.02) / 0.1, 0, 1) * 0.0 + 0.25 * clamp(z * 4, 0, 1));
      b.add(loft([{ c: [0, 0.075, 0], rx: 0.088, rz: 0.084 }, { c: [0, 0.01, 0], rx: 0.080, rz: 0.080 }, { c: [0, -0.04, 0], rx: 0.078, rz: 0.078 }], 14, {}), bootC, {});
      const foot = loft([
        { c: [0, -0.058, -0.075], rx: 0.058, rz: 0.040 },
        { c: [0, -0.060, -0.02], rx: 0.070, rz: 0.046 },
        { c: [0, -0.064, 0.05], rx: 0.074, rz: 0.043 },
        { c: [0, -0.068, 0.115], rx: 0.062, rz: 0.034 },
        { c: [0, -0.072, 0.158], rx: 0.036, rz: 0.020 }
      ], 14, { ref: [0, 1, 0] });
      b.add(foot, bootC, {});
      b.add(box, C.sole, { p: [0, -0.098, 0.04], s: [0.150, 0.026, 0.265] });
      b.add(box, C.sole, { p: [0, -0.085, -0.052], s: [0.130, 0.05, 0.065] });
      b.add(sph, C.sole, { p: [0, -0.098, 0.172], s: [0.062, 0.016, 0.040] });
      for (let i = 0; i < 4; i++) b.add(sphLo, C.brass, { p: [0.0, 0.005 + i * 0.0, 0.0], s: 0.0 });
      putVC("leg" + s + ".foot", b, { o: 0.028 });
    }

    /* ------------------------------------------------------------ ARMS: sleeves, huge rolled cuffs, hands */
    for (const s of ["L", "R"]) {
      const sx = s === "L" ? 1 : -1;
      const up = loft([{ c: [0, 0.05, 0], rx: 0.076, rz: 0.074 }, { c: [0, -0.10, 0], rx: 0.071, rz: 0.069 }, { c: [0, -0.255, 0], rx: 0.069, rz: 0.067 }], 16,
        { v0: 0.0, v1: 0.45, fn: (a, t) => 1 + 0.03 * Math.sin(a * 3 + sx + t * 5) });
      put(rig.bones["arm" + s + ".sh"], up, mSleeve, { o: 0.032 });
      const cuff = loft([
        { c: [0, 0.025, 0], rx: 0.069, rz: 0.067, v: 0.43 },
        { c: [0, -0.09, 0], rx: 0.068, rz: 0.066, v: 0.50 },
        { c: [0, -0.155, 0], rx: 0.084, rz: 0.082, v: 0.53 },
        { c: [0, -0.190, 0], rx: 0.112, rz: 0.108, v: 0.545 },
        { c: [0, -0.203, 0], rx: 0.126, rz: 0.122, v: 0.56 },
        { c: [0, -0.245, 0], rx: 0.129, rz: 0.125, v: 0.68 },
        { c: [0, -0.285, 0], rx: 0.127, rz: 0.123, v: 0.80 },
        { c: [0, -0.302, 0], rx: 0.112, rz: 0.108, v: 0.88 },
        { c: [0, -0.310, 0], rx: 0.088, rz: 0.084, v: 0.94 },
        { c: [0, -0.312, 0], rx: 0.070, rz: 0.066, v: 1.0 }
      ], 24, { fn: (a, t, i) => 1 + (i > 3 ? 0.03 * Math.sin(a * 5 + sx * 1.3 + i) + 0.015 * Math.sin(a * 9) : 0.02 * Math.sin(a * 3 + sx)) });
      put(rig.bones["arm" + s + ".el"], cuff, mSleeve, { o: 0.04 });
      /* hand: pale fist + teal inner sleeve peeking out of the cuff */
      const b = new Bake();
      b.add(loft([{ c: [0, 0.01, 0], rx: 0.052, rz: 0.050 }, { c: [0, -0.04, 0], rx: 0.050, rz: 0.048 }, { c: [0, -0.075, 0], rx: 0.048, rz: 0.046 }], 12, {}), (x, y, z) => mix3(lin(0x65a090), lin(0x47786c), clamp(-y / 0.08, 0, 1) * 0.5), {});
      const skinF = lin(C.skin), skinS = lin(0xe9b4a6);
      b.add(sph, skinF, { p: [0, -0.115, 0.004], s: [0.040, 0.046, 0.038] });
      for (let i = 0; i < 4; i++) b.add(sph, skinF, { p: [-0.026 + i * 0.0175, -0.148, 0.024], s: [0.0125, 0.0165, 0.016] });
      b.add(sph, skinS, { p: [sx * -0.034, -0.12, 0.020], s: [0.012, 0.027, 0.014], r: [0, 0, sx * 0.3] });
      b.add(sph, skinF, { p: [sx * 0.036, -0.11, 0.0], s: [0.012, 0.026, 0.020] });
      putVC("arm" + s + ".hand", b, { o: 0.022 });
    }

    /* ------------------------------------------------------------ STRAP across the chest + buckle + ribbons */
    {
      const b = new Bake();
      const surfZ = (x, y) => {                    // poncho surface z for a chest-local (x, y)
        let rx = 0.3, rz = 0.22;
        for (let i = 0; i < PON.length - 1; i++) if (y <= PON[i][0] && y >= PON[i + 1][0]) { const f = (PON[i][0] - y) / (PON[i][0] - PON[i + 1][0]); rx = mix(PON[i][1], PON[i + 1][1], f); rz = mix(PON[i][2], PON[i + 1][2], f); }
        if (y < PON[PON.length - 1][0]) { rx = PON[PON.length - 1][1]; rz = PON[PON.length - 1][2]; }
        const q = clamp(Math.abs(x) / rx, 0, 0.995);
        return rz * Math.pow(1 - Math.pow(q, PON_SQ), 1 / PON_SQ);
      };
      const path = [[-0.165, 0.145], [-0.100, 0.100], [-0.030, 0.045], [0.040, -0.012], [0.110, -0.080], [0.185, -0.140], [0.250, -0.200], [0.283, -0.232]];
      const secs = path.map((p) => ({ c: [p[0], p[1], surfZ(p[0], p[1]) + 0.014], rx: 0.020, rz: 0.0075 }));
      const strap = loft(secs, 8, { ref: [0, 0, 1], sq: 3 });
      b.add(strap, (x, y, z) => mix3(lin(C.leather), lin(C.leatherD), 0.5 * hash(Math.floor(y * 90))), {});
      /* silver buckle ring near the shoulder */
      b.add(prim("tor", 0.017, 0.0055, 6, 12), C.silver, { p: [-0.062, 0.070, surfZ(-0.062, 0.07) + 0.024], r: [0.2, 0.0, 0.3], s: [1.0, 0.8, 1] });
      b.add(box, C.leatherD, { p: [-0.062, 0.070, surfZ(-0.062, 0.07) + 0.020], s: [0.02, 0.012, 0.006], r: [0, 0, 0.5] });
      /* orange ribbon tails knotted near the patch */
      b.add(sph, C.orange, { p: [-0.010, 0.030, surfZ(-0.01, 0.03) + 0.018], s: [0.016, 0.013, 0.010] });
      b.add(flap(0.026, 0.085, 0.012, 0.006, 2, 3, 0.2, 2), C.orange, { p: [-0.016, 0.026, surfZ(-0.016, 0.02) + 0.022], r: [0.05, 0, 0.12] });
      b.add(flap(0.022, 0.060, 0.010, 0.006, 2, 3, 0.2, 4), C.orange, { p: [0.006, 0.026, surfZ(0.006, 0.02) + 0.022], r: [0.05, 0, -0.15] });
      putVC("chest", b, { o: 0.02 });
    }

    /* ------------------------------------------------------------ SATCHEL: khaki pouches, books, brass spyglass */
    {
      const b = new Bake();
      const kh = (x, y, z) => mix3(lin(C.khaki), lin(C.khakiD), clamp(0.7 * hash(Math.floor(y * 60 + 3) * 3.1 + Math.floor(x * 50)), 0, 0.5));
      b.add(box, kh, { p: [0, -0.125, 0], s: [0.172, 0.190, 0.100] });
      b.add(box, C.tan, { p: [0, -0.050, 0.008], s: [0.180, 0.092, 0.106], r: [0.06, 0, 0] });
      b.add(box, C.khakiD, { p: [0, -0.165, 0.058], s: [0.150, 0.082, 0.030] });
      b.add(box, C.leatherD, { p: [0, -0.070, 0.064], s: [0.032, 0.115, 0.008] });
      b.add(box, C.brass, { p: [0, -0.108, 0.068], s: [0.038, 0.022, 0.008] });
      b.add(box, C.tanL, { p: [0.118, -0.130, -0.002], s: [0.066, 0.150, 0.088], r: [0, 0, -0.04] });
      b.add(box, C.khakiD, { p: [0.118, -0.078, 0.002], s: [0.070, 0.034, 0.092], r: [0, 0, -0.04] });
      b.add(box, C.leatherD, { p: [0.0, -0.205, 0.056], s: [0.160, 0.014, 0.012] });
      for (let i = 0; i < 3; i++) b.add(sph, C.leatherD, { p: [0.140, -0.19 - i * 0.014, 0.048], s: [0.009, 0.013, 0.009] });
      b.add(flap(0.044, 0.060, 0.016, 0.006, 2, 2, 0.1, 7), 0xd89a9a, { p: [0.04, -0.222, 0.0] });
      /* books standing behind the flap */
      b.add(box, C.bookG, { p: [-0.014, 0.070, -0.020], s: [0.082, 0.150, 0.044], r: [0.05, 0.03, 0.04] });
      b.add(box, 0xcbbc92, { p: [-0.014, 0.070, 0.003], s: [0.072, 0.134, 0.004], r: [0.05, 0.03, 0.04] });
      b.add(box, C.bookO, { p: [0.064, 0.068, -0.012], s: [0.080, 0.158, 0.044], r: [0.05, 0.04, -0.06] });
      b.add(box, 0x8a3a18, { p: [0.064, 0.068, 0.012], s: [0.066, 0.138, 0.004], r: [0.05, 0.04, -0.06] });
      /* spyglass lens + barrel */
      b.add(prim("cyl", 0.040, 0.034, 0.065, 14), 0x9fb4c4, { p: [0.112, -0.040, 0.068], r: [PI / 2, 0, 0.3] });
      b.add(prim("cyl", 0.030, 0.030, 0.012, 14), 0x365a66, { p: [0.116, -0.039, 0.104], r: [PI / 2, 0, 0.3] });
      b.add(prim("tor", 0.040, 0.007, 6, 14), C.brass, { p: [0.116, -0.039, 0.102], r: [0, 0, 0] });
      putVC("satchel", b, { o: 0.026 });
    }

    /* ------------------------------------------------------------ PACK: green sack, bedroll, SKULL trinket */
    {
      const b = new Bake();
      const gc = (x, y, z) => mix3(lin(C.pack), lin(C.packD), clamp(0.5 - y / 0.45, 0, 0.75) * (0.7 + 0.6 * hash(Math.floor(x * 30) + Math.floor(y * 22))));
      const sack = loft([
        { c: [0, -0.255, 0], rx: 0.175, rz: 0.085 }, { c: [0, -0.20, 0], rx: 0.195, rz: 0.110 },
        { c: [0, -0.05, 0], rx: 0.205, rz: 0.118 }, { c: [0, 0.10, 0], rx: 0.200, rz: 0.108 },
        { c: [0, 0.19, 0], rx: 0.170, rz: 0.086 }, { c: [0, 0.225, 0], rx: 0.120, rz: 0.060 }
      ], 24, { sq: 2.8, fn: (a, t) => 1 + 0.045 * Math.sin(a * 4 + t * 7) });
      b.add(sack, gc, { p: [-0.02, 0.025, 0] });
      /* flap + buckles + straps */
      b.add(box, C.packD, { p: [-0.02, 0.165, -0.098], s: [0.30, 0.15, 0.030], r: [-0.12, 0, 0] });
      for (const x of [-0.1, 0.06]) b.add(box, C.leatherD, { p: [x, 0.115, -0.110], s: [0.034, 0.30, 0.012], r: [-0.08, 0, 0] });
      for (const x of [-0.1, 0.06]) b.add(box, C.brass, { p: [x, 0.025, -0.118], s: [0.030, 0.026, 0.010] });
      /* painted black scribbles on the green */
      for (let i = 0; i < 5; i++) b.add(box, 0x14210f, { p: [-0.13 + i * 0.03, -0.055 + 0.025 * Math.sin(i * 2.3), -0.108], s: [0.006, 0.05, 0.006], r: [0, 0, 0.5 + i * 0.7] });
      /* bedroll across the top, tied */
      const roll = loft([{ c: [-0.30, 0.27, 0.0], rx: 0.066, rz: 0.066 }, { c: [-0.25, 0.27, 0], rx: 0.080, rz: 0.080 }, { c: [-0.05, 0.27, 0], rx: 0.084, rz: 0.082 }, { c: [0.15, 0.27, 0], rx: 0.080, rz: 0.078 }, { c: [0.18, 0.27, 0.0], rx: 0.064, rz: 0.062 }], 16,
        { ref: [0, 1, 0], fn: (a, t) => 1 + 0.04 * Math.sin(a * 3 + t * 6) });
      b.add(roll, (x, y, z) => mix3(lin(C.roll), lin(0x738370), clamp(0.5 - (y - 0.30) / 0.2, 0, 0.8)), { p: [0, 0, -0.01] });
      for (const x of [-0.19, 0.08]) b.add(prim("tor", 0.082, 0.008, 6, 16), C.leatherD, { p: [x, 0.27, -0.01], r: [0, PI / 2, 0], s: [1, 1.0, 1] });
      putVC("pack", b, { o: 0.03 }, false);
      /* skull */
      const sb = new Bake();
      const skC = (x, y, z) => mix3(lin(C.skull), lin(0xa5ae9a), clamp(-y / 0.1, 0, 1) * 0.6);
      sb.add(sph, skC, { s: [0.066, 0.060, 0.070] });
      sb.add(sph, skC, { p: [0, -0.042, 0.020], s: [0.045, 0.034, 0.045] });
      for (const s of [-1, 1]) {
        sb.add(sph, C.skullD, { p: [s * 0.026, 0.002, 0.056], s: [0.017, 0.021, 0.014] });
        sb.add(box, skC, { p: [s * 0.012 * 0, -0.066, 0.052 + 0.001], s: [0.0, 0.0, 0.0] });
      }
      sb.add(cone8, C.skullD, { p: [0, -0.024, 0.062], r: [PI, 0, 0], s: [0.009, 0.020, 0.007] });
      for (let i = -2; i <= 2; i++) sb.add(box, 0xcfd3c0, { p: [i * 0.0145, -0.062, 0.056], s: [0.011, 0.016, 0.008] });
      sb.add(box, 0x86a8c0, { p: [-0.006, 0.026, 0.066], s: [0.004, 0.038, 0.004], r: [0, 0, 0.35] });
      putVC("skull", sb, { o: 0.028 });
      /* strap holding the skull to the roll */
      const cordB = new Bake();
      cordB.add(prim("tor", 0.060, 0.007, 6, 12), C.leatherD, { r: [PI / 2, 0, 0], p: [0.0, 0.0, -0.04], s: [1, 1, 1.0] });
      putVC("skull", cordB, { o: 0.0 });
    }

    /* ------------------------------------------------------------ STAFF: gnarled branch, forked crown, EYEBALL */
    {
      const S = rig.bones.staff;
      const shaftPts = [[0, -0.52, 0], [0.004, -0.30, 0.003], [-0.004, -0.05, -0.002], [0.006, 0.18, 0.004], [0.0, 0.30, 0.0], [0.0, 0.42, 0.0]];
      const shaftR = [0.020, 0.025, 0.029, 0.033, 0.042, 0.058];
      const secs = [];
      for (let i = 0; i < 16; i++) { const t = i / 15; secs.push({ c: spline(shaftPts, t), rx: spline(shaftR, t), rz: spline(shaftR, t) * 0.9 }); }
      const woodFn = (a, t, i) => 1 + 0.10 * Math.sin(a * 3 + t * 13) + 0.07 * Math.sin(a * 5 + t * 29) + 0.12 * Math.exp(-Math.pow((t - 0.32) / 0.03, 2)) + 0.10 * Math.exp(-Math.pow((t - 0.68) / 0.03, 2));
      put(S, loft(secs, 14, { fn: woodFn, v0: 0, v1: 1 }), mWood, { o: 0.032 });
      /* forked crown cradling the eye: tall right prong, hooked left prong */
      const prongR = [[0.0, 0.40, 0], [0.034, 0.49, 0], [0.084, 0.60, 0], [0.100, 0.72, 0], [0.094, 0.81, 0], [0.106, 0.885, 0]];
      const prongRR = [0.064, 0.060, 0.056, 0.052, 0.046, 0.012];
      const prongL = [[0.0, 0.40, 0], [-0.040, 0.47, 0], [-0.086, 0.565, 0], [-0.100, 0.665, 0], [-0.088, 0.745, 0], [-0.052, 0.790, 0], [-0.012, 0.782, 0], [0.020, 0.752, 0]];
      const prongLR = [0.064, 0.060, 0.056, 0.052, 0.048, 0.042, 0.032, 0.012];
      for (const [pts, rr, seedv] of [[prongR, prongRR, 1], [prongL, prongLR, 2]]) {
        const sc = [];
        for (let i = 0; i < 14; i++) { const t = i / 13; sc.push({ c: spline(pts, t), rx: spline(rr, t) * 1.0, rz: spline(rr, t) * 0.80 }); }
        put(S, loft(sc, 12, { ref: [0, 0, 1], fn: (a, t) => 1 + 0.10 * Math.sin(a * 3 + t * 9 + seedv) + 0.06 * Math.sin(a * 6 + t * 21), v0: 0.0, v1: 0.5 }), mWood, { o: 0.032 });
      }
      /* pale vine wrapping the lower fork + shaft, with bark thorns */
      const vb = new Bake();
      const vine = [];
      for (let i = 0; i <= 26; i++) {
        const t = i / 26, y = -0.18 + t * 0.58, ang = t * PI * 5.0;
        vine.push({ c: [Math.sin(ang) * 0.034, y, Math.cos(ang) * 0.034], rx: 0.0082, rz: 0.0082 });
      }
      vb.add(loft(vine, 6, { ref: [0, 1, 0] }), (x, y, z) => mix3(lin(0xeee9da), lin(0xc4bca8), clamp(0.5 - y, 0, 0.5)), {});
      for (let i = 0; i < 6; i++) vb.add(cone8, 0x504a44, { p: [0.03 * Math.cos(i * 1.9), -0.30 + i * 0.12, 0.03 * Math.sin(i * 1.9)], r: [0.0, 0.0, -1.3 + i * 0.2], s: [0.008, 0.026, 0.008] });
      putVC("staff", vb, { o: 0.0 });
      /* eyeball */
      const eb = new Bake();
      eb.add(prim("sph", 24, 16), (x, y, z) => mix3(lin(0xfbf6ea), lin(0xe3d6a8), clamp((-y + 0.0) / 0.1, 0, 1) * 0.5), { s: 0.078 });
      putVC("staffEye", eb, { o: 0.03 });
      const eye = new THREE.Mesh(sphPatchGeo(0.0795, SE.half, 20), mSEye);
      eye.renderOrder = 3; eye.userData.noOutline = true; eye.userData.keep = true;
      eye.castShadow = false; eye.receiveShadow = false;
      rig.bones.staffEye.add(eye);
      /* silver needle stuck in the lower right of the eye + tassel + orange bead charm */
      const nb = new Bake();
      nb.add(prim("cyl", 0.0035, 0.0035, 0.17, 6), C.silver, { p: [0.098, 0.575, 0.045], r: [0.0, 0, -1.02] });
      nb.add(sphLo, C.silver, { p: [0.158, 0.545, 0.046], s: 0.011 });
      nb.add(prim("tor", 0.011, 0.003, 5, 10), C.silver, { p: [0.158, 0.543, 0.046], r: [PI / 2, 0, 0] });
      putVC("staff", nb, { o: 0.0 });
      const cb = new Bake();
      cb.add(prim("cyl", 0.004, 0.004, 0.17, 5), 0xa07a52, { p: [0, -0.085, 0] });
      cb.add(sph, 0xf59a62, { p: [0.0, -0.185, 0], s: [0.020, 0.036, 0.020] });
      cb.add(sph, 0xd8794a, { p: [0.004, -0.19, 0.012], s: [0.012, 0.020, 0.010] });
      cb.add(sph, C.leatherD, { p: [0, -0.16, 0], s: [0.012, 0.016, 0.012] });
      cb.add(flap(0.050, 0.075, 0.018, 0.008, 3, 3, 0.4, 5), 0x9ad6cc, { p: [0.0, -0.01, 0.0], r: [0.1, 0.5, 0.0] });
      cb.add(flap(0.035, 0.060, 0.014, 0.006, 2, 3, 0.4, 7), 0x7cc0b8, { p: [0.0, -0.01, 0.0], r: [-0.1, -0.8, 0.1] });
      putVC("charm", cb, { o: 0.018 }, true);
    }

    /* ------------------------------------------------------------ rig finish + animation */
    const anim = K.anim(rig);
    K.idleClip(anim, { dur: 2.6, breath: 0.018, headTurn: 0.055 });
    anim.setBase("idle");
    anim.play("idle", { fade: 0 });
    anim.update(0);

    K.mergeRig(rig);
    rig.parts.root = rig.root;
    rig.parts.body = rig.body;
    rig.parts.cloak = hinges;
    rig.parts.hatTop = rig.bones.hatTip;
    rig.parts.weapon = rig.bones.staff;
    const meshCount = rig.countMeshes();
    return {
      id: "witch", root: rig.root, parts: rig.parts, anim,
      height: 1.5, radius: 0.34, team: "player", rig, meshes: meshCount
    };
  }

  function rimScale(m, k) {
    const o = m.onBeforeCompile;
    m.onBeforeCompile = function (sh) { o.call(this, sh); if (sh.uniforms.uRimK) sh.uniforms.uRimK.value = k; };
    return m;
  }
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  G.chars.define("witch", { height: 1.5, radius: 0.34, team: "player" }, buildWitch);

})();
