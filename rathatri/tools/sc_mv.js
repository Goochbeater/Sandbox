module.exports = async (H) => {
  await H.step(30); await H.eval((m) => { window.__MV = m; }, process.env.MV || 'lunge');
  await H.eval(() => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; } const P = PLAYER.a; P.x = 0; P.z = 0; P.yaw = 0; PLAYER.state = 'attack'; P.play(window.__MV); window.__R = []; window.__p = null; });
  for (let i = 0; i < 50; i++) { await H.step(1); await H.eval(() => { const A = PLAYER.a, B = A.inst.bones, g = PLAYER.saber.group; const ax = new THREE.Vector3(0, 1, 0).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
    const q = [5, 6, 7, 8, 9, 10, 11, 12].map((k) => B[k].getWorldQuaternion(new THREE.Quaternion())); const p = window.__p; const d = p ? q.map((x, k) => Math.round(2 * Math.acos(Math.min(1, Math.abs(x.dot(p.q[k])))) * 57.3)) : [];
    window.__R.push([A.actT.toFixed(2), ax.toArray().map((v) => v.toFixed(2)).join(','), p ? Math.round(ax.angleTo(p.ax) * 57.3) : 0, d.join(' ')]); window.__p = { q, ax }; }); }
  const R = await H.eval(() => window.__R); for (const r of R) console.log('A5', r.join(' | '));
};
