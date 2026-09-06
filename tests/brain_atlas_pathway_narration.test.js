// During guided pathway playback every auto-advance already announces
// "Step N, label. description" through the tool's announcer, and the manual
// prev/next buttons do the same. The progress counter beside it was also an
// aria-live region, so each step produced a second announcement of a bare
// "3 / 12" on top, every 0.9 to 2.6 seconds for as long as playback ran. That
// is the live-region-narrates-the-animation pattern. The counter is still
// there; it just stops talking. This pins that no aria-live region in the tool
// is driven by a timer.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const src = readFileSync(FILE, 'utf8');

describe('brainAtlas pathway playback narrates once per step', () => {
  it('the progress counter is no longer a live region', () => {
    expect(src).toContain('className: "brainatlas-3d-pathway-progress", "data-brainatlas-pathway-progress": "true"');
    expect(src).not.toMatch(/brainatlas-3d-pathway-progress"[^}]*"aria-live"/);
  });

  it('each step is still announced explicitly, so nothing was lost', () => {
    // the auto-advance passes announce: true and the step function speaks
    expect(src).toMatch(/selectBrainAtlas3DPathwayStep\(brain3DPathwayInfo\.steps\[nextIndex\], nextIndex, \{ keepPlaying: true, announce: true \}\)/);
    expect(src).toMatch(/if \(opts\.announce !== false && typeof announceToSR === 'function'\) announceToSR\('Step ' \+ \(resolvedIndex \+ 1\)/);
  });

  it('no remaining live region sits inside the interval-driven playback panel', () => {
    // the pathway panel is the only timer-driven surface in the tool; every
    // other aria-live here changes on a user action (a filter, a slider, a load)
    const start = src.indexOf('brainatlas-3d-pathway-steps');
    const end = src.indexOf('brainatlas-3d-slice', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const panel = src.slice(start - 4000, end);
    expect(panel).not.toContain('"aria-live"');
  });

  it('the desktop mirror is byte-identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_brainatlas.js', 'utf8')).toBe(src);
  });
});
