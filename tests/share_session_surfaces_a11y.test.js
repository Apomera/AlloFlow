import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('view_share_session_surfaces_source.jsx', 'utf8');
let React;
let ReactDOMClient;
let act;
let HomeworkQrDialogView;
let ClassMailboxSetupView;
let root;
let host;

const Icon = () => null;
const icons = {
  BookOpen: Icon,
  ClipboardList: Icon,
  Copy: Icon,
  ExternalLink: Icon,
  Eye: Icon,
  EyeOff: Icon,
  FolderDown: Icon,
  Maximize: Icon,
  Printer: Icon,
  Share2: Icon,
  Sparkles: Icon,
  Trash2: Icon,
  X: Icon,
};
const noop = () => {};
const t = () => '';
const qrSvg = '<svg role="img" aria-labelledby="test-qr-title" viewBox="0 0 10 10"><title id="test-qr-title">Homework assignment QR code</title><rect width="10" height="10"/></svg>';

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_share_session_surfaces_module.js');
  HomeworkQrDialogView = window.AlloModules.HomeworkQrDialogView;
  ClassMailboxSetupView = window.AlloModules.ClassMailboxSetupView;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  vi.restoreAllMocks();
});

async function render(Component, props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Component, props));
  });
  return host;
}

function homeworkProps(overrides = {}) {
  return {
    ...icons,
    SharedAssignmentActivityPanel: () => null,
    addToast: noop,
    copyToClipboard: noop,
    createSelfContainedHomeworkLink: noop,
    homeworkQrDialogRef: React.createRef(),
    hostPackOnMailbox: noop,
    mbBusy: false,
    mbConfig: null,
    printQrSheet: noop,
    qrShareError: false,
    qrShareModal: {
      type: 'assignment',
      title: 'Homework title',
      resourceCount: 1,
      resourceTitles: ['A long resource title that must wrap at narrow reflow widths'],
      aiPolicy: 'off',
      url: 'https://example.edu/homework',
      expiresAt: Date.now() + 86400000,
      noQr: false,
    },
    qrShareSvg: qrSvg,
    revokeHomeworkAssignment: noop,
    setQrShareModal: noop,
    t,
    testHomeworkAsStudent: noop,
    ...overrides,
  };
}

function mailboxProps(overrides = {}) {
  return {
    ...icons,
    addDirectionsToPack: noop,
    alloPersistMailboxConfig: noop,
    closeAllMailboxSessions: noop,
    connectMailbox: noop,
    copyMailboxScriptSource: noop,
    copyToClipboard: noop,
    deriveDirectionsDraft: noop,
    directionsDeriving: false,
    exportMailboxConfig: noop,
    importMailboxConfig: noop,
    mailboxScriptState: { status: 'ready' },
    mbAdminInput: '',
    mbBusy: false,
    mbConfig: {
      url: 'https://script.google.com/macros/s/example/exec',
      admin: 'admin-token',
      v: 20,
      latencyMs: 42,
    },
    mbDirectionsDraft: null,
    mbHwEvidence: {
      first: {
        uid: 'student-1',
        directionsId: 'directions-1',
        name: 'River-Sunrise-Long-Codename',
        doneCount: 1,
        total: 2,
        xpEarned: 5,
        title: 'Long evidence title',
        at: Date.now(),
        objectives: [{ done: true, confirmed: true, label: 'Read' }],
      },
    },
    mbLive: {
      code: 'ABC123',
      joinUrl: 'https://example.edu/join',
      aiPolicy: 'student-byok',
    },
    mbMode: 'sync',
    mbNow: Date.now(),
    mbQrSvg: qrSvg,
    mbResumable: [],
    mbRoster: {
      first: {
        name: 'River-Sunrise-Long-Codename',
        rtc: true,
        hand: true,
        at: Date.now(),
      },
    },
    mbShowAdmin: false,
    mbStatus: 'Mailbox connected.',
    mbUrlInput: '',
    openStudentQrPreview: noop,
    printQrSheet: noop,
    requestEndLiveSession: noop,
    resumeMailboxLiveSession: noop,
    retryMailboxScriptSource: noop,
    rotateMailboxAdmin: noop,
    sendPackHome: noop,
    setMbAdminInput: noop,
    setMbConfig: noop,
    setMbDirectionsDraft: noop,
    setMbMode: noop,
    setMbPanelOpen: noop,
    setMbResumable: noop,
    setMbShowAdmin: noop,
    setMbStatus: noop,
    setMbUrlInput: noop,
    setShowDirectionsComposer: noop,
    setShowSessionModal: noop,
    shareFullPackToMailbox: noop,
    startMailboxLiveSession: noop,
    t,
    ...overrides,
  };
}

