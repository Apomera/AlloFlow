import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const GUIDED = { version: 2, mode: 'guided', bank: 0 };
const BANK90 = { version: 2, mode: 'bank', bank: 90 };
const BANK180 = { version: 2, mode: 'bank', bank: 180 };
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
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

describe('entry force and energy inspection state and reports', () => {
  it('normalizes only strict panel preferences without storing calculated measurements', () => {
    expect(P.cleanEntryDynamicsState()).toEqual({ entryDynamicsOpen: false, entryDynamicsView: 'forces' });
    expect(P.cleanEntryDynamicsState({ entryDynamicsOpen: true, entryDynamicsView: 'energy', force: 123 }))
      .toEqual({ entryDynamicsOpen: true, entryDynamicsView: 'energy' });
    for (const value of [null, [], 'energy', { entryDynamicsOpen: 'true', entryDynamicsView: 'ENERGY' },
      { entryDynamicsOpen: 1, entryDynamicsView: true }, { entryDynamicsOpen: {}, entryDynamicsView: 'toString' }]) {
      expect(P.cleanEntryDynamicsState(value)).toEqual({ entryDynamicsOpen: false, entryDynamicsView: 'forces' });
    }
  });

  it('uses the active v2 run own angle and plan rather than the next selected plan', () => {
    const raw = completed(BANK90, { entryPlan: BANK180 }), before = JSON.stringify(raw);
    const source = P.entryDynamicsSource(raw);
    expect(source).toBe(P.entryProfile(-6.5, { plan: BANK90 }));
    expect(Object.isFrozen(source)).toBe(true); expect(Object.isFrozen(source.plan)).toBe(true);
    expect(P.entryDynamicsSource({ ...raw, entryDynamicsOpen: false, entryDynamicsView: 'energy' })).toBe(source);
    expect(JSON.stringify(raw)).toBe(before);
  });

  it('preserves earlier v1 trajectory identity without inventing a bank plan', () => {
    const raw = completed(null, { entryPlan: BANK180 }), source = P.entryDynamicsSource(raw);
    expect(source).toBe(P.entryProfile(-6.5)); expect(source.version).toBe(1);
    expect(source.plan).toBeUndefined();
    expect(P.entryDynamicsReport(raw.entryOutcome)).toContain('earlier guided lift; bank not recorded');
  });

  it('uses selected planner physics before entry and separately verifies a receipt after entry', () => {
    const raw = completed(BANK90, { entryPlan: BANK180 });
    expect(P.entryDynamicsSource({ ...raw, missionPhase: 8 }).plan).toEqual(BANK180);
    expect(P.entryDynamicsSource({ ...raw, missionPhase: 10, entryRun: null }).plan).toEqual(BANK90);
    expect(P.entryDynamicsSource({ ...raw, missionPhase: 10, entryRun: null,
      entryOutcome: { ...raw.entryOutcome, downrange: raw.entryOutcome.downrange + 1 } }).plan).toEqual(BANK180);
  });

  it.each([null, GUIDED])('opens a verified receipt without a playback record at its own terminal time: %s', plan => {
    const raw = completed(plan, { missionPhase: 10, entryRun: null, entryPlan: BANK180,
      entryDynamicsOpen: true, entryDynamicsView: 'energy', difficulty: 'pilot', lunarSamples: [],
      quizCorrect: 0, logbook: [], earnedBadges: { first_step: true, mission_complete: true } });
    const store = newStore({ moonMission: raw });
    const tree = window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
    const inspector = find(tree, node => node.props?.['data-entry-dynamics']);
    const source = P.entryDynamicsSource(raw);
    expect(inspector.props['data-entry-dynamics-time']).toBe(source.summary.duration);
    expect(inspector.props['data-entry-dynamics-source-version']).toBe(plan ? 2 : 1);
    expect(inspector.props['data-entry-dynamics-endpoint']).toBe('preimpact');
    expect(store.toolData.moonMission.entryOutcome).toEqual(raw.entryOutcome);
    expect(store.toolData.moonMission.missionXP).toBe(75);
  });

  it('recomputes a completed receipt mechanical ledger from its own source', () => {
    const raw = completed(BANK90), before = JSON.stringify(raw.entryOutcome);
    const source = P.entryProfile(-6.5, { plan: BANK90 });
    const diagnostics = P.entryDynamicsProfile(source), last = P.entryDynamicsSample(diagnostics, source.summary.duration);
    const report = P.entryDynamicsReport(raw.entryOutcome);
    expect(report).toContain('Calculated entry mechanical-energy check: entry model v2');
    expect(report).toContain('Fixed bank 90');
    expect(report).toContain((last.energy.initial / 1e6).toFixed(3) + ' MJ/kg');
    expect(report).toContain((last.energy.dragWork / 1e6).toFixed(3) + ' MJ/kg');
    expect(report).toContain(diagnostics.summary.maxAbsEnergyResidual.toFixed(3) + ' J/kg');
    expect(report).toContain('Earth-surface gravitational potential is zero');
    expect(report).toContain('lift is perpendicular to velocity');
    expect(report).toContain('heat flux estimates power per area');
    expect(report).toContain('heat load estimates energy per area');
    expect(report).toContain('do not represent the capsule\u2019s total drag work or absorbed shield energy');
    expect(report).toContain('water contact'); expect(JSON.stringify(raw.entryOutcome)).toBe(before);
  });

  it('ignores imported diagnostics metrics and rejects forged canonical flight measurements', () => {
    for (const plan of [null, BANK90]) {
      const receipt = completed(plan).entryOutcome;
      expect(P.entryDynamicsReport({ ...receipt, dynamics: { initialEnergy: 1e99, dragWork: -1 },
        energy: { initial: 1e99 }, maxAbsEnergyResidual: 1e99 })).toBe(P.entryDynamicsReport(receipt));
      for (const key of ['peakHeatFlux', 'heatLoad', 'duration', 'downrange', 'splashSpeed']) {
        expect(P.entryDynamicsReport({ ...receipt, [key]: receipt[key] + 1 }), key).toBe('');
      }
    }
  });

  it('omits legacy, incomplete, unsupported and malformed report receipts', () => {
    const receipt = completed(BANK90).entryOutcome;
    for (const raw of [null, [], 'entry', { outcome: 'nominal', angle: -6.5, peakG: 6.8 },
      { ...receipt, completed: false }, { ...receipt, completed: 'true' }, { ...receipt, modelVersion: 3 },
      { ...receipt, modelVersion: '2' }, { ...receipt, angle: '-6.5' }, { ...receipt, angle: -6.501 },
      { ...receipt, terminal: 'incomplete', outcome: 'incomplete', splashSpeed: null },
      { ...receipt, plan: { ...BANK90, version: 3 } }, { ...receipt, plan: { ...BANK90, bank: '90' } },
      { ...receipt, plan: { version: 2, mode: 'guided', bank: 90 } },
      { ...completed(null).entryOutcome, plan: BANK90 }]) {
      expect(P.entryDynamicsReport(raw), JSON.stringify(raw)).toBe('');
    }
  });

  it('reports a canonical skip endpoint without continuing the orbit or claiming impact', () => {
    const source = P.entryProfile(-6.5, { plan: { version: 2, mode: 'bank', bank: 0 } });
    const receipt = P.entryRecordedResult(source), report = P.entryDynamicsReport(receipt);
    expect(receipt.terminal).toBe('skip'); expect(report).toContain('upward entry interface');
    expect(report).toContain('later orbital flight is omitted'); expect(report).not.toContain('water contact');
  });

  it('adds a recomputed report line without creating new flight-summary evidence fields', () => {
    const raw = completed(BANK90, { entryPlan: BANK180, entryDynamicsOpen: true, entryDynamicsView: 'energy' });
    const summary = P.flightSummary(raw, {}, 100), closed = P.flightSummary({ ...raw,
      entryDynamicsOpen: false, entryDynamicsView: 'forces' }, {}, 100);
    expect(summary).toEqual(closed); expect(summary.entry).toEqual(raw.entryOutcome);
    expect(Object.keys(summary).some(key => /dynamics|mechanical|energy/i.test(key))).toBe(false);
    const report = P.flightReport(summary);
    expect(report).toContain(P.entryDynamicsReport(raw.entryOutcome));
    expect(report).not.toContain('Fixed bank 180');
    const legacy = P.flightSummary({ ...raw, entryOutcome: { outcome: 'nominal', angle: -6.5, peakG: 6.8 } }, {}, 100);
    expect(P.flightReport(legacy)).not.toContain('Calculated entry mechanical-energy check');
  });

  it('omits a dynamics report for an earlier receipt with an extraneous raw bank plan', () => {
    const raw = completed(null), summary = P.flightSummary(raw, {}, 100);
    const forged = { ...summary, entry: { ...summary.entry, plan: BANK90 } };
    expect(P.entryDynamicsReport(forged.entry)).toBe('');
    expect(P.flightReport(forged)).not.toContain('Calculated entry mechanical-energy check');
    expect(P.flightReport(summary)).toContain(P.entryDynamicsReport(raw.entryOutcome));
  });

  it('resets inspection preferences on replay while archiving the original entry receipt and reward', () => {
    const raw = completed(BANK90, { missionPhase: 10, entryDynamicsOpen: true, entryDynamicsView: 'energy',
      difficulty: 'pilot', lunarSamples: [], quizCorrect: 0, logbook: [],
      earnedBadges: { first_step: true, mission_complete: true } });
    const store = newStore({ moonMission: raw });
    const tree = window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
    const again = find(tree, node => node.type === 'button' && /Reset and start a new Moon mission/.test(node.props?.title || ''));
    expect(again).not.toBeNull(); again.props.onClick();
    const replay = store.toolData.moonMission;
    expect(replay.missionPhase).toBe(0); expect(replay.flightHistory).toHaveLength(1);
    expect(replay.flightHistory[0].entry).toEqual(raw.entryOutcome);
    expect(P.cleanEntryDynamicsState(replay)).toEqual({ entryDynamicsOpen: false, entryDynamicsView: 'forces' });
    expect(P.flightReport(replay.flightHistory[0])).toContain(P.entryDynamicsReport(raw.entryOutcome));
  });
});
