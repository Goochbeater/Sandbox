/* =====================================================================
   THÓRR'S SPECTRE — the golden ghost of the Thunderer, summoned by the
   rune: a translucent giant of light, red-haired and red-bearded, who
   raises Mjölnir and brings it down where the hero aims.
   Thor frame: (0,0) is the bottom of his belly; up is -y.
   ===================================================================== */
const TH = { shR: [168, -246], fistR: [240, -392], shL: [-168, -246], hamRot: 1.35 };
function rigThor() {
  if (RIGS.thor) return RIGS.thor;
  const body = '#8a4416', fur = '#6a3412', hair = '#7a2410', gold = '#ffd060', ham = '#c88a20';
  const E = { s: 1.2, soft: 1, shade: [.7, .5, .4], lo: .55, edgeA: -.7, edgeW: 14, inkW: 3, ink: gold, ao: .2, grain: .06 };
  const R = {}, P = (pv, box, layers, extra) => softPart(pv, box, layers, Object.assign({}, E, extra || {}));
  const gl = (lines, w = 2.2) => g => sketch(g, lines, w, gold, .9);
  R.body = P([0, 0], [-280, -380, 280, 40], [
    { draw: g => Fb(g, P2 => { vcr(P2, [[-250, -250], [-226, -320], [-140, -356], [0, -366], [140, -356], [226, -320], [250, -250], [200, -232], [0, -290], [-200, -232]]); fringe(P2, [[-250, -256], [-226, -322], [-140, -356], [0, -366], [140, -356], [226, -322], [250, -256]], 8, 44, 34, -PI / 2, .9, 9); }, fur), amp: .5 },
    { draw: g => Fc(g, [[-60, 20], [-130, 0], [-168, -60], [-182, -140], [-196, -200], [-214, -238], [-200, -278], [-120, -296], [-40, -304], [40, -304], [120, -296], [200, -278], [214, -238], [196, -200], [182, -140], [168, -60], [130, 0], [60, 20]], body), amp: .5,
      bump: g => { g.fillStyle = '#cfcfcf'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 72, -222, 66, 42, k * -.12, 0, TAU); g.fill(); g.beginPath(); g.ellipse(k * 190, -250, 36, 44, 0, 0, TAU); g.fill(); } for (let i = 0; i < 3; i++) for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 28, -146 + i * 36, 24, 15, 0, 0, TAU); g.fill(); } }, bumpAmp: 16 },
  ], { over: gl([[[-130, -250], [-70, -184], [-10, -222]], [[130, -250], [70, -184], [10, -222]], [[0, -180], [0, -30]], [[-44, -128], [44, -128]], [[-40, -92], [40, -92]], [[-160, -150], [-130, -80]], [[160, -150], [130, -80]], [[-200, -220], [-176, -200]], [[200, -220], [176, -200]]]) });
  R.head = P([0, -300], [-270, -450, 130, -190], [
    { draw: g => Fb(g, P2 => vcr(P2, [[-40, -424], [20, -440], [72, -420], [84, -392], [40, -402], [-20, -398], [-80, -384], [-150, -372], [-220, -334], [-262, -296], [-210, -340], [-250, -344], [-176, -386], [-110, -414]]), hair), amp: .45 },
    { draw: g => Fc(g, [[-30, -414], [30, -420], [68, -398], [76, -362], [68, -328], [42, -308], [0, -302], [-30, -318], [-46, -352], [-46, -392]], body), amp: .5,
      bump: g => { g.fillStyle = '#d8d8d8'; g.beginPath(); g.ellipse(26, -384, 46, 9, -.1, 0, TAU); g.fill(); g.beginPath(); g.ellipse(56, -352, 10, 22, .2, 0, TAU); g.fill(); g.fillStyle = '#2a2a2a'; g.beginPath(); g.ellipse(36, -370, 13, 8, 0, 0, TAU); g.fill(); }, bumpAmp: 10 },
    { draw: g => Fb(g, P2 => { vcr(P2, [[-40, -334], [0, -322], [70, -338], [92, -300], [82, -250], [50, -212], [10, -198], [-26, -212], [-48, -250], [-52, -298]]); fringe(P2, [[-40, -236], [10, -200], [60, -224]], 6, 30, 14, PI / 2, .5, 7); }, hair), amp: .5, h: 12 },
    { draw: g => Fb(g, P2 => vcr(P2, [[0, -340], [40, -348], [92, -334], [116, -306], [94, -314], [52, -328], [22, -326], [-12, -330], [-44, -318], [-62, -296], [-48, -326]]), '#9a3418'), amp: .6, h: 18 },
  ], { over: g => { gl([[[-30, -398], [-90, -378], [-170, -350]], [[0, -428], [-80, -404], [-200, -350]], [[-10, -290], [0, -240]], [[40, -290], [44, -236]], [[20, -404], [50, -400]]], 1.8)(g); g.fillStyle = '#fffbe8'; g.beginPath(); g.ellipse(38, -370, 12, 4.5, -.1, 0, TAU); g.fill(); } });
  R.armL = P([0, 0], [-280, -300, 0, 0], [
    { draw: g => Fb(g, P2 => vlimb(P2, [[-168, -246], [-214, -170], [-196, -110], [-130, -84]], [92, 82, 66, 60]), body), amp: .5, bump: g => { g.fillStyle = '#d0d0d0'; g.beginPath(); g.ellipse(-196, -196, 34, 46, .3, 0, TAU); g.fill(); }, bumpAmp: 12 },
    { draw: g => Fc(g, [[-150, -122], [-70, -122], [-50, -80], [-68, -36], [-146, -34], [-166, -80]], body), amp: .55, h: 12, bump: g => { g.fillStyle = '#d0d0d0'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-138 + i * 22, -50, 11, 0, TAU); g.fill(); } }, bumpAmp: 8 },
  ], { over: gl([[[-140, -76], [-62, -76]], [[-214, -200], [-210, -160]]], 1.8) });
  R.armR = P(TH.shR, [100, -470, 320, -180], [
    { draw: g => Fb(g, P2 => vlimb(P2, [[168, -246], [232, -280], [252, -330], [240, -392]], [94, 82, 70, 64]), body), amp: .5, bump: g => { g.fillStyle = '#d0d0d0'; g.beginPath(); g.ellipse(214, -276, 44, 34, -.4, 0, TAU); g.fill(); }, bumpAmp: 12 },
    { draw: g => Fc(g, [[200, -436], [280, -436], [296, -394], [280, -352], [204, -350], [186, -394]], body), amp: .55, h: 12, bump: g => { g.fillStyle = '#d0d0d0'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(212 + i * 22, -424, 11, 0, TAU); g.fill(); } }, bumpAmp: 8 },
  ], { over: gl([[[206, -416], [282, -416]], [[200, -266], [236, -270]]], 1.8) });
  R.hammer = P([0, 0], [-80, -170, 80, 70], [ // Mjölnir: grip at the origin, head up
    { draw: g => Fb(g, P2 => vlimb(P2, [[0, 60], [0, -80]], [22, 22]), ham), amp: .4 },
    { draw: g => Fc(g, [[-74, -160], [74, -160], [80, -150], [80, -80], [74, -70], [-74, -70], [-80, -80], [-80, -150]], ham), amp: .35, h: 12, bump: g => { g.fillStyle = '#e8e8e8'; g.fillRect(-74, -156, 148, 10); }, bumpAmp: 6 },
  ], { over: g => { g.strokeStyle = gold; g.lineWidth = 7; g.beginPath(); g.moveTo(-40, -160); g.lineTo(40, -70); g.moveTo(40, -160); g.lineTo(-40, -70); g.stroke(); gl([[[-74, -116], [74, -116]], [[-30, -160], [-30, -70]], [[30, -160], [30, -70]]], 1.6)(g); } });
  return RIGS.thor = R;
}
/* the spectre's appearance: he rises behind the target, raises the hammer, and brings it down at 0.55s */
function fxThor(f) {
  const R = rigThor(), t = f.t, k = t / f.life, a = k < .14 ? k / .14 : k > .72 ? (1 - k) / .28 : 1;
  const sw = t < .45 ? -.45 * smooth(t / .45) : t < .58 ? lerp(-.45, 2.05, smooth((t - .45) / .13)) : 2.05 - Math.min(.25, (t - .58) * .5);
  const hr = sw * TH.hamRot, fr = [TH.fistR[0] - TH.shR[0], TH.fistR[1] - TH.shR[1]], c = Math.cos(sw), s = Math.sin(sw), fp = [TH.shR[0] + fr[0] * c - fr[1] * s, TH.shR[1] + fr[0] * s + fr[1] * c];
  // stand him so that, at the blow, the hammer's head lands on the target
  const c2 = Math.cos(2.05), s2 = Math.sin(2.05), fp2 = [TH.shR[0] + fr[0] * c2 - fr[1] * s2, TH.shR[1] + fr[0] * s2 + fr[1] * c2], hh = [fp2[0] + Math.sin(2.05 * TH.hamRot) * 115, fp2[1] - Math.cos(2.05 * TH.hamRot) * 115];
  const sc = .95, ox = f.x - hh[0] * sc, oy = f.y - hh[1] * sc - (1 - a) * 40 - Math.sin(t * 3) * 6;
  const spectre = () => { rpart(R.body, 0, 0); rpart(R.armL, 0, 0); rpart(R.head, 4, -292 + Math.sin(t * 4) * 2, 0, 1.45, 1.45); rpart(R.armR, TH.shR[0], TH.shR[1], sw); rpart(R.hammer, fp[0], fp[1] - 6, hr); };
  glow(ox + 20, oy - 180, 300, '#ff9a2a', .35 * a);
  // a translucent body that holds its colour even over snow, then the same again in light, so it glows over the dark
  ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
  ctx.globalAlpha = a * .5; spectre();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * .6; spectre();
  ctx.restore();
  // lightning crawls over him, and down the hammer when it lands
  if (Math.random() < .5 * a) { const x0 = ox + rand(-150, 150) * sc, y0 = oy + rand(-300, 0) * sc; drawBolt(x0, y0, x0 + rand(-120, 120), y0 + rand(40, 160), .8 * a, '#ffe9a0'); }
  for (let i = 0; i < 2; i++) if (Math.random() < a) { const u = rand(-1, 1); drawBolt(ox + u * 140 * sc, oy - 10 * sc, ox + u * 200 * sc + rand(-40, 40), oy + rand(60, 140), .7 * a, '#ffe9a0'); }
  if (t > .5 && t < .9) for (let i = 0; i < 3; i++) drawBolt(f.x + rand(-20, 20), f.y - 380, f.x + rand(-30, 30), f.y, 1 - (t - .5) / .4, i ? '#ffe9a0' : '#ffffff');
  glowPost(f.x, f.y - 20, 140, '#ffd27a', t > .55 && t < .8 ? .8 : .15);
}
