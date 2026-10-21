/* CAMPAIGN / MISSION — the story spine. Table ids are canonical (docs/MASTER_BUILD_ADDENDUM.md §C); levels end by calling MISSION.complete().
   kind: 'level' (ref = LEVEL.def id) | 'space' (ref = SPACE.def id) | 'cine' (pre/post scenes only) | 'hub'.
   pre / post: CINE scene ids (docs/lore/script.json) played before / after the mission outside the level. scenes: in-level scenes (for the level author).
   chain: true → the next story mission starts straight away; otherwise the player returns to the hub (command table) to launch it. */
const CAMPAIGN = { M: {}, ORDER: [], hub: 'dxun_hub', hubMission: 'a2_hub' };
CAMPAIGN.def = function (id, m) { m.id = id; CAMPAIGN.M[id] = m; CAMPAIGN.ORDER.push(id); return m; };
(function () {
  const D = CAMPAIGN.def;
  /* ACT I */
  D('a1_pit', { act: 1, kind: 'level', ref: 'hutta_pit', title: 'THE PIT', pre: ['1_1_cold_open'], scenes: ['1_2_the_pit', '1_3_losing_fight', '1_4_milians_test'], chain: true, reward: { essence: 60, codex: ['hutta_pits'] }, brief: 'Survive the pit behind the cantina. Whatever answers when you break — keep it.' });
  D('a1_offer', { act: 1, kind: 'cine', title: 'THE OFFER', post: ['1_5_the_offer', '1_6_years_in_minutes'], chain: true, reward: { essence: 0 }, brief: 'A stranger buys a slave.' });
  D('a1_zx34', { act: 1, kind: 'level', ref: 'zx34_sanctum', title: 'THE SANCTUM FALLS', scenes: ['1_7_milian_dies'], chain: true, reward: { essence: 80 }, brief: 'Two Jedi breach the sanctum. Survive. Run.' });
  /* ACT II */
  D('a2_flight', { act: 2, kind: 'space', ref: 'sp_zx34_escape', title: 'THE HARBINGER', post: ['2_1_junker_crash'], chain: true, reward: { essence: 90, salvage: 4 }, brief: 'A junker with bad engines. Jedi fighters on your tail.' });
  D('a2_landing', { act: 2, kind: 'level', ref: 'dxun_landing', title: 'CLAIM THE WARREN', chain: true, reward: { essence: 120 }, brief: 'Crash-land in the Dxun canopy. Hold the lesser tombs.' });
  D('a2_slavers', { act: 2, kind: 'level', ref: 'dxun_ambush', title: 'THE TRANDOSHAN DEAL', scenes: ['2_2_bosskarr_ambush', '2_2a_life_debt_oath', '2_2b_tally_broken'], chain: true, reward: { essence: 130 }, brief: 'Take Bosskarr’s slaver party. Spare the hunter. Keep the debt.' });
  D('a2_beast', { act: 2, kind: 'level', ref: 'dxun_trial', title: 'THE STARVING BEAST', scenes: ['2_3_starving_beast'], chain: true, reward: { essence: 140, codex: ['starving_beast'] }, brief: 'Leave them in the jungle. See who returns.' });
  D('a2_holocron', { act: 2, kind: 'level', ref: 'dxun_fringe', title: 'THE FIRST ECHO', scenes: ['2_4_first_artifact'], post: ['2_5_traya_judgment'], chain: true, reward: { essence: 160, artifact: 'corrupted_holocron', power: { grip: 1, throw: 1 }, codex: ['traya'] }, brief: 'Learn to see the Force’s residue. Wake what is sleeping in the holocron.' });
  D('a2_hub', { act: 2, kind: 'hub', ref: 'dxun_hub', title: 'THE WARRENS', brief: 'Your base. Command table, workshop, study bench, trophy wall.' });
  D('a2_hunters', { act: 2, kind: 'level', ref: 'dxun_hunters', title: 'FIRST HUNTERS', scenes: ['2_6_first_hunters'], reward: { essence: 150, codex: ['heat'] }, brief: 'Rumor draws hunters. Bury them in the jungle.' });
  /* ACT III */
  D('a3_ambria', { act: 3, kind: 'level', ref: 'ambria', title: 'AMBRIA · BETRAYAL', scenes: ['3_1_ambria'], reward: { essence: 200, artifact: 'tainted_kyber', power: { rage: 1 } }, brief: 'Glass wastes. Two rivals, one obelisk, one betrayal. Take the kyber.' });
  D('a3_narsh', { act: 3, kind: 'level', ref: 'narshaddaa', title: 'NAR SHADDAA · THE COIN ROOM', scenes: ['x_ns_auction'], reward: { essence: 210, salvage: 4, artifact: 'sith_amulet', codex: ['artifact_sith_amulet', 'history_evocii_displacement'] }, brief: 'The Exchange auctions a Sith amulet under the counting tower. Tail the fixer unseen. Pay for it, or take it.' });
  D('a3_wreck', { act: 3, kind: 'space', ref: 'sp_wreck_field', title: 'THE SEIZURE', post: ['3_2b_the_lieutenant'], reward: { essence: 220, salvage: 8, power: { dominate: 1 }, ship: 'interceptor' }, brief: 'Tear a Sith Interceptor out of the sky with nothing but will.' });
  D('a3_raxus', { act: 3, kind: 'level', ref: 'raxus', title: 'RAXUS PRIME · THE HEAP', scenes: ['3_3_raxus'], reward: { essence: 230, artifact: 'assassin_databank', power: { breaker: 1 } }, brief: 'A crater of old war. Listen to the machines that remember.' });
  D('a3_celene', { act: 3, kind: 'level', ref: 'celene_arena', title: 'CELENE TRYST', scenes: ['3_4_celene_duel_1'], post: ['3_5_rebuild'], reward: { essence: 260, power: { mask: 1 } }, brief: 'She tracked the rumor. You cannot win this fight with skill. Win it another way.' });
  /* ACT IV */
  D('a4_krayiss', { act: 4, kind: 'level', ref: 'krayiss', title: 'KRAYISS II · FOCUSED POWER', scenes: ['4_1_krayiss'], reward: { essence: 280, artifact: 'ritual_of_binding', power: { bind: 1 } }, brief: 'Ritual sites in a dead library-temple. Learn to bind a beast.' });
  D('a4_lenico', { act: 4, kind: 'level', ref: 'lenico', title: 'LENICO IV · ECHOES', scenes: ['4_2_lenico'], reward: { essence: 300, artifact: 'mask_of_despair', power: { fear: 1 } }, brief: 'An abandoned colony that wears your face. Take the mask.' });
  D('a4_shroud', { act: 4, kind: 'cine', title: 'THE SHROUD', post: ['4_3_the_shroud'], reward: { essence: 100, ship: 'shroud' }, brief: 'Seven masks in a ring. A black ship lands.' });
  D('a4_approach', { act: 4, kind: 'space', ref: 'sp_iziz_approach', title: 'PICKET LINE', reward: { essence: 220, salvage: 6 }, brief: 'Slip the Shroud past Republic pickets. Do not be seen.' });
  D('a4_iziz', { act: 4, kind: 'level', ref: 'iziz', title: 'IZIZ STRIKE', scenes: ['4_4_iziz_strike'], reward: { essence: 340, artifact: 'nadd_key_fragment' }, brief: 'A city of beast-riders and a militia fireteam between you and the key.' });
  D('a4_nadd', { act: 4, kind: 'level', ref: 'nadd_tomb', title: 'THE TOMB OF NADD', scenes: ['4_5_nadds_tomb'], reward: { essence: 400, artifact: 'nadd_shard' }, brief: 'Iron, obsidian, parasites and old spirits. Take what the king left.' });
  /* ACT V */
  D('a5_orbital', { act: 5, kind: 'space', ref: 'sp_dxun_orbit', title: 'ORBITAL DEFENSE', reward: { essence: 300, salvage: 10 }, brief: 'Kyros’s hunt cell drops on Dxun. Break the dropships before they land.' });
  D('a5_siege', { act: 5, kind: 'level', ref: 'dxun_siege', title: 'THE SIEGE OF THE WARRENS', scenes: ['5_1_base_siege'], reward: { essence: 450 }, brief: 'Hold the temple. Wake the wards. Loose the bound beast.' });
  D('a5_kyros', { act: 5, kind: 'level', ref: 'kyros_arena', title: 'AIDEN KYROS', scenes: ['5_2_kyros_boss'], reward: { essence: 600 }, brief: 'The Battlemaster. Three phases. Everything the game taught you.' });
  D('a5_finale', { act: 5, kind: 'cine', title: 'DARTH', post: ['5_3_celene_choice', '5_4_darth_question'], ending: true, reward: { essence: 0 }, brief: 'Execute or corrupt. Claim the title — over loyalty, or over fear.' });
  /* optional */
  D('x_pit', { act: 2, kind: 'level', ref: 'x_pit', title: 'THE PIT (SURVIVAL)', optional: true, reward: { essence: 80 }, brief: 'Endless pit waves for Essence. Rank by waves survived.' });
})();
CAMPAIGN.story = () => CAMPAIGN.ORDER.filter((id) => !CAMPAIGN.M[id].optional && CAMPAIGN.M[id].kind !== 'hub');
CAMPAIGN.nextStory = function () { const s = CAMPAIGN.story(); for (const id of s) if (!SAVE.d.done[id]) return id; return null; };
/* what the command table may launch now: the next story mission, finished story missions (replay), unlocked optional ones */
CAMPAIGN.available = function () {
  const out = [], next = CAMPAIGN.nextStory();
  for (const id of CAMPAIGN.story()) { const m = CAMPAIGN.M[id]; if (m.kind === 'cine') continue; if (id === next || SAVE.d.done[id]) out.push(id); }
  if (SAVE.d.done.a2_holocron) out.push('x_pit');
  return out;
};
CAMPAIGN.playScenes = function (ids, cb) {
  const list = (ids || []).slice();
  const run = () => { const id = list.shift(); if (!id) { cb && cb(); return; } if (typeof CINE !== 'undefined' && CINE.play && CINE.has(id)) CINE.play(id, run); else run(); };
  run();
};
/* begin a mission: pre-scenes → launch by kind */
CAMPAIGN.start = function (id) {
  const m = CAMPAIGN.M[id]; if (!m) { MG.fail('no mission ' + id); return; }
  MENU.close();
  MISSION.cur = { id, def: m, t0: MG.rt, kills0: COMBAT.kills, done: false };
  if (!m.optional && m.kind !== 'hub') { SAVE.d.mission = id; SAVE.d.act = m.act; SAVE.store(); }
  const launch = () => {
    if (m.kind === 'level' || m.kind === 'hub') GAME.start(m.ref, m.kind === 'hub' ? 0 : (SAVE.d.cps[m.ref] || 0));
    else if (m.kind === 'space') { MG.state = 'loading'; SPACE.start(m.ref, (res) => MISSION.complete(res)); }
    else MISSION.complete({ rank: 'B', silent: true });
  };
  CAMPAIGN.playScenes(m.pre, launch);
};
CAMPAIGN.continue = function () { const id = SAVE.d.mission || 'a1_pit'; const m = CAMPAIGN.M[id]; if (SAVE.d.done[id] || !m) CAMPAIGN.toHub(); else CAMPAIGN.start(id); };
CAMPAIGN.toHub = function () { CAMPAIGN.start(CAMPAIGN.hubMission); };
CAMPAIGN.newGame = function () { SAVE.reset(); CAMPAIGN.start('a1_pit'); };
/* after a result card / silent cine: post-scenes, then the next mission or back to the hub */
CAMPAIGN.advance = function () {
  const cur = MISSION.cur; if (!cur) { CAMPAIGN.toHub(); return; }
  const m = cur.def;
  MENU.close();
  CAMPAIGN.playScenes(m.post, () => {
    if (m.ending) { CAMPAIGN.credits(); return; }
    const nx = CAMPAIGN.nextStory();
    if (m.chain && nx) CAMPAIGN.start(nx);
    else if (!nx && SAVE.d.done.a5_finale) CAMPAIGN.credits();
    else CAMPAIGN.toHub();
  });
};
CAMPAIGN.credits = function () { MG.state = 'result'; HUD.show(false); if (typeof TOUCH !== 'undefined') TOUCH.want = 'none'; MENU.open('ending', { id: SAVE.choice('ending') || 'end_a_reaper' }); };

