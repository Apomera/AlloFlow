// #F (2026-07-05): page-edge running-head/folio strip — root fix for the 7/5 scanned-book test's
// "OCR regression" (which was actually ground-truth pollution): this book's folios ride INSIDE
// running-head lines ("192 Appendix E", "Consumer-Responsive Report Writing 89") that no whole-line-
// number strip catches. They (a) made the numeric-fidelity net falsely report "3 numbers changed
// (90, 192, 193)" on a clean remediation and (b) blocked the page-break hyphen rejoin, orphaning
// "ated-in" into the recovery appendix with an empty context. The strip is REPETITION-based (a
// digitless page-edge line seen on 2+ pages = a running head; a bare-number edge line = a folio once
// any such pattern exists) — structural, nothing to calibrate; R4's score-column/lone-year
// protections stand because real data never repeats at page edges.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
let strip, clean;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  strip = window.AlloModules.createDocPipeline.stripPageEdgeArtifacts;
  clean = window.AlloModules.createDocPipeline.cleanScannedOcrText;
  expect(typeof strip).toBe('function');
});

describe('#F: stripPageEdgeArtifacts — LIVE', () => {
  it('strips repeated running heads whose folio varies ("192 Appendix E" / "Appendix E 193" / "194 Appendix E") and collects the numbers', () => {
    const pages = [
      'APPENDIX E\n\nBackground Information Outline\nand Case Example\n\n191',
      '192 Appendix E\n\nProductivity in school; homework completion\nAttention; concentration',
      'Appendix E 193\n\nSpecial services (e.g., special education, 504 services)\nRelated services',
      '194 Appendix E\n\nmemory is fine but he has trouble applying skills.\nHe follows only the first step.',
    ];
    const r = strip(pages);
    expect(r.texts[1]).not.toContain('192 Appendix E');
    expect(r.texts[2]).not.toContain('Appendix E 193');
    expect(r.texts[3]).not.toContain('194 Appendix E');
    expect(r.texts[1]).toContain('Productivity in school');       // content untouched
    expect(r.texts[3]).toContain('memory is fine');               // content untouched
    expect(r.folios).toEqual(expect.arrayContaining(['192', '193', '194', '191']));
    // The bare "191" footer folio is stripped too (a folio pattern exists doc-wide):
    expect(r.texts[0]).not.toMatch(/(^|\n)\s*191\s*($|\n)/);
    // The REAL "APPENDIX E" content heading (no digits) is never touched:
    expect(r.texts[0]).toContain('APPENDIX E');
  });

  it('end-to-end: stripping the interposed running head lets the hyphen rejoin fuse "reevalu-/ated" (kills the "ated-in" orphan)', () => {
    // Alternating verso/recto heads, each repeating on 2+ pages — the real book's layout.
    const pages = [
      '90 HIGH-IMPACT ASSESSMENT REPORTS FOR CHILDREN AND ADOLESCENTS\n\nearlier body text.',
      'Consumer-Responsive Report Writing 91\n\nservices is reevalu-',
      '92 HIGH-IMPACT ASSESSMENT REPORTS FOR CHILDREN AND ADOLESCENTS\n\nated—in fact, this information should be core material.',
      'Consumer-Responsive Report Writing 93\n\nmore body text here.',
    ];
    const r = strip(pages);
    const joined = r.texts.filter(Boolean).join('\n\n');
    const cleaned = clean(joined); // P2-a/R6 hyphen rejoin across the page join
    expect(cleaned).toContain('reevaluated—in fact');
    expect(cleaned).not.toContain('reevalu-');
    expect(r.folios).toEqual(expect.arrayContaining(['90', '91', '92', '93']));
  });

  it('R4 protections stand: a score column and a title-page year are NOT stripped (no running-head pattern → no bare-number stripping)', () => {
    const pages = [
      'Report of Evaluation\n2019\n\nWISC-V results follow.',
      'Verbal Comprehension\n105\nWorking Memory\n98\nProcessing Speed\n112\nSummary of scores above.',
    ];
    const r = strip(pages);
    expect(r.texts[0]).toContain('2019');   // year at a page top — kept (no proven head pattern)
    expect(r.texts[1]).toContain('105');    // score column values — kept
    expect(r.texts[1]).toContain('98');
    expect(r.texts[1]).toContain('112');
    expect(r.folios).toEqual([]);
  });

  it('even WITH running heads, a bare number that is not the first/last line of its page is kept (title-page year, table value mid-band)', () => {
    const pages = [
      '10 ASSESSMENT REPORTS QUARTERLY\n\nintro text one.',
      'Report of Evaluation\n2019\nWISC-V results follow.', // 2019 is line 2, not the page's first/last line
      '12 ASSESSMENT REPORTS QUARTERLY\n\nintro text two.',
    ];
    const r = strip(pages);
    expect(r.texts[1]).toContain('2019'); // head pattern exists, but position gate keeps the year
  });

  it('single-page input is returned untouched (repetition needs 2+ pages)', () => {
    const r = strip(['92 Appendix E\ncontent here']);
    expect(r.texts[0]).toBe('92 Appendix E\ncontent here');
    expect(r.folios).toEqual([]);
  });

  it('a repeated DIGITLESS heading is never stripped (digit-bearing lines only)', () => {
    const pages = ['Chapter Review\nBody one.', 'Chapter Review\nBody two.', 'Chapter Review\nBody three.'];
    const r = strip(pages);
    expect(r.texts[0]).toContain('Chapter Review');
    expect(r.texts[2]).toContain('Chapter Review');
  });
});

