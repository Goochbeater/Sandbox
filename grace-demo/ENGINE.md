# The Grace engine — how this demo is made

This is the working manual for the demo in this folder: a 2.5D, *Yes, Your Grace: Snowfall*-style kingdom game that
runs in a browser (phone or desktop) as **one self-contained HTML file**. It explains every system, the numbers that
make the look work, and the recipes for adding rooms, props, characters, conversations and petitions, so a new session
(human or Claude) can pick it up cold.

Contents
1. What it is, in one paragraph
2. Folder map and build
3. The frame: how a picture is made (render pipeline)
4. Pixel art: the texture painter
5. Rooms: the builder API
6. Characters: the Actor system (3D models drawn as live pixel sprites)
7. The scene manager: rooms, camera, input, markers, speech
8. Holding court: petitions, agents, the points bar, the week
9. Content as it stands (bedchamber, throne room, cast)
10. Recipes: how to add things
11. Testing and debugging
12. Performance budget and devices
13. Known limits and next steps
14. Credits and licences

---

## 1. What it is, in one paragraph

Everything you see is real-time 3D (three.js r160, WebGL2). Rooms are built from boxes and flat "cards" textured with
pixel art that is painted in code at load time at exactly **32 texels per metre**. Characters are genuine skinned 3D
models (Quaternius CC0 base bodies + outfits, driven by motion-capture clips) that are rendered every frame by their
own tiny orthographic camera into a **48 × 77 px** target. The target is placed back in the room on a billboard, so
the character reads as hand-made pixel art at the same pixel density as the room, while still turning, walking,
sitting and being lit by the room's lights. The frame is then finished like a film: planar floor reflections, HDR,
depth of field that blurs the foreground and keeps the walking line sharp, bloom on flames and windows, ACES tone
mapping, a warm grade, vignette and grain, letterboxed to a wide frame.

## 2. Folder map and build

```
grace-demo/
  head.html            page shell: <title>, CSS, and the DOM for the UI (bubble, markers, panels, pause, boot screen)
  engine/              reusable engine — no room or story content in here
    e00_core.js        G (time, flags from the URL), helpers (clamp, lerp, smooth, damp, hash, rng, noise1), error box
    e01_render.js      R: renderer, render targets, reflections, depth of field, bloom, final grade, letterboxing
    e02_pixel.js       PX + Pix: the pixel-art painter, colour helpers C, generic painters, the texture registry
    e03_build.js       Room class + BUILD: boxes, planes, cards, flames, glows, lights, shafts, rugs, glossy floor, dust
    e04_assets.js      QA: loads the embedded character bundle; geometry, hair refit, clip sampling, clip speeds
    e05_actor.js       Actor: building a character from a spec, garments, animation, the sprite pass, shadows
    e06_scene.js       SCENE: rooms, fades, follow camera, input, ◇ markers, speech bubbles, pause, test hook
  game/                this game's content
    g10_paint_bedroom.js   bedchamber pixel art (+ crown, velvet, tassel)
    g11_paint_throne.js    throne-room pixel art
    g20_bedroom.js         the bedchamber: layout, lights, interactions, lines, the crown
    g30_throne.js          the throne room: layout, lights, interactions, lines
    g40_cast.js            every character's spec
    g50_court.js           holding court: petitions, agents, items, the points bar, the week ledger
    g90_main.js            boot sequence and the frame loop
  assets/              the CC0 character bundle cut from the character kit (king.json, king.bin, *.jpg)
  vendor/three.classic.js   three.js r160 (MIT), classic global build — no modules, no CDN
  tools/
    trim_assets.py     re-cuts assets/ from the kit's full bundle (choose meshes, clips, texture sizes)
    shot.js            headless Chromium screenshots + scripted steps (see §11)
  build.sh             → build/index.html (open from disk) and build/artifact.html (for claude.ai publishing)
```

**Build:** `./build.sh`. It syntax-checks every part with `node --check`, concatenates `engine/*.js` then `game/*.js`
in file-name order into one `<script>`, embeds three.js, the character JSON, the binary (base64) and the JPEG
textures (base64), and writes two files. `index.html` is a full document; `artifact.html` is the same page without
`<html>/<head>/<body>` (the claude.ai artifact host wraps it). The page is ~6 MB; the artifact limit is 16 MB.

