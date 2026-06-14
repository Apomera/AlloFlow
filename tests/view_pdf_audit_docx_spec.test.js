// Golden tests for _htmlToDocxSpec — the pure HTML → block-spec transformer
// behind the "📝 Word (.docx)" accessible export (2026-06-09).
//
// The function is extracted from view_pdf_audit_source.jsx AT RUNTIME (the
// anti-drift pattern used by the wcag equivalence sentinels): the test always
// exercises the real shipped code, never a hand-copied mirror. Extraction is
// bounded by the literal markers `function _htmlToDocxSpec(html) {` and
// `// end _htmlToDocxSpec` — keep both intact in the source.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const start = src.indexOf('function _htmlToDocxSpec(html) {');
// fromIndex=start: the descriptive comment above the function also mentions
// the end marker, so search only past the function start.
const end = src.indexOf('// end _htmlToDocxSpec', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _htmlToDocxSpec missing');
const fnSrc = src.slice(start, end);
// vitest runs these suites under jsdom, so DOMParser is the real one.
const _htmlToDocxSpec = new Function(fnSrc + '; return _htmlToDocxSpec;')();

const wrap = (body, attrs) => `<!DOCTYPE html><html ${attrs || 'lang="en"'}><head><title>Test Doc</title></head><body>${body}</body></html>`;

describe('view_pdf_audit · _htmlToDocxSpec (accessible Word export)', () => {
  it('captures title and lang from the document', () => {
    const spec = _htmlToDocxSpec(wrap('<p>x</p>', 'lang="es"'));
    expect(spec.title).toBe('Test Doc');
    expect(spec.lang).toBe('es');
  });

  it('maps h1–h6 to heading blocks with correct levels', () => {
    const spec = _htmlToDocxSpec(wrap('<h1>One</h1><h3>Three</h3><h6>Six</h6>'));
    const hs = spec.blocks.filter(b => b.type === 'heading');
    expect(hs.map(h => h.level)).toEqual([1, 3, 6]);
    expect(hs[0].runs.map(r => r.text).join('')).toBe('One');
    expect(spec.counts.headings).toBe(3);
  });

  it('captures bold/italic/link formatting in runs', () => {
    const spec = _htmlToDocxSpec(wrap('<p>plain <strong>bold</strong> <em>ital</em> <a href="https://x.org/a">link</a></p>'));
    const runs = spec.blocks[0].runs;
    expect(runs.find(r => r.text === 'bold').bold).toBe(true);
    expect(runs.find(r => r.text === 'ital').italic).toBe(true);
    expect(runs.find(r => r.text === 'link').link).toBe('https://x.org/a');
    expect(spec.counts.links).toBe(1);
  });

  it('captures superscript/subscript so footnote anchors and formulae survive docx', () => {
    const spec = _htmlToDocxSpec(wrap('<p>H<sub>2</sub>O and x<sup>2</sup> note<sup class="allo-fn-ref">1</sup></p>'));
    const runs = spec.blocks[0].runs;
    expect(runs.find(r => r.text === '2' && r.sub).sub).toBe(true);
    const sups = runs.filter(r => r.sup);
    expect(sups.map(r => r.text).join('')).toBe('21'); // x² exponent + footnote marker
    // plain text carries neither flag
    expect(runs.find(r => /and/.test(r.text)).sup).toBe(false);
    expect(runs.find(r => /and/.test(r.text)).sub).toBe(false);
  });

  it('turns a page-break block into a pagebreak block and never leaks its label text', () => {
    const spec = _htmlToDocxSpec(wrap(
      '<p>before</p>' +
      '<div class="allo-block allo-block-pagebreak" data-allo-block="pagebreak"><span class="allo-pb-label" aria-hidden="true">— Page Break —</span><span class="allo-sr-only">Page break</span></div>' +
      '<p>after</p>'
    ));
    const types = spec.blocks.map(b => b.type);
    expect(types).toEqual(['paragraph', 'pagebreak', 'paragraph']);
    // the "— Page Break —" / "Page break" chrome must not appear as content
    expect(JSON.stringify(spec.blocks)).not.toContain('Page Break');
    expect(JSON.stringify(spec.blocks)).not.toContain('Page break');
  });

  it('flags reference-list entries for hanging indent (APA/MLA/Chicago)', () => {
    const spec = _htmlToDocxSpec(wrap(
      '<p>normal para</p>' +
      '<section class="allo-references"><h2>References</h2><p class="allo-ref-entry">Author, A. (2020). <em>Title</em>. Source.</p></section>'
    ));
    const refPara = spec.blocks.find(b => b.type === 'paragraph' && /Author, A\./.test((b.runs || []).map(r => r.text).join('')));
    expect(refPara.hanging).toBe(true);
    // a normal paragraph is not flagged
    expect(spec.blocks.find(b => b.type === 'paragraph' && /normal para/.test((b.runs || []).map(r => r.text).join(''))).hanging).toBeUndefined();
  });

  it('maps ul/ol with nesting levels and preserves order kind', () => {
    const spec = _htmlToDocxSpec(wrap('<ol><li>first</li><li>second<ul><li>nested</li></ul></li></ol>'));
    const list = spec.blocks.find(b => b.type === 'list');
    expect(list.ordered).toBe(true);
    expect(list.items.map(i => i.level)).toEqual([0, 0, 1]);
    expect(list.items[2].runs.map(r => r.text).join('')).toBe('nested');
    expect(spec.counts.lists).toBe(1);
  });

  it('maps tables and marks header rows (th-row and thead)', () => {
    const spec = _htmlToDocxSpec(wrap('<table><tr><th>H1</th><th>H2</th></tr><tr><td>a</td><td>b</td></tr></table>'));
    const tbl = spec.blocks.find(b => b.type === 'table');
    expect(tbl.rows[0].header).toBe(true);
    expect(tbl.rows[1].header).toBe(false);
    expect(tbl.rows[0].cells[0].header).toBe(true);
    expect(tbl.rows[1].cells[1].runs[0].text).toBe('b');
    expect(spec.counts.tables).toBe(1);
  });

  it('captures images with alt text; only data: URLs keep src', () => {
    const spec = _htmlToDocxSpec(wrap('<img src="data:image/png;base64,AAAA" alt="A chart"><img src="https://x.org/p.png" alt="Remote">'));
    const imgs = spec.blocks.filter(b => b.type === 'image');
    expect(imgs[0].src).toMatch(/^data:image\//);
    expect(imgs[0].alt).toBe('A chart');
    expect(imgs[1].src).toBe(null);
    expect(imgs[1].alt).toBe('Remote');
    expect(spec.counts.images).toBe(2);
  });

  it('figure: uses figcaption as alt fallback and keeps the caption paragraph', () => {
    const spec = _htmlToDocxSpec(wrap('<figure><img src="data:image/png;base64,AAAA"><figcaption>The caption</figcaption></figure>'));
    const img = spec.blocks.find(b => b.type === 'image');
    expect(img.alt).toBe('The caption');
    const cap = spec.blocks.find(b => b.type === 'paragraph');
    expect(cap.runs.map(r => r.text).join('')).toContain('The caption');
  });

  it('strips allo-block editor chrome and interactive elements', () => {
    const spec = _htmlToDocxSpec(wrap(
      '<p>real content</p>' +
      '<div class="allo-block-controls" contenteditable="false"><span>Term Lang</span></div>' +
      '<button class="allo-block-remove">×</button>' +
      '<p>more <button>click me</button>content</p>' +
      '<script>var x=1;</script><style>.x{}</style>'
    ));
    const all = JSON.stringify(spec.blocks);
    expect(all).not.toContain('Term Lang');
    expect(all).not.toContain('click me');
    expect(all).not.toContain('var x=1');
    expect(spec.blocks.filter(b => b.type === 'paragraph').length).toBe(2);
  });

  it('descends into div/section containers to find nested blocks', () => {
    const spec = _htmlToDocxSpec(wrap('<main><section><h2>Inside</h2><div><p>deep para</p></div></section></main>'));
    expect(spec.blocks.find(b => b.type === 'heading').runs[0].text).toBe('Inside');
    expect(spec.blocks.find(b => b.type === 'paragraph').runs[0].text).toBe('deep para');
  });

  it('empty/whitespace-only elements produce no blocks', () => {
    const spec = _htmlToDocxSpec(wrap('<p>   </p><h2></h2><ul><li> </li></ul>'));
    expect(spec.blocks.length).toBe(0);
  });
});
