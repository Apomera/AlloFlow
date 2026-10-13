import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

const METRICS = [
  ['workers', 'Workers', ''], ['brood', 'Brood', ''], ['honey', 'Combined food', ' lb'],
  ['nectarHoney', 'Nectar honey', ' lb'], ['syrup', 'Syrup', ' lb'], ['pollen', 'Pollen stores', ' lb'], ['varroaLevel', 'Varroa pressure', ' pt'],
  ['diseaseRisk', 'Disease risk', ' pt'], ['morale', 'Morale', ' pt'], ['queenHealth', 'Queen health', '%']
];
const raw = (patch = {}) => ({
  day: 10, experimentRunSerial: 3, simulationSeed: 0, modelVersion: 'colony-daily-1.2',
  subspecies: 'italian', apiarySite: 'meadow',
  experimentEnvironment: { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 0 }, ...patch
});
const conditions = (patch = {}) => ({ stockId: 'italian', siteId: 'meadow', gardenBonus: 0, ...patch });
const preview = (baseline = [10, 20, 30], withAction = [15, 15, 35], metric = 'honey', choice = 'feed_bees') => ({
  action: { ...BH.BEEHIVE_MANAGEMENT_PREVIEW_CHOICES.find(item => item.id === choice), eligible: true }, daysCompared: baseline.length,
  baseline: { timeline: baseline.map((value, index) => ({ day: 11 + index, [metric]: value })) },
  withAction: { timeline: withAction.map((value, index) => ({ day: 11 + index, [metric]: value })) }
});
const capture = (...args) => {
  const inputs = [raw(), preview(), 'honey', 2, 7, conditions()];
  args.forEach((value, index) => { inputs[index] = value; });
  return BH.bhManagementProjectionCapture(...inputs);
};
const kept = () => ({ record: capture().record, lastDay: 10 });
const context = (...args) => {
  const inputs = [kept(), raw()];
  args.forEach((value, index) => { inputs[index] = value; });
  return BH.bhManagementProjectionContext(...inputs);
};
const freeze = object => {
  if (object && typeof object === 'object') { Object.values(object).forEach(freeze); Object.freeze(object); }
  return object;
};
const cfg = () => ({
  params: BH.SIMULATION_PARAMS, subMods: { honey: 1.1, spring: 1, winter: 0.92, varroa: 1 },
  siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [],
  rand: vi.fn(() => { throw new Error('Projection capture consumed a live random draw'); })
});
const colony = (patch = {}) => ({
  ...BH.bhCreateNewColonyState(777, 1), day: 10, workers: 24000, honey: 80, syrup: 12,
  pollen: 80, diseaseRisk: 30, actionPoints: 3, subspecies: 'italian', apiarySite: 'meadow', ...patch
});

