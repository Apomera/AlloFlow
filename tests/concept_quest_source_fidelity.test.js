import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const engine = require('../concept_quest_engine.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const babel = require('@babel/core');
const encounter = question => engine.resolveTravel(engine.createSession({ questions: [question] }), {}, 'room-2').quest;
const imageQuestion = {
  type: 'mcq', question: 'Which inequality matches the shaded number line?',
  question_en: 'Choose the inequality represented in the diagram.',
  options: ['x < 3', 'x > 3'], correctAnswer: 'x < 3',
  options_en: ['Less than three', 'Greater than three'],
  imageUrl: 'https://example.test/number-line.png', imageAltText: 'An open circle at three, shaded to the left.',
  optionImageUrls: ['data:image/png;base64,aGVsbG8=', 'https://example.test/right.png'],
  optionImageAltTexts: ['Left of three', 'Right of three'],
  explanation: 'The open circle excludes 3; values x < 3 lie to its left.',
};
let Component, host, root;
const write = vi.fn(async () => {});

beforeAll(() => {
  // Exercise the real source component without changing generated deploy files.
  const source = fs.readFileSync('teacher_source.jsx', 'utf8');
  const start = source.indexOf('const StudentConceptQuestOverlay =');
  const end = source.indexOf('// Leaf writes keep simultaneous teammates', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const compiled = babel.transformSync(source.slice(start, end), {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
    babelrc: false, configFile: false,
  }).code;
  Component = new Function('React', 'doc', 'db', 'updateDoc', 'warnLog',
    'const {useState,useEffect,useRef}=React;\n' + compiled + '\nreturn StudentConceptQuestOverlay;')(
    React, (_db, ...parts) => parts.join('/'), {}, (...args) => write(...args), () => {},
  );
  window.AlloModules.ConceptQuestEngine = engine;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; write.mockClear();
});
async function mount(quest) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Component, {
    sessionData: { escapeRoomState: { isActive: true, mode: 'concept-quest', conceptQuest: quest, teams: { learner: 'All' }, teamProgress: { All: { questRoles: { learner: 'analyst' } } } }, roster: {} },
    user: { uid: 'learner' }, activeSessionCode: 'FIDELITY', targetAppId: 'app', t: key => key,
  })));
}

