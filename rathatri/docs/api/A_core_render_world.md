# A. Core, render and world: engine API

Parts: `p00_core.js`, `p01_input.js`, `p02_render.js`, `p03_tex.js`, `p04_phys.js`, `p05_sdf.js`, `p21_fx.js`, `p23_sky.js`, `p26_terrain.js` in `/home/user/Sandbox/rathatri/parts/`. Line numbers are part-file lines. Nothing was modified.

- Engine: three.js r160 classic (`vendor/three.classic.js`), WebGL2. The parts form one concatenated script, so every top-level name is global.
- Units: metres, seconds, radians. Colours are linear HDR unless noted. TEX albedo output is sRGB 0..1.
- Not covered here: `KIT` (p22), `LEVEL` (p24), `CM` (p08), `GAME`/`PLAYER` (p17, p18, p30), touch input (p01b_touch.js).

## 0. Frame order and wiring

```
MG.loop (rAF, dt clamped to 0.1)                 p90:69-74
 MG.tick(dt)                                      p90:75
  MG.rdt = dt; MG.rt += dt                        p90:76  (real time)
  IN.poll()                                       p90:77  once per frame
  MG.frameUpdate(dt) -> GAME.update(dt)           p90:78, p30:80
     LEVEL.update -> L.updates(dt, L.t)           p24:86
     FX.update(dt)                                p30:75
     R.updateShadow(player position)              p30:77
  MG.runTimers()                                  p90:79
  IN.endFrame()                                   p90:80
  R.render(dt)                                    p90:81  (skipped by ?norender)
```

Boot: `R.init(); IN.init();` (p90:88), later `FX.init()` (p90:91). `LEVEL.load` (p24:4-30) runs teardown (`FX.clear`, `PHY.clear`, `R.clearLevelLights`, non-real timers dropped), clears scene fog and background (p24:12), calls `TEX.init(def.tex)` (p24:13), `R.resetGrade()` and `R.setShadowBox(16)` (p24:17), `def.build(L)`, `FX.reattach()`, and `R.setEnvFromScene(L.env)` if `L.env` is set (p24:25).

---

## 1. p00_core.js: namespace, math, RNG, noise, timers, loader

**Purpose.** The global `MG` namespace (URL flags, clocks, state, timers, boot UI), scalar math and easing, a seeded RNG, value noise, array-vector helpers and shared scratch objects.

| Name | Signature / fields | Behaviour |
|---|---|---|
| `MG` fields | `flags` (`?k` gives true, `?k=3` gives 3), `t` game s, `rt` real s, `dt`, `rdt` (set by p90), `frame`, `paused`, `timeScale`, `hitStop`, `state`, `errors`, `test`, `dbg`, `headless` | `state`: `'boot' 'title' 'play' 'cine' 'pause' 'dead' 'result'` plus `'loading'`, `'view'`. `errors` collects window errors and is never trimmed. |
| `MG.after(sec, fn, real?)` | | Runs `fn` after `sec` of game time, or real time if `real` is truthy |
| `MG.runTimers()` | | Runs due timers, each try/catch wrapped (errors to `MG.errors`) |
| `MG.yield()` | `-> Promise` | Resolves on a MessageChannel message (no timer clamp) |
| `MG.loadUI(p, msg?)` | async | Sets `#ldBar` width to `p` (0..1), `#ldMsg` text, then yields |
| `MG.fail(e)` | | Sets `MG.bootError`, shows `#err` |
| `MG.$(id)` | | `getElementById` |
| `MG.rs(name)` | `-> fn() in [0,1)` | Seeded from FNV-1a of `name`: deterministic per name |
| `mulberry(seed)` | `-> fn() in [0,1)` | Raw generator |
| `RNG`, `rnd(a=0,b=1)`, `rndi(a,b)`, `pick(arr)` | | One shared stream seeded 19990519. `rndi` is inclusive. |
| `hash3(x,y,z)`, `hash2(x,y)` | `-> [0,1)` | `hash2 = hash3(x,y,7)` |
| `vnoise3(x,y,z)`, `vnoise2(x,y)` | `-> [0,1)` | Value noise, smoothstep-interpolated; `vnoise2` uses z = 0.5 |
| `fbm2(x,y,oct=4)`, `fbm3(x,y,z,oct=4)` | | Normalised sum; each octave x2.03 frequency, x0.5 amplitude |
| `clamp`, `sat`, `lerp(a,b,t)` | | Standard |
| `invl(a,b,x)` | | `(x-a)/(b-a)`, unclamped |
| `smooth(a,b,x)` | | Clamped smoothstep |
| `damp(a,b,k,dt)` | | `a + (b-a)(1 - e^(-k dt))` |
| `wrapA(a)`, `dampA(a,b,k,dt)` | | Angle in `[-PI, PI)`; damping along the short arc |
| `easeIO`, `easeOut`, `easeIn`, `easeIOC` | `t` in [0,1] | Quad in-out, cubic out, cubic in, cubic in-out |
| `sgn(x)` | | `-1` if `x < 0`, else `1` (so `sgn(0) = 1`) |
| `TAU`, `PI`, `HALF`, `D2R` | | 2pi, pi, pi/2, degrees to radians |
| `V.add/sub/mul(a,s)/dot/cross/len/norm/lerp(a,b,t)/mx` | arrays `[x,y,z]` | Allocate new arrays; `mx` negates x |
| `V3(x,y,z)` | `-> THREE.Vector3` | Allocates |
| `_v1.._v5`, `_q1.._q3`, `_m1`, `_m2`, `_e1`, `YUP` | | Shared scratch. Do not keep references. |

**Hooks defined elsewhere:** `MG.onKey(code)` on each non-repeat keydown (p01:24), `MG.onMouse(button)` on mousedown (p01:34), `MG.gameUpdate` and `MG.viewUpdate` (p90:65-68).

**Gotchas**
- One global scope under `'use strict'`. A duplicate top-level name breaks the whole bundle.
- `rnd`, `pick` and `rndi` share one stream. Runtime calls advance the stream that level builds read. Use `MG.rs(name)` for reproducible content.
- `MG.rt` is real time and `MG.t` is game time. `MG.yield` deliberately avoids `setTimeout` (clamped).
- `MG.VERSION` contains `@@BUILD@@`, replaced by sed in build.sh:26.

**HOW TO**
1. Deterministic content: `const rs = MG.rs('mylevel:props'); const x = lerp(-10, 10, rs());`
2. Delayed action: `MG.after(2.5, fn)` pauses with the game. `MG.after(2.5, fn, true)` uses real time and survives `LEVEL.load`.
3. Debug key: `MG.onKey = (code) => { if (code === 'F3') MG.dbg = !MG.dbg; };`. URL flags are read as `MG.flags.name`.

---

## 2. p01_input.js: keyboard, mouse, gamepad to actions

**Purpose.** Turns DOM and Gamepad events into per-frame state and maps named actions to keyboard, mouse and pad inputs. Every action also works with the pointer unlocked.

