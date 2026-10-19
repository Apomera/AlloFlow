import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;
let api, tool, root, host, latest, updateSaved, frameCallback, wallTime, errors;
const hooks = () => window.__testHooks.flightSim;
const mission = (patch = {}) => ({ version: 1, missionId: 'drone_survey', mode: 'aerial',
  launchLat: 43.646, launchLon: -70.309, elapsedSeconds: 40, completedAtSeconds: null,
  battery: 75, batteryExhausted: false, completed: false, returned: false,
  targets: [{ name: 'First photo', lat: 43.65, lon: -70.30, captured: true },
    { name: 'Second photo', lat: 43.64, lon: -70.31, captured: false }], ...patch });
const record = (patch = {}) => ({ aircraftId: 'drone', aircraft: 'Survey Drone',
  activityId: 'drone_survey', investigation: false, startedAirborne: false,
  airborneSeconds: 10, flightTime: 10, samples: [], mission: mission(), ...patch });

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
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
    const [data, update] = React.useState({ flightSim: { view: 'menu', aircraft: 'drone', railCollapsed: true, menuSections: { challenges: true },
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(a => [a.id, true])), ...seed } });
    latest = data.flightSim;
    updateSaved = patch => update(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: update,
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => update(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function begin(id) {
  const launch = host.querySelector('[data-flight-challenge-id="' + id + '"]');
  expect(launch).toBeTruthy();
  await act(async () => launch.click());
  if (id !== 'coastal_rescue') {
    const accept = [...host.querySelectorAll('button')].find(button => button.textContent.includes('I Understand — Begin Flight'));
    expect(accept).toBeTruthy(); await act(async () => accept.click());
  }
  expect(latest.view).toBe('flying');
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
}
async function finish() {
  hooks().keysRef.current.escape = true;
  wallTime += 100;
  await act(async () => frameCallback());
  expect(latest.view).toBe('debrief');
}

describe('bounded, evidence-based mission records', () => {
  it('requires the survivor target to agree with recovery before reporting a completed rescue', () => {
    const rescued = mission({ missionId: 'coastal_rescue', mode: 'rescue', completed: true,
      returned: true, recovered: true, recoveredAtSeconds: 20, completedAtSeconds: 30,
      targets: [{ name: 'Survivor', lat: 43.65, lon: -70.3, captured: true }] });
    expect(api.normalizeFlightMissionRecord(rescued).outcome).toBe('complete');
    for (const targets of [[], [{ ...rescued.targets[0], captured: false }],
      [rescued.targets[0], rescued.targets[0]]]) {
      expect(api.normalizeFlightMissionRecord({ ...rescued, targets }).outcome).toBe('unknown');
    }
  });

  it('copies target evidence and sanitizes bounded fields while ignoring mutable counters', () => {
    const input = mission({ capturedCount: 900, arbitrarySecret: 'discard', battery: '75',
      targets: [{ name: 'A\n'.repeat(100), lat: 43, lon: -70, captured: true, secret: 'discard' },
        { name: 'Second', lat: 44, lon: -71, captured: 'true' }] });
    const normalized = api.normalizeFlightMissionRecord(input);
    expect(normalized).toMatchObject({ capturedCount: null, battery: null, outcome: 'ended' });
    expect(normalized.targets[0].name).toHaveLength(120);
    expect(normalized.targets[0].name).not.toContain('\n');
    expect(normalized.targets[1].captured).toBeNull();
    expect(normalized).not.toHaveProperty('arbitrarySecret');
    expect(normalized.targets[0]).not.toHaveProperty('secret');
    input.targets[0].captured = false;
    expect(normalized.targets[0].captured).toBe(true);
  });

  it('keeps truncated, malformed and absent mission evidence unknown across repeated normalization', () => {
    for (const targets of [[], Array.from({ length: 20 }, () => ({ name: 'Photo', lat: 43, lon: -70, captured: true })),
      [null], [{ name: 'Bad coordinate', lat: Infinity, lon: -70, captured: true }]]) {
      const normalized = api.normalizeFlightMissionRecord(mission({ targets, completed: true, returned: true, completedAtSeconds: 30 }));
      expect(normalized.targets.length).toBeLessThanOrEqual(12);
      expect(normalized.outcome).toBe('unknown');
      expect(api.normalizeFlightMissionRecord(normalized).outcome).toBe('unknown');
    }
    expect(api.normalizeFlightMissionRecord(null)).toBeNull();
    expect(api.normalizeFlightMissionRecord(mission({ mode: 'powerline' }))).toBeNull();
    expect(api.normalizeFlightMissionRecord(mission({ missionId: 'invented' }))).toBeNull();
  });

  it('requires all target flags, an observed return and consistent timing before reporting completion', () => {
    const complete = mission({ completed: true, returned: true, completedAtSeconds: 30,
      targets: mission().targets.map(target => ({ ...target, captured: true })) });
    expect(api.normalizeFlightMissionRecord(complete).outcome).toBe('complete');
    for (const patch of [{ returned: undefined }, { completedAtSeconds: 41 }, { elapsedSeconds: undefined },
      { targets: mission().targets }, { batteryExhausted: true, battery: 0 }]) {
      expect(api.normalizeFlightMissionRecord({ ...complete, ...patch }).outcome).not.toBe('complete');
    }
    expect(api.normalizeFlightMissionRecord(mission({ batteryExhausted: true, battery: 0 })).outcome).toBe('depleted');
    expect(api.normalizeFlightMissionRecord(mission({ completed: undefined })).outcome).toBe('unknown');
  });

  it('retains rescue progress without inferring a return from a recovery or legacy completion flag', () => {
    const rescue = { ...mission(), missionId: 'coastal_rescue', mode: 'rescue', completed: true,
      recovered: true, returned: true, recoveredAtSeconds: 12, completedAtSeconds: 30,
      targets: [{ name: '', lat: 43.606, lon: -70.239, captured: true }] };
    expect(api.normalizeFlightMissionRecord(rescue)).toMatchObject({ outcome: 'complete', recovered: true, battery: null });
    for (const patch of [{ returned: undefined }, { recoveredAtSeconds: undefined }, { recoveredAtSeconds: 31 }, { recovered: false }]) {
      expect(api.normalizeFlightMissionRecord({ ...rescue, ...patch }).outcome).toBe('unknown');
    }
  });

  it('compares only matching mission mode, launch and target context and keeps legacy context unknown', () => {
    const first = record(), translated = record({ mission: mission({ targets: mission().targets.map(target => ({ ...target, name: 'Translated label' })) }) });
    expect(api.flightPracticeComparison(first, translated).comparable).toBe(true);
    expect(api.flightPracticeComparison(first, record({ mission: mission({ launchLat: 44 }) })))
      .toMatchObject({ comparable: false, reason: 'context' });
    expect(api.flightPracticeComparison(first, record({ mission: mission({ targets: [{ name: 'Other target', lat: 45, lon: -70, captured: true }] }) })))
      .toMatchObject({ comparable: false, reason: 'context' });
    expect(api.flightPracticeComparison(first, record({ mission: undefined })))
      .toMatchObject({ comparable: false, reason: 'unknown' });
    expect(api.flightPracticeComparison(first, record({ activityId: 'drone_powerline', mission: mission({ missionId: 'drone_powerline', mode: 'powerline' }) })))
      .toMatchObject({ comparable: false, reason: 'context' });
    expect(api.normalizeFlightPracticeRecord(record({ activityId: 'free_flight' })).mission).toBeNull();
  });
});

describe('mission debrief and earlier journal persistence', () => {
  it.each([
    ['coastal_rescue', 'drone_survey', 'survey', 'rescue', 'aerial'],
    ['drone_survey', 'coastal_rescue', 'rescue', 'survey', 'rescue']
  ])('switches from %s to %s without carrying the previous live mission', async (first, next, active, cleared, kind) => {
    await mount(); await begin(first);
    await finish();
    const previous = latest.lastDebrief;
    const back = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Back to Menu'));
    expect(back).toBeTruthy();
    await act(async () => back.click());
    await begin(next);
    wallTime += 100;
    await act(async () => frameCallback());
    expect(latest[active].active).toBe(true);
    expect(latest[cleared]).toBeNull();
    expect(hooks().getMissionGuidance()).toMatchObject({ kind, phase: 'target' });
    expect(latest.lastDebrief).toEqual(previous);
  });

  it('ends a survey, starts a different mission, then reviews the detached original target outcomes after remount', async () => {
    await mount(); await begin('drone_survey');
    const targets = latest.survey.photos.map((target, index) => ({ ...target, captured: index === 0 }));
    await act(async () => updateSaved({ survey: { ...latest.survey, photos: targets, capturedCount: 999, battery: 64 } }));
    await finish();
    expect(latest.lastDebrief).toMatchObject({ activityId: 'drone_survey', mission: { mode: 'aerial', capturedCount: 1, outcome: 'ended' } });
    const firstAttempt = latest.lastDebrief.attemptId;
    const firstName = targets[0].name;
    expect(host.querySelector('[data-flight-mission-summary="latest"]').textContent).toContain('Targets captured: 1 of 4.');
    targets[0].name = 'Later mutable mission name'; targets[0].captured = false;
    expect(latest.lastDebrief.mission.targets[0]).toMatchObject({ name: firstName, captured: true });
    await act(async () => updateSaved({ view: 'menu' }));
    await begin('drone_powerline');
    await finish();
    expect(latest.lastDebrief.activityId).toBe('drone_powerline');
    expect(latest.flightPracticeHistory.at(-1)).toMatchObject({ attemptId: firstAttempt,
      mission: { missionId: 'drone_survey', capturedCount: 1 } });
    await mount(JSON.parse(JSON.stringify(latest)));
    const earlier = host.querySelector('[data-flight-mission-summary="earlier"]');
    expect(earlier).toBeTruthy();
    expect(earlier.textContent).toContain(firstName);
    expect(earlier.textContent).toContain('Targets captured: 1 of 4.');
    expect(earlier.textContent).not.toContain('Later mutable mission name');
    expect(host.querySelector('[aria-label="Flight practice journal"]').textContent).toContain('different aircraft, exercises, or launch modes');
  });

  it('retains rescued-but-not-returned status and does not relabel it as a completed rescue', async () => {
    await mount({ aircraft: 'rescue_heli' }); await begin('coastal_rescue');
    await act(async () => updateSaved({ rescue: { ...latest.rescue, recovered: true, recoveredAt: 0, completed: false } }));
    await finish();
    expect(latest.lastDebrief.mission).toMatchObject({ missionId: 'coastal_rescue', recovered: true, returned: null, outcome: 'ended' });
    const summary = host.querySelector('[data-flight-mission-summary="latest"]');
    expect(summary.textContent).toContain('Survivor recovery recorded: done.');
    expect(summary.textContent).toContain('Return landing at base recorded: Not recorded.');
    expect(summary.textContent).not.toContain('All mission objectives and the return landing were recorded.');
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(host.querySelector('[data-flight-mission-summary="latest"]').textContent).toContain('Survivor recovery recorded: done.');
  });
});
