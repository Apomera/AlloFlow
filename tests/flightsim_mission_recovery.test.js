import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, updateSaved, frameCallback, wallTime, writes, xp, toasts, errors, portland;
const hooks = () => window.__testHooks.flightSim;
const ids = ['coastal_rescue', 'drone_survey', 'drone_powerline'];
const mission = (id = 'drone_survey', patch = {}) => ({ missionId: id,
  mode: id === 'coastal_rescue' ? 'rescue' : id === 'drone_powerline' ? 'powerline' : 'aerial',
  launchLat: 43.646, launchLon: -70.309, elapsedSeconds: 24, completed: false, returned: false,
  battery: 82, batteryExhausted: false, recovered: id === 'coastal_rescue', recoveredAtSeconds: 12,
  targets: [{ name: 'First site', lat: 43.65, lon: -70.30, captured: true },
    ...(id === 'coastal_rescue' ? [] : [{ name: 'Second site', lat: 43.64, lon: -70.31, captured: false }])], ...patch });
const checkpoint = (id = 'drone_survey', patch = {}) => ({ version: 1, attemptId: 'mission-interrupted',
  recordedAt: '2026-10-20T12:00:00.000Z', mission: mission(id), ...patch });
const prior = (id = 'prior-flight') => ({ attemptId: id, aircraftId: 'cessna172', activityId: 'free_flight',
  flightTime: 20, startedAirborne: false, investigation: false, reflection: 'Keep my earlier explanation.', samples: [] });
const savedWrites = () => writes.filter(patch => patch.flightMission != null);

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  portland = api.WAYPOINTS.find(item => item.id === 'kpwm');
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  writes = []; xp = []; toasts = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled();
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host); frameCallback = null;
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: true,
      menuSections: { challenges: true, sprints: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
    latest = data.flightSim;
    updateSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      awardXP: (...args) => xp.push(args), addToast: (...args) => toasts.push(args),
      update: (id, key, value) => { writes.push({ [key]: value }); setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); setData(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function launch(id = 'drone_survey') {
  const button = host.querySelector('[data-flight-challenge-id="' + id + '"]'); expect(button).toBeTruthy();
  await act(async () => button.click());
  if (id !== 'coastal_rescue') {
    const begin = [...host.querySelectorAll('button')].find(node => node.textContent.includes('I Understand — Begin Flight'));
    expect(begin).toBeTruthy(); await act(async () => begin.click());
  }
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  const ac = api.AIRCRAFT.find(item => item.id === latest.aircraft);
  Object.assign(hooks().controlsRef.current, { pitch: 0, bank: 0, yawRate: 0, throttle: ac.weight / ac.maxThrust });
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0, visibility: 1 });
}
function pose(patch = {}) {
  Object.assign(hooks().flightRef.current, { lat: portland.lat, lon: portland.lon,
    altitude: portland.alt + 30, fieldElev: portland.alt, heading: 0, speed: 0, rotorForwardFps: 0,
    vsi: 0, onGround: false, groundContact: null, ...patch });
}
async function frame(before) {
  if (before) before(); wallTime += 100;
  expect(frameCallback).toBeTypeOf('function'); await act(async () => frameCallback());
}
async function finish() { hooks().keysRef.current.escape = true; await frame(); }

