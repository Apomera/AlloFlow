import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 20000 });
let FS, tool, host, root, latest, updateSaved, frameCallback, wallTime, touch, errors;
const hooks = () => window.__testHooks.flightSim;
const discovery = () => host.querySelector('[data-flight-next-discovery]');
const cue = () => host.querySelector('[data-flight-challenge-cue]');
const live = () => document.getElementById('skyschool-a11y-live');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  wallTime = 1000; touch = false;
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', query => ({ matches: touch && query.includes('pointer: coarse'), media: query,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null; frameCallback = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, geoDiscovered: { Portland: true }, ...seed } });
    latest = data.flightSim;
    updateSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function patch(values) { await act(async () => updateSaved(values)); }
async function frame() {
  wallTime += 100;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => { frameCallback(); vi.advanceTimersByTime(100); });
  expect(errors).not.toHaveBeenCalled();
}
async function freeFlight() {
  await mount();
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  await frame();
}
async function requestInfo() {
  hooks().keysRef.current.i = true;
  await frame();
  return live().textContent;
}

describe('readable next-discovery guidance', () => {
  it('exposes the current name, bearing and distance without unsolicited live announcements', async () => {
    await freeFlight();
    const destination = FS.getNextFlightDiscovery(hooks().flightRef.current, { Portland: true });
    expect(discovery().hidden).toBe(false);
    expect(discovery().textContent).toContain(destination.place.name);
    expect(discovery().textContent).toContain(`Bearing ${Math.round(destination.bearingDeg) % 360} degrees`);
    expect(discovery().textContent).toContain(`${destination.distanceNm.toFixed(destination.distanceNm < 10 ? 1 : 0)} nautical miles`);
    expect(discovery().getAttribute('aria-live')).toBe('off');
    expect(host.querySelector('canvas[role="application"]').getAttribute('aria-describedby')).toBe(discovery().id);
    expect(live().textContent).not.toContain('Next discovery:');

    const before = discovery().textContent;
    hooks().flightRef.current.lat += 0.05;
    await frame();
    expect(discovery().textContent).not.toBe(before);
    expect(live().textContent).not.toContain('Next discovery:');
    // Requesting status while paused must use the current target as well.
    hooks().pausedRef.current = true;
    await frame();
    const info = await requestInfo();
    expect(info).toContain(discovery().textContent);
    expect(info).toContain('Altitude');
  });

  it('removes discovery text and spoken directions when routes, missions or challenges take priority', async () => {
    await freeFlight();
    hooks().pausedRef.current = true;
    await frame();
    for (const mission of ['rescue', 'survey']) {
      await patch({ [mission]: { active: true } });
      expect(discovery().hidden).toBe(true);
      expect(discovery().textContent).toBe('');
      expect(await requestInfo()).not.toContain('Next discovery:');
      await patch({ [mission]: null });
      expect(discovery().hidden).toBe(false);
    }
    hooks().getFlightPlanRef().current.destination = FS.WAYPOINTS.find(w => w.id === 'kjfk');
    await patch({ flightDetails: true });
    expect(discovery().hidden).toBe(true);
    expect(await requestInfo()).not.toContain('Next discovery:');
    await act(async () => hooks().startFlightChallenge('first_flight'));
    expect(discovery().hidden).toBe(true);
    hooks().pausedRef.current = true;
    await frame();
    expect(await requestInfo()).not.toContain('Next discovery:');
  });
});

describe('visible first-flight coaching', () => {
  it.each([false, true])('adapts the visible takeoff, climb and landing cues to touch=%s', async usesTouch => {
    touch = usesTouch;
    await mount();
    await act(async () => hooks().startFlightChallenge('first_flight'));
    expect(cue()).toBeTruthy();
    expect(cue().closest('details')).toBeNull();
    expect(cue().textContent).toContain(usesTouch ? 'Drag UP along the right edge' : 'Hold SHIFT');
    expect(host.querySelector('[aria-label="Flight challenge"] details').open).toBe(false);
    if (usesTouch) expect(host.querySelector('[aria-label="Flight challenge"]').textContent).not.toContain('W/S');

    Object.assign(hooks().flightRef.current, { onGround: false, altitude: 1200, vsi: 5, speed: 140, stalling: false });
    await patch({ flightDetails: true });
    expect(cue().textContent).toContain('3,000 ft MSL');
    expect(cue().textContent).toContain(usesTouch ? 'far right edge' : 'W/S');
    Object.assign(hooks().getFlightChallengeRef().current.objectives, { climb: true, steady: true });
    await patch({ flightDetails: false });
    expect(cue().textContent).toContain('Return toward a runway');
    expect(cue().textContent).toContain('kts IAS');
    expect(cue().closest('details')).toBeNull();

    hooks().flightRef.current.stalling = true;
    await patch({ flightDetails: true });
    expect(cue().textContent).toContain('STALL');
    expect(cue().textContent).not.toContain('Return toward a runway');
  });
});

