#!/bin/bash
# DARK LEGACY: RATHATRI — single-file build (Linux/macOS portable).
# Concatenates head.html + vendor/three.classic.js (r160) + parts/*.js + embedded assets into ONE html file.
#   ./build.sh                 -> build/game.html
#   ./build.sh --ship          -> also copies to ../dist/index.html (the Netlify publish dir)
#   OUT=/tmp/x.html ./build.sh -> custom output path (parallel agents: never share an OUT)
set -e
cd "$(dirname "$0")"
export LC_ALL=C
OUT="${OUT:-build/game.html}"; SHIP=0
for a in "$@"; do [ "$a" = "--ship" ] && SHIP=1; done
mkdir -p "$(dirname "$OUT")"
STAMP=$(date '+%Y-%m-%d %H:%M:%S')
TMPJS="$(mktemp).js"
b64() { base64 -w0 "$1" 2>/dev/null || base64 "$1" | tr -d '\n'; }
: > "$TMPJS"
for f in $(ls parts/*.js | sort); do
  b=$(basename "$f")
  if [ ! -s "$f" ]; then echo "EMPTY PART $b"; exit 1; fi
  if grep -qi '</script' "$f"; then echo "PART $b contains </script"; exit 1; fi
  if ! node --check "$f" 2> "$TMPJS.perr"; then echo "SYNTAX in $b:"; sed -n '1,8p' "$TMPJS.perr"; rm -f "$TMPJS" "$TMPJS.perr"; exit 1; fi
  printf '\n/* ==== %s ==== */\n' "$b" >> "$TMPJS"
  cat "$f" >> "$TMPJS"
done
rm -f "$TMPJS.perr"
sed -i "s/@@BUILD@@/$STAMP/g" "$TMPJS"
if ! node --check "$TMPJS" 2> "$TMPJS.err"; then echo "SYNTAX (combined):"; sed -n '1,12p' "$TMPJS.err"; rm -f "$TMPJS" "$TMPJS.err"; exit 1; fi
rm -f "$TMPJS.err"
python3 tools/dupcheck.py parts || { rm -f "$TMPJS"; exit 1; }
python3 tools/glslcheck.py parts || { rm -f "$TMPJS"; exit 1; }
{
  cat head.html
  cat vendor/three.classic.js
  printf '\n</script>\n<script>\n'
  cat "$TMPJS"
  printf '\n</script>\n'
  # baked CC0 character/animation assets (always embedded: tests need them)
  if [ -f assets/q.bin ]; then
    printf '<script type="application/json" id="qjson">'; cat assets/q.json; printf '</script>\n'
    printf '<script type="application/octet-stream" id="qbin">'; b64 assets/q.bin; printf '</script>\n'
    for t in assets/*.jpg; do n=$(basename "$t" .jpg); printf '<script type="application/octet-stream" id="tex_%s">' "$n"; b64 "$t"; printf '</script>\n'; done
  fi
  # extra assets (planet/sky textures etc): assets/extra/<name>.{jpg,png,webp} -> id="ast_<name>" with data-mime; read via ASSET.url(name)
  if [ -d assets/extra ]; then
    for t in assets/extra/*; do
      [ -f "$t" ] || continue
      n=$(basename "$t"); ext="${n##*.}"; base="${n%.*}"
      case "$ext" in jpg|jpeg) mime=image/jpeg;; png) mime=image/png;; webp) mime=image/webp;; mp3) mime=audio/mpeg;; mp4) mime=video/mp4;; *) continue;; esac
      printf '<script type="application/octet-stream" id="ast_%s" data-mime="%s">' "$base" "$mime"; b64 "$t"; printf '</script>\n'
    done
  fi
  # optional user-supplied intro (the engine rule: the ONLY sound in the game)
  if [ $SHIP = 1 ] && [ -f intro/intro.mp4 ]; then printf '<script type="application/octet-stream" id="introB64">'; b64 intro/intro.mp4; printf '</script>\n'; fi
  printf '</body>\n</html>\n'
} > "$OUT"
rm -f "$TMPJS"
echo "built $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes) @ $STAMP"
if [ $SHIP = 1 ]; then mkdir -p ../dist && cp "$OUT" ../dist/index.html; echo "shipped -> ../dist/index.html"; fi
