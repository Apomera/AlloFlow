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
  explorer: '[data-distance-signal-explorer]', read: '[data-distance-signal-read]', keep: '[data-distance-signal-keep]',
  next: '[data-distance-signal-next]', probe: '[data-distance-signal-probe]', feedback: '[data-distance-signal-range-feedback]'
};
let local, host, root, controller, controllers, contexts, capture, readback, changes, close, value, loadResources;
let failCapture, failRead, rows, actDescriptor;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
async function activate(selector) {
  const element = query(selector);
  expect(element, selector).not.toBeNull();
  if ('disabled' in element) expect(element.disabled, selector).toBe(false);
  await act(async () => { element.click(); });
}
async function reveal(prediction = 'both') {
  await activate(`[data-distance-prediction="${prediction}"]`);
  await activate('[data-distance-reveal]');
}
async function inspect() {
  await reveal();
  if (!query('[data-distance-signal]').open) await activate('[data-distance-signal] > summary');
  await activate(select.read);
  await activate(`${select.explorer} > summary`);
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
function counts() {
  return { reads: readback.mock.calls.length, captures: capture.mock.calls.length,
    updates: controllers.reduce((sum, item) => sum + item.update.mock.calls.length, 0), changes: changes.mock.calls.length };
}
function sample(name, index) {
  const entry = rows[name][index % rows[name].length];
  return Array.isArray(entry) ? entry : [entry, entry, entry];
}
function mean(name, index) { return sample(name, index).reduce((sum, channel) => sum + channel, 0) / 3; }
function assertProbe(index, region) {
  expect(query(select.probe).value).toBe(String(index));
  expect(Number(query('[data-distance-signal-pixel]').getAttribute('data-x'))).toBe(region.x0 + index);
  for (const [id, name] of [['human', 'reference'], ['eagle', 'eagle']]) {
    expect(query(`[data-distance-signal-value="${id}"]`).textContent).toBe(mean(name, index).toFixed(1));
    expect(Number(query(`[data-distance-signal-marker="${id}"]`).getAttribute('cx'))).toBe(region.x0 + index);
  }
}
function assertReadiness(state) {
  const reason = query('[data-distance-signal-readiness]');
  expect(reason).not.toBeNull();
  expect(reason.id).toBe('rh-distance-signal-readiness');
  expect(reason.getAttribute('data-state')).toBe(state);
  expect(reason.textContent.trim().length).toBeGreaterThan(12);
  for (const selector of [select.read, select.keep]) {
    expect(query(selector).getAttribute('aria-describedby').split(/\s+/)).toContain(reason.id);
  }
  expect(query(select.read).disabled).toBe(!['read', 'ready'].includes(state));
  expect(query(select.keep).disabled).toBe(state !== 'ready');
  expect(!!query(select.next)).toBe(!['loading', 'ready'].includes(state));
}
function savedResult() {
  const trials = [80, 90].map(distance => {
    const settings = { version: 1, distance, cycles: 12, contrast: 95 };
    return local.RaptorDistanceFieldwork.trial(settings, local.RaptorDistanceModel.metrics(settings).referenceBand);
  });
  return { version: 1, human: local.RaptorDistanceResults.capture('human', trials) };
}
function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}
function Host(props) {
  React.useLayoutEffect(() => { if (props.beforePassiveEffects) props.beforePassiveEffects(); },
    [props.settings, props.beforePassiveEffects]);
  return h(local.RaptorDistanceStudy.Component, { React, settings: props.settings, loadResources, onClose: close, onChange: changes });
}
async function commit(settings, beforePassiveEffects) {
  value = settings;
  await act(async () => { root.render(h(Host, { settings: value, beforePassiveEffects })); });
}

