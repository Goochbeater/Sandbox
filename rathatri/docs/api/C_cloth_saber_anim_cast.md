# Engine API C: cloth, cloak, lightsabers, animation, mocap, moves, cast

Scope: `parts/p11_cloth.js` to `parts/p15f_outfits.js` (12 files). Written from a read of the code as it stands. Nothing was modified. The only tool run was `node tools/clipstats.js` (read-only, prints). Line numbers are given where a trap is easy to miss. Numbers marked "computed" were worked out by hand from the formulas in `MOCAP.moveSpecs`; they were not measured in-game.

## 0. Conventions

- **Load order.** Parts are concatenated in name order into one script, so every top-level `const` is a shared global. Within this group the order is p11, p11b, p12, p13, p13b, p14, p15, p15b, p15c, p15d, p15e, p15f. Code that runs at load time may only touch earlier parts. Everything else here runs at call time.
- **Units.** Metres, seconds, radians. Two exceptions: `CLOTH.arcPanel` angles and QO grade hues are in degrees.
- **Body space** (ANIM, MOV): origin on the ground at the feet, +Y up, +Z forward, +X the character's **left**. A key's `h` (hilt centre) and `a` (blade direction) are body space.
- **Logical rig, 19 bones:** `0 pelvis, 1 spine, 2 chest, 3 neck, 4 head, 5 clavL, 6 uarmL, 7 farmL, 8 handL, 9 clavR, 10 uarmR, 11 farmR, 12 handR, 13 thighL, 14 shinL, 15 footL, 16 thighR, 17 shinR, 18 footR`.
- **Two clocks.** A keyed move (`K(...)` keys) uses move seconds. `clipMove` takes `ev`, `cancel` and `move` in **clip** seconds and converts them with `tc(t) = (t - t0) / rate`. The move's duration becomes `(t1 - t0) / rate`.
- **Hit window** `[t0, t1, mask, damage, kind]`. Mask bit `i` selects blade `i`: 1 = blade 0, 2 = blade 1, 3 = both. A mask of 0 is silently replaced by 3 (`e[2] || 3`, p18_player.js:248), so "no blade" cannot be expressed.

## 1. Part map

| Part | Lines | Provides | Key globals |
|---|---|---|---|
| p11_cloth | 219 | verlet panels | `CLOTH`, `ClothSet` |
| p11b_cloak | 59 | Maul's hood and cape | `CLOAK` |
| p12_saber | 213 | lathe hilts, HDR blades, trails | `SABER`, `SaberTrail`, `Saber` |
| p13_anim | 299 | `Pose`, prop IK, gait | `Pose`, `ANIM` |
| p13b_mocap | 247 | 60 baked clips on the logical rig | `MOCAP`, `MoFrame` |
| p14_moves | 128 | Maul's keyed moves, `K`, `MOV.spin`, `MOV.REACT` | `MOV`, `K` |
| p15_cast | 110 | B1 droid, E-5 rifle, `MOV.trooper`, `MOV.melee` | `CAST.buildB1`, `CAST.rifle` |
| p15b_heads | 75 | SDF human head and ears | `HEADS` |
| p15c_humans | 301 | `CAST.human`, hair, skirts, 7 SPECS, `CAST.need` | `CAST`, `CM.humanSkin`, `CM.hair` |
| p15d_goodguys | 116 | Gungan, Twi'lek, Senate, CSF, Panaka, Darsha | `CAST.humanX`, more SPECS |
| p15e_qcast | 80 | `CAST.QC`, `CAST.useQ`, `CAST.qBody` | `QB.hairMat`, `QB.refit` |
| p15f_outfits | 131 | modelled outfits, recolour grades | `QB.outfitMat`, `QB.buildOutfit`, `CAST.QO` |

---

## 2. p11_cloth.js: CLOTH (verlet panels)

**Purpose.** Verlet panels for skirts, tabards, robes and capes. Each panel is a `cols x rows` grid whose top row is pinned to a rig bone. It is simulated in world space at a fixed 1/60 s step and re-meshed every frame.

**Public API**
```js
CLOTH.arcPanel(o)        // -> {cols, rows, pts, bone, mat, stiff, name, thick, damp, carry, grav}
CLOTH.stripPanel(o)      // straight-top strip. Defined, NEVER CALLED.
CLOTH.maulSpec(J)        // -> {panels: [8 panels], colliders: 'legs'}
CLOTH.mat(key)           // -> cached double-sided MeshPhysicalMaterial
new ClothSet(spec, inst) // inst = CharInst. Builds one Mesh per panel in this.group
ClothSet: addTo(scene), setVisible(v), dispose(), gather(), reset(), step(dt), sub(h), collide(p,k), remesh()
```

`arcPanel` options: `y` (top height, m), `rx`, `rz` (ellipse radii), `cx`, `cz` (centre offset), `a0`, `a1` (degrees from +Z toward +X), `len` (m), `rows` (8), `cols` (6), `flare` (0.3; the hem is `1+flare` times the top), `bone` (0 = pelvis, 2 = chest), `mat` (a `CLOTH.mats` key, default `'tunic'`), `stiff` (1), `damp` (0.95), `carry` (0.55), `grav` (1), `name`. `thick` is stored and never read.

**Step behaviour.** Gravity -9.8. Velocity is damped by `damp`. Each column is carried by its own pin's motion by `carry`. There are 4 constraint iterations, with bend and shear springs, then capsule collision. A teleport check fires when a pinned column moves more than 0.6 m horizontally in one step (`|dx|+|dz|`). That snaps the panel and runs 40 settle steps. The floor is `inst.floorY + 0.02`. At most 3 substeps run per frame.

**Mat table.** `CLOTH.mat(key)` returns `CLOTH.mats[key]` if present, otherwise builds from `[albedo, sheenColour, roughness, sheen?, envIntensity?]`:

Keys: `tunic`, `tabard`, `robeBrown`, `robeTan`, `tusken`, `guard`, `thug`, `cape`, `red`, `senate`.

Real entry: `cape: [0x131316, 0x2e2c32, 0.84, 0.55, 0.3]`. Other entries include `red: [0x5a0808, 0xa04040, 0.85]` and `senate: [0x21388a, 0x3a4f90, 0.88]`. **An unknown key silently gives grey `[0x222222, 0x555555, 0.9]`.**

**Adding a material (witch robe).** Add one line to the literal in `CLOTH.mat`, then use the key:
```js
witch: [0x1c1030, 0x3c2c66, 0.9, 0.7, 0.6],   // proposed values, untested
// in the SPECS entry:
cloth: (J) => CAST.skirt(J, { len: 0.5, mat: 'witch' }),
```

**Hooks on the instance.** `inst.drape` = `{dir: Vector3, k, amp}` springs the cape toward a streamer on vehicles. `inst.wind` (`{x,y,z}`), `inst.flutter`, `inst.floorY`, `inst.extraCol` (list of `[a, b, r]` capsules, e.g. a speeder), `T.clothR` (scales collider radii).

**Performance.** Each frame costs one `remesh` (a normal for every vertex) and a `gather` that allocates Vector3s. Collision is capsules x particles x 4 iterations. Cloth meshes have `frustumCulled = false`. The 40-step resettle was measured at about 17 ms when it fired every frame while riding (comment, p11 line 115), so keep `inst.drape` set on vehicles.

**Gotchas**
- Carry each column by its own pin. Averaging the pin motion flings side panels out like flags.
- A teleport re-settles the whole panel. A vehicle must set `inst.drape`, or speed reads as a teleport every frame.
- Refresh `actor.floorY` on vehicles. A stale value clamps the cloth into a vertical tube.
- Black cloth: keep albedo at or above `0x13`. The shader rim is tuned for cloth (`0.55 * pow(rim, 7.0)`), so a wide rim would grey it out edge-on.
- `CLOTH.mat` caches by key. Changing a key's values after first use has no effect.
- The hip follow spring applies only to bone-0 panels when `colliders === 'legs'` and `pd.follow !== 0`.