**Order matters.** Parts run top to bottom at load. A file may only *use at load time* things defined in files that sort
before it. Functions can refer to later globals freely (they run later). Engine files never reference game globals at
load time; game files register rooms and textures at load and build them in `g90_main.js`.

## 3. The frame: how a picture is made (`engine/e01_render.js`)

Per frame (`SCENE.render` → each `Actor.render` → `R.frame`):

| Step | Target | What happens |
|---|---|---|
| 1. sprites | each actor's 48×77 (or 48×93) target | each visible actor's sprite camera renders only that actor's layer; a tiny pass adds a 1 px dark rim and posterises to 24 levels |
| 2. reflection | half-res HDR (quarter on low) | a camera mirrored in the floor plane (y = 0) renders layer 0; floors and rugs are on layer 2 so they don't reflect themselves |
| 3. scene | full-res HalfFloat HDR + depth texture | the main camera renders layers 0 and 2 |
| 4. DOF down | half-res | colour + linear distance in alpha (nearest of 4 depths, keeps thin foreground edges) |
| 5. DOF blur | half-res | golden-angle "scatter-as-gather" (Dennis Gustafsson's single-pass bokeh): foreground blur bleeds over what's behind it; alpha carries how much bleed reached each pixel |
| 6. bloom | ¼ → 1/64 res | soft-knee threshold, 4 dual-filter downsamples, 4 upsamples added back |
| 7. final | screen | mix sharp/blurred by blur size (+ bleed), add bloom, exposure, ACES, warm curve (`pow(c, 0.94/1/1.08)`), +8 % saturation, vignette, film grain, sRGB |

**Layers** (three.js `Layers`): 0 = the room (main + reflection cameras), 2 = main camera only (floors, rugs, actor
floor shadows), 3…31 = one per actor. Lights are enabled on all layers so they light rooms and actors alike; two
special lights (`Actor.key`, `Actor.rim`) are enabled only on actor layers.

**Depth of field** is artistic, not thin-lens. `R.dofU`: `uFocus` (distance to the walking line, set each frame),
`uNear0` 0.8 m / `uNearR` 3.2 m (blur starts 0.8 m in front of the focus and is full 4 m in front), `uNearMax` 11 px,
`uFar0` 3 m / `uFarR` 10 m / `uFarMax` 2 px (the back wall stays nearly sharp, like the reference). Sizes are authored
for a 640 px half-res buffer and scaled to the real one. A room can override any of these with `room.dof`.

**Letterbox and lens** (`R.resize`): the frame's aspect `R.A = clamp(screenAspect × 1.25, 1.9, 2.96)`. A 20:9 phone
gets ~2.8:1, a Fold's near-square inner screen 1.9:1, a 16:9 desktop 2.2:1. Narrow frames get a wider lens:
`fov = room.cam.fov × R.fovK`, `R.fovK = 1 + 0.18 × (2.96 − A) / 1.06`. Render resolution is device pixels capped at
2000 px wide (1100 px and ×0.6 on low quality).

**Quality**: `R.q` 'high' | 'low' (`?q=low`, the pause menu, or automatic: if the first 120 frames average > 30 ms the
game drops to low once). Low halves dust, quarter-res reflections, fewer DOF taps, smaller shadow maps. `R.fx` turns
steps 4–6 off (pause menu, `?nofx`).

**Shadows** are static. Shadow maps are drawn once when a room is entered (`renderer.shadowMap.autoUpdate = false`,
`needsUpdate = true` in `SCENE.enter`). Re-drawing a point light's six faces every frame for a moving character would
cost ~1,500 extra draw calls per frame, so characters get their own cheap shadows instead (§6).

## 4. Pixel art: the texture painter (`engine/e02_pixel.js`)

- `PX.D = 32` texels per metre. Everything is painted at that density.
- `new Pix(w, h)` is a tiny RGBA canvas with drawing calls: `set/wset/get`, `fill`, `rect`, `hl/vl`, `line`, `disc`,
  `ell`, `shade`, `jitter(amount, seed)` (per-pixel brightness noise), `outline(colour | null, k)` (1 px rim on cut-outs)
  and `tex({ repeat, mip, aniso })` → a three.js texture (sRGB, `NearestFilter` up close, nearest-mip-linear far away).
  Colours are `0xRRGGBB`; y = 0 is the top row.
- `C.mul`, `C.mix`, `C.ramp(palette, t)` for shading with fixed palettes (pixel art rule: pick from ramps, don't blend freely).
- Everything is deterministic (`hash`, `rng(seed)`, `noise1`), so the room is identical on every load.
- **Registry:** `PX.def('name', () => texture)`; use `PX.T.name` anywhere: it paints on first use and caches.
  `texture.userData.tint` gives boxes built from that texture a default colour multiplier (the bedroom's stone uses it).
- Generic painters shared by rooms: `PX.brickAt` (staggered stone courses), `PX.rug(w, h, palette, seed)` (kilim with
  borders and lozenges), `PX.curtain(palette, tieRow)`, `PX.swag`, `PX.wood(base, seed)`, `PX.drawers(w, h, rows, base)`,
  `PX.frame` (gilded frame), `PX.flameFrames(w, h, frames, tongues, seed)` (an animated strip), `PX.soft('glow'|'shaft'|'mote')`
  (the only smooth textures: halos, light shafts, dust).
- Palettes in use: `PX.RED` (drapes, banner), `PX.GOLD` (gilt, gold curtains); room painters keep their own colours inline.

Painting tips that held up: shade with 4–6 step ramps; light comes from the top-left in every sprite; give cut-outs a
darker rim (`outline(null, 0.6–0.7)`); add `jitter(0.02–0.05)` to big surfaces so they don't look vector-flat; keep
saturated colours for small accents (flowers, gems, banners) and let walls stay muted.

### The pixel-scale rule (read this before building anything outdoors)

The rooms look right because **one texel lands on about 3 screen pixels**: 32 texels/m seen from 19.4 m at fov 19.
The first title-screen fortress broke that rule (14 texels/m seen from 100+ m, so texels shrank below 1.5 px). It
also tiled one noise texture over everything, and it looked like grey mush. The fix was to build it the way the rooms
are built:

1. **Match the density to the camera.** `BUILD.density(distance, fov)` gives the texels/m that match the rooms at
   that distance (≈ 5.5 for the title view). Put it on the texture (`texture.userData.d`); `planarUV`, cards and the
   architecture painters all respect it.
2. **Paint each face to its size, the way furniture is painted.** No tiled noise: `PX.facade`, `PX.towerWrap` and
   `PX.coneWrap` (in `engine/e12_arch.js`) paint each wall, drum and roof as one pixel-art picture: a 6-colour
   ramp, top-edge highlights, dark mortar, grime from the foot, rain streaks, ivy, and windows with a separate glow mask.
3. **Compose in three layers**: a dark foreground (the hill, blurred by the depth of field), the sharp subject, and a
   backdrop painted once (the sky, two mountain ridges). Keep the subject's value clear of the sky behind it.
4. **Design the light**: one cool key with shadows from the front, a rim from behind for the silhouette, and warm
   pools (torches, windows) where you want the eye to go. Lights that simply get dimmer don't read as night;
   switch lights off instead (see `THRONE.night`).

A close shot inside an outdoor room (the clearing in the Wood) needs its own 32 texels/m ground, because the title's
coarse textures fall apart at 10 m.

### Architecture painters (`engine/e12_arch.js`)

`BUILD.facade(x0, x1, y0, y1, z0, z1, f)` builds a box whose +z face is painted to size; `BUILD.tower(x, z, y0, y1, r, f)`
builds a drum with a texture that goes once round (u = 0 faces the camera); `BUILD.coneRoof(x, z, y, r, h, ramp, d)` adds
a tiled cone (seg 4 makes a pyramid). `f = { ramp, d, seed, tile, win: [[x, y, kind, lit]], arch: [x, w, h], crest: [x, y],
bands: [y], ivy: [[x, w, h]], grime, streaks }`. Window kinds: slit, lancet, tall, square, rose; lit windows get glow sprites.
`PX.stoneTile` / `PX.tileRoof` make repeatable courses for the faces nobody looks at straight on. Ramps live in
`RAMP` in `game/g15_paint_exterior.js`.

`build.sh` refuses to build if any `PX.x =`, `BUILD.x =`, … is defined twice. A game painter named `PX.window` once
silently replaced the engine's window painter, which is why the fortress's windows didn't appear.

## 5. Rooms: the builder API (`engine/e03_build.js`)

A `Room` is a `THREE.Group` plus what the scene needs to run it:

```js
const HALL = SCENE.addRoom(new Room('hall', {
  X0: -10, X1: 10,            // walls (m); the player walks X0+1 … X1−0.9
  CEIL: 4.7, KZ: 2.6,         // ceiling height; z of the walking line
  cam: { y: 2.45, look: 2.18, dist: 19.4, fov: 19 },   // the camera rail: height, look-at height, distance, vertical fov
  exposure: 1.0, reflK: 0.6,  // final exposure; floor reflection strength
  caption: ['The Hall', 'Late at night'] }));
HALL.build = function () { const room = BUILD.begin(this); /* … BUILD calls … */ return BUILD.end(); };
HALL.onEnter = function (at) { SCENE.caption(...this.caption); };
HALL.onUpdate = function (dt) { /* per-frame room logic */ };
```

Coordinates: metres; x along the back wall, y up, z toward the camera; the back wall is z = 0.

| Call | Makes |
|---|---|
| `BUILD.plane(axis, a0, a1, b0, b1, at, tex, o)` | a wall/floor/ceiling piece. axis `'z'` (back wall), `'x+'`/`'x-'` (side walls), `'y+'` floor, `'y-'` ceiling. `o.mat` to pass a material (the glossy floor), `o.layer` |
| `BUILD.box(x0, x1, y0, y1, z0, z1, tex, o)` | furniture/architecture. UVs are projected per face so neighbouring boxes share one texel grid. `o.front` = material for the +z face (drawer fronts, chest fronts), `o.taper: [kx, kz]` narrows the top (chimney hood), `o.col`, `o.rough`, `o.metal`, `o.cast` |
| `BUILD.card(tex, x, y, z, o)` | a standing pixel cut-out, bottom-centre at (x, y, z), sized from the texture at 32 px/m. `o.s` scale, `o.w/o.h` metres, `o.ru` repeat across, `o.ry` turn, `o.basic + o.k` unlit and HDR-bright (windows, glowing arches), `o.mat` custom |
| `BUILD.flame(x, y, z, scale, big)` | an animated flame card (`big` = hearth fire), HDR so it blooms |
| `BUILD.glow(x, y, z, size, colour, k)` | an additive halo sprite (flickers in size) |
| `BUILD.light(light, x, y, z, { flicker })` | adds a three.js light on all layers; `flicker: rate` makes it breathe like fire |
| `BUILD.shadow(light, size)` | makes a light cast (static) shadows |
| `BUILD.shaft(x, y, z, w, len, alpha, [rx, ry, rz], colour)` | a visible light beam |
| `BUILD.rug(tex, x0, x1, z0, z1, { ru, rv, y })` | a matte rug or runner on the floor (or on a step, `y`) |
| `BUILD.reflective(tex, { k, rough })` | the glossy floor material: standard shading + the mirrored scene, blurred vertically, fresnel-weighted; dark texels (plank gaps, grout) stay matte |
| `BUILD.motes({ n, boxes: [[x0,x1,y0,y1,z0,z1,share], …], embers: [x,y,z], col })` | drifting dust; boxes near the lens become bokeh; optional embers |
| `room.interact(id, x, y, z, r, use)` | a ◇ marker at (x, y, z); usable within `r` m of x; `use(room, it)` runs. `.hidden`, `.seated` (only while sitting), `.far` (show distance), `.label` (screen-reader text) |

Room fields the engine reads: `room.rim = [x, y, z, intensity, range, colour, lightThatFlickers]` (a warm back light on
characters near a source, e.g. the hearth), `room.shadowSrc = [x, y, z, range]` (where characters' floor silhouettes
are thrown from), `room.camFocus` (pin the camera's x, e.g. while seated), `room.focusDz`, `room.dof`, `room.lights.*`
(your own handles).

**Layout recipe that produced both rooms:** sketch the reference frame in bays (pilaster to pilaster, or furniture
cluster to cluster), write each bay as a commented block, put the walking line 2.5–3.3 m from the back wall, keep
furniture behind it, and put 2–3 objects 3.5–5 m in front of it (posts, columns, a brazier, a candle table) for the
depth of field to blur. Lights: one dominant warm source per room (hearth, throne spot), a few warm accents (sconces,
candles), a cool counter-light (window), a hemisphere light for the base level and a dim fill from the camera side.

## 6. Characters: the Actor system (`engine/e05_actor.js`)

### The bundle (`engine/e04_assets.js`)
`assets/king.json` + `king.bin` come from the character kit's Quaternius bundle, cut by `tools/trim_assets.py`.
One 65-joint skeleton for every body; bodies `rmale`/`rfemale` (regular proportions: bind pose only), `male`/`female`
(source of heads, eyes, brows), outfits `rm_peasant`, `rm_ranger`, `rf_peasant` (primitives named
`Male_Peasant_Body`, `…_Arms`, `…_Legs`, `…_Feet`, `Male_Ranger_Acc_Pauldron`, `…_Body_Belt_1`, `…_Feet_Boots` …),
hair `Hair_SimpleParted`, `Hair_Beard`, `Hair_Buzzed`, `Hair_Long`, `Hair_Buns`, and 8 clips: `Idle_Loop`,
`Walk_Loop` (1.0 m/s), `Walk_Formal_Loop`, `Idle_Talking_Loop`, `Interact`, `Idle_FoldArms_Loop`,
`Sitting_Idle_Loop`, `Idle_Shield_Loop`. Clips store per-joint *world* rotation deltas, so any clip plays on any body.
`QA.speed(clip)` measures a walk's ground speed from its foot travel so playback never foot-slides.

### A character is a spec
```js
{ id: 'queen', bind: 'rfemale', s: 1.0,                     // body and scale
  skin: 0xe6bca2, skinK: 0.95,                              // skin tone (head and hands)
  parts: [['rf_peasant', 'Female_Peasant_Body', { L: 0x34426a, P: 0x7a88a8 }], …],   // outfit pieces + dye
  brows: 0x3a2418, hair: [['Hair_Buns', 0x4a2c1a]],
  robe:   { col, top, bot, rx: [waist, hem], rz: [waist, hem], trim, band, leg },     // skirt/gown/long coat
  collar: { pal: [4 colours], y, rx, rz, thick },           // fur mantle or shawl
  tabard: { col, trim, emblem, w, top, from: [mesh, prim] },// tabard, sash or apron down the front
  crown:  { worn, k, y }, helmet: { col }, prop: 'spear' | 'scroll',
  idle: 'Idle_FoldArms_Loop', walk: 'Walk_Formal_Loop', speed: 1.1,
  x, z, y (standing height, e.g. 0.48 on the dais), face: ±1, home: 'throne', box: [1.5, 2.4], headY }
```

**Dye** (`Actor.dye`): the outfit textures keep their painted folds and stitching; each pixel is classified by hue and
saturation into **L** (saturated leather/wool, hue < 50°), **G** (green cloth, hue 55–175°) or **P** (everything pale:
linen, metal) and re-coloured to the target, scaled by how bright the original paint was. Leave a target out to keep the
paint. Peasant textures are L (brown vest, trousers, boots) + P (cream shirt); ranger textures are G (green tunic) +
L (leather) + P (metal). `'skin'` instead of a dye picks the bare-hand primitive of that piece.

**Procedural garments** are skinned to the same skeleton: the robe is a flared tube whose lower rings follow the thighs
(`leg` = how much), so it swings when walking; the collar is a squashed torus on the upper spine and clavicles; the
tabard is a strip that follows the chest (measured from the outfit mesh) and then the skirt. Crowns and helmets ride the
head bone (`attachHead`); props follow a hand bone but stay upright.

### Behaviour
`a.walkTo(x, cb)`, `a.moveTo3({ x, y, z, speed }, cb)` (a straight 3D move: up the dais, away from the lens),
`a.sit(seat)` / `a.stand()`, `a.act('Interact', at, fn)` (a one-shot clip, `fn` fires at `at` seconds), `a.faceTo(x)`,
`a.lookYaw` (hold a turn), `a.talking` (blends the talking idle; set by speech bubbles), `a.setVisible`,
`a.offstage` (keeps a character hidden when its room is entered, e.g. petitioners), `a.dir` (the player's input).
The clip mix each frame: idle (1) → seated (sitK) → talking (talk) → walk (by speed, phase advanced by distance) →
one-shot act. Yaw eases toward the walking direction (±1.32 rad: side view, slightly toward the lens) or the idle turn
(±0.42 rad).

### The sprite pass
`Actor.render(room)`: the sprite camera sits 7 m back along the main camera's line of sight to the actor, so the sprite
shows the same angle the main camera would see. Frame `box` metres → `box × 32` px. Clear to transparent, render the
actor's layer, run the rim/posterise pass, show the result on a billboard facing the camera. `cardDz` slides the
billboard toward the lens (a seated king's legs would otherwise sink behind the seat front). Lighting comes from the
room's lights plus `Actor.key` (warm, from the camera side, upper left) and `Actor.rim` (from `room.rim`).
Floor shadows: a soft blob, and the sprite's own silhouette projected onto the floor from `room.shadowSrc` (the
billboard's four corners projected through the light — cheap and correct for a flat sprite).

## 7. The scene manager (`engine/e06_scene.js`)

- `SCENE.enter(id, { x, face })` swaps room groups, applies the room's exposure, reflection and lens, shows that room's
  actors, rebuilds markers, schedules the static shadows, snaps the camera, calls `room.onEnter`.
  `SCENE.go(id, at)` does the same behind a 0.9 s fade (and pre-compiles shaders while black).
- **Camera rail:** x eases toward the player (+0.9 s of look-ahead), clamped so the frame never shows past the walls;
  height, look-at height and distance from `room.cam`; `room.camFocus` pins it.
- **Input:** arrows/A/D walk; E/Space/Enter uses the nearest thing (or moves a conversation on); Esc/P pauses.
  Pointer: hold more than 170 ms to walk toward the finger; a quick tap walks to that spot, or to the nearest ◇ within
  46 px and uses it on arrival. `SCENE.lock` (a counter) freezes the player during scripted moments; `SCENE.modal`
  marks an open panel.
- **Markers:** a white diamond with a gold heart over each interactable within 4.2 m of the player, hidden for the
  first 4.6 s of a room (the caption) and during conversations; the one in range grows. `SCENE.pulse(it)` makes one
  throb and show from anywhere (the door does this for the crown).
- **Speech:** `SCENE.say(actor, text, { wait })` → a promise; bubbles sit over the speaker's head, size themselves to
  two balanced lines, keep inside the frame and point their tail at the speaker. `SCENE.talk([[actor, text], …])` plays
  a conversation that waits for a tap/E per line. `SCENE.cycle(key, lines)` rotates through alternatives.

## 8. Holding court (`game/g50_court.js`)

The flow: walk to the throne → `COURT.sit()` (walk to it, climb the dais with `moveTo3`, sit) → on the first visit
`COURT.run()`: the steward opens court; for each petition the steward announces it, the great doors open, the
petitioner walks to the spot before the dais, bows, speaks; **the petition panel** opens; the result plays; they leave.
After the last one, **the week ledger** shares the week's Prosperity out and pays wages. Rise with the ◇ over the throne.

A petition is data:
```js
{ who: 'marta', name: "Marta, a miller's widow", ask: 'Clear the bandits off the old mill road.',
  need: 4, cells: 8,                       // fill 4 of 8 slots to meet it; each slot past 4 is +1 Prosperity
  fit: { commander: 2, spymaster: 1 },     // what one action from each agent is worth for this request
  effects: { 5: 'wound', 7: 'bonus' },     // slot 5 wounds whoever fills it; slot 7 adds +1 Prosperity
  stewardIn: 'Marta, of the lower mill.', intro: [lines], yes: [lines], short: [lines], no: [lines] }
```
Rules as built: slots fill in the order help is sent, so effects land on whoever filled that slot. Granting with
enough help: Prosperity += 1 + spare slots (+1 per bonus slot reached). Granting short: Prosperity −1 (agents and
items are still spent). Refusing costs nothing. Agents have action points for the week (3 each); a wound means one
fewer next week. Items are single-use. The week ledger splits Prosperity between Gold, Stores and Mood, pays one gold
per agent, and restores actions.

The numbers and texts are placeholders to be rebalanced and rewritten. `COURT.TALK` holds what the steward, queen,
commander and spymaster say before and after court.

## 9. Content as it stands

**The bedchamber** (`g20_bedroom.js`): four-poster with gold curtains and a scalloped valance, window with evening sun
and light shafts, chest, vanity with teal glass, chair, plant and urn, stone fireplace with crest, fire, grate, logs,
candles and books, cabinet with a fruit bowl, a domed trunk, a candelabrum, a table with jug, goblets and candles,
the standing oval mirror, **the crown on a velvet cushion on a pedestal**, the door to the throne room; embroidered
hangings, two paintings, a lattice hanging, red drapes and swags, three sconces, two rugs; foreground posts and a
candle table for the depth of field. Interactions: hearth, bed, window, chest, vanity, cabinet, table, mirror (says
whether the crown is on), crown (pick up / put back), door (refuses until the crown is on, then fades to the throne room).

**The throne room** (`g30_throne.js`): 27 m hall in six bays between stone pilasters with torches; the arch back to
the bedchamber; two stained-glass windows with cool light and shafts; bench and halberd racks; bookcase, embroidered
hanging, lectern; a three-step dais with a carpet up the middle, the throne (tufted red velvet in a gilt frame, gilt
arms with finials, a crown on top), the royal swan banner and two blue banners, floor candelabra and a spotlight on
the throne; the council table with a map, a candle, books and a goblet; the great doors (they open for petitioners),
a shield display; two iron chandeliers; a red runner the length of the hall; marble floor; foreground columns and a
brazier.

**The cast** (`g40_cast.js`): the king (dark coat, fur collar, white tabard, the crown once he takes it), the queen
(blue gown and shawl, small crown, arms folded), the steward (long green robe, gold sash, a scroll), two guards (red
livery over mail, white tabard with the green swan, kettle hats, spears), Ser Bogdan the commander (fur collar,
steel pauldron), Ilka the spymaster (dark dress and shawl), and the petitioners Marta (brown dress, apron) and Tomasz
(green coat).

## 10. Recipes

**A new prop.** Paint it in the room's paint file and draw it in the layout:
```js
PX.def('lute', () => { const p = new Pix(14, 30); /* … paint … */ return p.outline(null, 0.65).tex(); });
BUILD.card(PX.T.lute, 4.2, 0.86, 0.4);       // standing on a table top at y = 0.86
```

**A new room.** Copy `g30_throne.js`'s skeleton into `g60_<name>.js`, add a painter file `g12_paint_<name>.js`, call
`<NAME>.build()` in `g90_main.js` (with a loading message), link it with an interactable that calls
`SCENE.go('<id>', { x, face })`, and give the other room a way back.

**A new character.** Add a spec to `CAST.specs` (copy the closest one), `home: '<room id>'`, x/z/y/face. To make them
talkable: `room.interact(id, a.x, a.y + headY + 0.45, room.KZ, 0.75, () => SCENE.say(a, '…'))` (see
`COURT.enterHall`). Each actor costs one layer; layers 3–31 allow 29 actors in total.

**A conversation.**
```js
await SCENE.talk([[CAST.A.steward, 'Your Grace.'], [SCENE.player, 'Not now.']]);
```

**A petition.** Append an object to `COURT.PETS` (and a petitioner spec in `CAST.specs` with `offstage` handling as
in `CAST.build`). No other code changes.

**New clips or outfits.** Add names to `MESHES`/`CLIPS` in `tools/trim_assets.py`, re-run it against the kit's
`engine/assets` folder, rebuild. The kit's full list: 60 clips (sword, pistol, spells, sitting, push, death …), the
ranger and peasant outfits for both bodies, 8 hairstyles.

## 11. Testing and debugging

- Headless screenshots: `cd tools && npm install` once, then
  `Q='?test&room=throne' node shot.js ../build/index.html ../out/name '[["wait",3000],["shot","a"]]'`.
  Steps: `["wait", ms]`, `["key", code, holdMs]`, `["press", code]`, `["tap", x, y]`, `["eval", "js"]`, `["shot", "name"]`.
  Env: `W`, `H` (CSS px), `DPR`, `TOUCH=1`. Console messages and page errors are printed.
- `?test` keeps the drawing buffer and runs the game clock in fixed 1/60 s steps to keep pace with real time
  (software WebGL runs at a few frames per second). `SCENE.step(n, dir)` advances n steps with a held direction and
  returns the player's state, for exact positioning.
- Driving a conversation from a test:
  `(async()=>{ for(let i=0;i<160 && !SCENE.modal;i++){ SCENE.advance(); await new Promise(r=>setTimeout(r,400)); } })()`.
- URL flags: `?room=throne`, `?x=3.2`, `?crown`, `?q=low`, `?nofx`, `?fps`, `?nooutline`.
- Draw calls: `R.r.info.autoReset = false; R.r.info.reset(); SCENE.render(); R.r.info.render`.

## 11b. The outdoor kit, families and the map (added with the garden and the yard)

- **`engine/e08_outdoor.js`:** besides sky, rain, lightning, flocks and water, it now has these:
  - `BUILD.leaves({ n, box, tex })` for falling leaves that tumble and drift.
  - `BUILD.critters(tex, spots, { shy, sound })` for ground birds that idle, peck, hop and fly off when the king walks
    through them, then come back.
  - `BUILD.pool(tex, x, y, z, r, { seg })` for an animated round basin that lines up with an 8-sided `BUILD.cyl`.
  - `BUILD.rainK(room, k)` sets every rain curtain in a room at once (rooms can have a far and a near one).
- **Actors:** the animation blender normalises layer weights, so the idle now gives way as a sit comes in (before,
  "idle 1 + sit 1" became a half-crouch; Halina on her bench and the king on his throne both sit properly now).
  `idleRange: [t0, t1]` loops only part of a clip (the young prince holds the middle of a kneel). Homes can carry
  `sit`, `wander` and `routine` per room (Kazik wanders by the fountain and throws crumbs; Zofia drills at her post).
- **Moving talkers:** a room's `onUpdate` moves an interactable's `x`/`p.x` to follow its actor. Add interactables in
  `onEnter`, then call `SCENE.buildMarks()`.
- **Sound:** `thud` (wood on straw) joins `clang` for the yard and the garden.
- **The map (`engine/e11_map.js`):**
  - It is painted on first open.
  - `MAP.snap(roomId, pose, w, h, prep)` renders any room offscreen (tone-mapped, actors hidden) and returns its
    pixels. `prep(room, on)` switches the room into "map light" (`EXTERIOR.mapLight`: daylight, no rain or glows).
  - `game/g60_map.js` photographs the title fortress and inks it like a hand-coloured engraving. That means
    posterised colour on the paper, ink on every edge and hatching in the shadows.
  - Around it is painted country: an irregular mountain range, the Wood, the river and town, fields, roads, a
    compass and a scale.
  - Pins for rooms anchor to 3D points in the fortress (`at3`), projected through the photo's camera; `side: 'l' | 'r'`
    puts a label beside its pin.
- **The rooms, as built:**
  - Garden: `game/g13_paint_garden.js` (painters) and `g24_garden.js` (room, family talk).
  - Yard: `g14_paint_yard.js` and `g25_yard.js` (room, sparring choreography, talk).
  - Both sit inside the title fortress too (`g21_exterior.js`), so the map shows them where they are.

## 12. Performance budget and devices

Measured at 2000×700: bedchamber ~300 draw calls per frame (sprites + reflection + scene + post), throne room ~420
with nine characters (~173k triangles). Phones with a modern GPU (a Galaxy Z Fold 4's Adreno 730, recent iPhones)
are comfortably inside that. The automatic low-quality switch covers slower ones. On a 120 Hz screen the game uses
the real frame time, so motion stays smooth.

Biggest costs, in order: the scene pass (fill rate at full resolution), the reflection pass (a second scene render at
half resolution), the depth-of-field gather (~70–100 taps at half resolution). Cheap: sprites (each actor is ~10 draw
calls into a 48×77 target), bloom, the final pass.

## 13. Known limits and next steps

- Characters don't cast real shadows into the room's shadow maps (by design, §3); they have contact shadows and a
  projected silhouette from one source per room.
- Sitting uses one generic clip; the seat offset (`seat.drop`, `cardDz`) is tuned by eye for the throne.
- No audio yet. Music and room ambience would go in a small `engine/e07_audio.js` started from the first tap.
- No saving: the week's numbers live in memory. `localStorage` would hold a save slot.
- Petitions, agents, items and their numbers are first-pass placeholders, as are all the lines.
- Next rooms that fit the engine as is: the council chamber from the reference (bookcases, green window, the queen and
  agents at a table), a courtyard (open sky = a gradient card behind the arches), the town gate.

## 14. Credits and licences

Characters, outfits, hair and animation: Quaternius (CC0), via the character kit. three.js r160 (MIT). Fonts: Alegreya
and Alegreya SC (SIL OFL) from Google Fonts. All pixel art, layouts, characters' names and lines in this folder are
original to this project.
