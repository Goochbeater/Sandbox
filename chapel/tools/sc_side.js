// side-on follow cam of the player: idle, walk-in, sprint, stop; then lock-on strafe. SEQ like sc_move2
module.exports = async (H) => {
  await H.step(30);
  await H.eval(() => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; b.root.visible = false; }
    PLAYER.state = 'move'; const P = PLAYER.a; P.x = +(MG.flags.px || 0); P.z = +(MG.flags.pz || -4); P.yaw = 0; CAM.yaw = 0; CAM.snap = true;
    const side = +(MG.flags.side || 1);
    CAM.cine = { t: 0, dur: 999, hold: true, fov: 40, fn: () => ({ pos: V3(PLAYER.a.x + 3.4 * side, 1.25, PLAYER.a.z + 0.4), look: V3(PLAYER.a.x, 0.95, PLAYER.a.z) }) }; });
  const seq = JSON.parse(process.env.SEQ), K = +(process.env.K || 3); let n = 0, step = 0;
  for (const [keys, steps] of seq) {
    const ks = keys ? keys.split(',') : [];
    for (const k of ks) await H.eval((k) => IN.fireKey(k, true), k);
    for (let i = 0; i < steps; i++) { await H.eval(() => { CAM.yaw = 0; }); await H.step(1); if (step % K === 0) await H.shot('s' + String(n++).padStart(3, '0'), 0.8); step++; }
    for (const k of ks) await H.eval((k) => IN.fireKey(k, false), k);
  }
};
