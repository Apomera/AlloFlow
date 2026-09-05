import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('water cycle teaching-model boundaries', () => {
  it('does not present qualitative climate controls as measurements or forecasts', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"TEACHING MODEL"');
      expect(source).toContain('"Evaporation index: "');
      expect(source).toContain('"Evaporation index: " + evaporationIndex.toFixed(2) + "x"');
      expect(source).toContain('var evapRate = evaporationIndex;');
      expect(source).not.toContain('var evapRate = Math.max(0.2');
      expect(source).toContain('var landResponse = wcLandResponse(d);');
      expect(source).toContain('var runoffTendency = landResponse.runoff;');
      expect(source).toContain('var infiltrationOpportunity = landResponse.infiltration;');
      expect(source).toContain('Groundwater recharge remains unresolved.');
      expect(source).not.toContain("var runoffPct = 'Needs land data';");
      expect(source).not.toContain("var gwRecharge = 'Not resolved';");
      expect(source).toContain('Relative teaching indices, not measurements or a forecast.');
      expect(source).toContain('the vertical temperature profile matters');
      expect(source).toContain('Infiltration does not automatically become groundwater recharge.');
      // The invariant is the HEDGE — infiltration must not be presented as
      // guaranteed recharge. Pinned as wording rather than as an exact source
      // line, because the definition now lives inside a t() call for
      // translation and its indentation/quoting is no longer fixed.
      expect(source).toContain('some infiltrated water can contribute to groundwater recharge.');
      expect(source).toContain("Forest and permeable ground");
      expect(source).toContain('Infiltration does not guarantee recharge.');
      expect(source).not.toContain("forest_recharge: { label: 'Forest recharge'");
      expect(source).not.toContain('"Water Budget (Live)"');
      expect(source).not.toContain('"\\u26A1 Thunderstorm"');
      expect(source).not.toContain('var runoffPct = Math.min(95');
      expect(source).not.toContain('var gwRecharge = Math.max(0, 100 - runoffPct)');
    });
  });

  it('keeps advanced claims qualified', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('Saturation vapor pressure rises as air warms.');
      expect(source).toContain('Actual atmospheric moisture also depends on relative humidity and circulation.');
      expect(source).toContain('Its share varies with ecosystem, season, soil moisture, and weather.');
      expect(source).toContain('Outcomes are hand-authored teaching indices');
      expect(source).not.toContain('Plants pump roughly 10% of all atmospheric moisture');
      expect(source).not.toContain('a single oak moves about 150,000 liters per year');
    });
  });
});
