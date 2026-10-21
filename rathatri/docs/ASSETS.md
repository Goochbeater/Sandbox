# ASSETS: catalogue and loader

Owner: assets agent. Files: `tools/prep_assets.sh` (regenerates `assets/extra/`), `assets/extra/*` (14 files, embedded by `build.sh`), `parts/p03b_assets.js` (the `ASSET` loader), `tools/sc_assets.js` (contact-sheet scenario).

Sources are read-only: `scratchpad/assets_extracted/starfall/*.png` (5 AI-painted images from the earlier Starfall build) and `scratchpad/assets_extracted/bobafet/*.webp` (30 WebP files: 10 Poly Haven CC0 photo sets, colour + normal + mix, packed for the earlier Vilemoor build). Starfall's code is in `scratchpad/src/starfall/_script02.js.stripped`; Vilemoor's is in `scratchpad/src/bobafet/_script02.js.stripped` (`PHOTO` table, `TEX.photo`, `MAT.init`).

## 1. What is shipped

14 files, 668,890 bytes on disk (0.64 MB). Embedded in the build as base64: 893,218 bytes including tags, plus about 6 KB of loader source in `parts/p03b_assets.js`. The html grows by about 0.9 MB.

| file | from | px | bytes | role |
|---|---|---|---|---|
| `ground_lichen.jpg` | starfall `9fc838d8` | 512 | 102,975 | planet surface: lichen-crusted gravel and scrub, tile |
| `rock_strata.jpg` | starfall `979cdb47` | 512 | 70,722 | rock: layered stone face with cracks, tile |
| `gas_giant.jpg` | starfall `1fbdb05f` | 1024x512 | 42,013 | sky: equirect gas giant (banded, cream and ochre) |
| `nebula_a.jpg` | starfall `ed952f8d` | 1024x512 | 62,262 | sky/space: equirect star field with a blue-violet dust lane |
| `foliage_branch.webp` | starfall `64d9afc7` | 512 | 60,022 | foliage: one leafy branch cut-out, alpha kept |
| `hull_plate_rust.jpg` | bobafet `b6512b27` | 512 | 33,417 | metal hull: corroded plate, tile |
| `hull_plate_rust_nrm.jpg` | bobafet `c949faa9` | 512 | 17,669 | normal map for the rust plate |
| `rock_dark.jpg` | bobafet `b7c1e5e2` | 512 | 41,346 | rock/masonry: dark rubble-faced blocks, tile |
| `rock_dark_nrm.jpg` | bobafet `b6f4860d` | 512 | 95,753 | normal map for the dark blocks |
| `floor_tiles_grey.jpg` | bobafet `82bc23f2` | 512 | 41,477 | floor: large grey slabs, 3 m repeat |
| `floor_tiles_grey_nrm.jpg` | bobafet `b826f5f8` | 512 | 23,902 | normal map for the slabs |
| `planks_dark.jpg` | bobafet `e5fba4a2` | 512 | 31,494 | wood: dark wide boards, 2 m repeat |
| `leather_brown.jpg` | bobafet `bc010bdd` | 512 | 24,098 | cloth/leather: brown hide with a stitched seam, 0.4 m repeat |
| `leather_brown_nrm.jpg` | bobafet `5a16f49d` | 512 | 21,740 | normal map for the leather |

Format rule used: opaque colour maps are `.jpg` (q78). Normal maps are `.jpg` at q85 (less banding in the flat blue). The one alpha asset is `.webp` (q80, alpha quality 85). Tiles are 512 px. Equirect sky maps are 1024x512. The longest side never exceeds 1024.

Naming: `<name>.jpg` is the albedo. `<name>_nrm.jpg` is the normal map for the same name and is picked up automatically by `ASSET.mat`.

## 2. Catalogue of every source image

### 2a. Starfall (5 PNG, AI-painted)

