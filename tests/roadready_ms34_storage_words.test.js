import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';

// Round 34, lane mastery (ms34). No message may tell the student their progress is kept when it is not.
// The states: device storage works or is blocked (a Canvas iframe whose device storage is not connected,
// the Deny button, a browser that throws on storage, a failed write) x the STEAM Lab host saves Road Ready
// or not. Every sentence that talks about keeping progress is read from the mounted tool in each state.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let loadTool, resetStemLab, makeCtx, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
});
const FLAGS = ['__alloStemSavesRoadReady', '__alloStemSaveWriteFailed', '__alloPrefsHydrationStatus', '_alloflowRRStorageBlocked', '_alloflowRRStorageToastShown', '__alloflowRoadReady', '__alloflowRoadReadyBank'];
let mounted = [];
const tick = async (n = 3) => { for (let i = 0; i < n; i++) await React.act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
async function mount(roadReady, toasts) {
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  const state = { toolData: { roadReady } };
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = makeCtx({
      toolData,
      addToast: (msg) => { if (toasts) toasts.push(String(msg)); },
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    });
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  await tick();
  const m = { host, root, state };
  mounted.push(m);
  return m;
}
// jsdom has no 2D canvas: the badge confetti of a loaded file draws into a stand-in.
const fakeCtx = () => new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
beforeEach(() => { vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(fakeCtx); });
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  vi.restoreAllMocks();
  FLAGS.forEach((k) => { delete window[k]; });
  try { localStorage.clear(); } catch (e) {}
});
const blockStorage = () => {
  const deny = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(deny);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(deny);
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(deny);
};
const note = (m) => (m.host.querySelector('#rr-save-kept-note') || {}).textContent || '';
const PROMISES = ['This device keeps your progress', 'This device keeps your permit practice', 'Per-category mastery is saved across sessions', 'Questions you miss are saved on this device', 'stored on your device only'];
const BLOCKED = 'This browser is not letting Road Ready keep your progress on this device.';

describe('ms34: the Progress panel, in every storage state', () => {
  it('storage works and the host saves Road Ready: it says what is kept, and that a private window forgets it', async () => {
    window.__alloStemSavesRoadReady = true;
    const m = await mount({ view: 'menu', tourCompleted: true });
    expect(note(m)).toContain('This device keeps your progress and settings by itself');
    expect(m.host.querySelector('#rr-save-private-note').textContent).toContain('private or guest window');
  });
  it('storage works but no host saves Road Ready (an older hub, the tool pasted alone): only permit practice is kept, and it says so', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true });
    expect(note(m)).toContain('This device keeps your permit practice and parking scores by itself.');
    expect(note(m)).toContain('It does not keep badges, drives, the logbook or settings');
    expect(note(m)).not.toContain('This device does not keep your progress');
  });
  it('the browser blocks storage (it throws): the panel says nothing is kept, even inside a host that saves', async () => {
    window.__alloStemSavesRoadReady = true;
    blockStorage();
    const m = await mount({ view: 'menu', tourCompleted: true });
    expect(note(m)).toContain(BLOCKED);
    expect(m.host.textContent).not.toContain('This device keeps');
    expect(m.host.querySelector('#rr-save-private-note')).toBeNull();
  });
  for (const st of ['unavailable', 'pending']) {
    it('Canvas, device storage ' + st + ' (Deny, or not connected yet): nothing is promised', async () => {
      window.__alloStemSavesRoadReady = true;
      window.__alloPrefsHydrationStatus = st;
      const m = await mount({ view: 'menu', tourCompleted: true });
      expect(note(m)).toContain(BLOCKED);
      expect(m.host.textContent).not.toContain('This device keeps');
    });
  }
  it('Canvas, device storage connects while the panel is open: the panel changes to what is kept', async () => {
    window.__alloStemSavesRoadReady = true;
    window.__alloPrefsHydrationStatus = 'pending';
    const m = await mount({ view: 'menu', tourCompleted: true });
    expect(note(m)).toContain(BLOCKED);
    window.__alloPrefsHydrationStatus = 'ready';
    await React.act(async () => { window.dispatchEvent(new CustomEvent('allo-prefs-hydrated', { detail: { available: true } })); });
    await tick();
    expect(note(m)).toContain('This device keeps your progress and settings by itself');
  });
  it('a write fails after the panel opened (the host save, or one of the tool\'s own): the panel stops promising', async () => {
    window.__alloStemSavesRoadReady = true;
    const m = await mount({ view: 'menu', tourCompleted: true });
    expect(note(m)).toContain('This device keeps your progress');
    window.__alloStemSaveWriteFailed = true;
    await React.act(async () => { window._alloflowRRStorageBlocked = true; window.dispatchEvent(new CustomEvent('alloflow-roadready-storage-blocked')); });
    await tick();
    expect(note(m)).toContain(BLOCKED);
  });
  it('the host flag for a failed write is enough on its own', async () => {
    window.__alloStemSavesRoadReady = true;
    window.__alloStemSaveWriteFailed = true;
    const m = await mount({ view: 'menu', tourCompleted: true });
    expect(note(m)).toContain(BLOCKED);
  });
  it('Load Progress while storage is blocked: the student is told the file must be loaded again next time', async () => {
    blockStorage();
    const toasts = [];
    const m = await mount({ view: 'menu', tourCompleted: true }, toasts);
    const input = m.host.querySelector('#rr-load-progress-file');
    const OrigFR = window.FileReader;
    window.FileReader = function () { this.readAsText = () => { this.onload({ target: { result: JSON.stringify({ tool: 'roadReady', version: 1, badges: { first_drive: true } }) } }); }; };
    try {
      await React.act(async () => {
        Object.defineProperty(input, 'files', { value: [{ name: 'p.json' }], configurable: true });
        input.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
      await tick();
    } finally { window.FileReader = OrigFR; }
    expect(toasts.join(' | ')).toContain('This browser will not keep it after you close the page. Load your file again next time.');
  });
});

