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
const sources = ['model', 'evidence', 'investigations', 'study'].map(name =>
  readFileSync(`stem_lab/raptor_distance_${name}.js`, 'utf8'));
const initial = { version: 1, distance: 80, cycles: 8, contrast: 95 };
const condition = settings => `${settings.distance}/${settings.cycles}/${settings.contrast}`;
const payload = image => Buffer.from(image.getAttribute('src').split(',')[1], 'base64').toString('utf8');
const select = {
  inspector: '[data-distance-inspector]', frame: '[data-distance-inspector-frame]',
  images: '[data-distance-inspector-image]', unavailable: '[data-distance-inspector-unavailable]',
  label: '[data-distance-inspector-condition]', range: '[data-distance-inspector-range]',
  current: '[data-distance-inspector-source="current"]', pinned: '[data-distance-inspector-source="pinned"]'
};

let local, host, root, controller, capture, failCapture, actDescriptor, value, changes;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
function inspectorPayloads() {
  return Object.fromEntries(all(select.images).map(image => [image.getAttribute('data-distance-inspector-image'), payload(image)]));
}
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
async function setShare(next) {
  const range = query(select.range);
  expect(range.disabled).toBe(false);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(range, String(next));
    range.dispatchEvent(new Event('input', { bubbles: true }));
    range.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(query(select.range).value).toBe(String(next));
}
function Host(props) {
  // Observe a committed child DOM before its passive canvas-update effect. The
  // marker on each canvas still describes the previous render at this point.
  React.useLayoutEffect(() => { if (props.beforePassiveEffects) props.beforePassiveEffects(); },
    [props.settings, props.beforePassiveEffects]);
  return h(local.RaptorDistanceStudy.Component, {
    React, settings: props.settings, loadResources: () => Promise.resolve(), onClose() {}, onChange: changes
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
  failCapture = false; controller = null;
  // These markers independently identify the scene render copied by each PNG.
  // Browser tests cover actual pixels; these tests cover React provenance and
  // ensure that changing the wipe never invokes rendering or image capture.
  capture = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    if (failCapture) throw new Error('Image copying unavailable');
    return 'data:image/png;base64,' + Buffer.from(`${this.getAttribute('data-distance-canvas')}|${this.getAttribute('data-test-rendered')}`).toString('base64');
  });
  local.RaptorDistanceScene = {
    create(options) {
      let rendered = null;
      controller = {
        update: vi.fn(settings => {
          rendered = local.RaptorDistanceModel.normalize(settings);
          for (const canvas of [options.wideCanvas, options.referenceCanvas, options.eagleCanvas]) {
            canvas.setAttribute('data-test-rendered', condition(rendered));
          }
          return { settings: { ...rendered } };
        }),
        getDiagnostics: () => ({ settings: rendered && { ...rendered } }),
        dispose: vi.fn()
      };
      return controller;
    }
  };
  changes = vi.fn(next => { value = next; root.render(h(Host, { settings: value })); });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await commit({ ...initial });
  expect(query('[data-raptor-distance-study]').getAttribute('data-render-ready')).toBe('true');
  expect(controller.getDiagnostics().settings.distance).toBe(80);
});

