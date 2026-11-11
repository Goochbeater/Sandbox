# The Grace engine — how this demo is made

This is the working manual for the demo in this folder: a 2.5D, *Yes, Your Grace: Snowfall*-style kingdom game that
runs in a browser (phone or desktop) as **one self-contained HTML file**. It explains every system, the numbers that
make the look work, and the recipes for adding rooms, props, characters, conversations and petitions, so a new session
(human or Claude) can pick it up cold.

**House rules for every change** (they are why the rooms look the way they do; `CLAUDE.md` in this folder repeats them):
1. **Write it down here.** Every new room, system, helper or rule gets its section in this file in the same commit, with the
   numbers that made it work and the mistakes that were made on the way. A future session must be able to build the next
   room from this file alone.
2. **The throne room is the bar.** Measure every new room against it with the eval in §13b and look at the frames side by side.
3. **Nothing stands on a walking line.** `SCENE.walkCheck()` must return `[]` in every room (§13e).
4. **Look before you claim.** Render the default framing, a close view and the far side of the room headlessly (§11),
   read the page log for errors, and drive every new interaction to its end (`SCENE.lock` back to 0).
5. **Adult content stays inside its rules** (§13c): adults only, behind the 18+ gate, the king's penis never shown.

**If you are an agent picking this up** (ten minutes of reading that saves an hour):
- Build: `bash build.sh` → `build/index.html`. It refuses syntax errors and duplicate `PX.` / `BUILD.` / `SCENE.` … names.
  Files load in name order (`engine/e*.js`, then `game/g*.js`): a later file may use an earlier one's globals, never the reverse
  at load time.
- Look: `tools/shot.js` (§11). Use `?test&room=<id>`; add `&catchup=4` and `W=800 H=357 DPR=1` for anything long. Wait on
  state, not on time. Read the page log every run: a shader or script error shows only there.
- The game's spine, in order: title and opening (`g22`) → weeks of court (`g45` calendar, `g50` court, `g51` realm) → the
  festival (`g36`–`g39`) → the feast (`g46`) → the investigation (`g48`) → the battle (`g49`) → the endings (`g52`). Adult
  scenes: `g26` (bed), `g27` (positions), `g29` (confessional), `g42`–`g43` (the House).
- State that must survive a reload goes in `GAME.reset` / `GAME.state` / `GAME.load` (`g22`). Each system has `reset`,
  `state`, `load` of its own; add yours the same way.
- A room can only build inside `build()`. Anything shown later is built there hidden. Anything that moves is `dyn`.
- Before you say something works: every room boots with no page errors, `SCENE.walkCheck()` is `[]`, and the interaction
  you added runs to its end with `SCENE.lock` back at 0 (the room loop in §13o is the regression).
- The regression lives in the repo: `node tools/regress.js` (all suites) or `node tools/regress.js rooms` (§13t). Run it
  before every commit; add a suite when you add a system.
- Handing work to smaller, cheaper agents is §13u: what to delegate, the packet, and what always stays with the lead.

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
13b. Matching the throne room's quality (how the chapel was made)
13c. Adult scenes and poses (the night, the confessional)
13d. Who can see what: partitions, scene light, separate sprites
13e. Outdoor backdrops, dark interiors, and the walking line (the wood and the hut)
13f. Animals you can pet (`BUILD.pet`)
13g. Moving the king: pace, jogging, the Settings
13h. The Swan Festival: three connected grounds, shows, a lazy cast
13i. The House of the Lantern: a disguise, a second bed, the night scene as a stage
13j. Animals: CC0 models through the people's sprite pass
13k. The calendar
13l. The feast
13m. The investigation
13n. The battle (a preview)
13o. A full polish pass, and what it found
13p. The picture: bokeh depth of field, occlusion, rack focus, the grade
13q. Adult scenes: the rhythm, the positions, the lens
13r. The realm: weeks, the court's queue, the ledgers
13s. The endings
13t. The regression suites
13u. Working with worker agents
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
floor shadows), 3…31 = one per actor in the current room, 1 = parked (no camera draws it). Lights are enabled on all
layers so they light rooms and actors alike; two special lights (`Actor.key`, `Actor.rim`) are enabled only on actor layers.

**Layers are dealt per room.** There are only 29 actor layers, and the cast outgrew them (23 actors by the chapel, a dozen
more for the festival, six for the House of the Lantern). So `SCENE.enter` calls `Actor.assignLayers(roomId, player)`: the
player gets 3, then every actor whose `home` or `homes` include the room gets the next layer, shown or offstage (the
petitioners must have one before they walk in), and every other actor is parked on layer 1. An actor that a scene shows in
a room it doesn't live in (the queen in the bedroom at night) takes the first free layer in `setVisible(true)`
(`Actor.claimLayer`). Parking matters because `setVisible(false)` hides an actor's card but not its model: two actors on
one layer would draw into each other's sprites. A room can hold 29 actors; the whole cast can be any size. If an actor
is ever drawn on layer 1, `render` skips it and warns in the console: give it a home in that room.

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

**The chapel** (`g28_chapel.js`, painters `g16_paint_chapel.js`; the confessional scene in `g29_confessional.js`): nave
with flagstones, damask walls, pilasters with torches and banners, statue niches, lancet windows and a rose, the reredos and
altar, pews, a stoup, the confession screen and the confessor's desk. Saintess Dorota, the priest, the queen and two castle
guards. Reached from the garden cloister. §13b, §13c, §13d.

**The wood** (`g34_wood.js`, painters `g17_paint_wood.js`): an afternoon clearing west of the castle. Three painted forest
rows, Bogdan's archery butts, the fishing hole with a dock, Halina's blanket under the old oak with a basket, Bogdan's hound
(a 3D animal, pettable), a grazing stag, Zofia's post, Kazik, two guards on their rounds, a fence. The path at the far left leads to the hut.

**The Woman's hut** (`g35_hut.js`): wattle walls, a stone hearth with a violet cauldron, a runed rug, herbs on cords, a shelf
of jars, a crystal orb, a skull, the barrel with the black cat (pettable), cobwebs, lanterns and candle stands, the window
onto a moon that isn't the moon. Only the king goes there. §13e, §13f.

**The Swan Festival** (`g36`–`g39`, painters `g18_paint_fest.js`, people `g41_cast_fest.js`): three grounds on the meadow
below the fortress. The fair (stalls, the ale tent, the Salamanders' stage, the bear's pen, the puppet booth, the hammer,
the fortune teller's wagon, the maypole); the lists (the tiltyard, the royal stand under its canopy, the commons' stands,
the heralds' tower, the archery butts); the pavilions (the river and the League's barge, Gniewomir's pavilion, Wiesława's
tent, the horse lines, the black tent). §13h.

**The House of the Lantern** (`g42_lantern.js`, painters `g19_paint_lantern.js`, people `g43_cast_lantern.js`): Wanda's
house in the river quarter, reached by the old tunnel from the chapel's crypt stair, where the king goes as the Falconer.
The common room (the cellar arch, the counter and bottles, two tables of drinkers, the hearth, the lute player, the river
window, the gallery with six painted doors and the stair) and a woman's room upstairs, dressed for whoever he goes up
with. Wanda, Róża, Nadia, Hanna, Lena, Agata, a docker and a League clerk. §13i.

**The feast** (`g46_feast.js`, people `g47_cast_feast.js`): the throne room's hall dressed for the festival's last night: the
high table on the dais, the lower tables, the sideboard, the Swan Cup, the Salamanders in the hall, the death of King
Gniewomir. Reached through the bedchamber's door on festival day 3. §13k, §13l.

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
`COURT.enterHall`). Layers are dealt per room (§3), so a room can hold 29 actors and the cast can be any size. Give every
actor a `home` or `homes` entry for each room it appears in.

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
  (software WebGL runs at a few frames per second). It catches up at most 0.5 s per frame; at full size a software frame
  takes about 1.5 s, so long scenes (the feast) run three times slower than real time. `&catchup=4` lets a frame step up
  to 4 s, and `W=800 H=357 DPR=1` makes frames several times cheaper: use both for anything scripted and long, and run it
  in the background. A screenshot itself takes a second or more, so fast motion (the joust at 9 m/s) has left the frame
  by the time it's grabbed: slow the motion for the test (`LISTS.COURSE_S`) rather than trusting the frame. `SCENE.step(n, dir)` advances n steps with a held direction and
  returns the player's state, for exact positioning.
- Driving a conversation from a test:
  `(async()=>{ for(let i=0;i<160 && !SCENE.modal;i++){ SCENE.advance(); await new Promise(r=>setTimeout(r,400)); } })()`.
- URL flags: `?room=throne`, `?x=3.2`, `?crown`, `?q=low`, `?nofx`, `?fps`, `?nooutline`; `?room=bedroom&night`
  (or `&night=ride|missionary|behind`) starts the night scene at once. Without `&night` the bedroom loads normally.
- Draw calls: `R.r.info.autoReset = false; R.r.info.reset(); SCENE.render(); R.r.info.render`. Reading
  `R.r.info.render.calls` after the frame gives 1 (the post pass resets it), so always use the reset-and-render form.
- **Wait on the game's own state, not on a timer.** Headless frames are slow and game time lags real time, so a
  `["wait", ms]` can land before or after the moment you want. Poll instead, in one `eval` that returns a promise:
  `new Promise(r => { const f = () => (cond() ? r(JSON.stringify(state())) : setTimeout(f, 50)); f(); })`.
