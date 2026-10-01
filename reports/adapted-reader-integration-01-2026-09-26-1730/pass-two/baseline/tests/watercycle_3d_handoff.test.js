import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function journeyCurvePoints(source, state) {
  const match = source.match(
    new RegExp(`\\b${state}: makeJourneyCurve3d\\((\\[\\[.*?\\]\\]), (?:true|false)\\)`),
  );
  expect(match, `missing literal 3D route for ${state}`).not.toBeNull();
  return JSON.parse(match[1]);
}

function firstPoint(source, state) {
  return journeyCurvePoints(source, state)[0];
}

function lastPoint(source, state) {
  return journeyCurvePoints(source, state).at(-1);
}

describe('Water Cycle pooled 3D matter-and-energy handoff', () => {
  it('constructs and reuses one source/destination beacon pair outside the animation loop', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const animateStart = source.indexOf('function animateJourney3d()');
      const cleanupStart = source.indexOf('function cleanupJourney3d()', animateStart);
      const setupSource = source.slice(0, animateStart);
      const animateSource = source.slice(animateStart, cleanupStart);

      expect(animateStart).toBeGreaterThan(-1);
      expect(cleanupStart).toBeGreaterThan(animateStart);
      expect(setupSource).toContain('var handoffVisualGroup3d = new THREE.Group();');
      expect(setupSource).toContain('var handoffSourceBeacon3d = new THREE.Group();');
      expect(setupSource).toContain('var handoffDestinationBeacon3d = new THREE.Group();');
      expect(setupSource).toContain('var handoffSourcePoint3d = new THREE.Vector3();');
      expect(setupSource).toContain('var handoffDestinationPoint3d = new THREE.Vector3();');
      expect(setupSource).toContain('world3d.add(handoffVisualGroup3d);');
      expect(animateSource).not.toMatch(/handoff(?:VisualGroup|SourceBeacon|DestinationBeacon|SourcePoint|DestinationPoint)3d\s*=\s*new THREE\./);
      expect(animateSource).not.toMatch(/document\.createElement\([^\n]*handoff/i);
    });
  });

  it('positions pooled beacons at route endpoints and exposes every visual mode', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('activeCurve3d.getPointAt(0, handoffSourcePoint3d);');
      expect(source).toContain('activeCurve3d.getPointAt(1, handoffDestinationPoint3d);');
      expect(source).toContain('handoffSourceBeacon3d.position.copy(handoffSourcePoint3d);');
      expect(source).toContain('handoffDestinationBeacon3d.position.copy(handoffDestinationPoint3d);');
      expect(source).toContain("var handoffMode3d = 'hidden';");
      expect(source).toContain("var handoffStorageState3d = state3d === 'ocean' || state3d === 'complete';");
      expect(source).toContain("var handoffChoiceState3d = state3d === 'ground_choice';");
      expect(source).toContain("handoffMode3d = 'storage';");
      expect(source).toContain("handoffMode3d = 'branch-choice';");
      expect(source).toContain("handoffMode3d = 'transfer';");
      expect(source).toContain('canvasEl.dataset.handoffVisual = handoffMode3d;');
      expect(source).toContain('handoffDestinationBeacon3d.visible = handoffVisible3d && !handoffStorageState3d && !handoffChoiceState3d;');
    });
  });

  it('keeps reduced-motion handoffs informative but static', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("canvasEl.dataset.matterEnergyMotion = motionReduced3d ? 'static' : 'dynamic';");
      expect(source).toContain('var handoffPulse3d = motionReduced3d ? 1 :');
      expect(source).toMatch(/if \(!motionReduced3d\) \{\r?\n\s+handoffSourceRing3d\.rotation\.z/);
      expect(source).toContain('handoffSourceBeacon3d.scale.setScalar(');
      expect(source).toContain('handoffDestinationBeacon3d.scale.setScalar(');
    });
  });

  it('keeps atmospheric, land-choice, and return-to-storage route seams continuous', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(lastPoint(source, 'transpiring')).toEqual(firstPoint(source, 'condensing'));
      expect(lastPoint(source, 'precipitating')).toEqual(firstPoint(source, 'ground_choice'));

      ['river_runoff', 'infiltrating', 'plant_absorb'].forEach((branchState) => {
        expect(firstPoint(source, branchState)).toEqual(firstPoint(source, 'ground_choice'));
      });

      expect(firstPoint(source, 'complete')).toEqual(firstPoint(source, 'ocean'));
      expect(lastPoint(source, 'river_runoff')).toEqual(firstPoint(source, 'complete'));
      expect(lastPoint(source, 'aquifer_flow')).toEqual(firstPoint(source, 'complete'));
    });
  });
});
