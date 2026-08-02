import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle stage transfer cue', () => {
  it('maps every stage to an explicit source and destination', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var STAGE_FLOW = {');
      expect(source).toContain("evaporation: { from: 'Surface water', to: 'Atmosphere' }");
      expect(source).toContain("condensation: { from: 'Water vapor', to: 'Cloud droplets' }");
      expect(source).toContain("precipitation: { from: 'Cloud water or ice', to: 'Land or ocean' }");
      expect(source).toContain("collection: { from: 'Runoff, rivers, or rain', to: 'Surface stores' }");
      expect(source).toContain("transpiration: { from: 'Plant water', to: 'Atmosphere' }");
      expect(source).toContain("infiltration: { from: 'Surface water', to: 'Soil and aquifer' }");
    });
  });

  it('renders the transfer cue beside the selected process', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-stage-focus-flow"');
      expect(source).toContain('"aria-label": "Water transfer: " + currentStageFlow.from + " to " + currentStageFlow.to');
      expect(source).toContain('currentStageFlow.from');
      expect(source).toContain('currentStageFlow.to');
    });
  });

  it('includes the relationship in both canvas text alternatives', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('Water cycle animation showing the " + currentStageLabel + " process. Water moves from " + currentStageFlow.from');
      expect(source).toContain('Three-dimensional tracked water parcel in the " + immersiveStageLabel + " stage. Water moves from " + currentStageFlow.from');
    });
  });
});
