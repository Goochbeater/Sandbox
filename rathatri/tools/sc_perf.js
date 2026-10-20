// real-time perf: hand the loop back to rAF for a few seconds (riding if RIDE=1) and count frames
module.exports = async (H) => {
  await H.step(30); await H.eval((d, pt) => { window.__DYN = d; window.__PT = pt; }, !!process.env.DYN, +(process.env.PT || 6000));
  if (process.env.RIDE) await H.eval(() => { const b = RIDE.bike; if (!RIDE.on) { PLAYER.a.x = b.position.x + 1; PLAYER.a.z = b.position.z; RIDE.mount(); } MG.god = true; RIDE.spd = 50; IN.keys.KeyW = true; });
  const r = await H.eval(async () => { if (window.__DYN) MG.headless = false; MG.manual = false; MG._last = 0; const f0 = MG.frame, t0 = performance.now(); await new Promise((res) => setTimeout(res, +(window.__PT || 6000))); const fr = MG.frame - f0, s = (performance.now() - t0) / 1000;
    MG.manual = true; return { fps: (fr / s).toFixed(1), dyn: R.dynScale && R.dynScale.toFixed(2), tris: R.tris, calls: R.calls, w: R.renderer.domElement.width, h: R.renderer.domElement.height, z: RIDE.bike ? RIDE.bike.position.z.toFixed(0) : '' }; });
  console.log('PERF', JSON.stringify(r));
};
