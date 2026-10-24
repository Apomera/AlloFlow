import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;
let api, tool, root, host, latest, updateSaved, frameCallback, wallTime, errors, awardXP;
const hooks = () => window.__testHooks.flightSim;
const targets = captured => [{ name: 'Photo one', lat: 43.65, lon: -70.30, captured: true },
  { name: 'Photo two', lat: 43.64, lon: -70.31, captured }];
const mission = (patch = {}) => ({ version: 1, missionId: 'drone_survey', mode: 'aerial',
  launchLat: 43.646, launchLon: -70.309, targets: targets(false), elapsedSeconds: 50,
  completedAtSeconds: null, battery: 75, batteryExhausted: false, completed: false,
  returned: false, ...patch });
const rescueMission = (patch = {}) => mission({ missionId: 'coastal_rescue', mode: 'rescue',
  targets: [{ name: 'Survivor', lat: 43.606, lon: -70.239, captured: false }],
  recovered: false, recoveredAtSeconds: null, ...patch });
const record = (patch = {}) => ({ attemptId: 'mission-learning-original', endedAt: '2026-10-18T12:00:00.000Z',
  activityId: 'drone_survey', aircraftId: 'drone', aircraft: 'Survey Drone',
  investigation: false, startedAirborne: false, flightTime: 20, airborneSeconds: 20,
  bestStableSeconds: 0, peakAGL: 50, stallSeconds: 0, lowAirspeedSeconds: 0,
  landings: 0, bestLanding: null, samples: [], reflection: '', mission: mission(), ...patch });
const completedMission = () => mission({ targets: targets(true), completed: true, returned: true, completedAtSeconds: 40 });

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) })
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  awardXP = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  expect(errors).not.toHaveBeenCalled();
  host?.remove(); root = host = frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

