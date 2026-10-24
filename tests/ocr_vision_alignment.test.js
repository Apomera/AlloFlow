// Vision reading onto Tesseract's word boxes (1954 Form 1040 scan, 2026-10-20). The scan's searchable
// layer is drawn from Tesseract's boxes whichever engine "wins", and on pages 3-4 the longer Tesseract
// text won: letter-shaped garble ("staternent", "Commi buioms", "19547...") became the hidden text AND
// the coverage reference, so the tagged PDF was withheld although the HTML was right. Runs the REAL
// _alloAlignVisionOntoOcrWords and the REAL reconcileOcrPages, sliced from the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const varFn = (name) => sliceBetween(SRC, 'var ' + name + ' = function', '\n};', { file: 'doc_pipeline_source.jsx' }) + '\n};';
const align = new Function(varFn('_alloAlignVisionOntoOcrWords') + '\nreturn _alloAlignVisionOntoOcrWords;')();
const RECONCILE = sliceBetween(SRC, '  const reconcileOcrPages = (tessPages, visionPages) => {', '  const ensureMammothLoaded', { file: 'doc_pipeline_source.jsx' });
const buildReconcile = (withAligner) => new Function('var warnLog = function () {};\n'
  + varFn('_stripPageEdgeArtifacts') + '\n' + varFn('_collapseAdjacentDupes') + '\n' + varFn('_alloOcrAccuracy') + '\n'
  + 'var _ALLO_OCR_COMMON_EN = ' + JSON.stringify(SRC.match(/var _ALLO_OCR_COMMON_EN =\(?'([^']*)'/)[1].split(' ').filter(Boolean)) + ';\n'
  + varFn('_ocrJunkRatio') + '\n' + 'var _alloColumnReorderOcrText = function () { return null; };\n'
  + (withAligner ? varFn('_alloAlignVisionOntoOcrWords') + '\n' : '')
  + RECONCILE + '\nreturn reconcileOcrPages;')();
const reconcile = buildReconcile(true);
const FX = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/ocr_alignment/f1040_1954_p3.json'), 'utf8'));

// One line of words, 40pt apart, all at y 100-110.
const line = (text, confs, y = 100) => text.split(' ').map((t, i) => ({ t, x0: 40 * i, y0: y, x1: 40 * i + 30, y1: y + 10, c: confs ? confs[i] : 90 }));
const keys = (s) => String(s).toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, '')).filter((w) => w.length > 1);

