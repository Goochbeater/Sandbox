# Animation and combat

There are three layers, blended every frame inside `ANIM.apply` (p13_anim.js):

1. **Keyframed pose** (p14 `MOV.*`). This mainly places the **weapon**: the hilt centre `h` in body space, the blade
   direction `a`, and which hands grip it (`g`). The arms reach for it with two-bone IK and the legs plant on stance feet.
2. **Mocap** (p13b `MOCAP`). Quaternius UAL clips drive the trunk and legs (locomotion blend) and, in `'full'` moves,
   the whole body including the weapon arm.
3. **Physics extras**: lean from acceleration and turning, flinches, footfall, cloth, and ragdoll on death (p17b).

## Logical rig (19 bones; the Q render skeleton of 65 bones is driven from it by QB.drive)
`0 root/pelvis · 1 spine · 2 chest · 3 neck · 4 head · 5 clavL 6 uarmL 7 farmL 8 handL · 9 clavR 10 uarmR 11 farmR 12 handR · 13 thighL 14 shinL 15 footL · 16 thighR 17 shinR 18 footR`
(+X is the character's LEFT; +Z is forward.)

## Baked clips (UAL1 + UAL2)
Locomotion: `Walk_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop` (ground speeds 1.0 / 3.4 / 5.8 m/s, phase-synced), `Walk_Formal_Loop`,
`Crouch_Fwd_Loop`, `Slide_*`, `Roll`, `Jump_Start/Loop/Land`, `NinjaJump_*`, `ClimbUp_1m`.

Idles: `Idle_Loop`, `Idle_Talking_Loop`, `Idle_FoldArms_Loop`, `Sword_Idle`, `Pistol_Idle_Loop`, `Spell_Simple_Idle_Loop`,
`Sitting_Idle_Loop`, `Crouch_Idle_Loop`, `Driving_Loop`, `Idle_Shield_Loop`.

Melee: `Sword_Attack`, `Sword_Regular_A/B/C` (+ `_Rec`), `Sword_Regular_Combo`, `Sword_Heavy_Combo`, `Sword_Dash`,
`Sword_Block`, `Punch_Jab`, `Punch_Cross`, `Melee_Hook` (+ `_Rec`), `Shield_Dash`, `OverhandThrow`, `Push_Loop`.

Ranged/other: `Pistol_Aim_*`, `Pistol_Shoot`, `Pistol_Reload`, `Spell_Simple_*`, `Interact`, `Fixing_Kneeling`.

Reactions: `Hit_Chest`, `Hit_Head`, `Hit_Knockback`, `LayToIdle`, `Death01`, `Idle_Shield_Break`.

Clips are stored as per-bone world rotation deltas from the bind pose, so they retarget onto any body on the same
skeleton, male or female. Run `node tools/clipstats.js` to get each clip's ground speed and its **hand-speed peaks**.
Those peaks are where hit windows belong.

## Mocap sets (`MOCAP.SETS`)
```js
maul: { base: { guard: 'Sword_Idle', run: 'Sword_Idle', idleCalm: 'Idle_Loop' }, arms: true, stance: 0.5, upright: 0.86 },
jedi: { base: { guard: 'Sword_Idle', run: 'Sword_Idle' }, arms: true, stance: 0.55, upright: 0.4 },
trooper: { base: { idle: 'Idle_Loop', run: 'Idle_Loop', aim: 'Pistol_Idle_Loop' }, arms: true },
```
- **`stance`** keeps 45–60 % of a clip's crouch (sword clips squat 35–45 cm); the legs are re-planted by IK.
- **`upright`** removes part of the pelvis/spine forward tilt. Around 0.86 is good for a proud hero, and it stops the hunch.
- **`arms`:** free arms follow the clip. Arms holding the weapon stay on the prop IK.

## Clip-backed moves (`clipMove` in `MOCAP.moveSpecs`)
```js
clipMove(M, 'a1', 'Sword_Regular_Combo', 0.0, 0.46, 1.4, {       // set, move, clip, clipT0, clipT1, playback rate
  ev: [[0.14, 0.32, 3, 18, 'slash']],   // hit windows in CLIP time: [t0, t1, bladeMask, damage, kind]
  cancel: 0.33,                          // earliest chain/cancel, clip time — put it right after the last hit window
  move: [[0.06, 0], [0.28, 0.55]],       // root motion (clip time, metres forward)
  twoHand: 1, oR: 0 });                  // off hand on the weapon; grip offset along the hilt
```
A move needs a keyframed stub in p14 as well (`MOV.maul.a1 = { dur, next, cancel, ev, move, keys: [...] }`). The clip
replaces the pose, but `next` (the combo chain) stays. `put(set, name, { seq: [seg(clip, t0, t1, dur)...], mode })` builds
multi-segment moves: `mode: 'full'` is the whole body, `'body'` means the weapon arms stay on IK. Reactions and deaths
use `put`. Knock-downs chain `Hit_Knockback` → `LayToIdle`.

Jedi strikes are built with **slowed wind-up segments** so the player can read the telegraph. Readable enemies beat
fast enemies.

## Keyframed moves (p14)
`K(t, h, a, x)`:
- `h`: hilt centre in body space (m).
- `a`: blade direction.
- `x` fields:
  - `g: 'both'|'L'|'R'|'none'`, plus `oL`/`oR` grip offsets along the hilt;
  - `st` stance name, `tw` torso twist, `headYaw`, `cr` crouch, `pi` pitch, `le` lean;
  - `flip`/`roll`/`off` for acrobatics, and `ease`.

`MOV.spin(t0, t1, n, fn)` generates spin keys. Keyframes are the right tool for signature moves with no mocap
equivalent: the staff spin, the leaping slam, flourishes.

## Weapon grip (the part that made arms look "twisted")
The per-hand logic sits in the `arms` loop of ANIM.apply, and in MOCAP.arms for full-mode moves:
- **Grip centre:** `SCULPT.fistFrame` gives C = wrist + 7.8 cm along the hand. Verify it on the rendered hand with
  `tools/sc_fist.js`. The fist centre is the centroid of the `q_{index,middle,ring,pinky}_0x` joints, and it should be
  under 2 cm from the weapon axis.
- **Which end of a symmetric staff a hand faces:** decide it from the **body frame**
  (`axis · body(0, 1, 0.35)`), with hysteresis, and **lock it while an action plays** (`inst.inAct`). Deciding it from the
  forearm (the IK's own output) flips every frame.
- **Wrist smoothing:** only during a re-grip, and applied **before** the arm IK. Applied after the IK, it pulls the fist off the weapon.
- **Elbow continuity:** blend the pole with last frame's elbow side (`inst._ep`), or the elbow snaps across when the wrist
  passes in line with the shoulder.
- **Fitting the hilt:** three passes pull the hilt into both fists, so a reach-limited hand still closes on it.
- **Titles and cutscenes:** dim the saber's light on the costume (`saber.lightK ≈ 0.4`), or the robes turn the blade's colour.

## Combat feel numbers that tested well
- **Attack blend-in:** 0.12 s from idle, 0.09 s when chaining, 0.16 s for the lunge. Shorter than 0.08 s pops the arms up to 70°.
- **Playback:** light combo clips at 1.3–1.4×; lunge at 1.15× (faster whips the saber 80–90° per frame).
- **Cancels:** chain right after the hit window. **Dodge cancels any attack after 0.1 s**; this is the biggest
  "not clunky" win. Input is buffered 0.5 s (`IN.peek`), so presses during a swing chain.
- **Facing:** turn toward the chosen target with a damped yaw (26/s) instead of a one-frame snap. Small corrections (< 0.5 rad) can snap.
- **Targeting (PLAYER.chooseTarget):** lock → input direction → current focus → nearest within 6.2 m. `a1` at a foe more than
  3.4 m away becomes the dash lunge, and root motion closes the gap to about 1.1 m ("magnetism").
- **Hit-stop:** 0.06–0.07 s for light hits, 0.11 s for slams/thrusts, plus camera shake 0.15–0.3 and spark + impact FX. Boss
  executions are capped at 15 % of max HP, or duels end in one move.
- **Reactions:** directional flinches (`hitL`/`hitR`), heavy hits knock down, and deaths use the ragdoll
  (`RAG.start(actor, dir, force, hitPoint)`: 20 verlet particles, torso braces, ground friction).

## Measuring
- `tools/sc_jank.js`: masher vs guards. Prints the worst per-frame bone rotation with the act transition, and click → swing latency.
- `tools/sc_mv.js` (`MV=<move>`): per-frame hilt axis change and arm bone deltas for one move. It tells you whether a pop comes from the weapon path or from the IK.
- `tools/sc_bend.js` / `sc_ikdbg.js`: wrist bend angles, the fist-to-hilt miss, and IK reach per hand (uses the `window.__ikdbg` hook).
