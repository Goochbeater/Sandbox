// World views: ?play=planet_test&nointro&world=<id>
module.exports = async (H) => {
  await H.step(20, 1 / 30);
  console.log('INFO', JSON.stringify(await H.eval(() => ({ world: MG.flags.world, calls: R.calls, tris: R.tris, err: MG.errors.slice(0, 4) }))));
  const views = [['start', [0, 2.2, -14], [0, 3, 10]], ['ruins', [-3, 3.5, 12], [2, 3, 40]], ['wide', [30, 22, -40], [0, 2, 30]], ['low', [10, 1.4, 4], [-20, 6, 30]], ['up', [0, 1.7, 20], [0, 40, 60]]];
  for (const [n, p, l] of views) {
    await H.eval(([p, l]) => { const y = PHY.hf ? PHY.hf(p[0], p[2]) || 0 : 0; R.camera.position.set(p[0], p[1] + y, p[2]); R.camera.lookAt(l[0], l[1] + y, l[2]); R.camera.fov = 55; R.camera.updateProjectionMatrix(); }, [p, l]);
    await H.pshot('w_' + (process.env.NAME || 'x') + '_' + n);
  }
  console.log('STATS', JSON.stringify(await H.eval(() => ({ calls: R.calls, tris: R.tris }))));
};