describe('_alloAlignVisionOntoOcrWords', () => {
  it('a misread word between agreed words takes the Vision reading; its box stays', () => {
    const w = line('Attach a staternent of income here', [95, 95, 70, 95, 95, 95]);
    const r = align(w, 'Attach a staternent of income here', 'Attach a statement of income here');
    expect(r.text).toBe('Attach a statement of income here');
    expect(r.words[2]).toMatchObject({ t: 'statement', x0: 80, x1: 110, src: 'vision' });
    expect(r.stats.replaced).toBe(1);
  });
  it('a split misread on ONE line becomes one word over the combined box', () => {
    const w = line('Itemized Commi buioms to churches', [95, 40, 35, 95, 95]);
    const r = align(w, 'Itemized Commi buioms to churches', 'Itemized Contributions to churches');
    expect(r.text).toBe('Itemized Contributions to churches');
    expect(r.words.map((x) => x.t)).toEqual(['Itemized', 'Contributions', 'to', 'churches']);
    expect(r.words[1]).toMatchObject({ x0: 40, x1: 110 });
  });
  it('a printed number is never traded for words; an OCR look-alike is', () => {
    // confidence 25: below the "garbage, take Vision" floor, so only the number rule keeps the 7
    const num = align(line('Enter on line 7 total tax', [95, 95, 95, 25, 95, 95]), 'Enter on line 7 total tax', 'Enter on line Line A B total tax');
    expect(num.text).toBe('Enter on line 7 total tax');
    const look = align(line('see item (0), above here', [95, 95, 57, 95, 95]), 'see item (0), above here', 'see item (c), above here');
    expect(look.text).toBe('see item (c), above here');
  });
  it('dot leaders read as letters are dropped only where Vision read nothing between the agreed words', () => {
    const w = line('Wages ooeeeeeeeeemenee 4200 Dividends', [95, 20, 95, 95]);
    const r = align(w, 'Wages ooeeeeeeeeemenee 4200 Dividends', 'Wages 4200 Dividends');
    expect(r.text).toBe('Wages  4200 Dividends');
    expect(r.words.map((x) => x.t)).toEqual(['Wages', '4200', 'Dividends']);
    expect(r.stats.removed).toBe(1);
  });
  it('a dissimilar CONFIDENT reading is left alone', () => {
    const w = line('Signature of taxpayer Date', [95, 95, 95, 95]);
    const r = align(w, 'Signature of taxpayer Date', 'Signature of employer Date');
    expect(r.text).toBe('Signature of taxpayer Date');
  });
  it('returns no correction when the two readings do not align', () => {
    const r = align(line('alpha beta gamma delta epsilon'), 'alpha beta gamma delta epsilon', 'one two three four five six');
    expect(r.words).toBe(null);
    expect(r.stats.anchorShare).toBe(0);
  });
  it('corroboration fails when Vision OMITS words Tesseract read confidently', () => {
    const words = 'Schedule income from rents royalties partnerships estates trusts pensions annuities interest dividends wages salaries bonuses commissions alimony gambling prizes awards farming business profits losses capital gains'.split(' ');
    const w = line(words.join(' '));
    const full = align(w, words.join(' '), words.join(' '));
    expect(full.stats.corroborated).toBe(true);
    const omitted = words.slice(0, 10).concat(words.slice(13)).join(' '); // 3 of 26 confident words gone
    expect(align(w, words.join(' '), omitted).stats.corroborated).toBe(false);
    expect(align(w, words.join(' '), words.slice(0, 12).join(' ')).stats.corroborated).toBe(false); // much shorter
  });
  it('corroboration also needs Vision to be at least 70% as long, even when nothing confident is missing', () => {
    const words = 'Schedule income from rents royalties partnerships estates trusts pensions annuities interest dividends wages salaries bonuses commissions alimony gambling prizes awards farming business profits losses capital gains'.split(' ');
    const extra = 'aaaa bbbb cccc dddd eeee ffff gggg hhhh jjjj kkkk llll mmmm nnnn pppp qqqq rrrr ssss tttt vvvv wwww xxxx yyyy zzzz abab cdcd efef ghgh ijij klkl mnmn opop qrqr stst uvuv wxwx'.split(' ');
    const all = words.concat(extra), confs = words.map(() => 95).concat(extra.map(() => 70));
    const r = align(line(all.join(' '), confs), all.join(' '), words.join(' ') + ' ' + extra.slice(0, 3).join(' '));
    expect(r.stats.omission).toBe(0);
    expect(r.stats.corroborated).toBe(false);
  });
  it('REAL page (1954 Form 1040 p3): garble is corrected, Vision is corroborated, missing reference words drop', () => {
    const r = align(FX.words, FX.tesseractText, FX.visionText);
    expect(r.stats.corroborated).toBe(true);
    expect(r.stats.omission).toBe(0);
    expect(r.stats.residualLowConf).toBeLessThan(0.15);
    const visionKeys = new Set(keys(FX.visionText));
    const absent = (t) => keys(t).filter((k) => !visionKeys.has(k)).length;
    expect(absent(r.text)).toBeLessThan(absent(FX.tesseractText) * 0.6);
    expect(/staternent/i.test(FX.tesseractText) && !/staternent/i.test(r.text)).toBe(true);
    expect(r.words.some((x) => x.t === 'Contributions' && x.src === 'vision')).toBe(true);
    // every number Tesseract printed with confidence survives in the corrected text
    const confNums = FX.words.filter((x) => /^\$?\d[\d,.]*$/.test(x.t) && x.c >= 85).map((x) => x.t);
    for (const n of confNums) expect(r.text.includes(n), n).toBe(true);
  });
});

