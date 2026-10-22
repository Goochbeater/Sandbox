/* =====================================================================
   WORLD — realms, procedural maps, props, collision
   ===================================================================== */
const G = {
  scene: null, t: 0, rt: 0, ts: 1, slowT: 0, hitstop: 0, playing: false,
  world: null, enemies: [], proj: [], haz: [], picks: [], parts: [], decals: [], texts: [], npcs: [], fx: [],
  boss: null, decoy: null, trial: null, lights: [], cs: null, csWait: null, menu: false, lock: false,
  weather: [], motes: [], interact: null, fade: 0, fadeTo: 0, fadeSp: 2, flash: 0, flashCol: '#ffffff',
  explored: {}, vig: null, vigT: 0, hurtV: 0, lightning: 0,
};
const SS = 1.35; // sprite supersample (px per world unit)

const PAL = {
  iron: { rock: '#4a4038', rockL: '#7a6a5c', rockD: '#1e1814', ink: '#120c09', glow: '#ff8a2b' },
  ice: { rock: '#5a6b7c', rockL: '#93a7ba', rockD: '#26313e', ink: '#152536', glow: '#9fe0ff' },
  sea: { rock: '#4c5866', rockL: '#7f909f', rockD: '#1d252e', ink: '#0d1622', glow: '#bfe6ff' },
  fire: { rock: '#2e2120', rockL: '#5a403a', rockD: '#0e0807', ink: '#080303', glow: '#ff6a1f' },
  hub: { rock: '#4a4c50', rockL: '#7c7f84', rockD: '#1c1e22', ink: '#0b0a09', glow: '#ff9a3c' },
  utgard: { rock: '#2c332e', rockL: '#4a554c', rockD: '#0e120f', ink: '#070a08', glow: '#8fe36a' },
  sky: { rock: '#a89a80', rockL: '#f2e8d4', rockD: '#5a4a38', ink: '#3a2e20', glow: '#ffe6a0' },
};
/* how each place is lit: ambient multiply colour, fog colour/strength, ground mode */
const LOOK = {
  iron: { amb: [176, 156, 142], fog: ['#7c7068', .34], mode: 'iron', void: '#0a0806' },
  ice: { amb: [212, 222, 238], fog: ['#eef5fc', .34], mode: 'ice', void: '#2a3440' },
  sea: { amb: [170, 184, 206], fog: ['#a2b2c2', .3], mode: 'sea', void: '#05080c' },
  fire: { amb: [172, 126, 110], fog: ['#7a3420', .26], mode: 'fire', void: '#080302' },
  hub: { amb: [128, 136, 172], fog: ['#5a6890', .14], mode: 'hub', void: '#04060c' },
  utgard: { amb: [130, 160, 128], fog: ['#3a6a3a', .32], mode: 'utgard', void: '#020503' },
  sky: { amb: [255, 248, 236], fog: ['#fff6e2', .32], mode: 'sky', void: '#d8c8a8' },
};

/* Node layout shared by all four realms (same story beats, different geography) */
const NODE_T = ['start', 'well', 'camp', 'lore', 'chest', 'altar', 'shrine', 'well', 'camp', 'shrine2', 'apple', 'altar', 'lore', 'lore', 'chest', 'feather', 'lore', 'camp', 'gate', 'chest', 'camp'];
const LORE_OF = { 3: 0, 12: 1, 16: 2, 13: 3 }, RUNE_OF = { 5: 0, 11: 1 };
const CLEAR = { start: 170, well: 150, camp: 230, lore: 110, chest: 110, altar: 320, shrine: 160, shrine2: 160, apple: 140, feather: 120, gate: 280 };

const REALMS = {
  iron: {
    id: 'iron', idx: 0, seed: 1101, W: 3000, H: 3000, name: 'Járnviðr', en: 'The Iron Wood',
    norse: 'Austr sat in aldna í Járnviði ok fœddi þar Fenris kindir.', tr: 'East sat the old one in the Iron Wood, and bred there the brood of Fenrir.', src: 'Völuspá · 40',
    music: 'iron', amb: 'embers', boss: 'angr', tier: 0, motes: 'ember',
    foes: { grunt: 'draugr', beast: 'varg', caster: 'hag', brute: 'troll' }, shrines: ['thor', 'freyja'],
    nodes: [[1500, 2800], [1500, 2450], [1100, 2250], [800, 2550], [450, 2700], [650, 1750], [1050, 1250], [1500, 1450], [1900, 2150], [2350, 2350], [2650, 1950], [2350, 1250], [1200, 1850], [2050, 650], [2700, 2700], [380, 450], [650, 900], [1500, 950], [1500, 380], [2650, 700], [2300, 1700]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 12], [12, 5], [5, 6], [6, 7], [1, 8], [8, 9], [9, 10], [10, 20], [20, 11], [11, 7], [7, 17], [17, 18], [6, 16], [16, 15], [11, 13], [13, 19], [9, 14], [12, 7]],
  },
  ice: {
    id: 'ice', idx: 1, seed: 2202, W: 3000, H: 3000, name: 'Élivágar', en: 'The Storm-Waves of Ice',
    norse: 'Ór Élivágum stukku eitrdropar, svá óx unz varð jötunn.', tr: 'Out of Élivágar sprang drops of venom, and grew, until there was a giant.', src: 'Vafþrúðnismál · 31',
    music: 'ice', amb: 'wind', boss: 'thrym', tier: 1, motes: 'snow',
    foes: { grunt: 'frostdraugr', beast: 'hrimvarg', caster: 'wight', brute: 'thurs' }, shrines: ['heimdall'],
    nodes: [[350, 2700], [700, 2400], [1150, 2500], [1500, 2750], [1950, 2780], [2150, 2300], [2600, 2000], [1500, 1650], [550, 1900], [300, 1450], [550, 950], [1000, 1150], [1450, 2150], [1500, 850], [2700, 2700], [2780, 1300], [2300, 1550], [2000, 1100], [2550, 420], [1150, 450], [850, 1500]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 14], [2, 12], [12, 5], [5, 6], [6, 16], [16, 15], [16, 7], [12, 7], [1, 8], [8, 9], [8, 20], [9, 10], [10, 11], [20, 11], [11, 7], [11, 13], [13, 19], [7, 17], [13, 17], [17, 18], [6, 14]],
  },
  sea: {
    id: 'sea', idx: 2, seed: 3303, W: 3000, H: 3000, name: 'Nástrǫnd', en: 'The Corpse-Shore',
    norse: 'Sal sá hon standa sólu fjarri Náströndu á; norðr horfa dyrr.', tr: 'A hall she saw standing far from the sun, on Corpse-Shore; its doors look north.', src: 'Völuspá · 38',
    music: 'sea', amb: 'storm', boss: 'nidhogg', tier: 2, motes: 'rain',
    foes: { grunt: 'corpse', beast: 'garm', caster: 'drowned', brute: 'seatroll' }, shrines: ['loki'],
    nodes: [[300, 1500], [650, 1500], [900, 1150], [700, 750], [400, 450], [1300, 700], [1850, 500], [1700, 1500], [950, 1900], [700, 2350], [1100, 2650], [1650, 2300], [1250, 1200], [2250, 2100], [300, 2700], [2700, 2750], [2500, 800], [2200, 1500], [2720, 1500], [2650, 2420], [1350, 2200]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 12], [12, 5], [5, 6], [6, 16], [16, 17], [12, 7], [1, 8], [8, 9], [9, 14], [9, 10], [10, 20], [8, 20], [20, 11], [11, 7], [11, 13], [13, 19], [19, 15], [7, 17], [17, 18], [13, 17]],
  },
  fire: {
    id: 'fire', idx: 3, seed: 4404, W: 3000, H: 3000, name: 'Múspellsgjá', en: 'The Rift of Múspell',
    norse: 'Surtr ferr sunnan með sviga lævi; skínn af sverði sól valtíva.', tr: 'Surtr comes from the south with the bane of branches; from his sword shines the sun of the slain-gods.', src: 'Völuspá · 52',
    music: 'fire', amb: 'fire', boss: 'surtr', tier: 3, motes: 'ash',
    foes: { grunt: 'emberdraugr', beast: 'emberhound', caster: 'imp', brute: 'emberthurs' }, shrines: ['odin'],
    nodes: [[2650, 2700], [2300, 2450], [2550, 2050], [2750, 1650], [2700, 1200], [2250, 1450], [1800, 1050], [1450, 1600], [1850, 2600], [1350, 2750], [900, 2600], [850, 2000], [2050, 1850], [500, 1600], [2150, 2850], [2700, 380], [2300, 650], [1100, 1100], [500, 450], [300, 1150], [1350, 2150]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 12], [12, 5], [5, 6], [6, 16], [16, 15], [6, 7], [12, 7], [1, 8], [8, 14], [8, 9], [9, 10], [10, 11], [9, 20], [20, 7], [11, 13], [13, 19], [13, 17], [7, 17], [17, 18]],
  },
};
const REALM_ORDER = ['iron', 'ice', 'sea', 'fire'];

