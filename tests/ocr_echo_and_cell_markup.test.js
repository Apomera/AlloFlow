// #G (2026-07-05): the four content-quality defects still visible in the 7/5 scanned-book run AFTER #F:
// (1) literal "<ul><li>" shipped as visible text inside table cells (the JSON prompt gives the model no
//     shape for an in-cell list, and the escape-everything cell path prints the improvised tags);
// (2) doubled words ("assignment? assignment?") — the escaped markup fused tokens so AutoRestore judged
//     present cell words missing, and the splice adjacency guard could not see a neighbor one space away;
// (3) "questions Note . The onset" — an after-anchor splice point landing between a word and its attached
//     punctuation;
// (4) "should be reserved reserved for" — a line-wrap echo in one OCR engine's page text carried into the
//     ground truth and copied verbatim by the sentence restorer.
// Fixes: _alloCellRichText render net + prompt rule; gap-aware adjacency guard + punctuation advance in
// applyWordRestoration; _collapseAdjacentDupes cross-engine collapse in reconcileOcrPages (disclosed, never
// silent); banner block emits a real <h1> in a data-allo-banner card that fixLandmarkFoundations lifts into
// the top-level <header> (the Equal Access "missing h1" / "no header landmark" pair).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
let collapse, cellRich;

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  collapse = window.AlloModules.createDocPipeline.collapseAdjacentDupes;
  cellRich = window.AlloModules.createDocPipeline.cellRichText;
  expect(typeof collapse).toBe('function');
  expect(typeof cellRich).toBe('function');
});

describe('#G: _collapseAdjacentDupes — LIVE', () => {
  it('collapses a line-wrap echo the other engine did not see (the "reserved reserved" case)', () => {
    const r = collapse(
      'Further elaboration and details should be reserved reserved for the Background Information section.',
      'Further elaboration and details should be reserved for the Background Information section.'
    );
    expect(r.text).toContain('should be reserved for');
    expect(r.text).not.toContain('reserved reserved');
    expect(r.collapsed).toEqual(['reserved']);
  });

  it('keeps a legitimate double the reference engine also read ("had had")', () => {
    const r = collapse('He had had a difficult year.', 'He had had a difficult year at school.');
    expect(r.text).toContain('had had');
    expect(r.collapsed).toEqual([]);
  });

  it('with NO reference text, collapses only the punctuation-bearing shape ("work? work?")', () => {
    const withPunct = collapse('the consequences of not submitting work? work? next item', '');
    expect(withPunct.text).toContain('submitting work? next item');
    expect(withPunct.text).not.toContain('work? work?');
    const bare = collapse('He had had a difficult year.', '');
    expect(bare.text).toContain('had had'); // bare doubles are legitimate English — untouched without a ref
  });

  it('is case-sensitive ("The the" is sentence structure, not an echo) and ignores short tokens', () => {
    expect(collapse('The the record shows.', 'nothing relevant').text).toContain('The the');
    expect(collapse('a a b', 'nothing relevant').text).toBe('a a b');
  });

  it('collapses across a line break (the wrap is where the echo happens)', () => {
    const r = collapse('should be reserved\nreserved for the section', 'should be reserved for the section');
    expect(r.text).not.toMatch(/reserved\s+reserved/);
  });

  it('an engine that captured only a FRACTION of the page is silent, not disagreeing (≥50% coverage gate)', () => {
    // ref 'short' clearly did not read the passage — its lack of "much much" is not evidence of an echo.
    const r = collapse('a much much much longer vision result', 'short');
    expect(r.text).toBe('a much much much longer vision result');
    expect(r.collapsed).toEqual([]);
  });
});

