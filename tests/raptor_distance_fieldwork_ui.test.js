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
const sources = ['model', 'evidence', 'investigations', 'fieldwork', 'study'].map(name =>
  readFileSync(`stem_lab/raptor_distance_${name}.js`, 'utf8'));
const initial = { version: 1, distance: 80, cycles: 8, contrast: 95 };
const condition = settings => `${settings.distance}/${settings.cycles}/${settings.contrast}`;
const select = {
  details: '[data-distance-fieldwork]', run: '[data-distance-fieldwork-run]',
  record: '[data-distance-fieldwork-record]', restore: '[data-distance-fieldwork-restore]',
  trials: '[data-distance-fieldwork-trial]', status: '[data-distance-fieldwork-status]',
  note: '[data-distance-note]', stale: '[data-distance-draft-stale]'
};

let local, host, root, controller, capture, failCapture, changes, value, actDescriptor;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
function distances() { return all(select.trials).map(row => Number(row.getAttribute('data-distance'))); }
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
async function start(target = 'human') {
  if (!query(select.details).open) await activate(`${select.details} summary`);
  await activate(`[data-distance-fieldwork-start="${target}"]`);
  expect(query(select.run)).not.toBeNull();
}
async function writeNote(text) {
  const textarea = query(select.note);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(query(select.note).value).toBe(text);
}
function Host(props) {
  // A host layout effect runs after the child commits its new controls but
  // before the child's passive effect updates the scene and clears reveal.
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
  // This independent marker identifies actual rendered conditions, not props.
  // Browser workflows cover real pixels; these tests exercise React ownership.
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

describe('Raptor distance fieldwork in React', () => {
  it('declines a trial when new props commit before the previously revealed scene updates', async () => {
    await start(); await reveal();
    const timing = {}, capturesBefore = capture.mock.calls.length, changesBefore = changes.mock.calls.length;
    await commit({ ...value, distance: 80 }, () => {
      const record = query(select.record);
      timing.displayedDistance = query('#rh-distance-distance').value;
      timing.renderedDistance = controller.getDiagnostics().settings.distance;
      timing.recordEnabled = !record.disabled;
      timing.updatesBefore = controller.update.mock.calls.length;
      record.click();
      timing.updatesAfter = controller.update.mock.calls.length;
      timing.capturesAfter = capture.mock.calls.length;
    });

    // Confirm the hazardous timing itself, rather than passing because a
    // disabled control or an already-updated renderer avoided the action.
    expect(timing).toMatchObject({ displayedDistance: '80', renderedDistance: 40, recordEnabled: true });
    expect(timing.updatesAfter).toBe(timing.updatesBefore);
    expect(timing.capturesAfter).toBe(capturesBefore);
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(changes).toHaveBeenCalledTimes(changesBefore);
    expect(distances()).toEqual([]);
    expect(query('[data-distance-fieldwork-message]').textContent).toContain('Reveal the current conditions before recording');
    expect(controller.getDiagnostics().settings.distance).toBe(80);
    expect(query(select.record).disabled).toBe(true);

    await reveal(); await activate(select.record);
    expect(distances()).toEqual([80]);
  });

  it('records revealed numeric evidence despite PNG-copy failure without capturing, rendering, or persisting again', async () => {
    await start();
    const originalCanvases = all('[data-distance-canvas]');
    failCapture = true; await reveal();
    expect(query('[data-distance-snapshot-error]')).not.toBeNull();
    expect(query('[data-distance-original-panels]').style.display).not.toBe('none');
    expect(originalCanvases.every(canvas => canvas.getAttribute('data-test-rendered') === '40/12/95')).toBe(true);
    expect(query(select.record).disabled).toBe(false);
    const capturesBefore = capture.mock.calls.length, updatesBefore = controller.update.mock.calls.length;
    const changesBefore = changes.mock.calls.length;
    const record = query(select.record);
    await act(async () => { record.click(); record.click(); });

    expect(distances()).toEqual([40]);
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(controller.update).toHaveBeenCalledTimes(updatesBefore);
    expect(changes).toHaveBeenCalledTimes(changesBefore);
    expect(all('[data-distance-canvas]')).toEqual(originalCanvases);
    expect(query(select.status).getAttribute('data-complete')).toBe('false');
    expect(all('[data-distance-record]')).toHaveLength(0);

    const recordedText = query(select.trials).textContent;
    await commit({ ...value, distance: 120 });
    expect(distances()).toEqual([40]);
    expect(query(select.trials).textContent).toBe(recordedText);
    expect(query(select.record).disabled).toBe(true);
    expect(all('[data-distance-record]')).toHaveLength(0);
  });

  it('requires the held pattern and contrast, restores them without moving distance, and requires a fresh reveal', async () => {
    await start('eagle');
    await commit({ ...value, distance: 110, cycles: 16, contrast: 25 });
    await reveal('eagle');
    expect(query(select.record).disabled).toBe(true);
    expect(distances()).toEqual([]);

    await activate(select.restore);
    expect(value).toMatchObject({ distance: 110, cycles: 12, contrast: 95 });
    expect(condition(controller.getDiagnostics().settings)).toBe('110/12/95');
    expect(query(select.record).disabled).toBe(true);
    expect(query('[data-distance-reveal]').disabled).toBe(true);
    await reveal('eagle'); await activate(select.record);
    expect(distances()).toEqual([110]);
    expect(query(select.status).getAttribute('data-complete')).toBe('false');
  });

  it('makes guide and hunt runs exclusive and preserves notes while marking same-condition restarts as a new context', async () => {
    const saved = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'An earlier recorded observation.');
    await commit({ ...initial, records: [saved] });
    await activate('[data-distance-inquiry="distance"]');
    await reveal(); await activate('[data-distance-pin]');
    const note = 'I kept contrast fixed and compared the spacing at 80 metres.';
    await writeNote(note);
    expect(query(select.stale)).toBeNull();
    expect(query('[data-distance-guide]')).not.toBeNull();
    expect(query('[data-distance-comparison]')).not.toBeNull();

    await start();
    expect(value).toMatchObject({ distance: 40, cycles: 12, contrast: 95 });
    expect(query('[data-distance-guide]')).toBeNull();
    expect(query('[data-distance-comparison]')).toBeNull();
    expect(query('[data-distance-reveal]').disabled).toBe(true);
    expect(query(select.note).value).toBe(note);
    expect(query(select.stale)).not.toBeNull();

    await activate('[data-distance-adopt-draft]');
    expect(query(select.stale)).toBeNull();
    await reveal(); await activate(select.record);
    expect(distances()).toEqual([40]);
    await start();
    // The numeric settings are identical. Only a new run identity can make
    // this retained draft stale and distinguish the restarted investigation.
    expect(value).toMatchObject({ distance: 40, cycles: 12, contrast: 95 });
    expect(distances()).toEqual([]);
    expect(query(select.note).value).toBe(note);
    expect(query(select.stale)).not.toBeNull();
    expect(query(select.record).disabled).toBe(true);
    await activate('[data-distance-adopt-draft]');
    expect(query(select.stale)).toBeNull();

    await start('eagle');
    expect(query(select.stale)).not.toBeNull();
    await activate('[data-distance-inquiry="cycles"]');
    expect(query(select.run)).toBeNull();
    expect(query('[data-distance-guide]').getAttribute('data-distance-guide')).toBe('cycles');
    expect(query(select.note).value).toBe(note);
    expect(query(select.stale)).not.toBeNull();
    expect(all('[data-distance-record]')).toHaveLength(1);
    expect(query('[data-distance-record]').textContent).toContain(saved.note);
  });
});
