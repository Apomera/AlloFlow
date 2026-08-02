import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle control accessibility', () => {
  it('announces meaningful units for climate and land sliders', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"aria-valuetext": ((d.climSolar != null ? d.climSolar : 1.0) * 100).toFixed(0) + "% solar intensity"');
      expect(source).toContain('"aria-valuetext": (d.climTemp != null ? d.climTemp : 15) + " degrees Celsius"');
      expect(source).toContain('"aria-valuetext": ((d.climWind != null ? d.climWind : 1.0)).toFixed(1) + " times baseline wind"');
      expect(source).toContain('"aria-valuetext": landRainIntensity + " out of 100 rainfall intensity"');
      expect(source).toContain('"aria-valuetext": landSaturation + " out of 100 soil saturation"');
    });
  });

  it('provides high-contrast and forced-colors fallbacks for comparison surfaces', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('@media (prefers-contrast: more)');
      expect(source).toContain('@media (forced-colors: active)');
      expect(source).toContain('border-color:CanvasText');
      expect(source).toContain('background:Highlight');
      expect(source).toContain('color:HighlightText');
    });
  });
});
