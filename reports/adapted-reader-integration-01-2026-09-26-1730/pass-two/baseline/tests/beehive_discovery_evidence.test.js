import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
const moment = (overrides = {}) => ({ version: 1, lesson: 'stores', mode: 'beekeeper', runKey: 'colony:123:1', clock: 0, label: 'Day 0', metrics: [{ id: 'honey', label: 'Food stores', value: 20, unit: 'lb', angle: false }], ...overrides });

describe('Frozen field discovery evidence', () => {
  it('compares measured values without mutating either captured moment', () => {
    const before = moment(), after = moment({ clock: 1, label: 'Day 1', metrics: [{ id: 'honey', label: 'Food stores', value: 19.3, unit: 'lb', angle: false }] });
    const original = JSON.stringify([before, after]);
    const comparison = BH.bhDiscoveryComparison(before, after);
    expect(comparison.rows[0]).toMatchObject({ before: 20, after: 19.3, delta: -0.7 });
    expect(comparison.unchanged).toBe(false);
    expect(BH.bhDiscoveryComparisonText(comparison)).toContain('20 → 19.3 lb (-0.7 lb)');
    expect(BH.bhDiscoveryComparisonText(comparison)).toContain('not its cause');
    expect(JSON.stringify([before, after])).toBe(original);
  });
  it.each([
    ['new seed', { runKey: 'colony:456:1' }, 'different-run'],
    ['same seed restarted', { runKey: 'colony:123:2' }, 'different-run'],
    ['different activity', { lesson: 'thermo' }, 'different-run'],
    ['different mode', { mode: 'queen' }, 'different-run'],
    ['time reversed', { clock: -1 }, 'earlier-moment'],
    ['missing metric', { metrics: [] }, 'invalid-evidence'],
    ['nonfinite value', { metrics: [{ id: 'honey', label: 'Food stores', value: NaN, unit: 'lb' }] }, 'invalid-evidence'],
    ['unit changed', { metrics: [{ id: 'honey', label: 'Food stores', value: 20, unit: 'kg' }] }, 'invalid-evidence'],
  ])('rejects %s instead of producing a misleading change', (_, patch, error) => {
    expect(BH.bhDiscoveryComparison(moment(), moment(patch))).toEqual({ error });
  });
  it('handles legacy records without numeric evidence and duplicate metric IDs', () => {
    expect(BH.bhDiscoveryComparison(undefined, moment()).error).toBe('invalid-evidence');
    const m = moment(); m.metrics.push({ ...m.metrics[0] });
    expect(BH.bhDiscoveryComparison(m, m).error).toBe('invalid-evidence');
    expect(BH.bhDiscoveryComparisonText({ error: 'different-run' })).toBe('');
  });
  it('reports no measured change honestly', () => {
    const result = BH.bhDiscoveryComparison(moment(), moment({ clock: 1, label: 'Day 1' }));
    expect(result.unchanged).toBe(true);
    expect(result.rows[0].delta).toBe(0);
  });
  it('matches metrics by identity and measures a turn across north as 30 degrees', () => {
    const before = moment({ metrics: [
      { id: 'food', label: 'Food bearing', value: 345, unit: '°', angle: true },
      { id: 'dance', label: 'Dance angle', value: 45, unit: '°', angle: true },
    ] });
    const after = moment({ metrics: [
      { ...before.metrics[1] }, { ...before.metrics[0], value: 15 },
    ] });
    expect(BH.bhDiscoveryComparison(before, after).rows.map(row => row.delta)).toEqual([30, 0]);
    expect(BH.bhDiscoveryComparison(after, before).rows.map(row => row.delta)).toEqual([0, -30]);
  });
});

describe('Waggle direction decoder', () => {
  it.each([
    [0, 90, 90], [90, 90, 180], [-90, 90, 0], [180, 90, 270],
    [45, 345, 30], [-45, 15, 330], [180, 180, 0],
  ])('maps a %s° dance with a %s° sun to a %s° food bearing', (dance, sun, food) => {
    expect(BH.bhWaggleReading({ dance, sun }).food).toBe(food);
  });
  it('normalizes saved bearings and handles malformed saved values', () => {
    expect(BH.bhWaggleReading({ dance: 500, sun: -15 })).toEqual({ dance: 180, sun: 345, food: 165 });
    expect(BH.bhWaggleReading({ dance: NaN, sun: Infinity })).toEqual({ dance: 45, sun: 90, food: 135 });
  });
});
