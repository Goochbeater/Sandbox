# RATHATRI engine API: camera, actor, ragdoll, player, ride, combat, AI, roster, boss

Scope: `parts/p16_cam.js`, `p17_actor.js`, `p17b_ragdoll.js`, `p18_player.js`, `p18b_ride.js`, `p19_combat.js`, `p20_ai.js`, `p20b_roster.js`, `p31_boss.js`. Each file was read in full. Read-only audit; no code was changed.

**Snapshot.** During this audit `parts/p01_input.js` changed on disk (13:35:49 UTC). It now has a dormant touch hook (`TOUCH.jx/jy/lx/ly/on`, `TOUCH.init()`, every use guarded by `typeof TOUCH !== 'undefined'`) and synthetic `T_<action>` key codes. `TOUCH` itself is not defined in `parts/` yet. The nine assigned parts are unchanged (mtime 13:20:52). Section 11 documents the input contract as it reads now.

---

## 0. Frame, load order, conventions

**Per frame** (`p90_main.js` `MG.tick`, once per animation frame):

1. `IN.poll()` (p90:77) rebuilds `IN.A.mx/my/lx/ly` from keyboard, gamepad and `TOUCH`.
2. `GAME.update(rdt)` (p30:51). In states `play` and `cine`: `PLAYER.update` → `ENEMY.update` → `COMBAT.update` → `LEVEL.update` → `BOSS.update`. Then `FX.update`, then `CAM.update(rdt × (skip ? 6 : 1))` (not in title), `R.updateShadow`, `HUD.update`.
3. Simulation `dt = min(rdt, 0.05) × k`, where `k` is 0.06 during hit-stop, times `MG.slowmo`, times 6 on cinematic skip. `CAM.update` gets the unscaled `rdt`, so the camera keeps moving through hit-stop.
4. `MG.runTimers()` runs `MG.after` callbacks.
5. `IN.endFrame()` (p90:80) clears only `pressed`, `released`, `mbP`, `mbR` and `wheel`.
6. `R.render`.

**Load order.** `build.sh` concatenates `parts/*.js` in `LC_ALL=C` sort order. This group depends on:

- MOV (`p14`) and CAST (`p15`, `p15c`) before `p18` and `p20`, because they are used at load.
- `p18` before `p18b` (adds `PLAYER.states.ride`) and `p20b` (wraps `PLAYER.push` at load).
- `p20` before `p20b` (prototype wraps) and before subclasses such as Garyn (`p40b`).
- `p20b` captures `CAST.staff` at load.
- `MOV.init()` (p14:122, called in `MG.boot` after `CHAR.buildMaul`, p90:94-95) attaches shared reactions (`hitL`, `hitR`, `hitHeavy`, `hitSpin`, `knock`) and `deathFall` to trooper, melee and brawler. An enemy built before it has no directional hits and never ragdolls.

**Conventions.** Metres, seconds, radians. Yaw 0 faces +Z. Forward is `(sin yaw, 0, cos yaw)`. `angTo(o) = atan2(dx, dz)`. `MG.t` is game time (scaled by hit-stop and slow-motion). `MG.rt` is real time (input buffers, HUD). Helpers from `p00`: `damp(a,b,k,dt)` (exponential ease), `dampA` (wrapped angle), `clamp`, `sat`, `lerp`, `smooth`, `easeIO`, `easeOut`, `rnd`, `pick`, `V3`. `RNG()` is one seeded stream shared by gameplay and FX, so any extra call shifts every later roll.

**Clip format** (`p14:1-5`): `{dur, loop, keys:[K(t,h,a,extras)], ev:[[t0,t1,mask,dmg,kind]], move:[[t,metres]], next, cancel, impact, locoMix, fadeOut}`, where `K(t,h,a,x) = {t,h,a,...x}`. Extras in the data include `g`, `st`, `tw`, `pi`, `cr`, `headYaw`, `headPitch`, `fl/fr/fL/fR`, `liftL/liftR`, `oL/oR`, `flip`, `air`, `off`, `lean`, `le`, `yaw`, `ease`. These parts read `ev`, `next`, `cancel`, `impact`, `fadeOut`, `locoMix`, `loop`, `move`, `dur`, `keys`. `iframes`, `aoe` and clip-level `force` are data with no reader.

---

## 1. p16_cam.js: CAM

**Purpose.** Third-person orbit camera: pivot follow, lock-on and combat framing, auto-follow, collision, shake, FOV, cinematic shots.

**API.**

- `CAM` fields: `yaw` (rad), `pitch` (clamped to [-1.0, 0.6]), `dist` (3.25), `fov` (58), `pos`, `look`, `pivot`, `curD`, `idleT`, `lockBlend`, `h` (1.55), `shoulder`, `snap`, `cine`.
- `CAM.reset(yaw = 0)`: sets `yaw`, `pitch = -0.2`, `snap = true`, `cine = null`.
- `CAM.update(dt)`: if `CAM.cine` is set, delegates to `cineUpdate` and returns. Otherwise reads `IN.A.lx/ly`, updates yaw, pitch, pivot, distance, collision, shake and FOV, and positions `R.camera`.
- `CAM.play(shot)`: starts a shot. Copies the object over `{t:0, fov:45}`.
- `CAM.cineUpdate(dt)`: internal per-frame evaluation.

**Shot format.**

```js
CAM.play({ dur: 1.35, fov: 44, fn: (t, u) => ({ pos: V3(...), look: V3(...) }) }); // p18:486
CAM.play({ dur: 99, hold: true, fov: 38, fn: (t) => ({ pos, look }) });            // saber lock, p31:229
CAM.play({ dur: 4, fov: 40, p0, p1, l0, l1, ease: 'lin' });                        // linear form
```

- `dur` in seconds. `fov` defaults to 45.
- `fn(t, u)`: `t` is elapsed seconds. `u` is linear 0..1, clamped, and is **not eased** (`ease` does not apply to `u`). Returns `{pos, look}` as Vector3.
- Without `fn`: `pos = lerp(p0, p1, e)`, `look = lerp(l0, l1 || l0, e)`, with `e = easeIO(u)` unless `ease === 'lin'`.
- `hold: true`: the final pose persists until something sets `CAM.cine = null`.
- `onEnd()`: runs when a non-hold shot ends, after `CAM.cine` is cleared. Sets `snap` and copies `fov` from the camera.
- Shake: shots jitter x and y by `FX.shake² × 0.1`. The follow camera jitters x, y and z and adds a roll.

**Hooks.** None instance-level. `RIDE` and `RIDE.wipeout` write `CAM.yaw` directly and set `snap`. Level code sets `CAM.cine` only through `CAM.play`.

**Performance.** One `COMBAT.foes()` filter per frame, one `PHY.ray(..., 'los')`, up to four `vnoise2` calls. The projection matrix is rebuilt only when FOV changes by more than 0.01.

**Gotchas.**

- Mouse look is a per-frame delta (`IN.mdx × 0.0024`). Arrow keys and the pad are pre-scaled by `MG.rdt` in `IN.poll`, so they are per second. Do not multiply touch drags by `dt`.
- Look input is ignored completely while `CAM.cine` is set (early return before `IN.A` is read). Saber locks and cutscenes ignore the stick.
- Collision pulls in instantly and eases out (damp 3). Minimum 0.6 m.
- The pivot is not updated during a cinematic, so it is stale afterwards; `snap` resolves it.
- `PLAYER.landHit` writes `CAM.fov -= 2.5` directly on slam, sweep and thrust hits (p18:276). The damp pulls it back.