| source | size | what it looks like | how the original game used it | tileable | verdict for RATHATRI |
|---|---|---|---|---|---|
| `9fc838d8` | 1254 sq, RGB, opaque | Orange-ochre gravel with yellow-ochre lichen mats, grey-green lichen rosettes, grey pebbles, orange grit. | `groundTex`: planet surface. Green channel is the detail term (tiled at 0.035). Triplanar near-ground albedo (tiled at 0.09). | Yes. Seam ratio 1.3 / 1.4, no visible seam in a 2x2 tile. | **Planet surface, dry scrub or moss-over-stone.** Fits Dxun's ruin layer (moss on stone). Not sand and not ash. |
| `979cdb47` | 1254 sq, RGB, opaque | Beige-grey layered stone face (sandstone or limestone), dark vertical cracks, small lichen spots. | `rockTex`: its green channel is a macro steepness mask, and its colour is stone (triplanar, tiled at 0.022 and 0.0023). | Mostly. Seam ratio 2.0 left-right, 1.4 top-bottom. The 2x2 preview looks continuous, with a faint risk at the left-right line. | **Rock.** Cliff faces, orbalisk-cave outcrops on Dxun, fortress walls on Ambria. |
| `1fbdb05f` | 1774x887, alpha ~236-242 (effectively opaque), sRGB | Equirect gas giant: cream and ochre belts, white ovals, storm swirls, blue-grey poles. | `gasMap` in the giant planet's shader, sampled at lon/lat. Alpha is not used. | Equirect. Wraps in longitude. Seam ratio 2.5 at the wrap; no visible seam at 2x. Check on device. | **Sky.** A gas giant in the sky or on a space backdrop. Not a surface. |
| `ed952f8d` | 1774x887, RGB, opaque | Equirect star field, blue-violet nebula dust along the equator, dark everywhere else. | `nebula` in the sky dome, blended in by density. | Equirect. Wraps in longitude, seam ratio 1.2. | **Sky / nebula.** Good for the space and hyperspace backdrop in the planned space mode. Very dark overall. |
| `64d9afc7` | 1254 sq, RGBA (alpha 0 on 72% of pixels, about 250 on the leaves) | One leafy branch (broadleaf, temperate look, some yellow-green young leaves), not a sprite sheet. | `canopyMap` and `foliageMap()`: crown quads (UV 0..1 per quad), remote-biome leaf cards, `alphaTest` 0.26 to 0.35. | No. It is a cut-out, so tiling does not apply. | **Foliage card.** Generic deciduous look, not alien. Use tinted or sparse on Dxun, or as filler. It is not an atlas: the whole image is one branch. |

### 2b. Bobafet (30 WebP, Poly Haven CC0 photo sets)

Each set is three files: albedo (`alb`), normal (`nor`) and `mix`. In the source, `mix` is R = ambient occlusion, G = roughness, B = height (read in `TEX.photo`). The `mix` maps are not shipped. Tileability below is the measured seam ratio, written as `left-right / top-bottom` (1.0 is ideal; a value over about 2 means a seam is likely), plus a 2x2 check. Poly Haven sets are tileable by design. The gas giant's top-bottom ratio is meaningless (equirect poles are different colours by design), so only its left-right value counts.

