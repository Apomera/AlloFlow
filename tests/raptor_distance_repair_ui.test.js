// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Buffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const act = React.act || require(resolve(modules, 'react-dom/test-utils')).act;
const h = React.createElement;
const sources = ['model', 'evidence', 'investigations', 'fieldwork', 'results', 'match', 'signal', 'study'].map(name =>
  readFileSync(`stem_lab/raptor_distance_${name}.js`, 'utf8'));
const initial = { version: 1, distance: 80, cycles: 8, contrast: 95 };
const condition = settings => `${settings.distance}/${settings.cycles}/${settings.contrast}`;
const liveSelector = '[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]';
const select = { details: "[data-distance-repair]", apply: "[data-distance-repair-apply]", readiness: "[data-distance-repair-readiness]", preview: "[data-distance-repair-preview]", announcement: "[data-distance-announcement=repair]" };
const fields = [
  ['distance', 'Exact viewing distance (m)', 40, 300],
  ['cycles', 'Exact stripe pairs', 4, 20],
  ['contrast', 'Exact display contrast (%)', 10, 100]
];
const fieldSelector = name => `[data-distance-exact-input="${name}"]`;
const errorSelector = name => `[data-distance-exact-error="${name}"]`;

let local, host, root, controller, controllers, capture, readback, contexts, changes, value, loadResources, actDescriptor;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
async function activate(selector) {
  const element = query(selector);
  expect(element, selector).not.toBeNull();
  if ('disabled' in element) expect(element.disabled, selector).toBe(false);
  await act(async () => { element.click(); });
}
async function input(selector, text) {
  const element = query(selector);
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(text));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function reveal() {
  await activate(`[data-distance-prediction="${local.RaptorDistanceModel.metrics(value).referenceBand}"]`);
  await activate('[data-distance-reveal]');
}
function workCounts() {
  return { reads: readback.mock.calls.length, captures: capture.mock.calls.length,
    updates: controllers.reduce((total, item) => total + item.update.mock.calls.length, 0), changes: changes.mock.calls.length };
}
function describedBy(selector, id) {
  expect(query(selector).getAttribute('aria-describedby').split(/\s+/)).toContain(id);
  expect(query(`#${id}`)).not.toBeNull();
}
function readiness(state) {
  const element = query(select.readiness);
  expect(element.getAttribute('data-state')).toBe(state);
  expect(element.textContent.trim().length).toBeGreaterThan(10);
  expect(query(select.apply).disabled).toBe(state !== 'ready');
}
function savedResult(id, samples) {
  return local.RaptorDistanceResults.capture(id, samples.map(distance => {
    const settings = { version: 1, distance, cycles: 12, contrast: 95 };
    return local.RaptorDistanceFieldwork.trial(settings, local.RaptorDistanceModel.metrics(settings).referenceBand);
  }));
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function Host(props) { React.useLayoutEffect(() => { if (props.beforePassiveEffects) props.beforePassiveEffects(); }, [props.settings, props.beforePassiveEffects]);
  return h(local.RaptorDistanceStudy.Component, {
    React, settings: props.settings, loadResources, onClose() {}, onChange: changes
  });
}
async function commit(settings, beforePassiveEffects) {
  value = settings;
  await act(async () => { root.render(h(Host, { settings: value, beforePassiveEffects })); });
}

beforeEach(async () => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  local = {}; sources.forEach(source => Function('window', source)(local));
  controller = null; controllers = []; contexts = new Map();
  loadResources = vi.fn(() => Promise.resolve());
  capture = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    return 'data:image/png;base64,' + Buffer.from(`${this.getAttribute('data-distance-canvas')}|${this.getAttribute('data-test-rendered')}`).toString('base64');
  });
  readback = vi.fn((name, x, y, width, height) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < width * height; index++) {
      data[index * 4] = data[index * 4 + 1] = data[index * 4 + 2] = 100 + (index % 3) * 10;
      data[index * 4 + 3] = 255;
    }
    return { data, width, height };
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) {
      const canvas = this;
      contexts.set(canvas, { getImageData: (x, y, width, height) =>
        readback(canvas.getAttribute('data-distance-canvas'), x, y, width, height) });
    }
    return contexts.get(this);
  });
  local.RaptorDistanceScene = { create: vi.fn(options => {
    let rendered = null;
    controller = {
      update: vi.fn(settings => {
        rendered = local.RaptorDistanceModel.normalize(settings);
        for (const canvas of [options.wideCanvas, options.referenceCanvas, options.eagleCanvas]) {
          canvas.setAttribute('data-test-rendered', condition(rendered));
        }
        return { settings: { ...rendered } };
      }),
      getDiagnostics: () => ({ settings: rendered && { ...rendered } }), dispose: vi.fn()
    };
    controllers.push(controller); return controller;
  }) };
  changes = vi.fn(next => { value = next; root.render(h(Host, { settings: value })); });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await commit({ ...initial });
  expect(query('[data-raptor-distance-study]').getAttribute('data-render-ready')).toBe('true');
});

