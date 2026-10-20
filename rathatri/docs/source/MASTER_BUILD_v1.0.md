# DARK LEGACY: RATHATRI — MASTER BUILD FILE
### A hidden-Sith-Lord action game for the browser · Old Republic era · single-file three.js
**Version 1.0 · Prepared for autonomous agent-framework execution · Base: `game-character-kit` engine**

---

## 0. HOW AN AGENT SHOULD USE THIS FILE

This document is the single source of truth. It contains: (a) the extracted asset map from five shipped
games built on this same engine, (b) full drop-in code for the new systems, (c) the storyboard derived from
the attached lorebook, (d) character build specs for Blender and the engine's outfit system, (e) the cloth
simulation decision, and (f) a milestone plan with acceptance tests.

**Build rules for the agent:**
1. Scaffold from `game-character-kit` (`scripts/new_project.sh`), confirm the stock 25/25 test pass first.
2. Work in the engine's own idiom: plain JS "parts" (`pNN_name.js`) concatenated in name order into ONE
   html file, all assets embedded, no server, no build deps beyond the kit harness.
3. Every new system below is written as a new part file with its engine hooks named exactly as the shipped
   games use them (`ENEMY.TYPES`, `CAST.SPECS/QC/QO`, `CAM.play`, `CLOTH.mat`, `FX`, `HUD.toast`, `JET.pip`,
   `DC.after`, `LVL.def`, `BOSS`). Do not rename engine APIs; extend them.
4. Reuse shipped code by copy-and-re-theme. The engine lineage is identical across all five source games —
   `order66.html` and `darth-maul-sith-apprentice.html` are literally the same engine core (verify by diffing
   the section headers), so code transplants are safe.
5. After each milestone, run the kit's measurement tools (`sc_jank`, `sc_fist`, `sc_perf`, `sc_play_all`)
   and keep the targets: no bone >100°/frame outside whips, fists <2 cm from hilt, 60 fps @1080p, CPU <5 ms.
6. No sound except the user's own intro music (engine rule from the kit).
7. This is a fan-made, non-commercial project using CC0 assets (Quaternius) for bodies/outfits/animation.
   Keep it that way: no ripped commercial assets.

---

## 1. VISION & DESIGN PILLARS

**Fantasy:** You are Rathatri — born Slave 426 in the pits of Hutta, apprenticed to the Sith Witch Milian,
and now a hidden Sith Lord in exile on Dxun, the demon moon of Onderon. You are not Darth Vader striding
through a temple. You are a *rumor*. You hunt ancient Sith artifacts, build a cult of assassins, and survive
the Jedi hunters and bounty hunters the galaxy sends to kill the rumor.

**Pillars:**
1. **Hunted, not heralded.** The galaxy thinks the Sith are broken (it is just after the First Jedi Purge).
   Exposure is the fail state; power is built in shadow.
2. **Artifacts are progression.** Power comes from recovered Sith relics — holocrons, tainted kyber, ritual
   fragments — each unlocking real mechanics (new Force powers, ship domination, assassin training tiers).
3. **Dxun is a character.** The jungle moon kills for you: beasts, terrain, and the dark nexus of Freedon
   Nadd's tomb are your fortress walls.
4. **Brutal elegance in combat.** The kit's mocap + saber combat is the proven core; Rathatri's style is
   the "beast + HK-47" hybrid from the lorebook: ambush, cripple, disappear.
5. **A living base.** The Dxun temple hub grows with each act — workshop, command table, trophy wall,
   assassin roster — mirroring the lorebook's base descriptions.

**Source features being fused (user directive):**
| Source game | Feature taken |
|---|---|
| `bobafet.html` | **Ship-call**: press a key, your ship sweeps in for a strafing run / extraction (SLV system) |
| `darth-maul…html` | **Cutscene implementation**: cinematic camera shots, letterbox, intro pipeline + the whole character/combat engine, Jedi boss AI, sabers |
| `starfall-uncharted-worlds.html` | **Planet generation**: seeded continuous planetary heightfield, orbit→ground LOD, guided journey, scan/discover loop |
| `starwright.html` | **Ship customization**: modular ship assembly (hull/wings/drive/paint/tuning) with live stats |
| `order66.html` | **Clone trooper system** → re-themed as **Republic commandos / militia** hunting you; ally-squad code inverted for both enemies and Rathatri's assassins |

---

## 2. ERA & LORE GROUNDING (researched)

Set the game **c. 3950–3945 BBY**, immediately after KOTOR II. This is deliberate and canonical-friendly:

- **The Sith Triumvirate (Traya, Sion, Nihilus) was destroyed by Meetra Surik in 3951 BBY**, ending the First
  Jedi Purge (3954–3951 BBY). The Jedi Order is shattered and only beginning to rebuild from the "Lost Jedi."
  A self-made Sith heir looting the Triumvirate's ruins fits perfectly — and Traya's *holocron* as Rathatri's
  mentor (per the lorebook) is era-correct.
- **Dxun**: jungle moon of Onderon, saturated with dark-side residue. It holds the **Tomb of Freedon Nadd** —
  an obsidian, tiered, trapezoidal mausoleum of nigh-impenetrable Mandalorian iron, ringed by a spiked
  bastion and trench, guarded by orbalisk parasites and the moon's fauna; it served as Nihilus's Sith staging
  base in 3951 BBY. Rathatri deliberately does *not* claim the grand tomb; per the lorebook he occupies the
  surrounding warren of lesser tombs. Nadd's tomb becomes a late-game artifact site.
- **Dxun fauna for encounters**: cannoks (small, swarming pests), maalraas (pack predators), boma beasts
  (territorial chargers), zakkegs (armored, high-threat), and drexl (winged horrors) for a set piece.
- **Force-wound philosophy**: Traya/Kreia's teachings (manipulation, Force-masking, seeing "cracks") are the
  spine of the upgrade trees, exactly as the lorebook's holocron chapters describe.
- **Enemy framing**: with the Order gutted, the hunters after Rathatri are: rebuilding **Jedi Knights/Masters**
  (Aiden Kyros, Celene Tryst), **Republic-allied militia commandos** (our re-skin of the 501st system), and
  freelance **bounty hunters** (ties the Boba Fett tech in thematically).

---

## 3. SOURCE ASSET INVENTORY (what to extract, and where it lives)

All paths below are the shipped single-file games the user supplied. Section headers are quoted verbatim so
the agent can grep for them. The `game-character-kit` zip is the same engine in clean, modular form —
**prefer the kit parts over scraping the monoliths**; use the monoliths only for systems the kit lacks.

### 3.1 From `game-character-kit` (the base engine — `engine/parts/`)
| Part | System | Reuse |
|---|---|---|
| p00–p05 | core, input, HDR renderer w/ bloom+ACES grade, procedural textures, physics, SDF kit | unchanged |
| p07/p07b | 19-bone logical rig + IK; Quaternius loader | unchanged |
| p08 | character materials (skin/cloth, fill+rim) | unchanged |
| p10/p10b | hero build path | retarget to Rathatri |
| **p11 / p11b** | **verlet cloth panels + hooded cloak** | Rathatri's coat, assassin robes, Milian's robes — see §8 |
| **p12** | **lightsabers: lathe hilts, layered HDR blades, trails** | crimson blade; Kyros dual blue; Celene saberstaff; assassin double-blades |
| p13/p13b | ANIM.apply + MOCAP (60 Quaternius UAL clips) | unchanged |
| p14 | keyframed moves (prop paths + hit windows) | Rathatri's moveset, §7 |
| p15c–f | cast tables (SPECS/QC/QO), outfit recolor grades | all cast, §7 |
| p16 | camera incl. `CAM.play` cinematic shots | cutscenes, §5.2 |
| p17/p17b | Actor + verlet ragdoll deaths | unchanged |
| p18–p20, p31 | player controller, combat, enemy AI, Jedi boss class | §5.5 |
| p21–p27 | FX, kit/props, sky, levels, holocrons(!), terrain, HUD | holocron pickups → artifact system |
| p29 | intro pipeline | §5.2 |

