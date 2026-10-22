/* =====================================================================
   THE COMPANIONS — painted at the hero's scale (about 46 units tall),
   each a few parts so they breathe, turn to look at Einar, and work.
   ===================================================================== */
const NPCR = {};
function npcPart(key, box, layers, extra) { return NPCR[key] || (NPCR[key] = paintSprite(Object.assign({ s: 5, inkW: 1.3, rim: '#ffd8a8', rimA: .5, ao: .8, box, layers }, extra || {}))); }
/* a head, scaled up about its neck (py) to match the hero's bold proportions */
function nhead(spr, x, y, py, rot = 0, k = 1.25) { ctx.save(); ctx.translate(x, y + py); if (rot) ctx.rotate(rot); ctx.scale(k, k); ctx.translate(0, -py); ctx.drawImage(spr.c, spr.ox, spr.oy, spr.wu, spr.hu); ctx.restore(); }
function npart(spr, x, y, rot = 0, sx = 1, sy = 1) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy); ctx.drawImage(spr.c, spr.ox, spr.oy, spr.wu, spr.hu); ctx.restore(); }
const npcLook = (n, max = .12) => { const d = P ? P.x - n.x : 0; return clamp(d / 160, -1, 1) * max; };
const gtrim = (g, pts, col = '#d6b050', w = .7) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); };

