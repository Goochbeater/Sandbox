/* =====================================================================
   ENVIRONMENT — painted props in three-quarter view: trees with trunks
   and crowns, rocks with planes and caps, ice, bone, wreck and stone.
   ===================================================================== */
function cloudPts(cx, cy, rx, ry, seed, n = 14, amp = .13) { // a lumpy foliage outline
  const pts = [], ph = hash2(seed, 1) * TAU;
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + amp * Math.sin(a * 5 + ph) + amp * .6 * Math.sin(a * 9 + ph * 2) + (hash2(seed, i) - .5) * amp; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return pts;
}
function rockPts(cx, cy, rx, ry, seed, n = 9, jag = .2) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = PI + i / (n - 1) * PI, k = 1 + (hash2(seed, i) - .5) * jag * 2; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (a > PI * 1.2 && a < PI * 1.8 ? 1 : .9)]); }
  pts.push([cx + rx * .9, cy + ry * .12], [cx, cy + ry * .22], [cx - rx * .9, cy + ry * .12]);
  return pts;
}
const groundShadow = (rx, ry, ox = 0, oy = 0, a = .5) => g => { const gr = g.createRadialGradient(ox, oy, 0, ox, oy, rx); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.6, `rgba(0,0,0,${a * .5})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.translate(ox, oy); g.scale(1, ry / rx); g.translate(-ox, -oy); g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, rx, 0, TAU); g.fill(); g.restore(); };
function barkBump(g, pts, w, n = 7) { g.strokeStyle = '#3e3e3e'; g.lineWidth = Math.max(1.2, w * .07); for (let i = 0; i < n; i++) { const f = (i + .5) / n - .5; g.beginPath(); pts.forEach((p, k) => { const x = p[0] + f * w * (1 - k / pts.length * .5) + Math.sin(k * 2 + i) * 1.5; k ? g.lineTo(x, p[1]) : g.moveTo(x, p[1]); }); g.stroke(); } }

/* ---------------- trees ---------------- */
function pTree(seed, kind) {
  const R = mulberry(seed);
  const K = {
    iron: { bark: '#3a2e28', leaf: ['#5a1e14', '#6e2818', '#4a1810', '#7a3218'], h: 118 + R() * 36, w: 22 + R() * 7, crown: 62 + R() * 18, glow: R() < .35, rim: '#ffb070' },
    birch: { bark: '#e4ded2', leaf: ['#c8962e', '#d8aa3e', '#b07a24', '#e2be5a'], h: 104 + R() * 30, w: 13 + R() * 4, crown: 54 + R() * 14, rim: '#ffe2b0' },
    char: { bark: '#241a16', leaf: null, h: 70 + R() * 30, w: 18 + R() * 5, crown: 0, glow: true, rim: '#ff8a4a' },
  }[kind];
  const h = K.h, w = K.w, lean = (R() - .5) * 16, top = [lean, -h];
  const trunk = [[0, 0], [lean * .2 + (R() - .5) * 6, -h * .35], [lean * .6 + (R() - .5) * 6, -h * .7], top];
  const limbs = [];
  const nl = kind === 'char' ? 4 : 5;
  for (let i = 0; i < nl; i++) { const a = -PI / 2 + (i - (nl - 1) / 2) * .55 + (R() - .5) * .3, L = (kind === 'char' ? 34 : K.crown * .45) * (.7 + R() * .4), b = trunk[2 + (i % 2)]; const m = [b[0] + Math.cos(a) * L * .5, b[1] + Math.sin(a) * L * .5 - 6], e = [b[0] + Math.cos(a) * L, b[1] + Math.sin(a) * L * .8]; limbs.push([b, m, e]); }
  const cy = -h - K.crown * .32, clumps = [];
  if (K.leaf) {
    const nc = 7 + (R() * 3 | 0);
    for (let i = 0; i < nc; i++) { const a = PI + (i + .5) / nc * PI, rr = K.crown * (.42 + R() * .14); clumps.push([lean + Math.cos(a) * K.crown * .5, cy + Math.sin(a) * K.crown * .32 + 10, rr, i]); }
    clumps.push([lean, cy - K.crown * .1, K.crown * .5, nc]);
    for (let i = 0; i < 3; i++) clumps.push([lean + (i - 1) * K.crown * .4, cy + K.crown * .2, K.crown * .36, nc + 1 + i]);
  }
  const span = Math.max(K.crown * 1.2, 70), x0 = -span, x1 = span, y0 = Math.min(-h - 40, cy - K.crown * .9) - 10, y1 = 22;
  const layers = [
    { draw: g => { Fp(g, P => { for (let i = 0; i < 6; i++) { const a = PI * (.08 + i / 5 * .84), L = w * (1 + R() * .8); vlimb(P, [[Math.cos(a) * w * .2, -4], [Math.cos(a) * w * .8, Math.sin(a) * 5], [Math.cos(a) * L, Math.sin(a) * 8 + 4]], [w * .55, w * .3, 2]); } }, K.bark); }, r: 4, amp: .9 },
    { draw: g => { Fp(g, P => vlimb(P, trunk, [w * 1.1, w * .85, w * .68, w * .5]), K.bark); if (kind === 'birch') { g.fillStyle = '#2a2622'; for (let i = 0; i < 14; i++) { const k = R(), p = trunk[Math.min(3, (k * 3) | 0)]; g.beginPath(); g.ellipse(lerp(0, lean, k) + (R() - .5) * w * .5, -k * h, 2 + R() * 4, 1 + R(), 0, 0, TAU); g.fill(); } } },
      amp: .9, grain: .28, bump: g => barkBump(g, trunk, w, kind === 'birch' ? 3 : 7), bumpAmp: 2.2 },
    { draw: g => Fp(g, P => { for (const L of limbs) vlimb(P, L, [w * .42, w * .26, 1.6]); }, K.bark), amp: .9 },
  ];
  if (K.leaf) clumps.forEach(([x, y, r, i]) => layers.push({
    draw: g => { Fp(g, P => vcr(P, cloudPts(x, y, r, r * .8, seed * 7 + i, 16, .12)), K.leaf[i % K.leaf.length]);
      g.fillStyle = 'rgba(255,200,130,.16)'; for (let k = 0; k < 26; k++) { const a = hash2(i, k) * TAU, d = hash2(k, i) * r * .85; const P = new Path2D(); vleaf(P, x + Math.cos(a) * d, y + Math.sin(a) * d * .8, hash2(k, i + 7) * TAU, 5 + hash2(i + k, 3) * 4, 2.4); g.fill(P); } },
    amp: .7, h: 16 + i * 1.5, grain: .3, vary: .22, innerInk: true, inkW: .8,
    bump: g => { g.fillStyle = '#a4a4a4'; for (let k = 0; k < 34; k++) { const a = hash2(i * 3, k) * TAU, d = hash2(k, i * 3) * r * .9; const P = new Path2D(); vleaf(P, x + Math.cos(a) * d, y + Math.sin(a) * d * .8, hash2(k, i * 5) * TAU, 7 + hash2(k, i) * 5, 4); g.fill(P); } }, bumpAmp: 2,
  }));
  const spr = paintSprite({ box: [x0, y0, x1, y1], s: 1.8, rim: K.rim, rimA: .55, macro: K.leaf ? .2 : 0, inkW: 2.2,
    under: groundShadow(span * .75, 20, 10, 4, .45),
    over: K.glow ? g => { g.strokeStyle = '#ff8a2a'; g.lineWidth = 1.6; g.shadowColor = '#ff6a1a'; g.shadowBlur = 8; for (let i = 0; i < 4; i++) { let x = (R() - .5) * w * .5, y = -4; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { y -= h * .1 + R() * 6; x += (R() - .5) * 6; g.lineTo(x + lean * (-y / h), y); } g.stroke(); } g.shadowBlur = 0; } : null,
    layers });
  spr.tree = K.leaf ? 1 : 0; spr.glowy = !!K.glow && kind === 'iron'; spr.cy = cy; spr.canopy = K.leaf ? K.crown * .95 : 0; spr.top = y0;
  return spr;
}
function pPine(seed) {
  const R = mulberry(seed), h = 150 + R() * 50, tiers = 6 + (R() * 2 | 0), wmax = 66 + R() * 14, lean = (R() - .5) * 6;
  const layers = [{ draw: g => Fp(g, P => vlimb(P, [[0, 0], [lean, -h * .4]], [12, 9]), '#3a2a22'), r: 4 }];
  for (let k = 0; k < tiers; k++) {
    const f = k / (tiers - 1), y = -h * .16 - f * h * .78, wv = wmax * (1 - f * .82), dr = 12 + (1 - f) * 8, x = lean * (1 - f * .5);
    layers.push({ draw: g => {
      Fp(g, P => { vcr(P, [[x - wv, y + dr], [x - wv * .55, y - 4], [x, y - h * .2], [x + wv * .55, y - 4], [x + wv, y + dr], [x + wv * .5, y + dr * .5], [x, y + dr * .8], [x - wv * .5, y + dr * .5]]); }, '#24423c');
      Fp(g, P => { vcr(P, [[x - wv * .9, y + dr * .55], [x - wv * .5, y - 8], [x, y - h * .19], [x + wv * .5, y - 8], [x + wv * .9, y + dr * .55], [x + wv * .45, y - 2], [x, y - h * .06], [x - wv * .45, y - 2]]); for (let i = 0; i < 6; i++) vpoly(P, [[x - wv * .7 + i * wv * .28, y + 2 - Math.abs(i - 2.5) * 2], [x - wv * .7 + i * wv * .28 + 3, y + 2 - Math.abs(i - 2.5) * 2], [x - wv * .7 + i * wv * .28 + 1.5, y + 9 + (i % 2) * 5]]); }, '#eef4f8');
    }, amp: .6, h: k * 6, innerInk: true, inkW: .8, gloss: .5, grain: .2,
      bump: g => { g.strokeStyle = '#555'; g.lineWidth = 1.4; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(x + (i - 4) * wv * .2, y + dr); g.lineTo(x + (i - 4) * wv * .1, y - 4); g.stroke(); } }, bumpAmp: 2 });
  }
  const spr = paintSprite({ box: [-wmax - 6, -h * 1.05 - 10, wmax + 6, 20], s: 1.8, rim: '#e0f4ff', rimA: .6, inkW: 2, under: groundShadow(wmax * .9, 18, 8, 4, .4), layers });
  spr.tree = 1; spr.cy = -h * .55; spr.canopy = wmax * .9; spr.top = -h;
  return spr;
}

/* ---------------- stone ---------------- */
function pRock(seed, pal, size, cap) {
  const R = mulberry(seed), rx = size * (1.1 + R() * .3), ry = size * (.9 + R() * .3);
  const body = rockPts(0, 0, rx, ry, seed, 9, .18);
  const layers = [
    { draw: g => { Fp(g, P => vcr(P, body), pal.rock); g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse((R() - .5) * rx * 1.4, -R() * ry * .9, 3 + R() * 6, 2 + R() * 3, R() * 3, 0, TAU); g.fill(); } },
      amp: .85, grain: .3, vary: .25, hatch: .35,
      bump: g => { g.strokeStyle = '#444'; g.lineWidth = Math.max(1.5, size * .06); for (let i = 0; i < 3; i++) { const x = (R() - .5) * rx, y = -R() * ry * .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * rx * .5, y + ry * .3); g.lineTo(x + (R() - .5) * rx * .4, y + ry * .55); g.stroke(); } }, bumpAmp: 3 },
    { draw: g => Fp(g, P => vcr(P, [[-rx * .6, -ry * .62], [-rx * .1, -ry * .98], [rx * .5, -ry * .8], [rx * .2, -ry * .5], [-rx * .3, -ry * .45]]), mix(pal.rockL, pal.rock, .3)), amp: .4, h: 3, flat: true, r: 6, grain: .3 },
  ];
  if (cap === 'moss') layers.push({ draw: g => Fp(g, P => { vcr(P, [[-rx * .7, -ry * .55], [-rx * .2, -ry * 1.02], [rx * .55, -ry * .78], [rx * .3, -ry * .58], [-rx * .1, -ry * .66]]); for (let i = 0; i < 5; i++) vleaf(P, -rx * .5 + i * rx * .25, -ry * .58, PI / 2 + (R() - .5) * .4, 6 + R() * 8, 3); }, '#5c7a34'), amp: .5, h: 6, grain: .4 });
  if (cap === 'snow') layers.push({ draw: g => Fp(g, P => vcr(P, [[-rx * .85, -ry * .45], [-rx * .3, -ry * 1.04], [rx * .5, -ry * .9], [rx * .9, -ry * .4], [rx * .4, -ry * .55], [0, -ry * .48], [-rx * .45, -ry * .38]]), '#eef4fa'), amp: .55, h: 6, gloss: .5 });
  return paintSprite({ box: [-rx * 1.3, -ry * 1.3, rx * 1.3, ry * .5], s: 2, rim: pal.rim || '#ffe2bc', rimA: .5, inkW: 2, under: groundShadow(rx * 1.2, ry * .45, 4, ry * .1, .45), layers });
}
function pStump(seed) {
  const R = mulberry(seed), rr = 14 + R() * 6;
  return paintSprite({ box: [-rr * 2, -rr * 1.6, rr * 2, rr * .7], s: 2.4, rim: '#ffb070', inkW: 2, under: groundShadow(rr * 1.7, rr * .5, 3, 2, .4), layers: [
    { draw: g => Fp(g, P => { vcr(P, [[-rr, 0], [-rr * .95, -rr * .9], [rr * .95, -rr * .9], [rr, 0], [0, rr * .3]]); for (let i = 0; i < 5; i++) { const a = PI * (.1 + i * .2); vlimb(P, [[Math.cos(a) * rr * .6, -2], [Math.cos(a) * rr * 1.6, Math.sin(a) * 4 + 4]], [7, 2]); } }, '#3e3026'), amp: .8, bump: g => barkBump(g, [[0, 0], [0, -rr * .9]], rr * 1.6, 6), bumpAmp: 1.6 },
    { draw: g => { Fp(g, P => vell(P, 0, -rr * .9, rr * .95, rr * .38), '#a07a4e'); g.strokeStyle = '#6e4e30'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.ellipse(0, -rr * .9, rr * .95 * i / 5, rr * .38 * i / 5, 0, 0, TAU); g.stroke(); } }, r: 3, amp: .3, h: 4 },
  ] });
}
function pReeds(seed, pale) {
  const R = mulberry(seed), n = 9 + (R() * 6 | 0), col = pale ? '#9a9a72' : '#5e6a34';
  return paintSprite({ box: [-22, -42, 22, 6], s: 2.4, rim: '#fff0c0', inkW: 1.2, layers: [
    { draw: g => Fp(g, P => { for (let i = 0; i < n; i++) vleaf(P, (R() - .5) * 18, 2, -PI / 2 + (R() - .5) * .8, 22 + R() * 18, 3 + R() * 2, (R() - .5) * 8); }, col), amp: .6, grain: .3, innerInk: false },
  ] });
}
function pCrystals(seed) {
  const R = mulberry(seed), n = 3 + (R() * 3 | 0), cs = [];
  for (let i = 0; i < n; i++) cs.push([(i - (n - 1) / 2) * 11 + (R() - .5) * 6, (R() - .5) * 8, 30 + R() * 46, 7 + R() * 5, (i - (n - 1) / 2) * .22 + (R() - .5) * .2]);
  cs.sort((a, b) => a[2] - b[2]);
  return paintSprite({ box: [-46, -96, 46, 14], s: 2.2, rim: '#e8fbff', rimA: .8, inkW: 1.6, ink: '#2a5070', under: groundShadow(40, 12, 4, 4, .35), layers: cs.map(([x, y, L, w, a]) => ({
    draw: g => { const ca = Math.cos(a), sa = Math.sin(a), tip = [x + sa * L, y - ca * L], P = pth(P => vpoly(P, [[x - w * ca, y - w * sa], [x + w * ca, y + w * sa], [x + w * ca + sa * L * .8, y + w * sa - ca * L * .8], tip, [x - w * ca + sa * L * .8, y - w * sa - ca * L * .8]]));
      g.fillStyle = '#8fd6f2'; g.fill(P); g.save(); g.clip(P); g.fillStyle = '#d8f6ff'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * ca, y + w * sa); g.lineTo(x + w * ca + sa * L * .8, y + w * sa - ca * L * .8); g.lineTo(tip[0], tip[1]); g.fill(); g.restore(); },
    r: 3, amp: .6, spec: 1.2, shine: 30, gloss: .9, inkCol: '#2a5070',
  })) });
}
function pBerg(seed) {
  const R = mulberry(seed), rx = 60 + R() * 30, hh = 70 + R() * 50;
  const pts = [[-rx, 4], [-rx * .9, -hh * .4], [-rx * .5, -hh * .9], [-rx * .1, -hh], [rx * .3, -hh * .8], [rx * .7, -hh * .55], [rx, -hh * .1], [rx * .9, 6], [0, 12]];
  return paintSprite({ box: [-rx * 1.2, -hh * 1.15, rx * 1.2, 26], s: 1.6, rim: '#e8fbff', rimA: .7, inkW: 2.2, ink: '#1e3a52', under: g => { g.fillStyle = 'rgba(10,30,50,.35)'; g.beginPath(); g.ellipse(0, 10, rx * 1.15, 18, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(220,245,255,.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 8, rx * 1.1, 14, 0, PI * .05, PI * .95); g.stroke(); }, layers: [
    { draw: g => { Fp(g, P => vpoly(P, pts), '#9cc8e0'); g.fillStyle = 'rgba(40,90,140,.35)'; g.beginPath(); g.moveTo(rx * .3, -hh * .8); g.lineTo(rx, -hh * .1); g.lineTo(rx * .9, 6); g.lineTo(rx * .1, 0); g.fill(); }, amp: .5, spec: .8, shine: 26, gloss: .7, hatch: .2,
      bump: g => grooves(g, '#555', 3, [[-rx * .5, -hh * .9, -rx * .4, -hh * .4], [-rx * .1, -hh, rx * .1, -hh * .3], [rx * .3, -hh * .8, rx * .5, -hh * .2]]), bumpAmp: 4 },
    { draw: g => Fp(g, P => vcr(P, [[-rx * .85, -hh * .42], [-rx * .5, -hh * .92], [-rx * .1, -hh * 1.02], [rx * .3, -hh * .82], [rx * .66, -hh * .56], [rx * .2, -hh * .62], [-rx * .3, -hh * .55]]), '#f2f8fc'), amp: .5, h: 6, gloss: .6 },
  ] });
}
function pRibs(seed) {
  const R = mulberry(seed), n = 5, bone = '#d8cfba';
  return paintSprite({ box: [-80, -90, 80, 16], s: 2, rim: '#e8f4ff', inkW: 1.8, under: groundShadow(76, 16, 4, 4, .4), layers: [
    { draw: g => Fp(g, P => { vlimb(P, [[-72, 2], [-30, -2], [10, 0], [56, -4], [72, 2]], [10, 12, 12, 10, 6]); for (let i = 0; i < 9; i++) vcirc(P, -60 + i * 15, -1, 6); }, bone), amp: .8, h: 0, grain: .3 },
    ...[0, 1, 2, 3, 4].map(i => ({ draw: g => Fp(g, P => { for (const sd of [-1, 1]) { const x = -46 + i * 22, hgt = 70 - Math.abs(i - 2) * 9 + R() * 10; vlimb(P, [[x, 0], [x + sd * 14, -hgt * .5], [x + sd * 10, -hgt * .85], [x + sd * 2, -hgt]], [7, 6, 4.4, 2]); } }, bone), amp: .8, h: 4 + i, grain: .3, innerInk: true })),
  ] });
}
function pWreck(seed) {
  const R = mulberry(seed);
  return paintSprite({ box: [-90, -110, 90, 20], s: 1.8, rim: '#e8f4ff', inkW: 2, under: groundShadow(86, 18, 6, 6, .45), layers: [
    { draw: g => { Fp(g, P => vcr(P, [[-84, 0], [-70, -30], [-20, -40], [40, -38], [76, -28], [86, 2], [30, 12], [-40, 12]]), '#3a2e26'); g.strokeStyle = '#1e1612'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-80, -6 - i * 8); g.quadraticCurveTo(0, -12 - i * 9, 82, -4 - i * 7); g.stroke(); } }, amp: .6, grain: .35, bump: g => { g.strokeStyle = '#555'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-80, -6 - i * 8); g.quadraticCurveTo(0, -12 - i * 9, 82, -4 - i * 7); g.stroke(); } }, bumpAmp: 2 },
    { draw: g => Fp(g, P => { vlimb(P, [[70, -26], [86, -60], [88, -96], [80, -106], [72, -100]], [12, 10, 8, 6, 3]); }, '#3e3028'), amp: .8, h: 6 },
    { draw: g => Fp(g, P => { vlimb(P, [[-8, -34], [-14, -100]], [7, 5]); vpoly(P, [[-14, -98], [-2, -96], [6, -70], [-12, -72]]); }, '#4a3a2e'), amp: .8, h: 10 },
    { draw: g => { Fp(g, P => vcr(P, [[-12, -96], [6, -94], [26, -80], [10, -64], [-8, -70]]), '#7a3226'); g.strokeStyle = '#d8c8a8'; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, -92); g.lineTo(14, -70); g.stroke(); }, amp: .4, h: 12, grain: .4 },
  ] });
}
function pStone(seed, glow) {
  const R = mulberry(seed), hh = 54 + R() * 26, w = 18 + R() * 6, col = glow ? '#4a4c56' : '#6a6c70';
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  return paintSprite({ box: [-w - 10, -hh - 12, w + 10, 12], s: 2.2, rim: '#e8f0ff', inkW: 1.8, under: groundShadow(w * 1.6, 10, 4, 3, .45), layers: [
    { draw: g => Fp(g, P => vcr(P, [[-w, 2], [-w * 1.05, -hh * .5], [-w * .8, -hh * .9], [-w * .2, -hh * 1.04], [w * .5, -hh], [w, -hh * .7], [w * .95, -hh * .2], [w, 2], [0, 5]]), col), amp: .55, grain: .32, vary: .25, hatch: .3,
      bump: g => { g.fillStyle = '#3a3a3a'; g.font = `${w * .9}px serif`; g.textAlign = 'center'; for (let i = 0; i < 3; i++) g.fillText(runes[(seed * 3 + i) % runes.length], (R() - .5) * 4, -hh * .72 + i * hh * .24); }, bumpAmp: 2.4 },
    { draw: g => { g.fillStyle = '#7a8a4a'; g.globalAlpha = .7; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse((R() - .5) * w * 1.4, -R() * hh * .4, 3 + R() * 6, 2 + R() * 3, 0, 0, TAU); g.fill(); } }, r: 2, h: 1, ink: false, grain: .5 },
  ], over: glow ? g => { g.fillStyle = '#9fe0ff'; g.shadowColor = '#7fd0ff'; g.shadowBlur = 8; g.font = `${w * .9}px serif`; g.textAlign = 'center'; for (let i = 0; i < 3; i++) g.fillText(runes[(seed * 3 + i) % runes.length], 0, -hh * .72 + i * hh * .24); g.shadowBlur = 0; } : null });
}
function pObsidian(seed) {
  const R = mulberry(seed), n = 3 + (R() * 3 | 0), sh = [];
  for (let i = 0; i < n; i++) sh.push([(i - (n - 1) / 2) * 16 + (R() - .5) * 8, 60 + R() * 90, 10 + R() * 9, (R() - .5) * .4]);
  sh.sort((a, b) => a[1] - b[1]);
  return paintSprite({ box: [-70, -170, 70, 16], s: 1.8, rim: '#ff9a5a', rimA: .8, inkW: 2, under: groundShadow(60, 14, 4, 4, .5), layers: sh.map(([x, L, w, a]) => ({
    draw: g => { const ca = Math.cos(a), sa = Math.sin(a); Fp(g, P => vpoly(P, [[x - w, 4], [x + w, 4], [x + w * .7 + sa * L * .7, -ca * L * .7], [x + sa * L, -ca * L], [x - w * .8 + sa * L * .6, -ca * L * .6]]), '#1e1a22'); g.fillStyle = 'rgba(120,110,160,.35)'; g.beginPath(); g.moveTo(x, 4); g.lineTo(x + sa * L, -ca * L); g.lineTo(x - w * .8 + sa * L * .6, -ca * L * .6); g.lineTo(x - w, 4); g.fill(); },
    r: 3, amp: .5, spec: 1.4, shine: 40, gloss: 1, h: 0,
  })), over: g => { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0, 2, 0, 0, 2, 44); gr.addColorStop(0, 'rgba(255,110,40,.3)'); gr.addColorStop(1, 'rgba(255,110,40,0)'); g.fillStyle = gr; g.save(); g.translate(0, 2); g.scale(1, .3); g.beginPath(); g.arc(0, 0, 44, 0, TAU); g.restore(); g.fill(); } });
}
function pSwords(seed) {
  const R = mulberry(seed), n = 4 + (R() * 4 | 0), sw = [];
  for (let i = 0; i < n; i++) sw.push([(R() - .5) * 60, (R() - .5) * 18, 34 + R() * 16, (R() - .5) * .7]);
  sw.sort((a, b) => a[1] - b[1]);
  return paintSprite({ box: [-56, -66, 56, 22], s: 2.2, rim: '#ffb070', inkW: 1.5, under: groundShadow(50, 14, 2, 4, .4), layers: sw.map(([x, y, L, a]) => ({
    draw: g => { g.save(); g.translate(x, y); g.rotate(a); Fp(g, P => vcr(P, [[-3.6, 0], [-3.2, -L], [0, -L - 5], [3.2, -L], [3.6, 0]]), '#5e6068'); Fp(g, P => { vpoly(P, [[-8, -L - 1], [8, -L - 1], [8, -L - 4], [-8, -L - 4]]); vpoly(P, [[-1.6, -L - 4], [1.6, -L - 4], [1.6, -L - 13], [-1.6, -L - 13]]); vcirc(P, 0, -L - 14, 2.6); }, '#3a2a1e'); g.restore(); },
    r: 1.6, amp: .9, spec: .8, shine: 18, h: y * .2,
  })), over: g => { g.globalCompositeOperation = 'lighter'; for (const [x, y] of sw) { const gr = g.createRadialGradient(x, y, 0, x, y, 10); gr.addColorStop(0, 'rgba(255,120,40,.7)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(x - 10, y - 10, 20, 20); } } });
}
function pBasalt(seed) {
  const R = mulberry(seed), n = 3 + (R() * 3 | 0), cols = [];
  for (let i = 0; i < n; i++) cols.push([(i - (n - 1) / 2) * 15 + (R() - .5) * 4, (i % 2) * 6, 26 + R() * 40, 8 + R() * 2]);
  cols.sort((a, b) => a[1] - b[1]);
  return paintSprite({ box: [-52, -84, 52, 18], s: 2.2, rim: '#ff9a5a', inkW: 1.6, under: groundShadow(46, 12, 3, 5, .45), layers: cols.map(([x, y, L, w]) => ({
    draw: g => { Fp(g, P => vpoly(P, [[x - w, y], [x - w, y - L], [x - w * .5, y - L - w * .45], [x + w * .5, y - L - w * .45], [x + w, y - L], [x + w, y], [x + w * .5, y + w * .45], [x - w * .5, y + w * .45]]), '#2e2624');
      Fp(g, P => vpoly(P, [[x - w, y - L], [x - w * .5, y - L - w * .45], [x + w * .5, y - L - w * .45], [x + w, y - L], [x + w * .5, y - L + w * .45], [x - w * .5, y - L + w * .45]]), '#4a3e3a');
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + w * .1, y - L, w * .9, L); },
    r: 2, amp: .4, flat: true, h: y * .3, hatch: .3,
  })) });
}
/* ---------------- each realm's set ---------------- */
function realmSprites(id) {
  if (SPRC[id]) return SPRC[id];
  const s = { big: [], mid: [], small: [], deco: [] };
  if (id === 'iron') { for (let i = 0; i < 6; i++) s.big.push(pTree(500 + i, 'iron')); for (let i = 0; i < 4; i++) s.mid.push(pRock(600 + i, PAL.iron, 20 + i * 6, i % 2 ? 'moss' : null)); for (let i = 0; i < 2; i++) s.small.push(pStump(650 + i)); for (let i = 0; i < 3; i++) s.deco.push(pReeds(700 + i, i % 2)); }
  if (id === 'ice') { for (let i = 0; i < 5; i++) s.big.push(pPine(800 + i)); for (let i = 0; i < 4; i++) s.mid.push(pCrystals(900 + i)); for (let i = 0; i < 3; i++) s.small.push(pRock(950 + i, PAL.ice, 18 + i * 8, 'snow')); }
  if (id === 'sea') { for (let i = 0; i < 4; i++) s.big.push(pBerg(1000 + i)); s.mid.push(pRibs(1100), pRibs(1101), pWreck(1150), pWreck(1151)); for (let i = 0; i < 3; i++) s.small.push(pStone(1200 + i, i === 0)); for (let i = 0; i < 2; i++) s.deco.push(pReeds(1250 + i, 1)); }
  if (id === 'fire') { for (let i = 0; i < 4; i++) s.big.push(pObsidian(1300 + i)); for (let i = 0; i < 3; i++) s.mid.push(pSwords(1400 + i)); for (let i = 0; i < 3; i++) s.small.push(pBasalt(1500 + i)); for (let i = 0; i < 3; i++) s.deco.push(pTree(1550 + i, 'char')); }
  if (id === 'hub') { for (let i = 0; i < 4; i++) s.big.push(pTree(1600 + i, 'birch')); for (let i = 0; i < 3; i++) s.mid.push(pRock(1700 + i, PAL.hub, 20 + i * 8, 'moss')); for (let i = 0; i < 3; i++) s.small.push(pStone(1800 + i, i === 1)); }
  if (id === 'utgard') { for (let i = 0; i < 4; i++) s.big.push(pRock(1900 + i, PAL.utgard, 36 + i * 8)); }
  return SPRC[id] = s;
}

/* broken plates of ice lying where the frost-king has walked */
let ICESHARDS = null;
function iceShards() {
  if (ICESHARDS) return ICESHARDS;
  ICESHARDS = [];
  for (let k = 0; k < 5; k++) {
    const R = mulberry(3100 + k), n = 2 + (R() * 3 | 0), pcs = [];
    for (let i = 0; i < n; i++) { const cx = (R() - .5) * 40, cy = (R() - .5) * 14, sz = 10 + R() * 18, a0 = R() * TAU, pts = []; for (let j = 0; j < 5; j++) { const a = a0 + j / 5 * TAU + (R() - .5) * .6, rr = sz * (.6 + R() * .6); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .55 - sz * .35]); } pcs.push(pts); }
    ICESHARDS.push(paintSprite({ box: [-50, -40, 50, 20], s: 2, soft: 1, lo: .86, shade: [.84, .92, 1], ink: '#6a8aa6', inkW: 1.2, under: groundShadow(40, 10, 4, 4, .25),
      layers: pcs.map((pts, i) => ({ draw: g => { Fp(g, P => vpoly(P, pts), i % 2 ? '#e8f4fb' : '#cfe4f2'); g.fillStyle = 'rgba(120,160,200,.35)'; const P2 = new Path2D(); vpoly(P2, [pts[0], pts[1], [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2 + 4]]); g.fill(P2); }, amp: .3, h: i * 2, glow: .15 })) }));
  }
  return ICESHARDS;
}
