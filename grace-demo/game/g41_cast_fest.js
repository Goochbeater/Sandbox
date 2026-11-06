/* THE FESTIVAL'S PEOPLE (STORY.md §2, §6). Every spec here is lazy: built the first time the king heads for a festival
   ground (CAST.ensure), so the boot doesn't grow. Positions are per ground (homes). Where a returning character's usual
   actor can't be there, the festival has its own copy: Marta (a petitioner, offstage everywhere else) and Bogdan (he needs
   a sword in the lists). All of the guests are adults; the only children at the festival are Zofia and Kazik, as themselves. */
const krasnaGuard = (id, x, wander) => { const g = guard(id, x); g.lazy = true; g.home = 'camp'; g.homes = { camp: { x, z: 2.45, face: 1, wander } };
  g.parts = g.parts.map((p) => (p[2] && p[2].G === 0x6a1418 ? [p[0], p[1], Object.assign({}, p[2], { G: 0xa82a24 })] : p));
  g.robe = Object.assign({}, g.robe, { col: 0xa82a24 }); g.tabard = Object.assign({}, g.tabard, { emblem: 0xa82a24 }); return g; };
const sister = (id, name, skin, hair, x, face) => ({ id, name, lazy: true, bind: 'rfemale', s: 0.98, skin, skinK: 0.92, headY: 2.0, x, z: 0.9, face, box: [1.5, 2.4],
  homes: { fair: { x, z: 0.9, y: 0.8, face } },
  parts: [part(P_F('Body'), { L: 0xc83a10, P: 0xe8b840 }), part(P_F('Arms'), { L: 0xc83a10, P: 0xc83a10 }), part(P_F('Legs'), { L: 0x5a160c, P: 0x5a160c }), part(P_F('Feet'), { L: 0x2a140c, P: 0x3a1a10 })],
  brows: 0x1a1210, hair: [['Hair_Long', hair]], robe: { col: 0xb8300c, top: 0.95, bot: 0.42, rx: [0.15, 0.3], rz: [0.12, 0.26], trim: 0xe8b840, band: 0xe8b840, leg: 0.55 } });
