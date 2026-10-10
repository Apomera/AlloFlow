import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WORLDS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => WORLDS.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;

// Exercise the real component's effect callbacks and queued functional setters.
// No canvas or unrelated effect mounts; requests can be replayed before commit.
function rewards(seed = {}, translator = translate) {
  const store = newStore({ otherTool: { note: 'Keep other tools' }, solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', planetsVisited: ['Earth'], viewTab: 'overview', paused: true,
    completedChallenges: ['first_planet'], researchPoints: 10, totalRP: 10,
    missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem, refs = [], queue = [], toast = vi.fn(), award = vi.fn();
  let cursor, effects, buttons;
  const callbackReact = { ...React,
    useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}]; },
    useRef(initial) { const index = cursor++; if (!refs[index]) refs[index] = { current: initial }; return refs[index]; },
    useEffect(effect) { effects.set(effect.name, effect); },
    createElement(type, props, ...children) {
      if (type === 'button' && props?.onClick) buttons.push(props);
      // Element construction is enough: the production callbacks above are the
      // subject, while browser checks cover the actual mounted controls.
      return React.createElement(type, props, ...children);
    },
  };
  function render() {
    cursor = 0; effects = new Map(); buttons = [];
    const ctx = makeCtx({ t: translator, React: callbackReact, addToast: toast, awardXP: award }, store);
    ctx.setToolData = update => queue.push(update);
    config.render(ctx);
  }
  function effect(name) { expect(effects.has(name)).toBe(true); return effects.get(name); }
  function flush() {
    while (queue.length) {
      const update = queue.shift();
      store.toolData = typeof update === 'function' ? update(store.toolData) : update;
    }
  }
  function check() { effect('scheduleSolarChallengeCheck')(); vi.advanceTimersByTime(500); }
  function commit() { render(); effect('deliverSolarChallengeRewards')(); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get all() { return store.toolData; },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    get buttons() { return buttons; }, queue, refs, toast, award, render, effect, flush, check, commit,
  };
}

