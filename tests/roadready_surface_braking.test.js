import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Qualitative rationale: ABS responds to impending wheel lock as road grip
// changes; it does not change the driver's requested pressure below that limit.
// https://www.bosch-mobility.com/en/solutions/braking-systems/antilock-braking-system/
// All numerical grip/ABS coefficients remain Road Ready teaching-model choices.
let RR, liveTireStep;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;

  // Exercise the production caller as well as the helper. Otherwise a correct
  // helper could pass while the drive loop still scales its brake force twice.
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('          var tireDynamics = computeTireDynamics(');
  const end = source.indexOf('          var mu = tireDynamics.mu;', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate the live tire-dynamics caller');
  liveTireStep = new Function('computeTireDynamics', 'scn', 'absSpeed', 'MS_TO_MPH',
    'brakeInput', 'car', 'tireConfig', 'waterCoverage', 'surfaceContact',
    'tireDynamicsRef', 'overPuddle', source.slice(start, end) + '\nreturn tireDynamics;');
});

function contactFor(cells) {
  return RR.aggregateWheelSurfaceDynamics(cells.map((cell, index) => ({
    cell, side: index % 2 ? 'right' : 'left', overPuddle: false
  })));
}

function tire(brake, grip, options = {}) {
  return RR.computeTireDynamics(options.weather || 'clear', options.speed ?? 40,
    brake, 0.2, { absEnabled: options.absEnabled !== false, tread32: 7, psi: 32 },
    options.waterCoverage || 0, grip);
}

function liveBrake(brake, contact, absEnabled = true) {
  return liveTireStep(RR.computeTireDynamics, { weather: 'clear' }, 40 / RR.MS_TO_MPH,
    RR.MS_TO_MPH, brake, { steering: 0.2 }, { absEnabled, tread32: 7, psi: 32 },
    0, contact, { current: {} }, false);
}

describe('surface grip determines available braking before ABS and lock decisions', () => {
  it('activates ABS on grass at a pedal demand that pavement can accept', () => {
    const grass = contactFor([2, 2, 2, 2]);
    const pavement = tire(0.5, 1);
    const lowGrip = tire(0.5, grass.gripMultiplier);
    expect(pavement.absActive).toBe(false);
    expect(lowGrip.absActive).toBe(true);
    expect(lowGrip.wheelLocked).toBe(false);
    expect(lowGrip.mu).toBeCloseTo(RR.frictionCoef('clear') * grass.gripMultiplier, 10);
    expect(lowGrip.brakingMu).toBeLessThanOrEqual(lowGrip.mu);
  });

  it('locks non-ABS wheels under that same grass demand and reduces steering', () => {
    const grass = contactFor([2, 2, 2, 2]);
    const abs = tire(0.5, grass.gripMultiplier);
    const locked = tire(0.5, grass.gripMultiplier, { absEnabled: false });
    expect(locked.wheelLocked).toBe(true);
    expect(locked.absActive).toBe(false);
    expect(locked.steeringFactor).toBeLessThan(abs.steeringFactor);
    expect(locked.brakingMu).toBeLessThan(abs.brakingMu);
  });

  it('uses mixed wheel contact grip in the ABS decision', () => {
    const mixed = contactFor([0, 2, 0, 2]);
    expect(mixed.mixed).toBe(true);
    expect(tire(0.55, 1).absActive).toBe(false);
    expect(tire(0.55, mixed.gripMultiplier).absActive).toBe(true);
  });

  it('preserves a light requested brake force below both surface ceilings in the live loop', () => {
    const paved = liveBrake(0.1, contactFor([0, 0, 0, 0]));
    const grass = liveBrake(0.1, contactFor([2, 2, 2, 2]));
    expect(paved.brakingMu).toBeGreaterThan(0);
    expect(grass.mu).toBeLessThan(paved.mu);
    expect(grass.brakingMu).toBeCloseTo(paved.brakingMu, 10);
    expect(grass.absActive).toBe(false);
    expect(grass.wheelLocked).toBe(false);
  });

  it('feeds wheel grip into the actual live ABS and non-ABS decisions exactly once', () => {
    const contact = contactFor([2, 2, 2, 2]);
    const abs = liveBrake(0.5, contact);
    const locked = liveBrake(0.5, contact, false);
    expect(abs.absActive).toBe(true);
    expect(locked.wheelLocked).toBe(true);
    expect(abs.mu).toBeCloseTo(RR.frictionCoef('clear') * contact.gripMultiplier, 10);
    expect(abs.brakingMu).toBeCloseTo(tire(0.5, contact.gripMultiplier).brakingMu, 10);
  });

  it('preserves the existing pavement model and hydroplane scaling', () => {
    const original = RR.computeTireDynamics('rain', 70, 0.7, 0.2,
      { absEnabled: true, tread32: 7, psi: 32 }, 1);
    const explicitPavement = tire(0.7, 1, { weather: 'rain', speed: 70, waterCoverage: 1 });
    expect(explicitPavement).toEqual(original);
    const grass = tire(0.7, 0.55, { weather: 'rain', speed: 70, waterCoverage: 1 });
    expect(grass.hydroplaneSeverity).toBe(original.hydroplaneSeverity);
    expect(grass.mu).toBeCloseTo(original.mu * 0.55, 10);
    expect(grass.surfaceMu).toBeCloseTo(original.surfaceMu * 0.55, 10);
    expect(grass.brakingMu).toBeLessThanOrEqual(grass.mu);
  });

  it('keeps reverse braking symmetric and avoids ABS activation without a brake request', () => {
    expect(tire(0.5, 0.55, { speed: -40 })).toEqual(tire(0.5, 0.55, { speed: 40 }));
    const coasting = tire(0, 0.55);
    expect(coasting.brakingMu).toBe(0);
    expect(coasting.absActive).toBe(false);
    expect(coasting.wheelLocked).toBe(false);
  });

  it('accepts zero traction and sanitizes invalid or out-of-range surface multipliers', () => {
    for (const grip of [0, -1]) {
      expect(tire(1, grip).mu).toBe(0);
      expect(tire(1, grip).brakingMu).toBe(0);
    }
    const pavement = tire(0.5, 1);
    for (const grip of [undefined, null, NaN, Infinity, '0.55', 2]) {
      expect(tire(0.5, grip)).toEqual(pavement);
    }
  });
});