**Recipes.** Robe skirt: `CAST.skirt(J, {len: 0.5, mat: 'robeBrown'})`. Shoulder cape: copy the `arcPanel` in `CLOAK.build` (bone 2, `a0 64, a1 296, rows 12, cols 15, carry 0.85, damp 0.9, grav 1.8`).

---

## 3. p11b_cloak.js: CLOAK (Maul's hood and cape)

**Purpose.** Maul's travelling cloak: an SDF hood skinned to head and neck, and a hanging cape. Built once with the character. Worn on Tatooine and in the hangar reveal, and dropped in the Naboo level.

**Public API**
```js
CLOAK.build(T)     // async. Needs T.J. Sets T.cloak = {geo, mat} and T.capeSpec = {panels}
CLOAK.wear(a, on)  // a = Actor. First call with on=true builds hood + cape. Sets a.cloaked
CLOAK.drop(a)      // unpins cape: a.cloaked = false; I.cape = null; I.droppedCape = cs
```
- Hood: SDF shell meshed at 4.8 mm (`MESH.nets`), skin weights ramp from bone 2 (chest) to bone 4 (head) between `J.neck[1]-0.02` and `J.head[1]+0.02`. Material `CM.cloth(0x202025, 0x3e3e4a, 0.86, 'maulCloak', true)`.
- Cape: one continuous `arcPanel` of 12 x 15 = 180 particles (one panel, because separate panels split in a headwind).
- `wear` uses the outfit's own `head_hood` mesh when one exists and hides the SDF hood.

**Hooks.** `a.cloaked`, `I.cloakMesh`, `I.cape`. The cape's `gather` adds a torso capsule `[spine, neck, 0.2]`.

**Gotchas**
- **Drop is one-way.** After `CLOAK.drop`, `I.cape` is null. `wear(a, true)` brings the hood back but never the cape, because the cape is only built when `I.cloakMesh` is absent.
- `drop` moves the dropped cape only through `LEVEL.cur.updates`. Outside a level it hangs still.
- The build needs `J.head`, `J.neck` and `J.shoulder`. Only skeletons from `RIG.joints` or `QB.joints` have them.

**Performance.** The hood SDF is build-time only. At runtime there is one 180-particle cloth.

---

## 4. p12_saber.js: SABER (lightsabers)

**Purpose.** Lathe-built hilts, four additive HDR layers per blade, swept trails, and one point light per blade.

**Colours**
```js
SABER.COL = { red: [1.0, 0.07, 0.03], green: [0.18, 1.0, 0.12], blue: [0.1, 0.35, 1.0], yellow: [1.0, 0.8, 0.1] };
```
These are HDR multipliers, not sRGB. **There is no `crimson`.** An unknown name silently falls back to red (`SABER.COL[color] || SABER.COL.red`). The closest existing entry is `red`.

**Hilt kinds.** `Saber` takes `kind`, and only two branches exist:

| kind | builder | `userData.ends` | `grips` | `len` | notes |
|---|---|---|---|---|---|
| `'staff'` | `buildStaff()` | `[0.281, -0.281]` | `[0.132, -0.132]` | 0.562 | two blades, mirrored halves, vents, studs |
| `'quigon'` | `buildSingle('quigon')` | `[0.14]` | `[-0.05, 0.02]` | 0.28 | ribbed profile, gold button |
| anything else | `buildSingle(kind)` | `[0.14]` | `[-0.05, 0.02]` | 0.28 | default profile (Obi-Wan style) |

There is **no `'dual'`**. Two blades means two `Saber` objects, or `'staff'`.

Real profile (default single, p12):
```js
prof = [[0.006,-0.135],[0.0175,-0.134],[0.0185,-0.125],[0.0165,-0.115],[0.0165,-0.06]]
  .concat(SABER.ribs(-0.06, 0.02, 6, 0.0165, 0.0182, 0.5))
  .concat([[0.0165,0.025],[0.017,0.07],[0.019,0.075],[0.019,0.1],[0.022,0.118],[0.022,0.135],[0.012,0.136]]);
```
Each pair is `[radius, y]` in metres, y ascending from pommel to blade root, hilt centre at y = 0. `SABER.lathe(prof, seg)` revolves it about Y. `SABER.ribs(y0, y1, n, r0, r1, duty)` returns the groove pattern.

**Constructor and methods**
```js
new Saber(kind, color, opt)     // color: key of SABER.COL. opt.len (default 0.92 m), opt.prio (default 3)
S.addTo(scene); S.remove(); S.setVisible(v)
S.ignite(which, on)             // which: index, or undefined for all. ign ramps up 5.5/s, down 4/s
S.update(dt, now)               // flicker, blade length = len * easeOut(ign), light pos and intensity
S.bladeSeg(i, base, tip)        // world base and tip of blade i (out Vector3s)
S.sampleTrails(now, strength)   // call EVERY frame; strength 0 clears the trail
```
Fields: `group`, `hilt`, `ends`, `ign[]`, `ignT[]`, `len`, `blades[{g, layers}]`, `trails[]`, `lights[]`, `lightK`, `flick`.

**Blade layers** (per end; `[radius, intensity, pow, white]`): core `[0.0072, 6.0, 0.35, 0.92]`, inner `[0.0125, 2.6, 1.1, 0.12]`, glow `[0.027, 0.75, 2.0, 0]`, halo `[0.06, 0.13, 3.0, 0]`. Intensity is multiplied by a flicker (`1 + 0.02 sin + 0.012 sin`). The fragment shader fades the blade when it is near the lens and when it points at the camera.

**Light.** `R.addLight({pos, col, i, range: 4.8, prio, on, persist: true})` per end. Intensity is `1.5 * lightK * ign * flick`. `lightK = min(1, 0.3 / luma)` with Rec.709 luma, which gives red 1.00, blue about 0.87, yellow about 0.38, green about 0.39.

**Trails.** `SaberTrail(col, n = 48)` keeps samples for `maxAge = 0.11` s. `sampleTrails` subdivides 4x when the previous sample is under 0.06 s old, so fast spins stay round.

**Hooks.** `COMBAT.sweep` only counts a blade when `ign[i] >= 0.5`. `setVisible(false)` also turns the lights off and clears trails.

**Recipe: bone-white curved hilt.** A lathe is a solid of revolution about Y, so it cannot curve. Build the guard with `TubeGeometry` along a `CatmullRomCurve3`, put it in a Group, and give that Group `userData.ends` (the constructor reads only `ends`). Then swap it in from a later part, without editing p12:
```js
SABER.COL.crimson = [0.85, 0.02, 0.05];                 // proposed; luma gives lightK = 1.0
SABER.buildBoneHilt = function () { /* TubeGeometry guard, MeshStandardMaterial 0xe6dcc4, rough 0.45 */
  const g = new THREE.Group(); /* ...meshes... */ g.userData = { ends: [0.14], grips: [-0.05, 0.02], len: 0.28 }; return g; };
const S = new Saber('single', 'crimson', { len: 0.92, prio: 5 });  // blades placed from S.ends
S.group.remove(S.hilt); S.hilt = SABER.buildBoneHilt(); S.group.add(S.hilt);
```
The `ends` of the new hilt must match the blade positions already built (`[0.14]`).

