// spawn one character (enemy type or jedi:who) at AT and shoot VIEWS=[[yaw,dist,height,lookY,fov],...]
module.exports = async (H) => {
  await H.step(30);
  const t = process.env.WHO, X = JSON.parse(process.env.AT || '[0,0,4]');
  await H.eval(async (t) => { const n = t.startsWith('jedi:') ? t.slice(5) : (ENEMY.TYPES[t] ? ENEMY.TYPES[t].tpl : t); if (CAST.SPECS[n]) await CAST.need([n]); }, t);
  await H.eval((a) => { const [t, X] = a; for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; if (b.root) b.root.visible = false; if (b.saber) b.saber.setVisible && b.saber.setVisible(false); }
    const P = PLAYER.a; P.x = X[0] + 4; P.z = X[2] - 5; let e; if (t.startsWith('jedi:')) { e = new Jedi(t.slice(5), { x: X[0], y: X[1], z: X[2], yaw: 0 }); e.passive = true; } else if (t === 'maul') { e = P; P.x = X[0]; P.z = X[2]; P.yaw = 0; } else { e = ENEMY.spawn(t, X[0], X[2], { y: X[1] }); e.passive = true; } e.yaw = 0; MG.look = e; PLAYER.state = 'cine'; }, [t, X]);
  await H.step(30);
  const V = JSON.parse(process.env.VIEWS || '[[0.4,2.6,1.2,1.0,40]]'); let i = 0;
  for (const v of V) { await H.eval((v) => { const e = MG.look; e.yaw = 0; CAM.cine = { t: 0, dur: 99, hold: true, fov: v[4] || 40, fn: () => ({ pos: V3(e.x + Math.sin(v[0]) * v[1], e.y + v[2], e.z + Math.cos(v[0]) * v[1]), look: V3(e.x, e.y + v[3], e.z) }) }; }, v); await H.step(3); await H.shot('o' + (i++)); }
};