/* ---------------- sprite helpers ---------------- */
function taper(g, x1, y1, x2, y2, w1, w2) {
  const a = Math.atan2(y2 - y1, x2 - x1) + PI / 2, c = Math.cos(a), s = Math.sin(a);
  g.moveTo(x1 + c * w1 / 2, y1 + s * w1 / 2); g.lineTo(x2 + c * w2 / 2, y2 + s * w2 / 2);
  g.lineTo(x2 - c * w2 / 2, y2 - s * w2 / 2); g.lineTo(x1 - c * w1 / 2, y1 - s * w1 / 2); g.closePath();
}
function sprite(minx, miny, maxx, maxy, fn) { // world-unit bbox relative to the anchor (the foot)
  const pad = 8; minx -= pad; miny -= pad; maxx += pad; maxy += pad;
  const c = mkCanvas((maxx - minx) * SS, (maxy - miny) * SS), g = c.getContext('2d');
  g.scale(SS, SS); g.translate(-minx, -miny); g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g);
  return { c, ox: minx, oy: miny, wu: maxx - minx, hu: maxy - miny };
}
function drawSpr(s, x, y, a = 1) {
  if (a < 1) ctx.globalAlpha = a;
  ctx.drawImage(s.c, x + s.ox, y + s.oy, s.wu, s.hu);
  if (a < 1) ctx.globalAlpha = 1;
}
function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); }
function smoothPath(g, pts) { // closed smooth curve through points
  const n = pts.length; g.beginPath();
  const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2]; g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  g.closePath();
}
/* sprite cel: shade fill, then the lit colour offset toward the top-left light */
function scel(g, path, lit, shade, ox, oy, outline, lw) {
  path(); g.fillStyle = shade; g.fill();
  g.save(); path(); g.clip(); g.translate(-ox, -oy); path(); g.fillStyle = lit; g.fill(); g.restore();
  if (outline) { path(); g.strokeStyle = outline; g.lineWidth = lw || 2; g.stroke(); }
}
function sShadow(g, fn, blur, ox, oy, a) { // offscreen soft shadow of anything fn draws
  g.save(); g.shadowColor = `rgba(0,0,0,${a})`; g.shadowBlur = blur * SS; g.shadowOffsetX = (ox + 6000) * SS; g.shadowOffsetY = oy * SS;
  g.translate(-6000, 0); g.fillStyle = '#000'; g.strokeStyle = '#000'; fn(); g.restore();
}