afterEach(async () => {
  try {
    if (root) await act(async () => { root.unmount(); });
    if (controller) expect(controller.dispose).toHaveBeenCalledTimes(1);
  } finally {
    if (host) host.remove();
    vi.restoreAllMocks(); root = null; controller = null; local = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Raptor distance image inspector in React', () => {
  it('uses the revealed current or pinned image pair with matching labels and never exposes an unrevealed current pair', async () => {
    expect(query(select.inspector).open).toBe(false);
    await activate(`${select.inspector} summary`);
    expect(query(select.inspector).open).toBe(true);
    expect(query(select.frame)).toBeNull(); expect(all(select.images)).toHaveLength(0);
    expect(query(select.unavailable).textContent).toContain('Predict and reveal');
    expect(query(select.range).disabled).toBe(true); expect(query(select.pinned).disabled).toBe(true);

    await reveal();
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|80/8/95', reference: 'reference|80/8/95' });
    expect(query(select.label).textContent).toContain('Current condition: 80 m');
    expect(query(select.frame).getAttribute('aria-label')).toContain('Current condition at 80 m');
    await activate('[data-distance-pin]');
    const pinnedSources = Object.fromEntries(all('[data-distance-pinned-image]').map(image =>
      [image.getAttribute('data-distance-pinned-image'), image.getAttribute('src')]));
    await activate('[data-distance-experiment="distance"]');
    expect(controller.getDiagnostics().settings.distance).toBe(160);
    expect(query(select.label).textContent).toContain('Current condition: 160 m');
    expect(all(select.images)).toHaveLength(0); expect(query(select.frame)).toBeNull();
    expect(query(select.range).disabled).toBe(true);

    await activate(select.pinned);
    expect(query(select.label).textContent).toContain('Pinned condition: 80 m');
    expect(query(select.frame).getAttribute('aria-label')).toContain('Pinned condition at 80 m');
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|80/8/95', reference: 'reference|80/8/95' });
    for (const image of all(select.images)) expect(image.getAttribute('src')).toBe(pinnedSources[image.getAttribute('data-distance-inspector-image')]);
    await activate(select.current);
    expect(query(select.frame)).toBeNull(); expect(query(select.range).disabled).toBe(true);

    await reveal('eagle');
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|160/8/95', reference: 'reference|160/8/95' });
    for (const image of all(select.images)) {
      expect(image.getAttribute('width')).toBe('1024'); expect(image.getAttribute('height')).toBe('512');
      expect(image.getAttribute('aria-hidden')).toBe('true');
    }
    await activate('[data-distance-prediction="neither"]');
    expect(all(select.images)).toHaveLength(0); expect(query(select.range).disabled).toBe(true);
    await activate(select.pinned);
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|80/8/95', reference: 'reference|80/8/95' });
  });

  it('retains a cleared pinned selection as unavailable until the learner explicitly selects current evidence', async () => {
    await reveal(); await activate('[data-distance-pin]');
    await activate('[data-distance-experiment="distance"]'); await reveal('eagle');
    const currentSources = Object.fromEntries(all('[data-distance-current-image]').map(image =>
      [image.getAttribute('data-distance-current-image'), image.getAttribute('src')]));
    await activate(select.pinned);
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|80/8/95', reference: 'reference|80/8/95' });
    await activate('[data-distance-clear-pin]');

    // Current B is still revealed. An automatic fallback would therefore show
    // valid but differently attributed evidence instead of the selected pin A.
    expect(query('[data-distance-result]')).not.toBeNull();
    expect(query(select.pinned).getAttribute('aria-pressed')).toBe('true');
    expect(query(select.pinned).disabled).toBe(true);
    expect(query(select.current).getAttribute('aria-pressed')).toBe('false');
    expect(query(select.label).textContent).toBe('Pinned condition: no pin available');
    expect(query(select.frame)).toBeNull(); expect(all(select.images)).toHaveLength(0);
    expect(query(select.unavailable).textContent).toContain('previous pin has been cleared');
    expect(query(select.range).disabled).toBe(true);
    expect(all('[data-distance-inspector-preset]').every(button => button.disabled)).toBe(true);

    await activate(select.current);
    expect(query(select.current).getAttribute('aria-pressed')).toBe('true');
    expect(query(select.label).textContent).toContain('Current condition: 160 m');
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|160/8/95', reference: 'reference|160/8/95' });
    for (const image of all(select.images)) expect(image.getAttribute('src')).toBe(currentSources[image.getAttribute('data-distance-inspector-image')]);
  });

  it('changes only the displayed image share without rendering, recapturing, persisting state or altering notebook evidence', async () => {
    const record = Object.freeze({ version: 1, modelVersion: 1, distance: 80, cycles: 8, contrast: 95,
      widthM: .30, referenceLimit: 60, eagleLimit: 140, prediction: 'both', note: 'The original saved evidence remains unchanged.' });
    const savedSettings = Object.freeze({ ...initial, records: Object.freeze([record]) });
    await commit(savedSettings); await reveal(); await activate('[data-distance-pin]');
    const originals = all('[data-distance-canvas]');
    const sourceValues = all(select.images).map(image => image.getAttribute('src'));
    const before = { updates: controller.update.mock.calls.length, captures: capture.mock.calls.length,
      writes: changes.mock.calls.length, settings: JSON.stringify(value), notebook: query('[data-distance-record]').textContent };

    await activate(`${select.inspector} summary`);
    await setShare(37);
    expect(query('[data-distance-inspector-image="reference"]').style.clipPath).toBe('inset(0 63% 0 0)');
    expect(query('.rh-distance-inspector-divider').style.left).toBe('37%');
    expect(query(select.range).getAttribute('aria-valuetext')).toBe('37% human reference; 63% eagle reference');
    expect(query(select.frame).getAttribute('aria-label')).toContain('37% human reference; 63% eagle reference');
    for (const [preset, share, inset] of [['human', 100, 0], ['eagle', 0, 100], ['split', 50, 50]]) {
      await activate(`[data-distance-inspector-preset="${preset}"]`);
      expect(query(select.range).value).toBe(String(share));
      expect(query('[data-distance-inspector-image="reference"]').style.clipPath).toBe(`inset(0 ${inset}% 0 0)`);
      expect(query(`[data-distance-inspector-preset="${preset}"]`).getAttribute('aria-pressed')).toBe('true');
      expect(all('.rh-distance-inspector-divider')).toHaveLength(share === 50 ? 1 : 0);
    }
    await activate(select.pinned); await setShare(64); await activate(select.current);
    expect(query(select.range).value).toBe('64');
    await activate(`${select.inspector} summary`); await activate(`${select.inspector} summary`);

    expect(controller.update).toHaveBeenCalledTimes(before.updates);
    expect(capture).toHaveBeenCalledTimes(before.captures);
    expect(changes).toHaveBeenCalledTimes(before.writes);
    expect(value).toBe(savedSettings); expect(JSON.stringify(value)).toBe(before.settings);
    expect(query('[data-distance-record]').textContent).toBe(before.notebook);
    expect(all('[data-distance-record]')).toHaveLength(1);
    expect(all(select.images).map(image => image.getAttribute('src'))).toEqual(sourceValues);
    expect(all('[data-distance-canvas]')).toEqual(originals);
  });

  it('hides old current copies in the committed DOM before passive effects can update the scene', async () => {
    await reveal();
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|80/8/95', reference: 'reference|80/8/95' });
    const capturesBefore = capture.mock.calls.length, updatesBefore = controller.update.mock.calls.length, timing = {};
    await commit({ ...initial, distance: 160 }, () => {
      timing.displayedDistance = query('#rh-distance-distance').value;
      timing.renderedDistance = controller.getDiagnostics().settings.distance;
      timing.previousRevealStillSet = !!query('[data-distance-result]');
      timing.frame = !!query(select.frame);
      timing.images = all(select.images).map(image => image.getAttribute('src'));
      timing.label = query(select.label).textContent;
      timing.disabled = query(select.range).disabled;
      timing.updates = controller.update.mock.calls.length;
      timing.captures = capture.mock.calls.length;
    });

    // These first three assertions establish the actual timing window: new
    // props, old canvas, and old reveal state. The condition key must gate the
    // inspector immediately, independently of the later state-reset effect.
    expect(timing).toMatchObject({ displayedDistance: '160', renderedDistance: 80, previousRevealStillSet: true,
      frame: false, images: [], disabled: true, updates: updatesBefore, captures: capturesBefore });
    expect(timing.label).toContain('Current condition: 160 m');
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(controller.getDiagnostics().settings.distance).toBe(160);
    expect(query(select.frame)).toBeNull(); expect(query('[data-distance-reveal]').disabled).toBe(true);
    await reveal('eagle');
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|160/8/95', reference: 'reference|160/8/95' });
  });

  it('keeps a failed current capture unavailable while allowing an explicit pin selection and a later capture retry', async () => {
    await reveal(); await activate('[data-distance-pin]');
    await activate('[data-distance-experiment="cycles"]');
    failCapture = true; await reveal('eagle');
    expect(query(select.label).textContent).toContain('80 m · 16 stripe pairs');
    expect(query(select.frame)).toBeNull(); expect(all(select.images)).toHaveLength(0);
    expect(query(select.unavailable).textContent).toContain('current image copies are unavailable');
    expect(query(select.range).disabled).toBe(true);
    expect(all('[data-distance-inspector-preset]').every(button => button.disabled)).toBe(true);
    expect(query('[data-distance-original-panels]').style.display).not.toBe('none');

    const capturesAfterFailure = capture.mock.calls.length, updatesAfterFailure = controller.update.mock.calls.length;
    await activate(select.pinned);
    expect(query(select.label).textContent).toContain('Pinned condition: 80 m · 8 stripe pairs');
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|80/8/95', reference: 'reference|80/8/95' });
    expect(query(select.range).disabled).toBe(false);
    await activate('[data-distance-inspector-preset="eagle"]');
    await activate(select.current);
    expect(query(select.frame)).toBeNull(); expect(query(select.range).disabled).toBe(true);
    expect(capture).toHaveBeenCalledTimes(capturesAfterFailure);
    expect(controller.update).toHaveBeenCalledTimes(updatesAfterFailure);

    failCapture = false; await activate('[data-distance-reveal]');
    expect(query(select.unavailable)).toBeNull(); expect(query(select.range).disabled).toBe(false);
    expect(inspectorPayloads()).toEqual({ eagle: 'eagle|80/16/95', reference: 'reference|80/16/95' });
    expect(query(select.range).value).toBe('0');
    expect(query(select.frame).getAttribute('aria-label')).toContain('0% human reference; 100% eagle reference');
    expect(controller.update).toHaveBeenCalledTimes(updatesAfterFailure);
    expect(changes).toHaveBeenCalledTimes(1);
  });
});
