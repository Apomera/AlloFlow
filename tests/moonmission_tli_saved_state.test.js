import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, newStore, makeCtx, renderTool } from './helpers/stem_widgets_smoke_harness.js';
let P;
beforeEach(() => { resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; vi.spyOn(Math, 'random').mockReturnValue(0.999); });
afterEach(() => vi.restoreAllMocks());
function completed(duration = 342) {
  const p = P.tliProfile({ duration }), orbitTime = P.orbitSnapshot(0).nextWindowTime;
  return { tliStarted: true, tliPlan: p.plan, tliRun: { version: 1, duration, orbitTime, time: p.summary.duration, recorded: true }, tliResult: { ...p.summary }, tliAccuracy: { onTime: true, offByDeg: 0 } };
}
function walk(n, predicate) {
  if (!n || typeof n !== 'object') return null;
  if (Array.isArray(n)) { for (const child of n) { const result = walk(child, predicate); if (result) return result; } return null; }
  return predicate(n) ? n : walk(n.props?.children, predicate);
}
const text = n => n == null || typeof n === 'boolean' ? '' : typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : text(n.props?.children);
function mount(extra = {}) {
  const store = newStore({ moonMission: { missionPhase: 2, missionXP: 0, missionLog: [], soundOff: true, ...extra } });
  const tree = () => window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
  return { tree, state: () => store.toolData.moonMission, proceed: () => walk(tree(), n => n.type === 'button' && n.props['data-tli-proceed']).props };
}
describe('finite injection saved evidence and progression', () => {
  it('restores valid review without sharing mutable saved objects', () => {
    const raw = completed(), saved = P.cleanTliPlayback(raw); expect(saved.tliResult).toEqual(raw.tliResult);
    saved.tliRun.time = 0; saved.tliResult.mass = 0; expect(raw.tliRun.time).toBe(342); expect(raw.tliResult.mass).toBeGreaterThan(60000);
  });
  it('recomputes every completion field and restarts corrupt terminal claims', () => {
    for (const duration of [300, 342, 350]) {
      const raw = completed(duration);
      for (const key in raw.tliResult) {
        const saved = P.cleanTliPlayback({ ...raw, tliResult: { ...raw.tliResult, [key]: typeof raw.tliResult[key] === 'number' ? raw.tliResult[key] + 1 : 'wrong' } });
        expect(saved.tliResult, key).toBeNull(); expect(saved.tliRun.time, key).toBe(0); expect(saved.tliRun.recorded, key).toBe(false);
      }
    }
  });
  it('rejects bad run clocks, versions, matching-plan claims and orbit checkpoints', () => {
    const raw = completed();
    for (const run of [null, {}, { ...raw.tliRun, version: 2 }, { ...raw.tliRun, time: NaN }, { ...raw.tliRun, time: Infinity }, { ...raw.tliRun, recorded: 'true' }, { ...raw.tliRun, duration: 300 }, { ...raw.tliRun, orbitTime: Infinity }, { ...raw.tliRun, orbitTime: -1 }]) {
      const saved = P.cleanTliPlayback({ ...raw, tliRun: run }); expect(saved.tliRun).toBeNull(); expect(saved.tliResult).toBeNull();
    }
  });
  it('derives timing from the recorded ignition checkpoint rather than a claimed grade', () => {
    const raw = completed(), late = raw.tliRun.orbitTime + P.orbitSnapshot(0).period / 4;
    const saved = P.cleanTliPlayback({ ...raw, tliRun: { ...raw.tliRun, orbitTime: late } });
    expect(saved.tliAccuracy).toMatchObject({ onTime: false, side: 'late', offByDeg: 90 });
    expect(P.flightSummary({ ...raw, tliRun: { ...raw.tliRun, orbitTime: late } }).tli.onTime).toBe(false);
  });
  it('retains a valid result while rewinding and bounds inspected clocks', () => {
    const raw = completed(), saved = P.cleanTliPlayback({ ...raw, tliRun: { ...raw.tliRun, time: 12 } });
    expect(saved.tliRun.recorded).toBe(true); expect(saved.tliRun.time).toBe(12); expect(saved.tliResult).toEqual(raw.tliResult);
    expect(P.cleanTliPlayback({ ...raw, tliRun: { ...raw.tliRun, time: -1 } }).tliRun.time).toBe(0);
  });
  it('ignition records timing without advancing the phase or awarding points', () => {
    const orbitTime = P.orbitSnapshot(0).nextWindowTime, app = mount({ orbitRun: { version: 1, time: orbitTime } });
    const ignite = walk(app.tree(), n => n.type === 'button' && /^Execute trans-lunar/.test(n.props.title || '')).props;
    ignite.onClick(); ignite.onClick();
    expect(app.state().missionPhase).toBe(2); expect(app.state().missionXP).toBe(0);
    expect(app.state().tliRun).toMatchObject({ time: 0, recorded: false, orbitTime });
    expect(app.state().missionLog).toHaveLength(1); expect(app.proceed().disabled).toBe(true);
  });
  it('blocks unfinished, forged, short-burn and pending-event transitions in the handler', () => {
    const ready = completed();
    for (const extra of [{ ...ready, tliRun: { ...ready.tliRun, recorded: false } }, { ...ready, tliResult: { ...ready.tliResult, mass: 0 } }, completed(300), { ...ready, activeEvent: { id: 'x', options: [] } }, { ...ready, eventOutcome: { label: 'x', outcome: 'y' } }]) {
      const app = mount(extra), button = app.proceed(); expect(button.disabled).toBe(true); button.onClick();
      expect(app.state().missionPhase).toBe(2); expect(app.state().missionXP).toBe(0);
    }
  });
  it('proceeds once after measured review and does not repay an already awarded save', () => {
    for (const [duration, awarded, points] of [[342, false, 25], [350, true, 0]]) {
      resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure;
      const app = mount({ ...completed(duration), tliAwarded: awarded }), button = app.proceed();
      expect(button.disabled).toBe(false); button.onClick(); button.onClick();
      expect(app.state().missionPhase).toBe(3); expect(app.state().missionXP).toBe(points);
      expect(app.state().missionLog).toHaveLength(1); expect(app.state().showQuiz).toBe(true);
    }
  });
  it('records computed evidence in reports and archives, then clears replay controls', () => {
    const raw = completed(), sum = P.flightSummary(raw); expect(sum.injection).toEqual(raw.tliResult);
    expect(P.flightReport(sum)).toContain('Finite S-IVB injection: 342.0 s');
    expect(P.causeChain(sum).some(s => /75557 kg/.test(s.result))).toBe(true);
    expect(P.flightSummary({ tliResult: raw.tliResult }).injection).toBeNull();
    const app = mount({ ...raw, missionPhase: 10 }), button = walk(app.tree(), n => n.type === 'button' && /Fly Another Mission/.test(text(n.props.children))).props;
    button.onClick(); expect(app.state().flightHistory.at(-1).injection).toEqual(raw.tliResult);
    for (const key of ['tliPlan', 'tliRun', 'tliResult']) expect(app.state()[key]).toBeNull();
    expect(app.state().tliStarted).toBe(false); expect(app.state().tliAwarded).toBe(false);
    expect(app.state().tliPaused).toBe(true); expect(app.state().tliPlaybackRate).toBe(10);
  });
  it('keeps legacy later-phase saves reviewable without fabricating injection evidence', () => {
    const html = renderTool('moonMission', { moonMission: { missionPhase: 10, tliAccuracy: { onTime: false, offByDeg: 23, side: 'late' } } });
    expect(html).toContain('23° LATE'); expect(html).not.toContain('FINITE S-IVB INJECTION');
    expect(P.cleanTliPlayback({ tliStarted: 'true', tliPlaybackRate: 999, tliView: 'bad' })).toMatchObject({ tliStarted: false, tliPlaybackRate: 10, tliView: 'burn', tliPaused: true });
  });
});
