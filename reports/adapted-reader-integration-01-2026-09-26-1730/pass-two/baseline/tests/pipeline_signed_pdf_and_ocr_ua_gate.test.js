// Audit findings #5 (signed PDFs) and #2 (garbled OCR vs the PDF/UA-1 claim),
// both resolved 2026-08-11 in the honest-reporting direction.
//
// #5: skipping form/link-annotation tagging does NOT preserve a digital
// signature — remediation ends in a full doc.save() (pdf-lib has no
// incremental save), so the /Sig ByteRange hash breaks regardless, and the
// remediated file is a derivative document anyway. The UI used to claim the
// signature was preserved; it now warns honestly and the summary discloses it.
//
// #2: the UA-1 gate asked only whether OCR text was MISSING (coverage), never
// whether it was READABLE. Complete-but-garbled OCR still got stamped
// PDF/UA-1 — a false conformance claim on exactly the highest-need scans.
//
// Runtime-extract discipline (not a hand mirror): the verdict function is
// sliced out of the BUILT module so it cannot drift from what ships.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
const built = fs.readFileSync('doc_pipeline_module.js', 'utf8');
const publicBuilt = () => fs.readFileSync('desktop/web-app/public/doc_pipeline_module.js', 'utf8');

function extractFn(name, source) {
  const start = source.indexOf('var ' + name + ' = function');
  expect(start, name + ' present in build').toBeGreaterThan(-1);
  const end = source.indexOf('\n};', start);
  expect(end, name + ' terminator').toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(source.slice(start, end + 3) + '\nreturn ' + name + ';')();
}

describe('#2 — OCR quality gate on the PDF/UA-1 declaration', () => {
  const verdict = extractFn('_alloOcrQualityUaVerdict', built);

  it('withholds the claim when the OCR text layer is garbled (band poor)', () => {
    const v = verdict({ band: 'poor', score: 41 });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('too garbled');
    expect(v.reason).toContain('41%');
    // The reason must give the teacher a route forward, not just a refusal.
    expect(v.reason).toMatch(/re-scan|HTML\/Word/);
  });

  it('allows the claim for good and fair OCR', () => {
    expect(verdict({ band: 'good', score: 96 }).ok).toBe(true);
    expect(verdict({ band: 'fair', score: 74 }).ok).toBe(true);
  });

  it('never withholds on an unknown or absent estimate (born-digital, short docs)', () => {
    expect(verdict(null).ok).toBe(true);
    expect(verdict(undefined).ok).toBe(true);
    expect(verdict({}).ok).toBe(true);
    // Too little text to judge: band 'unknown', score null — must not block.
    expect(verdict({ band: 'unknown', score: null, confidence: 'low' }).ok).toBe(true);
    // Defensive: a poor band with no numeric score is not actionable evidence.
    expect(verdict({ band: 'poor', score: null }).ok).toBe(true);
  });

  it('names the affected pages when only re-scanned pages were poor', () => {
    const v = verdict({ band: 'poor', score: 38, scope: 'ocr-sourced-pages', pageNums: [4, 7] });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('re-scanned page(s) 4, 7');
  });

  it('is wired into the declaration gate and the withheld reason', () => {
    expect(src).toContain('const _ocrQualityUaVerdict = _alloOcrQualityUaVerdict(fixResult && fixResult.ocrAccuracy);');
    expect(src).toContain('_uaDeclared = _ocrQualityUaVerdict.ok &&');
    expect(src).toContain('!_ocrQualityUaVerdict.ok ? _ocrQualityUaVerdict.reason');
  });

  it('uses the same trigger as the POOR fidelity note, so they cannot disagree', () => {
    // The note fires on: band === 'poor' && typeof score === 'number'.
    expect(src).toContain("ocrAccuracy.band === 'poor' && typeof ocrAccuracy.score === 'number'");
    const fn = src.slice(src.indexOf('var _alloOcrQualityUaVerdict'), src.indexOf('// _textLayerLooksGarbage: HIGH-PRECISION'));
    expect(fn).toContain("acc.band !== 'poor' || typeof acc.score !== 'number'");
  });
});

describe('#5 — signed PDFs are disclosed, not falsely preserved', () => {
  it('the old preserve-signature claim is gone from every surface', () => {
    expect(src).not.toContain('form-field tagging skipped to preserve signature validity');
    expect(src).not.toContain('skipping form tagging to preserve existing digital signatures');
    expect(src).not.toContain('skipping link-annotation tagging to preserve signature validity');
    expect(built).not.toContain('to preserve signature validity');
  });

  it('the user-facing toast states the signature will not survive, and what to do', () => {
    const toast = src.slice(src.indexOf('This PDF is digitally signed.'), src.indexOf('This PDF is digitally signed.') + 260);
    expect(toast).toContain('will NOT keep a valid signature');
    expect(toast).toMatch(/Keep your original|re-signed/);
    // Severity must not be the old reassuring 'info'.
    const call = src.slice(src.indexOf("addToast('This PDF is digitally signed."), src.indexOf("addToast('This PDF is digitally signed.") + 400);
    expect(call).toContain("'warning'");
  });

  it('the summary discloses the signature outcome for reports and exports', () => {
    expect(src).toContain('_summary.hadDigitalSignature = !!_pdfHasSignature;');
    expect(src).toContain('_summary.signatureInvalidated = true;');
    const note = src.slice(src.indexOf('_summary.signatureNote ='), src.indexOf('_summary.signatureNote =') + 520);
    expect(note).toContain('no longer valid');
    expect(note).toContain('original file as the signed record');
  });

  it('annotation tagging is still skipped (byte fidelity for whoever re-signs)', () => {
    // The behaviour was right; only the claim about it was wrong. Keep both
    // skips so a re-signer gets faithful form/link structures.
    expect(src).toContain('_signedFormSkip = true;');
    expect(src).toContain('[Stage3b-LinkAnnots] signed PDF — skipping link-annotation tagging');
  });
});

describe('build parity', () => {
  it('the built module and its public mirror carry these changes', () => {
    expect(built).toContain('_alloOcrQualityUaVerdict');
    expect(built).toContain('This PDF is digitally signed.');
    expect(publicBuilt()).toBe(built);
  });
});
