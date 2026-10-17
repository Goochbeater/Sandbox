# SPOREHEART — character modelling brief (shared by every character agent)

You are building ONE procedural 3D character (or one pair) for **SPOREHEART**, a Three.js (r166) anime-styled
action game that ships as a single HTML file and is played on a **Samsung Galaxy Z Fold 4** (Adreno 730, Chrome).
There is no Blender and no external asset: every model is **code** — geometry from primitives/lathes/extrusions/custom
BufferGeometry, textures painted on `<canvas>` at runtime, animation as keyframes. The goal is a model that is
**recognisably the character in the reference painting**, reads at a glance from a third-person camera, and animates with
weight and charm. Quality bar: "AAA stylised anime" — the current in-game models are crude tubes/blocks; yours must not be.

## 0. Ground rules
* Work ONLY in your own file(s): `src/char_<id>.js` (named in your task). **Do not edit any other file** (no `charakit.js`,
  `assets.js`, `characters.js`, `render.js`, `player.js`, `ui.js`…). If you need a helper, write it inside your file.
  If you think a shared file needs a change, say so in your final report — don't make it.
* **Do not run git.** Don't touch `SPOREHEART.html` / `SPOREHEART.dev.html`. Build ONLY the isolated gallery to a path of
  your own (see §6) so you never collide with other agents.
* Classic-script IIFE, `"use strict"`, `const G = window.G;`. **No THREE access at parse time** (THREE is injected after
  load) — all THREE calls happen inside the builder function.
* Register with: `G.chars.define("<id>", { height, radius, team }, builderFn)`. The builder returns
  `{ id, root, parts, anim, rig, height, radius, team }` (same shape as the legacy builders in `src/characters.js` —
  read `buildWitch()` there for a worked example of the kit; it is a *structure* reference, not a quality reference).
* Performance budget (mobile): ≤ ~120 draw calls after `K.mergeRig(rig)` for a normal character, ≤ ~40k triangles;
  the big beast may use ≤ ~250 calls / ~120k tris. No per-frame allocations inside layer/update callbacks.
  Textures ≤ 1024² each, canvas-generated, created once (cache them at module level).

## 1. The kit you build on (`G.kit`, in `src/charakit.js` — READ IT, ~1000 lines)
* `K.rig({name,height})` → rig with `rig.bone(path,parentPath,pos,rot,{sway,phase})`, `rig.add(bonePath, geo, mat, {p,r,s,o,...})`,
  `rig.attach(bonePath, obj3d)`, `rig.group(...)`, `rig.parts` (nested by dotted path, e.g. `parts.armL.sh`), `rig.body`, `rig.root`.
  Bones with `{sway}` get automatic secondary motion (cloth/hair/hat tips) from the animator.
* `K.anim(rig)` → animator: `addClip(name, keyframes, {dur, loop})`, `play(name,{fade,once,speed})`, `setBase`, `update(dt,{speed})`,
  `layer(fn)` for procedural additive offsets (`anim.off(bone)` returns a mutable offset record), `has(name)`, `pose(name)`.
  Keyframes `{t, bone, rot:[x,y,z], pos:[x,y,z], scl:[x,y,z], ease}` are **additive offsets from the rest pose**; bones a clip
  doesn't mention keep their base-clip value (so `idle` runs under actions).
* Materials: `K.mat.toon(hex,{side,emissive,emissiveIntensity,transparent,opacity})`, `K.mat.mapToon(hex, canvasTexture, opts)`
  (painted textures), `K.mat.flat(hex,opts)` (unlit — faces, decals), `K.mat.glow(hex, intensity)` (unlit **HDR** emissive: values > 1
  feed the bloom pass, use intensity 1.4–2.5 for glowing eyes/lanterns/blades), `K.mat.additive(hex, opacity)` (glow shells).