/* ---- trees seen from above: a trunk, and limbs radiating out over the ground ---- */
function radialTree(seed, kind) {
  const R = mulberry(seed), birch = kind === 'birch', char = kind === 'char';
  const tw = birch ? 11 + R() * 4 : char ? 18 + R() * 6 : 30 + R() * 12;
  const th = birch ? 64 + R() * 26 : char ? 44 + R() * 18 : 50 + R() * 26;
  const L = birch ? 40 + R() * 14 : char ? 30 + R() * 10 : 50 + R() * 22;
  const depth = birch ? 5 : char ? 4 : 6;
  const segs = [], trunk = [];
  let x = 0, y = 0, w = tw; const tx = (R() - .5) * 14;
  for (let i = 1; i <= 3; i++) { const nx = lerp(0, tx, i / 3) + (R() - .5) * 6, ny = -th * i / 3; trunk.push([x, y, nx, ny, w, w * .82]); x = nx; y = ny; w *= .82; }
  const br = (x, y, a, len, w, d) => {
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * .7 - len * .1, nw = Math.max(.55, w * .6);
    segs.push([x, y, ex, ey, w, nw, d]);
    if (d >= depth) return;
    const k = d < 2 ? (R() < .5 ? 2 : 3) : (R() < .65 ? 2 : 3);
    for (let i = 0; i < k; i++) br(ex, ey, a + (i - (k - 1) / 2) * (.4 + R() * .32) + (R() - .5) * .3, len * (.6 + R() * .15), nw, d + 1);
  };
  const nl = birch ? 4 + (R() * 2 | 0) : char ? 4 : 6 + (R() * 3 | 0);
  for (let i = 0; i < nl; i++) br(x, y, i / nl * TAU + R() * .6, L * (.75 + R() * .5), w * .72, 1);
  segs.sort((a, b) => a[6] - b[6]);
  const roots = [];
  for (let i = 0; i < (birch ? 4 : 8); i++) { const a = R() * TAU, len = tw * (1.1 + R() * 1.3); roots.push([Math.cos(a) * tw * .25, Math.sin(a) * tw * .1, Math.cos(a) * len, Math.sin(a) * len * .42 + 2, tw * .42, 1.5]); }
  let mnx = -tw * 2.5, mny = -th, mxx = tw * 2.5, mxy = tw;
  for (const s of segs) { mnx = Math.min(mnx, s[2] - 4); mxx = Math.max(mxx, s[2] + 4); mny = Math.min(mny, s[3] - 4); mxy = Math.max(mxy, s[3] + 4); }
  const SH = [24, 26], drop = th * .6;
  const glowy = kind === 'iron' && R() < .3;
  const C = birch ? { ink: '#1a1612', b: '#d8d2c4', bl: '#fbf8f0', bd: '#8a8578', twig: '#4a443c', hi: '#ffffff' }
    : char ? { ink: '#050303', b: '#1e1412', bl: '#3a2a24', bd: '#080505', twig: '#1a110e', hi: '#5a3a30' }
      : { ink: '#0e0907', b: '#30241c', bl: '#5e4a3a', bd: '#140e0a', twig: '#2a1f18', hi: '#7a6450' };
  const spr = sprite(mnx - 10, mny - 10, mxx + SH[0] + 14, mxy + drop + SH[1] + 14, g => {
    // canopy shadow cast onto the ground below and to the right
    sShadow(g, () => { for (const s of segs) { g.lineWidth = Math.max(1.2, s[4] * .95); g.beginPath(); g.moveTo(s[0], s[1] + drop); g.lineTo(s[2], s[3] + drop); g.stroke(); } }, 7, SH[0], SH[1], birch ? .2 : .3);
    sShadow(g, () => { ell(g, 0, 2, tw * 1.5, tw * .5); g.fill(); }, 8, 6, 4, .55);
    // roots
    for (const s of roots) { g.beginPath(); taper(g, s[0], s[1], s[2], s[3], s[4] + 3, s[5] + 2); g.fillStyle = C.ink; g.fill(); }
    for (const s of roots) { g.beginPath(); taper(g, s[0], s[1], s[2], s[3], s[4], s[5]); const gr = g.createLinearGradient(s[0], s[1] - 6, s[0], s[1] + 6); gr.addColorStop(0, C.bl); gr.addColorStop(1, C.bd); g.fillStyle = gr; g.fill(); }
    // trunk with cylinder shading
    for (const pass of [0, 1]) for (const s of trunk) {
      g.beginPath(); taper(g, s[0], s[1], s[2], s[3], s[4] + (pass ? 0 : 3.5), s[5] + (pass ? 0 : 3.5));
      if (!pass) { g.fillStyle = C.ink; g.fill(); continue; }
      const gr = g.createLinearGradient(s[0] - s[4] / 2, 0, s[0] + s[4] / 2, 0); gr.addColorStop(0, C.bl); gr.addColorStop(.35, C.b); gr.addColorStop(1, C.bd); g.fillStyle = gr; g.fill();
      g.beginPath(); g.arc(s[2], s[3], s[5] / 2, 0, TAU); g.fill();
    }
    if (!birch) { g.strokeStyle = hexA(C.ink, .7); g.lineWidth = 1.2; for (const s of trunk) for (let k = 0; k < 4; k++) { const o = (R() - .5) * s[4] * .7; g.beginPath(); g.moveTo(s[0] + o, s[1]); g.quadraticCurveTo((s[0] + s[2]) / 2 + o + (R() - .5) * 5, (s[1] + s[3]) / 2, s[2] + o * .8, s[3]); g.stroke(); } }
    else { g.fillStyle = '#1a1714'; for (const s of trunk) for (let k = 0; k < 5; k++) { const t = R(); g.fillRect(lerp(s[0], s[2], t) - s[4] * .4, lerp(s[1], s[3], t), s[4] * (.25 + R() * .45), 1.8); } }
    if (kind === 'iron') { g.fillStyle = 'rgba(90,110,70,.55)'; for (let k = 0; k < 5; k++) { ell(g, (R() - .5) * tw * 1.2, -R() * th * .5, 4 + R() * 6, 2.5 + R() * 3); g.fill(); } }
    // limbs: ink silhouette, body, and a lit edge toward the top-left
    for (const s of segs) { g.beginPath(); taper(g, s[0], s[1], s[2], s[3], s[4] + 2.4, s[5] + 1.6); g.fillStyle = C.ink; g.fill(); if (s[4] > 2) { g.beginPath(); g.arc(s[2], s[3], (s[5] + 1.6) / 2, 0, TAU); g.fill(); } }
    for (const s of segs) { g.beginPath(); taper(g, s[0], s[1], s[2], s[3], s[4], s[5]); g.fillStyle = s[6] > 3 ? C.twig : C.b; g.fill(); if (s[4] > 2) { g.beginPath(); g.arc(s[2], s[3], s[5] / 2, 0, TAU); g.fill(); } }
    g.lineWidth = 1;
    for (const s of segs) { if (s[4] < 2.5) continue; const a = Math.atan2(s[3] - s[1], s[2] - s[0]) - PI / 2, ox = Math.cos(a) * s[4] * .3, oy = Math.sin(a) * s[4] * .3, up = oy < 0 || ox < 0 ? 1 : -1; g.strokeStyle = hexA(C.hi, birch ? .9 : .5); g.beginPath(); g.moveTo(s[0] + ox * up, s[1] + oy * up); g.lineTo(s[2] + ox * up * .7, s[3] + oy * up * .7); g.stroke(); }
    if (glowy) {
      const main = trunk.concat(segs.filter(s => s[6] <= 2));
      for (const [lw, col] of [[5, 'rgba(255,100,20,.55)'], [2, '#ffd27a']]) { g.strokeStyle = col; g.lineWidth = lw; for (const s of main) { if (s[4] < 4) continue; const o = (R() - .5) * s[4] * .4; g.beginPath(); g.moveTo(s[0] + o, s[1]); g.lineTo((s[0] + s[2]) / 2 + (R() - .5) * 4, (s[1] + s[3]) / 2); g.lineTo(s[2], s[3]); g.stroke(); } }
    }
    if (char) { g.strokeStyle = 'rgba(255,110,30,.8)'; g.lineWidth = 1.4; for (const s of trunk) { g.beginPath(); g.moveTo(s[0] - 2, s[1]); g.lineTo(s[2] + 2, s[3]); g.stroke(); } }
  });
  spr.glowy = glowy; spr.top = -th; spr.canopy = Math.max(-mnx, mxx, -mny - th); spr.cy = y; spr.tree = 1;
  return spr;
}
function boulder(seed, P, size, cap) {
  const R = mulberry(seed), n = 11, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, r = size * (.8 + R() * .28); pts.push([Math.cos(a) * r, Math.sin(a) * r * .64 - size * .42]); }
  const facets = []; for (let i = 0; i < 3; i++) facets.push([(R() - .6) * size, -size * (.5 + R() * .5), size * (.3 + R() * .3)]);
  return sprite(-size * 1.2, -size * 1.2, size * 1.6, size * .7, g => {
    sShadow(g, () => { ell(g, size * .05, 0, size * 1.05, size * .36); g.fill(); }, 6, 12, 8, .5);
    const path = () => smoothPath(g, pts);
    const gr = g.createLinearGradient(-size * .7, -size * 1.1, size * .6, size * .1); gr.addColorStop(0, P.rockL); gr.addColorStop(.5, P.rock); gr.addColorStop(1, P.rockD);
    scel(g, path, gr, P.rockD, size * .14, size * .1, null);
    g.save(); path(); g.clip();
    for (const f of facets) { g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(f[0], f[1]); g.lineTo(f[0] + f[2], f[1] - f[2] * .3); g.lineTo(f[0] + f[2] * .7, f[1] + f[2] * .5); g.closePath(); g.fill(); }
    g.strokeStyle = hexA(P.rockD, .8); g.lineWidth = 1.3; for (let i = 0; i < 2; i++) { const x = (R() - .5) * size; g.beginPath(); g.moveTo(x, -size); g.lineTo(x + (R() - .5) * 8, -size * .5); g.lineTo(x + (R() - .5) * 10, 0); g.stroke(); }
    if (cap === 'moss') { g.fillStyle = '#4e5a32'; ell(g, -size * .15, -size * .82, size * .7, size * .32); g.fill(); g.fillStyle = 'rgba(140,160,90,.5)'; ell(g, -size * .3, -size * .9, size * .35, size * .14); g.fill(); }
    if (cap === 'snow') { g.fillStyle = '#b8cde0'; ell(g, -size * .05, -size * .8, size * .95, size * .42); g.fill(); g.fillStyle = '#f2f7fb'; ell(g, -size * .12, -size * .86, size * .85, size * .36); g.fill(); }
    if (cap === 'ember') { g.strokeStyle = '#ff7a2a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-size * .4, -size * .3); g.lineTo(-size * .1, -size * .5); g.lineTo(size * .2, -size * .2); g.stroke(); }
    g.restore();
    path(); g.strokeStyle = P.ink; g.lineWidth = 2.2; g.stroke();
  });
}
function reeds(seed, pale) {
  const R = mulberry(seed);
  return sprite(-50, -120, 60, 14, g => {
    sShadow(g, () => { ell(g, 6, 2, 34, 9); g.fill(); }, 5, 8, 4, .35);
    const blades = [];
    for (let i = 0; i < 14; i++) blades.push({ x: (R() - .5) * 46, h: 46 + R() * 60, c: (R() - .5) * 46, w: 2.6 + R() * 2.6, k: R() });
    blades.sort((a, b) => a.k - b.k);
    for (const b of blades) {
      g.beginPath(); g.moveTo(b.x - b.w / 2, 0); g.quadraticCurveTo(b.x + b.c * .3, -b.h * .6, b.x + b.c, -b.h); g.quadraticCurveTo(b.x + b.c * .3 + b.w * .6, -b.h * .55, b.x + b.w / 2, 0); g.closePath();
      g.fillStyle = pale ? (b.k < .5 ? '#a8987a' : '#d8c8a0') : (b.k < .5 ? '#6a5c42' : '#9a8a62'); g.fill();
      g.strokeStyle = 'rgba(30,20,10,.55)'; g.lineWidth = .9; g.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const x = (R() - .5) * 30, h = 76 + R() * 34, lean = (R() - .5) * 8;
      g.strokeStyle = '#4a3e2c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + lean, -h - 8); g.stroke();
      const gr = g.createLinearGradient(x - 4, 0, x + 4, 0); gr.addColorStop(0, '#8a5a34'); gr.addColorStop(1, '#3a2010');
      g.fillStyle = gr; g.strokeStyle = '#1a0f08'; g.lineWidth = 1.2; ell(g, x + lean * .9, -h + 6, 4, 12); g.fill(); g.stroke();
    }
  });
}
function frostPine(seed) {
  const R = mulberry(seed), Hh = 140 + R() * 90, tiers = 5 + (R() * 3 | 0);
  return sprite(-90, -Hh - 30, 120, 40, g => {
    sShadow(g, () => { g.beginPath(); g.moveTo(-50, 0); g.lineTo(80, 30); g.lineTo(110, 10); g.lineTo(0, -6); g.closePath(); g.fill(); }, 10, 10, 6, .3);
    g.fillStyle = '#2a2420'; g.fillRect(-4, -26, 8, 28);
    for (let i = 0; i < tiers; i++) {
      const k = i / tiers, y = -14 - k * Hh * .82, w = (1 - k) * 62 + 12, tip = y - Hh / tiers * 1.7;
      const zig = []; const nz = 7; for (let z = 0; z <= nz; z++) zig.push([-w + z * 2 * w / nz, y + 6 + (z % 2) * 7 + R() * 3]);
      g.beginPath(); g.moveTo(zig[0][0], zig[0][1]); g.quadraticCurveTo(-w * .4, y - (y - tip) * .4, 0, tip); g.quadraticCurveTo(w * .4, y - (y - tip) * .4, w, zig[nz][1]);
      for (let z = nz; z >= 0; z--) g.lineTo(zig[z][0], zig[z][1]); g.closePath();
      const gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, '#30525a'); gr.addColorStop(.5, '#1d343a'); gr.addColorStop(1, '#0f1d22'); g.fillStyle = gr; g.fill();
      g.strokeStyle = '#08121a'; g.lineWidth = 1.6; g.stroke();
      // snow load on top of the tier
      g.beginPath(); g.moveTo(-w * .86, y + 1); g.quadraticCurveTo(-w * .4, y - (y - tip) * .45, 0, tip + 3); g.quadraticCurveTo(w * .4, y - (y - tip) * .45, w * .8, y + 2);
      for (let z = 6; z >= 0; z--) g.lineTo(-w * .86 + z * w * 1.66 / 6, y - 2 - (z % 2) * 5 - R() * 3); g.closePath();
      const sg = g.createLinearGradient(0, tip, 0, y); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#c4d8ea'); g.fillStyle = sg; g.fill();
      g.strokeStyle = 'rgba(70,100,130,.6)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#e8f6ff'; for (let z = 0; z < 3; z++) { const ix = -w * .6 + R() * w * 1.2, iy = y + 8; g.beginPath(); g.moveTo(ix - 2, iy); g.lineTo(ix, iy + 6 + R() * 6); g.lineTo(ix + 2, iy); g.fill(); }
    }
  });
}
function crystals(seed) {
  const R = mulberry(seed), n = 3 + (R() * 4 | 0), sh = [];
  for (let i = 0; i < n; i++) sh.push({ x: (R() - .5) * 64, h: 50 + R() * 120, w: 12 + R() * 18, lean: (R() - .5) * .6 });
  sh.sort((a, b) => b.h - a.h);
  return sprite(-90, -200, 110, 30, g => {
    sShadow(g, () => { ell(g, 14, 2, 60, 15); g.fill(); }, 8, 12, 6, .3);
    for (const s of sh) {
      const tx = s.x + Math.sin(s.lean) * s.h, ty = -s.h;
      const L = [s.x - s.w / 2, 0], M = [s.x + s.w * .1, 5], Rr = [s.x + s.w / 2, 0], tL = [tx - s.w * .32, ty + s.w], tR = [tx + s.w * .3, ty + s.w * .9], tip = [tx, ty];
      g.beginPath(); g.moveTo(...L); g.lineTo(...M); g.lineTo(tx + 1, ty + s.w * 1.1); g.lineTo(...tip); g.lineTo(...tL); g.closePath();
      let gr = g.createLinearGradient(0, ty, 0, 0); gr.addColorStop(0, '#d8f4ff'); gr.addColorStop(1, '#3f86b8'); g.fillStyle = gr; g.fill();
      g.beginPath(); g.moveTo(...M); g.lineTo(...Rr); g.lineTo(...tR); g.lineTo(...tip); g.lineTo(tx + 1, ty + s.w * 1.1); g.closePath();
      gr = g.createLinearGradient(0, ty, 0, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#8ec8ec'); g.fillStyle = gr; g.fill();
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(M[0] + 2, M[1] - 8); g.lineTo(tx + 1, ty + s.w * 1.5); g.stroke();
      g.strokeStyle = 'rgba(40,110,170,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(s.x - s.w * .2, -4); g.lineTo(tx - s.w * .1, ty + s.w * 2); g.stroke();
      g.beginPath(); g.moveTo(...L); g.lineTo(...M); g.lineTo(...Rr); g.lineTo(...tR); g.lineTo(...tip); g.lineTo(...tL); g.closePath(); g.strokeStyle = '#173f60'; g.lineWidth = 1.8; g.stroke();
    }
  });
}
function iceberg(seed) {
  const R = mulberry(seed), rx = 56 + R() * 60, ry = rx * .5, Hh = 40 + R() * 80, n = 10, base = [], top = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU + R() * .25, k = .74 + R() * .3; base.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]); }
  for (let i = 0; i < n; i++) { const p = base[i], hh = Hh * (.75 + R() * .45); top.push([p[0] * .88, p[1] * .86 - hh]); }
  return sprite(-rx - 20, -Hh * 1.3 - ry, rx + 46, ry + 30, g => {
    g.fillStyle = 'rgba(0,8,16,.5)'; ell(g, 16, 10, rx * 1.15, ry * 1.1); g.fill();
    g.strokeStyle = 'rgba(220,240,255,.5)'; g.lineWidth = 2; ell(g, 0, 4, rx * 1.05, ry * 1.06); g.stroke();
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n; if (base[i][1] + base[j][1] < -ry * .3) continue;
      g.beginPath(); g.moveTo(...base[i]); g.lineTo(...base[j]); g.lineTo(...top[j]); g.lineTo(...top[i]); g.closePath();
      const lit = (base[j][0] - base[i][0]) < 0 ? .25 : 1;
      const gr = g.createLinearGradient(0, -Hh, 0, ry); gr.addColorStop(0, mix('#bfe0f2', '#6c9ab8', 1 - lit)); gr.addColorStop(1, mix('#2a5a7e', '#163a56', 1 - lit)); g.fillStyle = gr; g.fill();
      g.strokeStyle = '#102a40'; g.lineWidth = 1.6; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; for (let k = 0; k < 2; k++) { const t = R(); g.beginPath(); g.moveTo(lerp(top[i][0], top[j][0], t), lerp(top[i][1], top[j][1], t) + 4); g.lineTo(lerp(base[i][0], base[j][0], t) + (R() - .5) * 4, lerp(base[i][1], base[j][1], t) - 6); g.stroke(); }
    }
    smoothPath(g, top); const tg = g.createLinearGradient(-rx, -Hh - ry, rx, -Hh + ry); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#bcd6e8'); g.fillStyle = tg; g.fill();
    g.strokeStyle = '#102a40'; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = 'rgba(150,190,220,.35)'; for (let i = 0; i < 3; i++) { ell(g, (R() - .5) * rx, -Hh + (R() - .3) * ry * .5, 10 + R() * 16, 3 + R() * 4); g.fill(); }
  });
}
function ribcage(seed) {
  const R = mulberry(seed);
  return sprite(-110, -150, 130, 40, g => {
    sShadow(g, () => { ell(g, 10, 6, 90, 22); g.fill(); }, 8, 14, 8, .35);
    const n = 4 + (R() * 3 | 0), spine = [];
    for (let i = 0; i < n; i++) spine.push([-70 + i * 140 / (n - 1), -96 - Math.sin(i / (n - 1) * PI) * 20]);
    for (const [ox, wcol, w] of [[0, '#1a1612', 9], [0, '#d6ccb8', 6]]) {
      for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
        const sx = spine[i][0], sy = spine[i][1];
        g.strokeStyle = wcol; g.lineWidth = w; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + s * 70, sy + 10, sx + s * 52, 4 + s * 4); g.stroke();
      }
    }
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.6;
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const sx = spine[i][0], sy = spine[i][1]; g.beginPath(); g.moveTo(sx - 1, sy - 2); g.quadraticCurveTo(sx + s * 66 - 2, sy + 6, sx + s * 50 - 2, 0); g.stroke(); }
    for (const p of spine) { g.fillStyle = '#e2d8c4'; g.strokeStyle = '#1a1612'; g.lineWidth = 2; ell(g, p[0], p[1], 9, 7); g.fill(); g.stroke(); }
  });
}
function wreck(seed) {
  const R = mulberry(seed);
  return sprite(-130, -110, 150, 40, g => {
    sShadow(g, () => { ell(g, 10, 6, 120, 26); g.fill(); }, 8, 14, 8, .35);
    for (let i = 0; i < 7; i++) {
      const y = -6 - i * 8, w = 110 - i * 6;
      g.beginPath(); g.moveTo(-w, y + 4); g.quadraticCurveTo(0, y + 18, w, y + 2); g.lineTo(w - 4, y - 6); g.quadraticCurveTo(0, y + 10, -w + 4, y - 4); g.closePath();
      g.fillStyle = i % 2 ? '#3a2a20' : '#4a3628'; g.fill(); g.strokeStyle = '#0e0806'; g.lineWidth = 1.4; g.stroke();
      g.fillStyle = '#8a8c90'; for (let k = 0; k < 6; k++) { g.fillRect(-w + 14 + k * w / 3.2, y + 4 + Math.sin(k) * 2, 2, 2); }
    }
    for (let i = 0; i < 5; i++) { const x = -80 + i * 40; g.strokeStyle = '#0e0806'; g.lineWidth = 7; g.beginPath(); g.moveTo(x, 6); g.quadraticCurveTo(x - 10, -50, x + (R() - .5) * 20, -80 - R() * 20); g.stroke(); g.strokeStyle = '#4a3628'; g.lineWidth = 4; g.stroke(); }
    g.strokeStyle = '#0e0806'; g.lineWidth = 8; g.beginPath(); g.moveTo(30, 0); g.lineTo(80, -100); g.stroke(); g.strokeStyle = '#5a4430'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#e8f2f8'; for (let i = 0; i < 5; i++) { ell(g, -90 + R() * 180, -4 + R() * 10, 12 + R() * 14, 4); g.fill(); }
  });
}
function standingStone(seed, glow) {
  const R = mulberry(seed), h = 70 + R() * 50, w = 24 + R() * 10;
  return sprite(-w - 10, -h - 12, w + 30, 20, g => {
    sShadow(g, () => { ell(g, 4, 2, w + 4, 8); g.fill(); }, 6, 10, 6, .45);
    const path = () => { g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2 - 3, -h * .6); g.quadraticCurveTo(-w / 2, -h, w * .1, -h - 4); g.quadraticCurveTo(w / 2 + 4, -h * .8, w / 2, 0); g.closePath(); };
    const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, '#7a7a80'); gr.addColorStop(.5, '#55555c'); gr.addColorStop(1, '#2a2a30');
    scel(g, path, gr, '#26262c', 3, 2, '#101014', 2.2);
    g.save(); path(); g.clip(); g.fillStyle = 'rgba(150,170,110,.4)'; for (let i = 0; i < 6; i++) { ell(g, (R() - .5) * w, -R() * h, 3 + R() * 5, 2 + R() * 3); g.fill(); } g.restore();
    g.strokeStyle = glow ? 'rgba(140,210,255,.85)' : 'rgba(20,20,22,.85)'; g.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) { const y = -h * .85 + i * h * .15; g.beginPath(); g.moveTo(-3, y); g.lineTo(-3, y + 8); g.moveTo(-3, y + 2); g.lineTo(4, y + 6); g.stroke(); }
  });
}
function obsidian(seed) {
  const R = mulberry(seed), n = 2 + (R() * 3 | 0), sh = [];
  for (let i = 0; i < n; i++) sh.push({ x: (R() - .5) * 56, h: 70 + R() * 140, w: 20 + R() * 22, lean: (R() - .5) * .4 });
  sh.sort((a, b) => b.h - a.h);
  return sprite(-90, -230, 110, 30, g => {
    sShadow(g, () => { ell(g, 12, 2, 56, 15); g.fill(); }, 8, 14, 6, .5);
    for (const s of sh) {
      const tx = s.x + Math.sin(s.lean) * s.h, ty = -s.h;
      const P = [[s.x - s.w / 2, 0], [s.x - s.w * .15, -s.h * .5], [tx, ty], [s.x + s.w * .25, -s.h * .42], [s.x + s.w / 2, 0]];
      g.beginPath(); P.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath();
      const gr = g.createLinearGradient(s.x - s.w / 2, 0, s.x + s.w / 2, 0); gr.addColorStop(0, '#2c2230'); gr.addColorStop(.45, '#0e0a10'); gr.addColorStop(1, '#1a0e0c'); g.fillStyle = gr; g.fill();
      g.strokeStyle = '#030102'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = 'rgba(220,210,255,.55)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(s.x - s.w * .3, -4); g.lineTo(s.x - s.w * .12, -s.h * .5); g.lineTo(tx - 1, ty + 6); g.stroke();
      g.strokeStyle = 'rgba(255,90,30,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x + s.w / 2 - 1, -1); g.lineTo(s.x + s.w * .25, -s.h * .42); g.lineTo(tx + 1, ty + 3); g.stroke();
    }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 50); gr.addColorStop(0, 'rgba(255,90,20,.35)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; ell(g, 0, 0, 50, 16); g.fill();
  });
}
function swordField(seed) {
  const R = mulberry(seed), n = 6 + (R() * 6 | 0), sw = [];
  for (let i = 0; i < n; i++) sw.push({ x: (R() - .5) * 90, y: (R() - .5) * 34, a: (R() - .5) * .8, L: 44 + R() * 34, wood: R() < .35, broken: R() < .2 });
  sw.sort((a, b) => a.y - b.y);
  return sprite(-100, -120, 110, 40, g => {
    sShadow(g, () => { for (const s of sw) { g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.fillRect(-4, -s.L - 20, 8, s.L + 20); g.restore(); } }, 5, 20, 8, .4);
    for (const s of sw) {
      g.save(); g.translate(s.x, s.y); g.rotate(s.a);
      const L = s.broken ? s.L * .6 : s.L, bw = 8;
      g.fillStyle = 'rgba(0,0,0,.4)'; ell(g, 0, 1, 7, 3); g.fill();
      g.beginPath(); g.moveTo(-bw / 2, 0); g.lineTo(-bw / 2, -L); if (s.broken) { g.lineTo(0, -L - 4); g.lineTo(bw / 2, -L + 2); } else g.lineTo(bw / 2, -L); g.lineTo(bw / 2, 0); g.closePath();
      const gr = g.createLinearGradient(-bw / 2, 0, bw / 2, 0); gr.addColorStop(0, s.wood ? '#a88a66' : '#d8d0c4'); gr.addColorStop(.5, s.wood ? '#8a6c4e' : '#aba398'); gr.addColorStop(1, s.wood ? '#5a4430' : '#6e665c');
      g.fillStyle = gr; g.fill(); g.strokeStyle = '#140c0a'; g.lineWidth = 1.6; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-1, -2); g.lineTo(-1, -L + 3); g.stroke();
      g.fillStyle = '#2a1a14'; g.fillRect(-12, -L - 5, 24, 6); g.strokeStyle = '#080404'; g.lineWidth = 1.2; g.strokeRect(-12, -L - 5, 24, 6);
      g.fillStyle = '#6b2a1a'; g.fillRect(-3.5, -L - 21, 7, 16); g.strokeRect(-3.5, -L - 21, 7, 16);
      g.strokeStyle = '#3a140c'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-3.5, -L - 8 - k * 4); g.lineTo(3.5, -L - 10 - k * 4); g.stroke(); }
      g.fillStyle = '#b3a99a'; ell(g, 0, -L - 23, 5.5, 4.5); g.fill(); g.strokeStyle = '#080404'; g.stroke();
      g.restore();
    }
  });
}
function basalt(seed) {
  const R = mulberry(seed), n = 3 + (R() * 4 | 0), cols = [];
  for (let i = 0; i < n; i++) cols.push({ x: (R() - .5) * 64, y: (R() - .5) * 22, h: 30 + R() * 90, r: 13 + R() * 6 });
  cols.sort((a, b) => a.y - b.y);
  return sprite(-90, -140, 110, 40, g => {
    sShadow(g, () => { ell(g, 14, 4, 70, 20); g.fill(); }, 8, 14, 6, .5);
    for (const c of cols) {
      const hx = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; hx.push([c.x + Math.cos(a) * c.r, c.y + Math.sin(a) * c.r * .55]); }
      for (const [a, b, col] of [[0, 1, '#2a1c18'], [1, 2, '#1c1210'], [2, 3, '#140c0a']]) { g.beginPath(); g.moveTo(...hx[a]); g.lineTo(hx[a][0], hx[a][1] - c.h); g.lineTo(hx[b][0], hx[b][1] - c.h); g.lineTo(...hx[b]); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = '#060303'; g.lineWidth = 1.4; g.stroke(); }
      g.beginPath(); hx.forEach((p, i) => i ? g.lineTo(p[0], p[1] - c.h) : g.moveTo(p[0], p[1] - c.h)); g.closePath();
      const gr = g.createLinearGradient(c.x - c.r, c.y - c.h, c.x + c.r, c.y - c.h); gr.addColorStop(0, '#5a4038'); gr.addColorStop(1, '#2e201c'); g.fillStyle = gr; g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,100,30,.75)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(hx[1][0], hx[1][1] - 2); g.lineTo(hx[1][0] + 2, hx[1][1] - c.h * .3); g.stroke();
    }
  });
}
function stump(seed, P) {
  const R = mulberry(seed), r = 14 + R() * 8;
  return sprite(-r * 2, -r * 2, r * 2.5, r, g => {
    sShadow(g, () => { ell(g, 2, 2, r * 1.3, r * .45); g.fill(); }, 5, 8, 5, .45);
    g.fillStyle = '#1e1612'; g.beginPath(); g.moveTo(-r, 0); g.lineTo(-r, -r * .8); g.lineTo(r, -r * .8); g.lineTo(r, 0); g.closePath(); g.fill();
    const gr = g.createLinearGradient(-r, 0, r, 0); gr.addColorStop(0, '#5a4636'); gr.addColorStop(1, '#1a120e'); g.fillStyle = gr; g.fillRect(-r + 1, -r * .8, r * 2 - 2, r * .8);
    g.fillStyle = '#7a6046'; ell(g, 0, -r * .8, r, r * .42); g.fill(); g.strokeStyle = '#120c09'; g.lineWidth = 1.6; g.stroke();
    g.strokeStyle = 'rgba(40,24,14,.6)'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { ell(g, 0, -r * .8, r * k / 4, r * .42 * k / 4); g.stroke(); }
  });
}