const townsman = (id, body, hair, beard, homes) => ({ id, lazy: true, bind: 'rmale', s: 1.0, skin: 0xd8a888, skinK: 0.92, headY: 2.08, walk: 'Walk_Loop', speed: 0.85, homes,
  parts: [part(P_M('Body'), { L: body, P: 0xd8c8a8 }), part(P_M('Arms'), { L: body, P: body }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x3a2e22, P: 0x3a2e22 }), part(P_M('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
  brows: hair, hair: beard ? [['Hair_Buzzed', hair], ['Hair_Beard', hair]] : [['Hair_SimpleParted', hair]] });
const townswoman = (id, dress, hair, style, homes) => ({ id, lazy: true, bind: 'rfemale', s: 0.97, skin: 0xe6bca2, skinK: 0.94, headY: 1.98, walk: 'Walk_Loop', speed: 0.85, homes,
  parts: [part(P_F('Body'), { L: dress, P: 0xe8dcc0 }), part(P_F('Arms'), { L: dress, P: 0xd8ccb0 }), part(P_F('Legs'), { L: 0x3a2a1c, P: 0x3a2a1c }), part(P_F('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
  brows: 0x4a3424, hair: [[style, hair]], robe: { col: C.mul(dress, 0.9), top: 0.95, bot: 0.05, rx: [0.15, 0.32], rz: [0.12, 0.27], leg: 0.45 } });
Object.assign(CAST.specs, {
  /* the guests */
  gniewomir: { id: 'gniewomir', name: 'King Gniewomir', lazy: true, bind: 'rmale', s: 1.1, skin: 0xd8a890, skinK: 0.9, headY: 2.25, x: 1.2, z: -7.6, face: 1,
    homes: { lists: { x: 1.2, z: -7.6, face: 1, sit: { x: 1.2, y: 1.87, z: -7.6, yaw: 0.12, cardDz: 0.3 } }, camp: { x: 0.2, z: -1.35, face: 1, sit: { x: 0.2, y: 0.47, z: -1.35, yaw: 0, cardDz: 0.35 } } },
    parts: [part(P_M('Body'), { L: 0x7a1a16, P: 0xa82a24 }), part(P_M('Arms'), { L: 0x7a1a16, P: 0x7a1a16 }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x3a1a14, P: 0x3a1a14 }), part(P_M('Feet'), { L: 0x1a120c, P: 0x2a1a10 })],
    brows: 0xd8d0c4, hair: [['Hair_Buzzed', 0xc8c0b4], ['Hair_Beard', 0xe0d8cc]],
    robe: { col: 0x8a1e1a, top: 1.0, bot: 0.03, rx: [0.2, 0.4], rz: [0.16, 0.34], trim: 0xd8a43a, band: 0xd8a43a, leg: 0.45 },
    collar: { pal: [0xc8c0b0, 0xe0d8c8, 0xf0ece0, 0xfffaf0], y: 1.46, rx: 0.22, rz: 0.16, thick: 0.07 }, crown: { worn: true, k: 1.05 } },
  msciwoj: Object.assign(knight('msciwoj', 0xa82a24, 4.4, -1), { name: 'Prince Mściwoj', lazy: true, s: 1.08, headY: 2.28, idle: 'Idle_FoldArms_Loop', helmet: undefined, prop: undefined,
    hair: [['Hair_SimpleParted', 0x9a7a40]], homes: { camp: { x: 4.4, z: 2.1, face: -1, idle: 'Idle_FoldArms_Loop' } } }),
  ottokar: Object.assign(knight('ottokar', 0xa82a24, 0.9, -1), { name: 'Ser Ottokar', lazy: true, hair: [['Hair_Beard', 0x2a1c12]],
    homes: { lists: { x: 0.9, z: 1.1, face: -1, idle: 'Sword_Idle' }, camp: { x: 8.6, z: 2.1, face: -1, idle: 'Idle_Loop' } } }),
  wieslawa: { id: 'wieslawa', name: 'Queen Wiesława', lazy: true, bind: 'rfemale', s: 1.0, skin: 0xe8c4ac, skinK: 0.95, headY: 2.02, x: 2.9, z: -7.6, face: 1,
    homes: { lists: { x: 2.9, z: -7.6, face: 1, sit: { x: 2.9, y: 1.87, z: -7.6, yaw: -0.1, cardDz: 0.3 } }, camp: { x: 6.0, z: 2.1, face: 1, idle: 'Idle_FoldArms_Loop' } },
    parts: [part(P_F('Body'), { L: 0x4a1430, P: 0x7a3a5a }), part(P_F('Arms'), { L: 0x4a1430, P: 0x5a2040 }), part(P_F('Legs'), { L: 0x2a1020, P: 0x2a1020 }), part(P_F('Feet'), { L: 0x1a1010, P: 0x2a1818 })],
    brows: 0x1a1214, hair: [['Hair_Buns', 0x1a1214]],
    robe: { col: 0x5a1a3a, top: 0.95, bot: 0.03, rx: [0.15, 0.36], rz: [0.12, 0.3], trim: 0xd8a43a, band: 0xd8a43a, leg: 0.4 },
    collar: { pal: [0x8a7a6a, 0xb8a890, 0xd8ccb8, 0xf0e8d8], y: 1.41, rx: 0.17, rz: 0.12, thick: 0.05 }, crown: { worn: true, k: 0.82, y: 0.165 } },
  jarek: { id: 'jarek', name: 'Jarek of Velka', lazy: true, bind: 'rmale', s: 1.02, skin: 0xe0b498, skinK: 0.93, headY: 2.1, x: -5.6, z: 2.2, face: 1, homes: { camp: { x: -5.6, z: 2.2, face: 1 } },
    parts: [part(P_M('Body'), { L: 0x1e5a5e, P: 0xd8c8a0 }), part(P_M('Arms'), { L: 0x1e4a4e, P: 0x1e4a4e }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x2a2620, P: 0x2a2620 }), part(P_M('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
    brows: 0x4a2c1a, hair: [['Hair_SimpleParted', 0x4a2c1a], ['Hair_Beard', 0x4a2c1a]],
    robe: { col: 0x1e4a4e, top: 1.0, bot: 0.5, rx: [0.17, 0.27], rz: [0.13, 0.22], trim: 0xd8a43a, leg: 0.6 }, collar: { pal: [0x3a2a1a, 0x4a3624, 0x5a442e, 0x6a5238] } },
  squire: { id: 'squire', name: 'the squire', lazy: true, bind: 'rmale', s: 0.98, skin: 0xd8a888, skinK: 0.9, headY: 2.05, x: 14.4, z: 2.1, face: -1, homes: { camp: { x: 14.4, z: 2.1, face: -1 } },
    parts: [part(R_M('Body'), { G: 0x16161c, L: 0x22222a, P: 0x5a5a6a }), part(R_M('Arms'), { G: 0x16161c, L: 0x22222a, P: 0x5a5a6a }), part(R_M('Arms'), 'skin'), part(R_M('Legs'), { G: 0x16161c, L: 0x22222a }),
      part(R_M('Feet_Boots'), { L: 0x141010, G: 0x141010, P: 0x3a3a40 }), part(R_M('Head_Hood'), { G: 0x16161c, L: 0x16161c, P: 0x22222a })],
    brows: 0x2a1c12, hair: [['Hair_Buzzed', 0x2a1c12]] },
  groom: { id: 'groom', name: 'the groom', lazy: true, bind: 'rmale', s: 0.98, skin: 0xc89070, skinK: 0.9, headY: 2.05, x: 11.6, z: 2.1, face: -1, homes: { camp: { x: 11.6, z: 2.1, face: -1 } },
    parts: [part(P_M('Body'), { L: 0x5a4a2a, P: 0xc8b890 }), part(P_M('Arms'), { L: 0x5a4a2a, P: 0x5a4a2a }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x3a2e22, P: 0x3a2e22 }), part(P_M('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
    brows: 0x5a3a22, hair: [['Hair_Buzzed', 0x5a3a22]] },
  kSoldierA: krasnaGuard('kSoldierA', -12.6, { x0: -13.8, x1: -8.6, pause: [3, 7] }),
  kSoldierB: krasnaGuard('kSoldierB', -8.8, { x0: -13.0, x1: -7.6, pause: [4, 8] }),
  /* the fair */
  bartosz: { id: 'bartosz', name: 'Bartosz Kuglarz', lazy: true, bind: 'rmale', s: 1.04, skin: 0xd8a080, skinK: 0.9, headY: 2.12, x: 5.0, z: 2.35, face: 1, homes: { fair: { x: 5.0, z: 2.35, face: 1, idle: 'Idle_Talking_Loop' } },
    parts: [part(P_M('Body'), { L: 0xa82a24, P: 0xe8b840 }), part(P_M('Arms'), { L: 0xe8b840, P: 0xa82a24 }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x2c4478, P: 0x2c4478 }), part(P_M('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
    brows: 0xa8602a, hair: [['Hair_Buzzed', 0xa8602a], ['Hair_Beard', 0xa8602a]], tabard: { col: 0x2c4478, trim: 0xe8b840, w: 0.09, top: 1.38, from: P_M('Body') } },
  salA: sister('salA', 'Mira', 0xa8785a, 0x1a1210, -0.9, -1), salB: sister('salB', 'Tessa', 0x8a5a3a, 0x3a120c, 0.4, 1), salC: sister('salC', 'Ola', 0xc08a68, 0x1a1210, 1.7, 1),
  fortune: { id: 'fortune', name: 'the fortune teller', lazy: true, bind: 'rfemale', s: 0.96, skin: 0xd8c4b4, skinK: 0.9, headY: 1.98, x: 13.2, z: 2.2, face: -1, idle: 'Spell_Simple_Idle_Loop',
    homes: { fair: { x: 13.2, z: 2.2, face: -1, idle: 'Spell_Simple_Idle_Loop' } },
    parts: [part(P_F('Body'), { L: 0x3a1a4a, P: 0x5a3a6a }), part(P_F('Arms'), { L: 0x3a1a4a, P: 0x4a2a5a }), part(P_F('Legs'), { L: 0x24142e, P: 0x24142e }), part(P_F('Feet'), { L: 0x141014, P: 0x1e1a1e }),
      part(['rf_ranger', 'Female_Ranger_Head_Hood'], { G: 0x4a2a5a, L: 0x4a2a5a, P: 0x5a3a6a })],
    brows: 0x6a6460, hair: [['Hair_Long', 0x9a948a]], robe: { col: 0x3a1a4a, top: 0.95, bot: 0.02, rx: [0.15, 0.36], rz: [0.12, 0.32], trim: 0xc8962a, leg: 0.4 } },
  martaFair: Object.assign({}, CAST.specs.marta, { id: 'martaFair', name: 'Marta', lazy: true, home: 'fair', homes: { fair: { x: -12.6, z: 2.25, face: 1 } } }),
  townA: townsman('townA', 0x6a4a2a, 0x5a3a22, true, { fair: { x: -6.6, z: 2.5, face: 1, wander: { x0: -9.0, x1: -5.2, pause: [3, 7] } } }),
  townB: townswoman('townB', 0x2e6a3a, 0xd8b060, 'Hair_Long', { fair: { x: 3.0, z: 2.55, face: -1, wander: { x0: 1.6, x1: 4.6, pause: [4, 8] } } }),
  townC: townsman('townC', 0x2c4478, 0x1a1410, false, { fair: { x: -13.0, z: 2.55, face: 1, wander: { x0: -14.4, x1: -11.0, pause: [3, 6] } } }),
  townD: townswoman('townD', 0x8a3a5a, 0x5a3a22, 'Hair_Buns', { fair: { x: 11.8, z: 2.3, face: 1 } }),
  fairGuard: Object.assign(guard('fairGuard', 9.6), { lazy: true, home: 'fair', homes: { fair: { x: 9.6, z: 2.6, face: 1, wander: { x0: 9.2, x1: 12.6, pause: [4, 8] } } } }),
  /* the lists */
  bogdanLists: Object.assign({}, CAST.specs.commander, { id: 'bogdanLists', name: 'Ser Bogdan', lazy: true, prop: 'sword', idle: 'Sword_Idle', box: [1.9, 2.6], home: 'lists',
    homes: { lists: { x: -0.9, z: 1.1, face: 1, idle: 'Sword_Idle' } } }),
  herald: { id: 'herald', name: 'the herald', lazy: true, bind: 'rmale', s: 1.0, skin: 0xd8a888, skinK: 0.92, headY: 2.08, x: -11.4, z: 2.1, face: 1, prop: 'scroll', homes: { lists: { x: -11.4, z: 2.1, face: 1 } },
    parts: [part(P_M('Body'), { L: 0x2c4478, P: 0xf0e8d8 }), part(P_M('Arms'), { L: 0x2c4478, P: 0x2c4478 }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0xf0e8d8, P: 0xf0e8d8 }), part(P_M('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
    brows: 0x6a4a2a, hair: [['Hair_SimpleParted', 0x6a4a2a]], tabard: { col: 0xf0e8d8, emblem: 0x2c4478, top: 1.4, w: 0.09, trim: 0xe8b840, from: P_M('Body') } },
  marshal: { id: 'marshal', name: 'Ser Dobiesław', lazy: true, bind: 'rmale', s: 1.04, skin: 0xc89878, skinK: 0.9, headY: 2.18, x: 8.4, z: 2.1, face: -1, prop: 'spear', homes: { lists: { x: 8.4, z: 2.1, face: -1 } },
    parts: [part(R_M('Body'), { G: 0x2c4478, L: 0x2a1e16, P: 0x8a8e98 }), part(R_M('Arms'), { G: 0x2c4478, L: 0x2a1e16, P: 0x8a8e98 }), part(R_M('Arms'), 'skin'), part(R_M('Legs'), { G: 0x2a2a30, L: 0x2a1e16 }),
      part(R_M('Feet_Boots'), { L: 0x1a1410, G: 0x1a1410, P: 0x4a4a50 }), part(R_M('Body_Belt_1'), { L: 0x1e1610, P: 0xb8a060 })],
    brows: 0xb8b2a8, hair: [['Hair_Buzzed', 0xb8b2a8], ['Hair_Beard', 0xc8c2b8]], collar: { pal: [0x2a2018, 0x3a2c20, 0x4a3a2a, 0x5a4a38], y: 1.46, rx: 0.21, rz: 0.15 } },
});
/* the household at the festival: Halina at the honey stall and in the royal stand, Kazik by the bear, Zofia at the butts,
   the saint by the lists' rail */
CAST.specs.queen.homes.fair = { x: -10.2, z: 2.3, face: 1, idle: 'Idle_Loop' };
CAST.specs.queen.homes.lists = { x: -1.2, z: -7.6, face: 1, idle: 'Idle_Loop', sit: { x: -1.2, y: 1.87, z: -7.6, yaw: 0.12, cardDz: 0.3 } };
CAST.specs.kazik.homes.fair = { x: 8.8, z: 2.5, face: -1, wander: { x0: 8.6, x1: 9.2, pause: [2, 5] } };
CAST.specs.zofia.homes.lists = { x: 11.2, z: 2.1, face: 1, idle: 'Idle_Loop' };   // (at 12.6 she stood on the black destrier waiting at 14.6)
CAST.specs.dorota.homes = { chapel: { x: 1.8, z: 2.2, face: -1, idle: 'Idle_Loop' }, lists: { x: -5.4, z: 2.15, face: 1, idle: 'Idle_Loop' } };   // she had one home; with two, each needs its spot
