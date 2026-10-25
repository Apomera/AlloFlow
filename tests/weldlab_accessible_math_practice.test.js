import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  node, freshTool, mountState, unmountState, click, change, button,
} from './helpers/weldlab_interaction_mount.js';

beforeEach(freshTool);
afterEach(unmountState);

const MATH_SEED = 12345;
const problems = [
  ['frac2dec', 'Fraction to decimal'],
  ['frac2mm', 'Inches to millimetres'],
  ['mm2frac', 'Millimetres to the nearest 1/16 in'],
  ['tape', 'Read the tape'],
  ['plateWeight', 'Plate weight'],
  ['brace', 'Brace length (trig)'],
  ['square', 'Square a frame (3-4-5)'],
  ['filler', 'Filler metal to buy'],
  ['bid', 'Bid a small job'],
];
const text = element => element.textContent.replace(/\s+/g, ' ').trim();
const scopedButton = (scope, label) => [...scope.querySelectorAll('button')]
  .find(element => text(element) === label);
const radios = label => [...node().querySelectorAll('[role="radiogroup"]')]
  .find(element => element.getAttribute('aria-label') === label)
  .querySelectorAll('[role="radio"]');
const referencedText = (element, attribute) => (element.getAttribute(attribute) || '')
  .split(/\s+/).filter(Boolean).map(id => {
    const target = node().querySelector('#' + id);
    expect(target, `Missing ${attribute} target ${id}`).not.toBeNull();
    return text(target);
  }).join(' ');
async function activate(element) {
  expect(element).toBeTruthy();
  element.focus();
  await click(element);
}
function assertFocused(element) {
  expect(element).not.toBeNull();
  expect(document.activeElement).toBe(element);
  expect(element.getAttribute('tabindex')).toBe('-1');
}
function mathAnswer(kind, round) {
  const core = window.__WeldLabCore.sym2;
  return String(core.gen(kind, core.mixSeed(MATH_SEED, core.KINDS.indexOf(kind), round)).answer);
}
function consQuestion() {
  return node().querySelector('#weld-consumables-panel h3[tabindex="-1"]');
}
function consFeedback() {
  return node().querySelector('#weld-consumables-panel .bg-amber-50[tabindex="-1"]');
}

describe('Accessible checked welding math practice', () => {
  it.each(problems)('%s associates its question and handles errors, hints, solutions and a correct round', async (kind, title) => {
    const app = await mountState({
      view: 'mathBlueprint', mb_mode: 'practice', sym2_m_seed: MATH_SEED,
      sym2_m_rounds: {}, sym2_m_score: 0, sym2_m_tries: 0,
      sym2_m_streak: 0, sym2_m_best: 0,
    });
    const card = node().querySelector(`[data-sym2-math="${kind}"]`);
    const input = card.querySelector('#sym2-m-in-' + kind);
    const prompt = card.querySelector('#sym2-m-prompt-' + kind);
    const check = () => scopedButton(card, 'Check answer');
    const error = () => card.querySelector('#sym2-m-inv-' + kind);
    const feedback = () => card.querySelector('#sym2-m-fb-' + kind);

    expect(referencedText(input, 'aria-labelledby')).toBe(title + ' Your answer');
    expect(input.labels.length).toBe(1);
    expect(text(input.labels[0])).toBe('Your answer');
    expect(referencedText(input, 'aria-describedby')).toBe(text(prompt));
    expect(text(prompt).length).toBeGreaterThan(35);
    expect(input.getAttribute('aria-invalid')).toBeNull();

    // A missing or malformed answer is a field error, and does not score a try.
    for (const malformed of ['', 'oops']) {
      await change(input, malformed);
      await activate(check());
      expect(document.activeElement).toBe(input);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(error()).not.toBeNull();
      expect(referencedText(input, 'aria-describedby')).toBe(text(prompt) + ' ' + text(error()));
      expect(text(error())).toContain('Type a number, a fraction like 7/16');
      expect(feedback()).toBeNull();
      expect(app.latest().sym2_m_tries).toBe(0);
      expect(app.latest().sym2_m_score).toBe(0);
    }

    // A valid numeric answer can be wrong without being a malformed field.
    await change(input, '-1');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(error()).toBeNull();
    expect(referencedText(input, 'aria-describedby')).toBe(text(prompt));
    await activate(check());
    assertFocused(feedback());
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(text(feedback())).toContain('Not quite: you entered -1.');
    expect(app.latest().sym2_m_tries).toBe(1);
    expect(app.latest().sym2_m_score).toBe(0);

    // Revealing the solution removes its button, so focus follows the solution.
    const reveal = scopedButton(card, 'Show the worked solution');
    await activate(reveal);
    const solution = card.querySelector('#sym2-m-solution-' + kind);
    assertFocused(solution);
    expect(reveal.isConnected).toBe(false);
    expect(text(solution)).toContain('Worked solution:');
    expect(scopedButton(card, 'Show the worked solution')).toBeUndefined();

    // The second hint removes the final hint button as well.
    for (const count of [1, 2]) {
      const hintButton = scopedButton(card, `Hint ${count} of 2`);
      await activate(hintButton);
      const hints = card.querySelector('#sym2-m-hints-' + kind);
      assertFocused(hints);
      expect(hints.querySelectorAll('li').length).toBe(count);
      if (count === 2) expect(hintButton.isConnected).toBe(false);
    }
    expect(app.latest().sym2_m_tries).toBe(1);
    expect(app.latest().sym2_m_score).toBe(0);

    // New numbers preserve the control and allow a fresh first-try score.
    const newNumbers = scopedButton(card, 'New numbers');
    await activate(newNumbers);
    expect(document.activeElement).toBe(newNumbers);
    expect(app.latest().sym2_m_rounds[kind]).toBe(1);
    expect(input.value).toBe('');
    expect(feedback()).toBeNull();
    expect(card.querySelector('#sym2-m-hints-' + kind)).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
    await change(input, mathAnswer(kind, 1));
    await activate(check());
    assertFocused(feedback());
    expect(text(feedback())).toContain('Correct:');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(card.querySelector('#sym2-m-solution-' + kind)).not.toBeNull();
    expect(app.latest().sym2_m_tries).toBe(2);
    expect(app.latest().sym2_m_score).toBe(1);
    expect(app.latest().sym2_m_streak).toBe(1);
  });
});

