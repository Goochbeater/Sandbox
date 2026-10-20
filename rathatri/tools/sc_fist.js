module.exports = async (H) => {
  await H.step(40);
  console.log('FIST', JSON.stringify(await H.eval(() => { const I = PLAYER.a.inst; let sk = null; I.root.traverse((o) => { if (o.isSkinnedMesh && o.skeleton && o.skeleton.bones.length > 40 && !sk) sk = o.skeleton; });
    const by = {}; for (const b of sk.bones) by[b.name] = b; const pr = I.prop, ax = new THREE.Vector3(0, 1, 0).applyQuaternion(pr.getWorldQuaternion(new THREE.Quaternion())), pc = pr.getWorldPosition(new THREE.Vector3()), sc = I.scale || 1;
    const res = {};
    for (const [s, hb, off] of [['l', 8, I.LD.gripOffL], ['r', 12, I.LD.gripOffR]]) {
      const c = new THREE.Vector3(); let n = 0; for (const f of ['index', 'middle', 'ring', 'pinky']) for (const k of ['01', '02', '03', '04_leaf']) { const b = by['q_' + f + '_' + k + '_' + s]; if (b) { c.add(b.getWorldPosition(new THREE.Vector3())); n++; } } c.multiplyScalar(1 / n);
      const d = c.clone().sub(pc), along = d.dot(ax), perp = d.addScaledVector(ax, -along).length();
      const B = I.bones[hb], bp = B.getWorldPosition(new THREE.Vector3()), bq = B.getWorldQuaternion(new THREE.Quaternion()); const loc = c.clone().sub(bp).applyQuaternion(bq.clone().invert()).multiplyScalar(1 / sc);
      const cur = off.clone(); const gp = off.clone().applyQuaternion(bq).multiplyScalar(sc).add(bp).sub(pc); const galong = gp.dot(ax), gperp = gp.addScaledVector(ax, -galong).length(); const rh = by['q_hand_' + s].getWorldPosition(new THREE.Vector3()); res[s] = { gripPtToAxis: gperp.toFixed(3), renderVsLogicalWrist: rh.distanceTo(bp).toFixed(3), fistToAxis: perp.toFixed(3), measuredLocal: loc.toArray().map((v) => +v.toFixed(3)), gripOff: cur.toArray().map((v) => +v.toFixed(3)) }; }
    return res; })));
};
