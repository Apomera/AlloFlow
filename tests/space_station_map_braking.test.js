import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { brakeAxis, prediction, drive, forecast, at } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { brakeAxis: issMapBrakeAxis, prediction: issMapBrakePrediction, drive: issMapDriveStep, forecast: issMapDriveForecast, at: issMapForecastAt };'
)();

const orbitRate = 360 / (2 * Math.PI * Math.sqrt((6371 + 420) ** 3 / 398600.4418));
const moving = {
  phase: 35, beta: 20, tracking: false,
  motorEnabled: true, motorSmooth: true, motorBraking: true,
  motorRate: .08, motorAcceleration: .002,
  arrayAlpha: 70, arrayFeather: 20,
  actualAlpha: 20, actualFeather: -10, actualAlphaRate: .04, actualFeatherRate: -.025
};

function carry(options, state) {
  return { ...options, phase: state.phase,
    actualAlpha: state.alpha, actualFeather: state.feather,
    actualAlphaRate: state.alphaRate, actualFeatherRate: state.featherRate };
}

function corner(alpha, feather) {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  const x = .45 * Math.cos(f) - .02 * Math.sin(f);
  const y = .45 * Math.sin(f) + .02 * Math.cos(f);
  return [x, y * Math.cos(a) - 3.7 * Math.sin(a), y * Math.sin(a) + 3.7 * Math.cos(a)];
}

function expectVector(actual, expected, precision = 9) {
  expect(actual).toHaveLength(3);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], precision));
}

function expectPose(actual, expected, precision = 8) {
  for (const key of ['phase', 'alpha', 'feather', 'alphaRate', 'featherRate']) {
    expect(actual[key], key).toBeCloseTo(expected[key], precision);
  }
}