**State (`IN`):** `keys` (e.code to bool, held), `pressed` and `released` (edges this frame), `mb`, `mbP`, `mbR` (buttons 0 LMB, 1 MMB, 2 RMB), `mdx`, `mdy` (mouse delta since last poll), `wheel` (sum of sign(deltaY) this frame), `locked`, `lastDevice` (`'kb'` or `'pad'`), `pad`, `padNow`, `padPrev`, `A` (`{mx,my,lx,ly}`), `buf` (action to real time of press), `sens` (1), `invertY` (false), `ACT` (action table, editable).

**Functions**
- `IN.init()`: attaches window listeners. Call once (p90:88).
- `IN.down(a)`, `IN.hit(a)`, `IN.up(a)` `-> bool`: held, pressed this frame, released this frame.
- `IN.take(a, win=0.28)` `-> bool`: true if pressed within `win` real seconds and not yet consumed; consumes it. `IN.peek` is the same without consuming.
- `IN.poll()`: once per frame. Reads the pad, sets `IN.A`, zeroes `mdx` and `mdy`.
- `IN.endFrame()`: once per frame after logic. Clears `pressed`, `released`, `mbP`, `mbR`, `wheel`.
- `IN.fireKey(code, down)`, `IN.fireMouse(button, down)`: synthetic window events for tests.
- `IN.keyLabel(a)` `-> '<kbd>...</kbd>'`: HTML, pad label when `lastDevice === 'pad'`.

**Action table (`IN.ACT`, p01:11-16):** `{k: [codes], m?: mouse button, p?: pad index}`

| action | keys | mouse | pad |
|---|---|---|---|
| attack | none | 0 LMB | 2 X |
| heavy | none | 2 RMB | 3 Y |
| jump / confirm | Space / Enter, NumpadEnter | | 0 A |
| dodge | ShiftLeft, ShiftRight | | 1 B |
| back | Backspace | | 1 B |
| block / push / grip / throw | KeyQ / KeyE / KeyF / KeyR | | 4 LB / 5 RB / 6 LT / 7 RT |
| lock | Tab, KeyC | 1 MMB | 11 R3 |
| rage | KeyX, KeyV | | 10 L3 |
| pause | Escape, KeyP | | 9 Start |

Pad index 8 is unused.

**Units of `IN.A`.** `mx` is right-positive, `my` is back-positive (`-1` is W). Both are in [-1,1] with length at most 1, from WASD and the left stick (0.16 deadzone). `lx`, `ly` are radians this frame: mouse counts x0.0024 x `sens`; arrow keys 2.4 x `MG.rdt` (vertical x0.6); right stick 3.2 x `rdt` (x) and 2.2 x `rdt` (y). `invertY` negates `ly`.

**Gotchas**
- Bindings use `e.code` (physical position). AZERTY keeps WASD in the same positions.
- `take` and `peek` windows are real seconds, so hit-stop does not stretch buffered input.
- `endFrame` and `poll` must run every frame, or edges persist and look deltas accumulate. `MG.tick` does both.
- Pad edges exist only after `poll` in the current frame.
- Pad buttons are shared: jump and confirm both use pad 0; dodge and back both use pad 1.
- `keyLabel` has no label for `confirm` or `back` (p01:88-89). `IN.keyLabel('confirm')` returns `<kbd>undefined</kbd>`. No call site in these parts uses those names.
- Pointer lock is requested on mousedown only when the target is `#cv`, state is `'play'`, and the run is not headless. Listeners are never removed.
- Touch is not handled in this file (see p01b_touch.js).

**HOW TO**
1. New action: `IN.ACT.taunt = { k: ['KeyT'], p: 8 };`. Test with `IN.hit('taunt')` or `IN.take('taunt')`. Add it to both label maps in `keyLabel`.
2. Custom camera look: after `IN.poll()`, add `IN.A.lx` and `IN.A.ly` to your yaw and pitch. The sign convention is your camera's.
3. Wheel zoom: `if (IN.wheel) zoom = clamp(zoom + IN.wheel * 0.5, 0, 5);`

---

## 3. p02_render.js: renderer, post stack, lights, shadows, dynamic resolution

**Purpose.** Owns the renderer, the HDR scene target, a fixed pool of seven point lights, the sun and its shadow map, the environment hookup, the full-screen post stack (AO, volumetric light, SSR, bloom, grade and tone map), and dynamic resolution.

**Frame pipeline (`R.render`, p02:306-372)**

| Step | Target (size) | Passes | Notes |
|---|---|---|---|
| main scene | `R.rt`: HalfFloat, MSAA `R.msaa`, depth texture (W x H) | 1 | |
| sun shadow | 2048 x 2048 map | 1 | every 2nd frame (p02:311); forced when `dt === 0` |
| AO (`G.ao > 0`) | `aoA`, `aoB` (W/2) | 1 + 2 blur | 9 samples each |
| volumetric (`G.vol > 0`, sun casts shadows) | `volA`, `volB` (W/4) | 1 + 2 blur | 16 shadow lookups per pixel |
| SSR (`G.ssr > 0`) | `ssrA`, `ssrB` (W/2) | 1 + 2 blur | up to 22 march steps, 4 bisections |
| bloom (always) | `down[0..5]`, `up[0..5]` (W/2 to W/64) | 11 | runs even when `G.bloom = 0` |
| composite to canvas | canvas (W x H) | 1 | about 9 texture fetches |

`W = round(CSS width x dpr)`, `dpr = R.dprBase * R.dynScale`, and `R.dprBase = min(devicePixelRatio, MG.flags.dpr || 1.5)` (p02:228).

**Functions**
- `R.init()`: builds renderer (no hardware AA, no tone map, PCFSoft shadows), scene, camera (58 deg, near 0.08, far 1400), hemisphere light, sun, 7 pool lights, PMREM, post materials, then `resize(true)`. Call once.
- `R.resize()`: reads window size and sets `dprBase`. Bound to window `resize`.
- `R.applyScale()`: `setPixelRatio(dprBase*dynScale)` and `setSize`. Reallocates all targets when W or H changes.
- `R.pass(mat, target)`: draws a full-screen triangle into `target` (null is canvas). Use for custom post passes; `POST_VS` supplies `vUv`.
- `R.resetGrade()`: copies `R.G_DEF` into `R.G`, sets `CM` fill and rim by world. Called by `LEVEL.load` before `def.build`.
- `R.setSun(dir, color, inten, hemiSky, hemiGnd, hemiI)`: `dir` is a Vector3 from the scene toward the sun (copied and normalised). Sets `sun.intensity = inten * PI` and `hemi.intensity = hemiI * PI`. Colours are hex.
- `R.setShadowBox(half, far?)`: orthographic shadow frustum +/- `half`, far default 120.
- `R.updateShadow(focus)`: re-centres the shadow frustum on `focus`, texel-snapped. Sets the sun at `focus + 60 * sunDir`. Not called by `render`.
- `R.setEnvFromScene(sc)`: PMREM (sigma 0.02, near 0.1, far 400) into `R.scene.environment`. Disposes the previous one.
- `R.addLight(src)` `-> src`, `R.removeLight(src)`, `R.clearLevelLights()` (keeps sources with truthy `persist`), `R.updateLights()` (internal, runs in `render`).
- `R.render(dt)`: full frame. `dt` is real seconds; 0 forces a shadow update and disables dynamic resolution.
- `R.shot(q?)` `-> JPEG data URL` (renders with dt 0, default quality 0.9).
- `R.shock(p, amp?)`: screen ring from world point `p` for about 0.6 s. Skipped if behind the camera.
- `R.kick(z)`: radial zoom blur, max with `z`, decays 2.8 per second.

