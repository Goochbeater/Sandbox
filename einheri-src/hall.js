/* =====================================================================
   THE HALL, PAINTED — posts, palisade, benches, hearth, forge, the high
   seat, the gate-stones; real fire; and the companions as painted folk.
   ===================================================================== */
/* fire: overlapping tongues, deep red at the root to white-gold in the heart, additive */
function drawFire(x, y, w, h, t, k = 1, seed = 0) {
  if (k <= .02) return;
  const n = Math.max(3, Math.round(w / 9));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let pass = 0; pass < 3; pass++) {
    const col = ['rgba(200,50,10,', 'rgba(255,140,40,', 'rgba(255,236,170,'][pass], sc = [1, .72, .42][pass];
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? .5 : i / (n - 1), fx = x + (u - .5) * w * (1 - pass * .18), ph = seed + i * 1.7 + pass;
      const hh = h * sc * k * (.6 + .4 * Math.sin(u * PI)) * (.75 + .25 * Math.sin(t * 9 + ph) + .15 * Math.sin(t * 15.3 + ph * 2));
      const sway = Math.sin(t * 6 + ph) * w * .06, ww = w / n * 1.7 * sc;
      const gr = ctx.createLinearGradient(fx, y, fx, y - hh); gr.addColorStop(0, col + (.8 - pass * .1) + ')'); gr.addColorStop(.6, col + (.45 - pass * .05) + ')'); gr.addColorStop(1, col + '0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(fx - ww / 2, y);
      ctx.bezierCurveTo(fx - ww * .6, y - hh * .45, fx + sway - ww * .15, y - hh * .7, fx + sway * 1.6, y - hh);
      ctx.bezierCurveTo(fx + sway + ww * .2, y - hh * .65, fx + ww * .6, y - hh * .4, fx + ww / 2, y); ctx.fill();
    }
  }
  ctx.restore();
}
const HALL = {};
function hallSprites() {
  if (HALL.ok) return HALL;
  const wood = '#5a3e28', woodD = '#3e2a1c', woodL = '#7a5636', o = { s: 2.6, inkW: 2, rim: '#ffcf8a', rimA: .45 };
  const P = (box, layers, extra) => paintSprite(Object.assign({}, o, { box, layers }, extra || {}));
  const knot = (g, x0, y0, x1, y1) => { g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; for (let y = y0; y < y1; y += 18) { g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + (x1 - x0) * .3, y + 12, x1 - (x1 - x0) * .3, y - 4, x1, y + 8); g.moveTo(x0, y + 8); g.bezierCurveTo(x0 + (x1 - x0) * .3, y - 4, x1 - (x1 - x0) * .3, y + 12, x1, y); g.stroke(); } };
  HALL.pillar = P([-16, -128, 16, 10], [
    { draw: g => { Fp(g, P => vcr(P, [[-11, 2], [-12, -60], [-11, -118], [11, -118], [12, -60], [11, 2]]), wood); }, amp: .9, bump: g => knot(g, -10, -110, 10, -10), bumpAmp: 2.2, grain: .3 },
    { draw: g => { Fp(g, P => { vcr(P, [[-14, -112], [14, -112], [15, -104], [-15, -104]]); vcr(P, [[-14, -10], [14, -10], [15, 2], [-15, 2]]); }, woodD); }, r: 3, h: 3 },
  ], { under: groundShadow(20, 7, 3, 3, .5) });
  HALL.wallN = P([0, -84, 120, 24], [
    { draw: g => { Fp(g, P => { for (let x = 0; x < 120; x += 12) vcr(P, [[x + .5, 22], [x + .5, -70], [x + 6, -76], [x + 11.5, -70], [x + 11.5, 22]]); }, woodD); }, amp: .8, r: 5, grain: .32, innerInk: true, inkW: .6,
      bump: g => { g.strokeStyle = '#4a4a4a'; g.lineWidth = 1.2; for (let x = 3; x < 120; x += 6) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x + Math.sin(x) * 1.5, -68); g.stroke(); } }, bumpAmp: 1.2 },
    { draw: g => Fp(g, P => vcr(P, [[-2, -60], [122, -60], [122, -50], [-2, -50]]), wood), r: 4, h: 6 },
    { draw: g => { Fp(g, P => vcirc(P, 60, -30, 17), '#b88a38'); g.fillStyle = '#7a2a1a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(60, -30); g.arc(60, -30, 15, i * PI / 2, i * PI / 2 + PI / 4); g.closePath(); g.fill(); } Fp(g, P => vcirc(P, 60, -30, 5), '#d8d0c0'); }, amp: .6, h: 10, spec: .4 },
  ]);
  HALL.wallS = P([0, -26, 120, 26], [
    { draw: g => Fp(g, P => { for (let x = 0; x < 120; x += 12) vcr(P, [[x + .5, 24], [x + .5, -16], [x + 6, -22], [x + 11.5, -16], [x + 11.5, 24]]); }, woodD), amp: .8, r: 5, grain: .32, innerInk: true, inkW: .6 },
  ]);
  HALL.wallSide = P([-14, -40, 14, 40], [
    { draw: g => Fp(g, P => { for (let y = -36; y < 40; y += 14) vcr(P, [[-12, y], [12, y], [13, y + 7], [12, y + 13], [-12, y + 13], [-13, y + 7]]); }, woodD), amp: .7, r: 5, grain: .3, innerInk: true, inkW: .6 },
  ]);
  HALL.bench = P([0, -22, 140, 24], [
    { draw: g => Fp(g, P => vcr(P, [[0, -12], [140, -12], [140, 22], [0, 22]]), woodD), r: 6, amp: .6, grain: .3 },
    { draw: g => { Fp(g, P => vcr(P, [[-1, -20], [141, -20], [141, -10], [-1, -10]]), wood); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; for (const x of [46, 93]) { g.beginPath(); g.moveTo(x, -20); g.lineTo(x, -10); g.stroke(); } }, r: 3, h: 4 },
    { draw: g => Fp(g, P => { vcr(P, [[18, -22], [56, -24], [62, -10], [58, 6], [20, 8], [14, -8]]); fringe(P, [[16, 2], [38, 8], [60, 2]], 9, 6, 4, PI / 2, .6, 3); }, '#8a7058'), amp: .6, h: 8, grain: .4 },
    { draw: g => { Fp(g, P => { vcr(P, [[96, -26], [104, -26], [103, -15], [97, -15]]); }, '#c9a548'); Fp(g, P => vlimb(P, [[112, -18], [122, -24], [128, -34]], [6, 4.4, 2.6]), '#e8dcc0'); }, r: 2, h: 10, spec: .6 },
  ], { under: groundShadow(76, 10, 70, 18, .45) });
  HALL.pit = P([-124, -18, 124, 18], [
    { draw: g => Fp(g, P => vcr(P, [[-118, -10], [118, -10], [122, 0], [118, 12], [-118, 12], [-122, 0]]), '#1a120c'), r: 4, amp: .3, ink: false },
    { draw: g => Fp(g, P => { for (let i = 0; i < 18; i++) { const x = -116 + i * 13.6; vcr(P, rockPts(x, -10, 7.6, 5.6, i + 3, 7, .18)); vcr(P, rockPts(x + 6, 14, 7.6, 5.6, i + 40, 7, .18)); } vcr(P, rockPts(-120, 2, 6, 8, 81)); vcr(P, rockPts(120, 2, 6, 8, 82)); }, '#5c5550'), amp: .9, h: 4, grain: .35, innerInk: true, inkW: .6 },
    { draw: g => Fp(g, P => { for (let i = 0; i < 6; i++) vlimb(P, [[-96 + i * 36, 6], [-70 + i * 36, -6]], [7, 6]); }, '#3a2618'), amp: .9, h: 3, inkW: .7 },
  ]);
  HALL.anvil = P([-28, -34, 28, 8], [
    { draw: g => Fp(g, P => vcr(P, [[-14, 4], [-12, -16], [12, -16], [14, 4]]), '#4a3a2a'), r: 4, amp: .8 },
    { draw: g => Fp(g, P => vcr(P, [[-26, -18], [-18, -20], [-14, -28], [22, -28], [22, -18], [8, -16], [-8, -16]]), '#4e5054'), r: 5, amp: .8, h: 6, spec: .9, shine: 18, gloss: .7 },
  ], { under: groundShadow(28, 8, 2, 3, .5) });
  HALL.forge = P([-36, -56, 36, 10], [
    { draw: g => Fp(g, P => { for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) vcr(P, rockPts(-24 + i * 16 + (r % 2) * 6, -4 - r * 11, 9, 7, r * 9 + i, 7, .2)); }, '#5a5450'), amp: .9, grain: .35, innerInk: true, inkW: .6 },
    { draw: g => Fp(g, P => vcr(P, [[-24, -44], [24, -44], [26, -38], [-26, -38]]), '#2a1e18'), r: 3, h: 8 },
  ], { under: groundShadow(38, 9, 2, 4, .5) });
  HALL.seat = P([-34, -104, 34, 10], [
    { draw: g => { Fp(g, P => vcr(P, [[-24, 2], [-24, -64], [24, -64], [24, 2]]), woodD); }, r: 6, amp: .6, bump: g => knot(g, -20, -60, 20, -10), bumpAmp: 1.6 },
    { draw: g => { Fp(g, P => { for (const sd of [-1, 1]) { vcr(P, [[sd * 24 - 5, 4], [sd * 24 - 5, -86], [sd * 24 + 5, -86], [sd * 24 + 5, 4]]); vcr(P, [[sd * 24 - 7, -86], [sd * 24 - 6, -96], [sd * 24 + sd * 6, -102], [sd * 24 + sd * 10, -94], [sd * 24 + 6, -86]]); } }, wood); }, amp: .9, h: 6, bump: g => { knot(g, -28, -84, -20, 0); knot(g, 20, -84, 28, 0); }, bumpAmp: 1.8 },
    { draw: g => Fp(g, P => vcr(P, [[-22, -30], [22, -30], [24, -20], [22, -10], [-22, -10], [-24, -20]]), '#6a5240'), r: 4, h: 4, grain: .4 },
  ], { under: groundShadow(36, 9, 2, 4, .5) });
  const stone = '#5e5e66';
  HALL.gate = P([-22, -134, 22, 10], [
    { draw: g => Fp(g, P => vcr(P, [[-17, 2], [-19, -60], [-17, -122], [-4, -130], [16, -126], [18, -60], [17, 2]]), stone), amp: .6, grain: .35, vary: .25, hatch: .3,
      bump: g => { g.fillStyle = '#3a3a3a'; g.font = '14px serif'; g.textAlign = 'center'; const rr = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾ'; for (let i = 0; i < 6; i++) g.fillText(rr[i], 0, -110 + i * 18); }, bumpAmp: 2.4 },
    { draw: g => { g.fillStyle = '#7a8a4a'; g.globalAlpha = .7; for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse((hash2(i, 1) - .5) * 26, -hash2(i, 2) * 50, 3 + hash2(i, 3) * 5, 2 + hash2(i, 4) * 2, 0, 0, TAU); g.fill(); } }, r: 2, h: 1, ink: false, grain: .5 },
  ], { under: groundShadow(26, 8, 3, 3, .5) });
  HALL.lintel = P([-80, -14, 80, 14], [
    { draw: g => Fp(g, P => vcr(P, [[-76, -8], [-40, -12], [40, -12], [76, -8], [78, 8], [0, 12], [-78, 8]]), '#56565e'), amp: .7, grain: .35, hatch: .3 },
  ]);
  HALL.ok = 1; return HALL;
}
function tileSpr(spr, x0, x1, y, step) { for (let x = x0; x < x1 - 1; x += step) { const w = Math.min(step, x1 - x); ctx.drawImage(spr.c, 0, 0, spr.c.width * (w + 6) / spr.wu, spr.c.height, x + spr.ox, y + spr.oy, w + 6, spr.hu); } }
function drawHubObst(o) {
  const H_ = hallSprites();
  if (o.kind === 'wallN') tileSpr(H_.wallN, o.x0, o.x1, o.y0, 120);
  else if (o.kind === 'wallS') tileSpr(H_.wallS, o.x0, o.x1, o.y0, 120);
  else if (o.kind === 'wallW' || o.kind === 'wallE') { for (let y = o.y0; y < o.y1; y += 80) drawSpr(H_.wallSide, (o.x0 + o.x1) / 2, y + 40); }
  else if (o.kind === 'pillar') drawSpr(H_.pillar, o.x, o.y);
  else if (o.kind === 'bench') tileSpr(H_.bench, o.x0, o.x1, o.y0, 140);
  else if (o.kind === 'hearth') drawLongfire(o);
  else if (o.kind === 'anvil') drawSpr(H_.anvil, o.x, o.y);
  else if (o.kind === 'forge') {
    drawSpr(H_.forge, o.x, o.y);
    const f = .7 + .3 * Math.sin(G.t * 8) * Math.sin(G.t * 3);
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.ellipse(o.x, o.y - 41, 20, 4, 0, 0, TAU); ctx.fill();
    drawFire(o.x, o.y - 40, 34, 22, G.t, f, 7);
    glow(o.x, o.y - 44, 70, '#ff7a1a', .6 * f); G.lights.push({ x: o.x, y: o.y - 20, r: 300, i: .9 * f, col: '#ff8a3a' });
    if (Math.random() < .15) part({ x: o.x + rand(-10, 10), y: o.y - 46, vy: -rand(30, 80), vx: rand(-10, 10), life: rand(.6, 1.2), type: 'ember', color: '#ffb347', size: 2, add: 1 });
  } else if (o.kind === 'seat') {
    drawSpr(H_.seat, o.x, o.y);
    for (const s of [-1, 1]) { ctx.fillStyle = '#e8dcc0'; ctx.fillRect(o.x + s * 44 - 2, o.y - 26, 4, 12); drawFire(o.x + s * 44, o.y - 26, 5, 12, G.t, 1, s * 3); glow(o.x + s * 44, o.y - 30, 26, '#ffb347', .5 + .1 * Math.sin(G.t * 9 + s)); }
    G.lights.push({ x: o.x, y: o.y - 30, r: 220, i: .7, col: '#ffc070' });
  } else if (o.kind === 'gatestone') drawGateStone(o);
  else if (o.kind === 'swanpool') drawSwanPool(o);
}
function drawLongfire(o) {
  const t = G.t, x0 = o.x0 + 10, x1 = o.x1 - 10, y = o.y, low = G.hearthLow || 0, H_ = hallSprites();
  drawSpr(H_.pit, (o.x0 + o.x1) / 2, y);
  const k = 1 - low * .8, f = (.8 + .2 * Math.sin(t * 7) * Math.sin(t * 3.3)) * k;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(0, y - 8, 0, y + 10); gr.addColorStop(0, `rgba(255,120,40,${.5 * f})`); gr.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = gr; ctx.fillRect(x0, y - 8, x1 - x0, 18); ctx.restore();
  drawFire((x0 + x1) / 2, y + 2, x1 - x0 - 10, 46, t, k, 1);
  glow((x0 + x1) / 2, y - 10, 260, '#ff8a2b', .5 * f); glow((x0 + x1) / 2, y - 10, 120, '#ffd27a', .35 * f);
  G.lights.push({ x: (x0 + x1) / 2, y, r: 700 * (.55 + .45 * k), i: f, col: '#ffa050' }, { x: (x0 + x1) / 2, y, r: 260 * k + 60, i: f * .8, col: '#ffe0a0' });
  if (Math.random() < .5 * k) part({ x: rand(x0, x1), y: y - 10, vy: -rand(40, 110), vx: rand(-15, 15), life: rand(.8, 2), type: 'ember', color: '#ffb347', size: rand(1.4, 2.6), add: 1 });
}
function drawGateStone(o) {
  const H_ = hallSprites(), gt = o.gate, open = gateOpen(gt.id), col = GATE_COL[gt.id];
  ctx.save(); if (o.s < 0) { ctx.translate(o.x, 0); ctx.scale(-1, 1); ctx.translate(-o.x, 0); } drawSpr(H_.gate, o.x, o.y); ctx.restore();
  if (open) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(col, .55); ctx.font = '13px serif'; ctx.textAlign = 'center'; const rr = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾ'; for (let i = 0; i < 6; i++) ctx.fillText(rr[i], o.x, o.y - 110 + i * 18); ctx.restore(); }
  if (o.s > 0) {
    const x = gt.x, y = gt.y;
    drawSpr(H_.lintel, x, y - 130);
    ctx.fillStyle = open ? col : '#2a2a2e'; ctx.font = '600 15px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.fillText({ iron: 'ᛁᚱᚾ', ice: 'ᛁᛋ', sea: 'ᚾᚨᛋ', fire: 'ᛗᚢᛋ', utgard: 'ᚢᛏᚷ' }[gt.id], x, y - 125);
    if (open) {
      const a = .45 + .2 * Math.sin(G.t * 2 + x);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(x, y - 120, x, y); gr.addColorStop(0, hexA(col, 0)); gr.addColorStop(.5, hexA(col, a * .5)); gr.addColorStop(1, hexA(col, a));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y - 56, 32, 64, 0, 0, TAU); ctx.fill();
      ctx.restore();
      G.lights.push({ x, y: y - 50, r: 220, i: .8, col });
      if (Math.random() < .08) part({ x: x + rand(-30, 30), y: y - rand(0, 100), vy: -rand(10, 30), life: 1.4, type: 'ember', color: col, size: 1.8, add: 1 });
    }
    if (S.boss[REALMS[gt.id] ? REALMS[gt.id].boss : 'utgard']) { ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(x, y - 146, 4, 0, TAU); ctx.fill(); glow(x, y - 146, 14, '#ffe2a0', .8); }
  }
}
function drawSwanPool(o) {
  const t = G.t, ready = S.feathers >= 4 && !S.cloak;
  if (!HALL.pool) HALL.pool = paintSprite({ box: [-100, -50, 100, 50], s: 2, inkW: 1.6, rim: '#dff0ff', layers: [
    { draw: g => Fp(g, P => { for (let i = 0; i < 22; i++) { const a = i / 22 * TAU; vcr(P, rockPts(Math.cos(a) * 90, Math.sin(a) * 42 + 4, 10, 7, i + 9, 7, .2)); } }, '#6a6a72'), amp: .9, grain: .35, innerInk: true, inkW: .6 },
  ] });
  ctx.fillStyle = ready ? '#2a4a6a' : '#13283a'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 86, 40, 0, 0, TAU); ctx.fill();
  const wg = ctx.createRadialGradient(o.x - 20, o.y - 12, 4, o.x, o.y, 86); wg.addColorStop(0, 'rgba(160,210,255,.35)'); wg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(o.x, o.y, 86, 40, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(220,235,255,.35)'; ctx.lineWidth = 1.5; const k = (t * .3) % 1; ctx.beginPath(); ctx.ellipse(o.x, o.y, 80 * k, 36 * k, 0, 0, TAU); ctx.stroke();
  drawSpr(HALL.pool, o.x, o.y);
  for (let i = 0; i < S.feathers; i++) { const a = i / 4 * TAU + t * .2, P = new Path2D(); vleaf(P, o.x + Math.cos(a) * 40, o.y + Math.sin(a) * 16, a, 18, 5); ctx.fillStyle = '#ffffff'; ctx.fill(P); }
  glow(o.x, o.y, 120, ready ? '#ffffff' : '#7ab0d8', ready ? .5 + .2 * Math.sin(t * 3) : .2);
  G.lights.push({ x: o.x, y: o.y, r: ready ? 320 : 180, i: ready ? .95 : .6, col: '#bfe0ff' });
}