afterEach(async () => {
  try {
    if (root) await act(async () => { root.unmount(); });
    for (const instance of controllers || []) expect(instance.dispose).toHaveBeenCalledTimes(1);
  } finally {
    if (host) host.remove();
    vi.restoreAllMocks(); root = null; controller = null; controllers = []; contexts = null; local = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

const names = { distance: 'viewing distance', cycles: 'stripe pairs', contrast: 'display contrast' };
const factor = field => `[data-distance-repair-factor="${field}"]`;
function tuple(settings = value) { return [settings.distance, settings.cycles, settings.contrast]; }
function planned() { return Object.fromEntries(all('[data-distance-repair-value]').map(cell => [cell.getAttribute('data-distance-repair-value'), Number(cell.getAttribute('data-value'))])); }
async function pinAt(settings = initial) { await commit({ ...value, ...settings }); await reveal(); await activate('[data-distance-pin]'); }
async function multiple(settings = { distance: 160, cycles: 16, contrast: 25 }) {
  await pinAt(); await commit({ ...value, ...settings });
  if (!query(select.details).open) await activate(`${select.details} > summary`);
}

describe('Raptor distance comparison repair and command guidance in React', () => {
  it('explains every existing command beside its control, including bounded unavailable actions', async () => {
    expect(query(select.details)).toBeNull(); await pinAt(); readiness('same');
    const before = workCounts();
    for (const command of ['distance', 'cycles', 'contrast', 'restore']) {
      const selector = `[data-distance-experiment="${command}"]`, help = query(`[data-distance-experiment-help="${command}"]`);
      expect(help.tagName).toBe('LI'); expect(help.textContent.trim().length).toBeGreaterThan(12);
      expect(help.id).toBe(`rh-distance-experiment-${command}-help`); describedBy(selector, help.id);
      expect(query(selector).disabled).toBe(false);
    }
    expect(query('[data-distance-experiment-guidance]').tagName).toBe('UL');
    expect(workCounts()).toEqual(before);
    await pinAt({ distance: 300, cycles: 20, contrast: 25 });
    for (const command of ['distance', 'cycles', 'contrast']) expect(query(`[data-distance-experiment="${command}"]`).disabled).toBe(true);
    expect(query('[data-distance-experiment-help="distance"]').textContent).toMatch(/150|600|300/);
    expect(query('[data-distance-experiment-help="cycles"]').textContent).toMatch(/10|40|20/);
    expect(query('[data-distance-experiment-help="contrast"]').textContent).toMatch(/already|25/);
    expect(query('[data-distance-experiment="restore"]').disabled).toBe(false);
  });

  it('previews all three repair choices locally without choosing for the learner or revealing an outcome', async () => {
    await multiple(); readiness('choose'); expect(query(select.preview)).toBeNull();
    const before = JSON.parse(JSON.stringify(value)), counts = workCounts();
    expect(all('[data-distance-repair-factor]').map(button => button.getAttribute('data-distance-repair-factor'))).toEqual(['distance', 'cycles', 'contrast']);
    for (const field of ['distance', 'cycles', 'contrast']) {
      expect(query(factor(field)).getAttribute('aria-pressed')).toBe('false');
      await activate(factor(field)); readiness('ready');
      expect(planned()).toEqual({ distance: initial.distance, cycles: initial.cycles, contrast: initial.contrast, [field]: value[field] });
    }
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
  });

  it('applies each retained current factor exactly once and focuses prediction after new values render', async () => {
    for (const field of ['distance', 'cycles', 'contrast']) {
      await multiple(); await activate(factor(field));
      const next = { ...initial, [field]: value[field] }, counts = workCounts(), focusValues = [];
      const heading = query('[data-distance-prediction-heading]');
      const listener = () => focusValues.push(['distance', 'cycles', 'contrast'].map(name => Number(query(`#rh-distance-${name}`).value)));
      query(select.apply).focus();
      heading.addEventListener('focus', listener);
      await activate(select.apply); heading.removeEventListener('focus', listener);
      expect(tuple()).toEqual(tuple(next)); expect(focusValues).toEqual([tuple(next)]);
      expect(document.activeElement).toBe(heading); readiness('single');
      expect(workCounts()).toEqual({ ...counts, changes: counts.changes + 1, updates: counts.updates + 1 });
      expect(query('[data-distance-result]')).toBeNull(); expect(query('[data-distance-reveal]').disabled).toBe(true);
      expect(query('[data-distance-repair-feedback]').textContent).toContain(names[field]);
      describedBy(select.apply, query(select.readiness).id);
      if (field === 'contrast') {
        const applied = { ...value };
        await commit({ ...value, distance: 200 });
        expect(query('[data-distance-repair-feedback]')).toBeNull();
        await commit(applied); expect(query('[data-distance-repair-feedback]')).toBeNull();
      }
    }
  });

  it('offers only genuinely changed factors and can repair comparisons even when canned doubling is unavailable', async () => {
    await pinAt({ distance: 300, cycles: 20, contrast: 25 });
    await commit({ ...value, distance: 80, contrast: 95 }); readiness('choose');
    expect(all('[data-distance-repair-factor]').map(button => button.getAttribute('data-distance-repair-factor'))).toEqual(['distance', 'contrast']);
    expect(query(factor('cycles'))).toBeNull();
    const before = workCounts(); await activate(factor('contrast'));
    expect(planned()).toEqual({ distance: 300, cycles: 20, contrast: 95 });
    expect(query('[data-distance-repair-held]').textContent).toMatch(/distance/i);
    expect(workCounts()).toEqual(before); await activate(select.apply);
    expect(tuple()).toEqual([300, 20, 95]); readiness('single');
    expect(query('[data-distance-experiment="distance"]').disabled).toBe(true);
    expect(query('[data-distance-experiment="cycles"]').disabled).toBe(true);
  });

  it('withholds a stale plan before passive effects and clears it when the pin is replaced at identical settings', async () => {
    await multiple(); await activate(factor('contrast'));
    const changesBefore = changes.mock.calls.length, timing = {};
    await commit({ ...value, distance: 170 }, () => {
      timing.preview = !!query(select.preview); timing.disabled = query(select.apply).disabled;
      query(select.apply).click(); timing.changes = changes.mock.calls.length;
    });
    expect(timing).toEqual({ preview: false, disabled: true, changes: changesBefore }); readiness('choose');
    await activate(factor('distance')); await reveal(); await activate('[data-distance-pin]');
    readiness('same'); expect(query(select.preview)).toBeNull();
    expect(all('[data-distance-repair-factor]')).toHaveLength(0);
    await activate('[data-distance-pin]'); readiness('same');
    await commit({ ...value, cycles: 8, contrast: 95 }); readiness('choose'); expect(query(select.preview)).toBeNull();
    for (const button of all('[data-distance-repair-factor]')) expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('preserves plans and evidence through failed and loading scenes while guiding recovery without applying', async () => {
    await multiple(); await activate(factor('contrast')); await input('[data-distance-note]', 'Retain this draft through scene recovery.');
    controller.update.mockImplementationOnce(() => { throw new Error('Renderer unavailable'); });
    await commit({ ...value, distance: 180 }); readiness('error');
    for (const button of all('[data-distance-experiment]')) expect(button.disabled).toBe(true);
    for (const help of all('[data-distance-experiment-help]')) expect(help.textContent).toMatch(/scene|retry|unavailable/i);
    const counts = workCounts(), before = JSON.parse(JSON.stringify(value));
    await activate('[data-distance-repair-next]'); expect(document.activeElement).toBe(query('[data-distance-retry]'));
    expect(workCounts()).toEqual(counts); expect(value).toEqual(before);
    await activate(factor('distance')); readiness('error');
    const wait = deferred(); loadResources.mockImplementationOnce(() => wait.promise);
    await activate('[data-distance-retry]'); readiness('loading');
    await activate(factor('contrast')); readiness('loading');
    expect(query('[data-distance-note]').value).toContain('Retain this draft');
    await act(async () => { wait.resolve(); await wait.promise; }); readiness('ready');
    expect(planned()).toEqual({ distance: 80, cycles: 8, contrast: 25 });
    expect(value).toEqual(before);
  });

  it('preserves the pin, kept pixels, saved learning and guided question while requiring draft review after application', async () => {
    const record = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'Previously saved evidence.');
    const results = { version: 1, human: savedResult('human', [80, 90]) };
    await commit({ ...value, records: [record], fieldworkResults: results });
    await activate('[data-distance-inquiry="contrast"]'); await reveal(); await activate('[data-distance-pin]');
    await activate('[data-distance-signal-read]'); await activate('[data-distance-signal-keep]');
    const images = all('[data-distance-pinned-image]').map(image => image.src), kept = query('[data-distance-signal-kept-label]').textContent;
    await commit({ ...value, distance: 160, cycles: 16, contrast: 25 }); await reveal();
    await input('[data-distance-note]', 'This note describes all three live changes.');
    expect(query('[data-distance-draft-stale]')).toBeNull();
    const counts = workCounts(); await activate(factor('contrast')); expect(workCounts()).toEqual(counts);
    await activate(select.apply);
    expect(value.records).toEqual([record]); expect(value.fieldworkResults).toEqual(results);
    expect(all('[data-distance-pinned-image]').map(image => image.src)).toEqual(images);
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(kept);
    expect(query('[data-distance-guide]').getAttribute('data-distance-guide')).toBe('contrast');
    expect(query('[data-distance-note]').value).toContain('all three live changes');
    expect(query('[data-distance-draft-stale]')).not.toBeNull(); expect(query('[data-distance-save]').disabled).toBe(true);
    expect(query('[data-distance-repair-feedback]').closest(select.announcement)).not.toBeNull();
  });

  it('keeps recovery and notebook shortcuts focus-only and removes plans when their pin is cleared', async () => {
    await pinAt(); readiness('same'); const before = workCounts();
    await activate('[data-distance-repair-next]'); expect(document.activeElement).toBe(query('#rh-distance-distance')); expect(workCounts()).toEqual(before);
    await commit({ ...value, distance: 160 }); readiness('single');
    await activate('[data-distance-repair-note]'); expect(document.activeElement).toBe(query('[data-distance-note]'));
    expect(query('[data-distance-note]').value).toBe('');
    await commit({ ...value, cycles: 16 }); await activate(factor('distance')); readiness('ready');
    const counts = workCounts(); await activate('[data-distance-clear-pin]');
    expect(query(select.details)).toBeNull(); expect(workCounts()).toEqual(counts);
    expect(document.activeElement.textContent).toBe('Keep a view. Test a change.');
  });
});

