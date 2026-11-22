import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOM;
let ReactDOMClient;
let act;
let StudentAnalytics;
let AllobotContextControls;
let AllobotAdviceSave;
let AllobotSearchSettings;
let AdventureOffline;
let ExportHandlers;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function unmountAll() {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
}

function setFieldValue(el, value) {
  const proto = el.tagName === 'SELECT'
    ? window.HTMLSelectElement.prototype
    : el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
  act(() => { el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}

async function runAxe(container) {
  const result = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

const NullIcon = () => null;
const emptyT = () => '';

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOM = require(resolve(modulesDir, 'react-dom'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = React);
  global.React = window.React = React;
  window.ReactDOM = ReactDOM;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  window.AlloLanguageContext = React.createContext({ t: emptyT });
  window.AlloIcons = new Proxy({}, { get: () => NullIcon });
  window.__alloHooks = { useFocusTrap: () => {} };
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));

  loadAlloModule('student_analytics_module.js');
  loadAlloModule('udl_chat_module.js');
  loadAlloModule('view_misc_modals_module.js');
  loadAlloModule('view_adventure_module.js');
  loadAlloModule('export_handlers_module.js');

  StudentAnalytics = window.AlloModules.StudentAnalytics;
  AllobotContextControls = window.AlloModules.AllobotContextControls;
  AllobotAdviceSave = window.AlloModules.AllobotAdviceSave;
  AllobotSearchSettings = window.AlloModules.AllobotSearchSettings;
  AdventureOffline = window.AlloModules.AdventureOffline;
  ExportHandlers = window.AlloModules.ExportHandlers;
});

