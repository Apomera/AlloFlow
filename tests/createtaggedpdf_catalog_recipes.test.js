// #1 PARITY GUARD (2026-06-30): createTaggedPdf must keep INLINING all five PDF/UA-1 catalog recipes,
// so an AlloFlow-tagged PDF is "born compliant" on them rather than silently leaning on the post-hoc
// veraPDF repair loop (verapdf/verapdf_validator.html `_applyRepairs`) as the only source.
//
// We verified (2026-06-30) that the engine already sets all five. This pins that: if a future refactor
// drops one from createTaggedPdf, the document would quietly start relying on the repair safety-net for
// that rule (works on the validate/remediate path, but NOT in the downloaded file if the loop is skipped
// or the popup is blocked). That regression is exactly the kind that hides — so it fails LOUDLY here.
//
// The setters below are unique to createTaggedPdf within doc_pipeline_source.jsx (the document
// self-check reads them with `.get`/`.lookup`, never `.set`), so whole-file assertion is precise.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const engine = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('createTaggedPdf inlines all five PDF/UA-1 catalog recipes (born-compliant, not repair-dependent)', () => {
  it('the tagging engine is present', () => {
    expect(engine).toContain('const createTaggedPdf =');
  });
  it('§7.1 t10 — ViewerPreferences /DisplayDocTitle', () => {
    expect(engine).toContain("PDFName.of('DisplayDocTitle')");
  });
  it('§6.2 t1 — /MarkInfo set on the catalog', () => {
    expect(engine).toMatch(/catalog\.set\(PDFName\.of\('MarkInfo'\)/);
  });
  it('§7.2 / 3.1 — document /Lang set on the catalog', () => {
    expect(engine).toMatch(/catalog\.set\(PDFName\.of\('Lang'\)/);
  });
  it('§7.1 t7 — document /Title set on the doc', () => {
    expect(engine).toMatch(/doc\.setTitle\(/);
  });
  it('§7.1 t8 — XMP packet carries the pdfuaid:part UA claim + dc:title', () => {
    expect(engine).toContain('pdfuaid:part');
    expect(engine).toContain('dc:title');
  });
});