- **Use an interaction from a test:** `SCENE.use(SCENE.room.inter.find(i => i.id === 'cat'))` runs it as if tapped (it
  skips the lock check that real input has, so don't call it while another interaction is running).
- **Sound runs headlessly:** `AUDIO.unlock()` gives a `running` context in headless Chromium, so a new synthesised
  effect can be called once to prove it doesn't throw.
- **Panels on a phone:** check a new menu row at `W=780 H=360 TOUCH=1` and compare the panel's `scrollHeight` with
  its `clientHeight`; the game is landscape-only, so portrait shows a "turn your phone" card.

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
- Audio (`engine/e07_audio.js`) and the save slot (`engine/e10_save.js`, `GAME.state` / `GAME.load` in `g22_title.js`)
  exist. Every new piece of story state must be added to `GAME.reset`, `GAME.state` and `GAME.load`, or it is lost on reload.
- The character kit has 15 clips (§6) for people: no eating, no dancing, no riding (a knight in the saddle is `Actor.sit`,
  §13h). Animals are CC0 3D models with their own clips (§13j); there is no bear (he is the hound reshaped).
- Petitions, agents, items and their numbers are first-pass placeholders, as are all the lines.
- Next rooms that fit the engine as is: the council chamber from the reference (bookcases, green window, the queen and
  agents at a table), a courtyard (open sky = a gradient card behind the arches), the town gate.

## 13b. Matching the throne room's quality (how the chapel was made)

The throne room is the bar. Every new room is measured against it, in the same browser, with the same eval. Run this with
the room on screen (`?test&room=<id>`), then compare the numbers and a screenshot of each side by side:

```js
(() => { let mesh = 0, n = 0, sh = 0, pt = 0, sp = 0, hemi = 0;
  SCENE.room.group.traverse((o) => { if (o.isMesh) mesh++; if (o.isLight) { n++; if (o.castShadow) sh++; if (o.isPointLight) pt++; if (o.isSpotLight) sp++; if (o.isHemisphereLight) hemi++; } });
  R.r.info.autoReset = false; R.r.info.reset(); SCENE.render(); const calls = R.r.info.render.calls; R.r.info.autoReset = true;
  return JSON.stringify({ meshes: mesh, lights: n, castShadow: sh, point: pt, spot: sp, hemi, drawCalls: calls, exposure: SCENE.room.exposure, reflK: SCENE.room.reflK }); })()
```

As built, the throne room measures 84 meshes, 18 lights (2 of them shadow-casting spots), 294 draw calls, exposure 0.92,
reflK 0.85. The chapel reached 79 meshes and 18 lights (2 shadow-casting) after the pass; its draw-call count depends on
what is in the room, so measure it again rather than trust a number written down here.

**Why the throne room looks good, and what to copy.** Each of these is a deliberate choice in `game/g30_throne.js` and
`game/g11_paint_throne.js`:

1. **Foreground framing.** Two stone piers and a brazier stand at z ≈ 7, between the lens and the walk line. The depth
   of field blurs them, which gives the room depth. Put two or three objects 3.5–5 m in front of the walk line.
2. **Warm light on every bay.** Each pilaster carries a torch: `BUILD.card(T.sconce, …)`, a `BUILD.flame`, a
   `BUILD.glow`, and a flickering `BUILD.light`. A torch at each bay does more than one big warm lamp.
3. **Shadow-casting spots.** Two of them, each made with
   `BUILD.shadow(BUILD.light(new THREE.SpotLight(…), x, y, z), R.q === 'low' ? 512 : 1024)` and a `target` set by hand.
   The chapel's are the light through the rose onto the altar and the cool light of a saint's window.
4. **Surface rhythm, not noise.** Walls carry a repeating pattern with a boss at every crossing (`PX.def('chWall')`, the
   same construction as the throne's damask), a carved wainscot one plane 1.4 m tall (`T.hallWainscot`), and a frieze band
   (`T.frieze`, 0.31 m). Do not build a surface from noise indexed by one diagonal: the chapel's first plaster used
   `noise1(x*0.11 + y*0.07)` and showed diagonal streaks on every wall.
5. **Dressing.** Banners on gilt rods, a bench, a lectern, statues in stone niches, candle stands. The throne has 84
   meshes; a room that feels bare is usually under 70.
6. **Exposure and reflection.** Exposure 0.92 and `reflK` 0.85 on the throne. Two light shafts per window, not one.

**Process.** Build, then look at three frames: the room at its default framing, a close view, and the view with the king
moved to the far side of the room (things out of the default frame are easy to forget). For a close view, set
`SCENE.room.cam.dist = 6; SCENE.room.cam.y = 1.45; SCENE.room.cam.look = 1.25` and hide the others with `a.setVisible(false)`.

**Pitfalls seen on the chapel.**
- A piece beyond about ±8 m from the default camera position is out of frame. Check it by moving the king to x ≈ −6.5.
- A stall-end card placed between the lens and a seated actor hides that actor completely. Put cards behind the people
  they frame, not in front of them.
- `SCENE.cycle(key, lines)` throws when `lines` is undefined. A room keeps its scenery lines in `LINES` and its talk in
  `TALK`; an interaction must read the object its text lives in. The first guard talk threw for this reason.
- A sprite is 48×77 px. A higher `DPR` does not add detail; a larger object or a closer camera does.

## 13c. Adult scenes and poses (the night, the confessional)

The adult scenes are built from parts that every scene reuses:

- **`engine/e13_body.js`**: the bare body. `Actor.makeBare()` builds the full body on first use, `Actor.bareTex` paints
  the anatomy onto it, `Actor.genitals` builds the men's parts, and `setArousal(0..1)` sets them. Only the two adult
  characters in a scene ever call it.
- **`engine/e14_pose.js`**: procedural poses. A pose is data: `at` (the pelvis, in world space), `up` and `fwd` (the body's
  axes, in world space with `world: true`), limb chains as `[dir, dir]` or as IK targets `{ ik: [x,y,z], pole: [dx,dy,dz] }`
  (the hand point, and the direction the elbow or knee points), and an optional `pin`. `POSE.drive(actor, fn, dur)` blends
  the body into the pose and then re-evaluates `fn` every frame; `POSE.release(actor)` returns the body to the clips.
- **`game/g27_lovers.js`**: the bed's five positions, `LOVERS.pose(name, ph, k, A)`. The helpers are the ones to reuse:
  `LOVERS.stroke(ph)` is the in-and-out curve (0 to 1, a quick push and a slower draw back), `LOVERS.entry(Q)` is her
  entry point, `LOVERS.rod(K, depth)` is a point up his shaft, and `LOVERS.at(a, bone, p)` is a body point riding a bone
  (for hands on hips).
- **`game/g26_night.js`**: the scene flow for the bed. `NIGHT.confirm` is the 18+ gate (a flag kept in localStorage under
  `swan.age18`), `NIGHT.ask(opts)` is the choice strip (keys 1..n work too), `NIGHT.bar` and `NIGHT.setPace` show the
  strip, `NIGHT.tick` runs the rhythm, the breath and the lines, and `NIGHT.play` runs fade → makeBare → undress → bed →
  kiss → position → finish → morning.
- **`game/g29_confessional.js`**: the standing scene in the chapel (`CONF`). It reuses the gate, the choices, the strip,
  undressing, the pose driver, the stroke, the pins and the sounds, and writes only the standing pose.

**To add a position.**
1. Write `fn(name, ph, k, A)` returning `{ king, queen }`, as `CONF.pose` does. Use `world: true`. Set `at` on the
   pelvis, `up` and `fwd` for the body's axes, the hands as IK targets, the legs as `[[0,-1,0],[0,-1,0]]` for straight
   standing. A pole is a world direction.
2. Pin the body that moves: `pin: (a) => LOVERS.entry(Q, out).sub(LOVERS.rod(a, depth, out2))` moves his pelvis until his
   shaft meets her entry. `depth = lerp(0.035, 0.118, LOVERS.stroke(ph)) * (0.85 + 0.15 * k)`, as the bed uses.
3. Drive both bodies with `POSE.drive(actor, () => fn(…)[who], dur)`. The function is called every frame, so it must read
   the scene's current phase and intensity from state, not from its arguments.
4. Advance the phase with `ph += rate * dt` and read the curve through `LOVERS.stroke(ph)`. Arousal is
   `K.setArousal(0..1)`, eased toward a target each frame.

**Rules these scenes keep.**
- Only the adult characters are undressed or posed: the king, the queen, the saintess (twenty-nine), and the House of the
  Lantern's women (24 to 35; §13i). The scene code takes
  only the actors it is handed, and no child character is ever passed in. Zofia and Kazik are never a scene's actors.
- The player chooses. The king's bubble says what the player picked through `NIGHT.ask`, and the other characters speak
  their own lines. The bed scene's scripted king lines predate this rule; the confessional follows it.
- Undress in layers: `Actor.undress('outer')` hides the gown, collar and crown; `Actor.undress('all')` takes it to skin.
- A scene is gated before its first frame: `NIGHT.confirm(then)` for the bed and the house, `CONF.start()` for the
  confessional.
- The king's penis is never shown: after `undress('all')`, `K.sexGroup.visible = false`, in every scene.

**Testing a scene headlessly.** Set the age flag, the story state, and start the scene, then advance it with E and pick
with the number keys:

```
localStorage.setItem("swan.age18","1"); CHAPEL.flirt = 2; CONF.start();   // then press E to advance, 1/2 to choose
```

Check `CONF.inPose`, `CONF.k` (how far gone), `SCENE.lock` (back to 0 at the end) and the page log for errors.

**The confessional's lens.** The alcove is at the chapel's right wall (desk x 10–10.9, wall 12), and `SCENE.camGoal` won't
let the frame see past a wall: at the nave's lens the camera stopped at x 2.95 and the pair was a few pixels tall at the far
right. In the pose `SCENE.lens(room, { focus: 9.75, fov: 13.5, dist: 13, y: 1.95, look: 1.3 }, 1.8)` narrows and closes
in instead: the clamp now allows x ≈ 8, the pair sits 70% across, and the frame is about 3 m tall, so they fill most of it.
`CONF.end` puts the nave's lens back behind the fade (`SCENE.lens(room, null, 0.01)`). `SCENE.lens` (engine/e06) is the one
camera ease for shows and scenes: focus, dist, y, look and fov, the room's own kept in `room.cam0`; `FEST.cam` calls it.

## 13d. Who can see what: partitions, scene light, separate sprites

**A partition.** The camera is in profile, so a wall that separates a scene from the rest of a room must stand between the
lens and the scene. The confession screen is a box across the nave (`BUILD.box(7.5, 7.9, 0, 2.2, 0.9, 2.4, T.woodDark,
{ front: BUILD.std(T.chConfess) })`): its lattice end faces the lens and it stands clear of the walk line, so the king can
still walk past it. Put the people who should not see the scene on the far side. The chapel's castle guard moved from
x 8.1, inside the alcove, to x 4.6, in the nave.

**Scene light.** `CHAPEL.dim(on)` follows `BEDROOM.setNight` and `THRONE.night`. Every light keeps its built intensity in
`userData.base` (`BUILD.light` sets it), so dimming is undone exactly. A light with a flicker has its `base` changed too, or
the flicker would bring it back. The candle on the confessor's desk, `room.lights.candle`, is the only light on for the
scene, at 2.2. Exposure goes to 0.85 of the room's. Warm candles on the skin make it read orange under the sprite's
posterising; dimming fixes that, and it is why the scene dims before the bodies are shown.

**Separate sprites.** Every actor has its own sprite (its own camera and layer) by default. `Actor.hostInto(host)` puts a
body into another's sprite, with one depth buffer, so bodies that touch overlap correctly. The bed uses that, because its
two bodies fill one sprite. The confessional does not: in profile, one merged sprite became a single orange silhouette
and the king could not be read. Instead each body gets a sprite widened with `reframe(w, h)`, placed with `frame` (a world
point), with `cardDz` nudging its card toward the lens. Two rules keep this clean:
- Widen a sprite to take in the reach of the pose. Dorota's hands reach the desk's far edge, so her box is 2.6 m wide, and
  the king's is 2.0 m. A box that is too narrow cuts the hands off.
- Restore everything when the scene ends: `frame = null`, `reframe()`, `cardDz = 0`, `hostInto(null)`, `POSE.release` on
  both bodies, `dress()`, `setVisible(true)` for those who stay, removal of the scene's tick from `room.tick`, and the
  scene lock released (`SCENE.lock--`).

## 13e. Outdoor backdrops, dark interiors, and the walking line (the wood and the hut)

**The wood's forest (`game/g34_wood.js`, painters in `game/g17_paint_wood.js`).** The first pass put nine swaying pine
cards a few metres behind the clearing over a pale haze. It read as flat cut-outs on a wash. What works is painted rows of
trees, standing on the ground at three depths, each lower than the one behind it:

| Row | Painter | Card at | Size (w × h, m) | Tree tops | Colours |
|---|---|---|---|---|---|
| far | `forestFar` (1024×128) | z −160 | 288 × 36 | 11–26 m | haze blue-grey 0x7f9aaa, lit edge 0x9cb6c4 |
| middle | `forestMid` (1024×160) | z −100 | 128 × 20 | 8–17 m | green 0x3f5e58 / 0x5c7c6c |
| near | `forestNear` (1024×200), twice | z −40, −36 | 56 × 11 | 5–10 m | dark 0x1c3626 / 0x3c5c42 |

- `PX.treeRow(W, H, dark, lit, seed, spacing, hMin, hMax)` paints a row of conifers: ragged tiers on a short trunk, the
  left edge lit (the sun is in the west). Keep each card at its texture's aspect (w = h × W / H).
- **The sizes come from the lens.** With `fov` 19 the frame's half-height at distance d is d × tan 9.5° ≈ 0.167 d, centred
  near the look height. Distances run from the camera at z ≈ KZ + dist (22.4 here): the far row is 182 m away (frame top
  ≈ 33 m), the middle 122 m (≈ 24 m), the near 62 m (≈ 13 m). Each row's tallest trees stop below the frame top at its
  depth, so the sky shows between the tops. Lower rows in front and taller ones behind is what reads as depth.
- The rows are `basic` (unlit) cards: shaded by the sun they went muddy. The fog fades them further with distance.
- In front: two swaying pines at the edges (`BUILD.windCard`), and bushes (`bushPix`, s 2.2–2.6) a few metres behind the
  clearing, so the near row has something at its feet.

**The hut's light (`game/g35_hut.js`).** Violet light alone made a murky room: a near-black sky colour on the hemisphere,
violet point lights, and glows that read as smudges. The fix is the throne room's rig, with the colour kept in the accents:
- a warm, shadow-casting spot over the hearth (`SpotLight(0xffd8a8, 150, 0, 0.6, 0.8, 2)` at (0.4, 5.0, 2.8), aimed at the
  hearth), and a gold point light for the fire on the faces (`0xffa860`, 7);
- a hemisphere of 2.2 with a lilac sky (0x6a5aa8), and a lilac fill from the front (0xb8a8e8, 0.9), as the throne's
  blue fill;
- the violet stays in the brew, the orb, the window's moon spot (0xb4a0ff, 130), the lanterns and the shelf;
- a floor tint light enough to catch the light (0xb49ad4 on dark wood). A dark material under any light stays dark.
The hut went from 5 lights to 13. Faces now read warm, and the room still reads purple.

**Things that are black need a rim.** The black cat vanished against the dark wall, and the orb's bloom washed her out.
`PX.cat` paints a lilac rim on every edge that faces up or right (the light's side), and she sits on the barrel, away from
the orb. Keep small dark props out of a bright glow's bloom.

**The walking line.** The king walks at `room.KZ`; actors who wander walk at their home's `z`. A solid that crosses either
line puts people inside it: the first pond's rim reached z 4.1 and the guard (z 2.45) and the king (z 3.0) waded through
it; the hut's barrel (z 2.4–3.2) hid the king's legs. Rules:
- Keep a solid's front at least 0.15 m behind the line it stands behind (the hut's table: front 2.4, line 2.6), or put it
  well in front as foreground framing (≥ 3.5 m, §13b).
- `BUILD.box` and `BUILD.cyl` record every footprint in `room.solids` (cylinders as circles). **`SCENE.walkCheck()` lists
  every solid standing on the king's line or a wanderer's line; it must return `[]`.** All nine rooms pass (the wood and
  the hut only after the pond and the barrel were moved). A seated actor's bench is left out (they are meant to be on it), and so are things overhead (above 1.6 m).

## 13f. Animals you can pet (`BUILD.pet`, `Beast.petSpot`)

Every animal in the game is now a 3D `Beast` (§13j) and is petted with `beast.petSpot(room, o)` from the room's `onEnter`;
the sequence below is `SCENE.pet` (engine/e15), shared by both. `BUILD.pet(card, o)` (in `engine/e08_outdoor.js`) is kept for
a painted card, should one ever be wanted again:

```js
const cat = BUILD.card(T.catPix, -3.5, 1.1, 1.7, { s: 1.0, cast: false });
BUILD.pet(cat, { id: 'cat', label: 'Pet the cat', frames: [T.catPetPix], sound: 'purr', soundO: { dur: 2.6 }, headY: 0.85, dur: 2.8,
  says: HUT.CAT.says, lines: HUT.CAT.lines, onPet: () => HUT.petCat() });
```

What it does, in order: the king steps 0.8 m to one side of the animal (`o.stand`), so his body doesn't cover it; he
waits until he has stopped; he reaches (`Interact`) or kneels (`o.kneel`, `Fixing_Kneeling`); when the hand arrives, the
card swaps to its petted frames (cycled at `o.rate` per second for `o.dur` s) and leans and shivers, and the sound plays;
the animal "says" a line over its head (`o.says`); then `o.onPet()` may return its own conversation (the Woman on the first,
third and seventh pet, Kazik on the second pet of the hound), or else the king says one of `o.lines`.

Rules learned building it:
- **An actor moving faster than 0.2 m/s drops a one-shot clip** (`Actor.update`). Anything that walks the king and then
  acts must wait for him to stop, or the clip is dropped. The first version of `BUILD.pet` waited forever on a reach that
  had been dropped, and locked the game.
- **Sequence on the clip's own event, not on timers.** `act(clip, at, fn)` calls `fn` at `at` seconds of game time. A
  real-time `SCENE.wait` drifts from game time whenever frames are slow, so the bubble came before the hand. The helper
  also goes on if the clip is cancelled, so it can never hang.
- The card gets its own material and leaves the static batch (`userData.dyn`), so changing its frame touches nothing else.
  Petted frames must be the same pixel size as the card's texture. (The painted cat, hound, deer, bear and horses are gone:
  they read as flat stickers beside the 3D-lit people. §13j.)
- For a Beast the answer is a clip (`o.clip`: the horse's and hound's head-low idle, the cat's headbutt; `o.holdFor` s keeps
  it), a wag (`o.wag`, `o.wagFor`), a turn toward his hand (`lookYaw`), and `o.onReact(beast)` for anything else (the bear
  drops onto all fours). The marker sits over the animal at its own z, like a talk marker.
- Pet counts are story state: `HUT.catPets` and `WOOD.houndPets` are saved (`GAME.state`). So is `HUT.met`, which was
  not saved before, so the Woman's first talk replayed after every reload.
- Sounds: `purr` (brown noise under a 260 Hz low-pass, beaten at about 25 Hz, in two breaths), `meow` (a sawtooth whose
  pitch and formant rise and fall; `o.pitch`), `pant` (paired breaths of filtered noise). The hut plays a meow as you walk in.

## 13g. Moving the king: pace, jogging, the Settings

- **Speed.** `Actor.speedK` multiplies an actor's speed; it is 1 for everyone except the player. Each frame
  `SCENE.update` eases the king's toward `walkK × jog`, where `walkK` is the Settings slider (70–160 %, step 5).
- **Jogging (×1.75, `SCENE.JOG`):** while Shift is held; on touch, by how far from the king the finger is held
  (`smooth(0.22, 0.38, distance / view width)`, so a hold near him walks and a hold near the screen's edge runs); and,
  with "Long walks: Jog" on, on the way to a tapped spot more than 3.5 m away (he slows to a walk for the last stretch).
- **Scenes keep their own pace.** While `SCENE.lock`, a modal or a cutscene is on, `speedK` eases back to 1, so scripted
  walks and their timing are untouched.
- **The jog clip.** Past a brisk walk, `Jog_Fwd_Loop` blends in by ground speed (`smooth(1.55, 2.1, speed)`), with its
  own phase matched to ground speed as the walk's is.
- **Stored** in localStorage under `grace.move` (`{ walkK, autoJog }`). The slider and the toggle are in Settings
  (`walkSpd`, `jogBtn`); the toggle shares a row with Quality and Effects, so the panel still fits a 360 px-tall phone.
- Measured headlessly in the throne room: walking 1.0 m/s; Shift, and a tap 16 m away, both ramp to 1.75×; the slider
  at 150 % gives 1.5×; under a scene lock, Shift has no effect.

## 13h. The Swan Festival: three connected grounds, shows, a lazy cast

**Files.** `game/g18_paint_fest.js` (painters), `g36_fest.js` (`FEST`: what the grounds share, the state, all the talk),
`g37_fair.js` (`FAIR`), `g38_lists.js` (`LISTS`), `g39_camp.js` (`CAMP`), `g41_cast_fest.js` (the festival's people). The
story is `STORY.md` §6. The map's **Swan Meadow** pin leads to the fair; gates at each ground's ends lead to the next
(fair ↔ lists ↔ pavilions), each a `SCENE.go` to the other ground's near end.

**One kind of room, made three times.** `FEST.room(id, title, sub, more)` makes a 32 m meadow strip with the yard's lens
(walk line z 3, `dist` 19.4, `fov` 19), haze, `far` 420 for the backdrop. Then:
- `FEST.backdrop(room, { fx, town, tents })`: the meadow, a summer sky (`skySummer`, mostly blue: a cloud threshold of 0.76),
  a haze row of trees, the hill (`BUILD.terrain`, 16 m high at z −230) with the Swan Fortress on it, built with the yard's
  architecture kit (curtain wall, crenels, gatehouse, four drum towers with red cones, the hall's roof, the keep, the
  chapel's spire, pennants), trees at its foot, the town's roofs to the west (`town`), and a sea of tents with flags.
  Distances follow §13e: at 250 m the frame's top is about 44 m up, so a 16 m hill with a 24 m keep fills the upper half
  and leaves sky either side.
- `FEST.lights(room)`: the garden's sun rig (hemisphere 1.35, a shadow-casting sun 3.3 from the west, a fill), plus point
  lights only where something burns (the stage's torches, the grill, the campfire, the pavilion's candle).
- Stalls (`FEST.stall`: four poles, a sloping striped awning, a shallow valance — 0.42 m, so it clears the wares — and
  the painted counter), bunting (`FEST.bunting`), smoke (`FEST.smoke`: sprite puffs that rise and fade; `smokeSoft` is a
  sprite texture with no pixel size, and as a card it made NaN geometry), tents (`BUILD.tent`).
- Painted crowds (`PX.crowd`: heads and shoulders in market colours, some arms up) on every tier and behind every stall.
  They're what makes a ground feel full; actors are expensive, painted people are free.

**New engine helpers** (`engine/e08_outdoor.js`):
- `BUILD.anim(tex, x, y, z, o)`: a card showing one frame of a strip (`tex.userData.n`), `set(f)`, or `o.rate` to cycle on
  its own. The bear's dance, the puppets, the jousters' gallop, the fire blasts.
- `BUILD.tent(x, z, r, h, rh, wall, roof, o)`: a round pavilion, open at the front by `o.open` radians so the inside shows,
  a cone roof, an optional scalloped valance and pennant; its footprint goes into `room.solids` as a circle.
- Sounds: `cheer`, `fwoosh`, `fanfare`, `crack`, `hooves`, `snort`.

**The cast is lazy.** Every festival spec has `lazy: true`. `CAST.build` skips them at boot; `CAST.ensure(roomId)` builds
the lazy actors who live in a room the first time the king heads there. The engine calls it through `SCENE.prepare(id)`
(`SCENE.beforeEnter`), which every way into a room awaits: `SCENE.go` behind its fade, Continue, and a `?room=` link at
boot. With per-room layers (§3), a ground can hold 29 actors; the fair holds 14.

**Built ahead, in calm moments** (`CAST.ahead`, `CAST.make`, g40). The first entry to a ground used to wait behind the fade
while its fourteen people were built. Now a 250 ms timer builds one lazy actor whenever the king has stood still for 0.8 s
with no lock, menu, cutscene, night scene or title, the rooms next door first (`CAST.NEXT`: the fair from the castle rooms,
the lists from the fair, the House from the chapel…), then everyone else. Measured headless: 30 of the 41 lazy actors were
built in 30 s of standing in the garden, and `SCENE.prepare('fair')` then took 0 ms. Two rules make it safe:
- `CAST.make(k)` is the one way an actor gets built, shared by the room being entered and the builder ahead (an in-flight
  promise per key), so nothing is built twice.
- A new actor is parked (`setLayer(Actor.PARK)`) and hidden at once, and `Actor.build` / `Beast.build` keep `root.visible`
  false until its layers are set. While a model is being assembled its meshes are on layer 0, the main camera's: built
  behind a fade that never showed, but built mid-room it would flash at the world origin, or draw into the sprite of
  whoever holds the layer it was born with.

**Returning characters.** An actor's `offstage` is global, and its props are fixed when it's built. So Marta, a petitioner
(offstage everywhere but court), has a festival copy `martaFair`, and Bogdan has `bogdanLists`, with a sword. The pattern
is `hutWitch`'s: `Object.assign({}, CAST.specs.x, { id, lazy, home, homes, … })`. An actor with a `home` and no `homes`
(Dorota) needs a `homes` entry for every room once it gets a second one, or it keeps the last room's position.

**Shows.** Each activity is an async function that takes the lock and gives it back in `finally`:
1. `FEST.stepTo(x, lookX)` walks the king to the side first. Standing where he was, he blocked the duel and the stage.
2. `FEST.cam(room, { focus, dist, y, look }, dur)` eases the lens in; `FEST.cam(room, null)` eases it back.
3. Everything a show shows is built with the room and hidden (the fire blasts, the lance shards, the unhorsed knight):
   `BUILD.*` only works inside `build()`, because it adds to `BUILD.room`.
4. Timing runs in the room's `tick` (game time); a tick removes itself with `room.tick = room.tick.filter((g) => g !== f)`.
5. Choices use `NIGHT.ask` (`FEST.ask`), which works outside the adult scenes. Speakers that aren't actors (the puppets)
   are `FEST.voice(x, y, z)`. The timing games use `FEST.meter(label)`, which resolves 0..1 (the gold zone is at 86 %).

What there is to do, by ground:
- **Fair:** the Salamanders spit fire (three blasts, then all three; each blast is a `blast` strip on a basic card at
  k 3.2, pivoted so its root sits at the sister's mouth, and a flash light on the stage); the puppet play (King Radish and
  the river-wife; laugh or have it stopped); the strongman's hammer (the meter; the puck flies; the bell); the bear (pet him,
  or buy his freedom for Kazik: he turns up in the wood, pettable, and the Woman mentions him); ribbons (for Halina, for the
  saint, or nobody); honey cakes; the fortune teller (the Woman in another face); Marta, Bartosz, the sisters, the town.
- **Lists:** the duel on foot (Bogdan against Ottokar, the yard's bout choreography; whoever holds the king's favour wins);
  the joust (three courses of painted riders; the black knight unhorses the prince on the third); the king's favour; the
  Queen of Love and Beauty; the royal stand (Halina, Gniewomir and Wiesława seated far back: their talk markers sit at their
  own z, over their heads).
- **Pavilions:** the Pact (sign tonight, sign after the feast with changes, or refuse); arm-wrestling the prince (two pulls
  on the meter); the grey destrier (pettable); Jarek, Wiesława and Ottokar, the squire, the soldiers.

**The joust is 3D** (since the animals, §13j). Each side is a destrier `Beast` in a caparison (`joustHorseK`, the grey in red
and white; `joustHorseB`, the bay dyed black with a black cloth and a white swan) and a knight `Actor` in the saddle
(`joustK`, `joustB`: helmet, tabard, the couched `lance` prop). `LISTS.mount` seats each knight with `Actor.sit` on a saddle
1.72 m up, 0.34 m nearer the lens than his horse so his sprite draws over it; `LISTS.ride` (the room's `onUpdate`) keeps
`sitting.x` on the horse every frame. A course (`LISTS.course`) holds both horses in `Gallop` (`held`, `gaitK` 1.5: a driven
animal sets its own clip speed) and drives their x along lanes either side of the tilt (z −2.35, −3.65), `LISTS.RUN` 10 m
either side of the crossing at `LISTS.JX` (4.6) in 2.6 s. At 13.6 m the black knight waited outside the right gate. At
the crossing: `crack`, twelve shards with gravity; on the third course the prince leaves the saddle (`mounted = null`), drops
under gravity while his horse runs on, and on landing his actor hides and the painted `knightDown` lies in the sand.
`LISTS.mount(true)` puts everything back behind the fade. For headless frames, `LISTS.COURSE_S` slows a course: at real
speed a software-rendered screenshot takes long enough for the horses to leave the frame.

**Measured** with §13b's eval: fair 102 meshes, 7 lights, 439 draw calls; lists 82, 3, 349; pavilions 75, 5, 360 (throne
84, 18, 294). Outdoors the sun does the throne's torches' work, so fewer lights is right; the draw calls are mostly the
actors' sprites (about ten each). `SCENE.walkCheck()` is `[]` on all three.

**Testing a ground's activities headlessly.** A small driver in the page (written for these tests: `use(id)` runs an
interaction, `until(cond)` waits for a state, `finish()` clicks through bubbles, picks the first choice and stops meters
until `SCENE.lock` is 0) ran every activity on every ground to the end, with screenshots at the show's key moment (a blast
visible, the lances' shards in the air, the knight falling), and walked the gates round (fair → lists → pavilions → lists
→ fair), the map pin, and the bear's return to the wood.

## 13i. The House of the Lantern: a disguise, a second bed, the night scene as a stage

**Files.** `game/g19_paint_lantern.js` (painters), `g42_lantern.js` (the two rooms and `HOUSE`), `g43_cast_lantern.js` (Wanda,
the five women, the docker and the clerk, and every line they say, in `HOUSE.W`). The story is `STORY.md` §9. A king can't
walk into a brothel, so the game never has him do it: the way in is a tunnel. The chapel's crypt stair (`cellarArch` card at
x 11.25, `room.interact('crypt', …)` → `CHAPEL.crypt()`) speaks the first-time lines and `SCENE.go('lantern', { x: -10 })`;
the cellar arch in the common room goes back to the chapel.

