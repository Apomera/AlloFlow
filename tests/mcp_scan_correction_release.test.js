// (2026-11-05, Aaron; keyless trust) A corrected number as the only open item held a clean document with no way out. It is now the
// second hold a person can settle, through the same tool. The other gates stay: the pipeline's gate is proven by the slice below.
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const req = createRequire(import.meta.url);
const V = req(join(process.env.ALLO_MCP_DIR || resolve(process.cwd(), 'desktop/mcp'), 'remediation_verification.cjs'));
const SRC = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve('doc_pipeline_source.jsx'), 'utf8');
const CODE = 'scan_corrections_require_review';
const FID = 'content fidelity needs a human check (possible loss or changed values)';
const FIXES = [
  { page: 1, from: 'Atticle', to: 'Article', number: false },
  { page: 2, from: 'Sectlon 4', to: 'Section 5', number: true },
];
const NOTE = { kind: 'ocrVisionAlignment', msg: 'The scan\'s text recognition misread some words, and 2 of them were corrected from a second reading of pages 1 and 2.', corrections: FIXES, correctionCount: 2 };
const PDF = { sha256: 'c'.repeat(64), bytes: 9, delivery: { ok: true, code: 'verified' }, exportMode: 'original_layout', readingNotes: [], pdfUa: { status: 'passed', profile: 'ua1' } };
const report = (over = {}) => {
  const s = {
    taggedPdfError: CODE, files: { heldTaggedPdf: 'C:/o/trust-tagged-held-for-review.pdf' }, heldTaggedPdf: PDF, fidelityNotes: [NOTE],
    contentCoverage: { status: 'matched', reviewRequired: false, missingTokens: 0, tokenRecall: 1, missingWords: [], extraction: { pageErrorCount: 0 }, sourceSha256: 'a'.repeat(64), htmlSha256: 'b'.repeat(64) },
    verdict: { level: 'review', reviewCount: 1, cautionCount: 1 }, verdictReasons: { review: [FID], cautions: ['some words the scan\'s text recognition misread were corrected from a second reading \u2014 spot-check them against the original'] },
    verificationState: 'complete', ...over,
  };
  s.coverageRelease = V.coverageReleaseStatus(s);
  return s;
};

describe('who can release a corrected-number hold', () => {
  it('eligible, with every correction listed and numbers first', () => {
    const st = report().coverageRelease;
    expect(st).toMatchObject({ eligible: true, code: 'eligible', numberCorrections: 1 });
    expect(st.correctionsToConfirm.map((k) => k.from)).toEqual(['Sectlon 4', 'Atticle']);
    expect(st.message).toMatch(/numbers first/);
    expect(st.message).toMatch(/must be fixed, not released/);
  });
  it.each([
    ['corrections-not-all-listed', { fidelityNotes: [{ ...NOTE, correctionCount: 400 }] }],
    ['corrections-not-all-listed', { fidelityNotes: [{ ...NOTE, correctionCount: undefined, corrections: undefined }] }],
    ['not-held', { fidelityNotes: [] }],
    ['not-held', { fidelityNotes: [{ ...NOTE, caution: true }] }],
    ['not-held', { taggedPdfError: 'distribution_review_required' }],
    ['unread-pages', { contentCoverage: { status: 'matched', missingTokens: 0, missingWords: [], extraction: { pageErrorCount: 1 } } }],
    ['no-held-pdf', { heldTaggedPdf: undefined, files: {}, heldTaggedPdfUnavailable: 'createTaggedPdf returned no bytes' }],
    ['held-pdf-not-validated', { heldTaggedPdf: { ...PDF, pdfUa: { status: 'failed' } } }],
  ])('refuses %s', (code, over) => {
    const st = report(over).coverageRelease;
    expect(st.eligible).toBe(false);
    expect(st.code).toBe(code);
    expect(st.fingerprint).toBeUndefined();
  });
  it('the code changes with any correction', () => {
    const base = report().coverageRelease.fingerprint;
    const other = report({ fidelityNotes: [{ ...NOTE, corrections: [FIXES[0], { ...FIXES[1], to: 'Section 6' }] }] }).coverageRelease.fingerprint;
    expect(other).not.toBe(base);
  });
  it('a word hold with corrections beside it asks for both', () => {
    const st = report({ taggedPdfError: 'content_coverage_requires_review', contentCoverage: { status: 'review_required', reviewRequired: true, missingTokens: 1, tokenRecall: 0.99, missingWords: [{ word: 'x', count: 1 }], extraction: {} } }).coverageRelease;
    expect(st).toMatchObject({ eligible: true, numberCorrections: 1 });
    expect(st.wordsToConfirm).toEqual([{ word: 'x', count: 1 }]);
    expect(st.message).toMatch(/every listed word and correction/);
  });
});

