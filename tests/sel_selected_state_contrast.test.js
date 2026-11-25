// In the contrast theme every button is forced to black with green ink, so a selected tab
// in an SEL tool looked the same as the others. STEM tools got a yellow inner ring
// (tests/stem_selected_state_contrast.test.js); SEL tools render inside
// [data-sel-tool-shell] and now get the same ring. Ring and edge only, never a fill.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const COPIES = [
  'app_styles_source.jsx',
  'app_styles_module.js',
  'desktop/app-build/app_styles_module.js',
  'desktop/web-app/build/app_styles_module.js',
  'desktop/web-app/public/app_styles_module.js',
];
const SEL = '.theme-contrast [data-sel-tool-shell] button:is([aria-selected="true"], [aria-pressed="true"], [aria-current]:not([aria-current="false"]))';

it('the SEL hub still marks its tool shell with data-sel-tool-shell', () => {
  expect(fs.readFileSync('sel_hub/sel_hub_module.js', 'utf8')).toContain("'data-sel-tool-shell': id,");
});

describe.each(COPIES)('selected SEL buttons in the contrast theme: %s', (file) => {
  const css = fs.readFileSync(file, 'utf8');

  it('draws the ring at rest, keeps it on hover, and adds an outer ring on keyboard focus', () => {
    expect(css).toContain(`${SEL} { border-color: #ffff00 !important; box-shadow: inset 0 0 0 4px #ffff00 !important; }`);
    expect(css).toContain(`${SEL}:hover:not(:focus-visible) { box-shadow: inset 0 0 0 2px #000000, inset 0 0 0 5px #ffff00 !important; }`);
    expect(css).toContain(`${SEL}:focus-visible { box-shadow: inset 0 0 0 4px #ffff00, 0 0 0 6px #000000, 0 0 0 10px #ffff00 !important; }`);
  });

  it('never fills a selected SEL button', () => {
    const lines = css.split('\n').filter((l) => l.includes('[data-sel-tool-shell] button:is([aria-selected'));
    expect(lines.length).toBe(3);
    for (const l of lines) expect(l).not.toContain('background');
  });
});
