module.exports = async (H) => {
  await H.step(10);
  await H.eval(() => { R.setSun(new THREE.Vector3(0.35, 0.75, 0.9), 0xffffff, 2.4, 0xa0a8b8, 0x50484a, 1.1); R.G.bloom = 0.03; R.G.vol = 0; R.G.exposure = 2.0;
    MG.viewChar.root.visible = false; MG.viewSaber.group.visible = false;
    MG.cast.forEach((c, k) => { c.I.root.position.set((k - (MG.cast.length - 1) / 2) * 1.25, 0, 0); if (c.I.saber) c.I.saber.group.visible = false; if (c.I.prop) c.I.prop.visible = false; if (c.I.cloth) c.I.cloth.setVisible && c.I.cloth.setVisible(false); });
    MG.viewUpdate = () => { const c = R.camera; c.position.set(0, 1.2, +(MG.flags.camz || 4.6)); c.lookAt(0, +(MG.flags.ly || 0.95), 0); for (const k of MG.cast) { for (const b of k.I.bones) b.quaternion.identity(); k.I.root.updateMatrixWorld(true); } }; });
  await H.step(3); await H.shot('rest');
};
