import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle selected-path evidence receipt', () => {
  it('maps each completed land choice to its modeled signal and relative route share', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("var journeyRouteKeyByState = { river_runoff: 'runoff', infiltrating: 'infiltrate', plant_absorb: 'plant' };");
      expect(source).toContain("signalLabel: 'Runoff tendency'");
      expect(source).toContain("signalLabel: 'Infiltration opportunity'");
      expect(source).toContain("signalLabel: 'Relative route share'");
      expect(source).toContain('relativeShare: wcRouteShares.runoff');
      expect(source).toContain('relativeShare: wcRouteShares.infiltration');
      expect(source).toContain('relativeShare: wcRouteShares.plant');
    });
  });

  it('keeps the selected path visible, responsive, and accessible after the choice', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-journey-choice-receipt"');
      expect(source).toContain('role: "region"');
      expect(source).toContain('"aria-label": "Selected journey path evidence"');
      expect(source).toContain('className: "wc-journey-choice-receipt-kicker"');
      expect(source).toContain('className: "wc-journey-choice-track"');
      expect(source).toContain('relative route share: " + journeyChosenRoute.relativeShare + " percent');
      expect(source).toContain('Plants can take up water and return some vapor through transpiration; this is not a measured uptake rate.');
      expect(source).toContain('@media(max-width:460px){.wc-journey-choice-receipt');
      expect(source).toContain('@media(forced-colors:active){.wc-journey-choice-receipt');
    });
  });
});
