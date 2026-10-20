/* end-to-end autopilot: god mode, waypoints per level, fights whatever is near, advances through GAME.next / result screens */
module.exports = async (H) => {
  const WP = {
    works: [[0, 12], [0, 18], [0, 23.2]],
    rooftops: [[0, 8], [0, 20], [0, 36], [0, 42.5, 'jump'], [0, 58], [4, 70], [5, 77], [0, 90], [0, 106], [0, 118], [0, 134], [0, 140.5]],
    blacksun: [[0, -10], [0, 8], [0, 18]],
    dunes: 'dunes', canyon: 'canyon',
    hangar: [[0, 0], [0, 14], [0, 24]],
    generator: [[0, -30], [0, -12], [8, -6], [16, 7], [12.8, 14.8], [8.5, 21.5], [5.2, 28.2], [2, 32], [0, 36], [0, 42], [0, 45]],
    pit: [[0, 8], [0, 16], [0, 24], [0, 32], [0, 40], [0, 47], [0, 56], [0, 66], [0, 72]],
  };
  await H.eval(() => { MG.god = true; });
  const log = { push: (s) => console.log(s), join: () => '' };
  let lastLvl = '', idx = 0, stuck = 0, lastPos = null, frames = 0;
  const maxFrames = +(process.env.F || 60 * 60 * 14);
  while (frames < maxFrames) {
    const s = await H.eval(() => ({ st: MG.state, lvl: LEVEL.cur && LEVEL.cur.id, pst: PLAYER.state, x: PLAYER.a ? PLAYER.a.x : 0, y: PLAYER.a ? PLAYER.a.y : 0, z: PLAYER.a ? PLAYER.a.z : 0, menu: MENU.cur, err: MG.errors.length }));
    if (s.err) { log.push('ERRORS ' + JSON.stringify(await H.eval(() => MG.errors.slice(0, 3)))); break; }
    if (s.st === 'result') { log.push('RESULT after ' + s.lvl + ' @' + (frames / 60).toFixed(0) + 's'); const has = await H.eval(() => !!document.querySelector('#mNext')); if (!has) break; await H.eval(() => document.querySelector('#mNext').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await H.page.waitForFunction(() => MG.state === 'play', { timeout: 60000 }); await H.eval(() => { MG.god = true; }); continue; }
    if (s.st === 'dead') { log.push('DIED in ' + s.lvl); break; }
    if (s.st !== 'play') { await H.wait(100); continue; }
    if (s.lvl !== lastLvl) { log.push('LEVEL ' + s.lvl + ' @' + (frames / 60).toFixed(0) + 's'); lastLvl = s.lvl; idx = 0; }
    const r = await H.eval((a) => {
      let [wp, i] = a; const P = PLAYER.a; if (!P) return { idx: i };
      if (PLAYER.state === 'cine') { IN.keys.KeyW = false; for (let k = 0; k < 20; k++) MG.tick(1 / 60); return { idx: i, n: 20 }; }
      let pts = wp;
      if (wp === 'dunes' && typeof RUN !== 'undefined') {
        if (PLAYER.state === 'ride') { const b = RIDE.bike, z = b.position.z, zt = z + 35, xt = RUN.cx(zt) + RUN.line(zt) * 0.6, err = wrapA(Math.atan2(xt - b.position.x, zt - z) - RIDE.yaw);
          IN.keys.KeyA = err > 0.04; IN.keys.KeyD = err < -0.04; IN.keys.KeyW = true; for (let k = 0; k < 8; k++) MG.tick(1 / 60); return { idx: i, n: 8 }; }
        IN.keys.KeyA = IN.keys.KeyD = false;
        if (P.z < 3100 && RIDE.bike && !RIDE.on) { const b = RIDE.bike; if (Math.hypot(b.position.x - P.x, b.position.z - P.z) < 2.4) { IN.fireKey('KeyF', true); IN.fireKey('KeyF', false); for (let k = 0; k < 4; k++) MG.tick(1 / 60); return { idx: i, n: 4 }; } pts = [[b.position.x + 1, b.position.z]]; i = 0; }
        else { pts = []; for (let z = Math.max(3130, Math.floor(P.z)); z <= 3296; z += 8) pts.push([RUN.cx(z), z]); i = 0; }
      } else if (wp === 'dunes') { pts = []; for (let z = 10; z <= 296; z += 12) pts.push([TAT.pathX(z), z]); }
      if (wp === 'canyon') { pts = []; for (let z = 0; z <= 372; z += 10) pts.push([TAT.cx(z), z]); pts.push([96, 392]); }
      const foe = COMBAT.foes().filter((f) => Math.abs(f.y - P.y) < 4 && f.dist(P) < (f.isBoss ? 60 : 22)).sort((a, b) => a.dist(P) - b.dist(P))[0];
      let tx, tz, jump = false, act = false;
      if (foe) { tx = foe.x; tz = foe.z; if (foe.dist(P) < 2.5) act = true; }
      else { jump = pts.some((q) => q[2] === 'jump' && Math.hypot(q[0] - P.x, q[1] - P.z) < 1.2) && PLAYER.state === 'move'; let j = i; while (j < pts.length && Math.hypot(pts[j][0] - P.x, pts[j][1] - P.z) < 1.5) j++; i = Math.min(j, pts.length - 1); tx = pts[i][0]; tz = pts[i][1]; }
      // laser gates: wait if the next gate ahead is shut
      if (LEVEL.cur.gates) { const g = LEVEL.cur.gates.find((q) => q.z > P.z && q.z - P.z < 2.2); if (g && !g.open) { IN.keys.KeyW = false; for (let k = 0; k < 10; k++) MG.tick(1 / 60); return { idx: i, n: 10 }; } }
      CAM.yaw = Math.atan2(tx - P.x, tz - P.z);
      const d = Math.hypot(tx - P.x, tz - P.z);
      IN.keys.KeyW = !act && d > 0.6;
      if (jump) { IN.fireKey('Space', true); IN.fireKey('Space', false); for (let k = 0; k < 12; k++) MG.tick(1 / 60); IN.fireKey('Space', true); IN.fireKey('Space', false); }
      if (act) { if (foe.stunned) { IN.fireKey('KeyF', true); IN.fireKey('KeyF', false); } else { IN.fireMouse(0, true); IN.fireMouse(0, false); } }
      for (let k = 0; k < 8; k++) MG.tick(1 / 60);
      return { idx: i, n: 8 };
    }, [WP[s.lvl], idx]);
    idx = r.idx; frames += r.n || 8;
    if (process.env.SHOTS && Math.floor(frames / +process.env.SHOTS) !== Math.floor((frames - (r.n || 8)) / +process.env.SHOTS)) { await H.eval(() => { IN.keys.KeyW = false; }); await H.shot('pa_' + s.lvl + '_' + String(frames).padStart(6, '0')); }
    // stuck detection: nudge with a jump
    if (lastPos && Math.hypot(s.x - lastPos[0], s.z - lastPos[1]) < 0.05) { stuck++; if (stuck > 60) { await H.eval(() => { IN.fireKey('Space', true); IN.fireKey('Space', false); }); stuck = 0; log.push('nudge in ' + s.lvl + ' at ' + s.x.toFixed(1) + ',' + s.y.toFixed(1) + ',' + s.z.toFixed(1)); } } else stuck = 0;
    lastPos = [s.x, s.z];
  }
  console.log(log.join('\n'));
  console.log(JSON.stringify(await H.eval(() => ({ st: MG.state, lvl: LEVEL.cur && LEVEL.cur.id, pst: PLAYER.state, pos: PLAYER.a && [PLAYER.a.x.toFixed(1), PLAYER.a.y.toFixed(1), PLAYER.a.z.toFixed(1)], obj: MG.$('objD').textContent, foes: COMBAT.foes().length, err: MG.errors.slice(0, 3) }))));
};
