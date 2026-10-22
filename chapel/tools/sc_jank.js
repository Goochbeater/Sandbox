// jank meter: masher vs guards; per frame, the max bone rotation change (deg) + root jump, logged with act transitions;
// and click -> swing latency (frames until a new attack act starts)
module.exports = async (H) => {
  await H.step(30);
  await H.eval(async () => { await CAST.need(['guard']); for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; if (e.inst.cloth) e.inst.cloth.setVisible(false); } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; if (b.root) b.root.visible = false; }
    const P = PLAYER.a; P.x = 0; P.z = 0; P.yaw = 0; CAM.yaw = 0; CAM.snap = true; PLAYER.state = 'move'; MG.god = true;
    for (const [x, z] of [[-1, 3.5], [1.2, 4], [0, 6]]) { const e = ENEMY.spawn('guard', x, z, {}); e.alert && e.alert(); }
    window.__J = { prev: null, log: [], clicks: [], lat: [] }; });
  const RATE = +(process.env.RATE || 9);
  for (let i = 0; i < +(process.env.N || 420); i++) {
    if (i % RATE === 0) await H.eval((i) => { IN.fireMouse(0, true); IN.fireMouse(0, false); window.__J.clicks.push({ i, act0: PLAYER.a.act, t0: PLAYER.a.actT }); }, i);
    await H.step(1);
    await H.eval((i) => { const J = window.__J, A = PLAYER.a, bones = A.inst.bones || A.inst.skel && A.inst.skel.bones; if (!bones) return;
      const q = bones.map((b) => b.getWorldQuaternion(new THREE.Quaternion())); const root = new THREE.Vector3(A.x, A.y, A.z);
      if (J.prev) { let mx = 0, mb = -1; for (let k = 0; k < q.length && k < 22; k++) { const d = 2 * Math.acos(Math.min(1, Math.abs(q[k].dot(J.prev.q[k])))) * 57.3; if (d > mx) { mx = d; mb = k; } }
        J.log.push({ i, d: +mx.toFixed(1), b: mb, act: A.act, pact: J.prev.act, st: PLAYER.state, rj: +root.distanceTo(J.prev.root).toFixed(3), yaw: +(wrapA(A.yaw - J.prev.yaw) * 57.3).toFixed(1) }); }
      for (const c of J.clicks) if (c.lat === undefined && A.act !== c.act0 && /^a\d|lunge|heavy/.test(A.act || '')) c.lat = i - c.i;
      J.prev = { q, act: A.act, root, yaw: A.yaw }; }, i);
  }
  const r = await H.eval(() => { const J = window.__J, L = J.log; const sp = L.filter((e) => e.d > 20 || e.rj > 0.25 || Math.abs(e.yaw) > 25);
    const lat = J.clicks.map((c) => c.lat).filter((x) => x !== undefined); const trans = {}; for (const e of L) if (e.act !== e.pact) { const k = e.pact + '>' + e.act; trans[k] = Math.max(trans[k] || 0, e.d); }
    return { frames: L.length, spikes: sp.length, worst: sp.sort((a, b) => b.d - a.d).slice(0, 14), trans, clicks: J.clicks.length, swings: lat.length, latAvg: (lat.reduce((a, b) => a + b, 0) / Math.max(1, lat.length)).toFixed(1), kills: COMBAT.kills }; });
  console.log('JANK', JSON.stringify(r));
};
