// Nar Shaddaa mission flow, logic only: ?play=narshaddaa&nointro&norender   env PICK=A|B
module.exports = async (H) => {
  const st = () => H.eval(() => { const L = LEVEL.cur, S = L.st; return { tail: S.tail, notice: +S.notice.toFixed(1), wp: S.wp, auction: S.auction, ambush: S.ambush, choice: S.choice, cine: !!CINE.cur, foes: COMBAT.foes().filter((e) => e.alive).length, lift: !!L.lifting, obj: HUD.el.objD.textContent, art: SAVE.d.artifacts.slice(), heat: Math.round(HEAT.val), why: (document.querySelector('#nsTail em') || {}).textContent, pst: PLAYER.state, pact: PLAYER.a.act, sheathed: HERO.sheathed, err: MG.errors.slice(0, 3) }; });
  await H.step(20, 1 / 30);
  await H.eval(() => { const P = PLAYER.a; P.x = 11; P.z = 106; COMBAT.damage = ((d) => function (t, n, o) { if (t === PLAYER.a) return; return d.apply(this, arguments); })(COMBAT.damage); });
  await H.eval(() => NSL.payFee(LEVEL.cur)); await H.step(330, 1 / 30); console.log('FEE', JSON.stringify(await st()));
  await H.eval(() => NSL.meetFixer(LEVEL.cur)); for (let i = 0; i < 40; i++) { await H.step(30, 1 / 30); if ((await st()).tail === 1) break; } console.log('MET', JSON.stringify(await st())); if (process.env.SHOTS) await H.pshot('flow_met');
  // follow at 7 m behind the fixer
  for (let i = 0; i < 120; i++) {
    await H.eval(() => { const L = LEVEL.cur, F = L.fixer, P = PLAYER.a, w = NSL.FIXPATH[Math.min(L.st.wp, NSL.FIXPATH.length - 1)], dx = w[0] - F.x, dz = w[1] - F.z, dl = Math.hypot(dx, dz) || 1; const tx = F.x - dx / dl * 9, tz = F.z - dz / dl * 9; P.x += (tx - P.x) * 0.25; P.z += (tz - P.z) * 0.25; P.yaw = F.yaw; });
    await H.step(15, 1 / 30); const s = await st(); if (i % 30 === 0) console.log('TAIL', JSON.stringify(s)); if (process.env.SHOTS && i === 40) await H.pshot('flow_tail'); if (s.tail !== 1) break;
  }
  console.log('ARRIVED', JSON.stringify(await st()));
  await H.eval(() => { const P = PLAYER.a; P.x = 1.2; P.z = 34.4; }); await H.step(20, 1 / 30);
  for (let i = 0; i < 200; i++) { await H.step(15, 1 / 30); if (process.env.SHOTS && (i === 8 || i === 40 || i === 70)) await H.pshot('flow_cine' + i); const ch = await H.eval((k) => { const b = document.querySelectorAll('#cineChoice .cb'); if (b.length) { b[k === 'B' ? 1 : 0].click(); return true; } return false; }, process.env.PICK || 'A'); if (ch) { console.log('PICKED'); break; } }
  await H.step(60, 1 / 30); if (process.env.SHOTS) await H.pshot('flow_ambush'); console.log('AFTER', JSON.stringify(await st()));
  for (let w = 0; w < 12; w++) { await H.eval(() => { PLAYER.a.hp = PLAYER.a.hpMax; for (const e of COMBAT.foes()) if (e.alive) COMBAT.damage(e, 999, { src: PLAYER.a, kind: 'slash', unblockable: true }); }); await H.step(90, 1 / 30); const s = await st(); console.log('WAVE', JSON.stringify(s)); if (/lift/i.test(s.obj)) break; }
  await H.eval(() => { const l = LEVEL.cur.N.lift, P = PLAYER.a; P.x = l.x; P.z = l.z + 0.5; }); await H.step(10, 1 / 30);
  await H.eval(() => { IN.buf.interact = MG.rt; IN.pressed.T_interact = true; }); await H.step(3, 1 / 30);
  await H.step(150, 1 / 30); if (process.env.SHOTS) await H.pshot('flow_lift'); await H.step(180, 1 / 30); console.log('END', JSON.stringify(await st()), JSON.stringify(await H.eval(() => ({ menu: MENU.cur && MENU.cur.id, y: PLAYER.a.y.toFixed(1) }))));
};
