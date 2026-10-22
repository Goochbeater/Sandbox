module.exports = async (H) => {
  await H.step(40);
  await H.eval(() => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; if (b.root) b.root.visible = false; } PLAYER.state = 'cine'; });
  let n = 0;
  for (const a of JSON.parse(process.env.ANGS || '[0,0.9,-0.9,1.8,-1.8]')) {
    await H.eval((a) => { const P = PLAYER.a; CAM.cine = { t: 0, dur: 99, hold: true, fov: 30, fn: () => { const c = PLAYER.saber.group.getWorldPosition(new THREE.Vector3()); const y = P.yaw + a; return { pos: V3(c.x + Math.sin(y) * 1.1, c.y + 0.25, c.z + Math.cos(y) * 1.1), look: c }; } }; }, a);
    await H.step(3); await H.shot('h' + n++);
  }
};
