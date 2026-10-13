import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let FS, tool, host, root, latest, frameCallback, canvasContext;
const hooks = () => window.__testHooks.flightSim;
const observation = (index = 0) => ({ t: index * 2, lat: 43.646, lon: -70.309,
  alt: 5000 + index, spd: 110, hdg: 90, agl: 4924 + index, fpm: 0,
  aoa: 8, bank: 0, throttle: 0.6, onGround: false, stalling: false, lowAirspeed: false });
const flight = (patch = {}) => ({ attemptId: 'attempt-current', endedAt: '2026-10-10T12:10:00.000Z',
  aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk', startedAirborne: false,
  flightTime: 30, sessionTime: 45, airborneSeconds: 30, bestStableSeconds: 15,
  stallSeconds: 4, lowAirspeedSeconds: 3, peakAGL: 1000, landings: 1, bestLanding: 180,
  maxAlt: 5000, maxSpeed: 110, distance: 2, airports: 1, discovered: 0, badges: 0,
  investigation: false, reflection: 'I reduced pitch before adding power.',
  samples: [observation(), observation(1)], ...patch });

async function mount(seed = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', lastDebrief: flight(), ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
function button(text, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  expect(found, `Button: ${text}`).toBeTruthy();
  return found;
}
async function click(text, scope) { await act(async () => button(text, scope).click()); }
async function change(element, value) {
  expect(element).toBeTruthy();
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLSelectElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event(element.tagName === 'TEXTAREA' ? 'input' : 'change', { bubbles: true }));
  });
}
const journal = () => host.querySelector('[aria-label="Flight practice journal"]');
function labelledControl(text) {
  const label = [...host.querySelectorAll('label')].find(item => item.textContent.trim() === text);
  expect(label).toBeTruthy();
  return host.querySelector('#' + label.htmlFor);
}
const previousSelect = () => labelledControl('Previous flight for comparison');
const challenge = id => FS.createFlightChallenge(id, {});
async function frame() {
  expect(frameCallback, 'The production flight loop must be scheduled').toBeTypeOf('function');
  await act(async () => frameCallback());
}
async function pressFrame(key) {
  const cockpit = host.querySelector('canvas[role="application"]');
  expect(cockpit).toBeTruthy(); cockpit.focus();
  cockpit.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  cockpit.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
  await frame();
}
async function launchSprint(routeId = 'americas') {
  const route = FS.SPRINT_ROUTES.find(item => item.id === routeId);
  const launch = [...host.querySelectorAll('#skyschool-sec-sprints button')]
    .find(item => item.textContent.includes(route.name));
  expect(launch).toBeTruthy();
  await act(async () => launch.click());
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  canvasContext = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }), fillText: vi.fn(),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool bounded practice journal records', () => {
  it('prefers a known aircraft id over a stale display name while resolving genuine legacy names', () => {
    expect(FS.normalizeFlightPracticeRecord(flight({ aircraftId: 'drone' })).aircraftId).toBe('drone');
    const legacy = flight(); delete legacy.aircraftId;
    expect(FS.normalizeFlightPracticeRecord(legacy).aircraftId).toBe('cessna172');
    expect(FS.flightPracticeComparison(flight(), flight({ aircraftId: 'drone' })))
      .toMatchObject({ comparable: false, reason: 'context' });
  });

  it('preserves measured zeroes while keeping absent, malformed, and nonfinite measurements unknown', () => {
    const input = flight({ airborneSeconds: 0, stallSeconds: 0, lowAirspeedSeconds: undefined,
      bestStableSeconds: NaN, bestLanding: -1, startedAirborne: 'false' });
    const normalized = FS.normalizeFlightPracticeRecord(input);
    expect(normalized).toMatchObject({ airborneSeconds: 0, stallSeconds: 0,
      lowAirspeedSeconds: null, bestStableSeconds: null, bestLanding: null, startedAirborne: null });
    expect(input.startedAirborne).toBe('false');
  });

  it('whitelists and bounds the saved record without retaining nested histories or modifying input', () => {
    const input = flight({ reflection: 'x'.repeat(5000), samples: Array.from({ length: 550 }, (_, index) => observation(index)),
      arbitrarySecret: 'discard me', flightPracticeHistory: [flight()], unknownObject: { value: 1 } });
    const normalized = FS.normalizeFlightPracticeRecord(input);
    expect(normalized.reflection).toHaveLength(4000);
    expect(normalized.samples).toHaveLength(500);
    expect(normalized.samples[0].t).toBe(100);
    expect(normalized).not.toHaveProperty('arbitrarySecret');
    expect(normalized).not.toHaveProperty('flightPracticeHistory');
    expect(normalized).not.toHaveProperty('unknownObject');
    expect(input.samples).toHaveLength(550);
    expect(input.reflection).toHaveLength(5000);
  });

  it('migrates a matching legacy challenge explanation only when the record has no attempt reflection', () => {
    const old = flight({ challenge: challenge('first_flight') }); delete old.reflection;
    expect(FS.normalizeFlightPracticeRecord(old, { first_flight: 'Earlier explanation', cross_country: 'Other task' }).reflection)
      .toBe('Earlier explanation');
    expect(FS.normalizeFlightPracticeRecord({ ...old, reflection: '' }, { first_flight: 'Earlier explanation' }).reflection).toBe('');
    expect(FS.normalizeFlightPracticeRecord({ ...old, reflection: null }, { first_flight: 'Earlier explanation' }).reflection).toBe('');
    expect(FS.normalizeFlightPracticeRecord(flight({ reflection: undefined }), { first_flight: 'Earlier explanation' }).reflection)
      .not.toBe('Earlier explanation');
    expect(old).not.toHaveProperty('reflection');
  });

  it('keeps only four previous attempts, caps their observations, and discards invalid entries', () => {
    const records = Array.from({ length: 6 }, (_, index) => flight({ attemptId: 'attempt-' + index,
      samples: Array.from({ length: 510 }, (_, sampleIndex) => observation(sampleIndex)) }));
    const history = FS.normalizeFlightPracticeHistory([null, 'bad record', ...records]);
    expect(history).toHaveLength(4);
    expect(history.map(record => record.attemptId)).toEqual(['attempt-2', 'attempt-3', 'attempt-4', 'attempt-5']);
    expect(history.every(record => record.samples.length === 500)).toBe(true);
    expect(records).toHaveLength(6);
    expect(FS.normalizeFlightPracticeHistory('not an array')).toEqual([]);
  });

  it('archives final edits once per attempt and leaves both the old history and latest record untouched', () => {
    const history = [flight({ attemptId: 'attempt-older' })];
    const latestRecord = flight({ reflection: 'Final explanation added after the flight.' });
    const archived = FS.archiveFlightPractice(history, latestRecord);
    expect(archived).toHaveLength(2);
    expect(archived.at(-1)).toMatchObject({ attemptId: 'attempt-current', reflection: 'Final explanation added after the flight.' });
    expect(FS.archiveFlightPractice(archived, latestRecord)).toHaveLength(2);
    expect(history).toHaveLength(1);
    expect(latestRecord.samples).toHaveLength(2);
  });
});

