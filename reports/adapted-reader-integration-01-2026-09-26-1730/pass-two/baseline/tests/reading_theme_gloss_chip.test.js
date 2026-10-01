// Word supports stay visibly apart from the author's words in every reading
// theme, and the reading card's accent follows the theme.
//
// WHY (2026-09-23): a gloss is a tinted chip (bg-indigo-50) in the default
// theme. The reading themes clear every bg-indigo-50 and the dark theme
// recolours every span as body text, so in a theme the explanation read as
// part of the original, which is what word supports must never do. The
// reading card also kept its orange accent bar on blue, green and dark.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const CSS = fs.readFileSync(path.join(repo, 'app_styles_source.jsx'), 'utf8');
const BUILT = fs.readFileSync(path.join(repo, 'app_styles_module.js'), 'utf8');
const rule = (source, selector) => {
  const at = source.indexOf(selector + ' {');
  return at < 0 ? null : source.slice(at, source.indexOf('}', at) + 1);
};
const THEMED = '[data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"])';

describe('word supports in reading themes', () => {
  it('a gloss is a chip in the theme surface with the theme text colour and border', () => {
    const gloss = rule(CSS, THEMED + ' span[data-reading-gloss]');
    expect(gloss).toBeTruthy();
    expect(gloss).toMatch(/background-color: var\(--allo-rt-surface\) !important/);
    expect(gloss).toMatch(/color: var\(--allo-rt-fg\) !important/);
    expect(gloss).toMatch(/box-shadow: inset 0 0 0 1px var\(--allo-rt-border\)/);
  });
  it('the gloss rule outranks the rules that cleared it', () => {
    // Clearing rule: THEMED .bg-indigo-50 (four attribute/class parts). Dark
    // text rule: [data-reading-theme="dark"] span. The gloss rule adds an
    // element to the same four parts, so it wins both.
    expect(CSS).toContain(THEMED + ' .bg-indigo-50');
    expect(CSS).toContain('[data-reading-theme="dark"] h1, [data-reading-theme="dark"] h2, [data-reading-theme="dark"] h3, [data-reading-theme="dark"] p, [data-reading-theme="dark"] span');
    expect(CSS.indexOf(THEMED + ' span[data-reading-gloss]')).toBeGreaterThan(CSS.indexOf(THEMED + ' .bg-indigo-50'));
  });
  it('the reading card accent follows the theme, and high contrast uses its text colour', () => {
    expect(rule(CSS, THEMED + ':not([data-reading-theme="highContrast"]) [data-reading-card]')).toMatch(/border-left-color: var\(--allo-rt-hl\) !important/);
    expect(rule(CSS, '[data-reading-theme="highContrast"] [data-reading-card]')).toMatch(/border-left-color: var\(--allo-rt-fg\) !important/);
  });
  it('the built module carries the same rules', () => {
    expect(BUILT).toContain(THEMED + ' span[data-reading-gloss]');
    expect(BUILT).toContain('[data-reading-theme="highContrast"] [data-reading-card]');
  });
});
