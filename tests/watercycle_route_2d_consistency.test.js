import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle 2D route evidence consistency', () => {
  it('uses the same relative shares and leader state as the 3D route chooser', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var wcRouteLeaderAccessibility = wcRouteLeader ?');
      expect(source).toContain('function renderWc2dRouteShare(pathKey, share, isLeader)');
      expect(source).toContain("renderWc2dRouteShare('runoff', wcRouteShares.runoff, wcRouteLeader === 'runoff')");
      expect(source).toContain("renderWc2dRouteShare('infiltrate', wcRouteShares.infiltration, wcRouteLeader === 'infiltrate')");
      expect(source).toContain("renderWc2dRouteShare('plant', wcRouteShares.plant, wcRouteLeader === 'plant')");
      expect(source).toContain('className: "wc-route-choice-card" + (wcRouteLeader === "runoff" ? " is-leading" : "")');
    });
  });

  it('makes the 2D decision point visibly and non-visually discoverable', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-2d-route-note"');
      expect(source).toContain('Relative route share " + wcRouteShares.runoff + " percent.');
      expect(source).toContain('Relative route share " + wcRouteShares.infiltration + " percent.');
      expect(source).toContain('Relative route share " + wcRouteShares.plant + " percent.');
      expect(source).toContain('className: "wc-2d-route-share"');
      expect(source).toContain('className: "wc-2d-route-share-track" + trackClass');
      expect(source).toContain('@media(forced-colors:active){.wc-2d-route-note');
      expect(source).toContain('The modeled signals are tied; compare the relative shares before choosing.');
    });
  });
});
