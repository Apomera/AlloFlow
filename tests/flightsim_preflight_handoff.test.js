import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, saved, setSaved, poke, pending, delayHost, replayChecks, xp, errors, previousScroll;
const copy = value => JSON.parse(JSON.stringify(value));
const hooks = () => window.__testHooks.flightSim;
const checks = () => [...host.querySelectorAll('input[type="checkbox"]')];
const button = label => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === label);
const trainer = () => button('Start trainer practice');
const phase = () => api.PREFLIGHT_CHECKLIST[0];
const full = () => Object.fromEntries(api.PREFLIGHT_CHECKLIST.flatMap(item => item.items.map((_, index) => [item.phase + '-' + index, true])));
const partial = () => { const result = full(); delete result[phase().phase + '-0']; return result; };
const finalItemSeed = () => Object.fromEntries(phase().items.slice(0, -1).map((_, index) => [phase().phase + '-' + index, true]));
const item = index => host.querySelector('#skyschool-pf-documents-' + index + ' input');
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy(); return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name];
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function patch(values) { await act(async () => setSaved(values)); }
async function timers() { await act(async () => vi.advanceTimersByTime(100)); }
async function flushHost() {
  for (let count = 0; pending.length; count++) {
    expect(count).toBeLessThan(30);
    const apply = pending.shift(); await act(async () => apply());
  }
}
function runtime() {
  return copy({ flying: hooks().flyingRef.current, flight: hooks().flightRef.current,
    controls: hooks().controlsRef.current, time: hooks().timeRef.current,
    challenge: hooks().getFlightChallengeRef().current, weather: hooks().getWeatherRef().current,
    sprint: hooks().getSprintRef().current, log: hooks().getLogRef().current });
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; delayHost = !!options.delayHost;
  function App() {
    const [data, update] = React.useState({ otherTool: { writing: 'Keep unrelated writing' },
      flightSim: { view: 'preflight', preflightChecked: full(), preflightOpen: { Documents: true },
        aircraft: 'drone', selectedChallenge: 'drone_survey', survey: { active: true, marker: 'old survey' },
        rescue: { active: true, marker: 'old rescue' }, totalFlightTime: 900, teacherMarker: 'original',
        takeoffTutorialDismissed: true, landingTutorialDismissed: true, railCollapsed: false, ...seed } });
    const [, rerender] = React.useState(0);
    poke = () => rerender(value => value + 1); latest = data.flightSim; saved = data;
    setSaved = values => update(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = change => {
      const apply = () => update(previous => {
        const before = JSON.stringify(previous);
        const first = typeof change === 'function' ? change(previous) : change;
        const second = typeof change === 'function' ? change(previous) : change;
        replayChecks.push({ pure: JSON.stringify(previous) === before, stable: JSON.stringify(first) === JSON.stringify(second) });
        if (options.replaceAcceptedLaunch && previous.flightSim.view === 'preflight' && second.flightSim.view === 'flying') {
          return { ...second, flightSim: options.replaceAcceptedLaunch(second.flightSim) };
        }
        if (options.cloneAtCommit && second !== previous) return { ...second, flightSim: { ...second.flightSim,
          preflightChecked: copy(second.flightSim.preflightChecked),
          ...(second.flightSim.flightChallenge ? { flightChallenge: copy(second.flightSim.flightChallenge) } : {}) } };
        return second;
      });
      if (delayHost) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: options.legacyHost ? undefined : submit,
      update: (id, name, value) => submit(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
      awardXP: (...args) => xp.push(args),
    }));
  }
  const app = React.createElement(App);
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, app) : app));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T16:00:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    return new Proxy({ canvas: this, measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  previousScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  replayChecks = []; xp = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).toHaveLength(0);
  expect(replayChecks.every(check => check.pure && check.stable)).toBe(true);
  if (previousScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', previousScroll);
  else delete HTMLElement.prototype.scrollIntoView;
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School preflight trainer handoff', () => {
  it.each(['committed', 'pending'].flatMap(timing => ['incomplete', 'new review', 'Menu'].map(change => [timing, change])))
    ('rejects a retained trainer after a %s %s replacement without touching flight runtime', async (timing, change) => {
      await mount(); const launch = handler(trainer()), beforeRuntime = runtime();
      const replacement = { ...(change === 'Menu' ? { view: 'menu' } : { preflightChecked: change === 'incomplete' ? partial() : {} }), teacherMarker: 'replacement' };
      if (timing === 'committed') { await patch(replacement); await act(async () => launch()); }
      else await act(async () => { setSaved(replacement); launch(); });
      expect(latest).toMatchObject(replacement); expect(runtime()).toEqual(beforeRuntime);
      expect(latest.survey).toEqual({ active: true, marker: 'old survey' });
      expect(latest.rescue).toEqual({ active: true, marker: 'old rescue' });
      expect(latest.flightChallenge).toBeUndefined(); expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

  it.each(['incomplete', 'new review', 'Menu', 'A to B to A'])('rejects a fully delayed trainer after %s replaces its accepted origin', async change => {
    await mount({}, { delayHost: true }); const original = copy(latest), beforeRuntime = runtime();
    await click(trainer()); expect(pending).toHaveLength(1); expect(runtime()).toEqual(beforeRuntime);
    expect(latest).toEqual(original); expect(requestAnimationFrame).not.toHaveBeenCalled();
    if (change === 'Menu') await patch({ view: 'menu' });
    else {
      await patch({ preflightChecked: change === 'new review' ? {} : partial() });
      if (change === 'A to B to A') await patch(original);
    }
    const expected = copy(latest); await flushHost(); expect(latest).toEqual(expected);
    expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('retires a retained trainer through a completed-to-incomplete-to-completed review replacement', async () => {
    await mount(); const launch = handler(trainer()); await patch({ preflightChecked: partial() }); await patch({ preflightChecked: full() });
    await act(async () => launch()); expect(latest.view).toBe('preflight'); expect(hooks().flyingRef.current).toBe(false);
    await click(trainer()); expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
  });

  it('rejects an old trainer immediately after a checkbox is unchecked in the same batch', async () => {
    await mount(); const launch = handler(trainer()), input = item(0), beforeRuntime = runtime();
    await act(async () => { input.click(); launch(); });
    expect(latest.view).toBe('preflight'); expect(latest.preflightChecked).toEqual(partial());
    expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it.each([false, true])('initializes one fresh trainer only after an atomic accepted launch; cloned receipt: %s', async cloneAtCommit => {
    await mount({}, { delayHost: true, strict: true, cloneAtCommit });
    const launch = handler(trainer()), beforeRuntime = runtime(), review = copy(latest.preflightChecked);
    await act(async () => { launch(); launch(); }); await act(async () => poke());
    expect(pending).toHaveLength(1); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
    await patch({ teacherMarker: 'newer compatible metadata', totalFlightTime: 950 });
    await flushHost();
    expect(latest).toMatchObject({ view: 'flying', aircraft: 'cessna172', selectedChallenge: 'first_flight',
      survey: null, rescue: null, teacherMarker: 'newer compatible metadata', totalFlightTime: 950,
      flightChallenge: { id: 'first_flight', status: 'active', elapsedSeconds: 0, airborneSeconds: 0 } });
    expect(Object.values(latest.flightChallenge.objectives).every(value => value === false)).toBe(true);
    expect(latest.preflightChecked).toEqual(review); expect(saved.otherTool).toEqual({ writing: 'Keep unrelated writing' });
    expect(hooks().flyingRef.current).toBe(true); expect(hooks().flightRef.current.onGround).toBe(true);
    expect(hooks().getFlightChallengeRef().current).toMatchObject({ id: 'first_flight', status: 'active' });
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1); expect(pending).toHaveLength(0);
    expect(latest.lastDebrief).toBeUndefined(); expect(latest.challengeResults).toBeUndefined();
  });

  it('starts trainer practice from a fresh completed review after the last real checkbox commits', async () => {
    await mount({ preflightChecked: partial() }); expect(trainer()).toBeUndefined();
    await click(item(0)); expect(trainer()).toBeTruthy(); await click(trainer());
    expect(latest.view).toBe('flying'); expect(latest.preflightChecked).toEqual(full());
    expect(hooks().flyingRef.current).toBe(true); expect(latest.flightChallenge.id).toBe('first_flight');
  });

  it('initializes a legacy updateMulti host only after its delayed trainer departure is accepted', async () => {
    await mount({}, { delayHost: true, legacyHost: true }); const original = copy(latest), beforeRuntime = runtime();
    await click(trainer()); expect(pending).toHaveLength(1);
    expect(latest).toEqual(original); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
    await flushHost(); expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
    expect(latest.flightChallenge.id).toBe('first_flight'); expect(latest.flightPractice.attemptId).toBeTruthy();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1); expect(pending).toHaveLength(0);
  });

  it('does not initialize a fresh trainer over newer checkpoint evidence sharing the accepted attempt ID', async () => {
    let replacement;
    await mount({}, { delayHost: true, replaceAcceptedLaunch: state => {
      replacement = { ...state, flightPractice: { ...state.flightPractice,
        record: { ...state.flightPractice.record, sessionTime: 9, airborneSeconds: 3, flightTime: 3, maxAlt: 700 } } };
      return replacement;
    } });
    const beforeRuntime = runtime(); await click(trainer()); await flushHost();
    expect(replacement.flightPractice.attemptId).toBeTruthy();
    expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(hooks().flightRef.current).toEqual(beforeRuntime.flight);
    expect(latest.lastDebrief).toMatchObject({ attemptId: replacement.flightPractice.attemptId,
      sessionTime: 9, airborneSeconds: 3, maxAlt: 700, interrupted: true });
  });

  it('recovers newer survey evidence without initializing trainer runtime when the mission changes before receipt', async () => {
    const newerMission = { version: 1, attemptId: 'newer-survey-attempt', recordedAt: '2026-10-23T15:59:00.000Z',
      mission: { missionId: 'drone_survey', mode: 'aerial', launchLat: 43.646, launchLon: -70.309,
        elapsedSeconds: 24, completed: false, returned: false, battery: 82, batteryExhausted: false,
        targets: [{ name: 'First site', lat: 43.65, lon: -70.30, captured: true },
          { name: 'Second site', lat: 43.64, lon: -70.31, captured: false }] } };
    expect(api.normalizeFlightMissionCheckpoint(newerMission)).not.toBeNull();
    await mount({}, { delayHost: true, replaceAcceptedLaunch: state => ({ ...state,
      flightMission: copy(newerMission), survey: { active: true, marker: 'newer authoritative survey' } }) });
    const beforeRuntime = runtime(); await click(trainer()); await flushHost();
    expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(hooks().flightRef.current).toEqual(beforeRuntime.flight);
    expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull(); expect(latest.survey).toBeNull();
    expect(latest.lastDebrief).toMatchObject({ attemptId: 'newer-survey-attempt', activityId: 'drone_survey',
      aircraftId: 'drone', sessionTime: 24, samples: [], mission: { capturedCount: 1, interrupted: true, outcome: 'ended' } });
    for (const key of ['flightTime', 'airborneSeconds', 'maxAlt', 'maxSpeed', 'distance', 'bestLanding', 'badges']) {
      expect(latest.lastDebrief).not.toHaveProperty(key);
    }
    expect(latest.totalFlightTime).toBe(900); expect(saved.otherTool).toEqual({ writing: 'Keep unrelated writing' });
  });
});

describe('Sky School preflight focus after host acceptance', () => {
  it.each([false, true])('waits for phase opening before focusing Next unchecked; reduced motion: %s', async reduceMotion => {
    matchMedia.mockReturnValue({ matches: reduceMotion });
    await mount({ preflightChecked: {}, preflightOpen: { Documents: false } }, { delayHost: true });
    const jump = button('Next unchecked ↓'); await click(jump); await timers();
    expect(item(0)).toBeNull(); expect(document.activeElement).toBe(jump);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    await flushHost(); await timers();
    expect(document.activeElement).toBe(item(0));
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  });

  it('keeps later deliberate focus when a delayed Next unchecked opening finally commits', async () => {
    await mount({ preflightChecked: {}, preflightOpen: { Documents: false } }, { delayHost: true });
    await click(button('Next unchecked ↓')); const other = button('Start a new checklist review'); other.focus();
    await flushHost(); await timers(); expect(document.activeElement).toBe(other);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('keeps focus for the latest delayed jump when an older jump receipt arrives first', async () => {
    await mount({ preflightChecked: {}, preflightOpen: { Documents: true } }, { delayHost: true });
    const jump = button('Next unchecked ↓'); jump.focus();
    await act(async () => { jump.click(); item(0).click(); jump.click(); });
    expect(pending).toHaveLength(3);
    const first = pending.shift(); await act(async () => first()); await timers();
    expect(document.activeElement).toBe(jump); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    await flushHost(); await timers();
    expect(latest.preflightChecked).toEqual({ 'Documents-0': true }); expect(document.activeElement).toBe(item(1));
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it.each(['replacement', 'A to B to A', 'Menu'])('does not apply delayed Next unchecked focus after %s', async change => {
    await mount({ preflightChecked: {}, preflightOpen: { Documents: false } }, { delayHost: true }); const original = copy(latest);
    await click(button('Next unchecked ↓'));
    if (change === 'Menu') await patch({ view: 'menu' });
    else { await patch({ preflightChecked: { 'Documents-0': true } }); if (change === 'A to B to A') await patch(original); }
    const expected = copy(latest); await flushHost(); await timers();
    expect(latest).toEqual(expected); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('moves final-checkbox focus to its surviving phase toggle only after the accepted fold commits', async () => {
    await mount({ preflightChecked: finalItemSeed(), preflightOpen: {} }, { delayHost: true });
    const last = item(phase().items.length - 1); await click(last); await timers();
    expect(last.isConnected).toBe(true); expect(document.activeElement).toBe(last);
    await flushHost(); expect(last.isConnected).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-pf-toggle-0'));
  });

  it('does not steal a later focus choice when a delayed final-checkbox fold commits', async () => {
    await mount({ preflightChecked: finalItemSeed(), preflightOpen: {} }, { delayHost: true });
    await click(item(phase().items.length - 1)); const other = button('Start a new checklist review'); other.focus();
    await flushHost(); expect(document.activeElement).toBe(other);
  });

  it('does not repair focus for a rejected final-checkbox write when foreign progress folds the phase', async () => {
    await mount({ preflightChecked: finalItemSeed(), preflightOpen: {} }, { delayHost: true });
    await click(item(phase().items.length - 1)); const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await patch({ preflightChecked: full() }); const before = copy(latest);
    await flushHost(); expect(latest).toEqual(before);
    expect(focus.mock.instances.filter(node => node.id === 'skyschool-pf-toggle-0')).toHaveLength(0);
  });

  it('keeps a final checkbox focused when its phase was explicitly held open through delayed acceptance', async () => {
    await mount({ preflightChecked: finalItemSeed(), preflightOpen: { Documents: true } }, { delayHost: true });
    const last = item(phase().items.length - 1); await click(last); await flushHost();
    expect(last.isConnected).toBe(true); expect(document.activeElement).toBe(last);
    expect(host.querySelector('#skyschool-pf-toggle-0').getAttribute('aria-expanded')).toBe('true');
  });
});
