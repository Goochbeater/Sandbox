/* NAR SHADDAA (2/2) — the canyon walls, the Exchange's Coin Room tower, the south gate and landing platform, street props with colliders,
   the endless skyline, air traffic, freighters and searchlights, and NAR.build which assembles it all into a level. */

/* one stack of a canyon wall: sx -1 west (faces +x), +1 east (faces -x); u is the distance out from the street line |x| = 20 */
NAR.block = function (B, sx, z0, z1, H, R, o) {
  o = o || {}; const S = B.S, N = B.N, G = B.G, X = (u) => sx * (20 + u), zc = (z0 + z1) / 2, w = z1 - z0, tint = NAR.TINT[Math.floor(R() * NAR.TINT.length)];
  const ab = (u0, y0, za, u1, y1, zb) => S.aabb(Math.min(X(u0), X(u1)), y0, za, Math.max(X(u0), X(u1)), y1, zb);
  const gy = o.gy !== undefined ? o.gy : 0.16, rec = o.rec !== undefined ? o.rec : 1.3, H1 = Math.max(14, H * (0.55 + R() * 0.2)), set = 2 + R() * 4;
  // the overhanging upper storeys and the recessed arcade under them
  const HA = Math.min(H1, 31); S.color(...tint); S.K = 7; ab(0, 5.0, z0, 15, HA, z1);
  if (H1 > HA) { S.K = 0; ab(0, HA, z0, 15, H1, z1); S.K = 1; S.color(tint[0] * 0.6, tint[1] * 0.6, tint[2] * 0.6); ab(-0.45, HA - 0.3, z0, 0.02, HA + 0.2, z1); S.color(...tint); S.K = 0; }
  ab(set, H1, z0 + 0.6, 15, H, z1 - 0.6); S.K = 1; S.color(tint[0] * 0.7, tint[1] * 0.7, tint[2] * 0.72); ab(set + 1, H, z0 + 1.2, 13, H + 2.6, z1 - 1.2);
  S.K = 1; S.color(0.3, 0.3, 0.32); ab(rec, -3, z0, 15, 5.0, z1); ab(0, gy - 0.2, z0, rec + 0.01, gy, z1);
  // shops / cargo bays in the arcade, pillars between them
  { let z = z0; while (z < z1 - 0.5) { const sw = Math.min(z1 - z, 3.5 + R() * 3), za = z + 0.45, zb = z + sw - 0.45; S.K = R() < 0.32 ? 3 : 2; S.color(0.45, 0.42, 0.4); ab(rec - 0.06, gy, za, rec, 4.4, zb); S.K = 1; S.color(tint[0] * 0.75, tint[1] * 0.75, tint[2] * 0.78); ab(0.05, gy, z, rec, 5.0, z + 0.45); z += sw; } S.K = 1; ab(0.05, gy, z1 - 0.45, rec, 5.0, z1); }
  // the awning over the walk, neon along its lip
  { const aw = 1.2 + R() * 0.8, ay = 4.3 + R() * 0.3, c = NAR.PALC[Math.floor(R() * NAR.PALC.length)]; S.K = 1; S.color(0.32, 0.31, 0.33); ab(-aw, ay, z0 + 0.3, 0.02, ay + 0.22, z1 - 0.3); N.color(...c); N.aabb(Math.min(X(-aw), X(-aw + 0.08)), ay - 0.05, z0 + 0.35, Math.max(X(-aw), X(-aw + 0.08)), ay + 0.02, z1 - 0.35); B.spill.push([X(-aw - 0.3), ay - 0.4, zc, c]); }
  // a long sign over the arcade
  if (R() < 0.85) { const sl = Math.min(w - 1.2, 3.5 + R() * 4), sz = zc + (R() - 0.5) * (w - sl - 1), cell = Math.floor(R() * 64), fl = R() < 0.3 ? 0.05 + R() * 0.9 : 0; NAR.signQuad(G, X(-0.06), 5.25, sz, sl, sl * 0.36, sx, cell, fl, 2.2); }
  // bulkheads every second storey, balconies, pipes, vents, a cargo door high up
  S.K = 1; for (let y = 5 + 7.2; y < H1 - 1; y += 7.2) { S.color(tint[0] * 0.6, tint[1] * 0.6, tint[2] * 0.62); ab(-0.28, y, z0, 0.02, y + 0.34, z1); }
  for (let i = 0, n = Math.floor(w / 6); i < n; i++) { const by = 5 + 3.6 * (2 + Math.floor(R() * Math.max(1, (H1 - 12) / 3.6))), bl = 2.5 + R() * 4, bz = z0 + 0.5 + R() * Math.max(0.1, w - bl - 1); if (by > H1 - 2) continue; S.color(0.34, 0.33, 0.33); ab(-1.5, by - 0.22, bz, 0.02, by, bz + bl);
    S.color(0.22, 0.22, 0.24); const nq = Math.floor(bl / 0.7); for (let q = 0; q <= nq; q++) ab(-1.48, by, bz + q * bl / nq - 0.03, -1.43, by + 1.05, bz + q * bl / nq + 0.03); ab(-1.5, by + 1.0, bz, -1.4, by + 1.1, bz + bl);
    if (R() < 0.45) { N.color(...NAR.PALC[Math.floor(R() * NAR.PALC.length)]); N.aabb(Math.min(X(-1.52), X(-1.45)), by - 0.3, bz, Math.max(X(-1.52), X(-1.45)), by - 0.22, bz + bl); } }
  for (let i = 0, n = 1 + Math.floor(R() * 3); i < n; i++) { const pz = z0 + 0.6 + R() * (w - 1.2), r = 0.14 + R() * 0.22, c = R(); S.color(c < 0.3 ? 0.5 : c < 0.6 ? 0.36 : 0.42, c < 0.3 ? 0.32 : c < 0.6 ? 0.42 : 0.4, c < 0.3 ? 0.22 : c < 0.6 ? 0.34 : 0.42); S.cyl(X(-r - 0.15), 5, pz, r, r, H1 - 5, 8); for (let y = 6; y < H1; y += 3.6) { S.cyl(X(-r - 0.15), y, pz, r + 0.06, r + 0.06, 0.18, 8); ab(-r - 0.1, y + 0.02, pz - 0.05, 0.0, y + 0.16, pz + 0.05); } }
  for (let i = 0, n = Math.floor(w / 3.5); i < n; i++) { const vy = 6 + R() * (H1 - 9), vz = z0 + 0.8 + R() * (w - 2.2), vw = 0.8 + R() * 1.4, vh = 0.6 + R() * 1.0; S.color(0.38, 0.38, 0.4); ab(-0.5 - R() * 0.5, vy, vz, 0.02, vy + vh, vz + vw); }
  if (w > 9 && R() < 0.5) { const cy = 9 + Math.floor(R() * 4) * 3.6, cz = zc + (R() - 0.5) * (w - 6); S.K = 3; S.color(0.5, 0.42, 0.3); ab(-0.12, cy, cz - 2.2, 0.02, cy + 4.6, cz + 2.2); S.K = 1; S.color(0.62, 0.48, 0.12); ab(-0.3, cy - 0.3, cz - 2.5, 0.02, cy, cz + 2.5); ab(-0.3, cy - 0.3, cz - 2.5, 0.02, cy + 4.9, cz - 2.2); ab(-0.3, cy - 0.3, cz + 2.2, 0.02, cy + 4.9, cz + 2.5); }
  if (!o.lite) NAR.greeble(B, sx, z0, z1, HA, H, set, R, ab, X);
  // blade signs standing out over the walk
  for (let i = 0, n = w > 8 ? 2 : 1; i < n; i++) if (R() < 0.8) { const bz = z0 + 1 + R() * (w - 2), bh = 4.5 + R() * 5, by = 6.5 + R() * Math.max(1, H1 - bh - 9), cell = 64 + Math.floor(R() * 32), fl = R() < 0.35 ? 0.05 + R() * 0.9 : 0;
    S.K = 1; S.color(0.16, 0.16, 0.18); ab(-2.3, by - 0.15, bz - 0.14, 0.02, by + bh + 0.15, bz + 0.14); NAR.bladeQuad(G, X(-2.25), X(-0.1), by, bh, bz, cell, fl);
    const c = NAR.PALC[Math.floor(R() * NAR.PALC.length)]; N.color(...c); N.aabb(Math.min(X(-2.38), X(-2.3)), by - 0.15, bz - 0.06, Math.max(X(-2.38), X(-2.3)), by + bh + 0.15, bz + 0.06); }
  // billboards and holos high on the face
  if (R() < 0.55 && H1 > 22) { const bw = Math.min(w - 1.5, 6 + R() * 6), bh = bw * 0.5, by = 14 + R() * (H1 - bh - 16), bz = zc + (R() - 0.5) * (w - bw - 1); const holo = R() < 0.5; NAR.signQuad(G, X(holo ? -0.6 : -0.08), by, bz, bw, bh, sx, holo ? 96 + Math.floor(R() * 32) : Math.floor(R() * 64), holo ? 2 + R() : (R() < 0.3 ? 0.5 : 0), holo ? 1.5 : 2.0);
    S.K = 1; S.color(0.2, 0.2, 0.22); ab(-0.12, by - 0.25, bz - bw / 2 - 0.2, 0.02, by + bh + 0.25, bz + bw / 2 + 0.2); }
  // the crown: neon edge, masts and beacons
  { const c = NAR.PALC[Math.floor(R() * NAR.PALC.length)]; N.color(...c); N.aabb(Math.min(X(set - 0.08), X(set)), H - 0.1, z0 + 0.6, Math.max(X(set - 0.08), X(set)), H + 0.06, z1 - 0.6); if (R() < 0.6) N.aabb(Math.min(X(-0.08), X(0)), H1 - 0.1, z0, Math.max(X(-0.08), X(0)), H1 + 0.04, z1);
    for (let i = 0, n = 1 + Math.floor(R() * 2); i < n; i++) { const mx = X(set + 2 + R() * 8), mz = z0 + 1.5 + R() * (w - 3), mh = 5 + R() * 16; S.K = 1; S.color(0.3, 0.3, 0.32); S.cyl(mx, H + 2.6, mz, 0.18, 0.08, mh, 6); N.color(4, 0.25, 0.15); N.box(mx, H + 2.6 + mh, mz, 0.35, 0.35, 0.35); } }
  // and the stack behind it, much taller, so the canyon goes up for ever
  { const bh = H + 20 + R() * (o.tall || 90), t2 = NAR.TINT[Math.floor(R() * NAR.TINT.length)]; S.K = R() < 0.4 ? 4 : 0; S.color(t2[0] * 0.85, t2[1] * 0.85, t2[2] * 0.9); ab(15, 0, z0 - 2, 30 + R() * 12, bh, z1 + 2); S.K = 1; S.color(0.3, 0.3, 0.32); ab(17, bh, z0, 28, bh + 3, z1);
    N.color(...NAR.PALC[Math.floor(R() * NAR.PALC.length)]); N.aabb(Math.min(X(14.95), X(15.05)), bh - 0.1, z0 - 2, Math.max(X(14.95), X(15.05)), bh + 0.1, z1 + 2); N.color(4, 0.25, 0.15); N.box(X(22), bh + 3, zc, 0.5, 0.5, 0.5); }
};
/* the kit-bash on a wall: window bays (frame, sill, header, mullions, a room behind the glass), AC units, ducts with flanges and a riser,
   cable bundles down the face, a stepped tier and an antenna cluster on the roof */
