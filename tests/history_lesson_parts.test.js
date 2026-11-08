// Lesson parts in the resource history: a muted stripe plus a labelled chip per resource,
// a per-browser on/off switch, and a teacher choice that also steers the lesson plan.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const bank = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const historySource = readFileSync(process.env.ALLO_HISTORY_CANDIDATE || 'view_history_panel_module.js', 'utf8');
let host, root, View;

const Q = { id: 'quiz-1', title: 'Imagery quiz', type: 'quiz', data: {} };
const G = { id: 'glossary-1', title: 'Battle words', type: 'glossary', data: [] };
const U = { id: 'odd-1', title: 'Research pipeline', type: 'pipeline', data: {} };
const C = { id: 'quiz-2', title: 'Warm-up quiz', type: 'quiz', lessonPhase: 'hook', data: {} };
const N = { id: 'glossary-2', title: 'Extra words', type: 'glossary', lessonPhase: 'none', data: [] };

function loadUtils() {
  new Function('window', readFileSync(process.env.ALLO_UTILS_CANDIDATE || 'utils_pure_module.js', 'utf8'))(window);
  return window.AlloModules.UtilsPure;
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.React = React; window.AlloModules = {};
  try { window.localStorage.removeItem('alloflow_history_phase_colors'); } catch (_) {}
  for (const icon of ['AlertCircle', 'ChevronDown', 'ChevronUp', 'Cloud', 'CloudOff', 'Download', 'Folder', 'FolderInput', 'FolderOpen', 'FolderPlus', 'GripVertical', 'History', 'Lock', 'Maximize', 'Minimize', 'Pencil', 'RefreshCw', 'Save', 'Search', 'Settings', 'Share2', 'Trash2', 'Upload', 'X']) window[icon] = () => React.createElement('svg', { 'aria-hidden': true });
  loadUtils();
  new Function('window', historySource)(window);
  View = window.AlloModules.HistoryPanel.HistoryPanel;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { React.act(() => root.unmount()); host.remove(); });

function props(overrides = {}) {
  const history = overrides.history || [Q, G, U, C, N];
  return { history, getFilteredHistory: () => history, getDefaultTitle: () => 'Untitled', getIconForType: () => () => null,
    sanitizeString: value => String(value || ''), t: key => key.split('.').reduce((value, part) => value?.[part], bank) || key,
    activeSidebarTab: 'history', activeStation: null, activeUnitId: null, units: [], editingId: null, movingItemId: null,
    newUnitName: '', isUnitModalOpen: false, isTeacherMode: true, isIndependentMode: false, isParentMode: false,
    isStorageDisabled: false, isCloudSyncEnabled: false, isHistoryMaximized: false, isSyncMode: false, pendingSync: false,
    projectFileInputRef: React.createRef(), handleRestoreView: vi.fn(), addToast: vi.fn(), handleMoveToUnit: vi.fn(),
    setMovingItemId: vi.fn(), handleSetMovingItemIdToNull: vi.fn(), onSetLessonPhase: vi.fn(), ...overrides };
}
const render = p => React.act(() => root.render(React.createElement(View, p)));
const rowOf = title => [...host.querySelectorAll('[data-history-resource-title]')].find(n => n.textContent.trim() === title)?.closest('[role="listitem"]');
const chipOf = title => rowOf(title)?.querySelector('[data-history-lesson-part]');
const label = phase => bank.lesson_headers.teacher[phase];
const toggle = () => host.querySelector('[data-history-lesson-part-colors]');
const openActions = title => {
  const button = [...host.querySelectorAll('button[id^="history-actions-trigger-"]')].find(b => b.getAttribute('aria-label').endsWith(': ' + title));
  React.act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  return rowOf(title).querySelector('[data-history-lesson-part-select]');
};
const choose = (select, value) => React.act(() => {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true }));
});

