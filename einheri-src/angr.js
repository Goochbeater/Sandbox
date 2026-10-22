/* =====================================================================
   ANGRBOÐA — the Hag of the Iron Wood, Mother of Wolves.
   A crone grown out of an iron-barked tree, hunched like a vulture:
   burl shoulders above a low-hung gaunt face, a ribcage split open on
   a molten heart, arms long enough to drag their twig claws in the ash,
   dead boughs growing out of her back, and the pelt of a wolf (her own
   child) slung over one shoulder. Lava bleeds through every crack.
   Body frame: (0,0) is where the trunk meets the ground; up is -y.
   ===================================================================== */
const AG = { waist: [0, -430], sh: [205, -718], el: [318, -502], wr: [296, -298], neck: [0, -790], jaw: [0, -786], crown: [0, -930] };
function rigAngr() {
  if (RIGS.angr) return RIGS.angr;
  const bark = '#6a5e56', barkD = '#4e4642', barkDD = '#3e3634', skin = '#b6ab94', hair = '#4e5244', hairL = '#8a8e7a', pelt = '#5e5248', peltL = '#8a7e72', bone = '#e6dac0', ink = '#1a120e';
  const E = { s: 1.4, grain: .14, grainScale: .7, shade: [.52, .48, .68], lo: .4, edgeA: .3, edgeW: 18, inkW: 2.6, ink, rim: '#ff8a3a', rimA: .75, rimDir: [0, 1], rimT: .18, aoR: 12 };
  const R = {}, P = (pv, box, layers, extra) => softPart(pv, box, layers, Object.assign({}, E, extra || {}));
  const sk = (lines, w = 2.4, c = ink) => g => sketch(g, lines, w, c);
  const line = (P2, pts) => { P2.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) P2.lineTo(p[0], p[1]); };
  const vein = (g, pts, w = 3.4) => { // a lava crack: a charred groove with a molten thread in it
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; const P2 = new Path2D(); line(P2, pts);
    g.strokeStyle = '#24100a'; g.lineWidth = w * 2.4; g.stroke(P2); g.strokeStyle = '#ff6a14'; g.lineWidth = w * 1.15; g.stroke(P2);
    g.strokeStyle = '#ffd47a'; g.lineWidth = w * .45; g.stroke(P2); g.restore();
  };
  const jag = (x0, y0, x1, y1, n, amp, seed) => { const pts = []; for (let i = 0; i <= n; i++) { const u = i / n, e = i && i < n; pts.push([lerp(x0, x1, u) + (e ? (hash2(seed, i) - .5) * amp : 0), lerp(y0, y1, u) + (e ? (hash2(i, seed) - .5) * amp * .4 : 0)]); } return pts; };
  const grooves = (g, n, x0, x1, y0, y1, twist, w = 7, seed = 0) => { // bark grain: long twisting furrows (relief)
    g.strokeStyle = '#3a3a3a'; g.lineWidth = w; g.lineCap = 'round';
    for (let i = 0; i < n; i++) { const u = (i + .5) / n, xa = lerp(x0[0], x0[1], u), xb = lerp(x1[0], x1[1], u), j = (hash2(i, seed) - .5) * 14;
      g.beginPath(); g.moveTo(xa + j, y0); g.bezierCurveTo(xa + twist + j, lerp(y0, y1, .35), xb - twist * .6 + j, lerp(y0, y1, .7), xb + j, y1); g.stroke(); }
  };
  const barkPlates = (g, x0, x1, y0, y1, flare, seed, w = 5) => { // fissured plates: short vertical cracks in staggered rows, fanning out with the trunk
    g.strokeStyle = '#2e2e2e'; g.lineCap = 'round'; g.lineWidth = w;
    for (let y = y0, r = 0; y < y1; y += 30 + hash2(r, seed) * 14, r++) {
      const u = (y - y0) / (y1 - y0), half = lerp(x1, x1 + flare, u * u);
      for (let x = -half + (r % 2) * 12, c = 0; x < half; x += 22 + hash2(c, r + seed) * 16, c++) {
        const L = 26 + hash2(r, c + seed) * 30, dx = x / Math.max(1, half) * 10;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dx * .5 + (hash2(c, r) - .5) * 8, y + L * .5, x + dx, y + L); g.stroke();
      }
    }
    g.strokeStyle = '#bcbcbc'; g.lineWidth = w * .8;
    for (let i = 0; i < 40; i++) { const u = hash2(i, seed + 9), y = lerp(y0, y1, u), half = lerp(x1, x1 + flare, u * u), x = (hash2(seed, i) - .5) * 2 * half * .9; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y + 2); g.stroke(); }
  };
  const moss = (g, pts, r, seed) => { g.save(); for (let i = 0; i < 26; i++) { const p = pts[i % pts.length], a = hash2(i, seed) * TAU, d = hash2(seed, i) * r; g.fillStyle = i % 3 ? 'rgba(96,112,64,.55)' : 'rgba(140,152,96,.5)'; g.beginPath(); g.ellipse(p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d * .6, 5 + hash2(i, 3) * 9, 3 + hash2(i, 4) * 5, a, 0, TAU); g.fill(); } g.restore(); };
  const wolfSkull = (g, x, y, s, rot = 0) => { // a wolf's skull seen from the front: dome, sockets, long muzzle, fangs
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    Fc(g, [[-16, -16], [0, -21], [16, -16], [21, -2], [14, 8], [9, 26], [0, 31], [-9, 26], [-14, 8], [-21, -2]], bone);
    Fb(g, P2 => { vell(P2, -8, -3, 6, 5, .3); vell(P2, 8, -3, 6, 5, -.3); vell(P2, 0, 18, 3, 3.5); }, '#2a1c14');
    Fb(g, P2 => { vpoly(P2, [[-8, 25], [-4, 25], [-6, 36]]); vpoly(P2, [[4, 25], [8, 25], [6, 36]]); }, bone);
    g.strokeStyle = 'rgba(40,28,20,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, -8); g.moveTo(-14, 8); g.lineTo(14, 8); g.stroke();
    g.restore();
  };
  /* ---- roots: buttresses flaring out of the trunk and diving into the ash ---- */
  const root = (sx, sy, a, L, w0, seed, col) => { // low and flat: a buttress that leaves the bole and dives back into the ash
    const pts = []; let x = sx, y = sy, ca = a;
    for (let k = 0; k < 7; k++) { pts.push([x, y]); ca += (hash2(seed, k + 3) - .5) * .5; x += Math.cos(ca) * L / 6; y += Math.sin(ca) * L / 6 * .42; }
    return { draw: g => Fb(g, P2 => vlimb(P2, pts, [w0, w0 * .78, w0 * .56, w0 * .38, w0 * .24, w0 * .12, 1.5]), col), amp: .35, h: Math.sin(a) * 10 + 10, innerInk: true, inkW: .9, pts };
  };
  const RF = [[-300, -14, PI * .97, 420, 64], [-230, -6, PI * .82, 300, 58], [-130, 0, PI * .66, 200, 50], [0, 2, PI * .5, 120, 44], [140, 0, PI * .3, 230, 52], [236, -6, PI * .16, 320, 58], [304, -12, PI * .02, 440, 64]];
  const fr = RF.map(([sx, sy, a, L, w], i) => root(sx, sy, a, L, w, i + 1, i % 2 ? bark : barkD));
  R.rootsF = P([0, 0], [-760, -120, 760, 150], fr.slice().sort((p, q) => p.h - q.h), { over: g => fr.forEach((r, i) => { if (i % 2 === 0) vein(g, r.pts.slice(1, 5), 2); }) });
  R.rootsB = P([0, 0], [-640, -200, 640, 20], [[-260, -30, PI * 1.1, 360, 56], [-120, -40, PI * 1.3, 220, 46], [130, -40, PI * 1.72, 230, 46], [262, -30, PI * 1.9, 360, 56]].map(([sx, sy, a, L, w], i) => root(sx, sy, a, L, w, i + 20, barkDD)), { lo: .5, rimA: .4 });
  /* ---- the skirt: a gown of dark bark from the waist to the roots ---- */
  R.trunk = P(AG.waist, [-340, -460, 340, 30], [
    { draw: g => Fc(g, [[-96, -444], [0, -450], [96, -444], [112, -380], [134, -300], [160, -214], [196, -136], [248, -76], [322, -34], [304, -6], [236, -12], [186, 4], [126, -8], [64, 8], [0, -2], [-64, 8], [-132, -6], [-196, 4], [-248, -12], [-326, -26], [-262, -72], [-206, -134], [-166, -214], [-138, -300], [-114, -382]], barkD), amp: .5,
      bump: g => { barkPlates(g, -100, 96, -440, -20, 210, 1, 5); g.fillStyle = '#1e1e1e'; g.beginPath(); g.ellipse(-70, -214, 20, 32, -.2, 0, TAU); g.fill(); g.lineWidth = 10; g.strokeStyle = '#d0d0d0'; g.beginPath(); g.ellipse(-70, -214, 32, 46, -.2, 0, TAU); g.stroke(); }, bumpAmp: 14 },
    { draw: g => Fb(g, P2 => vell(P2, -70, -214, 16, 28, -.2), '#160a06'), r: 3, h: -8, ink: false },
  ], { macro: .2, over: g => { sk([[[-170, -110], [-220, -50]], [[180, -200], [214, -130]], [[-96, -400], [-110, -330]]], 2.4)(g); moss(g, [[-150, -150], [-120, -110], [200, -110], [90, -380], [-60, -40]], 34, 3);
    { g.save(); g.globalCompositeOperation = 'source-atop'; for (const [x, y, r] of [[120, -260, 70], [-200, -60, 60], [40, -120, 50]]) { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(150,72,30,.35)'); rg.addColorStop(1, 'rgba(150,72,30,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); } g.restore(); }
    vein(g, jag(-20, -430, -36, -240, 6, 18, 11), 3.6); vein(g, jag(-36, -240, -110, -30, 6, 20, 12), 3.6); vein(g, jag(66, -350, 150, -60, 7, 22, 13), 3); 
    g.fillStyle = '#ffcf6a'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(-70 + k * 7, -222, 3, 2, 0, 0, TAU); g.fill(); }
    g.globalAlpha = .85; for (let i = 0; i < 9; i++) { const x0 = -80 + i * 20 + (hash2(i, 5) - .5) * 10; inkStroke(g, [[x0, -436], [x0 + (hash2(i, 6) - .5) * 20, -380], [x0 + (hash2(i, 7) - .5) * 30, -300 - hash2(i, 8) * 60]], 3.2, i % 2 ? hair : hairL); } g.globalAlpha = 1; } });
  /* ---- the cape: the wolf's hide, hanging down her back from the hood ---- */
  R.cape = P(AG.neck, [-300, -990, 300, -320], [
    { draw: g => Fb(g, P2 => { vcr(P2, [[-96, -940], [0, -966], [96, -940], [140, -860], [206, -776], [222, -700], [214, -600], [204, -500], [214, -400], [190, -370], [0, -420], [-190, -370], [-214, -400], [-204, -500], [-214, -600], [-222, -700], [-206, -776], [-140, -860]]);
      fringe(P2, [[-212, -400], [-160, -372], [-100, -390]], 6, 40, 15, PI / 2, .6, 11); fringe(P2, [[-206, -776], [-222, -700], [-214, -600], [-204, -500], [-214, -420]], 9, 22, 13, PI * .95, .5, 13); fringe(P2, [[214, -420], [204, -500], [214, -600], [222, -700], [206, -776]], 9, 22, 13, PI * .05, .5, 14); fringe(P2, [[100, -390], [160, -372], [212, -400]], 6, 40, 15, PI / 2, .6, 12); }, '#4a3e36'), amp: .4, lo: .5,
      bump: g => { g.strokeStyle = '#444'; g.lineWidth = 6; g.lineCap = 'round'; for (let i = 0; i < 18; i++) { const k = i % 2 ? 1 : -1, x0 = k * (150 + hash2(i, 1) * 100), y0 = -780 + hash2(i, 2) * 300; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + k * 10, y0 + 40, x0 + k * 4, y0 + 80); g.stroke(); } }, bumpAmp: 8 },
  ], { rimA: .45, over: g => { g.globalAlpha = .55; for (let i = 0; i < 70; i++) { const k = i % 2 ? 1 : -1, u = hash2(i, 41), x0 = k * (130 + hash2(i, 42) * 80), y0 = -840 + u * 440; inkStroke(g, [[x0, y0], [x0 + k * 6, y0 + 22], [x0 + k * 3, y0 + 42]], 1.8, i % 4 ? '#2a221e' : '#7a6e64'); } g.globalAlpha = 1; } });
  /* ---- the gaunt torso: collarbones, ribs, a sternum split on a molten heart ---- */
  R.torso = P(AG.waist, [-250, -820, 250, -410], [
    { draw: g => Fc(g, [[-86, -432], [86, -432], [96, -480], [120, -540], [150, -600], [170, -650], [192, -694], [220, -718], [212, -748], [160, -768], [96, -784], [56, -804], [-56, -804], [-96, -784], [-160, -768], [-212, -748], [-220, -718], [-192, -694], [-170, -650], [-150, -600], [-120, -540], [-96, -480]], skin), amp: .45,
      bump: g => { g.fillStyle = '#d4d4d4'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 196, -730, 40, 30, 0, 0, TAU); g.fill(); }
        g.strokeStyle = '#e0e0e0'; g.lineCap = 'round'; for (const k of [-1, 1]) { g.lineWidth = 14; g.beginPath(); g.moveTo(k * 30, -756); g.quadraticCurveTo(k * 110, -774, k * 190, -744); g.stroke();
          for (let i = 0; i < 3; i++) { const y = -660 + i * 50; g.lineWidth = 16 - i * 2; g.beginPath(); g.moveTo(k * 44, y); g.bezierCurveTo(k * 90, y - 10, k * 128, y + 10 + i * 6, k * (146 + i * 6), y + 50 + i * 10); g.stroke(); } }
        g.strokeStyle = '#4a4a4a'; g.lineWidth = 8; for (const k of [-1, 1]) for (let i = 0; i < 2; i++) { const y = -634 + i * 50; g.beginPath(); g.moveTo(k * 48, y); g.bezierCurveTo(k * 92, y - 4, k * 126, y + 14 + i * 6, k * (142 + i * 6), y + 50 + i * 10); g.stroke(); }
        g.fillStyle = '#3a3a3a'; g.beginPath(); g.ellipse(0, -470, 70, 30, 0, 0, TAU); g.fill(); g.fillStyle = '#cfcfcf'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 84, -604, 34, 52, k * -.18, 0, TAU); g.fill(); } }, bumpAmp: 16 },
    { draw: g => Fb(g, P2 => vpoly(P2, [[0, -676], [14, -650], [30, -640], [26, -612], [44, -590], [36, -560], [46, -530], [32, -500], [30, -474], [0, -458], [-26, -478], [-36, -500], [-30, -528], [-46, -556], [-34, -584], [-40, -612], [-24, -628], [-16, -656]]), '#2a140c'), r: 6, amp: .3, h: -14, innerInk: true },
    { draw: g => Fc(g, [[0, -606], [16, -598], [28, -574], [30, -548], [22, -520], [6, -506], [-10, -510], [-24, -526], [-30, -556], [-24, -584], [-12, -600]], '#ff9a30'), r: 16, amp: .9, h: -4, glow: .9, ink: false,
      bump: g => { g.strokeStyle = '#303030'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, -556); g.lineTo(Math.cos(i * 1.3) * 30, -556 + Math.sin(i * 1.3) * 40); g.stroke(); } }, bumpAmp: 6 },
  ], { macro: .22, over: g => { sk([[[-112, -566], [-84, -550], [-58, -560]], [[112, -566], [84, -550], [58, -560]]], 2)(g); moss(g, [[-190, -720], [180, -716]], 26, 7);
    { const lg = g.createLinearGradient(0, -640, 0, -432); lg.addColorStop(0, 'rgba(30,20,16,0)'); lg.addColorStop(1, 'rgba(30,20,16,.42)'); g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = lg; g.fillRect(-240, -640, 480, 220); g.restore(); }
    for (const [a, L] of [[-.5, 70], [.4, 80], [2.7, 60], [3.5, 74], [1.6, 50], [-1.7, 46]]) vein(g, jag(Math.cos(a) * 40, -556 + Math.sin(a) * 60, Math.cos(a) * (40 + L), -556 + Math.sin(a) * (60 + L * .8), 6, 18, 21 + a * 7), 1.3);
    const hg = g.createRadialGradient(0, -556, 4, 0, -556, 44); hg.addColorStop(0, 'rgba(255,248,210,.95)'); hg.addColorStop(.45, 'rgba(255,190,80,.6)'); hg.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = hg; g.beginPath(); g.arc(0, -556, 44, 0, TAU); g.fill(); } });
  /* ---- the belt: a twist of root-rope hung with bones and a raven's feather ---- */
  R.belt = P(AG.waist, [-130, -470, 130, -330], [
    { draw: g => Fb(g, P2 => { vcr(P2, [[-104, -452], [0, -446], [104, -452], [110, -430], [0, -422], [-110, -430]]); }, '#4a3a2c'), amp: .5, h: 8,
      bump: g => { g.strokeStyle = '#2e2e2e'; g.lineWidth = 4; for (let i = 0; i < 12; i++) { const x = -100 + i * 18; g.beginPath(); g.moveTo(x, -452); g.lineTo(x + 10, -424); g.stroke(); } }, bumpAmp: 6 },
    { draw: g => { Fb(g, P2 => vlimb(P2, [[-60, -428], [-64, -390], [-58, -352]], [7, 6, 9]), bone); Fb(g, P2 => vlimb(P2, [[-40, -428], [-42, -400]], [6, 9]), bone); }, r: 4, h: 12, lo: .8, inkW: .8 },
    { draw: g => Fb(g, P2 => { vcr(P2, [[60, -430], [74, -400], [80, -360], [72, -340], [62, -364], [56, -400]]); }, '#2a2a34'), r: 5, h: 12, lo: .8, inkW: .8 },
  ]);
  /* ---- the necklace of her pups' skulls ---- */
  R.neck = P(AG.waist, [-190, -800, 190, -600], [
    { draw: g => { g.strokeStyle = '#2a1a12'; g.lineWidth = 5; g.beginPath(); g.moveTo(-150, -770); g.quadraticCurveTo(-110, -650, 0, -640); g.quadraticCurveTo(110, -650, 150, -770); g.stroke(); }, r: 3, h: 4, ink: false },
    ...[[-112, -690, .9, .45], [-62, -656, 1, .2], [0, -646, 1.25, 0], [62, -656, 1, -.2], [112, -690, .9, -.45]].map(([x, y, s, r]) => ({ draw: g => wolfSkull(g, x, y, s, r), r: 6, h: 18, lo: .8, inkW: .9, innerInk: false })),
  ]);
  /* ---- the mantle: the hide's ruff over her shoulders, hiding where the arms join ---- */
  R.paws = P(AG.waist, [-280, -830, 280, -640], [
    { draw: g => Fb(g, P2 => { vcr(P2, [[-64, -806], [64, -806], [134, -792], [204, -774], [250, -742], [262, -704], [236, -690], [206, -700], [160, -722], [104, -742], [60, -754], [0, -760], [-60, -754], [-104, -742], [-160, -722], [-206, -700], [-236, -690], [-262, -704], [-250, -742], [-204, -774], [-134, -792]]);
      fringe(P2, [[-262, -704], [-206, -700], [-150, -726], [-96, -748]], 8, 30, 14, PI / 2 + .1, .6, 21); fringe(P2, [[96, -748], [150, -726], [206, -700], [262, -704]], 8, 30, 14, PI / 2 - .1, .6, 22); }, pelt), amp: .5, lo: .6,
      bump: g => { g.strokeStyle = '#404040'; g.lineWidth = 5; g.lineCap = 'round'; for (let i = 0; i < 26; i++) { const k = i % 2 ? 1 : -1, u = (i >> 1) / 12, x0 = k * (40 + u * 200), y0 = -800 + u * 70 + hash2(i, 3) * 10; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + k * 14, y0 + 24, x0 + k * 10, y0 + 46); g.stroke(); } }, bumpAmp: 9 },
  ], { rimA: .5, over: g => { g.globalAlpha = .5; for (let i = 0; i < 20; i++) { const k = i % 2 ? 1 : -1, u = (i >> 1) / 10, x0 = k * (60 + u * 180), y0 = -796 + u * 64; inkStroke(g, [[x0, y0], [x0 + k * 10, y0 + 22], [x0 + k * 6, y0 + 40]], 1.6, i % 3 ? '#2e2a26' : peltL); } g.globalAlpha = 1; } });
  /* ---- the crone's face under the wolf-hood ---- */
  R.head = P(AG.neck, [-120, -1010, 120, -730], [
    { draw: g => Fb(g, P2 => { vcr(P2, [[-80, -884], [80, -884], [96, -820], [100, -760], [84, -736], [62, -764], [0, -800], [-62, -764], [-84, -736], [-100, -760], [-96, -820]]); fringe(P2, [[-100, -770], [-86, -736], [-70, -756]], 3, 30, 12, PI / 2, .5, 2); fringe(P2, [[70, -756], [86, -736], [100, -770]], 3, 30, 12, PI / 2, .5, 3); }, hair), amp: .4, lo: .6 },
    { draw: g => Fc(g, [[-64, -878], [64, -878], [68, -846], [62, -818], [50, -796], [34, -774], [16, -760], [0, -756], [-16, -760], [-34, -774], [-50, -796], [-62, -818], [-68, -846]], skin), amp: .5,
      bump: g => { g.fillStyle = '#e4e4e4'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 40, -812, 14, 10, k * .3, 0, TAU); g.fill(); }
        g.fillStyle = '#262626'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 24, -836, 15, 11, k * .15, 0, TAU); g.fill(); g.beginPath(); g.ellipse(k * 42, -786, 10, 14, k * .2, 0, TAU); g.fill(); }
        g.strokeStyle = '#363636'; g.lineWidth = 4; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(k * 16, -806); g.quadraticCurveTo(k * 30, -794, k * 30, -776); g.stroke(); } }, bumpAmp: 12 },
    { draw: g => Fc(g, [[-7, -848], [7, -848], [10, -826], [16, -806], [20, -790], [12, -782], [2, -784], [-6, -792], [-9, -820]], skin), amp: .7, h: 16 },
    { draw: g => Fb(g, P2 => { for (const k of [-1, 1]) vell(P2, k * 24, -836, 11, 7, k * .15); }, '#140806'), r: 2, h: -8, ink: false },
    { draw: g => Fb(g, P2 => { for (const k of [-1, 1]) vell(P2, k * 24, -835, 4, 3); }, '#ffcf6a'), r: 2, h: -6, ink: false, glow: 1 },
    // the helm: the bleached skull of a great wolf worn over her own head, its upper fangs over her brow
    { draw: g => Fc(g, [[-84, -930], [-62, -964], [-24, -982], [24, -982], [62, -964], [84, -930], [102, -902], [96, -880], [74, -872], [48, -884], [0, -880], [-48, -884], [-74, -872], [-96, -880], [-102, -902]], bone), amp: .5, h: 20, lo: .7,
      bump: g => { g.fillStyle = '#f0f0f0'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 46, -940, 26, 10, k * -.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(k * 90, -894, 12, 8, 0, 0, TAU); g.fill(); } g.fillStyle = '#9a9a9a'; g.beginPath(); g.ellipse(0, -962, 8, 18, 0, 0, TAU); g.fill(); }, bumpAmp: 10 },
    { draw: g => Fb(g, P2 => { for (const k of [-1, 1]) vcr(P2, [[k * 36, -920], [k * 50, -936], [k * 72, -934], [k * 80, -916], [k * 66, -904], [k * 46, -906]]); }, '#120a08'), r: 3, h: 16, ink: false },
    { draw: g => Fc(g, [[-32, -960], [32, -960], [30, -924], [24, -890], [18, -862], [0, -854], [-18, -862], [-24, -890], [-30, -924]], bone), amp: .7, h: 34, lo: .72, inkW: 1,
      bump: g => { g.fillStyle = '#ececec'; g.beginPath(); g.ellipse(0, -926, 9, 26, 0, 0, TAU); g.fill(); }, bumpAmp: 8 },
    { draw: g => Fb(g, P2 => vcr(P2, [[-11, -880], [0, -872], [11, -880], [9, -864], [0, -858], [-9, -864]]), '#1a1210'), r: 2, h: 36, ink: false },
    { draw: g => Fb(g, P2 => { for (const k of [-1, 1]) { vpoly(P2, [[k * 20, -864], [k * 32, -868], [k * 30, -838]]); vpoly(P2, [[k * 44, -878], [k * 56, -878], [k * 52, -856]]); vpoly(P2, [[k * 62, -876], [k * 72, -874], [k * 68, -858]]); } for (const x of [-10, -3.5, 3.5, 10]) vpoly(P2, [[x - 3, -858], [x + 3, -858], [x, -849]]); }, bone), r: 2, h: 30, lo: .82, inkW: .8 },
  ], { rimA: .45, under: null, over: g => { { const sg = g.createLinearGradient(0, -872, 0, -812); sg.addColorStop(0, 'rgba(20,10,6,.75)'); sg.addColorStop(1, 'rgba(20,10,6,0)'); g.save(); g.beginPath(); g.ellipse(0, -840, 66, 40, 0, PI, TAU); g.rect(-66, -840, 132, 30); g.clip(); g.fillStyle = sg; g.fillRect(-70, -880, 140, 70); g.restore(); g.fillStyle = '#ffcf6a'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 24, -835, 4, 3, 0, 0, TAU); g.fill(); } }
    sk([[[-48, -826], [-54, -812]], [[48, -826], [54, -812]], [[-22, -784], [0, -788], [22, -784]], [[-58, -802], [-60, -790]], [[58, -802], [60, -790]], [[-40, -960], [-56, -948], [-50, -936]], [[60, -956], [70, -944]], [[-6, -976], [4, -958], [-2, -944]]], 1.6)(g);
    g.fillStyle = '#d8c8a0'; g.strokeStyle = ink; g.lineWidth = 1.2; for (const [x, l] of [[-14, 7], [-5, 9], [5, 8], [14, 6]]) { g.beginPath(); g.moveTo(x - 2.5, -784); g.lineTo(x + 2.5, -784); g.lineTo(x + .5, -784 + l); g.closePath(); g.fill(); g.stroke(); } } });
  R.jaw = P(AG.jaw, [-50, -800, 50, -730], [
    { draw: g => Fc(g, [[-36, -786], [0, -790], [36, -786], [34, -770], [22, -754], [8, -744], [0, -742], [-8, -744], [-22, -754], [-34, -770]], skin), amp: .55,
      bump: g => { g.fillStyle = '#d8d8d8'; g.beginPath(); g.ellipse(0, -752, 12, 7, 0, 0, TAU); g.fill(); }, bumpAmp: 6 },
    ...[-1, 1].map(k => ({ draw: g => Fc(g, [[k * 20, -782], [k * 30, -782], [k * 34, -804], [k * 30, -816], [k * 25, -800]], bone), r: 3, h: 16, lo: .82, inkW: .9 })),
  ], { over: sk([[[-24, -766], [-12, -758]], [[24, -766], [12, -758]]], 1.6) });
  /* ---- antler-boughs growing out of the wolf's skull ---- */
  R.crown = P(AG.crown, [-470, -1240, 470, -900], [
    { draw: g => Fb(g, P2 => {
      vlimb(P2, [[-40, -930], [-110, -990], [-190, -1030], [-280, -1050], [-360, -1080], [-430, -1124]], [58, 44, 32, 20, 10, 2]); vlimb(P2, [[-110, -990], [-96, -1060], [-120, -1112]], [18, 10, 2]); vlimb(P2, [[-190, -1030], [-204, -1100], [-178, -1160]], [15, 8, 2]); vlimb(P2, [[-280, -1050], [-302, -1120], [-290, -1184]], [11, 6, 1.5]); vlimb(P2, [[-360, -1080], [-404, -1060], [-446, -1072]], [9, 5, 1.5]); vlimb(P2, [[-60, -950], [-30, -1010], [-46, -1070], [-30, -1110]], [26, 16, 8, 2]); vlimb(P2, [[-150, -1012], [-190, -980], [-240, -984]], [12, 7, 1.5]);
      vlimb(P2, [[40, -930], [100, -1000], [164, -1060], [252, -1092], [330, -1140], [384, -1196]], [58, 44, 32, 20, 10, 2]); vlimb(P2, [[100, -1000], [152, -992], [222, -1004]], [15, 8, 2]); vlimb(P2, [[164, -1060], [152, -1132], [176, -1192]], [13, 7, 1.5]); vlimb(P2, [[252, -1092], [302, -1062], [352, -1072], [404, -1052]], [12, 8, 4, 1.5]); vlimb(P2, [[60, -950], [44, -1020], [70, -1080], [60, -1130]], [26, 16, 8, 2]); vlimb(P2, [[300, -1124], [326, -1180], [312, -1220]], [8, 4, 1.5]);
    }, barkDD), amp: .6, inkW: 1,
      bump: g => grooves(g, 4, [-160, 160], [-300, 300], -930, -1080, 20, 5, 7), bumpAmp: 8 },
  ], { lo: .55, rimA: .35, over: g => { vein(g, jag(-110, -990, -150, -1010, 2, 6, 31), 1.6); vein(g, jag(100, -1000, 140, -1040, 2, 6, 32), 1.6);
    g.fillStyle = '#ffb43c'; for (const [x, y] of [[-430, -1124], [384, -1196], [404, -1052], [-178, -1160], [176, -1192], [-290, -1184], [-120, -1112], [222, -1004], [-446, -1072]]) { g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); } } });
  R.charm = P([0, 0], [-28, -10, 28, 50], [{ draw: g => wolfSkull(g, 0, 16, 1.1), r: 6, h: 10, lo: .8, inkW: .9 }]);
  /* ---- arms: upper (shoulder pivot), fore (elbow), the twig-clawed hand (wrist) ---- */
  for (const k of [-1, 1]) {
    const K = k > 0 ? 'R' : 'L', X = p => [p[0] * k, p[1]], bx = (a, b2, c, d) => k > 0 ? [a, b2, c, d] : [-c, b2, -a, d];
    R['upper' + K] = P(X(AG.sh), bx(140, -780, 370, -460), [
      { draw: g => Fb(g, P2 => vlimb(P2, [[205, -718], [248, -646], [286, -572], [318, -502]].map(X), [84, 64, 50, 56]), skin), amp: .55,
        bump: g => { g.fillStyle = '#d0d0d0'; g.beginPath(); g.ellipse(238 * k, -668, 26, 34, .5 * k, 0, TAU); g.fill(); g.fillStyle = '#404040'; g.beginPath(); g.ellipse(276 * k, -600, 8, 14, .5 * k, 0, TAU); g.fill(); }, bumpAmp: 10 },
      { draw: g => Fb(g, P2 => vell(P2, 322 * k, -502, 34, 28, .3 * k), skin), amp: .65, h: 10, innerInk: true, inkW: .8 },
    ], { over: g => { vein(g, jag(308 * k, -532, 326 * k, -488, 2, 8, 30 + k), 1.8); sk([[[276, -616], [284, -596]].map(X)], 1.6)(g); } });
    R['fore' + K] = P(X(AG.el), bx(250, -540, 370, -270), [
      { draw: g => Fb(g, P2 => vlimb(P2, [[318, -502], [324, -442], [314, -376], [296, -298]].map(X), [58, 58, 44, 34]), skin), amp: .55,
        bump: g => { g.fillStyle = '#cccccc'; g.beginPath(); g.ellipse(324 * k, -446, 18, 40, .1 * k, 0, TAU); g.fill(); }, bumpAmp: 8 },
    ], { over: sk([[[304, -466], [300, -416]].map(X), [[320, -356], [310, -316]].map(X)], 1.6) });
    const fingers = [0, 1, 2, 3].map(i => { const pts = []; let x = 278 + i * 14, y = -248, a = PI / 2 + (i - 1.5) * .22, L = 150 + (1.5 - Math.abs(i - 1.5)) * 34; pts.push([x, y]); for (let j = 0; j < 4; j++) { a += .16 + j * .06; const f = j === 3 ? .55 : 1.15; x += Math.cos(a) * L / 4 * f; y += Math.sin(a) * L / 4 * f; pts.push([x, y]); } return pts; });
    const thumb = (() => { const pts = [[272, -272]]; let x = 272, y = -272, a = PI * .7; for (let j = 0; j < 3; j++) { a -= .15; x += Math.cos(a) * 30; y += Math.sin(a) * 30; pts.push([x, y]); } return pts; })();
    R['hand' + K] = P(X(AG.wr), bx(190, -322, 380, -40), [
      ...fingers.concat([thumb]).map((pts, i) => ({ draw: g => { Fb(g, P2 => vlimb(P2, pts.slice(0, -1).map(X), [19, 16, 17, 13, 14].slice(0, pts.length - 1)), skin); const n = pts.length; Fb(g, P2 => vlimb(P2, [pts[n - 2], pts[n - 1]].map(X), [7, 1.2]), '#1a1210'); }, amp: .6, h: 10 + (i === 4 ? -6 : i), innerInk: true, inkW: .8 })),
      { draw: g => Fc(g, [[276, -308], [316, -308], [328, -282], [326, -252], [306, -240], [280, -244], [270, -274]].map(X), skin), amp: .55, h: 6,
        bump: g => { g.fillStyle = '#d8d8d8'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc((282 + i * 14) * k, -250, 6, 0, TAU); g.fill(); } }, bumpAmp: 8 },
    ], { over: sk([[[282, -294], [298, -278], [312, -292]].map(X)], 1.4) });
  }
  return RIGS.angr = R;
}
RIGPREP.angr = () => rigAngr();
function drawAngr(b) {
  const R = rigAngr(), x = b.x, y = b.y, t = b.t, A = b.an, rage = A.rage.v, sink = A.sink.v, m = A.mouth.v, sw = A.sweep.v;
  const ch = b.ch || (b.ch = { locks: [0, 1, 2, 3, 4, 5].map(i => mkChain(9, 30 + (i % 3) * 5, .1, .9, 300)), charms: [0, 1].map(() => mkChain(4, 26, .02, .96, 420)) });
  const dy = sink * 1000, by = y + dy, breath = Math.sin(t * 1.25), heave = breath * 4 + (rage ? Math.sin(t * 7) * 1.5 : 0);
  const lean = A.lean.v * .12 + Math.sin(t * .6) * .012 + m * -.04;
  const tilt = (px, py) => { const ox = px - AG.waist[0], oy = py - AG.waist[1], c = Math.cos(lean), s = Math.sin(lean); return [AG.waist[0] + ox * c - oy * s, AG.waist[1] + ox * s + oy * c + (py < -600 ? heave * (py < -760 ? 1 : .6) : 0)]; };
  const rp = (spr, p, rot = 0, sx = 1, sy = 1) => rpart(spr, x + p[0], by + p[1], rot, sx, sy);
  const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const GS = .9, gp = (px, py, r, col, al) => glowPost(x + (px - x) * GS, y + (py - y) * GS, r * GS, col, al); // she is drawn at nine-tenths, about her root
  ctx.save(); ctx.translate(x, y); ctx.scale(GS, GS); ctx.translate(-x, -y);
  dropShadow(ctx, x + 30, y + 16, 470, 130, .9);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 3000, y - 4000, 6000, 4000 + 30); ctx.clip();
  // the head carries the hood, and the hood the antler-boughs, so they all turn together
  const hd = tilt(...AG.neck), hrot = lean - m * .1 + Math.sin(t * .8) * .02;
  const onHead = (px, py) => { const q = rot([px - AG.neck[0], py - AG.neck[1]], hrot); return [hd[0] + q[0], hd[1] + q[1]]; };
  const crot = hrot + Math.sin(t * .5) * .01 + (rage ? Math.sin(t * 9) * .006 : 0), cp = onHead(...AG.crown);
  rp(R.crown, cp, crot);
  const cwd = (qx, qy) => { const q = rot([qx - AG.crown[0], qy - AG.crown[1]], crot); return [x + cp[0] + q[0], by + cp[1] + q[1]]; };
  [[-280, -1050], [222, -1004]].forEach((q, i) => { const c = ch.charms[i], rt = cwd(...q); stepChain(c, rt, [0, 1], t, Math.sin(t * .9 + i * 2) * 260 * (1 + rage * 2), 0);
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2.4; ctx.beginPath(); c.p.forEach((p, j) => j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    const e = c.p[c.n - 1], e2 = c.p[c.n - 2]; rpart(R.charm, e[0], e[1], Math.atan2(e[1] - e2[1], e[0] - e2[0]) - PI / 2); });
  rpart(R.rootsB, x, y);
  rp(R.cape, tilt(...AG.neck), lean);
  rp(R.trunk, AG.waist, 0, 1, 1 + breath * .004);
  rp(R.torso, tilt(...AG.waist), lean, 1, 1 + breath * .01);
  rp(R.belt, tilt(...AG.waist), lean);
  rp(R.neck, tilt(...AG.waist), lean);
  // arms: raised overhead to strike (armL/armR), or the left one swept across (sweep)
  const hands = [];
  for (const k of [-1, 1]) {
    const K = k > 0 ? 'R' : 'L', up = A[k > 0 ? 'armR' : 'armL'].v;
    let a1 = -k * up * 2.35 + Math.sin(t * 1.25 + k) * .025, a2 = -k * up * .5;
    if (k < 0) { a1 += sw <= 0 ? -sw * .3 : -sw * 3.7; a2 += sw <= 0 ? -sw * .45 : -sw * .25; } // the claw: overhead, then a great backhand down her side and low across her front
    a1 += lean;
    const sh = tilt(AG.sh[0] * k, AG.sh[1]), e = rot([(AG.el[0] - AG.sh[0]) * k, AG.el[1] - AG.sh[1]], a1), w = rot([(AG.wr[0] - AG.el[0]) * k, AG.wr[1] - AG.el[1]], a1 + a2);
    const ep = [sh[0] + e[0], sh[1] + e[1]], wp = [ep[0] + w[0], ep[1] + w[1]];
    rp(R['upper' + K], sh, a1); rp(R['fore' + K], ep, a1 + a2); rp(R['hand' + K], wp, a1 + a2 + (k < 0 ? sw * .3 : up * .2 * -k));
    hands.push([x + wp[0], by + wp[1], Math.max(up, k < 0 ? -sw : 0)]);
  }
  rp(R.paws, tilt(...AG.waist), lean);
  // the crone's face; the jaw drops and the head rocks back when she screams
  const jp = onHead(...AG.jaw);
  if (m > .05) { ctx.fillStyle = '#160804'; ctx.beginPath(); ctx.ellipse(x + jp[0], by + jp[1] + 2 + m * 14, 30, 3 + m * 18, hrot, 0, TAU); ctx.fill(); gp(x + jp[0], by + jp[1] + 6 + m * 14, 30 + m * 36, '#ff7a1a', m * .7); }
  rp(R.jaw, [jp[0], jp[1] + m * 32], hrot + m * .05);
  rp(R.head, hd, hrot);
  // grey locks falling from under the hood, on springs
  for (let i = 0; i < 6; i++) {
    const k = i < 3 ? -1 : 1, j = i % 3, q = onHead(k * (58 + j * 14), -866 + j * 26), c = ch.locks[i];
    stepChain(c, [x + q[0], by + q[1]], [k * (.06 + j * .12), 1], t, Math.sin(t * 1.5 + i) * 420 + (rage ? Math.sin(t * 6 + i) * 900 : 0) + m * k * 900, k * (j - 1) * .02);
    drawStrands(c.p, 4, 16 - j * 3, 5.5 - j, G.boss && G.boss.flash > 0 ? ['#fff'] : ['#5a5e4e', '#7c806c', '#4a4e40', '#8a8e7a'], '#16120e', i * 3.7);
  }
  ctx.restore();
  rpart(R.rootsF, x, y);
  // glows: eyes, the molten heart, claws heating before a blow
  const pulse = .5 + .5 * Math.sin(t * (2.4 + rage * 3));
  for (const k of [-1, 1]) { const q = onHead(k * 24, -835); gp(x + q[0], by + q[1], 16 + rage * 14, '#ffb347', .95); gp(x + q[0], by + q[1], 4.5, '#ffffff', 1); }
  const hp = tilt(0, -556); gp(x + hp[0], by + hp[1], 70 + pulse * 30 + rage * 40, '#ff8a2b', .5 + pulse * .25 + rage * .2); gp(x + hp[0], by + hp[1], 20, '#fff0c0', .8);
  for (const [hx, hy, k] of hands) if (k > .3) { gp(hx, hy + 80, 80 + rage * 30, '#ff8a2b', (k - .3) * .7); gp(hx, hy + 50, 26, '#ffd27a', (k - .3) * .8); }
  for (const [px, py] of [[-36, -200], [100, -130], [-110, -40], [-70, -310]]) gp(x + px, by + py, 44 + rage * 30, '#ff6a14', .2 + rage * .2 + .05 * Math.sin(t * 3 + px));
  ctx.restore();
  G.lights.push({ x, y: y - 90, r: 560, i: .8 + rage * .2, col: '#ff8a3a' }, { x: x + hp[0] * GS, y: y + (dy + hp[1]) * GS, r: 500, i: .6 + pulse * .15, col: '#ffb070' }, { x: x - 110, y: y + (dy - 860) * GS, r: 640, i: .55, col: '#d8c4b0' });
}