**How-to.**

- Encounter framing needs nothing; `PLAYER.focus` and `PLAYER.lock` drive it.
- Scripted shot: `CAM.play({dur, fov, fn, onEnd})`. For a persistent shot use `hold: true` and clear it with `CAM.cine = null`.
- Freeze the player: set `PLAYER.state = 'cine'`. Cinematic skip and HUD hiding key off that state.

---

## 2. p17_actor.js: Actor

**Purpose.** Base class for any body. Owns a `CharInst` built from template `T`, a vertical capsule (`x,y,z` feet, `r`, `h`, `step` 0.45 m), gravity, and a two-layer animation: a looping base clip plus one cross-faded one-shot. Feeds `ANIM.loco` and an additive flinch.

**API.**

- `new Actor(T, o)`: `o` fields `x, y, z, yaw, r` (0.34), `h` (1.8), `hp` (100), `moves` (default `MOV.maul`), `team` ('foe'). Adds `root` to `R.scene`.
- `play(name, o) → clip | null`: `o.fade` (0.08), `o.t`, `o.speed`. An unknown name logs `console.warn` and returns `null` with no state change. Otherwise sets `act`, `actClip`, `actT`, `actSpeed`, `actHit = new Set()` and starts a cross-fade.
- `stop(fade = 0.14)`: ends the action without calling `onActEnd`.
- `setBase(name, fade = 0.18)`: changes the loop. No-op if unchanged. During an action the change has no fade.
- `actU() → number`: action progress 0..1.
- `moveH(dx, dz) → blocked`: horizontal move via `PHY.move`. For AI on ground with `edgeGuard` it refuses to walk off edges. On tatooine it also refuses ground more than 0.32 m above the current height.
- `physics(dt)`: gravity `22 × gravK`, terminal -30. Ground snap uses `PHY.ground` with `step`; ceiling clamp while rising; step-down when walking off. Sets `grounded`, `airT`, `floorY`, `floorC` (collider; `PLAYER` reads `.hazard`), `vy`. Calls `onLand(airT)` on touchdown.
- `animate(dt)`: base clip, `ANIM.loco`, action playback, fades, flinch, footfalls, stride `phase` (`ANIM.cadence`). Calls `onActEnd(name)` when a non-loop action finishes naturally.
- `pose3D(dt)`: `syncRoot()`, `ANIM.apply`, cloth and cape step.
- `syncRoot()`, `steer(tx, tz, spd, dt)` (damps `vx, vz` toward a point), `flinch(dir, amp)`, `setProp(obj, sym)`, `chest(out)` (`y + 0.68h`), `head(out)` (`bones[4]`), `forward(out)`, `dist(o)` (XZ), `angTo(o)`, `dispose()`.

**Fields.** `T, inst, root, x, y, z, yaw, vx, vy, vz, r, h, step, grounded, airT, floorY, floorC, hp, hpMax, alive, moves, team, base, act, actClip, actT, actSpeed, actHit, pose, poseA, poseB, fromPose, fadeT, fadeDur, phase, speed, mvx, mvz, lookYaw, flash, iframe, prop, saber, flinch*, topple, rag, gravK, edgeGuard, isPlayer, poseLean, air`. `phase` is the stride cycle, not a boss phase. `hitWall` is reset to null but never assigned here.

**Hooks (instance fields).** `onLand(airT)`, `onActEnd(name)`, `react(info)`, `die(info)`, `onDamage(amt, info)` (`false` cancels, a number replaces), `tryBlock(atk, dmg, kind, p)`, `resistPush(atk)`, `resistGrip(atk)`, `onGrip(atk)`, `onGripThrow(v)`, `onExec(atk)`, `onParried(atk)`, `onDefeat(info)`.

**Performance.** Two clips sampled and `ANIM.loco` per frame. Two `PHY.ground` probes. Footfall dust only on tatooine and rooftops.

**Gotchas.**

- The default moveset is `MOV.maul` (p17:11). Pass `moves` for any other body.
- `play()` returns `null` silently for an unknown name. Code that uses the result without checking throws (`PLAYER.attack` reads `c.move`).
- `onActEnd` does not fire on `stop()`.
- Dead bodies hold their last frame of a non-loop clip.
- Bone indices 4, 15 and 18 are rig-specific.

**How-to.** New body: `new Actor(CHAR.T.myTpl, {moves: MOV.myset, team: 'foe'})`. The moveset needs `idle` or `guard`, `run`, `hit` and `death`. Optional: `knock`, `deathFall`, `hitL/hitR`.

---

## 3. p17b_ragdoll.js: RAG

**Purpose.** Verlet ragdoll for fighters whose moveset has `deathFall` (trooper, melee, brawler). Twenty particles sit on the rig's joints plus head top and two toes. The 19-bone rig is rebuilt from the particles each frame, so skeleton and cloth follow.

**API.**

- `RAG.start(a, dir, force = 3, hitP) → r`: builds particles from current bones and `T.J` joints. Launch velocity is actor velocity plus `dir × force × weight`. `hitP` adds a spin. Sets `a.rag`, `a.topple = null`, pushes `RAG.list`, and detaches any prop.
- `RAG.update(a, dt)`: fixed 1/90 s steps (at most 6 per frame). Sleeps once kinetic energy stays under `2e-7` for 0.6 s. Always runs `RAG.pose`. Steps cloth and cape.
- `RAG.step(r, h)`: verlet with damping 0.995 and gravity `-9.8h²`. Eight relaxation iterations over `RAG.C` (about 37 distance constraints, including braces) and `RAG.MIN` (8 minimum-length limits). Ground friction 0.22. Walls: `PHY.move` on the pelvis, carrying the whole body.
- `RAG.pose(r)`: root from the hip and spine basis. Each bone in `RAG.BONES` is rotated minimally from rest toward its particle (`IK.setWorldQ`). Calls `QB.drive` when `I.q` exists.

```js
RAG.BONES = [[1,2],[2,3],[3,4],[4,17],[5,5],[6,6],[7,7],[9,8],[10,9],[11,10],
             [13,12],[14,13],[15,18],[16,15],[17,16],[18,19]];   // [bone, particle]
RAG.PAR   = [-1,0,1,2,3,2,5,6,7,2,9,10,11,0,13,14,0,16,17];
RAG.MIN   = [[11,13,0.62],[14,16,0.62],[5,7,0.5],[8,10,0.5],[7,11,0.12],[10,14,0.12],[13,16,0.12],[7,10,0.1]];
```

Particle 17 (head top) and 18–19 (toes) come from `T.J.headTop`, `toe` and `ankle`.

**Triggers** (`Enemy.onDie`, p20:203-218). Ragdoll runs only if `moves.deathFall` is set, `info.kind` is not `grip`, `fall` or `exec`, the actor is not a droid, and `?norag` is unset. Launch force: `push` 9, `blown` 6.5, otherwise 3.4. `blown` means `knock`, `heavy`, `push`, `slam` or `whirl`. Droids shatter instead. Maul and the Jedi never ragdoll.

**Dependencies.** `T.J` and `T.def` on the template; `userData.rest` on every bone (set at p07:64).