describe('Accessible Symbol Match quiz transitions', () => {
  it('focuses feedback, each next question, results and the restarted question', async () => {
    const app = await mountState({
      view: 'mathBlueprint', mb_mode: 'quiz', mb_q_idx: 0, mb_q_score: 0, mb_q_picked: null,
    });
    const correct = [3, 0, 1, 2, 3, 0, 1, 2, 3, 0];
    for (const [index, answer] of correct.entries()) {
      const choices = radios('Choose the meaning');
      expect(choices.length).toBe(4);
      const selected = choices[answer];
      await activate(selected);
      expect(document.activeElement).toBe(selected);
      expect(selected.getAttribute('aria-checked')).toBe('true');
      expect([...choices].some(choice => choice.disabled)).toBe(false);
      await activate(button('Check answer'));
      assertFocused(node().querySelector('#sym2-mq-fb'));
      expect([...choices].every(choice => choice.disabled)).toBe(true);
      expect(app.latest().mb_q_score).toBe(index + 1);
      const next = button(index === 9 ? 'See results →' : 'Next question →');
      await activate(next);
      expect(next.isConnected).toBe(false);
      if (index === 9) {
        assertFocused(node().querySelector('#sym2-mq-sum'));
        expect(text(document.activeElement)).toContain('Quiz finished: 10 of 10 on the first try.');
      } else {
        assertFocused(node().querySelector('#sym2-mq-question'));
        expect(app.latest().mb_q_idx).toBe(index + 1);
        expect(app.latest().mb_q_picked).toBeNull();
        expect(node().querySelector('#sym2-mq-fb')).toBeNull();
      }
    }
    await activate(button('↺ Restart quiz'));
    assertFocused(node().querySelector('#sym2-mq-question'));
    expect(node().querySelector('#sym2-mq-sum')).toBeNull();
    expect(app.latest().mb_q_idx).toBe(0);
    expect(app.latest().mb_q_score).toBe(0);
    expect(app.latest().mb_q_picked).toBeNull();
    expect(button('Check answer').disabled).toBe(true);

    // Restart from an answered question also clears its locked controls.
    await activate(radios('Choose the meaning')[0]);
    await activate(button('Check answer'));
    expect(text(node().querySelector('#sym2-mq-fb'))).toContain('Not this time.');
    await activate(button('↺ Restart quiz'));
    assertFocused(node().querySelector('#sym2-mq-question'));
    expect(app.latest().mb_q_score).toBe(0);
    expect(app.latest().mb_q_picked).toBeNull();
    expect([...radios('Choose the meaning')].every(choice => !choice.disabled)).toBe(true);
  });

  it.each([false, true])('preserves outside focus on saved answered mount (contrast %s)', async contrast => {
    const outside = document.createElement('button');
    document.body.append(outside); outside.focus();
    try {
      await mountState({
        view: 'mathBlueprint', mb_mode: 'quiz', mb_q_idx: 9, mb_q_score: 4, mb_q_picked: 0,
      }, contrast);
      expect(node().querySelector('#sym2-mq-fb')).not.toBeNull();
      expect(document.activeElement).toBe(outside);
      await activate(button('See results →'));
      assertFocused(node().querySelector('#sym2-mq-sum'));
      await activate(button('↺ Restart quiz'));
      assertFocused(node().querySelector('#sym2-mq-question'));
    } finally { outside.remove(); }
  });
});

