import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const AU_KM = 1.496e8;
const MU_KM = 6.674e-11 * 1.989e30 / 1e9;
const PLANETS = [
  { id: 'mercury', name: 'Mercury', radius: 0.387, period: 0.241 },
  { id: 'venus', name: 'Venus', radius: 0.723, period: 0.615 },
  { id: 'earth', name: 'Earth', radius: 1, period: 1 },
  { id: 'mars', name: 'Mars', radius: 1.524, period: 1.881 },
  { id: 'jupiter', name: 'Jupiter', radius: 5.203, period: 11.86 },
  { id: 'saturn', name: 'Saturn', radius: 9.537, period: 29.46 },
  { id: 'uranus', name: 'Uranus', radius: 19.19, period: 84.01 },
  { id: 'neptune', name: 'Neptune', radius: 30.07, period: 164.8 },
];
const PLANET = Object.fromEntries(PLANETS.map((body) => [body.id, body]));

// These calculations are independent of the production Hohmann helper. The
// oracle uses the stated Sun model and units for speed, time and phase angle.
function speed(radius, axis) {
  return Math.sqrt(MU_KM * (2 / (radius * AU_KM) - 1 / (axis * AU_KM)));
}
function routeExpected(from, to) {
  const a = (from.radius + to.radius) / 2;
  const same = from.id === to.id;
  const circular1 = speed(from.radius, from.radius), transfer1 = speed(from.radius, a);
  const transfer2 = speed(to.radius, a), circular2 = speed(to.radius, to.radius);
  const departure = transfer1 - circular1, arrival = circular2 - transfer2;
  const seconds = same ? 0 : Math.PI * Math.sqrt((a * AU_KM) ** 3 / MU_KM);
  const destinationRate = Math.sqrt(MU_KM / (to.radius * AU_KM) ** 3);
  const rawPhase = Math.PI - destinationRate * seconds;
  return {
    same, a, circular1, transfer1, transfer2, circular2, departure, arrival,
    departureDv: Math.abs(departure), arrivalDv: Math.abs(arrival),
    total: Math.abs(departure) + Math.abs(arrival), days: seconds / 86400,
    phase: Math.atan2(Math.sin(rawPhase), Math.cos(rawPhase)) * 180 / Math.PI,
    synodic: same ? null : 1 / Math.abs(1 / from.period - 1 / to.period),
    ceiling: Math.ceil(Math.max(circular1, transfer1, transfer2, circular2) / 5) * 5,
  };
}

// Invoke the handlers rendered by the actual production native buttons.
// SSR owns saved-state and numeric contracts; browser tests own mounted
// TransferFlight refs, canvas animation, layout and focus after route changes.
function renderPlanner(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false,
    orreryMode: true, orr_tab: 5, orr_paused: true,
    missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (typeof type === 'string' && props &&
        ['onClick', 'onChange'].some((name) => typeof props[name] === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-transfer-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map();
      store.dirty = false;
      const ctx = makeCtx({ React: callbackReact }, store);
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => config.render(ctx)));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function section() { return document.getElementById('orrery-transfer-planner'); }
  function button(name) {
    return [...(section()?.querySelectorAll('button') || [])].find((control) =>
      (control.getAttribute('aria-label') || control.textContent).replace(/\s+/g, ' ').trim() === name);
  }
  function group(which) {
    return document.querySelector(`[role="group"][aria-label="Transfer ${which} planet"]`);
  }
  function planetButton(which, name) {
    return [...(group(which)?.querySelectorAll('button') || [])].find((control) =>
      (control.getAttribute('aria-label') || control.textContent).trim().endsWith(` ${name}`));
  }
  function click(control) {
    expect(control, 'The production transfer button must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled transfer button can be activated').toBe(false);
    const handler = callbacks.get(control.dataset.transferCallback)?.onClick;
    expect(handler).toBeTypeOf('function');
    handler({ target: control, currentTarget: control, preventDefault() {} });
    render();
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get section() { return section(); },
    get burn() { return document.getElementById('orrery-transfer-burn-inspection'); },
    button, group, planetButton, click,
    swap() {
      const control = [...section().querySelectorAll('button')].find((item) => /Swap/.test(item.textContent));
      click(control);
    },
  };
}