**Performance.** About 37 constraints × 8 iterations per substep, ground probes on iteration 0 only, one `PHY.move` per substep. `RAG.pose` runs every frame, even asleep.

**Gotchas.**

- `RAG.list` is only appended to, so every ragdoll state and its actor stay alive for the session.
- `a.y` is never updated, so the actor origin follows the pelvis horizontally only.
- `Enemy.onDie` tests `(this.gun || this.staff)`; `staff` is never assigned, so only the gun branch runs.
- A missing `userData.rest` or joint table makes `RAG.pose` fail.

**How-to.** Enable ragdoll for a melee type by giving its moveset `deathFall` (`MOV.init` does this for the three shared sets). Force a limp body: set `alive = false`, call `stop()`, then `RAG.start(actor, dirVec3, 6.5, hitPoint)`.

---

## 4. p18_player.js: PLAYER (Darth Maul)

**Purpose.** The player fighter: camera-relative movement, five-hit combo, heavy whirlwind, dash lunge, air plunge, double jump, dodge, block with parry and perfect deflect, Force push, Force grip, saber throw, Dark Side rage, executions.

**Fields.** `a` (Actor), `saber` (double-bladed `Saber('staff')`), `state`, `lock`, `fp` (Force 0–100), `rage` (0–100), `rageOn`, `rageT` (10 s), `throwS`, `gripT`, `execT`, `comboQ`, `jumps`, `regenT`, `skills` (`{push, grip, throw, rage, heavy}`, all true).

**API.**

- `PLAYER.spawn(x, y, z, yaw) → Actor`: disposes the old actor, builds `new Actor(CHAR.T.maul, {moves: MOV.maul, r: 0.33, h: 1.8, hp: 100})`, creates the saber with both blades forced on (`ign = [1, 1]`), wires callbacks, pushes `COMBAT.actors`, calls `HOLOCRON.apply()`, then resets HP and Force.
- `PLAYER.update(dt)`: the frame. A dead actor runs a death shell and returns. Otherwise: Force regen (7/s, 14/s in rage), lock toggle, rage start, movement intent, state handler, root motion, animation, hit windows, saber.
- `PLAYER.inputDir(out)`, `PLAYER.aimDir(out)`: camera-relative direction (section 5).
- `PLAYER.chooseTarget(range)`, `pickTarget(dir, range, cone)`, `execTarget()`.
- `PLAYER.attack(name)`: starts the clip, turns toward the target, sets the root-motion budget. `a1` becomes `lunge` when the target is more than 3.4 m away (searched up to 9 m).
- `PLAYER.hitWindows(dt)`, `landHit(t, p, dmg, kind)`, `clash`, `slamImpact(mul)`.
- `canDeflect(b)`, `deflect(b)`, `onDamage(amt, info)`, `blockAt(src, track)`, `react(info)`, `die(info)`, `fell()`, `onKill(t)`, `startRage()`.
- `jump()`, `dodge(dir, mag)`, `onLand(airT)`, `onActEnd(name)`, `toggleLock()`.
- `push(air)`, `grip()`, `gripUpdate(dt)`, `throwSaber()`, `throwUpdate(dt)`, `catchSaber()`, `tryExec()`, `execUpdate(dt)`.

**Input map.** Line numbers are in `p18_player.js` unless noted.

| Action | Read | Effect |
|---|---|---|
| attack | take: move 154, block 172, attack 178 (after 0.1 s) and 183, dodge-lunge 202, throw 208; peek 0.5: 179; ride throttle (`p18b:49`, down) | Chain, lunge, execution, kick, throttle |
| heavy | take: move 155, combo 182, air 193; peek 0.5: 180 | Whirlwind, plunge |
| jump | take: move 152, attack 184, air 192 (double), throw 209, ride dismount (`p18b:48`); down: skip (`p30:58`) | Jump, double jump, dismount, skip |
| dodge | take: move 153, block 173, attack 183; down: ride boost (`p18b:49`) | Dodge, backflip |
| block | down: move 161; held in block 166 | Guard |
| push | take: move 158, attack 185, air 194 | Force push |
| grip | hit: move 156 (execution); peek: move 157 (level prompt); take: move 159 (grip), ride 48 (dismount); down: grip state 422 | Execution, prompt, grip, release |
| throw | take: move 160 | Saber throw |
| lock | hit: update 93 | Toggle lock-on |
| rage | hit: update 95 | Start rage at rage ≥ 100 |
| pause | hit: `p30:63`; down: skip `p30:58` | Pause, skip |
| confirm | down: skip `p30:58` | Skip |
| back | not read | none |

The RATHATRI actions (`interact, ship, scan, dominate, fire, boost, roll, missile, brake, skip, assist1, assist2`) are not read by any of the nine parts.

**State machine** (`PLAYER.states`, plus `ride` from p18b). `dead` has no handler.

| State | Exits to | Notes |
|---|---|---|
| move | air (ungrounded or jump), dodge, attack (`a1`, `lunge`, `heavy`, or exec), force (push), grip, throw, block | 6.4 m/s, 4.1 when locked within 18 m. Flourish after 6.5 s calm |
| block | move (release), air, attack, dodge | Tracks Jedi strikes within 3.4 m via `blockAt(j, true)` |
| attack | move or air (`onActEnd`), air (jump, after `cancelOK`), dodge (after 0.1 s), push, attack (`comboQ = c.next` or `heavy`) | `cancelOK` at `actT ≥ c.cancel` (default 0.8·dur). `impact` calls `slamImpact` |
| air | air (flip, plunge), move (land with airT ≤ 0.5), attack (landing after > 0.5 s or plunging) | `jumps` caps at 2 |
| dodge | move or air at action end; attack (lunge at u > 0.5) | Velocity `11·(1−u)` while u < 0.75 |
| force | move at action end | Velocity ×0.8 per frame |
| grip | move (release after 0.35 s if the button is up, target dead, Force 0, or 2.6 s) | |
| throw | move or air (`catchSaber`) | 3.5 m/s |
| hit, knock | move at action end | `knock` sets `iframe = 1.0` |
| exec | move when `execT` clears | `iframe = 2`, immune |
| cine | set externally | Velocity 0, immune |
| ride | air on dismount | p18b |
| dead | none | `MG.after(2, GAME.onPlayerDeath)` |

**Combat rules.**

