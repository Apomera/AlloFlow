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
const sources = ['model', 'evidence', 'investigations', 'fieldwork', 'results', 'study'].map(name =>
  readFileSync(`stem_lab/raptor_distance_${name}.js`, 'utf8'));
const initial = { version: 1, distance: 80, cycles: 8, contrast: 95 };
const condition = settings => `${settings.distance}/${settings.cycles}/${settings.contrast}`;
const select = {
  details: '[data-distance-fieldwork]', run: '[data-distance-fieldwork-run]',
  trialRecord: '[data-distance-fieldwork-record]', trials: '[data-distance-fieldwork-trial]',
  save: '[data-distance-results-save]', ratio: '[data-distance-results-ratio]',
  feedback: '[data-distance-results-feedback]'
};

let local, host, root, controller, controllers, capture, failCapture, changes, value, actDescriptor;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
function savedCard(id) { return query(`[data-distance-saved-result="${id}"]`); }
function savedDistances(id) { return value.fieldworkResults[id].trials.map(trial => trial.settings.distance); }
function displayedSavedDistances(id) {
  return [...savedCard(id).querySelectorAll('[data-distance-saved-trial]')].map(row => Number(row.getAttribute('data-distance')));
}
async function activate(selector) {
  const element = query(selector);
  expect(element, selector).not.toBeNull();
  if ('disabled' in element) expect(element.disabled, selector).toBe(false);
  await act(async () => { element.click(); });
}
async function openFieldwork() {
  if (!query(select.details).open) await activate(`${select.details} summary`);
}
async function start(id = 'human') {
  await openFieldwork(); await activate(`[data-distance-fieldwork-start="${id}"]`);
}
async function reveal(prediction = 'both') {
  await activate(`[data-distance-prediction="${prediction}"]`);
  await activate('[data-distance-reveal]');
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
async function recordAt(distance) {
  await setDistance(distance);
  await reveal(local.RaptorDistanceModel.metrics(value).referenceBand);
  await activate(select.trialRecord);
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
function result(id, distances) {
  const trials = distances.map(distance => {
    const settings = { version: 1, distance, cycles: 12, contrast: 95 };
    return local.RaptorDistanceFieldwork.trial(settings, local.RaptorDistanceModel.metrics(settings).referenceBand);
  });
  const captured = local.RaptorDistanceResults.capture(id, trials);
  expect(captured).not.toBeNull();
  return captured;
}
function pairedResults() {
  return { version: 1, human: result('human', [80, 90]), eagle: result('eagle', [200, 210]) };
}
function Host(props) {
  // Observe the newly committed DOM before a passive reset can conceal stale
  // reflection feedback associated with the previous saved evidence.
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
  failCapture = false; controller = null; controllers = [];
  capture = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    if (failCapture) throw new Error('Image copying unavailable');
    return 'data:image/png;base64,' + Buffer.from(`${this.getAttribute('data-distance-canvas')}|${this.getAttribute('data-test-rendered')}`).toString('base64');
  });
  // The scene's last rendered settings remain independent of current React
  // props. Actual GPU/image behavior is exercised by the browser workflows.
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
      controllers.push(controller); return controller;
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
    for (const instance of controllers || []) expect(instance.dispose).toHaveBeenCalledTimes(1);
  } finally {
    if (host) host.remove();
    vi.restoreAllMocks(); root = null; controller = null; controllers = []; local = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Raptor distance saved fieldwork results in React', () => {
  it('keeps the completed collected trials despite changed live conditions and unavailable PNG copies', async () => {
    await start();
    expect(query(select.save).disabled).toBe(true);
    failCapture = true;
    await recordAt(80); expect(query(select.save).disabled).toBe(true);
    await recordAt(90);
    expect(query('[data-distance-snapshot-error]')).not.toBeNull();
    expect(query(select.save).disabled).toBe(false);
    const expected = result('human', [80, 90]);

    // These current conditions are neither held nor revealed. Saving must use
    // the already collected experiment, not relabel it with the live scene.
    await commit({ ...value, distance: 300, cycles: 20, contrast: 25 });
    expect(query('[data-distance-reveal]').disabled).toBe(true);
    const capturesBefore = capture.mock.calls.length, updatesBefore = controller.update.mock.calls.length;
    const changesBefore = changes.mock.calls.length, originalCanvases = all('[data-distance-canvas]');
    await activate(select.save);
    expect(value).toMatchObject({ distance: 300, cycles: 20, contrast: 25 });
    expect(value.fieldworkResults).toEqual({ version: 1, human: expected });
    expect(savedDistances('human')).toEqual([80, 90]);
    expect(savedCard('human')).not.toBeNull(); expect(savedCard('eagle')).toBeNull();
    expect(displayedSavedDistances('human')).toEqual([80, 90]);
    expect(capture).toHaveBeenCalledTimes(capturesBefore);
    expect(controller.update).toHaveBeenCalledTimes(updatesBefore);
    expect(changes).toHaveBeenCalledTimes(changesBefore + 1);
    expect(all('[data-distance-canvas]')).toEqual(originalCanvases);
    expect(JSON.stringify(value.fieldworkResults)).not.toContain('data:image');
  });

  it('preserves both saved results and existing notebook entries through control changes and notebook saving', async () => {
    const results = pairedResults();
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'An earlier notebook entry.');
    await commit({ ...initial, records: [earlier], fieldworkResults: results });

    await setDistance(160);
    expect(value.fieldworkResults).toEqual(results);
    expect(value.records).toEqual([earlier]);
    await reveal('eagle');
    const note = 'I changed viewing distance while the stripe count and contrast stayed fixed.';
    await writeNote(note); await activate('[data-distance-save]');
    expect(value.fieldworkResults).toEqual(results);
    expect(value.records).toHaveLength(2);
    expect(value.records[0]).toEqual(earlier);
    expect(value.records[1]).toMatchObject({ distance: 160, cycles: 8, contrast: 95, note });
    expect(all('[data-distance-record]')).toHaveLength(2);

    await activate('[data-distance-inquiry="contrast"]');
    expect(value.fieldworkResults).toEqual(results);
    expect(value.records).toHaveLength(2);
    expect(savedCard('human')).not.toBeNull(); expect(savedCard('eagle')).not.toBeNull();
  });

  it('isolates an invalid saved slot and emits only canonical evidence on the next state change', async () => {
    const human = result('human', [80, 90]);
    const invalidEagle = result('eagle', [200, 210]);
    invalidEagle.trials[0].settings.contrast = 25;
    const earlier = local.RaptorDistanceEvidence.makeRecord(initial, 'both', 'Keep this unrelated observation.');
    await commit({ ...initial, records: [earlier], fieldworkResults: {
      version: 1, human, eagle: invalidEagle, unknownResult: 'must not propagate'
    } });
    expect(savedCard('human')).not.toBeNull(); expect(savedCard('eagle')).toBeNull();
    expect(query(select.ratio)).toBeNull();

    await setDistance(120);
    expect(value.fieldworkResults).toEqual({ version: 1, human });
    expect(value.records).toEqual([earlier]);
    await openFieldwork(); await activate('[data-distance-results-remove="human"]');
    expect(value).not.toHaveProperty('fieldworkResults');
    expect(value.records).toEqual([earlier]);
    expect(savedCard('human')).toBeNull(); expect(query(select.ratio)).toBeNull();
  });

  it('ties comparison feedback to saved evidence immediately while live settings leave it intact', async () => {
    const results = pairedResults();
    await commit({ ...initial, fieldworkResults: results }); await openFieldwork();
    await activate('[data-distance-results-answer="frequency"]');
    expect(query(select.feedback).getAttribute('data-correct')).toBe('true');
    const feedback = query(select.feedback).textContent, ratio = query(select.ratio).textContent;
    await setDistance(230);
    expect(query(select.feedback).textContent).toBe(feedback);
    expect(query(select.feedback).getAttribute('data-correct')).toBe('true');
    expect(query(select.ratio).textContent).toBe(ratio);

    const replaced = { ...results, eagle: result('eagle', [199, 209]) };
    const timing = {};
    await commit({ ...value, fieldworkResults: replaced }, () => {
      timing.ratioPresent = !!query(select.ratio);
      timing.feedbackPresent = !!query(select.feedback);
    });
    // An effect-only reset would briefly attribute the old answer to the new
    // saved result. The committed DOM must already hide that stale feedback.
    expect(timing).toEqual({ ratioPresent: true, feedbackPresent: false });
    expect(query(select.feedback)).toBeNull();
    await activate('[data-distance-results-answer="detection"]');
    expect(query(select.feedback).getAttribute('data-correct')).toBe('false');
    await activate('[data-distance-results-remove="eagle"]');
    expect(query(select.feedback)).toBeNull(); expect(query(select.ratio)).toBeNull();
    expect(value.fieldworkResults).toEqual({ version: 1, human: results.human });
  });

  it('explicitly replaces only one saved slot and retains snapshots across restarting and remounting the activity', async () => {
    const results = pairedResults();
    await commit({ ...initial, fieldworkResults: results });
    await openFieldwork(); await activate('[data-distance-results-answer="frequency"]');
    await start(); await recordAt(80); await recordAt(86);
    expect(query(select.feedback).getAttribute('data-correct')).toBe('true');
    expect(query(select.save).textContent).toContain('Replace saved human result');
    await activate(select.save);
    expect(query(select.feedback)).toBeNull();
    expect(savedDistances('human')).toEqual([80, 86]);
    expect(value.fieldworkResults.eagle).toEqual(results.eagle);
    const saved = JSON.parse(JSON.stringify(value.fieldworkResults));
    await start();
    expect(all(select.trials)).toHaveLength(0);
    expect(value.fieldworkResults).toEqual(saved);
    expect(query(select.save).disabled).toBe(true);

    const previousController = controller, persistedSettings = value;
    await act(async () => { root.render(null); });
    expect(previousController.dispose).toHaveBeenCalledTimes(1);
    await commit(persistedSettings);
    expect(controller).not.toBe(previousController);
    await openFieldwork();
    expect(query(select.run)).toBeNull();
    expect(savedCard('human')).not.toBeNull(); expect(savedCard('eagle')).not.toBeNull();
    expect(query(select.ratio)).not.toBeNull();
    expect(value.fieldworkResults).toEqual(saved);
    expect(savedDistances('human')).toEqual([80, 86]); expect(savedDistances('eagle')).toEqual([200, 210]);
    expect(displayedSavedDistances('human')).toEqual([80, 86]);
    expect(displayedSavedDistances('eagle')).toEqual([200, 210]);
    expect(query(select.feedback)).toBeNull();
    expect(query('[data-distance-reveal]').disabled).toBe(true);
  });
});
