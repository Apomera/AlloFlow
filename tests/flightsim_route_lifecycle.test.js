import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, api, host, root, latest, updateSaved;
const hooks = () => window.__testHooks.flightSim;
const plan = () => hooks().getFlightPlanRef().current;
const button = (text, scope = host) => [...scope.querySelectorAll('button')].find(item => item.textContent.trim() === text);
async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => { element.focus(); element.click(); });
}
async function select(element, value) {
  expect(element).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function mount(seed = {}, t) {
  function App() {
    const [data, setData] = React.useState({ flightSim: {
      view: 'menu', aircraft: 'cessna172', railCollapsed: false, cityOnline: false,
      menuSections: { plan: true, airports: true, lessons: true, challenges: true },
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, ...seed,
    } });
    latest = data.flightSim;
    updateSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}),
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function fileRoute(section = 'briefing') {
  await click(section === 'briefing'
    ? host.querySelector('button[aria-label="File Route: file the flight plan and depart"]')
    : button('🗺️ File Flight Plan & Depart'));
  expect(latest.view).toBe('flying');
}
async function endFlight(menu = true) {
  await click(button('✕ Exit'));
  expect(latest.view).toBe('debrief');
  if (menu) {
    await click(button('🏠 Back to Menu'));
    expect(latest.view).toBe('menu');
  }
}
async function cityFlight(near) {
  const details = host.querySelector('[data-flightsim-city-planner]');
  await click(details.querySelector('summary'));
  await click(button(near ? 'Fly near city' : 'Depart toward city', details));
  expect(latest.view).toBe('flying');
}
function noOldRoute() {
  expect(plan()).toMatchObject({ departure: null, destination: null, route: [] });
  expect(hooks().getNavigation()).toBeNull();
  const discovery = host.querySelector('[data-flight-next-discovery]');
  expect(discovery).toBeTruthy();
  expect(discovery.hidden).toBe(false);
  expect(discovery.textContent).toContain('Next discovery:');
}
const london = { name: 'London', lat: 51.5, lon: -.12 };

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  window.SkySchoolCityServices = { enabled: false };
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__; delete window.SkySchoolCityServices;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool flight plan ownership across departures', () => {
  it.each(['briefing', 'planner'])('keeps the newly filed airport route from the %s launch', async section => {
    await mount({ planDep: 'kden', planDest: 'ksfo' }); await fileRoute(section);
    expect(plan()).toMatchObject({ departure: { id: 'kden' }, destination: { id: 'ksfo' }, cruiseAltitudeDatum: 'msl' });
    expect(plan().route.map(item => item.id)).toEqual(['kden', 'ksfo']);
    expect(plan().distNm).toBeGreaterThan(500);
    expect(host.querySelector('[data-flight-next-discovery]').hidden).toBe(true);
    const airport = api.WAYPOINTS.find(item => item.id === 'kden');
    expect(hooks().flightRef.current.altitude).toBe(airport.alt);
    expect(hooks().flightRef.current.onGround).toBe(true);
  });

  it.each(['airport', 'city'])('starts an airport-card flight with fresh discovery after an earlier %s plan', async oldRoute => {
    await mount({ cityDestination: london });
    if (oldRoute === 'airport') await fileRoute(); else await cityFlight(true);
    expect(plan().destination).toBeTruthy(); await endFlight();
    await click(host.querySelector('#skyschool-sec-airports button[aria-label^="DEN,"]'));
    expect(latest.view).toBe('flying');
    expect(hooks().flightRef.current.altitude).toBe(5431);
    noOldRoute();
  });

  it('does not carry an old filed plan into lesson free-flight practice', async () => {
    await mount(); await fileRoute(); await endFlight();
    await click(button('🧭 Navigation', host.querySelector('#skyschool-sec-lessons')) || [...host.querySelectorAll('#skyschool-sec-lessons button')].find(item => item.textContent.includes('How Pilots Navigate')));
    expect(latest.view).toBe('lesson'); await click(button('✈️ Try It — Free Flight'));
    noOldRoute();
  });

  it('treats Fly Again as a fresh Portland departure rather than silently retaining a previous destination', async () => {
    await mount({ planDep: 'kden', planDest: 'ksfo' }); await fileRoute(); await endFlight(false);
    await click(button('🛫 Fly Again'));
    expect(hooks().flightRef.current.altitude).toBe(76); noOldRoute();
  });

  it('does not carry an old route into the onboarding landing-practice departure', async () => {
    await mount({ completedLessons: { lift: true }, challengeCompleted: { first_flight: true } });
    await fileRoute(); await endFlight();
    await click(host.querySelector('[data-flight-start-step="landing"] button'));
    expect(latest.view).toBe('flying'); noOldRoute();
  });

  it.each([true, false])('replaces a previous airport route with the explicitly chosen city route (near=%s)', async near => {
    await mount({ cityDestination: london, planDep: 'kden', planDest: 'ksfo' });
    await fileRoute(); const old = plan(); await endFlight(); await cityFlight(near);
    expect(plan()).not.toBe(old);
    expect(plan().destination).toMatchObject({ name: 'London', code: 'CITY', isCity: true });
    expect(plan().departure.code).toBe(near ? 'START' : 'DEN');
    expect(plan().cruiseAltitudeDatum).toBe('msl');
    expect(hooks().flightRef.current.onGround).toBe(!near);
  });

  it('replaces the earlier plan with changed airport selections', async () => {
    await mount(); await fileRoute(); const old = plan(); await endFlight();
    await select(host.querySelector('#skyschool-route-from'), 'egll');
    await select(host.querySelector('#skyschool-route-to'), 'rjtt');
    await fileRoute('planner');
    expect(plan()).not.toBe(old); expect(plan().route.map(item => item.id)).toEqual(['egll', 'rjtt']);
  });

  it('clears the previous route for a rescue mission even before the first animation frame', async () => {
    await mount(); await fileRoute(); await endFlight();
    await click([...host.querySelectorAll('#skyschool-sec-challenges button')].find(item => item.textContent.includes('Coastal Rescue')));
    expect(latest.view).toBe('flying'); expect(latest.rescue.active).toBe(true);
    expect(plan()).toMatchObject({ departure: null, destination: null, route: [] });
  });

  it.each(['airport', 'city'])('still gives an unpowered glider its aerotow release with an explicit %s plan', async kind => {
    await mount({ aircraft: 'glider', cityDestination: london });
    if (kind === 'airport') await fileRoute(); else await cityFlight(false);
    expect(plan().destination).toBeTruthy();
    expect(hooks().flightRef.current.onGround).toBe(false);
    expect(hooks().flightRef.current.altitude).toBe(3076);
    expect(hooks().flightRef.current.speed * .5924838).toBeCloseTo(55, 6);
    expect(hooks().controlsRef.current.throttle).toBe(0);
  });

  it.each(['same', 'invalid-departure', 'invalid-destination'])('keeps File Route unavailable for %s airports, then clears the old plan on the next proper free departure', async invalid => {
    await mount(); await fileRoute(); await endFlight();
    const old = plan();
    if (invalid === 'same') {
      await select(host.querySelector('#skyschool-route-from'), 'kden');
      await select(host.querySelector('#skyschool-route-to'), 'kden');
    } else await act(async () => updateSaved(invalid === 'invalid-departure' ? { planDep: 'missing-airport' } : { planDest: 'missing-airport' }));
    const launch = host.querySelector('button[aria-label="File Route: file the flight plan and depart"]');
    expect(launch.disabled).toBe(true); await click(launch);
    expect(latest.view).toBe('menu'); expect(hooks().flyingRef.current).toBe(false);
    expect(plan()).toBe(old);
    await click(host.querySelector('#skyschool-sec-airports button[aria-label^="DEN,"]'));
    expect(latest.view).toBe('flying'); noOldRoute();
  });
});