**Gotchas**
- **`PLAYER.update` sets `PLAYER.saber.lightK = 1` every frame** (p18_player.js:85). The auto-dim therefore never applies to a player saber. A green hero's blade (intended lightK about 0.39) or a yellow one (about 0.38) lights the scene roughly 2.5 to 2.6 times as strongly as the table intends, unless that line changes. (The title menu sets 0.4 in p28, which the game loop overwrites.)
- A non-existent colour name silently gives red.
- For a single blade, call `setProp(S, false)`. `symProp` turns on the staff's end-flip logic, which is wrong for one blade.
- A blade stays hidden until `ignite` runs or `ign` is set. Maul sets `S.ign = [1, 1]` to skip the ramp.
- `setVisible(false)` clears trails. `sampleTrails` must keep running afterwards.

**Performance.** Each end has 4 ShaderMaterials (uniforms differ per layer) and 1 light. Trails rebuild a 96-vertex buffer per end per frame. Hilt lathes are rebuilt for every `Saber` (not cached). The blade geometry (`SABER._bg`), the vent box and `SABER.mats()` are cached and shared.

---

## 5. p13_anim.js: Pose and ANIM (prop-driven poses)

**Purpose.** A pose places the **prop** (hilt centre `hp`, orientation `hq`), says which hands grip it (`gL`, `gR`), and sets body angles. `ANIM.apply` solves the arms (two-bone IK onto the grips), the legs (IK onto foot targets) and the spine and head (by angles).

**Pose fields and defaults**

| field | default | meaning |
|---|---|---|
| `hp` | (0, 1.05, 0.3) | hilt centre, body space |
| `hq` | identity | prop orientation; +Y is the blade axis |
| `gL`, `gR` | 1, 1 | grip weight per hand (1 = on the prop) |
| `oL`, `oR` | 0.132, -0.132 | grip offset along the blade axis |
| `fL`, `fR` | (0.35,1,0.1), (-0.35,1,0.1) | free-hand targets |
| `yaw`, `twist`, `pitch`, `lean`, `hipTilt`, `flip`, `roll` | 0 | body angles |
| `crouch` | 0.05 | pelvis drop (m) |
| `off` | (0,0,0) | whole-body offset |
| `footL`, `footR` | (0.13,0,0.1), (-0.13,0,-0.1) | foot targets |
| `liftL/R`, `toeL/R`, `headYaw`, `headPitch`, `air` | 0 | lift, toe pitch, head, air flag |

Methods: `new Pose()`, `copy(o)`, `blend(a, b, t)` (sets `this` to the lerp, slerp for `hq`, returns `this`).

**Stance table.** `ANIM.STANCE[name] = [[x, z, _], [x, z, _]]` gives left and right foot targets. Only the first two numbers are read. Names: `guard, wide, neutral, lungeL, lungeR, spin, back, cross, kick`. Example: `guard: [[0.15, 0.17, 0.25], [-0.15, -0.17, -0.35]]`.

**Keyframe fields** (set by `K` in p14 or raw): `t`, `h`, `a`, `r` (roll), `q`, `g` (`'both'|'L'|'R'|'none'`), `oL`, `oR`, `fl`, `fr`, `fL`, `fR`, `st`, `yaw`, `tw` (twist), `pi` (pitch), `le` (lean), `cr` (crouch), `hipTilt`, `flip`, `roll`, `headYaw`, `headPitch`, `air`, `liftL`, `liftR`, `toeL`, `toeR`, `off`, `ease` (`'io'` default, `'lin'`, `'out'`, `'in'`; the ease applies to the segment **ending** at that key). `keyPose(k, prev)` starts from the **previous** key, so an omitted field persists.

**API**
```js
ANIM.keyPose(k, prev, out)                  // -> out
ANIM.compile(clip, base = ANIM.basePose)    // caches clip._poses; clip.dur defaults to the last key's t
ANIM.sample(clip, t, out)                   // Catmull-Rom on hp; eased blend for the rest
ANIM.apply(inst, P, opt)                    // opt.groundY(x,z) -> y | null ; opt.fitProp (default true)
ANIM.loco(carry, speed, mdx, mdz, phase, out, extra)   // locomotion; extra = {acc, turn}
ANIM.gait(v, two, lat) -> {run, f, stance, travel};  ANIM.footPath(p, G, o);  ANIM.cadence(v, two, lat)
ANIM.axisQ(dx, dy, dz, roll, out)           // quaternion mapping +Y to the direction
```
A single-key clip has `dur = 0.001`, so it ends at once if its time advances. PLAYER freezes its `block` with `actSpeed = 0`.

**ANIM.apply, in order**
1. **Holder.** Body yaw, flip and roll about the centre of mass (`LD.com = 0.95` m), offset by `P.off`.
2. **Spine and head.** Crouch, lean, twist, pitch and head turn are spread over bones 0 to 4. `MOCAP.trunk` overwrites these when `inst.mo.on`.
3. **Legs.** Thigh and shin IK to the foot targets. The ankle sits 0.087 m above the sole, plus `lift * 0.18`. When `opt.groundY` is given and the character is grounded, the ankle is raised to the ground.
4. **Prop.** `hpW = P.hp` in world space. `MOCAP.propFollow` adds the chest motion of the clip. `hqW = qBody * P.hq`.
5. **Arms.** Per hand: grip point = hilt + axis * (`oL` or `oR`); target = lerp(free target, grip, `gw`). Two-bone IK with a pole from body-space `(±0.5, -0.5, -1)`. Two solve passes per hand. When both hands grip, a third pass pulls the hilt into both fists (`corr`).
6. **Placement.** `prop.position = hpW`, `prop.quaternion = hqW`, `prop.scale = inst.scale`.
7. **Downstream.** `MOCAP.arms` (full moves), then `QB.drive(inst)` with `inst.q.gripL/R`.

**Prop IK and grip system**
- `Actor.setProp(obj, sym)` sets `inst.prop = obj.group || obj` and `inst.symProp = !!sym`.
- `symProp` (staff only) picks the grip end from the body frame: `axis · body(0,1,0.35)`, with hysteresis at -0.2 and a 12-frame lock (`gft`) after each flip. The lock holds while `inst.inAct` is true.
- Re-grip wrist rate limit: slerp toward last frame's hand, at most 0.6 rad per frame, applied **before** IK (`inst._hq`).
- Elbow continuity: the pole is blended toward last frame's elbow (`inst._ep`), so the elbow cannot cross over when the wrist passes the shoulder line.
- Debug: `window.__ikdbg` receives per-hand miss and reach. `MG.flags.gsr` flips the body-frame grip sign.

**Performance.** All scratch vectors are preallocated (`ANIM._t`, `vv`, `qq`). `keyPose` allocates only at compile time, which is cached. Per frame that is 2 leg solves plus 4 arm solves per pass, with up to 3 passes.

**Gotchas**
- Blend-in: 0.12 s from idle, 0.09 s when chaining, 0.16 s for the lunge. Under 0.08 s pops the arms to about 70 degrees (kit).
- Playback: light combo clips at 1.3 to 1.4x; the lunge at 1.15x. Faster whips the saber 80 to 90 degrees per frame (kit).
- Decide a staff's grip end from the body frame, not the forearm. The forearm is the IK's own output, and testing it flips the grip every frame.
- The first key of a move must set every field the move relies on, because later keys inherit from it.
- `STANCE` entries carry an unused third number.

**Recipe: one-handed pose.** `g: 'R', oR: 0.02` grips with the right hand only. Set `fL` to the free-hand target. Use `g: 'both'` for a two-handed guard.

---

## 6. p13b_mocap.js: MOCAP (baked clips on the logical rig)

**Purpose.** Quaternius Universal Animation Library clips drive the trunk and legs. In `'full'` moves they also drive the arms, and the weapon rides the hand. Keyed poses supply the weapon path and the fallback when mocap is off.

**Clip list.** `assets/q.json` holds 60 clips. Durations are from the file.