| set (source name) | px | `alb` / `nor` / `mix` | what it looks like | how the original used it | tileable | verdict for RATHATRI |
|---|---|---|---|---|---|---|
| `rust_coarse_01` | 1024 | `b6512b27` / `c949faa9` / `6a0af541` | Rust-brown corroded metal, mottled oxide, no seams. | `pRust`: metal 0.55, slight rust. | Yes. 1.1 / 1.2. Large blotches repeat each tile, so vary the scale. | **Metal hull.** Corroded plate for Raxus scrap, Dxun wrecks, bunker walls. **Shipped** (alb + nrm). |
| `rock_wall_08` | 2048 | `b7c1e5e2` / `b6f4860d` / `a958269f` | Dark grey-brown rubble-faced blocks, bevelled joints. | `pWall`, `palRock`: the keep's main wall. | Yes. 1.2 / 1.2 (alb). | **Rock / masonry, dark.** Sith tomb walls, Mandalorian bunkers, Dxun ruins. **Shipped** as `rock_dark` (alb + nrm). |
| `large_grey_tiles` | 2048 | `82bc23f2` / `b826f5f8` / `eaee29b3` | Large grey rectangular slabs, dark grout, 3 m per tile. | `pFloor`, `L.floor`: olive-tinted floor, 3.0 m repeat. | Yes. 1.4 / 1.3 (alb). The normal map seams 2.4 horizontal, so check it. | **Floor.** Temple or bunker slabs. **Shipped** as `floor_tiles_grey` (alb + nrm). |
| `dark_wooden_planks` | 1024 | `e5fba4a2` / `4710437c` / `4a659ff7` | Dark grey-brown wide horizontal boards. | `pPlank`. | Yes. 1.6 / 1.1 (alb). | **Wood.** Docks, huts, crates, the Hutta marsh shacks. **Shipped** as `planks_dark` (alb only). |
| `fabric_leather_01` | 1024 | `bc010bdd` / `5a16f49d` / `14fe8318` | Mottled brown leather with a baked vertical stitch seam. | `pLeather`, 0.4 m repeat. | Yes. 1.2 / 1.1 (alb). The stitch seam repeats each tile. | **Cloth / leather.** Robe trim, belts, hide. The baked stitch reads as a seam, so rotate or offset it. **Shipped** as `leather_brown` (alb + nrm). |
| `castle_wall_slates` | 1536 | `fc104b5d` / `36c2c5e6` / `a1024427` | Despite the name, a random rubble wall: mixed grey and tan fieldstones in mortar. | `pSlate`, `L.slate`. | Yes. 1.3 / 1.2. | **Rock / masonry, light.** Not shipped: overlaps `rock_dark`. Keep as a second wall if one is needed. |
| `medieval_blocks_03` | 1536 | `ebe2661c` / `abc6506b` / `c99d15b8` | Grey-brown coursed ashlar blocks with small joints. | `pBlock`, `L.block`, `palBlock`. | Yes. 1.0 / 0.9. | **Masonry.** Not shipped: overlaps `rock_dark`. Candidate for a cleaner temple wall. |
| `stone_tiles_02` | 1536 | `cd0f51ec` / `596b3f8d` / `450b152b` | Irregular polygonal grey flagstones (crazy paving), dark joints. | `pFlag`, `palFlag`. | Yes. 1.2 / 1.2 (alb). | **Floor / path.** Not shipped. Good candidate for Dxun ruin paths. |
| `old_planks_02` | 1024 | `98d6cb98` / `ed4478a6` / `a1a480bb` | Weathered vertical brown boards with dark staining. | `pOldPlank`. | Partly: 1.3 left-right, but 2.3 top-bottom (a visible horizontal seam is likely). | **Weathered wood.** Not shipped. Candidate for shacks, once the top-bottom seam is fixed. |
| `plastered_stone_wall` | 1024 | `673001cd` / `9c8c131d` / `ed15e74d` | Dark grey lime plaster, mottled, pitted patches. | `pVault`, `hPlas`, `palPlas`. | Yes. 1.5 / 1.5. | **Plaster / render.** Interior walls, vaults. Not shipped. |

Metres per repeat (from the `PHOTO` table, the real size of one tile): castle 2.5, dark planks 2.0, leather 0.4, large grey tiles 3.0, medieval blocks 2.0, old planks 2.0, plastered 2.5, rock_wall_08 1.8, rust 2.2, stone tiles 2.0. Use `repeat = world_metres / metres`, or start from `1 / metres` per metre of surface.

### 2c. Gaps (honest)

