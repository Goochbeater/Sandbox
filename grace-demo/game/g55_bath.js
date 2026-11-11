/* LBATH — the House of the Lantern's bathhouse, under the gallery: a limewashed cellar room, a great oak tub that is
   always hot, the copper that heats it, a drying rail, steam. Lena's domain: once she trusts the Falconer she would rather
   be here than upstairs (HOUSE.scene(id, 'bath'), 18+, behind NIGHT.confirm like every other).
   The scene is the night scene's engine on a stage (g26, g42) with the positions moved into the tub (LOVERS.stage):
   only the upright ones are offered, because a tub's wall hides anyone lying down. See ENGINE.md §13v. */
const LBATH = SCENE.addRoom(new Room('lbath', { X0: -8.6, X1: 8.6, CEIL: 4.0, KZ: 3.35, cam: { y: 2.3, look: 1.95, dist: 19.4, fov: 19 }, exposure: 1.05, reflK: 0.4, disguise: true,
  grade: { s: [0.96, 1.0, 1.05], h: [1.06, 1.0, 0.92] },   // cool in the wet shadows, warm where the fire and the lantern reach
  music: 'castle', ambience: { fountain: 0.22, fire: 0.3, tone: 0.2 }, acoustics: { size: 0.9, wet: 0.3 }, surface: 'stone', caption: ['The Bathhouse', 'Under the gallery. The water is always hot'] }));
