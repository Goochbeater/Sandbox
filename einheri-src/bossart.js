/* =====================================================================
   BOSS ART — the jötnar, huge and cel-shaded, after the old hand-drawn style
   (light from the upper left, a bold ink line, two tones and a glow)
   ===================================================================== */
function bcel(path, lit, shade, k, lw = 3.2, ink = '#0c0705') { cel(path, lit, shade, k, ink, lw); }
function grad(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
const FL = c => (G.boss && G.boss.flash > 0 ? '#ffffff' : c);

/* ---------------- Þrymr: the frost giant, as tall as a hall ---------------- */
/* ---------------- Níðhöggr: the wyrm under the ice ---------------- */
/* ---------------- Útgarða-Loki, the king who is smaller than he looks ---------------- */
function drawUtgard(b) {
  const A = b.an, t = b.t;
  if (A.rise.v > .01) drawSkrymir(b);
  if (A.fade.v < .02) return;
  const one = (x, y, alpha, real, ph) => {
    ctx.save(); ctx.globalAlpha = alpha * A.fade.v; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; CEL_LX = 1;
    if (real) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(x + 10, y + 4, 66, 18, 0, 0, TAU); ctx.fill(); }
    const sw = Math.sin(t * 2 + ph) * 8, ink = '#040804', fl = real && b.flash > 0;
    const cloak = [fl ? '#fff' : '#22402a', '#0c1a10'];
    bcel(P_(() => { ctx.moveTo(x - 28, y - 236); ctx.quadraticCurveTo(x - 84, y - 110, x - 98 + sw, y); for (let i = 0; i <= 9; i++) ctx.lineTo(x - 98 + sw + i * 21.8, y + (i % 2 ? -14 : 6) + Math.sin(t * 4 + i) * 4); ctx.quadraticCurveTo(x + 84, y - 110, x + 28, y - 236); ctx.closePath(); }), cloak[0], cloak[1], 8, 3.2, ink);
    ctx.strokeStyle = '#d6b050'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 92 + sw, y - 6); ctx.quadraticCurveTo(x - 76, y - 110, x - 26, y - 230); ctx.moveTo(x + 92 + sw, y - 6); ctx.quadraticCurveTo(x + 76, y - 110, x + 26, y - 230); ctx.stroke();
    bcel(poly([x - 20, y - 222, x - 30, y - 40, x + 30, y - 40, x + 20, y - 222]), fl ? '#fff' : '#3a6040', '#1a3020', 4, 2.4, ink);
    ctx.strokeStyle = 'rgba(214,176,80,.8)'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - 14, y - 200 + i * 28); ctx.lineTo(x + 14, y - 196 + i * 28); ctx.stroke(); }
    const c = A.cast.v;
    for (const s of [-1, 1]) {
      const hx = x + s * (66 + c * 42), hy = y - 168 - c * 70 * (s > 0 ? 1 : .6);
      bcel(P_(() => taper(ctx, x + s * 28, y - 208, hx, hy, 18, 9)), cloak[0], cloak[1], 3, 2.6, ink);
      ctx.strokeStyle = '#dfe6d0'; ctx.lineWidth = 2.6; for (let f = 0; f < 4; f++) { const fa = -PI / 2 + s * (.2 + f * .25); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(fa) * 24, hy + Math.sin(fa) * 24); ctx.stroke(); }
      if (c > .2) glowPost(hx, hy - 12, 44 * c + 12, '#6aff4a', c * .85);
    }
    const hx = x, hy = y - 266;
    bcel(P_(() => { ctx.moveTo(hx - 21, hy - 25); ctx.quadraticCurveTo(hx - 25, hy + 20, hx, hy + 42); ctx.quadraticCurveTo(hx + 25, hy + 20, hx + 21, hy - 25); ctx.quadraticCurveTo(hx, hy - 39, hx - 21, hy - 25); ctx.closePath(); }), fl ? '#fff' : '#d6d8c2', '#8a8e78', 4, 2.8, ink);
    const l = A.laugh.v;
    ctx.strokeStyle = ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(hx - 12, hy + 17); ctx.quadraticCurveTo(hx, hy + 25 + l * 8, hx + 14, hy + 12); ctx.stroke();
    for (const s of [-1, 1]) { ctx.fillStyle = real ? '#e6ff8a' : '#8aff6a'; ctx.beginPath(); ctx.ellipse(hx + s * 8.5, hy - 5, 4.6, 2.6, s * .3, 0, TAU); ctx.fill(); if (real) glowPost(hx + s * 8.5, hy - 5, 14, '#e6ff8a', .9); }
    ctx.strokeStyle = '#0a0f08'; ctx.lineWidth = 8; const crown = () => { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * 11, hy - 31); ctx.quadraticCurveTo(hx + s * 36, hy - 70, hx + s * 31, hy - 106); ctx.moveTo(hx + s * 25, hy - 62); ctx.lineTo(hx + s * 54, hy - 82); ctx.moveTo(hx + s * 31, hy - 90); ctx.lineTo(hx + s * 14, hy - 114); ctx.stroke(); } };
    crown(); ctx.strokeStyle = '#d6b050'; ctx.lineWidth = 4.6; crown();
    ctx.restore();
    glowPost(x, y - 130, 160, '#5aff4a', .12 * alpha * A.fade.v);
  };
  for (const c of b.copies) if (c.live) one(c.x + Math.sin(t * 7 + c.ph) * 2, c.y, .7, false, c.ph);
  one(b.x, b.y, 1, true, 0);
  G.lights.push({ x: b.x, y: b.y - 160, r: 320, i: .7 * A.fade.v, col: '#b0ff8a' });
}
function drawSkrymir(b) {
  const A = b.an, t = b.t, f = skryFace(b), r = A.rise.v, fl = b.flash > 0;
  const x = f.x, y = f.y + (1 - r) * 500, ink = '#0a100a';
  ctx.save(); ctx.globalAlpha = r; ctx.lineJoin = 'round'; CEL_LX = 1;
  bcel(P_(() => { ctx.moveTo(x - 440, y - 60); ctx.quadraticCurveTo(x - 560, y + 220, x - 320, y + 440); for (let i = 0; i <= 12; i++) ctx.lineTo(x - 320 + i * 53.3, y + 440 + (i % 2) * 44 + Math.sin(t + i) * 12); ctx.quadraticCurveTo(x + 560, y + 220, x + 440, y - 60); ctx.closePath(); }), '#3e4c38', '#1e2a1c', 30, 7, ink);
  ctx.strokeStyle = 'rgba(170,200,130,.28)'; ctx.lineWidth = 7; for (let i = 0; i < 16; i++) { const s = i / 15 - .5; ctx.beginPath(); ctx.moveTo(x + s * 640, y); ctx.quadraticCurveTo(x + s * 760, y + 220, x + s * 600, y + 450); ctx.stroke(); }
  bcel(blob(x, y - 170, 400, 310), fl ? '#ffffff' : '#8c9278', '#4c5240', 40, 8, ink);
  for (const s of [-1, 1]) bcel(P_(() => { ctx.moveTo(x + s * 320, y - 220); ctx.quadraticCurveTo(x + s * 160, y - 330, x + s * 20, y - 230); ctx.quadraticCurveTo(x + s * 170, y - 268, x + s * 320, y - 220); ctx.closePath(); }), '#6a705c', '#3a4030', 8, 5, ink);
  bcel(P_(() => { ctx.moveTo(x - 46, y - 210); ctx.quadraticCurveTo(x - 80, y - 40, x, y - 18); ctx.quadraticCurveTo(x + 80, y - 40, x + 46, y - 210); ctx.closePath(); }), '#7a806a', '#40463a', 14, 6, ink);
  for (const s of [-1, 1]) { ctx.fillStyle = '#fff09a'; ctx.beginPath(); ctx.ellipse(x + s * 160, y - 196, 50, 22, 0, 0, TAU); ctx.fill(); glowPost(x + s * 160, y - 196, 150, '#e6ff6a', .6); ctx.fillStyle = '#1a1a0a'; ctx.beginPath(); ctx.arc(x + s * 160 + Math.sin(t) * 12, y - 196, 11, 0, TAU); ctx.fill(); }
  const m = A.mouth.v;
  ctx.fillStyle = '#0c0f08'; ctx.beginPath(); ctx.ellipse(x, y + 44, 140, 15 + m * 66, 0, 0, TAU); ctx.fill();
  if (m > .2) glowPost(x, y + 44, 160, '#6fb0d8', m * .4);
  ctx.strokeStyle = '#1a2414'; ctx.lineWidth = 5; for (let i = 0; i < 20; i++) { const s = i / 19 - .5, bx = x + s * 680, by = y - 420 + Math.abs(s) * 240; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 46 - (i % 3) * 16); ctx.moveTo(bx - 12, by - 20); ctx.lineTo(bx, by - 34); ctx.lineTo(bx + 12, by - 20); ctx.stroke(); }
  ctx.restore();
  for (const h of b.hands) {
    const k = h.side < 0 ? A.hL.v : A.hR.v; if (k < .02) continue;
    const hx = h.x, hy = h.y - (1 - h.down) * 380 * (1 - k * .2) - (h.down ? 0 : 140);
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); CEL_LX = 1;
    ctx.fillStyle = h.down ? 'rgba(0,0,0,.5)' : `rgba(0,0,0,${.3 * k})`; ctx.beginPath(); ctx.ellipse(h.x + 20, h.y + 8, h.down ? 170 : 120, h.down ? 52 : 36, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#0a100a'; ctx.lineWidth = 210; ctx.beginPath(); ctx.moveTo(hx - h.side * 130, hy - 80); ctx.lineTo(hx - h.side * 130, hy - 480); ctx.stroke(); ctx.strokeStyle = '#6a705a'; ctx.lineWidth = 196; ctx.stroke();
    bcel(blob(hx, hy - 50, 140, 96), fl && h.rest > 0 ? '#ffffff' : '#8c9278', '#4c5240', 14, 6, '#0a100a');
    for (let f = 0; f < 4; f++) bcel(blob(hx - 96 + f * 64, hy + 22, 28, 50), fl && h.rest > 0 ? '#ffffff' : '#8c9278', '#4c5240', 6, 5, '#0a100a');
    ctx.restore();
    if (h.rest > 0) glowPost(hx, hy - 30, 160, '#e6ff8a', .25 + .15 * Math.sin(G.t * 8));
  }
}

