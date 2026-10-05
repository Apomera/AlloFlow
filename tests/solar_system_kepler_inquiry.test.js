import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const METRICS = ['period', 'perihelion', 'aphelion', 'v-peri', 'v-aph', 'speed-ratio'];
const DEFAULT_INQUIRY = {
  a: 1, e: 0, mass: 1, hypothesis: '', stuckRevealed: false,
  understood: false, explanation: '', log: [], testVariable: 'e', baseline: null,
};

// Capture handlers from the real React elements, then use the existing SSR
// store to exercise production callbacks without mounting animation effects.
function renderInquiry(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true,
    solarMissionDashboardOpen: false,
    orreryMode: true,
    orr_tab: 8,
    keplerInquiry: { ...DEFAULT_INQUIRY },
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
      return React.createElement(type, { ...props, 'data-inquiry-callback': id }, ...children);
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
    return [...document.querySelectorAll('#solar-kepler-inquiry button')].find((control) => {
      const label = (control.getAttribute('aria-label') || control.textContent).replace(/\s+/g, ' ').trim();
      return typeof name === 'string' ? label === name : name.test(label);
    });
  }
  function invoke(control, eventName, value) {
    expect(control, 'The production Inquiry control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled control can be activated').toBe(false);
    const handler = callbacks.get(control.dataset.inquiryCallback)?.[eventName];
    expect(handler, 'The rendered control must have its production callback').toBeTypeOf('function');
    handler({ target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} });
    render();
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get inquiry() { return document.getElementById('solar-kepler-inquiry'); },
    button,
    click(control) { invoke(control, 'onClick'); },
    change(control, value) { invoke(control, 'onChange', value); },
    setVariable(value) { invoke(document.getElementById('solar-kepler-variable'), 'onChange', value); },
    setSlider(variable, value) { invoke(document.getElementById('solar-kepler-' + variable), 'onChange', String(value)); },
  };
}

function metric(name) {
  const node = document.querySelector(`#solar-kepler-inquiry dd[data-inquiry-metric="${name}"]`);
  expect(node, `The current ${name} must have a semantic numeric readout`).not.toBeNull();
  const raw = node.getAttribute('data-value');
  expect(raw, `${name} must expose its unrounded numeric value`).not.toBeNull();
  const value = Number(raw);
  expect(Number.isFinite(value), `${name} must be finite`).toBe(true);
  return value;
}

function currentMetrics() {
  return Object.fromEntries(METRICS.map((name) => [name, metric(name)]));
}

function numberAttribute(node, name) {
  expect(node, `Geometry node for ${name} must exist`).not.toBeNull();
  const raw = node.getAttribute(name);
  expect(raw, `Geometry attribute ${name} must exist`).not.toBeNull();
  const value = Number(raw);
  expect(Number.isFinite(value), `${name} must be a finite SVG coordinate`).toBe(true);
  return value;
}

function geometry() {
  const svg = document.querySelector('#solar-kepler-inquiry svg');
  const ellipse = svg?.querySelector('[data-inquiry-ellipse]');
  const star = svg?.querySelector('[data-inquiry-star]');
  return {
    svg, ellipse, star,
    cx: numberAttribute(ellipse, 'cx'), cy: numberAttribute(ellipse, 'cy'),
    rx: numberAttribute(ellipse, 'rx'), ry: numberAttribute(ellipse, 'ry'),
    starX: numberAttribute(star, 'cx'), starY: numberAttribute(star, 'cy'),
  };
}

function retainedWork(state) {
  return structuredClone({
    hypothesis: state.keplerInquiry.hypothesis,
    understood: state.keplerInquiry.understood,
    explanation: state.keplerInquiry.explanation,
    log: state.keplerInquiry.log,
    missionLog: state.missionLog,
    journal: state.journalEntries,
    orbitTime: state.orr_time,
    snapshots: state.orr_snapshots,
  });
}

