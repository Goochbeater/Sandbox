# B. Rig, body and character construction

Covers `parts/p06_maulhead.js`, `p06b_maulbake.js`, `p07_rig.js`, `p07b_qrig.js`, `p08_charmat.js`, `p09_body.js`, `p10_chars.js` and `p10b_qbody.js`. Written from a read of the source (read-only; nothing modified). Units are metres unless marked. The sculpted Maul head uses head space, where 1 unit = 10 cm. Asset counts come from a node script over `assets/q.json`. Nothing was run in a browser.

---

## 0. How the pieces connect

```
assets/q.bin + q.json  --build.sh embeds as #qbin / #qjson-->  QB.load()                 [p07b]
  QB.bind, QB.geometry, QB.joints, QB.sample
  QB.dress / QB.cull / QB.shell / QB.costume / QB.shellMat  -> T.qb = {key, s, parts}    [p10b]
MH.bake (GPU SDF head -> surface nets -> projection, normals, AO)                        [p06, p06b]
SCULPT.humanoid -> SCULPT.mesh -> CHAR.groupByMat -> T.parts   (SDF fallback body)       [p09, p10]
RIG.def / RIG.weights / RIG.makeBones -> 19 logical bones, A-pose, identity rest         [p07]
CharInst(T) -> root > holder > inner > 19 bones + one SkinnedMesh per T.parts
            -> QB.attach: 65-bone render skeleton under inner (when T.qb is set)         [p10, p10b]
per frame:  animation sets the 19 logical bones, then QB.drive(inst) copies them to the 65 render bones
```

Load order: `build.sh` concatenates `parts/*.js` in sorted order. Top-level code here is only literals, `RIG.B`, `CM` (which makes THREE.Colors, so three.js loads first) and `QB` helpers. Builders run later, so references to `CLOTH`, `CLOAK`, `CAST`, `SDF`, `MESH`, `MG` and `R` resolve as long as their part loads before the call.

---

## 1. p06_maulhead.js: the sculpted Zabrak head as GLSL

**Purpose.** Holds the Maul head as GLSL text: signed-distance functions for skull, face, lids, mouth, ear, nose and horns, plus the make-up. Nothing draws by itself. `MH.bake` (p06b) compiles it, and `CM.maulSkin` (p08) reuses `makeup()` per pixel.

**Public API.**

```js
MH.COMMON : string   // GLSL helpers: sat, sq, rot(a)->mat2, smin, smax, sdEllipsoid, sdCapsule, sdBox, sdRoundCone, vnoise
MH.UNI    : string   // uniform vec4 uFace; uniform vec4 uHorn[10]; uniform vec4 uHornD[10];
MH.SDF    : string   // consts HP, EYE_C, EYE_R; globals gWant, gMat, gHornIdx, gMouth, gLidEdge;
                     // sdHeadStatic, applyEye, applyMouth, sdHorn(p,i), sdHorns(p), jawSpace, sdLids, sdNose, sdEar
MH.PAINT  : string   // float makeup(vec3 p0, vec3 n) -> 0..1 redness (n unused); paintFace(vec2); paintTop(vec2)
MH.HP     : [0, -0.78, -0.32]        // head pivot (atlas joint), head space
MH.EYE_C  : [0.315, 0, 0.675]        // +x eye centre; radius MH.EYE_R = 0.12 (1.2 cm)
MH.FACE   : [1.0, 0.62, 0.0, 0.0]    // default uFace
MH.HORN_SPEC : 10 rows [azimuthDeg, polarDeg, length, baseRadius]
MH.horns() : { pos: Float32Array(40), dir: Float32Array(40) }   // per horn: base xyz + length; axis xyz + base radius
MH.uniforms(hs) : { uFace, uHorn, uHornD }                       // THREE uniform objects
```

`uFace` components, as the GLSL uses them: `x` eye opening (1 open; lids mix -0.40 to 0.2), `y` brow furrow, `z` snarl (upper lip lift), `w` jaw open (jaw rotates by w*0.20 rad).

Horn table (`HORN_SPEC`, Maul). Azimuth 0 is front (+z). Polar is from the crown.

| index | az (deg) | polar | length | base r | note |
|---|---|---|---|---|---|
| 0 | 0 | 49 | 0.26 | 0.094 | centre front |
| 1, 2 | +33, -33 | 52 | 0.30 | 0.10 | |
| 3, 4 | +77, -77 | 56 | 0.29 | 0.10 | |
| 5, 6 | +138, -138 | 46 | 0.30 | 0.10 | rear pair |
| 7 | 180 | 16 | 0.42 | 0.115 | longest, up and back |
| 8, 9 | +62, -62 | 80 | 0.21 | 0.085 | low side pair |

**Hooks.** `gWant` (GLSL bool) turns on the material side-channels; the bake leaves it off. Edit `paintFace` and `paintTop` for make-up. For horns, edit `HORN_SPEC`; the GLSL loops are fixed at 10.

**Performance.** No CPU cost at runtime. In the fragment shader `makeup()` is the heavy part: about 40 SDF primitives (several Beziers with cubic solves), 4 `vnoise` calls and a 10-horn loop, per face pixel.

**Gotchas.**
- The GLSL lives in JS template strings. `build.sh` runs `tools/glslcheck.py` on the parts, but many errors only surface when the bake runs.
- The cranium is written twice: GLSL in `sdHeadStatic` and JS `cran()` in `MH.horns()` (p06b). Change both or the horn roots drift off the skull.
- `HP` and `EYE_C` are also declared in `CM.maulSkin`'s shader (p08). Keep them in sync.
- `uFace` is the expression, but its uniform object is a closure inside `CM.maulSkin`. Nothing can change it at runtime (section 5).

---

## 2. p06b_maulbake.js: baking the head to a mesh

**Purpose.** Turns the p06 GLSL into a mesh, once, on the GPU. Then it projects vertices onto the surface and bakes normal, horn weight and ambient occlusion.

**Public API.**

```js
MH.bake(voxel = 0.016) : Promise<MH.mesh>
// MH.mesh = { pos: Float32Array(3nv) head space, nrm, idx, nv,
//             horn: Float32Array(nv) 0..1, ao: Float32Array(nv),
//             stats: { nv, nt, dims: [nx,ny,nz], ms, bake, nets } }
// also sets MH.hs (horn data) and MH.mesh
MH.MAP : string   // float mapHead(vec3 p): skull + eyes + mouth + neck (sdRoundCone from y = -2.35)
                  // + a throat ellipsoid at y = -1.42, smin-blended
```

