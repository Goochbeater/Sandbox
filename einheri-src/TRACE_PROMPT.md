# Prompt: trace the Jotun reference art into Einheri

Copy everything below the line into the next agent session.

---

You are working on **Einheri**, a single-file HTML mobile action-RPG in the repo `goochbeater/sandbox`, on branch `claude/magical-mendel-vxjkpv`. It is a private, non-commercial fan game for the owner's own use.

**Goal:** replace the code-drawn art of four bosses, Thor's spirit and the Iron Wood props with art cut out ("traced") from five reference screenshots of *Jotun: Valhalla Edition*. The traced art is embedded in the HTML. The result should look like the screenshots, pixel for pixel, inside the game.

## 1. Know the project (read before changing anything)

- **Source** is in `einheri-src/`. Never edit `einheri.html` at the repo root by hand: it is generated.
  - Build: `cd einheri-src && python3 build.py`, then check syntax with `node --check all.js`.
  - `build.py` joins the `.js` files in a fixed order and writes `../einheri.html`.
  - To add a new JS file, add it to the list in `build.py`, before `game.js`.
- **References** are in `einheri-src/refs/`, all 1920×1080 except `thor.jpg` (1046×589):
  - `thrym.jpg`: frost giant, snow storm
  - `nidhogg.jpg`: wyrm rising from an ice hole, rain
  - `surtr.jpg`: fire giant at an anvil, swords
  - `thor.jpg`: golden ghost of Thor with a hammer
  - `ironwood.jpg`: dark forest, lava cracks
- **Where each boss is drawn:**
  - `einheri-src/giant.js` → `drawThrym(b)`
  - `einheri-src/wyrm.js` → `drawNid(b)`
  - `einheri-src/bossart.js` → `drawSurtr(b)`
  - Thor's spirit is `fxThor` in `einheri-src/actors.js` (search for `thor`).
  - Iron Wood props are built in `einheri-src/env.js`, function `realmSprites('iron')`.
- **Coordinates.** One game unit = one screenshot pixel at the bosses' scale.
  - `giant.js` already holds Thrym's part outlines in `thrym.jpg` pixel coordinates. Each `I([...])` list is a polygon in screenshot pixels. The helper `I()` subtracts (1000,1000), so his feet anchor at screenshot (1000,1000), which is game position (b.x, b.y). The pivots are listed in `TP`.
  - `wyrm.js` does the same: the head is in `nidhogg.jpg` pixels pivoted at (1080,210), and the claw at (1080,440).
  - Reuse these polygons as starting masks.
- **Facing.** Bosses mirror to face the hero: Thrym uses `ctx.scale(-b.side, 1)`. Keep that.
- **Animation state** is in `b.an`, for example `b.an.armL.v`, `armR`, `mouth`, `crouch` for Thrym, and `em` (emerged), `bite`, `mouth`, `claw` for Níðhöggr. Keep every attack readable: a wind-up must still visibly move.
- **Tests** use headless Chromium with Playwright at `/opt/node-tools/node_modules/playwright`. Screenshots go to `einheri-src/tests/shots/`.
  - `node tests/test10.js thrym "" thrym`: one boss posed. Also run it for `nidhogg` and `surtr`.
  - `node tests/test2.js iron`: a realm.
  - `node tests/test5.js`: the full playthrough. It must end with every line `true` and `EXIT 0`; give it about 10 minutes.
  - `node tests/test7.js thrym,nidhogg,surtr,iron 15`: the stress test. Every line must say `dark 0` and `errs 0`.

## 2. Tools

```
pip install opencv-python-headless numpy pillow
```

If pip has no network, do everything with PIL and numpy.

## 3. Pipeline for each subject (one Python script per subject, saved in `einheri-src/trace/`)

1. **Mask.** Start from the polygon outlines in `giant.js` or `wyrm.js`; draw new ones by hand for Surtr, Thor and the trees.
   - Rasterise the polygon at full resolution and dilate it 4–6 px.
   - Refine it by looking: make a crop with a 25 px grid, drawn at 2× zoom with the coordinates labelled, and view it. Move points until the edge sits just outside the dark ink outline.
   - Feather the alpha 1–1.5 px. No background must show at the edge.
