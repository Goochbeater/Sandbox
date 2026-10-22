#!/bin/bash
# Character-kit engine (from DARTH MAUL · SITH APPRENTICE) — single-file three.js r160 third-person action game.
# Concatenates head.html + vendor/three.classic.js (r160) + parts/*.js + tail.html into ONE html file.
#   ./rebuild.sh          -> build/game.html
#   ./rebuild.sh --ship   -> also copies to ~/Desktop/$(cat NAME).html   (NAME file = the game's slug)
set -e
cd "$(dirname "$0")"
export LC_ALL=C
NAME=$(cat NAME 2>/dev/null || echo game); mkdir -p build; OUT="build/game.html"; SHIP=0
for a in "$@"; do [ "$a" = "--ship" ] && SHIP=1; done
STAMP=$(date '+%Y-%m-%d %H:%M:%S')
TMPJS="$(mktemp -t mgjs).js"
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
sed -i '' "s/@@BUILD@@/$STAMP/g" "$TMPJS"
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
  if [ -f assets/q.bin ]; then printf '<script type="application/json" id="qjson">'; cat assets/q.json; printf '</script>\n<script type="application/octet-stream" id="qbin">'; base64 -i assets/q.bin | tr -d '\n'; printf '</script>\n'; for t in assets/*.jpg; do n=$(basename "$t" .jpg); printf '<script type="application/octet-stream" id="tex_%s">' "$n"; base64 -i "$t" | tr -d '\n'; printf '</script>\n'; done; fi
  if [ $SHIP = 1 ] && [ -f intro/intro.mp4 ]; then printf '<script type="application/octet-stream" id="introB64">'; base64 -i intro/intro.mp4 | tr -d '\n'; printf '</script>\n'; fi
  printf '</body>\n</html>\n'
} > "$OUT"
rm -f "$TMPJS"
BK="$HOME/Library/Application Support/$NAME-backup"; mkdir -p "$BK"; tar --exclude='./tools/node_modules' --exclude='./build' --exclude='./out*' -czf "$BK/src-latest.tgz" . 2>/dev/null || true
cp "$BK/src-latest.tgz" "$BK/src-$(date '+%H%M').tgz" 2>/dev/null || true
echo "built $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes) @ $STAMP"
if [ $SHIP = 1 ]; then cp "$OUT" "$HOME/Desktop/$NAME.html"; echo "shipped -> ~/Desktop/$NAME.html"; fi