**Pipeline.**
1. Bounds `[-0.95, -2.2, -1.2]` to `[0.95, 1.2, 1.28]`, grown to include each horn tip.
2. Grid of `ceil(extent / voxel)` cells per axis; `at()` returns 1 (outside) past the last slice.
3. GPU: `mapHead` is sampled at every grid point into a float RGBA target. Each texel holds 4 z-slices, packed into a 4096-wide atlas.
4. CPU readback, then `MESH.netsGrid` (surface nets) and `MESH.largest(m, 1500)` (p05).
5. Three per-vertex GPU passes on a 1024-wide texture. Mode 0 projects each vertex twice onto the zero set, and the projection is used only if it moved less than 1.5 voxels. Mode 1 writes the normal and horn weight. Mode 2 writes AO (6 samples along the normal, 0.015 to 0.265) and cavity.

**Hooks.** The `voxel` argument. `buildMaul` passes `MG.flags.hv || 0.0185`. `MG.yield()` between stages keeps the loader moving.

**Performance.** One-time, at boot. The GPU bake dominates: every grid point evaluates the full head SDF. Grid cells grow with 1/voxel^3, and the atlas height is not checked against the GPU texture limit. `stats.bake` and `stats.nets` give the split.

**Gotchas.**
- Needs a live `R.renderer` and float render targets. Without float colour buffers the readback is wrong or the bake throws.
- `MH.bake` overwrites `MH.mesh` and `MH.hs` on every call. `CM.maulSkin` caches the first `MH.hs` it sees. `buildMaul` runs once per boot (p90 calls it from `MG.view` or from the main path, never both), so this only matters in a harness.
- Call `MH.bake` before `CM.maulSkin()`, which reads `MH.hs` and throws if it is missing.
- The neck is baked too. The box cuts it at y = -2.2, about 14 to 15 cm below the head joint. `CHAR.headWeights` gives it to the neck and chest bones, and the collar covers it.
- A failed projection falls back silently to the net vertex.

---

## 3. p07_rig.js: the logical 19-bone rig, weights and two-bone IK

**Purpose.** One humanoid skeleton that all gameplay code drives (saber hand, IK, animation). It is always 19 bones in A-pose with identity rest rotation, so a bone's local quaternion is its rotation from rest. Quaternius bodies copy these 19 bones each frame (`QB.drive`, p10b). Sculpted bodies skin to them directly.

**Units and axes.** Metres, +Y up, character faces +Z, +X = character's left. `V.mx` mirrors x.

**Bone table.**

| i | name | parent | Quaternius joint it drives (`QB.MAP`) | spans at rest (`RIG.J0`, 1.0 scale) |
|---|---|---|---|---|
| 0 | root | - | pelvis | pelvis (y 0.98) to spine (1.10) |
| 1 | spine | root | spine_02 | to chest |
| 2 | chest | spine | spine_03 | chest (1.28) to neck |
| 3 | neck | chest | neck_01 | neck (1.485) to head |
| 4 | head | neck | Head | head (1.585) to headTop (1.80) |
| 5 to 8 | clavL, uarmL, farmL, handL | chest, then 5, 6, 7 | clavicle_l, upperarm_l, lowerarm_l, hand_l | shoulder 1.445, elbow 1.226, wrist 1.014 |
| 9 to 12 | clavR, uarmR, farmR, handR | chest, then 9, 10, 11 | clavicle_r, upperarm_r, lowerarm_r, hand_r | mirror of 5 to 8 |
| 13 to 15 | thighL, shinL, footL | root, then 13, 14 | thigh_l, calf_l, foot_l | hip 0.935, knee 0.515, ankle 0.087 |
| 16 to 18 | thighR, shinR, footR | root, then 16, 17 | thigh_r, calf_r, foot_r | mirror of 13 to 15 |

Fingers are not logical bones. Quaternius finger joints come from grip shapes or mocap (`QB.drive`). `spine_01` is blended 55 % from root toward spine_02. Toes follow the foot.

**Public API.**

```js
RIG.NAMES : string[19]    RIG.PARENT : int[19]    RIG.B : {name: index}    RIG.J0 : {name: [x,y,z]}
RIG.joints(sc?: {height=1, shoulders=1}) : J
   // every coordinate * height; x of clav, shoulder, elbow, wrist, fist also * shoulders
RIG.def(J) : [{i, name, parent, head, tail, len}] x 19
RIG.weights(bones, pos: Float32Array, n, opt?) : {idx: Uint16Array(4n), wts: Float32Array(4n)}
   // opt.allow: bool[19]; opt.bias(i,x,y,z) -> number; opt.forced(x,y,z,v) -> [[bone,w],...] | null; opt.pow = 5
RIG.makeBones(def) : THREE.Bone[19]       // bones[0] at the pelvis; userData.rest kept
IK.basisQ(restDir, restUp, dir, up, out) : Quaternion
IK.setWorldQ(bone, qWorld)                // sets bone.quaternion from a world rotation; updates world matrix
IK.twoBone(A, B, S, T, P, rd, out) : out  // rd = {la, lb, dirA, upA, dirB, upB}; out = {elbow, end, qA, qB}
```

`RIG.J0` at 1.0 scale: pelvis (0, 0.98, 0), spine (0, 1.10, -0.012), chest (0, 1.28, -0.02), neck (0, 1.485, -0.028), head (0, 1.585, -0.015), headTop (0, 1.80, 0), clav (0.025, 1.452, 0), shoulder (0.176, 1.445, -0.03), elbow (0.356, 1.226, -0.032), wrist (0.494, 1.014, -0.01), fist (0.531, 0.953, -0.006), hip (0.094, 0.935, 0), knee (0.104, 0.515, 0.016), ankle (0.11, 0.087, -0.022), toe (0.118, 0.018, 0.135). A Quaternius body has different values (its head joint is at y 1.600), so use `QB.joints` for those.

`RIG.weights` takes the nearest bone segment, its parent and its children as candidates. Chest also adds bones 6 and 10, and root adds 13 and 16. Each candidate gets weight `1/d^pow`, then the top 4 are kept and normalised. `IK.twoBone` clamps the target distance to `[|la-lb|*1.02, (la+lb)*0.9995]`.

**Example** (the call the sculpted body uses, p10):

```js
const J = RIG.joints({ height: 1.07, shoulders: 1.04 });
const def = RIG.def(J), bones = RIG.makeBones(def);
const W = RIG.weights(def, B.pos, B.nv, { allow: def.map(b => b.i !== 4) });   // body never skins to the head bone
```

