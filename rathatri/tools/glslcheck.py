#!/usr/bin/env python3
"""Flag reversed smoothstep edges written with numeric literals (undefined on Metal/ANGLE)."""
import os, re, sys
d = sys.argv[1] if len(sys.argv) > 1 else 'parts'
pat = re.compile(r'smoothstep\(\s*(-?[0-9.]+)\s*,\s*(-?[0-9.]+)\s*,')
bad = 0
for f in sorted(os.listdir(d)):
    if not f.endswith('.js'): continue
    for i, line in enumerate(open(os.path.join(d, f)), 1):
        for m in pat.finditer(line):
            a, b = float(m.group(1)), float(m.group(2))
            if a >= b: print(f'REVERSED smoothstep {f}:{i}: {m.group(0)}'); bad += 1
sys.exit(1 if bad else 0)