describe('Solar System controlled Kepler Inquiry', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders a named circular reference with finite physical readings', () => {
    const env = renderInquiry();
    expect(env.inquiry).not.toBeNull();
    expect(env.inquiry.getAttribute('aria-labelledby')).toBe('solar-kepler-inquiry-title');
    expect(document.getElementById('solar-kepler-inquiry-title')?.textContent.trim()).not.toBe('');
    const values = currentMetrics();
    expect(values.period).toBeCloseTo(1, 10);
    expect(values.perihelion).toBeCloseTo(1, 10);
    expect(values.aphelion).toBeCloseTo(1, 10);
    expect(values['v-peri']).toBeCloseTo(values['v-aph'], 10);
    expect(values['speed-ratio']).toBeCloseTo(1, 10);
    expect(env.inquiry.textContent).toMatch(/circular/i);
    const svg = env.inquiry.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    const labelIds = (svg?.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const named = Boolean(svg?.getAttribute('aria-label')?.trim()) ||
      (labelIds.length > 0 && labelIds.every((id) => document.getElementById(id)?.textContent.trim()));
    expect(named).toBe(true);
  });

  it('changes eccentricity at fixed orbit size and mass without changing period', () => {
    const env = renderInquiry();
    env.setVariable('e');
    env.click(env.button('Save baseline'));
    const baseline = structuredClone(env.state.keplerInquiry.baseline);
    env.setSlider('e', 0.6);
    const values = currentMetrics();
    expect(values.period).toBeCloseTo(1, 10);
    expect(values.perihelion).toBeCloseTo(0.4, 10);
    expect(values.aphelion).toBeCloseTo(1.6, 10);
    expect(values['speed-ratio']).toBeCloseTo(4, 10);
    expect(values['v-peri'] / values['v-aph']).toBeCloseTo(4, 10);
    expect(env.state.keplerInquiry.baseline).toEqual(baseline);
    expect(document.getElementById('solar-kepler-comparison-table')).not.toBeNull();
    expect(document.getElementById('solar-kepler-baseline-status').getAttribute('data-comparison-state')).toBe('controlled');
  });

  it('doubling semi-major axis multiplies period by sqrt(8) and distances by two', () => {
    const env = renderInquiry({ keplerInquiry: { ...DEFAULT_INQUIRY, a: 1, e: 0.2, mass: 1 } });
    env.setVariable('a');
    env.click(env.button('Save baseline'));
    const original = currentMetrics();
    env.setSlider('a', 2);
    const changed = currentMetrics();
    expect(changed.period / original.period).toBeCloseTo(Math.sqrt(8), 10);
    expect(changed.perihelion / original.perihelion).toBeCloseTo(2, 10);
    expect(changed.aphelion / original.aphelion).toBeCloseTo(2, 10);
    expect(changed['v-peri'] / original['v-peri']).toBeCloseTo(1 / Math.sqrt(2), 10);
    expect(changed['v-aph'] / original['v-aph']).toBeCloseTo(1 / Math.sqrt(2), 10);
    expect(changed['speed-ratio']).toBeCloseTo(original['speed-ratio'], 10);
    expect(env.state.keplerInquiry.baseline).toEqual({ a: 1, e: 0.2, mass: 1 });
  });

  it('quadrupling central mass halves period and doubles speed without changing shape', () => {
    const env = renderInquiry({ keplerInquiry: { ...DEFAULT_INQUIRY, a: 2, e: 0.4, mass: 1 } });
    env.setVariable('mass');
    env.click(env.button('Save baseline'));
    const original = currentMetrics();
    const before = geometry();
    env.setSlider('mass', 4);
    const changed = currentMetrics();
    const after = geometry();
    expect(changed.period / original.period).toBeCloseTo(0.5, 10);
    expect(changed['v-peri'] / original['v-peri']).toBeCloseTo(2, 10);
    expect(changed['v-aph'] / original['v-aph']).toBeCloseTo(2, 10);
    expect(changed.perihelion).toBeCloseTo(original.perihelion, 10);
    expect(changed.aphelion).toBeCloseTo(original.aphelion, 10);
    for (const key of ['cx', 'cy', 'rx', 'ry', 'starX', 'starY']) expect(after[key]).toBeCloseTo(before[key], 10);
  });

  it('places closest and farthest endpoints relative to the occupied focus and fits the complete diagram', () => {
    for (const e of [0, 0.3, 0.98]) {
      const env = renderInquiry({ keplerInquiry: { ...DEFAULT_INQUIRY, a: 2, e, mass: 1,
        baseline: { a: 1, e: 0.1, mass: 1 } } });
      const drawing = geometry();
      const bounds = drawing.svg.getAttribute('viewBox').split(/[ ,]+/).map(Number);
      expect(bounds).toEqual([0, 0, 360, 300]);
      expect(drawing.starX).toBeCloseTo(225, 8);
      expect(drawing.starY).toBeCloseTo(125, 8);
      expect(drawing.rx).toBeGreaterThan(0);
      expect(drawing.rx).toBeLessThanOrEqual(98);
      expect(drawing.ry / drawing.rx).toBeCloseTo(Math.sqrt(1 - e * e), 8);
      expect(drawing.starX - drawing.cx).toBeCloseTo(drawing.rx * e, 8);
      expect(drawing.cx - drawing.rx).toBeGreaterThanOrEqual(0);
      expect(drawing.cx + drawing.rx).toBeLessThanOrEqual(bounds[2]);
      expect(drawing.cy - drawing.ry).toBeGreaterThanOrEqual(0);
      expect(drawing.cy + drawing.ry).toBeLessThanOrEqual(bounds[3]);
      const peri = drawing.svg.querySelector('[data-orbit-endpoint="perihelion"]');
      const aph = drawing.svg.querySelector('[data-orbit-endpoint="aphelion"]');
      const periDistance = Math.hypot(numberAttribute(peri, 'cx') - drawing.starX, numberAttribute(peri, 'cy') - drawing.starY);
      const aphDistance = Math.hypot(numberAttribute(aph, 'cx') - drawing.starX, numberAttribute(aph, 'cy') - drawing.starY);
      expect(periDistance).toBeCloseTo(drawing.rx * (1 - e), 8);
      expect(aphDistance).toBeCloseTo(drawing.rx * (1 + e), 8);
      expect(periDistance / aphDistance).toBeCloseTo((1 - e) / (1 + e), 8);
      const ruler = drawing.svg.querySelector('[data-inquiry-ruler]');
      for (const name of ['x1', 'x2']) expect(numberAttribute(ruler, name)).toBeGreaterThanOrEqual(0);
      for (const name of ['x1', 'x2']) expect(numberAttribute(ruler, name)).toBeLessThanOrEqual(bounds[2]);
      for (const name of ['y1', 'y2']) expect(numberAttribute(ruler, name)).toBeGreaterThanOrEqual(0);
      for (const name of ['y1', 'y2']) expect(numberAttribute(ruler, name)).toBeLessThanOrEqual(bounds[3]);
      for (const label of drawing.svg.querySelectorAll('text[x][y]')) {
        expect(numberAttribute(label, 'x')).toBeGreaterThanOrEqual(0);
        expect(numberAttribute(label, 'x')).toBeLessThanOrEqual(bounds[2]);
        expect(numberAttribute(label, 'y')).toBeGreaterThanOrEqual(0);
        expect(numberAttribute(label, 'y')).toBeLessThanOrEqual(bounds[3]);
      }
      expect(env.inquiry.textContent).not.toMatch(/\b(?:NaN|Infinity|undefined)\b/);
    }
  });

  it('keeps the highest selectable eccentricity a closed bound orbit with a positive perihelion', () => {
    const env = renderInquiry();
    for (const [eccentricity, orbitClass] of [[0, 'circular'], [0.017, 'near-circular'],
      [0.05, 'elliptical'], [0.25, 'eccentric'], [0.7, 'elongated'], [0.98, 'elongated']]) {
      env.setSlider('e', eccentricity);
      expect(env.inquiry.getAttribute('data-inquiry-orbit-class')).toBe(orbitClass);
    }
    expect(Number(document.getElementById('solar-kepler-e').getAttribute('max'))).toBeLessThan(1);
    expect(metric('perihelion')).toBeCloseTo(0.02, 10);
    expect(metric('aphelion')).toBeCloseTo(1.98, 10);
    expect(metric('period')).toBeCloseTo(1, 10);
    expect(metric('speed-ratio')).toBeCloseTo(99, 8);
    expect(geometry().ry).toBeGreaterThan(0);
    expect(env.inquiry.textContent).toMatch(/bound|ellip/i);
  });

  it('selects the test variable without changing the orbit and freezes a baseline until explicit replacement', () => {
    const env = renderInquiry({ keplerInquiry: { ...DEFAULT_INQUIRY, a: 3, e: 0.25, mass: 2,
      hypothesis: 'Changing e should change shape.', explanation: 'My saved reasoning.', understood: true,
      log: [{ t: '12:00:00', a: '1.00', e: '0.000', m: '1.00', p: '1.00', state: 'Circular' }] } });
    const before = structuredClone(env.state.keplerInquiry);
    expect(document.getElementById('solar-kepler-baseline-status').getAttribute('data-comparison-state')).toBe('unavailable');
    env.setVariable('mass');
    expect(env.state.keplerInquiry).toEqual({ ...before, testVariable: 'mass' });
    env.click(env.button('Save baseline'));
    expect(env.state.keplerInquiry.baseline).toEqual({ a: 3, e: 0.25, mass: 2 });
    expect(document.getElementById('solar-kepler-baseline-status').getAttribute('data-comparison-state')).toBe('unchanged');
    const frozen = structuredClone(env.state.keplerInquiry.baseline);
    const work = retainedWork(env.state);
    env.setSlider('mass', 5);
    env.setVariable('e');
    expect(env.state.keplerInquiry.baseline).toEqual(frozen);
    expect(document.getElementById('solar-kepler-baseline-status').getAttribute('data-comparison-state')).toBe('confounded');
    expect(retainedWork(env.state)).toEqual(work);
    env.click(env.button('Replace baseline'));
    expect(env.state.keplerInquiry.baseline).toEqual({ a: 3, e: 0.25, mass: 5 });
    expect(retainedWork(env.state)).toEqual(work);
  });

  it('identifies held-setting changes and restores only the two held variables', () => {
    const env = renderInquiry({ keplerInquiry: { ...DEFAULT_INQUIRY, a: 2, e: 0.2, mass: 3,
      hypothesis: 'Test eccentricity at the same size and mass.', log: [] } });
    env.setVariable('e');
    env.click(env.button('Save baseline'));
    expect(document.getElementById('solar-kepler-baseline-status').getAttribute('data-comparison-state')).toBe('unchanged');
    env.setSlider('e', 0.6);
    expect(document.getElementById('solar-kepler-baseline-status').getAttribute('data-comparison-state')).toBe('controlled');
    env.setSlider('a', 4);
    env.setSlider('mass', 6);
    const changedStatus = document.getElementById('solar-kepler-baseline-status').textContent;
    expect(document.getElementById('solar-kepler-baseline-status').getAttribute('data-comparison-state')).toBe('confounded');
    expect(changedStatus.trim()).not.toBe('');
    expect(document.getElementById('solar-kepler-a').disabled).toBe(false);
    expect(document.getElementById('solar-kepler-e').disabled).toBe(false);
    expect(document.getElementById('solar-kepler-mass').disabled).toBe(false);
    const work = retainedWork(env.state);
    env.click(env.button('Restore held settings'));
    expect(env.state.keplerInquiry.a).toBe(2);
    expect(env.state.keplerInquiry.mass).toBe(3);
    expect(env.state.keplerInquiry.e).toBe(0.6);
    expect(env.state.keplerInquiry.baseline).toEqual({ a: 2, e: 0.2, mass: 3 });
    expect(retainedWork(env.state)).toEqual(work);
    expect(document.getElementById('solar-kepler-baseline-status').textContent).not.toBe(changedStatus);
    expect(document.getElementById('solar-kepler-baseline-status').getAttribute('data-comparison-state')).toBe('controlled');
  });

  it('keeps legacy logs, writing, baseline, and other learning work through logging and model reset', () => {
    const legacy = { t: '12:00:00', a: '1.00', e: '0.000', m: '1.00', p: '1.00', state: 'Circular' };
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderInquiry({ keplerInquiry: { ...DEFAULT_INQUIRY, a: 2, e: 0.4, mass: 1,
      testVariable: 'e', baseline: { a: 2, e: 0.2, mass: 1 }, understood: true,
      hypothesis: 'Keep my hypothesis.', explanation: 'Keep my explanation.', log: [legacy] },
      missionLog: [{ text: 'Earlier mission evidence.' }], journalEntries: [{ observation: 'Earlier journal entry.' }],
      orr_time: 7.3, orr_snapshots: { mercury: { a: { time: 0, speed: 59 } } },
    }, { awardXP, tryAward });
    env.change(document.getElementById('solar-kepler-hypothesis'), 'My revised hypothesis.');
    env.change(env.inquiry.querySelector('textarea:not(#solar-kepler-hypothesis)'), 'My revised explanation.');
    const before = retainedWork(env.state);
    const baseline = structuredClone(env.state.keplerInquiry.baseline);
    env.click(env.button(/Log this orbit/));
    expect(env.state.keplerInquiry.log).toHaveLength(2);
    expect(env.state.keplerInquiry.log[0]).toEqual(legacy);
    const recorded = env.state.keplerInquiry.log[1];
    expect(Number(recorded.a)).toBeCloseTo(2, 8);
    expect(Number(recorded.e)).toBeCloseTo(0.4, 8);
    expect(Number(recorded.m)).toBeCloseTo(1, 8);
    expect(Number(recorded.p)).toBeCloseTo(Math.sqrt(8), 2);
    expect(recorded.variable).toBe('e');
    expect(recorded.baseline).toEqual(baseline);
    expect(recorded.current).toEqual({ a: 2, e: 0.4, mass: 1 });
    expect(recorded.heldChanges).toEqual([]);
    expect(recorded.controlled).toBe(true);
    expect(env.state.keplerInquiry.baseline).toEqual(baseline);
    expect(retainedWork(env.state)).toEqual({ ...before, log: [legacy, recorded] });
    const loggedWork = retainedWork(env.state);
    env.click(env.button(/Reset.*Earth/));
    expect(env.state.keplerInquiry.a).toBe(1);
    expect(env.state.keplerInquiry.e).toBe(0);
    expect(env.state.keplerInquiry.mass).toBe(1);
    expect(env.state.keplerInquiry.baseline).toEqual(baseline);
    expect(retainedWork(env.state)).toEqual(loggedWork);
    expect(awardXP).not.toHaveBeenCalled();
    expect(tryAward).not.toHaveBeenCalled();
  });

  it('renders partial and malformed restored settings without nonfinite readings or unusable sliders', () => {
    const records = [
      {},
      { a: 2, hypothesis: 'Preserve this partial draft.' },
      { a: 'bad', e: NaN, mass: Infinity, log: null, testVariable: 'unknown', baseline: { a: -3, e: Infinity, mass: 0 } },
      { a: -4, e: 1.2, mass: 0, log: 'not an array', baseline: [] },
      { a: 50, e: 0.98, mass: 0.05, hypothesis: 'Limits are still bound.' },
      { a: 1, e: 0, mass: 1, log: [null, { a: NaN, p: Infinity },
        { a: 'NaN', e: 'Infinity', m: {}, p: 'undefined' }] },
    ];
    for (const restored of records) {
      const originalLog = Array.isArray(restored.log) ? structuredClone(restored.log) : null;
      const env = renderInquiry({ keplerInquiry: restored });
      expect(env.inquiry).not.toBeNull();
      expect(env.inquiry.textContent).not.toMatch(/\b(?:NaN|Infinity|undefined)\b/);
      for (const value of Object.values(currentMetrics())) expect(Number.isFinite(value) && value > 0).toBe(true);
      for (const name of ['a', 'e', 'mass']) {
        const control = document.getElementById('solar-kepler-' + name);
        const value = Number(control.getAttribute('value'));
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(Number(control.getAttribute('min')));
        expect(value).toBeLessThanOrEqual(Number(control.getAttribute('max')));
      }
      if (restored.hypothesis) expect(document.getElementById('solar-kepler-hypothesis').value).toBe(restored.hypothesis);
      if (originalLog) expect(env.state.keplerInquiry.log).toEqual(originalLog);
    }
  });

  it('shows enough period precision to observe and log a short-period controlled mass change', () => {
    const env = renderInquiry({ keplerInquiry: { ...DEFAULT_INQUIRY, a: 0.1, e: 0, mass: 10,
      testVariable: 'mass' } });
    env.click(env.button('Save baseline'));
    env.setSlider('mass', 30);
    const table = document.getElementById('solar-kepler-comparison-table');
    const periodRow = [...table.querySelectorAll('tbody tr')].find((row) => row.querySelector('th')?.textContent.trim() === 'Period');
    expect(periodRow, 'The comparison must include the measured orbital period').toBeTruthy();
    const cells = periodRow.querySelectorAll('td');
    expect(cells[0].textContent.trim()).toBe('0.01000 yr');
    expect(cells[1].textContent.trim()).toBe('0.00577 yr');
    expect(metric('period')).toBeCloseTo(Math.sqrt(Math.pow(0.1, 3) / 30), 10);
    expect(document.getElementById('solar-kepler-baseline-status').getAttribute('data-comparison-state')).toBe('controlled');
    env.click(env.button('Log this orbit'));
    expect(env.state.keplerInquiry.log).toHaveLength(1);
    expect(env.state.keplerInquiry.log[0].p).toBe('0.00577');
    expect(env.state.keplerInquiry.log[0].baseline).toEqual({ a: 0.1, e: 0, mass: 10 });
    expect(env.state.keplerInquiry.log[0].current).toEqual({ a: 0.1, e: 0, mass: 30 });
  });

  it('explains a current orbit too small to resolve without inflating the shared distance scale', () => {
    const baseline = { a: 50, e: 0.2, mass: 1 };
    const env = renderInquiry({ keplerInquiry: { ...DEFAULT_INQUIRY, a: 0.1, e: 0.4,
      baseline, testVariable: 'a' } });
    const notice = document.getElementById('solar-kepler-scale-notice');
    expect(notice).not.toBeNull();
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toMatch(/current/i);
    expect(notice.textContent).toMatch(/smaller/i);
    const drawing = geometry();
    expect(drawing.rx).toBeCloseTo(98 * 0.1 / 50, 10);
    expect(numberAttribute(drawing.svg.querySelector('[data-inquiry-baseline]'), 'rx')).toBeCloseTo(98, 10);
    expect(env.state.keplerInquiry.baseline).toEqual(baseline);
    env.setSlider('a', 50);
    expect(document.getElementById('solar-kepler-scale-notice')).toBeNull();
    expect(env.state.keplerInquiry.baseline).toEqual(baseline);
  });
});
