import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ids = ['coastal_rescue', 'drone_survey', 'drone_powerline'], drones = ids.slice(1);
let api, tool, host, root, latest, savedRoot, updateSaved, poke, pending, holdWrites, frameCallback, wallTime, portland;
let replayChecks, receipts, xp, toasts, speech, errors;
const copy = value => JSON.parse(JSON.stringify(value));
const hooks = () => window.__testHooks.flightSim;
const key = id => id === 'coastal_rescue' ? 'rescue' : 'survey';
const counter = id => id === 'coastal_rescue' ? 'rescuesCompleted' : 'surveysCompleted';
const activity = id => latest[key(id)];
const prior = (attemptId = 'prior-flight', patch = {}) => ({ attemptId, aircraftId: 'cessna172', activityId: 'free_flight',
  investigation: false, startedAirborne: false, flightTime: 8, sessionTime: 12, samples: [],
  reflection: 'Keep this earlier explanation.', endedAt: '2026-10-23T12:00:00.000Z', ...patch });
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
function handler(node) { expect(node).toBeTruthy(); return node[Object.keys(node).find(name => name.startsWith('__reactProps$'))].onClick; }
async function run(fn) { await act(async () => fn()); }
async function click(node) { expect(node).toBeTruthy(); await run(() => node.click()); }
async function patch(values) { await run(() => updateSaved(values)); }
async function advance() { await run(() => vi.advanceTimersByTime(60)); }
async function commitOne() { expect(pending.length).toBeGreaterThan(0); const apply = pending.shift(); await run(apply); }
async function flush() { for (let i = 0; pending.length; i++) { expect(i).toBeLessThan(300); await commitOne(); } }
function pose(values = {}) {
  Object.assign(hooks().flightRef.current, { lat: portland.lat, lon: portland.lon, altitude: portland.alt + 40,
    fieldElev: portland.alt, heading: 0, speed: 0, rotorForwardFps: 0, vsi: 0, onGround: false,
    groundContact: null, stalling: false, lowAirspeed: false, ...values });
}
function hover(id) {
  const target = id === 'coastal_rescue' ? { lat: activity(id).survivorLat, lon: activity(id).survivorLon } : activity(id).photos[0];
  const elevation = api.getFlightGroundElevation(target.lat, target.lon);
  return () => pose({ lat: target.lat, lon: target.lon, altitude: elevation + 40, fieldElev: elevation });
}
async function frame(before = () => {}) { before(); wallTime += 100; expect(frameCallback).toBeTypeOf('function'); await run(frameCallback); }
async function frames(count, before = () => {}) { for (let i = 0; i < count; i++) await frame(before); }
function physical() {
  return copy({ flight: hooks().flightRef.current, controls: hooks().controlsRef.current,
    plan: hooks().getFlightPlanRef().current, time: hooks().timeRef.current });
}
function successMessages() { return toasts.mock.calls.filter(([, kind]) => kind === 'success').map(([message]) => message); }
function announced(prefix) { return speech.mock.calls.filter(([value]) => typeof value === 'string' && value.startsWith(prefix)); }
function foreignCheckpoint(id, sameAttempt = false) {
  const old = latest.flightMission;
  return api.normalizeFlightMissionCheckpoint({ ...copy(old), attemptId: sameAttempt ? old.attemptId : 'incoming-' + id,
    recordedAt: '2026-10-23T16:00:00.000Z', mission: { ...copy(old.mission), elapsedSeconds: 23,
      battery: id === 'coastal_rescue' ? null : 70, recovered: id === 'coastal_rescue', recoveredAtSeconds: id === 'coastal_rescue' ? 20 : null,
      targets: old.mission.targets.map((target, index) => ({ ...target, captured: index === 0 })) } });
}
async function readyToReturn(id) {
  hooks().timeRef.current = 20;
  await patch(id === 'coastal_rescue' ? { rescue: { ...latest.rescue, recovered: true, recoveredAt: 10, startedAt: 1 } }
    : { survey: { ...latest.survey, photos: latest.survey.photos.map(target => ({ ...target, captured: true })), capturedCount: latest.survey.photos.length } });
}
const touchdown = () => pose({ altitude: portland.alt, fieldElev: portland.alt, onGround: true,
  groundContact: { vsi: -2, speed: 0, rotorForwardFps: 0 } });