/* ---------------- Skögul and her sisters ---------------- */
function drawSkogul(b) {
  const A = b.an, z = A.z.v;
  ctx.fillStyle = `rgba(60,40,20,${.45 * (1 - Math.min(1, z / 700) * .6)})`; ctx.beginPath(); ctx.ellipse(b.x + 8, b.y + 3, 40 + z * .03, 13 + z * .01, 0, 0, TAU); ctx.fill();
  if (z > 650) return;
  drawValkyrie(b.x, b.y - z, 2.5, b.t * (A.wing.v > .5 ? 14 : 5), Math.cos(b.face) < 0 ? -1 : 1, b.flash > 0, false, A.spear.v, A.shield.v);
  G.lights.push({ x: b.x, y: b.y - z - 50, r: 260, i: .8, col: '#fff0c8' });
}
function drawValkyrie(x, y, sc, flap, side, fl, ghost, spear = 0, shield = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc * side, sc); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; CEL_LX = side;
  const ink = ghost ? '#ffe08a' : '#2a2016', W_ = c => fl ? '#ffffff' : ghost ? 'rgba(255,220,140,.35)' : c;
  for (const s of [-1, 1]) {
    const fa = Math.sin(flap) * .35;
    for (let i = 6; i >= 0; i--) {
      const a = -PI / 2 + s * (.35 + i * .2 + fa), L = 42 - i * 2.2;
      cel(P_(() => { ctx.moveTo(s * 5, -26); ctx.quadraticCurveTo(s * 5 + Math.cos(a) * L * .6 + s * 6, -26 + Math.sin(a) * L * .6, s * 5 + Math.cos(a) * L, -26 + Math.sin(a) * L); ctx.quadraticCurveTo(s * 5 + Math.cos(a + s * .2) * L * .5, -26 + Math.sin(a + s * .2) * L * .5, s * 5, -22); ctx.closePath(); }), W_(i % 2 ? '#ffffff' : '#ece6da'), W_('#b8b0a2'), .6, ink, .6);
    }
  }
  cel(poly([-6.5, -24, -9.5, -1, 9.5, -1, 6.5, -24]), W_('#c8d0da'), W_('#7a8696'), 1, ink, .9);
  cel(poly([-3, -22, -4, -1, 4, -1, 3, -22]), W_('#f4f6fa'), W_('#b8c0cc'), .5, ink, 0);
  ctx.strokeStyle = '#d6b050'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-7.5, -12); ctx.lineTo(7.5, -12); ctx.stroke();
  ctx.strokeStyle = ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(-3, .5); ctx.moveTo(3, -1); ctx.lineTo(3, .5); ctx.stroke();
  for (const s of [-1, 1]) cel(P_(() => { ctx.moveTo(s * 4, -31); ctx.quadraticCurveTo(s * 7.5, -18, s * 5, -9); ctx.lineTo(s * 3, -9); ctx.quadraticCurveTo(s * 4, -20, s * 2, -29); ctx.closePath(); }), W_('#f0c870'), W_('#b08030'), .4, ink, .5);
  cel(blob(0, -31.5, 4.6, 4.6), W_('#f0d6bc'), W_('#b8907a'), .6, ink, .8);
  cel(P_(() => { ctx.arc(0, -32.5, 5, PI, TAU); ctx.closePath(); }), W_('#dfe2e8'), W_('#8a909a'), .5, ink, .8);
  for (const s of [-1, 1]) cel(P_(() => { ctx.moveTo(s * 4, -34.5); ctx.quadraticCurveTo(s * 13, -43, s * 14, -36.5); ctx.quadraticCurveTo(s * 9.5, -36.5, s * 4, -32.5); ctx.closePath(); }), W_('#ffffff'), W_('#c8c0b0'), .4, ink, .6);
  ctx.fillStyle = '#2a4a8a'; ctx.fillRect(1, -32.5, 2.2, 1.4);
  const sa = -PI / 2 + .3 + spear * 1.6;
  ctx.save(); ctx.translate(6.5, -18); ctx.rotate(sa);
  ctx.strokeStyle = ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(31, 0); ctx.stroke(); ctx.strokeStyle = W_('#9a7444'); ctx.lineWidth = 1.4; ctx.stroke();
  cel(poly([40, 0, 30, -2.8, 30, 2.8]), W_('#f2f6fa'), W_('#9aa2ac'), .4, ink, .7);
  ctx.restore();
  cel(blob(-8.5 - shield * 6, -15, 7.5, 9.5), W_('#ece4d4'), W_('#a89e8a'), .8, ink, 1);
  ctx.fillStyle = '#d6b050'; ctx.beginPath(); ctx.arc(-8.5 - shield * 6, -15, 2.2, 0, TAU); ctx.fill();
  CEL_LX = 1;
  ctx.restore();
  if (!ghost) glowPost(x, y - 30 * sc, 70 * sc / 1.9, '#ffe6a0', .35);
}
