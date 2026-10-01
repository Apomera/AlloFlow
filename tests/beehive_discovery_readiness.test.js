import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

const moment = (patch = {}) => ({
  version: 1, lesson: 'stores', mode: 'beekeeper', runKey: 'colony:123:1', clock: 0, label: 'Day 0',
  metrics: [{ id: 'honey', label: 'Food stores', value: 20, unit: 'lb', angle: false }], ...patch,
});
const record = (patch = {}) => ({ observation: 'Day 0: 20 lb.', snapshot: moment(), ...patch });

describe('Discovery evidence readiness', () => {
  it('requires numeric evidence even when a legacy observation has a written explanation', () => {
    expect(BH.bhDiscoveryEvidenceReadiness({ observation: 'I saw busy bees', checked: true, note: 'Food rose' }, moment({ clock: 3 })))
      .toMatchObject({ ready: false, reason: 'capture' });
  });

  it('keeps feedback pending immediately after capture', () => {
    expect(BH.bhDiscoveryEvidenceReadiness(record(), moment())).toMatchObject({ ready: false, reason: 'compare' });
  });

  it('accepts an explicitly compared null result without requiring an artificial change', () => {
    const snapshot = moment();
    const comparison = BH.bhDiscoveryComparison(snapshot, snapshot);
    const result = BH.bhDiscoveryEvidenceReadiness(record({ comparison }), snapshot);
    expect(result.ready).toBe(true);
    expect(result.comparison.unchanged).toBe(true);
  });

  it('freezes the measured after values when time has advanced', () => {
    const after = moment({ clock: 1, label: 'Day 1', metrics: [{ ...moment().metrics[0], value: 19.3 }] });
    const result = BH.bhDiscoveryEvidenceReadiness(record(), after);
    expect(result.ready).toBe(true);
    expect(result.comparison.rows[0]).toMatchObject({ before: 20, after: 19.3, delta: -0.7 });
    expect(result.comparison.afterLabel).toBe('Day 1');
  });

  it('preserves an explicitly captured comparison when the simulation continues', () => {
    const comparison = BH.bhDiscoveryComparison(moment(), moment({ clock: 1, label: 'Day 1' }));
    const later = moment({ clock: 8, label: 'Day 8', metrics: [{ ...moment().metrics[0], value: 40 }] });
    const result = BH.bhDiscoveryEvidenceReadiness(record({ comparison }), later);
    expect(result.ready).toBe(true);
    expect(result.comparison.afterLabel).toBe('Day 1');
    expect(result.comparison.rows[0].after).toBe(20);
  });

  it.each([
    ['restart', { runKey: 'colony:123:2', clock: 4 }, 'different-run'],
    ['new seed', { runKey: 'colony:456:1', clock: 4 }, 'different-run'],
    ['earlier day', { clock: -1 }, 'earlier-moment'],
    ['missing readings', { clock: 4, metrics: [] }, 'invalid-evidence'],
  ])('does not unlock feedback for %s, even with a stored comparison', (_, patch, reason) => {
    const comparison = BH.bhDiscoveryComparison(moment(), moment({ clock: 1, label: 'Day 1' }));
    expect(BH.bhDiscoveryEvidenceReadiness(record({ comparison }), moment(patch))).toMatchObject({ ready: false, reason });
  });

  it('does not accept partial or duplicate restored comparison rows as evidence', () => {
    const row = BH.bhDiscoveryComparison(moment(), moment()).rows[0];
    for (const rows of [[], [null], [row, row], [{ ...row, before: 30 }], [{ ...row, after: NaN }], [{ ...row, delta: 999 }], [{ ...row, angle: true }]]) {
      expect(BH.bhDiscoveryEvidenceReadiness(record({ comparison: { ...BH.bhDiscoveryComparison(moment(), moment()), rows } }), moment()).ready).toBe(false);
    }
  });
});

describe('Food-store discovery trend', () => {
  it('reads actual compact daily history alongside legacy verbose samples', () => {
    const history = [{ d: 1, h: 19.3, w: 6000 }, { day: 2, honey: 18.6 }, { d: 3, h: 18.4 }];
    const unchanged = JSON.stringify(history);
    expect(BH.bhDiscoveryFoodTrend(history, 4, 18.2)).toEqual([
      { day: 1, honey: 19.3 }, { day: 2, honey: 18.6 }, { day: 3, honey: 18.4 }, { day: 4, honey: 18.2 },
    ]);
    expect(JSON.stringify(history)).toBe(unchanged);
  });

  it('sorts valid readings, uses the last duplicate, and excludes future or damaged entries', () => {
    expect(BH.bhDiscoveryFoodTrend([null, { d: 2, h: 10 }, { d: 1, h: 20 }, { day: 2, honey: 15 }, { d: 9, h: 50 }, { d: 3, h: NaN }, { d: -1, h: 3 }, { d: 3, h: -5 }], 4, 12)).toEqual([
      { day: 1, honey: 20 }, { day: 2, honey: 15 }, { day: 4, honey: 12 },
    ]);
  });

  it('bounds chart density to twelve chronological samples, keeping the current reading', () => {
    const result = BH.bhDiscoveryFoodTrend(Array.from({ length: 100 }, (_, d) => ({ d, h: d })), 100, 20);
    expect(result).toHaveLength(12);
    expect(result[0].day).toBe(89);
    expect(result.at(-1)).toEqual({ day: 100, honey: 20 });
  });

  it('starts safely when no valid recorded history exists', () => {
    expect(BH.bhDiscoveryFoodTrend({}, 0, 20)).toEqual([{ day: 0, honey: 20 }]);
  });
});
