// Coverage #9-#10 (2026-07-03).
//   #9  — the PDF/UA-1 self-check read /ViewerPreferences with get() (raw), so an indirect ref (Word/
//         LibreOffice/InDesign write it that way) yielded no .get -> a spurious DisplayDocTitle "fail" for a
//         value written correctly, dragging down conformancePct. Now lookup()s it (like the write side +
//         round-trip check). Read-only self-check — does not touch the PDF bytes / validated construction.
//   #10 — silent truncation now disclosed: the DOCX 60-image cap pushes a {skipped} entry, and the xlsx
//         >200-row cap (truncatedRows was returned but never read) appends a visible note to the text.
// The tagger/xlsx paths need pdf-lib/SheetJS, so these are source-pins + mirrors of the pure logic.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('#9 — DisplayDocTitle self-check resolves an indirect /ViewerPreferences', () => {
  it('uses lookup() (not get()) so an indirect ref does not read as a false "fail"', () => {
    expect(src).toContain("const vp = catalog.lookup(PDFName.of('ViewerPreferences'));");
    expect(src).toContain("vp && vp.lookup ? vp.lookup(PDFName.of('DisplayDocTitle'))");
  });
});

describe('#10 — silent truncation is disclosed', () => {
  it('DOCX 60-image cap: source pins the cap detection + skipped disclosure', () => {
    expect(src).toContain('const _cappedAt60 = hits.length >= 60 && bm !== null;');
    expect(src).toContain('images beyond the first 60 were not extracted');
  });
  it('xlsx >200-row cap: source pins the visible truncation note', () => {
    expect(src).toContain('additional data row(s) beyond the first');
  });
  it('mirror: the DOCX cap fires only when a 61st blip exists', () => {
    const capped = (hitsLen, bm) => hitsLen >= 60 && bm !== null;
    expect(capped(60, { rid: 'r61' })).toBe(true);  // a 61st was consumed-but-unpushed
    expect(capped(60, null)).toBe(false);           // exactly 60 images
    expect(capped(5, null)).toBe(false);            // well under the cap
  });
  it('mirror: the xlsx note is appended only when rows were truncated', () => {
    const appendNote = (text, truncated, maxRows) => truncated > 0
      ? text + '\n\n> Note: ' + truncated.toLocaleString() + ' additional data row(s) beyond the first ' + maxRows + ' per sheet were not included in this conversion — open the original spreadsheet for the full data.'
      : text;
    expect(appendNote('| a | b |', 50, 200)).toContain('50 additional data row(s)');
    expect(appendNote('| a | b |', 0, 200)).toBe('| a | b |');
  });
});