describe('A kept management projection is explicit, frozen model evidence', () => {
  it('keeps the exact selected pair, source identity, conditions and canonical caution in a bounded primitive record', () => {
    const result = capture();
    expect(result).toEqual({ available: true, reason: '', record: {
      schemaVersion: 1,
      source: { day: 10, runSerial: 3, seed: 0, modelVersion: 'colony-daily-1.2', stockId: 'italian', siteId: 'meadow', gardenBonus: 0, gardenTrackedFromDay: 0 },
      action: { id: 'feed_bees', label: 'Feed', cost: 1 }, metric: { id: 'honey', label: 'Combined food', suffix: ' lb' },
      selected: { day: 12, offset: 2, baseline: 20, withAction: 15, delta: -5 }, requestedDays: 7, daysCompared: 3,
      text: 'Management projection | Model projection, not observed colony readings. | Source Day 10 → Projected Day 12 (+2) | Feed (1 AP) today versus do nothing | Requested: 7 days; paired: 3 days | Combined food: do nothing 20 lb; Feed 15 lb; difference -5 lb | Run 3 · Seed 0 · Model colony-daily-1.2 | Stock italian · Site meadow · Garden bonus 0%; tracked from Day 0 | Excludes random events, later management choices and AP refresh.'
    } });
    expect(result.record.text.length).toBeLessThan(1200);
    expect(result.record.text).not.toMatch(/Prediction:|Explanation:|better|benefit|will improve/i);
  });

  it.each(METRICS)('uses fixed %s metadata and the same displayed reading precision', (metric, label, suffix) => {
    const pair = preview([1.00049], [1.00051], metric);
    const result = capture(raw(), pair, metric, 1);
    expect(result).toMatchObject({ available: true, record: { metric: { id: metric, label, suffix }, selected: { baseline: 1.00049, withAction: 1.00051, delta: 0.001 } } });
    expect(result.record.text).toContain(label + ': do nothing 1' + suffix + '; Feed 1.001' + suffix + '; difference +0.001' + suffix);
  });

  it.each(['feed_bees', 'hive_hygiene', 'add_super', 'requeen', 'split_colony', 'winterize'])('uses the model’s fixed %s label and AP cost', choice => {
    const metadata = BH.BEEHIVE_MANAGEMENT_PREVIEW_CHOICES.find(item => item.id === choice);
    const result = capture(raw(), preview([1], [2], 'honey', choice), 'honey', 1);
    expect(result).toMatchObject({ available: true, record: { action: { id: choice, label: metadata.label, cost: metadata.cost } } });
    expect(result.record.text).toContain(metadata.label + ' (' + metadata.cost + ' AP) today versus do nothing');
  });

  it.each([undefined, null, 'wax', '__proto__', 'constructor', 'HONEY', 0, {}])('rejects unsupported measure %j instead of silently substituting food', metric => {
    expect(capture(raw(), preview(), metric)).toMatchObject({ available: false, record: null });
  });

  it('preserves real zero identity values, readings and difference while leaving missing readings unavailable', () => {
    const state = raw({ day: 0, simulationSeed: 0, experimentEnvironment: { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 0 } });
    const pair = preview([0], [0]); pair.baseline.timeline[0].day = 1; pair.withAction.timeline[0].day = 1;
    const result = capture(state, pair, 'honey', 1);
    expect(result).toMatchObject({ available: true, record: { source: { day: 0, seed: 0, gardenBonus: 0 }, selected: { day: 1, baseline: 0, withAction: 0, delta: 0 } } });
    expect(result.record.text).toContain('difference 0 lb');
    expect(Object.is(result.record.selected.delta, -0)).toBe(false);
    delete pair.baseline.timeline[0].honey;
    expect(capture(state, pair, 'honey', 1)).toMatchObject({ available: false, record: null });
  });

  it('formats negative-zero branch readings like the timing explorer’s visible zero', () => {
    const result = capture(raw(), preview([-0], [-0]), 'honey', 1);
    expect(result.available).toBe(true);
    expect(result.record.text).toContain('Combined food: do nothing 0 lb; Feed 0 lb; difference 0 lb');
    expect(result.record.text).not.toContain('-0');
    expect(context({ record: result.record, lastDay: 10 }).text).toBe(result.record.text);
  });

  it.each([
    [1.00049, 1.00051, '+0.001'], [1.00051, 1.00049, '-0.001'], [1.0004, 1.00049, '0'],
    [3.123456, 5.678901, '+2.556'], [0.000499, 0.0005, '+0.001']
  ])('records displayed arithmetic for %s and %s without implying a benefit', (baseline, withAction, difference) => {
    const result = capture(raw(), preview([baseline], [withAction]), 'honey', 1);
    expect(result.available).toBe(true); expect(result.record.text).toContain('difference ' + difference + ' lb');
  });

  it.each([7, 30])('keeps the requested %s-day horizon separate from a shorter common projection', horizon => {
    const result = capture(raw(), preview(), 'honey', 3, horizon);
    expect(result).toMatchObject({ available: true, record: { requestedDays: horizon, daysCompared: 3, selected: { day: 13, offset: 3 } } });
    expect(result.record.text).toContain('Requested: ' + horizon + ' days; paired: 3 days');
  });

  it('does not read a branch tail beyond the paired endpoint', () => {
    const pair = preview(); pair.daysCompared = 2;
    for (const branch of ['baseline', 'withAction']) Object.defineProperty(pair[branch].timeline, '2', { get() { throw new Error('Read an unmatched branch tail'); } });
    expect(capture(raw(), pair)).toMatchObject({ available: true, record: { daysCompared: 2, selected: { day: 12 } } });
  });

  it('keeps a known selected pair when a different projected day has missing readings', () => {
    const pair = preview([undefined, 20, null], [undefined, 15, null]);
    expect(capture(raw(), pair)).toMatchObject({ available: true, record: { selected: { baseline: 20, withAction: 15, delta: -5 } } });
  });

  it('copies every nested value and never aliases or writes input state, conditions or preview', () => {
    const state = freeze(raw()), pair = freeze(preview()), settings = freeze(conditions());
    const stateBefore = structuredClone(state), pairBefore = structuredClone(pair), settingsBefore = structuredClone(settings);
    const first = capture(state, pair, 'honey', 2, 7, settings), second = capture(state, pair, 'honey', 2, 7, settings);
    expect(first.available).toBe(true);
    for (const key of ['source', 'action', 'metric', 'selected']) expect(first.record[key]).not.toBe(second.record[key]);
    first.record.source.day = 999; first.record.action.label = 'Changed'; first.record.metric.label = 'Changed'; first.record.selected.baseline = 999;
    expect(second.record).toEqual(capture().record);
    expect(state).toEqual(stateBefore); expect(pair).toEqual(pairBefore); expect(settings).toEqual(settingsBefore);
  });

  it('never reads unrelated live data or random callbacks while capturing an already-computed pair', () => {
    const state = raw(), pair = preview(), settings = conditions();
    for (const key of ['notebook', 'managementTrail', 'actionPoints', 'workers', 'forecast', 'rand']) Object.defineProperty(state, key, { get() { throw new Error('Read unrelated state ' + key); } });
    for (const key of ['immediate', 'differences', 'rand']) Object.defineProperty(pair, key, { get() { throw new Error('Read unrelated preview ' + key); } });
    Object.defineProperty(settings, 'rand', { get() { throw new Error('Read live randomness'); } });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Drew new randomness'); });
    try { expect(capture(state, pair, 'honey', 2, 7, settings).available).toBe(true); expect(random).not.toHaveBeenCalled(); }
    finally { random.mockRestore(); }
  });
});

