# QA: measure it before the user sees it

Everything runs headless in system Chrome via `node tools/shot.js <scenario> <outdir> "<query>"`.
- **Screen size:** set it with env `W=`/`H=`.
- **Target file:** env `URL=` replaces both the file and the query. Use it to test the shipped Desktop file.
- **Captures:** `H.shot` captures the canvas; `H.pshot` captures the page including the DOM HUD.
- **Scenario helpers:** `H.step(n)` advances n frames deterministically; `H.eval(fn, ...args)` runs in the page.
  Node variables like `process.env` don't exist in the page, so pass them in as arguments.

Useful URL flags:
- `?play=<level>&nointro&cp=N` jumps straight into a level at a checkpoint.
- `?test` runs the test suite; `?view&cast=a,b,c` is the studio lineup.
- `?dbg` is the fps/scale overlay; `?sdf`/`?paint` switch to the old body paths.
- `?q=low`, `?msaa=N` and `?norag` toggle quality features.

## The checks and their targets

| Check | Tool | Target |
|---|---|---|
| Tests | `QUIET=1 node tools/shot.js tools/sc_test.js out/t "?test"` | all pass (25/25 in the scaffold) |
| Whole campaign plays through | `cp build/game.html build/bot.html; F=70000 URL="file://$PWD/build/bot.html?play=<first>&nointro" node tools/shot.js tools/sc_play_all.js out/bot` | `RESULT after <last level>`, `err: []` |
| Cast looks right | `WHOS='[...]' node tools/shot.js tools/sc_wardrobe.js out/wd "?play=<lvl>&nointro"` | judge at ≥1600 px, front + back |
| Close-ups | `WHO=maul VIEWS='[[yaw,dist,h,lookY,fov],…]' … tools/sc_look.js` | faces, hands, silhouettes |
| Pose pops / latency | `tools/sc_jank.js` | worst bone < ~100°/frame (except deliberate whips), no 170–180° flips |
| One move frame by frame | `MV=<move> … tools/sc_mv.js` | hilt axis ≤ ~35°/frame; arm bones follow the hilt |
| Fist on weapon | `tools/sc_fist.js`, `sc_bend.js` | fist centre < 2 cm from the axis; wrist bend < ~60° |
| Hands visually | `tools/sc_hands.js` (orbits the hilt) | the hilt passes *through* both fists |
| Frame time | `RIDE=1`/plain `DYN=1 PT=12000 W=2160 H=1350 … tools/sc_perf.js`; `tools/sc_prof.js` (per-subsystem ms); `tools/sc_perf2.js` (feature toggles) | 60 fps at 1080p; CPU game logic < 5 ms |
| Menus with real input | `MODE=titleKey|titleClick|levelKey|levelClick … tools/sc_menus3.js` | every entry launches its level |

## Lessons about measuring

- **Downscaled contact sheets hide exactly the defects users complain about.** A fist 13 cm beside the hilt, glossy
  straps, and a held blur all looked fine at 320 px. Crop at full resolution.
- **Numbers on logical bones can lie about the render.** The logical hand said "on the hilt" while the rendered fist was
  beside it. Measure the rendered skeleton (`q_*` bones).
- **Headless has dynamic resolution off** (`MG.headless`). Re-enable it with `DYN=1` to see what a real browser does,
  and check that the rendered size isn't collapsing.
- **Absolute fps is unreliable** while the user's own Chrome or another session is using the GPU. Compare A/B back to back,
  and check `ps` for busy Chrome helpers before trusting a number.
- **Render cost:** MSAA 4× on the HDR target cost ~35 % of the frame on big screens. The scaffold uses 2× on normal
  displays and none on Retina, plus a light sharpen in the composite pass.
- **"Blurry" checklist:** held radial/zoom blur, heat-haze distortion, chromatic aberration, a dynamic-resolution floor
  that's too low (keep ≥ 0.75), and over-blurred mips on far terrain.
- **Speed feel without blur:** streak particles, near ground scatter, FOV kick, and short (not held) zoom kicks on
  boost or near misses.