**The disguise is a room flag.** A room made with `{ disguise: true }` turns the king into the Falconer: `SCENE.enter` calls
`P.disguise(!!room.disguise)` on every entry, so leaving takes it off with no extra code. `Actor.disguise(on)` (e05) hides
the crown (remembering whether he wore it) and every mesh in `clothes` tagged `userData.garment = 'collar'` or `'tabard'`;
`dress()` re-applies it, so undressing and dressing in the house keeps him in disguise. To hide another garment, tag it
where `add()` builds it. Nothing else changes: same body, same coat.

**The common room** (`LANTERN`, X −12..12, ceiling 6.4, walk line z 2.8): half-timbered walls, a gallery on posts across the
back with six painted doors and a red lantern by each, the stair up at the right (x 7.8..11), the cellar arch at the left,
Wanda's counter and bottle shelf, two tables with painted drinkers (`crowdA`/`crowdB`), the hearth (the key light: a point
at 8 with flicker 7), the lute player, the river window with a moonlight spot (the one shadow caster), red lanterns hung
in the open front. The women stand at their places (Agata sits on the stair: `sit.y` 0.52), Wanda behind the counter.
Their talk markers are made in `onEnter`, at each woman's own z and head height (sitting: `sit.y − 0.45`).

**A woman's room** (`LROOM`, X −14..5.6, ceiling 4.4, z 2.6). Her bed stands exactly where the royal bed does
(`LOVERS.BED`: x −9.4..−6.0, z 0.25..2.05, top 0.8), because the positions in `g27_lovers.js` are world places. One room
serves all five women: `LROOM.dress[id]` holds `dyn` cards shown only for her (Róża's silks, Nadia's maps, Hanna's
husband's cloak, Lena's copper bath with sprite steam, Agata's turned cross and books), and `LROOM.QUILT[id]` tints the
quilt (a cloned material). All five live in the room (so they keep their layers, §3); `onEnter` shows only `HOUSE.with`.

**Why the room runs 4.5 m past the headboard.** `SCENE.camGoal` clamps the camera's focus so the frame never shows past the
walls: `half = tan(fov / 2) × R.A × dist`, focus ≥ `X0 + half − 0.3`. Eased in for the bed (fov 13.5, dist 19.4) on a
phone in landscape (the stage strip under the bars is about 2.8:1), `half` is 6.4 m, so centring the bed (focus −7.72)
needs `X0 ≤ −13.85`. At X0 −11.4 the camera stopped at −4.9 and the bed sat in the left third with an empty wall on the
right. The extra room is furnished (a chest, a washstand with bowl, jug and candle, a mirror), not left empty. The royal
bedchamber (X0 −11.6) has the same clamp, and its framing (bed left, hearth right) is the established one; leave it.

**The night scene is a stage.** `g26_night.js` runs the bed (rhythm, positions, sounds, camera, lines, finish) on
`NIGHT.S` when a scene sets one, else on the royal bedchamber. A stage is
`{ room, enter, lines, cam, lens, finish, end }`; read it through `NIGHT.room()`, `NIGHT.lines()`, `NIGHT.enters()`,
`NIGHT.lens(k)`, and `camTick` uses `(NIGHT.S && NIGHT.S.cam) || NIGHT.CAM`. `NIGHT.finish` and `NIGHT.end` hand over to
`S.finish` and `S.end`. `HOUSE.scene(id)`:
1. her `yes` line, then `SCENE.go('lroom')` with `HOUSE.with` set (the room dresses itself for her);
2. `NIGHT.S = HOUSE.stage(id)` and the same state reset `NIGHT.play` does (keep the two in step if one changes);
3. `makeBare`, her intro, both walk to the bed, she undresses him and he her, `undress('all')`, then
   `K.sexGroup.visible = false` (the house rule: he is never shown);
4. into one sprite (`K.reframe`, `Q.hostInto(K)`), camera mode `'bed'`, `NIGHT.drive('kiss')`, her `enter.kiss` lines;
5. the position and pace strip, and her favourite (`W.fav`): she moves him there herself;
6. `HOUSE.finish` (her three lines, the hold, the afterglow) and `HOUSE.end`: fade, restore the room's camera (`cam`,
   `camFocus`, `focusDz`), release the poses, `dress()` (which puts the disguise back), `NIGHT.S = null`, trust +2 (+1 if he
   left early), nights +1, rumour +1, then back down to the common room with a caption, and save.

