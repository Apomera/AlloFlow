import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Mercury's planet row carries `color: 'var(--allo-stem-text-soft, #94a3b8)'` so its
// chip can follow the theme. That is safe wherever the value is handed to CSS or SVG
// WHOLE, and broken anywhere a new string is built out of it:
//
//   'var(--allo-stem-text-soft, #94a3b8)' + 'cc'  ->  not a colour
//
// CSS drops the whole declaration, so the selected Mercury chip lost its background
// and rendered white text on nothing. Canvas is worse and splits two ways: fillStyle
// ignores a colour it cannot parse and silently keeps the previous one, while
// addColorStop THROWS - so picking Mercury in the Kepler lab took down the draw loop.
//
// getSolarPlanetAccent() exists for exactly this: it returns a hex built from the
// row's own rgb triple, which for Mercury is #94a3b8, the same colour the var falls
// back to. Every derived-string site has to go through it.
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

function planetRows(source) {
  const rows = [];
  const re = /key: '(\w+)'[^\n]*?color: ('[^']*'|"[^"]*")[^\n]*?rgb: \[([\d., ]+)\]/g;
  let m;
  while ((m = re.exec(source))) {
    rows.push({
      key: m[1],
      color: m[2].slice(1, -1),
      rgb: m[3].split(',').map((v) => Number(v.trim())),
    });
  }
  return rows;
}

function accentFn(source) {
  const start = source.indexOf('function getSolarPlanetAccent(planet) {');
  expect(start, 'getSolarPlanetAccent must exist').toBeGreaterThan(-1);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        // eslint-disable-next-line no-new-func
        return new Function(source.slice(start, i + 1) + '; return getSolarPlanetAccent;')();
      }
    }
  }
  throw new Error('unbalanced braces');
}

describe('themed planet colours never get concatenated into a new colour', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`gives every planet a plain hex accent (${path})`, () => {
      const rows = planetRows(source);
      expect(rows.length, 'planet rows must parse').toBeGreaterThanOrEqual(9);
      // At least one row really is themed, or this guard is guarding nothing.
      expect(rows.some((r) => r.color.startsWith('var(')), 'a themed row must exist').toBe(true);

      const accent = accentFn(source);
      for (const row of rows) {
        expect(accent(row), `${row.key} accent must be a plain hex`).toMatch(/^#[0-9a-f]{6}$/i);
      }
      // And the derived hex matches what the themed row falls back to.
      const mercury = rows.find((r) => r.key === 'Mercury');
      expect(mercury.color).toContain('#94a3b8');
      expect(accent(mercury).toLowerCase()).toBe('#94a3b8');
    });

    it(`builds no colour string out of a raw planet colour (${path})`, () => {
      // An alpha suffix on a value that may be `var(...)` is the whole failure mode.
      const suffixed = [...source.matchAll(/\bp\.color \+ ['"][0-9a-fA-F]{2}['"]/g)].map((m) => m[0]);
      expect(suffixed, `raw planet colour given an alpha suffix: ${suffixed.join(', ')}`).toEqual([]);
      // The three sites that used to do it now go through the accent helper.
      expect(source).toContain("getSolarPlanetAccent(p) + 'cc)'");
      expect(source).toContain("getSolarPlanetAccent(p) + '99,'");
      expect(source).toContain('color: getSolarPlanetAccent(p),');
    });

    it(`hands canvas only colours it can parse (${path})`, () => {
      // addColorStop throws on an unparseable colour, so the Kepler lab's gradient
      // must not be fed a raw row colour.
      const kepler = source.slice(source.indexOf('var BODY_DATA = {'));
      const bodyColour = kepler.match(/var bodyColor = ([^;]+);/);
      expect(bodyColour, 'the Kepler body colour must exist').not.toBeNull();
      const feeder = kepler.match(/BODY_DATA\[p\.name\] = \{[^}]*color: ([^,]+),/);
      expect(feeder, 'BODY_DATA must be populated from the planet rows').not.toBeNull();
      expect(feeder[1].trim()).toBe('getSolarPlanetAccent(p)');
    });
  }
});
