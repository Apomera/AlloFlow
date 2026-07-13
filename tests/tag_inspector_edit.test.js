// Tests for the editable tag-inspector mutations (Adobe-parity #2 + #3, 2026-06-14).
//
// The edit helpers (_retagTagEl / _toggleDecorativeEl / _moveTagEl /
// _tableHeaderFix) are pure DOM transforms on the HTML the PDF tags are DERIVED
// from — re-tagging a block here changes the tag tree because the tags are
// generated from this structure (so they can't drift from the output). These are
// component-scope consts, so this is a MIRROR of the shipped logic (same pattern
// as fixHeadingHierarchy in doc_pipeline_wcag.test.js) — keep them in sync.

import { describe, it, expect } from 'vitest';

function _retagTagEl(el, doc, newTag) {
  if (!el || el.tagName.toLowerCase() === newTag) return;
  const n = doc.createElement(newTag);
  for (const a of Array.from(el.attributes)) { try { n.setAttribute(a.name, a.value); } catch (_) {} }
  while (el.firstChild) n.appendChild(el.firstChild);
  el.replaceWith(n);
}
function _toggleDecorativeEl(el) {
  const img = el.tagName.toLowerCase() === 'img' ? el : (el.querySelector && el.querySelector('img'));
  const target = img || el;
  const isDec = target.getAttribute('role') === 'presentation' || target.getAttribute('aria-hidden') === 'true';
  if (isDec) { target.removeAttribute('role'); target.removeAttribute('aria-hidden'); }
  else { target.setAttribute('role', 'presentation'); if (img) img.setAttribute('alt', ''); target.setAttribute('aria-hidden', 'true'); }
}
function _moveTagEl(el, dir) {
  const sib = dir === 'up' ? el.previousElementSibling : el.nextElementSibling;
  if (sib && el.parentNode) { if (dir === 'up') el.parentNode.insertBefore(el, sib); else el.parentNode.insertBefore(sib, el); }
}
function _tableHeaderFix(tableEl, doc, mode) {
  if (!tableEl || tableEl.tagName.toLowerCase() !== 'table') return;
  const _toTh = (cell, scope) => {
    if (cell.tagName.toLowerCase() === 'th') { if (!cell.getAttribute('scope')) cell.setAttribute('scope', scope); return; }
    const th = doc.createElement('th');
    for (const a of Array.from(cell.attributes)) { try { th.setAttribute(a.name, a.value); } catch (_) {} }
    while (cell.firstChild) th.appendChild(cell.firstChild);
    th.setAttribute('scope', scope);
    cell.replaceWith(th);
  };
  const rows = Array.from(tableEl.querySelectorAll('tr'));
  if (!rows.length) return;
  if (mode === 'firstRowHeader') { Array.from(rows[0].children).forEach((c) => { const tg = c.tagName.toLowerCase(); if (tg === 'td' || tg === 'th') _toTh(c, 'col'); }); }
  else if (mode === 'firstColHeader') { rows.forEach((r) => { const c = r.children[0]; if (c) { const tg = c.tagName.toLowerCase(); if (tg === 'td' || tg === 'th') _toTh(c, 'row'); } }); }
}

const SURFACE = 'h1,h2,h3,h4,h5,h6,p,ul,ol,table,figure,img,blockquote,header,footer';
const dom = (html) => new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + html + '</body></html>', 'text/html');
const at = (doc, idx) => doc.body.querySelectorAll(SURFACE)[idx];

describe('tag inspector — re-tag a block (#2)', () => {
  it('promotes a paragraph to a heading, preserving attributes + children', () => {
    const doc = dom('<h1>Title</h1><p class="lead" id="x">Body <strong>bold</strong></p>');
    _retagTagEl(at(doc, 1), doc, 'h2');
    const h2 = doc.body.querySelector('h2');
    expect(h2).toBeTruthy();
    expect(h2.getAttribute('class')).toBe('lead');
    expect(h2.getAttribute('id')).toBe('x');
    expect(h2.querySelector('strong').textContent).toBe('bold');
    expect(doc.body.querySelector('p')).toBe(null);
  });
  it('is a no-op when the target tag already matches', () => {
    const doc = dom('<p>same</p>');
    _retagTagEl(at(doc, 0), doc, 'p');
    expect(doc.body.querySelectorAll('p').length).toBe(1);
  });
});

describe('tag inspector — decorative toggle (#2)', () => {
  it('marks a figure image decorative (role=presentation, alt="", aria-hidden)', () => {
    const doc = dom('<figure><img src="a.png" alt="old"></figure>');
    _toggleDecorativeEl(at(doc, 0));
    const img = doc.body.querySelector('img');
    expect(img.getAttribute('role')).toBe('presentation');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });
  it('toggles back to content', () => {
    const doc = dom('<figure><img src="a.png" role="presentation" alt="" aria-hidden="true"></figure>');
    _toggleDecorativeEl(at(doc, 0));
    const img = doc.body.querySelector('img');
    expect(img.getAttribute('role')).toBe(null);
    expect(img.getAttribute('aria-hidden')).toBe(null);
  });
});

describe('tag inspector — reading-order move (#2)', () => {
  it('moves a block down past its next sibling', () => {
    const doc = dom('<p>first</p><h2>second</h2>');
    _moveTagEl(at(doc, 0), 'down');
    expect(doc.body.innerHTML.indexOf('<h2>second</h2>')).toBeLessThan(doc.body.innerHTML.indexOf('<p>first</p>'));
  });
  it('is a no-op at the boundary (move up the first child)', () => {
    const doc = dom('<p>only</p>');
    const before = doc.body.innerHTML;
    _moveTagEl(at(doc, 0), 'up');
    expect(doc.body.innerHTML).toBe(before);
  });
});

describe('table header editor (#3)', () => {
  it('first-row-header: promotes row 1 cells to th scope=col, leaves data rows', () => {
    const doc = dom('<table><tr><td>A</td><td>B</td></tr><tr><td>1</td><td>2</td></tr></table>');
    _tableHeaderFix(doc.body.querySelector('table'), doc, 'firstRowHeader');
    const ths = doc.body.querySelectorAll('th');
    expect(ths.length).toBe(2);
    ths.forEach((th) => expect(th.getAttribute('scope')).toBe('col'));
    expect(doc.body.querySelectorAll('td').length).toBe(2); // data row untouched
  });
  it('first-column-header: promotes the first cell of each row to th scope=row', () => {
    const doc = dom('<table><tr><td>H1</td><td>x</td></tr><tr><td>H2</td><td>y</td></tr></table>');
    _tableHeaderFix(doc.body.querySelector('table'), doc, 'firstColHeader');
    const ths = doc.body.querySelectorAll('th');
    expect(ths.length).toBe(2);
    ths.forEach((th) => expect(th.getAttribute('scope')).toBe('row'));
  });
  it('adds scope to existing header cells without re-creating them', () => {
    const doc = dom('<table><tr><th>A</th><th>B</th></tr></table>');
    _tableHeaderFix(doc.body.querySelector('table'), doc, 'firstRowHeader');
    expect(doc.body.querySelectorAll('th[scope="col"]').length).toBe(2);
  });
});