describe('space station exact maximum-braking axis', () => {
  it.each([1, -1])('integrates constant deceleration with velocity sign %s', sign => {
    const result = brakeAxis(10, sign * .4, .008, 12.5, false);
    expect(result.position).toBeCloseTo(10 + sign * 4.375, 12);
    expect(result.velocity).toBeCloseTo(sign * .3, 12);
    expect(result.stopPosition).toBeCloseTo(10 + sign * 10, 12);
    expect(result.stopTravel).toBeCloseTo(sign * 10, 12);
    expect(result.stopSeconds).toBeCloseTo(50, 12);
    expect(result.contact).toBe(false);
    expect(result.contacted).toBe(false);
  });

  it('integrates only the moving fraction of the final timestep', () => {
    const result = brakeAxis(0, .001, .05, .05, false);
    expect(result.position).toBeCloseTo(.00001, 14);
    expect(result.stopPosition).toBeCloseTo(.00001, 14);
    expect(result.stopSeconds).toBeCloseTo(.02, 14);
    expect(result.velocity).toBe(0);
    expect(result.contacted).toBe(false);
  });

  it('keeps the stopped position fixed through arbitrarily longer elapsed time', () => {
    const stopped = brakeAxis(12, -.1, .002, 50, false);
    const later = brakeAxis(12, -.1, .002, 10000, false);
    expect(stopped.position).toBeCloseTo(9.5, 12);
    expect(later.position).toBeCloseTo(stopped.position, 12);
    expect(later.velocity).toBe(0);
    expect(brakeAxis(12, 0, .002, 300, false)).toMatchObject({
      position: 12, velocity: 0, stopPosition: 12, stopSeconds: 0,
      stopTravel: 0, contact: false, contacted: false
    });
  });

  it('does not wrap rotation positions or discard multiple full revolutions', () => {
    const result = brakeAxis(179, 1, .0001, 10000, false);
    expect(result.position).toBeCloseTo(5179, 8);
    expect(result.stopPosition).toBeCloseTo(5179, 8);
    expect(result.stopTravel).toBeCloseTo(5000, 8);
    expect(result.stopSeconds).toBeCloseTo(10000, 8);
    expect(result.velocity).toBe(0);
  });

  it.each([1, -1])('detects and resolves a feather contact at the %s travel stop', sign => {
    const speed = .2, acceleration = .002, distance = 1;
    const hitTime = 2 * distance / (speed + Math.sqrt(speed ** 2 - 2 * acceleration * distance));
    const before = brakeAxis(sign * 89, sign * speed, acceleration, hitTime / 2, true);
    expect(before.contact).toBe(true);
    expect(before.contacted).toBe(false);
    expect(before.stopPosition).toBe(sign * 90);
    expect(before.stopTravel).toBeCloseTo(sign, 12);
    expect(before.stopSeconds).toBeCloseTo(hitTime, 12);
    expect(Math.abs(before.velocity)).toBeGreaterThan(0);
    const atContact = brakeAxis(sign * 89, sign * speed, acceleration, before.stopSeconds, true);
    expect(atContact.position).toBe(sign * 90);
    expect(atContact.velocity).toBe(0);
    expect(atContact.contacted).toBe(true);
    expect(brakeAxis(sign * 89, sign * speed, acceleration, 200, true).position).toBe(sign * 90);
  });

  it('does not label natural rest exactly at the feather limit as an impact', () => {
    const result = brakeAxis(89, .25, .03125, 8, true);
    expect(result).toMatchObject({ position: 90, velocity: 0, stopPosition: 90,
      stopSeconds: 8, stopTravel: 1, contact: false, contacted: false });
  });

  it('preserves zero-time velocity at a stop, then cancels outward velocity on positive elapsed time', () => {
    const initial = brakeAxis(90, .1, .002, 0, true);
    expect(initial).toMatchObject({ position: 90, velocity: .1, stopPosition: 90,
      stopSeconds: 0, stopTravel: 0, contact: true, contacted: false });
    const contact = brakeAxis(90, .1, .002, .001, true);
    expect(contact).toMatchObject({ position: 90, velocity: 0, contact: true, contacted: true });
    const inward = brakeAxis(90, -.1, .002, 50, true);
    expect(inward.position).toBeCloseTo(87.5, 12);
    expect(inward.contact).toBe(false);
  });

  it('sanitizes velocity and acceleration without allowing negative or unbounded braking', () => {
    expect(brakeAxis(0, 20, .002, 0, false).velocity).toBe(1);
    expect(brakeAxis(0, -20, .002, 0, false).velocity).toBe(-1);
    expect(brakeAxis(0, .1, 0, 0, false).stopSeconds).toBeCloseTo(1000, 10);
    expect(brakeAxis(0, .1, 100, 0, false).stopSeconds).toBeCloseTo(2, 10);
    for (const invalid of [undefined, null, '', NaN, Infinity, -Infinity, 'bad']) {
      expect(brakeAxis(0, .1, invalid, 0, false).stopSeconds).toBeCloseTo(50, 10);
      expect(brakeAxis(0, invalid, .002, 1, false).velocity).toBe(0);
      expect(brakeAxis(7, .1, .002, invalid, false).position).toBe(7);
    }
    expect(brakeAxis(7, .1, .002, -10, false).position).toBe(7);
    expect(brakeAxis(200, 0, .002, 0, true).position).toBe(90);
    expect(brakeAxis(-200, 0, .002, 0, true).position).toBe(-90);
  });

  it('is independent of how elapsed braking time is partitioned', () => {
    for (const limited of [false, true]) {
      const start = limited ? 89 : 174;
      const total = brakeAxis(start, .2, .002, 110.375, limited);
      let position = start, velocity = .2;
      for (const duration of [.001, .137, 4.873, 25.364, 80]) {
        const next = brakeAxis(position, velocity, .002, duration, limited);
        position = next.position; velocity = next.velocity;
      }
      expect(position).toBeCloseTo(total.position, 9);
      expect(velocity).toBeCloseTo(total.velocity, 12);
    }
  });
});