/* MISSION — the one function a level calls when its goal is met */
const MISSION = { cur: null };
MISSION.RANK_K = { S: 1.5, A: 1.25, B: 1, C: 0.8 };
MISSION.obj = function (t) { if (MISSION.cur) MISSION.cur.obj = t; HUD.obj(t); };
MISSION.complete = function (res) {
  const c = MISSION.cur; if (!c || c.done) return; c.done = true; res = res || {};
  const m = c.def, rank = res.rank || MISSION.autoRank(c), k = MISSION.RANK_K[rank] || 1;
  const R = m.reward || {}, got = { rank, essence: Math.round((R.essence || 0) * k), salvage: R.salvage || 0, artifact: null, powers: [], codex: [], ship: null, time: Math.round(MG.rt - c.t0), kills: COMBAT.kills - c.kills0 };
  if (!m.optional || !SAVE.d.done[m.id]) { SAVE.addEssence(got.essence); SAVE.d.salvage += got.salvage; }
  if (R.artifact && SAVE.giveArtifact(R.artifact)) got.artifact = R.artifact;
  if (R.power) for (const p of Object.keys(R.power)) if ((SAVE.d.powers[p] || 0) < R.power[p]) { SAVE.d.powers[p] = R.power[p]; got.powers.push(p); }
  if (R.ship && !SAVE.d.ships[R.ship]) { SAVE.d.ships[R.ship] = true; SAVE.d.ship = R.ship; got.ship = R.ship; }
  if (R.codex && typeof CODEX !== 'undefined') for (const id of R.codex) { if (CODEX.unlock(id, true)) got.codex.push(id); }
  const prev = SAVE.d.done[m.id]; SAVE.d.done[m.id] = { rank: prev && prev.rank && prev.rank < rank ? prev.rank : rank, t: got.time };
  SAVE.d.stats.kills += got.kills; SAVE.d.cps[m.ref] = 0; SAVE.store();
  if (m.kind === 'cine' || res.silent) { CAMPAIGN.advance(); return; }
  MG.state = 'result'; HUD.show(false);
  MENU.open('result', { mission: m, got, final: !!m.ending });
};
MISSION.autoRank = function (c) {   // time + damage-free heuristic hooks; levels may pass res.rank instead
  const t = MG.rt - c.t0, par = (c.def.par || 420);
  return t < par * 0.7 ? 'S' : t < par * 1.1 ? 'A' : t < par * 1.8 ? 'B' : 'C';
};
MISSION.fail = function (why) { if (MG.state === 'dead') return; if (PLAYER.a && PLAYER.a.alive) { HUD.toast('MISSION FAILED', why || '', 3); } GAME.onPlayerDeath(); };