**Light source record:** `{pos: Vector3, col: Color, i, range, on?, prio?, persist?}`. Score is `(prio||1) * i * range / (1 + 0.02 d^2)`, with `d` the nearer of camera and shadow focus. Sources are skipped when `on === false`, `i <= 0.001`, or `d > 3.2 range + 14`. The top seven fill the pool (PointLight, decay 2, distance `range`). Scoring writes `_score` onto your object.

**`R.G` grade (reset by `resetGrade`)**

| Field (default) | Meaning |
|---|---|
| `ao` (0.8), `aoR` (0.6 m) | AO strength (0 disables the AO passes) and radius |
| `exposure` (1.25) | Multiplies before tone map |
| `bloom` (0.22), `bloomThr` (1.05) | Bloom add strength and threshold |
| `sat` (1.05), `contrast` (1.05), `lift` (0) | Grade |
| `vig` (0.42), `grain` (0.022), `ca` (0.3) | Vignette, grain, chromatic aberration |
| `tint` (white) | Multiplies before tone map |
| `fade` (0), `rage` (0), `hurt` (0) | Fade to black, dark-side desaturation, red edge |
| `haze` (0) | Heat shimmer |
| `vol` (0), `volDen` (0.03), `volH` (0), `volFall` (0.08) | Volumetric strength (0 disables), density, floor height, falloff |
| `volOut` (1), `volG` (0.55), `volMax` (70 m) | Lit fraction outside shadow box, phase, march distance |
| `volAmb`, `volTint` | Ambient in-scatter and tint |
| `gShadow`, `gHigh` (white) | Shadow and highlight tint after tone map |
| `ssr` (0), `ssrMax` (30 m) | SSR strength (0 disables) and ray distance |
| `focusBlur` (0) | Declared, never read |

**Real examples**
```js
// Tatooine grade (p26:125-127)
R.G.exposure = 1.0; R.G.bloom = 0.14; R.G.sat = 1.08; R.G.haze = 0.35;
R.G.vol = 0.9; R.G.volDen = 0.006; R.G.volFall = 0.05; R.G.volMax = 90;
R.G.volAmb.setRGB(0.004, 0.0035, 0.003); R.G.gShadow.setRGB(0.9, 0.95, 1.1); R.G.gHigh.setRGB(1.06, 1.0, 0.92);
// Coruscant sun and shadow (p40b:153-155)
R.setSun(new THREE.Vector3(-0.3, 0.22, 1), 0xffa060, 2.8, 0x6a6090, 0x4a2418, 0.8);
R.G.ssr = 1.0; R.G.ssrMax = 40; R.setShadowBox(26, 160);
```

**Lighting model.** Sun is `R.sun` (castShadow, bias -0.00025, normalBias 0.025, orthographic +/-16, near 1, far 120 at boot). Hemisphere is `R.hemi`. Ambient is the hemisphere, plus `R.scene.environment` scaled by each material's `envMapIntensity`, plus `G.volAmb` when volumetrics are on. Boot values (sun 2.0, hemi 0.6) are not multiplied by PI, but `setSun` multiplies.

**Mobile-relevant facts**
- Pixels scale with dpr squared. A 390 x 844 CSS phone at DPR 3 gets dpr 1.5: 585 x 1266 = 740,610 pixels per full-size pass. At `dynScale` 0.75 it is 439 x 950.
- Colour target memory (estimate, 8 bytes per pixel per sample, depth excluded): at 585 x 1266 the main target is about 24 MB at 4x MSAA and about 6 MB at 1x. Each half-size AO or SSR target is about 1.5 MB. The bloom chain is about 4 MB.
- Dynamic resolution (p02:358-371): runs when `dt` is in (0, 0.25), not headless, page visible, `MG.rt > 6`. Every 1.2 s of real time, `fpsEMA < 47` gives `dynScale -= 0.06` (floor 0.75), and `> 58.5` gives `+= 0.04` (cap 1). Each change reallocates 19 targets.
- Sharpen: `uSharp = 0.18 + (1 - dynScale) * 1.4` (p02:354).
- Composite fetches about 9 per pixel, plus 1 for SSR, 1 for volumetrics, and 6 while `zoom > 0.001`.
- Full-screen passes per frame: 12 base, plus 3 each for AO, volumetrics and SSR when on.
- `R.calls` and `R.tris` are sampled after the main scene and exclude post passes.

**Gotchas**
1. **MSAA intent is dead code (p02:229).** The `if (wantMsaa !== R.msaa) {...}` block follows a `//` on the same line, so it never runs. `R.msaa` stays at its boot value: 4 (p02:5), or 0 with `?q=low` (p02:23). `?msaa=` and the "DPR > 1.25 gives 0" rule have no effect. The author's comment on that line says 4x MSAA on the HDR target cost about 35% of the frame on big screens.
2. The DPR cap (`MG.flags.dpr || 1.5`) limits every phone to 1.5 unless `?dpr=` is set.
3. Dynamic-resolution thresholds are absolute (47 and 58.5 fps). On 90 or 120 Hz screens the scaler only drops below 47 fps and steps back up above 58.5.
4. `R.G.bloom = 0` does not skip the bloom passes. Only `vol`, `ao` and `ssr` gate their passes.
5. The shadow target is created once. The vendored r160 code (`vendor/three.classic.js` around lines 22363-22395) only recreates it when `shadow.map === null`, so changing `mapSize` later does not resize it. Set `mapSize` before the first frame. A runtime change would need `dispose()` and then `shadow.map = null`. This comes from reading the r160 source, not from running it.
6. Shadows update every other frame, so a moving caster lags one frame.
7. `setShadowBox` changes texel density (2 x half / 2048). Levels use 24 to 48 (p40, p40b, p41c, p42, p26). Default is 16 at level load (p24:17).
8. Pool lights are always counted by every lit shader, even at intensity 0.
9. Only `resetGrade` resets `R.G`. `R.sun`, `R.hemi`, the environment and the shadow box persist across levels unless the level sets them. `LEVEL.load` leaves the environment alone when `L.env` is unset (p24:25).
10. `R.dpr` and `R.scale` (p02:4) are declared but never written here. `R.up[bloomMips-1]` is allocated but never used.

**HOW TO**
1. Per-level look (in `def.build`, after `resetGrade`):
   ```js
   R.setSun(V3(-0.4, 0.5, 0.6), 0xffe6c8, 2.8, 0x9ab0d0, 0x5a4330, 0.7);  // dir to sun, colour, inten (x PI), hemi sky, hemi ground, hemi inten (x PI)
   R.setShadowBox(24, 160);
   R.G.exposure = 1.1; R.G.bloom = 0.18; R.G.vol = 0;
   ```
