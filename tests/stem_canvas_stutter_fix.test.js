// Canvas-stutter regression guard for DNA Lab + Ecosystem.
//
// Both tools attach their canvas via an INLINE callback ref. React calls an
// inline ref (null)-then-(node) on EVERY re-render, which re-runs the ref's
// setup — and both tools push React state while animating (dna transcription
// timers; ecosystem's livePopHistory), so the setup fired continuously:
//   - DNA re-set cv.width (reallocates + CLEARS the canvas) and reset the wobble
//     tick to 0 every render → the helix snapped/stuttered.
//   - Ecosystem rebuilt its entire simulation (creatures/populations live in the
//     ref-setup scope) every render → the sim reset itself continuously.
//
// Fixes (pinned below so a future edit can't silently reintroduce the stutter):
//   - DNA: only resize when the size actually changed; persist the tick on the
//     canvas node (cv._dnaTick) so the animation stays continuous across re-fires.
//   - Ecosystem: defer the ref(null) teardown so an immediate re-attach cancels it
//     (via window._ecoCleanupTimer) — the simulation persists across re-renders,
//     while a real unmount still cleans up after the timeout.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const DNA_PATHS = [
  'stem_lab/stem_tool_dna.js',
  'desktop/web-app/public/stem_lab/stem_tool_dna.js',
  'desktop/web-app/public/stem_tool_dna.js',
];
const ECO_PATHS = [
  'stem_lab/stem_tool_ecosystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_ecosystem.js',
  'desktop/web-app/public/stem_tool_ecosystem.js',
];
const read = (p) => readFileSync(p, 'utf8');

describe('DNA Lab canvas anti-stutter', () => {
  DNA_PATHS.forEach((p) => {
    it(`resizes only on change + persists the tick — ${p}`, () => {
      const src = read(p);
      // Guarded resize: no unconditional cv.width = ... on every ref fire.
      expect(src).toContain('if (cv.width !== _tw || cv.height !== _th) { cv.width = _tw; cv.height = _th; ctx2d.scale(2, 2); }');
      expect(src).not.toContain('var W = cv.width = cv.offsetWidth * 2;');
      // Tick persisted on the node so the wobble is continuous across re-fires.
      expect(src).toContain('var _tick = cv._dnaTick || 0;');
      expect(src).toContain('cv._dnaTick = _tick;');
    });
  });
});

describe('Ecosystem canvas anti-stutter (deferred teardown)', () => {
  ECO_PATHS.forEach((p) => {
    it(`defers ref(null) teardown so re-attach keeps the sim — ${p}`, () => {
      const src = read(p);
      expect(src).toContain('window._ecoCleanupTimer');
      // null branch schedules a deferred cleanup instead of tearing down immediately
      expect(src).toContain('window._ecoCleanupTimer = setTimeout(function() {');
      // re-attach on the same tick cancels the pending teardown
      expect(src).toContain('clearTimeout(window._ecoCleanupTimer); window._ecoCleanupTimer = null;');
      // the persistence guard is still what short-circuits a rebuild
      expect(src).toContain('if (canvas._ecoInit) {');
    });
  });
});
