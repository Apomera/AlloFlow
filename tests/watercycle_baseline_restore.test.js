import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle baseline restore', () => {
  it('restores every saved climate and land control while clearing stale evidence state', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function restoreWcScenarioBaseline()');
      expect(source).toContain('climSolar: baseline.climSolar != null ? baseline.climSolar : 1.0');
      expect(source).toContain('climTemp: baseline.climTemp != null ? baseline.climTemp : 15');
      expect(source).toContain('climWind: baseline.climWind != null ? baseline.climWind : 1.0');
      expect(source).toContain('landRainIntensity: baseline.landRainIntensity != null ? baseline.landRainIntensity : 55');
      expect(source).toContain('landSaturation: baseline.landSaturation != null ? baseline.landSaturation : 45');
      expect(source).toContain("landPermeability: baseline.landPermeability || 'medium'");
      expect(source).toContain("landSlope: baseline.landSlope || 'moderate'");
      expect(source).toContain("landCover: baseline.landCover || 'grass'");
      expect(source).toContain("wcScenarioPreset: 'custom'");
      expect(source).toContain("wcPrediction: ''");
      expect(source).toContain("wcReplayedObservation: ''");
      expect(source).toContain('Saved scenario baseline restored. The comparison now shows the baseline state.');
    });
  });

  it('provides a disabled-aware, visible, and forced-colors-safe Restore control', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('className: "wc-compare-btn is-restore"');
      expect(source).toContain('disabled: !wcScenarioChanges.length');
      expect(source).toContain('Restore saved scenario baseline settings');
      expect(source).toContain('onClick: restoreWcScenarioBaseline');
      expect(source).toContain('}, "↶ Restore")');
      expect(source).toContain('.wc-compare-btn.is-restore');
      expect(source).toContain('@media(forced-colors:active){.wc-compare-btn.is-restore');
    });
  });
});
