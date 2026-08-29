import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle experiment trail', () => {
  it('keeps a bounded, identity-aware observation history', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var wcExperimentLog = Array.isArray(d.wcExperimentLog)');
      expect(source).toContain('d.wcExperimentLog.slice(-4)');
      expect(source).toContain('var wcExperimentKey = [');
      expect(source).toContain('return entry && entry.key === wcExperimentKey;');
      expect(source).toContain('var saveWcObservation = function()');
      expect(source).toContain('var nextLog = wcExperimentLog.concat([{');
      expect(source).toContain(".slice(-4);");
      expect(source).toContain("upd('wcExperimentLog', nextLog);");
      expect(source).toContain('snapshot: {');
      expect(source).toContain('baseline: wcScenarioBaseline ? Object.assign({}, wcScenarioBaseline) : null');
      expect(source).toContain('routeShares: wcRouteShares ? {');
      expect(source).toContain('runoff: wcRouteShares.runoff');
      expect(source).toContain('infiltration: wcRouteShares.infiltration');
      expect(source).toContain('plant: wcRouteShares.plant');
      expect(source).toContain('var replayWcObservation = function(entry)');
      expect(source).toContain('wcScenarioBaseline: replayBaseline');
    });
  });

  it('exposes accessible save and clear actions with compact trail summaries', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-prediction-reset wc-prediction-save"');
      expect(source).toContain('disabled: wcObservationSaved');
      expect(source).toContain('Save current observation to experiment trail');
      expect(source).toContain('className: "wc-experiment-log wc-focus-secondary"');
      expect(source).toContain('pathway-mix snapshots');
      expect(source).toContain('"aria-label": "Experiment trail"');
      expect(source).toContain('"aria-describedby": "wcExperimentTrailStatus"');
      expect(source).toContain('id: "wcExperimentTrailStatus"');
      expect(source).toContain('role: "status"');
      expect(source).toContain('"aria-atomic": "true"');
      expect(source).toContain('"aria-label": "Saved experiment observations"');
      expect(source).toContain('wcExperimentLog.length + "/4 observations saved"');
      expect(source).toContain('"aria-label": "Clear experiment trail"');
      expect(source).toContain('var clearWcExperimentLog = function()');
      expect(source).toContain('className: "wc-log-replay"');
      expect(source).toContain('className: "wc-experiment-log-replay-badge", "aria-hidden": "true"');
      expect(source).toContain('Replay saved observation:');
      expect(source).toContain('onClick: function() { replayWcObservation(entry); }');
      expect(source).toContain('var evidencePrediction = WATER_CYCLE_PREDICTIONS[entry.answer];');
      expect(source).toContain('className: "wc-log-entry-evidence"');
      expect(source).toContain('entry.matched ? "Evidence agrees" : "Evidence differs"');
      expect(source).toContain('" · Claim: " + prediction.shortLabel');
      expect(source).toContain('Claim: " + prediction.label');
      expect(
        source.includes('". Evidence " + (entry.matched ? "agrees with" : "differs from") + " the claim.') ||
        (source.includes('"The evidence agrees with the claim."') && source.includes('"The evidence differs from the claim."'))
      ).toBe(true);
      expect(
        source.includes('"Strongest modeled shift: " + evidenceLabel') ||
        source.includes('"Evidence supports: " + evidenceLabel')
      ).toBe(true);
      expect(source).not.toContain('Prediction matched the evidence.');
      expect(source).not.toContain('Prediction differed from the evidence.');
      expect(source).not.toContain('" · Hypothesis: " + prediction.shortLabel');
      expect(source).toContain('var routeShares = entry.routeShares || null;');
      expect(source).toContain('var routeMixAccessibility = hasRouteShares');
      expect(source).toContain('className: "wc-log-entry-route-mix"');
      expect(source).toContain('Path mix (relative): Runoff ');
    });
  });

  it('records qualitative deltas rather than presenting them as measured water volumes', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('evaporation: Number(wcEvaporationDelta.toFixed(2))');
      expect(source).toContain('runoff: wcRunoffDelta');
      expect(source).toContain('infiltration: wcInfiltrationDelta');
      expect(source).toContain('Qualitative teaching indices, not measured percentages or a forecast.');
    });
  });
});
