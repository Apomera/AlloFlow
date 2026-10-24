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
const sources = ['model', 'evidence', 'investigations', 'fieldwork', 'results', 'match', 'study'].map(name =>
  readFileSync(`stem_lab/raptor_distance_${name}.js`, 'utf8'));
const initial = { version: 1, distance: 80, cycles: 8, contrast: 95 };
const condition = settings => `${settings.distance}/${settings.cycles}/${settings.contrast}`;
const payload = image => Buffer.from(image.getAttribute('src').split(',')[1], 'base64').toString('utf8');
const select = {
  details: '[data-distance-match]', start: '[data-distance-match-start]', active: '[data-distance-match-active]',
  next: '[data-distance-match-next]', check: '[data-distance-match-check]', restore: '[data-distance-match-restore]',
  feedback: '[data-distance-match-feedback]', human: '[data-distance-match-image="human"]',
  eagle: '[data-distance-match-image="eagle"]', exit: '[data-distance-match-exit]'
};

let local, host, root, controller, capture, failCapture, changes, close, value, actDescriptor;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
async function activate(selector) {
  const element = query(selector);
  expect(element, selector).not.toBeNull();
  if ('disabled' in element) expect(element.disabled, selector).toBe(false);
  await act(async () => { element.click(); });
}
async function start() {
  if (!query(select.details).open) await activate(`${select.details} > summary`);
  await activate(select.start);
  expect(query(select.active)).not.toBeNull();
  expect(value).toMatchObject({ distance: 60, cycles: 8, contrast: 95 });
}
async function reveal(prediction = 'both') {
  await activate(`[data-distance-prediction="${prediction}"]`);
  await activate('[data-distance-reveal]');
}
async function pinStarter() {
  await start();
  await activate(select.next);
  expect(document.activeElement).toBe(query('[data-distance-prediction="both"]'));
  await reveal(); await activate(select.next);
  expect(payload(query(select.human))).toBe('reference|60/8/95');
  await activate(select.next);
  expect(document.activeElement).toBe(query('#rh-distance-distance'));
}
async function setDistance(distance) {
  const input = query('#rh-distance-distance');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(distance));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(query('#rh-distance-distance').value).toBe(String(distance));
}
async function writeNote(text) {
  const textarea = query('[data-distance-note]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(query('[data-distance-note]').value).toBe(text);
}
async function check(matched, direction) {
  const capturesBefore = capture.mock.calls.length, updatesBefore = controller.update.mock.calls.length;
  const changesBefore = changes.mock.calls.length;
  await activate(select.check);
  expect(query(select.feedback).getAttribute('data-matched')).toBe(String(matched));
  expect(query(select.feedback).getAttribute('data-direction')).toBe(direction);
  expect(capture).toHaveBeenCalledTimes(capturesBefore);
  expect(controller.update).toHaveBeenCalledTimes(updatesBefore);
  expect(changes).toHaveBeenCalledTimes(changesBefore);
  expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(1);
}
function Host(props) {
  // Observe new controls and evidence gating before the passive scene-update
  // effect can clear old reveal state or repaint the controlled canvases.
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
  failCapture = false; controller = null;
  // Equal rendered conditions intentionally produce identical PNG strings, so
  // fresh-reveal tests distinguish evidence identity from identical pixels.
  capture = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    if (failCapture) throw new Error('Image copying unavailable');
    return 'data:image/png;base64,' + Buffer.from(`${this.getAttribute('data-distance-canvas')}|${this.getAttribute('data-test-rendered')}`).toString('base64');
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
        getDiagnostics: () => ({ settings: rendered && { ...rendered } }),
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
    vi.restoreAllMocks(); root = null; controller = null; local = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Raptor distance normalized-detail matching in React', () => {
  it('compares the pinned human and fresh eagle views, recognizes 139–140 m, and asks for nearer at 142 m without rendering during checks', async () => {
    await pinStarter(); await check(false, 'farther');
    const originalCanvases = all('[data-distance-canvas]');
    for (const distance of [139, 140]) {
      await setDistance(distance);
      expect(query(select.check).disabled).toBe(true);
      await reveal('eagle');
      expect(payload(query(select.human))).toBe('reference|60/8/95');
      expect(payload(query(select.eagle))).toBe(`eagle|${distance}/8/95`);
      await check(true, 'matched');
    }

    // A new reveal at exactly the same settings is a new inspection, even
    // though its PNG strings are identical. Prior feedback must not survive it.
    const source = query(select.eagle).getAttribute('src');
    await activate('[data-distance-reveal]');
    expect(query(select.eagle).getAttribute('src')).toBe(source);
    expect(query(select.feedback)).toBeNull();
    await check(true, 'matched');
    await setDistance(142); await reveal('eagle'); await check(false, 'nearer');
    expect(all('[data-distance-canvas]')).toEqual(originalCanvases);

    const pinnedSource = query(select.human).getAttribute('src');
    const capturesBefore = capture.mock.calls.length, updatesBefore = controller.update.mock.calls.length;
    const changesBefore = changes.mock.calls.length;
    await activate('[data-distance-match-note]');
    expect(document.activeElement).toBe(query('[data-distance-note]'));
    await activate(select.exit);
    expect(query(select.active)).toBeNull();
    expect(query('[data-distance-pinned-image="reference"]').getAttribute('src')).toBe(pinnedSource);
    expect(value).toMatchObject({ distance: 142, cycles: 8, contrast: 95 });
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(controller.update).toHaveBeenCalledTimes(updatesBefore);
    expect(changes).toHaveBeenCalledTimes(changesBefore);
  });

  it('blocks changed stripe count or contrast and restores held values at the same distance before a fresh reveal', async () => {
    await pinStarter();
    await setDistance(140); await reveal('eagle'); await check(true, 'matched');
    await commit({ ...value, distance: 150, cycles: 12, contrast: 25 });
    await reveal('eagle');
    expect(query(select.check).disabled).toBe(true);
    expect(query(select.feedback)).toBeNull();
    await activate(select.restore);
    expect(value).toMatchObject({ distance: 150, cycles: 8, contrast: 95 });
    expect(condition(controller.getDiagnostics().settings)).toBe('150/8/95');
    expect(query(select.check).disabled).toBe(true);
    expect(query(select.eagle)).toBeNull();
    expect(query('[data-distance-reveal]').disabled).toBe(true);
    expect(payload(query(select.human))).toBe('reference|60/8/95');
    await reveal('eagle'); await check(false, 'nearer');
  });

  it('hides old feedback and the current image in the committed DOM before a changed scene is painted', async () => {
    await pinStarter();
    await setDistance(140); await reveal('eagle'); await check(true, 'matched');
    const timing = {}, capturesBefore = capture.mock.calls.length;
    await commit({ ...value, distance: 160 }, () => {
      timing.displayedDistance = query('#rh-distance-distance').value;
      timing.renderedDistance = controller.getDiagnostics().settings.distance;
      timing.feedbackPresent = !!query(select.feedback);
      timing.eaglePresent = !!query(select.eagle);
      timing.humanPayload = payload(query(select.human));
      timing.checkDisabled = query(select.check).disabled;
      timing.updatesBefore = controller.update.mock.calls.length;
      query(select.check).click();
      timing.updatesAfter = controller.update.mock.calls.length;
    });
    expect(timing).toMatchObject({ displayedDistance: '160', renderedDistance: 140, feedbackPresent: false,
      eaglePresent: false, humanPayload: 'reference|60/8/95', checkDisabled: true });
    expect(timing.updatesAfter).toBe(timing.updatesBefore);
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(query(select.feedback)).toBeNull();
    await reveal('eagle'); await check(false, 'nearer');
    await activate('[data-distance-prediction="neither"]');
    expect(query(select.feedback)).toBeNull(); expect(query(select.eagle)).toBeNull();
    expect(query(select.check).disabled).toBe(true);
    expect(payload(query(select.human))).toBe('reference|60/8/95');
  });

  it('keeps the pin and original canvases usable after PNG failure, gates comparison, and cleans up on close', async () => {
    await pinStarter();
    const originalCanvases = all('[data-distance-canvas]');
    await setDistance(140); failCapture = true; await reveal('eagle');
    expect(query('[data-distance-snapshot-error]')).not.toBeNull();
    expect(query('[data-distance-original-panels]').style.display).not.toBe('none');
    expect(payload(query(select.human))).toBe('reference|60/8/95');
    expect(query(select.eagle)).toBeNull(); expect(query(select.feedback)).toBeNull();
    expect(query(select.check).disabled).toBe(true);
    const capturesBefore = capture.mock.calls.length, updatesBefore = controller.update.mock.calls.length;
    await act(async () => { query(select.check).click(); });
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(controller.update).toHaveBeenCalledTimes(updatesBefore);
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(1);
    expect(controller.dispose).not.toHaveBeenCalled();
    expect(all('[data-distance-canvas]')).toEqual(originalCanvases);

    failCapture = false; await activate('[data-distance-reveal]');
    expect(query('[data-distance-snapshot-error]')).toBeNull();
    expect(payload(query(select.eagle))).toBe('eagle|140/8/95');
    await check(true, 'matched');
    await activate('[data-raptor-distance-close]');
    expect(close).toHaveBeenCalledTimes(1);
    expect(query('[data-raptor-distance-study]')).toBeNull();
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it('uses a new draft context on same-value restart, excludes other guides, and preserves notes and saved evidence', async () => {
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'A saved notebook observation.');
    const trials = [80, 90].map(distance => {
      const settings = { version: 1, distance, cycles: 12, contrast: 95 };
      return local.RaptorDistanceFieldwork.trial(settings, local.RaptorDistanceModel.metrics(settings).referenceBand);
    });
    const savedResults = { version: 1, human: local.RaptorDistanceResults.capture('human', trials) };
    await commit({ ...initial, records: [earlier], fieldworkResults: savedResults });
    await start();
    const note = 'Compare the same stripe pattern through the two selected reference models.';
    await writeNote(note);
    expect(query('[data-distance-draft-stale]')).toBeNull();
    await start();
    // Settings and pin remain identical; the restarted challenge's run identity
    // is the only changed draft context here.
    expect(value).toMatchObject({ distance: 60, cycles: 8, contrast: 95 });
    expect(query('[data-distance-draft-stale]')).not.toBeNull();
    expect(query('[data-distance-note]').value).toBe(note);
    await activate('[data-distance-adopt-draft]');
    expect(query('[data-distance-draft-stale]')).toBeNull();

    await reveal(); await activate(select.next);
    expect(query('[data-distance-comparison]')).not.toBeNull();
    await activate('[data-distance-inquiry="cycles"]');
    expect(query(select.active)).toBeNull();
    expect(query('[data-distance-guide]')).not.toBeNull();
    expect(query('[data-distance-comparison]')).toBeNull();
    await start();
    expect(query('[data-distance-guide]')).toBeNull();
    if (!query('[data-distance-fieldwork]').open) await activate('[data-distance-fieldwork] > summary');
    await activate('[data-distance-fieldwork-start="human"]');
    expect(query(select.active)).toBeNull();
    expect(query('[data-distance-fieldwork-run]')).not.toBeNull();
    await start();
    expect(query('[data-distance-fieldwork-run]')).toBeNull();
    expect(query('[data-distance-comparison]')).toBeNull();
    expect(query('[data-distance-note]').value).toBe(note);
    expect(query('[data-distance-draft-stale]')).not.toBeNull();
    expect(value.records).toEqual([earlier]);
    expect(value.fieldworkResults).toEqual(savedResults);
    expect(query('[data-distance-saved-result="human"]')).not.toBeNull();
  });
});