2. Dynamic light: `const src = R.addLight({ pos: V3(4, 2, -3), col: new THREE.Color(1, 0.5, 0.2), i: 6, range: 8, prio: 3, on: true });`. Fade with `src.i`, delete with `R.removeLight(src)`. Use `persist: true` to survive level changes.
3. Impact feedback: `R.shock(p, 1.0)` for a screen ring, `R.kick(0.6)` for radial blur.

---

## 4. p03_tex.js: procedural texture sets and materials

**Purpose.** Generates 14 named, tileable sets at load (albedo, Sobel normal from height, roughness, optional emissive), and creates cached MeshStandardMaterials with world-space weathering and an SSR reflectivity mask.

**API**
- `TEX.size` (512), `TEX.sets` (name to `{map, normalMap, roughnessMap, emissiveMap, scale}`), `TEX.G` (14 generators), `TEX.MACRO_GLSL`.
- `TEX.tn(x,y,p,oct=4)`: tileable fbm, period `p`.
- `TEX.build(name, gen, o?)` `-> set`: `gen(u, v, out, x, y, N)` fills `out[0..2]` albedo (sRGB), `out[3]` height 0..1, `out[4]` roughness, `out[5..7]` emissive (only if `o.emissive`). Options: `size` (512), `bump` (4.0 normal strength), `scale` (2), `emissive`.
- `TEX.init(list, progress?)` (async): builds missing names from `TEX.G` with the `cfg` table. Calls `progress(i/n)` or yields.
- `TEX.mat(name, o?)` `-> MeshStandardMaterial`: cached by `name + JSON.stringify(o)`.
- `TEX.reflect(m, refl, key?)`: writes `alpha = 1 - refl * clamp(1.15 - roughness, 0, 1)`. SSR reflects where alpha is below 1.
- `TEX.macro(m, k, streak?)`: world-space tone and vertical grime, no UVs. Applied by `TEX.mat` unless `macro: 0`.

**Generators:** `marble` (1024, Theed floor), `nabooWall`, `metalPanel`, `grate`, `ribWall`, `sand`, `rock`, `adobe`, `duracrete`, `darkMarble` (1024), `carpet`, `sithFloor` (emissive), `towerWin` (emissive, 512), `hull`.

**`cfg` (p03:159-161):** `marble: { scale: 4, bump: 2, size: 1024 }`, `sithFloor: { scale: 4, bump: 3, emissive: true }`, `towerWin: { scale: 24, bump: 1, emissive: true, size: 512 }`.

**`TEX.mat` options:** `color` (white), `rough` (1), `metal` (0), `env` (envMapIntensity, 0.7), `side`, `ns` (normalScale, 1), `emis` (false disables emissive), `emisCol`, `emisI` (2.0), `scale` (stored as `userData.tscale`, read by KIT), `macro` (1; 0 disables), `streak` (1), `refl` (calls `TEX.reflect`).

**Real examples:** `TEX.mat('marble', { color: 0xa8a4a0, env: 1.0, rough: 0.35, refl: 0.9 })` (p42:37); `TEX.mat('sithFloor', { emisCol: 0xff2010, emisI: 1.2, env: 1.0, rough: 0.3, refl: 0.8 })` (p40_lvl_works:38).

**Performance**
- Build is CPU at load. Each 512 set runs 262,144 generator calls.
- GPU memory (estimate, RGBA8 with mips): a 512 set is about 4 MB (map, normal, roughness), a 1024 set about 16 MB. Marble and darkMarble together are about 32 MB.
- `TEX.macro` is on by default: 9 value-noise evaluations per fragment. The streak term is computed even when `streak` is 0.
- Every map is set to anisotropy 8 (p03:46).

**Gotchas**
- `TEX.G[name]` must exist; `TEX.build` calls it directly.
- `SKY.coruscant` reads `TEX.sets.towerWin` (p23:41) and `TERRAIN.mat` reads `sand` and `rock` (p26:6-7). Build those first. `LEVEL.load` does it from `def.tex`.
- `cfg` is a local const inside `TEX.init`. To change size or bump, edit it or call `TEX.build`.
- Albedo is sRGB; normal and roughness are linear.
- `scale` only stores `userData.tscale`. The consumer applies UV scale.

**HOW TO**
1. New generator, added to `TEX.G` and listed in `def.tex`:
   ```js
   TEX.G.brick = function (u, v, o) {
     const n = TEX.tn(u * 8, v * 8, 8, 4);
     const cy = (v * 6) % 1, cx = (u * 3 + Math.floor(v * 6) * 0.5) % 1;
     const mortar = (cy < 0.05 || cx < 0.04) ? 1 : 0;
     const b = 0.55 + n * 0.12 - mortar * 0.3;
     o[0] = b; o[1] = b * 0.7; o[2] = b * 0.55; o[3] = mortar ? 0 : 0.6 + n * 0.2; o[4] = 0.8;
   };
   ```
   For a custom size: `TEX.build('brick', TEX.G.brick, { size: 256, bump: 3 })`.
2. Material: `TEX.mat('brick', { color: 0xddc8b0, rough: 0.9, env: 0.5, scale: 3 })`.
3. Emissive: build with `{ emissive: true }`, write `o[5..7]` in [0,1], then `TEX.mat('brick', { emisCol: 0xff8040, emisI: 3 })`.

---

## 5. p04_phys.js: colliders, ground, moves, rays

**Purpose.** The `PHY` module: static colliders on a 6 m XZ grid (boxes, yaw boxes, ramps, cylinders, polygon rings) plus one optional heightfield `PHY.hf`. Provides ground queries, sliding moves, rays and line of sight.

**Collider records**

| `k` | Created by | Fields |
|---|---|---|
| 0 | `PHY.box(x0,y0,z0,x1,y1,z1,o?)` | `x0..z1`, `y0..y1`, sorted |
| 1 | `PHY.obox(cx,cz,hx,hz,y0,y1,yaw,o?)` | `cx, cz, hx, hz, y0, y1, cs, sn` (yaw in rad) |
| 2 | `PHY.ramp(x0,z0,x1,z1,axis,ya,yb,o?)` | `axis` `'x'` (anything else is z). `ya` at the low end, `yb` at the high end. `y0 = min - 1.5`. |
| 3 | `PHY.cyl(cx,cz,rad,y0,y1,o?)` | |
| 4 | `PHY.ring(cx,cz,rIn,rOut,y0,y1,sides=8,rot=0,o?)` | N-gon annulus. `rIn`, `rOut` are apothems (flat-face distances). |
| 9 | `PHY.HFC` | Sentinel collider for heightfield hits |

**Option flags:** `off` (skipped by all), `noFloor` (not ground), `pass` (no push-out), `climb` (for `climbAt`), `noShot` (skipped by ray mode `'shot'`), `see` (skipped by `'los'`). The header mentions `lava`, but nothing reads it.