async function mount(id = 'drone_survey', options = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  holdWrites = false; pending = []; receipts = [];
  function App() {
    const [data, setData] = React.useState({ otherTool: { draft: 'Preserve unrelated work.' }, flightSim: {
      view: 'menu', aircraft: 'cessna172', railCollapsed: false, cityOnline: false,
      menuSections: { challenges: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])),
      lastDebrief: prior(), flightPracticeHistory: [prior('older-flight')], totalFlightTime: 900,
      rescuesCompleted: 3, surveysCompleted: 4, personalBests: { rescueSeconds: 100, landingFpm: 300 }, teacherMarker: 'initial',
    } });
    const [, local] = React.useState(0); latest = data.flightSim; savedRoot = data; poke = () => local(value => value + 1);
    updateSaved = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = update => {
      const apply = () => setData(previous => {
        const before = JSON.stringify(previous), first = typeof update === 'function' ? update(previous) : update;
        const second = typeof update === 'function' ? update(previous) : update;
        replayChecks.push({ pure: before === JSON.stringify(previous), stable: JSON.stringify(first) === JSON.stringify(second) });
        if (second !== previous) receipts.push({ view: second.flightSim.view, attempt: second.flightSim.flightMission?.attemptId,
          checkpoint: copy(second.flightSim.flightMission || null), rescue: copy(second.flightSim.rescue || null), survey: copy(second.flightSim.survey || null),
          rescuesCompleted: second.flightSim.rescuesCompleted, surveysCompleted: second.flightSim.surveysCompleted });
        return options.cloneAtCommit && second !== previous ? { ...second, flightSim: copy(second.flightSim) } : second;
      });
      if (holdWrites) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: options.legacyHost ? undefined : submit, awardXP: xp, addToast: toasts,
      update: (toolId, name, value) => submit(old => ({ ...old, [toolId]: { ...old[toolId], [name]: value } })),
      updateMulti: (toolId, values) => submit(old => ({ ...old, [toolId]: { ...old[toolId], ...values } })),
    }));
  }
  const app = React.createElement(App);
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, app) : app));
  await launch(id); await advance();
  speech = vi.spyOn(document.getElementById('skyschool-a11y-live'), 'textContent', 'set');
  xp.mockClear(); toasts.mockClear(); receipts = [];
}
async function launch(id) {
  await click(host.querySelector('[data-flight-challenge-id="' + id + '"]'));
  if (id !== 'coastal_rescue') await click(button('✓ I Understand — Begin Flight'));
  expect(latest.view).toBe('flying'); expect(latest.flightMission.mission.missionId).toBe(id);
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  Object.assign(hooks().controlsRef.current, { throttle: 1, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0, type: 'clear', visibility: 1 });
  pose();
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-10-23T16:30:00.000Z')); resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool(process.env.SKYSCHOOL_MISSION_PROGRESS_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  portland = api.WAYPOINTS.find(item => item.id === 'kpwm');
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }) },
  { get: (target, name) => name in target ? target[name] : () => {}, set: (target, name, value) => { target[name] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state, forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, thrust: 0, drag: 0 } }));
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn()); replayChecks = []; xp = vi.fn(); toasts = vi.fn();
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null; frameCallback = null;
  expect(errors).not.toHaveBeenCalled(); expect(replayChecks.every(item => item.pure && item.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School mission progress receipt ownership', () => {
  it.each(ids.flatMap(id => [false, true].map(sameAttempt => [id, sameAttempt])))
    ('retires queued %s progress when incoming checkpoint replaces its evidence (same attempt: %s)', async (id, sameAttempt) => {
      await mount(id); holdWrites = true; await frames(3); expect(pending.length).toBeGreaterThan(0);
      const replacement = foreignCheckpoint(id, sameAttempt); expect(replacement).not.toBeNull();
      await patch({ flightMission: replacement, teacherMarker: 'incoming checkpoint' }); await flush();
      expect(hooks().flyingRef.current).toBe(false); expect(latest.flightMission).toBeNull();
      expect(latest.lastDebrief).toEqual(api.recoverFlightMissionCheckpoint(replacement));
      expect(latest.teacherMarker).toBe('incoming checkpoint'); expect(latest.totalFlightTime).toBe(900);
      expect(latest.flightPracticeHistory.some(record => record.attemptId === 'prior-flight' && record.reflection === prior().reflection)).toBe(true);
      expect(xp).not.toHaveBeenCalled(); expect(successMessages()).toEqual([]);
      const saved = copy(latest), beforeRuntime = physical(); await frame(); await flush();
      expect(latest).toEqual(saved); expect(physical()).toEqual(beforeRuntime);
    });

  it.each([['coastal_rescue', 'view'], ['drone_survey', 'aircraft'], ['drone_powerline', 'mode']])
    ('retires %s runtime and rejects its queued writes after %s changes', async (id, subject) => {
      await mount(id); holdWrites = true; await frames(3);
      const replacement = { flightMission: null, teacherMarker: 'replacement owner',
        ...(subject === 'view' ? { view: 'lesson', selectedLesson: 'navigation' } : subject === 'aircraft' ? { aircraft: 'sr71' }
          : { survey: { ...latest.survey, mode: 'aerial' } }) };
      await patch(replacement); await flush(); const saved = copy(latest), beforeRuntime = physical();
      await frame(); await flush(); expect(hooks().flyingRef.current).toBe(false); expect(latest).toEqual(saved); expect(physical()).toEqual(beforeRuntime);
      expect(latest.flightMission).toBeNull(); expect(latest.teacherMarker).toBe('replacement owner');
      if (subject === 'view') expect(latest.view).toBe('lesson'); if (subject === 'aircraft') expect(latest.aircraft).toBe('sr71');
      expect(xp).not.toHaveBeenCalled(); expect(successMessages()).toEqual([]);
    });

  it.each(ids)('adopts incoming same-attempt %s observations and discards earlier queued accumulators', async id => {
    await mount(id); const atTarget = hover(id); holdWrites = true; await frames(id === 'coastal_rescue' ? 30 : 10, atTarget);
    expect(pending.length).toBeGreaterThan(0);
    const incoming = id === 'coastal_rescue' ? { ...latest.rescue, startedAt: .1, hoistTime: .25 }
      : { ...latest.survey, battery: 37, captureProgress: .1, captureTargetKey: null };
    await patch({ [key(id)]: incoming }); await flush(); expect(activity(id)).toEqual(incoming);
    holdWrites = false; await frame(atTarget); expect(hooks().flyingRef.current).toBe(true);
    if (id === 'coastal_rescue') { expect(latest.rescue.hoistTime).toBeLessThan(.6); expect(latest.rescue.recovered).toBe(false); }
    else { expect(latest.survey.battery).toBeLessThan(37); expect(latest.survey.battery).toBeGreaterThan(36.9);
      expect(latest.survey.captureProgress).toBeLessThan(.5); expect(latest.survey.photos[0].captured).toBe(false); }
    expect(xp).not.toHaveBeenCalled(); expect(successMessages()).toEqual([]);
  });

  it.each(ids)('keeps %s accumulated progress across canonical clones, reordered keys and unrelated metadata', async id => {
    await mount(id); const atTarget = hover(id); await frames(id === 'coastal_rescue' ? 25 : 8, atTarget);
    const field = id === 'coastal_rescue' ? 'hoistTime' : 'captureProgress', before = activity(id)[field]; expect(before).toBeGreaterThan(.3);
    const reordered = Object.fromEntries(Object.entries(copy(activity(id))).reverse()); reordered.hostDecoration = { selected: true };
    if (reordered.photos) reordered.photos = reordered.photos.map(item => ({ ...Object.fromEntries(Object.entries(item).reverse()), hostNote: 'ignored' }));
    await patch({ [key(id)]: reordered, flightMission: copy(latest.flightMission), teacherMarker: 'metadata only' });
    await frame(atTarget); expect(hooks().flyingRef.current).toBe(true); expect(activity(id)[field]).toBeGreaterThan(before);
    expect(latest.teacherMarker).toBe('metadata only'); expect(successMessages()).toEqual([]);
  });

  it.each(ids)('composes held %s capture and checkpoint updates across local renders and celebrates once after acceptance', async id => {
    await mount(id, { strict: true, cloneAtCommit: true }); const atTarget = hover(id), before = copy(latest); holdWrites = true;
    const count = id === 'coastal_rescue' ? 55 : id === 'drone_powerline' ? 18 : 23;
    for (let i = 0; i < count; i++) { await frame(atTarget); if (i % 5 === 0) await run(poke); }
    expect(latest).toEqual(before); expect(successMessages()).toEqual([]); expect(xp).not.toHaveBeenCalled();
    await flush(); await advance();
    expect(id === 'coastal_rescue' ? latest.rescue.recovered : latest.survey.photos[0].captured).toBe(true);
    expect(latest.flightMission.mission.targets[0].captured).toBe(true); expect(successMessages()).toHaveLength(1);
    holdWrites = false; await frames(4, atTarget); await advance(); expect(successMessages()).toHaveLength(1); expect(xp).not.toHaveBeenCalled();
    expect(savedRoot.otherTool).toEqual({ draft: 'Preserve unrelated work.' });
  });
});