- Combo `a1 → a5` via `c.next`. `heavy` is a whirlwind. `lunge` is a dash (reach 9). `plunge` is an air slam.
- Targets: lock (within 7.5 m), then a direction cone of 1.05 rad, then focus (within 5 s), then the nearest foe by `dist + 0.9·angle`.
- `hitWindows` sweeps with reach 3.8 (3.2 for whirl). Mask `e[2] || 3` makes mask 0 into 3. Damage is ×1.6 in rage. `twirl`, `whirl` and `spin` re-hit every 0.14 s. Other kinds hit once per clip.
- **Deflect.** Bolts in the front arc are deflected. In move, a per-bolt random roll applies (0.75 easy, 0.55 normal, 0.35 hard), only when speed < 4. Perfect (within 0.35 s of the block press) aims at the shooter; otherwise 60% toward the lock target, else random. Speed ×1.1, damage 20, team hero. Style +2 perfect, +1 otherwise.
- **onDamage.** Returns `false` in exec, cine, god, or on a parry (block within 0.3 s, and `src.onParried` exists). A front-arc block chips for `amt × 0.15`. Otherwise `amt × (0.55 | 0.85 | 1.35) × (rage ? 0.5 : 1)`. Regen starts after 6 s clean, at +4 HP/s.
- **Force push** (25 Force). After 0.2 s, hits foes within 8.5 m and ±0.9 rad for 8 damage with knockback `10 + 8k` (`k = 1 − d/9`). `resistPush` can cancel. Bolts within 9 m in front become hero bolts with damage 20.
- **Grip** (needs 20 Force and a target within 11 m). Costs 10, drains 14/s, deals 16/s. Release throws the target at 13 m/s forward and 5 m/s up.
- **Saber throw** (15 Force). After 0.22 s the saber flies out (0.42 s ease), hovers 0.12 s, then homes on `bones[12]` at 22 m/s. Sweeps with reach 99 for damage 20 (`kind 'throw'`, re-hit every 0.25 s).
- **Execution** (`tryExec`). Target stunned, or below 20% HP and not a boss, within 3.2 m and 1 m vertically. A Jedi with `noExec` qualifies only when stunned. At 0.92 s a normal foe dies (hp set to 1, then 999 damage). A boss takes 16% requested, capped to 15% by `COMBAT.damage`. The player restores 15 HP, full Force, and `MG.slowmo = 0.5`.
- **Rage.** Style points add `1.6·p` to rage. Rage lasts 10 s and drains 10/s. Damage ×1.6, incoming ×0.5, animation ×1.22, +1.5 HP per hit, Force regen 14/s.
- **Death and falls.** `die()` plays `death`, clears the lock, extinguishes the saber, and schedules `GAME.onPlayerDeath` in 2 s. `fell()` teleports to `lastSafe` and deals 20 unblockable damage.

**Gotchas.**

- `PLAYER.states.block` sets `a.actClip = MOV.maul.block` directly (p18:161), bypassing `play`.
- `PLAYER.push` fires `R.shock` and `R.kick(0.55)` before the Force check (p18:385-386). A failed push still shakes the camera.
- The `dodge` state does not read `jump`, so a jump during a dodge is only buffered (0.28 s).
- A grip press tries execution (an edge check) before the grip skill, so a stunned foe in range is executed, not gripped.
- `PLAYER.yawT` persists between attacks and is only cleared in the attack state.

**How-to.**

- New combo step: add `aN` to `MOV.maul` with `dur`, `ev`, `move` and `cancel`, and set the previous step's `next`. Map its hit reaction in `p20_ai.js:189` if enemies should use directional clips.
- New Force power: add a `PLAYER.skills` flag and a method, a `move` branch guarded by `IN.take('myAction')`, and an `IN.ACT` entry (`p01:11-19`).

### 4.1 Maul-specific references to generalise

1. `p17:11`: Actor default moveset `MOV.maul`.
2. `p18:10`: `CHAR.T.maul` and `MOV.maul`. `p18:12-13`: `Saber('staff', ...)` with both blades forced on. `p18:12`: `setProp(S, true)`.
3. `p18:161`: `MOV.maul.block` assigned directly. `p18:350`: `blockAt` writes `MOV.maul.blockDyn`.
4. `p18:453` saber return homes on `bones[12]`. `p17:127` head `bones[4]`. `p17:101` footfalls `bones[15]` and `[18]`. `p17b:86` resets bones 8 and 12.
5. Hard-coded clip names: `a1, lunge, heavy, plunge, land, flip, jump, dodge, backflip, block, blockDyn, deflectL, deflectR, knock, hit, death, exec, push, grip, throwWind, throwWait, kick, flourish, ride`.
6. Attack kinds with logic: `slam, sweep, thrust` (FOV kick, hit-stop, heavy), `twirl, whirl, spin` (multi-hit), `plunge`, `throw`. The Enemy knock table (p20:173) uses the same names.
7. `p20:189`: the enemy directional-hit map is keyed on Maul clips (`a1, a2, a4, a5, deflectL, deflectR`).
8. `p31:34`: the Jedi borrows `MOV.maul.knock` and `death`. `p31:38` overwrites `MOV.maul.lock`, used by both fighters in a saber lock.
9. `p18b:8`: `MOV.maul.ride`. `RIDE.mount` and `dismount` reference `PLAYER.saber`.
10. `PLAYER.saber` is referenced by name in about a dozen places, and Jedi anticipation reads the attacker's `saber.ends` and blades. A new character needs a `saber` with the same layout.

---

## 5. CAM.yaw and IN.A consumption

| Field | Written by | Read by |
|---|---|---|
| `IN.A.mx, my` | `IN.poll` (p01:73-78) | `PLAYER.inputDir` (p18:27-28); ride throttle, brake (p18b:49), steer (p18b:59) |
| `IN.A.lx, ly` | `IN.poll` (p01:79-85) | `CAM.update` (p16:10-12); ride look-steer (p18b:61) |
| `CAM.yaw` | `CAM.update` (p16:12, 17-31); ride chase (p18b:134); `RIDE.wipeout` (p18b:43); `CAM.reset` | `inputDir` (p18:27); `aimDir` (p18:59), used by push (388), grip (408), throw (433); `toggleLock` (p18:238); grip release throw (p18:424) |

`CAM.update` returns at `p16:7` during a cinematic, before reading `IN.A`. Otherwise `CAM.yaw -= lx` and `pitch = clamp(pitch - ly, -1, 0.6)`, both unscaled radians per frame.

**Shared scratch.** `COMBAT._hp` is overwritten by every `segSeg`. Also shared: `COMBAT._lb, _lt, _sb, _st`, `PLAYER._d, _ct, _cf`, `Jedi._m`, `_v1` to `_v5`. Clone any value you keep.

---

## 6. p18b_ride.js: RIDE (Bloodfin speeder)

**Purpose.** Hover bike: throttle, boost, brake, banking, rock glances, near misses, terrain walls, air launches, wipeouts, chase camera. Maul rides crouched, using `PROPS.speeder` anchors.

**API.**

- `RIDE` fields: `bike, on, spd` (−6..76 m/s), `yaw, bank, h` (0.8), `CR` (0.5), `PH`, `BF` (seat, grip and peg anchors), `air, vx, vy, vz, pitch, land, scrapeT, boost0, nm, nmT, nmChain`.
- `RIDE.spawnBike(x, z, yaw) → bike`: `LEVEL.add(PROPS.speeder())`, placed on `PHY.hf + h`. Pushes a closure onto `LEVEL.cur.updates` that shows a mount prompt within 2.6 m (`fn: RIDE.mount`).
- `RIDE.mount()`: `on = true`, `state = 'ride'`, plays `ride`, hides the saber.
- `RIDE.dismount(crash)`: `state = 'air'`, launches with `vx, vz = forward × spd × 0.3` and `vy = 5`. Restores the saber. A crash deals 12 unblockable knock damage.
- `RIDE.wipeout(why, back = 30, spd = 6)`: 10 unblockable damage. If Maul survives, the bike respawns `back` metres behind on the path (`RUN.cx`/`RUN.line` or `TAT.pathX`). Clears `CAM.cine` unless in a cinematic.
- `PLAYER.states.ride(dt)`: the per-frame ride logic.
- `RIDE.probe() → Group`: the DRK-1 probe droid model.
- `MOV.maul.ride`: one looping pose built from the `BF` anchors.

