# E. Kit, level, HUD, menu and game flow: engine API

Read-only reference for the parts that build levels and run the UI: `p22_kit`, `p24_level`, `p24b_holocron`, `p25_props`, `p27_hud`, `p28_menu`, `p29_intro`, `p30_game`, `p85_tests`, `p90_main`, `head.html`. Worked examples: `p40_lvl_works`, `p42_lvl_naboo` (read in full), `p40b_lvl_coruscant`, `p41_lvl_tatooine`, `p41c_run` (skimmed). Also read because they change behaviour described here: `p00_core`, `p01_input`, `p01b_touch`, plus call sites in `p16`, `p17`, `p18`, `p19`, `p20`, `p23`, `p24`, `p26`, `p31`.

**Snapshot.** Written against commit `1e344ed` (13:38 UTC) plus working-tree edits. `parts/p01b_touch.js` was added in that commit and was still changing (last saved 13:41 UTC; it now defaults `TOUCH.want` to `'ground'`). `p01_input.js` and `p90_main.js` were also edited in that window; the content described here is what is on disk now. Re-check section 12 if the touch WIP has moved on.

**Conventions.** Metres, seconds, radians. `yaw = 0` faces +Z: `Actor.forward` is `(sin yaw, 0, cos yaw)` and `Actor.angTo(o)` is `atan2(o.x - x, o.z - z)`. "Game time" is `MG.t`; "real time" is `MG.rt`. All parts share one script scope, so every name below is a global.

---

## 1. Load order and global map

`build.sh` concatenates `head.html`, `vendor/three.classic.js`, then `parts/*.js` in C-locale `sort` order, then embedded assets. Before writing the output it runs `node --check` on each part, `tools/dupcheck.py` (fails on duplicate top-level `const/let/var/function/class` names) and `tools/glslcheck.py` (fails on `smoothstep(a, b, …)` written with literal `a >= b`). The last build (13:21) was 15.9 MB, close to the 16 MB target, so large new assets matter.

Top-level code runs at load, so `LEVEL.def(...)` needs `LEVEL` from `p24`. Name order guarantees that for `p40` and later. Runtime references are safe in any order.

Boot (`MG.boot`, `p90`): `INTRO.start()`, `R.init()`, `IN.init()` (which calls `TOUCH.init()`), `HUD.init()`, `GAME.load()`, `FX.init()`, `CHAR.buildMaul`, `MOV.init()`, then either `?play` (load one level directly) or `MENU.titleScene()` plus `MENU.open('title')`.

## 2. p22_kit.js: KIT (level geometry)

**Purpose.** Writes geometry into buckets keyed by material and 48 m chunk. `KIT.end()` turns each bucket into one mesh. Most builders can also add a physics collider (PHY) in the same call. Use them only inside `def.build(L)`. `LEVEL.load` calls `KIT.begin()`; outside that window `KIT.B` is null and any builder throws.

**Public API.** Builders return a collider from `PHY` or `null`, unless noted.

| Builder | Arguments | Notes |
|---|---|---|
| `KIT.box` | `(x0,y0,z0, x1,y1,z1, mat, o?)` | `o.faces`: subset of `xXyYzZ` (`X` +x, `x` −x, `Y` top, `y` bottom, `Z` +z, `z` −z). `o.mats`: per-face materials. `o.col:false`: no collider. `o.phy`: options for `PHY.box`. |
| `KIT.bbox` | `(x0,y0,z0, x1,y1,z1, mat, o?)` | Chamfered box with world-scale UVs. `o.c` chamfer (0.05), `o.col`, `o.phy`. |
| `KIT.rbox` | `(cx,cy,cz, hx,hy,hz, rx,ry,rz, mat, c?)` | Oriented chamfered box, Euler radians. Visual only, returns nothing. |
| `KIT.obox` | `(cx,y0,cz, hx,y1,hz, yaw, mat, o?)` | Box rotated about Y; `hx,hz` are half sizes. `o.bottom` adds the bottom face. **Argument order differs from `PHY.obox`.** |
| `KIT.beam` | `(a, b, w, mat, c?)` | `a`, `b` are `[x,y,z]`; square section `w`. Visual only. |
| `KIT.cyl` | `(cx,y0,cz, r, h, mat, o?)` | `o.r1` top radius, `o.seg` (24), `o.open`, `o.uvs`, `o.col`, `o.phy`. Collider uses `r` only. |
| `KIT.lathe` | `(prof, cx,cy,cz, mat, o?)` | `prof` is `[[radius, y], …]`. `o.seg`, `o.uvs`, `o.uvs2`. Visual only. |
| `KIT.ring` | `(cx,cz, rIn,rOut, y0,y1, mat, o?)` | Polygon annulus. `o.sides` (32), `o.rot`, `o.a0`/`o.a1` (arc), `o.sideMat`, `o.col`. Collider only for a full ring. `rIn = 0` gives a disc. |
| `KIT.rail` | `(pts, y, mat, o?)` | `pts` is `[[x,z], …]`. `o.h` (1.0). Two rails and posts about every 1.6 m. One thin collider per segment unless `o.col:false`. |
| `KIT.stairs` | `(x0,z0, x1,z1, y0,y1, axis, mat, n?)` | `axis` is `'x'` or `'z'`. Steps are visual; it **always** returns one `PHY.ramp` collider. `n` defaults to `max(2, round(abs(dy)/0.2))`. |
| `KIT.geo` | `(geometry, mat, matrix?, o?)` | Any BufferGeometry. It copies and transforms the copy, so the argument is untouched. `o.worldUV`, `o.uvs`, `o.uvs2`. Visual only. |
| `KIT.quad` | `(mat, a,b,c,d, n, uvf)` | Low-level CCW quad; `uvf(p)` returns `[u,v]`. |
| `KIT.crate` | `(x,z, w,h,d, body, trim, o?)` | Cargo crate centred on `(x,z)`. `o.y` base height, `o.stripe` material, `o.lamp` colour. Always returns a collider (no `col` option). |
| `KIT.lamp` | `(x,y,z, col, i, range, o?)` | Adds a light (`R.addLight`) and a glowing fixture. `o.fixture:false` skips the fixture; `o.size` (0.12), `o.prio` (1). Returns the light. |
| `KIT.emis` | `(col, k)` | Cached MeshBasicMaterial, colour × k, `toneMapped:false`. Use k > 1 for glow. |
| `KIT.shaft` | `(L, p, dir, w, len, col, a?)` | Crossed additive light shaft. Calls `LEVEL.add` and pushes a time updater onto `L.updates`. |
| `KIT.chamferGeo` | `(hx,hy,hz, c)` | Returns a centred BufferGeometry, no mesh. |
| `KIT.end` | `()` | Merges buckets, sets shadow flags, returns `KIT.group`. `LEVEL.load` calls it. |

