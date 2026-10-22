/* =====================================================================
   RIGS — the jötnar as cut-out puppets of painted parts.
   Parts are painted once (paintSprite) around their own pivot, then
   posed every frame with a translate/rotate — the way the old
   hand-drawn games animated their giants.
   ===================================================================== */
const RIGS = {}, RIGPREP = { thrym: () => rigThrym() };
const pth = f => { const P = new Path2D(); f(P); return P; };
const fillP = (g, P, c) => { g.fillStyle = c; g.fill(P); };
/* draw a painted part with its pivot at (x, y) */
function rpart(spr, x, y, rot = 0, sx = 1, sy = 1, a = 1) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  if (a < 1) ctx.globalAlpha = a;
  ctx.drawImage(spr.c, spr.ox, spr.oy, spr.wu, spr.hu);
  if (G.boss && G.boss.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, G.boss.flash * 6) * .55; ctx.drawImage(spr.c, spr.ox, spr.oy, spr.wu, spr.hu); }
  ctx.restore();
}
/* hair, fur and beard: a fringe of pointed locks along a line */
function fringe(P, pts, n, len, w, dir, jit = .3, seed = 1) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? .5 : i / (n - 1), k = t * (pts.length - 1), j = Math.min(pts.length - 2, k | 0), f = k - j;
    const x = lerp(pts[j][0], pts[j + 1][0], f), y = lerp(pts[j][1], pts[j + 1][1], f);
    const a = (typeof dir === 'function' ? dir(t) : dir) + (hash2(seed, i) - .5) * jit, L = len * (.7 + hash2(i, seed) * .55);
    vleaf(P, x, y, a, L, w * (.8 + hash2(seed + 3, i) * .4), (hash2(i, seed + 5) - .5) * w * 1.2);
  }
}
/* grooves in a bump map: the strokes read as carved lines once lit */
function grooves(g, col, lw, segs) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (const s of segs) { g.moveTo(s[0], s[1]); if (s.length === 4) g.lineTo(s[2], s[3]); else g.quadraticCurveTo(s[2], s[3], s[4], s[5]); } g.stroke(); }

/* ---------------------------------------------------------------
   EINAR — horned helm, red cloak, mail and fur, the axe
   --------------------------------------------------------------- */
