/* =====================================================================
   CEL — the giants as hand-drawn animation cels: confident silhouettes,
   one crisp shadow tone, and tapered brush-ink for every muscle, knuckle
   and toe. Parts are authored in body space and posed as a puppet.
   ===================================================================== */
/* a tapered brush stroke through points (Catmull-Rom), thick in the middle, thin at the ends */
function crSample(pts, per = 10) {
  const out = [], n = pts.length; if (n < 2) return pts.slice();
  for (let i = 0; i < n - 1; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([.5 * (2 * b[0] + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3), .5 * (2 * b[1] + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3)]); }
  }
  out.push(pts[n - 1]); return out;
}
function inkStroke(g, pts, w, col = '#1b2230', t0 = .3, t1 = .3) {
  const S = crSample(pts, 12), n = S.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)], u = i / (n - 1);
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const ww = w * .5 * Math.pow(Math.min(1, u / t0, (1 - u) / t1, 1), .65);
    L.push([S[i][0] - dy * ww, S[i][1] + dx * ww]); R.push([S[i][0] + dy * ww, S[i][1] - dx * ww]);
  }
  g.fillStyle = col; g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const p of L) g.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath(); g.fill();
}
const inks = (g, list, w, col) => { for (const p of list) inkStroke(g, p, w, col); };
/* a spiky crest: along a polyline, spikes pointing in dir(t) */
function spikePts(base, n, len, dir, seed, jag = .5) {
  const S = crSample(base, 8), pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, k = t * (S.length - 1), j = Math.min(S.length - 2, k | 0), f = k - j;
    const x = lerp(S[j][0], S[j + 1][0], f), y = lerp(S[j][1], S[j + 1][1], f), a = dir(t) + (hash2(seed, i) - .5) * jag;
    pts.push([x, y]);
    if (i < n) { const t2 = (i + .5) / n, k2 = t2 * (S.length - 1), j2 = Math.min(S.length - 2, k2 | 0), f2 = k2 - j2, x2 = lerp(S[j2][0], S[j2 + 1][0], f2), y2 = lerp(S[j2][1], S[j2 + 1][1], f2), L = len(t2) * (.65 + hash2(i, seed) * .6); pts.push([x2 + Math.cos(a) * L, y2 + Math.sin(a) * L]); }
  }
  return pts;
}
/* a painted part authored in body space, pivoting at `pv` */
function celPart(pv, box, layers, extra = {}) {
  const sh = g => g.translate(-pv[0], -pv[1]);
  return paintSprite(Object.assign({ cel: 1, s: 1.1, inkW: 2.6, ink: '#1a2130', ao: .6 }, extra, {
    box: [box[0] - pv[0], box[1] - pv[1], box[2] - pv[0], box[3] - pv[1]],
    layers: layers.map(L => Object.assign({}, L, { draw: g => { sh(g); L.draw(g); }, bump: L.bump ? g => { sh(g); L.bump(g); } : undefined })),
    under: extra.under ? g => { sh(g); extra.under(g); } : undefined,
    over: extra.over ? g => { sh(g); extra.over(g); } : undefined,
  }));
}
const mirX = (k, pts) => pts.map(p => [p[0] * k, p[1]]);
const vcrP = (pts) => pth(P => vcr(P, pts));

/* ---------------------------------------------------------------
   NÍÐHÖGGR — the wyrm in the black water
   --------------------------------------------------------------- */
