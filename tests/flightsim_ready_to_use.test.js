// Ready-to-use fixes from the 2026-11-09 review that are not about flying itself:
// what leaves the device, what a student is told before flying, how the view copes
// on a short screen or without 3D, and facts that were stated more firmly than they
// are known.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const SOURCE = process.env.SKYSCHOOL_READY_SOURCE || 'stem_lab/stem_tool_flightsim.js';
let tool, api, host, root, latest;
async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData((previous) => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool(SOURCE, 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); delete window.__RR_TEST_EXPORTS__; });

describe('online city search is opt-in', () => {
  it('counts as on only after the person has turned it on', () => {
    expect(api.isFlightCityOnline({})).toBe(false);
    expect(api.isFlightCityOnline({ cityOnline: undefined })).toBe(false);
    expect(api.isFlightCityOnline({ cityOnline: false })).toBe(false);
    expect(api.isFlightCityOnline({ cityOnline: 'true' })).toBe(false);
    expect(api.isFlightCityOnline({ cityOnline: true })).toBe(true);
    expect(api.isFlightCityOnline(null)).toBe(false);
  });

  it('no code path treats "never chosen" as on', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).not.toMatch(/cityOnline\s*!==\s*false/);
    expect(source).not.toMatch(/cityOnline\s*!=\s*false/);
  });

  it('starts unticked on the menu and says in plain words what is sent, and to whom', async () => {
    await mount({ menuSections: { city: true, cities: true, planner: true } });
    const note = host.querySelector('[data-flight-city-online-note]');
    if (!note) {
      // The city planner sits in a collapsed section: open every closed section first.
      for (const control of [...host.querySelectorAll('[aria-expanded="false"]')]) await act(async () => { control.click(); });
    }
    const shown = host.querySelector('[data-flight-city-online-note]');
    expect(shown, 'the city planner note is not on the menu').toBeTruthy();
    expect(shown.textContent).toMatch(/Off unless you turn it on/);
    expect(shown.textContent).toMatch(/photon\.komoot\.io/);
    expect(shown.textContent).toMatch(/tiles\.openfreemap\.org/);
    expect(shown.textContent).toMatch(/No account and no device location/);
    const box = host.querySelector('input[aria-describedby="skyschool-city-online-note"]');
    expect(box.checked).toBe(false);
    await act(async () => { box.click(); });
    expect(latest.cityOnline).toBe(true);
  });
});

describe('what a student is told before flying', () => {
  it('the menu says this is a learning simulator, not flight training', async () => {
    await mount();
    const line = host.querySelector('[data-flight-not-training="menu"]');
    expect(line.textContent).toMatch(/not flight training/);
    expect(line.textContent).toMatch(/not permission to fly an aircraft or drone/);
  });
});

describe('graphics quality can be chosen by hand', () => {
  it('low forces the lightest tier, high the fullest, automatic follows the governor', () => {
    expect(api.resolveQualityTier(0, 'low')).toBe(2);
    expect(api.resolveQualityTier(2, 'high')).toBe(0);
    expect(api.resolveQualityTier(1, 'auto')).toBe(1);
    expect(api.resolveQualityTier(1, undefined)).toBe(1);
    expect(api.resolveQualityTier(7, 'auto')).toBe(2);
    expect(api.resolveQualityTier(NaN, 'auto')).toBe(0);
  });
});

describe('short screens and the 2D fallback', () => {
  const source = fs.readFileSync(SOURCE, 'utf8');
  it('collapses the coach to a strip on a short viewport, hiding the step list and walkthrough', () => {
    const rule = /@media\(max-height:480px\)\{([^@]*)\}/.exec(source);
    expect(rule, 'no short-viewport rule').toBeTruthy();
    expect(rule[1]).toMatch(/\.skyschool-tutorial-card\{[^}]*overflow:hidden!important/);
    expect(rule[1]).toMatch(/\[data-first-flight-guide\][^{]*\{display:none!important\}|\[data-first-flight-guide\],/);
    expect(rule[1]).toMatch(/details[^{]*\{display:none!important\}|details,/);
    expect(rule[1]).toMatch(/-webkit-line-clamp:2/);
  });
  it('announces simplified graphics with a way to retry, instead of failing silently', () => {
    expect(source).toMatch(/data-flight-simple-graphics/);
    expect(source).toMatch(/data-flight-retry-3d/);
    expect(source).toMatch(/Simplified graphics: the 3D view could not start on this device/);
    // A loader that throws synchronously is caught, not left to crash the tool.
    expect(source).toMatch(/try \{ loading = ensure\(\{ orbit: false \}\); \} catch \(err\) \{ loading = Promise\.reject\(err\); \}/);
  });
});

describe('facts stated only as firmly as they are known', () => {
  const facts = () => api.GEO_PLACES.map((place) => place.fact).join('\n');
  it('drops the claims the review could not stand behind', () => {
    const text = facts();
    expect(text).not.toMatch(/only US state that grows coffee/);
    expect(text).not.toMatch(/over 6,800 islands/);
    expect(text).not.toMatch(/most restaurants per capita/);
    expect(text).not.toMatch(/exactly 555 ft/);
    expect(text).not.toMatch(/one of only 3 glaciers/);
  });
  it('does not give the United Kingdom an EU flag', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    const flags = /var regionFlags = \{([^}]*)\}/.exec(source)[1];
    const europe = /'Europe': '([^']*)'/.exec(flags)[1];
    const africa = /'Africa': '([^']*)'/.exec(flags)[1];
    expect(europe).toBe(africa); // the Europe-Africa globe, as the other continents use globes
    expect(europe).not.toMatch(/DDEA/); // regional-indicator E + U
  });
});
