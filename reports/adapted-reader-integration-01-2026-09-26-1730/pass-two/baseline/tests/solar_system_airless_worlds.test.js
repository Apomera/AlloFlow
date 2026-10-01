import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Mercury's atmosphere entry reads "Virtually none — exosphere of O2, Na, H2, He".
// Three separate places tested it with `=== 'Virtually none'` or `!== 'Virtually
// none'`, so the equality never matched and the most airless planet in the solar
// system was drawn with an atmospheric halo on its card, a glow in the 3D scene,
// and dust haze on its horizon in the surface view.
//
// The fix is one predicate, solarHasAtmosphere(), matching the WORD. This guard
// keeps the string-equality form from coming back, and pins the predicate's
// behaviour on the exact wordings shipped in the planet table — including the one
// that must NOT read as airless: Jupiter's "no solid surface", where "no" is not
// "none".
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

function extractPredicate(source) {
  const start = source.indexOf('function solarHasAtmosphere(planet)');
  expect(start, 'solarHasAtmosphere must exist').toBeGreaterThan(-1);
  const end = source.indexOf('\n          }', start);
  const body = source.slice(start, end + '\n          }'.length);
  // eslint-disable-next-line no-eval
  return eval('(' + body + ')');
}

describe('airless worlds are never given an atmosphere', () => {
  for (const path of PATHS) {
    it(`decides atmosphere by word, not string equality (${path})`, () => {
      const source = readFileSync(path, 'utf8');

      // The brittle form must not reappear anywhere in the tool.
      expect(source).not.toMatch(/atmosphere\s*[!=]==\s*'Virtually none'/);

      const hasAtmosphere = extractPredicate(source);
      const cases = [
        ['Mercury', 'Virtually none — exosphere of O₂, Na, H₂, He', 'cratered', false],
        ['Venus', '96.5% CO₂ — crushingly thick (90x Earth pressure)', 'volcanic', true],
        ['Earth', '78% N₂, 21% O₂ — the only breathable atmosphere', 'earthlike', true],
        ['Mars', '95% CO₂ — thin (0.6% of Earth pressure)', 'desert', true],
        // "no solid surface" must not be read as "no atmosphere".
        ['Jupiter', '90% H₂, 10% He — no solid surface', 'gasgiant', true],
        ['Pluto', 'Thin N₂ — freezes and falls as snow', 'iceworld', true],
      ];
      for (const [key, atmosphere, terrainType, expected] of cases) {
        expect(
          hasAtmosphere({ key, atmosphere, terrainType }),
          `${key} ("${atmosphere}") should ${expected ? '' : 'not '}count as having an atmosphere`,
        ).toBe(expected);
      }
    });
  }
});