/* ---------------- Hildr: hooded, grey-winged; after the truth, her hair down ---------------- */
function hildrWings(feath) {
  return npcPart('hW' + feath, [-20, -46, 20, 0], [
    ...[-1, 1].map(s => ({ draw: g => Fp(g, P => { vcr(P, [[s * 3, -33], [s * 9, -40], [s * 15, -38], [s * 17, -28], [s * 16, -16], [s * 11, -12], [s * 6, -20]]); }, '#7e7a88'), amp: .7, grain: .2 })),
    ...[-1, 1].map(s => ({ draw: g => Fp(g, P => { // primaries: fewer and more ragged as she weakens
      for (let i = 0; i < feath + 3; i++) { const gap = feath < 4 && i % 3 === 1; if (gap) continue; vleaf(P, s * (16 - i * 1.3), -24 + i * 2.6, PI / 2 + s * (.18 + i * .05), 11 - i * .8, 2.8); } }, '#9c98a6'), amp: .7, h: 1, grain: .2, innerInk: true, inkW: .6 })),
    ...[-1, 1].map(s => ({ draw: g => Fp(g, P => { for (let i = 0; i < 5; i++) vleaf(P, s * (6 + i * 2), -36 + i * 1.2, PI / 2 + s * .3, 6, 2.4); }, '#b6b2c0'), amp: .7, h: 2, innerInk: true, inkW: .5 })),
  ], { rim: '#e8e4f4' });
}
function hildrBody(sit) {
  const gown = '#4c4a5c', gownD = '#363444', skin = '#ecdcd0';
  return npcPart('hB' + sit, [-16, -32, 16, 3], [
    { draw: g => Fp(g, P => sit ? vcr(P, [[-8, -27], [8, -27], [10, -16], [15, -6], [16, -1], [0, 1], [-16, -1], [-15, -6], [-10, -16]]) : vcr(P, [[-7.6, -27.4], [7.6, -27.4], [9.4, -16], [11.4, -4], [12.6, 0], [6, 1.4], [0, .8], [-6, 1.4], [-12.6, 0], [-11.4, -4], [-9.4, -16]]), gown), amp: .7, grain: .25,
      bump: g => grooves(g, '#555', .9, sit ? [[-4, -16, -9, -8, -12, -2], [4, -16, 9, -8, 12, -2], [0, -14, 0, -6, 0, 0]] : [[-3, -18, -5, -9, -7, 0], [3, -18, 5, -9, 7, 0], [0, -15, .5, -7, 0, 0], [-6, -14, -9, -6, -11, 0]]), bumpAmp: 1.2 },
    { draw: g => Fp(g, P => vcr(P, [[-8.2, -19.6], [0, -18.4], [8.2, -19.6], [8, -17.4], [0, -16.4], [-8, -17.4]]), '#2a2834'), r: 1, h: 1 },
    { draw: g => { Fp(g, P => vcirc(P, 0, -18.2, 1.7), '#d6aa48'); Fp(g, P => vcr(P, [[-.6, -16.6], [.6, -16.6], [.9, -10], [-.2, -9.4]]), '#2a2834'); }, r: .8, h: 2, spec: .8, shine: 18 },
    // sleeves and the clasped hands (or hands on her knees, sitting)
    { draw: g => { for (const s of [-1, 1]) Fp(g, P => vlimb(P, sit ? [[s * 7.6, -25], [s * 9.4, -18], [s * 7, -12]] : [[s * 7.4, -25], [s * 8.4, -19], [s * 3, -15.4]], [4.4, 4, 3.6]), gownD);
      Fp(g, P => sit ? (vcirc(P, -6.6, -11.6, 1.7), vcirc(P, 6.6, -11.6, 1.7)) : (vcirc(P, -1.8, -15, 1.7), vcirc(P, 1.8, -15.2, 1.7)), skin); }, amp: .8, h: 2 },
  ], { over: g => { gtrim(g, sit ? [[-16, -1], [0, 1], [16, -1]] : [[-12.6, 0], [-6, 1.4], [0, .8], [6, 1.4], [12.6, 0]]); gtrim(g, [[-7.4, -27], [0, -24.4], [7.4, -27]], '#d6b050', .5); } });
}
function hildrHead(hood) {
  const skin = '#ecdcd0', hair = '#e8dcc0', hoodC = '#3c3a4a';
  return npcPart('hH' + hood, [-9, -42, 9, -24], [
    ...(hood ? [{ draw: g => Fp(g, P => vcr(P, [[-7.4, -25.4], [-8.2, -34], [-5, -39.6], [0, -41.4], [5, -39.6], [8.2, -34], [7.4, -25.4], [4.6, -28], [0, -29], [-4.6, -28]]), hoodC), amp: .7 }] : [
      { draw: g => Fp(g, P => vcr(P, [[-5.8, -34], [-6.2, -28], [-4.6, -25], [4.6, -25], [6.2, -28], [5.8, -34], [0, -37.4]]), hair), amp: .6 }]),
    { draw: g => Fp(g, P => vcr(P, [[-4.2, -34.6], [4.2, -34.6], [4.8, -31.4], [3.8, -28.4], [1.4, -26.8], [-1.4, -26.8], [-3.8, -28.4], [-4.8, -31.4]]), skin), amp: .7, h: 1,
      bump: g => { g.fillStyle = '#444'; g.beginPath(); g.ellipse(-1.8, -31.6, .9, .55, 0, 0, TAU); g.ellipse(1.8, -31.6, .9, .55, 0, 0, TAU); g.fill(); g.fillStyle = '#ccc'; g.beginPath(); g.ellipse(0, -30.4, .5, 1.2, 0, 0, TAU); g.fill(); }, bumpAmp: .5 },
    ...(hood ? [{ draw: g => Fp(g, P => vcr(P, [[-5.6, -33.4], [-4.6, -37], [0, -38.6], [4.6, -37], [5.6, -33.4], [3, -35.6], [0, -36], [-3, -35.6]]), hoodC), amp: .6, h: 2.6 }] : [
      { draw: g => Fp(g, P => { vcr(P, [[-5, -33.4], [-4.4, -37], [0, -38.2], [4.4, -37], [5, -33.4], [2.6, -35.4], [0, -34.6], [-2.6, -35.4]]); }, hair), amp: .6, h: 2 },
      { draw: g => Fp(g, P => vcr(P, [[-4.6, -35.6], [0, -36.8], [4.6, -35.6], [4.6, -35], [0, -36.2], [-4.6, -35]]), '#d6aa48'), r: .5, h: 3, spec: .9, shine: 20 }]),
  ], { over: g => { g.fillStyle = '#ffcf6a'; g.fillRect(-2.5, -31.9, 1.3, .7); g.fillRect(1.2, -31.9, 1.3, .7); g.strokeStyle = '#a07a70'; g.lineWidth = .4; g.beginPath(); g.moveTo(-.9, -28.6); g.quadraticCurveTo(0, -28.2, .9, -28.6); g.stroke();
    if (hood) { g.fillStyle = 'rgba(20,16,30,.3)'; g.beginPath(); g.ellipse(0, -34.4, 4.4, 1.6, 0, 0, TAU); g.fill(); }
    g.strokeStyle = '#6a5a50'; g.lineWidth = .45; g.beginPath(); g.moveTo(-3, -33.2); g.lineTo(-1, -33.6); g.moveTo(3, -33.2); g.lineTo(1, -33.6); g.stroke(); } });
}
function drawHildr(n) {
  const sit = n.sit ? 1 : 0, hood = !S.f.twist ? 1 : 0, feath = S.f.night ? 2 : S.f.twist ? 3 : 4, t = G.t;
  const x = n.x, y = n.y + (sit ? 7 : 0), br = Math.sin(t * 1.6), look = npcLook(n);
  const ruffle = Math.max(0, Math.sin(t * .9 + 2)) ** 12; // now and then the grey wings shiver
  dropShadow(ctx, x, n.y + 1, 14, 5, .8);
  npart(hildrWings(feath), x, y, ruffle * .04 * Math.sin(t * 30), 1 + ruffle * .06, 1);
  npart(hildrBody(sit), x, y, 0, 1, 1 + br * .01);
  if (!hood) { // her braid, over the shoulder, on a spring
    const st = n.st || (n.st = { c: mkChain(5, 3.4, .12, .88, 120) }); stepChain(st.c, [x + 4.6 + look * 10, y - 32], [.25, 1], t, Math.sin(t * 1.3) * 30, 0);
    drawLock(st.c.p, 2.6, 1, '#e8dcc0', '#fff6e0', '#b8a880', '#2a2420', .5);
  }
  nhead(hildrHead(hood), x + look * 6, y + br * .2, -26, look * .6, 1.3);
  glow(x + look * 6, y - 34, 4, '#ffcf6a', .25);
}

