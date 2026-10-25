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
const select = {
  details: '[data-distance-exact]', form: '[data-distance-exact-form]', apply: '[data-distance-exact-apply]',
  reset: '[data-distance-exact-reset]', readiness: '[data-distance-exact-readiness]',
  preview: '[data-distance-exact-preview]', announcement: '[data-distance-announcement="exact"]'
};
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
function Host(props) {
  return h(local.RaptorDistanceStudy.Component, {
    React, settings: props.settings, loadResources, onClose() {}, onChange: changes
  });
}
async function commit(settings) {
  value = settings;
  await act(async () => { root.render(h(Host, { settings: value })); });
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

describe('Raptor distance exact condition planning in React', () => {
  it('offers labelled native fields and keeps an unfinished plan separate from revealed and saved evidence', async () => {
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'An earlier notebook observation.');
    const results = { version: 1, eagle: savedResult('eagle', [200, 201]) };
    await commit({ ...value, records: [earlier], fieldworkResults: results });
    await reveal(); await activate('[data-distance-pin]');
    await activate('[data-distance-signal-read]'); await activate('[data-distance-signal-keep]');
    await input('[data-distance-note]', 'A draft tied to the currently revealed conditions.');
    await activate(`${select.details} > summary`);
    const form = query(select.form);
    expect(form.tagName).toBe('FORM'); expect(form.noValidate).toBe(true);
    for (const [name, label, min, max] of fields) {
      const element = query(fieldSelector(name));
      expect(element.type).toBe('number'); expect(element.required).toBe(true);
      expect(element.min).toBe(String(min)); expect(element.max).toBe(String(max)); expect(element.step).toBe('1');
      expect(query(`label[for="${element.id}"]`).textContent).toBe(label);
      describedBy(fieldSelector(name), `rh-distance-exact-${name}-error`);
      expect(query(errorSelector(name)).id).toBe(`rh-distance-exact-${name}-error`);
      expect(element.value).toBe(String(initial[name]));
    }
    expect(query(select.apply).type).toBe('submit'); expect(query(select.reset).type).toBe('button');
    readiness('ready');
    const before = JSON.parse(JSON.stringify(value)), counts = workCounts();
    const pinImages = all('[data-distance-pinned-image]').map(image => image.src);
    const kept = query('[data-distance-signal-kept-label]').textContent;
    await input(fieldSelector('contrast'), 45);
    expect(query(select.preview).getAttribute('data-kind')).toBe('single');
    expect(query(select.preview).textContent).toMatch(/contrast/i);
    expect(query(select.preview).textContent).toMatch(/distance/i);
    expect(query(select.preview).textContent).toMatch(/stripe/i);
    expect(query(select.preview).closest(liveSelector)).toBeNull();
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    expect(query('[data-distance-result]')).not.toBeNull();
    expect(query('[data-distance-draft-stale]')).toBeNull(); expect(query('[data-distance-save]').disabled).toBe(false);
    expect(all('[data-distance-pinned-image]').map(image => image.src)).toEqual(pinImages);
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(kept);
    expect(query('[data-distance-note]').value).toContain('currently revealed');
    expect(value.records).toEqual([earlier]); expect(value.fieldworkResults).toEqual(results);
  });

  it('applies a valid planned factor once, preserves other evidence, and requires a fresh prediction', async () => {
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'Evidence from an earlier visit.');
    const results = { version: 1, human: savedResult('human', [80, 90]) };
    await commit({ ...value, records: [earlier], fieldworkResults: results });
    await reveal(); await activate('[data-distance-pin]');
    await activate('[data-distance-signal-read]'); await activate('[data-distance-signal-keep]');
    await input('[data-distance-note]', 'Keep this draft when I apply a changed contrast.');
    const pinImages = all('[data-distance-pinned-image]').map(image => image.src);
    const kept = query('[data-distance-signal-kept-label]').textContent, counts = workCounts();
    await input(fieldSelector('contrast'), 40); expect(workCounts()).toEqual(counts);
    await activate(select.apply);
    expect(value).toMatchObject({ distance: 80, cycles: 8, contrast: 40 });
    expect(workCounts()).toEqual({ ...counts, changes: counts.changes + 1, updates: counts.updates + 1 });
    expect(controller.getDiagnostics().settings).toMatchObject({ distance: 80, cycles: 8, contrast: 40 });
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
    expect(query('[data-distance-result]')).toBeNull(); expect(query('[data-distance-reveal]').disabled).toBe(true);
    expect(query('[data-distance-signal-evidence]')).toBeNull(); expect(query('[data-distance-signal-read]').disabled).toBe(true);
    expect(query('[data-distance-draft-stale]')).not.toBeNull();
    expect(query('[data-distance-note]').value).toContain('Keep this draft');
    expect(all('[data-distance-pinned-image]').map(image => image.src)).toEqual(pinImages);
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(kept);
    expect(value.records).toEqual([earlier]); expect(value.fieldworkResults).toEqual(results);
    readiness('ready'); expect(query(select.preview).getAttribute('data-kind')).toBe('same');
  });

  it('treats applying identical values as focus-only and preserves the exact current pixel reading and verdict', async () => {
    await reveal(); await activate('[data-distance-signal-read]');
    await activate('[data-distance-signal-range-answer="equal"]');
    await input('[data-distance-note]', 'No conditions have changed.');
    const evidence = query('[data-distance-signal-evidence]');
    const verdict = query('[data-distance-signal-range-feedback]');
    const before = JSON.parse(JSON.stringify(value)), counts = workCounts();
    await input(fieldSelector('distance'), 81); await input(fieldSelector('distance'), 80);
    expect(query(select.preview).getAttribute('data-kind')).toBe('same');
    await activate(select.apply);
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
    expect(query('[data-distance-result]')).not.toBeNull(); expect(query('[data-distance-reveal]').disabled).toBe(false);
    expect(query('[data-distance-signal-evidence]')).toBe(evidence);
    expect(query('[data-distance-signal-range-feedback]')).toBe(verdict);
    expect(query('[data-distance-draft-stale]')).toBeNull();
    expect(query('[data-distance-note]').value).toBe('No conditions have changed.');
    expect(query('[data-distance-save]').disabled).toBe(false);
  });

  it('identifies empty, fractional, nonfinite and out-of-bounds fields without applying or rounding them', async () => {
    const before = JSON.parse(JSON.stringify(value)), counts = workCounts();
    const announcement = query(select.announcement);
    expect(announcement).not.toBeNull(); expect(announcement.getAttribute('role')).toBe('status');
    expect(announcement.getAttribute('aria-live')).toBe('polite'); expect(announcement.getAttribute('aria-atomic')).toBe('true');
    expect(announcement.querySelector('input,button,textarea')).toBeNull();
    for (const [name, , min, max] of fields) {
      for (const invalid of ['', String(min - 1), String(max + 1), String(min + .5), '1e309']) {
        await activate(select.reset);
        expect(query(fieldSelector(name)).getAttribute('aria-invalid')).not.toBe('true');
        expect(query(errorSelector(name)).textContent.trim()).toBe('');
        await input(fieldSelector(name), invalid);
        expect(query(select.preview).getAttribute('data-kind')).toBe('invalid');
        expect(query(select.apply).disabled).toBe(false);
        await activate(select.apply);
        expect(query(select.announcement)).toBe(announcement);
        expect(query(fieldSelector(name)).getAttribute('aria-invalid')).toBe('true');
        const error = query(errorSelector(name));
        expect(error.textContent).toMatch(/whole/i); expect(error.textContent).toContain(String(min)); expect(error.textContent).toContain(String(max));
        describedBy(fieldSelector(name), error.id);
        expect(document.activeElement).toBe(query(fieldSelector(name)));
        expect(announcement.textContent.trim().length).toBeGreaterThan(5);
        expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
      }
    }
  });

  it('focuses the first invalid field in order and permits correction without discarding other planned values', async () => {
    const counts = workCounts();
    await input(fieldSelector('distance'), 39); await input(fieldSelector('cycles'), 21); await input(fieldSelector('contrast'), 35);
    await activate(select.apply);
    expect(document.activeElement).toBe(query(fieldSelector('distance')));
    expect(query(fieldSelector('distance')).getAttribute('aria-invalid')).toBe('true');
    expect(query(fieldSelector('cycles')).getAttribute('aria-invalid')).toBe('true');
    expect(query(fieldSelector('contrast')).getAttribute('aria-invalid')).not.toBe('true');
    await input(fieldSelector('distance'), 90); await activate(select.apply);
    expect(document.activeElement).toBe(query(fieldSelector('cycles')));
    expect(query(fieldSelector('distance')).value).toBe('90'); expect(query(fieldSelector('contrast')).value).toBe('35');
    expect(workCounts()).toEqual(counts);
    await input(fieldSelector('cycles'), 10);
    expect(query(select.preview).getAttribute('data-kind')).toBe('multiple');
    await activate(select.apply);
    expect(value).toMatchObject({ distance: 90, cycles: 10, contrast: 35 });
    expect(workCounts()).toEqual({ ...counts, changes: counts.changes + 1, updates: counts.updates + 1 });
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
  });

  it('does not overwrite a pending plan after live controls change and requires explicit local recovery', async () => {
    await input(fieldSelector('contrast'), 25);
    await input('#rh-distance-distance', 120);
    readiness('stale'); expect(query(select.preview).getAttribute('data-kind')).toBe('stale');
    expect(query(fieldSelector('distance')).value).toBe('80'); expect(query(fieldSelector('contrast')).value).toBe('25');
    const before = JSON.parse(JSON.stringify(value)), counts = workCounts();
    await act(async () => { query(select.form).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    readiness('stale');
    await activate(select.reset);
    readiness('ready'); expect(query(select.preview).getAttribute('data-kind')).toBe('same');
    for (const [name] of fields) expect(query(fieldSelector(name)).value).toBe(String(value[name]));
    expect(document.activeElement).toBe(query(fieldSelector('distance')));
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    await input(fieldSelector('contrast'), 25); await activate(select.apply);
    expect(value).toMatchObject({ distance: 120, cycles: 8, contrast: 25 });
  });

  it('tracks ordinary control changes before a draft starts and explains same, single and multiple planned changes', async () => {
    await input('#rh-distance-cycles', 12);
    for (const [name] of fields) expect(query(fieldSelector(name)).value).toBe(String(value[name]));
    readiness('ready'); expect(query(select.preview).getAttribute('data-kind')).toBe('same');
    const counts = workCounts();
    await input(fieldSelector('distance'), 160);
    expect(query(select.preview).getAttribute('data-kind')).toBe('single');
    expect(query(select.preview).textContent).toMatch(/distance/i);
    expect(query(select.preview).textContent).toMatch(/stripe/i);
    expect(query(select.preview).textContent).toMatch(/contrast/i);
    await input(fieldSelector('cycles'), 16);
    expect(query(select.preview).getAttribute('data-kind')).toBe('multiple');
    expect(query(select.preview).textContent).toMatch(/one|single|several|multiple|more than/i);
    await input(fieldSelector('cycles'), 12); await input(fieldSelector('distance'), 80);
    expect(query(select.preview).getAttribute('data-kind')).toBe('same');
    expect(workCounts()).toEqual(counts);
  });

  it('accepts both inclusive bounds exactly and never stores the planning UI in settings', async () => {
    const counts = workCounts(), initialKeys = Object.keys(value).sort();
    for (const [name, , , max] of fields) await input(fieldSelector(name), max);
    await activate(select.apply);
    expect(value).toMatchObject({ distance: 300, cycles: 20, contrast: 100 });
    expect(workCounts()).toEqual({ ...counts, changes: counts.changes + 1, updates: counts.updates + 1 });
    for (const [name, , min] of fields) await input(fieldSelector(name), min);
    await activate(select.apply);
    expect(value).toMatchObject({ distance: 40, cycles: 4, contrast: 10 });
    expect(workCounts()).toEqual({ ...counts, changes: counts.changes + 2, updates: counts.updates + 2 });
    // Existing normalization adds the stable optical model fields and records.
    expect(Object.keys(value).filter(key => !initialKeys.includes(key)).sort()).toEqual(['detailFov', 'records', 'wideFov', 'widthM']);
    for (const [name] of fields) expect(query(fieldSelector(name)).getAttribute('aria-invalid')).not.toBe('true');
  });

  it('distinguishes planned changes from pin provenance and retains the plan while the learner pins its current starter', async () => {
    const referenceSelector = '[data-distance-exact-reference]';
    let before = JSON.parse(JSON.stringify(value)), counts = workCounts();
    await input(fieldSelector('contrast'), 25);
    expect(query(select.preview).querySelector('strong').textContent).toBe('Changes from the current conditions');
    expect(query(select.preview).getAttribute('data-kind')).toBe('single');
    expect(query(referenceSelector).getAttribute('data-distance-exact-reference')).toBe('missing');
    expect(query(referenceSelector).textContent).toMatch(/predict.*reveal.*pin.*before applying/i);
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    await reveal(); counts = workCounts(); await activate('[data-distance-pin]');
    expect(query(referenceSelector).getAttribute('data-distance-exact-reference')).toBe('matching');
    expect(query(referenceSelector).textContent).toMatch(/pin matches the current conditions/i);
    expect(query(fieldSelector('contrast')).value).toBe('25');
    expect(value).toEqual(before); expect(workCounts()).toEqual({ ...counts, captures: counts.captures + 2 });

    await input('#rh-distance-distance', 160); await activate(select.reset);
    before = JSON.parse(JSON.stringify(value)); counts = workCounts();
    await input(fieldSelector('contrast'), 25);
    expect(query(select.preview).getAttribute('data-kind')).toBe('single');
    expect(query(select.preview).textContent).toMatch(/display contrast/);
    expect(query(referenceSelector).getAttribute('data-distance-exact-reference')).toBe('different');
    expect(query(referenceSelector).textContent).toMatch(/pin uses different conditions/i);
    expect(query(referenceSelector).textContent).toMatch(/reveal and pin the current conditions before applying/i);
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    const previousPin = all('[data-distance-pinned-image]').map(image => image.src);
    await reveal(); counts = workCounts(); await activate('[data-distance-pin]');
    expect(query(referenceSelector).getAttribute('data-distance-exact-reference')).toBe('matching');
    expect(query(fieldSelector('distance')).value).toBe('160'); expect(query(fieldSelector('cycles')).value).toBe('8');
    expect(query(fieldSelector('contrast')).value).toBe('25');
    expect(all('[data-distance-pinned-image]').map(image => image.src)).not.toEqual(previousPin);
    expect(query(select.preview).getAttribute('data-kind')).toBe('single'); readiness('ready');
    expect(value).toEqual(before); expect(workCounts()).toEqual({ ...counts, captures: counts.captures + 2 });
  });

  it('focuses reset values only after replacing a stale plan and removing the old validation descriptions', async () => {
    await input(fieldSelector('contrast'), 9); await activate(select.apply);
    expect(query(fieldSelector('distance')).value).toBe('80');
    expect(query(fieldSelector('contrast')).getAttribute('aria-invalid')).toBe('true');
    expect(query(errorSelector('contrast')).textContent).toMatch(/whole number/i);
    await input('#rh-distance-distance', 120); readiness('stale');
    expect(query(fieldSelector('distance')).value).toBe('80');
    const observed = [], distance = query(fieldSelector('distance'));
    query(select.reset).focus();
    distance.addEventListener('focus', () => observed.push({
      distance: distance.value, contrast: query(fieldSelector('contrast')).value,
      invalidDistance: distance.getAttribute('aria-invalid'), invalidContrast: query(fieldSelector('contrast')).getAttribute('aria-invalid'),
      contrastError: query(errorSelector('contrast')).textContent
    }));
    const before = JSON.parse(JSON.stringify(value)), counts = workCounts();
    await activate(select.reset);
    expect(observed).toEqual([{ distance: '120', contrast: '95', invalidDistance: null, invalidContrast: null, contrastError: '' }]);
    expect(document.activeElement).toBe(distance); readiness('ready');
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
  });

  it('allows local planning during scene failure and loading while preventing application until recovery', async () => {
    await input('[data-distance-note]', 'A draft survives renderer recovery.');
    controller.update.mockImplementationOnce(() => { throw new Error('Renderer unavailable'); });
    await commit({ ...value, distance: 90 }); readiness('error');
    await activate(select.reset); await input(fieldSelector('distance'), 125);
    let before = JSON.parse(JSON.stringify(value)), counts = workCounts();
    await act(async () => { query(select.form).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    const wait = deferred(); loadResources.mockImplementationOnce(() => wait.promise);
    await activate('[data-distance-retry]'); readiness('loading');
    expect(query(fieldSelector('distance')).value).toBe('125');
    counts = workCounts(); await input(fieldSelector('contrast'), 40);
    await act(async () => { query(select.form).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    await act(async () => { wait.resolve(); await wait.promise; });
    readiness('ready'); expect(query(fieldSelector('distance')).value).toBe('125'); expect(query(fieldSelector('contrast')).value).toBe('40');
    expect(query('[data-distance-note]').value).toBe('A draft survives renderer recovery.');
    counts = workCounts(); await activate(select.apply);
    expect(value).toMatchObject({ distance: 125, cycles: 8, contrast: 40 });
    expect(workCounts()).toEqual({ ...counts, changes: counts.changes + 1, updates: counts.updates + 1 });
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
  });
});
