import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const WORLD_IDS = [
  'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
  'pluto', 'ceres', 'haumea', 'eris', 'halley', 'encke',
];
const METRICS = ['a', 'period', 'predicted-period', 'period-squared', 'axis-cubed', 'ratio'];
// Independent fixtures from the tool's published, rounded orbital data.
const WORLDS = [
  { id: 'mercury', name: 'Mercury', a: 0.387, period: 0.241 },
  { id: 'earth', name: 'Earth', a: 1, period: 1 },
  { id: 'jupiter', name: 'Jupiter', a: 5.203, period: 11.86 },
  { id: 'pluto', name: 'Pluto', a: 39.48, period: 247.9 },
  { id: 'halley', name: 'Halley’s Comet', a: 17.83, period: 75.3 },
];

// Capture handlers from actual React elements, then invoke the production
// callbacks using the existing SSR store without mounting animation effects.
function renderInspection(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true,
    solarMissionDashboardOpen: false,
    orreryMode: true,
    orr_tab: 3,
    orr_paused: true,
    missionLog: [],
    journalEntries: [],
    ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (typeof type === 'string' && props &&
        (typeof props.onClick === 'function' || typeof props.onChange === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-k3-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map();
      store.dirty = false;
      const ctx = makeCtx({ ...overrides, React: callbackReact }, store);
      markup = ReactDOMServer.renderToStaticMarkup(
        React.createElement(() => config.render(ctx)),
      );
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function button(name) {
    return [...document.querySelectorAll('#orrery-k3-inspection button')].find((control) => {
      const label = (control.getAttribute('aria-label') || control.textContent).replace(/\s+/g, ' ').trim();
      return label === name;
    });
  }
  function invoke(control, eventName, value) {
    expect(control, 'The production Kepler III control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled control can be activated').toBe(false);
    const handler = callbacks.get(control.dataset.k3Callback)?.[eventName];
    expect(handler, 'The rendered control must have its production callback').toBeTypeOf('function');
    handler({ target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} });
    render();
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get inspection() { return document.getElementById('orrery-k3-inspection'); },
    get picker() { return document.getElementById('orrery-k3-world-picker'); },
    button,
    click(control) { invoke(control, 'onClick'); },
    select(value) { invoke(document.getElementById('orrery-k3-world-picker'), 'onChange', value); },
  };
}

function metric(name) {
  const node = document.querySelector(`#orrery-k3-inspection dd[data-k3-metric="${name}"]`);
  expect(node, `The selected world's ${name} must have a semantic numeric readout`).not.toBeNull();
  const raw = node.getAttribute('data-value');
  expect(raw, `${name} must expose its unrounded numeric value`).not.toBeNull();
  expect(raw.trim(), `${name} must not be an empty value`).not.toBe('');
  const value = Number(raw);
  expect(Number.isFinite(value), `${name} must be finite`).toBe(true);
  return value;
}

function finiteReadouts() {
  return [...document.querySelectorAll('#orrery-k3-inspection dd[data-k3-metric]')].filter((node) => {
    const raw = node.getAttribute('data-value');
    return raw !== null && raw.trim() !== '' && Number.isFinite(Number(raw));
  });
}

function selectedRows() {
  return [...document.querySelectorAll('#orrery-k3-verification-table tr[data-selected="true"]')]
    .map((row) => row.dataset.k3World);
}

function expectSelected(env, world) {
  expect(env.state.orr_k3hover).toBe(world.id);
  expect(env.picker.value).toBe(world.id);
  expect(selectedRows()).toEqual([world.id]);
  const row = document.querySelector(`#orrery-k3-verification-table tr[data-k3-world="${world.id}"]`);
  expect(row).not.toBeNull();
  expect(env.button(`Inspect ${world.name}`)?.getAttribute('aria-pressed')).toBe('true');
  expect(document.getElementById('orrery-k3-selected')?.textContent).toContain(`Selected ${world.name}:`);
}

function expectEmpty(env) {
  expect(env.picker.value).toBe('');
  expect(selectedRows()).toEqual([]);
  expect(finiteReadouts()).toHaveLength(0);
  expect(document.getElementById('orrery-k3-selected')?.textContent).toContain('Select a plotted world');
  expect(env.button('Clear selected world')?.disabled).toBe(true);
}

function otherWork(state) {
  const { orr_k3hover, ...rest } = state;
  return structuredClone(rest);
}

describe('Solar System Kepler III world inspection', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('offers a named native picker and verification table without selecting a world implicitly', () => {
    const env = renderInspection({ orr_sel: 'mercury' });
    expect(env.inspection?.getAttribute('aria-labelledby')).toBe('orrery-k3-title');
    expect(document.getElementById('orrery-k3-title')?.textContent.trim()).toBeTruthy();
    expect(env.picker?.tagName).toBe('SELECT');
    expect([...env.picker.labels].map((label) => label.textContent.trim()).join(' ')).toContain('Inspect a world');
    expect([...env.picker.options].map((option) => option.value)).toEqual(['', ...WORLD_IDS]);
    expect(env.state.orr_k3hover || null).toBeNull();
    expectEmpty(env);
    const table = document.getElementById('orrery-k3-verification-table');
    expect(table?.querySelector('caption')?.textContent).toMatch(/T²\/a³/);
    expect(table?.getAttribute('aria-describedby')).toContain('orrery-k3-units-note');
    expect(table?.querySelectorAll('tbody tr[data-k3-world]')).toHaveLength(WORLD_IDS.length);
    expect(table?.querySelectorAll('th[scope="col"]')).toHaveLength(6);
    expect(document.getElementById('orrery-k3-units-note')?.textContent).toContain('yr²/AU³');
  });

  it.each(WORLDS)('reads $name orbital data and independently checks the third-law calculation', (world) => {
    const env = renderInspection();
    env.select(world.id);
    expectSelected(env, world);
    expect(finiteReadouts()).toHaveLength(METRICS.length);
    expect(metric('a')).toBeCloseTo(world.a, 10);
    expect(metric('period')).toBeCloseTo(world.period, 10);
    expect(metric('predicted-period')).toBeCloseTo(Math.pow(world.a, 1.5), 10);
    expect(metric('period-squared')).toBeCloseTo(world.period ** 2, 10);
    expect(metric('axis-cubed')).toBeCloseTo(world.a ** 3, 10);
    const ratio = world.period ** 2 / world.a ** 3;
    expect(metric('ratio')).toBeCloseTo(ratio, 10);
    // Listed data are rounded; the measured ratio must not be silently set to one.
    if (world.id !== 'earth') expect(metric('ratio')).not.toBe(1);
    const row = document.querySelector(`tr[data-k3-world="${world.id}"]`);
    expect(row.textContent).toContain(ratio.toFixed(4));
    expect(document.getElementById('orrery-k3-selected')?.textContent)
      .toContain(`a = ${world.a.toFixed(3)} AU; T = ${world.period.toFixed(2)} yr; T²/a³ = ${ratio.toFixed(4)}`);
  });

  it('keeps native selection, table selection and live status in agreement across different worlds', () => {
    const env = renderInspection();
    env.select('mercury');
    expectSelected(env, WORLDS[0]);
    env.click(env.button('Inspect Jupiter'));
    expectSelected(env, WORLDS[2]);
    expect(env.button('Inspect Mercury')?.getAttribute('aria-pressed')).toBe('false');
    env.select('pluto');
    expectSelected(env, WORLDS[3]);
    expect(env.button('Inspect Jupiter')?.getAttribute('aria-pressed')).toBe('false');
    const status = document.getElementById('orrery-k3-selected');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });

  it('toggles an inspected table row and clears selection using the explicit controls', () => {
    const env = renderInspection();
    expectEmpty(env);
    env.click(env.button('Inspect Earth'));
    expectSelected(env, WORLDS[1]);
    env.click(env.button('Inspect Earth'));
    expect(env.state.orr_k3hover).toBeNull();
    expectEmpty(env);
    env.select('jupiter');
    expect(env.button('Clear selected world')?.disabled).toBe(false);
    env.click(env.button('Clear selected world'));
    expect(env.state.orr_k3hover).toBeNull();
    expectEmpty(env);
    env.select('mercury');
    env.select('');
    expect(env.state.orr_k3hover).toBeNull();
    expectEmpty(env);
  });

  it('changes only the inspected world while preserving Orrery, Inquiry and journal work without awards', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderInspection({
      orr_sel: 'mars', orr_compare: 'earth', orr_time: 12.75,
      orr_follow: true, orr_zoom: 'inner', orr_showTrails: true,
      orr_snapshots: { mars: { a: { bodyId: 'mars', t: 0, r: 1.4, v: 26 } } },
      orr_mission_idx: 2, orr_mission_progress: { earth: { started: true, correct: true } },
      keplerInquiry: {
        a: 2, e: 0.4, mass: 1, testVariable: 'e', baseline: { a: 2, e: 0.2, mass: 1 },
        hypothesis: 'Changing shape keeps period fixed.', understood: true,
        explanation: 'The orbit size and central mass remained fixed.',
        log: [{ a: '2.00', e: '0.400', m: '1.00', p: '2.83', state: 'Eccentric' }],
      },
      journalEntries: [{ planet: 'Mars', observation: 'Saved evidence from another investigation.' }],
      missionLog: [{ text: 'Earlier orbit observation.' }],
    }, { awardXP, tryAward });
    const before = otherWork(env.state);
    env.select('mercury');
    expect(otherWork(env.state)).toEqual(before);
    env.click(env.button('Inspect Pluto'));
    expect(otherWork(env.state)).toEqual(before);
    env.click(env.button('Clear selected world'));
    expect(otherWork(env.state)).toEqual(before);
    expect(awardXP).not.toHaveBeenCalled();
    expect(tryAward).not.toHaveBeenCalled();
  });

  it('renders invalid restored selections honestly without rewriting saves or producing invalid numbers', () => {
    for (const saved of ['missing-world', {}, 7, ['mercury']]) {
      const env = renderInspection({ orr_k3hover: saved });
      expectEmpty(env);
      expect(env.state.orr_k3hover).toEqual(saved);
      expect(env.inspection.textContent).not.toMatch(/NaN|Infinity|undefined/);
      const before = otherWork(env.state);
      env.select('earth');
      expectSelected(env, WORLDS[1]);
      expect(otherWork(env.state)).toEqual(before);
      // A synthetic invalid native value must never become a phantom world.
      env.select('not-a-world');
      expect(['earth', null]).toContain(env.state.orr_k3hover);
      if (env.state.orr_k3hover === 'earth') expectSelected(env, WORLDS[1]);
      else expectEmpty(env);
      expect(otherWork(env.state)).toEqual(before);
      expect(env.inspection.textContent).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