describe('Sky School mission completion receipt ownership', () => {
  it.each(ids)('accepts %s completion once and merges current counters, bests and unrelated host metadata', async id => {
    await mount(id, { strict: true, cloneAtCommit: true }); await readyToReturn(id); const before = copy(latest); holdWrites = true;
    await frame(touchdown); await run(poke); await frames(3, touchdown); await advance();
    expect(latest).toEqual(before); expect(xp).not.toHaveBeenCalled(); expect(successMessages()).toEqual([]);
    await patch({ [counter(id)]: 10, personalBests: { rescueSeconds: 5, landingFpm: 90 }, teacherMarker: 'accepted metadata' });
    await flush(); await advance(); expect(activity(id).completed).toBe(true); expect(latest[counter(id)]).toBe(11);
    expect(latest.personalBests).toMatchObject({ rescueSeconds: 5, landingFpm: 90 }); expect(latest.teacherMarker).toBe('accepted metadata');
    expect(latest.flightMission.mission.outcome).toBe('complete'); expect(xp).toHaveBeenCalledTimes(1); expect(xp.mock.calls[0][1]).toBe(20);
    expect(successMessages()).toHaveLength(1);
    expect(receipts.filter(item => item[counter(id)] === 11).every(item => item.checkpoint?.mission.outcome === 'complete' && item[key(id)]?.completed === true)).toBe(true);
    holdWrites = false; await frames(3, touchdown); await advance(); expect(latest[counter(id)]).toBe(11); expect(xp).toHaveBeenCalledTimes(1);
  });

  it.each(ids)('rejects %s completion against a replacement checkpoint without count, best, XP or completion celebration', async id => {
    await mount(id); await readyToReturn(id); holdWrites = true; await frame(touchdown);
    const replacement = foreignCheckpoint(id); await patch({ flightMission: replacement, personalBests: { rescueSeconds: 4, landingFpm: 85 }, [counter(id)]: 12 });
    await flush(); await advance(); expect(latest.lastDebrief).toEqual(api.recoverFlightMissionCheckpoint(replacement));
    expect(latest[counter(id)]).toBe(12); expect(latest.personalBests).toMatchObject({ rescueSeconds: 4, landingFpm: 85 });
    expect(xp).not.toHaveBeenCalled(); expect(successMessages()).toEqual([]); expect(hooks().flyingRef.current).toBe(false);
  });

  it.each(ids)('keeps an earlier accepted %s completion and its single award when Exit follows before the receipt', async id => {
    await mount(id); await readyToReturn(id); const attempt = latest.flightMission.attemptId, beforeCount = latest[counter(id)]; holdWrites = true;
    await frame(touchdown); expect(pending.length).toBeGreaterThan(0); const exit = handler(button('✕ Exit')); await run(exit);
    expect(hooks().flyingRef.current).toBe(false); expect(xp).not.toHaveBeenCalled(); const queued = pending.length;
    await run(exit); expect(pending).toHaveLength(queued); await commitOne(); await advance();
    expect(latest[counter(id)]).toBe(beforeCount + 1); expect(xp).toHaveBeenCalledTimes(1);
    await flush(); await advance(); expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull();
    expect(latest.lastDebrief).toMatchObject({ attemptId: attempt, activityId: id, mission: { outcome: 'complete', returned: true } });
    expect(latest[counter(id)]).toBe(beforeCount + 1); expect(xp).toHaveBeenCalledTimes(1); expect(successMessages()).toHaveLength(1);
  });
});

