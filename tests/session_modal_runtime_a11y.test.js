import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let SessionModal;
let root;
let host;
let opener;
let outside;

const t = (key) => ({
  'common.close': 'Close live session',
  'common.click_to_copy': 'Click to copy',
  'common.copy': 'Copy',
  'session.click_to_copy': 'Click to copy',
  'session.host_id_share': 'Host ID',
  'session.teacher_paced': 'Teacher paced',
  'session.teacher_paced_desc': 'Teacher controls progress',
  'session.student_paced': 'Student paced',
  'session.student_paced_desc': 'Students control progress',
  'session.action_close': 'Close',
  'session.action_end': 'End session',
  'session.end_confirm': 'End this session?',
  'groups.manage_button': 'Manage groups',
  'groups.manage_button_desc': 'Arrange student groups',
}[key] || key);

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_session_modal_module.js');
  SessionModal = window.AlloModules.SessionModal.SessionModal;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  window.__alloFocusTrapStack = [];
});

describe('Live session modal runtime accessibility', () => {
  it('contains topmost focus, exposes its description, passes axe, and restores its opener', async () => {
    opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open live session';
    document.body.appendChild(opener);
    opener.focus();
    outside = document.createElement('button');
    document.body.appendChild(outside);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(SessionModal, {
        activeSessionAppId: 'host-app',
        activeSessionCode: 'ABCDE',
        addToast: vi.fn(),
        appId: 'teacher-device',
        copyToClipboard: vi.fn(),
        db: null,
        deleteDoc: vi.fn(),
        doc: vi.fn(),
        handleSetShowGroupModalToTrue: vi.fn(),
        handleSetShowSessionModalToFalse: () => setOpen(false),
        sessionData: { mode: 'sync', isLocalOnly: true, transport: 'local-preview', joinUrls: [] },
        setActiveSessionCode: vi.fn(),
        setConfirmDialog: vi.fn(),
        setSessionData: vi.fn(),
        setShowSessionModal: vi.fn(),
        t,
        toggleSessionMode: vi.fn(),
        warnLog: vi.fn(),
      }) : null;
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(document.activeElement).toBe(first);
    expect(dialog.getAttribute('aria-describedby')).toBe('alloflow-session-modal-description');
    expect(dialog.querySelector('#alloflow-session-modal-description')).toBeTruthy();
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);

    const axeResults = await axe.run(dialog, { rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    } });
    expect(axeResults.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical'))
      .toEqual([]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(last);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(first);
    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(first);

    window.__alloFocusTrapStack.push({ root: document.createElement('div') });
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBe(dialog);
    window.__alloFocusTrapStack.pop();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(window.__alloFocusTrapStack).toEqual([]);
  });
});