/* ---------------- Bjarki the smith: one hand, a red beard, a hammer that never rests ---------------- */
function drawBjarki(n) {
  const x = n.x, y = n.y, t = G.t, sw = Math.max(0, Math.sin(t * 2.2)), skin = '#c9a07a', look = npcLook(n, .08);
  const body = npcPart('bjB', [-18, -40, 18, 3], [
    { draw: g => Fp(g, P => { vlimb(P, [[-5, -14], [-6, 0]], [7.4, 6.4]); vlimb(P, [[5, -14], [6, 0]], [7.4, 6.4]); vcr(P, [[-9, -1.6], [-2, -2.6], [-1, 1.4], [-10, 1.6]]); vcr(P, [[2, -2.6], [9, -1.6], [10, 1.6], [1, 1.4]]); }, '#3a2c22'), amp: .8 },
    { draw: g => Fp(g, P => vcr(P, [[-14, -28], [-12, -38], [12, -38], [14, -28], [13, -12], [0, -10], [-13, -12]]), '#4a4a54'), amp: .7, grain: .2 },
    { draw: g => { Fp(g, P => vcr(P, [[-9.6, -30], [9.6, -30], [10.6, -6], [0, -4], [-10.6, -6]]), '#6a4a2a'); }, r: 4, h: 1, grain: .35,
      bump: g => { g.fillStyle = '#333'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-7 + hash2(i, 2) * 14, -26 + hash2(i, 3) * 18, .7, 0, TAU); g.fill(); } }, bumpAmp: .6 },
    { draw: g => Fp(g, P => vcr(P, [[-14, -14], [14, -14], [14, -11.6], [-14, -11.6]]), '#2a1e16'), r: 1, h: 2 },
    // the stump of his left arm, wrapped, and the right shoulder
    { draw: g => { Fp(g, P => vlimb(P, [[-12, -36], [-15, -28], [-14, -22]], [6.8, 6, 5.6]), skin); Fp(g, P => vcr(P, [[-17, -24.6], [-11, -24.6], [-11, -20.4], [-17, -20.4]]), '#a89a84'); }, amp: .9, h: 2 },
  ], { over: g => { g.strokeStyle = '#3a2614'; g.lineWidth = .6; g.beginPath(); g.moveTo(-9.6, -30); g.lineTo(-12.6, -38); g.moveTo(9.6, -30); g.lineTo(12.6, -38); g.stroke(); gtrim(g, [[-17, -22.6], [-11, -22.6]], '#7a6a54', .4); } });
  const head = npcPart('bjH', [-10, -52, 10, -26], [
    { draw: g => Fp(g, P => vcirc(P, 0, -43, 6.8), skin), amp: .9,
      bump: g => { g.fillStyle = '#444'; g.beginPath(); g.ellipse(-2.6, -43.6, 1, .7, 0, 0, TAU); g.ellipse(2.6, -43.6, 1, .7, 0, 0, TAU); g.fill(); g.fillStyle = '#ddd'; g.beginPath(); g.ellipse(0, -46.4, 4.6, 1, 0, 0, TAU); g.fill(); }, bumpAmp: .8 },
    { draw: g => { Fp(g, P => vcr(P, [[-7.4, -44], [-6, -38.4], [-2.4, -37], [0, -38], [2.4, -37], [6, -38.4], [7.4, -44], [8, -36], [6.4, -30], [3.4, -27.4], [0, -28.6], [-3.4, -27.4], [-6.4, -30], [-8, -36]]), '#b84e24');
      g.strokeStyle = '#7a2e12'; g.lineWidth = .45; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-4.4 + i * 1.5, -37); g.quadraticCurveTo(-4 + i * 1.4, -31, -1.6 + i * .5, -25); g.stroke(); } }, amp: .8, h: 2 },
    { draw: g => { for (const s of [-1, 1]) { Fp(g, P => { for (let i = 0; i < 4; i++) vcirc(P, s * (2 + i * .15), -28.6 + i * 1.6, 1.2 - i * .08); }, '#a8421e'); Fp(g, P => vcirc(P, s * 2.7, -22.4, 1), '#c9a548'); } }, r: .6, h: 3 },
  ], { over: g => { g.fillStyle = '#1a120c'; g.fillRect(-3.2, -44.2, 1.4, 1.1); g.fillRect(1.8, -44.2, 1.4, 1.1); g.strokeStyle = 'rgba(30,60,90,.6)'; g.lineWidth = .5; g.beginPath(); g.moveTo(-3, -49); g.quadraticCurveTo(0, -51, 3, -49); g.moveTo(-2, -48); g.lineTo(2, -48); g.stroke(); } });
  const arm = npcPart('bjA', [-4, -5, 30, 8], [
    { draw: g => Fp(g, P => vlimb(P, [[0, 0], [8, .6], [15, 0]], [7.2, 6, 5.2]), skin), amp: .9 },
    { draw: g => { Fp(g, P => vpoly(P, [[14, -1.1], [26, -1.1], [26, 1.1], [14, 1.1]]), '#5a3e24'); Fp(g, P => vcr(P, [[22, -5.6], [29, -5.6], [29, 5.6], [22, 5.6]]), '#55575c'); }, r: 1.6, h: 2, spec: .8, shine: 16 },
    { draw: g => Fp(g, P => vcirc(P, 15.4, 0, 2.8), skin), amp: .9, h: 3 },
  ]);
  dropShadow(ctx, x, y + 1, 17, 6, .8);
  npart(body, x, y, 0, 1, 1 + Math.sin(t * 1.4) * .008);
  nhead(head, x + look * 4, y - sw * .6, -36, look * .4 + sw * .05, 1.12);
  const a = -1.9 + sw * 1.5; npart(arm, x + 12, y - 36, a);
  if (sw > .97 && Math.random() < .5) { burst(x + 12 + Math.cos(a) * 26, y - 36 + Math.sin(a) * 26, 4, { type: 'spark', color: '#ffd27a', add: 1, smin: 60, smax: 160 }); SFX.tick(); }
}

