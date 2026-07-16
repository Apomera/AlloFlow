// Two preview/export polish fixes (2026-06-16, user report):
// 1. The "✨ AI-reconstructed from an image — please verify…" caption note was baked into the
//    document HTML, so it leaked into the SAVED/exported PDF and read as unpolished. The verify
//    nudge already lives in the results-panel review gate (keyed on the data-allo-reconstructed
//    attribute), so the inline note is removed; the attribute (and gate) stay.
// 2. The in-iframe "Pick extracted" picker reads window.__alloflowExtractedImages ||
//    window.parent.__alloflowExtractedImages, but the list was only ever set on the iframe's own
//    contentWindow — lost when the preview iframe reloaded. Now also set on the parent window.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gen = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8')
  + '\n' + readFileSync(resolve(process.cwd(), 'doc_builder_renderer_source.jsx'), 'utf8');
const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

describe('AI-reconstructed table note no longer baked into the exported document', () => {
  it('the inline "AI-reconstructed from an image" caption note is gone from the generator', () => {
    expect(gen).not.toContain('AI-reconstructed from an image');
    expect(gen).not.toContain('please verify it matches the image shown below');
  });

  it('the data-allo-reconstructed attribute is still emitted (the review gate keys off it)', () => {
    // both render paths still mark reconstructed tables so the results-panel gate can list them
    expect((gen.match(/data-allo-reconstructed="image"/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('"Pick extracted" images list survives iframe reloads', () => {
  it('the extracted-images list is set on the PARENT window too (picker fallback)', () => {
    expect(host).toContain('window.__alloflowExtractedImages = extractedImagesList || []');
    // still also set on the iframe contentWindow
    expect(host).toContain('cw.__alloflowExtractedImages = extractedImagesList || []');
  });
});
