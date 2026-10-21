// headless: each beast type vs a god-mode hero; checks movement, attacks landing, damage taken, death, no errors
module.exports = async (H) => {
  await H.step(10);
  const types = JSON.parse(process.env.TYPES || '["cannok","maalraa","boma","zakkeg"]');
  for (const t of types) {
    const r = await H.eval((t) => {
      for (const e of ENEMY.list) { e.alive = false; e.hidden = true; e.root.visible = false; }
      const P = PLAYER.a; P.x = 0; P.z = 0; P.hp = P.hpMax; MG.god = false; const e = ENEMY.spawn(t, 0, 9, { alert: true, grace: 0.3 }); const x0 = e.x, z0 = e.z; let hurt = 0, minD = 99, steps = 0, swings = 0;
      const hp0 = P.hp; for (let k = 0; k < 900; k++) { MG.tick(1 / 60); if (P.hp < P.hpMax * 0.5) P.hp = P.hpMax, hurt++; minD = Math.min(minD, e.dist(P)); if (e.atk) swings++; for (const lg of e.legs) if (lg.sw) steps++; }
      const moved = Math.hypot(e.x - x0, e.z - z0); const hit = P.hp < hp0 || hurt > 0;
      // the hero now kills it with saber hits
      let k2 = 0; while (e.alive && k2 < 400) { COMBAT.damage(e, 40, { src: P, kind: 'slash', dir: V3(0, 0, 1) }); for (let i = 0; i < 4; i++) MG.tick(1 / 60); k2++; }
      for (let i = 0; i < 90; i++) MG.tick(1 / 60);
      return { t, moved: +moved.toFixed(1), minD: +minD.toFixed(1), playerHit: hit, swingFrames: swings, stepFrames: steps, dead: !e.alive, errors: MG.errors.slice(0, 3) };
    }, t);
    console.log('FIGHT', JSON.stringify(r));
  }
};
