import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import * as engine from '../connected_escape_room_engine.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { makeRoom } = require('../dev-tools/fixtures/connected_escape_room.cjs');

let React;
let ReactDOMClient;
let act;
let SpotlightTourView;
let InfoModal;
let CanvasRecoveryDialogView;
let ConnectedEscapeRoomSolo;
let ConnectedEscapeRoomTeacher;

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
  ({ act } = React);
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const icon of [
    'Sparkles', 'X', 'Layers', 'BookOpen', 'CheckSquare', 'Globe', 'Search',
    'ShieldCheck', 'MonitorPlay', 'ArrowLeft', 'ExternalLink', 'Code', 'Users',
    'Heart', 'RefreshCw', 'Layout', 'ImageIcon', 'Quote', 'Lightbulb', 'MapIcon',
    'ListOrdered', 'Filter', 'Calculator', 'ClipboardList', 'Terminal', 'History',
    'Wifi', 'Cloud', 'Mic', 'Download', 'Clock', 'Gamepad2', 'Ear', 'FileQuestion',
    'MessageCircleQuestion',
  ]) {
    if (!window[icon]) window[icon] = () => null;
  }
  window.__alloFirebase = { db: {}, doc: () => ({}), updateDoc: vi.fn() };
  loadAlloModule('view_spotlight_tour_module.js');
  loadAlloModule('view_info_modal_module.js');
  loadAlloModule('view_canvas_recovery_dialog_module.js');
  loadAlloModule('connected_escape_room_module.js');
  SpotlightTourView = window.AlloModules.SpotlightTourView;
  InfoModal = window.AlloModules.InfoModal?.InfoModal || window.AlloModules.InfoModal;
  CanvasRecoveryDialogView = window.AlloModules.CanvasRecoveryDialogView;
  ConnectedEscapeRoomSolo = window.AlloModules.ConnectedEscapeRoomSolo;
  ConnectedEscapeRoomTeacher = window.AlloModules.ConnectedEscapeRoomTeacher;
});

