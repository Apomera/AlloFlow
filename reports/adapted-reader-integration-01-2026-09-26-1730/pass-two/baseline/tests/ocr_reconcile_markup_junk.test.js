// OCR reconciliation: transcription scaffolding must not read as garble (2026-09-13). The Vision
// transcript of the 1954 IRS Form 1040 scan rendered fill-in blanks as "________" and tables as
// markdown, which pushed its junk ratio to 0.21-0.33 against Tesseract's 0.10-0.14 and flipped
// three faithful pages to Tesseract's garbled output ("Schedulo B", "Past L.—Genoral Rule"). The
// junk ratio now strips blank runs, table pipes and divider rows, heading hashes and list bullets
// before measuring; dot leaders and stray symbols still count. Mirror + anti-drift, like
// ocr_reconcile_lowconf.test.js.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const junkProse = (s) => String(s || '')
  .replace(/_{3,}/g, ' ')
  .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?(?:[ \t]*\|[ \t]*:?-{3,}:?)*[ \t]*\|?[ \t]*$/gm, ' ')
  .replace(/\|/g, ' ')
  .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
  .replace(/^[ \t]*[*-][ \t]+/gm, '');
const ocrJunk = (s) => {
  const ns = junkProse(s).replace(/\s+/g, '');
  if (!ns.length) return 1;
  const tc = (ns.match(/[\p{L}\p{N}]/gu) || []).length;
  return 1 - tc / ns.length;
};
const rawJunk = (s) => { const ns = String(s || '').replace(/\s+/g, ''); return ns.length ? 1 - (ns.match(/[\p{L}\p{N}]/gu) || []).length / ns.length : 1; };
const pickWinner = (tText, vText, junk = ocrJunk) => {
  const tLen = tText.length, vLen = vText.length;
  let w = tLen >= vLen ? 'tesseract' : 'vision';
  if (tLen > 0 && vLen > 0) {
    const tJ = junk(tText), vJ = junk(vText);
    const winJ = w === 'tesseract' ? tJ : vJ, altJ = w === 'tesseract' ? vJ : tJ;
    const winLen = w === 'tesseract' ? tLen : vLen, altLen = w === 'tesseract' ? vLen : tLen;
    const substantialAlt = altLen >= winLen * 0.5;
    const extremeGarbage = winJ >= 0.45 && altJ < winJ && substantialAlt;
    const clearlyWorse = winJ >= 0.18 && winJ >= altJ * 1.6 && substantialAlt;
    if (extremeGarbage || clearlyWorse) w = w === 'tesseract' ? 'vision' : 'tesseract';
  }
  return w;
};

// A faithful transcript of a form page: blanks, a markdown table, headings.
const VISION = [
  '## Schedule B.—INCOME FROM INTEREST',
  '',
  '| Name of payor | Amount | Name of payor | Amount |',
  '|---|---|---|---|',
  '| ________ | $________ | ________ | $________ |',
  '| ________ | ________ | ________ | ________ |',
  '',
  '1. Business profit (or loss) from separate Schedule(s) C, line(s) 24: $________',
  '2. Farm profit (or loss) from separate schedule, Form 1040F: ________',
  '3. Partnership, etc., profit (or loss) from Form 1065, Schedule K: ________',
  '4. Total of lines 1, 2, and 3: $________',
].join('\n');
// Tesseract's reading of the same page: leader dots and mis-recognised words, no scaffolding.
const TESS = [
  'Schedulo B—INCOME FROM INTEREST',
  'Name of payor Amount | Name of payor | Amount',
  'OUT (JOA SOOO SU',
  '1. Business profit (or loss) from separate Schedule(s) C, line(s) 24 «..vvvvivuninnnen [Serer |',
  '2. Farm profit (or loss) from separate schedule, Form 1040F .......vvuueuunnruuneensne |e cece |',
  '3. Partnership, etc., profit (or loss) from Form 1065, Schedule K +. ..vvvvvvviiininnnnin fee |',
  '4. Total of ines 1, 2, and 3. o.uueeiutiiii iene eei aetna eee [$e er ee ne eee',
].join('\n');

describe('OCR reconcile — transcription scaffolding is not garble', () => {
  it('reproduces the pilot: the raw ratio flipped a faithful form transcript to garbled Tesseract', () => {
    expect(rawJunk(VISION)).toBeGreaterThan(0.18);
    expect(rawJunk(VISION)).toBeGreaterThanOrEqual(rawJunk(TESS) * 1.6);
    expect(pickWinner(TESS, VISION, rawJunk)).toBe('tesseract');
  });
  it('keeps the longer, faithful Vision page once blanks and table syntax are set aside', () => {
    expect(ocrJunk(VISION)).toBeLessThan(0.18);
    expect(pickWinner(TESS, VISION)).toBe('vision');
  });
  it('still flips a genuinely garbled longer page to a clean alternative', () => {
    const garbled = 'S@#% ##&* ((^^)) ]]][[ ---- ++++ **** ;;;; ::: !!! ??? ~~~ ``` <<>> {}{} $$ %% ^^ && ** (( )) __ ~~ || \\ // ;; :: !! ?? ,, .. ## @@';
    // The clean page must be substantial (at least half the garbled length) for the flip to apply.
    const clean = 'The quick brown fox jumps over the lazy dog near the riverbank. The dog wakes up and follows the fox home.';
    expect(ocrJunk(garbled)).toBeGreaterThanOrEqual(0.45);
    expect(pickWinner(garbled, clean)).toBe('vision');
  });
  it('does not neutralise dot leaders or stray symbols', () => {
    const leaders = 'Total ............................... [$e er ee ne eee';
    expect(ocrJunk(leaders)).toBeCloseTo(rawJunk(leaders), 5);
  });
  it('anti-drift: doc_pipeline measures junk on the scaffolding-stripped prose', () => {
    expect(pipeSrc).toContain('const _ocrJunkProse = (s) => String(s || \'\')');
    expect(pipeSrc).toContain('const ns = _ocrJunkProse(s).replace(/\\s+/g, \'\');');
    expect(pipeSrc).toMatch(/\.replace\(\/_\{3,\}\/g, ' '\)/);
  });
});
