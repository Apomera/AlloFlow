import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const modelStart = source.indexOf('  var ISS_GM =');
const modelEnd = source.indexOf('  // Saved investigations');
const helperStart = source.indexOf('  function issOpsTimeline(');
const helperEnd = source.indexOf('  function issOpsTrial(', helperStart);
if ([modelStart, modelEnd, helperStart, helperEnd].some(value => value < 0)) throw new Error('Station timeline helpers not found');
const { timeline, power, air, thermal, attitude, inspectAir, inspectThermal, inspectAttitude } = new Function(
  source.slice(modelStart, modelEnd) + source.slice(helperStart, helperEnd) +
  '\nreturn {timeline:issOpsTimeline,power:issPowerState,air:issAirRun,thermal:issThermalRun,attitude:issAttitudeRun,inspectAir:issAirInspect,inspectThermal:issThermalInspect,inspectAttitude:issAttitudeInspect};'
)();

function scenario(options = {}) {
  const settings = options.power || {};
  return { power: settings, air: air({ power: settings, ...options.air }),
    thermal: thermal({ power: settings, ...options.thermal }), attitude: attitude(options.attitude), recovery: options.recovery ?? 98 };
}
const event = (result, id) => result.events.find(row => row.id === id);

describe('space station mission event timeline', () => {
  it('routes real model events and uses stable physical minutes', () => {
    const settings = scenario(), result = timeline(settings), end = power(settings.power, 92);
    expect(result.events.map(row => row.minute)).toEqual(result.events.map(row => row.minute).sort((a, b) => a - b));
    expect(event(result, 'start')).toEqual({ id: 'start', minute: 0, mode: 'integrated', kind: 'checkpoint' });
    expect(event(result, 'eclipse')).toEqual({ id: 'eclipse', minute: end.sunlightMinutes, mode: 'power', kind: 'checkpoint' });
    expect(event(result, 'end')).toEqual({ id: 'end', minute: 92, mode: 'integrated', kind: 'checkpoint' });
    expect(event(result, 'battery-full').minute).toBe(end.fullMinute);
    expect(event(result, 'battery-empty')).toBeUndefined();
    expect(result.inspections.power).toEqual({ minute: 92, kind: 'minimum' });
    expect(result.inspections.water).toEqual({ minute: null, kind: 'setup' });
    expect(timeline({ ...settings, recovery: 70 })).toEqual(result);
  });

  it('inspects a recovered air trial at its earlier peak and exposes both onset and restoration', () => {
    const settings = scenario({ air: { flow: 3, restore: true, restoreMinute: 70 } });
    const result = timeline(settings), model = settings.air;
    expect(model.peakPpm).toBeGreaterThan(4000);
    expect(inspectAir(model, 92).localPpm).toBeLessThan(4000);
    expect(result.inspections.air).toEqual({ minute: 70, kind: 'peak' });
    expect(event(result, 'air-limit')).toMatchObject({ minute: model.firstLimitMinute, mode: 'eclss', lab: 'air', kind: 'boundary' });
    expect(event(result, 'air-restore')).toMatchObject({ minute: 70, mode: 'eclss', lab: 'air', kind: 'intervention' });
    const reading = inspectAir(model, event(result, 'air-limit').minute);
    expect(Math.max(reading.localPpm, reading.cabinPpm)).toBeCloseTo(4000, 6);
    expect(event(result, 'air-limit').minute).not.toBe(Math.round(event(result, 'air-limit').minute));
  });

  it('finds the earliest CMG saturation before unloading and converts seconds exactly once', () => {
    const settings = scenario({ attitude: { cmg: 78, torque: 2.4, dump: true, burnMinute: 50 } });
    const result = timeline(settings), model = settings.attitude;
    expect(model.peakPercent).toBe(100);
    expect(inspectAttitude(model, 92).percent).toBeLessThan(80);
    expect(result.inspections.attitude.minute).toBe(model.firstCapacity / 60);
    expect(event(result, 'attitude-caution').minute).toBeCloseTo((.8 - .78) * 19000 / 2.4 / 60, 10);
    expect(event(result, 'attitude-capacity').minute).toBeCloseTo((1 - .78) * 19000 / 2.4 / 60, 10);
    expect(event(result, 'burn-start')).toMatchObject({ minute: 50, mode: 'attitude', kind: 'intervention' });
    expect(event(result, 'burn-end').minute).toBe(model.burnEnd / 60);
    expect(event(result, 'burn-end').minute).toBeGreaterThan(50);
  });

  it('finds an unsaturated pre-burn peak and an initially saturated peak', () => {
    const settings = scenario({ attitude: { cmg: 50, torque: .35, dump: true, burnMinute: 70 } });
    const result = timeline(settings), model = settings.attitude;
    expect(model.peakPercent).toBeLessThan(80);
    expect(result.inspections.attitude.minute).toBe(model.burnStart / 60);
    expect(inspectAttitude(model, result.inspections.attitude.minute).percent).toBeCloseTo(model.peakPercent, 10);
    expect(event(result, 'attitude-caution')).toBeUndefined();
    const saturated = timeline(scenario({ attitude: { cmg: 100, torque: 0, dump: true, burnMinute: 30 } }));
    expect(saturated.inspections.attitude).toEqual({ minute: 0, kind: 'peak' });
  });

  it('does not flatten a tiny unsaturated rise across the strict 80 percent boundary', () => {
    const settings = scenario({ attitude: { cmg: 79.9999999999, torque: 1e-11 } });
    const result = timeline(settings);
    expect(inspectAttitude(settings.attitude, 0).percent).toBeLessThan(80);
    expect(settings.attitude.peakPercent).toBeGreaterThan(80);
    expect(result.inspections.attitude).toEqual({ minute: 92, kind: 'peak' });
    expect(inspectAttitude(settings.attitude, result.inspections.attitude.minute).percent).toBe(settings.attitude.peakPercent);
    expect(event(result, 'attitude-caution').minute).toBe(settings.attitude.firstCaution / 60);
  });

  it.each([{ dump: false, expected: 92 }, { dump: true, expected: 70.12345 }])(
    'retains a real subprecision maximum at the correct phase boundary: %j', ({ dump, expected }) => {
      const settings = scenario({ attitude: { cmg: 50, torque: 1e-11, dump, burnMinute: 70.12345 } });
      const result = timeline(settings), model = settings.attitude;
      expect(model.peakPercent - inspectAttitude(model, 0).percent).toBeGreaterThan(0);
      expect(model.peakPercent - inspectAttitude(model, 0).percent).toBeLessThan(1e-8);
      expect(result.inspections.attitude.minute).toBe(expected);
      expect(inspectAttitude(model, expected).percent).toBe(model.peakPercent);
    }
  );

  it('starts the 100 percent plateau at the analytic capacity event even when unloading happens later', () => {
    const settings = scenario({ attitude: { cmg: 25, torque: Math.PI, dump: true, burnMinute: 85 } });
    const model = settings.attitude, firstCapacityMinute = model.firstCapacity / 60;
    expect(model.peakPercent).toBe(100);
    expect(firstCapacityMinute).toBeGreaterThan(70);
    expect(firstCapacityMinute).toBeLessThan(85);
    expect(inspectAttitude(model, firstCapacityMinute - .0001).percent).toBeLessThan(100);
    expect(inspectAttitude(model, 84).percent).toBe(100);
    expect(inspectAttitude(model, 92).percent).toBeLessThan(100);
    expect(timeline(settings).inspections.attitude.minute).toBe(firstCapacityMinute);
  });

  it('preserves distinct coincident initial boundaries in stable ID order', () => {
    const settings = scenario({ power: { battery: 0 }, air: { startPpm: 4500 }, thermal: { cabinStart: 16 },
      attitude: { cmg: 100, torque: 0, dump: true, burnMinute: 0 } });
    const result = timeline(settings);
    expect(result.events.filter(row => row.minute === 0).map(row => row.id)).toEqual([
      'start', 'battery-reserve', 'battery-empty', 'air-limit', 'thermal-limit', 'attitude-caution', 'attitude-capacity', 'burn-start'
    ]);
    expect(new Set(result.events.map(row => row.id)).size).toBe(result.events.length);
    expect(result.inspections.power.minute).toBe(0);
    expect(result.inspections.thermal).toEqual({ minute: 0, kind: 'minimum' });
    expect(result.inspections.attitude.minute).toBe(0);
  });

  it('omits events that never occur while retaining the three orbit checkpoints', () => {
    const settings = scenario({ power: { generation: 90, load: 90, battery: 80 }, attitude: { torque: 0 } });
    const result = timeline(settings);
    expect(result.events.map(row => row.id)).toEqual(['start', 'eclipse', 'end']);
    expect(result.inspections.attitude.minute).toBe(0);
    expect(timeline(scenario({ air: { flow: 180, restore: true } })).events.some(row => row.id === 'air-restore')).toBe(false);
    expect(timeline(scenario({ attitude: { dump: true, fuel: 0 } })).events.some(row => row.id === 'burn-start' || row.id === 'burn-end')).toBe(false);
  });

  it('does not mistake an initially charging 25% battery for a downward reserve crossing', () => {
    const above = timeline(scenario({ power: { generation: 160, load: 90, battery: 25 } }));
    expect(event(above, 'battery-reserve')).toBeUndefined();
    expect(above.inspections.power.minute).toBe(0);
    const settings = scenario({ power: { generation: 120, load: 90, battery: 25 } }), later = timeline(settings);
    expect(event(later, 'battery-reserve').minute).toBeGreaterThan(power(settings.power, 92).sunlightMinutes);
    expect(power(settings.power, event(later, 'battery-reserve').minute).percent).toBeCloseTo(25, 10);
    expect(event(timeline(scenario({ power: { generation: 80, load: 90, battery: 25 } })), 'battery-reserve').minute).toBe(0);
  });

  it('includes an exact end-of-orbit reserve boundary even when the inclusive rule passes', () => {
    const settings = scenario({ power: { generation: 100, load: 100, battery: 50, eclipse: 30, capacity: 200, dischargeEfficiency: 1 } });
    expect(power(settings.power, 92).minimumPercent).toBe(25);
    const result = timeline(settings);
    expect(event(result, 'battery-reserve').minute).toBeCloseTo(92, 10);
    expect(event(result, 'battery-reserve').kind).toBe('boundary');
    expect(result.inspections.power).toEqual({ minute: 92, kind: 'minimum' });
  });

  it('distinguishes a reserve plateau, depletion and the first minimum reading', () => {
    const flat = scenario({ power: { generation: 0, load: 0, battery: 25 } });
    expect(event(timeline(flat), 'battery-reserve')).toBeUndefined();
    expect(timeline(flat).inspections.power.minute).toBe(0);
    const plateau = scenario({ power: { generation: 100, load: 100, battery: 25 } });
    expect(event(timeline(plateau), 'battery-reserve').minute).toBe(57);
    const empty = scenario({ power: { generation: 0, load: 100, battery: 20 } });
    expect(timeline(empty).inspections.power.minute).toBe(power(empty.power, 92).emptyMinute);
    expect(event(timeline(empty), 'battery-reserve').minute).toBe(0);
    expect(event(timeline(scenario({ power: { generation: 0, load: 0, battery: 100 } })), 'battery-full').minute).toBe(0);
  });

  it.each([
    { samples: [{ minute: 0, cabin: 17 }, { minute: 50, cabin: 27.5 }], expected: { minute: 0, kind: 'minimum' } },
    { samples: [{ minute: 0, cabin: 17 }, { minute: 50, cabin: 29 }], expected: { minute: 50, kind: 'maximum' } },
    { samples: [{ minute: 20, cabin: 15 }, { minute: 10, cabin: 30 }], expected: { minute: 10, kind: 'maximum' } },
    { samples: [{ minute: 10, cabin: 15 }, { minute: 20, cabin: 30 }], expected: { minute: 10, kind: 'minimum' } },
    { samples: [{ minute: 0, cabin: 18 }, { minute: 10, cabin: 26 }, { minute: 20, cabin: 26 }], expected: { minute: 10, kind: 'maximum' } }
  ])('selects the limiting thermal extreme, with explicit comfortable and tie behavior: %j', ({ samples, expected }) => {
    expect(timeline({ ...scenario(), thermal: { samples, firstLimitMinute: null } }).inspections.thermal).toEqual(expected);
  });

  it('keeps thermal boundary events and inspection readings in agreement with the real model', () => {
    for (const options of [{ cabinStart: 16 }, { cabinStart: 30 }, { radiator: 30, cooling: 40 }, {}]) {
      const settings = scenario({ thermal: options }), result = timeline(settings), model = settings.thermal;
      if (model.firstLimitMinute === null) expect(event(result, 'thermal-limit')).toBeUndefined();
      else expect(event(result, 'thermal-limit').minute).toBe(model.firstLimitMinute);
      const point = result.inspections.thermal;
      expect(inspectThermal(model, point.minute).cabin).toBeCloseTo(point.kind === 'minimum' ? model.minCabin : model.maxCabin, 10);
    }
  });

  it('rejects nonfinite or out-of-window event times and safely defaults missing models', () => {
    const settings = scenario();
    const altered = { ...settings, air: { ...settings.air, firstLimitMinute: Infinity, restoreMinute: -1 },
      thermal: { ...settings.thermal, firstLimitMinute: 100 },
      attitude: { ...settings.attitude, firstCaution: NaN, firstCapacity: Infinity, burnStart: -1, burnEnd: 6000 } };
    const result = timeline(altered);
    for (const id of ['air-limit', 'air-restore', 'thermal-limit', 'attitude-caution', 'attitude-capacity', 'burn-start', 'burn-end']) expect(event(result, id)).toBeUndefined();
    for (const invalid of [null, undefined, {}, { air: {}, thermal: { samples: [{ minute: NaN, cabin: Infinity }] }, attitude: {} }]) {
      const defaults = timeline(invalid);
      expect(defaults).toEqual(timeline());
      defaults.events.forEach(row => { expect(Number.isFinite(row.minute)).toBe(true); expect(row.minute).toBeGreaterThanOrEqual(0); expect(row.minute).toBeLessThanOrEqual(92); });
    }
  });

  it('does not mutate supplied models and returns detached deterministic event snapshots', () => {
    const settings = scenario({ air: { flow: 3, restore: true, restoreMinute: 70 }, attitude: { cmg: 78, torque: 2.4, dump: true, burnMinute: 50 } });
    const original = JSON.stringify(settings);
    function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
    freeze(settings);
    const first = timeline(settings), expected = JSON.parse(JSON.stringify(first));
    first.events[0].minute = 30;
    first.inspections.air.minute = 0;
    expect(timeline(settings)).toEqual(expected);
    expect(JSON.stringify(settings)).toBe(original);
  });
});
