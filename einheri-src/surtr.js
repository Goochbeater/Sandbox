/* =====================================================================
   SURTR — the Black One, smith of Múspellsheimr, at his anvil.
   A mountain of dark-red muscle seen from above: shoulders like hills,
   a small head sunk between them, black hair swept back into horns, a
   beard that is simply fire. One fist raises a pale hammer; the other
   holds Lævateinn, the glowing sword, across the anvil.
   Body frame: (0,0) between his feet; up is -y. He is authored with the
   hammer on the left and the sword on the right, and mirrored to face.
   ===================================================================== */
const SU = { shH: [-292, -716], elH: [-372, -520], wrH: [-350, -342], shS: [292, -716], elS: [372, -520], wrS: [334, -372], neck: [0, -824], hip: [0, -400] };
function rigSurtr() {
  if (RIGS.surtr) return RIGS.surtr;
  const skin = '#8e4634', skinD = '#6a2e22', hair = '#3a1e18', leather = '#4e2c22', belt = '#2a1812', wrap = '#3a2a24', ink = '#1e0a06', steel = '#b8b0a6', rust = '#7a3020';
  const E = { s: 1.3, grain: .12, grainScale: .7, shade: [.6, .46, .5], lo: .42, edgeA: .26, edgeW: 18, inkW: 2.6, ink, rim: '#ff9a3a', rimA: .7, rimDir: [.3, 1], rimT: .2, aoR: 12 };
  const R = {}, P = (pv, box, layers, extra) => softPart(pv, box, layers, Object.assign({}, E, extra || {}));
  const sk = (lines, w = 2.4, c = ink) => g => sketch(g, lines, w, c);
  const bulge = (g, pts, col = '#d4d4d4') => { g.fillStyle = col; for (const [x, y, rx, ry, a] of pts) { g.beginPath(); g.ellipse(x, y, rx, ry, a || 0, 0, TAU); g.fill(); } };
  /* ---- legs and boots, mostly under the apron ---- */
  R.legs = P([0, -170], [-230, -360, 230, 20], [
    ...[-1, 1].map(k => ({ draw: g => Fb(g, P2 => vlimb(P2, [[k * 96, -350], [k * 126, -250], [k * 136, -160], [k * 128, -60]], [120, 108, 96, 84]), skin), amp: .5,
      bump: g => bulge(g, [[k * 120, -280, 40, 60, k * .2], [k * 136, -170, 26, 20]]), bumpAmp: 12 })),
    ...[-1, 1].map(k => ({ draw: g => { Fb(g, P2 => vlimb(P2, [[k * 132, -130], [k * 130, -70]], [96, 92]), wrap); Fc(g, [[k * 70, -54], [k * 190, -54], [k * 214, -24], [k * 206, 2], [k * 80, 6], [k * 62, -20]], belt); }, amp: .5, h: 8,
      bump: g => { g.strokeStyle = '#3c3c3c'; g.lineWidth = 6; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(k * 86, -128 + i * 18); g.lineTo(k * 178, -118 + i * 18); g.stroke(); } }, bumpAmp: 6 })),
  ]);
  /* ---- the smith's apron and belt ---- */
  R.apron = P(SU.hip, [-240, -440, 240, -140], [
    { draw: g => Fb(g, P2 => { vcr(P2, [[-170, -418], [0, -410], [170, -418], [196, -370], [206, -300], [150, -240], [120, -180], [60, -166], [0, -176], [-60, -166], [-120, -180], [-150, -240], [-206, -300], [-196, -370]]); fringe(P2, [[-150, -230], [-90, -172], [0, -170], [90, -172], [150, -230]], 9, 26, 22, PI / 2, .5, 3); }, leather), amp: .45,
      bump: g => { g.strokeStyle = '#3a3a3a'; g.lineWidth = 7; g.lineCap = 'round'; for (const x of [-120, -50, 30, 110]) { g.beginPath(); g.moveTo(x, -380); g.quadraticCurveTo(x + 10, -290, x - 6, -190); g.stroke(); } }, bumpAmp: 10 },
    { draw: g => Fb(g, P2 => vcr(P2, [[-178, -436], [0, -426], [178, -436], [184, -398], [0, -390], [-184, -398]]), belt), amp: .5, h: 10, inkW: 1.1 },
    { draw: g => { Fb(g, P2 => { vell(P2, 0, -412, 30, 26); }, '#a8742c'); Fb(g, P2 => vell(P2, 0, -412, 16, 13), '#2a1408'); }, r: 6, h: 18, spec: .6, inkW: .9 },
  ], { over: sk([[[-90, -360], [-100, -260]], [[86, -350], [96, -250]]], 2) });
  /* ---- the torso: a wall of muscle, shoulders like hills ---- */
  R.torso = P(SU.hip, [-350, -860, 350, -380], [
    { draw: g => Fc(g, [[-150, -398], [150, -398], [180, -460], [206, -540], [250, -610], [282, -660], [324, -700], [332, -748], [300, -786], [210, -806], [130, -826], [70, -846], [0, -852], [-70, -846], [-130, -826], [-210, -806], [-300, -786], [-332, -748], [-324, -700], [-282, -660], [-250, -610], [-206, -540], [-180, -460]], skin), amp: .45,
      bump: g => { bulge(g, [[-112, -664, 96, 62, .1], [112, -664, 96, 62, -.1], [-290, -726, 50, 56], [290, -726, 50, 56], [-170, -792, 80, 26, .2], [170, -792, 80, 26, -.2]]);
        bulge(g, [[-40, -560, 30, 26], [40, -560, 30, 26], [-40, -506, 28, 24], [40, -506, 28, 24], [-38, -452, 26, 22], [38, -452, 26, 22], [-190, -560, 22, 50, .3], [190, -560, 22, 50, -.3]], '#c4c4c4');
        g.strokeStyle = '#3a3a3a'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -720); g.lineTo(0, -420); g.stroke(); for (const k of [-1, 1]) { g.beginPath(); g.moveTo(k * 20, -604); g.quadraticCurveTo(k * 110, -590, k * 200, -630); g.stroke(); g.beginPath(); g.moveTo(k * 240, -680); g.quadraticCurveTo(k * 270, -620, k * 236, -590); g.stroke(); } }, bumpAmp: 22 },
  ], { macro: .18, over: g => { sk([[[-230, -650], [-214, -600]], [[230, -650], [214, -600]], [[-150, -470], [-120, -430]], [[150, -470], [120, -430]], [[-320, -700], [-300, -680]], [[320, -700], [300, -680]]], 2.4)(g);
    g.strokeStyle = 'rgba(255,120,40,.5)'; g.lineWidth = 2; for (const [x0, y0, x1, y1] of [[-170, -470, -140, -540], [200, -500, 230, -580], [-250, -700, -220, -760]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo((x0 + x1) / 2 + 6, (y0 + y1) / 2); g.lineTo(x1, y1); g.stroke(); } } });
  /* ---- the head, sunk between his shoulders: hair swept back into horns ---- */
  R.head = P(SU.neck, [-200, -940, 200, -760], [
    ...[-1, 1].map(k => ({ draw: g => Fb(g, P2 => vcr(P2, [[k * 40, -890], [k * 110, -900], [k * 168, -876], [k * 190, -830], [k * 176, -790], [k * 156, -818], [k * 140, -850], [k * 96, -856], [k * 54, -846]]), hair), amp: .55, h: 6, inkW: 1.1,
      bump: g => { g.strokeStyle = '#4a4a4a'; g.lineWidth = 5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(k * (50 + i * 8), -884 + i * 8); g.quadraticCurveTo(k * (130 + i * 6), -890 + i * 8, k * (172 - i * 6), -824 + i * 4); g.stroke(); } }, bumpAmp: 8 })),
    { draw: g => Fc(g, [[-60, -890], [0, -904], [60, -890], [74, -850], [70, -808], [50, -782], [0, -774], [-50, -782], [-70, -808], [-74, -850]], skin), amp: .5,
      bump: g => { bulge(g, [[0, -846, 60, 12]], '#e0e0e0'); bulge(g, [[-26, -830, 15, 10], [26, -830, 15, 10]], '#262626'); bulge(g, [[0, -810, 8, 22]], '#d8d8d8'); }, bumpAmp: 12 },
    { draw: g => Fb(g, P2 => vcr(P2, [[-66, -870], [-40, -906], [0, -916], [40, -906], [66, -870], [56, -880], [20, -884], [0, -872], [-20, -884], [-56, -880]]), hair), amp: .5, h: 12, inkW: 1 },
    { draw: g => Fb(g, P2 => { for (const k of [-1, 1]) vell(P2, k * 26, -832, 10, 6, k * -.2); }, '#140604'), r: 2, h: -4, ink: false },
    { draw: g => Fb(g, P2 => { for (const k of [-1, 1]) vell(P2, k * 26, -832, 6, 3.6, k * -.2); }, '#ffe07a'), r: 2, h: -2, ink: false, glow: 1 },
  ], { over: sk([[[-50, -846], [-30, -854], [-10, -846]], [[50, -846], [30, -854], [10, -846]]], 2) });
  /* ---- the beard: fire, hanging from his cheeks to his belly ---- */
  R.beard = P(SU.neck, [-160, -840, 160, -420], [
    { draw: g => { const gr = g.createLinearGradient(0, -820, 0, -450); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(.2, '#ffb030'); gr.addColorStop(.5, '#ff7a18'); gr.addColorStop(.8, '#e0400c'); gr.addColorStop(1, '#a81c06');
      g.fillStyle = gr; const P2 = new Path2D(); vcr(P2, [[-70, -820], [0, -808], [70, -820], [112, -770], [128, -704], [124, -640], [104, -584], [92, -540], [104, -500], [70, -520], [54, -476], [30, -506], [0, -446], [-26, -500], [-52, -470], [-70, -514], [-104, -498], [-94, -540], [-108, -586], [-128, -642], [-130, -706], [-114, -772]]); g.fill(P2); }, amp: .35, glow: .25, lo: .82, inkCol: '#6a1404', inkW: 1 },
  ], { rimA: 0, grain: .05, shade: [.9, .72, .7], over: g => {
    for (let i = 0; i < 26; i++) { const x0 = (hash2(i, 1) - .5) * 190, y0 = -800 + hash2(i, 2) * 70, sway = (hash2(i, 3) - .5) * 40, len = 220 + hash2(i, 5) * 120; g.globalAlpha = .7; inkStroke(g, [[x0, y0], [x0 * 1.05 + sway, y0 + len * .45], [x0 * .7 + sway * 1.6, y0 + len]], 1.8, i % 4 ? '#a02a08' : '#ffe9a8'); }
    g.globalAlpha = 1; } });
  /* ---- arms: hammer arm (left), sword arm (right) ---- */
  for (const [K, sh, el, wr] of [['H', SU.shH, SU.elH, SU.wrH], ['S', SU.shS, SU.elS, SU.wrS]]) {
    const k = Math.sign(sh[0]);
    R['upper' + K] = P(sh, [Math.min(sh[0], el[0]) - 90, sh[1] - 90, Math.max(sh[0], el[0]) + 90, el[1] + 70], [
      { draw: g => Fb(g, P2 => vlimb(P2, [sh, [lerp(sh[0], el[0], .45) + k * 14, lerp(sh[1], el[1], .45)], el], [124, 110, 88]), skin), amp: .5,
        bump: g => bulge(g, [[lerp(sh[0], el[0], .3) + k * 10, lerp(sh[1], el[1], .3), 44, 60, k * .4], [lerp(sh[0], el[0], .6) - k * 16, lerp(sh[1], el[1], .6), 26, 46, k * .3]]), bumpAmp: 14 },
    ], { over: sk([[[sh[0] + k * 40, sh[1] + 40], [el[0] + k * 10, el[1] - 40]]], 2) });
    R['fore' + K] = P(el, [Math.min(el[0], wr[0]) - 80, el[1] - 70, Math.max(el[0], wr[0]) + 80, wr[1] + 50], [
      { draw: g => Fb(g, P2 => vlimb(P2, [el, [lerp(el[0], wr[0], .35) + k * 10, lerp(el[1], wr[1], .35)], wr], [96, 110, 80]), skin), amp: .5,
        bump: g => bulge(g, [[lerp(el[0], wr[0], .3) + k * 12, lerp(el[1], wr[1], .3), 34, 50, k * .2]]), bumpAmp: 12 },
      { draw: g => Fb(g, P2 => vlimb(P2, [[lerp(el[0], wr[0], .55), lerp(el[1], wr[1], .55)], wr], [100, 86]), wrap), amp: .5, h: 8, inkW: 1,
        bump: g => { g.strokeStyle = '#3a3a3a'; g.lineWidth = 5; for (let i = 0; i < 4; i++) { const u = .6 + i * .1, cx = lerp(el[0], wr[0], u), cy = lerp(el[1], wr[1], u); g.beginPath(); g.moveTo(cx - 48, cy - 8); g.lineTo(cx + 48, cy + 8); g.stroke(); } }, bumpAmp: 6 },
    ]);
    R['fist' + K] = P(wr, [wr[0] - 80, wr[1] - 70, wr[0] + 80, wr[1] + 80], [
      { draw: g => Fc(g, [[wr[0] - 54, wr[1] - 30], [wr[0] + 54, wr[1] - 30], [wr[0] + 64, wr[1] + 20], [wr[0] + 44, wr[1] + 62], [wr[0] - 44, wr[1] + 62], [wr[0] - 64, wr[1] + 20]], skinD), amp: .55,
        bump: g => { bulge(g, [0, 1, 2, 3].map(i => [wr[0] - 36 + i * 24, wr[1] + 40, 13, 16])); }, bumpAmp: 10 },
    ], { over: sk([[[wr[0] - 40, wr[1] + 26], [wr[0] + 40, wr[1] + 26]]], 1.8) });
  }
  /* ---- the pale hammer, drawn like chalk on the dark (grip at the origin, head along -y) ---- */
  R.hammer = P([0, 0], [-90, -280, 90, 60], [
    { draw: g => Fb(g, P2 => vlimb(P2, [[0, 50], [0, -200]], [26, 24]), '#d8d0c4'), amp: .4, inkW: .9 },
    { draw: g => Fc(g, [[-80, -270], [80, -270], [86, -250], [86, -186], [80, -170], [-80, -170], [-86, -186], [-86, -250]], '#f4eee4'), amp: .3, h: 12, lo: .78, shade: [.86, .84, .86] },
  ], { rimA: .3, grain: 0, edgeA: .1, over: g => { g.globalAlpha = .7; sketch(g, [[[-78, -264], [78, -262]], [[-80, -178], [80, -176]], [[-60, -250], [60, -246]], [[-30, -230], [70, -226]], [[-70, -206], [30, -200]]], 1.4, '#6a625a'); g.globalAlpha = 1; } });
  /* ---- the anvil, the quench-tub, the swords of the slain ---- */
  R.anvil = P([0, 0], [-300, -230, 320, 60], [
    { draw: g => Fc(g, [[-130, 30], [130, 30], [110, -40], [70, -100], [-70, -100], [-110, -40]], '#4c4844'), amp: .4 },
    { draw: g => Fc(g, [[-210, -100], [180, -110], [290, -150], [300, -170], [190, -186], [-180, -190], [-232, -170], [-226, -130]], '#9a948c'), amp: .35, h: 18,
      bump: g => { g.fillStyle = '#d8d8d8'; g.fillRect(-190, -186, 370, 14); g.strokeStyle = '#555'; g.lineWidth = 3; g.beginPath(); g.moveTo(-80, -170); g.lineTo(-40, -150); g.lineTo(-60, -120); g.stroke(); }, bumpAmp: 6, spec: .3 },
    { draw: g => Fc(g, [[-200, -190], [180, -188], [190, -206], [-190, -210]], '#c8c2b8'), amp: .3, h: 24, lo: .8 },
  ], { rim: '#ffb060', rimA: .5, rimDir: [.6, .2], over: sk([[[-150, -140], [-120, -120]], [[150, -150], [220, -160]]], 1.6) });
  R.tub = P([0, 0], [-140, -120, 140, 40], [
    { draw: g => Fb(g, P2 => { vell(P2, 0, -40, 130, 70); }, '#5a5450'), amp: .5 },
    { draw: g => Fb(g, P2 => vell(P2, 0, -54, 96, 46), '#1e2a30'), r: 4, h: -6, lo: .7, spec: .5, hiT: .9 },
  ], { rim: '#ffb060', rimA: .4, rimDir: [.6, .2] });
  R.blades = [0, 1, 2].map(v => P([0, 0], [-40, -170, 40, 10], [
    { draw: g => Fc(g, [[-9, 0], [9, 0], [10, -110], [0, -126 + v * 6], [-10, -110]].map(p => [p[0] * (1 + v * .15), p[1]]), steel), amp: .5, spec: .4 },
    { draw: g => Fc(g, [[-30 - v * 4, -116], [30 + v * 4, -116], [28, -124], [-28, -124]].map(p => [p[0], p[1] + 2]), '#4a3a30'), r: 3, h: 8, inkW: .8 },
    { draw: g => Fb(g, P2 => vlimb(P2, [[0, -124], [0, -158]], [12, 10]), rust), r: 4, h: 10, inkW: .8 },
    { draw: g => Fb(g, P2 => vell(P2, 0, -162, 10, 8), '#6a5a4a'), r: 4, h: 12, inkW: .8 },
  ], { rimDir: [.6, .2], rimA: .4, over: sk([[[0, -10], [0, -100]]], 1, '#5a5048') }));
  return RIGS.surtr = R;
}
RIGPREP.surtr = () => rigSurtr();
/* Lævateinn, drawn live: it burns. (x,y) is the grip, a the blade's direction */
function drawLaev(x, y, a, glow = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter';
  const hg = ctx.createLinearGradient(0, -46, 0, 46); hg.addColorStop(0, 'rgba(255,90,20,0)'); hg.addColorStop(.5, `rgba(255,140,50,${.5 * glow})`); hg.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = hg; ctx.fillRect(40, -46, 540, 92); ctx.globalCompositeOperation = 'source-over';
  const bl = new Path2D(); bl.moveTo(56, -22); bl.lineTo(500, -16); bl.lineTo(566, 0); bl.lineTo(500, 16); bl.lineTo(56, 22); bl.closePath();
  const bg = ctx.createLinearGradient(0, -22, 0, 22); bg.addColorStop(0, '#b0280a'); bg.addColorStop(.3, '#ff7a24'); bg.addColorStop(.5, '#ffd27a'); bg.addColorStop(.7, '#ff7a24'); bg.addColorStop(1, '#b0280a');
  ctx.fillStyle = FL(bg); ctx.fill(bl); ctx.strokeStyle = '#3a0c04'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.stroke(bl);
  ctx.strokeStyle = 'rgba(255,250,220,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(520, 0); ctx.stroke();
  // the hilt: a black cross-guard curved toward the blade, a wrapped grip, a pommel
  const hl = new Path2D(); hl.moveTo(40, -70); hl.quadraticCurveTo(58, -40, 52, 0); hl.quadraticCurveTo(58, 40, 40, 70); hl.lineTo(56, 74); hl.quadraticCurveTo(76, 40, 70, 0); hl.quadraticCurveTo(76, -40, 56, -74); hl.closePath();
  ctx.fillStyle = '#1e1410'; ctx.fill(hl); ctx.strokeStyle = '#000'; ctx.lineWidth = 2.4; ctx.stroke(hl);
  ctx.fillStyle = '#2a1c16'; ctx.fillRect(-60, -12, 104, 24); ctx.strokeRect(-60, -12, 104, 24);
  ctx.strokeStyle = '#c89a4a'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-54 + i * 16, -12); ctx.lineTo(-46 + i * 16, 12); ctx.stroke(); }
  ctx.fillStyle = '#1e1410'; ctx.beginPath(); ctx.arc(-70, 0, 18, 0, TAU); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke();
  ctx.restore();
}
function drawSurtr(b) {
  const R = rigSurtr(), A = b.an, t = b.t, s = b.side || 1, air = A.air.v, cr = A.crouch.v, ham = A.ham.v, sw = A.sword.v;
  const a = b.world.arena, x = b.x, y = b.y, lift = air * 600, GS = 1;
  // the ring of lava closing in (phase two)
  if (b.phase > 1) {
    ctx.save(); ctx.beginPath(); ctx.arc(a.x, a.y, a.R + 80, 0, TAU); ctx.arc(a.x, a.y, b.lavaR, 0, TAU, true);
    const lg = ctx.createRadialGradient(a.x, a.y, b.lavaR, a.x, a.y, a.R + 80); lg.addColorStop(0, '#ffd27a'); lg.addColorStop(.08, '#ff7a1a'); lg.addColorStop(.5, '#c23a0c'); lg.addColorStop(1, '#5a1404');
    ctx.fillStyle = lg; ctx.fill('evenodd'); ctx.restore();
    ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(a.x, a.y, b.lavaR, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + t * .05; G.lights.push({ x: a.x + Math.cos(an) * (b.lavaR + 40), y: a.y + Math.sin(an) * (b.lavaR + 40), r: 220, i: .8, col: '#ff7a2a' }); }
  }
  // the swords of the slain, planted in a ring
  const blade = (st, i) => { const ly = st.y - st.lift * 60; rpart(R.blades[i % 3], st.x, ly, Math.sin(st.x * .7 + i) * .22); if (st.lift > 0) glowPost(st.x, ly - 80, 60, '#ff7a1a', st.lift); };
  b.swords.forEach((sw2, i) => { if (sw2.live && sw2.y < y) blade(sw2, i); });
  // the quench-tub and the anvil: in front of him while he stands behind it
  const ax = b.anvil.x, ay = b.anvil.y, anvilFront = !b.anvilBroken && y - lift * 0 < ay;
  const drawAnvil = () => { dropShadow(ctx, ax + 50, ay + 26, 360, 90, .8); rpart(R.anvil, ax, ay, 0, 1.4, 1.4); };
  if (!b.anvilBroken) { dropShadow(ctx, ax - 160, ay - 120, 170, 60, .7); rpart(R.tub, ax - 160, ay - 130); if (!anvilFront) drawAnvil(); }
  // shadow: shrinks while he is in the air
  dropShadow(ctx, x + 30, y + 14, 420 * (1 - air * .45), 120 * (1 - air * .45), .9 - air * .4);
  const W = (px, py) => [x + px * s * GS, y + py * GS - lift];
  const gp = (px, py, r, col, al) => { const [wx, wy] = W(px, py); glowPost(wx, wy, r, col, al); };
  ctx.save(); ctx.translate(x, y - lift); ctx.scale(s * GS, GS);
  const crY = cr * 110, br = Math.sin(t * 1.1) * 3;
  rpart(R.legs, 0, -170 + crY * .5, 0, 1, 1 - cr * .25);
  // everything above the hips drops when he crouches
  ctx.translate(0, crY);
  const rot = (v, an) => [v[0] * Math.cos(an) - v[1] * Math.sin(an), v[0] * Math.sin(an) + v[1] * Math.cos(an)];
  const arm = (K, sh, el, wr, a1, a2) => { const e = rot([el[0] - sh[0], el[1] - sh[1]], a1), w = rot([wr[0] - el[0], wr[1] - el[1]], a1 + a2), ep = [sh[0] + e[0], sh[1] + e[1]], wp = [ep[0] + w[0], ep[1] + w[1]];
    rpart(R['upper' + K], sh[0], sh[1], a1); rpart(R['fore' + K], ep[0], ep[1], a1 + a2); return wp; };
  rpart(R.apron, 0, -400);
  if (anvilFront) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); applyCam(); drawAnvil(); ctx.restore(); }
  rpart(R.torso, 0, -400 + br * .3, 0, 1, 1 + br * .002);
  // hammer arm: at rest it hangs; raised (ham 1) the hammer is high overhead; struck (ham < 0) it comes down on the anvil
  const h1 = ham >= 0 ? 1.55 + ham * .95 : 1.55 + ham * 7.4, h2 = ham >= 0 ? 1.15 - ham * .55 : 1.15 + ham * 3.8;
  const hw = arm('H', SU.shH, SU.elH, SU.wrH, h1 + Math.sin(t * 1.1) * .02, h2);
  const hr = h1 + h2;
  rpart(R.hammer, hw[0], hw[1] + 8, hr + PI);
  rpart(R.fistH, hw[0], hw[1], hr);
  // sword arm: back over the shoulder (sword -1), swept across (sword 1), driven down (sword 1.4)
  const s1 = sw >= 0 ? (sw <= 1 ? sw * 1.1 : 1.1 - (sw - 1) * 1.2) : sw * 1.7, s2 = sw >= 0 ? sw * .3 : sw * -.4;
  const sw2 = arm('S', SU.shS, SU.elS, SU.wrS, s1 + Math.sin(t * 1.1 + 1) * .02, s2);
  const sa = .5 + s1 + s2;
  drawLaev(sw2[0], sw2[1] + 10, sa, 1);
  rpart(R.fistS, sw2[0], sw2[1], s1 + s2);
  // the head, and the beard that burns
  rpart(R.head, SU.neck[0], SU.neck[1] + br * .5);
  rpart(R.beard, SU.neck[0], SU.neck[1] + br * .5);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { // live tongues of flame licking up from the beard
    const u = i / 13, bx = lerp(-100, 100, u), by = -500 + Math.abs(u - .5) * 60 + br * .5, L = 60 + 40 * Math.sin(t * 7 + i * 1.7) + 30 * hash2(i, 3);
    const fg = ctx.createLinearGradient(bx, by, bx, by + L); fg.addColorStop(0, 'rgba(255,170,60,.0)'); fg.addColorStop(.3, 'rgba(255,130,40,.38)'); fg.addColorStop(1, 'rgba(200,40,10,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(bx - 18, by); ctx.quadraticCurveTo(bx + Math.sin(t * 5 + i) * 14, by + L * .6, bx + Math.sin(t * 6 + i * 2) * 10, by + L); ctx.quadraticCurveTo(bx + 4, by + L * .4, bx + 18, by); ctx.fill();
  }
  for (let i = 0; i < 9; i++) { // and up past his cheeks
    const k = i % 2 ? 1 : -1, by = -800 + (i >> 1) * 40, bx = k * (90 + (i >> 1) * 14), L = 50 + 30 * Math.sin(t * 8 + i);
    const fg = ctx.createLinearGradient(bx, by, bx, by - L); fg.addColorStop(0, 'rgba(255,190,80,.5)'); fg.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(bx - 14, by); ctx.quadraticCurveTo(bx + Math.sin(t * 6 + i) * 12, by - L * .6, bx + k * 10, by - L); ctx.quadraticCurveTo(bx, by - L * .4, bx + 14, by); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  b.swords.forEach((sw3, i) => { if (sw3.live && sw3.y >= y) blade(sw3, i); });
  // glows
  const [ex, ey] = W(0, -832 + crY); for (const k of [-1, 1]) { glowPost(ex + k * 26 * s, ey, 26, '#ffb347', .95); glowPost(ex + k * 26 * s, ey, 6, '#ffffff', 1); }
  gp(0, -640 + crY, 200, '#ff8a2b', .32); gp(0, -770 + crY, 70, '#fff0b0', .3);
  const tip = rot([520, 0], sa), [sx2, sy2] = W(sw2[0] + tip[0] * .5, sw2[1] + crY + tip[1] * .5); glowPost(sx2, sy2, 280, '#ff6a1a', .5);
  for (let i = 0; i < 2; i++) { const [px, py] = W(rand(-110, 110), rand(-640, -460) + crY); part({ x: px, y: py, vy: -rand(60, 140), vx: rand(-20, 20), life: rand(.5, 1.1), type: 'ember', color: '#ffb347', size: rand(1.5, 3.6), add: 1 }); }
  if (ham > .5) { const [px, py] = W(hw[0], hw[1] + crY); glowPost(px, py - 120, 120, '#fff0d0', (ham - .5) * .6); }
  G.lights.push({ x: W(0, -600)[0], y: W(0, -600 + crY)[1], r: 680, i: .75, col: '#ff8a3a' }, { x: sx2, y: sy2, r: 460, i: .8, col: '#ff6a1a' }, { x: ax, y: ay - 100, r: 380, i: .5, col: '#ffb070' });
}
