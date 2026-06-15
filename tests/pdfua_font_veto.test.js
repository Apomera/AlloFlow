// #1f (2026-06-15): the PDF/UA-1 (pdfuaid:part 1) declaration gate was font-blind — it keyed
// only off the structure-tree orphan count, so a doc with a non-embeddable font (Type0/CID,
// symbolic, substitute-fetch failure, …) still shipped XMP claiming UA-1 while AlloFlow's own
// bundled validator FAILed "All page fonts embedded" on the same bytes. The fix makes
// font-embedding a first-class VETO on the claim and upgrades the Fonts self-check warn→fail.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// mirror of the shipped _uaDeclared gate
function uaDeclared(crashed, fontsUnrepairable, reachable, orphans, ocrMethod) {
  return !crashed && fontsUnrepairable === 0 &&
    (reachable > 0 ? orphans === 0 : /tesseract|vision|ocr/i.test(String(ocrMethod || '')));
}

describe('#1f PDF/UA part-1 claim is vetoed when fonts are not all embedded', () => {
  it('withholds the claim when any font is unrepairable, even with a perfect structure tree', () => {
    expect(uaDeclared(false, 2, 100, 0, '')).toBe(false); // pre-fix this declared UA-1 falsely
  });
  it('declares only when fonts are OK AND the structure tree is clean', () => {
    expect(uaDeclared(false, 0, 100, 0, '')).toBe(true);
  });
  it('still withholds on orphaned structure leaves (no regression to the prior gate)', () => {
    expect(uaDeclared(false, 0, 100, 5, '')).toBe(false);
  });
  it('font veto also overrides the OCR-evidence fallback path', () => {
    expect(uaDeclared(false, 1, 0, 0, 'tesseract-ocr+normalized')).toBe(false);
    expect(uaDeclared(false, 0, 0, 0, 'tesseract-ocr+normalized')).toBe(true);
  });
  it('still withholds when the orphan walk crashed', () => {
    expect(uaDeclared(true, 0, 100, 0, '')).toBe(false);
  });

  it('anti-drift: the gate consults _fontsUnrepairable and the self-check is a hard fail', () => {
    expect(src).toContain('_fontsUnrepairable.length === 0 && (_reachableLeafCountAtStamp > 0');
    expect(src).toContain("_fontsUnrepairable.length > 0 ? 'fail'");
  });
});
