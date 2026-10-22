#!/bin/bash
# Builds the demo as ONE self-contained page (three.js r160 + parts/*.js + the baked CC0 king assets as base64):
#   build/index.html     full document — open it straight from disk
#   build/artifact.html  the same page without the <html>/<head>/<body> wrapper, for publishing as a claude.ai artifact
set -e
cd "$(dirname "$0")"
mkdir -p build
JS=$(mktemp)
for f in $(ls parts/*.js | sort); do
  node --check "$f" || { echo "syntax error in $f"; exit 1; }
  if grep -qi '</script' "$f"; then echo "$f contains </script"; exit 1; fi
  printf '\n/* ==== %s ==== */\n' "$(basename "$f")" >> "$JS"; cat "$f" >> "$JS"
done
node --check "$JS" 2>/dev/null || cp "$JS" "$JS.js"
BODY=$(mktemp)
{
  cat head.html
  printf '<script>\n'; cat vendor/three.classic.js; printf '\n</script>\n'
  printf '<script type="application/json" id="kjson">'; cat assets/king.json; printf '</script>\n'
  printf '<script type="application/octet-stream" id="kbin">'; base64 -w0 assets/king.bin; printf '</script>\n'
  for t in assets/*.jpg; do n=$(basename "$t" .jpg); printf '<script type="application/octet-stream" id="tex_%s">' "$n"; base64 -w0 "$t"; printf '</script>\n'; done
  printf '<script>\n'; cat "$JS"; printf '\n</script>\n'
} > "$BODY"
cp "$BODY" build/artifact.html
{ printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n'; cat "$BODY"; printf '</body>\n</html>\n'; } > build/index.html
rm -f "$JS" "$BODY"
ls -la build | tail -n +2
