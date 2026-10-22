/* =====================================================================
   VIGNETTE ART — the painted memory-scenes.
   Every figure is a Path2D whose sub-shapes all wind clockwise, so they
   union into one silhouette; it is filled dark and rim-lit from the
   scene's light (vsil), or filled lit with a shade crescent (vlit).
   ===================================================================== */
const vArea = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; };
function vcr(P, pts) { // closed Catmull-Rom curve through the points
  if (vArea(pts) < 0) pts = pts.slice().reverse();
  const n = pts.length, at = i => pts[(i + n) % n];
  P.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
    P.bezierCurveTo(b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6, c[0], c[1]);
  }
  P.closePath(); return P;
}
function vpoly(P, pts) { if (vArea(pts) < 0) pts = pts.slice().reverse(); P.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) P.lineTo(pts[i][0], pts[i][1]); P.closePath(); return P; }
function vcirc(P, x, y, r) { P.moveTo(x + r, y); P.arc(x, y, r, 0, TAU); return P; }
function vell(P, x, y, rx, ry, rot = 0) { P.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx); P.ellipse(x, y, rx, ry, rot, 0, TAU); return P; }
function vlimb(P, pts, ws) { // tapered limb along a polyline
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = ws[i] / 2; L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R.unshift([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  vpoly(P, L.concat(R));
  for (let i = 0; i < n; i++) vcirc(P, pts[i][0], pts[i][1], ws[i] / 2);
  return P;
}
function vleaf(P, x, y, a, L, w, curl = 0) { // a pointed leaf / feather / lock of hair, clockwise
  const dx = Math.cos(a), dy = Math.sin(a), nx = dy, ny = -dx, c = curl;
  const tx = x + dx * L - nx * c, ty = y + dy * L - ny * c;
  P.moveTo(x + nx * w * .5, y + ny * w * .5);
  P.bezierCurveTo(x + dx * L * .3 + nx * w, y + dy * L * .3 + ny * w, x + dx * L * .75 + nx * w * .5 - nx * c * .8, y + dy * L * .75 + ny * w * .5 - ny * c * .8, tx, ty);
  P.bezierCurveTo(x + dx * L * .7 - nx * (w * .4 + c * .8), y + dy * L * .7 - ny * (w * .4 + c * .8), x + dx * L * .3 - nx * w * .65, y + dy * L * .3 - ny * w * .65, x - nx * w * .5, y - ny * w * .5);
  P.closePath(); return P;
}
function vsil(g, P, dark, rim, rw = 2, lx = .6, ly = -.8) {
  if (rim) { g.fillStyle = rim; g.fill(P); g.save(); g.clip(P); g.translate(-lx * rw, -ly * rw); }
  g.fillStyle = dark; g.fill(P); if (rim) g.restore();
}
function vlit(g, P, lit, shade, off = 3, lx = .6, ly = -.8) {
  g.fillStyle = shade; g.fill(P); g.save(); g.clip(P); g.translate(lx * off, ly * off); g.fillStyle = lit; g.fill(P); g.restore();
}
const vA = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const vM = (a, v, k) => [a[0] + v[0] * k, a[1] + v[1] * k];
const vMM = (a, v, k, w, j) => [a[0] + v[0] * k + w[0] * j, a[1] + v[1] * k + w[1] * j];

/* ---------------- smoke: soft puffs that climb and lean in the wind ---------------- */
const PUFF = {};
function puffSpr(col, v) {
  const key = col + v; if (PUFF[key]) return PUFF[key];
  const N = 128, c = mkCanvas(N, N), g = c.getContext('2d'), f = fogTex(), ox = -(v * 61) % 256, oy = -(v * 97) % 256;
  const rg = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  rg.addColorStop(0, 'rgba(255,255,255,.75)'); rg.addColorStop(.6, 'rgba(255,255,255,.3)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, N, N);
  for (let y = oy; y < N; y += 256) for (let x = ox; x < N; x += 256) g.drawImage(f, x, y);
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = rg; g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, N, N);
  return PUFF[key] = c;
}
function vsmoke(g, x, y, hgt, wid, col, a, t, seed, wind = .3) {
  const n = 18;
  for (let i = 0; i < n; i++) {
    const f = (i / n + t * .035 * (1 + hash2(seed, i) * .4)) % 1;
    const yy = y - f * hgt, xx = x + wind * f * f * hgt + Math.sin(f * 5 + seed + t * .25) * wid * .3;
    const r = wid * (.45 + f * 1.7), al = a * Math.min(1, f * 7) * Math.pow(Math.max(0, 1 - f), .7);
    g.globalAlpha = al; g.drawImage(puffSpr(col, (i + seed) % 4), xx - r, yy - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
}
function vflame(g, x, y, s, t, seed, n = 6) { // a tongue of fire, additive
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const P = new Path2D(), fl = Math.sin(t * (9 + i) + seed * 3 + i * 2), ox = (hash2(seed, i) - .5) * 26 * s;
    vleaf(P, x + ox, y, -PI / 2 + fl * .18 + (hash2(i, seed) - .5) * .5, (30 + 26 * hash2(seed, i + 9) + fl * 8) * s, 12 * s, fl * 5 * s);
    g.fillStyle = i % 2 ? 'rgba(255,200,90,.55)' : 'rgba(255,110,40,.5)'; g.fill(P);
  }
  g.restore();
  vglow(g, x, y - 16 * s, 70 * s, '#ff8a3a', .6);
}
function vember(g, w, h, n, seed, t, col, sp = 30, sz = 4) {
  for (let i = 0; i < n; i++) { const ex = (hash2(i, seed) * w + Math.sin(t * .8 + i) * 24) % w, ey = h - ((hash2(i, seed + 1) * h + t * sp * (.6 + hash2(i, seed + 2))) % h); vglow(g, ex, ey, sz * (.6 + hash2(i, seed + 3)), col, .55); }
}

/* ---------------- ravens ---------------- */
function vRaven(g, x, y, s, t, o = {}) {
  const P = new Path2D(), f = Math.sin(t * 7 + (o.ph || 0));
  if (o.perch) {
    vcr(P, [[-12, -2], [-4, -9], [8, -11], [13, -16], [18, -15], [20, -12], [14, -7], [10, 0], [2, 5], [-8, 4]]);
    vpoly(P, [[-10, -2], [-27, 9], [-23, 11], [-6, 4]]);
    vpoly(P, [[19, -15], [28, -12], [19, -10.5]]);
    vlimb(P, [[2, 3], [3, 12]], [2.2, 1.6]);
  } else {
    vcr(P, [[-14, -1], [0, -5], [14, -4], [19, -6], [22, -3], [16, 1], [0, 4], [-12, 3]]);
    vpoly(P, [[-12, -2], [-27, -6], [-29, 0], [-27, 6], [-12, 3]]);
    vpoly(P, [[21, -5], [29, -2], [21, -1]]);
    for (const k of [1, .75]) { const ff = f * k; vpoly(P, [[7, -1], [2, -1 - 16 * ff], [-5, -1 - 30 * ff], [-10, -1 - 34 * ff], [-12, -1 - 29 * ff], [-15, -1 - 30 * ff], [-16, -1 - 25 * ff], [-19, -1 - 25 * ff], [-15, -1 - 10 * ff], [-7, 1]]); }
  }
  g.save(); g.translate(x, y); g.scale(s * (o.face || 1), s);
  vsil(g, P, o.col || '#07060a', o.rim, 1.2 / s, (o.lx ?? .6) * (o.face || 1), o.ly ?? -.8);
  g.restore();
}

/* ---------------- people ---------------- */
const VPOSE = {
  stand: { hip: [0, -86], neck: [2, -146], head: [4, -160], shL: [-17, -140], elL: [-23, -114], haL: [-21, -90], shR: [21, -140], elR: [27, -114], haR: [29, -92], knL: [-8, -46], ftL: [-12, -5], knR: [10, -46], ftR: [15, -5] },
  look: { hip: [0, -86], neck: [3, -146], head: [8, -158], shL: [-16, -140], elL: [-22, -114], haL: [-20, -90], shR: [22, -140], elR: [28, -114], haR: [30, -92], knL: [-8, -46], ftL: [-12, -5], knR: [10, -46], ftR: [15, -5] },
  kneel: { hip: [-2, -50], neck: [8, -108], head: [13, -122], shL: [-9, -102], elL: [-2, -78], haL: [12, -62], shR: [25, -102], elR: [32, -77], haR: [37, -56], knL: [-6, -7], ftL: [-36, -5], knR: [20, -46], ftR: [23, -5] },
  lie: { hip: [10, -13], neck: [-50, -15], head: [-64, -17], shL: [-46, -7], elL: [-28, -4], haL: [-10, -5], shR: [-46, -23], elR: [-38, -48], haR: [-30, -74], knL: [44, -10], ftL: [80, -6], knR: [44, -26], ftR: [80, -9] },
  sit: { hip: [0, -34], neck: [5, -94], head: [9, -108], shL: [-12, -88], elL: [-6, -62], haL: [10, -52], shR: [21, -88], elR: [30, -64], haR: [37, -50], knL: [26, -40], ftL: [28, -5], knR: [32, -42], ftR: [36, -5] },
  horn: { hip: [0, -34], neck: [4, -94], head: [7, -108], shL: [-12, -88], elL: [-6, -62], haL: [10, -52], shR: [20, -88], elR: [34, -100], haR: [32, -124], knL: [26, -40], ftL: [28, -5], knR: [32, -42], ftR: [36, -5] },
  ride: { hip: [0, 0], neck: [6, -60], head: [10, -74], shL: [-8, -54], elL: [4, -32], haL: [20, -30], shR: [18, -54], elR: [28, -32], haR: [38, -28], knL: [20, 16], ftL: [10, 46], knR: [22, 14], ftR: [12, 44] },
  dead: { hip: [10, -10], neck: [-50, -12], head: [-64, -10], shL: [-46, -6], elL: [-66, -2], haL: [-84, -4], shR: [-46, -18], elR: [-28, -22], haR: [-12, -12], knL: [44, -8], ftL: [80, -5], knR: [42, -18], ftR: [74, -6] },
  vkneel: { hip: [0, -44], neck: [8, -98], head: [17, -108], shL: [-5, -94], elL: [4, -72], haL: [16, -58], shR: [18, -94], elR: [24, -70], haR: [28, -52], knL: [14, -7], ftL: [-24, -5], knR: [20, -7], ftR: [-18, -4] },
  vsit: { hip: [0, -32], neck: [10, -86], head: [18, -97], shL: [-2, -81], elL: [-2, -56], haL: [12, -44], shR: [24, -82], elR: [28, -58], haR: [32, -44], knL: [24, -36], ftL: [26, -5], knR: [28, -38], ftR: [32, -5] },
  vride: { hip: [0, 0], neck: [9, -56], head: [13, -69], shL: [-1, -51], elL: [14, -38], haL: [30, -36], shR: [17, -51], elR: [30, -66], haR: [40, -86], knL: [20, 14], ftL: [8, 40], knR: [22, 14], ftR: [10, 42] },
};
/* one person, built from joints. o.kind 'man' | 'valk'; drawn facing right unless o.face = -1 */
function vHuman(g, x, y, s, J, o = {}) {
  const f = o.face || 1, t = G.vigT + (o.ph || 0), valk = o.kind === 'valk', wd = Math.sin(t * 2.1) * (o.wind ?? 1);
  let ux = J.neck[0] - J.hip[0], uy = J.neck[1] - J.hip[1]; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
  const u = [ux, uy], p = [-uy, ux], hd = J.head;
  const B = new Path2D(), F = new Path2D(), C = new Path2D(), Hh = new Path2D(), Mt = new Path2D();
  // cloak, behind everything
  if (o.cloak) {
    const back = vM(J.hip, p, -14);
    if (o.stream) vcr(C, [vM(J.neck, p, 6), vMM(J.neck, p, -8, u, 4), vM(J.shL, u, 2), [J.hip[0] - 40 - wd * 6, J.hip[1] - 26], [J.hip[0] - 62 - wd * 10, J.hip[1] - 8 + wd * 4], [J.hip[0] - 48 - wd * 8, J.hip[1] + 8], [J.hip[0] - 8, J.hip[1] + 4], vM(J.hip, p, 6)]);
    else {
      const hemY = Math.min((o.ground ?? 0) - 3, J.hip[1] + (valk ? 64 : 74));
      vcr(C, [vM(J.neck, p, 8), vMM(J.neck, p, -8, u, 4), vM(J.shL, u, 2), vM(back, u, 30), [back[0] - 12 - wd * 6, hemY - 8], [back[0] - 4 - wd * 9, hemY], [J.hip[0] + 6 - wd * 3, hemY + 1], vM(J.hip, p, 6)]);
    }
  }
  const mid = vA(J.hip, J.neck, .5);
  // far limbs
  vlimb(F, [J.shL, J.elL, J.haL], valk ? [8, 6.5, 5] : [11, 9, 7]); vcirc(F, J.haL[0], J.haL[1], valk ? 4 : 5.5);
  if (!valk || o.legs) { vlimb(F, [vM(J.hip, p, -5), J.knL, J.ftL], valk ? [11, 8, 6] : [16, 11, 8]); const bt = o.boot || [4, -1, 0]; vell(F, J.ftL[0] + bt[0], J.ftL[1] + bt[1], 9, 5, bt[2]); }
  // near limbs and body
  if (!valk || o.legs) { vlimb(B, [vM(J.hip, p, 5), J.knR, J.ftR], valk ? [11, 8, 6] : [16, 11, 8]); const bt = o.boot || [4, -1, 0]; vell(B, J.ftR[0] + bt[0], J.ftR[1] + bt[1], 9, 5, bt[2]); }
  if (valk) {
    vcr(B, [vM(J.hip, p, -9), vM(mid, p, -9), vM(J.shL, u, 2), vM(J.neck, u, 3), vM(J.shR, u, 2), vM(mid, p, 9), vM(J.hip, p, 9)]);
    if (o.dress) vcr(B, o.dress === 'kneel'
      ? [vM(J.hip, p, -11), vM(J.hip, p, 11), [J.knR[0] + 12, J.knR[1] - 6], [J.knR[0] + 10, J.knR[1] + 6], [J.ftL[0] - 16 - wd * 3, J.ftL[1] + 5], [J.ftL[0] - 8, J.ftL[1] - 14], vA(J.hip, J.ftL, .5)]
      : [vM(J.hip, p, -10), vM(J.hip, p, 10), vM(J.knR, p, 9), vM(J.ftR, p, 13 + wd * 3), vM(J.ftL, p, -15 - wd * 5), vM(J.knL, p, -8)]);
    else vcr(B, [vMM(J.hip, p, -11, u, 6), vMM(J.hip, p, 11, u, 6), vM(vA(J.hip, J.knR, .7), p, 8), vA(J.hip, vA(J.knL, J.knR, .5), .8), vM(vA(J.hip, J.knL, .7), p, -9 - wd * 2)]);
  } else {
    vcr(B, [vM(J.hip, p, -13), vM(mid, p, -16), vM(J.shL, u, 3), vM(J.neck, u, 6), vM(J.shR, u, 3), vM(mid, p, 15), vM(J.hip, p, 13)]);
    vcr(B, [vMM(J.hip, p, -14, u, 8), vMM(J.hip, p, 14, u, 8), vM(vA(J.hip, J.knR, .55), p, 10), vA(J.hip, vA(J.knL, J.knR, .5), .62), vM(vA(J.hip, J.knL, .55), p, -11)]);
    if (o.mantle !== 0) { // fur over the shoulders
      for (const [a, r] of [[J.shL, 9.5], [J.shR, 9.5], [J.neck, 11], [vA(J.shL, J.neck, .5), 8.5], [vA(J.shR, J.neck, .5), 8.5]]) vcirc(B, a[0] + u[0] * 4, a[1] + u[1] * 4, r);
      for (let i = 0; i < 7; i++) { const q = vA(J.shL, J.shR, i / 6); vleaf(B, q[0] - u[0] * 4, q[1] - u[1] * 4, Math.atan2(-u[1], -u[0]) + (i - 3) * .12, 12, 7); }
    }
  }
  vlimb(B, [J.shR, J.elR, J.haR], valk ? [8, 6.5, 5] : [11, 9, 7]); vcirc(B, J.haR[0], J.haR[1], valk ? 4 : 5.5);
  vlimb(B, [J.neck, hd], valk ? [7, 7] : [10, 10]);
  vcirc(B, hd[0], hd[1], valk ? 9 : 10.5);
  if (!valk) {
    if (o.helm !== 0) {
      vcr(B, [vM(hd, p, -11.5), vMM(hd, p, -8.5, u, 9), vM(hd, u, 13), vMM(hd, p, 8.5, u, 9), vM(hd, p, 11.5), vMM(hd, p, 11.5, u, -2), vMM(hd, p, -11.5, u, -2)]);
      vpoly(B, [vMM(hd, p, 9, u, 2), vMM(hd, p, 12.5, u, 2), vMM(hd, p, 12, u, -8), vMM(hd, p, 9.5, u, -8)]);
      if (o.horns !== 0) for (const sd of [-1, 1]) vlimb(B, [vMM(hd, p, 7 * sd, u, 7), vMM(hd, p, 15 * sd, u, 10), vMM(hd, p, 20 * sd, u, 20), vMM(hd, p, 17 * sd, u, 29)], [5.5, 4.2, 2.6, .8]);
    } else vlimb(B, [vMM(hd, p, -7, u, 2), vMM(hd, p, -13, u, -8), vMM(hd, p, -15 - wd * 2, u, -16)], [9, 6, 2]);
    if (o.beard !== 0) vcr(B, [vMM(hd, p, 2, u, -3), vMM(hd, p, 11, u, -4), vMM(hd, p, 10, u, -13), vMM(hd, p, 5, u, -22), vM(hd, u, -15), vMM(hd, p, -3, u, -6)]);
    if (o.axe) { // the axe: haft, and a bearded head with its blade facing forward
      const a = o.axe.dir, h0 = J.haR; let n = [-a[1], a[0]]; if (n[0] < 0 || (n[0] === 0 && n[1] > 0)) n = [-n[0], -n[1]];
      const s0 = vM(h0, a, -(o.axe.back || 10)), E = vM(h0, a, o.axe.len || 80);
      vpoly(B, [vM(s0, n, -1.9), vM(s0, n, 1.9), vM(E, n, 1.9), vM(E, n, -1.9)]);
      vpoly(B, [[2, -2], [2, 3], [4, 8], [6, 16], [-2, 19], [-14, 17], [-10, 10], [-6, 3], [-6, -2]].map(([q, r]) => vMM(E, a, q, n, r)));
    }
  } else {
    // helm cap with little swan wings, and the braid
    vcr(Mt, [vM(hd, p, -9.8), vMM(hd, p, -7, u, 7.5), vM(hd, u, 10.5), vMM(hd, p, 7, u, 7.5), vM(hd, p, 9.8), vMM(hd, p, 9.8, u, -1.5), vMM(hd, p, -9.8, u, -1.5)]);
    for (let i = 0; i < 3; i++) { const b0 = vMM(hd, p, -5, u, 6), a = Math.atan2(u[1] - p[1] * .9, u[0] - p[0] * .9) - .35 + i * .3; vleaf(Mt, b0[0], b0[1], a, 15 - i * 2.5, 4.4); }
    if (o.stream) { const w2 = Math.sin(t * 4.3); vlimb(Hh, [vMM(hd, p, -6, u, 2), vMM(hd, p, -18, u, -4 + w2 * 2), vMM(hd, p, -30, u, -3 - w2 * 4), vMM(hd, p, -42, u, -6 + w2 * 5), vMM(hd, p, -52, u, -8 - w2 * 3)], [11, 8, 6, 4, 1.5]); }
    else vlimb(Hh, [vMM(hd, p, -6, u, 1), vMM(hd, p, -12, u, -14), vMM(hd, p, -14 - wd * 2, u, -32), vMM(hd, p, -15 - wd * 4, u, -50)], [10, 7, 5, 2]);
  }
  g.save(); g.translate(x, y); g.scale(s * f, s);
  const lx = (o.lx ?? .6) * f, ly = o.ly ?? -.8, rw = (o.rwPx ?? 1.6) / s;
  if (o.before) o.before(g, J, u, p);
  if (o.lit) {
    if (o.cloak) vlit(g, C, o.cloak, mix(o.cloak, '#000000', .5), 3, lx, ly);
    vlit(g, F, mix(o.lit, o.shade, .35), mix(o.shade, '#000000', .25), 3, lx, ly);
    vlit(g, B, o.lit, o.shade, 3, lx, ly);
    if (valk) { vlit(g, Hh, o.hair || '#e6c27a', '#8a6a30', 2, lx, ly); vlit(g, Mt, o.metal || '#e8e4dc', '#8a8680', 2, lx, ly); }
  } else {
    if (o.cloak) vsil(g, C, o.cloak, o.rim, rw, lx, ly);
    vsil(g, F, o.darkF || o.dark || '#080608', o.rim && hexA(o.rim, .6), rw, lx, ly);
    vsil(g, B, o.dark || '#080608', o.rim, rw, lx, ly);
    if (valk) { vsil(g, Hh, o.hair || o.dark, o.rim, rw, lx, ly); vsil(g, Mt, o.metal || o.dark, o.rim, rw, lx, ly); }
  }
  if (o.after) o.after(g, J, u, p);
  g.restore();
}

/* ---------------- a swan wing: arm along +x arching up, feathers hanging toward +y ---------------- */
function vWing(g, x, y, s, rot, o = {}) {
  const L = 100, sp = o.spread ?? 1, col = o.col || '#f3efe6', sh = o.shade || '#a99f94', edge = o.edge || 'rgba(60,48,40,.32)';
  const arm = u => { const a = 1 - u; return [2 * a * u * L * .42 + u * u * L, -2 * a * u * L * .34 - u * u * L * .1]; };
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s * (o.side || 1), s);
  g.lineWidth = .8 / Math.max(.4, s); g.strokeStyle = edge;
  const fea = (u, phi, len, wid, c) => { const b = arm(u), P = new Path2D(); vleaf(P, b[0], b[1], lerp(1.72, phi, sp), len, wid); g.fillStyle = c; g.fill(P); g.stroke(P); };
  const miss = o.missing || 0; // a wing that has been paying for someone: feathers gone
  for (let i = 0; i < 10; i++) { const k = i / 9; if (hash2(i, 77) < miss) continue; fea(lerp(1, .6, k), lerp(-.14, .95, k), L * lerp(.95, .62, k), 12, mix(col, sh, .55 - k * .2)); }
  for (let i = 0; i < 11; i++) { const k = i / 10; if (hash2(i, 78) < miss) continue; fea(lerp(.58, .07, k), lerp(1.05, 1.55, k), L * lerp(.6, .52, k), 14, mix(col, sh, .32)); }
  for (let i = 0; i < 13; i++) { const k = i / 12, u = lerp(.95, .05, k); fea(u, 1.5 - 1.4 * Math.pow(u, 1.5), L * lerp(.36, .3, k), 13, mix(col, sh, .14)); }
  for (let i = 0; i < 14; i++) { const k = i / 13, u = lerp(.92, .03, k); fea(u, 1.45 - 1.3 * Math.pow(u, 1.4), L * .18, 11, col); }
  const E = new Path2D(), pts = [], ws = []; for (let i = 0; i <= 6; i++) { pts.push(arm(i / 6)); ws.push(lerp(14, 3, i / 6)); }
  vlimb(E, pts, ws); g.fillStyle = col; g.fill(E);
  if (o.rim) { g.save(); g.clip(E); g.strokeStyle = o.rim; g.lineWidth = 3 / s; g.stroke(E); g.restore(); }
  g.restore();
}

/* ---------------- the ash horse ---------------- */
const HORSE = [[-90, -24], [-62, -38], [-20, -32], [20, -35], [44, -45], [70, -72], [91, -99], [104, -103], [113, -96], [134, -62], [141, -52], [137, -44], [124, -46], [112, -56], [102, -62], [86, -40], [73, -8], [60, 14], [30, 23], [-20, 25], [-56, 19], [-78, 8], [-92, -8]];
function vHorse(g, x, y, s, t, o = {}) {
  const f = o.face || 1, fly = o.fly, ph0 = t * (o.speed || 7);
  const B = new Path2D(), F = new Path2D(), M = new Path2D();
  vcr(B, HORSE);
  vpoly(B, [[95, -97], [92, -117], [101, -101]]); vpoly(F, [[100, -100], [100, -115], [106, -101]]);
  const leg = (P, hx, hy, ph, front) => {
    const fold = clamp((fly ? .5 : .45) + (fly ? .5 : 1.15) * Math.sin(ph + 1.9), 0, 1.7);
    if (front) {
      const r = fly ? .75 : 0, a1 = r + .15 + (fly ? .25 : .55) * Math.sin(ph), j1 = [hx + Math.sin(a1) * 34, hy + Math.cos(a1) * 34];
      const a2 = a1 - fold, j2 = [j1[0] + Math.sin(a2) * 30, j1[1] + Math.cos(a2) * 30], a3 = a2 + fold * .6 + .3, j3 = [j2[0] + Math.sin(a3) * 11, j2[1] + Math.cos(a3) * 11];
      vlimb(P, [[hx, hy], j1, j2, j3], [17, 10, 7, 6]); vcirc(P, j3[0], j3[1], 4.6);
    } else {
      const r = fly ? -.9 : 0, a1 = r + .45 + (fly ? .2 : .4) * Math.sin(ph), j1 = [hx + Math.sin(a1) * 30, hy + Math.cos(a1) * 30];
      const a2 = a1 - 1.25 - .3 * fold, j2 = [j1[0] + Math.sin(a2) * 32, j1[1] + Math.cos(a2) * 32];
      const a3 = a2 + .95 + .5 * fold, j3 = [j2[0] + Math.sin(a3) * 30, j2[1] + Math.cos(a3) * 30], a4 = a3 + .35, j4 = [j3[0] + Math.sin(a4) * 10, j3[1] + Math.cos(a4) * 10];
      vlimb(P, [[hx, hy], j1, j2, j3, j4], [28, 17, 9, 7, 6]); vcirc(P, j4[0], j4[1], 4.6);
    }
  };
  leg(F, 50, 0, ph0, 1); leg(B, 57, 4, ph0 + .7, 1);
  leg(F, -56, -6, ph0 + 2.4, 0); leg(B, -62, -2, ph0 + 3.1, 0);
  // mane and tail, streaming
  for (let i = 0; i < 9; i++) { const k = i / 8, c = vA([92, -98], [44, -44], k), wv = Math.sin(t * 5 + i) * .15; vleaf(M, c[0], c[1], PI * .88 + wv - k * .2, 24 + 10 * Math.sin(i * 1.7) ** 2, 9, Math.sin(t * 4 + i) * 4); }
  vleaf(M, 100, -100, -.3, 14, 6);
  for (let i = 0; i < 7; i++) { const wv = Math.sin(t * 3.4 + i * .8); vleaf(M, -88, -22 + i * 1.5, PI + .1 + i * .07 + wv * .1, 64 + i * 4 - Math.abs(i - 3) * 6, 12, wv * 9); }
  g.save(); g.translate(x, y); g.scale(s * f, s);
  const lx = (o.lx ?? .6) * f, ly = o.ly ?? -.8;
  if (o.lit) {
    vlit(g, F, mix(o.lit, o.shade, .45), mix(o.shade, '#000000', .3), 3, lx, ly);
    vlit(g, M, o.mane || mix(o.lit, '#ffffff', .3), o.shade, 3, lx, ly);
    vlit(g, B, o.lit, o.shade, 3.5, lx, ly);
    g.fillStyle = '#1a1614'; g.beginPath(); g.ellipse(116, -82, 2.4, 1.8, -.4, 0, TAU); g.fill();
  } else {
    const rw = (o.rwPx ?? 1.6) / s;
    vsil(g, F, o.darkF || o.dark, o.rim && hexA(o.rim, .6), rw, lx, ly); vsil(g, M, o.dark, o.rim, rw, lx, ly); vsil(g, B, o.dark, o.rim, rw, lx, ly);
  }
  g.restore();
}
/* the Valkyrie on her ash horse, wings up; optionally Einar riding behind */
function vRider(g, x, y, s, t, o = {}) {
  const f = o.face || 1, flap = Math.sin(t * (o.flapF || 2.2)) * (o.flapA ?? .3);
  const lit = { lit: '#f1ebe0', shade: '#9a8f84', lx: o.lx ?? .4, ly: o.ly ?? -.9 };
  const sx = x + 4 * s * f, sy = y - 40 * s;
  // far wing, then near wing, both behind the riders
  const wing = (side, rot, k) => vWing(g, sx + 12 * s * f, sy - 50 * s, s * .95, rot * f, { side: side * f, spread: .95, col: mix('#f6f2ea', '#b8ae9f', k), shade: '#8f8579', rim: o.wrim });
  wing(1, -1.2 - flap, .3);
  wing(-1, .95 - flap * .8, 0);
  vHorse(g, x, y, s, t, { face: f, fly: o.fly, speed: o.speed, lit: o.horse || '#d6cfc6', shade: o.horseShade || '#6e6660', mane: '#ece6dc', lx: lit.lx, ly: lit.ly });
  if (o.einar) vHuman(g, sx - 20 * s * f, sy + 2 * s, s * .98, VPOSE.ride, { face: f, ph: 1, lit: '#8a7462', shade: '#3a2c24', cloak: '#8e2a20', stream: 1, horns: 1, lx: lit.lx, ly: lit.ly });
  vHuman(g, sx, sy, s, VPOSE.vride, Object.assign({ kind: 'valk', face: f, stream: 1, legs: 1, cloak: '#ece6da', hair: '#e9c77c', metal: '#f4efe4' }, lit, { lit: '#aeb4be', shade: '#454b55' }));
  if (o.spear !== 0) { // a spear made of light
    const hx = sx + 40 * s * f, hy = sy - 86 * s, a = -1.05, L = 120 * s, ex = hx + Math.cos(a) * L * f, ey = hy + Math.sin(a) * L, bx = hx - Math.cos(a) * 30 * s * f, by = hy - Math.sin(a) * 30 * s;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,236,190,.35)'; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = '#fff6dc'; g.lineWidth = 2.2 * s; g.stroke(); g.restore();
    vglow(g, ex, ey, 46 * s, '#fff0c0', .9); vglow(g, ex, ey, 10 * s, '#ffffff', 1);
  }
}

/* ---------------- the Wanderer ---------------- */
function vOdin(g, x, y, s, t, o = {}) {
  const C = new Path2D(), w1 = Math.sin(t * .9) * 6, w2 = Math.sin(t * 1.3 + 1) * 6;
  vcr(C, [[-60, -4], [-71 - w1 * .4, -70], [-63, -130], [-46, -176], [-26, -196], [0, -202], [26, -196], [46, -176], [61, -130], [70, -70], [76 + w2, -12], [62 + w2, 2], [44, -6], [28, 3], [10, -4], [-8, 3], [-26, -5], [-44, 4]]);
  vcr(C, [[28, -186], [52, -170], [70, -164], [78, -150], [62, -140], [38, -150]]);
  vcr(C, [[-22, -212], [-20, -238], [-12, -251], [8, -250], [19, -241], [23, -212]]);
  vcr(C, [[-71, -203], [-44, -218], [0, -223], [43, -219], [71, -208], [61, -203], [0, -207], [-58, -199]]);
  vpoly(C, [[67.5, 6], [72.5, 6], [77.5, -280], [72.5, -280]]);
  vpoly(C, [[75, -310], [81, -292], [78, -280], [72, -280], [69, -292]]);
  vpoly(C, [[67, -279], [83, -279], [82, -275], [68, -275]]);
  g.save(); g.translate(x, y); g.scale(s, s);
  const rw = (o.rwPx ?? 2) / s;
  vsil(g, C, o.dark || '#07080e', o.rim, rw, .35, -.94);
  // the folds of the cloak
  g.save(); g.clip(C); g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const x0 = -54 + i * 13, sw = Math.sin(t * .9 + i) * 3;
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0 * .5, -170); g.quadraticCurveTo(x0 * .9 + sw, -90, x0 * 1.08 + sw * 1.5, 0); g.stroke();
    g.strokeStyle = hexA(o.rim || '#8090c0', .07); g.lineWidth = 5; g.beginPath(); g.moveTo(x0 * .5 + 4, -168); g.quadraticCurveTo(x0 * .9 + sw + 5, -90, x0 * 1.08 + sw * 1.5 + 5, 0); g.stroke(); }
  g.restore();
  // the beard, long and grey
  const Bd = new Path2D(); vcr(Bd, [[-15, -200], [15, -200], [19, -172], [13, -132], [4, -104], [0, -92], [-4, -105], [-13, -132], [-19, -172]]);
  const gr = g.createLinearGradient(0, -200, 0, -92); gr.addColorStop(0, o.beard || '#b9b4a8'); gr.addColorStop(1, '#4a4842');
  g.fillStyle = gr; g.fill(Bd);
  g.save(); g.clip(Bd); g.lineWidth = 1.1;
  for (let i = 0; i < 16; i++) { const x0 = -16 + i * 2.1, sw = Math.sin(t * .7 + i * .6) * 1.5; g.strokeStyle = i % 2 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.28)'; g.beginPath(); g.moveTo(x0, -200); g.quadraticCurveTo(x0 * 1.1 + sw, -150, x0 * .25 + sw, -94); g.stroke(); }
  g.restore();
  g.fillStyle = 'rgba(4,5,10,.85)'; g.beginPath(); g.ellipse(0, -205, 17, 9, 0, 0, TAU); g.fill();
  // moustache
  g.strokeStyle = '#8a867c'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-2, -196); g.quadraticCurveTo(-12, -192, -15, -180); g.moveTo(2, -196); g.quadraticCurveTo(12, -192, 15, -180); g.stroke();
  // Huginn on his shoulder
  vRaven(g, -40, -198, 1.3, t, { perch: 1, face: -1, col: o.dark || '#07080e', rim: o.rim });
  g.restore();
  // Gungnir's runes and the one eye
  vglow(g, x + 75 * s, y - 292 * s, 26 * s, '#ffe2a0', .5 + .2 * Math.sin(t * 2));
  vglow(g, x + 6 * s, y - 204 * s, 22 * s, '#ffe2a0', .9); vglow(g, x + 6 * s, y - 204 * s, 5 * s, '#ffffff', 1);
}

