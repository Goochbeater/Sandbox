# The King's Bedchamber — 2.5D test demo

A one-room test of the *Yes, Your Grace: Snowfall* look: a 3D bedchamber with pixel-art textures, depth of field,
bloom and a glossy reflective floor, and a king you can walk around who is a real 3D character drawn as a pixel sprite.

Open `build/index.html` in a browser (it is one self-contained file, no server needed).

## Controls
- **Keyboard:** ← → or A D to walk, E (or Space) to look at the thing you're standing by, Esc to pause.
- **Phone (landscape):** hold beside the king to walk, tap a spot to walk there, tap a ◇ to look closer.
- The standing mirror puts the crown on and takes it off.

URL options: `?q=low` low quality, `?nofx` no post effects, `?fps` frame counter, `?x=3` start position, `?crown`.

## How it's made
- **Room** (`parts/p04_room.js`): boxes and flat "cards" laid out from the reference screenshot, textured with pixel
  art painted in code at 32 texels per metre (`parts/p03_pixel.js`), so walls, props and the king share one pixel grid.
- **King** (`parts/p05_king.js`): the CC0 Quaternius base body and peasant outfit from the character kit, re-dyed into
  a dark coat, plus a custom long skirt, fur collar and white tabard, animated with the kit's mocap clips (idle, formal
  walk, talking, interact). A small orthographic camera renders him every frame into a 48 × 77 px target, which stands
  in the room as a billboard: he reads as pixel art but turns, walks and catches the firelight like a 3D model.
- **Frame** (`parts/p02_render.js`): planar floor reflection → HDR scene → half-res depth of field → bloom → ACES,
  warm grade, vignette and grain.
- **Game** (`parts/p06_game.js`): input, the follow camera, the interactable objects and the king's lines.

## Build
```bash
./build.sh                                  # → build/index.html and build/artifact.html
cd tools && npm install && node shot.js     # headless screenshot (Chromium, software WebGL)
python3 -I tools/trim_assets.py <kit>/engine/assets   # re-cut the character assets from the kit
```

## Credits
Character models and animation: Quaternius (CC0). Renderer: three.js r160 (MIT). Everything else is original to this demo.
