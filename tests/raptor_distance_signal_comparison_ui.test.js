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
const strongRows = () => ({ reference: [90, 100, 110, 120, 130], eagle: [30, 60, 90, 120, 150, 180, 210] });
const weakRows = () => ({ reference: [110, 115, 120], eagle: [90, 100, 110, 120] });
const select = {
  details: '[data-distance-signal]', read: '[data-distance-signal-read]', keep: '[data-distance-signal-keep]',
  kept: '[data-distance-signal-kept]', label: '[data-distance-signal-kept-label]', clear: '[data-distance-signal-clear]',
  lower: '[data-distance-signal-lower]', held: '[data-distance-signal-held]', pair: '[data-distance-signal-pair]',
  status: '[data-distance-signal-pair-status]', probe: '[data-distance-signal-probe]'
};

let local, host, root, controller, controllers, capture, readback, contexts, buffers, rows, failCapture, failRead;
let changes, close, value, actDescriptor;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
function keptRange(id) { return Number(query(`[data-distance-signal-kept-range="${id}"]`).getAttribute('data-range')); }
function line(id) { return query(`[data-distance-signal-pair-line="${id}"]`); }
function pairLines() { return Object.fromEntries(all('[data-distance-signal-pair-line]').map(element =>
  [element.getAttribute('data-distance-signal-pair-line'), element.getAttribute('points')])); }