**Functions**
- `P.add(c)` `-> c`: inserts into every 6 m cell the bounds span.
- `P.each(x0,z0,x1,z1,fn)`: visits unique colliders; `fn` returns true to stop.
- `P.ground(x,z,r,yTop,yBot,out?)` `-> number | null`: highest walkable top in `[yBot, yTop]` under a circle of radius `r`, heightfield included. If `out` is given, sets `out.y` and `out.c`.
- `P.floorBelow(x,z,yFrom,r=0.05)` `-> {y, c} | null` (an object, not a number).
- `P.ceiling(x,z,r,yFrom,yTo)` `-> number`: lowest collider bottom in `[yFrom, yTo)`, else `yTo`. Ramps ignored.
- `P.move(e,mx,mz)` `-> blocked`: `e = {x,y,z,r,h,step}`, `y` is the feet. Sub-steps of at most `0.6 r`, push-out, ramp and steep-heightfield blocking. Sets `e.x`, `e.z`, `e.hitWall`, `e.hitNX`, `e.hitNZ`.
- `P.unstick(e)`: pushes `e` out of overlaps in place.
- `P.ray(ox,oy,oz,dx,dy,dz,maxT,mode?)` `-> {t,nx,ny,nz,c} | null`: `dir` must be unit length. Heightfield hits report normal `(0,1,0)` and `c = P.HFC`.
- `P.los(ax,ay,az,bx,by,bz)` `-> bool`: ignores `see` colliders. The heightfield still blocks.
- `P.solidAt(x,y,z)` `-> bool`, `P.climbAt(x,y,z,r)` `-> collider | null`.
- `P.clear()`: empties statics and grid, sets `P.hf = null`.
- Helpers: `P.rampH(c,x,z)`, `P.overlaps(c,x,z,r)`, `P.polyR(c,x,z)`. Data: `P.statics`, `P.grid`, `P.C` (6), `P.hf`. `P.barriers` is unused.

**Real examples**
```js
PHY.box(-13, 0, Z1 + 1, 13, 20, Z1 + 1.4);   // p42:78  invisible wall
PHY.obox(11.5, 12, 4.2, 14.5, 0, 4.5, PI);    // p42:86  yaw PI
PHY.ring(0, PZ, PR, PR + 1, 0, 12, 24, 0);    // p42:303 24-sided ring
PHY.cyl(x, z, 0.35, 0, 1.1);                  // p42:115 pillar
```

**Performance**
- A collider is inserted into every 6 m cell it spans. A 1 km x 1 km box becomes about 28,000 entries. Split very large floors.
- `P.hf` is evaluated on every ground, move and ray query. Rays sample every 0.5 m and bisect 12 times. Keep the function cheap.
- Each `ground` or `move` call allocates closures and returned arrays.

**Gotchas**
- `P.hf` is one slot. `TERRAIN.build` replaces it and returns null outside its rectangle (p26:75).
- Collision samples the height function exactly. The render mesh is linear between grid vertices.
- Never call `each`, `ground`, `move` or `ray` from inside an `each` callback: the `c.q` stamp breaks.
- Ramps never push out. They block by height and are walkable up to `e.step`.
- Push-out ignores colliders whose top is at or below `y + step`, or whose bottom is at or above `y + h`.
- `P.ground` returns a number; `P.floorBelow` returns an object.

**HOW TO**
1. Climbable box: `PHY.box(-4, 0, 2, 4, 3, 2.5, { climb: true });`. Test with `PHY.climbAt(x, y, z, 0.35)`.
2. Ramp: `PHY.ramp(-10, 0, -2, 6, 'x', 0, 2.5);` rises from 0 at x = -10 to 2.5 at x = -2. The visual ramp must match.
3. Cylinder and player move: `PHY.cyl(6, 6, 0.5, 0, 2);`. For the player:
   ```js
   const e = { x, y, z, r: 0.35, h: 1.8, step: 0.45 };
   PHY.move(e, dx, dz);
   const g = PHY.ground(e.x, e.z, 0.3, e.y + e.step, e.y - 1.5);
   if (g !== null) e.y = g;
   ```

---

## 6. p05_sdf.js: signed-distance modelling and surface nets

**Purpose.** Builds implicit shapes from primitives in smooth-combined groups, compiles them to straight-line JS, meshes with narrow-band surface nets, and clips, zips and merges parts. Runs at boot, so per-frame cost is only the resulting triangles.

**Group format:** `groups = [{ name, op: 'su'|'u', k, items: [{ p, op, k }], bound? }]`. Item `op`: `'u'` union, `'su'` smooth union (`k` = radius), `'ss'` smooth subtract, `'si'` smooth intersect, `'s'` hard subtract. The first item's op is ignored. A group `op` of `'su'` smooth-unions with earlier groups using `k`. Anything else is a hard min.

**API**

| Name | Signature / notes |
|---|---|
| `SDF.sph(c,r)`, `SDF.ell(c,r,rot?)` | Sphere; ellipsoid with `r = [a,b,c]` (approximate, IQ-style) |
| `SDF.cap(a,b,r)`, `SDF.rcone(a,b,ra,rb)` | Round capsule; round cone |
| `SDF.box(c,h,rr,rot?)` | Rounded box, `h` half-extents |
| `SDF.lid(c,re,th,o)` | Eyelid shell; `o = {side,w,up,lo,tilt,cap,yaw,upo,loo,solid}` |
| `SDF.rot(ex,ey,ez)` | Degrees, XYZ. 9 numbers, row-major world-to-local |
| `SDF.rotAlong(d,fwd?)` | 9 numbers, rows are local axes, local +Y along `d` |
| `SDF.mirror(prim)` | Copy with x negated (positions, rotation column 0, lid side) |
| `SDF.compile(groups)` `-> fn(x,y,z)` | `new Function` per group; sets `group.bound`; result has `.groups` |
| `SDF.grad(f,x,y,z,e,out)` | Normalised tetrahedral gradient into `out` |
| `SDF.primBound(p)`, `SDF.groupBound(items)` | Conservative bounding spheres `{c, r}` |
| `SDF.fmt`, `SDF.primCode`, `SDF.opCode` | Code generation helpers |
| `MESH.nets(f,box,h,opt?)` | `box = [x0,y0,z0,x1,y1,z1]`, cell `h`, `opt = {block=4, skip?}`. Returns `{pos, idx, nv, nt, evals, dims}` |
| `MESH.netsGrid(val,nx,ny,nz,o,h)` | Surface nets over a dense corner grid |
| `MESH.clip(m,planes)` | Keeps `n·p + d >= 0`; planes `{n, d, r?, c?}` |
| `MESH.loopsOnPlane(m,pl,eps)`, `MESH.zip(pos,loopA,loopB,pl)` | Boundary loops; stitches two loops (returns a plain Array of indices, both windings) |
| `MESH.merge(list)` | Concatenates, with `off[]` |
| `MESH.fieldAttrs(f,pos,nv)` `-> {nrm, curv, ao}` | Per-vertex normal, curvature, AO |
| `MESH.largest(m,keepMin?)` | Largest component, plus components with at least `keepMin` vertices |
| `MESH.normals(pos,idx,nv)`, `MESH.relax(m,f?,iters=1)` | Area-weighted normals; in-place relaxation projected to field |
| `MESH.geometry(pos,idx,nrm,extra?)` | `BufferGeometry`, shares arrays without copying |

**Real call (p25_props.js:162-163):** `const f = SDF.compile(G); let m = MESH.nets(f, [-0.34, -0.2, -1.75, 0.34, 0.33, 2.5], 0.011);`

