// close side-cam fight: Maul (bot) vs FOES; shots every K steps
module.exports = async (H) => {
  await H.step(30);
  const foes = JSON.parse(process.env.FOES || '["guard"]');
  await H.eval(async (foes) => { await CAST.need(foes.map((t) => ENEMY.TYPES[t] ? ENEMY.TYPES[t].tpl : t).filter((n) => CAST.SPECS[n])); }, foes);
  await H.eval((foes) => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; b.root.visible = false; if (b.saber) b.saber.setVisible && b.saber.setVisible(false); } MG.god = true; PLAYER.state = 'move';
    const P = PLAYER.a; P.x = 0; P.z = 2; P.yaw = 0; foes.forEach((t, i) => { const e = ENEMY.spawn(t, (i - (foes.length - 1) / 2) * 1.6, 4.6 + i * 0.3); e.alert && e.alert(); });
    CAM.cine = { t: 0, dur: 999, hold: true, fov: 44, fn: () => { const f = COMBAT.foes()[0] || P; const mx = (P.x + f.x) / 2, mz = (P.z + f.z) / 2, dx = f.x - P.x, dz = f.z - P.z, L = Math.hypot(dx, dz) || 1; return { pos: V3(mx + dz / L * 4.2, 1.5, mz - dx / L * 4.2), look: V3(mx, 1.0, mz) }; } }; }, foes);
  let n = 0; const K = +(process.env.K || 2), NS = +(process.env.NS || 36), START = +(process.env.START || 10);
  for (let i = 0; i < START + NS * K; i++) {
    await H.eval((i) => { const P = PLAYER.a; const f = COMBAT.foes().sort((a, b) => a.dist(P) - b.dist(P))[0]; if (!f) { IN.keys.KeyW = false; return; }
      CAM.yaw = P.angTo(f); IN.keys.KeyW = P.dist(f) > 2.0;
      if (P.dist(f) <= 2.5 && i % 5 === 0) { IN.fireMouse(0, true); IN.fireMouse(0, false); } }, i);
    await H.step(1);
    if (i >= START && (i - START) % K === 0 && n < NS) { const tag = await H.eval(() => { const a = PLAYER.a, m = a.inst.mo; return (a.act || '-') + '_' + (a.actT || 0).toFixed(2) + '_W' + (m ? m.W.toFixed(2) : 'x') + '_F' + (m ? m.wFull.toFixed(2) : 'x') + '_py' + (m ? m.f.p.y.toFixed(2) : ''); }); console.log(n, tag); await H.shot('f' + String(n++).padStart(2, '0'), 0.8); }
  }
};