/* prop sets per realm (built once, cached) */
const SPRC = {};
/* ---------------- spatial grid & collision ---------------- */
function gridAdd(w, o) {
  const cs = w.cell;
  const x0 = Math.floor((o.x - o.r) / cs), x1 = Math.floor((o.x + o.r) / cs), y0 = Math.floor((o.y - o.r) / cs), y1 = Math.floor((o.y + o.r) / cs);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = x * 4096 + y; let a = w.grid.get(k); if (!a) w.grid.set(k, a = []); a.push(o); }
}
function obstNear(w, x, y, r, out) {
  out.length = 0; const cs = w.cell;
  const x0 = Math.floor((x - r) / cs), x1 = Math.floor((x + r) / cs), y0 = Math.floor((y - r) / cs), y1 = Math.floor((y + r) / cs);
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const a = w.grid.get(gx * 4096 + gy); if (a) for (const o of a) if (out.indexOf(o) < 0) out.push(o); }
  return out;
}
const _near = [];
function collide(e) {
  const w = G.world; if (!w) return;
  if (!(isFinite(e.x) && isFinite(e.y))) { e.x = e._lx ?? w.w / 2; e.y = e._ly ?? w.h / 2; e.vx = 0; e.vy = 0; if (e.kbx !== undefined) e.kbx = e.kby = 0; }
  if (!e.noObst) {
    obstNear(w, e.x, e.y, e.r + 40, _near);
    for (const o of _near) {
      if (o.noCol) continue;
      if (o.rect) {
        const cx = clamp(e.x, o.x0, o.x1), cy = clamp(e.y, o.y0, o.y1), dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
        if (d < e.r) {
          if (d > .001) { e.x = cx + dx / d * e.r; e.y = cy + dy / d * e.r; }
          else { const l = e.x - o.x0, r = o.x1 - e.x, t = e.y - o.y0, b = o.y1 - e.y, m = Math.min(l, r, t, b); if (m === l) e.x = o.x0 - e.r; else if (m === r) e.x = o.x1 + e.r; else if (m === t) e.y = o.y0 - e.r; else e.y = o.y1 + e.r; }
        }
      } else {
        const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), m = e.r + o.r;
        if (d < m && d > .001) { e.x = o.x + dx / d * m; e.y = o.y + dy / d * m; }
      }
    }
  }
  const b = w.bounds; e.x = clamp(e.x, b.x0 + e.r, b.x1 - e.r); e.y = clamp(e.y, b.y0 + e.r, b.y1 - e.r);
  if (w.arena) { const a = w.arena, dx = e.x - a.x, dy = e.y - a.y, d = Math.hypot(dx, dy), m = a.R - e.r; if (d > m) { e.x = a.x + dx / d * m; e.y = a.y + dy / d * m; } }
  if (G.trial && G.trial.active && e.trialBound) { const a = G.trial, dx = e.x - a.x, dy = e.y - a.y, d = Math.hypot(dx, dy), m = a.R - e.r; if (d > m) { e.x = a.x + dx / d * m; e.y = a.y + dy / d * m; } }
  if (w.voidY && e.y > w.voidY - e.r) e.y = w.voidY - e.r;
  e._lx = e.x; e._ly = e.y;
}
function addObst(w, o) { w.obst.push(o); gridAdd(w, o); return o; }

