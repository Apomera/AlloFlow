import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle prediction-and-evidence loop', () => {
  it('offers a compact hypothesis choice before showing the evidence result', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var WATER_CYCLE_PREDICTIONS = {');
      expect(source).toContain("runoff: { label: 'More surface runoff'");
      expect(source).toContain("infiltration: { label: 'More underground movement'");
      expect(source).toContain("evaporation: { label: 'More evaporation'");
      expect(source).toContain("storage: { label: 'More snow or ice storage'");
      expect(source).toContain("mixed: { label: 'A mixed or small shift'");
      expect(source).toContain('className: "wc-prediction-strip" +');
      expect(source).toContain('"aria-label": "Prediction check"');
      expect(source).toContain('"aria-label": "Choose a predicted scenario shift"');
      expect(source).toContain('onClick: function() { recordWcPrediction(predictionId); }');
    });
  });

  it('classifies evidence from the existing scenario deltas instead of inventing a water budget', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function classifyWcScenarioShift()');
      expect(source).toContain("if (wcRunoffDelta >= 8 && wcInfiltrationDelta <= -8) return 'runoff';");
      expect(source).toContain("if (wcInfiltrationDelta >= 8 && wcRunoffDelta <= -8) return 'infiltration';");
      expect(source).toContain("if (wcEvaporationDelta >= 0.15 || wcEvaporationDelta <= -0.15) return 'evaporation';");
      expect(source).toContain("if (currentTemp < 0) return 'storage';");
      expect(source).toContain('var wcPredictionMatched = null;');
      expect(source).toContain('wcPredictionMatched = wcPrediction === wcPredictionAnswer;');
      expect(source).toContain('var wcPredictionEvidence = \'\';');
      expect(source).toContain('var wcPredictionEvidenceMetrics = [];');
      expect(source).toContain('Evidence to check: runoff ');
      expect(source).toContain('className: "wc-prediction-evidence"');
    });
  });

  it('clears a stale hypothesis when a learner changes or resets the scenario', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("wcScenarioPreset: 'custom', wcPrediction: ''");
      expect(source).toContain("var resetWcPrediction = function()");
      expect(source).toContain('"aria-label": "Make a new scenario prediction"');
      expect(source).toContain('wcPrediction: \'\'');
      expect(source).toContain("updMulti({ wcScenarioBaseline: null, wcPrediction: '', wcReplayedObservation: '' });");
    });
  });
});