### 3.2 From `bobafet.html`
- **`p20d_slave1` — "SLAVE I (Firespray-31) and the G strafing run"** (grep `const SLV`). The ship-call loop:
  keypress → ship sweeps in from behind along the look vector → twin cannons walk a bolt line → seismic
  charge finisher → 40 s cooldown + HUD pip (`JET.pip`). Model is a superellipse-section loft with a
  canvas-painted weathered texture (olive/oxide-red, panel seams, rivets, carbon scoring) — the same loft +
  canvas-texture technique becomes **The Harbinger / the stolen Sith Interceptor / The Shroud** (§5.1, §5.4).
- Jetpack/dash mobility code (jet dash on tap, dust rings, landing thump) → Rathatri's Force-dash feel.
- Viewmodel gauntlet gadgets (wrist blade/whip) → assassin vibro-dagger flair for Vaara's execution anims.

### 3.3 From `darth-maul-sith-apprentice.html`
- **Cutscene implementation** (two layers, both needed):
  1. **In-engine cinematics**: `CAM.play({from:[p,t], to:[p,t], dur, ease, fov, onEnd})` + `PLAYER.state='cine'`
     + `document.body.classList.add('cine')` letterbox CSS (`#lbT/#lbB` bars, hint/skip fade). Grep
     `CAM.cineUpdate`, `body.cine`.
  2. **Boot intro**: `#intro` full-frame letterboxed video element with title-card animation
     (`#introTitle`, itMaul/itBlade keyframes), `#introGate` "press any key", `#introBar` progress.
- **Jedi boss class** (`class Jedi extends Actor`, `BOSS.startLock` blade-lock minigame) — the direct base
  for Aiden Kyros and Celene Tryst duels.
- Saber throw, executions, Force push/choke scaffolding in PLAYER (p18) — Rathatri's kit.

### 3.4 From `order66.html`
- **`CLONE.*` armour system**: rigid plastoid plates merged onto the shared rig (`CLONE.armour(T)`),
  Phase-II-style helmet (`helm2:'clone'`, `cullHead:true`), white/blue/black material set. Re-paint as
  **Republic militia commandos** (§5.5) and Trandoshan armor bases.
- **Ally squad AI**: `class Clone extends Enemy` with `team:'hero'`, target hand-off, slot positioning —
  reuse *twice*: (a) enemy commando fireteams, (b) Rathatri's deployable assassin allies (Vaara/Eren/E5).
- DC-15S carbine build (`CAST.dc15`) → era-appropriate blaster rifles/carbines.
- `HOLO` hologram material + hooded figure → **Traya holocron mentor scenes**, mission givers.
- Jedi Temple kit (polished floors, ashlar, bronze) → Coruscant/Onderon flashback and the Iziz level.

### 3.5 From `starfall-uncharted-worlds.html`
- **Seeded continuous planetary heightfield**: `hash/noise/fbm` sampled identically from orbit and ground
  (`R=640000`, `SEA=10`), drainage-basin terrain design, `terrainTiles` LOD map, `terrainColor` biome ramp,
  log-depth so ship cm-detail and planet coexist (`DepthShaderMaterial`).
- **Guided journey system**: `scenicRoutePoints/Times → prepareRoute` chaptered descent (orbit → clouds →
  valley → touchdown) with HUD chapter labels — becomes the **planet-visit mission structure** (§5.3).
- Scan/discover loop (`state.scan`, `state.discovered`, ecosystem groups, flora/sailbacks/gate POIs) →
  **artifact hunting** on Ambria, Raxus Prime, Krayiss II, Lenico IV.
- Starfall literally embeds the Starwright config (`starfall-frontier-v2`, `validate(cfg)`) — ship designs
  carry between shipyard and flight. We keep that pattern for the Dxun shipyard (§5.4).

### 3.6 From `starwright.html`
- **Modular ship builder UI**: `modules` categories (hull/wings/drive/utility/paint), per-module tuning
  sliders (sweep, cant, drive width, fuselage length), hardpoint DOM overlays projected from 3D anchors,
  explode view, live stats (cruise velocity/handling/shield/weapon), blueprint export via localStorage JSON.
  Becomes the **Dxun workshop ship-upgrade bench** (§5.4) re-skinned Sith.
- `loft(sections)`, `hullFinish` (wear shader), `beveledBox` kit — reused for Rathatri's ships.

### 3.7 Withdrawn "Jedi assets" (user asked to withdraw Jedi assets for reuse)
- Jedi character templates (`jknight/jknight2/jknight3/jknightf/jknightf2`, `tguard`), robe cloth mats
  (`robeBrown/robeTan`), blue/green/yellow blade configs, `MOV.jedi` moveset incl. choke loop, Jedi AI
  (guard/drain/parry/deflect), Temple Guard saberstaff. **All become the enemy hunter pool** — and their
  robes/moves are re-usable for Milian (flashback), the Miraluka enclave NPCs, and corrupted-Jedi variants.

---

## 4. TECHNICAL ARCHITECTURE

