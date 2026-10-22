/* THE SWAN FORTRESS FROM THE HILL — the title screen and the opening cutscene's stage. One room, four moods:
     title    the fortress at night in a storm: rain, lightning, crows round the keep, a flag cracking in the wind
     siege    the same, twelve years ago: the Margrave's army at the walls, ladders up, fires in the rain
     dawn     the morning after: an empty camp, smoke, the rain thinning
     present  the storm starting again
     wood     out of sight to the west (x ≈ −50): the clearing in the Wood where the bargain was made, with the witch
              and the young prince in it */
const EXTERIOR = SCENE.addRoom(new Room('exterior', { X0: -80, X1: 60, CEIL: 60, KZ: 0, cam: { y: 6, look: 9, dist: 40, fov: 19 }, exposure: 1.3, reflK: 0.55, noPlayer: true, far: 420,
  dof: { uNear0: 12, uNearR: 18, uFar0: 30, uFarR: 120 },
  music: 'title', ambience: { rain: 0.9, wind: 0.5 }, acoustics: { size: 2.6, wet: 0.18 }, surface: 'grass' }));
EXTERIOR.build = function () {
  const room = BUILD.begin(this), T = PX.T, G0 = 2.4;
  /* ground, the rock the fortress stands on, the road to the gate */
  room.floorMat = BUILD.reflective(T.grassWet, { k: 0.8, rough: 0.6 }); BUILD.plane('y+', -170, 150, -8.4, 190, 0, T.grassWet, { mat: room.floorMat, layer: 2 });
  BUILD.box(-28, 34, 0, G0, -34, -8.5, T.rockFace, { cast: false });
  BUILD.rug(T.mud, 1.2, 4.8, -8.4, 44, { rv: 52 / 1, ru: 3.6 });
  /* the curtain wall, merlons, corner towers with red caps */
  BUILD.box(-22, 28, G0, 11, -12, -9.5, T.stoneWet);
  for (let x = -21.5; x <= 27.6; x += 1.25) BUILD.box(x - 0.35, x + 0.35, 11, 11.9, -10.1, -9.5, T.stoneWet);
  for (const x of [-22, 28]) { const g = new THREE.CylinderGeometry(2.7, 2.9, 12.6, 14); g.translate(x, G0 + 6.3, -11); BUILD.planarUV(g, T.stoneWet); BUILD.add(new THREE.Mesh(g, BUILD.std(T.stoneWet)));
    const r = new THREE.ConeGeometry(3.2, 5.2, 12); r.translate(x, G0 + 12.6 + 2.6, -11); BUILD.planarUV(r, T.roofTile); BUILD.add(new THREE.Mesh(r, BUILD.std(T.roofTile))); }
  /* the gatehouse */
  BUILD.box(0.2, 5.8, G0, 14.5, -13, -8.6, T.stoneWet);
  for (let x = 0.6; x <= 5.5; x += 1.22) BUILD.box(x - 0.35, x + 0.35, 14.5, 15.4, -9.2, -8.6, T.stoneWet);
  BUILD.card(T.gateArch, 3, G0, -8.55, { basic: true, k: 1.1, cast: false });
  for (const x of [1.6, 4.4]) { BUILD.card(T.windowLit, x, 10.2, -8.55, { basic: true, k: 2.2, cast: false, s: 1.4 }); BUILD.glow(x, 10.6, -8.3, 1.4, 0xffb060, 0.25); }
  /* the keep: windows lit all the way up, a red pyramid roof, the swan flag */
  BUILD.box(12, 18, G0, 26, -19, -13, T.stoneWet);
  for (let x = 12.25; x <= 17.8; x += 1.1) BUILD.box(x - 0.32, x + 0.32, 26, 26.9, -13.6, -13, T.stoneWet);
  for (const [x, y] of [[13.6, 9], [16.4, 9], [15, 13.5], [13.6, 18], [16.4, 18], [15, 22]]) { BUILD.card(T.windowLit, x, y, -12.95, { basic: true, k: 2.2, cast: false, s: 1.6 }); BUILD.glow(x, y + 0.5, -12.7, 1.6, 0xffb060, 0.22); }
  { const r = new THREE.ConeGeometry(4.7, 7.5, 4); r.rotateY(Math.PI / 4); r.translate(15, 26.9 + 3.75, -16); BUILD.planarUV(r, T.roofTile); BUILD.add(new THREE.Mesh(r, BUILD.std(T.roofTile))); }
  BUILD.box(14.95, 15.05, 33.5, 38, -16.05, -15.95, T.woodPost, { cast: false });
  BUILD.windCard(T.flag, 15.0 + 0.94 * 1.6 / 2, 36.4, -16, 'wave', 0.12, { s: 1.6, cast: false });
  /* rooftops and the chapel spire behind the wall */
  for (const [x0, x1, y0, h] of [[-19, -9, 9.5, 3.6], [-7.5, -0.5, 9, 3], [7, 11.5, 9.5, 3.2], [19.5, 26, 9.2, 3.4]]) { BUILD.box(x0, x1, y0, y0 + 1.4, -22, -14, T.stoneWet, { cast: false }); BUILD.box(x0 - 0.3, x1 + 0.3, y0 + 1.4, y0 + 1.4 + h, -22.4, -13.6, T.roofTile, { taper: [1, 0.04], cast: false }); }
  BUILD.box(-7.2, -4.8, G0, 17, -21, -19, T.stoneWet); { const r = new THREE.ConeGeometry(1.5, 9, 8); r.translate(-6, 17 + 4.5, -20); BUILD.planarUV(r, T.roofTile); BUILD.add(new THREE.Mesh(r, BUILD.std(T.roofTile))); }
  BUILD.card(T.windowLit, -6, 12, -18.95, { basic: true, k: 2, cast: false, s: 1.3 });
  /* torches at the gate and along the wall */
  for (const [x, y, z] of [[0.6, 6.4, -8.45], [5.4, 6.4, -8.45], [-10, 8.8, -9.4], [21, 8.8, -9.4]]) { BUILD.flame(x, y, z, 0.9); BUILD.glow(x, y + 0.5, z + 0.2, 2.2, 0xff9040, 0.45);
    BUILD.light(new THREE.PointLight(0xff9a48, 30, 0, 2), x, y + 0.5, z + 1.2, { flicker: 6 }); }
  /* the sky, mountains, foreground */
  room.skyT = { storm: T.skyStorm, dawn: T.skyDawn };
  BUILD.sky(T.skyStorm, { z: -170, w: 700, h: 300, y: -60, k: 1.7, cloudScale: 1.8, clouds: [[T.cloudsA, -150, 18, 70, 0.004, 1.5, 1], [T.cloudsB, -130, 38, 60, 0.009, 1.4, 0.85]] });
  room.mtn = BUILD.card(T.mountains, 0, -4, -160, { w: 420, h: 46, basic: true, k: 0.8, cast: false, dyn: true });
  for (const [x, z, s] of [[-27, -6, 2.2], [-31, -3, 2.6], [-24, -1, 1.9], [33, -5, 2.4], [37, -2, 2.8], [30, 0, 2.0], [-40, 20, 3.6], [-34, 30, 4.2], [-46, 36, 4.8], [26, 34, 4.4]]) BUILD.windCard(T.pine, x, 0, z, 'sway', 0.04, { s, cast: false });
  for (let x = -26; x < 34; x += 4.6) BUILD.card(T.rock, x + hash(x, 1, 410) * 2, 0, -8.2 + hash(x, 2, 410), { s: 2.6 + hash(x, 3, 410) * 1.6, cast: false });
  for (const [x, z, s] of [[-8, 13, 2.4], [17, 15, 2.8], [-26, 11, 2.2], [30, 12, 2.4]]) BUILD.card(T.rock, x, 0, z, { s, cast: false });
  for (let i = 0; i < 26; i++) { const r = rng(400 + i); BUILD.windCard(T.tuft, -34 + r() * 74, 0, 6 + r() * 14, 'sway', 0.08, { s: 1.6 + r(), cast: false }); }
  BUILD.windCard(T.deadTree, -15, 0, 9, 'sway', 0.04, { s: 1.8, cast: false });
  /* light */
  BUILD.light(new THREE.HemisphereLight(0x3a4668, 0x1a1410, 1.9), 0, 40, 0);
  room.moon = BUILD.light(new THREE.DirectionalLight(0x8090c0, 1.4), -30, 60, 20); room.moon.target.position.set(10, 0, -12);
  room.fill = BUILD.light(new THREE.DirectionalLight(0x6a78a0, 0.35), 5, 10, 60); room.fill.target.position.set(10, 8, -10);
  BUILD.lightning({ x: 20, z: -40, k: 5, min: 5, max: 12 });
  BUILD.rain({ n: 2800, box: [-75, 50, 0, 42, -14, 30], speed: 16, wind: 0.22, len: 0.7, opacity: 0.4 });
  BUILD.rain({ n: 900, box: [-45, 25, 0, 24, 30, 70], speed: 18, wind: 0.22, len: 0.9, opacity: 0.3 });   // a nearer curtain, for the title's long view
  BUILD.flock(T.crow, [[15, 30, -14, 6, 2, 0.45], [14, 28.5, -12, 8, 1.5, -0.32], [17, 32, -16, 5, 2.5, 0.52], [11, 27, -10, 9, 3, 0.36], [18, 29, -15, 7, 2, -0.42], [-20, 18, -11, 5, 1.5, 0.4]], { s: 1.7 });
  /* the siege (hidden until the cutscene asks for it) */
  room.siege = new THREE.Group(); room.group.add(room.siege); room.siege.visible = false;
  const S = { parent: room.siege };
  for (const [z, x0, x1, k] of [[-6.2, -16, 26, 0.75], [-3.4, -20, 30, 0.85], [-0.4, -24, 32, 0.95], [2.6, -26, 34, 1.0]]) for (let x = x0; x <= x1; x += 6.0) BUILD.water(T.army, x + (z * 1.7) % 3, 0, z, Object.assign({ k: k * 0.9, rate: 2.2, s: 1.15 }, S));
  for (const x of [-13, -3.5, 9, 22, 25.5]) { const l = BUILD.card(T.ladder, x, 0, -6.2, Object.assign({ s: 2.63, cast: false, dyn: true }, S)); l.rotation.x = -0.307; }
  for (const [x, y, z, s] of [[-8, 0, -4, 1.6], [12.5, 0, -1.5, 1.9], [22, 0, -5, 1.4], [-12, 11.2, -9.8, 1.0], [26, 11.2, -9.8, 0.9]]) { BUILD.flame(x, y, z, s, true, S); BUILD.glow(x, y + 1, z + 0.4, 4.5 * s, 0xff7a2a, 0.5, S);
    const L = BUILD.light(new THREE.PointLight(0xff7a30, 0, 0, 2), x, y + 1.4, z + 1.5, { flicker: 7 }); room.siegeLights = (room.siegeLights || []).concat([[L, 60 * s]]); }
  room.smoke = [];
  for (let i = 0; i < 14; i++) { const m = new THREE.SpriteMaterial({ map: T.smokeSoft, color: 0x2a2624, transparent: true, opacity: 0, depthWrite: false }); const sp = new THREE.Sprite(m); room.siege.add(sp); room.smoke.push({ sp, ph: i / 14, src: [[-8, -4], [12.5, -1.5], [22, -5]][i % 3] }); }
  room.tick.push((t) => { if (!room.siege.visible && !room.dawn.visible) return; for (const s of room.smoke) { const u = (t * 0.07 + s.ph) % 1; s.sp.position.set(s.src[0] + u * 6, 1 + u * 16, s.src[1] - u * 3); s.sp.scale.setScalar(3 + u * 10); s.sp.material.opacity = 0.55 * Math.sin(u * Math.PI); } });
  /* the morning after */
  room.dawn = new THREE.Group(); room.group.add(room.dawn); room.dawn.visible = false;
  for (const [x, z, s] of [[-14, 3, 2.2], [-4, 6, 2.6], [8, 2, 2.4], [20, 5, 2.8], [29, 1, 2.0]]) BUILD.card(T.tent, x, 0, z, { s, cast: false, dyn: true, parent: room.dawn });
  for (const s of room.smoke.slice(0, 6)) { const sp = s.sp.clone(); sp.material = s.sp.material.clone(); room.dawn.add(sp); room.smoke.push({ sp, ph: s.ph + 0.5, src: [[-4, 6], [20, 5]][room.smoke.length % 2] }); }
  /* the clearing in the Wood, far to the west */
  const WX = -50;
  for (let i = 0; i < 22; i++) { const r = rng(500 + i), back = i < 15; BUILD.windCard(T.pine, WX - 16 + r() * 32, 0, back ? -7 - r() * 6 : 9 + r() * 5, 'sway', 0.05, { s: 1.6 + r() * 1.2, cast: false }); }
  room.woodGrp = new THREE.Group(); room.group.add(room.woodGrp); const WG = { parent: room.woodGrp };   // the fire only burns on the night of the bargain
  BUILD.card(PX.T.logs, WX, 0, 2, Object.assign({ s: 1.3, cast: false, dyn: true }, WG)); BUILD.flame(WX, 0.14, 2.02, 1.0, true, WG); BUILD.glow(WX, 0.8, 2.3, 3.2, 0xff8a3a, 0.5, WG);
  room.woodFire = BUILD.light(new THREE.PointLight(0xff8a3c, 22, 0, 2), WX, 1.0, 3.0, { flicker: 7 });
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
  room.moon.color.set(dawn ? 0xd8b8a8 : 0x8090c0); room.moon.intensity = dawn ? 2.0 : 1.4;
  room.mtn.material.color.setScalar(dawn ? 1.0 : 0.8);
  const wood = m === 'wood'; for (const a of SCENE.actors) if (a.livesIn('exterior')) a.setVisible(wood);   // the witch and the young prince, only in the clearing
  room.woodGrp.visible = wood; for (const f of room.flick) if (f.L === room.woodFire) f.base = wood ? 22 : 0; room.woodFire.intensity = wood ? 22 : 0;
  room.rainU.uOp.value = wood ? 0.18 : room.rainU.uOp.value;
  AUDIO.ambience(dawn ? { rain: 0.2, wind: 0.3, birds: 0.5 } : m === 'siege' ? { rain: 0.8, wind: 0.4, fire: 0.6, crowd: 0.5 } : wood ? { fire: 0.6, wind: 0.5, rain: 0.35 } : { rain: 0.9, wind: 0.5 });
};
EXTERIOR.onEnter = function () { this.mode(this.modeName || 'title'); };