**Input.** `grip` or `jump` (take) dismounts. `thr = max(attack down ? 1 : 0, −IN.A.my)`. `brake = IN.A.my > 0.1`. `boost = dodge down && thr > 0.1`. `steer = IN.A.mx`. `yaw += −IN.A.lx × 0.5`.

**Physics.** Top speed 48 (72 boosting). Throttle accelerates at `17·thr` (30 when boosting) below `top·thr`. Coasting drag damp 0.45. Braking −34/s to a floor of −5. Yaw rate `2.0 − 1.05·sp01`, ×0.4 in air. Grip `7 − 3·sp01` (0.4 in air). Gravity 21 in air.

**Collision.** Cylinders (`k === 3`) within `rad + 0.75` push out and glance, with scrape damage 2 if the impact is over 8 m/s (0.12 s cooldown). A near miss is a cylinder gap under 1.6 m at speed over 32, which pops "NEAR MISS" with a chain count. Other colliders except `k === 9` glance. A slope over 1.2 (about 50°) is a wall. A head-on hit at speed over 30 with `−vIn/sp > 0.8` is a wipeout.

**Camera.** `CAM.yaw` eases toward `yaw + bank·0.35` at rate 3.2. Pitch −0.32 in air, else `−0.17 − 0.05·sp01`. `MG.zoomOut = −0.6 + 0.02·spd`. `R.G.haze = 0`.

**Performance.** One `PHY.each` box query (4 m) per frame, plus a 7 m query for near misses at speed.

**Gotchas.**

- `RIDE.wipeout` references `TAT.pathX` without a `typeof` guard. Only `RUN` is guarded.
- `spawnBike` adds a closure to `LEVEL.cur.updates` on every spawn. It is never removed.
- Glances use `unblockable: true`, so `iframe` does not stop them.
- `a.speed` is 0 while riding, so the move-state base animation is not used.

**How-to.** `RIDE.spawnBike(x, z, yaw)` places a bike with its prompt and mount. For a new vehicle, copy the pattern with new `BF`, `PH`, `CR` and a clip. Wipe out from script: `RIDE.wipeout('WIPEOUT', 30, 6)`.

---

## 7. p19_combat.js: COMBAT

**Purpose.** The shared damage pipeline, blade sweeps, bolts (block, deflect, reflect), attack tokens, the style meter and kill counters.

**Fields.** `actors`, `bolts`, `boomas` (from p20b), `style = {n, t, pts, rank, best}`, `tokens = {shoot: Set, melee: Set}`, `kills`, `deflects`, `RANKS = ['', 'DARK', 'CRUEL', 'BRUTAL', 'SAVAGE', 'SITH', 'SITH LORD']`.

**API.**

- `COMBAT.reset()`: clears bolts, boomas, actors, style and tokens. Does **not** reset `kills` or `deflects`.
- `COMBAT.foes()`: alive, `team === 'foe'`, not hidden.
- `COMBAT.segSeg(a, b, c, d) → number`: segment distance. Midpoint left in `COMBAT._hp`.
- `COMBAT.sweep(atk, saber, mask, prev, onHit, reach = 3.6) → count`: tests blades in `mask` from `prev` to now, four samples each, against non-team actors within `reach`. Calls `onHit(target, point, blade)` once per target.
- `COMBAT.snapBlades(saber, out)`: stores the current blade segments for the next sweep.
- `COMBAT.damage(t, amt, info) → bool`: the pipeline below.
- `COMBAT.kill(t, info)`, `stylePoint(p)`, `updateStyle(dt)`.
- `COMBAT.fire(p, dir, o) → Bolt`: `o` fields `shooter`, `team` ('foe'), `dmg` (6), `speed` (26), `col`. Life 2.6 s.
- `COMBAT.updateBolts(dt)`: `PHY.ray(..., 'shot')` per bolt; actor capsules `y+0.2 .. y+0.95h` with radius `a.r + 0.03`; the player's deflect bubble (`a.r + 0.75`) is tested first.
- `COMBAT.wantToken(kind, a, max) → bool`, `COMBAT.freeToken(kind, a)`, kinds `'shoot'` and `'melee'`.
- `COMBAT.update(dt)`: bolts, style, and `updateBoomas` if defined.

**Damage pipeline** (`COMBAT.damage`):

1. Return `false` if dead or `god`.
2. Return `false` if `iframe > 0` and not `unblockable`.
3. Exec on a boss: cap at 15% of `hpMax`.
4. `t.onDamage(amt, info)`: `false` cancels, a number replaces.
5. `hp -= amt`, `flash = 0.12`.
6. Player-sourced damage (not `grip` or `fall`) adds style: exec 5, `amt ≥ 25` → 2, else 1.
7. If `hp ≤ 0`: `alive = false`, `COMBAT.kill`, return true. Otherwise `t.react(info)`, return true.

**Kill.** Foe kills increment `kills`. A player kill adds style +2 and calls `PLAYER.onKill(t)`. The last non-boss foe to die with no boss alive sets `MG.slowmo = 0.3` and fires a shock. Then `t.die(info)`.

**Style.** `stylePoint(p)`: `n++`, window reset to 3.2 s, `pts += p·(1 + 0.15·rank)`. Rank is the highest index whose threshold is at or below `pts`, with thresholds `[0, 3, 9, 18, 32, 52, 80]`. Each point also adds `1.6·p` to `PLAYER.rage` (not in rage). `best` is the highest `n` since the last reset. `updateStyle` resets everything when the window expires.

**Tokens.** Gunners hold `'shoot'` (max 2, 3 on hard). Melee holds `'melee'` (max 1, 2 on hard). Tokens are freed when a burst or strike ends, on hit, on parry, on grip and on death.

**Hit-stop.** `MG.hitStop` slows the world to 6%. Values: 0.06 normal, 0.11 slam and thrust, 0.07 clash, 0.12 parry, 0.06 block, 0.25 rage start, 0.10 exec, 0.15 guard break.

**Performance.** `updateBolts` is O(bolts × actors) plus one `PHY.ray` per bolt. `sweep` applies the reach filter before the segment tests.

**Gotchas.**

- `kills` and `deflects` are never reset. The results screen (p28:84) shows raw `COMBAT.kills`, so it is cumulative. `GAME.levelStart.kills` (p30:29) is captured but never subtracted.
- The decay branch in `updateStyle` is effectively dead. Points do not decay gradually.
- The saber throw sweep uses reach 99.
- `COMBAT._hp` is shared scratch.

**How-to.** Hit from script: `COMBAT.damage(e, 20, {src: P, kind: 'slam', dir, knock: true, heavy: true})`. Fire a bolt: `COMBAT.fire(muzzle, dir, {shooter, team: 'foe', dmg: 6, speed: 24, col})`. For a new kind, add knockback to the table at `p20:173` and FOV or hit-stop rules in `PLAYER.landHit` if the player uses it.

---

## 8. p20_ai.js: ENEMY

**Purpose.** Generic enemy. `Enemy extends Actor`. Brains, attack tokens, telegraphed attacks, staggers, knockback, grip and execution reactions, and death (ragdoll, shatter or clip).

**API.**

