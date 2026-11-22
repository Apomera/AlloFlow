import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let BrandProfileEditor;
let SpeechSetupPanel;
let AdminHubPanel;
let LiveLessonRunPanel;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function setInputValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
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

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });

  loadAlloModule('brand_profile_module.js');
  delete window.AlloModules.BrandProfileEditor;
  new Function(readFileSync(resolve(process.cwd(), 'brand_profile_editor_module.js'), 'utf8'))();
  BrandProfileEditor = window.AlloModules.BrandProfileEditor;

  loadAlloModule('voice_module.js');
  delete window.AlloModules.SpeechSetup;
  new Function(readFileSync(resolve(process.cwd(), 'speech_setup_module.js'), 'utf8'))();
  SpeechSetupPanel = window.AlloModules.SpeechSetup.SpeechSetupPanel;

  delete window.AlloModules.AdminHub;
  new Function(readFileSync(resolve(process.cwd(), 'admin_hub_module.js'), 'utf8'))();
  AdminHubPanel = window.AlloModules.AdminHub.AdminHubPanel;

  delete window.AlloModules.LiveLessonRun;
  new Function(readFileSync(resolve(process.cwd(), 'view_live_lesson_run_module.js'), 'utf8'))();
  LiveLessonRunPanel = window.AlloModules.LiveLessonRun.LiveLessonRunPanel;
});

afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
  localStorage.clear();
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('Wave 11 polish: Brand Profile Editor, Speech Setup, Leadership Hub, Live Lesson Run', () => {
  it('BrandProfileEditor offers WCAG AA starter palettes, live contrast ratios, 5+ profile filter, and passes axe', async () => {
    const bp = window.AlloModules.BrandProfile;
    for (let i = 1; i <= 5; i += 1) {
      bp.saveBrandProfile({
        name: i === 5 ? 'Oak Ridge Elementary' : `School Profile ${i}`,
        colors: { ...bp.DEFAULT_COLORS },
        fonts: { ...bp.DEFAULT_FONTS },
      });
    }
    const onClose = vi.fn();
    const host = mountEl(React.createElement(BrandProfileEditor, {
      onClose,
      t: (_k, d) => d,
      addToast: vi.fn(),
    }));

    // Live contrast ratio readout renders all 3 pairs vs page bg
    const contrastBox = host.querySelector('[data-testid="brand-contrast-readout"]');
    expect(contrastBox).toBeTruthy();
    expect(contrastBox.textContent).toMatch(/\d+\.\d:1/);
    expect(contrastBox.textContent).toContain('AAA');

    // Clicking Forest Slate preset applies its accessible colors & marks pressed
    const forestBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Forest Slate'));
    expect(forestBtn).toBeTruthy();
    await act(async () => { forestBtn.click(); });
    expect(forestBtn.getAttribute('aria-pressed')).toBe('true');
    const headingHex = host.querySelector('input[aria-label="Heading hex value"]');
    expect(headingHex.value.toLowerCase()).toBe('#14532d');

    // Saved-profile filter appears at 5+ profiles and Escape clears query without closing modal
    const filterInput = host.querySelector('input[aria-label="Filter saved brand profiles"]');
    expect(filterInput).toBeTruthy();
    setInputValue(filterInput, 'Oak Ridge');
    expect(host.textContent).toContain('Oak Ridge Elementary');
    expect(host.textContent).not.toContain('School Profile 1');

    act(() => {
      filterInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(filterInput.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();

    await runAxe(host);
  });

  it('SpeechSetupPanel renders readiness status pills, copies test transcript, and passes axe', async () => {
    const V = window.AlloFlowVoice;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new Error('unused')) },
    });
    window.AudioContext = function AudioContext() {};
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    vi.spyOn(V, 'getWhisperModelStatus').mockResolvedValue({
      tiny: { english: true, multilingual: false },
      base: { english: false, multilingual: false },
      small: { english: false, multilingual: false },
    });
    vi.spyOn(V, 'preparedWhisperTier').mockReturnValue('tiny');
    vi.spyOn(V, 'startMicrophoneCheck').mockImplementation(() => ({
      cancel: vi.fn(),
      promise: Promise.resolve({
        heardSound: true,
        heardSpeech: true,
        tier: 'tiny',
        transcript: 'Plants make their own food through photosynthesis.',
        assessment: { speed: 2.4, verdict: 'lesson', biggerTier: 'base' },
      }),
    }));

    const host = mountEl(React.createElement(SpeechSetupPanel, {
      onClose: vi.fn(),
      lang: 'en-US',
    }));
    await act(async () => { await Promise.resolve(); });

    const strip = host.querySelector('[data-testid="speech-setup-status-strip"]');
    expect(strip).toBeTruthy();
    expect(strip.textContent).toContain('Tiny');

    // Run local mic test and copy the heard transcript
    const startBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Start test'));
    expect(startBtn).toBeTruthy();
    await act(async () => {
      startBtn.click();
      await Promise.resolve();
    });

    const copyBtn = host.querySelector('[data-testid="speech-setup-copy-transcript"]');
    expect(copyBtn).toBeTruthy();
    await act(async () => {
      copyBtn.click();
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith('Plants make their own food through photosynthesis.');
    expect(copyBtn.textContent).toContain('Copied');

    await runAxe(host);
  });

  it('AdminHubPanel filters tools by category and query, shows live local backup count, and passes axe', async () => {
    localStorage.setItem('allo_udlwalk_sessions_v1', '[{"id":"w1"}]');
    localStorage.setItem('allo_mtss_datasets_v1', '[{"id":"m1"}]');
    const onClose = vi.fn();

    const host = mountEl(React.createElement(AdminHubPanel, {
      onClose,
      t: () => undefined,
      openTool: vi.fn(),
      addToast: vi.fn(),
    }));

    // Live backup count badge reflects saved hub items
    const backupPill = host.querySelector('[data-testid="adminhub-backup-count"]');
    expect(backupPill).toBeTruthy();
    expect(backupPill.textContent).toContain('2 saved items on this device');

    // Default renders all 11 tools
    expect(host.querySelectorAll('[data-help-key="adminhub_tool_card"]').length).toBe(11);

    // Category chip filters cleanly to MTSS & Equity (2 tools)
    const equityBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('MTSS & Equity'));
    expect(equityBtn).toBeTruthy();
    await act(async () => { equityBtn.click(); });
    expect(equityBtn.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelectorAll('[data-help-key="adminhub_tool_card"]').length).toBe(2);

    // Search filters within category and Escape clears search without closing hub
    const searchInput = host.querySelector('input[aria-label="Filter leadership tools by name or description"]');
    expect(searchInput).toBeTruthy();
    setInputValue(searchInput, 'Disproportionality');
    expect(host.querySelectorAll('[data-help-key="adminhub_tool_card"]').length).toBe(1);

    act(() => {
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(searchInput.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();

    // Reset back to All tools
    const allBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('All tools'));
    await act(async () => { allBtn.click(); });
    expect(host.querySelectorAll('[data-help-key="adminhub_tool_card"]').length).toBe(11);

    await runAxe(host);
  });

  it('LiveLessonRunPanel shows step progress rail, metadata-only readiness badges, delivery bar, 6+ step filter, and passes axe', async () => {
    const steps = [1, 2, 3, 4, 5, 6].map((n) => ({
      id: `step-${n}`,
      type: n === 6 ? 'quiz' : 'simplified',
      title: n === 5 ? 'Photosynthesis Diagram' : `Lesson Step ${n}`,
    }));
    const SECRET_CUE = 'SECRET_TEACHER_CUE_NOT_IN_PROGRESS_HEADER';
    const host = mountEl(React.createElement(LiveLessonRunPanel, {
      history: steps,
      getStudentSafeResources: (items) => items,
      currentItemId: 'step-2',
      currentResourceId: 'step-2',
      sessionMode: 'sync',
      roster: {
        s1: { name: 'Ana', viewingResourceId: 'step-2' },
        s2: { name: 'Bo', viewingResourceId: 'step-2' },
        s3: { name: 'Cy', viewingResourceId: 'step-1' },
      },
      presenterCuesByResourceId: {
        'step-2': {
          sayAsk: SECRET_CUE,
          checkpoint: { kind: 'word_cloud', prompt: 'One word for energy?' },
        },
      },
      getTitle: (item) => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      t: () => undefined,
    }));

    // Step progress rail + metadata-only summary
    const progressRegion = host.querySelector('[data-live-lesson-progress]');
    expect(progressRegion).toBeTruthy();
    expect(progressRegion.textContent).toContain('Step 2 of 6 · 33%');
    expect(progressRegion.textContent).toContain('1 cue · 1 checkpoint');
    expect(progressRegion.textContent).not.toContain(SECRET_CUE);
    const bar = progressRegion.querySelector('[role="progressbar"]');
    expect(bar.getAttribute('aria-valuenow')).toBe('2');
    expect(bar.getAttribute('aria-valuemax')).toBe('6');

    // Focused step status badges & live delivery progress bar (2 of 3 = 67%)
    expect(host.textContent).toContain('Cue ready');
    expect(host.textContent).toContain('Word cloud ready');
    expect(host.textContent).toContain('2 of 3 last reported on this step (67%)');
    expect(host.querySelector('[data-live-delivery-progress]')).toBeTruthy();

    // 6+ steps shows step filter and narrows options while keeping current step selectable
    const stepFilter = host.querySelector('input[aria-label="Filter lesson steps"]');
    expect(stepFilter).toBeTruthy();
    setInputValue(stepFilter, 'Photosynthesis');
    const stepSelect = host.querySelector('select[aria-label="Choose a lesson step"]');
    const optionTexts = Array.from(stepSelect.querySelectorAll('option')).map((o) => o.textContent);
    expect(optionTexts.some((txt) => txt.includes('Photosynthesis Diagram'))).toBe(true);
    expect(optionTexts.length).toBeLessThan(6);

    act(() => {
      stepFilter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(stepFilter.value).toBe('');
    expect(stepSelect.querySelectorAll('option').length).toBe(6);

    await runAxe(host);
  });
});
