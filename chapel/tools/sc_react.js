// one active guard takes two light hits (a1, a2) — close side camera to judge the hit reactions
module.exports = async (H) => {
  await H.step(30);
  await H.eval(async () => { await CAST.need(['guard']); });
  await H.eval(() => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; if (e.inst.cloth) e.inst.cloth.setVisible(false); } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; b.root.visible = false; if (b.saber) b.saber.setVisible && b.saber.setVisible(false); }
    MG.god = true; const P = PLAYER.a; P.x = 0; P.z = 0; P.yaw = 0; PLAYER.state = 'move'; if (P.inst.cape) CLOAK.wear(P, false);
    const e = ENEMY.spawn('guard', 0, 1.8, {}); e.hp = e.hpMax = 300; e.yaw = Math.PI; e.alert && e.alert(); MG.dummy = e;
    CAM.cine = { t: 0, dur: 99, hold: true, fov: 38, fn: () => ({ pos: V3(3.2, 1.35, 1.4), look: V3(0, 1.0, 1.3) }) }; });
  await H.step(6);
  let n = 0;
  for (let i = 0; i < 90; i++) {
    if (i === 0 || i === 16) await H.eval(() => { IN.fireMouse(0, true); IN.fireMouse(0, false); });
    await H.step(1);
    if (i % 3 === 0) { const tag = await H.eval(() => { const e = MG.dummy; return (e.act || '-') + ' ' + (e.actT || 0).toFixed(2) + ' W' + (e.inst.mo ? e.inst.mo.W.toFixed(2) : '-') + ' hp' + e.hp.toFixed(0); }); console.log(n, tag); await H.shot('r' + String(n++).padStart(2, '0'), 0.8); }
  }
};