* Geometry factory `K.geo.*`: `sphere, box, cyl(rt,rb,h,seg,open), cone, torus, ring, lathe(points,seg,phi0,phiLen,key), bell(...)
  (robe shell), tatter(w,len,jag,...) (jagged cloth panel), strand(w,len,...) (hair card), eyePatch(...) (anime eye decal curved onto a
  sphere), brim(...), gnarl(...)`. You may (and should) also build **custom BufferGeometry** — lofted tubes along a path with varying radius,
  subdivided cloth with baked folds (sin/noise displacement), extruded shapes, tapered capsules. Smooth organic forms are the
  difference between "tube" and "character". Cache geometry by key.
* `K.mk(geo, mat, {p,r,s,o,oc,shadow,name,noOutline})` → mesh; `o` = ink-outline thickness (0.02–0.07 typical).
  Outlines are a screen-space ink line (back-face shell, constant pixel width) with smoothed normals — they work on boxes too.
  Skip them (`noOutline`) on glow shells, decals, eyes and tiny details. Use `oc` (hex) for a coloured line on hot materials.
* `K.head({...})`, `K.hairBob`, `K.skull`, `K.crystal`, `K.glowDisc`, `K.panel` (hinged cloth panel) exist — use, adapt or replace.
* `K.mergeRig(rig)` batches rigid meshes sharing a material **per bone** — call it once at the end (it skips meshes with children/
  `userData.keep`). Meshes that must stay separate (animated materials, outlines you toggle…) → set `mesh.userData.keep = true`.
* Shading: every toon material already has a 4-band cool-shadow ramp + rim light + ink outline. Colour choices should therefore
  be a little *brighter and more saturated* than the painting's mid-tones (shadows will cool and darken them).
* Sprites for glow: `G.assets.glowSprite(hex, scale, opacity)` (additive billboard) — use sparingly (lantern cores, eyes).

## 2. Conventions
* **Units: metres. +Y up. The character FACES +Z.** `root.position.y = 0` is the soles of the feet.
* Rig bone names (use these so game code works): `hips, chest, neck, head, hairBack, armL{sh,el,hand}, armR{sh,el,hand},
  legL{hip,knee,foot}, legR{hip,knee,foot}, propR (hand-held item), propL`, and for cloth `cloak.0..n` (+`cloakTip.n`).
  Extra bones are welcome. Handedness: the model faces +Z, so its anatomical LEFT side is **+X** (`armL`, `legL` at +X) and its RIGHT is **−X** — follow `buildWitch`.
  (When the painting shows the character facing the viewer, the viewer's right is the character's left = +X.)
* The **gameplay camera** sits ~5.4 m *behind* the character (so it mostly sees the BACK and 3/4), pitched down ~20°, FOV 58°,
  looking at ~1.35 m height. The title / codex / intros show the FRONT. So: the back silhouette (hat, hair, cloak, backpack) must be as
  convincing as the face.
* Put important gameplay anchors in `parts`: noted per character below. `parts.root`, `parts.body` must exist (`rig.root`, `rig.body`).
* Colour fidelity: the reference paintings are in `refs/codex0..3.jpg` (1148×2048). **Load them with the Read tool and ZOOM**:
  crop details with Python/PIL (e.g. `python3 -c "from PIL import Image; Image.open('refs/codex0.jpg').crop((x0,y0,x1,y1)).save('/tmp/…')"`)
  and sample colours with PIL `getpixel`. Copy the palette and the *shape language* (the paintings are flat-shaded with big simple
  shapes, thick contours, and saturated accent colours — teal/green grounds, orange + red accents).

## 3. How to make it look expensive (techniques to actually use)
1. **Silhouette first.** Block the big shapes (hat/helmet, hair, cloak, backpack, weapon) and check the black silhouette before details.
2. **Lofted forms.** Build limbs/torsos/cloth with `K.geo.lathe` or custom lofts (e.g. an elliptical cross-section swept along a spine curve)
   instead of cylinders; add a few baked folds/wrinkles. Hard-edged boxes only for hard-surface (armour, buckles).
