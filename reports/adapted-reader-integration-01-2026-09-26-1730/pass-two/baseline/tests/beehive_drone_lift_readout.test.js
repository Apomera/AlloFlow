import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const thermal = { x: 0, z: -100, radius: 50, strength: 2 };
const flight = (patch = {}) => ({ x: 0, y: 120, z: -100, paused: true, energy: 80, thermals: [thermal], ...patch });

describe('Modeled updraft feedback', () => {
  it.each([[0, 120, 2], [25, 120, 1], [49.99, 249.99, 0.0004], [50, 120, 0], [0, 250, 0], [0, 251, 0]])('matches radial falloff and strict lift bounds at x=%s y=%s', (x, y, lift) => {
    expect(BH.bhDroneThermalSample(flight({ x, y }), thermal).lift).toBeCloseTo(lift, 8);
  });
  it('sums overlapping lift while keeping paused wording and energy unchanged', () => {
    const s = Object.freeze(flight({ thermals: [thermal, { ...thermal, strength: 1 }] }));
    const r = BH.bhDroneLiftReadout(s);
    expect(r).toMatchObject({ state: 'inside', lift: 3 }); expect(r.title).toContain('paused');
    expect(r.detail).toContain('Resume or advance'); expect(r.caption).toContain('never refills energy'); expect(s.energy).toBe(80);
    expect(BH.bhDroneLiftReadout({ ...s, paused: false }).title).toBe('Updraft adding lift');
  });
  it('measures distance to the nearest edge, rather than the nearest centre', () => {
    const s = flight({ x: 100, thermals: [thermal, { x: 230, z: -100, radius: 120, strength: 1 }] });
    const r = BH.bhDroneLiftReadout(s); expect(r.state).toBe('outside'); expect(r.detail).toContain('10 model m');
  });
  it('explains altitude limits and excludes unavailable or zero-lift data', () => {
    expect(BH.bhDroneLiftReadout(flight({ y: 250 }))).toMatchObject({ state: 'above', lift: 0 });
    expect(BH.bhDroneLiftReadout(flight({ y: NaN })).state).toBe('none');
    expect(BH.bhDroneThermalSample(flight(), { ...thermal, radius: 0 }).known).toBe(false);
    expect(BH.bhDroneLiftReadout(flight({ thermals: [] })).state).toBe('none');
    expect(BH.bhDroneLiftReadout(flight({ thermals: [{ ...thermal, strength: 0 }] })).lift).toBe(0);
  });
});