async function activate(selector) {
  const element = query(selector);
  expect(element, selector).not.toBeNull();
  if ('disabled' in element) expect(element.disabled, selector).toBe(false);
  await act(async () => { element.click(); });
}
async function openSignal() {
  if (!query(select.details).open) await activate(`${select.details} > summary`);
}
async function revealAndRead() {
  await activate(`[data-distance-prediction="${local.RaptorDistanceModel.metrics(value).referenceBand}"]`);
  await activate('[data-distance-reveal]'); await activate(select.read);
}
async function setProbe(index) {
  const input = query(select.probe);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(index));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function writeNote(text) {
  const textarea = query('[data-distance-note]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function assertRatio(id, expected) {
  const output = query(`[data-distance-signal-pair-ratio="${id}"]`);
  if (expected === null) {
    expect(output.hasAttribute('data-ratio')).toBe(false);
    expect(output.textContent).toContain('Not defined');
    expect(output.textContent).toContain('kept range is zero');
  } else {
    expect(Number(output.getAttribute('data-ratio'))).toBeCloseTo(expected, 10);
    expect(output.textContent).toBe(expected.toFixed(2) + '×');
  }
}
function assertTrace(id, pattern) {
  const points = line(id).getAttribute('points').split(' ').map(point => point.split(',').map(Number));
  expect(points).toHaveLength(177);
  expect(points[0][0]).toBe(54); expect(points.at(-1)[0]).toBe(620);
  for (const index of [0, 1, 4, 6, 176]) {
    // Inverting the shared fixed code-value axis verifies real sample values;
    // automatic per-series rescaling would fail this comparison.
    expect((216 - points[index][1]) / 192 * 255).toBeCloseTo(pattern[index % pattern.length], 2);
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
  controller = null; controllers = []; contexts = new Map(); buffers = []; rows = strongRows();
  failCapture = false; failRead = null;
  capture = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    if (failCapture) throw new Error('Image copying unavailable');
    return 'data:image/png;base64,' + Buffer.from(`${this.getAttribute('data-distance-canvas')}|${this.getAttribute('data-test-rendered')}`).toString('base64');
  });
  readback = vi.fn((name, x, y, width, height) => {
    if (failRead === name) throw new Error('Pixel reading unavailable');
    const data = new Uint8ClampedArray(width * height * 4), pattern = rows[name];
    for (let index = 0; index < width * height; index++) {
      data[index * 4] = data[index * 4 + 1] = data[index * 4 + 2] = pattern[index % pattern.length];
      data[index * 4 + 3] = 255;
    }
    buffers.push(data); return { data, width, height };
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

describe('Raptor distance kept pixel-reading comparisons in React', () => {
  it('keeps immutable measured values and compares independent current rows on the same fixed scale', async () => {
    await openSignal(); expect(query(select.keep).disabled).toBe(true);
    await revealAndRead();
    const counts = { reads: readback.mock.calls.length, captures: capture.mock.calls.length,
      updates: controller.update.mock.calls.length, changes: changes.mock.calls.length };
    await activate(select.keep);
    expect(document.activeElement).toBe(query('[data-distance-signal-kept-heading]'));
    expect(query(select.keep).textContent).toContain('Replace kept reading');
    expect(query(select.pair).getAttribute('data-kind')).toBe('same');
    expect(keptRange('human')).toBe(40); expect(keptRange('eagle')).toBe(180);
    assertRatio('human', 1); assertRatio('eagle', 1);
    expect(readback).toHaveBeenCalledTimes(counts.reads); expect(capture).toHaveBeenCalledTimes(counts.captures);
    expect(controller.update).toHaveBeenCalledTimes(counts.updates); expect(changes).toHaveBeenCalledTimes(counts.changes);
    const oldKept = { human: line('human-kept').getAttribute('points'), eagle: line('eagle-kept').getAttribute('points') };
    const keptLabel = query(select.label).textContent;

    // A later mutable ImageData buffer must not mutate the kept numeric sample.
    buffers.forEach(buffer => buffer.fill(0)); rows = weakRows();
    await activate(select.lower);
    expect(value).toMatchObject({ distance: 80, cycles: 8, contrast: 25 });
    expect(query(select.pair)).toBeNull(); expect(query(select.keep).disabled).toBe(true);
    expect(query(select.label).textContent).toBe(keptLabel);
    await revealAndRead();
    expect(query(select.pair).getAttribute('data-kind')).toBe('contrast');
    expect(line('human-kept').getAttribute('points')).toBe(oldKept.human);
    expect(line('eagle-kept').getAttribute('points')).toBe(oldKept.eagle);
    assertTrace('human-kept', strongRows().reference); assertTrace('eagle-kept', strongRows().eagle);
    assertTrace('human-current', weakRows().reference); assertTrace('eagle-current', weakRows().eagle);
    expect(line('human-kept').hasAttribute('stroke-dasharray')).toBe(true);
    expect(line('human-current').hasAttribute('stroke-dasharray')).toBe(false);
    for (const chart of all('[data-distance-signal-pair-chart]')) expect(chart.getAttribute('viewBox')).toBe('0 0 640 260');
    assertRatio('human', .25); assertRatio('eagle', 1 / 6);
    expect(Number(query('[data-distance-signal-pair-range="human"]').getAttribute('data-range'))).toBe(10);
    expect(Number(query('[data-distance-signal-pair-range="eagle"]').getAttribute('data-range'))).toBe(30);
    const comparisonLines = pairLines(), readsBeforeProbe = readback.mock.calls.length;
    const capturesBeforeProbe = capture.mock.calls.length, updatesBeforeProbe = controller.update.mock.calls.length;
    const changesBeforeProbe = changes.mock.calls.length;
    await setProbe(4);
    expect(Number(query('[data-distance-signal-value="human"]').textContent)).toBe(115);
    expect(Number(query('[data-distance-signal-value="eagle"]').textContent)).toBe(90);
    expect(pairLines()).toEqual(comparisonLines);
    expect(readback).toHaveBeenCalledTimes(readsBeforeProbe);
    expect(capture).toHaveBeenCalledTimes(capturesBeforeProbe);
    expect(controller.update).toHaveBeenCalledTimes(updatesBeforeProbe);
    expect(changes).toHaveBeenCalledTimes(changesBeforeProbe);
  });

  it('immediately gates stale comparisons and Keep on prop commits, repeat reveals, and changed predictions', async () => {
    await openSignal(); await revealAndRead(); await activate(select.keep);
    const label = query(select.label).textContent, readsBefore = readback.mock.calls.length, timing = {};
    await commit({ ...value, contrast: 25 }, () => {
      timing.displayedContrast = query('#rh-distance-contrast').value;
      timing.renderedContrast = controller.getDiagnostics().settings.contrast;
      timing.pairPresent = !!query(select.pair); timing.keepDisabled = query(select.keep).disabled;
      timing.keptLabel = query(select.label).textContent;
      query(select.keep).click();
    });
    expect(timing).toEqual({ displayedContrast: '25', renderedContrast: 95, pairPresent: false, keepDisabled: true, keptLabel: label });
    expect(readback).toHaveBeenCalledTimes(readsBefore);
    rows = weakRows(); await revealAndRead();
    expect(query(select.pair)).not.toBeNull();
    await activate('[data-distance-reveal]');
    expect(query(select.pair)).toBeNull(); expect(query(select.keep).disabled).toBe(true);
    expect(query(select.label).textContent).toBe(label);
    await activate(select.read);
    expect(query(select.pair)).not.toBeNull();
    await activate('[data-distance-prediction="neither"]');
    expect(query(select.pair)).toBeNull(); expect(query(select.keep).disabled).toBe(true);
    expect(query(select.kept)).not.toBeNull();
    await activate(select.clear);
    expect(query(select.kept)).toBeNull();
    expect(query(select.keep).disabled).toBe(true);
    expect(document.activeElement).toBe(query(`${select.details} > summary`));
  });

  it('rejects both changed sample geometry and changed stripe count, then restores held controls without changing contrast', async () => {
    await openSignal(); await revealAndRead(); await activate(select.keep);
    await commit({ ...value, distance: 160, contrast: 25 }); await revealAndRead();
    expect(query(select.pair)).toBeNull(); expect(query(select.status).textContent).toMatch(/distance|stripe|held/i);
    expect(query(select.held).disabled).toBe(false);
    await commit({ ...value, distance: 80, cycles: 12 }); await revealAndRead();
    // Eight and twelve stripe pairs have exactly the same projected sample
    // region at80 m, so region equality alone cannot permit this comparison.
    expect(query(select.pair)).toBeNull();
    await activate(select.held);
    expect(value).toMatchObject({ distance: 80, cycles: 8, contrast: 25 });
    expect(query(select.held).disabled).toBe(true);
    expect(query(select.pair)).toBeNull();
    await revealAndRead(); expect(query(select.pair).getAttribute('data-kind')).toBe('contrast');

    await commit({ ...value, distance: 220, cycles: 16, contrast: 50 });
    await activate(select.lower);
    expect(value).toMatchObject({ distance: 80, cycles: 8, contrast: 25 });
    expect(query(select.pair)).toBeNull();
    await revealAndRead(); await activate(select.keep);
    expect(query(select.lower).disabled).toBe(true);
    expect(query(select.pair).getAttribute('data-kind')).toBe('same');
  });

  it('treats each zero kept range as undefined and nonzero-to-zero ranges as a valid zero ratio', async () => {
    await openSignal();
    const cases = [
      { kept: { reference: [128], eagle: [100, 120] }, current: { reference: [90, 130], eagle: [128] }, ratios: [null, 0] },
      { kept: { reference: [100, 120], eagle: [128] }, current: { reference: [128], eagle: [90, 130] }, ratios: [0, null] },
      { kept: { reference: [128], eagle: [128] }, current: { reference: [128], eagle: [128] }, ratios: [null, null] }
    ];
    for (const example of cases) {
      await commit({ ...value, contrast: 95 }); rows = example.kept;
      await revealAndRead(); await activate(select.keep);
      await activate(select.lower); rows = example.current; await revealAndRead();
      expect(query(select.pair)).not.toBeNull();
      assertRatio('human', example.ratios[0]); assertRatio('eagle', example.ratios[1]);
      expect(query(select.pair).textContent).not.toMatch(/NaN|Infinity/);
    }
  });

  it('retains draft text but requires adoption after keep, identical replacement, and clearing while preserving pins and saved evidence', async () => {
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'An existing saved observation.');
    const trials = [80, 90].map(distance => {
      const cfg = { version: 1, distance, cycles: 12, contrast: 95 };
      return local.RaptorDistanceFieldwork.trial(cfg, local.RaptorDistanceModel.metrics(cfg).referenceBand);
    });
    const results = { version: 1, human: local.RaptorDistanceResults.capture('human', trials) };
    await commit({ ...initial, records: [earlier], fieldworkResults: results });
    await openSignal(); await revealAndRead(); await activate('[data-distance-pin]');
    const note = 'The compared strips use the same image coordinates.';
    await writeNote(note); expect(query('[data-distance-draft-stale]')).toBeNull();
    const pinned = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));
    const canvases = all('[data-distance-canvas]'), counts = { reads: readback.mock.calls.length,
      captures: capture.mock.calls.length, updates: controller.update.mock.calls.length, changes: changes.mock.calls.length };
    for (const action of [select.keep, select.keep, select.clear]) {
      await activate(action);
      expect(document.activeElement).toBe(query(action === select.clear ? select.keep : '[data-distance-signal-kept-heading]'));
      expect(query('[data-distance-note]').value).toBe(note);
      expect(query('[data-distance-draft-stale]')).not.toBeNull();
      expect(query('[data-distance-draft-stale]').textContent).toContain('kept pixel reading');
      await activate('[data-distance-adopt-draft]');
      expect(query('[data-distance-draft-stale]')).toBeNull();
    }
    expect(query(select.kept)).toBeNull(); expect(query(select.pair)).toBeNull();
    expect(query('[data-distance-signal-chart]')).not.toBeNull();
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinned);
    expect(all('[data-distance-canvas]')).toEqual(canvases);
    expect(value.records).toEqual([earlier]); expect(value.fieldworkResults).toEqual(results);
    expect(readback).toHaveBeenCalledTimes(counts.reads); expect(capture).toHaveBeenCalledTimes(counts.captures);
    expect(controller.update).toHaveBeenCalledTimes(counts.updates); expect(changes).toHaveBeenCalledTimes(counts.changes);
  });

  it('preserves a completed guided reflection through kept-reading changes but resets it when an activity condition changes', async () => {
    await openSignal(); await activate('[data-distance-inquiry="contrast"]');
    await revealAndRead(); await activate('[data-distance-pin]');
    await activate('[data-distance-experiment="contrast"]'); await revealAndRead();
    const answer = '[data-distance-reflection-answer="same-same"]';
    const feedback = '[data-distance-reflection-feedback]';
    await activate(answer);
    expect(query(answer).getAttribute('aria-pressed')).toBe('true');
    expect(query(feedback).getAttribute('data-correct')).toBe('true');
    const explanation = query(feedback).textContent;
    const pinned = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));

    for (const action of [select.keep, select.keep, select.clear]) {
      await activate(action);
      expect(query(answer).getAttribute('aria-pressed')).toBe('true');
      expect(query(feedback).getAttribute('data-correct')).toBe('true');
      expect(query(feedback).textContent).toBe(explanation);
      expect(query('[data-distance-guide]').getAttribute('data-distance-guide')).toBe('contrast');
      expect(value).toMatchObject({ distance: 80, cycles: 8, contrast: 25 });
      expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinned);
    }

    await commit({ ...value, distance: 81 });
    expect(query(feedback)).toBeNull();
    await commit({ ...value, distance: 80 }); await revealAndRead();
    expect(query(answer).getAttribute('aria-pressed')).toBe('false');
    expect(query(feedback)).toBeNull();
  });

  it('retains the kept reading through failures and activity restarts, but clears it on close and releases each scene', async () => {
    await openSignal(); await revealAndRead(); await activate(select.keep);
    const label = query(select.label).textContent;
    await activate(select.lower); failCapture = true;
    await activate('[data-distance-prediction="both"]'); await activate('[data-distance-reveal]');
    expect(query('[data-distance-snapshot-error]')).not.toBeNull();
    expect(query(select.kept)).not.toBeNull(); expect(query(select.pair)).toBeNull();
    failCapture = false; await activate('[data-distance-reveal]'); failRead = 'eagle'; await activate(select.read);
    expect(query('[data-distance-signal-error]')).not.toBeNull();
    expect(query(select.label).textContent).toBe(label);
    expect(keptRange('human')).toBe(40); expect(keptRange('eagle')).toBe(180);
    expect(query(select.pair)).toBeNull(); expect(query(select.keep).disabled).toBe(true);
    failRead = null; await activate(select.read);
    expect(query(select.pair)).not.toBeNull();
    await activate('[data-distance-signal-start]');
    expect(query('[data-distance-guide]').getAttribute('data-distance-guide')).toBe('contrast');
    expect(query(select.label).textContent).toBe(label); expect(query(select.pair)).toBeNull();
    if (!query('[data-distance-fieldwork]').open) await activate('[data-distance-fieldwork] > summary');
    await activate('[data-distance-fieldwork-start="human"]');
    expect(query(select.label).textContent).toBe(label);
    if (!query('[data-distance-match]').open) await activate('[data-distance-match] > summary');
    await activate('[data-distance-match-start]');
    expect(query(select.label).textContent).toBe(label);
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(1);

    const oldController = controller, savedSettings = value;
    await activate('[data-raptor-distance-close]');
    expect(oldController.dispose).toHaveBeenCalledTimes(1);
    expect(query('[data-raptor-distance-study]')).toBeNull();
    await commit(savedSettings); await openSignal();
    expect(query(select.kept)).toBeNull(); expect(query(select.pair)).toBeNull();
    expect(query(select.keep).disabled).toBe(true);
    expect(controller).not.toBe(oldController);
    expect(local.RaptorDistanceScene.create).toHaveBeenCalledTimes(2);
  });
});
