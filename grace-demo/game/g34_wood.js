/* THE WOOD — an afternoon clearing west of the castle, where the household spends its one dry afternoon of the week: Ser
   Bogdan's archery butts, a fishing hole with a dock, Halina's blanket under the old oak, Zofia at her post, Kazik and the
   birds, the two guards on their rounds, a red deer at the edge of the trees and Bogdan's hound asleep in the sun. At the far
   left a path goes into the trees to the Woman's hut. Only the king takes it: nobody else in the household is ever sent down
   it, and the hut is no one else's home. */
const WOOD = SCENE.addRoom(new Room('wood', { X0: -14, X1: 14, CEIL: 40, KZ: 3.0, cam: { y: 3.0, look: 2.7, dist: 19.4, fov: 19 }, exposure: 1.0, reflK: 0.3, far: 320,
  fog: [0xc8d8b0, 0.004], music: 'garden', ambience: { birds: 0.7, wind: 0.35 }, acoustics: { size: 1.4, wet: 0.1 }, surface: 'grass',
  caption: ['The Wood', 'The one dry afternoon of the week'] }));
WOOD.ENTRY = -9.8;   // where the king arrives from the map
WOOD.LINES = {
  path: ['A path into the trees, narrow and dark. The children are never sent down it, and nobody else goes.', 'The Woman’s hut is at the end of it. She is the only one who has never once told me to hurry.'],
  butts: ['Bogdan’s butts. Zofia has put three arrows in the gold this week, and her mother pretends not to be proud.'],
  pond: ['The fishing hole. Carp as old as the Margrave, the grooms say. Nobody has landed one since the siege.'],
  deer: ['A red deer at the edge of the trees, standing as though it is waiting to be asked something.'],
  hound: ['Bogdan’s hound. It has never been taught anything except sleeping in the sun.'],
  basket: ['Bread, pears and a jug of something cold. Halina says the one dry afternoon of the week belongs to her.'],
  oak: ['An old oak with a rope swing Kazik is not allowed to use, and uses every day.'],
  zofia: ['Watch, Father! Three in the gold, and a fourth in the post.', 'Bogdan says I shoot like a squire. I told him squires don’t shoot at all.'],
  kazik: ['The big crow sat on the fence and watched me the whole time. She doesn’t blink.', 'Shh. If you move, the birds come back.'],
  guardL: ['Halt. Nobody goes down the path without the Woman’s leave, and nobody has ever had it.'],
  guardR: ['The deer comes every afternoon. We have decided not to shoot it, which Bogdan does not understand.'],
  queen: ['Sit down, Radomir. Close your eyes for once. The children are not drowning, nobody is shooting at anybody, and the rain has the decency to stay away.', 'You are doing it again. Watching the trees as if they owe you money.']
};
WOOD.build = function () {
  const room = BUILD.begin(this), T = PX.T, X0 = room.X0, X1 = room.X1, KZ = room.KZ, L = room.LINES;
  const say = (k) => SCENE.say(SCENE.player, SCENE.cycle(k, L[k]));
  const talk = (id, k) => SCENE.say(CAST.A[id], SCENE.cycle(k, L[k]));
  /* the sky, the far ridge and the ground, as in the garden */
  BUILD.plane('y+', -120, 120, -200, 12, 0, T.turfPix);
  BUILD.sky(T.skyAfternoon, { z: -200, w: 520, h: 190, y: -40, k: 1.0 });
  BUILD.card(T.ridgeDay, 0, -8, -170, { w: 560, h: 46, basic: true, k: 1.0, cast: false });
  /* the trees: pines in the depth, a deadwood snag, the old oak over Halina's blanket */
  for (const [x, z, s] of [[-13, -14, 2.6], [-9, -18, 2.4], [-4, -22, 2.8], [2, -16, 2.2], [7, -20, 2.6], [12, -15, 2.4], [15, -24, 2.8], [-1, -10, 1.9], [14, -9, 2.0]]) BUILD.windCard(T.pine, x, 0, z, 'sway', 0.02, { s, cast: false });
  BUILD.card(T.deadTree, -11.8, 0, -6, { s: 1.4, cast: false });
  BUILD.windCard(T.appleTree, 6.6, 0, 0.4, 'sway', 0.035, { s: 1.9, cast: true });
  BUILD.card(T.tuft, -6.2, 0, 1.2, { s: 1.0 }); BUILD.card(T.tuft, 4.1, 0, 1.4, { s: 0.9 }); BUILD.card(T.tuft, 12.6, 0, 1.1, { s: 1.0 });
  /* the path to the hut, at the far left: a dark arch in the trees, violet light on the ground, the path itself */
  BUILD.plane('y+', -13.2, -10.6, -14, 3.6, 0.006, T.mud);
  BUILD.card(T.arch, -12.2, 0, 0.02, { basic: true, k: 0.3, cast: false });
  BUILD.glow(-12.2, 1.4, 0.4, 3.2, 0x9b5cff, 0.35);
  room.interact('path', -12.2, 2.0, KZ, 1.0, () => { SCENE.lock++; SCENE.say(SCENE.player, L.path[0]).then(() => { SCENE.lock--; GAME.save(); SCENE.go('hut', { x: HUT.ENTRY, face: 1 }); }); }).label = 'Take the path into the trees';
  /* Bogdan's archery butts: a straw bale, the target on it, a bow rack */
  BUILD.box(-9.0, -7.0, 0, 1.0, 1.5, 2.0, T.woodDark, { col: 0xd8b060 });
  BUILD.card(T.archeryTarget, -8.0, 1.0, 1.35, { cast: true });
  BUILD.box(-6.4, -6.1, 0, 1.6, 1.2, 1.25, T.woodPost); BUILD.box(-6.5, -5.4, 1.55, 1.62, 1.15, 1.3, T.woodPost);
  BUILD.box(-6.3, -6.25, 0, 1.4, 1.0, 1.05, T.woodDark); BUILD.box(-6.0, -5.95, 0, 1.4, 1.02, 1.05, T.woodDark);
  room.interact('butts', -8.0, 1.8, KZ, 1.0, () => say('butts'));
  /* the fishing hole: a stone rim, the water, a dock with its posts, a rod leaning on the dock */
  BUILD.cyl(1.0, 1.8, 0, 0.45, 2.3, T.ashlar, { seg: 10 });
  BUILD.pool(T.water, 1.0, 0.42, 1.8, 2.1, { seg: 10, rate: 5, glow: 0.2 });
  BUILD.box(2.4, 3.6, 0.42, 0.5, 2.5, 2.9, T.woodDark);
  for (const x of [2.5, 3.5]) BUILD.box(x - 0.06, x + 0.06, 0, 0.42, 2.45, 2.55, T.woodPost);
  BUILD.box(3.5, 3.56, 0.5, 2.4, 2.65, 2.7, T.woodPost);
  room.interact('pond', 1.0, 1.2, KZ, 1.2, () => say('pond'));
  /* the birds on the rim and the bank: the garden's ground birds, for the fishing hole */
  room.birds = BUILD.critters(T.crowGround, [[0.2, 0.45, 2.6, 1.0], [2.0, 0, 3.1, 1.2], [11.5, 0, 2.9, 1.2], [-2.6, 0, 3.2, 1.3]], { shy: 1.5, sound: 'whoosh' });
  /* Halina's blanket under the oak, the basket of bread and pears beside it, the hound asleep in the sun */
  BUILD.rug(T.rugA, 4.4, 7.2, 2.0, 3.6, { y: 0.02 });
  BUILD.card(T.basket, 7.4, 0.02, 2.4, { s: 0.9 });
  BUILD.card(T.houndPix, 8.4, 0.02, 1.9, { s: 0.9 });
  room.interact('queen', 5.6, 2.7, KZ, 1.0, () => talk('queen', 'queen')).label = 'Talk to Halina';
  room.interact('basket', 7.4, 1.0, KZ, 1.0, () => say('basket'));
  room.interact('hound', 8.4, 0.9, KZ, 1.0, () => say('hound'));
  room.interact('oak', 6.6, 3.2, KZ, 1.0, () => say('oak'));
  /* Zofia's post, and the deer at the edge of the trees */
  BUILD.card(T.pell, 9.2, 0, 1.4, { s: 0.95 });
  BUILD.card(T.deerPix, -4.4, 0, 1.6, { s: 1.0, cast: false });
  room.interact('deer', -4.4, 1.6, KZ, 1.0, () => say('deer'));
  room.interact('zofia', 9.2, 2.7, KZ, 1.0, () => talk('zofia', 'zofia')).label = 'Talk to Zofia';
  room.interact('kazik', 11.6, 2.7, KZ, 1.0, () => talk('kazik', 'kazik')).label = 'Talk to Kazik';
  room.interact('woodGuardL', -7.5, 3.0, KZ, 1.0, () => talk('woodGuardL', 'guardL')).label = 'Talk to the guard';
  room.interact('woodGuardR', 1.0, 3.0, KZ, 1.0, () => talk('woodGuardR', 'guardR')).label = 'Talk to the guard';
  /* light: the afternoon sun from the west with long shadows, the sky's fill, a warm bounce off the grass; the same rig as the garden */
  BUILD.light(new THREE.HemisphereLight(0x9ab4dc, 0x5a7434, 1.25), 0, 20, 0);
  room.sun = BUILD.shadow(BUILD.light(new THREE.DirectionalLight(0xffc888, 3.4), 32, 12, 16), R.q === 'low' ? 1024 : 2048); room.sun.target.position.set(0, 0, 0);
  Object.assign(room.sun.shadow.camera, { left: -22, right: 22, top: 14, bottom: -14, near: 1, far: 90 }); room.sun.shadow.camera.updateProjectionMatrix(); room.sun.shadow.bias = -0.0008;
  const fill = BUILD.light(new THREE.DirectionalLight(0x8aa0d0, 0.45), -14, 8, 18); fill.target.position.set(0, 1, 0);
  room.rim = [6.4, 2.4, 2.5, 0.8, 14, 0xffd8a0, null]; room.shadowSrc = [26, 9, 10, 80]; room.keyK = 0.9;
  /* the air: falling leaves, the crows over the trees, the drifting motes that the lens turns into bokeh */
  BUILD.leaves({ n: 24, box: [-13, 13, 0.2, 5, 0.6, 3.6], tex: T.leafFrames, speed: 0.5, wind: -0.1 });
  BUILD.flock(T.crow, [[-8, 14, -40, 14, 2, 0.25], [6, 16, -50, 18, 3, -0.2], [20, 12, -45, 10, 2, 0.3]], { s: 2.2 });
  BUILD.motes({ n: 70, boxes: [[-14, -4, 0.4, 3.6, 0.5, 3.5, 0.4], [2, 14, 0.4, 3.6, 0.5, 3.5, 0.4]], col: 0xfff0c0 });
  room.update(0, 0);
  return BUILD.end();
};
WOOD.onEnter = function () {
  if (!CUT.playing) SCENE.caption(...this.caption);
  const A = CAST.A;
  for (const id of ['woodGuardL', 'woodGuardR']) A[id].setVisible(true);
};