describe('Projection capture requires recorded identity, dates and conditions', () => {
  it.each([undefined, null, false, 0, 'colony', []])('rejects an absent or array-shaped colony %j', state => {
    expect(capture(state)).toMatchObject({ available: false, record: null });
  });

  it.each([
    ['day', [undefined, null, '10', true, -1, 10.5, 10000001, NaN, Infinity]],
    ['experimentRunSerial', [undefined, null, '3', true, 0, -1, 3.5, 10000001, NaN, Infinity]],
    ['simulationSeed', [undefined, null, '0', true, -1, 0.5, 4294967296, NaN, Infinity]],
    ['modelVersion', [undefined, null, 12, true, '', '   ', 'x'.repeat(65), 'unknown-model', 'model\n1']]
  ])('never supplies defaults for missing or malformed %s', (key, invalid) => {
    for (const value of invalid) expect(capture(raw({ [key]: value })), String(value)).toMatchObject({ available: false, record: null });
    const state = raw(); delete state[key]; expect(capture(state)).toMatchObject({ available: false, record: null });
  });

  it('accepts the exact recorded identity upper bounds without losing a future projected day', () => {
    const state = raw({ day: 10000000, experimentRunSerial: 10000000, simulationSeed: 4294967295 });
    const pair = preview([0], [1]); pair.baseline.timeline[0].day = 10000001; pair.withAction.timeline[0].day = 10000001;
    expect(capture(state, pair, 'honey', 1)).toMatchObject({ available: true, record: { source: { day: 10000000, runSerial: 10000000, seed: 4294967295 }, selected: { day: 10000001 } } });
  });

  it.each(['colony-daily-1.0', 'colony-daily-1.1', 'colony-daily-1.2-honeylab', 'x'.repeat(64)])('does not attribute current-rule projections to another recorded model %s', modelVersion => {
    const result = capture(raw({ modelVersion }));
    expect(result).toMatchObject({ available: false, record: null });
    expect(result.reason).toContain('current colony model');
    expect(result.reason).toContain('Advance one modeled day');
  });

  it.each([undefined, null, [], {}, { schemaVersion: 2, gardenBonus: 0, trackedFromDay: 0 }, { schemaVersion: 1, gardenBonus: '0', trackedFromDay: 0 }, { schemaVersion: 1, gardenBonus: -1, trackedFromDay: 0 }, { schemaVersion: 1, gardenBonus: 31, trackedFromDay: 0 }, { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 11 }, { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 0.5 }])('requires valid recorded garden conditions %j', experimentEnvironment => {
    expect(capture(raw({ experimentEnvironment }))).toMatchObject({ available: false, record: null });
  });

  it('retains a nonzero fractional garden bonus and its exact tracked day', () => {
    const result = capture(raw({ experimentEnvironment: { schemaVersion: 1, gardenBonus: 12.345, trackedFromDay: 8 } }), preview(), 'honey', 2, 7, conditions({ gardenBonus: 12.345 }));
    expect(result).toMatchObject({ available: true, record: { source: { gardenBonus: 12.345, gardenTrackedFromDay: 8 } } });
    expect(result.record.text).toContain('Garden bonus 12.345%; tracked from Day 8');
  });

  it.each([undefined, null, [], {}, { stockId: 'italian', siteId: 'meadow' }, { stockId: 'italian', siteId: 'meadow', gardenBonus: '0' }, { stockId: 'russian', siteId: 'meadow', gardenBonus: 0 }, { stockId: 'italian', siteId: 'mountain', gardenBonus: 0 }, { stockId: 'italian', siteId: 'meadow', gardenBonus: 1 }])('rejects missing or mismatched preview conditions %j', settings => {
    expect(capture(raw(), preview(), 'honey', 2, 7, settings)).toMatchObject({ available: false, record: null });
  });

  it('uses the intentional stock and site model defaults only when those settings are absent', () => {
    for (const value of [undefined, null, '']) {
      expect(capture(raw({ subspecies: value, apiarySite: value }))).toMatchObject({ available: true, record: { source: { stockId: 'italian', siteId: 'meadow' } } });
    }
    const state = raw(); delete state.subspecies; delete state.apiarySite;
    expect(capture(state).available).toBe(true);
    delete state.simulationSeed; expect(capture(state).available).toBe(false);
  });

  it.each(['subspecies', 'apiarySite'])('rejects unsafe or coerced %s settings rather than truncating them', key => {
    for (const value of ['x'.repeat(41), 'site\nname', 'site\u007fname', '   ', 9, true, [], {}]) {
      const settings = conditions({ [key === 'subspecies' ? 'stockId' : 'siteId']: value });
      expect(capture(raw({ [key]: value }), preview(), 'honey', 2, 7, settings)).toMatchObject({ available: false, record: null });
    }
  });

  it('requires own identity, environment, settings and preview fields instead of inherited data', () => {
    for (const key of ['day', 'experimentRunSerial', 'simulationSeed', 'modelVersion', 'experimentEnvironment', 'subspecies', 'apiarySite']) {
      const state = raw(), value = state[key]; delete state[key]; Object.setPrototypeOf(state, { [key]: value });
      expect(capture(state), key).toMatchObject({ available: false, record: null });
    }
    const inheritedEnvironment = Object.create({ schemaVersion: 1, gardenBonus: 0, trackedFromDay: 0 });
    expect(capture(raw({ experimentEnvironment: inheritedEnvironment })).available).toBe(false);
    const inheritedConditions = Object.create(conditions());
    expect(capture(raw(), preview(), 'honey', 2, 7, inheritedConditions).available).toBe(false);
    for (const key of ['action', 'baseline', 'withAction', 'daysCompared']) {
      const pair = preview(), value = pair[key]; delete pair[key]; Object.setPrototypeOf(pair, { [key]: value });
      expect(capture(raw(), pair), key).toMatchObject({ available: false, record: null });
    }
    const pair = preview(); pair.baseline.timeline[1] = Object.create({ day: 12, honey: 20 });
    expect(capture(raw(), pair).available).toBe(false);
  });

  it('accepts null-prototype records with their own required values', () => {
    const state = Object.assign(Object.create(null), raw());
    state.experimentEnvironment = Object.assign(Object.create(null), state.experimentEnvironment);
    const settings = Object.assign(Object.create(null), conditions());
    expect(capture(state, preview(), 'honey', 2, 7, settings).available).toBe(true);
  });

  it.each([undefined, null, false, 0, 'preview', [], { action: { eligible: false } }, { action: { eligible: 'true' } }])('rejects an absent or unavailable action %j', pair => {
    expect(capture(raw(), pair)).toMatchObject({ available: false, record: null });
  });

  it('rejects forged action names, costs, array-shaped actions and inherited action metadata', () => {
    for (const patch of [{ id: 'unknown' }, { label: 'Feed <benefit>' }, { cost: '1' }, { cost: 0 }, { eligible: 1 }]) {
      const pair = preview(); Object.assign(pair.action, patch); expect(capture(raw(), pair).available).toBe(false);
    }
    for (const action of [Object.assign([], preview().action), Object.create(preview().action)]) {
      const pair = preview(); pair.action = action; expect(capture(raw(), pair).available).toBe(false);
    }
  });

  it.each([undefined, null, '7', 0, 1, 8, 29, 31, 7.5, NaN, Infinity, true])('requires the exact supported requested horizon %j', horizon => {
    expect(capture(raw(), preview(), 'honey', 2, horizon)).toMatchObject({ available: false, record: null });
  });

  it.each([undefined, null, '2', 0, -1, 4, 2.5, NaN, Infinity, true])('requires a known selected paired offset %j', offset => {
    expect(capture(raw(), preview(), 'honey', offset)).toMatchObject({ available: false, record: null });
  });

  it('rejects an actual paired horizon beyond the requested one', () => {
    const pair = preview(Array(8).fill(1), Array(8).fill(2));
    expect(capture(raw(), pair, 'honey', 2, 7).available).toBe(false);
    expect(capture(raw(), pair, 'honey', 2, 30).available).toBe(true);
  });

  it('rejects source-day mismatches, skipped days and malformed unselected later dates', () => {
    expect(capture(raw({ day: 9 })).available).toBe(false);
    for (const day of [12, 15, null, '13', NaN]) {
      const pair = preview(); pair.baseline.timeline[2].day = day; pair.withAction.timeline[2].day = day;
      expect(capture(raw(), pair), String(day)).toMatchObject({ available: false, record: null });
    }
    const pair = preview(); pair.withAction.timeline[2].day = 14;
    expect(capture(raw(), pair).available).toBe(false);
  });

  it.each([undefined, null, '20', true, [], {}, NaN, Infinity, -Infinity, -0.1])('never saves missing or nonnumeric selected reading %j as zero', value => {
    for (const branch of ['baseline', 'withAction']) {
      const pair = preview(); pair[branch].timeline[1].honey = value;
      expect(capture(raw(), pair)).toMatchObject({ available: false, record: null });
    }
  });
});

