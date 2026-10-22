/* =====================================================================
   ÚTGARÐA-LOKI, the Outer King — and SKRÝMIR, what he really is.
   The king: tall and thin as a birch, a green cloak trimmed with gold,
   a crown of golden antlers, a sly narrow face, long fingers that throw
   green fire. Unmasked: a giant so large that the field you fought on was
   his palm. He looms behind the cliff at the far edge, mossy and grey as a
   mountain, crowned with the same gold, and reaches over the edge to strike.
   ===================================================================== */
function rigUtgard() {
  if (RIGS.utgard) return RIGS.utgard;
  const cloak = '#2e4a30', cloakD = '#1e3220', robe = '#3e6040', skin = '#a8b49a', gold = '#d6b050', ink = '#0a100a';
  const E = { s: 1.5, grain: .1, shade: [.6, .66, .62], lo: .45, edgeA: .22, edgeW: 12, inkW: 2.4, ink, rim: '#8fe36a', rimA: .5, rimDir: [-.3, 1], rimT: .25 };
  const R = {}, P = (pv, box, layers, extra) => softPart(pv, box, layers, Object.assign({}, E, extra || {}));
  const sk = (lines, w = 2, c = ink) => g => sketch(g, lines, w, c);
  const trim = (g, pts, w = 4) => { g.save(); g.strokeStyle = gold; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore(); };
  R.utBody = P([0, -200], [-200, -440, 200, 30], [
    { draw: g => Fb(g, P2 => { vcr(P2, [[-70, -416], [0, -400], [70, -416], [100, -350], [118, -260], [140, -160], [166, -60], [184, 0], [100, 12], [0, 4], [-100, 12], [-184, 0], [-166, -60], [-140, -160], [-118, -260], [-100, -350]]); fringe(P2, [[-180, 0], [-90, 10], [0, 4], [90, 10], [180, 0]], 9, 24, 22, PI / 2, .5, 3); }, cloak), amp: .45,
      bump: g => { g.strokeStyle = '#3a3a3a'; g.lineWidth = 7; g.lineCap = 'round'; for (const x of [-120, -80, 80, 120]) { g.beginPath(); g.moveTo(x * .6, -360); g.quadraticCurveTo(x * .9, -200, x * 1.3, 0); g.stroke(); } }, bumpAmp: 12 },
    { draw: g => Fc(g, [[-34, -360], [34, -360], [44, -200], [54, -20], [0, -6], [-54, -20], [-44, -200]], robe), amp: .4, h: 10 },
    { draw: g => Fb(g, P2 => { vcr(P2, [[-84, -470], [-40, -400], [0, -392], [40, -400], [84, -470], [96, -400], [70, -350], [0, -336], [-70, -350], [-96, -400]]); }, cloakD), amp: .5, h: 16, inkW: 1.1 },
  ], { over: g => { trim(g, [[-34, -356], [-44, -200], [-54, -24]]); trim(g, [[34, -356], [44, -200], [54, -24]]); trim(g, [[-96, -400], [-70, -350], [0, -336], [70, -350], [96, -400]], 3);
    g.fillStyle = gold; for (let i = 0; i < 7; i++) { const y = -320 + i * 40; g.beginPath(); g.moveTo(-10, y); g.lineTo(0, y - 10); g.lineTo(10, y); g.lineTo(0, y + 10); g.closePath(); g.fill(); }
    sk([[[-110, -260], [-130, -150]], [[110, -260], [130, -150]]], 1.8)(g); } });
  R.utHead = P([0, -400], [-150, -580, 150, -360], [
    { draw: g => Fc(g, [[-26, -470], [0, -478], [26, -470], [32, -436], [26, -400], [12, -380], [0, -376], [-12, -380], [-26, -400], [-32, -436]], skin), amp: .55,
      bump: g => { g.fillStyle = '#333'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 12, -440, 8, 5, k * .3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(k * 20, -412, 6, 10, 0, 0, TAU); g.fill(); } g.fillStyle = '#ddd'; g.beginPath(); g.ellipse(0, -452, 26, 5, 0, 0, TAU); g.fill(); }, bumpAmp: 6 },
    { draw: g => Fb(g, P2 => { for (const k of [-1, 1]) vell(P2, k * 12, -440, 5, 2.6, k * .3); }, '#e6ff8a'), r: 1, ink: false, glow: 1 },
    { draw: g => Fb(g, P2 => { // the antler crown: a band, and tines branching up and out
      vcr(P2, [[-30, -470], [0, -480], [30, -470], [30, -460], [0, -466], [-30, -460]]);
      for (const k of [-1, 1]) { vlimb(P2, [[k * 20, -472], [k * 44, -510], [k * 80, -540], [k * 120, -560]], [8, 7, 5, 1.5]); vlimb(P2, [[k * 44, -510], [k * 40, -548], [k * 52, -574]], [5, 4, 1]); vlimb(P2, [[k * 80, -540], [k * 96, -520], [k * 130, -514]], [4, 3, 1]); vlimb(P2, [[k * 10, -474], [k * 16, -500]], [5, 1]); }
    }, gold), amp: .6, h: 14, inkW: .9, spec: .6, lo: .7 },
  ], { over: g => { g.strokeStyle = ink; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, -398); g.quadraticCurveTo(0, -390, 16, -402); g.stroke(); sketch(g, [[[-20, -452], [-6, -448]], [[20, -452], [6, -448]]], 1.4, ink); } });
  R.utArm = P([0, 0], [-30, -30, 200, 30], [ // a sleeve along +x, shoulder at the origin
    { draw: g => Fb(g, P2 => vlimb(P2, [[0, 0], [80, 4], [170, 0]], [34, 40, 46]), cloak), amp: .5 },
  ], { over: g => trim(g, [[150, -22], [174, 0], [150, 22]], 3) });
  R.utHand = P([0, 0], [-20, -50, 90, 50], [ // long fingers fanned along +x
    { draw: g => { Fc(g, [[0, -14], [26, -16], [34, 0], [26, 16], [0, 14]], skin); Fb(g, P2 => { for (let i = 0; i < 4; i++) { const a = (i - 1.5) * .3; vlimb(P2, [[24, 0], [24 + Math.cos(a) * 30, Math.sin(a) * 30], [24 + Math.cos(a * 1.4) * 58, Math.sin(a * 1.4) * 58]], [8, 6, 2]); } vlimb(P2, [[10, -10], [24, -30], [36, -40]], [7, 5, 2]); }, skin); }, amp: .6 },
  ]);
  return RIGS.utgard = R;
}
function rigSkrymir() {
  if (RIGS.skry) return RIGS.skry;
  const skin = '#8f9a7e', skinD = '#6a745c', moss = '#4e6a3a', mossL = '#7a9a5a', cloak = '#2e4a30', gold = '#d6b050', lip = '#5a3a30', ink = '#0e140c';
  const E = { s: .75, grain: .14, grainScale: 1.2, shade: [.58, .64, .6], lo: .42, edgeA: .28, edgeW: 30, inkW: 3.4, ink, rim: '#c8ff8a', rimA: .45, rimDir: [0, -1], rimT: .25, aoR: 20 };
  const R = {}, P = (pv, box, layers, extra) => softPart(pv, box, layers, Object.assign({}, E, extra || {}));
  const sk = (lines, w = 4, c = ink) => g => sketch(g, lines, w, c);
  const bulge = (g, pts, col = '#d4d4d4') => { g.fillStyle = col; for (const [x, y, rx, ry, a] of pts) { g.beginPath(); g.ellipse(x, y, rx, ry, a || 0, 0, TAU); g.fill(); } };
  const mossy = (g, pts, r, seed) => { for (let i = 0; i < 40; i++) { const p = pts[i % pts.length], a = hash2(i, seed) * TAU, d = hash2(seed, i) * r; g.fillStyle = i % 3 ? 'rgba(78,106,58,.6)' : 'rgba(122,154,90,.55)'; g.beginPath(); g.ellipse(p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d * .7, 10 + hash2(i, 3) * 18, 6 + hash2(i, 4) * 10, a, 0, TAU); g.fill(); } };
  /* the shoulders and cloak, behind everything */
  R.body = P([0, 300], [-1060, 80, 1060, 760], [
    { draw: g => Fb(g, P2 => vcr(P2, [[-1040, 760], [-1000, 380], [-860, 220], [-600, 150], [-320, 170], [0, 210], [320, 170], [600, 150], [860, 220], [1000, 380], [1040, 760]]), cloak), amp: .4,
      bump: g => { bulge(g, [[-760, 300, 220, 120, -.2], [760, 300, 220, 120, .2]]); g.strokeStyle = '#3a3a3a'; g.lineWidth = 12; for (const x of [-500, -260, 260, 500]) { g.beginPath(); g.moveTo(x, 200); g.quadraticCurveTo(x * 1.1, 450, x * 1.15, 760); g.stroke(); } }, bumpAmp: 30 },
    { draw: g => Fb(g, P2 => { vcr(P2, [[-420, 140], [-200, 110], [0, 120], [200, 110], [420, 140], [380, 230], [0, 260], [-380, 230]]); fringe(P2, [[-400, 220], [0, 250], [400, 220]], 14, 50, 40, PI / 2, .5, 4); }, moss), amp: .5, h: 20 },
  ], { over: g => { g.save(); g.strokeStyle = gold; g.lineWidth = 9; g.beginPath(); g.moveTo(-1000, 380); g.quadraticCurveTo(-860, 222, -600, 152); g.moveTo(1000, 380); g.quadraticCurveTo(860, 222, 600, 152); g.stroke(); g.restore(); mossy(g, [[-760, 260], [700, 250], [-500, 180]], 90, 2); } });
  /* the great head */
  R.head = P([0, 0], [-440, -480, 440, 300], [
    { draw: g => Fb(g, P2 => vcr(P2, [[-380, -200], [-300, -380], [-120, -460], [120, -460], [300, -380], [380, -200], [420, 40], [360, 200], [260, 120], [300, -60], [200, -300], [0, -340], [-200, -300], [-300, -60], [-260, 120], [-360, 200], [-420, 40]]), moss), amp: .45, lo: .5 },
    ...[-1, 1].map(k => ({ draw: g => Fc(g, [[k * 290, -150], [k * 372, -170], [k * 404, -70], [k * 376, 40], [k * 300, 40]], skin), amp: .5, h: -6,
      bump: g => bulge(g, [[k * 350, -60, 26, 60]], '#333'), bumpAmp: 14 })),
    { draw: g => Fc(g, [[-250, -300], [0, -340], [250, -300], [310, -160], [320, -20], [290, 100], [220, 190], [120, 230], [0, 240], [-120, 230], [-220, 190], [-290, 100], [-320, -20], [-310, -160]], skin), amp: .5,
      bump: g => { bulge(g, [[0, -230, 200, 40], [-180, 0, 80, 50], [180, 0, 80, 50]]); bulge(g, [[-130, -96, 90, 50], [130, -96, 90, 50], [-240, -40, 40, 80], [240, -40, 40, 80], [-200, 120, 60, 60], [200, 120, 60, 60]], '#2e2e2e');
        g.strokeStyle = '#3a3a3a'; g.lineWidth = 10; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-150, -260 - i * 22); g.quadraticCurveTo(0, -280 - i * 22, 150, -260 - i * 22); g.stroke(); } }, bumpAmp: 30 },
    { draw: g => Fc(g, [[-290, -170], [-160, -214], [-40, -184], [0, -154], [40, -184], [160, -214], [290, -170], [276, -126], [150, -150], [40, -128], [0, -108], [-40, -128], [-150, -150], [-276, -126]], skinD), amp: .55, h: 26 },
    { draw: g => Fb(g, P2 => { for (const k of [-1, 1]) vell(P2, k * 130, -94, 74, 34); }, '#0c120a'), r: 6, h: -10, ink: false },
    { draw: g => Fb(g, P2 => { for (const k of [-1, 1]) vell(P2, k * 130, -94, 28, 18); }, '#e6ff8a'), r: 4, h: -8, ink: false, glow: 1 },
    { draw: g => Fc(g, [[-36, -130], [36, -130], [52, -40], [92, 28], [72, 72], [22, 82], [0, 66], [-22, 82], [-72, 72], [-92, 28], [-52, -40]], skin), amp: .65, h: 34,
      bump: g => bulge(g, [[-46, 58, 16, 12], [46, 58, 16, 12]], '#222'), bumpAmp: 10 },
    { draw: g => Fb(g, P2 => { vcr(P2, [[-20, 72], [-120, 82], [-220, 120], [-290, 210], [-240, 196], [-140, 144], [-40, 112], [0, 102], [40, 112], [140, 144], [240, 196], [290, 210], [220, 120], [120, 82], [20, 72]]); }, moss), amp: .55, h: 40,
      bump: g => { g.strokeStyle = '#444'; g.lineWidth = 8; for (const k of [-1, 1]) for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(k * (30 + i * 20), 86 + i * 6); g.quadraticCurveTo(k * (140 + i * 20), 110 + i * 12, k * (260 - i * 10), 196 - i * 6); g.stroke(); } }, bumpAmp: 10 },
  ], { over: g => { mossy(g, [[-260, -260], [240, -280], [-300, 60], [300, 40]], 60, 5); sk([[[-210, -40], [-170, 40]], [[210, -40], [170, 40]], [[-60, -150], [-20, -120]], [[60, -150], [20, -120]]], 4)(g); } });
  R.crown = P([0, -320], [-420, -760, 420, -280], [
    { draw: g => Fb(g, P2 => {
      vcr(P2, [[-260, -290], [0, -330], [260, -290], [262, -262], [0, -300], [-262, -262]]);
      for (const k of [-1, 1]) { vlimb(P2, [[k * 180, -300], [k * 260, -420], [k * 340, -520], [k * 400, -580]], [36, 30, 20, 4]); vlimb(P2, [[k * 260, -420], [k * 240, -540], [k * 270, -640]], [22, 14, 3]); vlimb(P2, [[k * 340, -520], [k * 380, -480], [k * 420, -470]], [14, 8, 2]); vlimb(P2, [[k * 80, -320], [k * 110, -440], [k * 100, -540], [k * 130, -620]], [28, 20, 12, 3]); vlimb(P2, [[k * 110, -440], [k * 170, -470], [k * 200, -520]], [12, 8, 2]); }
      vlimb(P2, [[0, -330], [0, -460], [-14, -560], [6, -680]], [30, 22, 12, 3]);
    }, gold), amp: .6, spec: .5, lo: .62, inkW: 1 },
  ], { rimA: .3 });
  R.jaw = P([0, 150], [-320, 100, 320, 700], [
    { draw: g => Fb(g, P2 => { vcr(P2, [[-270, 180], [0, 160], [270, 180], [310, 320], [270, 480], [170, 600], [0, 670], [-170, 600], [-270, 480], [-310, 320]]); fringe(P2, [[-270, 480], [-170, 600], [0, 670], [170, 600], [270, 480]], 10, 60, 40, PI / 2, .5, 8); }, moss), amp: .45,
      bump: g => { g.strokeStyle = '#444'; g.lineWidth = 12; g.lineCap = 'round'; for (let i = 0; i < 9; i++) { const x = -220 + i * 55; g.beginPath(); g.moveTo(x * .8, 200); g.quadraticCurveTo(x * 1.05, 400, x * .7, 640); g.stroke(); } }, bumpAmp: 14 },
    { draw: g => Fc(g, [[-160, 152], [0, 146], [160, 152], [150, 196], [0, 214], [-150, 196]], lip), amp: .5, h: 14 },
    ...[-1, 1].map(k => ({ draw: g => { Fb(g, P2 => vlimb(P2, [[k * 110, 300], [k * 120, 450], [k * 100, 640]], [46, 40, 20]), mossL); Fb(g, P2 => { vcr(P2, [[k * 90, 420], [k * 150, 420], [k * 150, 452], [k * 90, 452]]); }, gold); }, amp: .55, h: 20, inkW: 1 })),
  ], { over: g => mossy(g, [[-200, 300], [200, 320], [0, 520]], 70, 9) });
  /* a forearm laid along +x (elbow at the origin, wrist at 1000) */
  R.arm = P([0, 0], [-60, -200, 1060, 200], [
    { draw: g => Fb(g, P2 => vlimb(P2, [[0, 0], [320, 14], [680, 4], [1000, 0]], [320, 290, 240, 210]), skin), amp: .45,
      bump: g => { bulge(g, [[260, -40, 200, 70], [600, -20, 160, 50]]); g.strokeStyle = '#3a3a3a'; g.lineWidth = 14; g.beginPath(); g.moveTo(80, 60); g.quadraticCurveTo(500, 90, 980, 40); g.stroke(); }, bumpAmp: 26 },
    { draw: g => Fb(g, P2 => vcr(P2, [[720, -130], [800, -126], [800, 126], [720, 130]]), gold), amp: .5, h: 14, spec: .5, lo: .62 },
  ], { rimDir: [0, -1], over: g => mossy(g, [[200, -60], [480, -40], [900, -50]], 60, 13) });
  /* a hand coming down palm-first: wrist at the top, fingers spread below */
  R.hand = P([0, 0], [-340, -320, 340, 260], [
    { draw: g => Fc(g, [[-120, -300], [120, -300], [180, -160], [200, -40], [150, 30], [0, 50], [-150, 30], [-200, -40], [-180, -160]], skin), amp: .45,
      bump: g => bulge(g, [[-120, -10, 40, 30], [-40, 10, 40, 30], [40, 10, 40, 30], [120, -10, 40, 30], [0, -150, 120, 80]], '#d8d8d8'), bumpAmp: 22 },
    ...[0, 1, 2, 3].map(i => ({ draw: g => { const x = -120 + i * 80, a = PI / 2 + (i - 1.5) * .18; Fb(g, P2 => vlimb(P2, [[x, 10], [x + Math.cos(a) * 90, 10 + Math.sin(a) * 90], [x + Math.cos(a) * 190, 10 + Math.sin(a) * 190]], [84, 70, 54]), skin); }, amp: .5, h: 10 + i, innerInk: true, inkW: .9,
      bump: g => { const x = -120 + i * 80, a = PI / 2 + (i - 1.5) * .18; bulge(g, [[x + Math.cos(a) * 90, 10 + Math.sin(a) * 90, 30, 20]], '#cfcfcf'); }, bumpAmp: 12 })),
    { draw: g => Fb(g, P2 => vlimb(P2, [[-170, -140], [-270, -70], [-310, 30]], [90, 70, 56]), skin), amp: .5, h: 16, innerInk: true, inkW: .9 },
  ], { rimDir: [0, -1], over: g => mossy(g, [[-60, -220], [100, -180]], 50, 17) });
  return RIGS.skry = R;
}
RIGPREP.utgard = () => { rigUtgard(); rigSkrymir(); };
function drawUtgard(b) {
  const A = b.an, t = b.t;
  if (A.rise.v > .01) drawSkrymir(b);
  if (A.fade.v < .02) return;
  const R = rigUtgard();
  const one = (x, y, alpha, real, ph) => {
    ctx.save(); ctx.globalAlpha = alpha * A.fade.v;
    if (real) dropShadow(ctx, x + 14, y + 6, 140, 40, .8);
    const c = A.cast.v, l = A.laugh.v, sway = Math.sin(t * 1.6 + ph) * .02;
    if (!real) ctx.filter = 'hue-rotate(20deg) saturate(1.6) brightness(1.15)';
    // arms: folded close at rest; flung up and out to cast
    for (const k of [-1, 1]) {
      const sx = x + k * 84, sy = y - 330, ang = k > 0 ? lerp(1.9, -.75, c) : lerp(PI - 1.9, PI + .75, c), L = 170;
      rpart(R.utArm, sx, sy, ang + sway);
      const hx = sx + Math.cos(ang + sway) * L, hy = sy + Math.sin(ang + sway) * L;
      rpart(R.utHand, hx, hy, ang + sway + (k > 0 ? -.3 : .3) * c);
      if (c > .2) glowPost(hx + Math.cos(ang) * 30, hy + Math.sin(ang) * 30, 60 * c + 14, '#6aff4a', c * .9);
    }
    rpart(R.utBody, x, y - 200, sway * .5);
    rpart(R.utHead, x + sway * 60, y - 400 - l * 4, sway + Math.sin(t * 9) * .03 * l);
    ctx.filter = 'none'; ctx.restore();
    for (const k of [-1, 1]) glowPost(x + k * 12 + sway * 60, y - 440 - l * 4, real ? 14 : 8, '#e6ff8a', .9 * alpha * A.fade.v);
    glowPost(x, y - 220, 220, '#5aff4a', .1 * alpha * A.fade.v);
  };
  for (const c of b.copies) if (c.live) one(c.x + Math.sin(t * 7 + c.ph) * 2, c.y, .62, false, c.ph);
  one(b.x, b.y, 1, true, 0);
  G.lights.push({ x: b.x, y: b.y - 260, r: 420, i: .7 * A.fade.v, col: '#b0ff8a' });
}
function drawSkrymir(b) {
  const R = rigSkrymir(), A = b.an, t = b.t, f = skryFace(b), r = A.rise.v, a = G.world.arena;
  const x = f.x, y = f.y + (1 - smooth(r)) * 700 + Math.sin(t * .7) * 8, m = A.mouth.v;
  // he stands beyond the cliff: only what rises above the far edge of the field is seen
  ctx.save(); ctx.globalAlpha = Math.min(1, r * 1.6);
  ctx.beginPath(); ctx.rect(a.x - 5000, a.y - 5000, 10000, 10000); ctx.arc(a.x, a.y, a.R * .98, 0, TAU, true); ctx.clip('evenodd');
  rpart(R.body, x, y + 300, Math.sin(t * .5) * .004);
  if (m > .03) { ctx.fillStyle = '#0a0e08'; ctx.beginPath(); ctx.ellipse(x, y + 160 + m * 50, 170, 20 + m * 90, 0, 0, TAU); ctx.fill(); }
  rpart(R.jaw, x, y + 150 + m * 120);
  rpart(R.head, x, y, Math.sin(t * .6) * .01);
  rpart(R.crown, x, y - 320, Math.sin(t * .6) * .01);
  ctx.restore();
  if (m > .2) glowPost(x, y + 170 + m * 60, 220, '#6fb0d8', m * .45);
  for (const k of [-1, 1]) { glowPost(x + k * 130, y - 94, 120, '#e6ff6a', .55 * r); glowPost(x + k * 130, y - 94, 30, '#ffffff', .8 * r); }
  // the hands: hovering high over their mark (a shadow warns), then down on the field
  for (const h of b.hands) {
    const k = h.side < 0 ? A.hL.v : A.hR.v; if (k < .02) continue;
    const hover = h.down ? 0 : (1 - k * .25) * 420 + 160, hx = h.x, hy = h.y - hover;
    dropShadow(ctx, h.x + 30, h.y + 10, h.down ? 330 : 200 + k * 80, h.down ? 110 : 70, h.down ? .9 : .35 + k * .4);
    const sx = x + h.side * 760, sy = y + 280, wx = hx, wy = hy - 240, d = Math.hypot(wx - sx, wy - sy), an = Math.atan2(wy - sy, wx - sx);
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 2);
    rpart(R.arm, sx, sy, an, d / 1000, 1);
    ctx.save(); ctx.translate(hx, hy); ctx.scale(h.side < 0 ? -1 : 1, 1); rpart(R.hand, 0, 0); ctx.restore();
    ctx.restore();
    if (h.rest > 0) glowPost(hx, hy - 40, 200, '#e6ff8a', .2 + .12 * Math.sin(G.t * 8));
  }
  G.lights.push({ x, y: y + 100, r: 900, i: .6 * r, col: '#c8ffb0' });
}
