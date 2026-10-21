// Stage-I slave: no saber visible, fists combo damages foes. ?play=test_arena&nointro&hero=1
module.exports = async (H) => {
  await H.step(20, 1 / 30);
  const s0 = await H.eval(() => ({ stage: HERO.stage, hp: PLAYER.a.hp, hpMax: PLAYER.a.hpMax, fists: !!PLAYER.saber.fists, vis: PLAYER.saber.group.visible, skills: PLAYER.skills, t: PLAYER.a.T && PLAYER.a.T.name }));
  console.log('SPAWN', JSON.stringify(s0));
  await H.pshot('slave_idle');
  // walk the dummy up close and punch
  const r = await H.eval(async () => {
    const P = PLAYER.a, foes = COMBAT.foes(); const e = foes[0]; if (!e) return 'nofoe';
    e.x = P.x; e.z = P.z + 1.1; e.y = P.y; e.ai = null; e.think = () => {};
    P.yaw = Math.atan2(e.x - P.x, e.z - P.z);
    const hp0 = e.hp, log = [];
    for (let k = 0; k < 6; k++) {
      IN.buf.attack = MG.rt;
      for (let i = 0; i < 9; i++) { __mg.step(1, 1 / 30); if (i === 4) IN.buf.attack = MG.rt; }
      log.push([P.act && P.act.name, Math.round(e.hp)]);
    }
    return { hp0, hp1: e.hp, log, alive: e.alive };
  });
  console.log('PUNCH', JSON.stringify(r));
  await H.pshot('slave_punch');
};
