import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

describe('Recorded Bee colony history view', () => {
  it('sorts actual observations, replaces whole duplicate rows, and leaves the source unchanged', () => {
    const history = Object.freeze([
      Object.freeze({ d: 5, w: 50, h: 55, v: 5, m: 75 }),
      Object.freeze({ d: 1, w: 10, h: 11, v: 1, m: 71 }),
      Object.freeze({ d: 3, w: 30, h: 33, v: 3, m: 73 }),
      Object.freeze({ d: 3, w: 31 }),
      Object.freeze({ d: 8, w: 80 }),
      Object.freeze({ d: -1, w: 1 }),
      Object.freeze({ d: 1.5, w: 1 }),
      Object.freeze({ d: '4', w: 1 }),
      Object.freeze({ d: NaN, w: 1 }),
      null,
      Object.freeze([]),
    ]);
    const before = history.map((row) => row && { ...row });
    const view = BH.bhColonyHistoryView(history, 'food', 'all', 7);
    expect(view.rows).toEqual([
      { day: 1, workers: 10, food: 11, mites: 1, stability: 71 },
      { day: 3, workers: 31, food: null, mites: null, stability: null },
      { day: 5, workers: 50, food: 55, mites: 5, stability: 75 },
    ]);
    expect(view).toMatchObject({ firstDay: 1, lastDay: 5, recordedCount: 3, totalRecordedCount: 3,
      validCount: 2, missingCount: 1, duplicateCount: 1, rejectedCount: 7 });
    expect(view.metricCounts).toEqual({ workers: { valid: 3, missing: 0 }, food: { valid: 2, missing: 1 },
      mites: { valid: 2, missing: 1 }, stability: { valid: 2, missing: 1 } });
    expect(history.map((row) => row && { ...row })).toEqual(before);
  });

  it('uses calendar-day windows ending at the last recorded observation, without fabricating a live point', () => {
    const history = [1, 4, 25, 26, 27, 31, 32].map((d) => ({ d, w: d }));
    const week = BH.bhColonyHistoryView(history, 'workers', 7, 60);
    expect(week.rows.map((row) => row.day)).toEqual([26, 27, 31, 32]);
    expect(week).toMatchObject({ windowDays: 7, windowStartDay: 26, windowEndDay: 32,
      firstDay: 26, lastDay: 32, recordedCount: 4, totalRecordedCount: 7 });
    expect(BH.bhColonyHistoryView(history, 'workers', 30, 60).rows.map((row) => row.day)).toEqual([4, 25, 26, 27, 31, 32]);
    expect(BH.bhColonyHistoryView(history, 'workers', 'all', 60).rows.map((row) => row.day)).toEqual([1, 4, 25, 26, 27, 31, 32]);
    expect(BH.bhColonyHistoryView(history, 'workers', '7', 60).rows).toEqual(week.rows);
    expect(BH.bhColonyHistoryView(history, 'workers', 'invalid', 60).windowDays).toBe(30);
  });

  it('spaces points by actual day and breaks every line at missing days or invalid selected readings', () => {
    const view = BH.bhColonyHistoryView([
      { d: 0, w: 10 }, { d: 1, w: 11 }, { d: 2, w: '12', h: 12 },
      { d: 3, w: 13 }, { d: 5, w: 15 }, { d: 6, w: 16 },
    ], 'workers', 'all', 6);
    expect(view.series.map((point) => point.day)).toEqual([0, 1, 2, 3, 5, 6]);
    expect(view.series.map((point) => point.x)).toEqual([0, 1 / 6, 2 / 6, 3 / 6, 5 / 6, 1]);
    expect(view.series[2]).toMatchObject({ day: 2, value: null, y: null });
    expect(view.rows[2].food).toBe(12);
    expect(view.segments.map((segment) => segment.map((point) => point.day))).toEqual([[0, 1], [3], [5, 6]]);
    expect(view.gaps).toEqual([{ fromDay: 3, toDay: 5, missingDays: 1 }]);
    expect(view.endpoints).toEqual({ first: { day: 0, value: 10 }, last: { day: 6, value: 16 }, delta: 6 });
  });

  it('keeps real zero readings and accepts inclusive bounds, while rejecting impossible or nonnumeric values', () => {
    const history = [
      { d: 0, w: 0, h: 0, v: 0, m: 0 },
      { d: 1, w: 250000, h: 1000000, v: 100, m: 100 },
      { d: 2, w: 250001, h: 1000001, v: 101, m: -1 },
      { d: 3, w: 1.5, h: -1, v: Infinity, m: '70' },
      { d: 4, w: null, h: NaN, v: undefined },
    ];
    const view = BH.bhColonyHistoryView(history, 'workers', 'all', 4);
    expect(view.rows[0]).toEqual({ day: 0, workers: 0, food: 0, mites: 0, stability: 0 });
    expect(view.rows[1]).toEqual({ day: 1, workers: 250000, food: 1000000, mites: 100, stability: 100 });
    for (const row of view.rows.slice(2)) expect(row).toMatchObject({ workers: null, food: null, mites: null, stability: null });
    expect(view.validCount).toBe(2);
    expect(view.missingCount).toBe(3);
    expect(view.series[0]).toMatchObject({ value: 0, y: 0 });
  });

  it('scales large worker and food readings without clipping and shows readable unit ticks', () => {
    const history = [{ d: 1, w: 120000, h: 123456.75 }, { d: 2, w: 245000, h: 950000 }];
    const workers = BH.bhColonyHistoryView(history, 'workers', 'all', 2);
    const food = BH.bhColonyHistoryView(history, 'food', 'all', 2);
    expect(workers.domain).toEqual({ min: 0, max: 250000 });
    expect(food.domain).toEqual({ min: 0, max: 1000000 });
    expect(workers.ticks.map((tick) => tick.label)).toEqual(['0', '50k', '100k', '150k', '200k', '250k']);
    expect(food.ticks.at(-1)).toEqual({ value: 1000000, label: '1M lb' });
    for (const view of [workers, food]) {
      expect(view.ticks[0].value).toBe(0);
      expect(view.ticks.at(-1).value).toBe(view.domain.max);
      expect(view.series.every((point) => point.y >= 0 && point.y <= 1)).toBe(true);
    }
    const tinyFood = BH.bhColonyHistoryView([{ d: 0, h: Number.MIN_VALUE }], 'food', 'all', 0);
    expect(tinyFood.domain).toEqual({ min: 0, max: 1 });
    expect(tinyFood.ticks.every((tick) => Number.isFinite(tick.value))).toBe(true);
  });

  it.each(['mites', 'stability'])('holds the %s index axis at zero through 100 regardless of the selected window', (metricId) => {
    const view = BH.bhColonyHistoryView([{ d: 1, v: 2.5, m: 30 }, { d: 2, v: 5, m: 45 }], metricId, 7, 2);
    expect(view.domain).toEqual({ min: 0, max: 100 });
    expect(view.ticks.map((tick) => tick.value)).toEqual([0, 25, 50, 75, 100]);
    expect(view.metric.unit).toBe('points');
  });

  it('does not move endpoint comparisons inward to replace missing first or last readings', () => {
    const missingFirst = BH.bhColonyHistoryView([{ d: 0, h: 10 }, { d: 1, w: 10 }, { d: 2, w: 20 }], 'workers', 'all', 2);
    expect(missingFirst.endpoints).toEqual({ first: { day: 0, value: null }, last: { day: 2, value: 20 }, delta: null });
    const missingLast = BH.bhColonyHistoryView([{ d: 0, w: 10 }, { d: 1, w: 20 }, { d: 2, h: 10 }], 'workers', 'all', 2);
    expect(missingLast.endpoints).toEqual({ first: { day: 0, value: 10 }, last: { day: 2, value: null }, delta: null });
    const single = BH.bhColonyHistoryView([{ d: 5, w: 10 }], 'workers', 7, 5);
    expect(single.series[0].x).toBe(0.5);
    expect(single.endpoints.delta).toBeNull();
    expect(single.segments).toHaveLength(1);
  });

  it('returns a safe empty view for malformed, future, or unrecorded history', () => {
    for (const history of [undefined, null, {}, 'legacy', [], [{ day: 1, honey: 9, workers: 10 }], [{ d: 3, w: 10 }]]) {
      const view = BH.bhColonyHistoryView(history, 'unknown', 7, 2);
      expect(view.metric.id).toBe('workers');
      expect(view.rows).toEqual([]);
      expect(view.series).toEqual([]);
      expect(view.segments).toEqual([]);
      expect(view.gaps).toEqual([]);
      expect(view.firstDay).toBeNull();
      expect(view.lastDay).toBeNull();
      expect(view.endpoints).toEqual({ first: null, last: null, delta: null });
      expect(view.validCount).toBe(0);
      expect(view.domain.max).toBeGreaterThan(0);
    }
    for (const currentDay of [undefined, NaN, -1, 1.5, '2', Infinity]) {
      expect(BH.bhColonyHistoryView([{ d: 0, w: 0 }], 'workers', 'all', currentDay).rows).toEqual([]);
    }
  });

  it('exports the visible calendar window with exact numbers and empty missing cells, preserving actual zeros', () => {
    const view = BH.bhColonyHistoryView([
      { d: 0, w: 10, h: 100 },
      { d: 6, w: 0, h: 0, v: null, m: 0 },
      { d: 7, w: 1234, h: 1234.567, v: 25 },
    ], 'food', 7, 7);
    expect(BH.bhColonyHistoryCSV(view)).toBe(
      'Day,Workers,Combined food (lb),Mite pressure (points),Colony stability (points)\n6,0,0,,0\n7,1234,1234.567,25,'
    );
    expect(BH.bhColonyHistoryCSV({ rows: [{ day: 0, workers: '12', food: NaN, mites: -1, stability: 101 }] }))
      .toBe('Day,Workers,Combined food (lb),Mite pressure (points),Colony stability (points)\n0,,,,');
    expect(BH.bhColonyHistoryCSV(null)).toBe('Day,Workers,Combined food (lb),Mite pressure (points),Colony stability (points)');
  });
});
