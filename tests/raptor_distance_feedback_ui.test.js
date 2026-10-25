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

let local, host, root, controller, controllers, capture, readback, contexts, failCapture, changes, close, value, loadResources, actDescriptor;
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
async function input(selector, text) {
  const element = query(selector);
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function announcement(name) {
  const element = query(`[data-distance-announcement="${name}"]`);
  expect(element, `persistent ${name} announcement`).not.toBeNull();
  expect(element.getAttribute('role')).toBe('status');
  expect(element.getAttribute('aria-live')).toBe('polite');
  expect(element.getAttribute('aria-atomic')).toBe('true');
  expect(element.querySelector(liveSelector)).toBeNull();
  return element;
}
function namedChoices(buttonSelector, headingId) {
  const button = query(buttonSelector), group = button.closest('[role="group"]');
  expect(group).not.toBeNull();
  expect(group.getAttribute('aria-labelledby')).toBe(headingId);
  const heading = query(`#${headingId}`);
  expect(heading).not.toBeNull();
  expect(heading.tagName).toMatch(/^H[1-6]$/);
  expect(heading.textContent.trim().length).toBeGreaterThan(12);
  expect(button.hasAttribute('aria-pressed')).toBe(true);
}
function readiness(state, next) {
  const reason = query('[data-distance-note-readiness]');
  expect(reason.id).toBe('rh-distance-note-readiness');
  expect(reason.getAttribute('data-state')).toBe(state);
  expect(reason.textContent.trim().length).toBeGreaterThan(10);
  expect(reason.closest(liveSelector)).toBeNull();
  for (const selector of ['[data-distance-note]', '[data-distance-save]']) {
    expect(query(selector).getAttribute('aria-describedby').split(/\s+/)).toContain(reason.id);
  }
  const counter = query('[data-distance-note-count]');
  expect(counter.id).toBe('rh-distance-note-count');
  expect(counter.getAttribute('aria-live')).toBe('off');
  expect(counter.textContent).toBe(`${query('[data-distance-note]').value.length} of 600 characters used.`);
  expect(counter.closest(liveSelector)).toBeNull();
  expect(query('[data-distance-note]').getAttribute('aria-describedby').split(/\s+/)).toContain(counter.id);
  if (next) expect(query('[data-distance-note-next]').textContent).toBe(next);
  else expect(query('[data-distance-note-next]')).toBeNull();
  expect(query('[data-distance-save]').disabled).toBe(state !== 'ready');
}
function workCounts() {
  return { reads: readback.mock.calls.length, captures: capture.mock.calls.length,
    updates: controllers.reduce((total, item) => total + item.update.mock.calls.length, 0), changes: changes.mock.calls.length };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function savedResult(id, distances) {
  return local.RaptorDistanceResults.capture(id, distances.map(distance => {
    const settings = { version: 1, distance, cycles: 12, contrast: 95 };
    return local.RaptorDistanceFieldwork.trial(settings, local.RaptorDistanceModel.metrics(settings).referenceBand);
  }));
}
function Host(props) {
  return h(local.RaptorDistanceStudy.Component, {
    React, settings: props.settings, loadResources, onClose: close, onChange: changes
  });
}
async function commit(settings) {
  value = settings;
  await act(async () => { root.render(h(Host, { settings: value })); });
}

beforeEach(async () => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  local = {}; sources.forEach(source => Function('window', source)(local));
  controller = null; controllers = []; contexts = new Map(); failCapture = false;
  loadResources = vi.fn(() => Promise.resolve());
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

describe('Raptor distance feedback and notebook guidance in React', () => {
  it('primes reveal and snapshot announcements before feedback and preserves their nodes through retries', async () => {
    const result = announcement('reveal'), snapshot = announcement('snapshot');
    expect(result.textContent).toBe(''); expect(snapshot.textContent).toBe('');
    namedChoices('[data-distance-prediction="both"]', 'rh-distance-prediction-question');
    await reveal();
    expect(announcement('reveal')).toBe(result);
    expect(result.textContent).toContain('Your prediction matches');
    expect(result.contains(query('[data-distance-result]'))).toBe(true);
    await activate('[data-distance-prediction="neither"]');
    expect(announcement('reveal')).toBe(result); expect(result.textContent).toBe('');
    failCapture = true; await activate('[data-distance-reveal]');
    expect(announcement('snapshot')).toBe(snapshot);
    expect(snapshot.textContent).toContain('could not be copied');
    expect(result.textContent).toContain('Compare your prediction');
    failCapture = false; await activate('[data-distance-reveal]');
    expect(announcement('snapshot')).toBe(snapshot); expect(snapshot.textContent).toBe('');
    expect(announcement('reveal')).toBe(result);
    expect(value.records || []).toEqual([]);
  });

  it('names lesson questions and retains primed reflection and match feedback while choices change', async () => {
    await activate('[data-distance-inquiry="contrast"]'); await reveal(); await activate('[data-distance-pin]');
    await activate('[data-distance-experiment="contrast"]'); await reveal();
    namedChoices('[data-distance-reflection-answer="same-same"]', 'rh-distance-reflection-question');
    const reflection = announcement('reflection'); expect(reflection.textContent).toBe('');
    await activate('[data-distance-reflection-answer="smaller-higher"]');
    expect(announcement('reflection')).toBe(reflection);
    expect(query('[data-distance-reflection-feedback]').getAttribute('data-correct')).toBe('false');
    await activate('[data-distance-reflection-answer="same-same"]');
    expect(announcement('reflection')).toBe(reflection);
    expect(query('[data-distance-reflection-feedback]').getAttribute('data-correct')).toBe('true');
    expect(reflection.contains(query('[data-distance-reflection-feedback]'))).toBe(true);
    await activate('[data-distance-match-start]'); await reveal(); await activate('[data-distance-pin]');
    const match = announcement('match'); expect(match.textContent).toBe('');
    await activate('[data-distance-match-check]');
    expect(announcement('match')).toBe(match);
    expect(query('[data-distance-match-feedback]').getAttribute('data-direction')).toBe('farther');
    await commit({ ...value, distance: 140 });
    expect(announcement('match')).toBe(match); expect(match.textContent).toBe('');
    await reveal(); await activate('[data-distance-match-check]');
    expect(announcement('match')).toBe(match);
    expect(query('[data-distance-match-feedback]').getAttribute('data-matched')).toBe('true');
    expect(value.records || []).toEqual([]);
  });

  it('keeps saved-result announcements stable and named answer feedback separate from retained evidence', async () => {
    const saved = announcement('results-save'); expect(saved.textContent).toBe('');
    const eagle = savedResult('eagle', [200, 201]);
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'An earlier observation.');
    await commit({ ...value, records: [earlier], fieldworkResults: { version: 1, eagle } });
    await activate('[data-distance-fieldwork-start="human"]');
    for (const distance of [85, 86]) {
      await commit({ ...value, distance });
      await reveal(local.RaptorDistanceModel.metrics(value).referenceBand);
      await activate('[data-distance-fieldwork-record]');
    }
    await activate('[data-distance-results-save]');
    expect(announcement('results-save')).toBe(saved);
    expect(saved.textContent).toContain('Saved the completed human trial set');
    const records = JSON.parse(JSON.stringify(value.fieldworkResults));
    const answer = announcement('results-answer'); expect(answer.textContent).toBe('');
    namedChoices('[data-distance-results-answer="frequency"]', 'rh-distance-results-question');
    await activate('[data-distance-results-answer="size"]');
    expect(announcement('results-answer')).toBe(answer);
    expect(query('[data-distance-results-feedback]').getAttribute('data-correct')).toBe('false');
    await activate('[data-distance-results-answer="frequency"]');
    expect(announcement('results-answer')).toBe(answer);
    expect(query('[data-distance-results-feedback]').getAttribute('data-correct')).toBe('true');
    expect(value.fieldworkResults).toEqual(records); expect(value.records).toEqual([earlier]);
    await activate('[data-distance-results-remove="human"]');
    expect(announcement('results-save')).toBe(saved);
    expect(saved.textContent).toContain('Removed the saved human result');
    expect(value.fieldworkResults.eagle).toEqual(eagle); expect(value.records).toEqual([earlier]);
    expect(document.activeElement).toBe(query('[data-distance-fieldwork] > summary'));
  });

  it('announces concise pixel reading outcomes without making charts or probe changes live', async () => {
    await activate('[data-distance-jump="signal"]');
    const signal = announcement('signal');
    expect(signal.textContent).toMatch(/predict|reveal/i);
    await reveal(); await activate('[data-distance-signal-read]');
    expect(announcement('signal')).toBe(signal);
    expect(signal.textContent).toMatch(/sampled/i);
    expect(signal.textContent).toContain('80 m');
    expect(signal.querySelector('svg, table, input, button')).toBeNull();
    expect(query('[data-distance-signal-chart]').closest(liveSelector)).toBeNull();
    const text = signal.textContent, readings = readback.mock.calls.length;
    await input('[data-distance-signal-probe]', '0');
    expect(announcement('signal')).toBe(signal); expect(signal.textContent).toBe(text);
    expect(query('[data-distance-signal-probe]').getAttribute('aria-valuetext')).toMatch(/Human.*eagle/);
    expect(readback).toHaveBeenCalledTimes(readings);
    readback.mockImplementationOnce(() => { throw new Error('Readback unavailable'); });
    await activate('[data-distance-signal-read]');
    expect(announcement('signal')).toBe(signal); expect(signal.textContent).toContain('Pixel reading is unavailable');
    expect(query('[data-distance-signal-chart]')).toBeNull();
    await activate('[data-distance-signal-read]');
    expect(announcement('signal')).toBe(signal); expect(signal.textContent).toMatch(/sampled/i);
    expect(value.records || []).toEqual([]);
  });

  it('explains notebook prerequisites and stale drafts while keeping character updates quiet', async () => {
    const draft = announcement('draft'); expect(draft.textContent).toBe('');
    readiness('prediction', 'Go to prediction');
    await activate('[data-distance-note-next]');
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
    await reveal(); readiness('write', 'Write an observation');
    await activate('[data-distance-note-next]'); expect(document.activeElement).toBe(query('[data-distance-note]'));
    const note = 'The same plaque retains different fine detail in the two models.';
    await input('[data-distance-note]', note); readiness('ready');
    expect(announcement('draft')).toBe(draft); expect(draft.textContent).toBe('');
    await commit({ ...value, distance: 160 }); readiness('prediction', 'Go to prediction');
    await reveal('eagle'); readiness('review', 'Review draft');
    expect(announcement('draft')).toBe(draft); expect(draft.textContent).toContain('Review this draft');
    expect(draft.querySelector('button, input, textarea')).toBeNull();
    await activate('[data-distance-note-next]'); expect(document.activeElement).toBe(query('[data-distance-adopt-draft]'));
    expect(query('[data-distance-note]').value).toBe(note);
    await activate('[data-distance-adopt-draft]'); readiness('ready');
    expect(announcement('draft')).toBe(draft); expect(draft.textContent).toBe('');
    expect(document.activeElement).toBe(query('[data-distance-note]'));
    await activate('[data-distance-save]'); readiness('write', 'Write an observation');
    expect(document.activeElement).toBe(query('[data-distance-note]'));
    expect(value.records).toHaveLength(1); expect(value.records[0].note).toBe(note);
    expect(value.records[0].distance).toBe(160);
    await input('[data-distance-note]', 'x'.repeat(600)); readiness('ready');
    expect(query('[data-distance-note]').maxLength).toBe(600);
    expect(query('[data-distance-note-count]').textContent).toBe('600 of 600 characters used.');
  });

  it('uses notebook guidance only to move focus, preserving pins, kept pixels, drafts and persisted evidence', async () => {
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'Retained observation.');
    const results = { version: 1, human: savedResult('human', [85, 86]) };
    await commit({ ...value, records: [earlier], fieldworkResults: results });
    await reveal(); await activate('[data-distance-pin]');
    await activate('[data-distance-jump="signal"]'); await activate('[data-distance-signal-read]');
    await activate('[data-distance-signal-keep]');
    const pins = all('[data-distance-pinned-image]').map(image => image.src);
    const kept = query('[data-distance-signal-kept-label]').textContent;
    const counts = workCounts(); readiness('write', 'Write an observation');
    await activate('[data-distance-note-next]'); expect(workCounts()).toEqual(counts);
    expect(document.activeElement).toBe(query('[data-distance-note]'));
    const note = 'Pixel values provide evidence without judging the picture.';
    await input('[data-distance-note]', note);
    await commit({ ...value, distance: 160 });
    const beforePrediction = workCounts();
    await activate('[data-distance-note-next]'); expect(workCounts()).toEqual(beforePrediction);
    expect(document.activeElement).toBe(query('[data-distance-prediction-heading]'));
    await reveal('eagle'); readiness('review', 'Review draft');
    const beforeReview = workCounts(), warning = announcement('draft').textContent;
    await activate('[data-distance-note-next]'); expect(workCounts()).toEqual(beforeReview);
    expect(document.activeElement).toBe(query('[data-distance-adopt-draft]'));
    expect(announcement('draft').textContent).toBe(warning);
    expect(query('[data-distance-note]').value).toBe(note);
    expect(all('[data-distance-pinned-image]').map(image => image.src)).toEqual(pins);
    expect(query('[data-distance-signal-kept-label]').textContent).toBe(kept);
    expect(value.records).toEqual([earlier]); expect(value.fieldworkResults).toEqual(results);
  });

  it('retains a stable focus destination throughout failed and successful scene retries', async () => {
    await activate('[data-raptor-distance-close]');
    const first = deferred(); loadResources.mockImplementationOnce(() => first.promise);
    await commit({ ...initial }); readiness('loading');
    const status = query('[data-distance-status]'); expect(status.getAttribute('tabindex')).toBe('-1');
    await act(async () => { first.reject(new Error('Initial resources unavailable')); });
    readiness('error', 'Go to scene recovery');
    const beforeGuide = workCounts(), requests = loadResources.mock.calls.length;
    await activate('[data-distance-note-next]');
    expect(document.activeElement).toBe(query('[data-distance-retry]'));
    expect(workCounts()).toEqual(beforeGuide); expect(loadResources).toHaveBeenCalledTimes(requests);
    const retry = deferred(); loadResources.mockImplementationOnce(() => retry.promise);
    await activate('[data-distance-retry]'); readiness('loading');
    expect(query('[data-distance-status]')).toBe(status); expect(document.activeElement).toBe(status);
    await act(async () => { retry.reject(new Error('Resources still unavailable')); });
    readiness('error', 'Go to scene recovery');
    expect(query('[data-distance-status]')).toBe(status); expect(document.activeElement).toBe(status);
    const recovery = deferred(); loadResources.mockImplementationOnce(() => recovery.promise);
    await activate('[data-distance-retry]'); readiness('loading');
    expect(document.activeElement).toBe(status);
    await act(async () => { recovery.resolve(); }); readiness('prediction', 'Go to prediction');
    expect(query('[data-distance-status]')).toBe(status); expect(document.activeElement).toBe(status);
    expect(query('[data-raptor-distance-study]').getAttribute('data-render-ready')).toBe('true');
    expect(capture).not.toHaveBeenCalled(); expect(readback).not.toHaveBeenCalled(); expect(changes).not.toHaveBeenCalled();
  });
});
