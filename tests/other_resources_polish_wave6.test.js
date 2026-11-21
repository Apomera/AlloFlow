import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;

let host, root;

beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  window.sanitizeHtml = (html) => String(html || '');
  window.AlloModules = window.AlloModules || {};

  for (const file of [
    'view_learning_hub_modal_module.js',
    'view_educator_hub_modal_module.js',
    'view_directions_composer_module.js',
    'view_end_session_preview_module.js',
  ]) {
    new Function(readFileSync(resolve(file), 'utf8'))();
  }
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  try { window.localStorage.clear(); } catch (_) {}
  try { window.sessionStorage.clear(); } catch (_) {}
  vi.restoreAllMocks();
});

function mount(element) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(element));
  return host;
}

function setInputValue(input, value) {
  const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

describe('Other resources polish — Wave 6 (Learning Hub, Educator Hub, Directions Composer, End Session Preview)', () => {
  it('LearningHubModal provides category filter chips, Enter quick-launch on single search match, and Clear recent', () => {
    const LearningHubModal = window.AlloModules.LearningHubModal.LearningHubModal;
    const setShowPoetTree = vi.fn();
    const setShowLearningHub = vi.fn();
    const noop = vi.fn();

    window.localStorage.setItem('alloflow_hub_learning_recent', JSON.stringify(['stem-lab']));

    mount(React.createElement(LearningHubModal, {
      setIsAlloHavenOpen: noop,
      setIsLinguaPracticeOpen: noop,
      setIsOpenGrooveOpen: noop,
      setIsReadingLibraryOpen: noop,
      setIsTestPrepHubOpen: noop,
      setIsTimelineStudioOpen: noop,
      setSelHubTab: noop,
      setShowLearningHub,
      setShowLitLab: noop,
      setShowLearningWebExplorer: noop,
      setShowPoetTree,
      setShowResearchHub: noop,
      setShowSelHub: noop,
      setShowStemLab: noop,
      setShowStoryForge: noop,
      setStemLabTab: noop,
      setStemLabTool: noop,
      setLabToolData: noop,
      showLearningHub: true,
      t: () => '',
    }));

    // Category filter isolates "create" section
    const createFilter = host.querySelector('[data-hub-section-filter="create"]');
    expect(createFilter).toBeTruthy();
    act(() => createFilter.click());
    expect(createFilter.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-hub-id="stem-lab"]').hidden).toBe(true);
    expect(host.querySelector('[data-hub-id="poettree"]').hidden).toBe(false);

    // Clear recent removes recent items from Quick access
    const clearRecent = host.querySelector('[data-hub-clear-recent]');
    expect(clearRecent).toBeTruthy();
    act(() => clearRecent.click());
    expect(host.querySelector('[data-hub-clear-recent]')).toBeNull();

    // Reset category filter -> Search uniquely for "PoetTree" -> Enter quick-launches it
    act(() => host.querySelector('[data-hub-section-filter="all"]').click());
    const search = host.querySelector('#learning-hub-search');
    setInputValue(search, 'PoetTree');
    // IME composition Enter is ignored
    act(() => search.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true })));
    expect(setShowPoetTree).not.toHaveBeenCalled();

    act(() => search.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(setShowPoetTree).toHaveBeenCalledWith(true);
    expect(setShowLearningHub).toHaveBeenCalledWith(false);
  });

  it('EducatorHubModal provides category filter chips, Enter quick-launch on single search match, and Clear recent', () => {
    const EducatorHubModal = window.AlloModules.EducatorHubModal.EducatorHubModal;
    const openWhiteboard = vi.fn();
    const setShowEducatorHub = vi.fn();
    const noop = vi.fn();

    window.localStorage.setItem('alloflow_hub_educator_recent', JSON.stringify(['lesson']));

    mount(React.createElement(EducatorHubModal, {
      handleFileUpload: noop,
      openExportPreview: noop,
      pdfAuditResult: null,
      pdfFixLoading: false,
      pdfFixResult: null,
      setIsAccessibilityLabOpen: noop,
      setIsCommunityCatalogOpen: noop,
      setIsSymbolStudioOpen: noop,
      setPdfAuditResult: noop,
      setPdfBatchMode: noop,
      setPendingPdfBase64: noop,
      setPendingPdfFile: noop,
      setShowBehaviorLens: noop,
      setShowEducatorHub,
      setShowReportWriter: noop,
      setIsVideoStudioOpen: noop,
      setIsAlloStudioOpen: noop,
      setPdfBatchQueue: noop,
      setIsDynamicAssessmentOpen: noop,
      setShowStemLab: noop,
      setStemLabTool: noop,
      setLabToolData: noop,
      startLessonFlow: noop,
      openWhiteboard,
      t: () => '',
    }));

    // Category filter isolates "start" section
    const startFilter = host.querySelector('[data-hub-section-filter="start"]');
    expect(startFilter).toBeTruthy();
    act(() => startFilter.click());
    expect(startFilter.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-hub-id="lesson"]').hidden).toBe(false);
    expect(host.querySelector('[data-hub-id="symbol-studio"]').hidden).toBe(true);

    // Clear recent removes recent items
    const clearRecent = host.querySelector('[data-hub-clear-recent]');
    expect(clearRecent).toBeTruthy();
    act(() => clearRecent.click());
    expect(host.querySelector('[data-hub-clear-recent]')).toBeNull();

    // Reset filter -> Search uniquely for "Whiteboard" -> Enter launches it
    act(() => host.querySelector('[data-hub-section-filter="all"]').click());
    const search = host.querySelector('#educator-hub-search');
    setInputValue(search, 'Whiteboard');
    act(() => search.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(openWhiteboard).toHaveBeenCalledTimes(1);
    expect(setShowEducatorHub).toHaveBeenCalledWith(false);
  });

  it('DirectionsComposerView offers 3-Step Starter, sequential Step & Bullet insertion, and live word/step stats', () => {
    const DirectionsComposerView = window.AlloModules.DirectionsComposer.DirectionsComposerView;
    const Icon = () => null;
    let latestDraft = null;

    function Harness() {
      const [draft, setDraft] = React.useState({ title: 'Lab steps', body: '', objectives: [], choiceBoard: { enabled: false, choices: [] } });
      latestDraft = draft;
      return React.createElement(DirectionsComposerView, {
        ArrowRight: Icon, ClipboardList: Icon, Sparkles: Icon, X: Icon,
        _alloDirectionsGoalResources: [], _alloGoalOptionsForResource: () => [], _alloStationStyle: () => ({}),
        _mbDirectionsChoiceDraftChoices: [], _mbDirectionsChoicePreviewItems: [], _mbDirectionsChoiceReady: false,
        _mbDirectionsChoiceStaleCount: 0, addDirectionsToPack: () => {}, deriveDirectionsDraft: () => {},
        directionsDeriving: false, generateUUID: () => 'g-1', mbDirectionsDraft: draft,
        setMbDirectionsDraft: setDraft, setShowDirectionsChoicePreview: () => {},
        setShowDirectionsComposer: () => {}, showDirectionsChoicePreview: false, t: () => '',
      });
    }

    mount(React.createElement(Harness));

    // Empty body shows 3-Step Starter chip and hides stats
    const starterBtn = host.querySelector('[data-directions-insert="starter"]');
    expect(starterBtn).toBeTruthy();
    expect(host.querySelector('[data-directions-body-stats]')).toBeNull();

    // Click 3-Step Starter -> populates 3 steps, hides starter chip, shows live word + step count
    act(() => starterBtn.click());
    expect(latestDraft.body).toContain('1. ');
    expect(latestDraft.body).toContain('3. ');
    expect(host.querySelector('[data-directions-insert="starter"]')).toBeNull();
    const stats = host.querySelector('[data-directions-body-stats]');
    expect(stats).toBeTruthy();
    expect(stats.textContent).toContain('3 steps');

    // Click + 1. Step -> appends "4. "
    act(() => host.querySelector('[data-directions-insert="step"]').click());
    expect(latestDraft.body.endsWith('\n4. ')).toBe(true);

    // Click + Bullet -> appends "- "
    act(() => host.querySelector('[data-directions-insert="bullet"]').click());
    expect(latestDraft.body.endsWith('\n- ')).toBe(true);
  });

  it('EndSessionPreview confirms Copy brief and appends codename-safe teacher note starters within 500 chars', () => {
    const EndSessionPreview = window.AlloModules.EndSessionPreview.EndSessionPreview;
    const copyToClipboard = vi.fn();
    let latestNote = '';

    function Harness() {
      const [note, setNote] = React.useState('');
      latestNote = note;
      return React.createElement(EndSessionPreview, {
        preview: {
          summary: {
            participants: { 'Azure Fox': {} },
            absentCodenames: [],
            unmatchedCodenames: [],
            insightBrief: {
              activityCount: 2,
              submissions: 4,
              revisions: 1,
              followUpCodenames: ['Azure Fox'],
              byKind: [],
              evidenceCohorts: [],
              groups: [],
              nextMoves: [],
            },
          },
          busy: false,
          followUpBusy: '',
          followUpResources: [],
        },
        note,
        canSaveSummary: true,
        groupNamesById: {},
        copyToClipboard,
        getConnectedCount: () => 1,
        onFollowUpResourceChange: () => {},
        onSendCohort: () => {},
        onNoteChange: setNote,
        onKeepOpen: () => {},
        onComplete: () => {},
      });
    }

    mount(React.createElement(Harness));

    // Copy brief calls callback and shows confirmation text
    const copyBtn = host.querySelector('[data-end-session-copy-brief]');
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.textContent).toContain('Copy brief');
    act(() => copyBtn.click());
    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    expect(copyBtn.textContent).toContain('Brief copied');

    // Quick note starter chips append codename-safe stems
    const chip1 = host.querySelector('[data-end-session-note-chip="small-group"]');
    const chip2 = host.querySelector('[data-end-session-note-chip="vocab"]');
    expect(chip1).toBeTruthy();
    act(() => chip1.click());
    expect(latestNote).toContain('Plan small-group follow-up for:');
    act(() => chip2.click());
    expect(latestNote).toContain('Plan small-group follow-up for:');
    expect(latestNote).toContain('Revisit key vocabulary with:');
    expect(latestNote.length).toBeLessThanOrEqual(500);
  });
});
