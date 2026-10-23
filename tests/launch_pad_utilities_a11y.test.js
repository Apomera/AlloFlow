import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const source = fs.readFileSync('view_launch_pad_source.jsx', 'utf8');

describe('Launch-pad language and setup utility accessibility', () => {
  it('uses valid list and button semantics for language selection', () => {
    expect(source).toContain('aria-controls="launch-pad-language-list"');
    expect(source).toContain('<ul id="launch-pad-language-list" ref={langListRef} aria-label=');
    expect(source).toContain('aria-pressed={selected}');
    expect(source).not.toContain('role="listbox"');
    expect(source).not.toContain('role="option"');
    expect(source).not.toContain('aria-haspopup="true"');
  });

  it('moves focus into the language list and returns it on dismissal', () => {
    expect(source).toContain('ref={langTriggerRef}');
    expect(source).toContain("list.querySelector('button[aria-pressed=\"true\"]')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('if (langTriggerRef.current) langTriggerRef.current.focus();');
    expect(source).toContain('document.removeEventListener');
  });

  it('keeps asynchronous setup controls operable and announces results', () => {
    expect(source).toContain('var enableVoiceAccess = props.enableVoiceAccess;');
    expect(source).toContain('var voiceAccessActive = props.voiceAccessActive === true;');
    expect(source).toContain("if (typeof enableVoiceAccess === 'function')");
    expect(source).toContain('enableVoiceAccess();');
    expect(source).toContain("if (typeof requestMicPermission === 'function') requestMicPermission();");
    expect(source).toContain('disabled={voiceAccessActive || voiceAccessStarting}');
    expect(source).toContain('aria-busy={voiceAccessStarting}');
    expect(source).toContain("'Enable Voice Access'");
    expect(source).toContain("'Voice Access Active'");
    expect(source).toContain("'Starting Voice Access...'");
    expect(source).toContain("'Retry Voice Access'");
    expect(source).toContain('Microphone permission is ready, but Voice Access is not currently listening.');
    expect(source).toContain('browser or operating system may require microphone activation once');
    expect(source).toContain('Voice Access is optional; touch, pointer, and keyboard remain available.');
    expect(source.match(/role="status" aria-live="polite" aria-atomic="true"/g)).toHaveLength(4);
    expect(source).toContain("linear-gradient(135deg, #4f46e5, #3730a3)");
  });

  it('provides explicit button behavior, targets, focus, and reduced motion', () => {
    expect(source).toContain('.lp-lang-trigger, .lp-lang-item, .lp-mic-actions button, .lp-download-button, .lp-ai-settings { min-height: 44px; }');
    expect(source).toContain('.lp-lang-trigger:focus-visible, .lp-lang-item:focus-visible, .lp-mic-actions button:focus-visible, .lp-download-button:focus-visible, .lp-ai-settings:focus-visible');
    expect(source).toContain('.lp-lang-item, .lp-lang-trigger, .lp-mic-actions button, .lp-download-button, .lp-download-button:hover, .lp-ai-settings { animation: none !important;');
    expect(source).toContain('className="lp-ai-settings"');
    expect(source).toContain('onClick={openAIBackendSettings}');
    expect(source).toContain("aria-busy={aiSettingsLoadStatus === 'loading'}");
    expect(source).toContain("aria-disabled={aiSettingsLoadStatus === 'loading'}");
  });

  it('promotes the settings module on demand and exposes progress or retry feedback', () => {
    expect(source).toContain('function ensureAIBackendModalModule()');
    expect(source).toContain('view_misc_modals_module.js');
    expect(source).toContain('__alloLaunchPadAIBackendModalPromise');
    expect(source).toContain('data-alloflow-launchpad-ai-settings');
    expect(source).toContain('id="launch-pad-ai-settings-status"');
    expect(source).toContain('AI Backend Settings could not open. Activate Retry AI Backend Settings to try again.');
    expect(source).toContain('setShowAIBackendModal(true);');
  });

  it('offers a quiet, keyboard-accessible manual report entry with loading and retry feedback', () => {
    expect(source).toContain('className="lp-report-problem" onClick={openProblemReporter}');
    expect(source).toContain('.lp-report-problem { display: block; min-height: 44px;');
    expect(source).toContain('.lp-report-problem:focus-visible');
    expect(source).toContain('aria-describedby="launch-pad-report-status"');
    expect(source).toContain("copy('launch_pad.report_problem', 'Report a problem')");
    expect(source).toContain("copy('launch_pad.report_retry', 'Try opening report again')");
  });

  it('offers accessible Whisper and Kokoro downloads below the four primary cards', () => {
    const gridEnd = source.indexOf('<section className="lp-voice-setup"');
    const fourthCard = source.indexOf('id="launch-pad-educator-title"');
    expect(gridEnd).toBeGreaterThan(fourthCard);
    expect(source).toContain('id="launch-pad-offline-voice-title"');
    expect(source).toContain("voice.preloadWhisper('tiny', { lang: selectedVoiceLanguageTag() })");
    expect(source).toContain('window.__loadKokoroTTS');
    expect(source).toContain('Download Whisper');
    expect(source).toContain('Download Kokoro');
    expect(source.match(/aria-busy=\{voiceSetup\.(?:whisper|kokoro)\.phase === 'loading'\}/g)).toHaveLength(2);
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('.lp-download-button:focus-visible');
  });

  it('keeps generated launch-pad modules synchronized', () => {
    const rootModule = fs.readFileSync('view_launch_pad_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_launch_pad_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('launch-pad-language-list');
    expect(rootModule).toContain('aria-pressed');
    expect(rootModule).toContain('Starting Voice Access...');
    expect(rootModule).toContain('view_misc_modals_module.js');
    expect(rootModule).toContain('__alloLaunchPadAIBackendModalPromise');
    expect(rootModule).not.toContain('role: "listbox"');
    expect(rootModule).not.toContain('role: "option"');
    expect(rootModule).not.toContain('"aria-haspopup": "true"');
  });
});

const utilitySource = source.slice(source.indexOf('  function ensureLaunchPadUtilityModule('), source.indexOf('  function ensureAIBackendModalModule()'));
const reportHandlerSource = source.slice(source.indexOf('  function openProblemReporter('), source.indexOf('  function openAIBackendSettings('));
const windows = [];
const flush = async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); };