beforeEach(async () => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  local = {}; sources.forEach(source => Function('window', source)(local));
  controller = null; controllers = []; contexts = new Map(); failCapture = false; failRead = null;
  // Repeated extrema deliberately distinguish first-match navigation from a
  // last-match search. The rows do not resemble the model's sinusoidal filter.
  rows = { reference: [100, 90, 130, 90, 130], eagle: [90, 120, 30, 60, 210, 30, 210] };
  loadResources = vi.fn(() => Promise.resolve());
  capture = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    if (failCapture) throw new Error('Image copying unavailable');
    return 'data:image/png;base64,' + Buffer.from(`${this.getAttribute('data-distance-canvas')}|${this.getAttribute('data-test-rendered')}`).toString('base64');
  });
  readback = vi.fn((name, x, y, width, height) => {
    if (failRead === name) throw new Error('Pixel access unavailable');
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < width * height; index++) {
      const rgb = sample(name, index);
      for (let channel = 0; channel < 3; channel++) data[index * 4 + channel] = rgb[channel];
      data[index * 4 + 3] = 255;
    }
    return { data, width, height };
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) {
      const canvas = this;
      contexts.set(canvas, { getImageData: (x, y, width, height) => readback(canvas.getAttribute('data-distance-canvas'), x, y, width, height) });
    }
    return contexts.get(this);
  });
  local.RaptorDistanceScene = { create: vi.fn(options => {
    let rendered = null;
    controller = {
      update: vi.fn(settings => {
        rendered = local.RaptorDistanceModel.normalize(settings);
        for (const canvas of [options.wideCanvas, options.referenceCanvas, options.eagleCanvas]) canvas.setAttribute('data-test-rendered', condition(rendered));
        return { settings: { ...rendered } };
      }),
      getDiagnostics: () => ({ settings: rendered && { ...rendered } }), dispose: vi.fn()
    };
    controllers.push(controller); return controller;
  }) };
  changes = vi.fn(next => { value = next; root.render(h(Host, { settings: value })); });
  close = vi.fn(() => { root.render(null); });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await commit({ ...initial });
  expect(query('[data-raptor-distance-study]').getAttribute('data-render-ready')).toBe('true');
});

