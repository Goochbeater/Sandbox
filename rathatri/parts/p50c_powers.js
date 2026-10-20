/* POWERS — the Force tree (Study Bench). SAVE.d.powers[id] = 0 (locked) | 1..3. Rank 1 comes from the story (see CAMPAIGN reward.power);
   ranks 2–3 are bought with Essence at the bench. Gameplay reads POWERS.rank(id) and POWERS.k(id, [r1,r2,r3]) for rank-scaled numbers. */
const POWERS = {
  ORDER: ['push', 'grip', 'throw', 'rage', 'breaker', 'fear', 'mask', 'dominate', 'bind'],
  COST: [0, 180, 380],   // essence to reach rank 1 (story-given, 0) / 2 / 3
  D: {
    push: { name: 'FORCE PUSH', src: 'Instinct', desc: ['A shove that staggers and clears space.', 'Wider cone, shorter recovery.', 'Throws foes off ledges and shatters guards.'] },
    grip: { name: 'FORCE CHOKE', src: 'Traya · the caged beast', desc: ['Hold a foe in the air and bleed them.', 'Longer hold, deeper bleed.', 'Hurl the choked foe into others.'] },
    throw: { name: 'SABER THROW', src: 'Traya · reliance on circumstance', desc: ['Cast the blade; it returns to the hand.', 'Faster return, longer reach.', 'The blade cuts a second pass through the crowd.'] },
    rage: { name: 'RAGE SURGE', src: 'Tainted Kyber · Ambria', desc: ['Rage meter feeds a short, savage surge.', 'Longer surge; strikes draw blood into health.', 'Surge ends in a shockwave.'] },
    breaker: { name: 'PATTERN-BREAKER', src: 'Assassin databank · Raxus Prime', desc: ['Jedi parry windows are telegraphed.', 'A perfect parry staggers the duellist.', 'Parried blows return as a counter-lunge.'] },
    fear: { name: 'AURA OF DESPAIR', src: 'Mask of Despair · Lenico IV', desc: ['Enemy aim falters; weak foes hesitate.', 'Jedi seekers lose their lock on you.', 'Lesser foes break and run.'] },
    mask: { name: 'FORCE MASKING', src: 'Traya · the echo', desc: ['Exposure builds 25% slower.', 'Exposure builds 50% slower.', 'Exposure builds 75% slower; hunters lose old trails.'] },
    dominate: { name: 'SHIP DOMINATION', src: 'Traya · finding the cracks', desc: ['Crush a crippled ship in the void.', 'Shorter channel; wider range.', 'Dominated hulls can be stripped for double salvage.'] },
    bind: { name: 'RITUAL OF BINDING', src: 'Krayiss II', desc: ['Bind a beast to your will in sieges.', 'The bound beast fights longer.', 'A second bound beast answers the call.'] },
  },
};
POWERS.rank = (id) => (SAVE.d && SAVE.d.powers[id]) || 0;
POWERS.has = (id) => POWERS.rank(id) > 0;
POWERS.k = (id, tbl) => { const r = POWERS.rank(id); return r ? tbl[Math.min(tbl.length, r) - 1] : tbl[0]; };
POWERS.nextCost = (id) => { const r = POWERS.rank(id); return r >= 3 ? null : POWERS.COST[r]; };
POWERS.canBuy = (id) => { const r = POWERS.rank(id), c = POWERS.nextCost(id); return r >= 1 && c !== null && SAVE.d.essence >= c; };
POWERS.buy = function (id) {
  if (!POWERS.canBuy(id)) return false;
  SAVE.d.essence -= POWERS.nextCost(id); SAVE.d.powers[id]++; SAVE.store(); return true;
};