afterEach(async () => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    await act(async () => { root.unmount(); });
    host.remove();
  }
  delete window.callTTS;
  delete window.__alloFocusTrapStack;
  delete window.__alloScrollLockState;
  document.body.style.overflow = '';
  sessionStorage.clear();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('Wave 17 polish — SpotlightTourView, InfoModal, CanvasRecoveryDialogView, ConnectedEscapeRoom', () => {
  it('SpotlightTourView preserves 2-button contract, announces read-aloud state politely, adds Esc footer hint, and passes axe', async () => {
    let resolveTts;
    window.callTTS = vi.fn(() => new Promise((r) => { resolveTts = r; }));
    const onSetSpotlight = vi.fn();
    const host = mountEl(React.createElement(SpotlightTourView, {
      t: (key, opts) => (key === 'common.close' ? 'Close' : (opts?.defaultValue || key)),
      tourRect: { top: 80, left: 60, right: 160, bottom: 120, width: 100, height: 40 },
      spotlightMessage: {
        title: 'Quick Tip',
        text: 'First line of help.\n- Bullet item one\n- Bullet item two',
      },
      spotlightOpenTimeRef: { current: 0 },
      setIsSpotlightMode: onSetSpotlight,
    }));

    const dialog = host.querySelector('#spotlight-message-panel');
    expect(dialog).toBeTruthy();
    expect(dialog.querySelectorAll('button')).toHaveLength(2);
    expect(dialog.textContent).toContain('Esc');
    expect(dialog.textContent).toContain('to close');

    const status = dialog.querySelector('[data-spotlight-tts-status]');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('data-spotlight-tts-status')).toBe('idle');
    expect(status?.textContent.trim()).toBe('');

    const readBtn = dialog.querySelector('button[aria-label="Read this aloud"]');
    expect(readBtn).toBeTruthy();
    expect(readBtn.getAttribute('aria-pressed')).toBe('false');

    await act(async () => { readBtn.click(); });
    expect(status.getAttribute('data-spotlight-tts-status')).toBe('loading');
    expect(status.textContent).toContain('Loading voice');

    await act(async () => { resolveTts(null); await Promise.resolve(); });
    expect(status.getAttribute('data-spotlight-tts-status')).toBe('idle');

    // Defensive backdrop click works even when debugLog is omitted
    const backdrop = host.querySelector('[role="presentation"]');
    await act(async () => { backdrop.click(); });
    expect(onSetSpotlight).toHaveBeenCalledWith(false);

    await runAxe(dialog);
  });

  it('InfoModal filters Feature Guide by category pills with reset, renders Open Source summary counts, and passes axe', async () => {
    const featuresList = {
      categories: { creation: 'Create', activities: 'Activities', platform: 'Platform' },
      items: [
        { title: 'Leveled Reader', icon: 'BookOpen', desc: 'Adapt reading passages', category: 'creation', color: 'indigo' },
        { title: 'SEL Hub', icon: 'Heart', desc: 'Social-emotional activities', category: 'activities', color: 'rose' },
        { title: 'STEM Lab', icon: 'Layers', desc: 'Interactive STEM labs', category: 'platform', color: 'teal' },
      ],
    };
    const t = (key) => {
      if (key === 'about.features_list') return featuresList;
      return {
        'about.title': 'About AlloFlow',
        'about.tab_about': 'About',
        'about.tab_atlas': 'Atlas',
        'about.tab_features': 'Feature Guide',
        'about.tab_privacy': 'Privacy',
        'about.tab_opensource': 'Open Source',
        'common.close': 'Close',
        'tips.pro_tip_label': 'Tip:',
        'profiles.title': 'Profiles',
      }[key] || key;
    };
    const noop = () => {};
    const baseProps = {
      handleSetInfoModalTabToAbout: noop,
      handleSetInfoModalTabToAtlas: noop,
      handleSetInfoModalTabToFeatures: noop,
      handleSetInfoModalTabToPrivacy: noop,
      handleSetInfoModalTabToOpenSource: noop,
      handleSetShowInfoModalToFalse: noop,
      safeRemoveItem: noop,
      setShowInfoModal: noop,
      setShowWizard: noop,
      t,
    };

    const host = mountEl(React.createElement(InfoModal, { ...baseProps, infoModalTab: 'features' }));
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    const catGroup = dialog.querySelector('[role="group"][aria-label="Filter guided workflows by category"]');
    expect(catGroup).toBeTruthy();
    const activitiesBtn = catGroup.querySelector('[data-feature-category="activities"]');
    expect(activitiesBtn.textContent).toContain('Activities (1)');
    expect(activitiesBtn.className).toContain('min-h-11');

    act(() => { activitiesBtn.click(); });
    expect(activitiesBtn.getAttribute('aria-pressed')).toBe('true');
    expect(dialog.querySelectorAll('[data-feature-guide-key]')).toHaveLength(1);
    expect(dialog.querySelector('[role="status"]').textContent).toContain('Showing 1 of 3 guides in Activities');

    const searchInput = dialog.querySelector('#feature-guide-search');
    setFieldValue(searchInput, 'unmatched-query-xyz');
    expect(dialog.querySelectorAll('[data-feature-guide-key]')).toHaveLength(0);
    const resetBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Reset filters');
    expect(resetBtn).toBeTruthy();
    act(() => { resetBtn.click(); });
    expect(dialog.querySelectorAll('[data-feature-guide-key]')).toHaveLength(3);
    expect(searchInput.value).toBe('');

    await runAxe(dialog);

    const ossHost = mountEl(React.createElement(InfoModal, { ...baseProps, infoModalTab: 'opensource' }));
    const ossDialog = ossHost.querySelector('[role="dialog"]');
    const ossSummary = ossDialog.querySelector('[aria-label="Open-source attribution summary"]');
    expect(ossSummary).toBeTruthy();
    expect(ossSummary.textContent).toMatch(/\d+ integrated learning tools/);
    expect(ossSummary.textContent).toMatch(/\d+ credited libraries/);
    expect(ossSummary.textContent).toMatch(/\d+ reading catalog sources/);
    await runAxe(ossDialog);
  });

  it('CanvasRecoveryDialogView shows workspace capacity progressbar, progressive filters for 4+ workspaces, layered Escape cancel, and passes axe', async () => {
    const snapshots = [
      { id: 's1', title: 'Biology Unit', resourceCount: 3, savedAt: '2026-11-20T10:00:00Z', approximateBytes: 4096, assetPolicy: 'full', pinned: true, workspace: {} },
      { id: 's2', title: 'Civic Essay Draft', resourceCount: 1, savedAt: '2026-11-19T10:00:00Z', approximateBytes: 2048, assetPolicy: 'full', pinned: false, workspace: { builderDraft: { title: 'Civic Essay' } } },
      { id: 's3', title: 'Fractions Lab', resourceCount: 2, savedAt: '2026-11-18T10:00:00Z', approximateBytes: 2048, assetPolicy: 'full', pinned: false, workspace: {} },
      { id: 's4', title: 'Reading Group', resourceCount: 2, savedAt: '2026-11-17T10:00:00Z', approximateBytes: 2048, assetPolicy: 'text-only', pinned: false, workspace: {} },
    ];
    const closeSpy = vi.fn();
    const setEraseSpy = vi.fn();
    const baseProps = {
      ALLO_WORKSPACE_RECOVERY: {
        retentionStatus: () => ({ count: 4, maxSnapshots: 4, bytes: 10240, maxTotalBytes: 50 * 1024 * 1024, pinnedCount: 1, policyId: 'compact', effectivePolicyId: 'compact', overTarget: false }),
        totalBytes: () => 10240,
      },
      RefreshCw: () => null,
      _alloFormatWorkspaceBytes: (n) => `${Math.round(n / 1024)} KB`,
      alloModelStatus: { whisper: true, kokoro: false, busy: '', loading: false, bytes: 0 },
      approveAndRetryCanvasRecoveryStorage: vi.fn(),
      canvasRecoveryBusyId: '',
      canvasRecoveryDecisionMade: true,
      canvasRecoveryDialogMode: 'manage',
      canvasRecoveryEraseId: 's1',
      canvasRecoveryError: '',
      canvasRecoveryErrorCode: '',
      canvasRecoveryImportInputRef: { current: null },
      canvasRecoveryRemoveMediaId: null,
      canvasRecoveryStore: { snapshots },
      canvasRecoveryStoreAuthoritative: true,
      canvasRecoveryVaultForm: { mode: '' },
      canvasRecoveryVaultState: { enabled: false },
      closeCanvasRecoveryDialog: closeSpy,
      continueWithoutCanvasRecovery: vi.fn(),
      deleteCachedPdfRemediation: vi.fn(),
      deleteCachedPdfRemediationEntry: vi.fn(),
      downloadKokoroModel: vi.fn(),
      downloadWhisperModel: vi.fn(),
      eraseCanvasRecoverySnapshot: vi.fn(),
      exportCanvasRecoverySnapshot: vi.fn(),
      handleCanvasRecoveryImport: vi.fn(),
      isCanvas: false,
      lastPdfAuditResultRef: { current: null },
      openCachedPdfRemediation: vi.fn(),
      openCanvasDocumentHubDraft: vi.fn(),
      openCanvasRecoveryManager: vi.fn(),
      pdfActiveRemediationStorageKey: '',
      pdfAuditResult: null,
      pdfFixResult: null,
      pdfRemediationCacheEntries: [],
      pdfRemediationDeleteConfirm: null,
      refreshStorageManagerInventory: vi.fn(),
      removeCanvasRecoverySnapshotMedia: vi.fn(),
      renderCanvasRecoveryLockedScreen: () => null,
      renderCanvasRecoveryProtectionSection: () => null,
      renderEducatorAccessCodeSection: () => null,
      requestCanvasRecoveryErase: vi.fn(),
      restoreCachedPdfRemediation: vi.fn(),
      restoreCanvasWorkspaceSnapshot: vi.fn(),
      retryCanvasRecoveryStorage: vi.fn(),
      setCanvasRecoveryDialogMode: vi.fn(),
      setCanvasRecoveryEraseId: setEraseSpy,
      setCanvasRecoveryRemoveMediaId: vi.fn(),
      setCanvasRecoverySnapshotPinned: vi.fn(),
      setPdfRemediationDeleteConfirm: vi.fn(),
      setStorageRetentionPolicy: vi.fn(),
      startFreshCanvasWorkspace: vi.fn(),
      storageManagerInventory: { loading: false, origin: { usage: 10240, quota: 1024000, persisted: true }, managed: [], deviceNamespaces: [] },
      t: () => '',
    };

    const host = mountEl(React.createElement(CanvasRecoveryDialogView, baseProps));
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    // Capacity progressbar + At target indicator
    const progress = dialog.querySelector('[role="progressbar"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('aria-valuenow')).toBe('4');
    expect(progress.getAttribute('aria-valuemax')).toBe('4');
    expect(progress.getAttribute('aria-valuetext')).toContain('100%');
    expect(dialog.textContent).toContain('At target');

    // Escape cancels inline erase confirmation first instead of closing dialog
    act(() => {
      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(setEraseSpy).toHaveBeenCalledWith(null);
    expect(closeSpy).not.toHaveBeenCalled();

    // Filter pills + search work for 4+ workspaces
    const pinnedBtn = dialog.querySelector('[data-recovery-filter="pinned"]');
    expect(pinnedBtn.textContent).toContain('Pinned (1)');
    act(() => { pinnedBtn.click(); });
    expect(dialog.textContent).toContain('Showing 1 of 4 saved workspaces');
    expect(dialog.textContent).toContain('Biology Unit');
    expect(dialog.textContent).not.toContain('Fractions Lab');

    const search = dialog.querySelector('#canvas-recovery-workspace-search');
    setFieldValue(search, 'no-such-workspace');
    const resetBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Reset filters');
    expect(resetBtn).toBeTruthy();
    act(() => { resetBtn.click(); });
    expect(dialog.textContent).toContain('Fractions Lab');

    await runAxe(dialog);
  });

  it('ConnectedEscapeRoom adds area/object status cues, arrow-key RouteMap navigation, teacher progressbar, and passes axe', async () => {
    const room = makeRoom();
    room.nodes[5].type = 'route';
    room.nodes[5].grid = { size: 3, originX: 1, originY: 1, dx: 1, dy: 1 };
    const t = (k) => k;

    const soloHost = mountEl(React.createElement(ConnectedEscapeRoomSolo, {
      room,
      user: { uid: 'u1' },
      onExit: vi.fn(),
      t,
    }));

    const soloProgress = soloHost.querySelector('[role="progressbar"]');
    expect(soloProgress.getAttribute('aria-valuetext')).toContain('0%');
    expect(soloHost.querySelector('[data-active-area-progress]').textContent).toContain('0/');
    expect(soloHost.querySelector('[data-object="lens"]').getAttribute('data-object-status')).toBe('available');
    expect(soloHost.querySelector('[data-object="wall"]').getAttribute('data-object-status')).toBe('locked');

    // Area buttons keep exact textContent while exposing progress data attributes
    const archiveBtn = Array.from(soloHost.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Archive');
    expect(archiveBtn).toBeTruthy();
    expect(archiveBtn.getAttribute('data-area-solved')).toBe('0');

    // Solve lens -> status flips to solved and progress updates
    await act(async () => { soloHost.querySelector('[data-submit-object="lens"]').click(); });
    expect(soloHost.querySelector('[data-object="lens"]').getAttribute('data-object-status')).toBe('solved');
    expect(soloHost.querySelector('[data-active-area-progress]').textContent).toContain('1/');

    // Unlock route puzzle & verify IME-safe Arrow-key navigation on RouteMap
    const routeSession = {
      hostId: 'host',
      roster: { u1: { uid: 'u1', name: 'Avery' } },
      escapeRoomState: engine.createSession(room, 'host', { u1: { uid: 'u1' } }),
    };
    const routeProgress = routeSession.escapeRoomState.teamProgress.All.connected[routeSession.escapeRoomState.attemptId];
    routeProgress.solved = { notes: true, ledger: true };
    const routeHost = mountEl(React.createElement(window.AlloModules.ConnectedEscapeRoomStudent, {
      appId: 'app',
      targetAppId: 'app',
      activeSessionCode: 'ROOM',
      user: { uid: 'u1' },
      sessionData: routeSession,
      t,
    }));
    await act(async () => { Array.from(routeHost.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Archive').click(); });
    await act(async () => { routeHost.querySelector('[data-object="sequence"]').click(); });
    const dirGroup = routeHost.querySelector('.cer-directions');
    expect(dirGroup?.getAttribute('role')).toBe('group');
    // IME-composed ArrowUp must be ignored
    const imeEvent = new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    Object.defineProperty(imeEvent, 'keyCode', { value: 229 });
    await act(async () => { dirGroup.dispatchEvent(imeEvent); });
    expect(routeHost.querySelector('svg').getAttribute('aria-label')).toContain('column 1, row 1');
    // Normal ArrowUp + ArrowRight move smoothly to column 2, row 2
    await act(async () => {
      dirGroup.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    });
    await act(async () => {
      dirGroup.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(routeHost.querySelector('svg').getAttribute('aria-label')).toContain('column 2, row 2');

    // Teacher view includes visual progressbar, status pill, and per-area counts
    const sessionData = {
      hostId: 'host',
      roster: { u1: { uid: 'u1', name: 'Avery' } },
      escapeRoomState: engine.createSession(room, 'host', { u1: { uid: 'u1' } }),
    };
    sessionData.escapeRoomState.teamProgress.All.connected[sessionData.escapeRoomState.attemptId].solved.lens = true;
    const teacherHost = mountEl(React.createElement(ConnectedEscapeRoomTeacher, {
      appId: 'app',
      activeSessionCode: 'ROOM',
      sessionData,
      t,
    }));

    const teacherProgress = teacherHost.querySelector('[role="progressbar"]');
    expect(teacherProgress).toBeTruthy();
    expect(teacherProgress.getAttribute('aria-valuenow')).toBe('1');
    expect(teacherHost.querySelector('[data-room-state="live"]').textContent.trim()).toBe('Live');
    expect(teacherHost.textContent).toContain('(1/');

    await runAxe(soloHost);
    await runAxe(teacherHost);
  });
});
