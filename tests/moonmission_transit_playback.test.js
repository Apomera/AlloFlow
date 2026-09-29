import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;
beforeEach(() => {
  resetStemLab(); loadTool(FILE, 'moonMission'); P = window.MoonMissionPure;
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
});
afterEach(() => vi.restoreAllMocks());
const profile = (plan) => P.transitProfile(plan);
const completed = (plan) => {
  const p = profile(plan);
  return { transitPlan: P.normalizeTransitPlan(plan), transitRun: { version: 1, time: p.summary.duration, recorded: true },
    transitResult: { version: 1, ...p.summary } };
};
function mount(state) {
  const store = newStore({ moonMission: { missionXP: 0, missionLog: [], ...state } });
  return { tree: () => window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store)), state: () => store.toolData.moonMission };
}
function walk(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, found)); return found; }
  if (predicate(node)) found.push(node.props);
  walk(node.props && node.props.children, predicate, found); return found;
}
function button(app, selector) {
  const found = walk(app.tree(), node => node.type === 'button' && node.props[selector]);
  expect(found, selector).toHaveLength(1); return found[0];
}
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props && node.props.children);
}

describe('saved outbound navigation playback', () => {
  it('retains a measured arrival during earlier review without sharing mutable state', () => {
    const raw = { ...completed(), transitRun: { version: 1, time: 120, recorded: true }, transitPaused: true, transitPlaybackRate: 60, transitView: 'moon' };
    const state = P.cleanTransitPlayback(raw);
    expect(state.transitPlan).toEqual(raw.transitPlan); expect(state.transitRun).toEqual(raw.transitRun);
    expect(state.transitResult).toEqual(raw.transitResult);
    expect(state.transitPaused).toBe(true); expect(state.transitPlaybackRate).toBe(60); expect(state.transitView).toBe('moon');
    state.transitPlan.speedError = 7; state.transitRun.time = 0; state.transitResult.duration = -1;
    expect(raw.transitPlan.speedError).toBe(0); expect(raw.transitRun.time).toBe(120); expect(raw.transitResult.duration).toBeGreaterThan(0);
  });

  it('validates every recomputed summary field and rejects future or unrecorded runs', () => {
    const raw = completed();
    for (const [key, value] of Object.entries(raw.transitResult)) {
      const corrupted = { ...raw.transitResult, [key]: typeof value === 'number' ? value + 1 : '__invalid__' };
      const state = P.cleanTransitPlayback({ ...raw, transitResult: corrupted });
      expect(state.transitResult, key).toBeNull(); expect(state.transitRun.recorded, key).toBe(false);
    }
    for (const bad of [null, {}, { ...raw.transitResult, duration: Infinity }, { ...raw.transitResult, propellantUsed: NaN }]) {
      expect(P.cleanTransitPlayback({ ...raw, transitResult: bad }).transitResult).toBeNull();
    }
    for (const run of [null, {}, { version: 2, time: 120, recorded: true }, { version: 1, time: NaN, recorded: true }]) {
      const state = P.cleanTransitPlayback({ ...raw, transitRun: run });
      expect(state.transitRun).toBeNull(); expect(state.transitResult).toBeNull();
    }
    expect(P.cleanTransitPlayback({ ...raw, transitRun: { version: 1, time: 120, recorded: false } }).transitResult).toBeNull();
  });

  it('invalidates measured arrival when the departure or correction plan changes', () => {
    const raw = completed();
    for (const key of ['speedError', 'angleError', 'radialDeltaV', 'tangentialDeltaV']) {
      const state = P.cleanTransitPlayback({ ...raw, transitPlan: { ...raw.transitPlan, [key]: 1 } });
      expect(state.transitResult, key).toBeNull(); expect(state.transitRun.recorded, key).toBe(false);
    }
  });

  it('bounds clocks and controls, accepts supported rates and requires boolean flags', () => {
    const state = P.cleanTransitPlayback({ ...completed(), transitRun: { version: 1, time: 1e9, recorded: true },
      transitPaused: 'true', transitAwarded: 'true', transitPlaybackRate: 999, transitView: 'invalid' });
    expect(state.transitRun.time).toBe(state.transitResult.duration);
    expect(state.transitPaused).toBe(false); expect(state.transitAwarded).toBe(false);
    expect(state.transitPlaybackRate).toBe(3600); expect(state.transitView).toBe('system');
    for (const rate of [1, 60, 600, 3600]) expect(P.cleanTransitPlayback({ transitPlaybackRate: rate }).transitPlaybackRate).toBe(rate);
    const rawPlan = { speedError: 1e9, angleError: -1e9, radialDeltaV: Infinity, tangentialDeltaV: NaN };
    const clean = P.cleanTransitPlayback({ transitPlan: rawPlan, transitRun: { version: 1, time: -1e9 } });
    expect(clean.transitRun.time).toBe(0); expect(clean.transitPlan).toEqual(P.normalizeTransitPlan(rawPlan));
    Object.values(clean.transitPlan).forEach(value => expect(Number.isFinite(value)).toBe(true));
  });

  it('legacy correction choices, old minima and unrecorded results cannot unlock arrival', () => {
    for (const state of [{ mccChoice: 'corrected' }, { mccChoice: 'skipped' }, { mccChoice: 'unexpected', tliAccuracy: { onTime: true } },
      { coastSlowest: { v: 1, toMoonKm: 38000 } }, { transitResult: completed().transitResult },
      { ...completed(), transitRun: { version: 1, time: 120, recorded: false } }]) {
      const app = mount({ missionPhase: 3, animPaused: true, ...state });
      const proceed = button(app, 'data-transit-proceed'); expect(proceed.disabled).toBe(true); proceed.onClick();
      expect(app.state().missionPhase).toBe(3); expect(app.state().missionXP).toBe(0);
    }
  });

  it('recorded encounter permits arrival and rewards the mission once', () => {
    const app = mount({ missionPhase: 3, ...completed() });
    expect(app.state().transitResult.outcome).toBe('encounter');
    const proceed = button(app, 'data-transit-proceed'); expect(proceed.disabled).toBe(false);
    proceed.onClick(); proceed.onClick();
    expect(app.state().missionPhase).toBe(4); expect(app.state().missionXP).toBe(15); expect(app.state().transitAwarded).toBe(true);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
    const returning = mount({ ...app.state(), missionPhase: 3 }); button(returning, 'data-transit-proceed').onClick();
    expect(returning.state().missionPhase).toBe(4); expect(returning.state().missionXP).toBe(15);
  });

  it('failed navigation is reviewable but cannot claim arrival', () => {
    for (const plan of [{ speedError: 1 }, { speedError: 20 }]) {
      const raw = completed(plan); expect(raw.transitResult.outcome).not.toBe('encounter');
      const clean = P.cleanTransitPlayback(raw); expect(clean.transitRun.recorded).toBe(true); expect(clean.transitResult).toEqual(raw.transitResult);
      const app = mount({ missionPhase: 3, ...raw }), proceed = button(app, 'data-transit-proceed');
      expect(proceed.disabled).toBe(true); proceed.onClick();
      expect(app.state().missionPhase).toBe(3); expect(app.state().missionXP).toBe(0);
    }
  });

  it('unresolved mission events block arrival even after a measured encounter', () => {
    for (const pending of [{ activeEvent: { id: 'test', title: 'Test', scenario: 'x', options: [] } }, { eventOutcome: { label: 'Test', outcome: 'review' } }]) {
      const app = mount({ missionPhase: 3, ...completed(), ...pending }), proceed = button(app, 'data-transit-proceed');
      expect(proceed.disabled).toBe(true); proceed.onClick();
      expect(app.state().missionPhase).toBe(3); expect(app.state().missionXP).toBe(0);
    }
  });

  it('hostile saved navigation renders safely in every phase', () => {
    const hostile = [{ transitPlan: 'burn', transitRun: 'ready', transitResult: true },
      { transitPlan: { speedError: Infinity, angleError: NaN }, transitRun: { version: 1, time: Infinity } },
      { transitRun: { version: 99, time: -1, recorded: true }, transitResult: { version: 1, outcome: 'encounter' }, transitPaused: {}, transitPlaybackRate: '3600' }];
    for (let missionPhase = 0; missionPhase <= 10; missionPhase++) for (const bad of hostile) {
      expect(renderTool('moonMission', { moonMission: { missionPhase, animPaused: true, ...bad } }).length).toBeGreaterThan(200);
    }
  });

  it('reports measured navigation with its separate insertion and descent presets', () => {
    const raw = completed(), sum = P.flightSummary(raw), report = P.flightReport(sum);
    expect(sum.transit).toEqual(raw.transitResult);
    expect(report).toContain('Outbound navigation: encounter');
    expect(report).toContain('propellant used ' + raw.transitResult.propellantUsed.toFixed(2) + ' kg');
    expect(report).toContain('Moon-relative speed ' + (raw.transitResult.closestSpeed / 1000).toFixed(3) + ' km/s');
    expect(report).toContain('separate arrival preset');
    expect(P.causeChain(sum).map(step => step.result).join(' ')).toContain('descent uses its own approach preset and fuel tank');
    for (const mccChoice of ['corrected', 'skipped']) {
      const legacy = P.flightSummary({ mccChoice }); expect(legacy.transit).toBeNull();
      const text = P.flightReport(legacy); expect(text).toContain('no measured trajectory');
      expect(text).not.toMatch(/Outbound navigation:|25 s|7 m\/s|full landing fuel/);
    }
    expect(P.flightSummary({ transitResult: raw.transitResult }).transit).toBeNull();
  });

  it('archives navigation measurements and resets the next flight clock, planner and reward', () => {
    const raw = completed(), app = mount({ missionPhase: 10, ...raw, transitPaused: true, transitPlaybackRate: 60, transitView: 'moon', transitAwarded: true });
    const [again] = walk(app.tree(), node => node.type === 'button' && /Fly Another Mission/.test(textOf(node.props.children)));
    expect(again).toBeDefined(); again.onClick(); const state = app.state();
    expect(state.missionPhase).toBe(0); expect(state.transitPlan).toBeNull(); expect(state.transitRun).toBeNull(); expect(state.transitResult).toBeNull();
    expect(state.transitPaused).toBe(false); expect(state.transitPlaybackRate).toBe(3600); expect(state.transitView).toBe('system'); expect(state.transitAwarded).toBe(false);
    expect(state.flightHistory).toHaveLength(1); expect(state.flightHistory[0].transit).toEqual(raw.transitResult);
  });
});
