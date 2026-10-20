/* SDF — signed-distance modelling kit (from EVERREALM).
   A shape is a list of GROUPS; a group is a list of ITEMS {prim, op, k}. Groups carry a bounding sphere so a point far
   from a limb never pays for the limb. The whole thing is compiled to straight-line JS (new Function) — ~10x faster
   than interpreting the list, which matters: the base body is meshed at boot. */
const SDF = {};
SDF.sph = (c, r) => ({ t: 'sph', c, r });
SDF.ell = (c, r, rot) => ({ t: 'ell', c, r, rot: rot || null });
SDF.cap = (a, b, r) => ({ t: 'rc', a, b, ra: r, rb: r });
SDF.rcone = (a, b, ra, rb) => ({ t: 'rc', a, b, ra, rb });
SDF.box = (c, h, rr, rot) => ({ t: 'box', c, h, rr: rr || 0, rot: rot || null });
/* eyelid shell: spherical shell around an eyeball with an almond opening cut in angular space */
SDF.lid = (c, re, th, o) => ({ t: 'lid', c, re, th, o });
/* rotation from euler degrees (XYZ order, applied to the SHAPE) -> world->local 3x3 (row-major) */
SDF.rot = function (ex, ey, ez) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(ex * D2R, ey * D2R, ez * D2R, 'XYZ'));
  const e = m.elements; // column-major; local = R^T (p-c)
  return [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]];
};
/* rotation that maps local +Y onto direction d (for limbs), with local +Z towards 'fwd' hint */
SDF.rotAlong = function (d, fwd) {
  const y = new THREE.Vector3(d[0], d[1], d[2]).normalize();
  const f = new THREE.Vector3(fwd ? fwd[0] : 0, fwd ? fwd[1] : 0, fwd ? fwd[2] : 1);
  const x = new THREE.Vector3().crossVectors(y, f).normalize(); const z = new THREE.Vector3().crossVectors(x, y).normalize();
  return [x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z]; // rows = local axes in world
};
SDF.mirror = function (prim) {
  const q = JSON.parse(JSON.stringify(prim));
  const fx = (v) => { if (v) v[0] = -v[0]; };
  fx(q.c); fx(q.a); fx(q.b);
  if (q.rot) { const r = q.rot; // mirror X: world->local M' = M S, S = diag(-1,1,1) -> negate column 0
    r[0] = -r[0]; r[3] = -r[3]; r[6] = -r[6]; }
  if (q.o && q.o.side !== undefined) q.o.side = -q.o.side;
  return q;
};
SDF.fmt = (x) => { let s = (+x).toPrecision(9); if (s.indexOf('e') >= 0) s = (+x).toFixed(12); return +x < 0 ? '(' + s + ')' : s; };

