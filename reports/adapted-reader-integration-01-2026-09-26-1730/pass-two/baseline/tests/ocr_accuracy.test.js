// Tests for _alloOcrAccuracy — the heuristic OCR-quality estimator (doc_pipeline_source.jsx).
// Extracts the pure function (with its deps _ocrJunkRatio + _ALLO_OCR_COMMON_EN) from source and
// exercises it on clean English, realistically-garbled OCR, U+FFFD soup, clean non-English, and
// short text. The point is calibration: clean -> good, garbled -> poor, non-English -> NOT poor.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Pull the contiguous block: _ocrJunkRatio -> _ALLO_OCR_COMMON_EN -> _alloOcrAccuracy.
// Harness repair (2026-07-05): the old non-greedy regex anchored on the FIRST `return _result;\n};`
// after _ocrJunkRatio, which stopped at an intervening helper once one landed in the span — the
// suite silently red. Slice by explicit markers instead: everything between the two functions is
// self-contained (definitions only evaluate; bodies never run unless called).
const _s0 = dp.indexOf('var _ocrJunkRatio = function');
const _s1 = dp.indexOf('var _alloOcrAccuracy = function');
const _e1 = dp.indexOf('\n};', _s1) + 3;
if (_s0 === -1 || _s1 === -1 || _e1 < 3) throw new Error('could not extract _alloOcrAccuracy block from source');
const ocrAccuracy = new Function(dp.slice(_s0, _e1) + '\n; return _alloOcrAccuracy;')();

// A clean English paragraph (real text from the test corpus — well-formed OCR output).
const CLEAN_EN = `A list of assessment procedures follows the Reason for Referral, thus identifying the assessment measures that were purposefully selected to answer the referral questions and to test hypotheses relating to them. The list should include all sources of assessment data that the evaluator relied on to address referral questions and concerns. In addition to tests and rating scales, the list should include observations in naturalistic settings and the types of interviews conducted.`;

// The same paragraph after a BAD OCR pass: corrupted function words, letter/digit mashes, fragments.
const GARBLED_EN = `A 1ist 0f assessrnent pr0cedures f0ll0ws tlie Reas0n f0r Referra1, tlius identifyiug tlie assessrnent rneasures tliat were purp0sefu11y se1ected t0 answer tlie referra1 questi0ns aud t0 test hyp0tlieses re1atiug t0 tliern. Tlie 1ist sli0u1d iuc1ude a11 s0urces 0f assessrnent data tliat tlie eva1uat0r re1ied 0n.`;

// A clean SPANISH paragraph — must NOT be scored "poor" just for failing an English dictionary.
const CLEAN_ES = `La lista de procedimientos de evaluacion sigue al motivo de la derivacion, identificando asi las medidas de evaluacion que se seleccionaron con el proposito de responder a las preguntas de la derivacion. La lista debe incluir todas las fuentes de datos de evaluacion en las que se baso el evaluador para abordar las inquietudes y observaciones realizadas durante el proceso.`;

describe('OCR accuracy estimator — calibration', () => {
  it('clean English scores "good" with high confidence (dictionary-verified)', () => {
    const r = ocrAccuracy(CLEAN_EN);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.band).toBe('good');
    expect(r.confidence).toBe('high');
    expect(r.basis).toMatch(/common-word hit-rate/);
  });

  it('badly-garbled OCR (mashes + corrupted function words) scores "poor"', () => {
    const r = ocrAccuracy(GARBLED_EN);
    expect(r.score).toBeLessThan(70);
    expect(r.band).toBe('poor');
    // it surfaces concrete suspect tokens for transparency
    expect(Array.isArray(r.suspectSamples)).toBe(true);
    expect(r.suspectSamples.length).toBeGreaterThan(0);
  });

  it('the garbled score is well below the clean score (separates the two)', () => {
    expect(ocrAccuracy(CLEAN_EN).score - ocrAccuracy(GARBLED_EN).score).toBeGreaterThan(20);
  });

  it('U+FFFD replacement-char soup is caught as "poor" (validates the FFFD match)', () => {
    const fffd = String.fromCharCode(0xFFFD);
    const soup = ('word ' + fffd + fffd + fffd + ' text ' + fffd + fffd + ' more ').repeat(12);
    const r = ocrAccuracy(soup);
    expect(r.metrics.replacementRatio).toBeGreaterThan(0);
    expect(r.band).toBe('poor');
  });

  it('clean NON-English (Spanish) is NOT scored "poor" — falls back to plausibility, disclosed', () => {
    const r = ocrAccuracy(CLEAN_ES);
    expect(r.band).not.toBe('poor');
    expect(r.confidence).toBe('medium');                 // can't dictionary-verify -> hedged
    expect(r.basis).toMatch(/non-English or unrecognized/);
  });

  it('too little text returns "unknown" (null score), never a confident guess', () => {
    const r = ocrAccuracy('Only a few words here.');
    expect(r.score).toBe(null);
    expect(r.band).toBe('unknown');
  });

  it('empty / null input is handled (unknown, no throw)', () => {
    expect(ocrAccuracy('').band).toBe('unknown');
    expect(ocrAccuracy(null).band).toBe('unknown');
    expect(ocrAccuracy(undefined).score).toBe(null);
  });

  it('always returns the documented shape (score/band/confidence/basis/metrics/suspectSamples)', () => {
    const r = ocrAccuracy(CLEAN_EN);
    expect(r).toHaveProperty('band');
    expect(r).toHaveProperty('confidence');
    expect(r).toHaveProperty('basis');
    expect(r.metrics).toHaveProperty('dictHitRate');
    expect(r.metrics).toHaveProperty('junkRatio');
    expect(r.metrics).toHaveProperty('replacementRatio');
    expect(r).toHaveProperty('suspectSamples');
  });
});

