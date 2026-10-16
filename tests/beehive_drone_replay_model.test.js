import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const percent = { energyUnits: 'percent-of-difficulty-reserve' };
const model = (samples, run = percent, index) => BH.bhDroneReplayModel(samples, run, index);
const lane = (result, id) => result.lanes.find(item => item.id === id);

describe('Drone recorded telemetry replay model', () => {
  it('returns no model for absent samples and filters arrays or primitive entries', () => {
    for (const value of [undefined, null, false, 1, '', {}, [], [null, 0, 'sample', [], false]]) expect(model(value)).toBeNull();
    expect(model([null, { t: 2 }, [], false]).count).toBe(1);
  });

  it('retains at most the last 300 input positions before filtering malformed entries', () => {
    const samples = Array.from({ length: 302 }, (_, t) => ({ t, altitude: t }));
    samples[301] = null;
    const result = model(samples);
    expect(result.count).toBe(299);
    expect(result.samples[0].t).toBe(2);
    expect(result.sample.t).toBe(300);
    expect(result.positionText).toBe('Sample 299 of 299 retained');
  });

  it('defaults to the latest sample and safely bounds stored selection preferences', () => {
    const samples = [{ t: 0 }, { t: 1 }, { t: 2 }];
    for (const value of [undefined, null, NaN, Infinity, -Infinity, 'bad']) expect(model(samples, percent, value).index).toBe(2);
    for (const [value, index] of [[-3, 0], [0, 0], [.9, 0], [1.9, 1], ['1', 1], [99, 2]]) expect(model(samples, percent, value).index).toBe(index);
  });

  it('keeps irregular and equal recorded times without reordering samples', () => {
    const samples = [{ t: 0 }, { t: 2 }, { t: 10 }];
    expect(model(samples)).toMatchObject({ timed: true, firstTime: 0, lastTime: 10, timeText: '10 model seconds' });
    expect(model([{ t: 4 }, { t: 4 }])).toMatchObject({ timed: true, firstTime: 4, lastTime: 4 });
    const unordered = model([{ t: 8 }, { t: 2 }]);
    expect(unordered).toMatchObject({ timed: false, firstTime: null, lastTime: null, timeText: '2 model seconds' });
    expect(unordered.samples.map(sample => sample.t)).toEqual([8, 2]);
  });

  it('uses sample order for missing or invalid timestamps without inventing a time', () => {
    for (const t of [undefined, null, NaN, Infinity, '2']) {
      const result = model([{ t: 0 }, { t }]);
      expect(result).toMatchObject({ timed: false, timeText: 'Time not recorded', firstTime: null, lastTime: null });
    }
  });

  it('presents finite selected readings in a stable order with model units', () => {
    const result = model([{ t: 2.24, altitude: 123.26, energy: 42.26, wind: 1.25, phase: 'flight', action: '  Glide  ', hazard: false }]);
    expect(result.lanes.map(item => item.id)).toEqual(['altitude', 'energy', 'wind']);
    expect(lane(result, 'altitude')).toMatchObject({ label: 'Altitude', value: '123.3 model ft', unit: 'model ft', known: true, min: 0, max: 180 });
    expect(lane(result, 'energy')).toMatchObject({ label: 'Energy', value: '42.3%', unit: '% of difficulty reserve', known: true, min: 0, max: 100 });
    expect(lane(result, 'wind')).toMatchObject({ label: 'Wind', value: '1.3 m/s', unit: 'm/s', known: true, min: 0, max: 2 });
    expect(result).toMatchObject({ phase: 'En route', action: 'Glide', timeText: '2.2 model seconds', hazardText: 'No hazard flagged', changeText: 'Energy change not recorded' });
  });

  it('preserves missing-reading gaps and measured zeroes without filling the input', () => {
    const samples = [{ t: 0, energy: 80 }, { t: 2, altitude: 100 }, { t: 10, energy: 0, wind: 0 }];
    const gap = model(samples, percent, 1);
    expect(lane(gap, 'energy')).toMatchObject({ known: false, value: 'Not recorded' });
    expect(gap.changeText).toBe('Energy change not recorded');
    expect(gap.advice).toContain('Energy was not recorded');
    expect(samples[1]).not.toHaveProperty('energy');
    const end = model(samples);
    expect(lane(end, 'energy').value).toBe('0%');
    expect(lane(end, 'wind').value).toBe('0 m/s');
    expect(end.changeText).toBe('Energy change not recorded');
    expect(end.advice).toContain('Energy warning');
  });

  it('does not treat nonnumeric or nonfinite readings as evidence', () => {
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '', '0', false, [], {}]) {
      const result = model([{ t: 0, altitude: value, energy: value, wind: value }]);
      expect(result.lanes.every(item => !item.known && item.value === 'Not recorded')).toBe(true);
      expect(result.changeText).toBe('Energy change not recorded');
    }
  });

  it.each([undefined, null, '', 'percent', 'model-units', 'Percent-of-difficulty-reserve'])('keeps unrecognized energy units explicit (%s)', energyUnits => {
    const result = model([{ t: 0, energy: 40 }, { t: 1, energy: 20 }], { energyUnits });
    expect(result.energyPercent).toBe(false);
    expect(lane(result, 'energy')).toMatchObject({ value: '20 (units not recorded)', unit: 'units not recorded', min: 0, max: 40 });
    expect(result.changeText).toBe('Energy change: -20 (units not recorded)');
    expect(result.advice).toContain('units were not recorded');
    expect(result.advice).not.toContain('Energy warning');
  });

  it('keeps unknown-unit zeroes and positive changes explicit', () => {
    expect(model([{ energy: 0 }], {}).lanes[1].value).toBe('0 (units not recorded)');
    expect(model([{ energy: 0 }, { energy: 1.2 }], {}).changeText).toBe('Energy change: +1.2 (units not recorded)');
    expect(model([{ energy: 0 }, { energy: .04 }], {}).changeText).toBe('Energy change: no rounded change');
  });

  it('reports percentage-point changes with direction and singular grammar', () => {
    for (const [before, after, expected] of [[80, 60, '20 percentage points lower'], [60, 80, '20 percentage points higher'], [80, 79, '1 percentage point lower'], [79, 80, '1 percentage point higher'], [80, 79.84, '0.2 percentage points lower']]) {
      expect(model([{ energy: before }, { energy: after }]).changeText).toBe('Energy change: ' + expected);
    }
    expect(model([{ energy: 80 }, { energy: 79.96 }]).changeText).toBe('Energy change: no rounded change');
  });

  it('expands chart domains for out-of-range readings without clamping evidence', () => {
    const result = model([{ altitude: -12, energy: -4, wind: -1 }, { altitude: 240, energy: 120, wind: 8 }]);
    expect(lane(result, 'altitude')).toMatchObject({ min: -12, max: 240, scaleMinText: '-12', scaleMaxText: '240', value: '240 model ft' });
    expect(lane(result, 'energy')).toMatchObject({ min: -4, max: 120, value: '120%' });
    expect(lane(result, 'wind')).toMatchObject({ min: -1, max: 8, value: '8 m/s' });
    expect(model([{}], {}).lanes.every(item => item.max > item.min)).toBe(true);
  });

  it('does not invent a change when subtraction of finite values overflows', () => {
    const result = model([{ energy: -Number.MAX_VALUE }, { energy: Number.MAX_VALUE }]);
    expect(result.changeText).toBe('Energy change not recorded');
    expect(lane(result, 'energy').value).not.toMatch(/Infinity|NaN/);
    expect(lane(result, 'energy').scaleMaxText).not.toMatch(/Infinity|NaN/);
  });

  it('interprets hazard flags strictly and retains explicit false', () => {
    for (const hazard of [undefined, null, 0, 1, 'true', 'false', [], {}]) {
      const result = model([{ t: 0, energy: 50, hazard }]);
      expect(result.hazardText).toBe('Hazard status not recorded');
      expect(result.bookmarks.some(item => item.id === 'first-hazard')).toBe(false);
      expect(result.advice).not.toContain('Hazard flagged');
    }
    expect(model([{ hazard: false }]).hazardText).toBe('No hazard flagged');
    const flagged = model([{ hazard: false }, { hazard: true, impact: 'A recorded impact.' }]);
    expect(flagged.hazardText).toBe('Hazard flagged');
    expect(flagged.advice).toContain('Hazard flagged in this sample');
    expect(flagged.bookmarks.find(item => item.id === 'first-hazard').index).toBe(1);
  });

  it('keeps overlapping bookmark meanings at one sample', () => {
    const result = model([{ t: 0, altitude: 100, phase: 'congregation', hazard: true }]);
    expect(result.bookmarks.map(item => item.id)).toEqual(['launch', 'first-hazard', 'peak-altitude', 'dca', 'finish']);
    expect(result.selectedBookmarks).toEqual(result.bookmarks);
    expect(result.bookmarks[0].label).toBe('First sample');
    expect(result.bookmarks.at(-1).label).toBe('Last sample');
  });

  it('chooses the first retained peak and matching DCA phase without inferring entry from altitude', () => {
    const result = model([{ altitude: 200, phase: 'launch' }, { altitude: 200, phase: 'flight' }, { altitude: 20, phase: 'mating' }, { altitude: 10, phase: 'end' }]);
    expect(result.bookmarks.find(item => item.id === 'peak-altitude').index).toBe(0);
    expect(result.bookmarks.find(item => item.id === 'dca').index).toBe(2);
    expect(result.bookmarks[0].label).toBe('Launch');
    expect(result.bookmarks.at(-1).label).toBe('Flight end');
    expect(model([{ altitude: 300, phase: 'flight' }]).bookmarks.some(item => item.id === 'dca')).toBe(false);
  });

  it('preserves recorded textual impact and handles absent action or phase without guessing', () => {
    expect(model([{ impact: '  Recorded correction.  ', energy: 10 }]).advice).toBe('Recorded correction.');
    for (const value of [undefined, null, '', ' ', 3, {}, []]) expect(model([{ action: value }]).action).toBe('Not recorded');
    expect(model([{}]).phase).toBe('Phase not recorded');
    const phases = { launch: 'Taking off', flight: 'En route', congregation: 'DCA reached', mating: 'Queen intercepted', end: 'Flight complete' };
    for (const [phase, label] of Object.entries(phases)) expect(model([{ phase }]).phase).toBe(label);
  });

  it('does not mutate frozen input records, their array, or saved run metadata', () => {
    const samples = Object.freeze([Object.freeze({ t: 0, altitude: 10, energy: 80 }), Object.freeze({ t: 1, altitude: 20, energy: 70 })]);
    const run = Object.freeze({ ...percent, untouched: 'retained' });
    const before = JSON.stringify({ samples, run });
    const first = model(samples, run), second = model(samples, run);
    expect(first).toEqual(second);
    expect(first.samples).not.toBe(samples);
    first.lanes[0].value = 'changed'; first.bookmarks[0].label = 'changed'; first.samples.pop();
    expect(model(samples, run)).toEqual(second);
    expect(JSON.stringify({ samples, run })).toBe(before);
  });
});
