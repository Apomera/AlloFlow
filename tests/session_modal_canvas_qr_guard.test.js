import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Gemini Canvas hands the app Google's own managed Firebase project. Its rules
// refuse a student device that is not already inside Canvas, but the TEACHER is
// inside Canvas, so the session write succeeds and a standard-backend QR used to
// render perfectly — then dead-end at scan time with permission-denied
// (verified on a real phone, 2026-07-09). These tests pin the guard behaviourally:
// mount the real compiled module and assert which panel comes out, so a future
// refactor that keeps the guard's source string but drops its effect still fails.

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let SessionModal;
let root;
let host;

const t = (key) => key;

const QR_PANEL_HEADINGS = ['Student QR join', 'Class Mailbox QR join'];
const GUARD_HEADING = 'Scanned QR will not work from this backend';

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
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
  host?.remove();
  host = null;
  delete window._isCanvasEnv;
  delete window.__alloBuildShareUrl;
  delete window.__alloMakeQrSvg;
  window.__alloFocusTrapStack = [];
});

async function renderModal({ isCanvasEnv, isMailboxSession = false, mailboxJoinUrl = '' }) {
  window._isCanvasEnv = isCanvasEnv;
  window.__alloBuildShareUrl = (params) =>
    'https://alloflow-cdn.pages.dev/app/?allo_join=' + params.allo_join;
  window.__alloMakeQrSvg = async () => '<svg role="img"></svg>';

  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);

  await act(async () => {
    root.render(React.createElement(SessionModal, {
      activeSessionAppId: 'host-app',
      activeSessionCode: 'ABCDE',
      addToast: vi.fn(),
      appId: 'teacher-device',
      copyToClipboard: vi.fn(),
      db: null,
      deleteDoc: vi.fn(),
      doc: vi.fn(),
      handleSetShowGroupModalToTrue: vi.fn(),
      handleSetShowSessionModalToFalse: vi.fn(),
      isMailboxSession,
      mailboxJoinUrl,
      sessionData: { mode: 'sync', joinUrls: [] },
      setActiveSessionCode: vi.fn(),
      setConfirmDialog: vi.fn(),
      setSessionData: vi.fn(),
      setShowSessionModal: vi.fn(),
      t,
      toggleSessionMode: vi.fn(),
      warnLog: vi.fn(),
    }));
    await Promise.resolve();
  });

  return host.textContent || '';
}

const hasQrPanel = (text) => QR_PANEL_HEADINGS.some((heading) => text.includes(heading));

describe('Live session modal — Canvas-managed backend QR guard', () => {
  it('withholds the student QR on Canvas and names the two paths that actually work', async () => {
    const text = await renderModal({ isCanvasEnv: true });

    expect(hasQrPanel(text)).toBe(false);
    expect(text).toContain(GUARD_HEADING);
    // The replacement must be actionable, not just a refusal.
    expect(text).toContain('Class Mailbox QR session');
    expect(text).toContain('Canvas link');
    // The generic "not configured as a student join path" panel would be wrong
    // here — the host IS configured; the backend is the problem.
    expect(text).not.toContain('This host is not configured as a student join path');
    // Projection mode would project an empty panel now that the QR is withheld.
    expect(host.querySelector('[aria-label="Open projection mode"]')).toBeNull();
    // The link stays reachable for troubleshooting, behind a disclosure.
    const disclosure = host.querySelector('details');
    expect(disclosure).toBeTruthy();
    expect(disclosure.querySelector('input')?.value).toContain('allo_join=ABCDE');
  });

  it('leaves a mailbox session QR alone on Canvas — it carries no Firebase dependency', async () => {
    const text = await renderModal({
      isCanvasEnv: true,
      isMailboxSession: true,
      mailboxJoinUrl: 'https://alloflow-cdn.pages.dev/app/?allo_mb=abc',
    });

    expect(text).toContain('Class Mailbox QR join');
    expect(text).not.toContain(GUARD_HEADING);
  });

  it('leaves the standard QR alone off Canvas, where the backend does accept students', async () => {
    const text = await renderModal({ isCanvasEnv: false });

    expect(text).toContain('Student QR join');
    expect(text).not.toContain(GUARD_HEADING);
    expect(host.querySelector('[aria-label="Open projection mode"]')).toBeTruthy();
  });
});