Real entries from the works level:

```js
KIT.box(-X, -1, Z0, X, 0, Z1, floor);                                    // floor slab, top at y=0, collider
KIT.ring(0, -8, 0, 3.2, 0, 0.3, dark, { sides: 40 });                     // dais disc, collider
KIT.obox(Math.sin(a)*4.6, 0.001, -8 + Math.cos(a)*4.6, 0.03, 0.012, 1.1, a, KIT.emis(0xff2010, 1.6), { col: false });
KIT.stairs(s*(X-3.2), -12.5, s*(X-0.2), -4, 0, 4.2, 'z', dark);         // visual steps + one ramp collider
KIT.crate(-6, 8, 2, 1.3, 1.4, dura, trimMat, { lamp: 0xff2a10 });
KIT.lamp(x, 3.2, z + 0.85, 0xff2a10, 3.5, 9, { size: 0.09 });           // fixture + point light
```

**Hooks.** None inside KIT. Animated geometry uses `L.updates`, usually via `KIT.shaft` or a closure.

**Performance.** Draw calls scale with distinct (material, 48 m chunk) pairs, not piece counts, so share materials. `TEX.mat` and `KIT.emis` cache by value, so changing a colour makes a new material. Each `KIT.lamp` adds a light, but only 7 (`R.NL`) reach the shaders per frame, ranked by `prio × i × range / (1 + d² × 0.02)`. `KIT.end` sets cast shadows except on MeshBasicMaterial and on materials with `userData.noShadow`.

**Gotchas.**
- Any KIT builder outside `build` throws.
- `KIT.obox(cx, y0, cz, hx, y1, hz, …)` puts `y0` before `cz`; `PHY.obox(cx, cz, hx, hz, y0, y1, yaw)` does not.
- By default only `box`, `bbox`, `obox`, `cyl`, `ring`, `stairs` and `crate` produce colliders. `geo`, `lathe`, `beam`, `rbox` and `lamp` do not. Naboo adds `PHY.obox` and `PHY.cyl` by hand for the Queen's ship and the astromechs.
- `col:false` still emits geometry, and `faces` does not change the collider.

**How-to.** Walkable slab: `KIT.box`. Glow strip: `KIT.box(…, KIT.emis(col, 3), {col:false})`. Pipe between two points: `KIT.beam(a, b, 0.2, mat)`. Any mesh: `KIT.geo(new THREE.TorusGeometry(…), mat, new THREE.Matrix4().makeTranslation(x, y, z))`.

## 3. p24_level.js: LEVEL (registry, load, triggers, waves)

**Purpose.** Registers definitions, loads and tears down levels, runs per-frame triggers, waves, doors and checkpoints, and provides the establishing shot.

**Public API.**
- `LEVEL.def(id, d) → d`: sets `d.id`, stores in `LEVEL.defs`, pushes to `LEVEL.order` (nothing reads `order`).
- `LEVEL.load(id, o?) → Promise<L>`: `o.cp` (checkpoint index, default 0), `o.progress(0..1)`. Unknown ids throw `no level <id>`; `GAME.start` routes that to `MG.fail`.
- `LEVEL.add(obj) → obj`: adds to the scene and to `L.extras`, which are removed at teardown. Geometry is not disposed.
- `LEVEL.trigger(x0,z0, x1,z1, fn, o?) → t`: XZ box, optional `o.y0` and `o.y1`, `o.repeat`. Fires `fn` on entry. Without `repeat` it fires once.
- `LEVEL.wave(list, onClear?, o?) → W`: `list` is `[type, x, z, opts?]`, where `type` is an `ENEMY.TYPES` key or `'holojedi'`. `o.now` spawns immediately; otherwise call `W.spawn()`. `o.stagger` is seconds between spawns. `o.alert` (default true) and `o.fx` (default true). Each entry's `opts` are merged over `{alert, grace: 1.2 + i·0.25, yaw: facing the player}`. `onClear` runs 0.8 s after every spawned enemy is dead.
- `LEVEL.door(x0,y0,z0, x1,y1,z1, mat, o?) → D`: `D.openIt()` disables the collider, shakes the camera and puffs dust. `D.close()` re-enables it. The mesh rises by its height, damped at rate 2.5 (time constant 0.4 s). `o.lamp` is stored but never read.
- `LEVEL.checkpoint(i)`: if `i > L.cp`, sets `L.cp`, calls `GAME.saveCP()` (which does not store the index) and `HUD.pop('CHECKPOINT')`.
- `LEVEL.establish(L, cp, sh)`: runs only when `cp == 0`, `!L.skipIntro`, `!MG.test` and `PLAYER.a` exists. `sh = {dur:5, fov:44, p0, p1, l0, l1}`, Vector3s, linear. Sets `PLAYER.state='cine'`, hides the HUD, and restores both at the end.
- `LEVEL.update(dt)`: called from `GAME.update` while `MG.state` is `'play'` (the value `'cine'` is never assigned) and from `MENU.titleUpdate`. Order: triggers, waves (clear and watchdog), doors, `L.updates[i](dt, L.t)`, then `def.update(L, dt)`.

