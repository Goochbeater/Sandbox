// SHIPS scenario (p51_ship.js). Boot test_arena first; then one of two modes:
//   MODE=sheet (default): builds every SHIP.KINDS entry, logs tris / draw calls, shoots 3 views for each player hull
//                         and 1 view for every other kind (out dir = H.out).
//   MODE=call:            ground ship-call on test_arena for each player hull via the IN.buf press path, checks cooldown,
//                         bolts / splash hits, and that a level change aborts a run. Run with &norender in the URL.
// Example: BUILD=/tmp/ships/game.html QUIET=1 MODE=sheet node tools/shot.js tools/sc_ships.js /tmp/ships/out "?play=test_arena&nointro"
module.exports = async (H) => {
  await H.step(20, 1 / 30);
  if ((process.env.MODE || 'sheet') === 'sheet') return sheet(H);
  return call(H);
};

async function sheet(H) {
  const kinds = await H.eval(() => SHIP.KINDS.slice());
  const rows = await H.eval((kinds) => kinds.map((k) => {
    const g = SHIP.build(k); let tris = 0, draws = 0;
    g.traverse((o) => { if (o.isMesh) { draws++; const q = o.geometry; tris += (q.index ? q.index.count : q.attributes.position.count) / 3; } });
    const u = g.userData, r = { kind: k, tris: Math.round(tris), draws, len: u.len, wing: u.wing, muzzles: u.muzzles.length, engines: u.engines.length };
    SHIP.dispose(g); return r; }), kinds);
  for (const r of rows) console.log(`SHIPSTAT ${r.kind.padEnd(16)} tris ${String(r.tris).padStart(6)}  draws ${r.draws}  len ${r.len}  muzzles ${r.muzzles}  engines ${r.engines}  ${r.tris <= 12000 && r.draws <= 6 ? 'OK' : 'OVER BUDGET'}`);
  // freeze the scene: no player, no foes, no floor, no fog; the camera is a held shot
  await H.eval(() => { PLAYER.state = 'cine'; if (LEVEL.cur && LEVEL.cur.group) LEVEL.cur.group.visible = false;
    for (const a of COMBAT.actors) if (a.root) a.root.visible = false; R.scene.fog = null; R.scene.background = new THREE.Color(0.035, 0.035, 0.045); HUD.show(false);
    R.setSun(V3(0.5, 0.7, 0.55), 0xfff2e0, 3.2, 0x8090a8, 0x202020, 1.0); R.G.exposure = 1.7; });   // a viewer light, not the arena's
  for (const kind of kinds) {
    const vs = ['harbinger', 'interceptor', 'shroud'].includes(kind) ? ['q', 's', 't'] : ['q'];
    for (const v of vs) {
      await H.eval(([kind, v]) => {
        if (window.__sg) SHIP.dispose(window.__sg);
        const g = SHIP.build(kind); R.scene.add(g); window.__sg = g;
        const U = g.userData, d = Math.max(U.len, U.wing * 2) * 1.2 + 3;
        const dir = v === 's' ? V3(1, 0.14, 0) : v === 't' ? V3(0.02, 1, 0.3) : V3(0.62, 0.42, 0.66);
        const pos = dir.normalize().multiplyScalar(d), look = V3(0, 0, 0);
        CAM.cine = { t: 0, dur: 99, hold: true, fov: 34, fn: () => ({ pos, look }) };
      }, [kind, v]);
      await H.step(3, 1 / 30);
      await H.pshot(`ship_${kind}_${v}`);
    }
  }
}

async function call(H) {
  const hulls = ['harbinger', 'interceptor', 'shroud'];
  for (const hull of hulls) {
    // fresh arena each time; god mode so the foes cannot end the test; the hull under test comes from the save
    await H.eval(async (hull) => { await LEVEL.load('test_arena'); LEVEL.cur.def.ship = true; PLAYER.a.god = true; SAVE.d.ship = hull; SHIP.cd = 0; }, hull);
    const before = await H.eval(() => { window.__fe = COMBAT.foes(); return { hp: window.__fe.map((e) => Math.round(e.hp)), n: { ...SHIP.n }, errs: MG.errors.length, avail: SHIP.avail(), kind: SHIP.kind() }; });
    await H.eval(() => { IN.buf.ship = MG.rt; });               // the G / touch SHIP press
    await H.step(1, 1 / 60);
    const started = await H.eval(() => ({ run: !!SHIP.run, kind: SHIP.run && SHIP.run.kind, cd: +SHIP.cd.toFixed(2), touchCd: +TOUCH.cd.ship().toFixed(2) }));
    const again = await H.eval(() => SHIP.call());               // must refuse: a run is in progress
    let steps = 0;                                               // step to the moment the ship is over the player
    while (steps++ < 900) { const at = await H.eval(() => !SHIP.run || SHIP.run.t >= SHIP.R0 / SHIP.run.H.speed + 0.25); if (at) break; await H.step(1, 1 / 60); }
    const mid = await H.eval(() => ({ run: !!SHIP.run, t: SHIP.run ? +SHIP.run.t.toFixed(2) : null, visible: SHIP.run ? SHIP.run.g.visible : null, fx: SHIP.fx.length }));
    await H.pshot('run_' + hull);
    await H.step(900, 1 / 60);                                   // 15 s of game time: the run, the charge and the ring
    const after = await H.eval(() => ({ run: !!SHIP.run, n: { ...SHIP.n }, fx: SHIP.fx.length, cd: +SHIP.cd.toFixed(2), avail: SHIP.avail(), touchCd: +TOUCH.cd.ship().toFixed(2),
      hp: window.__fe.map((e) => Math.round(e.hp)), alive: window.__fe.filter((e) => e.alive).length, errs: MG.errors.slice(before.errs) }));
    const d = {}; for (const k of Object.keys(after.n)) d[k] = after.n[k] - before.n[k];
    console.log('SHIPCALL', JSON.stringify({ hull, kind: before.kind, avail0: before.avail, started, again, mid, delta: d,
      foesBefore: before.hp, foesAfter: after.hp, alive: after.alive, cd: after.cd, avail1: after.avail, touchCd: after.touchCd, runEnded: !after.run, fxLeft: after.fx, newErrors: after.errs }));
  }
  // level change mid-run must abort the run and remove the ship and every live effect
  await H.eval(() => { SAVE.d.ship = 'shroud'; SHIP.cd = 0; SHIP.call(); });
  await H.step(150, 1 / 60);
  const mid2 = await H.eval(() => ({ run: !!SHIP.run, fx: SHIP.fx.length }));
  await H.eval(async () => { await LEVEL.load('test_arena'); });
  await H.step(2, 1 / 60);
  const ab = await H.eval(() => ({ run: !!SHIP.run, fx: SHIP.fx.length, modelVisible: SHIP.models.shroud ? SHIP.models.shroud.visible : null, grpKids: SHIP.grp ? SHIP.grp.children.length : null, errs: MG.errors.length }));
  console.log('SHIPABORT', JSON.stringify({ mid: mid2, after: ab }));
}
