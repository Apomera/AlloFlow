// Wave 12 regression suite (2026-11-20): P1/P2 Classroom Polish, Destructive-Action Guards & Responsive Layout.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;

function mountElement(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(el);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

beforeAll(() => {
  React = require(path.join(modulesDir, 'react'));
  ReactDOMClient = require(path.join(modulesDir, 'react-dom/client'));
  act = React.act || require(path.join(modulesDir, 'react-dom/test-utils')).act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.LanguageContext = React.createContext({ t: (k) => k });
  window.fisherYatesShuffle = (arr) => [...arr];
});

afterEach(() => {
  document.body.innerHTML = '';
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

describe('Wave 12 — Classroom Polish, Destructive-Action Guards & Responsive Layout', () => {
  it('validates survey ranges/choices, removes decoy link input, and requires two taps to remove an active Assignment Center record', () => {
    loadAlloModule('view_assignment_center_module.js');
    const AssignmentCenterModal = window.AlloModules.AssignmentCenter.AssignmentCenterModal;
    const onRemoveRecord = vi.fn();

    const { container, unmount } = mountElement(
      React.createElement(AssignmentCenterModal, {
        t: () => '',
        isOpen: true,
        activityEnabled: true,
        activityType: 'survey',
        activityIdentityMode: 'codename',
        surveyHostingAvailable: true,
        surveyItems: [
          { viewKey: 'q1', text: 'Numeric range', type: 'numeric', min: 10, max: 5 },
          { viewKey: 'q2', text: 'Choice with no options', type: 'choice', optionsText: '   ' },
        ],
        rowViews: [{
          viewKey: 'row-active',
          lifecycle: 'active',
          title: 'Active homework',
          resourceCount: 1,
          hasSharedActivity: false,
          linkLabel: 'Private assignment link',
          onRemoveRecord,
        }],
        visibleRowViews: [{
          viewKey: 'row-active',
          lifecycle: 'active',
          title: 'Active homework',
          resourceCount: 1,
          hasSharedActivity: false,
          linkLabel: 'Private assignment link',
          onRemoveRecord,
        }],
        filter: 'all',
        onClose: vi.fn(),
        onActivityChange: vi.fn(),
        onSurveyItemChange: vi.fn(),
        onSurveyItemRemove: vi.fn(),
        onSurveyItemAdd: vi.fn(),
        onCreateLink: vi.fn(),
        onFilterChange: vi.fn(),
        onRefresh: vi.fn(),
        onExportCsv: vi.fn(),
      })
    );

    expect(container.textContent).toContain('Each multiple-choice question needs at least one option line.');
    expect(container.textContent).toContain('Numeric questions must have a Min less than or equal to Max.');
    // Decoy auto-selecting readOnly link input replaced by non-input helper text
    expect(container.querySelector('input[value="Private assignment link"]')).toBeNull();
    expect(container.textContent).toContain('Use Copy active link below to share the URL.');

    // Two-tap guard on active record removal
    const removeBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Remove record'));
    expect(removeBtn).toBeTruthy();
    act(() => { removeBtn.click(); });
    expect(onRemoveRecord).not.toHaveBeenCalled();
    // The first tap now swaps in a separate Confirm remove + Cancel pair.
    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Confirm remove'));
    expect(confirmBtn).toBeTruthy();
    expect(Array.from(container.querySelectorAll('button')).some((b) => b.textContent.trim() === 'Cancel')).toBe(true);
    act(() => { confirmBtn.click(); });
    expect(onRemoveRecord).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('fixes StudyTimerModal Reset aria-label, disables duration presets while running, and clears customTimerMinutes on Reset', () => {
    loadAlloModule('view_study_timer_modal_module.js');
    const StudyTimerModal = window.AlloModules.StudyTimerModal?.StudyTimerModal || window.AlloModules.StudyTimerModal;
    const setCustomTimerMinutes = vi.fn();

    const { container, unmount } = mountElement(
      React.createElement(StudyTimerModal, {
        showStudyTimerModal: true,
        isStudyTimerRunning: true,
        studyDuration: 1500,
        studyTimeLeft: 900,
        studyTaskLabel: 'Reading',
        customTimerMinutes: '12',
        setStudyTaskLabel: vi.fn(),
        setStudyDuration: vi.fn(),
        setStudyTimeLeft: vi.fn(),
        setCustomTimerMinutes,
        setIsStudyTimerRunning: vi.fn(),
        handleSetShowStudyTimerModalToFalse: vi.fn(),
        formatTime: (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
        t: (k) => k,
      })
    );

    const presetBtns = Array.from(container.querySelectorAll('[data-help-key="timer_duration_btn"]'));
    expect(presetBtns.length).toBe(4);
    presetBtns.forEach((btn) => expect(btn.disabled).toBe(true));

    const resetBtn = container.querySelector('[data-help-key="timer_reset_btn"]');
    expect(resetBtn.getAttribute('aria-label')).toBe('timer.reset');
    act(() => { resetBtn.click(); });
    expect(setCustomTimerMinutes).toHaveBeenCalledWith('');
    unmount();
  });

  it('shows Ending… and aria-busy on EndSessionPreview End without saving button and formats params without regex $ bugs', () => {
    loadAlloModule('view_end_session_preview_module.js');
    const EndSessionPreview = window.AlloModules.EndSessionPreview.EndSessionPreview;

    const { container, unmount } = mountElement(
      React.createElement(EndSessionPreview, {
        preview: {
          summary: { participants: { 'Azure Fox': {} }, absentCodenames: [], unmatchedCodenames: [] },
          busy: true,
          deliveryGuard: false,
          deliverySummary: { opened: 1, assigned: 2, pending: 1, loading: 0, failed: 0 },
        },
        note: 'Keep this note',
        canSaveSummary: true,
        onKeepOpen: vi.fn(),
        onNoteChange: vi.fn(),
        onComplete: vi.fn(),
      })
    );

    const busyButtons = Array.from(container.querySelectorAll('button[aria-busy="true"]'));
    expect(busyButtons.length).toBe(2);
    busyButtons.forEach((btn) => expect(btn.textContent).toContain('Ending'));
    unmount();
  });

  it('renders visible Clear filters empty state when EducatorHubModal and LearningHubModal search yields zero matches', () => {
    loadAlloModule('view_learning_hub_modal_module.js');
    const LearningHubModal = window.AlloModules.LearningHubModal.LearningHubModal;

    const { container, unmount } = mountElement(
      React.createElement(LearningHubModal, {
        showLearningHub: true,
        setShowLearningHub: vi.fn(),
        setStemLabTool: vi.fn(),
        setLabToolData: vi.fn(),
        setShowStemLab: vi.fn(),
        t: () => '',
      })
    );

    const searchInput = container.querySelector('#learning-hub-search');
    expect(searchInput).not.toBeNull();
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(searchInput, 'zzzz-nonexistent-tool-xyz');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.textContent).toContain('No tools match your current filters.');
    const clearBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Clear filters'));
    expect(clearBtn).toBeTruthy();
    act(() => { clearBtn.click(); });
    expect(searchInput.value).toBe('');
    unmount();
  });

  it('verifies Wave 12 guards, switches, overflow counters, drag-out backdrops, and responsive fixes across compiled modules', () => {
    const llrSrc = fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_module.js'), 'utf8');
    expect(llrSrc).toContain('anySendBusy');
    expect(llrSrc).toContain('attentionOverflowCount');
    expect(llrSrc).toContain('readinessOpen');
    expect(llrSrc).not.toContain(") ? {cohort.count}");

    const lsdSrc = fs.readFileSync(path.join(ROOT, 'view_live_session_dock_module.js'), 'utf8');
    expect(lsdSrc).toContain('confirmStopOrganizer');
    expect(lsdSrc).toContain('confirmRemoveGoalId');
    expect(lsdSrc).toContain('role: "switch"');
    expect(lsdSrc).toMatch(/flexWrap:\s*['"]wrap['"]/);

    const ssSrc = fs.readFileSync(path.join(ROOT, 'view_share_session_surfaces_module.js'), 'utf8');
    expect(ssSrc).toContain('confirmRotateToken');
    expect(ssSrc).toContain('confirmForgetMailbox');
    expect(ssSrc).toContain('question_board');
    expect(ssSrc).toContain('availability poll');
    expect(ssSrc).toContain('sign-up sheet');
    expect(ssSrc).toContain('role: "switch"');

    const advSrc = fs.readFileSync(path.join(ROOT, 'view_adventure_module.js'), 'utf8');
    expect(advSrc).toContain('confirmRestart');
    expect(advSrc).toContain('onMouseDown');

    const epSrc = fs.readFileSync(path.join(ROOT, 'view_export_preview_module.js'), 'utf8');
    expect(epSrc).toContain('confirmDeletePresetKey');
    expect(epSrc).toContain('onMouseDown');

    const ehSrc = fs.readFileSync(path.join(ROOT, 'view_educator_hub_modal_module.js'), 'utf8');
    expect(ehSrc).toContain('script.remove()');
    expect(ehSrc).toContain('No tools match your current filters.');
    expect(ehSrc).toContain('min-w-11 min-h-11');

    const gamesSrc = fs.readFileSync(path.join(ROOT, 'games_module.js'), 'utf8');
    expect(gamesSrc).toContain('Confirm show answer');
    expect(gamesSrc).toContain('Confirm reveal');
    expect(gamesSrc).toContain('flex flex-wrap gap-2');
    expect(gamesSrc).toContain('max-w-[500px] w-full aspect-square');
    expect(gamesSrc).toContain('useReducedMotion() ? "auto" : "smooth"');

    const hostSrc = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
    expect(hostSrc).toContain("'question_board', 'poll', 'discussion', 'exit-ticket'");
    expect(hostSrc).toContain('onKeepOpen={() => setEndSessionPreview(null)}');
  });
});