NAR.greeble = function (B, sx, z0, z1, HA, H, set, R, ab, X) {
  const S = B.S, N = B.N, w = z1 - z0;
  for (let fl = 2; fl * 3.6 + 3.2 < HA; fl++) { const y0 = fl * 3.6, wy0 = y0 + 1.15, wy1 = y0 + 2.55; let z = z0 + 0.7 + R() * 1.2;
    while (z < z1 - 2.4) { const n = 2 + Math.floor(R() * 4), za = Math.ceil(z / 1.1) * 1.1, zb = Math.min(za + n * 1.1, Math.floor((z1 - 0.5) / 1.1) * 1.1); if (zb - za < 1.0) break;
      if (R() < 0.82) { S.K = 6; S.color(1); ab(-0.03, wy0, za, 0.01, wy1, zb); S.K = 1; S.color(0.2, 0.2, 0.22); ab(-0.34, wy0 - 0.13, za - 0.12, 0.0, wy0, zb + 0.12); S.color(0.26, 0.25, 0.25); ab(-0.24, wy1, za - 0.12, 0.0, wy1 + 0.17, zb + 0.12); ab(-0.22, wy0, za - 0.12, 0.0, wy1, za); ab(-0.22, wy0, zb, 0.0, wy1, zb + 0.12);
        S.color(0.16); for (let q = za + 1.1; q < zb - 0.05; q += 1.1) ab(-0.1, wy0, q - 0.035, 0.0, wy1, q + 0.035);
        if (R() < 0.35) { const az = za + 0.2 + R() * Math.max(0.1, zb - za - 1.4); S.color(0.42, 0.42, 0.42); ab(-0.62, wy0 - 0.95, az, -0.02, wy0 - 0.25, az + 1.0); S.color(0.1); ab(-0.64, wy0 - 0.88, az + 0.1, -0.6, wy0 - 0.32, az + 0.9); S.color(0.3); ab(-0.25, wy0 - 1.05, az + 0.15, 0.0, wy0 - 0.95, az + 0.25); ab(-0.25, wy0 - 1.05, az + 0.75, 0.0, wy0 - 0.95, az + 0.85); } }
      z = zb + 0.8 + R() * 2.2; } }
  if (R() < 0.6) { const dy = 3.6 * (2 + Math.floor(R() * Math.max(1, (HA - 9) / 3.6))) + 2.9, c = R() < 0.5 ? [0.5, 0.48, 0.44] : [0.42, 0.34, 0.26]; S.K = 1; S.color(...c); ab(-0.78, dy, z0 + 0.2, -0.05, dy + 0.55, z1 - 0.2); S.color(c[0] * 0.75, c[1] * 0.75, c[2] * 0.75); for (let q = z0 + 0.6; q < z1 - 0.4; q += 1.6) ab(-0.84, dy - 0.05, q, -0.04, dy + 0.6, q + 0.12);
    for (let q = z0 + 1.5; q < z1 - 1; q += 3.2) ab(-0.2, dy - 0.25, q, 0.0, dy, q + 0.2); const rz = z0 + 1 + R() * (w - 2.5); S.color(...c); ab(-0.75, dy + 0.55, rz, -0.1, Math.min(H - 1, dy + 8 + R() * 10), rz + 0.65); }
  for (let i = 0; i < 2; i++) if (R() < 0.7) { const cz = z0 + 0.8 + R() * (w - 1.6), top = Math.min(HA - 1, 14 + R() * 20); S.K = 1; for (let k = 0; k < 3; k++) { const P = []; for (let y = top; y > 4.8; y -= 2.2) { const ph = (y * 0.7 + k) % 2 < 1 ? 1 : -1; P.push(new THREE.Vector3(X(-0.16 - k * 0.05 - (ph > 0 ? 0.14 : 0)), y, cz + k * 0.09 + ph * 0.12)); } S.color(0.07 + k * 0.03); if (P.length > 1) S.tube(P, 0.028 + k * 0.008, 4); }
    S.color(0.3); for (let y = top; y > 5; y -= 4.4) ab(-0.32, y - 0.06, cz - 0.08, 0.0, y + 0.06, cz + 0.32); }
  if (R() < 0.55) { const t = H + 6 + R() * 18; S.K = 0; S.color(0.4, 0.38, 0.36); ab(set + 3.5, H, z0 + 1.4, 14.5, t, z1 - 1.4); S.K = 1; S.color(0.28); ab(set + 3.2, t, z0 + 1.2, 14.8, t + 0.5, z1 - 1.2); N.color(...NAR.PALC[Math.floor(R() * NAR.PALC.length)]); N.aabb(Math.min(X(set + 3.45), X(set + 3.5)), t - 0.1, z0 + 1.4, Math.max(X(set + 3.45), X(set + 3.5)), t + 0.02, z1 - 1.4); }
  { const ax = X(set + 4 + R() * 5), az = z0 + 1.5 + R() * (w - 3), y = H + 2.6; S.K = 1; S.color(0.32); for (let i = 0; i < 4; i++) { const h = 3 + R() * 9, dx = (R() - 0.5) * 2.4, dz = (R() - 0.5) * 2.4; S.cyl(ax + dx, y, az + dz, 0.07, 0.04, h, 5); for (let q = 1; q < h; q += 1.6) S.box(ax + dx, y + q, az + dz, 0.8, 0.04, 0.04, R() * 3); }
    S.color(0.5); S.pushT(ax, y + 2.2, az + 1.6, R() * 6, 0.9); S.cyl(0, 0, 0, 0.12, 1.3, 0.45, 14); S.pop(); N.color(4, 0.25, 0.15); N.box(ax, y + 12.3, az, 0.25, 0.25, 0.25); }
};
NAR.walls = function (B, lite) {
  const R = NAR.rr(5150), L = lite ? { lite: true } : {};
  const west = [[16, 23, 46], [23, 30, 62], [30, 36, 38], [36, 41, 70], [41, 49, 52], [49, 58, 88], [58, 66, 60], [66, 75, 74], [75, 81, 44], [81, 86, 58], [86, 92, 40], [92, 98, 66]];
  const east = [[16, 22, 58], [22, 28, 42], [28, 33.5, 72], [33.5, 38.5, 50], [38.5, 47, 34, { rec: 4.5 }], [47, 57.5, 46, { rec: 4.5 }], [57.5, 64, 80], [64, 72, 56], [72, 78, 48], [78, 84, 66], [84, 91, 54], [91, 98, 76]];
  for (const [z0, z1, H, o] of west) NAR.block(B, -1, z0, z1, H + (R() - 0.5) * 8, R, Object.assign({}, L, o)); for (const [z0, z1, H, o] of east) NAR.block(B, 1, z0, z1, H + (R() - 0.5) * 8, R, Object.assign({}, L, o));
  // across the canyon: bridges, pipes, cables with lanterns
  const S = B.S, N = B.N;
  for (const [z, y, c] of [[70, 36, 1], [47, 54, 4]]) { S.K = 1; S.color(0.34, 0.33, 0.35); S.aabb(-20, y - 0.9, z - 1.6, 20, y, z + 1.6); S.color(0.24, 0.24, 0.26); for (const s of [-1, 1]) { S.aabb(-20, y, z + s * 1.6 - 0.06, 20, y + 1.1, z + s * 1.6 + 0.06); for (let x = -19; x <= 19; x += 2.5) S.aabb(x - 0.05, y, z + s * 1.55 - 0.05, x + 0.05, y + 1.1, z + s * 1.55 + 0.05); }
    for (let x = -16; x <= 16; x += 8) S.aabb(x - 0.12, y - 2.2, z - 1.5, x + 0.12, y - 0.9, z + 1.5); N.color(...NAR.PALC[c]); for (const s of [-1, 1]) N.aabb(-20, y - 0.98, z + s * 1.62 - 0.05, 20, y - 0.9, z + s * 1.62 + 0.05); }
  S.K = 1; for (const [z, y, n] of [[42, 40, 2], [63, 46, 1]]) for (let i = 0; i < n; i++) { const c = [[0.5, 0.33, 0.22], [0.36, 0.42, 0.34], [0.42, 0.42, 0.44]][i % 3]; S.color(...c); S.tube([new THREE.Vector3(-21, y + i * 0.7, z + i * 0.8), new THREE.Vector3(21, y + i * 0.7, z + i * 0.8)], 0.22 + i * 0.05, 8); for (let x = -15; x <= 15; x += 10) S.aabb(x - 0.3, y + i * 0.7 - 0.35, z + i * 0.8 - 0.35, x + 0.3, y + i * 0.7 + 0.35, z + i * 0.8 + 0.35); }
  for (const [z0, y0, z1, y1, sag, lan] of [[24, 13, 27, 15, 2.2, 1], [44, 11, 40, 14, 1.8, 1], [62, 15, 66, 12, 2.5, 1], [76, 12, 78, 16, 2, 1], [92, 14, 89, 11.5, 1.6, 1], [37, 22, 36, 19, 3, 0], [58, 24, 61, 21, 3, 0]]) {
    const P = []; for (let i = 0; i <= 16; i++) { const t = i / 16; P.push(new THREE.Vector3(lerp(-20, 20, t), lerp(y0, y1, t) - Math.sin(t * Math.PI) * sag, lerp(z0, z1, t))); } S.color(0.12, 0.12, 0.13); S.tube(P, 0.045, 4);
    if (lan) for (let i = 2; i < 16; i += 2) { const p = P[i]; S.tube([p, new THREE.Vector3(p.x, p.y - 0.5, p.z)], 0.015, 3); N.color(...NAR.PALC[(i + Math.round(z0)) % NAR.PALC.length]); N.box(p.x, p.y - 0.85, p.z, 0.22, 0.36, 0.22); } }
};

