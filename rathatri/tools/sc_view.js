module.exports = async (H) => {
  const set = (yaw, dist, y) => H.eval((a) => { MG.viewYaw = a[0]; MG.viewDist = a[1]; MG.viewY = a[2]; }, [yaw, dist, y]);
  await H.step(30);
  console.log(JSON.stringify(await H.eval(() => __mg.info())));
  await set(0.35, 3.0, 1.0); await H.step(2); await H.shot('v_full');
  await set(0.3, 0.75, 1.62); await H.step(2); await H.shot('v_face');
  await set(2.6, 0.8, 1.62); await H.step(2); await H.shot('v_back');
  await set(1.2, 0.9, 1.62); await H.step(2); await H.shot('v_side');
  await set(0.6, 0.9, 1.0); await H.step(2); await H.shot('v_hands');
};
