// @vitest-environment jsdom
// Error Reporter — Compatibility tab (2026-10-29).
// In the Gemini desktop app the storage approval window opened with no link back
// to AlloFlow, so Approve stayed disabled. The tab reports what a host allows;
// these tests drive window.open and the clipboard to each outcome a host can give.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const settle = () => new Promise((resolve) => setTimeout(resolve, 750));
const row = (id) => document.querySelector('[data-compat-id="' + id + '"]');
const text = (id) => (row(id) ? row(id).textContent : '');

let opened = [];
function fakePopup({ linked = true, closed = false } = {}) {
  const popup = {
    opener: linked ? window : null,
    closed,
    print() {},
    close() { popup.closed = true; },
    document: { title: '', body: { textContent: '' } },
  };
  return popup;
}
let nextPopup = null;
let clipboardWrites = [];

beforeAll(() => {
  window.__alloBuildStamp = { hash: 'abc1234', surface: 'canvas', at: Date.now() };
  window.open = (...args) => { opened.push(args); return nextPopup; };
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: (t) => { clipboardWrites.push(t); return Promise.resolve(); } },
    configurable: true,
  });
  const src = fs.readFileSync(path.join(ROOT, 'error_reporter_module.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();
});

beforeEach(() => {
  opened = [];
  clipboardWrites = [];
  nextPopup = fakePopup();
  const panel = document.getElementById('allo-err-panel');
  if (!panel) window.__alloOpenDiagnosticsLog('compat');
  else document.getElementById('aer-tab-compat').click();
});

describe('error reporter Compatibility tab', () => {
  it('opens on the tab from the global hook and the module API, and names the host', () => {
    expect(typeof window.AlloModules.ErrorReporter.openCompatibilityCheck).toBe('function');
    const panel = document.getElementById('allo-err-panel');
    expect(panel.textContent).toContain('What this browser or app lets AlloFlow do.');
    expect(panel.textContent).toContain('Gemini Canvas');
    expect(panel.textContent).toContain('top-level page');
    expect(document.getElementById('aer-tab-compat').getAttribute('aria-selected')).toBe('true');
  });

  it('reports a linked new window, printing and the clipboard as working', async () => {
    document.getElementById('aer-compat-run').click();
    expect(opened).toHaveLength(1); // opened inside the click, before any await
    await settle();
    expect(text('popup')).toContain('Works');
    expect(text('popup-link')).toContain('Works');
    expect(text('print-window')).toContain('Works');
    expect(text('clipboard')).toContain('Works');
    expect(clipboardWrites).toEqual(['AlloFlow compatibility check']);
    expect(nextPopup.closed).toBe(true); // the test window is closed again
  });

  it('flags a window with no link back, as the Gemini desktop app gave', async () => {
    nextPopup = fakePopup({ linked: false });
    document.getElementById('aer-compat-run').click();
    await settle();
    expect(text('popup')).toContain('Works');
    expect(text('popup-link')).toContain('Not available');
    expect(text('popup-link')).toContain('no link back');
    expect(text('print-window')).toContain('Not available');
  });

  it('flags a blocked window', async () => {
    nextPopup = null;
    document.getElementById('aer-compat-run').click();
    await settle();
    expect(text('popup')).toContain('Not available');
    expect(text('popup')).toContain('Blocked');
    expect(text('popup-link')).toContain('Not available');
  });

  it('flags a window that closed at once (handed to another app)', async () => {
    nextPopup = fakePopup({ closed: true });
    document.getElementById('aer-compat-run').click();
    await settle();
    expect(text('popup')).toContain('Partly');
    expect(text('popup')).toContain('closed at once');
  });

  it('keeps a hand-run result when the checks run again', async () => {
    window.alloDeviceStorage = {
      probe: () => Promise.resolve({ summary: { popup: 'FAILED: allo/popup-blocked', iframe: 'first run on this device' } }),
    };
    document.getElementById('aer-compat-storage').click();
    await settle();
    expect(text('device-storage')).toContain('Partly');
    expect(text('device-storage')).toContain('FAILED: allo/popup-blocked');
    document.getElementById('aer-compat-run').click();
    await settle();
    expect(text('device-storage')).toContain('FAILED: allo/popup-blocked');
    delete window.alloDeviceStorage;
  });

  it('copies the results as check outcomes', async () => {
    document.getElementById('aer-compat-run').click();
    await settle();
    clipboardWrites = [];
    document.getElementById('aer-compat-copy').click();
    await Promise.resolve();
    const copied = JSON.parse(clipboardWrites[0]);
    expect(copied.host.host).toBe('Gemini Canvas');
    expect(copied.checks.find((c) => c.id === 'popup-link').status).toBe('ok');
  });

  it('adds check names and outcomes to the student-safe bug report', async () => {
    nextPopup = fakePopup({ linked: false });
    document.getElementById('aer-compat-run').click();
    await settle();
    document.getElementById('aer-tab-errors').click();
    const refresh = document.getElementById('aer-refresh-report');
    if (refresh) refresh.click();
    const what = document.getElementById('aer-report-what').value;
    expect(what).toContain('-- Compatibility check');
    expect(what).toContain('host: Gemini Canvas');
    expect(what).toContain('popup-link: no');
    expect(what).not.toContain('no link back'); // outcomes only, no detail text
  });
});
