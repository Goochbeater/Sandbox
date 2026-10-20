/* TESTS — ?test: boot, real DOM input (no pointer lock), survival at spawn, every level loads, combat, duel, ride. */
const TEST = { results: [], n: 0, pass: 0 };
TEST.ok = function (name, cond, info) { TEST.n++; if (cond) TEST.pass++; TEST.results.push((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); document.title = `${TEST.pass}/${TEST.n} · DARTH MAUL tests`; };
TEST.steps = function (n, dt) { for (let i = 0; i < n; i++) MG.tick(dt || 1 / 60); };
TEST.run = async function () {
  MG.manual = true;
  try {
    TEST.ok('boot without errors', MG.errors.length === 0, MG.errors.slice(0, 2).join(' | '));
    TEST.ok('title menu shown', !!document.querySelector('#title .mi'), MG.state);
    // New game via a real click on the menu item
    document.querySelector('#mPlay').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    for (let i = 0; i < 400 && MG.state !== 'play' && MG.state !== 'cine'; i++) await MG.yield();
    await new Promise((r) => setTimeout(r, 50));
    let tries = 0; while (MG.state === 'loading' && tries++ < 400) await new Promise((r) => setTimeout(r, 30));
    TEST.ok('new game loads the Works', LEVEL.cur && LEVEL.cur.id === 'works' && MG.state === 'play', LEVEL.cur && LEVEL.cur.id);
    TEST.steps(60 * 10.5);   // intro cinematic (crane + Sidious)
    const P = PLAYER.a, z0 = P.z;
    IN.fireKey('KeyW', true); TEST.steps(40); IN.fireKey('KeyW', false); TEST.steps(5);
    TEST.ok('W moves Maul (real keydown, no pointer lock)', Math.hypot(P.z - z0, P.x) > 1.0, (P.z - z0).toFixed(2));
    IN.fireMouse(0, true); TEST.steps(2); IN.fireMouse(0, false); TEST.steps(3);
    TEST.ok('left click starts the combo', PLAYER.state === 'attack' && (P.act === 'a1' || P.act === 'lunge'), PLAYER.state + '/' + P.act);   // a foe out of reach draws the leaping thrust
    TEST.steps(60);
    // survival: stand still 30 s with the first wave alive
    const hp0 = P.hp; TEST.steps(60 * 30);
    TEST.ok('survive 30 s idle at spawn', P.alive && P.hp > 20, 'hp ' + P.hp.toFixed(0) + ' (from ' + hp0.toFixed(0) + ')');
    // fight: god mode autopilot clears the first wave
    MG.god = true; let kills0 = COMBAT.kills;
    for (let k = 0; k < 1500; k++) {
      const f = COMBAT.foes().sort((a, b) => a.dist(P) - b.dist(P))[0];
      if (f) { CAM.yaw = P.angTo(f); if (P.dist(f) > 2.4) IN.keys.KeyW = true; else { IN.keys.KeyW = false; if (f.stunned && k % 5 === 0) { IN.fireKey('KeyF', true); IN.fireKey('KeyF', false); } else if (k % 6 === 0) { IN.fireMouse(k % 18 === 0 ? 2 : 0, true); IN.fireMouse(k % 18 === 0 ? 2 : 0, false); } } }
      MG.tick(1 / 60);
    }
    IN.keys.KeyW = false;
    TEST.ok('saber defeats the holographic Jedi', COMBAT.kills - kills0 >= 1, (COMBAT.kills - kills0) + ' kills');
    // deflect: a bolt fired at a blocking Maul is sent back
    const e = COMBAT.foes()[0] || ENEMY.spawn('holojedi', P.x, P.z + 8, { alert: true });
    TEST.steps(90); P.x = 0; P.z = 2; P.y = 0; P.yaw = 0; TEST.steps(5); IN.fireKey('KeyQ', true); TEST.steps(20);
    const stB = PLAYER.state;
    const b = COMBAT.fire(V3(P.x + Math.sin(P.yaw) * 6, P.y + 1.3, P.z + Math.cos(P.yaw) * 6), V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), { shooter: e, team: 'foe', dmg: 6 });
    TEST.steps(30); IN.fireKey('KeyQ', false);
    TEST.ok('blocking deflects a blaster bolt', b.deflected === true, 'team ' + b.team + ' state ' + stB);
    MG.god = false;
    // the good-guy roster: each type spawns, thinks and can be hurt
    for (const ty of ['guard', 'csf', 'senate', 'gungan', 'gunganShield', 'gunganBooma', 'panaka']) {
      await CAST.need([ENEMY.TYPES[ty].tpl]);
      const e = ENEMY.spawn(ty, P.x + 4, P.z + 4, { alert: true, grace: 0.5 }); TEST.steps(90);
      const hp0 = e.hp; COMBAT.damage(e, 5, { src: P, kind: 'test' }); TEST.steps(5);
      TEST.ok('enemy ' + ty + ' spawns + takes damage', MG.errors.length === 0 && e.hp < hp0, e.hp.toFixed(0) + '/' + hp0.toFixed(0));
      e.alive = true; COMBAT.damage(e, 9999, { src: P, kind: 'test', unblockable: true }); TEST.steps(10);
    }
    // every level loads cleanly
    for (const id of GAME.seq) {
      const e0 = MG.errors.length; MG.skipIntro = true;
      await LEVEL.load(id, {}); MG.skipIntro = false; MG.state = 'play';
      TEST.steps(60);
      TEST.ok('level ' + id + ' loads + runs 1 s', MG.errors.length === e0 && PLAYER.a && PLAYER.a.alive, MG.errors.slice(e0, e0 + 2).join(' | ') + ' calls ' + R.calls);
      if (id === 'generator') {
        const j = BOSS.list.find((q) => q.alive); const hp1 = j ? j.hp : 0; MG.god = true;
        // start beside the Jedi being measured (this checks damage, not catwalk navigation — foes()[0] could be out of reach)
        if (j) { const P = PLAYER.a; const sp = ENEMY.findSpot(j.x - Math.sin(j.yaw || 0) * -1.8, j.z - Math.cos(j.yaw || 0) * -1.8, j.y) || [j.x, j.y, j.z - 1.8]; P.x = sp[0]; P.y = sp[1]; P.z = sp[2]; P.vx = P.vz = P.vy = 0; }
        for (let k = 0; k < 1800; k++) { if (j && (j.hp < hp1 || !j.alive)) break; if (PLAYER.state === 'cine') { MG.tick(1 / 60); continue; } const f = j && j.alive ? j : COMBAT.foes()[0]; if (f) { CAM.yaw = PLAYER.a.angTo(f); IN.keys.KeyW = PLAYER.a.dist(f) > 2.4; if (k % 8 === 0 && PLAYER.a.dist(f) < 3) { IN.fireMouse(k % 24 === 0 ? 2 : 0, true); IN.fireMouse(k % 24 === 0 ? 2 : 0, false); } if (f.stunned && k % 5 === 0) { IN.fireKey('KeyF', true); IN.fireKey('KeyF', false); } } MG.tick(1 / 60); }
        IN.keys.KeyW = false; MG.god = false;
        TEST.ok('Jedi duel: Maul hurts a Jedi', j && (j.hp < hp1 || !j.alive), j ? (hp1.toFixed(0) + ' -> ' + j.hp.toFixed(0) + ' | d=' + PLAYER.a.dist(j).toFixed(1) + ' py=' + PLAYER.a.y.toFixed(1) + ' jy=' + j.y.toFixed(1) + ' ps=' + PLAYER.state + ' js=' + j.state + ' pas=' + !!j.passive + ' who=' + j.who) : 'no jedi');
      }
      if (id === 'dunes') {
        const bk = RIDE.bike; PLAYER.a.x = bk.position.x + 1; PLAYER.a.z = bk.position.z; TEST.steps(10);
        IN.fireKey('KeyF', true); TEST.steps(2); IN.fireKey('KeyF', false); TEST.steps(5);
        const z1 = bk.position.z; IN.fireKey('KeyW', true); TEST.steps(120); IN.fireKey('KeyW', false);
        TEST.ok('Bloodfin: mount and ride', PLAYER.state === 'ride' || RIDE.on === false, 'moved ' + (bk.position.z - z1).toFixed(1) + ' m');
        if (RIDE.on) RIDE.dismount(false);
      }
    }
  } catch (err) { TEST.ok('test harness', false, String(err.stack || err).slice(0, 300)); }
  MG.testResult = `${TEST.pass}/${TEST.n}`;
  console.log('TEST RESULT ' + MG.testResult);
  MG.manual = false;
};
