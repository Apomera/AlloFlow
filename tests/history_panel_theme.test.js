import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const noop = () => {};

let React;
let ReactDOMClient;
let act;
let HistoryPanel;
let ThemeContext;
let container;
let root;

const history = [
  { id: 'quiz-1', type: 'quiz', title: 'Check for understanding', timestamp: Date.UTC(2026, 7, 13), meta: 'Five questions' },
  { id: 'glossary-1', type: 'glossary', title: 'Key vocabulary', timestamp: Date.UTC(2026, 7, 12), unitId: 'unit-1' },
];

function makeProps() {
  return {
    activeSidebarTab: 'history', activeStation: null, activeUnitId: 'all', addToast: noop,
    cloudSyncStatus: 'idle', editTitle: '', editingId: null, generatedContent: history[0],
    getDefaultTitle: (type) => type, getFilteredHistory: () => history,
    getIconForType: () => React.createElement('span', { 'aria-hidden': 'true' }, 'R'),
    handleCancelEdit: noop, handleClearHistory: noop, handleCreateUnit: noop,
    handleDeleteHistoryItem: noop, handleDeleteUnit: noop, handleDragEnd: noop,
    handleDragEnter: noop, handleDragStart: noop, handleLoadProject: noop,
    handleMoveToUnit: noop, handleRestoreView: noop, handleSaveEdit: noop,
    handleSetIsProjectSettingsOpenToTrue: noop, handleSetIsUnitModalOpenToFalse: noop,
    handleSetIsUnitModalOpenToTrue: noop, handleSetMovingItemIdToNull: noop,
    handleStartEdit: noop, handleToggleIsHistoryMaximized: noop, history,
    initiateSaveStudentProject: noop, initiateSaveTeacherProject: noop,
    isCloudSyncEnabled: false, isHistoryMaximized: false, isIndependentMode: false,
    isParentMode: false, isSaveActionPulsing: false, isStorageDisabled: false,
    isSyncMode: false, isTeacherMode: true, isUnitModalOpen: false,
    lastSaved: new Date(Date.UTC(2026, 7, 13, 12)), moveItem: noop, movingItemId: null,
    newUnitName: '', pendingSync: false, projectFileInputRef: { current: null },
    sanitizeString: (value) => String(value), setActiveStation: noop, setActiveUnitId: noop,
    setEditTitle: noop, setIsCommunityCatalogOpen: noop, setMovingItemId: noop,
    setNewUnitName: noop, setSelHubTab: noop, setShowSelHub: noop, setShowStemLab: noop,
    setStemLabTab: noop, t: (key) => key, units: [{ id: 'unit-1', name: 'Unit One' }],
    onVisualizeUnit: noop, activeSelStation: null, setActiveSelStation: noop,
  };
}

function App({ theme }) {
  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, colorOverlay: 'none' } },
    React.createElement(HistoryPanel, makeProps()),
  );
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  ThemeContext = React.createContext({ theme: 'light', colorOverlay: 'none' });
  window.AlloThemeContext = ThemeContext;
  for (const icon of ['AlertCircle', 'ChevronDown', 'ChevronUp', 'Cloud', 'CloudOff', 'Download', 'Folder', 'FolderInput', 'FolderOpen', 'FolderPlus', 'GripVertical', 'History', 'Lock', 'Maximize', 'Minimize', 'Pencil', 'RefreshCw', 'Save', 'Search', 'Settings', 'Share2', 'Trash2', 'Upload', 'X']) {
    Object.defineProperty(window, icon, { configurable: true, writable: true, value: () => null });
  }
  loadAlloModule('view_history_panel_module.js');
  HistoryPanel = window.AlloModules.HistoryPanel.HistoryPanel;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  localStorage.setItem('alloflow_stem_stations', '[]');
  localStorage.setItem('alloflow_sel_stations', '[]');
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('HistoryPanel Resource Pack theme contract', () => {
  it('reacts to light, dark, and contrast context changes without resetting its open menu', async () => {
    await act(async () => root.render(React.createElement(App, { theme: 'light' })));
    const panel = container.querySelector('#tour-history-panel');
    expect(panel?.getAttribute('data-history-theme')).toBe('light');
    expect(panel?.querySelector('[aria-current="page"]')).toBeTruthy();

    const more = panel.querySelector('[aria-controls="history-more-actions-menu"]');
    await act(async () => more.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
    expect(panel.querySelector('#history-more-actions-menu')).toBeTruthy();

    await act(async () => root.render(React.createElement(App, { theme: 'dark' })));
    expect(panel.getAttribute('data-history-theme')).toBe('dark');
    expect(panel.querySelector('#history-more-actions-menu')).toBeTruthy();

    await act(async () => root.render(React.createElement(App, { theme: 'contrast' })));
    expect(panel.getAttribute('data-history-theme')).toBe('contrast');
    expect(panel.querySelector('#history-more-actions-menu')).toBeTruthy();
  });

  it('defines semantic surfaces and status tones for all three themes', () => {
    const source = read('view_history_panel_source.jsx');
    expect(source).toContain('window.AlloThemeContext || HistoryThemeFallbackContext');
    expect(source).toContain("historyThemeContext.theme === 'dark'");
    expect(source).toContain("historyThemeContext.theme === 'contrast'");
    for (const token of ['--rp-surface:', '--rp-subtle:', '--rp-text-strong:', '--rp-muted:', '--rp-accent:', '--rp-success:', '--rp-warning:', '--rp-danger:', '--rp-focus:']) {
      expect(source).toContain(token);
    }
    expect(source).toContain('--rp-shell-start: #ffffff;');
    expect(source).toContain('--rp-shell-start: #172033;');
    expect(source).toContain('--rp-shell-start: #000000;');
  });

  it('scopes current, menu, focus, overlay, and forced-color treatment to Resource Pack', () => {
    const source = read('view_history_panel_source.jsx');
    expect(source).toContain('data-history-theme={historyTheme}');
    expect(source).toContain('button[aria-expanded="true"]:not(.rp-dismiss-layer)');
    expect(source).toContain('className="rp-dismiss-layer fixed inset-0');
    expect(source.match(/rp-menu-surface/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('[aria-current="page"] { border-left: 4px solid Highlight');
    expect(source).toContain('outline: 3px solid var(--rp-focus) !important;');
    expect(source).not.toContain('colorOverlay ===');
  });

  it('keeps generated root and public modules byte-identical', () => {
    expect(read('view_history_panel_module.js')).toBe(read('desktop/web-app/public/view_history_panel_module.js'));
  });
});