/* ---------------- the companions ---------------- */
const NRIG = {};
function npcSpr(key, box, layers, extra) { return NRIG[key] || (NRIG[key] = paintSprite(Object.assign({ s: 4, inkW: 1.4, rim: '#ffd8a8', rimA: .5, ao: .8, box, layers }, extra || {}))); }
function hildrSpr(sit, hood, feath) {
  const gown = '#4c4a58', gownD = '#3a3846', ash = '#8a8690', skin = '#e8d8cc';
  return npcSpr(`h${sit}${hood}${feath}`, [-18, -44, 18, 4], [
    { draw: g => Fp(g, P => { for (const sd of [-1, 1]) { vcr(P, [[sd * 3, -28], [sd * 13, -36], [sd * 17, -24], [sd * 14, -12], [sd * 8, -8]]); for (let i = 0; i < feath + 2; i++) vleaf(P, sd * (12 - i * 1.4), -20 + i * 2.6, PI / 2 + sd * .25, 9 - i, 3); } }, ash), amp: .6, grain: .3, bump: g => grooves(g, '#555', .8, [[-6, -30, -12, -24, -10, -12], [6, -30, 12, -24, 10, -12]]), bumpAmp: .8 },
    { draw: g => Fp(g, P => sit ? vcr(P, [[-9, -25], [9, -25], [12, -12], [16, -3], [-15, -3], [-12, -12]]) : vcr(P, [[-8, -26], [8, -26], [10, -12], [11.5, 0], [0, 1.6], [-11.5, 0], [-10, -12]]), gown), amp: .7, grain: .25,
      bump: g => grooves(g, '#555', 1, [[-4, -22, -5, -10, -6, -1], [3, -22, 4, -10, 5, -1]]), bumpAmp: 1 },
    { draw: g => { Fp(g, P => vcr(P, [[-3, -24], [3, -24], [4, sit ? -3 : 0], [-4, sit ? -3 : 0]]), '#5e5c6c'); Fp(g, P => vcirc(P, 0, -24, 1.9), '#d6aa48'); }, r: 1.5, h: 1, spec: .6 },
    ...(hood ? [] : [{ draw: g => Fp(g, P => { vcr(P, [[-5.6, -33], [-7.4, -24], [-5, -20], [-2.4, -27]]); vcr(P, [[5.6, -33], [7.4, -24], [5, -20], [2.4, -27]]); }, '#efeaf4'), amp: .6, h: .5 }]),
    { draw: g => { Fp(g, P => vcirc(P, 0, -31, 5.2), skin); }, amp: .8, h: 1.5 },
    ...(hood ? [{ draw: g => Fp(g, P => vcr(P, [[-7.6, -25], [-8, -34], [-4, -38.6], [4, -38.6], [8, -34], [7.6, -25], [5, -31], [0, -32.6], [-5, -31]]), gownD), amp: .7, h: 3 }] : [{ draw: g => Fp(g, P => vcr(P, [[-5.6, -33], [-4, -36.4], [0, -37], [4, -36.4], [5.6, -33], [0, -34]]), '#f2eef6'), amp: .6, h: 2.5 }]),
  ], { over: g => { g.fillStyle = '#ffcf6a'; g.fillRect(-2.6, -31.6, 1.6, 1.4); g.fillRect(1, -31.6, 1.6, 1.4); } });
}
function drawHildr(n) {
  const sit = n.sit ? 1 : 0, hood = !S.f.twist ? 1 : 0, feath = S.f.night ? 2 : S.f.twist ? 3 : 4;
  const spr = hildrSpr(sit, hood, feath), b = Math.sin(G.t * 1.6) * .4;
  dropShadow(ctx, n.x, n.y + 1, 13, 5, .8);
  drawSpr(spr, n.x, n.y + (sit ? 7 : 0) + b);
  glow(n.x, n.y + (sit ? 7 : 0) - 31, 8, '#ffcf6a', .5);
}
function drawBjarki(n) {
  const x = n.x, y = n.y, t = G.t, sw = Math.max(0, Math.sin(t * 2.2));
  const body = npcSpr('bjarki', [-18, -46, 18, 4], [
    { draw: g => Fp(g, P => { vlimb(P, [[-5, -14], [-6, 0]], [7, 6]); vlimb(P, [[5, -14], [6, 0]], [7, 6]); vcr(P, [[-8, -1.6], [-2, -2.6], [-1, 1.2], [-9, 1.4]]); vcr(P, [[2, -2.6], [8, -1.6], [9, 1.4], [1, 1.2]]); }, '#3a2c22'), amp: .8 },
    { draw: g => Fp(g, P => vcr(P, [[-13, -28], [-11, -40], [11, -40], [13, -28], [12, -12], [0, -10], [-12, -12]]), '#3e3e46'), amp: .7 },
    { draw: g => { Fp(g, P => vcr(P, [[-9, -30], [9, -30], [10, -6], [0, -4], [-10, -6]]), '#6a4a2a'); g.strokeStyle = '#3a2614'; g.lineWidth = .6; g.beginPath(); g.moveTo(-9, -30); g.lineTo(-12, -38); g.moveTo(9, -30); g.lineTo(12, -38); g.stroke(); }, r: 4, amp: .6, h: 1.5, grain: .35 },
    { draw: g => Fp(g, P => vlimb(P, [[11, -36], [14, -26], [12, -16]], [6.4, 5.6, 5]), '#c9a07a'), amp: .9, h: 2 },
    { draw: g => Fp(g, P => vcirc(P, 0, -42, 6.6), '#c9a07a'), amp: .9, h: 2 },
    { draw: g => { Fp(g, P => { vcr(P, [[-6.6, -42], [-5, -37], [0, -35], [5, -37], [6.6, -42], [5, -30], [1.6, -22], [-1.6, -22], [-5, -30]]); }, '#b84e24'); g.strokeStyle = '#7a2e12'; g.lineWidth = .5; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-4 + i * 1.6, -36); g.lineTo(-2 + i * .8, -24); g.stroke(); } Fp(g, P => vcr(P, [[-1, -23.6], [1, -23.6], [1, -22], [-1, -22]]), '#c9a548'); }, amp: .6, h: 3 },
  ], { over: g => { g.fillStyle = '#1a120c'; g.fillRect(-3.2, -43.6, 1.5, 1.2); g.fillRect(1.8, -43.6, 1.5, 1.2); g.fillStyle = 'rgba(40,30,20,.35)'; g.beginPath(); g.ellipse(-2, -46, 3, 1.4, 0, 0, TAU); g.fill(); } });
  const arm = npcSpr('bjarkiArm', [-4, -4, 22, 6], [
    { draw: g => Fp(g, P => vlimb(P, [[0, 0], [8, .5], [14, 0]], [6.4, 5.4, 4.8]), '#c9a07a'), amp: .9 },
    { draw: g => { Fp(g, P => vpoly(P, [[13, -1], [24, -1], [24, 1], [13, 1]]), '#5a3e24'); Fp(g, P => vcr(P, [[21, -5], [27, -5], [27, 5], [21, 5]]), '#55575c'); }, r: 1.6, h: 2, spec: .8, shine: 16 },
  ]);
  dropShadow(ctx, x, y + 1, 16, 6, .8);
  drawSpr(body, x, y);
  const a = -1.9 + sw * 1.5; ctx.save(); ctx.translate(x - 11, y - 36); ctx.rotate(a); ctx.drawImage(arm.c, arm.ox, arm.oy, arm.wu, arm.hu); ctx.restore();
  if (sw > .97 && Math.random() < .5) { burst(x - 22, y - 34, 4, { type: 'spark', color: '#ffd27a', add: 1, smin: 60, smax: 160 }); SFX.tick(); }
}
function drawAsta(n) {
  const x = n.x, y = n.y;
  const spr = npcSpr('asta', [-20, -64, 20, 6], [
    { draw: g => Fp(g, P => vlimb(P, [[14, 4], [15, -30], [16, -52]], [2.6, 2.4, 2.2]), '#5a442e'), amp: .9 },
    { draw: g => { Fp(g, P => vcr(P, [[-11, -26], [11, -26], [14, -10], [15, 4], [-15, 4], [-14, -10]]), '#2a3a5c'); g.fillStyle = '#9fe0c8'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(-12 + hash2(i, 1) * 24, -22 + hash2(i, 2) * 24, .9, 0, TAU); g.fill(); } }, amp: .7, grain: .3 },
    { draw: g => Fp(g, P => vcirc(P, 0, -32, 5.4), '#c8b4a0'), amp: .8, h: 1 },
    { draw: g => { Fp(g, P => vcr(P, [[-8.4, -25], [-9, -38], [-4, -43], [4, -43], [9, -38], [8.4, -25], [5.6, -33], [0, -35.6], [-5.6, -33]]), '#141416'); g.strokeStyle = '#f4f0ea'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-7.4, -26); g.quadraticCurveTo(-6, -36, 0, -36); g.quadraticCurveTo(6, -36, 7.4, -26); g.stroke(); }, amp: .7, h: 2.4 },
    { draw: g => { Fp(g, P => { for (let i = 0; i < 7; i++) vcirc(P, -7 + i * 2.4, -23.4 + Math.sin(i * .9) * 1.6, 1.15); }, '#7fd8c0'); }, r: .8, h: 3, spec: 1, shine: 20, ink: false },
    { draw: g => Fp(g, P => { vcirc(P, 16, -54, 2.6); vcr(P, [[-6, -6], [-2, -8], [-2, -3], [-6, -2]]); vcr(P, [[2, -8], [6, -6], [6, -2], [2, -3]]); }, '#c9a548'), r: 1.2, h: 3, spec: 1, shine: 18 },
  ], { over: g => { g.strokeStyle = '#3a2a20'; g.lineWidth = .8; g.beginPath(); g.moveTo(-3.5, -32); g.lineTo(-1, -32); g.moveTo(1, -32); g.lineTo(3.5, -32); g.stroke(); } });
  drawSpr(spr, x, y - 4);
  glow(x + 16, y - 58, 14, '#9fe0c8', .6 + .2 * Math.sin(G.t * 2));
}
function drawKolr(n) {
  const x = n.x, y = n.y, t = G.t;
  const spr = npcSpr('kolr', [-16, -44, 18, 4], [
    { draw: g => Fp(g, P => vcr(P, [[-9, -22], [9, -22], [12, -8], [12, -2], [-12, -2], [-12, -8]]), '#5a3a1a'), amp: .7, grain: .3 },
    { draw: g => Fp(g, P => vcr(P, [[-10, -9], [10, -9], [10, -6], [-10, -6]]), '#2a2a34'), r: 1, h: 1 },
    { draw: g => Fp(g, P => vcirc(P, 0, -28, 5.2), '#dcb48e'), amp: .8, h: 1 },
    { draw: g => Fp(g, P => vcr(P, [[-3, -24.6], [3, -24.6], [2, -20], [0, -18.4], [-2, -20]]), '#6a4a2a'), amp: .6, h: 1.4 },
    { draw: g => Fp(g, P => vcr(P, [[-5.6, -30], [-4, -36], [2, -40], [9, -38], [4, -35], [5.6, -30]]), '#a8302a'), amp: .7, h: 2.5 },
    { draw: g => { Fp(g, P => vcr(P, [[4, -4], [6, -21], [14, -19], [12, -3]]), '#8a6034'); Fp(g, P => vcr(P, [[6.2, -8], [7.4, -18], [12.4, -16.6], [11, -7]]), '#2a1a0e'); g.strokeStyle = '#e8d8b0'; g.lineWidth = .35; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(7 + i * 1.1, -17.4 + i * .3); g.lineTo(6.6 + i * 1.1, -8.4); g.stroke(); } }, r: 1.4, h: 4, spec: .3 },
  ], { over: g => { g.fillStyle = '#1a120c'; g.fillRect(-2.6, -29, 1.4, 1.3); g.fillRect(1.4, -29, 1.4, 1.3); } });
  drawSpr(spr, x, y + 2);
  if (Math.random() < .01) part({ x: x + 14, y: y - 30, vy: -20, vx: 10, life: 1.6, type: 'rune', ch: pick('♪♫'), color: '#f0c87a', size: 10 });
}
function drawMuninn(n) {
  const x = n.x, y = n.y - 112, bob = Math.sin(G.t * 1.5) * .6, s = P && P.x < x ? -1 : 1;
  vRaven(ctx, x, y + bob, .55, G.t, { perch: 1, face: s, col: '#101216', rim: '#9ab0d8' });
  glow(x + 9 * s, y - 8 + bob, 4, '#cfe0ff', .8);
}
function drawYlfa(n) {
  const x = n.x, y = n.y, t = G.t, fx = Math.cos(n.face || 0) < 0 ? -1 : 1, w = Math.sin(n.walk || 0) * .5;
  const body = npcSpr('ylfa', [-14, -18, 14, 2], [
    { draw: g => Fp(g, P => { vleaf(P, -7, -8, PI + .4, 9, 4.4, 2); }, '#d8ecff'), amp: .7 },
    { draw: g => Fp(g, P => { vcr(P, [[-8, -7], [-4, -10], [4, -10.4], [8, -8], [8, -4], [0, -3], [-7, -4]]); fringe(P, [[-6, -9.6], [0, -10.6], [6, -9.6]], 5, 2.6, 1.6, -PI / 2 - .4, .5, 4); }, '#d8ecff'), amp: .7, grain: .2 },
    { draw: g => Fp(g, P => { vcr(P, [[5, -12], [8, -14], [12, -12], [13.4, -9.6], [9.6, -7], [5.4, -8]]); vpoly(P, [[6, -12.6], [6, -17], [8.4, -13.6]]); vpoly(P, [[9, -13.4], [10.6, -17], [11, -12.6]]); }, '#e2f2ff'), amp: .8, h: 1 },
  ], { rim: '#bfe0ff', ink: '#2a4a6a', over: g => { g.fillStyle = '#2a4a6a'; g.fillRect(10.2, -11.4, 1.2, 1.2); } });
  const leg = npcSpr('ylfaLeg', [-1.4, -1, 2, 6], [{ draw: g => Fp(g, P => vlimb(P, [[0, 0], [.2, 5]], [2, 1.6]), '#c8e0f8'), amp: .8 }], { ink: '#2a4a6a' });
  ctx.save(); ctx.globalAlpha = .8; ctx.translate(x, y); ctx.scale(fx, 1);
  dropShadow(ctx, 0, 1, 9, 3, .5);
  for (const [lx, ph] of [[-4, 0], [5, PI]]) { ctx.save(); ctx.translate(lx, -5); ctx.rotate(Math.sin((n.walk || 0) + ph) * .5 * (w ? 1 : 0)); ctx.drawImage(leg.c, leg.ox, leg.oy, leg.wu, leg.hu); ctx.restore(); }
  ctx.save(); ctx.translate(-7, -8); ctx.rotate(Math.sin(t * 9) * .2); ctx.translate(7, 8); ctx.drawImage(body.c, body.ox, body.oy, body.wu, body.hu); ctx.restore();
  ctx.restore();
  glow(x, y - 6, 20, '#bfe0ff', .35);
}
