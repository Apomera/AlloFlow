import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_tool_weathersystems.js', 'utf8');
const browser = { StemLab: { registerTool() {} } };
new Function('window', source)(browser);
const K = browser.WeatherSystemsKernel;
const state = (overrides = {}) => K.resolvedState({ scenario: 'fair', ...overrides });

describe('Weather atmosphere parcel experiment', () => {
  it('anchors the column to the selected station and current model hour', () => {
    const s = state({ scenario: 'coldFront', simHour: 7 });
    const station = K.stations.find((item) => item.id === 'coast');
    const observation = K.stationObservation(s, station);
    const profile = K.atmosphericProfile(s, { station: 'coast' });
    expect(profile.station.id).toBe('coast');
    expect(profile.hour).toBe(7);
    expect(profile.surface.temperature).toBe(observation.temperature);
    expect(profile.surface.pressure).toBe(observation.pressure);
    expect(profile.surface.humidity).toBe(observation.humidity);
    expect(profile.levels[0]).toMatchObject({ altitudeKm: 0, temperature: observation.temperature, parcelTemperature: observation.temperature, buoyancyDelta: 0 });
  });

  it('isolates humidity: more moisture lowers condensation height without changing environmental temperature', () => {
    const s = state({ temp: 25 });
    const dry = K.atmosphericProfile(s, { humidity: 30 });
    const moist = K.atmosphericProfile(s, { humidity: 90 });
    expect(moist.cloudBaseKm).toBeLessThan(dry.cloudBaseKm);
    expect(moist.surface.temperature).toBe(dry.surface.temperature);
    expect(moist.environmentalLapseRate).toBe(dry.environmentalLapseRate);
    expect(K.sampleProfileAt(moist, 3).temperature).toBe(K.sampleProfileAt(dry, 3).temperature);
    expect(K.sampleProfileAt(moist, 3).parcelTemperature).toBeGreaterThan(K.sampleProfileAt(dry, 3).parcelTemperature);
  });

  it('uses dry cooling below condensation, joins continuously, then cools more slowly', () => {
    const p = K.atmosphericProfile(state(), { humidity: 60 });
    const below = K.sampleProfileAt(p, p.cloudBaseKm / 2);
    const at = K.sampleProfileAt(p, p.cloudBaseKm);
    const above = K.sampleProfileAt(p, p.cloudBaseKm + 1);
    expect(below.parcelTemperature).toBeCloseTo(p.surface.temperature - 9.8 * below.altitudeKm, 1);
    expect(below.saturated).toBe(false);
    expect(at.parcelTemperature).toBe(at.parcelDewPoint);
    expect(at.saturated).toBe(true);
    expect(above.parcelTemperature).toBeCloseTo(at.parcelTemperature - 6, 1);
    expect(above.parcelDewPoint).toBe(above.parcelTemperature);
    expect(p.levels.some((point) => Math.abs(point.altitudeKm - p.cloudBaseKm) < 0.0001)).toBe(true);
  });

  it('handles saturation at the ground without division errors or negative cloud height', () => {
    const p = K.atmosphericProfile(state(), { humidity: 100, environmentalLapseRate: 8 });
    expect(p.cloudBaseKm).toBe(0);
    expect(p.freeConvectionKm).toBe(0);
    expect(p.levels.every((point) => point.saturated)).toBe(true);
    expect(K.sampleProfileAt(p, 1).parcelTemperature).toBe(p.surface.temperature - 6);
  });

  it('does not invent a visible cloud base or positive buoyancy when required lift exceeds the column', () => {
    const p = K.atmosphericProfile(state(), { humidity: 5, maxAltitudeKm: 1, environmentalLapseRate: 8 });
    expect(p.cloudBaseKm).toBeGreaterThan(1);
    expect(p.cloudBaseWithinProfile).toBe(false);
    expect(p.freeConvectionKm).toBeNull();
    expect(p.levels.every((point) => !point.saturated)).toBe(true);
    expect(p.levels.every((point) => point.buoyancyDelta <= 0)).toBe(true);
  });

  it('distinguishes stable, conditional and unstable columns using parcel temperature differences', () => {
    const stable = K.atmosphericProfile(state(), { humidity: 80, environmentalLapseRate: 4 });
    const conditional = K.atmosphericProfile(state(), { humidity: 80, environmentalLapseRate: 8 });
    const unstable = K.atmosphericProfile(state(), { humidity: 80, environmentalLapseRate: 11 });
    expect(stable.stability.id).toBe('stable');
    expect(stable.freeConvectionKm).toBeNull();
    expect(stable.levels.every((point) => point.buoyancyDelta <= 0)).toBe(true);
    expect(conditional.stability.id).toBe('conditional');
    expect(conditional.freeConvectionKm).toBeGreaterThan(conditional.cloudBaseKm);
    expect(K.sampleProfileAt(conditional, conditional.freeConvectionKm).buoyancyDelta).toBe(0);
    expect(K.sampleProfileAt(conditional, conditional.freeConvectionKm + 1).buoyancyDelta).toBeGreaterThan(0);
    expect(unstable.stability.id).toBe('unstable');
    expect(unstable.freeConvectionKm).toBe(0);
    expect(K.sampleProfileAt(unstable, 0.25).buoyancyDelta).toBeGreaterThan(0);
  });

  it('finds the freezing crossing and distinguishes a column already below freezing at its surface', () => {
    const warm = K.atmosphericProfile(state({ temp: 20 }), { environmentalLapseRate: 5 });
    expect(warm.freezingLevelKm).toBeCloseTo(warm.surface.temperature / 5, 6);
    expect(K.sampleProfileAt(warm, warm.freezingLevelKm).temperature).toBe(0);
    expect(warm.freezingStatus).toBe('withinProfile');
    const cold = K.atmosphericProfile(state({ temp: -10 }), { environmentalLapseRate: 5 });
    expect(cold.surfaceBelowFreezing).toBe(true);
    expect(cold.freezingStatus).toBe('surface');
    expect(cold.freezingLevelKm).toBeNull();
    expect(cold.levels.every((point) => point.temperature < 0)).toBe(true);
  });

  it('allows inversions and isothermal air without fabricating a freezing crossing', () => {
    const inversion = K.atmosphericProfile(state(), { environmentalLapseRate: -2 });
    expect(inversion.stability.id).toBe('stable');
    expect(inversion.freezingLevelKm).toBeNull();
    expect(K.sampleProfileAt(inversion, 1).temperature).toBe(inversion.surface.temperature + 2);
    const isothermal = K.atmosphericProfile(state(), { environmentalLapseRate: 0 });
    expect(isothermal.freezingLevelKm).toBeNull();
    expect(isothermal.levels.every((point) => point.temperature === isothermal.surface.temperature)).toBe(true);
    const coldInversion = K.atmosphericProfile(state({ temp: -5 }), { environmentalLapseRate: -2 });
    expect(coldInversion.freezingLevelKm).toBeGreaterThan(0);
    expect(K.sampleProfileAt(coldInversion, coldInversion.freezingLevelKm).temperature).toBe(0);
  });

  it('keeps the full range covered with non-divisible increments and exact transition points', () => {
    const p = K.atmosphericProfile(state(), { stepKm: 0.7, maxAltitudeKm: 5.3 });
    expect(p.levels[0].altitudeKm).toBe(0);
    expect(p.levels.at(-1).altitudeKm).toBe(5.3);
    expect(p.levels.every((point, index, points) => index === 0 || point.altitudeKm > points[index - 1].altitudeKm)).toBe(true);
    expect(K.sampleProfileAt(p, -1).altitudeKm).toBe(0);
    expect(K.sampleProfileAt(p, 99).altitudeKm).toBe(5.3);
  });

  it('keeps every scenario deterministic, finite, and parcel dew point at or below parcel temperature', () => {
    const violations = [];
    for (const scenario of K.scenarios) {
      for (const simHour of [0, 6, 12, 24]) {
        const s = state({ scenario: scenario.id, simHour });
        const p = K.atmosphericProfile(s);
        if (JSON.stringify(K.atmosphericProfile(s)) !== JSON.stringify(p)) violations.push(scenario.id + '@' + simHour + ': not deterministic');
        for (const level of p.levels) {
          if (!Number.isFinite(level.temperature) || !Number.isFinite(level.parcelTemperature) || !Number.isFinite(level.parcelDewPoint) || level.parcelDewPoint > level.parcelTemperature) {
            violations.push({ scenario: scenario.id, simHour, level });
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('sanitizes malformed numeric options and does not mutate supplied state or station', () => {
    const s = Object.freeze(state());
    const station = Object.freeze({ ...K.stations[0] });
    const p = K.atmosphericProfile(s, { station, humidity: Infinity, environmentalLapseRate: NaN, stepKm: -10, maxAltitudeKm: Infinity });
    expect(p.surface.humidity).toBe(p.baselineHumidity);
    expect(p.environmentalLapseRate).toBe(p.baselineEnvironmentalLapseRate);
    expect(p.maxAltitudeKm).toBe(6);
    expect(p.levels.length).toBeLessThan(85);
    const invalid = K.atmosphericProfile({ temp: NaN, humidity: Infinity, instability: 'invalid', simHour: NaN }, { station: { x: NaN, y: Infinity, elevation: NaN } });
    expect(invalid.levels.every((point) => Number.isFinite(point.temperature))).toBe(true);
    expect(K.atmosphericProfile(null).levels.length).toBeGreaterThan(0);
  });
});
