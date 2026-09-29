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
const result = () => ({ version: 1, ...P.ascentProfile().summary });
function docked() {
  let state = P.dockingState();
  for (let i = 0; i < 200 && state.status === 'flying'; i++) state = P.dockingStep(state, 10, 'guided');
  expect(state.status).toBe('docked');
  return state;
}

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
function completed() {
  return { ascentRun: { version: 1, time: result().duration, recorded: true }, ascentResult: result(),
    dockingRun: docked(), dockingGuided: true, dockingPaused: true };
}
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props && node.props.children);
}

describe('saved lunar ascent playback', () => {
  it('preserves a measured insertion while reviewing an earlier time without sharing mutable data', () => {
    const raw = { ascentResult: result(), ascentRun: { version: 1, time: 120, recorded: true }, ascentPaused: true, ascentPlaybackRate: 10 };
    const cleaned = P.cleanAscentPlayback(raw);
    expect(cleaned.ascentRun).toEqual(raw.ascentRun);
    expect(cleaned.ascentResult).toEqual(raw.ascentResult);
    expect(cleaned.ascentPaused).toBe(true);
    expect(cleaned.ascentPlaybackRate).toBe(10);
    cleaned.ascentRun.time = 0; cleaned.ascentResult.propellantRemaining = 0;
    expect(raw.ascentRun.time).toBe(120);
    expect(raw.ascentResult.propellantRemaining).toBeGreaterThan(0);
  });

  it('cannot turn malformed or unversioned saves into a measured insertion', () => {
    for (const bad of [null, { ...result(), version: 2 }, { ...result(), cutoffSpeed: NaN },
      { ...result(), perilune: -100 }, { ...result(), eccentricity: 1 }, { ...result(), peakG: Infinity },
      { ...result(), propellantRemaining: -1 }]) {
      const state = P.cleanAscentPlayback({ ascentResult: bad, ascentRun: { version: 1, time: 400, recorded: true } });
      expect(state.ascentResult).toBeNull();
      expect(state.ascentRun.recorded).toBe(false);
    }
    expect(P.cleanAscentPlayback({ ascentRun: { time: 400, recorded: true } }).ascentRun).toBeNull();
    expect(P.cleanAscentPlayback({ ascentRun: { version: 1, time: Infinity } }).ascentRun).toBeNull();
  });

  it('bounds replay time and requires genuine boolean pause and reward flags', () => {
    const state = P.cleanAscentPlayback({ ascentResult: result(), ascentRun: { version: 1, time: 1e9, recorded: true },
      ascentPaused: 'true', ascentAwarded: 'true', ascentPlaybackRate: 999 });
    expect(state.ascentRun.time).toBe(state.ascentResult.duration);
    expect(state.ascentPaused).toBe(false);
    expect(state.ascentAwarded).toBe(false);
    expect(state.ascentPlaybackRate).not.toBe(999);
    const negative = P.cleanAscentPlayback({ ascentRun: { version: 1, time: -1e9 } });
    expect(negative.ascentRun.time).toBeGreaterThanOrEqual(-5);
    expect(negative.ascentRun.time).toBeLessThanOrEqual(0);
  });

  it('does not unlock TEI from a legacy docked flag, invalid record or insertion alone', () => {
    for (const state of [
      { ascentStatus: 'docked' },
      { ascentStatus: 'docked', ascentResult: {}, ascentRun: { version: 1, recorded: true, time: 400 } },
      { ascentResult: result(), ascentRun: { version: 1, recorded: true, time: result().duration } },
    ]) {
      const app = mount({ missionPhase: 7, animPaused: true, ...state });
      const proceed = button(app, 'data-ascent-proceed');
      expect(proceed.disabled).toBe(true);
      proceed.onClick();
      expect(app.state().missionPhase).toBe(7);
      expect(app.state().missionXP).toBe(0);
    }
  });

  it('malformed ascent and docking state still renders every mission phase', () => {
    const badStates = [
      { ascentResult: {}, ascentRun: 'orbit' },
      { ascentResult: { version: 1, outcome: 'orbit', duration: Infinity }, ascentRun: { version: 1, time: NaN, recorded: true } },
      { dockingRun: 'docked', dockingResult: true, dockingGuided: 'false', dockingPaused: {} },
      { dockingRun: { version: 1, range: Infinity, closingSpeed: NaN }, dockingResult: { status: 'docked' } },
    ];
    for (let missionPhase = 0; missionPhase <= 10; missionPhase++) for (const bad of badStates) {
      const html = renderTool('moonMission', { moonMission: { missionPhase, animPaused: true, ...bad } });
      expect(html.length).toBeGreaterThan(200);
    }
  });
});

