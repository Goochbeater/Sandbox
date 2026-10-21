// storycast harness. MODE=lineup (default): the whole roster side by side, front then back (CINE stage, fixed cameras).
// MODE=close: one shot per character, a face close-up then a hands/prop close-up. MODE=logic: headless CINE runs for 300 frames
// (the lore scene 1_5_the_offer with the story cast, and the full roster) and prints the error count. Run through tools/shot.js.
module.exports = async (H) => {
  await H.step(30);
  const MODE = process.env.MODE || 'lineup';
  const ROSTER = [
    { id: 'milian', cast: 'milian', prop: 'holocron', base: 'hold' },
    { id: 'milian_hood', cast: 'milian_hood', base: 'idle' },
    { id: 'kyros', cast: 'kyros', saber: 'blue', hilt: 'single', lit: true, offhand: 'blue', base: 'hold' },
    { id: 'celene', cast: 'celene', saber: 'green', hilt: 'staff', lit: true, base: 'guard' },
    { id: 'celene_knight', cast: 'celene_knight', saber: 'green', hilt: 'staff', lit: true, base: 'guard' },
    { id: 'bosskarr', cast: 'bosskarr', prop: 'rifle', base: 'hold' },
    { id: 'trandoshan', cast: 'trandoshan', base: 'idle' },
    { id: 'trandoshan2', cast: 'trandoshan2', base: 'idle' },
    { id: 'vak', cast: 'vak', prop: 'gaff', base: 'hold' },
    { id: 'donn', cast: 'donn', base: 'idle' },
    { id: 'traya_holo', cast: 'traya_holo', prop: 'holocronGlow', base: 'idle' },
  ];
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const list = only ? ROSTER.filter((r) => only.includes(r.id)) : ROSTER;
  const SP = +(process.env.SP || 1.3);
  const stageFor = (rs, z) => rs.map((r, i) => Object.assign({}, r, { pos: [(i - (rs.length - 1) / 2) * SP, 0, z], yaw: 0 }));

  // CINE.play sets the camera for each shot from cam[i]; flags and props are attached by the CINE.spawn hook in p15h
  const endScene = async () => { await H.eval(() => { if (CINE.cur) { CINE.cur.scr = null; CINE.finish(); } }); await H.step(4); };   // scr = null: no choice panel
  // CINE.play awaits real async loading (CAST.need yields to the event loop), so wait for the first shot before stepping frames
  const loaded = () => H.waitFor(() => !!(CINE.cur && CINE.cur.loaded && CINE.cur.i >= 0), null, 600000);

  if (MODE === 'lineup') {
    const stage = stageFor(list, 4), W = list.length * SP, d = W * 0.6 + 1.8;
    await H.eval((a) => { const [stage, d] = a;
      const front = () => ({ p0: V3(0, 1.3, 4 + d), p1: V3(0, 1.3, 4 + d - 0.3), l0: V3(0, 1.0, 4), l1: V3(0, 1.0, 4), fov: 42 });
      const back = () => ({ p0: V3(0, 1.3, 4 - d), p1: V3(0, 1.3, 4 - d + 0.3), l0: V3(0, 1.0, 4), l1: V3(0, 1.0, 4), fov: 42 });
      CINE.def('sc_lineup', { level: null, stage, cam: [front, back],
        act: { 1: stage.map((s) => ({ who: s.id, yaw: Math.PI })) }, shots: [{ dur: 6, who: 'CAPTION', line: '' }, { dur: 6, who: 'CAPTION', line: '' }] });
      CINE.play('sc_lineup'); }, [stage, d]);
    await loaded(); await H.step(150); await H.shot('lineup_front');
    await H.step(420); await H.shot('lineup_back');
    await endScene();
  } else if (MODE === 'close') {
    for (const r of list) {
      const one = [Object.assign({}, r, { pos: [0, 0, 4], yaw: 0 })];
      await H.eval((a) => { const [one, id] = a; CINE.def('sc_close', { level: null, stage: one,
        cam: [() => CINE.cam.close(id, 0.75, 1.6, 0, 24, 0.1)(), () => CINE.cam.close(id, 0.62, 0.98, 0.35, 30, 0.1)()],
        shots: [{ dur: 3, who: 'CAPTION', line: '' }, { dur: 3, who: 'CAPTION', line: '' }] }); CINE.play('sc_close'); }, [one, r.id]);
      await loaded(); await H.step(90); await H.shot('close_' + r.id + '_face');
      await H.step(180); await H.shot('close_' + r.id + '_hands');
      await endScene();
    }
  } else if (MODE === 'logic') {
    // 1: the lore dialogue scene with the story cast (lore script id 1_5_the_offer supplies the lines)
    const lore = [{ id: 'milian', cast: 'milian', pos: [0, 0, 4], yaw: 0, base: 'hold', prop: 'holocron' }, { id: 'guard', cast: 'guard', pos: [-1.6, 0, 3.2], yaw: 0, base: 'idle' },
      { id: 'rathatri', cast: 'rath3', pos: [1.3, 0, 3.4], yaw: 0, base: 'idle' }];
    await H.eval((stage) => { CINE.def('1_5_the_offer', { level: null, stage }); CINE.play('1_5_the_offer'); }, lore);
    await loaded(); await H.step(300);
    const r1 = await H.eval(() => ({ busy: !!CINE.cur, shot: CINE.cur ? CINE.cur.i : -1, actors: CINE.cur ? Object.keys(CINE.cur.actors) : [], errors: (MG.errors || []).slice(0, 5) }));
    console.log('LOGIC lore 1_5: ' + JSON.stringify(r1));
    await endScene();
    // 2: every story character staged together for 300 frames
    const stage = stageFor(list, 4);
    await H.eval((stage) => { CINE.def('test_cast', { level: null, stage, shots: [{ dur: 6, who: 'CAPTION', line: '' }] }); CINE.play('test_cast'); }, stage);
    await loaded(); await H.step(300);
    const r2 = await H.eval(() => ({ busy: !!CINE.cur, actors: CINE.cur ? Object.keys(CINE.cur.actors).length : 0, errors: (MG.errors || []).slice(0, 5) }));
    console.log('LOGIC roster: ' + JSON.stringify(r2));
    await endScene();
  }
  const fin = await H.eval(() => ({ errors: (MG.errors || []).length, msgs: (MG.errors || []).slice(0, 3).map(String) }));
  console.log('STORYCAST ' + MODE + ' done: ' + JSON.stringify(fin));
};
