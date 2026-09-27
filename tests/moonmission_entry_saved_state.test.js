import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_moonmission.js';
const MODERN = Object.freeze({
  modelVersion: 1, completed: true, outcome: 'nominal', angle: -6.5, peakG: 6.8,
  peakHeatFlux: 2300000, heatLoad: 160000000, duration: 725.4, downrange: 1850000,
  splashSpeed: 9.3, terminal: 'splash',
});
let P;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'moonMission'); P = window.MoonMissionPure; });

describe('compact physical entry saves', () => {
  it('keeps finite physical measurements without retaining unknown or bulky saved data', () => {
    const state = P.cleanEntryState({ entryOutcome: { ...MODERN, samples: new Array(5000).fill(1) },
      entryRun: { version: 1, angle: -6.5, time: 80, recovery: 0, recorded: false, samples: [] },
      entryAttempts: [{ ...MODERN }], entryAwardedXP: 25, entryCompletionAwarded: true, entryPlaybackRate: 10 });
    expect(state.entryOutcome).toEqual(MODERN);
    expect(state.entryRun).toEqual({ version: 1, angle: -6.5, time: 80, recovery: 0, recorded: false });
    expect(state.entryAttempts).toEqual([MODERN]);
    expect(state.entryCompletionAwarded).toBe(true);
    expect(state.entryPlaybackRate).toBe(10);
    expect(P.cleanEntryState({ entryPaused: 'true', entryMigrationNote: {} })).toMatchObject({ entryPaused: false, entryMigrationNote: null });
    expect(P.cleanEntryState({ entryPaused: true, entryMigrationNote: 'x'.repeat(500) })).toMatchObject({ entryPaused: true, entryMigrationNote: 'x'.repeat(300) });
  });

  it('keeps valid backward review while refusing mismatched or orphaned completion flags', () => {
    const run = { version: 1, angle: MODERN.angle, time: 100, recovery: 7, recorded: true };
    const reviewed = P.cleanEntryState({ entryRun: run, entryOutcome: MODERN });
    expect(reviewed.entryRun).toEqual({ ...run, recovery: 0 });
    expect(reviewed.entryOutcome).toEqual(MODERN);
    const pastEnd = P.cleanEntryState({ entryRun: { ...run, time: 2000 }, entryOutcome: MODERN });
    expect(pastEnd.entryRun).toEqual({ ...run, time: MODERN.duration });
    const mismatch = P.cleanEntryState({ entryRun: { ...run, angle: -9 }, entryOutcome: MODERN, entryAttempts: [MODERN] });
    expect(mismatch.entryOutcome).toBeNull();
    expect(mismatch.entryRun).toMatchObject({ recorded: false, recovery: 0 });
    expect(mismatch.entryAttempts).toEqual([MODERN]);
    expect(P.cleanEntryState({ entryRun: run }).entryRun.recorded).toBe(false);
    const skip = P.cleanEntryState({ entryRun: { ...run, time: MODERN.duration },
      entryOutcome: { ...MODERN, outcome: 'skip', terminal: 'skip', splashSpeed: null } });
    expect(skip.entryRun.recovery).toBe(0);
  });

  it('rejects nonfinite or contradictory measurements instead of advertising a completed physical result', () => {
    for (const patch of [{ peakHeatFlux: NaN }, { heatLoad: Infinity }, { duration: -1 },
      { duration: 2401 }, { downrange: 1e12 }, { angle: -13 }, { peakG: -1 },
      { completed: 'true' }, { modelVersion: 2 }, { terminal: 'skip' }, { splashSpeed: null }]) {
      expect(P.cleanEntryOutcome({ ...MODERN, ...patch }), JSON.stringify(patch)).toBeNull();
    }
    const skip = { ...MODERN, outcome: 'skip', terminal: 'skip', splashSpeed: null };
    expect(P.cleanEntryOutcome(skip)).toEqual(skip);
    expect(P.cleanEntryOutcome({ ...skip, splashSpeed: 9 })).toBeNull();
    expect(P.cleanEntryOutcome({ ...skip, outcome: 'incomplete', terminal: 'incomplete' })).toMatchObject({ terminal: 'incomplete' });
  });

  it('bounds resumable clocks, history and XP while treating booleans and rate choices strictly', () => {
    const raw = { entryRun: { version: 1, angle: -6.5, time: 1e12, recovery: -1, recorded: 'true' },
      entryAttempts: Array.from({ length: 8 }, (_, i) => ({ ...MODERN, downrange: i })),
      entryAwardedXP: 100, entryCompletionAwarded: 'false', entryPlaybackRate: '60' };
    const clean = P.cleanEntryState(raw);
    expect(clean.entryRun).toEqual({ version: 1, angle: -6.5, time: 2400, recovery: 0, recorded: false });
    expect(clean.entryAttempts.map(a => a.downrange)).toEqual([3, 4, 5, 6, 7]);
    expect(clean.entryAwardedXP).toBe(25);
    expect(clean.entryCompletionAwarded).toBe(false);
    expect(clean.entryPlaybackRate).toBe(30);
    expect(raw.entryRun.time).toBe(1e12);
    expect(P.cleanEntryRun({ ...raw.entryRun, time: -1, recovery: 50, recorded: true })).toMatchObject({ time: 0, recovery: 580 / 60, recorded: true });
    for (const value of [null, [], 'saved', { version: 1, angle: -6.5, time: Infinity, recovery: 0 },
      { version: 1, angle: 2, time: 0, recovery: 0 }]) expect(P.cleanEntryRun(value)).toBeNull();
    expect(P.cleanEntryState({ entryAttempts: 'bad', entryAwardedXP: NaN }).entryAttempts).toEqual([]);
    expect(P.cleanEntryState({ entryAwardedXP: NaN }).entryAwardedXP).toBe(0);
    for (const rate of [1, 10, 30, 60]) expect(P.cleanEntryState({ entryPlaybackRate: rate }).entryPlaybackRate).toBe(rate);
  });

  it('retains legacy attempts and the exact legacy summary shape without inventing physical metrics', () => {
    const legacy = { outcome: 'nominal', angle: -6.4, peakG: 6.3 };
    expect(P.cleanEntryState({ entryOutcome: legacy, entryAttempts: [{ ...legacy, legacy: true }] })).toMatchObject({
      entryOutcome: legacy, entryAttempts: [{ ...legacy, legacy: true }],
    });
    const summary = P.flightSummary({ entryOutcome: { ...legacy, legacy: true } });
    expect(summary.entry).toEqual(legacy);
    expect(P.flightReport(summary)).toContain('Entry: -6.4°, in the corridor, about 6.3 g');
    expect(P.flightReport(summary)).not.toContain('Entry model:');
  });

  it('saves actual profiles throughout the supported angle range without truncating their measurements', () => {
    for (const angle of [-1, -3, -6.5, -9, -12]) {
      const profile = P.entryProfile(angle), summary = profile.summary;
      const record = { ...summary, modelVersion: 1, completed: true, angle: profile.angle,
        terminal: profile.events.splash ? 'splash' : profile.events.skip ? 'skip' : 'incomplete' };
      expect(P.cleanEntryOutcome(record), `angle ${angle}`).toMatchObject({
        outcome: summary.outcome, duration: summary.duration, heatLoad: summary.heatLoad,
        peakHeatFlux: summary.peakHeatFlux, terminal: record.terminal,
      });
    }
  });

  it('reports physical units and keeps skip-outs and incomplete runs distinct from splashdown', () => {
    const summary = P.flightSummary({ entryOutcome: MODERN });
    expect(summary.entry).toEqual(MODERN);
    expect(P.flightReport(summary)).toContain('Entry model: 725.4 s, 1850 km downrange, peak heat flux 2.30 MW/m², heat load 160.0 MJ/m²; splashdown at 9.3 m/s.');
    for (const outcome of ['skip', 'incomplete']) {
      const saved = P.flightSummary({ entryOutcome: { ...MODERN, outcome, terminal: outcome, splashSpeed: null } });
      const report = P.flightReport(saved);
      expect(report).not.toContain('splashdown at');
      expect(report).toContain(outcome === 'skip' ? 'skipped out of the atmosphere' : 'simulation reached its time limit');
      if (outcome === 'incomplete') expect(report).not.toContain('too steep');
    }
  });
});
