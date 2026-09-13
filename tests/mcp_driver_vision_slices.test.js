// Image-mode vision evidence selection in the remediation driver (2026-09-13 NCES pilot,
// finding 6): the pipeline's sliced audit sends one call per page slice, and the driver used to
// attach the run's ENTIRE rendered page set to every one of them, so fourteen slice audits of a
// 54-page document all described the same five pages. The slice prompt names its pages; the
// driver now attaches only those rendered pages, falls back to the attached bytes when the call
// is about pages that were never rendered, and leaves non-PDF payloads alone.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const requireCjs = createRequire(import.meta.url);
const Driver = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'));

const SLICE = (first, last, total) => `Audit this document.\n\nIMPORTANT — SLICE CONTEXT: This file contains ONLY pages ${first}–${last} of a larger ${total}-page document. Audit just these pages.`;
const pages = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const report = { pageNumbers: [18, 19, 20, 21, 22, 23] };
const inline = (parts) => parts.slice(1).map((part) => part.inline_data.data);

describe('visionPageWindow', () => {
  it('reads the slice marker with an en dash, an em dash, or a hyphen', () => {
    expect(Driver.visionPageWindow(SLICE(19, 23, 54))).toEqual({ mode: 'slice', first: 19, last: 23, totalPages: 54 });
    expect(Driver.visionPageWindow('SLICE CONTEXT: This file contains ONLY pages 1-4 of a larger 24-page document.')).toMatchObject({ first: 1, last: 4 });
    expect(Driver.visionPageWindow('SLICE CONTEXT: This file contains ONLY pages 5 — 8 of a larger 24-page document.')).toMatchObject({ first: 5, last: 8 });
  });

  it('reads the legend re-extraction focus hint and ignores prompts without a page window', () => {
    expect(Driver.visionPageWindow('Focus on pages 3 through 5 of the PDF. Re-extract the legend.')).toEqual({ mode: 'focus', first: 3, last: 5, totalPages: null });
    expect(Driver.visionPageWindow('Audit this HTML for accessibility issues.')).toBeNull();
  });
});

describe('selectVisionParts', () => {
  it('attaches only the rendered pages a slice covers and names exactly those pages', () => {
    const out = Driver.selectVisionParts({ prompt: SLICE(19, 23, 54), base64Data: 'RAWPDF', mimeType: 'application/pdf', pageImages: pages, renderReport: report });
    expect(out.selection).toMatchObject({ mode: 'slice', pages: [19, 20, 21, 22, 23] });
    expect(inline(out.parts)).toEqual(['p2', 'p3', 'p4', 'p5', 'p6']);
    expect(out.parts[0].text).toMatch(/source PDF pages: 19, 20, 21, 22, 23\.$/);
    expect(out.prompt).toBe(out.parts[0].text);
    expect(out.parts.some((part) => part.inline_data && part.inline_data.data === 'RAWPDF')).toBe(false);
  });

  it('gives consecutive slices disjoint evidence instead of the same images fourteen times', () => {
    const first = Driver.selectVisionParts({ prompt: SLICE(18, 20, 54), base64Data: 'RAWPDF', mimeType: 'application/pdf', pageImages: pages, renderReport: report });
    const second = Driver.selectVisionParts({ prompt: SLICE(21, 23, 54), base64Data: 'RAWPDF', mimeType: 'application/pdf', pageImages: pages, renderReport: report });
    expect(inline(first.parts)).toEqual(['p1', 'p2', 'p3']);
    expect(inline(second.parts)).toEqual(['p4', 'p5', 'p6']);
  });

  it('narrows a legend re-extraction call to its focus pages', () => {
    const out = Driver.selectVisionParts({ prompt: 'Focus on pages 20 through 21 of the PDF. Re-extract the legend as JSON.', base64Data: 'RAWPDF', mimeType: 'application/pdf', pageImages: pages, renderReport: report });
    expect(out.selection).toMatchObject({ mode: 'focus', pages: [20, 21] });
    expect(inline(out.parts)).toEqual(['p3', 'p4']);
  });

  it('keeps every rendered page for a whole-document call', () => {
    const out = Driver.selectVisionParts({ prompt: 'Audit this document.', base64Data: 'RAWPDF', mimeType: 'application/pdf', pageImages: pages, renderReport: report });
    expect(out.selection).toMatchObject({ mode: 'all', pages: [18, 19, 20, 21, 22, 23] });
    expect(inline(out.parts)).toEqual(pages);
    expect(out.parts[0].text).toMatch(/source PDF pages: 18, 19, 20, 21, 22, 23\.$/);
  });

  it('falls back to the attached bytes when the slice is about pages that were never rendered', () => {
    const out = Driver.selectVisionParts({ prompt: SLICE(40, 43, 54), base64Data: 'RAWSLICE', mimeType: 'application/pdf', pageImages: pages, renderReport: report });
    expect(out.selection.mode).toBe('raw-fallback');
    expect(out.parts).toEqual([{ text: SLICE(40, 43, 54) }, { inline_data: { mime_type: 'application/pdf', data: 'RAWSLICE' } }]);
  });

  it('numbers pages 1..n when the render report is missing or does not match', () => {
    const out = Driver.selectVisionParts({ prompt: SLICE(2, 3, 6), base64Data: 'RAWPDF', mimeType: 'application/pdf', pageImages: pages, renderReport: null });
    expect(out.selection.pages).toEqual([2, 3]);
    expect(inline(out.parts)).toEqual(['p2', 'p3']);
  });

  it('passes audio, images and runs without rendered pages through untouched', () => {
    const audio = Driver.selectVisionParts({ prompt: 'Transcribe.', base64Data: 'AUDIO', mimeType: 'audio/webm', pageImages: pages, renderReport: report });
    expect(audio.selection.mode).toBe('passthrough');
    expect(audio.parts[1].inline_data).toEqual({ mime_type: 'audio/webm', data: 'AUDIO' });
    const noRender = Driver.selectVisionParts({ prompt: SLICE(1, 4, 8), base64Data: 'RAWPDF', mimeType: 'application/pdf', pageImages: null, renderReport: null });
    expect(noRender.selection.mode).toBe('passthrough');
    expect(noRender.parts[1].inline_data.data).toBe('RAWPDF');
  });
});
