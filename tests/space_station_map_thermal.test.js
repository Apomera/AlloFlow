import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const api = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issThermalMargin(')) +
  '\nreturn { config: issMapThermalConfig, initial: issMapThermalInitial, inspect: issMapThermalInspect, step: issMapThermalStep, lighting: issMapLighting };'
)();
const area = 262.4, cabinCapacity = 24000, radiatorCapacity = 6000;
const initial = api.initial;

function near(actual, expected, tolerance = 1e-9) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}
function orbitAfter(orbit, seconds) {
  const light = api.lighting(orbit);
  return { phase: light.phase + 360 * seconds / light.periodSeconds, beta: light.beta };
}
function partition(options, orbit, duration, sizes) {
  let state = initial(), time = 0, index = 0;
  while (time < duration) {
    const seconds = Math.min(duration - time, sizes[index++ % sizes.length]);
    state = api.step(options, state, orbitAfter(orbit, time), seconds);
    time += seconds;
  }
  return state;
}
// Independent sunlight duration from analytic phase intervals. No thermal
// integration or per-step sample classification is used for this energy check.
function sunlightSeconds(orbit, duration) {
  const light = api.lighting(orbit);
  if (light.eclipseStart === null) return duration;
  const start = light.phase / 360 * light.periodSeconds, end = start + duration;
  const darkStart = light.eclipseStart / 360 * light.periodSeconds;
  const darkEnd = light.eclipseEnd / 360 * light.periodSeconds;
  let dark = 0;
  for (let revolution = -1; revolution <= Math.ceil(end / light.periodSeconds); revolution++) {
    const a = revolution * light.periodSeconds + darkStart;
    const b = revolution * light.periodSeconds + darkEnd;
    dark += Math.max(0, Math.min(end, b) - Math.max(start, a));
  }
  return duration - dark;
}
function checkBalances(options, state, orbit, tolerance = 2e-9) {
  const sample = api.inspect(options, state, orbit);
  near(sample.cabinBalanceKWh, 0, tolerance);
  near(sample.radiatorBalanceKWh, 0, tolerance);
  near(sample.balanceKWh, 0, tolerance);
  near(sample.cabinStoredKWh, cabinCapacity * (state.cabin - 22) / 3600);
  near(sample.radiatorStoredKWh, radiatorCapacity * (state.radiator - 4) / 3600);
  near(sample.storedKWh, sample.cabinStoredKWh + sample.radiatorStoredKWh);
}