- **Locomotion (16):** Walk_Loop 1.33 s, Walk_Formal_Loop 1.33, Jog_Fwd_Loop 0.93, Sprint_Loop 0.67, Crouch_Fwd_Loop 2.00, Slide_Start 0.83, Slide_Loop 2.00, Slide_Exit 0.50, Roll 1.47, ClimbUp_1m 0.67, Jump_Start 1.33, Jump_Loop 2.50, Jump_Land 1.27, NinjaJump_Start 0.97, NinjaJump_Idle_Loop 2.00, NinjaJump_Land 1.27.
- **Idle and stance (12):** A_TPose 2.50, Idle_Loop 2.50, Idle_Talking_Loop 2.93, Idle_FoldArms_Loop 2.50, Idle_Shield_Loop 2.50, Idle_Shield_Break 1.07, Crouch_Idle_Loop 2.93, Sitting_Idle_Loop 1.67, Driving_Loop 1.67, Sword_Idle 1.67, Pistol_Idle_Loop 1.67, Spell_Simple_Idle_Loop 2.10.
- **Sword (10):** Sword_Attack 1.53, Sword_Regular_A 0.43, Sword_Regular_A_Rec 0.97, Sword_Regular_B 0.53, Sword_Regular_B_Rec 1.03, Sword_Regular_C 2.00, Sword_Regular_Combo 3.00, Sword_Heavy_Combo 4.33, Sword_Dash 1.57, Sword_Block 1.23.
- **Unarmed and other (9):** Punch_Jab 0.87, Punch_Cross 1.00, Melee_Hook 0.47, Melee_Hook_Rec 0.60, OverhandThrow 1.33, Shield_Dash 1.10, Push_Loop 2.67, Interact 2.00, Fixing_Kneeling 5.20.
- **Ranged and spell (8):** Pistol_Aim_Down, Pistol_Aim_Neutral, Pistol_Aim_Up (0.17 each), Pistol_Shoot 0.63, Pistol_Reload 1.67, Spell_Simple_Enter 0.53, Spell_Simple_Exit 0.43, Spell_Simple_Shoot 0.50.
- **Reactions (5):** Hit_Chest 0.33, Hit_Head 0.43, Hit_Knockback 0.83, LayToIdle 1.53, Death01 2.40.

**Sets (`MOCAP.SETS`, real):**
```js
maul:    { base: { guard: 'Sword_Idle', run: 'Sword_Idle', idleCalm: 'Idle_Loop' }, arms: true, stance: 0.5, upright: 0.86 },
jedi:    { base: { guard: 'Sword_Idle', run: 'Sword_Idle' }, arms: true, stance: 0.55, upright: 0.4 },
trooper: { base: { idle: 'Idle_Loop', run: 'Idle_Loop', aim: 'Pistol_Idle_Loop' }, arms: true },
melee:   { base: { idle: 'Sword_Idle', run: 'Sword_Idle' }, arms: true, stance: 0.6 },
brawler: { base: { idle: 'Sword_Idle', run: 'Sword_Idle' }, arms: false, stance: 0.6 },
```
- `base` maps `a.base` (`'guard'`, `'run'`, `'idle'`, `'idleCalm'`, `'aim'`) to an idle clip.
- `arms`: free arms follow the clip. Arms on the prop stay on IK.
- `stance`: the fraction of the clip's crouch kept (0.5 = half). Legs are re-planted by IK.
- `upright`: how much pelvis and spine forward tilt is removed (1 = all).

**Entry points**
```js
MOCAP.state(a)            // maps a.moves identity -> set. Only MOV.maul, jedi, trooper, melee, brawler. Else null (no mocap)
MOCAP.init()              // lazy; false until QB.ready. Computes MOCAP.PH0 and calls MOCAP.moveSpecs() once
MOCAP.sample(name, t, loop, out, mirror)
MOCAP.sampleSeq(spec, t, out)   // plays spec.seq
MOCAP.actor(a, dt)        // called from Actor.animate
MOCAP.trunk / legs / propFollow / arms   // the ANIM.apply stages
```
`MOCAP.actor` builds the locomotion blend (idle, walk 1.0, jog 3.4, sprint 5.8 m/s: `MOCAP.V`), with phase synced to speed, back-pedal played backwards, and hip yaw toward travel. It then builds the action sample, cross-fades when `a.act` changes, applies `upright`, and sets the weights: `mo.W` fades in over `a.fadeDur` and out over 0.12 s; `wFull`, `wAL` and `wAR` follow from it.

**Clip-backed move API**
```js
seg(clip, t0, t1, dur?)                         // [clip, t0, t1, dur], dur defaults to t1-t0. clip null = hold previous frame
put(set, name, spec, extra?)                    // spec = {seq, mode: 'full'|'body', mirror?, rate?, twoHand?, oR?, fitDur?}
clipMove(set, name, clip, t0, t1, rate, o)      // a CLOSURE inside moveSpecs. Not exported.
```
`clipMove` sets `m.mo = {seq: [[clip,t0,t1,t1-t0]], mode:'full', rate, oR, twoHand}`, `m.dur = (t1-t0)/rate`, `m.ev` (converted), `m.cancel = tc(o.cancel)`, `m.move` (converted times), `m.impact`, and `m.fadeOut` (default 0.22). Real Maul call (p13b:215):
```js
clipMove(M, 'a1', 'Sword_Regular_Combo', 0.0, 0.46, 1.4, { ev: [[0.14, 0.32, 3, 18, 'slash']], cancel: 0.33, move: [[0.06, 0], [0.28, 0.55]] });
```
Maul's four clip moves are `a1`, `a2`, `a3` (from `Sword_Regular_Combo`) and `lunge` (`Sword_Dash`). `a4` and `a5` stay keyed. Reactions use `put` with `mode: 'body'`, e.g. `put(set, 'hitR', { seq: [seg('Hit_Chest', 0, 0.33, 0.34), seg(null, 0, 0, 0.12)], mode: 'body', mirror: true })`.

**Hooks.** Add clip moves in `MOCAP.moveSpecs`. Add sets in `MOCAP.SETS`. Route new move tables in `MOCAP.state`. `MG.flags.nomocap` turns mocap off for every actor.

**Performance.** `MOCAP.init` runs once. Per actor per frame: 1 to 4 locomotion samples plus 1 action sample, each slerping 19 quaternions. Leg IK runs only when ground height differs from the clip. Arm IK runs only in two-hand full moves.

**Gotchas**
- **Silent no-ops.** `put` and `clipMove` return early when the name is not in the set. A typo leaves the keyed move running with no error.
- **Mocap overwrites the keyed move.** While mocap is on, `clipMove` replaces the move's `dur`, `ev`, `cancel` and `move`. The keyed values run only when mocap is off or the set is missing. Concrete differences: Maul `a1` keyed dur 0.50 becomes 0.329 s (computed); `a1` ev becomes 0.100 to 0.229 with mask 3 (keyed: 0.09 to 0.24, mask 1); `a2` mask 2 becomes 3. The keys themselves are **not** rescaled, so keyed poses still sample on the old timeline. Keep both in step.
- **Two clocks.** `clipMove` takes clip seconds. `strike()` and keyed moves take move seconds. Mixing them is easy.
- `set.knock` and `set.death` are cloned before `put`, because several sets share the same object.
- `upright` is skipped for knock, death and fall clips.
- `MOV.init` overwrites trooper `knock` with REACT's 2.25 s. The mocap `extra.dur` of 2.25 keeps the two in line.

---

## 7. p14_moves.js: MOV (keyed moves)

**Purpose.** Keyed hilt paths for Maul's saberstaff and for the shared reaction tables.