**LEVEL.load sequence.**
1. `MG.state = 'loading'`.
2. Teardown: remove and dispose `L.group`, remove `L.extras`, call `L.dispose` if set (no shipped level sets it).
3. `ENEMY.clear`, `BOSS.clear`, `COMBAT.reset`, `FX.clear`, `PHY.clear`, `R.clearLevelLights` (keeps lights with `persist`), `HUD.setBoss(null)`, `CAM.cine = null`. Keep only `MG.timers` with `real`. Dispose `PLAYER.a`. Null `scene.background` and `scene.fog`.
4. `TEX.init(def.tex)` (progress 0 to 0.5), then `CAST.need(def.cast)` (progress 0.5 to 0.95). No progress is reported during `build`.
5. `L = {def, id, skipIntro, triggers, waves, doors, extras, killY (default -40), t, cp, updates, prompt:null, flags:{}}`. Set `LEVEL.cur = L`.
6. `R.resetGrade()`, `R.setShadowBox(16)`.
7. `KIT.begin()`, `await def.build(L)`, `L.group = KIT.end()`, add to scene.
8. `FX.reattach()`. Spawn at `def.checkpoints[L.cp] || def.start`. `CAM.reset(yaw)`.
9. If `L.env`, `R.setEnvFromScene(L.env)`. `HUD.chapter(def.chapter + ' · ' + def.name)`.
10. `def.onStart(L, L.cp)`, then `MG.state = 'play'`.

**Level object fields.** `prompt` is `null` or `{p: Vector3, text}` and drives the world prompt and the touch USE button. `flags` is free-form. `env` is a Scene used for reflections. Levels attach their own fields too (`L.door`, `L.holos`, `L.gates`, `L.jedi`).

**Hooks.** `def.build(L)`, `def.onStart(L, cp)`, `def.update(L, dt)`, `L.updates`, `L.dispose`.

**Performance.** `R.setEnvFromScene` runs PMREM on every load. Teardown disposes `KIT` geometry, but `LEVEL.add` extras (doors, skies, shafts, holocrons) are only detached, so their GPU buffers leak across loads.

**Gotchas.**
- `LEVEL.establish` called from `build` is a silent no-op, because `PLAYER.a` is null during build. Call it from `onStart`.
- A wave without `now` and without `W.spawn()` never spawns.
- `ENEMY.spawn` treats `y` as the expected floor height, not an offset. Without it, a wave on a ledge searches for floor at y = 0 and falls back to the ground under `(x,z)`.
- Trigger bodies run inside `LEVEL.update`. `GAME.next()` runs teardown synchronously, so the rest of that frame's old-level callbacks run against torn-down state. Shipped updaters null-check `PLAYER.a`, which is why this works. Keep trigger bodies short.

## 4. p24b_holocron.js: HOLOCRON

**Purpose.** Three collectible holocrons per level. Each pickup raises max HP and Force permanently (saved in `GAME.save.holo`).

**Public API.**
- `HOLOCRON.place(L, list)`: `list` is `[[x, floorY, z], …]`. The orb floats 1.1 m above `floorY`. Creates `L.holos = [{id, g, got, Ls, core, cage}]` and an updater. `id` is `levelId + ':' + index`. Pickup radius is 1.4 m from a point 1.1 m above the player's origin.
- `HOLOCRON.apply()`: sets `PLAYER.a.hpMax` and `PLAYER.fpMax` to `100 + 3n`. Called on pickup and from `PLAYER.spawn`.
- `HOLOCRON.count()`: holocrons collected.
- `HOLOCRON.LORE[levelId]`: array of three strings. Index `i` is shown on pickup; a missing key shows no subtitle.

Example (works): `HOLOCRON.place(L, [[16.2, 4.2, 18], [-8.5, 2.2, 17], [-16.2, 4.2, -2]]);`

On pickup: `HUD.toast('SITH HOLOCRON', n + ' / 24', 2.6)`, lore subtitle, HP and Force refilled, ring and spark effects.

**Gotchas.**
- The total `24` is hard-coded: twice in `p24b` (pickup toast and the HUD line) and once in `p28` (chapter select header). Eight levels times three orbs.
- The bob accumulates `position.y += sin(...) × 0.002` every frame, so its amplitude depends on frame rate.
- Each uncollected orb adds a 2.2-intensity light that competes for the seven dynamic light slots.
- `LORE` keys must equal level ids.

## 5. p25_props.js: PROPS (hero props)

**Purpose.** Large set pieces from lathes, boxes and SDF sculptures. Each returns a Group in metres.

**Public API.**
- `PROPS.m(key, params) → MeshStandardMaterial`: cached by key. `params` is used only on the first call.
- `PROPS.lathe(profile, seg=32, mat) → Mesh`: `profile` is `[[r, y], …]`.
- `PROPS.sdfMesh(key, build, box, res) → BufferGeometry`: meshes an SDF sculpture once per key, with one draw group per material. `build(grp)` calls `grp(matIndex, k)`, which returns `{add(shape, op='su', k), both(shape, op, k)}`. `both` adds the shape and its X mirror. Primitives from `p05`: `SDF.ell(c, r, rot?)`, `SDF.rcone(a, b, ra, rb)`, `SDF.box(c, half, round, rot?)`, `SDF.rot(ex,ey,ez)` in degrees. `box` is the meshing volume and `res` is the cell size in metres.
- `PROPS.n1() → Group`: Naboo N-1 starfighter, about 11 m, forward −Z.
- `PROPS.nabooLamp(mat?) → Group`: column about 2.8 m with a glowing globe.
- `PROPS.vaporator() → Group`: Tatooine moisture vaporator, about 3.9 m.
- `PROPS.arcPanel(cx,cy,r, a0,a1, z0,z1, mat, n=16) → Mesh`: curved plate in XY, extruded along Z.
- `PROPS.scimitar() → Group`: Sith Infiltrator, forward −Z. Uses `TEX.mat('hull')` when `TEX.sets.hull` exists.
- `PROPS.bloodfinHull() → BufferGeometry` (cached): speeder body, about 4.1 m, forward +Z.
- `PROPS.speeder() → Group`: Bloodfin bike. `userData.exhaust`, `userData.plume`. Reads `RIDE.BF.gripL` and `RIDE.BF.pegL` from `p18b`.
- `PROPS.r2(c?) → Group`: astromech, about 1.1 m. `c` is the panel colour.

Example (Naboo hangar): `const f = PROPS.n1(); f.position.set(x, 1.3, z); f.rotation.y = yaw + PI; LEVEL.add(f); PHY.obox(x, z, 3.0, 5.6, 0, 2.2, yaw + PI);`

**Performance.** `sdfMesh` and `bloodfinHull` mesh on the main thread the first time, inside `LEVEL.load`, then stay cached for the session. Each Mesh is its own draw call, because props are not merged into KIT buckets. Every mesh casts and receives shadows.

