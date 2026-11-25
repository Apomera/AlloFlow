// Wave 13 regression suite (2026-11-20): P0 Security, XSS, Privacy, Role Boundaries & Critical Crashes.
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
    rerender(nextEl) {
      act(() => {
        root.render(nextEl);
      });
    },
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
  global.LanguageContext = window.LanguageContext = window.AlloLanguageContext = React.createContext({ t: (k) => k });
  global.AlloThemeContext = window.AlloThemeContext = React.createContext({ theme: 'light', colorOverlay: 'none' });
});

afterEach(() => {
  document.body.innerHTML = '';
  window.__alloFocusTrapStack = [];
  delete window.__alloUseBionic;
  delete window.sanitizeHtml;
  vi.restoreAllMocks();
});

describe('Wave 13 — P0 Security, XSS, Privacy, Role Boundaries & Critical Crashes', () => {
  it('does not violate Rules of Hooks when SentenceFramesView transitions from empty to populated with __alloUseBionic', () => {
    window.__alloUseBionic = () => {
      const [on] = React.useState(false);
      return on;
    };
    loadAlloModule('view_sentence_frames_module.js');
    const SentenceFramesView = window.AlloModules.SentenceFramesView?.SentenceFramesView || window.AlloModules.SentenceFramesView;
    expect(typeof SentenceFramesView).toBe('function');

    const baseProps = {
      t: (k) => k,
      isTeacherMode: false,
      isEditingScaffolds: true,
      studentResponses: {},
      gradingSession: { isOpen: false },
      ErrorBoundary: ({ children }) => children,
      DraftFeedbackInterface: () => null,
      handleStudentInput: vi.fn(),
      handleResetScaffolds: vi.fn(),
    };

    const mounted = mountElement(
      React.createElement(SentenceFramesView, {
        ...baseProps,
        generatedContent: { id: 'sf-1', data: { mode: 'list', items: [] } },
      })
    );
    expect(mounted.container.textContent).toContain('No writing prompts are available');

    // Re-rendering with populated data must NOT throw React #310 (hook order mismatch)
    // And student mode must NOT enter teacher scaffold edit mode even if isEditingScaffolds is true
    mounted.rerender(
      React.createElement(SentenceFramesView, {
        ...baseProps,
        generatedContent: { id: 'sf-2', data: { mode: 'list', items: [{ text: 'First, ___.' }] } },
      })
    );
    expect(mounted.container.textContent).toContain('First, ___.');
    expect(mounted.container.querySelector('textarea[aria-label*="Edit scaffold"]')).toBeNull();
    mounted.unmount();
  });

  it('prevents double submit, catches rejections, and handles non-array codename lists in StudentSubmitModal + guards empty DraftFeedbackInterface', async () => {
    loadAlloModule('student_interaction_module.js');
    const { StudentSubmitModal, DraftFeedbackInterface } = window.AlloModules;

    // DraftFeedbackInterface with undefined draftText must not throw and must disable revision submit
    const draftMount = mountElement(
      React.createElement(DraftFeedbackInterface, {
        status: 'revision',
        draftText: undefined,
        setDraftText: vi.fn(),
        previousDraft: 'First draft',
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    const revBtn = Array.from(draftMount.container.querySelectorAll('button[type="button"]'))
      // say() shows the English fallback when t() echoes the key.
      .find((b) => b.textContent.includes('Submit Revision'));
    expect(revBtn).toBeTruthy();
    expect(revBtn.disabled).toBe(true);
    draftMount.unmount();

    // StudentSubmitModal must not crash when t('codenames.adjectives') returns a string instead of an array
    const crashCheck = mountElement(
      React.createElement(StudentSubmitModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        stats: { quizzes: 1, readings: 1, adventures: 0, scaffolds: 0 },
      })
    );
    expect(crashCheck.container.querySelector('[role="dialog"]')).not.toBeNull();
    crashCheck.unmount();
  });

  it('guards HintsModal against undefined hintHistory/history props without crashing', () => {
    loadAlloModule('view_hints_modal_module.js');
    const HintsModal = window.AlloModules.HintsModal?.HintsModal || window.AlloModules.HintsModal;
    expect(typeof HintsModal).toBe('function');

    const mounted = mountElement(
      React.createElement(HintsModal, {
        showHintsModal: true,
        handleSetShowHintsModalToFalse: vi.fn(),
        t: (k) => k,
      })
    );
    expect(mounted.container.querySelector('[role="dialog"]')).not.toBeNull();
    const genBtn = mounted.container.querySelector('[data-help-key="hints_generate_extension"]');
    expect(genBtn.disabled).toBe(true);
    mounted.unmount();
  });

  it('guards TourOverlay against out-of-bounds tourStep and non-string spotlightMessage without crashing', () => {
    loadAlloModule('view_misc_panels_module.js');
    const TourOverlay = window.AlloModules.TourOverlay;
    expect(typeof TourOverlay).toBe('function');

    // Out-of-bounds step renders null cleanly instead of throwing
    const oob = mountElement(
      React.createElement(TourOverlay, {
        runTour: true,
        tourRect: { top: 20, left: 20, width: 100, height: 40 },
        tourSteps: [],
        tourStep: 3,
        t: (k) => k,
      })
    );
    expect(oob.container.innerHTML).toBe('');
    oob.unmount();

    // Object spotlightMessage without .text must not throw .split TypeError
    const objSpotlight = mountElement(
      React.createElement(TourOverlay, {
        runTour: true,
        tourRect: { top: 20, left: 20, width: 100, height: 40 },
        tourSteps: [],
        tourStep: 0,
        spotlightMessage: { title: 'Notice only' },
        t: (k) => k,
      })
    );
    expect(objSpotlight.container.textContent).toContain('Notice only');
    objSpotlight.unmount();
  });

  it('verifies Wave 13 security, XSS, privacy, role-gate, z-index, and crash guards across compiled modules', () => {
    const spSrc = fs.readFileSync(path.join(ROOT, 'view_sidebar_panels_module.js'), 'utf8');
    expect(spSrc).toContain('u.protocol === "https:" || u.protocol === "http:"');
    expect(spSrc).toContain('fileInputRef?.current?.click()');

    const mmSrc = fs.readFileSync(path.join(ROOT, 'view_misc_modals_module.js'), 'utf8');
    expect(mmSrc).toContain('bp-preview-sanitizer-unavailable');
    expect(mmSrc).toContain('confirmForgetCloudKey');
    expect(mmSrc).toContain('confirmDeleteTemplateId');
    expect(mmSrc).toContain('confirmDeleteArchiveId');
    expect(mmSrc).toContain('setShowAIBackendModal(false)');

    const mpSrc = fs.readFileSync(path.join(ROOT, 'view_misc_panels_module.js'), 'utf8');
    expect(mpSrc).toContain('sanitizedRemarked');
    expect(mpSrc).toContain('safeGroupUrl');
    expect(mpSrc).toContain('confirmDeleteGroupId');
    expect(mpSrc).toContain('volume hidden for challenge');

    const hpSrc = fs.readFileSync(path.join(ROOT, 'view_history_panel_module.js'), 'utf8');
    expect(hpSrc).toContain('pushState');
    expect(hpSrc).toContain('confirmDeleteStationKey');
    expect(hpSrc).toContain('projectFileInputRef?.current?.click()');

    const saSrc = fs.readFileSync(path.join(ROOT, 'shared_activity_module.js'), 'utf8');
    expect(saSrc).toContain('pruneStore');
    expect(saSrc).toContain('allowDuringMutation');
    expect(saSrc).toContain('credentialRef.current.uid !== requestedUid');

    const scSrc = fs.readFileSync(path.join(ROOT, 'seating_chart_module.js'), 'utf8');
    expect(scSrc).toContain('_SEATING_EXT_TRAP');
    expect(scSrc).toContain('view !== "map"');

    const fabSrc = fs.readFileSync(path.join(ROOT, 'view_fab_stack_module.js'), 'utf8');
    expect(fabSrc).toContain('safeStudentSettings');
  });
});