describe('SkySchool planner altitude datum', () => {
  it('briefs a drone cruise height above DEN terrain and records its AGL meaning', async () => {
    await mount({ aircraft: 'drone', planDep: 'kden', planDest: 'kpwm' });
    const planner = host.querySelector('#skyschool-sec-plan');
    expect(planner.textContent).toContain('Depart DEN (Mountain West, 5431 ft)');
    expect(planner.textContent).toContain('Cruise at 400 ft AGL.');
    await fileRoute();
    expect(hooks().flightRef.current.altitude).toBe(5431);
    expect(plan()).toMatchObject({ cruiseAlt: 400, cruiseAltitudeDatum: 'agl' });
  });

  it('uses the translated AGL format in both the stat and briefing', async () => {
    await mount({ aircraft: 'drone', planDep: 'kden' }, (key, fallback) => key === 'stem.flightsim.planner_drone_agl' ? '{ft} translated-above-ground' : fallback);
    expect(host.querySelector('#skyschool-sec-plan').textContent.match(/400 translated-above-ground/g)).toHaveLength(2);
  });

  it.each([true, false])('keeps drone city pose altitude MSL distinct from a ground route AGL target (near=%s)', async near => {
    await mount({ aircraft: 'drone', cityDestination: { name: 'Denver', lat: 39.74, lon: -104.99 }, planDep: 'kden' });
    await cityFlight(near);
    expect(plan().cruiseAltitudeDatum).toBe(near ? 'msl' : 'agl');
    if (near) {
      expect(plan().cruiseAlt).toBe(hooks().flightRef.current.altitude);
      expect(plan().cruiseAlt).toBeGreaterThan(4000);
    } else expect(plan().cruiseAlt).toBe(400);
  });
});