describe('saved final approach playback', () => {
  it('derives the compact docking result from validated contact and ignores a claimed result by itself', () => {
    const terminal = docked();
    const raw = { dockingRun: terminal, dockingResult: { version: 1, duration: -999, closingSpeed: 99 }, dockingGuided: true, dockingPaused: true };
    const state = P.cleanDockingPlayback(raw);
    expect(state.dockingResult).toEqual({ version: 1, duration: terminal.time, offset: terminal.x,
      closingSpeed: terminal.vy, lateralSpeed: terminal.vx, propellantRemaining: terminal.propellant });
    expect(state.dockingGuided).toBe(true); expect(state.dockingPaused).toBe(true);
    state.dockingRun.propellant = 0; state.dockingResult.offset = 99;
    expect(terminal.propellant).toBeGreaterThan(0);
    expect(terminal.x).toBeLessThan(1);
    expect(P.cleanDockingPlayback({ dockingResult: raw.dockingResult }).dockingResult).toBeNull();
  });

  it('rejects malformed, future and physically unsafe completed docking saves', () => {
    const terminal = docked();
    for (const change of [{ version: 2 }, { time: -1 }, { time: Infinity }, { x: NaN }, { y: 1 },
      { propellant: -1 }, { propellant: 41 }, { status: 'complete' }, { vy: 0 }, { vy: 0.3 }, { vx: 0.11 }, { x: 0.7 }, { time: 0 }]) {
      const state = P.cleanDockingPlayback({ dockingRun: { ...terminal, ...change }, dockingResult: { status: 'docked' } });
      expect(state.dockingRun, JSON.stringify(change)).toBeNull();
      expect(state.dockingResult, JSON.stringify(change)).toBeNull();
    }
    const flying = P.cleanDockingPlayback({ dockingRun: { ...P.dockingState(), y: 0 }, dockingGuided: 'true', dockingPaused: 'true' });
    expect(flying.dockingRun).toBeNull(); expect(flying.dockingGuided).toBe(false); expect(flying.dockingPaused).toBe(false);
  });
});

describe('ascent completion, archive and report', () => {
  it('requires insertion and valid docking, then pays the TEI reward only once', () => {
    const flight = completed();
    const missingAscent = mount({ missionPhase: 7, dockingRun: flight.dockingRun, animPaused: true });
    expect(button(missingAscent, 'data-ascent-proceed').disabled).toBe(true);
    const app = mount({ missionPhase: 7, ...flight });
    const proceed = button(app, 'data-ascent-proceed');
    expect(proceed.disabled).toBe(false);
    proceed.onClick(); proceed.onClick();
    expect(app.state().missionPhase).toBe(8);
    expect(app.state().missionXP).toBe(15);
    expect(app.state().ascentAwarded).toBe(true);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
    const returning = mount({ ...app.state(), missionPhase: 7 });
    button(returning, 'data-ascent-proceed').onClick();
    expect(returning.state().missionPhase).toBe(8);
    expect(returning.state().missionXP).toBe(15);
  });

  it('an unresolved mission event blocks TEI even after valid docking', () => {
    for (const pending of [{ activeEvent: { id: 'test', title: 'Test', scenario: 'x', options: [] } },
      { eventOutcome: { label: 'Test', outcome: 'pending review' } }]) {
      const app = mount({ missionPhase: 7, ...completed(), ...pending });
      const proceed = button(app, 'data-ascent-proceed');
      expect(proceed.disabled).toBe(true); proceed.onClick();
      expect(app.state().missionPhase).toBe(7); expect(app.state().missionXP).toBe(0);
    }
  });

  it('records measured insertion and separate docking results in a readable report', () => {
    const flight = completed(), sum = P.flightSummary(flight);
    expect(sum.ascent).toEqual(flight.ascentResult);
    expect(sum.docking).toEqual(P.cleanDockingPlayback(flight).dockingResult);
    const report = P.flightReport(sum);
    expect(report).toContain('Lunar ascent model: ' + flight.ascentResult.duration.toFixed(1) + ' s burn');
    expect(report).toContain((flight.ascentResult.perilune / 1000).toFixed(1) + ' by ' + (flight.ascentResult.apolune / 1000).toFixed(1) + ' km insertion orbit');
    expect(report).toContain('Final docking exercise: contact at ' + flight.dockingRun.vy.toFixed(3) + ' m/s');
    expect(report).toContain('Intervening rendezvous burns were not simulated.');
    for (const unmeasured of [{ ascentStatus: 'docked' }, { ascentResult: result() }, { dockingRun: flight.dockingRun }]) {
      const absent = P.flightSummary(unmeasured);
      expect(absent.ascent).toBeNull(); expect(absent.docking).toBeNull();
      expect(P.flightReport(absent)).not.toContain('Lunar ascent model:');
    }
  });

  it('archives the completed measurements and clears all replay, docking and reward state for another mission', () => {
    const flight = completed();
    const app = mount({ missionPhase: 10, ...flight, ascentPaused: true, ascentPlaybackRate: 60, ascentAwarded: true });
    const [again] = walk(app.tree(), node => node.type === 'button' && /Fly Another Mission/.test(textOf(node.props.children)));
    expect(again).toBeDefined(); again.onClick();
    const state = app.state();
    expect(state.missionPhase).toBe(0);
    expect(state.ascentRun).toBeNull(); expect(state.ascentResult).toBeNull();
    expect(state.ascentPaused).toBe(false); expect(state.ascentPlaybackRate).toBe(30); expect(state.ascentAwarded).toBe(false);
    expect(state.dockingRun).toBeNull(); expect(state.dockingResult).toBeNull();
    expect(state.dockingPaused).toBe(true); expect(state.dockingGuided).toBe(false);
    expect(state.flightHistory).toHaveLength(1);
    expect(state.flightHistory[0].ascent).toEqual(flight.ascentResult);
    expect(state.flightHistory[0].docking.closingSpeed).toBe(flight.dockingRun.vy);
  });
});
