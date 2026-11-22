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
let LanguageContext;
let UILanguageSelector;
let StudentJoinPanel;
let ImageAssetEditor;
let SchoolRewardsPanel;

const mounted = [];
const PNG_HEADER = 'data:image/png;base64,iVBORw0KGgo=';
const PORTAL = 'https://script.google.com/macros/s/AKfycbxyz_123-abc/exec';

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
  LanguageContext = window.AlloLanguageContext = React.createContext({});
  window.AlloIcons = new Proxy({}, { get: () => () => null });

  delete window.AlloModules.UILanguageSelector;
  loadAlloModule('ui_language_selector_module.js');
  UILanguageSelector = window.AlloModules.UILanguageSelector;

  delete window.AlloModules.StudentJoinPanel;
  loadAlloModule('view_student_join_panel_module.js');
  StudentJoinPanel = window.AlloModules.StudentJoinPanel.StudentJoinPanel || window.AlloModules.StudentJoinPanel;

  delete window.AlloModules.ImageAssetEditor;
  delete window.AlloModules.ImageAssetTools;
  loadAlloModule('image_asset_editor_module.js');
  ImageAssetEditor = window.AlloModules.ImageAssetEditor;

  delete window.AlloModules.SchoolRewards;
  new Function(readFileSync(resolve(process.cwd(), 'school_rewards_module.js'), 'utf8'))();
  SchoolRewardsPanel = window.AlloModules.SchoolRewards.SchoolRewardsPanel;
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
  delete window.__alloStudentAiDisabled;
  delete window.alloCopyText;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Wave 12 polish: UI Language Selector, Student Join Panel, Image Asset Editor, School Rewards', () => {
  it('UiLanguageSelector matches native endonyms in manual input, clears on Escape, exposes progressbar when translating, and passes axe', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        available: [
          { display: 'French', endonym: 'Français', provenance: 'ai-drafted' },
          { display: 'Somali', endonym: 'Soomaali', provenance: 'ai-drafted' },
        ],
      }),
    })));
    window.__alloStudentAiDisabled = true; // Deployed endonyms must still resolve even when AI translation is disabled
    const setUiLanguage = vi.fn();
    const ctx = {
      t: (k) => k,
      currentUiLanguage: 'English',
      setUiLanguage,
      isTranslating: false,
      progress: 0,
      statusMessage: '',
      regenerateLanguage: vi.fn(),
      exportLanguagePack: vi.fn(),
      importLanguagePack: vi.fn(),
    };

    const host = mountEl(React.createElement(
      LanguageContext.Provider,
      { value: ctx },
      React.createElement(UILanguageSelector, {})
    ));
    await act(async () => { await Promise.resolve(); });

    const manual = host.querySelector('input[data-help-key="ui_lang_manual_input"]');
    expect(manual).toBeTruthy();
    setInputValue(manual, 'Soomaali');
    act(() => {
      manual.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(manual.value).toBe('');

    setInputValue(manual, 'Français');
    await act(async () => {
      host.querySelector('button[data-help-key="ui_lang_manual_submit"]').click();
    });
    expect(setUiLanguage).toHaveBeenCalledWith('French');

    await runAxe(host);

    // Translating state renders accessible clamped progressbar
    const progressHost = mountEl(React.createElement(
      LanguageContext.Provider,
      { value: { ...ctx, isTranslating: true, progress: 64, statusMessage: 'Loading French...' } },
      React.createElement(UILanguageSelector, {})
    ));
    const bar = progressHost.querySelector('[role="progressbar"]');
    expect(bar).toBeTruthy();
    expect(bar.getAttribute('aria-valuenow')).toBe('64');
    await runAxe(progressHost);
  });

  it('StudentJoinPanel renders 5-char slot progress, live readiness cue, clear button + Escape reset, and passes axe', async () => {
    const onJoin = vi.fn(async () => {});
    const onCollapse = vi.fn();
    function Harness() {
      const [code, setCode] = React.useState('AB3');
      const [hostId, setHostId] = React.useState('');
      return React.createElement(StudentJoinPanel, {
        appId: 'demo-app',
        isJoinPanelExpanded: true,
        handleSetIsJoinPanelExpandedToFalse: onCollapse,
        handleSetIsJoinPanelExpandedToTrue: vi.fn(),
        joinAppIdInput: hostId,
        setJoinAppIdInput: setHostId,
        joinCodeInput: code,
        setJoinCodeInput: setCode,
        joinClassSession: onJoin,
        t: (k) => ({
          'common.minimize': 'Minimize',
          'session.join_panel_title': 'Join Class',
          'session.join_instructions': 'Enter your 5-character class code.',
          'session.host_id_optional': 'Host ID (optional)',
          'session.default_prefix': 'Default:',
          'common.enter_join_code_input': 'Class join code',
          'session.code_placeholder': 'ABCDE',
          'session.join_action': 'Join class',
          'session.join': 'Join Class',
          'session.sync_desc': 'Connect to a live session',
        }[k] || k),
      });
    }

    const host = mountEl(React.createElement(Harness));
    const progress = host.querySelector('[data-testid="student-join-code-progress"]');
    expect(progress).toBeTruthy();
    expect(progress.textContent).toContain('3 / 5');

    const input = host.querySelector('#student-join-code');
    setInputValue(input, 'ab34z');
    expect(progress.textContent).toContain('5-character code ready');

    const clearBtn = host.querySelector('button[aria-label="Clear join code"]');
    expect(clearBtn).toBeTruthy();
    await act(async () => { clearBtn.click(); });
    expect(input.value).toBe('');
    expect(progress.textContent).toContain('0 / 5');

    // Escape on empty input collapses the panel
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(onCollapse).toHaveBeenCalledTimes(1);

    await runAxe(host);
  });

  it('ImageAssetEditor shows framing summary pill, crop focal guide, one-click focus presets, and passes axe', async () => {
    const host = mountEl(React.createElement(ImageAssetEditor, {
      sourceDataUrl: PNG_HEADER,
      sourceName: 'ecosystem-diagram.png',
      onApply: vi.fn(),
      onCancel: vi.fn(),
    }));

    const summary = host.querySelector('[data-testid="image-asset-summary"]');
    expect(summary).toBeTruthy();
    expect(summary.textContent).toContain('Fit · Original');
    expect(host.querySelector('[data-testid="image-asset-focal-indicator"]')).toBeNull();

    // Switch to crop mode
    const cropRadio = Array.from(host.querySelectorAll('input[type="radio"]'))[1];
    await act(async () => { cropRadio.click(); });
    expect(summary.textContent).toContain('Crop · Square (1:1) · 100%');
    expect(host.querySelector('[data-testid="image-asset-focal-indicator"]')).toBeTruthy();

    // Click Top quick-focus preset
    const topBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Top');
    expect(topBtn).toBeTruthy();
    await act(async () => { topBtn.click(); });
    expect(topBtn.getAttribute('aria-pressed')).toBe('true');
    const verticalSlider = host.querySelector('input[aria-label="Vertical image focus"]');
    expect(verticalSlider.value).toBe('15');

    await runAxe(host);
  });

  it('SchoolRewardsPanel displays setup progress pill + jump-to-next focus, one-tap copy saved URL, and passes axe', async () => {
    window.alloCopyText = vi.fn(async () => true);

    const host = mountEl(React.createElement(SchoolRewardsPanel, {
      isOpen: true,
      onClose: vi.fn(),
      t: () => null,
      addToast: vi.fn(),
      portalUrl: PORTAL,
      initialPath: 'setup',
    }));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    // Connected state shows one-tap Copy address button
    const copyUrlBtn = host.querySelector('[data-testid="schoolrewards-copy-url"]');
    expect(copyUrlBtn).toBeTruthy();
    await act(async () => {
      copyUrlBtn.click();
      await Promise.resolve();
    });
    expect(window.alloCopyText).toHaveBeenCalledWith(PORTAL);
    expect(copyUrlBtn.textContent).toContain('Copied');

    // Guided checklist shows progress pill (1/10 because connected is auto-checked) and jump-to-next focuses #sr-card-approval
    const progressPill = host.querySelector('[data-testid="schoolrewards-progress-pill"]');
    expect(progressPill).toBeTruthy();
    expect(progressPill.textContent).toContain('1 / 10 (10%)');

    const jumpBtn = host.querySelector('[data-testid="schoolrewards-jump-next"]');
    expect(jumpBtn).toBeTruthy();
    await act(async () => { jumpBtn.click(); });
    expect(document.activeElement).toBe(host.querySelector('#sr-card-approval'));

    await runAxe(host);
  });
});
