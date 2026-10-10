import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['brightness', 'ebbinghaus', 'mullerLyer'];
let engine, config, root, host, latest, latestAll, externalState, changeProfile, announce, writes;
let deferUpdates, pendingUpdates, flushUpdates, frames, frameId;
const query = selector => host.querySelector(selector);
const range = () => query('#perception-match-value');
const restart = () => query('[data-perception-new-match-start]');
const equalize = () => query('[data-perception-equalize-match]');
const model = () => latest.models[latest.experiment];

function seed(experiment = 'brightness', matching = false) {
  const state = engine.normalize({
    experiment, expanded: true,
    models: {
      brightness: { matching, matchValue: 155, target: 117, contrast: 61, context: false, swap: true, prediction: 'Right', reveal: true, note: 'Brightness note' },
      ebbinghaus: { matching, matchValue: 57, surround: 43, gap: 19, context: false, swap: true, prediction: 'Same', reveal: true, note: 'Size note' },
      mullerLyer: { matching, matchValue: 427, angle: 54, fin: 63, context: false, swap: true, prediction: 'Bottom', reveal: true, note: 'Line note' },
      cafeWall: { offset: 72, mortar: 11, prediction: 'Tilted', note: 'Mortar note' },
      necker: { depth: 73, cue: 'front', prediction: 'It changes', note: 'Cube note' },
      moire: { angle: 13.7, spacing: 17, prediction: 'Both', note: 'Grid note' },
    },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'back', note: 'Pinned note', reveal: true } },
    studies: [{ id: 'saved', experiment: 'brightness', date: '2026-10-05T12:00:00.000Z', model: { contrast: 20, prediction: 'Same', note: 'Notebook note' } }],
  });
  return state;
}
async function mount(value = seed(), { strict = false } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('match-start-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    flushUpdates = () => pendingUpdates.splice(0).forEach(setData);
    return config.render(makeCtx({ toolData: data, activeProfileId: profile, announceToSR: announce,
      setToolData: update => { writes++; if (deferUpdates) pendingUpdates.push(update); else setData(update); } }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label) {
  const found = [...host.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
async function click(target) { await act(async () => (typeof target === 'string' ? button(target) : target).click()); }
async function input(node, value) {
  expect(node).toBeTruthy();
  const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); });
}
async function focus(node) { expect(node).toBeTruthy(); await act(async () => node.focus()); }
function preserved(before, experiment = latest.experiment) {
  const copy = structuredClone(latest); copy.models[experiment] = before.models[experiment];
  expect(copy).toEqual(before); expect(latestAll.otherTool).toEqual({ preserved: 37 });
}
function expectNewStart(before) {
  const limits = engine.matching[latest.experiment], reference = engine.measurements(latest.experiment, before).reference;
  expect(Number.isInteger(model().matchValue)).toBe(true);
  expect(model().matchValue).toBeGreaterThanOrEqual(limits.min); expect(model().matchValue).toBeLessThanOrEqual(limits.max);
  expect(model().matchValue).not.toBe(before.matchValue); expect(model().matchValue).not.toBe(reference);
  expect(model()).toEqual({ ...before, matching: true, matchValue: model().matchValue, reveal: false, prediction: '' });
}
function expectBlindFocus() {
  expect(document.activeElement).toBe(range());
  expect(range().getAttribute('aria-valuetext')).toContain('drawing values hidden until reveal');
  expect(query('output[for="perception-match-value"]')).toBeNull();
  expect(query('#perception-stage-current desc').textContent).not.toContain('Reference:');
  const announcements = announce.mock.calls.flat().join(' ');
  expect(announcements).not.toMatch(/\d/); expect(announcements).not.toContain('RGB');
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  announce = vi.fn(); writes = 0; deferUpdates = false; pendingUpdates = []; frames = new Map(); frameId = 0;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, writable: true, value() { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('Unequal starting points for free visual matching', () => {
  it.each(IDS)('chooses bounded integer %s starts and wraps excluded candidates without mutating input', id => {
    const limits = engine.matching[id], raw = seed(id).models[id], original = structuredClone(raw), reference = engine.measurements(id, raw).reference;
    for (const [candidate, old] of [[limits.min, limits.max], [limits.max, limits.max], [reference, reference], [reference, reference + 1], [reference - 1, reference - 1]]) {
      const value = { ...raw, matchValue: old }, sample = (candidate - limits.min + 0.01) / (limits.max - limits.min + 1);
      const result = engine.newMatchStart(id, value, sample);
      let expected = candidate;
      while (expected === old || expected === reference) expected = expected === limits.max ? limits.min : expected + 1;
      expect(result).toEqual({ ...value, matching: true, matchValue: expected, prediction: '', reveal: false });
      expect(engine.newMatchStart(id, value, sample)).toEqual(result);
    }
    expect(raw).toEqual(original);
  });
  it.each(IDS)('normalizes malformed %s models before choosing a start', id => {
    const raw = { note: 'Keep my note', reveal: true, prediction: 'invalid', context: false, swap: true, matchValue: Infinity, target: -999, surround: 999, angle: 0 };
    const normalized = engine.normalizeModel(id, raw), result = engine.newMatchStart(id, raw, 0.33);
    expect(result).toEqual({ ...normalized, matching: true, matchValue: result.matchValue, prediction: '', reveal: false });
    expect(Number.isInteger(result.matchValue)).toBe(true);
    expect(result.matchValue).not.toBe(normalized.matchValue); expect(result.matchValue).not.toBe(engine.measurements(id, normalized).reference);
  });
  it.each([undefined, null, NaN, Infinity, -Infinity, '0.1', {}, []])('uses the deterministic fallback for invalid seed %j', sample => {
    const raw = seed().models.brightness;
    expect(engine.newMatchStart('brightness', raw, sample)).toEqual(engine.newMatchStart('brightness', raw, 0.5));
  });
  it.each([0, 0.00001, 0.5, 0.999999, 1, 23.8, -0.25])('keeps normalized seed %s bounded and unequal for every matching experiment', sample => {
    for (const id of IDS) {
      const raw = seed(id).models[id], result = engine.newMatchStart(id, raw, sample), limits = engine.matching[id];
      expect(result.matchValue).toBeGreaterThanOrEqual(limits.min); expect(result.matchValue).toBeLessThanOrEqual(limits.max);
      expect(result.matchValue).not.toBe(raw.matchValue); expect(result.matchValue).not.toBe(engine.measurements(id, raw).reference);
    }
  });
  it('clamps finite seeds at each endpoint instead of wrapping the seed fraction', () => {
    for (const id of IDS) {
      const raw = seed(id).models[id];
      expect(engine.newMatchStart(id, raw, -0.25)).toEqual(engine.newMatchStart(id, raw, 0));
      expect(engine.newMatchStart(id, raw, 23.8)).toEqual(engine.newMatchStart(id, raw, 0.9999999999999999));
      expect(engine.newMatchStart(id, raw, 1)).toEqual(engine.newMatchStart(id, raw, 0.9999999999999999));
    }
  });
  it.each(['cafeWall', 'necker', 'moire', 'missing', '', null])('does not accidentally fall back to brightness for unsupported experiment %j', id => {
    expect(engine.newMatchStart(id, {}, 0.5)).toBeNull();
  });
  it.each(IDS)('enters %s matching with a new unequal value, safe focus, and all saved work intact', async id => {
    await mount(seed(id)); const before = structuredClone(latest), old = structuredClone(model());
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    await click('Match by eye'); expectNewStart(old); preserved(before); expectBlindFocus(); expect(writes).toBe(1);
    expect(Math.random).toHaveBeenCalledTimes(1);
    const entered = structuredClone(latest); await click('Match by eye'); expect(latest).toEqual(entered); expect(writes).toBe(1);
  });
  it.each(IDS)('opens a saved %s matching value without reseeding it', async id => {
    const before = seed(id, true); vi.spyOn(Math, 'random').mockReturnValue(0.2);
    await mount(before, { strict: true }); expect(latest).toEqual(before); expect(Number(range().value)).toBe(before.models[id].matchValue); expect(writes).toBe(0); expect(Math.random).not.toHaveBeenCalled();
    await click('Focus experiment'); expect(Number(range().value)).toBe(before.models[id].matchValue); expect(writes).toBe(0);
  });
  it.each(IDS)('chooses a fresh %s starting point without discarding notes or surrounding controls', async id => {
    await mount(seed(id, true)); const before = structuredClone(latest), old = structuredClone(model());
    vi.spyOn(Math, 'random').mockReturnValue(0.37); await click(restart());
    expectNewStart(old); preserved(before); expectBlindFocus(); expect(writes).toBe(1);
    const once = structuredClone(model()); await click(restart()); expectNewStart(once); expect(Math.random).toHaveBeenCalledTimes(2);
  });
  it.each(IDS)('explicitly equalizes %s drawing values and clears the old prediction and reveal', async id => {
    await mount(seed(id, true)); const before = structuredClone(latest), old = structuredClone(model()), reference = engine.measurements(id, old).reference;
    vi.spyOn(Math, 'random').mockReturnValue(0.25); await click(equalize());
    expect(model()).toEqual({ ...old, matchValue: reference, prediction: '', reveal: false }); preserved(before); expectBlindFocus();
    expect(Math.random).not.toHaveBeenCalled(); expect(equalize().textContent).toContain('Equalize drawing values');
  });
  it('leaves the last comparison value intact in Observe, then seeds the next entry', async () => {
    await mount(seed('brightness', true)); const value = model().matchValue; await click('Observe');
    expect(model().matching).toBe(false); expect(model().matchValue).toBe(value); expect(restart()).toBeNull(); expect(equalize()).toBeNull();
    const old = structuredClone(model()); await click('Match by eye'); expectNewStart(old);
  });
  it('keeps synchronized surrounding comparison views and preserves the stored pin during a new start', async () => {
    await mount(seed('ebbinghaus', true)); await click(query('[data-perception-compare-context]'));
    const before = structuredClone(latest); await click(restart()); preserved(before);
    expect(query('[data-perception-compare-context]').getAttribute('aria-pressed')).toBe('true');
    const left = query('#perception-stage-current [data-perception-target="right"]'), right = query('#perception-stage-reference [data-perception-target="right"]');
    expect(left).toBeTruthy(); expect(right).toBeTruthy(); expect(left.getAttribute('r')).toBe(right.getAttribute('r'));
    expect(query('[data-perception-context-comparison]')).toBeTruthy();
  });
  it.each(['close', 'Escape'])('keeps native workspace return focus when a pending start finishes after leaving by %s', async action => {
    await mount(seed('brightness', true)); const opener = button('Focus experiment'); await focus(opener); await click(opener);
    const dialog = query('[data-perception-focus-dialog]'), before = structuredClone(latest), old = structuredClone(model());
    deferUpdates = true; await click(restart()); expect(pendingUpdates).toHaveLength(1);
    if (action === 'close') await click('Back to workspace');
    else await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    // The workspace subtree remounts when the native dialog closes, so its
    // restored opener is the current rendered button rather than the old node.
    expect(dialog.open).toBe(false); expect(document.activeElement).toBe(button('Focus experiment'));
    deferUpdates = false; await act(async () => flushUpdates()); expectNewStart(old); preserved(before);
    expect(dialog.open).toBe(false); expect(document.activeElement).toBe(button('Focus experiment')); expect(document.activeElement).not.toBe(range());
  });
  it('chooses once before a deferred parent updater and returns the same state on replay', async () => {
    await mount(seed('mullerLyer'), { strict: true }); vi.spyOn(Math, 'random').mockReturnValue(0.82);
    const before = structuredClone(latestAll); deferUpdates = true; await click('Match by eye');
    expect(pendingUpdates).toHaveLength(1); expect(Math.random).toHaveBeenCalledTimes(1);
    const apply = pendingUpdates[0], first = apply(before), replay = apply(before); expect(replay).toEqual(first);
    expect(Math.random).toHaveBeenCalledTimes(1); expect(before.perceptionLab.models.mullerLyer.matching).toBe(false);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latestAll).toEqual(first); expectBlindFocus(); expect(Math.random).toHaveBeenCalledTimes(1);
  });
  it('locks controls and cross-operation actions while a new starting point awaits the parent save', async () => {
    await mount(seed('brightness', true)); await click('Focus experiment'); const before = structuredClone(latest); deferUpdates = true; await click(restart());
    expect(pendingUpdates).toHaveLength(1); expect(latest).toEqual(before);
    for (const element of [restart(), equalize(), range(), query('#perception-note'), query('[data-perception-exact="contrast"]'), query('[data-perception-focus-picker]'), button('Start three matches'), button('Pin comparison'), button('Export SVG'), button('Export PNG')]) expect(element.disabled, element?.textContent || element?.id).toBe(true);
    await click(restart()); await click(equalize()); await click('Start three matches'); expect(pendingUpdates).toHaveLength(1);
    deferUpdates = false; await act(async () => flushUpdates()); expectNewStart(before.models.brightness); expect(range().disabled).toBe(false); expectBlindFocus();
  });
  it.each(['entry', 'restart', 'equalize'])('rejects a deferred %s after an external profile replacement', async action => {
    await mount(seed('brightness', action !== 'entry')); deferUpdates = true; await click(action === 'entry' ? button('Match by eye') : action === 'restart' ? restart() : equalize());
    expect(pendingUpdates).toHaveLength(1); await act(async () => changeProfile('replacement-learner'));
    const replacement = structuredClone(latest); await focus(query('#perception-note')); announce.mockClear();
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest).toEqual(replacement); expect(document.activeElement).toBe(query('#perception-note'));
    expect(announce.mock.calls.flat().join(' ')).not.toMatch(/\d/);
  });
  it.each(['experiment', 'model'])('does not overwrite an external %s replacement during a delayed start', async kind => {
    await mount(seed('brightness', true)); deferUpdates = true; await click(restart());
    await act(async () => externalState(value => kind === 'experiment' ? { ...value, experiment: 'moire' } : { ...value, models: { ...value.models, brightness: { ...value.models.brightness, note: 'External replacement note', contrast: 29, matchValue: 191 } } }));
    const replacement = structuredClone(latest); await focus(query('#perception-note')); announce.mockClear();
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest).toEqual(replacement); expect(document.activeElement).toBe(query('#perception-note'));
    expect(announce.mock.calls.flat().join(' ')).not.toMatch(/\d/);
  });
  it('preserves an external update applied after the queued start but before React renders, and does not steal focus', async () => {
    await mount(seed('brightness', true)); deferUpdates = true; await click(restart());
    const old = structuredClone(latest.models.brightness); announce.mockClear(); deferUpdates = false;
    await act(async () => {
      flushUpdates(); externalState(value => ({ ...value, models: { ...value.models, brightness: { ...value.models.brightness, note: 'External after-commit note', contrast: 26, matchValue: 199 } } }));
    });
    expect(model()).toEqual({ ...old, matching: true, matchValue: 199, reveal: false, prediction: '', note: 'External after-commit note', contrast: 26 });
    expect(document.activeElement).not.toBe(range()); expect(restart().disabled).toBe(false);
    expect(announce.mock.calls.flat().join(' ')).not.toMatch(/\d/);
  });
  it.each(['new-first', 'study-first'])('guards same-event %s operation races before disabled buttons render', async order => {
    await mount(seed('brightness', true)); deferUpdates = true; const newButton = restart(), studyButton = button('Start three matches');
    await act(async () => { if (order === 'new-first') { newButton.click(); studyButton.click(); } else { studyButton.click(); newButton.click(); } });
    expect(pendingUpdates).toHaveLength(1); deferUpdates = false; await act(async () => flushUpdates());
    const active = query('[data-perception-repeat-active]')?.getAttribute('data-perception-repeat-active'); expect(Boolean(active)).toBe(order === 'study-first');
  });
  it('rejects a same-event double new-start request and chooses only once', async () => {
    await mount(seed('brightness', true)); deferUpdates = true; vi.spyOn(Math, 'random').mockReturnValue(0.35); const node = restart();
    await act(async () => { node.click(); node.click(); }); expect(pendingUpdates).toHaveLength(1); expect(Math.random).toHaveBeenCalledTimes(1);
    deferUpdates = false; await act(async () => flushUpdates()); expectBlindFocus();
  });
  it('locks both free-match actions for collection, completion, and revealed repeated study results', async () => {
    await mount(seed('brightness', true)); await click('Start three matches');
    for (let trial = 0; trial < 3; trial++) {
      expect(restart().disabled).toBe(true); expect(equalize().disabled).toBe(true); const before = structuredClone(latest), count = writes;
      await click(restart()); await click(equalize()); expect(latest).toEqual(before); expect(writes).toBe(count);
      await click('Same'); await click('Record match');
    }
    expect(restart().disabled).toBe(true); expect(equalize().disabled).toBe(true); await click('Reveal study results');
    expect(restart().disabled).toBe(true); expect(equalize().disabled).toBe(true); const recorded = structuredClone(latest.studies);
    await click('End repeated study'); expect(restart().disabled).toBe(false); expect(equalize().disabled).toBe(false);
    await click(restart()); expect(latest.studies).toEqual(recorded);
  });
  it('preserves controlled study starts without sampling a free-match seed', async () => {
    await mount(seed('mullerLyer', true)); vi.spyOn(Math, 'random').mockReturnValue(0.7); await click('Start three matches');
    expect(Math.random).not.toHaveBeenCalled(); const first = model().matchValue;
    const expected = engine.createStudy('mullerLyer', seed('mullerLyer', true).models.mullerLyer, 'controlled');
    expect(first).toBe(engine.studyModel(expected).matchValue);
  });
  it('blocks free-match changes while a focus browse update is pending', async () => {
    await mount(seed('brightness', true)); await click('Focus experiment'); deferUpdates = true;
    await input(query('[data-perception-focus-picker]'), 'necker'); expect(restart().disabled).toBe(true); expect(equalize().disabled).toBe(true);
    await click(restart()); await click(equalize()); expect(pendingUpdates).toHaveLength(1);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest.experiment).toBe('necker');
  });
  it('blocks entry, new start, and equality while a previewed import awaits its parent commit', async () => {
    const readers = [];
    vi.stubGlobal('FileReader', vi.fn(function () { this.result = null; this.readAsText = vi.fn(); this.abort = vi.fn(); readers.push(this); }));
    await mount(seed('brightness', true)); await click('Import notebook');
    const fileInput = query('[data-perception-import-file]'), incoming = engine.normalize({ studies: [{ id: 'incoming', experiment: 'necker', date: '2026-10-05T12:01:00.000Z', model: { prediction: 'Unsure', note: 'Imported observation' } }] }).studies;
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [new window.File(['{}'], 'notebook.json', { type: 'application/json' })] });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => { readers[0].result = JSON.stringify({ schema: 'alloflow.perception.notebook', version: 1, studies: incoming }); readers[0].onload(); });
    expect(query('[data-perception-import-preview]').dataset.perceptionImportPreview).toBe('preview'); deferUpdates = true;
    await click('Add observations'); const count = writes, before = structuredClone(latest);
    await click(restart()); await click(equalize()); await click('Observe'); await click('Match by eye'); expect(writes).toBe(count); expect(latest).toEqual(before);
    expect(pendingUpdates).toHaveLength(1); deferUpdates = false; await act(async () => flushUpdates());
    expect(model()).toEqual(before.models.brightness); expect(latest.studies.map(record => record.id)).toEqual(['saved', 'incoming']);
  });
  it('allows unrelated notebook updates to survive a delayed match start', async () => {
    await mount(seed('brightness', true)); const before = structuredClone(model()); deferUpdates = true; await click(restart());
    await act(async () => externalState(value => ({ ...value, studies: [...value.studies, { id: 'external-observation', experiment: 'necker', date: '2026-10-05T12:02:00.000Z', model: engine.normalizeModel('necker', { note: 'External notebook update' }) }] })));
    deferUpdates = false; await act(async () => flushUpdates()); expectNewStart(before); expect(latest.studies.map(record => record.id)).toEqual(['saved', 'external-observation']); expectBlindFocus();
  });
});