describe('Kept projection context checks the identity and clock without rewriting history', () => {
  it('reports the frozen source day and current day separately during same-day use and later daily advance', () => {
    const wrapper = freeze(kept()), original = structuredClone(wrapper);
    for (const day of [10, 11, 20, 100]) {
      const result = context(wrapper, raw({ day }));
      expect(result).toMatchObject({ available: true, reason: '', sourceDay: 10, currentDay: day, text: wrapper.record.text });
      expect(result.record).toEqual(wrapper.record);
      expect(result.record).not.toBe(wrapper.record);
      for (const key of ['source', 'action', 'metric', 'selected']) expect(result.record[key]).not.toBe(wrapper.record[key]);
    }
    expect(wrapper).toEqual(original);
  });

  it('ignores current resource readings, AP, management history and forecast settings when checking a historical kept pair', () => {
    const state = raw({ day: 15 });
    for (const key of ['workers', 'brood', 'queenHealth', 'honey', 'syrup', 'actionPoints', 'managementTrail', 'notebook', 'rand']) Object.defineProperty(state, key, { get() { throw new Error('Read or projected live state ' + key); } });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Drew new randomness'); });
    try { expect(context(kept(), state).available).toBe(true); expect(random).not.toHaveBeenCalled(); }
    finally { random.mockRestore(); }
  });

  it.each([
    { experimentRunSerial: 4 }, { simulationSeed: 1 }, { modelVersion: 'colony-daily-1.1' },
    { subspecies: 'russian' }, { apiarySite: 'mountain' },
    { experimentEnvironment: { schemaVersion: 1, gardenBonus: 1, trackedFromDay: 0 } },
    { experimentEnvironment: { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 1 } }
  ])('blocks a kept record when its current identity or conditions changed (%j)', patch => {
    const wrapper = kept();
    expect(context(wrapper, raw(patch))).toMatchObject({ available: false, record: wrapper.record, sourceDay: 10, currentDay: 10, text: wrapper.record.text });
  });

  it('accepts the same intentional stock and site defaults while still requiring recorded current identity and garden data', () => {
    expect(context(kept(), raw({ subspecies: undefined, apiarySite: undefined })).available).toBe(true);
    expect(context(kept(), raw({ simulationSeed: undefined })).available).toBe(false);
    expect(context(kept(), raw({ experimentEnvironment: undefined })).available).toBe(false);
  });

  it.each([undefined, null, '10', 9, 11, 10.5, NaN, Infinity, true])('requires an exact known last-day guard %j', lastDay => {
    const wrapper = { ...kept(), lastDay };
    expect(context(wrapper)).toMatchObject({ available: false, record: wrapper.record, sourceDay: 10, currentDay: 10, text: wrapper.record.text });
  });

  it('detects rewind after normal daily advance even when the current clock is still after the source day', () => {
    const wrapper = { ...kept(), lastDay: 18 };
    expect(context(wrapper, raw({ day: 18 })).available).toBe(true);
    expect(context(wrapper, raw({ day: 17 }))).toMatchObject({ available: false, record: wrapper.record, sourceDay: 10, currentDay: 17 });
    expect(context(kept(), raw({ day: 9 })).available).toBe(false);
  });

  it('respects a recorded invalidation permanently even after matching settings and a later day return', () => {
    const wrapper = { ...kept(), lastDay: 18, invalidReason: 'The colony clock moved back. Keep a new projected pair.' };
    for (const day of [10, 18, 30]) expect(context(wrapper, raw({ day }))).toEqual({ available: false, reason: wrapper.invalidReason, record: wrapper.record, sourceDay: 10, currentDay: day, text: wrapper.record.text });
  });

  it.each([undefined, null, [], false, 'kept', { lastDay: 10 }])('rejects incomplete or array-shaped context %j', wrapper => {
    expect(context(wrapper)).toMatchObject({ available: false, record: null });
  });

  it('preserves a validated old record while an absent clock or missing current identity prevents use', () => {
    const record = capture().record;
    expect(context({ record })).toMatchObject({ available: false, record, sourceDay: 10, currentDay: 10, text: record.text });
    expect(context({ record, lastDay: 10 }, raw({ simulationSeed: undefined }))).toMatchObject({ available: false, record, sourceDay: 10, currentDay: null, text: record.text });
  });

  it('requires owned wrapper fields and rejects array-shaped nested record objects', () => {
    expect(context(Object.create(kept())).available).toBe(false);
    for (const key of ['source', 'action', 'metric', 'selected']) {
      const wrapper = kept(); wrapper.record[key] = Object.assign([], wrapper.record[key]);
      expect(context(wrapper), key).toMatchObject({ available: false, record: null });
    }
    const wrapper = kept(); wrapper.record = Object.assign([], wrapper.record);
    expect(context(wrapper).available).toBe(false);
  });

  it('rejects inherited record fields and unexpected nested mutable extras', () => {
    for (const key of ['schemaVersion', 'source', 'action', 'metric', 'selected', 'requestedDays', 'daysCompared', 'text']) {
      const wrapper = kept(), value = wrapper.record[key]; delete wrapper.record[key]; Object.setPrototypeOf(wrapper.record, { [key]: value });
      expect(context(wrapper), key).toMatchObject({ available: false, record: null });
    }
    const wrapper = kept(); wrapper.record.source.resourceSnapshot = { honey: 20 };
    expect(context(wrapper).available).toBe(false);
  });

  it.each([
    ['schema', value => { value.schemaVersion = 2; }],
    ['coerced source day', value => { value.source.day = '10'; }],
    ['missing run', value => { delete value.source.runSerial; }],
    ['unknown model', value => { value.source.modelVersion = 'unknown-model'; }],
    ['older model', value => { value.source.modelVersion = 'colony-daily-1.1'; }],
    ['other model rules', value => { value.source.modelVersion = 'colony-daily-1.2-honeylab'; }],
    ['unsafe stock', value => { value.source.stockId = 'stock\n'; }],
    ['future garden tracking', value => { value.source.gardenTrackedFromDay = 11; }],
    ['forged action label', value => { value.action.label = 'Better Feed'; }],
    ['coerced AP cost', value => { value.action.cost = '1'; }],
    ['unsupported metric', value => { value.metric.id = 'wax'; }],
    ['forged metric label', value => { value.metric.label = 'Harvestable honey'; }],
    ['forged suffix', value => { value.metric.suffix = ' harvest lb'; }],
    ['mismatched selected day', value => { value.selected.day = 13; }],
    ['selected offset after end', value => { value.selected.offset = 4; }],
    ['missing selected reading', value => { value.selected.baseline = null; }],
    ['negative reading', value => { value.selected.withAction = -1; }],
    ['coerced reading', value => { value.selected.baseline = '20'; }],
    ['nonfinite delta', value => { value.selected.delta = Infinity; }],
    ['forged delta', value => { value.selected.delta = 5; }],
    ['coerced requested horizon', value => { value.requestedDays = '7'; }],
    ['paired count after horizon', value => { value.daysCompared = 8; }],
    ['altered caution', value => { value.text = value.text.replace('not observed colony readings', 'observed colony readings'); }],
    ['altered source text', value => { value.text = value.text.replace('Source Day 10', 'Source Day 11'); }],
    ['blank text', value => { value.text = ''; }]
  ])('does not revive a corrupted kept record: %s', (label, corrupt) => {
    const wrapper = kept(); corrupt(wrapper.record);
    expect(context(wrapper)).toMatchObject({ available: false, record: null, text: '' });
  });

  it('accepts independent serialized copies and keeps future result edits detached from that copy', () => {
    const wrapper = JSON.parse(JSON.stringify(kept()));
    const first = context(wrapper), second = context(wrapper);
    first.record.selected.withAction = 123; first.record.source.seed = 888; first.record.metric.label = 'Changed';
    expect(second.record).toEqual(wrapper.record);
    expect(context(wrapper).record).toEqual(wrapper.record);
  });

  it.each([['feed_bees', 7], ['requeen', 7], ['split_colony', 30]])('keeps exact real %s pollen projections after serialization at a %s-day horizon', (choice, horizon) => {
    const state = colony(), options = cfg(), before = structuredClone(state);
    const pair = BH.bhPreviewManagementChoice(state, options, choice, horizon), original = structuredClone(pair);
    const offset = pair.daysCompared;
    const baseline = pair.baseline.timeline[offset - 1].pollen, withAction = pair.withAction.timeline[offset - 1].pollen;
    const displayed = value => Number(value.toLocaleString('en-US', { maximumFractionDigits: 3, useGrouping: false }));
    const delta = Math.round((displayed(withAction) - displayed(baseline)) * 1000) / 1000 || 0;
    const result = capture(state, pair, 'pollen', offset, horizon);
    expect(result).toMatchObject({ available: true, record: {
      metric: { id: 'pollen', label: 'Pollen stores', suffix: ' lb' },
      selected: { day: state.day + offset, offset, baseline, withAction, delta }
    } });
    expect(result.record.text).toContain('Pollen stores: do nothing ' + baseline.toLocaleString('en-US', { maximumFractionDigits: 3 }) + ' lb;');
    const wrapper = JSON.parse(JSON.stringify({ record: result.record, lastDay: state.day }));
    const later = context(wrapper, { ...state, day: state.day + 1, pollen: 0 });
    expect(later).toMatchObject({ available: true, sourceDay: state.day, currentDay: state.day + 1, text: result.record.text });
    expect(later.record).toEqual(result.record);
    expect(later.record).not.toBe(wrapper.record);
    expect(pair).toEqual(original); expect(state).toEqual(before); expect(options.rand).not.toHaveBeenCalled();
  });

  it.each([['feed_bees', 7], ['requeen', 7], ['split_colony', 30]])('keeps real %s previews and same-day actions distinct at a %s-day horizon', (choice, horizon) => {
    const state = colony(), options = cfg();
    const pair = BH.bhPreviewManagementChoice(state, options, choice, horizon), offset = choice === 'split_colony' ? 21 : 3;
    const result = capture(state, pair, 'queenHealth', offset, horizon), before = structuredClone(state);
    expect(result.available).toBe(true);
    expect(result.record.selected.withAction).toBe(pair.withAction.timeline[offset - 1].queenHealth);
    const wrapper = { record: result.record, lastDay: state.day };
    const action = BH.bhManagementAction(state, 'feed_bees', BH.SIMULATION_PARAMS);
    const afterFeed = { ...state, ...action.patch, actionPoints: state.actionPoints - action.cost };
    expect(context(wrapper, afterFeed)).toMatchObject({ available: true, sourceDay: 10, currentDay: 10, text: result.record.text });
    const daily = BH.bhStepColony(afterFeed, { ...options, rand: () => 1 });
    expect(context(wrapper, { ...afterFeed, ...daily.next })).toMatchObject({ available: true, sourceDay: 10, currentDay: 11, text: result.record.text });
    expect(state).toEqual(before); expect(options.rand).not.toHaveBeenCalled();
    if (choice === 'requeen') expect(pair.withAction.timeline.slice(0, 2).map(point => point.queenHealth)).toEqual([0, 0]);
    if (choice === 'split_colony') expect(pair.withAction.timeline[20].queenHealth).toBe(90);
  });
});

