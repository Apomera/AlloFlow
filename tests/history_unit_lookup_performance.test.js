import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('view_history_panel_source.jsx', 'utf8');
const field = source.slice(source.indexOf('  const getSafeArtifactField ='), source.indexOf('  const getSafeArraySnapshot ='));
const display = source.slice(source.indexOf('// HISTORY_DISPLAY_FORMAT_START'), source.indexOf('// HISTORY_DISPLAY_FORMAT_END'));
const lookup = source.slice(source.indexOf('// HISTORY_UNIT_LOOKUP_START'), source.indexOf('// HISTORY_UNIT_LOOKUP_END'));
const makeLookup = units => Function('units', field + display + lookup + '\nreturn getHistoryRowUnit;')(units);

describe('history unit lookup', () => {
  it('stops at the first match and reads each unit ID at most once across rows and misses', () => {
    const reads = vi.fn();
    const units = Array.from({ length: 400 }, (_, i) => ({ get id() { reads(i); return 'unit-' + i; }, name: 'Unit ' + i }));
    const get = makeLookup(units);
    expect(get('unit-0')).toBe(units[0]); expect(reads).toHaveBeenCalledTimes(1);
    for (let i = 399; i >= 0; i--) expect(get('unit-' + i)).toBe(units[i]);
    for (let i = 0; i < 100; i++) expect(get('missing-' + i)).toBeUndefined();
    expect(reads).toHaveBeenCalledTimes(400);
  });
  it('keeps the first duplicate after normalization, including after scanning past it', () => {
    const units = [{ id: ' a\n', name: 'First' }, { id: 'a', name: 'Second' }, { id: 42, name: 'Numeric' }, { id: 'tail' }];
    const get = makeLookup(units);
    expect(get('tail')).toBe(units[3]); expect(get('a')).toBe(units[0]); expect(get('42')).toBe(units[2]);
    const long = 'x'.repeat(160), longUnits = [{ id: long + 'first' }, { id: long + 'second' }];
    expect(makeLookup(longUnits)(long)).toBe(longUnits[0]);
  });
  it('skips missing, sparse, malformed and throwing IDs while preserving later matches', () => {
    const units = [null, undefined, {}, { get id() { throw Error('invalid'); } }, , { id: 'ok' }];
    expect(makeLookup(units)('ok')).toBe(units[5]);
    expect(makeLookup(null)('ok')).toBeNull(); expect(makeLookup({})('ok')).toBeNull();
  });
  it('does no scan for unassigned rows and refreshes ID edits and order in the next render', () => {
    const id = vi.fn(() => 'a'); const units = [{ get id() { return id(); } }, { id: 'b' }];
    expect(makeLookup(units)('')).toBeNull(); expect(id).not.toHaveBeenCalled();
    expect(makeLookup(units)('a')).toBe(units[0]);
    id.mockReturnValue('b'); units.reverse();
    expect(makeLookup(units)('b')).toBe(units[0]); expect(makeLookup(units)('a')).toBeUndefined();
  });
});

describe('generated history panel unit badges', () => {
  it('preserves badge labels and reflects unit rename, reassignment, duplicate reorder and removal', () => {
    window.React = React; window.History = () => null; window.AlloModules = {};
    Function(readFileSync('view_history_panel_module.js', 'utf8'))();
    const Panel = window.AlloModules.HistoryPanel.HistoryPanel;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const units = [{ id: 'a', name: 'First unit' }, { id: 'a', name: 'Duplicate unit' }, { id: 'b', name: 'Other unit' }];
    const history = [{ id: 'one', type: 'quiz', title: 'First resource', unitId: 'a' }, { id: 'two', type: 'quiz', title: 'Second resource', unitId: 'b' }, { id: 'three', type: 'quiz', title: 'Unassigned', unitId: 'missing' }];
    const props = { history, units, activeUnitId: 'all', activeSidebarTab: 'history', isTeacherMode: true, editingId: null, movingItemId: null,
      projectFileInputRef: { current: null }, getFilteredHistory: () => history, getDefaultTitle: type => type, getIconForType: () => null, sanitizeString: value => value, t: key => key };
    const render = () => act(() => root.render(React.createElement(Panel, { ...props })));
    const rows = () => [...host.querySelectorAll('[role="listitem"]')].map(row => row.textContent);
    try {
      render(); expect(rows()).toHaveLength(3); expect(rows()[0]).toContain('First unit'); expect(rows()[0]).not.toContain('Duplicate unit'); expect(rows()[1]).toContain('Other unit');
      units[0].name = 'Renamed unit'; render(); expect(rows()[0]).toContain('Renamed unit');
      history[0].unitId = 'b'; render(); expect(rows()[0]).toContain('Other unit');
      history[0].unitId = 'a'; units.reverse(); render(); expect(rows()[0]).toContain('Duplicate unit');
      units.splice(0); render(); expect(rows().join(' ')).not.toMatch(/Renamed unit|Duplicate unit|Other unit/);
    } finally { act(() => root.unmount()); host.remove(); }
  });
});
