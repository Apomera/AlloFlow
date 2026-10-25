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
const select = {
  details: '[data-distance-magnifier]', images: '[data-distance-magnifier-image]',
  unavailable: '[data-distance-magnifier-unavailable]', crop: '[data-distance-magnifier-crop]',
  region: '[data-distance-magnifier-region]', overview: '[data-distance-magnifier-overview]',
  label: '[data-distance-magnifier-condition]', x: '[data-distance-magnifier-pan="x"]',
  y: '[data-distance-magnifier-pan="y"]', center: '[data-distance-magnifier-center]'
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
async function openMagnifier() {
  if (!query('[data-distance-inspector]').open) await activate('[data-distance-inspector] > summary');
  if (!query(select.details).open) await activate(`${select.details} > summary`);
}
async function reveal(prediction = 'both') {
  await activate(`[data-distance-prediction="${prediction}"]`);
  await activate('[data-distance-reveal]');
}
async function pan(axis, next) {
  const input = query(axis === 'x' ? select.x : select.y);
  expect(input.disabled).toBe(false);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(input.value).toBe(String(next));
}
async function writeNote(text) {
  const textarea = query('[data-distance-note]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function assertCrop(zoom, x, y, width, height, cssLeft, cssTop) {
  const output = query(select.crop), region = query(select.region);
  expect(output.getAttribute('data-zoom')).toBe(String(zoom));
  expect(['x', 'y', 'width', 'height'].map(name => Number(output.getAttribute(`data-${name}`)))).toEqual([x, y, width, height]);
  expect(['x', 'y', 'width', 'height'].map(name => Number(region.getAttribute(name)))).toEqual([x, y, width, height]);
  expect(query(select.overview).getAttribute('viewBox')).toBe('0 0 1024 512');
  for (const image of all(select.images)) {
    expect(image.style.width).toBe(`${zoom * 100}%`); expect(image.style.height).toBe(`${zoom * 100}%`);
    expect(image.style.maxWidth).toBe('none');
    expect(image.style.left).toBe(cssLeft); expect(image.style.top).toBe(cssTop);
    expect(image.getAttribute('width')).toBe('1024'); expect(image.getAttribute('height')).toBe('512');
  }
  expect(query(`[data-distance-magnifier-zoom="${zoom}"]`).getAttribute('aria-pressed')).toBe('true');
}
function assertSources(expectedCondition) {
  const human = query('[data-distance-magnifier-image="human"]');
  const eagle = query('[data-distance-magnifier-image="eagle"]');
  expect(payload(human)).toBe(`reference|${expectedCondition}`);
  expect(payload(eagle)).toBe(`eagle|${expectedCondition}`);
  expect(human.getAttribute('src')).toBe(query('[data-distance-inspector-image="reference"]').getAttribute('src'));
  expect(eagle.getAttribute('src')).toBe(query('[data-distance-inspector-image="eagle"]').getAttribute('src'));
  const overviewImage = query(`${select.overview} image`);
  expect(overviewImage.getAttribute('href') || overviewImage.getAttribute('xlink:href')).toBe(eagle.getAttribute('src'));
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

describe('Raptor distance existing-image magnifier in React', () => {
  it('keeps both native PNGs aligned with exact source crops, preserves pan across zoom, and centers without changing zoom', async () => {
    expect(query('[data-distance-inspector]').open).toBe(false); expect(query(select.details).open).toBe(false);
    await openMagnifier();
    expect(query(select.unavailable)).not.toBeNull(); expect(all(select.images)).toHaveLength(0);
    for (const button of all('[data-distance-magnifier-zoom]')) expect(button.disabled).toBe(true);
    expect(query(select.x).disabled).toBe(true); expect(query(select.center).disabled).toBe(true);
    await reveal(); assertSources('80/8/95');
    assertCrop(1, 0, 0, 1024, 512, '0%', '0%');
    expect(query(select.x).disabled).toBe(true); expect(query(select.y).disabled).toBe(true);
    for (const input of [query(select.x), query(select.y)]) {
      expect(input.type).toBe('range'); expect(input.min).toBe('0'); expect(input.max).toBe('100'); expect(input.step).toBe('1');
      expect(input.labels.length > 0 || !!input.getAttribute('aria-label')).toBe(true);
    }
    await activate('[data-distance-magnifier-zoom="4"]'); await pan('x', 25); await pan('y', 75);
    assertCrop(4, 192, 288, 256, 128, '-75%', '-225%');
    await activate('[data-distance-magnifier-zoom="2"]');
    assertCrop(2, 128, 192, 512, 256, '-25%', '-75%');
    await activate('[data-distance-magnifier-zoom="1"]');
    assertCrop(1, 0, 0, 1024, 512, '0%', '0%');
    expect(query(select.x).value).toBe('25'); expect(query(select.y).value).toBe('75');
    await activate('[data-distance-magnifier-zoom="4"]');
    assertCrop(4, 192, 288, 256, 128, '-75%', '-225%');
    await activate(select.center);
    expect(query(select.x).value).toBe('50'); expect(query(select.y).value).toBe('50');
    assertCrop(4, 384, 192, 256, 128, '-150%', '-150%');
    await pan('x', 0); await pan('y', 100);
    assertCrop(4, 0, 384, 256, 128, '0%', '-300%'); assertSources('80/8/95');
  });

  it('does not render, capture, read pixels, persist, or invalidate an answered lesson and its draft', async () => {
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
    if (!query('[data-distance-signal]').open) await activate('[data-distance-signal] > summary');
    await activate('[data-distance-signal-read]'); await activate('[data-distance-signal-keep]');
    const note = 'Contrast changed while the pattern and viewing distance stayed fixed.';
    await writeNote(note); expect(query('[data-distance-draft-stale]')).toBeNull();
    const feedback = query('[data-distance-reflection-feedback]').textContent;
    const kept = query('[data-distance-signal-kept-label]').textContent;
    const pins = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));
    const canvases = all('[data-distance-canvas]');
    const counts = { reads: readback.mock.calls.length, captures: capture.mock.calls.length,
      updates: controller.update.mock.calls.length, changes: changes.mock.calls.length };
    await openMagnifier(); await activate('[data-distance-magnifier-zoom="4"]');
    await pan('x', 100); await pan('y', 0); await activate(select.center);
    await activate('[data-distance-inspector-source="pinned"]'); assertSources('80/8/95');
    await activate('[data-distance-inspector-source="current"]'); assertSources('80/8/25');
    await activate('[data-distance-magnifier-note]');
    expect(document.activeElement).toBe(query('[data-distance-note]'));
    expect(query('[data-distance-note]').value).toBe(note); expect(query('[data-distance-draft-stale]')).toBeNull();
    expect(query('[data-distance-reflection-feedback]').textContent).toBe(feedback);
    expect(query('[data-distance-reflection-answer="same-same"]').getAttribute('aria-pressed')).toBe('true');
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(kept);
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pins);
    expect(value.records).toEqual([earlier]); expect(value.fieldworkResults).toEqual(results);
    expect(all('[data-distance-canvas]')).toEqual(canvases);
    expect(readback).toHaveBeenCalledTimes(counts.reads); expect(capture).toHaveBeenCalledTimes(counts.captures);
    expect(controller.update).toHaveBeenCalledTimes(counts.updates); expect(changes).toHaveBeenCalledTimes(counts.changes);
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(1);
  });

  it('hides current images and crop immediately on new props before the old canvas updates', async () => {
    await reveal(); await openMagnifier(); await activate('[data-distance-magnifier-zoom="4"]');
    await pan('x', 25); await pan('y', 75);
    const timing = {}, capturesBefore = capture.mock.calls.length;
    await commit({ ...value, distance: 160 }, () => {
      timing.displayedDistance = query('#rh-distance-distance').value;
      timing.renderedDistance = controller.getDiagnostics().settings.distance;
      timing.images = all(select.images).length; timing.cropPresent = !!query(select.crop);
      timing.overviewPresent = !!query(select.overview);
      timing.zoomDisabled = query('[data-distance-magnifier-zoom="2"]').disabled;
      timing.panDisabled = query(select.x).disabled;
    });
    expect(timing).toEqual({ displayedDistance: '160', renderedDistance: 80, images: 0, cropPresent: false,
      overviewPresent: false, zoomDisabled: true, panDisabled: true });
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(query(select.label).textContent).toContain('160 m');
    expect(query(select.x).value).toBe('25'); expect(query(select.y).value).toBe('75');
    expect(query('[data-distance-magnifier-zoom="4"]').getAttribute('aria-pressed')).toBe('true');
    await reveal('eagle'); assertSources('160/8/95');
    assertCrop(4, 192, 288, 256, 128, '-75%', '-225%');
    await activate('[data-distance-prediction="neither"]');
    expect(all(select.images)).toHaveLength(0); expect(query(select.crop)).toBeNull();
    expect(query(select.unavailable)).not.toBeNull();
  });

  it('allows an existing pin after current PNG failure and never silently substitutes current evidence for a cleared pin', async () => {
    await reveal(); await activate('[data-distance-pin]'); await openMagnifier();
    await activate('[data-distance-magnifier-zoom="2"]');
    await activate('[data-distance-experiment="distance"]'); failCapture = true; await reveal('eagle');
    expect(query('[data-distance-snapshot-error]')).not.toBeNull();
    expect(all(select.images)).toHaveLength(0); expect(query(select.unavailable)).not.toBeNull();
    await activate('[data-distance-inspector-source="pinned"]');
    assertSources('80/8/95'); expect(query(select.label).textContent).toContain('Pinned');
    await activate('[data-distance-clear-pin]');
    expect(all(select.images)).toHaveLength(0); expect(query(select.crop)).toBeNull();
    expect(query('[data-distance-inspector-source="pinned"]').getAttribute('aria-pressed')).toBe('true');
    failCapture = false; await activate('[data-distance-reveal]');
    expect(all(select.images)).toHaveLength(0); expect(query(select.unavailable)).not.toBeNull();
    await activate('[data-distance-inspector-source="current"]');
    assertSources('160/8/95'); expect(query(select.label).textContent).toContain('Current');
    assertCrop(2, 256, 128, 512, 256, '-50%', '-50%');
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(1); expect(readback).not.toHaveBeenCalled();
  });

  it('disposes on close and resets local zoom and pan after reopening without restoring old images', async () => {
    await reveal(); await openMagnifier(); await activate('[data-distance-magnifier-zoom="4"]');
    await pan('x', 0); await pan('y', 100);
    const oldController = controller, savedSettings = value;
    await activate('[data-raptor-distance-close]');
    expect(close).toHaveBeenCalledTimes(1); expect(oldController.dispose).toHaveBeenCalledTimes(1);
    expect(query('[data-raptor-distance-study]')).toBeNull();
    await commit(savedSettings); await openMagnifier();
    expect(controller).not.toBe(oldController);
    expect(all(select.images)).toHaveLength(0); expect(query(select.crop)).toBeNull();
    expect(query('[data-distance-magnifier-zoom="1"]').getAttribute('aria-pressed')).toBe('true');
    expect(query(select.x).value).toBe('50'); expect(query(select.y).value).toBe('50');
    expect(query(select.x).disabled).toBe(true); expect(query(select.center).disabled).toBe(true);
    await reveal(); assertSources('80/8/95');
    assertCrop(1, 0, 0, 1024, 512, '0%', '0%');
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(2);
  });
});
