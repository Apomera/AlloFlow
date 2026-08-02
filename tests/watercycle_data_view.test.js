import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle semantic Data view', () => {
  it('provides a collapsed, labeled text alternative to the canvas', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-data-view wc-focus-secondary"');
      expect(source).toContain('role: "region"');
      expect(source).toContain('"aria-label": "Text data view of the Water Cycle model"');
      expect(source).toContain('className: "wc-data-summary"');
      expect(source).toContain('Text alternative to the canvas');
      expect(source).toContain('className: "wc-data-table"');
      expect(source).toContain('"aria-label": "Current Water Cycle model data"');
      expect(source).toContain('className: "sr-only" }, "Current Water Cycle model data"');
    });
  });

  it('exposes the current process, climate, land, scenario, and journey context', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"Current process"');
      expect(source).toContain('"Climate"');
      expect(source).toContain('"Land routing"');
      expect(source).toContain('"Pathway mix"');
      expect(source).toContain('className: "wc-data-route-mix"');
      expect(source).toContain('wcRouteShares.runoff');
      expect(source).toContain('wcBaselineRouteShares.runoff');
      expect(source).toContain('"Land setting"');
      expect(source).toContain('"Scenario"');
      expect(source).toContain('"Journey"');
      expect(source).toContain('"Prediction and evidence"');
      expect(source).toContain('"Experiment trail"');
      expect(source).toContain('var wcDataEvidenceStatus = wcPrediction');
      expect(source).toContain('var wcDataTrailStatus = wcReplayedObservation');
      expect(source).toContain('wcDataEvidenceStatus');
      expect(source).toContain('className: "wc-data-evidence-status"');
      expect(source).toContain('className: "wc-data-trail-status"');
      expect(source).toContain('var wcDataTrailStatus = wcReplayedObservation');
      expect(source).toContain('Replay active; ');
      expect(source).toContain('scope: "row"');
      expect(source).toContain('currentStageCue || "The selected process is highlighted in the model."');
      expect(source).toContain('var journeyDataContext = journeyChosenRoute');
      expect(source).toContain('journeyDataContext)');
    });
  });

  it('keeps model outputs explicitly qualitative in the text view', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('Qualitative teaching indices, not measured percentages or a forecast.');
      expect(source).toContain('data-wc-focus-secondary');
    });
  });
  it('announces the current model state as a live summary', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var wcDataViewStatus = currentStageLabel +');
      expect(source).toContain('id: "wcDataViewStatus"');
      expect(source).toContain('"aria-describedby": "wcDataViewStatus"');
      expect(source).toContain('role: "status"');
      expect(source).toContain('"aria-live": "polite"');
      expect(source).toContain('"aria-atomic": "true"');
      expect(source).toContain("Relative teaching shares: runoff ' + wcRouteShares.runoff");
      expect(source).toContain('Text alternative to the canvas; values update live');
    });
  });
});
