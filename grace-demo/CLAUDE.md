# Working on the Grace demo

Read `ENGINE.md` before changing anything, and `STORY.md` before writing any scene or line.

Standing rules (the owner asked for these; they apply to every session):

1. **Keep `ENGINE.md` current.** Every new room, system, helper, rule or fix that taught something gets written up in
   `ENGINE.md` in the same commit: how it is made, the numbers that made it work, and what went wrong on the way. The goal is
   that the next room can be built to the same quality from that file alone.
2. **Quality bar: the throne room.** Measure each new room against it (`ENGINE.md` §13b) and compare frames side by side.
3. **`SCENE.walkCheck()` returns `[]`** in every room: nothing solid stands on the king's or a wanderer's walking line (§13e).
4. **Verify headlessly before saying something works** (`ENGINE.md` §11): default framing, a close view, the far side, the
   page log, and every new interaction driven to its end with `SCENE.lock` back to 0.
5. **Story state is saved:** anything new goes into `GAME.reset`, `GAME.state` and `GAME.load` (`game/g22_title.js`).
6. **Adult scenes** (§13c): adult characters only, never Zofia or Kazik or any child; every scene behind `NIGHT.confirm`
   (the 18+ gate); the king's penis is never shown (hide `K.sexGroup` after undressing); the player picks the king's lines.
7. **Build** with `bash build.sh` (it refuses duplicate `PX.` / `BUILD.` / `SCENE.` … definitions), commit `build/` with
   the source, and keep model names out of commit messages.
