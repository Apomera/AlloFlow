// WCAG 1.4.3: in dark theme StemLab paints each tool on a light card ([data-stem-tool-surface]).
// The hub's dark remaps (light ink, dark panels) and the shell's inherit-ink rules are for the
// hub chrome and must stop at that card, or tools get light text on their own light panels.
// A browser sweep of every manifest STEM tool through the real modal measured 1,446 failing
// nodes in app dark before this scope and 45 after (reports/wcag-audit-2026-10-25).
// Tools that paint their own dark panels opt back in with `darkRemap: true`.
// STEM_LAB_CANDIDATE=<path> runs against a scratch copy (mutation checks).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const file = process.env.STEM_LAB_CANDIDATE || 'stem_lab/stem_lab_module.js';
const src = readFileSync(file, 'utf8');
const SCOPE = ':not([data-stem-tool-surface]:not([data-stem-dark-remap]) *)';

function darkRules() {
  const start = src.indexOf("var id = 'stem-theme-overrides';");
  const from = src.indexOf('if (isDark) {', start);
  const open = src.indexOf('s.textContent = [', from) + 's.textContent = '.length;
  const stop = src.indexOf('} else if (isContrast) {', open);
  if (start < 0 || from < 0 || stop < 0) throw new Error('dark override block not found in ' + file);
  const expr = src.slice(open, stop).trim().replace(/;\s*$/, '');
  return new Function('return ' + expr + ';')();
}

describe('StemLab dark remaps stop at the light tool card', () => {
  it('scopes every dark-theme override selector out of the card', () => {
    const css = darkRules();
    const selectors = css.split('\n').flatMap((rule) => rule.slice(0, rule.indexOf('{')).split(',').map((s) => s.trim()));
    expect(selectors.length).toBeGreaterThan(100);
    const unscoped = selectors.filter((s) => !s.endsWith(SCOPE));
    expect(unscoped, 'unscoped dark selectors').toEqual([]);
  });

  it('scopes the shell inherit-ink and light-panel ink rules the same way', () => {
    const block = src.slice(src.indexOf("var id = 'stem-tool-shell-contrast';"), src.indexOf("s.textContent = inheritRule + '\\n' + lightBgRule;"));
    expect(block.match(/return '\[data-stem-tool-shell\] \.' \+ c \+ '([^']*)';/g)).toHaveLength(2);
    for (const m of block.matchAll(/return '\[data-stem-tool-shell\] \.' \+ c \+ '([^']*)';/g)) expect(m[1]).toBe(SCOPE);
  });

  it('marks opted-in tools on the card and keeps the public mirror in step', () => {
    expect(src.includes("'data-stem-dark-remap': tool.darkRemap === true ? 'true' : undefined,"), 'surface carries the opt-in attribute').toBe(true);
    if (!process.env.STEM_LAB_CANDIDATE) expect(readFileSync('desktop/web-app/public/stem_lab/stem_lab_module.js', 'utf8') === src, 'public mirror matches').toBe(true);
  });

  it('opts in the tools that paint their own dark panels', () => {
    for (const [tool, id] of [['anatomy', 'anatomy'], ['physics', 'physics'], ['wave', 'wave'], ['solarsystem', 'solarSystem']]) {
      for (const copy of ['stem_lab/', 'desktop/web-app/public/stem_lab/']) {
        expect(readFileSync(copy + 'stem_tool_' + tool + '.js', 'utf8'), copy + tool).toMatch(new RegExp("registerTool\\('" + id + "', \\{\\s*darkRemap: true,"));
      }
    }
  });
});
