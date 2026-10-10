import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['cafeWall', 'necker', 'moire'];
const SETTINGS = {
  cafeWall: [['offset', 72, 21], ['mortar', 11, 3], ['context', true, false]],
  necker: [['depth', 73, 112], ['context', true, false], ['cue', 'front', 'back']],
  moire: [['angle', 13.7, 4.2], ['spacing', 17, 11], ['context', true, false]],
};
let engine, config, root, host, latest, latestAll, externalState, changeProfile, announce, writes;
let deferUpdates, pendingUpdates, flushUpdates, frames, frameId;
const query = selector => host.querySelector(selector);
const card = () => query('[data-perception-inquiry]');
const capture = () => query('[data-perception-inquiry-start]');
const setting = () => query('[data-perception-inquiry-setting]');
const status = () => query('[data-perception-inquiry-status]');
const end = () => query('[data-perception-end-inquiry]');
const model = () => latest.models[latest.experiment];
const live = () => query('#perception-stage-current');
const baseline = () => query('#perception-stage-reference');

function seed(experiment = 'cafeWall') {
  return engine.normalize({ experiment, expanded: true,
    models: {
      brightness: { matching: true, matchValue: 155, target: 117, contrast: 61, prediction: 'Right', note: 'Brightness note' },
      ebbinghaus: { surround: 43, gap: 19, prediction: 'Same', note: 'Size note' },
      mullerLyer: { angle: 54, fin: 63, prediction: 'Bottom', note: 'Line note' },
      cafeWall: { offset: 72, mortar: 11, context: true, prediction: 'Tilted', note: 'Starting wall note' },
      necker: { depth: 73, cue: 'front', context: true, prediction: 'Upper right', note: 'Starting cube note' },
      moire: { angle: 13.7, spacing: 17, context: true, prediction: 'Fine lines', note: 'Starting grid note' },
    }, comparison: { experiment: 'brightness', model: { target: 162, note: 'Saved pin', reveal: true } },
    studies: [{ id: 'saved', experiment: 'necker', date: '2026-10-05T12:00:00.000Z', model: { prediction: 'Unsure', note: 'Notebook note' } }],
  });
}
async function mount(value = seed(), { strict = false } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('inquiry-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    flushUpdates = () => pendingUpdates.splice(0).forEach(setData);
    return config.render(makeCtx({ toolData: data, activeProfileId: profile, announceToSR: announce,
      setToolData: update => { writes++; if (deferUpdates) pendingUpdates.push(update); else setData(update); } }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness); await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label) {
  const found = [...host.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
async function click(target) { expect(target).toBeTruthy(); await act(async () => (typeof target === 'string' ? button(target) : target).click()); }
async function input(node, value) {
  expect(node).toBeTruthy(); const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); });
}
async function focus(node) { expect(node).toBeTruthy(); await act(async () => node.focus()); }
async function openCard() { await act(async () => { card().open = true; card().dispatchEvent(new Event('toggle')); }); }
async function begin() { await openCard(); await focus(capture()); await click(capture()); expect(query('[data-perception-inquiry-comparison]')).toBeTruthy(); }
async function tick(time) { const scheduled = frames.entries().next().value; expect(scheduled).toBeTruthy(); frames.delete(scheduled[0]); await act(async () => scheduled[1](time)); }
function preserved(before) {
  expect(latest.comparison).toEqual(before.comparison); expect(latest.studies).toEqual(before.studies); expect(latest.expanded).toBe(before.expanded);
  for (const id of engine.experiments.map(item => item.id)) if (id !== latest.experiment) expect(latest.models[id]).toEqual(before.models[id]);
  expect(latestAll.otherTool).toEqual({ preserved: 37 }); expect(Object.keys(latestAll)).toEqual(['perceptionLab', 'otherTool']);
  expect(Object.keys(latest)).toEqual(Object.keys(before));
}
function expectStatus(kind, count) { expect(status().getAttribute('data-status')).toBe(kind); expect(status().getAttribute('data-count')).toBe(String(count)); }
function flatten(nodes) { return (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => node && typeof node === 'object' ? [node, ...flatten(node.children || [])] : []); }
function expectSceneGeometry(svg, id, values) {
  const expected = flatten(engine.scene(id, values)).filter(node => ['line', 'rect', 'circle', 'polygon', 'path'].includes(node.tag));
  const actual = [...svg.querySelectorAll('line,rect,circle,polygon,path')]; expect(actual).toHaveLength(expected.length);
  const attributes = { strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap', fillOpacity: 'fill-opacity', strokeOpacity: 'stroke-opacity' };
  expected.forEach((node, index) => {
    expect(actual[index].tagName.toLowerCase()).toBe(node.tag);
    for (const [name, value] of Object.entries(node.props || {})) {
      if (name === 'key' || name === 'clipPath' || name === 'id' || name === 'style') continue;
      expect(actual[index].getAttribute(attributes[name] || name), id + '.' + name).toBe(String(value));
    }
  });
  for (const node of flatten(engine.scene(id, values))) {
    if (node.props?.['data-perception-grid']) {
      const grid = svg.querySelector('[data-perception-grid="' + node.props['data-perception-grid'] + '"]');
      expect(grid).toBeTruthy(); expect(grid.getAttribute('transform')).toBe(node.props.transform ? String(node.props.transform) : null);
    }
  }
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  announce = vi.fn(); writes = 0; deferUpdates = false; pendingUpdates = []; frames = new Map(); frameId = 0;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, writable: true, value() { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('One-setting inquiry comparison model', () => {
  it.each(IDS)('compares normalized %s controls, context, and face cue in stable order', id => {
    const first = seed(id).models[id], second = { ...first }, keys = SETTINGS[id].map(item => item[0]);
    SETTINGS[id].forEach(([key, , after]) => { second[key] = after; });
    const expected = SETTINGS[id].map(([key, before, after]) => ({ key, before, after }));
    const result = engine.inquiryChanges(id, first, second, keys[0]);
    expect(result).toEqual({ changes: expected, selected: keys[0], selectedChanged: true, otherChanges: expected.slice(1), status: 'multiple' });
    expect(first).toEqual(seed(id).models[id]); expect(second).toEqual({ ...first, ...Object.fromEntries(SETTINGS[id].map(([key, , after]) => [key, after])) });
  });
  it.each(IDS)('reports unchanged, selected, other, and multiple %s changes honestly', id => {
    const first = seed(id).models[id], [[selected, , selectedValue], [other, , otherValue], [third, , thirdValue]] = SETTINGS[id];
    expect(engine.inquiryChanges(id, first, first, selected)).toEqual({ changes: [], selected, selectedChanged: false, otherChanges: [], status: 'unchanged' });
    expect(engine.inquiryChanges(id, first, { ...first, [selected]: selectedValue }, selected)).toEqual({ changes: [{ key: selected, before: first[selected], after: selectedValue }], selected, selectedChanged: true, otherChanges: [], status: 'selected' });
    const descriptor = { key: other, before: first[other], after: otherValue };
    expect(engine.inquiryChanges(id, first, { ...first, [other]: otherValue }, selected)).toEqual({ changes: [descriptor], selected, selectedChanged: false, otherChanges: [descriptor], status: 'other' });
    const result = engine.inquiryChanges(id, first, { ...first, [other]: otherValue, [third]: thirdValue }, selected);
    expect(result.status).toBe('multiple'); expect(result.selectedChanged).toBe(false); expect(result.changes).toHaveLength(2); expect(result.otherChanges).toEqual(result.changes);
  });
  it.each(IDS)('ignores %s impressions, notes, reveal guides, and unrelated raw fields', id => {
    const first = seed(id).models[id], second = { ...first, reveal: true, note: 'Different note', prediction: 'Unsure', unknown: 999 };
    expect(engine.inquiryChanges(id, first, second, 'context').changes).toEqual([]); expect(engine.inquiryChanges(id, first, second, 'context').status).toBe('unchanged');
  });
  it.each(IDS)('falls back to the first %s control for an invalid selected setting', id => {
    const first = seed(id).models[id];
    for (const invalid of ['missing', 'note', 'reveal', '', null, {}, undefined]) expect(engine.inquiryChanges(id, first, first, invalid).selected).toBe(SETTINGS[id][0][0]);
    for (const [key] of SETTINGS[id]) expect(engine.inquiryChanges(id, first, first, key).selected).toBe(key);
  });
  it('compares normalized boundaries and moiré decimals rather than raw input noise', () => {
    expect(engine.inquiryChanges('cafeWall', { offset: -10, mortar: 100 }, { offset: 0, mortar: 14 }, 'offset').changes).toEqual([]);
    expect(engine.inquiryChanges('necker', { depth: 5, cue: 'invalid', context: null }, { depth: 45, cue: 'none', context: true }, 'depth').changes).toEqual([]);
    expect(engine.inquiryChanges('moire', { angle: 13.70001, spacing: 99 }, { angle: 13.7, spacing: 24 }, 'angle').changes).toEqual([]);
    expect(engine.inquiryChanges('moire', { angle: 13.7 }, { angle: 13.8 }, 'angle').changes).toEqual([{ key: 'angle', before: 13.7, after: 13.8 }]);
  });
  it.each(['brightness', 'ebbinghaus', 'mullerLyer', 'missing', '', null])('returns null for unsupported inquiry experiment %j', id => {
    expect(engine.inquiryChanges(id, {}, {}, 'context')).toBeNull();
  });
});

describe('Capture and explore one drawing change', () => {
  it.each(IDS)('offers a closed optional %s inquiry with the relevant setting choices', async id => {
    await mount(seed(id)); expect(card().tagName).toBe('DETAILS'); expect(card().open).toBe(false); expect(card().querySelector('summary').textContent).toBe('Try one change');
    expect([...setting().options].map(item => item.value)).toEqual(SETTINGS[id].map(item => item[0]));
    expect(capture().textContent).toContain('Capture starting view'); expect(query('[data-perception-inquiry-comparison]')).toBeNull();
  });
  it.each(['brightness', 'ebbinghaus', 'mullerLyer'])('keeps %s dedicated matching controls without the inquiry card', async id => {
    await mount(seed(id)); expect(card()).toBeNull();
  });
  it.each(IDS)('captures immutable %s geometry and keeps the saved pin and notebook', async id => {
    await mount(seed(id)); const before = structuredClone(latest), starting = structuredClone(model()); await begin();
    expect(latest).toEqual(before); preserved(before); expect(card().open).toBe(true); expectSceneGeometry(baseline(), id, starting); expectSceneGeometry(live(), id, starting);
    expectStatus('unchanged', 0); expect(status().textContent).toContain('No drawing settings changed'); expect(capture().textContent).toContain('Replace starting view'); expect(document.activeElement).toBe(capture());
    const [key, , after] = SETTINGS[id][0]; await input(query('#perception-' + key), after);
    expectSceneGeometry(baseline(), id, starting); expectSceneGeometry(live(), id, model()); expectStatus('selected', 1); preserved(before);
  });
  it.each(IDS)('counts %s drawing changes while keeping both impressions and notes independent', async id => {
    await mount(seed(id)); await begin(); const startingPrediction = model().prediction, baselineHTML = baseline().innerHTML;
    await input(query('#perception-note'), 'A fresh note'); await click('Unsure'); expectStatus('unchanged', 0); expect(baseline().innerHTML).toBe(baselineHTML);
    expect(query('[data-perception-inquiry-impression="starting"]').textContent).toContain(startingPrediction);
    expect(query('[data-perception-inquiry-impression="current"]').textContent).toContain('Unsure'); expect(model().note).toBe('A fresh note');
    await click('Reveal measurements'); expectStatus('unchanged', 0);
    const [[key, , after], [other, , otherAfter]] = SETTINGS[id]; await input(query('#perception-' + key), after); expectStatus('selected', 1);
    if (other === 'context') await click('Remove surroundings'); else await input(query('#perception-' + other), otherAfter);
    expectStatus('multiple', 2); expect(status().textContent).toContain('2 drawing settings changed');
  });
  it('counts hidden surroundings changes honestly and allows choosing another setting without resetting the baseline', async () => {
    await mount(seed('necker')); await begin(); const original = baseline().innerHTML;
    await input(query('#perception-cue'), 'back'); expectStatus('other', 1); expect(status().textContent).toContain('A different setting changed');
    const before = structuredClone(latest); await input(setting(), 'cue'); expectStatus('selected', 1); expect(latest).toEqual(before); expect(baseline().innerHTML).toBe(original);
    await click('Remove surroundings'); expectStatus('multiple', 2);
    await input(setting(), 'context'); expectStatus('multiple', 2); await input(query('#perception-cue'), 'front'); expectStatus('selected', 1);
    await click('Remove surroundings'); expectStatus('unchanged', 0);
  });
  it.each(['side', 'stacked', 'switch'])('keeps equal-scale starting geometry through the %s comparison layout', async layout => {
    await mount(seed('moire')); await begin(); const referenceHTML = baseline().innerHTML;
    await input(query('[data-perception-comparison-layout]'), layout); expect(baseline().innerHTML).toBe(referenceHTML);
    expect(baseline().getAttribute('viewBox')).toBe(live().getAttribute('viewBox'));
    if (layout === 'switch') {
      await click(query('[data-perception-show-pinned]')); expect(query('[data-perception-show-pinned]').getAttribute('aria-pressed')).toBe('true');
      await input(query('#perception-angle'), 6.4); expect(query('[data-perception-show-current]').getAttribute('aria-pressed')).toBe('true');
    }
    expectSceneGeometry(baseline(), 'moire', seed('moire').models.moire);
  });
  it('captures the current visible moiré frame and pauses rotation at that exact angle', async () => {
    await mount(seed('moire')); await click('Play slow rotation'); await tick(0); await tick(800);
    const visible = Number(query('#perception-angle').value); expect(visible).not.toBe(13.7); await begin();
    expect(model().angle).toBe(visible); expect(frames.size).toBe(0); expect(button('Play slow rotation').getAttribute('aria-pressed')).toBe('false');
    expectSceneGeometry(baseline(), 'moire', { ...seed('moire').models.moire, angle: visible }); expectStatus('unchanged', 0);
  });
  it('replaces the baseline explicitly and closes it without altering current settings or the stored pin', async () => {
    await mount(seed('cafeWall')); await begin(); await input(query('#perception-offset'), 28); expectStatus('selected', 1);
    const before = structuredClone(latest), current = structuredClone(model()); await click(capture()); expectStatus('unchanged', 0); expectSceneGeometry(baseline(), 'cafeWall', current); expect(latest).toEqual(before);
    await click(end()); expect(query('[data-perception-inquiry-comparison]')).toBeNull(); expect(latest).toEqual(before); preserved(before); expect(document.activeElement).toBe(capture());
    expectSceneGeometry(baseline(), before.comparison.experiment, before.comparison.model);
  });
  it('reopens collapsed experiment controls before returning focus from the drawing comparison', async () => {
    await mount(seed('cafeWall')); await begin();
    const controls = card().parentElement.closest('details'); expect(controls).toBeTruthy(); expect(controls.querySelector('summary').textContent).toBe('Adjust experiment');
    await act(async () => { controls.open = false; controls.dispatchEvent(new Event('toggle')); });
    expect(controls.open).toBe(false); expect(query('[data-perception-inquiry-comparison]')).toBeTruthy();
    const before = structuredClone(latest); await focus(end()); await click(end());
    expect(query('[data-perception-inquiry-comparison]')).toBeNull(); expect(controls.open).toBe(true); expect(card().open).toBe(true); expect(document.activeElement).toBe(capture()); expect(latest).toEqual(before);
  });
  it('switches between starting-view inquiry and surroundings comparison while preserving the saved pin', async () => {
    await mount(seed('necker')); const before = structuredClone(latest); await begin();
    await click(query('[data-perception-compare-context]')); expect(query('[data-perception-inquiry-comparison]')).toBeNull(); expect(query('[data-perception-context-comparison]')).toBeTruthy();
    await begin(); expect(query('[data-perception-context-comparison]')).toBeNull(); expect(query('[data-perception-compare-context]').getAttribute('aria-pressed')).toBe('false'); expect(latest).toEqual(before);
    await click(end()); expect(latest.comparison).toEqual(before.comparison);
  });
  it.each(['experiment', 'profile'])('clears the ephemeral baseline on an external %s change and never resurrects it', async kind => {
    await mount(seed('cafeWall')); await begin(); const before = structuredClone(latest);
    if (kind === 'profile') await act(async () => changeProfile('another-learner'));
    else await act(async () => externalState(value => ({ ...value, experiment: 'necker' })));
    expect(query('[data-perception-inquiry-comparison]')).toBeNull();
    if (kind === 'profile') await act(async () => changeProfile('inquiry-learner'));
    else await act(async () => externalState(value => ({ ...value, experiment: 'cafeWall' })));
    expect(query('[data-perception-inquiry-comparison]')).toBeNull(); expect(latest).toEqual(before);
  });
  it('keeps capture immutable under StrictMode and a replayed deferred parent update', async () => {
    await mount(seed('moire'), { strict: true }); await openCard(); await focus(capture()); const before = structuredClone(latestAll); deferUpdates = true; await click(capture());
    expect(query('[data-perception-inquiry-comparison]')).toBeNull(); expect(pendingUpdates).toHaveLength(1); expect(card().getAttribute('aria-busy')).toBe('true'); expect(setting().disabled).toBe(true); expect(capture().disabled).toBe(true);
    const updater = pendingUpdates[0]; expect(updater(before)).toEqual(updater(before)); expect(before.perceptionLab).toEqual(seed('moire'));
    deferUpdates = false; await act(async () => flushUpdates()); expect(latestAll).toEqual(before); expect(query('[data-perception-inquiry-comparison]')).toBeTruthy(); expect(document.activeElement).toBe(capture()); expectSceneGeometry(baseline(), 'moire', before.perceptionLab.models.moire);
  });
  it.each(['profile', 'experiment', 'model'])('rejects delayed capture when an external %s replacement arrives first', async kind => {
    await mount(seed('cafeWall')); await openCard(); deferUpdates = true; await click(capture());
    if (kind === 'profile') await act(async () => changeProfile('replacement-learner'));
    else await act(async () => externalState(value => kind === 'experiment' ? { ...value, experiment: 'necker' } : { ...value, models: { ...value.models, cafeWall: { ...value.models.cafeWall, offset: 39, note: 'External replacement' } } }));
    const replacement = structuredClone(latest); await focus(query('#perception-note')); deferUpdates = false; await act(async () => flushUpdates());
    expect(latest).toEqual(replacement); expect(query('[data-perception-inquiry-comparison]')).toBeNull(); expect(document.activeElement).toBe(query('#perception-note'));
  });
  it('does not accept or steal focus after a replacement follows the updater before React renders', async () => {
    await mount(seed('moire')); await openCard(); deferUpdates = true; await click(capture());
    const summary = card().querySelector('summary'); await focus(summary); expect(document.activeElement).toBe(summary); deferUpdates = false;
    await act(async () => { flushUpdates(); externalState(value => ({ ...value, models: { ...value.models, moire: { ...value.models.moire, angle: 22.6, note: 'External after-commit update' } } })); });
    expect(model().angle).toBe(22.6); expect(model().note).toBe('External after-commit update'); expect(query('[data-perception-inquiry-comparison]')).toBeNull(); expect(document.activeElement).toBe(summary); expect(capture().disabled).toBe(false);
  });
  it('completes a deferred capture after an unchanged parent model is committed', async () => {
    await mount(seed('necker')); await openCard(); await focus(capture()); const before = structuredClone(latest); deferUpdates = true; await click(capture());
    expect(card().getAttribute('aria-busy')).toBe('true'); expect(query('[data-perception-inquiry-comparison]')).toBeNull(); expect(pendingUpdates).toHaveLength(1);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest).toEqual(before); expect(query('[data-perception-inquiry-comparison]')).toBeTruthy(); expectStatus('unchanged', 0); expect(capture().disabled).toBe(false); expect(document.activeElement).toBe(capture());
  });
  it('blocks conflicting edits and double capture requests before the pending update finishes', async () => {
    await mount(seed('cafeWall')); await click('Focus experiment'); await openCard(); deferUpdates = true; const node = capture();
    await act(async () => { node.click(); node.click(); }); expect(pendingUpdates).toHaveLength(1); expect(capture().disabled).toBe(true); expect(setting().disabled).toBe(true);
    for (const element of [query('#perception-offset'), query('#perception-note'), query('[data-perception-focus-picker]'), button('Pin comparison'), button('Export SVG'), button('Export PNG'), query('[data-perception-compare-context]')]) expect(element.disabled).toBe(true);
    const before = structuredClone(latest); await click('Pin comparison'); await click(query('[data-perception-compare-context]')); expect(pendingUpdates).toHaveLength(1); expect(latest).toEqual(before);
    deferUpdates = false; await act(async () => flushUpdates()); expect(query('[data-perception-inquiry-comparison]')).toBeTruthy();
  });
  it('blocks capture while a focus browse request is waiting for the parent', async () => {
    await mount(seed('cafeWall')); await click('Focus experiment'); await openCard(); deferUpdates = true;
    await input(query('[data-perception-focus-picker]'), 'necker'); expect(capture().disabled).toBe(true); expect(setting().disabled).toBe(true);
    await click(capture()); expect(pendingUpdates).toHaveLength(1); deferUpdates = false; await act(async () => flushUpdates()); expect(latest.experiment).toBe('necker'); expect(query('[data-perception-inquiry-comparison]')).toBeNull();
  });
  it('blocks capture while a previewed notebook import awaits its parent commit', async () => {
    const readers = []; vi.stubGlobal('FileReader', vi.fn(function () { this.result = null; this.readAsText = vi.fn(); this.abort = vi.fn(); readers.push(this); }));
    await mount(seed('necker')); await openCard(); await click('Import notebook');
    const fileInput = query('[data-perception-import-file]'), incoming = engine.normalize({ studies: [{ id: 'incoming', experiment: 'moire', date: '2026-10-05T12:01:00.000Z', model: { prediction: 'Unsure' } }] }).studies;
    await act(async () => { Object.defineProperty(fileInput, 'files', { configurable: true, value: [new window.File(['{}'], 'notebook.json', { type: 'application/json' })] }); fileInput.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => { readers[0].result = JSON.stringify({ schema: 'alloflow.perception.notebook', version: 1, studies: incoming }); readers[0].onload(); });
    deferUpdates = true; await click('Add observations'); expect(capture().disabled).toBe(true); expect(setting().disabled).toBe(true); await click(capture()); expect(pendingUpdates).toHaveLength(1);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest.studies.map(item => item.id)).toEqual(['saved', 'incoming']); expect(query('[data-perception-inquiry-comparison]')).toBeNull();
  });
  it('blocks inquiry while a saved matching study start awaits its parent update', async () => {
    const value = seed('cafeWall'); value.studies = engine.normalize({ studies: [{ id: 'saved-match', experiment: 'brightness', date: '2026-10-05T12:01:00.000Z', model: { matching: true, matchValue: 145, prediction: 'Unsure', note: 'Saved match' } }] }).studies;
    await mount(value); await openCard(); deferUpdates = true; await click('Repeat these settings');
    expect(capture().disabled).toBe(true); expect(setting().disabled).toBe(true); const count = writes; await click(capture()); expect(writes).toBe(count); expect(pendingUpdates).toHaveLength(1);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest.experiment).toBe('brightness'); expect(card()).toBeNull(); expect(query('[data-perception-inquiry-comparison]')).toBeNull();
  });
});
