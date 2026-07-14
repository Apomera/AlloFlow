// Image-placeholder "×" remove button must PERSIST the removal (2026-06-16, user report:
// "the X button that removes the image placeholder isn't actually working").
//
// The preview renders in an iframe; edits live only in the iframe DOM until a handler calls
// window.parent.__alloflowOnPdfPreviewMutated(), which debounce-snapshots the iframe's outerHTML
// back into pdfFixResult.accessibleHtml (AlloFlowANTI.txt:10554-10571). Every other image handler
// (drag/upload/pick swap, resize) calls it; the two "×" remove buttons did NOT — so the figure
// vanished visually but reappeared on the next re-render and stayed in the export. Both now call it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('placeholder "×" remove buttons persist the removal', () => {
  it('every figure-remove onclick (f.remove()) also notifies the parent to snapshot the edit', () => {
    // find each "...f.remove();..." inside a remove-placeholder button onclick and assert the
    // persist call follows within the same IIFE.
    const removeCalls = [...src.matchAll(/getElementById\('\$\{_?imgId\}-figure'\);if\(f\)f\.remove\(\);([^"]*)\}\)\(\)/g)];
    expect(removeCalls.length).toBe(2); // both render paths (main render + renderJsonToHtml placeholder)
    for (const m of removeCalls) {
      expect(m[1]).toContain('window.parent.__alloflowOnPdfPreviewMutated()');
    }
  });

  it('the raw (non-persisting) remove form is gone from both sites', () => {
    expect(src).not.toContain("getElementById('${imgId}-figure');if(f)f.remove();})()");
    expect(src).not.toContain("getElementById('${_imgId}-figure');if(f)f.remove();})()");
  });
});