describe('which lesson part a resource belongs to', () => {
  it('follows the resource type, lets a teacher choice win, and treats "none" as no part', () => {
    const { lessonPhaseFor } = window.AlloModules.UtilsPure;
    expect(lessonPhaseFor(Q)).toEqual({ phase: 'closure', automatic: 'closure', chosen: null });
    expect(lessonPhaseFor(C)).toEqual({ phase: 'hook', automatic: 'closure', chosen: 'hook' });
    expect(lessonPhaseFor(N)).toEqual({ phase: null, automatic: 'directInstruction', chosen: 'none' });
    expect(lessonPhaseFor(U)).toEqual({ phase: null, automatic: null, chosen: null });
    expect(lessonPhaseFor({ type: 'quiz', lessonPhase: 'lunch' }).phase).toBe('closure');
    expect(lessonPhaseFor(null).phase).toBeNull();
  });

  it('keeps the lesson plan fallback table identical to the shared one', () => {
    const view = readFileSync('view_lesson_plan_source.jsx', 'utf8');
    const start = view.indexOf('const _LESSON_PLAN_PHASE_TYPES = '), end = view.indexOf('};', start) + 2;
    const local = new Function(view.slice(start, end) + ' return _LESSON_PLAN_PHASE_TYPES;')();
    expect(local).toEqual(window.AlloModules.UtilsPure.LESSON_PHASE_TYPES);
    expect(Object.keys(local)).toEqual(window.AlloModules.UtilsPure.LESSON_PHASES);
  });

  it('slots a resource into the lesson plan by the teacher’s choice', () => {
    new Function('window', readFileSync('view_lesson_plan_module.js', 'utf8'))(window);
    const plan = { id: 'plan', type: 'lesson-plan', config: { generationInputs: { version: 1, mode: 'teacher', summaries: [], inventory: [], inventoryStatus: 'recorded' } }, data: {} };
    const rows = window.AlloModules.LessonPlanView.addedResources(plan, [plan, Q, C, N]);
    expect(rows.map(row => [row.id, row.phase])).toEqual([['quiz-1', 'closure'], ['quiz-2', 'hook'], ['glossary-2', 'other']]);
  });
});

describe('lesson part colours in the history', () => {
  it('gives each placed resource a stripe and a named chip, and leaves the rest plain', () => {
    render(props());
    expect(rowOf('Imagery quiz').dataset.lessonPhase).toBe('closure');
    expect(rowOf('Imagery quiz').classList.contains('rp-phase-row')).toBe(true);
    expect(rowOf('Imagery quiz').classList.contains('border-l-transparent')).toBe(false);
    expect(chipOf('Imagery quiz').textContent.trim()).toBe(label('closure'));
    expect(chipOf('Battle words').textContent.trim()).toBe(label('directInstruction'));
    expect(chipOf('Warm-up quiz').textContent.trim()).toBe(label('hook'));
    for (const title of ['Research pipeline', 'Extra words']) {
      expect(chipOf(title)).toBeFalsy();
      expect(rowOf(title).classList.contains('border-l-transparent')).toBe(true);
      expect(rowOf(title).hasAttribute('data-lesson-phase')).toBe(false);
    }
    const open = rowOf('Imagery quiz').querySelector('button[aria-label]');
    expect(open.getAttribute('aria-label')).toContain(bank.history.lesson_part + ': ' + label('closure'));
  });

  it('keeps the selected-resource marker on the current resource but still names its part', () => {
    render(props({ generatedContent: Q }));
    expect(rowOf('Imagery quiz').classList.contains('border-l-indigo-600')).toBe(true);
    expect(rowOf('Imagery quiz').classList.contains('rp-phase-row')).toBe(false);
    expect(chipOf('Imagery quiz').textContent.trim()).toBe(label('closure'));
  });

  it('turns off in one click and stays off in this browser', () => {
    render(props());
    expect(toggle().checked).toBe(true);
    React.act(() => toggle().click());
    expect(host.querySelector('[data-history-lesson-part]')).toBeNull();
    expect(host.querySelector('.rp-phase-row')).toBeNull();
    expect(rowOf('Imagery quiz').querySelector('button[aria-label]').getAttribute('aria-label')).not.toContain(bank.history.lesson_part);
    expect(window.localStorage.getItem('alloflow_history_phase_colors')).toBe('off');
    React.act(() => root.unmount()); root = createRoot(host); render(props());
    expect(toggle().checked).toBe(false);
    expect(host.querySelector('[data-history-lesson-part]')).toBeNull();
  });

  it('still works when browser storage is blocked', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      render(props());
      expect(chipOf('Imagery quiz')).toBeTruthy();
      React.act(() => toggle().click());
      expect(host.querySelector('[data-history-lesson-part]')).toBeNull();
    } finally { get.mockRestore(); set.mockRestore(); }
  });

  it('is a teacher planning aid only', () => {
    for (const view of [{ isTeacherMode: false }, { isParentMode: true }, { isIndependentMode: true }]) {
      render(props(view));
      expect(host.querySelector('[data-history-lesson-part]')).toBeNull();
      expect(host.querySelector('.rp-phase-row')).toBeNull();
      expect(toggle()).toBeNull();
    }
  });
});

