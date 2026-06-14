// Lifecycle tests for the footnote renumber engine (_alloRenumberFootnotes).
//
// Extracts the real shipped function from view_pdf_audit_source.jsx at runtime
// (anti-drift pattern, like view_pdf_audit_docx_spec.test.js) and exercises it
// under jsdom. Closes two gaps the 2026-06-14 gameplan flagged: (A3) an orphan
// REF — a <sup> marker whose note was deleted — used to survive as a dangling
// link to a non-existent #fn-uid in the exported PDF/HTML; and (A10) the renumber
// engine had no committed test despite being the highest-churn footnote code.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const start = src.indexOf('function _alloRenumberFootnotes(doc) {');
const end = src.indexOf('\nfunction _srStyleTextFromHtml', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _alloRenumberFootnotes missing');
const _alloRenumberFootnotes = new Function(src.slice(start, end) + '; return _alloRenumberFootnotes;')();

const makeDoc = (body) => new DOMParser().parseFromString('<!DOCTYPE html><html><body><main>' + body + '</main></body></html>', 'text/html');
const ref = (uid) => `<sup class="allo-fn-ref" data-fn-uid="${uid}"><a href="#">?</a></sup>`;
const notes = (...pairs) => '<section class="allo-footnotes"><hr/><ol>' +
  pairs.map(([uid, txt]) => `<li data-fn-uid="${uid}"><span class="allo-fn-text">${txt}</span> <a href="#fnref-${uid}" class="allo-fn-back">↩</a></li>`).join('') +
  '</ol></section>';
const refNums = (doc) => Array.from(doc.querySelectorAll('sup.allo-fn-ref a')).map((a) => a.textContent);
const noteUids = (doc) => Array.from(doc.querySelectorAll('.allo-footnotes ol > li')).map((li) => li.getAttribute('data-fn-uid'));

describe('_alloRenumberFootnotes — footnote lifecycle', () => {
  it('numbers refs 1..N in document order', () => {
    const doc = makeDoc(`<p>A${ref('a')} B${ref('b')} C${ref('c')}</p>` + notes(['a', '1'], ['b', '2'], ['c', '3']));
    _alloRenumberFootnotes(doc);
    expect(refNums(doc)).toEqual(['1', '2', '3']);
  });

  it('reorders notes to match the document order of their refs', () => {
    // refs appear b then a; notes stored a then b → notes must reorder to b, a
    const doc = makeDoc(`<p>X${ref('b')} Y${ref('a')}</p>` + notes(['a', 'noteA'], ['b', 'noteB']));
    _alloRenumberFootnotes(doc);
    expect(noteUids(doc)).toEqual(['b', 'a']);
  });

  it('prunes an orphan NOTE (note whose ref was deleted)', () => {
    const doc = makeDoc(`<p>X${ref('a')}</p>` + notes(['a', 'keep'], ['b', 'orphan']));
    _alloRenumberFootnotes(doc);
    expect(noteUids(doc)).toEqual(['a']);
  });

  it('A3: prunes an orphan REF (marker whose note was deleted) — no dangling link survives', () => {
    // refs a + b in the body but only note a exists → b is an orphan marker
    const doc = makeDoc(`<p>X${ref('a')} Y${ref('b')}</p>` + notes(['a', 'onlyNote']));
    _alloRenumberFootnotes(doc);
    const refs = Array.from(doc.querySelectorAll('sup.allo-fn-ref'));
    expect(refs.length).toBe(1);                                  // orphan ref b removed
    expect(refs[0].getAttribute('data-fn-uid')).toBe('a');
    expect(refs[0].querySelector('a').textContent).toBe('1');     // surviving ref renumbered, no gap
    // every surviving ref must target a REAL note (no dangling #fn-uid)
    const noteIds = new Set(Array.from(doc.querySelectorAll('.allo-footnotes ol > li')).map((li) => li.id));
    Array.from(doc.querySelectorAll('sup.allo-fn-ref a')).forEach((a) => {
      expect(noteIds.has(a.getAttribute('href').slice(1))).toBe(true);
    });
  });

  it('renumbers the survivors after a middle delete (delete 2nd of 3)', () => {
    // ref b deleted from the body; note b is now an orphan → pruned, a & c renumber to 1,2
    const doc = makeDoc(`<p>A${ref('a')} C${ref('c')}</p>` + notes(['a', '1'], ['b', 'gone'], ['c', '3']));
    _alloRenumberFootnotes(doc);
    expect(refNums(doc)).toEqual(['1', '2']);
    expect(noteUids(doc)).toEqual(['a', 'c']);
  });

  it('removes the whole footnotes section when nothing is left', () => {
    const doc = makeDoc(`<p>no refs here</p>` + notes(['a', 'orphan']));
    _alloRenumberFootnotes(doc);
    expect(doc.querySelector('section.allo-footnotes')).toBe(null);
  });
});
