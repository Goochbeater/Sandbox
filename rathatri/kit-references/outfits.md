# Outfits: modelled clothing and recolour grades

Source: Quaternius *Modular Character Outfits – Fantasy [Standard]* (CC0). There are two outfits (ranger, peasant),
each in a male and a female version, skinned to the same 65-joint skeleton as the base characters. They're baked into
`q.bin` as part lists: `rm_ranger`, `rm_peasant`, `rf_ranger`, `rf_peasant`.

## Part names (use the suffix in `parts`)

| Outfit | Male parts | Female parts |
|---|---|---|
| ranger | `Body`, `Body_Belt_1`, `Legs`, `Feet_Boots`, `Arms`, `Arms_Bracer`, `Acc_Pauldron`, `Head_Hood` | `Body`, `Body_Belt_1`, `Body_Belt_2`, `Legs`, `Feet`, `Arms`, `Arms_Bracer`, `Acc_Pauldrons`, `Head_Hood` |
| peasant | `Body`, `Legs`, `Feet`, `Arms` | `Body`, `Legs`, `Feet`, `Arms` |

You can mix pieces across outfits. The Jedi, for example, are peasant `Body`/`Arms`/`Legs` with ranger `Feet_Boots` and
`Body_Belt_1`. Bare hands/arms use the regular-body skin, or a glove colour via `glove: 0xRRGGBB`.

## Spec format (`CAST.QO[name]` or a direct `QB.buildOutfit` call)

```js
{ female: false, glove: 0x16120e, hair: ['Hair_Buzzed'], hairCol: 0x2a1c12, browCol: 0x2a1c12, cullHead: false,
  tabard: { col: 0x4e3c2a, x0: 0.04, x1: 0.1 },          // optional Jedi-style tabard bands cut from the Body mesh
  parts: [ [kind, part, grade, opts], ... ] }
// kind: 'ranger' | 'peasant'
// grade: { rules: [rule, rule, rule], sat, val, tint }   (max 3 rules)
// rule: { h: sourceHueDeg, w: widthDeg, toH: targetHueDeg (omit = keep hue), s: satMul, v: valMul, minS: minSaturation }
// opts: { metal, ns (normal strength), env (reflections), sheen, sheenCol, rough, hidden, grow: [sx, sy, sz, dy, dz] }
```

How grading works: the painted texture is kept, so stitching, folds and wear survive. Each rule selects pixels whose hue
is within `w` of `h` and whose saturation is above `minS`, then re-hues them to `toH` and scales saturation and value.
After the rules, `sat`/`val` apply to the whole part and `tint` multiplies it.

Source hues in the textures:
- **ranger:** green cloth ≈ **115°**, brown leather ≈ **28–30°**; the rest is neutral (metal, cream, stitches).
- **peasant:** brown vest, trousers and boots ≈ **30°** (saturated); cream shirt ≈ **38–40°** (pale, low saturation).

Helpers used in p15f (copy them):
```js
const toBlue = (h, s, v) => ({ h: 115, w: 80, toH: h, s, v, minS: 0.03 });   // re-hue the ranger GREEN to any hue h
const leatherV = (v, s) => ({ h: 28, w: 45, s: s === undefined ? 1 : s, v }); // keep leather hue, set darkness
const CREAM = (s, v) => ({ h: 38, w: 30, s, v, minS: 0.02 });                  // peasant shirt tone
```

## Worked palettes (all verified in-game)

| Look | Spec (abridged) |
|---|---|
| Naboo guard (navy tunic, brown leather) | ranger `Body`/`Arms`: `[toBlue(220, 0.9, 1.0), leatherV(0.8)]`; `Legs`: `[toBlue(29, 0.35, 0.55)]`; boots `sat 0.6 val 0.45`; `Acc_Pauldron` navy, metal 0.8 |
| Jedi (cream tunic, brown tabard) | peasant `Body`/`Arms`: `[leatherV(0.95, 0.85), CREAM(1.3, 0.72)]`, sat 0.9, val 0.95, tint 0xfff0dc; `Legs`: `[leatherV(2.1, 0.55)]`; ranger boots `sat 0.7 val 0.55`; `tabard: { col: 0x4e3c2a }` |
| Black Sith costume (Maul) | ranger `Body`/`Legs`/`Arms`: `{ sat: 0.1, val: 0.27, tint: 0xe8e8ff }` with opts `{ ns: 0.7, env: 0.5, metal: 0.2 }`; belt/boots `{ sat: 0.06, val: 0.17 }` with `{ metal: 0.12, ns: 0.55, env: 0.35 }`; **no `Arms_Bracer`** |
| Desert nomad (Tusken) | peasant all parts: `sat 0.35, val 1.2, tint 0xe8dcc0`; `cullHead` + wrapped SDF head |
| Gungan warrior leathers | peasant `Body`/`Arms`: `[{ h: 38, w: 32, toH: 32, s: 2.2, v: 0.86, minS: 0.02 }, leatherV(0.9)]` |
| Black-clad thug | ranger everything `sat 0.1–0.15, val 0.3–0.4`, pauldron metal 0.9 |
| Red and gold enforcer | `toBlue(0, 0.8, 0.6)` (green → red), pauldron `toBlue(43, 0.9, 1.2)` gold |
| Senate guard (royal blue) | `toBlue(227, 1.1, 0.95)` + leather re-hued `{ h: 28, w: 45, toH: 225, s: 0.9, v: 0.8 }` |

## Traps

- **Hues are degrees.** Passing 0.61 instead of 220 turned navy into maroon.
- **Don't recolour with class masks.** They blend leather into magenta at edges. Hue-selective grading is the method that works.
- **Tan or cream tops can read as bare skin** at distance. Check them in the wardrobe sheet and darken or re-hue if needed.
- **Gloss reads as costume-shop.** Straps, buckles and bracers with high metal/env look "fantasy ranger". For a clean
  silhouette, drop the accessory parts and lower `metal`, `ns` and `env`.
- **glTF normal maps** need `normalScale.y = -1`. outfitMat already does this; keep it if you add materials.
- **Hoods over horns or crests:** add `Head_Hood` with `{ hidden: true, grow: [1.16, 1.1, 1.14, 0.012, 0.004] }` and
  toggle it via the part's mesh visibility (`CLOAK.wear` does this for Maul).
