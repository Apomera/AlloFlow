// Auto veraPDF after Make Accessible (2026-06-20). Aaron's idea: run the independent ISO 14289-1
// validation automatically — but the in-app validator runs in a POPUP, and browsers block popups
// that aren't from a user gesture. Solution: open + WARM the validator INSIDE the Make Accessible
// click (a gesture → popup allowed), let the ~25MB JVM boot during the run, then validate the tagged
// OUTPUT on that already-open window at the end (no second popup). Default-on, PDF inputs only,
// opt-out persisted. This pins the input gate + (anti-drift) the warm/validate wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Mirror of the PDF-input gate (only warm for PDF inputs — Office inputs use a different path) ──
const isPdfInput = (name, hasBase64) => !!hasBase64 && !/\.(docx|pptx|md|markdown|csv|tsv|xlsx?|xlsb|ods|txt)$/.test((name || '').toLowerCase());

describe('auto-veraPDF only warms for PDF inputs', () => {
  it('a PDF (any case) with bytes → yes', () => {
    expect(isPdfInput('report.pdf', true)).toBe(true);
    expect(isPdfInput('SCAN.PDF', true)).toBe(true);
    expect(isPdfInput('youtube-transcript', true)).toBe(true); // no extension, has bytes → treated as PDF-ish
  });
  it('an Office / spreadsheet / text input → no (different tagging path)', () => {
    expect(isPdfInput('report.docx', true)).toBe(false);
    expect(isPdfInput('deck.pptx', true)).toBe(false);
    expect(isPdfInput('data.xlsx', true)).toBe(false);
  });
  it('no bytes → no', () => {
    expect(isPdfInput('report.pdf', false)).toBe(false);
  });
});

describe('anti-drift: warm-at-gesture + validate-at-end is wired', () => {
  it('defines the warm + validate-on-warm-window helpers (no second popup)', () => {
    expect(viewSrc).toMatch(/const warmVeraPdfWindow = \(\) =>/);
    expect(viewSrc).toMatch(/const validateOnWarmWindow = \(handle, bytes\) =>/);
    expect(viewSrc).toMatch(/win = window\.open\(VERAPDF_VALIDATOR_URL/);
  });
  it('the Make Accessible click warms the validator (gated on the pref + PDF input), iframe-first with popup fallback', () => {
    // 2026-06-21: prefer the embedded iframe; only open the popup when the embed is not viable.
    expect(viewSrc).toMatch(/if \(pdfAutoVeraPdf && _isPdfIn\) \{/);
    expect(viewSrc).toMatch(/_veraIframe = warmVeraPdfIframe\(\)/);
    expect(viewSrc).toMatch(/if \(!_embedViable\) _veraWarm = warmVeraPdfWindow\(\)/);
  });
  it('the end of the handler generates the tagged PDF + validates on the warm window', () => {
    expect(viewSrc).toMatch(/await createTaggedPdf\(_bytesV, _fr,/);
    expect(viewSrc).toMatch(/await validateOnWarmWindow\(_veraWarm, _tbV\)/);
    expect(viewSrc).toMatch(/_lastTaggedBytesRef\.current = _tbV/);
  });
  it('default-on preference, persisted, with an opt-out toggle', () => {
    expect(viewSrc).toMatch(/const \[pdfAutoVeraPdf, setPdfAutoVeraPdf\] = useState/);
    expect(viewSrc).toMatch(/localStorage\.getItem\('alloflow_pdf_auto_verapdf'\) !== 'false'/);
    expect(viewSrc).toMatch(/onChange=\{\(e\) => setPdfAutoVeraPdf\(e\.target\.checked\)\}/);
  });
});