describe('Class Concept Quest source fidelity', () => {
  it.each(['challenge', 'enemy'])('preserves GM %s mathematics through publication, rendering and turn feedback', async type => {
    const authored = {
      prompt: 'Does "x" satisfy -1 <= x && x < 3? <script>literal text</script>',
      options: ['x < 3', 'x > 3'], correctAnswer: 'x < 3',
      explanation: 'Keep the open bound: "x" < 3; x != 3 and x >= -1.',
    };
    const draft = engine.normalizeGmDraft({ type, title: '<b>Math checkpoint</b>', enemy: { name: '<b>Gate</b>', hp: 8 }, challenge: authored });
    expect(draft.title).toBe('bMath checkpoint/b');
    if (type === 'enemy') expect(draft.enemy.name).toBe('bGate/b');
    expect(draft.challenge).toMatchObject({ prompt: authored.prompt, options: authored.options, correctIndex: 0, explanation: authored.explanation });
    const quest = engine.publishGmDraft(encounter(imageQuestion), draft);
    expect(engine.getRoom(quest, quest.currentRoomId).challenge.options).toEqual(authored.options);
    await mount(quest);
    expect(host.textContent).toContain(authored.prompt);
    expect(host.querySelector('script')).toBeNull();
    expect([...host.querySelectorAll('input[type="radio"]')].map(input => input.closest('label').textContent)).toEqual(expect.arrayContaining([expect.stringContaining('x < 3'), expect.stringContaining('x > 3')]));
    const result = engine.resolveBattle(quest, { learner: { abilityId: 'analyze', answerIndex: 0, turnKey: engine.getTurnKey(quest) } });
    expect(result.summary.correct).toBe(1);
    expect(result.quest.lastRound).toMatchObject({ prompt: authored.prompt, correctAnswer: 'x < 3', explanation: authored.explanation });
  });
  it('labels the limited evidence in older completed saves', async () => {
    const quest = encounter(imageQuestion);
    quest.phase = 'complete'; delete quest.learningTotals;
    quest.roundHistory = Array.from({ length: 24 }, () => ({ concept: 'Comparisons', correct: 1, total: 1 }));
    await mount(quest);
    expect(host.querySelector('[data-concept-quest-history-limit]').textContent).toContain('earliest rounds');
    expect(host.textContent).toContain('100%');
  });
  it('preserves full mathematical prompts, distinct options, and feedback through create, travel, and resolution', () => {
    const prefix = 'Relevant source detail. '.repeat(30);
    const question = { ...imageQuestion, question: prefix + 'Does x < 3 or x > 3 fit?', options: [prefix + 'x < 3', prefix + 'x > 3'], correctAnswer: prefix + 'x < 3', explanation: prefix + 'Use x < 3.' };
    const quest = encounter(question);
    const challenge = engine.getRoom(quest, quest.currentRoomId).challenge;
    expect(challenge.prompt).toBe(question.question);
    expect(challenge.options).toEqual(question.options);
    expect(challenge.correctIndex).toBe(0);
    const result = engine.resolveBattle(quest, { learner: { abilityId: 'analyze', answerIndex: 0, turnKey: engine.getTurnKey(quest) } });
    expect(result.summary.correct).toBe(1);
    expect(result.quest.lastRound).toMatchObject({ prompt: question.question, correctAnswer: question.options[0], explanation: question.explanation });
    expect(engine.normalizeGmDraft({ type: 'item', title: '<b>Lens</b>', item: { effect: { type: 'heal', amount: 2 } } }).title).toBe('bLens/b');
  });

  it('renders retained images, descriptive alternatives and translations while submitting the right source option', async () => {
    const quest = JSON.parse(JSON.stringify(encounter(imageQuestion)));
    const challenge = engine.getRoom(quest, quest.currentRoomId).challenge;
    for (const field of ['question_en', 'options_en', 'imageUrl', 'imageAltText', 'optionImageUrls', 'optionImageAltTexts']) expect(challenge[field]).toEqual(imageQuestion[field]);
    await mount(quest);
    expect(host.querySelector('[data-concept-quest-question-translation]').textContent).toBe(imageQuestion.question_en);
    expect(host.querySelector('[data-concept-quest-question-image]').getAttribute('src')).toBe(imageQuestion.imageUrl);
    expect(host.querySelector('[data-concept-quest-question-image]').alt).toBe(imageQuestion.imageAltText);
    expect([...host.querySelectorAll('[data-concept-quest-option-image]')].map(image => image.alt)).toEqual(imageQuestion.optionImageAltTexts);
    expect(host.querySelector('[data-concept-quest-option-image="0"]').getAttribute('src')).toBe(imageQuestion.optionImageUrls[0]);
    expect([...host.querySelectorAll('[data-concept-quest-option-translation]')].map(option => option.textContent)).toEqual(imageQuestion.options_en);
    const radios = host.querySelectorAll('input[type="radio"]');
    expect(radios[0].closest('label').textContent).toContain('x < 3');
    expect(radios[1].closest('label').textContent).toContain('x > 3');
    await act(async () => radios[0].click());
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Commit turn').click());
    expect(write.mock.calls[0][1]['escapeRoomState.teamProgress.All.questActions.learner']).toMatchObject({ answerIndex: 0, turnKey: engine.getTurnKey(quest) });
  });

  it('does not duplicate source image payloads across inactive map challenges', () => {
    let quest = engine.createSession({ questions: [imageQuestion] });
    const imageCopies = value => JSON.stringify(value).split(imageQuestion.imageUrl).length - 1;
    expect(imageCopies(quest)).toBe(1);
    quest = engine.resolveTravel(quest, {}, 'room-2').quest;
    expect(imageCopies(quest)).toBe(2);
    quest = engine.resolveBattle(quest, Object.fromEntries(Array.from({ length: 8 }, (_, index) => ['learner-' + index, { abilityId: 'analyze', answerIndex: 0, turnKey: engine.getTurnKey(quest) }]))).quest;
    quest = engine.resolveTravel(quest, {}, 'room-3').quest;
    expect(imageCopies(quest)).toBe(2);
    expect(engine.getRoom(quest, 'room-3').challenge.imageUrl).toBe(imageQuestion.imageUrl);
  });

  it('keeps authored markup as escaped text and uses an honest fallback for missing image descriptions', async () => {
    const literal = '<img src=x onerror=alert(1)>';
    await mount(encounter({ ...imageQuestion, question: literal + ' means x < 3?', options: [literal, 'x > 3'], correctAnswer: literal, imageAltText: '', optionImageAltTexts: [] }));
    expect(host.querySelector('legend').textContent).toBe(literal + ' means x < 3?');
    expect(host.querySelector('legend').innerHTML).toContain('&lt;img');
    expect(host.querySelector('img[src="x"]')).toBeNull();
    expect(host.querySelector('[onerror]')).toBeNull();
    expect([...host.querySelectorAll('img')].map(image => image.alt)).toEqual(Array(3).fill('No visual description provided.'));
  });
});
