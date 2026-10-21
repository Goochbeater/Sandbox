// lineup of Dxun beasts (passive) from the front and side. env: TYPES (JSON list, default all four)
module.exports = async (H) => {
  await H.step(20);
  const types = JSON.parse(process.env.TYPES || '["cannok","maalraa","boma","zakkeg"]');
  await H.eval((types) => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; e.root.visible = false; } PLAYER.state = 'cine'; PLAYER.a.root.visible = false; if (PLAYER.saber) PLAYER.saber.setVisible(false);
    MG.line = []; let x = -8; for (const t of types) { const D = ENEMY.TYPES[t]; const w = D.beast ? D.beast.r * 2.4 + 1.4 : 3; x += w * 0.5; const e = ENEMY.spawn(t, x, 6, { y: 0 }); e.passive = true; e.yaw = 0; e.x = x; MG.line.push(e); x += w * 0.5; } MG.lineW = x + 8; }, types);
  await H.step(25);
  for (const [k, yaw, d] of [['F', 0.5, 15], ['S', 1.5, 14]]) { await H.eval(([yaw, d]) => { const cx = MG.lineW / 2 - 8; CAM.cine = { t: 0, dur: 99, hold: true, fov: 42, fn: () => ({ pos: V3(cx + Math.sin(yaw) * d, 2.4, 6 + Math.cos(yaw) * d), look: V3(cx, 0.9, 6) }) }; }, [yaw, d]); await H.step(3); await H.shot('B' + k); }
};
