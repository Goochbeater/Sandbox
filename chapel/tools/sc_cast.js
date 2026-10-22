module.exports = async (H) => {
  await H.step(30);
  const set = (yaw, dist, y) => H.eval((a) => { MG.viewYaw = a[0]; MG.viewDist = a[1]; MG.viewY = a[2]; }, [yaw, dist, y]);
  await set(0.0, 5.2, 1.0); await H.step(2); await H.shot('c_line');
  const n = await H.eval(() => MG.cast.length);
  for (let i = 0; i < n; i++) {
    await H.eval((i) => { const c = MG.cast[i]; MG.viewFocus = c.I.root.position; }, i);
    await H.eval((i) => { const c = MG.cast[i], p = c.I.root.position; R.camera.position.set(p.x + 0.25, 1.65, p.z + 0.75); R.camera.lookAt(p.x, 1.62, p.z); MG.viewUpdate = ((f) => (dt) => { f(dt); R.camera.position.set(p.x + 0.25, 1.62, p.z + 0.8); R.camera.lookAt(p.x, 1.6, p.z); })(MG.viewUpdate); }, i);
    await H.step(2); await H.shot('c_face' + i);
  }
  console.log(JSON.stringify(await H.eval(() => MG.cast.map((c) => [c.n, c.I.T.parts.map((p) => p.name + ':' + p.geo.attributes.position.count)]))));
};