/* ---------------- the Coin Room: the Exchange's counting house, its fortress front and the tower behind ---------------- */
NAR.tower = function (B) {
  const S = B.S, N = B.N, G = B.G, Z = 16;
  // the fortress front: heavy durasteel, ribbed, round towers at the corners, one band of glazing, the vault door
  S.K = 7; S.color(0.46, 0.38, 0.3); S.aabb(-20, -3, -14, -5.2, 30, Z); S.aabb(5.2, -3, -14, 20, 30, Z); S.aabb(-5.2, 9, -14, 5.2, 30, Z); S.K = 1; S.color(0.12, 0.1, 0.1); S.aabb(-1.7, -0.5, -2, 1.7, 4.6, -1.8);
  S.K = 4; S.color(0.4, 0.36, 0.34); S.aabb(-16.5, 21.5, Z - 0.6, -6.5, 26.5, Z + 0.05); S.aabb(6.5, 21.5, Z - 0.6, 16.5, 26.5, Z + 0.05); S.K = 1;
  S.color(0.3, 0.25, 0.2); for (const y of [10.6, 14.6, 18.6, 27.6]) { S.aabb(-20, y, Z, -5.6, y + 0.55, Z + 0.55); S.aabb(5.6, y, Z, 20, y + 0.55, Z + 0.55); } S.aabb(-5.6, 27.6, Z, 5.6, 28.15, Z + 0.55);
  S.color(0.36, 0.3, 0.26); S.aabb(-5.2, 0, Z, -1.7, 9.2, Z + 1.74); S.aabb(1.7, 0, Z, 5.2, 9.2, Z + 1.74); S.aabb(-5.4, 4.6, Z - 0.2, 5.4, 9.6, Z + 1.9); S.color(0.6, 0.48, 0.2); S.aabb(-5.6, 9.6, Z - 0.2, 5.6, 10.1, Z + 2.1);
  S.K = 3; S.color(0.5, 0.44, 0.34); S.aabb(-1.75, 4.0, Z - 0.6, 1.75, 4.6, Z + 1.2); S.K = 1;
  S.color(0.3, 0.28, 0.27); for (const x of [-9.4, 8.65]) S.aabb(x, 0, Z, x + 1.5, 1.4, Z + 1.55);
  for (const x of [-18.05, -9.95, 9.95, 18.05]) { const big = Math.abs(x) > 15, h = big ? 36 : 13; S.color(0.42, 0.35, 0.28); S.cyl(x, 0, Z + 0.65, 1.0, 0.92, h, 16); S.color(0.6, 0.48, 0.2); for (let y = 3; y < h - 1; y += 4) S.cyl(x, y, Z + 0.65, 1.08, 1.08, 0.3, 16);
    if (big) { S.color(0.4, 0.33, 0.27); S.cyl(x, 13, Z + 0.2, 2.2, 2.0, 23, 16); let r = 2.2, y = 36; S.color(0.5, 0.4, 0.3); for (const k of [1.0, 0.95, 0.82, 0.62, 0.36, 0.08]) { S.cyl(x, y, Z + 0.2, r, 2.3 * k, 0.7, 16); r = 2.3 * k; y += 0.7; } N.color(3.4, 0.5, 2.6); N.cyl(x, 35.6, Z + 0.2, 2.25, 2.25, 0.25, 16); N.color(4, 0.3, 0.2); N.box(x, y + 0.2, Z + 0.2, 0.35, 0.35, 0.35); }
    else { N.color(3.4, 1.6, 0.35); N.box(x, 13, Z + 0.65, 0.7, 0.5, 0.7); } }
  N.color(3.4, 1.7, 0.4); for (const s of [-1, 1]) N.aabb(s * 1.7 - (s > 0 ? 0 : 0.12), 0, Z + 1.75, s * 1.7 + (s > 0 ? 0.12 : 0), 4.6, Z + 1.85); N.aabb(-1.82, 4.5, Z + 1.75, 1.82, 4.62, Z + 1.92);
  N.color(3.2, 0.5, 2.6); N.aabb(-20, 30, Z - 0.05, 20, 30.22, Z + 0.15); N.color(3.4, 1.6, 0.35); N.aabb(-20, 10.1, Z + 0.5, -5.6, 10.22, Z + 0.62); N.aabb(5.6, 10.1, Z + 0.5, 20, 10.22, Z + 0.62);
  NAR.signQuadZ(G, -12.5, 11.4, Z + 0.6, 10, 3.4, 1, 1, 0, 2.4); NAR.signQuadZ(G, 12.5, 11.4, Z + 0.6, 10, 3.4, 1, 5, 0, 2.4); NAR.signQuadZ(G, -12.8, 5.5, Z + 0.08, 7, 2.5, 1, 18, 0.4, 2); NAR.signQuadZ(G, 12.8, 5.5, Z + 0.08, 7, 2.5, 1, 22, 0, 2);
  NAR.signQuadZ(G, -11.5, 15.6, Z + 0.6, 7, 2.6, 1, 100, 2.3, 1.4); NAR.signQuadZ(G, 11.5, 15.6, Z + 0.6, 7, 2.6, 1, 104, 2.7, 1.4);
  // the counting tower, far back: a heavy drum, a glazed shaft with fins, the auction ring and its dome, the spire
  const TZ = -74; S.K = 1; S.color(0.42, 0.35, 0.28); S.cyl(0, -20, TZ, 26, 23, 62, 16); S.color(0.6, 0.48, 0.2); S.cyl(0, 42, TZ, 24, 17, 4, 16); N.color(3.4, 1.6, 0.35); N.cyl(0, 30, TZ, 25.6, 25.4, 0.5, 16);
  S.K = 4; S.color(0.4, 0.36, 0.36); S.cyl(0, 46, TZ, 15, 14, 84, 12); S.K = 1; S.color(0.32, 0.27, 0.23); for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * TAU; S.pushT(Math.cos(a) * 14.6, 46, TZ + Math.sin(a) * 14.6, -a); S.box(0, 0, 0, 2.2, 84, 1.2); S.pop(); }
  for (const y of [70, 100]) { S.color(0.4, 0.33, 0.27); S.cyl(0, y, TZ, 18, 18, 3, 16); N.color(...(y === 70 ? [3.2, 0.5, 2.6] : [0.3, 2.6, 3.2])); N.cyl(0, y + 1.3, TZ, 18.1, 18.1, 0.4, 16); }
  S.K = 2; S.color(0.4); S.cyl(0, 130, TZ, 27, 27, 11, 24); S.K = 1; S.color(0.6, 0.48, 0.2); S.cyl(0, 128, TZ, 15, 28, 2.4, 24); S.cyl(0, 141, TZ, 28, 27, 1.2, 24); N.color(3.4, 1.7, 0.4); N.cyl(0, 130.4, TZ, 27.15, 27.15, 0.5, 24); N.color(3.2, 0.5, 2.6); N.cyl(0, 140.4, TZ, 27.15, 27.15, 0.4, 24);
  { let r = 26, y = 142.2; S.color(0.5, 0.42, 0.34); for (const k of [1.0, 0.98, 0.93, 0.85, 0.74, 0.6, 0.43, 0.24, 0.06]) { S.cyl(0, y, TZ, r, 26 * k, 2.4, 24); r = 26 * k; y += 2.4; } S.color(0.3, 0.28, 0.27); S.cyl(0, y - 1, TZ, 4, 0.5, 60, 8); N.color(4, 0.3, 0.2); N.box(0, y + 59, TZ, 1.2, 1.2, 1.2); }
  N.color(3.4, 1.7, 0.4); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; N.box(Math.cos(a) * 26.3, 150, TZ + Math.sin(a) * 26.3, 0.9, 0.9, 0.9); }
  // the landing pad on the counting-house roof, cantilevered out over the forecourt
  const PY = 38, PZ = 6, PX = 9; S.color(0.38, 0.36, 0.36); S.cyl(PX, PY - 1.8, PZ, 13, 15, 1.8, 24); S.color(0.46, 0.42, 0.38); S.cyl(PX, PY - 3.4, PZ, 9, 13, 1.6, 24); N.color(3.4, 1.7, 0.4); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; N.box(PX + Math.cos(a) * 10.5, PY - 3.0, PZ + Math.sin(a) * 10.5, 0.6, 0.1, 0.6); }
  N.color(0.3, 2.6, 3.2); N.cyl(PX, PY - 3.5, PZ, 6, 6, 0.08, 24); N.color(3.4, 0.3, 0.2); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; N.box(PX + Math.cos(a) * 3.5, PY - 3.48, PZ + Math.sin(a) * 3.5, 0.4, 0.06, 0.4); } S.cyl(PX, 30, PZ - 6, 4.5, 3.2, PY - 33, 12); for (const s of [-1, 1]) S.tube([new THREE.Vector3(PX + s * 8, 30, -6), new THREE.Vector3(PX + s * 6, PY - 3, PZ - 2)], 0.7, 8);
  N.color(3.4, 1.7, 0.4); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; N.box(PX + Math.cos(a) * 14.7, PY + 0.02, PZ + Math.sin(a) * 14.7, 0.5, 0.12, 0.5); } N.color(0.3, 2.6, 3.2); N.cyl(PX, PY - 1.95, PZ, 15.05, 15.05, 0.18, 32);
  B.roofPad = { x: PX, y: PY, z: PZ };
  PHY.box(-20, -3, -14, 20, 30, Z); for (const x of [-18.05, -9.95, 9.95, 18.05]) PHY.cyl(x, Z + 0.65, 1.05, 0, 13); PHY.box(-5.2, 0, Z, -1.7, 9.2, Z + 1.74); PHY.box(1.7, 0, Z, 5.2, 9.2, Z + 1.74);
  for (const x of [-9.4, 8.65]) PHY.box(x, 0, Z, x + 1.5, 1.4, Z + 1.55);
};
/* the south gate: a landing-bay frame over the way in, the platform beyond it, the drop past its rail */
NAR.gate = function (B) {
  const S = B.S, N = B.N; S.K = 1; S.color(0.36, 0.34, 0.33); S.aabb(-20, 0, 98.1, -9.6, 26, 101); S.aabb(9.6, 0, 98.1, 20, 26, 101); S.aabb(-9.6, 11, 98.1, 9.6, 16, 101); S.color(0.62, 0.5, 0.12); S.aabb(-9.7, 10.6, 97.9, 9.7, 11, 101.2); for (const s of [-1, 1]) S.aabb(s * 9.6 - 0.2, 0, 97.9, s * 9.6 + 0.2, 11, 101.2);
  N.color(3.4, 1.7, 0.4); N.aabb(-9.4, 10.45, 97.86, 9.4, 10.6, 97.95); for (const s of [-1, 1]) N.aabb(s * 9.4 - 0.06, 0.2, 97.86, s * 9.4 + 0.06, 10.4, 97.95); NAR.signQuadZ(B.G, 0, 12, 97.84, 12, 3.4, -1, 9, 0, 2.4); NAR.signQuadZ(B.G, 0, 12, 101.06, 12, 3.4, 1, 13, 0, 2.4);
  S.color(0.6, 0.5, 0.15); S.aabb(-20, 0, 131.6, 20, 1.1, 132); N.color(3.2, 0.5, 0.3); for (let x = -18; x <= 18; x += 4) N.box(x, 1.1, 131.8, 0.3, 0.12, 0.3); N.color(0.3, 2.4, 3.2); for (let z = 104; z < 131; z += 3) { N.box(-14, 0.02, z, 0.4, 0.04, 1.2); N.box(14, 0.02, z, 0.4, 0.04, 1.2); }
  for (const s of [-1, 1]) { S.color(0.4, 0.38, 0.36); S.aabb(s * 20, -3, 101, s * 44, 64 + s * 10, 132); }
  S.color(0.3, 0.3, 0.32); S.aabb(-20, -6, 101, 20, -0.02, 132);   // the platform slab's thickness, seen from the drop
  PHY.box(-20, 0, 98.1, -9.6, 26, 101); PHY.box(9.6, 0, 98.1, 20, 26, 101); PHY.box(-20, 0, 131.6, 20, 1.1, 132); PHY.box(-44, -3, 101, -20, 70, 132); PHY.box(20, -3, 101, 44, 70, 132);
  // the dock office by the gate: a kiosk with a window, the dockmaster's stool and a sensor arch
  S.K = 1; S.color(0.34, 0.32, 0.3); S.aabb(12.2, 0, 102.4, 17.6, 3.2, 106.2); S.K = 6; S.color(1); S.aabb(12.1, 1.2, 102.9, 12.2, 2.6, 105.7); S.K = 1; S.color(0.62, 0.5, 0.12); S.aabb(12.0, 3.2, 102.2, 17.8, 3.45, 106.4);
  NAR.signQuad(B.G, 12.05, 2.75, 104.3, 2.6, 0.9, 1, 34, 0, 2.2); PHY.box(12.2, 0, 102.4, 17.6, 3.4, 106.2);
  S.color(0.3, 0.3, 0.32); for (const s of [-1, 1]) S.aabb(s * 3.2 - 0.25, 0, 103.6, s * 3.2 + 0.25, 4.2, 104.2); S.aabb(-3.45, 4.2, 103.6, 3.45, 4.6, 104.2); N.color(3.4, 0.5, 0.45); N.aabb(-3.0, 4.15, 103.55, 3.0, 4.2, 104.25);
  for (const s of [-1, 1]) PHY.box(s * 3.2 - 0.25, 0, 103.6, s * 3.2 + 0.25, 4.2, 104.2);
};

