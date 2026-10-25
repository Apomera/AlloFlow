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
const payload = image => Buffer.from(image.getAttribute('src').split(',')[1], 'base64').toString('utf8');
const codeValue = (name, index) => name === 'reference' ? 90 + (index % 5) * 10 : 30 + (index % 7) * 30;
const select = {
  details: '[data-distance-signal]', read: '[data-distance-signal-read]', chart: '[data-distance-signal-chart]',
  images: '[data-distance-signal-image]', probe: '[data-distance-signal-probe]', pixel: '[data-distance-signal-pixel]',
  humanValue: '[data-distance-signal-value="human"]', eagleValue: '[data-distance-signal-value="eagle"]',
  error: '[data-distance-signal-error]'
};

let local, host, root, controller, contexts, capture, readback, failCapture, failRead, diagnosticsOverride;
let changes, close, value, actDescriptor;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
async function activate(selector) {
  const element = query(selector);
  expect(element, selector).not.toBeNull();
  if ('disabled' in element) expect(element.disabled, selector).toBe(false);
  await act(async () => { element.click(); });
}
async function openSignal() {
  if (!query(select.details).open) await activate(`${select.details} > summary`);
}
async function reveal(prediction = 'both') {
  await activate(`[data-distance-prediction="${prediction}"]`);
  await activate('[data-distance-reveal]');
}
async function setProbe(index) {
  const input = query(select.probe);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(index));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function assertProbe(index, region) {
  expect(query(select.probe).value).toBe(String(index));
  expect(Number(query(select.pixel).getAttribute('data-x'))).toBe(region.x0 + index);
  expect(Number(query(select.pixel).getAttribute('data-y'))).toBe(region.y);
  expect(query(select.pixel).textContent).toContain(`Image pixel ${region.x0 + index}, row ${region.y}`);
  expect(Number(query(select.humanValue).textContent)).toBe(codeValue('reference', index));
  expect(Number(query(select.eagleValue).textContent)).toBe(codeValue('eagle', index));
  for (const id of ['human', 'eagle']) {
    expect(Number(query(`[data-distance-signal-marker="${id}"]`).getAttribute('cx'))).toBe(region.x0 + index);
  }
}
async function writeNote(text) {
  const textarea = query('[data-distance-note]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  });
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
  failCapture = false; failRead = null; diagnosticsOverride = null; controller = null; contexts = new Map();
  capture = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    if (failCapture) throw new Error('Image copying unavailable');
    return 'data:image/png;base64,' + Buffer.from(`${this.getAttribute('data-distance-canvas')}|${this.getAttribute('data-test-rendered')}`).toString('base64');
  });
  // Deliberately non-sinusoidal grayscale rows ensure the component uses actual
  // canvas samples rather than substituting the model's analytical transfer.
  readback = vi.fn((name, x, y, width, height) => {
    if (failRead === name) throw new Error('Pixel access unavailable');
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < width * height; index++) {
      data[index * 4] = data[index * 4 + 1] = data[index * 4 + 2] = codeValue(name, index);
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
  local.RaptorDistanceScene = {
    create: vi.fn(options => {
      let rendered = null;
      controller = {
        update: vi.fn(settings => {
          rendered = local.RaptorDistanceModel.normalize(settings);
          for (const canvas of [options.wideCanvas, options.referenceCanvas, options.eagleCanvas]) {
            canvas.setAttribute('data-test-rendered', condition(rendered));
          }
          return { settings: { ...rendered } };
        }),
        getDiagnostics: () => ({ settings: { ...(diagnosticsOverride || rendered) } }),
        dispose: vi.fn()
      };
      return controller;
    })
  };
  changes = vi.fn(next => { value = next; root.render(h(Host, { settings: value })); });
  close = vi.fn(() => { root.render(null); });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await commit({ ...initial });
  expect(query('[data-raptor-distance-study]').getAttribute('data-render-ready')).toBe('true');
});

