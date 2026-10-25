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
  explorer: '[data-distance-pair-explorer]', read: '[data-distance-signal-read]', keep: '[data-distance-signal-keep]',
  probe: '[data-distance-pair-probe]', currentProbe: '[data-distance-signal-probe]', pixel: '[data-distance-pair-pixel]',
  feedback: '[data-distance-pair-feedback]'
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
  await activate(select.keep);
  await activate(select.explorer + ' > summary');
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
function savedResult() {
  const trials = [80, 90].map(distance => {
    const settings = { version: 1, distance, cycles: 12, contrast: 95 };
    return local.RaptorDistanceFieldwork.trial(settings, local.RaptorDistanceModel.metrics(settings).referenceBand);
  });
  return { version: 1, human: local.RaptorDistanceResults.capture('human', trials) };
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

function meanFrom(source, name, index) {
  const entry = source[name][index % source[name].length];
  return Array.isArray(entry) ? entry.reduce((sum, channel) => sum + channel, 0) / 3 : entry;
}
function traces() {
  return all('[data-distance-signal-pair-line]').map(line => line.getAttribute('points'));
}
function middle() {
  return Math.floor((local.RaptorDistanceSignal.region(value, 1024, 512).count - 1) / 2);
}
function assertUnanswered() {
  expect(query(select.feedback)).toBeNull();
  for (const button of all('[data-distance-pair-answer]')) expect(button.getAttribute('aria-pressed')).toBe('false');
}
function assertSample(index, keptRows, currentRows) {
  const region = local.RaptorDistanceSignal.region(value, 1024, 512);
  expect(query(select.probe).value).toBe(String(index));
  expect(Number(query(select.pixel).getAttribute('data-x'))).toBe(region.x0 + index);
  expect(Number(query(select.pixel).getAttribute('data-y'))).toBe(region.y);
  const x = 54 + index / (region.count - 1) * 566;
  for (const [id, name] of [['human', 'reference'], ['eagle', 'eagle']]) {
    const kept = meanFrom(keptRows, name, index), current = meanFrom(currentRows, name, index);
    for (const [kind, expected] of [['kept', kept], ['current', current], ['change', current - kept]]) {
      const cell = query(`[data-distance-pair-value="${id}-${kind}"]`);
      expect(Number(cell.getAttribute('data-value'))).toBeCloseTo(expected, 10);
      const displayed = cell.textContent.replace(/\u2212/g, '-');
      expect(displayed).toContain(expected.toFixed(1));
      if (kind === 'change' && expected > 0) expect(displayed).toContain('+');
    }
    const cursor = query(`[data-distance-pair-cursor="${id}"]`);
    expect(Number(cursor.getAttribute('x1'))).toBeCloseTo(x, 3);
    expect(Number(cursor.getAttribute('x2'))).toBeCloseTo(x, 3);
    for (const [kind, expected] of [['kept', kept], ['current', current]]) {
      const marker = query(`[data-distance-pair-marker="${id}-${kind}"]`);
      expect(Number(marker.getAttribute('cx'))).toBeCloseTo(x, 3);
      expect(Number(marker.getAttribute('cy'))).toBeCloseTo(216 - expected / 255 * 192, 3);
    }
    expect(query(select.probe).getAttribute('aria-valuetext')).toContain(kept.toFixed(1));
    expect(query(select.probe).getAttribute('aria-valuetext')).toContain(current.toFixed(1));
  }
}
async function choose(id, answer, expected) {
  await activate(`[data-distance-pair-answer="${id}-${answer}"]`);
  expect(query(`[data-distance-pair-feedback="${id}"]`).getAttribute('data-correct')).toBe(String(expected));
  for (const choice of ['smaller', 'same', 'larger']) {
    expect(query(`[data-distance-pair-answer="${id}-${choice}"]`).getAttribute('aria-pressed')).toBe(String(choice === answer));
  }
}

describe('Raptor distance accessible kept/current pixel probe', () => {
  it('presents four actual samples at shared coordinates and signed differences before rounding', async () => {
    rows = { reference: [[90, 90, 91], [130, 130, 132], 100], eagle: [30, 210, 90] };
    const keptRows = structuredClone(rows);
    await inspect();
    await commit({ ...value, contrast: 25 });
    rows = { reference: [[90, 90, 92], [120, 120, 121], 90], eagle: [50, 170, 90] };
    await reveal(); await activate(select.read);
    const table = query('[data-distance-pair-samples]');
    expect(table.tagName).toBe('TABLE'); expect(table.caption.textContent.trim().length).toBeGreaterThan(15);
    expect([...table.querySelectorAll('thead th[scope="col"]')].map(cell => cell.textContent)).toEqual(['Reading', 'Human', 'Eagle']);
    expect([...table.querySelectorAll('tbody th[scope="row"]')].map(cell => cell.textContent)).toEqual(['Kept', 'Current', 'Change']);
    const region = local.RaptorDistanceSignal.region(value, 1024, 512), probe = query(select.probe);
    expect(probe.type).toBe('range'); expect(probe.min).toBe('0'); expect(probe.max).toBe(String(region.count - 1)); expect(probe.step).toBe('1');
    expect(query(`label[for="${probe.id}"]`).textContent).toContain('Compare the same pixel');
    expect(probe.getAttribute('aria-valuetext')).toMatch(/kept/i); expect(probe.getAttribute('aria-valuetext')).toMatch(/current/i);
    expect(probe.getAttribute('aria-valuetext')).toMatch(/human/i); expect(probe.getAttribute('aria-valuetext')).toMatch(/eagle/i);
    const originalTraces = traces(), before = counts();
    for (const index of [0, 1, 2, region.count - 1]) { await input(select.probe, index); assertSample(index, keptRows, rows); }
    // Both means round independently, but their raw difference is one third.
    await input(select.probe, 0);
    expect(query('[data-distance-pair-value="human-change"]').textContent).toContain('+0.3');
    expect(traces()).toEqual(originalTraces); expect(counts()).toEqual(before);
    expect(query(select.pixel).getAttribute('aria-live')).toBe('off');
    expect(query(select.probe).closest(liveSelector)).toBeNull();
    expect(table.closest(liveSelector)).toBeNull();
  });

  it('jumps to all kept extrema and endpoints, focusing the newly updated probe without moving the current probe', async () => {
    const keptRows = structuredClone(rows); await inspect();
    rows = { reference: [240, 10, 30, 60], eagle: [90, 80, 70, 60] };
    await commit({ ...value, contrast: 25 }); await reveal(); await activate(select.read);
    if (!query(select.explorer).open) await activate(`${select.explorer} > summary`);
    await input(select.currentProbe, 6);
    const region = local.RaptorDistanceSignal.region(value, 1024, 512);
    const destinations = { start: 0, middle: middle(), end: region.count - 1, 'human-min': 1, 'human-max': 2, 'eagle-min': 2, 'eagle-max': 4 };
    expect(all('[data-distance-pair-jump]')).toHaveLength(7);
    const focused = [], originalFocus = HTMLElement.prototype.focus;
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (...args) {
      if (this.matches(select.probe)) focused.push({ value: this.value, text: this.getAttribute('aria-valuetext') });
      return originalFocus.apply(this, args);
    });
    const before = counts(), originalTraces = traces();
    for (const [name, index] of Object.entries(destinations)) {
      const button = `[data-distance-pair-jump="${name}"]`;
      query(button).focus(); await activate(button);
      assertSample(index, keptRows, rows);
      expect(document.activeElement).toBe(query(select.probe));
      expect(focused.at(-1).value).toBe(String(index));
      expect(focused.at(-1).text).toContain(String(region.x0 + index));
      expect(query(select.currentProbe).value).toBe('6');
    }
    // Repeating an already-selected destination must focus without a state update.
    query('[data-distance-pair-jump="eagle-max"]').focus(); await activate('[data-distance-pair-jump="eagle-max"]');
    expect(document.activeElement).toBe(query(select.probe));
    expect(counts()).toEqual(before); expect(traces()).toEqual(originalTraces);
  });

  it('checks each range independently for mixed changes, reversed rows, and zero ranges without assuming contrast direction', async () => {
    const cases = [
      { kept: { reference: [100, 120], eagle: [10, 210] }, current: { reference: [0, 240], eagle: [90, 100] }, answers: { human: 'larger', eagle: 'smaller' } },
      { kept: { reference: [0, 240], eagle: [128] }, current: { reference: [128], eagle: [20, 80] }, answers: { human: 'smaller', eagle: 'larger' } },
      { kept: { reference: [50], eagle: [170] }, current: { reference: [180], eagle: [20] }, answers: { human: 'same', eagle: 'same' } }
    ];
    for (const example of cases) {
      await commit({ ...initial }); rows = example.kept;
      await reveal(); await activate(select.read); await activate(select.keep);
      await commit({ ...value, contrast: 25 }); rows = example.current;
      await reveal(); await activate(select.read);
      const before = counts();
      for (const id of ['human', 'eagle']) {
        const group = query(`[data-distance-pair-answer="${id}-same"]`).closest('[role="group"]');
        const label = query('#' + group.getAttribute('aria-labelledby'));
        expect(label.textContent.toLowerCase()).toContain(id);
        const live = query(`[data-distance-announcement="signal-pair-${id}"]`);
        expect(live.getAttribute('role')).toBe('status'); expect(live.getAttribute('aria-live')).toBe('polite');
        expect(live.getAttribute('aria-atomic')).toBe('true'); expect(live.querySelector(liveSelector)).toBeNull();
        const wrong = example.answers[id] === 'same' ? 'larger' : 'same';
        await choose(id, wrong, false); await choose(id, example.answers[id], true);
        expect(query(`[data-distance-announcement="signal-pair-${id}"]`)).toBe(live);
        const feedback = query(`[data-distance-pair-feedback="${id}"]`).textContent;
        expect(feedback).toMatch(/range/i); expect(feedback).toMatch(/kept/i); expect(feedback).toMatch(/current/i);
      }
      expect(counts()).toEqual(before); expect(query(select.explorer).textContent).not.toMatch(/NaN|Infinity/);
    }
  });

  it('resets probe and answers for every fresh reading and identical kept replacement, including an aliased current reading', async () => {
    await inspect();
    await input(select.probe, 0); await choose('human', 'same', true); await choose('eagle', 'same', true);
    // Same settings and same numeric values still produce a new measurement identity.
    await activate(select.read);
    expect(query(select.probe).value).toBe(String(middle())); assertUnanswered();
    await input(select.probe, 2); await choose('human', 'same', true);
    await activate(select.keep);
    expect(query(select.probe).value).toBe(String(middle())); assertUnanswered();
    // Keeping again aliases the same current data; kept object/run identity differs.
    await input(select.probe, 3); await choose('eagle', 'same', true);
    const before = counts(); await activate(select.keep);
    expect(query(select.probe).value).toBe(String(middle())); assertUnanswered(); expect(counts()).toEqual(before);
    expect(document.activeElement).toBe(query('[data-distance-signal-kept-heading]'));
  });

  it('immediately hides stale pair answers on reveal, prediction, copy failure and read failure while retaining kept data', async () => {
    await inspect(); const label = query('[data-distance-signal-kept-label]').textContent;
    await choose('human', 'same', true);
    await activate('[data-distance-reveal]');
    expect(query(select.explorer)).toBeNull(); expect(query(select.feedback)).toBeNull();
    await activate(select.read); assertUnanswered();
    await choose('eagle', 'same', true);
    failRead = 'eagle'; await activate(select.read);
    expect(query('[data-distance-signal-error]')).not.toBeNull();
    expect(query(select.explorer)).toBeNull(); expect(query(select.feedback)).toBeNull();
    failRead = null; await activate(select.read); assertUnanswered();
    await choose('human', 'same', true);
    await activate('[data-distance-prediction="eagle"]');
    expect(query(select.explorer)).toBeNull(); expect(query(select.feedback)).toBeNull();
    failCapture = true; await activate('[data-distance-reveal]');
    expect(query('[data-distance-snapshot-error]')).not.toBeNull(); expect(query(select.explorer)).toBeNull();
    failCapture = false; await activate('[data-distance-reveal]'); await activate(select.read); assertUnanswered();
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(label);
    expect(query(select.probe).value).toBe(String(middle()));
  });

  it('gates mismatched conditions before passive effects and requires matching stripe counts even at identical sample coordinates', async () => {
    await inspect(); await choose('human', 'same', true);
    const timing = {}, before = counts();
    await commit({ ...value, distance: 160 }, () => {
      timing.distance = query('#rh-distance-distance').value;
      timing.rendered = controller.getDiagnostics().settings.distance;
      timing.explorer = !!query(select.explorer); timing.answer = !!query(select.feedback);
      timing.readDisabled = query(select.read).disabled; query(select.read).click();
    });
    expect(timing).toEqual({ distance: '160', rendered: 80, explorer: false, answer: false, readDisabled: true });
    expect(readback).toHaveBeenCalledTimes(before.reads);
    await reveal(); await activate(select.read); expect(query(select.explorer)).toBeNull();
    await commit({ ...value, distance: 80, cycles: 12 }); await reveal(); await activate(select.read);
    expect(local.RaptorDistanceSignal.region(value, 1024, 512).count).toBe(local.RaptorDistanceSignal.region(initial, 1024, 512).count);
    expect(query(select.explorer)).toBeNull();
    await activate('[data-distance-signal-held]'); await reveal(); await activate(select.read);
    expect(query(select.explorer)).not.toBeNull(); assertUnanswered();
    await choose('eagle', 'same', true); const feedback = query('[data-distance-pair-feedback="eagle"]');
    await commit({ ...value }); expect(query('[data-distance-pair-feedback="eagle"]')).toBe(feedback);
  });

  it('preserves paired interpretation during independent current probing, image pins and magnifier-only changes', async () => {
    await inspect(); await input(select.probe, 5);
    await choose('human', 'same', true); await choose('eagle', 'same', true);
    const feedback = all(select.feedback), text = feedback.map(element => element.textContent), before = counts();
    await input(select.currentProbe, 1);
    expect(query(select.probe).value).toBe('5');
    await activate('[data-distance-signal-jump="end"]');
    expect(query(select.probe).value).toBe('5');
    // Pin copies existing rendered images; it must not alter measured data identity.
    await activate('[data-distance-pin]');
    expect(all(select.feedback)).toEqual(feedback); expect(all(select.feedback).map(element => element.textContent)).toEqual(text);
    const afterPin = counts();
    if (!query('[data-distance-magnifier]').open) await activate('[data-distance-magnifier] > summary');
    await activate('[data-distance-magnifier-zoom="2"]');
    expect(query(select.probe).value).toBe('5'); expect(all(select.feedback)).toEqual(feedback);
    expect(counts()).toEqual(afterPin);
    expect(afterPin.reads).toBe(before.reads); expect(afterPin.updates).toBe(before.updates); expect(afterPin.changes).toBe(before.changes);
    await input(select.probe, 7);
    expect(all(select.feedback)).toEqual(feedback); expect(all(select.feedback).map(element => element.textContent)).toEqual(text);
    expect(query(select.currentProbe).value).toBe(String(local.RaptorDistanceSignal.region(value, 1024, 512).count - 1));
  });

  it('focuses the notebook without writing evidence and preserves saved work through paired exploration and clearing', async () => {
    const record = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'Earlier saved observation.');
    const results = savedResult(); await commit({ ...initial, records: [record], fieldworkResults: results });
    await inspect(); await activate('[data-distance-pin]');
    await input('[data-distance-note]', 'I compared the ranges and the samples at the same coordinates.');
    const draft = query('[data-distance-note]').value, pinned = all('[data-distance-pinned-image]').map(image => image.getAttribute('src'));
    const before = counts(); await input(select.probe, 0); await choose('human', 'same', true);
    await activate('[data-distance-pair-note]');
    expect(document.activeElement).toBe(query('[data-distance-note]')); expect(query('[data-distance-note]').value).toBe(draft);
    expect(query('[data-distance-draft-stale]')).toBeNull(); expect(counts()).toEqual(before);
    expect(value.records).toEqual([record]); expect(value.fieldworkResults).toEqual(results);
    expect(all('[data-distance-pinned-image]').map(image => image.getAttribute('src'))).toEqual(pinned);
    await activate('[data-distance-signal-clear]');
    expect(query(select.explorer)).toBeNull(); expect(query(select.feedback)).toBeNull();
    expect(document.activeElement).toBe(query(select.keep)); expect(query('[data-distance-note]').value).toBe(draft);
    expect(query('[data-distance-draft-stale]')).not.toBeNull(); expect(counts()).toEqual(before);
    expect(value.records).toEqual([record]); expect(value.fieldworkResults).toEqual(results);
  });
});

