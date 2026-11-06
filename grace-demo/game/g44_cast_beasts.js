/* THE ANIMALS (engine/e15_beast.js, ENGINE.md §13j): CC0 Quaternius models drawn through the people's sprite pass, so they
   stand in the rooms as the same kind of pixel art. Every one is lazy (built the first time the king heads for its room).
   h is the standing height in metres (head up), box the sprite frame. Colours by the pack's material names. */
Object.assign(CAST.specs, {
  /* Bogdan's hound in the wood: a big tan alaunt with a dark saddle (the husky, re-dyed) */
  hound: { id: 'hound', name: 'the hound', beast: 'hound', lazy: true, h: 0.98, box: [1.8, 1.4], home: 'wood', x: 8.4, z: 1.9, face: -1, speed: 1.2, walkSpeed: 1.1, wag: 0.2,
    col: { Material: 0x2a1a10, 'Material.001': 0x9a6230, 'Material.003': 0xd8c098 }, idles: [['Idle', 3], ['Idle_2', 2], ['Idle_2_HeadLow', 1]] },
  /* a red stag at the edge of the trees, grazing */
  stag: { id: 'stag', name: 'the stag', beast: 'stag', lazy: true, h: 2.25, box: [2.8, 2.8], home: 'wood', x: -4.4, z: 1.3, face: 1, speed: 1.0, walkSpeed: 1.2,
    idle: 'Eating', idles: [['Eating', 4], ['Idle', 2], ['Idle_Headlow', 1]], idleEvery: [6, 12] },
  /* the Woman's black cat, on the barrel */
  cat: { id: 'cat', name: 'the cat', beast: 'cat', lazy: true, h: 0.44, box: [1.0, 0.85], home: 'hut', x: -3.5, y: 1.1, z: 1.7, face: 1, yawK: 1.35, tint: 0x6a6878,   // a black cat that still reads in a violet room: dark grey, side-on
    idles: [['Idle', 4], ['Idle_Eating', 1]] },
  /* Wojciech, Bartosz's dancing bear (STORY.md §6): the hound's skeleton made into a bear — a heavy brown body, a short
     neck and snout, small ears, a stub of a tail. At the fair he's up on his hind legs on the chain when the music plays; if
     the king buys his freedom he lives at the edge of the wood (FEST.bearFreed) */
  bear: { id: 'bear', name: 'Wojciech', beast: 'hound', lazy: true, h: 1.3, box: [2.2, 2.4], homes: { fair: { x: 7.0, z: 1.2, face: -1 }, wood: { x: -1.9, z: -1.6, face: 1 } },
    speed: 0.8, walkSpeed: 0.9, rough: 0.92, col: { Material: 0x3a2414, 'Material.001': 0x5e3c22, 'Material.003': 0x8a6646, 'Material.006': 0x140c08, 'Material.002': 0x0a0806 },
    bones: { Back: { s: [1.35, 1.0, 1.4] }, Neck1: { s: [1.1, 0.72, 1.1] }, Head: { s: [1.05, 0.82, 1.0] }, 'Ear1.L': { s: [0.55, 0.55, 0.55] }, 'Ear1.R': { s: [0.55, 0.55, 0.55] },
      Tail1: { s: [0.3, 0.3, 0.3] }, 'FrontUpperLeg.L': { s: [1.0, 0.86, 1.0] }, 'FrontUpperLeg.R': { s: [1.0, 0.86, 1.0] }, 'BackUpperLeg.L': { s: [1.0, 0.86, 1.0] }, 'BackUpperLeg.R': { s: [1.0, 0.86, 1.0] } },
    idles: [['Idle', 3], ['Idle_2_HeadLow', 2]] },
  /* the pavilions' horse lines: Gniewomir's grey destrier and a bay */
  destrier: { id: 'destrier', name: 'the grey destrier', beast: 'grey', lazy: true, h: 2.3, box: [3.2, 2.8], home: 'camp', x: 10.6, z: 0.8, face: -1, speed: 1.0, walkSpeed: 1.4,
    idles: [['Idle', 3], ['Eating', 2], ['Idle_Headlow', 1]] },
  bay: { id: 'bay', name: 'the bay', beast: 'horse', lazy: true, h: 2.2, box: [3.2, 2.8], home: 'camp', x: 12.1, z: 0.5, face: 1,
    col: { Main: 0x6a2e14, Main_Dark: 0x3e1a0c, Main_Light: 0x8a4a22, Hair: 0x120c0a, Muzzle: 0x24140c }, speed: 1.0, walkSpeed: 1.4,
    idle: 'Eating', idles: [['Eating', 3], ['Idle', 2]] },
  /* the joust (g38): two destriers in their knights' cloths, each with its knight in the saddle (LISTS.mount), waiting at
     the ends of their lanes either side of the tilt */
  joustHorseK: { id: 'joustHorseK', name: 'the prince’s destrier', beast: 'grey', lazy: true, h: 2.3, box: [3.4, 3.0], homes: { lists: { x: LISTS.JX - LISTS.RUN, z: -2.35, face: 1 } }, yawK: 1.5,
    caparison: { col: [0xa82a24, 0xf0e8d8], n: 8 } },
  joustHorseB: { id: 'joustHorseB', name: 'the black destrier', beast: 'horse', lazy: true, h: 2.35, box: [3.4, 3.0], homes: { lists: { x: LISTS.JX + LISTS.RUN, z: -3.65, face: -1 } }, yawK: 1.5,
    col: { Main: 0x1a1a20, Main_Dark: 0x0e0e12, Main_Light: 0x2a2a32, Hair: 0x0a0a0c, Muzzle: 0x16161a }, caparison: { col: [0x18181e, 0x24242c], n: 2, swan: 0xe8e2d6 } },
  joustK: Object.assign(knight('joustK', 0xa82a24, LISTS.JX - LISTS.RUN, 1), { name: 'Prince Mściwoj', lazy: true, s: 1.08, headY: 2.3, helmet: { col: 0xd0d4dc }, prop: 'lance', idle: 'Idle_Loop',
    homes: { lists: { x: LISTS.JX - LISTS.RUN, z: -2.0, face: 1 } } }),
  joustB: Object.assign(knight('joustB', 0x16161c, LISTS.JX + LISTS.RUN, -1), { name: 'the Black Swan Knight', lazy: true, s: 1.06, headY: 2.3, helmet: { col: 0x2a2a32 }, prop: 'lance', idle: 'Idle_Loop',
    tabard: Object.assign({}, knight('_', 0, 0, 1).tabard, { col: 0x16161c, emblem: 0xe8e2d6, trim: 0x4a4a52 }), homes: { lists: { x: LISTS.JX + LISTS.RUN, z: -3.3, face: -1 } } }),
});
