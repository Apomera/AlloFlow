import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const noop = () => {};
const Icon = () => null;
let React, createRoot, act, View, root, host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ({ createRoot } = require(resolve(modulesDir, 'react-dom/client')));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_share_session_surfaces_module.js');
  View = window.AlloModules.ClassMailboxSetupView;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove(); host = null;
  vi.restoreAllMocks();
});

function props(overrides = {}) {
  const callbacks = ['addDirectionsToPack', 'alloPersistMailboxConfig', 'closeAllMailboxSessions', 'connectMailbox', 'copyMailboxScriptSource', 'copyToClipboard', 'deriveDirectionsDraft', 'exportMailboxConfig', 'importMailboxConfig', 'openStudentQrPreview', 'printQrSheet', 'requestEndLiveSession', 'resumeMailboxLiveSession', 'retryMailboxScriptSource', 'rotateMailboxAdmin', 'sendPackHome', 'setMbAdminInput', 'setMbConfig', 'setMbDirectionsDraft', 'setMbMode', 'setMbPanelOpen', 'setMbResumable', 'setMbShowAdmin', 'setMbStatus', 'setMbUrlInput', 'setShowDirectionsComposer', 'setShowSessionModal', 'shareFullPackToMailbox', 'startMailboxLiveSession', 'cancelPendingMailboxShare', 'closeMailboxSetup'];
  return {
    ...Object.fromEntries(callbacks.map(name => [name, vi.fn()])),
    ...Object.fromEntries(['ClipboardList', 'Copy', 'ExternalLink', 'Eye', 'EyeOff', 'FolderDown', 'Maximize', 'Printer', 'Sparkles', 'X'].map(name => [name, Icon])),
    t: noop, directionsDeriving: false, mailboxScriptState: { status: 'ready' }, mbAdminInput: '', mbBusy: false,
    mbConfig: { url: 'https://school.example.invalid/mailbox', admin: 'fixture-only', v: 24 },
    mbDirectionsDraft: null, mbHwEvidence: {}, mbLive: null, mbMode: 'sync', mbNow: Date.now(), mbQrSvg: '', mbResumable: [], mbRoster: {}, mbShowAdmin: false, mbStatus: '', mbUrlInput: '',
    pendingMailboxShare: { title: 'Prepared reading', resourceCount: 2, aiPolicy: 'off', sharedActivityTitle: '', requiredMailboxVersion: 0 },
    ...overrides,
  };
}

async function render(viewProps) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(React.createElement(View, viewProps)); });
}
function button(name) {
  const match = Array.from(host.querySelectorAll('button')).find(node => (node.getAttribute('aria-label') || node.textContent.trim()) === name);
  expect(match, 'Expected generated button: ' + name).toBeTruthy();
  return match;
}
async function click(name) { await act(async () => { button(name).click(); }); }

describe('pending mailbox share dismissal controls', () => {
  it('routes the generated X control through the cancellation-aware close callback', async () => {
    const viewProps = props(); await render(viewProps); await click('Close');
    expect(viewProps.closeMailboxSetup).toHaveBeenCalledOnce();
    expect(viewProps.setMbPanelOpen).not.toHaveBeenCalled();
    expect(viewProps.connectMailbox).not.toHaveBeenCalled();
  });

  it('cancels through the generated Project close path before opening the projection', async () => {
    const order = [];
    const viewProps = props({
      mbLive: { code: 'LOCAL1', joinUrl: 'https://school.example.invalid/join', aiPolicy: 'off' },
      closeMailboxSetup: vi.fn(() => order.push('close-and-cancel')),
      setShowSessionModal: vi.fn(value => order.push(['project', value])),
    });
    await render(viewProps); await click('Project');
    expect(order).toEqual(['close-and-cancel', ['project', true]]);
    expect(viewProps.closeMailboxSetup).toHaveBeenCalledOnce();
    expect(viewProps.setMbPanelOpen).not.toHaveBeenCalled();
    expect(viewProps.connectMailbox).not.toHaveBeenCalled();
  });

  it('cancels the pending share before the generated Forget control clears mailbox state', async () => {
    const order = [];
    const viewProps = props({
      cancelPendingMailboxShare: vi.fn(() => order.push('cancel')),
      alloPersistMailboxConfig: vi.fn(value => order.push(['persist', value])),
      setMbConfig: vi.fn(value => order.push(['config', value])),
      setMbUrlInput: vi.fn(value => order.push(['url', value])),
      setMbStatus: vi.fn(value => order.push(['status', value])),
    });
    await render(viewProps); await click('Forget mailbox');
    expect(order).toEqual(['cancel', ['persist', null], ['config', null], ['url', ''], ['status', expect.stringContaining('Mailbox forgotten')]]);
    expect(viewProps.cancelPendingMailboxShare).toHaveBeenCalledOnce();
    expect(viewProps.connectMailbox).not.toHaveBeenCalled();
  });

  it('executes the canonical close callback by cancelling before closing setup', () => {
    const start = shell.indexOf('  const closeMailboxSetup = useCallback(() => {');
    const end = shell.indexOf('  useEffect(() => () => {', start);
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
    const order = [];
    const close = new Function('useCallback', 'cancelPendingMailboxShare', 'setMbPanelOpen', shell.slice(start, end) + '\nreturn closeMailboxSetup;')(
      fn => fn, () => order.push('cancel'), value => order.push(['open', value]));
    close();
    expect(order).toEqual(['cancel', ['open', false]]);
  });

  it('routes the canonical Escape focus-trap callback to the cancellation-aware close', () => {
    expect(shell).toMatch(/useFocusTrap\(mailboxPanelRef,\s*mbPanelOpen,\s*\(\)\s*=>\s*closeMailboxSetup\(\)\)/);
  });

  it('routes the canonical mailbox backdrop to the cancellation-aware close', () => {
    expect(shell).toMatch(/<div\s+ref=\{mailboxPanelRef\}[^>]*onClick=\{closeMailboxSetup\}/);
  });

  it('routes lazy fallback dismissal and the loaded mailbox view through the same close callback', () => {
    const start = shell.indexOf('      {mbPanelOpen && (');
    const end = shell.indexOf('      {showLiveHostWarning', start);
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
    const mailboxRender = shell.slice(start, end);
    expect(mailboxRender).toContain('__alloOnClose={closeMailboxSetup}');
    expect(mailboxRender).toContain('pendingMailboxShare, cancelPendingMailboxShare, closeMailboxSetup,');
    expect(mailboxRender).toContain('connectMailbox: connectMailboxForSetup');
    expect(mailboxRender).not.toMatch(/setMbPanelOpen\(false\)/);
  });
});
