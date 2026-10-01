// Guards wcReadableInk, the helper that makes DATA-DRIVEN colours readable.
//
// WHY THIS EXISTS
// Stage and watershed-component colours are identity hues that are also used as
// TEXT. Measured with axe on the real rendered page, that shipped as: the light
// transpiration chip at 2.02:1, collection 2.42, precipitation 3.18; and on the
// dark card riverMainstem 2.66, suburbanEdges 3.13, forestBuffer 3.56,
// agriculturalWatershed 3.63. Nine render sites now route through this one
// helper, so a regression here silently un-fixes all of them at once.
//
// ★THE CONTRAST GATE CANNOT COVER THIS. dev-tools/scan_theme_contrast.cjs reads
// hex LITERALS in style objects; here the ink is a variable, so the gate skips
// it by construction. This file is the cover for that blind spot, which is why
// it asserts on the REAL palette values rather than invented ones.
//
// Uses source-literal extraction, not loadTool: evaluating this 1.1 MB tool
// takes ~45s and blows vitest's hook timeout (see watercycle_2d_visual_refinement).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

// The real palettes, copied from the tool. If either drifts, the ratio
// assertions below start measuring a colour the tool no longer uses -- so the
// first test pins that these values are still present in the source.
const STAGE_COLORS = {
  evaporation: '#f59e0b',
  condensation: '#64748b',
  precipitation: '#3b82f6',
  collection: '#0ea5e9',
  transpiration: '#22c55e',
  infiltration: '#92400e',
};
const COMPONENT_COLORS = {
  headwaterStreams: '#0ea5e9',
  riverMainstem: '#1d4ed8',
  floodplainWetlands: '#16a34a',
  forestBuffer: '#15803d',
  agriculturalWatershed: '#a16207',
  suburbanEdges: '#7c3aed',
};

const DARK_CARD = '#0f172a';

function extractInk(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const start = source.indexOf('function wcReadableInk');
  expect(start, `wcReadableInk missing from ${filePath}`).toBeGreaterThanOrEqual(0);
  // Walk braces to the end of the function.
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  expect(end, 'unterminated wcReadableInk').toBeGreaterThan(bodyStart);
  const fnSrc = source.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(`${fnSrc}; return wcReadableInk;`)();
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    })
    .reduce((acc, v, i) => acc + [0.2126, 0.7152, 0.0722][i] * v, 0);
}

function ratio(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// The chip tints its ground with its OWN hue: '25' (~14.5%) over the dark panel,
// '15' (~8.2%) over the white card. Mirrors the computation in the tool.
function chipGround(hex, isDark) {
  const n = parseInt(hex.slice(1), 16);
  const a = isDark ? 0.145 : 0.082;
  const base = isDark ? [15, 23, 42] : [255, 255, 255];
  const mixed = [
    a * ((n >> 16) & 255) + (1 - a) * base[0],
    a * ((n >> 8) & 255) + (1 - a) * base[1],
    a * (n & 255) + (1 - a) * base[2],
  ];
  return '#' + mixed.map((v) => ('0' + Math.round(v).toString(16)).slice(-2)).join('');
}

describe.each(WATER_CYCLE_PATHS)('wcReadableInk in %s', (filePath) => {
  const ink = extractInk(filePath);

  it('still uses the palette values these assertions measure', () => {
    const source = readFileSync(filePath, 'utf8');
    Object.values(STAGE_COLORS).forEach((c) => expect(source).toContain(c));
    Object.values(COMPONENT_COLORS).forEach((c) => expect(source).toContain(c));
  });

  it('leaves a colour that already passes completely untouched', () => {
    // Light mode must not shift at all -- proven by pixel diff when shipped.
    expect(ink('#0f172a', '#ffffff')).toBe('#0f172a');
    expect(ink('#f8fafc', DARK_CARD)).toBe('#f8fafc');
    // evaporation amber already clears on the dark card
    expect(ink('#f59e0b', DARK_CARD)).toBe('#f59e0b');
  });

  it('LIGHTENS on a dark ground and DARKENS on a light one', () => {
    // The first version only ever lightened, which is useless for the light
    // chips, where the ground is a pale tint of the hue itself.
    const onDark = ink('#1d4ed8', DARK_CARD);
    const onLight = ink('#22c55e', '#e2f6f2');
    expect(luminance(onDark)).toBeGreaterThan(luminance('#1d4ed8'));
    expect(luminance(onLight)).toBeLessThan(luminance('#22c55e'));
  });

  it('every watershed component name clears 4.5:1 on the dark card', () => {
    Object.entries(COMPONENT_COLORS).forEach(([name, hex]) => {
      const r = ratio(ink(hex, DARK_CARD), DARK_CARD);
      expect(r, `${name} (${hex}) -> ${ink(hex, DARK_CARD)} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('every stage chip clears its own tinted ground in BOTH themes', () => {
    [true, false].forEach((isDark) => {
      Object.entries(STAGE_COLORS).forEach(([name, hex]) => {
        const ground = chipGround(hex, isDark);
        // The tool asks for 5.2 so estimation error in the computed ground
        // cannot drop the rendered value below 4.5 (it left two chips at
        // 4.45 / 4.28 on a 4.5 target).
        const got = ink(hex, ground, 5.2);
        const r = ratio(got, ground);
        expect(r, `${name} ${isDark ? 'dark' : 'light'} (${hex} on ${ground}) = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('degrades safely on input it cannot parse', () => {
    // Called with whatever a stage/component record holds, so it must never
    // throw or emit an invalid colour.
    expect(ink(undefined, DARK_CARD)).toBe(undefined);
    expect(ink('var(--allo-stem-text)', DARK_CARD)).toBe('var(--allo-stem-text)');
    expect(ink('#abc', DARK_CARD)).toBe('#abc');
    expect(ink('#0f172a', DARK_CARD)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