describe('SkySchool comparable practice evidence', () => {
  it('returns signed measurement changes for matching attempts without creating a grade', () => {
    const earlier = flight({ airborneSeconds: 20, bestStableSeconds: 10, stallSeconds: 8, lowAirspeedSeconds: 1, bestLanding: 300 });
    const comparison = FS.flightPracticeComparison(flight(), earlier);
    expect(comparison).toMatchObject({ comparable: true, reason: 'matching',
      deltas: { airborneSeconds: 10, bestStableSeconds: 5, stallSeconds: -4, lowAirspeedSeconds: 2, bestLanding: -120 } });
    expect(comparison).not.toHaveProperty('score');
    expect(comparison).not.toHaveProperty('grade');
  });

  it('preserves missing measurements as unknown, including an unobserved touchdown', () => {
    const comparison = FS.flightPracticeComparison(flight({ bestLanding: null, stallSeconds: undefined }), flight());
    expect(comparison.comparable).toBe(true);
    expect(comparison.deltas).toMatchObject({ bestLanding: null, stallSeconds: null, airborneSeconds: 0 });
  });

  it.each([
    { aircraftId: 'drone', aircraft: 'Survey Drone' },
    { startedAirborne: true },
    { investigation: true },
  ])('does not compare a different known flight context: %j', patch => {
    const comparison = FS.flightPracticeComparison(flight(), flight(patch));
    expect(comparison).toMatchObject({ comparable: false, reason: 'context' });
    expect(Object.values(comparison.deltas).every(value => value === null)).toBe(true);
  });

  it('does not compare different challenges or call two missing legacy contexts equivalent', () => {
    expect(FS.flightPracticeComparison(flight({ challenge: challenge('first_flight') }), flight({ challenge: challenge('cross_country') })))
      .toMatchObject({ comparable: false, reason: 'context' });
    expect(FS.flightPracticeComparison({ airborneSeconds: 20 }, { airborneSeconds: 30 }))
      .toMatchObject({ comparable: false, reason: 'unknown' });
    expect(FS.flightPracticeComparison(flight({ startedAirborne: undefined }), flight()))
      .toMatchObject({ comparable: false, reason: 'unknown' });
  });

  it('compares geography sprints only when both attempts identify the same known route', () => {
    const sprint = flight({ activityId: 'geography_sprint', sprintRouteId: 'americas', startedAirborne: true });
    expect(FS.normalizeFlightPracticeRecord(sprint).sprintRouteId).toBe('americas');
    expect(FS.normalizeFlightPracticeRecord({ ...sprint, sprintRouteId: 'invented-route' }).sprintRouteId).toBeNull();
    expect(FS.flightPracticeComparison(sprint, { ...sprint, airborneSeconds: 20 }))
      .toMatchObject({ comparable: true, deltas: { airborneSeconds: 10 } });
    expect(FS.flightPracticeComparison(sprint, { ...sprint, sprintRouteId: 'europe' }))
      .toMatchObject({ comparable: false, reason: 'context' });
    for (const missing of [undefined, null, 'invented-route']) {
      const comparison = FS.flightPracticeComparison(sprint, { ...sprint, sprintRouteId: missing });
      expect(comparison).toMatchObject({ comparable: false, reason: 'unknown' });
      expect(Object.values(comparison.deltas).every(value => value === null)).toBe(true);
    }
    expect(FS.normalizeFlightPracticeRecord(flight({ sprintRouteId: 'americas' })).sprintRouteId).toBeNull();
  });
});