describe('Map thermal model on the live orbital clock', () => {
  it('uses independent initial stores and the stated aggregate constants', () => {
    expect(initial()).toEqual({ elapsed: 0, cabin: 22, radiator: 4, generated: 0, absorbed: 0, radiated: 0, transferred: 0 });
    const config = api.config();
    expect(config).toMatchObject({ heatKW: 60, cooling: 86, pump: true, area, cabinCapacity, radiatorCapacity, emissivity: .85, sigma: 5.670374419e-8, stepSeconds: 5 });
    near(config.conductance, 3.44);
    const first = initial(), second = initial(); first.cabin = 30;
    expect(second.cabin).toBe(22);
  });

  it('matches independent temperature balances and Stefan–Boltzmann emission', () => {
    const state = { ...initial(), cabin: 26, radiator: 9 };
    const sample = api.inspect({ heatKW: 72, cooling: 70 }, state, { phase: 0, beta: 20 });
    const transfer = 2.8 * (26 - 9), absorbed = area * .031;
    const emitted = .85 * 5.670374419e-8 * area * ((9 + 273.15) ** 4 - 3 ** 4) / 1000;
    near(sample.transferKW, transfer); near(sample.absorbedKW, absorbed); near(sample.emittedKW, emitted);
    near(sample.cabinStorageKW, 72 - transfer); near(sample.radiatorStorageKW, transfer + absorbed - emitted);
    near(sample.cabinRate, (72 - transfer) / cabinCapacity * 60);
    near(sample.radiatorRate, (transfer + absorbed - emitted) / radiatorCapacity * 60);
  });

  it('radiates according to absolute fourth-power temperature, including in eclipse', () => {
    const cold = api.inspect({}, { ...initial(), radiator: 4 }, { phase: 180, beta: 0 });
    const warm = api.inspect({}, { ...initial(), radiator: 35 }, { phase: 180, beta: 0 });
    near(warm.emittedKW / cold.emittedKW, ((308.15 ** 4) - 81) / ((277.15 ** 4) - 81), 1e-12);
    expect(warm.emittedKW).toBeGreaterThan(cold.emittedKW);
    expect(cold.emittedKW).toBeGreaterThan(0); expect(cold.lit).toBe(false);
    near(cold.absorbedKW, area * .006);
  });

  it('reverses coolant heat transfer when the radiator is warmer than the cabin', () => {
    const sample = api.inspect({ heatKW: 0, cooling: 100 }, { ...initial(), cabin: 10, radiator: 30 }, { phase: 180, beta: 20 });
    expect(sample.transferKW).toBe(-80);
    expect(sample.cabinStorageKW).toBe(80); expect(sample.cabinRate).toBeGreaterThan(0);
    expect(sample.radiatorStorageKW).toBeLessThan(-80);
  });

  it('isolates the cabin when the pump is off while radiation continues', () => {
    const options = { heatKW: 80, pump: false }, orbit = { phase: 180, beta: 20 };
    const state = api.step(options, initial(), orbit, 600);
    near(state.cabin, 22 + 80 * 600 / cabinCapacity, 2e-12);
    near(state.generated, 80 * 600, 1e-8); near(state.transferred, 0, 0);
    const sample = api.inspect(options, state, orbitAfter(orbit, 600));
    expect(sample.pump).toBe(false); expect(sample.emittedKW).toBeGreaterThan(0);
    near(sample.transferKW, 0, 0); checkBalances(options, state, orbitAfter(orbit, 600));
  });

  it('allows zero conductance without misreporting the pump switch', () => {
    const sample = api.inspect({ cooling: 0, pump: true }, initial(), { phase: 0 });
    expect(sample.pump).toBe(true); expect(sample.cooling).toBe(0); near(sample.transferKW, 0, 0);
  });

  it('preserves both store balances and total energy over a complete orbit', () => {
    const options = { heatKW: 93, cooling: 43 }, orbit = { phase: 35, beta: 20 };
    const duration = api.lighting(orbit).periodSeconds;
    const state = api.step(options, initial(), orbit, duration);
    checkBalances(options, state, orbitAfter(orbit, duration), 1e-8);
    near(state.generated, 93 * duration, 2e-6);
    near(state.absorbed, area * (.006 * duration + .025 * sunlightSeconds(orbit, duration)), 2e-7);
  });

  for (const crossing of ['eclipseStart', 'eclipseEnd']) {
    it(`splits exactly at ${crossing} even when the event is inside a five-second step`, () => {
      const base = api.lighting({ phase: 0, beta: 20 });
      const beforeSeconds = 7.375, duration = 23.25;
      const orbit = { phase: base[crossing] - beforeSeconds / base.periodSeconds * 360, beta: 20 };
      const state = api.step({}, initial(), orbit, duration);
      const expectedLit = crossing === 'eclipseStart' ? beforeSeconds : duration - beforeSeconds;
      near(state.absorbed, area * (.006 * duration + .025 * expectedLit), 3e-9);
      const at = api.step({}, initial(), orbit, beforeSeconds);
      const after = api.step({}, at, orbitAfter(orbit, beforeSeconds), duration - beforeSeconds);
      near(state.cabin, after.cabin, 2e-10); near(state.radiator, after.radiator, 2e-10);
      near(state.radiated, after.radiated, 3e-6);
    });
  }

  it('keeps temperatures continuous across sunrise and sunset, while absorbed power changes', () => {
    const light = api.lighting({ phase: 0, beta: 20 });
    for (const event of [light.eclipseStart, light.eclipseEnd]) {
      const orbit = { phase: event - 60 * 360 / light.periodSeconds, beta: 20 };
      const before = api.step({}, initial(), orbit, 60 - 1e-4), after = api.step({}, initial(), orbit, 60 + 1e-4);
      near(after.cabin, before.cabin, 1e-6); near(after.radiator, before.radiator, 1e-6);
      const left = api.inspect({}, before, orbitAfter(orbit, 60 - 1e-4));
      const right = api.inspect({}, after, orbitAfter(orbit, 60 + 1e-4));
      near(Math.abs(right.absorbedKW - left.absorbedKW), area * .025, 1e-12);
      expect(left.lit).not.toBe(right.lit);
    }
  });

  it('handles phase wrap and several successive eclipse windows without losing energy', () => {
    const orbit = { phase: 351.125, beta: 40 }, period = api.lighting(orbit).periodSeconds;
    const duration = period * 2.3 + 11.125, state = api.step({}, initial(), orbit, duration);
    near(state.absorbed, area * (.006 * duration + .025 * sunlightSeconds(orbit, duration)), 2e-6);
    near(state.elapsed, duration, 0); checkBalances({}, state, orbitAfter(orbit, duration), 2e-8);
  });

  for (const beta of [80, Math.asin(6371 / (6371 + 420)) * 180 / Math.PI]) {
    it(`has no spurious eclipse at beta ${beta}`, () => {
      const orbit = { phase: 173.75, beta }, light = api.lighting(orbit);
      expect(light.eclipseStart).toBeNull();
      const duration = light.periodSeconds * 1.1, state = api.step({}, initial(), orbit, duration);
      near(state.absorbed, area * .031 * duration, 2e-7);
      expect(api.inspect({}, state, orbitAfter(orbit, duration)).lit).toBe(true);
    });
  }

  it('preserves temperatures and ledgers through zero-time configuration changes', () => {
    const orbit = { phase: 30, beta: 20 }, state = api.step({}, initial(), orbit, 127.375);
    const changed = api.step({ heatKW: 0, cooling: 0, pump: false }, state, orbitAfter(orbit, 127.375), 0);
    expect(changed).toEqual(state); expect(changed).not.toBe(state);
    const sample = api.inspect({ heatKW: 0, cooling: 0, pump: false }, changed, orbitAfter(orbit, 127.375));
    expect(sample.heatKW).toBe(0); expect(sample.transferKW).toBe(0);
    expect(sample.cabin).toBe(state.cabin); expect(sample.radiator).toBe(state.radiator);
    checkBalances({ heatKW: 0, cooling: 0, pump: false }, changed, orbitAfter(orbit, 127.375));
  });

  it('continues the same energy ledger after heat-load and pump changes', () => {
    const orbit = { phase: 70, beta: 0 };
    const first = api.step({ heatKW: 40, cooling: 70 }, initial(), orbit, 300);
    const second = api.step({ heatKW: 110, pump: false }, first, orbitAfter(orbit, 300), 180);
    near(second.generated, 40 * 300 + 110 * 180, 1e-7);
    near(second.transferred, first.transferred, 0);
    near(second.cabin, first.cabin + 110 * 180 / cabinCapacity, 2e-12);
    checkBalances({ heatKW: 110, pump: false }, second, orbitAfter(orbit, 480));
  });

  it('is invariant to ordinary clock partitions within integration tolerance', () => {
    const options = { heatKW: 120, cooling: 100 }, orbit = { phase: 118.2, beta: 20 }, duration = 1800.375;
    const direct = api.step(options, initial(), orbit, duration);
    const split = partition(options, orbit, duration, [.25, 17.375, 3.125, 91.7]);
    near(split.elapsed, direct.elapsed, 2e-10);
    near(split.cabin, direct.cabin, 2e-8); near(split.radiator, direct.radiator, 2e-8);
    for (const field of ['generated', 'absorbed', 'radiated', 'transferred']) near(split[field], direct[field], 2e-4);
    checkBalances(options, split, orbitAfter(orbit, duration));
  });

  it('agrees with quarter-second integration through a changing thermal load balance', () => {
    const options = { heatKW: 120, cooling: 100 }, orbit = { phase: 125, beta: 0 }, duration = 900;
    const coarse = api.step(options, initial(), orbit, duration);
    const medium = partition(options, orbit, duration, [1]);
    const fine = partition(options, orbit, duration, [.25]);
    const coarseError = Math.abs(coarse.cabin - fine.cabin) + Math.abs(coarse.radiator - fine.radiator);
    const mediumError = Math.abs(medium.cabin - fine.cabin) + Math.abs(medium.radiator - fine.radiator);
    expect(coarseError).toBeLessThan(2e-8);
    expect(mediumError).toBeLessThanOrEqual(coarseError + 2e-11);
    near(coarse.radiated, fine.radiated, 2e-4);
  });

  it('clamps control settings and treats only explicit false as pump off', () => {
    expect(api.config({ heatKW: 999, cooling: -20, pump: 'false' })).toMatchObject({ heatKW: 120, cooling: 0, conductance: 0, pump: true });
    expect(api.config({ heatKW: -5, cooling: 500, pump: false })).toMatchObject({ heatKW: 0, cooling: 100, conductance: 4, pump: false });
    expect(api.config({ heatKW: NaN, cooling: Infinity })).toMatchObject({ heatKW: 60, cooling: 86 });
  });

  it('uses initial values for malformed state fields without mutating the input', () => {
    const malformed = Object.freeze({ elapsed: NaN, cabin: Infinity, radiator: -300, generated: 'bad', absorbed: null, radiated: undefined, transferred: -Infinity });
    expect(api.step({}, malformed, {}, 0)).toEqual(initial());
    expect(api.step({}, null, {}, 0)).toEqual(initial());
    const sample = api.inspect({}, malformed, {});
    Object.values(sample).filter(value => typeof value === 'number').forEach(value => expect(Number.isFinite(value)).toBe(true));
    expect(malformed.cabin).toBe(Infinity);
  });

  it('does not advance invalid or negative durations and caps a single advance at one day', () => {
    for (const seconds of [undefined, null, '', 'bad', NaN, Infinity, -Infinity, -1]) expect(api.step({}, initial(), {}, seconds)).toEqual(initial());
    const state = api.step({ heatKW: 120, pump: false }, initial(), { phase: 0, beta: 80 }, 1e9);
    near(state.elapsed, 86400, 0); near(state.cabin, 22 + 120 * 86400 / cabinCapacity, 2e-8);
    checkBalances({ heatKW: 120, pump: false }, state, { phase: 0, beta: 80 }, 2e-7);
  });

  it('ignores unrelated Operations power and array configuration', () => {
    const orbit = { phase: 50, beta: 20 }, duration = 90;
    const reference = api.step({}, initial(), orbit, duration);
    const unrelated = api.step({ power: { generation: 0, battery: 0 }, opsRadiator: 30, arrayAlpha: 180 }, initial(), orbit, duration);
    expect(unrelated).toEqual(reference);
  });

  it('preserves frozen inputs, returns fresh states, and never advances the supplied orbit', () => {
    const options = Object.freeze({ heatKW: 70, cooling: 80, pump: true });
    const state = Object.freeze(initial()), orbit = Object.freeze({ phase: 351.75, beta: 25 });
    const before = JSON.stringify({ options, state, orbit });
    const first = api.step(options, state, orbit, 18.375), second = api.step(options, state, orbit, 18.375);
    expect(first).toEqual(second); expect(first).not.toBe(second); expect(first).not.toBe(state);
    first.cabin += 10; expect(first.cabin).not.toBe(second.cabin);
    api.inspect(options, state, orbit);
    expect(JSON.stringify({ options, state, orbit })).toBe(before);
  });
});
