// Bug-hunt fast-follow (2026-06-17): the regex-based table tools (fix_table_caption / fix_th_scope /
// fix_table_header_row) corrupted NESTED tables — a non-greedy …</table> truncates at the FIRST close
// tag, and the AI-proposed params were interpolated UNESCAPED (same XSS class as the recon-table sink).
// They're now DOM-based (querySelectorAll('table')[index] + textContent/setAttribute auto-escape).
// fix_figcaption / fix_link_text keep their regex path but escape the injected param (anchors/figures
// don't have the nested-table truncation problem). These tests prove: (1) nested tables survive,
// (2) markup in a param can never produce a live tag, (3) an invalid scope can't break out of the attr.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// The DOM tools `return _serializeDomEdit(html, doc)`, so inject that module-scope helper into scope.
const _helperSrc = src.slice(src.indexOf('function _serializeDomEdit(originalHtml, doc) {'), src.indexOf('\n// Sanitize an AI-parsed'));
const toolFn = (name, nextMarker) => {
  const s = src.indexOf(name + ': {');
  const e = src.indexOf(nextMarker, s);
  if (s === -1 || e === -1) throw new Error('extract markers missing for ' + name);
  return new Function(_helperSrc + '\nreturn {' + src.slice(s, e).replace(/,\s*$/, '') + '};')()[name].fn;
};
const fix_link_text       = toolFn('fix_link_text', 'fix_figcaption:');
const fix_figcaption      = toolFn('fix_figcaption', 'fix_table_caption:');
const fix_table_caption   = toolFn('fix_table_caption', 'fix_th_scope:');
const fix_th_scope        = toolFn('fix_th_scope', 'fix_table_header_row:');
const fix_table_header_row = toolFn('fix_table_header_row', 'fix_table_header_col:');

const wrap = (b) => `<!DOCTYPE html><html lang="en"><body><main>${b}</main></body></html>`;
const parse = (h) => new DOMParser().parseFromString(h, 'text/html');
const directChild = (el, tag) => { for (let i = 0; i < el.children.length; i++) if (el.children[i].tagName === tag) return el.children[i]; return null; };

describe('fix_table_header_row (DOM) — promotes the outer table without eating a nested table', () => {
  // The OLD regex matched <table>…<\/table> non-greedily → it stopped at the INNER </table>, truncating
  // the outer table and corrupting both. The DOM version uses t.rows (this table's rows only).
  const nested = wrap('<table><tr><td>H1</td><td>H2</td></tr><tr><td>data<table><tr><td>inner</td></tr></table></td><td>more</td></tr></table>');
  it('promotes the OUTER first row to <thead> th[scope=col] and keeps the nested table intact', () => {
    const after = fix_table_header_row(nested, { index: 0 });
    const d = parse(after);
    const outer = d.querySelectorAll('table')[0];
    expect(outer.tHead).toBeTruthy();
    const hcells = outer.tHead.querySelectorAll('th');
    expect(hcells.length).toBe(2);
    expect(hcells[0].getAttribute('scope')).toBe('col');
    expect([hcells[0].textContent, hcells[1].textContent]).toEqual(['H1', 'H2']);
    const inner = outer.querySelector('td table'); // the nested table SURVIVED
    expect(inner).toBeTruthy();
    expect(inner.textContent).toContain('inner');
  });
  it('preserves every cell (no truncation): H1 H2 data inner more all still present', () => {
    const after = fix_table_header_row(nested, { index: 0 });
    const txt = parse(after).querySelectorAll('table')[0].textContent;
    for (const w of ['H1', 'H2', 'data', 'inner', 'more']) expect(txt).toContain(w);
  });
  it('is a no-op when the table already has a <thead>', () => {
    const withHead = wrap('<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>');
    expect(fix_table_header_row(withHead, { index: 0 })).toBe(withHead);
  });
});