/* ---------------- props: each one registers its collider ---------------- */
NAR.taper = function (M, y, z0, z1, w0, w1, h0, h1, y1o) {
  const a = [[-w0 / 2, y, z0], [w0 / 2, y, z0], [w0 / 2, y + h0, z0], [-w0 / 2, y + h0, z0]], yo = y1o || 0, b = [[-w1 / 2, y + yo, z1], [w1 / 2, y + yo, z1], [w1 / 2, y + yo + h1, z1], [-w1 / 2, y + yo + h1, z1]];
  M.quad(a[1], a[0], a[3], a[2]); M.quad(b[0], b[1], b[2], b[3]); M.quad(a[0], a[1], b[1], b[0]); M.quad(a[3], b[3], b[2], a[2]); M.quad(a[1], a[2], b[2], b[1]); M.quad(a[0], b[0], b[3], a[3]);
};
NAR.turbine = function (P, N, x, y, z, r, L, hot) {
  P.K = 1; P.color(0.5, 0.48, 0.44); P.pushT(x, y, z, 0, Math.PI / 2); P.cyl(0, -L / 2, 0, r * 0.82, r, L * 0.75, 14); P.cyl(0, L * 0.25, 0, r, r * 1.08, L * 0.25, 14, { cap: false }); P.color(0.08); P.cyl(0, L / 2 - 0.02, 0, r * 0.9, r * 0.9, 0.03, 14); P.color(0.3); P.cyl(0, -L / 2 - 0.25, 0, r * 0.6, r * 0.82, 0.25, 14, { cap: false }); for (const yy of [-0.2, 0.15]) P.cyl(0, yy * L, 0, r + 0.02, r + 0.02, 0.06, 14, { cap: false }); P.pop();
  N.color(...(hot ? [0.5, 1.6, 3.2] : [0.5, 0.2, 0.1])); N.pushT(x, y, z - L / 2 - 0.26, 0, Math.PI / 2); N.cyl(0, 0, 0, r * 0.5, r * 0.5, 0.02, 12); N.pop();
};
NAR.speeder = function (P, N, x, z, ry, wreck, R) {   // an X-34-style landspeeder: long low hull, pointed nose, open cockpit, three turbines on struts
  const hov = wreck ? 0.12 : 0.5, cols = [[0.72, 0.5, 0.28], [0.62, 0.3, 0.18], [0.7, 0.64, 0.5], [0.42, 0.48, 0.54], [0.55, 0.42, 0.26]], c = cols[Math.floor(R() * cols.length)];
  const tx = wreck ? (R() - 0.5) * 0.12 : 0, tz = wreck ? (R() - 0.5) * 0.18 : 0; P.pushT(x, hov, z, ry, tx, tz); N.pushT(x, hov, z, ry, tx, tz);
  P.K = 5; P.color(...c); P.box(0, 0, -0.4, 1.8, 0.48, 2.6); NAR.taper(P, 0, 0.9, 2.7, 1.8, 0.45, 0.48, 0.16, 0.05); P.color(c[0] * 0.8, c[1] * 0.8, c[2] * 0.8); P.box(0, 0.48, -1.2, 1.6, 0.14, 1.0); NAR.taper(P, 0.48, -0.7, 0.9, 1.6, 1.2, 0.18, 0.06);
  P.color(0.12); P.box(0, 0.42, 0.05, 1.3, 0.12, 1.2); P.color(0.25, 0.2, 0.16); for (const s of [-1, 1]) { P.box(s * 0.33, 0.48, -0.15, 0.48, 0.18, 0.5); P.box(s * 0.33, 0.6, -0.42, 0.48, 0.5, 0.1); }
  P.color(0.2, 0.32, 0.4); P.pushT(0, 0.55, 0.75, 0, -0.95); P.box(0, 0, 0, 1.25, 0.42, 0.035); P.pop(); P.color(c[0] * 0.6, c[1] * 0.6, c[2] * 0.6); P.box(0, 0, -0.4, 1.86, 0.1, 2.66); for (const s of [-1, 1]) P.box(s * 0.9, 0.12, 0.2, 0.04, 0.2, 2.0);
  P.K = 1; P.color(0.35); for (const s of [-1, 1]) P.box(s * 1.0, 0.28, -1.35, 0.4, 0.12, 0.5); P.box(0, 0.6, -1.55, 0.14, 0.62, 0.5);
  NAR.turbine(P, N, -1.18, 0.34, -1.45, 0.3, 1.5, !wreck); NAR.turbine(P, N, 1.18, 0.34, -1.45, 0.3, 1.5, !wreck); NAR.turbine(P, N, 0, 1.16, -1.65, 0.3, 1.5, !wreck);
  if (!wreck) { N.color(0.15, 0.45, 0.8); N.box(0, -hov + 0.02, 0, 1.6, 0.02, 3.6); } else { P.color(0.12); P.box(0.5, 0.3, -0.2, 0.9, 0.06, 1.2); }
  P.pop(); N.pop(); PHY.obox(x, z, 1.15, 2.4, 0, 1.4, ry);
};
NAR.hauler = function (P, N, x, z, ry, R) {   // a downed cargo hauler, nose-down, its containers askew
  P.pushT(x, 0.25, z, ry, 0.09, 0.15); N.pushT(x, 0.25, z, ry, 0.09, 0.15); P.K = 5;
  P.color(0.38, 0.3, 0.22); P.box(0, 0, -0.6, 3.2, 0.9, 9.6); P.color(0.62, 0.46, 0.18); P.box(0, 0.9, -0.6, 3.3, 0.18, 9.7);
  for (let i = 0; i < 3; i++) { const cz = -4.2 + i * 2.7, cc = [[0.36, 0.42, 0.3], [0.55, 0.32, 0.18], [0.3, 0.36, 0.44]][i]; P.K = 3; P.color(...cc); P.box((i - 1) * 0.08, 1.08, cz, 2.9, 1.9 - i * 0.15, 2.5, (i - 1) * 0.06); P.K = 1; P.color(0.2); P.box((i - 1) * 0.08, 1.08 + 1.9 - i * 0.15, cz, 2.96, 0.08, 2.56, (i - 1) * 0.06); P.color(0.8, 0.62, 0.1); P.box((i - 1) * 0.08, 1.5, cz + 1.26, 2.0, 0.12, 0.02); }
  P.K = 5; P.color(0.5, 0.48, 0.44); P.box(0, 0.9, 4.1, 2.9, 1.6, 1.8); NAR.taper(P, 0.9, 5.0, 5.9, 2.9, 2.2, 1.6, 0.9, -0.1); P.K = 6; P.color(1); P.box(0, 1.85, 4.4, 2.95, 0.45, 1.2); P.K = 1; P.color(0.18); P.box(0, 2.48, 4.1, 3.0, 0.1, 1.9);
  NAR.turbine(P, N, -1.9, 0.9, -4.6, 0.55, 2.2, false); NAR.turbine(P, N, 1.9, 0.9, -4.6, 0.55, 2.2, false); P.K = 1; P.color(0.3); for (const s of [-1, 1]) P.box(s * 1.75, 0.75, -4.4, 0.5, 0.3, 1.2);
  P.color(0.16); for (let i = 0; i < 8; i++) P.box((R() - 0.5) * 4.5, -0.25, (R() - 0.5) * 11, 0.4 + R() * 1.1, 0.12 + R() * 0.3, 0.4 + R() * 0.9, R() * 3);
  N.color(3.2, 1.2, 0.25); N.box(-1.1, 1.55, 5.95, 0.4, 0.22, 0.05); N.color(3.4, 0.3, 0.2); N.box(1.1, 1.55, 5.95, 0.4, 0.22, 0.05); P.pop(); N.pop();
  PHY.obox(x, z, 1.75, 5.9, 0, 3.0, ry);
};
NAR.crate = function (P, x, y, z, w, h, d, ry, c, col) { P.K = 1; P.color(...(c || [0.5, 0.46, 0.38])); P.box(x, y, z, w, h, d, ry); P.color(0.3, 0.3, 0.32); P.box(x, y + h - 0.08, z, w + 0.06, 0.1, d + 0.06, ry); P.box(x, y, z, w + 0.06, 0.1, d + 0.06, ry); if (col !== false) PHY.obox(x, z, w / 2 + 0.03, d / 2 + 0.03, y, y + h, ry || 0); };
NAR.fuel = function (P, N, x, z, r, R) { const h = 0.9 + r * 1.2; P.K = 1; P.color(...[[0.6, 0.55, 0.45], [0.5, 0.3, 0.2], [0.4, 0.45, 0.5]][Math.floor(R() * 3)]); P.cyl(x, 0, z, r, r, h, 10); P.color(0.25); P.cyl(x, h, z, r * 0.5, r * 0.4, 0.12, 8); N.color(...(R() < 0.5 ? [0.3, 2.4, 3] : [3.2, 1.5, 0.3])); N.cyl(x, h * 0.62, z, r + 0.015, r + 0.015, 0.07, 10); PHY.cyl(x, z, r, 0, h); };
NAR.gonk = function (P, N, x, z, ry) { P.pushT(x, 0, z, ry); P.K = 5; P.color(0.42, 0.4, 0.36); P.box(0, 0.42, 0, 0.8, 0.9, 0.6); P.color(0.25); for (const s of [-1, 1]) P.box(s * 0.22, 0, 0, 0.16, 0.44, 0.3); P.box(0, 0.6, 0.32, 0.5, 0.3, 0.06); P.pop(); N.color(3, 0.6, 0.2); N.box(x + Math.sin(ry) * 0.31, 1.05, z + Math.cos(ry) * 0.31, 0.08, 0.08, 0.04); PHY.cyl(x, z, 0.5, 0, 1.3); };
NAR.vaporator = function (P, N, x, z, r, h, R) {
  P.K = 1; P.color(0.62, 0.6, 0.55); P.cyl(x, 0, z, r * 0.9, r * 0.55, 1.2, 12); P.cyl(x, 1.2, z, r * 0.45, r * 0.4, h - 1.2, 12); P.color(0.4, 0.4, 0.42); for (let y = 1.6; y < h - 0.4; y += 1.1) P.cyl(x, y, z, r * 0.62, r * 0.62, 0.22, 12);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + R(); P.pushT(x + Math.cos(a) * r * 0.5, h * 0.55, z + Math.sin(a) * r * 0.5, -a); P.box(r * 0.25, 0, 0, r * 0.6, h * 0.35, 0.06); P.pop(); }
  P.color(0.3); P.cyl(x, h, z, 0.06, 0.03, 1.4, 5); N.color(3.6, 0.3, 0.2); N.box(x, h + 1.4, z, 0.16, 0.16, 0.16); N.color(0.3, 2.4, 3); N.cyl(x, 0.9, z, r * 0.9 + 0.02, r * 0.88, 0.06, 12); PHY.cyl(x, z, r * 0.9, 0, h);
};
NAR.lamp = function (P, N, x, z, sx, B) {   // street lamp: a bent arm over the kerb, a cyan ring at hand height
  P.K = 1; P.color(0.26, 0.26, 0.28); P.cyl(x, 0.16, z, 0.16, 0.1, 6.4, 8); P.cyl(x, 0.16, z, 0.26, 0.22, 0.5, 8); P.aabb(Math.min(x, x - sx * 1.8), 6.3, z - 0.08, Math.max(x, x - sx * 1.8), 6.5, z + 0.08);
  N.color(2.6, 2.8, 3.2); N.aabb(Math.min(x - sx * 0.2, x - sx * 1.8), 6.22, z - 0.06, Math.max(x - sx * 0.2, x - sx * 1.8), 6.3, z + 0.06); N.color(0.3, 2.4, 3.2); N.cyl(x, 2.4, z, 0.165, 0.14, 1.6, 8); PHY.cyl(x, z, 0.24, 0, 6.4);
  if (B) B.lamps.push([x - sx * 1.0, 6.0, z]);
};
NAR.arcade = function (P, N, G, sx, z0, z1, R) {   // a vendor arcade under a sloped canopy: posts, counters, goods, little signs
  const xk = sx * 10.7, xw = sx * 20, H = 3.4; P.K = 1; for (let z = z0; z <= z1 + 0.01; z += 2.4) { P.color(0.3, 0.3, 0.32); P.cyl(xk, 0.16, z, 0.13, 0.11, H, 6); PHY.cyl(xk, z, 0.16, 0, H); }
  P.color(0.42, 0.36, 0.3); P.pushT((xk + xw) / 2, H, (z0 + z1) / 2, 0, 0, -sx * 0.06); P.box(0, 0, 0, Math.abs(xw - xk) + 0.4, 0.14, z1 - z0 + 1.2); P.pop(); N.color(...NAR.PALC[sx > 0 ? 1 : 0]); N.aabb(xk - 0.06, H - 0.1, z0 - 0.6, xk + 0.06, H, z1 + 0.6);
  for (let z = z0; z < z1 - 1; z += 3.2) { const c = NAR.CRATEC[Math.floor(R() * NAR.CRATEC.length)], xs = sx * 19.35; P.color(c[0] * 0.7, c[1] * 0.7, c[2] * 0.7); P.aabb(Math.min(xs, sx * 20), 0.16, z + 0.3, Math.max(xs, sx * 20), 1.15, z + 2.6); P.color(0.25, 0.24, 0.24); P.aabb(Math.min(xs - sx * 0.1, sx * 20), 1.15, z + 0.2, Math.max(xs - sx * 0.1, sx * 20), 1.22, z + 2.7);
    for (let q = 0; q < 3; q++) { P.color(...NAR.CRATEC[Math.floor(R() * 5)]); P.box(sx * 19.65, 1.22, z + 0.6 + q * 0.7, 0.3, 0.2 + R() * 0.3, 0.4); }
    if (R() < 0.7) NAR.signQuad(G, sx * 19.98, 1.6, z + 1.45, 1.8, 0.65, sx, Math.floor(R() * 64), R() < 0.3 ? R() : 0, 2.2); }
};
NAR.barricade = function (P, N, ax, az, bx, bz) { const L = Math.hypot(bx - ax, bz - az) + 0.7, ry = Math.atan2(bx - ax, bz - az), x = (ax + bx) / 2, z = (az + bz) / 2; P.K = 1; P.color(0.42, 0.42, 0.4); P.box(x, 0, z, 0.62, 1.05, L, ry); P.color(0.62, 0.5, 0.12); P.box(x, 1.05, z, 0.66, 0.08, L + 0.04, ry); P.color(0.3, 0.3, 0.3); P.box(x, 0, z, 0.8, 0.14, L + 0.1, ry); PHY.obox(x, z, 0.4, L / 2, 0, 1.15, ry); };
NAR.holopost = function (P, N, G, x, z, R) { P.K = 1; P.color(0.28, 0.28, 0.3); P.cyl(x, 0, z, 0.12, 0.08, 4.4, 6); P.cyl(x, 0, z, 0.3, 0.26, 0.4, 8); P.box(x, 4.4, z, 0.3, 0.2, 0.3); NAR.signQuadZ(G, x, 4.6, z, 1.8, 1.0, 1, 96 + Math.floor(R() * 32), 2 + R(), 1.5); NAR.signQuadZ(G, x, 4.6, z, 1.8, 1.0, -1, 96 + Math.floor(R() * 32), 2 + R(), 1.5); PHY.cyl(x, z, 0.3, 0, 4.4); };
NAR.kiosk = function (P, N, x, z) { P.K = 1; P.color(0.3, 0.3, 0.32); for (let q = 0; q < 3; q++) { const a = q * 2.094; P.tube([new THREE.Vector3(x + Math.cos(a) * 0.7, 0, z + Math.sin(a) * 0.7), new THREE.Vector3(x, 1.5, z)], 0.04, 5); } P.cyl(x, 1.4, z, 0.06, 0.05, 2.2, 6); P.box(x, 3.5, z, 0.9, 0.6, 0.4); N.color(3.2, 3.2, 3.0); N.box(x, 3.55, z + 0.21, 0.75, 0.45, 0.02); N.box(x, 3.55, z - 0.21, 0.75, 0.45, 0.02); PHY.cyl(x, z, 0.75, 0, 1.6); };
NAR.signal = function (P, N, x, z) { P.K = 1; P.color(0.26); P.cyl(x, 0.16, z, 0.1, 0.08, 4, 6); P.box(x, 3.2, z, 0.35, 1.0, 0.35); N.color(3.4, 0.4, 0.3); N.box(x, 3.95, z + 0.18, 0.18, 0.18, 0.02); N.color(3.4, 2.0, 0.3); N.box(x, 3.65, z + 0.18, 0.18, 0.18, 0.02); N.color(0.4, 3.2, 1.0); N.box(x, 3.35, z + 0.18, 0.18, 0.18, 0.02); PHY.cyl(x, z, 0.15, 0, 4); };
/* the cargo lift: a caged platform in a lattice tower against the east wall, rising to the bridge at y 36 */
NAR.liftTower = function (B, x, z) {
  const S = B.S, N = B.N; S.K = 1; S.color(0.3, 0.3, 0.32);
  for (const [dx, dz] of [[-1.9, -1.9], [1.9, -1.9], [1.9, 1.9], [-1.9, 1.9]]) { S.aabb(x + dx - 0.12, 0, z + dz - 0.12, x + dx + 0.12, 38, z + dz + 0.12); PHY.box(x + dx - 0.14, 0, z + dz - 0.14, x + dx + 0.14, 38, z + dz + 0.14); }
  for (let y = 3; y < 38; y += 3) { S.color(0.36, 0.34, 0.33); for (const s of [-1, 1]) { S.aabb(x - 1.9, y, z + s * 1.9 - 0.06, x + 1.9, y + 0.12, z + s * 1.9 + 0.06); S.aabb(x + s * 1.9 - 0.06, y, z - 1.9, x + s * 1.9 + 0.06, y + 0.12, z + 1.9); } }
  S.color(0.62, 0.5, 0.12); S.aabb(x - 2.1, 0, z - 2.1, x + 2.1, 0.12, z + 2.1); N.color(3.4, 1.7, 0.4); for (const s of [-1, 1]) N.aabb(x - 1.8, 0.13, z + s * 1.8 - 0.05, x + 1.8, 0.16, z + s * 1.8 + 0.05);
  N.color(3.4, 0.4, 0.3); N.box(x, 38.2, z, 0.4, 0.4, 0.4); S.color(0.34, 0.33, 0.35); S.aabb(x - 2.2, 35.1, z - 2.2, x + 2.2, 36, z + 2.2);
};
NAR.props = function (B) {
  const P = B.P, N = B.N, G = B.G, R = NAR.rr(909);
  // parked and wrecked speeders, a downed hauler half across the street
  for (const [x, z, ry, wr] of [[-6.2, 92.5, 0.12, 0], [6.8, 88, -0.15, 0], [-4.6, 64.5, 1.3, 1], [7.4, 52.2, -2.8, 0], [-7.8, 44, 0.4, 0]]) NAR.speeder(P, N, x, z, ry, !!wr, R);
  NAR.hauler(P, N, 4.2, 72.5, 0.55, R);
  // the walks: lamps both sides, holo posts, kiosks, traffic signals
  for (const z of [22, 38, 54, 70, 86]) { NAR.lamp(P, N, -10.6, z, -1, B); NAR.lamp(P, N, 10.6, z + 3, 1, B); }
  for (const [x, z] of [[-9.7, 65.2], [9.7, 61.6], [-4.4, 94.5], [9.4, 82.5], [-9.4, 30], [9.4, 26]]) NAR.holopost(P, N, G, x, z, R);
  for (const [x, z] of [[-9.2, 66.4], [9.3, 66.8], [9.2, 96.4], [-9.2, 95.8]]) NAR.kiosk(P, N, x, z);
  for (const [x, z] of [[10.7, 82.6], [-10.7, 35.2]]) NAR.signal(P, N, x, z);
  NAR.arcade(P, N, G, -1, 76.6, 95.8, R); NAR.arcade(P, N, G, 1, 59.2, 80.8, R);
  // power droids, fuel cells, cargo
  for (const [x, z] of [[-8.6, 59], [1.2, 59.6], [8.8, 50.6], [3.6, 36.4], [-5.6, 33.2]]) { if (R() < 0.5) NAR.gonk(P, N, x, z, R() * 6); else { NAR.fuel(P, N, x - 0.25, z, 0.3, R); NAR.fuel(P, N, x + 0.3, z + 0.2, 0.26, R); NAR.crate(P, x, 0, z - 0.75, 0.7, 0.6, 0.5, R(), NAR.CRATEC[2]); } }
  for (const [x, z, r, hh] of [[-8.6, 22, 1.2, 6.5], [8.8, 21, 1.4, 8], [-15.5, 26, 0.9, 5], [15, 24, 1.0, 6]]) NAR.vaporator(P, N, x, z, r * 0.75, hh * 0.9 + 1.5, R);
  for (const [x0, z0, x1, z1] of [[-7.2, 79.4, -2.8, 81.8], [2.6, 46.2, 6.6, 45.0]]) NAR.barricade(P, N, x0, z0, x1, z1);
  for (const [x, z] of [[-15.8, 84], [15.6, 88], [-15.4, 52], [16.2, 34], [-16, 40]]) { NAR.crate(P, x, 0, z, 1.4, 1.2, 1.3, R() * 0.4, NAR.CRATEC[Math.floor(R() * 5)]); NAR.crate(P, x + 0.2, 1.2, z + 0.1, 0.9, 0.8, 0.9, R() * 0.6, NAR.CRATEC[Math.floor(R() * 5)]); }
  // street clutter against the walls: crates that stand in no one's way
  for (let i = 0; i < 22; i++) { const sx = R() < 0.5 ? -1 : 1, z = 18 + R() * 78, x = sx * (19.0 - R() * 0.5); if ((sx < 0 && z > 76 && z < 96) || (sx > 0 && z > 59 && z < 81) || (sx > 0 && z > 66 && z < 74)) continue; NAR.crate(P, x, 0.16, z, 0.8 + R() * 0.5, 0.6 + R() * 0.7, 0.8 + R() * 0.6, R(), NAR.CRATEC[Math.floor(R() * 5)]); }
  // the auction pedestal on the plaza: a ring plinth, an emitter, a ray-shielded case
  { const cx = 0, cz = 30; P.K = 1; P.color(0.36, 0.34, 0.36); P.cyl(cx, 0, cz, 1.9, 1.7, 0.35, 24); P.color(0.3, 0.3, 0.32); P.cyl(cx, 0.35, cz, 0.9, 0.7, 0.9, 16); P.color(0.62, 0.5, 0.2); P.cyl(cx, 1.25, cz, 0.95, 0.95, 0.12, 16);
    N.color(0.3, 2.4, 3.2); N.cyl(cx, 1.37, cz, 0.7, 0.6, 0.06, 16); N.cyl(cx, 0.36, cz, 1.72, 1.72, 0.04, 24); B.holo = [cx, 1.45, cz]; PHY.cyl(cx, cz, 1.0, 0, 1.4); }
  NAR.liftTower(B, 16.6, 69.2); B.lift = { x: 16.6, z: 69.2, top: 36 };
};