function utilityHarness(url = 'https://alloflow.dev/app/', launchScript) {
  vi.useFakeTimers();
  const w = new JSDOM('<!doctype html><head></head><body></body>', { url }).window;
  windows.push(w);
  w.setTimeout = globalThis.setTimeout;
  w.clearTimeout = globalThis.clearTimeout;
  w.setInterval = globalThis.setInterval;
  w.clearInterval = globalThis.clearInterval;
  w.AlloModules = {};
  w.__alloBuildStamp = { hash: 'build-pin' };
  if (launchScript) {
    const element = w.document.createElement('script');
    element.src = launchScript;
    w.document.head.appendChild(element);
  }
  const ensure = new Function('window', 'document', 'URL', utilitySource + '\nreturn ensureLaunchPadUtilityModule;')(w, w.document, URL);
  const load = () => ensure('MiscModals', 'view_misc_modals_module.js', 'AIBackendModal', '__alloLaunchPadAIBackendModalPromise', 'data-alloflow-launchpad-ai-settings');
  const ownScript = () => w.document.querySelector('[data-alloflow-launchpad-ai-settings]');
  const register = () => {
    w.AlloModules.AIBackendModal = () => null;
    w.dispatchEvent(new w.Event('alloflow:module-registry-changed'));
    if (ownScript()) ownScript().dispatchEvent(new w.Event('load'));
  };
  return { w, ensure, load, ownScript, register };
}

