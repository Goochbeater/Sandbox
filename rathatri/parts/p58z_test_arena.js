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
