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
const comparisonSelector = '[data-distance-text-comparison]';
const destinations = {
  conditions: '#rh-distance-distance', prediction: '[data-distance-prediction-heading]',
  inspector: '[data-distance-inspector] > summary', signal: '[data-distance-signal] > summary',
  notebook: '[data-distance-note]'
};

let local, host, root, controller, controllers, capture, readback, contexts, failCapture, changes, close, value, actDescriptor;
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
async function writeNote(text) {
  const textarea = query('[data-distance-note]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function openComparison() {
  if (!query('[data-distance-inspector]').open) await activate('[data-distance-jump="inspector"]');
  if (!query(comparisonSelector).open) await activate(`${comparisonSelector} > summary`);
}
function assertTextComparison(settings, source) {
  const panel = query(comparisonSelector), metrics = local.RaptorDistanceModel.metrics(settings);
  expect(panel).not.toBeNull();
  expect(query('[data-distance-text-condition]').textContent).toContain(source);
  for (const text of [`${settings.distance} m`, `${settings.cycles} stripe pairs`, `${settings.contrast}%`]) {
    expect(query('[data-distance-text-condition]').textContent).toContain(text);
  }
  const rows = [...panel.querySelectorAll('[data-distance-text-reference]')];
  expect(rows).toHaveLength(2);
  expect(panel.querySelector('table')).not.toBeNull();
  expect(panel.querySelector('caption')).not.toBeNull();
  expect(panel.querySelectorAll('th[scope="col"]').length).toBeGreaterThanOrEqual(2);
  for (const id of ['human', 'eagle']) {
    const row = panel.querySelector(`[data-distance-text-reference="${id}"]`);
    const transfer = row.querySelector(`[data-distance-text-transfer="${id}"]`);
    const expected = id === 'human' ? metrics.referenceTransfer : metrics.eagleTransfer;
    expect(row.tagName).toBe('TR');
    expect(row.querySelector('th[scope="row"]').textContent).toMatch(id === 'human' ? /Human/ : /Eagle/i);
    expect(row.textContent).toContain(String(id === 'human' ? metrics.referenceLimit : metrics.eagleLimit));
    expect(Number(transfer.getAttribute('data-transfer'))).toBeCloseTo(expected, 14);
    expect(transfer.textContent).toContain(`${(expected * 100).toFixed(1)}%`);
  }
}
function Host(props) {
  React.useLayoutEffect(() => { if (props.beforePassiveEffects) props.beforePassiveEffects(); },
    [props.settings, props.beforePassiveEffects]);
  return h(local.RaptorDistanceStudy.Component, {
    React, settings: props.settings, loadResources: () => Promise.resolve(), onClose: close, onChange: changes
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
  controller = null; controllers = []; contexts = new Map(); failCapture = false;
  capture = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    if (failCapture) throw new Error('Image copying unavailable');
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
  close = vi.fn(() => { root.render(null); });
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

describe('Raptor distance keyboard access and text comparison in React', () => {
  it('provides named section shortcuts, focusable prediction heading, and stable slider names with readable values', async () => {
    const nav = query('[data-distance-nav]');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBeTruthy();
    expect(nav.querySelectorAll('button')).toHaveLength(5);
    expect(query('[data-distance-prediction-heading]').getAttribute('tabindex')).toBe('-1');
    for (const [id, selector] of Object.entries(destinations)) {
      await activate(`[data-distance-jump="${id}"]`);
      expect(document.activeElement).toBe(query(selector));
      if (id === 'inspector' || id === 'signal') expect(query(`[data-distance-${id}]`).open).toBe(true);
    }
    const sliders = [
      ['distance', 'Viewing distance', '80 metres', '160 metres'],
      ['cycles', 'Light–dark stripe pairs', '8 light–dark stripe pairs', '12 light–dark stripe pairs'],
      ['contrast', 'Display contrast', '95 percent display contrast', '25 percent display contrast']
    ];
    for (const [id, name, text] of sliders) {
      const slider = query(`#rh-distance-${id}`);
      expect(slider.getAttribute('aria-label')).toBe(name);
      expect(slider.getAttribute('aria-valuetext')).toBe(text);
      expect([...slider.labels].some(label => label.textContent.includes(name))).toBe(true);
    }
    await commit({ ...value, distance: 160, cycles: 12, contrast: 25 });
    for (const [id, name, , text] of sliders) {
      expect(query(`#rh-distance-${id}`).getAttribute('aria-label')).toBe(name);
      expect(query(`#rh-distance-${id}`).getAttribute('aria-valuetext')).toBe(text);
    }
    await reveal('eagle'); await activate('[data-distance-jump="signal"]');
    await activate('[data-distance-signal-read]');
    const probe = query('[data-distance-signal-probe]');
    expect(probe.getAttribute('aria-label')).toBe('Move the pixel probe');
    expect(query('label[for="rh-distance-signal-probe"]').textContent).toContain('Move the pixel probe');
    expect(probe.getAttribute('aria-valuetext')).toMatch(/Image pixel \d+\. Human \d+\.\d; eagle \d+\.\d mean RGB code value\./);
    for (const output of all('output')) expect(output.getAttribute('aria-live')).toBe('off');
  });

  it('opens closed destinations without changing evidence, lesson answers, draft context, or rendering work', async () => {
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'An existing notebook observation.');
    const trials = [80, 90].map(distance => {
      const cfg = { version: 1, distance, cycles: 12, contrast: 95 };
      return local.RaptorDistanceFieldwork.trial(cfg, local.RaptorDistanceModel.metrics(cfg).referenceBand);
    });
    const results = { version: 1, human: local.RaptorDistanceResults.capture('human', trials) };
    await commit({ ...initial, records: [earlier], fieldworkResults: results });
    await activate('[data-distance-inquiry="contrast"]'); await reveal(); await activate('[data-distance-pin]');
    await activate('[data-distance-experiment="contrast"]'); await reveal();
    await activate('[data-distance-reflection-answer="same-same"]');
    await activate('[data-distance-jump="signal"]'); await activate('[data-distance-signal-read]');
    await activate('[data-distance-signal-keep]');
    const note = 'The darker and lighter stripe positions remain the same when contrast changes.';
    await writeNote(note);
    const feedback = query('[data-distance-reflection-feedback]').textContent;
    const kept = query('[data-distance-signal-kept-label]').textContent;
    const pins = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));
    const canvases = all('[data-distance-canvas]');
    const counts = { reads: readback.mock.calls.length, captures: capture.mock.calls.length,
      updates: controller.update.mock.calls.length, changes: changes.mock.calls.length };
    for (const id of ['inspector', 'signal']) {
      await act(async () => { query(`[data-distance-${id}]`).open = false; });
      await activate(`[data-distance-jump="${id}"]`);
      expect(query(`[data-distance-${id}]`).open).toBe(true);
      expect(document.activeElement).toBe(query(destinations[id]));
    }
    for (const id of ['conditions', 'prediction', 'notebook']) {
      await activate(`[data-distance-jump="${id}"]`);
      expect(document.activeElement).toBe(query(destinations[id]));
    }
    expect(query('[data-distance-note]').value).toBe(note);
    expect(query('[data-distance-draft-stale]')).toBeNull();
    expect(query('[data-distance-reflection-feedback]').textContent).toBe(feedback);
    expect(query('[data-distance-reflection-answer="same-same"]').getAttribute('aria-pressed')).toBe('true');
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(kept);
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pins);
    expect(value.records).toEqual([earlier]); expect(value.fieldworkResults).toEqual(results);
    expect(all('[data-distance-canvas]')).toEqual(canvases);
    expect(readback).toHaveBeenCalledTimes(counts.reads); expect(capture).toHaveBeenCalledTimes(counts.captures);
    expect(controller.update).toHaveBeenCalledTimes(counts.updates); expect(changes).toHaveBeenCalledTimes(counts.changes);
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(1);
    await activate('[data-distance-save]');
    expect(document.activeElement).toBe(query('[data-distance-note]'));
    expect(query('[data-distance-note]').value).toBe('');
    expect(value.records).toHaveLength(2); expect(value.records[0]).toEqual(earlier);
    expect(value.fieldworkResults).toEqual(results);
  });

  it('gives a semantic comparison tied to the selected current or pinned condition without sampling pixels', async () => {
    expect(query(comparisonSelector)).toBeNull();
    await reveal(); await activate('[data-distance-pin]');
    expect(query(comparisonSelector).open).toBe(false);
    expect(query(`${comparisonSelector} > summary`).textContent).toBe('Read the detail comparison as text');
    await openComparison(); assertTextComparison(initial, 'Current');
    await activate('[data-distance-experiment="contrast"]'); await reveal();
    assertTextComparison({ ...initial, contrast: 25 }, 'Current');
    const counts = { reads: readback.mock.calls.length, captures: capture.mock.calls.length,
      updates: controller.update.mock.calls.length, changes: changes.mock.calls.length };
    await activate('[data-distance-inspector-source="pinned"]'); assertTextComparison(initial, 'Pinned');
    await activate('[data-distance-inspector-source="current"]'); assertTextComparison({ ...initial, contrast: 25 }, 'Current');
    await activate(`${comparisonSelector} > summary`); await activate(`${comparisonSelector} > summary`);
    expect(readback).toHaveBeenCalledTimes(counts.reads); expect(capture).toHaveBeenCalledTimes(counts.captures);
    expect(controller.update).toHaveBeenCalledTimes(counts.updates); expect(changes).toHaveBeenCalledTimes(counts.changes);
    await activate('[data-distance-experiment="distance"]'); await reveal('eagle');
    assertTextComparison({ ...initial, distance: 160 }, 'Current');
    await activate('[data-distance-inspector-source="pinned"]'); assertTextComparison(initial, 'Pinned');
    expect(readback).not.toHaveBeenCalled();
  });

  it('removes stale current descriptions before the old canvas updates and requires a fresh reveal', async () => {
    await reveal(); await openComparison(); assertTextComparison(initial, 'Current');
    const timing = {}, capturesBefore = capture.mock.calls.length;
    await commit({ ...value, distance: 160 }, () => {
      timing.control = query('#rh-distance-distance').value;
      timing.renderedDistance = controller.getDiagnostics().settings.distance;
      timing.description = !!query(comparisonSelector);
      timing.rows = all('[data-distance-text-reference]').length;
    });
    expect(timing).toEqual({ control: '160', renderedDistance: 80, description: false, rows: 0 });
    expect(query(comparisonSelector)).toBeNull();
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    await reveal('eagle'); assertTextComparison({ ...initial, distance: 160 }, 'Current');
    await activate('[data-distance-prediction="neither"]');
    expect(query(comparisonSelector)).toBeNull();
    expect(all('[data-distance-text-reference]')).toHaveLength(0);
    await activate('[data-distance-reveal]'); assertTextComparison({ ...initial, distance: 160 }, 'Current');
  });

  it('keeps pinned descriptions available after PNG failure and never substitutes current data for a cleared pin', async () => {
    await reveal(); await activate('[data-distance-pin]'); await openComparison();
    await activate('[data-distance-experiment="distance"]'); failCapture = true; await reveal('eagle');
    expect(query('[data-distance-snapshot-error]')).not.toBeNull();
    expect(query(comparisonSelector)).toBeNull();
    await activate('[data-distance-inspector-source="pinned"]'); assertTextComparison(initial, 'Pinned');
    await activate('[data-distance-clear-pin]');
    expect(query(comparisonSelector)).toBeNull();
    expect(query('[data-distance-inspector-source="pinned"]').getAttribute('aria-pressed')).toBe('true');
    failCapture = false; await activate('[data-distance-reveal]');
    expect(query(comparisonSelector)).toBeNull();
    await activate('[data-distance-inspector-source="current"]');
    assertTextComparison({ ...initial, distance: 160 }, 'Current');
    expect(readback).not.toHaveBeenCalled();
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(1);
  });
});