describe('Sky School mission battery receipt ownership', () => {
  it.each(drones.flatMap(id => [false, true].map(reject => [id, reject])))
    ('announces %s low battery only for an accepted warning receipt (reject: %s)', async (id, reject) => {
      await mount(id); await patch({ survey: { ...latest.survey, battery: 15.001 } }); holdWrites = true;
      await frames(3); await advance(); expect(announced('Low battery:')).toHaveLength(0); expect(latest.survey.batteryLowWarned).not.toBe(true);
      if (reject) await patch({ survey: { ...latest.survey, battery: 80, batteryLowWarned: false } });
      await flush(); await advance();
      if (reject) { expect(latest.survey.battery).toBe(80); expect(latest.survey.batteryLowWarned).toBe(false); expect(announced('Low battery:')).toHaveLength(0); }
      else { expect(latest.survey.batteryLowWarned).toBe(true); expect(announced('Low battery:')).toHaveLength(1);
        holdWrites = false; await frames(4); await advance(); expect(announced('Low battery:')).toHaveLength(1); }
      expect(xp).not.toHaveBeenCalled(); expect(hooks().pausedRef.current).toBe(false);
    });

  it.each(drones.flatMap(id => [false, true].map(reject => [id, reject])))
    ('pauses depleted %s immediately and announces only its accepted depletion (reject: %s)', async (id, reject) => {
      await mount(id); await patch({ survey: { ...latest.survey, battery: .001 } }); holdWrites = true;
      await frames(3); await advance(); expect(hooks().pausedRef.current).toBe(true); expect(latest.survey.battery).toBe(.001);
      expect(announced('Drone battery depleted.')).toHaveLength(0); const heldTime = hooks().timeRef.current;
      await frames(3); expect(hooks().timeRef.current).toBe(heldTime);
      if (reject) await patch({ survey: { ...latest.survey, battery: 60, batteryExhausted: false } });
      await flush(); await advance();
      if (reject) { expect(latest.survey.battery).toBe(60); expect(latest.survey.batteryExhausted).toBe(false); expect(announced('Drone battery depleted.')).toHaveLength(0); }
      else { expect(latest.survey).toMatchObject({ battery: 0, batteryExhausted: true });
        expect(latest.flightMission.mission).toMatchObject({ battery: 0, batteryExhausted: true, outcome: 'depleted' });
        expect(announced('Drone battery depleted.')).toHaveLength(1); }
      expect(xp).not.toHaveBeenCalled(); expect(successMessages()).toEqual([]);
    });
});

