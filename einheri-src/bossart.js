/* =====================================================================
   BOSS ART — the jötnar, huge and cel-shaded, after the old hand-drawn style
   (light from the upper left, a bold ink line, two tones and a glow)
   ===================================================================== */
function bcel(path, lit, shade, k, lw = 3.2, ink = '#0c0705') { cel(path, lit, shade, k, ink, lw); }
function grad(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
const FL = c => (G.boss && G.boss.flash > 0 ? '#ffffff' : c);

/* ---------------- Angrboða: a rooted crone of iron bark, and her writhing roots ---------------- */
function drawAngr(b) {
  const x = b.x, y = b.y, t = b.t, A = b.an, rage = A.rage.v, sink = A.sink.v;
  const bark = [FL('#5e4a3a'), '#2a1e14'], bark2 = [FL('#78624e'), '#34261a'], ink = '#0c0705';
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; CEL_LX = 1;
  { const sg = ctx.createRadialGradient(x + 20, y, 0, x + 20, y, 360); sg.addColorStop(0, 'rgba(6,3,2,.75)'); sg.addColorStop(.6, 'rgba(6,3,2,.45)'); sg.addColorStop(1, 'rgba(6,3,2,0)'); ctx.fillStyle = sg; ctx.save(); ctx.translate(x + 20, y); ctx.scale(1, .36); ctx.translate(-x - 20, -y); ctx.beginPath(); ctx.arc(x + 20, y, 360, 0, TAU); ctx.fill(); ctx.restore(); }
  // roots that lash and writhe like tentacles
  const lash = A.sweep.v;
  for (let i = 0; i < 9; i++) {
    const a0 = i / 9 * TAU + .35, L = 210 + (i % 3) * 60, wv = Math.sin(t * 1.6 + i * 1.7) * .35 + (i % 2 ? lash : -lash) * .5;
    const p0 = [x + Math.cos(a0) * 70, y + Math.sin(a0) * 26], p1 = [x + Math.cos(a0 + wv) * L * .55, y + Math.sin(a0 + wv) * L * .3 - 20], p2 = [x + Math.cos(a0 - wv * .6) * L, y + Math.sin(a0 - wv * .6) * L * .45];
    const pts = []; for (let k = 0; k <= 14; k++) { const u = k / 14, v = 1 - u; pts.push([v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]]); }
    const path = P_(() => { const Lf = [], Rt = []; for (let k = 0; k <= 14; k++) { const p = pts[k], q = pts[Math.min(14, k + 1)], o = pts[Math.max(0, k - 1)], an = Math.atan2(q[1] - o[1], q[0] - o[0]) + PI / 2, w = lerp(30, 3, k / 14); Lf.push([p[0] + Math.cos(an) * w, p[1] + Math.sin(an) * w]); Rt.push([p[0] - Math.cos(an) * w, p[1] - Math.sin(an) * w]); } ctx.moveTo(Lf[0][0], Lf[0][1]); for (const p of Lf) ctx.lineTo(p[0], p[1]); for (let k = Rt.length - 1; k >= 0; k--) ctx.lineTo(Rt[k][0], Rt[k][1]); ctx.closePath(); });
    bcel(path, bark[0], bark[1], 5, 3);
    ctx.strokeStyle = hexA('#ff9a3a', .45 + .4 * Math.sin(t * 2 + i) * (.5 + rage * .5)); ctx.lineWidth = 2; ctx.beginPath(); pts.slice(0, 11).forEach((p, k) => k ? ctx.lineTo(p[0], p[1] - 2) : ctx.moveTo(p[0], p[1] - 2)); ctx.stroke();
  }
  ctx.save(); ctx.beginPath(); ctx.rect(x - 600, y - 900, 1200, 912); ctx.clip();
  ctx.translate(0, sink * 460);
  const lean = A.lean.v * 24 + Math.sin(t * .8) * 6;
  const tx = x + lean * .8, ty = y - 210;
  // moss-and-iron hair streaming behind
  for (let i = 0; i < 18; i++) {
    const s = i / 17 - .5, sx = tx + s * 100, sw = Math.sin(t * 1.4 + i * .7) * (14 + rage * 16);
    ctx.strokeStyle = ink; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(sx, ty - 220); ctx.bezierCurveTo(sx + s * 120, ty - 150, sx + s * 170 + sw, ty - 40, sx + s * 150 + sw * 1.5, ty + 60 + (i % 3) * 30); ctx.stroke();
    ctx.strokeStyle = FL(i % 2 ? '#6a6458' : '#4e4a40'); ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = 'rgba(160,170,120,.35)'; ctx.lineWidth = 3; ctx.stroke();
  }
  // trunk-skirt rooted in the earth
  bcel(P_(() => { ctx.moveTo(x - 150, y); ctx.bezierCurveTo(x - 130, y - 90, x - 74 + lean * .3, y - 150, x - 76 + lean * .5, ty); ctx.lineTo(x + 76 + lean * .5, ty); ctx.bezierCurveTo(x + 74 + lean * .3, y - 150, x + 130, y - 90, x + 150, y); ctx.quadraticCurveTo(x, y + 26, x - 150, y); ctx.closePath(); }), grad(x - 150, 0, x + 150, 0, [FL('#6a5444'), bark[0], '#1a120c']), bark[1], 14, 3.6);
  ctx.strokeStyle = 'rgba(10,6,4,.55)'; ctx.lineWidth = 3; for (let i = 0; i < 10; i++) { const s = i / 9 - .5; ctx.beginPath(); ctx.moveTo(x + s * 270, y - 6); ctx.bezierCurveTo(x + s * 210, y - 80, x + s * 140 + lean * .3, y - 150, x + s * 140 + lean * .5, ty + 4); ctx.stroke(); }
  ctx.strokeStyle = hexA('#ff9a3a', .5 + rage * .45); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 40, y - 10); ctx.lineTo(x - 30, y - 70); ctx.lineTo(x - 48, y - 130); ctx.lineTo(x - 30, y - 190); ctx.moveTo(x + 56, y - 8); ctx.lineTo(x + 44, y - 90); ctx.lineTo(x + 62, y - 160); ctx.stroke();
  glowPost(x - 36, y - 110, 40, '#ff7a1a', .2 + rage * .3);
  // torso of bark and rib
  bcel(P_(() => { ctx.moveTo(tx - 78, ty); ctx.quadraticCurveTo(tx - 96, ty - 90, tx - 86, ty - 165); ctx.quadraticCurveTo(tx, ty - 198, tx + 86, ty - 165); ctx.quadraticCurveTo(tx + 96, ty - 90, tx + 78, ty); ctx.closePath(); }), bark2[0], bark2[1], 10, 3.6);
  ctx.strokeStyle = ink; ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) { const yy = ty - 44 - i * 27; ctx.beginPath(); ctx.moveTo(tx - 8, yy); ctx.quadraticCurveTo(tx - 44, yy - 12, tx - 68, yy + 6); ctx.moveTo(tx + 8, yy); ctx.quadraticCurveTo(tx + 44, yy - 12, tx + 68, yy + 6); ctx.stroke(); }
  // necklace of wolf skulls
  ctx.strokeStyle = '#7a7470'; ctx.lineWidth = 4; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(tx - 80, ty - 156); ctx.quadraticCurveTo(tx, ty - 74, tx + 80, ty - 156); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 5; i++) { const k = i / 4, sx = lerp(tx - 60, tx + 60, k), sy = ty - 148 + Math.sin(k * PI) * 60; bcel(poly([sx - 9, sy - 7, sx + 9, sy - 7, sx + 5, sy + 10, sx - 5, sy + 10]), FL('#e8dcc4'), '#9a8e78', 2, 1.8); ctx.fillStyle = ink; ctx.fillRect(sx - 6, sy - 4, 3.4, 3.4); ctx.fillRect(sx + 2.6, sy - 4, 3.4, 3.4); }
  // the arms: branch-limbs with clawed twig-fingers
  const arm = (s, raise, sweep) => {
    const shx = tx + s * 84, shy = ty - 150;
    const ang = s > 0 ? lerp(.9, -1.25, raise) + sweep * .9 : lerp(PI - .9, PI + 1.25, raise) - sweep * .9;
    const ex = shx + Math.cos(ang) * 150, ey = shy + Math.sin(ang) * 100 + 56;
    const hx = ex + Math.cos(ang + s * .4) * 120, hy = ey + Math.sin(ang + s * .4) * 80 + 40;
    bcel(P_(() => { const a1 = Math.atan2(ey - shy, ex - shx) + PI / 2, a2 = Math.atan2(hy - ey, hx - ex) + PI / 2; ctx.moveTo(shx + Math.cos(a1) * 22, shy + Math.sin(a1) * 22); ctx.quadraticCurveTo(ex + Math.cos(a1) * 18, ey + Math.sin(a1) * 18, hx + Math.cos(a2) * 9, hy + Math.sin(a2) * 9); ctx.lineTo(hx - Math.cos(a2) * 9, hy - Math.sin(a2) * 9); ctx.quadraticCurveTo(ex - Math.cos(a1) * 18, ey - Math.sin(a1) * 18, shx - Math.cos(a1) * 22, shy - Math.sin(a1) * 22); ctx.closePath(); }), bark[0], bark[1], 5, 3.2);
    for (let f = 0; f < 5; f++) {
      const fa = ang + s * .2 + (f - 2) * .3, L = 56 + (f % 2) * 20;
      bcel(P_(() => taper(ctx, hx, hy, hx + Math.cos(fa) * L, hy + Math.sin(fa) * L * .7 + 12, 10, 2)), bark2[0], bark2[1], 2, 2.2);
    }
  };
  arm(-1, A.armL.v, A.sweep.v); arm(1, A.armR.v, -A.sweep.v);
  // head: hooked nose, sunken cheeks, lantern eyes
  const fx = tx, fy = ty - 240;
  for (const s of [-1, 1]) for (const [ax, ay, bx, by] of [[s * 32, -52, s * 70, -150], [s * 56, -100, s * 112, -128], [s * 66, -132, s * 40, -178], [s * 82, -116, s * 100, -164]]) { ctx.strokeStyle = ink; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(fx + ax, fy + ay); ctx.lineTo(fx + bx, fy + by); ctx.stroke(); ctx.strokeStyle = FL('#3a2a1e'); ctx.lineWidth = 6; ctx.stroke(); }
  bcel(P_(() => { ctx.moveTo(fx - 48, fy - 44); ctx.quadraticCurveTo(fx - 56, fy + 30, fx - 26, fy + 66); ctx.quadraticCurveTo(fx, fy + 88, fx + 26, fy + 66); ctx.quadraticCurveTo(fx + 56, fy + 30, fx + 48, fy - 44); ctx.quadraticCurveTo(fx, fy - 74, fx - 48, fy - 44); ctx.closePath(); }), FL('#5a4636'), '#2a1e14', 8, 3.4);
  ctx.strokeStyle = ink; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(fx - 40, fy - 16); ctx.quadraticCurveTo(fx - 18, fy - 32, fx - 3, fy - 12); ctx.moveTo(fx + 40, fy - 16); ctx.quadraticCurveTo(fx + 18, fy - 32, fx + 3, fy - 12); ctx.stroke();
  bcel(P_(() => { ctx.moveTo(fx - 4, fy - 12); ctx.quadraticCurveTo(fx + 12, fy + 20, fx + 3, fy + 34); ctx.lineTo(fx - 9, fy + 26); ctx.closePath(); }), FL('#4a3a2c'), '#20160e', 3, 2.6);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx - 37, fy + 6); ctx.quadraticCurveTo(fx - 28, fy + 34, fx - 17, fy + 48); ctx.moveTo(fx + 37, fy + 6); ctx.quadraticCurveTo(fx + 28, fy + 34, fx + 17, fy + 48); ctx.stroke();
  const m = A.mouth.v;
  ctx.fillStyle = '#0a0503'; ctx.beginPath(); ctx.ellipse(fx, fy + 52, 20, 4 + m * 15, 0, 0, TAU); ctx.fill();
  if (m > .2) { ctx.fillStyle = '#d8ccae'; for (let i = 0; i < 6; i++) { const sx = fx - 15 + i * 6; ctx.beginPath(); ctx.moveTo(sx - 2.5, fy + 48 - m * 9); ctx.lineTo(sx, fy + 56); ctx.lineTo(sx + 2.5, fy + 48 - m * 9); ctx.fill(); } glowPost(fx, fy + 52, 30 * m, '#ff7a1a', m * .6); }
  for (const s of [-1, 1]) { const ex = fx + s * 21, ey = fy - 5; ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.ellipse(ex, ey, 9, 5.5, 0, 0, TAU); ctx.fill(); glowPost(ex, ey, 36 + rage * 18, '#ff9a2a', .95); glowPost(ex, ey, 10, '#ffffff', .8); }
  ctx.restore();
  G.lights.push({ x: fx, y: fy + sink * 460, r: 360, i: .9 * (1 - sink), col: '#ff8a3a' }, { x, y, r: 320, i: .7, col: '#ff7a2a' });
  ctx.restore();
}

