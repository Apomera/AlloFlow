// Freehand region-select hit-test (S1, 2026-06-23). A drag box over the preview must resolve to the block
// the user MEANT — the deterministic core is _elementsInBox (top-most blocks ≥50% covered by the box) +
// _dominantBlock (the one with the largest in-box area). Pure geometry → unit-testable with mocked rects.
// The box → splice → re-audit → accept/revert downstream reuses the proven _applyScopedIntent path; here we
// pin the geometry and the wiring. (The marquee + iframe coordinate plumbing is the Canvas-smoke part.)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const mod = readFileSync(resolve(process.cwd(), 'view_pdf_audit_module.js'), 'utf8');
const ex = (decl) => {
  const s = src.indexOf(decl);
  const e = src.indexOf('\n  };', s) + 4;
  if (s === -1 || e < 4) throw new Error('extraction failed: ' + decl);
  return src.slice(s, e);
};
const _elementsInBox = new Function(ex('const _elementsInBox = (doc, box) => {') + '\nreturn _elementsInBox;')();
const _dominantBlock = new Function(ex('const _dominantBlock = (hits) => {') + '\nreturn _dominantBlock;')();

// Build a jsdom doc and pin getBoundingClientRect on selected elements (others default to a 0×0 rect → ignored).
const mk = (html, rects) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const sel of Object.keys(rects)) {
    const r = rects[sel];
    const el = doc.querySelector(sel);
    if (el) el.getBoundingClientRect = () => ({ left: r[0], top: r[1], right: r[2], bottom: r[3], width: r[2] - r[0], height: r[3] - r[1] });
  }
  return doc;
};
const box = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b });

describe('_elementsInBox: returns blocks at least half-covered by the box', () => {
  it('a box fully over one paragraph returns that paragraph', () => {
    const doc = mk('<body><p id="a">Hello world</p></body>', { '#a': [0, 0, 100, 20] });
    const hits = _elementsInBox(doc, box(0, 0, 100, 20));
    expect(hits.length).toBe(1);
    expect(hits[0].el.id).toBe('a');
    expect(hits[0].area).toBe(2000);
  });

  it('a neighbor only partially inside the box (<50%) is NOT selected', () => {
    const doc = mk('<body><p id="a">A</p><p id="b">B</p></body>', { '#a': [0, 0, 100, 20], '#b': [0, 100, 100, 120] });
    const hits = _elementsInBox(doc, box(0, 0, 100, 105));   // covers a fully, only 5px of b (25%)
    expect(hits.map((h) => h.el.id)).toEqual(['a']);
  });

  it('elements with no overlap are excluded', () => {
    const doc = mk('<body><p id="a">A</p></body>', { '#a': [0, 0, 100, 20] });
    expect(_elementsInBox(doc, box(200, 200, 300, 220))).toEqual([]);
  });
});

describe('_elementsInBox: top-most de-duplication (a box over a container yields the container)', () => {
  const html = '<body><section id="s"><p id="a">x</p><p id="b">y</p></section></body>';

  it('when the container is ≥50% covered, its children are dropped (region = the section)', () => {
    const doc = mk(html, { '#s': [0, 0, 100, 100], '#a': [0, 0, 100, 40], '#b': [0, 50, 100, 90] });
    const hits = _elementsInBox(doc, box(0, 0, 100, 100));
    expect(hits.map((h) => h.el.id)).toEqual(['s']);
  });

  it('when the container is too big to be ≥50% covered, its covered children are returned instead', () => {
    const doc = mk(html, { '#s': [0, 0, 100, 200], '#a': [0, 0, 100, 40], '#b': [0, 50, 100, 94] });
    const hits = _elementsInBox(doc, box(0, 0, 100, 95)); // section coverage 0.475 → dropped; a & b fully in
    expect(hits.map((h) => h.el.id).sort()).toEqual(['a', 'b']);
  });
});

describe('_dominantBlock: picks the block with the largest in-box area', () => {
  it('returns the bigger-area hit', () => {
    const doc = mk('<body><section id="s"><p id="a">x</p><p id="b">y</p></section></body>',
      { '#s': [0, 0, 100, 200], '#a': [0, 0, 100, 40], '#b': [0, 50, 100, 94] });
    const hits = _elementsInBox(doc, box(0, 0, 100, 95));  // a area 4000, b area 4400
    expect(_dominantBlock(hits).id).toBe('b');
  });
  it('null / empty → null', () => {
    expect(_dominantBlock(null)).toBeNull();
    expect(_dominantBlock([])).toBeNull();
  });
});

describe('_elementsInBox: guards', () => {
  it('null doc or null box → []', () => {
    expect(_elementsInBox(null, box(0, 0, 10, 10))).toEqual([]);
    const doc = mk('<body><p id="a">A</p></body>', { '#a': [0, 0, 100, 20] });
    expect(_elementsInBox(doc, null)).toEqual([]);
  });
});

describe('wiring: the drag box flows into the proven bounded-apply path (no new corruption surface)', () => {
  it('the hit-test + dominant helpers exist and feed _runRegionSelect', () => {
    expect(src).toMatch(/const _elementsInBox = \(doc, box\) => \{/);
    expect(src).toMatch(/const _dominantBlock = \(hits\) => \{/);
    expect(src).toMatch(/const _runRegionSelect = async \(box\) => \{/);
    expect(src).toMatch(/const hits = _elementsInBox\(live, box\)/);
    expect(src).toMatch(/const el = _dominantBlock\(hits\)/);
  });
  it('_runRegionSelect bridges the LIVE element to the STORED source by anchor (so the splice can match)', () => {
    const h = src.slice(src.indexOf('const _runRegionSelect = async'), src.indexOf('_regionHandlerRef.current = _runRegionSelect'));
    expect(h).toMatch(/new DOMParser\(\)\.parseFromString\(pdfFixResult\.accessibleHtml, 'text\/html'\)/);
    expect(h).toMatch(/const pick = sameTag \|\| found/);          // prefer the same-tag block
    expect(h).toMatch(/\['__region__'\]: \{ original: original/);   // opens the region editor
    expect(h).not.toMatch(/processExpertCommand/);                  // it only SELECTS — the bounded apply is the shared path
  });
  it('the region editor reuses _applyScopedIntent / _saveManualEdit keyed off the reserved __region__ key', () => {
    expect(src).toMatch(/_applyScopedIntent\(null, '__region__'\)/);
    expect(src).toMatch(/_saveManualEdit\(null, '__region__'\)/);
    expect(src).toMatch(/id="allo-region-editor"/);
    expect(src).toMatch(/pdf_audit\.region\.honesty/);              // "bounded to this block only" honesty line
  });
  it('the toolbar arms region-select and the armed flag is mirrored into the iframe for the marquee', () => {
    expect(src).toMatch(/onClick=\{\(\) => setRegionArmed\(\(v\) => !v\)\}/);
    expect(src).toMatch(/cw\.__alloflowRegionArmed = !!_regionArmed/);          // effect mirrors armed → iframe
    expect(src).toMatch(/if \(!cw \|\| !cw\.__alloflowRegionArmed\) return;/);   // marquee respects it
    expect(src).toMatch(/_regionHandlerRef\.current\(box\)/);                   // box → latest handler
    expect(src).toMatch(/_regionHandlerRef\.current = _runRegionSelect;/);      // never stale
  });
  it('survives the build into the shipped module', () => {
    expect(mod).toMatch(/_elementsInBox/);
    expect(mod).toMatch(/__alloflowRegionArmed/);
    expect(mod).toMatch(/allo-region-editor/);
  });
});