**API**
```js
K(t, h, a, x)                // -> {t, h, a, ...x}
MOV.spin(t0, t1, n, fn, x)   // n+1 keys; fn(u) returns fields; ease 'lin'; x merged into the first key
MOV.init()                   // assigns REACT to trooper/melee/brawler, sets deathFall, sets ANIM.basePose, compiles the 5 sets
MOV.GUARD, MOV.REACT, MOV.DEATH_FALL, MOV.maul.flourish, MOV.maul.lock (p31)
```

Real move (p14:19):
```js
a1: { dur: 0.5, next: 'a2', cancel: 0.27, ev: [[0.09, 0.24, 1, 18, 'slash']], move: [[0.1, 0], [0.22, 0.55]], keys: [...] },
```
**Fields read by the engine:** `dur`, `keys`, `loop`, `ev`, `move`, `next`, `cancel`, `impact`, `fadeOut`, `moBase`. **Fields never read:** `aoe` (heavy), `release` (throwWind), `force` (push), `iframes` (dodge, backflip). Invulnerability on dodge comes from `PLAYER.dodge`, which sets `a.iframe = 0.34` (p18:234).

**Combo chaining.** An attack pressed within 0.5 s (`IN.peek('attack', 0.5)`) sets `PLAYER.comboQ = c.next`. The chain fires once `PLAYER.cancelOK()` is true (`actT >= c.cancel`). Dodge cancels an attack after 0.1 s (p18:178). Heavy queues the same way.

**Maul moves.** "Keyed" is the p14 value. "Mocap" is the value after `MOCAP.moveSpecs` (computed).

| move | keyed dur | mocap dur | hit windows (move s), mask, dmg, kind | cancel | notes |
|---|---|---|---|---|---|
| a1 | 0.50 | 0.329 | 0.100-0.229, 3, 18, slash | keyed 0.27 / mocap 0.236 | next a2 |
| a2 | 0.48 | 0.386 | 0.100-0.264, 3, 18, slash | 0.271 | next a3; keyed mask 2 |
| a3 | 0.66 | 0.591 | 0.015-0.303 twirl 12; 0.318-0.523 slash 14 | 0.455 | next a4 |
| a4 | 0.64 | keyed | 0.06-0.48, 3, 16, spin | 0.40 | next a5; keyed only |
| a5 | 0.82 | keyed | 0.20-0.34, 1, 34, slam | 0.50 | `impact` 0.32 triggers `slamImpact` (16 dmg in 2.8 m) |
| heavy | 1.05 | keyed | 0.12-0.66 whirl 14 (re-hit every 0.14 s); 0.72-0.84 sweep 24 | 0.90 | `aoe` unused |
| lunge | 0.55 | 0.783 | 0.157-0.365, 3, 26, thrust | 0.574 | root motion: 0 m at 0.087 s, 3.2 m at 0.348 s |
| plunge | 0.45 | keyed | 0.05-0.45, 3, 30, plunge | | air attack |
| kick | 0.50 | keyed | 0.14-0.26, mask 0 becomes 3, 12, kick | | |
| push | 0.62 | | none; `PLAYER.push` deals 8 in 8.5 m, +/-0.9 rad, knock force 10 + 8k | | |
| exec | 1.35 | keyed | 0.18-0.30 and 0.86-1.02, 999, exec | | bosses take at most 15 % max HP |
| hit | 0.36 | 0.36 | Hit_Chest | | |
| knock | 1.30 | 1.30 | Hit_Knockback then LayToIdle | | |
| death | 1.60 | 1.60 | Death01 | | |
| block, blockHi | 0.001 | | single key, `moBase` | | PLAYER freezes it |
| deflectL / deflectR | 0.22 | | `moBase` | | |
| dodge / backflip | 0.42 / 0.60 | | none | | iframe 0.34 from PLAYER.dodge |

**Reaction tables.** `MOV.REACT` is shared by trooper, melee and brawler through `MOV.init`:

| move | keyed dur | mocap dur | source clip |
|---|---|---|---|
| hitL | 0.50 | 0.46 | Hit_Head |
| hitR | 0.50 | 0.46 | Hit_Chest, then a 0.12 s hold, mirrored |
| hitSpin | 0.42 | 0.42 | Hit_Head |
| hitHeavy | 0.85 | 0.85 | Hit_Head + Hit_Chest |
| knock | 2.25 | 2.25 | Hit_Knockback, hold, LayToIdle |

`MOV.trooper.death` is keyed 1.3 s; mocap is 1.9 s. `MOV.DEATH_FALL` (1.3 s) is assigned as `set.deathFall`; its consumer is outside these parts.

**Jedi moves** (`MOV.jedi`, p31). Keyed dur, then the mocap dur from `strike()`:

| move | keyed dur | mocap dur | window (move s), dmg | move track |
|---|---|---|---|---|
| over | 0.95 | 1.15 | 0.45-0.68, 16 | 0.40 to 0; 0.62 to 0.7 m |
| side | 0.85 | 0.94 | 0.39-0.54, 14 | 0.35 to 0; 0.55 to 0.5 m |
| thrust | 0.90 | 1.03 | 0.42-0.66, 18 | 0.40 to 0; 0.62 to 1.6 m |
| spin | 1.00 | keyed | 0.42-0.72, 15 | |
| leap | 1.10 | keyed | 0.72-0.90, 22 | |
| push, hit, parry | 0.80, 0.42, 0.45 | hit 0.42 | | |

Jedi strikes take windows in **move** seconds (their segments are already in move time). `strikeCheck` (p31) reads only `c.ev[0]`, sweeps mask 1 and applies `e[3]`.

**Trooper, melee and brawler**
- `MOV.trooper` (p15): `idle`, `aim`, `run` (loops), `hit` 0.40, `knock` (REACT), `death` 1.30, `choke` (loop, used on grip), `stun` (loop, used on parry), `execd` 1.40. Enemy damage comes from `ENEMY.TYPES[...].dmg`, not from move windows.
- `MOV.melee` (p15): `idle`, `run`, `wind` 0.55, `strike` 0.50 with `ev` `[0.05, 0.20, 1, 12, 'melee']`. **Enemies never read this `ev`.** `Enemy.strikeCheck` (p20_ai.js:147) uses a hard-coded actT range of 0.06 to 0.22 s, range under 2.3 m, yaw within 1.0 rad, and one hit for `D.dmg`.
- `MOV.brawler` (p40b, Garyn): `jab` 0.42 (`[0.12, 0.20, 0, 7, 'fist']`), `cross` 0.48 (`[0.16, 0.26, 0, 9, 'fist']`), `kick` 0.70 (`[0.28, 0.40, 0, 13, 'kick']`), `fly` 0.95 (`[0.45, 0.62, 0, 16, 'kick']`), `evade` 0.36, `hit` 0.40. Its consumer is in p40b, not reviewed here.

**Consumers in the player path.** `PLAYER.hitWindows` (p18:242) is active from `t0` to `t1 + dt`. It uses mask `e[2] || 3`, multiplies damage by 1.6 in rage, re-hits `twirl`, `whirl` and `spin` every 0.14 s, and sweeps with reach 3.8 m (3.2 m for whirl). `PLAYER.landHit` routes through `t.tryBlock`, which lets an enemy block.

**Gotchas**
- **`MOV.maul` is hard-coded in the player path.** See section 14, step 6.
- `MOV.init` compiles only the five named sets. A new set must be added to that list or compiled by hand.
- Compile is cached. Editing keys after `compile` has no effect.
- `MOV.init` sets `ANIM.basePose` to the `GUARD` pose.

---

## 8. p15_cast.js: props, B1 droid, trooper and melee move tables

