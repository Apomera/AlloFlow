import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle route-choice evidence', () => {
  it('derives relative shares from the same land signals used by the 3D scene', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function estimateWcRouteShares(runoffValue, infiltrationValue, cover)');
      expect(source).toContain("var branchRunoffCoverWeight = cover === 'urban' ? 1.28");
      expect(source).toContain("var branchInfiltrationCoverWeight = cover === 'urban' ? 0.55");
      expect(source).toContain("var branchPlantBase = cover === 'forest' ? 44");
      expect(source).toContain('var wcRouteShares = estimateWcRouteShares(runoffTendency, infiltrationOpportunity, landCover);');
    });
  });

  it('shows all three relative shares with visual and accessible evidence', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('Compare the relative route shares as teaching evidence, not measured water volumes.');
      expect(source).toContain('className: "wc-route-share-track"');
      expect(source).toContain('Relative route share " + wcRouteShares.runoff + " percent');
      expect(source).toContain('Relative route share " + wcRouteShares.infiltration + " percent');
      expect(source).toContain('Relative route share " + wcRouteShares.plant + " percent');
      expect(source).toContain('style: { width: wcRouteShares.runoff + "%" }');
      expect(source).toContain('style: { width: wcRouteShares.infiltration + "%" }');
      expect(source).toContain('style: { width: wcRouteShares.plant + "%" }');
    });
  });
});
