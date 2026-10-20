# MASTER BUILD — ADDENDUM v1.1 (supersedes `source/MASTER_BUILD_v1.0.md` wherever they differ)

This is the contract document for every agent and part. v1.0 stays the vision/storyboard; this file fixes its errors, adds the systems it
lacked (touch controls, real space flight, progression, save/campaign spine, part contracts) and is the **only** place cross-part
interfaces are defined. If you need an interface that is not here, ask the lead — do not invent one in your part.

---

## A. CORRECTIONS TO v1.0 (era & continuity)

Research is in `docs/lore/01–05`. Where lore and v1.0 disagree, **the user's lorebook wins**, then these corrections, then v1.0.

| v1.0 said | Fix |
|---|---|
| Raxus Prime "CIS ruins" (`ruins:'cis'`) | CIS is ~3,900 years in the future. Raxus Prime = **the Reaper Ring / the Heap**: crater of a Great Sith War battle with a buried Sith war-droid foundry. World flag `ruins:'war_mass'`. See `lore/03` §5. |
| "Republic commandos", DC-15 carbines, clone armour, "501st" | No clones/Imperials. Enemy faction = **Republic Army soldiers / Frontier Militia** in Mandalorian-War-era plastoid-and-fabric kit with open or visored helmets; blaster *carbines* (`carbine`), never "DC-15". Reuse the engine's CLONE plate meshes **re-painted and re-silhouetted** (no Phase-II bucket, no white/blue). Internal ids may stay `commando`. |
| Boba-Fett-tech bounty hunters | Rename in-game: **freelance bounty hunters** (Mandalorian-style salvage armour, jetpack dash). Keep mechanics. |
| "HK-47 databank" (Raxus) | Revan's HK-47 is not usable here → "an **assassin-droid databank** of the old Mandalorian Wars" (name unspecified). Pattern-Breaker passive stays. |
| Dxun "Nihilus's staging base 3951" | Reworded to "Sith loyalists occupied Nadd's tomb". Tomb architecture (tiers, spiked bastion, trench) is **[D]esign** not canon — fine for a game. |
| Ambria = Act II (§5.3 table) | **Act III** (storyboard wins). Ambria = glass/obsidian wastes around a caged dark-side obelisk (`lore/03` §4). |
| Krayiss uses `tukata` in §5.3, zakkeg in storyboard 4.1 | Krayiss II enemies = **tukata hounds**; the *Ritual of Binding* learned there is **used** on a Dxun **zakkeg** at the base siege (Act V). |
| Lenico IV "anomaly" | Echo = the old **Ortolan massacre** (stolen minds) → sensory-illusion enemies (mirror-Rathatri, false Milian). |
| "Battlemaster" as rank | Lorebook's term wins; in dialogue Kyros is "the Battlemaster". |
| Celene/Rathatri "young" | **All characters are adults**: Rathatri enters the pit at ~19–20 (shown 20s), Celene ~23, Vaara/Eren 35, Elite Five 25–34. No sexual content anywhere in the game. |
| Desktop controls (Appendix A) | **Touch only** — §B. |
| No sound except the user's intro | **Unchanged: the game is silent.** Only an optional user-supplied `intro/intro.mp4` (embedded by `build.sh --ship`). Never add WebAudio/oscillators/`Audio`. |

---

## B. TOUCH CONTROLS (built — `parts/p01b_touch.js`; do not re-implement)

Landscape only (portrait shows a rotate prompt). Two-thumb layout, sizes in `u` (≈ thumb button, auto-scaled to the phone):