/* code generation for one primitive -> sets variable t */
SDF.primCode = function (p) {
  const F = SDF.fmt;
  switch (p.t) {
    case 'sph': return `dx=x-${F(p.c[0])};dy=y-${F(p.c[1])};dz=z-${F(p.c[2])};t=Math.sqrt(dx*dx+dy*dy+dz*dz)-${F(p.r)};`;
    case 'ell': {
      let s = `dx=x-${F(p.c[0])};dy=y-${F(p.c[1])};dz=z-${F(p.c[2])};`;
      if (p.rot) { const r = p.rot; s += `lx=${F(r[0])}*dx+${F(r[1])}*dy+${F(r[2])}*dz;ly=${F(r[3])}*dx+${F(r[4])}*dy+${F(r[5])}*dz;lz=${F(r[6])}*dx+${F(r[7])}*dy+${F(r[8])}*dz;`; }
      else s += 'lx=dx;ly=dy;lz=dz;';
      const [a, b, c] = p.r;
      s += `k0=Math.sqrt(lx*lx*${F(1 / (a * a))}+ly*ly*${F(1 / (b * b))}+lz*lz*${F(1 / (c * c))});k1=Math.sqrt(lx*lx*${F(1 / (a ** 4))}+ly*ly*${F(1 / (b ** 4))}+lz*lz*${F(1 / (c ** 4))});t=k1>1e-12?k0*(k0-1)/k1:-${F(Math.min(a, b, c))};`;
      return s;
    }
    case 'rc': { // IQ round cone
      const a = p.a, b = p.b, r1 = p.ra, r2 = p.rb;
      const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
      const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
      return `dx=x-${F(a[0])};dy=y-${F(a[1])};dz=z-${F(a[2])};` +
        `ty=dx*${F(bax)}+dy*${F(bay)}+dz*${F(baz)};tz=ty-${F(l2)};` +
        `lx=dx*${F(l2)}-${F(bax)}*ty;ly=dy*${F(l2)}-${F(bay)}*ty;lz=dz*${F(l2)}-${F(baz)}*ty;x2=lx*lx+ly*ly+lz*lz;y2=ty*ty*${F(l2)};z2=tz*tz*${F(l2)};` +
        `k=${F(Math.sign(rr) * rr * rr)}*x2;` +
        `if((tz>0?1:tz<0?-1:0)*${F(a2)}*z2>k)t=Math.sqrt(x2+z2)*${F(il2)}-${F(r2)};` +
        `else if((ty>0?1:ty<0?-1:0)*${F(a2)}*y2<k)t=Math.sqrt(x2+y2)*${F(il2)}-${F(r1)};` +
        `else t=(Math.sqrt(x2*${F(a2 * il2)})+ty*${F(rr)})*${F(il2)}-${F(r1)};`;
    }
    case 'box': {
      let s = `dx=x-${F(p.c[0])};dy=y-${F(p.c[1])};dz=z-${F(p.c[2])};`;
      if (p.rot) { const r = p.rot; s += `lx=${F(r[0])}*dx+${F(r[1])}*dy+${F(r[2])}*dz;ly=${F(r[3])}*dx+${F(r[4])}*dy+${F(r[5])}*dz;lz=${F(r[6])}*dx+${F(r[7])}*dy+${F(r[8])}*dz;`; }
      else s += 'lx=dx;ly=dy;lz=dz;';
      const rr = p.rr;
      s += `qx=Math.abs(lx)-${F(p.h[0] - rr)};qy=Math.abs(ly)-${F(p.h[1] - rr)};qz=Math.abs(lz)-${F(p.h[2] - rr)};` +
        `mx=qx>0?qx:0;my=qy>0?qy:0;mz=qz>0?qz:0;k=Math.max(qx,Math.max(qy,qz));t=Math.sqrt(mx*mx+my*my+mz*mz)+(k<0?k:0)-${F(rr)};`;
      return s;
    }
    case 'lid': { // shell |r - (re+th/2)| - th/2, minus almond opening (angular). o: {side, w, up, lo, tilt, cap}
      const o = p.o, re = p.re, th = p.th;
      // local frame: eye looks along +z, slightly outward by o.yaw (radians, sign by side)
      const yaw = (o.yaw || 0) * (o.side || 1), cy = Math.cos(yaw), sy = Math.sin(yaw);
      return `dx=x-${F(p.c[0])};dy=y-${F(p.c[1])};dz=z-${F(p.c[2])};lx=${F(cy)}*dx-${F(sy)}*dz;lz=${F(sy)}*dx+${F(cy)}*dz;ly=dy;` +
        `k0=Math.sqrt(lx*lx+ly*ly+lz*lz);` + (o.solid ? `t=k0-${F(re + th)};` : `t=Math.abs(k0-${F(re + th * 0.5)})-${F(th * 0.5)};`) +
        `if(k0>1e-6){az=Math.atan2(lx*${F(o.side || 1)},lz);el=Math.asin(Math.max(-1,Math.min(1,ly/k0)))-az*${F(o.tilt || 0)};` +
        `u=Math.abs(az)/${F(o.w)};u=u>1?1:u;` +
        `k=Math.max(el-${F(o.up)}*Math.pow(Math.cos(u*1.5707963),0.75)-${F(o.upo || 0)},${F(-o.lo)}*Math.pow(Math.cos(u*1.5707963),1.1)+${F(o.loo || 0)}-el);` +
        `k=Math.max(k,Math.abs(az)-${F(o.w)})*${F(re)};` +
        `t=Math.max(t,-k);` +
        // restrict to a frontal cap so the shell does not wrap behind the globe
        (o.solid ? '}' : `k=(${F(Math.cos(o.cap || 1.4))}-lz/k0)*${F(re)};t=Math.max(t,k);}`);
    }
  }
  throw new Error('bad prim ' + p.t);
};
SDF.opCode = function (acc, op, k) {
  const F = SDF.fmt;
  switch (op) {
    case 'u': return `${acc}=t<${acc}?t:${acc};`;
    case 'su': return `h=${F(k)}-Math.abs(${acc}-t);${acc}=(t<${acc}?t:${acc})-(h>0?h*h*${F(0.25 / k)}:0);`;
    case 'ss': return `h=${F(k)}-Math.abs(-${acc}-t);${acc}=(-t>${acc}?-t:${acc})+(h>0?h*h*${F(0.25 / k)}:0);`; // subtract t from acc
    case 'si': return `h=${F(k)}-Math.abs(${acc}-t);${acc}=(t>${acc}?t:${acc})+(h>0?h*h*${F(0.25 / k)}:0);`;
    case 's': return `${acc}=-t>${acc}?-t:${acc};`;
  }
  throw new Error('bad op ' + op);
};
/* bounding sphere of a primitive (conservative) */
SDF.primBound = function (p) {
  switch (p.t) {
    case 'sph': return { c: p.c.slice(), r: p.r };
    case 'ell': return { c: p.c.slice(), r: Math.max(...p.r) };
    case 'box': return { c: p.c.slice(), r: Math.hypot(p.h[0], p.h[1], p.h[2]) };
    case 'lid': return { c: p.c.slice(), r: p.re + p.th };
    case 'rc': { const c = [(p.a[0] + p.b[0]) / 2, (p.a[1] + p.b[1]) / 2, (p.a[2] + p.b[2]) / 2]; return { c, r: Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]) / 2 + Math.max(p.ra, p.rb) }; }
  }
};
SDF.groupBound = function (items) {
  // union of item bounds (ignoring subtractive items)
  const bs = items.filter((it) => it.op !== 'ss' && it.op !== 's').map((it) => SDF.primBound(it.p));
  const c = [0, 0, 0]; for (const b of bs) { c[0] += b.c[0]; c[1] += b.c[1]; c[2] += b.c[2]; } c[0] /= bs.length; c[1] /= bs.length; c[2] /= bs.length;
  let r = 0; for (const b of bs) r = Math.max(r, Math.hypot(b.c[0] - c[0], b.c[1] - c[1], b.c[2] - c[2]) + b.r);
  return { c, r };
};
/* groups: [{name, items:[{p, op, k}], op:'su'|'u', k, bound?}] -> function(x,y,z)
   Groups are combined in a FIXED order (smooth-min is order sensitive), but a group is skipped when its bounding
   sphere is farther than (value of the nearest-bound group) + k: then it provably cannot change the result. */