describe('Sky School mission Exit receipt ownership', () => {
  it.each(ids)('merges current %s review history and elapsed-time total only when its held Exit accepts', async id => {
    await mount(id); const attempt = latest.flightMission.attemptId; hooks().timeRef.current = 16; hooks().getLogRef().current.airborneSeconds = 12;
    holdWrites = true; const exit = handler(button('✕ Exit')); await run(exit); await advance();
    expect(hooks().flyingRef.current).toBe(false); expect(latest.view).toBe('flying'); expect(latest.totalFlightTime).toBe(900);
    expect(announced('Flight ended.')).toHaveLength(0); const count = pending.length; await run(exit); expect(pending).toHaveLength(count);
    const edited = { ...latest.lastDebrief, reflection: 'A newer explanation to retain.' }, history = [...latest.flightPracticeHistory, prior('host-history')];
    await patch({ lastDebrief: edited, flightPracticeHistory: history, totalFlightTime: 1000,
      personalBests: { rescueSeconds: 5, landingFpm: 80 }, teacherMarker: 'host metadata' });
    await flush(); await advance(); expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull(); expect(latest.totalFlightTime).toBe(1012);
    expect(latest.lastDebrief).toMatchObject({ attemptId: attempt, activityId: id, airborneSeconds: 12, sessionTime: 16 });
    expect(latest.flightPracticeHistory.map(record => record.attemptId)).toEqual(['older-flight', 'host-history', 'prior-flight']);
    expect(latest.flightPracticeHistory.at(-1).reflection).toBe(edited.reflection); expect(latest.personalBests).toEqual({ rescueSeconds: 5, landingFpm: 80 });
    expect(latest.teacherMarker).toBe('host metadata'); expect(announced('Flight ended.')).toHaveLength(1); expect(xp).not.toHaveBeenCalled();
  });

  it.each(ids)('rejects an old %s Exit instead of replacing an incoming review and its history', async id => {
    await mount(id); hooks().getLogRef().current.airborneSeconds = 12; holdWrites = true; await click(button('✕ Exit'));
    const incoming = prior('incoming-review', { reflection: 'The incoming review wins.' });
    await patch({ view: 'debrief', flightMission: null, lastDebrief: incoming, flightPracticeHistory: [prior('incoming-history')], totalFlightTime: 1200 });
    const before = copy(latest); await flush(); await advance(); expect(latest).toEqual(before); expect(latest.lastDebrief).toEqual(incoming);
    expect(announced('Flight ended.')).toHaveLength(0); expect(xp).not.toHaveBeenCalled(); expect(hooks().flyingRef.current).toBe(false);
  });

  it.each(ids)('retires a retained %s Exit handler before a new mission attempt starts', async id => {
    await mount(id); const staleExit = handler(button('✕ Exit')); await run(staleExit); await click(button('🏠 Back to Menu')); await launch(id);
    const before = copy(latest), beforeRuntime = physical(); await run(staleExit);
    expect(latest).toEqual(before); expect(physical()).toEqual(beforeRuntime); expect(hooks().flyingRef.current).toBe(true); expect(xp).not.toHaveBeenCalled();
  });
});
