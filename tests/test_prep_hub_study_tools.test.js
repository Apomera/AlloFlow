import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, Hub, Component, root, host, originalFetch;

const TEST_PACK_ID = 'study-tools-test-pack';
const TEST_LIBRARY_URL = './test_prep/study_tools_test_library.json';

const testPack = {
  schemaVersion: 1,
  id: TEST_PACK_ID,
  title: 'Study Tools Verification Pack',
  shortTitle: 'Study Tools Pack',
  description: 'Synthetic pack for testing strikeout, scratchpad, quick reference, and interactive workshops.',
  disclaimer: 'Unofficial test fixture only.',
  credentialOwner: 'Test Fixture',
  version: '1.0.0',
  status: 'ready',
  visibility: 'public',
  released: true,
  calibrated: false,
  batchSize: 2,
  simulationItemCount: 2,
  simulationTimeMinutes: 10,
  simulationDomainCounts: { 'unit-alpha': 2 },
  learningLibraryUrl: TEST_LIBRARY_URL,
  domains: [
    { id: 'unit-alpha', label: 'Unit Alpha', weight: 1 },
  ],
  items: [
    {
      id: 'st-item-1',
      type: 'single-choice',
      domainId: 'unit-alpha',
      prompt: 'Which step correctly applies the chain rule to sin(3x)?',
      choices: ['3 cos(3x)', 'cos(3x)', '-3 sin(3x)', '3 sin(3x)'],
      answerIndex: 0,
      rationale: 'Differentiate sine to cosine and multiply by the inner derivative 3.',
      choiceRationales: [
        'Best answer. Multiply cos(3x) by the inner derivative 3.',
        'Omits the chain-rule factor 3 from differentiating 3x.',
        'Confuses the derivative of sine with negative sine.',
        'Keeps sine instead of differentiating it to cosine.',
      ],
      references: [],
    },
    {
      id: 'st-item-2',
      type: 'single-choice',
      domainId: 'unit-alpha',
      prompt: 'What is the derivative of a constant 7 with respect to x?',
      choices: ['0', '7', '1', '7x'],
      answerIndex: 0,
      rationale: 'Constants have zero rate of change.',
      choiceRationales: [
        'Best answer. A constant does not change as x varies.',
        'Leaves the constant unchanged instead of differentiating.',
        'Confuses the derivative of x with the derivative of a constant.',
        'Integrates 7 instead of differentiating it.',
      ],
      references: [],
    },
  ],
};

const testLibrary = {
  schemaVersion: 1,
  packId: TEST_PACK_ID,
  title: 'Study Tools Pack Library',
  description: 'Synthetic learning library fixture.',
  chapters: [],
  flashcards: [],
  memoryAids: [
    {
      id: 'aid-legacy-text-shape',
      domainId: 'unit-alpha',
      title: 'Legacy text-field aid',
      text: 'This memory aid uses the legacy text property without tags.',
      reviewStatus: 'source-reviewed-editorial-pass',
    },
  ],
  quickReference: [
    {
      id: 'qr-alpha',
      domainId: 'unit-alpha',
      title: 'Unit Alpha Quick Formulas',
      purpose: 'Check derivative rules before practicing.',
      checklist: ['Identify outer and inner functions.'],
      formulas: ['d/dx sin(u) = cos(u) * u prime'],
      decisionRules: ['Use chain rule whenever an expression is nested.'],
      cautions: ['Do not drop the inner derivative factor.'],
    },
  ],
  constructedResponseWorkshops: [
    {
      id: 'ws-alpha',
      title: 'Chain Rule Explanation Workshop',
      taskType: 'Unscored explanation workshop',
      prompt: 'Explain how the chain rule applies to a composite trigonometric function.',
      stimulus: 'Consider f(x) = sin(3x) near x = 0.',
      estimatedMinutes: 12,
      taskParts: ['Identify the outer and inner functions.', 'Compute the derivative.'],
      planningFrame: [{ label: 'Setup', guidance: 'Name outer and inner pieces clearly.' }],
      successCriteria: ['Names both outer and inner functions.', 'Includes the inner derivative factor 3.'],
      commonPitfalls: ['Forgetting to multiply by 3.'],
      selfCheck: ['Did you check units or notation?'],
      sampleOutline: ['Outer is sin(u), inner is 3x, derivative is 3 cos(3x).'],
      unscored: true,
      officialItem: false,
      releaseEligible: false,
    },
  ],
  summary: {
    chapters: 0,
    sections: 0,
    knowledgeChecks: 0,
    flashcards: 0,
    memoryAids: 1,
    sourceReviewedChapters: 0,
    sourceReviewedFlashcards: 0,
    sourceReviewedMemoryAids: 1,
    editorialReviewedSourcePendingMemoryAids: 0,
  },
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  Hub.registerPack(testPack);
  Component = Hub.TestPrepHub;
  originalFetch = global.fetch;
  const mockFetch = async (url) => {
    if (String(url).includes('study_tools_test_library.json')) {
      return { ok: true, json: async () => testLibrary };
    }
    return { ok: false, json: async () => ({}) };
  };
  global.fetch = window.fetch = mockFetch;
}, 30_000);