**API**
```js
CAST.pm(hex, rough, metal, emis)            // MeshStandardMaterial; emis sets emissiveIntensity 3
CAST.limbGeo(def, bi, r0, r1, seg)          // cylinder from bone head to tail
CAST.at(def, bi, p)                         // p - def[bi].head
CAST.buildB1(variant)                       // droid template {name:'b1', J, def, parts, attach, droid:true}; 'cmd' adds gold
CAST.rifle(kind)                            // THREE.Group, +Y = barrel. kind 'pistol' scales y by 0.6
CAST.staff(kind)                            // in p15c: 'electro' or the gaffi stick (default)
```
`rifle` and `staff` return `userData.muzzle` (Object3D) and `userData.glow`. **Both call `R.scene.add(g)` before returning.** Whoever attaches them to a character must remove them from the scene first.

**Gotcha.** `CAST.buildB1` uses `RIG.joints({height: 1.07, shoulders: 0.82})`. It is a rigid-part droid and does not use the SDF body.

---

## 9. p15b_heads.js: HEADS

```js
HEADS.humanGroups(HO, eyeO)   // -> [{name:'head', items, op:'su', k:0.03}, {name:'earL'}, {name:'earR'}]
HEADS.ear(it, side, hm)       // pinna, helix (23 points, 22 capsule segments), antihelix, concha, lobe, tragus
```
- `HO` is the head origin (ear-canal midpoint, m). Inside, `hm(x,y,z)` takes head-local millimetres.
- The eye centre is `hm(32, 7, 60)`, radius 0.0125.
- **`eyeO` is never read.**
- The sculpted head is built only when the Quaternius base head is not used: a Gungan, a `cullHead` spec, or a spec with no QC.

---

## 10. p15c_humans.js: CAST.human, CAST.need, SPECS, skirts

**Purpose.** Builds a template for an organic cast member: SDF head, hair, beard, braid and helmet shells, body, fists and cloth. Each template takes about 0.5 to 1.5 s to mesh, so it is built lazily per level.

**API**
```js
CAST.need(names, progress?)       // async. Fills CHAR.T[name]. progress(0..1)
CAST.human(spec)                  // async -> T {name, J, def, parts, attach, grip, cloth, height, human, qb?}
CAST.skirt(J, o)                  // -> {panels}. o: len (0.42), rx (0.158), rz (0.125), flare (0.3), mat, tabard (length, m), tabMat
CAST.hairGroups(HO, style)        // 'long' | 'short' | 'topknot'
CAST.beardGroups(HO) / braidGroups(HO, J) / helmetGroups(HO, 'naboo'|'thug'|'tusken')
CAST.hm(HO) / CAST.mm(a)          // head-local mm -> m
CM.humanSkin(key, o)              // cached as 'hs_' + key, where key is spec.name
CM.hair(key, hex, o)              // cached as 'hair_' + key. o: rough, strands, grey
```

**Path selection** (p15c:140). `qc = CAST.useQ(spec)`, and `qo = qc && QB.M.meshes.rmale && CAST.QO[name] && !MG.flags.paint`:
- `qo` true: Quaternius body with a modelled outfit (`CAST.qOutfit`).
- `qc` only: Quaternius body with a painted costume (`CAST.qBody`).
- Neither: SDF body (`SCULPT.humanoid`, `SCULPT.mesh`, `SCULPT.meshFists`). `?sdf` forces this.

**Spec fields**

| group | fields |
|---|---|
| identity, size | `name`, `height` (1), `shoulders` (1) |
| resolution | `headRes` (0.0028), `bodyRes` (clamped to at most 0.0056 on the SDF path), `hairRes` (0.0036), `fistRes` (0.0038) |
| hair | `hair` (`'long'`, `'short'`, `'topknot'`, `'lekku'`, or `[]`), `hairCol` (0x3a2818), `grey`, `beard`, `beardCol`, `braid`, `lekku` |
| eyes | `eyes` (`'blue'`, `'brown'`, `'sith'`, `'gungan'`), `eyePos` ([32,7,60]), `eyeR` (0.0122) |
| skin | `skin: {tone, brow, lip, sss, stubble, plain}` |
| head gear | `helmet` (`'naboo'`, `'thug'`, `'tusken'`), `helmetMat`, `visor` (material), `goggles` (bool), `gungan`, `lekku`, `helm2` (`'senate'`, `'csf'`, `'panaka'`) |
| body | `body: {bulk, collar (low or high), lapel, sleeve [3], cuff, belt {h, sash, pouches}, trouser [2], bootTop, mats {torso, arms, belt, legs, boots, collar}, extra(grp, J)}` |
| materials | `mats()` returns 4 materials, indexed as `CHAR.MAT_IDS`: 0 tunic, 1 trousers, 2 leather, 3 extra. `spec.mats[2]` doubles as the glove material when `gloves: true` |
| misc | `gloves` (bool), `cloth(J)` returns a skirt or null, `head: false` skips the head |

**Real spec** (p15c, `quigon`, abridged):
```js
quigon: { name: 'quigon', height: 1.07, shoulders: 1.04, headRes: 0.0029, bodyRes: 0.0072, fistRes: 0.0034, hair: 'long', beard: true, hairCol: 0x4a3322, beardCol: 0x5a4432, grey: true, eyes: 'blue',
  skin: { tone: 0xc08a6a, brow: 0x3a2818, stubble: 0 },
  body: { bulk: 1.05, collar: 'low', lapel: true, tabards: 'trousers', belt: { h: 0.055, sash: true, pouches: true }, mats: { torso: 'tunic', arms: 'tunic', belt: 'leather', legs: 'trousers', boots: 'extra', collar: 'tunic' } },
  mats: () => [CM.cloth(0x6e5a42, 0x6a5e4c, 0.92, 'qgT', true), CM.cloth(0x4e4234, 0x5a5044, 0.92, 'qgTr', true), CM.leather(0x3a2618, 0.5, 'qgL'), CM.leather(0x2a1c12, 0.45, 'qgB')],
  cloth: (J) => CAST.skirt(J, { len: 0.46, mat: 'robeTan', tabard: 0.55, tabMat: 'robeBrown' }) },
```

**Outputs.** `T.parts` entries are `{geo, mats, name}`. `T.attach` entries are `{bone, geo, mat, pos, name, rotX?}`. `T.grip = SCULPT.fistFrame(J)`. `T.cloth` is `spec.cloth(J)`, built once per template. Per-instance cloth is created by `CharInst` as a `ClothSet` (p10).

**CAST.need.** Caches in `CHAR.T[name]`, so editing a spec after its template exists does nothing. `b1` and `b1cmd` route to `ENEMY.tplOf`. Specs with `gungan`, `lekku` or `helm2` route to `CAST.humanX` (p15d overrides `need`).

**CAST.skirt.** With `o.tabard` set, the front and back skirt panels leave a gap for the tabard. Tabard panels get `len: o.tabard` and `flare: flare * 1.15`.

**Hooks.** `spec.cloth`, `spec.mats`, `spec.body.extra(grp, J)` (adds armour SDF to the body, with `grp(name, mat, k)` and `.add`/`.both`).

**Gotchas**
- **`bodyRes` above 0.0056 is clamped down** on the SDF path (`Math.min(spec.bodyRes || 0.0056, 0.0056)`, p15c:210). `quigon` asks for 0.0072 and gets 0.0056.
- Material caches are keyed by name. `CM.humanSkin` and `CM.hair` return whatever was built first for that name.
- `QO` without `QC` is ignored, so the SDF body is used.
- `CAST.need` awaits `MG.yield()` between SDF meshes, so loading stays responsive. Preload with `LEVEL.def(id, {cast: [...]})` (p24).

---

## 11. p15d_goodguys.js: Gungan, lekku, helmets, more SPECS

