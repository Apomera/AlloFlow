import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('app_styles_source.jsx', 'utf8');

describe('shared high-contrast button hover accessibility', () => {
  it('keeps nested button content black on the forced green hover surface', () => {
    const broadTextRule = source.indexOf('.theme-contrast h1, .theme-contrast h2');
    const nestedHoverRule = source.indexOf('.theme-contrast button:hover * { color: #000000 !important; }');
    expect(broadTextRule).toBeGreaterThanOrEqual(0);
    expect(nestedHoverRule).toBeGreaterThan(broadTextRule);
  });

  it('forces the contrast ink onto every text-bearing element type, not just the common five', () => {
    // A tool heading, disclosure summary or table cell with a dark Tailwind
    // class is dark-on-black in the contrast theme unless the host recolours
    // that element type. Art Studio measured summary/legend at ~1.2:1.
    const start = source.indexOf('.theme-contrast h1, .theme-contrast h2');
    const rule = source.slice(start, source.indexOf('{', start));
    const selectors = rule.split(',').map(s => s.trim());
    for (const tag of ['h5', 'h6', 'summary', 'legend', 'strong', 'td', 'th', 'dt', 'dd', 'output', 'code', 'figcaption', 'blockquote', 'caption']) {
      expect(selectors, tag).toContain('.theme-contrast ' + tag);
    }
    const built = readFileSync('app_styles_module.js', 'utf8');
    expect(built).toContain('.theme-contrast summary, .theme-contrast legend,');
  });

  it('keeps children of yellow chips black so the broad ink rule cannot make them yellow on yellow', () => {
    const childRule = '.theme-contrast .bg-yellow-200 *, .theme-contrast .bg-yellow-300 *, .theme-contrast .bg-yellow-400 * { color: #000000 !important; }';
    expect(source).toContain(childRule);
    expect(readFileSync('app_styles_module.js', 'utf8')).toContain(childRule);
  });

  it('keeps the generated root and public style modules identical', () => {
    expect(readFileSync('desktop/web-app/public/app_styles_module.js', 'utf8'))
      .toBe(readFileSync('app_styles_module.js', 'utf8'));
  });
});