/* ---------------- paths ---------------- */
function pathLine(a, b, R) {
  let pts = [[a.x, a.y], [b.x, b.y]];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  for (let lv = 0; lv < 4; lv++) {
    const np = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      const off = (R() - .5) * len * .22 / (lv + 1.2);
      np.push(p, [(p[0] + q[0]) / 2 - dy / l * off, (p[1] + q[1]) / 2 + dx / l * off]);
    }
    np.push(pts[pts.length - 1]); pts = np;
  }
  return pts;
}
function pathDist(w, x, y) {
  let m = 1e9;
  for (const p of w.paths) {
    if (x < p.bx0 - 400 || x > p.bx1 + 400 || y < p.by0 - 400 || y > p.by1 + 400) continue;
    for (let i = 0; i < p.length - 1; i++) { const d = segDist(x, y, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]); if (d < m) m = d; }
  }
  return m;
}
function strokePts(g, pts, lw, col) {
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
}
function walkLine(R, x, y, a, n, step, jit) {
  const pts = [[x, y]];
  for (let i = 0; i < n; i++) { a += (R() - .5) * jit; x += Math.cos(a) * step * (.6 + R() * .8); y += Math.sin(a) * step * (.6 + R() * .8); pts.push([x, y]); }
  return pts;
}
function bbox(p) { p.bx0 = Math.min(...p.map(q => q[0])); p.bx1 = Math.max(...p.map(q => q[0])); p.by0 = Math.min(...p.map(q => q[1])); p.by1 = Math.max(...p.map(q => q[1])); return p; }

