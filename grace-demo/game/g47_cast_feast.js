/* THE FEAST'S PEOPLE (STORY.md §5 chapter 3 "The night", §6.1, §7): everyone at the festival's last night, at the high table
   on the dais or the lower tables in the side bays. A seat is a home with sit: the high table's stools stand on the dais's
   top step (0.48) and are 0.45 high (seat 0.93), the lower tables' are on the floor (0.47). Halina, Dorota, Bogdan, Ilka and
   the steward are the castle's own, given a feast home; the guests are the festival's lazy actors; Konrad (the Black Swan
   Knight, masked) and Jacek the cupbearer are new. Every one an adult. Zofia and Kazik are not at the feast. */
const seatHigh = (x) => ({ x, z: 1.45, face: 1, sit: { x, y: 0.93, z: 1.45, yaw: 0, cardDz: 0.32 } });
const seatLow = (x) => ({ x, z: 0.72, face: 1, sit: { x, y: 0.47, z: 0.72, yaw: 0, cardDz: 0.3 } });
CAST.specs.queen.homes.feast = seatHigh(0.3);
CAST.specs.dorota.homes.feast = seatHigh(-0.85);
CAST.specs.gniewomir.homes.feast = seatHigh(2.8);
CAST.specs.wieslawa.homes.feast = seatHigh(3.95);
CAST.specs.commander.homes.feast = seatLow(-9.7);
CAST.specs.jarek.homes.feast = seatLow(-8.3);
CAST.specs.msciwoj.homes.feast = seatLow(7.4);
CAST.specs.ottokar.homes.feast = seatLow(8.7);
// Ilka and the steward had a single home (the throne room): with a second, each needs both in homes (placeIn reads homes)
CAST.specs.spymaster.homes = { throne: { x: -4.75, z: 1.55, face: 1 }, feast: { x: -5.1, z: 1.6, face: 1, idle: 'Idle_FoldArms_Loop' } };
CAST.specs.steward.homes = { throne: { x: -1.05, z: 2.55, face: 1 }, feast: { x: 5.95, z: 2.7, face: -1 } };
// the Salamanders wait by the great doors; they're only shown for their turn between the courses (FEAST.fire)
CAST.specs.salA.homes.feast = { x: 11.2, z: 2.3, face: -1 }; CAST.specs.salB.homes.feast = { x: 11.8, z: 2.3, face: -1 }; CAST.specs.salC.homes.feast = { x: 12.4, z: 2.3, face: -1 };
Object.assign(CAST.specs, {
  /* Konrad of Hal, twenty-six: the Black Swan Knight out of his armour, in black, a half-mask. The Margrave's son */
  konrad: { id: 'konrad', name: 'the Black Swan Knight', lazy: true, bind: 'rmale', s: 1.06, skin: 0xd8a888, skinK: 0.9, headY: 2.22, x: -6.7, z: 0.72, face: 1,
    homes: { feast: seatLow(-6.7) }, mask: { col: 0x101014, y: 0.07 },
    parts: [part(R_M('Body'), { G: 0x16161c, L: 0x1e1a18, P: 0x2a2a32 }), part(R_M('Arms'), { G: 0x16161c, L: 0x1e1a18, P: 0x2a2a32 }), part(R_M('Arms'), 'skin'), part(R_M('Legs'), { G: 0x18181e, L: 0x1e1a18 }),
      part(R_M('Feet_Boots'), { L: 0x141010, G: 0x141010, P: 0x3a3a40 }), part(R_M('Body_Belt_1'), { L: 0x1a1410, P: 0xb8b8c0 })],
    brows: 0x2a1a12, hair: [['Hair_Long', 0x2a1a12]],
    collar: { pal: [0x0e0e12, 0x16161c, 0x202028, 0x2a2a34], y: 1.46, rx: 0.2, rz: 0.14 } },
  /* Jacek, twenty-three, the cupbearer: the swan's blue and white, terrified of the cup and everyone at the high table */
  jacek: { id: 'jacek', name: 'Jacek', lazy: true, bind: 'rmale', s: 0.97, skin: 0xe0b498, skinK: 0.93, headY: 2.06, x: -3.1, z: 1.5, face: -1, speed: 0.95, walk: 'Walk_Loop',
    homes: { feast: { x: -3.1, z: 1.5, face: -1 } },
    parts: [part(P_M('Body'), { L: 0x24405a, P: 0xe8e2d6 }), part(P_M('Arms'), { L: 0x24405a, P: 0x24405a }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x2a2a34, P: 0x2a2a34 }), part(P_M('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
    brows: 0x6a4a2a, hair: [['Hair_SimpleParted', 0x8a6a3a]],
    tabard: { col: 0x24405a, emblem: 0xe8e2d6, trim: 0xd8a43a, w: 0.08, top: 1.36, from: P_M('Body') } },
});
