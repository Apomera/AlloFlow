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
      expect(source.includes('d.wcExperimentLog.slice(-4)')).toBe(false);
      expect(source.includes('var wcExperimentKey = WCExploreNotebook.identity(wcScenarioBaseline, wcCurrentSnapshot);')).toBe(true);
      expect(source.includes('WCExploreNotebook.identity(entry.baseline, entry.snapshot) === wcExperimentKey')).toBe(true);
      expect(source).toContain('var saveWcObservation = function()');
      expect(source.includes('var nextLog = WCExploreNotebook.append(wcExperimentLog, {')).toBe(true);
      expect(source.includes("if (nextLog.status !== 'saved') return;")).toBe(true);
      expect(source.includes('wcExperimentLog: nextLog.entries')).toBe(true);
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
      expect(source).toContain('Save observation to experiment trail');
      expect(source).toContain('className: "wc-experiment-log wc-focus-secondary"');
      expect(source).toContain('pathway-mix snapshots');
      expect(source).toContain(`"aria-labelledby": "wcExperimentNotebookTitle"`);
      expect(source).toContain('"aria-describedby": "wcExperimentTrailStatus"');
      expect(source).toContain('id: "wcExperimentTrailStatus"');
      expect(source).toContain('role: "status"');
      expect(source).toContain('"aria-atomic": "true"');
      expect(source).toContain(`"aria-label": __alloT('stem.watercycle.a11y_saved_experiment_observations', 'Saved experiment observations')`);
      expect(source).toContain('wcExperimentLog.length + "/4 observations saved"');
      expect(source).toContain(`"aria-label": __alloT('stem.watercycle.inquiry_clear_trail_name', 'Clear trail: remove saved observations')`);
      expect(source).toContain('var clearWcExperimentLog = function()');
      expect(source).toContain('className: "wc-log-replay"');
      expect(source).toContain('className: "wc-experiment-log-replay-badge", "aria-hidden": "true"');
      expect(source).toContain(`"aria-label": __alloT('stem.watercycle.inquiry_replay_settings', 'Replay settings') + ": "`);
      expect(source).toContain('onClick: function() { replayWcObservation(entry); focusWcComparisonTarget(entry.baseline ? "wcFairTestHeading" : "wcSetScenarioBaseline"); }');
      expect(source).toContain('var evidenceLabel = WCExploreNotebook.evidenceLabel(entry);');
      expect(source).toContain('className: "wc-log-entry-evidence"');
      expect(source).toContain('entry.matched === true ?');
      expect(source).toContain('className: "wc-notebook-recorded-claim"');
      expect(source.includes('Claim: " + recordedClaimLabel')).toBe(true);
      expect(source).toContain('entry.matched === false ?');
      expect(source).toContain('Claim check not recorded');
      expect(source).toContain('". " + recordedStatus + ". Claim: " + recordedClaimLabel');
      expect(source).toContain('Evidence summary: ');
      expect(source).not.toContain('Prediction matched the evidence.');
      expect(source).not.toContain('Prediction differed from the evidence.');
      expect(source).not.toContain('" · Hypothesis: " + prediction.shortLabel');
      expect(source).toContain('var routeShares = entry.routeShares || null;');
      expect(source).toContain('var hasRouteShares = routeShares');
      expect(source).toContain('className: "wc-log-entry-route-mix"');
      expect(source).toContain('Saved pathway mix: Runoff ');
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
