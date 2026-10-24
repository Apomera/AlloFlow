import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const solo = require('../concept_quest_solo_engine.js');
const base = require('../concept_quest_engine.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const content = question => ({ data: { questions: [question] } });
let Component, canonical, host, root, item, response;

beforeAll(() => {
  new Function(fs.readFileSync('quiz_live_aggregators.js', 'utf8'))();
  canonical = window.AlloModules.QuizLiveAggregators;
  const compiled = require('@babel/core').transformSync(fs.readFileSync('concept_quest_solo_question_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  Component = new Function('React', compiled + '\nreturn ConceptQuestSoloQuestion;')(React);
  window.AlloModules.ConceptQuestSoloEngine = solo;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; });
function Harness() {
  const [value, setValue] = React.useState(solo.initialResponse(item)); response = value;
  return React.createElement(Component, { item, response: value, onChange: setValue, guideOpen: value.guideRevealed, t: key => key });
}
async function mount(authored) {
  item = solo.normalizeItems(content(authored))[0];
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function enter(element, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLSelectElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLTextAreaElement ? 'input' : 'change', { bubbles: true }));
  });
}

describe('Solo numeric answer-key parity', () => {
  it.each([
    ['spaces', '   '], ['tabs and newlines', '\t\r\n'], ['Unicode spaces', '\u00a0\u2003'],
    ['empty', ''], ['null', null], ['missing', undefined], ['boolean', false], ['array', []], ['object', {}],
    ['infinite', Infinity], ['non-numeric', 'missing'], ['zero', 0], ['string zero', ' 0 '],
    ['negative', -2], ['decimal', ' .25 '], ['scientific notation', '1e3'],
  ])('matches the canonical key predicate for %s', (_label, correctValue) => {
    const authored = { type: 'numeric-response', question: 'What is the value?', correctValue };
    const normalized = solo.normalizeItems(content(authored))[0];
    expect(!normalized.selfReviewRequired).toBe(canonical.presentationQuestionIsGameScorable(authored));
    if (normalized.selfReviewRequired) {
      expect(solo.grade(normalized, { text: '0' })).toMatchObject({ complete: false, correct: null, gradable: false, score: null });
      expect(solo.grade(normalized, { text: 'I need to check the key.', guideRevealed: true, selfReview: 'needs-practice' })).toMatchObject({ complete: true, correct: null, gradable: false, score: null, status: 'self-reviewed' });
    }
  });
  it('records a whitespace-key encounter as self-review without correctness XP', () => {
    let quest = solo.createSession(base, content({ type: 'numeric-response', question: 'What is the value?', correctValue: ' \t ' }), (_key, fallback) => fallback);
    quest = solo.travel(base, quest, 'room-2').quest;
    const initialXP = quest.party.xp;
    const result = solo.resolveTurn(base, quest, { roleId: 'analyst', abilityId: 'analyze', response: { text: '0 is my estimate.', guideRevealed: true, selfReview: 'needs-practice' } });
    expect(result.error).toBeUndefined();
    expect(result.summary).toMatchObject({ correct: null, gradable: false, score: null, xp: 0, status: 'self-reviewed' });
    expect(result.quest.party.xp).toBe(initialXP);
    expect(solo.coverage(result.quest)).toMatchObject({ graded: 0, correct: 0, selfReviewed: 1, accuracy: null });
  });
});