afterEach(() => {
  for (const w of windows.splice(0)) w.close();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Launch Pad utility loading', () => {
  it.each([
    ['https://alloflow.dev/app/', null, 'https://alloflow-cdn.pages.dev/'],
    ['https://alloflow-cdn.pages.dev/app/', null, 'https://alloflow-cdn.pages.dev/'],
    ['http://localhost:4318/app/', null, 'http://localhost:4318/app/'],
    ['http://127.0.0.1:3000/', null, 'http://127.0.0.1:3000/'],
    ['https://school.instructure.com/courses/1', null, 'https://alloflow-cdn.pages.dev/'],
    ['file:///C:/AlloFlow/index.html', null, 'https://alloflow-cdn.pages.dev/'],
    ['https://school.instructure.com/courses/1', 'https://raw.githubusercontent.com/Apomera/AlloFlow/pinned/view_launch_pad_module.js?v=old', 'https://raw.githubusercontent.com/Apomera/AlloFlow/pinned/'],
    ['file:///C:/AlloFlow/index.html', 'file:///C:/AlloFlow/assets/view_launch_pad_module.js', 'file:///C:/AlloFlow/assets/'],
    ['http://localhost:8765/preview/', 'http://localhost:8765/modules/view_launch_pad_module.js', 'http://localhost:8765/modules/'],
  ])('loads beside real assets rather than assuming the page directory: %s', async (page, launchScript, expectedBase) => {
    const h = utilityHarness(page, launchScript);
    const pending = h.load();
    expect(h.ownScript().src).toBe(expectedBase + 'view_misc_modals_module.js?v=build-pin');
    h.register();
    await expect(pending).resolves.toBe(h.w.AlloModules.AIBackendModal);
    expect(h.w.__alloLaunchPadAIBackendModalPromise).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('promotes the host queue once and waits through its primary error for fallback registration', async () => {
    const h = utilityHarness();
    const primary = h.w.document.createElement('script');
    primary.src = 'https://alloflow-cdn.pages.dev/view_misc_modals_module.js?v=pinned';
    h.w.document.head.appendChild(primary);
    h.w.__alloModuleRegistry = { MiscModals: { status: 'pending', script: primary } };
    h.w.__alloPromoteModule = vi.fn(() => true);
    const pending = h.load();
    expect(h.load()).toBe(pending);
    expect(h.w.__alloPromoteModule).toHaveBeenCalledExactlyOnceWith('MiscModals');
    expect(h.ownScript()).toBeNull();
    primary.dispatchEvent(new h.w.Event('error'));
    await vi.advanceTimersByTimeAsync(16000);
    expect(h.w.__alloLaunchPadAIBackendModalPromise).toBe(pending);
    h.register();
    await expect(pending).resolves.toBe(h.w.AlloModules.AIBackendModal);
    expect(primary.isConnected).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('exposes a terminal host failure and retries through the same host API', async () => {
    const h = utilityHarness();
    const entry = { status: 'failed' };
    h.w.__alloModuleRegistry = { MiscModals: entry };
    h.w.__alloPromoteModule = vi.fn(() => { entry.status = 'pending'; return true; });
    const pending = h.load();
    const rejected = expect(pending).rejects.toThrow('could not be loaded');
    entry.status = 'failed';
    h.w.dispatchEvent(new h.w.Event('alloflow:module-registry-changed'));
    await rejected;
    const retried = h.load();
    expect(h.w.__alloPromoteModule).toHaveBeenCalledTimes(2);
    h.register();
    await expect(retried).resolves.toBe(h.w.AlloModules.AIBackendModal);
  });

  it('never adopts a stale failed foreign script and removes only its own failed attempt', async () => {
    const h = utilityHarness();
    const stale = h.w.document.createElement('script');
    stale.src = '/app/view_misc_modals_module.js';
    h.w.document.head.appendChild(stale);
    stale.dispatchEvent(new h.w.Event('error'));
    const pending = h.load();
    const rejected = expect(pending).rejects.toThrow('could not be loaded');
    const failed = h.ownScript();
    failed.dispatchEvent(new h.w.Event('error'));
    await rejected;
    expect(failed.isConnected).toBe(false);
    expect(stale.isConnected).toBe(true);
    const retried = h.load();
    expect(h.ownScript()).not.toBe(failed);
    h.register();
    await expect(retried).resolves.toBe(h.w.AlloModules.AIBackendModal);
  });

  it.each([false, true])('bounds an unresponsive loader and clears retry state (host=%s)', async host => {
    const h = utilityHarness();
    if (host) h.w.__alloPromoteModule = () => true;
    const pending = h.load();
    const rejected = expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(host ? 60000 : 15000);
    await rejected;
    expect(h.w.__alloLaunchPadAIBackendModalPromise).toBeUndefined();
    expect(h.ownScript()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('requires the actual export after a load event and allows another attempt', async () => {
    const h = utilityHarness();
    const pending = h.load();
    const rejected = expect(pending).rejects.toThrow('did not register');
    h.ownScript().dispatchEvent(new h.w.Event('load'));
    await rejected;
    const retry = h.load();
    h.register();
    await retry;
    expect(h.w.__alloLaunchPadAIBackendModalPromise).toBeUndefined();
  });

  it('uses an already registered module without requesting another download', async () => {
    const h = utilityHarness();
    h.w.AlloModules.AIBackendModal = () => null;
    h.w.__alloPromoteModule = vi.fn();
    await expect(h.load()).resolves.toBe(h.w.AlloModules.AIBackendModal);
    expect(h.w.__alloPromoteModule).not.toHaveBeenCalled();
    expect(h.ownScript()).toBeNull();
  });

  it.each(['manual', 'legacy'])('opens the report without sending or inventing an error (%s API)', async api => {
    const h = utilityHarness();
    const textarea = h.w.document.createElement('textarea');
    textarea.id = 'aer-description';
    h.w.document.body.appendChild(textarea);
    const reporter = api === 'manual' ? { openManualReport: vi.fn(() => textarea.focus()) } : { openPanel: vi.fn() };
    h.w.AlloModules.ErrorReporter = reporter;
    const status = vi.fn();
    const handler = new Function('window', 'document', 'ensureLaunchPadUtilityModule', 'reportLoadStatus', 'setReportLoadStatus', 'launchPadRef', reportHandlerSource + '\nreturn openProblemReporter;')(h.w, h.w.document, h.ensure, 'idle', status, { current: { isConnected: true } });
    handler({ stopPropagation: vi.fn() });
    await flush();
    if (api === 'manual') expect(reporter.openManualReport).toHaveBeenCalledOnce();
    else expect(reporter.openPanel).toHaveBeenCalledExactlyOnceWith('errors');
    expect(h.w.document.activeElement).toBe(textarea);
    expect(status.mock.calls.map(call => call[0])).toEqual(['loading', 'idle']);
  });

  it('promotes a missing reporter and exposes a retryable failure without opening a blank form', async () => {
    const h = utilityHarness();
    const entry = { status: 'pending' };
    h.w.__alloModuleRegistry = { ErrorReporter: entry };
    h.w.__alloPromoteModule = vi.fn(() => true);
    const status = vi.fn();
    const handler = new Function('window', 'document', 'ensureLaunchPadUtilityModule', 'reportLoadStatus', 'setReportLoadStatus', 'launchPadRef', reportHandlerSource + '\nreturn openProblemReporter;')(h.w, h.w.document, h.ensure, 'idle', status, { current: { isConnected: true } });
    handler();
    expect(h.w.__alloPromoteModule).toHaveBeenCalledExactlyOnceWith('ErrorReporter');
    entry.status = 'failed';
    h.w.dispatchEvent(new h.w.Event('alloflow:module-registry-changed'));
    await flush();
    expect(status.mock.calls.map(call => call[0])).toEqual(['loading', 'error']);
  });
});
