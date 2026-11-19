// A changed Class Mailbox script gets a new version number.
//
// WHY (2026-11-16): a teacher pastes apps_script/session_mailbox/Code.gs into
// their own Google account once, and the app reads back its VERSION to know
// what that deployment can do. The script changed twice on 2026-11-14
// (retention fixes, sign-in checks, the page reader's address rules) and
// VERSION stayed 29, so three different scripts were all "v29": a teacher on
// the first one looks identical to a teacher on the last.
//
// RELEASED lists every script by version. When Code.gs changes, raise VERSION
// and add a line here. Never edit a line: an old hash is the only record of
// what that version was. After raising VERSION run
//   node dev-tools/embed_mailbox_script.cjs
// which updates the copy the app hands to teachers and its pin in the host file.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = fs.readFileSync(path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs'));
const version = Number((script.toString('utf8').match(/^var VERSION = (\d+);$/m) || [])[1]);
const sha256 = createHash('sha256').update(script).digest('hex');

const RELEASED = {
  29: '772445ad4b5e130e544e266a4046643d62eb50532b94f3c64d98aad80a1e0d7c', // 2026-11-07
  30: '49094945b27b859190932a198ac8aa8a319c57e4d6093bd679837ee4695b65b8', // 2026-11-16: v29 plus the two unversioned changes of 2026-11-14
  31: '7f4a8f89b36da157e61fb8e3f1518c56cf6fa7610ef0738996e7dc9d63612b83', // 2026-11-19: Phase 18 prototype-safe maps/lookups & UrlFetchApp catch
};

describe('Class Mailbox script version', () => {
  it('the script on disk is exactly the one recorded for its version number', () => {
    expect(Number.isInteger(version) && version > 0, 'Code.gs declares var VERSION').toBe(true);
    expect(RELEASED[version], 'version ' + version + ' is listed in RELEASED').toBeTruthy();
    expect(sha256, 'Code.gs changed but VERSION is still ' + version + ': raise it and add a line to RELEASED').toBe(RELEASED[version]);
  });

  it('is the newest version on record, and no two versions share a script', () => {
    const versions = Object.keys(RELEASED).map(Number);
    expect(version).toBe(Math.max(...versions));
    expect(new Set(Object.values(RELEASED)).size).toBe(versions.length);
  });
});

// A teacher on an older script is told to update (2026-11-16). The box in
// Live Sessions setup stopped at "below 29", so nobody on v29 was told about
// the v30 fixes. Its limit must follow the script's own VERSION.
describe('the "update your mailbox script" box follows the script version', () => {
  const noop = () => {};
  const Icon = () => null;
  let React, createRoot, act, View, root, host;

  beforeAll(() => {
    const modulesDir = path.join(ROOT, 'desktop', 'web-app', 'node_modules');
    React = require(path.join(modulesDir, 'react'));
    ({ createRoot } = require(path.join(modulesDir, 'react-dom', 'client')));
    ({ act } = require(path.join(modulesDir, 'react-dom', 'test-utils')));
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    loadAlloModule('view_share_session_surfaces_module.js');
    View = window.AlloModules.ClassMailboxSetupView;
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null;
    host?.remove();
    host = null;
  });

  async function noticeFor(deployedVersion) {
    const callbacks = ['addDirectionsToPack', 'alloPersistMailboxConfig', 'closeAllMailboxSessions', 'connectMailbox', 'copyMailboxScriptSource', 'copyToClipboard', 'deriveDirectionsDraft', 'exportMailboxConfig', 'importMailboxConfig', 'openStudentQrPreview', 'printQrSheet', 'requestEndLiveSession', 'resumeMailboxLiveSession', 'retryMailboxScriptSource', 'rotateMailboxAdmin', 'sendPackHome', 'setMbAdminInput', 'setMbConfig', 'setMbDirectionsDraft', 'setMbMode', 'setMbPanelOpen', 'setMbResumable', 'setMbShowAdmin', 'setMbStatus', 'setMbUrlInput', 'setShowDirectionsComposer', 'setShowSessionModal', 'shareFullPackToMailbox', 'startMailboxLiveSession', 'cancelPendingMailboxShare', 'closeMailboxSetup'];
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(View, {
        ...Object.fromEntries(callbacks.map(name => [name, vi.fn()])),
        ...Object.fromEntries(['ClipboardList', 'Copy', 'ExternalLink', 'Eye', 'EyeOff', 'FolderDown', 'Maximize', 'Printer', 'Sparkles', 'X'].map(name => [name, Icon])),
        t: noop, directionsDeriving: false, mailboxScriptState: { status: 'ready' }, mbAdminInput: '', mbBusy: false,
        mbConfig: { url: 'https://school.example.invalid/mailbox', admin: 'fixture-only', v: deployedVersion },
        mbDirectionsDraft: null, mbHwEvidence: {}, mbLive: null, mbMode: 'sync', mbNow: Date.now(), mbQrSvg: '', mbResumable: [], mbRoster: {}, mbShowAdmin: false, mbStatus: '', mbUrlInput: '',
        pendingMailboxShare: null,
      }));
    });
    const box = host.querySelector('[data-mailbox-update-notice]');
    const text = box ? box.textContent : null;
    act(() => root.unmount());
    root = null;
    host.remove();
    host = null;
    return text;
  }

  it('shows for the version just before the current script, naming the current one', async () => {
    const text = await noticeFor(version - 1);
    expect(text).toContain('Your mailbox script is v' + (version - 1));
    expect(text).toContain('Update to v' + version);
    expect(text).toContain('Copy the updated script');
  });

  it('does not show once the deployed script is current', async () => {
    expect(await noticeFor(version)).toBeNull();
  });

  it('keeps the older, more urgent messages for older scripts', async () => {
    expect(await noticeFor(27)).toContain('Update to v28');
    expect(await noticeFor(28)).toContain('Update to v29');
  });
});