- **No sand, dune or ash texture exists in the sources.** Ambria (desert) and Lenico IV (Ash Plains) need one. `ground_lichen` is the closest dry ground, and it reads as gravel, not sand.
- No emblem, no cloth other than leather, no glass, no water.
- No ORM (AO/rough/metal) packing for the shipped sets. Roughness and metalness are constants set in `ASSET.mat`.
- The gas giant and nebula are equirect 1024x512. A seamless-wrap check at device resolution is still open.

## 3. Loader API (`parts/p03b_assets.js`)

```js
ASSET.names()                       // -> sorted array of every embedded name (14 today)
ASSET.has(name)                     // -> bool
ASSET.url(name)                     // -> blob: URL (decoded once, cached); null if not embedded
ASSET.tex(name, { repeat:[x,y], srgb, aniso, cb })  // -> THREE.Texture, fills in when decoded; cb(tex) on decode
ASSET.mat(name, { color, rough(1), metal(0), env(0.7), ns(1), repeat:[x,y], aniso, side })
                                    // -> MeshStandardMaterial; map = name, normalMap = name_nrm when embedded
ASSET.preload(names?, onProgress)   // -> Promise<{ loaded, missing }>; no names = everything embedded
```

- Colour maps are sRGB by default. Names ending `_nrm` are linear (`NoColorSpace`). Override with `srgb`.
- Wrap is `RepeatWrapping` and mipmaps are on. Anisotropy defaults to 4 (three.js clamps it to the GPU maximum).
- A missing name returns a shared grey 1x1 texture (a flat normal for `_nrm`) and prints `console.warn` once for that name. It never throws.
- A decode failure swaps in a grey canvas, so the material is grey, not black.
- Nothing runs at load time. The part only defines `ASSET`, so `?norender` boots are unaffected.
- Textures are cached per name plus options. `ASSET.mat` is cached per name plus options. Repeat variants decode the same blob URL again; the browser's image cache makes that cheap.

Example, mobile-friendly rock floor:

```js
const m = ASSET.mat('floor_tiles_grey', { repeat: [4, 4], rough: 0.85 });   // 4 tiles across a 12 m slab
ASSET.preload(['rock_dark', 'rock_dark_nrm'], (p) => { /* progress 0..1 */ });
```

## 4. Build and tooling

- `tools/prep_assets.sh [STARFALL_DIR] [BOBAFET_DIR] [OUT_DIR]` (or env `SF`, `BF`, `OUT`) regenerates `assets/extra/` from the sources. The defaults point at the scratchpad extraction. Re-running it gives the same files.
- `build.sh` embeds every file in `assets/extra/` as `<script type="application/octet-stream" id="ast_<name>" data-mime="...">` in base64. It was not modified.
- `tools/sc_assets.js` (contact sheet) boots `test_arena`, preloads every name, shows each one as a labelled quad (top two rows raw, bottom row through `ASSET.mat`, lit by the arena) and prints the preload result.

## 5. Verification

- `OUT=/tmp/assets/game.html ./build.sh`: built with no errors. Syntax, `dupcheck` and `glslcheck` passed.
- `BUILD=/tmp/assets/game.html W=1280 H=720 node tools/shot.js tools/sc_assets.js ... "?play=test_arena&nointro"`: preload reported `loaded 14, missing []`, 14 progress steps, and the missing-name case gave a 1x1 texture with one warning. The contact sheet was checked by eye. All 14 files render with the right labels and colours; normal maps show as lavender, the foliage cut-out keeps its alpha, and the lit row takes the arena's lighting.
- `?play=test_arena&nointro&norender` boot: no errors. `ASSET.mat` returns a MeshStandardMaterial with the normal map, the repeat is applied, and the cache returns the same object.
- Tiling: 2x2 previews of the seven colour tiles, checked by eye. No visible seam on any of them. Rust and leather show repeating blotches or stitch lines, noted above.
- Seam ratio is a crude numeric check (wrap-edge difference over neighbour difference). It flags risk, not failure.
