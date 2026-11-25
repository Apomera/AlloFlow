import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// The live-session modal, the Class Mailbox live card and the Homework QR
// dialog all offer the same link actions. They must use ONE name per action
// (existing translated keys) in ONE order: copy, test as student, print QR,
// then project where the card has it.

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const sessionSource = readFileSync('view_session_modal_source.jsx', 'utf8');
const shareSource = readFileSync('view_share_session_surfaces_source.jsx', 'utf8');

const COPY = 'mailbox.copy_link';
const TEST = 'share_collect.test_as_student';
const PRINT = 'share_collect.print_qr';
const PROJECT = 'mailbox.project';
const mark = (key) => `[${key}]`;
const t = (key) => mark(key);
const Icon = () => null;
const icons = { BookOpen: Icon, ClipboardList: Icon, Copy: Icon, ExternalLink: Icon, Eye: Icon, EyeOff: Icon, FolderDown: Icon, Maximize: Icon, Printer: Icon, Share2: Icon, Sparkles: Icon, Trash2: Icon, X: Icon };
const noop = () => {};
const qrSvg = '<svg role="img" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';

let React;
let ReactDOMClient;
let act;
let SessionModal;
let HomeworkQrDialogView;
let ClassMailboxSetupView;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  // Scratch copies can stand in (absolute paths), e.g. to show this suite fails on the old labels.
  loadAlloModule(process.env.ALLO_SESSION_MODAL_CANDIDATE || 'view_session_modal_module.js');
  loadAlloModule(process.env.ALLO_SHARE_SURFACES_CANDIDATE || 'view_share_session_surfaces_module.js');
  SessionModal = window.AlloModules.SessionModal.SessionModal;
  HomeworkQrDialogView = window.AlloModules.HomeworkQrDialogView;
  ClassMailboxSetupView = window.AlloModules.ClassMailboxSetupView;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  delete window._isCanvasEnv;
  delete window.__alloBuildShareUrl;
  delete window.__alloMakeQrSvg;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

async function render(Component, props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Component, props));
    await Promise.resolve();
  });
  await act(async () => { await Promise.resolve(); });
  return host;
}

// Labels of the link actions a card renders, in DOM (and so tab) order.
function actionOrder(scope, names) {
  return Array.from(scope.querySelectorAll('button'))
    .map((button) => names.find((name) => button.textContent.includes(mark(name))))
    .filter(Boolean);
}
const buttonFor = (scope, name) => Array.from(scope.querySelectorAll('button')).find((button) => button.textContent.includes(mark(name)));

function mailboxProps(overrides = {}) {
  return {
    ...icons,
    addDirectionsToPack: noop, alloPersistMailboxConfig: noop, closeAllMailboxSessions: noop, connectMailbox: noop,
    copyMailboxScriptSource: noop, copyToClipboard: noop, deriveDirectionsDraft: noop, directionsDeriving: false,
    exportMailboxConfig: noop, importMailboxConfig: noop, mailboxScriptState: { status: 'ready' }, mbAdminInput: '',
    mbBusy: false, mbConfig: { url: 'https://script.google.com/macros/s/example/exec', admin: 'admin-token', v: 20, latencyMs: 42 },
    mbDirectionsDraft: null, mbHwEvidence: {}, mbLive: { code: 'ABC123', joinUrl: 'https://example.edu/join', aiPolicy: 'off' },
    mbMode: 'sync', mbNow: Date.now(), mbQrSvg: qrSvg, mbResumable: [], mbRoster: {}, mbShowAdmin: false, mbStatus: '',
    mbUrlInput: '', openStudentQrPreview: noop, printQrSheet: noop, requestEndLiveSession: noop, resumeMailboxLiveSession: noop,
    retryMailboxScriptSource: noop, rotateMailboxAdmin: noop, sendPackHome: noop, setMbAdminInput: noop, setMbConfig: noop,
    setMbDirectionsDraft: noop, setMbMode: noop, setMbPanelOpen: noop, setMbResumable: noop, setMbShowAdmin: noop,
    setMbStatus: noop, setMbUrlInput: noop, setShowDirectionsComposer: noop, setShowSessionModal: noop,
    shareFullPackToMailbox: noop, startMailboxLiveSession: noop, t,
    ...overrides,
  };
}

function homeworkProps(overrides = {}) {
  return {
    ...icons,
    SharedAssignmentActivityPanel: () => null, addToast: noop, copyToClipboard: noop, createSelfContainedHomeworkLink: noop,
    homeworkQrDialogRef: React.createRef(), hostPackOnMailbox: noop, mbBusy: false, mbConfig: null, printQrSheet: noop,
    qrShareError: false,
    qrShareModal: { type: 'assignment', title: 'Homework title', resourceCount: 1, resourceTitles: ['One'], aiPolicy: 'off', url: 'https://example.edu/homework', expiresAt: Date.now() + 86400000, noQr: false },
    qrShareSvg: qrSvg, revokeHomeworkAssignment: noop, setQrShareModal: noop, t, testHomeworkAsStudent: noop,
    ...overrides,
  };
}

