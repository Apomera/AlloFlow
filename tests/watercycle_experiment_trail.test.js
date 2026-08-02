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
      expect(source).toContain('"aria-label": "Experiment trail"');
      expect(source).toContain('"aria-label": "Saved experiment observations"');
      expect(source).toContain('wcExperimentLog.length + "/4 observations saved"');
      expect(source).toContain('"aria-label": "Clear experiment trail"');
      expect(source).toContain('var clearWcExperimentLog = function()');
      expect(source).toContain('className: "wc-log-replay"');
      expect(source).toContain('Replay saved observation:');
      expect(source).toContain('onClick: function() { replayWcObservation(entry); }');
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