**Gotchas.**
- `PROPS.m` ignores new params for an existing key. Change the key to change the look.
- `sdfMesh` caches by `key` regardless of `build`. Change the key when the sculpt changes.
- A `box` too small for the sculpt clips it silently.

## 6. p27_hud.js: HUD (DOM overlay)

**Purpose.** Drives the DOM overlay. Nothing is drawn on the canvas.

**Public API.**
- `HUD.init()`: caches the element ids into `HUD.el`. `MG.boot` calls it first.
- `HUD.show(on)`: toggles `#hud`.
- `HUD.obj(text)`: objective line (`#objD`), flashes pink for 0.9 s.
- `HUD.chapter(text)`: chapter line (`#chapT`). `LEVEL.load` sets it.
- `HUD.pop(text)`: centred prompt for 1.1 s. Suppresses the world prompt while it runs.
- `HUD.toast(a, b, dur=2.4)`: small line `a` over big line `b`. Empty arguments hide it.
- `HUD.hint(html, dur=5)`: bottom chip (innerHTML). Its timer does not run while `body.cine`.
- `HUD.hideHint()`.
- `HUD.sub(who, text, dur?, cls?)`: subtitle `<b class=cls>who</b>text` (innerHTML). `cls` is `'sid'` (purple), `'jedi'` (blue) or empty (red). Default duration is `max(2.5, len × 0.065)`.
- `HUD.hurt()`: red vignette for 0.5 s. `HUD.flash(alpha=0.6)`: white flash fading over 0.6 s.
- `HUD.setBoss(obj|null, name?, sub?, cls?)`: boss bar. `cls` is `''`, `'green'` or `'foe'`. `obj` needs `hp`, `hpMax`, `guard`, `guardMax`, `alive`, `keepBar`. A new named boss fires a toast using `sub.split('·')[0]`.
- `HUD.update(dt)`: per frame, called with real dt by `GAME.update`. Covers HP lag, Force, rage, lock reticle, execute prompt, world prompt (`LEVEL.cur.prompt`), combo rank, boss bar, timers and vignette.
- `HUD.project(vec3) → [px,py] | null`: null when behind the camera or outside ±1.1 NDC.

Example: `HUD.sub('DARTH SIDIOUS', 'Find them. Silence them both.', 4, 'sid');` (works).

DOM ids: `hud hpFill hpLag fpFill rageFill rageBar objD chapT combo cN cR cRfill boss bossN bossFill bossGuardF bossSub lock prompt toast toastA toastB sub hint vig flash holo`. All exist in `head.html`.

**Gotchas.**
- `hint`, `sub` and the execute prompt use innerHTML without escaping. Never pass player-typed text.
- `HUD.update` writes styles every frame. Keep per-frame DOM writes to style properties.
- `HUD.obj` resets its colour with `setTimeout` (real time), not game time.

## 7. p28_menu.js: MENU (screens, navigation, flow)

**Purpose.** Title, chapter select, controls, pause, death and result screens. Each renders into `#menus`.

**State.** `MENU.cur` (current screen name), `MENU.sel`, `MENU.items` (focusable elements), `MENU.titleT`.

**Screens** (`MENU.open(name, o?)`):

| name | options | content and actions |
|---|---|---|
| `title` | none | Logo. NEW GAME (labelled BEGIN THE HUNT when there is no progress) starts `GAME.start('works')`. LEVEL SELECT opens `chapters`. Difficulty cycles `MG.difficulty`. CONTROLS. One button per chapter starts `GAME.start(c.first)`. Sets `MG.state='title'`. |
| `chapters` | none | Cards per chapter. Each `.lvlb` starts that level. BACK goes to title. |
| `controls` | `o.back` | Static keyboard and gamepad table. BACK goes to `o.back \|\| 'title'`. |
| `pause` | none | RESUME, RESTART CHECKPOINT (`GAME.retry`), CONTROLS (back to pause), QUIT (`MENU.toTitle`). Sets `MG.state='pause'`. |
| `dead` | none | Random quote. RISE AGAIN (`GAME.retry`), QUIT. |
| `result` | `o.ch`, `o.final`, `o.next` | Time (from `GAME.levelStart.t`), `COMBAT.kills`, `COMBAT.style.best`, `COMBAT.deflects`, difficulty. CONTINUE (`GAME.start(o.next)`) and TITLE. |

An unknown name sets `MENU.cur` and renders nothing.

**Functions.**
- `MENU.close()`: empties `#menus`, `MENU.cur = null`, `MG.onKey = null`.
- `MENU.resume()`: close, `MG.state='play'`, show the HUD.
- `MENU.toTitle()` (async): close, `MENU.titleScene()`, open `title`.
- `MENU.titleScene()` (async): loads `works` silently (`MG.skipIntro = true`), clears its waves and triggers, puts Maul in guard, sets the title rim and fill lights.
- `MENU.titleUpdate(dt)`: orbits the camera, idles Maul, then calls `LEVEL.update(dt)`.
- `MENU.mk(html, id, cls?) → div`: replaces `#menus` contents with `div.menu.on`.
- `MENU.item(root, selector, fn)`: stores `fn` on the matched element as `_fn`.
- `MENU.bindList(root)`: collects `.mi:not(.dis)`, `.card:not(.lock)` and `.lvlb`, and sets `MG.onKey`. Keyboard: arrows or WASD move (left and right too when `#chapList` exists). Enter, Space and NumpadEnter activate. Escape or Backspace steps back: pause resumes; any screen except title and dead goes to title. Mouse hover selects, click activates.
- `MENU.activate(i)`.

**Flow.** Pause is `IN.hit('pause')` inside `GAME.update`, blocked during cinematics. On death, `PLAYER.die` sets state `dead`; after 2.0 game seconds `GAME.onPlayerDeath` opens the dead screen. `GAME.result` opens the result screen.

**Adding a data-driven screen.** There is no registry. Each screen is an `if` branch in `MENU.open`. The pattern below uses the existing primitives. `MENU.list` does not exist in the code yet; it is a suggested helper.

