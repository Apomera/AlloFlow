// Echolocation Lab reduced-motion contracts (2026-08-23).
//
// The tool had a reducedMotion ref that was written on mount and on media-query
// change but READ BY NOTHING - an orphan setter, the recorded bug class where a
// green suite proves only that the setter runs. Its CSS reduced-motion blanket
// cannot help either: a rAF loop is not a CSS animation, so all six canvas
// loops animated regardless of the preference.
//
// The fix gates the three loops whose motion is decorative. Verified at runtime
// by dev-tools/echolocation_reduced_motion_check.cjs (real Chromium, both media
// states, canvas pixels hashed twice): under reduce, waves/ecology canvases are
// static and doppler still animates; with no-preference everything animates.
// These pins keep the guards from being refactored away between probe runs.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const PATHS = [
  'stem_lab/stem_tool_echolocation.js',
  'desktop/web-app/public/stem_lab/stem_tool_echolocation.js',
];
const src = (p) => fs.readFileSync(p, 'utf8');

describe('echolocation reduced-motion contracts', () => {
  it.each(PATHS)('%s consumes the reducedMotion ref instead of orphaning it', (p) => {
    const s = src(p);
    // Written twice (mount + change handler)...
    expect(s.match(/reducedMotion\.current\s*=/g)?.length).toBeGreaterThanOrEqual(2);
    // ...and READ at least three times: the wave, reflection and soundscape
    // phase guards. An orphaned ref has zero reads and this fails.
    const reads = s.match(/!reducedMotion\.current/g) || [];
    expect(reads.length, 'reducedMotion.current is never read - orphan setter').toBeGreaterThanOrEqual(3);
  });

  it.each(PATHS)('%s freezes each decorative phase advance under reduced motion', (p) => {
    const s = src(p);
    for (const inc of ['0.05', '0.04', '0.03']) {
      expect(s, 'phase += ' + inc + ' lost its guard').toContain('if (!reducedMotion.current) phase += ' + inc + ';');
      expect(s, 'an unguarded phase += ' + inc + ' came back').not.toMatch(new RegExp('(?<!reducedMotion\\.current\\) )phase \\+= ' + inc.replace('.', '\\.') + ';'));
    }
  });

  it('keeps the desktop mirror byte-identical', () => {
    expect(src(PATHS[1])).toBe(src(PATHS[0]));
  });
});