describe('space station latched motor braking', () => {
  it('engages at zero time without changing commands, position or stored velocity', () => {
    const result = drive(Object.freeze({ ...moving }), 0);
    expect(result).toMatchObject({ braking: true, alpha: 20, feather: -10,
      alphaRate: .04, featherRate: -.025, commandAlpha: 70, commandFeather: 20 });
  });

  it('applies maximum deceleration independently of target direction or the requested speed ceiling', () => {
    const options = { ...moving, motorRate: 0, arrayAlpha: -170, arrayFeather: -80 };
    const result = drive(options, .5);
    expect(result.alpha).toBeCloseTo(20.01975, 10);
    expect(result.feather).toBeCloseTo(-10.01225, 10);
    expect(result.alphaRate).toBeCloseTo(.039, 12);
    expect(result.featherRate).toBeCloseTo(-.024, 12);
    expect(result.braking).toBe(true);
  });

  it('stays latched at rest while orbital phase and tracking commands continue', () => {
    const options = { ...moving, tracking: true };
    const result = drive(options, 180);
    expect(result.alpha).toBeCloseTo(20.4, 8);
    expect(result.feather).toBeCloseTo(-10.15625, 8);
    expect(result.alphaRate).toBe(0);
    expect(result.featherRate).toBe(0);
    expect(result.braking).toBe(true);
    expect(result.slewing).toBe(false);
    expect(result.jointError).toBeGreaterThan(10);
    expect(result.phase).toBeCloseTo(moving.phase + 180 * orbitRate, 9);
    expect(result.commandAlpha).toBeCloseTo(result.phase, 9);
    const later = drive(carry(options, result), 600);
    expect(later.alpha).toBeCloseTo(result.alpha, 10);
    expect(later.feather).toBeCloseTo(result.feather, 10);
    expect(later.phase).toBeCloseTo(moving.phase + 780 * orbitRate, 9);
    expect(later.slewing).toBe(false);
  });

  it('resumes saved targets from the existing position and velocity', () => {
    const partial = drive(moving, 5);
    const options = { ...carry(moving, partial), motorBraking: false };
    const initial = drive(options, 0);
    expectPose(initial, partial, 10);
    expect(initial.braking).toBe(false);
    const resumed = drive(options, .5);
    expect(resumed.alphaRate).toBeGreaterThan(partial.alphaRate);
    expect(resumed.featherRate).toBeGreaterThan(partial.featherRate);
    expect(resumed.commandAlpha).toBe(70);
    expect(resumed.commandFeather).toBe(20);
  });

  it('ignores a brake request in instant or nonsmooth speed-limited modes', () => {
    for (const mode of [{ motorEnabled: false }, { motorSmooth: false }]) {
      const requested = drive({ ...moving, ...mode }, 3);
      const normal = drive({ ...moving, ...mode, motorBraking: false }, 3);
      expect(requested.braking).toBe(false);
      expectPose(requested, normal, 12);
    }
  });

  it('wraps rotation after braking and keeps feather contact separate from motor deceleration', () => {
    const result = drive({ ...moving, actualAlpha: 179.9, actualAlphaRate: .2,
      actualFeather: 89, actualFeatherRate: .2 }, 200);
    expect(result.alpha).toBeCloseTo(-170.1, 8);
    expect(result.feather).toBe(90);
    expect(result.alphaRate).toBe(0);
    expect(result.featherRate).toBe(0);
    expect(result.phase).toBeCloseTo(moving.phase + 200 * orbitRate, 9);
    expect(result.slewing).toBe(false);
  });

  it('does not introduce timestep-dependent travel at a fractional stopping instant', () => {
    const options = { ...moving, motorAcceleration: .05,
      actualAlpha: 0, actualFeather: 0, actualAlphaRate: .001, actualFeatherRate: -.001 };
    const result = drive(options, .05);
    expect(result.alpha).toBeCloseTo(.00001, 10);
    expect(result.feather).toBeCloseTo(-.00001, 12);
    expect(result.alphaRate).toBe(0);
    expect(result.featherRate).toBe(0);
  });

  it('matches a single integration after uneven steps across both stopping times', () => {
    const durations = [1.333, .007, 17.125, 50];
    let state = drive(moving, 0);
    for (const seconds of durations) state = drive(carry(moving, state), seconds);
    expectPose(state, drive(moving, durations.reduce((sum, value) => sum + value, 0)), 8);
  });
});