```js
CAST.gunganGroups(HO)                  // long skull, bill, eyestalks, haillu ear-flaps
CAST.lekkuGroups(HO)                   // one tapering head-tail per side (two total)
CAST.helmetGroups2(HO, kind)           // 'senate' (tall helm, crest), 'csf', 'panaka' (officer cap)
CAST.humanX(spec)                      // swaps HEADS.humanGroups, CAST.hairGroups, CAST.helmetGroups in try/finally
CAST.shield()                          // translucent Gungan energy disc (Mesh)
```
`Object.assign(CAST.SPECS, {...})` adds `panaka`, `gungan`, `senate`, `csf`, `darsha`, and a second `guard`. `CAST.need` is wrapped so that specs with `gungan`, `lekku` or `helm2` go through `humanX`. `CM.eye` is wrapped so that `'gungan'` renders as `'sith'` (amber).

**Gotchas**
- **`guard` is defined twice.** p15c defines it, then p15d's `Object.assign` replaces it. The p15d version (`headRes 0.0032`, `helmet 'naboo'`, `skin tone 0xc08a68 stubble 0.25`) wins at runtime.
- `helmetGroups2` returns no items for an unknown kind.

---

## 12. p15e_qcast.js: CAST.QC and the Quaternius body

**Purpose.** Puts the cast on the CC0 base bodies: real textured heads with modelled hair, costumes painted in the shader, and garment shells for belts, sashes and tabards.

**API**
```js
CAST.QC[name] = {outfit, female?, top, tabard?, sash?, belt?, low, boots?, bootY?, hair?, hairCol?, browCol?, vest?, glove?, collarShell?, cullHead?, bulk?, sdfHair?}
CAST.useQ(spec)                             // QC entry, or null if !QB.ready or MG.flags.sdf
CAST.qBody(T, spec, qc, key, s, withHead)   // dresses the base body. Sets T.qb, T.clothR, T.grip
QB.hairMat(hex, id, tex) / QB.eyeMat() / QB.refit(geo, from, to)
```
`outfit` is `'jedi'`, `'uniform'` or `'robe'`. It sets the sleeve, torso and leg inflation (`sl`, `tor`, `leg`). `bootY` defaults to 0.42. `T.clothR` is 1.15 for jedi and robe, 1.1 otherwise.

**Real entry:**
```js
quigon: { outfit: 'jedi', top: 0x75664f, tabard: 0x5e4a34, sash: 0x9c8866, belt: 0x3a2416, low: 0x74644c, boots: 0x2e1e14, bootY: 0.46, hair: ['Hair_Long', 'Hair_Beard'], hairCol: 0x5a4636, browCol: 0x4a3626 },
```

**Notes**
- `QB.refit` moves female hair onto the male head. Scale `[1.06, 1.0, 1.04]` for female to male, `[0.94, 1.0, 0.96]` for male to female.
- `sdfHair` (Garyn) adds an SDF hair shell even on a Quaternius body.
- `cullHead` removes the Quaternius head, and the sculpted head is built.
- `female` and `cullHead` are read from **QC** only (p15c:140, 144).
- `QB.dress` runs 160 iterations with Taubin smoothing at build time. Runtime cost is the shell meshes.

---

## 13. p15f_outfits.js: modelled outfits and recolour grades

**Purpose.** Quaternius Modular Fantasy outfits (CC0), baked into `q.bin` as parts such as `Male_Ranger_Body`. The shader repaints them by hue, so a part keeps its stitching, folds and wear.

**Grade format**
```js
grade = { rules: [rule, rule, rule], sat, val, tint }    // up to 3 rules. sat/val/tint apply to the whole part
rule  = { h: sourceHueDeg, w: widthDeg, toH: targetHueDeg /* omit = keep hue */, s: satMul, v: valMul, minS: minSaturation }
```
Defaults: `w` 40, `s` 1, `v` 1, `minS` 0.08.

**Helpers** (local to the `CAST.QO` IIFE, p15f:105 to 111). The real names and signatures are:
```js
g(rules, sat, val, tint)            // grade object. Four parameters, no h/s/l form
toBlue(h, s, v)                     // rule: ranger green (115 deg, width 80) re-hued to h
leatherV(v, s)                      // rule: leather (28 deg, width 45), value v, saturation s
CREAM(s, v)                         // rule: peasant shirt (38 deg, width 30), minS 0.02
R(part, grade, opts)  -> ['ranger', part, grade, opts]
Pz(part, grade, opts) -> ['peasant', part, grade, opts]
```
There is no `R_()`. Source hues are ranger green about 115 deg, ranger leather about 28 deg, peasant brown about 30 deg, peasant shirt about 38 to 40 deg.

**Part opts:** `metal` (1), `ns` (normal strength, 1), `env` (0.85), `sheen` (0.6), `sheenCol` (0x6a6a74), `rough` (1), `hidden`, `grow: [sx, sy, sz, dy, dz]` (scales about the head bone; used for the hood).

**API**
```js
QB.outfitMat(kind, grade, id, opts)          // -> MeshPhysicalMaterial. Not cached
QB.buildOutfit(T, o)                         // o: {bind:'rmale'|'rfemale', s, id, head, tone, glove, tabard, hair, hairCol, browCol, parts}
CAST.qOutfit(T, spec, qc, key, s, withHead)  // CAST.QO[name]; falls back to qBody if absent
CHAR.maulOutfit(T, J, s)                     // Maul: ranger leathers in black
```
`CAST.QO[name] = { tabard?: {col, x0?, x1?}, parts: [[kind, part, grade, opts], ...], glove?, hair?, hairCol?, browCol? }`. `tabard` cuts bands from the `Body` mesh; `x0` and `x1` default to 0.045 and 0.118.

**Real entry (quigon):**
```js
quigon: { tabard: { col: 0x4e3c2a }, parts: jedi(g([leatherV(0.95, 0.85), CREAM(1.3, 0.72)], 0.9, 0.95, 0xfff0dc), g([leatherV(2.1, 0.55)], 0.8, 1.0, 0xfff0e0), g([], 0.7, 0.55)), hair: ['Hair_Long', 'Hair_Beard'], hairCol: 0x5a4636, browCol: 0x4a3626 },
```
`jedi(body, legs, boots)` expands to `Pz('Body', body)`, `Pz('Arms', body)`, `Pz('Legs', legs)`, `R('Feet_Boots', boots)`, `R('Body_Belt_1', g([], 1, 0.8), {metal: 0.6})`.

**Gotchas**
- **Hues are degrees.** Passing 0.61 for 220 turned navy into maroon (kit).
- **`female` and `cullHead` in `CAST.QO` are never read.** Only the `CAST.QC` copies count. `QO.darsha.female` is inert, and so are the `cullHead` flags on the QO entries for csf, senate, gungan, thug, enforcer and tusken.
- `QB.outfitMat` is not cached, so each outfit part gets its own material.
- Tan or cream tops can read as bare skin at distance. Check them with `sc_wardrobe.js`.
- Gloss reads as costume-shop. Lower `metal`, `ns` and `env`, or drop the accessory parts.
- glTF normal maps need `normalScale.y = -1`. `outfitMat` already does this.
- Hoods over horns: `Head_Hood` with `{hidden: true, grow: [1.16, 1.1, 1.14, 0.012, 0.004]}`. `CLOAK.wear` toggles it.

---

## 14. RECIPE: add a new character with a single lightsaber (Rathatri)

The recipe reuses existing entries as far as possible. Values marked "proposed" are starting points, not in-game-verified.

### Step 1. One file, after p15f

Create `parts/p15g_rathatri.js`. It sorts after p15f, so `CAST.SPECS`, `CAST.QC`, `CAST.QO` and `SABER` already exist.

