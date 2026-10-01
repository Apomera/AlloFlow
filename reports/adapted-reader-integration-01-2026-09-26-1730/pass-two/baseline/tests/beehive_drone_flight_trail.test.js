import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const sample = (t, patch = {}) => ({ t, x: t * 10, altitude: 40 + t, z: -t * 20, ...patch });
const state = (patch = {}) => ({ flightElapsed: 2, x: 20, y: 42, z: -40, telemetry: [sample(.5), sample(1), sample(1.5)], ...patch });

describe('Recorded drone flight trail', () => {
  it('connects recorded coordinates and the current position without changing evidence', () => {
    const s = state(), before = JSON.stringify(s), r = BH.bhDroneFlightTrail(s);
    expect(r.segments).toHaveLength(3); expect(r.sampleCount).toBe(3);
    expect(r.segments[0].a).toEqual({ x: 5, y: 40.5, z: -10, t: .5 });
    expect(r.segments.at(-1).b).toEqual({ x: 20, y: 42, z: -40, t: 2 });
    expect(JSON.stringify(s)).toBe(before);
    expect(r.segments.at(-1).freshness).toBe(1);
  });
  it('bounds the geometry to 30 segments and the latest 15 model seconds', () => {
    const r = BH.bhDroneFlightTrail(state({ flightElapsed: 80, telemetry: Array.from({ length: 160 }, (_, i) => sample(i * .5)) }));
    expect(r.segments).toHaveLength(30); expect(r.sampleCount).toBe(30);
    expect(r.segments.every(s => s.a.t >= 65 && s.b.t <= 80)).toBe(true);
    expect(r.segments[0].freshness).toBeLessThan(r.segments.at(-1).freshness);
  });
  it('leaves gaps for unavailable positions instead of inventing altitude', () => {
    const r = BH.bhDroneFlightTrail(state({ telemetry: [sample(0), sample(.5, { altitude: undefined }), sample(1), sample(1.5)] }));
    expect(r.segments.map(s => [s.a.t, s.b.t])).toEqual([[1, 1.5], [1.5, 2]]);
    expect(r.sampleCount).toBe(3);
  });
  it('does not bridge stale samples, reverse time, or future samples', () => {
    const r = BH.bhDroneFlightTrail(state({ flightElapsed: 6, telemetry: [sample(0), sample(.5), sample(4), sample(3.5), sample(9), sample(5.5)] }));
    expect(r.segments.map(s => [s.a.t, s.b.t])).toEqual([[0, .5], [5.5, 6]]);
  });
  it('does not manufacture a line at launch or for stationary samples', () => {
    expect(BH.bhDroneFlightTrail({}).segments).toEqual([]);
    expect(BH.bhDroneFlightTrail(state({ telemetry: [] })).segments).toEqual([]);
    const r = BH.bhDroneFlightTrail(state({ telemetry: [sample(1, { x: 20, altitude: 42, z: -40 }), sample(1.5, { x: 20, altitude: 42, z: -40 })] }));
    expect(r.segments).toEqual([]); expect(r.text).toBe('Fly to record a trail.');
  });
  it('retains real positions when the recorder rounds the newest timestamp upward', () => {
    const s = state({ flightElapsed: 1.98, telemetry: [sample(1.5), sample(2)] }), before = JSON.stringify(s);
    const r = BH.bhDroneFlightTrail(s);
    expect(r.sampleCount).toBe(2); expect(r.segments).toHaveLength(1);
    expect(r.segments[0].b).toEqual({ x: 20, y: 42, z: -40, t: 1.98 });
    expect(JSON.stringify(s)).toBe(before);
  });
  it('ages only with model time, and never projects beyond the current point', () => {
    const s = Object.freeze(state()), a = BH.bhDroneFlightTrail(s), b = BH.bhDroneFlightTrail(s);
    expect(a).toEqual(b);
    expect(a.segments.every(segment => segment.b.t <= s.flightElapsed)).toBe(true);
    expect(BH.bhDroneFlightTrail(state({ flightElapsed: 30 })).segments).toEqual([]);
  });
});