describe('what the report says', () => {
  it('held: names the corrections, the file and the way out, with one line and no double count', () => {
    const s = report();
    const out = V.explainDelivery(s);
    expect(out.headline).toBe('A tagged PDF was made but is held until a person checks the corrections listed below. What to do is below.');
    expect(out.items[0].code).toBe(CODE);
    expect(out.items[0].detail).toMatch(/^Corrections made, numbers first: "Sectlon 4" to "Section 5" \(page 2, number\); "Atticle" to "Article" \(page 1\)$/);
    expect(out.items[0].nextStep).toContain('trust-tagged-held-for-review.pdf');
    expect(out.items[0].nextStep).toContain(s.coverageRelease.fingerprint);
    expect(out.items[0].nextStep).toContain('pdf_release_held_tagged_pdf');
    expect(out.items[0].nextStep).toMatch(/must be fixed, not released/);
    expect(out.needsAPerson.join(' ')).not.toMatch(/possible loss/);
  });
});

describe('the released report', () => {
  const release = (over) => V.applyCoverageRelease(report(over), { confirmedBy: 'Ms. Rivera', at: '2026-11-05T15:00:00.000Z', taggedPdfPath: 'C:/o/trust-tagged.pdf' });
  it('drops only the fidelity line, keeps a caution with the number, and leaves coverage as it was', () => {
    const r = release();
    expect(r.taggedPdfError).toBeUndefined();
    expect(r.files.taggedPdf).toBe('C:/o/trust-tagged.pdf');
    expect(r.verdict).toMatchObject({ level: 'caution', reviewCount: 0 });
    expect(r.verdictReasons.review).toEqual([]);
    const line = r.verdictReasons.cautions.find((x) => /Ms\. Rivera/.test(x));
    expect(line).toMatch(/the 2 scan corrections \(1 involving a number\) are right, such as "Sectlon 4" to "Section 5"/);
    expect(line).toMatch(/cannot verify/);
    expect(r.contentCoverage.status).toBe('matched');
    expect(r.contentCoverage.personConfirmation.corrections).toEqual(FIXES);
    expect(r.deliveryExplanation.headline).toContain('who confirmed the scan corrections');
    expect(r.deliveryStatus).toBe('complete-for-tested-scope');
  });
  it('a word hold with no corrections still reads as before, and keeps a fidelity line it did not settle', () => {
    const r = V.applyCoverageRelease(report({ taggedPdfError: 'content_coverage_requires_review', fidelityNotes: [],
      verdict: { level: 'review', reviewCount: 2, cautionCount: 0 }, verdictReasons: { review: [FID, 'Source content coverage requires review'], cautions: [] },
      contentCoverage: { status: 'review_required', reviewRequired: true, missingTokens: 1, tokenRecall: 0.99, missingWords: [{ word: 'x', count: 1 }], extraction: {} } }),
    { confirmedBy: 'A B', at: '2026-11-05T15:00:00.000Z', taggedPdfPath: 'x' });
    expect(r.verdictReasons.review).toEqual([FID]);
    expect(r.verdict.level).toBe('review');
  });
});

