/* =====================================================================
   PAINT — sprites are drawn flat, layer by layer, then inflated into
   relief (exact distance fields → rounded height) and lit per pixel:
   warm key light, cool shadow, bounce fill, rim, cavity occlusion,
   brush grain, and a hand-inked outline whose weight wanders.
   ===================================================================== */
const PNT = { noise: null, N: 256 };
const n3 = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const PKEY = n3(-.62, -.56, .56), PFILL = n3(.55, .7, .3);
function pnoise2(x, y, Px, Py) { // periodic value noise
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a, b) => hash2(((a % Px) + Px) % Px, ((b % Py) + Py) % Py + 17.3);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function brushNoise() { // tileable grain: diagonal brush strokes over soft mottling
  if (PNT.noise) return PNT.noise;
  const N = PNT.N, a = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    const stroke = pnoise2((u + v) * 22, (u - v) * 5, 22, 5) * .6 + pnoise2((u + v) * 44, (u - v) * 9, 44, 9) * .4;
    const mott = pnoise2(u * 5, v * 5, 5, 5) * .55 + pnoise2(u * 11, v * 11, 11, 11) * .3 + pnoise2(u * 23, v * 23, 23, 23) * .15;
    const fine = hash2(x, y);
    a[y * N + x] = stroke * .35 + mott * .55 + fine * .1;
  }
  return PNT.noise = a;
}
/* exact squared Euclidean distance transform (Felzenszwalb–Huttenlocher) */
function edt1(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const dq = q - v[k]; d[q] = dq * dq + f[v[k]]; }
}
function distField(alpha, W, H) { // distance (px) from each covered pixel to the nearest uncovered one
  const D = new Float32Array(W * H), m = Math.max(W, H), f = new Float32Array(m), d = new Float32Array(m), v = new Int32Array(m), z = new Float32Array(m + 1);
  for (let i = 0; i < W * H; i++) D[i] = alpha[i] > 127 ? 1e12 : 0;
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) f[y] = D[y * W + x]; f[0] = 0; f[H - 1] = 0; edt1(f, H, d, v, z); for (let y = 0; y < H; y++) D[y * W + x] = d[y]; }
  for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) f[x] = D[o + x]; f[0] = 0; f[W - 1] = 0; edt1(f, W, d, v, z); for (let x = 0; x < W; x++) D[o + x] = Math.sqrt(d[x]); }
  return D;
}
function boxBlur(src, W, H, r) { // separable box blur, twice ≈ gaussian
  const t = new Float32Array(W * H), o = new Float32Array(W * H);
  const pass = (a, b, w, h, stride, step) => {
    for (let j = 0; j < h; j++) {
      const base = j * stride; let s = 0; const k = 1 / (2 * r + 1);
      for (let i = -r; i <= r; i++) s += a[base + clamp(i, 0, w - 1) * step];
      for (let i = 0; i < w; i++) { b[base + i * step] = s * k; s += a[base + clamp(i + r + 1, 0, w - 1) * step] - a[base + clamp(i - r, 0, w - 1) * step]; }
    }
  };
  pass(src, t, W, H, W, 1); pass(t, o, H, W, 1, W); pass(o, t, W, H, W, 1); pass(t, o, H, W, 1, W);
  return o;
}
/*
  paintSprite({ box:[x0,y0,x1,y1] (units, relative to the anchor), s: px per unit,
    layers:[{ draw(g), r: pillow radius (units), amp: 0..1.4, h: base height (units),
              bump(g): grey relief strokes (128 = flat), bumpAmp, ink:true, inkW, spec, gloss, grain, flat }],
    light: [x,y,z], shadow:[r,g,b] mult, lit:[r,g,b] mult, rim: '#hex', rimA, ink: '#hex', inkW (px), ao, over(g) })
  → { c, ox, oy, wu, hu } — a drop-in for sprite()
*/
function paintSprite(o) {
  const pad = 6, s = o.s || 2, [x0, y0, x1, y1] = o.box;
  const W = Math.max(4, Math.ceil((x1 - x0 + pad * 2) * s)), H = Math.max(4, Math.ceil((y1 - y0 + pad * 2) * s));
  const ox = x0 - pad, oy = y0 - pad;
  const out = mkCanvas(W, H), og = out.getContext('2d');
  const tmp = mkCanvas(W, H), tg = tmp.getContext('2d', { willReadFrequently: true });
  const prep = g => { g.setTransform(s, 0, 0, s, -ox * s, -oy * s); g.lineJoin = 'round'; g.lineCap = 'round'; };
  const N = W * H, Hh = new Float32Array(N), top = new Int16Array(N).fill(-1), dTop = new Float32Array(N), cover = new Float32Array(N), below = new Float32Array(N);
  const albedo = new Float32Array(N * 4); // premultiplied rgb + a, composited over
  const LP = []; // per-layer shading params at each pixel are looked up via top[]
  o.layers.forEach((L, li) => {
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H); prep(tg); L.draw(tg);
    const id = tg.getImageData(0, 0, W, H).data, al = new Uint8Array(N);
    for (let i = 0; i < N; i++) al[i] = id[i * 4 + 3];
    const D = distField(al, W, H); let maxD = 1; for (let i = 0; i < N; i++) if (D[i] > maxD) maxD = D[i];
    let B = null;
    if (L.bump) { tg.setTransform(1, 0, 0, 1, 0, 0); tg.fillStyle = '#808080'; tg.fillRect(0, 0, W, H); prep(tg); L.bump(tg); B = tg.getImageData(0, 0, W, H).data; }
    const r = L.r ? Math.max(.5, L.r * s) : maxD, amp = (L.amp ?? 1) * r, base = (L.h || 0) * s, bA = (L.bumpAmp ?? 3) * s;
    // the relief of this layer alone, softened so the medial-axis creases round off
    let LH = new Float32Array(N);
    for (let i = 0; i < N; i++) { if (!al[i]) continue; const t = Math.min(1, D[i] / r); LH[i] = (L.flat ? t : L.r ? Math.sqrt(1 - (1 - t) * (1 - t)) : Math.sqrt(t) * .35 + (1 - (1 - t) * (1 - t)) * .65) * amp; }
    const rb = Math.max(1, Math.round(Math.min(r, maxD) * (L.soften ?? .16))); if (rb > 1) LH = boxBlur(LH, W, H, rb);
    for (let i = 0; i < N; i++) {
      const a = al[i] / 255; if (a <= 0) continue;
      const i4 = i * 4, pa = albedo[i4 + 3];
      // composite albedo (premultiplied)
      albedo[i4] = id[i4] / 255 * a + albedo[i4] * (1 - a); albedo[i4 + 1] = id[i4 + 1] / 255 * a + albedo[i4 + 1] * (1 - a); albedo[i4 + 2] = id[i4 + 2] / 255 * a + albedo[i4 + 2] * (1 - a); albedo[i4 + 3] = a + pa * (1 - a);
      let hgt = base + LH[i]; if (B) hgt += (B[i4] - 128) / 128 * bA * Math.min(1, D[i] / 2);
      if (a > .5) { below[i] = cover[i]; Hh[i] = hgt; top[i] = li; dTop[i] = D[i]; }
      cover[i] = Math.max(cover[i], a);
    }
    LP.push(L);
  });
  if (o.macro) { // the whole silhouette rounds off as one mass, too
    const al = new Uint8Array(N); for (let i = 0; i < N; i++) al[i] = cover[i] * 255; const D = distField(al, W, H); let mx = 1; for (let i = 0; i < N; i++) if (D[i] > mx) mx = D[i];
    for (let i = 0; i < N; i++) if (cover[i] > 0) { const t = Math.min(1, D[i] / mx); Hh[i] += Math.sqrt(1 - (1 - t) * (1 - t)) * mx * o.macro; }
  }
  // cavity occlusion from a blurred relief
  const blur = boxBlur(Hh, W, H, Math.max(2, Math.round((o.aoR || 7) * s / 2)));
  const nz = brushNoise(), NS = PNT.N, gs = o.grainScale || 1;
  const L0 = o.light ? n3(...o.light) : PKEY, F0 = PFILL;
  const sh = o.shadow || [.62, .56, .7], li = o.lit || [1.06, 1.02, .94], amb = o.amb || [.025, .03, .055];
  const rim = o.rim ? hexRGB(o.rim).map(v => v / 255) : null, rimA = o.rimA ?? .55;
  const ink = hexRGB(o.ink || '#140d0a').map(v => v / 255), inkW = (o.inkW ?? 1.6) * Math.max(1, s / 1.6), aoK = o.ao ?? 1;
  const img = og.createImageData(W, H), px = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, i4 = i * 4, a = albedo[i4 + 3]; if (a <= 0.003) continue;
    const L = top[i] >= 0 ? LP[top[i]] : LP[0];
    const hc = Hh[i], hl = x > 0 && cover[i - 1] > .5 ? Hh[i - 1] : hc - 1.5, hr = x < W - 1 && cover[i + 1] > .5 ? Hh[i + 1] : hc - 1.5;
    const hu = y > 0 && cover[i - W] > .5 ? Hh[i - W] : hc - 1.5, hd = y < H - 1 && cover[i + W] > .5 ? Hh[i + W] : hc - 1.5;
    let nx = (hl - hr) * .5, ny = (hu - hd) * .5, nzz = 1; const nl = Math.hypot(nx, ny, nzz); nx /= nl; ny /= nl; nzz /= nl;
    const ar = albedo[i4] / a, ag = albedo[i4 + 1] / a, ab = albedo[i4 + 2] / a;
    const dk = nx * L0[0] + ny * L0[1] + nzz * L0[2];
    let r, g, b;
    if (o.soft) { // airbrushed cel: a broad soft ramp, darker toward each contour, no plastic sheen
      const k = smooth(clamp((dk - (o.th ?? .05)) / (o.range ?? .85), 0, 1)), S2 = L.shade || o.shade || [.8, .86, 1];
      const ed = 1 - smooth(clamp(dTop[i] / ((L.edgeW ?? o.edgeW ?? 12) * s), 0, 1));
      const m = lerp(L.lo ?? o.lo ?? .74, 1.05, k) * (1 - ed * (L.edgeA ?? o.edgeA ?? .16)) + (L.lift || 0);
      r = ar * m * lerp(S2[0], 1, k); g = ag * m * lerp(S2[1], 1, k); b = ab * m * lerp(S2[2], 1, k);
      if (L.spec) { const hk = smooth(clamp((dk - (L.hiT ?? .95)) / .02 + .5, 0, 1)) * L.spec; r = lerp(r, 1, hk); g = lerp(g, 1, hk); b = lerp(b, 1, hk); }
      if (L.glow) { const gk = L.glow * (.55 + .45 * k); r = lerp(r, 1, gk * .5); g = lerp(g, 1, gk * .5); b = lerp(b, 1, gk * .5); }
      const ao = clamp((blur[i] - hc) / (6 * s), 0, 1) * .35 * aoK; r *= 1 - ao; g *= 1 - ao; b *= 1 - ao * .8;
      if (o.grain) { const gn = nz[((y * gs | 0) % NS) * NS + ((x * gs | 0) % NS)], gr = (L.grain ?? o.grain) * (gn - .5); r *= 1 + gr; g *= 1 + gr * .95; b *= 1 + gr * .9; }
      if (rim && o.rimDir) { // a coloured rim from a second light (lava below, sky behind): it defines the silhouette
        const ed = 1 - nzz, hl = Math.hypot(nx, ny) + 1e-4, tw = Math.max(0, (nx * o.rimDir[0] + ny * o.rimDir[1]) / hl);
        const rk = smooth(clamp((ed - (o.rimT ?? .3)) / .25, 0, 1)) * tw * rimA * (L.rimA ?? 1) * (1 - smooth(clamp(dTop[i] / ((L.rimW ?? o.rimW ?? 9) * s), 0, 1)));
        r = lerp(r, rim[0], rk); g = lerp(g, rim[1], rk); b = lerp(b, rim[2], rk);
      }
    } else if (o.cel) { // animation-cel: one crisp shadow tone, a soft airbrushed ramp, a hard glint
      const th = L.th ?? o.th ?? .5, tc = smooth(clamp((dk - th) / (o.edge ?? .05) + .5, 0, 1)), S2 = L.shade || o.shade || [.66, .7, .88];
      const air = .92 + .14 * smooth(clamp((dk - .15) / .75, 0, 1)) + (L.lift || 0);
      r = ar * lerp(S2[0], 1, tc) * air; g = ag * lerp(S2[1], 1, tc) * air; b = ab * lerp(S2[2], 1, tc) * air;
      if (L.spec) { const hk = smooth(clamp((dk - (L.hiT ?? .95)) / .015 + .5, 0, 1)) * L.spec; r = lerp(r, 1, hk); g = lerp(g, 1, hk); b = lerp(b, 1, hk); }
      if (rim) { const ed = 1 - nzz, away = Math.max(0, -(nx * L0[0] + ny * L0[1])) / (Math.hypot(nx, ny) + 1e-4); const rk = smooth(clamp((ed * away - .35) / .1, 0, 1)) * rimA * (L.rimA ?? 1); r = lerp(r, rim[0], rk); g = lerp(g, rim[1], rk); b = lerp(b, rim[2], rk); }
      const ao = clamp((blur[i] - hc) / (6 * s), 0, 1) * .3 * aoK; r *= 1 - ao; g *= 1 - ao; b *= 1 - ao * .85;
      if (L.grain) { const gn = nz[((y * gs | 0) % NS) * NS + ((x * gs | 0) % NS)], gr = L.grain * (gn - .5); r *= 1 + gr; g *= 1 + gr; b *= 1 + gr; }
    } else {
      const tt = smooth(clamp((dk - (o.term ?? .2)) / (o.soft ?? .55), 0, 1)), hi = smooth(clamp((dk - .84) / .14, 0, 1)) * (L.gloss ?? .5);
      const fl = Math.max(0, nx * F0[0] + ny * F0[1] + nzz * F0[2]) * .14;
      // shadow: a deeper, more saturated version of the colour; light: warm, with a colour-tinted sheen
      const sr = Math.pow(ar, 1.45) * sh[0] + amb[0], sg = Math.pow(ag, 1.45) * sh[1] + amb[1], sb = Math.pow(ab, 1.45) * sh[2] + amb[2];
      r = lerp(sr, ar * li[0], tt) + hi * (ar * .4 + .05) + ar * fl * .6, g = lerp(sg, ag * li[1], tt) + hi * (ag * .4 + .045) + ag * fl * .75, b = lerp(sb, ab * li[2], tt) + hi * (ab * .4 + .035) + ab * fl * 1.1;
      if (L.spec) { const rz = 2 * dk * nzz - L0[2], sp = Math.pow(Math.max(0, rz), L.shine || 24) * L.spec; r += sp; g += sp; b += sp; }
      if (rim) { const ed = 1 - nzz, away = Math.max(0, -(nx * L0[0] + ny * L0[1])) / (Math.hypot(nx, ny) + 1e-4); const rk = ed * ed * away * rimA * (L.rimA ?? 1); r += rim[0] * rk; g += rim[1] * rk; b += rim[2] * rk; }
      const mv = (nz[(((y * .25) | 0) % NS) * NS + (((x * .25) | 0) % NS)] - .5) * (L.vary ?? .18); r *= 1 + mv; g *= 1 + mv * .9; b *= 1 + mv * .7;
      if (L.hatch) { const hk = (1 - tt) * L.hatch, ph = ((x + y) % 5 + 5) % 5; if (ph < 1.2 && hk > .05) { const m = 1 - hk * .55; r *= m; g *= m; b *= m; } }
      const ao = clamp((blur[i] - hc) / (6 * s), 0, 1) * .6 * aoK; r *= 1 - ao; g *= 1 - ao; b *= 1 - ao * .85;
      const gn = nz[((y * gs | 0) % NS) * NS + ((x * gs | 0) % NS)], gr = (L.grain ?? .16) * (gn - .5); r *= 1 + gr; g *= 1 + gr * .95; b *= 1 + gr * .85;
    }
    // ink: the outer contour, and where a part lies over another
    if (L.ink !== false) {
      const w = (L.inkW ?? 1) * inkW * (.7 + .6 * nz[((y >> 2) % NS) * NS + ((x >> 2) % NS)]);
      const dO = dTop[i], inner = below[i] > .5 && L.innerInk !== false;
      let k = 0;
      if (cover[i] < 1 || top[i] < 0) k = 1; else if (dO < w + .8 && (inner || below[i] <= .5)) k = 1 - smooth(clamp((dO - w + .6) / 1.2, 0, 1));
      if (top[i] >= 0 && !inner && below[i] > .5) k *= 0;
      const ic = L.inkCol ? hexRGB(L.inkCol).map(v => v / 255) : ink;
      r = lerp(r, ic[0], k); g = lerp(g, ic[1], k); b = lerp(b, ic[2], k);
    }
    px[i4] = clamp(r, 0, 1) * 255; px[i4 + 1] = clamp(g, 0, 1) * 255; px[i4 + 2] = clamp(b, 0, 1) * 255; px[i4 + 3] = a * 255;
  }
  if (o.under) { // unlit things beneath the painting: a soft shadow on the ground
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H); tg.putImageData(img, 0, 0);
    prep(og); o.under(og); og.setTransform(1, 0, 0, 1, 0, 0); og.drawImage(tmp, 0, 0);
  } else og.putImageData(img, 0, 0);
  if (o.over) { prep(og); o.over(og); og.setTransform(1, 0, 0, 1, 0, 0); }
  return { c: out, ox, oy, wu: W / s, hu: H / s, s };
}
/* a soft contact shadow, drawn under sprites at runtime */
const SHADOWSPR = {};
function contactShadow() {
  if (SHADOWSPR.c) return SHADOWSPR.c;
  const c = mkCanvas(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 63);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.55, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return SHADOWSPR.c = c;
}
function dropShadow(g, x, y, rx, ry, a = 1) { g.globalAlpha = a; g.drawImage(contactShadow(), x - rx, y - ry, rx * 2, ry * 2); g.globalAlpha = 1; }
