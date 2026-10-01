// The observatory science labels drawn over the 3-D canvas.
//
// TWO DEFECTS, both measured in a real browser:
//
//   1. SQUEEZED. Right-hand labels were `left: 96%` + `translate(-100%)`.
//      Shrink-to-fit sizing runs BEFORE the transform, so the box had only 4%
//      of the container to size itself in: measured 70x130 — one word per line
//      — at 1400, 1100 and 900px alike. Anchored from the right edge instead:
//      151x48.
//
//   2. SWALLOWING CLICKS. 9 of the 14 marks sit over the control column and the
//      labels had no pointer-events-none, so they intercepted clicks on "Hide
//      simulation labels", "Start cinematic tour" and "Toggle fullscreen" — in
//      every observe mode. Measured 3 overlapping buttons before, 0 after.
//
// WHY THESE ARE SOURCE ASSERTIONS. The labels only render behind
// `galaxySceneReady`, which is set after the real 3-D scene builds, so SSR
// never reaches them and jsdom has no layout to measure anyway. The geometry
// above was verified in Chromium; re-run that probe by loading the tool with
// dev-tools/galaxy_no_webgl_check.cjs --real and comparing the bounding boxes
// of `.max-w-[10.5rem]` against the round control buttons. These tests pin the
// CAUSES so a revert fails here rather than silently on screen.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = [
  'stem_lab/stem_tool_galaxy.js',
  'desktop/web-app/public/stem_lab/stem_tool_galaxy.js',
];

// The label element's source, from its className to the end of its style call.
function labelSource(src) {
  const i = src.indexOf('max-w-[10.5rem]');
  expect(i, 'label element not found — this file no longer says what it checks').toBeGreaterThan(-1);
  return src.slice(i, i + 420);
}

describe('observe-mode label geometry', () => {
  it('marks the labels non-interactive, so they cannot swallow control clicks', () => {
    PATHS.forEach((p) => {
      expect(labelSource(readFileSync(p, 'utf8')), p).toContain('pointer-events-none');
    });
  });

  it('anchors right-hand labels from the right edge rather than left+translate', () => {
    PATHS.forEach((p) => {
      const el = labelSource(readFileSync(p, 'utf8'));
      // The squeezing combination, which must not come back.
      expect(el, p).not.toContain("translate(-100%, -50%)");
      expect(el, p).toContain("right: (100 - mark.lx)");
    });
  });

  it('keeps every right-anchored mark clear of the control column', () => {
    // The zoom / home / rotate / tour / fullscreen stack occupies roughly the
    // right 6% of the canvas; a label anchored at 96% reached into it.
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const marks = [...src.matchAll(/lx: (\d+), ly: (\d+)[^}]*?anchor: '(\w+)'/g)]
        .map((m) => ({ lx: +m[1], anchor: m[3] }));
      expect(marks.length, p + ' — mark parse found nothing, so this is vacuous').toBeGreaterThan(10);
      const right = marks.filter((m) => m.anchor === 'right');
      expect(right.length, p).toBeGreaterThan(0);
      right.forEach((m) =>
        expect(m.lx, `right-anchored mark at ${m.lx}% reaches the control column`).toBeLessThanOrEqual(90));
    });
  });

  it('ships identical label markup in both delivery copies', () => {
    const [a, b] = PATHS.map((p) => labelSource(readFileSync(p, 'utf8')));
    expect(a).toBe(b);
  });
});