describe('Share Session surfaces accessibility', () => {
  it('uses the generated QR image semantics without labelling a generic container', async () => {
    await render(HomeworkQrDialogView, homeworkProps());
    const qrImage = host.querySelector('svg[role="img"]');
    expect(qrImage).toBeTruthy();
    expect(qrImage.querySelector('title').textContent).toBe('Homework assignment QR code');
    expect(qrImage.parentElement.parentElement.hasAttribute('aria-label')).toBe(false);

    const ready = Array.from(host.querySelectorAll('[role="status"]'))
      .find((element) => element.textContent.includes('Ready to scan'));
    expect(ready?.getAttribute('aria-live')).toBe('polite');
    expect(ready?.getAttribute('aria-atomic')).toBe('true');
  });

  it('announces the no-QR link state accurately and preserves long resource titles', async () => {
    const props = homeworkProps({
      qrShareModal: { ...homeworkProps().qrShareModal, noQr: true },
      qrShareSvg: '',
    });
    await render(HomeworkQrDialogView, props);
    const status = host.querySelector('[role="status"]');
    expect(status.textContent).toContain('Homework link ready');
    expect(status.textContent).not.toContain('Validating QR code');
    const resource = host.querySelector('li');
    expect(resource.className).toContain('break-words');
    expect(resource.className).not.toContain('truncate');
  });

  it('makes class-code copying a native keyboard action and exposes live updates', async () => {
    const copyToClipboard = vi.fn();
    await render(ClassMailboxSetupView, mailboxProps({ copyToClipboard }));
    const classCode = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('ABC123'));
    expect(classCode).toBeTruthy();
    expect(classCode.type).toBe('button');
    expect(classCode.className).toContain('focus-visible:ring');
    classCode.click();
    expect(copyToClipboard).toHaveBeenCalledWith('ABC123');

    const statuses = Array.from(host.querySelectorAll('[role="status"]'));
    expect(statuses.some((element) => element.textContent.includes('Ready to scan'))).toBe(true);
    expect(statuses.some((element) => element.textContent.includes('Connected students'))).toBe(true);
    const mailboxStatus = statuses.find((element) => element.textContent.includes('Mailbox connected.'));
    expect(mailboxStatus?.getAttribute('aria-live')).toBe('polite');
    expect(mailboxStatus?.getAttribute('aria-atomic')).toBe('true');
  });

  it('provides roster structure, valid indicator roles, and wrapping reflow text', async () => {
    await render(ClassMailboxSetupView, mailboxProps());
    const roster = host.querySelector('ul[aria-labelledby="alloflow-mailbox-roster-status"]');
    expect(roster).toBeTruthy();
    expect(roster.querySelectorAll('li')).toHaveLength(1);
    const codename = roster.querySelector('li > span');
    expect(codename.className).toContain('break-words');
    expect(codename.className).not.toContain('truncate');
    expect(host.querySelector('[role="img"][aria-label="real-time connection"]')).toBeTruthy();
    expect(host.querySelector('[role="img"][aria-label="hand raised"]')).toBeTruthy();

    const evidence = Array.from(host.querySelectorAll('p'))
      .find((element) => element.textContent.includes('Long evidence title'));
    expect(evidence.className).toContain('break-words');
    expect(evidence.className).not.toContain('truncate');
    expect(source).not.toContain('className="truncate">{index + 1}. {name}</li>');
  });
});
