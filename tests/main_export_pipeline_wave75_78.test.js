// Verification suite for Waves 75-78:
// - Wave 75: Hosted mailbox fixture setupOwner fix + TeacherDashboard, CICO, Roster Evidence,
//            and Assignment Center CSV formula-injection & UTF-8 BOM hardening
// - Wave 76: PromptDialog standalone focus-trap/null-safety/AlloIcons priority + SessionModal,
//            EducatorHubModal, LearningHubModal, and InfoModal IME Escape, Shift+Tab wrap, and
//            ancestor-chain background inert/aria-hidden isolation
// - Wave 77: Transient print popup window.opener = null isolation across games, lesson plan,
//            notebook, memory aid, applied challenge, and learner progress report
// - Wave 78: GlossaryView + HostHandlers dual-flag (isSelected/selected) curation parity,
//            4-mirror SHA-256 parity across 14 modules, and host browser delivery manifest sync

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const { readEmbeddedManifest } = require('../dev-tools/build_browser_delivery_manifest.cjs');

let React;
let ReactDOMClient;
let act;
let originalBlob;
let TeacherDashboard;
let LearnerProgressView;
let CicoInternals;
let buildRosterSessionEvidenceCsv;
let SharedActivity;
let HostHandlers;
let PromptDialog;
let SessionModal;
let EducatorHubModal;
let LearningHubModal;
let InfoModal;
let GlossaryView;

