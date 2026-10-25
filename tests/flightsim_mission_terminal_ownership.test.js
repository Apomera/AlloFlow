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

function tapFlightKey(keyName) {
  const cockpit = host.querySelector('#skyschool-flight-container'); expect(cockpit).toBeTruthy(); cockpit.focus();
  cockpit.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }));
  cockpit.dispatchEvent(new KeyboardEvent('keyup', { key: keyName, bubbles: true, cancelable: true }));
}

describe('Sky School mission terminal receipt ownership', () => {
  it.each(drones.flatMap(id => [NaN, Infinity].map(value => [id, value])))
    ('rejects held %s progress when a default battery is replaced with invalid %s', async (id, invalid) => {
      await mount(id); await patch({ survey: { ...latest.survey, battery: null } });
      const checkpoint = copy(latest.flightMission), atTarget = hover(id); holdWrites = true;
      await frames(3, atTarget); expect(pending.length).toBeGreaterThan(0);
      const incoming = { ...latest.survey, battery: invalid, hostNote: 'This invalid value must remain inert.' };
      await patch({ survey: incoming }); await flush(); await advance();
      expect(Object.is(latest.survey.battery, invalid)).toBe(true); expect(latest.survey).toEqual(incoming);
      expect(latest.flightMission).toEqual(checkpoint); expect(hooks().flyingRef.current).toBe(true);
      holdWrites = false; await frames(4, atTarget); await advance();
      expect(Object.is(latest.survey.battery, invalid)).toBe(true); expect(latest.survey).toEqual(incoming);
      expect(latest.survey.photos.every(photo => photo.captured === false)).toBe(true);
      expect(successMessages()).toEqual([]); expect(xp).not.toHaveBeenCalled();
    });

  it.each([['drone_survey', 'battery'], ['drone_powerline', 'target']])
    ('keeps RAF Escape usable after a same-attempt %s %s edit', async (id, field) => {
      await mount(id); await frames(3); const attempt = latest.flightMission.attemptId;
      const changed = field === 'battery' ? { ...latest.survey, battery: 44 }
        : { ...latest.survey, photos: latest.survey.photos.map((photo, index) => index ? photo : { ...photo, lat: photo.lat + .001 }) };
      await patch({ survey: changed }); expect(hooks().flyingRef.current).toBe(true);
      await run(() => tapFlightKey('Escape')); await frame(); await advance();
      expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull(); expect(hooks().flyingRef.current).toBe(false);
      expect(latest.lastDebrief).toMatchObject({ attemptId: attempt, activityId: id, mission: { outcome: 'ended' } });
      if (field === 'battery') expect(latest.lastDebrief.mission.battery).toBe(44);
      else expect(latest.lastDebrief.mission.targets[0].lat).toBe(changed.photos[0].lat);
      expect(announced('Flight ended.')).toHaveLength(1); expect(xp).not.toHaveBeenCalled();
    });

  it.each(ids)('keeps an accepted %s completion terminal after raw mission fields roll back', async id => {
    await mount(id); await readyToReturn(id); const oldRaw = copy(activity(id));
    await frame(touchdown); await advance(); const terminal = copy(latest.flightMission), count = latest[counter(id)];
    expect(terminal.mission.outcome).toBe('complete'); expect(xp).toHaveBeenCalledTimes(1);
    await patch({ [key(id)]: oldRaw }); await run(poke); await frames(4, touchdown); await advance();
    expect(latest.flightMission).toEqual(terminal); expect(latest[counter(id)]).toBe(count);
    expect(activity(id)).toEqual(oldRaw); expect(xp).toHaveBeenCalledTimes(1); expect(successMessages()).toHaveLength(1);
    await click(button('✕ Exit')); expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull();
    expect(latest.lastDebrief.mission).toEqual(terminal.mission); expect(latest[counter(id)]).toBe(count); expect(xp).toHaveBeenCalledTimes(1);
  });

  it.each(drones)('keeps an accepted depleted %s terminal after raw battery and capture fields roll back', async id => {
    await mount(id); await patch({ survey: { ...latest.survey, battery: .001 } });
    await frame(); await advance(); const terminal = copy(latest.flightMission), beforeCount = latest.surveysCompleted;
    expect(terminal.mission.outcome).toBe('depleted'); expect(hooks().pausedRef.current).toBe(true);
    const incoming = { ...latest.survey, battery: 100, batteryExhausted: false, captureProgress: 20,
      photos: latest.survey.photos.map(photo => ({ ...photo, captured: true })), capturedCount: latest.survey.photos.length };
    await patch({ survey: incoming }); await run(poke); const time = hooks().timeRef.current;
    await run(() => tapFlightKey(' ')); await frame(touchdown);
    await click(host.querySelector('button[aria-label="Resume flight"]')); await frames(3, touchdown);
    expect(hooks().pausedRef.current).toBe(true); expect(hooks().timeRef.current).toBe(time);
    expect(latest.flightMission).toEqual(terminal); expect(latest.survey).toEqual(incoming);
    expect(latest.surveysCompleted).toBe(beforeCount); expect(xp).not.toHaveBeenCalled(); expect(successMessages()).toEqual([]);
    await click(button('✕ Exit')); expect(latest.lastDebrief.mission).toEqual(terminal.mission);
    expect(latest.lastDebrief.mission.outcome).toBe('depleted'); expect(latest.surveysCompleted).toBe(beforeCount);
  });

  it.each([false, true])('rejects held recovery A after checkpoint B replaces it (same attempt: %s)', async sameAttempt => {
    await mount('drone_survey'); holdWrites = true;
    const first = foreignCheckpoint('drone_survey'); await patch({ flightMission: first });
    expect(hooks().flyingRef.current).toBe(false); expect(pending.length).toBeGreaterThan(0);
    const second = api.normalizeFlightMissionCheckpoint({ ...copy(first), attemptId: sameAttempt ? first.attemptId : 'replacement-recovery-b',
      recordedAt: '2026-10-23T16:01:00.000Z', mission: { ...copy(first.mission), elapsedSeconds: 31, battery: 61,
        targets: first.mission.targets.map((target, index) => ({ ...target, captured: index < 2 })) } });
    expect(second).not.toBeNull(); await patch({ flightMission: second, teacherMarker: 'Recovery B owns the review.' });
    await flush(); await advance(); expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull();
    expect(latest.lastDebrief).toEqual(api.recoverFlightMissionCheckpoint(second));
    expect(latest.flightPracticeHistory.map(record => record.attemptId)).toEqual(['older-flight', 'prior-flight']);
    expect(latest.teacherMarker).toBe('Recovery B owns the review.'); expect(latest.totalFlightTime).toBe(900);
    expect(announced('Flight ended.')).toHaveLength(1); expect(xp).not.toHaveBeenCalled(); expect(successMessages()).toEqual([]);
  });

  it('recovers a retired mission when aircraft changes while the checkpoint reference stays unchanged', async () => {
    await mount('drone_survey'); const checkpoint = latest.flightMission;
    await patch({ aircraft: 'sr71' }); await advance();
    expect(hooks().flyingRef.current).toBe(false); expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull();
    expect(latest.lastDebrief).toEqual(api.recoverFlightMissionCheckpoint(checkpoint));
    expect(latest.aircraft).toBe('sr71'); expect(latest.totalFlightTime).toBe(900); expect(xp).not.toHaveBeenCalled();
  });

  it('recovers after a held Exit is rejected by raw mission replacement with the same checkpoint', async () => {
    await mount('drone_survey'); const checkpoint = latest.flightMission; holdWrites = true;
    await click(button('✕ Exit')); expect(hooks().flyingRef.current).toBe(false); expect(pending.length).toBeGreaterThan(0);
    await patch({ survey: { ...latest.survey, battery: 44 }, teacherMarker: 'Incoming mission edit.' });
    await flush(); await advance(); expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull();
    expect(latest.lastDebrief).toEqual(api.recoverFlightMissionCheckpoint(checkpoint)); expect(latest.totalFlightTime).toBe(900);
    expect(latest.teacherMarker).toBe('Incoming mission edit.'); expect(latest.flightPracticeHistory.map(record => record.attemptId)).toEqual(['older-flight', 'prior-flight']);
    expect(xp).not.toHaveBeenCalled(); expect(announced('Flight ended.')).toHaveLength(1);
  });
  it('rejects held malformed mission cleanup after a valid replacement checkpoint arrives', async () => {
    await mount('drone_survey'); const incoming = foreignCheckpoint('drone_survey'); holdWrites = true;
    await patch({ flightMission: { version: 1, attemptId: 'malformed-checkpoint', mission: { missionId: 'drone_survey' } } });
    expect(hooks().flyingRef.current).toBe(false); expect(pending.length).toBeGreaterThan(0);
    await patch({ flightMission: incoming, teacherMarker: 'Valid replacement must survive cleanup.' });
    await flush(); await advance(); expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull();
    expect(latest.lastDebrief).toEqual(api.recoverFlightMissionCheckpoint(incoming));
    expect(latest.flightPracticeHistory.map(record => record.attemptId)).toEqual(['older-flight', 'prior-flight']);
    expect(latest.teacherMarker).toBe('Valid replacement must survive cleanup.'); expect(latest.totalFlightTime).toBe(900);
    expect(xp).not.toHaveBeenCalled(); expect(successMessages()).toEqual([]);
  });});