/* =====================================================================
   WOOD — the Iron Wood after the plate: vast bare trees seen from above,
   a trunk rising and a crown of limbs and twigs flung out over the
   ground in every direction; some bleed lava up the bark.
   Also: cattails, crates, and a cheap strip-warp for swaying sprites.
   ===================================================================== */
/* grow a tree: returns segments [x0,y0,x1,y1,w0,w1,depth,lava] */
function growTree(R, o) {
  const segs = [], H = o.h, W0 = o.w, crown = o.crown, sq = .78;
  // trunk: a sinuous column with a twist of lean
  const tp = [[0, 0]]; let x = 0;
  for (let i = 1; i <= 6; i++) { x += (R() - .5) * W0 * .55 + o.lean * H / 6; tp.push([x, -H * i / 6]); }
  for (let i = 0; i < 6; i++) segs.push([tp[i][0], tp[i][1], tp[i + 1][0], tp[i + 1][1], W0 * (1 - i / 6 * .55), W0 * (1 - (i + 1) / 6 * .55), 0, o.lava && i < 5]);
  const branch = (x0, y0, a, L, w, d, lava) => {
    let px = x0, py = y0, ca = a; const n = d < 2 ? 4 : 3;
    for (let k = 0; k < n; k++) {
      ca += (R() - .5) * (d < 2 ? .35 : .6);
      const l = L / n, nx = px + Math.cos(ca) * l, ny = py + Math.sin(ca) * l * sq, w1 = w * (1 - (k + 1) / n * .45);
      segs.push([px, py, nx, ny, w * (1 - k / n * .45), w1, d, lava && k < n - 1]);
      // side shoots along the way
      if (d < o.depth && k < n - 1 && R() < (d < 2 ? .7 : .5)) branch(nx, ny, ca + (R() < .5 ? 1 : -1) * (.5 + R() * .6), L * (.42 + R() * .2), w1 * .62, d + 1, false);
      px = nx; py = ny;
    }
    if (d >= o.depth || w < .7) return;
    const kids = d < 2 ? 2 + (R() < .5) : 2 + (R() < .3);
    for (let i = 0; i < kids; i++) branch(px, py, ca + (i - (kids - 1) / 2) * (.42 + R() * .35) + (R() - .5) * .25, L * (.62 + R() * .16), w * .55 * (1 - (i === 0 ? 0 : .12)), d + 1, lava && i === 0 && d < 2);
  };
  // the limbs: flung out from the upper trunk in every direction, the crown seen from above
  const nl = o.limbs;
  for (let i = 0; i < nl; i++) {
    const f = .5 + .5 * (i / nl) * (R() * .4 + .8), p = tp[Math.min(6, Math.round(f * 6))];
    const a = -PI / 2 + (i / nl - .5) * TAU * .95 + (R() - .5) * .4;
    branch(p[0], p[1], a, crown * (.55 + R() * .35), W0 * (.42 + R() * .12), 1, o.lava && i === 1);
  }
  // roots splaying into the mud
  for (let i = 0; i < o.roots; i++) { const a = PI * (.05 + i / (o.roots - 1) * .9) + (R() - .5) * .2, L = W0 * (1.1 + R() * 1.1); let px = Math.cos(a) * W0 * .2, py = 0; const ex = Math.cos(a) * L, ey = Math.sin(a) * L * .32 + 4; segs.push([px, py, (px + ex) / 2 + (R() - .5) * 8, (py + ey) / 2, W0 * .5, W0 * .22, -1, false], [(px + ex) / 2, (py + ey) / 2, ex, ey, W0 * .22, 2, -1, false]); }
  return segs;
}
function pIronTree(seed, kind = 'iron') {
  const R = mulberry(seed), char = kind === 'char';
  const o = char ? { h: 170 + R() * 80, w: 26 + R() * 8, crown: 120 + R() * 50, depth: 5, limbs: 6, roots: 5, lean: (R() - .5) * .3, lava: R() < .5 }
    : { h: 300 + R() * 200, w: 46 + R() * 22, crown: 260 + R() * 120, depth: 7, limbs: 7 + (R() * 3 | 0), roots: 7, lean: (R() - .5) * .25, lava: R() < .34 };
  const segs = growTree(R, o);
  let x0 = -40, y0 = -40, x1 = 40, y1 = 30; for (const s of segs) { x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]); y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]); }
  x0 -= 20; y0 -= 20; x1 += 20; y1 += 20;
  const S = char ? .9 : .62, W = Math.ceil((x1 - x0) * S), Hh = Math.ceil((y1 - y0) * S);
  const c = mkCanvas(W, Hh), g = c.getContext('2d'); g.setTransform(S, 0, 0, S, -x0 * S, -y0 * S); g.lineCap = 'round'; g.lineJoin = 'round';
  // a soft ground shadow pooled under the crown
  { const gr = g.createRadialGradient(0, 0, 0, 0, 0, o.crown * .9); gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.translate(20, -o.h * .35); g.scale(1, .55); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, o.crown * .9, 0, TAU); g.fill(); g.restore(); }
  const base = char ? ['#100a08', '#1c1210'] : ['#17110e', '#211915'], rim = char ? '#5a2a18' : '#4d4038', LX = -.62, LY = -.78;
  const quad = (s, w0, w1, col) => { const dx = s[2] - s[0], dy = s[3] - s[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; g.fillStyle = col; g.beginPath(); g.moveTo(s[0] + nx * w0 / 2, s[1] + ny * w0 / 2); g.lineTo(s[2] + nx * w1 / 2, s[3] + ny * w1 / 2); g.lineTo(s[2] - nx * w1 / 2, s[3] - ny * w1 / 2); g.lineTo(s[0] - nx * w0 / 2, s[1] - ny * w0 / 2); g.closePath(); g.fill(); if (w1 > 1.2) { g.beginPath(); g.arc(s[2], s[3], w1 / 2, 0, TAU); g.fill(); } };
  const order = segs.slice().sort((a, b) => (b[6] === -1 ? 99 : b[6]) - (a[6] === -1 ? 99 : a[6]));
  // fine twigs first, back to front by depth; the trunk and limbs last
  for (const s of order) {
    const d = s[6], w0 = Math.max(.6, s[4]), w1 = Math.max(.5, s[5]);
    g.globalAlpha = d >= 5 ? .82 : 1;
    quad(s, w0, w1, d >= 4 ? base[0] : base[1]);
    if (w0 > 3.5) { // a lit edge toward the key light, a dark core on the far side
      const dx = s[2] - s[0], dy = s[3] - s[1], l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; }
      g.globalAlpha = .75; g.strokeStyle = rim; g.lineWidth = Math.max(.8, w0 * .16); g.beginPath(); g.moveTo(s[0] + nx * w0 * .32, s[1] + ny * w0 * .32); g.lineTo(s[2] + nx * w1 * .32, s[3] + ny * w1 * .32); g.stroke();
      g.globalAlpha = .5; g.strokeStyle = '#0a0706'; g.lineWidth = Math.max(.8, w0 * .22); g.beginPath(); g.moveTo(s[0] - nx * w0 * .28, s[1] - ny * w0 * .28); g.lineTo(s[2] - nx * w1 * .28, s[3] - ny * w1 * .28); g.stroke();
    }
  }
  g.globalAlpha = 1;
  // bark: long grooves running up the trunk
  g.strokeStyle = 'rgba(80,66,56,.45)'; g.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) { const f = (i + .5) / 9 - .5; g.beginPath(); for (let k = 0; k <= 5; k++) { const s = segs[k] || segs[5], w = s[4], x = s[0] + f * w * .8 + Math.sin(k * 1.7 + i) * 2, y = s[1]; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  // lava welling up through the bark of some trees: an emissive overlay
  let e = null;
  if (o.lava) {
    e = mkCanvas(W, Hh); const eg = e.getContext('2d'); eg.setTransform(S, 0, 0, S, -x0 * S, -y0 * S); eg.lineCap = 'round'; eg.lineJoin = 'round';
    const veins = segs.filter(s => s[7]);
    // sinuous, broken streams welling through the bark
    const paths = [];
    for (const s of veins) { if (hash2(s[0] | 0, s[3] | 0) < .25) continue; const pts = []; for (let k = 0; k <= 5; k++) { const u = k / 5, x = lerp(s[0], s[2], u), y = lerp(s[1], s[3], u), dx = s[2] - s[0], dy = s[3] - s[1], l = Math.hypot(dx, dy) || 1, j = Math.sin(u * 5.3 + s[0]) * Math.min(5, lerp(s[4], s[5], u) * .12); pts.push([x - dy / l * j, y + dx / l * j]); } paths.push([pts, 1]); }
    for (const pass of [[9, 'rgba(255,80,16,.16)'], [3.6, 'rgba(255,130,30,.6)'], [1.5, 'rgba(255,226,140,1)']]) {
      eg.strokeStyle = pass[1];
      for (const [pts, w] of paths) { eg.lineWidth = w * pass[0]; eg.beginPath(); pts.forEach((p, k) => k ? eg.lineTo(p[0], p[1]) : eg.moveTo(p[0], p[1])); eg.stroke(); }
    }
  }
  const spr = { c, ox: x0, oy: y0, wu: x1 - x0, hu: y1 - y0, s: S, e, tree: 1, warp: 1, cy: -o.h * .8, canopy: o.crown * .8, top: y0, trunkR: o.w * .5, glowy: !!o.lava && !char };
  return spr;
}
function pCattails(seed) {
  const R = mulberry(seed), n = 7 + (R() * 6 | 0);
  return paintSprite({ box: [-60, -170, 60, 14], s: 1.6, soft: 1, lo: .78, shade: [.8, .78, .8], ink: '#1a1410', inkW: 1.2, under: groundShadow(46, 10, 2, 4, .4), layers: [
    { draw: g => Fp(g, P => { for (let i = 0; i < n; i++) { const x = (R() - .5) * 40, a = -PI / 2 + (R() - .5) * 1.1, L = 70 + R() * 90; vleaf(P, x, 4, a, L, 7 + R() * 4, (R() - .5) * 30); } }, '#a8946c'), amp: .4, innerInk: true, inkW: .6 },
    { draw: g => { for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 12 + (R() - .5) * 8, top = -110 - R() * 50, lean = (R() - .5) * 20; g.strokeStyle = '#6e5e40'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, 4); g.quadraticCurveTo(x + lean * .3, top * .5, x + lean, top); g.stroke(); Fp(g, P => vcr(P, [[x + lean - 4, top + 6], [x + lean - 4.6, top + 30], [x + lean, top + 34], [x + lean + 4.6, top + 30], [x + lean + 4, top + 6], [x + lean, top + 2]]), '#6a3e22'); } }, r: 3, h: 8, amp: .7 },
  ] });
}
function pCrate(seed) {
  return paintSprite({ box: [-30, -50, 30, 14], s: 2, soft: 1, lo: .76, ink: '#140e0a', inkW: 1.4, under: groundShadow(30, 8, 3, 4, .45), layers: [
    { draw: g => { Fp(g, P => vpoly(P, [[-24, 6], [-24, -28], [4, -34], [26, -24], [26, 4], [0, 12]]), '#5a4430'); g.strokeStyle = '#2a1e14'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 12); g.lineTo(0, -22); g.moveTo(-24, -28); g.lineTo(0, -22); g.lineTo(26, -24); for (const y of [-14, -2]) { g.moveTo(-24, y); g.lineTo(0, y + 6); g.lineTo(26, y - 2); } g.moveTo(-22, 4); g.lineTo(-2, -20); g.stroke(); }, r: 2, amp: .3, flat: true },
  ] });
}
/* draw a sprite bent by wind: horizontal strips slid sideways, more toward the top */
function drawSprWarp(s, x, y, a, sway, src = s.c, add = false, g = ctx) {
  if (a < 1) g.globalAlpha = a;
  const n = 18, sh = src.height / n, dh = s.hu / n, baseY = -s.oy; // anchor row in units from the sprite top
  for (let i = 0; i < n; i++) {
    const yu = i * dh, h = Math.max(0, (baseY - yu) / baseY), off = sway * h * h;
    g.drawImage(src, 0, i * sh, src.width, add ? sh : sh + 1, x + s.ox + off, y + s.oy + yu, s.wu, add ? dh : dh + s.hu / src.height);
  }
  if (a < 1) g.globalAlpha = 1;
}
/* a tree standing between the camera and the hero: drawn with a soft hole cut around him, so the fight stays readable */
const OCC = { c: null, g: null };
function drawTreeCut(o, a, sway) {
  const s = o.spr, cw = cv.width, ch = cv.height;
  if (!OCC.c || OCC.c.width !== cw || OCC.c.height !== ch) { OCC.c = mkCanvas(cw, ch); OCC.g = OCC.c.getContext('2d'); }
  const g = OCC.g, T = ctx.getTransform();
  const x0 = T.a * (o.x + s.ox - 40) + T.e, y0 = T.d * (o.y + s.oy) + T.f, x1 = T.a * (o.x + s.ox + s.wu + 40) + T.e, y1 = T.d * (o.y + s.oy + s.hu) + T.f;
  const bx = Math.max(0, x0 | 0), by = Math.max(0, y0 | 0), bw = Math.min(cw, Math.ceil(x1)) - bx, bh = Math.min(ch, Math.ceil(y1)) - by;
  if (bw <= 0 || bh <= 0) return;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(bx, by, bw, bh);
  g.setTransform(T); drawSprWarp(s, o.x, o.y, 1, sway, s.c, false, g);
  g.globalCompositeOperation = 'destination-out';
  const px = P.x, py = P.y - 30, R = 170, gr = g.createRadialGradient(px, py, R * .3, px, py, R);
  gr.addColorStop(0, 'rgba(0,0,0,.94)'); gr.addColorStop(.6, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(px, py, R, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(OCC.c, bx, by, bw, bh, bx, by, bw, bh); ctx.restore();
}
/* emissive overlays queued during the sort pass, drawn additively after the light map */
const EMISQ = [];
function flushEmis() {
  if (!EMISQ.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const q of EMISQ) { const s = q.s, f = .75 + .25 * Math.sin(G.t * 2.2 + q.x * .01) * Math.sin(G.t * 3.7 + q.y * .02); drawSprWarp(s, q.x, q.y, f * q.a, q.sway || 0, s.e, true); }
  ctx.restore(); EMISQ.length = 0;
}