const activeRoots = [];

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function mountComp(Component, props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  activeRoots.push({ root, host });
  act(() => {
    root.render(React.createElement(Component, props));
  });
  return { host, root };
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  ReactDOMClient = require(resolve(mdDir, 'react-dom/client'));
  ({ act } = require(resolve(mdDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  originalBlob = globalThis.Blob;

  // Ensure PromptDialog loads cleanly WITHOUT window.__alloHooks populated.
  delete window.__alloHooks;
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.__alloShared = { safeGetItem: () => null, safeSetItem: () => {}, warnLog: () => {} };
  window.__alloFirebase = {};

  loadAlloModule('view_prompt_dialog_module.js');
  loadAlloModule('teacher_module.js');
  loadAlloModule('shared_activity_module.js');
  loadAlloModule('host_handlers_module.js');
  loadAlloModule('view_session_modal_module.js');
  loadAlloModule('view_educator_hub_modal_module.js');
  loadAlloModule('view_learning_hub_modal_module.js');
  loadAlloModule('view_info_modal_module.js');
  loadAlloModule('view_glossary_module.js');

  PromptDialog = window.AlloModules.PromptDialog.PromptDialog;
  TeacherDashboard = window.AlloModules.TeacherDashboard;
  LearnerProgressView = window.AlloModules.LearnerProgressView;
  CicoInternals = window.AlloModules.CicoInternals;
  buildRosterSessionEvidenceCsv = window.AlloModules.buildRosterSessionEvidenceCsv;
  SharedActivity = window.AlloModules.SharedActivity;
  HostHandlers = window.AlloModules.HostHandlers;
  SessionModal = window.AlloModules.SessionModal.SessionModal;
  EducatorHubModal = window.AlloModules.EducatorHubModal.EducatorHubModal;
  LearningHubModal = window.AlloModules.LearningHubModal.LearningHubModal;
  InfoModal = window.AlloModules.InfoModal.InfoModal;
  GlossaryView = window.AlloModules.GlossaryView;
});

afterEach(() => {
  vi.useRealTimers();
  while (activeRoots.length) {
    const { root, host } = activeRoots.pop();
    act(() => {
      root.unmount();
    });
    host.remove();
  }
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  globalThis.Blob = originalBlob;
  window.Blob = originalBlob;
  vi.restoreAllMocks();
});

describe('Wave 75: Teacher, CICO, Roster Evidence & Assignment Center CSV hardening', () => {
  it('TeacherDashboard handleExportCSV prepends BOM, neutralizes formula cells, quotes CRLF rows, and revokes object URLs', () => {
    vi.useFakeTimers();
    const captured = [];
    class CaptureBlob {
      constructor(parts, opts) {
        this.text = parts.map(String).join('');
        this.type = opts && opts.type ? opts.type : '';
        captured.push(this);
      }
    }
    vi.stubGlobal('Blob', CaptureBlob);
    window.Blob = CaptureBlob;
    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:dash';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dash-1');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { host } = mountComp(TeacherDashboard, {
      onClose: () => {},
      dashboardData: [
        {
          id: 's1',
          studentNickname: '=CMD("calc")',
          timestamp: '2026-11-15T12:00:00Z',
          history: [],
          responses: {},
        },
        {
          id: 's2',
          studentNickname: '\n|evil "Quote"',
          timestamp: '2026-11-15T12:00:00Z',
          history: [],
          responses: {},
        },
      ],
      setDashboardData: () => {},
      addToast: () => {},
      setSelectedStudentId: () => {},
      setDashboardView: () => {},
      dashboardView: 'overview',
      selectedStudentId: null,
      generateResourceHTML: () => '',
      onOpenBehaviorLens: () => {},
    });

    const exportBtn = host.querySelector('[data-help-key="dashboard_export_csv_btn"]');
    expect(exportBtn).not.toBeNull();
    act(() => exportBtn.click());

    expect(captured).toHaveLength(1);
    expect(captured[0].text.startsWith('\uFEFF"dashboard.csv.header_name"')).toBe(true);
    expect(captured[0].text).toContain('"\'=CMD(""calc"")"');
    expect(captured[0].text).toContain('"\'\n|evil ""Quote"""');
    expect(captured[0].text).toContain('\r\n');
    expect(revokeSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeSpy).toHaveBeenCalledWith('blob:dash-1');
  });

  it('CICO and Roster Session Evidence CSV builders neutralize | and leading control characters while keeping numeric cells unquoted', () => {
    const cicoCsv = CicoInternals.studentCsv('=Bob', {
      days: {
        '2026-11-15': { checkIn: true, checkOut: false, ratings: { '0:0': 2 } },
      },
    }, { periods: ['\n|Math'], expectations: ['Safe'], goalPct: 80 });
    expect(cicoCsv).toContain('"\'=Bob"');
    expect(cicoCsv).toContain('"\'\n|Math - Safe"');

    const rosterCsv = buildRosterSessionEvidenceCsv({
      id: '|sess',
      endedAt: '2026-11-15T12:00:00Z',
      durationMinutes: 15,
      mode: '\t=sync',
      participants: {
        '@Fox': { responseCount: 2, liveActivityCount: 1, liveSubmissionCount: 1, liveRevisionCount: 0 },
      },
      liveActivities: [],
    });
    expect(rosterCsv).toContain("'|sess,2026-11-15T12:00:00Z,15,'\t=sync,'@Fox,");
  });

  it('SharedActivity.buildAssignmentCenterCsv and host fallback match and escape formula/control prefixes', () => {
    const anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
    const start = anti.indexOf('function _alloBuildAssignmentCenterCsvFallback');
    const end = anti.indexOf('function _alloNextSharedActivitySummaryOrderFallback', start);
    const hostFallback = new Function(anti.slice(start, end) + '\nreturn _alloBuildAssignmentCenterCsvFallback;')();

    const rows = [
      {
        share: { title: '|cmd', createdAt: '2026-11-01', expiresAt: '2026-12-01', resourceCount: 3, type: 'assignment-pack-hosted', sharedActivity: { type: 'survey' } },
        lifecycle: '\n=active',
        activity: { participantCount: 5, pending: 1, approved: 3, hidden: 1, revealed: true, updatedAt: Date.UTC(2026, 10, 15) },
      },
    ];
    const moduleCsv = SharedActivity.buildAssignmentCenterCsv(rows);
    const fallbackCsv = hostFallback(rows);
    expect(fallbackCsv).toBe(moduleCsv);
    expect(moduleCsv).toContain("'|cmd");
    expect(moduleCsv).toContain('"\'\n=active"');
  });
});

describe('Wave 76: Standalone PromptDialog & stacked modal focus isolation, IME guards, and Shift+Tab wrap', () => {
  it('PromptDialog works without window.__alloHooks, safely renders null, isolates siblings, wraps Shift+Tab from dialog, and ignores IME Escape', () => {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Trigger';
    const outerBg = document.createElement('section');
    const scriptNode = document.createElement('script');
    document.body.append(opener, outerBg, scriptNode);
    opener.focus();

    const onCancel = vi.fn();
    let setPrompt;
    function Harness() {
      const [cfg, setCfg] = React.useState({
        title: 'Rename',
        message: 'New title',
        defaultValue: 'Lesson 1',
        onCancel,
        onSubmit: vi.fn(),
      });
      setPrompt = setCfg;
      return React.createElement(PromptDialog, { promptDialog: cfg, setPromptDialog: setCfg, t: (k) => k });
    }
    const { host } = mountComp(Harness, {});

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);
    expect(outerBg.hasAttribute('inert')).toBe(true);
    expect(outerBg.getAttribute('aria-hidden')).toBe('true');
    expect(scriptNode.hasAttribute('inert')).toBe(false);

    // Shift+Tab from dialog container wraps to OK button
    const buttons = Array.from(dialog.querySelectorAll('button'));
    dialog.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    // IME composition Escape does not cancel
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })));
    expect(onCancel).not.toHaveBeenCalled();

    // Null transition must not throw React hook-order errors and must restore isolation + opener focus
    act(() => setPrompt(null));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(outerBg.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(opener);

    // Re-open works cleanly and real Escape closes
    act(() => setPrompt({ message: 'Again', onCancel, onSubmit: vi.fn() }));
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(opener);
  });

  it.each([
    ['SessionModal', () => SessionModal, (onClose) => ({
      activeSessionCode: 'ABC123',
      activeSessionAppId: 'app-1',
      addToast: vi.fn(),
      appId: 'app-1',
      copyToClipboard: vi.fn(),
      connectedStudentCount: 0,
      handleSetShowGroupModalToTrue: vi.fn(),
      handleSetShowSessionModalToFalse: onClose,
      sessionData: { isLocalOnly: true, mode: 'sync' },
      setConfirmDialog: vi.fn(),
      setShowSessionModal: vi.fn(),
      t: (k) => k,
      toggleSessionMode: vi.fn(),
    })],
    ['EducatorHubModal', () => EducatorHubModal, (onClose) => ({
      handleFileUpload: vi.fn(),
      openExportPreview: vi.fn(),
      setIsAccessibilityLabOpen: vi.fn(),
      setIsCommunityCatalogOpen: vi.fn(),
      setIsSymbolStudioOpen: vi.fn(),
      setPdfAuditResult: vi.fn(),
      setPdfBatchMode: vi.fn(),
      setPendingPdfBase64: vi.fn(),
      setPendingPdfFile: vi.fn(),
      setShowBehaviorLens: vi.fn(),
      setShowEducatorHub: onClose,
      setShowReportWriter: vi.fn(),
      showEducatorHub: true,
      t: () => null,
    })],
    ['LearningHubModal', () => LearningHubModal, (onClose) => ({
      setIsAlloHavenOpen: vi.fn(),
      setIsLinguaPracticeOpen: vi.fn(),
      setIsOpenGrooveOpen: vi.fn(),
      setIsTestPrepHubOpen: vi.fn(),
      setIsTimelineStudioOpen: vi.fn(),
      setSelHubTab: vi.fn(),
      setShowLearningHub: onClose,
      setShowLitLab: vi.fn(),
      setShowLearningWebExplorer: vi.fn(),
      setShowPoetTree: vi.fn(),
      setShowResearchHub: vi.fn(),
      setShowSelHub: vi.fn(),
      setShowStemLab: vi.fn(),
      setShowStoryForge: vi.fn(),
      setStemLabTab: vi.fn(),
      setStemLabTool: vi.fn(),
      setLabToolData: vi.fn(),
      showLearningHub: true,
      t: () => null,
    })],
    ['InfoModal', () => InfoModal, (onClose) => ({
      handleSetInfoModalTabToAbout: vi.fn(),
      handleSetInfoModalTabToAtlas: vi.fn(),
      handleSetInfoModalTabToFeatures: vi.fn(),
      handleSetInfoModalTabToPrivacy: vi.fn(),
      handleSetInfoModalTabToOpenSource: vi.fn(),
      handleSetShowInfoModalToFalse: onClose,
      infoModalTab: 'about',
      safeRemoveItem: vi.fn(),
      setShowInfoModal: vi.fn(),
      setShowWizard: vi.fn(),
      t: (k) => k,
    })],
  ])('%s isolates siblings, ignores IME Escape, wraps Shift+Tab from dialog, and restores focus', (_name, getComp, makeProps) => {
    const opener = document.createElement('button');
    opener.type = 'button';
    const outer = document.createElement('main');
    outer.innerHTML = '<button type="button">Outside</button>';
    const linkNode = document.createElement('link');
    document.body.append(opener, outer, linkNode);
    opener.focus();

    let closeFn;
    function Wrapper() {
      const [open, setOpen] = React.useState(true);
      closeFn = vi.fn(() => setOpen(false));
      return open ? React.createElement(getComp(), makeProps(closeFn)) : null;
    }
    const { host } = mountComp(Wrapper, {});

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(outer.hasAttribute('inert')).toBe(true);
    expect(outer.getAttribute('aria-hidden')).toBe('true');
    expect(linkNode.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');

    // Shift+Tab from dialog element wraps to last visible enabled focusable item
    const focusables = Array.from(dialog.querySelectorAll('button:not([disabled]), summary, [href], input:not([disabled])')).filter((el) => !el.closest('[hidden], [inert], [aria-hidden="true"]'));
    dialog.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);

    // IME Escape is ignored
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();

    // Normal Escape closes and restores sibling isolation, overflow, and opener focus
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(outer.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
  });
});