afterEach(async () => {
  try {
    if (root) await act(async () => { root.unmount(); });
    for (const item of controllers) expect(item.dispose).toHaveBeenCalledTimes(1);
  } finally {
    if (host) host.remove();
    vi.restoreAllMocks(); root = null; controller = null; controllers = []; contexts = null; local = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Raptor distance accessible measured-value explorer', () => {
  it('presents actual sampled extrema and ranges in a captioned semantic table with instructions', async () => {
    rows.reference = [[90, 90, 91], [130, 130, 132], [100, 100, 100]];
    await inspect();
    const table = query('[data-distance-signal-extremes]');
    expect(table.tagName).toBe('TABLE');
    expect(table.caption.textContent.trim().length).toBeGreaterThan(10);
    expect([...table.querySelectorAll('thead th[scope="col"]')].map(cell => cell.textContent)).toEqual(['Measure', 'Human', 'Eagle']);
    expect([...table.querySelectorAll('tbody th[scope="row"]')].map(cell => cell.textContent)).toEqual(['Lowest', 'Highest', 'Range']);
    for (const [id, expected] of [['human-min', 271 / 3], ['human-max', 392 / 3], ['eagle-min', 30], ['eagle-max', 210]]) {
      const cell = query(`[data-distance-signal-extreme="${id}"]`);
      expect(Number(cell.getAttribute('data-value'))).toBeCloseTo(expected, 10);
      expect(cell.textContent).toContain(expected.toFixed(1));
    }
    expect(query('[data-distance-signal-explorer-range="human"]').textContent).toContain((121 / 3).toFixed(1));
    expect(query('[data-distance-signal-explorer-range="eagle"]').textContent).toContain('180.0');
    expect(query('#rh-distance-signal-explore-help').textContent.trim().length).toBeGreaterThan(20);
    expect(query(select.probe).getAttribute('aria-describedby').split(/\s+/)).toContain('rh-distance-signal-explore-help');
    expect(query(`${select.explorer} > summary`).textContent).toBe('Explore the measured values · Find the light–dark range');
  });

  it('jumps to tied extrema and endpoints with updated probe focus while preserving working and saved evidence', async () => {
    const record = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'Earlier observation.');
    const results = savedResult();
    await commit({ ...initial, records: [record], fieldworkResults: results });
    await reveal(); await activate('[data-distance-pin]'); await activate(select.read); await activate(select.keep);
    await activate(`${select.explorer} > summary`);
    await input('[data-distance-note]', 'The measured ranges differ at the same conditions.');
    const pinned = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));
    const keptLabel = query('[data-distance-signal-kept-label]').textContent;
    const before = counts(), region = local.RaptorDistanceSignal.region(value, 1024, 512);
    const destinations = { start: 0, middle: Math.floor((region.count - 1) / 2), end: region.count - 1,
      'human-min': 1, 'human-max': 2, 'eagle-min': 2, 'eagle-max': 4 };
    expect(all('[data-distance-signal-jump]')).toHaveLength(7);
    for (const [id, index] of Object.entries(destinations)) {
      const button = query(`[data-distance-signal-jump="${id}"]`);
      expect(button.getAttribute('aria-describedby').split(/\s+/)).toContain('rh-distance-signal-explore-help');
      await activate(`[data-distance-signal-jump="${id}"]`);
      assertProbe(index, region);
      expect(document.activeElement).toBe(query(select.probe));
      expect(query(select.probe).getAttribute('aria-valuetext')).toContain(`Image pixel ${region.x0 + index}`);
    }
    expect(counts()).toEqual(before);
    expect(query('[data-distance-note]').value).toBe('The measured ranges differ at the same conditions.');
    expect(query('[data-distance-draft-stale]')).toBeNull();
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinned);
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(keptLabel);
    expect(value.records).toEqual([record]); expect(value.fieldworkResults).toEqual(results);
  });

  it('checks the measured range answer against eagle, reversed human, and equal flat rows', async () => {
    await inspect();
    const group = query('[data-distance-signal-range-answer="human"]').closest('[role="group"]');
    expect(group.getAttribute('aria-labelledby')).toBe('rh-distance-signal-range-question');
    expect(query('#rh-distance-signal-range-question').textContent.trim().length).toBeGreaterThan(12);
    const live = query('[data-distance-announcement="signal-range"]');
    expect(live.getAttribute('role')).toBe('status'); expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.getAttribute('aria-atomic')).toBe('true'); expect(live.querySelector(liveSelector)).toBeNull();
    expect(query(select.feedback)).toBeNull();
    const before = counts();
    await activate('[data-distance-signal-range-answer="human"]');
    expect(query(select.feedback).getAttribute('data-correct')).toBe('false');
    await activate('[data-distance-signal-range-answer="eagle"]');
    expect(query(select.feedback).getAttribute('data-correct')).toBe('true');
    expect(query('[data-distance-signal-range-answer="eagle"]').getAttribute('aria-pressed')).toBe('true');
    expect(query('[data-distance-signal-range-answer="human"]').getAttribute('aria-pressed')).toBe('false');
    expect(query('[data-distance-announcement="signal-range"]')).toBe(live);
    expect(counts()).toEqual(before);
    rows = { reference: [0, 240, 40], eagle: [100, 110, 100] };
    await activate(select.read);
    expect(query(select.feedback)).toBeNull();
    await activate('[data-distance-signal-range-answer="human"]');
    expect(query(select.feedback).getAttribute('data-correct')).toBe('true');
    rows = { reference: [110], eagle: [170] };
    await activate(select.read);
    await activate('[data-distance-signal-range-answer="equal"]');
    expect(query(select.feedback).getAttribute('data-correct')).toBe('true');
    expect(query('[data-distance-signal-explorer-range="human"]').textContent).toContain('0.0');
    expect(query('[data-distance-signal-explorer-range="eagle"]').textContent).toContain('0.0');
    for (const id of ['human-min', 'human-max', 'eagle-min', 'eagle-max']) {
      await activate(`[data-distance-signal-jump="${id}"]`); expect(query(select.probe).value).toBe('0');
    }
  });

  it('retains the answer for display exploration and kept-reading replacement but invalidates every fresh or failed read', async () => {
    await inspect(); await activate('[data-distance-signal-range-answer="eagle"]');
    const feedback = query(select.feedback), answer = feedback.textContent;
    await input(select.probe, 3); await activate('[data-distance-signal-jump="end"]');
    await activate(select.keep); await activate(select.keep);
    expect(query(select.feedback)).toBe(feedback); expect(query(select.feedback).textContent).toBe(answer);
    await activate(select.read);
    expect(query(select.feedback)).toBeNull();
    for (const button of all('[data-distance-signal-range-answer]')) expect(button.getAttribute('aria-pressed')).toBe('false');
    await activate('[data-distance-signal-range-answer="eagle"]');
    await activate('[data-distance-reveal]');
    expect(query(select.explorer)).toBeNull(); expect(query(select.feedback)).toBeNull();
    await activate(select.read); await activate('[data-distance-signal-range-answer="eagle"]');
    failRead = 'eagle'; await activate(select.read);
    expect(query('[data-distance-signal-error]')).not.toBeNull();
    expect(query(select.explorer)).toBeNull(); expect(query(select.feedback)).toBeNull();
    expect(query('[data-distance-signal-kept-label]')).not.toBeNull();
    failRead = null; await activate(select.read);
    expect(query(select.feedback)).toBeNull();
    await activate('[data-distance-signal-range-answer="eagle"]');
    await activate('[data-distance-prediction="eagle"]');
    expect(query(select.explorer)).toBeNull(); expect(query(select.feedback)).toBeNull();
    failCapture = true; await activate('[data-distance-reveal]');
    expect(query(select.explorer)).toBeNull(); expect(query(select.feedback)).toBeNull();
    failCapture = false; await activate('[data-distance-reveal]'); await activate(select.read);
    expect(query(select.feedback)).toBeNull();
  });

  it('withholds stale measured answers on changed props before the passive scene update', async () => {
    await inspect(); await activate('[data-distance-signal-range-answer="eagle"]');
    const timing = {}, before = counts();
    await commit({ ...value, distance: 160 }, () => {
      timing.distance = query('#rh-distance-distance').value;
      timing.renderedDistance = controller.getDiagnostics().settings.distance;
      timing.explorer = !!query(select.explorer); timing.answer = !!query(select.feedback);
      timing.readDisabled = query(select.read).disabled;
      query(select.read).click();
    });
    expect(timing).toEqual({ distance: '160', renderedDistance: 80, explorer: false, answer: false, readDisabled: true });
    expect(readback).toHaveBeenCalledTimes(before.reads);
    await reveal('eagle'); await activate(select.read);
    expect(query(select.feedback)).toBeNull();
    await activate('[data-distance-signal-range-answer="eagle"]');
    const feedback = query(select.feedback);
    await commit({ ...value });
    expect(query(select.feedback)).toBe(feedback);
  });

  it('associates read and keep prerequisites with focus-only prediction, copy recovery, and read destinations', async () => {
    assertReadiness('prediction');
    let before = counts();
    await activate(select.next);
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
    expect(counts()).toEqual(before);
    failCapture = true; await reveal(); assertReadiness('copy');
    before = counts(); await activate(select.next);
    expect(document.activeElement).toBe(query('[data-distance-reveal]')); expect(counts()).toEqual(before);
    failCapture = false; await activate('[data-distance-reveal]'); assertReadiness('read');
    before = counts(); await activate(select.next);
    expect(document.activeElement).toBe(query(select.read)); expect(counts()).toEqual(before);
    expect(query('[data-distance-signal]').open).toBe(true);
    await activate(select.read); assertReadiness('ready');
    failRead = 'reference'; await activate(select.read); assertReadiness('read');
    before = counts(); await activate(select.next);
    expect(document.activeElement).toBe(query(select.read)); expect(counts()).toEqual(before);
  });

  it('provides scene recovery focus and loading guidance while keeping a draft and previous pixel reading', async () => {
    await inspect(); await activate(select.keep); await input('[data-distance-note]', 'A draft survives scene recovery.');
    const keptLabel = query('[data-distance-signal-kept-label]').textContent;
    controller.update.mockImplementationOnce(() => { throw new Error('Scene update unavailable'); });
    await commit({ ...value, distance: 90 }); assertReadiness('error');
    const before = counts(); await activate(select.next);
    expect(document.activeElement).toBe(query('[data-distance-retry]')); expect(counts()).toEqual(before);
    const pending = deferred(); loadResources.mockImplementationOnce(() => pending.promise);
    await activate('[data-distance-retry]'); assertReadiness('loading');
    expect(query(select.next)).toBeNull();
    await act(async () => { pending.resolve(); await pending.promise; });
    assertReadiness('prediction');
    expect(query('[data-distance-note]').value).toBe('A draft survives scene recovery.');
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(keptLabel);
    expect(query(select.explorer)).toBeNull();
  });

  it('restores matching held variables and focuses the neutral prediction heading without collecting evidence', async () => {
    const record = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'Saved before matching.');
    const results = savedResult();
    await commit({ ...initial, records: [record], fieldworkResults: results });
    await activate('[data-distance-match-start]'); await reveal(); await activate('[data-distance-pin]');
    await activate(select.read); await activate(select.keep);
    await input('[data-distance-note]', 'Match challenge draft.');
    await commit({ ...value, cycles: 10, contrast: 40 });
    const pinned = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));
    const keptLabel = query('[data-distance-signal-kept-label]').textContent;
    const before = counts();
    query('[data-distance-match-restore]').focus();
    await activate('[data-distance-match-restore]');
    expect(query('[data-distance-match-restore]')).toBeNull();
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
    expect(value).toMatchObject({ distance: 60, cycles: 8, contrast: 95 });
    expect(query('[data-distance-result]')).toBeNull(); expect(query(select.explorer)).toBeNull();
    expect(readback).toHaveBeenCalledTimes(before.reads); expect(capture).toHaveBeenCalledTimes(before.captures);
    expect(changes).toHaveBeenCalledTimes(before.changes + 1);
    expect(query('[data-distance-note]').value).toBe('Match challenge draft.');
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinned);
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(keptLabel);
    expect(value.records).toEqual([record]); expect(value.fieldworkResults).toEqual(results);
  });
});
