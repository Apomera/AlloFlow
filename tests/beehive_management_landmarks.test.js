import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

const point = (day, offset, delta, baseline = 10, withAction = 10 + delta) => ({ day, offset, baseline, withAction, delta });
const timeline = (deltas = [0, 2, -5, 5, 0]) => ({
  available: true, points: deltas.map((delta, index) => point(11 + index, index + 1, delta))
});
const EMPTY = {
  available: false, totalDays: 0, comparedDays: 0, missingDays: 0, differentDays: 0,
  allMatch: false, firstDifference: null, largestDifference: null, largestTieDays: 0
};
const colony = (overrides = {}) => ({
  ...BH.bhCreateNewColonyState(777, 1), day: 10, workers: 22000,
  honey: 80, pollen: 80, syrup: 12, diseaseRisk: 30, actionPoints: 3,
  notebook: { synthesis: 'Save this explanation', evidence: [{ day: 8, note: 'Observed the held colony' }] },
  ...overrides
});
const cfg = () => ({
  params: BH.SIMULATION_PARAMS, subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 },
  siteMods: { forage: 1, disease: 1 }, gardenBonus: 0, hiveEvents: [], diseaseEvents: [],
  rand: vi.fn(() => { throw new Error('Landmark work consumed a live random draw'); })
});
const projection = (baseline, withAction) => ({
  action: { eligible: true }, daysCompared: baseline.length,
  baseline: { timeline: baseline.map((value, index) => ({ day: 11 + index, honey: value })) },
  withAction: { timeline: withAction.map((value, index) => ({ day: 11 + index, honey: value })) }
});