describe('Wave 77: Transient print popup window.opener = null isolation', () => {
  it('LearnerProgressView and compiled print popups sever window.opener = null on transient print windows', () => {
    const popup = {
      opener: window,
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(popup);

    const { host } = mountComp(LearnerProgressView, {
      progressHistory: {},
      studentCodename: 'Falcon',
      stats: { totalXP: 100, sessionCount: 1, masteryDistribution: {}, milestonesEarned: [] },
      onClose: () => {},
      t: () => '',
    });
    const printBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Print Progress Report'));
    expect(printBtn).toBeTruthy();
    act(() => printBtn.click());
    expect(popup.opener).toBeNull();

    for (const modFile of [
      'games_module.js',
      'view_lesson_plan_module.js',
      'note_taking_templates_module.js',
      'memory_aid_module.js',
      'applied_challenge_module.js',
    ]) {
      const code = readFileSync(resolve(ROOT, modFile), 'utf8');
      expect(code, modFile).toMatch(/window\.open\(['"]['"],\s*['"]_blank['"]\)[\s\S]{0,400}\.opener\s*=\s*null/);
    }
  });
});

describe('Wave 78: Glossary dual-flag curation parity, 14-module 4-mirror SHA-256 parity & manifest coherence', () => {
  it('GlossaryView honors both isSelected:false and selected:false in counts and row checkboxes', () => {
    const words = [
      { entryId: 'w1', term: 'Cell', def: 'Basic unit', isSelected: true },
      { entryId: 'w2', term: 'DropA', def: 'Out', isSelected: false },
      { entryId: 'w3', term: 'DropB', def: 'Out2', selected: false },
    ];
    const filtered = words.map((w, i) => ({ ...w, _originalIdx: i }));
    const { host } = mountComp(GlossaryView, glossaryMediaProps({
      isEditingGlossary: true,
      isTeacherMode: true,
      generatedContent: { id: 'gl-w78', type: 'glossary', data: words },
      filteredGlossaryData: filtered,
    }));

    const checkboxes = Array.from(host.querySelectorAll('tbody [data-glossary-selection] input[type="checkbox"]'));
    expect(checkboxes.map((cb) => cb.checked)).toEqual([true, false, false]);
    const headerCb = host.querySelector('thead [data-glossary-selection] input[type="checkbox"]');
    expect(headerCb.checked).toBe(false);
    expect(headerCb.indeterminate).toBe(true);
  });

  it('HostHandlers handleGlossarySelectionChange and handleGlossarySelectAll normalize legacy selected flags', () => {
    let generatedContent = {
      id: 'gl-h78',
      type: 'glossary',
      data: [
        { term: 'Alpha', def: 'First', selected: false },
        { term: 'Beta', def: 'Second', isSelected: true, selected: true },
      ],
    };
    const handlers = HostHandlers({
      generatedContent,
      setGeneratedContent: (next) => { generatedContent = next; },
      setHistory: vi.fn(),
    });

    handlers.handleGlossarySelectionChange(0);
    expect(generatedContent.data[0].isSelected).toBe(true);
    expect(generatedContent.data[0].selected).toBe(true);

    const nextHandlers = HostHandlers({
      generatedContent: {
        id: 'gl-h78-all',
        type: 'glossary',
        data: [{ term: 'Gamma', def: 'Third', selected: false }],
      },
      setGeneratedContent: (next) => { generatedContent = next; },
      setHistory: vi.fn(),
    });
    nextHandlers.handleGlossarySelectAll({ target: { checked: true } });
    expect(generatedContent.data[0].isSelected).toBe(true);
    expect(generatedContent.data[0].selected).toBe(true);
  });

  it('keeps all 14 Wave 75-78 modules synchronized across 4 mirrors and browser delivery manifests current across all 3 shells', () => {
    const mods = [
      'teacher_module.js',
      'shared_activity_module.js',
      'host_handlers_module.js',
      'view_prompt_dialog_module.js',
      'view_session_modal_module.js',
      'view_educator_hub_modal_module.js',
      'view_learning_hub_modal_module.js',
      'view_info_modal_module.js',
      'games_module.js',
      'view_lesson_plan_module.js',
      'note_taking_templates_module.js',
      'memory_aid_module.js',
      'applied_challenge_module.js',
      'view_glossary_module.js',
    ];
    for (const mod of mods) {
      const expected = sha256(resolve(ROOT, mod));
      for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
        expect(sha256(resolve(ROOT, mirror, mod)), `${mirror}/${mod}`).toBe(expected);
      }
    }

    const expectedHost = sha256(resolve(ROOT, 'AlloFlowANTI.txt'));
    for (const shellFile of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      expect(sha256(resolve(ROOT, shellFile)), shellFile).toBe(expectedHost);
      const manifest = readEmbeddedManifest(readFileSync(resolve(ROOT, shellFile), 'utf8'));
      for (const mod of mods) {
        const buf = readFileSync(resolve(ROOT, mod));
        const integrity = 'sha384-' + createHash('sha384').update(buf).digest('base64');
        expect(manifest.assets[mod], `${shellFile}:${mod}`).toEqual({ bytes: buf.length, integrity });
      }
    }
  });
});