SDF.compile = function (groups) {
  const F = SDF.fmt;
  const decl = 'let g,t,h,dx,dy,dz,lx,ly,lz,k0,k1,k,qx,qy,qz,mx,my,mz,ty,tz,x2,y2,z2,az,el,u;\n';
  const fns = groups.map((gr) => {
    let code = decl;
    gr.items.forEach((it, i) => { code += SDF.primCode(it.p) + '\n'; code += i === 0 ? 'g=t;\n' : SDF.opCode('g', it.op, it.k) + '\n'; });
    return new Function('x', 'y', 'z', code + 'return g;');
  });
  const n = groups.length, BC = new Float64Array(n * 5);
  groups.forEach((gr, i) => { const b = gr.bound || SDF.groupBound(gr.items); gr.bound = b; BC[i * 5] = b.c[0]; BC[i * 5 + 1] = b.c[1]; BC[i * 5 + 2] = b.c[2]; BC[i * 5 + 3] = b.r; BC[i * 5 + 4] = (gr.k || 0) + 0.002; });
  const OPK = groups.map((gr) => gr.op === 'su' ? gr.k : 0);
  const bd = new Float64Array(n), val = new Float64Array(n);
  const fn = function (x, y, z) {
    let best = 0, bb = 1e9;
    for (let i = 0; i < n; i++) { const o = i * 5, ax = x - BC[o], ay = y - BC[o + 1], az = z - BC[o + 2]; const q = Math.sqrt(ax * ax + ay * ay + az * az) - BC[o + 3]; bd[i] = q; if (q < bb) { bb = q; best = i; } }
    const Ub = fns[best](x, y, z);
    let d = 1e9, first = true;
    for (let i = 0; i < n; i++) {
      let t;
      if (i === best) t = Ub; else { if (bd[i] > Ub + BC[i * 5 + 4]) continue; t = fns[i](x, y, z); }
      if (first) { d = t; first = false; continue; }
      const k = OPK[i];
      if (k > 0) { const hh = k - Math.abs(d - t); d = (t < d ? t : d) - (hh > 0 ? hh * hh * 0.25 / k : 0); } else d = t < d ? t : d;
    }
    return d;
  };
  fn.groups = fns;
  return fn;
};
/* tetrahedral gradient */
SDF.grad = function (f, x, y, z, e, out) {
  const a = f(x + e, y - e, z - e), b = f(x - e, y - e, z + e), c = f(x - e, y + e, z - e), d = f(x + e, y + e, z + e);
  let nx = a - b - c + d, ny = -a - b + c + d, nz = -a + b - c + d; const l = Math.hypot(nx, ny, nz) || 1;
  out[0] = nx / l; out[1] = ny / l; out[2] = nz / l; return out;
};

