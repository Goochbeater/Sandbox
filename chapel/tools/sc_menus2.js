module.exports = async (H) => {
  await H.step(30); await H.wait(1200);
  await H.pshot('mn_title');
  // real key presses: walk down the title list onto CHAPTER II
  for (let i = 0; i < 5; i++) { await H.page.keyboard.press('ArrowDown'); await H.wait(80); }
  await H.pshot('mn_title_sel');
  console.log('title sel', await H.eval(() => MENU.items[MENU.sel].id + ' of ' + MENU.items.length + ' ' + MENU.items.map((e) => e.id || e.textContent.slice(0, 8)).join(',')));
  await H.eval(() => { MENU.open('chapters'); }); await H.step(3);
  for (let i = 0; i < 6; i++) { await H.page.keyboard.press('ArrowRight'); await H.wait(80); }
  await H.pshot('mn_chap_sel');
  console.log('chap sel', await H.eval(() => { const e = MENU.items[MENU.sel]; return (e.dataset.l || e.id) + ' of ' + MENU.items.length; }));
};
