/* =====================================================================
   GIANT — Þrymr, drawn as one big hand-painted animation cel: organic
   contours, airbrushed form, thin sketchy line, a glowing mane of ice.
   A thousand units tall; the hero comes up to his toes.
   ===================================================================== */
const Fc = (g, pts, col) => { const P = new Path2D(); vcr(P, pts); g.fillStyle = col; g.fill(P); };
const Fb = (g, build, col) => { const P = new Path2D(); build(P); g.fillStyle = col; g.fill(P); };
/* sketchy line: two loose passes of a tapered brush, like pencil left in the final cel */
function sketch(g, lines, w, col, a = .85) {
  g.save();
  for (const pass of [[0, 0, 1], [.7, -.5, .45]]) { g.globalAlpha = a * pass[2]; g.translate(pass[0], pass[1]); for (const L of lines) inkStroke(g, L, w, col, .28, .28); }
  g.restore();
}
function softPart(pv, box, layers, extra = {}) {
  const sh = g => g.translate(-pv[0], -pv[1]);
  return paintSprite(Object.assign({ soft: 1, s: 1, inkW: 2.4, ink: '#2b3448', ao: .5, aoR: 10 }, extra, {
    box: [box[0] - pv[0], box[1] - pv[1], box[2] - pv[0], box[3] - pv[1]],
    layers: layers.map(L => Object.assign({}, L, { draw: g => { sh(g); L.draw(g); }, bump: L.bump ? g => { sh(g); L.bump(g); } : undefined })),
    under: extra.under ? g => { sh(g); extra.under(g); } : undefined,
    over: extra.over ? g => { sh(g); extra.over(g); } : undefined,
  }));
}
/* Þrymr, laid out on the frame of a 1920×1080 cel (feet at 1000): I() moves it into body space */
const I = pts => pts.map(p => [p[0] - 1000, p[1] - 1000]);
const IP = p => [p[0] - 1000, p[1] - 1000];
const TP = { armL: [790, 250], armR: [1180, 300], legL: [840, 700], legR: [1120, 770], waist: [990, 500], neck: [960, 240], jaw: [920, 250], crown: [950, 170] };
/* a jagged mass of ice-hair: a smooth core outline whose free edge breaks into spikes */
function iceMass(core, spikeEdge, n, len, dirf, seed, jag = .45) {
  const sp = spikePts(spikeEdge, n, len, dirf, seed, jag);
  return core.concat(sp);
}
function rigThrym() {
  if (RIGS.thrym) return RIGS.thrym;
  const skin = '#93b2d8', fur = '#3e3d54', ice = '#e2fbff', ink = '#2c3546', iceInk = '#7fb4d8', metal = '#9aa6b8', disk = '#1f2b44';
  const E = { shade: [.8, .86, 1], lo: .8, edgeA: .2, edgeW: 16, inkW: 2.4, range: 1 };
  const IC = Object.assign({}, E, { ink: iceInk, inkW: 1.4, lo: .93, shade: [.86, .95, 1], edgeA: .05 });
  const R = {}, B = (pv, box) => [IP(pv), [box[0] - 1000, box[1] - 1000, box[2] - 1000, box[3] - 1000]];
  const part = (pv, box, layers, extra) => { const [p, b] = B(pv, box); return softPart(p, b, layers, extra); };
  const sk = (lines, w = 2.6, c = ink) => g => sketch(g, lines.map(I), w, c);
  const toe = (x, y, rx, ry) => ({ draw: g => { Fb(g, P => vell(P, x - 1000, y - 1000, rx, ry), skin); Fb(g, P => vell(P, x - 1000 + rx * .1, y - 1000 + ry * .45, rx * .55, ry * .42), '#dceaf6'); }, amp: .6, h: 6, innerInk: true, inkW: .7 });
  R.legL = part(TP.legL, [760, 670, 930, 910], [
    { draw: g => Fc(g, I([[800, 700], [856, 704], [888, 740], [900, 790], [904, 830], [894, 858], [866, 872], [832, 876], [804, 868], [790, 846], [794, 812], [788, 770], [784, 732]]), skin), amp: .6 },
    toe(800, 850, 13, 11), toe(818, 866, 13, 11), toe(840, 874, 13, 11), toe(862, 872, 12, 10), toe(882, 862, 10, 9),
  ], Object.assign({}, E, { over: sk([[[876, 796], [884, 830]], [[814, 820], [840, 828], [866, 824]], [[806, 760], [816, 790]]]) }));
  R.legR = part(TP.legR, [1060, 750, 1270, 1030], [
    { draw: g => Fc(g, I([[1084, 770], [1150, 784], [1210, 796], [1240, 830], [1246, 880], [1236, 925], [1238, 962], [1226, 986], [1190, 996], [1140, 998], [1102, 990], [1090, 966], [1090, 925], [1082, 870], [1078, 815]]), skin), amp: .6 },
    toe(1108, 986, 15, 13), toe(1136, 996, 15, 13), toe(1166, 1000, 15, 13), toe(1196, 996, 14, 12), toe(1222, 984, 12, 10),
  ], Object.assign({}, E, { over: sk([[[1222, 840], [1230, 892]], [[1116, 930], [1138, 952]], [[1098, 850], [1094, 900]], [[1146, 960], [1186, 966], [1218, 958]], [[1180, 880], [1196, 900]]]) }));
  R.torso = part(TP.waist, [740, 180, 1210, 545], [
    { draw: g => Fc(g, I([[812, 206], [780, 226], [764, 262], [772, 320], [788, 390], [800, 455], [830, 498], [900, 520], [1000, 530], [1080, 516], [1150, 486], [1176, 420], [1186, 350], [1170, 292], [1132, 252], [1064, 226], [1000, 214], [940, 196], [880, 190]]), skin), amp: .4 },
    { draw: g => Fc(g, I([[1010, 318], [1094, 312], [1162, 348], [1176, 420], [1150, 482], [1080, 512], [1000, 524], [904, 514], [846, 474], [862, 404], [930, 352]]), skin), amp: .25, h: 8, innerInk: false },
  ], Object.assign({}, E, { over: sk([[[880, 300], [930, 330], [990, 320]], [[1040, 300], [1076, 286]], [[900, 404], [940, 420], [990, 410]], [[1000, 340], [1010, 380]], [[1046, 392], [1100, 426], [1150, 438]], [[1108, 296], [1140, 350]], [[1060, 470], [1110, 476]], [[958, 488], [968, 496], [980, 488]], [[800, 330], [812, 380]], [[1170, 380], [1160, 420]], [[1076, 330], [1104, 356], [1120, 392]], [[1150, 300], [1170, 330]], [[1006, 412], [1030, 436]], [[1020, 470], [1040, 490]], [[1120, 460], [1150, 466]], [[790, 420], [800, 450]], [[1086, 248], [1120, 262]]], 2.4) }));
  R.hips = part(TP.waist, [740, 450, 1230, 840], [
    { draw: g => Fb(g, P => { vcr(P, I([[790, 478], [850, 492], [950, 506], [1050, 506], [1150, 496], [1192, 510], [1200, 560], [1196, 640], [1172, 700], [1132, 760], [1080, 790], [1000, 812], [920, 820], [860, 792], [810, 742], [786, 682], [772, 600], [776, 530]]));
        const edge = I([[776, 530], [772, 600], [786, 682], [810, 742], [860, 792], [920, 820], [1000, 812], [1080, 790], [1132, 760], [1172, 700], [1196, 640], [1200, 560]]);
        for (let i = 0; i < 120; i++) { const u = i / 119, k = u * (edge.length - 1), j = Math.min(edge.length - 2, k | 0), f = k - j, x = lerp(edge[j][0], edge[j + 1][0], f), y = lerp(edge[j][1], edge[j + 1][1], f), a = Math.atan2(y + 330, x + 10) + (hash2(i, 2) - .5) * .9; vleaf(P, x, y, a, 8 + hash2(i, 3) * 22, 5 + hash2(i, 5) * 3, (hash2(i, 4) - .5) * 9); }
        for (let i = 0; i < 46; i++) { const u = i / 45, x = lerp(-205, 190, u), y = lerp(-523, -503, u) + Math.sin(u * 9) * 4; vleaf(P, x, y, -PI / 2 + (hash2(i, 6) - .5) * 1.1, 6 + hash2(i, 7) * 12, 4.5); } }, fur), amp: .3, lo: .78, edgeA: .25 },
    ...[[815, 572, 26, 34], [888, 602, 40, 44], [1016, 628, 40, 42], [1094, 596, 27, 30]].map(([x, y, rx, ry]) => ({ draw: g => Fb(g, P => vell(P, x - 1000, y - 1000, rx, ry), disk), r: 10, h: 10, lo: .9, inkW: .8 })),
  ], Object.assign({}, E, { inkW: 1.4, over: g => { g.lineCap = 'round'; for (let i = 0; i < 320; i++) { const x = -225 + hash2(i, 9) * 425, y = -520 + hash2(i, 8) * 330; if ([[-112, -398, 40, 44], [16, -372, 40, 42], [94, -404, 27, 30], [-185, -428, 26, 34]].some(([cx, cy, rx, ry]) => Math.hypot((x - cx) / rx, (y - cy) / ry) < 1.08)) continue; g.globalAlpha = .7; g.strokeStyle = i % 3 ? '#23222f' : '#6a6684'; g.lineWidth = i % 3 ? 2 : 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 3, y + 8, x + (hash2(i, 7) - .5) * 8, y + 16); g.stroke(); } g.globalAlpha = 1; } }));
  R.armL = part(TP.armL, [580, 190, 840, 580], [
    { draw: g => Fc(g, I([[806, 206], [778, 228], [758, 268], [744, 308], [726, 336], [692, 352], [664, 372], [650, 404], [646, 430], [618, 452], [602, 488], [606, 520], [628, 542], [664, 558], [704, 556], [732, 526], [758, 494], [792, 466], [810, 432], [814, 380], [808, 320], [812, 262]]), skin), amp: .55 },
    { draw: g => Fc(g, I([[650, 432], [618, 452], [602, 488], [606, 520], [628, 542], [664, 558], [704, 556], [732, 526], [726, 486], [702, 458], [672, 442]]), skin), amp: .45, h: 10 },
    { draw: g => Fc(g, I([[686, 466], [712, 470], [730, 498], [720, 524], [698, 522], [688, 496]]), skin), amp: .55, h: 16 },
  ], Object.assign({}, E, { over: g => { sk([[[700, 356], [716, 380], [730, 418]], [[668, 390], [690, 420]], [[640, 470], [662, 480]], [[614, 500], [640, 508]], [[630, 524], [660, 530]], [[676, 502], [690, 526]], [[756, 300], [748, 336]], [[760, 410], [780, 440]]])(g); Fb(g, P => vell(P, -334, -520, 9, 6, -.5), '#e6f2fb'); sk([[[734, 260], [722, 300]], [[690, 380], [700, 410]], [[620, 476], [644, 486]], [[700, 440], [712, 458]], [[786, 300], [792, 340]]], 2.2)(g); } }));
  R.armR = part(TP.armR, [1100, 230, 1350, 780], [
    { draw: g => Fc(g, I([[1124, 250], [1182, 266], [1234, 306], [1268, 370], [1290, 450], [1300, 530], [1312, 600], [1328, 650], [1332, 692], [1312, 736], [1270, 752], [1224, 740], [1194, 714], [1180, 672], [1174, 630], [1158, 590], [1148, 540], [1140, 490], [1150, 430], [1150, 360], [1132, 300]]), skin), amp: .55 },
    { draw: g => Fc(g, I([[1186, 640], [1250, 628], [1312, 640], [1332, 692], [1312, 736], [1270, 752], [1224, 740], [1194, 714], [1180, 672]]), skin), amp: .45, h: 10 },
    ...[[1196, 700], [1226, 718], [1258, 724], [1290, 716]].map(([fx, fy], i) => ({ draw: g => Fc(g, I([[fx - 14, fy - 18], [fx + 12, fy - 20], [fx + 18, fy + 6], [fx + 12, fy + 26], [fx - 8, fy + 28], [fx - 18, fy + 6]]), skin), amp: .6, h: 16 + i, innerInk: true, inkW: .9 })),
    { draw: g => Fc(g, I([[1300, 640], [1326, 652], [1334, 690], [1318, 704], [1300, 690], [1294, 664]]), skin), amp: .6, h: 22 },
  ], Object.assign({}, E, { over: g => { sk([[[1232, 330], [1204, 372], [1186, 430]], [[1240, 515], [1270, 540]], [[1200, 610], [1222, 626]], [[1220, 652], [1250, 642], [1290, 652]], [[1230, 702], [1240, 734]], [[1260, 706], [1265, 744]], [[1290, 700], [1300, 732]], [[1192, 662], [1210, 690]], [[1262, 470], [1282, 500]]])(g); Fb(g, P => vell(P, 266, -336, 10, 6, -.3), '#e6f2fb'); } }));
  R.head = part(TP.neck, [870, 170, 1050, 280], [
    { draw: g => Fc(g, I([[1006, 202], [1030, 206], [1036, 230], [1016, 242]]), skin), amp: .6 },
    { draw: g => Fc(g, I([[904, 190], [934, 178], [970, 180], [1004, 192], [1024, 210], [1028, 236], [1010, 250], [976, 248], [944, 246], [914, 240], [900, 216]]), skin), amp: .5 },
    { draw: g => Fc(g, I([[912, 200], [928, 204], [934, 228], [928, 246], [906, 250], [890, 240], [892, 222]]), skin), amp: .6, h: 12 },
  ], Object.assign({}, E, { over: sk([[[938, 200], [960, 194], [984, 198]], [[1010, 214], [1020, 228]], [[946, 232], [962, 238]], [[906, 226], [918, 230]]], 2.2) }));
  // beard: one jagged, glowing mass hanging from the cheeks over the chest; the jaw rides inside it
  R.jaw = part(TP.jaw, [740, 150, 1130, 560], [
    { draw: g => { const P = pth(P => vpoly(P, I(iceMass([[1046, 226], [1010, 246], [966, 250], [900, 244], [850, 226]],
        [[850, 226], [822, 268], [812, 330], [828, 400], [856, 460], [884, 502], [910, 516], [946, 498], [984, 452], [1018, 396], [1044, 330], [1060, 270], [1046, 226]],
        36, t => 26 + Math.sin(t * PI) * 26 + (t < .2 || t > .8 ? 34 : 0), t => PI * (1.05 - t * 1.15) + .05, 3, .7))));
        const gr = g.createLinearGradient(0, -770, 0, -484); gr.addColorStop(0, ice); gr.addColorStop(.45, 'rgba(214,244,253,.96)'); gr.addColorStop(1, 'rgba(176,222,246,.74)'); g.fillStyle = gr; g.fill(P); },
      amp: .3, glow: .2 },
  ], Object.assign({}, IC, { over: g => { g.save(); g.globalAlpha = .55; for (let i = 0; i < 26; i++) { const x0 = 846 + hash2(i, 1) * 190, y0 = 262 + hash2(i, 2) * 70, L = 70 + hash2(i, 3) * 130, a = PI / 2 + (x0 - 940) / 380 + (hash2(i, 4) - .5) * .3; inkStroke(g, I([[x0, y0], [x0 + Math.cos(a) * L * .5, y0 + Math.sin(a) * L * .5], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L]]), i % 3 ? 2.4 : 4, i % 3 ? '#8cc6ea' : '#ffffff'); } g.restore(); } }));
  // the mane: a great jagged crest of ice blown back off the crown
  R.hair = part(TP.crown, [820, 0, 1320, 300], [
    { draw: g => { const P = pth(P => vpoly(P, I(iceMass([[1060, 250], [1000, 236], [940, 220], [880, 200]],
        [[880, 200], [858, 150], [880, 100], [930, 70], [990, 60], [1060, 80], [1140, 110], [1220, 140], [1270, 180], [1240, 230], [1160, 250], [1060, 250]],
        24, t => 40 + Math.sin(t * PI) * 90, t => -PI * (.7 - t * .75), 11, .5))));
        g.fillStyle = ice; g.fill(P); },
      amp: .3, glow: .2 },
  ], Object.assign({}, IC, { over: g => { g.save(); g.globalAlpha = .5; for (let i = 0; i < 18; i++) { const x0 = 900 + hash2(i, 1) * 160, y0 = 110 + hash2(i, 2) * 100, L = 90 + hash2(i, 3) * 160, a = -.35 - hash2(i, 4) * .5; inkStroke(g, I([[x0, y0], [x0 + Math.cos(a) * L * .5, y0 + Math.sin(a) * L * .5], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L]]), i % 3 ? 2.2 : 3.6, i % 3 ? '#9ccff0' : '#ffffff'); } g.restore(); } }));
  R.helm = part(TP.crown, [840, 0, 1050, 240], [
    { draw: g => Fb(g, P => { vcr(P, I([[880, 144], [862, 104], [862, 62], [878, 30], [904, 14], [894, 40], [886, 72], [888, 108], [900, 142]])); vcr(P, I([[996, 172], [1018, 160], [1030, 120], [1024, 78], [1008, 40], [998, 60], [1004, 98], [1002, 136], [990, 164]])); }, metal), amp: .6 },
    { draw: g => Fc(g, I([[880, 166], [884, 136], [906, 116], [944, 108], [984, 116], [1008, 136], [1020, 166], [1022, 198], [1012, 220], [998, 222], [988, 202], [962, 196], [930, 190], [902, 186], [882, 180]]), '#9aa6b8'), amp: .5, h: 12 },
    { draw: g => Fc(g, I([[936, 186], [956, 188], [952, 222], [940, 220]]), '#8492a8'), amp: .6, h: 18 },
  ], Object.assign({}, E, { over: sk([[[880, 164], [940, 176], [1016, 190]], [[900, 120], [930, 108]]], 2.2) }));
  return RIGS.thrym = R;
}
function drawThrym(b) {
  const R = rigThrym(), x = b.x, y = b.y, t = b.t, A = b.an, s = b.side;
  const cr = A.crouch.v * 40, br = Math.sin(t * 1.6) * 5, m = A.mouth.v, gust = b.blizzard ? 1 : .35;
  ctx.save(); ctx.translate(x, y); ctx.scale(-s, 1); // the cel faces left; turn him to face the hero
  dropShadow(ctx, 20, 6, 360, 90, .75);
  const L = n => IP(TP[n]), rp = (spr, p, dx = 0, dy = 0, rot = 0, sx = 1, sy = 1) => rpart(spr, p[0] + dx, p[1] + dy, rot, sx, sy);
  for (const [k, n] of [[-1, 'legL'], [1, 'legR']]) { const lift = b.moving ? Math.max(0, Math.sin(b.walk + (k > 0 ? 0 : PI))) * 28 : 0; rp(R[n], L(n), 0, cr * .6 - lift, 0, 1, 1 - cr / 500); }
  const by = cr + br * .5;
  rp(R.hair, L('crown'), 0, by * 1.1, Math.sin(t * 2.3) * .02 * (1 + gust) + gust * .04, 1 + gust * .1, 1);
  rp(R.torso, L('waist'), 0, cr, 0, 1, 1 + Math.sin(t * 1.6) * .008);
  rp(R.hips, L('waist'), 0, cr * .9);
  // arms: hanging (0), raised (1), thrust at the ground (<0)
  const upL = clamp(A.armL.v, -.5, 1), upR = clamp(A.armR.v, -.5, 1);
  rp(R.armL, L('armL'), 0, by + Math.max(0, -upL) * 220, upL > 0 ? upL * 2.4 : upL * .5, 1 + Math.max(0, -upL) * .5, 1 + Math.max(0, -upL) * .5);
  rp(R.armR, L('armR'), 0, by + Math.max(0, -upR) * 220, upR > 0 ? -upR * 2.6 : -upR * .4, 1 + Math.max(0, -upR) * .5, 1 + Math.max(0, -upR) * .5);
  const nk = L('neck'), jw = L('jaw');
  rp(R.jaw, jw, 0, by * 1.1 + m * 30, 0, 1, 1 + m * .05);
  // the mouth: a dark cavern torn open in the beard when he roars
  const mx = -70, my = -754 + by * 1.1, mh = 14 + m * 92, mw = 26 + m * 10;
  ctx.fillStyle = '#4a5a6c'; ctx.beginPath(); ctx.moveTo(mx - mw, my); ctx.quadraticCurveTo(mx, my - 10, mx + mw, my + 2); ctx.quadraticCurveTo(mx + mw * 1.05, my + mh * .8, mx, my + mh); ctx.quadraticCurveTo(mx - mw * 1.1, my + mh * .8, mx - mw, my); ctx.fill();
  ctx.fillStyle = '#1e2838'; ctx.beginPath(); ctx.moveTo(mx - mw * .82, my + 6); ctx.quadraticCurveTo(mx, my - 2, mx + mw * .82, my + 8); ctx.quadraticCurveTo(mx + mw * .8, my + mh * .7, mx + 4, my + mh * .82); ctx.quadraticCurveTo(mx - mw * .9, my + mh * .66, mx - mw * .82, my + 6); ctx.fill();
  ctx.strokeStyle = '#2c3546'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(mx - mw, my); ctx.quadraticCurveTo(mx, my - 10, mx + mw, my + 2); ctx.quadraticCurveTo(mx + mw * 1.05, my + mh * .8, mx, my + mh); ctx.quadraticCurveTo(mx - mw * 1.1, my + mh * .8, mx - mw, my); ctx.stroke();
  ctx.fillStyle = '#f2f6f8'; ctx.lineWidth = 1.6;
  const tooth = (x0, y0, w, h) => { ctx.beginPath(); ctx.moveTo(x0 - w / 2, y0); ctx.lineTo(x0 + w / 2, y0); ctx.lineTo(x0 + w * .1, y0 + h); ctx.closePath(); ctx.fill(); ctx.stroke(); };
  for (const [dx, w, h] of [[-26, 12, 26], [-12, 8, 12], [0, 8, 12], [12, 8, 12], [26, 12, 24]]) tooth(mx + dx * (mw / 30), my + 1, w, h * (.5 + m * .5));
  if (m > .2) for (const [dx, w, h] of [[-24, 11, -20], [-8, 8, -10], [8, 8, -10], [24, 11, -22]]) tooth(mx + dx, my + mh - 4, w, h * m);
  rp(R.head, nk, 0, by * 1.1);
  const ex = -46, ey = -792 + by * 1.1; ctx.fillStyle = '#f8feff'; ctx.beginPath(); ctx.ellipse(ex, ey, 11, 10, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2c3546'; ctx.lineWidth = 2; ctx.stroke(); glowPost(x - s * ex, y + ey, 40, '#dff8ff', .9);
  rp(R.helm, L('crown'), 0, by * 1.1);
  ctx.restore();
  glowPost(x + s * 70, y - 640, 300, '#d8f4ff', .3); glowPost(x - s * 100, y - 850, 240, '#d8f4ff', .14);
  { // snow torn off his mane by the wind, streaming away behind him; a gale in the blizzard
    ctx.save(); const k = b.blizzard ? 1 : .8;
    for (let i = 0; i < 18; i++) { const f = (i / 18 + t * .05) % 1, px = x - s * (40 + f * 950) + Math.sin(i * 2.3 + t * .7) * 30, py = y - 860 + Math.sin(i * 1.7) * 60 + f * 110 + (i % 3) * 34, rr = 80 + f * 150 + (i % 3) * 26;
      ctx.globalAlpha = Math.min(1, f * 6) * Math.pow(1 - f, .6) * k; ctx.drawImage(cloudSpr(i % 3), px - rr, py - rr * .42, rr * 2, rr * .84); }
    ctx.restore();
  }
  G.lights.push({ x, y: y - 420, r: 760, i: .55, col: '#cfe8ff' });
}

/* a dense puff of blown snow: white on top, a soft blue-grey belly */
const CLOUDS = [];
function cloudSpr(v) {
  if (CLOUDS[v]) return CLOUDS[v];
  const N = 160, c = mkCanvas(N, N), g = c.getContext('2d'), id = g.createImageData(N, N), f = fogTex().getContext('2d').getImageData(0, 0, 256, 256).data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x - N / 2) / (N / 2), dy = (y - N / 2) / (N / 2), r = Math.hypot(dx, dy), fo = f[(((y + v * 53) % 256) * 256 + ((x * 1.3 + v * 91) % 256 | 0)) * 4 + 3] / 255;
    const a = clamp((1 - r) * 2.2 + (fo - .5) * 1.4, 0, 1) * clamp(1.2 - r, 0, 1), sh = clamp(dy * .9 + .25, 0, 1);
    const i = (y * N + x) * 4; id.data[i] = lerp(250, 168, sh); id.data[i + 1] = lerp(252, 182, sh); id.data[i + 2] = lerp(255, 202, sh); id.data[i + 3] = a * 235;
  }
  g.putImageData(id, 0, 0); return CLOUDS[v] = c;
}
