import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// WCAG 2.2.1 Timing Adjustable: the HyperJet Geography Sprint ran a route clock
// and skipped any stop the jet passed before an answer, and answers were blocked
// while paused. A "Timer" select (On / Relaxed (3x) / Off), before the sprint in
// the menu and during it in the sprint panel, persists as flightSim.sprintTimer.
// Off: no countdown, no time-up, the jet holds before each stop until answered.
// FLIGHTSIM_SPRINT_TIMER_SRC points at another copy (pre-fix copy must go red).

const FILE = process.env.FLIGHTSIM_SPRINT_TIMER_SRC || 'stem_lab/stem_tool_flightsim.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, host, root, latest, frameCallback, wallTime;
const hooks = () => window.__testHooks.flightSim;
const sprint = () => hooks().getSprintRef().current;

function loadFlightSim() {
  // The STEM loader fetches SkySchool's geography first (stemModuleDependencies).
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_data_skyschool_geo.js'), 'utf8'))();
  new Function(readFileSync(resolve(process.cwd(), FILE), 'utf8'))();
  return window.StemLab._registry.flightSim;
}
async function openMenu(extra = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: true, takeoffTutorialDismissed: true,
      landingTutorialDismissed: true, menuSections: { sprints: true }, ...extra } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function launch() {
  const route = window.__RR_TEST_EXPORTS__.flightSim.SPRINT_ROUTES[0];
  const button = [...host.querySelectorAll('#skyschool-sec-sprints button')].find(item => item.textContent.includes(route.name));
  expect(button).toBeTruthy();
  await act(async () => button.click());
  await frame();
}
async function frame(elapsed = 100) {
  wallTime += elapsed;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
}
async function choose(select, value) {
  await act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
}
function distNm(a, b) {
  const R = 3440.065, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Put the jet 20 nm north of stop 1, nose on it: the old code reached the 5 nm
// skip line in ~8 s of sim time.
function approachStop() {
  const target = sprint().places[sprint().placeIndex];
  Object.assign(hooks().flightRef.current, { lat: target.lat + 20 / 60, lon: target.lon, heading: 180 });
  return target;
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadFlightSim();
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool geography sprint timer is adjustable (WCAG 2.2.1)', () => {
  it('offers On / Relaxed / Off before the sprint and saves the choice', async () => {
    await openMenu();
    const select = host.querySelector('#skyschool-sec-sprints select');
    expect(select, 'no Timer select in the sprint menu').toBeTruthy();
    expect([...select.options].map(option => option.value)).toEqual(['on', 'relaxed', 'off']);
    expect(select.labels[0].textContent).toContain('Timer');
    await choose(select, 'off');
    expect(latest.sprintTimer).toBe('off');
  });

  it('Off: no countdown, no time-up, "No time limit", and the jet waits for an answer', async () => {
    await openMenu({ sprintTimer: 'off' }); await launch();
    const sp = sprint(), startTimer = sp.timer;
    expect(host.querySelector('[data-sprint-timer]').textContent).toBe('No time limit');
    const target = approachStop();
    for (let index = 0; index < 150; index++) await frame();
    expect(sp.timer).toBe(startTimer);
    expect(sp.active).toBe(true);
    expect(sp.phase).toBe('question');
    expect(sp.results).toHaveLength(0);
    expect(distNm(hooks().flightRef.current, target)).toBeGreaterThan(5);
    // Answer while paused, then the route continues.
    await act(async () => host.querySelector('[data-sprint-pause]').click());
    expect(hooks().pausedRef.current).toBe(true);
    const correct = sp.options.indexOf(sp.correctAnswer);
    await act(async () => host.querySelector('[data-sprint-answer="' + correct + '"]').click());
    expect(sp.results).toHaveLength(1);
    expect(sp.results[0].correct).toBe(true);
    await act(async () => host.querySelector('[data-sprint-pause]').click());
    for (let index = 0; index < 60 && sp.placeIndex === 1; index++) await frame();
    expect(sp.placeIndex).toBe(2);
  });

  it('Off: the route clock never ends the sprint however long it runs', async () => {
    await openMenu({ sprintTimer: 'off' }); await launch();
    const sp = sprint();
    sp.timer = 0.05;
    for (let index = 0; index < 5; index++) await frame();
    expect(sp.active).toBe(true);
    expect(sp.phase).not.toBe('result');
  });

  it('Relaxed: three times the route clock and a slower pass by each stop', async () => {
    await openMenu({ sprintTimer: 'relaxed' }); await launch();
    const sp = sprint(), base = (sp.places.length - 1) * 20;
    expect(sp.maxTime).toBe(base * 3);
    const target = approachStop();
    for (let index = 0; index < 120; index++) await frame();
    // 12 s of sim time: the standard pace would have skipped this stop.
    expect(sp.results).toHaveLength(0);
    expect(sp.phase).toBe('question');
    expect(distNm(hooks().flightRef.current, target)).toBeGreaterThan(5);
  });

  it('On keeps the original clock and skip', async () => {
    await openMenu(); await launch();
    const sp = sprint();
    expect(sp.maxTime).toBe((sp.places.length - 1) * 20);
    approachStop();
    for (let index = 0; index < 150 && sp.results.length === 0; index++) await frame();
    expect(sp.results[0]).toMatchObject({ answer: 'SKIPPED', correct: false });
    expect(sp.timer).toBeLessThan(sp.maxTime);
  });

  it('can be relaxed or turned off during a running sprint', async () => {
    await openMenu(); await launch();
    const sp = sprint();
    const live = host.querySelector('#skyschool-sprint-panel select');
    expect(live, 'no Timer select in the sprint panel').toBeTruthy();
    const before = sp.timer;
    await choose(live, 'relaxed');
    expect(sp.timer).toBeCloseTo(before * 3, 6);
    await choose(host.querySelector('#skyschool-sprint-panel select'), 'off');
    expect(latest.sprintTimer).toBe('off');
    const frozen = sp.timer;
    for (let index = 0; index < 10; index++) await frame();
    expect(sp.timer).toBe(frozen);
    expect(host.querySelector('[data-sprint-timer]').textContent).toBe('No time limit');
    await choose(host.querySelector('#skyschool-sprint-panel select'), 'on');
    expect(sp.timer).toBeCloseTo(frozen / 3, 6);
    await frame();
    expect(sp.timer).toBeLessThan(frozen / 3);
  });

  it('accepts an answer while paused without restarting the clock', async () => {
    await openMenu(); await launch();
    const sp = sprint();
    approachStop();
    for (let index = 0; index < 40 && sp.phase !== 'question'; index++) await frame();
    expect(sp.phase).toBe('question');
    await act(async () => host.querySelector('[data-sprint-pause]').click());
    const timer = sp.timer;
    const button = host.querySelector('[data-sprint-answer="0"]');
    expect(button.disabled).toBe(false);
    await act(async () => button.click());
    expect(sp.answered).toBe(true);
    await frame();
    expect(sp.timer).toBe(timer);
    expect(hooks().pausedRef.current).toBe(true);
  });
});
