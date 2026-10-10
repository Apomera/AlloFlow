import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire', 'ponzo'];
let engine, config, root, host, latest, latestAll, externalState, changeProfile, announce, writes;
let deferUpdates, pendingUpdates, flushUpdates, frames, frameId;
const dialog = () => host.querySelector('[data-perception-focus-dialog]');
const picker = () => dialog().querySelector('select[data-perception-focus-picker], [data-perception-focus-picker] select');
const previous = () => dialog().querySelector('[data-perception-focus-previous]');
const next = () => dialog().querySelector('[data-perception-focus-next]');
const live = () => host.querySelector('#perception-stage-current');
const exact = setting => dialog().querySelector('[data-perception-exact="' + setting + '"]');
const model = id => latest.models[id || latest.experiment];
const description = () => dialog().querySelector('[data-perception-focus-description]');

function seed(experiment = 'brightness') {
  return engine.normalize({
    experiment, expanded: false,
    models: {
      brightness: { contrast: 61, target: 117, prediction: 'Right', note: 'Brightness note' },
      ebbinghaus: { surround: 43, gap: 19, prediction: 'Same', note: 'Size note' },
      mullerLyer: { angle: 54, fin: 63, prediction: 'Bottom', note: 'Line note' },
      cafeWall: { offset: 72, mortar: 11, prediction: 'Tilted', note: 'Mortar note' },
      necker: { depth: 73, cue: 'front', prediction: 'It changes', note: 'Cube note' },
      moire: { angle: 13.7, spacing: 17, prediction: 'Both', note: 'Grid note' },
    },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'Pinned note' } },
    studies: [{ id: 'saved', experiment: 'brightness', date: '2026-10-05T12:00:00.000Z', model: { contrast: 20, prediction: 'Same', note: 'Notebook note' } }],
  });
}
async function mount(value = seed(), { strict = false, translate } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('focus-browsing-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = update => setData(previousData => ({ ...previousData, perceptionLab: typeof update === 'function' ? update(previousData.perceptionLab) : update }));
    flushUpdates = () => pendingUpdates.splice(0).forEach(setData);
    return config.render(makeCtx({
      toolData: data, activeProfileId: profile, announceToSR: announce,
      setToolData: update => { writes++; if (deferUpdates) pendingUpdates.push(update); else setData(update); },
      ...(translate ? { t: translate } : {}),
    }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
async function click(target, scope = host) { await act(async () => (typeof target === 'string' ? button(target, scope) : target).click()); }
async function focus(node) { expect(node).toBeTruthy(); await act(async () => node.focus()); }
async function input(node, value) {
  expect(node).toBeTruthy();
  const isSelect = node instanceof HTMLSelectElement;
  const prototype = isSelect ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(isSelect ? 'change' : 'input', { bubbles: true }));
  });
}
async function choose(id) { await focus(picker()); await input(picker(), id); }
async function key(node, name) { const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }); await act(async () => node.dispatchEvent(event)); return event; }
async function blur(node, relatedTarget) { await act(async () => node.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }))); }
async function tick(time) { const scheduled = frames.entries().next().value; expect(scheduled).toBeTruthy(); frames.delete(scheduled[0]); await act(async () => scheduled[1](time)); }
async function enter() { await click('Focus experiment'); expect(dialog().open).toBe(true); }
function expectControlsDisabled(disabled) { expect(picker().disabled).toBe(disabled); expect(previous().disabled).toBe(disabled); expect(next().disabled).toBe(disabled); }
function expectUniqueLiveDrawing(focused = true) {
  expect(host.querySelectorAll('#perception-stage-current')).toHaveLength(1);
  expect(dialog().querySelectorAll('#perception-stage-current')).toHaveLength(focused ? 1 : 0);
  const ids = [...host.querySelectorAll('[id]')].map(node => node.id);
  expect(ids.length).toBe(new Set(ids).size);
  const svg = live();
  for (const id of svg.getAttribute('aria-labelledby').split(' ')) expect(document.getElementById(id)).toBeTruthy();
}
function expectPreserved(baseline, experiment) {
  expect(latest).toEqual({ ...baseline, experiment });
  expect(latestAll.otherTool).toEqual({ preserved: 37 });
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

describe('Browse experiments inside the focused workspace', () => {
  it.each(IDS)('switches to %s in the existing native dialog while preserving saved work and scientific drawing', async experiment => {
    await mount(seed(experiment === 'brightness' ? 'moire' : 'brightness')); await enter();
    const baseline = structuredClone(latest), modal = dialog(), close = vi.spyOn(modal, 'close'), show = vi.spyOn(modal, 'showModal');
    await choose(experiment);
    expect(dialog()).toBe(modal); expect(modal.open).toBe(true); expect(close).not.toHaveBeenCalled(); expect(show).not.toHaveBeenCalled();
    expectPreserved(baseline, experiment); expect(picker().value).toBe(experiment); expect(document.activeElement).toBe(picker()); expectUniqueLiveDrawing();
    const meta = engine.experiments.find(item => item.id === experiment);
    expect(modal.querySelector('h2').textContent).toContain(meta.title); expect(live().querySelector('title').textContent).toBe(meta.title);
    expect(description().textContent).toContain(meta.description); expect(announce).toHaveBeenCalledWith(expect.stringContaining(meta.title));
    const rendered = engine.scene(experiment, model(experiment));
    const firstTarget = rendered.find(node => node.props?.['data-perception-target']);
    if (firstTarget) {
      const target = live().querySelector('[data-perception-target="' + firstTarget.props['data-perception-target'] + '"]');
      expect(target).toBeTruthy();
      for (const [name, value] of Object.entries(firstTarget.props)) expect(target.getAttribute(name === 'strokeWidth' ? 'stroke-width' : name)).toBe(String(value));
    }
  });
  it('wraps Previous and Next across the complete experiment order and retains the initiating button', async () => {
    await mount(); await enter(); const baseline = structuredClone(latest);
    await focus(previous()); await click(previous()); expect(latest.experiment).toBe(IDS.at(-1)); expect(document.activeElement).toBe(previous());
    expect(next().getAttribute('aria-label')).toContain('Brightness & context');
    await focus(next()); await click(next()); expect(latest.experiment).toBe('brightness'); expect(document.activeElement).toBe(next());
    for (const id of IDS.slice(1)) { await click(next()); expect(latest.experiment).toBe(id); expectPreserved(baseline, id); }
    expect(previous().textContent.trim()).toBe('Previous'); expect(next().textContent.trim()).toBe('Next');
  });
  it('does not write saved state for the selected experiment or an invalid synthetic option', async () => {
    await mount(); await enter(); const baseline = structuredClone(latest), beforeWrites = writes;
    await choose('brightness'); expectPreserved(baseline, 'brightness'); expect(writes).toBe(beforeWrites);
    await input(picker(), 'unknown-experiment'); expectPreserved(baseline, 'brightness'); expect(writes).toBe(beforeWrites); expect(dialog().open).toBe(true);
  });
  it('resets all focused scroll areas after switching without moving the picker focus', async () => {
    await mount(); await enter();
    const areas = [dialog(), dialog().querySelector('.perception-focus-body'), dialog().querySelector('.perception-controls'), dialog().querySelector('.perception-scenes')];
    areas.forEach(node => { expect(node).toBeTruthy(); node.scrollTop = 320; node.scrollLeft = 11; });
    await choose('necker');
    for (const selector of ['.perception-focus-body', '.perception-controls', '.perception-scenes']) { const area = dialog().querySelector(selector); expect(area.scrollTop).toBe(0); expect(area.scrollLeft).toBe(0); }
    expect(dialog().scrollTop).toBe(0); expect(dialog().scrollLeft).toBe(0); expect(document.activeElement).toBe(picker());
  });
  it('retains comparison layout and committed observation edits when browsing away and back', async () => {
    await mount(); await enter(); await input(dialog().querySelector('[data-perception-comparison-layout]'), 'stacked');
    await input(dialog().querySelector('#perception-note'), 'New learner note'); await click('Left', dialog());
    const before = structuredClone(latest); await choose('cafeWall'); await choose('brightness');
    expectPreserved(before, 'brightness'); expect(dialog().querySelector('[data-perception-comparison-layout]').value).toBe('stacked');
    expect(dialog().querySelector('#perception-note').value).toBe('New learner note'); expect(button('Left', dialog()).getAttribute('aria-pressed')).toBe('true');
  });
  it('commits a valid exact-value draft on blur before switching and restores it on return', async () => {
    await mount(); await enter(); await focus(exact('contrast')); await input(exact('contrast'), 47);
    expect(model('brightness').contrast).toBe(61); await blur(exact('contrast'), picker()); await choose('ebbinghaus');
    expect(model('brightness').contrast).toBe(47); await choose('brightness'); expect(exact('contrast').value).toBe('47');
    expect(model('brightness').note).toBe('Brightness note'); expect(model('brightness').prediction).toBe('Right');
  });
  it('cancels an exact-value draft with Escape before Escape closes the modal', async () => {
    await mount(); await enter(); const baseline = structuredClone(latest); await focus(exact('contrast')); await input(exact('contrast'), 47);
    expect((await key(exact('contrast'), 'Escape')).defaultPrevented).toBe(true); expect(dialog().open).toBe(true); expect(exact('contrast').value).toBe('61'); expectPreserved(baseline, 'brightness');
    await key(exact('contrast'), 'Escape'); expect(dialog().open).toBe(false); expectPreserved(baseline, 'brightness');
  });
  it('pauses moiré at its visible frame before browsing and restores that frame on return', async () => {
    await mount(seed('moire')); await enter(); await click('Play slow rotation', dialog()); await tick(0); await tick(800);
    const visibleAngle = Number(dialog().querySelector('#perception-angle').value); expect(visibleAngle).not.toBe(13.7);
    await choose('brightness'); expect(model('moire').angle).toBe(visibleAngle); expect(frames.size).toBe(0);
    await choose('moire'); expect(Number(exact('angle').value)).toBe(visibleAngle); expect(button('Play slow rotation', dialog()).getAttribute('aria-pressed')).toBe('false');
  });
  it('keeps matching instructions safe when measurements are revealed', async () => {
    const value = seed(); value.models.ebbinghaus = engine.normalizeModel('ebbinghaus', { matching: true, reveal: true, matchValue: 57 });
    await mount(value); await enter(); await choose('ebbinghaus');
    expect(description().textContent).toContain('Match their apparent size by eye.'); expect(description().textContent).not.toContain('Reference:'); expect(description().textContent).not.toContain('57');
    expect(live().querySelector('desc').textContent).toContain('Reference:');
  });
  it('locks browsing throughout collection, completion, and reveal until End repeated study', async () => {
    const value = seed(); value.models.brightness.matching = true;
    await mount(value); await enter(); await click('Start three matches', dialog()); expectControlsDisabled(true);
    expect(dialog().textContent).toContain('End the repeated study before choosing another experiment.');
    for (let trial = 0; trial < 3; trial++) { await click('Same', dialog()); await click('Record match', dialog()); expectControlsDisabled(true); }
    await click('Reveal study results', dialog()); expectControlsDisabled(true); const baseline = structuredClone(latest);
    await input(picker(), 'necker'); await click(next()); expectPreserved(baseline, 'brightness');
    await click('End repeated study', dialog()); expectControlsDisabled(false); await choose('necker'); expect(latest.experiment).toBe('necker'); expect(latest.studies).toEqual(baseline.studies);
  });
  it('locks browsing while a repeated study start awaits the parent state update', async () => {
    const value = seed(); value.models.brightness.matching = true;
    await mount(value); await enter(); deferUpdates = true; await click('Start three matches', dialog());
    expect(pendingUpdates).toHaveLength(1); expectControlsDisabled(true); const beforeWrites = writes;
    await input(picker(), 'necker'); await click(next()); expect(writes).toBe(beforeWrites); expect(latest.experiment).toBe('brightness');
    deferUpdates = false; await act(async () => flushUpdates()); expectControlsDisabled(true); await click('End repeated study', dialog()); expectControlsDisabled(false);
  });
  it('keeps the old drawing and modal while a requested switch awaits the parent update', async () => {
    await mount(); await enter(); const baseline = structuredClone(latest), modal = dialog(), geometry = live().innerHTML;
    deferUpdates = true; await choose('necker'); expect(pendingUpdates).toHaveLength(1); expectControlsDisabled(true);
    expect(dialog()).toBe(modal); expect(modal.open).toBe(true); expect(live().innerHTML).toBe(geometry); expectPreserved(baseline, 'brightness');
    await input(picker(), 'moire'); await click(previous()); expect(pendingUpdates).toHaveLength(1);
    deferUpdates = false; await act(async () => flushUpdates()); expectControlsDisabled(false); expect(dialog()).toBe(modal); expect(modal.open).toBe(true); expectPreserved(baseline, 'necker'); expect(document.activeElement).toBe(picker());
  });
  it('cannot start a study or mutate the old experiment while a browse request awaits commit', async () => {
    const value = seed(); value.models.brightness.matching = true;
    await mount(value); await enter(); const baseline = structuredClone(latest); deferUpdates = true; await choose('necker');
    expect(button('Start three matches', dialog()).disabled).toBe(true);
    expect(button('Reset this experiment', dialog()).disabled).toBe(true);
    expect(dialog().querySelector('#perception-note').disabled).toBe(true);
    expect(exact('contrast').disabled).toBe(true);
    await click('Start three matches', dialog()); await click('Reset this experiment', dialog());
    expect(pendingUpdates).toHaveLength(1); expectPreserved(baseline, 'brightness');
    deferUpdates = false; await act(async () => flushUpdates()); expectPreserved(baseline, 'necker');
    expect([...dialog().querySelectorAll('button')].some(node => node.textContent.trim() === 'End repeated study')).toBe(false); expectControlsDisabled(false);
  });
  it('guards browsing while an already-previewed import awaits its parent commit', async () => {
    const readers = [];
    vi.stubGlobal('FileReader', vi.fn(function () { this.result = null; this.readAsText = vi.fn(); this.abort = vi.fn(); readers.push(this); }));
    await mount(); await click('Import notebook');
    const fileInput = host.querySelector('[data-perception-import-file]'), incoming = engine.normalize({ studies: [{ id: 'incoming', experiment: 'necker', date: '2026-10-05T12:01:00.000Z', model: { prediction: 'Unsure', note: 'Imported observation' } }] }).studies;
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [new window.File(['{}'], 'notebook.json', { type: 'application/json' })] });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => { readers[0].result = JSON.stringify({ schema: 'alloflow.perception.notebook', version: 1, studies: incoming }); readers[0].onload(); });
    expect(host.querySelector('[data-perception-import-preview]').dataset.perceptionImportPreview).toBe('preview');
    await enter(); deferUpdates = true;
    // A programmatic commit can arrive from the background panel; native modal
    // interaction remains isolated, while this exercises the operation guard.
    await click('Add observations'); expectControlsDisabled(true); const beforeWrites = writes;
    await input(picker(), 'necker'); await click(next()); expect(writes).toBe(beforeWrites); expect(latest.experiment).toBe('brightness');
    deferUpdates = false; await act(async () => flushUpdates()); expectControlsDisabled(false); expect(latest.studies.map(record => record.id)).toEqual(['saved', 'incoming']);
    await choose('necker'); expect(latest.experiment).toBe('necker'); expect(dialog().open).toBe(true);
  });
  it.each(['close', 'Escape'])('cancels a pending switch when the learner leaves with %s', async action => {
    await mount(); await enter(); const baseline = structuredClone(latest); deferUpdates = true; await choose('necker');
    if (action === 'close') await click('Back to workspace', dialog()); else await key(dialog(), 'Escape');
    expect(dialog().open).toBe(false); deferUpdates = false; await act(async () => flushUpdates()); expectPreserved(baseline, 'brightness'); expect(dialog().open).toBe(false);
  });
  it.each(['experiment', 'profile'])('cancels a queued switch and closes on an external %s replacement', async kind => {
    await mount(); await enter(); deferUpdates = true; await choose('necker');
    if (kind === 'profile') await act(async () => changeProfile('other-learner'));
    else await act(async () => externalState(value => ({ ...value, experiment: 'moire' })));
    expect(dialog().open).toBe(false); const replacement = structuredClone(latest); deferUpdates = false; await act(async () => flushUpdates());
    expect(latest).toEqual(replacement); expect(dialog().open).toBe(false); expectUniqueLiveDrawing(false);
  });
  it('rejects a queued switch after the current experiment receives an external model edit', async () => {
    await mount(); await enter(); deferUpdates = true; await choose('necker');
    await act(async () => externalState(value => ({ ...value, models: { ...value.models, brightness: { ...value.models.brightness, contrast: 28, note: 'New external note' } } })));
    const replacement = structuredClone(latest); deferUpdates = false; await act(async () => flushUpdates());
    expect(latest).toEqual(replacement); expect(dialog().open).toBe(true); expectControlsDisabled(false); expect(picker().value).toBe('brightness');
  });
  it('closes safely when an external destination edit follows the queued updater before React renders', async () => {
    await mount(); await enter(); const baseline = structuredClone(latest); deferUpdates = true; await choose('necker');
    deferUpdates = false;
    await act(async () => {
      flushUpdates();
      externalState(value => ({ ...value, models: { ...value.models, necker: { ...value.models.necker, depth: 82, note: 'External destination update' } } }));
    });
    expect(latest).toEqual({ ...baseline, experiment: 'necker', models: { ...baseline.models, necker: { ...baseline.models.necker, depth: 82, note: 'External destination update' } } });
    expect(dialog().open).toBe(false); expectUniqueLiveDrawing(false);
  });
  it('closes normally on an external experiment or profile change without a queued request', async () => {
    await mount(); await enter(); await act(async () => externalState(value => ({ ...value, experiment: 'moire' })));
    expect(dialog().open).toBe(false); await enter(); await act(async () => changeProfile('another-learner')); expect(dialog().open).toBe(false);
  });
  it('localizes the picker, adjacent experiment labels, and focused description', async () => {
    const strings = { 'stem.perception.choose_experiment': 'Select a drawing', 'stem.perception.previous_experiment': 'Before: {experiment}', 'stem.perception.next_experiment': 'After: {experiment}', 'stem.perception.necker_description': 'Localized wireframe description.' };
    await mount(seed(), { strict: true, translate: (name, fallback) => strings[name] || fallback }); await enter();
    expect(document.querySelector('label[for="' + picker().id + '"]').textContent).toContain('Select a drawing');
    await choose('necker'); expect(description().textContent).toContain('Localized wireframe description.');
    expect(previous().getAttribute('aria-label')).toBe('Before: Café wall'); expect(next().getAttribute('aria-label')).toBe('After: Moiré interference'); expectUniqueLiveDrawing();
  });
});
