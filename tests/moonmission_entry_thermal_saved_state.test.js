import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const GUIDED = { version: 2, mode: 'guided', bank: 0 };
const BANK60 = { version: 2, mode: 'bank', bank: 60 };
const BANK180 = { version: 2, mode: 'bank', bank: 180 };
const DEFAULT = { version: 1, thickness: 0.05, conductivity: 0.12, emissivity: 0.85 };
const EXPERIMENT = { version: 1, thickness: 0.07, conductivity: 0.24, emissivity: 0.65 };
let P;
beforeEach(() => {
  resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
function completed(plan = GUIDED, extra = {}) {
  const profile = plan ? P.entryProfile(-6.5, { plan }) : P.entryProfile(-6.5);
  const entryOutcome = P.entryRecordedResult(profile);
  return { missionPhase: 9, entryAngle: -6.5, entryPlan: GUIDED,
    entryRun: { version: profile.version, angle: profile.angle, time: profile.summary.duration,
      recovery: 0, recorded: true, ...(profile.version === 2 ? { plan: { ...profile.plan } } : {}) },
    entryOutcome, entryAttempts: [entryOutcome], entryAwardedXP: 25, entryCompletionAwarded: true,
    missionXP: 75, ...extra };
}
function snapshot(plan = EXPERIMENT, time = 100) {
  return P.entryThermalSnapshot(P.entryProfile(-6.5, { plan: BANK60 }), plan, time);
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

describe('independent entry thermal experiment save state', () => {
  it('uses bounded defaults without introducing a thermal result into entry evidence', () => {
    expect(P.cleanEntryThermalState()).toEqual({ entryThermalPlan: DEFAULT, entryThermalOpen: false,
      entryThermalFollow: true, entryThermalTime: 0, entryThermalIncludeReport: false });
    const state = P.cleanEntryThermalState({ entryThermalPlan: EXPERIMENT,
      entryThermalOpen: true, entryThermalFollow: false, entryThermalTime: 50, entryThermalIncludeReport: true });
    expect(state).toEqual({ entryThermalPlan: EXPERIMENT, entryThermalOpen: true,
      entryThermalFollow: false, entryThermalTime: 50, entryThermalIncludeReport: true });
    expect(Object.isFrozen(state.entryThermalPlan)).toBe(true);
    expect(Object.keys(P.entryRecordedResult(P.entryProfile(-6.5, { plan: GUIDED })))).not.toContain('thermal');
  });

  it('treats imported booleans, parameter types and future plan versions strictly', () => {
    for (const entryThermalPlan of [null, [], 'saved', { ...EXPERIMENT, version: 2 },
      { version: 1, thickness: '0.07', conductivity: NaN, emissivity: Infinity }]) {
      expect(P.cleanEntryThermalState({ entryThermalPlan }).entryThermalPlan).toEqual(DEFAULT);
    }
    expect(P.cleanEntryThermalState({ entryThermalOpen: 'true', entryThermalFollow: 'false',
      entryThermalTime: '100', entryThermalIncludeReport: 'true' })).toEqual({ entryThermalPlan: DEFAULT,
      entryThermalOpen: false, entryThermalFollow: true, entryThermalTime: 0, entryThermalIncludeReport: false });
  });

  it('normalizes finite parameters and bounds the independent clock without mutating imports', () => {
    const raw = { entryThermalPlan: { version: 1, thickness: 0.009, conductivity: 99, emissivity: -1, samples: [1] },
      entryThermalTime: 1e12 };
    const before = JSON.parse(JSON.stringify(raw));
    expect(P.cleanEntryThermalState(raw)).toMatchObject({
      entryThermalPlan: { version: 1, thickness: 0.01, conductivity: 1.2, emissivity: 0 }, entryThermalTime: 2700,
    });
    expect(P.cleanEntryThermalState({ entryThermalPlan: { thickness: 0.0564, conductivity: 0.129, emissivity: 0.854 } }).entryThermalPlan)
      .toEqual({ version: 1, thickness: 0.056, conductivity: 0.13, emissivity: 0.85 });
    for (const value of [NaN, Infinity, -1]) expect(P.cleanEntryThermalState({ entryThermalTime: value }).entryThermalTime).toBe(0);
    expect(raw).toEqual(before);
  });

  it('resolves an active v2 run from its immutable plan despite a changed selected plan', () => {
    const raw = completed(BANK60, { entryPlan: BANK180 });
    const before = JSON.parse(JSON.stringify(raw)), source = P.entryThermalSource(raw);
    expect(source).toBe(P.entryProfile(-6.5, { plan: BANK60 }));
    expect(source.version).toBe(2); expect(source.plan).toEqual(BANK60);
    expect(Object.isFrozen(source)).toBe(true); expect(Object.isFrozen(source.samples)).toBe(true);
    expect(raw).toEqual(before);
  });

  it('uses exact earlier entry physics for an authentic v1 run', () => {
    const raw = completed(null, { entryPlan: BANK180 }), source = P.entryThermalSource(raw);
    expect(source).toBe(P.entryProfile(-6.5)); expect(source.version).toBe(1);
    const preview = P.entryThermalSnapshot(source, DEFAULT, 50);
    expect(preview.source).toEqual({ modelVersion: 1, angle: -6.5 });
    expect(P.entryThermalReport(preview)).toContain('earlier guided-lift model');
  });

  it('uses selected planner physics before entry while leaving the former run untouched', () => {
    const raw = completed(GUIDED, { missionPhase: 8, entryPlan: BANK180 }), before = JSON.parse(JSON.stringify(raw));
    const source = P.entryThermalSource(raw);
    expect(source).toBe(P.entryProfile(-6.5, { plan: BANK180 }));
    expect(source.plan).toEqual(BANK180); expect(raw).toEqual(before);
  });

  it('can reference independently verified outcomes without accepting synthetic v1 archives as flown inputs', () => {
    const modern = completed(BANK60, { missionPhase: 10, entryRun: null, entryPlan: BANK180 });
    expect(P.entryThermalSource(modern).plan).toEqual(BANK60);
    const earlier = completed(null, { missionPhase: 10, entryRun: null, entryPlan: BANK180 });
    expect(P.entryThermalSource(earlier).version).toBe(1);
    const synthetic = { ...earlier, entryOutcome: { modelVersion: 1, completed: true, outcome: 'nominal',
      angle: -6.5, peakG: 6.8, peakHeatFlux: 2300000, heatLoad: 160000000, duration: 725.4,
      downrange: 1850000, splashSpeed: 9.3, terminal: 'splash' } };
    expect(P.entryThermalSource(synthetic).version).toBe(2);
    expect(P.entryThermalSource(synthetic).plan).toEqual(BANK180);
  });

  it('creates a detached compact preview from its source and assumptions', () => {
    const source = P.entryProfile(-6.5, { plan: BANK60 }), before = JSON.stringify(source), saved = snapshot();
    expect(saved.source).toEqual({ modelVersion: 2, angle: -6.5, plan: BANK60 });
    expect(saved.plan).toEqual(EXPERIMENT); expect(saved.time).toBe(100);
    expect(Object.keys(saved).sort()).toEqual(['version', 'source', 'plan', 'time', 'at', 'summary'].sort());
    expect(Object.keys(saved.at).sort()).toEqual(['surfaceT', 'backT'].sort());
    expect(Object.keys(saved.summary).sort()).toEqual(['peakSurfaceT', 'peakSurfaceTime', 'peakBackT', 'peakBackTime',
      'duration', 'entryDuration', 'heatIn', 'heatRadiated', 'storedEnergy', 'maxEnergyResidual'].sort());
    expect(saved.samples).toBeUndefined();
    saved.source.plan.bank = 180; saved.plan.thickness = 0.01; saved.at.surfaceT = -1;
    expect(JSON.stringify(source)).toBe(before);
  });

  it('recomputes forged derived temperatures and energies from archived inputs', () => {
    const saved = snapshot(), forged = { ...saved, at: { surfaceT: 1e12, backT: -1 },
      summary: { ...saved.summary, peakSurfaceT: 1e12, storedEnergy: Infinity }, samples: [1], unknown: true };
    const before = JSON.stringify(forged), cleaned = P.cleanEntryThermalSnapshot(forged);
    expect(cleaned).toEqual(saved); expect(JSON.stringify(forged)).toBe(before);
    expect(cleaned).not.toBe(saved); expect(cleaned.source.plan).not.toBe(saved.source.plan);
    expect(cleaned.at).not.toBe(saved.at); expect(cleaned.summary).not.toBe(saved.summary);
  });

  it('omits snapshots with unsupported source, parameter or clock schemas', () => {
    const saved = snapshot();
    for (const patch of [{ version: 2 }, { source: null }, { source: { ...saved.source, modelVersion: 3 } },
      { source: { ...saved.source, angle: '6.5' } }, { source: { ...saved.source, angle: -13 } },
      { source: { ...saved.source, angle: -6.501 } }, { source: { ...saved.source, modelVersion: 1 } },
      { source: { ...saved.source, plan: { ...BANK60, version: 3 } } },
      { source: { ...saved.source, plan: { version: 2, mode: 'guided', bank: 60 } } },
      { plan: { ...EXPERIMENT, version: 2 } }, { plan: { ...EXPERIMENT, thickness: 0 } },
      { plan: { ...EXPERIMENT, thickness: 0.0701 } }, { plan: { ...EXPERIMENT, conductivity: '0.24' } },
      { plan: { ...EXPERIMENT, conductivity: 0.241 } }, { plan: { ...EXPERIMENT, emissivity: NaN } },
      { plan: { ...EXPERIMENT, emissivity: 1.1 } }, { time: '100' }, { time: -1 }, { time: Infinity }, { time: 2701 }]) {
      expect(P.cleanEntryThermalSnapshot({ ...saved, ...patch }), JSON.stringify(patch)).toBeNull();
      expect(P.entryThermalReport({ ...saved, ...patch }), JSON.stringify(patch)).toBe('');
    }
  });

  it('clamps display sampling to its own entry plus 300-second cooling interval', () => {
    const source = P.entryProfile(-6.5, { plan: GUIDED }), profile = P.entryThermalProfile(source, DEFAULT);
    expect(P.entryThermalSnapshot(source, DEFAULT, -1).time).toBe(0);
    expect(P.entryThermalSnapshot(source, DEFAULT, Infinity).time).toBe(0);
    expect(P.entryThermalSnapshot(source, DEFAULT, 1e12).time).toBe(profile.summary.duration);
    expect(profile.summary.duration - profile.summary.entryDuration).toBeCloseTo(300, 9);
  });

  it('supports following a verified entry clock or independently scrubbing the experiment', () => {
    const raw = completed(GUIDED, { entryRun: { ...completed().entryRun, time: 50 },
      entryThermalPlan: EXPERIMENT, entryThermalTime: 200, entryThermalIncludeReport: true });
    const before = JSON.parse(JSON.stringify(raw));
    expect(P.entryThermalPreview(raw).time).toBe(50);
    expect(P.entryThermalPreview({ ...raw, entryThermalFollow: false }).time).toBe(200);
    expect(P.entryThermalPreview({ ...raw, entryThermalFollow: 'false' }).time).toBe(50);
    expect(raw).toEqual(before);
    const damaged = { ...raw, entryRun: { ...raw.entryRun, time: raw.entryOutcome.duration, recorded: false } };
    expect(P.entryThermalPreview(damaged).time).toBe(0);
  });

  it('preserves experiment controls and evidence through serialization and reload', () => {
    const raw = completed(BANK60, { entryPlan: BANK180, entryThermalPlan: EXPERIMENT,
      entryThermalOpen: true, entryThermalFollow: false, entryThermalTime: 150, entryThermalIncludeReport: true });
    const before = JSON.parse(JSON.stringify(raw)), state = P.cleanEntryThermalState(raw), preview = P.entryThermalPreview(raw);
    const reopened = JSON.parse(JSON.stringify({ ...raw, ...state }));
    expect(P.cleanEntryThermalState(reopened)).toEqual(state);
    expect(P.entryThermalPreview(reopened)).toEqual(preview);
    expect(reopened.entryRun).toEqual(before.entryRun); expect(reopened.entryOutcome).toEqual(before.entryOutcome);
    expect(reopened.entryAttempts).toEqual(before.entryAttempts); expect(reopened.missionXP).toBe(75);
    expect(reopened.entryAwardedXP).toBe(25); expect(reopened.entryCompletionAwarded).toBe(true);
    expect(raw).toEqual(before);
  });

  it('keeps optional report export absent until strictly included', () => {
    const raw = completed(BANK60, { missionPhase: 10, entryThermalPlan: EXPERIMENT, entryThermalTime: 100, entryThermalFollow: false });
    for (const entryThermalIncludeReport of [undefined, false, 'true', 1]) {
      const input = { ...raw, entryThermalIncludeReport }, summary = P.flightSummary(input);
      expect(P.entryThermalPreview(input)).toBeNull(); expect(summary).not.toHaveProperty('thermalPreview');
      expect(P.flightReport(summary)).not.toContain('Independent thermal experiment');
    }
    const summary = P.flightSummary({ ...raw, entryThermalIncludeReport: true });
    expect(summary.entry).toEqual(raw.entryOutcome);
    expect(summary.thermalPreview).toEqual(P.entryThermalPreview({ ...raw, entryThermalIncludeReport: true }));
    expect(P.flightReport(summary)).toContain('Independent thermal experiment (calculated preview)');
  });

  it('exports the source, every parameter, fixed assumptions, temperatures and energy units', () => {
    const report = P.entryThermalReport(snapshot());
    for (const text of ['entry model v2', '-6.50°', 'Fixed bank 60°', '70.0 mm', '0.24 W/(m·K)',
      'emissivity 0.65', '500 kg/m³', '1500 J/(kg·K)', 'initial temperature 293.15 K',
      'environment temperature 293.15 K', 'At 100.0 s', 'Peak surface', 'peak back face', 'maxima within the simulated window',
      'incident', 'reradiated', 'stored', 'MJ/m²', '300 s of zero-input cooling', 'insulated back face',
      'No ablation', 'pyrolysis', 'temperature-dependent properties', 'hot-wall feedback', 'cabin temperatures',
      'ocean cooling', 'fixed 293.15 K surroundings', 'solar and planetary heating', 'does not continue orbital flight',
      'do not predict Apollo heat-shield or crew survival']) expect(report, text).toContain(text);
  });

  it('keeps an archived preview tied to its original source and assumptions', () => {
    const raw = completed(BANK60, { missionPhase: 10, entryThermalPlan: EXPERIMENT, entryThermalFollow: false,
      entryThermalTime: 100, entryThermalIncludeReport: true });
    const archived = P.flightSummary(raw), before = JSON.stringify(archived), report = P.flightReport(archived);
    raw.entryPlan = BANK180; raw.entryThermalPlan = DEFAULT; raw.entryThermalTime = 300;
    expect(P.flightReport(archived)).toBe(report); expect(JSON.stringify(archived)).toBe(before);
    expect(report).toContain('Fixed bank 60°'); expect(report).not.toContain('Fixed bank 180°');
    expect(report).toContain('70.0 mm'); expect(report).not.toContain('thickness 50.0 mm');
    const forged = { ...archived, thermalPreview: { ...archived.thermalPreview,
      at: { surfaceT: 1e12, backT: -1 }, summary: { peakSurfaceT: 1e12 } } };
    expect(P.flightReport(forged)).toBe(report);
  });

  it('archives the experiment before a full mission replay restores all lab defaults', () => {
    const raw = completed(BANK60, { missionPhase: 10, entryThermalPlan: EXPERIMENT, entryThermalOpen: true,
      entryThermalFollow: false, entryThermalTime: 100, entryThermalIncludeReport: true, animPaused: true, soundOff: true });
    const store = newStore({ moonMission: raw });
    const tree = window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
    const again = find(tree, node => node.type === 'button' && /Reset and start a new Moon mission/.test(node.props?.title || ''));
    expect(again).not.toBeNull(); again.props.onClick();
    const replay = store.toolData.moonMission;
    expect(replay.missionPhase).toBe(0); expect(replay.flightHistory).toHaveLength(1);
    expect(replay.flightHistory[0].entry).toEqual(raw.entryOutcome);
    expect(replay.flightHistory[0].thermalPreview).toEqual(snapshot(EXPERIMENT, 100));
    expect(P.cleanEntryThermalState(replay)).toEqual({ entryThermalPlan: DEFAULT,
      entryThermalOpen: false, entryThermalFollow: true, entryThermalTime: 0, entryThermalIncludeReport: false });
  });
});