```js
MENU.list = function (id, title, rows, o) {        // proposed helper
  o = o || {};
  const body = rows.map((r, i) => `<div class="mi" id="mr${i}">${r.label}${r.sub ? `<small>${r.sub}</small>` : ''}</div>`).join('');
  const d = MENU.mk(`<div class="hd">${title}</div><div class="mlist">${body}</div><div class="back mi" id="mBack">‹ BACK</div>`, id, 'panel');
  rows.forEach((r, i) => MENU.item(d, '#mr' + i, r.fn));
  MENU.item(d, '#mBack', () => MENU.open(o.back || 'title'));
  MENU.bindList(d);
};
// inside MENU.open:
// if (name === 'mods') return MENU.list('mods', 'MODS', [{ label: 'HARDER', sub: 'hard', fn: () => { MG.difficulty = 'hard'; } }], o);
```

If the screen needs its own layout, add an `#mods` rule to `head.html`.

**Gotchas.**
- Escape from a sub-screen goes to title, not to its parent. Controls opened from pause, then Escape, lands on title.
- Escape does nothing on `dead`. On `result` it goes to title.
- Menu layout uses `vw`/`vh` absolute positions and has no `@media` rules. The three-card chapter row and the two-column controls have no narrow-screen rules.
- Taps inside `.menu` are left to DOM click handlers; the touch layer ignores them.

## 8. p29_intro.js: INTRO (boot film)

**Purpose.** Plays the boot film in shipped builds only. `build.sh --ship` embeds `intro/intro.mp4` as `#introB64`. The title card rises at `INTRO.TITLE_T = 9.0` s.

**API.** `INTRO.available()`, `INTRO.start() → bool`, `INTRO.play(auto)`, `INTRO.showTitle()`, `INTRO.finish()`. State: `INTRO.on`, `INTRO.done`, `INTRO.phase` (`off`, `video`, `gate`, `title`).

**Behaviour.** `start` is skipped (and `done` is set) for `?nointro`, `?play`, `?view`, `?test`, or headless without `?forceintro`. If autoplay with sound is refused, `#introGate` asks for a key or tap. Input during the video seeks to the title card; the next input finishes. `finish` fades audio over 1.3 s and clears `IN.pressed` and `IN.buf` so the skip key does not also press a menu item.

**Gotchas.** Skip listens on `keydown` and `mousedown` on `#intro` only. On touch, skip works through the synthesized mousedown from a tap. The copy says "PRESS ANY KEY". Dev builds never show the film, so it is not tested by `?test`.

## 9. p30_game.js: GAME (flow, chapters, save)

**Data.**
- `GAME.seq = ['works','rooftops','blacksun','dunes','canyon','hangar','generator','pit']`: play order. `GAME.next` walks it.
- `GAME.chapters[i] = {n, t, p, first, d, lore}`: three chapters. `first` is the entry level: works, dunes, hangar.
- `GAME.levels = [['works','rooftops','blacksun'], ['dunes','canyon'], ['hangar','generator','pit']]`: chapter select. Must match `seq`.
- `GAME.LINES[levelId]`: boot-screen quote.
- `GAME.save = {unlocked, best, holo}`: stored under localStorage key `maul_sith_apprentice`. `GAME.load` merges it in; `GAME.store` writes it.
- `GAME.chapterOf(id)`: index-based. Below 3 is 0, below 5 is 1, otherwise 2.

**Functions.**
- `GAME.start(id, cp?)` (async): closes menus, shows the boot overlay with level and chapter names and the quote, runs `LEVEL.load` with progress, sets `GAME.levelStart = {t: MG.rt, kills: COMBAT.kills}`, and unlocks the chapter. Load errors go to `MG.fail` (the `#err` panel).
- `GAME.next()`: next seq entry that has a definition. End of seq calls `GAME.result(true)`. A chapter change calls `GAME.result(false, nextId)`. Otherwise `GAME.start(nextId)`.
- `GAME.retry()`: `GAME.start(LEVEL.cur.id, LEVEL.cur.cp)`.
- `GAME.result(final, nextId?)`: sets `MG.state='result'` and opens the result screen.
- `GAME.onPlayerDeath()`: sets `MG.state='dead'` and opens the dead screen.
- `GAME.saveCP()`: writes `GAME.save`. The checkpoint index is not stored.
- `GAME.update(rdt)`: per-frame orchestration. `MG.hitStop` slows time to 0.06×. `MG.slowmo` scales time for `MG.slowmoDur` (default 0.6 real seconds). While a cinematic plays, holding confirm, pause or jump runs ×6 (a fast-forward, not a skip). Pause is `IN.hit('pause')` outside cinematics. Then the player, enemies, combat, level, boss, FX, camera, shadow and HUD updates. The title state calls `MENU.titleUpdate`. Dead, pause and result only idle the character.
- `MG.gameUpdate = GAME.update`. `MG.difficulty = 'normal'` (`easy`, `normal`, `hard`). Difficulty scales enemy HP (×0.7 or ×1.3) and Jedi base HP (×0.65 or ×1.35).

**Everything keyed to level ids.** Update all of these when a level is added or renamed:
1. `GAME.seq`, `GAME.chapters[i].first`, `GAME.levels`, `GAME.LINES`, `HOLOCRON.LORE`.
2. `GAME.chapterOf` thresholds (3 and 5 are hard-coded).
3. `p28`: the title PLAY and `MENU.titleScene` use `'works'`. Chapter cards are generated.
4. `p17_actor.js:101`: footstep dust for `'rooftops'`.
5. Level code: `GAME.result(false, 'dunes')` in `p40b` (blacksun) and `GAME.result(false, 'hangar')` in `p41` (canyon).
6. `p85_tests.js`: the all-levels loop is generated from seq, but the `generator` (duel) and `dunes` (bike) blocks are hard-coded.
7. `MG.rs(name)` and `TERRAIN.mat(name)` take names as seeds. Renaming them changes generated layouts.

**Gotchas.**
- Title PLAY shows `NEW GAME` when `save.unlocked > 1`, and `save.resume` is read but never written. PLAY always starts Works at checkpoint 0. There is no continue.
- Checkpoints are not persisted, so a reload restarts the level.
- `COMBAT.kills` and `COMBAT.deflects` are never reset, so result screens show totals since page load. `GAME.levelStart.kills` is stored and never used.
- `MG.t` and `MG.rt` keep advancing under pause, dead and result. `MG.after` timers therefore fire under those menus. `LEVEL.load` keeps `real` timers, so a real timer can fire in the next level.
- `GAME.start` has no re-entrancy guard. Two triggers entering in one frame, or a double tap on a level card, start two loads.
- The GAME.update "skip" is a ×6 fast-forward. The on-screen text (`#skip`) reads "HOLD ESC / ENTER TO SKIP".