describe('SkySchool practice journal learning flow', () => {
  it('shows an earlier reflection and recorded observations through an accessible comparison selector and remount', async () => {
    const earlier = flight({ attemptId: 'earlier', reflection: 'Earlier: I let the nose rise too quickly.',
      endedAt: '2026-10-10T12:00:00.000Z', bestStableSeconds: 5 });
    const different = flight({ attemptId: 'different-context', aircraftId: 'drone', aircraft: 'Survey Drone', reflection: 'Drone observation.' });
    await mount({ flightPracticeHistory: [earlier, different], debriefHistoryIndex: 0 });
    expect(journal()).toBeTruthy();
    expect(journal().textContent).toContain(earlier.reflection);
    expect(journal().querySelectorAll('textarea')).toHaveLength(0);
    expect([...journal().querySelectorAll('summary')].some(item => item.textContent.trim() === 'Earlier recorded observations')).toBe(true);
    expect(button('Download earlier observations (CSV)', journal())).toBeTruthy();
    expect(journal().querySelectorAll('table tbody tr')).toHaveLength(2);
    await change(previousSelect(), 1);
    expect(latest.debriefHistoryIndex).toBe(1);
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved);
    expect(previousSelect().value).toBe('1');
    expect(journal().textContent).toContain('Drone observation.');
    expect(journal().textContent).not.toMatch(/better|improved score|grade:/i);
  });

  it('keeps a first attempt reviewable without pretending there is an earlier flight', async () => {
    await mount({ flightPracticeHistory: [] });
    expect(journal()).toBeTruthy();
    expect(journal().querySelector('select')).toBeNull();
    expect(journal().textContent).not.toContain('NaN');
    expect(journal().textContent).not.toContain('Infinity');
    expect(journal().querySelectorAll('table')).toHaveLength(0);
  });

  it('inspects later groups of earlier observations and restores the selected moment after remount', async () => {
    const earlier = flight({ attemptId: 'longer-earlier', samples: Array.from({ length: 25 }, (_, index) => observation(index)) });
    await mount({ flightPracticeHistory: [earlier] });
    expect(journal().querySelectorAll('table tbody tr')).toHaveLength(10);
    const range = labelledControl('Earlier observation time');
    expect(range.type).toBe('range');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(range, '24');
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(latest.debriefHistorySampleIndex).toBe(24);
    expect(journal().querySelectorAll('table tbody tr')).toHaveLength(5);
    expect(journal().querySelector('table tbody').textContent).toContain('5,024');
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(labelledControl('Earlier observation time').value).toBe('24');
    expect(journal().querySelectorAll('table tbody tr')).toHaveLength(5);
  });

  it('downloads the selected earlier evidence rather than substituting the current flight', async () => {
    const earlier = flight({ attemptId: 'download-earlier', samples: [{ ...observation(), alt: 1234, spd: 95 }] });
    await mount({ flightPracticeHistory: [earlier] });
    let exportedParts, downloadName;
    vi.stubGlobal('Blob', class { constructor(parts) { exportedParts = parts; } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:journal-test'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { downloadName = this.download; });
    await click('Download earlier observations (CSV)', journal());
    expect(exportedParts[0]).toBe(FS.flightEvidenceCsv(earlier.samples));
    expect(exportedParts[0]).toContain('1234,95');
    expect(downloadName).toMatch(/\.csv$/);
  });

  it('archives the final challenge explanation at the next finish and starts the new explanation empty', async () => {
    await mount({ view: 'menu', lastDebrief: null, flightPracticeHistory: [] });
    await act(async () => hooks().startFlightChallenge('first_flight'));
    await click('End challenge');
    await change(host.querySelector('#challenge-reflection'), 'First draft about this attempt.');
    await change(host.querySelector('#challenge-reflection'), 'Final evidence-based revision after reviewing the flight.');
    const prior = JSON.parse(JSON.stringify(latest.lastDebrief));
    expect(prior.reflection).toBe('Final evidence-based revision after reviewing the flight.');
    expect(latest.challengeReflections.first_flight).toBe(prior.reflection);
    await click('Retry challenge');
    expect(latest.lastDebrief.reflection).toBe(prior.reflection);
    await click('End challenge');
    expect(host.querySelector('#challenge-reflection').value).toBe('');
    expect(latest.lastDebrief.reflection).toBe('');
    expect(latest.flightPracticeHistory).toHaveLength(1);
    expect(latest.flightPracticeHistory[0].reflection).toBe(prior.reflection);
    expect(latest.flightPracticeHistory[0].attemptId).toBe(prior.attemptId);
    await change(host.querySelector('#challenge-reflection'), 'New attempt has its own explanation.');
    expect(latest.flightPracticeHistory[0].reflection).toBe(prior.reflection);
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(host.querySelector('#challenge-reflection').value).toBe('New attempt has its own explanation.');
    expect(journal().textContent).toContain(prior.reflection);
  });

  it('reopens the saved journal from the menu without changing the latest attempt', async () => {
    const savedFlight = flight({ reflection: 'Saved review' });
    await mount({ view: 'menu', lastDebrief: savedFlight, flightPracticeHistory: [flight({ attemptId: 'previous' })] });
    await click('Review flight journal');
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief).toEqual(savedFlight);
    expect(journal()).toBeTruthy();
  });

  it('keeps cumulative World Tour objectives out of per-session measurement deltas', async () => {
    const first = challenge('world_tour'); first.arrivals = ['kpwm'];
    const second = challenge('world_tour'); second.arrivals = ['kpwm', 'kjfk'];
    const current = flight({ challenge: second, startedAirborne: true });
    const prior = flight({ attemptId: 'tour-earlier', challenge: first, startedAirborne: true });
    const comparison = FS.flightPracticeComparison(current, prior);
    expect(comparison).toMatchObject({ comparable: true, reason: 'matching' });
    expect(comparison.deltas).not.toHaveProperty('objectives');
    expect(comparison.deltas).not.toHaveProperty('arrivals');
    await mount({ lastDebrief: current, flightPracticeHistory: [prior] });
    expect(journal().textContent).not.toMatch(/(?:improved|better) (?:score|performance)|grade:\s*\d|objectives [+-]\d/i);
  });

  it('labels earlier geography attempts with their recorded route', async () => {
    const sprint = flight({ activityId: 'geography_sprint', sprintRouteId: 'europe', startedAirborne: true });
    await mount({ flightPracticeHistory: [sprint] });
    expect(previousSelect().options[0].textContent).toContain('Geography sprint');
    expect(previousSelect().options[0].textContent).toContain('Europe Express');
  });
});

