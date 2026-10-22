/* THE SWAN FORTRESS FROM THE HILL — the title screen and the opening cutscene's stage. One room, four moods:
     title    the fortress at night in a storm: rain, lightning, crows round the keep, a flag cracking in the wind
     siege    the same, twelve years ago: the Margrave's army at the walls, ladders up, fires in the rain
     dawn     the morning after: an empty camp, smoke, the rain thinning
     present  the storm starting again
     wood     out of sight to the west (x ≈ −50): the clearing in the Wood where the bargain was made, with the witch
              and the young prince in it */
const EXTERIOR = SCENE.addRoom(new Room('exterior', { X0: -80, X1: 60, CEIL: 60, KZ: 0, cam: { y: 6, look: 9, dist: 40, fov: 19 }, exposure: 1.25, reflK: 0.3, noPlayer: true, near: 2, far: 600,
  dof: { uNear0: 20, uNearR: 30, uFar0: 60, uFarR: 200 }, fog: [0x1e2638, 0.0035],
  music: 'title', ambience: { rain: 0.9, wind: 0.5 }, acoustics: { size: 2.6, wet: 0.18 }, surface: 'grass' }));
EXTERIOR.P = 7;   // the crag's top: everything inside the walls stands on it
EXTERIOR.D = 5.5;  // texels per metre for everything seen from the title's distance (BUILD.density(95, 22)): the rooms' pixel size
/* the land: a crag with a plateau for the fortress, a road climbing its face to the gate, a meadow, hills behind */
EXTERIOR.ground = function () {
  const P = EXTERIOR.P, A = [38, 5], B = [9, -11];
  const road = (x, z) => { const dx = B[0] - A[0], dz = B[1] - A[1], t = clamp(((x - A[0]) * dx + (z - A[1]) * dz) / (dx * dx + dz * dz), 0, 1);
    return { d: Math.hypot(x - (A[0] + dx * t), z - (A[1] + dz * t)), y: P * t }; };
  const h = (x, z) => {
    const ox = x < -31 ? -31 - x : x > 35 ? x - 35 : 0, oz = z > -10 ? z + 10 : z < -52 ? -52 - z : 0, d = Math.hypot(ox, oz);
    const wf = oz > 0 && z > -10 ? 8 + noise1(x * 0.15, 250) * 3 : 12 + noise1(z * 0.1 + x * 0.05, 251) * 4, t = clamp(d / wf, 0, 1);
    const cliff = 1 - smooth(0.05, 0.55, t + (noise1(x * 0.21 + z * 0.13, 253) - 0.5) * 0.25);   // a steep face, then a skirt of scree
    let y = d === 0 ? P + (noise1(x * 0.2 + z * 0.17, 252) - 0.5) * 0.3 : P * (cliff * 0.85 + 0.15 * Math.pow(1 - t, 2));
    if (z < -58) y = Math.max(y, (noise1(x * 0.025, 254) * 14 + noise1(x * 0.08 + z * 0.05, 255) * 4 - 3) * smooth(-58, -100, z));   // hills behind
    const r = road(x, z); if (r.d < 2.4) y = r.y; else if (r.d < 8) y = Math.max(y, r.y - (r.d - 2.4) * 1.3);
    return y < 0.02 ? -0.3 : y;   // the meadow itself is the flat reflective plane
  };
  const cls = (x, z, ny) => { if (road(x, z).d < 2.2 || (z > -12.8 && z < -9.4 && x > 0.6 && x < 10)) return 'road'; return ny > 0.72 ? 'turf' : 'rock'; };
  return BUILD.terrain({ x0: -110, x1: 120, z0: -124, z1: 16, step: 1.6, h, cls, tex: { turf: PX.T.turfPix, rock: PX.T.cragPix, road: PX.T.roadPix }, side: { rock: true }, facet: { rock: true } });
};
/* the hill the view is taken from: a dark shoulder of land in the lower left, under the title */
EXTERIOR.hill = function () {
  const h = (x, z) => { const d = Math.hypot((x + 38) / 1.5, z - 46); return Math.max(-0.3, 19 * Math.pow(Math.max(0, 1 - d / 30), 1.3) + (noise1(x * 0.12 + z * 0.1, 256) - 0.5) * 2.2 * smooth(30, 8, d)); };
  return BUILD.terrain({ x0: -140, x1: 10, z0: 24, z1: 96, step: 2.2, h, cls: (x, z, ny) => (ny > 0.6 ? 'turf' : 'rock'), tex: { turf: PX.T.turfPix, rock: PX.T.cragPix }, side: { rock: true }, facet: { rock: true }, cast: false });
};
EXTERIOR.build = function () {
  const room = BUILD.begin(this), T = PX.T, P = this.P, D = this.D, RP = RAMP;
  const tile = { stone: PX.stoneTile(RP.stone, D, 301), inner: PX.stoneTile(RP.inner, D, 302), keep: PX.stoneTile(RP.keep, D, 303), red: PX.tileRoof(RP.red, D, 304), slate: PX.tileRoof(RP.slate, D, 305) };
  const F = (ramp, tl, seed, more) => Object.assign({ ramp, d: D, seed, tile: tl }, more || {});
  /* the meadow (wet, mirror-bright), the crag, the hill in front */
  room.floorMat = BUILD.reflective(T.meadowPix, { k: 0.55, rough: 0.7 }); BUILD.plane('y+', -170, 150, -124, 200, 0, T.meadowPix, { mat: room.floorMat, layer: 2 });
  room.land = EXTERIOR.ground(); room.hill = EXTERIOR.hill();
  /* the curtain wall: each run painted to its size, merlons along the outer edge, the side and back walls in plain courses */
  BUILD.facade(-24, -1, P - 1.5, P + 8, -15.5, -13, F(RP.stone, tile.stone, 311, { win: [[4, 4.5, 'slit'], [10, 4.5, 'slit'], [16, 4.5, 'slit'], [21, 4.5, 'slit']], ivy: [[1.5, 3, 6.5], [13, 2.2, 4]], bands: [7.2] }));
  BUILD.facade(7, 28, P - 1.5, P + 8, -15.5, -13, F(RP.stone, tile.stone, 312, { win: [[3.5, 4.5, 'slit'], [15, 4.5, 'slit'], [19, 4.5, 'slit']], ivy: [[9, 2.6, 5]], bands: [7.2] }));
  for (const [x, seed] of [[-17, 313], [-8.5, 314], [11.5, 315], [23.5, 316]]) BUILD.facade(x - 0.75, x + 0.75, P - 1.5, P + 5.5, -13.2, -12.1, F(RP.stone, tile.stone, seed, { grime: 0.5, streaks: 2 }));   // buttresses
  BUILD.box(-27, -24.5, P - 1.5, P + 8, -45, -14, tile.stone); BUILD.box(28.5, 31, P - 1.5, P + 8, -45, -14, tile.stone); BUILD.box(-25, 29, P - 1.5, P + 8, -47.5, -45, tile.inner);
  BUILD.crenels(-21, -13.28, -3.6, -13.28, P + 8, tile.stone); BUILD.crenels(9.6, -13.28, 25, -13.28, P + 8, tile.stone);
  BUILD.crenels(-26.72, -17.5, -26.72, -41.5, P + 8, tile.stone); BUILD.crenels(30.72, -17.5, 30.72, -41.5, P + 8, tile.stone); BUILD.crenels(-21, -45.3, 25, -45.3, P + 8, tile.inner);
  /* a timber hoarding on the east wall, where the siege came hardest */
  { const ht = PX.T.hoarding; ht.userData.d = D * 1.6; BUILD.box(12.4, 20.6, P + 6.4, P + 8.0, -13.2, -12.1, ht); BUILD.roof(12.4, 20.6, -13.6, -12.0, P + 8.0, 0.8, tile.red, { over: 0.25 });
    for (let x = 13; x <= 20.2; x += 1.2) BUILD.box(x - 0.08, x + 0.08, P + 5.5, P + 6.4, -13.1, -12.5, T.woodPost, { cast: false }); }
  /* the corner towers: painted drums, a corbelled ring, tall red cones */
  for (const [x, z, front, seed] of [[-25.5, -14.2, 1, 321], [29.5, -14.2, 1, 322], [-25.5, -45.5, 0, 323], [29.5, -45.5, 0, 324]]) {
    const turn = x < 0 ? 0.35 : -0.35;   // windows turned a little toward the view
    BUILD.tower(x, z, P - 2, P + 11.4, 3.8, F(RP.stone, tile.stone, seed, { batter: 0.92, bands: [9.2], ivyAngle: true, ivy: front ? [[x < 0 ? 1.1 : -1.3, 4, 7]] : [], win: front ? [[turn, 4.5, 'slit'], [turn, 9, 'lancet', 1], [turn + 0.9, 7, 'slit'], [turn - 0.9, 7, 'slit']] : [[0, 9, 'lancet', seed & 1]] }));
    BUILD.cyl(x, z, P + 11.2, P + 12.4, 3.98, tile.stone, { seg: 24 });
    BUILD.coneRoof(x, z, P + 12.4, 4.45, 7.4, RP.red, D, { seed });
    BUILD.box(x - 0.06, x + 0.06, P + 19.6, P + 21.2, z - 0.06, z + 0.06, T.woodPost, { cast: false }); }
  /* the gatehouse: a deep block painted with its arch, portcullis, the swan shield and a lit window; drum towers either side */
  BUILD.facade(-1, 7, P - 1.5, P + 11, -18, -12.2, F(RP.stone, tile.stone, 331, { arch: [4, 3.4, 4.6], crest: [4, 8.2], win: [[4, 10.4, 'lancet', 1], [1.4, 8.6, 'slit'], [6.6, 8.6, 'slit']], bands: [7.2] }));
  BUILD.crenels(-0.6, -12.48, 6.6, -12.48, P + 11, tile.stone); BUILD.crenels(-0.6, -17.7, 6.6, -17.7, P + 11, tile.stone);
  for (const [x, seed] of [[-1.7, 332], [7.7, 333]]) { BUILD.tower(x, -12.9, P - 1.5, P + 13, 2.5, F(RP.stone, tile.stone, seed, { batter: 0.93, bands: [11.2], win: [[x < 3 ? -0.3 : 0.3, 5, 'slit'], [x < 3 ? -0.3 : 0.3, 10, 'slit'], [0, 12.2, 'lancet', 1]] }));
    BUILD.cyl(x, -12.9, P + 12.6, P + 13.6, 2.66, tile.stone, { seg: 20 }); BUILD.coneRoof(x, -12.9, P + 13.6, 3.0, 5.6, RP.slate, D, { seed }); }
  for (const x of [1.2, 6.8]) BUILD.windCard(T.swanBanner, x, P + 4.6, -12.1, 'sway', 0.08, { cast: false });
  /* inside the walls: houses whose roofs show over the battlements */
  for (const [x0, x1, z0, z1, hh, rh, along, seed] of [[-21, -12, -23, -17.5, 9, 4, 0, 341], [9, 15.5, -24, -18.5, 8.2, 3.4, 0, 342], [20, 26.5, -27, -17.5, 9.6, 3.6, 1, 343], [-10, -3, -22, -17.8, 7.6, 3.2, 0, 344]]) {
    const w = x1 - x0; BUILD.facade(x0, x1, P, P + hh, z0, z1, F(RP.inner, tile.inner, seed, { win: [[w * 0.3, hh - 2.6, 'square', seed & 1], [w * 0.7, hh - 2.6, 'square', 1 - (seed & 1)]], grime: 0.4 }));
    BUILD.roof(x0, x1, z0, z1, P + hh, rh, tile.red, { alongZ: !!along, gable: tile.inner, over: 0.45 }); }
  /* the great hall (the throne room): its tall windows lit, a slate roof, two chimneys */
  BUILD.facade(-16, 5, P, P + 10.5, -36, -26, F(RP.inner, tile.inner, 351, { bands: [8.6], win: [2.6, 5.6, 8.6, 12.4, 15.4, 18.4].map((x) => [x, 3.2, 'tall', 1]) }));
  BUILD.roof(-16, 5, -36, -26, P + 10.5, 5.6, tile.slate, { gable: tile.inner, over: 0.6 });
  for (const x of [-11, 0]) BUILD.box(x - 0.7, x + 0.7, P + 12, P + 18.6, -31.7, -30.3, tile.inner);
  /* the chapel, its tower and spire */
  BUILD.box(-24, -18.5, P, P + 8, -43, -35, tile.inner); BUILD.roof(-24, -18.5, -43, -35, P + 8, 3.8, tile.red, { alongZ: true, gable: tile.inner, over: 0.4 });
  BUILD.facade(-22.8, -19.6, P, P + 14, -35, -31.6, F(RP.inner, tile.inner, 361, { win: [[1.6, 9.2, 'rose', 1], [1.6, 4, 'slit']], bands: [12.6] }));
  BUILD.crenels(-22.8, -31.85, -19.6, -31.85, P + 14, tile.inner, { w: 0.7, gap: 0.5 });
  BUILD.coneRoof(-21.2, -33.3, P + 14, 2.3, 8.5, RP.slate, D, { seg: 8, seed: 362 });
  /* the keep: painted face with its lit windows, corbelled top, bartizans, a slate pyramid, the swan flag */
  const KX0 = 10, KX1 = 19, KZ0 = -38, KZ1 = -29.5, KH = 19;
  BUILD.facade(KX0, KX1, P, P + KH, KZ0, KZ1, F(RP.keep, tile.keep, 371, { bands: [7.4, 13.6], win: [[2.3, 3.2, 'tall', 1], [6.7, 3.2, 'tall', 0], [4.5, 9, 'lancet', 1], [2.3, 15.2, 'lancet', 1], [6.7, 15.2, 'lancet', 1]] }));
  BUILD.box(KX0 - 0.4, KX1 + 0.4, P + KH - 1.2, P + KH + 0.4, KZ0 - 0.4, KZ1 + 0.4, tile.keep);
  BUILD.crenels(KX0 - 0.2, KZ1 + 0.17, KX1 + 0.2, KZ1 + 0.17, P + KH + 0.4, tile.keep); BUILD.crenels(KX0 - 0.2, KZ0 - 0.17, KX1 + 0.2, KZ0 - 0.17, P + KH + 0.4, tile.keep);
  BUILD.crenels(KX0 - 0.17, KZ0, KX0 - 0.17, KZ1, P + KH + 0.4, tile.keep); BUILD.crenels(KX1 + 0.17, KZ0, KX1 + 0.17, KZ1, P + KH + 0.4, tile.keep);
  BUILD.coneRoof((KX0 + KX1) / 2, (KZ0 + KZ1) / 2, P + KH + 0.4, 6.2, 8.6, RP.slate, D, { seg: 4, seed: 372 });
  for (const [x, z, s2] of [[KX0, KZ1, 373], [KX1, KZ1, 374], [KX0, KZ0, 375], [KX1, KZ0, 376]]) { BUILD.tower(x, z, P + KH - 4, P + KH + 2, 1.2, F(RP.keep, tile.keep, s2, { seg: 12, grime: 0.15, streaks: 3, win: [[0, 2.4, 'slit']] })); BUILD.coneRoof(x, z, P + KH + 2, 1.45, 3.2, RP.slate, D, { seg: 12, seed: s2 }); }
  const FY = P + KH + 0.4 + 8.6;
  BUILD.box(14.42, 14.58, FY - 0.6, FY + 4.4, -33.83, -33.67, T.woodPost, { cast: false });
  BUILD.windCard(T.flag, 14.5 + 1.4, FY + 2.4, -33.75, 'wave', 0.22, { s: 3, cast: false });
  /* torches: either side of the gate, along the wall-walk */
  for (const [x, y, z, k] of [[1.6, P + 2.6, -12.05, 1], [6.4, P + 2.6, -12.05, 1], [-12, P + 8.6, -13.1, 0.7], [-4, P + 8.6, -13.1, 0.7], [22, P + 8.6, -13.1, 0.7]]) {
    BUILD.flame(x, y, z, 1.0 * k + 0.4); BUILD.glow(x, y + 0.6, z + 0.3, 3.0 * k + 1, 0xff9040, 0.45);
    BUILD.light(new THREE.PointLight(0xff9a48, 50 * k, 0, 2), x, y + 0.8, z + 1.6, { flicker: 6 + x * 0.05 }); }
  /* the sky (painted once), cloud bands drifting across it, two ridges of mountains, forest on the hills */
  room.skyT = { storm: T.skyNight, dawn: T.skyDawn };
  BUILD.sky(T.skyNight, { z: -300, w: 640, h: 275, y: -30, k: 1.0, cloudScale: 1.4, clouds: [[T.cloudBand, -260, 44, 34, 0.0025, 1.0, 0.95], [T.cloudBand, -215, 64, 28, -0.004, 1.15, 0.8]] });
  room.mtn = BUILD.card(T.ridgeFar, 0, -6, -250, { w: 640, h: 80, basic: true, k: 1.0, cast: false, dyn: true });
  BUILD.card(T.ridgeNear, 20, -8, -180, { w: 520, h: 73, basic: true, k: 1.0, cast: false });
  const pine = (x, z, s) => BUILD.windCard(T.pine, x, room.land.height(x, z) - 0.3, z, 'sway', 0.04, { s, cast: false });
  for (let i = 0; i < 90; i++) { const r = rng(700 + i), x = -110 + r() * 230, z = -62 - r() * 55; if (room.land.height(x, z) > 1) pine(x, z, 2.2 + r() * 1.6); }   // forest on the hills
  for (let i = 0; i < 30; i++) { const r = rng(800 + i), side = i % 2 ? 1 : -1, x = side > 0 ? 40 + r() * 26 : -36 - r() * 26, z = -50 + r() * 50; pine(x, z, 2.4 + r() * 1.8); }   // round the foot of the crag
  for (let i = 0; i < 30; i++) { const r = rng(900 + i), x = -36 + r() * 76, z = -9 + r() * 9, y = room.land.height(x, z);   // outcrops and scrub on the crag's face
    if (y < 0.5 || y > P - 0.5 || Math.abs(x - 22) < 3) continue; if (r() < 0.5) BUILD.card(T.rock, x, y - 0.6, z + 0.6, { s: 2.2 + r() * 2 }); else BUILD.windCard(T.tuft, x, y - 0.2, z + 0.3, 'sway', 0.08, { s: 2 + r(), cast: false }); }
  /* on the near hill: a dead oak, rocks, grass bending in the wind */
  const hy = (x, z) => room.hill.height(x, z) - 0.3;
  BUILD.windCard(T.deadTree, -27, hy(-27, 42), 42, 'sway', 0.03, { s: 3.2, cast: false });
  for (const [x, z, s] of [[-46, 38, 6], [-54, 50, 7.5], [-40, 56, 6.5]]) BUILD.windCard(T.pine, x, hy(x, z), z, 'sway', 0.03, { s, cast: false });
  for (let i = 0; i < 46; i++) { const r = rng(1000 + i), x = -64 + r() * 56, z = 22 + r() * 44, y = hy(x, z); if (y < 0) continue; BUILD.windCard(T.tuft, x, y, z, 'sway', 0.1, { s: 2.2 + r() * 1.4, cast: false }); }
  for (const [x, z, s] of [[-31, 34, 3], [-20, 38, 2.2], [-38, 30, 3.4]]) BUILD.card(T.rock, x, hy(x, z) - 0.4, z, { s });
  for (const [x, z, s] of [[-8, 13, 2.4], [17, 15, 2.8], [44, 12, 2.4]]) BUILD.card(T.rock, x, 0, z, { s, cast: false });
  /* light: a cold moon from the front left (with shadows), a rim from behind the fortress, warm torches and windows */
  BUILD.light(new THREE.HemisphereLight(0x56648a, 0x18141a, 1.3), 0, 40, 0);
  room.moon = BUILD.shadow(BUILD.light(new THREE.DirectionalLight(0xa8b8e8, 2.0), -80, 70, 90), R.q === 'low' ? 1024 : 2048); room.moon.target.position.set(4, 10, -28);
  Object.assign(room.moon.shadow.camera, { left: -60, right: 60, top: 50, bottom: -50, near: 20, far: 260 }); room.moon.shadow.bias = -0.0006; room.moon.shadow.normalBias = 0.06; room.moon.shadow.camera.updateProjectionMatrix();
  room.fill = BUILD.light(new THREE.DirectionalLight(0x8aa0e0, 1.5), 60, 50, -150); room.fill.target.position.set(4, 10, -28);   // the rim
  BUILD.lightning({ x: 40, z: -90, k: 6, min: 5, max: 12 });
  BUILD.rain({ n: 3000, box: [-80, 60, 0, 50, -40, 30], speed: 17, wind: 0.22, len: 0.9, opacity: 0.38 });
  BUILD.rain({ n: 1400, box: [-70, 40, 0, 40, 30, 80], speed: 18, wind: 0.22, len: 1.0, opacity: 0.24 });   // a nearer curtain, for the long views
  BUILD.flock(T.crow, [[14.5, FY + 2, -33, 7, 2, 0.45], [13, FY, -31, 9, 1.5, -0.32], [16, FY + 4, -35, 6, 2.5, 0.52], [10, FY - 2, -29, 10, 3, 0.36], [18, FY + 1, -34, 8, 2, -0.42], [-21, P + 24, -33, 5, 1.5, 0.4]], { s: 2.4 });
  /* the siege (hidden until the cutscene asks for it): the host on the meadow and the road, ladders up from the ledge */
  room.siege = new THREE.Group(); room.group.add(room.siege); room.siege.visible = false;
  const SG = { parent: room.siege };
  for (const [z, x0, x1, k] of [[3, -30, 30, 0.8], [7, -36, 34, 0.9], [11, -40, 40, 1.0], [16, -44, 46, 1.05]]) for (let x = x0; x <= x1; x += 6.5) BUILD.water(T.army, x + (z * 1.7) % 3, 0, z, Object.assign({ k: k * 0.9, rate: 2.2, s: 1.3 }, SG));
  for (let t = 0.15; t < 0.95; t += 0.16) { const x = lerp(38, 9, t), z = lerp(5, -11, t); BUILD.water(T.army, x, P * t - 0.2, z + 1.2, Object.assign({ k: 0.85, rate: 2.2, s: 0.9 }, SG)); }
  for (const x of [-17, -8, 13.5, 23]) { BUILD.water(T.army, x, P, -10.4, Object.assign({ k: 0.8, rate: 2.6, s: 0.8 }, SG));
    const l = BUILD.card(T.ladder, x, P, -10.9, Object.assign({ s: 1.9, cast: false, dyn: true }, SG)); l.rotation.x = -0.26; }
  for (const [x, y, z, s] of [[-12, 0, 6, 2.0], [15, 0, 9, 2.3], [32, 0, 5, 1.8], [-16, P, -11, 1.2], [21, P, -11.2, 1.1], [16.5, P + 8.2, -12.6, 1.0]]) { BUILD.flame(x, y, z, s, true, SG); BUILD.glow(x, y + 1, z + 0.4, 4.5 * s, 0xff7a2a, 0.5, SG);
    const L = BUILD.light(new THREE.PointLight(0xff7a30, 0, 0, 2), x, y + 1.4, z + 1.5, { flicker: 7 }); room.siegeLights = (room.siegeLights || []).concat([[L, 80 * s]]); }
  room.smoke = [];
  for (let i = 0; i < 18; i++) { const m = new THREE.SpriteMaterial({ map: T.smokeSoft, color: 0x2a2624, transparent: true, opacity: 0, depthWrite: false }); const sp = new THREE.Sprite(m); room.siege.add(sp);
    room.smoke.push({ sp, ph: i / 18, src: [[-12, 0, 6], [15, 0, 9], [32, 0, 5], [16.5, P + 8, -12.6]][i % 4] }); }
  room.tick.push((t) => { if (!room.siege.visible && !room.dawn.visible) return; for (const s of room.smoke) { const u = (t * 0.07 + s.ph) % 1; s.sp.position.set(s.src[0] + u * 8, s.src[1] + 1 + u * 20, s.src[2] - u * 4); s.sp.scale.setScalar(4 + u * 14); s.sp.material.opacity = 0.55 * Math.sin(u * Math.PI); } });
  /* the morning after */
  room.dawn = new THREE.Group(); room.group.add(room.dawn); room.dawn.visible = false;
  for (const [x, z, s] of [[-22, 6, 3.0], [-8, 10, 3.4], [6, 5, 3.2], [24, 9, 3.6], [38, 4, 2.8], [-34, 12, 3.0]]) BUILD.card(T.tent, x, 0, z, { s, cast: false, dyn: true, parent: room.dawn });
  for (const s of room.smoke.slice(0, 6)) { const sp = s.sp.clone(); sp.material = s.sp.material.clone(); room.dawn.add(sp); room.smoke.push({ sp, ph: s.ph + 0.5, src: [[-8, 0, 10], [24, 0, 9]][room.smoke.length % 2] }); }
  /* the clearing in the Wood, far to the west */
  const WX = -62;
  for (let i = 0; i < 22; i++) { const r = rng(500 + i), back = i < 15; BUILD.windCard(T.pine, WX - 16 + r() * 32, 0, back ? -7 - r() * 6 : 9 + r() * 5, 'sway', 0.05, { s: 1.6 + r() * 1.2, cast: false }); }
  room.woodGrp = new THREE.Group(); room.group.add(room.woodGrp); const WG = { parent: room.woodGrp };   // the fire only burns on the night of the bargain
  { const fl = BUILD.rug(T.forestFloor, WX - 40, WX + 30, -70, 18, { ru: 70 * 32 / 64, rv: 88 * 32 / 64, y: 0.02 }); room.woodGrp.add(fl);
    for (let i = 0; i < 16; i++) { const r = rng(1100 + i); room.woodGrp.add(BUILD.windCard(T.pine, WX - 4 + r() * 26, 0, -16 - r() * 12, 'sway', 0.05, { s: 1.8 + r() * 1.2, cast: false })); } }   // a forest floor at the close-up's own pixel scale
  BUILD.card(PX.T.logs, WX, 0, 2, Object.assign({ s: 1.0, cast: false, dyn: true }, WG)); BUILD.flame(WX, 0.1, 2.02, 0.62, true, WG); BUILD.glow(WX, 0.55, 2.3, 2.0, 0xff8a3a, 0.4, WG);
  room.woodFire = BUILD.light(new THREE.PointLight(0xff8a3c, 14, 0, 2), WX, 0.9, 3.0, { flicker: 7 });
  room.WX = WX;
  BUILD.motes({ n: 40, boxes: [[WX - 3, WX + 3, 0.3, 3, 1, 4, 1]], embers: [WX, 0.3, 2.1], col: 0xffa860 });
  for (const o of room.group.children.slice(-2)) room.woodGrp.add(o);
  room.update(0, 0);
  return BUILD.end();
};
/* switch the hillside between its moods */
EXTERIOR.mode = function (m) {
  const room = this; room.modeName = m;
  room.siege.visible = m === 'siege'; room.dawn.visible = m === 'dawn';
  for (const [L, k] of room.siegeLights) { L.userData.base = m === 'siege' ? k : 0; L.intensity = L.userData.base; }
  for (const f of room.flick) if (room.siegeLights.some(([L]) => L === f.L)) f.base = m === 'siege' ? room.siegeLights.find(([L]) => L === f.L)[1] : 0;
  const dawn = m === 'dawn';
  room.skyMat.map = dawn ? room.skyT.dawn : room.skyT.storm; room.skyMat.needsUpdate = true;
  for (const c of room.clouds) { if (c.k0 === undefined) c.k0 = c.k; c.k = dawn ? 2.4 : c.k0; c.col.set(dawn ? 0xd8b0a8 : 0xffffff); c.m.color.copy(c.col).multiplyScalar(c.k); }
  room.noLightning = dawn; room.rainU.uOp.value = dawn ? 0.12 : m === 'present' ? 0.32 : 0.42;
  room.moon.color.set(dawn ? 0xe8c8b0 : 0xa8b8e8); room.moon.intensity = dawn ? 2.6 : m === 'wood' ? 0.5 : 2.0;   // in the Wood the fire does the lighting
  if (R.scene.fog) R.scene.fog.color.set(dawn ? 0x8a8090 : 0x1e2638);
  room.mtn.material.color.setScalar(dawn ? 1.3 : 1.0);
  const wood = m === 'wood'; for (const a of SCENE.actors) if (a.livesIn('exterior')) a.setVisible(wood);   // the witch and the young prince, only in the clearing
  room.woodGrp.visible = wood; for (const f of room.flick) if (f.L === room.woodFire) f.base = wood ? 14 : 0; room.woodFire.intensity = wood ? 14 : 0;
  room.rainU.uOp.value = wood ? 0.18 : room.rainU.uOp.value;
  AUDIO.ambience(dawn ? { rain: 0.2, wind: 0.3, birds: 0.5 } : m === 'siege' ? { rain: 0.8, wind: 0.4, fire: 0.6, crowd: 0.5 } : wood ? { fire: 0.6, wind: 0.5, rain: 0.35 } : { rain: 0.9, wind: 0.5 });
};
EXTERIOR.onEnter = function () { this.mode(this.modeName || 'title'); };
