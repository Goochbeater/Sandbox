# The Swan Throne

A playable 2.5D (HD-2D) slice in the style of *Yes, Your Grace: Snowfall*. Every place is built in 3D with pixel-art
textures, depth of field, bloom and wet reflective floors. The characters are real 3D models drawn as live pixel
sprites.

The slice has:
- a title screen over the fortress in a storm
- an opening cutscene
- the bedchamber
- the throne room, where you hold court, hear petitions, send agents and split the week's Prosperity
- the study
- the queen's garden, with Halina and the children
- the training yard, with Ser Bogdan and the sparring knights
- an illustrated travel map

Open `build/index.html` in a browser. The page is one self-contained file; the music sits beside it in `build/audio/`.

**How it's made, how to extend it:** [ENGINE.md](ENGINE.md). **Where the story goes:** [STORY.md](STORY.md).

## Playing
- Take the crown from its cushion by the mirror, then leave through the door. You can't hold court bare-headed.
- Throne room: walk to the throne and sit to hold court. In the petition panel, send agents with + and −, offer
  treasury items, then Grant or Refuse.
- Garden and yard: talk to anyone with a ◇ over them. The oak gate joins the garden and the yard; doors and the map
  button (or M) take you anywhere that's open.
- **Keyboard:** ← → or A D to walk, E or Space to look, talk or continue, M for the map, Esc to pause.
- **Phone:** hold beside the king to walk, tap a spot to walk there, tap a ◇ to look closer. A Fold's inner screen
  plays either way up.

URL options: `?room=bedroom|throne|study|garden|yard|exterior`, `?x=3`, `?crown`, `?intro`, `?q=low`, `?nofx`, `?fps`.

## Build
```bash
./build.sh                                  # → build/index.html, build/artifact.html, build/audio/
cd tools && npm install && node shot.js     # headless screenshots (see ENGINE.md §11)
```

## Credits
- **Music:** public domain, from FreePD: Rafael Krux, Kevin MacLeod and others. The full list is under Credits in
  the game.
- **Coin sound:** Kenney (CC0).
- **Characters, outfits and animation:** Quaternius (CC0).
- **Renderer:** three.js r160 (MIT).
- **Fonts:** Alegreya and Cinzel Decorative (SIL OFL).

Everything else is original to this project.
