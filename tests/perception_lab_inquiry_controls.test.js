import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['cafeWall', 'necker', 'moire'];
const SCOPES = ['selected', 'others'];
const SETTINGS = {
  cafeWall: [['offset', 72, 21], ['mortar', 11, 3], ['context', true, false]],
  necker: [['depth', 73, 112], ['context', true, false], ['cue', 'front', 'back']],
  moire: [['angle', 13.7, 4.2], ['spacing', 17, 11], ['context', true, false]],
};
let engine, config, root, host, latest, latestAll, externalState, changeProfile, announce, writes;
let deferUpdates, pendingUpdates, flushUpdates, frames, frameId, scrollIntoView, originalScrollIntoView;
const query = selector => host.querySelector(selector);
const card = () => query('[data-perception-inquiry]');
const capture = () => query('[data-perception-inquiry-start]');
const setting = () => query('[data-perception-inquiry-setting]');
const status = () => query('[data-perception-inquiry-status]');
const restore = scope => query('[data-perception-inquiry-restore="' + scope + '"]');
const adjust = location => query('[data-perception-inquiry-adjust="' + location + '"]');
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
    const [profile, setProfile] = React.useState('inquiry-controls-learner');
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
const control = key => key === 'context' ? query('[data-perception-context-toggle]') : query('#perception-' + key);
async function changeSetting(key, value) { if (key === 'context') { if (model().context !== value) await click(control(key)); } else await input(control(key), value); }
function preserved(before) {
  expect(latest.comparison).toEqual(before.comparison); expect(latest.studies).toEqual(before.studies); expect(latest.expanded).toBe(before.expanded);
  for (const id of engine.experiments.map(item => item.id)) if (id !== latest.experiment) expect(latest.models[id]).toEqual(before.models[id]);
  expect(latestAll.otherTool).toEqual({ preserved: 37 }); expect(Object.keys(latestAll)).toEqual(['perceptionLab', 'otherTool']); expect(Object.keys(latest)).toEqual(Object.keys(before));
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
  for (const node of flatten(engine.scene(id, values))) if (node.props?.['data-perception-grid']) {
    const grid = svg.querySelector('[data-perception-grid="' + node.props['data-perception-grid'] + '"]'); expect(grid).toBeTruthy(); expect(grid.getAttribute('transform')).toBe(node.props.transform ? String(node.props.transform) : null);
  }
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  announce = vi.fn(); writes = 0; deferUpdates = false; pendingUpdates = []; frames = new Map(); frameId = 0; scrollIntoView = vi.fn(); originalScrollIntoView = Object.getOwnPropertyDescriptor(window.Element.prototype, 'scrollIntoView');
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, writable: true, value() { this.open = false; } });
  Object.defineProperty(window.Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: scrollIntoView });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); if (originalScrollIntoView) Object.defineProperty(window.Element.prototype, 'scrollIntoView', originalScrollIntoView); else delete window.Element.prototype.scrollIntoView; delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('Plan restoring selected inquiry settings', () => {
  it.each(IDS.flatMap(id => SCOPES.map(scope => [id, scope])))('restores only %s %s drawing keys while retaining the current observation', (id, scope) => {
    const first = seed(id).models[id], current = { ...first, ...Object.fromEntries(SETTINGS[id].map(([key, , after]) => [key, after])), note: 'Keep the current note', prediction: 'Unsure', reveal: true };
    const before = structuredClone(first), currentBefore = structuredClone(current), selected = SETTINGS[id][0][0], wanted = SETTINGS[id].filter(([key]) => scope === 'selected' ? key === selected : key !== selected);
    const plan = engine.planInquiryRestore(id, first, current, selected, scope);
    expect(plan).toEqual({ selected, changes: wanted.map(([key, baselineValue, after]) => ({ key, before: baselineValue, after })), model: { ...current, ...Object.fromEntries(wanted.map(([key, beforeValue]) => [key, beforeValue])) } });
    expect(first).toEqual(before); expect(current).toEqual(currentBefore);
  });
  it.each(IDS)('returns an unchanged normalized %s model when the chosen scope has no edits', id => {
    const first = seed(id).models[id], current = { ...first, note: 'Only a note', prediction: 'Unsure', reveal: true };
    for (const scope of SCOPES) expect(engine.planInquiryRestore(id, first, current, 'missing', scope)).toEqual({ selected: SETTINGS[id][0][0], changes: [], model: current });
  });
  it.each(IDS)('accepts every %s drawing setting and excludes unchanged keys from its restore plan', id => {
    const first = seed(id).models[id];
    for (const [selected, , value] of SETTINGS[id]) {
      const current = { ...first, [selected]: value }, plan = engine.planInquiryRestore(id, first, current, selected, 'selected');
      expect(plan.selected).toBe(selected); expect(plan.model).toEqual(first); expect(plan.changes).toEqual([{ key: selected, before: first[selected], after: value }]);
      expect(engine.planInquiryRestore(id, first, current, selected, 'others')).toEqual({ selected, changes: [], model: current });
    }
  });
  it('uses bounded and stepped normalized drawing values without losing full moiré decimals', () => {
    expect(engine.planInquiryRestore('moire', { angle: 13.70001, spacing: 100 }, { angle: 14.26, spacing: -10, note: 'Decimal note' }, 'angle', 'selected')).toEqual({ selected: 'angle', changes: [{ key: 'angle', before: 13.7, after: 14.3 }], model: engine.normalizeModel('moire', { angle: 13.7, spacing: 8, note: 'Decimal note' }) });
    expect(engine.planInquiryRestore('cafeWall', { offset: -999, mortar: 99 }, { offset: 0, mortar: 14 }, 'offset', 'others').changes).toEqual([]);
    expect(engine.planInquiryRestore('necker', { depth: 999, cue: 'invalid' }, { depth: 125, cue: 'none' }, 'cue', 'selected').changes).toEqual([]);
  });
  it.each(['brightness', 'ebbinghaus', 'mullerLyer', 'missing', '', null])('rejects unsupported restore experiment %j', id => {
    for (const scope of SCOPES) expect(engine.planInquiryRestore(id, {}, {}, 'context', scope)).toBeNull();
  });
  it.each(['all', '', null, undefined, {}, true, 1])('rejects invalid restoration scope %j', scope => {
    expect(engine.planInquiryRestore('moire', {}, {}, 'angle', scope)).toBeNull();
  });
});

