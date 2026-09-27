import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

const state = (elapsed, patch = {}) => Object.assign({ elapsed, alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0 }, patch);
const point = (t, patch = {}) => Object.assign({ t, alt: 300, v: -9, h: 4, fuel: 110, throttle: 0, tilt: 0, x: 0 }, patch);
const trace = () => ({ version: 1, samples: [
  point(0),
  point(0.5, { alt: 290, v: -8, h: -3, fuel: 107, throttle: 0.25, tilt: Math.PI / 2, x: 1 }),
  point(1.1, { alt: 0, v: -2, h: -0.3, fuel: 100, x: -2 }),
], firstBurn: { t: 0.25, alt: 295 }, burnSeconds: 0.5, peakDescent: 9, peakDrift: 4 });

describe('bounded descent recording', () => {
  it('retains the start and exact touchdown through repeated thinning of a long approach', () => {
    const recording = P.newDescentRecording();
    for (let step = 0; step <= 6000; step++) {
      const t = step / 10;
      P.recordDescent(recording, state(t, { alt: Math.max(0, 300 - t / 2), fuel: 110 - t / 10, x: t * 2 }));
      expect(recording.samples.length).toBeLessThanOrEqual(360);
    }
    P.recordDescent(recording, state(600.137, { alt: -0.02, vVel: -1.4, hVel: 0.2, fuel: 49.9, x: 1200.27 }), true);
    expect(recording.samples.length).toBeLessThanOrEqual(360);
    expect(recording.samples[0]).toMatchObject({ t: 0, alt: 300, fuel: 110, x: 0 });
    expect(recording.samples.at(-1)).toMatchObject({ t: 600.137, alt: 0, v: -1.4, h: 0.2, fuel: 49.9, x: 1200.27 });
    for (let i = 1; i < recording.samples.length; i++) expect(recording.samples[i].t).toBeGreaterThan(recording.samples[i - 1].t);
    expect(P.descentRecordingSummary(recording)).toMatchObject({ duration: 600.137, displacement: 1200.27 });
  });

  it('records a final endpoint between regular samples and replaces repeated final writes', () => {
    const recording = P.newDescentRecording();
    P.recordDescent(recording, state(0));
    P.recordDescent(recording, state(0.5, { alt: 100 }));
    P.recordDescent(recording, state(0.73, { alt: 0, vVel: -2 }), true);
    P.recordDescent(recording, state(0.73, { alt: 0, vVel: -1.9 }), true);
    expect(recording.samples.map((p) => p.t)).toEqual([0, 0.5, 0.73]);
    expect(recording.samples.at(-1).v).toBe(-1.9);
  });

  it('copies measurements so later live-state changes cannot rewrite the recorded flight', () => {
    const recording = P.newDescentRecording();
    const live = state(0);
    P.recordDescent(recording, live);
    Object.assign(live, state(4, { alt: 0, fuel: 5, x: 99 }));
    expect(recording.samples[0]).toMatchObject({ t: 0, alt: 300, fuel: 110, x: 0 });
  });

  it('preserves transient peaks between samples and excludes pauses from burn duration', () => {
    const recording = P.newDescentRecording();
    P.recordDescent(recording, state(0));
    P.recordDescent(recording, state(0.1, { alt: 299, thrust: 0.5, vVel: -12, hVel: -7 }));
    P.recordDescent(recording, state(0.1, { alt: 299, thrust: 0.5 }));
    P.recordDescent(recording, state(0.2, { alt: 298, thrust: 0.5 }));
    P.recordDescent(recording, state(0.3, { alt: 297, thrust: 0 }));
    P.recordDescent(recording, state(1, { alt: 290, thrust: 0 }), true);
    const summary = P.descentRecordingSummary(recording);
    expect(recording.samples).toHaveLength(2);
    expect(summary.burnSeconds).toBeCloseTo(0.2, 8);
    expect(summary.peakDescent).toBe(12);
    expect(summary.peakDrift).toBe(7);
    expect(summary.firstBurn).toEqual({ t: 0.1, alt: 299 });
  });
});

