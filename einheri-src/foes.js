/* =====================================================================
   FOES — painted puppets for the draugar, the wolves, the witches and
   the trolls, one set of parts per kind, coloured by its realm.
   ===================================================================== */
const FRIG = {};
const Fp = (g, f, c) => fillP(g, pth(f), c);
function rigFoe(kind) {
  if (FRIG[kind]) return FRIG[kind];
  const F = FOES[kind], C = F.C, A = F.arch, S = 3.6, o = { s: S, inkW: 1.4, rim: '#ffe6c8', rimA: .45, ao: .8 };
  const R = {}, P = (box, layers, extra) => paintSprite(Object.assign({}, o, { box, layers }, extra || {}));
  const dk = (c, k = .4) => mix(c, '#000000', k), lt = (c, k = .3) => mix(c, '#ffffff', k);
  if (A === 'grunt') {
    const helm = kind === 'corpse' ? null : mix(C.metal, '#6a4a30', kind === 'emberdraugr' ? .1 : .45);
    R.body = P([-14, -36, 14, -6], [
      ...(kind === 'draugr' || kind === 'corpse' ? [{ draw: g => { Fp(g, P => vell(P, -6, -20, 8, 9.5), '#5e4028'); g.strokeStyle = '#2e1e12'; g.lineWidth = .8; for (const a of [0, 1.1, 2.2]) { g.beginPath(); g.moveTo(-6 + Math.cos(a) * 8, -20 + Math.sin(a) * 9.5); g.lineTo(-6 - Math.cos(a) * 8, -20 - Math.sin(a) * 9.5); g.stroke(); } Fp(g, P => vcirc(P, -6, -20, 2.4), '#8a8478'); }, amp: .5 }] : []),
      { draw: g => { Fp(g, P => vcr(P, [[-7, -25], [-2, -28], [6, -26], [9, -18], [10, -9], [6, -6.4], [2, -8], [-2, -6.2], [-6, -8.4], [-9.6, -6.6], [-9, -14]]), C.cloth);
        g.save(); g.clip(pth(P => vcr(P, [[-7, -25], [-2, -28], [6, -26], [9, -18], [10, -9], [-9.6, -6.6], [-9, -14]]))); g.fillStyle = C.skin2; for (const [x, y] of [[2, -21], [4.5, -16], [-3, -19]]) { g.beginPath(); g.ellipse(x, y, 2.2, 1.2, .3, 0, TAU); g.fill(); } g.strokeStyle = dk(C.skin2, .5); g.lineWidth = .5; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(1, -22 + i * 1.6); g.quadraticCurveTo(3.4, -21 + i * 1.6, 6, -22 + i * 1.6); g.stroke(); } g.restore();
        Fp(g, P => vcr(P, [[-9, -12.6], [0, -11.6], [9.6, -12.8], [9.6, -10.6], [0, -9.6], [-9, -10.6]]), '#3a2a1c'); }, amp: .7, grain: .3 },
      { draw: g => { Fp(g, P => vcr(P, [[-.6, -29], [1.6, -33.4], [6, -34.6], [9.6, -32], [9.8, -27.6], [7.6, -24], [3.4, -23.6], [.2, -25.8]]), C.skin);
        Fp(g, P => { vell(P, 6.4, -29.6, 1.3, 1.1); vell(P, 9, -29.4, .9, 1); }, '#140c0a');
        g.strokeStyle = dk(C.skin, .5); g.lineWidth = .5; g.beginPath(); g.moveTo(5, -25.6); g.lineTo(9, -25.8); g.stroke(); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(5.4 + i, -26.4); g.lineTo(5.4 + i, -25); g.stroke(); } }, amp: .8, h: 1 },
      ...(helm ? [{ draw: g => { Fp(g, P => { vcr(P, [[-1.6, -30.4], [0, -34.6], [4.6, -37], [9.2, -35.2], [10.8, -31], [4.6, -31.6]]); vpoly(P, [[8.6, -31.4], [10, -31.4], [9.8, -27.6], [8.8, -27.6]]); }, helm);
        if (kind === 'frostdraugr') Fp(g, P => { for (let i = 0; i < 4; i++) vpoly(P, [[1 + i * 2.6, -32], [2.4 + i * 2.6, -32], [1.8 + i * 2.6, -27.4 - (i % 2) * 1.6]]); }, '#e8f8ff');
        g.fillStyle = 'rgba(120,60,20,.45)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(1 + hash2(i, 3) * 8, -35 + hash2(i, 4) * 3.6, .7, 0, TAU); g.fill(); } }, amp: .8, h: 2, spec: kind === 'emberdraugr' ? 0 : .5, shine: 14 }]
        : [{ draw: g => { Fp(g, P => { vcr(P, [[-3, -26], [-1.6, -34], [4, -37], [9.6, -34.6], [10.6, -29], [7, -31.6], [2, -30], [.6, -24]]); for (let i = 0; i < 6; i++) vleaf(P, -2 + i * 1.2, -27, PI / 2 + .1, 6 + (i % 3) * 2, 1.4); }, '#2e4038'); }, amp: .6, h: 1.6, grain: .35 }]),
    ]);
    R.leg = P([-3, -1, 5, 12], [{ draw: g => { Fp(g, P => vlimb(P, [[0, 0], [.6, 5], [0, 10]], [4.2, 3.6, 3.2]), C.skin2); Fp(g, P => vcr(P, [[-2, 8.6], [2.2, 8.4], [4.6, 10.4], [4.4, 11.6], [-2.2, 11.6]]), '#2a1e16'); g.strokeStyle = dk(C.cloth, .2); g.lineWidth = .6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-2, 3 + i * 1.6); g.lineTo(2, 4 + i * 1.6); g.stroke(); } }, amp: .8 }]);
    R.arm = P([-2.5, -2.5, 6, 2.5], [{ draw: g => { Fp(g, P => vlimb(P, [[0, 0], [4.4, 0]], [3.2, 2.8]), C.skin); Fp(g, P => vcirc(P, 4.8, 0, 2), C.skin); }, amp: .9 }]);
    const wp = F.wpn;
    R.wpn = wp === 'spear' ? P([-6, -4, 44, 4], [{ draw: g => Fp(g, P => vpoly(P, [[-4, -.8], [34, -.8], [34, .8], [-4, .8]]), '#6a5236'), r: .6 }, { draw: g => Fp(g, P => vcr(P, [[33, -2.4], [38, -1.6], [44, 0], [38, 1.6], [33, 2.4]]), C.metal), r: 1.2, spec: .8, shine: 18 }])
      : wp === 'axe' ? P([-6, -12, 30, 8], [{ draw: g => Fp(g, P => vpoly(P, [[-4, -.9], [25, -.9], [25, .9], [-4, .9]]), '#5e4430'), r: .6 }, { draw: g => Fp(g, P => vcr(P, [[20, -1.8], [23, -1.8], [25, -5], [27, -10], [29, -3], [28.4, 5.4], [25.6, 6], [23.6, 2], [20, 1.8]]), C.metal), r: 1.6, spec: .8, shine: 18 }])
        : P([-6, -4, 30, 4], [{ draw: g => { Fp(g, P => vcr(P, [[2.6, -1.6], [24, -1.2], [27.4, 0], [24, 1.2], [2.6, 1.6]]), C.metal); g.fillStyle = 'rgba(60,40,20,.5)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(8 + i * 5, (i % 2 ? 1 : -1) * 1.4, .8, 0, TAU); g.fill(); } }, r: 1.2, spec: .8, shine: 18 }, { draw: g => { Fp(g, P => vpoly(P, [[1.4, -4], [3, -4], [3, 4], [1.4, 4]]), '#3a2a1a'); Fp(g, P => vpoly(P, [[-3.6, -.8], [1.6, -.8], [1.6, .8], [-3.6, .8]]), '#4a3422'); }, r: .6, h: 1 }]);
  } else if (A === 'beast') {
    const fur = C.fur, f2 = C.fur2;
    R.body = P([-16, -24, 14, -2], [
      { draw: g => { Fp(g, P => { vcr(P, [[-14, -13], [-8, -18], [2, -19], [10, -18], [14, -12], [12, -6], [4, -5.4], [-6, -6.2], [-13, -8]]); fringe(P, [[-12, -16], [-4, -19.6], [4, -20], [10, -18.6]], 10, 5, 2.6, -PI / 2 - .5, .5, 7); }, fur);
        g.save(); g.clip(pth(P => vcr(P, [[-14, -13], [-8, -18], [2, -19], [10, -18], [14, -12], [12, -6], [4, -5.4], [-6, -6.2], [-13, -8]]))); g.fillStyle = f2; g.globalAlpha = .55; g.beginPath(); g.ellipse(0, -16, 12, 3.6, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = dk(fur, .45); g.lineWidth = .6; for (let i = 0; i < 9; i++) { const x = -11 + i * 2.6; g.beginPath(); g.moveTo(x, -16); g.quadraticCurveTo(x - 1, -11, x - 2, -7); g.stroke(); } g.restore(); }, amp: .7, grain: .3 },
    ]);
    R.head = P([-4, -10, 14, 6], [
      { draw: g => { Fp(g, P => { vcr(P, [[-3, -2], [-1, -6.6], [4, -7.4], [7.6, -5], [13, -2.6], [13.4, .4], [8, 2.2], [2, 3.6], [-2.6, 2.4]]); vpoly(P, [[-.4, -5.8], [.6, -10.4], [3, -6.6]]); vpoly(P, [[2.6, -6.6], [4.4, -10.2], [5.4, -6]]); fringe(P, [[-3, -2], [-2.4, 2.4]], 4, 4, 2, PI + .4, .5, 9); }, fur); Fp(g, P => vcirc(P, 12.8, -1.6, 1.2), '#120a08'); }, amp: .8, h: 1 },
    ]);
    R.jaw = P([0, -2, 13, 4], [{ draw: g => { Fp(g, P => vcr(P, [[1, -.6], [12, .4], [11, 2.6], [2, 2.6]]), dk(fur, .2)); Fp(g, P => { vpoly(P, [[7, .4], [7.8, -1.2], [8.6, .4]]); vpoly(P, [[10, .4], [10.6, -.8], [11.2, .4]]); }, '#f2ead8'); }, amp: .7 }]);
    R.tail = P([-14, -4, 1, 4], [{ draw: g => Fp(g, P => { vleaf(P, 0, 0, PI + .2, 14, 5.4, 1.4); }, fur), amp: .7, grain: .3 }]);
    R.leg = P([-2.4, -1, 3, 12], [{ draw: g => { Fp(g, P => vlimb(P, [[0, 0], [.8, 5], [-.4, 9.4], [1.4, 10.6]], [4, 2.8, 2.2, 2.2]), fur); }, amp: .8 }]);
  } else if (A === 'caster') {
    if (kind === 'imp') {
      R.body = P([-14, -22, 14, 8], [
        { draw: g => Fp(g, P => { for (const sd of [-1, 1]) vcr(P, [[sd * 4, -8], [sd * 12, -18], [sd * 14, -10], [sd * 11, -4], [sd * 5, -3]]); }, '#3a120c'), amp: .6 },
        { draw: g => { Fp(g, P => vcr(P, [[-8, -2], [-6, -10], [0, -13], [6, -10], [8, -2], [5, 5], [0, 7], [-5, 5]]), C.robe2); const gr = g.createRadialGradient(0, -3, 1, 0, -3, 10); gr.addColorStop(0, '#ffe2a0'); gr.addColorStop(.6, 'rgba(255,140,60,.4)'); gr.addColorStop(1, 'rgba(120,30,10,0)'); g.fillStyle = gr; g.fill(pth(P => vcr(P, [[-8, -2], [-6, -10], [0, -13], [6, -10], [8, -2], [5, 5], [0, 7], [-5, 5]]))); }, amp: .8, gloss: .8 },
        { draw: g => Fp(g, P => { vpoly(P, [[-4, -11], [-6, -18], [-2, -12]]); vpoly(P, [[3, -12], [6, -18], [4.6, -11]]); }, '#2a0e0a'), r: 1, h: 2 },
      ]);
    } else {
      const hood = kind === 'wight' ? C.robe2 : C.robe;
      R.body = P([-14, -40, 14, 2], [
        { draw: g => { Fp(g, P => { vcr(P, [[0, -38], [-7, -33], [-10, -22], [-12, -6], [-10, -1], [10, -1], [12, -6], [10, -22], [7, -33]]); fringe(P, [[-12, -3], [-4, -1], [4, -1], [12, -3]], 7, 4.4, 3.6, PI / 2, .7, 13); }, C.robe);
          g.strokeStyle = dk(C.robe, .45); g.lineWidth = .7; for (const x of [-6, -2, 3, 7]) { g.beginPath(); g.moveTo(x * .5, -30); g.quadraticCurveTo(x, -16, x * 1.2, -2); g.stroke(); }
          Fp(g, P => vcr(P, [[-10, -18], [0, -16], [10, -18], [10, -15.6], [0, -13.6], [-10, -15.6]]), C.robe2); }, amp: .6, grain: .3 },
        { draw: g => { Fp(g, P => vcr(P, [[0, -40], [-7.6, -34], [-8, -26], [-4, -22], [4, -22], [8, -26], [7.6, -34]]), hood); Fp(g, P => vcr(P, [[1, -34.6], [-3.2, -31], [-2.6, -25.4], [4.4, -25.2], [5.4, -31]]), '#070505'); }, amp: .7, h: 1.4 },
        ...(kind === 'wight' ? [{ draw: g => Fp(g, P => { for (let i = 0; i < 5; i++) vpoly(P, [[-6 + i * 3, -36.6], [-4.4 + i * 3, -36.6], [-5.2 + i * 3, -43 - (i % 2) * 3]]); }, '#effaff'), r: 1, h: 3, spec: .9, shine: 24, inkCol: '#2a5070' }] : []),
        ...(kind === 'drowned' ? [{ draw: g => Fp(g, P => { for (let i = 0; i < 6; i++) vleaf(P, -5 + i * 2, -26, PI / 2 + (i - 2.5) * .08, 12 + (i % 3) * 4, 1.6, (i % 2 ? 1 : -1)); }, '#3e6a44'), amp: .6, h: 2, grain: .35 }] : []),
        ...(kind === 'hag' ? [{ draw: g => { Fp(g, P => vlimb(P, [[-11, 2], [-12.4, -20], [-13.6, -38]], [1.8, 1.6, 1.4]), '#5a4430'); Fp(g, P => vcr(P, [[-16.6, -42], [-13.6, -44.6], [-10.6, -42], [-12, -38.6], [-15, -38.6]]), '#d8ccb4'); Fp(g, P => { vell(P, -14.6, -41.8, .7, .9); vell(P, -12.4, -41.8, .7, .9); }, '#1a120c'); }, amp: .8, h: 2 }] : []),
      ]);
    }
  } else if (A === 'brute') {
    const sk = C.skin, s2 = C.skin2, moss = C.moss;
    R.body = P([-30, -66, 30, -10], [
      { draw: g => { Fp(g, P => vcr(P, [[-22, -40], [-24, -52], [-14, -60], [0, -62], [14, -60], [24, -52], [24, -38], [20, -22], [8, -12], [-8, -12], [-20, -22]]), sk);
        g.save(); g.clip(pth(P => vcr(P, [[-22, -40], [-24, -52], [-14, -60], [0, -62], [14, -60], [24, -52], [24, -38], [20, -22], [8, -12], [-8, -12], [-20, -22]]))); g.fillStyle = s2; g.beginPath(); g.ellipse(3, -24, 15, 11, 0, 0, TAU); g.fill(); g.restore(); },
        amp: .7, bumpAmp: 2.4, bump: g => grooves(g, '#4a4a4a', 1.4, [[-14, -44, -4, -38, 8, -44], [-12, -32, 0, -28, 14, -32], [-20, -50, -18, -40, -22, -30]]) },
      { draw: g => { Fp(g, P => { vcr(P, [[-1, -54], [1, -62], [8, -66], [16, -62], [17.6, -54], [13, -49], [5, -48.6]]); vpoly(P, [[5, -51], [7, -51], [6.4, -56]]); vpoly(P, [[11, -51], [13, -51], [12.4, -56]]); }, sk);
        Fp(g, P => { vpoly(P, [[4.6, -51.4], [6.6, -51.4], [6, -55.6]]); vpoly(P, [[10.6, -51.4], [12.6, -51.4], [12, -55.6]]); }, '#efe6d0'); Fp(g, P => { vell(P, 6.6, -58.4, 1.4, 1); vell(P, 12.6, -58.4, 1.4, 1); }, '#140c08'); }, amp: .8, h: 3 },
      { draw: g => { Fp(g, P => { if (kind === 'thurs') { for (let i = 0; i < 7; i++) vpoly(P, [[-20 + i * 6, -56 + Math.abs(i - 3) * 1.4], [-17 + i * 6, -56 + Math.abs(i - 3) * 1.4], [-18.6 + i * 6, -66 - (i % 2) * 4 + Math.abs(i - 3)]]); }
        else if (kind === 'emberthurs') { for (let i = 0; i < 5; i++) vpoly(P, [[-18 + i * 8, -56], [-14 + i * 8, -56], [-16 + i * 8, -63 - (i % 2) * 3]]); }
        else { for (let i = 0; i < 7; i++) vell(P, -18 + i * 6, -57 + (i % 2) * 2, 4.4, 2.8); for (let i = 0; i < 4; i++) vleaf(P, -16 + i * 9, -55, PI / 2 + .2, 6, 2); } }, moss); },
        amp: .6, h: 4, spec: kind === 'thurs' ? .8 : 0, shine: 20, grain: .35, inkCol: kind === 'thurs' ? '#2a4a6a' : undefined },
    ]);
    R.arm = P([-8, -6, 10, 36], [
      { draw: g => Fp(g, P => vcr(P, [[-6, -4], [4, -5], [7, 6], [5, 20], [6, 28], [-4, 29], [-6, 20], [-7, 6]]), sk), amp: .8 },
      { draw: g => { Fp(g, P => vcr(P, [[-7, 26], [-2, 24], [5, 25], [8, 30], [6, 35], [-1, 36.6], [-7, 34]]), s2); g.strokeStyle = dk(s2, .55); g.lineWidth = .6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-4 + i * 3, 31); g.lineTo(-4 + i * 3, 36); g.stroke(); } }, amp: .8, h: 2 },
    ]);
    R.leg = P([-6, -2, 7, 14], [{ draw: g => { Fp(g, P => vlimb(P, [[0, 0], [.6, 6], [0, 11]], [9, 8, 7.4]), s2); Fp(g, P => { for (let i = 0; i < 3; i++) vell(P, -2.4 + i * 2.6, 12.6, 1.6, 1.2); }, lt(s2, .2)); }, amp: .8 }]);
  }
  return FRIG[kind] = R;
}
function drawFoe(e) {
  const R = rigFoe(e.kind), Cc = e.F.C, fl = e.flash > 0, x = e.x, y = e.y, t = e.t;
  let alpha = 1;
  if (e.dead) alpha = Math.max(0, 1 - e.deadT / .6);
  if (e.state === 'rise') alpha = Math.min(1, e.st / .6);
  const sc = (e.elite ? 1.25 : 1) * 1.1, A = e.arch, side = Math.cos(e.face) < 0 ? -1 : 1;
  ctx.save(); ctx.globalAlpha = alpha;
  dropShadow(ctx, x + 1.5, y + 1, e.r * 1.35, e.r * .5, .85);
  if (e.elite) glowPost(x, y - 22, 46, Cc.eye || Cc.orb, .22 + .1 * Math.sin(t * 4));
  ctx.translate(x, y); ctx.scale(sc * side, sc);
  if (e.state === 'rise') ctx.translate(0, (1 - Math.min(1, e.st / .7)) * 22);
  const pp = (spr, px, py, rot = 0, sx = 1, sy = 1) => { ctx.save(); ctx.translate(px, py); if (rot) ctx.rotate(rot); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy); ctx.drawImage(spr.c, spr.ox, spr.oy, spr.wu, spr.hu); if (fl) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * .75; ctx.drawImage(spr.c, spr.ox, spr.oy, spr.wu, spr.hu); } ctx.restore(); };
  const eyeGlow = (lx, ly, r = 7, a = .7) => glowPost(x + side * lx * sc, y + ly * sc, r, Cc.eye || Cc.orb, a);
  const tele = e.state === 'windup' || e.state === 'crouch' || e.state === 'cast';
  if (A === 'grunt') {
    const mv = Math.hypot(e.vx, e.vy) > 15, st = mv ? Math.sin(e.walk) * .5 : 0;
    pp(R.leg, -2.6, -11.6, st); pp(R.leg, 3, -11.6, -st);
    pp(R.body, 0, mv ? -Math.abs(Math.sin(e.walk)) * .8 : 0);
    let wa = -.9;
    if (e.state === 'windup') wa = -PI * .85 * Math.min(1, e.st / .35) - .2;
    if (e.state === 'strike') wa = .6;
    const fa = Math.atan2(Math.sin(e.face), Math.abs(Math.cos(e.face)));
    const ang = e.state === 'windup' || e.state === 'strike' ? fa + wa : wa, a2 = Math.atan2(Math.sin(ang) * .7, Math.cos(ang));
    pp(R.arm, 5, -21, a2 * .5 + .6); pp(R.wpn, 5 + Math.cos(a2 * .5 + .6) * 4.8, -21 + Math.sin(a2 * .5 + .6) * 4.8, a2);
    eyeGlow(7.6, -29.4);
    if (e.kind === 'emberdraugr') glowPost(x + side * 3 * sc, y - 24 * sc, 16, '#ff6a1a', .45 + .15 * Math.sin(t * 6));
    if (tele) { const k = Math.min(1, e.st / .5); glowPost(x + side * 18 * sc, y - 26 * sc, 10 + k * 16, '#ff4a2a', .4 + k * .5); }
  } else if (A === 'beast') {
    const run = Math.hypot(e.vx, e.vy) > 20, crouch = e.state === 'crouch' ? Math.min(1, e.st / .3) : 0, pounce = e.state === 'pounce';
    const by = crouch * 3 - (pounce ? 4 : 0), ph = e.walk * 1.6, sw = k => run || pounce ? Math.sin(ph + k) * .55 : 0;
    pp(R.leg, 8, -9 + by, sw(0) * (pounce ? 0 : 1) - (pounce ? .9 : 0), 1, .95); pp(R.leg, -9, -9 + by, sw(PI) + (pounce ? .9 : 0), 1, .95);
    pp(R.tail, -13, -14 + by, Math.sin(t * 8) * .25 - (run ? .2 : 0));
    pp(R.body, 0, by, pounce ? -.08 : 0, pounce ? 1.1 : 1, 1);
    pp(R.leg, 10, -8 + by, sw(PI / 2) - (pounce ? 1 : 0)); pp(R.leg, -7, -8 + by, sw(PI * 1.5) + (pounce ? 1 : 0));
    const open = pounce || e.state === 'crouch' ? .45 : e.state === 'strike' ? .5 : 0;
    pp(R.jaw, 11.6, -14 + by + 1.6, open); pp(R.head, 11.6, -14 + by, -crouch * .1);
    if (e.kind === 'emberhound') glowPost(x, y + (-12 + by) * sc, 22, '#ff5a1a', .35);
    eyeGlow(18.6, -17.6 + by, 6, .8);
    ctx.restore(); ctx.save();
    if (e.state === 'crouch') { ctx.translate(x, y); ctx.rotate(e.lock); ctx.fillStyle = hexA('#ff4a2a', .1 + crouch * .14); ctx.fillRect(0, -11, 175, 22); ctx.strokeStyle = hexA('#ff6a3a', .55 * crouch); ctx.lineWidth = 1.6; ctx.setLineDash([9, 6]); ctx.strokeRect(0, -11, 175, 22); ctx.setLineDash([]); }
  } else if (A === 'caster') {
    const fy2 = Math.sin(t * 2.4) * 2.6;
    if (e.kind === 'imp') {
      pp(R.body, 0, -18 + fy2, 0, 1 + Math.sin(t * 9) * .04, 1 - Math.sin(t * 9) * .04);
      glowPost(x, y + (-20 + fy2) * sc, 30, '#ff6a1a', .6); glowPost(x, y + (-30 + fy2) * sc, 16, '#ffd27a', .45 + .3 * Math.sin(t * 9));
      eyeGlow(2.5, -21 + fy2, 6, .9);
    } else {
      pp(R.body, 0, fy2 - 4);
      eyeGlow(.6, -33 + fy2, 5, .9); eyeGlow(3.2, -33 + fy2, 5, .9);
      const ox = 12, oy = fy2 - 22, k = e.state === 'cast' ? Math.min(1, e.st / .6) : .3;
      glowPost(x + side * ox * sc, y + oy * sc, 10 + k * 22, Cc.orb, .4 + k * .5);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ox, oy, 2 + k * 2, 0, TAU); ctx.fill();
    }
  } else if (A === 'brute') {
    const mv = Math.hypot(e.vx, e.vy) > 10, st = mv ? Math.sin(e.walk * .8) * .35 : 0;
    const raise = e.state === 'windup' ? Math.min(1, e.st / .6) : e.state === 'strike' ? 1 - Math.min(1, e.st / .15) : 0;
    pp(R.leg, -9, -14, st); pp(R.leg, 10, -14, -st);
    pp(R.arm, -20, -48, .25 + raise * 2.3 + (mv ? Math.sin(e.walk * .8) * .15 : 0));
    pp(R.body, 0, mv ? -Math.abs(Math.sin(e.walk * .8)) * 1.2 : 0);
    pp(R.arm, 21, -48, -.25 - raise * 2.5 + (mv ? -Math.sin(e.walk * .8) * .15 : 0), -1, 1);
    eyeGlow(9.6, -58.4, 9, .6);
    if (e.kind === 'emberthurs') glowPost(x, y - 34 * sc, 34, '#ff5a1a', .4);
  }
  ctx.restore();
  if (!e.dead && e.hp < e.maxhp && e.state !== 'rise') {
    const w = A === 'brute' ? 40 : 24, yy = y - (A === 'brute' ? 80 : 48) * sc;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2 - 1, yy - 1, w + 2, 4);
    ctx.fillStyle = e.elite ? '#ffb347' : '#d9442e'; ctx.fillRect(x - w / 2, yy, w * Math.max(0, e.hp / e.maxhp), 2);
  }
}
/* paint a realm's foes during the fade, not mid-fight */
function prepFoes(def) { if (def && def.foes) for (const k in def.foes) rigFoe(def.foes[k]); }
