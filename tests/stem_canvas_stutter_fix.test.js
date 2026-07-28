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

// Only the two served copies: stem_lab/ (CDN) and public/stem_lab/ (bundled desktop
// app). The former third entry, desktop/web-app/public/stem_tool_<tool>.js with no
// stem_lab/ segment, was a fossil no code path ever requested — deleted, along with
// the other 80 like it, once it was confirmed the CDN serves the SPA fallback for
// that path and no tool id lived only there.
const DNA_PATHS = [
  'stem_lab/stem_tool_dna.js',
  'desktop/web-app/public/stem_lab/stem_tool_dna.js',
];
const ECO_PATHS = [
  'stem_lab/stem_tool_ecosystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_ecosystem.js',
];
const read = (p) => readFileSync(p, 'utf8');

// Extract sizeDnaCanvas and RUN it, rather than matching its source text.
//
// The original version of this test pinned exact spellings —
// "ctx2d.scale(2, 2)" and "cv.width !== _tw". Commit 54027cf33 rewrote the DNA
// renderer and reimplemented the same guard BETTER: real devicePixelRatio clamped
// to 1-3 instead of a hard-coded x2, and setTransform (idempotent) instead of
// scale (which compounds if called twice). The behaviour was never lost, but the
// test went red and stayed red, reporting a regression that had not happened.
//
// So: pin the INVARIANT. Assigning canvas.width CLEARS the canvas, which is the
// stutter; the fix is that it only happens when the size actually changed.
function loadSizer(path) {
  const src = readFileSync(path, 'utf8');
  const start = src.indexOf('function sizeDnaCanvas(cv, ctx2d) {');
  const end = src.indexOf('function createDnaCanvasLoop(', start);
  if (start < 0 || end < 0) throw new Error(`sizeDnaCanvas not found in ${path}`);
  // eslint-disable-next-line no-new-func
  return new Function(`${src.slice(start, end)}\nreturn sizeDnaCanvas;`)();
}

// A canvas whose width/height assignments are counted, the way the DOM behaves:
// writing either one resets the bitmap.
function fakeCanvas(cssW, cssH) {
  const state = { _w: 0, _h: 0, writes: 0 };
  return {
    offsetWidth: cssW,
    offsetHeight: cssH,
    getBoundingClientRect: () => ({ width: cssW, height: cssH }),
    get width() { return state._w; },
    set width(v) { state.writes += 1; state._w = v; },
    get height() { return state._h; },
    set height(v) { state._h = v; },
    _writes: () => state.writes,
  };
}
const fakeCtx = () => {
  const calls = { setTransform: 0, scale: 0 };
  return { setTransform: () => { calls.setTransform += 1; }, scale: () => { calls.scale += 1; }, _calls: calls };
};

describe('DNA Lab canvas anti-stutter', () => {
  DNA_PATHS.forEach((p) => {
    describe(p, () => {
      it('sizes the canvas on first call', () => {
        const sizer = loadSizer(p);
        const cv = fakeCanvas(300, 150);
        const out = sizer(cv, fakeCtx());
        expect(cv._writes()).toBe(1);
        expect(cv.width).toBeGreaterThan(0);
        // Returns CSS dimensions, not device pixels — callers lay out in CSS units.
        expect(out).toEqual({ width: 300, height: 150 });
      });

      it('does NOT rewrite width when the size has not changed — this IS the fix', () => {
        // React re-fires the inline ref on every render. Rewriting canvas.width
        // each time blanks the canvas mid-animation, which is the stutter.
        const sizer = loadSizer(p);
        const cv = fakeCanvas(300, 150);
        const ctx = fakeCtx();
        sizer(cv, ctx);
        const afterFirst = cv._writes();
        for (let i = 0; i < 5; i += 1) sizer(cv, ctx);
        expect(cv._writes(), 'canvas was re-sized on an unchanged ref fire').toBe(afterFirst);
      });

      it('does resize when the element actually changes size', () => {
        const sizer = loadSizer(p);
        const cv = fakeCanvas(300, 150);
        const ctx = fakeCtx();
        sizer(cv, ctx);
        cv.offsetWidth = 640;
        cv.getBoundingClientRect = () => ({ width: 640, height: 150 });
        sizer(cv, ctx);
        expect(cv._writes()).toBe(2);
      });

      it('re-applies the transform on every call, so scale never compounds', () => {
        // setTransform is absolute; scale is relative. Applying scale repeatedly
        // without a resize would shrink the drawing every frame.
        const sizer = loadSizer(p);
        const cv = fakeCanvas(300, 150);
        const ctx = fakeCtx();
        sizer(cv, ctx);
        sizer(cv, ctx);
        sizer(cv, ctx);
        expect(ctx._calls.setTransform).toBe(3);
        expect(ctx._calls.scale, 'relative scale() applied on an unchanged canvas').toBe(0);
      });
    });

    it(`persists the animation tick on the node — ${p}`, () => {
      // Cheap to keep as a text pin: it is a property name on the DOM node, so
      // there is no behaviour to drive without the whole render loop.
      const src = read(p);
      expect(src).toMatch(/cv\._dnaTick\s*\|\|\s*0/);
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
