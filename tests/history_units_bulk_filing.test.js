import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

// Resources stamped with a unit that is not in the units list ('all' and
// 'uncategorized' views, or a deleted unit) showed in All Resources but in no
// folder and not in Uncategorized. These tests run the real host handlers, the
// real dispatcher stamping code and the built History panel.
const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
const dispatcher = readFileSync('generate_dispatcher_source.jsx', 'utf8');

const UNITS = [{ id: 'u1', name: 'Plants' }, { id: 'u2', name: 'Weather' }];
const HISTORY = () => [
  { id: 'a', type: 'quiz', title: 'Unfiled quiz' },
  { id: 'b', type: 'glossary', title: 'Stamped all', unitId: 'all' },
  { id: 'c', type: 'outline', title: 'Stamped uncategorized', unitId: 'uncategorized' },
  { id: 'd', type: 'faq', title: 'Deleted unit', unitId: 'gone' },
  { id: 'e', type: 'image', title: 'Filed', unitId: 'u1' },
];

// The host handlers, lifted from AlloFlowANTI.txt with React state replaced by plain variables.
function makeHost({ history = HISTORY(), units = UNITS.slice(), activeUnitId = 'uncategorized', newUnitName = '' } = {}) {
  const state = { history, units, activeUnitId, toasts: [] };
  const known = sliceBetween(anti, '  const _isKnownUnitId = ', '  const handleMoveAllToUnit = ', { file: 'AlloFlowANTI.txt' });
  const moveAll = sliceBetween(anti, '  const handleMoveAllToUnit = ', '  const _getFreshTextComplexityEvidence = ', { file: 'AlloFlowANTI.txt' });
  const unitCrud = sliceBetween(anti, '  const handleCreateUnit = (options) => {', '  const handleApplyRosterGroup = ', { file: 'AlloFlowANTI.txt' });
  const filter = sliceBetween(anti, '  const getFilteredHistory = () => {', '  const sanitizeString = ', { file: 'AlloFlowANTI.txt' });
  const body = 'return function (s) { let { history, units, activeUnitId, newUnitName } = s;\n'
    + 'const isTeacherMode = true;\n'
    + 'const setHistory = fn => { s.history = history = fn(history); };\n'
    + 'const setUnits = fn => { s.units = units = fn(units); };\n'
    + 'const setActiveUnitId = id => { s.activeUnitId = id; };\n'
    + 'const setNewUnitName = () => {}; const setIsUnitModalOpen = () => {}; const setMovingItemId = () => {};\n'
    + 'const setConfirmDialog = dialog => dialog.onConfirm();\n'
    + 'const addToast = (message) => s.toasts.push(message);\n'
    + 'const t = (key, values) => key + (values ? JSON.stringify(values) : "");\n'
    + 'const _alloArtifactMatchesInstanceId = (item, id) => !!item && item.id === id;\n'
    + known + moveAll + unitCrud + filter
    + 'return { getFilteredHistory, handleMoveAllToUnit, handleCreateUnit, handleDeleteUnit, refresh: () => { history = s.history; units = s.units; activeUnitId = s.activeUnitId; } }; }';
  const host = new Function(body)()(Object.assign(state, { newUnitName }));
  return { state, host };
}
const ids = items => items.map(item => item.id);

