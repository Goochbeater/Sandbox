---
name: game-character-kit
description: Proven pipeline for good-looking, well-animated 3D game characters in single-file three.js games — modelled CC0 bodies, heads, hair and clothing (Quaternius), a per-character recolour system, motion-captured locomotion and sword/fight clips retargeted onto any cast, two-handed weapon grips that actually close on the hilt, verlet cloth (capes, robes, tabards), ragdoll deaths, and a combat layer (combos, cancels, dodge, lock-on, executions, hit reactions). Ships the working engine from DARTH MAUL · SITH APPRENTICE as a scaffold (baked assets included, builds and passes 25/25 tests out of the box) plus the measurement tools that catch "looks off / feels janky" before the user does. Use this whenever the user wants characters, NPCs, a cast, enemies, a hero model, character animation, melee/sword/lightsaber combat, a third-person action game, or says things like "make the models look good", "better character models", "use what you did for Maul", "same characters/animation as the Maul game" — even if they don't mention Quaternius, mocap or rigs.
---

# Game Character Kit

A working third-person character + combat engine you copy and re-theme, rather than rebuilding characters from primitives
(sculpted SDF bodies and hand-keyed animation were tried first and read as "programmer art" / "2/10"). The engine is the
one behind `~/Desktop/darth-maul-sith-apprentice.html`: three.js r160 (classic build), plain JS parts concatenated into
ONE html file, all assets embedded, no server needed.

What makes the characters good (in order of impact):
1. **Modelled CC0 bodies and clothes** (Quaternius Universal Base Characters + Modular Character Outfits – Fantasy) on one
   65-joint skeleton, instead of procedural bodies.
2. **Hue-selective recolouring** of the painted outfit textures, so one ranger/peasant outfit becomes a Naboo guard, a
   Jedi, a Tusken or a Sith while keeping its stitching, folds and wear.
3. **Motion capture** (Quaternius Universal Animation Library, 60 clips) blended under keyframed weapon paths, with
   stance/upright controls so sword clips don't hunch.
4. **Prop IK that closes the fists on the weapon**, and cloth that follows the body, falling back to a set shape at speed.
5. **Measuring** poses, grips and frame times instead of eyeballing downscaled screenshots.

## Quick start

```bash
~/.claude/skills/game-character-kit/scripts/new_project.sh "<work folder>/<slug>-src" <slug>
cd "<work folder>/<slug>-src" && ./rebuild.sh && QUIET=1 node tools/shot.js tools/sc_test.js out/t "?test"   # expect 25/25
```

- **Scaffold:** `new_project.sh` copies `engine/` with its baked assets, tools and harness, and symlinks the headless
  harness's `node_modules`, so there is nothing to install.
- **Output:** `./rebuild.sh` writes `build/game.html`; `./rebuild.sh --ship` also copies it to
  `~/Desktop/<slug>.html`, following the Desktop-root rule.
- **Backups:** every build tars the source to `~/Library/Application Support/<slug>-backup/`, because the work folder
  has been wiped before.
- **The scaffold is a game, not a library:** it still contains the Maul levels, cast, menu and tests. They're the
  worked examples. Re-theme it by editing the cast, moves and levels, and delete or replace the example level parts
  once the new ones exist.
- **When editing tests:** update `p85_tests.js`, `p30_game.js` `GAME.seq`/`levels` and the `p28_menu.js` references
  whenever you rename levels.

Worked example of a new character: `examples/p15g_viking.js` (+ `examples/viking_lineup.jpg`) — one ~10-line part.

## Map of the engine (parts/, concatenated in name order)

| Part | What it is | Touch it when |
|---|---|---|
| p00–p05 | core, input, **renderer/post** (p02), textures, physics, SDF | tuning look/perf |
| p06/p06b | Maul's sculpted Zabrak head (SDF → baked mesh) | a hero needs a unique non-human head |
| p07 / p07b | 19-bone logical rig + IK; **QB** = Quaternius loader/sampler | rarely |
| p08 | character materials: skin, cloth, fill + rim light (CM) | skin/eyes/fabric look |
| p10 / p10b | CHAR.buildMaul (hero); **QB.attach/drive** (Q skeleton driven from the logical rig) | hero build |
| p11 / p11b | **cloth** (verlet panels, drape at speed) + hooded cloak | capes, robes, skirts |
| p12 | sabers (layered HDR blades, trails) | weapons |
| p13 / p13b | **ANIM.apply** (poses, prop IK, grip) + **MOCAP** (clip layer) | animation quality |
| p14 | keyframed moves (prop paths + hit windows) | new attacks |
| p15c/d/e/f | **the cast**: SPECS (fallback bodies + skin), QC/QO (**outfits + recolour grades**) | adding characters |
| p16 | camera (combat framing, cinematics) | feel |
| p17 / p17b | Actor (physics, reactions) + **ragdoll** | deaths/hits |
| p18 / p19 / p20 / p31 | player controller, combat, AI + enemy types, Jedi bosses | combat feel |
| p21–p27 | FX, kit/props, sky, levels, holocrons, terrain, HUD | world |
| p28–p31, p40–p42 | menu, intro, game flow, **example levels** | replace per game |
| p85 / p90 | tests, main | keep tests passing |

