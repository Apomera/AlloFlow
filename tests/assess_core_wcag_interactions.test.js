import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let api, root, host, serial = 0;

beforeAll(() => {
  window.React = global.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {}; window.AlloIcons = {};
  window.__alloT = (key, fallback) => typeof fallback === 'string' ? fallback : ({ 'ui_common.i_dont_know': "I don't know", 'ui_common.try_again': 'Try again' }[key] || key);
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
  new Function('window', readFileSync('quiz_ai_helpers.js', 'utf8'))(window);
  const code = require('@babel/core').transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  api = new Function('React', 'window', code + ';return {NumericResponseCard,FreeformItemCard,McqEnhancements,SequenceSenseCard,RelationMismatchCard,AnswerEvidenceCard,read:_quizReadWorkingDraft};')(React, window);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null; localStorage.clear();
});

function props(q, extra = {}) {
  return { q, itemNumber: 1, questionIdx: 0, draftNamespace: 'alloflow_assess_draft_v1:wcag-' + (++serial), allowDictation: false,
    modeStrategy: { render: { allowIDontKnow: true, allowConfidenceRating: true } },
    QuizAIHelpers: window.AlloModules.QuizAIHelpers, onSubmitLiveAnswer: vi.fn(), ...extra };
}
async function render(Component, p) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(Component, p)));
}
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text || el.textContent.trim().endsWith(text));
async function click(el) { expect(el).toBeTruthy(); el.focus(); await act(async () => el.click()); }
async function key(el, value) { expect(el).toBeTruthy(); el.focus(); await act(async () => el.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true }))); }
async function fill(el, value) {
  expect(el).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const numeric = { type: 'numeric-response', question: 'Find the length.', correctValue: 10, unit: 'cm' };
const sequence = { type: 'sequence-sense', question: 'Order the stages.', items: ['Seed', 'Shoot', 'Flower'], presentedOrder: [1, 0, 2], orderingPrinciple: 'growth', principleOptions: ['growth', 'size'] };
const relation = { type: 'relation-mismatch', question: 'Repair the pair.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Light' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water', candidatePartners: ['Water', 'Light'] };

describe('Assess response errors and feedback are accessible', () => {
  it('announces numeric errors in a persistent region, connects the field, and clears errors after correction', async () => {
    await render(api.NumericResponseCard, props(numeric));
    const input = host.querySelector('input'), status = host.querySelector('[data-assessment-numeric-error]');
    expect(status.textContent).toBe(''); expect(status.getAttribute('aria-live')).toBe('polite');
    await fill(input, 'abc'); await click(button('Check value'));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby'))).toBe(status);
    expect(status.textContent).toContain('Enter a number'); expect(document.activeElement).toBe(button('Check value'));
    await fill(input, '10 cm'); await click(button('Check value'));
    expect(host.querySelector('[data-assessment-numeric-error]')).toBe(status);
    expect(status.textContent).toBe(''); expect(input.hasAttribute('aria-invalid')).toBe(false); expect(input.hasAttribute('aria-describedby')).toBe(false);
    await click(button('Try again')); expect(input.disabled).toBe(false); expect(status.textContent).toBe('');
  });

  it('announces unavailable numeric grading without blaming a valid student response', async () => {
    const grader = window.AlloModules.QuizLiveAggregators;
    delete window.AlloModules.QuizLiveAggregators;
    try {
      await render(api.NumericResponseCard, props({ ...numeric, numericSettings: { allowEquivalentUnits: true } }));
      const input = host.querySelector('input'); await fill(input, '10 cm'); await click(button('Check value'));
      const status = document.getElementById(input.getAttribute('aria-describedby'));
      expect(status.textContent).toContain('Numeric checking is not available'); expect(input.hasAttribute('aria-invalid')).toBe(false);
    } finally { window.AlloModules.QuizLiveAggregators = grader; }
  });

  it('keeps error associations unique across multiple numeric questions', async () => {
    const first = props(numeric), second = props({ ...numeric, question: 'Find another length.' });
    await render(() => React.createElement(React.Fragment, null, React.createElement(api.NumericResponseCard, first), React.createElement(api.NumericResponseCard, second)), {});
    const ids = [...host.querySelectorAll('[data-assessment-numeric-error]')].map(el => el.id);
    expect(ids).toHaveLength(2); expect(new Set(ids).size).toBe(2); expect(ids.every(Boolean)).toBe(true);
  });

  it('keeps MCQ authored feedback in the same live region across selection changes', async () => {
    const p = props({ type: 'mcq', question: 'Which resource?', options: ['Water', 'Stone'], optionFeedback: ['Water supports growth.', 'Stone does not supply water.'] }, { selectedOptionIdx: null, feedbackShown: false });
    await render(api.McqEnhancements, p);
    const status = host.querySelector('[data-assessment-option-feedback-status]');
    expect(status.textContent).toBe(''); expect(status.getAttribute('role')).toBe('status');
    await render(api.McqEnhancements, { ...p, selectedOptionIdx: 0, feedbackShown: true });
    expect(host.querySelector('[data-assessment-option-feedback-status]')).toBe(status); expect(status.textContent).toBe('Water supports growth.');
    await render(api.McqEnhancements, { ...p, selectedOptionIdx: 1, feedbackShown: true });
    expect(status.textContent).toBe('Stone does not supply water.');
    await render(api.McqEnhancements, p); expect(status.textContent).toBe('');
  });

  it('keeps the completed fill-answer action named', async () => {
    await render(api.FreeformItemCard, props({ type: 'fill-blank', question: 'Plants need ___.', expectedFill: 'water' }));
    await fill(host.querySelector('input'), 'water'); await click(button('Grade my answer'));
    expect(button('Response checked').disabled).toBe(true);
    expect([...host.querySelectorAll('button')].every(el => el.textContent.trim() || el.getAttribute('aria-label'))).toBe(true);
  });

  it.each(['fill-blank', 'short-answer', 'self-explanation'])('names the skipped %s action and restores its action on retry', async type => {
    await render(api.FreeformItemCard, props({ type, question: 'Your response?', expectedFill: 'water' }));
    await click(button("I don't know")); expect(button('Response skipped').disabled).toBe(true);
    await click(button('Try again')); expect(button('Grade my answer')).toBeTruthy(); expect(button('Response skipped')).toBeUndefined();
  });
});

describe('Staged Assess activities preserve keyboard position', () => {
  it('focuses sequence diagnosis, arrangement, principle, results and retry in logical order', async () => {
    const p = props(sequence); await render(api.SequenceSenseCard, p);
    const status = host.querySelector('[data-assessment-step-status]');
    await click(button('No, something is off'));
    const firstItem = host.querySelector('[role="button"]');
    expect(document.activeElement).toBe(firstItem); expect(status.textContent).toContain('Step 2 of 4');
    await key(firstItem, ' ');
    expect(document.activeElement.getAttribute('aria-label')).toBe('Move down: Shoot'); expect(status.textContent).toContain('Step 3 of 4');
    await click(button('Done arranging'));
    expect(document.activeElement).toBe(button('growth')); expect(status.textContent).toContain('Step 4 of 4');
    await click(button('growth')); expect(document.activeElement).toBe(host.querySelector('[data-assessment-stage-result]'));
    expect(host.querySelector('[data-assessment-step-status]')).toBe(status);
    await click(button('Try again')); expect(document.activeElement).toBe(button('Yes, correct')); expect(status.textContent).toContain('Step 1 of 4');
  });

  it('handles Yes bypassing diagnosis without focusing stale choices', async () => {
    await render(api.SequenceSenseCard, props({ ...sequence, presentedOrder: [0, 1, 2] }));
    await click(button('Yes, correct'));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Move down: Seed');
    expect(host.querySelector('[role="button"]')).toBeNull();
  });

  it('supports compact sequence forward and retry paths and reversible ordering without losing the focused item', async () => {
    const p = props({ ...sequence, sequenceMode: 'arrange-explain' }); await render(api.SequenceSenseCard, p);
    const down = host.querySelector('[aria-label="Move down: Shoot"]'); await click(down);
    expect(document.activeElement).toBe(down); expect(api.read(p.draftNamespace).items['q-0'].orderAnswer).toEqual([0, 1, 2]);
    const up = host.querySelector('[aria-label="Move up: Shoot"]'); await click(up);
    expect(up.disabled).toBe(true); expect(document.activeElement).toBe(down); expect(api.read(p.draftNamespace).items['q-0'].orderAnswer).toEqual([1, 0, 2]);
    await click(button('Done arranging')); expect(document.activeElement).toBe(button('growth'));
    expect(host.querySelector('[data-assessment-step-status]').textContent).toContain('Step 2 of 2');
    await click(button('growth')); await click(button('Try again'));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Move down: Shoot');
    expect(host.querySelector('[data-assessment-step-status]').textContent).toContain('Step 1 of 2');
  });

  it('focuses Done arranging for a single-item sequence instead of a disabled move control', async () => {
    await render(api.SequenceSenseCard, props({ ...sequence, items: ['Seed'], presentedOrder: [0] }));
    await click(button('Yes, correct')); expect(document.activeElement).toBe(button('Done arranging'));
  });

  it('announces reordered item positions and switches to the enabled reverse arrow at both boundaries', async () => {
    const p = props({ ...sequence, sequenceMode: 'arrange-explain' }); await render(api.SequenceSenseCard, p);
    const status = host.querySelector('[data-assessment-order-status]');
    expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.textContent).toBe('');
    let down = host.querySelector('[aria-label="Move down: Shoot"]');
    await click(down); expect(document.activeElement).toBe(down); expect(status.textContent).toBe('Shoot moved to position 2 of 3.');
    await click(down); expect(down.disabled).toBe(true);
    const up = host.querySelector('[aria-label="Move up: Shoot"]');
    expect(document.activeElement).toBe(up); expect(up.disabled).toBe(false); expect(status.textContent).toBe('Shoot moved to position 3 of 3.');
    await click(up); expect(document.activeElement).toBe(up);
    await click(up); expect(up.disabled).toBe(true); expect(document.activeElement).toBe(down); expect(down.disabled).toBe(false);
    expect(status.textContent).toBe('Shoot moved to position 1 of 3.');
    expect(host.querySelector('[data-assessment-order-status]')).toBe(status);
  });

  it.each([false, true])('focuses relation replacement entry and restores the first pair on retry (reasoning: %s)', async requireReasoning => {
    await render(api.RelationMismatchCard, props({ ...relation, requireReasoning, ...(requireReasoning ? { explanationPrompt: 'Explain your repair.' } : {}) }));
    const status = host.querySelector('[data-assessment-step-status]');
    await key(host.querySelector('[role="button"]'), 'Enter');
    expect(status.textContent).toContain('Step 2 of 2');
    if (requireReasoning) {
      expect(document.activeElement).toBe(host.querySelector('textarea')); expect(button('Water').disabled).toBe(true);
      await fill(host.querySelector('textarea'), 'Roots absorb water.');
    } else expect(document.activeElement).toBe(button('Water'));
    await click(button('Water')); expect(document.activeElement).toBe(host.querySelector('[data-assessment-stage-result]'));
    await click(button('Try again')); expect(document.activeElement).toBe(host.querySelector('[role="button"]'));
    expect(status.textContent).toContain('Step 1 of 2');
  });
});

describe('Question context and answer-evidence feedback', () => {
  it.each(['numeric-response', 'fill-blank', 'short-answer', 'self-explanation'])('identifies the question in each %s response name', async type => {
    const Component = type === 'numeric-response' ? api.NumericResponseCard : api.FreeformItemCard;
    const first = props({ ...numeric, type, question: 'First prompt?' }, { itemNumber: 1 });
    const second = props({ ...numeric, type, question: 'Second prompt?' }, { itemNumber: 2, questionIdx: 1 });
    await render(() => React.createElement(React.Fragment, null, React.createElement(Component, first), React.createElement(Component, second)), {});
    const fields = [...host.querySelectorAll('input, textarea')];
    expect(fields).toHaveLength(2);
    expect(fields[0].getAttribute('aria-label')).toContain('Question 1: First prompt?');
    expect(fields[1].getAttribute('aria-label')).toContain('Question 2: Second prompt?');
  });

  const evidence = { type: 'answer-evidence', question: 'Why does the plant grow?', answerOptions: ['Water helps', 'Stones help'], evidenceOptions: ['Roots absorb water', 'Stones are hard'], correctAnswer: 'Water helps', correctEvidence: 'Roots absorb water', requireReasoning: true, explanationPrompt: 'Explain the link.' };
  it('identifies required explanations, announces unlocked evidence, and names the two choice groups', async () => {
    await render(api.AnswerEvidenceCard, props(evidence, { itemNumber: 3, questionIdx: 2 }));
    const status = host.querySelector('[data-assessment-answer-evidence-progress]');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(host.querySelectorAll('fieldset legend')).toHaveLength(1);
    const answer = button('Water helps'); await click(answer);
    expect(document.activeElement).toBe(answer);
    expect(status.textContent).toBe('Answer selected. Now choose supporting evidence.');
    expect([...host.querySelectorAll('fieldset legend')].map(el => el.textContent)).toEqual(['Part 1 — Choose the best answer', 'Part 2 — Which evidence or reason best supports your answer?']);
    expect(answer.getAttribute('aria-pressed')).toBe('true'); expect(answer.querySelector('[data-assessment-choice-selected]').textContent).toContain('Selected');
    await click(button('Roots absorb water'));
    expect(status.textContent).toContain('Add the required explanation');
    const field = host.querySelector('textarea'); expect(field.required).toBe(true);
    expect(field.getAttribute('aria-label')).toBe('Explain the link. — Question 3: Why does the plant grow?');
    expect(document.getElementById(field.getAttribute('aria-describedby')).textContent).toContain('reviewed separately from the choice score');
    expect(answer.querySelector('[data-assessment-choice-selected]').getAttribute('aria-hidden')).toBe('true');
    expect(button('Check both parts').disabled).toBe(true);
    expect(button('Check both parts').getAttribute('aria-describedby')).toBe(status.id);
    await fill(field, 'Roots take water into the plant.');
    expect(status.textContent).toBe('Both parts selected. Ready to check.'); expect(button('Check both parts').disabled).toBe(false);
    expect(host.querySelector('[data-assessment-answer-evidence-progress]')).toBe(status);
  });

  it('focuses named answer-evidence results and returns focus to the first answer on retry', async () => {
    await render(api.AnswerEvidenceCard, props({ ...evidence, requireReasoning: false }));
    await click(button('Water helps')); await click(button('Stones are hard')); await click(button('Check both parts'));
    expect(document.activeElement).toBe(host.querySelector('[data-assessment-answer-evidence-result]'));
    expect(host.textContent).toContain('Answer: correct'); expect(host.textContent).toContain('Supporting evidence or reason: needs review');
    await click(button('Try again'));
    expect(document.activeElement).toBe(button('Water helps')); expect(button('Water helps').getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[data-assessment-choice-selected]')).toBeNull();
    expect(host.querySelector('[data-assessment-answer-evidence-progress]').textContent).toBe('Choose an answer, then supporting evidence.');
    await click(button("I don't know")); expect(document.activeElement).toBe(host.querySelector('[data-assessment-answer-evidence-result]'));
    await click(button('Try again')); expect(document.activeElement).toBe(button('Water helps'));
  });
});
