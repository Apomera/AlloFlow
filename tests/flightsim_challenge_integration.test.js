import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, host, root, latest, FS;
const hooks = () => window.__testHooks.flightSim;
const active = () => hooks().getFlightChallengeRef().current;
const missionIds = ['first_flight', 'cross_country', 'mountain_flying', 'energy_management', 'world_tour'];

async function mount(seed = {}) {
  if (root) await act(async () => { root.unmount(); });
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', menuSections: { challenges: true }, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({
      toolData: data,
      setToolData: updateData,
      update: (id, key, value) => updateData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
}

function button(text, scope = host) {
  const element = [...scope.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  expect(element, `Button: ${text}`).toBeTruthy();
  return element;
}
async function click(text, scope) { await act(async () => { button(text, scope).click(); }); }
async function clickContaining(text, scope = host) {
  const element = [...scope.querySelectorAll('button')].find(item => item.textContent.includes(text));
  expect(element, `Button containing: ${text}`).toBeTruthy();
  await act(async () => { element.click(); });
}
async function start(id, airportId) { await act(async () => { hooks().startFlightChallenge(id, airportId); }); }
async function evaluate(seconds = 1) { await act(async () => { hooks().evaluateFlightChallenge(seconds); }); }
async function setField(element, value) {
  expect(element).toBeTruthy();
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLSelectElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event(element.tagName === 'TEXTAREA' ? 'input' : 'change', { bubbles: true }));
  });
}
function airborne(patch = {}) {
  Object.assign(hooks().flightRef.current, {
    speed: 110 / 0.5924838, altitude: 3000, fieldElev: 77, onGround: false,
    vsi: 0, aoa: 8, stalling: false, lowAirspeed: false, ...patch,
  });
  Object.assign(hooks().controlsRef.current, { bank: 0, pitch: 8, throttle: 0.6 });
}
async function finishFirstFlight() {
  airborne();
  for (let second = 0; second < 30; second++) await evaluate();
  expect(active().objectives).toMatchObject({ climb: true, steady: true, landing: false });
  Object.assign(hooks().getLandingRef().current, { scored: true, touchdownFPM: 180 });
  Object.assign(hooks().flightRef.current, { onGround: true, altitude: 77, vsi: 0 });
  await evaluate();
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  // These tests exercise the production launch/evaluation/debrief actions.
  // Canvas animation is unnecessary for checking their state and DOM effects.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  root = null;
  if (host) host.remove();
  host = null;
  delete window.__testHooks;
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool measured flight challenges', () => {
  it.each(missionIds)('launches the %s menu card as a fresh trainer attempt with visible objectives', async id => {
    await mount({ aircraft: 'drone', rescue: { active: true }, survey: { active: true } });
    const name = FS.CHALLENGES.find(item => item.id === id).name;
    await clickContaining(name, host.querySelector('#skyschool-secbody-challenges'));
    expect(latest.view).toBe('flying');
    expect(latest.aircraft).toBe('cessna172');
    expect(latest.selectedChallenge).toBe(id);
    expect(latest.flightChallenge).toMatchObject({ id, status: 'active' });
    expect(active()).toMatchObject({ id, status: 'active', elapsedSeconds: 0, airborneSeconds: 0 });
    expect(Object.values(active().objectives).every(value => value === false)).toBe(true);
    const panel = host.querySelector('[aria-label="Flight challenge"]');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain(name);
    expect(panel.querySelectorAll('li').length).toBe(Object.keys(active().objectives).length);
    expect(latest.rescue).toBeNull();
    expect(latest.survey).toBeNull();
  });

  it('sets manageable and honest starting conditions for navigation, mountain, and energy practice', async () => {
    await mount();
    await start('cross_country');
    const jfk = FS.WAYPOINTS.find(item => item.id === 'kjfk');
    const nav = hooks().flightRef.current;
    expect(FS.haversineNm(nav.lat, nav.lon, jfk.lat, jfk.lon)).toBeCloseTo(10, 0);
    expect(nav).toMatchObject({ altitude: 3000, onGround: false });
    expect(nav.speed * 0.5924838).toBeCloseTo(110);
    await start('mountain_flying');
    const denver = FS.WAYPOINTS.find(item => item.id === 'kden');
    expect(hooks().flightRef.current).toMatchObject({ altitude: denver.alt, fieldElev: denver.alt, onGround: true, speed: 0 });
    await start('energy_management');
    expect(hooks().flightRef.current).toMatchObject({ altitude: 5000, onGround: false });
    expect(hooks().flightRef.current.speed * 0.5924838).toBeCloseTo(110);
  });

  it('ending a parked first flight persists an unfinished result without manufacturing evidence', async () => {
    await mount();
    await start('first_flight');
    for (let second = 0; second < 60; second++) await evaluate();
    expect(Object.values(active().objectives).every(value => value === false)).toBe(true);
    await click('End challenge');
    expect(latest.view).toBe('debrief');
    expect(latest.flightChallenge).toBeNull();
    expect(latest.selectedChallenge).toBeNull();
    expect(active()).toBeNull();
    expect(latest.lastDebrief.challenge).toMatchObject({ id: 'first_flight', status: 'active', airborneSeconds: 0 });
    expect(latest.challengeResults.first_flight).toEqual(latest.lastDebrief.challenge);
    expect(host.querySelector('[aria-label="Challenge result"]').textContent).toContain('0 of 3 objectives observed');
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved);
    expect(host.querySelector('[aria-label="Challenge result"]').textContent).toContain('0 of 3 objectives observed');
    expect(latest.lastDebrief.flightTime).toBe(0);
  });

  it('observes a full first-flight sequence, pauses at completion, and saves the actual evidence', async () => {
    await mount();
    await start('first_flight');
    await finishFirstFlight();
    expect(active()).toMatchObject({ status: 'complete', objectives: { climb: true, steady: true, landing: true } });
    expect(active().completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(hooks().pausedRef.current).toBe(true);
    await click('End challenge');
    expect(latest.challengeResults.first_flight.status).toBe('complete');
    expect(host.querySelector('[aria-label="Challenge result"]').textContent).toContain('All challenge objectives observed');
    const completed = JSON.parse(JSON.stringify(latest.challengeResults.first_flight));
    await click('Retry challenge');
    expect(latest.challengeResults.first_flight).toEqual(completed);
    expect(active()).toMatchObject({ status: 'active', elapsedSeconds: 0, airborneSeconds: 0, objectives: { climb: false, steady: false, landing: false } });
    expect(hooks().getLandingRef().current.scored).toBe(false);
    expect(hooks().pausedRef.current).toBe(false);
  });

  it('cannot accumulate objective time while paused or from one suspended animation frame', async () => {
    await mount();
    await start('first_flight');
    airborne();
    hooks().pausedRef.current = true;
    await evaluate(30);
    expect(active().elapsedSeconds).toBe(0);
    expect(active().objectives.steady).toBe(false);
    hooks().pausedRef.current = false;
    await evaluate(120);
    expect(active().streakSeconds).toBeLessThanOrEqual(1);
    expect(active().objectives.steady).toBe(false);
  });

  it('keeps reflection through lesson review, reopening the debrief, and a full remount', async () => {
    await mount();
    await start('first_flight');
    await click('End challenge');
    const label = 'Explain a decision from this flight (optional)';
    const explanation = 'I kept the aircraft level while checking my airspeed.';
    expect(host.querySelector('label[for="challenge-reflection"]').textContent).toBe(label);
    await setField(host.querySelector('#challenge-reflection'), explanation);
    expect(latest.challengeReflections.first_flight).toBe(explanation);
    await click('Review related lesson');
    expect(latest.view).toBe('lesson');
    await clickContaining('Menu');
    await click('Review flight journal');
    expect(latest.view).toBe('debrief');
    expect(host.querySelector('#challenge-reflection').value).toBe(explanation);
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(host.querySelector('#challenge-reflection').value).toBe(explanation);
  });

  it('preserves interrupted evidence on reload and returns to launch without pretending to restore the aircraft', async () => {
    await mount();
    await start('first_flight');
    airborne();
    await evaluate();
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved);
    expect(latest.view).toBe('menu');
    expect(latest.flightChallenge).toBeNull();
    expect(latest.selectedChallenge).toBeNull();
    expect(latest.challengeResults.first_flight).toMatchObject({ interrupted: true, objectives: { climb: true, steady: false, landing: false } });
    expect(active()).toBeNull();
  });

  it('free flight clears stale challenge, rescue, and survey tracking while retaining the saved result', async () => {
    await mount();
    await start('first_flight');
    await click('End challenge');
    const saved = JSON.parse(JSON.stringify(latest));
    await mount({ ...saved, view: 'menu', selectedChallenge: 'coastal_rescue', rescue: { active: true }, survey: { active: true } });
    await click('Free Flight');
    expect(latest.view).toBe('flying');
    expect(latest.flightChallenge).toBeNull();
    expect(latest.selectedChallenge).toBeNull();
    expect(latest.rescue).toBeNull();
    expect(latest.survey).toBeNull();
    expect(active()).toBeNull();
    expect(latest.challengeResults.first_flight).toEqual(saved.challengeResults.first_flight);
    expect(host.querySelector('[aria-label="Flight challenge"]')).toBeNull();
  });

  it('preserves rescue and drone mission identities when those specialized cards launch', async () => {
    await mount();
    await clickContaining('Coastal Rescue', host.querySelector('#skyschool-secbody-challenges'));
    expect(latest.selectedChallenge).toBe('coastal_rescue');
    expect(latest.aircraft).toBe('rescue_heli');
    expect(latest.rescue.active).toBe(true);
    expect(active()).toBeNull();
    await mount();
    await clickContaining('Drone Aerial Survey', host.querySelector('#skyschool-secbody-challenges'));
    expect(latest.droneBriefing).toBe(true);
    await clickContaining('I Understand');
    expect(latest.view).toBe('flying');
    expect(latest.selectedChallenge).toBe('drone_survey');
    expect(latest.aircraft).toBe('drone');
    expect(latest.survey.active).toBe(true);
    expect(active()).toBeNull();
  });

  it('requires new controlled tour arrivals and carries their unique evidence across repeated legs and reloads', async () => {
    const destinations = FS.WAYPOINTS.slice(0, 5);
    await mount({ visitedAirports: destinations.map(item => item.id) });
    await start('world_tour', destinations[0].id);
    expect(active().arrivals).toEqual([]);
    expect(Object.values(active().objectives).every(value => value === false)).toBe(true);

    async function landAt(wp) {
      airborne({ altitude: wp.alt + 300, fieldElev: wp.alt, lat: wp.lat, lon: wp.lon });
      for (let second = 0; second < 10; second++) await evaluate();
      Object.assign(hooks().getLandingRef().current, { scored: true, touchdownFPM: 180 });
      Object.assign(hooks().flightRef.current, { onGround: true, altitude: wp.alt, vsi: 0 });
      await evaluate();
    }
    await landAt(destinations[0]);
    expect(active().arrivals).toEqual([destinations[0].id]);
    await click('End challenge');
    expect(latest.challengeResults.world_tour.arrivals).toEqual([destinations[0].id]);

    // Repeating the same airport is allowed for practice but earns no extra
    // distinct-airport objective. The next approach starts with fresh evidence.
    await setField(host.querySelector('#challenge-next-airport'), destinations[0].id);
    await click('Continue airport tour');
    expect(active()).toMatchObject({ arrivals: [destinations[0].id], airborneSeconds: 0 });
    expect(hooks().getLandingRef().current.scored).toBe(false);
    await landAt(destinations[0]);
    expect(active().arrivals).toEqual([destinations[0].id]);
    await click('End challenge');
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(host.querySelector('[aria-label="Challenge result"]').textContent).toContain('1 of 5 objectives observed');

    for (const wp of destinations.slice(1)) {
      await setField(host.querySelector('#challenge-next-airport'), wp.id);
      await click('Continue airport tour');
      expect(hooks().getLandingRef().current.scored).toBe(false);
      await landAt(wp);
      await click('End challenge');
    }
    expect(latest.challengeResults.world_tour).toMatchObject({ status: 'complete', arrivals: destinations.map(item => item.id) });
    expect(host.querySelector('[aria-label="Challenge result"]').textContent).toContain('All challenge objectives observed');
    await click('Start a new airport tour');
    expect(active()).toMatchObject({ status: 'active', arrivals: [], elapsedSeconds: 0, airborneSeconds: 0 });
    expect(latest.challengeResults.world_tour.status).toBe('complete');
  });
});
