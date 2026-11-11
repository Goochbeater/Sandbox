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
   (the 18+ gate); the king's penis is never shown (the engine enforces it: `Actor.SHOW_SEX` stays `false`, so `undress()`
   never draws a man's parts; do not change it); the player picks the king's lines.
7. **Build** with `bash build.sh` (it refuses duplicate `PX.` / `BUILD.` / `SCENE.` … definitions), commit `build/` with
   the source, and keep model names out of commit messages.
8. **The loop is weeks of court** (`ENGINE.md` §13r): petitions are data in `REALM.PETS`, family moments in `REALM.EVENTS`,
   and everything a choice changes goes through `REALM.fx`. New story beats belong in those tables before new code.
9. **No dead choices** (`ENGINE.md` §13r-2): every flag a choice sets is read in the same commit, by an ending, a scene or
   a row in `REALM.ECHO`.
10. **Run `node tools/regress.js` before a commit** (§13t), one suite at a time and never during a build.
11. **Delegating to worker agents** (§13u, `.claude/agents/haiku-coder.md`): one bounded packet per worker, disjoint files,
    workers never build or commit, the lead reads every diff and rewrites any line the player will read. Rooms, poses,
    the renderer, story decisions and all adult content (rule 6) are never delegated.
