module.exports = async (H) => {
  await H.step(10);
  await H.eval(() => { const S = MG.viewSaber; S.group.visible = false; for (const L of S.lights) L.i = 0;
    R.setSun(new THREE.Vector3(0.4, 0.8, 0.9), 0xffffff, 2.6, 0x9aa4b8, 0x40383a, 1.0); R.G.bloom = 0.03; R.G.exposure = 2.4; R.G.vol = 0;
    const M = MG.viewChar; MG.viewUpdate = (dt) => { const c = R.camera; c.position.set(Math.sin(MG.viewYaw) * MG.viewDist, MG.viewY + 0.1, Math.cos(MG.viewYaw) * MG.viewDist); c.lookAt(0, MG.viewY, 0);
      if (MG.restPose) { for (const b of M.bones) b.quaternion.identity(); M.root.updateMatrixWorld(true); } }; MG.restPose = true; });
  let i = 0;
  for (const [yaw, d, y] of JSON.parse(process.env.TV || '[[0,2.6,1.1],[1.2,2.6,1.1],[0.3,1.1,1.3]]')) { await H.eval((a) => { MG.viewYaw = a[0]; MG.viewDist = a[1]; MG.viewY = a[2]; }, [yaw, d, y]); await H.step(3); await H.shot('r' + (i++)); }
  console.log(JSON.stringify(await H.eval(() => { const M = MG.viewChar; const out = []; M.root.traverse((o) => { if (o.isMesh) out.push([o.type, o.geometry.attributes.position.count, o.visible, o.material && (o.material.name || o.material.type)]); }); return out; })));
};
