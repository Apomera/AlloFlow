import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const modelStart = source.indexOf('  var ISS_GM =');
const modelEnd = source.indexOf('  // Saved investigations');
const helperStart = source.indexOf('  var ISS_OPS_INPUTS =');
const helperEnd = source.indexOf('  // User-started clocks', helperStart);
if ([modelStart, modelEnd, helperStart, helperEnd].some(index => index < 0)) throw new Error('Station eclipse window helpers not found');
const { windowFor, power, target } = new Function(source.slice(modelStart, modelEnd) + source.slice(helperStart, helperEnd) +
  '\nreturn {windowFor:issOpsEclipseWindow,power:issPowerState,target:issOpsMeasurementTarget};')();

function pair(settings = {}) {
  return windowFor({ ...settings, opsEclipse: 35 }, { ...settings, opsEclipse: 45 });
}

describe('space station shared eclipse window', () => {
  it('compares both default setups over the same ten minutes and assigns load energy to its actual source', () => {
    const span = pair();
    expect(span).toMatchObject({ startMinute: 47, midMinute: 52, endMinute: 57 });
    expect(span.baseline).toMatchObject({ lit: true, endReserve: 100, batteryDeliveredKWh: 0, unservedKWh: 0 });
    expect(span.comparison).toMatchObject({ lit: false, solarToLoadsKWh: 0, unservedKWh: 0 });
    expect(span.baseline.startReserve).toBeCloseTo(99.81696488139829, 12);
    expect(span.comparison.startReserve).toBe(span.baseline.startReserve);
    expect(span.comparison.endReserve).toBeCloseTo(92.09766663578425, 12);
    expect(span.baseline.solarToLoadsKWh).toBeCloseTo(15.4, 12);
    expect(span.comparison.batteryDeliveredKWh).toBeCloseTo(15.4, 12);
    expect(span.comparison.requestedKWh).toBeCloseTo(15.4, 12);
    // Stored energy also covers the conversion loss on its way to the load.
    const drawn = (span.comparison.startReserve - span.comparison.endReserve) / 100 * 210;
    expect(span.comparison.batteryDeliveredKWh).toBeCloseTo(drawn * .95, 12);
    expect(drawn).toBeGreaterThan(span.comparison.batteryDeliveredKWh);
  });

  it('counts just the window shortfall when both stores were already empty', () => {
    const span = pair({ opsBattery: 5, opsArrayAngle: 0 });
    for (const side of [span.baseline, span.comparison]) {
      expect(side).toMatchObject({ startReserve: 0, endReserve: 0, solarToLoadsKWh: 0, batteryDeliveredKWh: 0 });
      expect(side.unservedKWh).toBeCloseTo(15.4, 12);
      expect(side.unservedKWh).toBe(side.requestedKWh);
    }
    expect(span.baseline.lit).toBe(true);
    expect(span.comparison.lit).toBe(false);
  });

  it('reports a partly served interval when the battery empties between the two entries', () => {
    const span = pair({ opsBattery: 40, opsArrayAngle: 0 });
    for (const side of [span.baseline, span.comparison]) {
      expect(side.startReserve).toBeGreaterThan(0);
      expect(side.endReserve).toBe(0);
      expect(side.solarToLoadsKWh).toBe(0);
      expect(side.batteryDeliveredKWh).toBeCloseTo(210 * .4 * .95 - 92.4 * 47 / 60, 12);
      expect(side.unservedKWh).toBeGreaterThan(0);
      expect(side.unservedKWh + side.batteryDeliveredKWh).toBeCloseTo(side.requestedKWh, 12);
    }
  });

  it('includes battery delivery on the sunlit side when generation is below demand', () => {
    const span = pair({ opsArrayAngle: 20 });
    const solar = 160 * Math.sin(20 * Math.PI / 180) * 10 / 60;
    expect(span.baseline.lit).toBe(true);
    expect(span.baseline.solarToLoadsKWh).toBeCloseTo(solar, 12);
    expect(span.baseline.batteryDeliveredKWh).toBeCloseTo(15.4 - solar, 12);
    expect(span.baseline.endReserve).toBeLessThan(span.baseline.startReserve);
    expect(span.comparison.batteryDeliveredKWh).toBeCloseTo(15.4, 12);
  });

  it('preserves a small real solar contribution without assigning one in eclipse', () => {
    const span = pair({ opsArrayAngle: .000000001 });
    const solar = 160 * Math.sin(.000000001 * Math.PI / 180) * 10 / 60;
    expect(span.baseline.solarToLoadsKWh).toBeGreaterThan(0);
    expect(span.baseline.solarToLoadsKWh).toBeCloseTo(solar, 12);
    expect(span.comparison.solarToLoadsKWh).toBe(0);
  });

  it('reveals different flows even when both whole-orbit minima are the same starting reserve', () => {
    const settings = { opsBattery: 20, opsCrew: 3, opsResearch: 0, opsArrayAngle: 90 };
    for (const eclipse of [35, 45]) expect(target({ ...settings, opsEclipse: eclipse }, 'batteryMin')).toMatchObject({ minute: 0, value: 20 });
    const span = pair(settings);
    expect(span.baseline.endReserve).toBeCloseTo(57.47523809523809, 12);
    expect(span.comparison.endReserve).toBeCloseTo(44.818763575605686, 12);
    expect(span.baseline.solarToLoadsKWh).toBeCloseTo(12.133333333333333, 12);
    expect(span.comparison.batteryDeliveredKWh).toBeCloseTo(12.133333333333333, 12);
  });

  it('preserves side identities when the source order reverses', () => {
    const a = Object.freeze({ opsEclipse: 35, opsCrew: 3, opsResearch: 10 });
    const b = Object.freeze({ opsEclipse: 45, opsCrew: 11, opsResearch: 100 });
    const forward = windowFor(a, b), backward = windowFor(b, a);
    expect(backward).toEqual({ ...forward, baseline: forward.comparison, comparison: forward.baseline });
    expect(forward.baseline.requestedKWh).toBeCloseTo((68 + 3 * 1.6 + 10 * .22) / 6, 12);
    expect(forward.comparison.requestedKWh).toBeCloseTo((68 + 11 * 1.6 + 100 * .22) / 6, 12);
    forward.baseline.endReserve = -1;
    expect(windowFor(a, b).baseline.endReserve).toBe(backward.comparison.endReserve);
  });

  it('retains fractional entry times and agrees with the model at the exact endpoints', () => {
    const a = { opsEclipse: 35.12345 }, b = { opsEclipse: 38.98765 }, span = windowFor(a, b);
    expect(span.startMinute).toBe(92 - b.opsEclipse);
    expect(span.endMinute).toBe(92 - a.opsEclipse);
    expect(span.midMinute).toBeGreaterThan(span.startMinute);
    expect(span.midMinute).toBeLessThan(span.endMinute);
    for (const [setup, side] of [[a, span.baseline], [b, span.comparison]]) {
      const config = { eclipse: setup.opsEclipse };
      expect(side.startReserve).toBe(power(config, span.startMinute).percent);
      expect(side.endReserve).toBe(power(config, span.endMinute).percent);
      expect(side.lit).toBe(power(config, span.midMinute).lit);
      expect(side.requestedKWh).toBeCloseTo(92.4 * (span.endMinute - span.startMinute) / 60, 12);
    }
  });

  it('keeps the inspection time in the half-open interval for adjacent representable entries', () => {
    const span = windowFor({ opsEclipse: 35 }, { opsEclipse: 35 + Number.EPSILON * 32 });
    expect(span.startMinute).toBeLessThan(span.endMinute);
    expect(span.midMinute).toBeGreaterThanOrEqual(span.startMinute);
    expect(span.midMinute).toBeLessThan(span.endMinute);
    expect(span.baseline.lit).toBe(true);
    expect(span.comparison.lit).toBe(false);
  });

  it('normalizes persisted input and yields no interval for equal modeled entries', () => {
    expect(windowFor(null, undefined)).toBeNull();
    expect(windowFor({ opsEclipse: '35' }, { opsEclipse: Infinity, opsBattery: 3 })).toBeNull();
    expect(windowFor({ opsEclipse: 57 }, { opsEclipse: 45 })).toBeNull();
    expect(windowFor({ opsEclipse: -8 }, { opsEclipse: '45' })).toEqual(windowFor({ opsEclipse: 20 }, { opsEclipse: 45 }));
  });

  it('accounts for all requested energy across low, full, charging and depleted stores', () => {
    for (const opsBattery of [0, 15, 40, 100]) for (const opsArrayAngle of [0, 15, 45, 90]) {
      const span = pair({ opsBattery, opsArrayAngle });
      for (const side of [span.baseline, span.comparison]) {
        expect(side.batteryDeliveredKWh).toBeGreaterThanOrEqual(0);
        expect(side.solarToLoadsKWh).toBeGreaterThanOrEqual(0);
        expect(side.unservedKWh).toBeGreaterThanOrEqual(0);
        expect(side.batteryDeliveredKWh + side.solarToLoadsKWh + side.unservedKWh).toBeCloseTo(side.requestedKWh, 12);
      }
    }
  });
});