describe('Appending a projection preserves the learner’s writing and notebook limits', () => {
  it('appends exactly the kept canonical text while clearing only the evidence review flag', () => {
    const text = context().text;
    const entry = freeze({ title: 'My comparison', prediction: 'I think this change may matter.', evidence: 'My prior evidence', explanation: 'I need to check the difference.', nextStep: 'Try it carefully.', custom: { id: 44 }, review: { prediction: true, evidence: true, explanation: true, nextStep: false } });
    const saved = structuredClone(entry), result = BH.bhAppendNotebookEvidence(entry, text);
    expect(result).toMatchObject({ status: 'added', needed: 0, entry: { ...entry, evidence: 'My prior evidence\n' + text, review: { ...entry.review, evidence: false } } });
    expect(entry).toEqual(saved); expect(result.entry).not.toBe(entry); expect(result.entry.review).not.toBe(entry.review);
    expect(result.entry.prediction).toBe(entry.prediction); expect(result.entry.explanation).toBe(entry.explanation); expect(result.entry.custom).toBe(entry.custom);
  });

  it('detects an exact duplicate without replacing any writing or review metadata', () => {
    const text = context().text, entry = freeze({ evidence: 'Earlier evidence\n' + text, prediction: 'My prediction', explanation: 'My explanation', review: { evidence: true, prediction: true, explanation: false } });
    expect(BH.bhAppendNotebookEvidence(entry, text)).toEqual({ status: 'duplicate', entry, needed: 0 });
  });

  it('allows an exact 1200-character append and refuses an overfull notebook without trimming existing writing', () => {
    const text = context().text, prefix = 'x'.repeat(1200 - text.length - 1);
    expect(BH.bhAppendNotebookEvidence({ evidence: prefix, review: { evidence: true } }, text)).toMatchObject({ status: 'added', entry: { evidence: prefix + '\n' + text, review: { evidence: false } } });
    const entry = freeze({ evidence: prefix + 'x', prediction: 'Keep this', explanation: 'Keep this too', review: { evidence: true, prediction: true } });
    expect(BH.bhAppendNotebookEvidence(entry, text)).toEqual({ status: 'full', entry, needed: 1 });
    const full = freeze({ evidence: 'x'.repeat(1200), review: { evidence: true } });
    expect(BH.bhAppendNotebookEvidence(full, text)).toEqual({ status: 'full', entry: full, needed: text.length + 1 });
  });
});
