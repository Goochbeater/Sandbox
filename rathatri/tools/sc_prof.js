// CPU profile while riding: wrap the big per-frame functions and report mean ms/frame each
module.exports = async (H) => {
  await H.step(30);
  if (!process.env.NORIDE) await H.eval(() => { const b = RIDE.bike; if (!RIDE.on) { PLAYER.a.x = b.position.x + 1; PLAYER.a.z = b.position.z; RIDE.mount(); } MG.god = true; RIDE.spd = 40; IN.keys.KeyW = true; });
  await H.eval((s) => { MG.god = true; R.dynScale = s; R.applyScale(); }, +(process.env.SC || 0.55));
  const r = await H.eval(async () => {
    const T = {}, wrap = (obj, k, lab) => { const f = obj[k]; if (!f) return; obj[k] = function (...a) { const t0 = performance.now(); const r = f.apply(this, a); T[lab] = (T[lab] || 0) + performance.now() - t0; return r; }; };
    wrap(MG, 'frameUpdate', 'frameUpdate'); wrap(PLAYER, 'update', 'player'); wrap(ENEMY, 'update', 'enemy'); wrap(COMBAT, 'update', 'combat'); if (BOSS) wrap(BOSS, 'update', 'boss'); wrap(CAM, 'update', 'cam'); wrap(R, 'updateShadow', 'shadowUpd'); wrap(HUD, 'update', 'hud'); wrap(MG, 'runTimers', 'timers'); wrap(IN, 'poll', 'inpoll'); wrap(R, 'render', 'render'); wrap(LEVEL, 'update', 'level'); wrap(FX, 'update', 'fx'); wrap(PLAYER.states, 'ride', 'ride'); for (const e of ENEMY.list.concat(BOSS.list || [])) { if (e.inst && e.inst.cloth) wrap(e.inst.cloth, 'step', 'foe.cloth'); for (const k of ['animate', 'pose3D', 'think', 'update']) if (e[k]) { const f = e[k].bind(e); e[k] = (...a) => { const t0 = performance.now(); const r = f(...a); T['foe.' + k] = (T['foe.' + k] || 0) + performance.now() - t0; return r; }; } }
    if (typeof CLOTH !== 'undefined') for (const k of Object.keys(CLOTH)) if (typeof CLOTH[k] === 'function' && /step|update|sim/i.test(k)) wrap(CLOTH, k, 'cloth.' + k);
    const L = LEVEL.cur; L.updates = L.updates.map((f, i) => function (...a) { const t0 = performance.now(); const r = f.apply(this, a); T['L' + i] = (T['L' + i] || 0) + performance.now() - t0; return r; });
    const A = PLAYER.a; for (const k of ['animate', 'pose3D', 'physics']) if (A[k]) { const f = A[k].bind(A); A[k] = (...a) => { const t0 = performance.now(); const r = f(...a); T['maul.' + k] = (T['maul.' + k] || 0) + performance.now() - t0; return r; }; }
    const I = A.inst; if (I.cloth) wrap(I.cloth, 'step', 'maul.cloth'); if (I.cape) wrap(I.cape, 'step', 'maul.cape'); wrap(PLAYER.saber, 'update', 'saber.update'); wrap(PLAYER.saber, 'sampleTrails', 'saber.trails'); wrap(PLAYER, 'hitWindows', 'hitWin');
    if (typeof ANIM !== 'undefined') { wrap(ANIM, 'apply', 'ANIM.apply'); wrap(ANIM, 'sample', 'ANIM.sample'); } if (typeof MOCAP !== 'undefined') for (const k of ['trunk', 'legs', 'arms', 'propFollow', 'apply', 'drive']) wrap(MOCAP, k, 'MOCAP.' + k); if (typeof QB !== 'undefined') wrap(QB, 'drive', 'QB.drive'); if (typeof RAG !== 'undefined') wrap(RAG, 'update', 'RAG.update');
    MG.manual = false; MG._last = 0; await new Promise((res) => setTimeout(res, 800)); for (const k in T) T[k] = 0;
    const f0 = MG.frame, t0 = performance.now(); await new Promise((res) => setTimeout(res, 4000)); const n = MG.frame - f0, s = (performance.now() - t0) / 1000; MG.manual = true;
    const out = { fps: (n / s).toFixed(1), z: RIDE.bike ? RIDE.bike.position.z.toFixed(0) : '' }; for (const k of Object.keys(T).sort((a, b) => T[b] - T[a])) if (T[k] / n > 0.05) out[k] = (T[k] / n).toFixed(2); return out; });
  console.log('PROF', JSON.stringify(r));
};
