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
      expect(source).toContain('"aria-describedby": "wcScenarioWorkflowStatus"');
      expect(source).toContain('id: "wcScenarioWorkflowStatus"');
      expect(source).toContain('className: "wc-compare-method"');
      expect(source).toContain('role: "status"');
      expect(source).toContain('"aria-atomic": "true"');
      expect(source).toContain('Experiment steps');
      expect(source).toContain('Comparison ready: record a prediction before reading the evidence.');
      expect(source).toContain('Prediction recorded: compare the bars and pathway mix as evidence, then save the observation.');
      expect(source).toContain('className: "wc-compare-bar-card"');
      expect(source).toContain('"aria-label": "Evaporation baseline " + wcBaselineEvaporationIndex.toFixed(2)');
      expect(source).toContain('"aria-label": "Runoff baseline " + wcBaselineLandIndices.runoff');
      expect(source).toContain('"aria-label": "Infiltration baseline " + wcBaselineLandIndices.infiltration');
      expect(source).toContain('className: "wc-compare-bar-base"');
      expect(source).toContain('className: "wc-compare-bar-current"');
      expect(source).toContain('className: "wc-route-mix"');
      expect(source).toContain('"aria-label": "Baseline and current pathway mix"');
      expect(source).toContain('renderWcRouteMixBar("Base", wcBaselineRouteShares)');
      expect(source).toContain('renderWcRouteMixBar("Now", wcRouteShares)');
      expect(source).toContain('is-prediction-evidence');
      expect(source).toContain('Prediction evidence to check');
      expect(source).toContain('wcPredictionEvidenceMetrics.indexOf("evaporation")');
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
      expect(source).toContain('role: "img"');
      expect(source).toContain('className: "wc-route-mix-segment is-runoff"');
      expect(source).toContain('className: "wc-route-mix-segment is-infiltrate"');
      expect(source).toContain('className: "wc-route-mix-segment is-plant"');
      expect(source).toContain('Relative teaching shares, not water volumes');
      expect(source).toContain('formatWcDelta(delta, " pts", 0)');
      expect(source).toContain('.wc-compare-method{grid-column:1/-1');
      expect(source).toContain('@media(forced-colors:active){.wc-compare-method');
    });
  });
});
