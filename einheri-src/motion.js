/* =====================================================================
   MOTION — secondary motion for the giants: verlet spring chains that
   sway, trail and settle (hair, pelts, tails, beards), drawn as painted
   tapered locks with a lit edge and an ink line.
   ===================================================================== */
function mkChain(n, len, stiff = .12, damp = .9, grav = 260) { return { n, len, stiff, damp, grav, p: [], o: [], rest: [], t: -1 }; }
/* root: [x,y]; dir: rest direction (unit, may curve per link via bend); wind: px/s² sideways */
function stepChain(c, root, dir, t, wind = 0, bend = 0) {
  let dt = c.t < 0 ? 0 : Math.min(.05, t - c.t); c.t = t;
  // the rest shape: a gently curving lock from the root along dir
  let a = Math.atan2(dir[1], dir[0]), x = root[0], y = root[1];
  c.rest.length = 0; c.rest.push([x, y]);
  for (let i = 1; i < c.n; i++) { a += bend; x += Math.cos(a) * c.len; y += Math.sin(a) * c.len; c.rest.push([x, y]); }
  if (!c.p.length || dt === 0 && c.p.length !== c.n) { c.p = c.rest.map(q => q.slice()); c.o = c.rest.map(q => q.slice()); return c; }
  c.p[0] = root.slice(); c.o[0] = root.slice();
  const g = c.grav * dt * dt, wd = wind * dt * dt;
  for (let i = 1; i < c.n; i++) {
    const p = c.p[i], o = c.o[i], vx = (p[0] - o[0]) * c.damp, vy = (p[1] - o[1]) * c.damp;
    o[0] = p[0]; o[1] = p[1]; p[0] += vx + wd; p[1] += vy + g;
  }
  for (let it = 0; it < 3; it++) {
    for (let i = 1; i < c.n; i++) { // shape memory, stronger near the root
      const k = c.stiff * (1 - i / c.n * .6), p = c.p[i], r = c.rest[i];
      p[0] += (r[0] - p[0]) * k; p[1] += (r[1] - p[1]) * k;
    }
    for (let i = 1; i < c.n; i++) { // length constraint
      const a1 = c.p[i - 1], b1 = c.p[i], dx = b1[0] - a1[0], dy = b1[1] - a1[1], d = Math.hypot(dx, dy) || 1, f = (d - c.len) / d;
      if (i === 1) { b1[0] -= dx * f; b1[1] -= dy * f; } else { a1[0] += dx * f * .5; a1[1] += dy * f * .5; b1[0] -= dx * f * .5; b1[1] -= dy * f * .5; }
    }
  }
  return c;
}
/* a painted lock along a chain: base colour, a lit stripe toward the light, a dark stripe away, ink edge */
function drawLock(pts, w0, w1, col, lit, dark, ink = '#1a120e', inkW = 2.2) {
  const S = crSample(pts, 6), n = S.length, L = [], R = [], M1 = [], M2 = [];
  for (let i = 0; i < n; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)], u = i / (n - 1);
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = lerp(w0, w1, u) * (u > .85 ? (1 - u) / .15 : 1) * .5 + .3;
    L.push([S[i][0] - dy * w, S[i][1] + dx * w]); R.push([S[i][0] + dy * w, S[i][1] - dx * w]);
    M1.push([S[i][0] - dy * w * .35, S[i][1] + dx * w * .35]); M2.push([S[i][0] + dy * w * .25, S[i][1] - dx * w * .25]);
  }
  const poly = (A, B) => { ctx.beginPath(); ctx.moveTo(A[0][0], A[0][1]); for (const p of A) ctx.lineTo(p[0], p[1]); for (let i = B.length - 1; i >= 0; i--) ctx.lineTo(B[i][0], B[i][1]); ctx.closePath(); };
  poly(L, R); ctx.fillStyle = col; ctx.fill();
  // which side faces the key light (upper left)?
  const mid = n >> 1, sx = L[mid][0] - R[mid][0], sy = L[mid][1] - R[mid][1], litL = sx * -.6 + sy * -.8 > 0;
  poly(litL ? L : R, litL ? M1 : M2); ctx.fillStyle = lit; ctx.fill();
  poly(litL ? M2 : M1, litL ? R : L); ctx.fillStyle = dark; ctx.fill();
  poly(L, R); ctx.strokeStyle = ink; ctx.lineWidth = inkW; ctx.lineJoin = 'round'; ctx.stroke();
}
/* stringy hair along a chain: a few thin tapered strands that splay apart toward the tips */
function drawStrands(pts, n, spread, w, cols, ink = '#1a120e', seed = 0) {
  const S = crSample(pts, 5), N = S.length;
  const pass = (wAdd, colOf) => {
    for (let s = 0; s < n; s++) {
      const o = (n > 1 ? s / (n - 1) - .5 : 0) * spread, len = 1 - hash2(s, seed) * .3, end = Math.max(2, Math.floor(N * len));
      ctx.strokeStyle = colOf(s); ctx.lineCap = 'round';
      for (let i = 1; i < end; i++) {
        const a = S[i - 1], b = S[i], u = i / end, dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, sp = o * (.35 + u * .9) + Math.sin(i * .9 + s * 2.1 + seed) * 1.5;
        const ua = (i - 1) / end, spa = o * (.35 + ua * .9) + Math.sin((i - 1) * .9 + s * 2.1 + seed) * 1.5;
        ctx.lineWidth = lerp(w, w * .25, u) + wAdd; ctx.beginPath();
        ctx.moveTo(a[0] - dy / d * spa, a[1] + dx / d * spa); ctx.lineTo(b[0] - dy / d * sp, b[1] + dx / d * sp); ctx.stroke();
      }
    }
  };
  pass(2.2, () => ink); pass(0, s => cols[s % cols.length]);
}