- **Left**: floating joystick (appears under the thumb in the left 42%). Writes `TOUCH.jx/jy` → `IN.A.mx/my` (camera-relative move).
- **Right (empty space)**: drag = camera (`IN.A.lx/ly`); **double-tap** = lock-on toggle.
- **Primary arc** around STRIKE: HEAVY, GUARD (hold), JUMP, DASH. **Force arc** further out: PUSH, CHOKE (hold), THROW.
- **Contextual** (appear only when relevant): `ctx` USE/EXECUTE (when `LEVEL.cur.prompt` is set or `PLAYER.execTarget()`), RAGE (rage meter full), SHIP (`SHIP.avail()`), SCAN (`SCAN.on`). Top-right: LOCK, PAUSE.
- Buttons raise the engine's **existing action names** (`IN.hit/down/take/peek('attack'|'heavy'|'jump'|'dodge'|'block'|'push'|'grip'|'throw'|'lock'|'rage'|'pause')`) plus new ones: `interact`, `ship`, `scan`, `dominate`, `fire`, `boost`, `roll`, `missile`, `brake`, `skip`. **New gameplay code reads `IN.*('<action>')` only** — never `IN.keys`, never `KeyboardEvent` codes, never `IN.mb`.
- Modes: `TOUCH.want = 'ground' | 'space' | 'none'` (set by the flow). Cooldown rings: `TOUCH.cd.<key> = () => 0..1` (0 ready).
- UI hints/prompts must use `IN.keyLabel('<action>')` (renders a button chip like `STRIKE`), never "press W/E/Space/click".
- Haptics: `TOUCH.buzz(ms)`. User settings: `TOUCH.cfg` (size, opacity, lefty, sens, invertY, haptics, autoBlock) persisted under `rathatri-settings`.
- DOM menus (`.menu`, `.tm` etc.) are tap-driven via normal `click`; touch targets ≥ 44 px; no hover-only affordances.

---

## C. CANONICAL MISSION TABLE (ids are law — tests, save and menu key off them)

`kind`: `level` (LEVEL.def id in `ref`) · `space` (SPACE.def id) · `cine` (CINE scene id) · `hub`.

| id | Act | kind | ref | summary |
|---|---|---|---|---|
| `a1_pit` | I | level | `hutta_pit` | Pit tutorial: shiv fights → scripted loss → first Force surge → Milian's staged test (push tutorial) |
| `a1_offer` | I | cine | `1_5_offer` | Storage chamber: Milian's offer ("parasite") |
| `a1_zx34` | I | level | `zx34_sanctum` | Training montage cine → Kyros+Celene breach; unwinnable duel; Milian dies; flee. Title card |
| `a2_flight` | II | space | `sp_zx34_escape` | Escape Zx34 in the Harbinger; flight tutorial; arrive Dxun |
| `a2_landing` | II | level | `dxun_landing` | Crash-landing; cannok/maalraas survival; claim the warren |
| `a2_slavers` | II | level | `dxun_ambush` | Ambush Bosskarr's party; spare him → life-debt oath (cine) |
| `a2_beast` | II | level | `dxun_trial` | "The Starving Beast": herd/abandon recruits, cull the weak |
| `a2_holocron` | II | level | `dxun_fringe` | Scan/echo tutorial → Corrupted Holocron → Traya awakens (cine) |
| `a2_hub` | II | hub | `dxun_hub` | Temple hub (command table, workshop/yard, study bench, trophy wall, dispatch). Revisitable every act |
| `a2_hunters` | II | level | `dxun_hunters` | HEAT tutorial: first bounty hunters; first trophy |
| `a3_ambria` | III | level | `ambria` | Glass wastes; betrayal echoes; **Tainted Kyber** (rage) |
| `a3_wreck` | III | space | `sp_wreck_field` | Wreck field; Force-**Dominate** the Interceptor → **Nightbringer** |
| `a3_raxus` | III | level | `raxus` | The Heap; assassin-droid databank → **Pattern-Breaker** |
| `a3_celene` | III | level | `celene_arena` | Celene duel #1 (scripted near-defeat; survive by trap/beast trickery) |
| `a4_krayiss` | IV | level | `krayiss` | Ritual sites; **Ritual of Binding** (tukata hounds) |
| `a4_lenico` | IV | level | `lenico` | Illusion enemies; **Mask of Despair** (fear aura) |
| `a4_shroud` | IV | cine | `4_3_shroud` | Seven assassins in a ring; **The Shroud** lands |
| `a4_approach` | IV | space | `sp_iziz_approach` | Stealth run past Republic picket ships in the Shroud |
| `a4_iziz` | IV | level | `iziz` | Raid Iziz for the Nadd key-fragment; militia fireteam boss |
| `a4_nadd` | IV | level | `nadd_tomb` | Tomb dungeon (6 chambers); Nadd's holocron shard |
| `a5_orbital` | V | space | `sp_dxun_orbit` | Defend Dxun orbit vs Kyros' hunter-cell dropships |
| `a5_siege` | V | level | `dxun_siege` | Base siege; ward-stone minigame; bound zakkeg |
| `a5_kyros` | V | level | `kyros_arena` | Aiden Kyros, three-phase boss |
| `a5_finale` | V | cine | `5_3_celene`,`5_4_darth` | Celene choice, the "Darth" choice, four endings (see `lore/05`) |