describe('host: Uncategorized and unit filing', () => {
  it('shows resources with no real unit under Uncategorized', () => {
    const { host } = makeHost();
    expect(ids(host.getFilteredHistory())).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moves every listed resource to a unit at once and reports the count', () => {
    const { state, host } = makeHost();
    expect(host.handleMoveAllToUnit(['a', 'b', 'c', 'd'], 'u2')).toBe(4);
    expect(state.history.map(item => item.unitId)).toEqual(['u2', 'u2', 'u2', 'u2', 'u1']);
    expect(state.toasts.at(-1)).toContain('history.moved_all');
    expect(state.toasts.at(-1)).toContain('"count":4');
    host.refresh();
    expect(host.getFilteredHistory()).toEqual([]);
  });

  it('refuses an unknown target and counts only resources that matched', () => {
    const { state, host } = makeHost();
    expect(host.handleMoveAllToUnit(['a'], 'not-a-unit')).toBe(0);
    expect(host.handleMoveAllToUnit(['missing'], 'u1')).toBe(0);
    expect(state.history[0].unitId).toBeUndefined();
    expect(host.handleMoveAllToUnit(['a', 'missing'], 'u1')).toBe(1);
    expect(state.toasts.at(-1)).toContain('history.moved_one');
  });

  it('files every uncategorized resource into a new unit only when asked', () => {
    const asked = makeHost({ newUnitName: 'Forces' });
    asked.host.handleCreateUnit({ moveUncategorized: true });
    const created = asked.state.units.at(-1);
    expect(created.name).toBe('Forces');
    expect(asked.state.history.map(item => item.unitId)).toEqual([created.id, created.id, created.id, created.id, 'u1']);
    expect(asked.state.toasts.at(-1)).toContain('history.unit_created_moved');

    const notAsked = makeHost({ newUnitName: 'Forces' });
    notAsked.host.handleCreateUnit({ type: 'click' });
    expect(notAsked.state.history.map(item => item.unitId)).toEqual([undefined, 'all', 'uncategorized', 'gone', 'u1']);
    expect(notAsked.state.toasts.at(-1)).toContain('process.unit_created');
  });

  it('returns a deleted unit\'s resources to Uncategorized, as the confirm message says', () => {
    const { state, host } = makeHost({ activeUnitId: 'u1' });
    host.handleDeleteUnit();
    expect(state.units.map(unit => unit.id)).toEqual(['u2']);
    expect(state.history.find(item => item.id === 'e').unitId).toBeNull();
    expect(state.activeUnitId).toBe('all');
  });
});

describe('dispatcher: a new resource is saved with a real unit only', () => {
  const realUnitId = new Function(sliceBetween(dispatcher, 'function _realUnitId(value) {', 'function resolveGenerationSource(',
    { file: 'generate_dispatcher_source.jsx' }) + '\nreturn _realUnitId;')();
  // From building _sourceUse to the source-related history filter, run as written.
  const sourceUse = sliceBetween(dispatcher, '    const _sourceUse = {', '    let textToProcess = ', { file: 'generate_dispatcher_source.jsx' });
  const run = (activeUnitId, selectedUnitId, history = HISTORY()) => new Function('_realUnitId', 'state',
    'let { activeUnitId, _selectedSource, configOverride, generationHistory } = state;\n'
    + 'const _inputArtifactId = null, _chosenPrimaryArtifactId = null, _primarySourceArtifactId = null, _sourceSnapshot = null, textFormat = "";\n'
    + 'const _instructionalContextModule = null;\n'
    + sourceUse + '\nreturn { _itemUnitId, related: sourceRelatedHistory.map(item => item.id), scope: _sourceUse.unitId };')(realUnitId, {
    activeUnitId, _selectedSource: { unitId: selectedUnitId, text: 'Source.' }, configOverride: {},
    generationHistory: history.map(item => Object.assign({ data: { originalText: 'Source.' } }, item, { type: 'analysis' })),
  });

  it('never stamps a History view name as the unit', () => {
    expect(run('all', null)._itemUnitId).toBeNull();
    expect(run('uncategorized', null)._itemUnitId).toBeNull();
    expect(run('all', 'u2')._itemUnitId).toBe('u2');
    expect(run('u1', null)._itemUnitId).toBe('u1');
  });

  it('keeps the lookup scope, and treats legacy view stamps as Uncategorized', () => {
    expect(run('all', null).scope).toBe('all');
    expect(run('all', null).related).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(run('uncategorized', null).related).toEqual(['a', 'b', 'c']);
    expect(run('u1', null).related).toEqual(['e']);
  });

  it('writes the real unit onto the saved item and its config', () => {
    const save = sliceBetween(dispatcher, "      if (type === 'lesson-plan' && planningGenerationInputs)", '      throwIfGenerationAborted();',
      { file: 'generate_dispatcher_source.jsx' });
    expect(save).toContain('newItem.unitId = _itemUnitId;');
    const builder = sliceBetween(dispatcher, '    const _buildItemConfig = (extra) => Object.assign({', 'sourceSnapshot: _sourceSnapshot,',
      { file: 'generate_dispatcher_source.jsx' });
    expect(builder).toContain('unitId: _itemUnitId,');
  });
});