/* ---------------- Þrymr: the frost giant, as tall as a hall ---------------- */
/* ---------------- Níðhöggr: the wyrm under the ice ---------------- */
/* ---------------- Surtr at the forge ---------------- */
function drawSurtr(b) {
  const x = b.x, t = b.t, A = b.an, air = A.air.v, y = b.y - air * 620, cr = A.crouch.v * 30, s = b.side;
  const sk = [FL('#b05a3c'), '#5c2418'], sk2 = [FL('#8a3e2a'), '#45180e'], ink = '#0a0302', pants = [FL('#3a2620'), '#160c0a'];
  const a = b.world.arena;
  CEL_LX = 1;
  if (b.phase > 1) {
    ctx.save(); ctx.beginPath(); ctx.arc(a.x, a.y, a.R + 60, 0, TAU); ctx.arc(a.x, a.y, b.lavaR, 0, TAU, true);
    ctx.fillStyle = grad(a.x - a.R, a.y, a.x + a.R, a.y, ['#ff8a2b', '#c23a0c', '#ff6a1a']); ctx.fill('evenodd'); ctx.restore();
    ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(a.x, a.y, b.lavaR, 0, TAU); ctx.stroke();
    ctx.setLineDash([22, 44]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = 'rgba(255,245,200,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, b.lavaR + 20, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + t * .05; G.lights.push({ x: a.x + Math.cos(an) * (b.lavaR + 30), y: a.y + Math.sin(an) * (b.lavaR + 30), r: 200, i: .8, col: '#ff7a2a' }); }
  }
  for (const sw of b.swords) {
    if (!sw.live) continue;
    const ly = sw.y - sw.lift * 46;
    ctx.save(); ctx.translate(sw.x, ly); ctx.rotate(Math.sin(sw.x) * .25);
    bcel(poly([-4, 0, -4, -46, 4, -46, 4, 0]), FL('#d0c8bc'), '#7a7268', 1.4, 1.8, ink);
    bcel(poly([-12, -46, 12, -46, 12, -51, -12, -51]), '#3a241a', '#1a0e08', .6, 1.4, ink);
    bcel(poly([-3, -51, 3, -51, 3, -66, -3, -66]), '#7a3020', '#3a140a', .6, 1.4, ink);
    ctx.restore();
    if (sw.lift > 0) glowPost(sw.x, ly - 34, 36, '#ff7a1a', sw.lift);
  }
  if (!b.anvilBroken) {
    const ax = b.anvil.x, ay = b.anvil.y;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(ax + 14, ay + 8, 150, 34, 0, 0, TAU); ctx.fill();
    bcel(poly([ax - 80, ay, ax - 54, ay - 66, ax + 54, ay - 66, ax + 80, ay]), FL('#5a5450'), '#26221f', 6, 3.4, ink);
    bcel(P_(() => { ctx.moveTo(ax - 150, ay - 66); ctx.quadraticCurveTo(ax - 94, ay - 70, ax - 80, ay - 102); ctx.lineTo(ax + 122, ay - 102); ctx.lineTo(ax + 122, ay - 72); ctx.lineTo(ax - 66, ay - 66); ctx.closePath(); }), FL('#8a8480'), '#3e3936', 5, 3.4, ink);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(ax - 74, ay - 100, 190, 7);
  }
  if (air > .1) { ctx.fillStyle = `rgba(0,0,0,${.5 * air})`; ctx.beginPath(); ctx.ellipse(x, b.y + 6, 190 * (1 - air * .4), 54, 0, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (air < .1) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(x + 30, y + 8, 200, 50, 0, 0, TAU); ctx.fill(); }
  for (const k of [-1, 1]) {
    bcel(P_(() => { ctx.moveTo(x + k * 14, y - 190 + cr); ctx.quadraticCurveTo(x + k * 100, y - 120 + cr, x + k * 86, y - 26); ctx.lineTo(x + k * 28, y - 18); ctx.quadraticCurveTo(x + k * 24, y - 110 + cr, x - k * 30, y - 190 + cr); ctx.closePath(); }), pants[0], pants[1], 8, 3.4, ink);
    bcel(blob(x + k * 60, y - 12, 48, 20), sk2[0], sk2[1], 5, 3.2, ink);
  }
  const ty = y - 190 + cr;
  bcel(poly([x - 104, ty - 14, x + 104, ty - 14, x + 104, ty + 14, x - 104, ty + 14]), FL('#1e100c'), '#0a0403', 2, 3, ink);
  ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(x - 14, ty - 11); ctx.lineTo(x, ty + 11); ctx.lineTo(x + 14, ty - 11); ctx.closePath(); ctx.fill();
  bcel(P_(() => { ctx.moveTo(x - 100, ty - 12); ctx.quadraticCurveTo(x - 168, ty - 170, x - 142, ty - 284); ctx.quadraticCurveTo(x, ty - 340, x + 142, ty - 284); ctx.quadraticCurveTo(x + 168, ty - 170, x + 100, ty - 12); ctx.closePath(); }), grad(x - 160, ty - 300, x + 160, ty, [FL('#a85a40'), sk[0], sk[1]]), sk[1], 18, 3.8, ink);
  ctx.strokeStyle = sk[1]; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 86, ty - 240); ctx.quadraticCurveTo(x - 42, ty - 212, x - 8, ty - 240); ctx.moveTo(x + 86, ty - 240); ctx.quadraticCurveTo(x + 42, ty - 212, x + 8, ty - 240); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,120,40,.65)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 114, ty - 86); ctx.lineTo(x - 86, ty - 142); ctx.lineTo(x - 106, ty - 186); ctx.moveTo(x + 100, ty - 56); ctx.lineTo(x + 120, ty - 128); ctx.stroke();
  // hammer arm and the pale hammer
  const hu = clamp(A.ham.v, -.4, 1), shx = x + 140, shy = ty - 270;
  const hhx = shx + lerp(100, 14, hu), hhy = lerp(ty - 56, ty - 510, hu);
  bcel(P_(() => { ctx.moveTo(shx - 38, shy - 14); ctx.quadraticCurveTo(shx + 86, (shy + hhy) / 2, hhx + 36, hhy); ctx.lineTo(hhx - 30, hhy); ctx.quadraticCurveTo(shx + 14, (shy + hhy) / 2 + 42, shx - 14, shy + 56); ctx.closePath(); }), sk[0], sk[1], 9, 3.6, ink);
  bcel(blob(hhx, hhy, 42, 37), sk2[0], sk2[1], 6, 3.4, ink);
  ctx.strokeStyle = ink; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(hhx, hhy + 28); ctx.lineTo(hhx, hhy - 100); ctx.stroke(); ctx.strokeStyle = FL('#e2dace'); ctx.lineWidth = 7; ctx.stroke();
  bcel(poly([hhx - 58, hhy - 160, hhx + 58, hhy - 160, hhx + 58, hhy - 92, hhx - 58, hhy - 92]), FL('#f2ece2'), '#b0a89c', 6, 3.4, '#3a3430');
  ctx.strokeStyle = 'rgba(60,52,46,.5)'; ctx.lineWidth = 1.6; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(hhx - 50 + k * 4, hhy - 150 + k * 16); ctx.lineTo(hhx + 52 - k * 3, hhy - 152 + k * 17); ctx.stroke(); }
  // sword arm and Lævateinn
  const sv = A.sword.v, lshx = x - 140, lshy = ty - 270;
  const lhx = lshx - 70 + sv * 44, lhy = ty - 86 - Math.abs(sv) * 44;
  bcel(P_(() => { ctx.moveTo(lshx + 38, lshy - 14); ctx.quadraticCurveTo(lshx - 86, lshy + 86, lhx - 32, lhy); ctx.lineTo(lhx + 32, lhy); ctx.quadraticCurveTo(lshx - 14, lshy + 100, lshx + 14, lshy + 56); ctx.closePath(); }), sk[0], sk[1], 9, 3.6, ink);
  const swA = PI * .25 + sv * 1.1;
  ctx.save(); ctx.translate(lhx, lhy); ctx.rotate(swA);
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = grad(0, -24, 0, 24, ['rgba(255,90,20,0)', 'rgba(255,150,50,.85)', 'rgba(255,90,20,0)']); ctx.fillRect(28, -24, 420, 48); ctx.globalCompositeOperation = 'source-over';
  bcel(poly([34, -13, 390, -9, 428, 0, 390, 9, 34, 13]), FL('#ff8a3a'), '#c23a0c', 4, 3.4, '#3a0c04');
  ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(42, 0); ctx.lineTo(404, 0); ctx.stroke();
  bcel(poly([20, -38, 34, -38, 34, 38, 20, 38]), '#2a1610', '#0e0604', 2, 2.6, ink); bcel(poly([-38, -9, 20, -9, 20, 9, -38, 9]), '#3a2016', '#140805', 2, 2.6, ink);
  ctx.restore();
  bcel(blob(lhx, lhy, 38, 32), sk2[0], sk2[1], 5, 3.4, ink);
  glowPost(lhx + Math.cos(swA) * 220, lhy + Math.sin(swA) * 220, 220, '#ff6a1a', .45);
  // head: black hair and horns, and the beard that burns
  const hx = x + s * 8, hy = ty - 336;
  bcel(P_(() => { ctx.moveTo(hx - 70, hy - 14); ctx.quadraticCurveTo(hx - 98, hy + 86, hx - 80, hy + 140); ctx.lineTo(hx + 80, hy + 140); ctx.quadraticCurveTo(hx + 98, hy + 86, hx + 70, hy - 14); ctx.closePath(); }), FL('#1a100c'), '#060302', 5, 3, ink);
  bcel(blob(hx, hy + 8, 51, 57), sk[0], sk[1], 7, 3.4, ink);
  for (const k of [-1, 1]) bcel(P_(() => { ctx.moveTo(hx + k * 38, hy - 28); ctx.quadraticCurveTo(hx + k * 114, hy - 58, hx + k * 130, hy + 14); ctx.quadraticCurveTo(hx + k * 94, hy - 26, hx + k * 42, hy - 6); ctx.closePath(); }), FL('#2a1a14'), '#0a0504', 4, 3, ink);
  bcel(P_(() => { ctx.moveTo(hx - 54, hy - 6); ctx.quadraticCurveTo(hx - 28, hy - 72, hx + 8, hy - 58); ctx.quadraticCurveTo(hx + 48, hy - 72, hx + 54, hy - 6); ctx.quadraticCurveTo(hx, hy - 34, hx - 54, hy - 6); ctx.closePath(); }), FL('#1a100c'), '#060302', 3, 3, ink);
  const fy = hy + 28;
  for (const [col, k] of [['#b8300c', 1], ['#ff7a1e', .76], ['#ffd27a', .48], ['#fff6d0', .22]]) {
    ctx.fillStyle = FL(col);
    ctx.beginPath(); ctx.moveTo(hx - 48 * k, fy);
    for (let i = 0; i <= 12; i++) { const u = i / 12, xx = hx - 48 * k + u * 96 * k, yy = fy + (250 + Math.sin(t * 6 + i * 1.3) * 22) * k * (1 - Math.abs(u - .5) * .9); ctx.lineTo(xx + Math.sin(t * 5 + i) * 6, yy); }
    ctx.lineTo(hx + 48 * k, fy); ctx.quadraticCurveTo(hx, fy + 26, hx - 48 * k, fy); ctx.fill();
  }
  glowPost(hx, fy + 100, 180, '#ff8a2b', .8); glowPost(hx, fy + 70, 70, '#fff0b0', .5);
  for (let i = 0; i < 3; i++) part({ x: hx + rand(-40, 40), y: fy + rand(60, 220), vy: -rand(40, 110), vx: rand(-20, 20), life: rand(.5, 1), type: 'ember', color: '#ffb347', size: rand(1.5, 3.4), add: 1 });
  for (const k of [-1, 1]) { ctx.fillStyle = '#ffe07a'; ctx.beginPath(); ctx.ellipse(hx + k * 20, hy - 2, 7.5, 4.5, 0, 0, TAU); ctx.fill(); glowPost(hx + k * 20, hy - 2, 26, '#ffb347', .95); }
  ctx.restore();
  G.lights.push({ x: hx, y: fy + 80, r: 560, i: 1, col: '#ff8a3a' }, { x: lhx, y: lhy, r: 380, i: .8, col: '#ff6a1a' });
}

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
