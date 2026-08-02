import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle semantic route context', () => {
  it('carries the selected path evidence into the canvas text alternative', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var journeyDataContext = journeyChosenRoute');
      expect(source).toContain("journeyChosenRoute.signalLabel + ': ' + journeyChosenRoute.signalValue + '/100. Relative route share: '");
      expect(source).toContain('journeyChosenRoute ? journeyChosenRoute.label + " selected" : journeyStatusLabel');
      expect(source).toContain('journeyDataContext)');
    });
  });

  it('describes the pending route decision without overstating the teaching model', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("'Choose a land pathway. Runoff tendency: '");
      expect(source).toContain('These are qualitative teaching indices, not measured volumes.');
      expect(source).toContain('journeyView === \'3d\' ? \'3D tracked parcel\' : \'2D animated model\'');
      expect(source).toContain("Relative route shares: runoff ' + wcRouteShares.runoff");
      expect(source).toContain("percent; infiltration ' + wcRouteShares.infiltration");
      expect(source).toContain("percent; plant ' + wcRouteShares.plant");
      expect(source).toContain("Strongest modeled pathway: ' + wcRouteLeaderLabel");
      expect(source).toContain('The modeled signals are tied; compare the paths.');
    });
  });
});
