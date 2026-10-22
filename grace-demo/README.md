# The King's Bedchamber → The Throne Room

A playable 2.5D test of the *Yes, Your Grace: Snowfall* look: two rooms built in 3D with pixel-art textures (depth of
field, bloom, glossy reflective floors), a king and a court of characters who are real 3D models drawn as live pixel
sprites, and a first slice of the game: hold court, hear two petitions, send agents, split the week's Prosperity.

Open `build/index.html` in a browser. It's one self-contained file and needs no server.

**How it's made, how to extend it:** see [ENGINE.md](ENGINE.md), the full engine report.

## Playing
- Take the crown from its cushion by the mirror, then leave through the door. The door won't open while the king's
  bare-headed.
- In the throne room, walk to the throne and sit to hold court. Tap or press E to move a conversation on. In the
  petition panel, send agents with + and −, offer treasury items, then Grant or Refuse.
- **Keyboard:** ← → or A D to walk, E or Space to look, talk or continue, Esc to pause.
- **Phone:** hold beside the king to walk, tap a spot to walk there, tap a ◇ to look closer. On a phone held upright
  it asks you to turn it. A Fold's inner screen plays either way.

URL options: `?room=throne`, `?x=3`, `?crown`, `?q=low`, `?nofx`, `?fps`.

## Build
```bash
./build.sh                                  # → build/index.html and build/artifact.html
cd tools && npm install && node shot.js     # headless screenshots (see ENGINE.md §11)
```

## Credits
Characters, outfits and animation: Quaternius (CC0). Renderer: three.js r160 (MIT). Fonts: Alegreya (SIL OFL).
Everything else is original to this project.