describe('Solar System challenge reward transactions', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T20:00:00Z'));
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('merges delayed rewards into the latest balances, achievements, and unrelated state', () => {
    const env = rewards({ showSky: true }); env.check(); expect(env.queue).toHaveLength(1);
    const legacy = { imported: true }, draft = { observation: 'Concurrent note' };
    env.patch({ completedChallenges: ['first_planet', 'compare', 'compare', 'legacy-award', null, legacy], researchPoints: 175, totalRP: 230, draft });
    const prior = env.all; env.flush();
    expect(env.state.completedChallenges).toEqual(['first_planet', 'compare', 'compare', 'legacy-award', null, legacy, 'night_sky']);
    expect(env.state.completedChallenges[5]).toBe(legacy); expect(env.state.researchPoints).toBe(190); expect(env.state.totalRP).toBe(245);
    expect(env.state.draft).toBe(draft); expect(env.all.otherTool).toBe(prior.otherTool);
    expect(prior.solarSystem.completedChallenges).toHaveLength(6); expect(prior.solarSystem.researchPoints).toBe(175);
    expect(env.toast).not.toHaveBeenCalled(); env.commit(); expect(env.toast).toHaveBeenCalledOnce();
    expect(env.toast.mock.calls[0][0]).toContain('Stargazer (+15 RP)'); expect(env.award).not.toHaveBeenCalled();
  });

  it('rechecks eligibility against the latest state when applying a queued reward', () => {
    const env = rewards({ showSky: true }); env.check(); env.patch({ showSky: false, gravCalcUsed: true }); env.flush();
    expect(env.state.completedChallenges).toEqual(['first_planet', 'gravity_calc']); expect(env.state.researchPoints).toBe(25);
    env.commit(); expect(env.toast.mock.calls.map(call => call[0])).toEqual([expect.stringContaining('Gravity Investigator')]);
  });

  it('finds newly eligible latest state even when the timer render had no eligible challenge', () => {
    const env = rewards(); env.check(); env.patch({ gravCalcUsed: true }); env.flush();
    expect(env.state.completedChallenges).toEqual(['first_planet', 'gravity_calc']); expect(env.state.researchPoints).toBe(25);
    env.commit(); expect(env.toast).toHaveBeenCalledOnce();
  });

  it('does not lose later completion records or reward already completed IDs twice', () => {
    const env = rewards({ showSky: true, gravCalcUsed: true }); env.check();
    env.patch({ completedChallenges: ['first_planet', 'night_sky'], researchPoints: 45, totalRP: 80 }); env.flush();
    expect(env.state.completedChallenges).toEqual(['first_planet', 'night_sky', 'gravity_calc']); expect(env.state.researchPoints).toBe(60); expect(env.state.totalRP).toBe(95);
    env.commit(); expect(env.toast).toHaveBeenCalledOnce(); expect(env.toast.mock.calls[0][0]).toContain('Gravity Investigator');
  });

  it('keeps updater replay pure and consumes duplicate timer requests and effect replays once', () => {
    const timer = vi.spyOn(globalThis, 'setTimeout'), env = rewards({ showSky: true });
    env.effect('scheduleSolarChallengeCheck')();
    const callback = timer.mock.calls.find(call => call[1] === 500)[0]; callback(); callback(); expect(env.queue).toHaveLength(2);
    const before = env.all, first = env.queue[0], a = first(before), b = first(before);
    expect(a).toEqual(b); expect(env.toast).not.toHaveBeenCalled(); expect(env.state).toBe(before.solarSystem);
    env.flush(); const committed = env.all; expect(first(committed)).toBe(committed);
    expect(env.state.researchPoints).toBe(25); expect(env.state.completedChallenges).toEqual(['first_planet', 'night_sky']);
    env.commit(); const delivery = env.effect('deliverSolarChallengeRewards'); delivery(); delivery(); expect(env.toast).toHaveBeenCalledOnce();
  });

  it('does not let an older passive effect consume a newer pending reward request', () => {
    const env = rewards({ showSky: true }), oldEffect = env.effect('deliverSolarChallengeRewards'); env.check(); env.flush();
    oldEffect(); expect(env.toast).not.toHaveBeenCalled(); env.commit(); expect(env.toast).toHaveBeenCalledOnce();
  });

  it('retains feedback when an unrelated commit happens before a queued award is applied', () => {
    const env = rewards({ showSky: true }); env.check(); env.patch({ concurrent: 'New draft' }); env.commit();
    expect(env.toast).not.toHaveBeenCalled(); env.flush(); env.commit();
    expect(env.state.concurrent).toBe('New draft'); expect(env.toast).toHaveBeenCalledOnce();
  });

  it('does not announce rejected or abandoned rewards', () => {
    const env = rewards({ showSky: true }); env.check(); env.patch({ showSky: false });
    const previous = env.all; env.flush(); expect(env.all).toBe(previous); env.commit(); expect(env.toast).not.toHaveBeenCalled();
    env.patch({ showSky: true }); env.render(); env.check(); env.queue.length = 0; env.commit(); expect(env.toast).not.toHaveBeenCalled();
  });

  it('does not award or announce achievements restored from a saved project', () => {
    const raw = ['first_planet', 'night_sky', 'night_sky', 'legacy'];
    const env = rewards({ showSky: true, completedChallenges: raw, solarChallengeRewards: { night_sky: 'old-session-token' } });
    env.check(); env.flush(); expect(env.queue).toHaveLength(0); env.commit(); expect(env.toast).not.toHaveBeenCalled();
    expect(env.state.completedChallenges).toBe(raw); expect(env.state.researchPoints).toBe(10);
  });

  it('normalizes malformed balances and ledgers only when a real reward is earned', () => {
    for (const value of [undefined, null, '80', {}, NaN, Infinity, -2, 1.5]) {
      const env = rewards({ showSky: true, researchPoints: value, totalRP: value, completedChallenges: 'first_planet', solarChallengeRewards: ['bad'] });
      env.check(); env.flush();
      expect(env.state.completedChallenges).toEqual(['first_planet', 'night_sky']); expect(env.state.researchPoints).toBe(25); expect(env.state.totalRP).toBe(25);
      expect(Object.keys(env.state.solarChallengeRewards)).toEqual(['first_planet', 'night_sky']);
    }
  });

  it('caps large valid balances without producing unsafe integers', () => {
    const env = rewards({ showSky: true, researchPoints: Number.MAX_SAFE_INTEGER - 5, totalRP: Number.MAX_SAFE_INTEGER }); env.check(); env.flush();
    expect(env.state.researchPoints).toBe(Number.MAX_SAFE_INTEGER); expect(env.state.totalRP).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('does not write malformed saved values when no new challenge is eligible', () => {
    const env = rewards({ selectedPlanet: null, completedChallenges: { old: true }, researchPoints: 'bad', totalRP: null });
    const prior = env.all; env.check(); env.flush(); expect(env.all).toBe(prior); expect(env.queue).toHaveLength(0); expect(env.toast).not.toHaveBeenCalled();
  });

  it('counts unique recognized worlds for the three-world and grand-tour rewards', () => {
    const visits = ['Earth', 'Earth', 'Earth', 'unknown', {}, null, 'Mars', 'Mars', 'Mars'];
    const env = rewards({ planetsVisited: visits }); env.check(); env.flush(); expect(env.queue).toHaveLength(0);
    env.patch({ planetsVisited: [...visits, 'Venus'] }); env.render(); env.check(); env.flush();
    expect(env.state.completedChallenges).toEqual(['first_planet', 'visit_3']); expect(env.state.researchPoints).toBe(35);
    env.patch({ planetsVisited: WORLDS }); env.render(); env.check(); env.flush();
    expect(env.state.completedChallenges).toEqual(['first_planet', 'visit_3', 'visit_all']); expect(env.state.researchPoints).toBe(135);
  });

  it('recognizes translated selected-world names and stored stable world keys', () => {
    const localized = (key, fallback) => key === 'stem.solar_sys.jupiter' ? 'Júpiter' : translate(key, fallback);
    for (const selectedPlanet of ['Júpiter', 'Jupiter']) {
      const env = rewards({ selectedPlanet, viewTab: 'interior', completedChallenges: [], researchPoints: 0, totalRP: 0 }, localized);
      env.check(); env.flush(); expect(env.state.completedChallenges).toEqual(['first_planet', 'gas_explorer']); expect(env.state.researchPoints).toBe(30);
    }
  });

  it('keeps feedback bookkeeping bounded through repeated no-op timer callbacks', () => {
    const timer = vi.spyOn(globalThis, 'setTimeout'), env = rewards(); env.effect('scheduleSolarChallengeCheck')();
    const callback = timer.mock.calls.find(call => call[1] === 500)[0];
    for (let i = 0; i < 100; i++) callback();
    const prior = env.all; env.flush(); expect(env.all).toBe(prior);
    const delivery = env.refs.find(ref => ref.current && typeof ref.current.instance === 'string' && ref.current.instance.startsWith('solar-challenge:')).current;
    expect(delivery.delivered).toEqual({}); expect(delivery).not.toHaveProperty('pending'); expect(delivery.sequence).toBe(100);
    env.commit(); expect(env.toast).not.toHaveBeenCalled();
  });

  it('records committed planet visits against the latest ledger and ignores duplicate callbacks', () => {
    const env = rewards({ planetsVisited: ['Mars'] });
    env.effect('trackSolarPlanetVisit')(); env.effect('trackSolarPlanetVisit')();
    env.patch({ planetsVisited: ['Mars', 'Venus', 'legacy-world'], concurrent: true }); env.flush();
    expect(env.state.planetsVisited).toEqual(['Mars', 'Venus', 'legacy-world', 'Earth']); expect(env.state.concurrent).toBe(true);
  });

  it('starts no reward timer during render and uses the latest committed checker', () => {
    const env = rewards(); expect(vi.getTimerCount()).toBe(0); expect(env.queue).toHaveLength(0);
    env.effect('scheduleSolarChallengeCheck')(); env.patch({ showSky: true }); env.render(); env.effect('scheduleSolarChallengeCheck')();
    expect(vi.getTimerCount()).toBe(1); vi.advanceTimersByTime(500); env.flush(); expect(env.state.completedChallenges).toContain('night_sky');
  });

  it('merges rapid engagement actions and preserves other activity counts', () => {
    const env = rewards({ showMoons: true, solEngaged: { moons: 0, orbital: 3, legacy: { preserve: true } } });
    const moon = env.buttons.find(button => String(button.onClick).includes("solTouch('moons')")); expect(moon).toBeTruthy();
    moon.onClick(); moon.onClick(); env.patch({ solEngaged: { moons: 1, orbital: 4, legacy: { preserve: true } } }); env.flush();
    expect(env.state.solEngaged).toEqual({ moons: 3, orbital: 4, legacy: { preserve: true } });
    for (let i = 0; i < 6; i++) moon.onClick(); env.flush(); expect(env.state.solEngaged.moons).toBe(5);
    env.render(); env.check(); env.flush(); expect(env.state.completedChallenges).toEqual(['first_planet', 'moon_explorer', 'orbital_learn']);
  });

  it('cancels pending challenge checks and feedback on unmount', () => {
    const env = rewards({ showSky: true }), cleanup = env.effect('manageSolarChallengeLifetime')();
    env.effect('scheduleSolarChallengeCheck')(); cleanup(); expect(vi.getTimerCount()).toBe(0); vi.advanceTimersByTime(1000); expect(env.queue).toHaveLength(0);
    env.effect('scheduleSolarChallengeCheck')(); vi.advanceTimersByTime(500); env.flush(); cleanup(); env.commit(); expect(env.toast).not.toHaveBeenCalled();
  });
});