```js
/* Rathatri: single-blade hero */
CAST.SPECS.rathatri = Object.assign({}, CAST.SPECS.obiwan, {
  name: 'rathatri', height: 1.02, shoulders: 1.0, hair: 'short', hairCol: 0x1d1610, eyes: 'brown',
  skin: { tone: 0xc89070, brow: 0x2a1c12, stubble: 0 },                 // proposed
  cloth: (J) => CAST.skirt(J, { len: 0.44, mat: 'robeBrown' }),         // proposed
});
CAST.QC.rathatri = Object.assign({}, CAST.QC.obiwan, { hair: ['Hair_SimpleParted'], hairCol: 0x1d1610, browCol: 0x2a1c12 });
CAST.QO.rathatri = { tabard: { col: 0x3c2e22 },                          // proposed
  parts: CAST.QO.obiwan.parts,                                           // then edit grades (section 13)
  hair: ['Hair_SimpleParted'], hairCol: 0x1d1610, browCol: 0x2a1c12 };
```
`QO` is only used when `QC` exists. Build and check with `WHOS=["rathatri"]` in `tools/sc_wardrobe.js`.

### Step 2. Colour and hilt

```js
SABER.COL.crimson = [0.85, 0.02, 0.05];           // proposed. Luma gives lightK 1.0
SABER.buildBoneHilt = function () {               // TubeGeometry guard; MeshStandardMaterial 0xe6dcc4, roughness 0.45 (proposed)
  const g = new THREE.Group();
  /* build the curved guard and grip meshes into g */
  g.userData = { ends: [0.14], grips: [-0.05, 0.02], len: 0.28 };
  return g;
};
```
The new hilt's `ends` must equal `[0.14]`, the blade positions already built by the default hilt.

### Step 3. Template and saber

```js
await CAST.need(['rathatri']);                    // -> CHAR.T.rathatri
const S = new Saber('single', 'crimson', { len: 0.92, prio: 5 });
S.group.remove(S.hilt); S.hilt = SABER.buildBoneHilt(); S.group.add(S.hilt);
S.addTo(R.scene); S.ignite(undefined, true); S.ign = [1];
```
`kind` `'single'` takes the default hilt branch, which is then replaced. Use `setProp(S, false)`, not `true`, because a single blade must not use the staff's end-flip logic.

### Step 4. Moveset `MOV.rathatri`

Copy Maul's structure and change the keys to one-handed (`g: 'R'`, free left hand). Keep `guard`, `idleCalm`, `run`, `block`, `blockHi`, `deflectL`, `deflectR`, `push`, `grip`, `throwWait`, `dodge`, `backflip`, `flip`, `jump`, `land`, `plunge`, `hit`, `knock`, `death`, `exec`, `kick`, `flourish` from `MOV.maul`. `MOV.maul.knock` and `MOV.maul.death` can be shared.

The five-hit combo (proposed mapping, tuned from `node tools/clipstats.js`):

| move | clip | clip t0-t1 | rate | dur (computed) | hit window (clip s) | cancel (clip s) | dmg |
|---|---|---|---|---|---|---|---|
| a1 | Sword_Regular_A | 0.00-0.43 | 1.4 | 0.307 | 0.17-0.30 (peak 26.4) | 0.31 | 18 |
| a2 | Sword_Regular_B | 0.00-0.53 | 1.4 | 0.379 | 0.17-0.33 (peak 27.9) | 0.34 | 18 |
| a3 | Sword_Regular_C | 0.00-0.90 | 1.3 | 0.692 | 0.45-0.80 (peak at 0.63; clipstats window 0.03-0.77) | 0.84 | 14 |
| a4 | keyed, as Maul's a4 | | | | | | 16 |
| a5 | keyed, as Maul's a5 with `impact` | | | | | | 34 |
| lunge | Sword_Dash | 0.00-0.90 | 1.15 | 0.783 | 0.18-0.42 (peak 27.4 at 0.20-0.40) | 0.66 | 26 |
| heavy | keyed, or Sword_Heavy_Combo | | | | windows 0.33-0.60 (33.8) and 0.90-1.33 (20.2) | | 14 / 24 |

Convert each clip window to move time with `tc(t) = (t - t0) / rate`. Clip windows come from `clipstats` and are not hand-tuned yet; verify with `tools/sc_mv.js` and `tools/sc_jank.js`.

Keyed fallback (used when mocap is off) is plain `MOV.rathatri.a1 = { dur, next: 'a2', cancel, ev, move, keys }`, with ev and cancel in move seconds. Set `next` for each hit: a1 to a2, a2 to a3, a3 to a4, a4 to a5, a5 to `null`. The combo runs through `PLAYER.comboQ`.

Compile the new set explicitly, because `MOV.init` compiles only the five named sets:
```js
for (const k in MOV.rathatri) ANIM.compile(MOV.rathatri[k], ANIM.basePose);   // after MOV.init()
```

### Step 5. Mocap for the new set

```js
MOCAP.SETS.rathatri = { base: { guard: 'Sword_Idle', run: 'Sword_Idle', idleCalm: 'Idle_Loop' }, arms: true, stance: 0.55, upright: 0.8 };  // proposed
```
Then route the set. `MOCAP.state` matches `a.moves` by identity (p13b:68), so the minimal change is one branch added to that chain: `a.moves === MOV.rathatri ? 'rathatri' :`.

`clipMove` is a closure inside `moveSpecs` and cannot be called from a later part. Either move it to `MOCAP.clipMove` in p13b (a small refactor), or copy its six lines into p15g and call it from a wrapper around `MOCAP.moveSpecs`. Use the table in Step 4 for the calls. `twoHand` stays 0, so the free left arm follows the clip, and `oR: 0` keeps the grip at the hilt centre.

### Step 6. Wire the player

`PLAYER` is hard-coded to Maul. Three edits are needed:

- **p18:10**: `new Actor(CHAR.T.maul, {..., moves: MOV.maul, ...})` uses Maul's template and moves. Use `CHAR.T.rathatri` and `MOV.rathatri`.
- **p18:12**: `new Saber('staff', 'red', {prio: 5})` and `a.setProp(S, true)`. Use `new Saber('single', 'crimson', {prio: 5})` and `setProp(S, false)`.
- **p18:161**: `a.actClip = MOV.maul.block`. This hard-coded reference would give Rathatri Maul's block clip. Use `MOV.rathatri.block`.
- **p18:350**: `MOV.maul.blockDyn = clip` is runtime-only and Maul-only. Replace it with `MOV.rathatri.blockDyn`, or keep the procedural block off.
- **p18:85**: `PLAYER.saber.lightK = 1` every frame. Remove it or make it conditional, so the blade light dims for green, blue or yellow.

### Step 7. Preview, preload and verify

- Preload with `LEVEL.def(id, {cast: ['rathatri']})` (p24).
- Preview with `?cast=rathatri`. The viewer (p90_main.js:35) gives a Saber only to `quigon`, `obiwan` and `darsha`, by name. Other names get a blaster. Add `rathatri` to that test, or it will hold a rifle.
- Check with `tools/sc_wardrobe.js` (cast lineup), `tools/sc_look.js` (faces, hands), `tools/sc_mv.js` with `MV=a1` (blade path and arm pop), and `tools/sc_jank.js` (masher against guards).

### Checklist

- [ ] `CAST.SPECS`, `CAST.QC` and `CAST.QO` entries all share the name `rathatri`. QO is ignored without QC.
- [ ] Colour key exists in `SABER.COL`. A typo silently gives red.
- [ ] Hilt `userData.ends` is `[0.14]` and `setProp(S, false)` is used.
- [ ] `MOV.init` or a manual compile covers `MOV.rathatri`.
- [ ] `MOCAP.SETS.rathatri` exists and `MOCAP.state` routes to it. Otherwise no mocap runs, with no error.
- [ ] `MOV.rathatri.block` is referenced in place of `MOV.maul.block`.
- [ ] Clip-backed move names match the clip list exactly. Misspellings are silent.
