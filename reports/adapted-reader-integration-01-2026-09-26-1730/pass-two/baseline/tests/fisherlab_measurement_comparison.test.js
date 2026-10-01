import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab measurement comparisons', () => {
  it('isolates zero offset from range in all four reference sets', () => {
    const model = window.__FisherLabCore.getCoreMeasurementModel;
    for (const aligned of [false, true]) for (const wideSpread of [false, true]) {
      const set = model({ aligned, wideSpread });
      expect(set.readings.reduce((a,b) => a+b,0) / 3).toBeCloseTo(set.mean);
      expect(set.readings[2] - set.readings[0]).toBeCloseTo(wideSpread ? 0.8 : 0.2);
      expect(set.mean - set.reference).toBeCloseTo(aligned ? 0 : 0.5);
      expect(set.meanError).toBe(aligned ? 0 : 0.5);
    }
    expect(model({ aligned: true, wideSpread: true }).readings).toEqual([11.6,12,12.4]);
    expect(model({ aligned: 'true', wideSpread: 1 })).toEqual(model(null));
    const detached = model({});
    detached.readings[0] = 900;
    expect(model({}).readings).toEqual([12.4,12.5,12.6]);
  });
  it('distinguishes controlled comparisons from unchanged or confounded settings', () => {
    const compare = window.__FisherLabCore.getCoreMeasurementComparison;
    expect(compare(null, {})).toBeNull();
    expect(compare({}, {}).changed).toBe('none');
    expect(compare({}, { aligned: true })).toMatchObject({ changed: 'alignment', kept: { mean: 12.5, spread: 0.2 }, current: { mean: 12, spread: 0.2 } });
    expect(compare({}, { wideSpread: true })).toMatchObject({ changed: 'spread', kept: { mean: 12.5 }, current: { mean: 12.5 } });
    expect(compare({}, { aligned: true, wideSpread: true })).toMatchObject({ changed: 'both', guidance: expect.stringContaining('change just one') });
    expect(compare({ aligned: true }, {}).guidance).toContain('Only alignment changed');
  });
  it('appends labeled model values once without changing existing writing or the kept set', () => {
    const append = window.__FisherLabCore.appendCoreMeasurementEvidence;
    const kept = { aligned: false, wideSpread: false }, current = { aligned: true, wideSpread: false };
    const snapshot = JSON.stringify([kept,current]);
    const result = append('My own evidence.', kept, current);
    expect(result.ok).toBe(true);
    expect(result.value).toMatch(/^My own evidence./);
    expect(result.value).toContain('known reference 12.0 units');
    expect(result.value).toContain('Kept (offset zero): 12.4, 12.5, 12.6');
    expect(result.value).toContain('Current (aligned): 11.9, 12.0, 12.1');
    expect(result.value).toContain('Changed: alignment');
    expect(result.value).toContain('not catch measurements');
    expect(append(result.value, kept, current)).toEqual(result);
    expect(JSON.stringify([kept,current])).toBe(snapshot);
    expect(append('x'.repeat(590), kept, current)).toEqual({ ok: false, value: 'x'.repeat(590) });
    expect(append('Retain me', null, current)).toEqual({ ok: false, value: 'Retain me' });
    expect(append('Retain me', kept, kept)).toEqual({ ok: false, value: 'Retain me' });
  });
});