describe('SkySchool completed sprint journal lifecycle', () => {
  it('holds result evidence still, then saves a completed sprint through Escape to the menu', async () => {
    const previous = flight({ attemptId: 'previous-flight' });
    await mount({ view: 'menu', lastDebrief: previous, totalFlightTime: 5,
      railCollapsed: false, menuSections: { sprints: true }, flightPracticeHistory: [], debriefHistorySampleIndex: 24 });
    await launchSprint();
    await frame();
    hooks().getLogRef().current.airborneSeconds = 30;
    hooks().getSprintRef().current.timer = 0.001;
    canvasContext.fillText.mockClear();
    await frame();
    expect(hooks().getSprintRef().current).toMatchObject({ active: false, phase: 'result' });
    expect(hooks().pausedRef.current).toBe(true);
    expect(canvasContext.fillText.mock.calls.some(([text]) => String(text).includes('SPRINT COMPLETE'))).toBe(true);
    expect(canvasContext.fillText.mock.calls.some(([text]) => String(text).includes('PAUSED'))).toBe(false);
    await act(async () => vi.advanceTimersByTime(50));
    const announcement = document.getElementById('skyschool-a11y-live');
    expect(announcement.textContent).toBe('Space to replay  ·  Esc to save and return to menu');
    const time = hooks().timeRef.current;
    const { latitude, longitude, altitude, speed } = {
      latitude: hooks().flightRef.current.lat, longitude: hooks().flightRef.current.lon,
      altitude: hooks().flightRef.current.altitude, speed: hooks().flightRef.current.speed,
    };
    for (let index = 0; index < 3; index++) {
      await act(async () => vi.advanceTimersByTime(1000));
      await frame();
      expect(announcement.textContent).toBe('Space to replay  ·  Esc to save and return to menu');
    }
    expect(hooks().timeRef.current).toBe(time);
    expect(hooks().flightRef.current).toMatchObject({ lat: latitude, lon: longitude, altitude, speed });
    expect(hooks().getLogRef().current.airborneSeconds).toBe(30);
    await pressFrame('Escape');
    expect(latest.view).toBe('menu');
    expect(latest.lastDebrief).toMatchObject({ activityId: 'geography_sprint', sprintRouteId: 'americas', airborneSeconds: 30 });
    expect(latest.lastDebrief.samples.length).toBeGreaterThan(0);
    expect(latest.totalFlightTime).toBe(35);
    expect(latest.debriefHistorySampleIndex).toBe(0);
    expect(latest.flightPracticeHistory).toHaveLength(1);
    expect(latest.flightPracticeHistory[0].attemptId).toBe(previous.attemptId);
    expect(hooks().flyingRef.current).toBe(false);
    await click('Review flight journal');
    expect(latest.lastDebrief.activityId).toBe('geography_sprint');
  });

  it.each(['keyboard', 'button'])('archives each completed sprint before %s replays the same route', async method => {
    await mount({ view: 'menu', lastDebrief: null, totalFlightTime: 0,
      railCollapsed: false, menuSections: { sprints: true }, flightPracticeHistory: [] });
    await launchSprint('europe');
    await frame();
    hooks().getLogRef().current.airborneSeconds = 12;
    hooks().getSprintRef().current.timer = 0.001;
    await frame();
    expect(host.querySelector('button[aria-label="Resume flight"]')).toBeNull();
    expect(button('Replay geography sprint').hasAttribute('aria-pressed')).toBe(false);
    if (method === 'keyboard') await pressFrame(' ');
    else await click('Replay geography sprint');
    const firstAttempt = latest.lastDebrief;
    expect(firstAttempt).toMatchObject({ activityId: 'geography_sprint', sprintRouteId: 'europe', airborneSeconds: 12 });
    expect(latest.view).toBe('flying');
    expect(latest.totalFlightTime).toBe(12);
    expect(hooks().getSprintRef().current).toMatchObject({ active: true, phase: 'flying', route: { id: 'europe' } });
    expect(hooks().pausedRef.current).toBe(false);
    expect(hooks().timeRef.current).toBe(0);
    expect(hooks().getLogRef().current.airborneSeconds).toBe(0);
    await frame();
    hooks().getLogRef().current.airborneSeconds = 8;
    hooks().getSprintRef().current.timer = 0.001;
    await frame();
    await pressFrame('Escape');
    expect(latest.lastDebrief).toMatchObject({ activityId: 'geography_sprint', sprintRouteId: 'europe', airborneSeconds: 8 });
    expect(latest.lastDebrief.attemptId).not.toBe(firstAttempt.attemptId);
    expect(latest.totalFlightTime).toBe(20);
    expect(latest.flightPracticeHistory).toHaveLength(1);
    expect(latest.flightPracticeHistory[0]).toMatchObject({ attemptId: firstAttempt.attemptId, airborneSeconds: 12 });
  });

  it('saves a sprint through the flight deck exactly once even when exit is activated twice', async () => {
    await mount({ view: 'menu', lastDebrief: null, totalFlightTime: 0,
      railCollapsed: false, menuSections: { sprints: true }, flightPracticeHistory: [] });
    await launchSprint();
    hooks().getLogRef().current.airborneSeconds = 9;
    hooks().getSprintRef().current.timer = 0.001;
    await frame();
    const exit = button('✕ Exit');
    await act(async () => { exit.click(); exit.click(); });
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief).toMatchObject({ activityId: 'geography_sprint', sprintRouteId: 'americas', airborneSeconds: 9 });
    expect(latest.totalFlightTime).toBe(9);
    expect(latest.flightPracticeHistory).toHaveLength(0);
  });
});