## 10. p85_tests.js (harness) and p90_main.js (loop, boot, flags)

**Harness.** `TEST.run()` runs when the URL has `?test`. It sets `MG.manual`, which stops the rAF loop, and then drives `MG.tick` through real DOM events. Checks, in order: no boot errors; title present; click `#mPlay` and reach `works`; WASD moves; LMB starts a combo; 30 s idle survival; autopilot kills a holo Jedi; a blocked bolt deflects; each good-guy template spawns and takes damage; every `GAME.seq` level loads with no new errors and a living player after 60 steps; the generator Jedi duel; Bloodfin mount and ride. `TEST.ok(name, cond, info)` appends to `TEST.results`, sets `document.title` to `p/n`, and logs `TEST RESULT p/n`.

A new level joins the all-levels check automatically once it is in `GAME.seq`.

**Flags.** Read from the query string. `?x` is `true`; numeric strings become numbers.
- `?test`: harness. Also skips the intro and makes `LEVEL.establish` a no-op.
- `?play=<id>`: boot straight into a level with no title. `?cp=<n>` with it selects a checkpoint. `?nointro` with it sets `MG.skipIntro`, so `onStart` takes its non-cinematic branch.
- `?dbg`: fps, dynamic resolution scale, draw calls and triangles in `#dbg`.
- `?view`, `?cast=a,b`, `?clip=<name>`: character viewer.
- `?diff=easy|normal|hard`, `?gate` (force the no-autoplay gate), `?forceintro`, `?norender` (logic only).
- Other flags (`br`, `dpr`, `fr`, `hv`, `msaa`, `nmb`, `q`, `sdf`, `paint`, `norag`, `nomocap`, `dbgreg`, `dbgshell`, `tdbg`, `gsr`) are read in other parts.

**Boot and loop.** `MG.boot` runs on window load. `MG.loop` is the rAF handler, with dt clamped to 0.1 s. `MG.tick(dt)`: `MG.rt += dt`; `IN.poll()` (which calls `TOUCH.frame`); `MG.frameUpdate` (`GAME.update`, or the viewer); `MG.runTimers()`; `IN.endFrame()` (clears pressed and released); `R.render` unless `?norender`; `MG.frame++`.

`window.__mg`: `step(n, dt)` for manual stepping, `info()`, `shot(q)` (JPEG data URL), and getters for `R`, `MG` and `CHAR`.

**Gotchas.** `IN` reads `MG.onMouse`, but nothing assigns it. `IN.hit` is true for one tick only; use `IN.take` for buffered presses.

## 11. head.html: DOM and CSS contract

**Structure.** One `<style>` block with `:root` variables (`--red --red2 --deep --ink --bone --dim --gold --f`), then the body: `#cv` canvas; `#hud` (HUD ids); `#sub`, `#hint`, `#vig`, `#flash`; letterbox `#lbT` and `#lbB`; `#skip`; `#menus`; `#boot` loader (`h1`, `h2`, `#ldTrack`/`#ldBar`, `#ldMsg`, `#ldQuote`); `#intro` (`#introV`, `#introTitle`, `#introGate`, `#introBar`/`#introBarF`, `#introSkip`); `#dbg`; `#err`. The build appends scripts after this.

**JS-required ids** (checked against the parts): the HUD set in section 6, plus `cv`, `menus`, `boot`, `ldBar`, `ldMsg`, `ldQuote`, `intro`, `introV`, `introTitle`, `introGate`, `introBar`, `introBarF`, `introSkip`, `dbg`, `err`.
- Created at runtime: `#touch`, `#tjoyBase`, `#tjoyKnob`, `#tjoyHint`, `#tskip`, `#trot` (touch layer, with its own injected CSS), `#runHud` (p41c, a level-owned panel).
- Build-injected: `#introB64` (ship builds only), `#qjson`, `#qbin`, `#tex_*` (from `assets/*.jpg`), `#ast_*`.

**CSS notes.** `body` sets `touch-action:none` and `user-select:none`. There are no `@media` rules. `kbd` styles keyboard keys. `#skillMenu` and `.sk` are dead CSS. `body.cine` shows the letterbox bars and `#skip`.

**Maul-branded text to re-theme.** In `head.html`: the `<title>`; `#boot` `h1` "DARTH MAUL" and `h2` "SITH APPRENTICE" (`GAME.start` replaces `h2`); `#ldQuote`; `#introTitle` "DARTH / MAUL / SITH APPRENTICE"; `#introGate` `.ig-t`; the HUD `.barLbl` "Darth Maul". In JS: the title logo and quote (`p28`), death quotes, `MG.VERSION`, the `maul_sith_apprentice` storage key, the holocron lore, and the speaker names `DARTH SIDIOUS` and `DARTH MAUL`.

**Keyboard-only UI to replace for touch.**
- `#skip`: "HOLD ESC / ENTER TO SKIP". Holding it runs cinematics ×6; it does not skip them.
- `#introGate`: "PRESS ANY KEY TO BEGIN". `#introSkip`: "PRESS ANY KEY TO SKIP".
- Controls screen (`p28`): WASD, SPACE, SHIFT, TAB, LMB and RMB, Q, E, F, R, X, arrow keys, and a gamepad row. Title footer: "Mouse + keyboard or gamepad".
- `kbd` styling: `IN.keyLabel` returns `<kbd class="tb">STRIKE</kbd>`-style chips. The labels are already touch names, but they inherit the keyboard `kbd` look, since `.tb` has rules only inside `#touch`.
- Hint text: `p41` line 94 and `p41c` line 426 ("Walk to the speeder and press …"), and `p40` line 160 ("press again to Force flip").
- Keyboard navigation in `MENU.bindList` and `MG.onKey`. Mouse and tap clicks still work.

## 12. Input and touch: p01_input.js, p01b_touch.js

