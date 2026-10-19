import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { transformSync } = require('@babel/core');
const { act } = React;
let components, root, host, serial = 0;
const fixtures = {
  'multi-select': { options: ['Root', 'Leaf'], options_en: ['Raíz', 'Hoja'], optionImageUrls: ['root.png', 'leaf.png'], optionImageAltTexts: ['Roots below the soil', 'A leaf above the soil'], correctAnswers: ['Root'] },
  'fill-blank': { expectedFill: 'plant' },
  'short-answer': { expectedAnswer: 'Roots absorb water' },
  'self-explanation': { rubric: 'Connect roots with water' },
  'numeric-response': { correctValue: 4, unit: 'leaves' },
  'sequence-sense': { items: ['Seed', 'Plant'], items_en: ['Semilla', 'Planta'], itemImageUrls: ['seed.png', 'plant.png'], itemImageAltTexts: ['A dry seed', 'A mature plant'], presentedOrder: [1, 0], intentionallyWrongIndex: 0, orderingPrinciple: 'process', principleOptions: ['process', 'size'], principleOptions_en: ['proceso', 'tamaño'] },
  'relation-mismatch': { pairs: [{ left: 'Root', right: 'Air', left_en: 'Raíz', right_en: 'Aire', leftImageUrl: 'root.png', leftImageAltText: 'Roots in soil', rightImageUrl: 'air.png', rightImageAltText: 'Air above soil' }, { left: 'Leaf', right: 'Light' }], pairs_en: [{}, { left: 'Hoja', right: 'Luz' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water', candidatePartners: ['Water', 'Rock'], candidatePartners_en: ['Agua', 'Roca'], candidatePartnerImageUrls: ['water.png', 'rock.png'], candidatePartnerImageAltTexts: ['Water droplets', 'A small rock'] },
  'answer-evidence': { answerOptions: ['Roots', 'Leaves'], answerOptions_en: ['Raíces', 'Hojas'], answerOptionImageUrls: ['roots.png', 'leaves.png'], answerOptionImageAltTexts: ['Roots in the ground', 'Leaves on a stem'], correctAnswer: 'Roots', evidencePrompt: 'Choose evidence', evidencePrompt_en: 'Elige evidencia', evidenceOptions: ['Absorb water', 'Make seeds'], evidenceOptions_en: ['Absorben agua', 'Producen semillas'], evidenceOptionImageUrls: ['absorb.png', 'seeds.png'], evidenceOptionImageAltTexts: ['Water moving into roots', 'Seeds in a flower'], correctEvidence: 'Absorb water' },
};
const immediateNames = { 'multi-select': 'MultiSelectCard', 'answer-evidence': 'AnswerEvidenceCard', 'numeric-response': 'NumericResponseCard', 'sequence-sense': 'SequenceSenseCard', 'relation-mismatch': 'RelationMismatchCard' };
const types = Object.keys(fixtures);
function question(type) {
  return { type, question: 'Use the diagram ___ to respond.', question_en: 'Usa el diagrama para responder.', imageUrl: 'stimulus.png', imageAltText: 'A plant with four leaves and visible roots', ...fixtures[type] };
}

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.__alloT = (key, values) => values?.defaultValue || key;
  window.AlloIcons = {};
  const code = transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] }, compact: false,
  }).code;
  components = new Function('window', 'React', code + '\nreturn {MultiSelectCard, AnswerEvidenceCard, NumericResponseCard, SequenceSenseCard, RelationMismatchCard, FreeformItemCard, DeferredAssessmentItem, AssessmentPresentationItem, AssessmentAttemptFeedback, balance: _quizBalanceChoiceKeys};')(window, React);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; localStorage.clear(); vi.restoreAllMocks();
});