describe('#G: _alloCellRichText — LIVE', () => {
  it('rebuilds literal <ul><li> cell markup as a REAL nested list (no escaped tags shown to the reader)', () => {
    const out = cellRich('<ul><li>Does this apply to any particular type of assignment?</li><li>What are the consequences of not submitting work?</li></ul>', esc);
    expect(out).toContain('<ul');
    expect((out.match(/<li/g) || []).length).toBe(2);
    expect(out).toContain('type of assignment?');
    expect(out).not.toContain('&lt;li&gt;');
    expect(out).not.toContain('&lt;ul&gt;');
  });

  it('keeps <ol> ordered and preserves intro prose before the list', () => {
    const out = cellRich('Steps: <ol><li>first step</li><li>second step</li></ol>', esc);
    expect(out).toContain('<ol');
    expect(out).toContain('Steps:');
    expect(out.indexOf('Steps:')).toBeLessThan(out.indexOf('<ol'));
  });

  it('converts the prompt-sanctioned plain-text "• " items into a list too', () => {
    const out = cellRich('• first point • second point', esc);
    expect(out).toContain('<ul');
    expect((out.match(/<li/g) || []).length).toBe(2);
    expect(out).toContain('first point');
  });

  it('a plain cell escapes byte-identically to the caller escaper (happy path unchanged)', () => {
    const plain = 'Louise rarely completes in-class seatwork & homework.';
    expect(cellRich(plain, esc)).toBe(esc(plain));
    expect(cellRich('• only one item', esc)).toBe(esc('• only one item')); // one bullet is prose, not a list
  });

  it('XSS: hostile markup in a cell string is stripped to text and escaped — only OUR tags reach the output', () => {
    const out = cellRich('<ul><li><img src=x onerror=alert(1)>click me</li><li>second</li></ul>', esc);
    expect(out).not.toContain('<img');
    expect(out).not.toContain('onerror');
    expect(out).toContain('click me');
    const plainAttack = cellRich('<script>alert(1)</script>', esc);
    expect(plainAttack).not.toContain('<script');
  });

  it('markup with no <li> items keeps its line structure via <br>', () => {
    const out = cellRich('line one<br>line two', esc);
    expect(out).toBe('line one<br>line two');
  });
});

