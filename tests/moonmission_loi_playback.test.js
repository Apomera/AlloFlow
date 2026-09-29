import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
});
afterEach(() => vi.restoreAllMocks());
const plan = () => P.cleanLoiPlayback({}).loiPlan;
const profile = () => P.loiProfile(plan());
const result = () => ({ version: 1, ...profile().summary });
const completed = () => ({ loiPlan: plan(), loiRun: { version: 1, time: result().duration, recorded: true }, loiResult: result() });

function mount(state) {
  const store = newStore({ moonMission: { missionXP: 0, missionLog: [], ...state } });
  return { tree: () => window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store)),
    state: () => store.toolData.moonMission };
}
function walk(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, found)); return found; }
  if (predicate(node)) found.push(node.props);
  walk(node.props && node.props.children, predicate, found);
  return found;
}
function button(app, selector) {
  const found = walk(app.tree(), node => node.type === 'button' && node.props[selector]);
  expect(found, selector).toHaveLength(1);
  return found[0];
}
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props && node.props.children);
}

describe('saved lunar orbit insertion playback', () => {
  it('retains the measured outcome while reviewing an earlier time without sharing mutable state', () => {
    const raw = { ...completed(), loiRun: { version: 1, time: 120, recorded: true }, loiPaused: true, loiPlaybackRate: 10 };
    const state = P.cleanLoiPlayback(raw);
    expect(state.loiPlan).toEqual(raw.loiPlan);
    expect(state.loiRun).toEqual(raw.loiRun);
    expect(state.loiResult).toEqual(raw.loiResult);
    expect(state.loiPaused).toBe(true); expect(state.loiPlaybackRate).toBe(10);
    state.loiPlan.burnDuration = 0; state.loiRun.time = 0; state.loiResult.duration = -1;
    expect(raw.loiPlan.burnDuration).toBeGreaterThan(0);
    expect(raw.loiRun.time).toBe(120); expect(raw.loiResult.duration).toBeGreaterThan(0);
  });

  it('rejects malformed or future outcomes and requires a versioned recorded run', () => {
    for (const bad of [null, {}, { ...result(), version: 2 }, { ...result(), duration: Infinity },
      { ...result(), perilune: -1 }, { ...result(), apolune: NaN }, { ...result(), propellantRemaining: -1 }]) {
      const state = P.cleanLoiPlayback({ ...completed(), loiResult: bad });
      expect(state.loiResult).toBeNull();
      expect(state.loiRun.recorded).toBe(false);
    }
    for (const badRun of [{ time: 120, recorded: true }, { version: 2, time: 120, recorded: true }, { version: 1, time: NaN, recorded: true }, null]) {
      const state = P.cleanLoiPlayback({ ...completed(), loiRun: badRun });
      expect(state.loiRun).toBeNull(); expect(state.loiResult).toBeNull();
    }
    expect(P.cleanLoiPlayback({ ...completed(), loiRun: { version: 1, time: 120, recorded: false } }).loiResult).toBeNull();
  });

  it('does not reuse the result from a different burn plan', () => {
    const flown = completed();
    const state = P.cleanLoiPlayback({ ...flown, loiPlan: { ...flown.loiPlan, burnDuration: 0 } });
    expect(state.loiPlan.burnDuration).toBe(0);
    expect(state.loiResult).toBeNull(); expect(state.loiRun.recorded).toBe(false);
  });

  it('bounds clocks and plan inputs and requires boolean playback and reward flags', () => {
    const long = P.cleanLoiPlayback({ ...completed(), loiRun: { version: 1, time: 1e9, recorded: true },
      loiPaused: 'true', loiAwarded: 'true', loiPlaybackRate: 999 });
    expect(long.loiRun.time).toBe(long.loiResult.duration);
    expect(long.loiPaused).toBe(false); expect(long.loiAwarded).toBe(false); expect(long.loiPlaybackRate).toBe(60);
    const negative = P.cleanLoiPlayback({ loiRun: { version: 1, time: -1e9 }, loiPlan: { ignitionLead: -100, burnDuration: 1e9 } });
    expect(negative.loiRun.time).toBe(0);
    expect(negative.loiPlan.ignitionLead).toBeGreaterThanOrEqual(0); expect(negative.loiPlan.ignitionLead).toBeLessThanOrEqual(600);
    expect(negative.loiPlan.burnDuration).toBeGreaterThanOrEqual(0); expect(negative.loiPlan.burnDuration).toBeLessThanOrEqual(600);
    const invalid = P.cleanLoiPlayback({ loiPlan: { ignitionLead: Infinity, burnDuration: NaN } });
    expect(Number.isFinite(invalid.loiPlan.ignitionLead)).toBe(true);
    expect(Number.isFinite(invalid.loiPlan.burnDuration)).toBe(true);
  });

  it('legacy ready flags and unrecorded capture cannot unlock descent', () => {
    for (const state of [
      { orbitStatus: 'ready' }, { orbitStatus: 3 }, { loiResult: result() },
      { ...completed(), loiRun: { version: 1, time: 120, recorded: false } },
    ]) {
      const app = mount({ missionPhase: 4, animPaused: true, ...state });
      const proceed = button(app, 'data-loi-proceed');
      expect(proceed.disabled).toBe(true); proceed.onClick();
      expect(app.state().missionPhase).toBe(4); expect(app.state().missionXP).toBe(0);
    }
  });

  it('recorded safe capture permits descent and rewards it once', () => {
    const app = mount({ missionPhase: 4, ...completed() });
    const proceed = button(app, 'data-loi-proceed');
    expect(proceed.disabled).toBe(false); proceed.onClick(); proceed.onClick();
    expect(app.state().missionPhase).toBe(5); expect(app.state().missionXP).toBe(15); expect(app.state().loiAwarded).toBe(true);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
    const returning = mount({ ...app.state(), missionPhase: 4 });
    button(returning, 'data-loi-proceed').onClick();
    expect(returning.state().missionPhase).toBe(5); expect(returning.state().missionXP).toBe(15);
  });

  it('a recorded flyby or impact remains reviewable but cannot unlock descent', () => {
    for (const burnDuration of [0, 600]) {
      const p = P.loiProfile({ burnDuration });
      expect(['flyby', 'impact']).toContain(p.summary.outcome);
      const flown = { loiPlan: p.controls, loiRun: { version: 1, time: p.summary.duration, recorded: true }, loiResult: { version: 1, ...p.summary } };
      const cleaned = P.cleanLoiPlayback(flown);
      expect(cleaned.loiRun.recorded).toBe(true); expect(cleaned.loiResult.outcome).toBe(p.summary.outcome);
      const app = mount({ missionPhase: 4, ...flown });
      const proceed = button(app, 'data-loi-proceed');
      expect(proceed.disabled).toBe(true); proceed.onClick();
      expect(app.state().missionPhase).toBe(4); expect(app.state().missionXP).toBe(0);
    }
  });

  it('unresolved mission events still block descent after a valid capture', () => {
    for (const pending of [{ activeEvent: { id: 'test', title: 'Test', scenario: 'x', options: [] } },
      { eventOutcome: { label: 'Test', outcome: 'pending review' } }]) {
      const app = mount({ missionPhase: 4, ...completed(), ...pending });
      const proceed = button(app, 'data-loi-proceed');
      expect(proceed.disabled).toBe(true); proceed.onClick();
      expect(app.state().missionPhase).toBe(4); expect(app.state().missionXP).toBe(0);
    }
  });

  it('hostile LOI records render safely in every phase', () => {
    const hostile = [{ loiPlan: 'burn', loiRun: 'ready', loiResult: true },
      { loiPlan: { ignitionLead: Infinity, burnDuration: NaN }, loiRun: { version: 1, time: Infinity }, loiResult: {} },
      { loiRun: { version: 99, time: -1, recorded: true }, loiResult: { version: 1, outcome: 'captured' }, loiPaused: {}, loiPlaybackRate: '240' }];
    for (let missionPhase = 0; missionPhase <= 10; missionPhase++) for (const bad of hostile) {
      const html = renderTool('moonMission', { moonMission: { missionPhase, animPaused: true, ...bad } });
      expect(html.length).toBeGreaterThan(200);
    }
  });

  it('reports measured capture and flyby outcomes without inventing a closed orbit', () => {
    const flown = completed(), summary = P.flightSummary(flown);
    expect(summary.loi).toEqual(flown.loiResult);
    const report = P.flightReport(summary);
    expect(report).toContain('Lunar orbit insertion: captured; SPS burn ' + flown.loiResult.actualBurn.toFixed(1) + ' s');
    expect(report).toContain('propellant used ' + flown.loiResult.propellantUsed.toFixed(1) + ' kg');
    expect(report).toContain('perilune ' + (flown.loiResult.perilune / 1000).toFixed(1) + ' km');
    expect(report).toContain('apolune ' + (flown.loiResult.apolune / 1000).toFixed(1) + ' km');
    const flyby = P.loiProfile({ burnDuration: 0 });
    const missed = P.flightSummary({ loiPlan: flyby.controls, loiRun: { version: 1, time: flyby.summary.duration, recorded: true }, loiResult: { version: 1, ...flyby.summary } });
    expect(P.flightReport(missed)).toContain('Lunar orbit insertion: flyby');
    expect(P.flightReport(missed)).toContain('open escape trajectory');
    for (const legacy of [{ orbitStatus: 'ready' }, { loiResult: result() }]) {
      const old = P.flightSummary(legacy);
      expect(old.loi).toBeNull(); expect(P.flightReport(old)).not.toContain('Lunar orbit insertion:');
    }
  });

  it('archives LOI measurements and resets the next flight planner, recorder and reward', () => {
    const flown = completed();
    const app = mount({ missionPhase: 10, ...flown, loiPaused: true, loiPlaybackRate: 240, loiAwarded: true });
    const [again] = walk(app.tree(), node => node.type === 'button' && /Fly Another Mission/.test(textOf(node.props.children)));
    expect(again).toBeDefined(); again.onClick();
    const state = app.state();
    expect(state.missionPhase).toBe(0);
    expect(state.loiPlan).toBeNull(); expect(state.loiRun).toBeNull(); expect(state.loiResult).toBeNull();
    expect(state.loiPaused).toBe(false); expect(state.loiPlaybackRate).toBe(60); expect(state.loiAwarded).toBe(false);
    expect(state.flightHistory).toHaveLength(1); expect(state.flightHistory[0].loi).toEqual(flown.loiResult);
  });
});