function rawMetric(selector, name) {
  const node = document.querySelector(selector);
  expect(node, `${name} must have a semantic reading`).not.toBeNull();
  const raw = node.getAttribute('data-value');
  expect(raw, `${name} must expose its unrounded numeric value`).not.toBeNull();
  expect(raw.trim()).not.toBe('');
  const value = Number(raw);
  expect(Number.isFinite(value), `${name} must be finite`).toBe(true);
  return value;
}
const metric = (name) => rawMetric(`#orrery-transfer-readings [data-transfer-metric="${name}"]`, name);
const burnMetric = (name) => rawMetric(`#orrery-transfer-burn-readings [data-transfer-burn-metric="${name}"]`, name);
function close(actual, expected) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(2e-8 * Math.max(1, Math.abs(expected)));
}
function expectRoute(from, to) {
  const expected = routeExpected(PLANET[from], PLANET[to]);
  for (const [name, value] of [
    ['departure-dv', expected.departureDv], ['arrival-dv', expected.arrivalDv],
    ['total-dv', expected.total], ['transit-days', expected.days], ['transfer-axis', expected.a],
    ['phase-angle', expected.phase], ['synodic', expected.synodic],
  ]) close(metric(name), value);
  close(metric('departure-dv') + metric('arrival-dv'), metric('total-dv'));
  return expected;
}
function pressedPlanet(env, which) {
  const selected = [...env.group(which).querySelectorAll('button[aria-pressed="true"]')];
  expect(selected).toHaveLength(1);
  return selected[0].textContent.trim();
}
function otherWork(state) {
  const { orr_trf, orr_trt, orr_trburn, ...rest } = state;
  return structuredClone(rest);
}
const RETAINED = {
  orr_chc: { 4: true }, orr_cha: { 2: '0.31' },
  orr_wsa: 17.8, orr_wse: 0.96, orr_wsphase: 0.2,
  missionLog: [{ id: 'retained-mission', question: 'Where should Mars start?' }],
  journalEntries: [{ id: 'retained-entry', text: 'Compare both launch alignments.' }],
  transferDebriefs: { 'earth-mars': { explanation: 'Retained explanation', custom: 17 } },
};

