// a level as played: walk toward foes, attack (attack-only masher + approach), page shots with HUD at intervals
module.exports = async (H) => {
  await H.step(30);
  await H.eval(() => { MG.god = true; });
  let n = 0; const K = +(process.env.K || 90), NS = +(process.env.NS || 5);
  for (let i = 0; i < NS * K; i++) {
    await H.eval((i) => { const P = PLAYER.a; if (PLAYER.state === 'cine') { IN.keys.KeyW = false; return; } const f = COMBAT.foes().filter((e) => !e.hidden).sort((a, b) => a.dist(P) - b.dist(P))[0];
      if (f && P.dist(f) > 6) { CAM.yaw = dampA(CAM.yaw, P.angTo(f), 2.5, 1 / 60); IN.keys.KeyW = true; } else IN.keys.KeyW = false; if (f && P.dist(f) < 9 && i % 9 === 0) { IN.fireMouse(0, true); IN.fireMouse(0, false); } }, i);
    await H.step(1);
    if (i % K === K - 1) await H.pshot('v' + String(n++).padStart(2, '0'));
  }
};
