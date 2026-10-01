import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadGames, getGame } from './helpers/games_harness.js';

// Before this, a learner who checked a board with any mistake had one way
// forward: Reset, which sent every card back to the deck, correct ones
// included. "Fix the N incorrect" keeps correct cards locked in place and
// returns only the wrong ones. Placements are driven through the keyboard path
// (select a card, then the bucket's "Move here" button) because jsdom has no
// drag-and-drop.
const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, ConceptSortGame, root, host;

const DATA = {
  categories: [{ id: 'cat-a', label: 'Mammals', color: 'bg-indigo-500' }, { id: 'cat-b', label: 'Birds', color: 'bg-pink-500' }],
  items: [
    { id: 'i1', content: 'Dog', categoryId: 'cat-a' },
    { id: 'i2', content: 'Cat', categoryId: 'cat-a' },
    { id: 'i3', content: 'Robin', categoryId: 'cat-b' },
    { id: 'i4', content: 'Owl', categoryId: 'cat-b' },
  ],
};

const card = (text) => Array.from(host.querySelectorAll('[role="button"][aria-label]')).find((el) => el.getAttribute('aria-label').startsWith(text + '.'));
const buttonWithText = (text) => Array.from(host.querySelectorAll('button')).find((el) => el.textContent.includes(text) || (el.getAttribute('aria-label') || '').includes(text));
const moveHereButtons = () => Array.from(host.querySelectorAll('button[data-move-here]'));
async function click(el) { expect(el, 'element to click').toBeTruthy(); await act(async () => { el.click(); }); }
async function place(text, bucketIndex) {
  await click(card(text));
  const targets = moveHereButtons();
  expect(targets.length, 'move-here targets after selecting ' + text).toBeGreaterThan(bucketIndex);
  await click(targets[bucketIndex]);
}

async function mount(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(ConceptSortGame, { data: DATA, onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}, ...props }));
  });
}

beforeAll(() => {
  loadGames();
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  ConceptSortGame = getGame('ConceptSortGame');
}, 30_000);

afterEach(async () => {
  if (root) { await act(async () => { root.unmount(); }); root = null; }
  if (host) { host.remove(); host = null; }
});

describe('ConceptSortGame retry keeps correct cards', () => {
  it('locks correct cards and returns only incorrect ones to the deck', async () => {
    const completions = [];
    await mount({ onGameComplete: (type, payload) => completions.push({ type, payload }) });
    // Check is disabled until every card is placed.
    const check = buttonWithText('concept_sort.check_answers');
    expect(check.disabled).toBe(true);
    // Three right, one wrong: Owl goes to Mammals.
    await place('Dog', 0);
    await place('Cat', 0);
    await place('Robin', 1);
    await place('Owl', 0);
    expect(buttonWithText('concept_sort.check_answers').disabled).toBe(false);
    await click(buttonWithText('concept_sort.check_answers'));
    expect(completions.at(-1).type).toBe('conceptSortAttempt');
    expect(completions.at(-1).payload.correctPlacements).toBe(3);

    // The new control appears only after a check with mistakes. The harness t() returns raw keys.
    const fix = buttonWithText('concept_sort.retry_incorrect');
    expect(fix).toBeTruthy();
    await click(fix);

    // Correct cards are locked: not draggable, out of the tab order, labelled as locked.
    ['Dog', 'Cat', 'Robin'].forEach((text) => {
      const el = card(text);
      expect(el.getAttribute('draggable')).toBe('false');
      expect(el.getAttribute('tabindex')).toBe('-1');
      expect(el.getAttribute('data-locked')).toBe('true');
      expect(el.getAttribute('aria-label')).toMatch(/locked/i);
    });
    // The incorrect card is back in the deck and movable; the fix control is gone; Check waits for it.
    const owl = card('Owl');
    expect(owl.getAttribute('draggable')).toBe('true');
    expect(owl.getAttribute('data-locked')).toBeNull();
    expect(owl.getAttribute('aria-label')).toContain('concept_sort.unsorted_aria');
    expect(buttonWithText('concept_sort.retry_incorrect')).toBeUndefined();
    expect(buttonWithText('concept_sort.check_answers').disabled).toBe(true);
    // A locked card cannot be selected for a keyboard move.
    await click(card('Dog'));
    expect(moveHereButtons()).toHaveLength(0);

    // Fix the one mistake and finish.
    await place('Owl', 1);
    await click(buttonWithText('concept_sort.check_answers'));
    expect(completions.at(-1).type).toBe('conceptSort');
    expect(completions.at(-1).payload.isPerfect).toBe(true);
    expect(completions.at(-1).payload.attempts).toBe(2);
  }, 30_000);

  it('Reset still clears everything, including locks', async () => {
    await mount();
    await place('Dog', 0);
    await place('Cat', 0);
    await place('Robin', 1);
    await place('Owl', 0);
    await click(buttonWithText('concept_sort.check_answers'));
    await click(buttonWithText('concept_sort.retry_incorrect'));
    expect(host.querySelectorAll('[data-locked="true"]')).toHaveLength(3);
    await click(buttonWithText('concept_sort.reset_board'));
    expect(host.querySelectorAll('[data-locked="true"]')).toHaveLength(0);
    // Every card is back in the deck and movable.
    ['Dog', 'Cat', 'Robin', 'Owl'].forEach((text) => {
      expect(card(text).getAttribute('draggable')).toBe('true');
      expect(card(text).getAttribute('aria-label')).toContain('concept_sort.unsorted_aria');
    });
  }, 30_000);
});

describe('ConceptSortGame add-item gating', () => {
  it('shows the AI add box only when allowed and a generator exists', async () => {
    await mount({ onGenerateItem: async () => null });
    expect(host.querySelector('[data-help-key="concept_sort_add_item"]')).toBeTruthy();
    await act(async () => { root.unmount(); });
    root = null;
    await mount({ onGenerateItem: async () => null, allowAddItems: false });
    expect(host.querySelector('[data-help-key="concept_sort_add_item"]')).toBeNull();
    await act(async () => { root.unmount(); });
    root = null;
    await mount({ allowAddItems: true });
    expect(host.querySelector('[data-help-key="concept_sort_add_item"]')).toBeNull();
  }, 30_000);
});
