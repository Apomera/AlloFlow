import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle Land-Surface Scenario Lab', () => {
  it('models the principal qualitative runoff and infiltration drivers', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var landRainIntensity =');
      expect(source).toContain('var landSaturation =');
      expect(source).toContain("var landPermeability = d.landPermeability || 'medium';");
      expect(source).toContain("var landSlope = d.landSlope || 'moderate';");
      expect(source).toContain("var landCover = d.landCover || 'grass';");
      expect(source).toContain('0.30 * rainPressure');
      expect(source).toContain('0.25 * saturationPressure');
      expect(source).toContain('0.28 * (1 - permeabilityResistance)');
      expect(source).toContain('0.20 * (1 - coverRunoffPressure)');
      expect(source).toContain('if (permeabilityResistance == null) permeabilityResistance = 0.5;');
      expect(source).toContain('if (slopePressure == null) slopePressure = 0.45;');
      expect(source).toContain('if (coverRunoffPressure == null) coverRunoffPressure = 0.35;');
    });
  });

  it('keeps the model boundary scientifically explicit', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('They are intentionally independent');
      expect(source).toContain('not measured percentages or a forecast');
      expect(source).toContain('Infiltration does not automatically become groundwater recharge.');
      expect(source).toContain('Groundwater recharge remains unresolved.');
      expect(source).not.toContain('runoffTendency + infiltrationOpportunity');
      expect(source).not.toContain('100 - runoffTendency');
    });
  });

  it('provides accessible controls, reset behavior, and live results', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"data-watercycle-land": "true"');
      expect(source).toContain('"aria-labelledby": "wc-land-title"');
      expect(source).toContain('"aria-label": "Rainfall intensity index"');
      expect(source).toContain('"aria-label": "Antecedent soil saturation index"');
      expect(source).toContain('"aria-label": "Reset land-surface scenario"');
      expect(source).toContain('renderLandSegments("Soil permeability"');
      expect(source).toContain('renderLandSegments("Slope"');
      expect(source).toContain('renderLandSegments("Land cover"');
      expect(source).toContain('"aria-label": label + ": " + option.label + (active ? " (selected)" : "")');
      expect(source).toContain('active ? "\\u2713 " + option.label : option.label');
      expect(source).toContain('.wc-land-segments button:focus-visible');
      expect(source).toContain('.wc-land-segments button[aria-pressed="true"]{outline:2px solid Highlight');
      expect(source).toContain('"aria-live": "polite"');
      expect(source).toContain('var wcLandInterpretation = runoffTendency >= infiltrationOpportunity + 10');
      expect(source).toContain('var wcLandRunoffDrivers =');
      expect(source).toContain('var wcLandInfiltrationDrivers =');
      expect(source).toContain('function strongestWcLandDriver(drivers)');
      expect(source).toContain('Largest modeled runoff influence: ');
      expect(source).toContain('className: "wc-land-driver"');
      expect(source).toContain('className: "wc-land-interpretation"');
      expect(source).toContain('className: "wc-land-prompt"');
      expect(source).toContain('Try a one-control test:');
      expect(source).toContain('The signals are balanced: compare runoff and infiltration rather than treating either as certain.');
      expect(source).toContain('Land-surface scenario reset to balanced conditions.');
    });
  });

  it('connects land conditions to journey decisions, 3D cues, and tutor context', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"Runoff tendency: " + landIndexBand(runoffTendency)');
      expect(source).toContain('"Infiltration opportunity: " + landIndexBand(infiltrationOpportunity)');
      expect(source).toContain('"data-runoff-index": String(runoffTendency)');
      expect(source).toContain('"data-infiltration-index": String(infiltrationOpportunity)');
      expect(source).toContain("coverVisual3d === 'forest'");
      expect(source).toContain('river3d.material.opacity =');
      expect(source).toContain('aquifer3d.material.opacity =');
      expect(source).toContain("var landContext = 'Land scenario:");
      expect(source).toContain('Treat tool outputs as qualitative teaching indices');
    });
  });
});
