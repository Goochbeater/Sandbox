/* =====================================================================
   WYRM — Níðhöggr, after the second plate: a vast S of brown hide
   rising out of the black water, crest raked back, claw-teeth fanned.
   Body is built live along a spine; head and claw are painted cels.
   ===================================================================== */
const NB = { // spine in the cel's frame, relative to the hole (x to the left of the hole is negative)
  pts: [[0, 0], [60, -150], [200, -310], [290, -480], [250, -640], [140, -730], [20, -730], [-80, -700]],
  w: [310, 340, 400, 340, 280, 210, 150, 110],
};
function rigWyrm() {
  if (RIGS.wyrm) return RIGS.wyrm;
  const hide = '#6e5444', hideL = '#8a6e5c', ink = '#1e140e', bone = '#9c8270';
  const E = { shade: [.8, .78, .82], lo: .76, edgeA: .22, edgeW: 12, inkW: 2.8, ink };
  const R = {};
  // the head, snout to the left, pivoting where it meets the neck (in reference pixels, pivot at 1080,210)
  const H = pts => pts.map(p => [p[0] - 1080, p[1] - 210]);
  R.head = softPart([0, 0], [-300, -170, 120, 140], [
    ...Array.from({ length: 9 }, (_, i) => { const x0 = 1000 + i * 26, y0 = 196 - i * 10, L = 110 + hash2(i, 3) * 90 + i * 8, a = -.42 - hash2(i, 4) * .25;
      return { draw: g => Fc(g, H([[x0 - 10, y0 + 8], [x0 + 6, y0 - 8], [x0 + Math.cos(a) * L * .6 + 4, y0 + Math.sin(a) * L * .6 - 6], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L], [x0 + Math.cos(a) * L * .55 - 6, y0 + Math.sin(a) * L * .55 + 8]]), i % 2 ? hideL : hide), amp: .4, h: i * 2, innerInk: true, inkW: .8 }; }),
    { draw: g => Fc(g, H([[1150, 120], [1100, 150], [1040, 180], [990, 206], [952, 226], [920, 240], [900, 252], [930, 266], [970, 280], [1010, 276], [1060, 262], [1120, 250], [1170, 236], [1180, 180]]), hide), amp: .5, h: 20 },
    { draw: g => { Fc(g, H([[1000, 210], [1040, 196], [1080, 186], [1060, 210], [1020, 226]]), hideL); Fc(g, H([[960, 236], [990, 230], [1010, 244], [980, 256]]), '#4a3428'); }, amp: .4, h: 26, innerInk: true, inkW: .7 },
    ...[[[930, 256], [880, 270], [840, 286], [804, 316]], [[924, 262], [884, 282], [856, 300], [834, 334]], [[936, 266], [906, 290], [884, 314], [870, 346]], [[948, 268], [930, 296], [918, 322], [912, 348]], [[904, 250], [866, 252], [832, 262], [800, 278]], [[958, 270], [948, 296], [944, 320]]]
      .map((ps, i) => ({ draw: g => Fb(g, P => vlimb(P, H(ps), [14, 10, 6, 1.4].slice(0, ps.length)), bone), amp: .6, h: 30 + i, innerInk: true, inkW: .8 })),
  ], Object.assign({}, E, { over: g => sketch(g, [H([[1150, 150], [1080, 172], [1010, 204]]), H([[1100, 230], [1040, 244], [980, 262]]), H([[1060, 140], [1000, 176]]), H([[1120, 200], [1160, 196]])], 2.4, ink) }));
  // the clawed forelimb (pivot at the shoulder, in reference pixels 1080,440)
  const C = pts => pts.map(p => [p[0] - 1080, p[1] - 440]);
  R.claw = softPart([0, 0], [-250, -90, 60, 110], [
    { draw: g => Fc(g, C([[1090, 410], [1040, 430], [990, 462], [950, 480], [940, 500], [980, 504], [1030, 486], [1080, 470], [1100, 440]]), '#4a3226'), amp: .6 },
    ...[[[960, 478], [920, 452], [890, 430]], [[964, 484], [930, 470], [880, 462]], [[972, 490], [940, 494], [900, 506]], [[990, 470], [970, 430], [956, 400]], [[1000, 466], [1000, 430], [990, 396]]]
      .map((ps, i) => ({ draw: g => Fb(g, P => vlimb(P, C(ps), [14, 9, 1.6]), i % 2 ? '#5e4234' : '#3e2a20'), amp: .6, h: 10 + i, innerInk: true, inkW: .8 })),
  ], E);
  return RIGS.wyrm = R;
}
/* sample a smooth spine, return points and widths */
function spine(pts, ws, per = 10) {
  const out = [], wo = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([.5 * (2 * b[0] + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3), .5 * (2 * b[1] + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3)]);
      wo.push(lerp(ws[i], ws[i + 1], smooth(t))); }
  }
  out.push(pts[n - 1]); wo.push(ws[n - 1]);
  return [out, wo];
}
function drawWyrmBody(S, Wd, sgn, t) {
  const n = S.length, L = [], Rr = [], In = [], Mid = [];
  for (let i = 0; i < n; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)], an = Math.atan2(b[1] - a[1], b[0] - a[0]) + PI / 2, c = Math.cos(an), s = Math.sin(an), w = Wd[i] / 2;
    L.push([S[i][0] + c * w, S[i][1] + s * w]); Rr.push([S[i][0] - c * w, S[i][1] - s * w]);
    In.push([S[i][0] - c * w * .45, S[i][1] - s * w * .45]); Mid.push([S[i][0] + c * w * .3, S[i][1] + s * w * .3]);
  }
  const poly = (A, B) => { ctx.beginPath(); ctx.moveTo(A[0][0], A[0][1]); for (const p of A) ctx.lineTo(p[0], p[1]); for (let i = B.length - 1; i >= 0; i--) ctx.lineTo(B[i][0], B[i][1]); ctx.closePath(); };
  // fins along the outer back, behind the body
  ctx.fillStyle = FL('#3a2820'); ctx.strokeStyle = '#1e140e'; ctx.lineWidth = 4;
  for (const f of [.12, .2, .28]) { const i = f * n | 0, p = L[i], q = L[i + 3], an = Math.atan2(q[1] - p[1], q[0] - p[0]) + PI / 2 - .5 * sgn; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(an) * 90 * (1 - f), p[1] + Math.sin(an) * 90 * (1 - f) + 40); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  const ys = S.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  poly(L, Rr); const gr = ctx.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, FL('#1c120c')); gr.addColorStop(.45, FL('#4a3428')); gr.addColorStop(1, FL('#6e5646')); ctx.fillStyle = gr; ctx.fill();
  ctx.save(); poly(L, Rr); ctx.clip();
  // the shadowed outer flank, and the lit inner curve with its pale belly
  poly(L, Mid); ctx.fillStyle = 'rgba(14,8,6,.35)'; ctx.fill();
  const lo = n * .42 | 0;
  poly(Rr.slice(lo), In.slice(lo)); const bg = ctx.createLinearGradient(0, y1, 0, y0); bg.addColorStop(0, 'rgba(150,110,96,0)'); bg.addColorStop(.5, FL('rgba(150,110,96,.55)')); bg.addColorStop(1, FL('rgba(170,128,110,.75)')); ctx.fillStyle = bg; ctx.fill();
  // stripes of darker hide across the back
  ctx.fillStyle = 'rgba(20,12,8,.5)';
  for (let k = 0; k < 9; k++) { const i = ((k + .5) / 9 * n * .85) | 0, p = L[i], q = Mid[Math.min(n - 1, i + 2)], r = In[Math.min(n - 1, i + 1)]; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(q[0], q[1], r[0] * .4 + q[0] * .6, r[1] * .4 + q[1] * .6 + 10); ctx.lineTo(q[0] + 18, q[1] + 6); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = 'rgba(20,12,8,.55)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (let k = 0; k < 7; k++) { const i = ((k + .3) / 7 * n * .9) | 0, a = In[i], b = Rr[Math.min(n - 1, i + 3)]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2 + 10, (a[1] + b[1]) / 2 + 12, b[0], b[1]); ctx.stroke(); }
  ctx.restore();
  poly(L, Rr); ctx.strokeStyle = '#1e140e'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
  return { L, R: Rr };
}
function drawNid(b) {
  const A = b.an, t = b.t, em = A.em.v, w = b.world, R = rigWyrm();
  for (const h of w.holes) { // black water torn open in the floe
    ctx.fillStyle = '#0c1420'; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * 1.9, h.r * 1.0, 0, 0, TAU); ctx.fill();
    const k = (t * .3 + h.x * .01) % 1; ctx.strokeStyle = `rgba(160,190,220,${.35 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * 1.7 * k, h.r * .9 * k, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 11; i++) { // broken slabs heaved up round the rim: a pale top, a darker face toward the water
      const a = i / 11 * TAU + hash2(i, h.x) * .3, rr = 1.75 + hash2(i, 5) * .25, sx = h.x + Math.cos(a) * h.r * rr, sy = h.y + Math.sin(a) * h.r * rr * .52, sz = 40 + hash2(i, 3) * 40, th = 10 + hash2(i, 6) * 10;
      const j = k2 => (hash2(i * 7 + k2, h.y) - .5) * sz * .5, top = [[sx - sz + j(1), sy + 4 + j(2) * .3], [sx - sz * .4 + j(3), sy - sz * .45 + j(4) * .3], [sx + sz * .5 + j(5), sy - sz * .4 + j(6) * .3], [sx + sz + j(7), sy + 6 + j(8) * .3], [sx + j(9), sy + sz * .3]];
      ctx.fillStyle = '#5a6c84'; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); ctx.lineTo(top[4][0], top[4][1]); ctx.lineTo(top[3][0], top[3][1]); ctx.lineTo(top[3][0], top[3][1] + th); ctx.lineTo(top[4][0], top[4][1] + th); ctx.lineTo(top[0][0], top[0][1] + th); ctx.closePath(); ctx.fill();
      const P2 = new Path2D(); vpoly(P2, top); ctx.fillStyle = Math.sin(a) < 0 ? '#93a5bd' : '#aebdd0'; ctx.fill(P2); ctx.strokeStyle = 'rgba(226,236,248,.85)'; ctx.lineWidth = 2.4; ctx.stroke(P2);
    }
  }
  if (b.tail) { // a whip of the tail, lashing out of another hole
    const tl = b.tail, sw = Math.sin(G.t * 10) * 50, pts = [], ws = [];
    for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([tl.x + u * (260 + sw * 2), tl.y - Math.sin(u * PI) * (240 * Math.max(.3, tl.up)) - u * 40]); ws.push(lerp(70, 6, u)); }
    const [S, Wd] = spine(pts, ws, 6); drawWyrmBody(S, Wd, 1, t);
  }
  if (em < .02) return;
  const h = b.hole, bite = A.bite.v, ba = b.biteA || -PI / 2, sgn = P && P.x > h.x ? -1 : 1, sway = Math.sin(t * 1.1) * 26;
  // the spine rises out of the water; the head end lunges when it bites
  const pts = NB.pts.map((p0, i) => { const p = [p0[0], p0[1]]; const u = i / (NB.pts.length - 1), lift = Math.min(1, em * 1.25 - u * .25 + .25);
    let x = h.x + p[0] * sgn + sway * u, y = h.y + p[1] * Math.max(0, lift);
    if (bite > 0 && u > .5) { const k = (u - .5) / .5 * bite; x += Math.cos(ba) * 320 * k; y += (Math.sin(ba) * 320 + 420) * k; }
    return [x, y]; });
  const [S, Wd] = spine(pts, NB.w, 10);
  ctx.save();
  ctx.beginPath(); ctx.rect(h.x - 3000, h.y - 3000, 6000, 3000); ctx.ellipse(h.x, h.y, h.r * 1.75, h.r * .9, 0, 0, PI); ctx.clip();
  drawWyrmBody(S, Wd, sgn, t);
  // the claw reaches from the inner curve of the neck
  ctx.save(); ctx.translate(h.x + 70 * sgn + sway * .6, h.y - 450 * Math.min(1, em * 1.1)); ctx.scale(sgn * 1.25, 1.25); ctx.rotate(A.claw.v * .4 + Math.sin(t * 2) * .05); ctx.drawImage(R.claw.c, R.claw.ox, R.claw.oy, R.claw.wu, R.claw.hu); ctx.restore();
  // the head: pivots at the end of the neck, snout toward the hero
  const hp = S[S.length - 1], mo = A.mouth.v, ha = bite > .2 ? Math.atan2(Math.sin(ba), Math.cos(ba) * -sgn) * .6 : Math.sin(t * .9) * .08;
  ctx.save(); ctx.translate(hp[0] + 40 * sgn, hp[1] + 10); ctx.scale(sgn * 1.5, 1.5); ctx.rotate(-ha + mo * .1);
  ctx.drawImage(R.head.c, R.head.ox, R.head.oy, R.head.wu, R.head.hu);
  if (G.boss && G.boss.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5; ctx.drawImage(R.head.c, R.head.ox, R.head.oy, R.head.wu, R.head.hu); }
  ctx.restore();
  const ex = hp[0] + 40 * sgn - (1080 - 978) * 1.5 * sgn, ey = hp[1] + 10 + (248 - 210) * 1.5;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, TAU); ctx.fill();
  ctx.restore();
  glowPost(ex, ey, 40, '#ffffff', .95); glowPost(ex, ey, 120, '#cfe8ff', .3);
  G.lights.push({ x: ex, y: ey, r: 380, i: .6, col: '#cfe8ff' }, { x: h.x, y: h.y, r: 260, i: .5, col: '#8fc0e0' });
  if (Math.random() < .35) part({ x: h.x + rand(-140, 140), y: h.y + rand(-10, 10), vy: -rand(40, 120), vx: rand(-40, 40), life: .6, type: 'dot', color: '#cfe6f2', size: 2.4, g: 300, z: 0, vz: rand(60, 180) });
}