const shared = { question: 'Quel diagramme montre x < 3 ?', question_en: 'Which diagram shows x < 3?', imageUrl: 'question.png', imageAltText: 'Question reference diagram' };
const options = { options: ['Diagramme A', 'Diagramme B'], options_en: ['Diagram A <script>literal</script>', 'Diagram B'], optionImageUrls: ['a.png', 'b.png'], optionImageAltTexts: ['First diagram', 'Second diagram'] };
const fixtures = [
  { type: 'mcq', fields: ['options'], texts: ['Diagramme A', 'Diagram A <script>literal</script>'], alts: ['First diagram', 'Second diagram'], authored: { ...options, correctAnswer: 'missing' } },
  { type: 'multi-select', fields: ['options'], texts: ['Diagramme A', 'Diagram A <script>literal</script>'], alts: ['First diagram', 'Second diagram'], authored: { ...options, correctAnswers: ['missing'] } },
  { type: 'answer-evidence', fields: ['answerOptions', 'evidenceOptions'], texts: ['Diagramme A', 'Diagram A <script>literal</script>', 'Quelle observation?', 'Which observation?', 'Gouttes', 'Water drops'], alts: ['First diagram', 'Second diagram', 'Droplets on glass', 'Sunlight'], authored: { ...options, answerOptions: options.options, correctAnswer: 'Diagramme A', evidencePrompt: 'Quelle observation?', evidencePrompt_en: 'Which observation?', evidenceOptions: ['Gouttes', 'Soleil'], evidenceOptions_en: ['Water drops', 'Sunshine'], evidenceOptionImageUrls: ['drops.png', 'sun.png'], evidenceOptionImageAltTexts: ['Droplets on glass', 'Sunlight'], correctEvidence: 'missing' } },
  { type: 'sequence-sense', fields: ['items', 'principleOptions'], texts: ['Chauffer', 'Heat', 'Fondre', 'Melt', 'Température', 'Temperature changes'], alts: ['Melting material', 'Heating material', 'Thermometer'], authored: { items: ['Chauffer', 'Fondre'], items_en: ['Heat', 'Melt'], itemImageUrls: ['heat.png', 'melt.png'], itemImageAltTexts: ['Heating material', 'Melting material'], presentedOrder: [1, 0], intentionallyWrongIndex: 0, principleOptions: ['Température'], principleOptions_en: ['Temperature changes'], principleOptionImageUrls: ['temperature.png'], principleOptionImageAltTexts: ['Thermometer'] } },
  { type: 'relation-mismatch', fields: ['pairs', 'candidatePartners'], texts: ['Chat', 'Cat', 'Plante', 'Plant', 'Animal', 'Living animal'], alts: ['A cat', 'A plant', 'Animal group'], authored: { pairs: [{ left: 'Chat', right: 'Plante', left_en: 'Cat', leftImageUrl: 'cat.png', leftImageAltText: 'A cat', rightImageUrl: 'plant.png', rightImageAltText: 'A plant' }], pairs_en: [{ right: 'Plant' }], wrongPairIndex: 8, correctPartnerForWrong: 'Animal', candidatePartners: ['Animal'], candidatePartners_en: ['Living animal'], candidatePartnerImageUrls: ['animal.png'], candidatePartnerImageAltTexts: ['Animal group'] } },
];

describe('Solo fallback stimulus and self-review', () => {
  it.each(fixtures)('preserves $type material through the complete ungraded review flow', async fixture => {
    await mount({ ...shared, ...fixture.authored, type: fixture.type });
    expect(item.selfReviewRequired).toBe(true);
    const stimulus = host.querySelector('[data-solo-review-stimulus]');
    fixture.fields.forEach(field => expect(stimulus.querySelector('[data-solo-choice-field="' + field + '"]')).toBeTruthy());
    fixture.texts.forEach(text => expect(stimulus.textContent).toContain(text));
    expect([...stimulus.querySelectorAll('img')].map(image => image.alt)).toEqual(fixture.alts);
    expect(host.querySelector('img[alt="Question reference diagram"]')).toBeTruthy();
    expect(host.textContent).toContain('Which diagram shows x < 3?');
    expect(host.querySelector('script')).toBeNull();
    expect(stimulus.querySelector('input,select,button,textarea')).toBeNull();
    expect(host.querySelector('input[type="radio"],input[type="checkbox"]')).toBeNull();
    expect(solo.grade(item, response).complete).toBe(false);
    await enter(host.querySelector('textarea'), 'My reasoning uses the illustrated evidence.');
    await act(async () => host.querySelector('button').click());
    await enter(host.querySelector('select'), 'needs-practice');
    expect(solo.grade(item, response)).toMatchObject({ complete: true, correct: null, gradable: false, score: null, status: 'self-reviewed' });
    expect(host.querySelector('[data-solo-review-stimulus]')).toBe(stimulus);
  });
  it('keeps every sequence item visible when malformed order repeats an index', async () => {
    await mount({ type: 'sequence-sense', question: 'Inspect the steps.', items: ['First', 'Second'], presentedOrder: [0, 0], orderingPrinciple: 'Time' });
    expect(item.selfReviewRequired).toBe(true);
    expect([...host.querySelectorAll('[data-solo-choice-field="items"]')].map(element => element.textContent)).toEqual(['First', 'Second']);
  });
  it('renders a malformed pair without losing the valid pair or the review controls', async () => {
    await mount({ type: 'relation-mismatch', question: 'Inspect the pairs.', pairs: [null, { left: 'Cat', right: 'Animal' }], wrongPairIndex: 0, correctPartnerForWrong: 'Animal' });
    expect(item.selfReviewRequired).toBe(true);
    expect(host.querySelector('[data-solo-review-stimulus]').textContent).toContain('Cat');
    expect(host.querySelector('textarea')).toBeTruthy();
  });
});
