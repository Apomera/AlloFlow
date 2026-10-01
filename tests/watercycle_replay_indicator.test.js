import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle replay handoff', () => {
  it('stores the replayed observation label and clears it when branching', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("var wcReplayedObservation = d.wcReplayedObservation || '';" );
      expect(source).toContain("wcReplayedObservation: entry.label || 'Custom controls'");
      expect(source).toContain("wcScenarioPreset: 'custom', wcPrediction: '', wcReplayedObservation: ''");
      const clearTrailStart = source.indexOf('var clearWcExperimentLog = function()');
      const clearTrailEnd = source.indexOf('var removeWcObservation = function(', clearTrailStart);
      const clearTrailSource = source.slice(clearTrailStart, clearTrailEnd);
      expect(clearTrailSource).toMatch(/\bwcExperimentLog\s*:\s*\[\s*\]/);
      expect(clearTrailSource).toMatch(/\bwcReplayedObservation\s*:\s*(['"])\1/);
    });
  });

  it('makes replay state visible and discoverable to assistive technology', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('is-replaying');
      expect(source).toContain('wc-experiment-log-replay-badge');
      expect(source).toContain('className: "wc-experiment-log-replay-badge", "aria-hidden": "true"');
      expect(source).toContain('Settings replayed: " + wcReplayedObservation');
      expect(source).toContain('Settings replayed');
      expect(source).toContain('Adjust a condition to start a new comparison.');
    });
  });
});