describe('saved recorder validation', () => {
  it('rejects unsupported schemas and traces without two valid measurements', () => {
    for (const raw of [null, [], 'bad', {}, { version: 2, samples: [point(0), point(1)] },
      { version: 1, samples: 'bad' }, { version: 1, samples: [point(0)] }]) {
      expect(P.cleanDescentRecording(raw)).toBeNull();
      expect(P.descentRecordingSummary(raw)).toBeNull();
      expect(P.descentCSV(raw)).toBe('');
    }
  });

  it('drops malformed, non-finite, duplicate, and out-of-order points before chart math', () => {
    const raw = { version: 1, samples: [
      null, point(-1), point(0), point(0.1, { alt: NaN }), point(0.2, { h: Infinity }),
      point(0.3, { fuel: '90' }), point(0.4, { throttle: 1.1 }), point(0.5), point(0.5), point(0.25),
      point(0.6, { alt: -1 }), point(0.7, { fuel: -1 }), point(0.8, { tilt: 4 }), point(1),
    ], firstBurn: { t: 999, alt: 2 }, burnSeconds: Infinity };
    const cleaned = P.cleanDescentRecording(raw);
    expect(cleaned.samples.map((p) => p.t)).toEqual([0, 0.5, 1]);
    expect(cleaned.firstBurn).toBeNull();
    expect(cleaned.burnSeconds).toBe(0);
    expect(P.descentCSV(raw)).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('caps restored traces and clones accepted points without arbitrary saved properties', () => {
    const samples = Array.from({ length: 1000 }, (_, t) => point(t, { extra: 'ignored' }));
    const cleaned = P.cleanDescentRecording({ version: 1, samples, extra: 'ignored' });
    expect(cleaned.samples.length).toBeLessThanOrEqual(360);
    expect(cleaned.samples[0].extra).toBeUndefined();
    expect(cleaned.extra).toBeUndefined();
    samples[0].alt = 123;
    expect(cleaned.samples[0].alt).toBe(300);
  });

  it('bounds restored burn duration while retaining finite measured speed peaks', () => {
    const raw = trace();
    raw.burnSeconds = 1e8;
    raw.peakDescent = -5;
    raw.peakDrift = -5;
    const cleaned = P.cleanDescentRecording(raw);
    expect(cleaned.burnSeconds).toBe(1.1);
    expect(cleaned.peakDescent).toBe(9);
    expect(cleaned.peakDrift).toBe(4);
  });
});

describe('flight summaries and numeric CSV', () => {
  it('derives duration, fuel use, and signed displacement from recorded endpoints', () => {
    expect(P.descentRecordingSummary(trace())).toEqual({
      duration: 1.1, fuelUsed: 10, displacement: -2, burnSeconds: 0.5,
      peakDescent: 9, peakDrift: 4, firstBurn: { t: 0.25, alt: 295 },
    });
  });

  it('exports signed velocities, throttle percent, and tilt degrees with explicit units', () => {
    const lines = P.descentCSV(trace()).split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('time_s,altitude_m,vertical_velocity_m_s,lateral_velocity_m_s,hover_fuel_s,throttle_percent,tilt_deg,displacement_m');
    expect(lines[2].split(',').map(Number)).toEqual([0.5, 290, -8, -3, 107, 25, 90, 1]);
    expect(lines[3].split(',').map(Number)).toEqual([1.1, 0, -2, -0.3, 100, 0, 0, -2]);
  });

  it('keeps compact approach evidence in the mission summary and readable report', () => {
    const summary = P.flightSummary({ landingResult: {
      crashed: false, score: 90, grade: 'A+', vVel: 2, hVel: 0.3, fuel: 100, fuelUnit: 's', recording: trace(),
    } }, { quiz: 10, samples: 8 });
    expect(summary.landing.flight).toMatchObject({ duration: 1.1, fuelUsed: 10, displacement: -2 });
    expect(summary.landing.recording).toBeUndefined();
    expect(summary.landing.flight.samples).toBeUndefined();
    expect(P.flightReport(summary)).toContain('Descent: 1.1 s, hover fuel used 10.0 s, displacement -2.0 m.');
  });
});