describe('Sky School mission interruption evidence', () => {
  it('keeps detached canonical mission observations without poses, claimed counts, or controls', () => {
    const saved = checkpoint(); saved.pose = { lat: 90 }; saved.controls = { throttle: 1 }; saved.mission.capturedCount = 999;
    const normalized = api.normalizeFlightMissionCheckpoint(saved);
    expect(normalized.mission).toMatchObject({ capturedCount: 1, outcome: 'ended' });
    expect(normalized).not.toHaveProperty('pose'); expect(normalized).not.toHaveProperty('controls');
    saved.mission.targets[0].captured = false;
    expect(normalized.mission.targets[0].captured).toBe(true);
  });
  it('rejects malformed identity, mission context, clocks, mode, and containers', () => {
    for (const saved of [null, [], 'bad', checkpoint('drone_survey', { version: 2 }),
      checkpoint('drone_survey', { attemptId: '../bad' }), checkpoint('drone_survey', { attemptId: '' }),
      checkpoint('drone_survey', { attemptId: 'x'.repeat(81) }), Object.create(checkpoint()),
      ...[{}, mission('invented'), mission('drone_survey', { mode: 'powerline' }),
        mission('drone_survey', { elapsedSeconds: Infinity }), mission('drone_survey', { elapsedSeconds: -1 }),
        mission('drone_survey', { targets: [] }), mission('drone_survey', { launchLat: 91 })]
        .map(value => checkpoint('drone_survey', { mission: value }))]) {
      expect(api.normalizeFlightMissionCheckpoint(saved)).toBeNull();
    }
  });
  it.each(ids)('recovers %s evidence without inventing aircraft performance', id => {
    const recovered = api.recoverFlightMissionCheckpoint(checkpoint(id));
    expect(recovered).toMatchObject({ attemptId: 'mission-interrupted', activityId: id, sessionTime: 24,
      aircraftId: id === 'coastal_rescue' ? 'rescue_heli' : 'drone', samples: [], mission: { interrupted: true } });
    for (const key of ['flightTime', 'airborneSeconds', 'maxAlt', 'maxSpeed', 'distance', 'bestLanding', 'badges']) expect(recovered).not.toHaveProperty(key);
  });
  it.each(ids)('checkpoints native %s launch immediately with the actual mission identity', async id => {
    await mount(); await launch(id);
    expect(latest.flightMission).toMatchObject({ version: 1, mission: { missionId: id, contextKnown: true, elapsedSeconds: 0, completed: false } });
    expect(latest.flightMission.attemptId).toMatch(/^flight_/);
    expect(latest.flightMission.mission.targets).toHaveLength(id === 'coastal_rescue' ? 1 : id === 'drone_survey' ? 4 : 6);
  });
  it.each(['drone_survey', 'drone_powerline'])('saves a genuine %s capture before the next routine second and keeps it after reload', async id => {
    await mount({ totalFlightTime: 900, lastDebrief: prior() }); await launch(id);
    const target = latest.survey.photos[0], attempt = latest.flightMission.attemptId;
    const ground = api.getFlightGroundElevation(target.lat, target.lon);
    const hover = () => pose({ lat: target.lat, lon: target.lon, altitude: ground + 40, fieldElev: ground });
    for (let i = 0; i < 24; i++) { await frame(hover); if (latest.survey.photos[0].captured) break; }
    expect(latest.survey.photos[0].captured).toBe(true);
    expect(latest.flightMission.mission.capturedCount).toBe(1);
    expect(latest.flightMission.mission.battery).toBeLessThan(100);
    const saved = JSON.parse(JSON.stringify(latest)), elapsed = saved.flightMission.mission.elapsedSeconds;
    const physics = vi.spyOn(api.Physics, 'step'), xpBefore = xp.length;
    await mount(saved);
    expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull(); expect(latest.survey).toBeNull();
    expect(latest.lastDebrief).toMatchObject({ attemptId: attempt, sessionTime: elapsed, mission: { capturedCount: 1, interrupted: true, outcome: 'ended' } });
    expect(latest.flightPracticeHistory.at(-1).reflection).toBe('Keep my earlier explanation.');
    expect(host.querySelector('[data-mission-interrupted]')).toBeTruthy();
    expect(host.querySelector('[data-flight-stat="Max Altitude"]').textContent).toContain('Not recorded');
    expect(hooks().flyingRef.current).toBe(false); expect(physics).not.toHaveBeenCalled();
    expect(latest.totalFlightTime).toBe(900); expect(xp).toHaveLength(xpBefore);
  });
  it('synchronizes survivor pickup before a second RAF and checkpoints its first recorded time', async () => {
    await mount(); await launch('coastal_rescue');
    const target = latest.rescue, ground = api.getFlightGroundElevation(target.survivorLat, target.survivorLon);
    const hover = () => pose({ lat: target.survivorLat, lon: target.survivorLon, altitude: ground + 40, fieldElev: ground });
    for (let i = 0; i < 49; i++) await frame(hover);
    expect(latest.rescue.recovered).toBe(false);
    await act(async () => { for (let i = 0; i < 5; i++) { hover(); wallTime += 100; frameCallback(); } });
    const pickedUp = latest.rescue.recoveredAt;
    expect(latest.rescue.recovered).toBe(true);
    expect(toasts.filter(args => String(args[0]).includes('Survivor recovered!'))).toHaveLength(1);
    expect(latest.flightMission.mission).toMatchObject({ recovered: true, recoveredAtSeconds: pickedUp, targets: [{ captured: true }] });
    await frame(hover); expect(latest.rescue.recoveredAt).toBe(pickedUp);
    const saved = JSON.parse(JSON.stringify(latest)), xpBefore = xp.length;
    await mount(saved);
    expect(latest.lastDebrief.mission).toMatchObject({ recovered: true, recoveredAtSeconds: pickedUp, interrupted: true, returned: null });
    expect(latest.rescue).toBeNull(); expect(latest.rescuesCompleted).toBeUndefined(); expect(xp).toHaveLength(xpBefore);
  });
  it('limits routine snapshots to one per simulated second and freezes them while paused', async () => {
    await mount(); await launch(); const count = savedWrites().length;
    for (let i = 0; i < 15; i++) await frame();
    expect(savedWrites().length - count).toBeGreaterThanOrEqual(1);
    expect(savedWrites().length - count).toBeLessThanOrEqual(2);
    hooks().keysRef.current[' '] = true; await frame();
    const saved = JSON.stringify(latest.flightMission), pausedCount = savedWrites().length;
    for (let i = 0; i < 5; i++) await frame();
    expect(hooks().pausedRef.current).toBe(true); expect(JSON.stringify(latest.flightMission)).toBe(saved);
    expect(savedWrites()).toHaveLength(pausedCount);
  });
  it.each(ids)('recovers completed %s evidence once without replaying XP, counts, personal bests, or flight time', async id => {
    await mount({ rescuesCompleted: 2, surveysCompleted: 3, totalFlightTime: 700 }); await launch(id);
    hooks().timeRef.current = 20;
    if (id === 'coastal_rescue') {
      await act(async () => updateSaved({ rescue: { ...latest.rescue, recovered: true, recoveredAt: 10, startedAt: 1 } }));
    } else {
      await act(async () => updateSaved({ survey: { ...latest.survey, photos: latest.survey.photos.map(target => ({ ...target, captured: true })) } }));
    }
    await frame(() => pose({ altitude: portland.alt + .01, onGround: false, vsi: -2 }));
    const counter = id === 'coastal_rescue' ? 'rescuesCompleted' : 'surveysCompleted';
    expect(latest.flightMission.mission.outcome).toBe('complete');
    expect(xp).toHaveLength(1);
    expect(writes.some(patch => patch[counter] === latest[counter] && patch.flightMission?.mission.outcome === 'complete')).toBe(true);
    const saved = JSON.parse(JSON.stringify(latest)), xpBefore = xp.length;
    await mount(saved);
    expect(latest.lastDebrief.mission).toMatchObject({ outcome: 'complete', interrupted: true });
    expect(latest[counter]).toBe(saved[counter]); expect(latest.personalBests).toEqual(saved.personalBests);
    expect(latest.totalFlightTime).toBe(700); expect(xp).toHaveLength(xpBefore);
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(latest[counter]).toBe(saved[counter]); expect(xp).toHaveLength(xpBefore);
  });
  it('checkpoints depleted battery before pausing and retains depletion after reload', async () => {
    await mount(); await launch();
    await act(async () => updateSaved({ survey: { ...latest.survey, battery: .001 } }));
    await frame();
    expect(latest.flightMission.mission).toMatchObject({ battery: 0, batteryExhausted: true, outcome: 'depleted' });
    expect(writes.some(patch => patch.survey?.batteryExhausted && patch.flightMission?.mission.outcome === 'depleted')).toBe(true);
    expect(hooks().pausedRef.current).toBe(true);
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(latest.lastDebrief.mission).toMatchObject({ outcome: 'depleted', interrupted: true }); expect(xp).toHaveLength(0);
  });
  it('recovers late storage hydration and archives the prior latest exactly once', async () => {
    await mount({ lastDebrief: prior(), flightPracticeHistory: [prior('older-flight')] });
    await act(async () => updateSaved({ flightMission: checkpoint() }));
    expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull();
    expect(latest.flightPracticeHistory.map(record => record.attemptId)).toEqual(['older-flight', 'prior-flight']);
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(latest.flightPracticeHistory).toHaveLength(2); expect(xp).toHaveLength(0);
  });
  it('clears a duplicate latest checkpoint without overwriting its reflection or adding history', async () => {
    const recovered = { ...api.recoverFlightMissionCheckpoint(checkpoint()), reflection: 'Preserve my mission explanation.' };
    await mount({ view: 'flying', flightMission: checkpoint(), lastDebrief: recovered, flightPracticeHistory: [prior()] });
    expect(latest.view).toBe('debrief'); expect(latest.flightMission).toBeNull();
    expect(latest.lastDebrief).toEqual(recovered); expect(latest.flightPracticeHistory).toHaveLength(1);
  });
  it('does not resurrect an archived mission or replace the current latest review', async () => {
    const recovered = api.recoverFlightMissionCheckpoint(checkpoint());
    await mount({ view: 'flying', flightMission: checkpoint(), lastDebrief: prior(), flightPracticeHistory: [recovered] });
    expect(latest.view).toBe('menu'); expect(latest.flightMission).toBeNull();
    expect(latest.lastDebrief.attemptId).toBe('prior-flight'); expect(latest.flightPracticeHistory).toHaveLength(1);
  });
  it('discards a malformed cockpit checkpoint and stale mission phases without replaying them', async () => {
    await mount({ view: 'flying', flightMission: checkpoint('drone_survey', { mission: {} }), lastDebrief: prior(),
      rescue: { active: true, recovered: true, completed: false }, survey: { active: true, completed: true } });
    expect(latest.view).toBe('menu'); expect(latest.flightMission).toBeNull();
    expect(latest.rescue).toBeNull(); expect(latest.survey).toBeNull();
    expect(latest.lastDebrief.attemptId).toBe('prior-flight'); expect(xp).toHaveLength(0);
  });
  it('uses the mission attempt identity at normal finish and clears it before another departure', async () => {
    await mount(); await launch(); const attempt = latest.flightMission.attemptId;
    await finish();
    expect(latest.flightMission).toBeNull(); expect(latest.lastDebrief.attemptId).toBe(attempt);
    expect(latest.lastDebrief.mission.interrupted).not.toBe(true);
    await act(async () => hooks().startFlightChallenge('first_climb'));
    expect(latest.flightMission).toBeNull(); expect(latest.view).toBe('flying');
    await act(async () => updateSaved({ rescue: { active: true, recovered: true, completed: false,
      survivorLat: portland.lat, survivorLon: portland.lon, startedAt: 1, recoveredAt: 10 },
    survey: { active: true, mode: 'aerial', completed: false, battery: 100, launchLat: portland.lat, launchLon: portland.lon,
      photos: [{ lat: portland.lat, lon: portland.lon, captured: true }] } }));
    hooks().timeRef.current = 20;
    await frame(() => pose({ altitude: portland.alt + .01, onGround: false, vsi: -2 }));
    expect(latest.rescuesCompleted).toBeUndefined(); expect(latest.surveysCompleted).toBeUndefined();
    expect(latest.flightMission).toBeNull(); expect(xp).toHaveLength(0);
  });
});