describe('choosing a resource’s lesson part', () => {
  it('offers automatic, each part and none, and reports the choice', () => {
    const p = props(); render(p);
    const select = openActions('Imagery quiz');
    expect(select.value).toBe('auto');
    expect([...select.options].map(o => o.value)).toEqual(['auto', 'hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure', 'none']);
    expect(select.options[0].textContent).toBe(bank.history.lesson_part_auto.replace('{part}', label('closure')));
    choose(select, 'guidedPractice');
    expect(p.onSetLessonPhase).toHaveBeenLastCalledWith(Q, 'guidedPractice');
    choose(select, 'none');
    expect(p.onSetLessonPhase).toHaveBeenLastCalledWith(Q, 'none');
    choose(select, 'auto');
    expect(p.onSetLessonPhase).toHaveBeenLastCalledWith(Q, null);
  });

  it('shows a saved choice, and says when a type has no automatic part', () => {
    render(props());
    expect(openActions('Warm-up quiz').value).toBe('hook');
    const odd = openActions('Research pipeline');
    expect(odd.options[0].textContent).toBe(bank.history.lesson_part_auto_none);
  });

  it('works even with colours off, and is absent without a host handler', () => {
    window.localStorage.setItem('alloflow_history_phase_colors', 'off');
    render(props());
    expect(openActions('Imagery quiz')).toBeTruthy();
    React.act(() => root.unmount()); root = createRoot(host);
    render(props({ onSetLessonPhase: null }));
    expect(openActions('Imagery quiz')).toBeNull();
  });
});

describe('themes and host wiring', () => {
  it('defines every part for light, dark, high contrast and forced colours', () => {
    const css = historySource.slice(historySource.indexOf('Lesson parts: a thin stripe'));
    for (const phase of ['hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure']) {
      expect(css.match(new RegExp('--rp-phase-' + phase + '-ink:', 'g')).length).toBe(3);
      expect(css).toContain(`[data-lesson-phase="${phase}"] { --rp-phase: var(--rp-phase-${phase});`);
    }
    expect(css).toContain('@media (forced-colors: active)');
  });

  it('saves the choice on the resource, removes it for automatic, and keeps it in the browser save', () => {
    const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
    const start = shell.indexOf('  const handleSetLessonPhase = '), end = shell.indexOf('  const handleNoteUpdate', start);
    expect(start).toBeGreaterThan(0);
    const calls = [];
    const make = new Function('onUpdateResource', 'getArtifactInstanceId', shell.slice(start, end) + ' return handleSetLessonPhase;');
    const setPhase = make((id, updater, options) => calls.push({ id, next: updater({ id, type: 'quiz', lessonPhase: 'hook', data: 1 }), options }), item => item._artifactInstanceId || '');
    setPhase({ id: 'q', _artifactInstanceId: 'artifact-abcdefgh' }, 'closure');
    setPhase({ id: 'q' }, null);
    setPhase(null, 'hook');
    expect(calls).toEqual([
      { id: 'q', next: { id: 'q', type: 'quiz', lessonPhase: 'closure', data: 1 }, options: { instanceId: 'artifact-abcdefgh' } },
      { id: 'q', next: { id: 'q', type: 'quiz', data: 1 }, options: { instanceId: '' } },
    ]);
    expect(shell).toContain('onSetLessonPhase={isTeacherMode ? handleSetLessonPhase : null}');
    expect(shell).toContain('if (item.lessonPhase) serializedItem.lessonPhase = item.lessonPhase;');
  });

  it('registers the new labels in both copies of ui_strings', () => {
    const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8'));
    for (const key of ['lesson_part_colors', 'lesson_part', 'lesson_part_auto', 'lesson_part_auto_none', 'lesson_part_none']) {
      expect(bank.history[key], key).toBeTruthy();
      expect(mirror.history[key], key).toBe(bank.history[key]);
    }
  });
});
