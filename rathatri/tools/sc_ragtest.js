// ragdoll deaths: three guards killed by slash / slam / push; fixed side camera, frames every K steps
module.exports = async (H) => {
  await H.step(30);
  await H.eval(async () => { await CAST.need(['guard']); });
  await H.eval(() => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; if (e.inst.cloth) e.inst.cloth.setVisible(false); } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; if (b.root) b.root.visible = false; if (b.saber) b.saber.setVisible && b.saber.setVisible(false); }
    MG.god = true; PLAYER.state = 'cine'; const P = PLAYER.a; P.x = 0; P.z = 0; P.yaw = 0;
    MG.rg = [['slash', -1.6], ['slam', 0], ['push', 1.6]].map(([k, x]) => { const e = ENEMY.spawn('guard', x, 1.6, {}); e.passive = true; e.yaw = Math.PI; return [e, k]; });
    CAM.cine = { t: 0, dur: 99, hold: true, fov: 46, fn: () => { const e = MG.rg[+(MG.flags.who || 1)][0]; return { pos: V3(e.x + 2.6, 1.3, e.z + 1.2), look: V3(e.x, 0.5, e.z) }; } }; });
  await H.step(20);
  await H.eval(() => { for (const [e, k] of MG.rg) COMBAT.damage(e, 999, { src: PLAYER.a, kind: k, dir: V3(0, 0, 1), p: V3(e.x, e.y + 1.2, e.z), heavy: k !== 'slash', knock: k === 'push' }); });
  const K = +(process.env.K || 4); let n = 0;
  for (let i = 0; i < 100; i++) { await H.step(1); if (i % K === 0) await H.shot('r' + String(n++).padStart(2, '0'), 0.8); }
};
