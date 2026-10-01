import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const bank = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
let host, root, View;
const A = { id: 'resource-A', title: 'Lesson A', type: 'simplified', data: 'First lesson' };
const B = { id: 'resource-B', title: 'Lesson B', type: 'simplified', data: 'Second lesson' };
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.React = React; window.AlloModules = {};
  for (const icon of ['AlertCircle', 'ChevronDown', 'ChevronUp', 'Cloud', 'CloudOff', 'Download', 'Folder', 'FolderInput', 'FolderOpen', 'FolderPlus', 'GripVertical', 'History', 'Lock', 'Maximize', 'Minimize', 'Pencil', 'RefreshCw', 'Save', 'Search', 'Settings', 'Share2', 'Trash2', 'Upload', 'X']) window[icon] = () => React.createElement('svg', { 'aria-hidden': true });
  new Function('window', readFileSync(process.env.ALLO_HISTORY_CANDIDATE || 'view_history_panel_module.js', 'utf8'))(window);
  View = window.AlloModules.HistoryPanel.HistoryPanel;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { React.act(() => root.unmount()); host.remove(); });
function props(overrides = {}) {
  const history = overrides.history || [A, B];
  return { history, getFilteredHistory: () => history, getDefaultTitle: () => 'Untitled', getIconForType: () => () => null,
    sanitizeString: value => String(value || ''), t: key => key.split('.').reduce((value, part) => value?.[part], bank) || key,
    activeSidebarTab: 'history', activeStation: null, activeUnitId: null, units: [], editingId: null, movingItemId: null,
    newUnitName: '', isUnitModalOpen: false, isTeacherMode: true, isIndependentMode: false, isParentMode: false,
    isStorageDisabled: false, isCloudSyncEnabled: false, isHistoryMaximized: false, isSyncMode: false, pendingSync: false,
    projectFileInputRef: React.createRef(), handleRestoreView: vi.fn(), addToast: vi.fn(), ...overrides };
}
function render(p) { React.act(() => root.render(React.createElement(View, p))); }
function row(title) { return [...host.querySelectorAll('[data-history-resource-title]')].find(n => n.textContent === title)?.closest('button'); }
function click(node) { React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true }))); }

describe('History resource loading status', () => {
  it('marks only the selected pending row busy and announces loading', () => {
    render(props({ pendingHistoryResource: A }));
    expect(row('Lesson A')?.getAttribute('aria-busy')).toBe('true');
    expect(row('Lesson A').querySelector('[role="status"]')?.textContent).toBe(bank.common.loading);
    expect(row('Lesson B')?.hasAttribute('aria-busy')).toBe(false);
  });
  it('allows choosing another resource while avoiding duplicate clicks on the pending one', () => {
    const p = props({ pendingHistoryResource: A }); render(p);
    click(row('Lesson A')); expect(p.handleRestoreView).not.toHaveBeenCalled();
    click(row('Lesson B')); expect(p.handleRestoreView).toHaveBeenCalledOnce(); expect(p.handleRestoreView).toHaveBeenCalledWith(B);
  });
  it('distinguishes resources that have duplicate public ids', () => {
    const second = { ...B, id: A.id }; render(props({ history: [A, second], pendingHistoryResource: A }));
    expect(row('Lesson A')?.getAttribute('aria-busy')).toBe('true'); expect(row('Lesson B')?.hasAttribute('aria-busy')).toBe(false);
  });
  it('removes the pending status when the open finishes', () => {
    render(props({ pendingHistoryResource: A })); expect(row('Lesson A').querySelector('[role="status"]')).not.toBeNull();
    render(props({ pendingHistoryResource: null })); expect(row('Lesson A').querySelector('[role="status"]')).toBeNull();
    expect(row('Lesson A').hasAttribute('aria-busy')).toBe(false);
  });
  it('preserves the current-resource state and live-session restriction', () => {
    const p = props({ generatedContent: A, pendingHistoryResource: B }); render(p);
    expect(row('Lesson A').getAttribute('aria-current')).toBe('page'); click(row('Lesson A')); expect(p.handleRestoreView).not.toHaveBeenCalled();
    const live = props({ isTeacherMode: false, isSyncMode: true }); render(live); click(row('Lesson B'));
    expect(live.handleRestoreView).not.toHaveBeenCalled(); expect(live.addToast).toHaveBeenCalled();
  });
});