LBATH.TUB = { x: -2.4, z: 1.55, r: 1.45, rim: 0.88, water: 0.83, seat: 0.5 };
LBATH.LINES = {
  door: ['Back up to the common room.'],
  tub: ['Oak, and older than the house. The water is hot. It is always hot, and nobody has ever seen Lena carry a bucket.', 'Rosemary in it. And something from the south that I can’t name.'],
  copper: ['The copper ticks as it heats. Somebody feeds this fire all night.', 'My father paid for that copper. Wanda told me so, as if it were a compliment.'],
  rail: ['Clean linen, and a red robe for whoever forgot his own.', 'Folded the way a lady’s maid folds. Corners like knives.'],
  window: ['A slit at the level of the street. Boots go by. Nobody looks down.'],
};
LBATH.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, CE = room.CEIL, KZ = room.KZ, L = room.LINES, U = LBATH.TUB;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle('lb' + k, L[k]));
  /* shell: limewash over a stone footing, wet flags, a low beamed ceiling */
  BUILD.plane('z', X0, X1, 0, CE, 0, T.bathPlaster);
  BUILD.box(X0, X1, 0, 1.45, 0, 0.14, T.ashlar, { col: 0xa89884 }); BUILD.box(X0, X1, 1.45, 1.53, 0, 0.19, T.ashlar, { col: 0xc0b098, cast: false });
  BUILD.box(X0, X1, 2.62, 2.7, 0, 0.03, T.woodRed, { col: 0xb04a3a, cast: false });   // a painted band round the room at head height: the house's red, even down here
  for (const [x, ax] of [[X0, 'x+'], [X1, 'x-']]) BUILD.plane(ax, 0, 9, 0, CE, x, T.bathPlaster, { col: 0x6a5c50 });   // the end walls are in shot (the room is narrower than the lens): kept dim, or they are two orange slabs
  room.floorMat = BUILD.reflective(T.chFlags, { k: 0.42, rough: 0.5 }); BUILD.plane('y+', X0, X1, 0, 9, 0, T.chFlags, { mat: room.floorMat, layer: 2 });   // wet flagstones: a sheen, not a mirror
  BUILD.plane('y-', X0, X1, 0, 9, CE, T.housePlanks, { col: 0x5a4a3a });
  for (let x = X0 + 1.0; x < X1; x += 2.45) BUILD.box(x - 0.15, x + 0.15, CE - 0.4, CE, 0, 9, T.beam, { cast: false });
  for (const x of [-5.6, 0.9]) BUILD.box(x - 0.13, x + 0.13, 0, CE, 0.14, 0.4, T.beam);   // posts against the wall, holding the gallery up
  /* the door up to the common room, a red lantern beside it */
  BUILD.card(T.doorBath, -7.3, 0, 0.16, { cast: false }); BUILD.card(T.redLantern, -6.35, 2.2, 0.3, { cast: false }); BUILD.glow(-6.35, 2.5, 0.4, 0.9, 0xff4a2a, 0.4);
  BUILD.light(new THREE.PointLight(0xff6a40, 1.6, 0, 2), -6.35, 2.4, 0.9, { flicker: 3 });
  room.interact('door', -7.3, 2.4, KZ, 0.8, () => { if (NIGHT.on) return; GAME.save(); SCENE.go('lantern', { x: -8.6, face: 1 }); }).label = 'Back up to the common room';
  /* the bench under the pegs: folded linen, two buckets */
  BUILD.card(T.bathPegs, -4.7, 1.25, 0.2, { cast: false });
  BUILD.box(-5.3, -4.1, 0.42, 0.5, 0.25, 0.8, T.woodDark); for (const x of [-5.2, -4.2]) BUILD.box(x - 0.04, x + 0.04, 0, 0.42, 0.3, 0.75, T.woodDark);
  BUILD.card(T.linen, -4.9, 0.5, 0.55, { w: 0.42, h: 0.16, cast: false }); BUILD.card(T.linen, -4.45, 0.5, 0.5, { w: 0.36, h: 0.22, cast: false, col: 0xd8c8b0 });
  BUILD.card(T.bathBucket, -5.0, 0, 0.95); BUILD.card(T.bathBucket, -4.5, 0, 1.1, { s: 0.9 });
  /* the tub: eight-sided oak, staves and hoops; inside it a bench under the water. Its rim stands a hand above the water,
     and the water is a real surface: from this lens it shows as a bright band behind the near rim, which is all the water
     anyone needs to see (a floor seen edge-on: ENGINE.md §13q) */
  BUILD.cyl(U.x, U.z, 0, U.rim, U.r, T.tubStaves, { seg: 12, open: true });
  BUILD.cyl(U.x, U.z, 0.1, U.rim, U.r - 0.09, T.tubStaves, { seg: 12, open: true, mat: BUILD.std(T.tubStaves, { col: 0x8a6a4a, side: THREE.BackSide }) });
  { const g = new THREE.RingGeometry(U.r - 0.09, U.r, 12); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 12); g.translate(U.x, U.rim, U.z); BUILD.add(new THREE.Mesh(g, BUILD.std(T.woodDark, { col: 0xb89a70 })), { cast: false }); }
  room.pool = BUILD.pool(T.water, U.x, U.water, U.z, U.r - 0.1, { seg: 12, rate: 4, glow: 0.5, col: 0xb8e0d8 });
  BUILD.box(U.x - 2.05, U.x - 1.55, 0, 0.3, U.z + 0.2, U.z + 0.9, T.woodDark);   // the step up into it
  BUILD.rug(T.duckboard, U.x - 1.3, U.x + 1.3, U.z + U.r + 0.05, U.z + U.r + 0.75, { ru: 3, rv: 1 });   // a duckboard where wet feet come down
  BUILD.card(T.bathStool, U.x + 1.95, 0, U.z + 0.5); BUILD.card(T.candles, U.x + 2.35, 0, U.z + 0.1, { s: 0.8 }); for (const [dx, y] of [[2.23, 0.3], [2.35, 0.4], [2.47, 0.26]]) BUILD.flame(U.x + dx, y, U.z + 0.11, 0.3);
  room.lights.candle = BUILD.light(new THREE.PointLight(0xffa050, 3.4, 0, 2), U.x + 2.25, 0.9, U.z + 0.7, { flicker: 8 });
  BUILD.box(U.x - 0.01, U.x + 0.01, 3.2, CE, U.z - 0.01, U.z + 0.01, T.woodPost, { cast: false }); BUILD.card(T.redLantern, U.x, 2.65, U.z, { cast: false }); BUILD.glow(U.x, 3.0, U.z + 0.05, 1.1, 0xff4a2a, 0.45);
  room.lights.lantern = BUILD.light(new THREE.PointLight(0xff7a50, 3.0, 0, 2), U.x, 2.9, U.z + 0.6, { flicker: 3 });
  room.interact('tub', U.x, 2.0, KZ, 1.2, () => say('tub'));
  /* shelves of jars over the stool; the drying rail; herbs hung from the beams to keep the damp sweet */
  BUILD.card(T.bathShelf, U.x + 2.5, 1.62, 0.2, { cast: false });
  BUILD.card(T.towelRail, 2.2, 0, 0.7); room.interact('rail', 2.2, 1.8, KZ, 0.7, () => say('rail'));
  for (const [x, z, s] of [[-6.6, 0.9, 1], [-3.9, 1.3, 1.1], [-0.6, 0.8, 0.9], [0.4, 1.4, 1.1], [3.2, 1.0, 1], [6.0, 1.2, 0.9], [7.6, 0.7, 1.1]]) BUILD.card(T.herbBunch, x, CE - 0.4 - 0.5 * s, z, { s, cast: false });
  /* the copper on its firebox, its pipe along the wall to the tub, firewood */
  const CX = 4.9; BUILD.box(CX - 0.6, CX + 0.6, 0, 0.56, 0.14, 1.0, T.brick, { col: 0x9a6a5a }); BUILD.card(T.copperBoiler, CX, 0, 1.02);
  BUILD.box(U.x + 0.9, CX - 0.3, 1.5, 1.57, 0.2, 0.27, T.woodDark, { col: 0xd08a4a, cast: false }); BUILD.box(U.x + 0.9, U.x + 0.97, 0.95, 1.57, 0.2, 0.27, T.woodDark, { col: 0xd08a4a, cast: false });
  BUILD.glow(CX, 0.3, 1.1, 0.9, 0xff7a2a, 0.3);
  room.lights.fire = BUILD.shadow(BUILD.light(new THREE.PointLight(0xff8a3c, 4.2, 0, 2), CX, 0.5, 2.0, { flicker: 7 }), R.q === 'low' ? 256 : 512); room.lights.fire.shadow.camera.near = 0.2;
  BUILD.card(T.logs, 6.6, 0, 0.6, { s: 1.2 }); BUILD.card(T.logs, 7.2, 0, 0.75); BUILD.card(T.bathBucket, 3.6, 0, 1.2);
  room.interact('copper', CX, 2.3, KZ, 0.9, () => say('copper'));
  /* the floor has to carry the front of the picture: a duckboard walk from the door to the copper, a drain, wet patches */
  BUILD.rug(T.duckboard, -7.9, 5.6, 3.0, 3.7, { ru: 14, rv: 1 });
  BUILD.rug(T.soot, 0.9, 1.5, 4.7, 5.1); for (const [x0, x1, z0, z1] of [[-4.6, -2.9, 4.3, 5.0], [2.6, 4.4, 5.3, 6.0], [-1.0, 0.2, 5.6, 6.1]]) { const m = BUILD.rug(T.soot, x0, x1, z0, z1, { y: 0.002 }); m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.28; }
  /* a slit of a window at street level, the moon in it */
  BUILD.card(T.streetSlit, 6.9, 2.85, 0.04, { basic: true, k: 1.2, cast: false }); BUILD.glow(6.9, 3.1, 0.12, 1.3, 0x8aa8e8, 0.3);
  room.lights.moon = BUILD.shadow(BUILD.light(new THREE.SpotLight(0x8aa8e0, 34, 0, 0.5, 0.8, 2), 6.9, 3.2, 0.3), R.q === 'low' ? 512 : 1024); room.lights.moon.target.position.set(2.5, 0, 2.6);
  room.interact('window', 6.9, 3.3, KZ, 0.5, () => say('window'));
  /* steam: off the water, and a thread of it from the copper */
  room.steam = []; for (let i = 0; i < 9; i++) { const m = new THREE.SpriteMaterial({ map: T.smokeSoft, color: 0xe0dcd8, transparent: true, opacity: 0, depthWrite: false }); const s = new THREE.Sprite(m); BUILD.add(s, { cast: false, dyn: true }); room.steam.push({ s, m, ph: i / 9, cu: i > 6 }); }
  room.tick.push((t) => { for (const p of room.steam) { const u = (t * (p.cu ? 0.22 : 0.13) + p.ph * 3.1) % 1, x0 = p.cu ? CX : U.x + (hash(Math.floor(p.ph * 9), 3, 71) - 0.5) * 1.9;
    p.s.position.set(x0 + Math.sin(u * 3 + p.ph * 9) * 0.35, (p.cu ? 2.0 : U.water + 0.1) + u * (p.cu ? 1.6 : 2.3), (p.cu ? 1.0 : U.z + 0.2)); p.s.scale.setScalar((p.cu ? 0.4 : 0.9) + u * 1.6); p.m.opacity = (p.cu ? 0.16 : 0.24) * Math.sin(u * Math.PI); } });
  /* near the lens: a post, the end of a bench with a heap of linen */
  BUILD.box(7.6, 7.9, 0, CE, 6.3, 6.6, T.beam, { cast: false }); BUILD.box(-8.6, -6.2, 0.42, 0.52, 6.9, 7.7, T.woodDark, { cast: false }); BUILD.card(T.linen, -7.4, 0.52, 7.3, { w: 1.1, h: 0.38, cast: false });
  /* light */
  BUILD.light(new THREE.HemisphereLight(0x9a8c88, 0x2a1e16, 2.3), 0, 4, 0);
  BUILD.card(T.redLantern, 3.4, 2.75, 0.5, { cast: false }); BUILD.glow(3.4, 3.05, 0.55, 0.9, 0xff4a2a, 0.4); BUILD.light(new THREE.PointLight(0xff6a40, 1.8, 0, 2), 3.4, 2.9, 1.0, { flicker: 3 });
  const fill = BUILD.light(new THREE.DirectionalLight(0xc8c0c8, 0.7), -2, 4, 14); fill.target.position.set(-2, 1.0, 0);
  room.rim = [CX, 1.2, 1.4, 0.5, 6, 0xffa050, room.lights.fire]; room.shadowSrc = [CX, 1.6, 1.7, 6];
  BUILD.motes({ n: 60, boxes: [[X0 + 0.5, X1 - 0.5, 0.5, 3.8, 0.5, 3.4, 0.22]], col: 0xe8e0d8 });
  room.update(0, 0);
  return BUILD.end();
};
CAST.specs.lena.homes.lbath = { x: 1.2, z: 3.1, face: -1, idle: 'Idle_Loop' };   // she lives here for her layer; she is shown only when she brings him down
LBATH.onEnter = function () {
  const L = CAST.A.lena, on = HOUSE.with === 'lena' && HOUSE.venue === 'bath'; if (L) L.setVisible(on);
  if (!CUT.playing && !on) SCENE.caption(...this.caption);
};
/* ---------------------------------------------------------------- the scene's stage: the positions, moved into the tub
   O      where the bed's positions go: a bench under the water (seat), the lovers' card on the tub's centre line
   px     an extra x for a position whose place on the bed is elsewhere (the kiss is mid-bed, the lap is at the pillows)
   after  what they come to rest in (the bed's 'after' lies down: under a tub's rim nobody would see it) */
HOUSE.BATH = { room: LBATH, menu: ['kiss', 'lap'], after: 'kiss', quiet: true,
  O: { x: LBATH.TUB.x + 8.6, y: LBATH.TUB.seat - LOVERS.BED.top, z: LBATH.TUB.z - LOVERS.BED.zc - 0.82 }, px: { kiss: -0.85, after: -0.85 },
  cam: { bed: { fov: 13.5, y: 2.0, look: 1.5, focus: -8.6 }, wide: { fov: 17, y: 2.3, look: 1.9, focus: -8.6 }, near: { fov: 8.6, y: 1.74 + 0.5, look: 1.44 + 0.42, focus: -8.6 } } };