Optional (post-hub unlock): `x_pit` (Hutta Pit survival waves for Essence), `x_contract_*` (random space skirmish), assassin **dispatch** board (§E).

Stage levels for cutscenes (small LEVEL.defs, `kind:'stage'`): `st_storage`, `st_zx34_hall`, `st_shroud_ring`, `st_oath`, `st_command`.

---

## D. GLOBAL STATE & INTERFACES

All parts share one global scope (concatenated). Names below are reserved; each has exactly one owner part.

```js
/* p30a_save.js (lead) */
SAVE.d   // live save object, schema below. SAVE.load() / SAVE.store() / SAVE.reset(). Always mutate SAVE.d then SAVE.store().
// schema v2 (localStorage 'rathatri-save'):
{ v:2, act:1, mission:'a1_pit', done:{<missionId>:{rank,t}}, essence:0, salvage:0, artifacts:[<id>],
  powers:{push:0,grip:0,throw:0,rage:0,breaker:0,fear:0,mask:0,dominate:0,bind:0},   // 0 = locked, 1-3 ranks
  ship:'harbinger', shipCfg:{hull:0,drive:0,weapons:0,utility:0,paint:0,hullLength:1,driveScale:1,wingSweep:0},
  heat:0, assassins:{vaara:{loyalty:50,alive:true,away:null}, eren:{loyalty:50,alive:true,away:null}, e5:[{id,loyalty,alive,away,trained}]},
  traya:{lessons:[],judgments:[]}, choices:{}, codex:{<id>:1}, endings:[], stats:{kills:0,deaths:0,time:0}, cps:{<levelId>:n} }

/* p30b_campaign.js (lead) */
CAMPAIGN.M[id]                 // the table in §C
CAMPAIGN.start(id)             // pre-cine → load level/space/scene → MISSION context
CAMPAIGN.available()           // [missionIds] playable from the command table now
MISSION.cur                    // {id, def, t0}
MISSION.obj(text)              // = HUD.obj + remember for pause menu
MISSION.complete(res)          // res: {rank?:'S'|'A'|'B'|'C', note?}. Level code calls this when its goal is met. Rewards/saving/next-step handled for you.
MISSION.fail(reason)           // → death/retry menu
LEVEL.interactable(x,y,z,r,label,fn,opts)   // (lead, p24c) proximity prompt; USE button calls fn(); opts.once, opts.show()

/* p52_cine.js (lead) */
CINE.def(id, scene)            // scene = { level:'st_storage'|null, cast:['milian',...], stage:[{id,cast,pos:[x,y,z],yaw,clip,prop?}], shots:[shot] }
shot = { dur, from:[x,y,z], to:[x,y,z], look:[x,y,z] | lookTo:[x,y,z], fov, ease, sub:'WHO|line', subCol,
         act:[{who,clip,pos?,yaw?,face?}], fx:'flash'|'shake'|'saber'|..., slowmo, onStart, onEnd, choice:{A:'label',B:'label',key:'saveKey',next:{A:'sceneId',B:'sceneId'}} }
CINE.play(id, onDone)  CINE.skip()  CINE.cur
/* p52b+ scene DATA parts (agents) only call CINE.def(...). Dialogue text comes from docs/lore/script.json (<=22 words per line). */

/* p50b_heat.js (lead) */
HEAT.val  HEAT.add(n,why)  HEAT.sub(n)  HEAT.tier()  // 0:0-24 beasts, 1:25-49 hunters, 2:50-74 fireteams, 3:75-89 +Jedi, 4:90+ Kyros cell
HEAT.table(L)                  // → list of [type,x,z,opts] hunter spawns appropriate to tier around the player; level code may use or ignore

/* p59a_codexdata.js (generated by tools/gen_codex.py from docs/lore/codex_*.json) + p59_codex.js (agent) */
CODEX.data[id]  CODEX.unlock(id)  CODEX.has(id)  CODEX.open()   // UI panel in pause menu; toast "CODEX UPDATED" on unlock

/* p60_space.js (lead) */
SPACE.def(id, def)  SPACE.start(id, onDone)  SPACE.on  SPACE.player  SPACE.domReady()  SPACE.update(dt)
def = { name, brief, hull:'harbinger'|'interceptor'|'shroud', env:{sky,planet:{r,x,y,z,tex,atmo},debris:{n,kind},fog,sun}, 
        spawn:[{t, type, n, at:'front'|'rear'|[x,y,z], opts}], objectives:[{id,type:'destroy'|'reach'|'survive'|'dominate'|'escape'|'evade', ...}],
        onStart, onUpdate(dt), onComplete(res) }
SPACE.TYPES[type] = { hull:'<loft kind>', hp, speed, turn, guns:[...], ai:'fighter'|'turret'|'capital'|'freighter'|'dropship', score, name }
/* hull models live in p51_ship.js (SHIP.build(kind) → THREE.Group). The same loft kinds are used by SPACE for enemies. */
```

