#!/usr/bin/env bash
# Builds eni-tutor-netlify-drop.zip: a site root for a drag-and-drop deploy,
# with the chat edge function included. Run `node build.js` first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp "$ROOT/dist/index.html" "$ROOT/dist/preview.html" "$STAGE/"
mkdir -p "$STAGE/netlify/edge-functions"
cp "$ROOT/netlify/edge-functions/chat.js" "$STAGE/netlify/edge-functions/"
cp "$ROOT/netlify/edge-functions/knowledge.js" "$STAGE/netlify/edge-functions/"
cp "$ROOT/drop/netlify.toml" "$STAGE/"
rm -f "$ROOT/eni-tutor-netlify-drop.zip"
(cd "$STAGE" && zip -q -r "$ROOT/eni-tutor-netlify-drop.zip" .)
unzip -l "$ROOT/eni-tutor-netlify-drop.zip"