- `ENEMY.TYPES`: type table (below).
- `ENEMY.tplOf(name)`: returns `CHAR.T[name]`. `b1` and `b1cmd` are built on demand through `CAST.buildB1`. Any other missing template throws.
- `ENEMY.spawn(type, x, z, o) → Enemy`: `ENEMY.findSpot`, then construct. `type === 'holojedi'` builds a `Jedi('holo')` cycling obiwan, quigon and darsha.
- `ENEMY.findSpot(x, z, yHint) → [x, y, z]`: searches rings at 0, 0.9 … 4.5 m for floor with clear space at +0.4 and +1.0 m. If `yHint` is given, the floor must be within 0.6 m of it. Falls back to the ground at `(x, z)`.
- `ENEMY.update(dt)`, `ENEMY.clear()`, `ENEMY.alive()`, `ENEMY.list`.
- Instance methods: `think`, `setState`, `separate`, `alert`, `seesPlayer(maxD = 22)`, `thinkGunner`, `fireAt(P)`, `thinkMelee`, `strikeCheck`, `actEnd(n)`, `onParried`, `aimOverride`, `onHit(info)`, `onGrip`, `gripUpdate`, `onGripThrow(v)`, `onExec(atk)`, `onDie(info)`, `shatter(info)`, `vanish()`. Getter `P` is `PLAYER.a`.

**ENEMY.TYPES format** (real entry, p20:6):

```js
thug: { tpl: 'thug', hp: 42, brain: 'gunner', moves: 'trooper', weapon: 'rifle', dmg: 6, burst: 3,
        range: [6, 12], speed: 3.0, name: 'Black Sun Gunman', drain: 4, col: [1, 0.15, 0.08] },
enforcer: { tpl: 'enforcer', hp: 90, brain: 'melee', moves: 'melee', weapon: 'staff', staffKind: 'electro',
            dmg: 12, speed: 3.6, name: 'Black Sun Enforcer', drain: 8, blocks: 0.35 },
```

| Field | Meaning |
|---|---|
| `tpl` | Key in `CHAR.T` |
| `hp` | Base HP. ×1.3 hard, ×0.7 easy. `o.hp` overrides |
| `brain` | `'gunner'`, `'melee'`, `'booma'` (p20b), or any name with `brainFn` set |
| `moves` | Key in `MOV`: `trooper`, `melee`, `brawler` |
| `weapon`, `staffKind` | `'rifle'`, or `'staff'` with `electro`, `gaffi`, `pike` or `cesta` |
| `droid` | Death shatters the body |
| `dmg` | Bolt damage (gunner) or melee damage |
| `burst` | Shots per volley |
| `acc` | Spread (default 0.075) |
| `range` | `[min, max]` band for gunners |
| `speed` | m/s |
| `drain` | Player HP and Force restored on kill |
| `blocks` | Chance to block a light hit |
| `shield` | Shield HP (p20b) |
| `col`, `name` | Bolt colour, display name |
| `r`, `h` | Capsule, default 0.32 and 1.8 |

p20 defines 7 types (b1, thug, enforcer, guard, tusken, sniper, b1cmd). p20b adds 6 and redefines `guard` (hp 40, not 36). p40b adds `garyn`. Later definitions win.

**Spawn options** (`o`): `x, z` (required); `y` (ground hint; omitted means any ground); `yaw`; `cls` (an `Enemy` subclass); `state` (default `'idle'`); `alert` (start alerted); `grace` (default 1.6 s before attacks); `patrol` (array of `[x, z]`); and overrides `hp, moves, r, h, team`. Level code sets `passive` and `noDrop` after spawn. `noDrop` is not read here.

**Brains.**

- `gunner` (`thinkGunner`): faces the player, strafes, holds the `range` band. Needs LOS (`seesPlayer`) and a `'shoot'` token. Aims for `0.55 + 0.2·burstN` s, then `fireAt`. Rest `rnd(2.2, 4.0)` scaled by difficulty (easy ×1.5, hard ×0.75).
- `melee` (`thinkMelee`): approaches to 3.4 m (1.5 m with a token). Winds up at `d < 2.2` when `graceT ≤ 0`, `atkCd ≤ 0` and it holds the token. The `wind` clip is the telegraph, then `strike`. `strikeCheck` runs at `actT` 0.06–0.22 and hits if `d < 2.3`, angle under 1.0 rad and `|dy| < 1.2`.
- `booma` (p20b): an arcing projectile, via `wind` then `strike`.
- Custom: set `brainFn(dt, d)` on the instance with an unused `brain` name (Garyn does this).

**Reactions** (`onHit`). Ignored in `execd`. Alerts, cancels aim, frees the melee token. The knock table (sweep 4.2, slam 3.6, thrust 4.6, plunge 3.2, lunge 4.6) applies to non-boss, unshielded enemies. A push can destroy a droid (35%). In `stunned`, flinch. Otherwise a directional hit (`hitL`, `hitR`, `hitSpin`, `hitHeavy`) if the moveset has them, or `hit`, then `stagger` with a 3.6 m/s impulse (5.2 for heavy). `onParried` stuns for 2.6 s.

**Death** (`onDie`). Frees tokens. A droid (not grip) shatters. Otherwise, if the moveset has `deathFall` and the kind is not grip, fall or exec, the enemy ragdolls (section 3) and its gun flies off as a chunk. Otherwise it plays `death` with an impulse. Heavy or exec kills by the player set `hitStop = 0.11` and shake 0.3.

**Hooks.** `onActEnd` (`actEnd`), `react` (`onHit`), `die` (`onDie`), `tryBlock` (p20b), `onParried`, `onGrip`, `onGripThrow`, `onExec`.

**Performance.** `separate` is O(N²) over `COMBAT.actors` per enemy per frame. `seesPlayer` (a `PHY.los` raycast) runs only when a shot is ready.

**Gotchas.**

- `ENEMY.clear()` disposes and empties `ENEMY.list`, but leaves the enemies in `COMBAT.actors`, where they still count as alive and appear in `foes()`. Level unload pairs it with `COMBAT.reset()`. The title scene (`p28:99`) does not. This reads as a bug.
- `telegraph` (p20:145) is set and never read.
- `onExec` does not free tokens. Execution always kills, which frees them.
- `this.staff` is referenced in `onDie` but never assigned.

**How-to.**

- New gunner: a `ENEMY.TYPES` entry with `brain: 'gunner'`, `moves: 'trooper'`, `weapon: 'rifle'`. `CAST.rifle` must return a group with `userData.glow` and `userData.muzzle`.
- New melee: `brain: 'melee'`, `moves: 'melee'`, `weapon: 'staff'`, plus a `staffKind`.
- New brain: subclass `Enemy` and set `this.brainFn = (dt, d) => this.fight(dt, d)` in the constructor (Garyn, `p40b:192-196`).
- Patrol: `ENEMY.spawn('guard', x, z, {patrol: [[x, z], [x + 4, z]]})`.

---

## 9. p20b_roster.js: roster and behaviours

**Purpose.** Adds roster types and behaviours by patching at load.

- Types: `panaka` (`elite`, hp 170), `csf`, `senate` (`pike`), `gungan` (`electro`), `gunganShield` (`shield: 90`), `gunganBooma` (`brain: 'booma'`, `cesta`). Redefines `guard`.
- `CAST.staff` is wrapped for `'pike'` and `'cesta'`. Other kinds pass to the original.
- `Enemy.prototype.update` is wrapped to build and animate the shield on `bones[7]`.
- `Enemy.prototype.tryBlock`: the shield absorbs damage (heavy ×2.5), and breaking it stuns. A `D.blocks` chance blocks light hits (not `strike`).
- `Enemy.prototype.think`, `thinkBooma` and `actEnd`: booma behaviour.
- `COMBAT.booma(from, to, shooter)`: arcing ball, 1.05 s flight, gravity 14. `COMBAT.updateBoomas(dt)`: bursts on ground or contact. Player: 12 damage with knockback within 2.2 m. Foes within 2.4 m: 30 damage if the team is hero.
- `PLAYER.push` is wrapped: after the original, boomas within 10 m are turned back to hero team and aimed at their shooter. There is no facing check.
- `CM.holoSkinned()`: cached hologram material. `Jedi.update` drives its `uT`.

