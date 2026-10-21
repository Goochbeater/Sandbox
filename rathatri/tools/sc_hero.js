// Hero close-ups: ?play=test_arena&nointro&hero=N  -> full body front, 3/4, face
module.exports = async (H) => {
  await H.step(10, 1 / 30);
  await H.eval(() => { for (const e of COMBAT.foes()) { e.x += 40; e.alive = false; e.I && (e.I.root.visible = false); } });
  await H.step(30, 1 / 30);
  const views = [['full', 0, 2.6, 1.0, 0.95], ['q34', 0.8, 2.0, 1.2, 1.1], ['face', 0.25, 0.62, 1.55, 1.52], ['back', Math.PI, 2.4, 1.1, 1.0]];
  for (const [n, a, d, y, ly] of views) {
    await H.eval(([a, d, y, ly]) => { const P = PLAYER.a, f = P.yaw + a; R.camera.position.set(P.x + Math.sin(f) * d, P.y + y, P.z + Math.cos(f) * d); R.camera.lookAt(P.x, P.y + ly, P.z); R.camera.fov = 40; R.camera.updateProjectionMatrix(); }, [a, d, y, ly]);
    await H.pshot((process.env.NAME || 'hero') + '_' + n);
  }
};
