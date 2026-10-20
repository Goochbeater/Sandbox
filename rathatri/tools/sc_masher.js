// attack-only playtest through the real gameplay camera: no movement keys, no camera steering; logs kills/damage
module.exports = async (H) => {
  await H.step(30);
  const foes = JSON.parse(process.env.FOES || '["guard","guard","guard"]');
  await H.eval(async (foes) => { await CAST.need(foes.map((t) => t.startsWith('jedi:') ? t.slice(5) : ENEMY.TYPES[t] ? ENEMY.TYPES[t].tpl : t).filter((n) => CAST.SPECS[n])); }, foes);
  await H.eval((foes) => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; if (e.inst.cloth) e.inst.cloth.setVisible(false); } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; b.root.visible = false; if (b.saber) b.saber.setVisible && b.saber.setVisible(false); }
    const P = PLAYER.a; P.x = 0; P.z = 0; P.yaw = 0; CAM.yaw = 0; CAM.snap = true; PLAYER.state = 'move'; MG.god = !!MG.flags.god; MG.k0 = COMBAT.kills; MG.hp0 = P.hp;
    MG.mf = []; foes.forEach((t, i) => { const a = (i - (foes.length - 1) / 2) * 0.9, d = 5 + (i % 2) * 2; let e; if (t.startsWith('jedi:')) { e = new Jedi(t.slice(5), { x: Math.sin(a) * d, y: 0, z: Math.cos(a) * d, yaw: Math.PI }); HUD.setBoss(e, e.name, 'duel'); } else { e = ENEMY.spawn(t, Math.sin(a) * d, Math.cos(a) * d, {}); e.alert && e.alert(); } MG.mf.push(e); }); }, foes);
  let n = 0; const K = +(process.env.K || 3), NS = +(process.env.NS || 30), START = +(process.env.START || 10), RATE = +(process.env.RATE || 9);
  for (let i = 0; i < START + NS * K; i++) {
    if (i % RATE === 0) await H.eval(() => { IN.fireMouse(0, true); IN.fireMouse(0, false); });
    await H.step(1);
    if (i >= START && (i - START) % K === 0 && n < NS) await H.shot('m' + String(n++).padStart(2, '0'), 0.8);
  }
  console.log(JSON.stringify(await H.eval(() => ({ kills: COMBAT.kills - MG.k0, hpLost: (MG.hp0 - PLAYER.a.hp).toFixed(0), foes: MG.mf.map((e) => (e.who || e.D && e.D.name) + ' hp ' + e.hp.toFixed(0) + '/' + e.hpMax.toFixed(0) + ' guard ' + (e.guard !== undefined ? e.guard.toFixed(0) : '-') + ' ' + e.state), t: MG.t.toFixed(1) }))));
};