**Performance**
- Triangles scale with surface area over `h^2`. Halving `h` roughly quadruples them.
- Character body meshing uses `o.res || 0.0048` (p09_body.js:206, 241) and `0.0024` (p09:267), in metres. The body is about 1.9 m tall (p09:206). These set the character triangle budget and live outside these parts.
- The compiled evaluator allocates nothing per sample.

**Gotchas**
- `SDF.compile` uses `new Function`: the page needs a CSP that allows it.
- `groupBound` returns NaN for a group with no additive item. Start each group with an additive primitive.
- Inside is negative. NaN corners mark uncomputed values, and cells touching them are skipped.
- `MESH.nets` skips a block when `|f(centre)| >= B*h*0.95 + h`. A field error larger than that can drop geometry.
- `clip`, `loopsOnPlane` and `zip` use plain arrays and Maps: fine at boot, slow for large meshes.

**HOW TO**
1. Shape to mesh:
   ```js
   const groups = [{ name: 'body', items: [
     { p: SDF.ell([0, 1.0, 0], [0.22, 0.45, 0.15]), op: 'u' },
     { p: SDF.cap([0, 1.5, 0], [0, 1.7, 0], 0.12), op: 'su', k: 0.08 } ] }];
   const f = SDF.compile(groups);
   const m = MESH.nets(f, [-0.6, 0, -0.4, 0.6, 2.0, 0.4], 0.01, { block: 4 });
   const geo = MESH.geometry(m.pos, m.idx, MESH.normals(m.pos, m.idx, m.nv));
   ```
2. Symmetric limb: `const armL = SDF.mirror(armR);`, then add it as an item.
3. Clip and AO: `const c = MESH.clip(m, [{ n: [0, 1, 0], d: -0.9 }]);` keeps `y >= 0.9`. Then `MESH.fieldAttrs(f, c.pos, c.nv)` gives `nrm`, `curv`, `ao`.

---

## 7. p21_fx.js: sparks, particles, rings, decals, debris, burns, flashes

**Purpose.** Runtime effects: additive line sparks, glow and smoke point sprites, shockwave rings, scorch decals, debris, saber burns, impact stars, actor flash, short light flashes, and a camera-shake value.

**API**
- `FX.init()`: builds the systems, adds `FX.group` to `R.scene`, and makes textures. Call after `R.init` (p90:91).
- `FX.spark(p,n,count,speed,col,life)`: `n` is a normal or null. Defaults: `col` `[4,2.2,1.0]` (HDR), speed 6, life 0.35, all randomised. Gravity 9.8.
- `FX.puff(p,count,o?)`: `o` keys `add` (glow system, else smoke), `spread` (0.8), `vel`, `jit` (0.1), `life` (1.2), `size` (0.3), `grow` (2.2), `col`, `a` (0.5), `drag` (1.5), `rise` (0.3).
- `FX.ring(p,col,r1?,life?)`: ground shockwave, final radius about `r1` (default 4 m), life 0.45 s.
- `FX.scorch(p,n,size?)`: decal, default size 0.25.
- `FX.chunk(mesh,v,spin?,life?)`: debris that bounces on `PHY.ground`. Default life 5 s, removed at life + 0.6 s. Adds the mesh to the scene itself.
- `FX.flashLight(p,col,i,range?,life?)`: adds a prio-4 light whose intensity fades over `life` (default 0.15 s).
- `FX.addShake(a)`: `FX.shake = min(1.2, shake + a)`, decays 1.8 per second.
- `FX.burn(t,p,sweep?)`: saber scorch on the nearest bone of `t.inst` within about 0.71 m of `p`. Lives 2.6 s.
- `FX.flashActor(a,dur?)`: swaps `a.inst.meshes` materials to an HDR flash for `dur` (default 0.07 s wall-clock).
- `FX.impact(p,col?,size?)`: additive star from a pool of 20, 130 ms wall-clock.
- `FX.update(dt)` (from `GAME.update`, p30:75), `FX.clear()`, `FX.reattach()`, `FX.mkPts(N,additive)` `-> {pts,P,C,S,N,list}`.

**Capacities:** sparks 1400, glow 1200, smoke 700 (oldest evicted); decals about 60 (steady state 61); burns 28; impacts 20; rings, debris and flashes unlimited.

**Real examples**
```js
FX.puff(V3(...), 1, { add: true, size: 0.03, col: [0.8, 0.8, 1.0], a: 0.5, life: 5, spread: 0.08, rise: 0.02, drag: 0.1 }); // p40_lvl_works:139
FX.spark(p, V3(0, -1, 0), 6, 2.5, [4, 2.4, 1.2], 1.1);       // p40_lvl_works:114
FX.flashLight(p, [1, 0.6, 0.3], 3, 6, 0.08);                 // p40_lvl_works:114
```

**Performance**
- Point size is `size * uScale / depth`, with `uScale = R.h / (2 tan(fov/2))` (p21:118), in device pixels. Large soft sprites at high DPR cost fill rate. Smoke is alpha-blended, so it adds overdraw.
- Particle and line buffers are marked `needsUpdate` in full each frame. The draw range limits what is drawn.
- `spark`, `puff`, `ring`, `burn` allocate Vector3s, materials or Colors per call.
- `burn` and `impact` use `Math.random()`; `spark`, `puff`, `ring` use the shared RNG.

**Gotchas**
- `FX.init` must run after `R.init`.
- `FX.clear` does not dispose ring materials (`FX.update` does), so each cleared ring leaks its material.
- Impacts and actor flashes use `performance.now()`, so they expire during pause. Particles do not.
- `FX.chunk` adds the mesh itself; do not add it again.
- With 20 impacts on, `impact` reuses `imps[0]` at once rather than queueing.
- `FX.update` iterates only `glow` and `smoke`. A new system needs its own loop.

**HOW TO**
1. Hit impact bundle:
   ```js
   FX.spark(p, n, 12, 7, [4, 2.2, 1.0], 0.35);
   FX.puff(p, 6, { add: true, size: 0.1, grow: 3, col: [1.2, 0.6, 0.3], a: 0.8, life: 0.4 });
   FX.flashLight(p, [1, 0.6, 0.3], 3, 6, 0.1);
   FX.impact(p, [3, 1.6, 0.8], 0.8);
   ```
2. New particle system: `const sys = FX.mkPts(300, true); FX.group.add(sys.pts);`. Fill `sys.list` with `{p, v, t: 0, life, s0, s1, col, a, drag, rise}`, write `sys.P`, `sys.C`, `sys.S` each frame, and copy the loop body and `uScale` line from `FX.update` (p21:107-119).
3. Scorch and shake: `FX.scorch(p, n, 0.6); FX.addShake(0.4);`

---

## 8. p23_sky.js: domes, skylines, traffic

**Purpose.** Sky domes, the Coruscant skyline (instanced towers with window textures, crowns, beacons, Jedi Temple, Senate) and GPU-animated speeder traffic. Each sky also fills `L.env` for PMREM.

