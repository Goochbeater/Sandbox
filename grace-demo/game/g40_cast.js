/* THE CAST — every character is an Actor spec: a base body (rmale / rfemale), outfit pieces with dye colours
   (L = leather & wool, P = pale linen & metal, G = green cloth, 'skin' = bare hands), hair, and procedural garments.
   Positions: x along the hall, z toward the lens, y = standing height (the dais top is 0.48). */
const CAST = {};
const P_M = (n) => ['rm_peasant', 'Male_Peasant_' + n], P_F = (n) => ['rf_peasant', 'Female_Peasant_' + n], R_M = (n) => ['rm_ranger', 'Male_Ranger_' + n];
const part = (k, dye) => [k[0], k[1], dye];
const COAT = 0x2b2c38;
CAST.specs = {
  king: { id: 'king', bind: 'rmale', s: 1.04, skin: 0xd8b096, skinK: 0.92, walk: 'Walk_Formal_Loop', speed: 1.25, x: -1.6, z: 2.6,
    parts: [part(P_M('Body'), { L: COAT, P: 0x34343f }), part(P_M('Arms'), { L: 0x24252e, P: COAT }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x26252c, P: 0x26252c }), part(P_M('Feet'), { L: 0x18120e, P: 0x2a1e16, rough: 0.5 })],
    brows: 0x1a1512, hair: [['Hair_SimpleParted', 0x1e1814], ['Hair_Beard', 0x1c1612]],
    robe: { col: COAT, trim: 0xb8862e }, collar: {}, tabard: { col: 0xe8e2d6, emblem: 0x1a1a24 }, crown: { worn: false } },
  queen: { id: 'queen', bind: 'rfemale', s: 1.0, skin: 0xe6bca2, skinK: 0.95, idle: 'Idle_FoldArms_Loop', walk: 'Walk_Formal_Loop', home: 'throne', x: 3.35, z: 1.25, y: 0.48, face: -1, headY: 2.02,
    parts: [part(P_F('Body'), { L: 0x34426a, P: 0x7a88a8 }), part(P_F('Arms'), { L: 0x34426a, P: 0x5a6a8e }), part(P_F('Legs'), { L: 0x2a3048, P: 0x2a3048 }), part(P_F('Feet'), { L: 0x1a1410, P: 0x2a2018 })],
    brows: 0x3a2418, hair: [['Hair_Buns', 0x4a2c1a]],
    robe: { col: 0x3e4c78, top: 0.95, bot: 0.03, rx: [0.15, 0.36], rz: [0.12, 0.3], trim: 0xc8a040, band: 0xc8a040, leg: 0.4 },
    collar: { pal: [0x22305a, 0x30427a, 0x40569a, 0x5a72b8], y: 1.41, rx: 0.17, rz: 0.12, thick: 0.055 },
    crown: { worn: true, k: 0.86, y: 0.165 } },
  steward: { id: 'steward', bind: 'rmale', s: 0.98, skin: 0xd0a088, skinK: 0.9, home: 'throne', x: -1.05, z: 2.55, face: 1, headY: 2.05,
    parts: [part(P_M('Body'), { L: 0x3a2a1a, P: 0x5a4a30 }), part(P_M('Arms'), { L: 0x2e3e2a, P: 0x2e4a32 }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x2a2018, P: 0x2a2018 }), part(P_M('Feet'), { L: 0x1a120c, P: 0x241810 })],
    brows: 0xb0aaa0, hair: [['Hair_Buzzed', 0x8a847a], ['Hair_Beard', 0xb8b2a8]],
    robe: { col: 0x2e4a32, top: 1.0, bot: 0.05, rx: [0.17, 0.33], rz: [0.13, 0.28], trim: 0xb8862e, leg: 0.5 },
    tabard: { col: 0x7a5a2a, trim: 0xd8a43a, w: 0.055, top: 1.42 }, prop: 'scroll' },
  guardL: null, guardR: null,
  commander: { id: 'commander', bind: 'rmale', s: 1.08, skin: 0xc89070, skinK: 0.88, idle: 'Idle_FoldArms_Loop', home: 'throne', x: -6.3, z: 1.9, face: 1, headY: 2.2,
    parts: [part(R_M('Body'), { G: 0x5a2a1a, L: 0x2a1e16, P: 0x8a8e98 }), part(R_M('Arms'), { G: 0x5a2a1a, L: 0x2a1e16, P: 0x8a8e98 }), part(R_M('Arms'), 'skin'), part(R_M('Legs'), { G: 0x2a2620, L: 0x2a1e16 }),
      part(R_M('Feet_Boots'), { L: 0x1a1410, G: 0x1a1410, P: 0x4a4a50 }), part(R_M('Acc_Pauldron'), { L: 0x7a7e88, G: 0x7a7e88, P: 0xb0b6c0, metal: 0.7, rough: 0.35 }), part(R_M('Body_Belt_1'), { L: 0x1e1610, P: 0xb8a060 })],
    brows: 0x2a1810, hair: [['Hair_Buzzed', 0x2a1c12], ['Hair_Beard', 0x3a2414]], collar: { pal: [0x2a2018, 0x3a2c20, 0x4a3a2a, 0x5a4a38], y: 1.46, rx: 0.21, rz: 0.15 } },
  spymaster: { id: 'spymaster', bind: 'rfemale', s: 0.98, skin: 0xd8a890, skinK: 0.9, home: 'throne', x: -4.75, z: 1.55, face: 1, headY: 1.98,
    parts: [part(P_F('Body'), { L: 0x2a2230, P: 0x3a3244 }), part(P_F('Arms'), { L: 0x2a2230, P: 0x342c3e }), part(P_F('Legs'), { L: 0x1e1a22, P: 0x1e1a22 }), part(P_F('Feet'), { L: 0x141014, P: 0x1e1a1e })],
    brows: 0x1a1214, hair: [['Hair_Buns', 0x141012]],
    robe: { col: 0x2a2434, top: 0.95, bot: 0.12, rx: [0.15, 0.3], rz: [0.12, 0.26], trim: 0x6a5a8a, leg: 0.5 }, collar: { pal: [0x1a161e, 0x241e2a, 0x2e2636, 0x3a3044], y: 1.4, rx: 0.17, rz: 0.12, thick: 0.05 } },
  marta: { id: 'marta', bind: 'rfemale', s: 0.97, skin: 0xd8a88a, skinK: 0.92, walk: 'Walk_Loop', speed: 0.95, home: 'throne', x: 12.4, z: 3.0, face: -1, headY: 1.98,
    parts: [part(P_F('Body'), { L: 0x5a3a22, P: 0xb8a888 }), part(P_F('Arms'), { L: 0x5a3a22, P: 0xa89878 }), part(P_F('Legs'), { L: 0x3a2a1c, P: 0x3a2a1c }), part(P_F('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
    brows: 0x4a3424, hair: [['Hair_Buns', 0x6a5a48]],
    robe: { col: 0x5a4a3a, top: 0.95, bot: 0.06, rx: [0.15, 0.32], rz: [0.12, 0.27], leg: 0.45 }, tabard: { col: 0xd8ccb0, trim: null, w: 0.1, top: 0.96, from: P_F('Body') } },
  tomasz: { id: 'tomasz', bind: 'rmale', s: 1.0, skin: 0xd8a888, skinK: 0.92, walk: 'Walk_Loop', speed: 1.0, home: 'throne', x: 12.4, z: 3.0, face: -1, headY: 2.1,
    parts: [part(P_M('Body'), { L: 0x2e4a3a, P: 0xc8b890 }), part(P_M('Arms'), { L: 0x2e4a3a, P: 0x2e4a3a }), part(P_M('Arms'), 'skin'), part(P_M('Legs'), { L: 0x3a2e22, P: 0x3a2e22 }), part(P_M('Feet'), { L: 0x2a1a10, P: 0x3a2a1a })],
    brows: 0x5a3a22, hair: [['Hair_SimpleParted', 0x5a3a22], ['Hair_Beard', 0x5a3a22]],
    robe: { col: 0x2e4a3a, top: 1.0, bot: 0.55, rx: [0.17, 0.26], rz: [0.13, 0.22], trim: 0xc8a040, leg: 0.6 }, collar: { pal: [0x3a2a1a, 0x4a3624, 0x5a442e, 0x6a5238] } },
};
const guard = (id, x) => ({ id, bind: 'rmale', s: 1.02, skin: 0xc89878, skinK: 0.9, home: 'throne', x, z: 2.55, face: x < CAST_TX ? 1 : -1, box: [1.5, 2.9], headY: 2.25,
  parts: [part(R_M('Body'), { G: 0x6a1418, L: 0x2a1e16, P: 0x8a8e98 }), part(R_M('Arms'), { G: 0x6a1418, L: 0x2a1e16, P: 0x8a8e98 }), part(R_M('Arms'), 'skin'), part(R_M('Legs'), { G: 0x2a2a30, L: 0x2a1e16 }),
    part(R_M('Feet_Boots'), { L: 0x1a1410, G: 0x1a1410, P: 0x4a4a50 }), part(R_M('Acc_Pauldron'), { L: 0x7a7e88, G: 0x7a7e88, P: 0xb0b6c0, metal: 0.7, rough: 0.35 }), part(R_M('Body_Belt_1'), { L: 0x1e1610, P: 0xb8a060 })],
  brows: 0x2a1c12, hair: [['Hair_Beard', 0x3a2a1a]], robe: { col: 0x6a1418, top: 1.0, bot: 0.56, rx: [0.17, 0.24], rz: [0.13, 0.2], trim: 0xd8a43a, leg: 0.7 },
  tabard: { col: 0xe8e2d6, emblem: 0x24452e, top: 1.36, w: 0.08, trim: 0xd8a43a, from: R_M('Body') }, helmet: { col: 0x9aa2ae }, prop: 'spear' });
const CAST_TX = 1.5;
CAST.specs.guardL = guard('guardL', -2.15); CAST.specs.guardR = guard('guardR', 5.15);
CAST.build = async function () {
  const A = {};
  for (const [k, spec] of Object.entries(CAST.specs)) { A[k] = await new Actor(spec).build(); SCENE.addActor(A[k]); setLoad(0.7 + 0.15 * Object.keys(A).length / Object.keys(CAST.specs).length); await nextFrame(); }
  CAST.A = A; SCENE.player = A.king;
  A.marta.offstage = A.tomasz.offstage = true; A.marta.setVisible(false); A.tomasz.setVisible(false);
  return A;
};
