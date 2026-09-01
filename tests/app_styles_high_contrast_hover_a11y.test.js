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

  it('keeps the generated root and public style modules identical', () => {
    expect(readFileSync('desktop/web-app/public/app_styles_module.js', 'utf8'))
      .toBe(readFileSync('app_styles_module.js', 'utf8'));
  });
});
