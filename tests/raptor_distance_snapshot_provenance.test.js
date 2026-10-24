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
const condition = value => `${value.distance}/${value.cycles}/${value.contrast}`;
const imagePayload = image => Buffer.from(image.getAttribute('src').split(',')[1], 'base64').toString('utf8');

let local, host, root, controller, capture, failCapture, actDescriptor, value;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
async function click(selector) {
  const button = query(selector);
  expect(button, selector).not.toBeNull(); expect(button.disabled, selector).toBe(false);
  await act(async () => { button.click(); });
}
async function reveal(prediction = 'both') {
  await click(`[data-distance-prediction="${prediction}"]`);
  await click('[data-distance-reveal]');
}
function Host(props) {
  // This represents a host integration committing new settings and performing
  // an imperative action before the child's passive canvas-update effect.
  React.useLayoutEffect(() => { if (props.beforePassiveEffects) props.beforePassiveEffects(); },
    [props.settings, props.beforePassiveEffects]);
  return h(local.RaptorDistanceStudy.Component, {
    React, settings: props.settings, loadResources: () => Promise.resolve(), onClose() {},
    onChange(next) { value = next; root.render(h(Host, { settings: value })); }
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
  // Canvas markers encode the last scene render, independently of current React
  // props. Real image sampling and WebGL are covered by the browser workflows.
  capture = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    if (failCapture) throw new Error('Image copying unavailable');
    const payload = `${this.getAttribute('data-distance-canvas')}|${this.getAttribute('data-test-rendered')}`;
    return 'data:image/png;base64,' + Buffer.from(payload).toString('base64');
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

describe('Raptor distance snapshot provenance in React', () => {
  it('declines a pin after new props commit but before the old canvas is updated', async () => {
    await reveal();
    const capturesBefore = capture.mock.calls.length, timing = {};
    await commit({ ...initial, distance: 160 }, () => {
      const pin = query('[data-distance-pin]');
      timing.displayedDistance = query('#rh-distance-distance').value;
      timing.renderedDistance = controller.getDiagnostics().settings.distance;
      timing.pinEnabled = !pin.disabled;
      timing.updatesBefore = controller.update.mock.calls.length;
      pin.click();
      timing.updatesAfter = controller.update.mock.calls.length;
      timing.capturesAfter = capture.mock.calls.length;
    });

    // Prove the intended race occurred; a disabled button or an already-updated
    // scene would not exercise the provenance guard.
    expect(timing).toMatchObject({ displayedDistance: '160', renderedDistance: 80, pinEnabled: true });
    expect(timing.updatesAfter).toBe(timing.updatesBefore);
    expect(timing.capturesAfter).toBe(capturesBefore);
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(query('[data-distance-comparison]')).toBeNull();
    expect(all('[data-distance-pinned-image]')).toHaveLength(0);
    expect(host.textContent).toContain('Reveal the current conditions before pinning.');
    expect(controller.getDiagnostics().settings.distance).toBe(160);
    expect(query('[data-distance-reveal]').disabled).toBe(true);

    // A fresh prediction and reveal at B restores normal pinning.
    await reveal('eagle'); await click('[data-distance-pin]');
    expect(imagePayload(query('[data-distance-pinned-image="reference"]'))).toBe('reference|160/8/95');
    expect(imagePayload(query('[data-distance-pinned-image="eagle"]'))).toBe('eagle|160/8/95');
  });

  it('keeps pinned images fixed while current images require a fresh prediction and match their conditions', async () => {
    const originalCanvases = all('[data-distance-canvas]');
    await reveal(); await click('[data-distance-pin]');
    const pinnedSources = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));
    expect(all('[data-distance-pinned-image]').map(imagePayload)).toEqual(['reference|80/8/95', 'eagle|80/8/95']);

    await click('[data-distance-experiment="distance"]');
    expect(controller.getDiagnostics().settings.distance).toBe(160);
    expect(all('[data-distance-current-image]')).toHaveLength(0);
    expect(all('[data-distance-current-cover]')).toHaveLength(2);
    expect(query('[data-distance-reveal]').disabled).toBe(true);
    await reveal('eagle');
    expect(all('[data-distance-current-image]').map(imagePayload)).toEqual(['reference|160/8/95', 'eagle|160/8/95']);
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinnedSources);
    for (const image of all('[data-distance-current-image]')) expect(image.closest('figure').textContent).toContain('160 m');
    expect(all('[data-distance-canvas]')).toEqual(originalCanvases);
    expect(query('[data-distance-original-panels]').style.display).toBe('none');

    await click('[data-distance-prediction="neither"]');
    expect(all('[data-distance-current-image]')).toHaveLength(0);
    expect(all('[data-distance-current-cover]')).toHaveLength(2);
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinnedSources);
  });

  it('keeps the actual current canvases visible and the pin intact when copying a current PNG fails', async () => {
    await reveal(); await click('[data-distance-pin]');
    const originalCanvases = all('[data-distance-canvas]');
    const pinnedSources = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));
    await click('[data-distance-experiment="cycles"]');
    failCapture = true;
    await reveal('eagle');
    expect(query('[data-raptor-distance-study]').getAttribute('data-render-ready')).toBe('true');
    expect(query('[data-distance-snapshot-error]').textContent).toContain('original current views');
    expect(all('[data-distance-current-image]')).toHaveLength(0);
    expect(all('[data-distance-current-cover]').every(cover => cover.textContent.includes('Use the current views above'))).toBe(true);
    expect(query('[data-distance-original-panels]').style.display).not.toBe('none');
    expect(all('[data-distance-canvas]')).toEqual(originalCanvases);
    expect(originalCanvases.every(canvas => canvas.getAttribute('data-test-rendered') === '80/16/95')).toBe(true);
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinnedSources);

    failCapture = false;
    await click('[data-distance-reveal]');
    expect(query('[data-distance-snapshot-error]')).toBeNull();
    expect(all('[data-distance-current-image]').map(imagePayload)).toEqual(['reference|80/16/95', 'eagle|80/16/95']);
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinnedSources);
    expect(query('[data-distance-original-panels]').style.display).toBe('none');
  });
});