describe('QR / link cards share one action vocabulary and order', () => {
  it('live-session modal: copy link, test as student, print QR, all translated', async () => {
    window._isCanvasEnv = false;
    window.__alloBuildShareUrl = (params) => 'https://alloflow-cdn.pages.dev/app/?allo_join=' + params.allo_join;
    window.__alloMakeQrSvg = async () => qrSvg;
    const copyToClipboard = vi.fn();
    await render(SessionModal, {
      activeSessionAppId: 'host-app', activeSessionCode: 'ABCDE', addToast: vi.fn(), appId: 'teacher-device', copyToClipboard,
      db: null, deleteDoc: vi.fn(), doc: vi.fn(), handleSetShowGroupModalToTrue: vi.fn(), handleSetShowSessionModalToFalse: vi.fn(),
      isMailboxSession: false, mailboxJoinUrl: '', sessionData: { mode: 'sync', joinUrls: [] }, setActiveSessionCode: vi.fn(),
      setConfirmDialog: vi.fn(), setSessionData: vi.fn(), setShowSessionModal: vi.fn(), t, toggleSessionMode: vi.fn(), warnLog: vi.fn(),
    });
    expect(actionOrder(host, [COPY, TEST, PRINT])).toEqual([COPY, TEST, PRINT]);
    const join = host.querySelector('[data-session-copy="join"]');
    expect(join.textContent).toContain(mark(COPY));
    act(() => join.click());
    expect(copyToClipboard).toHaveBeenCalledWith(expect.stringContaining('allo_join=ABCDE'));
    expect(buttonFor(host, TEST).type).toBe('button');
    expect(buttonFor(host, PRINT).type).toBe('button');
    // The other copy hooks stay.
    expect(host.querySelector('[data-session-copy="code"]')).toBeTruthy();
    expect(host.querySelector('[data-session-copy="host"]')).toBeTruthy();
    // No hard-coded English action labels left in the source.
    expect(sessionSource).not.toContain('<>Copy student join link <Copy');
    expect(sessionSource).not.toMatch(/^\s*Test as student <ExternalLink/m);
    expect(sessionSource).not.toMatch(/^\s*Print QR <Printer/m);
  });

  it('Class Mailbox live card: copy link, test as student, print QR, project, each still wired', async () => {
    const copyToClipboard = vi.fn();
    const openStudentQrPreview = vi.fn();
    const printQrSheet = vi.fn();
    const setShowSessionModal = vi.fn();
    await render(ClassMailboxSetupView, mailboxProps({ copyToClipboard, openStudentQrPreview, printQrSheet, setShowSessionModal }));
    const row = host.querySelector('[data-mailbox-link-actions]');
    expect(row).toBeTruthy();
    expect(row.querySelectorAll('button')).toHaveLength(4);
    expect(actionOrder(row, [COPY, TEST, PRINT, PROJECT])).toEqual([COPY, TEST, PRINT, PROJECT]);
    // Four full labels need two columns, not four, inside a max-w-md dialog.
    expect(row.className).toContain('sm:grid-cols-2');
    expect(row.className).not.toContain('grid-cols-4');
    act(() => buttonFor(row, TEST).click());
    expect(openStudentQrPreview).toHaveBeenCalledWith('https://example.edu/join', 'live-session link as a student');
    act(() => buttonFor(row, PRINT).click());
    expect(printQrSheet).toHaveBeenCalledOnce();
    act(() => buttonFor(row, PROJECT).click());
    expect(setShowSessionModal).toHaveBeenCalledWith(true);
    act(() => buttonFor(row, COPY).click());
    expect(copyToClipboard).toHaveBeenCalledWith('https://example.edu/join');
    expect(shareSource).not.toContain("t('mailbox.test')");
    expect(shareSource).not.toContain("t('mailbox.print')");
  });

  it('Homework QR dialog: copy (naming the homework link), then test as student, then print QR', async () => {
    const copyToClipboard = vi.fn();
    const testHomeworkAsStudent = vi.fn();
    const printQrSheet = vi.fn();
    await render(HomeworkQrDialogView, homeworkProps({ copyToClipboard, testHomeworkAsStudent, printQrSheet }));
    const actions = Array.from(host.querySelectorAll('[data-homework-link-action]'));
    expect(actions.map((button) => button.getAttribute('data-homework-link-action'))).toEqual(['copy', 'test', 'print']);
    expect(actions[0].textContent).toContain(mark('share_collect.copy_homework_link'));
    expect(actions[1].textContent).toContain(mark(TEST));
    expect(actions[2].textContent).toContain(mark(PRINT));
    // The selectable link stays directly under its copy button, as in the session modal.
    const linkInput = host.querySelector('input[readonly]');
    expect(actions[0].compareDocumentPosition(linkInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(linkInput.compareDocumentPosition(actions[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    act(() => actions[0].click());
    expect(copyToClipboard).toHaveBeenCalledWith('https://example.edu/homework');
    act(() => actions[1].click());
    expect(testHomeworkAsStudent).toHaveBeenCalledOnce();
    act(() => actions[2].click());
    expect(printQrSheet).toHaveBeenCalledOnce();
  });
});
