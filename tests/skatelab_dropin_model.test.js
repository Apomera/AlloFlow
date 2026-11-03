// Phase 1 of the Skate Lab enhancement (2026-11): drop-in from rest with
// rolling friction, pumping as rider work, and the flat push-and-coast scene.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));

let physics;
let toolConfig;
let host;
let root;

beforeAll(() => {
  resetStemLab();
  toolConfig = loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
  physics = window.__alloSkatePhysicsPure;
});

afterEach(async () => {
  if (root) {
    await act(async () => { root.unmount(); });
    root = null;
  }
  host?.remove();
  host = null;
});

function halfpipe(overrides = {}) {
  return physics.simHalfpipe({
    pumps: 3,
    vehicle: 'skate',
    gravity: 9.81,
    surfaceId: 'standard',
    rotationTarget: 0,
    spinRate: 0,
    riderMassKg: 62,
    rampDepthM: 2.4,
    bodyPositionId: 'neutral',
    ...overrides,
  });
}

describe('Skate Lab drop-in integrator', () => {
  it('converges at fourth order as the time step shrinks', () => {
    const reference = halfpipe({ solverStepScale: 1 / 16, _skipNumericalCheck: true });
    const errors = [4, 2, 1, 0.5].map((solverStepScale) => {
      const result = halfpipe({ solverStepScale, _skipNumericalCheck: true });
      return Math.abs(result.hAir - reference.hAir);
    });
    expect(errors[0]).toBeGreaterThan(1e-8);
    for (let index = 1; index < errors.length; index += 1) {
      // Halving the step cuts the error by about 2^4 = 16 for RK4.
      expect(errors[index - 1] / errors[index]).toBeGreaterThan(8);
    }
    expect(errors[2]).toBeLessThan(1e-6);
  });

  it('reports a half-step accuracy check and a small genuine energy residual', () => {
    const result = halfpipe();
    expect(result.numericalCheck.halfStepS).toBeCloseTo(result.numericalCheck.stepS / 2, 12);
    expect(result.numericalCheck.sameOutcome).toBe(true);
    expect(result.numericalCheck.airHeightDeltaM).toBeLessThan(1e-6);
    expect(Math.abs(result.energyClosureResidualJ)).toBeLessThan(1e-4);
    expect(result.energyClosureResidualJ).not.toBe(0);
  });

  it('rocks back and forth, losing height each pass, until it stops', () => {
    const result = halfpipe({ pumps: 0 });
    const heights = result.passPeaks.map((peak) => peak.heightM);
    expect(result.hasAir).toBe(false);
    expect(result.outcome).toBe('no-air');
    expect(result.endReason).toBe('stopped');
    expect(heights.length).toBeGreaterThan(10);
    for (let index = 1; index < heights.length; index += 1) {
      expect(heights[index]).toBeLessThan(heights[index - 1]);
    }
    expect(result.passPeaks.every((peak, index) => index === 0 || peak.side !== result.passPeaks[index - 1].side)).toBe(true);
    const end = physics.sampleHalfpipe(result, 1);
    expect(end.speedMps).toBe(0);
    expect(end.phase).toBe('rocked to a stop');
    // Every joule of starting height energy ends as heat (or the tiny height left).
    expect(result.thermalJ + result.finalPotentialJ).toBeCloseTo(result.startPotentialJ, 3);
    expect(result.finalPotentialJ).toBeLessThan(0.02 * result.startPotentialJ);
  });
});

describe('Skate Lab pumping as rider work', () => {
  it('adds energy when the rider extends where the support force is high', () => {
    const bottom = halfpipe({ pumpTimingId: 'bottom' });
    const wall = halfpipe({ pumpTimingId: 'wall' });
    const lip = halfpipe({ pumpTimingId: 'lip' });

    expect(bottom.riderWorkJ).toBeGreaterThan(wall.riderWorkJ);
    expect(wall.riderWorkJ).toBeGreaterThan(lip.riderWorkJ);
    expect(lip.riderWorkJ).toBeLessThan(0.1 * bottom.riderWorkJ);
    expect(bottom.hasAir).toBe(true);
    expect(lip.hasAir).toBe(false);

    for (const event of bottom.pumpEvents.filter((pump) => pump.kind === 'extend')) {
      expect(event.workJ).toBeCloseTo(event.normalForceN * physics.constants.pumpStrokeM, 9);
      expect(event.normalG).toBeGreaterThan(1);
    }
    const extensionWork = bottom.pumpEvents.reduce((sum, pump) => sum + pump.workJ, 0);
    expect(extensionWork).toBeCloseTo(bottom.riderWorkJ, 9);
  });

  it('raises the trick air with each extra pump and does nothing without pumps', () => {
    const airs = [1, 2, 3, 4, 5, 6].map((pumps) => halfpipe({ pumps }).hAir);
    for (let index = 1; index < airs.length; index += 1) {
      expect(airs[index]).toBeGreaterThan(airs[index - 1]);
    }
    expect(halfpipe({ pumps: 0 }).riderWorkJ).toBe(0);
  });

  it('shows rider work as an energy input in the ledger', () => {
    const html = renderTool('skatelab', {
      // Stage B made predict-first the default; this checks the revealed ledger.
      skatelab: { mode: 'halfpipe', pumps: 3, rotationTarget: 180, spinRate: 210, estimateChallenge: false, _predictDefaultV: 2 },
    });
    expect(html).toContain('Work by the rider’s muscles (pumping)');
    expect(html).toContain('Start: height energy PE = m·g·h (KE = 0)');
    expect(html).toContain('Work by rider');
  });
});

