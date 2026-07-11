import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'prismflow-deploy/public/stem_lab/stem_tool_watercycle.js',
];

const STEM_MODULE_PATHS = [
  'stem_lab/stem_lab_module.js',
  'prismflow-deploy/public/stem_lab/stem_lab_module.js',
];

describe('Water Cycle 3D Droplet Journey', () => {
  it('loads Three.js only when the learner selects the 3D view', () => {
    STEM_MODULE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("var wcNeedsThree = stemLabTool === 'waterCycle'");
      expect(source).toContain("labToolData.waterCycle.journeyView === '3d'");
      expect(source).toContain("labToolData.waterCycle && labToolData.waterCycle.journeyView");
    });
  });

  it('keeps the tested 2D journey engine mounted as the state authority', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("var journeyView = d.journeyView || '2d';");
      expect(source).toContain("opacity: journeyView === '2d' ? 1 : 0");
      expect(source).toContain('"data-journey-state": d.journeyActive ? (d.journeyState || \'ocean\') : \'idle\'');
      expect(source).toContain('"data-watercycle-journey-3d": "true"');
      expect(source).toContain('ref: journey3dRef');
    });
  });

  it('provides a complete, lifecycle-safe, reduced-motion-aware scene', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('new THREE.WebGLRenderer');
      expect(source).toContain('new THREE.CatmullRomCurve3');
      expect(source).toContain('new THREE.MeshPhysicalMaterial');
      expect(source).toContain('var stageTargets3d = {');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('canvasEl.dataset.rendered = \'true\';');
      expect(source).toContain('function cleanupJourney3d()');
      expect(source).toContain('renderer.dispose();');
      expect(source).toContain('if (resizeObserver3d) resizeObserver3d.disconnect();');
      expect(source).toContain('if (controls3d) controls3d.dispose();');
      expect(source).toContain('if (detached3d && !detached3d.isConnected && detached3d._wc3dCleanup)');
      expect(source).toContain('WebGL is unavailable on this device. Use the 2D Cycle view instead.');
      expect(source).toContain('"Return to 2D Cycle"');
      expect(source).toMatch(/: "Loading the 3D water journey\.\.\."\r?\n\s+\),\r?\n/);
      expect(source).toContain('canvasEl._wc3dResetCamera = function()');
      expect(source).toContain('canvasEl._wc3dResetCamera = null;');
      expect(source).toContain('"aria-label": "Resume guided camera"');
    });
  });

  it('exposes an accessible segmented view control and stage status', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('"aria-label": "Water Cycle visualization"');
      expect(source).toContain('"aria-pressed": journeyView === \'2d\'');
      expect(source).toContain('"aria-pressed": journeyView === \'3d\'');
      expect(source).toContain('"aria-live": "polite"');
      expect(source).toContain('illustrative scale');
      expect(source).toContain('Three-dimensional tracked water parcel');
      expect(source).toContain('var journeyLensMap = {');
      expect(source).toContain('"aria-label": "Current water parcel state"');
      expect(source).toContain("driver: 'Hydraulic gradient'");
      expect(source).toContain("driver: 'Water-potential gradient'");
      expect(source).toContain("pace: 'Path dependent'");
    });
  });
});
