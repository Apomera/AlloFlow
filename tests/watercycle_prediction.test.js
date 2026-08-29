import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle prediction-and-evidence loop', () => {
  it('asks for a prediction before revealing comparison evidence', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var WATER_CYCLE_PREDICTIONS = {');
      expect(source).toContain("runoff: { label: 'More surface runoff'");
      expect(source).toContain("infiltration: { label: 'More underground movement'");
      expect(source).toContain("evaporation: { label: 'More evaporation'");
      expect(source).toContain("storage: { label: 'More snow or ice storage'");
      expect(source).toContain("mixed: { label: 'A mixed or small shift'");
      expect(source).toContain('className: "wc-prediction-strip" +');
      expect(source).toContain('"data-watercycle-evidence-interpretation": "true"');
      expect(source).toMatch(/"aria-label": "(?:Scenario evidence interpretation|Evidence interpretation check)"/);
      expect(source).toContain('"Read the evidence"');
      expect(source).toContain('"Make a prediction"');
      expect(source).toContain('Before reading the evidence, what will shift most?');
      expect(source).toContain('Choose one claim before the comparison is revealed. This is evidence-reading practice, not a score.');
      expect(source).toContain('onClick: function() { recordWcPrediction(predictionId); }');

      expect(source).toContain('wcScenarioBaseline && (!wcScenarioChanges.length || wcPrediction) && React.createElement("div", {');
      expect(source).toContain('className: "wc-compare-bars"');
      expect(source).toContain('"data-watercycle-evidence-interpretation": "true"');

      expect(source).not.toContain('"Predict first"');
      expect(source).not.toMatch(/Which (?:modeled )?pathway shows the strongest (?:modeled )?shift\?/);
      expect(source).not.toContain('"aria-label": "Prediction check"');
      expect(source).not.toContain('"aria-label": "Choose a predicted scenario shift"');
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
      expect(source).toContain('className: "wc-prediction-result-badge " + (wcPredictionMatched ? "is-agrees" : "is-differs")');
      expect(source).not.toContain('wcPredictionMatched ? "is-match" : "is-mismatch"');
    });
  });

  it('clears a stale claim when a learner changes or resets the scenario', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("wcScenarioPreset: 'custom', wcPrediction: ''");
      expect(source).toContain("var resetWcPrediction = function()");
      expect(source).toMatch(/"aria-label": "Choose a (?:different|new) evidence claim"/);
      expect(source).toContain('wcPrediction: \'\'');
      expect(source).toContain("updMulti({ wcScenarioBaseline: null, wcPrediction: '', wcReplayedObservation: '' });");
    });
  });

  it('records an interpretation without awarding points for agreement', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const handlerStart = source.indexOf('var recordWcPrediction = function(predictionId)');
      const handlerEnd = source.indexOf('var resetWcPrediction = function()', handlerStart);

      expect(handlerStart).toBeGreaterThan(-1);
      expect(handlerEnd).toBeGreaterThan(handlerStart);

      const recordHandler = source.slice(handlerStart, handlerEnd);
      expect(recordHandler).toContain("upd('wcPrediction', predictionId);");
      expect(recordHandler).toMatch(/Evidence claim (?:selected|recorded):/);
      expect(recordHandler).not.toMatch(/awardStemXP|awardXP|researchPoints|completedChallenges|celebrate|addToast/);
      expect(source).toContain('evidence-reading practice, not a score.');
    });
  });
});