**Gotchas.** All patches apply at load. Reordering `p18`, `p20`, `p20b`, or redefining `PLAYER.push` or `CAST.staff` after `p20b`, silently removes behaviour. `COMBAT.boomas` is created lazily.

**How-to.** Shield: add `shield: N` to a type (the template needs `bones[7]`). New projectile enemy: a new brain name and `Enemy.prototype.thinkX`, following `thinkBooma`.

---

## 10. p31_boss.js: Jedi and BOSS

**Purpose.** Jedi duellists: 2–3 hit telegraphed strings, a guard meter that breaks into an execution window, parries, Force push, leaps, and saber locks the player wins by mashing attack.

**Jedi constructor** `new Jedi(who, o)`:

- `who`: `'quigon'`, `'obiwan'`, `'darsha'` or `'holo'`. Base HP: quigon 640, obiwan 560, darsha 400, holo 95, anything else 500 (name `'JEDI'`). HP = `base × (easy 0.65 | hard 1.35 | normal 1) × (o.hpMul || 1)`.
- `tpl`: `CHAR.T` key, default `who`. Must already exist.
- `color`: `'red' | 'green' | 'blue' | 'yellow'`. Default green for quigon, blue otherwise. The hilt is `'quigon'` for quigon and `'obiwan'` otherwise.
- `aggr` (default 1) scales the cooldown. Difficulty adds ×1.3 hard and ×0.7 easy.
- `home` `[x, z]`: respawn point if below `killY`. Also `hpMul`, `yaw`, `x, y, z`.
- `holo: true`: `noExec = false`, `isBoss = false`, `drain = 6`, guard 45, `pushCd = 99`, `aggr = 0.55`, damage ×0.3, hologram material, hidden on death.

**Fields.** `guard` (max 100; regen 22/s after `guardRegen` of 1.6 s), `state` (`'duel' | 'stun' | 'hit' | 'knock' | 'lock'`), `passive` (set by level code), `combo` (queue), `cd`, `pushCd`, `isBoss`, `noExec`, `drain` (20), `edgeGuard`, `saber`, `onDefeat` (set by level code).

**Behaviour** (`think`). Footwork holds 2.3 m, or 4.2 m if another Jedi is striking. Speed 5.2 m/s beyond 7 m, else 2.6. On its turn it chooses: a queued combo; a Force push when `pushCd ≤ 0` and `3.5 < d < 9`; a leap at `5 < d < 11` (50%); or a 1–3 strike combo from `over, side, thrust, spin` when `d < 3.4`. Cooldown is `rnd(1.8, 3.2)` after a combo and `rnd(0.6, 1.4)` after an action.

**Strikes** (`MOV.jedi`, each `ev: [[t0, t1, 1, dmg, 'jedi']]`):

| Strike | Window (s) | Damage |
|---|---|---|
| over | 0.48–0.66 | 16 |
| side | 0.40–0.58 | 14 |
| thrust | 0.46–0.62 | 18 |
| spin | 0.42–0.72 | 15 |
| leap | 0.72–0.90 | 22 (launch `vy = 6.5`) |

`strike(name)` faces the player and sets `moveK` so root motion closes distance without overshooting. `strikeCheck` sweeps blade 0 with reach 3.2 once per strike, dealing `e[3] × (holo ? 0.3 : 1)`.

**Blocking and the guard meter.** `tryBlock(atk, dmg, kind, p) → bool`:

- Returns `false` after 0.25 s into its own strike, or outside a 1.3 rad front arc.
- Cost is `dmg × (heavy ? 2.4 : 1.25) × (rage ? 1.6 : 1)`. Heavy kinds: `slam, sweep, thrust, whirl`.
- `guard -= cost`, `guardRegen = 1.6`. If the guard hits 0, `breakGuard()` runs and the block still counts.
- Otherwise: a 12% riposte (`parry` clip) for non-heavy hits when `guard > 40` and there is no combo. If not, `blockAt` builds a procedural block, or `blockHi`, `blockMid` or `blockLo` by height.
- A heavy block has a 25% chance to start a saber lock when `hp < 80%` and no lock is active.

`breakGuard()`: guard 0, `stunned`, `stun` state for 2.4 s, then the guard refills to 60%. `hitStop = 0.15`. `onParried`: `hit` state, guard −35, combo cleared. `resistGrip()` always returns true. `resistPush()` returns false while stunned; otherwise guard −25, `blockMid`, returns true.

`onHit`: ignored in lock. A knock sends it to `knock`. Ignored in stun. During a strike, non-slam hits do not flinch (hyper armour). Otherwise `hit`. `onExec()` starts the stun clock at 0.5 s, leaving about 1.9 s of stun. The execution then deals 15% of max HP to a boss and does not kill.

**Saber lock.**

- `BOSS.startLock(j)`: `BOSS.lockT = {j, t: 0, v: 0.5}`. Both fighters play `lock`, the player enters `cine`, and a hold shot (`dur: 99`) starts. The HUD prompts "hammer ATTACK".
- `BOSS.lockUpdate(dt)`: `v -= dt·(0.16 + 0.08 hard)`. Each attack or heavy press within a 0.2 s window adds 0.075. The boss subtitle shows a 12-segment bar.
- Ends at `v ≥ 1` (win), `v ≤ 0` (loss), or `t > 7` (win if `v > 0.5`). Win: `breakGuard` and 30 damage (kind `lock`). Loss: 12 damage with knockback to the player.

**BOSS.** `BOSS.update(dt)` updates each Jedi, then `lockUpdate`, then `BOSS.extra(dt)`. `BOSS.clear()` disposes, empties `list` and clears `lockT` and `extra`.

**Phases.** The engine has no phase table. Actor `phase` is the stride cycle (p17:14), not a boss phase. Level scripts build stages from three tools:

1. `BOSS.extra`: a single per-frame slot (assignment replaces it). It polls HP fractions and flags stored on the level object. `p42:241-244` starts a kick at 45% of Obi-Wan's HP and a Qui-Gon knock-down at 50%. `p41:164` starts an escape at 58%.
2. `onDefeat` chains: `p42:393-420` spawns Obi-Wan from Qui-Gon's `onDefeat` and gives Obi-Wan his own `onDefeat` for the finale.
3. `passive = true` freezes a Jedi for cutscenes. `HUD.setBoss(j, name, sub, cls)` swaps the boss bar.

```js
// p42:238-244, abbreviated
const q = new Jedi('quigon', { x: -1.5, y: 0, z: -8, yaw: PI, hpMul: 0.8 });
const o = new Jedi('obiwan', { x: 1.5, y: 0, z: -7, yaw: PI, hpMul: 0.8 });
q.home = [0, -10]; o.home = [0, -10]; L.jedi = [q, o];
BOSS.extra = () => {
  if (!L.flags.kick && o.hp < o.hpMax * 0.45) { L.flags.kick = true; NABOO.kickObi(L, q, o); }
  if (L.flags.kick && !L.flags.qdown && q.hp < q.hpMax * 0.5) { L.flags.qdown = true; NABOO.quiDown(L, q); }
};
```