afterAll(() => {
  global.fetch = window.fetch = originalFetch;
});

afterEach(async () => {
  if (root) {
    await act(async () => { root.unmount(); });
    root = null;
  }
  if (host && host.parentNode) host.parentNode.removeChild(host);
  host = null;
  window.localStorage.clear();
});

async function mountHub() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Component, { isOpen: true, onClose: () => {} }));
  });
  const card = host.querySelector('[data-test-prep-pack-id="' + TEST_PACK_ID + '"]');
  expect(card, 'Test pack card').toBeTruthy();
  const openBtn = Array.from(card.querySelectorAll('button')).find((btn) =>
    (btn.textContent || '').includes('Open practice pack')
  );
  expect(openBtn, 'Open practice pack button').toBeTruthy();
  await act(async () => { openBtn.click(); });
  // Wait for async learning library fetch to settle
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
}

function findButton(label) {
  return Array.from(host.querySelectorAll('button')).find((btn) =>
    (btn.textContent || '').trim().toLowerCase().includes(label.toLowerCase()) ||
    (btn.getAttribute('aria-label') || '').trim().toLowerCase().includes(label.toLowerCase())
  );
}

describe('Test Prep Hub study tools and AP library enhancements', () => {
  it('supports choice strikeout, inline scratchpad, and in-practice reference drawer (locked in timed simulation)', async () => {
    await mountHub();
    // Start standard practice bank from the practice options screen
    const startBankBtn = findButton('Start bank 1') || findButton('Practice Bank 1') || findButton('Start practice');
    expect(startBankBtn, 'Start bank button').toBeTruthy();
    await act(async () => { startBankBtn.click(); });

    // Strike out option A and verify aria-pressed + restore
    const strikeBtn = host.querySelector('button[aria-label="Strike out option A"]');
    expect(strikeBtn).toBeTruthy();
    expect(strikeBtn.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { strikeBtn.click(); });
    const restoreBtn = host.querySelector('button[aria-label="Restore option A"]');
    expect(restoreBtn).toBeTruthy();
    expect(restoreBtn.getAttribute('aria-pressed')).toBe('true');

    // Selecting option A automatically clears strikeout
    const radioA = host.querySelector('input[type="radio"]');
    await act(async () => { radioA.click(); });
    expect(host.querySelector('button[aria-label="Strike out option A"]')).toBeTruthy();

    // Open inline scratchpad, enter a note, and save to study notes
    const scratchpadToggle = findButton('Scratchpad');
    expect(scratchpadToggle).toBeTruthy();
    await act(async () => { scratchpadToggle.click(); });
    const textarea = host.querySelector('#test-prep-scratchpad-input');
    expect(textarea).toBeTruthy();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => {
      nativeSetter.call(textarea, 'Check inner derivative = 3');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const saveNoteBtn = findButton('Save to study notes');
    expect(saveNoteBtn && !saveNoteBtn.disabled).toBe(true);
    await act(async () => { saveNoteBtn.click(); });

    // Open in-practice quick reference drawer (triggers on-demand lazy load)
    const refToggle = findButton('Reference aid');
    expect(refToggle).toBeTruthy();
    await act(async () => { refToggle.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    expect(host.textContent).toContain('Unit Alpha Quick Formulas');
    expect(host.textContent).toContain('d/dx sin(u) = cos(u) * u prime');

    // Timed simulation hides Reference aid while keeping Scratchpad & Strikeout
    const optionsBtn = findButton('Practice options');
    await act(async () => { optionsBtn.click(); });
    const simBtn = findButton('Start timed simulation');
    expect(simBtn).toBeTruthy();
    await act(async () => { simBtn.click(); });
    expect(findButton('Reference aid')).toBeFalsy();
    expect(findButton('Scratchpad')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Strike out option A"]')).toBeTruthy();
  }, 30_000);

  it('uses dynamic pack title in Quick Reference, handles legacy memory aids safely, and powers interactive workshops', async () => {
    await mountHub();
    const libraryTab = findButton('Study library') || findButton('Library');
    expect(libraryTab).toBeTruthy();
    await act(async () => { libraryTab.click(); });

    // Quick Reference title should use pack title, not hardcoded AP Statistics
    const qrTab = findButton('Quick reference');
    expect(qrTab).toBeTruthy();
    await act(async () => { qrTab.click(); });
    expect(host.textContent).toContain('Study Tools Pack quick reference');
    expect(host.textContent).not.toContain('AP Statistics quick reference');

    // Memory Aids handles text-only aids without tags without crashing
    const maTab = findButton('Memory aids');
    expect(maTab).toBeTruthy();
    await act(async () => { maTab.click(); });
    const showAidBtn = findButton('Show aid');
    expect(showAidBtn).toBeTruthy();
    await act(async () => { showAidBtn.click(); });
    expect(host.textContent).toContain('This memory aid uses the legacy text property without tags.');

    // Interactive Constructed-Response Workshop drafting + self-check checkboxes + pacing timer
    const wsTab = findButton('Written-response workshops');
    expect(wsTab).toBeTruthy();
    await act(async () => { wsTab.click(); });
    const wsDraft = host.querySelector('#workshop-draft-ws-alpha');
    expect(wsDraft).toBeTruthy();
    const timerEl = host.querySelector('[role="timer"][aria-label*="workshop pacing timer"]');
    expect(timerEl).toBeTruthy();
    expect(timerEl.getAttribute('aria-live')).toBeNull();
    const checkboxes = host.querySelectorAll('details input[type="checkbox"]');
    expect(checkboxes.length).toBe(3); // 2 successCriteria + 1 selfCheck
    await act(async () => { checkboxes[0].click(); });
    expect(host.textContent).toContain('1 of 3 self-check items marked');
  }, 30_000);

  it('verifies AP Biology and AP Chemistry ship diagrams, section flashcards, and normalized Chemistry memory aids', () => {
    const bioLib = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/ap_biology_foundation_pilot_learning_library.json'), 'utf8'));
    expect(bioLib.diagrams).toHaveLength(8);
    expect(bioLib.diagramPlacements).toHaveLength(8);
    expect(bioLib.flashcards).toHaveLength(24);
    expect(bioLib.summary.diagrams).toBe(8);
    expect(bioLib.summary.flashcards).toBe(24);

    const chemLib = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/ap_chemistry_foundation_pilot_learning_library.json'), 'utf8'));
    expect(chemLib.diagrams).toHaveLength(9);
    expect(chemLib.diagramPlacements).toHaveLength(9);
    expect(chemLib.flashcards).toHaveLength(27);
    expect(chemLib.summary.diagrams).toBe(9);
    expect(chemLib.summary.flashcards).toBe(27);
    chemLib.memoryAids.forEach((aid) => {
      expect(typeof aid.content).toBe('string');
      expect(aid.content.length).toBeGreaterThan(20);
      expect(Array.isArray(aid.tags)).toBe(true);
      expect(typeof aid.domain).toBe('string');
    });
  });
});