describe('History panel: bulk filing controls', () => {
  let root = null, container = null;
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (container) container.remove();
    root = container = null;
  });
  function renderPanel(overrides = {}) {
    window.React = React; window.History = () => null; window.AlloModules = {};
    if (!window.requestAnimationFrame) window.requestAnimationFrame = cb => setTimeout(cb, 0);
    Function(readFileSync('view_history_panel_module.js', 'utf8'))();
    const Panel = window.AlloModules.HistoryPanel.HistoryPanel;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div'); document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
    const history = overrides.history || HISTORY();
    const units = overrides.units || UNITS;
    const unfiled = history.filter(item => !units.some(unit => unit.id === item.unitId));
    const props = Object.assign({
      history, units, activeUnitId: 'uncategorized', activeSidebarTab: 'history', isTeacherMode: true,
      editingId: null, movingItemId: null, projectFileInputRef: { current: null },
      getFilteredHistory: () => unfiled, getDefaultTitle: type => type, getIconForType: () => null,
      sanitizeString: value => value, t: key => key, setNewUnitName: () => {}, newUnitName: 'Forces',
      handleMoveAllToUnit: vi.fn(list => list.length), handleCreateUnit: vi.fn(),
    }, overrides);
    act(() => root.render(React.createElement(Panel, props)));
    return props;
  }
  const bar = () => container.querySelector('[data-history-move-all]');
  const choose = (select, value) => act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  it('moves every shown Uncategorized resource to the chosen unit', () => {
    const props = renderPanel();
    expect(bar().textContent).toContain('Move all 4 to');
    const submit = bar().querySelector('[data-history-move-all-submit]');
    expect(submit.disabled).toBe(true);
    choose(bar().querySelector('select'), 'u2');
    expect(submit.disabled).toBe(false);
    act(() => submit.click());
    expect(props.handleMoveAllToUnit).toHaveBeenCalledWith(['a', 'b', 'c', 'd'], 'u2');
  });

  it('asks for a unit first when none exist, and hides on other views and older hosts', () => {
    renderPanel({ units: [] });
    expect(bar().querySelector('select')).toBeNull();
    expect(bar().textContent).toContain('Create a unit folder first');
    act(() => root.unmount()); container.remove(); root = null;
    renderPanel({ activeUnitId: 'all', getFilteredHistory: () => HISTORY() });
    expect(bar()).toBeNull();
    act(() => root.unmount()); container.remove(); root = null;
    renderPanel({ handleMoveAllToUnit: undefined });
    expect(bar()).toBeNull();
  });

  it('offers to file the uncategorized resources into a new unit, off by default', () => {
    const props = renderPanel({ isUnitModalOpen: true });
    const box = container.querySelector('[data-history-move-unfiled]');
    expect(box.checked).toBe(false);
    expect(box.closest('label').textContent).toContain('Also move the 4 uncategorized resources into this unit');
    const save = container.querySelector('[data-help-key="history_save_unit_btn"]');
    act(() => save.click());
    expect(props.handleCreateUnit).toHaveBeenLastCalledWith(undefined);
    act(() => box.click());
    act(() => save.click());
    expect(props.handleCreateUnit).toHaveBeenLastCalledWith({ moveUncategorized: true });
  });

  it('keeps the new-unit checkbox away from an older host that would ignore it', () => {
    renderPanel({ isUnitModalOpen: true, handleMoveAllToUnit: undefined });
    expect(container.querySelector('[data-history-move-unfiled]')).toBeNull();
  });
});
