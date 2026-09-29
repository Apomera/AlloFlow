import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle prediction-and-evidence loop', () => {
  it('offers an evidence claim alongside a visible, independently scaled comparison', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var WATER_CYCLE_PREDICTIONS = {');
      expect(source).toContain("runoff: { label: 'More surface runoff'");
      expect(source).toContain("infiltration: { label: 'More underground movement'");
      expect(source).toContain("evaporation: { label: 'Evaporation changes'");
      expect(source).toContain("storage: { label: 'Temperature crosses below 0°C'");
      expect(source).toContain("mixed: { label: 'A small modeled shift'");
      expect(source).toContain('className: "wc-prediction-strip" +');
      expect(source).toContain('"data-watercycle-evidence-interpretation": "true"');
      expect(source).toMatch(/"aria-label": __alloT\('stem\.watercycle\.a11y_(?:scenario_evidence_interpretation|evidence_interpretation_check)', '(?:Scenario evidence interpretation|Evidence interpretation check)'\)/);
      expect(source).toContain('"Read the evidence"');
      expect(source).toContain('Choose a claim');
      expect(source).toContain('Which effect will you investigate?');
      expect(source).toContain('Choose a claim and check the signed changes. Several effects can change together. This is evidence-reading practice, not a score.');
      expect(source).toContain('onClick: function() { recordWcPrediction(predictionId); }');

      expect(source.includes('wcScenarioBaseline && (!wcScenarioChanges.length || wcPrediction) && React.createElement("div", {')).toBe(false);
      expect(source).toContain('className: "wc-compare-bars"');
      expect(source).toContain('"data-watercycle-evidence-interpretation": "true"');

      expect(source).not.toContain('"Predict first"');
      expect(source).not.toMatch(/Which (?:modeled )?pathway shows the strongest (?:modeled )?shift\?/);
      expect(source).not.toContain(`"aria-label": __alloT('stem.watercycle.a11y_prediction_check', 'Prediction check')`);
      expect(source).not.toContain(`"aria-label": __alloT('stem.watercycle.a11y_choose_a_predicted_scenario_shift', 'Choose a predicted scenario shift')`);
    });
  });

  it('classifies evidence from the existing scenario deltas instead of inventing a water budget', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function classifyWcScenarioShift()');
      expect(source).toContain('var wcEvidenceClaims = Object.keys(WATER_CYCLE_PREDICTIONS).filter');
      expect(source).toContain('WCExploreNotebook.evaluateClaim(id, wcComparisonDeltas, wcScenarioBaseline, wcCurrentSnapshot)');
      expect(source).toContain('var wcPredictionMatched = null;');
      expect(source).toContain('wcPredictionMatched = WCExploreNotebook.evaluateClaim(wcPrediction, wcComparisonDeltas, wcScenarioBaseline, wcCurrentSnapshot);');
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
      expect(source).toMatch(/"aria-label": __alloT\('stem\.watercycle\.a11y_choose_a_(?:different|new)_evidence_claim', 'Choose a (?:different|new) evidence claim'\)/);
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
