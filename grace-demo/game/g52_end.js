/* THE ENDINGS — chapter six, the fortieth night (STORY.md §5 chapter 6, §11; ENGINE.md §13s). After the accusation
   (and the battle, if it came to war) the Woman comes for her price: whatever the king's ledgers say he held dearest.
   END.pick reads them; END.play tells it as a cutscene in rooms the game already has (the fortress in the storm, the
   siege, the wood's fire, the dark hall, the dawn, the garden, the yard), ends on a card, and returns to the title.
     D · The Bargain Broken   he protected the crow-marked child, kept his father's letter, told Halina part of the truth,
                              and named Ilka: he knows enough to call the Woman by her name
     E · Two Kings' Breath    he bought the festival's sun, and named the wrong hand (or none): the breath is still owed
     C · The Drowned Crown    the kingdom was let run down (the four ledgers under 20, or no stores and no army)
     B · The Empty Cradle     Kazik is the one he is closest to, and the kingdom is strong
     A · The Swan Endures     otherwise: family and kingdom both kept, so she takes the king himself */
const END = { seen: null };
END.TITLES = { A: 'The Swan Endures', B: 'The Empty Cradle', C: 'The Drowned Crown', D: 'The Bargain Broken', E: 'Two Kings’ Breath' };
END.state = () => ({ seen: END.seen }); END.load = (s) => { END.seen = (s && s.seen) || null; }; END.reset = () => { END.seen = null; };
END.pick = function () {
  const F = REALM.flags, f = REALM.fam, out = INV.outcome || '', ilka = out.indexOf('ilka') === 0, k = REALM.kingdom();
  if (F.hela === 1 && F.letter === 1 && F.told === 1 && ilka) return 'D';
  if (F.bargain2 === 1 && !ilka) return 'E';
  if (k < 20 || (COURT.stats.stores <= 2 && REALM.army <= 2)) return 'C';
  if (f.kazik > f.halina && f.kazik > f.zofia) return 'B';
  return 'A';
};
END.shots = function (e, war) {
  const X = (setup) => ({ room: 'exterior', setup });
  const storm = { from: [-20, 22, 92, -6, 17, -24, 22], to: [-12, 20, 70, 0, 16, -24, 20] }, siege = { from: [-16, 5, 44, -2, 10, -12, 26], to: [2, 6, 36, 8, 11, -12, 24] };
  const wood = { from: [-62, 1.7, 13, -62, 1.25, 2, 22], to: [-62, 1.45, 9.5, -62, 1.1, 2, 20] }, dawn = { from: [-18, 16, 86, 0, 14, -20, 22], to: [-10, 17, 78, 2, 14.5, -20, 21] };
  const hall = { from: [1.5, 2.95, 22.6, 1.5, 2.6, 3.2, 19], to: [1.5, 2.55, 15.2, 1.5, 1.85, 0.9, 17] };
  const inRoom = (id, x) => { const r = SCENE.rooms[id]; return { from: [x - 1.5, r.cam.y, r.KZ + r.cam.dist, x - 1.5, r.cam.look, r.KZ, 19], to: [x + 1.5, r.cam.y, r.KZ + r.cam.dist - 2.5, x + 1.5, r.cam.look, r.KZ, 18] }; };
  const S = (base, cam, dur, caption, more) => Object.assign({}, base, { cam, dur, caption }, more || {});
  const hide = (...ids) => () => { SCENE.player.setVisible(false); for (const id of ids) if (CAST.A[id]) CAST.A[id].setVisible(false); };
  const walls = war === 'krasna' ? 'Krasna came to the walls of the Swan Fortress with twenty thousand men.' : war === 'hal' ? 'Hal came down the Swan Pass, and Krasna marched beside Lodmir to meet it.' : 'No army came to the walls. The rain did.';
  const open = [S(X(() => EXTERIOR.mode(war ? 'siege' : 'present')), war ? siege : storm, 8.5, walls, { music: 'intro', musicFade: 2, sfx: [['thunder', 1.4, { gain: 0.9 }]] }),
    S(X(() => EXTERIOR.mode('present')), storm, 8, 'It rained for forty days, as it had rained for his father. On the fortieth night it stopped all at once.'),
    S({ room: 'throne', setup: () => THRONE.night(true), ambience: { rainGlass: 0.1, tone: 0.5 }, done: () => THRONE.night(false) }, hall, 8.5, 'Nobody stopped the Woman at the gate. Nobody remembered afterwards that there had been a gate.')];
  const tail = {
    A: [S(X(() => EXTERIOR.mode('wood')), wood, 9, 'She had sold him his kingdom twice. He had kept it, and his house with it. So she asked for the only thing left that was his alone.'),
      S(X(() => EXTERIOR.mode('dawn')), dawn, 8.5, 'King Radomir walked into the Wood at dawn. He did not look back; Halina had asked him not to.'),
      S({ room: 'yard', setup: hide() }, inRoom('yard', 3), 9, 'Zofia was crowned in the autumn, with her mother beside her. That afternoon she was in the yard. In real armour.')],
    B: [S(X(() => EXTERIOR.mode('wood')), wood, 9, 'She looked at everything he had, and at what he looked at most. “The boy,” she said. “He has been half mine since the night he was born.”'),
      S({ room: 'garden', setup: hide('kazik') }, inRoom('garden', 4), 9.5, 'Kazik went with her as if he had always known the way. The bear walked beside them as far as the trees.'),
      S(X(() => EXTERIOR.mode('dawn')), dawn, 8.5, 'The rain ended. The kingdom prospered. The crows stayed at the fountain, and the king sat with them every evening of his life.')],
    C: [S(X(() => EXTERIOR.mode('wood')), wood, 9, 'She looked for what he held dearest, and found a kingdom he had let go hungry. “Then I’ll take what you didn’t keep,” she said.'),
      S(X(() => EXTERIOR.mode('present')), storm, 9, 'The rain never stopped. The Kalina took the lower town street by street. The family crossed the mountains together, in one cart.', { sfx: [['thunder', 2, { gain: 1 }]] }),
      S({ room: 'throne', setup: () => THRONE.night(true), done: () => THRONE.night(false) }, hall, 8.5, 'They left the swan banner on the empty throne. It is said the water has not reached it yet.')],
    D: [S(X(() => EXTERIOR.mode('wood')), wood, 10, 'She opened her mouth to name her price, and he said her name first: the old one, the one the midwife remembered and his father had written down.'),
      S(X(() => EXTERIOR.mode('wood')), wood, 9, 'A thing that is named has to bargain. She took the rain itself, and twelve years off the end of his life, and called it fair.'),
      S(X(() => EXTERIOR.mode('dawn')), dawn, 9, 'The sun came up over Lodmir. Radomir went home and told his wife everything, starting with the twentieth night.')],
    E: [S({ room: 'throne', setup: () => THRONE.night(true), done: () => THRONE.night(false) }, hall, 10, '“A king’s breath,” she said. “I was owed one for your sunshine. The dead king’s was taken by someone else’s hand, and you never gave me the right one.”'),
      S(X(() => EXTERIOR.mode('wood')), wood, 9, 'So she took Radomir’s, on the fortieth night, at the foot of his own throne. She was exact. She had always said so.'),
      S(X(() => EXTERIOR.mode('dawn')), dawn, 8.5, 'Halina ruled for Zofia for nine years, and ruled well. She never once held a midsummer fair.')],
  }[e];
  const card = S(X(() => EXTERIOR.mode('title')), { from: [-18, 21, 74, -12, 18.5, -24, 22], to: [-14, 22, 70, -10, 19, -24, 21.5] }, 9, `The End · ${END.TITLES[e]}`, { music: 'title' });
  return open.concat(tail, [card]);
};
END.play = async function () {
  const e = END.pick(), war = (INV.OUT[INV.outcome] || {}).war; END.seen = e; CAL.phase = 'done'; GAME.save();
  await CUT.play(END.shots(e, war), { then: async () => { SCENE.player.setVisible(true); TITLE.show(); R.r.compile(R.scene, R.cam); SCENE.render(); await nextFrame(); $('fade').classList.add('off'); } });
  return e;
};
