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
  plan: '[data-distance-trial-plan]', input: '[data-distance-trial-distance]', apply: '[data-distance-trial-apply]',
  suggest: '[data-distance-trial-suggest]', suggestion: '[data-distance-trial-suggestion]',
  record: '[data-distance-fieldwork-record]', readiness: '[data-distance-fieldwork-readiness]',
  next: '[data-distance-fieldwork-next]', save: '[data-distance-results-save]'
};

let local, host, root, controller, controllers, capture, readback, contexts, changes, value, loadResources, actDescriptor;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
function distances() { return all('[data-distance-fieldwork-trial]').map(row => Number(row.getAttribute('data-distance'))); }
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
async function start(id = 'human') {
  if (!query('[data-distance-fieldwork]').open) await activate('[data-distance-fieldwork] > summary');
  await activate(`[data-distance-fieldwork-start="${id}"]`);
}
async function reveal() {
  await activate(`[data-distance-prediction="${local.RaptorDistanceModel.metrics(value).referenceBand}"]`);
  await activate('[data-distance-reveal]');
}
async function recordAt(distance) {
  await input(select.input, distance); await activate(select.apply); await reveal(); await activate(select.record);
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
  expect(element.id).toBe('rh-distance-fieldwork-readiness');
  expect(element.getAttribute('data-state')).toBe(state);
  expect(element.textContent.trim().length).toBeGreaterThan(10);
  describedBy(select.record, element.id);
  if (query('[data-distance-fieldwork-record-inline]')) describedBy('[data-distance-fieldwork-record-inline]', element.id);
  expect(query(select.record).disabled).toBe(state !== 'ready');
  expect(query(select.apply).disabled).toBe(['error', 'loading', 'held'].includes(state));
  if (['loading', 'ready'].includes(state)) expect(query(select.next)).toBeNull();
  else expect(query(select.next)).not.toBeNull();
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

describe('Raptor distance trial planning and range-finding guidance in React', () => {
  it('keeps planning local and clearly labelled while preserving revealed, pinned, pixel and written evidence', async () => {
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'An earlier notebook observation.');
    const results = { version: 1, eagle: savedResult('eagle', [200, 201]) };
    await commit({ ...value, records: [earlier], fieldworkResults: results });
    await start(); await reveal(); await activate('[data-distance-pin]');
    await activate('[data-distance-jump="signal"]'); await activate('[data-distance-signal-read]');
    await activate('[data-distance-signal-keep]');
    const note = 'I will test another distance while keeping the same pattern.';
    await input('[data-distance-note]', note);
    const plan = query(select.plan), distanceInput = query(select.input);
    expect(plan.tagName).toBe('FORM'); expect(plan.noValidate).toBe(true);
    expect(plan.querySelector('h5').textContent).toBe('Plan your next trial');
    expect(query('label[for="rh-distance-trial-distance"]').textContent).toBe('Next trial distance (metres)');
    expect(distanceInput.id).toBe('rh-distance-trial-distance');
    expect(distanceInput.type).toBe('number'); expect(distanceInput.min).toBe('40');
    expect(distanceInput.max).toBe('300'); expect(distanceInput.step).toBe('1');
    describedBy(select.input, 'rh-distance-trial-help'); describedBy(select.input, 'rh-distance-trial-error');
    expect(query(select.apply).type).toBe('submit');
    const pins = all('[data-distance-pinned-image]').map(image => image.src);
    const kept = query('[data-distance-signal-kept-label]').textContent, counts = workCounts();
    const before = JSON.parse(JSON.stringify(value));
    await input(select.input, '125');
    expect(query(select.input).value).toBe('125');
    expect(query('[data-distance-trial-current]').textContent).toContain('40');
    expect(query('[data-distance-trial-current]').closest(liveSelector)).toBeNull();
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    expect(query('[data-distance-draft-stale]')).toBeNull(); expect(query('[data-distance-save]').disabled).toBe(false);
    await activate(select.suggest);
    expect(query(select.input).value).toBe('40'); expect(document.activeElement).toBe(distanceInput);
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
    expect(all('[data-distance-pinned-image]').map(image => image.src)).toEqual(pins);
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(kept);
    expect(query('[data-distance-note]').value).toBe(note); expect(query('[data-distance-draft-stale]')).toBeNull();
    expect(distances()).toEqual([]); expect(value.records).toEqual([earlier]); expect(value.fieldworkResults).toEqual(results);
  });

  it('explains invalid whole-metre entries only after submission and never clamps or applies them', async () => {
    await start();
    const announcement = query('[data-distance-announcement="trial-input"]');
    expect(announcement).not.toBeNull(); expect(announcement.getAttribute('role')).toBe('status');
    expect(announcement.getAttribute('aria-live')).toBe('polite'); expect(announcement.getAttribute('aria-atomic')).toBe('true');
    expect(announcement.querySelector('#rh-distance-trial-error')).not.toBeNull();
    expect(announcement.querySelector(liveSelector)).toBeNull(); expect(announcement.textContent).toBe('');
    const counts = workCounts(), before = JSON.parse(JSON.stringify(value));
    for (const invalid of ['', '39', '301', '80.5', '1e309', 'not a number']) {
      await input(select.input, '80');
      expect(query(select.input).getAttribute('aria-invalid')).not.toBe('true'); expect(announcement.textContent).toBe('');
      await input(select.input, invalid);
      expect(query(select.apply).disabled).toBe(false); expect(announcement.textContent).toBe('');
      await activate(select.apply);
      expect(query('[data-distance-announcement="trial-input"]')).toBe(announcement);
      expect(query(select.input).getAttribute('aria-invalid')).toBe('true');
      expect(announcement.textContent).toMatch(/whole/i); expect(announcement.textContent).toContain('40'); expect(announcement.textContent).toContain('300');
      expect(document.activeElement).toBe(query(select.input));
      expect(value).toEqual(before); expect(workCounts()).toEqual(counts); expect(distances()).toEqual([]);
    }
    await activate(select.suggest);
    expect(announcement.textContent).toBe(''); expect(query(select.input).getAttribute('aria-invalid')).not.toBe('true');
    expect(value).toEqual(before); expect(workCounts()).toEqual(counts);
  });

  it('applies distance only on explicit submission and treats the unchanged distance as a focus-only action', async () => {
    await start(); await reveal();
    await input('[data-distance-note]', 'My draft belongs to the revealed forty-metre condition.');
    const counts = workCounts();
    await activate(select.apply);
    expect(workCounts()).toEqual(counts); expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
    expect(query(select.record).disabled).toBe(false); expect(query('[data-distance-draft-stale]')).toBeNull();
    await input(select.input, '120'); expect(workCounts()).toEqual(counts);
    await activate(select.apply);
    expect(value).toMatchObject({ distance: 120, cycles: 12, contrast: 95 });
    expect(changes).toHaveBeenCalledTimes(counts.changes + 1);
    expect(controller.getDiagnostics().settings.distance).toBe(120);
    expect(workCounts().captures).toBe(counts.captures); expect(workCounts().reads).toBe(counts.reads);
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
    expect(query('[data-distance-reveal]').disabled).toBe(true); expect(query(select.record).disabled).toBe(true);
    expect(query('[data-distance-draft-stale]')).not.toBeNull();
    expect(query('[data-distance-note]').value).toContain('forty-metre'); expect(distances()).toEqual([]);
  });

  it('suggests uncollected trials from sampled endpoints, supports refinement and stops at adjacent whole metres', async () => {
    await start();
    expect(query(select.suggestion).textContent).toContain('40');
    await reveal(); await activate(select.record);
    expect(distances()).toEqual([40]); expect(query(select.suggestion).textContent).toContain('300');
    let counts = workCounts();
    await activate(select.suggest);
    expect(query(select.input).value).toBe('300'); expect(value.distance).toBe(40); expect(workCounts()).toEqual(counts);
    await activate(select.apply); expect(distances()).toEqual([40]);
    await reveal(); await activate(select.record);
    await activate(select.suggest); expect(query(select.input).value).toBe('170');
    expect(value.distance).toBe(300); expect(distances()).toEqual([40, 300]);
    await recordAt(80); await recordAt(90);
    expect(query('[data-distance-fieldwork-status]').getAttribute('data-complete')).toBe('true');
    expect(query(select.save).disabled).toBe(false);
    counts = workCounts(); await activate(select.suggest);
    expect(query(select.input).value).toBe('85'); expect(workCounts()).toEqual(counts);
    await activate(select.apply); await reveal(); await activate(select.record);
    await activate(select.suggest); expect(query(select.input).value).toBe('87');
    await recordAt(86);
    expect(distances()).toEqual([40, 300, 80, 90, 85, 86]);
    expect(query(select.suggest)).toBeNull(); expect(query(select.suggestion).textContent).toMatch(/whole.metre|1 m|one.metre/i);
    expect(query('[data-distance-fieldwork-status]').getAttribute('data-complete')).toBe('true');
    expect(query(select.save).disabled).toBe(false); expect(value.fieldworkResults).toBeUndefined();
  });

  it('searches toward the lower boundary when only above-reference evidence exists and resets unapplied plans on distance or run changes', async () => {
    await start('eagle'); await recordAt(300);
    await activate(select.suggest); expect(query(select.input).value).toBe('40');
    expect(value.distance).toBe(300); expect(distances()).toEqual([300]);
    await input(select.input, '150'); await commit({ ...value, distance: 220 });
    expect(query(select.input).value).toBe('220'); expect(distances()).toEqual([300]);
    await input(select.input, '160'); await commit({ ...value, contrast: 80 });
    expect(query(select.input).value).toBe('160');
    await start('eagle'); expect(query(select.input).value).toBe('40'); expect(distances()).toEqual([]);
    await input(select.input, '75'); await start('eagle');
    expect(query(select.input).value).toBe('40'); expect(distances()).toEqual([]);
    await activate('[data-distance-fieldwork-exit]'); expect(query(select.plan)).toBeNull();
    await start('human'); expect(query(select.input).value).toBe('40'); expect(distances()).toEqual([]);
  });

  it('describes recording prerequisites and restores held variables with a stable recovery focus', async () => {
    await start(); readiness('prediction');
    let counts = workCounts(); await activate(select.next);
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]')); expect(workCounts()).toEqual(counts);
    await reveal(); readiness('ready');
    await commit({ ...value, distance: 110, cycles: 16, contrast: 25 }); await reveal(); readiness('held');
    counts = workCounts(); await activate(select.next);
    expect(document.activeElement).toBe(query('[data-distance-fieldwork-restore]')); expect(workCounts()).toEqual(counts);
    await activate('[data-distance-fieldwork-restore]');
    expect(value).toMatchObject({ distance: 110, cycles: 12, contrast: 95 });
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
    expect(query('[data-distance-fieldwork-restore]')).toBeNull(); readiness('prediction');
    expect(distances()).toEqual([]); await reveal(); readiness('ready');
    await activate('[data-distance-fieldwork-record-inline]');
    expect(distances()).toEqual([110]); expect(document.activeElement).toBe(query('[data-distance-fieldwork-status]'));
  });

  it('explains result completion and keeps collected evidence independently of current controls or a failed scene', async () => {
    const eagle = savedResult('eagle', [200, 201]);
    await commit({ ...value, fieldworkResults: { version: 1, eagle } }); await start();
    describedBy(select.save, 'rh-distance-result-readiness');
    expect(query('[data-distance-result-readiness]').textContent).toMatch(/10/); expect(query(select.save).disabled).toBe(true);
    await recordAt(80); expect(query(select.save).disabled).toBe(true);
    await recordAt(90); expect(query(select.save).disabled).toBe(false);
    const expected = savedResult('human', [80, 90]);
    controller.update.mockImplementationOnce(() => { throw new Error('Scene update unavailable'); });
    await commit({ ...value, distance: 300, cycles: 20, contrast: 25 }); readiness('error');
    expect(query(select.save).disabled).toBe(false);
    expect(query('[data-distance-result-readiness]').textContent).toMatch(/collected|completed/i);
    const counts = workCounts(); await activate(select.save);
    expect(value).toMatchObject({ distance: 300, cycles: 20, contrast: 25 });
    expect(value.fieldworkResults).toEqual({ version: 1, eagle, human: expected });
    expect(workCounts()).toEqual({ ...counts, changes: counts.changes + 1 });
    expect(distances()).toEqual([80, 90]);
  });

  it('offers scene recovery without changing a trial and explains waiting while resources reload', async () => {
    await start(); await recordAt(40);
    controller.update.mockImplementationOnce(() => { throw new Error('Renderer unavailable'); });
    await commit({ ...value, distance: 70 }); readiness('error');
    let counts = workCounts(); await activate(select.next);
    expect(document.activeElement).toBe(query('[data-distance-retry]')); expect(workCounts()).toEqual(counts);
    const wait = deferred(); loadResources.mockImplementationOnce(() => wait.promise);
    await activate('[data-distance-retry]'); readiness('loading');
    expect(document.activeElement).toBe(query('[data-distance-status]'));
    expect(distances()).toEqual([40]); expect(query(select.input).value).toBe('70');
    counts = workCounts(); await act(async () => { wait.resolve(); });
    readiness('prediction'); expect(value.distance).toBe(70); expect(distances()).toEqual([40]);
    expect(workCounts().changes).toBe(counts.changes); expect(workCounts().captures).toBe(counts.captures);
    expect(query('[data-distance-reveal]').disabled).toBe(true);
    await activate(select.next); expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
  });
});