/* ---------------- a longship ---------------- */
function vShip(g, x, y, s, t, o = {}) {
  const H = new Path2D(), rim = o.rim, lx = .85, ly = -.5;
  vcr(H, [[-206, -26], [-160, 4], [-60, 16], [60, 16], [160, 4], [206, -26], [190, -30], [0, -21], [-190, -30]]);
  vlimb(H, [[196, -24], [218, -44], [228, -74], [238, -100], [250, -110]], [18, 13, 10, 8, 7]);
  vcr(H, [[242, -112], [256, -121], [272, -115], [277, -106], [263, -104], [252, -98], [244, -102]]);
  vpoly(H, [[256, -118], [253, -134], [263, -120]]);
  vlimb(H, [[-196, -24], [-216, -46], [-224, -76], [-216, -96], [-204, -100], [-198, -92]], [18, 13, 10, 8, 6, 4]);
  vpoly(H, [[-4, -20], [4, -20], [3, -240], [-3, -240]]);
  vpoly(H, [[-108, -230], [108, -230], [106, -224], [-106, -224]]);
  vlimb(H, [[0, -238], [-150, -30]], [1.4, 1.4]); vlimb(H, [[0, -238], [190, -40]], [1.4, 1.4]);
  for (let i = 0; i < 7; i++) { const ox = -150 + i * 48, a = .95 + Math.sin(t * 1.6 + i * .2) * .28; vlimb(H, [[ox, -14], [ox - Math.cos(a) * 74, -14 + Math.sin(a) * 74]], [3, 2.2]); }
  for (const [hx, sd] of [[-124, 1], [-64, 2], [40, 3], [100, 4]]) { vcirc(H, hx, -34, 7); vcr(H, [[hx - 7.5, -34], [hx - 5, -42], [hx, -44], [hx + 5, -42], [hx + 7.5, -34]]); }
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(Math.sin(t * 1.2) * .02);
  const rw = 1.8 / s;
  // the sail, bellied out by the wind
  const S = new Path2D(), bl = 14 + Math.sin(t * .9) * 4;
  S.moveTo(-104, -224); S.lineTo(104, -224); S.quadraticCurveTo(112 + bl, -140, 98, -56); S.lineTo(-98, -56); S.quadraticCurveTo(-90 + bl, -140, -104, -224); S.closePath();
  g.fillStyle = '#6a1c16'; g.fill(S);
  g.save(); g.clip(S);
  for (let i = 0; i < 5; i++) { const x0 = -104 + i * 44 + 10; g.fillStyle = '#c9b48e'; g.beginPath(); g.moveTo(x0, -226); g.lineTo(x0 + 18, -226); g.quadraticCurveTo(x0 + 22 + bl, -140, x0 + 16, -50); g.lineTo(x0 - 2, -50); g.quadraticCurveTo(x0 + 4 + bl, -140, x0, -226); g.fill(); }
  const sg = g.createLinearGradient(-104, 0, 110, 0); sg.addColorStop(0, 'rgba(10,6,6,.62)'); sg.addColorStop(1, 'rgba(255,190,120,.12)'); g.fillStyle = sg; g.fillRect(-120, -240, 260, 200);
  g.restore();
  vsil(g, H, o.dark || '#120c0a', rim, rw, lx, ly);
  // shields on the gunwale, catching the sun
  for (let i = 0; i < 14; i++) {
    const sx = -168 + i * 26, c = ['#9a7a34', '#4a1e14', '#2a3448'][i % 3];
    g.fillStyle = mix(c, '#120c0a', .35); g.beginPath(); g.arc(sx, -20, 11.5, 0, TAU); g.fill();
    g.strokeStyle = hexA(rim || '#ffd08a', .55); g.lineWidth = 1.6; g.beginPath(); g.arc(sx, -20, 10.6, -1.4, .3); g.stroke();
    g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(sx, -20, 3, 0, TAU); g.fill();
  }
  if (o.after) o.after(g);
  g.restore();
}

