import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let Component, root, host, serial = 0;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; window.AlloModules = {}; window.AlloIcons = {};
  window.__alloT = (key, opts) => opts?.defaultValue || ({ 'ui_common.i_dont_know': "I don't know", 'ui_common.try_again': 'Try again' }[key] || key);
  const code = require('@babel/core').transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false, compact: false }).code;
  Component = new Function('React', 'window', code + ';return DeferredAssessmentItem;')(React, window);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); });
const props = q => ({ q, itemNumber: 3, questionIdx: 2, draftNamespace: 'alloflow_assess_draft_v1:deferred-a11y-' + (++serial), feedbackTiming: 'teacher-release', allowDictation: false, modeStrategy: { render: { allowIDontKnow: true, allowConfidenceRating: true } }, onSubmitLiveAnswer: vi.fn() });
async function mount(p) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(React.createElement(Component, p))); }
async function click(el) { expect(el).toBeTruthy(); el.focus(); await act(async () => el.click()); }
async function fill(el, text) { await act(async () => { Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text || el.getAttribute('aria-label') === text);
const descriptions = element => (element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => {
  const description = document.getElementById(id);
  expect(description, 'Description target ' + id).toBeTruthy();
  return description.textContent;
}).join(' ');
const sequence = { type: 'sequence-sense', question: 'Arrange the plant stages.', items: ['Seed', 'Shoot', 'Flower'], presentedOrder: [1, 0, 2], sequenceMode: 'arrange-explain', orderingPrinciple: 'growth' };

describe('Deferred assessment keyboard navigation', () => {
  it('keeps the same item in focus while moving and switches direction at either boundary', async () => {
    const p = props(sequence); await mount(p); const status = host.querySelector('[data-assessment-reorder-status]');
    await click(button('Move up: Seed'));
    expect(document.activeElement).toBe(button('Move down: Seed')); expect(button('Move up: Seed').disabled).toBe(true);
    expect(status.textContent).toBe('Seed moved to position 1 of 3.');
    await click(button('Move down: Seed'));
    expect(document.activeElement).toBe(button('Move down: Seed')); expect(status.textContent).toContain('position 2 of 3');
    await click(button('Move down: Seed'));
    expect(document.activeElement).toBe(button('Move up: Seed')); expect(status.textContent).toContain('position 3 of 3');
    expect(host.querySelector('[data-assessment-reorder-status]')).toBe(status); expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
  });
  it('moves focus on skip and retry without losing the draft or revealing feedback', async () => {
    const p = props({ type: 'short-answer', question: 'Explain how roots absorb water.', expectedAnswer: 'PRIVATE ANSWER' });
    await mount(p); const field = host.querySelector('textarea'), status = host.querySelector('[data-assessment-skip-status]');
    await fill(field, 'My original explanation.'); await click(button("I don't know"));
    expect(document.activeElement).toBe(button('Try again')); expect(field.closest('fieldset').disabled).toBe(true);
    expect(status.textContent).toContain('draft responses are kept');
    await click(button('Try again')); expect(document.activeElement).toBe(field); expect(field.value).toBe('My original explanation.');
    expect(status.textContent).toBe(''); expect(host.textContent).not.toContain('PRIVATE ANSWER'); expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
  });
  it.each(['numeric-response', 'fill-blank', 'short-answer', 'self-explanation'])('connects %s fields to their question context', async type => {
    await mount(props({ type, question: 'A specific question context.' }));
    const field = host.querySelector('input:not([type=checkbox]),textarea');
    expect(field.getAttribute('aria-label')).toBe('Your response to question 3');
    expect(descriptions(field)).toContain('A specific question context.');
    expect(descriptions(field)).toContain('Your teacher will release feedback after submission.');
    const group = field.closest('fieldset'); expect(document.getElementById(group.getAttribute('aria-labelledby')).textContent).toBe('A specific question context.');
  });
  it('keeps radio selection independent in two copies of the same question', async () => {
    const q = { type: 'answer-evidence', question: 'Choose an answer and its evidence.', answerOptions: ['A', 'B'], evidenceOptions: ['A', 'B'], evidencePrompt: 'Choose an answer' };
    const first = props(q), second = props(q); host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Component, first), React.createElement(Component, second))));
    const cards = host.querySelectorAll('[data-assessment-deferred-item]');
    const radios = [...cards[0].querySelectorAll('input[type=radio]')];
    expect(new Set([...host.querySelectorAll('input[type=radio]')].map(el => el.name)).size).toBe(4);
    await click(radios[0]); await click(cards[1].querySelector('input[type=radio]'));
    expect(radios[0].checked).toBe(true); await click(radios[2]); expect(radios[0].checked).toBe(true); expect(radios[2].checked).toBe(true);
  });
  it('connects numeric units, translated context, criteria and feedback timing without revealing the answer', async () => {
    await mount(props({ type: 'numeric-response', question: 'Find the length.', question_en: 'Translated question context.', unit: 'cm', correctValue: 987654, studentCriteria: ['Show the measurement.', '', null] }));
    const field = host.querySelector('input'), group = field.closest('fieldset');
    for (const text of ['Translated question context.', 'Show the measurement.', 'Include units (cm).', 'Your teacher will release feedback after submission.']) {
      expect(descriptions(field)).toContain(text); expect(descriptions(group)).toContain(text);
    }
    expect(host.querySelector('[data-assessment-student-criteria] li').textContent).toBe('Show the measurement.');
    expect(host.textContent).not.toContain('987654');
  });
  it.each([
    ['exact', 'Use exact spelling and capitalization.'],
    ['normalized', 'Capitalization, extra spacing, and punctuation around the answer are ignored.'],
    ['review-variants', 'Other answers are saved for teacher review.']
  ])('shows and associates the %s fill-answer instructions before submission', async (fillBlankPolicy, instruction) => {
    await mount(props({ type: 'fill-blank', question: 'Plants need ___.', fillBlankPolicy, expectedFill: 'PRIVATE ANSWER' }));
    expect(host.querySelector('[data-assessment-response-instruction]').textContent).toContain(instruction);
    expect(descriptions(host.querySelector('input'))).toContain(instruction);
    expect(host.textContent).not.toContain('PRIVATE ANSWER');
  });
  it('does not create blank criteria descriptions', async () => {
    await mount(props({ type: 'short-answer', question: 'Explain your idea.', studentCriteria: ['', ' ', null] }));
    expect(host.querySelector('[data-assessment-student-criteria]')).toBeNull();
    expect(descriptions(host.querySelector('textarea'))).toContain('Explain your idea.');
  });
  it('keeps instruction associations inside the intended question instance', async () => {
    const q = { type: 'fill-blank', question: 'The same question.', fillBlankPolicy: 'exact', studentCriteria: ['Support this response.'] };
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Component, props(q)), React.createElement(Component, props(q)))));
    const cards = host.querySelectorAll('[data-assessment-deferred-item]');
    for (const card of cards) for (const id of card.querySelector('input').getAttribute('aria-describedby').split(/\s+/)) expect(card.contains(document.getElementById(id))).toBe(true);
    const ids = [...host.querySelectorAll('[id]')].map(element => element.id); expect(new Set(ids).size).toBe(ids.length);
  });
});