describe('space station stopping pose and trajectory', () => {
  it('predicts both signed travel distances and the last joint to reach rest', () => {
    const result = prediction(Object.freeze({ ...moving, motorBraking: false }));
    expect(result).toMatchObject({ enabled: true, moving: true, featherContact: false });
    expect(result.alpha).toBeCloseTo(20.4, 10);
    expect(result.feather).toBeCloseTo(-10.15625, 10);
    expect(result.alphaTravel).toBeCloseTo(.4, 12);
    expect(result.featherTravel).toBeCloseTo(-.15625, 12);
    expect(result.alphaStopSeconds).toBeCloseTo(20, 12);
    expect(result.featherStopSeconds).toBeCloseTo(12.5, 12);
    expect(result.seconds).toBeCloseTo(20, 12);
    expectVector(result.points[0], corner(20, -10));
    expectVector(result.points.at(-1), corner(result.alpha, result.feather));
  });

  it('uses simultaneous analytical joint positions throughout the 3D trajectory', () => {
    const options = { ...moving, actualAlphaRate: .2, actualFeatherRate: -.1 };
    const result = prediction(options);
    expect(result.points.length).toBeGreaterThan(2);
    for (let index = 0; index < result.points.length; index++) {
      const seconds = result.seconds * index / (result.points.length - 1);
      const alpha = brakeAxis(options.actualAlpha, options.actualAlphaRate, options.motorAcceleration, seconds, false);
      const feather = brakeAxis(options.actualFeather, options.actualFeatherRate, options.motorAcceleration, seconds, true);
      expectVector(result.points[index], corner(alpha.position, feather.position), 9);
      expect(Math.hypot(...result.points[index])).toBeCloseTo(Math.hypot(.45, .02, 3.7), 10);
    }
  });

  it('predicts hard-stop contact and includes the clamped final geometry', () => {
    const options = { ...moving, actualFeather: 89, actualFeatherRate: .2 };
    const result = prediction(options);
    expect(result.featherContact).toBe(true);
    expect(result.feather).toBe(90);
    expect(result.featherTravel).toBeCloseTo(1, 12);
    expect(result.featherStopSeconds).toBeLessThan(6);
    expect(result.seconds).toBeCloseTo(20, 10);
    expectVector(result.points.at(-1), corner(result.alpha, 90));
  });

  it('does not truncate a full stopping prediction to the drive integration time cap', () => {
    const result = prediction({ ...moving, actualAlpha: 10, actualAlphaRate: 1,
      actualFeatherRate: 0, motorAcceleration: .0001 });
    expect(result.seconds).toBeCloseTo(10000, 8);
    expect(result.alphaTravel).toBeCloseTo(5000, 8);
    expect(result.alpha).toBeCloseTo(-30, 8);
    expectVector(result.points.at(-1), corner(-30, -10));
    expect(result.points.length).toBeGreaterThan(65);
    expect(result.points.every(point => point.length === 3 && point.every(Number.isFinite))).toBe(true);
  });

  it('reports no motion at rest and disables prediction outside smooth mode', () => {
    const stopped = prediction({ ...moving, actualAlphaRate: 0, actualFeatherRate: 0 });
    expect(stopped).toMatchObject({ enabled: true, moving: false, seconds: 0,
      alphaTravel: 0, featherTravel: 0, featherContact: false });
    expectVector(stopped.points[0], corner(20, -10));
    expectVector(stopped.points.at(-1), corner(20, -10));
    expect(prediction({ ...moving, motorSmooth: false }).enabled).toBe(false);
    expect(prediction({ ...moving, motorEnabled: false }).enabled).toBe(false);
  });
});

describe('space station braking forecast consistency', () => {
  it('carries braking into every cached sample and fractional replay', () => {
    const result = forecast(Object.freeze({ ...moving }), 120);
    expect(result.base.motorBraking).toBe(true);
    expect(result.samples.every(sample => sample.braking === true)).toBe(true);
    for (const seconds of [0, .017, 5.1317, 12.5, 19.999, 20, 60.125, 120]) {
      const sample = at(result, seconds);
      expect(sample.braking).toBe(true);
      expectPose(sample, drive(moving, seconds), 8);
    }
    expect(result.samples.at(-1)).toMatchObject({ alphaRate: 0, featherRate: 0, slewing: false });
  });

  it('replays an exact hard-stop endpoint and keeps orbit moving after contact', () => {
    const options = { ...moving, actualFeather: 89, actualFeatherRate: .2 };
    const stop = prediction(options);
    const result = forecast(options, 600);
    const contact = at(result, stop.featherStopSeconds);
    expect(contact.feather).toBe(90);
    expect(contact.featherRate).toBe(0);
    expect(contact.alphaRate).toBeGreaterThan(0);
    const later = at(result, 300.125);
    expect(later.feather).toBe(90);
    expect(later.alphaRate).toBe(0);
    expect(later.phase).toBeCloseTo(moving.phase + 300.125 * orbitRate, 8);
  });

  it('preserves the cached brake decision when caller options are changed later', () => {
    const options = { ...moving };
    const result = forecast(options, 60);
    options.motorBraking = false;
    options.motorAcceleration = .05;
    options.arrayAlpha = -100;
    const sample = at(result, 30.125);
    expect(result.base.motorBraking).toBe(true);
    expectPose(sample, drive(moving, 30.125), 8);
    expect(sample.commandAlpha).toBe(70);
  });
});