2. **Clean the weather out.** The screenshots have snow streaks (thrym), rain (nidhogg) and embers (ironwood) painted over the characters.
   - Build a streak mask from pixels that are bright, low in saturation, thin and elongated. One way: the difference between the image and a 7 px median, thresholded, then opened with a line kernel along the streak angle.
   - Repair those pixels with `cv2.inpaint(..., cv2.INPAINT_TELEA)`.
   - Remove the hero sprite where it overlaps a subject.
   - Leave Thor's lightning in place; it belongs to him.
3. **Cut into puppet parts** only where the game animates.
   - Thrym: torso+hips, left arm, right arm, head, jaw and beard, hair, helm, each leg.
   - Níðhöggr: body, head, claw.
   - Surtr: body, hammer arm, sword arm.
   - For each part, inpaint the hole it leaves on the layer underneath, so moving the part never shows a gap.
   - Record each part's pivot in screenshot pixels.
4. **Export** each part as a WebP with alpha, at about quality 85.
   - Keep the total of all images under 6 MB, so the page stays well under the 16 MB limit.
   - Write `einheri-src/traced.js` holding `const TRACED = { thrym: { torso: { src: 'data:image/webp;base64,...', x0, y0, pv: [px, py] }, ... }, ... }`.
   - `x0, y0` is the part's top-left corner in screenshot pixels.
   - Generate this file with a script; never type base64 by hand.
5. **Load.** In `traced.js`, decode every image into an `Image` once at boot, using `img.decode()`. Keep a flag per subject saying it is ready.

## 4. Drawing

In each draw function, if the traced images for that subject are ready:
- draw the parts with `ctx.drawImage` at `b.x + (x0 - anchorX)`, `b.y + (y0 - anchorY)`;
- rotate each moving part about its pivot by the same amounts the current code uses;
- otherwise, fall back to the existing procedural drawing.

Keep everything else the code already does: hit flash (`b.flash`), glows, `G.lights`, the snow plume and hazards.

Anchors:
- **Thrym:** (1000,1000).
- **Níðhöggr:** the hole centre, about (1095,900). Drive emerging (`em`) by clipping to the waterline and sliding the image down by `(1 - em) * 900`.
- **Surtr:** the point where his feet meet the floor; measure it on the screenshot.

Other subjects:
- **Thor:** draw the traced spirit with `globalCompositeOperation = 'lighter'`, centred above the hero and scaled so it is about 4× his height.
- **Iron Wood:** cut 3–4 trees and 2 cattail clumps from `ironwood.jpg`, each as its own sprite. Use them in `realmSprites('iron')` in place of `pTree(…,'iron')` and `pReeds`.
  - Each sprite needs `wu`, `hu`, `ox`, `oy` (the anchor is the trunk base) and the `tree`, `cy` and `canopy` fields that `pTree` sets.

## 5. Acceptance

- [ ] **Side by side.** For each boss, render a test10 shot and put it next to its reference in one image. The boss must look the same: shapes, colours and line work, with no halos, no streak remnants and no gaps at the joints.
- [ ] **Animation.** Every attack wind-up still moves visibly, and the boss mirrors correctly on both sides of the hero.
- [ ] **Tests.** `test5` passes in full; `test7` reports `dark 0` and `errs 0`.
- [ ] **Size.** `einheri.html` is under 16 MB.
- [ ] **Disclaimer.** In `game.js`, search for `Credits &amp; disclaimer`. Replace "no assets from the original game are included" with a sentence saying the build contains art traced from Jotun screenshots for private, non-commercial use only. Keep it accurate.
- [ ] **Privacy.** Keep this build private: don't share its link publicly, and don't push it to a public repository.
- [ ] **Commit and push.** Build, commit with a clear message, then `git push -u origin claude/magical-mendel-vxjkpv`.

Work one subject at a time, in this order: Thrym, Níðhöggr, Surtr, Thor, Iron Wood. After each, rebuild, run its test10 shot and the side-by-side, fix what is off, then commit before moving on.
