// Nar Shaddaa level: views + stats. ?play=narshaddaa&nointro
module.exports = async (H) => {
  await H.step(30, 1 / 30);
  console.log('INFO', JSON.stringify(await H.eval(() => ({ tris: LEVEL.cur.N && LEVEL.cur.N.tris, crowd: NCROWD.list.length, lights: R.lights ? R.lights.length : -1, err: MG.errors.slice(0, 5) }))));
  await H.pshot('ns_start');
  const views = [['canyon', [0, 1.7, 97], [0, 8, 40]], ['street', [-12, 1.7, 70], [6, 4, 40]], ['plaza', [6, 3, 44], [0, 6, 18]], ['aerial', [-14, 30, 120], [0, 10, 40]], ['up', [3, 1.6, 60], [0, 60, 50]]];
  for (const [n, p, l] of views) {
    await H.eval(([p, l]) => { CAM.cine = null; const P = PLAYER.a; P.x = p[0]; P.z = p[2] - 2; MG.__v = [p, l]; }, [p, l]);
    await H.step(3, 1 / 30);
    await H.eval(([p, l]) => { R.camera.position.set(p[0], p[1], p[2]); R.camera.lookAt(l[0], l[1], l[2]); R.camera.fov = 55; R.camera.updateProjectionMatrix(); }, [p, l]);
    await H.pshot('ns_' + n);
  }
  const t0 = Date.now(); await H.step(20, 1 / 30); console.log('20 frames ms', Date.now() - t0);
};