/* MESH — narrow-band surface nets + plane clipping + seam zipper.
   The head, the hands and the body are meshed at different resolutions from the SAME distance field, clipped on
   shared planes (neck, wrists) and zipped into one watertight mesh, so there is never a seam to hide. */
const MESH = {};
/* surface nets inside box, cell size h. Returns {pos:Float32Array, idx:Uint32Array, nv, nt}. */
MESH.nets = function (f, box, h, opt) {
  opt = opt || {};
  const B = opt.block || 4;
  const x0 = box[0], y0 = box[1], z0 = box[2];
  const nx = Math.ceil((box[3] - x0) / h), ny = Math.ceil((box[4] - y0) / h), nz = Math.ceil((box[5] - z0) / h);
  const cx = nx + 1, cy = ny + 1, cxy = cx * cy;
  const val = new Float32Array(cx * cy * (nz + 1)); val.fill(NaN);
  const bx = Math.ceil(nx / B), by = Math.ceil(ny / B), bz = Math.ceil(nz / B);
  const active = new Uint8Array(bx * by * bz);
  const thr = B * h * 0.95 + h;
  const skip = opt.skip; // optional (x,y,z)=>bool : region handled elsewhere
  let evals = 0;
  for (let k = 0; k < bz; k++) for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    const px = x0 + (Math.min(i * B + B * 0.5, nx)) * h, py = y0 + (Math.min(j * B + B * 0.5, ny)) * h, pz = z0 + (Math.min(k * B + B * 0.5, nz)) * h;
    if (skip && skip(px, py, pz, B * h)) continue;
    const v = f(px, py, pz); evals++;
    if (Math.abs(v) < thr) active[i + bx * (j + by * k)] = 1;
  }
  // fine corner values in active blocks
  for (let bk = 0; bk < bz; bk++) for (let bj = 0; bj < by; bj++) for (let bi = 0; bi < bx; bi++) {
    if (!active[bi + bx * (bj + by * bk)]) continue;
    const i1 = Math.min((bi + 1) * B, nx), j1 = Math.min((bj + 1) * B, ny), k1 = Math.min((bk + 1) * B, nz);
    for (let k = bk * B; k <= k1; k++) { const pz = z0 + k * h;
      for (let j = bj * B; j <= j1; j++) { const py = y0 + j * h; let o = cx * j + cxy * k;
        for (let i = bi * B; i <= i1; i++) { const q = o + i; if (val[q] !== val[q]) { val[q] = f(x0 + i * h, py, pz); evals++; } } } }
  }
  // vertices
  const cellIdx = new Int32Array(nx * ny * nz); cellIdx.fill(-1);
  let pos = new Float32Array(1 << 16), nv = 0;
  const cornerOff = [0, 1, cx, cx + 1, cxy, cxy + 1, cxy + cx, cxy + cx + 1];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const cv = new Float64Array(8);
  for (let bk = 0; bk < bz; bk++) for (let bj = 0; bj < by; bj++) for (let bi = 0; bi < bx; bi++) {
    if (!active[bi + bx * (bj + by * bk)]) continue;
    const i1 = Math.min((bi + 1) * B, nx), j1 = Math.min((bj + 1) * B, ny), k1 = Math.min((bk + 1) * B, nz);
    for (let k = bk * B; k < k1; k++) for (let j = bj * B; j < j1; j++) for (let i = bi * B; i < i1; i++) {
      const base = i + cx * j + cxy * k;
      let mask = 0, bad = false;
      for (let c = 0; c < 8; c++) { const v = val[base + cornerOff[c]]; if (v !== v) { bad = true; break; } cv[c] = v; if (v < 0) mask |= 1 << c; }
      if (bad || mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (let e = 0; e < 12; e++) {
        const a = EDGES[e][0], b = EDGES[e][1];
        if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
        const t = cv[a] / (cv[a] - cv[b]);
        sx += CO[a][0] + (CO[b][0] - CO[a][0]) * t; sy += CO[a][1] + (CO[b][1] - CO[a][1]) * t; sz += CO[a][2] + (CO[b][2] - CO[a][2]) * t; n++;
      }
      if (nv * 3 + 3 > pos.length) { const np = new Float32Array(pos.length * 2); np.set(pos); pos = np; }
      pos[nv * 3] = x0 + (i + sx / n) * h; pos[nv * 3 + 1] = y0 + (j + sy / n) * h; pos[nv * 3 + 2] = z0 + (k + sz / n) * h;
      cellIdx[i + nx * (j + ny * k)] = nv++;
    }
  }
  // faces: one quad per sign-changing edge, from the 4 cells that share it
  let idx = new Uint32Array(1 << 17), nt = 0;
  const pushQuad = (a, b, c, d, flip) => {
    if (nt * 3 + 6 > idx.length) { const ni = new Uint32Array(idx.length * 2); ni.set(idx); idx = ni; }
    // split along the shorter diagonal
    const dac = (pos[a * 3] - pos[c * 3]) ** 2 + (pos[a * 3 + 1] - pos[c * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[c * 3 + 2]) ** 2;
    const dbd = (pos[b * 3] - pos[d * 3]) ** 2 + (pos[b * 3 + 1] - pos[d * 3 + 1]) ** 2 + (pos[b * 3 + 2] - pos[d * 3 + 2]) ** 2;
    let t;
    if (dac < dbd) t = flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
    else t = flip ? [a, d, b, b, d, c] : [a, b, d, b, c, d];
    for (let q = 0; q < 6; q++) idx[nt * 3 + q] = t[q];
    nt += 2;
  };
  const ci = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? -1 : cellIdx[i + nx * (j + ny * k)];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c0 = cellIdx[i + nx * (j + ny * k)]; if (c0 < 0) continue;
    const base = i + cx * j + cxy * k; const v0 = val[base]; const in0 = v0 < 0;
    // x-edge (i,j,k)->(i+1,j,k): cells (i,j-1..j,k-1..k)
    if (j > 0 && k > 0) { const v1 = val[base + 1]; if ((v1 < 0) !== in0 && v1 === v1) { const a = ci(i, j - 1, k - 1), b = ci(i, j, k - 1), d = ci(i, j - 1, k); if (a >= 0 && b >= 0 && d >= 0) pushQuad(a, b, c0, d, !in0); } }
    if (i > 0 && k > 0) { const v1 = val[base + cx]; if ((v1 < 0) !== in0 && v1 === v1) { const a = ci(i - 1, j, k - 1), b = ci(i - 1, j, k), d = ci(i, j, k - 1); if (a >= 0 && b >= 0 && d >= 0) pushQuad(a, b, c0, d, !in0); } }
    if (i > 0 && j > 0) { const v1 = val[base + cxy]; if ((v1 < 0) !== in0 && v1 === v1) { const a = ci(i - 1, j - 1, k), b = ci(i, j - 1, k), d = ci(i - 1, j, k); if (a >= 0 && b >= 0 && d >= 0) pushQuad(a, b, c0, d, !in0); } }
  }
  return { pos: pos.slice(0, nv * 3), idx: idx.slice(0, nt * 3), nv, nt, evals, dims: [nx, ny, nz] };
};
/* clip mesh against planes; keep dot(n,p)+d >= 0. New vertices shared per edge -> watertight cut. */
MESH.clip = function (m, planes) {
  let P = Array.from(m.pos), I = Array.from(m.idx);
  for (const pl of planes) {
    const n = pl.n, d = pl.d, nvx = P.length / 3, r2 = pl.r ? pl.r * pl.r : 1e18, c = pl.c || [0, 0, 0];
    // a plane with a radius only cuts near its anchor: vertices beyond it count as 'keep'
    const sd = new Float64Array(nvx); for (let v = 0; v < nvx; v++) { const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      sd[v] = ((x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2 > r2) ? 1 : n[0] * x + n[1] * y + n[2] * z + d; }
    const edgeV = new Map(); const out = [];
    const cut = (a, b) => { const key = a < b ? a * 4194304 + b : b * 4194304 + a; let v = edgeV.get(key); if (v !== undefined) return v;
      const t = sd[a] / (sd[a] - sd[b]); v = P.length / 3; P.push(P[a * 3] + (P[b * 3] - P[a * 3]) * t, P[a * 3 + 1] + (P[b * 3 + 1] - P[a * 3 + 1]) * t, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * t); edgeV.set(key, v); return v; };
    for (let t = 0; t < I.length; t += 3) {
      const tri = [I[t], I[t + 1], I[t + 2]]; const s = tri.map((v) => sd[v] >= 0);
      const nin = s[0] + s[1] + s[2];
      if (nin === 3) { out.push(tri[0], tri[1], tri[2]); continue; }
      if (nin === 0) continue;
      // Sutherland-Hodgman on the triangle
      const poly = [];
      for (let q = 0; q < 3; q++) { const a = tri[q], b = tri[(q + 1) % 3], ia = s[q], ib = s[(q + 1) % 3];
        if (ia) poly.push(a); if (ia !== ib) poly.push(cut(a, b)); }
      for (let q = 1; q + 1 < poly.length; q++) out.push(poly[0], poly[q], poly[q + 1]);
    }
    I = out;
  }
  // compact
  const nvx = P.length / 3, map = new Int32Array(nvx).fill(-1); const NP = []; let c = 0;
  for (let t = 0; t < I.length; t++) { const v = I[t]; if (map[v] < 0) { map[v] = c++; NP.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); } I[t] = map[v]; }
  return { pos: new Float32Array(NP), idx: new Uint32Array(I), nv: c, nt: I.length / 3 };
};
/* boundary loops lying on a plane (|dist|<eps) */
MESH.loopsOnPlane = function (m, pl, eps) {
  const I = m.idx, P = m.pos; const ecount = new Map();
  for (let t = 0; t < I.length; t += 3) for (let q = 0; q < 3; q++) { const a = I[t + q], b = I[t + (q + 1) % 3]; const key = a < b ? a + ',' + b : b + ',' + a; const e = ecount.get(key); if (e) e.n++; else ecount.set(key, { n: 1, a, b }); }
  const on = (v) => Math.abs(pl.n[0] * P[v * 3] + pl.n[1] * P[v * 3 + 1] + pl.n[2] * P[v * 3 + 2] + pl.d) < eps;
  const next = new Map();
  for (const e of ecount.values()) if (e.n === 1 && on(e.a) && on(e.b)) { next.set(e.a, (next.get(e.a) || []).concat([e.b])); next.set(e.b, (next.get(e.b) || []).concat([e.a])); }
  const seen = new Set(), loops = [];
  for (const s of next.keys()) {
    if (seen.has(s)) continue; const loop = [s]; seen.add(s); let prev = -1, cur = s;
    for (;;) { const nb = (next.get(cur) || []).filter((v) => v !== prev && !seen.has(v)); if (!nb.length) break; prev = cur; cur = nb[0]; seen.add(cur); loop.push(cur); }
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
};
/* merge meshes (concatenate) */
MESH.merge = function (list) {
  let nv = 0, nt = 0; for (const m of list) { nv += m.nv; nt += m.nt; }
  const pos = new Float32Array(nv * 3), idx = new Uint32Array(nt * 3), off = []; let ov = 0, ot = 0;
  for (const m of list) { off.push(ov); pos.set(m.pos, ov * 3); for (let i = 0; i < m.nt * 3; i++) idx[ot * 3 + i] = m.idx[i] + ov; ov += m.nv; ot += m.nt; }
  return { pos, idx, nv, nt, off };
};
/* zip two boundary loops lying on the same plane (global vertex indices into the merged mesh). Both windings are
   emitted: the strip is a sub-millimetre flat annulus and must never show a crack from either side. */
MESH.zip = function (pos, loopA, loopB, pl) {
  const n = pl.n; let ux = [1, 0, 0]; if (Math.abs(n[0]) > 0.8) ux = [0, 1, 0];
  const u = V.norm(V.sub(ux, V.mul(n, V.dot(ux, n)))), w = V.cross(n, u);
  const cen = [0, 0, 0]; for (const v of loopA) { cen[0] += pos[v * 3]; cen[1] += pos[v * 3 + 1]; cen[2] += pos[v * 3 + 2]; } for (let i = 0; i < 3; i++) cen[i] /= loopA.length;
  const ang = (v) => { const d = [pos[v * 3] - cen[0], pos[v * 3 + 1] - cen[1], pos[v * 3 + 2] - cen[2]]; return Math.atan2(V.dot(d, w), V.dot(d, u)); };
  const sortLoop = (L) => L.map((v) => ({ v, a: ang(v) })).sort((p, q) => p.a - q.a);
  const A = sortLoop(loopA), B = sortLoop(loopB), na = A.length, nb = B.length;
  const angA = (k) => k < na ? A[k].a : A[k - na].a + Math.PI * 2, angB = (k) => k < nb ? B[k].a : B[k - nb].a + Math.PI * 2;
  const tris = []; let i = 0, j = 0;
  while (i < na || j < nb) {
    const va = A[i % na].v, vb = B[j % nb].v;
    if (j >= nb || (i < na && angA(i + 1) <= angB(j + 1))) { tris.push(va, A[(i + 1) % na].v, vb); i++; }
    else { tris.push(va, B[(j + 1) % nb].v, vb); j++; }
  }
  const both = tris.slice(); for (let t = 0; t < tris.length; t += 3) both.push(tris[t], tris[t + 2], tris[t + 1]);
  return both;
};
/* per-vertex field attributes: normal, curvature (field laplacian), ambient occlusion */
MESH.fieldAttrs = function (f, pos, nv) {
  const nrm = new Float32Array(nv * 3), curv = new Float32Array(nv), ao = new Float32Array(nv);
  const e = 0.0007;
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const a = f(x + e, y - e, z - e), b = f(x - e, y - e, z + e), c = f(x - e, y + e, z - e), d = f(x + e, y + e, z + e);
    let gx = a - b - c + d, gy = -a - b + c + d, gz = -a + b - c + d; const l = Math.hypot(gx, gy, gz) || 1; gx /= l; gy /= l; gz /= l;
    nrm[v * 3] = gx; nrm[v * 3 + 1] = gy; nrm[v * 3 + 2] = gz;
    const f0 = f(x, y, z);
    curv[v] = 2 * ((a + b + c + d) * 0.25 - f0) / (3 * e * e); // ~ mean curvature * 2 (1/m)
    // AO: 5 taps along the normal
    let occ = 0, w = 1;
    for (let i = 1; i <= 4; i++) { const hh = 0.003 + 0.011 * i; const dd = f(x + gx * hh, y + gy * hh, z + gz * hh); occ += (hh - dd) * w; w *= 0.72; }
    ao[v] = clamp(1 - occ * 9.0, 0, 1);
  }
  return { nrm, curv, ao };
};

