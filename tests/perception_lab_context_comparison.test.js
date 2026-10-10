import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire'];
const MATCHING = IDS.slice(0, 3);
const LABELS = {
  brightness: ['With surroundings', 'Without surroundings'],
  ebbinghaus: ['With surroundings', 'Without surroundings'],
  mullerLyer: ['With surroundings', 'Without surroundings'],
  cafeWall: ['Tiles visible', 'Tiles removed'],
  necker: ['Face cue visible', 'Face cue removed'],
  moire: ['Both grids', 'First grid only'],
};
let engine, config, root, host, latest, latestAll, externalState, changeProfile, announce, writes;
let deferUpdates, pendingUpdates, flushUpdates, frames, frameId;
const query = selector => host.querySelector(selector);
const model = () => latest.models[latest.experiment];
const current = () => query('#perception-stage-current');
const reference = () => query('#perception-stage-reference');
const compare = () => query('[data-perception-compare-context]');
const close = () => query('[data-perception-close-context]');
const info = () => query('[data-perception-context-comparison]');
const layout = () => query('[data-perception-comparison-layout]');
const showCurrent = () => query('[data-perception-show-current]');
const showReference = () => query('[data-perception-show-pinned]');

function seed(experiment = 'brightness', context = true) {
  return engine.normalize({
    experiment,
    models: {
      brightness: { context, contrast: 61, target: 117, prediction: 'Right', note: 'Brightness note' },
      ebbinghaus: { context, surround: 43, gap: 19, prediction: 'Same', note: 'Size note' },
      mullerLyer: { context, angle: 54, fin: 63, prediction: 'Bottom', note: 'Line note' },
      cafeWall: { context, offset: 72, mortar: 11, prediction: 'Tilted', note: 'Mortar note' },
      necker: { context, depth: 73, cue: 'front', prediction: 'It changes', note: 'Cube note' },
      moire: { context, angle: 13.7, spacing: 17, prediction: 'Both', note: 'Grid note' },
    },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'back', note: 'Pinned note', reveal: true } },
    studies: [{ id: 'saved', experiment: 'brightness', date: '2026-10-05T12:00:00.000Z', model: { contrast: 20, prediction: 'Same', note: 'Notebook note' } }],
  });
}
async function mount(value = seed(), strict = false) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('context-comparison-learner');
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
async function click(target) { expect(target).toBeTruthy(); await act(async () => (typeof target === 'string' ? button(target) : target).click()); }
function dispatchInput(node, value) {
  expect(node).toBeTruthy();
  const isSelect = node instanceof HTMLSelectElement;
  const prototype = isSelect ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
  node.dispatchEvent(new Event(isSelect ? 'change' : 'input', { bubbles: true }));
}
async function input(node, value) { await act(async () => dispatchInput(node, value)); }
async function tick(time) {
  const scheduled = frames.entries().next().value; expect(scheduled).toBeTruthy(); frames.delete(scheduled[0]);
  await act(async () => scheduled[1](time));
}
function geometry(svg) {
  return [...svg.querySelectorAll('[data-perception-target], [data-perception-edge], [data-perception-grid="base"], [data-perception-guide]')].map(node => node.outerHTML);
}
function caption(svg) { return svg.closest('figure').querySelector('figcaption').textContent; }
function expectLabels(id, context) {
  expect(caption(current())).toContain(LABELS[id][context ? 0 : 1]);
  expect(caption(reference())).toContain(LABELS[id][context ? 1 : 0]);
}
function expectContextPair(id, context) {
  expect(current().getAttribute('viewBox')).toBe('0 0 800 480');
  expect(reference().getAttribute('viewBox')).toBe(current().getAttribute('viewBox'));
  expect(Boolean(current().querySelector('[data-perception-context]'))).toBe(context);
  expect(Boolean(reference().querySelector('[data-perception-context]'))).toBe(!context);
  expect(geometry(reference())).toEqual(geometry(current()));
  expectLabels(id, context);
  expect(info()).toBeTruthy(); expect(compare().getAttribute('aria-pressed')).toBe('true');
  expect(query('.perception-deltas')).toBeNull();
}
function expectSelected(referenceSelected) {
  const liveCard = query('.perception-live-stage'), referenceCard = query('.perception-comparison');
  expect(liveCard.dataset.comparisonInactive).toBe(String(referenceSelected));
  expect(referenceCard.dataset.comparisonInactive).toBe(String(!referenceSelected));
  expect(showCurrent().getAttribute('aria-pressed')).toBe(String(!referenceSelected));
  expect(showReference().getAttribute('aria-pressed')).toBe(String(referenceSelected));
  const inactive = referenceSelected ? liveCard : referenceCard, active = referenceSelected ? referenceCard : liveCard;
  expect(inactive.hasAttribute('inert')).toBe(true); expect(inactive.getAttribute('aria-hidden')).toBe('true');
  expect(active.hasAttribute('inert')).toBe(false); expect(active.hasAttribute('aria-hidden')).toBe(false);
}
function expectUniqueIDs() {
  const nodes = [...host.querySelectorAll('[id]')]; expect(nodes.length).toBe(new Set(nodes.map(node => node.id)).size);
  for (const svg of [current(), reference()]) for (const id of svg.getAttribute('aria-labelledby').split(' ')) expect(document.getElementById(id)).toBeTruthy();
  for (const node of [layout(), showCurrent(), showReference()]) {
    if (node) for (const id of (node.getAttribute('aria-controls') || '').split(' ').filter(Boolean)) expect(document.getElementById(id)).toBeTruthy();
  }
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

describe('Live surroundings comparison', () => {
  it.each(IDS)('compares %s at equal scale with only surroundings removed and no saved-state writes', async id => {
    const value = seed(id); value.models[id].reveal = true;
    await mount(value); const before = structuredClone(latestAll), beforeWrites = writes, original = current().innerHTML;
    expect(compare().textContent.trim()).toBe('Compare surroundings'); expect(compare().getAttribute('aria-pressed')).toBe('false');
    await click(compare()); expectContextPair(id, true); expect(current().innerHTML).toBe(original);
    if (id === 'cafeWall') expect(reference().querySelectorAll('[data-perception-guide]')).toHaveLength(6);
    if (id === 'necker') expect(reference().querySelectorAll('[data-perception-edge]')).toHaveLength(12);
    if (id === 'moire') expect(reference().querySelector('[data-perception-grid="base"]').innerHTML).toBe(current().querySelector('[data-perception-grid="base"]').innerHTML);
    expect(latestAll).toEqual(before); expect(writes).toBe(beforeWrites); expectUniqueIDs();
  });
  it.each(IDS)('reverses the derived %s reference when the current drawing already has no surroundings', async id => {
    await mount(seed(id, false)); const before = structuredClone(latestAll);
    await click(compare()); expectContextPair(id, false); expect(latestAll).toEqual(before); expect(writes).toBe(0);
    await click('Remove surroundings'); expectContextPair(id, true); expect(model().context).toBe(true);
    expect(latest.comparison).toEqual(before.perceptionLab.comparison); expect(latest.studies).toEqual(before.perceptionLab.studies);
  });
  it.each(MATCHING)('keeps hidden %s match values hidden in both drawings until the current match is revealed', async id => {
    const value = seed(id); value.models[id].matching = true; value.models[id].matchValue = id === 'brightness' ? 153 : id === 'ebbinghaus' ? 67 : 437;
    await mount(value); await click(compare()); expectContextPair(id, true);
    for (const svg of [current(), reference()]) {
      expect(svg.querySelector('[data-perception-guide]')).toBeNull();
      expect(svg.querySelector('desc').textContent).not.toMatch(/Reference:|Left RGB|Difference:/);
      expect([...svg.querySelectorAll('text')]).toHaveLength(0);
    }
    expect(query('.perception-comparison').textContent).not.toMatch(/Reference:|Left RGB|Difference:/);
    expect(info().textContent).not.toMatch(/Reference:|Left RGB|Difference:/);
    await input(query('#perception-match-value'), id === 'brightness' ? 149 : id === 'ebbinghaus' ? 63 : 421);
    expect(geometry(reference())).toEqual(geometry(current())); expect(reference().querySelector('[data-perception-guide]')).toBeNull();
    await click('Reveal measurements'); expect(current().querySelector('[data-perception-guide]')).toBeTruthy();
    expect(geometry(reference())).toEqual(geometry(current())); expect(reference().querySelector('desc').textContent).toMatch(/Reference:|Left RGB/);
    await click('Reveal measurements'); expect(reference().querySelector('[data-perception-guide]')).toBeNull();
  });
  it('updates both drawings from live settings while preserving unrelated settings, notebook, and saved pin', async () => {
    await mount(seed('necker')); const pin = structuredClone(latest.comparison), notebook = structuredClone(latest.studies), others = structuredClone(latest.models);
    await click(compare()); const originalEdges = geometry(reference());
    await input(query('#perception-depth'), 94); expect(geometry(reference())).not.toEqual(originalEdges); expect(geometry(reference())).toEqual(geometry(current()));
    await input(query('#perception-cue'), 'back'); expectContextPair('necker', true);
    await input(query('#perception-note'), 'New current draft'); await click('Unsure');
    expect(model().note).toBe('New current draft'); expect(model().prediction).toBe('Unsure');
    expect(latest.comparison).toEqual(pin); expect(latest.studies).toEqual(notebook); expect(latestAll.otherTool).toEqual({ preserved: 37 });
    for (const id of IDS.filter(id => id !== 'necker')) expect(latest.models[id]).toEqual(others[id]);
  });
  it('requires an actual cube face cue and stops the derived pair when the cue is removed', async () => {
    const value = seed('necker'); value.models.necker.cue = 'none'; await mount(value);
    expect(compare().disabled).toBe(true); expect(compare().getAttribute('aria-describedby')).toBeTruthy();
    const reason = document.getElementById(compare().getAttribute('aria-describedby')); expect(reason?.textContent).toMatch(/face cue/i);
    await click(compare()); expect(info()).toBeNull(); expect(writes).toBe(0);
    await input(query('#perception-cue'), 'front'); expect(compare().disabled).toBe(false); await click(compare()); expect(info()).toBeTruthy();
    await input(query('#perception-cue'), 'none'); expect(info()).toBeNull(); expect(compare().getAttribute('aria-pressed')).toBe('false');
    expect(reference().querySelector('title').textContent).toBe('Ambiguous cube');
  });
  it.each(['auto', 'stacked', 'switch'])('uses the %s comparison layout with explicit current and reference context labels', async choice => {
    await mount(seed('moire')); await click(compare()); await input(layout(), choice);
    expect(query('.perception-live-pair').dataset.layout).toBe(choice); expectContextPair('moire', true);
    if (choice === 'switch') {
      expect(showCurrent().textContent).toContain('Both grids'); expect(showReference().textContent).toContain('First grid only');
      expectSelected(false); await click(showReference()); expectSelected(true); await click(showCurrent()); expectSelected(false);
    } else {
      expect(query('.perception-live-stage').hasAttribute('inert')).toBe(false); expect(query('.perception-comparison').hasAttribute('inert')).toBe(false);
    }
    expectUniqueIDs(); expect(writes).toBe(0);
  });
  it('closes the temporary comparison, restores the unchanged saved pin, and returns keyboard focus', async () => {
    await mount(); const before = structuredClone(latestAll), pin = reference().innerHTML;
    await click(compare()); await input(layout(), 'switch'); await click(showReference());
    await act(async () => close().focus()); await click(close());
    expect(info()).toBeNull(); expect(compare().getAttribute('aria-pressed')).toBe('false'); expect(reference().innerHTML).toBe(pin);
    expect(document.activeElement).toBe(compare()); expectSelected(false); expect(latestAll).toEqual(before); expect(writes).toBe(0);
  });
  it('keeps the alternate drawing selected while recording impressions, then brings a drawing adjustment into view', async () => {
    await mount(seed('ebbinghaus')); await click(compare()); await input(layout(), 'switch'); await click(showReference()); expectSelected(true);
    await input(query('#perception-note'), 'Context impression'); await click('Left'); expectSelected(true);
    await input(query('#perception-surround'), 57); expectSelected(false); expectContextPair('ebbinghaus', true);
    expect(model().note).toBe('Context impression'); expect(model().prediction).toBe('Left');
  });
  it('toggles without requiring or creating a saved pin', async () => {
    const value = seed(); value.comparison = null; await mount(value); const before = structuredClone(latestAll);
    expect(reference()).toBeNull(); await click(compare()); expect(reference()).toBeTruthy(); expect(close()).toBeTruthy();
    await click(compare()); expect(info()).toBeNull(); expect(reference()).toBeNull(); expect(layout()).toBeNull();
    expect(latestAll).toEqual(before); expect(writes).toBe(0);
  });
  it('leaves temporary context mode when pinning the current experiment', async () => {
    await mount(seed('ebbinghaus')); const beforeStudies = structuredClone(latest.studies);
    await click(compare()); await input(layout(), 'switch'); await click(showReference()); await click('Pin comparison');
    expect(info()).toBeNull(); expect(compare().getAttribute('aria-pressed')).toBe('false'); expectSelected(false);
    expect(latest.comparison.experiment).toBe('ebbinghaus'); expect(latest.comparison.model).toEqual(model());
    expect(reference().querySelector('[data-perception-context]')).toBeTruthy(); expect(latest.studies).toEqual(beforeStudies);
  });
  it('leaves temporary context mode when a notebook observation replaces the saved pin', async () => {
    await mount(); const observation = structuredClone(latest.studies[0]); await click(compare()); await click('Pin observation');
    expect(info()).toBeNull(); expect(compare().getAttribute('aria-pressed')).toBe('false');
    expect(latest.comparison).toEqual({ experiment: observation.experiment, model: observation.model });
    expect(reference().querySelector('title').textContent).toBe('Brightness & context');
    expect(latest.studies).toEqual([observation]);
  });
  it.each(MATCHING)('clears %s context comparison on study start and blocks it through collection, completion, and reveal', async id => {
    const value = seed(id); value.models[id].matching = true; await mount(value); await click(compare()); await click('Start three matches');
    expect(info()).toBeNull(); expect(compare().disabled).toBe(true); expect(compare().getAttribute('aria-pressed')).toBe('false');
    for (let trial = 0; trial < 3; trial++) {
      await click('Same'); await click('Record match'); expect(compare().disabled).toBe(true); await click(compare()); expect(info()).toBeNull();
    }
    await click('Reveal study results'); expect(compare().disabled).toBe(true); await click(compare()); expect(info()).toBeNull();
    await click('End repeated study'); expect(compare().disabled).toBe(false); expect(compare().getAttribute('aria-pressed')).toBe('false'); expect(info()).toBeNull();
    await click(compare()); expect(info()).toBeTruthy();
  });
  it('cannot reactivate context comparison while a study start waits for its parent commit', async () => {
    const value = seed(); value.models.brightness.matching = true; await mount(value); await click(compare());
    deferUpdates = true; await click('Start three matches'); expect(pendingUpdates).toHaveLength(1); expect(compare().disabled).toBe(true); expect(info()).toBeNull();
    const beforeWrites = writes; await click(compare()); expect(writes).toBe(beforeWrites); expect(info()).toBeNull();
    deferUpdates = false; await act(async () => flushUpdates()); expect(compare().disabled).toBe(true); await click('End repeated study'); expect(info()).toBeNull();
  });
  it('guards an activation in the same event batch as a study start before the button has rerendered disabled', async () => {
    const value = seed(); value.models.brightness.matching = true; await mount(value); deferUpdates = true;
    const activation = compare(), start = button('Start three matches'); expect(activation.disabled).toBe(false);
    await act(async () => { start.click(); activation.click(); });
    expect(pendingUpdates).toHaveLength(1); expect(info()).toBeNull(); expect(compare().disabled).toBe(true);
    expect(announce.mock.calls.some(([message]) => message.startsWith('Comparing the same drawing'))).toBe(false);
    deferUpdates = false; await act(async () => flushUpdates()); await click('End repeated study'); expect(info()).toBeNull();
  });
  it('preserves temporary context mode across focus opening and closing in StrictMode', async () => {
    await mount(seed('cafeWall'), true); await click(compare()); await input(layout(), 'switch'); await click(showReference());
    const before = structuredClone(latestAll), beforeWrites = writes; await click('Focus experiment');
    const dialog = query('[data-perception-focus-dialog]'); expect(dialog.open).toBe(true); expect(dialog.contains(info())).toBe(true); expectContextPair('cafeWall', true); expectSelected(true); expectUniqueIDs();
    await click('Back to workspace'); expect(dialog.open).toBe(false); expect(info()).toBeTruthy(); expectSelected(true); expectUniqueIDs();
    expect(latestAll).toEqual(before); expect(writes).toBe(beforeWrites);
  });
  it('ends temporary context mode on a focused experiment browse and prevents activation while the browse is pending', async () => {
    await mount(); await click(compare()); await click('Focus experiment'); const before = structuredClone(latest);
    deferUpdates = true; await input(query('[data-perception-focus-picker]'), 'necker');
    expect(compare().disabled).toBe(true); expect(pendingUpdates).toHaveLength(1); await click(compare()); expect(pendingUpdates).toHaveLength(1);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest).toEqual({ ...before, experiment: 'necker' }); expect(info()).toBeNull(); expect(compare().getAttribute('aria-pressed')).toBe('false');
    expect(query('[data-perception-focus-dialog]').open).toBe(true); expect(reference().querySelector('title').textContent).toBe('Ambiguous cube');
  });
  it('guards activation in the same event batch as focused browsing before the button has rerendered disabled', async () => {
    await mount(); await click('Focus experiment'); deferUpdates = true; const activation = compare(); expect(activation.disabled).toBe(false);
    await act(async () => { dispatchInput(query('[data-perception-focus-picker]'), 'moire'); activation.click(); });
    expect(pendingUpdates).toHaveLength(1); expect(info()).toBeNull(); expect(compare().disabled).toBe(true);
    expect(announce.mock.calls.some(([message]) => message.startsWith('Comparing the same drawing'))).toBe(false);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest.experiment).toBe('moire'); expect(info()).toBeNull();
  });
  it.each(['experiment', 'profile'])('resets temporary context mode after an external %s change without altering the saved pin', async kind => {
    await mount(); const saved = structuredClone(latest.comparison); await click(compare());
    await act(async () => kind === 'profile' ? changeProfile('other-learner') : externalState(previous => ({ ...previous, experiment: 'moire' })));
    expect(info()).toBeNull(); expect(compare().getAttribute('aria-pressed')).toBe('false'); expect(latest.comparison).toEqual(saved);
    expect(reference().querySelector('title').textContent).toBe('Ambiguous cube');
  });
  it('pauses moiré at the visible frame before deriving the first-grid reference', async () => {
    await mount(seed('moire')); const notebook = structuredClone(latest.studies), pin = structuredClone(latest.comparison);
    await click('Play slow rotation'); await tick(0); await tick(800); const visibleAngle = Number(query('#perception-angle').value); expect(visibleAngle).not.toBe(13.7);
    const beforeWrites = writes; await click(compare()); expect(model().angle).toBe(visibleAngle); expect(writes).toBe(beforeWrites + 1); expect(frames.size).toBe(0);
    expect(button('Play slow rotation').getAttribute('aria-pressed')).toBe('false'); expectContextPair('moire', true);
    expect(current().querySelector('[data-perception-grid="overlay"]').getAttribute('transform')).toBe('rotate(' + visibleAngle + ' 400 240)');
    expect(latest.comparison).toEqual(pin); expect(latest.studies).toEqual(notebook);
  });
  it('blocks activation while a notebook import commit is pending', async () => {
    const readers = [];
    vi.stubGlobal('FileReader', vi.fn(function () { this.result = null; this.readAsText = vi.fn(); this.abort = vi.fn(); readers.push(this); }));
    await mount(); await click('Import notebook'); const fileInput = query('[data-perception-import-file]');
    const studies = engine.normalize({ studies: [{ id: 'incoming', experiment: 'necker', date: '2026-10-05T12:01:00.000Z', model: { prediction: 'Unsure', note: 'Imported observation' } }] }).studies;
    await act(async () => { Object.defineProperty(fileInput, 'files', { configurable: true, value: [new window.File(['{}'], 'notebook.json', { type: 'application/json' })] }); fileInput.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => { readers[0].result = JSON.stringify({ schema: 'alloflow.perception.notebook', version: 1, studies }); readers[0].onload(); });
    deferUpdates = true; const activation = compare(), commit = button('Add observations'); expect(activation.disabled).toBe(false);
    await act(async () => { commit.click(); activation.click(); }); expect(compare().disabled).toBe(true); const beforeWrites = writes;
    expect(announce.mock.calls.some(([message]) => message.startsWith('Comparing the same drawing'))).toBe(false);
    await click(compare()); expect(info()).toBeNull(); expect(writes).toBe(beforeWrites);
    deferUpdates = false; await act(async () => flushUpdates()); expect(compare().disabled).toBe(false); expect(latest.studies.map(record => record.id)).toEqual(['saved', 'incoming']);
  });
  it('saves and exports the current model even when the derived reference is the visible switch view', async () => {
    const blobs = []; vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob); return 'blob:context-comparison'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {}); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount(); const pin = structuredClone(latest.comparison); await click(compare()); await input(layout(), 'switch'); await click(showReference()); expectSelected(true);
    expect(info().textContent).toMatch(/current/i); expect(info().textContent).toMatch(/save|sav/i); expect(info().textContent).toMatch(/export/i);
    await click('Export SVG'); expect(blobs).toHaveLength(1);
    const markup = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blobs[0]); });
    const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml'); expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.querySelector('[data-perception-context]')).toBeTruthy(); expect(reference().querySelector('[data-perception-context]')).toBeNull(); expectSelected(true);
    const savedModel = structuredClone(model()); await click('Save observation'); expect(latest.studies.at(-1).model).toEqual(savedModel); expect(latest.comparison).toEqual(pin);
  });
});
