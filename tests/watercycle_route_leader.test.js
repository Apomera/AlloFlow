import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle route leader cue', () => {
  it('identifies a unique strongest route and handles ties explicitly', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var wcMaxRouteShare = Math.max(wcRouteShares.runoff, wcRouteShares.infiltration, wcRouteShares.plant);');
      expect(source).toContain('var wcRouteLeaderCount = [wcRouteShares.runoff, wcRouteShares.infiltration, wcRouteShares.plant].filter');
      expect(source).toContain('var wcRouteLeader = wcRouteLeaderCount === 1');
      expect(source).toContain('The modeled signals are tied; compare the paths and choose any route.');
    });
  });

  it('pairs the strongest-signal badge with accessible route wording', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('aria-describedby": "wcViewportChoiceDescription wcViewportChoiceStatus"');
      expect(source).toContain('className: "wc-route-choice-signal"');
      expect(source).toContain('id: "wcViewportChoiceStatus"');
      expect(source).toContain('role: "status"');
      expect(source).toContain('className: "wc-route-choice-card" + (wcRouteLeader === "runoff" ? " is-leading" : "")');
      expect(source).toContain('className: "wc-route-leader-badge"');
      expect(source).toContain('Strongest modeled pathway.');
      expect(source).toContain('@media (forced-colors: active){.wc-route-choice-card.is-leading');
    });
  });
});