/* ---------------- the city past the map: spires for ever, traffic in lanes, freighters ---------------- */
NAR.skylineMat = (spire) => new THREE.ShaderMaterial({ fog: false, uniforms: { t: NAR.U.t, hz: { value: new THREE.Color(0.5, 0.22, 0.24) } },
  vertexShader: `attribute float aS; varying vec3 vW; varying vec3 vN; varying float vS; varying float vB; varying float vTop; void main(){ mat4 im = modelMatrix * instanceMatrix; vec4 w = im * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(im) * normal); vS = aS; vB = im[3].y; vTop = im[3].y + length(im[1].xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float t; uniform vec3 hz; varying vec3 vW; varying vec3 vN; varying float vS; varying float vB; varying float vTop; ${NAR.GL}
    void main(){ vec3 N = normalize(vN); float top = step(0.7, N.y); vec2 fp = abs(N.x) > abs(N.z) ? vec2(vW.z, vW.y) : vec2(vW.x, vW.y);
      vec3 base = mix(vec3(0.075, 0.06, 0.085), vec3(0.12, 0.085, 0.09), nsH(vec2(vS, 1.0))); float lam = 0.4 + 0.6 * max(dot(N, normalize(vec3(-0.5, 0.25, 0.85))), 0.0); vec3 col = base * lam + vec3(0.1, 0.04, 0.08) * top;
      ${spire ? 'float win = 0.0;' : `vec2 cl = floor(vec2(fp.x / 1.5, fp.y / 3.5)); vec2 f = fract(vec2(fp.x / 1.5, fp.y / 3.5)); float win = step(0.25, f.x) * step(f.x, 0.75) * step(0.34, f.y) * step(f.y, 0.66) * (1.0 - top);
      float h = nsH(cl + vS * 13.7); float lit = step(0.66 - 0.2 * fract(vS * 7.0), h); vec3 wc = h > 0.985 ? vec3(0.3, 1.4, 1.8) : h > 0.97 ? vec3(1.6, 0.4, 1.2) : h > 0.9 ? vec3(1.5, 1.35, 1.1) : vec3(2.0, 1.0, 0.42); col = mix(col, vec3(0.02, 0.02, 0.035), win * 0.6) + wc * lit * win * 1.1;`}
      float bh = mix(vB, vTop, 0.35 + 0.55 * fract(vS * 3.1)); float band = (1.0 - smoothstep(0.2, 0.6, abs(vW.y - bh))) * step(0.45, fract(vS * 5.3)) * (1.0 - top); vec3 bc = fract(vS * 11.0) > 0.5 ? vec3(3.0, 0.4, 2.2) : vec3(0.3, 2.4, 3.0); col += bc * band;
      float edge = (1.0 - smoothstep(0.3, 0.9, vTop - vW.y)) * (1.0 - top) * step(0.6, fract(vS * 2.3)); col += (fract(vS * 17.0) > 0.5 ? vec3(3.0, 1.4, 0.3) : vec3(0.4, 2.6, 3.0)) * edge;
      ${spire ? 'col += vec3(3.4, 0.25, 0.15) * (1.0 - smoothstep(0.5, 2.0, vTop - vW.y)) * step(0.5, fract(t * 0.7 + vS));' : ''}
      float d = length(vW - cameraPosition); vec3 hc = mix(vec3(0.16, 0.07, 0.12), hz, smoothstep(-120.0, 90.0, vW.y)); col = mix(col, hc, (1.0 - exp(-d * 0.0019)) * 0.8); gl_FragColor = vec4(col, 1.0); }` });