/* ---------------- realm generation ---------------- */
function mkWorld(kind, id, w, h) {
  const L = LOOK[id] || LOOK.iron;
  return { kind, id, w, h, pal: PAL[id] || PAL.iron, look: L, mode: L.mode, voidCol: L.void, obst: [], deco: [], nodes: [], paths: [], lava: [], ice: [], water: [], vents: [], spawns: [], crackFields: [], grid: new Map(), cell: 128, bounds: { x0: 60, y0: 60, x1: w - 60, y1: h - 60 }, arena: null, gs: .9 };
}
function genRealm(id) {
  const D = REALMS[id], R = mulberry(D.seed), w = mkWorld('realm', id, D.W, D.H);
  w.def = D; w.seed = D.seed; w.emis = id === 'iron' || id === 'fire';
  const sp = realmSprites(id);
  D.nodes.forEach((p, i) => {
    const t = NODE_T[i];
    const n = { i, t, x: p[0], y: p[1], key: id + ':' + i, clear: CLEAR[t] || 120 };
    if (t === 'shrine') n.god = D.shrines[0];
    if (t === 'shrine2') { if (D.shrines[1]) { n.t = 'shrine'; n.god = D.shrines[1]; } else { n.t = 'chest'; n.big = 1; } }
    if (t === 'lore') n.lore = LORE_OF[i];
    if (t === 'altar') n.rune = RUNE_OF[i];
    w.nodes.push(n);
  });
  for (const [a, b] of D.edges) w.paths.push(bbox(pathLine(w.nodes[a], w.nodes[b], R)));
  if (id === 'iron') { for (const i of [5, 11, 18, 10]) w.crackFields.push({ x: w.nodes[i].x + (R() - .5) * 300, y: w.nodes[i].y + (R() - .5) * 300, r: 260 + R() * 160 }); }
  if (id === 'ice') {
    for (let i = 0; i < 4; i++) { const y0 = 300 + i * 700 + R() * 300; w.ice.push({ pts: walkLine(R, -100, y0, (R() - .5) * .5, 26, 140, .5), w: 120 + R() * 90 }); }
    for (let i = 0; i < 14; i++) { const x = 200 + R() * (w.w - 400), y = 200 + R() * (w.h - 400); w.ice.push({ pts: walkLine(R, x, y, R() * TAU, 3, 60, .8), w: 100 + R() * 80 }); }
  }
  if (id === 'sea') for (let i = 0; i < 24; i++) { const x = 200 + R() * (w.w - 400), y = 200 + R() * (w.h - 400); if (pathDist(w, x, y) < 150) continue; w.water.push({ x, y, rx: 60 + R() * 120, ry: 34 + R() * 60 }); }
  if (id === 'fire') {
    for (let i = 0; i < 26; i++) {
      const pts = walkLine(R, 150 + R() * (w.w - 300), 150 + R() * (w.h - 300), R() * TAU, 10 + (R() * 10 | 0), 55, .6);
      let cur = [];
      for (const p of pts) {
        let bad = pathDist(w, p[0], p[1]) < 130;
        for (const n of w.nodes) if (Math.hypot(n.x - p[0], n.y - p[1]) < n.clear + 40) bad = true;
        if (bad) { if (cur.length > 2) w.lava.push({ pts: cur, w: 30 + R() * 30 }); cur = []; } else cur.push(p);
      }
      if (cur.length > 2) w.lava.push({ pts: cur, w: 30 + R() * 30 });
    }
    for (let i = 0; i < 40; i++) { const x = 200 + R() * (w.w - 400), y = 200 + R() * (w.h - 400), pd = pathDist(w, x, y); if (pd < 160 && pd > 30) w.vents.push({ x, y, t: R() * 5, per: 3.5 + R() * 3, fired: 0 }); }
  }
  // props: an open, readable path; walls of wood or stone a little way off it
  const step = 124;
  for (let gy = 0; gy < w.h; gy += step) for (let gx = 0; gx < w.w; gx += step) {
    const x = gx + R() * step, y = gy + R() * step;
    const edge = Math.min(x, y, w.w - x, w.h - y), border = edge < 200;
    let skip = false;
    for (const n of w.nodes) if (Math.hypot(n.x - x, n.y - y) < n.clear) { skip = true; break; }
    if (skip) continue;
    const pd = border ? 999 : pathDist(w, x, y);
    if (id === 'fire') { let lv = false; for (const l of w.lava) for (const p of l.pts) if (Math.hypot(p[0] - x, p[1] - y) < l.w + 16) { lv = true; break; } if (lv) continue; }
    if (id === 'sea') { let wt = false; for (const p of w.water) if (Math.hypot((x - p.x) / p.rx, (y - p.y) / p.ry) < 1.15) wt = true; if (wt) continue; }
    const r = R();
    if (pd < 84) continue;
    const bigMin = id === 'iron' ? 330 : id === 'hub' ? 250 : id === 'sea' ? 210 : 190;
    if (pd < bigMin) {
      if (pd > 175 && r < .5 && sp.mid.length) { addObst(w, { x, y, r: 22, spr: pick2(R, sp.mid.length && R() < .6 ? sp.mid : sp.small.length ? sp.small : sp.mid), fade: 1 }); continue; }
      if (r < .3) { const small = R() < .5 && sp.small.length; addObst(w, { x, y, r: small ? 16 : 22, spr: small ? pick2(R, sp.small) : pick2(R, sp.mid), fade: 1 }); }
      else if (r < .55 && sp.deco.length) w.deco.push({ x, y, spr: pick2(R, sp.deco), noCol: 1 });
      continue;
    }
    if (pd > 520 && !border && r < .45) continue;
    let big = r < (id === 'sea' ? .5 : id === 'iron' ? .5 : .62) || border;
    if (big && id === 'iron') { const B = w._bigs || (w._bigs = []); if (B.some(b => Math.hypot(b[0] - x, (b[1] - y) * 1.3) < 380)) { big = false; if (R() < .7) continue; } else B.push([x, y]); }
    else if (!big && id === 'iron' && R() < .7) continue;
    if (big) { const spr = pick2(R, sp.big); addObst(w, { x, y, r: spr.trunkR || (id === 'sea' ? 50 : id === 'fire' ? 28 : 16), spr, fade: 1, big: 1 }); }
    else addObst(w, { x, y, r: 22, spr: pick2(R, sp.mid.length && R() < .6 ? sp.mid : sp.small.length ? sp.small : sp.mid), fade: 1 });
  }
  const F = D.foes;
  for (const n of w.nodes) if (n.t === 'camp') w.spawns.push({ x: n.x, y: n.y, list: pickGroup(R, F, D.tier, 'camp') });
  for (const p of w.paths) {
    for (let i = 4; i < p.length - 4; i += 7) {
      const q = p[i]; let near = false;
      for (const n of w.nodes) if ((n.t === 'start' || n.t === 'well' || n.t === 'gate') && Math.hypot(n.x - q[0], n.y - q[1]) < 380) near = true;
      if (!near && R() < .55) w.spawns.push({ x: q[0], y: q[1], list: pickGroup(R, F, D.tier, 'patrol') });
    }
  }
  buildGround(w);
  return w;
}
function pick2(R, a) { return a[Math.floor(R() * a.length)]; }
function pickGroup(R, F, tier, kind) {
  const L = [];
  if (kind === 'camp') {
    const n = 3 + (R() * 2 | 0) + (tier > 1 ? 1 : 0);
    for (let i = 0; i < n; i++) { const r = R(); L.push(r < .45 ? F.grunt : r < .7 ? F.beast : F.caster); }
    if (R() < .5 + tier * .12) L.push(F.brute);
  } else {
    const n = 1 + (R() * 2 | 0);
    for (let i = 0; i < n; i++) { const r = R(); L.push(r < .5 ? F.grunt : r < .8 ? F.beast : F.caster); }
  }
  return L;
}
/* hand-painted fallback, for browsers without WebGL */
function paintGroundFallback(w) {
  const gs = w.gs = Math.min(.42, 1300 / Math.max(w.w, w.h));
  const c = mkCanvas(w.w * gs, w.h * gs), g = c.getContext('2d'); g.scale(gs, gs);
  const base = { iron: '#3a322c', ice: '#cdd9e4', sea: '#5a6a7a', fire: '#2a1a16', hub: '#28302a', utgard: '#16201a', sky: '#e8dcc4' }[w.mode];
  g.fillStyle = base; g.fillRect(0, 0, w.w, w.h);
  const R = mulberry(5);
  for (let i = 0; i < 400; i++) { const x = R() * w.w, y = R() * w.h, r = 40 + R() * 200, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, R() < .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (const p of w.paths) strokePts(g, p, 100, 'rgba(255,255,255,.08)');
  for (const l of w.lava) strokePts(g, l.pts, l.w, '#ff6a1a');
  for (const r of w.ice) strokePts(g, r.pts, r.w, '#a8d0e8');
  w.ground = c; w.thumb = c; w.chunks = null;
}

/* ---------------- arenas ---------------- */
const ARENAS = {
  angr: { realm: 'iron', R: 720 },
  thrym: { realm: 'ice', R: 640 },
  nidhogg: { realm: 'sea', R: 760 },
  surtr: { realm: 'fire', R: 760 },
  utgard: { realm: 'utgard', R: 620 },
  skogul: { realm: 'sky', R: 600 },
};
function genArena(bid) {
  const A = ARENAS[bid], size = A.R * 2 + 1100, rid = A.realm;
  const w = mkWorld('arena', rid, size, size);
  w.boss = bid; w.seed = 9000 + rid.length * 31; w.gs = 1;
  w.def = REALMS[rid] || null;
  w.arena = { x: size / 2, y: size / 2, R: A.R };
  w.emis = rid === 'iron' || rid === 'fire' || rid === 'utgard' || rid === 'sky';
  const R = mulberry(w.seed), cx = size / 2, cy = size / 2;
  if (rid === 'sea') { w.holes = []; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + .3, r = i === 0 ? 0 : A.R * .55; w.holes.push({ x: cx + Math.cos(a) * r, y: cy - 60 + Math.sin(a) * r * .8, r: 90 }); } }
  if (rid === 'fire') for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + R() * .4, pts = walkLine(R, cx + Math.cos(a) * (A.R + 200), cy + Math.sin(a) * (A.R + 200), a + PI / 2, 6, 60, .4); w.lava.push({ pts, w: 30 + R() * 24, deco: 1 }); }
  w.maskExtra = (rg, gg, soft, disc) => { if (rid === 'sea') disc(rg, cx, cy, A.R * 1.02, .6); };
  if (rid === 'ice' || rid === 'sea') { // open ice: only shards and wind-cut chunks, no forest
    const sp = realmSprites(rid);
    if (rid === 'ice') { w.look = Object.assign({}, w.look, { amb: [238, 240, 246], fog: ['#f2f6fa', .22] }); const sh = iceShards(); for (let i = 0; i < 26; i++) { const a = R() * TAU, r = A.R * (.5 + R() * 1.1), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; w.deco.push({ x, y, spr: pick2(R, sh), noCol: 1 }); } }
  } else if (rid !== 'sky' && rid !== 'utgard') {
    const sp = realmSprites(rid);
    for (let i = 0; i < 46; i++) {
      const a = i / 46 * TAU + R() * .08, r = A.R + 130 + R() * 280, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      addObst(w, { x, y, r: 10, spr: R() < .6 ? pick2(R, sp.big) : pick2(R, sp.mid.length ? sp.mid : sp.big), fade: 1, noCol: 1, ring: 1 });
    }
    const dk = rid === 'fire' ? sp.small : sp.deco; // the smith's cave has rubble at its edge, not trees
    if (dk.length) for (let i = 0; i < 24; i++) { const a = R() * TAU, r = A.R + 10 + R() * 70; w.deco.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, spr: pick2(R, dk), noCol: 1 }); }
  }
  buildGround(w);
  return w;
}

