# Characters: adding and styling a cast member

A character is data in three tables, keyed by the same name. Copy an existing entry that resembles what you want, then
edit it. That's much faster than writing from scratch, and the existing entries are all verified in-game.

| Table | Part | What it holds |
|---|---|---|
| `CAST.SPECS[name]` | p15c_humans.js (humans), p15d_goodguys.js (Gungan, Twi'lek, Senate…) | height, shoulders, `skin: { tone, brow, lip, sss }`, eyes, helmet options, `cloth: (J) => CAST.skirt(J, {...})` panels, and fallback sculpted-body mats |
| `CAST.QC[name]` | p15e_qcast.js | switches the character to the Quaternius body: `female`, `cullHead` (hide the Q head for a helmet or alien head), `hair: [...]`, `hairCol`, `browCol`, plus legacy colour fields |
| `CAST.QO[name]` | p15f_outfits.js | the **modelled outfit**: `parts` (outfit pieces + recolour grades), `glove`, `tabard`, `hair`, `hairCol`, `browCol`, `female` |

`CAST.human(spec)` picks the path:
- **QO + QC present:** the regular-proportion body (`rmale`/`rfemale`) wearing modelled outfit pieces. This is the one you want.
- **QC only:** the superhero UBC body with a shader-painted costume. It's older and reads as a skin-tight suit.
- **Neither:** the sculpted SDF body. That's the fallback, and `?sdf` forces it.

Build on demand with `await CAST.need(['name', ...])`, which fills `CHAR.T[name]`. Levels list their cast in
`LEVEL.def(id, { cast: [...] })` so it's built while loading.

## Spawning

- **Enemy:** add `ENEMY.TYPES[type] = { tpl: '<cast name>', hp, brain: 'gunner'|'melee', moves: 'trooper'|'melee', weapon: 'rifle'|'staff', dmg, speed, name, ... }` (p20_ai.js), then spawn with `ENEMY.spawn(type, x, z, {})`.
- **Duellist or boss:** `new Jedi(who, { x, y, z, yaw, hpMul, aggr })` (p31_boss.js). It uses `CHAR.T[who]`, a saber, and the Jedi AI (blocks, telegraphs, leaps).
- **Hero:** `PLAYER.spawn` builds an `Actor(CHAR.T.maul, …)` with `MOV.maul` and a staff saber. For another hero:
  - build their template with `CAST.need([hero])`;
  - point `PLAYER.spawn` at `CHAR.T[hero]`;
  - swap the prop in `new Saber(kind, colour)`: `'staff'`, `'single'` or a custom prop;
  - keep or clone the moveset (see animation.md).

## Heads

- **Q base heads** (the male/female UBC head) fit the regular bodies exactly. Tone comes from `spec.skin.tone`. They get
  eyebrows and hair meshes (next section) and a fill + rim light (CM.FILL) that keeps faces readable in dark scenes.
- **Masked, helmeted or alien characters:** set `cullHead: true` in QC and QO. The Q head is culled and a sculpted SDF
  head or helmet from `CAST.SPECS` (`helmet: 'naboo'`, `gungan: true`, `lekku: true`, `helm2`…) sits on the neck. Helmet
  origin HOh is raised 2.6 cm on Q heads.
- **A unique hero head** (Maul): CHAR.buildMaul bakes an SDF head (p06) to a mesh and skins it to the head bone.
  - Scale it against the body. On the regular body it needed ×1.07 (`HK`) or it read pin-headed.
  - Makeup/tattoos are evaluated per pixel from head-space coordinates (`CM.maulSkin`).
  - It's worth doing only for a signature hero; everyone else should use Q heads.

## Hair

Baked styles: `Hair_Long`, `Hair_Beard`, `Hair_SimpleParted`, `Hair_Buzzed`, `Hair_Buns`, `Hair_BuzzedFemale`, plus
`Eyebrows_Regular` / `Eyebrows_Female`. Combine them, e.g. `['Hair_Long', 'Hair_Beard']`, and colour with `hairCol` / `browCol`.
Female-made hair is refit to the male head automatically (QB.refit). A bald or tattooed head is `hair: []`.

## Cloth panels (robes, skirts, tabards, capes)

Use `spec.cloth = (J) => CAST.skirt(J, { len, mat, tabard, tabMat, ... })`. This gives verlet panels hung from the pelvis
and chest. Materials are keys of `CLOTH.mat` (p11_cloth.js): `tunic`, `tabard`, `robeBrown`, `robeTan`, `tusken`, `guard`,
`thug`, `cape`, `red`, `senate`. Add a key there for a new colour: `[albedo, sheenColour, roughness, sheen?, envIntensity?]`.
Maul's cape is `CLOAK.wear(actor, true)` (p11b).

Cloth traps, all learned the hard way:
- Carry panels per column (not averaged), or spins fling side panels out like flags.
- On a vehicle, set `inst.drape` so the cape springs toward a streamer shape. Carry the particles in the vehicle frame
  (Cloth.step does this when `inst.drape` is set). Otherwise speed reads as a teleport and it re-settles every frame.
- Refresh `actor.floorY` on vehicles. A stale floor height clamps the cloth into a vertical tube.
- Black cloth: albedo sRGB ≥ 0x13 with a narrow rim (the cloth rim is pow 7 × 0.55), or it greys out edge-on.

## Look checks for every character

Run `sc_wardrobe.js`, which renders the whole cast front and back in level light. Then check:
- Nothing reads as skin that shouldn't (tan tunics can).
- Hue grades didn't turn leather magenta or navy maroon (hues are in **degrees**).
- Helmets sit on the heads.
- Hands are gloved where expected.
- Heads look in proportion to the shoulders.

Then use `sc_look.js` close-ups (WHO=, VIEWS=[[yaw, dist, height, lookY, fov], ...]) for faces and hands.

## Worked example: a new character in one small part

`examples/p15g_viking.js` adds a red-bearded Viking raider. It was dropped into `parts/` as-is, built, and lined up with
`WHOS='["viking","guard","jedi:quigon"]' … sc_wardrobe.js` (result: `examples/viking_lineup.jpg`). The pattern:
```js
CAST.SPECS.viking = Object.assign({}, CAST.SPECS.quigon, { name: 'viking', skin: { tone: 0xd8a888, ... }, cloth: undefined });
CAST.QC.viking   = Object.assign({}, CAST.QC.quigon, { hair: ['Hair_Long', 'Hair_Beard'], hairCol: 0x9a4a1e });
CAST.QO.viking   = { parts: [['peasant', 'Body', grade], ['ranger', 'Arms_Bracer', grade, { metal: 0.3 }], ...], hair: [...], hairCol };
```
Put new cast parts after p15f (e.g. `p15g_<name>.js`) so the tables they extend already exist. Parts load in name
order, and touching a later part's `const` at load time is a TDZ error.