describe('the pipeline gate opens this hold only when nothing else is open', () => {
  const gate = (() => {
    const body = sliceBetween(SRC, 'function _alloTaggedPdfReleaseGate(r, opts) {', '\n}\n', { file: 'doc_pipeline_source.jsx', includeEnd: true });
    return (r, verdict, evidence) => new Function('_alloDistributionVerdict', '_alloDeriveVerificationState', '_ALLO_CHECKER_REVIEW_REASON', body + '\nreturn _alloTaggedPdfReleaseGate;')(() => verdict, () => evidence, /^checker/)(r, {});
  })();
  const CLEAN = { coverage: { ai: 'complete', axe: 'complete', equalAccess: 'complete' }, verificationState: 'complete' };
  const R = (over = {}) => ({ verificationState: 'complete', verificationReasons: [], verificationAudit: { issues: [] }, axeAudit: { totalViolations: 0 }, secondEngineAudit: { failViolations: 0 }, fidelityNotes: [NOTE], ...over });
  const V_ = (review = [FID]) => ({ level: 'review', review });
  it('opens for a corrected number alone, and never reports it as released', () => {
    expect(gate(R(), V_(), CLEAN)).toEqual({ ok: false, code: 'scan_corrections_need_person' });
  });
  it.each([
    ['another note', R({ fidelityNotes: [NOTE, { kind: 'numeric', msg: 'A number changed.' }] }), V_(), CLEAN],
    ['a caution-only correction', R({ fidelityNotes: [{ ...NOTE, caution: true }] }), V_(), CLEAN],
    ['an integrity warning', R({ integrityWarning: 'lost text' }), V_(), CLEAN],
    ['another review line', R(), V_([FID, 'numbers may have changed between source and output']), CLEAN],
    ['a checker failure', R({ secondEngineAudit: { failViolations: 1 } }), V_(), CLEAN],
    ['an axe violation', R({ axeAudit: { totalViolations: 2 } }), V_(), CLEAN],
    ['an AI issue', R({ verificationAudit: { issues: [{ id: 'x' }] } }), V_(), CLEAN],
    ['an incomplete AI audit', R(), V_(), { ...CLEAN, coverage: { ...CLEAN.coverage, ai: 'partial' } }],
  ])('stays shut with %s', (_n, r, v, e) => {
    expect(gate(r, v, e)).toEqual({ ok: false, code: 'distribution_review_required' });
  });
});

describe('the connector carries it through', () => {
  const dir = process.env.ALLO_MCP_DIR || resolve(process.cwd(), 'desktop/mcp');
  const drv = readFileSync(join(dir, 'remediation_headless_driver.cjs'), 'utf8');
  const srv = readFileSync(join(dir, 'alloflow-remediation-mcp-stdio.cjs'), 'utf8');
  it('the driver does not strip the list or the caution off a note: a real trust run was refused for exactly this', () => {
    expect(drv).toContain('corrections: n.corrections.slice(0, 300), correctionCount: n.correctionCount');
    expect(drv).toContain("...(n.caution === true ? { caution: true } : {})");
  });
  it('the hold is built only for the gate\'s own code, and every other review stays withheld', () => {
    expect(drv).toContain("correctionsHold = !!(releaseGate && releaseGate.code === 'scan_corrections_need_person');");
    expect(drv).toContain("!(releaseGate && releaseGate.ok === true) && !correctionsHold) {\n              throw new Error('distribution_review_required');");
  });
  it('the connector treats both holds alike', () => {
    expect(srv).toContain('Verification.isPersonReleasableHold(out.taggedPdfError) && out.taggedPdfHeld');
    expect(srv).toContain('if (Verification.isPersonReleasableHold(out.taggedPdfError)) {');
  });
});

describe('picture captions', () => {
  const fn = new Function(sliceBetween(SRC, 'function _alloCaptionIsForPlainMark(alt) {', '\n}\n', { file: 'doc_pipeline_source.jsx', includeEnd: true }) + '\nreturn _alloCaptionIsForPlainMark;')();
  it.each(['Maine Department of Education logo', 'CDS logo', 'Logotipo de la escuela', 'Handwritten signature of a witness', 'Assinatura do superintendente', 'Firma del director', 'State seal of Maine', 'Official seal of the district', 'School emblem'])('drops it for %s', (alt) => {
    expect(fn(alt)).toBe(true);
  });
  it.each(['Bar chart of district logo usage', 'Diagram of the signature block', 'A map showing each school', 'A harbor seal on a rock', 'Line graph of enrollment', 'Picture labelled Drill: a teal power drill', 'A photo of the Great Blue Heron', '', 'Logotype timeline'])('keeps it for %s', (alt) => {
    expect(fn(alt)).toBe(false);
  });
  it('only a picture that is really there loses its caption: a missing one keeps it as its description', () => {
    expect(SRC.includes("${hasSrc && _alloCaptionIsForPlainMark(imgAlt) ? '' : `<figcaption")).toBe(true);
  });
});
