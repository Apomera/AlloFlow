import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle experiment baseline discovery', () => {
  it('captures the pre-change state before direct climate or land edits', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var wcInteractionBaselineCaptured = !!d.wcScenarioBaseline;');
      expect(source).toContain('if (d.wcScenarioBaseline || wcInteractionBaselineCaptured) return null;');
      expect(source).toContain('var getWcInteractionBaseline = function()');
      expect(source).toContain('nextState.wcScenarioBaseline = interactionBaseline;');
      expect(source).toContain('nextData.wcScenarioBaseline = interactionBaseline;');
    });
  });

  it('explains the new baseline and points learners toward evidence', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('Experiment baseline saved before this change. Choose a prediction, then use the comparison values as evidence.');
      expect(source).toContain('Before reading the evidence, what will shift most?');
    });
  });
});