describe('OCR accuracy — pipeline wiring', () => {
  const vp = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

  it('the fix flow computes the estimate ONLY for scanned docs (gated on _heavyScanned) and is fail-soft', () => {
    expect(dp).toMatch(/if \(_heavyScanned && extractedText && extractedText\.length > 60\) \{\s*\n\s*ocrAccuracy = _alloOcrAccuracy\(extractedText\)/);
    expect(dp).toMatch(/let ocrAccuracy = null;/);
    expect(dp).toMatch(/catch \(_oaErr\) \{ ocrAccuracy = null; \}/);
  });
  it('the fix result carries the ocrAccuracy field', () => {
    // Harness repair (2026-07-09): @9f59569a6 removed the duplicate `integrityWarning,` shorthand
    // from the result opening (esbuild duplicate-key warning; the later M5-defaulted key won anyway) —
    // ocrAccuracy now follows integrityCoverage. The field still ships (that's the real assertion).
    expect(dp).toMatch(/integrityCoverage,\s*\n[\s\S]{0,600}?\n\s*ocrAccuracy,/);
    expect(dp).toMatch(/\n\s*integrityWarning: integrityWarning \|\| null,/);
  });
  it('the fix UI renders a disclosed OCR-quality chip (band + ~% + heuristic disclaimer) for scanned docs', () => {
    expect(vp).toMatch(/pdfFixResult\.ocrAccuracy && typeof pdfFixResult\.ocrAccuracy\.score === 'number'/);
    expect(vp).toMatch(/ocr_quality_title/);
    expect(vp).toMatch(/NOT a measured accuracy/);
    expect(vp).toMatch(/OCR quality/);
  });
});

describe('OCR accuracy — recovery + verification fold-ins', () => {
  // ① reconcileOcrPages: accuracy is a SELECTION signal — flip to a substantial, clearly-cleaner alt.
  it('reconcileOcrPages flips OCR variant on accuracy (closes the letter-shaped-garble blind spot), guarded', () => {
    expect(dp).toMatch(/const _accT = _alloOcrAccuracy\(tText\), _accV = _alloOcrAccuracy\(vText\)/);
    // only flips to a SUBSTANTIAL, clearly-cleaner alternative — never trades down
    expect(dp).toMatch(/_lowAccuracy = _substantialAlt && [\s\S]*?_winAcc\.band === 'poor' && _altAcc\.band !== 'poor'[\s\S]*?\(_altAcc\.score - _winAcc\.score\) >= 15/);
    expect(dp).toMatch(/if \(_extremeGarbage \|\| _clearlyWorse \|\| _lowConfTess \|\| _lowAccuracy\)/);
  });
  // ①B reconcileOcrPages: accuracy also FLAGS a chosen page that confidence + junk-ratio both miss.
  it('reconcileOcrPages flags a chosen page whose text estimates "poor" (review-banner net)', () => {
    expect(dp).toMatch(/\} else if \(chosen\.text\) \{[\s\S]*?const _chAcc = _alloOcrAccuracy\(chosen\.text\);[\s\S]*?_chAcc\.band === 'poor'[\s\S]*?lowConfidence\.push/);
  });
  // ② verification verdict: a "poor" estimate pushes a fidelity note BEFORE the triage, so it drives
  //    BOTH needsExpertReview (_contentFidelityConcern reads notes.length) AND the fidelityLimited banner.
  it('a "poor" OCR estimate pushes a fidelity note before the triage (drives needsExpertReview + banner)', () => {
    expect(dp).toMatch(/kind: 'lowOcrAccuracy'/);
    const noteIdx = dp.indexOf("kind: 'lowOcrAccuracy'");
    const triageIdx = dp.indexOf('Triage: flag documents that need expert remediation');
    const concernIdx = dp.indexOf('const _contentFidelityConcern = !!integrityWarning || _structuralFidelityNotes.length > 0');
    expect(noteIdx).toBeGreaterThan(0);
    expect(triageIdx).toBeGreaterThan(noteIdx);     // note pushed before triage
    expect(concernIdx).toBeGreaterThan(noteIdx);    // ...so _contentFidelityConcern sees it -> needsExpertReview
  });
  it('coverage measures quantity; the note explains accuracy is the quality dimension', () => {
    expect(dp).toMatch(/Coverage measures how much text was kept, not whether it is correct/);
  });
});
