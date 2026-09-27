import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let sky;
const NOW = Date.UTC(2026, 8, 27, 18, 0);

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
  sky = window.__alloAstroPure;
});

function resolve(date, time, zone = 'America/New_York') {
  return sky.observatoryResolve({ obsLive: false, obsDate: date, obsTime: time, obsTz: zone }, NOW);
}

describe('Observatory calendar and wall-clock validation', () => {
  it.each([
    [2026, 2, 29, 21, 0], [2026, 2, 31, 21, 0], [2026, 4, 31, 21, 0],
    [2026, 0, 1, 21, 0], [2026, 13, 1, 21, 0], [2026, 1, 0, 21, 0],
    [2026, 1, 1, 24, 0], [2026, 1, 1, 12, 60], [2026, 1, 1, -1, 0],
    [2026, 1, 1, 12.5, 0], [2026, 1, 1, Number.NaN, 0]
  ])('rejects an impossible calendar or clock tuple %j', (...parts) => {
    expect(sky.wallTimeToUtcMs(...parts, 'UTC')).toBeNaN();
  });

  it('accepts leap days and valid boundary times without normalization', () => {
    expect(sky.wallTimeToUtcMs(2024, 2, 29, 23, 59, 'UTC')).toBe(Date.UTC(2024, 1, 29, 23, 59));
    expect(sky.wallTimeToUtcMs(2000, 2, 29, 0, 0, 'UTC')).toBe(Date.UTC(2000, 1, 29));
    expect(sky.wallTimeToUtcMs(1900, 2, 29, 0, 0, 'UTC')).toBeNaN();
    expect(resolve('2099-12-31', '23:59', 'UTC').utcMs).toBe(Date.UTC(2099, 11, 31, 23, 59));
  });

  it.each([
    ['2026-02-31', '21:00'], ['2026-02-29', '21:00'], ['2026-13-01', '21:00'],
    ['2026-07-04', '24:00'], ['2026-07-04', '99:99'], ['2026-07-04', '12:60'],
    ['2026-07-04', 'bad'], ['2026-07-04', { forged: true }], ['2026-07-04', true]
  ])('recovers invalid restored date/time %j %j to the current instant', (date, time) => {
    const result = resolve(date, time);
    expect(result.live).toBe(true);
    expect(result.utcMs).toBe(NOW);
  });

  it('preserves the default evening time when a saved time is absent', () => {
    for (const time of [undefined, null, '']) {
      const result = resolve('2026-07-04', time);
      expect(result.live).toBe(false);
      expect(result.wall.timeText).toBe('21:00');
      expect(result.utcMs).toBe(Date.UTC(2026, 6, 5, 1, 0));
    }
  });

  it('preserves valid seasonal offsets and the existing repeated-hour choice', () => {
    expect(resolve('2026-01-15', '21:00').utcMs).toBe(Date.UTC(2026, 0, 16, 2, 0));
    expect(resolve('2026-07-04', '21:00').utcMs).toBe(Date.UTC(2026, 6, 5, 1, 0));
    const repeated = resolve('2026-11-01', '01:30');
    expect(repeated.live).toBe(false);
    expect(repeated.utcMs).toBe(Date.UTC(2026, 10, 1, 5, 30));
    expect(repeated.wall.timeText).toBe('01:30');
  });

  it('rejects a local hour skipped by daylight saving instead of changing the selected time', () => {
    const skipped = resolve('2026-03-08', '02:30');
    expect(skipped.live).toBe(true);
    expect(skipped.utcMs).toBe(NOW);
    const before = resolve('2026-03-08', '01:30');
    const after = resolve('2026-03-08', '03:30');
    expect(before.live).toBe(false);
    expect(after.live).toBe(false);
    expect(after.utcMs - before.utcMs).toBe(3600000);
  });
});