describe('reconcileOcrPages with the aligner', () => {
  const tessPage = { pageNum: 3, text: FX.tesseractText, words: FX.words, pageW: 612, pageH: 792 };
  // Vision deliberately SHORTER than Tesseract here, so the length rule alone picks Tesseract.
  const visionPage = { pageNum: 3, text: FX.visionText };
  it('a corroborated Vision reading becomes the page text and the boxes are corrected', () => {
    const rec = reconcile([tessPage], [visionPage]);
    const p3 = rec.pages[0];
    expect(FX.tesseractText.length).toBeGreaterThan(FX.visionText.length);
    expect(p3.source).toBe('vision');
    expect(p3.words.some((x) => x.src === 'vision')).toBe(true);
    expect(p3.words.length).toBeLessThan(FX.words.length);
    expect(rec.visionAlignments).toEqual([expect.objectContaining({ pageNum: 3, corroborated: true, textSource: 'vision' })]);
    expect(rec.lowConfidence.find((x) => x.pageNum === 3)).toBe(undefined);
  });
  it('without the aligner (older module) the longer Tesseract text still wins: the behaviour this replaces', () => {
    const rec = buildReconcile(false)([tessPage], [visionPage]);
    expect(rec.pages[0].source).toBe('tesseract');
    expect(rec.pages[0].words).toBe(FX.words);
  });
  it('an uncorroborated Vision reading leaves Tesseract the page text, with the aligned corrections', () => {
    const cut = FX.visionText.split(/\s+/); cut.splice(100, 60); // Vision dropped a passage
    const rec = reconcile([tessPage], [{ pageNum: 3, text: cut.join(' ') }]);
    expect(rec.pages[0].source).toBe('tesseract');
    expect(rec.pages[0].text).not.toBe(FX.tesseractText);
    expect(rec.visionAlignments[0]).toMatchObject({ corroborated: false, textSource: 'tesseract' });
  });
  it('a corroborated page whose layer keeps much unresolved low-confidence text is still flagged', () => {
    // Extra low-confidence junk after every second word that Vision has no reading for: it cannot be
    // resolved, so it stays in the searchable layer (about a third of the words). Confidence 50 keeps the
    // page mean above 60, so the older low-confidence rule does not hand the page to Vision first.
    const junky = [];
    FX.words.forEach((x, i) => { junky.push(x); if (i % 2) junky.push({ t: 'zqk', x0: x.x1, y0: x.y0, x1: x.x1 + 4, y1: x.y1, c: 50 }); });
    const rec = reconcile([{ pageNum: 3, text: junky.map((x) => x.t).join(' '), words: junky }], [visionPage]);
    expect(rec.visionAlignments[0]).toMatchObject({ corroborated: true });
    expect(rec.pages[0].source).toBe('vision');
    expect(rec.lowConfidence.some((x) => x.pageNum === 3)).toBe(true);
    // ...and the clean page is not
    expect(reconcile([tessPage], [visionPage]).lowConfidence.some((x) => x.pageNum === 3)).toBe(false);
  });
});

describe('wiring', () => {
  it('the alignment is disclosed in the fidelity panel and persisted with the OCR evidence', () => {
    expect(SRC.includes("try { window.__alloOcrVisionAlignments = (rec && rec.visionAlignments) || []; } catch (_) {}")).toBe(true);
    expect(SRC.includes('ocrVisionAlignments: window.__alloOcrVisionAlignments || [],')).toBe(true);
    expect(SRC.includes("window.__alloOcrVisionAlignments = record.ocrVisionAlignments || [];")).toBe(true);
    expect(SRC.includes("kind: 'ocrVisionAlignment'")).toBe(true);
  });
  it('the OCR disclosures fire when THIS run was OCR, not only when the incoming audit said "scanned"', () => {
    // The MCP lane's audit does not carry isScanned, so all four reconcile notes were silently dropped.
    expect(SRC.includes("const _ocrDisclosuresOn = _heavyScanned || (typeof window !== 'undefined' && /ocr|tesseract/i.test(String(window.__lastGroundTruthMethod || '')));")).toBe(true);
    expect(SRC.split("(_ocrDisclosuresOn && typeof window !== 'undefined' && Array.isArray(window.__allo").length - 1).toBe(4);
    expect(SRC.includes("(_heavyScanned && typeof window !== 'undefined' && Array.isArray(window.__allo")).toBe(false);
    // ...and the stashes are fresh each run, so a previous document's notes cannot leak in
    expect(SRC.includes("window.__alloOcrDupeCollapses = []; window.__alloOcrColumnReorders = []; window.__alloOcrVisionAlignments = []; window.__alloStrippedEdgeLines = [];")).toBe(true);
  });
  it('the Vision OCR prompts forbid invented table header labels', () => {
    expect(SRC.split('(a table with no printed header row gets EMPTY header cells; never invent header labels)').length - 1).toBe(3);
  });
});
