// Hunters verification (p55 / p55b). Run through tools/shot.js (Playwright, the built single file):
//   MODE=lineup  MOBILE=1 WHOS='["commando",...]' node tools/shot.js tools/sc_hunters.js <out> "?play=test_arena&nointro"
//       -> front / back / three-quarter lineup JPEGs of the new types (WHOS: enemy types, or "jt:<template>" for Jedi templates)
//   MODE=fight   QUIET=1 node tools/shot.js tools/sc_hunters.js <out> "?play=test_arena&nointro&norender"
//       -> one of each new type, MG.god on, 600 frames; asserts no errors, attacks, shield wall, damage and death, budget caps
const TYPES = ['commando', 'commSgt', 'commArmored', 'bhunter', 'bhunterB', 'bhunterC', 'jhunter', 'jseeker'];
const results = [];
const check = (name, ok, info) => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); };
module.exports = async (H) => {
  await H.step(20);
  if ((process.env.MODE || 'lineup') === 'lineup') return lineup(H);
  return fight(H);
};
async function lineup(H) {
  const list = JSON.parse(process.env.WHOS || JSON.stringify(TYPES)), SP = +(process.env.SP || 1.35), DK = +(process.env.DK || 1);
  const close = !!process.env.CLOSE;   // CLOSE=1: one unit at a time, camera close (silhouette and detail check)
  await H.eval(async () => { await CAST.need(HUNTERS.castAll()); });
  await H.eval((a) => {
    const [list] = a;
    for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; }
    for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; if (b.root) b.root.visible = false; }
    PLAYER.a.root.visible = false;   // keep the player out of the frame
    // lineup-only key and fill light: the arena is unlit for gameplay and would hide the armour colours
    window.__lights = [R.addLight({ pos: V3(0, 3.2, 9), col: new THREE.Color(1, 0.95, 0.88), i: 9, range: 40, on: true, prio: 4 }),
      R.addLight({ pos: V3(-6, 2.5, 6), col: new THREE.Color(0.6, 0.7, 1.0), i: 4, range: 30, on: true, prio: 4 })];
    PLAYER.state = 'cine'; MG.line = [];
  }, [list]);
  const groups = close ? list.map((t) => [t]) : [list];
  for (const grp of groups) {
    await H.eval((a) => {
      const [grp, SP] = a;
      for (const e of MG.line || []) { e.hidden = true; if (e.root) e.root.visible = false; }
      MG.line = [];
      grp.forEach((t, i) => {
        const x = (i - (grp.length - 1) / 2) * SP, z = 4;
        const e = t.startsWith('jt:') ? new JediHunter('jhunter', { x, y: 0, z, yaw: 0, tpl: t.slice(3), color: t.endsWith('jseeker') ? 'green' : 'blue' }) : ENEMY.spawn(t, x, z, {});
        e.passive = true; e.yaw = 0; MG.line.push(e);
      });
    }, [grp, SP]);
    await H.step(30);
    const W = grp.length * SP, d = (close ? 2.7 : W * 0.82 + 0.8) * DK;
    const tag = close ? (process.env.TAG || 'C') + '_' + grp[0].replace(/[^A-Za-z0-9]/g, '') : (process.env.TAG || 'L');
    for (const [k, yaw] of [['F', 0], ['B', Math.PI], ['Q', 0.6]]) {
      await H.eval((a) => { const [yaw, d] = a; for (const e of MG.line) e.yaw = 0;
        CAM.cine = { t: 0, dur: 99, hold: true, fov: close ? 30 : 38, fn: () => ({ pos: V3(Math.sin(yaw) * d, close ? 1.2 : 1.05, 4 + Math.cos(yaw) * d), look: V3(0, close ? 1.0 : 0.95, 4) }) }; }, [yaw, d]);
      await H.step(3); await H.shot(tag + '_' + k);
    }
  }
}
async function fight(H) {
  // the test arena's own wave spawns on timers after level start: let every wave enemy exist, then clear them
  for (let k = 0; k < 60; k++) { await H.step(10, 1 / 60); if (await H.eval(() => LEVEL.cur.waves.every((w) => w.enemies.length === w.list.length))) break; }
  await H.eval(() => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; } for (const b of BOSS.list.slice()) if (!b.hunter) { b.alive = false; b.hidden = true; } });
  const setup = await H.eval(async (types) => {
    window.__errs = []; const ce = console.error; console.error = function () { window.__errs.push([].slice.call(arguments).join(' ')); ce.apply(console, arguments); };
    window.__e0 = MG.errors.length;
    await CAST.need(HUNTERS.castAll());
    const P = PLAYER.a; MG.god = true;
    const st = window.__st = { shots: 0, hitsOnPlayer: 0, byType: {}, fired: {}, barks: 0 };
    const d0 = COMBAT.damage, f0 = COMBAT.fire, s0 = HUD.sub;
    COMBAT.damage = function (t, amt, info) { if (t && t.isPlayer && info && info.src) { st.hitsOnPlayer++; const k = info.src.type || '?'; st.byType[k] = (st.byType[k] || 0) + 1; } return d0.call(this, t, amt, info); };
    COMBAT.fire = function (p, dir, o) { if (o && o.team === 'foe') { st.shots++; const k = (o.shooter && o.shooter.type) || '?'; st.fired[k] = (st.fired[k] || 0) + 1; } return f0.call(this, p, dir, o); };
    HUD.sub = function () { st.barks++; return s0.apply(this, arguments); };
    const list = types.map((t, i) => ENEMY.spawn(t, (i - (types.length - 1) / 2) * 2.4, -3, { alert: true }));
    window.__hz = list;
    // shield wall: the sergeant's front, facing the player: a light blow is deflected, a heavy one cracks the wall
    const sg = list.find((e) => e.type === 'commSgt');
    const shield = {};
    if (sg) { sg.yaw = sg.angTo(P); const p = sg.chest(V3()); shield.lightBlocked = sg.tryBlock(P, 10, 'slash', p); shield.wallUp = sg.shieldHP; shield.heavyBlocked = sg.tryBlock(P, 10, 'slam', p); shield.wallAfterHeavy = sg.shieldHP; sg.shieldDownT = 0; sg.shieldHP = 1; }
    return { n: list.length, live0: HUNTERS.live(), jedi0: HUNTERS.jedi(), shield, types: list.map((e) => [e.type, e.constructor.name, e.hp, !!e.shieldM]) };
  }, TYPES);
  console.log('SETUP ' + JSON.stringify(setup));
  check('one of each type spawned', setup.n === TYPES.length && setup.live0 === TYPES.length, { live: setup.live0 });
  check('sergeant shield deflects a light frontal blow', setup.shield.lightBlocked === true, setup.shield);
  check('sergeant shield cracks under a heavy blow and the blow lands', setup.shield.heavyBlocked === false && setup.shield.wallAfterHeavy === 0, setup.shield);
  await H.step(600, 1 / 60);
  // seeker lure: 14 m off the duel, a Force-use echo 28 m north: it must sprint toward the echo
  const lure = await H.eval(() => { const sk = window.__hz.find((e) => e.type === 'jseeker'); if (!sk) return null;
    const sp = ENEMY.findSpot(-14, -3, 0); sk.x = sp[0]; sk.y = sp[1]; sk.z = sp[2]; sk.lureT = 0;
    ENEMY.alertAt(-14, 25, 30); window.__lk = { ex: -14, ez: 25, d0: Math.hypot(sk.x + 14, sk.z - 25), t: sk.lureT }; return { set: sk.lureT > 0, d0: window.__lk.d0 }; });
  await H.step(60, 1 / 60);
  const lure2 = await H.eval(() => { const sk = window.__hz.find((e) => e.type === 'jseeker'); if (!sk) return null; return { d1: Math.hypot(sk.x - window.__lk.ex, sk.z - window.__lk.ez), alive: sk.alive }; });
  console.log('LURE ' + JSON.stringify({ lure, lure2 }));
  check('a Force-use echo sets the seeker sprinting, and it closes on the echo', !!lure && lure.set && lure2 && lure2.alive && lure2.d1 < lure.d0 - 2, { before: lure && lure.d0, after: lure2 && lure2.d1 });
  const r = await H.eval(() => {
    const P = PLAYER.a, st = window.__st, list = window.__hz;
    const alive = list.filter((e) => e.alive && !e.hidden).length;
    const errs = window.__errs.length, merr = MG.errors.length - window.__e0;
    // damage and death: a normal hit must lower HP, a heavy hit must kill every one
    const hit = list.map((e) => { const h0 = e.hp; COMBAT.damage(e, 6, { src: P, kind: 'slash', dir: V3(0, 0, 1) }); return e.hp < h0 || !e.alive; });
    const hpAfterHit = list.map((e) => e.alive ? +e.hp.toFixed(1) : 0);
    const killed = list.map((e) => { COMBAT.damage(e, 9999, { src: P, kind: 'heavy', heavy: true, dir: V3(0, 0, 1) }); return !e.alive; });
    return { alive, errs, merr, shots: st.shots, hitsOnPlayer: st.hitsOnPlayer, byType: st.byType, fired: st.fired, barks: st.barks, hit: hit.every(Boolean), hpAfterHit, killed: killed.every(Boolean), liveAfter: list.filter((e) => e.alive && !e.hidden).length, errMsgs: window.__errs.slice(0, 3), mgErr: MG.errors.slice(0, 3) };
  });
  console.log('FIGHT ' + JSON.stringify(r));
  check('no console or page errors in 600 frames', r.errs === 0 && r.merr === 0, { console: r.errs, mg: r.merr, msgs: r.errMsgs.concat(r.mgErr) });
  check('enemies attack the god-mode player (shots and blows)', r.hitsOnPlayer > 0 && r.shots > 0, { shots: r.shots, blows: r.hitsOnPlayer });
  const FAM = (k) => k.startsWith('bhunter') ? 'bhunter' : k;
  check('every new type attacked (shots or blows)', TYPES.every((t) => (r.fired[t] || 0) + (r.byType[t] || 0) > 0), { fired: r.fired, blows: r.byType });
  check('enemies can be damaged (a normal hit lowers HP)', r.hit === true, r.hpAfterHit);
  check('enemies die (heavy finishing hit)', r.killed === true && r.liveAfter === 0, { liveAfter: r.liveAfter });
  // budget: the spawn ring respects <=14 live and <=7 Jedi-class
  const bud = await H.eval(() => {   // (after the kill: the ring must still respect the caps)
    const L = LEVEL.cur, t0 = HUNTERS.table(4), t3 = HUNTERS.table(3), t9 = HUNTERS.table(9), t0b = HUNTERS.table(0);
    const got = HUNTERS.spawnAround(L, 4, 0, 2, 12);
    const n4 = got.length, j4 = got.filter((e) => e.hunter).length, live4 = HUNTERS.live();
    for (let i = 0; i < 3; i++) HUNTERS.spawnAround(L, 4, 0, 2, 12);
    const liveMany = HUNTERS.live(), jediMany = HUNTERS.jedi();
    ENEMY.alertAt(0, 2, 30);
    const seekers = BOSS.list.filter((b) => b.sensesEcho && b.alive && !b.hidden);
    const lure = seekers.map((b) => b.lureT > 0);
    return { t0, t3, t9, t0b, n4, j4, live4, liveMany, jediMany, lure };
  });
  console.log('BUDGET ' + JSON.stringify(bud));
  check('tier tables: 0 beasts only, 1 pair, 2 fireteam, 3 +seeker, 4 Kyros cell', JSON.stringify(bud.t0b) === '[]' && JSON.stringify(bud.t0) === JSON.stringify([['jhunter', 2], ['commando', 3], ['commSgt', 1]]) && JSON.stringify(bud.t3) === JSON.stringify([['commando', 4], ['commSgt', 1], ['jseeker', 1]]), bud.t3);
  check('spawn ring stays inside the mobile budget (<=14 live, <=7 Jedi)', bud.liveMany <= 14 && bud.jediMany <= 7, { live: bud.liveMany, jedi: bud.jediMany });
  const ok = results.every(Boolean);
  console.log(ok ? 'ALL PASS (' + results.length + ')' : 'FAILURES: ' + results.filter((x) => !x).length + ' of ' + results.length);
}