/* ---------------- animated ground effects ---------------- */
function drawGroundFx() {
  const w = G.world, t = G.t;
  if (w.chunks && w.emis) { ctx.globalCompositeOperation = 'lighter'; drawEmissive(ctx, .55 + .22 * Math.sin(t * 1.6) + .08 * Math.sin(t * 4.3)); ctx.globalCompositeOperation = 'source-over'; }
  if (w.lava.length) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < w.lava.length; i++) {
      const l = w.lava[i], p0 = l.pts[(l.pts.length / 2) | 0];
      if (!inView(p0[0], p0[1], 500)) continue;
      tracePts(l.pts); ctx.setLineDash([16, 40]); ctx.lineDashOffset = -t * 24 - i * 13;
      ctx.strokeStyle = 'rgba(255,230,150,.35)'; ctx.lineWidth = l.w * .28; ctx.stroke(); ctx.setLineDash([]);
      for (let k = 0; k < l.pts.length; k += 3) G.lights.push({ x: l.pts[k][0], y: l.pts[k][1], r: l.w * 3.6, i: .7, col: '#ff7a2a' });
      if (Math.random() < .05) { const p = pick(l.pts); part({ x: p[0] + rand(-10, 10), y: p[1], vy: -rand(20, 60), vx: rand(-10, 10), life: rand(.8, 1.6), size: rand(1.5, 3), color: '#ffb347', type: 'ember', add: 1 }); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (w.water.length) {
    for (const p of w.water) {
      if (!inView(p.x, p.y, 200)) continue;
      const k = (t * .35 + p.x * .01) % 1;
      ctx.strokeStyle = `rgba(200,225,240,${.22 * (1 - k)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx * k, p.ry * k, 0, 0, TAU); ctx.stroke();
    }
  }
  if (w.mode === 'ice' || w.mode === 'sea') { // cold glints
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) { const x = cam.x + (hash2(i, 3) - .5) * W / cam.z, y = cam.y + (hash2(i, 4) - .5) * H / cam.z, s = Math.sin(t * 2 + i * 7); if (s > .85) glow(x, y, 8, '#ffffff', (s - .85) * 5); }
    ctx.globalCompositeOperation = 'source-over';
  }
}
function tracePts(pts) { ctx.beginPath(); for (let i = 0; i < pts.length; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); }

/* ground effects on actors */
function onIce(x, y) {
  const w = G.world; if (!w || w.mode !== 'ice') return false;
  if (w.kind === 'arena') return G.boss && G.boss.phase > 1;
  for (const r of w.ice) for (let i = 0; i < r.pts.length - 1; i++) if (segDist(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]) < r.w * .42) return true;
  return false;
}
function inLava(x, y) {
  const w = G.world; if (!w || !w.lava.length) return false;
  for (const l of w.lava) { if (l.deco) continue; for (let i = 0; i < l.pts.length - 1; i++) if (segDist(x, y, l.pts[i][0], l.pts[i][1], l.pts[i + 1][0], l.pts[i + 1][1]) < l.w * .42) return true; }
  return false;
}
function inWater(x, y) {
  const w = G.world; if (!w || !w.water.length) return false;
  for (const p of w.water) { const dx = (x - p.x) / p.rx, dy = (y - p.y) / p.ry; if (dx * dx + dy * dy < .8) return true; }
  return false;
}

/* ---------------- weather ---------------- */
function setWeather(kind) { G.motes = []; G.weatherKind = kind; }
function updWeather(dt) {
  const k = G.weatherKind; if (!k) return;
  const hw = W / 2 / cam.z, hh = H / 2 / cam.z;
  const want = k === 'ember' ? 280 : k === 'snow' ? (G.boss && G.boss.blizzard ? 340 : 220) : k === 'rain' ? 360 : k === 'ash' ? 140 : k === 'hub' ? 70 : k === 'gold' ? 100 : k === 'utgard' ? 80 : 0;
  while (G.motes.length < want) G.motes.push(newMote(k, hw, hh, true));
  const bl = G.boss && G.boss.blizzard;
  for (let i = G.motes.length - 1; i >= 0; i--) {
    const m = G.motes[i]; m.t += dt;
    const wind = k === 'snow' ? (bl ? 520 : 60 + Math.sin(G.t * .4) * 40) : k === 'rain' ? 160 : 0;
    m.x += (m.vx + wind) * dt + Math.sin(m.t * m.f + m.ph) * m.sw * dt; m.y += m.vy * (k === 'snow' && bl ? 1.6 : 1) * dt;
    if (m.t > m.life || Math.abs(m.x - cam.x) > hw + 160 || Math.abs(m.y - cam.y) > hh + 200) G.motes[i] = newMote(k, hw, hh, false);
  }
}
function newMote(k, hw, hh, init) {
  const x = cam.x + rand(-hw - 140, hw + 100), y = cam.y + rand(-hh - 180, hh + 140);
  const m = { x, y, t: init ? rand(0, 6) : 0, ph: rand(0, TAU), f: rand(.5, 2), sw: 0, vx: 0, vy: 0, life: rand(4, 9), s: 1 };
  if (k === 'ember') { m.vy = -rand(6, 22); m.vx = rand(-8, 8); m.sw = rand(10, 30); m.s = rand(1, 2.8); m.col = Math.random() < .2 ? '#ffb347' : '#ff5a1a'; m.dark = Math.random() < .14; }
  if (k === 'snow') { m.vy = rand(40, 90); m.vx = rand(-10, 10); m.sw = rand(10, 30); m.s = rand(1, 3.4); }
  if (k === 'rain') { m.vy = rand(620, 820); m.s = rand(.8, 1.5); m.life = rand(.5, 1); }
  if (k === 'ash') { m.vy = -rand(6, 20); m.vx = rand(-12, 12); m.sw = rand(8, 20); m.s = rand(1, 2.8); m.col = Math.random() < .45 ? '#ff7a2a' : '#8a7f78'; }
  if (k === 'hub') { m.vy = -rand(10, 24); m.vx = rand(-6, 6); m.sw = rand(6, 16); m.s = rand(1, 2.4); m.col = Math.random() < .5 ? '#ffb34a' : '#b9d6ff'; }
  if (k === 'gold') { m.vy = -rand(10, 30); m.vx = rand(-10, 10); m.sw = rand(8, 20); m.s = rand(1, 3); m.col = '#ffe3a0'; }
  if (k === 'utgard') { m.vy = -rand(4, 14); m.vx = rand(-8, 8); m.sw = rand(10, 25); m.s = rand(1.4, 3); m.col = Math.random() < .5 ? '#9cff6a' : '#e6d36a'; }
  return m;
}
function drawMotes() {
  const k = G.weatherKind; if (!k) return;
  if (k === 'rain') { // driving rain: long pale streaks slanting with the storm
    const st = streakSpr(); ctx.save();
    for (let i = 0; i < G.motes.length; i++) { const m = G.motes[i], L = 50 + (i % 7) * 12; ctx.globalAlpha = .32 + (i % 4) * .09; ctx.setTransform(1, 0, 0, 1, 0, 0); applyCam(); ctx.translate(m.x, m.y); ctx.rotate(1.2); ctx.drawImage(st, -L, -1.6, L * 2, 3.2); }
    ctx.restore(); return;
  }
  if (k === 'snow') {
    const bl = G.boss && G.boss.blizzard;
    if (bl) { // driven snow: soft, motion-smeared streaks of every size
      const st = streakSpr(); ctx.save();
      for (let i = 0; i < G.motes.length; i++) { const m = G.motes[i], L = 24 + m.s * 26, a = .35 + (i % 5) * .12; ctx.globalAlpha = a * Math.min(1, m.t * 3); ctx.setTransform(1, 0, 0, 1, 0, 0); applyCam(); ctx.translate(m.x, m.y); ctx.rotate(.42); ctx.drawImage(st, -L, -m.s * 1.4, L * 2, m.s * 2.8); }
      ctx.restore(); return; }
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (const m of G.motes) { ctx.beginPath(); ctx.arc(m.x, m.y, m.s, 0, TAU); ctx.fill(); }
    return;
  }
  for (const m of G.motes) {
    const fl = .55 + .45 * Math.sin(m.t * 6 + m.ph), a = Math.min(1, m.t * 2, (m.life - m.t)) * fl;
    if (a <= 0) continue;
    if (m.dark) { ctx.fillStyle = hexA('#120c0a', .8 * a); ctx.beginPath(); ctx.arc(m.x, m.y, m.s * .8, 0, TAU); ctx.fill(); continue; }
    if (k === 'ash' && m.col === '#8a7f78') { ctx.fillStyle = hexA(m.col, .6 * a); ctx.fillRect(m.x, m.y, m.s * 1.6, m.s); continue; }
    glow(m.x, m.y, m.s * 5, m.col, a * .55);
    ctx.fillStyle = hexA(m.col === '#ff6a1a' ? '#ffb070' : m.col, a); ctx.beginPath(); ctx.arc(m.x, m.y, m.s * .6, 0, TAU); ctx.fill();
  }
}
function fogTint(col) { return fogTinted(col); }
let STREAK = null;
function streakSpr() { if (STREAK) return STREAK; const c = mkCanvas(128, 16), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.55, 'rgba(255,255,255,.9)'); gr.addColorStop(.75, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(64, 8, 64, 6, 0, 0, TAU); g.fill(); return STREAK = c; }
