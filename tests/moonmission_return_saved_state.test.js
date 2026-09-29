import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let P;
beforeEach(() => {
  resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure;
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
});
afterEach(() => vi.restoreAllMocks());
function completed(angle = -6.5) {
  const p = P.returnProfile(angle);
  return { entryAngle: angle, returnRun: { version: 1, angle, time: p.summary.duration, recorded: true }, returnResult: { version: 1, ...p.summary } };
}
function walk(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = walk(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : walk(node.props?.children, predicate);
}
function app(extra = {}) {
  const store = newStore({ moonMission: { missionPhase: 8, missionXP: 0, missionLog: [], soundOff: true, ...extra } });
  const tree = () => window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
  return { tree, data: () => store.toolData.moonMission, prop: (key, value) => walk(tree(), node => node.props?.[key] === value).props };
}

describe('measured return save and progression', () => {
  it('restores earlier review without sharing mutable run or summary objects', () => {
    const raw = { ...completed(), returnRun: { version: 1, angle: -6.5, time: 1000, recorded: true }, returnPaused: true, returnView: 'approach', returnPlaybackRate: 60 };
    const state = P.cleanReturnPlayback(raw);
    expect(state.returnRun).toEqual(raw.returnRun); expect(state.returnResult).toEqual(raw.returnResult);
    expect(state.returnPaused).toBe(true); expect(state.returnView).toBe('approach'); expect(state.returnPlaybackRate).toBe(60);
    state.returnRun.time = 0; state.returnResult.duration = -1;
    expect(raw.returnRun.time).toBe(1000); expect(raw.returnResult.duration).toBeGreaterThan(0);
  });
  it('recomputes each result field and rejects stale, future and unrecorded claims', () => {
    const raw = completed();
    for (const key of Object.keys(raw.returnResult)) {
      const state = P.cleanReturnPlayback({ ...raw, returnResult: { ...raw.returnResult, [key]: raw.returnResult[key] + 1 } });
      expect(state.returnResult, key).toBeNull(); expect(state.returnRun.recorded, key).toBe(false); expect(state.returnRun.time, key).toBe(0);
    }
    for (const run of [null, {}, { version: 2, angle: -6.5, time: 0 }, { version: 1, angle: -6.5, time: NaN }, { version: 1, angle: -6.5, time: raw.returnRun.time, recorded: 'true' }]) {
      expect(P.cleanReturnPlayback({ ...raw, returnRun: run }).returnResult).toBeNull();
    }
    expect(P.cleanReturnPlayback({ ...raw, entryAngle: -5 }).returnRun).toBeNull();
    expect(P.cleanReturnPlayback({ ...raw, returnRun: { ...raw.returnRun, recorded: false } }).returnResult).toBeNull();
  });
  it('clamps finite clocks and supported controls without treating strings as flags', () => {
    const raw = completed(), state = P.cleanReturnPlayback({ ...raw, returnRun: { ...raw.returnRun, time: 1e9 }, returnPlaybackRate: 999, returnPaused: 'true', returnView: 'unexpected' });
    expect(state.returnRun.time).toBe(state.returnResult.duration); expect(state.returnPaused).toBe(false);
    expect(state.returnPlaybackRate).toBe(3600); expect(state.returnView).toBe('system');
    expect(P.cleanReturnPlayback({ ...raw, returnRun: { ...raw.returnRun, time: -100 } }).returnRun.time).toBe(0);
    for (const rate of [1, 60, 600, 3600]) expect(P.cleanReturnPlayback({ returnPlaybackRate: rate }).returnPlaybackRate).toBe(rate);
  });
  it('requires a recorded interface before beginning entry, including legacy and malformed saves', () => {
    for (const extra of [{}, { returnResult: completed().returnResult }, { ...completed(), returnRun: null }, { ...completed(), entryAngle: -5 }, { ...completed(), returnResult: { version: 2 } }]) {
      const state = app(extra), begin = state.prop('data-entry-begin', 'true');
      expect(begin.disabled).toBe(true); begin.onClick();
      expect(state.data().missionPhase).toBe(8); expect(state.data().entryRun).toBeUndefined(); expect(state.data().missionXP).toBe(0);
    }
  });
  it('hands the selected physical angle to entry exactly once without awarding points', () => {
    const state = app(completed(-5)), begin = state.prop('data-entry-begin', 'true');
    expect(begin.disabled).toBe(false); begin.onClick(); begin.onClick();
    expect(state.data().missionPhase).toBe(9); expect(state.data().entryRun).toEqual({ version: 1, angle: -5, time: 0, recovery: 0, recorded: false });
    expect(state.data().missionLog).toHaveLength(1); expect(state.data().missionXP).toBe(0);
  });
  it('retains completion on the same preset and clears it for changed planner controls', () => {
    const state = app(completed()); state.prop('data-entry-preset', 'reference').onClick();
    expect(state.prop('data-entry-begin', 'true').disabled).toBe(false);
    state.prop('data-entry-preset', 'shallow').onClick();
    expect(state.data().returnRun).toBeNull(); expect(state.data().returnResult).toBeNull();
    expect(state.data().returnPaused).toBe(true); expect(state.prop('data-entry-begin', 'true').disabled).toBe(true);
  });
  it('remains reviewable in old later-phase saves without rewriting archived entry evidence', () => {
    const oldEntry = { angle: -6.5, peakG: 6.8, outcome: 'nominal' };
    const html = renderTool('moonMission', { moonMission: { missionPhase: 10, entryOutcome: oldEntry, entryAngle: -6.5, flightHistory: [{ entry: oldEntry }] } });
    expect(html).toContain('about 6.8 g'); expect(html).not.toContain('NaN');
    expect(P.cleanReturnPlayback({ missionPhase: 10, entryOutcome: oldEntry }).returnResult).toBeNull();
  });
  it('includes only measured return evidence in the archived flight summary and report', () => {
    const raw = completed(), summary = P.flightSummary(raw), text = P.flightReport(summary);
    expect(summary.returnFlight).toEqual(raw.returnResult);
    expect(text).toContain('Earth return: 62.86 h'); expect(text).toContain('radial closing speed 1.249 km/s');
    expect(text).toContain('Earth-only preset, matched to entry');
    expect(P.flightSummary({ returnResult: raw.returnResult }).returnFlight).toBeNull();
    expect(P.flightReport(P.flightSummary({}))).not.toContain('Earth return:');
  });
  it('archives the measured coast and clears the run and view settings on replay', () => {
    const raw = completed(), state = app({ missionPhase: 10, ...raw, returnPaused: true, returnPlaybackRate: 60, returnView: 'approach' });
    const text = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
      : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
    const again = walk(state.tree(), node => node.type === 'button' && /Fly Another Mission/.test(text(node.props.children)));
    expect(again).toBeTruthy(); again.props.onClick();
    expect(state.data().missionPhase).toBe(0); expect(state.data().returnRun).toBeNull(); expect(state.data().returnResult).toBeNull();
    expect(state.data().returnPaused).toBe(false); expect(state.data().returnPlaybackRate).toBe(3600); expect(state.data().returnView).toBe('system');
    expect(state.data().flightHistory[0].returnFlight).toEqual(raw.returnResult);
  });
});
