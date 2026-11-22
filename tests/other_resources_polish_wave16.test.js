import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let FabStack;
let HistoryPanel;
let QuickStartWizard;
let AnnotationSuite;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function setFieldValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

async function runAxe(container) {
  const result = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({
    t: (key) => ({
      'common.next': 'Next',
      'common.back': 'Back',
      'common.finish': 'Finish',
      'common.add': 'Add',
      'common.remove': 'Remove',
      'wizard.adaptation': 'Customize output',
      'wizard.adaptation_desc': 'Choose output format and supports.',
      'wizard.output_format': 'Output format',
      'wizard.output_languages_label': 'Output languages',
      'wizard.interests_label_optional': 'Student interests (Optional)',
      'a11y.toggle_ruler': 'Reading ruler',
      'a11y.task_timer': 'Task timer',
      'toolbar.student_tools_open': 'Open student tools',
      'toolbar.student_tools_close': 'Close student tools',
      'sidebar.resource_pack_history': 'Resource pack',
      'history.more_actions': 'More',
      'history.more_actions_aria': 'More resource actions',
      'history.find_resources_aria': 'Find saved resources',
      'history.search_resources_placeholder': 'Search saved resources…',
      'history.search_resources_aria': 'Search saved resources',
      'history.clear_resource_search_aria': 'Clear search',
      'history.filter_by_type_aria': 'Filter by type',
      'history.all_types': 'All types',
      'history.clear_filters': 'Clear filters',
      'history.filtered_status': 'Showing matching items',
      'history.no_filter_matches': 'No saved resources match.',
      'history.resource_count': 'Saved resources',
      'history.resource_count_filtered': 'Filtered resources',
      'history.filter_all': 'All units',
      'history.uncategorized': 'Uncategorized',
      'common.filter_by_unit_aria': 'Filter by unit',
      'history.create_unit_tooltip': 'Create unit',
      'common.upload_file': 'Upload file',
      'status.syncing': 'Syncing',
    }[key] || key),
  });
  for (const icon of ['AlertCircle', 'ChevronDown', 'ChevronUp', 'Cloud', 'CloudOff', 'Download', 'Folder', 'FolderInput', 'FolderOpen', 'FolderPlus', 'GripVertical', 'History', 'Lock', 'Maximize', 'Minimize', 'Pencil', 'RefreshCw', 'Save', 'Search', 'Settings', 'Share2', 'Trash2', 'Upload', 'X']) {
    if (typeof window[icon] !== 'function' || icon === 'History') {
      Object.defineProperty(window, icon, { configurable: true, writable: true, value: () => null });
    }
  }

  delete window.AlloModules.FabStack;
  loadAlloModule('view_fab_stack_module.js');
  FabStack = window.AlloModules.FabStack.FabStack;

  delete window.AlloModules.HistoryPanel;
  loadAlloModule('view_history_panel_module.js');
  HistoryPanel = window.AlloModules.HistoryPanel.HistoryPanel;

  delete window.AlloModules.QuickStartWizard;
  loadAlloModule('quickstart_module.js');
  QuickStartWizard = window.AlloModules.QuickStartWizard;

  delete window.AlloModules.AnnotationSuite;
  loadAlloModule('annotation_suite_module.js');
  AnnotationSuite = window.AlloModules.AnnotationSuite;
});

afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
  localStorage.clear();
  sessionStorage.clear();
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('Other resources polish — Wave 16', () => {
  it('FabStack shows active-tool count on launcher, ON badges, one-tap Reset aids, and passes axe', async () => {
    const noop = () => {};
    function Harness() {
      const [ruler, setRuler] = React.useState(true);
      const [bionic, setBionic] = React.useState(true);
      return React.createElement(FabStack, {
        activeView: 'dashboard',
        addToast: noop,
        focusMode: bionic,
        generatedContent: null,
        handleSetIsSyntaxGameToTrue: noop,
        handleSetShowStudyTimerModalToTrue: noop,
        handleToggleFocusMode: () => setBionic((v) => !v),
        handleToggleIsFabExpanded: noop,
        handleToggleReadingRuler: () => setRuler((v) => !v),
        handleToggleShowSocraticChat: noop,
        handleToggleVisualSupports: noop,
        interactionMode: 'read',
        isCompareMode: false,
        isDictationMode: false,
        dictationStatus: null,
        isFabExpanded: true,
        isFluencyMode: false,
        isLineFocusMode: false,
        isStudyTimerRunning: false,
        isTeacherMode: false,
        readingRuler: ruler,
        runTour: false,
        setFocusedParagraphIndex: noop,
        setInteractionMode: noop,
        setIsCompareMode: noop,
        setIsDictationMode: noop,
        setIsFluencyMode: noop,
        setIsLineFocusMode: noop,
        setRevisionData: noop,
        setSelectionMenu: noop,
        showSocraticChat: false,
        showVisualSupports: false,
        stopPlayback: noop,
        studentProjectSettings: { allowSocraticTutor: false, allowDictation: false },
        studentAiFeaturesHidden: false,
        t: (k) => ({ 'a11y.toggle_ruler': 'Reading ruler', 'a11y.task_timer': 'Task timer', 'toolbar.student_tools_open': 'Open student tools', 'toolbar.student_tools_close': 'Close student tools' }[k] || k),
      });
    }

    const host = mountEl(React.createElement(Harness));
    expect(host.querySelector('[data-active-tools-count="2"]').textContent.trim()).toBe('2');
    const rulerBtn = host.querySelector('[data-help-key="fab_ruler"]');
    expect(rulerBtn.textContent).toContain('ON');
    const resetBtn = host.querySelector('[data-fab-reset-aids]');
    expect(resetBtn.textContent).toContain('Reset aids (2)');

    await runAxe(host);

    act(() => { resetBtn.click(); });
    expect(host.querySelector('[data-active-tools-count]')).toBeNull();
    expect(host.querySelector('[data-fab-reset-aids]')).toBeNull();
    expect(host.querySelector('[role="status"]').textContent).toContain('Focus aids turned off.');
  });

  it('HistoryPanel adds one-tap Minimize button, Escape exit & search clear, and passes axe', async () => {
    const noop = () => {};
    const items = [
      { id: 'item-1', type: 'quiz', title: 'Fraction Check', timestamp: Date.UTC(2026, 7, 13), meta: 'Grade 4' },
      { id: 'item-2', type: 'glossary', title: 'Habitat Terms', timestamp: Date.UTC(2026, 7, 12), meta: 'Grade 4' },
    ];
    const toggleMax = vi.fn();
    const host = mountEl(
      React.createElement(HistoryPanel, {
        activeSidebarTab: 'history', activeStation: null, activeUnitId: 'all', addToast: noop,
        cloudSyncStatus: 'idle', editTitle: '', editingId: null, generatedContent: items[0],
        getDefaultTitle: (type) => type, getFilteredHistory: () => items,
        getIconForType: () => React.createElement('span', { 'aria-hidden': 'true' }, 'R'),
        handleCancelEdit: noop, handleClearHistory: noop, handleCreateUnit: noop,
        handleDeleteHistoryItem: noop, handleDeleteUnit: noop, handleDragEnd: noop,
        handleDragEnter: noop, handleDragStart: noop, handleLoadProject: noop,
        handleMoveToUnit: noop, handleRestoreView: noop, handleSaveEdit: noop,
        handleSetIsProjectSettingsOpenToTrue: noop, handleSetIsUnitModalOpenToFalse: noop,
        handleSetIsUnitModalOpenToTrue: noop, handleSetMovingItemIdToNull: noop,
        handleStartEdit: noop, handleToggleIsHistoryMaximized: toggleMax, history: items,
        initiateSaveStudentProject: noop, initiateSaveTeacherProject: noop,
        isCloudSyncEnabled: false, isHistoryMaximized: true, isIndependentMode: false,
        isParentMode: false, isSaveActionPulsing: false, isStorageDisabled: false,
        isSyncMode: false, isTeacherMode: true, isUnitModalOpen: false,
        lastSaved: new Date(Date.UTC(2026, 7, 13, 12)), moveItem: noop, movingItemId: null,
        newUnitName: '', pendingSync: false, projectFileInputRef: { current: null },
        sanitizeString: (v) => String(v), setActiveStation: noop, setActiveUnitId: noop,
        setEditTitle: noop, setIsCommunityCatalogOpen: noop, setMovingItemId: noop,
        setNewUnitName: noop, setSelHubTab: noop, setShowSelHub: noop, setShowStemLab: noop,
        setStemLabTab: noop, t: (k) => k, units: [], onVisualizeUnit: noop,
      })
    );

    const exitMaxBtn = host.querySelector('[data-history-exit-maximize]');
    expect(exitMaxBtn).toBeTruthy();

    const searchInput = host.querySelector('input[type="search"]');
    setFieldValue(searchInput, 'Fraction');
    expect(searchInput.value).toBe('Fraction');

    // Escape inside search clears query without closing maximized mode
    act(() => { searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(searchInput.value).toBe('');
    expect(toggleMax).not.toHaveBeenCalled();

    // Second Escape with empty search exits maximized mode
    act(() => { host.querySelector('#tour-history-panel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(toggleMax).toHaveBeenCalledTimes(1);

    await runAxe(host);
  });

  it('QuickStartWizard shows paste read-time & Clear text, Step 4 setup summary + capacity counters, and passes axe', async () => {
    const host = mountEl(
      React.createElement(QuickStartWizard, {
        isOpen: true,
        onClose: vi.fn(),
        onComplete: vi.fn(),
        onUpload: vi.fn(),
        onLookupStandards: null,
        onCallGemini: () => Promise.resolve(''),
        onWebSearch: null,
        addToast: vi.fn(),
        isParentMode: false,
        isIndependentMode: false,
        isHelpMode: false,
        setIsHelpMode: vi.fn(),
        initialSourceMode: 'paste',
      })
    );

    const textarea = host.querySelector('#wizard-paste-text');
    expect(textarea).toBeTruthy();
    setFieldValue(textarea, 'Watersheds carry rain from hills into streams and rivers across the valley.');
    expect(host.querySelector('#wizard-paste-count').textContent).toBe('12 words');
    expect(host.querySelector('[data-wizard-paste-readtime]').textContent).toContain('~1 min read');

    const clearBtn = host.querySelector('[data-wizard-paste-clear]');
    expect(clearBtn).toBeTruthy();
    act(() => { clearBtn.click(); });
    expect(textarea.value).toBe('');

    setFieldValue(textarea, 'Rainwater nourishes soil and roots before reaching rivers.');
    act(() => { host.querySelector('[data-help-key="wizard_paste_next"]').click(); });

    const summary = host.querySelector('[data-wizard-summary]');
    expect(summary).toBeTruthy();
    expect(summary.textContent).toContain('8 words pasted');
    expect(host.querySelector('[data-wizard-lang-count]').textContent).toBe('0/4');
    expect(host.querySelector('[data-wizard-interest-count]').textContent).toBe('0/5');

    await runAxe(host);
  });

  it('AnnotationSuite NoteBubble + Sidebar add IME-safe save/search/kind filters, Escape handling, and pass axe', async () => {
    const onChange = vi.fn();
    const noteHost = mountEl(
      React.createElement(AnnotationSuite.NoteBubble, {
        a: { id: 'n1', kind: 'note', author: 'teacher', color: 'yellow', x: 40, y: 40, content: '' },
        onChange,
        onDelete: vi.fn(),
      })
    );
    const noteTa = noteHost.querySelector('textarea');
    setFieldValue(noteTa, 'Great textual evidence!');
    expect(noteHost.querySelector('[data-allo-note-footer]').textContent).toContain('23 chars');
    act(() => {
      noteTa.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(onChange).toHaveBeenCalledWith('n1', { content: 'Great textual evidence!' });

    const onClose = vi.fn();
    const items = [
      { id: 'a1', kind: 'note', author: 'teacher', content: 'Check thesis clarity', createdAt: '2026-10-01T10:00:00Z' },
      { id: 'a2', kind: 'highlight', author: 'student', text: 'photosynthesis produces glucose', createdAt: '2026-10-02T10:00:00Z' },
      { id: 'a3', kind: 'sticker', type: 'star', author: 'teacher', createdAt: '2026-10-03T10:00:00Z' },
      { id: 'a4', kind: 'note', author: 'student', content: 'Need help on paragraph two', createdAt: '2026-10-04T10:00:00Z' },
    ];
    const sideHost = mountEl(
      React.createElement(AnnotationSuite.Sidebar, {
        annotations: items,
        isTeacher: true,
        onFocus: vi.fn(),
        onDelete: vi.fn(),
        onClose,
      })
    );

    const kindGroup = sideHost.querySelector('[data-anno-kind-filters="true"]');
    expect(kindGroup).toBeTruthy();
    act(() => { sideHost.querySelector('[data-anno-kind-filter="note"]').click(); });
    expect(sideHost.querySelectorAll('[role="listitem"]')).toHaveLength(2);

    const searchInput = sideHost.querySelector('[data-anno-sidebar-search="true"]');
    setFieldValue(searchInput, 'nomatchxyz');
    expect(sideHost.querySelector('[data-anno-sidebar-reset="true"]')).toBeTruthy();

    await runAxe(sideHost);

    // First Escape clears search without closing sidebar
    act(() => { searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(searchInput.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();

    // Second Escape closes sidebar
    act(() => { sideHost.querySelector('[role="region"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
