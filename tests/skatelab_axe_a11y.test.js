import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
let axe;
let physics;
let host;
let originalThemeClass;

const DISABLED = {
  'color-contrast': { enabled: false },
  region: { enabled: false },
  'page-has-heading-one': { enabled: false },
  'landmark-one-main': { enabled: false },
  'html-has-lang': { enabled: false },
  'heading-order': { enabled: false },
};

function state(overrides = {}) {
  return {
    skatelab: {
      mode: 'halfpipe',
      viewMode: '2d',
      vehicle: 'skate',
      gravity: 9.81,
      surfaceId: 'standard',
      windId: 'calm',
      riderMassKg: 62,
      rampDepthM: 2.4,
      landingCompressionM: 0.45,
      bodyPositionId: 'neutral',
      airDrag: true,
      pumps: 3,
      rotationTarget: 360,
      spinRate: 260,
      speedMph: 17,
      angleDeg: 35,
      gapFt: 15,
      cameraAzimuth: 38,
      showVectors: true,
      showTrail: true,
      showEnergy: true,
      estimateChallenge: false,
      estimateValue: '',
      hypothesis: '',
      experiments: [],
      stats: { runs: 0, successful: 0, withinTen: 0 },
      ...overrides,
    },
  };
}

function compactViolations(results) {
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 3).map((node) => node.html.slice(0, 180)),
  }));
}

beforeAll(() => {
  axe = require(resolve(process.cwd(), 'desktop/web-app/node_modules', 'axe-core'));
  resetStemLab();
  loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
  physics = window.__alloSkatePhysicsPure;
});

beforeEach(() => {
  originalThemeClass = document.documentElement.className;
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  document.documentElement.className = originalThemeClass;
  host?.remove();
  host = null;
});

const CASES = [
  ['halfpipe in light app chrome', 'theme-default', state()],
  ['halfpipe in dark app chrome', 'theme-dark', state({ viewMode: '3d' })],
  ['gap jump in light app chrome', 'theme-default', state({ mode: 'gap' })],
  ['gap jump in dark app chrome', 'theme-dark', state({ mode: 'gap', viewMode: '3d', windId: 'cross_right' })],
];

describe('Skate Lab structural axe audit', () => {
  for (const [name, themeClass, toolState] of CASES) {
    it(name + ' has no structural violations', async () => {
      document.documentElement.className = themeClass;
      host.innerHTML = renderTool('skatelab', toolState);
      const results = await axe.run(host, {
        rules: DISABLED,
        resultTypes: ['violations'],
      });
      expect(compactViolations(results)).toEqual([]);
    });
  }

  it('previous-run comparison has no structural violations', async () => {
    const baseline = physics.simGapJump({
      speedMph: 17,
      angleDeg: 35,
      gapFt: 15,
      riderMassKg: 62,
      landingCompressionM: 0.45,
      vehicle: 'skate',
      gravity: 9.81,
      windId: 'calm',
      airDrag: true,
    });
    document.documentElement.className = 'theme-dark';
    host.innerHTML = renderTool('skatelab', state({
      mode: 'gap',
      viewMode: '3d',
      landingCompressionM: 0.8,
      lastResult: baseline,
      lastSim: baseline,
    }));

    expect(host.querySelector('.sk-trace-previous')).not.toBeNull();
    const results = await axe.run(host, {
      rules: DISABLED,
      resultTypes: ['violations'],
    });
    expect(compactViolations(results)).toEqual([]);
  });
});
