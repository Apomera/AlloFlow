// Verification suite for Waves 83-86:
// - Wave 83: ViewSimplifiedModule reader content-hash pin (?v=c71de20e), canonical 3-host
//            shell byte parity, and check_reader_release gate verification
// - Wave 84: CSV formula-injection (pipe | + leading whitespace/control chars) & UTF-8 BOM
//            hardening across AlloHaven, BehaviorLens, LinguaPractice, DisproAnalyzer,
//            MtssTriage, SpedTimelines, and UdlWalkthrough
// - Wave 85: Stacked modal re-render focus retention, IME Escape guards, closed-<details>
//            filtering, Shift+Tab wrap from dialog, scroll lock, and ancestor-chain inert
//            isolation across EndSessionPreview, CanvasRecoveryDialogView, LiveSessionDockView,
//            VideoLibraryOverlay, and VideoRefPlayerOverlay
// - Wave 86: 4-mirror SHA-256 parity across all 12 Wave 84-85 modules and 3-host browser
//            delivery manifest bytes + sha384 integrity verification

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');
const { verifyReaderRelease } = require('../dev-tools/check_reader_release.cjs');
const { readEmbeddedManifest } = require('../dev-tools/build_browser_delivery_manifest.cjs');

let React;
let ReactDOMClient;
let act;
let originalBlob;
let DisproTesting;
let MtssTesting;
let SpedTesting;
let UdlWalkTesting;
let Lingua;
let EndSessionPreview;
let CanvasRecoveryDialogView;
let LiveSessionDockView;
let VideoLibraryOverlay;
let VideoRefPlayerOverlay;

const activeRoots = [];

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function sha384Integrity(filePath) {
  return 'sha384-' + createHash('sha384').update(readFileSync(filePath)).digest('base64');
}

