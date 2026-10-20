// play mocap clip segments on Maul through the real action path; side cam. CLIPS='[["Sword_Regular_A",0,0.43],...]' MODE=full STEP=0.05
module.exports = async (H) => {
  await H.step(30);
  await H.eval(() => { for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; b.root.visible = false; }
    PLAYER.state = 'cine'; const P = PLAYER.a; P.x = 0; P.z = -4; P.yaw = 0; P.vx = P.vz = 0; P.speed = 0; const ang = +(MG.flags.cang || 1.2), d = +(MG.flags.cd || 3.6);
    CAM.cine = { t: 0, dur: 999, hold: true, fov: 42, fn: () => ({ pos: V3(PLAYER.a.x + Math.sin(ang) * d, 1.3, PLAYER.a.z + Math.cos(ang) * d), look: V3(PLAYER.a.x, 1.0, PLAYER.a.z) }) }; });
  const clips = JSON.parse(process.env.CLIPS), mode = process.env.MODE || 'full', st = +(process.env.STEP || 0.066); let n = 0;
  for (const [c, t0, t1, th] of clips) {
    const dur = t1 - t0;
    await H.eval((c, t0, t1, mode, th) => { const P = PLAYER.a; MOV.maul.__t = { dur: t1 - t0, keys: MOV.maul.guard.keys, mo: { seq: [[c, t0, t1, t1 - t0]], mode, twoHand: th || 0 } }; ANIM.compile(MOV.maul.__t, ANIM.basePose); P.play('__t', { fade: 0.02 }); P.actSpeed = 0; P.actT = 0; }, c, t0, t1, mode, th || 0);
    await H.step(3);
    for (let t = 0; t <= dur + 1e-4; t += st) { await H.eval((t) => { PLAYER.a.actT = t; }, t); await H.step(1); await H.shot('c' + String(n++).padStart(3, '0'), 0.8); }
  }
};
