# AGENT BRIEF — read this first (≈5 min), then your task

You are one of several coding agents building **DARK LEGACY: RATHATRI**, a mobile-first, touch-only, single-file three.js (r160) action game
(Star Wars Legends, Old Republic, c. 3951 BBY; fan-made, non-commercial). The lead integrates your work. Other agents are editing **other files at the same time**.

## 1. Read, in this order
1. `docs/MASTER_BUILD_ADDENDUM.md` — **contracts, mission ids, ownership, hard rules. Binding.**
2. `docs/api/<your letters>.md` — engine API reference (A core/render · B rig/chars · C cloth/saber/anim/cast · D cam/actor/player/combat/AI · E kit/level/HUD/menu/game). Read the ones your task names; skim the rest.
3. The lore files your task names (`docs/lore/01–05`, `script.json`, `codex_*.json`). `docs/source/MASTER_BUILD_v1.0.md` is the original vision doc (the addendum overrides it). `docs/source/LOREBOOK.txt` is the author's continuity — it wins on story.
4. Reference games (read-only, already split into parts, big blobs removed): `/tmp/claude-0/-home-user-Sandbox/4a9ef7ba-a209-5673-8e8d-37bf6d3aa5b1/scratchpad/src/{bobafet,maul,order66,starfall,starwright}/` (`pNN_name.js`, `_script02.js` for Starfall, `_styles.css`, `_body.html`). Extracted textures: `.../scratchpad/assets_extracted/{bobafet,starfall}/`. **Copy-and-retheme code from these; do not rewrite what exists.** Never copy any Meta-Pixel/tracking snippet.

## 2. Repo & commands (everything under `/home/user/Sandbox/rathatri/`)
- Engine parts: `parts/pNN_name.js` — concatenated in **C-locale name order** into ONE script (shared global scope; no modules; top-level `const/let/function/class` names must be unique across all parts — `tools/dupcheck.py` fails the build otherwise). `head.html` = HTML/CSS shell. `assets/` = embedded binaries.
- **Build to YOUR OWN output file (never share one):** `OUT=/tmp/<yourname>/game.html ./build.sh`  (also runs syntax/dup/GLSL checks).
- **Run/screenshot:** `BUILD=/tmp/<yourname>/game.html MOBILE=1 FRAMES=60 NAME=shot1 node tools/shot.js tools/sc_snap.js /tmp/<yourname>/out "?play=<levelId>&nointro"` then **Read the resulting .jpg** to look at it. `MOBILE=1` = 844×390 touch phone. Software GL is slow (~3 fps at full res): keep FRAMES small (30–120), use `?norender` for pure-logic tests (no drawing).
- **Headless logic test pattern** (see `tools/sc_test.js`, `p85_tests.js`): `QUIET=1 BUILD=… node tools/shot.js tools/<your_scenario>.js /tmp/<yourname>/out "?play=<id>&nointro&norender"`; inside a scenario use `H.eval(() => …)`, `H.step(n, dt)` (advances the game n frames headless), and read results back. **`H.eval` takes ONE function and ONE argument.**
- Touch input in tests: `MOBILE=1` + `H.touch.down(id,x,y) / move / up`, `H.tap(x,y)`; or set `IN.keys.T_<action>=true; IN.pressed.T_<action>=true; IN.buf.<action>=MG.rt` directly in `page.evaluate`.
- Debug level for engine work: `?play=test_arena`. `?dbg` shows fps; `?q=0|1|2` quality tier.
- **Do not run `git`.** Do not touch files you do not own (addendum §H). Do not edit `docs/MASTER_BUILD_*`. Put scratch files under `/tmp/<yourname>/`, never in the repo.

## 3. Engine idiom (match it)
Plain ES2020 JS, 2-space indent, dense one-line-per-idea style, short comments that say *why*. Helpers: `clamp sat lerp damp smooth wrapA dampA easeIO rnd rndi pick V3 _v1.._v5 _q1 TAU`. `MG.after(sec, fn)` timers; `HUD.toast/obj/hint/sub/pop`; `FX.ring/puff/blast/magic/bolt`; `COMBAT.splash/damage/fire`; `ENEMY.spawn(type,x,z,opts)`; `LEVEL.def/wave/trigger/door/interactable`; `CAST.need([...])`; `CAM.play({...})`; `MISSION.complete()`. Allocation in per-frame code is a bug (use `_v1.._v5` scratch vectors).

## 4. Hard rules (violations are rejected)
Touch-only UI; silent game (no audio code at all); adult characters, no sexual content; no network/CDN/external fonts; no `</script` inside JS; mobile perf budget (addendum §D/§G); no half-finished features (cut the UI too); leave no debug `console.log` spam; all text strings in-world voice.

## 5. How to finish
1. Build with **no errors** and boot your part in a real (software GL) screenshot or logic scenario — **look at the screenshot/logs; do not claim it works unseen.**
2. If you changed shared behaviour, say exactly what.
3. Final reply (≤ 15 lines): files created/changed; public API you added (signatures); what you tested and the observed result; known gaps/risks; anything you need from the lead. Be candid about anything not verified.
