import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle scenario-to-route handoff', () => {
  it('connects changed scenario evidence to the Journey land decision', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('wcScenarioBaseline && wcScenarioChanges.length && React.createElement("p"');
      expect(source).toContain('className: "wc-route-scenario-note"');
      expect(source).toContain('wcScenarioHeadline + " Compare the route shares before choosing."');
      expect(source).toContain('@media(forced-colors:active){.wc-route-scenario-note');
    });
  });

  it('keeps the scenario note alongside relative route evidence', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-2d-route-note"');
      expect(source).toContain('className: "wc-route-choice-signal"');
      expect(source).toContain('Relative route share " + wcRouteShares.runoff + " percent.');
      expect(source).toContain('Strongest modeled signal: " + wcRouteLeaderLabel');
    });
  });

  it('keeps source and public mirrors identical', () => {
    expect(readFileSync(WATER_CYCLE_PATHS[0], 'utf8')).toBe(readFileSync(WATER_CYCLE_PATHS[1], 'utf8'));
  });
});
