import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const start = source.indexOf('function _htmlToStructuredText(html, markdown) {');
const end = source.indexOf('function _htmlToDocxSpec(html) {', start);
if (start === -1 || end === -1) throw new Error('structured-text exporter extraction markers missing');
const slice = source.slice(start, end);
const { plain, markdown } = new Function(
  slice + '; return { plain: _htmlToPlainTextExport, markdown: _htmlToMarkdownExport };'
)();

const wrap = (body) => '<!doctype html><html lang="en"><head><title>Fixture</title></head><body>' + body + '</body></html>';

describe('structured TXT/Markdown exports', () => {
  it('preserves nested list depth and ordered-list start values without duplicating child text', () => {
    const html = wrap('<ul><li>Parent<ul><li>Child</li></ul></li></ul><ol start="4"><li>Fourth</li><li>Fifth</li></ol>');
    const md = markdown(html);
    expect(md).toContain('- Parent\n  - Child');
    expect(md).toContain('4. Fourth\n5. Fifth');
    expect((md.match(/Child/g) || [])).toHaveLength(1);
  });

  it('keeps table cells distinct, escapes Markdown pipes, and preserves line breaks', () => {
    const html = wrap('<table><tr><th>Label</th><th>Value</th></tr><tr><td>A | B</td><td>Line 1<br>Line 2</td></tr></table>');
    expect(markdown(html)).toContain('| A \\| B | Line 1<br>Line 2 |');
    expect(plain(html)).toContain('A | B\tLine 1 / Line 2');
  });

  it('does not silently promote the first data row to a header', () => {
    const md = markdown(wrap('<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>'));
    expect(md.split('\n').slice(0, 4)).toEqual(['|  |  |', '| --- | --- |', '| A | B |', '| C | D |']);
  });

  it('does not duplicate a nested table into its parent cell', () => {
    const md = markdown(wrap('<table><tr><th>Outer</th></tr><tr><td>Before<table><tr><th>Inner</th></tr><tr><td>Value</td></tr></table></td></tr></table>'));
    expect(md).toContain('| Before |');
    expect(md).toContain('| Inner |');
    expect((md.match(/Inner/g) || [])).toHaveLength(1);
    expect((md.match(/Value/g) || [])).toHaveLength(1);
  });

  it('uses honest image fallbacks instead of broken synthetic image URLs', () => {
    const md = markdown(wrap('<p>See <img src="data:image/png;base64,AAAA" alt="Class score chart"></p>'));
    expect(md).toContain('[Image: Class score chart]');
    expect(md).not.toContain('](image)');
  });

  it('preserves disclosure summaries, preformatted text, fields, and inline formatting', () => {
    const md = markdown(wrap(
      '<details><summary>Show directions</summary><p>Use <code>x = 2</code> and <del>old</del>.</p></details>' +
      '<pre>alpha  beta\n  gamma</pre><p><input type="checkbox" checked> Done <input placeholder="Your answer"></p>'
    ));
    expect(md).toContain('**Show directions**');
    expect(md).toContain('`x = 2`');
    expect(md).toContain('~~old~~');
    expect(md).toContain('```text\nalpha  beta\n  gamma\n```');
    expect(md).toContain('[x] Done Your answer');
  });

  it('drops redundant raw math-source disclosures while retaining surrounding content', () => {
    const md = markdown(wrap('<p>Equation shown above.</p><details class="allo-math-source"><summary>Show source</summary><pre>x^2</pre></details><p>After.</p>'));
    expect(md).toContain('Equation shown above.');
    expect(md).toContain('After.');
    expect(md).not.toContain('Show source');
    expect(md).not.toContain('x^2');
  });
});
