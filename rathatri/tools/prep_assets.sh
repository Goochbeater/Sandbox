#!/bin/bash
# Regenerates assets/extra/* (the mobile texture set embedded by build.sh) from the extracted source images.
# Inputs are read-only. Usage (all optional):
#   tools/prep_assets.sh [STARFALL_DIR] [BOBAFET_DIR] [OUT_DIR]
#   or env: SF=... BF=... OUT=...
# Output: opaque colour maps -> .jpg (q78); normal maps -> .jpg (q85, less 8-bit banding); alpha -> .webp (q80).
# Sizes: tiles 512x512, equirect sky maps 1024x512, the foliage card 512x512.
set -e
cd "$(dirname "$0")/.."
SRC_DEFAULT=/tmp/claude-0/-home-user-Sandbox/4a9ef7ba-a209-5673-8e8d-37bf6d3aa5b1/scratchpad/assets_extracted
SF="${1:-${SF:-$SRC_DEFAULT/starfall}}"
BF="${2:-${BF:-$SRC_DEFAULT/bobafet}}"
OUT="${3:-${OUT:-assets/extra}}"
mkdir -p "$OUT"
for d in "$SF" "$BF"; do [ -d "$d" ] || { echo "missing source dir: $d"; exit 1; }; done

# tile <src> <dst> <WxH> <quality>: opaque, sRGB-tagged-as-is, 4:2:0 progressive jpeg
jpg() { convert "$1" -background black -alpha off -resize "$3" -strip -sampling-factor 4:2:0 -interlace Plane -quality "$4" "$2"; }
# webp_alpha <src> <dst> <WxH>: keeps the alpha matte (foliage cards are alpha-tested in the engine)
webp_alpha() { convert "$1" -background none -resize "$3" -strip -define webp:method=6 -define webp:alpha-quality=85 -quality 80 "$2"; }

# ---- starfall (AI-painted, 5 PNG) ----
jpg "$SF/_script02_9fc838d8.png" "$OUT/ground_lichen.jpg"     512x512  78   # lichen gravel, tiles (Starfall groundTex)
jpg "$SF/_script02_979cdb47.png" "$OUT/rock_strata.jpg"       512x512  78   # layered stone, tiles (Starfall rockTex)
jpg "$SF/_script02_1fbdb05f.png" "$OUT/gas_giant.jpg"        1024x512! 78   # equirect gas giant, lon/lat sampled (sky)
jpg "$SF/_script02_ed952f8d.png" "$OUT/nebula_a.jpg"         1024x512! 78   # equirect star nebula, sky dome
webp_alpha "$SF/_script02_64d9afc7.png" "$OUT/foliage_branch.webp" 512x512 # leafy branch card (alpha)

# ---- bobafet (Poly Haven CC0 photo scans, WebP; colour + normal per set, the mix/ORM maps are not shipped) ----
jpg "$BF/_script02_b6512b27.webp" "$OUT/hull_plate_rust.jpg"      512x512 78   # rust_coarse_01 albedo
jpg "$BF/_script02_c949faa9.webp" "$OUT/hull_plate_rust_nrm.jpg"  512x512 85   # rust_coarse_01 normal
jpg "$BF/_script02_b7c1e5e2.webp" "$OUT/rock_dark.jpg"            512x512 78   # rock_wall_08 albedo
jpg "$BF/_script02_b6f4860d.webp" "$OUT/rock_dark_nrm.jpg"        512x512 85   # rock_wall_08 normal
jpg "$BF/_script02_82bc23f2.webp" "$OUT/floor_tiles_grey.jpg"     512x512 78   # large_grey_tiles albedo
jpg "$BF/_script02_b826f5f8.webp" "$OUT/floor_tiles_grey_nrm.jpg" 512x512 85   # large_grey_tiles normal
jpg "$BF/_script02_e5fba4a2.webp" "$OUT/planks_dark.jpg"          512x512 78   # dark_wooden_planks albedo
jpg "$BF/_script02_bc010bdd.webp" "$OUT/leather_brown.jpg"        512x512 78   # fabric_leather_01 albedo
jpg "$BF/_script02_5a16f49d.webp" "$OUT/leather_brown_nrm.jpg"    512x512 85   # fabric_leather_01 normal

echo "assets in $OUT:"; ls -l "$OUT" | awk 'NR>1{print "  " $9 "  " $5}'
du -cb "$OUT"/* | tail -1 | awk '{printf "total %d bytes (%.2f MB)\n", $1, $1/1048576}'
