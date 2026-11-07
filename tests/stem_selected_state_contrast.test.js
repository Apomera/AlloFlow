// In the contrast theme every button is forced to the same black fill and green ink, so a selected
// tab or level looked like an unselected one. Survey 2026-11-05: 147 of 306 first-screen pairs across
// 64 tools read the same. The host now draws a yellow inner ring on selected STEM buttons.
// Only the ring and edge change: a fill rule here gave black on black in 12 of 93 tools.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const COPIES = [
  'app_styles_source.jsx',
  'app_styles_module.js',
  'desktop/app-build/app_styles_module.js',
  'desktop/web-app/build/app_styles_module.js',
  'desktop/web-app/public/app_styles_module.js',
];
const SELECTED = '.theme-contrast [data-stem-tool-shell] button[aria-selected="true"], .theme-contrast [data-stem-tool-shell] button[aria-pressed="true"]';

describe('STEM Lab header and hub tiles', () => {
  const host = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');

  it('the Keyboard accessible badge is solid white on a darkened patch (was 3.09:1)', () => {
    const line = host.split('\n').find((l) => l.includes('stem-lab-keyboard-badge hidden'));
    expect(line).toContain('font-medium text-white"');
    expect(line).toContain("background: 'rgba(0, 0, 0, 0.25)'");
    expect(line).not.toContain('text-white/70');
  });

  it('a letter used as a tile icon is black on the amber patch in contrast (was yellow on amber, 1.55:1)', () => {
    expect(host.includes(".theme-contrast .stem-tool-card-icon { color: #000000 !important; }"), 'rule missing').toBe(true);
    expect(host.includes("accent: '#fbbf24', iconBg: '#fbbf24'"), 'the patch colour this rule relies on changed').toBe(true);
  });
});

describe.each(COPIES)('selected STEM buttons in the contrast theme: %s', (file) => {
  const css = fs.readFileSync(file, 'utf8');
  const blocks = css.split('\n').filter((l) => l.includes('[data-stem-tool-shell] button[aria-selected="true"]'));

  it('draws a ring on both kinds of selected state', () => {
    expect(css.includes(`${SELECTED} { border-color: #ffff00 !important; box-shadow: inset 0 0 0 4px #ffff00 !important; }`), 'rest rule missing').toBe(true);
  });

  it('keeps the ring on hover, and adds a separate outer ring on keyboard focus', () => {
    expect(blocks.some((l) => l.includes(':hover:not(:focus-visible)') && l.includes('inset 0 0 0 5px #ffff00'))).toBe(true);
    expect(blocks.some((l) => l.includes('button[aria-pressed="true"]:focus-visible') && l.includes('0 0 0 10px #ffff00'))).toBe(true);
  });

  it('rings a button marked with aria-current too, but not aria-current="false"', () => {
    const B = '.theme-contrast [data-stem-tool-shell] button[aria-current]:not([aria-current="false"])';
    expect(css.includes(`${B} { border-color: #ffff00 !important; box-shadow: inset 0 0 0 4px #ffff00 !important; }`), 'rest rule missing').toBe(true);
    expect(css.includes(`${B}:focus-visible { box-shadow: inset 0 0 0 4px #ffff00, 0 0 0 6px #000000, 0 0 0 10px #ffff00 !important; }`), 'focus rule missing').toBe(true);
  });

  it('hover out-ranks tool rules: green fill, black ink, and inner text patches go green too', () => {
    const H = '.theme-contrast [data-stem-tool-shell] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h)';
    expect(css.includes(`${H} { background-color: #00ff00 !important; background-image: none !important; color: #000000 !important; -webkit-text-fill-color: #000000 !important; }`), 'fill rule missing').toBe(true);
    expect(css.includes(`${H} * { color: #000000 !important; -webkit-text-fill-color: #000000 !important; }`), 'inner ink rule missing').toBe(true);
    expect(css.includes(`${H} *:not(:empty):not(svg, svg *, canvas, img, video) { background-color: #00ff00 !important; background-image: none !important; }`), 'inner patch rule missing, or it now repaints drawings').toBe(true);
    expect(css.includes('.leaflet-bar a:hover:not(#hc-h)'), 'map zoom links are not buttons and need their own rule').toBe(true);
  });

  it('never sets a fill or ink, which is what made black on black', () => {
    expect(blocks.length).toBe(3);
    for (const l of blocks) {
      const body = l.slice(l.indexOf('{', l.indexOf('@media') + 14));
      expect(body).not.toMatch(/background|[^-]color:/);
    }
  });
});
