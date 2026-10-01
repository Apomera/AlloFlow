import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function traceBlock(source, traceName) {
  const startToken = `var ${traceName} = {`;
  const start = source.indexOf(startToken);
  const end = source.indexOf('\n          };', start);

  expect(start, `missing ${traceName}`).toBeGreaterThan(-1);
  expect(end, `unterminated ${traceName}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

function traceEntry(trace, key) {
  const match = trace.match(new RegExp(`^\\s*${key}: \\{([^}]*)\\}`, 'm'));
  expect(match, `missing hydrologic-time entry for ${key}`).not.toBeNull();
  return match[1];
}

describe('Water Cycle hydrologic physical-time and storage lens', () => {
  it('defines complete qualitative time metadata for stages and journey states', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const stageTrace = traceBlock(source, 'STAGE_HYDROLOGIC_TIME_TRACE');
      const journeyTrace = traceBlock(source, 'JOURNEY_HYDROLOGIC_TIME_TRACE');

      [
        'evaporation',
        'condensation',
        'precipitation',
        'collection',
        'transpiration',
        'infiltration',
      ].forEach((stage) => {
        const entry = traceEntry(stageTrace, stage);
        expect(entry).toMatch(/role: '[^']+'/);
        expect(entry).toMatch(/bandKey: '[^']+'/);
        expect(entry).toMatch(/rank: [0-4]/);
        expect(entry).toMatch(/label: '[^']+'/);
        expect(entry).toMatch(/caveat: '[^']+'/);
      });

      [
        'ocean',
        'evaporating',
        'condensing',
        'precipitating',
        'ground_choice',
        'river_runoff',
        'infiltrating',
        'aquifer_flow',
        'plant_absorb',
        'transpiring',
        'complete',
      ].forEach((state) => {
        const entry = traceEntry(journeyTrace, state);
        expect(entry).toMatch(/role: '[^']+'/);
        expect(entry).toMatch(/bandKey: '[^']+'/);
        expect(entry).toMatch(/rank: [0-4]/);
        expect(entry).toMatch(/label: '[^']+'/);
        expect(entry).toMatch(/caveat: '[^']+'/);
      });
    });
  });

  it('distinguishes storage, learner choice, slow groundwater, and infiltration limits', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const stageTrace = traceBlock(source, 'STAGE_HYDROLOGIC_TIME_TRACE');
      const journeyTrace = traceBlock(source, 'JOURNEY_HYDROLOGIC_TIME_TRACE');

      ['ocean', 'complete'].forEach((state) => {
        const entry = traceEntry(journeyTrace, state);
        expect(entry).toContain("role: 'storage'");
        expect(entry).toContain("bandKey: 'long-storage'");
      });

      const choice = traceEntry(journeyTrace, 'ground_choice');
      expect(choice).toContain("role: 'choice'");
      expect(choice).toContain("bandKey: 'decision'");
      expect(choice).toMatch(/not physical waiting/i);

      const aquifer = traceEntry(journeyTrace, 'aquifer_flow');
      expect(aquifer).toContain("role: 'storage-transfer'");
      expect(aquifer).toContain("bandKey: 'long-storage'");
      expect(aquifer).toMatch(/years to millennia possible/i);

      expect(traceEntry(stageTrace, 'infiltration')).toMatch(/infiltration is not automatic recharge/i);
      expect(traceEntry(journeyTrace, 'infiltrating')).toMatch(/infiltration is not automatic recharge/i);
    });
  });
});