afterEach(async () => {
  try {
    if (root) await act(async () => { root.unmount(); });
    if (controller) expect(controller.dispose).toHaveBeenCalledTimes(1);
  } finally {
    if (host) host.remove();
    vi.restoreAllMocks(); root = null; controller = null; contexts = null; local = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Raptor distance rendered stripe signal in React', () => {
  it('reads the same plaque row from both existing canvases and uses its actual values with the revealed PNGs', async () => {
    await openSignal();
    expect(query(select.read).disabled).toBe(true);
    expect(readback).not.toHaveBeenCalled(); expect(query(select.chart)).toBeNull();
    await reveal();
    const capturesBefore = capture.mock.calls.length, updatesBefore = controller.update.mock.calls.length;
    const changesBefore = changes.mock.calls.length, canvases = all('[data-distance-canvas]');
    const region = local.RaptorDistanceSignal.region(value, 1024, 512);
    // Central 60% of the projected 30 cm plaque at 80 m in the fixed 0.75°
    // inspection field, with inclusive integer pixel centers.
    expect(region).toMatchObject({ x0: 424, x1: 600, y: 256, count: 177, width: 1024, height: 512 });
    await activate(select.read);
    expect(readback.mock.calls).toEqual([
      ['reference', region.x0, region.y, region.count, 1], ['eagle', region.x0, region.y, region.count, 1]
    ]);
    expect(query(select.chart)).not.toBeNull();
    expect(all('[data-distance-signal-line]')).toHaveLength(2);
    const chart = query(select.chart);
    expect(chart.getAttribute('data-max')).toBe('255');
    expect(chart.getAttribute('data-count')).toBe(String(region.count));
    for (const id of ['human', 'eagle']) {
      const line = query(`[data-distance-signal-line="${id}"]`);
      const points = line.getAttribute('points').split(' ').map(point => point.split(',').map(Number));
      expect(points).toHaveLength(region.count);
      expect(points[0][0]).toBe(50); expect(points.at(-1)[0]).toBe(620);
      for (const index of [0, 4, 6, region.count - 1]) {
        // Invert the chart's fixed0–255 axis to confirm the trace carries the
        // actual supplied sample values instead of rescaling each series.
        const plottedValue = (246 - points[index][1]) / (246 - 24) * 255;
        expect(plottedValue).toBeCloseTo(codeValue(id === 'human' ? 'reference' : 'eagle', index), 2);
      }
      const sample = query(`[data-distance-signal-sample="${id}"]`);
      expect(['x1', 'x2', 'y1', 'y2'].map(name => Number(sample.getAttribute(name)))).toEqual([424, 600, 256, 256]);
    }
    expect(Number(query('[data-distance-signal-range="human"]').textContent)).toBe(40);
    expect(Number(query('[data-distance-signal-range="eagle"]').textContent)).toBe(180);
    expect(payload(query('[data-distance-signal-image="human"]'))).toBe('reference|80/8/95');
    expect(payload(query('[data-distance-signal-image="eagle"]'))).toBe('eagle|80/8/95');
    await setProbe(0); assertProbe(0, region);
    await setProbe(4); assertProbe(4, region);
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(controller.update).toHaveBeenCalledTimes(updatesBefore);
    expect(changes).toHaveBeenCalledTimes(changesBefore);
    expect(all('[data-distance-canvas]')).toEqual(canvases);
  });

  it('keeps a labeled native probe within the sampled row without reading, rendering, capturing, or changing note context', async () => {
    await openSignal(); await reveal(); await activate(select.read);
    const region = local.RaptorDistanceSignal.region(value, 1024, 512);
    const probe = query(select.probe);
    expect(probe.type).toBe('range'); expect(probe.min).toBe('0');
    expect(probe.max).toBe(String(region.count - 1)); expect(probe.step).toBe('1');
    expect(probe.labels.length > 0 || !!probe.getAttribute('aria-label')).toBe(true);
    const note = 'I am comparing measured display values at the same pixel column.';
    await writeNote(note);
    expect(query('[data-distance-draft-stale]')).toBeNull();
    const readsBefore = readback.mock.calls.length, capturesBefore = capture.mock.calls.length;
    const updatesBefore = controller.update.mock.calls.length, changesBefore = changes.mock.calls.length;
    probe.focus();
    // Native range input/change is the path used by keyboard changes. JSDOM
    // does not implement the browser's Arrow/Home/End default actions.
    for (const [requested, expected] of [[-50, 0], [1, 1], [region.count + 50, region.count - 1], [0, 0]]) {
      await setProbe(requested); assertProbe(expected, region);
    }
    expect(document.activeElement).toBe(query(select.probe));
    await activate('[data-distance-signal-note]');
    expect(document.activeElement).toBe(query('[data-distance-note]'));
    expect(query('[data-distance-note]').value).toBe(note);
    expect(query('[data-distance-draft-stale]')).toBeNull();
    expect(readback).toHaveBeenCalledTimes(readsBefore);
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(controller.update).toHaveBeenCalledTimes(updatesBefore);
    expect(changes).toHaveBeenCalledTimes(changesBefore);
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(1);
  });

  it('hides old sampled evidence before passive scene updates and after an identical-condition reveal', async () => {
    await openSignal(); await reveal(); await activate(select.read);
    const timing = {}, readsBefore = readback.mock.calls.length;
    await commit({ ...value, distance: 160 }, () => {
      timing.displayedDistance = query('#rh-distance-distance').value;
      timing.renderedDistance = controller.getDiagnostics().settings.distance;
      timing.chartPresent = !!query(select.chart); timing.images = all(select.images).length;
      timing.readDisabled = query(select.read).disabled;
      query(select.read).click();
    });
    expect(timing).toEqual({ displayedDistance: '160', renderedDistance: 80, chartPresent: false, images: 0, readDisabled: true });
    expect(readback).toHaveBeenCalledTimes(readsBefore);
    await reveal('eagle'); await activate(select.read);
    const currentSource = query('[data-distance-signal-image="eagle"]').getAttribute('src');
    const readsAt160 = readback.mock.calls.length;
    await activate('[data-distance-reveal]');
    expect(query(select.chart)).toBeNull(); expect(all(select.images)).toHaveLength(0);
    expect(readback).toHaveBeenCalledTimes(readsAt160);
    await activate(select.read);
    expect(query('[data-distance-signal-image="eagle"]').getAttribute('src')).toBe(currentSource);
    expect(query(select.chart)).not.toBeNull();
    await activate('[data-distance-prediction="neither"]');
    expect(query(select.chart)).toBeNull(); expect(query(select.read).disabled).toBe(true);
  });

  it('rejects a failed row read atomically without disturbing the scene, pin, notebook, or saved results', async () => {
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'Keep this saved observation.');
    const trials = [80, 90].map(distance => {
      const settings = { version: 1, distance, cycles: 12, contrast: 95 };
      return local.RaptorDistanceFieldwork.trial(settings, local.RaptorDistanceModel.metrics(settings).referenceBand);
    });
    const results = { version: 1, human: local.RaptorDistanceResults.capture('human', trials) };
    await commit({ ...initial, records: [earlier], fieldworkResults: results });
    await reveal(); await activate('[data-distance-pin]'); await openSignal(); await activate(select.read);
    const pinnedSources = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));
    const canvases = all('[data-distance-canvas]');
    const capturesBefore = capture.mock.calls.length, updatesBefore = controller.update.mock.calls.length;
    const changesBefore = changes.mock.calls.length;
    failRead = 'eagle'; await activate(select.read);
    expect(query(select.error)).not.toBeNull();
    expect(query(select.chart)).toBeNull(); expect(all(select.images)).toHaveLength(0);
    expect(query('[data-raptor-distance-study]').getAttribute('data-render-ready')).toBe('true');
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinnedSources);
    expect(value.records).toEqual([earlier]); expect(value.fieldworkResults).toEqual(results);
    expect(all('[data-distance-canvas]')).toEqual(canvases);
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(controller.update).toHaveBeenCalledTimes(updatesBefore);
    expect(changes).toHaveBeenCalledTimes(changesBefore);
    expect(controller.dispose).not.toHaveBeenCalled();
    failRead = null; await activate(select.read);
    expect(query(select.error)).toBeNull(); expect(query(select.chart)).not.toBeNull();
    await activate('[data-distance-signal-start]');
    expect(query('[data-distance-guide]').getAttribute('data-distance-guide')).toBe('contrast');
    expect(value).toMatchObject({ distance: 80, cycles: 8, contrast: 95 });
    expect(value.records).toEqual([earlier]); expect(value.fieldworkResults).toEqual(results);
    expect(query('[data-distance-comparison]')).toBeNull(); expect(query(select.chart)).toBeNull();
    expect(query(select.read).disabled).toBe(true);
    expect(document.activeElement).toBe(query('[data-distance-prediction="both"]'));
  });

  it('gates PNG-copy failure and mismatched render diagnostics, then recovers without allocating another scene', async () => {
    await openSignal(); failCapture = true; await reveal();
    expect(query(select.read).disabled).toBe(true);
    expect(query('[data-distance-signal-unavailable]').textContent).toContain('Image copies are unavailable');
    expect(query(select.chart)).toBeNull(); expect(readback).not.toHaveBeenCalled();
    expect(query('[data-distance-original-panels]').style.display).not.toBe('none');
    failCapture = false; await activate('[data-distance-reveal]');
    diagnosticsOverride = { ...value, distance: 81 };
    const updatesBefore = controller.update.mock.calls.length, capturesBefore = capture.mock.calls.length;
    await activate(select.read);
    expect(readback).not.toHaveBeenCalled(); expect(query(select.chart)).toBeNull();
    expect(query(select.error)).not.toBeNull();
    expect(controller.update).toHaveBeenCalledTimes(updatesBefore);
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    diagnosticsOverride = null; await activate(select.read);
    expect(query(select.error)).toBeNull(); expect(query(select.chart)).not.toBeNull();
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(1);
    await activate('[data-raptor-distance-close]');
    expect(close).toHaveBeenCalledTimes(1);
    expect(query('[data-raptor-distance-study]')).toBeNull();
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });
});