/* ---------------- Ásta the seer: a blue cloak, a hood of white cat-fur, glass beads, a staff ---------------- */
function drawAsta(n) {
  const x = n.x, y = n.y, t = G.t, look = npcLook(n, .1), br = Math.sin(t * 1.2);
  const body = npcPart('aB', [-18, -40, 18, 6], [
    { draw: g => Fp(g, P => { vcr(P, [[-10, -30], [10, -30], [13, -14], [16, 2], [6, 4], [0, 3], [-6, 4], [-16, 2], [-13, -14]]); fringe(P, [[-15, 3], [0, 4], [15, 3]], 7, 3, 2.4, PI / 2, .3, 4); }, '#2a3a5c'), amp: .7, grain: .25,
      bump: g => grooves(g, '#555', .9, [[-5, -24, -8, -10, -11, 2], [5, -24, 8, -10, 11, 2], [0, -22, 0, -8, 0, 2]]), bumpAmp: 1.2 },
    { draw: g => { Fp(g, P => vcr(P, [[-10.6, -31], [0, -28], [10.6, -31], [9, -26], [0, -24], [-9, -26]]), '#f0eee8'); }, amp: .7, h: 2, grain: .4 },
    { draw: g => { Fp(g, P => { for (let i = 0; i < 9; i++) vcirc(P, -7.6 + i * 1.9, -23.6 + Math.sin(i * .7) * 1.4 + Math.abs(i - 4) * -.3, 1.05); }, '#7fd8c0'); }, r: .7, h: 3, spec: 1, shine: 20, ink: false },
    { draw: g => Fp(g, P => { for (const s of [-1, 1]) vlimb(P, [[s * 9, -27], [s * 10, -20], [s * 6, -14]], [4.2, 3.8, 3.4]); }, '#22304c'), amp: .8, h: 2 },
    { draw: g => Fp(g, P => { vcirc(P, -5.4, -13.6, 2); vcirc(P, 5.4, -13.6, 2); }, '#f0eee8'), amp: .8, h: 3 },
  ], { over: g => { g.fillStyle = 'rgba(160,224,200,.8)'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(-12 + hash2(i, 1) * 24, -18 + hash2(i, 2) * 18, .45, 0, TAU); g.fill(); } } });
  const head = npcPart('aH', [-10, -46, 10, -24], [
    { draw: g => Fp(g, P => vcr(P, [[-4.4, -36], [4.4, -36], [5, -32.6], [3.8, -29.4], [1.2, -28], [-1.2, -28], [-3.8, -29.4], [-5, -32.6]]), '#c8b4a0'), amp: .8,
      bump: g => { g.fillStyle = '#444'; g.beginPath(); g.ellipse(-1.8, -33, .9, .5, 0, 0, TAU); g.ellipse(1.8, -33, .9, .5, 0, 0, TAU); g.fill(); g.strokeStyle = '#555'; g.lineWidth = .3; g.beginPath(); g.moveTo(-3.6, -31); g.lineTo(-2.4, -30); g.moveTo(3.6, -31); g.lineTo(2.4, -30); g.stroke(); }, bumpAmp: .5 },
    { draw: g => Fp(g, P => vcr(P, [[-8.6, -27], [-9.2, -38], [-4, -44], [4, -44], [9.2, -38], [8.6, -27], [5.6, -33.6], [0, -36.8], [-5.6, -33.6]]), '#141c2c'), amp: .7, h: 2 },
    { draw: g => Fp(g, P => { vcr(P, [[-8.6, -27], [-9.2, -38], [-4, -44], [4, -44], [9.2, -38], [8.6, -27], [7.2, -27.6], [7.6, -37], [3.4, -42.4], [-3.4, -42.4], [-7.6, -37], [-7.2, -27.6]]); }, '#f0eee8'), amp: .6, h: 3, grain: .45 },
  ], { over: g => { g.fillStyle = '#9fe0c8'; g.fillRect(-2.5, -33.4, 1.2, .7); g.fillRect(1.3, -33.4, 1.2, .7); g.strokeStyle = '#5a4a40'; g.lineWidth = .4; g.beginPath(); g.moveTo(-3, -34.4); g.lineTo(-1.2, -34.8); g.moveTo(3, -34.4); g.lineTo(1.2, -34.8); g.moveTo(-.8, -29.8); g.lineTo(.8, -29.8); g.stroke(); } });
  const staff = npcPart('aS', [-3, -62, 3, 4], [
    { draw: g => Fp(g, P => vlimb(P, [[0, 4], [.4, -30], [0, -54]], [2.4, 2.2, 2]), '#5a442e'), amp: .9 },
    { draw: g => { Fp(g, P => vcirc(P, 0, -56, 2.8), '#c9a548'); Fp(g, P => { vcr(P, [[-2, -53], [2, -53], [1.6, -50], [-1.6, -50]]); }, '#c9a548'); }, r: 1.2, h: 3, spec: 1, shine: 18 },
  ]);
  dropShadow(ctx, x, y + 1, 15, 5, .8);
  npart(staff, x + 15, y, Math.sin(t * .8) * .02);
  npart(body, x, y - 2, 0, 1, 1 + br * .008);
  nhead(head, x + look * 5, y - 2 + br * .2, -27, look * .5, 1.3);
  const gl = .55 + .25 * Math.sin(t * 2); glow(x + 15, y - 56, 16, '#9fe0c8', gl); glowPost(x + 15, y - 56, 30, '#9fe0c8', gl * .4);
}

