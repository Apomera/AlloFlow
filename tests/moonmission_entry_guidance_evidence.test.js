import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const GUIDED = { version: 2, mode: 'guided', bank: 0 };
const BALLISTIC = { version: 2, mode: 'ballistic', bank: 0 };
const bank = value => ({ version: 2, mode: 'bank', bank: value });
const ARCHIVED_V1 = Object.freeze({
  modelVersion: 1, completed: true, outcome: 'nominal', angle: -6.5, peakG: 6.8,
  peakHeatFlux: 2300000, heatLoad: 160000000, duration: 725.4, downrange: 1850000,
  splashSpeed: 9.3, terminal: 'splash',
});
let P;
beforeEach(() => {
  resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
function completed(plan = GUIDED, angle = -6.5) {
  const profile = plan ? P.entryProfile(angle, { plan }) : P.entryProfile(angle);
  const entryOutcome = P.entryRecordedResult(profile);
  const entryRun = { version: profile.version, angle: profile.angle, time: profile.summary.duration,
    recovery: 0, recorded: true, ...(profile.version === 2 ? { plan: { ...profile.plan } } : {}) };
  return { entryOutcome, entryRun };
}

describe('entry guidance receipts and restored evidence', () => {
  it('keeps compact canonical v2 records for each selectable guidance mode', () => {
    for (const plan of [GUIDED, BALLISTIC, bank(0), bank(60), bank(90), bank(180)]) {
      const raw = completed(plan), clean = P.cleanEntryOutcome({ ...raw.entryOutcome,
        plan: { ...raw.entryOutcome.plan, unknown: true }, samples: [1, 2, 3], unknown: true });
      expect(clean, JSON.stringify(plan)).toEqual(raw.entryOutcome);
      expect(clean).not.toBe(raw.entryOutcome); expect(clean.plan).not.toBe(raw.entryOutcome.plan);
      expect(P.entryReceiptMatches(clean, raw.entryRun)).toBe(true);
      expect(Object.keys(clean).sort()).toEqual([
        'angle', 'completed', 'downrange', 'duration', 'heatLoad', 'modelVersion', 'outcome',
        'peakG', 'peakHeatFlux', 'plan', 'splashSpeed', 'terminal',
      ].sort());
    }
  });

  it('rejects finite changes to every persisted physical measurement', () => {
    const raw = completed();
    for (const key of ['angle', 'peakG', 'peakHeatFlux', 'heatLoad', 'duration', 'downrange', 'splashSpeed']) {
      const altered = { ...raw.entryOutcome, [key]: raw.entryOutcome[key] + 0.2 };
      expect(P.cleanEntryOutcome(altered), key).toBeNull();
      expect(P.entryReceiptMatches(altered, raw.entryRun), key).toBe(false);
      const state = P.cleanEntryState({ ...raw, entryOutcome: altered });
      expect(state.entryOutcome, key).toBeNull();
      expect(state.entryRun, key).toMatchObject({ time: 0, recovery: 0, recorded: false });
      expect(state.entryMigrationNote, key).toMatch(/could not be verified/);
    }
    for (const patch of [{ completed: false }, { completed: 'true' }, { modelVersion: 3 },
      { outcome: 'skip' }, { terminal: 'skip' }, { splashSpeed: null }, { duration: NaN },
      { heatLoad: Infinity }, { peakG: '7' }]) {
      expect(P.cleanEntryOutcome({ ...raw.entryOutcome, ...patch }), JSON.stringify(patch)).toBeNull();
    }
  });

  it('accepts only floating save roundoff and returns canonical measurements', () => {
    const { entryOutcome } = completed();
    const rounded = { ...entryOutcome, heatLoad: entryOutcome.heatLoad * (1 + 5e-13),
      downrange: entryOutcome.downrange * (1 - 5e-13) };
    expect(P.cleanEntryOutcome(JSON.parse(JSON.stringify(rounded)))).toEqual(entryOutcome);
    expect(P.cleanEntryOutcome({ ...entryOutcome, heatLoad: entryOutcome.heatLoad * (1 + 1e-8) })).toBeNull();
  });

  it('requires strict scalar plan identities and strips unknown plan data', () => {
    const raw = completed(bank(60));
    for (const plan of [null, [], 'bank', {}, { version: 1, mode: 'bank', bank: 60 },
      { version: 2, mode: 'invalid', bank: 60 }, { version: 2, mode: 'bank', bank: '60' },
      bank(NaN), bank(Infinity), bank(-0.1), bank(180.1), bank(60.01),
      { version: 2, mode: 'guided', bank: 60 }, { version: 2, mode: 'ballistic', bank: 90 }]) {
      expect(P.cleanEntryOutcome({ ...raw.entryOutcome, plan }), JSON.stringify(plan)).toBeNull();
      expect(P.cleanEntryRun({ ...raw.entryRun, plan }), JSON.stringify(plan)).toBeNull();
    }
    expect(P.cleanEntryRun({ ...raw.entryRun, plan: { ...raw.entryRun.plan, samples: [] } }).plan).toEqual(bank(60));
  });

  it('refuses a different valid bank plan or a run from another model version', () => {
    const raw = completed(bank(60));
    expect(P.cleanEntryOutcome({ ...raw.entryOutcome, plan: bank(120) })).toBeNull();
    for (const run of [{ ...raw.entryRun, plan: bank(120) }, { ...raw.entryRun, angle: -6 },
      { ...raw.entryRun, version: 1 }, { ...raw.entryRun, version: 3 },
      { ...raw.entryRun, time: Infinity }]) {
      expect(P.entryReceiptMatches(raw.entryOutcome, run)).toBe(false);
      const state = P.cleanEntryState({ ...raw, entryRun: run });
      expect(state.entryOutcome).toBeNull();
      if (state.entryRun) expect(state.entryRun).toMatchObject({ time: 0, recovery: 0, recorded: false });
    }
  });

  it('uses the run and receipt plan independently of the selected next plan', () => {
    const raw = completed(bank(60));
    const state = P.cleanEntryState({ ...raw, entryPlan: BALLISTIC,
      entryAttempts: [raw.entryOutcome], entryPaused: true });
    expect(state.entryPlan).toEqual(BALLISTIC);
    expect(state.entryRun).toEqual(raw.entryRun); expect(state.entryOutcome).toEqual(raw.entryOutcome);
    expect(state.entryAttempts).toEqual([raw.entryOutcome]);
    expect(state.entryPaused).toBe(true);
    expect(P.cleanEntryState({ ...raw, entryPlan: { mode: 'unknown', bank: NaN } }).entryPlan).toEqual(GUIDED);
  });

  it('preserves authentic completed v1 flights while rejecting synthetic active archives', () => {
    const raw = completed(null), state = P.cleanEntryState(raw);
    expect(raw.entryOutcome.modelVersion).toBe(1); expect(raw.entryOutcome.plan).toBeUndefined();
    expect(state.entryOutcome).toEqual(raw.entryOutcome); expect(state.entryRun).toEqual(raw.entryRun);
    expect(P.entryReceiptMatches(raw.entryOutcome, raw.entryRun)).toBe(true);
    const exactPeak = { ...raw.entryOutcome, peakG: P.entryProfile(raw.entryOutcome.angle).summary.peakG };
    expect(P.entryReceiptMatches(exactPeak, raw.entryRun)).toBe(true);
    expect(P.entryReceiptMatches({ ...raw.entryOutcome, peakG: exactPeak.peakG + 0.2 }, raw.entryRun)).toBe(false);

    expect(P.cleanEntryOutcome(ARCHIVED_V1)).toEqual(ARCHIVED_V1);
    const synthetic = P.cleanEntryState({ entryOutcome: ARCHIVED_V1,
      entryRun: { version: 1, angle: -6.5, time: ARCHIVED_V1.duration, recovery: 5, recorded: true },
      entryAttempts: [ARCHIVED_V1], entryAwardedXP: 25, entryCompletionAwarded: true });
    expect(synthetic.entryOutcome).toBeNull();
    expect(synthetic.entryRun).toEqual({ version: 1, angle: -6.5, time: 0, recovery: 0, recorded: false });
    expect(synthetic.entryAttempts).toEqual([ARCHIVED_V1]);
    expect(synthetic.entryAwardedXP).toBe(25); expect(synthetic.entryCompletionAwarded).toBe(true);
  });

  it('retains authentic completion when rewinding and clamps later review to the endpoint', () => {
    for (const plan of [null, GUIDED, bank(60)]) {
      const raw = completed(plan);
      const rewind = P.cleanEntryState({ ...raw, entryRun: { ...raw.entryRun, time: 50, recovery: 7 } });
      expect(rewind.entryOutcome).toEqual(raw.entryOutcome);
      expect(rewind.entryRun).toMatchObject({ time: 50, recovery: 0, recorded: true });
      const later = P.cleanEntryState({ ...raw, entryRun: { ...raw.entryRun, time: 1e9, recovery: 50 } });
      expect(later.entryRun.time).toBe(raw.entryOutcome.duration);
      expect(later.entryRun.recovery).toBe(raw.entryOutcome.terminal === 'splash' ? 580 / 60 : 0);
    }
  });

  it('resumes a partial unrecorded run without resetting its elapsed time', () => {
    const raw = completed();
    const state = P.cleanEntryState({ entryRun: { ...raw.entryRun, time: 50, recovery: 2, recorded: false } });
    expect(state.entryOutcome).toBeNull();
    expect(state.entryRun).toMatchObject({ time: 50, recovery: 0, recorded: false });
    expect(state.entryMigrationNote).toBeNull();
    const run = P.cleanEntryRun({ ...raw.entryRun, time: -1, recovery: 50, recorded: 'true' });
    expect(run).toMatchObject({ time: 0, recovery: 580 / 60, recorded: false });
  });

  it('restarts orphaned or corrupted terminal runs instead of immediately rerecording', () => {
    const raw = completed();
    for (const extra of [{ entryOutcome: null },
      { entryOutcome: { ...raw.entryOutcome, peakHeatFlux: raw.entryOutcome.peakHeatFlux + 1 } },
      { entryRun: { ...raw.entryRun, recorded: false } },
      { entryRun: { ...raw.entryRun, recorded: 'true' } },
      { entryOutcome: null, entryRun: { ...raw.entryRun, recorded: false } }]) {
      const state = P.cleanEntryState({ ...raw, ...extra, entryAwardedXP: 25, entryCompletionAwarded: true });
      expect(state.entryOutcome).toBeNull();
      expect(state.entryRun).toMatchObject({ time: 0, recovery: 0, recorded: false });
      expect(state.entryMigrationNote).toMatch(/Playback restarts at entry interface/);
      expect(state.entryAwardedXP).toBe(25); expect(state.entryCompletionAwarded).toBe(true);
    }
    const priorNote = 'Earlier migration was already explained.';
    expect(P.cleanEntryState({ ...raw, entryOutcome: null, entryMigrationNote: priorNote }).entryMigrationNote).toBe(priorNote);
    const invalidRun = P.cleanEntryState({ entryRun: { ...raw.entryRun, version: 3 }, entryOutcome: null });
    expect(invalidRun.entryRun).toBeNull(); expect(invalidRun.entryOutcome).toBeNull();
    expect(invalidRun.entryMigrationNote).toMatch(/could not be verified/);
  });

  it('keeps orphaned physical archives readable without treating them as recorded runs', () => {
    for (const entryOutcome of [completed().entryOutcome, ARCHIVED_V1]) {
      const state = P.cleanEntryState({ entryOutcome, entryAttempts: [entryOutcome], missionPhase: 10 });
      expect(state.entryOutcome).toEqual(entryOutcome); expect(state.entryRun).toBeNull();
      expect(P.entryReceiptMatches(state.entryOutcome, state.entryRun)).toBe(false);
      expect(state.entryAttempts).toEqual([entryOutcome]);
    }
  });

  it('keeps only recent compact archives and preserves already-paid reward flags', () => {
    const archives = Array.from({ length: 8 }, (_, i) => ({ ...ARCHIVED_V1, downrange: i, samples: [1] }));
    const state = P.cleanEntryState({ entryAttempts: archives, entryAwardedXP: 99,
      entryCompletionAwarded: true, entryPaused: true, entryPlaybackRate: 60 });
    expect(state.entryAttempts.map(attempt => attempt.downrange)).toEqual([3, 4, 5, 6, 7]);
    expect(state.entryAttempts.every(attempt => !('samples' in attempt))).toBe(true);
    expect(state.entryAwardedXP).toBe(25); expect(state.entryCompletionAwarded).toBe(true);
    expect(state.entryPaused).toBe(true); expect(state.entryPlaybackRate).toBe(60);
    expect(archives[0].samples).toEqual([1]);
    expect(P.cleanEntryState({ entryAttempts: {}, entryAwardedXP: NaN, entryCompletionAwarded: 'true' })).toMatchObject({
      entryAttempts: [], entryAwardedXP: 0, entryCompletionAwarded: false,
    });
  });

  it('retains exact earlier animation summaries without inventing physical measurements', () => {
    const legacy = { outcome: 'nominal', angle: -6.4, peakG: 6.3 };
    const state = P.cleanEntryState({ entryOutcome: legacy, entryAttempts: [{ ...legacy, legacy: true }],
      entryAwardedXP: 25, entryCompletionAwarded: true });
    expect(state.entryOutcome).toEqual(legacy);
    expect(state.entryAttempts).toEqual([{ ...legacy, legacy: true }]);
    expect(state.entryAwardedXP).toBe(25); expect(state.entryCompletionAwarded).toBe(true);
    expect(P.entryReceiptMatches(legacy, { version: 1, angle: legacy.angle, time: 2400, recovery: 0, recorded: true })).toBe(false);
  });

  it('detaches plans, runs and attempts so reviewing cannot rewrite saved evidence', () => {
    const raw = { ...completed(bank(60)), entryPlan: GUIDED };
    raw.entryAttempts = [raw.entryOutcome];
    const before = JSON.parse(JSON.stringify(raw)), state = P.cleanEntryState(raw);
    state.entryRun.plan.bank = 120; state.entryRun.time = 0;
    state.entryOutcome.plan.bank = 120; state.entryAttempts[0].duration = -1;
    state.entryAttempts[0].plan.bank = 180;
    expect(Object.isFrozen(state.entryPlan)).toBe(true);
    expect(() => { state.entryPlan.mode = 'ballistic'; }).toThrow(TypeError);
    expect(raw).toEqual(before);
  });
});
