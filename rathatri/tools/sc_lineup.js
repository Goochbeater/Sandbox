// in-game lighting lineup: spawn TYPES (enemy types or jedi:who) in a row facing the camera; full + face shots of each
module.exports = async (H) => {
  await H.step(30);
  const types = JSON.parse(process.env.TYPES), X = JSON.parse(process.env.AT || '[0,0,0]');
  await H.eval(async (types) => { const need = types.map((t) => t.startsWith('jedi:') ? t.slice(5) : (ENEMY.TYPES[t] ? ENEMY.TYPES[t].tpl : t)); await CAST.need(need.filter((n) => CAST.SPECS[n])); }, types);
  await H.eval((a) => { const [types, X] = a; for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; if (b.root) b.root.visible = false; if (b.saber) b.saber.setVisible && b.saber.setVisible(false); }
    const P = PLAYER.a; P.x = X[0] - 3; P.z = X[2] - 6; MG.line = [];
    types.forEach((t, i) => { const x = X[0] + (i - (types.length - 1) / 2) * 1.5, z = X[2]; let e;
      if (t.startsWith('jedi:')) { e = new Jedi(t.slice(5), { x, y: X[1], z, yaw: 0 }); e.passive = true; }
      else { e = ENEMY.spawn(t, x, z, { y: X[1] }); e.passive = true; }
      e.yaw = 0; e.stop && e.stop(); MG.line.push(e); }); }, [types, X]);
  await H.step(40);
  await H.eval(() => { PLAYER.state = 'cine'; for (const e of MG.line) { e.x = e.homeX !== undefined ? e.x : e.x; e.yaw = 0; } });
  let i = 0;
  const n = types.length;
  for (let k = -1; k < n; k++) {
    await H.eval((a) => { const [k, X, n] = a; const cx = k < 0 ? X[0] : MG.line[k].x, cz = k < 0 ? X[2] : MG.line[k].z, gy = k < 0 ? X[1] : MG.line[k].y;
      const far = k < 0 ? [0, 1.5, n * 1.25 + 2.5] : [0.5, 1.25, 2.6]; const lk = k < 0 ? 1.0 : 1.0;
      CAM.cine = { t: 0, dur: 99, hold: true, fov: 38, fn: () => ({ pos: V3(cx + far[0], gy + far[1], cz + far[2]), look: V3(cx, gy + lk, cz) }) }; }, [k, X, n]);
    await H.step(2); await H.shot('L' + (k + 1));
    if (k >= 0) { await H.eval((a) => { const [k] = a; const e = MG.line[k]; CAM.cine = { t: 0, dur: 99, hold: true, fov: 30, fn: () => ({ pos: V3(e.x + 0.35, e.y + 1.62 * (e.T && e.T.h || 1), e.z + 0.95), look: V3(e.x, e.y + 1.52 * (e.T && e.T.h || 1), e.z) }) }; }, [k]); await H.step(2); await H.shot('F' + (k + 1)); }
  }
};
