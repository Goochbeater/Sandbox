# Assets: what's baked, and how to re-bake or extend

All CC0 from https://quaternius.itch.io. The raw downloads are kept in `~/maul-assets/`:

| Pack | Folder / zip | Used for |
|---|---|---|
| Universal Base Characters [Standard] | `UBC/`, `UBC_Standard.zip` | superhero male/female bodies, base heads, 8 hairstyles, eyebrows, eyes |
| Universal Animation Library 1 + 2 [Standard] | `UAL1/`, `UAL2/` | the 60 mocap clips |
| Modular Character Outfits – Fantasy [Standard] | `MCOF/`, `MCOF_Standard.zip` | regular-proportion bodies (`rmale`/`rfemale`) + ranger and peasant outfits (m/f) |

Baked into `engine/assets/`:
- **`q.bin` + `q.json` (~5.3 MB):** skeleton names/parents; meshes `male`, `female`, `rmale`, `rfemale`, the hair and
  eyebrow meshes, and `rm_ranger`/`rm_peasant`/`rf_ranger`/`rf_peasant` part lists; clips (30 fps, int16 world deltas);
  `srcPelvisH`.
- **JPEGs:** `male_*`, `female_*`, `rmale_*`, `rfemale_*` skin; `hair1/2`; `eye_col`; and the outfit textures
  `ranger_col/_nrm/_orm`, `peasant_col/_nrm/_orm`.

`rebuild.sh` embeds all of them in the html, as `<script id="qjson">`, `qbin` and `tex_<name>`. The page stays one file.

## Re-baking
```bash
node tools/bake_q.js            # glTFs from ~/maul-assets -> assets/q.bin + q.json (+ base textures)
python3 tools/bake_outfit_tex.py   # outfit textures -> assets/*_col/_nrm/_orm.jpg (SZ=2048 default)
```
`tools/gltf_inspect.js` / `gltf_skel.js` list a glTF's meshes, materials, skeleton and animations. Use them before
wiring in a new pack.

## Adding a pack (e.g. Sci-Fi or Medieval outfits, more animations)
1. **Ask the user first.** Downloading needs explicit permission; give the filename, source (quaternius.itch.io) and size.
   Choose the "Standard" free tier. It's CC0.
2. Unzip into `~/maul-assets/<PACK>/`.
3. Outfits must share the **65-joint Quaternius skeleton**: the Godot/UE export with the same bone names.
   - Add a part list in `bake_q.js`: follow the `rm_ranger` pattern with the bind key `rmale`/`rfemale` and filter the
     mesh names by prefix.
   - Add the texture set to `bake_outfit_tex.py`.
   - Add `QB.OUT[bind][kind]`.
   - Find the texture's hue families first (compute a hue histogram), so grades can target them.
4. Clips from any UAL-skeleton file bake the same way: add them to the clip list in `bake_q.js`. They retarget to every
   body automatically.
5. Rebuild, then check the new pieces in `sc_wardrobe.js` / `sc_look.js`. Watch for parts that don't exist
   (`console.warn('no outfit part', name)`).

Keep `q.bin` lean: each extra outfit is about 1–2 MB and each 2048 texture set is about 1.5 MB embedded (base64 adds 33 %).
The shipped html was about 16 MB without the intro video.