describe('Beehive management timeline landmarks', () => {
  it('reports exact first and largest signed differences and keeps the earliest maximum tie', () => {
    const source = timeline();
    expect(BH.bhManagementTimelineLandmarks(source)).toEqual({
      available: true, reason: '', totalDays: 5, comparedDays: 5, missingDays: 0, differentDays: 3,
      allMatch: false, firstDifference: source.points[1], largestDifference: source.points[2], largestTieDays: 2
    });
  });

  it('does not prefer a later positive gap over an equally large earlier negative gap', () => {
    const source = timeline([-7, 7, -7, 6]);
    const result = BH.bhManagementTimelineLandmarks(source);
    expect(result.firstDifference).toEqual(source.points[0]);
    expect(result.largestDifference).toEqual(source.points[0]);
    expect(result.largestTieDays).toBe(3);
  });

  it('replaces an earlier tie count when a strictly larger difference appears', () => {
    const source = timeline([2, -2, 0, -8, 8]);
    expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject({
      differentDays: 4, firstDifference: source.points[0], largestDifference: source.points[3], largestTieDays: 2
    });
  });

  it('keeps the first difference separate from later changes in direction and peak size', () => {
    const source = timeline([0, -1, 4, -2, 0]);
    expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject({
      comparedDays: 5, differentDays: 3, firstDifference: source.points[1], largestDifference: source.points[2], largestTieDays: 1
    });
  });

  it('identifies all matching paired days while treating both zero signs as matches', () => {
    const source = timeline([0, -0, 0]);
    source.points[0].baseline = 0; source.points[0].withAction = 0;
    source.points[1].baseline = -0; source.points[1].withAction = -0;
    expect(BH.bhManagementTimelineLandmarks(source)).toEqual({
      available: true, reason: '', totalDays: 3, comparedDays: 3, missingDays: 0, differentDays: 0,
      allMatch: true, firstDifference: null, largestDifference: null, largestTieDays: 0
    });
  });

  it('keeps missing days separate from matches even when every recorded pair matches', () => {
    const source = timeline([0, 0, 0]); source.points[1].withAction = null;
    expect(BH.bhManagementTimelineLandmarks(source)).toEqual({
      available: true, reason: '', totalDays: 3, comparedDays: 2, missingDays: 1, differentDays: 0,
      allMatch: false, firstDifference: null, largestDifference: null, largestTieDays: 0
    });
  });

  it('counts incomplete pairs without inventing first or largest differences for them', () => {
    const source = timeline([4, 3, -6, 1]);
    source.points[0].baseline = undefined; source.points[2].delta = null;
    expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject({
      available: true, totalDays: 4, comparedDays: 2, missingDays: 2, differentDays: 2,
      allMatch: false, firstDifference: source.points[1], largestDifference: source.points[1], largestTieDays: 1
    });
  });

  it('reports the valid day count when all paired numeric readings are unavailable', () => {
    const source = timeline([1, 2, 3]);
    source.points[0].baseline = null; source.points[1].withAction = NaN; source.points[2].delta = Infinity;
    const result = BH.bhManagementTimelineLandmarks(source);
    expect(result).toEqual({
      available: false, reason: 'No paired numeric readings are recorded for these projected days.',
      totalDays: 3, comparedDays: 0, missingDays: 3, differentDays: 0, allMatch: false,
      firstDifference: null, largestDifference: null, largestTieDays: 0
    });
  });

  it('requires recorded finite nonnegative readings in both branches without numeric coercion', () => {
    for (const key of ['baseline', 'withAction']) {
      for (const value of [undefined, null, '10', true, [], {}, NaN, Infinity, -Infinity, -0.001]) {
        const source = timeline([1, 2]); source.points[0][key] = value;
        expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject({
          available: true, totalDays: 2, comparedDays: 1, missingDays: 1, differentDays: 1,
          firstDifference: source.points[1], largestDifference: source.points[1], largestTieDays: 1
        });
      }
    }
  });

  it('requires a finite supplied delta instead of reconstructing a missing or coerced difference', () => {
    for (const value of [undefined, null, '1', true, [], {}, NaN, Infinity, -Infinity]) {
      const source = timeline([1, -2]); source.points[0].delta = value;
      expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject({
        comparedDays: 1, missingDays: 1, differentDays: 1, firstDifference: source.points[1], largestDifference: source.points[1]
      });
    }
  });

  it('supports finite extreme magnitudes without subtraction or multiplication overflow', () => {
    const source = { available: true, points: [
      point(1, 1, Number.MAX_VALUE, 0, Number.MAX_VALUE),
      point(2, 2, -Number.MAX_VALUE, Number.MAX_VALUE, 0)
    ] };
    expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject({
      available: true, comparedDays: 2, missingDays: 0, differentDays: 2,
      firstDifference: source.points[0], largestDifference: source.points[0], largestTieDays: 2
    });
  });

  it('requires a record and literal availability instead of trusting lookalike truthy input', () => {
    for (const source of [undefined, null, false, 1, 'timeline', [], { available: false }, { available: 1 }, { available: 'true' }]) {
      const result = BH.bhManagementTimelineLandmarks(source);
      expect(result).toMatchObject(EMPTY); expect(result.reason).toBeTruthy();
    }
  });

  it('requires one to thirty actual points, rejecting empty, oversized and object-shaped collections', () => {
    for (const points of [undefined, null, {}, { 0: point(11, 1, 2), length: 1 }, [], Array.from({ length: 31 }, (_, index) => point(index, index + 1, 1))]) {
      const result = BH.bhManagementTimelineLandmarks({ available: true, points });
      expect(result).toMatchObject(EMPTY); expect(result.reason).toBeTruthy();
    }
  });

  it('rejects an entire malformed sequence without retaining earlier apparently valid landmarks', () => {
    for (const value of [null, undefined, false, 4, 'point', Object.assign([], point(12, 2, 3))]) {
      const source = timeline([1, 3]); source.points[1] = value;
      expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject(EMPTY);
    }
    const sparse = timeline([1, 3]); delete sparse.points[1];
    expect(BH.bhManagementTimelineLandmarks(sparse)).toMatchObject(EMPTY);
  });

  it('requires safe increasing explicit days and exact sequential offsets throughout the timeline', () => {
    const invalidDays = [undefined, null, '12', -1, 12.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, 11, 10];
    for (const day of invalidDays) {
      const source = timeline([1, 3]); source.points[1].day = day;
      expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject(EMPTY);
    }
    for (const offset of [undefined, null, '2', 0, 1, 2.1, 3, NaN, Infinity]) {
      const source = timeline([1, 3]); source.points[1].offset = offset;
      expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject(EMPTY);
    }
  });

  it('preserves day zero, explicit gaps and the last safe integer date without inventing intermediate days', () => {
    const source = { available: true, points: [point(0, 1, 0), point(120, 2, -2), point(Number.MAX_SAFE_INTEGER, 3, 4)] };
    expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject({
      totalDays: 3, comparedDays: 3, firstDifference: source.points[1], largestDifference: source.points[2]
    });
  });

  it('supports a single paired day and the full thirty-day boundary', () => {
    const one = timeline([-3]);
    expect(BH.bhManagementTimelineLandmarks(one)).toMatchObject({
      totalDays: 1, comparedDays: 1, differentDays: 1, firstDifference: one.points[0], largestDifference: one.points[0], largestTieDays: 1
    });
    const full = timeline(Array(30).fill(0)); full.points[29].delta = 0.001;
    expect(BH.bhManagementTimelineLandmarks(full)).toMatchObject({
      totalDays: 30, comparedDays: 30, differentDays: 1, firstDifference: full.points[29], largestTieDays: 1
    });
  });

  it('copies landmark cards independently without mutating or aliasing the supplied timeline', () => {
    const source = timeline([2, -1, 0]), saved = structuredClone(source);
    const first = BH.bhManagementTimelineLandmarks(source);
    expect(first.firstDifference).not.toBe(source.points[0]);
    expect(first.largestDifference).not.toBe(source.points[0]);
    expect(first.firstDifference).not.toBe(first.largestDifference);
    first.firstDifference.baseline = 999;
    expect(first.largestDifference.baseline).toBe(10);
    first.largestDifference.delta = 123;
    const second = BH.bhManagementTimelineLandmarks(source);
    expect(source).toEqual(saved);
    expect(second.firstDifference).toEqual(saved.points[0]);
    expect(second.largestDifference).toEqual(saved.points[0]);
  });

  it('reads only supplied timing points and never accesses unrelated forecasts, tool data or randomness', () => {
    const source = timeline([0, 2]);
    for (const key of ['metric', 'min', 'max', 'baseline', 'withAction', 'notebook', 'toolData', 'rand', 'forecast']) {
      Object.defineProperty(source, key, { get() { throw new Error('Read unrelated ' + key); } });
    }
    for (const reading of source.points) {
      Object.defineProperty(reading, 'state', { get() { throw new Error('Read live colony state'); } });
    }
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Drew new randomness'); });
    try {
      expect(BH.bhManagementTimelineLandmarks(source)).toMatchObject({ available: true, comparedDays: 2, differentDays: 1 });
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('uses displayed three-decimal differences rather than raw floating-point changes for landmarks', () => {
    const input = projection([1.0004, 1.00049, 3.123456], [1.00049, 1.00051, 5.678901]);
    const supplied = BH.bhManagementPreviewTimeline(input, 'honey');
    const result = BH.bhManagementTimelineLandmarks(supplied);
    expect(supplied.points.map(reading => reading.delta)).toEqual([0, 0.001, 2.556]);
    expect(result).toMatchObject({
      totalDays: 3, comparedDays: 3, differentDays: 2,
      firstDifference: supplied.points[1], largestDifference: supplied.points[2], largestTieDays: 1
    });
  });

  it('describes all same displayed readings honestly even when their raw values differ', () => {
    const supplied = BH.bhManagementPreviewTimeline(projection([1.0004, 2.0001], [1.00049, 2.0002]), 'honey');
    expect(supplied.points.every(reading => reading.baseline !== reading.withAction)).toBe(true);
    expect(BH.bhManagementTimelineLandmarks(supplied)).toMatchObject({
      available: true, allMatch: true, differentDays: 0, firstDifference: null, largestDifference: null
    });
  });

  it('does not let one known chart branch imply a paired comparison exists', () => {
    const supplied = BH.bhManagementPreviewTimeline(projection([null, null], [10, 11]), 'honey');
    expect(supplied.available).toBe(true);
    expect(BH.bhManagementTimelineLandmarks(supplied)).toMatchObject({
      available: false, totalDays: 2, comparedDays: 0, missingDays: 2, differentDays: 0, allMatch: false
    });
  });

  it('keeps a real seven-day Requeen worker projection distinct from its delayed thirty-day difference', () => {
    // Match the browser's Italian-stock colony. The inherited age buckets are
    // deliberately retained; the model normalizes them against the 6,000 brood.
    const state = {
      ...BH.bhCreateNewColonyState(777, 3, 0), day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90,
      notebook: { synthesis: 'Save this explanation', evidence: [{ day: 8, note: 'Observed the held colony' }] }
    };
    const options = cfg();
    options.subMods = { honey: 1.10, spring: 1, winter: .92, varroa: 1 };
    const savedState = structuredClone(state);
    const shortPreview = BH.bhPreviewManagementChoice(state, options, 'requeen', 7);
    const longPreview = BH.bhPreviewManagementChoice(state, options, 'requeen', 30);
    const savedShort = structuredClone(shortPreview), savedLong = structuredClone(longPreview);
    const shortTimeline = BH.bhManagementPreviewTimeline(shortPreview, 'workers');
    const longTimeline = BH.bhManagementPreviewTimeline(longPreview, 'workers');
    expect(BH.bhManagementTimelineLandmarks(shortTimeline)).toMatchObject({
      available: true, totalDays: 7, comparedDays: 7, missingDays: 0, differentDays: 0,
      allMatch: true, firstDifference: null, largestDifference: null, largestTieDays: 0
    });
    const result = BH.bhManagementTimelineLandmarks(longTimeline);
    expect(result.available).toBe(true); expect(result.allMatch).toBe(false);
    expect(result.totalDays).toBe(30); expect(result.firstDifference.offset).toBeGreaterThan(7);
    expect(result.firstDifference.offset).toBeLessThanOrEqual(30);
    expect(result.firstDifference).toEqual(longTimeline.points[result.firstDifference.offset - 1]);
    expect(result.largestDifference).toEqual(longTimeline.points[result.largestDifference.offset - 1]);
    expect(state).toEqual(savedState); expect(shortPreview).toEqual(savedShort); expect(longPreview).toEqual(savedLong);
    expect(options.rand).not.toHaveBeenCalled();
  });

  it('follows an earlier real Requeen worker gap when the starting brood and resource conditions differ', () => {
    const state = colony(), options = cfg(), savedState = structuredClone(state);
    const preview = BH.bhPreviewManagementChoice(state, options, 'requeen', 7), savedPreview = structuredClone(preview);
    const supplied = BH.bhManagementPreviewTimeline(preview, 'workers'), savedTimeline = structuredClone(supplied);
    const result = BH.bhManagementTimelineLandmarks(supplied);
    expect(result).toMatchObject({
      available: true, totalDays: 7, comparedDays: 7, missingDays: 0, differentDays: 4, allMatch: false,
      firstDifference: { day: 14, offset: 4, baseline: 19751, withAction: 19753, delta: 2 },
      largestDifference: { day: 17, offset: 7, baseline: 18243, withAction: 18254, delta: 11 }, largestTieDays: 1
    });
    expect(result.firstDifference).toEqual(supplied.points[3]);
    expect(result.largestDifference).toEqual(supplied.points[6]);
    expect(state).toEqual(savedState); expect(preview).toEqual(savedPreview); expect(supplied).toEqual(savedTimeline);
    expect(options.rand).not.toHaveBeenCalled();
  });

  it.each([['feed_bees', 'honey'], ['split_colony', 'workers']])('retains the exact first projected %s effect for %s while preserving the complete colony and preview', (choice, metric) => {
    const state = colony(), options = cfg(), savedState = structuredClone(state);
    const preview = BH.bhPreviewManagementChoice(state, options, choice, 30), savedPreview = structuredClone(preview);
    const supplied = BH.bhManagementPreviewTimeline(preview, metric), savedTimeline = structuredClone(supplied);
    const result = BH.bhManagementTimelineLandmarks(supplied);
    expect(result.available).toBe(true); expect(result.totalDays).toBe(preview.daysCompared);
    expect(result.missingDays).toBe(0); expect(result.firstDifference).toEqual(supplied.points[0]);
    expect(result.firstDifference.day).toBe(state.day + 1); expect(result.firstDifference.offset).toBe(1);
    expect(result.largestDifference).toEqual(supplied.points[result.largestDifference.offset - 1]);
    expect(state).toEqual(savedState); expect(preview).toEqual(savedPreview); expect(supplied).toEqual(savedTimeline);
    expect(options.rand).not.toHaveBeenCalled();
  });

  it('summarizes only the real early-collapse common projection instead of implying all thirty days were compared', () => {
    const state = colony({ day: 95, workers: 510, honey: 0, pollen: 0, brood: 0, broodCohorts: null });
    const options = cfg(), preview = BH.bhPreviewManagementChoice(state, options, 'feed_bees', 30);
    const supplied = BH.bhManagementPreviewTimeline(preview, 'workers');
    const result = BH.bhManagementTimelineLandmarks(supplied);
    expect(preview.daysCompared).toBeLessThan(30);
    expect(result).toMatchObject({ available: true, totalDays: preview.daysCompared, comparedDays: preview.daysCompared, missingDays: 0 });
    if (result.largestDifference) expect(result.largestDifference.day).toBeLessThanOrEqual(state.day + preview.daysCompared);
    expect(options.rand).not.toHaveBeenCalled();
  });
});
