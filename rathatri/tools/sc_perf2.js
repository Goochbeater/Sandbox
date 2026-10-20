// what costs the frame? fixed low res, then toggle features one at a time (real-time rAF, 3 s each)
module.exports = async (H) => {
  await H.step(30); await H.eval((z) => { window.__Z = z; }, +(process.env.Z || 0));
  if (process.env.RIDE) await H.eval(() => { const b = RIDE.bike; if (!RIDE.on) { PLAYER.a.x = b.position.x + 1; PLAYER.a.z = b.position.z; RIDE.mount(); } MG.god = true; const z = +(window.__Z || 0); if (z) { const x = RUN.cx(z) + RUN.line(z); b.position.set(x, RUN.h(x, z) + RIDE.h, z); RIDE.yaw = Math.atan2(RUN.cx(z + 12) - RUN.cx(z - 12), 24); CAM.yaw = RIDE.yaw; CAM.snap = true; } RIDE.spd = 0; RIDE.vx = RIDE.vz = 0; });
  await H.eval((s) => { R.dynScale = s; R.applyScale(); }, +(process.env.SC || 0.55));
  const meas = async (lab, on, off) => { const r = await H.eval(async (on) => { if (on) (0, eval)(on); MG.manual = false; MG._last = 0; await new Promise((res) => setTimeout(res, 800)); const f0 = MG.frame, t0 = performance.now(); await new Promise((res) => setTimeout(res, 3000)); const fr = MG.frame - f0, s = (performance.now() - t0) / 1000; MG.manual = true; return { fps: (fr / s).toFixed(1), tris: R.tris, calls: R.calls }; }, on);
    console.log('P', lab.padEnd(14), JSON.stringify(r)); if (off) await H.eval((off) => (0, eval)(off), off); };
  await meas('base');
  await meas('far700', 'window._f = R.camera.far; R.camera.far = 700; R.camera.updateProjectionMatrix();', 'R.camera.far = window._f; R.camera.updateProjectionMatrix();');
  await meas('far450', 'window._f = R.camera.far; R.camera.far = 450; R.camera.updateProjectionMatrix();', 'R.camera.far = window._f; R.camera.updateProjectionMatrix();');
  await meas('noInst', 'window._ii = []; R.scene.traverse((o) => { if (o.isInstancedMesh && o.visible) { o.visible = false; window._ii.push(o); } });', 'for (const o of window._ii) o.visible = true;');
  await meas('noRocks', 'window._rk = []; R.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.visible && o.material && o.material.userData && o.material.userData.tscale === 6) { o.visible = false; window._rk.push(o); } });', 'for (const o of window._rk) o.visible = true;');
};