**`TOUCH.want`**: ground levels `'ground'`, `SPACE.start` sets `'space'`, cinematics/menus `'none'` (flow handles it).

**Level contract (ground)**: `LEVEL.def('<id>', {name, chapter, start:[x,y,z,yaw], checkpoints, cast:[...], tex:[...], killY, build(L), update, onStart, mission:{...}})`
exactly as the engine (see `docs/api/E`). The level calls `MISSION.complete()` at its end — **not** `GAME.next()`.

**Enemy contract**: new types are added with `Object.assign(ENEMY.TYPES, {...})` in their own part; names per v1.0 §5.5/5.6 with the era corrections in §A.

**Mobile level rules** (enforced by review): ≤ 14 live enemies at once (≤ 7 Jedi-class), ≤ 150 draw calls, ≤ 450k tris total scene, ≤ 1 shadow-casting light, no per-frame allocation in `update`, arena ≤ ~120 m across for set-piece levels, a mission should take 4–9 minutes, **a checkpoint at every major encounter**, a clear on-screen objective (`MISSION.obj`) at every moment.

---

## E. PROGRESSION (Study Bench in the hub; Essence = soft currency)

**Essence**: kills (style-rank scaled), artifacts, mission rank, echoes found. **Salvage**: space kills/wrecks → Yard (v1.0 §5.4).
Force powers (`SAVE.d.powers`, 0 = locked, ranks 1–3 bought with Essence; unlock source in brackets):

| power | effect (rank 1 → 3) | unlocked by |
|---|---|---|
| `push` | Force push: damage/radius/cooldown | tutorial 1.4 |
| `grip` | Choke: duration, damage over time, throw | `a2_holocron` (Traya) |
| `throw` | Saber throw: range, return speed, multi-hit | `a2_holocron` |
| `rage` | Rage surge (meter fills by combat): duration, lifesteal | `a3_ambria` Tainted Kyber |
| `breaker` | Pattern-Breaker: telegraphed Jedi parry windows, perfect-parry stagger | `a3_raxus` |
| `fear` | Fear aura: enemy accuracy ↓, Jedi seekers lose lock, nearby weak foes flee | `a4_lenico` Mask of Despair |
| `mask` | Force-masking: HEAT gain ↓ 25/50/75 % | Traya lesson, `a3_celene` aftermath |
| `dominate` | Ship domination (space) — hold time ↓, range ↑ | `a3_wreck` Traya lesson |
| `bind` | Ritual of Binding: summon the bound zakkeg in sieges | `a4_krayiss` |

**Assassin dispatch** (hub): send Vaara/Eren/E5 on timed off-screen missions (silence rumor: HEAT −15; salvage run: +8 salvage; recruit: new E5 after 3 trainings). Death chance by tier; result card on return. Timers run on real play time (`SAVE.d.stats.time`), not wall-clock.

**Style combos** unlock by Celene aftermath: *Beast* (lunge/ambush bonuses), *Duelist* (parry chains), *Predator* (execution speed). One selectable at a time from the pause menu.

---

## F. SPACE (the missing half of v1.0) — design

Arcade free-flight tuned for thumbs (Rogue-Squadron-lite):

