import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, mountGame } from './helpers/games_live_harness.js';

const firstReason = 'A dog belongs with mammals because it feeds its young milk.';
const secondReason = 'A robin belongs with birds because it has feathers. <img src="unsafe" onerror="alert(1)">';
const DATA = {
  categories: [{ id: 'mammals', label: 'Mammals' }, { id: 'birds', label: 'Birds' }],
  items: [
    { id: 'dog', content: 'Dog', categoryId: 'mammals', explanation: firstReason },
    { id: 'robin', content: 'Robin', categoryId: 'birds', explanation: secondReason },
  ],
};
let game;
const card = id => game.container.querySelector(`[data-concept-sort-item-id="${id}"]`);
const feedback = id => card(id).querySelector('[data-concept-sort-authored-feedback]');
const control = key => game.container.querySelector(`[data-help-key="${key}"]`);
async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => { element.click(); });
}
async function place(id, index) {
  await click(card(id));
  await click(game.container.querySelectorAll('[data-move-here]')[index]);
}
const check = () => click(control('concept_sort_check_answers'));
function mount(props = {}) {
  game = mountGame('ConceptSortGame', { data: DATA, onClose() {}, allowAddItems: false, ...props });
}
afterEach(() => {
  game?.unmount();
  game = null;
  delete window.__alloStudentAiDisabled;
});

describe('reviewed Concept Sort feedback', () => {
  it.each([false, true])('works without an AI callback when student AI is disabled=%s', async disabled => {
    window.__alloStudentAiDisabled = disabled;
    mount();
    expect(game.container.textContent).not.toContain(firstReason);
    expect(game.container.textContent).not.toContain(secondReason);
    expect(game.container.querySelector('details')).toBeNull();
    await place('dog', 0);
    await place('robin', 0);
    expect(game.container.textContent).not.toContain(firstReason);
    await check();

    for (const [id, reason, result] of [['dog', firstReason, 'Correct'], ['robin', secondReason, 'Incorrect']]) {
      expect(card(id).getAttribute('role')).toBe('group');
      expect(card(id).hasAttribute('aria-pressed')).toBe(false);
      expect(card(id).getAttribute('aria-label')).toContain(result);
      expect(card(id).getAttribute('aria-label')).not.toContain('move_aria');
      expect(feedback(id).open).toBe(false);
      expect(feedback(id).querySelector('p').textContent).toBe(reason);
      expect(feedback(id).querySelector('summary').textContent).toBe('Why?');
      expect(feedback(id).closest('[role="button"]')).toBeNull();
      await click(feedback(id).querySelector('summary'));
      expect(feedback(id).open).toBe(true);
    }
    // Authored explanations are escaped text, never an HTML injection surface.
    expect(card('robin').querySelector('img')).toBeNull();
    expect(game.container.querySelector('[data-move-here]')).toBeNull();
  });

  it('prefers authored feedback, preserves the attempt record, and hides review during retry and reset', async () => {
    const explain = vi.fn(async () => 'AI should not run');
    const complete = vi.fn();
    mount({ onExplainIncorrect: explain, onGameComplete: complete });
    await place('dog', 0);
    await place('robin', 0);
    await check();
    const attempt = complete.mock.calls[0];
    expect(attempt[0]).toBe('conceptSortAttempt');
    expect(attempt[1].correctPlacements).toBe(1);
    expect(attempt[1].incorrectPlacements.map(item => item.itemId)).toEqual(['robin']);
    expect(card('robin').querySelector('button[aria-label="games.explain_incorrect_aria"]')).toBeNull();
    await click(feedback('dog').querySelector('summary'));
    await click(feedback('robin').querySelector('summary'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(explain).not.toHaveBeenCalled();

    await click(control('concept_sort_retry_incorrect'));
    expect(game.container.querySelector('details')).toBeNull();
    expect(game.container.textContent).not.toContain(firstReason);
    expect(game.container.textContent).not.toContain(secondReason);
    expect(card('dog').getAttribute('role')).toBe('group');
    expect(card('dog').getAttribute('data-locked')).toBe('true');
    expect(card('robin').getAttribute('role')).toBe('button');
    expect(card('robin').getAttribute('draggable')).toBe('true');
    await click(card('dog'));
    expect(game.container.querySelector('[data-move-here]')).toBeNull();

    await place('robin', 1);
    await check();
    expect(feedback('dog').open).toBe(false);
    expect(feedback('robin').open).toBe(false);
    const finished = complete.mock.calls[1];
    expect(finished[0]).toBe('conceptSort');
    expect(finished[1].isPerfect).toBe(false);
    expect(finished[1].attempts).toBe(2);
    expect(finished[1].incorrectPlacements).toEqual(attempt[1].incorrectPlacements);
    await click(feedback('robin').querySelector('summary'));
    await click(control('concept_sort_reset'));
    expect(game.container.querySelector('details')).toBeNull();
    expect(game.container.textContent).not.toContain(secondReason);
    expect(card('dog').getAttribute('role')).toBe('button');
    expect(card('dog').hasAttribute('data-locked')).toBe(false);
  });

  it.each([undefined, '', ' \n ', 42, { text: 'invalid' }, 'x'.repeat(1501)])('keeps the existing AI fallback for absent or invalid author text (%s)', async explanation => {
    const explain = vi.fn(async () => 'Generated feedback');
    mount({
      data: { ...DATA, items: DATA.items.map(item => ({ ...item, explanation })) },
      onExplainIncorrect: explain,
    });
    await place('dog', 0);
    await place('robin', 0);
    await check();
    expect(game.container.querySelector('details')).toBeNull();
    expect(card('dog').querySelector('button[aria-label="games.explain_incorrect_aria"]')).toBeNull();
    await click(card('robin').querySelector('button[aria-label="games.explain_incorrect_aria"]'));
    expect(explain).toHaveBeenCalledTimes(1);
    expect(explain.mock.calls[0][0].id).toBe('robin');
    expect(explain.mock.calls[0][1].id).toBe('birds');
    expect(explain.mock.calls[0][2].id).toBe('mammals');
    expect(card('robin').textContent).toContain('Generated feedback');
  });

  it('accepts the 1500-character limit and trims surrounding whitespace', async () => {
    const explanation = ' ' + 'x'.repeat(1498) + ' ';
    mount({ data: { ...DATA, items: [ { ...DATA.items[0], explanation } ] } });
    await place('dog', 0);
    await check();
    expect(feedback('dog').querySelector('p').textContent).toBe('x'.repeat(1498));
  });
});