describe('challenge destination guidance', () => {
  it('keeps visible, spoken and canvas navigation on the required airport', async () => {
    await mount();
    await act(async () => hooks().startFlightChallenge('cross_country'));
    // The initial 100-knot milestone must not replace explicitly requested info.
    const requestedInfo = await requestInfo();
    expect(requestedInfo).toContain('Current approach: JFK');
    Object.assign(hooks().flightRef.current, { lat: 43.646, lon: -70.309, heading: 20, onGround: false });
    hooks().pausedRef.current = true;
    await frame();
    await patch({ flightDetails: true });
    const route = host.querySelector('[data-flight-challenge-route]');
    expect(route).toBeTruthy();
    expect(route.closest('details')).toBeNull();
    expect(route.getAttribute('aria-live')).toBe('off');
    expect(route.textContent).toContain('JFK');
    expect(route.textContent).toMatch(/Turn (left|right)/);
    expect(live().textContent).toBe(requestedInfo);
    const info = await requestInfo();
    expect(info).toContain('Current approach: JFK');
    expect(info).toMatch(/Turn (left|right)/);
    expect(info).not.toContain('Next discovery:');
    expect(hooks().getNavigation().distanceNm).toBeGreaterThan(100);
    expect(hooks().getFlightPlanRef().current.destination).toBeNull();
  });

  it('offers continuation after a credited tour leg without routing back to it', async () => {
    await mount();
    await act(async () => hooks().startFlightChallenge('world_tour', 'kpwm'));
    expect(host.querySelector('[data-flight-challenge-route]').textContent).toContain('PWM');
    hooks().getFlightChallengeRef().current.arrivals = ['kpwm'];
    hooks().getFlightChallengeRef().current.legArrivalId = 'kpwm';
    await patch({ flightDetails: true });
    expect(host.querySelector('[data-flight-challenge-route]')).toBeNull();
    expect(cue()).toBeNull();
    const continueTour = host.querySelector('[data-flight-continue-tour]');
    expect(continueTour.closest('details')).toBeNull();
    await act(async () => continueTour.click());
    expect(latest.view).toBe('debrief');
    expect(latest.challengeResults.world_tour.arrivals).toEqual(['kpwm']);
    expect(host.querySelector('#challenge-next-airport').value).not.toBe('kpwm');
  });
});

describe('debrief reading order', () => {
  it('leads with the outcome and coaching, preserves reflection, and has one retry action', async () => {
    await mount({ view: 'debrief', lastDebrief: { flightTime: 120, distance: 8, maxAlt: 3000,
      airborneSeconds: 120, bestStableSeconds: 30, peakAGL: 2900, stallSeconds: 0, lowAirspeedSeconds: 0,
      bestLanding: null, reflection: 'I reduced pitch to hold altitude.',
      challenge: { version: 1, id: 'first_flight', status: 'active', objectives: { climb: true, steady: true, landing: false } } } });
    const header = host.querySelector('[aria-labelledby="skyschool-debrief-title"]');
    const coaching = host.querySelector('[aria-label="Next flight coaching tip"]');
    const result = host.querySelector('[aria-label="Challenge result"]');
    expect(header.querySelector('[data-flight-debrief-headline]').textContent).toContain('You flew 8 nm');
    expect(header.compareDocumentPosition(coaching) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(coaching.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(coaching.textContent).toContain('checklist below');
    expect(host.querySelector('#challenge-reflection').value).toBe('I reduced pitch to hold altitude.');
    expect([...host.querySelectorAll('button')].filter(b => /Retry challenge|Try the challenge again/.test(b.textContent))).toHaveLength(1);
    await act(async () => button('Try the challenge again').click());
    expect(latest.view).toBe('flying');
    expect(latest.flightChallenge.id).toBe('first_flight');
  });
});