describe('#G: banner h1 + top-level <header> lift — LIVE (eval-slice of fixLandmarkFoundations)', () => {
  const _s = src.indexOf('function fixLandmarkFoundations(html) {');
  const _e = src.indexOf('\n}', _s) + 2;
  const fixLandmarkFoundations = new Function(src.slice(_s, _e) + '\nreturn fixLandmarkFoundations;')();
  const dom = (s) => new DOMParser().parseFromString(s, 'text/html');
  const bannerDoc = '<!DOCTYPE html><html><head></head><body>'
    + '<div data-allo-banner="true" style="background:#fff"><h1 style="margin:0">Consumer-Responsive Report Writing</h1><p>High-Impact Assessment Reports for Children and Adolescents</p></div>'
    + '<h2>Assessment Procedures</h2><p>Body text.</p></body></html>';

  it('lifts a leading banner CARD into a top-level <header> BEFORE <main> (banner landmark + h1 outline)', () => {
    const d = dom(fixLandmarkFoundations(bannerDoc));
    const header = d.body.querySelector(':scope > header');
    expect(header).toBeTruthy();
    expect(header.querySelector('h1').textContent).toBe('Consumer-Responsive Report Writing');
    const main = d.body.querySelector(':scope > main');
    expect(main).toBeTruthy();
    expect(main.querySelector('[data-allo-banner]')).toBeNull();   // the card is OUTSIDE main
    expect(main.querySelector('h2')).toBeTruthy();                 // content stayed inside main
    expect(header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('derives the <title> from the banner h1', () => {
    expect(dom(fixLandmarkFoundations(bannerDoc)).querySelector('title').textContent).toBe('Consumer-Responsive Report Writing');
  });

  it('a MID-body banner card is NOT lifted (merged chunks keep their cards inside <main> as plain divs)', () => {
    const midDoc = '<!DOCTYPE html><html><head><title>t</title></head><body><p>intro text first</p>'
      + '<div data-allo-banner="true"><h1>Second Fragment Title</h1></div><p>more</p></body></html>';
    const d = dom(fixLandmarkFoundations(midDoc));
    expect(d.body.querySelector(':scope > header')).toBeNull();
    expect(d.querySelector('main [data-allo-banner]')).toBeTruthy();
  });

  it('the plain leading-<h1> lift still works (the banner alternative did not displace it)', () => {
    const bare = '<!DOCTYPE html><html><head></head><body><h1>Weekly Worksheet</h1><p>Body text.</p></body></html>';
    const d = dom(fixLandmarkFoundations(bare));
    expect(d.body.querySelector(':scope > header h1')).toBeTruthy();
    expect(d.querySelector('main h1')).toBeNull();
  });
});

describe('#G: splice adjacency guard + punctuation placement — mirrors (logic copied from applyWordRestoration)', () => {
  // Mirror of the shipped cursor-advance + gap-aware neighbor-token guard. The source pins below keep
  // this mirror honest — if the shipped logic drifts, the pins fail and the mirror must be re-copied.
  const mirror = (orig, cursor, origWord) => {
    let origCursor = cursor;
    while (origCursor > 0 && origCursor < orig.length && !/\s/.test(orig[origCursor - 1]) && /[.,;:!?)\]"'”’]/.test(orig[origCursor])) origCursor++;
    const _normTok = function (s) { return String(s || '').toLowerCase().replace(/[‘’ʼ´`]/g, "'").replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ''); };
    const _ow = _normTok(origWord);
    const _leftTok = _normTok((orig.slice(0, origCursor).replace(/[^\p{L}\p{N}'‘’ʼ]+$/u, '').match(/[\p{L}\p{N}'‘’ʼ]+$/u) || [''])[0]);
    const _rightTok = _normTok((orig.slice(origCursor).replace(/^[^\p{L}\p{N}'‘’ʼ]+/u, '').match(/^[\p{L}\p{N}'‘’ʼ]+/u) || [''])[0]);
    const skip = !!(_ow && (_ow === _leftTok || _ow === _rightTok));
    const needsLeadingSpace = origCursor > 0 && !/\s/.test(orig[origCursor - 1]);
    const needsTrailingSpace = origCursor < orig.length && !/\s/.test(orig[origCursor]);
    const spliced = skip ? orig : orig.slice(0, origCursor) + (needsLeadingSpace ? ' ' : '') + origWord + (needsTrailingSpace ? ' ' : '') + orig.slice(origCursor);
    return { origCursor, skip, spliced };
  };

  it('sees the existing copy THROUGH a space + fused markup — no more "assignment? assignment?"', () => {
    const orig = 'Does this apply to any particular type of assignment?</li><li>What are the consequences';
    const cursor = orig.indexOf(' assignment'); // splice point right after "of"
    const r = mirror(orig, cursor, 'assignment?');
    expect(r.skip).toBe(true); // the word already abuts the splice point — nothing inserted
  });

  it('advances an after-anchor splice point past attached punctuation — "questions. Note The onset", never "questions Note ."', () => {
    const orig = 'ones are more relevant to the referral questions. The onset, frequency, duration';
    const cursor = orig.indexOf('. The onset'); // needle ended at "questions", before its period
    const r = mirror(orig, cursor, 'Note');
    expect(r.skip).toBe(false);
    expect(r.spliced).toContain('questions. Note The onset');
    expect(r.spliced).not.toContain('questions Note .');
  });

  it('a genuinely missing word still splices (neighbors differ)', () => {
    const orig = 'alpha beta delta epsilon';
    const cursor = orig.indexOf(' delta');
    const r = mirror(orig, cursor, 'gamma');
    expect(r.skip).toBe(false);
    expect(r.spliced).toBe('alpha beta gamma delta epsilon');
  });

  it('a before-anchor splice point (cursor at a word START) never moves', () => {
    const orig = 'alpha beta delta';
    const cursor = orig.indexOf('delta');
    const r = mirror(orig, cursor, 'gamma');
    expect(r.origCursor).toBe(cursor);
  });
});

describe('#G: wiring + prompt — source pins', () => {
  it('reconcileOcrPages collapses each winning page against the other engine and returns the collapses', () => {
    expect(src).toContain('const _dd = _collapseAdjacentDupes(chosen.text, _ddRef);');
    expect(src).toContain('dupeCollapses: _dupeCollapses');
    expect(src).toContain('window.__alloOcrDupeCollapses = (rec && rec.dupeCollapses) || []');
  });
  it('the collapse is disclosed in the fidelity panel — never silent', () => {
    expect(src).toContain("kind: 'ocrDupeCollapse'");
  });
  it('BOTH table cell paths route through _alloCellRichText (grid sanitize closure + flat rows)', () => {
    expect(src).toContain('sanitize: (v) => _alloCellRichText(v, (t) => escapeTextField(sanitizeField(t)))');
    expect(src).toContain('const _cellEsc = (v) => _alloCellRichText(v, (t) => escapeTextField(sanitizeField(t)));');
  });
  it('the extraction prompt forbids HTML in cell strings and sanctions "• " items', () => {
    expect(src).toContain('Cell strings must be PLAIN TEXT');
    expect(src).toContain('do not emit <ul>/<li> markup inside a cell string');
  });
  it('the banner block emits a real <h1> inside a data-allo-banner card', () => {
    expect(src).toContain('<div data-allo-banner="true" style=');
    expect(src).toContain(`_bTitle ? '<h1 style="color:' + _bText`);
  });
  it('fixLandmarkFoundations lifts a leading banner card (and the splice guard mirrors match the shipped code)', () => {
    expect(src).toContain("<div\\b[^>]*\\bdata-allo-banner");
    expect(src).toContain("orig.slice(0, origCursor).replace(/[^\\p{L}\\p{N}'‘’ʼ]+$/u, '')");
    expect(src).toContain("orig.slice(origCursor).replace(/^[^\\p{L}\\p{N}'‘’ʼ]+/u, '')");
    expect(src).toContain('/[.,;:!?)\\]"\'”’]/.test(orig[origCursor])) origCursor++;');
  });
});