/* ---------------- Kolr the skald: a red cap, a lyre, a song that is mostly about himself ---------------- */
function drawKolr(n) {
  const x = n.x, y = n.y, t = G.t, look = npcLook(n, .1), strum = Math.sin(t * 7) * .5 + .5;
  const body = npcPart('kB', [-16, -32, 18, 4], [
    { draw: g => Fp(g, P => { vcr(P, [[-9, -24], [9, -24], [12, -10], [12, -2], [-12, -2], [-12, -10]]); vcr(P, [[-11, -3], [11, -3], [12, 2], [-12, 2]]); }, '#5a3a1a'), amp: .7, grain: .3 },
    { draw: g => Fp(g, P => vcr(P, [[-10, -10], [10, -10], [10, -7], [-10, -7]]), '#2a2a34'), r: 1, h: 1 },
    { draw: g => Fp(g, P => vcr(P, [[-9, -24], [9, -24], [8, -20], [-8, -20]]), '#3a6a3a'), r: 1.4, h: 1.4 },
  ], { over: g => gtrim(g, [[-12, -2], [12, -2]], '#c9a548', .6) });
  const head = npcPart('kH', [-8, -44, 12, -20], [
    { draw: g => Fp(g, P => vcirc(P, 0, -29, 5.4), '#dcb48e'), amp: .8,
      bump: g => { g.fillStyle = '#444'; g.beginPath(); g.ellipse(-2, -29.6, .9, .6, 0, 0, TAU); g.ellipse(2, -29.6, .9, .6, 0, 0, TAU); g.fill(); }, bumpAmp: .5 },
    { draw: g => Fp(g, P => vcr(P, [[-3.2, -25.4], [3.2, -25.4], [2.2, -20.6], [0, -19], [-2.2, -20.6]]), '#6a4a2a'), amp: .6, h: 1.4 },
    { draw: g => Fp(g, P => vcr(P, [[-5.8, -31], [-4, -37], [2, -41.4], [10, -40], [5, -36], [5.8, -31]]), '#a8302a'), amp: .7, h: 2.5 },
  ], { over: g => { g.fillStyle = '#1a120c'; g.fillRect(-2.7, -30.1, 1.4, 1.2); g.fillRect(1.3, -30.1, 1.4, 1.2); g.strokeStyle = '#5a3a1a'; g.lineWidth = .5; g.beginPath(); g.moveTo(-3.2, -31.6); g.lineTo(-1.2, -32.2); g.moveTo(3.2, -31.6); g.lineTo(1.2, -32.2); g.stroke(); g.strokeStyle = '#6a3a20'; g.lineWidth = .5; g.beginPath(); g.moveTo(-2, -26.8); g.quadraticCurveTo(0, -25.6, 2, -26.8); g.stroke(); } });
  const lyre = npcPart('kL', [-1, -20, 14, 1], [
    { draw: g => { Fp(g, P => vcr(P, [[0, -1], [2, -18], [12, -17], [10, -1]]), '#8a6034'); Fp(g, P => vcr(P, [[2.4, -5], [3.4, -15], [9, -14], [7.6, -5]]), '#2a1a0e'); }, amp: .6, h: 2 },
  ], { over: g => { g.strokeStyle = '#e8d8b0'; g.lineWidth = .3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(3.4 + i * 1.2, -15); g.lineTo(3 + i * 1.1, -2); g.stroke(); } } });
  const hand = npcPart('kHd', [-2, -2, 6, 2], [{ draw: g => Fp(g, P => vlimb(P, [[0, 0], [4, 0]], [2.6, 2.4]), '#dcb48e'), amp: .8 }]);
  dropShadow(ctx, x, y + 1, 14, 5, .8);
  npart(body, x, y + 2, 0, 1, 1 + Math.sin(t * 1.5) * .008);
  npart(lyre, x + 4, y - 2, -.12);
  npart(hand, x + 6, y - 12 + strum * 3, -.4 + strum * .3);
  nhead(head, x + look * 4, y + 2 + Math.sin(t * 3.5) * .4, -23, look * .4 + Math.sin(t * 3.5) * .05, 1.35);
  if (Math.random() < .012) part({ x: x + 14, y: y - 30, vy: -20, vx: 10, life: 1.6, type: 'rune', ch: pick('♪♫'), color: '#f0c87a', size: 10 });
}