**API**
- `SKY.dome(U, frag)` `-> Mesh`: sphere radius 1000 at the origin, BackSide, depth write off, renderOrder -10, fog off. `frag` is GLSL with `vD` (direction) and `uT` (time) declared. Not added to the scene.
- `SKY.coruscant(L, o?)` `-> Group`: adds everything via `LEVEL.add`, sets `L.env`, and sets `R.scene.fog = new THREE.FogExp2(new THREE.Color(0.36, 0.17, 0.12), o.fog)`.
- `SKY.capGeos()` `-> [3 BufferGeometry]`: crown shapes on a unit footprint.
- `SKY.traffic(L, o?, rs)` `-> Mesh`: instanced speeders, with its own `L.updates` time hook. Caller adds the mesh.

**Coruscant options (defaults):** `sunDir` (-0.35, 0.07, 1), `r0` 70 and `r1` 760 (tower radius range), `n` 900 (target towers), `seed` 1 (`MG.rs('cor'+seed)`), `cx`, `cz` 0, `base` 0, `keepOut` (list of `[cx, cz, halfX, halfZ]`), `corridors` 34, `perLane` 36, `templeX` -620, `templeZ` 520, `senateX` 480, `senateZ` 620, `fog` 0.0026.

**Real calls**
```js
SKY.coruscant(L, { r0: 90, n: 600, base: -30, fog: 0.0036, cz: 60, sunDir: V3(0.1, 0.08, 1) });                       // p40b:274
SKY.coruscant(L, { r0: 105, n: 1000, base: -55, fog: 0.0026, sunDir: V3(-1, 0.07, 0.25), keepOut: [[-260, 20, 215, 95]] }); // p40_lvl_works:126
```

**Draw count (static):** dome 1, towers 1, crowns 3, beacons 1, temple 11, senate 4, traffic 1.

**Performance**
- The dome draws first over the full screen. Its shader runs on every pixel not later overwritten. Coruscant clouds use a 5-octave `fb()` (p23:10).
- Towers are lit MeshStandardMaterial with the seven-light loop, up to `n` instances.
- Traffic is `corridors x 4 lanes x perLane` instances: 4,896 by default, animated in the vertex shader.

**Gotchas**
- Needs `TEX.sets.towerWin`, `KIT.emis` and `LEVEL`. Build textures first.
- `SKY.coruscant` replaces `R.scene.fog`. Traffic's own fog uses `uDen = o.fog`, so keep the two in step by hand.
- The Coruscant dome is at the world origin with radius 1000 and is not re-centred. Past 1000 m from the origin it stops enclosing the camera. Tatooine re-centres its dome each frame (p26:120). Add the same line if the level is large, or if the caller moves the returned group.

**HOW TO**
1. Custom sky preset:
   ```js
   SKY.dusk = function (L, o) {
     const U = { uT: { value: 0 }, uSun: { value: V3(-0.4, 0.2, 1).normalize() } };
     const dome = SKY.dome(U, `uniform vec3 uSun;
       void main(){ vec3 d = normalize(vD); float s = max(dot(d, uSun), 0.0);
         vec3 c = mix(vec3(0.9, 0.5, 0.3), vec3(0.1, 0.12, 0.3), smoothstep(0.0, 0.5, d.y));
         c += vec3(2.0, 1.2, 0.6) * pow(s, 64.0);
         gl_FragColor = vec4(c, 1.0); }`);
     L.updates.push((dt, t) => { U.uT.value = t; dome.position.copy(R.camera.position); });
     LEVEL.add(dome);
     const env = new THREE.Scene(); env.add(new THREE.Mesh(dome.geometry, dome.material)); L.env = env;
     R.scene.fog = new THREE.FogExp2(new THREE.Color(0.5, 0.35, 0.3), 0.002);
     return dome;
   };
   ```
   Also call `R.setSun` and the grade setters, as the Tatooine preset does (p26:124-127).
2. Retune a skyline: `SKY.coruscant(L, { r0: 90, r1: 620, n: 500, base: -20, cz: 60, keepOut: [[0, 60, 40, 30]], templeX: -700, senateX: 540 });`
3. Traffic: `grp.add(SKY.traffic(L, { corridors: 8, perLane: 10, base: 40, fog: 0.0026 }, MG.rs('traffic:x')));`

---

## 9. p26_terrain.js: heightfield terrain, rocks, Tatooine sky

**Purpose.** One displaced grid mesh driven by `f(x,z)`, which is also the collision heightfield. Includes a sand and triplanar-rock material, sandstone rock formations, and the Tatooine sun, grade and fog preset.

**API**
- `TERRAIN.mat(key, o?)` `-> MeshStandardMaterial`: `key` feeds the program cache key. Options: `color`, `rk` (reads per-vertex `aRk`, rock weight 0..1), `rockH` (height above which slope forces rock, smoothstep from `rockH` to `rockH + 3`).
- `TERRAIN.build(f,x0,z0,x1,z1,res,mat)` `-> Mesh`: grid at `res` metres, `y = f(x,z)`, UV = `(x,z)/5`. Adds to the level, casts and receives shadows. Sets `PHY.hf`.
- `TERRAIN.rockGeo(seed,r,hs,stretch?,detail?)` `-> BufferGeometry`: icosphere with strata and grooves. `detail` defaults to 4 when `r <= 3`, else 5.
- `TERRAIN.rock(x,z,r,h,seed,mat,o?)`: places a rock. `o`: `stretch`, `detail`, `y` (default `PHY.hf(x,z)`), `col` (false disables the collider). Collider is `PHY.cyl(x,z,r*0.78*stretch, y-5, y+0.9h)`.
- `TERRAIN.rockMat()` `-> MeshStandardMaterial` (tscale 6).
- `TERRAIN.tatooineSky(L,o?)`: `o.sun` (default `(-0.45,0.42,0.55)`), `o.sunI` (3.4). Sets `L.env`, sun and hemisphere, grade, `setShadowBox(30,180)`, and fog.

**Real calls**
```js
TERRAIN.build(TAT.dunes, -220, -140, 220, 330, 2.2, TERRAIN.mat('dunes'));    // p41:53  about 200 x 214 cells, ~86k tris
TERRAIN.build(TAT.canyon, -60, -30, 170, 430, 1.4, TERRAIN.mat('canyon'));    // p41:123 about 165 x 329 cells, ~109k tris
TERRAIN.tatooineSky(L, { sun: new THREE.Vector3(-0.82, 0.3, 0.2), sunI: 3.8 }); // p41c:336
```

**Performance**
- One mesh, one draw call, one bounding sphere. No LOD, no tiling. The whole grid is drawn every frame, and because `castShadow` is true it is also rendered into the shadow map (p02:311).
- Triangles are `2 * nx * nz`, with `nx = ceil((x1-x0)/res)` and `nz = ceil((z1-z0)/res)`.
- About 13 texture fetches per terrain fragment, and 18 where rock normals apply (`gRock > 0.01`, p26:50).
- Each rock is one mesh of roughly 320 to 720 triangles at detail 3 to 5 (IcosahedronGeometry subdivision in three.js). Whether `KIT.geo` merges them is in p22.

