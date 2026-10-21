/* TEST ARENA — a flat floor with a few foes. Used by agents/tests (?play=test_arena&nointro); not part of the campaign. */
LEVEL.def('test_arena', {
  chapter: 'DEBUG', name: 'TEST ARENA', cast: ['guard', 'csf'], tex: ['sithFloor', 'metalPanel'],
  start: [0, 0, -10, 0], checkpoints: [[0, 0, -10, 0]], killY: -30,
  async build(L) {
    const floor = TEX.mat('sithFloor', { color: 0x9a8f8a, env: 1.0 });
    KIT.box(-30, -1, -30, 30, 0, 30, floor);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; KIT.cyl(Math.sin(a) * 24, 0, Math.cos(a) * 24, 1.2, 7, TEX.mat('metalPanel', { color: 0x554a48 })); KIT.lamp(Math.sin(a) * 21, 4, Math.cos(a) * 21, 0xff4a2a, 3, 16); }
    R.setSun(new THREE.Vector3(-0.5, 0.8, 0.3), 0xffc8b0, 2.0, 0x6a5a6a, 0x201010, 0.8); R.setShadowBox(24, 90);
    R.scene.fog = new THREE.FogExp2(new THREE.Color(0.10, 0.06, 0.06), 0.012);
    const env = new THREE.Scene(); env.background = new THREE.Color(0.12, 0.08, 0.08); L.env = env;
  },
  onStart(L, cp) {
    HUD.obj('Defeat the test dummies');
    LEVEL.wave([['guard', -5, 6], ['guard', 5, 6], ['csf', 0, 12]], () => { HUD.pop('CLEARED'); if (typeof MISSION !== 'undefined' && MISSION.cur) MISSION.complete({ rank: 'A' }); }, { now: true, stagger: 0.4 });
  },
});
/* PLANET TEST — any world (?play=planet_test&world=dxun|hutta|zx34|ambria|raxus|krayiss|lenico|onderon) with a ruin set at the start */
LEVEL.def('planet_test', {
  chapter: 'DEBUG', name: 'WORLD TEST', cast: ['guard'], tex: [], start: [0, 0, -6, 0], checkpoints: [[0, 0, -6, 0]], killY: -60,
  async build(L) {
    const id = MG.flags.world || 'dxun', Wd = PLANET.build(L, id, { pads: [[0, 0, 14, 0, 10], [0, 40, 10, 0, 12]] }); L.Wd = Wd;
    const st = FLORA.stone('blocks_sand', id === 'dxun' ? 0x8a8a7c : 0x9a9a90, id === 'dxun' ? 0x3a5a22 : null), dark = FLORA.stone('rock_dark', 0x4a4a50, id === 'dxun' ? 0x3a5a22 : null), y = (x, z) => Wd.y(x, z);
    FLORA.statue(-6, y(-6, 8), 8, Math.PI * 0.9, 1.6, st, { eyes: 0xff2a1a }); FLORA.statue(7, y(7, 10), 10, -2.2, 1.6, st, { fallen: true });
    for (const [x, z, b] of [[-9, 20, 0], [-9, 28, 1], [9, 20, 1], [9, 28, 0]]) FLORA.pillar(x, y(x, z), z, 0.75, 7, st, { broken: !!b, glyph: b ? null : 0xff2a1a });
    FLORA.arch(0, y(0, 32), 32, 0, 4.4, 5.5, st, 0xff2a1a);
    FLORA.obelisk(16, y(16, 44), 44, 5, 16, 1.6, dark, 0x7aa7c7);
    L.door = FLORA.tombDoor(0, y(0, 52), 52, Math.PI, 3.2, 4.2, dark, 0xff2a1a);
    L.ward = FLORA.wardStone(-12, y(-12, 40), 40, dark, 0xff3a20);
    FLORA.wall(-20, 14, -12, 34, y(-16, 24), 3.5, 0.9, st, FLORA.rs(4));
  },
  onStart(L) { HUD.obj('World: ' + (MG.flags.world || 'dxun')); SCAN.setup(L, [{ x: 0, z: 40, text: 'An echo: two footprints, one stepping on the other.' }, { x: -12, z: 40 }]); },
});
