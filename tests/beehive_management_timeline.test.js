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
const projection = (baseline = [10, 20, 30], withAction = [15, 15, 35], metric = 'honey') => ({
  action: { eligible: true }, daysCompared: baseline.length,
  baseline: { timeline: baseline.map((value, index) => ({ day: 11 + index, [metric]: value })) },
  withAction: { timeline: withAction.map((value, index) => ({ day: 11 + index, [metric]: value })) },
  differences: [{ key: metric, label: 'Untrusted supplied label', suffix: 'Untrusted suffix' }]
});
const colony = (overrides = {}) => ({
  ...BH.bhCreateNewColonyState(777, 1), day: 10, workers: 22000,
  honey: 80, pollen: 80, syrup: 12, diseaseRisk: 30, actionPoints: 3, ...overrides
});
const cfg = (overrides = {}) => ({
  params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 },
  siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [],
  rand: vi.fn(() => { throw new Error('Timeline consumed a live random draw'); }), ...overrides
});

describe('Beehive management preview timeline', () => {
  it('pairs only supplied future entries with a shared axis and signed daily differences', () => {
    const result = BH.bhManagementPreviewTimeline(projection(), 'honey');
    expect(result).toEqual({
      available: true, reason: '', metric: { id: 'honey', label: 'Combined food', suffix: ' lb' },
      points: [
        { day: 11, offset: 1, baseline: 10, withAction: 15, delta: 5 },
        { day: 12, offset: 2, baseline: 20, withAction: 15, delta: -5 },
        { day: 13, offset: 3, baseline: 30, withAction: 35, delta: 5 }
      ], min: 10, max: 35
    });
    expect(result.points.some(point => point.day === 10 || point.offset === 0)).toBe(false);
  });

  it.each(METRICS)('uses fixed safe metadata and supplied %s readings', (id, label, suffix) => {
    const preview = projection([1.25, 2], [2.25, 1], id);
    expect(BH.bhManagementPreviewTimeline(preview, id)).toMatchObject({
      available: true, metric: { id, label, suffix },
      points: [{ baseline: 1.25, withAction: 2.25, delta: 1 }, { baseline: 2, withAction: 1, delta: -1 }]
    });
  });

  it.each([undefined, null, 'wax', '__proto__', 'constructor', 'HONEY', 0, {}])('uses Combined food for an unsupported metric %s', metric => {
    expect(BH.bhManagementPreviewTimeline(projection(), metric).metric).toEqual({ id: 'honey', label: 'Combined food', suffix: ' lb' });
  });

  it.each([undefined, null, false, 0, 'preview', [], { action: { eligible: false } }, { action: { eligible: 1 } }, { action: { eligible: 'true' } }])('rejects ineligible or unrecorded preview %s', preview => {
    expect(BH.bhManagementPreviewTimeline(preview, 'workers')).toMatchObject({
      available: false, points: [], min: null, max: null, metric: { id: 'workers' }
    });
  });

  it.each([0, -1, 31, 7.5, '7', null, undefined, NaN, Infinity, true])('requires an integer common horizon from one to thirty, rejecting %s', count => {
    const preview = projection(); preview.daysCompared = count;
    expect(BH.bhManagementPreviewTimeline(preview, 'honey')).toMatchObject({ available: false, points: [], min: null, max: null });
  });

  it('rejects missing branches or timeline arrays even when forged object properties resemble data', () => {
    for (const branch of ['baseline', 'withAction']) {
      for (const value of [null, [], {}, { timeline: null }, { timeline: { 0: { day: 11, honey: 5 }, length: 3 } }]) {
        const preview = projection(); preview[branch] = value;
        expect(BH.bhManagementPreviewTimeline(preview, 'honey')).toMatchObject({ available: false, points: [], min: null, max: null });
      }
    }
  });

  it.each([
    ['missing day', point => { delete point.day; }],
    ['string day', point => { point.day = '12'; }],
    ['negative day', point => { point.day = -1; }],
    ['fractional day', point => { point.day = 12.5; }],
    ['unsafe day', point => { point.day = Number.MAX_SAFE_INTEGER + 1; }],
    ['NaN day', point => { point.day = NaN; }],
    ['infinite day', point => { point.day = Infinity; }],
    ['unmatched day', point => { point.day = 99; }],
    ['repeated day', point => { point.day = 11; }]
  ])('clears the whole pairing when a branch has %s', (label, change) => {
    for (const branch of ['baseline', 'withAction']) {
      const preview = projection(); change(preview[branch].timeline[1]);
      expect(BH.bhManagementPreviewTimeline(preview, 'honey')).toMatchObject({ available: false, points: [], min: null, max: null });
    }
  });

  it('rejects incomplete, sparse or array-shaped paired days without salvaging an apparently valid first point', () => {
    for (const branch of ['baseline', 'withAction']) {
      for (const corrupt of [timeline => timeline.pop(), timeline => { delete timeline[1]; }, timeline => { timeline[1] = Object.assign([], { day: 12, honey: 4 }); }]) {
        const preview = projection(); corrupt(preview[branch].timeline);
        expect(BH.bhManagementPreviewTimeline(preview, 'honey')).toMatchObject({ available: false, points: [] });
      }
    }
  });

  it('accepts strictly increasing explicit days and retains the supplied labels instead of inventing dates', () => {
    const preview = projection();
    [0, 120, 500].forEach((day, index) => {
      preview.baseline.timeline[index].day = day;
      preview.withAction.timeline[index].day = day;
    });
    expect(BH.bhManagementPreviewTimeline(preview, 'honey').points.map(point => [point.day, point.offset])).toEqual([[0, 1], [120, 2], [500, 3]]);
  });

  it.each([undefined, null, '5', true, [], {}, NaN, Infinity, -Infinity, -0.1])('leaves invalid reading %s unknown in either branch without hiding the other branch', value => {
    for (const branch of ['baseline', 'withAction']) {
      const preview = projection(); preview[branch].timeline[1].honey = value;
      const result = BH.bhManagementPreviewTimeline(preview, 'honey');
      expect(result.available).toBe(true);
      expect(result.points[1][branch]).toBeNull();
      expect(result.points[1][branch === 'baseline' ? 'withAction' : 'baseline']).toBe(branch === 'baseline' ? 15 : 20);
      expect(result.points[1].delta).toBeNull();
      expect(result.min).toBe(10); expect(result.max).toBe(35);
      expect(result.points[0].delta).toBe(5); expect(result.points[2].delta).toBe(5);
    }
  });

  it('preserves a single known branch value and does not turn missing readings into zeros', () => {
    const result = BH.bhManagementPreviewTimeline(projection([null, undefined, null], [null, 18, undefined]), 'honey');
    expect(result).toMatchObject({ available: true, min: 17, max: 19 });
    expect(result.points).toEqual([
      { day: 11, offset: 1, baseline: null, withAction: null, delta: null },
      { day: 12, offset: 2, baseline: null, withAction: 18, delta: null },
      { day: 13, offset: 3, baseline: null, withAction: null, delta: null }
    ]);
  });

  it('reports no chartable values while retaining valid dates and unknown daily readings', () => {
    const result = BH.bhManagementPreviewTimeline(projection([null, '4'], [undefined, NaN]), 'honey');
    expect(result).toMatchObject({ available: false, min: null, max: null });
    expect(result.reason).toContain('No recorded numeric readings');
    expect(result.points).toEqual([
      { day: 11, offset: 1, baseline: null, withAction: null, delta: null },
      { day: 12, offset: 2, baseline: null, withAction: null, delta: null }
    ]);
  });

  it.each([
    [0, 0, 1], [0.5, 0, 1.5], [20, 19, 21], [100, 95, 105]
  ])('keeps a flat reading of %s visible using a nonnegative common axis', (value, min, max) => {
    const result = BH.bhManagementPreviewTimeline(projection([value], [value]), 'honey');
    expect(result).toMatchObject({ available: true, min, max, points: [{ baseline: value, withAction: value, delta: 0 }] });
    expect(Object.is(result.points[0].delta, -0)).toBe(false);
  });

  it.each([
    [1.00049, 1.00051, 0.001], [1.00051, 1.00049, -0.001], [1.0004, 1.00049, 0],
    [3.123456, 5.678901, 2.556], [0.000499, 0.0005, 0.001]
  ])('uses the displayed three-decimal readings for %s versus %s', (baseline, withAction, delta) => {
    const result = BH.bhManagementPreviewTimeline(projection([baseline], [withAction]), 'honey');
    expect(result.points[0]).toMatchObject({ baseline, withAction, delta });
  });

  it('keeps finite common axes and deltas for very large finite supplied readings', () => {
    const flat = BH.bhManagementPreviewTimeline(projection([Number.MAX_VALUE], [Number.MAX_VALUE]), 'workers');
    // The metric is deliberately absent here; unknown values still remain unknown.
    expect(flat.available).toBe(false);
    const range = BH.bhManagementPreviewTimeline(projection([0], [Number.MAX_VALUE]), 'honey');
    expect(range).toMatchObject({ available: true, min: 0, max: Number.MAX_VALUE });
    expect(Number.isFinite(range.points[0].delta)).toBe(true);
    const flatKnown = BH.bhManagementPreviewTimeline(projection([Number.MAX_VALUE], [Number.MAX_VALUE]), 'honey');
    expect(flatKnown.available).toBe(true);
    expect(Number.isFinite(flatKnown.min)).toBe(true); expect(Number.isFinite(flatKnown.max)).toBe(true);
    expect(flatKnown.min).toBeLessThan(flatKnown.max);
  });

  it('reads only the common prefix and does not extend a shorter branch to the requested horizon', () => {
    const preview = projection(); preview.daysCompared = 2;
    Object.defineProperty(preview.baseline.timeline, '2', { get() { throw new Error('Read an unmatched branch tail'); } });
    Object.defineProperty(preview.withAction.timeline, '2', { get() { throw new Error('Read an unmatched branch tail'); } });
    const result = BH.bhManagementPreviewTimeline(preview, 'honey');
    expect(result.points).toHaveLength(2); expect(result.max).toBe(20);
    expect(result.points.at(-1).day).toBe(12);
  });

  it('returns fresh points and metadata without mutating or aliasing supplied evidence and timelines', () => {
    const preview = projection(); preview.notebook = { synthesis: 'Keep this explanation' };
    const original = structuredClone(preview);
    const first = BH.bhManagementPreviewTimeline(preview, 'honey');
    first.points[0].baseline = 999; first.metric.label = 'Changed only this result';
    const second = BH.bhManagementPreviewTimeline(preview, 'honey');
    expect(preview).toEqual(original);
    expect(second.points[0].baseline).toBe(10); expect(second.metric.label).toBe('Combined food');
    expect(first.points[1]).not.toBe(preview.baseline.timeline[1]);
    expect(first.points[1]).not.toBe(second.points[1]);
  });

  it('does not read unrelated notebook, immediate state, differences, end summaries or live randomness', () => {
    const preview = projection();
    for (const key of ['notebook', 'immediate', 'differences', 'toolData', 'rand']) {
      Object.defineProperty(preview, key, { get() { throw new Error('Read unrelated ' + key); } });
    }
    for (const branch of ['baseline', 'withAction']) {
      Object.defineProperty(preview[branch], 'end', { get() { throw new Error('Read an endpoint instead of daily values'); } });
    }
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Drew new randomness'); });
    try {
      expect(BH.bhManagementPreviewTimeline(preview, 'honey').points).toHaveLength(3);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it.each([
    ['feed_bees', 7], ['feed_bees', 30], ['requeen', 7], ['requeen', 30], ['split_colony', 7], ['split_colony', 30]
  ])('uses every real %s forecast point for a %s-day preview, including queen waiting days', (choice, horizon) => {
    const state = colony(), options = cfg();
    const preview = BH.bhPreviewManagementChoice(state, options, choice, horizon);
    const original = structuredClone(preview), savedState = structuredClone(state);
    for (const [id, label, suffix] of METRICS) {
      const result = BH.bhManagementPreviewTimeline(preview, id);
      expect(result).toMatchObject({ available: true, metric: { id, label, suffix } });
      expect(result.points).toHaveLength(preview.daysCompared);
      expect(result.points[0].day).toBe(state.day + 1);
      result.points.forEach((point, index) => {
        expect(point.day).toBe(state.day + index + 1);
        expect(point.offset).toBe(index + 1);
        expect(point.baseline).toBe(preview.baseline.timeline[index][id]);
        expect(point.withAction).toBe(preview.withAction.timeline[index][id]);
      });
    }
    if (choice === 'requeen') {
      const queen = BH.bhManagementPreviewTimeline(preview, 'queenHealth');
      expect(queen.points.slice(0, 2).map(point => point.withAction)).toEqual([0, 0]);
      expect(queen.points[2].withAction).toBe(100);
    }
    if (choice === 'split_colony' && horizon === 30) {
      const queen = BH.bhManagementPreviewTimeline(preview, 'queenHealth');
      expect(queen.points[19].withAction).toBe(0); expect(queen.points[20].withAction).toBe(90);
    }
    expect(preview).toEqual(original); expect(state).toEqual(savedState);
    expect(options.rand).not.toHaveBeenCalled();
  });

  it('uses the actual early-collapse common endpoint instead of a surviving branch’s longer end', () => {
    const state = colony({ day: 95, workers: 510, honey: 0, pollen: 0, brood: 0, broodCohorts: null });
    const options = cfg(), preview = BH.bhPreviewManagementChoice(state, options, 'feed_bees', 30);
    const result = BH.bhManagementPreviewTimeline(preview, 'workers');
    expect(preview.daysCompared).toBeLessThan(30);
    expect(result.available).toBe(true); expect(result.points).toHaveLength(preview.daysCompared);
    const last = result.points.at(-1), common = preview.daysCompared - 1;
    expect(last.day).toBe(state.day + preview.daysCompared);
    expect(last.baseline).toBe(preview.baseline.timeline[common].workers);
    expect(last.withAction).toBe(preview.withAction.timeline[common].workers);
    const endpoint = preview.differences.find(entry => entry.key === 'workers');
    expect(last.baseline).toBe(endpoint.baseline); expect(last.withAction).toBe(endpoint.withAction);
    expect(options.rand).not.toHaveBeenCalled();
  });
});
