// full-body front + back of several characters (WHO list), one pair each
module.exports = async (H) => {
  await H.step(30);
  const list = JSON.parse(process.env.WHOS);
  await H.eval(async (list) => { for (const t of list) { const n = t.startsWith('jedi:') ? t.slice(5) : (ENEMY.TYPES[t] ? ENEMY.TYPES[t].tpl : t); if (CAST.SPECS[n]) await CAST.need([n]); } }, list);
  await H.eval(() => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; if (b.root) b.root.visible = false; if (b.saber) b.saber.setVisible && b.saber.setVisible(false); } PLAYER.state = 'cine'; const P = PLAYER.a; P.x = 30; P.z = 30; });
  let i = 0;
  for (const t of list) {
    await H.eval((t) => { if (MG.look && MG.look !== PLAYER.a) { MG.look.alive = false; MG.look.hidden = true; MG.look.root.visible = false; if (MG.look.saber) MG.look.saber.setVisible && MG.look.saber.setVisible(false); }
      PLAYER.a.x = 30; PLAYER.a.z = 30; let e; if (t.startsWith('jedi:')) { e = new Jedi(t.slice(5), { x: 0, y: 0, z: 4, yaw: 0 }); e.passive = true; } else if (t === 'maul') { e = PLAYER.a; e.x = 0; e.z = 4; e.yaw = 0; } else { e = ENEMY.spawn(t, 0, 4, {}); e.passive = true; } e.yaw = 0; MG.look = e; }, t);
    await H.step(24);
    for (const v of [[0.35, 2.7, 1.1, 0.95], [2.9, 2.7, 1.1, 0.95]]) { await H.eval((v) => { const e = MG.look; e.yaw = 0; CAM.cine = { t: 0, dur: 99, hold: true, fov: 38, fn: () => ({ pos: V3(e.x + Math.sin(v[0]) * v[1], e.y + v[2], e.z + Math.cos(v[0]) * v[1]), look: V3(e.x, e.y + v[3], e.z) }) }; }, v); await H.step(3); await H.shot('c' + String(i++).padStart(2, '0')); }
  }
};