function rigNid() {
  if (RIGS.nid) return RIGS.nid;
  const skin = '#80604a', bone = '#cbb294', ink = '#1c120c', E = { rim: '#dceeff', rimA: .45, shade: [.58, .5, .5], inkW: 3.4, ink };
  const R = {};
  R.head = celPart([0, 0], [-200, -190, 230, 70], [
    ...Array.from({ length: 8 }, (_, i) => ({ draw: g => { const a = PI + .55 + i * .16 + (hash2(i, 3) - .5) * .1, L = 120 + hash2(i, 2) * 90 - Math.abs(i - 3) * 8, x0 = 10 + i * 8, y0 = -38 + i * 5; fillP(g, pth(P => vpoly(P, [[x0 - 9, y0 + 4], [x0 + 9, y0 - 4], [x0 + Math.cos(a) * L * .55 + 6, y0 + Math.sin(a) * L * .55 - 4], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L], [x0 + Math.cos(a) * L * .5 - 6, y0 + Math.sin(a) * L * .5 + 6]])), bone); }, amp: .5, h: i * 2, innerInk: true, inkW: .7 })),
    { draw: g => fillP(g, vcrP([[-10, -34], [40, -52], [110, -48], [176, -26], [214, -8], [206, 8], [150, 6], [80, 14], [20, 26], [-14, 16]]), skin), amp: .55, h: 20 },
    { draw: g => fillP(g, vcrP([[60, -52], [96, -62], [128, -50], [100, -40]]), bone), amp: .6, h: 30 },
    { draw: g => fillP(g, pth(P => { for (let i = 0; i < 6; i++) vpoly(P, [[96 + i * 18, 6], [104 + i * 18, 6], [100 + i * 18, 26 - (i % 2) * 6]]); }), '#eee4cc'), r: 2, h: 22, inkW: .6 },
  ], Object.assign({}, E, { over: g => inks(g, [[[30, -30], [80, -36], [140, -28]], [[150, -18], [176, -12]], [[40, 10], [90, 4], [130, 4]]], 4, ink) }));
  R.jaw = celPart([10, 16], [-20, -10, 210, 70], [
    { draw: g => fillP(g, vcrP([[0, 10], [60, 12], [130, 18], [196, 26], [190, 40], [120, 46], [50, 40], [6, 30]]), '#6a4c3a'), amp: .55 },
    { draw: g => fillP(g, pth(P => { for (let i = 0; i < 6; i++) vpoly(P, [[100 + i * 16, 22], [108 + i * 16, 22], [104 + i * 16, 4 + (i % 2) * 6]]); }), '#eee4cc'), r: 2, h: 10, inkW: .6 },
  ], E);
  R.claw = celPart([0, 0], [-60, -30, 260, 200], [
    { draw: g => fillP(g, pth(P => vlimb(P, [[0, 0], [70, 40], [130, 70]], [56, 46, 40])), skin), amp: .7 },
    ...[0, 1, 2, 3].map(i => ({ draw: g => { const a = .15 + i * .22; fillP(g, pth(P => vlimb(P, [[130 + Math.cos(a + .8) * 10, 70 + Math.sin(a + .8) * 10], [170 + Math.cos(a) * 30, 90 + Math.sin(a) * 50], [200 + Math.cos(a - .2) * 50, 110 + Math.sin(a - .2) * 90], [204 + Math.cos(a - .5) * 70, 120 + Math.sin(a - .5) * 120]], [22, 14, 7, 1.2])), '#2e1c16'); }, amp: .7, h: 10 + i * 2, innerInk: true, inkW: .7 })),
  ], E);
  return RIGS.nid = R;
}
/* a living serpent body: flat cel colour, a shade band, a pale ridged belly, ink, a jagged crest */
function celBody(pts, wf, ink, crest) {
  const N = pts.length - 1, Lf = [], Rt = [], Mi = [], Be = [];
  for (let i = 0; i <= N; i++) {
    const p = pts[i], q = pts[Math.min(N, i + 1)], o = pts[Math.max(0, i - 1)], a = Math.atan2(q[1] - o[1], q[0] - o[0]) + PI / 2, wd = wf(i / N) / 2, c = Math.cos(a), s = Math.sin(a);
    Lf.push([p[0] + c * wd, p[1] + s * wd]); Rt.push([p[0] - c * wd, p[1] - s * wd]); Mi.push([p[0] + c * wd * .15, p[1] + s * wd * .15]); Be.push([p[0] - c * wd * .45, p[1] - s * wd * .45]);
  }
  const poly2 = (A_, B_) => { ctx.beginPath(); ctx.moveTo(A_[0][0], A_[0][1]); for (const p of A_) ctx.lineTo(p[0], p[1]); for (let i = B_.length - 1; i >= 0; i--) ctx.lineTo(B_[i][0], B_[i][1]); ctx.closePath(); };
  if (crest) for (let i = 3; i < N - 3; i += 2) { const p = Lf[i], q = Lf[i + 2], a = Math.atan2(q[1] - p[1], q[0] - p[0]) - PI / 2 - .7, L = 30 + (i % 4) * 14; ctx.fillStyle = '#4e3626'; ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  poly2(Lf, Rt); ctx.fillStyle = FL('#80604a'); ctx.fill();
  ctx.save(); poly2(Lf, Rt); ctx.clip();
  poly2(Lf, Mi); ctx.fillStyle = FL('#5a4032'); ctx.fill();
  poly2(Be, Rt); ctx.fillStyle = FL('#a8806a'); ctx.fill();
  ctx.strokeStyle = 'rgba(40,22,14,.7)'; ctx.lineWidth = 3; for (let i = 2; i < N; i += 2) { ctx.beginPath(); ctx.moveTo(Be[i][0], Be[i][1]); ctx.quadraticCurveTo((Be[i][0] + Rt[i][0]) / 2 + 4, (Be[i][1] + Rt[i][1]) / 2 + 4, Rt[i][0], Rt[i][1]); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(30,18,12,.55)'; ctx.lineWidth = 2.6; for (let i = 4; i < N - 2; i += 5) { ctx.beginPath(); ctx.moveTo(lerp(Lf[i][0], pts[i][0], .3), lerp(Lf[i][1], pts[i][1], .3)); ctx.quadraticCurveTo(pts[i + 1][0], pts[i + 1][1], lerp(Lf[i + 2][0], pts[i + 2][0], .6), lerp(Lf[i + 2][1], pts[i + 2][1], .6)); ctx.stroke(); }
  ctx.restore();
  poly2(Lf, Rt); ctx.strokeStyle = ink; ctx.lineWidth = 4.5; ctx.lineJoin = 'round'; ctx.stroke();
}