/* ---------------- the scenes ---------------- */
const VIGS = {
  deathbed(g, t, w, h, k) { // the hut, the straw, the candle
    vsky(g, w, h, ['#1a120d', '#24180f', '#0e0906']);
    for (let i = 0; i < 14; i++) { const x = i * w / 13, wg = g.createLinearGradient(x, 0, x + w / 13, 0); wg.addColorStop(0, '#2a1c12'); wg.addColorStop(.5, '#33231a'); wg.addColorStop(1, '#22170f'); g.fillStyle = wg; g.fillRect(x, 0, w / 13 - 3, h * .7); }
    g.fillStyle = 'rgba(0,0,0,.4)'; for (let i = 0; i < 14; i++) g.fillRect(i * w / 13 - 3, 0, 3, h * .7);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; for (let i = 0; i < 40; i++) { const x = hash2(i, 61) * w, y = hash2(i, 62) * h * .7; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y + 30, x + 2, y + 60 * hash2(i, 63)); g.stroke(); }
    // the window and the snow beyond it
    const wx = w * .72, wy = h * .16, ww = 120 * k, wh = 90 * k;
    g.fillStyle = '#0d1a2a'; g.fillRect(wx, wy, ww, wh);
    g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip(); vglow(g, wx + ww * .7, wy + wh * .3, 60 * k, '#9ab4d8', .35); vsnow(g, w, h, 60, 7, 20); g.restore();
    g.strokeStyle = '#120a06'; g.lineWidth = 6 * k; g.strokeRect(wx, wy, ww, wh); g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
    g.fillStyle = 'rgba(140,170,220,.06)'; g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx + ww, wy + wh); g.lineTo(wx + ww - 40 * k, h * .74); g.lineTo(wx - 120 * k, h * .74); g.fill();
    g.fillStyle = '#1a120c'; g.fillRect(0, h * .7, w, h * .3);
    // his father's axe on the wall, and the crutch
    g.save(); g.translate(w * .22, h * .3); g.rotate(-.5); g.scale(k, k);
    const AX = new Path2D(); vpoly(AX, [[-3, -6], [3, -6], [3, 140], [-3, 140]]); vpoly(AX, [[-2, 2], [-2, 8], [-10, 14], [-30, 18], [-38, -4], [-34, -22], [-20, -8], [-4, -6]]);
    vlit(g, AX, '#6a5644', '#2a1e14', 2, -.8, .4); g.fillStyle = '#a8aab0'; g.beginPath(); g.moveTo(-30, 18); g.quadraticCurveTo(-40, 6, -34, -22); g.lineTo(-31, -20); g.quadraticCurveTo(-36, 6, -27, 16); g.fill();
    g.restore();
    g.strokeStyle = '#4a3220'; g.lineWidth = 5 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * .66, h * .74); g.lineTo(w * .69, h * .38); g.moveTo(w * .672, h * .4); g.lineTo(w * .716, h * .385); g.stroke();
    // the straw bed and the sleeper, lit from the candle on the left
    const bx = w * .45, by = h * .78;
    g.save(); g.translate(bx, by); g.scale(k, k);
    const LX = -.8, LY = -.5;
    g.fillStyle = '#2a1a10'; g.fillRect(-196, -4, 384, 26); g.fillStyle = 'rgba(255,170,90,.12)'; g.fillRect(-196, -4, 384, 3);
    const ST = new Path2D(); vcr(ST, [[-200, -2], [-170, -26], [0, -30], [170, -26], [192, -2], [0, 6]]); vlit(g, ST, '#9a7c48', '#4e3a20', 4, LX, LY);
    g.strokeStyle = 'rgba(220,190,120,.5)'; g.lineWidth = 1.3; for (let i = 0; i < 70; i++) { const x = (hash2(i, 1) - .5) * 380, y = -22 + hash2(i, 2) * 22; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14 + hash2(i, 3) * 8, y - 3 + hash2(i, 4) * 6); g.stroke(); }
    const PL = new Path2D(); vell(PL, -150, -32, 30, 11); vlit(g, PL, '#5a2a22', '#2a1210', 3, LX, LY);
    const HD = new Path2D(); vcr(HD, [[-170, -40], [-163, -54], [-154, -58], [-149, -59], [-145, -67], [-141, -60], [-137, -58], [-131, -56], [-128, -48], [-140, -38], [-160, -32]]);
    vlit(g, HD, '#c09a7a', '#6a4a38', 3, LX, LY);
    const HR = new Path2D(); vcr(HR, [[-174, -36], [-171, -50], [-163, -57], [-160, -50], [-162, -40], [-156, -32], [-166, -28]]); vlit(g, HR, '#8a8478', '#3a3630', 2, LX, LY);
    const BD = new Path2D(); vcr(BD, [[-140, -57], [-130, -58], [-116, -54], [-110, -46], [-118, -40], [-132, -42], [-140, -48]]); vlit(g, BD, '#a8a294', '#4a463e', 2, LX, LY);
    g.strokeStyle = '#3a2a22'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-156, -54); g.lineTo(-151, -54); g.stroke();
    const BL = new Path2D(); vcr(BL, [[-122, -44], [-100, -62], [-60, -58], [-30, -52], [10, -62], [60, -58], [110, -54], [150, -46], [168, -26], [150, -14], [-120, -16]]);
    vlit(g, BL, '#5e4a3c', '#241a14', 5, LX, LY);
    g.save(); g.clip(BL); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; for (const fx of [-70, -10, 50, 110]) { g.beginPath(); g.moveTo(fx, -60); g.quadraticCurveTo(fx + 14, -36, fx + 6, -14); g.stroke(); } g.restore();
    const AR = new Path2D(); vlimb(AR, [[-104, -58], [-80, -66], [-52, -62]], [11, 9, 8]); vlit(g, AR, '#5e4a3c', '#241a14', 3, LX, LY);
    const HN = new Path2D(); vcr(HN, [[-56, -66], [-44, -68], [-38, -62], [-44, -57], [-56, -58]]); vlit(g, HN, '#c09a7a', '#6a4a38', 2, LX, LY);
    g.restore();
    // the candle
    const cx = w * .14, cy = h * .66, out = G.vigFlag ? Math.min(1, (t - G.vigFlagT) / 1.5) : 0;
    g.fillStyle = '#2a1c10'; g.fillRect(cx - 30 * k, cy, 60 * k, 70 * k); g.fillStyle = 'rgba(255,170,90,.18)'; g.fillRect(cx - 30 * k, cy, 60 * k, 4 * k);
    const cg = g.createLinearGradient(cx - 6 * k, 0, cx + 6 * k, 0); cg.addColorStop(0, '#f4ead0'); cg.addColorStop(1, '#a89c80'); g.fillStyle = cg; g.fillRect(cx - 6 * k, cy - 34 * k, 12 * k, 34 * k);
    g.fillStyle = '#e8dcc0'; g.beginPath(); g.moveTo(cx + 6 * k, cy - 30 * k); g.quadraticCurveTo(cx + 9 * k, cy - 18 * k, cx + 7 * k, cy - 10 * k); g.lineTo(cx + 5 * k, cy - 30 * k); g.fill();
    const fl = (1 - out) * (1 + Math.sin(t * 13) * .08 + Math.sin(t * 7) * .06);
    if (fl > .01) { g.fillStyle = '#ffe7a0'; g.beginPath(); g.ellipse(cx, cy - 42 * k, 4 * k * fl, 10 * k * fl, 0, 0, TAU); g.fill(); g.fillStyle = '#fff8e0'; g.beginPath(); g.ellipse(cx, cy - 40 * k, 1.6 * k * fl, 5 * k * fl, 0, 0, TAU); g.fill(); vglow(g, cx, cy - 42 * k, 360 * k * fl, '#ff9a3a', .8 * fl); }
    else { g.strokeStyle = 'rgba(160,160,160,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - 36 * k); g.quadraticCurveTo(cx + 10 * k + Math.sin(t * 2) * 6, cy - 80 * k, cx - 6 * k, cy - 140 * k); g.stroke(); }
    g.fillStyle = `rgba(0,0,0,${.3 + out * .5})`; g.fillRect(0, 0, w, h);
  },
  void(g, t, w, h, k) { // Ginnungagap and the Wanderer
    drawBackdrop(g, 'void', w, h, '#020309', '#121a3a', '#7a8ac8', .95, .006, .5, .22) || vsky(g, w, h, ['#03040a', '#0a0f22', '#060812']);
    stars(g, w, h, 220, 3, 1);
    for (let j = 0; j < 3; j++) { g.beginPath(); for (let x = 0; x <= w; x += 20) { const y = h * (.18 + j * .06) + Math.sin(x * .006 + t * .4 + j) * 30 * k; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = `rgba(${j ? 120 : 90},255,${j ? 200 : 160},.08)`; g.lineWidth = 40 * k; g.stroke(); }
    vfog(g, w, h, '#6a7ab0', .12, -9, h * .45, 1.1);
    const rise = Math.min(1, t / 3), ox = w * .56, oy = h * 1.04 + (1 - rise) * 50 * k, s = (h * .97) / 310;
    vglow(g, ox, oy - 200 * s, 260 * s, '#3a4a9a', .5 * rise);
    g.save(); g.globalAlpha = rise; vOdin(g, ox, oy, s, t, { dark: '#070910', rim: '#a8bcff' }); g.restore();
    vfog(g, w, h, '#8a90c0', .22, 14, h * .92, 1.4);
    // Huginn's brother, circling
    const a = t * .55, rx = ox + Math.cos(a) * 200 * s, ry = oy - 250 * s + Math.sin(a) * 30 * s;
    vRaven(g, rx, ry, 1.1 * k, t, { face: -Math.sign(Math.sin(a)) || 1, rim: '#8a9ad8' });
    // Einar on a tooth of rock, looking up
    const R = new Path2D(); vcr(R, [[w * .1, h], [w * .14, h * .93], [w * .22, h * .9], [w * .3, h * .905], [w * .37, h * .94], [w * .4, h]]);
    vsil(g, R, '#04050a', '#7a8ad0', 1.6, .5, -.85);
    vHuman(g, w * .25, h * .905, .4 * k * 1.2, VPOSE.look, { cloak: '#4a120e', dark: '#06070c', rim: '#a8b8f0', axe: { dir: [.18, .98], len: 76 }, lx: .5, ly: -.86 });
  },
  ship(g, t, w, h, k) { // the young wolf at the prow
    drawBackdrop(g, 'ship', w, h, '#2a1a34', '#e88a5a', '#fff0c0', .6, .005, .7, .55) || vsky(g, w, h, ['#2a1a30', '#a0503a', '#f0b070', '#5a6a80']);
    const sx = w * .74, sy = h * .55; vglow(g, sx, sy, 300 * k, '#ffcf7a', .85); g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(sx, sy, 34 * k, 0, TAU); g.fill();
    const sea = g.createLinearGradient(0, h * .58, 0, h); sea.addColorStop(0, '#5a4a5a'); sea.addColorStop(.3, '#2a3048'); sea.addColorStop(1, '#141a2a'); g.fillStyle = sea; g.fillRect(0, h * .58, w, h * .42);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) { const y = h * .59 + i * i * .22 * k, wdt = (14 + i * 3.2) * k * (.6 + .4 * Math.sin(t * 2 + i * 1.7)); g.fillStyle = `rgba(255,214,150,${.32 - i * .006})`; g.fillRect(sx - wdt / 2 + Math.sin(t + i) * 6 * k, y, wdt, 1.6 * k); }
    g.restore();
    for (let i = 0; i < 22; i++) { const y = h * .6 + i * i * .9 * k, a = .14 - i * .005; if (a <= 0) continue; g.strokeStyle = `rgba(255,210,170,${a})`; g.lineWidth = 1.4; g.beginPath(); for (let x = 0; x <= w; x += 24) { const yy = y + Math.sin(x * .02 + t * 1.4 + i) * 3 * k; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    const bx = w * .4 + Math.sin(t * .3) * 10 * k, by = h * .66 + Math.sin(t * 1.2) * 4 * k, s = k * .95;
    vShip(g, bx, by, s, t, { rim: '#ffcf8a', after: gg => vHuman(gg, 186, -28, .5, VPOSE.stand, { helm: 0, beard: 0, mantle: 0, cloak: '#4a120e', dark: '#120c0a', rim: '#ffd8a0', rwPx: 1.4, axe: { dir: [.15, .99], len: 74 }, lx: .85, ly: -.5 }) });
    for (let i = 0; i < 4; i++) { const gx = (w * .2 + i * 90 * k + t * 30 * k) % w, gy = h * .3 + Math.sin(t + i) * 20 * k; g.strokeStyle = '#2a1a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx - 10 * k, gy); g.quadraticCurveTo(gx - 4 * k, gy - 6 * k + Math.sin(t * 6 + i) * 3 * k, gx, gy); g.quadraticCurveTo(gx + 4 * k, gy - 6 * k + Math.sin(t * 6 + i) * 3 * k, gx + 10 * k, gy); g.stroke(); }
  },
  hrafnsey(g, t, w, h, k) { // the beach, the smoke, the swan-cloak
    drawBackdrop(g, 'hrafnsey', w, h, '#1a0606', '#c04a20', '#ffd8a0', .78, .006, .64, .22) || vsky(g, w, h, ['#1a0606', '#6a1a10', '#c04a20', '#3a1410']);
    const sl = h * .62;
    const sea = g.createLinearGradient(0, sl, 0, h * .7); sea.addColorStop(0, '#4a1a12'); sea.addColorStop(1, '#1e0a08'); g.fillStyle = sea; g.fillRect(0, sl, w, h * .1);
    g.strokeStyle = 'rgba(255,140,80,.18)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { const y = sl + 3 + i * i * 1.2 * k; g.beginPath(); for (let x = 0; x <= w; x += 30) { const yy = y + Math.sin(x * .03 + t + i) * 1.5; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    // burning ships along the waterline, and their smoke
    for (const [xf, sc, sd] of [[.08, .8, 1], [.45, .55, 2], [.9, .9, 3]]) vsmoke(g, w * xf, sl, h * .85, 70 * k * sc, '#1c0a08', .62, t, sd, .32);
    for (const [xf, sc, sd] of [[.08, .8, 1], [.45, .55, 2], [.9, .9, 3]]) {
      const x = w * xf, s = k * sc * .5; vShip(g, x, sl + 6 * k, s, t * .2, { dark: '#120606', rim: '#ff7a3a' });
      vflame(g, x - 60 * s, sl - 8 * k, s * 2.4, t, sd); vflame(g, x + 40 * s, sl - 4 * k, s * 2, t, sd + 5, 5);
    }
    vfog(g, w, h, '#3a0e08', .35, 18, h * .58, 1.3);
    // the beach of the slain
    const BE = new Path2D(); BE.moveTo(0, h * .7); for (let x = 0; x <= w; x += 30) BE.lineTo(x, h * .69 + Math.sin(x * .013 + 1) * 8 * k + Math.sin(x * .041) * 3 * k); BE.lineTo(w, h); BE.lineTo(0, h); BE.closePath();
    const bg = g.createLinearGradient(0, h * .68, 0, h); bg.addColorStop(0, '#2a100a'); bg.addColorStop(1, '#0c0404'); g.fillStyle = bg; g.fill(BE);
    for (let i = 0; i < 9; i++) { const x = hash2(i, 11) * w, y = h * (.76 + hash2(i, 12) * .19); if (Math.abs(x - w * .27) < 70 * k && y > h * .8) continue; vHuman(g, x, y, k * (.34 + (y / h - .76) * .8), VPOSE.dead, { face: hash2(i, 14) < .5 ? -1 : 1, dark: '#0c0404', rim: 'rgba(200,80,40,.55)', rwPx: 1, helm: hash2(i, 15) < .6 ? 1 : 0, horns: 0, beard: 1, mantle: 0, wind: 0, boot: [0, -4, -PI / 2] }); }
    for (let i = 0; i < 16; i++) {
      const x = hash2(i, 9) * w, y = h * .74 + hash2(i, 3) * h * .2, a = (hash2(i, 5) - .5) * .9, L = (70 + hash2(i, 7) * 40) * k, ex = x + Math.sin(a) * L, ey = y - Math.cos(a) * L;
      g.strokeStyle = '#0a0404'; g.lineWidth = 2.6 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = 'rgba(255,120,60,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 1, y); g.lineTo(ex + 1, ey); g.stroke();
      g.fillStyle = '#0a0404'; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + Math.sin(a) * 12 * k - 3 * k, ey - Math.cos(a) * 12 * k); g.lineTo(ex + 3 * k, ey); g.fill();
      if (i % 4 === 0) { g.fillStyle = '#140806'; g.beginPath(); g.ellipse(x - 8 * k, y - 6 * k, 14 * k, 12 * k, .3, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,120,60,.35)'; g.beginPath(); g.ellipse(x - 8 * k, y - 6 * k, 13 * k, 11 * k, .3, -1.6, .2); g.stroke(); }
    }
    // the light from above
    const desc = Math.min(1, t / 6), vx = w * .7 - desc * w * .06, vy = h * (.12 + desc * .2), ex = w * .27, ey = h * .86;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(vx, vy, ex, ey); gr.addColorStop(0, 'rgba(255,240,200,.32)'); gr.addColorStop(1, 'rgba(255,240,200,.06)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(vx - 50 * k, vy - 30 * k); g.lineTo(vx + 50 * k, vy + 20 * k); g.lineTo(ex + 60 * k, ey + 10 * k); g.lineTo(ex - 70 * k, ey - 10 * k); g.closePath(); g.fill(); g.restore();
    vglow(g, ex, ey, 140 * k, '#ffe2b0', .35);
    // ravens on a broken spear-post, and one in the air
    for (let i = 0; i < 2; i++) { const x = w * (.56 + i * .32), y = h * .66; g.fillStyle = '#0a0404'; g.fillRect(x - 2 * k, y, 4 * k, 80 * k); vRaven(g, x, y - 1, .9 * k, t, { perch: 1, face: i ? -1 : 1, rim: '#ff8a4a' }); }
    vRaven(g, w * .2 + Math.sin(t * .4) * 60 * k, h * .3 + Math.cos(t * .5) * 20 * k, .9 * k, t, { face: 1, rim: '#ff8a4a' });
    // the Valkyrie: ash horse, swan wings, a spear made of light
    vglow(g, vx, vy, 230 * k, '#fff2d0', .55); vglow(g, vx, vy, 90 * k, '#ffffff', .35);
    vRider(g, vx, vy, k * .62, t, { face: -1, fly: 1, speed: 3, lx: -.2, ly: -1, wrim: 'rgba(255,240,200,.8)' });
    // the fallen man, hand raised to her
    vHuman(g, ex, ey, .5 * k, VPOSE.lie, { cloak: '#4a120e', dark: '#0a0404', rim: '#ffe2b0', rwPx: 1.6, boot: [0, -4, -PI / 2], lx: .3, ly: -1, wind: .2 });
    vember(g, w, h, 26, 21, t, '#ff7a2a', 40, 4 * k);
  },
  straw(g, t, w, h, k) { G.vigFlag = G.vigFlag || (t > 4 ? (G.vigFlagT = t, 1) : 0); VIGS.deathbed(g, t, w, h, k); },
  choosing(g, t, w, h, k) { // the Valkyrie on her knees before the Eye
    drawBackdrop(g, 'choosing', w, h, '#140a14', '#8a3a2a', '#ffd0a0', .78, .005, .5, .2) || vsky(g, w, h, ['#140a14', '#3a1a2a', '#8a3a2a', '#2a1410']);
    const ex = w * .5, ey = h * .24, open = .35 + .65 * Math.abs(Math.sin(t * .22));
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + t * .02, r = (150 + hash2(i, 5) * 90) * k, R2 = (90 + hash2(i, 6) * 70) * k; g.globalAlpha = .7; g.drawImage(puffSpr('#24101a', i % 4), ex + Math.cos(a) * r * 1.6 - R2, ey + Math.sin(a) * r * .5 - R2, R2 * 2, R2 * 2); }
    g.globalAlpha = 1;
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU - t * .03, r = 110 * k, R2 = 60 * k; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .18; g.drawImage(puffSpr('#ff9a5a', i % 4), ex + Math.cos(a) * r * 1.7 - R2, ey + Math.sin(a) * r * .45 - R2, R2 * 2, R2 * 2); g.restore(); }
    // the Eye
    const EW = 190 * k, EH = 46 * k * open;
    g.save(); g.beginPath(); g.moveTo(ex - EW, ey); g.quadraticCurveTo(ex, ey - EH * 2, ex + EW, ey); g.quadraticCurveTo(ex, ey + EH * 2, ex - EW, ey); g.closePath();
    g.fillStyle = '#e8d8b8'; g.fill(); g.clip();
    const ir = g.createRadialGradient(ex, ey, 0, ex, ey, 48 * k); ir.addColorStop(0, '#fff2b0'); ir.addColorStop(.35, '#e8a030'); ir.addColorStop(.8, '#8a4010'); ir.addColorStop(1, '#3a1a08');
    g.fillStyle = ir; g.beginPath(); g.arc(ex, ey, 48 * k, 0, TAU); g.fill();
    g.fillStyle = '#100604'; g.beginPath(); g.ellipse(ex, ey, 9 * k, 24 * k, 0, 0, TAU); g.fill();
    const lid = g.createLinearGradient(0, ey - EH, 0, ey + EH); lid.addColorStop(0, 'rgba(50,14,10,.75)'); lid.addColorStop(.45, 'rgba(50,14,10,0)'); lid.addColorStop(1, 'rgba(50,14,10,.3)');
    g.fillStyle = lid; g.fillRect(ex - EW, ey - EH * 2, EW * 2, EH * 4);
    g.strokeStyle = 'rgba(120,40,30,.35)'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { const sd = i % 2 ? 1 : -1, y0 = ey + (hash2(i, 3) - .5) * EH; g.beginPath(); g.moveTo(ex + sd * EW * .95, y0); g.quadraticCurveTo(ex + sd * EW * .7, y0 + (hash2(i, 4) - .5) * 14 * k, ex + sd * 56 * k, ey + (hash2(i, 5) - .5) * 20 * k); g.stroke(); }
    g.restore();
    g.strokeStyle = '#1a0806'; g.lineWidth = 4 * k; g.beginPath(); g.moveTo(ex - EW, ey); g.quadraticCurveTo(ex, ey - EH * 2, ex + EW, ey); g.quadraticCurveTo(ex, ey + EH * 2, ex - EW, ey); g.closePath(); g.stroke();
    vglow(g, ex, ey, 220 * k, '#ffb070', .35 * open);
    // its light falls on her
    const kx = w * .36, ky = h * .82;
    g.save(); g.globalCompositeOperation = 'lighter'; const rg = g.createLinearGradient(ex, ey, kx, ky); rg.addColorStop(0, `rgba(255,190,120,${.22 * open})`); rg.addColorStop(1, 'rgba(255,190,120,.03)');
    g.fillStyle = rg; g.beginPath(); g.moveTo(ex - 30 * k, ey); g.lineTo(ex + 30 * k, ey); g.lineTo(kx + 80 * k, ky); g.lineTo(kx - 80 * k, ky); g.fill(); g.restore();
    // a crag, high above the world
    const CR = new Path2D(); vcr(CR, [[w * .12, h], [w * .2, h * .86], [w * .28, h * .83], [kx, h * .82], [w * .46, h * .84], [w * .52, h * .9], [w * .56, h]]);
    vsil(g, CR, '#0c0608', '#c8784a', 1.8, .5, -.86);
    vfog(g, w, h, '#2a1018', .4, 10, h * .97, 1.2);
    // Hildr, on her knees, wings low
    const s = .95 * k, miss = 0, wb = (gg, J, u, p) => { const b = J.shL; vWing(gg, b[0] + 2, b[1] + 4, .55, -.25, { side: 1, spread: .55, col: '#e8e2d8', shade: '#857a70', rim: 'rgba(255,200,140,.7)', missing: miss }); vWing(gg, b[0] - 2, b[1] + 4, .6, .35, { side: -1, spread: .5, col: '#f0ebe2', shade: '#8a8076', rim: 'rgba(255,200,140,.8)', missing: miss }); };
    vHuman(g, kx, ky, s, VPOSE.vkneel, { kind: 'valk', dress: 'kneel', cloak: 0, dark: '#140a0c', rim: '#ffc890', hair: '#2a1a12', metal: '#1a1214', rwPx: 1.8, lx: .45, ly: -.9, before: wb, wind: .4 });
    // her spear, laid down before her
    g.strokeStyle = '#1a0e0c'; g.lineWidth = 2.4 * k; g.beginPath(); g.moveTo(kx + 40 * k, ky - 2 * k); g.lineTo(kx + 150 * k, ky + 3 * k); g.stroke(); vglow(g, kx + 150 * k, ky + 3 * k, 24 * k, '#ffe2b0', .6);
    // a feather, coming loose
    for (let i = 0; i < 3; i++) { const ft = ((t * .12 + i / 3) % 1), fx = kx - 30 * k + Math.sin(ft * 9 + i) * 30 * k - ft * 120 * k, fy = ky - 70 * k + ft * 200 * k; const P = new Path2D(); vleaf(P, 0, 0, -PI / 2 + Math.sin(ft * 9 + i) * .6, 16, 5); g.save(); g.translate(fx, fy); g.scale(k, k); g.globalAlpha = Math.min(1, (1 - ft) * 3) * Math.min(1, ft * 8); g.fillStyle = '#f2ece2'; g.fill(P); g.restore(); }
    g.globalAlpha = 1;
    vember(g, w, h, 14, 51, t, '#ffb070', 18, 3 * k);
  },
  valhalla(g, t, w, h, k) { // the doors
    drawBackdrop(g, 'valhalla', w, h, '#1a1208', '#b08a44', '#fff0c0', .72, .005, .5, .55) || vsky(g, w, h, ['#1a1208', '#4a3418', '#a07a3a', '#2a1c0c']);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 11; i++) { const a = -PI / 2 + (i - 5) * .15 + Math.sin(t * .2 + i) * .02; g.fillStyle = 'rgba(255,220,150,.05)'; g.beginPath(); g.moveTo(w / 2, h * .62); g.lineTo(w / 2 + Math.cos(a - .045) * h * 1.4, h * .62 + Math.sin(a - .045) * h * 1.4); g.lineTo(w / 2 + Math.cos(a + .045) * h * 1.4, h * .62 + Math.sin(a + .045) * h * 1.4); g.fill(); }
    g.restore();
    const dw = 250 * k, dh = 360 * k, cx = w / 2, base = h * .84, dy = base - dh, open = G.vigFlag ? Math.min(1, (t - G.vigFlagT) / 3) : 0;
    // the roof of shields, rafters of spears
    for (let i = 0; i < 13; i++) { const x = cx + (i - 6) * 56 * k; g.strokeStyle = '#1e1406'; g.lineWidth = 4 * k; g.beginPath(); g.moveTo(x, dy - 30 * k); g.lineTo(x + (i - 6) * 10 * k, dy - 140 * k); g.stroke(); }
    for (let r = 3; r >= 0; r--) for (let i = 0; i < 12; i++) {
      const x = cx + (i - 5.5) * 54 * k + (r % 2) * 27 * k, y = dy - 34 * k - r * 26 * k, R = 29 * k, sh = g.createRadialGradient(x - R * .4, y - R * .5, R * .1, x, y, R);
      sh.addColorStop(0, '#f2c46a'); sh.addColorStop(.6, '#b07a2a'); sh.addColorStop(1, '#5a3a12'); g.fillStyle = sh; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
      g.strokeStyle = '#2a1a08'; g.lineWidth = 2.4 * k; g.stroke(); g.strokeStyle = 'rgba(60,36,10,.4)'; g.lineWidth = 1; for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(x + j * R * .36, y - Math.sqrt(1 - (j * .36) ** 2) * R); g.lineTo(x + j * R * .36, y + Math.sqrt(1 - (j * .36) ** 2) * R); g.stroke(); }
      g.fillStyle = '#ffe8b0'; g.beginPath(); g.arc(x - 1 * k, y - 1 * k, 6.5 * k, 0, TAU); g.fill(); g.fillStyle = '#7a5418'; g.beginPath(); g.arc(x + 1 * k, y + 1.5 * k, 5 * k, 0, PI); g.fill();
    }
    // light within
    g.fillStyle = '#fff4d8'; g.fillRect(cx - open * dw / 2, dy, open * dw, dh);
    vglow(g, cx, dy + dh / 2, 320 * k * (.3 + open), '#ffe2a0', .45 + open * .55);
    // the leaves of the door
    for (const sd of [-1, 1]) {
      const ww = dw / 2 * (1 - open * .92), x0 = sd < 0 ? cx - dw / 2 : cx + dw / 2 - ww;
      const lg = g.createLinearGradient(x0, 0, x0 + ww, 0); lg.addColorStop(0, '#4a3014'); lg.addColorStop(.5, '#6a4620'); lg.addColorStop(1, '#3a2410'); g.fillStyle = lg; g.fillRect(x0, dy, ww, dh);
      g.strokeStyle = 'rgba(20,10,4,.6)'; g.lineWidth = 1.5; for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(x0 + ww * j / 5, dy); g.lineTo(x0 + ww * j / 5, base); g.stroke(); }
      for (const yy of [.16, .5, .84]) { g.fillStyle = '#9a6a24'; g.fillRect(x0, dy + dh * yy - 5 * k, ww, 10 * k); g.fillStyle = '#e8b860'; g.fillRect(x0, dy + dh * yy - 5 * k, ww, 2.5 * k); for (let j = 0; j < 5; j++) { g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(x0 + ww * (j + .5) / 5, dy + dh * yy, 2 * k, 0, TAU); g.fill(); } }
      if (ww > 20 * k) { const rx = sd < 0 ? x0 + ww - 22 * k : x0 + 22 * k; g.strokeStyle = '#e8b860'; g.lineWidth = 3 * k; g.beginPath(); g.arc(rx, dy + dh * .62, 11 * k, 0, TAU); g.stroke(); g.fillStyle = '#7a5018'; g.beginPath(); g.arc(rx, dy + dh * .62 - 11 * k, 5 * k, 0, TAU); g.fill(); }
    }
    // carved posts and lintel
    for (const sd of [-1, 1]) {
      const px = cx + sd * (dw / 2 + 16 * k), pw = 30 * k, pg = g.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0); pg.addColorStop(0, '#2a1a0a'); pg.addColorStop(.4, '#7a5224'); pg.addColorStop(1, '#22140a');
      g.fillStyle = pg; g.fillRect(px - pw / 2, dy - 24 * k, pw, dh + 24 * k);
      g.strokeStyle = 'rgba(255,214,140,.45)'; g.lineWidth = 1.6 * k; for (let j = 0; j < 7; j++) { const yy = dy + j * dh / 7 + 18 * k; g.beginPath(); g.arc(px, yy, 9 * k, j % 2 ? 0 : PI, (j % 2 ? 0 : PI) + PI * 1.5); g.stroke(); g.beginPath(); g.moveTo(px - 12 * k, yy + 14 * k); g.quadraticCurveTo(px, yy + 6 * k, px + 12 * k, yy + 20 * k); g.stroke(); }
    }
    const lgr = g.createLinearGradient(0, dy - 40 * k, 0, dy); lgr.addColorStop(0, '#6a4620'); lgr.addColorStop(1, '#2a1a0a'); g.fillStyle = lgr; g.fillRect(cx - dw / 2 - 40 * k, dy - 40 * k, dw + 80 * k, 26 * k);
    g.strokeStyle = 'rgba(255,214,140,.5)'; g.lineWidth = 1.6 * k; for (const ph of [0, PI]) { g.beginPath(); for (let x = -dw / 2 - 30 * k; x <= dw / 2 + 30 * k; x += 4) { const yy = dy - 27 * k + Math.sin(x / (9 * k) + ph) * 7 * k; x === -dw / 2 - 30 * k ? g.moveTo(cx + x, yy) : g.lineTo(cx + x, yy); } g.stroke(); }
    // the steps, the threshold
    for (let i = 0; i < 3; i++) { const sw = dw + (60 + i * 50) * k, y = base + i * 14 * k; g.fillStyle = mix('#3a2a14', '#120a04', i / 3); g.fillRect(cx - sw / 2, y, sw, 14 * k); g.fillStyle = `rgba(255,220,150,${.25 + open * .3 - i * .06})`; g.fillRect(cx - sw / 2, y, sw, 2 * k); }
    g.fillStyle = '#100a04'; g.fillRect(0, base + 42 * k, w, h);
    vHuman(g, cx - 140 * k, base + 42 * k, .62 * k, VPOSE.look, { cloak: '#5a140e', dark: '#140c06', rim: '#ffe2a0', axe: { dir: [.18, .98], len: 78 }, lx: 1, ly: -.4, rwPx: 2 });
    if (G.vigOdin) vOdin(g, cx + 240 * k, base + 46 * k, .82 * k, t, { dark: '#120a04', rim: '#ffd890', beard: '#a8a090' });
    vember(g, w, h, 30, 31, t, '#ffe2a0', 25, 5 * k);
  },
  endA(g, t, w, h, k) { // a seat near the fire
    vsky(g, w, h, ['#140c06', '#2a1a0c', '#1a1006']);
    const vx = w * .5, vy = h * .42, X = x => x * k, fy = z => vy + h * .58 / z, cy = z => vy - h * .62 / z;
    // the high seat at the end of the hall
    vglow(g, vx, vy - 10 * k, 220 * k, '#ffcf7a', .75);
    // the roof of shields, receding
    for (let r = 12; r >= 0; r--) { const z = 1 + r * .55, y = cy(z), R = 46 * k / z, n = Math.ceil(w * z / (90 * k)) + 2;
      for (let i = -n; i <= n; i++) { const x = vx + X(i * 86 + (r % 2) * 43) / z; if (x < -R || x > w + R) continue; const sh = g.createRadialGradient(x - R * .3, y - R * .4, 0, x, y, R); sh.addColorStop(0, mix('#d8a650', '#1a1006', r / 14)); sh.addColorStop(1, mix('#4a2c0e', '#0a0604', r / 14)); g.fillStyle = sh; g.beginPath(); g.ellipse(x, y, R, R * .55, 0, 0, TAU); g.fill(); g.fillStyle = mix('#ffe2a0', '#1a1006', r / 12); g.beginPath(); g.ellipse(x, y, R * .2, R * .11, 0, 0, TAU); g.fill(); } }
    // pillars of spear-shafts
    for (let r = 0; r < 6; r++) for (const sd of [-1, 1]) { const z = 1.2 + r * 1.1, x = vx + X(sd * 420) / z; g.fillStyle = '#140a04'; g.fillRect(x - 10 * k / z, cy(z), 20 * k / z, fy(z) - cy(z)); g.fillStyle = 'rgba(255,190,110,.18)'; g.fillRect(x - sd * 10 * k / z - (sd > 0 ? 3 * k / z : 0), cy(z), 3 * k / z, fy(z) - cy(z)); }
    // the floor
    g.fillStyle = '#1e1208'; g.beginPath(); g.moveTo(0, h); g.lineTo(vx - X(600) / 12, fy(12)); g.lineTo(vx + X(600) / 12, fy(12)); g.lineTo(w, h); g.fill();
    { const T = new Path2D(); // Hliðskjálf, and the one who sits in it
      vpoly(T, [[-26, 14], [-26, -40], [26, -40], [26, 14]]); vlimb(T, [[-30, 14], [-30, -58], [-24, -66], [-18, -62]], [6, 6, 4, 3]); vlimb(T, [[30, 14], [30, -58], [24, -66], [18, -62]], [6, 6, 4, 3]);
      vcr(T, [[-16, 12], [-18, -20], [-10, -34], [10, -34], [18, -20], [16, 12]]); vell(T, 0, -38, 20, 3.5); vcr(T, [[-7, -38], [-6, -48], [6, -48], [7, -38]]);
      const ts = .8 * k, tb = fy(7.5) - 14 * ts; g.save(); g.translate(vx, tb); g.scale(ts, ts); vsil(g, T, '#140a04', '#ffd890', 1.6 / ts, 0, -1); g.restore();
      vRaven(g, vx - 24 * ts, tb - 66 * ts, .45 * ts, G.vigT, { perch: 1, face: -1, col: '#140a04', rim: '#ffd890' }); vRaven(g, vx + 24 * ts, tb - 66 * ts, .45 * ts, G.vigT, { perch: 1, col: '#140a04', rim: '#ffd890' }); }
    // the long-fire down the middle
    for (let r = 14; r >= 0; r--) { const z = 1.4 + r * .5, x = vx, y = fy(z); vflame(g, x + Math.sin(r * 2.1) * X(20) / z, y, 1.2 * k / z * 1.6, t, r, 4); }
    vglow(g, vx, h * .8, 260 * k, '#ff9a3a', .45 + .08 * Math.sin(t * 7));
    // the benches of the einherjar, far to near
    for (let r = 7; r >= 0; r--) for (const sd of [-1, 1]) {
      const z = 1.25 + r * .7, x = vx + X(sd * 250) / z, y = fy(z), s = .78 * k / z, me = r === 0 && sd < 0;
      g.fillStyle = '#2a1a0c'; g.fillRect(Math.min(x, x - sd * X(110) / z), y - 46 * k / z, X(110) / z, 8 * k / z);
      vHuman(g, x, y, s, r % 3 === 1 ? VPOSE.horn : VPOSE.sit, { face: -sd, ph: r * 1.3 + sd, cloak: me ? '#6a1a12' : mix('#3a2410', '#1a1006', r / 8), dark: '#120a04', rim: '#ffb060', rwPx: me ? 2.2 : 1.4, lx: -sd, ly: -.3, horns: me ? 1 : 0, wind: .15 });
    }
    vember(g, w, h, 30, 71, t, '#ffb060', 35, 4 * k);
  },
  endB(g, t, w, h, k) { // the Never-Cold, and two who keep it
    drawBackdrop(g, 'endB', w, h, '#020308', '#16243e', '#80ffd0', .72, .004, .3, .18) || vsky(g, w, h, ['#03040a', '#0a1230', '#141a2a']); stars(g, w, h, 260, 9, 1);
    for (let j = 0; j < 3; j++) { g.beginPath(); for (let x = 0; x <= w; x += 20) { const y = h * (.18 + j * .05) + Math.sin(x * .005 + t * .3 + j) * 26 * k; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = `rgba(120,255,190,.09)`; g.lineWidth = 40 * k; g.stroke(); }
    // the roofless hall: wall-stubs and charred posts against the stars
    const RU = new Path2D(), gy = h * .78;
    vpoly(RU, [[0, gy], [0, h * .6], [w * .06, h * .58], [w * .1, h * .62], [w * .16, h * .6], [w * .2, gy]]);
    vpoly(RU, [[w * .74, gy], [w * .76, h * .62], [w * .82, h * .6], [w * .86, h * .56], [w * .92, h * .6], [w, h * .58], [w, gy]]);
    for (const [px, ph] of [[.12, .36], [.3, .5], [.7, .44], [.88, .3]]) vpoly(RU, [[w * px - 7 * k, gy], [w * px - 6 * k, h * ph + 6 * k], [w * px, h * ph], [w * px + 6 * k, h * ph + 10 * k], [w * px + 7 * k, gy]]);
    vsil(g, RU, '#06070c', '#4a6a8a', 1.4, .2, -1);
    g.fillStyle = '#07080c'; g.fillRect(0, gy, w, h - gy);
    // the hearth
    const fx = w * .42, fyy = h * .84;
    for (let i = 0; i < 9; i++) { const a = PI + i / 8 * PI; g.fillStyle = '#1a1612'; g.beginPath(); g.ellipse(fx + Math.cos(a) * 58 * k, fyy + 8 * k + Math.sin(a) * -10 * k, 11 * k, 7 * k, 0, 0, TAU); g.fill(); }
    vglow(g, fx, fyy - 20 * k, 300 * k, '#ff8a3a', .5 + .08 * Math.sin(t * 6));
    vflame(g, fx, fyy, 1.3 * k, t, 3, 7);
    for (let i = 0; i < 9; i++) { const a = i / 8 * PI; g.fillStyle = '#2a2018'; g.beginPath(); g.ellipse(fx + Math.cos(a) * 58 * k, fyy + 8 * k + Math.sin(a) * 10 * k, 12 * k, 8 * k, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,150,80,.35)'; g.beginPath(); g.ellipse(fx + Math.cos(a) * 58 * k - 2 * k, fyy + 4 * k + Math.sin(a) * 10 * k, 8 * k, 3 * k, 0, 0, TAU); g.fill(); }
    // the log they sit on
    const lgx = w * .63; g.fillStyle = '#1a120c'; g.beginPath(); g.ellipse(lgx, fyy - 6 * k, 70 * k, 12 * k, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,140,70,.3)'; g.beginPath(); g.ellipse(lgx - 4 * k, fyy - 12 * k, 66 * k, 4 * k, 0, 0, TAU); g.fill();
    const s = 1.02 * k;
    vHuman(g, lgx - 42 * k, fyy - 2 * k, s, VPOSE.sit, { face: -1, cloak: '#4a120e', dark: '#0c0806', rim: '#ffaa60', rwPx: 2.2, lx: -1, ly: -.35, helm: 0, wind: .2 });
    // Hildr, leaning on him, her ash wing around them both
    vHuman(g, lgx + 34 * k, fyy - 4 * k, s, VPOSE.vsit, { kind: 'valk', face: -1, cloak: 0, dress: 1, dark: '#0e0a0a', rim: '#ffaa60', hair: '#120c0a', metal: '#0e0a0a', rwPx: 2.2, lx: -1, ly: -.35, before: (gg, J) => vWing(gg, J.shL[0] - 2, J.shL[1] + 2, .5, -.2, { side: 1, spread: .4, col: '#8a847c', shade: '#3a3632', rim: 'rgba(255,170,100,.8)', missing: .25 }) });
    vember(g, w, h * .86, 18, 81, t, '#ffb060', 30, 3.5 * k);
    g.fillStyle = 'rgba(160,180,255,.05)'; g.fillRect(0, gy, w, h - gy);
  },
  endC(g, t, w, h, k) { // the ride
    drawBackdrop(g, 'endC', w, h, '#2a3a6a', '#e8a07a', '#fff2c8', .8, .004, .2, .7) || vsky(g, w, h, ['#2a3a6a', '#d08a6a', '#ffe2b0']);
    vglow(g, w * .18, h * .74, 340 * k, '#fff2c8', .8);
    for (let i = 0; i < 7; i++) { const cols = ['#ff4a3a', '#ff9a3a', '#ffe24a', '#6aff8a', '#4ab0ff', '#6a6aff', '#c86aff']; g.strokeStyle = hexA(cols[i], .1 + .04 * Math.sin(t * 1.5 + i)); g.lineWidth = 9 * k; g.beginPath(); g.arc(w * .55, h * 1.3, h * .95 - i * 9 * k, PI * 1.06, PI * 1.94); g.stroke(); }
    // a sea of cloud below
    for (let i = 0; i < 18; i++) { const x = ((hash2(i, 91) * w * 1.4 - t * 14 * k * (.6 + hash2(i, 92))) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * .2, y = h * (.74 + hash2(i, 93) * .2), R = (90 + hash2(i, 94) * 80) * k; g.globalAlpha = .9; g.drawImage(puffSpr(i % 3 ? '#f2d8c8' : '#c89a9a', i % 4), x - R, y - R * .6, R * 2, R * 1.2); }
    g.globalAlpha = 1;
    const fx = w * (.2 + ((t * .025) % 1) * .6), fy = h * .44 + Math.sin(t * 1.1) * 14 * k;
    vglow(g, fx, fy, 200 * k, '#ffffff', .3);
    vRider(g, fx, fy, k * .72, t, { face: 1, fly: 1, speed: 3.4, einar: 1, flapF: 2.6, flapA: .4, lx: -.6, ly: -.7, wrim: 'rgba(255,240,210,.9)', spear: 0 });
    for (let i = 0; i < 30; i++) { const ex = (hash2(i, 41) * w - t * 60 * k + w * 10) % w, ey = hash2(i, 42) * h * .7; g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(ex, ey, 7 * k, 1.4 * k, .1, 0, TAU); g.fill(); }
  },
};