describe('#F: wiring + downstream honesty — source pins', () => {
  it('reconcileOcrPages strips page edges before the join and returns detectedFolios', () => {
    expect(src).toContain('const _edge = _stripPageEdgeArtifacts(merged.map(p => p.text));');
    expect(src).toContain('detectedFolios: _edge.folios');
    expect(src).toContain('window.__alloDetectedFolios = (rec && rec.detectedFolios) || []');
  });
  it('the folio-leak check flags only detected folios absent from source and filename', () => {
    expect(src).toContain('let _folioLeakWarn = null;');
    expect(src).toContain("_structuralFidelityNotes.push({ kind: 'folioLeak', msg: _folioLeakWarn })");
    expect(src).toContain('!_fnameNums.has(n)');
  });
  it('mirror: leak filter — body 194 flags; filename 89/92 and real source 90 do not', () => {
    const folios = ['89', '90', '92', '194'];
    const fname = 'High Impact Reports 89-92 App E.pdf';
    const out = 'Original: High Impact Reports 89-92 App E.pdf … his factual 194 memory is fine … a score of 90 was obtained';
    const srcTxt = 'a score of 90 was obtained in testing';
    const fnameNums = new Set(fname.match(/\d{1,4}/g) || []);
    const leaked = folios.filter((n) => !fnameNums.has(n)
      && new RegExp('(^|[^0-9])' + n + '([^0-9]|$)').test(out)
      && !new RegExp('(^|[^0-9])' + n + '([^0-9]|$)').test(srcTxt));
    expect(leaked).toEqual(['194']);
  });
  it('the recovery appendix renders an honest label instead of an empty source context', () => {
    expect(src).toContain("' — exact source position could not be determined'");
  });
  it('the report dedupes a fidelity note already contained in the integrity warning', () => {
    expect(src).toContain('!(_iw && _iw.indexOf(String(n.msg)) !== -1)');
  });
  it('mirror: identical numeric warning shows once, not twice', () => {
    const iw = '3 source numeric value(s) not found unchanged in the output (90, 192, 193). A remediation should never change numbers.';
    const notes = [{ msg: iw }, { msg: 'a different note' }];
    const out = [];
    if (iw) out.push(iw);
    notes.forEach((n) => { if (n && n.msg && !(iw && iw.indexOf(String(n.msg)) !== -1)) out.push(String(n.msg)); });
    expect(out).toEqual([iw, 'a different note']);
  });
});
