import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle Journey completion receipt', () => {
  it('preserves the last selected land path through the completion transition', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('journeyLastPath: pathKey');
      expect(source).toContain("nextWaterCycle.journeyLastPath = pathKey;");
      expect(source).toContain("d.journeyState === 'complete' ? d.journeyLastPath : ''");
      expect(source).toContain("var journeyChoiceKicker = d.journeyState === 'complete' ? 'Cycle receipt' : 'Path chosen';");
      expect(source).toContain("'This route returned the droplet to the ocean. ' + journeyChosenRoute.pace + '. Driver: ' + journeyChosenRoute.driver + '. Return path: ' + journeyChosenRoute.returnPath + '.'");
    });
  });

  it('makes the completed route visible and clears it when a new run begins', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-journey-choice-receipt" + (d.journeyState === \'complete\' ? " is-complete" : "")');
      expect(source).toContain('.wc-journey-choice-receipt.is-complete{');
      expect(source).toContain("journeyLastPath: ''");
      expect(source).toContain("upd('journeyLastPath', '');");
      expect(source).toContain('Start Another Loop');
    });
  });
  it('records the loop and reward when the journey actually completes', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("if (nextState === 'complete' && current.journeyState !== 'complete')");
      expect(source).toContain("nextWaterCycle.journeyLoops = (current.journeyLoops || 0) + 1;");
      expect(source).toContain("awardStemXP('waterCycle', 25, 'Water Cycle journey loop');");
      expect(source).toContain('Loop " + (d.journeyLoops || 1) + " recorded');
      expect(source).toContain("Starting another loop. You are now a water droplet in the ocean.");
      expect(source).not.toContain("upd('journeyLoops', (d.journeyLoops || 0) + 1);");
    });
  });
});