The gate is the same `NIGHT.confirm` (the choice reads "Go upstairs with her (18+)"). `NIGHT.quiet()` retires the walking
hint and is called by both `NIGHT.confirm` and `NIGHT.play`: the bedroom's `&night` test link skipped the gate and left the
hint showing under the scene's buttons.

**The women** (all adults; `STORY.md` §9.4 has who they are):

| id | name | age | her favourite | quilt | her room |
|---|---|---|---|---|---|
| `roza` | Róża | 27 | ride | `0xe0947a` | silks over the bed and the window |
| `nadia` | Nadia | 31 | behind | `0xb8b0e0` | two river maps |
| `hanna` | Hanna | 35 | missionary | `0xece2cc` | her husband's cloak and sword |
| `lena` | Lena | 29 | ride | `0xeca8b8` | the copper bath, steaming |
| `agata` | Agata | 24 | behind | `0xa0a0b0` | the turned cross, books |

Wanda (47) keeps the house and doesn't go upstairs. Each woman's `HOUSE.W[id]` has `first` (the meeting), `more` (later
greetings), `talk`, `yes`, `intro`, `undress`, `enter` (a line pair per position), `lines` (what she says in the rhythm),
`finish`, `cuddle`, `after`, `fav`. Talking a while is trust +1; the first meeting is +1.

**Story state** (`HOUSE.state`, in the save): `found` (Wanda has welcomed him), `met`, `trust` and `nights` per woman,
`rumour`, `warned`. The rumour rises by one for every night upstairs and every talk with the League's clerk; Wanda warns
him at 3 and at 6 (`warn[0]`, `warn[1]`). Not built yet (`STORY.md` §7, §9.5): the house's clues in chapter 4, the bathhouse,
and the positions the house adds (Nadia against the wall, Lena's bath, Wanda's chair).

**What went wrong on the way.**
- *Wanda's welcome went missing.* It was one `setTimeout(1600)` that gave up if `SCENE.lock` was held, and the arrival
  sometimes still held it. Wait for the room to be free instead: poll every 250 ms until the lock, modal, cutscene and
  night are all clear (and stop if the king has left). Any "say this when he arrives" wants this shape.