/* surface nets over a dense corner grid (GPU-baked). val[(i) + cx*(j) + cx*cy*(k)], cx = nx+1 ... */
MESH.netsGrid = function (val, nx, ny, nz, o, h) {
  const cx = nx + 1, cy = ny + 1, cxy = cx * cy;
  const cellIdx = new Int32Array(nx * ny * nz); cellIdx.fill(-1);
  let pos = new Float32Array(1 << 17), nv = 0;
  const cornerOff = [0, 1, cx, cx + 1, cxy, cxy + 1, cxy + cx, cxy + cx + 1];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const cv = new Float64Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const base = i + cx * j + cxy * k;
    let mask = 0;
    for (let c = 0; c < 8; c++) { const v = val[base + cornerOff[c]]; cv[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (let e = 0; e < 12; e++) {
      const a = EDGES[e][0], b = EDGES[e][1];
      if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += CO[a][0] + (CO[b][0] - CO[a][0]) * t; sy += CO[a][1] + (CO[b][1] - CO[a][1]) * t; sz += CO[a][2] + (CO[b][2] - CO[a][2]) * t; n++;
    }
    if (nv * 3 + 3 > pos.length) { const np = new Float32Array(pos.length * 2); np.set(pos); pos = np; }
    pos[nv * 3] = o[0] + (i + sx / n) * h; pos[nv * 3 + 1] = o[1] + (j + sy / n) * h; pos[nv * 3 + 2] = o[2] + (k + sz / n) * h;
    cellIdx[i + nx * (j + ny * k)] = nv++;
  }
  let idx = new Uint32Array(1 << 18), nt = 0;
  const pushQuad = (a, b, c, d, flip) => {
    if (nt * 3 + 6 > idx.length) { const ni = new Uint32Array(idx.length * 2); ni.set(idx); idx = ni; }
    const dac = (pos[a * 3] - pos[c * 3]) ** 2 + (pos[a * 3 + 1] - pos[c * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[c * 3 + 2]) ** 2;
    const dbd = (pos[b * 3] - pos[d * 3]) ** 2 + (pos[b * 3 + 1] - pos[d * 3 + 1]) ** 2 + (pos[b * 3 + 2] - pos[d * 3 + 2]) ** 2;
    let t;
    if (dac < dbd) t = flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
    else t = flip ? [a, d, b, b, d, c] : [a, b, d, b, c, d];
    for (let q = 0; q < 6; q++) idx[nt * 3 + q] = t[q];
    nt += 2;
  };
  const ci = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? -1 : cellIdx[i + nx * (j + ny * k)];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c0 = cellIdx[i + nx * (j + ny * k)]; if (c0 < 0) continue;
    const base = i + cx * j + cxy * k; const in0 = val[base] < 0;
    if (j > 0 && k > 0) { const v1 = val[base + 1]; if ((v1 < 0) !== in0) { const a = ci(i, j - 1, k - 1), b = ci(i, j, k - 1), d = ci(i, j - 1, k); if (a >= 0 && b >= 0 && d >= 0) pushQuad(a, b, c0, d, !in0); } }
    if (i > 0 && k > 0) { const v1 = val[base + cx]; if ((v1 < 0) !== in0) { const a = ci(i - 1, j, k - 1), b = ci(i - 1, j, k), d = ci(i, j, k - 1); if (a >= 0 && b >= 0 && d >= 0) pushQuad(a, b, c0, d, !in0); } }
    if (i > 0 && j > 0) { const v1 = val[base + cxy]; if ((v1 < 0) !== in0) { const a = ci(i - 1, j - 1, k), b = ci(i, j - 1, k), d = ci(i - 1, j, k); if (a >= 0 && b >= 0 && d >= 0) pushQuad(a, b, c0, d, !in0); } }
  }
  return { pos: pos.slice(0, nv * 3), idx: idx.slice(0, nt * 3), nv, nt };
};
/* keep only the largest connected component (drops floating specks from thin features) */
MESH.largest = function (m, keepMin) {
  const n = m.nv, par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
  const f = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < m.idx.length; t += 3) { const a = f(m.idx[t]), b = f(m.idx[t + 1]), c = f(m.idx[t + 2]); par[b] = a; par[f(c)] = a; }
  const cnt = new Map(); for (let i = 0; i < n; i++) { const r = f(i); cnt.set(r, (cnt.get(r) || 0) + 1); }
  const keep = new Set(); let best = -1, bn = 0; for (const [r, c] of cnt) { if (c > bn) { bn = c; best = r; } if (keepMin && c >= keepMin) keep.add(r); }
  keep.add(best);
  const map = new Int32Array(n).fill(-1); const P = []; let c = 0;
  const I = [];
  for (let t = 0; t < m.idx.length; t += 3) { if (!keep.has(f(m.idx[t]))) continue; for (let q = 0; q < 3; q++) { const v = m.idx[t + q]; if (map[v] < 0) { map[v] = c++; P.push(m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2]); } I.push(map[v]); } }
  return { pos: new Float32Array(P), idx: new Uint32Array(I), nv: c, nt: I.length / 3, map };
};
/* area-weighted vertex normals from triangles */
MESH.normals = function (pos, idx, nv) {
  const n = new Float32Array(nv * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const q of [a, b, c]) { n[q] += nx; n[q + 1] += ny; n[q + 2] += nz; }
  }
  for (let i = 0; i < nv; i++) { const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]) || 1; n[i * 3] /= l; n[i * 3 + 1] /= l; n[i * 3 + 2] /= l; }
  return n;
};
/* one Taubin-ish relaxation pass that keeps vertices on the field (project back with the gradient) */
MESH.relax = function (m, f, iters) {
  const n = m.nv, P = m.pos; const acc = new Float64Array(n * 3), deg = new Uint16Array(n);
  for (let it = 0; it < (iters || 1); it++) {
    acc.fill(0); deg.fill(0);
    for (let t = 0; t < m.idx.length; t += 3) for (let q = 0; q < 3; q++) { const a = m.idx[t + q], b = m.idx[t + (q + 1) % 3];
      acc[a * 3] += P[b * 3]; acc[a * 3 + 1] += P[b * 3 + 1]; acc[a * 3 + 2] += P[b * 3 + 2]; deg[a]++;
      acc[b * 3] += P[a * 3]; acc[b * 3 + 1] += P[a * 3 + 1]; acc[b * 3 + 2] += P[a * 3 + 2]; deg[b]++; }
    const g = [0, 0, 0];
    for (let v = 0; v < n; v++) { if (!deg[v]) continue;
      let x = lerp(P[v * 3], acc[v * 3] / deg[v], 0.5), y = lerp(P[v * 3 + 1], acc[v * 3 + 1] / deg[v], 0.5), z = lerp(P[v * 3 + 2], acc[v * 3 + 2] / deg[v], 0.5);
      if (f) { const d = f(x, y, z); SDF.grad(f, x, y, z, 0.0008, g); x -= g[0] * d; y -= g[1] * d; z -= g[2] * d; }
      P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z; }
  }
};
MESH.geometry = function (pos, idx, nrm, extra) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  if (extra) for (const k in extra) g.setAttribute(k, extra[k]);
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
};