NAR.skyline = function (root, n) {
  const R = NAR.rr(2024), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), list = [], spires = [], max = n || 760;
  for (let i = 0; i < 1400 && list.length < max; i++) { const a = R() * TAU, rad = 55 + Math.pow(R(), 0.8) * 640, x = Math.cos(a) * rad, z = 40 + Math.sin(a) * rad; if (Math.abs(x) < 48 && z > -82 && z < 140) continue; if (Math.abs(x) < 70 && z > 135 && z < 175) continue;
    const cone = z < -60 && Math.abs(x - 25) < (88 - z) * 0.5, near = rad < 160, h = cone ? 18 + R() * (z < -300 ? 70 : 40) : (near ? 70 : 40) + Math.pow(R(), 1.6) * (near ? 230 : 360), w = 14 + R() * 30, d = 14 + R() * 30, y0 = -170 - R() * 40; list.push([x, y0, z, w, h - y0, d, R() * 0.6]); if (R() < 0.22) spires.push([x, h, z, 1.2 + R() * 2.5, 25 + R() * 70]); }
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0); const im = new THREE.InstancedMesh(box, NAR.skylineMat(false), list.length), seeds = new Float32Array(list.length);
  list.forEach((b, i) => { Q.setFromAxisAngle(YUP, b[6]); M.compose(new THREE.Vector3(b[0], b[1], b[2]), Q, new THREE.Vector3(b[3], b[4], b[5])); im.setMatrixAt(i, M); seeds[i] = R(); }); box.setAttribute('aS', new THREE.InstancedBufferAttribute(seeds, 1)); im.frustumCulled = false; root.add(im);
  const cone = new THREE.CylinderGeometry(0.05, 1, 1, 6, 1); cone.translate(0, 0.5, 0); const sm = new THREE.InstancedMesh(cone, NAR.skylineMat(true), spires.length), s2 = new Float32Array(spires.length);
  spires.forEach((s, i) => { M.compose(new THREE.Vector3(s[0], s[1], s[2]), new THREE.Quaternion(), new THREE.Vector3(s[3], s[4], s[3])); sm.setMatrixAt(i, M); s2[i] = R(); }); cone.setAttribute('aS', new THREE.InstancedBufferAttribute(s2, 1)); sm.frustumCulled = false; root.add(sm);
  return list.length + spires.length;
};
NAR.traffic = function (root, scale) {   // instanced boxes whose positions are computed in the vertex shader: zero CPU per frame
  const R = NAR.rr(3131), lanes = [], k0 = scale || 1;
  for (let i = 0; i < 12; i++) { const z = i < 8 ? -110 - R() * 360 : 190 + R() * 260, y = 35 + R() * 190, ang = (R() - 0.5) * 0.5; lanes.push([0, y, z, Math.cos(ang) * (R() < 0.5 ? 1 : -1), 0, Math.sin(ang), 1300, Math.round(24 * k0)]); }
  for (let i = 0; i < 4; i++) { const x = (i % 2 ? -1 : 1) * (80 + R() * 160), y = 50 + R() * 120; lanes.push([x, y, 60, 0, 0, R() < 0.5 ? 1 : -1, 1300, Math.round(24 * k0)]); }
  lanes.push([5.5, 112, 60, 0, 0, 1, 800, 22], [-5.5, 126, 60, 0, 0, -1, 800, 22], [0, 160, 60, 0, 0, 1, 900, 18]);
  const n = lanes.reduce((a, l) => a + l[7], 0), O = new Float32Array(n * 3), D = new Float32Array(n * 3), P = new Float32Array(n * 4); let k = 0;
  for (const l of lanes) { const sp = 22 + R() * 40; for (let i = 0; i < l[7]; i++, k++) { O.set([l[0] + (R() - 0.5) * 6, l[1] + (R() - 0.5) * 4, l[2]], k * 3); D.set([l[3], l[4], l[5]], k * 3); P.set([i / l[7] * l[6] + R() * 20, sp * (0.9 + R() * 0.2), l[6], R()], k * 4); } }
  const g = new THREE.BoxGeometry(1, 0.42, 2.8); const ig = new THREE.InstancedBufferGeometry().copy(g); ig.instanceCount = n; ig.setAttribute('aO', new THREE.InstancedBufferAttribute(O, 3)); ig.setAttribute('aD', new THREE.InstancedBufferAttribute(D, 3)); ig.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 4));
  const m = new THREE.ShaderMaterial({ fog: false, uniforms: { t: NAR.U.t, hz: { value: new THREE.Color(0.95, 0.42, 0.3) } },
    vertexShader: `uniform float t; attribute vec3 aO; attribute vec3 aD; attribute vec4 aP; varying float vZ; varying float vF; varying vec3 vW; void main(){ float s = mod(t * aP.y + aP.x, aP.z) - aP.z * 0.5; vec3 c = aO + aD * s; vec3 fw = normalize(aD); vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw)); vec3 up = cross(fw, rt); float S = 2.2;
      vec3 w = c + (rt * position.x + up * position.y + fw * position.z) * S; vW = w; vZ = position.z; vF = aP.w; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
    fragmentShader: `uniform vec3 hz; varying float vZ; varying float vF; varying vec3 vW; void main(){ vec3 c = vec3(0.12, 0.13, 0.17); if (vZ > 1.3) c = vF > 0.8 ? vec3(0.6, 2.4, 3.2) : vec3(3.2, 2.8, 2.2); if (vZ < -1.3) c = vF > 0.7 ? vec3(3.0, 0.4, 2.0) : vec3(3.4, 0.35, 0.2); float d = length(vW - cameraPosition); c = mix(c, hz, (1.0 - exp(-d * 0.0016)) * 0.5); gl_FragColor = vec4(c, 1.0); }` });
  const mesh = new THREE.Mesh(ig, m); mesh.frustumCulled = false; root.add(mesh); return n;
};
NAR.yt = function () {   // a saucer freighter, YT-line silhouette
  const S = new NAR.MB(), N = new NAR.MB(); S.K = 5; S.color(0.66, 0.65, 0.62); S.cyl(0, 0, 0, 13, 12.2, 1.3, 32); S.cyl(0, 1.3, 0, 12.2, 6.5, 1.5, 32); S.cyl(0, -1.1, 0, 10.5, 13, 1.1, 32, { cap: false }); S.color(0.5, 0.5, 0.48); S.cyl(0, 2.8, 0, 6.5, 5.5, 0.6, 24);
  for (const s of [-1, 1]) { S.color(0.62, 0.61, 0.58); S.box(s * 2.6, -0.6, 12.5, 3.2, 1.9, 8); } S.color(0.58, 0.57, 0.54); S.tube([new THREE.Vector3(8.5, 0.4, 7), new THREE.Vector3(12.2, 0.4, 12.5)], 1.5, 12); S.pushT(12.2, 0.4, 12.5, 0, Math.PI / 2 - 0.2); S.cyl(0, 0, 0, 1.5, 0.9, 1.5, 12); S.pop();
  S.color(0.4, 0.4, 0.42); S.cyl(2.5, 3.2, -3, 0.25, 0.25, 1.2, 6); S.pushT(2.5, 4.5, -3, 0, 0.6); S.cyl(0, 0, 0, 0.3, 2.4, 0.5, 14); S.pop(); S.color(0.45, 0.25, 0.2); S.box(-6, 1.4, -2, 2.5, 0.3, 4);
  N.color(0.5, 2.2, 4); for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 17 - 0.5) * 2.3; N.box(Math.sin(a) * 12.6, 0.3, Math.cos(a) * 12.6, 1.4, 0.6, 0.4, a); } N.color(2.4, 2.4, 2.6); N.box(12.4, 0.4, 13.4, 0.8, 0.5, 0.3);
  const g = new THREE.Group(); g.add(new THREE.Mesh(S.geo(), NAR.mats.solid), new THREE.Mesh(N.geo(), NAR.mats.neon)); return g;
};
NAR.transport = function () { const S = new NAR.MB(), N = new NAR.MB(); S.K = 5; S.color(0.62, 0.58, 0.52); S.box(0, 0, 0, 7, 5, 30); S.color(0.7, 0.66, 0.6); S.box(0, 5, 2, 5, 2, 18); S.box(0, 0.5, 16, 4, 3, 4); S.color(0.5, 0.2, 0.16); S.box(0, 2, -2, 7.2, 0.8, 22); N.color(0.5, 2.2, 4); for (const s of [-1, 1]) N.box(s * 2.2, 1, -15.1, 2.4, 2.6, 0.3); const g = new THREE.Group(); g.add(new THREE.Mesh(S.geo(), NAR.mats.solid), new THREE.Mesh(N.geo(), NAR.mats.neon)); return g; };
NAR.searchMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { c: { value: new THREE.Color(1.0, 0.9, 0.75) } },
  vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y / 160.0; vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: 'uniform vec3 c; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = pow(1.0 - clamp(vY, 0.0, 1.0), 1.7) * f * 0.11; gl_FragColor = vec4(c * a, 1.0); }' });

/* ---------------- build it into the current level ----------------
   o.lite: thinner walls (no greeble), fewer spires and traffic (QUAL low). Returns the anchors the level script uses. */
NAR.build = function (L, o) {
  o = o || {}; NAR.ships = []; NAR.search = [];
  NAR.mats.solid = NAR.solidMat(); NAR.mats.neon = NAR.neonMat(); NAR.mats.sign = NAR.signMat(NAR.atlas()); NAR.mats.ground = NAR.groundMat();
  const B = { S: new NAR.MB(), N: new NAR.MB(), G: new NAR.MB(), P: new NAR.MB(), spill: [], lamps: [] };
  NAR.walls(B, o.lite); NAR.tower(B); NAR.gate(B); NAR.props(B);
  // colliders: the street, the platform, the canyon walls (the recessed arcades read as shopfronts behind the street line)
  PHY.box(-20, -1, 16, 20, 0, 101); PHY.box(-20, -6, 101, 20, 0, 131.6); PHY.box(-44, -3, 16, -20, 90, 98.1); PHY.box(20, -3, 16, 44, 90, 98.1);
  const root = new THREE.Group(); root.name = 'narShaddaa';
  const mk = (geo, mat, cast, ro) => { const m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; m.receiveShadow = !!cast; m.frustumCulled = false; if (ro !== undefined) m.renderOrder = ro; m.matrixAutoUpdate = false; m.updateMatrix(); root.add(m); return m; };
  // the ground: one quad over street + platform (the shader paints every marking)
  { const g = new THREE.PlaneGeometry(40, 116, 1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0, 16 + 58); mk(g, NAR.mats.ground, false).receiveShadow = true; }
  mk(B.S.geo(), NAR.mats.solid, true); mk(B.P.geo(), NAR.mats.solid, true); mk(B.N.geo(), NAR.mats.neon, false); mk(B.G.geo(), NAR.mats.sign, false, 3);
  const tris = (B.S.tris + B.P.tris + B.N.tris + B.G.tris) | 0;
  // the clan sigil over the counting-house door, the auction holo turning over the plaza
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshBasicMaterial({ map: NAR.emblemTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(2.4, 2.4, 2.4), fog: false, toneMapped: false })); m.position.set(0, 19.5, 16.12); m.renderOrder = 3; root.add(m); }
  let holoG = null;
  if (B.holo) { const tex = NAR.mats.sign.map, uv = NAR.cellUV(96), g = new THREE.PlaneGeometry(3.6, 1.8); const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) ? uv[2] : uv[0], a.getY(i) ? uv[3] : uv[1]);
    const mm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: new THREE.Color(1.1, 1.7, 2.4), fog: false, toneMapped: false });
    holoG = new THREE.Group(); for (const r of [0, Math.PI / 2]) { const q = new THREE.Mesh(g, mm); q.rotation.y = r; q.position.y = 2.6; holoG.add(q); } holoG.position.set(B.holo[0], B.holo[1], B.holo[2]); root.add(holoG);
    R.addLight({ pos: V3(B.holo[0], B.holo[1] + 1.5, B.holo[2]), col: new THREE.Color(0x40c8ff), i: 4, range: 9, prio: 2, on: true }); }
  NAR.skyline(root, o.lite ? 380 : 760); NAR.traffic(root, o.lite ? 0.5 : 1);
  // a freighter on the roof pad, more in the sky
  { const y = NAR.yt(); y.position.set(B.roofPad.x - 1, B.roofPad.y + 1.6, B.roofPad.z); y.rotation.y = 2.6; y.scale.setScalar(0.62); root.add(y);
    for (let i = 0; i < 3; i++) { const s = i === 2 ? NAR.transport() : NAR.yt(); root.add(s); NAR.ships.push({ g: s, i, ph: i * 2.1 }); } }
  // searchlights from the tower crown and the roof pad
  { const geo = new THREE.CylinderGeometry(0.8, 14, 160, 20, 1, true); geo.translate(0, 80, 0);
    for (const [x, y, z, sp, ph] of [[20, 143, -74, 0.21, 0], [-20, 143, -74, -0.17, 2], [0, 143, -54, 0.13, 4], [0, 143, -94, -0.25, 1], [18, 39, 16, 0.3, 3], [0, 39, 16, -0.27, 5]]) { const m = new THREE.Mesh(geo, NAR.searchMat()); m.position.set(x, y, z); m.frustumCulled = false; m.renderOrder = 4; root.add(m); NAR.search.push({ m, sp, ph }); } }
  // light: neon spill on the street from the awnings, the lamps, the gate
  const spill = B.spill;
  for (const [x, y, z, c] of spill) R.addLight({ pos: V3(x, y, z), col: new THREE.Color(c[0] / 3.4, c[1] / 3.4, c[2] / 3.4), i: 4.2, range: 12, prio: 1, on: true });
  for (const [x, y, z] of B.lamps) R.addLight({ pos: V3(x, y, z), col: new THREE.Color(0xbfd8ff), i: 2.6, range: 11, prio: 1, on: true });
  for (const [x, y, z, c] of [[0, 9, 99, 0xffb040], [0, 6, 112, 0xffc890], [0, 6, 124, 0xffc890], [0, 8, 18.5, 0xffa040]]) R.addLight({ pos: V3(x, y, z), col: new THREE.Color(c), i: 3.4, range: 16, prio: 1, on: true });
  LEVEL.add(root);
  L.updates.push((dt, t) => {
    NAR.U.t.value = t; if (holoG) holoG.rotation.y = t * 0.6;
    for (const s of NAR.search) s.m.rotation.set(0.42 + 0.18 * Math.sin(t * 0.37 + s.ph), t * s.sp + s.ph, 0, 'YXZ');
    for (const s of NAR.ships) { const g = s.g;
      if (s.i === 0) { const a = t * 0.045 + s.ph, r = 230; g.position.set(Math.cos(a) * r, 140 + Math.sin(t * 0.1) * 12, -60 + Math.sin(a) * r); g.rotation.set(0, -a, Math.sin(t * 0.2) * 0.1); }
      else if (s.i === 1) { const Ln = 1100, u = ((t * 34 + 300) % Ln) - Ln / 2; g.position.set(18 + u * 0.12, 96, 40 - u); g.rotation.set(0.04, Math.PI + 0.12, 0.15); }
      else { const Ln = 1400, u = ((t * 26) % Ln) - Ln / 2; g.position.set(u, 210, -330); g.rotation.set(0, Math.PI / 2, 0); } }
  });
  return { tris, holo: B.holo, lift: B.lift, roofPad: B.roofPad, root };
};
