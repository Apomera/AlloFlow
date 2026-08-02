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
      expect(source).toContain('Relative teaching share, not measured water volume.');
      expect(source).toContain('style: { width: wcRouteShares.runoff + "%" }');
      expect(source).toContain('style: { width: wcRouteShares.infiltration + "%" }');
      expect(source).toContain('style: { width: wcRouteShares.plant + "%" }');
      expect(source).toContain('var journeyPathPaceByKey = {');
      expect(source).toContain('var journeyPathReturnByKey = {');
      expect(source).toContain('returnPath: journeyPathReturnByKey.runoff');
      expect(source).toContain('returnPath: journeyPathReturnByKey.infiltrate');
      expect(source).toContain('returnPath: journeyPathReturnByKey.plant');
      expect(source).toContain('var journeyPathDriverByKey = {');
      expect(source).toContain('driver: journeyPathDriverByKey.runoff');
      expect(source).toContain('driver: journeyPathDriverByKey.infiltrate');
      expect(source).toContain('driver: journeyPathDriverByKey.plant');
      expect(source).toContain('className: "wc-route-driver-copy"');
      expect(source).toContain('Driver: " + journeyPathDriverByKey.runoff');
      expect(source).toContain('Driver: " + journeyPathDriverByKey.infiltrate');
      expect(source).toContain('Driver: " + journeyPathDriverByKey.plant');
      expect(source).toContain('className: "wc-route-pace-copy"');
      expect(source).toContain('.wc-viewport-choice-grid span{margin-top:2px;font-size:10px');
      expect(source).toContain('.wc-2d-route-share{display:block;margin-top:5px;font-size:10px');
      expect(source).toContain('.wc-route-return-copy{display:block;margin-top:3px;font-size:10px');
      expect(source).toContain('.wc-route-pace-copy{display:block;margin-top:3px;font-size:10px');
      expect(source).toContain('Residence pace: " + journeyPathPaceByKey.runoff');
      expect(source).toContain('Residence pace: " + journeyPathPaceByKey.infiltrate');
      expect(source).toContain('Residence pace: " + journeyPathPaceByKey.plant');
      expect(source).toContain('Return through transpiration');
      expect(source).toContain('className: "wc-route-return-copy"');
      expect(source).toContain('Return path: " + journeyPathReturnByKey.runoff');
      expect(source).toContain('Return path: " + journeyPathReturnByKey.infiltrate');
      expect(source).toContain('Return path: " + journeyPathReturnByKey.plant');
    });
  });
});