**Gotchas.**

- `MOV.jedi` is shared. `blockAt` writes `this.moves.blockDyn`, shared by every Jedi. Each actor keeps its own `actClip`, so playback is correct.
- `strike` sets `telegraph = 0.35`, which is never read.
- Hyper armour is partial. After 0.25 s, `tryBlock` stops blocking, so damage applies. `onHit` then suppresses the flinch unless the kind is `slam`.
- `lockUpdate`'s `take` consumes the attack press.
- `Jedi.update` returns early when hidden, before the guard regen.

**How-to.**

- New boss: `new Jedi('myId', {tpl, x, y, z, yaw, hpMul, home})` with a valid `CHAR.T` entry. For a new `who`, add an HP base and a name in the constructor, otherwise it gets 500 HP and the name `JEDI`.
- Phase: in `BOSS.extra`, compare HP against a fraction once, set a flag, and run the stage.
- New strike: add a `MOV.jedi` clip with `ev: [[t0, t1, 1, dmg, 'jedi']]` and a `move` track. Add it to the pool in `think` (p31:118) and to the lists in `update`, `tryBlock` and `onHit`.

---

## 11. RECIPE: mobile touch input

### 11.1 When the input runs

- `IN.poll()` runs first in each tick (p90:77). It adds `TOUCH.jx/jy` to the move vector before the unit-disc clamp, and consumes `TOUCH.lx/ly` (multiplied by `LOOK_K × cfg.sens`, then zeroed). It also zeroes `IN.mdx/mdy`.
- Game logic, camera and FX run after it.
- `IN.endFrame()` (p90:80) runs after `runTimers` and before render. It clears `pressed`, `released`, `mbP`, `mbR` and `wheel`. It does **not** clear `keys`, `buf`, `A` or `mdx`.
- Touch and pointer handlers run between ticks, so their writes are seen by the next tick.

### 11.2 Per-frame writes (stick and look)

- `TOUCH.on = true` while the layer is active. Poll reads stick and look only when it is true.
- `TOUCH.jx`, `TOUCH.jy`: stick in [−1, 1]. `+y` is down (like the S key), so forward is negative `jy`. **Poll does not reset them.** Set both to 0 on release.
- `TOUCH.lx`, `TOUCH.ly`: pixel drag since the last tick. Poll multiplies by `LOOK_K × cfg.sens` and zeroes them. `LOOK_K = 0.0024` matches the mouse. Positive `lx` reduces `CAM.yaw`.

### 11.3 Event writes (buttons)

For action `a`, with code `c = 'T_' + a`. Every action in `IN.ACT` except `back` already has a `T_` code (`back` is Backspace only, so it has no touch path yet).

- Press: `IN.keys[c] = true` (held, for `down`), `IN.pressed[c] = true` (edge, for `hit`), and `IN.buf[a] = MG.rt` (for `take` and `peek`).
- Release: `IN.keys[c] = false` and `IN.released[c] = true` (for `up`).

This mirrors the keyboard handlers (`p01:23-30`).

**Do not write `IN.A.*` directly.** Poll overwrites it every tick. If you must, wrap poll once after `IN.init`: `const poll0 = IN.poll; IN.poll = function () { poll0.call(IN); /* add to IN.A.mx/my, re-clamp; add to IN.A.lx/ly */ };`. `MG.tick` calls `IN.poll` through the property, so the wrapper runs.

### 11.4 Which actions must be held

| Action | Held | Reason |
|---|---|---|
| block | yes | Exits block when `down` is false (p18:166) |
| grip | yes | Release throws the target (p18:422) |
| attack | yes in ride | Throttle (p18b:49) |
| dodge | yes in ride | Boost (p18b:49) |
| confirm, jump or pause | held for skip | Cinematic skip (p30:58) |
| others | no | Edge presses |

### 11.5 Required TOUCH surface

`p01` reads these:

- `TOUCH.init()`: required. `IN.init` calls it unconditionally once `TOUCH` is defined.
- `TOUCH.on`, `TOUCH.jx`, `TOUCH.jy`, `TOUCH.lx`, `TOUCH.ly`: read in `IN.poll`, and only the stick and look values are read while `on` is truthy.
- `TOUCH.LOOK_K` (number): a missing value makes look NaN while `on` is truthy.
- `TOUCH.cfg.sens` (number): read while `on` is truthy. A missing `cfg` throws in `poll` every frame.

Declare `TOUCH` with `const` in a part. The vendored three.js `TOUCH` sits inside an IIFE (`vendor/three.classic.js:1`), so there is no global collision.

### 11.6 Sketch (documentation only, not in the repo)

```js
TOUCH.on = true; TOUCH.LOOK_K = 0.0024; TOUCH.cfg = { sens: 1 };
function stickMove(x, y) { TOUCH.jx = x; TOUCH.jy = y; }                 // on move; (0,0) on release
function lookDrag(dxPx, dyPx) { TOUCH.lx += dxPx; TOUCH.ly += dyPx; }   // accumulate; poll consumes
function buttonDown(a) { const c = 'T_' + a; IN.keys[c] = true; IN.pressed[c] = true; IN.buf[a] = MG.rt; }
function buttonUp(a)   { const c = 'T_' + a; IN.keys[c] = false; IN.released[c] = true; }
```

### 11.7 Gotchas

- Window blur sets `IN.keys = {}` (p01:32) with no keyup, so held buttons fall out of sync. Release all held codes on `blur`, `visibilitychange` and `pointercancel`.
- Track pointer IDs per control for multi-touch.
- `IN.keyLabel(a)` returns touch labels only (STRIKE, DASH, GUARD and so on, p01:93-97). HUD hints built from it show touch names on keyboard too.
- The mousedown handler no longer requests pointer lock (p01:33-38). Mouse look needs middle-drag or Alt.
- `IN.buf` timestamps come from `MG.rt`, which advances once per tick. A press can be stamped up to one frame early, which is within the 0.28 s window.
- Cinematic skip needs a held `confirm`, `pause` or `jump` on the touch layer.
- Level prompts fire on a grip press (`p18:157`), so the grip button doubles as "use".

---

## 12. Known issues (found while documenting; not fixed)

1. **Stale actors after the title scene.** `p28:99` calls `ENEMY.clear()` without `COMBAT.reset()`. The disposed enemies stay in `COMBAT.actors` with `alive = true`, so `foes()` still returns them.
2. **`RAG.list` grows forever** (`p17b:33`).
3. **Kill and deflect counters are cumulative** (`p19:3`, shown raw at `p28:84`).
4. **Push feedback before the Force check** (`p18:385-386`).
5. **Hit mask 0 becomes 3** (`p18:248`, `e[2] || 3`).
6. **Style decay is dead code** (`p19:77`).
7. **Unused clip data**: `iframes`, `aoe`, clip-level `force`, `telegraph`.
8. **Unguarded `TAT`** in `RIDE.wipeout` (`p18b:42`).
9. **Actor default moveset is Maul** (`p17:11`).
10. **`guard` defined twice** (`p20` and `p20b`). The `p20b` version wins.

*End of document.*