- *A blue quilt went black.* The scene's light is a red lantern and a candle; a saturated blue reflects almost none of it.
  Tints for a red-lit room need a warm or pale base (Nadia's is lavender now).
- *The bed was dark.* The red lantern over the bed is a point at 2.6 at (−7.7, 3.0, 1.8) and the washstand candle (1.6)
  fills from the left; the hemisphere is 1.6. Measure a scene frame, not just the empty room.

**Measured** with §13b's eval: common room 37 meshes, 11 lights (1 shadow), 240 draw calls; a woman's room 36, 6 (1), 111
(throne 84, 18, 294). `SCENE.walkCheck()` is `[]` in both.

**Testing headlessly.** From `?test&room=chapel`: run `crypt`, wait for `lantern` with `HOUSE.met.wanda` and the lock free,
run a woman's marker, pick "Go upstairs", wait for `NIGHT.inBed && NIGHT.pos === W.fav && !NIGHT.busy`, check
`SCENE.player.sexGroup.visible === false`, the camera's x near −7.7, her dressing shown and the others' hidden, switch
positions with `NIGHT.to(name)`, then `NIGHT.finish()` and wait for the common room with the lock at 0; check `trust`,
`nights`, `rumour`, the disguise still on, and that the cellar takes it off again. All five women ran this way.

## 13j. Animals: CC0 models through the people's sprite pass (`engine/e15_beast.js`)

**Why.** The painted animals (a cat, a hound, a deer, a dancing bear, two horses, the jousters) were flat code-drawn cards,
and beside the people, who are 3D models lit by the room and drawn into sprites, they read as stickers. Now every animal is
a real model drawn exactly the way a person is.

**Where the models come from.** Quaternius's *Ultimate Animated Animal Pack* and *Animated Animal* cat, CC0 1.0 (the same
artist and licence as the people). The original pack files (Horse, White Horse, Husky) are byte-identical to the sizes in
the `@jgengine/assets` index of the Poly Pizza uploads; the stag and the cat come from `@netforge/asset-library-files` (npm,
meshopt-compressed copies, CC0, NOTICE lists the provenance). The cloud sandbox reaches npm and public GitHub raw files, not
Poly Pizza or quaternius.com. `tools/animals.mjs` bakes them into `assets/animals/<kind>.glb`:
- only the clips the game plays (`Idle`, `Idle_Headlow`/`Idle_2_HeadLow`, `Eating`, `Walk`, `Gallop`; the cat's `Idle`,
  `Idle_Eating`, `Walk`, `Headbutt`), each named once (the packs carry every clip twice, once as `AnimalArmature|…`);
- meshopt and quantisation decoded, keys resampled (tolerance 2e-4);
- then written, **read back** and pruned: a disposed animation's samplers keep their accessors alive in memory, so a prune
  in the same document kept 400 KB of orphans per horse;
- normals and weights quantised to 8 bits and uvs to 16 (normalised integers); positions stay float; one attribute per buffer
  view (`VertexLayout.SEPARATE`; an 8-bit normal still has a 4-byte stride, so the reader copies strided views out).
Horse 270 KB, grey 269, hound 227, stag 268, cat 139. `build.sh` embeds each as base64 in `<script id="beast_<kind>">`: the
page grew from 7.1 to 8.7 MB.

