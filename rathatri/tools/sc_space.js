// Space flight smoke test: ?space=<id>&norender  — fly toward objectives with a simple autopilot, fire at targets, log objective progress
module.exports = async (H) => {
  const st = () => H.eval(() => ({ oi: SPACE.oi, obj: SPACE.obj && SPACE.obj.text, t: +SPACE.t.toFixed(1), hp: SPACE.P ? Math.round(SPACE.P.hp) : -1, sh: SPACE.P ? Math.round(SPACE.P.shield) : -1, ships: SPACE.ships.filter((s) => s.alive).length, kills: SPACE.kills, alert: Math.round(SPACE.alert || 0), done: SPACE.done, res: MG.spaceResult || null, err: MG.errors.slice(0, 3) }));
  await H.step(10, 1 / 30); console.log('START', JSON.stringify(await st()));
  if (process.env.SHOTS) await H.pshot('sp_start');
  for (let i = 0; i < 400; i++) {
    await H.eval(() => { const S = SPACE, P = S.P; if (!P || !P.alive) return; P.hp = Math.max(P.hp, P.hpMax * 0.5);   // keep the bot alive: this checks the mission logic, not the pilot
      const O = S.obj; let tgt = null;
      if (O && O.type === 'reach') tgt = new THREE.Vector3(O.at[0], O.at[1], O.at[2]);
      else { const f = S.ships.filter((s) => s.alive && !s.hidden && s.team === 'foe' && !s.dominated && (!O || !O.tag || s.tag === O.tag)); f.sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos)); if (f[0]) { tgt = f[0].pos.clone(); P.target = f[0]; } }
      IN.bot = [0, 0]; IN.keys.T_fire = false; IN.keys.T_brake = false; IN.keys.T_dominate = false;
      if (O && O.type === 'custom') IN.keys.T_brake = true;
      if (tgt) { const d = tgt.clone().sub(P.pos), wy = Math.atan2(d.x, d.z), wp = Math.atan2(d.y, Math.hypot(d.x, d.z)); const dy = wrapA(wy - P.yaw); IN.bot = [clamp(-dy * 2, -1, 1), clamp(-(wp - P.pitch) * 2, -1, 1)]; if (O && O.type !== 'reach' && Math.abs(dy) < 0.25) IN.keys.T_fire = true; }
      if (O && O.type === 'dominate') { IN.keys.T_dominate = true; IN.keys.T_fire = false; }
    });
    await H.step(15, 1 / 30);
    if (i % 20 === 0) console.log('T', JSON.stringify(await st()));
    if (process.env.SHOTS && i === 30) await H.pshot('sp_fight');
    const s = await st(); if (s.res || (s.done && s.res)) break;
  }
  console.log('END', JSON.stringify(await st()));
};