**Gotchas**
- `PHY.hf` is one slot. A second `TERRAIN.build` replaces collision for the first, and collision is null outside the rectangle.
- Collision samples `f` exactly; the render mesh is linear between vertices.
- `rockH` is baked into the shader (p26:39), but the cache key omits it. Two materials with the same key and different `rockH` share the first program. Use a distinct key per `rockH`.
- `rk: true` needs `aRk` set on `mesh.geometry` yourself. `TERRAIN.build` does not create it.
- `TERRAIN.rock` takes its default base height from `PHY.hf`, so call `build` first or pass `o.y`.
- `tatooineSky` changes sun, grade, shadow box and fog for later levels too (p02 gotcha 9).
- Debug: `?tdbg=sand|t|n|wn|flatn|nolight`, and `?nmb=` (normal-map bias define, p26:9).

**HOW TO**
1. Custom height function (`def.tex` must list `'sand'` and `'rock'`):
   ```js
   const h = (x, z) => 3 * Math.sin(x * 0.03) * Math.cos(z * 0.02) + 1.5 * fbm2(x * 0.05, z * 0.05, 3); // metres, keep cheap
   const mesh = TERRAIN.build(h, -200, -200, 200, 200, 2.5, TERRAIN.mat('mydunes'));
   ```
   Put the player spawn at or above `h(x, z)`.
2. Rock weight on steep faces:
   ```js
   const mat = TERRAIN.mat('cliffs', { rk: true, rockH: 12 });   // unique key for this rockH
   const mesh = TERRAIN.build(h, -200, -200, 200, 200, 2.5, mat);
   const nx = Math.ceil(400 / 2.5), w = new Float32Array(mesh.geometry.attributes.position.count);
   // fill w[j * (nx + 1) + i] in 0..1 (i along x, j along z)
   mesh.geometry.setAttribute('aRk', new THREE.BufferAttribute(w, 1));
   ```
3. Rock formation: `TERRAIN.rock(12, -30, 4.5, 9, 1234, TERRAIN.rockMat(), { stretch: 1.2, detail: 3 });`

---

## MOBILE PERF KNOBS

Nothing here is measured. The effects come from the pass and pixel arithmetic above. Measure first with `?dbg` (p90:83 prints fps, dynScale, calls, tris).

| # | Knob | Where | Current | Suggested for phones | Effect |
|---|---|---|---|---|---|
| 1 | Render scale cap | p02:228 `MG.flags.dpr \|\| 1.5` | 1.5 | 1.0 (or `?dpr=1`) | 2.25x fewer pixels in every full and half-size target |
| 2 | Dynamic-res floor | p02:366 `Math.max(0.75, ...)` | 0.75 | 0.6 | Deeper drop when fps < 47 |
| 3 | Dynamic-res thresholds | p02:366-367 (47, 58.5) | absolute fps | scale to device refresh | Correct behaviour on 90 and 120 Hz |
| 4 | MSAA | p02:5 `msaa: 4` (line 229 is dead) | 4 | 0 | Removes 4x HDR colour and resolve (about 24 MB to 6 MB at 585 x 1266) |
| 5 | Volumetrics | `R.G.vol` per level (p26:126 0.9; p40:130 1.4; p40b:277 1.3; p42:223 1.0; p42:326 0.45) | 0.45 to 1.4 | 0, set in the level or clamp in `R.render` | Removes 3 passes at W/4 and 16 shadow lookups per pixel |
| 6 | Point lights | p02:12 `NL: 7` | 7 | 4 | Fewer lights in every lit shader |
| 7 | AO | `R.G.ao` (p02:6) | 0.8 | 0 | Removes 3 passes at W/2 |
| 8 | Bloom resolution | p02:251 `let w = W >> 1` | W/2 | `W >> 2` | Bloom passes about 4x cheaper, softer glow |
| 9 | Bloom levels | p02:5 `bloomMips: 6` (set before `R.init`) | 6 | 4 | Drops the smallest levels |
| 10 | Bloom removal | p02:341-347 | always on | edit `R.render`; `R.G.bloom = 0` does not skip | Removes 11 passes |
| 11 | SSR | `R.G.ssr` (p40:130, p40b:155 set 1.0) | 0 default | keep 0 | Removes 3 passes at W/2 |
| 12 | Shadow map size | p02:30 `mapSize.set(2048, 2048)` | 2048 | 1024, set before first frame | 4x fewer shadow texels |
| 13 | Shadow update rate | p02:311 `% 2` | every 2nd frame | `% 3` | About a third less shadow work |
| 14 | Shadow filter | p02:19 `PCFSoftShadowMap` | soft | `PCFShadowMap` | Cheaper filter (not measured) |
| 15 | Shadow extent | `setShadowBox` (default 16 at p24:17; levels 24 to 48) | per level | smallest box that covers play | Texel size |
| 16 | Terrain shadows | p26:73 `castShadow = true` | true | false | Removes the terrain from the shadow pass |
| 17 | Texture anisotropy | p03:46 | 8 | 2 | Cheaper sampling on every textured fragment |
| 18 | Macro weathering | p03:180 default `o.macro === undefined ? 1` | on everywhere | default 0, or `macro: 0` per material | Removes 9 value-noise evaluations per fragment |
| 19 | Large texture sets | p03:159 `marble`, `darkMarble` size 1024 | 1024 | 512 | About 24 MB less GPU memory |
| 20 | Sky dome noise | p23:10 `i < 5` | 5 octaves | 3 | Cheaper full-screen dome |
| 21 | Coruscant towers | `o.n` (levels pass 600 to 1000) | 600 to 1000 | 300 | Fewer lit instances |
| 22 | Speeder traffic | `o.corridors` 34, `o.perLane` 36 (p23:126) | 4,896 | `corridors` 12, `perLane` 10 (480) | Fewer instances |
| 23 | Glow and smoke | p21:27 `mkPts(1200,true)`, `mkPts(700,false)` | 1200 / 700 | 400 / 250 | Fill rate and overdraw |
| 24 | Sparks | p21:5 `NS = 1400` | 1400 | 500 | Fewer line segments |
| 25 | Decals, burns, impacts | p21:71 (60), p21:154 (28), p21:190 (20) | | 20 / 12 / 10 | Small |
| 26 | Character mesh resolution | p09_body.js:206, 241, 267 | 4.8 mm, 2.4 mm | about 2x cell size | Triangles fall about 4x (outside these parts) |
| 27 | Terrain resolution | `res` in `TERRAIN.build` (p41:53 is 2.2; p41:123 is 1.4) | 1.4 to 2.2 m | 3 to 4 m | Triangles scale with 1/res^2 |
| 28 | Rock detail | `o.detail` in `TERRAIN.rock` (p41c uses 3 and 4) | 3 to 5 | 2 to 3 | Fewer triangles per rock |

**Suggested order:** 1, then 4, 5, 7, 6, 8, 12, 13, 16, 17, 18, 19, 20 to 23, and finally 26 to 28.

**Expected effect (not measured).** Item 1 alone gives 2.25x fewer pixels in every full and half-size target. Items 5 and 7 remove six full-screen passes outright. Item 8 cuts the eleven bloom passes to a quarter of their pixels. For a fill-bound phone the arithmetic suggests a 2 to 3x reduction, which needs a device check.

**Mobile switches that already exist:** `?q=low` (MSAA 0, p02:23 only), `?dpr=` (p02:228), `?nmb=` (p26:9), `?dbg` (overlay), `?norender` (logic only, p90:81).
