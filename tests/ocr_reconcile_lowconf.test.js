// OCR reconciliation: prefer a cleaner, SUBSTANTIAL Vision page over a LOW-CONFIDENCE Tesseract
// winner (2026-06-20). A shaded callout box OCRs garbled-but-letter-shaped ("lke"/"ae"/"mac") →
// LOW junk-ratio, so the junk-based overrides miss it; confidence is the right signal. Threshold
// raised 50→60 to match the B5 banner. This pins the flip behavior + that the guards still protect
// against trading down to a worse/shorter page, + (anti-drift) that doc_pipeline ships the logic.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Mirror of reconcileOcrPages' per-page winner selection (kept in sync via the anti-drift block).
const ocrJunk = (s) => {
  const ns = String(s || '').replace(/\s+/g, '');
  if (!ns.length) return 1;
  const tc = (ns.match(/[\p{L}\p{N}]/gu) || []).length;
  return 1 - tc / ns.length;
};
const pickWinner = (tText, vText, tConf) => {
  const tLen = tText.length, vLen = vText.length;
  let w = tLen >= vLen ? 'tesseract' : 'vision';
  if (tLen > 0 && vLen > 0) {
    const tJ = ocrJunk(tText), vJ = ocrJunk(vText);
    const winJ = w === 'tesseract' ? tJ : vJ;
    const altJ = w === 'tesseract' ? vJ : tJ;
    const winLen = w === 'tesseract' ? tLen : vLen;
    const altLen = w === 'tesseract' ? vLen : tLen;
    const substantialAlt = altLen >= winLen * 0.5;
    const extremeGarbage = winJ >= 0.45 && altJ < winJ;
    const clearlyWorse = winJ >= 0.18 && winJ >= altJ * 1.6 && substantialAlt;
    const lowConfTess = w === 'tesseract' && tConf != null && tConf < 60 && vJ <= tJ && substantialAlt;
    if (extremeGarbage || clearlyWorse || lowConfTess) w = w === 'tesseract' ? 'vision' : 'tesseract';
  }
  return w;
};

// A garbled-but-letter-shaped Tesseract page (low junk) that WON on length, + a cleaner substantial Vision.
const TESS = 'what do you lke to do in you spare time and what makes you mac sad gad scared';
const VIS  = 'what do you like to do in your spare time and what makes you mad sad glad';

describe('OCR reconcile — low-confidence Tesseract flips to a clean substantial Vision', () => {
  it('flips at confidence 55 (the shaded-box case — was missed under the old <50 gate)', () => {
    expect(pickWinner(TESS, VIS, 55)).toBe('vision');
  });
  it('does NOT flip when Tesseract confidence is high (90)', () => {
    expect(pickWinner(TESS, VIS, 90)).toBe('tesseract');
  });
  it('does NOT flip when there is no Vision text (override needs both engines)', () => {
    expect(pickWinner(TESS, '', 40)).toBe('tesseract');
  });
  it('does NOT flip when Vision is junkier (guard: only to an at-least-as-clean page)', () => {
    const junkVis = 'w#@t d* y*u l!k% t0 d0 1n y*ur sp@r3 t1m3 &&& %%% ### @@@ !!!';
    expect(pickWinner(TESS, junkVis, 45)).toBe('tesseract');
  });
  it('does NOT flip when Vision is too short (guard: substantial ≥50% length)', () => {
    expect(pickWinner(TESS, 'what do you', 45)).toBe('tesseract');
  });
  it('still flips truly garbled (symbol-soup) Tesseract regardless of confidence (junk override)', () => {
    const soup = '### @@@ %%% &&& *** ((( ))) !!! ??? ::: ;;; ||| ~~~ ^^^ +++';
    expect(pickWinner(soup, VIS, 95)).toBe('vision');
  });
});

describe('anti-drift: doc_pipeline ships the threshold + guards', () => {
  it('uses the <60 confidence threshold (raised from 50)', () => {
    expect(pipeSrc).toMatch(/_tConf\s*<\s*60/);
  });
  it('keeps the cleaner-and-substantial guards on the low-confidence flip', () => {
    expect(pipeSrc).toMatch(/_lowConfTess\s*=.*_vJ\s*<=\s*_tJ\s*&&\s*_substantialAlt/);
  });
});