**Actions.** `IN.ACT` maps action names to keys (`k`), mouse buttons (`m`) and pad buttons (`p`). Gameplay: attack (LMB), heavy (RMB), jump (Space), dodge (Shift), block (Q), push (E), grip (F), throw (R), lock (Tab, C, middle button), rage (X, V), pause (Esc, P), confirm (Enter), back (Backspace). Touch-only: interact (G), ship (H), scan (T), dominate (Y), fire, boost, roll, missile, brake, skip (`T_*` keys), assist1 and assist2 (digits).

Consumed in the parts: attack, jump, heavy, dodge, push, grip, throw (`take` or `peek`); block (`down`); rage, lock, pause (`hit`); confirm, pause and jump (cinematic fast-forward). **Not consumed:** interact, ship, scan, dominate, fire, boost, roll, missile, brake, skip, back, assist1, assist2.

**API.** `IN.down(a)` held; `IN.hit(a)` pressed this tick; `IN.up(a)` released; `IN.take(a, win=0.28)` buffered press, consumed on read; `IN.peek(a)`; `IN.keyLabel(a)` (section 11). `IN.A.mx/my` is move in −1..1; `IN.A.lx/ly` is look for this tick.

**Touch (`TOUCH`, `p01b`).**
- `TOUCH.init()`, called from `IN.init`, injects the CSS and the `#touch` overlay, `#tskip`, `#trot`, and global pointer listeners.
- `TOUCH.want = 'ground'` by default. `TOUCH.activeMode()` returns it only in state `play`, in landscape and outside cinematics; otherwise `'none'`. `TOUCH.frame()`, called from `IN.poll`, switches modes and shows or hides buttons.
- Ground buttons (`TOUCH.MODES.ground`): attack (main), heavy, block, jump, dodge, push, grip, throw, rage (only at 100 rage), ctx (USE, or EXECUTE; the USE label comes from `LEVEL.cur.prompt.text`, max 12 characters), ship and scan (hidden, because `SHIP` and `SCAN` are undefined), lock, pause. A press sets `IN.keys['T_<action>']`, `IN.pressed` and `IN.buf[action]`.
- A floating left stick (`x < 42% W`, `y > 18% H`) writes `TOUCH.jx/jy`. A right-side drag writes `TOUCH.lx/ly`. A double tap in the look zone toggles lock-on.
- `#tskip` during a cinematic sets `IN.keys.T_confirm` for 2.5 s, a ×6 fast-forward. `CINE.skip` is used only if `CINE` exists, and it does not in these parts.
- Portrait (`H > 1.05 W`) shows `#trot` ("ROTATE YOUR DEVICE") at z-index 95, over everything including menus. Desktop windows taller than wide get it too.
- `TOUCH.cfg = {size, opacity, lefty, sens, invertY, haptics, quality, autoBlock}`, saved under `rathatri-settings.touch` via `TOUCH.setCfg` and `TOUCH.save`.

**Gotchas.**
- The USE button fires `interact`, and nothing reads it. `LEVEL.cur.prompt` therefore shows a button that does nothing unless the level calls `IN.take('interact')`.
- `TOUCH.onDown` skips taps inside `.tm`, `#cineChoice`, `#codex`, `#yard` and `#galaxy`. None of those exist in this build.
- `MG.pauseReq` is set on tab hide and never read, so backgrounding does not pause the game.
- Most touch buttons are icon-only, while hints name them ("STRIKE"). The space-mode buttons are dead without `SPACE` and `SHIP`.

## 13. Worked examples: the LEVEL.def anatomy

Fields used by the shipped levels:

| field | type | used for |
|---|---|---|
| `chapter`, `name` | string | HUD line and chapter select |
| `world` | `'coruscant'`, `'naboo'`, `'tatooine'` | Rim light (`R.resetGrade`), footstep and steep rules (`p17`). Other strings get defaults. |
| `cast` | string[] | `CAST.need` before build. Every enemy template a wave uses must be listed. |
| `tex` | string[] | `TEX.init` generator names: `marble nabooWall metalPanel grate ribWall sand rock adobe duracrete darkMarble carpet sithFloor towerWin hull` |
| `start` | `[x,y,z,yaw]` | Spawn when there is no checkpoint for `cp` |
| `checkpoints` | `[[x,y,z,yaw], …]` | Index equals cp number |
| `killY` | number, default −40 | Below it the player falls back to the last safe point and enemies die |
| `build(L)` | async | Geometry, colliders, lights, sky, sun, fog, env, holocrons, doors |
| `onStart(L, cp)` | function | Objective, wave chain, cinematics, exit trigger |
| `update(L, dt)` | function | Per-frame logic (Naboo's pit gates) |
| `L.env` | Scene | Reflection source, set in build |

Sky helpers: `SKY.coruscant(L, o)` takes `r0 r1 n base fog sunDir keepOut cx cz senateX senateZ templeX templeZ seed` and sets `L.env` and `scene.fog`. `TERRAIN.tatooineSky(L, o)` sets `L.env` and the sun; `p26` reads `o.sun` and `o.sunI`. `NABOO.sky(L, o)` in `p42` builds its own `SKY.dome(U, glsl)`.

Grading and character lighting: `R.G` (exposure, bloom, tint, `gShadow`, `gHigh`, `vol*` volumetrics, `ssr`, `ssrMax`, haze) is reset from `R.G_DEF` on every load, so set overrides in `build`. Character rim and fill come from `CM.rimU` and `CM.fillU`.

**Minimal annotated level** (derived from works):

```js
LEVEL.def('mylevel', {
  chapter: 'CHAPTER IV', name: 'MY LEVEL', world: 'naboo',
  cast: ['guard', 'panaka'],                       // CAST.need before build(); holojedi also needs obiwan, quigon, darsha
  tex: ['marble', 'metalPanel'],                   // TEX.G generator names
  start: [0, 0, -10, 0],                           // [x, y, z, yaw]; yaw 0 faces +Z
  checkpoints: [[0, 0, -10, 0], [0, 0, 20, 0]],    // index = cp; LEVEL.checkpoint(1) selects entry 1
  killY: -30,
  async build(L) {
    const floor = TEX.mat('marble', { color: 0xaaaaaa, env: 1.0 });
    KIT.box(-20, -1, -20, 20, 0, 30, floor);       // floor slab, top at y = 0, with collider
    L.door = LEVEL.door(-3, 0, 30, 3, 6, 30.5, TEX.mat('metalPanel'));
    HOLOCRON.place(L, [[10, 0, 0], [-10, 0, 5], [0, 0, 25]]);
    R.setSun(new THREE.Vector3(-0.7, 0.5, 0.3), 0xffe0c0, 2.5, 0x9ab0c8, 0x604030, 1.0);
    R.setShadowBox(24, 120);
    R.scene.fog = new THREE.FogExp2(new THREE.Color(0.5, 0.5, 0.5), 0.004);   // fog is nulled before build
    const env = new THREE.Scene(); env.background = new THREE.Color(0.4, 0.4, 0.4); L.env = env;
  },
  onStart(L, cp) {
    HUD.obj('Find the way out');
    LEVEL.trigger(-3, 30.2, 3, 33, () => { if (L.door.open) GAME.next(); });   // exit: create before any early return
    if (cp >= 1) { L.door.openIt(); return; }
    LEVEL.establish(L, cp, { dur: 5, fov: 44, p0: V3(-6, 4, -14), p1: V3(0, 1.6, -9), l0: V3(0, 1, 0), l1: V3(0, 1.4, 6) });
    MG.after(5.2, () => LEVEL.wave([['guard', -6, 5], ['guard', 6, 6]], () => {
      LEVEL.checkpoint(1); L.door.openIt(); HUD.obj('Leave through the door');
    }, { now: true, stagger: 0.5 }));
  },
});
```

**What works does, and where to copy it from.**
- Encounter chain: three `LEVEL.wave` calls, each started from the previous one's `onClear` with `MG.after`, using `{now: true, stagger}`.
- Scripted intro: `PLAYER.state = 'cine'`, `HUD.show(false)`, `a.play('kneel')`, `CAM.play({dur, fov, fn: (t, u) => ({pos, look})})`, then `MG.after(10, …)` hands control back.
- Gate: a door opened from a wave's `onClear`, with an exit trigger that checks `L.door.open`.
- Ambient effects: `L.updates.push((dt, t) => …)`.

Naboo (hangar and generator) adds a custom sky, a two-Jedi boss bar built from a fake boss object with `HUD.setBoss`, `BOSS.extra` (a per-frame boss hook), `onDefeat` callbacks, and `GAME.result(true)` for the finale. Its pit level drives gates from `def.update`.

## 14. Cross-cutting gotchas

1. KIT builders throw outside `build`. `LEVEL.establish` is a no-op outside `onStart`.
2. `MG.after` keeps counting under pause, dead and result menus. `real` timers survive level loads.
3. `GAME.next()` tears the level down synchronously. Keep trigger bodies short, and avoid starting two loads in one frame.
4. Kill and deflect counters are session totals.
5. TEX, KIT and PROPS caches are never cleared, and `LEVEL.add` extras leak GPU buffers across loads.
6. The loading bar stalls during `build`, because progress is reported only for textures and cast.
7. Unknown `tex` or `cast` names throw inside `LEVEL.load`. Enemy templates that are missing throw from `ENEMY.tplOf`.
8. `dupcheck.py` does not check level ids, `ENEMY.TYPES` keys, or `CAST.SPECS` keys. `guard` is defined in `p20_ai` and overridden by `Object.assign` in `p20b_roster`, and it also appears in `CAST.SPECS` in `p15c` and `p15d`.
9. `p41c` extends the `p41` dunes definition with `Object.assign(LEVEL.defs.dunes, …)`. Its build and onStart replace `p41`'s, so `p41`'s dunes build and onStart are dead. Edit `p41c_run.js` for the Bloodfin run. The override depends on `p41` sorting first.
10. `ENEMY.TYPES.garyn` and class `Garyn` (`p40b`) are defined but no level spawns them.
11. Hooks that are set but never read: `MG.onMouse`, `MG.pauseReq`, `LEVEL.order`, `L.door.lamp`, `GAME.save.best`, `save.resume`, and the `#skillMenu` CSS.

## 15. RECIPE: add a new level end-to-end

1. **File and namespace.** Create `parts/p43_lvl_<name>.js`. It sorts after `p42` and therefore after `p24` (`LEVEL`) and `p22` (`KIT`). Give helpers a unique name such as `const MYLVL = {}`, because all parts share one scope.
2. **Definition.** Write `LEVEL.def('<id>', {…})` as in section 13. Put every sky, sun, fog and env setting in `build`. Use `KIT`, `PHY` and `LEVEL.door` for geometry and colliders. Put the checkpoint calls in the encounters, and branch on `cp` in `onStart`.
3. **Registry.** Add the id to `GAME.seq` at its place in play order (`p30`). Add it to the right row of `GAME.levels`. If you add a chapter, extend `GAME.chapters`, `GAME.levels` and `GAME.chapterOf`. Optionally add `GAME.LINES[id]`.
4. **Holocrons.** Add `HOLOCRON.LORE[id]` with three lines and call `HOLOCRON.place` with three positions. If the total changes, update the three `24` strings (section 4).
5. **Exit.** Call `GAME.next()` from an exit trigger. When the next level starts a new chapter, the result screen appears automatically. To jump to a different level, use `GAME.result(false, '<id>')`.
6. **Cast.** List every enemy template your waves use. If you use `holojedi`, include `obiwan`, `quigon` and `darsha`.
7. **Hints and prompts.** Use `IN.keyLabel(action)` for button names. Avoid "press", "key", "ESC" and "SPACE" in strings. If you set `LEVEL.cur.prompt`, handle `IN.take('interact')` in `def.update` so the touch USE button does something.
8. **Build.** Run `./build.sh`. It runs `node --check`, `dupcheck.py` and `glslcheck.py`. Watch the size against 16 MB.
9. **Test.** Open `build/game.html?test` and read `TEST RESULT p/n` in the console or the title bar. The level is in the all-levels loop: it must survive 60 steps with no new errors. For quick checks use `?play=<id>&nointro`, add `&cp=1` for a checkpoint, use `?dbg` for cost, and `window.__mg.shot()` for a screenshot.
10. **By hand.** Check the exit, retry after death (`GAME.retry`), the checkpoint index after `LEVEL.checkpoint`, and that a reload restarts the level, because checkpoints are not persisted.
11. **Optional.** Add a `?play` block to `p85_tests.js` for checks specific to your level.