describe('Navigate and restore a chosen inquiry setting', () => {
  it('shows full starting/current decimal values and changes selection without moving focus', async () => {
    await mount(seed('moire')); await begin(); await input(control('angle'), 14.3);
    expect(query('[data-perception-inquiry-value="starting"]').textContent).toContain('13.7'); expect(query('[data-perception-inquiry-value="current"]').textContent).toContain('14.3');
    await focus(setting()); scrollIntoView.mockClear(); const before = structuredClone(latest); await input(setting(), 'spacing');
    expect(document.activeElement).toBe(setting()); expect(scrollIntoView).not.toHaveBeenCalled(); expect(latest).toEqual(before);
    expect(query('[data-perception-inquiry-value="starting"]').textContent).toContain('17'); expect(query('[data-perception-inquiry-value="current"]').textContent).toContain('17');
  });
  it.each([['cafeWall', 'offset'], ['moire', 'angle'], ['necker', 'cue'], ['necker', 'context']].flatMap(([id, key]) => ['controls', 'scene'].map(location => [id, key, location])))('navigates to the actual %s %s control from the %s action', async (id, key, location) => {
    await mount(seed(id)); await begin(); await input(setting(), key); const controls = card().parentElement.closest('details');
    if (location === 'scene') await act(async () => { controls.open = false; controls.dispatchEvent(new Event('toggle')); });
    const before = structuredClone(latest); scrollIntoView.mockClear(); await focus(adjust(location)); await click(adjust(location));
    expect(controls.open).toBe(true); expect(card().open).toBe(true); expect(document.activeElement).toBe(control(key)); expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.instances).toContain(control(key)); expect(latest).toEqual(before); expect(query('[data-perception-inquiry-comparison]')).toBeTruthy();
    if (key === 'context') expect(control(key).id).toBeTruthy();
  });
  it.each(IDS)('restores the chosen %s setting and retains other changes, notes, reveal, pin, and baseline', async id => {
    await mount(seed(id)); await begin(); const first = structuredClone(model());
    for (const [key, , value] of SETTINGS[id]) await changeSetting(key, value);
    await input(query('#perception-note'), 'Keep current note'); await click('Unsure'); await click('Reveal measurements');
    const before = structuredClone(latest), originalBaseline = baseline().innerHTML, selected = SETTINGS[id][0][0]; await focus(restore('selected')); await click(restore('selected'));
    expect(model()).toEqual({ ...before.models[id], [selected]: first[selected] }); preserved(before); expect(baseline().innerHTML).toBe(originalBaseline); expectSceneGeometry(live(), id, model()); expectSceneGeometry(baseline(), id, first);
    expect(document.activeElement).toBe(control(selected)); expect(restore('selected').disabled).toBe(true); expect(restore('others').disabled).toBe(false); expectStatus('multiple', 2);
  });
  it.each(IDS)('restores other %s settings while retaining the chosen edit and current observation', async id => {
    await mount(seed(id)); await begin(); const first = structuredClone(model());
    for (const [key, , value] of SETTINGS[id]) await changeSetting(key, value);
    await input(query('#perception-note'), 'Current observation note'); await click('Unsure'); const before = structuredClone(latest), selected = SETTINGS[id][0][0], originalBaseline = baseline().innerHTML;
    await focus(restore('others')); await click(restore('others'));
    const expected = { ...before.models[id] }; SETTINGS[id].forEach(([key]) => { if (key !== selected) expected[key] = first[key]; });
    expect(model()).toEqual(expected); preserved(before); expect(baseline().innerHTML).toBe(originalBaseline); expectSceneGeometry(live(), id, expected);
    expect(document.activeElement).toBe(control(selected)); expect(restore('others').disabled).toBe(true); expect(restore('selected').disabled).toBe(false); expectStatus('selected', 1);
  });
  it('restores a hidden face cue independently of context visibility and shows its starting/current values', async () => {
    await mount(seed('necker')); await begin(); await input(setting(), 'cue'); await changeSetting('context', false); await changeSetting('cue', 'back');
    expectStatus('multiple', 2); expect(query('[data-perception-inquiry-value="starting"]').textContent).toContain('Lower left'); expect(query('[data-perception-inquiry-value="current"]').textContent).toContain('Upper right');
    await focus(restore('selected')); await click(restore('selected')); expect(model().cue).toBe('front'); expect(model().context).toBe(false); expectStatus('other', 1); expect(document.activeElement).toBe(control('cue'));
    await input(setting(), 'context'); await focus(restore('selected')); await click(restore('selected')); expect(model().context).toBe(true); expectStatus('unchanged', 0); expect(document.activeElement).toBe(control('context'));
  });
  it('avoids writing or moving focus when the selected restoration scope has no drawing changes', async () => {
    await mount(seed('cafeWall')); await begin(); const before = structuredClone(latest), count = writes;
    expect(restore('selected').disabled).toBe(true); expect(restore('others').disabled).toBe(true); await focus(setting());
    await click(restore('selected')); await click(restore('others')); expect(latest).toEqual(before); expect(writes).toBe(count); expect(document.activeElement).toBe(setting());
  });
  it('freezes the visible moiré angle when restoring other settings without discarding the chosen angle', async () => {
    await mount(seed('moire')); await begin(); await changeSetting('spacing', 9); await click('Play slow rotation'); await tick(0); await tick(800);
    const visible = Number(control('angle').value); expect(visible).not.toBe(13.7); const originalBaseline = baseline().innerHTML;
    await focus(restore('others')); await click(restore('others')); expect(model().angle).toBe(visible); expect(model().spacing).toBe(17); expect(frames.size).toBe(0); expect(baseline().innerHTML).toBe(originalBaseline); expectStatus('selected', 1); expect(document.activeElement).toBe(control('angle'));
  });
  it('replays a deferred restoration deterministically and keeps the current drawing until commit', async () => {
    await mount(seed('moire'), { strict: true }); await begin(); await changeSetting('angle', 19.6); const before = structuredClone(latestAll), beforeGeometry = live().innerHTML, originalBaseline = baseline().innerHTML;
    deferUpdates = true; await focus(restore('selected')); await click(restore('selected')); expect(pendingUpdates).toHaveLength(1); expect(latestAll).toEqual(before); expect(live().innerHTML).toBe(beforeGeometry); expect(baseline().innerHTML).toBe(originalBaseline);
    const updater = pendingUpdates[0], first = updater(before), second = updater(before); expect(second).toEqual(first); expect(before.perceptionLab.models.moire.angle).toBe(19.6);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latestAll).toEqual(first); expect(model().angle).toBe(13.7); expect(document.activeElement).toBe(control('angle')); expectStatus('unchanged', 0); expect(baseline().innerHTML).toBe(originalBaseline);
  });
  it.each(['profile', 'experiment', 'model'])('rejects deferred restoration after an external %s replacement', async kind => {
    await mount(seed('cafeWall')); await begin(); await changeSetting('offset', 27); deferUpdates = true; await click(restore('selected'));
    if (kind === 'profile') await act(async () => changeProfile('replacement-learner'));
    else await act(async () => externalState(value => kind === 'experiment' ? { ...value, experiment: 'necker' } : { ...value, models: { ...value.models, cafeWall: { ...value.models.cafeWall, offset: 49, note: 'External replacement note' } } }));
    const replacement = structuredClone(latest); await focus(query('#perception-note')); deferUpdates = false; await act(async () => flushUpdates()); expect(latest).toEqual(replacement); expect(document.activeElement).toBe(query('#perception-note'));
  });
  it('does not accept or steal focus when an external replacement follows the restoration updater before React renders', async () => {
    await mount(seed('moire')); await begin(); await changeSetting('angle', 19.6); deferUpdates = true; await click(restore('selected'));
    const summary = card().querySelector('summary'); await focus(summary); expect(document.activeElement).toBe(summary); deferUpdates = false;
    await act(async () => { flushUpdates(); externalState(value => ({ ...value, models: { ...value.models, moire: { ...value.models.moire, angle: 22.6, note: 'External after-commit update' } } })); });
    expect(model().angle).toBe(22.6); expect(model().note).toBe('External after-commit update'); expect(document.activeElement).toBe(summary); expect(restore('selected').disabled).toBe(false);
  });
  it('keeps legitimate user focus elsewhere when a delayed successful restore finishes', async () => {
    await mount(seed('cafeWall')); await begin(); await changeSetting('offset', 28); deferUpdates = true; await focus(restore('selected')); await click(restore('selected'));
    const summary = card().querySelector('summary'); await focus(summary); deferUpdates = false; await act(async () => flushUpdates());
    expect(model().offset).toBe(72); expect(document.activeElement).toBe(summary); expectStatus('unchanged', 0);
  });
  it.each(['close', 'Escape'])('preserves native workspace return focus when a pending restore completes after leaving by %s', async action => {
    await mount(seed('cafeWall')); await click('Focus experiment'); await begin(); await changeSetting('offset', 28); deferUpdates = true; await focus(restore('selected')); await click(restore('selected'));
    const dialog = query('[data-perception-focus-dialog]');
    if (action === 'close') await click('Back to workspace'); else await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(dialog.open).toBe(false); expect(button('Focus experiment').disabled).toBe(true); deferUpdates = false; await act(async () => flushUpdates());
    expect(model().offset).toBe(72); expect(dialog.open).toBe(false); expect(document.activeElement).toBe(button('Focus experiment'));
  });
  it('preserves focus moved to an enabled workspace summary after closing before a delayed restore commits', async () => {
    await mount(seed('cafeWall')); await click('Focus experiment'); await begin(); await changeSetting('offset', 28); deferUpdates = true; await focus(restore('selected')); await click(restore('selected'));
    const dialog = query('[data-perception-focus-dialog]'); await click('Back to workspace'); expect(dialog.open).toBe(false); expect(button('Focus experiment').disabled).toBe(true);
    const summary = card().querySelector('summary'); await focus(summary); expect(document.activeElement).toBe(summary);
    deferUpdates = false; await act(async () => flushUpdates()); expect(model().offset).toBe(72); expect(dialog.open).toBe(false); expect(document.activeElement).toBe(summary); expect(button('Focus experiment').disabled).toBe(false);
  });
  it('guards same-event duplicate restores and locks navigation, capture, close, and drawing edits while pending', async () => {
    await mount(seed('cafeWall')); await begin(); await changeSetting('offset', 28); const before = structuredClone(latest); deferUpdates = true; const node = restore('selected');
    await act(async () => { node.click(); node.click(); adjust('scene').click(); }); expect(pendingUpdates).toHaveLength(1); expect(latest).toEqual(before);
    for (const element of [restore('selected'), restore('others'), adjust('controls'), adjust('scene'), capture(), setting(), query('[data-perception-end-inquiry]'), control('offset'), query('#perception-note')]) expect(element.disabled).toBe(true);
    await click(capture()); await click(query('[data-perception-end-inquiry]')); expect(pendingUpdates).toHaveLength(1);
    deferUpdates = false; await act(async () => flushUpdates()); expect(model().offset).toBe(72); expect(query('[data-perception-inquiry-comparison]')).toBeTruthy();
  });
  it('guards navigation and restoration during a pending replacement capture', async () => {
    await mount(seed('cafeWall')); await begin(); await changeSetting('offset', 28); deferUpdates = true; await click(capture());
    for (const element of [restore('selected'), restore('others'), adjust('controls'), adjust('scene')]) expect(element.disabled).toBe(true);
    await click(restore('selected')); await click(adjust('scene')); expect(pendingUpdates).toHaveLength(1); deferUpdates = false; await act(async () => flushUpdates()); expectStatus('unchanged', 0); expect(model().offset).toBe(28);
  });
  it('rejects same-event restore and navigation after a focused browse request starts', async () => {
    await mount(seed('cafeWall')); await click('Focus experiment'); await begin(); await changeSetting('offset', 28); deferUpdates = true;
    const picker = query('[data-perception-focus-picker]'), restoreButton = restore('selected'), navigation = adjust('scene');
    const before = structuredClone(latest), count = writes;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(picker, 'necker'); picker.dispatchEvent(new Event('change', { bubbles: true })); restoreButton.click(); navigation.click(); });
    expect(pendingUpdates).toHaveLength(1); expect(writes).toBe(count + 1); expect(latest).toEqual(before);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest.experiment).toBe('necker'); expect(latest.models.cafeWall.offset).toBe(28); expect(query('[data-perception-inquiry-comparison]')).toBeNull();
  });
  it('rejects same-event restore and navigation after a notebook import starts committing', async () => {
    const readers = []; vi.stubGlobal('FileReader', vi.fn(function () { this.result = null; this.readAsText = vi.fn(); this.abort = vi.fn(); readers.push(this); }));
    await mount(seed('cafeWall')); await begin(); await changeSetting('offset', 28); await click('Import notebook');
    const fileInput = query('[data-perception-import-file]'), incoming = engine.normalize({ studies: [{ id: 'incoming', experiment: 'moire', date: '2026-10-05T12:01:00.000Z', model: { prediction: 'Unsure' } }] }).studies;
    await act(async () => { Object.defineProperty(fileInput, 'files', { configurable: true, value: [new window.File(['{}'], 'notebook.json', { type: 'application/json' })] }); fileInput.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => { readers[0].result = JSON.stringify({ schema: 'alloflow.perception.notebook', version: 1, studies: incoming }); readers[0].onload(); });
    const commit = button('Add observations'), restoreButton = restore('selected'), navigation = adjust('scene'), count = writes; deferUpdates = true;
    await act(async () => { commit.click(); restoreButton.click(); navigation.click(); }); expect(pendingUpdates).toHaveLength(1); expect(writes).toBe(count + 1); expect(model().offset).toBe(28);
    deferUpdates = false; await act(async () => flushUpdates()); expect(model().offset).toBe(28); expect(latest.studies.map(item => item.id)).toEqual(['saved', 'incoming']);
  });
  it('rejects same-event restore and navigation after a saved matching study starts', async () => {
    const value = seed('cafeWall'); value.studies = engine.normalize({ studies: [{ id: 'saved-match', experiment: 'brightness', date: '2026-10-05T12:01:00.000Z', model: { matching: true, matchValue: 145, prediction: 'Unsure', note: 'Saved match' } }] }).studies;
    await mount(value); await begin(); await changeSetting('offset', 28); const study = button('Repeat these settings'), restoreButton = restore('selected'), navigation = adjust('scene'), count = writes; deferUpdates = true;
    await act(async () => { study.click(); restoreButton.click(); navigation.click(); }); expect(pendingUpdates).toHaveLength(1); expect(writes).toBe(count + 1); expect(model().offset).toBe(28);
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest.experiment).toBe('brightness'); expect(latest.models.cafeWall.offset).toBe(28); expect(card()).toBeNull();
  });
});
