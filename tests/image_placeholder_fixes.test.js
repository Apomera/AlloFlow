// Image-placeholder fixes (2026-06-17), two bugs from real testing:
//  #7 Resize only shrank: the resizer expressed width as a PERCENT OF THE PARENT clamped to 100, so
//     an image whose <figure> shrink-wraps it starts at ~100% and can only shrink (and outward drag
//     was ~1/parentWidth of a percent per px — imperceptible). Fixed to pixel-anchored sizing.
//  #6 "Pick extracted" no-op: the handler resolved the pool as `iframeGlobal || parentGlobal`, but an
//     EMPTY ARRAY IS TRUTHY — so a stale empty iframe global shadowed the populated parent list and
//     the picker showed "No extracted images yet". Fixed to prefer whichever list is non-empty.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('#7 image resize — pixel-anchored, symmetric grow/shrink', () => {
  it('apply() sets a pixel width and defeats the max-width cap (no percent, no clamp-to-100)', () => {
    const i = src.indexOf('const _attachPreviewImageResizer');
    const body = src.slice(i, i + 3200);
    expect(body).toContain("img.style.width = px + 'px'");
    expect(body).toContain("img.style.maxWidth = 'none'");
    expect(body).toContain('const pxOf = (img) => Math.round(img.getBoundingClientRect().width)');
    // the old percent path must be gone
    expect(body).not.toContain("img.style.width = pct + '%'");
    expect(body).not.toContain('pctOf');
  });

  it('drag math is image-anchored (1 drag-px = 1 image-px), not divided by parent width', () => {
    // unique strings — search the whole resizer source (the handlers sit ~3KB into the function)
    expect(src).toContain('apply(target, drag.w0 + (pe.clientX - drag.x0))');
    expect(src).not.toContain('/ drag.pw');
    // width is capped at the page width so it can't overflow the column, floored so it can't vanish
    expect(src).toContain('Math.max(24, Math.min(_maxPx(), Math.round(px)))');
  });
});

describe('#6 pick-extracted — empty-array no longer shadows the populated parent list', () => {
  it('resolves the pool by preferring whichever list is NON-EMPTY (both handler sites)', () => {
    // the buggy `iframeGlobal || parentGlobal` (empty array wins) must be gone
    expect(src).not.toContain("(window.__alloflowExtractedImages||(function(){try{return window.parent&&window.parent.__alloflowExtractedImages;}catch(_){return null;}})()))||[]");
    // the fixed resolution: parent-if-nonempty, else local-if-nonempty, else either-or-empty
    const occurrences = (src.match(/var list=\(_pL&&_pL\.length\)\?_pL:\(\(_lL&&_lL\.length\)\?_lL:\(_pL\|\|_lL\|\|\[\]\)\)/g) || []).length;
    expect(occurrences).toBe(2); // both _pickHandler and _pickHandler2
  });

  it('still shows an honest empty-state message only when BOTH lists are genuinely empty', () => {
    expect(src).toContain("msg.setAttribute('data-alloflow-nomsg','true')");
    expect(src).toContain('No extracted images yet.');
  });
});