**Hooks.** `bias` and `forced` for per-vertex control. The pole argument of `IK.twoBone` picks the bend side.

**Performance.** Template time only. `IK.setWorldQ` updates the bone's world matrix on each call. IK uses shared scratch vectors (`IK._a` to `IK._e`, `IK._t`, and `_v1` to `_v5` from p00), so IK calls must not nest.

**Gotchas.**
- `RIG.joints` scales x by `shoulders` only for clav, shoulder, elbow, wrist and fist. A joint you add scales x by height alone.
- `root` is the pelvis, not the actor origin. The feet-origin offset comes from `CharInst`'s holder and inner pair.
- `allow` removes candidates. A disallowed bone gets zero weight and its neighbours still take the vertex.
- The candidate expansion is hard-wired to this tree (`best === 2` and `best === 0`). A different tree needs those lines changed.
- Default `pow = 5` gives sharp joins. Lower it for soft cloth skinning.

---

## 4. p07b_qrig.js: the Quaternius loader (QB core)

**Purpose.** Loads the baked CC0 bodies, clips and textures. `build.sh` embeds `assets/q.json` as `#qjson`, `assets/q.bin` (base64) as `#qbin`, and every `assets/*.jpg` as `#tex_<name>`.

**Public API.**

```js
QB.load() : Promise<boolean>           // sets QB.ready, QB.M, QB.buf, QB.NB (65), QB.idx (name->index),
                                       // QB.clips[name] = {Dq, Pp, fps: 30, nf, dur, speed, pelvisH}
                                       // false (and not ready) if either element is missing
QB.arr({t, o, n}) : TypedArray         // view into the bin
QB.texture(name, srgb) : Promise<THREE.Texture | null>    // cached per name:s|l; null if absent
QB.bind(key) : {wr, wt, lr, lt, ibm}   // world and local pose per joint; inverse bind (65*16 floats)
                                       // keys: 'male', 'female', 'rmale', 'rfemale'
QB.geometry(key, filter?) : {geo, mats: string[], names: string[]}
                                       // one group per kept primitive; materialIndex indexes mats (material NAMES, e.g. "MI_Ranger")
QB.sample(clip, t, loop, out, pel?) : out     // out: Float32Array(65*4) xyzw; slerp at t*fps; loop wraps by nf-1
QB.MAP : 19 joint names (section 3)
QB.joints(key, s) : J                  // bind-pose joints * s; same keys as RIG.joints, plus headTop and fist
```

**Inventory** (`assets/q.json` 128,890 bytes; `q.bin` 5,474,608 bytes).

Skeleton: **65 joints**. Spine and head: `root pelvis spine_01 spine_02 spine_03 neck_01 Head`. Each arm: `clavicle_x upperarm_x lowerarm_x hand_x`, then 20 finger joints per hand (`index`, `middle`, `pinky`, `ring`, `thumb`, each `_01` to `_04_leaf`). Legs: `thigh_x calf_x foot_x ball_x ball_leaf_x`. `x` is `l` or `r`.

Meshes:

| key | prims | tris | bind | contents |
|---|---|---|---|---|
| `male` | 3 | 14,318 | own | `Face` (MI_Hair_1: male brows), `Face.001` (MI_Eyes), `Sphere.005_Retopology.004` (MI_Superhero_Male, body and head) |
| `female` | 3 | 15,060 | own | `Eyebrows` (MI_Hair_2), `Eyes`, `Superhero_Female` |
| `Hair_Long`, `Hair_Buns`, `Hair_BuzzedFemale`, `Eyebrows_Female` | 1 each | 2,906 / 3,284 / 830 / 1,480 | head (refit for female) | MI_Hair_2 or MI_Hair_1 |
| `Hair_Beard`, `Hair_SimpleParted`, `Hair_Buzzed`, `Eyebrows_Regular` | 1 each | 1,034 / 1,301 / 830 / 984 | head | MI_Hair_1 |
| `rmale`, `rfemale` | **0** | 0 | own | bind pose only: no body mesh |
| `rm_ranger` | 10 | 26,982 | rmale | outfit parts |
| `rm_peasant` | 5 | 12,894 | rmale | outfit parts |
| `rf_ranger` | 10 | 26,966 | rfemale | outfit parts |
| `rf_peasant` | 4 | 13,568 | rfemale | outfit parts |

Outfit primitive names, as `QB.buildOutfit` matches them exactly:
- Male ranger: `Male_Ranger_Acc_Pauldron`, `_Arms` (two prims: MI_Ranger and MI_Regular_Male bare arms), `_Arms_Bracer`, `_Body`, `_Body_Belt_1` (a second prim `…_Belt_1.001`), `_Feet_Boots`, `_Head_Hood`, `_Legs`.
- Male peasant: `Male_Peasant_Arms` (two prims, as above), `_Body`, `_Feet`, `_Legs`.
- Female ranger: `Female_Ranger_Acc_Pauldrons`, `_Arms` (two), `_Arms_Bracer`, `_Body`, `_Body_Belt_1`, `_Body_Belt_2`, `_Feet`, `_Head_Hood`, `_Legs`.
- Female peasant: `Female_Peasant_Arms`, `_Body`, `_Feet`, `_Legs`.

Clips (**60**): `A_TPose, Idle_Loop, Idle_Talking_Loop, Idle_FoldArms_Loop, Idle_Shield_Loop, Idle_Shield_Break, Walk_Loop, Walk_Formal_Loop, Jog_Fwd_Loop, Sprint_Loop, Crouch_Idle_Loop, Crouch_Fwd_Loop, Sitting_Idle_Loop, Jump_Start, Jump_Loop, Jump_Land, NinjaJump_Start, NinjaJump_Idle_Loop, NinjaJump_Land, ClimbUp_1m, Driving_Loop, Fixing_Kneeling, Interact, LayToIdle, Roll, Slide_Start, Slide_Loop, Slide_Exit, Push_Loop, Death01, Hit_Chest, Hit_Head, Hit_Knockback, Punch_Jab, Punch_Cross, Melee_Hook, Melee_Hook_Rec, OverhandThrow, Pistol_Idle_Loop, Pistol_Aim_Neutral, Pistol_Aim_Up, Pistol_Aim_Down, Pistol_Shoot, Pistol_Reload, Spell_Simple_Enter, Spell_Simple_Idle_Loop, Spell_Simple_Shoot, Spell_Simple_Exit, Sword_Idle, Sword_Attack, Sword_Block, Sword_Dash, Sword_Heavy_Combo, Sword_Regular_A, Sword_Regular_A_Rec, Sword_Regular_B, Sword_Regular_B_Rec, Sword_Regular_C, Sword_Regular_Combo, Shield_Dash`

