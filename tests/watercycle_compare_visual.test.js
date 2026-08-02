import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle visual Scenario Compare', () => {
  it('renders labeled baseline/current bars for all three comparison metrics', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-compare-bars"');
      expect(source).toContain('"aria-label": "Visual comparison of baseline and current values"');
      expect(source).toContain('className: "wc-compare-bar-card"');
      expect(source).toContain('"aria-label": "Evaporation baseline " + wcBaselineEvaporationIndex.toFixed(2)');
      expect(source).toContain('"aria-label": "Runoff baseline " + wcBaselineLandIndices.runoff');
      expect(source).toContain('"aria-label": "Infiltration baseline " + wcBaselineLandIndices.infiltration');
      expect(source).toContain('className: "wc-compare-bar-base"');
      expect(source).toContain('className: "wc-compare-bar-current"');
    });
  });

  it('keeps each bar on the existing metric scale and labels the endpoints in text', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"0-2x"');
      expect(source).toContain('"0-100"');
      expect(source).toContain('"Base " + wcBaselineEvaporationIndex.toFixed(2) + "x"');
      expect(source).toContain('"Now " + evaporationIndex.toFixed(2) + "x"');
      expect(source).toContain('"Base " + wcBaselineLandIndices.runoff + "/100"');
      expect(source).toContain('"Now " + runoffTendency + "/100"');
      expect(source).toContain('"Base " + wcBaselineLandIndices.infiltration + "/100"');
      expect(source).toContain('"Now " + infiltrationOpportunity + "/100"');
      expect(source).toContain('(wcBaselineEvaporationIndex / 2) * 100');
      expect(source).toContain('className: "wc-compare-bar-delta "');
      expect(source).toContain('formatWcDelta(wcEvaporationDelta, "x", 2)');
      expect(source).toContain('formatWcDelta(wcRunoffDelta, " pts", 0)');
      expect(source).toContain('formatWcDelta(wcInfiltrationDelta, " pts", 0)');
      expect(source).toContain('"is-up"');
      expect(source).toContain('"is-down"');
    });
  });
});