- **Controls**: left stick = pitch/yaw rate (auto-bank), `FIRE` hold (auto-aim cone ~8° + lead indicator), `BOOST` hold (FOV kick; drains a meter), `BRAKE` hold, `ROLL` tap (barrel roll = brief i-frames, deflects bolts), `MISSILE` tap (needs a lock; lock builds while the reticle sits on a target), `DOMINATE` hold (only when a **crippled** target is marked; 2.5 s channel, interrupted by hit → HEAT +10).
- **Camera**: chase cam with lag + look-ahead; 3-quarter rear; FOV 62 → 80 on boost.
- **HUD**: hull/shield bars, boost meter, target brackets, off-screen arrows, objective line, radar disc; all in the DOM overlay (reuse `#hud` styling).
- **Enemies** (`SPACE.TYPES`): `trandoFreighter` (turrets), `militiaFighter`, `jediStarfighter` (fast, evasive), `hunterDropship`, `pickets` (static sensor ships for stealth), `interceptor` (the dominate target), `capital` (backdrop; scripted guns).
- **Stealth mode** (Shroud missions): enemy sensor cones; entering one raises an alert meter; full meter = fail/combat.
- **Planet/sky**: stylised procedural planet sphere + atmosphere rim + starfield + nebula (reuse Starfall textures in `assets/extra/`), debris fields instanced (≤ 200 meshes).
- **Hyperspace transition** between map selection and arrival: 2.5 s tunnel shader, skippable.
- **Descent** to ground missions is a short scripted cinematic (orbit → cloud breach → canopy → touchdown), not a full LOD planet — mobile budget. The seeded heightfield from Starfall is used for **ground mission terrain** (`PLANET.WORLDS` seeds).
- **SHIP-CALL on ground levels** (v1.0 §5.1) is kept: `SHIP.avail()` true only on levels that allow it.

---

## G. QUALITY TIERS (mobile GPUs)

`QUAL.tier` 0 low / 1 med / 2 high; auto-picked (`?q=0|1|2` overrides). Tier 0 (phones): render scale ≤ 0.75·DPR (cap DPR 2), bloom at ¼ res/2 passes, shadow map 1024 one cascade, particle caps ×0.5, SDF/cloth detail ↓, 30-fps-tolerant dynamic scaler. See `docs/api/A`.

---

## H. PART NUMBERING & OWNERSHIP

| Range / part | Owner | Notes |
|---|---|---|
| p00–p42 (kit) | lead edits only | agents propose changes; lead applies. Maul-only levels/cast are deleted at integration (p40*, p41*, p42, p15c/d goodguys) |
| p01b_touch, p02 mobile tier | **lead** | built |
| p27b_hud_mobile, p28_menu(+head.html CSS) | UI agent | Rathatri skin, touch menus, codex/settings/skill-tree/galaxy UIs |
| p30a_save, p30b_campaign, p24c_interact, p52_cine | **lead** | |
| p50_sith (hero), p50b_heat | **lead** | |
| p51_ship (hulls + ship-call) | agent | |
| p52b/c/d.. scene data | agents | one part per act: p52b_a1.js … p52f_a5.js |
| p53_planet (descent + worlds) | agent | |
| p54_yard | agent | |
| p55_hunters, p56_assassins | agents | |
| p57_dxun (hub), p58a…p58z levels | agents | **one part per level**, named `p58<letter>_<levelid>.js` |
| p59_codex (+p59a data) | agent / generated | |
| p60_space (core), p61_space_missions, p62_galaxy | **lead** / agents | |
| p85_tests | agents append sections | lead owns the harness skeleton |

Never edit a part you do not own. Never rename engine APIs; extend them. No new top-level name may collide (`tools/dupcheck.py` runs in the build).

---

## I. HARD RULES (every agent)

1. Plain JS parts in the engine idiom; one script scope; **no ES modules, no `</script`, no network/CDN, no `eval`, no inline event attributes with user data.**
2. **Silent game**: no audio of any kind.
3. **Adults only; no sexual content.** Violence/dark themes per v1.0 at a Star-Wars tone.
4. Touch-first: no keyboard/mouse prompts, no hover-only UI, text ≥ 12 px (CSS) at 844×390, targets ≥ 44 px.
5. Mobile perf budget §D / §G; reuse geometries/materials; no per-frame allocation in hot paths.
6. Reuse before writing: engine API docs `docs/api/*`, lore `docs/lore/*`, reference source games (see `AGENT_BRIEF.md`).
7. Do not run `git`. The lead commits.
8. Leave nothing half-working: if a feature is cut, remove its UI/entry points.

---

## J. NETLIFY

`/netlify.toml` publishes `dist/` (the single built `index.html`, committed). No build command is required, so deploys cannot fail on tooling; `dist/_headers` sets long-cache + security headers + correct MIME for the large file; `dist/_redirects` falls back to `index.html`. Rebuild with `rathatri/build.sh --ship`.