**Hooks.** `filter` on `QB.geometry`; the texture cache; the `s` argument of `QB.joints` (Maul uses 0.985).

**Performance.** `QB.bind` returns views. `QB.geometry` copies every array, so call it once per part. `QB.load` decodes the 5.5 MB bin from base64 once.

**Gotchas.**
- **`rmale` and `rfemale` have no primitives.** `QB.geometry('rmale')` is empty. The regular body exists only as outfit parts, whose bare arms and hands use `MI_Regular_*`.
- **(Verified OK by the lead)** `rmale_col/nrm` and `rfemale_col/nrm` ARE present in `assets/` and are embedded by `build.sh` as `tex_rmale_col` etc. An earlier note here claiming they were missing was wrong.
- **Exact-name matching.** The second `Male_Ranger_Body_Belt_1` (`.001`) is never selected. Both `_Arms` prims are selected, which is what you want.
- Clips are per-joint world deltas `D = W_anim * W_bind^-1` (per the file header), so one clip retargets to any body. `QB.texture` returns null silently when the element is absent.
- Typed-array views need aligned byte offsets. A bad offset throws at load.

**Recipes.**

```bash
node -e 'const M=JSON.parse(require("fs").readFileSync("assets/q.json","utf8")); for (const k in M.meshes) for (const p of (M.meshes[k].prims||[])) console.log(k, p.name, p.mat)'
```

```js
const { geo, mats } = QB.geometry('rm_ranger', (p) => p.name === 'Male_Ranger_Body');   // one part, as buildOutfit does
```

---

## 5. p08_charmat.js: character materials, fill and rim

**Purpose.** Shared character shading: the camera-side fill and rim light (`CM.FILL`), the Maul skin and horn shader, skinned cloth with a woven bump, leather, plain and eye materials. Each is an `onBeforeCompile` patch on a three.js material, so lighting and shadows still apply.

**Public API.**

```js
CM.fillU : THREE.Color (0.36, 0.35, 0.34)     // shared uniform
CM.rimU  : THREE.Color (0.55, 0.48, 0.42)     // shared uniform, set per world by the level code
CM.cache : {}
CM.FILL  : string                             // GLSL block, spliced after #include <aomap_fragment>
CM.rimHook(sh)                                // declares uniform vec3 uRim, binds CM.rimU
CM.maulSkin() : MeshStandardMaterial          // cached singleton; needs MH.hs
CM.withAO(m, key, weave?) : m                 // aAO per vertex + CM.FILL; weave adds CM.CLOTH_BUMP
CM.cloth(hex, sheenHex, rough = 0.86, key, weave?) : MeshPhysicalMaterial    // sheen 1.0, sheenRoughness 0.45
CM.leather(hex, rough = 0.42, key)  : MeshPhysicalMaterial                    // clearcoat 0.25
CM.plain(hex, rough, metal = 0, key, emis?) : MeshStandardMaterial
CM.eye(type) : MeshPhysicalMaterial           // 'sith' (amber, clearcoat 1.0); 'blue'; anything else = brown (clearcoat 0.7)
```

`CM.cloth`'s `weave` argument is ignored: `withAO` is always called with weave on.

**Fill and rim, as coded.** `normal` is view-space in three.js fragment code, so the fill direction `(-0.5, 0.55, 0.75)` follows the camera. Diffuse fill: `diffuse * uFill * (0.8 * max(n·f, 0) + 0.2)`. Rim: `uRim * pow(1 - sat(n·v), 3.2) * (0.3 + 0.7 * sat(0.6 n.y + 0.55))` into `directSpecular`, with `v` toward the camera. `withAO` adds a cloth rim with `pow(…, 3.5)` into `indirectSpecular`.