**The reader** (`BEAST.parse`, `BEAST.kind`): GLB chunks → accessors as packed typed arrays → one `BufferGeometry` per
primitive of every mesh, shared by every animal of the kind; clips as `AnimationClip`s whose tracks address nodes by index
(`n12.quaternion`), so each instance resolves them in its own hierarchy; the embedded PNG (the cat's atlas) as a texture
(`flipY` false, sRGB, nearest). `BEAST.instance` builds an animal's own node tree (joints as `THREE.Bone`), its own
materials (recoloured by material name: `spec.col`, `spec.tint`; metal forced to 0, the packs' 0.4 is an FBX import's
guess), skinned meshes for nodes with a skin and plain meshes hung on their node for the rest (the stag's antlers ride its
head as a second, rigid mesh; the first reader assumed one skinned mesh and failed on it).

**Two things that made every animal a hundred times too big.**
1. The mesh node carries the FBX import's −90° and ×100. glTF ignores a skinned mesh node's own transform: the joints place
   the vertices. So bind with identity (`me.bind(skel, new THREE.Matrix4())`), which is what three's own loader ends up
   doing (it binds before the node's world matrix is ever computed). Binding with the node's matrix applied it twice.
2. The raw positions are in the armature's space (Z up, a hundredth of the size). Measure the rest pose **as skinned**
   (`getVertexPosition` on every third vertex, then the mesh's world matrix) to scale the animal to `spec.h` metres and put
   its feet on the floor.

**A Beast is an Actor** (`class Beast extends Actor`): the same layer dealing, sprite camera at 32 px/m, rim and posterise
pass, floor shadows, homes, `placeIn`, `setVisible`, `walkTo`, `moveTo3`, `hostInto`. What it adds:
- clips through a `THREE.AnimationMixer`: the idle, a routine of idles (`spec.idles` weights, every `spec.idleEvery` s),
  `Walk` / `Gallop` matched to ground speed (`walkSpeed`, `gallopAt`), `act(clip, at, ev)` one-shot, `hold(clip)`, `gaitK`
  for a driven gait;
- a pose layer on top of the clips. Bones the code turns or scales (the tail's wag, `spec.bones` reshaping, the rear) have
  their unturned rotation put back before every mixer update: a clip that doesn't key a bone would otherwise keep last
  frame's turn and add to it;
- `yawK`: animals stand side-on (1.2–1.5 rad from facing the lens) where people stand three-quarter (0.42); in profile is
  how an animal is read;
- `speakAt` from the head bone, so the bubbles of the petted lines sit over the head;
- `caparison(o)`: a knight's horse cloth, an inverted U swept along the body, striped (`o.col`, `o.n`), a dark hem, a swan
  on the flank (`o.swan`), built in metres in the animal's frame and moved into the Torso bone's rest frame (relative to the
  model, not the world: the inner group's scale isn't in its world matrix yet), so it rocks with the gallop.

**The bear is the hound.** There is no CC0 bear. Wojciech is the husky's skeleton reshaped by `spec.bones` scales: the back
×1.35 wide and ×1.4 deep (the scale cascades to every bone after it, so legs and head thicken too), the neck ×0.72 long, the
head ×0.82, ears ×0.55, the tail ×0.3, the upper legs ×0.86; dyed brown, rough 0.92, 1.3 m. On all fours he is plainly a
bear. Dancing (`rearGoal` 1, eased up at 1.6, down at 5): the Torso turns +1.15 rad about its X (the chest lifts about the
hips), Neck1 −0.95 to keep the head level, the hind legs −0.35, and the forelegs +1.2 **about their own Y**, paddling: about
X they swung toward the lens, which in profile shows nothing at all (three rounds of frames to find). He sways on the
inner group's z. Signs were found by eye on this rig; another rig needs its own.

**The animals** (`game/g44_cast_beasts.js`, all lazy):

| id | kind | where | h (m) | notes |
|---|---|---|---|---|
| `hound` | hound | wood 8.4 | 0.98 | tan, dark saddle, cream; idles Idle/Idle_2/head-low; pet: kneel, head-low 2.4 s, wag |
| `stag` | stag | wood −4.4 | 2.25 | grazes (Eating) most of the time |
| `cat` | cat | hut, on the barrel (y 1.1) | 0.44 | tint 0x6a6878 (pure black vanished in the violet room), side-on; pet: Headbutt |
| `bear` | hound | fair pen 7.0 / wood −1.9 | 1.3 | reshaped; reared at the fair, on all fours in the wood once freed |
| `destrier` | grey | pavilions 10.6 | 2.3 | pet: head-low 2.6 s, snort |
| `bay` | horse | pavilions 12.1 | 2.2 | re-dyed a true bay (the pack's brown read orange in the sun) |
| `joustHorseK`/`B` | grey / horse | the lists' lanes | 2.3 | caparisons; §13h |

**Before and after, and why it worked.** Before: each animal was one code-painted card (the hound 40 × 20 px, the horse
60 × 50) with a frame or two swapped for petting, flat-lit, outlined by hand, drawn at a different density from the
people. After: the same model pipeline as the people, so the same 32 px/m, the same key and rim lights, the same 1 px rim
and 24-level posterise, the same floor shadows; real gaits matched to speed; idles that change; a head that turns to the
hand. The lesson for any new kind of thing on screen: if it stands beside the people, draw it the way they are drawn.

**Adding a new animal, step by step.**
1. Find a CC0 rigged, animated glTF (Quaternius's packs are the house style). In the sandbox: npm packages and public
   GitHub raw files are reachable; check the licence file travels with it (§14).
2. Add it to `LIST` in `tools/animals.mjs` with the clips you'll play, run the tool (its header has the npm line), and
   check the log: size, clip names, and `missing clips` if a name differs (the dog pack says `Idle_2_HeadLow`, the horse
   pack `Idle_Headlow`).
3. Write a spec in `game/g44_cast_beasts.js`: `beast` (the baked file's name), `h` (head-up height in metres), `box` (the
   sprite frame: the animal plus a margin, or its ears clip), `homes`, `col` by material name (print them:
   `BEAST.kinds[k].J.materials.map(m => m.name)`), `idles`, `yawK`. Lazy, always.
4. If it's petted: `petSpot` in its room's `onEnter`, with its own clip (`Idle_Headlow`, the cat's `Headbutt`), `wag`,
   `stand` (the king's distance), `headY` (the marker).
5. Frame it with `SCENE.lens` (focus on it, dist 7–9) and shoot. Check: the size against a person, the feet on the floor,
   the colours under the room's light (a saturated colour can go black under a coloured light, §13i), the outline, the
   petting from both sides.
6. Something no pack has (the bear): reshape the nearest rig with `spec.bones` scales, recolour it, and give it what it
   does with the pose layer (`rear`). Find the axes by shooting variants side by side: four frames answer what an hour of
   reasoning about bone rolls won't.

**Checking an animal headlessly.** Frame it with `SCENE.lens(room, { focus, dist: 7–9, y, look }, 0.1)` and shoot; drive a
pet with the marker (`DRV.use(id)`), wait for `beast.held || beast.one` and shoot the reaction, then run it out with the lock
back to 0. For the skinning, compare the rest box (`beast.rest`) with the skinned box of the live pose: a box hundreds of
metres wide is the bind matrix.

## 13k. The calendar (`game/g45_cal.js`)

`CAL` holds which day it is and what kind: `phase` (`'court'` the demo's first day · `'festival'` days 1–3 · `'crisis'` the
twelve days after the feast), `day`, `fest`, `crisis`, and the feast's results (`feastDone`, `konrad`, `fire`, `toast`,
`doors`). All saved (`GAME.state.cal`); a save from before the calendar that has festival state loads as festival day 1.
- **A day ends in the bed.** The bedchamber's bed is `CAL.bed()`: a choice strip of *Sleep until morning*, *Go to bed with
  Halina (18+)* (the crown goes back on its cushion first; then `NIGHT.start`, the 18+ gate as ever), *Not yet*. Both ways
  call `CAL.next()` inside the fade (`CAL.sleep`, or `NIGHT.end` when the night was slept), then `CAL.morning()` puts up
  the day's caption after it. From the court day the next morning is festival day 1, with a bridging card ("Four weeks
  later…"): chapters 1–2's weeks aren't built.
- **The festival's days.** `CAL.notYet(what)` says what isn't on today: the melee and the archery from day 2, the joust and
  the Queen of Love and Beauty on day 3 (the lists' interactions go through it; the marshal says when). Outside the festival
  phase, e.g. a `?room=lists` test link, everything is open. The throne room has no court in festival week
  (`COURT.sit` declines, the caption says so).
- **The feast is day 3's night.** On day 3 the bed declines and the bedchamber's door opens on `FEAST` (§13l) instead of
  the throne room. The feast's end sets `phase 'crisis'`, `crisis 1`, and wakes the king in the bedchamber.
- **The map by phase.** `MAP.onOpen(places)` (an engine hook in `e11_map.js`, called each time the map opens) locks the
  meadow pin on the court day, labels it, and in the crisis sends it to the Krasnian camp instead of the fair.
- **The weather.** `SCENE.afterEnter(room)` (an engine hook at the end of `SCENE.enter`) adds rain in the crisis: rain on
  the glass indoors (`rainGlass` 0.75), rain outdoors (`rain` 0.8, no birds).

## 13l. The feast (`game/g46_feast.js`, `g47_cast_feast.js`, painters in `g11_paint_throne.js`)

**One hall, two rooms.** The throne room's construction is now `THRONE.hall(room, o)`; `THRONE.build` calls it, and so does
`FEAST.build`, a room of its own (`'feast'`, the same dimensions), with `o.feast` leaving out the steward's lectern and its
candle stand and the council table, where the feast puts the sideboard and a lower table. The hall's interactions are
filtered after (`window`, `books`, `banner`, `doors`, `halberds` stay; no `arch` out, no `throne`, no `map`). Its own
`onEnter`, its own cast homes, nothing shared with court at runtime.

**The dressing** (`FEAST.dress`):
- the high table on the dais, x −1.3..4.3, z 1.75..2.35, top 1.23: a `BUILD.box` from the floor through the dais steps,
  whose front face is a painted cloth (`feastFrontHigh`, 180 × 40 px for the whole 5.6 × 1.23 m face: `BUILD.box`'s
  `front` stretches 0..1 over it, so the painter draws it at full size: linen folds, a scalloped hem, the red runner with
  a gold border and the swan); `feastFoodHigh` (a 178 × 16 strip of loaves, fruit, roasts, gold cups, a jug, a pie) stands
  on the cloth behind the cup; three candles and a warm point light;
- two lower tables in the side bays (x −10.4..−6.0 and 6.8..10.8, z 1.0..1.5, top 0.78) with `feastFrontLow` and
  `feastFoodLow`, two candles and a light each; painted townsfolk (`crowdA`) at the right-hand one;
- the cupbearer's sideboard where the lectern stood (x −4.5..−3.3), Krasna's banners beside the swan's, two lute players
  by the great doors;
- the Swan Cup (`FEAST.makeCup`): a gilt lathe bowl on a stem with a handle each side (the two lips), 0.35 m (larger than
  life, so it reads at 32 px/m), added to the room's group *after* `BUILD.end`, because it moves (`FEAST.lift`);
- the fire-spitters' three blast cards and the flash light (so `FAIR.blast` works here as on the fair's stage), and a cold
  `storm` light for the lightning.

**Seats.** A seat is a home with `sit` (`g47`): the high table's at z 1.45 on the dais's top step (0.48) with 0.45 stools
(`sit.y` 0.93); the lower tables' at z 0.72 on the floor (0.47). The table's cloth front, 0.9 m nearer the lens, hides the
legs. Halina, Dorota, Gniewomir and Wiesława at the high table either side of the king's place (x 1.5, in front of the
throne); Bogdan, Jarek and the masked Konrad at the left table; Mściwoj and Ottokar at the right; Ilka standing by the
sideboard, Jacek the cupbearer beside it, the steward at the dais's right. Ilka and the steward had a single `home`; with a
second they need both in `homes` (as Dorota did, §13h). The Salamanders wait by the doors, hidden until their turn.
Konrad's half-mask is `spec.mask` (`Actor.mask`, a black band at the eyes with a nose-guard, `actor.maskMesh`): hide it to
unmask. 16 actors in the room.

**The night** (`FEAST.play`): the king walks the hall talking to everyone (`FEAST.TALK`, two lines each), then *Take your
seat*: behind a fade he is seated (`Actor.sit` on `FEAST.SEAT`), the lens set to the high table (`SCENE.lens`: focus 1.5,
dist 15.5, y 2.35, look 1.75, fov 17). Seated, he sees only seated markers, so the hall's markers drop out for the night by
themselves. Then, each beat a few lines and the player's choice where the king speaks (`FEAST.pick`: the strip, then the
king says what was picked):
1. the steward: guest-right for the masked knight (*let him eat* / *send him out*, who then walks out of the hall) → `CAL.konrad`;
   the fire-spitters indoors (*let them* / *not indoors*) → `CAL.fire` (STORY.md §6.3: these change which clues exist);
2. the first course; Gniewomir's cough;
3. the distraction: Ilka is hidden from her place for its length. The fire: the sisters walk in from the doors, three blasts
   and then all three (`FAIR.blast`), out again. The unmasking: Konrad walks round his table's end to the floor, takes off
   the mask on the reach's event (a gasp), names himself; Mściwoj stands; the player answers. Neither: a song.
4. the loving cup: Jacek fills it; *host first, the left lip*; the player's toast (`CAL.toast`); the cup comes up to the king
   (`FEAST.lift`: up, a tilt toward the drinker, down where he sets it), then to Gniewomir; he laughs, coughs, and dies:
   `FEAST.die`, a puppet on the sitting clip (below). Music out, the crowd out, a thud, a gasp; Wiesława; thunder, the
   `storm` light flashed twice, rain on the glass, the caption.
5. Mściwoj crosses the hall to his father; the doors (`CAL.doors`: *close them* / *open them*, and the guests who leave);
   twelve days; the king's answer; fade; *Chapter Four · The Dead King*; Gniewomir offstage everywhere from now; morning.

**A death on the sitting clip** (`FEAST.die`). The puppet samples `Sitting_Idle_Loop` into `D` (each bone's world-space turn
from the bind pose) and then turns, about the body's X axis, every bone in a subtree: spine_01's (+0.78 rad: he folds
forward over the table), neck_01's (+0.45 more: the head drops), the right upper arm's (−0.75: the arm forward along the
cloth toward the cup). Turning *every* bone of a subtree by the same premultiplied quaternion moves the subtree rigidly
about its root joint; turning only its root would leave the children's world rotations where they were. `FEAST.sub(i)`
lists a bone's subtree from the skeleton's parents once.

**Measured** with §13b's eval: 100 meshes, 22 lights (2 shadow), 475 draw calls, sixteen people in the hall (the throne room,
built by the same `THRONE.hall`, still measures 84, 18, 286 after the refactor). Headless, the whole night ran from the seat
to the bedchamber with the first choice at every strip: the fire, the unmasking, the toast, the death, the doors, the
ultimatum, `CAL` saved as `crisis 1`, the lock back at 0.

**Testing it.** `?test&room=feast&catchup=4` with `CAL.phase = 'festival'; CAL.fest = 3`, then `DRV.use('seat')` and run the
strip with the first choice each time until `CAL.feastDone` and the bedchamber. The night is long in game time (walks across
the hall), and game time runs at real time only if the loop can catch up: `&catchup=N` (g90) lets a test frame step up to
N seconds of game time where the default is 0.5, which a software renderer at 1.5 s a frame needs. Run it at
`W=800 H=357 DPR=1` and in the background.

## 13m. The investigation (`game/g48_inv.js`)

Chapter four's twelve days (STORY.md §7). `INV` holds `found` (clue → the crisis day it was found), `notes` (the red
herrings' own secrets), `said`, `outcome`; all saved (`GAME.state.inv`).

**Eight clues in their places**, each found by talking or looking, each needing the one before it where the story says so:

| clue | where | needs | found by |
|---|---|---|---|
| `lip` | the Swan Cup on the throne room's council table (a `FEAST.makeCup` copy, crisis only) | | `INV.cup` |
| `signet` | Ser Bogdan, throne room | | his marker → `INV.talk('commander')` |
| `oldSeal` | Hanna, House of the Lantern | `signet` | *Ask her about the feast* |
| `wolfsHood` | Father Ambroży at Gniewomir's bier, chapel | | `INV.bier` (the bier, or the priest) |
| `dried` | the Woman, the hut | `wolfsHood` | `INV.woman` |
| `ledger` | Wanda, House of the Lantern | `dried` | her marker |
| `grey` | Mira at the camp if the Salamanders played the hall; Konrad at the camp if he unmasked; the House's lute player if it was only a song (`INV.witness()`) | | their marker |
| `report` | Ilka's report on the study desk | `lip` | `INV.report` |

**How it plugs into rooms that already exist.** Rooms can only build in `build()`, so everything chapter four shows is
built there and hidden: the chapel's bier (`room.bier`: the box with `bierFront`, the shrouded body `bierBody`, four candle
stands with flames, a light), the throne room's cup (`room.crisisCup`) and its `swanCup` and `accuse` markers, the study's
`report` marker. `INV.stage(room)` (called from `SCENE.afterEnter`) shows them in the crisis and hides them otherwise. The
people's ordinary conversations hand over in one line each, at the top of the function: `FEST.talk` (everyone at the
festival grounds), COURT's markers (the household in the throne room), `CHAPEL.priest`/`CHAPEL.dorota`, `HUT.witch`,
`HOUSE.wanda`, `HOUSE.meet` (a fourth choice, *Ask her about the feast*), the lute player. `INV.TALK[id]` is a function that
returns the lines for the moment (so a clue already found changes what's said), with `['find', id]` and `['note', id]`
entries inline. The camp gets Konrad at the black tent and Mira at the Salamanders' wagon (homes added here, shown only in
the crisis).

**The dead stay dead.** `spec.gone` (Gniewomir: `() => CAL.feastDone`) parks an actor offstage when it's built
(`CAST.make`) and when a save loads, and `INV.stage` drops markers over him. A save loaded in chapter four used to rebuild
him alive at the camp.

**The journal** (`#journal`, the book in the top bar, or J; shown from chapter four on): the clues found, in order, with
where and on which day (the grey lady's witness named by the feast's variant), and what people said. A gold dot on the book
when something's new. `SCENE.modal` while open.

**The accusation** (`INV.accuse`, the marker before the dais): Mściwoj (a `throne` home, hidden except for this) walks in;
the player names the hand (six choices) and the king says it. Ilka holds only with `lip`, `oldSeal` and `ledger` or
`report` (§7.4); short of that Mściwoj laughs and it costs two days. With them she walks out to face him and confesses, and
the player decides: hand her over, her poison, or the tunnel. Every other name has its outcome (`INV.OUT`). Past the twelfth
day with no name, `CAL.next` calls `INV.timeout()`: war. `INV.conclude` sets `phase 'ch5'`, shows the chapter card, plays the
battle (§13n) if the outcome is a war, and wakes the king in the bedchamber.

**A trap found testing it.** `SCENE.lens` runs on the room's ticks. Awaiting it for a room the scene has already left (the
accusation's `finally`, after `conclude` went to the bedchamber) never returns, and the lock was never released.
`SCENE.lensReset(room)` puts a room's lens back at once; use it whenever the room may be behind you.

**Testing it.** From the bedchamber with `CAL.phase 'crisis'` set: go to each room, `DRV.use` each marker (or call
`INV.talk(id)` where the strip's first choice would be the 18+ one), check `Object.keys(INV.found)` after each; then the
accusation with the first choice each time. Headless, all eight clues and the Ilka outcome ran in about four minutes.

## 13n. The battle (a preview: `game/g49_battle.js`)

A thousand soldiers on a field, two armies charging and meeting, the king commanding from a rise: the first draft of
chapter five's war, and the base for the war camp to come. Reached from the map (*The Kalina Field*, `pl.play` →
`BATTLE.play`) and after any accusation that ends in war (`INV.conclude`).

**Impostors baked from the real cast.** The people are 3D models drawn into sprites (§6); a thousand of them would be a
thousand sprite renders a frame. So the battle bakes once (`BATTLE.bake`, behind the fade, "The armies gather…"):
- four kinds: a man-at-arms of each side (the `knight` spec: helmet, tabard, sword) and a mounted knight of each side (a
  destrier `Beast` in a caparison, a knight `Actor` seated on it, lance couched);
- each posed through its clips (`Sword_Idle` 4 frames, `Walk_Loop` 8, `Jog_Fwd_Loop` 8, `Sword_Regular_Combo` 8; the
  horse's `Idle`, `Walk`, `Gallop`), each from three sides (facing the lens, its back to it, side-on facing right), rendered
  with an orthographic camera into a cell of an atlas (8 columns × anims × 3 rows; cells at the rooms' 32 px/m: 61 × 83 px
  for a man, 115 × 109 for a horse and rider) using `renderTarget.viewport`/`scissor`;
- lit for an overcast day (a hemisphere on the bake's layer, `Actor.key`/`Actor.rim` moved for the bake and put back);
- then the people's own sprite pass (`Actor.fxMat`: the 1 px rim, 24-level posterise) over the whole sheet at once.
The bake actors live on layer 31 (anyone holding it is parked first) and are never added to `SCENE.actors`; their cards
are removed after. Mounted: the horse's clip time is set directly (`act.time`, `mixer.update(0)`), the rider sits at the
saddle with a small gallop bob, and the lance is pointed along the facing by hand (the prop is placed in `Actor.update`,
which the bake doesn't run).

**Drawn as instances.** Each kind is one `InstancedBufferGeometry` quad (`BATTLE.mesh`) with per-instance `iPos`, `iYaw`,
`iAnim` (row, frame count, fps, phase), `iFall`, `iTint`; the vertex shader stands it upright facing the camera
(cylindrical: `right = normalize(toCam.z, 0, -toCam.x)`), picks the row by the angle between the man's facing and the
camera (front within 45°, back past 135°, else side, mirrored when he faces left on screen), the frame from time and phase,
and tilts the quad back onto the ground as he falls. The fragment shader discards below alpha 0.5 and applies the room's fog
by hand (`uFogCol`, `uFogD` from `R.scene.fog`) and the lightning (`uFlash`). Four draw calls for a thousand men; a soft
blob under each (one more instanced mesh); a banner on a pole over each block's second rank, its cloth waved on the CPU;
dust from a pool of 160 sprites.

**The field.** World metres, the armies along Z: ours (blue) with its front at z −40 facing −Z, theirs (red) at −200 facing
+Z; five blocks a side of 16 files × 6 ranks (1.25 × 1.4 m), two cavalry wings of 6 × 2 at x ±86; 1008 men. The king's rise
at (34, 12), 6.5 m high; the swan standard planted beside it. The land: a plain with a little roll, low hills along both
sides and behind the enemy (`BATTLE.h`), ridges far off. The sky is a cylinder all round (a gradient `skyBattle` and two
bands of `cloudsDay`) because the cameras look every way: a single backdrop plane, as the rooms use, left black voids in
every side-on shot. Fog 0x8a94a6 at 0.0021; a drizzle, not a curtain (the first pass's rain hid the armies); depth of field
only past 380 m (the rooms' 0.8 m near ramp smeared every soldier).

**The fight** (`BATTLE.step`, on the room's ticks). Each man: hold until the order; walk four seconds; charge (5–6 m/s,
cavalry 9.5–10.5 from t 9). Rank discipline: each man knows the man ahead of him in his file and stops a pace behind him.
Contact: each side's front is computed per 4 m strip across the field each frame; a man stops and fights within 1.4 m of the
enemy's front in his strip, **or the nearest strip within two**: the first version only looked in his own strip, so the men
in the gaps between the enemy's blocks found no front and ran straight through their army. Once the lines have met, nobody
runs past where they met (`A.lineZ`). In the fight the line sways; men of the first three ranks fall now and then
(`iFall` eases to 1), more on the side that's flanked. Orders change it: *advance* (both charge, they meet near z −117),
*flank* (our horse swings wide round their left before turning in), *hold* (our foot stays at −40; the sim is stepped 15 s
on, silently, behind the cut, so they still meet in shot 5).

**The shots** (`BATTLE.play`, `BATTLE.shot` drives `CUT.cam`; Skip works): 1. over the king's shoulder down the field;
2. the king and Bogdan on the rise, Bogdan's line, then the player's order and the king's call; 3. beside our front as it
steps off; 4. low behind our running ranks, the red wall coming on; 5. the clash, side-on and close on the meeting line;
6. a high crane over the whole line; 7. behind the king, watching. Each camera was placed by distance: at 40 m a man is about
25 px tall, at 120 m a block is a band. The first pass framed both armies from the side at once, 160 m apart, and they were
two thin lines at the frame's edges.

**Testing it.** `?test&room=garden&catchup=4`, call `BATTLE.play({ preview: true })`, wrap `BATTLE.shot` to count shots and
shoot after each, drive the order with `DRV.adv` (or patch `NIGHT.ask` to pick another). Measured: the bake takes a few
seconds headless (software WebGL); 1008 men, the infantry meet about 18 s after the order, ~450 fighting and ~200 fallen by
the end.

## 13o. A full polish pass, and what it found

Done from the title screen on: the title, the six shots of the opening, then every room at three positions (x −9, 0, 9) at
the phone strip's 1000 × 446, reviewed side by side. Steps: `tools/shot.js` with a tour script that sets
`SCENE.player.x` and snaps `SCENE.camX = SCENE.camGoal(true)` between shots (no walking: three frames a room in 20 s).
What it found and fixed, and the rule behind each, for the next room:
- **Markers on top of each other** (the chapel's statues and windows, the throne room's steward and queen). Now the engine
  spreads them: each frame, shown markers are sorted by screen y and any two within a marker and a half are pushed apart
  vertically (`SCENE.update`). A marker under the speech bubble hides while it's up; the bubble draws over markers.
- **A person standing in the fire** (Hanna, placed at the hearth's own x). Place people beside a light source, never on it:
  the flame's card draws over them and the glow blows out the sprite.
- **Two things in one place** (Zofia in front of the black destrier waiting at the end of his lane). When a room gains a
  new thing, check the homes near where it stands.
- **A dark room losing the king** (the study at the bookcase). A room's hemisphere is its floor: if the king is darker than
  the darkest prop he passes, raise it (the study 1.8 → 2.3, exposure 1.02 → 1.1).
- **An animal that's in the room but can't be seen** (the black cat on the dark barrel in a violet room). Give a small dark
  animal a key of its own: a candle beside it, warm against the room's colour.
- **A blur in the foreground across the main subject** (the camp's near hay bale before the king's pavilion). Foreground
  props go at the sides of a room's main view, never in front of it.
- **A marker over the wrong thing** (the wood's deer marker floating over grass once the stag was a model where the card
  had been). Markers for animals sit over the animal at its own z.
- **A line that no longer fits the moment** (the steward's "petitioners are waiting" in the throne room in chapter four).
  Every room greeting checks the phase.
- **The title's duplicate badge** (a round "18+" in the corner as well as the rating block): one is enough; "Tap to begin"
  got a soft band so it reads over the castle.
The opening's six shots, the bedchamber, the throne room, the garden, the yard, the wood, the fair, the lists, the House and
the feast were checked and left as they are.

## 13p. The picture: bokeh depth of field, occlusion, a focus that follows speech, the grade (`engine/e01_render.js`)

What *Yes, Your Grace: Snowfall* and the HD-2D games share is pixel art inside a real lens: a shallow depth of field whose
blur has shape, bloom on everything that burns, contact shadow where things meet, and a graded picture. The frame already
had the first two in simple form; this is what was added and why. Order of passes each frame (`R.frame`):
`reflection → scene (HDR + depth) → down (half res, depth in alpha) → blur (gather) → fill → ao → aoBlur → bloom chain → final`.

**Bokeh** (`mat.blur`). The gather is the same golden-angle spiral, up to 11 px at a 640 px half buffer, but each accepted
sample is weighted `1 + uBokeh · smoothstep(uBThr, 3·uBThr, max(r,g,b))` (uBokeh 5, uBThr 1.25 in linear HDR). A lit wall
is about 0.3–0.8 and a flame card 2.6–3.2, so only fire and windows cross the threshold: out of focus they open into
round bright discs instead of dimming into a smear. `mat.fill` then runs a 3×3 tent (four bilinear taps) over the gather:
it rounds the discs and hides the spiral's sparseness; the near-field alpha takes half its max, so blurred foreground
edges stay soft. The far field's cap went from 2 to `R.farMax` 3.2 px. Per-room ramps (`room.dof`) are unchanged.

**Ambient occlusion** (`mat.ao`, `mat.aoBlur`; high quality only; `R.aoK` 0.85, `?noao` turns it off). From the depth
buffer alone: view position from depth (`uProj` = tan(fov/2) × (aspect, 1)), the normal from the nearer of each pair of
neighbours, ten taps on a per-pixel rotated spiral inside 0.6 m, each adding `max(v·n − bias, 0) / (v·v + 0.02)` with a
range falloff; then a 4-tap depth-aware blur. It reads the **full-resolution 24-bit depth texture**, not the half buffer's
alpha: half-float depth steps 1.5 cm at 20 m, which banded every wall. Bias 0.03 m + 0.0015·depth keeps cards hung a few
centimetres off a wall (paintings, sconces, banners) from haloing. What it buys: the dais steps, furniture on floors, the
wall-floor line, and a contact shadow under every sprite's feet (the card is a plane standing on the floor). It fades
where the picture is out of focus and stops at 45 m.

**Rack focus** (`SCENE.update`). The focal plane is the walking line (`cam.dist + room.focusDz`). When someone speaks from
beyond the sharp zone (further behind the line than `0.8 × uFar0`: the royal stand calling down, a king at his pavilion
table), the focus eases to bring them just inside it (`damp` 3.5/s) and back when the king answers. `room.rack = false`
turns it off for a room; `SCENE.focusSnap` (set on entry) skips the ease.

**Grade** (`R.grade`, `mat.final`). After ACES and the warm mid curve: `col *= mix(uTintS, uTintH, smoothstep(0.12, 0.7,
luma))`, a split tone. Default `R.GRADE = { s: [0.95, 0.99, 1.06], h: [1.04, 1.0, 0.95] }` (cool shadows, warm
highlights); a room overrides with `room.grade = { s: [r,g,b], h: [r,g,b] }` (multipliers, not colours).

**Cost.** Three more half-resolution passes (fill, ao, aoBlur). `Quality: Low` skips the occlusion; `Effects: Off` skips
everything but the scene. The automatic drop to Low (average frame over 30 ms) is unchanged.

**To judge a change to the picture**: shoot the throne room at x 0 and x −9 (the brazier in the near field) and the
bedroom at x −9 (the near candle) before and after, crop the same region, and put them side by side. Toggle one thing
at a time from the console (`R.aoK = 0`, `R.mat.blur.uniforms.uBokeh.value = 0`).

## 13q. Adult scenes: the rhythm, the positions, the lens (`game/g27_lovers.js`, `g26_night.js`)

**The rule lives in the engine now.** `Actor.SHOW_SEX = false`: `undress('all')` builds a man's parts (the poses pin to
them) and never draws them. The royal bed scene had been showing them: only the confessional and the House hid them by
hand. No scene has to remember any more, and no scene can forget.

**One phase, read several ways.** The old poses moved as blocks: one stroke curve slid a rigid body. Now `LOVERS.pose`
derives from the same phase `ph`:
- `stroke(ph)`: 0..1, a quick drive (30% of the cycle), a beat held at the deep end (8%), a slower draw back;
- `jolt(ph)`: the impact, `e^(−7d)·sin(22d)` from the deep end on, scaled by how worked-up they are;
- `stroke(ph − 0.7)` and `stroke(ph − 1.3)`: the chest answers the hips a beat later, the head a beat after that;
- three slow turns that never line up with the stroke: `amp` (0.8..1, how deep this stroke goes), `sway` (the head rolling
  side to side), `br` (breath).
They are all functions of `ph`, so they quicken with the pace. In each position the body that drives tips its pelvis
(`hips: LOVERS.tilt(up, fwd, 0.26·S − 0.1)`, a rotation toward its own front) with the spine curling against it; the body
that receives is pushed along by `S` and `jolt`, arches by the lagged stroke, and its head follows last. As `k` (0..1)
rises the poses change shape, not only amplitude: an arm goes back to grip the pillow, she drops from her hands to her
forearms, she sits up and leans back, heads tip.

**Positions** (`LOVERS.MENU`): kiss · missionary · ride · **reverse** (astride, facing the foot of the bed, hands on his
knees, sitting up as it builds) · behind · **lap** (he sits against the pillows, she astride face to face; slow:
`LOVERS.RATE.lap` 0.6) · **edge** (she across the foot of the bed, he standing on the floor, feet planted by leg IK) ·
after. A scene can offer fewer (`stage.menu`). Lines for a position a scene didn't write fall back through `LOVERS.LIKE`.
Left and right: a body's left is `up × fwd`; hands go to the partner's matching side or elbows cross.

**Staging.** `LOVERS.stage({ x, y, z })` offsets every constant in the poses (`X()`, `Y()`, `zc`), the shared sprite's
frame (`LOVERS.FRAME`: 4.7 × 3.0 m, big enough for a man standing at the bed's foot) and the lens, so the same positions
can be played on another bed anywhere. Bone-relative points (`LOVERS.at`) need no offset.

**The lens** (`NIGHT.zoom`, the *Closer / Closer still / Wider* button): 0 the room re-centred, 1 the bed (fov 13.5),
2 close (fov 8.6, about 6 m across), and in 2 it follows the position (`LOVERS.FOCUS`). At the bed's edge the shared
card is moved 0.32 m toward the lens (`LOVERS.CARD`) so the near foot post doesn't cut the standing man in two.

**Scenes placed in the story.** Halina's night opens with what the week has been (`NIGHT.OPEN` by calendar phase; only she
speaks, the choice is the player's). Wanda (47) offers her own room once he has spent three nights in the house (her
position is the lap). Nadia's favourite is the bed's edge, Lena's the reverse. Every scene: adults only, behind
`NIGHT.confirm`.

**Checking a position** (`t/pos.js` in the scratchpad pattern): `?test&room=bedroom&night`, `NIGHT.to(name)`, hold the
phase at the deep end (`NIGHT.hold = true; NIGHT.ph = 6π + 0.66π`), then compare each pelvis with its pose's `at`: the
difference is the pin's slide, and it should be near zero (lap began 16 cm off, the edge 17 cm); read the feet's heights
(0.10 on the floor for a standing man); shoot at zoom 2.

## 13r. The realm: weeks, the court's queue, the ledgers (`game/g51_realm.js`, `g50_court.js`)

The game's loop is *Yes, Your Grace*'s: a week of walking the castle, a court of petitioners, a ledger, a bed.
- **Weeks.** `CAL.phase 'court'` has `CAL.week` 1–4 (chapters one and two). The bed refuses until court has sat
  (`COURT.done`); then *Sleep* (or the night with Halina) calls `CAL.next`: `REALM.newWeek()` and the week's caption
  (`REALM.TITLE`). After week four: midsummer, the festival.
- **The queue.** `REALM.WEEKS[week]` lists petition ids; `REALM.queue()` returns the ones not yet heard whose actor
  exists. `COURT.run` walks each in (`COURT.petition`), then the ledger (`COURT.week`), then `REALM.upkeep()` (stores −1
  a week; mood −1 if gold or stores have run out).
- **A petition is data** (`REALM.PETS`). *Aid*: the cell panel, now with the treasury as a source: `pay: { gold: { cost,
  pts }, stores: {…} }` adds a row that spends `cost` for `pts` cells; `yesFx` / `noFx` apply on the outcome. *Decision*:
  `options: [{ label, reply, fx }]`: advice from the hall first (`advice: [[who, line]]`), then the choice strip; the king
  says the label (the player's words), the petitioner replies, `REALM.fx(fx)` applies.
- **`REALM.fx`** moves Gold / Stores / Mood (`COURT.stats`), Army, the family (`fam: { halina, zofia, kazik }`, 0–10, never
  shown as numbers: the journal says *devoted / warm / watchful / cold*), flags, the house's rumour, Dorota's coolness, and
  in the crisis `days` (Krasna's patience). It toasts what moved and pulses the bar.
- **The bar** (`#realm`, top right): a coin, a sack, a heart, a shield, with names above 820 px. `REALM.hud()` on every
  room entry and change.
- **Moments** (`REALM.EVENTS`): `{ id, week, room, who, note, talk, options }`. Entering the room in its week, once the
  room is free (the same poll as Wanda's welcome), the person speaks first and the player chooses. Six so far: Zofia's
  sword, the old king's letter, Kazik's crow, the truth for Halina, the fostering, the second bargain.
- **The journal** before the crisis is the week: what waits (`REALM.todo()`), the realm, the family in words.
- **Petitioners** are lazy actors living offstage in the throne room (`home: 'throne'`, `offstage: true`): made from the
  festival's `townsman` / `townswoman` helpers, or copies of existing specs (`bartoszPet`, `marshalPet`, `canon` from the
  priest). Never reuse an actor that also lives elsewhere: `COURT.petition` sets `offstage` when it leaves, which would hide
  it in its other home.
- **What carries forward.** `flags.fire === 0`: no fire at the fair or the feast. `flags.masked === 0`: no black knight at
  the feast. `flags.krasna < 0`: the crisis opens on day two. `flags.inquiry`: Dorota cools. `flags.bargain2`, `hela`,
  `letter`, `told`: the endings (§13s).
- **The crisis's court** (`REALM.CRISIS`): three petitions here on days 2, 5 and 8 and six more in g53 (§13r-2);
  `CAL.next` reopens court when one is waiting, and the journal says so.

**Adding a petition**: write it in `REALM.PETS`, put its id in a week, and if nobody in the cast can speak it, add a
petitioner spec beside the others. **Testing** (`t/realm.js` pattern): an interval that plays the two panels (click an
enabled `+` until the note says *Meets*, then *Grant*; share out the ledger, *Seal*, *Close*), `DRV.adv` for the strips,
and check `COURT.stats`, `REALM.flags`, `REALM.heardIds`, `CAL.week` after each step.

## 13s. The endings (`game/g52_end.js`)

`INV.conclude` (after the accusation, or the twelfth day running out) plays the battle if the outcome is a war and then
`END.play()`: `END.pick()` reads the ledgers and flags (its header lists the five conditions, in order), `END.shots`
builds a cutscene from rooms the game has (the fortress in the storm or under siege, the dark hall, the wood's fire, the
dawn, the garden without Kazik, the yard), the last shot is the card (*The End · title*), and the title screen returns.
`CAL.phase` becomes `'done'`; the save keeps `END.seen`. To add an ending: a branch in `END.pick`, a title, and a `tail`
of shots.

## 13r-2. The siege's court, and what came of it (`game/g53_siege.js`)

**Six more petitions** make the twelve days a daily court: salt hoarders (day 3), three hundred at the Ostrów gate (4),
deserters (6), the undercut north wall (7, an aid petition), the cathedral's bells (9), Krasna's households (10). With
`flour`, `mother` and `warehouse` that is a petition on nine of the first ten days. They are added to `REALM.PETS` with
`Object.assign` and to `REALM.CRISIS` with `push` + `sort`, so g51 stays the schema and g53 stays data. They reuse existing
petitioner actors (`who` must be an id that already has a spec: a new face needs a spec in g51's block first).

**`REALM.ECHO`: no choice goes unread.** An audit found eleven flags that a petition or a moment set and nothing ever
read (the choice changed a number once and was forgotten). The fix is one table, not eleven special cases:

```js
REALM.ECHO = [ [flag, value, when, "the steward's report", fx], ... ];   // when: 'w3' = court week ≥ 3, 'c4' = crisis day ≥ 4
```

`COURT.run` calls `REALM.echo()` before the first petitioner: up to three due rows are read out by the steward ("Before
the hall fills, Your Grace: what came of it."), each applies its `fx` through `REALM.fx`, and each is marked once in
`REALM.done['echo:flag:value']` (saved with the realm). A 'w' row that was missed is still due in the crisis. A row with
`null` fx is a line only.

Rules that follow from it:
- **Every new flag gets a reader in the same commit**: an ending (`END.pick`), a scene, or an ECHO row. To check, grep the
  flag name: one hit that is only an assignment means it is dead.
- An echo arrives **at least a week (or two crisis days) after** its choice, and says the consequence in a concrete image
  ("the widows lit forty candles"), never in numbers: the toast carries the numbers.
- Echo fx are small (±1, a rare ±2). The choice already paid its price; the echo is the world remembering.
- Court only sits in the crisis while a petition waits (`REALM.waiting()`), and the last petition is day 10, so a 'c' row
  later than `c10` would never be read.

## 13t. The regression suites (`tools/regress.js`, `tools/regress/`)

`node tools/regress.js [suite ...]` runs the built page headlessly (through `tools/shot.js`) and prints one `PASS` or
`FAIL` line per run, then `N passed, M failed`; the exit code is 1 on any failure. No arguments runs every suite.

| suite | what it proves | time |
|---|---|---|
| `rooms` | all fourteen rooms boot: right room, no page error, `SCENE.walkCheck()` empty, nobody left parked on layer 1 | ~4 min |
| `endings` | `END.pick` returns D, E, C, B, A for five constructed states; `END.play` runs to the title with the lock at 0 | ~5 min |
| `realm` | week one's moment, a court of three petitions, the ledger, the bed, on to week two; no timeouts, no errors | ~6 min |

A suite is a module in `tools/regress/` exporting `{ name, runs: [{ label, query, steps }], check(label, evals) }`:
`steps` is what `shot.js` takes, `evals` are that run's eval results already parsed, and `check` returns `null` or a short
reason. `tools/regress/drv.js` is the in-page driver string (`DRV.until(cond, ms)` waits; `DRV.adv(cond, ms)` also clicks
the first choice, passes the age gate and advances bubbles; `DRV.use(id)` uses a hotspot): inject it with
`['eval', DRV + '1']`. Suites take no screenshots: looking is still done by hand with `shot.js` (§11).

Software WebGL is slow and timing varies: every wait in a suite is on state with a generous timeout, never on a clock.
Run one suite at a time, and never while `build.sh` is writing `build/index.html`.

## 13u. Working with worker agents (lead and workers)

The owner's setup: one lead (the strongest model) plans, reviews and integrates; cheap, fast workers
(`.claude/agents/haiku-coder.md`, capped at a 100k-token context) each do one bounded task. What made it work here:

**The worker definition matters more than the prompt.** A worker started as a general-purpose agent inherits every tool
schema and arrives with most of its window already spent; `haiku-coder` allows six tools (`Read, Edit, Write, Grep, Glob,
Bash`), cannot spawn agents, and compacts at 100k. Its body holds the standing rules (scope, context diet, report format),
so a packet only has to carry the task. A new `.claude/agents/` folder is only seen by a session started after it exists.

**This repo's context traps**, which every packet must fence off: `build/` (8.8 MB in two files), `vendor/`, `assets/`,
`ENGINE.md` (30k tokens: give line ranges), `STORY.md` (10k tokens: give line ranges), screenshots (each costs tokens).

**What to delegate**: read-only audits answered by grep (dead flags, unused helpers, missing `reset/state/load` entries);
porting or writing test suites; data rows against a schema that already has ten examples (petitions, echo rows, shop lines)
as a *draft*; mechanical renames. **What stays with the lead**: rooms and anything measured against the throne room,
poses and cameras, the render pipeline, every adult scene and its rules (`CLAUDE.md` rule 6), story decisions, the final
wording of any line the player reads, the build, the commit.

**The packet** (each of these was needed at least once): the objective in a sentence; the exact files it may create or
change, and "touch nothing else"; line ranges to read; the allowed values of every enum (actor ids, fx keys and ranges);
the checks to run and how long they take; "do not run `build.sh`, do not commit" (workers share the checkout, and a build
under a running test corrupts the test); the report format; and "if the check fails and your port is faithful, report it,
do not weaken the check".

**Review, every time**: read the diff, not the summary; run the worker's check yourself; then judge what a check cannot
(tone, period, whether a choice is a real dilemma, whether a line contradicts `STORY.md`). In the first round the audit
was right as delivered; the petition draft passed its validator and still needed most of its lines rewritten (cannon in a
world of lances, a choice that paid gold for doing nothing, a petition that repeated day 8's) and one fact corrected
against the story bible. Schema checks catch shape, not sense: budget the lead's time for the second.

**Parallel work** needs disjoint files and no shared outputs: one new file per worker, the lead alone builds. Workers
run in the background and report once; they cannot be steered mid-flight here, so keep tasks small enough that a wrong
turn costs minutes. To correct a finished worker, message the same worker with the specific mistake, why it is wrong in
this codebase, the right method, and what to re-run; take the task over after a second miss.

## 14. Credits and licences

Characters, outfits, hair and animation: Quaternius (CC0), via the character kit. Animals: Quaternius (CC0), the Ultimate
Animated Animal Pack and the Animated Animal cat (§13j). three.js r160 (MIT). Fonts: Alegreya
and Alegreya SC (SIL OFL) from Google Fonts. All pixel art, layouts, characters' names and lines in this folder are
original to this project.
