/* =====================================================================
   SKÖGUL — Chooser of the Slain, Queen of the Valkyries.
   Tall as a mast, on wings wider than a longship is long: a winged helm,
   golden braids, a silver breastplate over mail, a blue cloak, a spear
   with a gold head and a white round shield. Her sisters, when they fall
   from the sky, are the same shape drawn in light.
   Frame: (0,0) between her feet; she faces +x and is mirrored to face.
   ===================================================================== */
function rigValk() {
  if (RIGS.valk) return RIGS.valk;
  const steel = '#c8d0da', steelD = '#8a96a6', gold = '#d6b050', blue = '#2a4a8a', white = '#f2eee6', mail = '#7a8494', skin = '#f0d6bc', hair = '#f0c870', ink = '#1e1a16';
  const E = { s: 1.4, grain: .08, shade: [.62, .66, .8], lo: .5, edgeA: .2, edgeW: 12, inkW: 2.4, ink, rim: '#fff2c8', rimA: .5, rimDir: [.4, -1], rimT: .25 };
  const R = {}, P = (pv, box, layers, extra) => softPart(pv, box, layers, Object.assign({}, E, extra || {}));
  const sk = (lines, w = 1.8, c = ink) => g => sketch(g, lines, w, c);
  // a wing, root at the origin, reaching up and back (-x, -y): rows of long primaries under coverts
  // a wing raised up and back from its root: a curved leading edge, long primaries hanging from the hand, secondaries from the arm, coverts over them
  const wing = (dark) => {
    const edge = [[0, 0], [-40, -120], [-110, -250], [-210, -350], [-330, -430], [-440, -470]], pt = u => { const S = crSample(edge, 8), i = Math.min(S.length - 1, Math.round(u * (S.length - 1))); return S[i]; };
    const C = dark ? ['#9a9488', '#b0aa9c', '#c4bead', '#8a8478'] : ['#e8e2d4', '#f4f0e6', '#fffdf6', '#d8d0bc'];
    const feathers = (u0, u1, n, L0, L1, w, a0, a1, col, h) => ({ draw: g => Fb(g, P2 => { for (let i = n - 1; i >= 0; i--) { const u = lerp(u0, u1, i / (n - 1)), [bx, by] = pt(u), a = lerp(a0, a1, i / (n - 1)), L = lerp(L0, L1, i / (n - 1));
      vlimb(P2, [[bx, by], [bx + Math.cos(a) * L * .5, by + Math.sin(a) * L * .5], [bx + Math.cos(a + .06) * L * .92, by + Math.sin(a + .06) * L * .92], [bx + Math.cos(a + .1) * L, by + Math.sin(a + .1) * L]], [w, w * 1.05, w * .8, 3]); } }, col), amp: .4, h, innerInk: true, inkW: .7,
      bump: g => { g.strokeStyle = '#555'; g.lineWidth = 2; for (let i = 0; i < n; i++) { const u = lerp(u0, u1, i / (n - 1)), [bx, by] = pt(u), a = lerp(a0, a1, i / (n - 1)), L = lerp(L0, L1, i / (n - 1)); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a + .05) * L * .9, by + Math.sin(a + .05) * L * .9); g.stroke(); } }, bumpAmp: 3 });
    return P([0, 0], [-780, -640, 140, 330], [
      feathers(.5, 1, 13, 200, 290, 58, 1.7, 2.95, C[0], 0),
      feathers(.04, .56, 13, 150, 210, 60, 1.45, 1.75, C[0], 2),
      feathers(.06, .98, 16, 96, 130, 54, 1.5, 2.6, C[1], 10),
      feathers(.04, .96, 18, 52, 70, 42, 1.55, 2.45, C[2], 18),
      { draw: g => Fb(g, P2 => { const S = crSample(edge, 8); vlimb(P2, S.filter((_, i) => i % 3 === 0), S.filter((_, i) => i % 3 === 0).map((_, i, A) => lerp(46, 10, i / (A.length - 1)))); }, C[3]), amp: .5, h: 24 },
    ], { lo: dark ? .42 : .58, rimA: .4, over: g => { g.strokeStyle = gold; g.lineWidth = 3; g.beginPath(); edge.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); } });
  };
  R.wingNear = wing(false); R.wingFar = wing(true);
  R.cape = P([0, -270], [-150, -300, 60, -20], [
    { draw: g => Fb(g, P2 => { vcr(P2, [[-30, -290], [20, -290], [30, -200], [10, -110], [-30, -40], [-120, -30], [-100, -120], [-70, -220]]); fringe(P2, [[-120, -34], [-80, -36], [-34, -42]], 4, 18, 14, PI / 2, .4, 3); }, blue), amp: .45 },
  ], { over: g => { g.strokeStyle = gold; g.lineWidth = 3; g.beginPath(); g.moveTo(-118, -36); g.lineTo(-30, -44); g.stroke(); } });
  R.body = P([0, -150], [-90, -320, 90, 10], [
    ...[[-20, -36, -6], [24, 40, 36]].map(([hx, kx, fx], i) => ({ draw: g => { Fb(g, P2 => vlimb(P2, [[hx, -150], [kx, -80], [fx, -6]], [34, 28, 24]), i ? steel : steelD); Fc(g, [[fx - 14, -14], [fx + 22, -14], [fx + 28, 4], [fx - 14, 4]], '#5a4a3a'); }, amp: .5, h: i * 6, spec: .4 })),
    { draw: g => Fb(g, P2 => { vcr(P2, [[-40, -186], [40, -186], [52, -130], [60, -76], [-60, -76], [-52, -130]]); fringe(P2, [[-60, -78], [0, -76], [60, -78]], 7, 12, 14, PI / 2, .3, 5); }, mail), amp: .4, h: 8,
      bump: g => { g.fillStyle = '#3a3a3a'; for (let y = -180; y < -80; y += 8) for (let x = -56; x < 56; x += 8) { g.beginPath(); g.arc(x + (y / 8 % 2) * 4, y, 1.6, 0, TAU); g.fill(); } }, bumpAmp: 3 },
    { draw: g => Fc(g, [[-18, -184], [18, -184], [26, -110], [22, -60], [-22, -60], [-26, -110]], white), amp: .35, h: 14 },
    { draw: g => Fc(g, [[-40, -186], [40, -186], [52, -240], [60, -282], [30, -296], [-30, -296], [-60, -282], [-52, -240]], steel), amp: .5, h: 18, spec: .7, hiT: .9,
      bump: g => { g.fillStyle = '#e0e0e0'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 22, -256, 18, 16, 0, 0, TAU); g.fill(); } }, bumpAmp: 10 },
    { draw: g => Fb(g, P2 => vcr(P2, [[-40, -192], [40, -192], [44, -180], [-44, -180]]), gold), amp: .5, h: 22, spec: .5 },
  ], { over: g => { g.strokeStyle = gold; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-18, -184); g.lineTo(-26, -110); g.lineTo(-22, -62); g.moveTo(18, -184); g.lineTo(26, -110); g.lineTo(22, -62); g.moveTo(-30, -294); g.quadraticCurveTo(0, -270, 30, -294); g.stroke(); sk([[[-50, -230], [-44, -200]], [[50, -230], [44, -200]]])(g); } });
  R.head = P([6, -300], [-60, -400, 70, -270], [
    { draw: g => Fb(g, P2 => vcr(P2, [[-24, -330], [-30, -300], [-20, -276], [-36, -282], [-40, -310]]), hair), amp: .5 },
    { draw: g => Fc(g, [[-12, -330], [20, -334], [30, -316], [28, -296], [14, -282], [0, -282], [-10, -296]], skin), amp: .5,
      bump: g => { g.fillStyle = '#333'; g.beginPath(); g.ellipse(14, -312, 5, 3, 0, 0, TAU); g.fill(); g.fillStyle = '#ddd'; g.beginPath(); g.ellipse(26, -306, 4, 8, 0, 0, TAU); g.fill(); }, bumpAmp: 4 },
    { draw: g => Fb(g, P2 => vcr(P2, [[-26, -320], [-20, -348], [6, -360], [30, -350], [36, -326], [20, -330], [0, -334], [-16, -322]]), steel), amp: .55, h: 10, spec: .7 },
    ...[-1, 1].map(k => ({ draw: g => Fb(g, P2 => { for (let i = 0; i < 4; i++) vlimb(P2, [[-6 + k * 4, -350], [-24 - i * 8 + k * 6, -372 - i * 10], [-40 - i * 12 + k * 8, -384 - i * 12]], [10 - i, 7 - i, 1.5]); }, k > 0 ? white : '#d0c8b8'), amp: .5, h: k > 0 ? 16 : 4, inkW: .8 })),
  ], { over: g => { g.fillStyle = blue; g.fillRect(12, -314, 6, 3); g.strokeStyle = gold; g.lineWidth = 2; g.beginPath(); g.moveTo(-24, -324); g.quadraticCurveTo(6, -336, 34, -328); g.stroke(); } });
  R.spear = P([0, 0], [-160, -20, 360, 20], [ // along +x, grip at the origin
    { draw: g => Fb(g, P2 => vlimb(P2, [[-150, 0], [300, 0]], [8, 8]), '#9a7444'), amp: .4, inkW: .9 },
    { draw: g => Fc(g, [[296, -12], [350, 0], [296, 12], [286, 0]], gold), amp: .5, h: 6, spec: .7 },
    { draw: g => Fb(g, P2 => vcr(P2, [[280, -8], [292, -8], [292, 8], [280, 8]]), gold), r: 3, h: 8 },
  ]);
  R.shield = P([0, 0], [-70, -70, 70, 70], [
    { draw: g => Fb(g, P2 => vell(P2, 0, 0, 62, 62), white), amp: .25 },
    { draw: g => Fb(g, P2 => vell(P2, 0, 0, 18, 18), gold), amp: .7, h: 10, spec: .7 },
  ], { over: g => { g.strokeStyle = gold; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.stroke(); g.strokeStyle = blue; g.lineWidth = 3; for (let i = 0; i < 4; i++) { const a = i * PI / 2 + .3; g.beginPath(); g.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); g.lineTo(Math.cos(a) * 52, Math.sin(a) * 52); g.stroke(); } } });
  R.arm = P([0, 0], [-14, -14, 90, 14], [{ draw: g => { Fb(g, P2 => vlimb(P2, [[0, 0], [44, 2], [84, 0]], [22, 18, 16]), steel); Fb(g, P2 => vell(P2, 86, 0, 11, 10), skin); }, amp: .5, spec: .5 }]);
  return RIGS.valk = R;
}
RIGPREP.skogul = () => rigValk();
/* one valkyrie: k = scale (1 is the queen, 360 tall), flap = wing phase, side = facing */
function drawValkyrie(x, y, k, flap, side, fl, ghost, spear = 0, shield = 0, st = null) {
  const R = rigValk(), fa = Math.sin(flap) * .38;
  if (st) for (let i = 0; i < 2; i++) { // golden braids on springs, swinging out behind her
    const c = st.braids[i]; stepChain(c, [x + (-20 + i * 8) * k * side, y - 312 * k], [-.35 * side, 1], st.t, -side * 260 + Math.sin(st.t * 3 + i) * 180, 0);
    drawLock(c.p, 20 * k, 8 * k, FL('#e8bc5c'), '#ffe39a', '#b08030', '#1e1a16', 2);
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(k * side, k);
  if (ghost) { ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'sepia(1) saturate(3) brightness(1.1)'; }
  rpart(R.wingFar, 10, -268, .35 + fa * .8, .85, .85);
  rpart(R.cape, -4, -270, Math.sin(flap * .5) * .05);
  rpart(R.body, 0, -150);
  const sa = -PI / 2 + .35 + spear * 1.75; // spear: upright at rest, levelled to thrust
  rpart(R.arm, 34, -272, sa * .6 + .6);
  rpart(R.spear, 34 + Math.cos(sa * .6 + .6) * 86, -272 + Math.sin(sa * .6 + .6) * 86, sa);
  rpart(R.head, 6, -300);
  rpart(R.wingNear, -10, -262, -.1 - fa, .85, .85);
  rpart(R.arm, -30, -270, PI - .8 - shield * .6);
  rpart(R.shield, -64 - shield * 30, -214 - shield * 20);
  ctx.filter = 'none'; ctx.restore();
  if (!ghost) glowPost(x, y - 200 * k, 160 * k, '#ffe6a0', .3);
}
function drawSkogul(b) {
  const A = b.an, z = A.z.v;
  dropShadow(ctx, b.x + 10, b.y + 4, 150 - Math.min(1, z / 700) * 60, 44 - Math.min(1, z / 700) * 18, .7 * (1 - Math.min(1, z / 700) * .6));
  if (z > 650) return;
  const st = b.vst || (b.vst = { t: 0, braids: [0, 1].map(() => mkChain(4, 36, .08, .9, 300)) }); st.t = b.t;
  drawValkyrie(b.x, b.y - z - 20 - Math.sin(b.t * 2) * 8, 1, b.t * (A.wing.v > .5 ? 14 : 4), Math.cos(b.face) < 0 ? -1 : 1, b.flash > 0, false, A.spear.v, A.shield.v, st);
  G.lights.push({ x: b.x, y: b.y - z - 220, r: 520, i: .85, col: '#fff0c8' });
}