describe('Skate Lab flat push and coast', () => {
  function flat(overrides = {}) {
    return physics.simFlatGround({ pushForceN: 200, surfaceId: 'standard', gravity: 9.81, riderMassKg: 62, vehicle: 'skate', ...overrides });
  }

  it('turns all push work into heat equal to mu*m*g*d', () => {
    for (const surfaceId of ['wax', 'standard', 'rough']) {
      const result = flat({ surfaceId });
      const mu = physics.getSurface(surfaceId).rollingMu;
      expect(result.frictionN).toBeCloseTo(mu * result.massKg * result.gravity, 10);
      expect(result.thermalJ).toBeCloseTo(mu * result.massKg * result.gravity * result.stopDistanceM, 9);
      expect(result.riderWorkJ).toBeCloseTo(result.thermalJ, 6);
      expect(result.stopDistanceM).toBeCloseTo(result.pushDistanceM + result.topSpeed ** 2 / (2 * mu * result.gravity), 9);
    }
    expect(flat({ surfaceId: 'wax' }).stopDistanceM).toBeGreaterThan(flat().stopDistanceM);
    expect(flat().stopDistanceM).toBeGreaterThan(flat({ surfaceId: 'rough' }).stopDistanceM);
  });

  it('checks KE lost = mu*m*g*d live while coasting', () => {
    const result = flat();
    for (const fraction of [0.2, 0.5, 0.8, 1]) {
      const time = result.pushTimeS + fraction * result.coastTimeS;
      const sample = physics.sampleFlat(result, time / result.motionDuration);
      expect(sample.coastKineticLostJ).toBeCloseTo(sample.coastFrictionWorkSoFarJ, 6);
      expect(sample.keJ + sample.thermalJ).toBeCloseTo(sample.riderWorkJ, 6);
    }
    expect(physics.sampleFlat(result, 1).phase).toBe('stopped');
    expect(physics.sampleFlat(result, 1).speedMps).toBe(0);
  });

  it('demonstrates Newton’s laws: F = ma during the push, coasting decelerates at mu*g, friction is the only horizontal force', () => {
    const result = flat();
    const pushing = physics.sampleFlat(result, 0.2 * result.pushTimeS / result.motionDuration);
    expect(pushing.phase).toBe('pushing off');
    expect(pushing.pushForceN).toBe(200);
    expect(pushing.netForceN).toBeCloseTo(200 - result.frictionN, 10);
    expect(pushing.accelerationMps2).toBeCloseTo(pushing.netForceN / result.massKg, 10);
    expect(pushing.normalForceN).toBeCloseTo(pushing.weightN, 10);

    const coasting = physics.sampleFlat(result, (result.pushTimeS + 0.5 * result.coastTimeS) / result.motionDuration);
    expect(coasting.phase).toBe('coasting');
    expect(coasting.pushForceN).toBe(0);
    expect(coasting.netForceN).toBeCloseTo(-result.frictionN, 10);
    expect(coasting.accelerationMps2).toBeCloseTo(-physics.getSurface('standard').rollingMu * 9.81, 10);
    // First-law reference: with no friction the rider would keep the top speed.
    expect(coasting.frictionlessX - coasting.x).toBeGreaterThan(0);

    const stuck = flat({ pushForceN: 20, surfaceId: 'rough', riderMassKg: 110 });
    expect(stuck.moves).toBe(false);
    expect(stuck.stopDistanceM).toBe(0);
    expect(physics.sampleFlat(stuck, 1).phase).toBe('not moving');
  });

  it('mounts the flat scene and cycles the three mode tabs by keyboard', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    let latest;
    function Host() {
      const [toolData, setToolData] = React.useState({ skatelab: { mode: 'flat' } });
      latest = toolData;
      return toolConfig.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => { root.render(React.createElement(Host)); });
    const flatTab = host.querySelector('#sk-mode-tab-flat');
    expect(flatTab.getAttribute('aria-selected')).toBe('true');
    expect(host.textContent).toContain('Push Off!');
    expect(host.querySelector('#sk-push-force')).not.toBeNull();
    expect(host.textContent).toContain('μ·m·g·d');
    expect(host.textContent).not.toMatch(/undefined|NaN|\[object Object\]/);

    await act(async () => {
      flatTab.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(latest.skatelab.mode).toBe('halfpipe');
    await act(async () => {
      host.querySelector('#sk-mode-tab-halfpipe').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    expect(latest.skatelab.mode).toBe('flat');
    await act(async () => {
      host.querySelector('#sk-mode-tab-flat').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(latest.skatelab.mode).toBe('gap');
  });
});
