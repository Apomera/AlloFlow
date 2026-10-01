import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('Water Cycle hydrologic physical-time rendering contract', () => {
  it('binds the current qualitative time trace into the summary, Data view, and both canvases', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("JOURNEY_HYDROLOGIC_TIME_TRACE[d.journeyState || 'ocean']");
      expect(source).toContain('STAGE_HYDROLOGIC_TIME_TRACE[resolvedStageId]');
      expect(source).toContain("var currentHydrologicTimeLabel = currentHydrologicTime.roleLabel + ' - ' + currentHydrologicTime.label;");
      expect(source).toContain('"Matter, energy, and physical time"');
      expect(source).toContain('Physical time is qualitative and separate from playback.');
      expect(source).toContain('React.createElement("dt", null, "Physical time")');
      expect(source).toContain('React.createElement("th", { scope: "row" }, "Physical time")');
      expect(source).toContain('" Animation is compressed, not a physical clock."');

      expect(source.match(/"data-hydrologic-time-role": currentHydrologicTime\.role/g)).toHaveLength(2);
      expect(source.match(/"data-hydrologic-time-band": currentHydrologicTime\.bandKey/g)).toHaveLength(2);
      expect(source.match(/"data-hydrologic-time-rank": String\(currentHydrologicTime\.rank\)/g)).toHaveLength(2);
      expect(source.match(/"data-animation-time-scale": "compressed-not-physical"/g)).toHaveLength(2);
    });
  });

  it('constructs the pooled 3D residence lens once, outside the animation loop', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const animateStart = source.indexOf('function animateJourney3d()');
      const cleanupStart = source.indexOf('function cleanupJourney3d()', animateStart);
      const setupSource = source.slice(0, animateStart);
      const animateSource = source.slice(animateStart, cleanupStart);

      expect(animateStart).toBeGreaterThan(-1);
      expect(cleanupStart).toBeGreaterThan(animateStart);
      expect(setupSource).toContain('var residenceLensGroup3d = new THREE.Group();');
      expect(setupSource).toContain('var residenceDwellRings3d = [];');
      expect(setupSource).toContain('var residenceTransferArc3d = new THREE.Mesh(');
      expect(setupSource).toContain('new THREE.RingGeometry(0.37, 0.405, 36, 1');
      expect(setupSource).toContain('handoffVisualGroup3d.add(residenceLensGroup3d);');
      expect(animateSource).not.toMatch(/residence(?:LensGroup|DwellRings|TransferArc)3d\s*=\s*new THREE\./);
      expect(animateSource).not.toMatch(/residenceDwellRings3d\s*=\s*\[\]/);
      expect(animateSource).not.toMatch(/document\.createElement\([^\n]*residence/i);
    });
  });

  it('uses ordinal metadata for static reduced-motion-safe 2D and 3D lens visuals', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const glyphStart = source.indexOf('function drawPhysicalTimeGlyph2d(');
      const evidenceStart = source.indexOf('function drawMatterEnergyEvidence2d(', glyphStart);
      const glyphSource = source.slice(glyphStart, evidenceStart);
      const lensStart = source.indexOf("canvasEl.dataset.timeLensMotion = 'static';");
      const handoffMaterialStart = source.indexOf('handoffSourceRingMaterial3d.color.setHex', lensStart);
      const lensRuntime = source.slice(lensStart, handoffMaterialStart);

      expect(glyphStart).toBeGreaterThan(-1);
      expect(evidenceStart).toBeGreaterThan(glyphStart);
      expect(handoffMaterialStart).toBeGreaterThan(lensStart);
      expect(glyphSource).toContain('var boundedRank2d = Math.max(0, Math.min(4, parseInt(rank, 10) || 0));');
      expect(glyphSource).not.toMatch(/\b(?:tick|visualTime|journeyProgress|journeySpeed)\b/);
      expect(source).toContain("canvasEl.dataset.timeLensMotion = 'static';");
      expect(source).toContain("canvasEl.dataset.timeLensVisual = !handoffVisible3d ? 'hidden' :");
      expect(lensRuntime).toContain('residenceRingIndex3d < Math.max(2, hydrologicTimeRank3d)');
      expect(lensRuntime).not.toMatch(/\b(?:journeyProgress3d|journeySpeed3d|visualTime3d)\b/);
    });
  });
});