async function mount(seed = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'debrief', aircraft: 'drone',
      lastDebrief: record(), railCollapsed: true, menuSections: { challenges: true },
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
    latest = data.flightSim;
    updateSaved = patch => update(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: update, awardXP,
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => update(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function click(text) {
  const button = [...host.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  expect(button, 'Button: ' + text).toBeTruthy(); await act(async () => button.click());
}
async function acceptDroneBriefing() {
  const button = [...host.querySelectorAll('button')].find(item => item.textContent.includes('I Understand — Begin Flight'));
  expect(button).toBeTruthy(); await act(async () => button.click());
}
async function beginFromMenu(missionId) {
  const button = host.querySelector('[data-flight-challenge-id="' + missionId + '"]');
  expect(button).toBeTruthy(); await act(async () => button.click());
  if (missionId !== 'coastal_rescue') await acceptDroneBriefing();
  expect(latest.view).toBe('flying');
}
async function explain(text) {
  const input = host.querySelector('#debrief-evidence-explanation'); expect(input).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function finish() {
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  hooks().keysRef.current.escape = true; wallTime += 100;
  await act(async () => frameCallback()); expect(latest.view).toBe('debrief');
}

describe('mission-specific next practice follows recorded evidence', () => {
  it.each([Infinity, NaN, -10, 604801])('does not create or replace a rescue personal best from invalid seconds: %s', rescueSeconds => {
    const first = api.recordFlightPersonalBests({}, { rescueSeconds });
    expect(first.bests).not.toHaveProperty('rescueSeconds');
    expect(first.improved.rescue).not.toBe(true);
    expect(api.recordFlightPersonalBests({ rescueSeconds: 30 }, { rescueSeconds }))
      .toMatchObject({ bests: { rescueSeconds: 30 } });
  });

  it.each([
    ['completed drone mission', completedMission, 'mission_complete', 'navigation'],
    ['depleted drone mission', () => mission({ battery: 0, batteryExhausted: true }), 'mission_depleted', 'weight'],
    ['unfinished capture', mission, 'mission_capture', 'weight'],
    ['captured targets awaiting return', () => mission({ targets: targets(true) }), 'mission_return', 'navigation'],
    ['conflicting completion evidence', () => mission({ completed: true, returned: true, completedAtSeconds: 40 }), 'mission_unknown', 'weight'],
  ])('recommends mission practice for %s instead of fixed-wing milestone remediation', (_name, makeMission, reason, lesson) => {
    const input = record({ mission: makeMission(), stallSeconds: 7, bestLanding: 600 });
    const untouched = JSON.stringify(input);
    expect(api.flightCoachingPlan(input)).toMatchObject({ reason, mission: 'drone_survey', lesson });
    expect(api.flightCoachingPlan(input)).not.toHaveProperty('challenge');
    expect(JSON.stringify(input)).toBe(untouched);
  });

  it.each([
    ['unrecovered survivor', () => rescueMission(), 'mission_recovery', 'weight'],
    ['recovered survivor awaiting return', () => rescueMission({ recovered: true, recoveredAtSeconds: 20,
      targets: [{ name: 'Survivor', lat: 43.606, lon: -70.239, captured: true }] }), 'mission_return', 'navigation'],
    ['completed rescue', () => rescueMission({ recovered: true, recoveredAtSeconds: 20, completed: true,
      completedAtSeconds: 40, returned: true,
      targets: [{ name: 'Survivor', lat: 43.606, lon: -70.239, captured: true }] }), 'mission_complete', 'navigation'],
  ])('uses rescue evidence for %s', (_name, makeMission, reason, lesson) => {
    expect(api.flightCoachingPlan(record({ activityId: 'coastal_rescue', aircraftId: 'rescue_heli', mission: makeMission() })))
      .toMatchObject({ reason, mission: 'coastal_rescue', lesson });
  });

  it.each([undefined, null, mission({ mode: 'unknown' }), rescueMission()])('keeps missing or mismatched mission evidence unknown: %j', saved => {
    expect(api.flightCoachingPlan(record({ mission: saved })))
      .toMatchObject({ reason: 'mission_unknown', mission: 'drone_survey', lesson: 'weight' });
  });

  it.each([
    ['recovery flag without matching survivor target', { recovered: true, recoveredAtSeconds: 20,
      targets: [{ name: 'Survivor', lat: 43.606, lon: -70.239, captured: false }] }],
    ['survivor target without matching recovery flag', { recovered: false,
      targets: [{ name: 'Survivor', lat: 43.606, lon: -70.239, captured: true }] }],
    ['missing recovery timestamp', { recovered: true, recoveredAtSeconds: null,
      targets: [{ name: 'Survivor', lat: 43.606, lon: -70.239, captured: true }] }],
    ['future recovery timestamp', { recovered: true, recoveredAtSeconds: 70,
      targets: [{ name: 'Survivor', lat: 43.606, lon: -70.239, captured: true }] }],
  ])('does not claim pickup or nonrecovery from %s', (_label, patch) => {
    expect(api.flightCoachingPlan(record({ activityId: 'coastal_rescue', aircraftId: 'rescue_heli', mission: rescueMission(patch) })))
      .toMatchObject({ reason: 'mission_unknown', mission: 'coastal_rescue', lesson: 'weight' });
  });

  it('retains fixed-wing coaching for ordinary flights and completed energy exercises', () => {
    expect(api.flightCoachingPlan(record({ aircraftId: 'cessna172', activityId: 'free_flight', mission: null, airborneSeconds: 0 })))
      .toMatchObject({ reason: 'takeoff', challenge: 'first_flight' });
    const challenge = api.createFlightChallenge('energy_management', {});
    Object.keys(challenge.objectives).forEach(key => { challenge.objectives[key] = true; });
    expect(api.flightCoachingPlan(record({ aircraftId: 'cessna172', activityId: 'energy_management', mission: null, challenge })))
      .toMatchObject({ reason: 'energy_complete', challenge: 'world_tour' });
  });
});

describe('airport tour comparisons preserve the selected approach context', () => {
  function tour(approachAirportId, patch = {}) {
    return record({ aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk', activityId: 'world_tour',
      challenge: api.createFlightChallenge('world_tour', {}), mission: null, startedAirborne: true, approachAirportId, ...patch });
  }

  it('calculates deltas only for the same known approach airport', () => {
    expect(api.normalizeFlightPracticeRecord(tour('kpwm')).approachAirportId).toBe('kpwm');
    expect(api.flightPracticeComparison(tour('kpwm', { airborneSeconds: 30 }), tour('kpwm', { airborneSeconds: 20 })))
      .toMatchObject({ comparable: true, reason: 'matching', deltas: { airborneSeconds: 10 } });
    const different = api.flightPracticeComparison(tour('kpwm'), tour('kden'));
    expect(different).toMatchObject({ comparable: false, reason: 'airport' });
    expect(Object.values(different.deltas).every(value => value === null)).toBe(true);
  });

  it.each([undefined, null, 'invented-airport', 123])('keeps missing or invalid airport context unknown: %j', airport => {
    expect(api.normalizeFlightPracticeRecord(tour(airport)).approachAirportId).toBeNull();
    expect(api.flightPracticeComparison(tour('kpwm'), tour(airport)))
      .toMatchObject({ comparable: false, reason: 'unknown' });
  });

  it('captures the selected airport at launch rather than using a later mutable menu choice', async () => {
    await mount({ view: 'menu', aircraft: 'cessna172' });
    await act(async () => hooks().startFlightChallenge('world_tour', 'kpwm'));
    await act(async () => updateSaved({ challengeApproachAirport: 'kden' }));
    await finish();
    expect(latest.lastDebrief).toMatchObject({ activityId: 'world_tour', approachAirportId: 'kpwm' });
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(api.normalizeFlightPracticeRecord(latest.lastDebrief).approachAirportId).toBe('kpwm');
  });
});

describe('mission debrief learning flow', () => {
  it('shows the recorded completion time while retaining later elapsed flight time', async () => {
    await mount({ lastDebrief: record({ mission: { ...completedMission(), completedAtSeconds: 60, elapsedSeconds: 360 } }) });
    const summary = host.querySelector('[data-flight-mission-summary="latest"]');
    expect(summary.textContent).toContain('Total mission time: 60 seconds');
    expect(summary.textContent).not.toContain('Total mission time: 360 seconds');
    expect(latest.lastDebrief.mission.elapsedSeconds).toBe(360);
    expect(latest.lastDebrief.mission.completedAtSeconds).toBe(60);
  });

  it.each(['coastal_rescue', 'drone_survey'])('launches the first %s from a Cessna selection at the mission center', async missionId => {
    await mount({ view: 'menu', aircraft: 'cessna172' });
    await beginFromMenu(missionId);
    const airport = api.WAYPOINTS.find(item => item.id === 'kpwm');
    expect(hooks().flightRef.current.lat).toBeCloseTo(airport.lat, 10);
    expect(hooks().flightRef.current.lon).toBeCloseTo(airport.lon, 10);
    expect(latest.aircraft).toBe(missionId === 'coastal_rescue' ? 'rescue_heli' : 'drone');
  });

  it.each([
    ['invalid survivor position', { survivorLat: Infinity, survivorLon: -70.239, recoveredAt: 10 }],
    ['recovery timestamp after the current flight time', { survivorLat: 43.606, survivorLon: -70.239, recoveredAt: 30 }],
  ])('does not award a recovered rescue with %s', async (_description, malformed) => {
    await mount({ view: 'menu', aircraft: 'cessna172' }); await beginFromMenu('coastal_rescue');
    const airport = api.WAYPOINTS.find(item => item.id === 'kpwm');
    Object.assign(hooks().flightRef.current, { lat: airport.lat, lon: airport.lon, altitude: airport.alt,
      fieldElev: airport.alt, onGround: true, speed: 0, vsi: 0 });
    hooks().timeRef.current = 20;
    vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
      forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, thrust: 0, drag: 0 } }));
    await act(async () => updateSaved({ rescue: { ...latest.rescue, ...malformed,
      recovered: true, completed: false, startedAt: 1 } }));
    wallTime += 100; await act(async () => frameCallback());
    expect(latest.rescue.completed).toBe(false);
    expect(latest.rescuesCompleted || 0).toBe(0);
    expect(latest.personalBests?.rescueSeconds).toBeUndefined();
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('completes a real rescue hover and return with a valid timeline and awards it only once', async () => {
    await mount({ view: 'menu', aircraft: 'cessna172' }); await beginFromMenu('coastal_rescue');
    vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
      forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, thrust: 0, drag: 0 } }));
    const survivor = { lat: latest.rescue.survivorLat, lon: latest.rescue.survivorLon };
    const ground = api.getFlightGroundElevation(survivor.lat, survivor.lon);
    Object.assign(hooks().flightRef.current, { lat: survivor.lat, lon: survivor.lon,
      altitude: ground + 50, fieldElev: ground, onGround: false, speed: 0, rotorForwardFps: 0,
      vsi: 0, heading: 0, stalling: false, lowAirspeed: false, groundContact: null });
    Object.assign(hooks().controlsRef.current, { throttle: .5, bank: 0, pitch: 0 });
    Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0, visibility: 1 });
    for (let index = 0; index < 65 && !latest.rescue.recovered; index++) {
      wallTime += 100; await act(async () => frameCallback());
    }
    expect(latest.rescue.recovered).toBe(true);
    expect(Number.isFinite(latest.rescue.startedAt)).toBe(true);
    expect(Number.isFinite(latest.rescue.recoveredAt)).toBe(true);
    expect(latest.rescue.startedAt).toBeGreaterThanOrEqual(0);
    expect(latest.rescue.recoveredAt).toBeGreaterThanOrEqual(latest.rescue.startedAt);
    expect(latest.rescue.recoveredAt).toBeLessThanOrEqual(hooks().timeRef.current);
    const airport = api.WAYPOINTS.find(item => item.id === 'kpwm');
    Object.assign(hooks().flightRef.current, { lat: airport.lat, lon: airport.lon,
      altitude: airport.alt, fieldElev: airport.alt, onGround: true, speed: 0, vsi: 0,
      groundContact: { vsi: -2, speed: 0, rotorForwardFps: 0 } });
    wallTime += 100; await act(async () => frameCallback());
    expect(latest.rescue).toMatchObject({ completed: true, returnedToBase: true });
    expect(latest.rescuesCompleted).toBe(1);
    expect(awardXP).toHaveBeenCalledTimes(1);
    for (let index = 0; index < 3; index++) {
      wallTime += 100; await act(async () => frameCallback());
    }
    expect(latest.rescuesCompleted).toBe(1);
    expect(awardXP).toHaveBeenCalledTimes(1);
    await finish();
    expect(latest.lastDebrief.mission).toMatchObject({ missionId: 'coastal_rescue', recovered: true,
      returned: true, outcome: 'complete' });
  });

  it.each([
    ['complete', completedMission],
    ['depleted', () => mission({ battery: 0, batteryExhausted: true })],
  ])('leads a %s mission with its outcome instead of a fixed-wing percentage', async (outcome, makeMission) => {
    await mount({ lastDebrief: record({ mission: makeMission() }) });
    const status = host.querySelector('[data-flight-mission-outcome]');
    expect(status).toBeTruthy();
    expect(status.getAttribute('data-flight-mission-outcome')).toBe(outcome);
    expect(host.querySelector('[role="img"][aria-label^="Observed practice milestones:"]')).toBeNull();
    expect(host.querySelector('[aria-label="Observed practice milestones"]')).toBeNull();
    expect(host.querySelector('[aria-label="Next flight coaching tip"]').textContent).not.toContain('ten-second steady-flight hold');
  });

  it.each([
    ['drone_survey', 'aerial', 4],
    ['drone_powerline', 'powerline', 6],
  ])('replays %s through the native drone briefing before starting fresh', async (missionId, mode, count) => {
    await mount({ lastDebrief: record({ activityId: missionId, mission: mission({ missionId, mode }) }),
      rescue: { active: true, recovered: true, survivorLat: 43.606, survivorLon: -70.239 },
      survey: { active: true, completed: true, mode, battery: 1, photos: [] } });
    await click('Start recommended practice');
    expect(latest.droneBriefing).toBe(true);
    expect(latest.selectedChallenge).toBe(missionId);
    expect(latest.view).not.toBe('flying');
    await acceptDroneBriefing();
    expect(latest).toMatchObject({ view: 'flying', aircraft: 'drone', rescue: null,
      survey: { active: true, completed: false, battery: 100, mode, capturedCount: 0 } });
    expect(latest.survey.photos).toHaveLength(count);
    expect(latest.survey.photos.every(target => target.captured === false)).toBe(true);
  });

  it('replays a rescue directly with fresh rescue state and clears a stale drone mission', async () => {
    await mount({ aircraft: 'rescue_heli', lastDebrief: record({ activityId: 'coastal_rescue', aircraftId: 'rescue_heli', mission: rescueMission() }),
      rescue: { active: true, recovered: true, completed: true }, survey: { active: true, completed: false, mode: 'aerial', battery: 1 } });
    await click('Start recommended practice');
    expect(latest).toMatchObject({ view: 'flying', aircraft: 'rescue_heli', survey: null,
      rescue: { active: true, recovered: false, completed: false, hoistTime: 0 } });
  });

  it('edits an empty-sample mission reflection, restores it on remount, and archives it when the next mission ends', async () => {
    const explanation = 'I used too much battery reaching the last photo. Next time I will return sooner.';
    await mount({ lastDebrief: record({ mission: mission({ battery: 0, batteryExhausted: true }), samples: [] }) });
    expect(host.querySelector('[aria-label="Flight evidence explorer"]').textContent).toContain('No recorded observations');
    const input = host.querySelector('#debrief-evidence-explanation');
    expect(input).toBeTruthy();
    const label = host.querySelector('label[for="debrief-evidence-explanation"]'); expect(label).toBeTruthy();
    await explain(explanation);
    expect(latest.lastDebrief.reflection).toBe(explanation);
    const firstAttempt = latest.lastDebrief.attemptId;
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(host.querySelector('#debrief-evidence-explanation').value).toBe(explanation);
    await click('Start recommended practice'); await acceptDroneBriefing(); await finish();
    expect(latest.lastDebrief.reflection).toBe('');
    expect(latest.flightPracticeHistory.at(-1)).toMatchObject({ attemptId: firstAttempt, reflection: explanation,
      mission: { outcome: 'depleted' }, samples: [] });
    expect(host.querySelector('[aria-label="Flight practice journal"]').textContent).toContain(explanation);
  });

  it('keeps an ordinary empty-sample flight reflection editable without inventing observations', async () => {
    await mount({ aircraft: 'cessna172', lastDebrief: record({ activityId: 'free_flight', aircraftId: 'cessna172', mission: null }) });
    await explain('I ended before departure to reconsider the controls.');
    expect(latest.lastDebrief.samples).toEqual([]);
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(host.querySelector('#debrief-evidence-explanation').value).toBe('I ended before departure to reconsider the controls.');
  });
});