async function render(name, q, extra = {}) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  const values = { q, questionIdx: 0, itemNumber: 1, index: 0, draftNamespace: 'assess-preview:media-' + (++serial), allowDictation: false, modeStrategy: { render: {} }, formatInlineText: text => text, onToggleAnswer: vi.fn(), onToggleExplanation: vi.fn(), ...extra };
  await act(async () => root.render(React.createElement(components[name], values)));
}
async function click(element) { expect(element).toBeTruthy(); await act(async () => element.click()); }
function choice(field, index) { return host.querySelector('[data-assessment-choice-field="' + field + '"][data-assessment-choice-index="' + index + '"]'); }
function expectQuestionSupport() {
  expect(host.textContent).toContain('Usa el diagrama para responder.');
  const image = host.querySelector('[data-assessment-question-image]');
  expect(image?.getAttribute('src')).toBe('stimulus.png');
  expect(image?.getAttribute('alt')).toBe('A plant with four leaves and visible roots');
}
function expectChoice(field, index, translation, imageAlt) {
  const content = choice(field, index);
  expect(content?.textContent).toContain(translation);
  expect(content?.querySelector('img')?.getAttribute('alt')).toBe(imageAlt);
}

describe('authored media and language support across assessment delivery', () => {
  it.each(types)('retains question stimulus in immediate %s practice', async type => {
    await render(immediateNames[type] || 'FreeformItemCard', question(type));
    expectQuestionSupport();
  });

  it.each(types)('retains question stimulus in deferred %s responses', async type => {
    await render('DeferredAssessmentItem', question(type));
    expectQuestionSupport();
  });

  it.each(types)('retains question stimulus in %s presentation', async type => {
    await render('AssessmentPresentationItem', question(type));
    expectQuestionSupport();
  });

  it.each([...types, 'mcq'])('retains question stimulus in submitted %s feedback', async type => {
    const q = type === 'mcq' ? { ...question('multi-select'), type, correctAnswer: 'Root' } : question(type);
    await render('AssessmentAttemptFeedback', q, { data: { questions: [q] }, receipt: { responses: {} } });
    expectQuestionSupport();
    if (type === 'mcq' || type === 'multi-select') expectChoice('options', 0, 'Raíz', 'Roots below the soil');
    if (type === 'answer-evidence') expectChoice('evidenceOptions', 0, 'Absorben agua', 'Water moving into roots');
    if (type === 'relation-mismatch') expectChoice('candidatePartners', 0, 'Agua', 'Water droplets');
    if (type === 'sequence-sense') expect(choice('principleOptions', 0).textContent).toContain('proceso');
  });

  it.each(['MultiSelectCard', 'DeferredAssessmentItem', 'AssessmentPresentationItem'])('preserves authored option support in %s', async name => {
    await render(name, question('multi-select'));
    expectChoice('options', 0, 'Raíz', 'Roots below the soil');
    expectChoice('options', 1, 'Hoja', 'A leaf above the soil');
  });

  it('reveals evidence media and its translation after choosing an immediate answer', async () => {
    await render('AnswerEvidenceCard', question('answer-evidence'));
    expectChoice('answerOptions', 0, 'Raíces', 'Roots in the ground');
    await click(choice('answerOptions', 0).closest('button'));
    expect(host.textContent).toContain('Elige evidencia');
    expectChoice('evidenceOptions', 0, 'Absorben agua', 'Water moving into roots');
    await click(choice('evidenceOptions', 0).closest('button'));
    expect(choice('evidenceOptions', 0).closest('button').getAttribute('aria-pressed')).toBe('true');
  });

  it.each(['DeferredAssessmentItem', 'AssessmentPresentationItem'])('preserves both answer and evidence choices in %s', async name => {
    await render(name, question('answer-evidence'));
    expectChoice('answerOptions', 0, 'Raíces', 'Roots in the ground');
    expectChoice('evidenceOptions', 0, 'Absorben agua', 'Water moving into roots');
    expect(host.textContent).toContain('Elige evidencia');
  });

  it.each(['SequenceSenseCard', 'DeferredAssessmentItem', 'AssessmentPresentationItem'])('keeps sequence illustrations and glosses at their canonical index in %s', async name => {
    await render(name, question('sequence-sense'));
    const first = host.querySelector('[data-assessment-choice-field="items"]');
    expect(first.getAttribute('data-assessment-choice-index')).toBe('1');
    expect(first.textContent).toContain('Planta');
    expect(first.querySelector('img').getAttribute('alt')).toBe('A mature plant');
    expectChoice('items', 0, 'Semilla', 'A dry seed');
  });

  it('preserves sequence choice support after moving an item', async () => {
    await render('DeferredAssessmentItem', question('sequence-sense'));
    await click(host.querySelector('[aria-label="Move up: Seed"]'));
    const arrange = [...host.querySelectorAll('fieldset')].find(field => field.querySelector('legend')?.textContent === 'Arrange your answer');
    const first = arrange.querySelector('[data-assessment-choice-field="items"]');
    expect(first.getAttribute('data-assessment-choice-index')).toBe('0');
    expect(first.textContent).toContain('Semilla');
    expect(first.querySelector('img').getAttribute('alt')).toBe('A dry seed');
  });

  it.each(['RelationMismatchCard', 'DeferredAssessmentItem', 'AssessmentPresentationItem'])('preserves pair translations and authored side images in %s', async name => {
    await render(name, question('relation-mismatch'));
    for (const text of ['Raíz', 'Aire', 'Hoja', 'Luz']) expect(host.textContent).toContain(text);
    expect(host.querySelector('img[alt="Roots in soil"]')).toBeTruthy();
    expect(host.querySelector('img[alt="Air above soil"]')).toBeTruthy();
    if (name === 'AssessmentPresentationItem') expectChoice('candidatePartners', 0, 'Agua', 'Water droplets');
  });

  it('makes replacement partner media available before selecting it', async () => {
    await render('DeferredAssessmentItem', question('relation-mismatch'));
    expectChoice('candidatePartners', 0, 'Agua', 'Water droplets');
    const label = choice('candidatePartners', 0).closest('label');
    await click(label.querySelector('input'));
    expect(label.querySelector('input').checked).toBe(true);
  });

  it('preserves replacement partner support when immediate repair opens', async () => {
    await render('RelationMismatchCard', question('relation-mismatch'));
    await click(host.querySelector('[role="button"]'));
    expectChoice('candidatePartners', 0, 'Agua', 'Water droplets');
  });

  it('never substitutes an image production prompt for a missing description', async () => {
    const q = { ...question('multi-select'), imageAltText: '', imagePrompt: 'SECRET PRODUCTION INSTRUCTION', optionImageAltTexts: ['', ''], optionImagePrompts: ['PRIVATE OPTION PROMPT'] };
    await render('MultiSelectCard', q);
    expect(host.querySelector('[data-assessment-question-image]').alt).toBe('No visual description provided.');
    expect(choice('options', 0).querySelector('img').alt).toBe('No visual description provided.');
    expect(host.innerHTML).not.toContain('SECRET PRODUCTION INSTRUCTION');
    expect(host.innerHTML).not.toContain('PRIVATE OPTION PROMPT');
  });

  it.each(['multi-select', 'answer-evidence', 'relation-mismatch'])('keeps authored media and translations with their choices after balancing %s', type => {
    const q = question(type);
    const groups = type === 'multi-select' ? [['options', 'option']]
      : type === 'answer-evidence' ? [['answerOptions', 'answerOption'], ['evidenceOptions', 'evidenceOption']]
      : [['candidatePartners', 'candidatePartner']];
    for (const [field, stem] of groups) {
      q[stem + 'ImagePrompts'] = q[field].map(value => 'Production instruction for ' + value);
      if (field === 'answerOptions' || field === 'evidenceOptions') {
        const alias = field === 'answerOptions' ? 'answer' : 'evidence';
        for (const suffix of ['ImageUrls', 'ImageAltTexts', 'ImagePrompts']) q[alias + suffix] = q[stem + suffix].slice();
      }
    }
    let moved = false;
    for (let seed = 0; seed < 12; seed++) {
      const balanced = components.balance([q], 'media-' + seed)[0];
      for (const [field, stem] of groups) {
        if (balanced[field].join('|') !== q[field].join('|')) moved = true;
        balanced[field].forEach((value, index) => {
          const original = q[field].indexOf(value);
          expect(balanced[field + '_en'][index]).toBe(q[field + '_en'][original]);
          for (const suffix of ['ImageUrls', 'ImageAltTexts', 'ImagePrompts']) {
            expect(balanced[stem + suffix][index]).toBe(q[stem + suffix][original]);
            if (field === 'answerOptions' || field === 'evidenceOptions') {
              const alias = field === 'answerOptions' ? 'answer' : 'evidence';
              expect(balanced[alias + suffix][index]).toBe(q[alias + suffix][original]);
            }
          }
        });
      }
    }
    expect(moved).toBe(true);
  });
});
