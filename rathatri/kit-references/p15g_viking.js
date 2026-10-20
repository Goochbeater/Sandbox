/* skill smoke test: a new cast member from the documented recipe (SPECS + QC + QO) */
CAST.SPECS.viking = Object.assign({}, CAST.SPECS.quigon, { name: 'viking', height: 1.05, shoulders: 1.08, eyes: 'blue', skin: { tone: 0xd8a888, brow: 0x8a4a22, stubble: 0 }, cloth: undefined });
CAST.QC.viking = Object.assign({}, CAST.QC.quigon, { hair: ['Hair_Long', 'Hair_Beard'], hairCol: 0x9a4a1e, browCol: 0x8a4a22 });
CAST.QO.viking = (function () {
  const R = (p, g, o) => ['ranger', p, g, o], Pz = (p, g, o) => ['peasant', p, g, o];
  const leatherV = (v, s) => ({ h: 28, w: 45, s: s === undefined ? 1 : s, v }), CREAM = (s, v) => ({ h: 38, w: 30, s, v, minS: 0.02 });
  return { parts: [Pz('Body', { rules: [{ h: 28, w: 45, toH: 5, s: 1.3, v: 0.7 }, CREAM(0.6, 0.55)], sat: 0.9, val: 0.9 }), Pz('Arms', { rules: [CREAM(0.6, 0.55)], sat: 0.9 }),
    Pz('Legs', { rules: [leatherV(0.55, 0.6)] }), R('Feet_Boots', { rules: [leatherV(0.6)] }, { metal: 0.2, env: 0.4 }), R('Arms_Bracer', { rules: [leatherV(0.5)] }, { metal: 0.3 }), R('Body_Belt_1', { rules: [leatherV(0.5)] }, { metal: 0.5 })],
    hair: ['Hair_Long', 'Hair_Beard'], hairCol: 0x9a4a1e, browCol: 0x8a4a22 };
})();
