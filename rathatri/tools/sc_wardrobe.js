// lineup: WHOS = cast names, enemy types or "jedi:<who>" or "maul"; passive; front + back shots in level light
module.exports = async (H) => {
  await H.step(30);
  const list = JSON.parse(process.env.WHOS), SP = +(process.env.SP || 1.15);
  await H.eval(async (list) => { for (const t of list) { const n = t.startsWith('jedi:') ? t.slice(5) : (ENEMY.TYPES[t] ? ENEMY.TYPES[t].tpl : t); if (CAST.SPECS[n]) await CAST.need([n]); } }, list);
  await H.eval((a) => { const [list, SP] = a; for (const e of ENEMY.list.slice()) { e.alive = false; e.hidden = true; if (e.root) e.root.visible = false; if (e.inst.cloth) e.inst.cloth.setVisible(false); } for (const b of BOSS.list.slice()) { b.alive = false; b.hidden = true; if (b.root) b.root.visible = false; if (b.saber) b.saber.setVisible && b.saber.setVisible(false); if (b.inst.cloth) b.inst.cloth.setVisible(false); }
    PLAYER.state = 'cine'; MG.line = [];
    list.forEach((t, i) => { const x = (i - (list.length - 1) / 2) * SP, z = 4; let e;
      if (t.startsWith('jedi:')) { e = new Jedi(t.slice(5), { x, y: 0, z, yaw: 0 }); e.passive = true; } else if (t === 'maul') { e = PLAYER.a; e.x = x; e.z = z; if (MG.flags.nocloak && PLAYER.a.inst.cape) CLOAK.wear(PLAYER.a, false); } else { if (!ENEMY.TYPES[t]) ENEMY.TYPES[t] = Object.assign({}, ENEMY.TYPES.guard, { tpl: t, name: t });   // any cast name: stands in as an unarmed-behaviour guard
        e = ENEMY.spawn(t, x, z, {}); e.passive = true; }
      e.yaw = 0; MG.line.push(e); }); }, [list, SP]);
  await H.step(30);
  const W = list.length * SP;
  for (const [k, yaw] of [['F', 0], ['B', Math.PI]]) { await H.eval((a) => { const [yaw, W] = a; for (const e of MG.line) e.yaw = 0; const d = W * 0.82 + 0.8; CAM.cine = { t: 0, dur: 99, hold: true, fov: 38, fn: () => ({ pos: V3(Math.sin(yaw) * d, 1.05, 4 + Math.cos(yaw) * d), look: V3(0, 0.95, 4) }) }; }, [yaw, W]); await H.step(3); await H.shot('W' + k); }
};
