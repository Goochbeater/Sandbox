#!/usr/bin/env python3
"""Fail the build if two parts declare the same top-level name (they share one script scope)."""
import os, re, sys
d = sys.argv[1] if len(sys.argv) > 1 else 'parts'
pat = re.compile(r'^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', re.M)
seen = {}; bad = 0
for f in sorted(os.listdir(d)):
    if not f.endswith('.js'): continue
    for m in pat.finditer(open(os.path.join(d, f)).read()):
        n = m.group(1)
        if n in seen and seen[n] != f: print(f'DUPLICATE top-level name {n!r} in {f} and {seen[n]}'); bad += 1
        seen.setdefault(n, f)
sys.exit(1 if bad else 0)