describe('Solar System transfer route and two-burn planner', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    })));
    // Focus after a budget route is a mounted-browser behavior. Avoid leaving
    // an asynchronous callback referencing a replaced SSR document here.
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('names the planner, eight-planet route groups and current burn inspection', () => {
    const env = renderPlanner();
    expect(env.section?.tagName).toBe('SECTION');
    expect(env.section.getAttribute('aria-labelledby')).toBe('orrery-transfer-title');
    expect(document.getElementById('orrery-transfer-title')?.textContent.trim()).toBeTruthy();
    for (const which of ['departure', 'arrival']) {
      const planetControls = [...env.group(which).querySelectorAll('button')].filter((control) =>
        PLANETS.some((body) => control.textContent.trim().endsWith(` ${body.name}`)));
      expect(planetControls).toHaveLength(8);
      expect(planetControls.every((control) => control.type === 'button')).toBe(true);
    }
    expect(pressedPlanet(env, 'departure')).toMatch(/Earth$/);
    expect(pressedPlanet(env, 'arrival')).toMatch(/Mars$/);
    expect(document.getElementById('orrery-transfer-readings')?.tagName).toBe('DL');
    expect(document.getElementById('orrery-transfer-burn-readings')?.tagName).toBe('DL');
    expect(env.burn.getAttribute('data-burn-stage')).toBe('departure');
    expect(env.button('Departure burn')?.getAttribute('aria-pressed')).toBe('true');
    expect(env.button('Arrival burn')?.getAttribute('aria-pressed')).toBe('false');
  });

  it.each([
    ['earth', 'mars'], ['mars', 'earth'], ['mercury', 'neptune'],
  ])('calculates %s to %s burn magnitudes, transit, alignment and synodic period', (from, to) => {
    renderPlanner({ orr_trf: from, orr_trt: to });
    expectRoute(from, to);
  });

  it.each([
    ['earth', 'mars'], ['mars', 'earth'],
  ])('inspects both %s to %s burns against one heliocentric speed ruler', (from, to) => {
    const env = renderPlanner({ ...RETAINED, orr_trf: from, orr_trt: to });
    const expected = expectRoute(from, to), retained = otherWork(env.state);
    for (const stage of ['departure', 'arrival']) {
      env.click(env.button(stage === 'departure' ? 'Departure burn' : 'Arrival burn'));
      const before = stage === 'departure' ? expected.circular1 : expected.transfer2;
      const after = stage === 'departure' ? expected.transfer1 : expected.circular2;
      const signed = stage === 'departure' ? expected.departure : expected.arrival;
      expect(env.state.orr_trburn).toBe(stage);
      expect(env.burn.getAttribute('data-burn-stage')).toBe(stage);
      expect(env.burn.getAttribute('data-burn-applicable')).toBe('true');
      close(Number(env.burn.getAttribute('data-max-speed')), expected.ceiling);
      close(burnMetric('before'), before);
      close(burnMetric('after'), after);
      close(burnMetric('delta-v'), signed);
      close(burnMetric('radius'), stage === 'departure' ? PLANET[from].radius : PLANET[to].radius);
      close(burnMetric('after') - burnMetric('before'), burnMetric('delta-v'));
      expect(Math.sign(burnMetric('delta-v'))).toBe(from === 'earth' ? 1 : -1);
      for (const [position, value] of [['before', before], ['after', after]]) {
        const bar = env.burn.querySelector(`[data-transfer-speed="${position}"]`);
        expect(bar).not.toBeNull();
        close(Number(bar.getAttribute('data-value')), value);
        close(parseFloat(bar.style.width), 100 * value / expected.ceiling);
      }
      expect(otherWork(env.state)).toEqual(retained);
    }
  });

  it('shows no transfer or undefined alignment period when the same planet is selected', () => {
    const env = renderPlanner({ orr_trf: 'earth', orr_trt: 'earth', orr_trburn: 'arrival' });
    for (const name of ['departure-dv', 'arrival-dv', 'total-dv', 'transit-days']) close(metric(name), 0);
    close(metric('transfer-axis'), 1);
    for (const name of ['phase-angle', 'synodic']) {
      const reading = document.querySelector(`#orrery-transfer-readings [data-transfer-metric="${name}"]`);
      expect(reading?.getAttribute('data-applicable')).toBe('false');
      expect(reading?.hasAttribute('data-value')).toBe(false);
    }
    expect(env.burn.getAttribute('data-burn-applicable')).toBe('false');
    expect(env.button('Departure burn')?.disabled).toBe(true);
    expect(env.button('Arrival burn')?.disabled).toBe(true);
    close(burnMetric('delta-v'), 0);
    close(burnMetric('before'), burnMetric('after'));
    expect(document.getElementById('orrery-transfer-progress')?.disabled).toBe(true);
    expect(env.section.textContent).not.toMatch(/\b(?:NaN|Infinity)\b/);
  });

  it.each([
    ['unknown', 'not-a-planet'], ['pluto', 'ceres'], [42, { id: 'mars' }], [[], null],
  ])('derives one coherent Earth to Mars fallback without rewriting saved IDs (%j / %j)', (from, to) => {
    const env = renderPlanner({ orr_trf: from, orr_trt: to });
    expect(pressedPlanet(env, 'departure')).toMatch(/Earth$/);
    expect(pressedPlanet(env, 'arrival')).toMatch(/Mars$/);
    expect(env.section.querySelector('[data-transfer-flight]')?.getAttribute('data-transfer-flight')).toBe('earth-mars');
    expectRoute('earth', 'mars');
    expect(env.state.orr_trf).toEqual(from);
    expect(env.state.orr_trt).toEqual(to);
  });

  it('uses a safe departure preview for a malformed restored burn stage without changing its save', () => {
    const invalid = { stage: 'arrival' };
    const env = renderPlanner({ orr_trburn: invalid });
    expect(env.burn.getAttribute('data-burn-stage')).toBe('departure');
    expect(env.button('Departure burn')?.getAttribute('aria-pressed')).toBe('true');
    expect(env.state.orr_trburn).toEqual(invalid);
    env.click(env.button('Arrival burn'));
    expect(env.state.orr_trburn).toBe('arrival');
    expect(env.burn.getAttribute('data-burn-stage')).toBe('arrival');
  });

  it('swaps the displayed fallback route rather than malformed saved IDs', () => {
    const env = renderPlanner({ ...RETAINED, orr_trf: 'unavailable', orr_trt: 'mars', orr_trburn: 'arrival' });
    const retained = otherWork(env.state);
    env.swap();
    expect(env.state.orr_trf).toBe('mars');
    expect(env.state.orr_trt).toBe('earth');
    expect(env.state.orr_trburn).toBe('arrival');
    expect(pressedPlanet(env, 'departure')).toMatch(/Mars$/);
    expect(pressedPlanet(env, 'arrival')).toMatch(/Earth$/);
    expectRoute('mars', 'earth');
    expect(otherWork(env.state)).toEqual(retained);
  });

  it('changes each native route picker without replacing the burn stage or other work', () => {
    const env = renderPlanner({ ...RETAINED, orr_trf: 'earth', orr_trt: 'mars', orr_trburn: 'arrival' });
    const retained = otherWork(env.state);
    env.click(env.planetButton('departure', 'Mercury'));
    expect(env.state.orr_trf).toBe('mercury');
    expect(env.state.orr_trt).toBe('mars');
    expectRoute('mercury', 'mars');
    env.click(env.planetButton('arrival', 'Neptune'));
    expect(env.state.orr_trf).toBe('mercury');
    expect(env.state.orr_trt).toBe('neptune');
    expectRoute('mercury', 'neptune');
    expect(env.state.orr_trburn).toBe('arrival');
    expect(otherWork(env.state)).toEqual(retained);
  });

  it('opens the Earth budget route in the same planner and preserves other work', () => {
    const env = renderPlanner({ ...RETAINED, orr_trf: 'mars', orr_trt: 'earth', orr_trburn: 'arrival' });
    const retained = otherWork(env.state);
    env.click(env.button('View Earth to Venus transfer'));
    expect(env.state.orr_trf).toBe('earth');
    expect(env.state.orr_trt).toBe('venus');
    expect(env.state.orr_trburn).toBe('arrival');
    expectRoute('earth', 'venus');
    expect(otherWork(env.state)).toEqual(retained);
    expect(env.button('View Earth to Venus transfer')?.getAttribute('aria-pressed')).toBe('true');
    expect(env.button('View Earth to Mars transfer')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('uses one absolute delta-v scale across all seven Earth destinations and both burns', () => {
    const env = renderPlanner({ orr_trf: 'earth', orr_trt: 'mars' });
    const destinations = PLANETS.filter((body) => body.id !== 'earth');
    const rows = [...env.section.querySelectorAll('[data-transfer-budget-route]')];
    expect(rows.map((row) => row.getAttribute('data-transfer-budget-route'))).toEqual(destinations.map((body) => body.id));
    const expected = destinations.map((body) => routeExpected(PLANET.earth, body));
    const ceiling = Math.ceil(Math.max(...expected.map((route) => route.total)) / 5) * 5;
    const scale = env.section.querySelector('[data-max-budget]');
    expect(scale).not.toBeNull();
    close(Number(scale.getAttribute('data-max-budget')), ceiling);
    rows.forEach((row, index) => {
      const route = expected[index];
      expect(row.tagName).toBe('BUTTON');
      expect(row.type).toBe('button');
      expect(row.getAttribute('aria-label')).toBe(`View Earth to ${destinations[index].name} transfer`);
      close(Number(row.getAttribute('data-total-dv')), route.total);
      const departure = row.querySelector('[data-budget-burn="departure"]');
      const arrival = row.querySelector('[data-budget-burn="arrival"]');
      expect(departure).not.toBeNull();
      expect(arrival).not.toBeNull();
      close(parseFloat(departure.style.width), 100 * route.departureDv / ceiling);
      close(parseFloat(arrival.style.width), 100 * route.arrivalDv / ceiling);
      close(parseFloat(departure.style.width) + parseFloat(arrival.style.width), 100 * route.total / ceiling);
    });
    // A short route occupies less ruler space; each row is not normalized
    // independently to 100%, which would erase the actual budget comparison.
    const venusWidth = [...rows[1].querySelectorAll('[data-budget-burn]')]
      .reduce((sum, segment) => sum + parseFloat(segment.style.width), 0);
    const neptuneWidth = [...rows[6].querySelectorAll('[data-budget-burn]')]
      .reduce((sum, segment) => sum + parseFloat(segment.style.width), 0);
    expect(venusWidth).toBeLessThan(neptuneWidth);
  });

  it('retains exact table units, caption and header relationships in a named scroll region', () => {
    const env = renderPlanner();
    const summary = [...env.section.querySelectorAll('summary')].find((node) => node.textContent.trim() === 'Exact transfer values');
    expect(summary?.parentElement.tagName).toBe('DETAILS');
    expect(summary.parentElement.hasAttribute('open')).toBe(false);
    const region = summary.parentElement.querySelector('[role="region"][aria-label="Earth transfer values"]');
    expect(region).not.toBeNull();
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('aria-describedby')).toBeTruthy();
    const table = region.querySelector('table');
    expect(table).not.toBeNull();
    expect(table.querySelector('caption')?.textContent).toContain('Δv Budget: Earth → All Planets (Hohmann)');
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent.trim())).toEqual([
      'Destination', 'Δv₁ (km/s)', 'Δv₂ (km/s)', 'Total Δv (km/s)', 'Transit time (days / yr)',
    ]);
    expect([...table.querySelectorAll('thead th')].every((cell) => cell.getAttribute('scope') === 'col')).toBe(true);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(7);
    expect([...table.querySelectorAll('tbody th')].every((cell) => cell.getAttribute('scope') === 'row')).toBe(true);
  });
});
