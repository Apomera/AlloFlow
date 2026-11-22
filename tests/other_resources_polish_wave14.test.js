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
let GlobalLevelUpModal;
let KokoroOfferModal;
let PromptDialog;
let registeredEducatorView;

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

  delete window.AlloModules.GlobalLevelUpModal;
  loadAlloModule('view_global_level_up_module.js');
  GlobalLevelUpModal = window.AlloModules.GlobalLevelUpModal.GlobalLevelUpModal;

  delete window.AlloModules.KokoroOfferModal;
  loadAlloModule('view_kokoro_offer_modal_module.js');
  KokoroOfferModal = window.AlloModules.KokoroOfferModal.KokoroOfferModal;

  delete window.AlloModules.PromptDialog;
  loadAlloModule('view_prompt_dialog_module.js');
  PromptDialog = window.AlloModules.PromptDialog.PromptDialog;

  window.ResearchHub = {
    registerEducatorView(view) { registeredEducatorView = view; },
    helpers: {
      researchStorageHealth: () => ({ percent: 18, status: 'healthy' }),
    },
  };
  delete window.AlloModules.ResearchHubEducator;
  new Function(readFileSync(resolve(process.cwd(), 'research_hub_educator_module.js'), 'utf8'))();
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
  delete window.__kokoroTTSDownloading;
  delete window.alloCopyText;
  vi.restoreAllMocks();
});