function mountWithBackdrop(element) {
  const opener = document.createElement('button');
  opener.type = 'button';
  opener.textContent = 'Open modal';
  const main = document.createElement('main');
  main.id = 'app-main-surface';
  const bgBtn = document.createElement('button');
  bgBtn.type = 'button';
  bgBtn.textContent = 'Background control';
  main.appendChild(bgBtn);
  const scriptTag = document.createElement('script');
  scriptTag.type = 'application/json';
  document.body.appendChild(opener);
  document.body.appendChild(main);
  document.body.appendChild(scriptTag);
  opener.focus();

  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  activeRoots.push({ root, host });
  act(() => {
    root.render(element);
  });
  return {
    opener,
    main,
    scriptTag,
    host,
    root,
    rerender(nextElement) {
      act(() => {
        root.render(nextElement);
      });
    },
    unmount() {
      const idx = activeRoots.findIndex((entry) => entry.root === root);
      if (idx >= 0) activeRoots.splice(idx, 1);
      act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

function dispatchKey(target, init) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  if (init && init.keyCode != null) {
    Object.defineProperty(event, 'keyCode', { get: () => init.keyCode });
  }
  target.dispatchEvent(event);
  return event;
}

function makeLiveDockProps(extra = {}) {
  const base = {
    t: () => null,
    history: [],
    sessionData: { roster: {} },
    rosterEntries: {},
    activeSignals: [],
    activeSessionCode: 'ABCDE',
    activeSessionAppId: 'app',
    _alloMbBridgeActive: () => false,
    _alloStudentSafeResources: (h) => h || [],
    liveDockPanelRef: React.createRef(),
    getFilteredHistory: () => [],
    dockCardStyle: {},
    dockGroupLabel: {},
    dockNow: Date.now(),
    recentHavenRecognition: [],
    liveOrganizerSummary: null,
    retryableLiveOrganizerUids: [],
    CLASS_GOAL_TEMPLATES: [],
    ALLOHAVEN_CLASSROOM_REWARD_REASONS: [],
    ALLOHAVEN_RECOGNITION_CAPS: [],
    TEACHER_ONLY_TYPES: new Set(),
    liveActivitySnapshots: {},
    livePresenterCuesByResourceId: {},
    checklistMarks: {},
    havenRecognitionConfig: {},
    havenRewardDraftsRef: { current: {} },
    ...extra,
  };
  const VERB = /^(normalize|get|handle|set|resolve|classify|evaluate|format|retry|launch|open|broadcast|summarize|update|toggle|clear|signal|build|record|_allo)/;
  const src = readFileSync(resolve(ROOT, 'view_live_session_dock_source.jsx'), 'utf8');
  const names = (/const \{([^}]*)\} = props;/.exec(src) || [, ''])[1]
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  const props = {};
  names.forEach((n) => {
    if (!(n in base)) props[n] = VERB.test(n) ? () => [] : undefined;
  });
  return Object.assign(props, base);
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  ReactDOMClient = require(resolve(mdDir, 'react-dom/client'));
  ({ act } = require(resolve(mdDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  originalBlob = globalThis.Blob;

  window.AlloModules = window.AlloModules || {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.__alloShared = { safeGetItem: () => null, safeSetItem: () => {}, warnLog: () => {} };

  loadAlloModule('dispro_analyzer_module.js');
  loadAlloModule('mtss_triage_module.js');
  loadAlloModule('sped_timelines_module.js');
  loadAlloModule('udl_walkthrough_module.js');
  loadAlloModule('lingua_practice_module.js');
  loadAlloModule('view_end_session_preview_module.js');
  loadAlloModule('view_canvas_recovery_dialog_module.js');
  loadAlloModule('view_live_session_dock_module.js');
  loadAlloModule('view_video_library_module.js');
  loadAlloModule('view_video_ref_player_module.js');

  DisproTesting = window.AlloModules.DisproAnalyzer._testing;
  MtssTesting = window.AlloModules.MtssTriage._testing;
  SpedTesting = window.AlloModules.SpedTimelines._testing;
  UdlWalkTesting = window.AlloModules.UdlWalkthrough._testing;
  Lingua = window.AlloModules.LinguaPractice;
  EndSessionPreview = window.AlloModules.EndSessionPreview.EndSessionPreview;
  CanvasRecoveryDialogView = window.AlloModules.CanvasRecoveryDialogView;
  LiveSessionDockView = window.AlloModules.LiveSessionDockView;
  VideoLibraryOverlay = window.AlloModules.VideoLibrary.VideoLibraryOverlay;
  VideoRefPlayerOverlay = window.AlloModules.VideoRefPlayer.VideoRefPlayerOverlay;
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

describe('Wave 83: Reader release content-hash pin & 3-host canonical shell parity', () => {
  it('passes verifyReaderRelease with zero errors and matching ?v=c71de20e pin across all 3 host shells', () => {
    const report = verifyReaderRelease();
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.mirrorsMatch).toBe(true);
    expect(report.hostsMatch).toBe(true);
    expect(report.expectedModuleSha256.startsWith('c71de20e')).toBe(true);

    const hosts = [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
    ];
    const baseline = readFileSync(resolve(ROOT, hosts[0]), 'utf8');
    expect(baseline).toContain(
      "loadModule('ViewSimplifiedModule', 'https://alloflow-cdn.pages.dev/view_simplified_module.js?v=c71de20e')"
    );
    for (const rel of hosts.slice(1)) {
      expect(readFileSync(resolve(ROOT, rel), 'utf8')).toBe(baseline);
    }
  });
});

describe('Wave 84: CSV formula-injection (pipe | & leading whitespace/controls) + UTF-8 BOM hardening', () => {
  it('AlloHaven exportDeckAs neutralizes formula/pipe/control cells and prepends UTF-8 BOM only for .csv exports', () => {
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
    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:haven';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:haven-1');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function onAnchorClick() {
      downloads.push(this.download);
    });

    const havenSrc = readFileSync(resolve(ROOT, 'allohaven_module.js'), 'utf8');
    const fnStart = havenSrc.indexOf('function exportDeckAs(decorationId)');
    const fnEndMarker = "addToast('Export failed. Try a different browser.');";
    const fnEnd = havenSrc.indexOf('}', havenSrc.indexOf('}', havenSrc.indexOf(fnEndMarker, fnStart)) + 1) + 1;
    expect(fnStart).toBeGreaterThan(0);
    expect(fnEnd).toBeGreaterThan(fnStart);

    const state = {
      decorations: [
        {
          id: 'd-csv',
          templateLabel: 'Bio Deck',
          subjects: ['sci'],
          linkedContent: {
            type: 'flashcards',
            data: {
              cards: [
                { front: '=CMD("calc")', back: '|powershell' },
                { front: '  @SUM(A1)', back: '\n-danger "quote"' },
              ],
            },
          },
        },
        {
          id: 'd-txt',
          templateLabel: 'Notes Deck',
          subjects: [],
          linkedContent: {
            type: 'notes',
            data: { text: 'Plain study notes' },
          },
        },
      ],
    };
    const toasts = [];
    // eslint-disable-next-line no-new-func
    const exportDeckAs = new Function(
      'state',
      'getSubjectTag',
      'extractClozeAnswers',
      'localDateKey',
      'addToast',
      havenSrc.slice(fnStart, fnEnd) + '\nreturn exportDeckAs;'
    )(
      state,
      () => ({ label: 'Life Science' }),
      () => [],
      () => '2026-11-15',
      (msg) => toasts.push(msg)
    );

    exportDeckAs('d-csv');
    expect(captured).toHaveLength(1);
    expect(captured[0].type).toBe('text/csv;charset=utf-8');
    expect(captured[0].text.startsWith('\uFEFFFront,Back,Tags\n')).toBe(true);
    expect(captured[0].text).toContain('"\'=CMD(""calc"")",\'|powershell,allohaven Bio_Deck Life_Science');
    expect(captured[0].text).toContain("'  @SUM(A1),\"'\n-danger \"\"quote\"\"\",");
    expect(downloads[0]).toBe('allohaven-bio-deck-2026-11-15.csv');

    exportDeckAs('d-txt');
    expect(captured).toHaveLength(2);
    expect(captured[1].type).toBe('text/plain;charset=utf-8');
    expect(captured[1].text.charCodeAt(0)).not.toBe(0xfeff);
    expect(downloads[1]).toBe('allohaven-notes-deck-2026-11-15.txt');

    vi.advanceTimersByTime(2000);
    expect(revokeSpy).toHaveBeenCalledWith('blob:haven-1');
  });

  it('BehaviorLens csvCell & handleDownloadToolCsv escape pipe/control cells, preserve numbers, and prepend BOM on CSV only', () => {
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
    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:bl';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:bl-1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const blSrc = readFileSync(resolve(ROOT, 'behavior_lens_module.js'), 'utf8');
    const cellStart = blSrc.indexOf('const csvCell = (value) => {');
    const cellEnd = blSrc.indexOf('const AI_EDIT_FIELDS =', cellStart);
    // eslint-disable-next-line no-new-func
    const csvCell = new Function(blSrc.slice(cellStart, cellEnd) + '\nreturn csvCell;')();

    expect(csvCell('|cmd')).toBe('"\'|cmd"');
    expect(csvCell('  =SUM(A1)')).toBe('"\'  =SUM(A1)"');
    expect(csvCell('\nhello')).toBe('"\'\nhello"');
    expect(csvCell(-4)).toBe('"-4"');

    const dlStart = blSrc.indexOf('const handleDownloadToolCsv = () => {');
    const dlEnd = blSrc.indexOf('const graphPanels =', dlStart);
    const makeDownloader = (ctx) =>
      // eslint-disable-next-line no-new-func
      new Function(
        'ctx',
        `const { selectedStudent, activePanel, abcEntries, sessionHistory, observationSessions, buildAbcCsv, buildSessionCsv, buildObservationCsv, getToolExportData, blCreateDownloadLink, addToast, tt, setShowExportMenu } = ctx;\n` +
          blSrc.slice(dlStart, dlEnd) +
          '\nreturn handleDownloadToolCsv;'
      )(ctx);

    const downloads = [];
    const baseCtx = {
      selectedStudent: 'Azure Fox',
      abcEntries: [{ id: 1 }],
      sessionHistory: [],
      observationSessions: [],
      buildAbcCsv: () => 'Date,Antecedent\n2026-11-15,' + csvCell('|trigger'),
      buildSessionCsv: () => '',
      buildObservationCsv: () => '',
      getToolExportData: () => 'Summary text output',
      blCreateDownloadLink: () => {
        const link = { href: '', download: '', click: () => { downloads.push(link.download); return true; } };
        return link;
      },
      addToast: () => {},
      tt: (_k, fb) => fb,
      setShowExportMenu: () => {},
    };

    makeDownloader({ ...baseCtx, activePanel: 'abc' })();
    expect(captured).toHaveLength(1);
    expect(captured[0].type).toBe('text/csv;charset=utf-8');
    expect(captured[0].text.startsWith('\uFEFFDate,Antecedent\n')).toBe(true);
    expect(captured[0].text).toContain('"\'|trigger"');
    expect(downloads[0]).toBe('behaviorlens-abc-Azure_Fox.csv');

    makeDownloader({ ...baseCtx, activePanel: 'bip' })();
    expect(captured).toHaveLength(2);
    expect(captured[1].type).toBe('text/plain');
    expect(captured[1].text).toBe('Summary text output');
    expect(downloads[1]).toBe('behaviorlens-bip-Azure_Fox.txt');
  });

  it('LinguaPractice wordBankCsv and Leadership Hub CSV builders (Dispro, MTSS, SpEd, UDL Walkthrough) neutralize pipe and whitespace-prefixed formulas', () => {
    const linguaSrc = readFileSync(resolve(ROOT, 'lingua_practice_module.js'), 'utf8');
    const lpStart = linguaSrc.indexOf('var CSV_HEADERS =');
    const lpEnd = linguaSrc.indexOf('var IMG_DB =', lpStart);
    // eslint-disable-next-line no-new-func
    const { csvCell: linguaCsvCell, wordBankCsv } = new Function(
      'normalizeWordTags',
      'var wordFormsText = function(){ return ""; }; var normalizeGrammarFeatures = function(){ return {}; }; var wordFormsJson = function(){ return "[]"; };\n' +
        linguaSrc.slice(lpStart, lpEnd) +
        '\nreturn { csvCell: csvCell, wordBankCsv: wordBankCsv };'
    )(Lingua._normalizeWordTags);

    expect(linguaCsvCell(-12)).toBe('"-12"');
    expect(linguaCsvCell('|calc')).toBe('"\'|calc"');
    expect(linguaCsvCell('  +cmd')).toBe('"\'  +cmd"');
    expect(linguaCsvCell('\tsafe')).toBe('"\'\tsafe"');
    const wbCsv = wordBankCsv([
      { language: 'Spanish', term: '|hola', meaning: '  =hello', note: '\nline2', tags: ['|tag'] },
    ]);
    expect(wbCsv).toContain('"\'|hola","\'  =hello"');
    expect(wbCsv).toContain('"\'\nline2","\'|tag"');

    const disproGroups = [
      { name: '|GroupPipe', enrollment: 100, students: 20 },
      { name: '  =OtherGroup', enrollment: 400, students: 40 },
    ];
    const computedDispro = DisproTesting.disproCompute(disproGroups);
    const disproCsv = DisproTesting.disproResultCsv(
      { outcomeLabel: '|ODRs', date: '2026-11-15' },
      {
        ...computedDispro,
        rows: [
          computedDispro.rows[0],
          { ...computedDispro.rows[1], name: '  |OtherPipe' },
        ],
      }
    );
    expect(disproCsv).toContain("'|GroupPipe,100,20");
    expect(disproCsv).toContain("'  |OtherPipe,400,40");

    const mtssCsv = MtssTesting.mtssCsv({
      label: '|ORF',
      window: '  @Fall',
      cutpoints: { higherBetter: true, tier2Cut: 40, tier3Cut: 20 },
      rows: [{ code: '|S1', score: 15 }, { code: '  |S2', score: 35 }],
    });
    expect(mtssCsv).toContain("'|S1,15,3");
    expect(mtssCsv).toContain("'|S2,35,2");

    const spedCsv = SpedTesting.spedCsv(
      [
        {
          id: 'c1',
          code: '|ST-1',
          type: 'initial_eval',
          provider: '  =Prov',
          keyDate: '2026-09-01',
          dueDate: '2026-10-31',
          completedAt: null,
        },
      ],
      '2026-10-01'
    );
    expect(spedCsv).toContain("'|ST-1,Initial evaluation,'  =Prov");

    const udlCsv = UdlWalkTesting.udlwalkCsv([
      { session_id: '|s1', classroom_code: '  @T-01', rating: '\t+obs' },
    ]);
    expect(udlCsv).toBe("session_id,classroom_code,rating\r\n'|s1,'  @T-01,'\t+obs");
  });
});

describe('Wave 85: Stacked modal re-render focus retention, IME Escape & background inert isolation', () => {
  it('EndSessionPreview retains textarea focus across parent note re-renders, isolates background siblings, guards IME Escape, and restores opener', () => {
    const keepOpenSnapshots = [];
    function Harness() {
      const [note, setNote] = React.useState('');
      return React.createElement(EndSessionPreview, {
        preview: {
          summary: { participants: { 'Azure Fox': {} }, absentCodenames: [], unmatchedCodenames: [] },
          busy: false,
          followUpBusy: '',
          followUpResourceId: '',
          followUpResources: [],
          followUpStatus: '',
          deliveryGuard: false,
          deliverySummary: null,
        },
        note,
        canSaveSummary: true,
        groupNamesById: {},
        copyToClipboard: () => {},
        getConnectedCount: () => 0,
        onFollowUpResourceChange: () => {},
        onSendCohort: () => {},
        onNoteChange: setNote,
        onKeepOpen: () => keepOpenSnapshots.push(note),
        onComplete: () => {},
      });
    }

    const { opener, main, scriptTag, host, unmount } = mountWithBackdrop(React.createElement(Harness));
    const dialog = host.querySelector('[role="dialog"]');
    const textarea = host.querySelector('#end-session-note');
    expect(dialog).not.toBeNull();
    expect(textarea).not.toBeNull();
    expect(main.hasAttribute('inert')).toBe(true);
    expect(main.getAttribute('aria-hidden')).toBe('true');
    expect(scriptTag.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');

    act(() => {
      textarea.focus();
    });
    expect(document.activeElement).toBe(textarea);

    // Simulate controlled typing causing parent re-renders with fresh inline onKeepOpen closures.
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    act(() => {
      nativeValueSetter.call(textarea, 'Azure Fox showed strong persistence');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(textarea.value).toBe('Azure Fox showed strong persistence');
    expect(document.activeElement).toBe(textarea);

    // IME composition Escape must not close the modal.
    dispatchKey(textarea, { key: 'Escape', isComposing: true });
    dispatchKey(textarea, { key: 'Escape', keyCode: 229 });
    expect(keepOpenSnapshots).toEqual([]);

    // Shift+Tab from the dialog container itself wraps to the last focusable button.
    act(() => {
      dialog.focus();
    });
    dispatchKey(dialog, { key: 'Tab', shiftKey: true });
    const buttons = Array.from(dialog.querySelectorAll('button:not([disabled])'));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    // Real Escape calls the latest ref-stabilized onKeepOpen callback.
    dispatchKey(dialog, { key: 'Escape' });
    expect(keepOpenSnapshots).toEqual(['Azure Fox showed strong persistence']);

    unmount();
    expect(main.hasAttribute('inert')).toBe(false);
    expect(main.getAttribute('aria-hidden')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
  });

  it('CanvasRecoveryDialogView retains focus across prop updates, honors latest decision state on Escape, and restores background state', () => {
    const closedWith = [];
    const baseProps = {
      canvasRecoveryDialogMode: 'choice',
      canvasRecoveryStore: { snapshots: [] },
      canvasRecoveryDecisionMade: false,
      canvasRecoveryVaultForm: { mode: '' },
      canvasRecoveryBusyId: '',
      closeCanvasRecoveryDialog: () => closedWith.push('initial'),
      startFreshCanvasWorkspace: () => {},
      RefreshCw: () => null,
      t: () => '',
    };

    const { opener, main, host, rerender, unmount } = mountWithBackdrop(
      React.createElement(CanvasRecoveryDialogView, baseProps)
    );
    const dialog = host.querySelector('[role="dialog"]');
    const startFreshBtn = host.querySelector('[data-recovery-autofocus="true"]');
    expect(main.hasAttribute('inert')).toBe(true);
    expect(main.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(startFreshBtn);

    // Decision not yet made: Escape is ignored.
    dispatchKey(startFreshBtn, { key: 'Escape' });
    expect(closedWith).toEqual([]);

    // Re-render with decision made and a new callback; focus on startFreshBtn must stay intact.
    rerender(
      React.createElement(CanvasRecoveryDialogView, {
        ...baseProps,
        canvasRecoveryDecisionMade: true,
        closeCanvasRecoveryDialog: () => closedWith.push('updated'),
      })
    );
    expect(document.activeElement).toBe(startFreshBtn);

    // IME Escape ignored; real Escape uses updated callback.
    dispatchKey(startFreshBtn, { key: 'Escape', isComposing: true });
    expect(closedWith).toEqual([]);
    dispatchKey(startFreshBtn, { key: 'Escape' });
    expect(closedWith).toEqual(['updated']);

    unmount();
    expect(main.hasAttribute('inert')).toBe(false);
    expect(main.getAttribute('aria-hidden')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
    expect(dialog.isConnected).toBe(false);
  });

  it('LiveSessionDockView, VideoLibraryOverlay, and VideoRefPlayerOverlay isolate background siblings, guard IME Escape, wrap Tab/Shift+Tab, and restore opener', () => {
    // 1. LiveSessionDockView
    const dockCalls = [];
    const sharedDockRef = React.createRef();
    const dockMount = mountWithBackdrop(
      React.createElement(LiveSessionDockView, makePropsForDock((v) => dockCalls.push(['first', v])))
    );
    function makePropsForDock(setShowLiveDock) {
      return makeLiveDockProps({
        liveDockPanelRef: sharedDockRef,
        setShowLiveDock,
        requestEndLiveSession: () => {},
      });
    }
    const dockDialog = dockMount.host.querySelector('[role="dialog"]');
    const dockCloseBtn = dockMount.host.querySelector('button[aria-label="Close"]');
    expect(dockMount.main.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    act(() => dockCloseBtn.focus());
    dockMount.rerender(
      React.createElement(LiveSessionDockView, makePropsForDock((v) => dockCalls.push(['second', v])))
    );
    expect(document.activeElement).toBe(dockCloseBtn);
    dispatchKey(dockCloseBtn, { key: 'Escape', keyCode: 229 });
    expect(dockCalls).toEqual([]);
    dispatchKey(dockCloseBtn, { key: 'Escape' });
    expect(dockCalls).toEqual([['second', false]]);
    dockMount.unmount();
    expect(dockMount.main.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(dockMount.opener);
    document.body.innerHTML = '';

    // 2. VideoLibraryOverlay (includes closed <details> transcript summary)
    const libCloses = [];
    const libMount = mountWithBackdrop(
      React.createElement(VideoLibraryOverlay, { onClose: () => libCloses.push('closed'), t: () => undefined })
    );
    const libInner = libMount.host.querySelector('[tabindex="-1"]');
    const libCloseBtn = libMount.host.querySelector('button[aria-label="Close video library"]');
    const libSummary = libMount.host.querySelector('details > summary');
    expect(libMount.main.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(libCloseBtn);

    act(() => libInner.focus());
    dispatchKey(libInner, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(libSummary);
    dispatchKey(libSummary, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(libCloseBtn);
    dispatchKey(libCloseBtn, { key: 'Escape', isComposing: true });
    expect(libCloses).toEqual([]);
    dispatchKey(libCloseBtn, { key: 'Escape' });
    expect(libCloses).toEqual(['closed']);
    libMount.unmount();
    expect(libMount.main.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(libMount.opener);
    document.body.innerHTML = '';

    // 3. VideoRefPlayerOverlay
    const refCloses = [];
    const refMount = mountWithBackdrop(
      React.createElement(VideoRefPlayerOverlay, {
        item: {
          title: 'Demo reference',
          data: { title: 'Demo reference', durationSec: 30, hostedUrl: 'https://example.com/watch' },
        },
        onClose: () => refCloses.push('ref-closed'),
        addToast: () => {},
        t: () => '',
      })
    );
    const refInner = refMount.host.querySelector('[tabindex="-1"]');
    const refCloseBtn = refMount.host.querySelector('button[aria-label="Close video card"]');
    const refPickerLabel = refMount.host.querySelector('label[role="button"]');
    expect(refMount.main.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(refCloseBtn);

    act(() => refInner.focus());
    dispatchKey(refInner, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(refPickerLabel);
    dispatchKey(refCloseBtn, { key: 'Escape', keyCode: 229 });
    expect(refCloses).toEqual([]);
    dispatchKey(refCloseBtn, { key: 'Escape' });
    expect(refCloses).toEqual(['ref-closed']);
    refMount.unmount();
    expect(refMount.main.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(refMount.opener);
    expect(dockDialog.isConnected).toBe(false);
  });
});

describe('Wave 86: 4-mirror SHA-256 parity & 3-host browser delivery manifest integrity', () => {
  const WAVE_84_85_MODULES = [
    'allohaven_module.js',
    'behavior_lens_module.js',
    'lingua_practice_module.js',
    'dispro_analyzer_module.js',
    'mtss_triage_module.js',
    'sped_timelines_module.js',
    'udl_walkthrough_module.js',
    'view_end_session_preview_module.js',
    'view_canvas_recovery_dialog_module.js',
    'view_live_session_dock_module.js',
    'view_video_library_module.js',
    'view_video_ref_player_module.js',
  ];

  const MIRROR_DIRS = [
    '.',
    'desktop/web-app/public',
    'desktop/app-build',
    'desktop/web-app/build',
  ];

  const HOST_FILES = [
    'AlloFlowANTI.txt',
    'desktop/web-app/src/AlloFlowANTI.txt',
    'desktop/web-app/src/App.jsx',
  ];

  it('keeps all 12 Wave 84-85 runtime modules byte-identical across all 4 mirrors and pinned in all 3 host manifests', () => {
    const manifests = HOST_FILES.map((rel) =>
      readEmbeddedManifest(readFileSync(resolve(ROOT, rel), 'utf8'))
    );

    for (const mod of WAVE_84_85_MODULES) {
      const rootPath = resolve(ROOT, mod);
      const expectedHash = sha256(rootPath);
      const expectedBytes = readFileSync(rootPath).length;
      const expectedIntegrity = sha384Integrity(rootPath);

      for (const dir of MIRROR_DIRS.slice(1)) {
        const mirrorPath = resolve(ROOT, dir, mod);
        expect(sha256(mirrorPath), `${dir}/${mod} SHA-256 mismatch`).toBe(expectedHash);
      }

      for (let i = 0; i < HOST_FILES.length; i += 1) {
        const entry = manifests[i]?.assets?.[mod];
        expect(entry, `${HOST_FILES[i]} missing manifest entry for ${mod}`).toBeDefined();
        expect(entry.bytes, `${HOST_FILES[i]} bytes mismatch for ${mod}`).toBe(expectedBytes);
        expect(entry.integrity, `${HOST_FILES[i]} integrity mismatch for ${mod}`).toBe(expectedIntegrity);
      }
    }
  });
});
