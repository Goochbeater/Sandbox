/* ============================================================================
   SPOREHEART — src/char_beast.js
   THE POPPIED BEAST — third form of the SPOREHEART assassin.
   A ~7 m bipedal horned beast: hammerhead-skull helm with a crown of glowing
   red lens-eyes, boar tusks, silver mane, shredded black raincoat for a mantle,
   red poppy fins along the spine, a glowing chest core (the weak point), one
   mechanical arm + one organic arm, a ~6 m glowing red greatsword (propR) and
   the black scabbard strapped across its back.

   Everything is code: lofted tubes, superellipsoid armour, thick-cloth sheets,
   hair cards, petal blossoms — baked per bone into a few vertex-coloured
   meshes (with ink outlines) so the whole beast stays near ~200 draw calls.

   Registered with:  G.chars.define("beast", {height:7.0, radius:2.2, team:"enemy"}, builder)
   ========================================================================== */
(function () {
  "use strict";
  const G = window.G;
  if (!G || !G.kit || !G.chars) throw new Error("char_beast.js requires charakit.js + characters.js");
  const K = G.kit, A = G.assets, U = G.util;
  const T = () => G.THREE;
  const PI = Math.PI, TAU = PI * 2;

  /* palette (a touch brighter than the painting: the toon ramp cools + darkens) */
  const C = {
    pelt: 0x1f2840, pelt2: 0x2e3f5c, ink: 0x0e1219, inkB: 0x151b28,
    grey: 0x9db4cf, grey2: 0x7790b2, greyD: 0x4a5b78, greyDD: 0x2b364b,
    bone: 0xece6d3, boneD: 0xb9b4a6,
    red: 0xf5422f, redD: 0xbd2229, redDD: 0x6a0f18, redL: 0xff7a5c,
    glowRed: 0xff3a2a, glowOrg: 0xff7a2a, glowHot: 0xffc15a,
    silver: 0xe2eaf6, silverD: 0x9fb2cc,
    olive: 0x9fae62, oliveD: 0x6c7a3e,
    steel: 0x56627a
  };

  let LIB = null, TEX = null, MATS = null;

  /* ==========================================================================
     GEOMETRY LIBRARY  (needs THREE → created lazily inside the builder)
     ========================================================================== */
  function lib() {
    if (LIB) return LIB;
    const THREE = T();
    const V3 = THREE.Vector3, M4 = THREE.Matrix4, M3 = THREE.Matrix3, Qn = THREE.Quaternion, Eu = THREE.Euler,
      BG = THREE.BufferGeometry, Col = THREE.Color, BA = THREE.BufferAttribute;
    const L = {};
    const _v = new V3(), _n = new V3(), _m3 = new M3(), _q = new Qn(), _e = new Eu(), _p = new V3(), _s = new V3();
    const GC = Object.create(null);
    const gcache = (k, f) => GC[k] || (GC[k] = f());
    const sp = (x, e) => (x < 0 ? -1 : 1) * Math.pow(Math.abs(x), e);
    const cl = (x, a, b) => (x < a ? a : x > b ? b : x);
    const lerp = (a, b, t) => a + (b - a) * t;
    const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
    L.hash = hash;

    /* colour helpers: linear RGB arrays; k can exceed 1 for HDR */
    L.rgb = (hex, k) => { const c = new Col(hex); k = k === undefined ? 1 : k; return [c.r * k, c.g * k, c.b * k]; };
    L.mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

    L.mat = (p, r, s) => {
      const m = new M4();
      if (p) _p.set(p[0], p[1], p[2]); else _p.set(0, 0, 0);
      if (r) _q.setFromEuler(_e.set(r[0], r[1], r[2])); else _q.identity();
      if (s === undefined) _s.set(1, 1, 1); else if (typeof s === "number") _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
      return m.compose(_p, _q, _s);
    };

    /* ---- weld pieces (each {g, m, col}) into ONE vertex-coloured geometry ---- */
    L.merge = (pieces) => {
      let nv = 0, ni = 0;
      for (let i = 0; i < pieces.length; i++) {
        const g = pieces[i].g;
        nv += g.attributes.position.count;
        ni += g.index ? g.index.count : g.attributes.position.count;
      }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      for (let k = 0; k < pieces.length; k++) {
        const pc = pieces[k], g = pc.g, pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, ca = g.attributes.color, cnt = pa.count;
        _m3.getNormalMatrix(pc.m);
        const tint = pc.col;
        for (let i = 0; i < cnt; i++) {
          _v.fromBufferAttribute(pa, i).applyMatrix4(pc.m);
          const o3 = (vo + i) * 3;
          pos[o3] = _v.x; pos[o3 + 1] = _v.y; pos[o3 + 2] = _v.z;
          if (na) { _n.fromBufferAttribute(na, i).applyMatrix3(_m3).normalize(); nor[o3] = _n.x; nor[o3 + 1] = _n.y; nor[o3 + 2] = _n.z; }
          if (ua) { uv[(vo + i) * 2] = ua.getX(i); uv[(vo + i) * 2 + 1] = ua.getY(i); }
          let r = 1, gg = 1, b = 1;
          if (ca) { r = ca.getX(i); gg = ca.getY(i); b = ca.getZ(i); }
          if (tint) { r *= tint[0]; gg *= tint[1]; b *= tint[2]; }
          col[o3] = r; col[o3 + 1] = gg; col[o3 + 2] = b;
        }
        const flip = pc.m.determinant() < 0;
        if (g.index) {
          for (let i = 0; i < g.index.count; i += 3) {
            const a = g.index.getX(i) + vo, b = g.index.getX(i + 1) + vo, c = g.index.getX(i + 2) + vo;
            if (flip) { idx[io++] = a; idx[io++] = c; idx[io++] = b; } else { idx[io++] = a; idx[io++] = b; idx[io++] = c; }
          }
        } else {
          for (let i = 0; i < cnt; i += 3) {
            if (flip) { idx[io++] = vo + i; idx[io++] = vo + i + 2; idx[io++] = vo + i + 1; } else { idx[io++] = vo + i; idx[io++] = vo + i + 1; idx[io++] = vo + i + 2; }
          }
        }
        vo += cnt;
      }
      const out = new BG();
      out.setAttribute("position", new BA(pos, 3));
      out.setAttribute("normal", new BA(nor, 3));
      out.setAttribute("uv", new BA(uv, 2));
      out.setAttribute("color", new BA(col, 3));
      out.setIndex(new BA(idx, 1));
      out.computeBoundingSphere();
      return out;
    };

    /* average normals on a (rows × cols+1) grid seam (col 0 == col last) */
    function fixSeam(g, rows, cols) {
      const na = g.attributes.normal;
      for (let j = 0; j < rows; j++) {
        const a = j * (cols + 1), b = a + cols;
        _n.set(na.getX(a) + na.getX(b), na.getY(a) + na.getY(b), na.getZ(a) + na.getZ(b)).normalize();
        na.setXYZ(a, _n.x, _n.y, _n.z); na.setXYZ(b, _n.x, _n.y, _n.z);
      }
    }

    /* ---- superellipsoid: e=1 sphere, e<1 boxy-rounded, e>1 pinched. unit radii ---- */
    L.sq = (e1, e2, su, sv) => {
      su = su || 14; sv = sv || 9;
      return gcache("sq_" + e1 + "_" + e2 + "_" + su + "_" + sv, () => {
        const pos = [], uv = [], idx = [];
        for (let j = 0; j <= sv; j++) {
          const th = -PI / 2 + PI * j / sv, ct = sp(Math.cos(th), e1), st = sp(Math.sin(th), e1);
          for (let i = 0; i <= su; i++) {
            const ph = -PI + TAU * i / su;
            pos.push(ct * sp(Math.cos(ph), e2), st, ct * sp(Math.sin(ph), e2));
            uv.push(i / su, j / sv);
          }
        }
        for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
          const a = j * (su + 1) + i, b = a + su + 1;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
        const g = new BG();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        g.computeVertexNormals();
        fixSeam(g, sv + 1, su);
        const na = g.attributes.normal;
        for (let i = 0; i <= su; i++) { na.setXYZ(i, 0, -1, 0); na.setXYZ(sv * (su + 1) + i, 0, 1, 0); }
        return g;
      });
    };

    /* ---- LOFT: sweep a (super)elliptical or polygonal section along a curve ----
       o.pts   control points [[x,y,z],...]
       o.r     radius profile [[rx,rz],...] evenly spaced along arc length
       o.ns    samples along the path (default 8), o.seg samples round the section
       o.n     superellipse exponent (2 = ellipse, 4 = soft box)
       o.sec   optional polygon [[x,z],...] (closed) instead of the ellipse
       o.secCol optional per-polygon-vertex colours [[r,g,b],...]
       o.ref   frame reference (default +Z); o.cap0/o.cap1: 'flat' | 'dome'
       o.col   (t)=>[r,g,b] per-station colour tint                         */
    L.loft = (o) => {
      const ns = o.ns || 8, poly = o.sec || null, seg = poly ? poly.length : (o.seg || 10);
      const ex = 2 / (o.n || 2);
      const cp = o.pts.map((p) => new V3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(cp, false, "centripetal");
      const ref = new V3().fromArray(o.ref || [0, 0, 1]);
      const R = o.r;
      const radAt = (t) => {
        const f = t * (R.length - 1), i = Math.min(R.length - 2, Math.floor(f)), s = f - i;
        const p0 = R[Math.max(0, i - 1)], p1 = R[i], p2 = R[i + 1], p3 = R[Math.min(R.length - 1, i + 2)];
        const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
        return [Math.max(0.0005, cr(p0[0], p1[0], p2[0], p3[0])), Math.max(0.0005, cr(p0[1], p1[1], p2[1], p3[1]))];
      };
      const st = []; // stations {c, side, fwd, rx, rz, t, arc, tan}
      const prevSide = new V3(), tmp = new V3();
      let arc = 0, last = null;
      for (let k = 0; k <= ns; k++) {
        const t = k / ns;
        const c = curve.getPointAt(t), tan = curve.getTangentAt(t).normalize();
        const side = new V3(), fwd = new V3();
        if (k === 0) {
          side.crossVectors(ref, tan);
          if (side.lengthSq() < 1e-4) side.crossVectors(new V3(1, 0, 0), tan);
          side.normalize();
        } else {
          side.copy(prevSide).addScaledVector(tan, -prevSide.dot(tan)).normalize();
        }
        prevSide.copy(side);
        fwd.crossVectors(tan, side);
        const rr = radAt(t);
        if (last) arc += c.distanceTo(last.c);
        last = { c, side, fwd, rx: rr[0], rz: rr[1], t, arc, tan: tan.clone() };
        st.push(last);
      }
      /* dome caps: extra rings that close the tube */
      const addDome = (end) => {
        const base = end ? st[st.length - 1] : st[0];
        const rm = (base.rx + base.rz) * 0.5, dir = end ? 1 : -1;
        const steps = [0.35, 0.7, 0.92, 1.0];
        for (let i = 0; i < steps.length; i++) {
          const th = steps[i] * PI / 2;
          const c = base.c.clone().addScaledVector(base.tan, dir * rm * Math.sin(th) * (o.domeK || 0.9));
          const e = { c, side: base.side, fwd: base.fwd, rx: Math.max(0.0005, base.rx * Math.cos(th)), rz: Math.max(0.0005, base.rz * Math.cos(th)), t: end ? 1 : 0, arc: base.arc + dir * rm * Math.sin(th), tan: base.tan };
          if (end) st.push(e); else st.unshift(e);
        }
      };
      if (o.cap0 === "dome") addDome(false);
      if (o.cap1 === "dome") addDome(true);
      const rings = st.length, cols = seg + 1;
      const pos = new Float32Array(rings * cols * 3), uv = new Float32Array(rings * cols * 2), colA = (o.col || o.secCol || o.colA) ? new Float32Array(rings * cols * 3) : null;
      const tileU = o.tileU || 1, tileV = o.tileV === undefined ? 0.3 : o.tileV;
      const arc0 = st[0].arc;
      for (let k = 0; k < rings; k++) {
        const s = st[k];
        const tint = o.col ? o.col(s.t) : null;
        for (let i = 0; i <= seg; i++) {
          let cx, cz, ii = i % seg;
          if (poly) { cx = poly[ii][0] * s.rx; cz = poly[ii][1] * s.rz; }
          else { const a = TAU * i / seg; cx = sp(Math.cos(a), ex) * s.rx; cz = sp(Math.sin(a), ex) * s.rz; }
          const o3 = (k * cols + i) * 3;
          pos[o3] = s.c.x + s.side.x * cx + s.fwd.x * cz;
          pos[o3 + 1] = s.c.y + s.side.y * cx + s.fwd.y * cz;
          pos[o3 + 2] = s.c.z + s.side.z * cx + s.fwd.z * cz;
          uv[(k * cols + i) * 2] = (i / seg) * tileU * Math.max(1, (s.rx + s.rz) * 1.2);
          uv[(k * cols + i) * 2 + 1] = (s.arc - arc0) * tileV;
          if (colA) {
            const sc = o.secCol ? o.secCol[ii] : [1, 1, 1];
            const ta = o.colA ? o.colA(s.t, TAU * i / seg) : null;
            colA[o3] = sc[0] * (tint ? tint[0] : 1) * (ta ? ta[0] : 1); colA[o3 + 1] = sc[1] * (tint ? tint[1] : 1) * (ta ? ta[1] : 1); colA[o3 + 2] = sc[2] * (tint ? tint[2] : 1) * (ta ? ta[2] : 1);
          }
        }
      }
      const idx = [];
      for (let k = 0; k < rings - 1; k++) for (let i = 0; i < seg; i++) {
        const a = k * cols + i, b = a + cols;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
      const posL = Array.from(pos), uvL = Array.from(uv), colL = colA ? Array.from(colA) : null;
      const capFan = (ringIdx, flip) => {
        const s = st[ringIdx], ci = posL.length / 3;
        posL.push(s.c.x, s.c.y, s.c.z); uvL.push(0.5, 0.5);
        if (colL) { const j0 = ringIdx * cols * 3; colL.push(colA[j0], colA[j0 + 1], colA[j0 + 2]); }
        for (let i = 0; i < seg; i++) {
          const a = ringIdx * cols + i;
          if (flip) idx.push(ci, a + 1, a); else idx.push(ci, a, a + 1);
        }
      };
      /* flat caps get their own duplicated ring so the cap normal stays hard */
      const flatCap = (ringIdx, flip) => {
        const s = st[ringIdx], base = posL.length / 3, tn = s.tan;
        const nrm = flip ? [-tn.x, -tn.y, -tn.z] : [tn.x, tn.y, tn.z];
        for (let i = 0; i < seg; i++) {
          const a = (ringIdx * cols + i) * 3;
          posL.push(posL[a], posL[a + 1], posL[a + 2]); uvL.push(0.5, 0.5);
          if (colL) colL.push(colL[a], colL[a + 1], colL[a + 2]);
        }
        const ci = posL.length / 3;
        posL.push(s.c.x, s.c.y, s.c.z); uvL.push(0.5, 0.5);
        if (colL) { const a = ringIdx * cols * 3; colL.push(colL[a], colL[a + 1], colL[a + 2]); }
        for (let i = 0; i < seg; i++) {
          const a = base + i, b = base + ((i + 1) % seg);
          if (flip) idx.push(ci, b, a); else idx.push(ci, a, b);
        }
        return nrm;
      };
      const caps = [];
      if (o.cap0 === "flat") caps.push([0, true]);
      if (o.cap1 === "flat") caps.push([rings - 1, false]);
      for (let i = 0; i < caps.length; i++) flatCap(caps[i][0], caps[i][1]);
      const g = new BG();
      g.setAttribute("position", new THREE.Float32BufferAttribute(posL, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvL, 2));
      if (colL) g.setAttribute("color", new THREE.Float32BufferAttribute(colL, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      if (!poly) fixSeam(g, rings, seg);
      return g;
    };

    /* sampled arc helper: points on an ellipse in the XZ plane at height y (angles from +Z toward +X) */
    L.arcPts = (cx, y, cz, rx, rz, a0, a1, n, dy) => {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = lerp(a0, a1, t);
        out.push([cx + Math.sin(a) * rx, y + (dy ? dy(t) : 0), cz + Math.cos(a) * rz]);
      }
      return out;
    };

    /* ---- SHEET: thick closed cloth shell from a surface function f(u,v)->[x,y,z] ---- */
    L.sheet = (nx, ny, f, thick, tile) => {
      const cols = nx + 1, rows = ny + 1, N = cols * rows;
      const P = new Float32Array(N * 3), UV = new Float32Array(N * 2);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const p = f(i / nx, j / ny, i, j), o = (j * cols + i);
        P[o * 3] = p[0]; P[o * 3 + 1] = p[1]; P[o * 3 + 2] = p[2];
        UV[o * 2] = (i / nx) * (tile ? tile[0] : 1); UV[o * 2 + 1] = 1 - (j / ny) * (tile ? tile[1] : 1);
      }
      /* temp geometry for sheet normals */
      const gi = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = j * cols + i, b = a + cols;
        gi.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const tg = new BG();
      tg.setAttribute("position", new THREE.Float32BufferAttribute(Array.from(P), 3));
      tg.setIndex(gi); tg.computeVertexNormals();
      const NN = tg.attributes.normal;
      const pos = new Float32Array(N * 2 * 3), uvs = new Float32Array(N * 2 * 2);
      for (let k = 0; k < N; k++) {
        const nxv = NN.getX(k), nyv = NN.getY(k), nzv = NN.getZ(k), h = thick * 0.5;
        pos[k * 3] = P[k * 3] + nxv * h; pos[k * 3 + 1] = P[k * 3 + 1] + nyv * h; pos[k * 3 + 2] = P[k * 3 + 2] + nzv * h;
        pos[(N + k) * 3] = P[k * 3] - nxv * h; pos[(N + k) * 3 + 1] = P[k * 3 + 1] - nyv * h; pos[(N + k) * 3 + 2] = P[k * 3 + 2] - nzv * h;
        uvs[k * 2] = UV[k * 2]; uvs[k * 2 + 1] = UV[k * 2 + 1];
        uvs[(N + k) * 2] = UV[k * 2]; uvs[(N + k) * 2 + 1] = UV[k * 2 + 1];
      }
      const idx = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = j * cols + i, b = a + cols;
        idx.push(a, b, a + 1, a + 1, b, b + 1);                     // front
        idx.push(N + a, N + a + 1, N + b, N + a + 1, N + b + 1, N + b); // back (flipped)
      }
      const rim = (a, b) => { idx.push(a, b, N + b, a, N + b, N + a); }; // quad front a,b -> back
      for (let j = 0; j < ny; j++) {
        rim((j + 1) * cols, j * cols);                  // left edge
        rim(j * cols + nx, (j + 1) * cols + nx);        // right edge
      }
      for (let i = 0; i < nx; i++) {
        rim(ny * cols + i + 1, ny * cols + i);          // bottom edge
        rim(i, i + 1);                                   // top edge
      }
      const g = new BG();
      g.setAttribute("position", new BA(pos, 3));
      g.setAttribute("uv", new BA(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };

    /* ---- hanging torn-cloth panel on the XY plane, top edge at y=0 ---- */
    L.panel = (o) => {
      const w0 = o.w0, w1 = o.w1 === undefined ? o.w0 * 1.2 : o.w1, len = o.len, seed = o.seed || 0;
      const v0 = o.v0 || 0, v1 = o.v1 === undefined ? 1 : o.v1;
      const nx = o.nx || 8, ny = o.ny || 6;
      const fold = o.fold === undefined ? 0.16 : o.fold, bow = o.bow || 0, jag = o.jag === undefined ? 0.35 : o.jag;
      const sway = o.swirl || 0;
      const F = (u, vv) => {
        const v = lerp(v0, v1, vv);
        const xn = u * 2 - 1;
        const w = lerp(w0, w1, Math.pow(v, 0.9));
        let x = xn * w * 0.5;
        const edge = 1 + 0.05 * Math.sin(v * 11 + seed) * Math.abs(xn);
        x *= edge;
        const folds = fold * (0.25 + v) * (Math.sin(xn * 4.2 + seed * 1.7 + v * 1.5) + 0.55 * Math.sin(xn * 9.1 + seed * 3.1 - v * 2));
        let z = bow * xn * xn * (0.4 + v) + folds + sway * v * v * xn;
        let y = -v * len;
        if (v > 0.74) {
          const col = Math.round(u * nx);
          const k = (v - 0.74) / 0.26;
          y -= jag * k * k * (0.15 + 1.0 * hash(col * 7.3 + seed * 3.7 + 1)) * (col % 2 === 0 ? 1 : 0.35) * len * 0.22;
          x += (hash(col + seed) - 0.5) * 0.08 * k;
        }
        return [x, y, z];
      };
      const g = L.sheet(nx, ny, (u, vv) => F(u, vv), o.thick || 0.05, [1, v1 - v0]);
      const ua = g.attributes.uv;
      for (let i = 0; i < ua.count; i++) ua.setY(i, ua.getY(i) - v0);
      g.userData.top = F(0.5, 0); g.userData.bot = F(0.5, 1);
      return g;
    };

    /* ---- hair card: curved tapered ribbon with a raised spine, hangs down -Y ---- */
    L.card = (o) => {
      const w = o.w, len = o.len, curve = o.curve === undefined ? 0.25 : o.curve, wave = o.wave || 0, ph = o.ph || 0;
      const t0 = o.t0 || 0, t1 = o.t1 === undefined ? 1 : o.t1, n = o.n || 5;
      const C0 = (t) => [wave * len * Math.sin(t * 4.2 + ph) * t * 0.25, -len * t, -curve * len * t * t];
      const W0 = (t) => w * (1 - 0.9 * Math.pow(t, 2.4));
      const base = C0(t0);
      const pos = [], uv = [], idx = [];
      for (let j = 0; j <= n; j++) {
        const t = lerp(t0, t1, j / n), c = C0(t), ww = W0(t) * 0.5;
        const tip = t >= 0.9999;
        const e = 0.012 + ww * 0.22;
        const x0 = c[0] - base[0], y0 = c[1] - base[1], z0 = c[2] - base[2];
        pos.push(x0 - ww, y0, z0 - e * 0.2, x0, y0, z0 + e, x0 + ww, y0, z0 - e * 0.2);
        uv.push(0, 1 - t, 0.5, 1 - t, 1, 1 - t);
      }
      for (let j = 0; j < n; j++) {
        const a = j * 3, b = a + 3;
        idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
      }
      const g = new BG();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      g.userData.joint = [base[0], base[1], base[2]];
      return g;
    };
    L.cardJoint = (o) => { // where the lower segment starts (for the tip bone)
      const len = o.len, wave = o.wave || 0, ph = o.ph || 0, curve = o.curve === undefined ? 0.25 : o.curve, t = o.t0;
      return [wave * len * Math.sin(t * 4.2 + ph) * t * 0.25, -len * t, -curve * len * t * t];
    };

    /* ---- straight tape ribbon with a swallow-tail notch, top at y=0 ---- */
    L.ribbon = (w, len, notch, wave, ph) => gcache("rib_" + [w, len, notch, wave, ph].join("_"), () => {
      const n = 6, pos = [], uv = [], idx = [];
      for (let j = 0; j <= n; j++) {
        const t = j / n, z = Math.sin(t * 5 + (ph || 0)) * (wave || 0) * t;
        pos.push(-w / 2, -len * t, z, w / 2, -len * t, z);
        uv.push(0, 1 - t, 1, 1 - t);
      }
      const ci = pos.length / 3;
      pos.push(0, -len + notch, (Math.sin(5 + (ph || 0)) * (wave || 0)));
      uv.push(0.5, 1 - (len - notch) / len);
      for (let j = 0; j < n; j++) { const a = j * 2, b = a + 2; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      // vee: replace last segment's lower edge with notch (cheap: extra tri fan)
      const a = n * 2;
      idx.push(a, ci, a + 1);
      const g = new BG();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    });

    /* ---- poppy petal: cupped, ruffled, vertex-coloured dark base → hot rim ---- */
    L.petal = (len, wid, cup, bend, seed, c0, c1, c2) => gcache("petal_" + [len, wid, cup, bend, seed, c0, c1, c2].join("_"), () => {
      const nu = 6, nv = 6, pos = [], uv = [], idx = [], col = [];
      const a0 = L.rgb(c0), a1 = L.rgb(c1), a2 = L.rgb(c2);
      for (let j = 0; j <= nv; j++) {
        const v = j / nv, s = 0.05 + 0.9 * Math.pow(v, 0.85);
        const w = wid * Math.pow(Math.sin(PI * s), 0.6);
        const th = bend * v;
        const yc = Math.abs(bend) < 1e-4 ? len * v : len * Math.sin(th) / bend;
        const zc = Math.abs(bend) < 1e-4 ? 0 : len * (1 - Math.cos(th)) / bend;
        const cv = v < 0.35 ? L.mix(a0, a1, v / 0.35) : L.mix(a1, a2, (v - 0.35) / 0.65);
        for (let i = 0; i <= nu; i++) {
          const u = i / nu * 2 - 1;
          const off = cup * wid * u * u * (0.3 + v) + 0.06 * wid * Math.sin(u * 5.0 + seed + v * 4.0) * v;
          pos.push(u * w, yc - Math.sin(th) * off, zc + Math.cos(th) * off);
          uv.push(i / nu, v);
          col.push(cv[0], cv[1], cv[2]);
        }
      }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + nu + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
      const g = new BG();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    });

    /* ---- poppy blossom: 5 cupped petals around a seed pod (opens toward +Y) ---- */
    L.poppy = (r, seed) => gcache("poppy_" + r + "_" + seed, () => {
      const pcs = [];
      for (let k = 0; k < 5; k++) {
        const a = k * TAU / 5 + hash(k + seed * 3) * 0.4;
        const g = L.petal(r, r * 0.62, -0.45, -0.75, k * 1.7 + seed, C.redDD, C.redD, C.red);
        pcs.push({ g, m: L.mat([0, 0, 0], null, 1).multiply(new M4().makeRotationY(a)).multiply(new M4().makeRotationX(0.95 + hash(k + seed) * 0.25)), col: null });
      }
      for (let k = 0; k < 4; k++) {
        const a = k * TAU / 4 + 0.5;
        const g = L.petal(r * 0.8, r * 0.5, -0.4, -0.9, k * 2.3 + seed, C.redDD, C.redD, C.redL);
        pcs.push({ g, m: new M4().makeRotationY(a).multiply(new M4().makeRotationX(0.45 + hash(k + seed * 5) * 0.2)), col: null });
      }
      pcs.push({ g: L.sq(1, 1, 8, 6), m: L.mat([0, r * 0.12, 0], null, [r * 0.17, r * 0.15, r * 0.17]), col: L.rgb(C.oliveD) });
      pcs.push({ g: L.sq(1, 1, 8, 4), m: L.mat([0, r * 0.19, 0], null, [r * 0.22, r * 0.04, r * 0.22]), col: L.rgb(0x1a1020) });
      return L.merge(pcs);
    });

    /* ---- claws / horns / spikes: tapered curved cone along +Y ---- */
    L.horn = (len, r0, bx, bz, seg, ridge) => gcache("horn_" + [len, r0, bx, bz, seg, ridge || 0].join("_"), () => {
      const R = [];
      const nR = 5;
      for (let i = 0; i < nR; i++) {
        const t = i / (nR - 1);
        const rr = r0 * Math.pow(1 - t, 0.85) * (ridge ? 1 + ridge * Math.sin(t * 22) * (1 - t) : 1) + 0.004;
        R.push([rr, rr * 0.92]);
      }
      return L.loft({
        pts: [[0, 0, 0], [bx * 0.15 * len, len * 0.35, bz * 0.15 * len], [bx * 0.55 * len, len * 0.7, bz * 0.55 * len], [bx * len, len, bz * len]],
        r: R, ns: 5, seg: seg || 5, cap1: "dome"
      });
    });

    L.sph = () => gcache("sph", () => L.sq(1, 1, 12, 8));
    L.sphLo = () => gcache("sphLo", () => L.sq(1, 1, 8, 5));
    L.box = (n) => gcache("box" + (n || 0.28), () => L.sq(n || 0.28, n || 0.28, 8, 5));
    L.disc = (e) => gcache("disc" + (e || 1), () => L.sq(0.22, e || 1, 16, 4)); // flat-ish pill
    L.cyl = (rt, rb, h, seg) => gcache("cyl_" + [rt, rb, h, seg].join("_"), () => new THREE.CylinderGeometry(rt, rb, h, seg || 10, 1, false));
    L.cone = (seg) => gcache("cone" + (seg || 6), () => new THREE.ConeGeometry(1, 1, seg || 6));
    L.tor = (r, t, arc, rs, ts) => gcache("tor_" + [r, t, arc, rs, ts].join("_"), () => new THREE.TorusGeometry(r, t, rs || 6, ts || 16, arc === undefined ? TAU : arc));

    LIB = L;
    return L;
  }

  /* ==========================================================================
     PAINTED TEXTURES (canvas, built once)
     ========================================================================== */
  function textures() {
    if (TEX) return TEX;
    const THREE = T();
    TEX = {};
    const mk = (w, h, draw, repeat) => {
      try {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        draw(ctx, w, h);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
      } catch (e) { return null; }
    };
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const rr = (a, b) => a + (b - a) * rnd();

    /* subtle painterly grain that multiplies every vertex-coloured surface */
    TEX.grain = mk(256, 256, (ctx, w, h) => {
      ctx.fillStyle = "#f2f2f6"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) {
        const v = rnd() < 0.5 ? 0 : 255;
        ctx.fillStyle = "rgba(" + v + "," + v + "," + v + "," + rr(0.03, 0.10) + ")";
        ctx.beginPath(); ctx.ellipse(rr(0, w), rr(0, h), rr(1, 7), rr(0.6, 2.4), rr(-0.3, 0.3), 0, TAU); ctx.fill();
      }
      ctx.lineCap = "round";
      for (let i = 0; i < 70; i++) {
        ctx.strokeStyle = "rgba(60,70,90," + rr(0.06, 0.2) + ")"; ctx.lineWidth = rr(0.6, 1.6);
        const x = rr(0, w), y = rr(0, h), a = rr(-0.5, 0.5) + (rnd() < 0.3 ? 1.5 : 0), l = rr(8, 36);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
      }
    }, true);

    /* silver hair strand card: vertical strands + angel-ring highlight */
    TEX.hair = mk(128, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#d9e3f1"); g.addColorStop(0.55, "#c8d5e8"); g.addColorStop(1, "#8da2c0");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x = rr(0, w), light = rnd() < 0.55;
        ctx.strokeStyle = light ? "rgba(255,255,255," + rr(0.12, 0.4) + ")" : "rgba(60,80,120," + rr(0.08, 0.25) + ")";
        ctx.lineWidth = rr(0.8, 2.6);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rr(-6, 6), h); ctx.stroke();
      }
      for (const [y, hh, a] of [[0.20, 0.07, 0.65], [0.5, 0.05, 0.3]]) {
        const rg = ctx.createLinearGradient(0, h * (y - hh), 0, h * (y + hh));
        rg.addColorStop(0, "rgba(255,255,255,0)"); rg.addColorStop(0.5, "rgba(255,255,255," + a + ")"); rg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = rg; ctx.fillRect(0, h * (y - hh), w, h * hh * 2);
      }
    });

    /* raincoat cloth: wet navy folds, stitching, red tape straps; emblem variant has the big ring */
    const capePaint = (emblem) => (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#26304a"); g.addColorStop(0.6, "#1b2338"); g.addColorStop(1, "#10151f");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const x = rr(0, w), ww = rr(14, 60), light = rnd() < 0.5;
        const lg = ctx.createLinearGradient(x - ww, 0, x + ww, 0);
        const c = light ? "90,120,160" : "0,0,10";
        lg.addColorStop(0, "rgba(" + c + ",0)"); lg.addColorStop(0.5, "rgba(" + c + "," + (light ? rr(0.10, 0.2) : rr(0.15, 0.3)) + ")"); lg.addColorStop(1, "rgba(" + c + ",0)");
        ctx.fillStyle = lg; ctx.fillRect(x - ww, 0, ww * 2, h);
      }
      for (let i = 0; i < 22; i++) {
        ctx.strokeStyle = "rgba(170,200,235," + rr(0.05, 0.14) + ")"; ctx.lineWidth = rr(0.8, 2);
        const x = rr(0, w); ctx.beginPath(); ctx.moveTo(x, rr(0, h * 0.3)); ctx.lineTo(x + rr(-12, 12), rr(h * 0.5, h)); ctx.stroke();
      }
      /* dirt toward the hem */
      const dg = ctx.createLinearGradient(0, h * 0.7, 0, h);
      dg.addColorStop(0, "rgba(0,0,0,0)"); dg.addColorStop(1, "rgba(6,8,12,0.65)");
      ctx.fillStyle = dg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
      /* red tape straps with notches */
      const tapes = emblem ? [0.08, 0.92] : [0.2, 0.78];
      for (const tx of tapes) {
        const x = tx * w, tw = w * 0.05;
        ctx.fillStyle = "#e0372f"; ctx.fillRect(x - tw / 2, 0, tw, h * 0.94);
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x - tw / 2, 0, tw * 0.22, h * 0.94);
        ctx.fillStyle = "#12161f";
        for (let y = h * 0.1; y < h * 0.9; y += h * 0.13) ctx.fillRect(x - tw * 0.2, y, tw * 0.4, h * 0.012);
      }
      /* stitched seam + patches */
      ctx.setLineDash([6, 7]); ctx.strokeStyle = "rgba(210,225,245,0.35)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.05); ctx.lineTo(w * 0.52, h * 0.8); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "rgba(200,40,38," + rr(0.5, 0.9) + ")";
        ctx.fillRect(rr(w * 0.2, w * 0.8), rr(h * 0.15, h * 0.7), rr(10, 22), rr(6, 16));
      }
      if (emblem) {
        const cx = w * 0.5, cy = h * 0.34, R = w * 0.30;
        ctx.fillStyle = "#e8392f"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1a1f2e"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.68, 0, TAU); ctx.fill();
        ctx.fillStyle = "#e8392f"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.42, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#1a1f2e"; ctx.lineWidth = R * 0.14; ctx.lineCap = "butt";
        ctx.beginPath(); ctx.moveTo(cx - R * 1.05, cy + R * 0.55); ctx.lineTo(cx + R * 1.05, cy - R * 0.55); ctx.stroke();
        ctx.strokeStyle = "rgba(255,200,180,0.5)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.92, 0, TAU); ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = i * TAU / 12; ctx.fillStyle = "#e8392f";
          ctx.fillRect(cx + Math.cos(a) * R * 1.2 - 4, cy + Math.sin(a) * R * 1.2 - 12, 8, 24);
        }
      }
    };
    TEX.cape = mk(512, 512, capePaint(false));
    TEX.capeEmb = mk(512, 512, capePaint(true));
    return TEX;
  }

  /* ==========================================================================
     SHARED MATERIALS (vertex-coloured toon with painted grain; cloth/hair maps)
     ========================================================================== */
  function sharedMats() {
    if (MATS) return MATS;
    const THREE = T(), TX = textures();
    const vc = (side) => {
      const m = A.mat.toon(0xffffff, { noCache: true, side });
      m.vertexColors = true;
      if (TX.grain) m.map = TX.grain;
      m.needsUpdate = true;
      return m;
    };
    const mt = (tex, side) => K.mat.mapToon(0xffffff, tex, { side, transparent: false });
    MATS = {
      lit: vc(THREE.FrontSide), litds: vc(THREE.DoubleSide),
      hair: mt(TX.hair, THREE.DoubleSide),
      cape: mt(TX.cape, THREE.FrontSide), capeEmb: mt(TX.capeEmb, THREE.FrontSide)
    };
    return MATS;
  }

  /* ==========================================================================
     THE BUILDER
     ========================================================================== */
  function buildBeast() {
    const THREE = T(), L = lib(), MT = sharedMats();
    const rig = K.rig({ name: "beast", height: 7.0 });
    const rgb = L.rgb;
    const DSIDE = THREE.DoubleSide;

    /* -- per-instance glow materials (animated by the layer below) ------------- */
    const glowMat = (hex, k) => { const m = new THREE.MeshBasicMaterial({ color: hex }); m.color.multiplyScalar(k); m.userData.base = m.color.clone(); return m; };
    const GM = {
      core: glowMat(C.glowRed, 2.3), coreHot: glowMat(C.glowHot, 3.0),
      eye: glowMat(C.glowRed, 2.2), orb: glowMat(0xff3a2e, 1.8), orbIn: glowMat(0xffd2c4, 2.5), slit: glowMat(0xff9a3a, 2.6),
      mouth: glowMat(0xff5a22, 2.1), rune: glowMat(0xff6a30, 1.9),
      blade: new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true })
    };
    GM.blade.userData.base = GM.blade.color.clone();
    const HM = {  // additive halo shells
      core: K.mat.additive(0xff3a22, 0.30), core2: K.mat.additive(0xff5a30, 0.11),
      eye: K.mat.additive(0xff3a22, 0.30), blade: K.mat.additive(0xff4a1a, 0.20), blade2: K.mat.additive(0xff3a10, 0.09),
      mouth: K.mat.additive(0xff5a22, 0.26)
    };
    for (const k in HM) HM[k].userData.base = HM[k].opacity;
    const MATMAP = { lit: MT.lit, litds: MT.litds, hair: MT.hair, cape: MT.cape, capeEmb: MT.capeEmb };
    for (const k in GM) MATMAP["g_" + k] = GM[k];

    /* -- piece buckets: merged per (bone, material, outline) at flush ---------- */
    const buckets = new Map();
    function put(bone, g, col, o) {
      o = o || {};
      const cls = o.cls || "lit", oc = o.oc || 0;
      const ol = o.ol ? (o.ol <= 0.035 ? 0.03 : 0.05) : 0;
      const key = bone + "|" + cls + "|" + ol + "|" + oc;
      let b = buckets.get(key);
      if (!b) { b = { bone, cls, ol, oc, pieces: [] }; buckets.set(key, b); }
      b.pieces.push({ g, m: o.M || L.mat(o.p, o.r, o.s), col: typeof col === "number" ? rgb(col) : col });
    }
    const _aq = new THREE.Quaternion(), _ae = new THREE.Euler(), _av = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
    const aim = (x, y, z) => { _av.set(x, y, z).normalize(); _aq.setFromUnitVectors(_up, _av); _ae.setFromQuaternion(_aq); return [_ae.x, _ae.y, _ae.z]; };
    const blob = (bone, p, s, col, o) => put(bone, L.sph(), col, Object.assign({ p, s }, o));
    const slab = (bone, p, s, col, o, e) => put(bone, L.box(e || 0.3), col, Object.assign({ p, s }, o));
    const tube = (bone, pts, r, col, lo, o) => put(bone, L.loft(Object.assign({ pts, r }, lo)), col, o);
    const spike = (bone, p, dir, len, r0, col, o, bend) =>
      put(bone, L.horn(len, r0, bend ? bend[0] : 0, bend ? bend[1] : 0, 5), col, Object.assign({ p, r: aim(dir[0], dir[1], dir[2]) }, o));
    const ring = (bone, p, r, t, col, o, rot) => put(bone, L.tor(r, t, TAU, 6, 18), col, Object.assign({ p, r: rot || [PI / 2, 0, 0] }, o));
    /* a flat red/black "circle emblem" (painting's roundel) facing direction n */
    function emblem(bone, p, r, n, o) {
      const rot = aim(n[0], n[1], n[2]), base = L.mat(p, rot, 1);
      const piece = (g, col, dy, s) => put(bone, g, col, Object.assign({}, o, { M: base.clone().multiply(L.mat([0, dy, 0], null, s)) }));
      piece(L.cyl(1, 1, 0.06, 18), C.red, 0, [r, 1, r]);
      piece(L.cyl(1, 1, 0.06, 18), C.inkB, 0.02, [r * 0.66, 1, r * 0.66]);
      piece(L.cyl(1, 1, 0.06, 14), C.red, 0.04, [r * 0.38, 1, r * 0.38]);
      put(bone, L.box(0.1), C.inkB, Object.assign({}, o, { M: base.clone().multiply(L.mat([0, 0.06, 0], [0, 0.55, 0], [r * 2.15, 0.05, r * 0.16])) }));
    }
    /* blossom placed at p, opening toward direction n, radius r */
    function poppy(bone, p, n, r, seed, o) {
      put(bone, L.poppy(r, seed || 0), null, Object.assign({ p, r: aim(n[0], n[1], n[2]) }, o || {}));
    }
    /* glowing lens-eye: red glass sphere with a pale hot centre facing dir */
    function orb(bone, p, r, dir) {
      put(bone, L.sph(), null, { cls: "g_orb", p, s: r });
      const d = Math.hypot(dir[0], dir[1], dir[2]) || 1, n = [dir[0] / d, dir[1] / d, dir[2] / d];
      put(bone, L.sph(), null, { cls: "g_orbIn", p: [p[0] + n[0] * r * 0.62, p[1] + n[1] * r * 0.62, p[2] + n[2] * r * 0.62], s: [r * 0.62, r * 0.62, r * 0.36], r: aim(n[0], n[1], n[2]).map((v, i) => (i === 0 ? v + PI / 2 : v)) });
    }
    /* layered samurai-sode pauldron: three overlapping curved plates stepping down the arm */
    function pauldron(SH, s, top, mid, low) {
      put(SH, L.sq(0.55, 0.75, 14, 8), top, { p: [s * 0.08, 0.34, 0], s: [0.98, 0.5, 0.92], r: [0, 0, -s * 0.28], ol: 0.05 });
      put(SH, L.sq(0.55, 0.75, 14, 8), mid, { p: [s * 0.36, 0.02, 0], s: [0.92, 0.3, 0.88], r: [0, 0, -s * 0.5], ol: 0.05 });
      put(SH, L.sq(0.55, 0.75, 14, 8), low, { p: [s * 0.55, -0.26, 0], s: [0.8, 0.24, 0.8], r: [0, 0, -s * 0.72], ol: 0.05 });
      /* red trim lines along the plate edges */
      put(SH, L.tor(0.88, 0.035, TAU, 5, 22), RED, { p: [s * 0.32, 0.16, 0], r: [PI / 2 - s * 0.3, 0, 0], s: [1, 0.92, 1] });
      put(SH, L.tor(0.8, 0.035, TAU, 5, 22), RED, { p: [s * 0.52, -0.1, 0], r: [PI / 2 - s * 0.55, 0, 0], s: [1, 0.9, 1] });
    }
    /* standing petal fin: base at p, pointing along dir, splay about the fin normal */
    function fin(bone, p, dir, len, wid, seed, col3, o) {
      const c = col3 || [C.redDD, C.redD, C.red];
      const g = L.petal(len, wid, -0.35, -0.55, seed, c[0], c[1], c[2]);
      put(bone, g, null, Object.assign({ p, r: aim(dir[0], dir[1], dir[2]) }, o || { cls: "litds" }));
    }

    /* ======================================================================
       SKELETON
       ====================================================================== */
    let HY = 3.0;
    const hips = rig.bone("hips", null, [0, HY, 0]);
    rig.bone("chest", "hips", [0, 0.50, 0.10], [0.56, 0, 0]);
    rig.bone("neck", "chest", [0, 1.90, 0.05], [-0.42, 0, 0]);
    rig.bone("head", "neck", [0, 0.82, 0.25], [-0.14, 0, 0]);
    rig.bone("jaw", "head", [0, -0.46, 0.20]);
    rig.bone("mouth", "jaw", [0, 0.06, 1.78]);
    rig.bone("core", "chest", [0, 1.02, 0.92]);

    for (const s of [1, -1]) {
      const n = s > 0 ? "L" : "R";
      rig.bone("arm" + n + ".sh", "chest", [s * 1.72, 1.45, -0.05], [-0.22, 0, s * 0.12]);
      rig.bone("arm" + n + ".el", "arm" + n + ".sh", [0, -1.75, 0], [-0.42, 0, 0]);
      rig.bone("arm" + n + ".hand", "arm" + n + ".el", [0, -1.80, 0], [-0.10, s > 0 ? 0 : -0.42, 0]);
      rig.bone("leg" + n + ".hip", "hips", [s * 0.92, -0.12, 0.05], [-0.78, 0, s * 0.03]);
      rig.bone("leg" + n + ".knee", "leg" + n + ".hip", [0, -1.3, 0], [1.62, 0, 0]);
      rig.bone("leg" + n + ".foot", "leg" + n + ".knee", [0, -1.4, 0], [-1.40, 0, 0]);
      rig.bone("leg" + n + ".toe", "leg" + n + ".foot", [0, -1.2, 0], [0.56, 0, 0]);
      rig.bone("sole" + n, "leg" + n + ".toe", [0, -0.27, 0.35]);
    }
    rig.bone("propR", "armR.hand", [0, -0.46, 0.14], [1.72, 0, 0]);
    rig.bone("blade", "propR", [0, 0.78, 0]);
    const BLADE_LEN = 5.3, BLADE_BEND = 0.42;
    rig.bone("bladeTip", "blade", [0, BLADE_LEN, BLADE_BEND]);

    /* tail: 4 chained segments, curling up at the tip */
    const TAILR = [1.25, 0.12, 0.30, 0.45], TAILL = [1.45, 1.40, 1.30, 1.25];
    for (let i = 0; i < 4; i++) {
      rig.bone("tail." + i, i ? "tail." + (i - 1) : "hips", i ? [0, -TAILL[i - 1], 0] : [0, -0.05, -0.80], [TAILR[i], 0, 0], { sway: 0.020 + i * 0.012, phase: i * 0.9 });
    }
    /* olive skirt tatters */
    const SKA = [0.55, -0.55, 1.55, -1.55];
    for (let i = 0; i < 4; i++) {
      const a = SKA[i];
      rig.bone("skirt." + i, "hips", [Math.sin(a) * 1.05, 0.12, Math.cos(a) * 0.95], [-0.10, a, 0], { sway: 0.03, phase: i * 1.3 });
    }
    /* raincoat mantle: 7 hinged torn panels around the shoulders (+ tips) */
    const NCAPE = 7, capeTh = [], capeLen = [];
    for (let i = 0; i < NCAPE; i++) {
      const th = (i - 3) / 3 * 1.30;
      capeTh.push(th);
      capeLen.push(3.6 - Math.abs(th) * 0.9);
      const x = Math.sin(th) * 1.75, z = -Math.cos(th) * 2.15 + Math.abs(th) * 0.5, y = 2.0 - Math.abs(th) * 0.4;
      rig.bone("cape." + i, "chest", [x, y, z], [-0.42, PI - th, th * 0.26], { sway: 0.045, phase: i * 0.8 });
      rig.bone("capeTip." + i, "cape." + i, [0, 0, 0], [0.06, 0, 0], { sway: 0.07, phase: i * 0.8 + 0.7 });
    }
    /* red tape straps hanging off the shoulders / chest */
    const NTAPE = 6;
    const tapePos = [[1.55, 2.0, 0.6], [1.0, 2.1, 0.8], [2.3, 1.9, 0.2], [-1.55, 2.0, 0.6], [-1.0, 2.1, 0.8], [-2.3, 1.9, 0.2]];
    for (let i = 0; i < NTAPE; i++) rig.bone("tape." + i, "chest", tapePos[i], [-0.1, 0, 0], { sway: 0.06, phase: i * 1.1 });
    /* silver mane: 13 back locks + 2 face-framing locks, each with a swaying tip */
    const NMANE = 13, NBACK = 11, maneSpec = [];
    for (let i = 0; i < NMANE; i++) {
      let x, y, z, ry, rz, len, rx;
      if (i < NBACK) {
        const t = i / (NBACK - 1), ph = (t - 0.5) * 2.0;      // -1..1 across the back of the helm
        x = ph * 1.0; y = 0.72 - Math.abs(ph) * 0.22; z = -0.95 + Math.abs(ph) * 0.3;
        ry = ph * -0.28; rz = -ph * 0.32; rx = 0.46 + (1 - Math.abs(ph)) * 0.14; len = 4.0 + 1.9 * (1 - Math.abs(ph) * 0.8) + 0.6 * L.hash(i * 3.1);
      } else {
        const s = i === NBACK ? 1 : -1;
        x = s * 0.98; y = 0.15; z = 0.3; ry = 0; rz = -s * 0.10; rx = -0.08; len = 2.7;
      }
      maneSpec.push({ x, y, z, ry, rz, rx, len, i });
      rig.bone("mane." + i, "head", [x, y, z], [rx, ry, rz], { sway: 0.05, phase: i * 0.55 });
      const t0 = 0.46;
      const j = L.cardJoint({ len, wave: 0.5, ph: i, curve: 0.22, t0 });
      rig.bone("maneTip." + i, "mane." + i, j, [0.10, 0, 0], { sway: 0.10, phase: i * 0.55 + 0.9 });
    }

    /* put the soles on the ground: solve hips height from the bind pose */
    {
      rig.root.updateMatrixWorld(true);
      const v = new THREE.Vector3();
      rig.bones.soleL.getWorldPosition(v);
      const dy = v.y;
      hips.position.y -= dy;
      HY = hips.position.y;
    }

    const PELT = C.pelt, PELT2 = C.pelt2, GREY = C.grey, GREY2 = C.grey2, GREYD = C.greyD, INK = C.ink, BONE = C.bone, RED = C.red;
    const peltGrad = (a, b) => (t) => L.mix(rgb(a), rgb(b), t);
    const ringAlong = (bone, p, dir, r, t, col, o, sc) => {
      const M = L.mat(p, aim(dir[0], dir[1], dir[2]), 1).multiply(L.mat(null, [PI / 2, 0, 0], sc || 1));
      put(bone, L.tor(r, t, TAU, 6, 18), col, Object.assign({ M }, o || {}));
    };

    /* ======================================================================
       HIPS · TAIL ROOT · SKIRT
       ====================================================================== */
    tube("hips", [[0, -0.55, -0.05], [0, 0.0, 0], [0, 0.55, 0]], [[1.0, 0.82], [1.25, 0.95], [1.12, 0.85]], PELT,
      { seg: 14, n: 2.5, ns: 4, cap0: "dome", cap1: "dome" }, { ol: 0.05 });
    blob("hips", [0, -0.15, -0.55], [1.15, 0.78, 0.8], PELT, { ol: 0.05 });
    ring("hips", [0, 0.22, 0.0], 1.14, 0.15, C.inkB, { ol: 0.03 }, [PI / 2, 0, 0]);
    ring("hips", [0, 0.40, 0.0], 1.12, 0.07, RED, null, [PI / 2, 0, 0]);
    slab("hips", [0, 0.26, 1.0], [0.46, 0.34, 0.14], GREY, { ol: 0.03 });
    emblem("hips", [0, 0.26, 1.13], 0.2, [0, 0, 1], { ol: 0 });
    for (const s of [1, -1]) {
      slab("hips", [s * 0.9, 0.3, 0.7], [0.2, 0.3, 0.14], GREYD, { r: [0, s * 0.8, 0] });
      blob("hips", [s * 1.0, -0.1, 0.0], [0.82, 0.8, 0.8], PELT, { ol: 0.05 });
    }
    for (let i = 0; i < 4; i++) {
      const g = L.panel({ w0: 0.9, w1: 1.25, len: 1.35, nx: 6, ny: 5, fold: 0.12, jag: 0.5, seed: i * 2.3 + 1, thick: 0.05, bow: 0.1 });
      put("skirt." + i, g, C.olive, { ol: 0.03 });
    }
    {
      const g = L.panel({ w0: 0.9, w1: 1.3, len: 1.0, nx: 6, ny: 4, fold: 0.1, jag: 0.5, seed: 9, thick: 0.05, bow: 0.1 });
      put("skirt.0", g, C.oliveD, { p: [0, 0, 0.12], ol: 0.03 });
    }

    /* ======================================================================
       LEGS — digitigrade: thigh forward, shin back, long metatarsus, clawed paw
       ====================================================================== */
    for (const s of [1, -1]) {
      const n = s > 0 ? "L" : "R";
      const HIP = "leg" + n + ".hip", KNEE = "leg" + n + ".knee", FOOT = "leg" + n + ".foot", TOE = "leg" + n + ".toe";
      /* thigh haunch */
      tube(HIP, [[0, 0.2, -0.05], [0, -0.4, 0.02], [0, -0.95, 0.06], [0, -1.3, 0.04]],
        [[0.74, 0.80], [0.82, 0.88], [0.62, 0.66], [0.50, 0.52]], PELT, { seg: 12, n: 2.4, ns: 6, cap0: "dome" }, { ol: 0.05 });
      for (let k = 0; k < 4; k++) {
        spike(HIP, [s * (0.55 + 0.04 * k), -0.2 - k * 0.28, -0.1], [s * 0.7, -1, -0.4], 0.6 - k * 0.05, 0.15, PELT2, { ol: 0.03 });
      }
      slab(HIP, [s * 0.58, -0.55, 0.22], [0.1, 0.42, 0.36], GREY, { ol: 0.03, r: [0, 0, s * -0.1] });
      /* knee: ball + kneecap armour with a spike */
      blob(KNEE, [0, 0, 0.05], [0.56, 0.56, 0.56], PELT, { ol: 0.05 });
      slab(KNEE, [0, 0.02, 0.5], [0.46, 0.5, 0.26], GREY, { ol: 0.04, r: [-0.2, 0, 0] });
      spike(KNEE, [0, 0.35, 0.62], [0, 1, 0.6], 0.55, 0.16, BONE, { ol: 0.03 });
      ring(KNEE, [0, 0.0, 0.0], 0.58, 0.07, RED, null, [0, PI / 2, 0]);
      /* shin: back-sloping, calf bulge behind, greave plate in front */
      tube(KNEE, [[0, 0.0, 0], [0, -0.58, -0.05], [0, -1.05, -0.14], [0, -1.4, -0.02]],
        [[0.5, 0.52], [0.58, 0.64], [0.42, 0.5], [0.32, 0.34]], PELT, { seg: 12, n: 2.4, ns: 6 }, { ol: 0.05 });
      tube(KNEE, [[0, -0.2, 0.46], [0, -0.75, 0.44], [0, -1.25, 0.3]], [[0.32, 0.1], [0.34, 0.1], [0.24, 0.08]], GREY,
        { seg: 8, n: 3.5, ns: 4, ref: [0, 0, 1] }, { ol: 0.03 });
      tube(KNEE, [[0, -0.25, 0.54], [0, -0.75, 0.52], [0, -1.2, 0.38]], [[0.08, 0.04], [0.08, 0.04], [0.06, 0.04]], RED, { seg: 6, ns: 4 });
      /* hock: mechanical joint with the roundel + heel spike */
      blob(FOOT, [0, 0, 0], [0.42, 0.42, 0.42], GREYD, { ol: 0.04 });
      emblem(FOOT, [s * 0.4, 0, 0], 0.27, [s, 0, 0], { ol: 0 });
      spike(FOOT, [0, 0.1, -0.32], [0, 0.55, -1], 0.85, 0.17, BONE, { ol: 0.03 });
      tube(FOOT, [[0, 0, 0], [0, -0.6, 0.05], [0, -1.2, 0.0]], [[0.34, 0.36], [0.27, 0.3], [0.34, 0.38]], PELT, { seg: 10, n: 2.4, ns: 5 }, { ol: 0.05 });
      tube(FOOT, [[0, -0.18, 0.3], [0, -0.75, 0.28], [0, -1.1, 0.25]], [[0.2, 0.08], [0.18, 0.08], [0.2, 0.08]], GREY, { seg: 8, n: 3.5, ns: 4 }, { ol: 0.03 });
      ring(FOOT, [0, -0.45, 0.0], 0.3, 0.055, RED, null, [PI / 2, 0, 0]);
      /* paw: pad, three clawed toes, dew claw */
      blob(TOE, [0, -0.1, 0.12], [0.52, 0.3, 0.6], PELT, { ol: 0.05 });
      blob(TOE, [0, -0.1, -0.2], [0.34, 0.28, 0.34], PELT, { ol: 0.04 });
      for (let i = -1; i <= 1; i++) {
        const x = i * 0.34;
        tube(TOE, [[x * 0.7, -0.1, 0.25], [x, -0.12, 0.7], [x * 1.12, -0.15, 1.08]], [[0.22, 0.17], [0.19, 0.15], [0.14, 0.12]], PELT,
          { seg: 8, ns: 4, cap1: "dome", ref: [0, 1, 0] }, { ol: 0.04 });
        spike(TOE, [x * 1.12, -0.15, 1.08], [x * 0.1, -0.3, 1], 0.55, 0.12, BONE, { ol: 0.03 });
        slab(TOE, [x, 0.03, 0.52], [0.15, 0.07, 0.3], GREY, { ol: 0.02 }, 0.4);
      }
      spike(TOE, [0, -0.1, -0.35], [0, 0.4, -1], 0.5, 0.13, BONE, { ol: 0.03 });
    }

    /* ======================================================================
       TAIL — thick, spiked, poppy-finned, bone blade at the tip
       ====================================================================== */
    {
      const rad = [[0.64, 0.6, 0.54, 0.5], [0.52, 0.48, 0.42, 0.4], [0.42, 0.38, 0.3, 0.28], [0.3, 0.27, 0.15, 0.13]];
      for (let i = 0; i < 4; i++) {
        const B = "tail." + i, l = TAILL[i], r = rad[i];
        tube(B, [[0, 0.05, 0], [0, -l * 0.5, 0], [0, -l - 0.05, 0]], [[r[0], r[1]], [(r[0] + r[2]) * 0.5, (r[1] + r[3]) * 0.5], [r[2], r[3]]], PELT,
          { seg: 10, n: 2.4, ns: 4, cap1: i === 3 ? "dome" : undefined }, { ol: 0.05 });
        if (i < 3) blob(B, [0, -l, 0], [r[2] * 1.06, r[2] * 1.06, r[3] * 1.06], PELT, { ol: 0.05 });
        for (let k = 0; k < 3; k++) {
          const y = -0.25 - k * (l / 3.2);
          const rr = r[1] + (r[3] - r[1]) * (k / 3);
          spike(B, [0, y, -rr * 0.85], [0, -0.6, -1], 0.45 + 0.2 * (3 - i) * 0.3, 0.13 * (1 - i * 0.15), INK, { ol: 0.03 });
        }
        fin(B, [0, -0.4, -r[1] * 0.8], [0, -0.55, -1], 1.35 - i * 0.2, 0.42 - i * 0.05, i * 2 + 1);
        if (i < 3) fin(B, [0, -l * 0.62, -r[1] * 0.75], [0.35, -0.5, -1], 1.05 - i * 0.18, 0.34 - i * 0.04, i * 3 + 2);
      }
      /* bone-blade tail tip */
      put("tail.3", L.horn(1.5, 0.3, 0, 0.12, 6), BONE, { p: [0, -TAILL[3] - 0.05, 0], r: [PI + 0.05, 0, 0], s: [1.3, 1, 0.45], ol: 0.04 });
      put("tail.3", L.horn(0.9, 0.2, 0, 0.1, 6), RED, { p: [0, -TAILL[3] - 0.1, 0.1], r: [PI + 0.2, 0, 0], s: [1.0, 1, 0.3] });
    }

    /* ======================================================================
       TORSO — hunched barrel chest, hump, ribcage armour, sternum, core cage
       ====================================================================== */
    tube("chest", [[0, -0.5, 0.0], [0, 0.2, 0.02], [0, 0.85, 0.0], [0, 1.35, -0.05], [0, 1.8, -0.08], [0, 2.15, 0.0]],
      [[0.8, 0.68], [0.96, 0.8], [1.24, 0.92], [1.48, 0.96], [1.34, 0.86], [0.84, 0.66]], PELT,
      { seg: 18, n: 2.6, ns: 10, cap0: "dome", cap1: "dome", col: peltGrad(PELT, 0x2b3a58) }, { ol: 0.05 });
    blob("chest", [0, 1.62, -0.5], [1.35, 0.8, 0.8], PELT, { ol: 0.05 });
    for (const s of [1, -1]) {
      blob("chest", [s * 0.6, 1.2, 0.56], [0.72, 0.56, 0.48], PELT2, { ol: 0.04 });
      blob("chest", [s * 0.45, 0.3, 0.68], [0.56, 0.5, 0.4], PELT2, { ol: 0.04 });
    }
    /* rib plates: bone-metal bands that curve round the chest and part at the sternum */
    {
      const prof = (y) => {
        const ys = [0.2, 0.85, 1.35, 1.8], rx = [0.96, 1.24, 1.48, 1.34], rz = [0.8, 0.92, 0.96, 0.86];
        let i = 0; while (i < 2 && y > ys[i + 1]) i++;
        const f = (y - ys[i]) / (ys[i + 1] - ys[i]);
        return [rx[i] + (rx[i + 1] - rx[i]) * f, rz[i] + (rz[i + 1] - rz[i]) * f];
      };
      for (let i = 0; i < 6; i++) {
        const y = 0.38 + i * 0.22, pr = prof(y), w = 0.13 - i * 0.004;
        for (const s of [1, -1]) {
          const a0 = 0.34 + (i % 2) * 0.05, a1 = 1.7;
          const pts = L.arcPts(0, y, 0, pr[0] * 1.045, pr[1] * 1.05, s * a0, s * a1, 8, (t) => -0.14 * t);
          tube("chest", pts, [[0.07, w], [0.1, w * 1.2], [0.09, w], [0.06, w * 0.8]], GREY, { seg: 6, n: 3, ns: 8, ref: [0, 1, 0], cap0: "dome", cap1: "dome" }, { ol: 0.025 });
        }
      }
      /* sternum plates above/below the core */
      tube("chest", [[0, 1.95, 0.78], [0, 1.65, 1.0], [0, 1.42, 1.04]], [[0.34, 0.1], [0.3, 0.12], [0.2, 0.1]], GREY, { seg: 8, n: 3, ns: 4, ref: [1, 0, 0], cap1: "dome" }, { ol: 0.03 });
      tube("chest", [[0, 0.62, 1.02], [0, 0.3, 1.0], [0, -0.1, 0.85]], [[0.22, 0.1], [0.28, 0.12], [0.34, 0.1]], GREY, { seg: 8, n: 3, ns: 4, ref: [1, 0, 0], cap0: "dome" }, { ol: 0.03 });
      /* collarbones */
      for (const s of [1, -1]) {
        tube("chest", [[s * 0.42, 2.0, 0.6], [s * 1.05, 1.9, 0.74], [s * 1.7, 1.68, 0.44]], [[0.15, 0.13], [0.17, 0.15], [0.18, 0.15]], GREY,
          { seg: 8, n: 3, ns: 6, ref: [0, 1, 0], cap0: "dome", cap1: "dome" }, { ol: 0.03 });
        tube("chest", [[s * 0.52, 2.04, 0.64], [s * 1.05, 1.95, 0.78], [s * 1.65, 1.74, 0.48]], [[0.04, 0.05], [0.05, 0.06], [0.05, 0.06]], RED, { seg: 5, ns: 6, ref: [0, 1, 0] });
      }
    }
    /* thick raincoat collar rolled round the neck base */
    ring("chest", [0, 2.02, 0.12], 0.92, 0.4, C.inkB, { ol: 0.05 }, [PI / 2 - 0.12, 0, 0]);
    ring("chest", [0, 1.9, 0.15], 1.1, 0.2, C.red, null, [PI / 2 - 0.12, 0, 0]);

    /* harness: straps round the back/sides carrying the scabbard */
    for (const [y, rr] of [[0.5, 1.0], [1.5, 1.0]]) {
      const pr = [[0.5, 0.96, 0.8], [1.5, 1.4, 0.94]][y > 1 ? 1 : 0];
      const pts = L.arcPts(0, y, 0, pr[1] * 1.1, pr[2] * 1.16, 1.15, TAU - 1.15, 14);
      tube("chest", pts, [[0.1, 0.17], [0.1, 0.17], [0.1, 0.17]], C.inkB, { seg: 8, n: 3, ns: 14, ref: [0, 1, 0] }, { ol: 0.03 });
      tube("chest", pts, [[0.115, 0.05], [0.115, 0.05], [0.115, 0.05]], RED, { seg: 6, n: 3, ns: 14, ref: [0, 1, 0] });
    }
    /* scabbard: long black lacquered sheath with red binding, metal mouth + cap */
    {
      const SP = [[1.35, 0.15, -1.18], [0.45, 1.4, -1.3], [-0.55, 2.7, -1.38], [-1.55, 3.9, -1.42]];
      tube("chest", SP, [[0.2, 0.15], [0.24, 0.17], [0.24, 0.17], [0.2, 0.15]], C.inkB, { seg: 8, n: 3, ns: 12, cap0: "flat", cap1: "flat", ref: [0, 0, 1] }, { ol: 0.04 });
      const dir = [SP[3][0] - SP[0][0], SP[3][1] - SP[0][1], SP[3][2] - SP[0][2]];
      const dl = Math.hypot(dir[0], dir[1], dir[2]);
      for (let k = 0; k < 6; k++) {
        const t = 0.1 + k * 0.15, p = [SP[0][0] + dir[0] * t, SP[0][1] + dir[1] * t, SP[0][2] + dir[2] * t];
        ringAlong("chest", p, dir, 0.27, 0.05, RED, null, [1, 1, 0.8]);
        if (k % 2 === 0) ringAlong("chest", [p[0] + dir[0] * 0.015, p[1] + dir[1] * 0.015, p[2]], dir, 0.28, 0.025, INK, null, [1, 1, 0.8]);
      }
      ringAlong("chest", [SP[0][0] + dir[0] * 0.02, SP[0][1] + dir[1] * 0.02, SP[0][2]], dir, 0.29, 0.1, GREY, { ol: 0.02 }, [1, 1, 0.8]);
      ringAlong("chest", [SP[3][0] - dir[0] * 0.03, SP[3][1] - dir[1] * 0.03, SP[3][2]], dir, 0.27, 0.12, GREY, { ol: 0.02 }, [1, 1, 0.8]);
      blob("chest", [SP[3][0], SP[3][1], SP[3][2]], [0.28, 0.28, 0.2], GREYD, { ol: 0.03 });
      /* dangling red cord */
      tube("chest", [[SP[3][0], SP[3][1], SP[3][2]], [SP[3][0] - 0.5, SP[3][1] + 0.1, SP[3][2] - 0.4], [SP[3][0] - 1.0, SP[3][1] - 0.9, SP[3][2] - 0.5]], [[0.04, 0.04], [0.04, 0.04], [0.03, 0.03]], RED, { seg: 5, ns: 6 });
    }
    /* spine: red poppy fins from the nape to the tail root */
    {
      const ys = [1.95, 1.62, 1.28, 0.95, 0.62, 0.3, -0.05];
      for (let i = 0; i < ys.length; i++) {
        const y = ys[i], sz = 1.2 - i * 0.1;
        const zb = -(0.7 + 0.28 * Math.min(1, i / 2)) - (i === 0 ? 0.2 : 0);
        fin("chest", [0, y, i < 2 ? zb - 0.55 : -0.9 - 0.04 * i], [0, 0.5, -1], 1.15 * sz, 0.42 * sz, i * 1.7);
        fin("chest", [0.05, y - 0.08, i < 2 ? zb - 0.5 : -0.88 - 0.04 * i], [0.55, 0.45, -0.8], 0.8 * sz, 0.3 * sz, i * 2.9 + 1);
        fin("chest", [-0.05, y - 0.08, i < 2 ? zb - 0.5 : -0.88 - 0.04 * i], [-0.55, 0.45, -0.8], 0.8 * sz, 0.3 * sz, i * 3.3 + 2);
      }
      poppy("chest", [0, 1.75, -1.5], [0, 0.7, -1], 0.62, 3);
      poppy("chest", [0.9, 1.55, -1.3], [0.6, 0.7, -0.6], 0.5, 5);
      poppy("chest", [-0.9, 1.55, -1.3], [-0.6, 0.7, -0.6], 0.5, 6);
    }

    /* ======================================================================
       CORE — glowing chest core (weak point) in a cage wrapped with red wire
       ====================================================================== */
    put("core", L.sph(), null, { cls: "g_core", p: [0, 0, 0], s: 0.44 });
    put("core", L.sph(), null, { cls: "g_coreHot", p: [0, 0, 0.06], s: 0.26 });
    {
      const mkHalo = (mat, r, o) => {
        const m = new THREE.Mesh(L.sph(), mat);
        m.scale.setScalar(r); m.userData.noOutline = true; m.castShadow = false; m.receiveShadow = false; m.renderOrder = 6;
        rig.attach("core", m); return m;
      };
      mkHalo(HM.core, 0.62); mkHalo(HM.core2, 1.0);
      const sp = A.glowSprite(0xff5a3a, 3.4, 0.55); rig.attach("core", sp);
    }
    ring("core", [0, 0, 0], 0.54, 0.075, GREYD, { ol: 0.03 }, [0, 0, 0]);
    ring("core", [0, 0, 0], 0.56, 0.06, GREY, { ol: 0.03 }, [PI / 2, 0, 0.5]);
    ring("core", [0, 0, 0], 0.56, 0.06, GREYD, { ol: 0.03 }, [0.6, 0.9, 0]);
    ring("core", [0, 0, 0.02], 0.7, 0.14, GREY, { ol: 0.035 }, [0, 0, 0]);
    for (let k = 0; k < 5; k++) { // wire windings + cables
      const a = k * 1.3;
      tube("core", L.arcPts(0, 0, 0, 0.5, 0.5, 0.2 + a, 2.3 + a, 8, (t) => Math.sin(t * PI) * 0.18 * (k % 2 ? 1 : -1)).map((p) => [p[0], p[2] * 0.2 + p[1], p[2]]),
        [[0.035, 0.035], [0.035, 0.035]], RED, { seg: 5, ns: 8 });
    }
    for (const s of [1, -1]) {
      tube("chest", [[s * 0.55, 1.05, 1.0], [s * 0.9, 1.6, 1.08], [s * 1.5, 1.85, 0.85], [s * 2.0, 2.0, 0.5]], [[0.05, 0.05], [0.05, 0.05], [0.05, 0.05], [0.04, 0.04]], RED, { seg: 5, ns: 10 });
      tube("chest", [[s * 0.5, 0.95, 1.0], [s * 1.0, 0.55, 1.05], [s * 1.35, 0.1, 0.95]], [[0.05, 0.05], [0.05, 0.05], [0.04, 0.04]], RED, { seg: 5, ns: 8 });
    }

    /* ======================================================================
       NECK + HEAD
       ====================================================================== */
    tube("neck", [[0, -0.45, -0.15], [0, 0.25, 0.08], [0, 0.65, 0.3]], [[0.8, 0.74], [0.68, 0.64], [0.64, 0.6]], PELT, { seg: 12, n: 2.4, ns: 5 }, { ol: 0.05 });
    /* cranium + muzzle */
    blob("head", [0, 0.02, -0.05], [1.0, 0.86, 1.05], PELT, { ol: 0.05 });
    tube("head", [[0, -0.05, 0.4], [0, -0.22, 1.1], [0, -0.38, 1.85]], [[0.66, 0.54], [0.54, 0.46], [0.48, 0.4]], PELT,
      { seg: 12, n: 2.6, ns: 5, ref: [0, 1, 0], cap1: "dome" }, { ol: 0.05 });
    blob("head", [0, -0.32, 2.0], [0.46, 0.34, 0.3], INK, { ol: 0.03 });
    for (const s of [1, -1]) blob("head", [s * 0.17, -0.27, 2.2], [0.09, 0.11, 0.06], C.redDD, {});
    /* nose-bridge armour + red stripe */
    tube("head", [[0, 0.36, 0.35], [0, 0.2, 1.2], [0, 0.0, 1.95]], [[0.36, 0.1], [0.3, 0.09], [0.22, 0.08]], GREY, { seg: 8, n: 3, ns: 5, ref: [0, 1, 0], cap1: "dome" }, { ol: 0.03 });
    tube("head", [[0, 0.46, 0.4], [0, 0.29, 1.2], [0, 0.09, 1.98]], [[0.08, 0.04], [0.07, 0.04], [0.06, 0.04]], RED, { seg: 5, ns: 5, ref: [0, 1, 0] });
    for (const s of [1, -1]) {
      slab("head", [s * 0.66, -0.2, 1.0], [0.1, 0.3, 0.7], GREY, { ol: 0.03, r: [0, s * 0.12, 0] });
      slab("head", [s * 0.72, -0.12, 1.2], [0.05, 0.1, 0.3], RED, { r: [0, s * 0.12, 0] });
      /* brow ridge + glowing slit eyes under the hammer */
      slab("head", [s * 0.5, 0.2, 0.92], [0.42, 0.14, 0.34], INK, { r: [0.1, 0, s * 0.25] });
      put("head", L.sph(), null, { cls: "g_slit", p: [s * 0.5, 0.05, 1.06], r: [0, s * 0.2, s * 0.38], s: [0.3, 0.075, 0.07] });
      put("head", L.sph(), null, { cls: "g_slit", p: [s * 0.5, 0.05, 1.04], r: [0, s * 0.2, s * 0.38], s: [0.2, 0.05, 0.05] });
    }
    for (let i = -3; i <= 3; i++) {
      const big = Math.abs(i) === 3;
      spike("head", [i * 0.15, -0.58 + Math.abs(i) * 0.01, 1.8 - Math.abs(i) * 0.1], [0, -1, 0.2], big ? 0.55 : 0.33, big ? 0.1 : 0.075, BONE, { ol: 0.02 });
    }
    /* ---- the hammerhead helm ---- */
    {
      const dark = (t, a) => { const v = Math.cos(a); const k = Math.max(0, Math.min(1, (-v - 0.05) / 0.5)); return L.mix([1, 1, 1], [0.22, 0.26, 0.34], k); };
      const HW = 1.62;
      /* the swept hammer shell */
      tube("head", [[-HW, 0.5, 0.42], [-HW * 0.55, 0.62, 0.34], [0, 0.68, 0.3], [HW * 0.55, 0.62, 0.34], [HW, 0.5, 0.42]],
        [[0.2, 0.46], [0.34, 0.9], [0.42, 1.12], [0.34, 0.9], [0.2, 0.46]], GREY,
        { seg: 16, n: 3.0, ns: 10, ref: [0, 0, 1], cap0: "dome", cap1: "dome", colA: dark }, { ol: 0.05 });
      /* brow visor dropping over the face + domed crown */
      slab("head", [0, 0.28, 1.28], [0.78, 0.2, 0.34], GREY2, { ol: 0.04, r: [0.35, 0, 0] });
      blob("head", [0, 0.98, 0.1], [0.95, 0.42, 0.95], GREY, { ol: 0.04 });
      emblem("head", [0, 1.38, 0.14], 0.34, [0, 1, -0.14], { ol: 0 });
      for (const s of [1, -1]) {
        /* hammer-tip lens units */
        ring("head", [s * HW * 0.93, 0.5, 0.86], 0.34, 0.1, GREYD, { ol: 0.03 }, [0, s * 0.2, 0]);
        put("head", L.sph(), null, { cls: "g_eye", p: [s * HW * 0.93, 0.5, 0.88], s: [0.27, 0.27, 0.22] });
        put("head", L.sph(), null, { cls: "g_orbIn", p: [s * HW * 0.93, 0.5, 0.98], s: [0.14, 0.14, 0.08] });
        /* side hinge turret (the painting's camera-lens pod) */
        put("head", L.cyl(0.26, 0.26, 0.34, 12), C.inkB, { p: [s * 1.0, 0.92, 0.7], r: [0, 0, PI / 2], ol: 0.03 });
        put("head", L.cyl(0.17, 0.17, 0.36, 12), null, { cls: "g_eye", p: [s * 1.16, 0.92, 0.7], r: [0, 0, PI / 2] });
        /* cheek guards drooping beside the face */
        slab("head", [s * 0.9, -0.14, 0.4], [0.08, 0.6, 0.5], GREY, { ol: 0.03, r: [0, 0, s * -0.06] });
        slab("head", [s * 0.97, 0.05, 0.58], [0.04, 0.2, 0.28], RED, { r: [0, 0, s * -0.06] });
        /* chipped red paint along the rim */
        slab("head", [s * 1.2, 0.98, 0.3], [0.4, 0.04, 0.4], RED, { r: [0.0, s * -0.2, s * -0.12] });
        slab("head", [s * 0.6, 1.1, 0.62], [0.26, 0.03, 0.2], RED, { r: [0.05, s * 0.3, 0.0] });
        /* horns sweep up and back */
        tube("head", [[s * 0.75, 0.9, -0.25], [s * 1.1, 1.4, -0.6], [s * 1.75, 1.75, -1.2], [s * 2.55, 1.7, -2.0]],
          [[0.32, 0.32], [0.26, 0.26], [0.17, 0.17], [0.02, 0.02]], BONE,
          { seg: 8, ns: 16, cap1: "dome", col: (t) => (t < 0.14 ? rgb(0x4a5b78) : (Math.abs(t - 0.4) < 0.05 || Math.abs(t - 0.58) < 0.045) ? rgb(C.red) : rgb(BONE)) }, { ol: 0.04 });
        spike("head", [s * 1.55, 0.66, 0.78], [s * 0.5, 0.45, 1], 0.7, 0.13, BONE, { ol: 0.03 });
      }
      /* neck guard flaring down the back of the helm */
      slab("head", [0, 0.2, -1.0], [1.25, 0.55, 0.12], GREY, { ol: 0.04, r: [0.45, 0, 0] });
      slab("head", [0, -0.12, -1.22], [1.1, 0.04, 0.06], RED, { r: [0.45, 0, 0] });
      /* crown of glowing lens-eyes on stalks */
      const orbs = [[0.6, 1.36, -0.2, 0.28], [1.0, 1.16, 0.2, 0.22], [0.25, 1.55, -0.5, 0.2], [-0.5, 1.4, -0.12, 0.25], [-0.95, 1.16, 0.18, 0.2], [0.0, 1.34, -0.62, 0.18], [-0.35, 1.58, -0.4, 0.19]];
      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i], r = o[3];
        orb("head", [o[0], o[1], o[2]], r, [o[0] * 0.3, 0.35, 1]);
        ring("head", [o[0], o[1] - r * 0.7, o[2]], r * 0.85, r * 0.2, GREYD, { ol: 0.02 }, [PI / 2 + 0.25, 0, 0]);
        tube("head", [[o[0] * 0.8, 0.95, o[2] * 0.7], [o[0] * 0.9, (0.95 + o[1] - r) * 0.5, o[2] * 0.85], [o[0], o[1] - r * 0.9, o[2]]], [[0.09, 0.09], [0.08, 0.08], [0.1, 0.1]], GREYD, { seg: 6, ns: 4 });
        tube("head", [[o[0], o[1] - r, o[2]], [o[0] * 1.1 + 0.2, o[1] - 0.9, o[2] - 0.5], [o[0] * 1.2 + 0.3, o[1] - 1.8, o[2] - 0.7]], [[0.03, 0.03], [0.03, 0.03], [0.03, 0.03]], RED, { seg: 4, ns: 6 });
      }
    }
    /* ---- lower jaw with tusks and a furnace mouth ---- */
    tube("jaw", [[0, -0.02, 0.0], [0, -0.14, 0.75], [0, -0.05, 1.45], [0, 0.1, 1.78]], [[0.62, 0.3], [0.56, 0.26], [0.46, 0.22], [0.36, 0.2]], PELT,
      { seg: 12, n: 2.6, ns: 6, ref: [0, 1, 0], cap1: "dome" }, { ol: 0.05 });
    slab("jaw", [0, -0.22, 1.5], [0.4, 0.14, 0.36], GREY, { ol: 0.03 });
    for (const s of [1, -1]) {
      for (let k = 0; k < 6; k++) {
        const z = 0.55 + k * 0.22, x = s * (0.5 - k * 0.025);
        spike("jaw", [x, 0.14, z], [0, 1, 0.1], 0.2 + 0.16 * ((k * 7) % 3) / 2, 0.075, BONE, { ol: 0.02 });
      }
      tube("jaw", [[s * 0.48, 0.1, 1.45], [s * 0.66, 0.5, 1.72], [s * 0.78, 1.0, 1.72], [s * 0.66, 1.55, 1.45]],
        [[0.16, 0.16], [0.13, 0.13], [0.08, 0.08], [0.02, 0.02]], BONE, { seg: 8, ns: 10, cap1: "dome" }, { ol: 0.035 });
      ring("jaw", [s * 0.5, 0.18, 1.5], 0.17, 0.05, RED, null, [PI / 2, 0, 0]);
    }
    put("jaw", L.sph(), null, { cls: "g_mouth", p: [0, 0.07, 0.95], s: [0.44, 0.09, 0.8] });
    put("head", L.sph(), null, { cls: "g_mouth", p: [0, -0.58, 1.1], s: [0.42, 0.06, 0.7] });
    {
      const m = new THREE.Mesh(L.sph(), HM.mouth);
      m.scale.set(0.42, 0.3, 0.55); m.userData.noOutline = true; m.castShadow = false; m.receiveShadow = false; m.renderOrder = 6;
      rig.attach("mouth", m);
    }

    /* ======================================================================
       RIGHT ARM (−X) — the MECHANICAL sword arm: grey plates, red roundel joints
       ====================================================================== */
    {
      const SH = "armR.sh", EL = "armR.el", HD = "armR.hand", PR = "propR";
      blob(SH, [0, 0, 0], [0.84, 0.82, 0.82], GREYD, { ol: 0.05 });
      pauldron(SH, -1, GREY, GREY2, GREY);
      emblem(SH, [-1.0, 0.05, 0.05], 0.36, [-1, 0.5, 0.08], { ol: 0 });
      slab(SH, [0.05, 0.5, 0.78], [0.5, 0.32, 0.12], GREYD, { ol: 0.03, r: [0.5, 0, 0] });
      /* crown of lens-orbs growing from the shoulder (codex3) */
      const so = [[0.15, 0.98, 0.1, 0.28, [0.3, 0.6, 1]], [-0.45, 0.85, 0.35, 0.21, [-0.2, 0.5, 1]], [0.5, 0.84, -0.3, 0.19, [0.5, 0.4, 0.8]], [-0.32, 0.92, -0.38, 0.22, [-0.3, 0.5, 0.6]]];
      for (const o of so) {
        orb(SH, [o[0], o[1], o[2]], o[3], o[4]);
        ring(SH, [o[0], o[1] - o[3] * 0.7, o[2]], o[3] * 0.85, o[3] * 0.2, GREYD, { ol: 0.02 }, [PI / 2, 0, 0]);
        tube(SH, [[o[0] * 0.5, 0.42, o[2] * 0.6], [o[0] * 0.8, o[1] * 0.7, o[2] * 0.9], [o[0], o[1] - o[3] * 0.8, o[2]]], [[0.1, 0.1], [0.08, 0.08], [0.09, 0.09]], GREYD, { seg: 6, ns: 4 });
        tube(SH, [[o[0], o[1] - o[3], o[2]], [o[0] - 0.4, o[1] - 0.8, o[2] + 0.3], [o[0] - 0.7, o[1] - 1.7, o[2] + 0.5]], [[0.03, 0.03], [0.03, 0.03], [0.03, 0.03]], RED, { seg: 4, ns: 6 });
      }
      poppy(SH, [0.3, 0.6, -0.65], [0.3, 0.7, -1], 0.55, 11);
      /* upper arm: hydraulic sleeve */
      tube(SH, [[0, -0.1, 0], [0, -0.9, 0.03], [0, -1.78, 0]], [[0.64, 0.6], [0.62, 0.58], [0.54, 0.5]], GREY2, { seg: 12, n: 3.2, ns: 5 }, { ol: 0.05 });
      ring(SH, [0, -0.45, 0], 0.68, 0.09, GREYD, { ol: 0.03 }, [PI / 2, 0, 0]);
      ring(SH, [0, -0.58, 0], 0.68, 0.06, RED, null, [PI / 2, 0, 0]);
      ring(SH, [0, -1.35, 0], 0.62, 0.1, GREYD, { ol: 0.03 }, [PI / 2, 0, 0]);
      for (const x of [-0.3, 0.3]) put(SH, L.cyl(0.07, 0.07, 1.1, 8), C.steel, { p: [x, -0.95, 0.56], r: [0.05, 0, 0], ol: 0.02 });
      slab(SH, [-0.45, -0.9, 0.1], [0.12, 0.5, 0.36], GREY, { ol: 0.03 });
      /* elbow */
      blob(EL, [0, 0, 0], [0.6, 0.6, 0.6], GREYD, { ol: 0.05 });
      emblem(EL, [-0.58, 0, 0], 0.3, [-1, 0, 0], { ol: 0 });
      spike(EL, [0, 0.08, -0.5], [0, 0.45, -1], 0.9, 0.2, GREY, { ol: 0.03 });
      /* forearm gauntlet */
      tube(EL, [[0, 0, 0], [0, -0.65, 0.05], [0, -1.2, 0.06], [0, -1.82, 0]], [[0.56, 0.52], [0.7, 0.63], [0.64, 0.58], [0.46, 0.42]], GREY2, { seg: 12, n: 3.2, ns: 6 }, { ol: 0.05 });
      slab(EL, [-0.55, -0.85, 0.05], [0.14, 0.62, 0.42], GREY, { ol: 0.03 });
      slab(EL, [0, -0.8, 0.64], [0.34, 0.5, 0.1], GREY, { ol: 0.03 });
      ring(EL, [0, -0.4, 0.0], 0.64, 0.08, GREYD, { ol: 0.03 }, [PI / 2, 0, 0]);
      ring(EL, [0, -1.5, 0.0], 0.5, 0.07, RED, null, [PI / 2, 0, 0]);
      ring(EL, [0, -1.62, 0.0], 0.5, 0.07, GREYD, { ol: 0.02 }, [PI / 2, 0, 0]);
      for (const z of [-0.26, 0.26]) put(EL, L.cyl(0.06, 0.06, 1.0, 8), C.steel, { p: [0.4, -0.9, z], ol: 0.02 });
      for (let k = 0; k < 4; k++) slab(EL, [0.5, -0.5 - k * 0.2, 0.0], [0.05, 0.06, 0.34], INK, {});
      /* wrist + back of hand */
      ring(HD, [0, 0, 0], 0.5, 0.13, GREYD, { ol: 0.03 }, [PI / 2, 0, 0]);
      slab(HD, [0, -0.3, -0.05], [0.44, 0.34, 0.34], GREY, { ol: 0.04 });
      emblem(HD, [-0.42, -0.25, 0.0], 0.17, [-1, 0, 0], { ol: 0 });
      /* ---- the fist around the hilt (lives on propR so wrist twists carry it) ---- */
      slab(PR, [0, 0.02, -0.28], [0.34, 0.5, 0.26], GREY, { ol: 0.04 });
      for (let k = 0; k < 4; k++) {
        const y = -0.33 + k * 0.22;
        const pts = L.arcPts(0, y, 0, 0.27, 0.27, -2.15, 2.15, 7);
        tube(PR, pts, [[0.11, 0.1], [0.12, 0.11], [0.11, 0.1]], GREY, { seg: 7, n: 2.6, ns: 7, ref: [0, 1, 0], cap0: "dome", cap1: "dome" }, { ol: 0.03 });
        put(PR, L.sph(), RED, { p: [0, y, 0.38], s: [0.12, 0.1, 0.1] });
      }
      tube(PR, L.arcPts(0, 0.62, 0, 0.26, 0.26, 2.4, -0.9, 7, (t) => -0.28 * t), [[0.13, 0.12], [0.12, 0.11], [0.09, 0.08]], GREYD, { seg: 7, ns: 7, cap1: "dome", ref: [0, 1, 0] }, { ol: 0.03 });
      /* ---- the greatsword hilt + guard ---- */
      tube(PR, [[0, -0.72, 0], [0, 0.66, 0]], [[0.12, 0.12], [0.135, 0.135], [0.12, 0.12]], C.inkB, { seg: 8, ns: 3, cap0: "dome" }, { ol: 0.03 });
      for (let k = 0; k < 7; k++) ring(PR, [0, -0.62 + k * 0.17, 0], 0.145, 0.032, RED, null, [PI / 2, 0, 0]);
      blob(PR, [0, -0.78, 0], [0.22, 0.17, 0.22], GREYD, { ol: 0.03 });
      put(PR, L.sph(), null, { cls: "g_rune", p: [0, -0.9, 0], s: [0.1, 0.07, 0.1] });
      slab(PR, [0, 0.74, 0], [0.7, 0.1, 0.42], GREYD, { ol: 0.04 }, 0.35);
      slab(PR, [0, 0.8, 0], [0.5, 0.05, 0.3], RED, {}, 0.35);
      for (const s of [1, -1]) {
        spike(PR, [s * 0.6, 0.76, 0], [s * 1, 0.55, 0], 0.55, 0.11, GREY, { ol: 0.03 });
        put(PR, L.sph(), null, { cls: "g_rune", p: [s * 0.4, 0.8, 0.0], s: 0.07 });
      }
      slab(PR, [0, 0.95, 0], [0.2, 0.15, 0.13], GREY, { ol: 0.02 });
      /* ---- the BLADE (frame origin at the blade base) ---- */
      {
        const BP = [[0, 0, 0], [0, 1.3, 0.01], [0, 2.7, 0.06], [0, 4.0, 0.17], [0, BLADE_LEN, BLADE_BEND]];
        const rz = [0.26, 0.27, 0.27, 0.265, 0.26, 0.25, 0.24, 0.225, 0.2, 0.17, 0.12, 0.06, 0.012];
        const rx = [0.075, 0.075, 0.074, 0.07, 0.066, 0.062, 0.058, 0.052, 0.045, 0.036, 0.026, 0.016, 0.006];
        const R = rz.map((z, i) => [rx[i], z]);
        const spine = [1.5, 0.10, 0.04], mid = [2.4, 0.52, 0.12], edge = [3.4, 2.1, 0.7];
        const g = L.loft({ pts: BP, r: R, ns: 22, sec: [[-1, -1], [1, -1], [1, 0.25], [0, 1], [-1, 0.25]], secCol: [spine, spine, mid, edge, mid], cap1: "flat", tileV: 0.1 });
        const mesh = K.mk(g, GM.blade, { shadow: false }); mesh.userData.noOutline = true; mesh.userData.keep = true;
        rig.attach("blade", mesh);
        const halo = (mat, kx, kz, ro) => {
          const R2 = R.map((r) => [r[0] * kx + 0.05, r[1] * kz + 0.03]);
          const h = new THREE.Mesh(L.loft({ pts: BP, r: R2, ns: 14, seg: 10, cap0: "dome", cap1: "dome" }), mat);
          h.userData.noOutline = true; h.castShadow = false; h.receiveShadow = false; h.renderOrder = ro; h.userData.keep = true;
          rig.attach("blade", h);
        };
        halo(HM.blade, 2.6, 1.16, 6); halo(HM.blade2, 6.5, 1.5, 6);
        const ts = A.glowSprite(0xff7a3a, 2.2, 0.7); rig.attach("bladeTip", ts);
        const bs = A.glowSprite(0xff6a2a, 1.6, 0.4); bs.position.set(0, 0.6, 0); rig.attach("blade", bs);
      }
    }

    /* ======================================================================
       LEFT ARM (+X) — the ORGANIC arm: pelted muscle, bone pauldron, claws
       ====================================================================== */
    {
      const SH = "armL.sh", EL = "armL.el", HD = "armL.hand";
      blob(SH, [0, 0, 0], [0.88, 0.85, 0.85], PELT, { ol: 0.05 });
      pauldron(SH, 1, GREY, GREY2, GREY);
      for (let k = 0; k < 4; k++) spike(SH, [0.2 + k * 0.2, 0.6 + (k % 2) * 0.1, -0.3 + k * 0.2], [0.3, 1, 0.1 * k - 0.1], 0.65 + 0.2 * (k % 2), 0.15, BONE, { ol: 0.03 });
      slab(SH, [0.1, 0.5, 0.78], [0.5, 0.32, 0.12], GREYD, { ol: 0.03, r: [0.5, 0, 0] });
      emblem(SH, [1.0, 0.05, 0.05], 0.3, [1, 0.5, 0.08], { ol: 0 });
      poppy(SH, [0.2, 0.8, -0.45], [0.3, 1, -0.6], 0.62, 21);
      poppy(SH, [0.75, 0.62, 0.35], [1, 0.9, 0.3], 0.5, 22);
      poppy(SH, [-0.2, 0.7, 0.5], [0, 1, 0.8], 0.42, 23);
      for (const o of [[0.1, 0.95, 0.15, 0.25, [0.2, 0.6, 1]], [0.55, 0.8, -0.25, 0.19, [0.5, 0.4, 0.5]]]) {
        orb(SH, [o[0], o[1], o[2]], o[3], o[4]);
        tube(SH, [[o[0] * 0.5, 0.45, o[2] * 0.6], [o[0], o[1] - o[3] * 0.8, o[2]]], [[0.09, 0.09], [0.1, 0.1]], GREYD, { seg: 6, ns: 3 });
      }
      tube(SH, [[0, -0.1, 0], [0, -0.9, 0.04], [0, -1.78, 0]], [[0.68, 0.64], [0.72, 0.66], [0.58, 0.54]], PELT, { seg: 12, n: 2.4, ns: 5, col: peltGrad(PELT, 0x2a3a58) }, { ol: 0.05 });
      for (let k = 0; k < 5; k++) spike(SH, [0.55, -0.2 - k * 0.3, -0.35], [0.5, -1, -0.5], 0.55, 0.15, PELT2, { ol: 0.03 });
      ring(SH, [0, -0.45, 0], 0.74, 0.08, RED, null, [PI / 2, 0, 0]);
      slab(SH, [0.5, -0.9, 0.2], [0.12, 0.36, 0.3], GREY, { ol: 0.03 }, 0.4);
      blob(EL, [0, 0, 0], [0.62, 0.62, 0.62], PELT, { ol: 0.05 });
      spike(EL, [0.05, 0.1, -0.52], [0.3, 0.45, -1], 1.0, 0.22, BONE, { ol: 0.035 });
      slab(EL, [0, 0.0, 0.55], [0.4, 0.4, 0.18], GREY, { ol: 0.03 });
      tube(EL, [[0, 0, 0], [0, -0.65, 0.05], [0, -1.2, 0.06], [0, -1.82, 0]], [[0.58, 0.54], [0.72, 0.66], [0.64, 0.6], [0.44, 0.4]], PELT, { seg: 12, n: 2.4, ns: 6, col: peltGrad(PELT, 0x2a3a58) }, { ol: 0.05 });
      for (let k = 0; k < 4; k++) spike(EL, [0.55, -0.4 - k * 0.32, -0.3], [0.5, -1, -0.5], 0.5, 0.14, PELT2, { ol: 0.03 });
      ring(EL, [0, -1.5, 0.0], 0.5, 0.09, RED, null, [PI / 2, 0, 0]);
      ring(EL, [0, -1.66, 0.0], 0.46, 0.08, C.inkB, { ol: 0.02 }, [PI / 2, 0, 0]);
      slab(EL, [0.3, -0.95, 0.45], [0.26, 0.48, 0.1], GREY, { ol: 0.03 });
      /* hand: broad palm, four clawed fingers, thumb */
      blob(HD, [0, -0.34, 0.04], [0.5, 0.52, 0.36], PELT, { ol: 0.05 });
      slab(HD, [0, -0.2, -0.3], [0.36, 0.34, 0.12], GREY, { ol: 0.03 });
      for (let i = 0; i < 4; i++) {
        const x = -0.33 + i * 0.22, len = 1.0 + (i === 1 || i === 2 ? 0.14 : 0);
        tube(HD, [[x, -0.62, 0.08], [x * 1.05, -0.62 - len * 0.5, 0.22], [x * 1.1, -0.62 - len * 0.95, 0.12]], [[0.125, 0.11], [0.1, 0.09], [0.08, 0.07]], PELT, { seg: 7, ns: 5, cap1: "dome" }, { ol: 0.04 });
        spike(HD, [x * 1.1, -0.62 - len * 0.95, 0.12], [0, -1, 0.5], 0.62, 0.095, BONE, { ol: 0.03 });
        put(HD, L.sph(), GREY, { p: [x, -0.7, 0.2], s: [0.1, 0.07, 0.07] });
      }
      tube(HD, [[0.38, -0.3, 0.1], [0.62, -0.62, 0.28], [0.55, -0.95, 0.45]], [[0.15, 0.13], [0.12, 0.1], [0.09, 0.08]], PELT, { seg: 7, ns: 4, cap1: "dome" }, { ol: 0.04 });
      spike(HD, [0.55, -0.95, 0.45], [0, -0.7, 1], 0.5, 0.09, BONE, { ol: 0.03 });
    }

    /* ======================================================================
       CLOTH — shredded raincoat mantle (7 hinged panels), tape straps, mane
       ====================================================================== */
    for (let i = 0; i < NCAPE; i++) {
      const th = capeTh[i], len = capeLen[i], mid = 1 - Math.abs(th) / 1.3;
      const base = { w0: 1.05 + mid * 0.3, w1: 1.65 + mid * 0.2, len, nx: 6, ny: 4, fold: 0.17, seed: i * 1.9 + 0.5, bow: 0.18, thick: 0.05, jag: 0.5 };
      const up = L.panel(Object.assign({ v0: 0, v1: 0.5 }, base));
      const lo = L.panel(Object.assign({ v0: 0.5, v1: 1 }, base));
      const J = lo.userData.top;
      lo.translate(-J[0], -J[1], -J[2]);
      rig.bones["capeTip." + i].position.set(J[0], J[1], J[2]);
      const cls = i === 3 ? "capeEmb" : "cape";
      put("cape." + i, up, null, { cls, ol: 0.04 });
      put("capeTip." + i, lo, null, { cls, ol: 0.04 });
    }
    for (let i = 0; i < NTAPE; i++) {
      const len = 2.4 + (i % 3) * 0.6;
      put("tape." + i, L.ribbon(0.2, len, 0.3, 0.07, i * 1.3), RED, { cls: "litds" });
      put("tape." + i, L.ribbon(0.2, len * 0.9, 0.3, 0.07, i * 1.3), RED, { cls: "litds", p: [0, 0, -0.03] });
      slab("tape." + i, [0, 0, 0], [0.15, 0.17, 0.08], GREYD, { ol: 0.02 });
      slab("tape." + i, [0, -0.35, 0.02], [0.13, 0.05, 0.04], INK, {});
    }
    for (let i = 0; i < NMANE; i++) {
      const ms = maneSpec[i], nCards = i < NBACK ? 4 : 3, t0n = 0.46;
      const Jb = L.cardJoint({ len: ms.len, wave: 0.5, ph: i, curve: 0.22, t0: t0n });
      for (let j = 0; j < nCards; j++) {
        const h = L.hash(i * 7.7 + j * 3.1);
        const len = ms.len * (0.74 + 0.4 * h) * (j === Math.floor(nCards / 2) ? 1.06 : 1);
        const t0 = Math.min(0.9, ms.len * t0n / len);
        const wd = i < NBACK ? 0.78 : 0.5;
        const opt = { w: wd - Math.abs(j - 1.5) * 0.08, len, curve: 0.22 + 0.02 * j, wave: 0.5, ph: i + j * 0.5 };
        const xo = (j - (nCards - 1) / 2) * 0.22, ro = (j - (nCards - 1) / 2) * 0.1;
        const up = L.card(Object.assign({ t0: 0, t1: t0, n: 4 }, opt));
        const lo = L.card(Object.assign({ t0, t1: 1, n: 6 }, opt));
        const Jc = L.cardJoint(Object.assign({ t0 }, opt));
        put("mane." + i, up, null, { cls: "hair", p: [xo, 0, 0], r: [0, ro, 0] });
        put("maneTip." + i, lo, null, { cls: "hair", p: [xo + Jc[0] - Jb[0], Jc[1] - Jb[1], Jc[2] - Jb[2]], r: [0, ro, 0] });
      }
    }

    /* ======================================================================
       FLUSH: weld every bucket into one mesh (+ ink outline), collect glow meshes
       ====================================================================== */
    const eyes = [], glowMeshes = [];
    buckets.forEach((b) => {
      const g = L.merge(b.pieces);
      const mat = MATMAP[b.cls];
      const isGlow = b.cls.indexOf("g_") === 0;
      const mesh = K.mk(g, mat, { o: b.ol || 0, oc: b.oc || undefined, shadow: !isGlow && b.cls !== "hair", recv: !isGlow });
      mesh.name = b.bone + ":" + b.cls;
      mesh.userData.keep = true;
      const bone = rig.bones[b.bone];
      if (!bone) console.warn("[beast] missing bone", b.bone);
      (bone || rig.body).add(mesh);
      if (isGlow) glowMeshes.push(mesh);
      if (b.cls === "g_eye" || b.cls === "g_orb" || b.cls === "g_orbIn" || b.cls === "g_slit") eyes.push(mesh);
    });

    /*@@ANIM@@*/

    /*@@ANIM@@*/
    const anim = K.anim(rig);
    anim.addClip("idle", [{ t: 0, bone: "chest", rot: [0, 0, 0] }, { t: 3, bone: "chest", rot: [0, 0, 0] }], { dur: 3 });
    anim.setBase("idle"); anim.play("idle", { fade: 0 }); anim.update(0);
    const P = rig.parts;
    P.root = rig.root; P.body = rig.body; P.eyes = eyes;
    P.footL = rig.bones.soleL; P.footR = rig.bones.soleR; P.handL = rig.bones["armL.hand"]; P.handR = rig.bones["armR.hand"];
    return { id: "beast", root: rig.root, parts: P, anim, rig, height: 7.0, radius: 2.2, team: "enemy" };
  }

  /* ==========================================================================
     REGISTRY
     ========================================================================== */
  G.chars.define("beast", { height: 7.0, radius: 2.2, team: "enemy" }, buildBeast);
})();