describe('Wave 14 polish: Global Level-Up, Kokoro Offer, Prompt Dialog, Research Hub Educator', () => {
  it('GlobalLevelUpModal displays remaining XP to next milestone, accessible progressbar, and passes axe', async () => {
    const onClose = vi.fn();
    const host = mountEl(React.createElement(GlobalLevelUpModal, {
      AnimatedNumber: ({ value }) => React.createElement('span', null, String(value)),
      ConfettiExplosion: () => null,
      adventureState: { level: 4, xp: 65, xpToNextLevel: 100 },
      handleSetShowGlobalLevelUpToFalse: onClose,
      t: (k, params) => ({
        'common.new_badge': 'NEW',
        'feedback.level_up_title': 'Level Up!',
        'feedback.level_reached': `You reached Level ${params?.level ?? 1}`,
        'feedback.next_milestone': 'Next milestone',
        'common.xp': 'XP',
        'feedback.continue_learning': 'Continue learning',
      }[k] || k),
    }));

    expect(host.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('65');
    const remaining = host.querySelector('[data-testid="global-level-up-remaining"]');
    expect(remaining).toBeTruthy();
    expect(remaining.textContent).toContain('35 XP to next milestone');

    await runAxe(host);
  });

  it('KokoroOfferModal shows key-facts badges, Student Mode / downloading notices, and passes axe', async () => {
    window.__alloStudentAiDisabled = true;
    const host = mountEl(React.createElement(KokoroOfferModal, {
      setShowKokoroOfferModal: vi.fn(),
      setSelectedVoice: vi.fn(),
      addToast: vi.fn(),
    }));

    const facts = host.querySelector('[data-testid="kokoro-offer-facts"]');
    expect(facts).toBeTruthy();
    expect(facts.textContent).toContain('~88 MB one-time');
    expect(facts.textContent).toContain('Runs on this device');
    expect(facts.textContent).toContain('Free · English');
    expect(host.querySelector('[data-testid="kokoro-student-notice"]')).toBeTruthy();
    await runAxe(host);

    // Downloading notice when not in student mode
    window.__alloStudentAiDisabled = false;
    window.__kokoroTTSDownloading = true;
    const dlHost = mountEl(React.createElement(KokoroOfferModal, {
      setShowKokoroOfferModal: vi.fn(),
      setSelectedVoice: vi.fn(),
      addToast: vi.fn(),
    }));
    expect(dlHost.querySelector('[data-testid="kokoro-downloading-notice"]')).toBeTruthy();
    await runAxe(dlHost);
  });

  it('PromptDialog displays live character count + multiline hint, 6+ choice filter with Escape clear, and passes axe', async () => {
    const setPromptDialog = vi.fn();
    const host = mountEl(React.createElement(PromptDialog, {
      promptDialog: {
        title: 'Refine visual',
        message: 'Describe your visual change.',
        multiline: true,
        maxLength: 50,
        defaultValue: 'Add labels',
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      },
      setPromptDialog,
      t: () => '',
    }));

    expect(host.textContent).toContain('Ctrl/Cmd + Enter to submit');
    const counter = host.querySelector('[data-testid="prompt-dialog-char-count"]');
    expect(counter.textContent).toBe('10 / 50');
    const textarea = host.querySelector('textarea');
    setInputValue(textarea, 'Add clear chlorophyll labels and sunlight arrows');
    expect(counter.textContent).toBe('48 / 50');
    await runAxe(host);

    // 6+ choices reveals option filter and Escape clears filter without dismissing dialog
    const onCancelChoices = vi.fn();
    const choiceHost = mountEl(React.createElement(PromptDialog, {
      promptDialog: {
        title: 'Pick a source',
        message: 'Choose a reading.',
        choices: [1, 2, 3, 4, 5, 6].map((n) => ({
          value: `src-${n}`,
          label: n === 6 ? 'Volcano Geology' : `Source ${n}`,
          description: `Summary ${n}`,
        })),
        onSubmit: vi.fn(),
        onCancel: onCancelChoices,
      },
      setPromptDialog: vi.fn(),
      t: () => '',
    }));

    const statusBadge = choiceHost.querySelector('[data-testid="prompt-dialog-choice-status"]');
    expect(statusBadge.textContent).toContain('6 options');
    expect(statusBadge.textContent).toContain('Select one');

    const filterInput = choiceHost.querySelector('input[data-prompt-choice-filter="true"]');
    expect(filterInput).toBeTruthy();
    setInputValue(filterInput, 'Volcano');
    expect(choiceHost.querySelectorAll('input[type="radio"]').length).toBe(1);

    act(() => {
      filterInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(filterInput.value).toBe('');
    expect(onCancelChoices).not.toHaveBeenCalled();
    expect(choiceHost.querySelectorAll('input[type="radio"]').length).toBe(6);

    await runAxe(choiceHost);
  });

  it('ResearchHubEducator renders Inquiry Health Scorecard, copies trajectory summary, and passes axe', async () => {
    expect(registeredEducatorView).toBeTruthy();
    window.alloCopyText = vi.fn(async () => true);

    const journal = {
      questionTitle: 'How does light wavelength affect oxygen output in aquatic plants?',
      activeLane: 'scientific',
      activeMethodPack: 'scientific_investigation',
      activeStage: 'test_revise',
      createdAt: Date.now() - 15 * 60000,
      loopBacks: [{ id: 'l1', whyChipId: 'data_contradicted', returnedToOrigin: true }],
      modelSnapshots: [
        { v: 1, ts: Date.now() - 10 * 60000, text: 'Initial model', confidence: 'high' },
        { v: 2, ts: Date.now() - 2 * 60000, text: 'Revised model', confidence: 'medium', loopBackOrigin: { fromStage: 'test_revise' } },
      ],
      sources: [{ id: 's1', sift: { tierHistory: [] } }],
      capturedArtifacts: [],
      claimEvidenceLinks: [],
      aiHistory: [
        { touchpoint: 'model_coach', blocked: false },
        { touchpoint: 'model_coach', blocked: true },
      ],
    };

    const host = mountEl(registeredEducatorView.render({
      journal,
      onExit: vi.fn(),
      t: () => '',
    }));

    const scorecard = host.querySelector('[data-educator-scorecard="true"]');
    expect(scorecard).toBeTruthy();
    expect(scorecard.textContent).toContain('Loop-backs');
    expect(scorecard.textContent).toContain('Revisions & builds');
    expect(scorecard.textContent).toContain('1 / 1 gated');

    const copyBtn = host.querySelector('[data-educator-copy-summary="true"]');
    expect(copyBtn).toBeTruthy();
    await act(async () => {
      copyBtn.click();
      await Promise.resolve();
    });
    expect(window.alloCopyText).toHaveBeenCalledTimes(1);
    expect(window.alloCopyText.mock.calls[0][0]).toContain('Inquiry Health Summary');
    expect(window.alloCopyText.mock.calls[0][0]).toContain('Loop-backs: 1');
    expect(copyBtn.textContent).toContain('Copied summary');

    await runAxe(host);
  });
});
