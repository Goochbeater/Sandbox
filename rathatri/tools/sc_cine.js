// CINE smoke test: play scenes (void-stage fallback or authored), pick choices, confirm completion. env: SCENE (default 1_5_the_offer)
module.exports = async (H) => {
  const id = process.env.SCENE || '1_5_the_offer';
  await H.eval(() => { window.__cdone = false; window.__cids = []; const _p = CINE.play; CINE.play = function (i, cb) { window.__cids.push(i); return _p.call(CINE, i, cb); }; });
  await H.eval((id) => { CINE.play(id, () => { window.__cdone = true; }); }, id);
  let shots = 0, picks = 0;
  for (let k = 0; k < 400; k++) {
    await H.wait(30);
    const st = await H.eval(() => ({ done: window.__cdone, cur: !!CINE.cur, i: CINE.cur && CINE.cur.i, n: CINE.cur && CINE.cur.shots.length, choice: !!document.querySelector('#cineChoice .cb'), state: MG.state, errs: MG.errors.length }));
    if (st.done) { console.log('DONE after', k, 'polls; scenes played:', JSON.stringify(await H.eval(() => window.__cids)), 'picks', picks); break; }
    if (st.choice) { picks++; await H.eval(() => document.querySelector('#cineChoice .cb').click()); continue; }
    if (st.cur) await H.step(20, 1 / 20);   // 1 s of game time per poll
    shots = st.i;
  }
  console.log('final', JSON.stringify(await H.eval(() => ({ done: window.__cdone, cur: !!CINE.cur, errors: MG.errors.slice(0, 5), choices: SAVE.d.choices, bodyCine: document.body.classList.contains('cine') }))));
  if (process.env.SHOT) await H.pshot('cine_' + id);
};