describe('fix_table_caption (DOM) — escaped, direct-child, no duplicate', () => {
  it('a markup payload in the caption can never produce a live tag (textContent escapes)', () => {
    const after = fix_table_caption(wrap('<table><tr><td>x</td></tr></table>'), { index: 0, caption: '<img src=x onerror=alert(1)>' });
    expect(after).not.toContain('<img');
    expect(after).toContain('&lt;img');
  });
  it('adds the caption as a DIRECT child of the targeted table', () => {
    const after = fix_table_caption(wrap('<table><tr><td>x</td></tr></table>'), { index: 0, caption: 'My table' });
    const cap = directChild(parse(after).querySelector('table'), 'CAPTION');
    expect(cap).toBeTruthy();
    expect(cap.textContent).toBe('My table');
  });
  it('REPLACES an existing caption text instead of adding a second <caption>', () => {
    const after = fix_table_caption(wrap('<table><caption>Old</caption><tr><td>x</td></tr></table>'), { index: 0, caption: 'New' });
    const t = parse(after).querySelector('table');
    expect(t.querySelectorAll('caption').length).toBe(1);
    expect(t.querySelector('caption').textContent).toBe('New');
  });
});

describe('fix_th_scope (DOM) — validated scope, scope-less targeting', () => {
  it('an invalid/injected scope falls back to "col" (no attribute breakout)', () => {
    const after = fix_th_scope(wrap('<table><tr><th>A</th></tr></table>'), { index: 0, scope: 'col"><script>alert(1)</script>' });
    expect(after).not.toContain('<script>alert(1)');
    expect(parse(after).querySelector('th').getAttribute('scope')).toBe('col');
  });
  it('sets scope on the Nth scope-LESS th, leaving already-scoped ths alone', () => {
    const after = fix_th_scope(wrap('<table><tr><th scope="col">Kept</th><th>Target</th></tr></table>'), { index: 0, scope: 'row' });
    const ths = parse(after).querySelectorAll('th');
    expect(ths[0].getAttribute('scope')).toBe('col');   // pre-existing scope untouched
    expect(ths[1].getAttribute('scope')).toBe('row');   // the first scope-less th got it
  });
  it('with no index, scopes ALL scope-less ths', () => {
    const after = fix_th_scope(wrap('<table><tr><th>A</th><th>B</th></tr></table>'), { scope: 'col' });
    const ths = parse(after).querySelectorAll('th');
    expect(ths[0].getAttribute('scope')).toBe('col');
    expect(ths[1].getAttribute('scope')).toBe('col');
  });
});

describe('fix_figcaption / fix_link_text — param escaped (no live tag)', () => {
  it('fix_figcaption escapes a markup caption', () => {
    const after = fix_figcaption(wrap('<figure><img alt="x"></figure>'), { index: 0, caption: '<b onclick=evil>cap</b>' });
    expect(after).not.toContain('<b onclick');
    expect(after).toContain('&lt;b onclick');
    expect(after).toContain('<figcaption>');
  });
  it('fix_link_text escapes the new link text (generic anchor replaced)', () => {
    const after = fix_link_text(wrap('<a href="/x">click here</a>'), { index: 0, newText: '<img src=x onerror=alert(1)> Annual report' });
    expect(after).not.toContain('<img');
    expect(after).toContain('&lt;img');
    expect(after).toContain('Annual report');
  });
  it('fix_link_text leaves a NON-generic anchor unchanged without force', () => {
    const before = wrap('<a href="/x">Read the 2024 budget</a>');
    expect(fix_link_text(before, { index: 0, newText: 'whatever' })).toBe(before);
  });
});

describe('strip lists: the table-refine style is removed on every save/export/restore path', () => {
  it('doc_pipeline export + word-restore clones strip #allo-table-refine-style (>=3 sites)', () => {
    const strips = (src.match(/#allo-img-resize-style, #allo-table-refine-style/g) || []).length;
    expect(strips).toBeGreaterThanOrEqual(3); // _liveClone, _expClone, _wrClone (applyWordRestorationInPlace)
  });
  it('the HOST mutation-sync strip (AlloFlowANTI.txt) also includes #allo-table-refine-style', () => {
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    // host strip must remove the injected table-refine <style> so it never bakes into saved HTML
    expect(anti).toContain('#allo-img-resize-style, #allo-table-refine-style');
  });
});