**Black cloth.** The kit (`characters.md`) says black cloth needs sRGB albedo of at least 0x13 and a narrow rim, or it greys out edge-on. In this code the defence is the physical sheen, whose colour is lighter than the albedo (Maul's tunic: albedo 0x222228, sheen 0x4a4a58), the fill light, and the weave bump. p11's `CLOTH.mat` scales the rim by 0.55 for panel cloth.

**Maul skin.** `makeup(vHead, 0)` gives redness with two-tone noise. Skin is near-black `(0.012, 0.009, 0.009)` mixed toward red `(0.50, 0.018, 0.012)`. Horns are bone-coloured with a base-to-tip gradient (`hornT`). Roughness runs 0.36 to 0.52 on paint and 0.5 on horns. Attributes: `aHead`, `aHorn`, `aAO`.

**Eyes.** `CM.eye` builds the iris from `vEye = normalize(position)`. The non-`sith` variant darkens the sclera toward the corners and under the upper lid.

**Hooks.** `CM.cache` keys, `customProgramCacheKey` strings, and the GLSL strings you can splice into a new material.

**Performance.** One compiled program per distinct `customProgramCacheKey`. Maul's per-pixel make-up is the heaviest shader here (section 1). `CM.FILL` itself is cheap.

**Gotchas.**
- `CM.cloth`, `CM.leather` and `CM.plain` return the cached material for a key without checking parameters. Reusing a key with a new colour silently returns the old material.
- `CM.maulSkin` caches one material, and its uniforms sit in a closure. To animate the expression, keep the object (for example `CM.maulU = U`) and set `CM.maulU.uFace.value` from game code. Nothing does this now.
- `CM.FILL` needs `reflectedLight`, `diffuseColor` and `vViewPosition`, so it is spliced after `#include <aomap_fragment>`. The material must declare `uniform vec3 uFill`, as `withAO` and `maulSkin` do.
- `CM.rimHook` must run on any material that uses `CM.FILL`, or `uRim` is undeclared and the shader fails to compile.
- The program key must cover everything baked into the GLSL. `QB.shellMat` breaks this rule (section 8).

---

## 6. p09_body.js: sculpted bodies (SDF)

**Purpose.** The fallback body. Clothed humanoids are signed-distance sculpts in A-pose, meshed at build time. Each garment is its own closed surface with a per-vertex material. Quaternius bodies replace this when assets load, and `?sdf` forces it.

**Public API.**

```js
SCULPT.it(list) : { add(p, op='su', k=0.001), both(p, op, k) }       // both() adds SDF.mirror(p)
SCULPT.fistFrame(J) : { W, A, B, Z, P(u,w,z), rot, C }               // LEFT hand frame; Z = grip axis
SCULPT.fist(J, { scale=1, glove, gauntlet=0.07, gauntletR=0.039 }) : items[]
SCULPT.humanoid(J, o) : groups[]     // group = { name, items, op:'su', k, mat, layer? }
SCULPT.feet(Bt, J, bk)
SCULPT.folds(J, amt=1) : (x,y,z) => metres           // sleeve bunching, torso folds, trouser creases
SCULPT.mesh(G, J, o?) : Promise<{pos, nrm, ao, idx: Uint32Array, nv, mat: Uint8Array}>
SCULPT.meshUnion(G, J, o?) : same shape              // single blended surface (also o.layers === false)
SCULPT.meshFists(J, o?) : Promise<[left, right]>     // each {pos, nrm, idx, nv, ao}; o.res = 0.0024
```

`SCULPT.mesh` options: `folds`, `res` (0.0048), `box` (default `[-0.6,-0.005,-0.22,0.6,1.9,0.24]`), `matIds` (name to slot), `overlays` (default `['belt','belt2','buckle','boots']`), `layers` (true).

`SCULPT.humanoid` options (all optional):

| key | default | effect |
|---|---|---|
| `bulk` | 1 | scales torso, legs and sleeve radii |
| `waist`, `belly` | 1 | hip and abdomen width factors |
| `collar` | none | `'high'` (cone to the head, own layer) or `'low'` |
| `lapel` | false | adds `wrap`, an inflated torso cut on a diagonal |
| `tabard` | false | raised strips on the torso, front and back (boolean) |
| `tabards` | none | **material** for overlay strips over the shoulders |
| `sleeve` | `[0.056, 0.047, 0.041]` | arm radii at shoulder, elbow, wrist |
| `cuff` | none | wrist cuff radius |
| `belt` | on | `{h, y, r, rz, obi, strapMat, sash, pouches}`; `false` removes it |
| `trouser` | `[0.082, 0.058]` | leg radii, hip to knee and knee to ankle |
| `boots` | true | false = bare foot |
| `bootTop` | 0.47 | top of the boot shaft (m) |
| `mats` | tunic for torso, arms, collar, hips; leather for belt, boots; trousers for legs | slot names |
| `extra(grp, J)` | none | adds groups (Maul adds boot trim) |

**Material slots** (`CHAR.MAT_IDS`, p10): `tunic 0`, `trousers 1`, `leather 2`, `extra 3`, `skin 4`, `metal 5`. `CHAR.groupByMat` uses the slot as the index into the part's `mats` array. Maul's SDF body supplies `[tunic, trousers, leather, extra leather]`.

**Example** (Maul's SDF costume, abridged from p10):

```js
const G = SCULPT.humanoid(J, { bulk: 1.07, collar: 'high', lapel: true, tabards: 'trousers',
  sleeve: [0.063, 0.054, 0.047], cuff: 0.05,
  belt: { h: 0.105, y: 0.075, obi: true, strapMat: 'leather', pouches: true },
  trouser: [0.1, 0.074], bootTop: 0.5,
  extra: (grp, J) => { const X = grp('boottrim', 'leather', 0.004); X.g.layer = 'boottrim'; /* ... */ } });
const B = await SCULPT.mesh(G, J, { folds: SCULPT.folds(J, 1), res: 0.0056, matIds: CHAR.MAT_IDS,
  box: [-0.6, -0.005, -0.21, 0.6, 1.62, 0.23] });
```

**Layering.** The base layer is every untagged group. Each overlay (`belt`, `belt2`, `buckle`, `boots`, or any `g.layer`) is its own closed surface, so edges stay crisp. Vertices take the nearest group's material. AO is the minimum of the layer's own AO and the union AO. `SCULPT.folds` applies only to the base layer and to layers whose first group is `tunic` or `trousers`.

**Hooks.** `o.extra(grp, J)`, `g.layer`, `o.overlays`, `o.folds`, `o.matIds`.

**Performance.** Build time only. Each vertex evaluates the SDF several times. Vertex count scales with surface area, roughly 1/res^2, so `res` is the main knob.

**Gotchas.**
- **Slot overflow.** A slot number above the material count points at nothing. Using `skin` or `metal` needs 5 or 6 materials.
- **Silent fallback.** `matIds[name] || 0`: an unknown name becomes tunic with no warning.
- **Two tabard options.** `tabard` (boolean) raises strips on the torso. `tabards` (material) adds overlay strips.
- **The box must reach the wrists.** `meshUnion`'s default box is x ±0.34, but the A-pose wrists are at ±0.49. buildMaul's comment records that the arms were sliced off at ±0.34.
- `SDF.mirror` deep-copies with `JSON`, which is slow on large lists. Use `both()`.

---

## 7. p10_chars.js: templates, skin geometry, Maul's build and CharInst

**Purpose.** `CHAR.T` is the template registry. `CHAR.buildMaul` builds Maul's template: sculpted head, then the Quaternius outfit path, the superhero-body path, or the SDF costume. `CharInst` is one world instance.

**Public API.**

```js
CHAR.T : {}                                            // name -> template (buildMaul, CAST.need)
CHAR.MAT_IDS : {tunic:0, trousers:1, leather:2, extra:3, skin:4, metal:5}
CHAR.skinGeo(pos, nrm, idx, W, extra?) : BufferGeometry        // no copies; takes ownership of arrays
CHAR.groupByMat(g, matOf, idx) : [{start, count, mat}]         // majority vote per triangle; rewrites index
CHAR.headWeights(hp, n) : W           // head bone 4 above a tilted jaw line, neck 3, chest 2 below y = -1.7
CHAR.fistWeights(m, J, side, def?) : W     // hand 8/12 and forearm 7/11 past the wrist; def unused
CHAR.buildMaul(progress?) : Promise<T>     // progress(p, message); sets CHAR.T.maul
class CharInst { constructor(T, opt?); setVisible(v); dispose(); }
```

**CharInst fields.**

| field | set by | meaning |
|---|---|---|
| `T` | ctor | the template |
| `root` | ctor | `Group` named `T.name` |
| `holder` / `inner` | ctor | `Group`s at y +0.95 and -0.95; net offset zero, so the holder is a hip-height pivot (inferred, nothing here rotates it) |
| `bones` | ctor | 19 `THREE.Bone`s, `bones[0]` under `inner` |
| `skel` | ctor | `THREE.Skeleton(bones)` for `T.parts` |
| `meshes` | ctor, `QB.attach` | every `SkinnedMesh`, including Quaternius parts |
| `att` | ctor | name to `Mesh[]` for `T.attach` (eyes, lenses, visors) |
| `cloth` | ctor | `ClothSet(T.cloth, this)` or null |
| `q` | `QB.attach` | render-skeleton state (`bones`, `skel`, `s`, `wr`, `src`, `hand`, `D`, `W`, `our`, `gripL`, `gripR`) |
| `prop`, `symProp` | `Actor.setProp` | held prop group; true for a two-handed symmetric staff |
| `mo` | `Actor` | mocap state, including `fingers` |
| `cape`, `droppedCape` | `CLOAK` (p11b) | Maul's cape |

The saber is not a `CharInst` field. `Actor` keeps `a.saber`. Only the cast viewer (p90) sets `I.saber`.

**Constructor.** Builds `holder` and `inner`, puts `bones[0]` under `inner`, and makes the `Skeleton`. For each `T.parts` entry it makes a `SkinnedMesh`, casting shadows unless the name matches `/^(head|hair|beard|braid|helmet|fist)/` (Maul's head is the exception). If `T.qb`, it calls `QB.attach`. Then it mounts `T.attach` items on `bones[item.bone]`, and creates the cloth set.

**buildMaul.**
1. `useQ = !MG.flags.sdf && await QB.load()`; `QS = 0.985`.
2. `qkey = 'rmale'`, or `'male'` under `?paint` or without Quaternius data.
3. Joints from `QB.joints(qkey, QS)`, or `RIG.joints({shoulders: 1.06})`.
4. Head: `MH.bake(MG.flags.hv || 0.0185)`, scaled by `HK = 0.1 * (rmale ? 1.07 : 1)` onto `J.head`, skinned with `CHAR.headWeights`, material `CM.maulSkin()`.
5. Eyes: two spheres on bone 4, radius `EYE_R * HK * 0.985`, `CM.eye('sith')`.
6. Body: rmale calls `CHAR.maulOutfit` (p15f); male calls `CHAR.maulQBody` (p10b); otherwise the SDF costume (`SCULPT.humanoid`, `SCULPT.mesh` at `MG.flags.br || 0.0056`, `RIG.weights` with the head excluded, `groupByMat`, and gloved fists at `MG.flags.fr || 0.0026`).
7. `T.grip = SCULPT.fistFrame(J)`, `T.cloth = CLOTH.maulSpec(J)` (p11), `await CLOAK.build(T)` (p11b), then `CHAR.T.maul = T`.

Progress reports at 0.1, 0.35, 0.55 and 0.85.

**Hooks.** The progress callback. MG flags: `sdf`, `paint`, `hv`, `br`, `fr`, `view`, `cast`, `clip`, `dbgshell`, `dbgreg`.

**Performance.** Build: seconds, mostly the head bake and SDF meshes. Instance: one `SkinnedMesh` per part and one bone set; Quaternius templates add 65 bones. Geometry and materials are shared, so extra instances cost mainly their skeleton.

**Gotchas.**
- `buildMaul` is Maul-only. It calls `CHAR.maulOutfit`, `CHAR.maulQBody`, `CLOTH.maulSpec`, `CLOAK.build`, `MH`, `CM.maulSkin` and `CM.eye('sith')`, and it hard-codes eye bone 4.
- On the Quaternius path `T.parts` holds only the head; the body is in `T.qb`. Code that counts `T.parts` must check `T.qb`.
- The sculpted head is skinned to the 19 logical bones, not the 65-bone render rig. `QB.drive` keeps them in step.
- `dispose()` does not free geometry or materials; they are shared.
- `T.height` is set per builder: 1.78 for Maul, `qs * 1.81` for `CAST.human` on the Quaternius path.

---

## 8. p10b_qbody.js: Quaternius bodies, render rig, drive, costume and shells

**Purpose.** Puts a Quaternius body on a character: the 65-bone render skeleton (`QB.attach`), the per-frame copy from the 19 logical bones (`QB.drive`), finger shapes, template-time shaping (`QB.cull`, `QB.dress`), the costume material (`QB.costume`), and garment shells (`QB.shell`, `QB.shellMat`). `CHAR.maulQBody` is Maul on the superhero body.

**Public API.**

```js
QB.attach(inst, T) : void                    // builds inst.q; parts go to inst.inner and inst.meshes
QB.drive(inst) : void                        // per frame: inst.bones (19) -> inst.q.bones (65)
QB.handShapes() : {grip, open}               // lazy: grip = Sword_Idle @ 0.2 s, open = Idle_Loop @ 0.4 s, mirrored
QB.regions(key, s) : {wristX, elbowX, shoulderX, neckY, headY, pelvisY, kneeY, ankleY, s}   // bind-pose metres
QB.dress(geo, R, spec) : geo                 // smooths and inflates in place; writes geo.aBind
QB.cull(geo, fn(x,y,z)) : geo                // drops triangles whose three corners all pass fn (use before dress)
QB.costume(key, R, c) : Promise<MeshPhysicalMaterial>
QB.shell(geo, pred(bx,by,bz), off, name?) : BufferGeometry    // needs aBind; keeps triangles inside pred
QB.shellMat(hex, kind: 'cloth'|'leather', id, clipGLSL) : MeshPhysicalMaterial   // discard unless clipGLSL (vB = bind pos)
CHAR.maulQBody(T, J, s) : Promise<void>      // T.qb = {key:'male', s, parts}; T.clothR = 1.22
```

Part objects: `{ geo, mats: [material], name?, shadow? (false = no cast), hidden? (true = invisible at attach) }`.

**`inst.q.src`, how each render joint gets its delta.**

| value | meaning |
|---|---|
| `>= 0` | take the world delta of logical bone k (via `QB.MAP`) |
| `-1` | parent's delta (default: toes and anything unlisted) |
| `-2` | finger: hand delta times grip shape, or times `inst.mo.fingers` when present; `hand` is 8 (left) or 12 (right) |
| `-3` | `spine_01`: slerp 0.55 from root toward spine_02 |

`QB.drive` per call: (1) computes logical world rotations `our[i]` down the tree; (2) for each render joint takes `D` from `src`, then `W = D * wr`; (3) sets local bone quaternions `W[parent]^-1 * W[i]`; (4) sets the pelvis position from the logical root, rotated by `rootInvRot` and divided by `s`. `inst.q.gripL` and `gripR` (0 open, 1 gripped) blend the finger shapes; `p13` sets them to 0.15 to 1.

**`QB.dress` spec.** `spec(x, y, z, R)` returns `{smooth, inflate, maxIn, shrink, flat}`: Laplacian strength 0 to 1, metres of outward inflation, the most a smoothed point may sit inside its original, a flag to skip push-back (boot toes), and extra shrinking passes. Spec properties: `iters` (24), `taubin` (alternating +0.5 and -0.53), `flatIters`.

**`QB.costume` options.**

| key | effect |
|---|---|
| `id` | required; program key is `'qcos_' + id`, and `R` values are baked into the GLSL |
| `top`, `vest` | when `vest` is set it colours the torso, and `top` colours the shoulders and arms |
| `low` | lower garment colour |
| `glove`, `gloveCol`, `gauntlet` | glove region beyond `wristX - gauntlet` |
| `boots`, `bootY`, `bootCol` | boot region below `bootY`; `bootY` must be a number when `boots` is set, or the GLSL gets `NaN` |
| `collar`, `collarH` | neck band when truthy; round neckline otherwise |
| `sleeveX`, `skinTint`/`skinTintV`, `sheen`, `topRough`, `lowRough`, `vestRough`, `foldBump` | shading |

**Maul's costume (`CHAR.maulQBody`).** Superhero body. `QB.cull` removes the base head (`y > headY - 0.004 && |x| < 0.16`). `dressSpec` runs 70 taubin iterations. Costume id `'maul'`: top `0x1d1d22`, low `0x18181b`, gloved with gauntlet 0.1, `bootY` 0.37, collar 1 with `collarH` 0.4. Shells: obi (cloth; the shell spans P+0.02 to P+0.19, drawn only in bind y P+0.045 to P+0.165), belt, collar, tabard strips (|x| 0.038 to 0.112), bootcuff, and wrist gauntlet strips. `T.clothR = 1.22` widens the leg colliders for the skirt (p11).

**Hooks.** `T.qb.parts`; `inst.q.gripL`, `gripR`; `inst.mo.fingers`; `T.clothR`; the `dbgreg` and `dbgshell` flags.

**Performance.** `QB.drive` runs per instance per frame: 19 plus 65 quaternion operations, with the arrays reused and no allocation. `QB.dress`, `QB.cull` and `QB.shell` are vertex and triangle loops at template time. `QB.dress` is the slowest, at 70 iterations for Maul and 160 plus 30 flat for the cast.

**Gotchas.**
- **Order.** `QB.cull` reads bind-space `position`, so call it before `QB.dress`. `QB.shell` reads `aBind`, which only `QB.dress` writes. Shelling an undressed mesh throws.
- **Ragged shell edges.** A shell keeps only triangles whose corners all pass, so edges step by one triangle. Make the band a little wider, and offset by at least 0.01 m.
- **`QB.shellMat` cache key.** The key is `'qshell_' + id`, but the clip expression and the cloth/leather branch are both compiled into the shader. Shells that share an `id` but differ in clip or kind share the first program. Use a unique `id` for each.
- **`QB.costume` cache key.** Same rule: two characters with one `id` share a program built with the first one's `R`.
- **Rest assumption.** `QB.drive` assumes each logical bone is at identity rest. A non-identity rest makes the body follow the delta, not the joint.
- Finger shapes need `Sword_Idle` and `Idle_Loop` loaded. `handShapes` is computed on first use.
- `hidden` only applies at attach. To toggle later, find the mesh by name in `inst.meshes`.

**Recipes.**

```js
// Remove the head of a Quaternius body, then dress it
const R = QB.regions('male', 1);
QB.cull(geo, (x, y) => y > R.headY - 0.004 && Math.abs(x) < 0.16);
QB.dress(geo, R, dressSpec);

// Add a sash after dressing (template time)
T.qb.parts.push({ geo: QB.shell(geo, (x, y) => !arm(x, y) && y > P + 0.02 && y < P + 0.19, 0.018),
  mats: [QB.shellMat(0x6a4a2a, 'cloth', 'myHeroSash', `${A} && vB.y > ${(P + 0.05).toFixed(3)} && vB.y < ${(P + 0.16).toFixed(3)}`)],
  name: 'sash' });

// Run time: pose the logical rig, then drive the render body
inst.bones[i].quaternion.copy(q); QB.drive(inst);
inst.q.gripL = inst.q.gripR = 1;      // clench (0 = open)
```

---

## 9. What is Maul-specific and must be replaced for a different hero

Keep these, since they are generic: `RIG`, `IK`, the `QB` loader and `QB.drive`, `QB.dress`, `QB.cull`, `QB.shell`, `QB.shellMat`, `QB.costume`, `CM.FILL`, `CM.cloth`, `CM.leather`, `SCULPT.*`, `CharInst`.

| item | where | what it is for Maul | another hero uses |
|---|---|---|---|
| `CHAR.buildMaul` | p10 | builds only the `maul` template | `CAST.need(['x'])` with SPECS, QC and QO (section 10) |
| Sculpted Zabrak head: `MH.*`, `MH.bake`, `HORN_SPEC`, `MH.PAINT` | p06, p06b | horns, make-up, expression | Quaternius head (`cullHead: false`) |
| `CM.maulSkin` | p08 | red and black paint, bone horns | `CM.plain`, or the Quaternius skin (`QB.skinMat`, p15f) |
| `CM.eye('sith')` | p10 | amber Sith eyes | `CM.eye('blue')` or default brown |
| `MH.HP`, `MH.EYE_C`, `MH.EYE_R`, `HK` (x1.07 on rmale), `CHAR.headWeights` | p06, p10 | Maul head-space constants | only with a sculpted head |
| SDF costume in `buildMaul` (colours, obi, tabards, pouches, boot trim) | p10 | fallback costume | `spec.body` and `spec.mats` in `CAST.SPECS` (p15c) |
| `CHAR.maulQBody` (shells, `bootY` 0.37, 70 iterations, `clothR` 1.22) | p10b | Maul on the superhero body | `CAST.qBody` (p15e), driven by QC |
| `CHAR.maulOutfit` (black ranger parts, hood hidden, glove `0x0e0e10`) | p15f | Maul's black leathers | a `CAST.QO` entry |
| `CLOTH.maulSpec` (skirt and long tabards) | p11 | Maul's skirt | `spec.cloth = (J) => CAST.skirt(J, {...})` |
| `CLOAK.build` and `CLOAK.wear` (hood, cape) | p11b | Maul's travelling cloak | omit; `CLOAK.build` is called only from `buildMaul` |
| `RIG.joints({shoulders: 1.06})`, `QS = 0.985`, `height 1.78` | p10 | Maul's proportions | `spec.height`, `spec.shoulders` |
| `MOV.maul` default moveset | p17, p18 | Maul's animations | pass `moves:` to `Actor`; `p13b` picks mocap sets by identity of `a.moves` (line 68), so add yours there |
| `PLAYER.spawn` | p18 | spawns Maul with `CHAR.T.maul`, `MOV.maul`, a red staff | a spawn for the new hero, or a patch |

---

## 10. Recipe: a hero named X from the rmale body, outfit parts, a Quaternius head, hair and a saber

Put it in `parts/p15g_x.js`, after p15f, so `CAST.QO`, `CAST.QC` and `QB.buildOutfit` exist. Parts load in name order, and a later part's `const` touched at load time is a TDZ error.

**1. SPECS entry (required).** `CAST.need` calls `CAST.SPECS[name].mats()` unconditionally, so `mats` is required even on the Quaternius path.

```js
CAST.SPECS.x = { name: 'x', height: 1.0, shoulders: 1.0, headRes: 0.0028, bodyRes: 0.0056, fistRes: 0.0034,
  eyes: 'brown', skin: { tone: 0xc8906c, brow: 0x2a1c12 }, hair: 'short', hairCol: 0x2a1c12,   // hair: SDF-head path only
  mats: () => [CM.cloth(0x3a4a5c, 0x4a5a6c, 0.88, 'xT', true), CM.cloth(0x2e2a26, 0x3a3630, 0.9, 'xTr', true),
               CM.leather(0x3a2618, 0.5, 'xL'), CM.leather(0x1a1410, 0.45, 'xB')] };
```

**2. QC entry (required gate).** `CAST.useQ` returns null without QC, so QO alone does nothing. On the modelled path `CAST.human` reads only `QC.female`, `QC.cullHead` and `QC.sdfHair` from QC. The QC colours serve the fallback path (`?paint`).

```js
CAST.QC.x = { outfit: 'uniform', female: false, cullHead: false, hair: ['Hair_Buzzed'], hairCol: 0x2a1c12, browCol: 0x2a1c12,
  top: 0x3a4a5c, low: 0x2e2a26, belt: 0x2a2018, boots: 0x1a1410, bootY: 0.44, glove: 0x141210 };   // fallback only
```

**3. QO entry (the modelled outfit).** The helpers in p15f (`toBlue`, `leatherV`, `CREAM`; ranger green is 115 degrees, leather 28) are local to its IIFE, so copy the ones you use.

```js
const toBlue = (h, s, v) => ({ h: 115, w: 80, toH: h, s, v, minS: 0.03 });   // ranger green -> hue h
const leatherV = (v, s) => ({ h: 28, w: 45, s: s === undefined ? 1 : s, v }); // keep leather hue, set value

CAST.QO.x = { glove: 0x141210, hair: ['Hair_Buzzed'], hairCol: 0x2a1c12, browCol: 0x2a1c12,
  parts: [
    ['ranger', 'Body',        { rules: [toBlue(220, 0.9, 1.0)], sat: 1, val: 1 }],
    ['ranger', 'Arms',        { rules: [toBlue(220, 0.9, 1.0)], sat: 1, val: 1 }],
    ['ranger', 'Legs',        { rules: [toBlue(29, 0.35, 0.55)], sat: 0.8, val: 0.9 }],
    ['ranger', 'Feet_Boots',  { rules: [], sat: 0.6, val: 0.45 }],
    ['ranger', 'Body_Belt_1', { rules: [leatherV(0.8)], sat: 1, val: 1 }, { metal: 0.7 }] ] };
```

Grades are `{rules (max 3), sat, val, tint}`. Hues are degrees; passing 0.61 instead of 220 turns navy into maroon (kit, `outfits.md`).

**4. Build.** `await CAST.need(['x'])`, or `LEVEL.def(id, { cast: ['x'] })`. `CAST.human` sees QC, QO and `rmale`, calls `QB.joints('rmale', height * 0.985)`, then `CAST.qOutfit` and `QB.buildOutfit` with `head: !cullHead`. The result is `T.qb = {key: 'rmale', s, parts}`, plus `T.grip`, `T.cloth` (from `spec.cloth`) and `T.height = qs * 1.81`. The head is the Quaternius `male` superhero head, with hair from `QB.refit`. Female heroes use `female` and `rfemale` the same way.

**5. Instance.**

```js
const a = new Actor(CHAR.T.x, { x, y, z, yaw, hp: 100, team: 'hero', moves: MOV.maul /* or your set */, r: 0.33, h: 1.8 });
```

**6. Saber** (pattern from `PLAYER.spawn`, p18, and the cast viewer, p90):

```js
const S = new Saber('staff', 'red', { prio: 5 });   // or Saber('quigon' | <other>, 'green' | 'blue' | 'yellow')
S.addTo(R.scene); a.saber = S;
a.setProp(S, true);                 // symProp true for a two-handed staff; false for one blade
S.ignite(undefined, true); S.ign = [1, 1];   // [1] for one blade
```

**7. Player wiring.** `PLAYER.spawn` hard-codes `CHAR.T.maul` and `MOV.maul`. A second playable hero needs its own spawn.

**8. Check.** Run `sc_wardrobe.js` (kit) for the cast front and back, then `sc_look.js` for close-ups.

**Opting out of Maul's head.** Never call `CHAR.buildMaul` or `MH.bake` for this hero, and keep `cullHead: false` in QC for the Quaternius head. For a helmet or alien head, set `cullHead: true` in QC. `helmet`, `visor` and `goggles` in SPECS are built on either path, on top of the head. `hair`, `beard`, `braid` and the sculpted head are built only when there is no Quaternius head (hair can also be forced with `lekku` or `sdfHair`).

---

## 11. Discrepancies between the kit notes and the code

1. `characters.md` says to set `cullHead` in both QC and QO. Only QC is read (`p15c` line 144). QO's `cullHead` is ignored, and the same goes for `QO.female` (`p15c` line 140 reads `qc.female` only).
2. `characters.md` lists `hair`, `hairCol` and `browCol` under both QC and QO without saying which applies. On the modelled path QO's values are used, and QC's only on the fallback path.
3. `assets.md` names `rebuild.sh`. The repo has `build.sh`.
4. `assets.md` lists `rmale_*` and `rfemale_*` JPEGs under `assets/`. They are not there now (section 4).

Verification: all eight parts were read in full. `q.json` was inventoried with node. Cross-part references were checked with grep (`CHAR.maulOutfit` in p15f, `CLOTH.maulSpec` in p11, `CLOAK.build` and `CLOAK.wear` in p11b, `CM.humanSkin` and `CM.hair` in p15c). Nothing was executed and no rendering was checked.