3. **Painted textures.** Make 256–1024 px canvas textures with gradients, wear, stitching, embroidery/patches, dirt at hems, glyphs,
   hair-strand highlights (a vertical gradient band across hair cards gives the anime "angel ring"), cloth weave noise. Use
   `K.mat.mapToon(hex, tex)`; set `tex.colorSpace = THREE.SRGBColorSpace`; `wrapS/T = RepeatWrapping` for tiling.
4. **Faces.** Paint the face (eyes with layered iris gradient, pupil, 2 highlights, upper-lash line, brows, tiny mouth, blush) on a
   canvas and apply it with `eyePatch` decals or a face-plane over the head sphere. Eyes are the soul of an anime character — big,
   clean, expressive. Optional: eyelid blink via scaling an eyelid mesh in a layer.
5. **Secondary motion.** Hair, scarf ends, hat tip, cloak, ribbons, pouches, lantern dangles, ears: give them `{sway}` bones and/or a `layer()`
   that adds small velocity-independent oscillation. Add overshoot + anticipation to attacks (hold the wind-up 2–3 frames, snap, settle).
6. **Layering & trim.** Distinct materials per garment layer, piping, stitched seams (thin torus/strip), buckles, straps with rivets,
   cuffs rolled over, patches. Small bright accent details (orange, red) placed exactly where the painting has them.
7. **Emission & bloom.** Glowing parts use `K.mat.glow(hex, 1.6–2.5)` — they will bloom. Keep glow areas small and deliberate.
8. **Idle must be alive**: breathing, weight shift, head micro-turns, blink, cloth/hair drift. A static idle looks dead.

## 4. Required animation clips
Every character: `idle` (loop, base clip). The remaining clips are listed per character. Use exactly these clip names.
Missing clips are tolerated by the game but the list is the target. Each action clip should be short and snappy (see durations).
Clip keyframe times are seconds. Loops: `idle, run, sprint, air, glide, walk`. Others are `once` (the game passes `once:true`).

## 5. Deliverable checklist
* `src/char_<id>.js` self-contained, registered with `G.chars.define`.
* Gallery renders (front, 3/4, back, side, **gameplay camera**, close-up of the face/head/prop, and 3+ animation poses) that you have
  *looked at* and iterated on until it is clearly the same character as the painting. At least 5 full iterations of look → compare to the
  reference → improve. State honestly what still differs from the reference.
* No console errors/warnings from your builder. Mesh/tri/draw-call counts reported (use `rig.countMeshes()`; draw calls ≈ meshes after merge).
* Final message (≤ 40 lines): what you built, the `parts` anchors and clips exposed, anything you couldn't finish, any suggested change to
  shared code. Do not paste code.

## 6. Tooling — the isolated gallery
```
cd /home/user/Sandbox/sporeheart
node tools/build.mjs --gallery --out=/tmp/<yourname>/gal.html          # rebuild after each edit (includes every src/char_*.js)
node tools/gallery.mjs --html=/tmp/<yourname>/gal.html --out=/tmp/<yourname>/shot \
     "<id>:<yaw>:<pitch>:<dist>:<lookY>:<fov>:<clip>:<t>" ...         # one PNG per spec: /tmp/<yourname>/shot_<n>_<id>.png
```
* yaw 0 = camera in front of the model (sees its face); yaw π = behind (gameplay view); π/2 = its left side (+X side).
* e.g. full body 3/4: `witch:0.6:0.1:6.5:0.95:30` · face close-up: `witch:0.3:0.0:1.6:1.35:30` ·
  gameplay camera: `witch:3.14:0.34:5.4:1.35:58` · action pose: `witch:0.7:0.1:6:1:30:attack1:0.14`.
* Make a contact sheet with PIL to view several angles in one Read (each Read of an image costs context; sheets are cheaper).
* Screenshots are 640×900 by default (`--w=… --h=…`). Rendering uses software GL: be patient (~10–20 s per run).
* The gallery uses the **real** game pipeline (toon ramp, ink outline, bloom, grade) so judge colours there, not in your head.
