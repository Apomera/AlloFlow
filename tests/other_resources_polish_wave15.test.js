import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let ConfirmDialog;
let SidebarTabsNav;
let MaineSldPracticePanel;
let OnboardingCoach;

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

  delete window.AlloModules.ConfirmDialog;
  loadAlloModule('view_confirm_dialog_module.js');
  ConfirmDialog = window.AlloModules.ConfirmDialog.ConfirmDialog;

  delete window.AlloModules.SidebarTabsNav;
  loadAlloModule('view_sidebar_tabs_nav_module.js');
  SidebarTabsNav = window.AlloModules.SidebarTabsNav.SidebarTabsNav;

  delete window.AlloModules.MaineSldPractice;
  loadAlloModule('maine_sld_practice_module.js');
  MaineSldPracticePanel = window.AlloModules.MaineSldPractice.MaineSldPracticePanel;

  delete window.AlloModules.OnboardingCoach;
  loadAlloModule('onboarding_coach_module.js');
  OnboardingCoach = window.AlloModules.OnboardingCoach.OnboardingCoach;
});

afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
  localStorage.clear();
  sessionStorage.clear();
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  document.body.style.overflow = '';
  delete window.AlloOnboarding;
  vi.restoreAllMocks();
});

describe('Other resources polish — Wave 15', () => {
  it('ConfirmDialog renders non-color-only tone badge, detail box, Escape hint, Cancel-first focus, and passes axe', async () => {
    const onConfirm = vi.fn();
    const setConfirmDialog = vi.fn();
    const host = mountEl(
      React.createElement(ConfirmDialog, {
        confirmDialog: {
          title: 'Remove saved draft?',
          message: 'This clears the temporary classroom draft.',
          detail: 'Published assignments are unaffected.',
          tone: 'danger',
          confirmText: 'Remove draft',
          cancelText: 'Keep draft',
          onConfirm,
        },
        setConfirmDialog,
        t: (k) => k,
      })
    );

    const dialog = host.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
    const badge = dialog.querySelector('[data-confirm-tone="danger"]');
    expect(badge.textContent.trim()).toBe('Caution');
    expect(dialog.querySelector('#alloflow-confirm-detail').textContent).toContain('Published assignments are unaffected.');
    expect(dialog.textContent).toContain('Press');
    expect(dialog.textContent).toContain('Esc');
    expect(dialog.textContent).toContain('to cancel');

    const keepBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Keep draft');
    expect(document.activeElement).toBe(keepBtn);

    await runAxe(host);

    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Remove draft');
    act(() => { confirmBtn.click(); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(setConfirmDialog).toHaveBeenCalledWith(null);
  });

  it('SidebarTabsNav announces unread pulse via polite status, guards IME keys, keeps exact tab labels, and passes axe', async () => {
    function Harness() {
      const [active, setActive] = React.useState('create');
      const [pulsing, setPulsing] = React.useState(true);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(SidebarTabsNav, {
          activeSidebarTab: active,
          handleSetActiveSidebarTabToCreate: () => setActive('create'),
          isHistoryPulsing: pulsing,
          setActiveSidebarTab: setActive,
          setIsHistoryPulsing: setPulsing,
          t: (k) => k,
        }),
        React.createElement('div', {
          id: 'sidebar-create-panel',
          role: 'tabpanel',
          'aria-labelledby': 'tab-create',
          hidden: active !== 'create',
        }, 'Create workspace'),
        React.createElement('div', {
          id: 'sidebar-history-panel',
          role: 'tabpanel',
          'aria-labelledby': 'tab-history',
          hidden: active !== 'history',
        }, 'Saved materials')
      );
    }

    const host = mountEl(React.createElement(Harness));
    const tabs = Array.from(host.querySelectorAll('[role="tab"]'));
    expect(tabs).toHaveLength(2);
    expect(tabs[0].textContent.trim()).toBe('Create');
    expect(tabs[1].textContent.trim()).toBe('Class & Materials');
    expect(tabs[0].hasAttribute('aria-label')).toBe(false);
    expect(tabs[1].hasAttribute('aria-label')).toBe(false);

    const status = host.querySelector('[data-sidebar-pulse-status]');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toContain('New saved item available in Class & Materials');

    // IME composition should not move tab focus
    tabs[0].focus();
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true, isComposing: true });
    Object.defineProperty(imeEvent, 'keyCode', { value: 229 });
    act(() => { tabs[0].dispatchEvent(imeEvent); });
    expect(document.activeElement).toBe(tabs[0]);

    // Clean ArrowRight moves focus to sibling tab
    act(() => { tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); });
    expect(document.activeElement).toBe(tabs[1]);

    await runAxe(host);

    // Switching to history clears the pulse and live status
    act(() => { tabs[1].click(); });
    expect(status.textContent.trim()).toBe('');
  });

  it('MaineSldPracticePanel provides accessible step progressbar, 44px targets, board count, Escape search clear, and passes axe', async () => {
    const onClose = vi.fn();
    const host = mountEl(
      React.createElement(MaineSldPracticePanel, {
        onClose,
        t: (k, fallback) => fallback || k,
      })
    );

    const styleTag = host.querySelector('style');
    expect(styleTag.textContent).toContain('.msld button{cursor:pointer;min-height:44px}');
    expect(styleTag.textContent).toContain('.msld-jump a{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px');

    const progressbar = host.querySelector('[role="progressbar"]');
    expect(progressbar).toBeTruthy();
    expect(progressbar.getAttribute('aria-valuenow')).toBe('1');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('5');
    expect(progressbar.getAttribute('aria-valuetext')).toContain('Step 1 of 5: Case record');

    // Navigate to Score record
    const scoresBtn = host.querySelector('[data-testid="step-scores"]');
    act(() => { scoresBtn.click(); });
    expect(progressbar.getAttribute('aria-valuenow')).toBe('2');
    expect(host.querySelector('[data-testid="selected-score-count"]').textContent).toBe('0 of 52 scores on board');

    // Pin a score and verify both board count badge and sidebar step meta update
    const firstPin = host.querySelector('[data-testid^="score-pin-"]');
    act(() => { firstPin.click(); });
    expect(host.querySelector('[data-testid="selected-score-count"]').textContent).toBe('1 of 52 scores on board');
    expect(host.querySelector('[data-testid="step-evidence"] .msld-step-meta').textContent).toBe('1');

    // Score search Escape clears query without closing modal (and guards IME)
    const searchInput = host.querySelector('input[type="search"]');
    setInputValue(searchInput, 'fluency');
    expect(searchInput.value).toBe('fluency');

    const imeEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, isComposing: true });
    Object.defineProperty(imeEsc, 'keyCode', { value: 229 });
    act(() => { searchInput.dispatchEvent(imeEsc); });
    expect(searchInput.value).toBe('fluency');
    expect(onClose).not.toHaveBeenCalled();

    act(() => { searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(searchInput.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();

    // Navigate to Reasoning and verify recorded-state cue on Q1 map button
    act(() => { host.querySelector('[data-testid="step-reasoning"]').click(); });
    const q1Jump = host.querySelector('[data-testid="jump-q1"]');
    expect(q1Jump.getAttribute('data-recorded')).toBe('false');
    setInputValue(host.querySelector('[data-testid="q1-note"]'), 'Classroom and assessment records align.');
    expect(q1Jump.getAttribute('data-recorded')).toBe('true');

    await runAxe(host);
  });

  it('OnboardingCoach renders direct Choose mode CTAs, starter prompts, live counter, Escape draft clear, and passes axe', async () => {
    const pickMode = vi.fn();
    const setRunTour = vi.fn();
    window.AlloOnboarding = {
      isCoachAvailable: () => true,
      getCoachBuffer: () => [],
      getCoachUsage: () => ({ remaining: 18, cap: 20, used: 2, isOnline: true }),
      previewScrub: () => ({ flags: [], riskLevel: 'none', scrubbed: '' }),
      isOnboardingTTSEnabled: () => false,
      announce: vi.fn(),
    };

    const host = mountEl(
      React.createElement(OnboardingCoach, {
        embedded: false,
        pickMode,
        setRunTour,
        t: (k) => k,
      })
    );

    const launcher = host.querySelector('[data-help-key="onboarding_ask_allobot_button"]');
    act(() => { launcher.click(); });

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    // Direct Choose mode CTAs on all 4 mode cards
    const guidedChoose = dialog.querySelector('[data-coach-pick-mode="guided"]');
    const educatorChoose = dialog.querySelector('[data-coach-pick-mode="educator"]');
    expect(guidedChoose).toBeTruthy();
    expect(educatorChoose.getAttribute('aria-label')).toContain('password-protected');

    // Expand Q&A drawer if collapsed on narrow jsdom width
    const qaToggle = dialog.querySelector('[aria-controls="onboarding-coach-qa-body"]');
    if (qaToggle.getAttribute('aria-expanded') === 'false') {
      act(() => { qaToggle.click(); });
    }

    // Starter prompt chips populate draft without auto-sending
    const firstStarter = dialog.querySelector('[data-coach-starter-prompt="0"]');
    expect(firstStarter).toBeTruthy();
    act(() => { firstStarter.click(); });

    const textarea = dialog.querySelector('[data-help-key="onboarding_coach_input"]');
    expect(textarea.value).toBe(firstStarter.textContent);
    expect(dialog.querySelector('[data-coach-char-count]').textContent).toBe(`${textarea.value.length}/500`);

    await runAxe(host);

    // First Escape clears draft without dismissing dialog
    act(() => { textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(textarea.value).toBe('');
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();

    // Clicking Choose dispatches pickMode and closes the coach panel
    act(() => { guidedChoose.click(); });
    expect(pickMode).toHaveBeenCalledWith('guided');
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
});
