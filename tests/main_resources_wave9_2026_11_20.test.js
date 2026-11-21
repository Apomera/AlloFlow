// Wave 9 regression suite (2026-11-20): P0 Security, UI Deadlocks & Data Integrity
// across ConfirmDialog, SessionModal, LiveLessonRun, LiveSessionDock, EndSessionPreview,
// ShareSessionSurfaces, HostHandlers, EducatorHubModal, ExportPreview, PersonaChat & AdventureSettings.
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
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Wave 9 — P0 Security, UI Deadlocks & Data Integrity', () => {
  it('raises ConfirmDialog backdrop z-index above EndSessionPreview (z-[10050] > z-[10020]) to prevent UI deadlocks', () => {
    loadAlloModule('view_confirm_dialog_module.js');
    const ConfirmDialog = window.AlloModules.ConfirmDialog?.ConfirmDialog || window.AlloModules.ConfirmDialog;
    expect(typeof ConfirmDialog).toBe('function');

    const { container, unmount } = mountElement(
      React.createElement(ConfirmDialog, {
        confirmDialog: { title: 'Confirm audio', message: 'Proceed?', onConfirm: vi.fn(), onCancel: vi.fn() },
        setConfirmDialog: vi.fn(),
        t: (k) => k,
      })
    );

    const backdrop = container.querySelector('[role="presentation"]');
    expect(backdrop).not.toBeNull();
    expect(backdrop.className).toContain('z-[10050]');
    expect(backdrop.className).not.toContain('z-[9999]');
    unmount();
  });

  it('retains live reflection organizer evidence in buildRosterSessionSummary and copies activeSessionAppId in SessionModal', () => {
    loadAlloModule('view_session_modal_module.js');
    const mod = window.AlloModules.SessionModal;
    expect(typeof mod.buildRosterSessionSummary).toBe('function');

    const summary = mod.buildRosterSessionSummary({
      rosterKey: { students: { 'Fox-1': {} } },
      sessionData: {
        interactiveOrganizer: { type: 'reflection', activityId: 'refl-1', structureType: 'KWL Chart' },
        roster: {
          u1: {
            name: 'Fox-1',
            organizerProgress: { activityId: 'refl-1', type: 'reflection', status: 'complete', score: 0, correct: 1, total: 1, attempts: 1, at: Date.now() },
          },
        },
      },
      sessionCode: 'ABCD',
    });

    expect(summary.organizerActivity).toBeTruthy();
    expect(summary.organizerActivity.type).toBe('reflection');
    expect(summary.organizerActivity.statusCounts.complete).toBe(1);

    // SessionModal Host ID uses activeSessionAppId || appId
    const copyToClipboard = vi.fn();
    const { container, unmount } = mountElement(
      React.createElement(mod.SessionModal, {
        showSessionModal: true,
        setShowSessionModal: vi.fn(),
        activeSessionCode: 'ABCD',
        activeSessionAppId: 'custom-host-app-id',
        appId: 'default-app-id',
        sessionData: { roster: {} },
        isProjectionMode: false,
        setIsProjectionMode: vi.fn(),
        copyToClipboard,
        t: (k) => k,
      })
    );

    const copyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('custom-host-app-id')
    );
    expect(copyBtn).not.toBeNull();
    expect(container.textContent).not.toContain('default-app-id');
    act(() => { copyBtn.click(); });
    expect(copyToClipboard).toHaveBeenCalledWith('custom-host-app-id');
    unmount();
  });

  it('renders EndSessionPreview safely when note prop is omitted (undefined)', () => {
    loadAlloModule('view_end_session_preview_module.js');
    const EndSessionPreview = window.AlloModules.EndSessionPreview?.EndSessionPreview || window.AlloModules.EndSessionPreview;
    expect(typeof EndSessionPreview).toBe('function');

    const { container, unmount } = mountElement(
      React.createElement(EndSessionPreview, {
        preview: {
          sessionCode: 'ABCD',
          summary: { rosterCount: 1, connectedCount: 1, cohorts: [] },
          followUpResources: [],
          selectedFollowUpResourceId: '',
          followUpBusy: '',
          followUpStatus: '',
          busy: false,
        },
        note: undefined,
        canSaveSummary: true,
        groupNamesById: {},
        copyToClipboard: vi.fn(),
        getConnectedCount: () => 1,
        onFollowUpResourceChange: vi.fn(),
        onSendCohort: vi.fn(),
        onNoteChange: vi.fn(),
        onKeepOpen: vi.fn(),
        onComplete: vi.fn(),
      })
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    unmount();
  });

  it('handles pendingConfirmation in HostHandlers sendEndSessionEvidenceCohort and falls back to mbConfig in connectMailbox', async () => {
    loadAlloModule('host_handlers_module.js');
    let previewState = {
      summary: { cohorts: [{ code: 'needs-support', memberUids: ['u1'] }] },
      selectedFollowUpResourceId: 'ws-1',
      followUpBusy: '',
      followUpStatus: '',
    };
    const mailboxCalls = [];
    const setMbStatus = vi.fn();
    const setMbBusy = vi.fn();
    const handlers = window.AlloModules.HostHandlers({
      activeSessionCode: 'ABCD',
      endSessionPreview: previewState,
      setEndSessionPreview: (fn) => { previewState = typeof fn === 'function' ? fn(previewState) : fn; },
      getEndSessionSummaryApi: () => ({
        buildRosterSessionSummary: () => ({ cohorts: [{ code: 'needs-support', memberUids: ['u1'] }] }),
      }),
      history: [{ id: 'ws-1', type: 'word-sounds', data: { words: ['cat'] } }],
      generatedContent: { id: 'ws-1', type: 'word-sounds', data: { words: ['cat'] } },
      sessionData: { roster: { u1: { name: 'Fox' } } },
      mbUrlInput: '',
      mbAdminInput: '',
      mbConfig: { url: 'https://script.google.com/macros/s/abc/exec', admin: 'secret-token' },
      _alloCleanMailboxUrl: (u) => String(u || '').trim(),
      _alloMailboxCall: async (url, payload) => {
        mailboxCalls.push({ url, payload });
        if (payload.a === 'hello') return { v: 32 };
        if (payload.a === 'auth') return { admin: payload.admin === 'secret-token' };
        return {};
      },
      setMbStatus,
      setMbBusy,
      setMbConfig: vi.fn(),
      setMbResumable: vi.fn(),
      setMbUrlInput: vi.fn(),
      setMbAdminInput: vi.fn(),
      alloPersistMailboxConfig: vi.fn(),
      ALLO_MB_ADMIN_KEY: 'test_admin',
      ALLO_MB_URL_KEY: 'test_url',
      addToast: vi.fn(),
      t: (k) => k,
    });

    await handlers.connectMailbox();
    expect(mailboxCalls.some((c) => c.url === 'https://script.google.com/macros/s/abc/exec' && c.payload.a === 'hello')).toBe(true);
    expect(mailboxCalls.some((c) => c.payload.a === 'auth' && c.payload.admin === 'secret-token')).toBe(true);

    // Verify pendingConfirmation guards in both HostHandlers and LiveLessonRun
    const hhSrc = fs.readFileSync(path.join(ROOT, 'host_handlers_module.js'), 'utf8');
    expect(hhSrc).toContain('result.pendingConfirmation');
    const llrSrc = fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_module.js'), 'utf8');
    expect(llrSrc).toContain('result.pendingConfirmation');
  });

  it('reconnects without wiping mbConfig and displays QR error fallback in ClassMailboxSetupView', () => {
    loadAlloModule('view_share_session_surfaces_module.js');
    const ClassMailboxSetupView = window.AlloModules.ClassMailboxSetupView;
    expect(typeof ClassMailboxSetupView).toBe('function');

    // 1. Update notice reconnect does not wipe mbConfig when mbUrlInput is empty
    const connectMailbox = vi.fn();
    const setMbConfig = vi.fn();
    const setMbUrlInput = vi.fn();
    const NoopIcon = () => null;
    const baseMbProps = {
      ClipboardList: NoopIcon, Copy: NoopIcon, ExternalLink: NoopIcon, Eye: NoopIcon, EyeOff: NoopIcon,
      FolderDown: NoopIcon, Maximize: NoopIcon, Printer: NoopIcon, Sparkles: NoopIcon, X: NoopIcon,
      mailboxScriptState: { status: 'ready' },
      mbHwEvidence: {},
      mbResumable: [],
      mbRoster: {},
      copyToClipboard: vi.fn(),
      t: (k) => k,
    };
    const updateMount = mountElement(
      React.createElement(ClassMailboxSetupView, {
        ...baseMbProps,
        mbConfig: { url: 'https://script.google.com/macros/s/abc/exec', v: 27 },
        mbLive: null,
        mbUrlInput: '',
        mbBusy: false,
        connectMailbox,
        setMbConfig,
        setMbUrlInput,
        setMbStatus: vi.fn(),
      })
    );
    const reconnectBtn = Array.from(updateMount.container.querySelectorAll('button')).find((b) =>
      /Connect/i.test(b.textContent || '')
    );
    expect(reconnectBtn).not.toBeNull();
    act(() => { reconnectBtn.click(); });
    expect(connectMailbox).toHaveBeenCalledTimes(1);
    expect(setMbConfig).not.toHaveBeenCalledWith(null);
    updateMount.unmount();

    // 2. QR error fallback renders alert instead of infinite validating message
    const qrMount = mountElement(
      React.createElement(ClassMailboxSetupView, {
        ...baseMbProps,
        mbConfig: { url: 'https://script.google.com/macros/s/abc/exec', v: 32 },
        mbLive: { code: 'WXYZ', joinUrl: 'https://example.com/join' },
        mbQrSvg: '',
        mbQrError: true,
      })
    );
    const alertEl = qrMount.container.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(qrMount.container.textContent).not.toContain('Validating live-session QR');
    qrMount.unmount();
  });

  it('blocks EducatorHubModal when isTeacherMode is explicitly false while keeping legacy mounts working', () => {
    loadAlloModule('view_educator_hub_modal_module.js');
    const EducatorHubModal = window.AlloModules.EducatorHubModal?.EducatorHubModal || window.AlloModules.EducatorHubModal;
    expect(typeof EducatorHubModal).toBe('function');

    const studentMount = mountElement(
      React.createElement(EducatorHubModal, {
        showEducatorHub: true,
        isTeacherMode: false,
        setShowEducatorHub: vi.fn(),
        t: () => '',
      })
    );
    expect(studentMount.container.innerHTML).toBe('');
    studentMount.unmount();

    const teacherMount = mountElement(
      React.createElement(EducatorHubModal, {
        showEducatorHub: true,
        isTeacherMode: true,
        setShowEducatorHub: vi.fn(),
        t: () => '',
      })
    );
    expect(teacherMount.container.querySelector('[role="dialog"]')).not.toBeNull();
    teacherMount.unmount();
  });

  it('locks Teacher-defined resources in AdventureSettingsPanel for students even when lockAllSettings is off', () => {
    loadAlloModule('view_adventure_module.js');
    const SettingsPanel = window.AlloModules.AdventureView?.AdventureSettingsPanel
      || window.AlloModules.AdventureSettingsPanel;
    if (typeof SettingsPanel === 'function') {
      const setAdventureState = vi.fn();
      const { container, unmount } = mountElement(
        React.createElement(SettingsPanel, {
          isTeacherMode: false,
          adventureInputMode: 'system',
          enableFactionResources: true,
          factionResourceMode: 'manual',
          setFactionResourceMode: vi.fn(),
          setAdventureState,
          adventureState: { systemResources: [{ name: 'Water', quantity: 50, unit: '%' }] },
          studentProjectSettings: { adventurePermissions: { lockAllSettings: false } },
          t: (k) => k,
        })
      );
      const modeSelect = container.querySelector('[data-help-key="adventure_setting_resource_mode"] select');
      expect(modeSelect).not.toBeNull();
      expect(modeSelect.disabled).toBe(true);
      const addBtn = container.querySelector('[id$="-add-resource"]');
      expect(addBtn).not.toBeNull();
      expect(addBtn.disabled).toBe(true);
      unmount();
    } else {
      const advSrc = fs.readFileSync(path.join(ROOT, 'view_adventure_module.js'), 'utf8');
      expect(advSrc).toContain('resourceConfigLocked = !props.isTeacherMode || locked()');
    }
  });

  it('hardens ExportPreview webhook URL validation, Workbench HTML sanitization & re-init, and removes 50ms setTimeout race', () => {
    const epSrc = fs.readFileSync(path.join(ROOT, 'view_export_preview_module.js'), 'utf8');
    expect(epSrc).toMatch(/parsed\.protocol !== ["']https:["']/);
    expect(epSrc).toContain('sanitizeWorkbenchHtml');
    expect(epSrc).toContain('delete doc.__alloPasteGuard');
    expect(epSrc).toContain('__alloInitializeBuilderDocument');
    expect(epSrc).toContain('setPendingPresetPrompt');
    expect(epSrc).not.toContain('setTimeout(() => generateCustomExportStyle(), 50)');

    const pcSrc = fs.readFileSync(path.join(ROOT, 'view_persona_chat_module.js'), 'utf8');
    expect(pcSrc).toContain('personaChatMountedRef');
    expect(pcSrc).toContain('roleSwapMountedRef');
    expect(pcSrc).toMatch(/personaState\.selectedCharacter\?\.name/);

    const dockSrc = fs.readFileSync(path.join(ROOT, 'view_live_session_dock_module.js'), 'utf8');
    expect(dockSrc).toMatch(/typeof _alloMbBridgeActive === ["']function["']/);
    expect(dockSrc).toContain('goals.length >= 20');
    expect(dockSrc).toMatch(/typeof setShowLiveDock === ["']function["']/);
  });
});
