import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
const result = () => ({ version: 1, ...P.launchProfile().summary });

describe('launch and orbit saved playback', () => {
  it('preserves a completed flight while reviewing an earlier time without sharing mutable data', () => {
    const raw = { launchResult: result(), launchRun: { version: 1, time: 80, recorded: true }, launchPaused: true, launchPlaybackRate: 10 };
    const cleaned = P.cleanLaunchPlayback(raw);
    expect(cleaned.launchRun).toEqual(raw.launchRun);
    expect(cleaned.launchResult).toEqual(raw.launchResult);
    expect(cleaned.launchPaused).toBe(true);
    expect(cleaned.launchPlaybackRate).toBe(10);
    cleaned.launchResult.peakG = 99;
    cleaned.launchRun.time = 0;
    expect(raw.launchResult.peakG).toBeLessThan(5);
    expect(raw.launchRun.time).toBe(80);
  });

  it('cannot turn a malformed or unversioned save into a completed launch', () => {
    for (const bad of [null, { ...result(), version: 2 }, { ...result(), cutoffSpeed: NaN },
      { ...result(), perigee: 0 }, { ...result(), eccentricity: 1 }, { ...result(), peakQ: Infinity }]) {
      const state = P.cleanLaunchPlayback({ launchResult: bad, launchRun: { version: 1, time: 400, recorded: true } });
      expect(state.launchResult).toBeNull();
      expect(state.launchRun.recorded).toBe(false);
    }
    expect(P.cleanLaunchPlayback({ launchRun: { time: 400, recorded: true } }).launchRun).toBeNull();
  });

  it('bounds replay clocks and accepts only supported playback speeds and boolean pause flags', () => {
    const state = P.cleanLaunchPlayback({ launchResult: result(), launchRun: { version: 1, time: 1e9, recorded: true },
      launchPaused: 'false', launchPlaybackRate: 999, orbitRun: { version: 1, time: 1e9 }, orbitPaused: 'false', orbitPlaybackRate: 999 });
    expect(state.launchRun.time).toBe(state.launchResult.duration);
    expect(state.orbitRun.time).toBe(1e6);
    expect(state.launchPaused).toBe(false);
    expect(state.orbitPaused).toBe(false);
    expect(state.launchPlaybackRate).toBe(30);
    expect(state.orbitPlaybackRate).toBe(360);
    const negative = P.cleanLaunchPlayback({ launchRun: { version: 1, time: -100 }, orbitRun: { version: 1, time: -100 } });
    expect(negative.launchRun.time).toBe(-5);
    expect(negative.orbitRun.time).toBe(0);
    expect(P.cleanLaunchPlayback({ orbitRun: { version: 1, time: NaN } }).orbitRun).toBeNull();
  });

  it('records the measured launch outcome in the flight archive and readable report', () => {
    const flown = result();
    const sum = P.flightSummary({ launchResult: flown, launchRun: { version: 1, recorded: true, time: 100 } }, {}, '2026-09-28');
    expect(sum.launch).toEqual(flown);
    const report = P.flightReport(sum);
    expect(report).toContain('Launch model: cutoff after 648.4 s');
    expect(report).toContain('orbit 180 by 192 km');
    expect(report).toContain('Max Q 34.6 kPa');
    expect(report).toContain('propellant remaining');
  });

  it('keeps legacy and unfinished flights from claiming a measured launch', () => {
    for (const state of [{}, { launchResult: result() }, { launchRun: { recorded: true }, launchResult: { outcome: 'orbit' } }]) {
      const sum = P.flightSummary(state);
      expect(sum.launch).toBeNull();
      expect(P.flightReport(sum)).not.toContain('Launch model:');
    }
  });
});