describe('ms34: permit study pages, in every storage state', () => {
  it('storage works: the start page says scores and misses are kept', async () => {
    const m = await mount({ view: 'permitStart' });
    expect(m.host.textContent).toContain('Per-category mastery is saved across sessions');
    expect(m.host.textContent).toContain('Questions you miss are saved on this device');
  });
  it('storage blocked: the start page and the flashcards say what is lost when the page closes', async () => {
    blockStorage();
    const m = await mount({ view: 'permitStart' });
    PROMISES.forEach((p) => expect(m.host.textContent, p).not.toContain(p));
    expect(m.host.textContent).toContain('This browser is not keeping your scores. They are gone when you close the page.');
    expect(m.host.textContent).toContain('Questions you miss are listed for review until you close the page.');
    const f = await mount({ view: 'permitFlashcards' });
    expect(f.host.querySelector('[data-rr-flash-not-kept]').textContent).toContain('This browser does not keep your card dates.');
    // all cards rated: the "done for today, next cards on ..." page says it too
    const done = await mount({ view: 'permitFlashcards', permitStudy: { misses: {}, cards: Object.fromEntries(Array.from({ length: 261 }, (_, i) => [String(i), { s: 2, due: '2099-01-01' }])) } });
    expect(done.host.querySelector('[data-rr-flash-done]')).toBeTruthy();
    expect(done.host.querySelector('[data-rr-flash-not-kept]')).toBeTruthy();
  });
  it('storage works: the flashcards say nothing about losing dates', async () => {
    const f = await mount({ view: 'permitFlashcards' });
    expect(f.host.querySelector('[data-rr-flash-not-kept]')).toBeNull();
  });
});

describe('ms34: a Gemini Canvas page (a throwaway origin) keeps nothing unless the app\'s device storage is connected', () => {
  it('Canvas origins are recognised, ordinary ones are not', async () => {
    await mount({ view: 'menu', tourCompleted: true });
    const X = window.__RR_TEST_EXPORTS__.roadReadyMastery;
    expect(X, 'lane export').toBeTruthy();
    expect(X.rrThrowawayOrigin('blob:https://abc.scf.usercontent.goog/1234', '')).toBe(true);
    expect(X.rrThrowawayOrigin('https://x-abc.scf.usercontent.goog/', 'x-abc.scf.usercontent.goog')).toBe(true);
    expect(X.rrThrowawayOrigin('https://y.googleusercontent.com/', 'y.googleusercontent.com')).toBe(true);
    expect(X.rrThrowawayOrigin('https://alloflow.example.org/', 'alloflow.example.org')).toBe(false);
    expect(X.rrThrowawayOrigin('http://localhost:3000/', 'localhost')).toBe(false);
  });
});

describe('ms34: the GDL dates are never kept on the device, so the heading does not say they are', () => {
  for (const blocked of [false, true]) {
    it('storage ' + (blocked ? 'blocked' : 'works'), async () => {
      if (blocked) blockStorage(); else window.__alloStemSavesRoadReady = true;
      const m = await mount({ view: 'gdlTracker' });
      expect(m.host.textContent).not.toContain('stored on your device only');
      expect(m.host.textContent).toContain('Your Dates (not kept after you close the page; Save Progress keeps them in a file)');
    });
  }
});