describe('Accessible Consumables scenario transitions', () => {
  it('focuses new questions on next, wrap and restart and resets the round score', async () => {
    const app = await mountState({
      view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: 0, cons_sc_score: 0, cons_sc_picked: null,
    });
    const correct = [3, 0, 1, 2, 3, 0, 1, 2];
    for (const [index, answer] of correct.entries()) {
      const title = text(consQuestion());
      const choices = radios('Consumable options');
      await activate(choices[answer]);
      assertFocused(consFeedback());
      expect([...choices].every(choice => choice.disabled)).toBe(true);
      expect(choices[answer].getAttribute('aria-checked')).toBe('true');
      expect(app.latest().cons_sc_score).toBe(index + 1);
      const next = button(index === 7 ? 'Start a new round →' : 'Next scenario →');
      await activate(next);
      assertFocused(consQuestion());
      expect(next.isConnected).toBe(false);
      expect(text(consQuestion())).not.toBe(title);
      expect(consFeedback()).toBeNull();
      expect(app.latest().cons_sc_idx).toBe((index + 1) % 8);
      expect(app.latest().cons_sc_picked).toBeNull();
      expect([...radios('Consumable options')].every(choice => !choice.disabled)).toBe(true);
    }
    expect(text(consQuestion())).toBe('Pipeline root pass on cross-country line');
    expect(app.latest().cons_sc_score).toBe(0);

    await activate(radios('Consumable options')[3]);
    await activate(button('Next scenario →'));
    await activate(radios('Consumable options')[1]);
    expect(text(consFeedback())).toContain('Why not B:');
    await activate(button('↺ Restart scenarios'));
    assertFocused(consQuestion());
    expect(text(consQuestion())).toBe('Pipeline root pass on cross-country line');
    expect(app.latest().cons_sc_idx).toBe(0);
    expect(app.latest().cons_sc_score).toBe(0);
    expect(app.latest().cons_sc_picked).toBeNull();
    expect(consFeedback()).toBeNull();
  });

  it.each([
    [false, 3], [false, '3'], [true, 3], [true, '3'],
  ])('preserves outside focus for normalized saved answers (contrast %s, pick %s)', async (contrast, savedPick) => {
    const outside = document.createElement('button');
    document.body.append(outside); outside.focus();
    try {
      await mountState({
        view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: 0, cons_sc_score: 1, cons_sc_picked: savedPick,
      }, contrast);
      expect(consFeedback()).not.toBeNull();
      expect(radios('Consumable options')[3].getAttribute('aria-checked')).toBe('true');
      expect(document.activeElement).toBe(outside);
      await activate(button('Next scenario →'));
      assertFocused(consQuestion());
      await activate(radios('Consumable options')[0]);
      assertFocused(consFeedback());
    } finally { outside.remove(); }
  });

  it('treats an out-of-range saved answer as unanswered and focuses its first new feedback', async () => {
    await mountState({
      view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: 0, cons_sc_score: 0, cons_sc_picked: 999,
    });
    expect(consFeedback()).toBeNull();
    expect([...radios('Consumable options')].every(choice => !choice.disabled)).toBe(true);
    await activate(radios('Consumable options')[0]);
    assertFocused(consFeedback());
    expect(text(consFeedback())).toContain('Why not A:');
  });
});