function rigEinar() {
  if (RIGS.einar) return RIGS.einar;
  const S = 4.2, IW = 1.5, rim = '#ffe2bc', o = { s: S, inkW: IW, rim, rimA: .5, ao: .8 };
  const red = '#a3301f', redD = '#6e1c12', mail = '#9ba3ad', tunic = '#3e4a5e', fur = '#9a7b58', skin = '#e2b48c', beard = '#c99a52', steel = '#aab2bc', horn = '#eee3c8', leather = '#5a3b24', trews = '#4a4038';
  const R = {};
  R.cloak = paintSprite(Object.assign({}, o, { box: [-15, -30, 15, 2], layers: [
    { draw: g => { fillP(g, pth(P => vcr(P, [[-9, -28], [0, -30], [9, -28], [12, -14], [14, 0], [6, 2], [0, -1], [-6, 2], [-14, 0], [-12, -14]])), red);
      g.strokeStyle = 'rgba(60,10,6,.45)'; g.lineWidth = .8; for (const x of [-7, -2, 4, 9]) { g.beginPath(); g.moveTo(x * .7, -26); g.quadraticCurveTo(x, -12, x * 1.1, 0); g.stroke(); }
      g.strokeStyle = '#d8b04a'; g.lineWidth = 1; g.beginPath(); g.moveTo(-14, -.6); g.quadraticCurveTo(0, 1.2, 14, -.6); g.stroke(); }, amp: .5, grain: .2 },
  ] }));
  R.leg = paintSprite(Object.assign({}, o, { box: [-5, -2, 8, 15], layers: [
    { draw: g => { fillP(g, pth(P => vlimb(P, [[0, 0], [.4, 6], [0, 10.5]], [6.4, 5.2, 4.8])), trews);
      g.strokeStyle = '#8a7a62'; g.lineWidth = .7; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-2.6, 5 + i * 1.5); g.lineTo(2.6, 6 + i * 1.5); g.stroke(); } }, amp: .8 },
    { draw: g => fillP(g, pth(P => vcr(P, [[-3, 9.5], [2.5, 9.2], [3.2, 11.6], [7, 12.4], [7.2, 14.4], [-2.8, 14.4], [-3.4, 12]])), leather), amp: .8, h: 1 },
  ] }));
  R.arm = paintSprite(Object.assign({}, o, { box: [-3, -3.5, 15, 3.5], layers: [
    { draw: g => fillP(g, pth(P => vlimb(P, [[0, 0], [7, .4], [12, 0]], [5.4, 4.4, 4])), mail), amp: .8, spec: .4, shine: 14,
      bump: g => { g.fillStyle = '#a8a8a8'; for (let x = 0; x < 8; x += 1.2) for (let y = -2; y <= 2; y += 1.2) { g.beginPath(); g.arc(x + (y * 2 % 2), y, .45, 0, TAU); g.fill(); } }, bumpAmp: .4 },
    { draw: g => fillP(g, pth(P => vcr(P, [[7.5, -2.3], [11.5, -2.1], [11.5, 2.1], [7.5, 2.3]])), leather), r: 1.2, h: .8 },
    { draw: g => fillP(g, pth(P => vcirc(P, 13, 0, 2.4)), skin), amp: .9, h: 1 },
  ] }));
  R.torso = paintSprite(Object.assign({}, o, { box: [-13, -31, 13, -6], layers: [
    { draw: g => fillP(g, pth(P => vcr(P, [[-8.6, -10], [-9.6, -18], [-10.2, -25], [0, -28.5], [10.2, -25], [9.6, -18], [8.6, -10], [0, -7]])), tunic), amp: .7 },
    { draw: g => fillP(g, pth(P => vcr(P, [[-8.6, -14.6], [-9.6, -19], [-9.8, -25], [0, -28], [9.8, -25], [9.6, -19], [8.6, -14.6], [0, -13.2]])), mail), amp: .7, spec: .5, shine: 12, h: .4,
      bump: g => { g.fillStyle = '#a0a0a0'; for (let y = -27; y < -14; y += 1.1) for (let x = -10; x < 10; x += 1.1) { g.beginPath(); g.arc(x + ((y * 10 | 0) % 2) * .55, y, .42, 0, TAU); g.fill(); } }, bumpAmp: .35 },
    { draw: g => { fillP(g, pth(P => vcr(P, [[-9, -15.8], [0, -14.6], [9, -15.8], [8.8, -12.6], [0, -11.6], [-8.8, -12.6]])), '#b0362a'); fillP(g, pth(P => vcr(P, [[-1.8, -15.2], [1.8, -15.2], [1.9, -12.4], [-1.9, -12.4]])), '#e2bb5a'); }, r: 1, h: 1 },
    { draw: g => { const P = pth(P => { vcr(P, [[-12, -24], [-8, -28.6], [0, -29.6], [8, -28.6], [12, -24], [6, -22.4], [0, -23.4], [-6, -22.4]]); fringe(P, [[-12, -24], [-6, -22.2], [0, -23.2], [6, -22.2], [12, -24]], 11, 2.6, 2.4, PI / 2, .6, 4); }); fillP(g, P, fur); }, amp: .7, h: 1.5, grain: .3 },
  ] }));
  R.torsoB = paintSprite(Object.assign({}, o, { box: [-13, -31, 13, -6], layers: [
    { draw: g => fillP(g, pth(P => vcr(P, [[-8.6, -10], [-9.6, -18], [-10.2, -25], [0, -28.5], [10.2, -25], [9.6, -18], [8.6, -10], [0, -7]])), tunic), amp: .7 },
    { draw: g => { const P = pth(P => { vcr(P, [[-12, -24], [-8, -28.6], [0, -29.6], [8, -28.6], [12, -24], [6, -21.4], [0, -21], [-6, -21.4]]); fringe(P, [[-12, -24], [-6, -21.2], [0, -20.8], [6, -21.2], [12, -24]], 11, 2.6, 2.4, PI / 2, .6, 5); }); fillP(g, P, fur); }, amp: .7, h: 1.5, grain: .3 },
  ] }));
  R.cloakB = paintSprite(Object.assign({}, o, { box: [-15, -30, 15, 2], layers: [
    { draw: g => { fillP(g, pth(P => vcr(P, [[-10, -24], [0, -26], [10, -24], [12.5, -12], [14, 0], [6, 1.6], [0, -.6], [-6, 1.6], [-14, 0], [-12.5, -12]])), red);
      g.strokeStyle = 'rgba(60,10,6,.5)'; g.lineWidth = .8; for (const x of [-8, -3, 3, 8]) { g.beginPath(); g.moveTo(x * .6, -23); g.quadraticCurveTo(x, -10, x * 1.15, 0); g.stroke(); }
      g.strokeStyle = '#d8b04a'; g.lineWidth = 1; g.beginPath(); g.moveTo(-14, -.6); g.quadraticCurveTo(0, 1, 14, -.6); g.stroke(); }, amp: .55, grain: .2 },
  ] }));
  R.head = paintSprite(Object.assign({}, o, { box: [-12, -48, 13, -24], layers: [
    { draw: g => fillP(g, pth(P => vcr(P, [[-4.6, -36], [-3.4, -38.6], [1, -39.4], [5, -38], [6.6, -34], [6, -30.6], [2, -28.4], [-3, -29.6], [-5, -32.6]])), skin), amp: .8,
      bump: g => { g.fillStyle = '#c8c8c8'; g.beginPath(); g.ellipse(5.4, -33.6, 1.3, 1.8, .3, 0, TAU); g.fill(); } , bumpAmp: .8 },
    { draw: g => { const P = pth(P => { vcr(P, [[-4.6, -33], [-2, -30.6], [2.6, -31.4], [6.4, -32.6], [6.4, -29], [4, -25.6], [1.2, -24.6], [-2, -26], [-4.6, -29]]); vleaf(P, 1.6, -26, PI / 2 + .1, 6, 2.2); }); fillP(g, P, beard);
      g.strokeStyle = 'rgba(110,70,30,.6)'; g.lineWidth = .45; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-3.6 + i * 1.4, -31.4); g.quadraticCurveTo(-3 + i * 1.4, -28, -1.6 + i * .9, -25.4); g.stroke(); } }, amp: .6, h: .6 },
    { draw: g => fillP(g, pth(P => vcr(P, [[1.1, -21.4], [2.4, -21.4], [2.3, -20.2], [1.2, -20.2]])), '#e2bb5a'), r: .5, h: 2 },
    { draw: g => { fillP(g, pth(P => { vcr(P, [[-6.6, -35.6], [-6, -40.4], [-2, -43.6], [3, -43.6], [6.6, -40.4], [7.2, -35.6], [0, -36.6]]); vpoly(P, [[4.2, -37], [5.8, -37], [5.6, -31.6], [4.4, -31.6]]); }), steel);
      g.strokeStyle = '#d8b04a'; g.lineWidth = .8; g.beginPath(); g.moveTo(-6.4, -36.2); g.quadraticCurveTo(0, -37.6, 7, -36.2); g.stroke(); }, amp: .8, h: 2, spec: .9, shine: 20, gloss: .8 },
    { draw: g => { fillP(g, pth(P => { vlimb(P, [[-4.6, -40], [-9, -42.4], [-10.6, -46.6], [-9.2, -48.6]], [2.8, 2.2, 1.3, .3]); vlimb(P, [[4.6, -40.6], [8.6, -43], [10, -47], [8.8, -49]], [2.8, 2.2, 1.3, .3]); }), horn);
      g.strokeStyle = 'rgba(120,96,60,.6)'; g.lineWidth = .4; for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(sd * (5.6 + i * 1.2), -41 - i * 1.6, 1.1, 0, PI); g.stroke(); } }, amp: .9, h: 2.5 },
  ], over: g => { g.fillStyle = '#1a120c'; g.beginPath(); g.ellipse(2.8, -34.6, .65, .8, 0, 0, TAU); g.fill(); } }));
  R.headB = paintSprite(Object.assign({}, o, { box: [-12, -48, 12, -22], layers: [
    { draw: g => fillP(g, pth(P => { vcr(P, [[-5.4, -36], [-5, -31], [0, -28.6], [5, -31], [5.4, -36], [0, -38]]); vlimb(P, [[0, -30], [.4, -26], [0, -23]], [2.6, 2, 1.2]); }), beard), amp: .7 },
    { draw: g => fillP(g, pth(P => vcr(P, [[-.6, -24.4], [.8, -24.4], [.8, -23.4], [-.6, -23.4]])), '#e2bb5a'), r: .5, h: 2 },
    { draw: g => { fillP(g, pth(P => vcr(P, [[-6.8, -35.4], [-6.2, -40.4], [-2, -43.6], [2, -43.6], [6.2, -40.4], [6.8, -35.4], [0, -36.6]])), steel); g.strokeStyle = '#d8b04a'; g.lineWidth = .8; g.beginPath(); g.moveTo(-6.6, -36); g.quadraticCurveTo(0, -37.4, 6.6, -36); g.stroke(); }, amp: .8, h: 2, spec: .9, shine: 20, gloss: .8 },
    { draw: g => fillP(g, pth(P => { vlimb(P, [[-4.6, -40], [-9, -42.4], [-10.6, -46.6], [-9.2, -48.6]], [2.8, 2.2, 1.3, .3]); vlimb(P, [[4.6, -40], [9, -42.4], [10.6, -46.6], [9.2, -48.6]], [2.8, 2.2, 1.3, .3]); }), horn), amp: .9, h: 2.5 },
  ] }));
  // the axe: grip at the origin, haft along +x, the bearded head at the end
  R.axe = paintSprite(Object.assign({}, o, { box: [-8, -16, 36, 12], layers: [
    { draw: g => { fillP(g, pth(P => vpoly(P, [[-7, -1.25], [30, -1.25], [30, 1.25], [-7, 1.25]])), '#7a5634'); g.strokeStyle = '#3a2412'; g.lineWidth = .5; for (const x of [-4, 22, 25]) { g.beginPath(); g.moveTo(x, -1.3); g.lineTo(x + .8, 1.3); g.stroke(); } }, r: .9, amp: 1 },
    { draw: g => { fillP(g, pth(P => vcr(P, [[25, -2.6], [29.5, -2.6], [32.5, -7], [34.5, -14.4], [37.6, -4], [36.4, 8], [33.4, 10.2], [30.6, 4], [29.4, 2.8], [25, 2.8]])), '#c7ced8');
      g.strokeStyle = '#ffffff'; g.lineWidth = .9; g.beginPath(); g.moveTo(35, -12.6); g.quadraticCurveTo(37, -3, 35.4, 8.4); g.stroke(); }, r: 2.2, amp: .8, spec: 1, shine: 22, gloss: .9 },
  ] }));
  return RIGS.einar = R;
}