**Target:** one self-contained `rathatri.html`, three.js r160 classic build, WebGL2, everything embedded.
**Layering (part load order, new parts appended after the kit's):**

```
p00–p42   game-character-kit engine (unchanged except listed hooks)
p50_sith.js        Rathatri hero build + moveset + Force powers (dark tree)
p51_ship.js        THE SHIP-CALL system (The Harbinger / Interceptor / Shroud)      [§5.1]
p52_cine.js        CINE: story cutscenes, subtitles, holocron dialogues             [§5.2]
p53_planet.js      PLANET: seeded heightfield mission worlds + descent director      [§5.3]
p54_yard.js        YARD: Dxun ship-workbench (Starwright re-skin)                    [§5.4]
p55_hunters.js     HUNTERS: Republic commandos, bounty hunters, Jedi hunter AI       [§5.5]
p56_assassins.js   SITH ASSASSINS: ally squad, loyalty, dispatch missions            [§5.6]
p57_dxun.js        DXUN BASE level: temple hub, workshop, command table              [§5.7]
p58_levels.js      Mission levels: Hutta, Zx34 flashback, Ambria, Raxus, Krayiss…    [§6]
p59_traya.js       TRAYA holocron mentor: lesson trees, judgments, upgrade gates     [§5.2/§6]
p85_tests.js       extended tests (keep kit's 25, add ours)                          [§10]
```

**State spine:** `MG.state: boot | title | yard | play | cine | planet | dead | result`. Save data:
`localStorage['rathatri-save']` = `{ act, artifacts:[], shipCfg, assassins:{vaara,eren,e5[]}, traya:{lessons},
exposure, ship:'harbinger|interceptor|shroud' }`. Ship designs share Starfall's `starfall-frontier-v2`-style
validated-JSON pattern (`validate(cfg)` whitelist, versioned key `rathatri-ship-v1`).

**Exposure system (new, ties pillars together):** a global `HEAT` meter 0–100. Witnesses, holo-recordings,
and surviving hunters raise it; assassins dispatched to silence rumors lower it. Thresholds gate hunter
spawn tables (§5.5). Persisted in save.

---

## 5. FEATURE SYSTEMS — FULL CODE

> Convention notes matching the engine: `U.sat/mix/clamp`, `rnd(a,b)`, `RNG()`, `DC.after(t,fn)`,
> `FX.ring/magic/dust`, `HUD.toast(html)`, `JET.pip(id,key,label,fracFn)`, `PHY`, `LVL.floorAt(x,z)`,
> `PLAYER.a` (actor), `CAM.play(shot)`, `ENEMY.spawn(type,x,z,opts)`, `CAST.need([names])`.

### 5.1 p51_ship.js — THE SHIP-CALL (from Boba Fett's SLV system)

The Boba Fett mechanic becomes Rathatri's signature: **call your ship for a strafing run, an extraction,
or — at high mastery — Force-dominate an enemy vessel out of the sky** (the interceptor-seizure scene from
the lorebook). Model is built with the SLV loft technique (superellipse sections + canvas-painted weathered
texture), re-shaped per ship.

```js
/* p51_ship.js — DARK LEGACY: RATHATRI — ship-call, strafing runs, extraction, Force domination.
   Adapted from p20d_slave1 (bobafet.html). Three hulls, one system:
     harbinger   — CR90-derived junker: slow, arrives late, weak strafe, big cargo (extraction only early)
     interceptor — the seized Sith Interceptor "Nightbringer": fast strafe + ramming blades
     shroud      — modified Sith Infiltrator: stealth drop (no exposure), concussion barrage
   Key G calls a strafe along the look vector. Hold G near a valid LZ calls extraction (ends planet mission).
   Key T (when SHIP.domination unlocked, Interceptor/Shroud only) Force-crushes a marked enemy ship. */
const SHIP = {
  on: !DC.test && !DC.flags.noship, cd: 0, CD: 40, run: null, domRun: null,
  hull: 'harbinger',                       // upgraded by story beats; persisted in save
  unlocked: { harbinger: true, interceptor: false, shroud: false },
  domination: false,                       // Traya lesson gate (§6, Act III)
  n: { calls: 0, strafes: 0, extractions: 0, dominations: 0, kills: 0 },
  HULLS: {
    harbinger:   { H: 38, W: 12, D: 9,  delay: 3.2, speed: 55, bolts: 6,  dmg: 26, boomR: 5,  stealth: false, paint: 'junk'   },
    interceptor: { H: 11, W: 9,  D: 12, delay: 1.6, speed: 95, bolts: 10, dmg: 34, boomR: 7,  stealth: false, paint: 'sith'   },
    shroud:      { H: 13, W: 18, D: 22, delay: 1.1, speed: 80, bolts: 14, dmg: 40, boomR: 9,  stealth: true,  paint: 'shroud' },
  },
};
/* --- hull lofts: superellipse-section bodies like SLV.SEC. Each entry:
   [y, halfWidth, halfDepth, centreZ, superellipseExponent]. Shape language per hull:
   harbinger = long battered cylinder w/ hammerhead-ish bow; interceptor = dagger; shroud = flying wing arc. */
SHIP.SEC = {
  harbinger:   [[0,6.5,3.4,.2,2.9],[4,7.0,3.8,.1,2.7],[10,6.2,3.5,0,2.5],[20,5.2,3.0,-.2,2.3],[30,4.2,2.5,-.3,2.2],[36,2.6,1.6,-.2,2.1],[38.2,.3,.2,0,2]],
  interceptor: [[0,.4,.3,0,2],[1,2.8,1.1,.1,2.6],[3,4.4,1.4,0,2.8],[6,3.4,1.2,-.1,2.7],[9,1.8,.8,-.2,2.4],[11,.2,.15,0,2]],
  shroud:      [[0,1.2,.9,0,2.1],[3,8.8,2.6,.2,3.4],[7,9.6,2.9,0,3.6],[11,7.2,2.4,-.2,3.2],[13,1.6,1.1,0,2.2]],
};
SHIP.sec = function (kind, y) { // catmull-rom over sections — identical sampler to SLV.sec
  const S = SHIP.SEC[kind]; let i = 0; while (i < S.length - 2 && y > S[i + 1][0]) i++;
  const a = S[Math.max(0, i - 1)], b = S[i], c = S[i + 1], d = S[Math.min(S.length - 1, i + 2)], t = U.sat((y - b[0]) / (c[0] - b[0]));
  const cr = (k) => { const p0 = a[k], p1 = b[k], p2 = c[k], p3 = d[k]; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t); };
  return [Math.max(0.03, cr(1)), Math.max(0.05, cr(2)), cr(3), cr(4)];
};
/* Ship.tex(kind): canvas-painted hull skin in the SLV.tex idiom — but Sith:
   'junk'  — patchwork plating, mismatched panels, rust streaks, scorch, bare-metal flecks
   'sith'  — blackened hull, UNREPAIRED battle scars (a trophy), crimson sigil stripes, Jedi-trophy etchings
   'shroud'— matte vantablack, subtle red-edge pinstriping, sensor-dampener hex pattern
   Return { col: CanvasTexture, bump: CanvasTexture } exactly like SLV.tex; 2048², mulberry-seeded per hull. */
/* Ship.build(kind) → THREE.Group with local axes in the SLV convention:
   pose 'land': origin = landing feet on ground, nose +Y;  pose 'fly': nose +Z, canopy +Y, origin hull centre.
   SHIP.pose(g,'land'|'fly',k), SHIP.thrust(g,0..1), SHIP.muzzles(g,[v0,v1]) — copy the SLV implementations. */

SHIP.call = function () { // G pressed (claim KeyG at the same priority SLV used)
  if (!SHIP.on || SHIP.cd > 0 || SHIP.run || PLAYER.state === 'cine' || PLAYER.state === 'dead') return false;
  const H = SHIP.HULLS[SHIP.hull], P = PLAYER.a;
  const dir = { x: Math.sin(P.yaw), z: Math.cos(P.yaw) };      // sweeps in from behind along the look vector
  SHIP.run = { t: -H.delay, ship: SHIP.build(SHIP.hull), dir, fired: 0, charge: null };
  const g = SHIP.run.ship; SHIP.pose(g, 'fly', 1); R.scene.add(g);
  if (!H.stealth) HEAT.add(6);                                  // a visible gun run is a rumor
  HUD.toast('<em>' + SHIP.shipName() + '</em> — strafing run inbound.');
  FX.ring(P.x, P.y + 0.08, P.z, 4, [2.2, 0.3, 0.1], 1.4);
  SHIP.cd = SHIP.CD; SHIP.n.calls++;
  return true;
};
SHIP.shipName = () => ({ harbinger: 'THE HARBINGER', interceptor: 'NIGHTBRINGER', shroud: 'THE SHROUD' })[SHIP.hull];

SHIP.update = function (dt) {
  SHIP.cd = Math.max(0, SHIP.cd - dt);
  const run = SHIP.run; if (!run) return;
  run.t += dt; const H = SHIP.HULLS[SHIP.hull], g = run.ship, P = PLAYER.a;
  if (run.t < 0) return;                                        // inbound delay (Harbinger is SLOW — feel it)
  const d = run.t * H.speed, sx = P.x - run.dir.x * 260, sz = P.z - run.dir.z * 260;
  const x = sx + run.dir.x * d, z = sz + run.dir.z * d, y = LVL.floorAt(x, z) + 14;
  g.position.set(x, y, z); g.lookAt(x + run.dir.x, y - 1.5, z + run.dir.z); SHIP.thrust(g, 1);
  const m = SHIP.muzzles(g);
  while (run.fired < H.bolts && run.t > 0.35 + run.fired * 0.14) { // walk the bolt line up the street
    run.fired++;
    const bx = P.x + run.dir.x * (run.fired * 9), bz = P.z + run.dir.z * (run.fired * 9);
    FX.bolt(m[run.fired % 2], { x: bx, y: LVL.floorAt(bx, bz), z: bz }, 0xff4030);
    DC.after(0.12 * run.fired / H.bolts, () => SHIP.impact(bx, bz, H));
  }
  if (run.t > 0.35 + H.bolts * 0.14 + 0.6) {                    // finisher: Sith beacon charge
    const cx = P.x + run.dir.x * (H.bolts * 9 + 10), cz = P.z + run.dir.z * (H.bolts * 9 + 10);
    SHIP.seismic(cx, LVL.floorAt(cx, cz), cz, H);
    R.scene.remove(g); SHIP.run = null;
  }
};
SHIP.impact = function (x, z, H) { // bolts: damage + ragdoll impulses, reused COMBAT splash helper
  FX.blast(x, LVL.floorAt(x, z), z, 1.6, 0xff5030);
  COMBAT.splash(x, z, H.boomR * 0.5, H.dmg, { from: 'ship' });
};
SHIP.seismic = function (x, y, z, H) { // beat of silence, then the ring — the SLV rhythm, recolored Sith-red
  DC.after(0.5, () => { FX.ring(x, y + 0.1, z, H.boomR * 2.2, [2.6, 0.2, 0.1], 2.2); FX.flash(0.5);
    COMBAT.splash(x, z, H.boomR, H.dmg * 2.4, { from: 'ship', launch: 1 }); CAM.shake(0.9); SHIP.n.strafes++; });
};
/* Extraction: hold G ≥0.8 s inside a valid LZ radius → ship lands (pose 'land' blend), ramp, mission ends.
   Uses the same run object with mode:'extract'; the level provides LVL.extract = {x,z,r}. */
/* Force domination (T): needs SHIP.domination. Marks the nearest enemy gunship/dropship ≤120 m; channel 2.5 s
   (Rathatri kneels, FX.magic columns, HUD focus bar). Success: target's engines flare out, hull crumples
   (scale-shear tween + debris), it drifts down and is added to salvage (+YARD parts, §5.4). Interruption by
   any hit cancels and adds HEAT +10 — Traya warned you. */
SHIP.dominate = function (target) { /* channel → target.state='dominated' → FX.crumple(target) → salvage */ };
/* HUD pips exactly like JET.pip usage in bobafet: */
if (SHIP.on && typeof JET !== 'undefined' && JET.pip) {
  JET.pip('shp', 'G', 'SHIP', () => 1 - SHIP.cd / SHIP.CD);
  JET.pip('dom', 'T', 'DOMINATE', () => SHIP.domination ? 1 : 0);
}
```

### 5.2 p52_cine.js — CUTSCENES (from the Maul implementation)

Two-layer system, copied as shipped:

**Layer A — boot/intro cinematic.** Reuse the `#intro` block verbatim: full-frame letterboxed `<video>` with
`#introGate` (press any key), `#introBar` progress, `#introTitle` animated title card. Re-theme the CSS
animations: title "DARK LEGACY" over a Dxun jungle horizon; the "it-blade" bar becomes a crimson crack of
lightning. User supplies the intro music (engine rule).

**Layer B — in-engine story cutscenes.** The Maul pattern: `PLAYER.state='cine'`, HUD hides,
`body.cine` letterbox (`#lbT/#lbB` grow to 11vh, `#skip` fades in), and camera shots via `CAM.play`. Our
addition is a declarative **shot list + subtitle sequencer** so the whole storyboard in §6 is data, not code:

```js
/* p52_cine.js — CINE: shot-list cutscenes with subtitles, skippable, testable.
   A scene is data: { id, cast:[...names to CAST.need], shots:[ ... ] }. Each shot:
   { dur, from:[x,y,z], to:[x,y,z], look:[x,y,z] | lookFn(t), fov, ease,                  camera
     sub:'Speaker: line', subCol:'#rrggbb',                                               subtitle bar
     act: (t)=>{}, onStart:()=>{}, onEnd:()=>{},                                          per-shot logic
     slowmo, shake, fx }                                                                  feel           */
const CINE = { cur: null, queue: [], n: { played: 0, skipped: 0 } };
CINE.play = function (scene, onDone) {
  CAST.need(scene.cast).then(() => {
    PLAYER.state = 'cine'; HUD.show(false); document.body.classList.add('cine');
    CINE.cur = { scene, i: -1, onDone, t: 0 }; CINE.next();
  });
};
CINE.next = function () {
  const c = CINE.cur, s = c.scene.shots[++c.i];
  if (!s) return CINE.end();
  if (s.sub) CINE.subtitle(s.sub, s.subCol, s.dur);
  if (s.onStart) s.onStart();
  CAM.play({ from: s.from, to: s.to, look: s.look, dur: s.dur, fov: s.fov || 45, ease: s.ease,
             hold: true, onEnd: () => CINE.next() });
  if (s.slowmo) { MG.slowmo = s.slowmo; MG.slowmoT = 0; MG.slowmoDur = s.dur; }
};
CINE.end = function () { // mirrors the Maul chasm-shot teardown
  const c = CINE.cur; document.body.classList.remove('cine'); CINE.subtitle(null);
  PLAYER.state = 'move'; HUD.show(true); CAM.reset(PLAYER.a.yaw);
  CINE.cur = null; CINE.n.played++; if (c.onDone) c.onDone();
};
CINE.skip = function () { if (CINE.cur) { CINE.n.skipped++; CINE.end(); } };  // bound to any-key, debounced 0.5 s
CINE.subtitle = function (text, col, dur) { const el = document.getElementById('cineSub');
  if (!text) { el.classList.remove('on'); return; }
  el.innerHTML = text; el.style.color = col || '#e9dccb'; el.classList.add('on');
  clearTimeout(CINE._st); if (dur) CINE._st = setTimeout(() => el.classList.remove('on'), dur * 1000 + 400); };
/* DOM: add to the shell —
   <div id="cineSub"></div>  with CSS: absolute bottom 14vh center, Cinzel, letterspaced, text-shadow,
   .on opacity transition; lives INSIDE the letterbox band so 2.39:1 framing is preserved. */
/* TRAYA holocron dialogues are CINE scenes whose camera orbits the lit holocron (HOLO material from order66)
   while sub lines carry her riddles; 'choice' shots pause on a 2-option DOM picker that writes
   MG.save.traya.lessons — her "judgments" become gameplay gates (e.g. unlock SHIP.domination). */
```

### 5.3 p53_planet.js — PLANET MISSIONS (from Starfall)

Starfall's genius is **one seeded height function sampled from orbit AND the ground**, so the planet is
watertight at every LOD. We take that verbatim and re-seed per mission world. Full loop:
galaxy map (Dxun command table, §5.7) → guided descent (Starfall's chaptered `prepareRoute` director, HUD
chapter labels) → ground mission on a bounded playable sector → artifact scan/recover → extraction (§5.1).

```js
/* p53_planet.js — PLANET: seeded mission worlds + descent director (from starfall-uncharted-worlds.html).
   Keep Starfall's core untouched: hash/noise/fbm, R=640000, SEA=10, DepthShaderMaterial (log-depth),
   terrainTiles LOD Map, terrainColor biome ramp, atmosphere shell, cloud layer, water plane.
   Our layer is a WORLD TABLE + sector carver + the descent director re-skin. */
const PLANET = {
  WORLDS: {
    dxun:      { seed: 3951, sea: 0.31, biome: 'jungle',  fog: [0x1a2b12, 0.045], sky: 'dxun',      // hub
                 flora: 'dense', beasts: ['cannok','maalraas','boma','zakkeg'], nexus: 1.0 },
    ambria:    { seed: 4400, sea: 0.18, biome: 'wastes',  fog: [0x2b1f14, 0.03],  sky: 'ochre',     // Act II — Betrayal
                 flora: 'sparse', beasts: [], nexus: 0.7, lakes: 'obsidian' },
    raxus:     { seed: 3960, sea: 0.22, biome: 'junk',    fog: [0x24211c, 0.05],  sky: 'smog',      // Act III — Manipulation
                 flora: 'none', beasts: [], ruins: 'cis' },
    krayiss:   { seed: 5100, sea: 0.12, biome: 'crags',   fog: [0x141820, 0.06],  sky: 'storm',     // Act IV — Focused Power
                 flora: 'dead', beasts: ['tukata'], obelisks: true },
    lenico:    { seed: 6660, sea: 0.28, biome: 'shatter', fog: [0x1c1424, 0.07],  sky: 'aurora',    // Act IV/V — Echoes
                 flora: 'twisted', beasts: [], anomaly: true },
    hutta:     { seed: 4260, sea: 0.35, biome: 'swamp',   fog: [0x2a2410, 0.08],  sky: 'hutta' },   // flashback
    onderon:   { seed: 4000, sea: 0.30, biome: 'junglecity', fog: [0x20301a, 0.035], sky: 'iziz' }, // Iziz strike
  },
  cur: null,
};
/* Sector carving: planet-scale heightfield exists for descent/orbit; the playable mission is a bounded
   400×400 m sector whose tiles stream at full LOD and whose props/encounters are authored per mission in
   p58_levels.js. PLANET.enter(id) → builds height sampler from WORLDS[id].seed (same fbm stack as Starfall:
   macro→broad→warp→ridge→ribs), then LVL is rebound to the sampler so PHY, cloth floor clamps and AI all
   work unchanged. PLANET.biomeMat(id) retints terrainColor()'s ramp: Dxun = moss→canopy dark→basalt. */
/* Descent director — Starfall's scenicRoute chapters, re-skinned dark:
   chapters: ['Cold orbit','Cloud breach','The jungle takes the light','Tomb line','Landing corridor','Touchdown']
   Each chapter sets fog/sky lerp + HUD chapter text (the starfall objectiveLabel/objectiveText pattern).
   F anywhere skips to manual control; the route ends on the mission LZ which doubles as §5.1's extract pad. */
/* Artifact hunt loop on-foot: state.scan pulse (Starfall scan) reveals 'echoes' — dark-side residue FX.magic
   columns only visible during pulse (Kreia's 'sense the battlefield' lesson made literal). Dig site →
   CINE recovery shot → artifact added to MG.save.artifacts → HEAT +4 (the echo carries). */
```

### 5.4 p54_yard.js — SHIP WORKBENCH (from Starwright)

Starwright is already a full modular shipbuilder; we re-skin its DOM (Cinzel, bone-and-red palette) and
re-point the module catalogue at our three hulls. **This is a bench inside the Dxun workshop** (p57), not a
separate game: walk to the gantry, press E, enter build mode (Starfall's `state.mode='build'` orbit camera,
explode view, hardpoint overlays — all reused).

```js
/* p54_yard.js — YARD: the Dxun ship workbench. Config schema mirrors starfall-frontier-v2's validate():
   whitelist keys, clamp ranges, versioned localStorage key 'rathatri-ship-v1'. */
const YARD = {
  modules: { // category: [ [name, desc, statDelta], ... ]  — 3 tiers each, unlocked by story/salvage
    hull:    [ ['Scavenged Plating','Patchwork CR90 plate. Blends in, holds little.', {armor:+0}],
               ['Reinforced Hull','Salvaged Interceptor ribs. +armor, +mass.', {armor:+25, agility:-6}],
               ['Infiltrator Frame','Shroud-frame. Sensor-ghost profile.', {armor:+15, stealth:+30}] ],
    drive:   [ ['Limping Sublight','Temperamental. Stalls at the worst moments.', {speed:+0}],
               ['Tuned Ion Array','Interceptor cores. Fast enough to run.', {speed:+22}],
               ['Whisper Drive','Near-silent burn. Stealth approaches.', {speed:+14, stealth:+20}] ],
    weapons: [ ['Deterrent Turrets','Two working lasers. Scares scavengers.', {power:+0}],
               ['Strafe Cannons','Walk a bolt-line up a street. Enables SHIP.call.', {power:+25, call:true}],
               ['Concussion Tubes','Shroud barrage. The finale of a run.', {power:+40, seismic:true}] ],
    utility: [ ['Empty Racks','Room to grow.', {}],
               ['Meditation Crucible','Force-attuned chamber. Ship regen in orbit.', {forceRegen:true}],
               ['Conversion Suite','Where recruits break. Assassin training speed.', {trainK:1.25}] ],
    paint:   [ ['Rust-Born','The color of not being worth shooting.', {}],
               ['Nightbringer','Scorched black. Scarred on purpose.', {fear:+10}],
               ['The Shroud','Sigil-etched void. They will know.', {fear:+25, heat:+5}] ],
  },
  tuning: { hullLength: [.85,1.25], driveScale: [.75,1.3], wingSweep: [-25,25] },  // Starwright sliders, kept
};
/* Stat model & bars: reuse Starwright's updateStats() wholesale (cruise velocity / handling / shield /
   weapon bars + span & mass readouts). Derived stats feed p51 SHIP.HULLS at runtime: hull tier sets the
   base entry, weapons tier enables call/seismic, utility tier enables domination amp, drive scales delay. */
/* Salvage economy: kills by SHIP.dominate + mission salvage crates give 'salvage'; tier costs 6/14 salvage.
   YARD.apply(cfg) → validate(cfg) → rebuild ship group via p51 SHIP.build with hull-section morphs driven
   by tuning sliders (loft sections lerped — same trick as Starfall's buildShip re-run on cfg change). */
```

### 5.5 p55_hunters.js — REPUBLIC COMMANDOS & JEDI HUNTERS (from Order 66)

The Order 66 layer gives us everything: the CLONE armour system (rigid plastoid plates on the shared rig,
merged, cheap), ally/enemy team logic, gunner brains, and the Jedi duelist class. We re-theme the 501st as
**Republic militia commandos** hunting Sith rumors, and build the bounty-hunter pool from Boba Fett cast
techniques.

```js
/* p55_hunters.js — HUNTERS. Enemy types spawn from HEAT thresholds (exposure system, §4).
   HEAT 0–24: beasts only. 25–49: bounty hunter pairs. 50–74: commando fireteams.
   75–89: commandos + a Jedi Knight. 90–100: AIDEN KYROS HUNT CELL (Knight + Master + commandos). */
Object.assign(ENEMY.TYPES, {
  /* Republic militia commando — Order 66 'clone' re-painted: dull plastoid greys/olive, Republic roundel.
     brain:'gunner', moves:'trooper', weapon blaster carbine (CAST.dc15 → era carbine). */
  commando:  { tpl:'commando', hp: 52, brain:'gunner', moves:'trooper', weapon:'carbine', dmg: 8, burst: 3,
               acc: 0.08, range: [6, 16], speed: 3.6, name:'REPUBLIC COMMANDO', col:[0.55,0.6,0.5] },
  commSgt:   { tpl:'commandoSgt', hp: 90, brain:'gunner', moves:'trooper', weapon:'carbine', dmg: 11, burst: 4,
               acc: 0.12, range: [6, 18], speed: 3.8, name:'COMMANDO SERGEANT', col:[0.8,0.5,0.2], drop:'cell' },
  /* Bounty hunters — Boba Fett DNA: jet-dash, whip-cord pull, flamer cone. brain:'hunter' mixes gunner
     spacing with melee lunges; 'carbine' + 'vibro' swap. */
  bhunter:   { tpl:'bhunter', hp: 120, brain:'hunter', moves:'trooper', weapon:'carbine', dmg: 10, burst: 2,
               acc: 0.1, range: [4, 14], speed: 4.4, jet:true, whip:true, name:'BOUNTY HUNTER', col:[1,0.7,0.2] },
  /* Jedi hunters — straight from the BOSS Jedi class; guard/drain/parry/deflect/push kept. */
  jhunter:   { jedi:true, tpl:['jknight','jknightf'], hp: 110, colors:['blue','green'], name:'JEDI HUNTER',
               guard: 40, aggr: 0.65, drain: 8, dmgK: 0.55, hunter:true },
  jseeker:   { jedi:true, tpl:['jknight3'], hp: 70, colors:['green'], name:'JEDI SEEKER', guard: 22, aggr: 0.5,
               drain: 6, dmgK: 0.45, sensesEcho:true },   // senses artifact pulses → converges on dig sites
});
/* hunter brain: gunner + melee hybrid. Patrols between rumor points (HEAT drops markers). If HEAT>60, they
   arrive by dropship — reuse SHIP.run visuals enemy-flipped. Jedi variants use the p31 class with
   hunter:true = they sprint toward the player's Force-power usage echoes (Force use = exposure, see §6). */
/* Commando cast entry (kit idiom — see characters.md): */
CAST.SPECS.commando = { name:'commando', height:1.02, shoulders:1.04, hairRes:0.0024, helm2:'commando',
  gloves:true, hair:null, beard:false, skin:{ tone:0xb07a5a }, cloth:undefined };
CAST.QC.commando = { cullHead:true };
CAST.QO.commando = { cullHead:true, glove:0x14161a,
  parts: [ R_('Body', g([], 0.0, 0.0, 0x4a4f45), { metal:0.1, ns:0.3, env:0.7 }),   // olive drab fatigues
           R_('Arms', g([], 0.0, 0.0, 0x42473e), { metal:0.1, ns:0.3, env:0.7 }),
           R_('Legs', g([], 0.0, 0.0, 0x3a3f38), { metal:0.1, ns:0.3, env:0.7 }),
           R_('Feet_Boots', g([], 0.0, 3.2, 0x1c1e1a), { metal:0.0, ns:0.15, env:0.6 }) ] };
/* Armour plates: call CLONE.armour(T) with a repainted CLONE.plate material (vertexColors 0x6b6f66 plastoid,
   sergeant pauldron 0xb06020). Helmets: clone helm geometry retained — it reads 'armored trooper' in any
   era; add a soft goods cover via a short CLOTH panel for the militia look. */
```

### 5.6 p56_assassins.js — SITH ASSASSIN ALLIES (Order 66 ally code, dark mirror)

```js
/* p56_assassins.js — Vaara, Eren and the Elite Five. class Assassin extends Enemy with team:'hero'
   (the Clone ally class verbatim), plus: loyalty (0–100), dispatch missions, stealth field flicker. */
Object.assign(ENEMY.TYPES, {
  vaara: { jedi:true, tpl:'vaara', hp: 260, colors:['red'], name:'VAARA', guard: 70, aggr: 0.85, drain: 10,
           saberKind:'staff', ally:true, daggers:true, dmgK: 0.8 },     // head assassin, double-blade
  eren:  { jedi:true, tpl:'eren', hp: 300, colors:['red'], name:'EREN RYTHUS', guard: 80, aggr: 0.7,
           drain: 9, saberKind:'staff', ally:true, shield:true, dmgK: 0.85 },
  e5:    { tpl:'e5', hp: 95, brain:'melee', moves:'melee', weapon:'pike', dmg: 14, speed: 4.6, ally:true,
           stealthGen:true, name:'SITH ASSASSIN', col:[0.6,0.1,0.1] },   // force pikes, masks, flicker
});
/* Deployment: at a mission start, spend from the roster (max 2): Vaara/Eren join physically; E5 can be
   'inserted' mid-mission via stealth drop (FX.magic column, 20 s cooldown, costs loyalty if they die).
   Loyalty: +on shared kills/saved them; −if Rathatri executes a failing assassin (allowed — it's very Sith,
   +fear, −loyalty of witnesses; Traya approves in CINE). */
/* Dispatch (map table, p57): send assassins to off-screen missions (silence a rumor = HEAT −15, steal
   salvage +8, recruit a Force-sensitive → new E5 after 3 trainings). Resolve on a timer with a result
   card on return; death chance scales with mission tier. This is the 'network of assassins' pillar. */
```

### 5.7 p57_dxun.js — DXUN BASE (hub level)

Authored level (kit `LVL.def` + KIT shapes), built to the lorebook spec:
- **Approach**: jungle canopy, no clear path; assassin patrols (stealthed E5), beast lairs (zakkeg, boma
  nests act as defense encounters for intruder events).
- **Temple hub**: cracked Sith statues, murals; **command center** (circular stone table, etched sigils,
  Traya holocron focal point, wall maps = the planet-select UI), **workshop** (YARD gantry + artifact
  study bench = upgrade UI), **trophy wall** ( Jedi hilts of defeated hunters — populated by actual kills),
  burial-niche quarters.
- **Landing clearing**: concealed pad with snares/mines props; where SHIP lands for missions.
- **Defense events**: when HEAT ≥ 75 while at base, a hunter raid triggers — ward-stone activation
  minigame (partially-understood Sith wards = timed prompts with malfunction chance, per lorebook).
- Deep below: **Nadd tomb expedition** is a separate mission level (p58), reached via the map.

---

## 6. STORYBOARD — "DARK LEGACY: RATHATRI" (from the lorebook, structured for CINE data)

Era caption on boot: *"3951 BBY. The Sith Triumvirate is ash. The Jedi are few. In the cracks between —
something hungry is growing."* Story is told in five acts; each mission ends at extraction (§5.1) and each
act ends at the Dxun command table with a Traya holocron scene (§5.2).

### ACT I — "SLAVE 426" (tutorial + origin, flashback framing)
*Playable flashback, framed as Rathatri meditating on his scars at the Dxun temple.*

| # | Beat | Type | Content |
|---|---|---|---|
| 1.1 | Cold open | INTRO (Layer A) | Boot cinematic: Hutta arena roar over black; title crack of red lightning |
| 1.2 | The pit | LEVEL (hutta) | Arena behind a cantina; improvised shiv combat = movement/attack tutorial. No Force. Opponents: starved creatures, other slaves |
| 1.3 | Losing fight | LEVEL+CINE | Scripted loss vs 3 opponents → at the brink, first Force surge (rage flare FX, enemies staggered) — "the raw potential Milian senses" |
| 1.4 | Milian's test | LEVEL | Second staged fight; Force-push tutorial disguised as survival |
| 1.5 | The offer | CINE (storage chamber) | Shots: POV hooded guards → Milian stillness close-up → *"You are persistent. Like a parasite that refuses to die."* → choice line (2-option picker, cosmetic) → depart under darkness |
| 1.6 | Years in minutes | CINE montage | Zx34 moon: training shots (bone-handled saber assembly, first crimson ignition, scroll study, pain-channeling). HUD: "YEARS PASS" |
| 1.7 | **Milian dies** | CINE (playable tail) | Aiden Kyros (dual blue) + Padawan Celene Tryst breach the sanctum. Player fights *as Rathatri and loses* (scripted boss, unwinnable — teach the dodge). Milian's death wide shot. Rathatri flees. Title card: **DARK LEGACY** |

### ACT II — "THE DEMON MOON" (Dxun established, power base)
| # | Beat | Type | Content |
|---|---|---|---|
| 2.1 | Crash/junker | LEVEL (dxun) | Arrive in The Harbinger (SHIP.hull='harbinger'); jungle survival tutorial: cannok swarms, maalraas packs; claim lesser-tomb warrens as base (p57 hub unlocks) |
| 2.2 | The Trandoshan deal | LEVEL+CINE | Ambush Bosskarr's slaver party; spare him → life-debt oath scene (Scorekeeper honor dialogue). Reward: access to "merchandise" — first 2 Force-sensitives + slaver intel channel |
| 2.3 | The Starving Beast | LEVEL (dxun jungle) | The recruits' trial, played by *you* escorting/herding: abandon recruits deep in the jungle, cull the weak ones drawn to predators (dark pragmatism tutorial for the roster system) |
| 2.4 | First artifact | LEVEL (dxun, tomb fringe) | Scan/echo tutorial (§5.3): recover **the Corrupted Holocron** (visions mechanic unlocked: flash-cut whispers during combat, +Force regen) |
| 2.5 | Traya | CINE (command table) | Holocron activates. First judgment: *"Your connection to the Force is undeniable… akin to a caged beast."* Upgrade tree unlocks |
| 2.6 | First hunters | LEVEL | HEAT tutorial: bounty hunter pair lands; ambush them or let beasts do it. Trophy wall gets its first hilt |

### ACT III — "ECHOES OF BETRAYAL" (artifact hunt across worlds)
| # | Beat | Type | Content |
|---|---|---|---|
| 3.1 | Ambria | LEVEL (ambria) | Battlefield echoes: rival-Sith duel residues; lesson — betrayal patterns. Artifact: **Tainted Kyber** (rage surge on demand; corruption ticks) |
| 3.2 | The seizure | CINE+LEVEL (space skirmish) | The lorebook's interceptor scene, playable: amid a wreck field, channel **Force Domination** (SHIP.dominate unlock) on a crippled Sith Interceptor → hull crumples → boarding → **NIGHTBRINGER** acquired (SHIP.hull='interceptor'; YARD tier 2 unlocks) |
| 3.3 | Raxus Prime | LEVEL (raxus) | War-mass echo: CIS ruins; HK-47-style databank recovered → **Pattern-Breaker passive** (Jedi parry windows telegraphed to the player) |
| 3.4 | **Celene duel #1** | BOSS LEVEL | She tracks the rumor. Double-bladed Jar'Kai boss. **Scripted near-defeat**: Rathatri survives by beast/trap trickery, not skill. Traya post-judgment: *"Your victories hinge on your victims' mistakes, not your mastery."* → training arc gate |
| 3.5 | Rebuild | HUB + DISPATCH | Study Milian-vs-Aiden combat logs (minigame: pattern analysis); assassin dispatch board opens (§5.6) |

### ACT IV — "THE SHROUD" (mastery, the cult ascendant)
| # | Beat | Type | Content |
|---|---|---|---|
| 4.1 | Krayiss II | LEVEL (krayiss) | Ritual sites; amplify Dxun's nexus. Artifact: **Ritual of Binding** (tame a zakkeg guardian for the base defense events) |
| 4.2 | Lenico IV | LEVEL (lenico) | The anomaly. Sensory-illusion enemies ( clones of Rathatri, false Milian ). Artifact: **Mask of Despair** (fear aura; Jedi seekers lose lock) |
| 4.3 | The Shroud | CINE+YARD | Seven assassins stand in a ring; The Shroud lands (SHIP.hull='shroud'; stealth calls: ship runs add no HEAT) |
| 4.4 | Iziz strike | LEVEL (onderon) | Raid on Onderon for the **Nadd tomb key-fragment**: beast-riders, militia commandos (HEAT 75+ spawn tables), city verticality. First commando fireteam boss: Sergeant + shield wall |
| 4.5 | Nadd's tomb | BOSS LEVEL (dxun) | The iron mausoleum. Orbalisk hazard chambers, Sith spirit guardians. Prize: **Freedon Nadd's holocron shard**. Aiden Kyros feels the echo — hunt cell inbound |

### ACT V — "DARTH" (the title, earned in blood)
| # | Beat | Type | Content |
|---|---|---|---|
| 5.1 | Base siege | LEVEL (dxun defense) | HEAT 100 payoff: Kyros hunt cell assaults the temple. Ward-stone minigame, assassins fall or stand by *your* loyalty numbers, zakkeg guardian unleashed |
| 5.2 | **Aiden Kyros** | BOSS | Dual-blue Battlemaster. Three-phase: duelist → battle-meditation buff → disarm sequence. Win by everything the game taught: terrain, fear, pattern-break, domination |
| 5.3 | Celene choice | CINE+CHOICE | She arrives broken from the enclave plot (Wellspring of Doubt succeeded off-screen via dispatch). Choice picker: **Execute** (trophy, ending A) or **Corrupt** (ending B — she kneels; the cruelest victory) |
| 5.4 | The question of "Darth" | CINE (finale) | Traya's final scene — the lorebook's verdict delivered to *you*: *"Are you ready to murder your own assassins for this hollow title?"* → the player's assassin roster stands in a circle; choice: claim the title over their kneeling loyalty (true ending) or their fear (purge them — dark ending). Credits over the Dxun canopy, the Shroud rising |

**Ending cards** (data, 3 slides each): A "The Reaper of the Rebuild", B "The Corrupter", True "Darth Rathatri", Dark "Alone in the Warrens".

---

## 7. CAST BIBLE — CHARACTER BUILDS (engine specs + Blender production notes)

Engine builds use the kit's three-table format (`CAST.SPECS` / `CAST.QC` / `CAST.QO`). Outfit parts are the
baked Quaternius MCOF set (ranger/peasant families); grades use the `g([], h, s, l_mult)` recolor idiom.
**Blender work is needed only for**: unique heads, unique props, and the three ships' hero geometry — the
engine handles everything else. Blender → bake → `tools/bake_q.js`-style embed path.

### 7.1 RATHATRI (hero — three visual stages, driven by story act)
| Stage | Engine spec | Blender notes |
|---|---|---|
| **I · Slave 426** | `rmale` body ×0.94 height; peasant rags grade (ash grey-brown, worn 3.2); `hair:['Hair_Buzzed']`, skin tone 0x9a6b4f with **scar overlay** (head-space shader mask like CM.maulSkin but lacerations not tattoos); no saber — shiv prop | Blender: scar normal/AO stamp pack (12 scars) painted to a mask texture; malnourished body = UBC mesh with arm/shoulder width ×0.88 morph (export as variant bind pose) |
| **III · Apprentice** | combat leathers: ranger body dyed black (albedo ≥0x13 per kit rule), `Hair_SimpleParted`, crude bone-hilt saber (lathe hilt, bone-white mat), `CLOTH` waist panels | Blender: **bone-hilt lightsaber** — sculpt a curved organic hilt from a horn base mesh; keep to ≤600 tris; lathe-compatible profile preferred so p12 can rebuild it engine-side |
| **V · Hidden Lord** | + dark flowing outer coat = `CLOAK.wear(actor,true)` recolored charcoal-black, right-arm Sith sigil sleeve (shader sigils, emissive crimson on rage), refined bone hilt with kyber glow vent | Blender: **cloak** — DO NOT model folds; export a clean 24-column cape grid mesh with pin vertex-group; runtime cloth is the engine's verlet (§8). Sigil sleeve = separate UV island for the emissive mask |

### 7.2 Key cast (engine specs; QO idiom)
- **Milian (Sith Witch)** — `rfemale`; `Hair_Long` steel-grey (`hairCol 0x9aa0a8`); `CLOTH.mat` new key
  `witch: [0x1a1220, 0x403050, 0.9, 1, 0.5]` full robe + hooded cloak; aged face via skin shader wrinkle
  mask (head-space, like the Maul makeup pass); carries holocron prop not saber. *Blender: Milian's
  holocron + ritual dagger (low-poly, emissive runes).*
- **Aiden Kyros (Jedi Battlemaster)** — `rmale` ×1.06 shoulders; ranger armor tan/steel grade; buzzed grey;
  **dual single sabers, blue** (p12 dual attach — engine supports L/R hilts); scars; no hood — "wears his
  face like a warrant". *Blender: his two matched hilts (worn steel, wrapped grips).*
- **Celene Tryst (Padawan→Knight)** — `rfemale`; jedi robes tan (Act III) → knight greys (Act V);
  `Hair_Buns` auburn; **double-bladed saber, green→green-white**; Jar'Kai-aggressive moveset variant of
  MOV.jedi with staff clips. *Blender: saberstaff hilt, slender, wrap detail.*
- **Vaara (head assassin)** — `rfemale`; layered dark wraps (`thug` grade family), `Hair_Long` dark brown;
  double-bladed **crimson**; vibro-dagger sleeve props (cullHead:false). *Blender: 2 retractable daggers.*
- **Eren Rythus (head assassin)** — `rmale` ×1.1 shoulders; burn-scar head shader (right side + missing
  right forearm → prosthetic: rigid black-metal forearm attachment on the shared rig); armored tunic;
  double-bladed crimson; compact energy shield prop (buckler attach). *Blender: prosthetic forearm + shield.*
- **The Elite Five (E5)** — `rmale`; plain dark tunic/pants grade; **partial mask** (cullHead:false,
  mask shell prop from the kit's headgear idiom); **force pike** (staff prop + shock tip FX).
  *Blender: 1 mask, 1 pike — instanced ×5.*
- **Bosskarr & Trandoshans** — `rmale` ×1.08 height; `cullHead:true` + sculpted Trandoshan head
  (scaled like the Maul head ×1.05); olive flight suits (CLONE family materials), clawed hands (fallback
  fist scale ×1.15); hunting rifle = CAST.dc15 retinted. *Blender: Trandoshan head sculpt → SDF-bake path
  p06 (the Maul head pipeline, parameterised) — or a sculpted mesh skinned to the head bone.*
- **Republic commandos / sergeants** — §5.5 (CLONE armour re-paint).
- **Bounty hunters** — `rmale`; mismatched armor (ranger+peasant mixed parts, three recolor variants);
  helmet shells (kit headgear); jet-dash trails reuse JET. *No Blender needed.*
- **Jedi hunters/seekers** — withdrawn order66 Jedi templates with `hunter:true` (§3.7); seekers get a
  hooded `CLOAK` variant. *No Blender needed.*

### 7.3 Blender production list (the full ask, prioritized)
1. **P0** Bone-hilt lightsaber (Rathatri), Aiden's paired hilts, Celene's saberstaff, assassin pike,
   Vaara daggers, Eren prosthetic + shield, E5 mask. *(All ≤600 tris, lathe/profile-friendly.)*
2. **P1** Trandoshan head, Milian holocron + dagger, Trandoshan ceremonial mask (trophy), Freedon Nadd
   tomb hero props: sarcophagus, orbalisk cluster, ward stone, ritual altar.
3. **P2** The three ships' hero shells (Harbinger/Nightbringer/Shroud) — build directly against the
   superellipse section tables in §5.1 so engine lofts and Blender meshes match silhouettes.
4. **P3** Dxun dressing: cracked Sith statue set (3), mural reliefs (2, for normal-bake), jungle megatree
   kit, boma/zakkeg/drexl creature sculpts (creatures use the SDF-sculpt path; Blender only if quality
   demands).
5. **Export conventions**: GLB, +Y up, metres; textures 1024² max per prop; cloth meshes as pinned
   vertex-group grids (never baked folds); sabers with origin at grip; ships with origin at landing feet.

---

## 8. VERTEX CLOTH — RESEARCH & DECISION

**Question asked:** what's the best vertex cloth available for this game?

**Decision: keep the engine's own verlet cloth (kit `p11_cloth.js` + `p11b_cloak.js`) as the runtime cloth,
and add a Blender-baked path for cinematic-only drapes.** Rationale, from current research:

| Option | Verdict |
|---|---|
| **Kit verlet panels/cloak (in-engine, CPU)** | ✅ **Primary.** Already proven in the shipped Maul/Order66 games at 60 fps: per-column pinning, leg/hip collision, drape-at-speed, vehicle-frame carry. Rathatri's coat, assassin robes, Milian's robes, Jedi hunter robes all ride this. Zero new risk. |
| **Blender cloth → MDD point cache → shape keys → GLB morphs** | ✅ **Secondary, cinematics only.** The 2025-established pipeline (Blender cloth sim → apply modifiers → export NewTek MDD → re-import as per-frame shape keys → export glTF with Shape Keys + Animations → play via THREE.AnimationMixer). Use for pre-rendered-feel moments: Milian's robes in death close-ups, the Act V gathering of seven. Never for gameplay — morphs can't react to the player. |
| **WebGPU compute PBD cloth** (MIT reference: `g30613740/cloth_sim` — pure WebGPU PBD, verlet integration, GPU normal recalc) | ⚠️ **Watchlist only.** The engine is pinned to three.js r160 classic WebGL2; a WebGPU solver would split the renderer. Revisit only if robes exceed ~40 dense panels (they won't — assassins use sparse panels by design). |
| **GPGPU verlet via GPUComputationRenderer (WebGL)** | ⚠️ Fallback if CPU cost ever matters: it can simulate but constraint iterations can't observe same-pass neighbor updates, which is why quality plateaus; our per-column CPU solver is already the better trade at our panel counts. |
| **VAT (vertex animation textures)** | For background crowds only (arena crowd in Act I, enclave masses) — bake Blender sims to VAT for near-zero CPU. Optional polish, not a launch dependency. |

**Cloth traps already solved by the kit (do not regress):** carry panels per column or spins flare them;
on vehicles set `inst.drape` and step cloth in the vehicle frame (a stale frame costs 17 ms/frame and reads
as teleporting); refresh `actor.floorY` on vehicles; black cloth albedo must be ≥ sRGB 0x13 with the narrow
rim (pow 7 × 0.55) or it greys edge-on; dim saber light near black cloth (`saber.lightK`) so the blade
doesn't paint the coat red in hero shots.

**Blender cloth export recipe (for the cinematic path):** simulate at quality 10–15, pin top edge vertex
group, bake → apply modifiers + all transforms → export MDD at 24 fps → import MDD (creates shape keys) →
export GLB with Shape Keys + Animations → in-engine `AnimationMixer`, `clampWhenFinished`, `LoopOnce`.

---

## 9. BUILD ORDER FOR THE AGENT (milestones)

| MS | Deliverable | Contents | Gate (must pass before next) |
|---|---|---|---|
| **M0** | Scaffold | `new_project.sh`, stock build, 25/25 tests green | untouched kit passes |
| **M1** | Hero | p50: Rathatri stage-III build on `rmale`, crimson saber, moveset (MOV.rathatri = Maul base re-keyed: 5-hit combo, dash-lunge, saber throw, choke), coat cloth | sc_wardrobe lineup shot; sc_jank clean; sc_fist <2 cm |
| **M2** | Hunters | p55: commando + bounty hunter + Jedi hunter types; HEAT meter + spawn tables | sc_cast lineup; ?test combat survival |
| **M3** | Dxun hub | p57 base level (jungle approach, temple, command table, workshop, landing pad) + p56 assassin allies | sc_play_all hub walk; raid event triggers at HEAT 75 |
| **M4** | Ship-call | p51: three hulls, G strafe, extraction, HUD pips | call/land/dominate in test level; SLV-parity feel |
| **M5** | Cutscenes | p52 CINE + intro re-skin; Traya holocron scene w/ choices | Act I scenes 1.5/1.7 play & skip clean |
| **M6** | Planets | p53: world table, descent director, scan/echo artifact loop; Ambria first | orbit→ground→dig→extract loop on one world |
| **M7** | Shipyard | p54 YARD bench in workshop; tier unlocks; salvage economy | config persists; stats feed SHIP.HULLS |
| **M8** | Campaign | p58 acts I–V levels + bosses (Celene ×1 unwinnable, Kyros 3-phase) + endings | full campaign bot run (sc_play_all) |
| **M9** | Polish & ship | cloth bake pass for cinematics, VAT crowds, perf pass, final tests | 60 fps @1080p, CPU <5 ms, all tests |

## 10. ACCEPTANCE TESTS (extend p85; keep the kit's 25)

1. `?test` boots, every act level loads and is walked by the bot (kit harness).
2. SHIP: call → strafe → seismic → cooldown; extraction from LZ; domination success and interruption paths.
3. HEAT: witness kill raises; dispatch lowers; 75+ spawns commandos; 100 triggers the Kyros cell at base.
4. CLOTH: coat panels never invert during the 5-hit combo + dash + Force-dash (sc_jank); cloak drapes at
   vehicle speed during any ride segment.
5. CINE: every scene in §6 plays start-to-end and skips; subtitles stay inside the letterbox at 16:9 and 21:9.
6. PLANET: orbit and ground height samples agree (Δ < 0.5 m) at 100 random sector points per world.
7. SAVE: artifacts, ship cfg, roster, HEAT survive reload; versioned keys migrate.
8. Perf: 60 fps @1080p in the densest fight (Kyros cell siege, M9).

## APPENDIX A — DEFAULT CONTROLS
WASD move · mouse camera · LMB attack (5-hit combo) · RMB heavy/whirlwind · Space jump/double-jump ·
Shift dash-lunge · F Force push · C Force choke (hold) · V rage surge (Tainted Kyber) · X saber throw ·
E interact/board/dig · Q execution (on staggered) · **G ship strafe / hold at LZ = extraction** ·
**T Force domination** (marked enemy ship) · Tab scan pulse (artifact echoes) · 1–2 assassin commands ·
Esc pause.

## APPENDIX B — SAVE SCHEMA (v1)
```json
{ "v": 1, "act": 3, "heat": 42,
  "artifacts": ["corrupted_holocron", "tainted_kyber"],
  "ship": "interceptor",
  "shipCfg": { "hull": 1, "drive": 1, "weapons": 1, "utility": 0, "paint": 1, "hullLength": 1.0, "driveScale": 1.0, "wingSweep": 0 },
  "assassins": { "vaara": { "loyalty": 80, "alive": true }, "eren": { "loyalty": 74, "alive": true },
                 "e5": [{ "loyalty": 60, "alive": true }] },
  "traya": { "lessons": ["beast", "betrayal"], "judgments": ["caged_beast"] },
  "endingsSeen": [] }
```

## APPENDIX C — FILE MANIFEST FOR THE AGENT
- `game-character-kit.zip` — the engine (base; ships with this master file)
- This file — plan, code, storyboard, cast, tests
- Source games (user's copies) for transplant reference: `bobafet.html` (SLV ship-call), `order66.html`
  (CLONE armour, ally class, HOLO, temple kit), `darth-maul-sith-apprentice.html` (CINE camera, intro,
  Jedi boss), `starfall-uncharted-worlds.html` (planet gen, descent director), `starwright.html` (ship UI)

*End of master build file. Build it in shadow. Let them send their hunters.*