## Workflow for a new game's characters

1. **Scaffold and build**, as above. Make sure 25/25 passes before changing anything, so later failures are yours.
2. **Plan the cast**, typically a hero, three to six enemy types and one to three bosses.
   - For each character, pick a bind: `rmale` or `rfemale`.
   - Pick outfit parts from ranger/peasant, then write a recolour grade.
   - Choose a head: a Quaternius base head with a skin tone, or `cullHead` plus a helmet for masked or helmeted people.
   - Choose hair from the six baked styles, and any cloth panels.
   - Read `references/characters.md` and `references/outfits.md`, which have the spec formats, part names and worked palettes.
3. **Look at the whole cast together straight away:**
   - `WHOS='["guard","jedi:quigon",…]' node tools/shot.js tools/sc_wardrobe.js out/wd "?play=<level>&nointro"`
     renders front and back lineups in real level lighting.
   - `tools/sc_look.js` with `WHO=` and `VIEWS=` gives orbit and face close-ups.
   - Judge at 1600 px or wider. Several "fine at thumbnail" problems (bracers, gloss, a hand beside the hilt) only show up close.
4. **Moves:** base locomotion comes from `MOCAP.SETS`. Attacks are either clip-backed (`clipMove`: a slice of a UAL clip,
   a rate, hit windows, a cancel time and root motion) or keyframed prop paths (`K(t, hiltPos, bladeDir, {g, …})`).
   See `references/animation.md`.
5. **Measure before you claim it's good.** See `references/qa.md`.
   - `tools/sc_jank.js` reports the worst per-frame bone rotation and the click-to-swing latency.
   - `tools/sc_fist.js` gives the distance from each fist to the weapon axis.
   - `tools/sc_perf*.js` / `sc_prof.js` split frame time between CPU and GPU.
   - Targets: no bone above ~100°/frame outside deliberate whips, fists under 2 cm from the hilt, and 60 fps at
     1080p with CPU game logic under 5 ms.
6. **Play it through** with `tools/sc_play_all.js` (the god-mode campaign bot) after any change to layout or flow. Ship,
   then test the shipped file with `URL="file://$HOME/Desktop/<slug>.html?test"`. `URL=` replaces the query argument, so
   put `?test` inside it.

## Rules that came from real failures

- **Numbers first.** "Janky" turned out to be a hand flipping 180° in one frame; "twisted arm" was a grip-end choice
  toggling every frame; "blurry" was a radial blur held on while riding. All three were invisible in contact sheets and
  obvious in a per-frame metric. Build the metric, fix the cause, and re-measure.
- **Decide IK choices from stable inputs.** Anything decided from a joint that the same IK then moves (for example, which
  hilt end a hand grips, judged from the forearm) oscillates. Use the body frame, add hysteresis, and lock the choice
  while an action plays.
- **Anything that changes a pose must run before the IK that depends on it.** A wrist smoother applied after the arm solve
  pulled both fists 11–16 cm off the hilt.
- **Modelled > sculpted, and matte > glossy.** Glossy leather straps and buckles read as "fantasy ranger". For a clean
  costume, drop the bracers and lower `metal`/`ns`/`env` on the outfit parts.
- **Heads:** the Q heads fit the regular bodies. A custom sculpted head needs its scale checked against the shoulders;
  Maul's needed ×1.07.
- **Light:** a saber or any bright prop right next to black cloth paints it its own colour, so dim the prop light
  (`saber.lightK`) in hero shots. A camera-relative fill plus a thin rim keeps black costumes readable.
- **Speed and cloth:** at vehicle speed, carry the cloth in the vehicle's frame. Otherwise it registers as teleporting
  every frame and re-settles, costing 17 ms per frame.
- **Sound stays off**, except for the user's own intro music. Desktop-root delivery, and back up outside the work folder.

## Assets

The baked assets are in `engine/assets/`: `q.bin` + `q.json` (bodies, heads, hair, outfits, 60 clips) and
JPEG textures. The raw packs live in `~/maul-assets/` (UBC, UAL1, UAL2, MCOF, all CC0 from quaternius.itch.io).
To add another pack, for example Sci-Fi outfits:
- **Ask the user first.** Downloads need explicit permission; state the filename, source and size.
- Then extend `tools/bake_q.js` / `tools/bake_outfit_tex.py`. See `references/assets.md`.
