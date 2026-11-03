// Keyless corpus re-run 2026-11-02 (policy, fda): a list whose items print their own markers
// ("A." .. "D.", "a)", "1.") rendered as a plain <ol>, so it displayed "1. A." until an AI fix pass
// added list-style-type:none. The renderer now hides the automatic marker itself, and keeps the
// printed marker text verbatim (coverage counts it).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// ALLO_RENDERER_SOURCE lets a mutation run point at a private copy instead of the shared file.
const source = readFileSync(process.env.ALLO_RENDERER_SOURCE || 'doc_builder_renderer_source.jsx', 'utf8');
const win = {};
new Function('window', source)(win);
const render = win.AlloModules.DocBuilderRenderer.createRenderer({
  docStyle: { headingColor: '#0f172a', textColor: '#1e293b', accentColor: '#2563eb', bgColor: '#ffffff' },
  _accessibleHeaderColors: () => null,
  _alloCellRichText: (value, escape) => escape(value),
  _emitAccessibleTableHtml: () => '<table></table>',
  _pipeLog: () => {},
  _sanitizeRawHtmlBlock: (html) => String(html || ''),
  _validateTableGrid: () => ({ ok: false }),
  renderWordArtHtml: (text) => '<span>' + text + '</span>',
  warnLog: () => {},
});
const NONE = 'list-style-type:none';
const listTag = (html) => (html.match(/<(?:ol|ul)\b[^>]*>/) || [''])[0];

describe('a list whose items print their own markers', () => {
  it('hides the browser numbering for lettered items and keeps "A." .. "D." verbatim (policy)', () => {
    const items = ['A. A description of the scope', 'B. General information', 'C. Roles and responsibilities', 'D. Strategies for conveying information'];
    const html = render([{ type: 'ol', items }]);
    expect(listTag(html)).toContain(NONE);
    expect(listTag(html).startsWith('<ol ')).toBe(true);
    for (const item of items) expect(html).toContain('<li style="margin:0.3em 0">' + item + '</li>');
  });

  it('recognizes "a)", "(iv)", "1.", "2.1." and markers wrapped in emphasis (fda)', () => {
    for (const items of [
      ['a) reviewing the information', 'b) conducting studies'],
      ['(i) first', '(ii) second', '(iv) fourth'],
      ['1. The following parts have been fulfilled', '2. We are waiving the requirement'],
      ['2.1. Purpose', '2.2. Scope'],
      ['<strong><em>a)</em></strong> <em>reviewing</em>', '<strong><em>b)</em></strong> <em>conducting</em>'],
      ['**1.** first', '**2.** second'],
    ]) expect(listTag(render([{ type: 'ol', items }])), items[0]).toContain(NONE);
  });

  it('hides the bullet of a ul whose items carry a printed bullet', () => {
    const html = render([{ type: 'ul', items: ['• Bring a coat', '• Bring lunch'] }]);
    expect(listTag(html)).toContain(NONE);
    expect(html).toContain('• Bring a coat');
  });

  it('keeps the browser marker for ordinary items, mixed lists and abbreviations', () => {
    for (const [type, items] of [
      ['ol', ['Mix the flour', 'Add the eggs']],
      ['ol', ['A. Scope', 'General information without a marker']],
      ['ul', ['U.S. government', 'U.K. government']],
      ['ul', ['e.g. apples', 'i.e. pears']],
      ['ol', ['10am start', '2pm finish']],
      ['ul', ['2.5 cups flour', '1.5 cups sugar']], // a decimal amount is not a section number
    ]) {
      const tag = listTag(render([{ type, items }]));
      expect(tag, items.join(' | ')).not.toContain(NONE);
      expect(tag, items.join(' | ')).toBe(`<${type} style="margin:0.6em 0;padding-inline-start:1.5em">`);
    }
  });
});