afterEach(() => {
  unmountAll();
  localStorage.clear();
  if (window.AlloFlowChatPrivacy) window.AlloFlowChatPrivacy.clear();
  delete window.ALLOFLOW_MANAGED_AI_POLICY;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Other Resources Polish — Wave 23', () => {
  it('polishes StudentAnalytics with zero unguarded pulse/spin animations, accessible timed probe timers, IME-guarded MN probe input, and zero axe violations', async () => {
    const src = readFileSync(resolve(process.cwd(), 'student_analytics_module.js'), 'utf8');
    // Every animate-pulse / animate-spin occurrence must carry motion-reduce:animate-none (eliminating all 11 MOTION-001 findings)
    for (const line of src.split(/\r?\n/)) {
      if (/\banimate-(?:pulse|spin)\b/.test(line)) {
        expect(line, 'Missing motion-reduce:animate-none on line: ' + line.trim()).toContain('motion-reduce:animate-none');
      }
    }
    // All 4 previously un-announced probe timers now expose role="timer" + low-time aria-live gating
    expect(src).toContain('"aria-label": "NWF time remaining: " + nwfProbeTimer + " seconds"');
    expect(src).toContain('"aria-label": "LNF time remaining: " + lnfProbeTimer + " seconds"');
    expect(src).toContain('"aria-label": "Missing Number time remaining: " + mnProbeTimer + " seconds"');
    expect(src).toContain('"aria-label": "Quantity Discrimination time remaining: " + qdProbeTimer + " seconds"');

    // Mount StudentAnalytics live and launch the Missing Number probe to verify timer role, IME guard, Skip button target, and live axe
    const banks = JSON.parse(readFileSync(resolve(process.cwd(), 'psychometric_math_probes.json'), 'utf8'));
    window.MISSING_NUMBER_PROBES = banks.MISSING_NUMBER_PROBES;
    window.QUANTITY_DISCRIMINATION_PROBES = banks.QUANTITY_DISCRIMINATION_PROBES;
    window.MATH_PROBE_BANKS = banks.MATH_PROBE_BANKS;

    const host = mountEl(React.createElement(StudentAnalytics, {
      isOpen: true,
      onClose: vi.fn(),
      students: [],
      dashboardData: null,
      t: (k) => k,
      addToast: vi.fn(),
      loadProbeBanks: vi.fn(),
    }));

    const startMnBtn = Array.from(document.body.querySelectorAll('button')).find((b) => /Start Missing Number/i.test(b.textContent));
    expect(startMnBtn).toBeTruthy();
    act(() => { startMnBtn.click(); });
    const timerEl = document.body.querySelector('[role="timer"][aria-label*="Missing Number time remaining"]');
    expect(timerEl).toBeTruthy();
    expect(timerEl.getAttribute('aria-atomic')).toBe('true');

    const mnInput = document.body.querySelector('input[aria-label="Math probe answer"]');
    expect(mnInput).toBeTruthy();
    // IME composition Enter must NOT submit
    setFieldValue(mnInput, '5');
    const compEvt = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(compEvt, 'isComposing', { value: true });
    act(() => { mnInput.dispatchEvent(compEvt); });
    expect(mnInput.value).toBe('5');

    const skipBtn = Array.from(document.body.querySelectorAll('button')).find((b) => /Skip/i.test(b.textContent));
    expect(skipBtn).toBeTruthy();
    expect(skipBtn.className).toContain('min-h-11');
    expect(skipBtn.className).toContain('focus-visible:ring-2');

    const probeRoot = timerEl.closest('[role="dialog"]') || host;
    await runAxe(probeRoot);
  });

  it('polishes AllobotContextControls, AllobotAdviceSave, and AllobotSearchSettings with live counters, IME Enter/Escape handling, aria-busy, aria-describedby, and zero axe violations', async () => {
    const setInput = vi.fn();
    const clearChat = vi.fn();
    const ctxHost = mountEl(React.createElement(AllobotContextControls, {
      messages: [{ role: 'user', text: 'How do I scaffold fractions?' }],
      busy: false,
      setInput,
      clearChat,
      t: emptyT,
    }));

    // Open Add context drawer and verify live character count + aria-describedby
    const addCtxBtn = Array.from(ctxHost.querySelectorAll('button')).find((b) => /Add context/i.test(b.textContent));
    expect(addCtxBtn).toBeTruthy();
    act(() => { addCtxBtn.click(); });
    const excerptCount = ctxHost.querySelector('[data-allobot-excerpt-count="true"]');
    expect(excerptCount).toBeTruthy();
    expect(excerptCount.textContent).toContain('0 / 1,500');
    const textarea = ctxHost.querySelector('textarea');
    expect(textarea.getAttribute('aria-describedby')).toBeTruthy();
    setFieldValue(textarea, 'Fractions paragraph');
    expect(excerptCount.textContent).toContain('19 / 1,500');

    // Switch to Web search drawer, verify live topic counter, IME-guarded Enter submit, and Escape collapse
    const searchBtn = Array.from(ctxHost.querySelectorAll('button')).find((b) => /Web search/i.test(b.textContent));
    act(() => { searchBtn.click(); });
    const topicCount = ctxHost.querySelector('[data-allobot-topic-count="true"]');
    expect(topicCount.textContent).toContain('0 / 200');
    const topicInput = ctxHost.querySelector('input[type="text"]');
    setFieldValue(topicInput, 'photosynthesis');
    expect(topicCount.textContent).toContain('14 / 200');

    const compEnter = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(compEnter, 'isComposing', { value: true });
    act(() => { topicInput.dispatchEvent(compEnter); });
    expect(setInput).not.toHaveBeenCalled();

    act(() => { topicInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(setInput).toHaveBeenCalledWith('Search for photosynthesis');

    await runAxe(ctxHost);

    // Escape collapses open sub-panel
    act(() => { topicInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(searchBtn.getAttribute('aria-expanded')).toBe('false');

    // AllobotAdviceSave: aria-busy while saving + polite live region + 0 axe violations
    let resolveSave;
    const saveFn = vi.fn(() => new Promise((yes) => { resolveSave = yes; }));
    const adviceHost = mountEl(React.createElement(AllobotAdviceSave, {
      text: 'Provide a visual number line.',
      question: 'How do I scaffold fractions?',
      save: saveFn,
      busy: false,
      t: emptyT,
    }));
    const saveBtn = adviceHost.querySelector('[data-help-key="chat_save_advice_btn"]');
    act(() => { saveBtn.click(); });
    expect(saveBtn.getAttribute('aria-busy')).toBe('true');
    await act(async () => { resolveSave({ ok: true }); });
    expect(saveBtn.getAttribute('aria-busy')).toBeNull();
    const adviceStatus = adviceHost.querySelector('[role="status"]');
    expect(adviceStatus.getAttribute('aria-live')).toBe('polite');
    expect(adviceStatus.textContent).toContain('Advice copied to History');
    await runAxe(adviceHost);

    // AllobotSearchSettings: aria-describedby on Serper key + polite save status + 0 axe violations
    const settingsHost = mountEl(React.createElement(AllobotSearchSettings, { t: emptyT }));
    const keyInput = settingsHost.querySelector('input[type="password"]');
    expect(keyInput).toBeTruthy();
    const descId = keyInput.getAttribute('aria-describedby');
    expect(descId).toBeTruthy();
    expect(settingsHost.querySelector('[id="' + descId + '"]')).toBeTruthy();
    const saveKeyBtn = Array.from(settingsHost.querySelectorAll('button')).find((b) => /Save search key/i.test(b.textContent));
    act(() => { saveKeyBtn.click(); });
    expect(settingsHost.querySelector('[role="status"][aria-live="polite"]').textContent).toContain('Search settings saved.');
    await runAxe(settingsHost);
  });

  it('polishes AdventureOffline Player, Reflection, Editor, and Panel with journey progressbar, IME-guarded keyboard shortcuts, fallback Close label, counters, and zero axe violations', async () => {
    const sampleStory = {
      version: 1,
      title: 'River Crossing',
      start: 's1',
      scenes: [
        { id: 's1', text: 'You reach the river.', choices: [{ label: 'Build a raft', to: 's2' }, { label: 'Take the bridge', to: 's3' }] },
        { id: 's2', text: 'You float across safely.', ending: true, choices: [] },
        { id: 's3', text: 'You cross the old stone bridge.', ending: true, choices: [] },
      ],
    };
    const onReflect = vi.fn(() => true);
    const playerHost = mountEl(React.createElement(AdventureOffline.Player, {
      story: sampleStory,
      t: emptyT,
      theme: 'light',
      onReflect,
    }));

    const progress = playerHost.querySelector('[data-offline-journey-progress="true"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    expect(progress.getAttribute('aria-valuemax')).toBe('3');
    expect(progress.getAttribute('aria-valuetext')).toContain('1 of 3');

    await runAxe(playerHost);

    // IME-guarded number shortcut "1" picks choice 1
    const section = playerHost.querySelector('[data-adventure-offline-player]');
    const compKey = new window.KeyboardEvent('keydown', { key: '1', bubbles: true });
    Object.defineProperty(compKey, 'isComposing', { value: true });
    act(() => { section.dispatchEvent(compKey); });
    expect(progress.getAttribute('aria-valuenow')).toBe('1');

    act(() => { section.dispatchEvent(new window.KeyboardEvent('keydown', { key: '1', bubbles: true })); });
    expect(progress.getAttribute('aria-valuenow')).toBe('2');

    // Ending reflection exposes live counter + Ctrl+Enter save shortcut
    const reflCount = playerHost.querySelector('[data-offline-reflection-count="true"]');
    expect(reflCount).toBeTruthy();
    const reflArea = playerHost.querySelector('[data-offline-reflection] textarea');
    expect(reflArea.getAttribute('aria-describedby')).toBe(reflCount.id);
    setFieldValue(reflArea, 'Building a raft taught me to plan ahead.');
    expect(reflCount.textContent).toContain('40 /');
    act(() => { reflArea.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true })); });
    expect(onReflect).toHaveBeenCalledOnce();
    await runAxe(playerHost);

    // Student authoring panel with empty t() keeps fallback Close aria-label, live scene counter, and checklist progress
    const panelHost = mountEl(React.createElement(AdventureOffline.Panel, {
      studentMode: true,
      history: [],
      setHistory: vi.fn(),
      onClose: vi.fn(),
      t: emptyT,
      theme: 'light',
    }));
    const closeBtn = panelHost.querySelector('button[aria-label="Close"]');
    expect(closeBtn).toBeTruthy();
    expect(panelHost.querySelector('[data-offline-scene-char-count="true"]')).toBeTruthy();
    const checkProgress = panelHost.querySelector('[data-student-story-check-progress="true"]');
    expect(checkProgress.textContent).toContain('0 / 3');
    const firstCheck = panelHost.querySelector('input[data-student-story-check]');
    act(() => { firstCheck.click(); });
    expect(checkProgress.textContent).toContain('1 / 3');
    await runAxe(panelHost);
  });

  it('polishes ExportHandlers standalone take-home HTML read-aloud karaoke bar, audio modal, and progress bar with 44px targets, focus-visible CSS, reduced-motion, and zero axe violations', async () => {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(
      '<!DOCTYPE html><html lang="en"><head><title>Sample Take-Home</title></head><body><main><section class="section" data-ka-readable="true"><h1>Fractions</h1><p>One half equals two fourths. Equal parts make a whole.</p></section></main></body></html>',
      'text/html',
    );
    await ExportHandlers.karaokeProcess(doc.documentElement, {
      callTTS: vi.fn(async () => 'data:audio/wav;base64,UklGRg=='),
      mode: { quality: 'embedded', variants: ['standard'], inlinePassageAudio: true },
    });

    const styleEl = doc.querySelector('#allo-ka-style');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    const bar = doc.querySelector('.allo-ka-bar');
    expect(bar).toBeTruthy();
    expect(bar.getAttribute('role')).toBe('region');
    expect(bar.getAttribute('aria-label')).toBe('Read-aloud controls');

    const prevBtn = bar.querySelector('.allo-ka-prev');
    const playBtn = bar.querySelector('.allo-ka-play');
    const nextBtn = bar.querySelector('.allo-ka-next');
    const countEl = bar.querySelector('.allo-ka-count');
    expect(prevBtn.style.minHeight).toBe('44px');
    expect(prevBtn.style.minWidth).toBe('44px');
    expect(playBtn.style.minHeight).toBe('44px');
    expect(playBtn.getAttribute('aria-label')).toBe('Read aloud');
    expect(nextBtn.style.minHeight).toBe('44px');
    expect(countEl.getAttribute('role')).toBe('status');
    expect(countEl.getAttribute('aria-live')).toBe('polite');

    // Mount processed HTML fragment into live DOM and run axe-core
    const host = document.createElement('div');
    host.innerHTML = doc.body.innerHTML;
    document.body.appendChild(host);
    try {
      await runAxe(host);
    } finally {
      host.remove();
    }

    // Verify modal & audio progress bar accessibility contracts in export_handlers_module.js
    const src = readFileSync(resolve(process.cwd(), 'export_handlers_module.js'), 'utf8');
    expect(src).toContain("ov.setAttribute('aria-describedby', 'allo-read-aloud-modal-desc')");
    expect(src).toContain('role="progressbar" aria-label="Read-aloud audio preparation progress"');
    expect(src).toContain('prefers-reduced-motion: reduce');
  });
});
