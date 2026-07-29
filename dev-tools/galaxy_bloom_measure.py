"""Measure the bloom sweep produced by galaxy_bloom_tune.cjs.

    python3 dev-tools/galaxy_bloom_measure.py <out-dir>

Reports per setting:
  blown%   viewport clipped to >=250 in all three channels
  colour%  of LIT pixels, how many carry a channel spread >=25
  mean     average brightness, to catch over-correction into mud
"""
import json
import sys
from PIL import Image

out = sys.argv[1] if len(sys.argv) > 1 else '.'
shots = json.load(open(out + '/bloom-shots.json'))

print('strength  thresh    blown%   colour%    mean    lit%')
for s in shots:
    im = Image.open(out + '/' + s['name']).convert('RGB')
    px = list(im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata())
    n = len(px)
    blown = lit = colour = 0
    total = 0
    for r, g, b in px:
        mx = max(r, g, b)
        mn = min(r, g, b)
        total += (r + g + b) / 3
        if r >= 250 and g >= 250 and b >= 250:
            blown += 1
        if mx >= 120:
            lit += 1
            if mx - mn >= 25:
                colour += 1
    print('%-9s %-8s %7.2f %9.1f %7.1f %7.1f' % (
        s['strength'], s['threshold'],
        100.0 * blown / n,
        100.0 * colour / max(1, lit),
        total / n,
        100.0 * lit / n,
    ))
