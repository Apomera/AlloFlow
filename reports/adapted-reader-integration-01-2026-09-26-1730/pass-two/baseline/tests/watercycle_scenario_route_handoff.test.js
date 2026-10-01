import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle scenario-to-route handoff', () => {
  it('connects changed scenario evidence to the Journey land decision', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('wcScenarioBaseline && wcScenarioChanges.length && React.createElement("p"');
      expect(source).toContain('className: "wc-route-scenario-note"');
      expect(source).toContain('className: "wc-viewport-scenario-note"');
      expect(source).toContain('wcScenarioHeadline + " Compare the route shares before choosing."');
      expect(source).toContain('var wcBaselineRouteShares = wcScenarioBaseline');
      expect(source).toContain('var wcRouteBaselineActive = !!(wcBaselineRouteShares && wcScenarioChanges.length);');
      expect(source).toContain('className: "wc-route-baseline-note"');
      expect(source).toContain('className: "wc-route-share-baseline-marker"');
      expect(source).toContain('var wcJourneyPredictionReceipt = wcPrediction');
      expect(source).toContain("' Prediction receipt: ' + wcDataEvidenceStatus");
      expect(source).toContain('wcScenarioHeadline + " Compare the route shares before choosing." + wcJourneyPredictionReceipt');
      expect(source).toContain('@media(forced-colors:active){.wc-route-scenario-note');
      expect(source).toContain('.wc-viewport-choice .wc-viewport-scenario-note');
    });
  });

  it('keeps the scenario note alongside relative route evidence', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-2d-route-note"');
      expect(source).toContain('className: "wc-route-choice-signal"');
      expect(source).toContain('Relative route share " + wcRouteShares.runoff + " percent.');
      expect(source).toContain('Strongest modeled signal: " + wcRouteLeaderLabel');
      expect(source).toContain('wcRouteShareDeltaCopy');
      expect(source).toContain('Saved baseline markers show each route');
      expect(source).toContain('.wc-viewport-choice{bottom:128px;width:calc(100% - 14px);padding:10px}');
      expect(source).toContain('.wc-viewport-choice-grid{grid-template-columns:1fr}');
    });
  });

  it('keeps source and public mirrors identical', () => {
    expect(readFileSync(WATER_CYCLE_PATHS[0], 'utf8')).toBe(readFileSync(WATER_CYCLE_PATHS[1], 'utf8'));
  });
});
